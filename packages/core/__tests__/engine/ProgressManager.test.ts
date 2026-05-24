// ── INICIO: tests de ProgressManager ──
// Suite unitaria do ProgressManager (sub-fase 2.4). Cobre o alcance
// ACOTADO á fonte 'manual' segundo briefing 2.4 §5.1-§5.8. Outras
// fontes (remote/callback/event/computed) deben rexeitarse con
// PROGRESS_SOURCE_UNSUPPORTED. Auto-unlock con percent=100 NON existe
// nesta sub-fase: setProgress nunca muta NodeInstance.state (§5.7).
//
// Patrón: construción manual dos colaboradores (StateStore,
// EventEmitter, AuditLogger), consistente con StatComputer.test.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import {
  AuditLogger,
  EventEmitter,
  ProgressManager,
  StateStore,
  TreeEngine,
} from '../../src/engine/index.js'
import type { ProgressManagerContext, ProgressUpdateResult } from '../../src/engine/index.js'
import type {
  NodeDef,
  NodeInstance,
  ProgressSourceConfig,
  TreeDef,
  TreeState,
} from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers de construción
// ───────────────────────────────────────────────

function makeNode(partial: Partial<NodeDef> & { id: string }): NodeDef {
  return {
    type: 'small',
    label: { gl: partial.id, es: partial.id, en: partial.id },
    ...partial,
  }
}

function makeTree(nodes: readonly NodeDef[]): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Test', es: 'Test', en: 'Test' },
    nodes,
    edges: [],
    layout: { type: 'radial' },
    stats: [],
    startingBudget: { resources: {} },
  }
}

function makeState(instances: readonly NodeInstance[] = []): TreeState {
  const nodes: Record<string, NodeInstance> = {}
  for (const inst of instances) {
    nodes[inst.id] = inst
  }
  return {
    nodes,
    budget: { resources: {} },
  }
}

interface BuildResult {
  readonly manager: ProgressManager
  readonly store: StateStore
  readonly events: EventEmitter
  readonly audit: AuditLogger
}

function buildManager(treeDef: TreeDef, state?: TreeState): BuildResult {
  const store = new StateStore(treeDef, { initialState: state })
  const events = new EventEmitter()
  // O AuditLogger por defecto está desactivado (record() é no-op);
  // habilitámolo para verificar entradas nos tests.
  const audit = new AuditLogger({ enabled: true })
  const ctx: ProgressManagerContext = {
    treeDef,
    store,
    events,
    audit,
    locale: 'gl',
  }
  return { manager: new ProgressManager(ctx), store, events, audit }
}

const MANUAL: ProgressSourceConfig = { type: 'manual' }

// ───────────────────────────────────────────────
// setProgress: caso válido base
// ───────────────────────────────────────────────

describe('ProgressManager.setProgress — caso válido manual', () => {
  it('aplica progress, emite evento e rexistra audit', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, store, events, audit } = buildManager(tree)

    const eventLog: Array<{ nodeId: string; percent: number }> = []
    events.on('progressChange', (nodeId, percent) => {
      eventLog.push({ nodeId, percent })
    })

    const result = manager.setProgress('n1', 50)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual<ProgressUpdateResult>({
      nodeId: 'n1',
      oldPercent: 0,
      newPercent: 50,
      crossedMilestones: [],
    })

    // Estado mutado.
    expect(store.getState().nodes.n1?.progress).toBe(50)

    // Evento emitido unha vez.
    expect(eventLog).toEqual([{ nodeId: 'n1', percent: 50 }])

    // Audit rexistrado.
    const entries = audit.query()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.action).toEqual({
      type: 'progress_updated',
      nodeId: 'n1',
      from: 0,
      to: 50,
    })
    expect(entries[0]?.rollbackable).toBe(true)
  })

  it('crea NodeInstance mínima cando non existía; estado segue locked', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, store } = buildManager(tree)

    expect(store.getState().nodes.n1).toBeUndefined()

    const result = manager.setProgress('n1', 30)
    expect(result.ok).toBe(true)

    const inst = store.getState().nodes.n1
    expect(inst).toBeDefined()
    expect(inst?.id).toBe('n1')
    expect(inst?.state).toBe('locked')
    expect(inst?.currentTier).toBe(0)
    expect(inst?.progress).toBe(30)
  })
})

