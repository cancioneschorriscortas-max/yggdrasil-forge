// ── INICIO: tests de integración Progress en TreeEngine (sub-fase 2.4.b) ──
// Verifica que TreeEngine expón os 3 métodos delegantes
// (setProgress / getProgress / getReachedMilestones) e que estes
// delegan correctamente no ProgressManager interno. As decisións
// críticas (cero auto-unlock, cero mutación de state, respec
// conserva progress, computed devolve INVALID_PROGRESS_OPERATION en setProgress)
// están cubertas con tests dedicados.
//
// Os tests unitarios exhaustivos do propio ProgressManager (40 casos
// de validación, idempotencia, milestones, etc.) viven en
// __tests__/engine/ProgressManager.test.ts; aquí só se verifican os
// contratos de integración.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { NodeDef, ProgressSourceConfig, TreeDef } from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers de construción
// ───────────────────────────────────────────────

const MANUAL: ProgressSourceConfig = { type: 'manual' }

function makeNode(partial: Partial<NodeDef> & { id: string }): NodeDef {
  return {
    type: 'passive',
    label: partial.id,
    ...partial,
  }
}

function makeTree(nodes: readonly NodeDef[]): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test',
    nodes,
    edges: [],
    layout: { type: 'radial' },
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
  }
}

// ───────────────────────────────────────────────
// Integración básica: setProgress + getProgress
// ───────────────────────────────────────────────

describe('TreeEngine — integración ProgressManager (sub-fase 2.4.b)', () => {
  it('setProgress aplica e getProgress devolve o valor', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('n1', 50)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.newPercent).toBe(50)
    expect(result.value.oldPercent).toBe(0)
    expect(engine.getProgress('n1')).toBe(50)
  })

  it('setProgress emite o evento progressChange', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    const received: Array<{ nodeId: string; percent: number }> = []
    engine.on('progressChange', (nodeId, percent) => {
      received.push({ nodeId, percent })
    })

    engine.setProgress('n1', 75)

    expect(received).toEqual([{ nodeId: 'n1', percent: 75 }])
  })

  it('setProgress con audit habilitado rexistra progress_updated', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree, { audit: { enabled: true } })

    engine.setProgress('n1', 30)

    const log = engine.getAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0]?.action).toEqual({
      type: 'progress_updated',
      nodeId: 'n1',
      from: 0,
      to: 30,
    })
    expect(log[0]?.rollbackable).toBe(true)
  })
})

// ───────────────────────────────────────────────
// Cero auto-unlock + cero mutación de state (§5.4, §5.5)
// ───────────────────────────────────────────────

describe('TreeEngine — cero auto-unlock e cero mutación de state', () => {
  it('setProgress(100) NON desbloquea o nodo nin cambia o estado', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    engine.setProgress('n1', 100)

    const node = engine.getNodeState('n1')
    expect(node?.state).toBe('locked')
    expect(node?.progress).toBe(100)
    expect(node?.currentTier).toBe(0)
  })

  it('setProgress(50) NON transita a "in_progress" (estado non usado nesta sub-fase)', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    engine.setProgress('n1', 50)

    const node = engine.getNodeState('n1')
    expect(node?.state).toBe('locked')
    expect(node?.state).not.toBe('in_progress')
    expect(node?.state).not.toBe('unlocked')
  })

  it('canUnlock segue avaliándose normal tras setProgress(100)', () => {
    // Sen prerrequisitos nin custos, o nodo é desbloqueable dende o
    // primeiro instante. setProgress(100) non altera esa avaliación
    // (nin para mellor nin para peor): canUnlock segue dicindo o que
    // dicía antes. O nodo segue locked ata que o consumidor chame
    // explicitamente a `engine.unlock`.
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    const before = engine.canUnlock('n1')
    expect(before.ok).toBe(true)
    if (!before.ok) return
    expect(before.value.allowed).toBe(true)

    engine.setProgress('n1', 100)

    const after = engine.canUnlock('n1')
    expect(after.ok).toBe(true)
    if (!after.ok) return
    expect(after.value.allowed).toBe(true)

    // O nodo segue locked aínda con progress=100 e canUnlock=true.
    expect(engine.getNodeState('n1')?.state).toBe('locked')
    expect(engine.getProgress('n1')).toBe(100)
  })
})

