// ── INICIO: tests de TreeEngine.respec extended (8.3 REVISED) ──
// Cubre SÓ funcionalidade nova: array nodeIds + costPercent + validación.
// Cero solapa con tests existentes (que cobren respec sen opts).
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { NodeDef, TreeDef } from '../../src/types/index.js'

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

function makeCostTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [
      makeNode('a', { cost: [{ resourceId: 'xp', amount: 10 }] }),
      makeNode('b', { cost: [{ resourceId: 'xp', amount: 20 }] }),
      makeNode('c', { cost: [{ resourceId: 'xp', amount: 5 }] }),
    ],
  })
}

describe('TreeEngine.respec extended (8.3 REVISED)', () => {
  // ── Array nodeIds ──

  it('respec(["a"]) (array 1 elemento) lockea "a" igual que respec("a")', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
    const result = await engine.respec(['a'])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toContain('a')
    }
    expect(engine.getNodeState('a')?.state).toBe('locked')
  })

  it('respec(["a", "b"]) (array múltiple) lockea ambos', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    await engine.unlock('b')
    const result = await engine.respec(['a', 'b'])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toContain('a')
      expect(result.value.nodeIds).toContain('b')
    }
    expect(engine.getNodeState('a')?.state).toBe('locked')
    expect(engine.getNodeState('b')?.state).toBe('locked')
  })

  it('respec([]) (array baleiro) → ok({nodeIds:[], refunded:[]})', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    const result = await engine.respec([])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toEqual([])
      expect(result.value.refunded).toEqual([])
    }
    // "a" segue unlocked:
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
  })

  it('respec(["xyz"]) con id non-unlocked → ok baleiro', async () => {
    const engine = new TreeEngine(makeCostTree())
    const result = await engine.respec(['xyz'])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toEqual([])
    }
  })

  it('respec(["a", "xyz"]) mix unlocked + non-unlocked → lockea só "a"', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    const result = await engine.respec(['a', 'xyz'])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.nodeIds).toContain('a')
      expect(result.value.nodeIds).not.toContain('xyz')
    }
  })

  // ── costPercent ──

  it('respec(undefined, { costPercent: 0 }) equivalente a respec(): full refund', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    const budgetBefore = engine.getBudget().resources.xp
    const result = await engine.respec(undefined, { costPercent: 0 })
    expect(result.ok).toBe(true)
    // Full refund: budget restaurado
    expect(engine.getBudget().resources.xp).toBe(budgetBefore + 10)
  })

  it('respec(undefined, { costPercent: 50 }) devolve 50% dos custos', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a') // cost 10
    const budgetAfterUnlock = engine.getBudget().resources.xp // 90
    const result = await engine.respec(undefined, { costPercent: 50 })
    expect(result.ok).toBe(true)
    // Refund = floor(10 * 0.5) = 5
    expect(engine.getBudget().resources.xp).toBe(budgetAfterUnlock + 5)
  })

  it('respec(undefined, { costPercent: 100 }) devolve 0 (full penalty)', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    const budgetAfterUnlock = engine.getBudget().resources.xp
    const result = await engine.respec(undefined, { costPercent: 100 })
    expect(result.ok).toBe(true)
    // Cero refund:
    expect(engine.getBudget().resources.xp).toBe(budgetAfterUnlock)
  })

  it('respec(["a"], { costPercent: 25 }) selectivo + penalty', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.unlock('a')
    await engine.unlock('b')
    const budgetAfterUnlocks = engine.getBudget().resources.xp // 100 - 10 - 20 = 70
    const result = await engine.respec(['a'], { costPercent: 25 })
    expect(result.ok).toBe(true)
    // Refund de "a": floor(10 * 0.75) = 7
    expect(engine.getBudget().resources.xp).toBe(budgetAfterUnlocks + 7)
    // "b" segue unlocked:
    expect(engine.getNodeState('b')?.state).toBe('unlocked')
  })

  // ── Validación costPercent ──

  it('respec(undefined, { costPercent: -1 }) → err(RESPEC_INVALID_COST_PERCENT)', async () => {
    const engine = new TreeEngine(makeCostTree())
    const result = await engine.respec(undefined, { costPercent: -1 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.RESPEC_INVALID_COST_PERCENT)
    }
  })

  it('respec(undefined, { costPercent: 101 }) → err', async () => {
    const engine = new TreeEngine(makeCostTree())
    const result = await engine.respec(undefined, { costPercent: 101 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.RESPEC_INVALID_COST_PERCENT)
    }
  })

  it('respec(undefined, { costPercent: NaN }) → err', async () => {
    const engine = new TreeEngine(makeCostTree())
    const result = await engine.respec(undefined, { costPercent: Number.NaN })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.RESPEC_INVALID_COST_PERCENT)
    }
  })
})
// ── FIN: tests de TreeEngine.respec extended (8.3 REVISED) ──