// ───────────────────────────────────────────────
// setProgress: idempotencia (§5.4 paso 2)
// ───────────────────────────────────────────────

describe('ProgressManager.setProgress — idempotencia', () => {
  it('segunda chamada co mesmo valor non emite evento nin audit', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, events, audit } = buildManager(tree)

    let emits = 0
    events.on('progressChange', () => {
      emits += 1
    })

    manager.setProgress('n1', 50)
    expect(emits).toBe(1)
    expect(audit.query()).toHaveLength(1)

    const second = manager.setProgress('n1', 50)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.value).toEqual<ProgressUpdateResult>({
      nodeId: 'n1',
      oldPercent: 50,
      newPercent: 50,
      crossedMilestones: [],
    })

    // Ningún evento ou audit novo.
    expect(emits).toBe(1)
    expect(audit.query()).toHaveLength(1)
  })

  it('setProgress(0) inicial sobre nodo sen progress previo é idempotente (oldPercent=0)', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, store, events, audit } = buildManager(tree)

    let emits = 0
    events.on('progressChange', () => {
      emits += 1
    })

    const result = manager.setProgress('n1', 0)
    expect(result.ok).toBe(true)

    // Como oldPercent (0 por defecto) === newPercent (0), é idempotente:
    // non se muta o store, non se emite evento, non se audita.
    expect(emits).toBe(0)
    expect(audit.query()).toHaveLength(0)
    expect(store.getState().nodes.n1).toBeUndefined()
  })
})

// ───────────────────────────────────────────────
// setProgress: regresión (§5.5)
// ───────────────────────────────────────────────

describe('ProgressManager.setProgress — progress que baixa (§5.5)', () => {
  it('permite baixar e devolve crossedMilestones vacío', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager, store } = buildManager(tree)

    const r1 = manager.setProgress('n1', 80)
    expect(r1.ok).toBe(true)

    const r2 = manager.setProgress('n1', 40)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.value).toEqual<ProgressUpdateResult>({
      nodeId: 'n1',
      oldPercent: 80,
      newPercent: 40,
      crossedMilestones: [],
    })
    expect(store.getState().nodes.n1?.progress).toBe(40)
  })
})

// ───────────────────────────────────────────────
// setProgress: validacións de erro (§5.4 paso 1, §5.6)
// ───────────────────────────────────────────────

describe('ProgressManager.setProgress — validacións de erro', () => {
  it('nodo inexistente → NODE_NOT_FOUND', () => {
    const tree = makeTree([])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('ghost', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
  })

  it('nodo sen supportsProgress=true → PROGRESS_NOT_SUPPORTED', () => {
    const tree = makeTree([makeNode({ id: 'n1' })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_NOT_SUPPORTED)
  })

  it('nodo con supportsProgress=false explícito → PROGRESS_NOT_SUPPORTED', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: false })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_NOT_SUPPORTED)
  })

  it('nodo con supportsProgress=true pero sen progressSource → PROGRESS_SOURCE_UNSUPPORTED', () => {
    // Briefing §5.1: ausencia de progressSource é ambigua e tamén se rexeita.
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
  })

  it('nodo con progressSource remote → PROGRESS_SOURCE_UNSUPPORTED', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: { type: 'remote', endpoint: 'https://example.com/api' },
      }),
    ])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
  })

  it('nodo con progressSource callback → PROGRESS_SOURCE_UNSUPPORTED', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: { type: 'callback', handlerId: 'h1' },
      }),
    ])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
  })

  it('nodo con progressSource event → PROGRESS_SOURCE_UNSUPPORTED', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: { type: 'event', eventName: 'lesson_completed' },
      }),
    ])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
  })

  it('nodo con progressSource computed → PROGRESS_SOURCE_UNSUPPORTED', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['x'], formula: 'avg' },
      }),
    ])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
  })

  it('percent=-1 → INVALID_PROGRESS_VALUE', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', -1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })

  it('percent=101 → INVALID_PROGRESS_VALUE', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 101)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })

  it('percent=NaN → INVALID_PROGRESS_VALUE', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', Number.NaN)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })

  it('percent=Infinity → INVALID_PROGRESS_VALUE', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', Number.POSITIVE_INFINITY)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })

  it('percent=-Infinity → INVALID_PROGRESS_VALUE', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', Number.NEGATIVE_INFINITY)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_VALUE)
  })
})