// ───────────────────────────────────────────────
// getReachedMilestones (§5.3 + delegación)
// ───────────────────────────────────────────────

describe('TreeEngine.getReachedMilestones', () => {
  it('devolve milestones cruzados tras setProgress', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const engine = new TreeEngine(tree)

    engine.setProgress('n1', 60)
    expect(engine.getReachedMilestones('n1')).toEqual([25, 50])
  })

  it('inclúe milestone exacto cando progress=milestone', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const engine = new TreeEngine(tree)

    engine.setProgress('n1', 75)
    expect(engine.getReachedMilestones('n1')).toEqual([25, 50, 75])
  })

  it('devolve [] para nodo inexistente (defensivo)', () => {
    const tree = makeTree([])
    const engine = new TreeEngine(tree)

    expect(engine.getReachedMilestones('ghost')).toEqual([])
  })
})

// ───────────────────────────────────────────────
// respec conserva progress (§5.8)
// ───────────────────────────────────────────────

describe('TreeEngine — respec conserva progress (§5.8)', () => {
  it('tras unlock + setProgress + respec, getProgress segue devolvendo o valor', async () => {
    // §5.8 do briefing 2.4.b: respec NON limpa progress. O dato é
    // semántico ("xa fixen o 50%") e o consumidor decide se quere
    // resetalo manualmente.
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    // 1) desbloquear
    const unlockResult = await engine.unlock('n1')
    expect(unlockResult.ok).toBe(true)
    expect(engine.getNodeState('n1')?.state).toBe('unlocked')

    // 2) establecer progreso
    engine.setProgress('n1', 50)
    expect(engine.getProgress('n1')).toBe(50)

    // 3) respec → o estado volve a locked, pero progress NON se reseta
    const respecResult = await engine.respec('n1')
    expect(respecResult.ok).toBe(true)

    expect(engine.getNodeState('n1')?.state).toBe('locked')
    expect(engine.getProgress('n1')).toBe(50)
  })
})

// ───────────────────────────────────────────────
// Propagación de erros do ProgressManager (§5.3)
// ───────────────────────────────────────────────

describe('TreeEngine.setProgress — propagación de erros', () => {
  it('nodo inexistente → NODE_NOT_FOUND (YGG_E001)', () => {
    const tree = makeTree([])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('ghost', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
  })

  it('nodo sen supportsProgress → PROGRESS_NOT_SUPPORTED (YGG_E019)', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_NOT_SUPPORTED)
  })

  it('progressSource remote → PROGRESS_SOURCE_UNSUPPORTED (YGG_E020)', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: { type: 'remote', endpoint: 'https://example.com/api' },
      }),
    ])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
  })

  it('progressSource computed → INVALID_PROGRESS_OPERATION (sub-fase 2.4.c)', () => {
    // En 2.4/2.4.b computed devolvía PROGRESS_SOURCE_UNSUPPORTED. En
    // 2.4.c computed está SOPORTADO para getProgress (derivación
    // dinámica) pero setProgress segue sendo inválido cun ErrorCode
    // específico: un computed non se establece manualmente.
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['x'], formula: 'avg' },
      }),
    ])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_OPERATION)
  })

  it('percent=-1 → INVALID_PROGRESS_VALUE (YGG_E021)', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('n1', -1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })

  it('percent=101 → INVALID_PROGRESS_VALUE (YGG_E021)', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    const result = engine.setProgress('n1', 101)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })
})

// ───────────────────────────────────────────────
// Regresión: contrato de getProgress (substitución 2.4.b)
// ───────────────────────────────────────────────

