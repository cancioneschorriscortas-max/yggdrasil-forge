// ── INICIO: integración — Fase 2 cross-piece (sub-fase 2.6) ──
// Tests que combinan TRES ou MÁIS pezas da Fase 2 (EffectsRunner +
// StatComputer + TimeManager + ProgressManager) nun mesmo escenario
// realista. Cero código novo no motor: cada test exercita
// combinacións que xa están soportadas individualmente; o valor
// engadido é verificar a INTERACCIÓN coherente.
//
// Convencións (briefing 2.6 §8):
// - Comentarios en galego (consistencia coa familia de integration tests).
// - Cero `any`. TreeDefs definidas inline ou en helpers privados (§5.3).
// - Cero modificación do motor (§5.7): un test que descobre un bug é
//   un escalado preventivo, non parte do alcance.
//
// Escenarios (§5.2 do briefing, lista pechada):
//   1. Effects + Stats
//   2. Effects + Progress
//   3. TimeManager + Progress (preservación tras expiración)
//   4. Computed progress + canUnlock
//   5. StatContribution condicional + computed (verifica bug-fix 2.4.e)
//   6. Round-trip Fase 2 completo
//   7. applyChanges atómico cross-piece
//   8. Cascade event ordering (orde fixada empíricamente)
//
// Aclaración (briefing 2.6.fix §5.7): `effects_applied` no audit log
// rexístrase como `{ type: 'custom', name: 'effects_applied' }`. As
// asercións do escenario 1 verifícano nese formato.

import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { NodeDef, StatDef, TreeDef } from '../../src/types/index.js'