// ───────────────────────────────────────────────
// crossedMilestones (§5.4 paso 3 + §5.5)
// ───────────────────────────────────────────────

describe('ProgressManager.setProgress — crossedMilestones', () => {
  it('cruza milestones que están en (oldPercent, newPercent]', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 40 }]),
    )

    const result = manager.setProgress('n1', 80)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([50, 75])
  })

  it('inclúe o milestone superior se newPercent o iguala exactamente', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 49 }]),
    )

    const result = manager.setProgress('n1', 50)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([50])
  })

  it('exclúe oldPercent exacto (intervalo aberto no inferior)', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 50 }]),
    )

    // oldPercent=50 → 75. O 50 NON debe estar en crossedMilestones.
    const result = manager.setProgress('n1', 75)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([75])
  })

  it('progressMilestones ausente → crossedMilestones vacío aínda subindo', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 80)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([])
  })

  it('progressMilestones vacío → crossedMilestones vacío', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [],
      }),
    ])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 80)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([])
  })

  it('cruzar todos os milestones nun salto 0 → 100', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(tree)

    const result = manager.setProgress('n1', 100)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([25, 50, 75, 100])
  })
})

// ───────────────────────────────────────────────
// NodeInstance.state NON muta (§5.7)
// ───────────────────────────────────────────────

describe('ProgressManager.setProgress — cero mutación de state (§5.7)', () => {
  it('setProgress(100) non transita o estado a unlocked', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, store } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0 }]),
    )

    manager.setProgress('n1', 100)

    const inst = store.getState().nodes.n1
    expect(inst?.state).toBe('locked')
    expect(inst?.currentTier).toBe(0)
    expect(inst?.progress).toBe(100)
  })

  it('setProgress(50) non transita o estado a in_progress', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, store } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0 }]),
    )

    manager.setProgress('n1', 50)

    const inst = store.getState().nodes.n1
    expect(inst?.state).toBe('locked')
  })

  it('un nodo unlocked permanece unlocked tras setProgress', () => {
    // Caso defensivo: aínda que un nodo desbloqueado reciba progress,
    // o seu estado non se reverte nin avanza.
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager, store } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'unlocked', currentTier: 1, progress: 0 }]),
    )

    manager.setProgress('n1', 75)

    const inst = store.getState().nodes.n1
    expect(inst?.state).toBe('unlocked')
    expect(inst?.currentTier).toBe(1)
    expect(inst?.progress).toBe(75)
  })
})

// ───────────────────────────────────────────────
// getProgress (§5.3)
// ───────────────────────────────────────────────

describe('ProgressManager.getProgress', () => {
  it('devolve o valor actual cando o nodo ten progress', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 42 }]),
    )

    expect(manager.getProgress('n1')).toBe(42)
  })

  it('devolve 0 cando o nodo existe pero non ten progress', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0 }]),
    )

    expect(manager.getProgress('n1')).toBe(0)
  })

  it('devolve 0 (defensivo, cero excepcións) cando o nodo non existe', () => {
    const tree = makeTree([])
    const { manager } = buildManager(tree)

    expect(manager.getProgress('ghost')).toBe(0)
  })

  it('reflicte mutacións inmediatamente tras setProgress', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(tree)

    expect(manager.getProgress('n1')).toBe(0)
    manager.setProgress('n1', 33)
    expect(manager.getProgress('n1')).toBe(33)
    manager.setProgress('n1', 77)
    expect(manager.getProgress('n1')).toBe(77)
  })
})

