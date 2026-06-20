// ── INICIO: tests TreeEngine.lockOneTier (Interactivo Capa A) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

/**
 * TreeDef cun nodo multi-tier (3 tiers, custo 1 por tier) para verificar
 * decrementos. Inclúe budget inicial dabondo para maxear.
 */
function makeMultiTierTree(): TreeDef {
  return {
    id: 'lock-one-tier-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Lock one tier',
    rootNodeId: 'sword',
    resources: [{ id: 'pts', label: 'Points', initial: 10, max: 10, refundable: true }],
    startingBudget: { resources: { pts: 10 } },
    layout: { type: 'custom' },
    nodes: [
      {
        id: 'sword',
        type: 'notable',
        maxTier: 3,
        label: 'Sword',
        position: { x: 0, y: 0 },
        cost: [{ resourceId: 'pts', amount: 1 }],
      },
    ],
    edges: [],
  }
}

describe('TreeEngine.lockOneTier', () => {
  describe('decrementos básicos', () => {
    it('maxed (3/3) → lockOneTier → tier 2/3, state=unlocked, refund 1 pt', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      await engine.unlock('sword') // 1
      await engine.unlock('sword') // 2
      await engine.unlock('sword') // 3 (maxed)
      expect(engine.getNodeState('sword')?.state).toBe('maxed')
      expect(engine.getNodeState('sword')?.currentTier).toBe(3)
      expect(engine.getBudget().resources.pts).toBe(7) // 10 - 3

      const result = await engine.lockOneTier('sword')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.nodeId).toBe('sword')
        expect(result.value.newState).toBe('unlocked')
        expect(result.value.refunded).toEqual([{ resourceId: 'pts', amount: 1 }])
      }
      expect(engine.getNodeState('sword')?.currentTier).toBe(2)
      expect(engine.getNodeState('sword')?.state).toBe('unlocked')
      expect(engine.getBudget().resources.pts).toBe(8) // 7 + 1
    })

    it('tier 1 → lockOneTier → tier 0, state=locked, refund 1 pt', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      await engine.unlock('sword')
      expect(engine.getNodeState('sword')?.currentTier).toBe(1)
      expect(engine.getBudget().resources.pts).toBe(9)

      const result = await engine.lockOneTier('sword')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.newState).toBe('locked')
      }
      expect(engine.getNodeState('sword')?.currentTier).toBe(0)
      expect(engine.getNodeState('sword')?.state).toBe('locked')
      expect(engine.getBudget().resources.pts).toBe(10) // restaurado
    })
  })

  describe('guards', () => {
    it('tier 0 / locked → err INVALID_NODE_STATE', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      // Nodo nunca desbloqueado.
      const result = await engine.lockOneTier('sword')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_NODE_STATE)
      }
    })

    it('nodo inexistente → err NODE_NOT_FOUND', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      const result = await engine.lockOneTier('ghost')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
      }
    })
  })

  describe('ciclo unlock×N → lockOneTier×N restaura budget', () => {
    it('3 unlock + 3 lockOneTier deixa budget restaurado e nodo en tier 0', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      const initial = engine.getBudget().resources.pts
      await engine.unlock('sword')
      await engine.unlock('sword')
      await engine.unlock('sword')
      await engine.lockOneTier('sword')
      await engine.lockOneTier('sword')
      await engine.lockOneTier('sword')

      expect(engine.getNodeState('sword')?.currentTier).toBe(0)
      expect(engine.getNodeState('sword')?.state).toBe('locked')
      expect(engine.getBudget().resources.pts).toBe(initial)
    })
  })

  describe('eventos emitidos', () => {
    it('emite stateChange + lock + budgetChange co payload correcto', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      await engine.unlock('sword')
      await engine.unlock('sword') // tier 2

      const stateChanges: Array<{ nodeId: string; from: string; to: string }> = []
      const lockEvents: string[] = []
      const budgetChanges: Array<{ resourceId: string; from: number; to: number }> = []

      engine.events.on('stateChange', (nodeId, change) => {
        stateChanges.push({ nodeId, from: change.from, to: change.to })
      })
      engine.events.on('lock', (nodeId) => {
        lockEvents.push(nodeId)
      })
      engine.events.on('budgetChange', (resourceId, from, to) => {
        budgetChanges.push({ resourceId, from, to })
      })

      await engine.lockOneTier('sword') // tier 2 → 1

      expect(stateChanges).toContainEqual({ nodeId: 'sword', from: 'unlocked', to: 'unlocked' })
      expect(lockEvents).toContain('sword')
      expect(budgetChanges).toContainEqual({ resourceId: 'pts', from: 8, to: 9 })
    })
  })

  describe('regresión: lock() segue resetando todo', () => {
    it('lock() resetea de tier 3 → 0 e refunde 3 (non afectado por lockOneTier)', async () => {
      const engine = new TreeEngine(makeMultiTierTree())
      await engine.unlock('sword')
      await engine.unlock('sword')
      await engine.unlock('sword')

      const result = await engine.lock('sword')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.refunded).toEqual([{ resourceId: 'pts', amount: 3 }])
      }
      expect(engine.getNodeState('sword')?.currentTier).toBe(0)
      expect(engine.getBudget().resources.pts).toBe(10)
    })
  })

  describe('integración con prereqs', () => {
    it('decrementar non re-bloquea dependentes (local, sen cascada)', async () => {
      // Tree: A (3 tiers) → B (require A maxed)
      const tree: TreeDef = {
        id: 'cascade-test',
        schemaVersion: '1.0.0',
        version: '0.0.0',
        label: 'Cascade',
        rootNodeId: 'a',
        resources: [{ id: 'pts', label: 'Points', initial: 10, max: 10, refundable: true }],
        startingBudget: { resources: { pts: 10 } },
        layout: { type: 'custom' },
        nodes: [
          {
            id: 'a',
            type: 'notable',
            maxTier: 3,
            label: 'A',
            position: { x: 0, y: 0 },
            cost: [{ resourceId: 'pts', amount: 1 }],
          },
          {
            id: 'b',
            type: 'notable',
            maxTier: 1,
            label: 'B',
            position: { x: 0, y: 100 },
            prerequisites: { type: 'node_maxed', nodeId: 'a' },
            cost: [{ resourceId: 'pts', amount: 1 }],
          },
        ],
        edges: [],
      }
      const engine = new TreeEngine(tree)
      await engine.unlock('a')
      await engine.unlock('a')
      await engine.unlock('a') // A maxed
      await engine.unlock('b') // B unlocked (require A maxed)
      expect(engine.getNodeState('b')?.state).toBe('maxed')

      // Decrementar A non debe re-bloquear B (local, briefing §5).
      await engine.lockOneTier('a')
      expect(engine.getNodeState('a')?.currentTier).toBe(2)
      expect(engine.getNodeState('a')?.state).toBe('unlocked')
      // B segue desbloqueado aínda que xa non se cumpra A maxed: prereqs
      // son portas no unlock, non invariantes continuos.
      expect(engine.getNodeState('b')?.state).toBe('maxed')
    })
  })
})
// ── FIN: tests lockOneTier ──
