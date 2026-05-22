// ── INICIO: tests de TreeEngine.unlock con effects (2.1.b) ──
// Valida a integración do EffectsRunner no fluxo de unlock:
//  - éxito: execución de effects + audit agregada 'effects_applied'
//  - fallo: rollback total (budget oldBudget directo + estado nodo +
//    eventos de reversión + audit 'effects_failed')
//  - multi-tier: cada salto executa os effects
//  - unlock_node recursivo: funciona sen ciclo
//  - ciclo A↔B: non corrompe o estado (detéctase como
//    NODE_ALREADY_UNLOCKED ao longo da cadea, ver DT-11 no MASTER)
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { Effect, NodeDef, StateChange, TreeDef } from '../../src/types/index.js'

// ── Helpers ──

function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    label: id,
    type: 'passive',
    ...overrides,
  }
}

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/** Capturador xenérico para asercions de orde de eventos. */
type EventRecord =
  | { readonly kind: 'budgetChange'; resourceId: string; oldAmount: number; newAmount: number }
  | { readonly kind: 'stateChange'; nodeId: string; change: StateChange }
  | { readonly kind: 'unlock'; nodeId: string }
  | { readonly kind: 'lock'; nodeId: string }
  | { readonly kind: 'customEvent'; eventName: string; payload?: unknown }

function captureEvents(engine: TreeEngine): EventRecord[] {
  const events: EventRecord[] = []
  engine.on('budgetChange', (resourceId, oldAmount, newAmount) => {
    events.push({ kind: 'budgetChange', resourceId, oldAmount, newAmount })
  })
  engine.on('stateChange', (nodeId, change) => {
    events.push({ kind: 'stateChange', nodeId, change })
  })
  engine.on('unlock', (nodeId) => {
    events.push({ kind: 'unlock', nodeId })
  })
  engine.on('lock', (nodeId) => {
    events.push({ kind: 'lock', nodeId })
  })
  engine.on('customEvent', (eventName, payload) => {
    events.push({ kind: 'customEvent', eventName, payload })
  })
  return events
}

// ───────────────────────────────────────────────
// 1. Unlock sen effects: backwards compatibility
// ───────────────────────────────────────────────

describe('TreeEngine.unlock — sen effects', () => {
  it('nodo con effects undefined funciona igual que sempre', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 10 } },
      resources: [{ id: 'xp', label: 'XP' }],
      nodes: [makeNode('a', { cost: [{ resourceId: 'xp', amount: 5 }] })],
    })
    const engine = new TreeEngine(tree, { audit: { enabled: true } })
    const result = await engine.unlock('a')
    expect(result.ok).toBe(true)
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
    expect(engine.getBudget().resources.xp).toBe(5)
    // Audit só ten node_unlocked; nada de 'effects_applied'.
    const log = engine.getAuditLog()
    expect(log.map((e) => e.action.type)).toEqual(['node_unlocked'])
  })

  it('nodo con effects: [] funciona igual que sempre (array baleiro)', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: {} },
      nodes: [makeNode('a', { effects: [] })],
    })
    const engine = new TreeEngine(tree, { audit: { enabled: true } })
    const result = await engine.unlock('a')
    expect(result.ok).toBe(true)
    // Array baleiro: NON debe rexistrar audit 'effects_applied' (5.4).
    const log = engine.getAuditLog()
    const customEntries = log.filter(
      (e) => e.action.type === 'custom' && e.action.name === 'effects_applied',
    )
    expect(customEntries).toHaveLength(0)
  })
})

// ───────────────────────────────────────────────
// 2. Unlock con effects exitosos
// ───────────────────────────────────────────────