describe('TreeEngine.getProgress — regresión contrato 1.12 → 2.4.b', () => {
  // O método getProgress(nodeId) existe desde a sub-fase 1.12. Ata
  // 2.4.b a implementación lía directamente do store; en 2.4.b
  // substitúese por delegación en ProgressManager. Estes tres tests
  // documentan que o contrato observable se preserva: nodo
  // inexistente → 0, nodo sen progress → 0, nodo con progress=X → X.
  // Útiles para arqueoloxía futura.

  it('nodo inexistente devolve 0', () => {
    const tree = makeTree([])
    const engine = new TreeEngine(tree)

    expect(engine.getProgress('ghost')).toBe(0)
  })

  it('nodo existente sen progress devolve 0', () => {
    // Un nodo que ten NodeDef pero ningunha NodeInstance no estado
    // inicial (cero unlock, cero setProgress) cae no caso "sen
    // progress definido". Tamén: aínda que se cree NodeInstance vía
    // unlock, se non ten progress (porque setProgress nunca se
    // chamou), debe devolver 0.
    const tree = makeTree([makeNode({ id: 'n1' })])
    const engine = new TreeEngine(tree)

    expect(engine.getProgress('n1')).toBe(0)
  })

  it('nodo con progress=42 devolve 42', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const engine = new TreeEngine(tree)

    engine.setProgress('n1', 42)
    expect(engine.getProgress('n1')).toBe(42)
  })
})

// ───────────────────────────────────────────────
// Integración 2.4.d: progress_min con nodos computed
// ───────────────────────────────────────────────

describe('TreeEngine — progress_min sobre nodo computed (sub-fase 2.4.d)', () => {
  // Helper: TreeDef estándar para os tests de 2.4.d.
  // - A: manual con progress controlable.
  // - C: computed = sum([A]) — deriva dinámicamente do A.
  // - B: ten prerequisite `progress_min: C >= 50`.
  function makeTreeABC(): TreeDef {
    return makeTree([
      makeNode({ id: 'a', supportsProgress: true, progressSource: MANUAL }),
      makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      }),
      makeNode({
        id: 'b',
        prerequisites: { type: 'progress_min', nodeId: 'c', percent: 50 },
      }),
    ])
  }

  it('canUnlock(B) permítese cando o computed C deriva ≥ 50 (manual A=80 → C=80)', () => {
    // Caso principal: tras 2.4.d, canUnlock consulta progressManager
    // a través do context do UnlockResolver. O computed C lese
    // dinámicamente como 80 (=sum([A])); a condición progress_min ≥ 50
    // satisfacese e B é desbloqueable.
    const engine = new TreeEngine(makeTreeABC())

    engine.setProgress('a', 80)
    expect(engine.getProgress('c')).toBe(80) // sanity check de 2.4.c

    const result = engine.canUnlock('b')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.allowed).toBe(true)
  })

  it('canUnlock(B) rexéitase cando o computed C deriva < 50 (manual A=30 → C=30)', () => {
    // Caso negativo simétrico. C=30 < 50, a condición progress_min
    // non se cumpre, B segue locked.
    const engine = new TreeEngine(makeTreeABC())

    engine.setProgress('a', 30)
    expect(engine.getProgress('c')).toBe(30)

    const result = engine.canUnlock('b')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.allowed).toBe(false)
  })

  it('ciclo computed: canUnlock(C) cunha prereq apuntando a A nun ciclo A↔B devolve allowed=false', () => {
    // A=[B] computed, B=[A] computed; ambos devolven 0 polo ciclo
    // (sub-fase 2.4.c §5.4). Un nodo C que precisa progress_min(A, 1)
    // non pode desbloquearse porque A=0 < 1.
    const tree = makeTree([
      makeNode({
        id: 'a',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['b'], formula: 'sum' },
      }),
      makeNode({
        id: 'b',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      }),
      makeNode({
        id: 'c',
        prerequisites: { type: 'progress_min', nodeId: 'a', percent: 1 },
      }),
    ])
    const engine = new TreeEngine(tree)

    // Sanity: A devolve 0 polo ciclo.
    expect(engine.getProgress('a')).toBe(0)

    const result = engine.canUnlock('c')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.allowed).toBe(false)
  })

  it('regresión: progress_min apuntando a nodo MANUAL segue funcionando idéntico ao previo a 2.4.d', () => {
    // Test de non-regresión: o comportamento clásico (progress_min
    // sobre un nodo manual con progress no state) non se ve afectado
    // pola integración do progressManager. Aínda que agora se delega
    // no progressManager (que devolve o valor do state para nodos
    // manual), o resultado observable é idéntico.
    const tree = makeTree([
      makeNode({ id: 'a', supportsProgress: true, progressSource: MANUAL }),
      makeNode({
        id: 'b',
        prerequisites: { type: 'progress_min', nodeId: 'a', percent: 50 },
      }),
    ])
    const engine = new TreeEngine(tree)

    // Sen progress: B non se pode desbloquear.
    let result = engine.canUnlock('b')
    expect(result.ok && !result.value.allowed).toBe(true)

    // Con A.progress=80 (manual): B desbloqueable.
    engine.setProgress('a', 80)
    result = engine.canUnlock('b')
    expect(result.ok && result.value.allowed).toBe(true)

    // Con A.progress=20 (manual, baixo límite): B non desbloqueable.
    engine.setProgress('a', 20)
    result = engine.canUnlock('b')
    expect(result.ok && !result.value.allowed).toBe(true)
  })
})