// ───────────────────────────────────────────────
// getReachedMilestones (§5.8)
// ───────────────────────────────────────────────

describe('ProgressManager.getReachedMilestones', () => {
  it('devolve milestones <= progress actual', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 73 }]),
    )

    expect(manager.getReachedMilestones('n1')).toEqual([25, 50])
  })

  it('devolve [] cando progress=0', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 0 }]),
    )

    expect(manager.getReachedMilestones('n1')).toEqual([])
  })

  it('inclúe todos os milestones cando progress=100', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 100 }]),
    )

    expect(manager.getReachedMilestones('n1')).toEqual([25, 50, 75, 100])
  })

  it('inclúe o milestone igual ao progress (límite inclusivo)', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 50 }]),
    )

    expect(manager.getReachedMilestones('n1')).toEqual([25, 50])
  })

  it('devolve [] cando o nodo non ten progressMilestones', () => {
    const tree = makeTree([makeNode({ id: 'n1', supportsProgress: true, progressSource: MANUAL })])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 50 }]),
    )

    expect(manager.getReachedMilestones('n1')).toEqual([])
  })

  it('devolve [] cando progressMilestones está vacío', () => {
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 50 }]),
    )

    expect(manager.getReachedMilestones('n1')).toEqual([])
  })

  it('devolve [] (defensivo, cero excepcións) cando o nodo non existe', () => {
    const tree = makeTree([])
    const { manager } = buildManager(tree)

    expect(manager.getReachedMilestones('ghost')).toEqual([])
  })

  it('non ordena internamente: respecta a orde do progressMilestones do TreeDef', () => {
    // Briefing §5.8: a ordenación é responsabilidade do validador da
    // TreeDef. Se vén desordenado, o filtro preserva esa orde. Test
    // documenta o contrato; en uso real espérase que veñan ordenados.
    const tree = makeTree([
      makeNode({
        id: 'n1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [75, 25, 50],
      }),
    ])
    const { manager } = buildManager(
      tree,
      makeState([{ id: 'n1', state: 'locked', currentTier: 0, progress: 60 }]),
    )

    // Os tres son <= 60? Non: 75 > 60. Quedan 25 e 50 na orde de entrada.
    expect(manager.getReachedMilestones('n1')).toEqual([25, 50])
  })
})

// ───────────────────────────────────────────────
// Integración demostrativa (§5.2 excepción mínima)
// ───────────────────────────────────────────────

describe('ProgressManager — integración demostrativa con TreeEngine', () => {
  it('un TreeDef con supportsProgress+manual válido para TreeEngine soporta setProgress vía ProgressManager standalone', () => {
    // Demostración de como se cableará en 2.4.b: o TreeEngine real
    // constrúese co mesmo TreeDef (validándoo); o ProgressManager
    // standalone móntase sobre un context construído a man (en 2.4.b
    // o engine reutilizará os seus colaboradores internos). NON se
    // engaden métodos públicos a TreeEngine (§5.2).
    const tree = makeTree([
      makeNode({
        id: 'lesson-1',
        supportsProgress: true,
        progressSource: MANUAL,
        progressMilestones: [25, 50, 75, 100],
      }),
    ])

    // Engine real: valida o TreeDef e constrúe os seus internos.
    // Verifica que un TreeDef con supportsProgress+manual é válido
    // no motor (non rexeita).
    const engine = new TreeEngine(tree)
    expect(engine).toBeDefined()

    // Context manual paralelo (en 2.4.b o engine ofrecerá os
    // colaboradores; aquí construímolos aparte porque son privados).
    const store = new StateStore(tree)
    const events = new EventEmitter()
    const audit = new AuditLogger({ enabled: true })
    const manager = new ProgressManager({
      treeDef: tree,
      store,
      events,
      audit,
      locale: 'gl',
    })

    const result = manager.setProgress('lesson-1', 60)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.crossedMilestones).toEqual([25, 50])
    expect(manager.getProgress('lesson-1')).toBe(60)
    expect(manager.getReachedMilestones('lesson-1')).toEqual([25, 50])
  })
})

// ── FIN: tests de ProgressManager ──