describe('TreeEngine.unlock — effects exitosos', () => {
  it('aplica modify_resource +5 gold + trigger_event "hooray" e rexistra audit agregada', async () => {
    const effects: readonly Effect[] = [
      { type: 'modify_resource', resourceId: 'gold', op: '+', amount: 5 },
      { type: 'trigger_event', eventName: 'hooray' },
    ]
    const tree = makeTreeDef({
      startingBudget: { resources: { gold: 100 } },
      resources: [{ id: 'gold', label: 'Gold' }],
      nodes: [makeNode('a', { effects })],
    })
    const engine = new TreeEngine(tree, { audit: { enabled: true } })
    const eventsCaptured = captureEvents(engine)

    const result = await engine.unlock('a')

    expect(result.ok).toBe(true)
    // Gold subiu en 5 (de 100 a 105). Non hai cost no NodeDef, así que
    // o único delta vén do effect.
    expect(engine.getBudget().resources.gold).toBe(105)
    expect(engine.getNodeState('a')?.state).toBe('unlocked')

    // customEvent 'hooray' emitido.
    const customEvents = eventsCaptured.filter((e) => e.kind === 'customEvent')
    expect(customEvents).toHaveLength(1)
    expect(customEvents[0]?.kind === 'customEvent' && customEvents[0].eventName).toBe('hooray')

    // Audit ten custom effects_applied + node_unlocked (orde do
    // getAuditLog: máis recente primeiro, ver AuditLogger.query L94).
    const log = engine.getAuditLog()
    expect(log.map((e) => e.action.type)).toEqual(['custom', 'node_unlocked'])
    const customEntry = log[0]
    expect(customEntry?.action.type).toBe('custom')
    if (customEntry?.action.type === 'custom') {
      expect(customEntry.action.name).toBe('effects_applied')
      const data = customEntry.action.data as {
        nodeId: string
        count: number
        effects: ReadonlyArray<{ type: string; applied: boolean }>
      }
      expect(data.nodeId).toBe('a')
      expect(data.count).toBe(2)
      expect(data.effects).toHaveLength(2)
      expect(data.effects[0]?.type).toBe('modify_resource')
      expect(data.effects[0]?.applied).toBe(true)
      expect(data.effects[1]?.type).toBe('trigger_event')
      expect(data.effects[1]?.applied).toBe(true)
    }
  })
})

// ───────────────────────────────────────────────
// 3. Unlock con effects que fallan — rollback total
// ───────────────────────────────────────────────

