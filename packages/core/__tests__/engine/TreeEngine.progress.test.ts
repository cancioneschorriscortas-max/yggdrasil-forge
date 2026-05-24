// ── INICIO: tests de integración Progress en TreeEngine (sub-fase 2.4.b) ──
// Verifica que TreeEngine expón os 3 métodos delegantes
// (setProgress / getProgress / getReachedMilestones) e que estes
// delegan correctamente no ProgressManager interno. As decisións
// críticas (cero auto-unlock, cero mutación de state, respec
// conserva progress, computed segue PROGRESS_SOURCE_UNSUPPORTED)
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

  it('progressSource computed segue rexeitándose nesta sub-fase (asignado a 2.4.c)', () => {
    // §5.1: computed seguirá PROGRESS_SOURCE_UNSUPPORTED ata 2.4.c.
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
    expect(result.error.code).toBe(ErrorCode.PROGRESS_SOURCE_UNSUPPORTED)
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

// ── FIN: tests de integración Progress en TreeEngine ──