// ───────────────────────────────────────────────
// Asimetría 2.4.d PECHADA en 2.4.e: EffectsRunner e StatComputer
// consultan computed correctamente
// ───────────────────────────────────────────────

describe('TreeEngine — asimetría 2.4.d pechada en 2.4.e: EffectsRunner consulta computed correctamente', () => {
  it('effect conditional con progress_min(computed) AVALÍASE como TRUE cando C=80 (rama then)', async () => {
    // Este test foi creado en 2.4.d para DOCUMENTAR O ESTADO INTERMEDIO
    // onde EffectsRunner aínda non consultaba ProgressManager. En 2.4.e
    // pechouse a asimetría: o EffectContext acepta `progressManager?` e
    // `TreeEngine` pásao automáticamente, polo que un effect
    // `conditional` con `progress_min(nodoComputed, ...)` agora avalíase
    // contra o valor derivado dinámicamente.
    //
    // Histórico:
    //   - 2.4.b/2.4.c: progress_min en effects.conditional lía
    //     NodeInstance.progress (devolvía 0 para computed).
    //   - 2.4.d: `canUnlock` arranxado, pero EffectsRunner non.
    //     Test inicial fixaba o contrato intermedio (asertion: 90).
    //   - 2.4.e (esta sub-fase): EffectsRunner tamén arranxado.
    //     A aserción **invírtese**: agora o effect ve o computed e
    //     escolle a rama then.
    const tree = makeTree([
      makeNode({ id: 'a', supportsProgress: true, progressSource: MANUAL }),
      makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      }),
      makeNode({
        id: 'trigger',
        // Sen prerequisites: desbloquéase libremente. Ao desbloquear,
        // executa un effect conditional cuxa condition é
        // `progress_min(c, 50)`. Se a condition é true → +50 xp; se
        // non → -10 xp. O xp inicial é 100; iso permítenos verificar
        // que rama se executou.
        effects: [
          {
            type: 'conditional',
            condition: { type: 'progress_min', nodeId: 'c', percent: 50 },
            // biome-ignore lint/suspicious/noThenProperty: 'then' é parte da DSL declarativa de Effect, non un thenable.
            then: [{ type: 'modify_resource', resourceId: 'xp', op: '+', amount: 50 }],
            else: [{ type: 'modify_resource', resourceId: 'xp', op: '-', amount: 10 }],
          },
        ],
      }),
    ])
    const engine = new TreeEngine(tree)

    // Setear A=80, polo que C deriva a 80 — claramente >= 50.
    engine.setProgress('a', 80)
    expect(engine.getProgress('c')).toBe(80) // sanity check

    const initialXp = engine.getSnapshot().budget.resources.xp ?? 0
    expect(initialXp).toBe(100)

    const result = await engine.unlock('trigger')
    expect(result.ok).toBe(true)

    const finalXp = engine.getSnapshot().budget.resources.xp ?? 0
    // En 2.4.e EffectsRunner ve C=80 → rama then → 100 + 50 = 150.
    // (En 2.4.b/c/d era 90, rama else.)
    expect(finalXp).toBe(150)
  })

  it('effect conditional con progress_min(computed) AVALÍASE como FALSE cando C=30 (rama else)', async () => {
    // Caso negativo simétrico: A=30 → C=30 < 50, condition false,
    // rama else → -10 xp.
    const tree = makeTree([
      makeNode({ id: 'a', supportsProgress: true, progressSource: MANUAL }),
      makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      }),
      makeNode({
        id: 'trigger',
        effects: [
          {
            type: 'conditional',
            condition: { type: 'progress_min', nodeId: 'c', percent: 50 },
            // biome-ignore lint/suspicious/noThenProperty: 'then' é parte da DSL declarativa de Effect, non un thenable.
            then: [{ type: 'modify_resource', resourceId: 'xp', op: '+', amount: 50 }],
            else: [{ type: 'modify_resource', resourceId: 'xp', op: '-', amount: 10 }],
          },
        ],
      }),
    ])
    const engine = new TreeEngine(tree)

    engine.setProgress('a', 30)
    expect(engine.getProgress('c')).toBe(30)

    const result = await engine.unlock('trigger')
    expect(result.ok).toBe(true)

    const finalXp = engine.getSnapshot().budget.resources.xp ?? 0
    expect(finalXp).toBe(90) // 100 - 10 = 90 (rama else, condition false)
  })

  // ── StatComputer: caso paralelo ──

  it('stat con conditional contribution sobre computed: contribución aplícase cando C=80', async () => {
    // Caso paralelo para StatComputer: un nodo `producer` ten unha
    // statContribution condicionada a `progress_min(c, 50)`. Cando o
    // computed C deriva >= 50, a contribución conta; cando deriva
    // menos, NON conta.
    //
    // En 2.4.b/c/d isto sempre se avaliaba como falso (StatComputer
    // construía o seu resolverCtx sen progressManager → lía 0 para
    // computed). En 2.4.e arranxado: StatComputerContext acepta
    // `progressManager?` e `TreeEngine` pásao automáticamente.
    const tree = makeTree([
      makeNode({ id: 'a', supportsProgress: true, progressSource: MANUAL }),
      makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      }),
      makeNode({
        id: 'producer',
        statContributions: [
          {
            statId: 'power',
            op: '+',
            value: 10,
            conditions: [{ type: 'progress_min', nodeId: 'c', percent: 50 }],
          },
        ],
      }),
    ])
    // Engadimos un StatDef 'power' co `initial: 0`.
    const treeWithStat: TreeDef = {
      ...tree,
      stats: [{ id: 'power', label: 'Power', initial: 0 }],
    }
    const engine = new TreeEngine(treeWithStat)

    // Desbloqueamos producer (necesario para que contribúa, briefing
    // StatComputer §5.3: só unlocked/maxed contribúen).
    await engine.unlock('producer')

    // Caso A=80 → C=80 >= 50 → condition TRUE → contribución aplícase
    // → power = 0 + 10 = 10. En 2.4.b/c/d sería 0.
    engine.setProgress('a', 80)
    expect(engine.getProgress('c')).toBe(80)
    expect(engine.getStat('power')).toBe(10)

    // Caso A=20 → C=20 < 50 → condition FALSE → contribución non
    // aplícase → power = 0.
    engine.setProgress('a', 20)
    expect(engine.getProgress('c')).toBe(20)
    expect(engine.getStat('power')).toBe(0)
  })
})

// ── FIN: tests de integración Progress en TreeEngine ──