describe('TreeEngine.unlock — effect que falla (rollback)', () => {
  it('Caso A: set_progress percent=999 → err + estado e budget restaurados', async () => {
    // gold SEN refundable (decisión 1 do director: o rollback usa
    // oldBudget directo, independentemente de refundable).
    const tree = makeTreeDef({
      startingBudget: { resources: { gold: 100 } },
      resources: [{ id: 'gold', label: 'Gold' }],
      nodes: [
        makeNode('a', {
          cost: [{ resourceId: 'gold', amount: 30 }],
          effects: [{ type: 'set_progress', nodeId: 'a', percent: 999 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree, { audit: { enabled: true } })
    const eventsCaptured = captureEvents(engine)

    const result = await engine.unlock('a')

    // err con código EFFECT_APPLICATION_FAILED.
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }

    // Estado do nodo: locked (rollback completo). Como o nodo nunca foi
    // tocado antes do unlock, previousInstance era undefined → o
    // rollback eliminou a entrada de nodes.
    expect(engine.getNodeState('a')).toBeNull()

    // Budget restaurado a 100, EVIDENCIA da decisión 1 do director:
    // gold non é refundable, e aínda así o rollback restaura exacto.
    expect(engine.getBudget().resources.gold).toBe(100)

    // Eventos en orde clave: budgetChange (cobro 100→70), stateChange
    // (locked→unlocked), unlock, budgetChange (rollback 70→100),
    // stateChange (unlocked→locked, reason 'effect_failed'), lock.
    const kinds = eventsCaptured.map((e) => e.kind)
    expect(kinds).toEqual([
      'budgetChange',
      'stateChange',
      'unlock',
      'budgetChange',
      'stateChange',
      'lock',
    ])
    // Cobro: 100 → 70.
    expect(eventsCaptured[0]).toMatchObject({
      kind: 'budgetChange',
      resourceId: 'gold',
      oldAmount: 100,
      newAmount: 70,
    })
    // Reversión: 70 → 100.
    expect(eventsCaptured[3]).toMatchObject({
      kind: 'budgetChange',
      resourceId: 'gold',
      oldAmount: 70,
      newAmount: 100,
    })
    // stateChange de reversión leva reason 'effect_failed'.
    const reversalStateChange = eventsCaptured[4]
    expect(reversalStateChange?.kind).toBe('stateChange')
    if (reversalStateChange?.kind === 'stateChange') {
      expect(reversalStateChange.change.from).toBe('unlocked')
      expect(reversalStateChange.change.to).toBe('locked')
      expect(reversalStateChange.change.reason).toBe('effect_failed')
    }

    // Audit: node_unlocked (xa rexistrada antes do fallo, 5.3.g) E
    // custom 'effects_failed' compensatoria. Orde: máis recente primeiro.
    const log = engine.getAuditLog()
    expect(log.map((e) => e.action.type)).toEqual(['custom', 'node_unlocked'])
    const failedEntry = log[0]
    if (failedEntry?.action.type === 'custom') {
      expect(failedEntry.action.name).toBe('effects_failed')
      const data = failedEntry.action.data as { nodeId: string; failedAt?: number }
      expect(data.nodeId).toBe('a')
      // O context do EffectsRunner trae failedAt; ven do err propagado.
      expect(typeof data.failedAt).toBe('number')
    }
  })

  it('Caso B: [modify_resource +5 gold, set_progress percent=999] → primeiro effect revertido + custo refundado', async () => {
    // Combina: o EffectsRunner reverte internamente o primeiro effect
    // exitoso, e o motor restaura o budget tras o cost do unlock.
    // Resultado: gold final = gold inicial.
    const tree = makeTreeDef({
      startingBudget: { resources: { gold: 100 } },
      resources: [{ id: 'gold', label: 'Gold' }],
      nodes: [
        makeNode('a', {
          cost: [{ resourceId: 'gold', amount: 30 }],
          effects: [
            { type: 'modify_resource', resourceId: 'gold', op: '+', amount: 5 },
            { type: 'set_progress', nodeId: 'a', percent: 999 },
          ],
        }),
      ],
    })
    const engine = new TreeEngine(tree)

    const result = await engine.unlock('a')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }
    // Gold final == gold inicial (100).
    expect(engine.getBudget().resources.gold).toBe(100)
    expect(engine.getNodeState('a')).toBeNull()
  })
})

// ───────────────────────────────────────────────
// 4. Multi-tier: effects en cada salto (5.7)
// ───────────────────────────────────────────────

describe('TreeEngine.unlock — multi-tier con effects', () => {
  it('3 unlocks consecutivos sobre nodo maxTier=3 → 3 effects_applied + 15 gold', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { gold: 0 } },
      resources: [{ id: 'gold', label: 'Gold' }],
      nodes: [
        makeNode('a', {
          maxTier: 3,
          effects: [{ type: 'modify_resource', resourceId: 'gold', op: '+', amount: 5 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree, { audit: { enabled: true } })

    const r1 = await engine.unlock('a')
    const r2 = await engine.unlock('a')
    const r3 = await engine.unlock('a')

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r3.ok).toBe(true)
    expect(engine.getNodeState('a')?.currentTier).toBe(3)
    // 5 + 5 + 5 = 15 gold acumulados.
    expect(engine.getBudget().resources.gold).toBe(15)

    // Audit: 3 pares (custom + node_unlocked) en orde inversa cronoloxía
    // (getAuditLog devolve máis recente primeiro).
    const log = engine.getAuditLog()
    const actionTypes = log.map((e) => e.action.type)
    expect(actionTypes).toEqual([
      'custom',
      'node_unlocked',
      'custom',
      'node_unlocked',
      'custom',
      'node_unlocked',
    ])
    // Cada custom é 'effects_applied'.
    const customActions = log.filter((e) => e.action.type === 'custom')
    expect(customActions).toHaveLength(3)
    for (const entry of customActions) {
      if (entry.action.type === 'custom') {
        expect(entry.action.name).toBe('effects_applied')
      }
    }
  })
})

// ───────────────────────────────────────────────
// 5. Unlock_node recursivo (sen ciclo)
// ───────────────────────────────────────────────

describe('TreeEngine.unlock — unlock_node recursivo', () => {
  it('A.effects=[unlock_node B] → desbloquear A desbloquea B en cadea', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: {} },
      nodes: [makeNode('a', { effects: [{ type: 'unlock_node', nodeId: 'b' }] }), makeNode('b')],
    })
    const engine = new TreeEngine(tree, { audit: { enabled: true } })
    const eventsCaptured = captureEvents(engine)

    const result = await engine.unlock('a')

    expect(result.ok).toBe(true)
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
    expect(engine.getNodeState('b')?.state).toBe('unlocked')

    // Hai 2 eventos 'unlock'. Orde: 'a' primeiro (o seu unlock event
    // emítese antes do bloque de effects, ver TreeEngine.ts L567 do
    // diff), logo 'b' (disparado polo effect unlock_node de A vía
    // engine.unlock recursivo). Esta orde é coherente: "A desbloqueouse,
    // e como consecuencia B tamén".
    const unlockEvents = eventsCaptured.filter((e) => e.kind === 'unlock')
    expect(unlockEvents.map((e) => e.kind === 'unlock' && e.nodeId)).toEqual(['a', 'b'])

    // Audit coherente: cada nodo ten o seu node_unlocked. A ten ademais
    // un 'effects_applied' (B non porque non ten effects propios).
    const log = engine.getAuditLog()
    const types = log.map((e) => e.action.type)
    expect(types).toContain('node_unlocked')
    // Polo menos 2 node_unlocked + 1 custom effects_applied.
    expect(types.filter((t) => t === 'node_unlocked')).toHaveLength(2)
    expect(types.filter((t) => t === 'custom')).toHaveLength(1)
  })
})

// ───────────────────────────────────────────────
// 6. Ciclo A↔B: estado coherente tras rollback
// ───────────────────────────────────────────────
//
// Nota arquitectura (DT-11): a detección de ciclos `unlock_node` recursivos
// non se activa cando pasan polo TreeEngine.unlock (cada chamada crea un
// run novo co seu propio `unlockedDuringRun` Set local). O ciclo
// detéctase de forma colateral por NODE_ALREADY_UNLOCKED ao longo da
// cadea de erros propagados. O estado queda coherente (rollback aplicado
// correctamente); só a protección con MAX_EFFECT_DEPTH=8 é inerte nese
// fluxo concreto.

describe('TreeEngine.unlock — ciclo A↔B non corrompe o estado', () => {
  it('detéctase como NODE_ALREADY_UNLOCKED ao longo da cadea; ambos nodos quedan en estado coherente', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { gold: 50 } },
      resources: [{ id: 'gold', label: 'Gold' }],
      nodes: [
        makeNode('a', {
          cost: [{ resourceId: 'gold', amount: 10 }],
          effects: [{ type: 'unlock_node', nodeId: 'b' }],
        }),
        makeNode('b', {
          cost: [{ resourceId: 'gold', amount: 10 }],
          effects: [{ type: 'unlock_node', nodeId: 'a' }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)

    const result = await engine.unlock('a')

    // O err propágase polo EFFECT_APPLICATION_FAILED en cadea ata o caller.
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
    }

    // A: rollback aplicado → locked (eliminado, era undefined antes).
    // O ciclo propaga o rollback aniñado: cada chamada a engine.unlock
    // que fallou no seu effect interno reverteu o seu estado.
    expect(engine.getNodeState('a')).toBeNull()
    // B tamén queda revertido (foi tocado dentro do run de A pero o
    // unlock recursivo a través de engine.unlock tamén fixo rollback
    // cando o seu propio effect 'unlock_node A' fallou).
    expect(engine.getNodeState('b')).toBeNull()

    // Budget completo restaurado (50 gold inicial), evidencia adicional
    // da decisión 1 do director (oldBudget directo en cada nivel do
    // rollback aniñado).
    expect(engine.getBudget().resources.gold).toBe(50)
  })
})

// ── FIN: tests de TreeEngine.unlock con effects (2.1.b) ──