describe('integración — Fase 2 cross-piece (sub-fase 2.6)', () => {
  // ── INICIO: escenario 1 — Effects + Stats ──
  // Verifica que un único `unlock` dispara dúas pezas á vez:
  //  - EffectsRunner: aplica `modify_resource(xp, +, 10)`.
  //  - StatComputer: agrega `statContributions` ao stat `power`.
  // E que o AuditLogger rexistra ambas accións (node_unlocked +
  // custom 'effects_applied').
  describe('escenario 1 — Effects + Stats', () => {
    it('unlock dun nodo aplica effects e stat contributions simultáneamente', async () => {
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        effects: [{ type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 }],
        statContributions: [{ statId: 'power', op: '+', value: 5 }],
      }
      const power: StatDef = { id: 'power', label: 'Power', initial: 0 }
      const treeDef: TreeDef = {
        id: 'sc1-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 1',
        nodes: [a],
        edges: [],
        resources: [{ id: 'xp', label: 'XP', initial: 50, refundable: true, refundPercent: 100 }],
        stats: [power],
        startingBudget: { resources: { xp: 50 } },
        layout: { type: 'radial' },
      }
      const engine = new TreeEngine(treeDef, { audit: { enabled: true } })

      // Estado inicial.
      expect(engine.getBudget().resources.xp).toBe(50)
      expect(engine.getStat('power')).toBe(0)

      const r = await engine.unlock('a')
      expect(r.ok).toBe(true)

      // Effects: budget subiu en 10.
      expect(engine.getBudget().resources.xp).toBe(60)
      // Stats: power agora 5 (initial=0 + contribución=+5).
      expect(engine.getStat('power')).toBe(5)

      // Audit: rexistrou node_unlocked + custom 'effects_applied'.
      const audit = engine.getAuditLog()
      const hasNodeUnlocked = audit.some(
        (e) => e.action.type === 'node_unlocked' && e.action.nodeId === 'a',
      )
      const hasEffectsApplied = audit.some(
        (e) => e.action.type === 'custom' && e.action.name === 'effects_applied',
      )
      expect(hasNodeUnlocked).toBe(true)
      expect(hasEffectsApplied).toBe(true)
    })
  })
  // ── FIN: escenario 1 ──

  // ── INICIO: escenario 2 — Effects + Progress ──
  // O effect `set_progress` muta o estado de progress doutro nodo (B),
  // cruzando a EffectsRunner co ProgressManager. Verificamos:
  //  - O valor de progress reflicte o cambio.
  //  - Os milestones acadados son os esperados (rolling).
  //  - O evento `progressChange` é emitido (sub-fase 2.6.fix cabléao).
  describe('escenario 2 — Effects + Progress', () => {
    it('effect set_progress(B, 75) actualiza ProgressManager e emite progressChange', async () => {
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        effects: [{ type: 'set_progress', nodeId: 'b', percent: 75 }],
      }
      const b: NodeDef = {
        id: 'b',
        type: 'small',
        label: 'B',
        supportsProgress: true,
        progressSource: { type: 'manual' },
        progressMilestones: [25, 50, 75, 100],
      }
      const treeDef: TreeDef = {
        id: 'sc2-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 2',
        nodes: [a, b],
        edges: [],
        layout: { type: 'radial' },
      }
      const engine = new TreeEngine(treeDef)

      // Captura de eventos `progressChange`.
      const progressEvents: Array<{ nodeId: string; percent: number }> = []
      engine.on('progressChange', (nodeId, percent) => {
        progressEvents.push({ nodeId, percent })
      })

      const r = await engine.unlock('a')
      expect(r.ok).toBe(true)

      // ProgressManager reflicte o valor escrito polo effect.
      expect(engine.getProgress('b')).toBe(75)
      // Milestones acadados: 25, 50 e 75 (inclusive <= 75).
      expect(engine.getReachedMilestones('b')).toEqual([25, 50, 75])
      // Cableado da sub-fase 2.6.fix: o effect agora propaga vía
      // ProgressManager, que emite progressChange.
      expect(progressEvents).toContainEqual({ nodeId: 'b', percent: 75 })
    })
  })
  // ── FIN: escenario 2 ──

  // ── INICIO: escenario 3 — TimeManager + Progress ──
  // Decisión 2.4.b §5.8 + §5.5: o progress escrito a un nodo
  // preséntase tras expirar polo TimeManager. Verifica:
  //  - O nodo móvese a state='expired' tras o tick().
  //  - `getProgress` segue devolvendo o valor previo (NON se borra).
  //  - `canUnlock` rexeita o nodo expirado.
  describe('escenario 3 — TimeManager + Progress (preservación tras expiración)', () => {
    it('un nodo expirado mantén o progress establecido previamente', async () => {
      const NOW = 1_000_000
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        supportsProgress: true,
        progressSource: { type: 'manual' },
        timeConstraints: { expiresAt: NOW + 1000 },
      }
      const treeDef: TreeDef = {
        id: 'sc3-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 3',
        nodes: [a],
        edges: [],
        layout: { type: 'radial' },
      }

      // Reloxo virtual controlable.
      let now = NOW
      const engine = new TreeEngine(treeDef, { timeNow: () => now })

      // Antes da caducidade: unlock + setProgress funcionan.
      const rUnlock = await engine.unlock('a')
      expect(rUnlock.ok).toBe(true)

      const rProg = engine.setProgress('a', 60)
      expect(rProg.ok).toBe(true)
      expect(engine.getProgress('a')).toBe(60)

      // Avanzamos o reloxo máis aló de expiresAt e tickeamos.
      now = NOW + 2000
      const tickResult = engine.tick()
      expect(tickResult.expired).toContain('a')

      // O nodo está en estado 'expired'.
      expect(engine.getNodeState('a')?.state).toBe('expired')

      // **Decisión 2.4.b §5.8**: o progress non se borra ao expirar.
      expect(engine.getProgress('a')).toBe(60)

      // canUnlock rexéitao por estar expired.
      const can = engine.canUnlock('a')
      expect(can.ok).toBe(true)
      if (can.ok) {
        expect(can.value.allowed).toBe(false)
      }
    })
  })
  // ── FIN: escenario 3 ──

  // ── INICIO: escenario 4 — Computed progress + canUnlock ──
  // Cruzamento ProgressManager (computed) + UnlockResolver
  // (progress_min). Verifica que un cambio en nodos fonte propaga
  // automaticamente ao computed e este a canUnlock.
  describe('escenario 4 — Computed progress + canUnlock', () => {
    it('progress_min sobre nodo computed reflicte cambios das súas fontes', () => {
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        supportsProgress: true,
        progressSource: { type: 'manual' },
      }
      const b: NodeDef = {
        id: 'b',
        type: 'small',
        label: 'B',
        supportsProgress: true,
        progressSource: { type: 'manual' },
      }
      const c: NodeDef = {
        id: 'c',
        type: 'small',
        label: 'C',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'avg' },
      }
      const d: NodeDef = {
        id: 'd',
        type: 'small',
        label: 'D',
        prerequisites: { type: 'progress_min', nodeId: 'c', percent: 50 },
      }
      const treeDef: TreeDef = {
        id: 'sc4-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 4',
        nodes: [a, b, c, d],
        edges: [],
        layout: { type: 'radial' },
      }
      const engine = new TreeEngine(treeDef)

      // Inicial: a=0, b=0 → c=avg(0,0)=0. progress_min(c,50) falla.
      expect(engine.getProgress('c')).toBe(0)
      const canInicial = engine.canUnlock('d')
      expect(canInicial.ok).toBe(true)
      if (canInicial.ok) {
        expect(canInicial.value.allowed).toBe(false)
      }

      // a=80, b=20 → c=avg(80,20)=50. progress_min(c,50) ALLOWED.
      expect(engine.setProgress('a', 80).ok).toBe(true)
      expect(engine.setProgress('b', 20).ok).toBe(true)
      expect(engine.getProgress('c')).toBe(50)
      const canMedio = engine.canUnlock('d')
      expect(canMedio.ok).toBe(true)
      if (canMedio.ok) {
        expect(canMedio.value.allowed).toBe(true)
      }

      // b=0 → c=avg(80,0)=40. progress_min(c,50) volve a NON allowed.
      expect(engine.setProgress('b', 0).ok).toBe(true)
      expect(engine.getProgress('c')).toBe(40)
      const canFinal = engine.canUnlock('d')
      expect(canFinal.ok).toBe(true)
      if (canFinal.ok) {
        expect(canFinal.value.allowed).toBe(false)
      }
    })
  })
  // ── FIN: escenario 4 ──

  // ── INICIO: escenario 5 — StatContribution condicional + computed ──
  // Bug-fix de 2.4.e: a cache do StatComputer invalídase tras
  // setProgress, polo que un stat condicional sobre progress_min(C)
  // (onde C é computed) reflicte cambios das súas fontes.
  describe('escenario 5 — StatContribution condicional + computed (bug-fix 2.4.e)', () => {
    it('stat condicional sobre computed actualízase ao cambiar fontes', async () => {
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        supportsProgress: true,
        progressSource: { type: 'manual' },
      }
      const b: NodeDef = {
        id: 'b',
        type: 'small',
        label: 'B',
        supportsProgress: true,
        progressSource: { type: 'manual' },
      }
      // C: computed sobre [A, B] con formula 'sum'. clamp 0-100 polo
      // propio cómputo do ProgressManager (rango válido).
      const c: NodeDef = {
        id: 'c',
        type: 'small',
        label: 'C',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
      }
      // D: contribúe +10 a 'power' cando progress_min(C, 50) pasa.
      const d: NodeDef = {
        id: 'd',
        type: 'small',
        label: 'D',
        statContributions: [
          {
            statId: 'power',
            op: '+',
            value: 10,
            conditions: [{ type: 'progress_min', nodeId: 'c', percent: 50 }],
          },
        ],
      }
      const power: StatDef = { id: 'power', label: 'Power', initial: 0 }
      const treeDef: TreeDef = {
        id: 'sc5-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 5',
        nodes: [a, b, c, d],
        edges: [],
        stats: [power],
        layout: { type: 'radial' },
      }
      const engine = new TreeEngine(treeDef)

      // Desbloqueamos D primeiro; condition pasa só cando progress(C) ≥ 50.
      const rUnlockD = await engine.unlock('d')
      expect(rUnlockD.ok).toBe(true)

      // Inicial: a=0, b=0 → c=sum(0,0)=0. progress_min(c,50) FALLA →
      // contribución non se aplica → power=0.
      expect(engine.getProgress('c')).toBe(0)
      expect(engine.getStat('power')).toBe(0)

      // a=30, b=30 → c=sum(30,30)=60. progress_min(c,50) PASA →
      // contribución +10 → power=10.
      expect(engine.setProgress('a', 30).ok).toBe(true)
      expect(engine.setProgress('b', 30).ok).toBe(true)
      expect(engine.getProgress('c')).toBe(60)
      // ✱ Esta aserción só pasa se StatComputer.cache foi invalidada
      // tras setProgress (bug-fix 2.4.e).
      expect(engine.getStat('power')).toBe(10)

      // b=0 → c=sum(30,0)=30. progress_min(c,50) FALLA outra vez →
      // power volve a 0.
      expect(engine.setProgress('b', 0).ok).toBe(true)
      expect(engine.getProgress('c')).toBe(30)
      expect(engine.getStat('power')).toBe(0)
    })
  })
  // ── FIN: escenario 5 ──

  // ── INICIO: escenario 6 — Round-trip Fase 2 completo ──
  // TreeDef "monstruo" con todas as features da Fase 2 entrelazadas:
  // recursos múltiples, effects de varios tipos, statContributions con
  // conditions e perTier, timeConstraints, supportsProgress (manual e
  // computed), stats con min/max clamp. Verifica que:
  //  - fromJSON acepta o monstruo.
  //  - As mutacións de estado (unlock, setProgress) son coherentes
  //    entre as pezas.
  //  - O round-trip vía toJSON+fromJSON preserva a TreeDef definicional
  //    (`toJSON` serializa SÓ TreeDef; o estado interno vive en
  //    TreeState — documentado en lifecycle.test.ts L:76).
  //  - Unha mutación de TreeDef vía applyChanges SI aparece no JSON
  //    re-serializado (esa é a vía estructural).
  describe('escenario 6 — Round-trip Fase 2 completo', () => {
    // Helper privado: constrúe a TreeDef monstruo. Cero export.
    function makeMonstruoTreeDef(): TreeDef {
      const root: NodeDef = {
        id: 'root',
        type: 'root',
        label: { gl: 'Coroa', es: 'Corona', en: 'Crown' },
      }
      // 'reader': cost xp, contribúe perTier a focus, soporta progress
      // manual con milestones.
      const reader: NodeDef = {
        id: 'reader',
        type: 'small',
        label: 'Reader',
        cost: [{ resourceId: 'xp', amount: 5 }],
        prerequisites: { type: 'node_unlocked', nodeId: 'root' },
        statContributions: [{ statId: 'focus', op: '+', value: 2, perTier: true }],
        supportsProgress: true,
        progressSource: { type: 'manual' },
        progressMilestones: [25, 50, 75, 100],
      }
      // 'writer': effects de modify_resource + set_progress sobre reader.
      const writer: NodeDef = {
        id: 'writer',
        type: 'small',
        label: 'Writer',
        cost: [{ resourceId: 'sp', amount: 1 }],
        prerequisites: { type: 'node_unlocked', nodeId: 'root' },
        effects: [
          { type: 'modify_resource', resourceId: 'gold', op: '+', amount: 50 },
          { type: 'set_progress', nodeId: 'reader', percent: 50 },
        ],
      }
      // 'thinker': contribúe a wisdom (con clamp via stat) condicionado
      // ao progreso de avg(reader, writer). Por iso usa o computed C.
      const thinker: NodeDef = {
        id: 'thinker',
        type: 'small',
        label: 'Thinker',
        supportsProgress: true,
        progressSource: { type: 'manual' },
        prerequisites: { type: 'node_unlocked', nodeId: 'reader' },
        statContributions: [
          {
            statId: 'wisdom',
            op: '+',
            value: 5,
            conditions: [{ type: 'progress_min', nodeId: 'aggregate', percent: 40 }],
          },
        ],
      }
      // 'aggregate': computed sobre 3 fontes (reader, writer, thinker).
      const aggregate: NodeDef = {
        id: 'aggregate',
        type: 'small',
        label: 'Aggregate',
        supportsProgress: true,
        progressSource: {
          type: 'computed',
          dependsOn: ['reader', 'writer', 'thinker'],
          formula: 'avg',
        },
      }
      // 'ephemeral': caduca; verifica integración con TimeManager.
      const ephemeral: NodeDef = {
        id: 'ephemeral',
        type: 'small',
        label: 'Ephemeral',
        prerequisites: { type: 'node_unlocked', nodeId: 'root' },
        timeConstraints: { expiresAt: 9_999_999_999 },
      }
      return {
        id: 'monstruo-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: { gl: 'Monstruo', es: 'Monstruo', en: 'Monster' },
        rootNodeId: 'root',
        nodes: [root, reader, writer, thinker, aggregate, ephemeral],
        edges: [],
        resources: [
          { id: 'xp', label: 'XP', initial: 100, refundable: true, refundPercent: 100 },
          { id: 'sp', label: 'SP', initial: 5, refundable: true, refundPercent: 100 },
          { id: 'gold', label: 'Gold', initial: 0 },
        ],
        stats: [
          { id: 'focus', label: 'Focus', initial: 0, min: 0, max: 100 },
          { id: 'wisdom', label: 'Wisdom', initial: 0, min: 0, max: 50 },
        ],
        startingBudget: { resources: { xp: 100, sp: 5, gold: 0 } },
        layout: { type: 'radial' },
      }
    }

    it('serializa monstruo, deserializa, muta, re-serializa, fromJSON do resultado', async () => {
      const monstruo = makeMonstruoTreeDef()

      // ── 1. Serializar e deserializar ──
      const json1 = JSON.stringify(monstruo)
      const r1 = TreeEngine.fromJSON(json1)
      expect(r1.ok).toBe(true)
      if (!r1.ok) return
      const engine = r1.value

      // Verificación inicial: budget e stats teñen os valores
      // declarativos.
      expect(engine.getBudget().resources.xp).toBe(100)
      expect(engine.getBudget().resources.gold).toBe(0)
      expect(engine.getStat('focus')).toBe(0)
      expect(engine.getStat('wisdom')).toBe(0)

      // ── 2. Mutacións de estado (NON cambian TreeDef) ──
      // root, reader, writer en cadea; writer ten effects que mutan
      // gold (+50) e setean reader.progress a 50.
      expect((await engine.unlock('root')).ok).toBe(true)
      expect((await engine.unlock('reader')).ok).toBe(true)
      expect((await engine.unlock('writer')).ok).toBe(true)
      expect(engine.getBudget().resources.gold).toBe(50)
      expect(engine.getProgress('reader')).toBe(50)
      // reader contribúe +2 perTier a focus (tier 1) → focus=2.
      expect(engine.getStat('focus')).toBe(2)

      // ── 3. toJSON re-serializa: a TreeDef segue intacta ──
      // Decisión documentada en lifecycle.test.ts L:76: toJSON
      // serializa SÓ TreeDef, non TreeState. Polo tanto o JSON
      // re-serializado debe ser equivalente á declaración orixinal
      // (módulo o orde de claves do serializador determinista).
      const json2 = engine.toJSON()
      const r2 = TreeEngine.fromJSON(json2)
      expect(r2.ok).toBe(true)
      if (!r2.ok) return
      const engine2 = r2.value

      // A TreeDef do segundo engine debe ter os mesmos 6 nodos e id.
      expect(engine2.getTreeDef().id).toBe('monstruo-tree')
      expect(engine2.getTreeDef().nodes.length).toBe(6)
      // Pero o estado interno é DE NOVO inicial (porque toJSON non
      // emite TreeState — só TreeDef).
      expect(engine2.getBudget().resources.gold).toBe(0)
      expect(engine2.getProgress('reader')).toBe(0)

      // ── 4. Mutación de TreeDef vía applyChanges SI persiste ──
      // Aquí cambia REALMENTE a TreeDef: writer pasa a custar 2 sp.
      const r3 = await engine.applyChanges([
        {
          type: 'modify_node',
          nodeId: 'writer',
          changes: { cost: [{ resourceId: 'sp', amount: 2 }] },
        },
      ])
      expect(r3.ok).toBe(true)

      // Verificación: o cambio reflíctese no TreeDef serializado.
      const json3 = engine.toJSON()
      const parsed3 = JSON.parse(json3) as TreeDef
      const writerNode = parsed3.nodes.find((n) => n.id === 'writer')
      expect(writerNode?.cost).toEqual([{ resourceId: 'sp', amount: 2 }])

      // E un fromJSON do json3 reconstruye un engine cuxa definicion
      // contén o cambio.
      const r4 = TreeEngine.fromJSON(json3)
      expect(r4.ok).toBe(true)
      if (r4.ok) {
        const finalWriter = r4.value.getTreeDef().nodes.find((n) => n.id === 'writer')
        expect(finalWriter?.cost).toEqual([{ resourceId: 'sp', amount: 2 }])
      }
    })
  })
  // ── FIN: escenario 6 ──

  // ── INICIO: escenario 7 — applyChanges atómico cross-piece ──
  // applyChanges é transaccional: se calquera cambio do batch falla,
  // NADA se aplica (rollback total). Verificamos ambas direccións
  // cunha TreeDef que mestura recursos, effects, stats,
  // timeConstraints e progressSource.
  describe('escenario 7 — applyChanges atómico cross-piece', () => {
    function makeBaseTree(): TreeDef {
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        cost: [{ resourceId: 'xp', amount: 5 }],
        effects: [{ type: 'modify_resource', resourceId: 'gold', op: '+', amount: 10 }],
        statContributions: [{ statId: 'power', op: '+', value: 3 }],
        timeConstraints: { expiresAt: 9_999_999_999 },
        supportsProgress: true,
        progressSource: { type: 'manual' },
      }
      return {
        id: 'sc7-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 7',
        nodes: [a],
        edges: [],
        resources: [
          { id: 'xp', label: 'XP', initial: 50, refundable: true, refundPercent: 100 },
          { id: 'gold', label: 'Gold', initial: 0 },
        ],
        stats: [{ id: 'power', label: 'Power', initial: 0 }],
        startingBudget: { resources: { xp: 50, gold: 0 } },
        layout: { type: 'radial' },
      }
    }

    it('caso positivo: batch enteiro válido aplícase atómicamente', async () => {
      const engine = new TreeEngine(makeBaseTree())

      // Batch que toca 5 campos distintos do nodo A (cost, effects,
      // statContributions, timeConstraints, progressSource).
      const r = await engine.applyChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { cost: [{ resourceId: 'xp', amount: 8 }] },
        },
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: {
            effects: [{ type: 'modify_resource', resourceId: 'gold', op: '+', amount: 20 }],
          },
        },
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: {
            statContributions: [{ statId: 'power', op: '+', value: 7 }],
          },
        },
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { timeConstraints: { expiresAt: 8_888_888_888 } },
        },
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: {
            progressSource: { type: 'computed', dependsOn: [], formula: 'sum' },
          },
        },
      ])
      expect(r.ok).toBe(true)

      // Estado final coherente: a TreeDef reflicte os 5 cambios.
      const aDef = engine.getTreeDef().nodes.find((n) => n.id === 'a')
      expect(aDef?.cost).toEqual([{ resourceId: 'xp', amount: 8 }])
      expect(aDef?.effects?.[0]).toMatchObject({ amount: 20 })
      expect(aDef?.statContributions?.[0]).toMatchObject({ value: 7 })
      expect(aDef?.timeConstraints?.expiresAt).toBe(8_888_888_888)
      expect(aDef?.progressSource?.type).toBe('computed')
    })

    it('caso negativo: un cambio inválido fai rollback total', async () => {
      const engine = new TreeEngine(makeBaseTree())

      // Capturamos o estado previo da TreeDef para comparar despois.
      const treeDefAntes = JSON.stringify(engine.getTreeDef())

      // Batch: tres cambios válidos seguidos dun cambio inválido
      // (modify_node sobre un nodeId que NON existe).
      const r = await engine.applyChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { cost: [{ resourceId: 'xp', amount: 99 }] },
        },
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { statContributions: [{ statId: 'power', op: '+', value: 99 }] },
        },
        // ← Cambio que rompe o batch.
        {
          type: 'modify_node',
          nodeId: 'nonexistent',
          changes: { cost: [{ resourceId: 'xp', amount: 1 }] },
        },
      ])

      // O batch enteiro devolve err.
      expect(r.ok).toBe(false)

      // Atomicidade: a TreeDef NON cambiou en absoluto.
      const treeDefDespois = JSON.stringify(engine.getTreeDef())
      expect(treeDefDespois).toBe(treeDefAntes)
    })
  })
  // ── FIN: escenario 7 ──

  // ── INICIO: escenario 8 — Cascade event ordering ──
  // O briefing 2.6 §5.5 esixe verificación EMPÍRICA antes de fixar a
  // aserción: capturamos a orde real dos eventos durante o unlock dun
  // nodo que dispara unha cascada complexa, e fixamos a orde **como
  // contrato observable** (esta sub-fase é a que o establece para que
  // se preserve estable no futuro).
  describe('escenario 8 — Cascade event ordering', () => {
    it('orde fixa de eventos durante un unlock con effects + contributions', async () => {
      // TreeDef do briefing §5.2 escenario 8:
      // - Nodo A con effects [modify_resource +5, set_progress(B,100)].
      // - Nodo B con supportsProgress + manual + milestones.
      // - Stat S contribuído por A perTier.
      const a: NodeDef = {
        id: 'a',
        type: 'small',
        label: 'A',
        effects: [
          { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 5 },
          { type: 'set_progress', nodeId: 'b', percent: 100 },
        ],
        statContributions: [{ statId: 's', op: '+', value: 1, perTier: true }],
      }
      const b: NodeDef = {
        id: 'b',
        type: 'small',
        label: 'B',
        supportsProgress: true,
        progressSource: { type: 'manual' },
        progressMilestones: [25, 50, 75, 100],
      }
      const treeDef: TreeDef = {
        id: 'sc8-tree',
        schemaVersion: SCHEMA_VERSION,
        version: '1.0.0',
        label: 'Escenario 8',
        nodes: [a, b],
        edges: [],
        resources: [{ id: 'xp', label: 'XP', initial: 10, refundable: true, refundPercent: 100 }],
        stats: [{ id: 's', label: 'S', initial: 0 }],
        startingBudget: { resources: { xp: 10 } },
        layout: { type: 'radial' },
      }
      const engine = new TreeEngine(treeDef, { audit: { enabled: true } })

      // Subscribímonos a todos os eventos relevantes para A unlock.
      // (`statChange` está declarado pero non se emite — sub-fase 2.2.b
      // §5.3-5.4. Polo tanto non aparecerá na orde.)
      const order: Array<{ event: string; data: string }> = []
      engine.on('unlock', (nodeId) => {
        order.push({ event: 'unlock', data: nodeId })
      })
      engine.on('stateChange', (nodeId, change) => {
        order.push({ event: 'stateChange', data: `${nodeId}:${change.to}` })
      })
      engine.on('budgetChange', (resourceId, _old, newAmount) => {
        order.push({ event: 'budgetChange', data: `${resourceId}=${newAmount}` })
      })
      engine.on('progressChange', (nodeId, percent) => {
        order.push({ event: 'progressChange', data: `${nodeId}=${percent}` })
      })
      engine.on('auditEntry', (entry) => {
        order.push({ event: 'auditEntry', data: entry.action.type })
      })

      const r = await engine.unlock('a')
      expect(r.ok).toBe(true)

      // ── Orde empírica capturada nesta sub-fase 2.6 ──
      // (verificación §5.5 do briefing 2.6: corrida primeiro, asercións
      // fixadas a posteriori contra o que realmente sucedeu).
      //
      // ACTUALIZADO en 2.6.fix2: o effect `modify_resource` agora emite
      // `budgetChange` (bug DT-13 arranxado). A orde observada para o
      // `unlock('a')` cos effects e statContributions deste escenario é:
      //
      //   1. stateChange      a:unlocked
      //   2. unlock           a
      //   3. auditEntry       node_unlocked
      //   4. budgetChange     xp=15      ← effect modify_resource (2.6.fix2)
      //   5. progressChange   b=100      ← effect set_progress (2.6.fix)
      //   6. auditEntry       custom     ← effects_applied
      //
      // Os dous effects de A emítense na orde declarativa: modify_resource
      // (1º effect) → budgetChange; set_progress (2º effect) →
      // progressChange. As dúas emisións suceden tras o audit do unlock e
      // antes do audit agregado `custom 'effects_applied'`.
      //
      // Histórico do contrato (patrón de contrato intermedio 2.4.d L2):
      //  - Sub-fase 2.6 fixou empíricamente 5 eventos SEN budgetChange,
      //    documentando a súa ausencia como bug latente (DT-13).
      //  - Sub-fase 2.6.fix2 arranxa o bug → aparece budgetChange (6
      //    eventos). Este test actualízase para reflectir o comportamento
      //    correcto, completando o patrón.
      //
      // Esta sub-fase **fixa esta orde como contrato observable estable**.
      // Calquera futura modificación que a cambie deberá actualizar este
      // test e xustificar o cambio.
      expect(order.length).toBe(6)
      expect(order[0]).toEqual({ event: 'stateChange', data: 'a:unlocked' })
      expect(order[1]).toEqual({ event: 'unlock', data: 'a' })
      expect(order[2]).toEqual({ event: 'auditEntry', data: 'node_unlocked' })
      expect(order[3]).toEqual({ event: 'budgetChange', data: 'xp=15' })
      expect(order[4]).toEqual({ event: 'progressChange', data: 'b=100' })
      expect(order[5]).toEqual({ event: 'auditEntry', data: 'custom' })

      // E aínda así, o estado final é coherente: stat S contribuído
      // por A perTier reflicte tier 1.
      expect(engine.getStat('s')).toBe(1)
      // E o budget mutou a 15 (10 inicial + 5 do effect modify_resource),
      // agora xa con emisión de budgetChange (verificada arriba na orde).
      expect(engine.getBudget().resources.xp).toBe(15)
    })
  })
  // ── FIN: escenario 8 ──
})
// ── FIN: integración — Fase 2 cross-piece (sub-fase 2.6) ──
