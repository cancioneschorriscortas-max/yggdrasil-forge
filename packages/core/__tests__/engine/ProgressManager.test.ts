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

  it('nodo con progressSource computed → INVALID_PROGRESS_OPERATION (sub-fase 2.4.c)', () => {
    // En 2.4 e 2.4.b este caso devolvía PROGRESS_SOURCE_UNSUPPORTED
    // (computed estaba fóra de alcance). En 2.4.c computed pasa a
    // estar soportado *para getProgress* (derivación dinámica) pero
    // setProgress sobre un computed segue sendo inválido por outro
    // motivo: un computed non se establece manualmente, só se deriva.
    // Por iso o ErrorCode cambia a un específico (INVALID_PROGRESS_OPERATION,
    // YGG_E022).
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
    expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_OPERATION)
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

// ───────────────────────────────────────────────
// Computed progress source (sub-fase 2.4.c)
// ───────────────────────────────────────────────

describe('ProgressManager — computed progress source (sub-fase 2.4.c)', () => {
  // Helper: nodo manual con progress preexistente no state.
  function withManualProgress(
    id: string,
    progress: number,
  ): { def: NodeDef; instance: NodeInstance } {
    return {
      def: makeNode({ id, supportsProgress: true, progressSource: MANUAL }),
      instance: { id, state: 'locked', currentTier: 0, progress },
    }
  }

  // ── Cálculo básico: sum / avg / min / max ──

  describe('cálculo básico (§5.3)', () => {
    it('sum sobre un só dep devolve o seu valor', () => {
      const a = withManualProgress('a', 50)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const tree = makeTree([a.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('c')).toBe(50)
    })

    it('sum sobre [A=30, B=40] devolve 70', () => {
      const a = withManualProgress('a', 30)
      const b = withManualProgress('b', 40)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getProgress('c')).toBe(70)
    })

    it('avg sobre [A=30, B=40] devolve 35', () => {
      const a = withManualProgress('a', 30)
      const b = withManualProgress('b', 40)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'avg' },
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getProgress('c')).toBe(35)
    })

    it('min sobre [A=30, B=40] devolve 30', () => {
      const a = withManualProgress('a', 30)
      const b = withManualProgress('b', 40)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'min' },
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getProgress('c')).toBe(30)
    })

    it('max sobre [A=30, B=40] devolve 40', () => {
      const a = withManualProgress('a', 30)
      const b = withManualProgress('b', 40)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'max' },
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getProgress('c')).toBe(40)
    })

    it('sum con A=80, B=80 clampa a 100 (non 160)', () => {
      const a = withManualProgress('a', 80)
      const b = withManualProgress('b', 80)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getProgress('c')).toBe(100)
    })

    it('avg sobre [A=100] devolve 100 (límite superior alcanzado pero non superado)', () => {
      const a = withManualProgress('a', 100)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'avg' },
      })
      const tree = makeTree([a.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('c')).toBe(100)
    })
  })

  // ── Defensa: inexistentes, lista baleira ──

  describe('defensa (§5.3.2.a, §5.7)', () => {
    it('dependsOn con algún nodo inexistente: ignóranse e calcula sobre os que existen', () => {
      const a = withManualProgress('a', 60)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'ghost'], formula: 'sum' },
      })
      const tree = makeTree([a.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance]))

      // Filtrado en computeProgressFor: 'ghost' descártase, queda [a=60].
      expect(manager.getProgress('c')).toBe(60)
    })

    it('dependsOn con todos os nodos inexistentes: devolve 0 (lista efectiva baleira)', () => {
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['g1', 'g2'], formula: 'min' },
      })
      const tree = makeTree([computed])
      const { manager } = buildManager(tree)

      expect(manager.getProgress('c')).toBe(0)
    })

    it('dependsOn: [] (vacío declarado): devolve 0 para todas as fórmulas', () => {
      const make = (formula: 'sum' | 'avg' | 'min' | 'max'): NodeDef =>
        makeNode({
          id: `c-${formula}`,
          supportsProgress: true,
          progressSource: { type: 'computed', dependsOn: [], formula },
        })
      const tree = makeTree([make('sum'), make('avg'), make('min'), make('max')])
      const { manager } = buildManager(tree)

      expect(manager.getProgress('c-sum')).toBe(0)
      expect(manager.getProgress('c-avg')).toBe(0)
      expect(manager.getProgress('c-min')).toBe(0)
      expect(manager.getProgress('c-max')).toBe(0)
    })

    it('min con un dep inexistente filtrado NON contamina o resultado con 0 espurio', () => {
      // Regresión específica do filtrado upstream: se o ghost fose
      // tratado como 0, min daría 0; ao filtrarse, min é o do dep real.
      const a = withManualProgress('a', 50)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['ghost', 'a'], formula: 'min' },
      })
      const tree = makeTree([a.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('c')).toBe(50)
    })
  })

  // ── Composición: computed depende de computed ──

  describe('composición computed→computed', () => {
    it('A manual=70, B=[A] sum=70, C=[A,B] sum=140 → clampado a 100', () => {
      const a = withManualProgress('a', 70)
      const b: NodeDef = makeNode({
        id: 'b',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const c: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
      })
      const tree = makeTree([a.def, b, c])
      const { manager } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('a')).toBe(70)
      expect(manager.getProgress('b')).toBe(70)
      expect(manager.getProgress('c')).toBe(100)
    })

    it('composición avg sobre dependencias computed (deriva en cadea)', () => {
      // A=40 manual, B=avg([A])=40, C=avg([A,B])=40.
      const a = withManualProgress('a', 40)
      const b: NodeDef = makeNode({
        id: 'b',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'avg' },
      })
      const c: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'avg' },
      })
      const tree = makeTree([a.def, b, c])
      const { manager } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('c')).toBe(40)
    })
  })

  // ── Detección de ciclos (§5.4) ──

  describe('detección de ciclos (§5.4)', () => {
    it('ciclo simple A↔B: ambos devolven 0 sen lanzar', () => {
      const a: NodeDef = makeNode({
        id: 'a',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['b'], formula: 'sum' },
      })
      const b: NodeDef = makeNode({
        id: 'b',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const tree = makeTree([a, b])
      const { manager } = buildManager(tree)

      expect(() => manager.getProgress('a')).not.toThrow()
      expect(() => manager.getProgress('b')).not.toThrow()
      expect(manager.getProgress('a')).toBe(0)
      expect(manager.getProgress('b')).toBe(0)
    })

    it('autorreferencia A=[A]: devolve 0 sen lanzar', () => {
      const a: NodeDef = makeNode({
        id: 'a',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const tree = makeTree([a])
      const { manager } = buildManager(tree)

      expect(() => manager.getProgress('a')).not.toThrow()
      expect(manager.getProgress('a')).toBe(0)
    })

    it('cadea A→B→C→A: todos devolven 0', () => {
      const a: NodeDef = makeNode({
        id: 'a',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['b'], formula: 'sum' },
      })
      const b: NodeDef = makeNode({
        id: 'b',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['c'], formula: 'sum' },
      })
      const c: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const tree = makeTree([a, b, c])
      const { manager } = buildManager(tree)

      expect(manager.getProgress('a')).toBe(0)
      expect(manager.getProgress('b')).toBe(0)
      expect(manager.getProgress('c')).toBe(0)
    })

    it('ciclo con rama manual lateral: a rama válida calcula correctamente, o ciclo dá 0', () => {
      // D = sum([A_manual=80, B_computed=[C_computed=[B]]])
      // A=80 (manual), B↔C ciclo (ambos 0), D = 80 + 0 = 80.
      const a = withManualProgress('a', 80)
      const b: NodeDef = makeNode({
        id: 'b',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['c'], formula: 'sum' },
      })
      const c: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['b'], formula: 'sum' },
      })
      const d: NodeDef = makeNode({
        id: 'd',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
      })
      const tree = makeTree([a.def, b, c, d])
      const { manager } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('d')).toBe(80)
    })

    it('chamadas consecutivas tras un ciclo non contaminan o Set entre chamadas distintas', () => {
      // Regresión: o `Set<string>` créase en cada chamada externa a
      // getProgress (new Set()) e libérase con try/finally. Verificamos
      // que un cálculo previo (que entrou en ciclo) non afecta a un
      // posterior independente.
      const a: NodeDef = makeNode({
        id: 'a',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const b = withManualProgress('b', 42)
      const tree = makeTree([a, b.def])
      const { manager } = buildManager(tree, makeState([b.instance]))

      // Primeiro pode entrar nun ciclo:
      expect(manager.getProgress('a')).toBe(0)
      // Inmediatamente despois, un cálculo limpo non se ve afectado:
      expect(manager.getProgress('b')).toBe(42)
      // E unha segunda chamada ao cíclico segue devolvendo 0 (non
      // peor, non mellor):
      expect(manager.getProgress('a')).toBe(0)
    })
  })

  // ── setProgress sobre computed rexéitase (§5.5) ──

  describe('setProgress sobre computed (§5.5)', () => {
    it('rexeita con INVALID_PROGRESS_OPERATION (YGG_E022)', () => {
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: [], formula: 'sum' },
      })
      const tree = makeTree([computed])
      const { manager } = buildManager(tree)

      const result = manager.setProgress('c', 50)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_OPERATION)
      expect(result.error.code).toBe('YGG_E022')
    })

    it('a orde de validación: computed precede a "manual check" e a "percent check"', () => {
      // Aínda que o percent é inválido (-1), o erro devolto é o de
      // computed (E022), non o de percent (E021). Documenta a orde
      // explícita das validacións.
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: [], formula: 'sum' },
      })
      const tree = makeTree([computed])
      const { manager } = buildManager(tree)

      const result = manager.setProgress('c', -1)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.code).toBe(ErrorCode.INVALID_PROGRESS_OPERATION)
    })
  })

  // ── getReachedMilestones sobre computed (§5.8) ──

  describe('getReachedMilestones sobre computed (§5.8)', () => {
    it('reutiliza getProgress (xa calculado dinámicamente) para filtrar milestones', () => {
      // Deps que dan 60 → milestones <= 60 son [25, 50].
      const a = withManualProgress('a', 30)
      const b = withManualProgress('b', 30)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
        progressMilestones: [25, 50, 75],
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getProgress('c')).toBe(60)
      expect(manager.getReachedMilestones('c')).toEqual([25, 50])
    })

    it('cambio dinámico: ao mudar un dep manual, o computed actualiza e milestones reflicten', () => {
      // Verifica derivación dinámica (cero cache): cando A muta de
      // 30 a 80, c=sum([a,b])=110→clamp 100, e milestones cruzados
      // muda en consecuencia.
      const a = withManualProgress('a', 30)
      const b = withManualProgress('b', 30)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a', 'b'], formula: 'sum' },
        progressMilestones: [25, 50, 75, 100],
      })
      const tree = makeTree([a.def, b.def, computed])
      const { manager } = buildManager(tree, makeState([a.instance, b.instance]))

      expect(manager.getReachedMilestones('c')).toEqual([25, 50])

      manager.setProgress('a', 80) // a sobe a 80; sum=110 → clamp 100
      expect(manager.getProgress('c')).toBe(100)
      expect(manager.getReachedMilestones('c')).toEqual([25, 50, 75, 100])
    })
  })

  // ── Contrato observable §5.6 (B1): nodos con fonte non soportada ──

  describe('§5.6 (B1): fontes non soportadas devolven 0 ignorando state', () => {
    it('progressSource remote con NodeInstance.progress=50 → getProgress devolve 0', () => {
      // Decisión B1 do arquitecto: aínda que o state teña gravado
      // progress=50 (por deserialización dun estado antigo, test, ou
      // erro), `getProgress` ignórao se a fonte non é manual nin
      // computed. Coherencia semántica: "se non sabemos de onde vén
      // o progress, devolvemos 0 sen lanzar".
      const remote: NodeDef = makeNode({
        id: 'r',
        supportsProgress: true,
        progressSource: { type: 'remote', endpoint: 'https://example.com/api' },
      })
      const tree = makeTree([remote])
      const { manager } = buildManager(
        tree,
        makeState([{ id: 'r', state: 'locked', currentTier: 0, progress: 50 }]),
      )

      expect(manager.getProgress('r')).toBe(0)
    })

    it('progressSource callback con NodeInstance.progress=88 → getProgress devolve 0', () => {
      const callback: NodeDef = makeNode({
        id: 'cb',
        supportsProgress: true,
        progressSource: { type: 'callback', handlerId: 'h1' },
      })
      const tree = makeTree([callback])
      const { manager } = buildManager(
        tree,
        makeState([{ id: 'cb', state: 'locked', currentTier: 0, progress: 88 }]),
      )

      expect(manager.getProgress('cb')).toBe(0)
    })

    it('progressSource event con NodeInstance.progress=99 → getProgress devolve 0', () => {
      const event: NodeDef = makeNode({
        id: 'ev',
        supportsProgress: true,
        progressSource: { type: 'event', eventName: 'lesson_done' },
      })
      const tree = makeTree([event])
      const { manager } = buildManager(
        tree,
        makeState([{ id: 'ev', state: 'locked', currentTier: 0, progress: 99 }]),
      )

      expect(manager.getProgress('ev')).toBe(0)
    })

    it('progressSource ausente (undefined) con NodeInstance.progress=42 → getProgress devolve 0', () => {
      // supportsProgress: true pero sen `progressSource` declarada.
      // Tras 2.4.c devolve 0 (decisión B1). Antes de 2.4.c devolvía 42.
      const orphan: NodeDef = makeNode({ id: 'o', supportsProgress: true })
      const tree = makeTree([orphan])
      const { manager } = buildManager(
        tree,
        makeState([{ id: 'o', state: 'locked', currentTier: 0, progress: 42 }]),
      )

      expect(manager.getProgress('o')).toBe(0)
    })

    it('nodo sen supportsProgress con progressSource: manual e NodeInstance.progress=33 → devolve 33', () => {
      // Confirmación negativa: a comprobación de §5.6 NON afecta a
      // nodos con tipo 'manual' aínda que `supportsProgress` non sexa
      // true. (supportsProgress só afecta a setProgress, non a
      // getProgress.) Esto documenta que a lóxica de getProgress
      // mira só `progressSource.type`, non `supportsProgress`.
      const n: NodeDef = makeNode({ id: 'n', progressSource: MANUAL })
      const tree = makeTree([n])
      const { manager } = buildManager(
        tree,
        makeState([{ id: 'n', state: 'locked', currentTier: 0, progress: 33 }]),
      )

      expect(manager.getProgress('n')).toBe(33)
    })
  })

  // ── Cero auto-unlock para computed (2.4 §5.7 mantida) ──

  describe('cero auto-unlock para computed (decisión 2.4 §5.7 mantida)', () => {
    it('computed alcanza 100 → NodeInstance.state non muta', () => {
      const a = withManualProgress('a', 100)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const tree = makeTree([a.def, computed])
      const { manager, store } = buildManager(tree, makeState([a.instance]))

      expect(manager.getProgress('c')).toBe(100)

      // O computed nin sequera ten NodeInstance no store (cero
      // persistencia §5.1). Se chegara a ter unha (creada por outras
      // vías), o seu state non se tocaría.
      const computedInstance = store.getState().nodes.c
      expect(computedInstance).toBeUndefined()
    })
  })

  // ── Cero persistencia: NodeInstance.progress non se escribe para computed (§5.1) ──

  describe('cero persistencia para computed (§5.1)', () => {
    it('tras chamar getProgress varias veces, NodeInstance.progress segue undefined', () => {
      const a = withManualProgress('a', 50)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'avg' },
      })
      const tree = makeTree([a.def, computed])
      const { manager, store } = buildManager(tree, makeState([a.instance]))

      // Varias chamadas (a cache non existe; cada chamada recalcula):
      expect(manager.getProgress('c')).toBe(50)
      expect(manager.getProgress('c')).toBe(50)
      expect(manager.getProgress('c')).toBe(50)

      // O store NON ten instancia para `c` (nunca se persistiu).
      const stateC = store.getState().nodes.c
      expect(stateC).toBeUndefined()
    })

    it('cero evento progressChange para computed (briefing 2.4.c §5.10)', () => {
      // Aínda que un dep manual mude (e iso si emite progressChange
      // para o dep), o computed non emite nada propio. O consumidor
      // re-consulta manualmente.
      const a = withManualProgress('a', 30)
      const computed: NodeDef = makeNode({
        id: 'c',
        supportsProgress: true,
        progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
      })
      const tree = makeTree([a.def, computed])
      const { manager, events } = buildManager(tree, makeState([a.instance]))

      const log: Array<{ nodeId: string; percent: number }> = []
      events.on('progressChange', (nodeId, percent) => {
        log.push({ nodeId, percent })
      })

      manager.setProgress('a', 70)

      // Só un evento, e SÓ para o dep manual `a`. Cero eventos para `c`.
      expect(log).toEqual([{ nodeId: 'a', percent: 70 }])
      // Pero o computed reflicte o cambio cando se consulta:
      expect(manager.getProgress('c')).toBe(70)
    })
  })
})

// ── FIN: tests de ProgressManager ──
