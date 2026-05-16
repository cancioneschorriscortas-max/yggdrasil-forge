import { isYggdrasilError } from '@yggdrasil-forge/common'
// -- INICIO: tests de ResourceManager --
import { describe, expect, it } from 'vitest'
import { ResourceManager } from '../../src/engine/index.js'
import type { Budget, NodeDef, Resource } from '../../src/types/index.js'

function budgetOf(resources: Record<string, number>): Budget {
  return { resources }
}

function node(overrides: Partial<NodeDef>): NodeDef {
  return {
    id: 'n',
    type: 'small',
    label: 'N',
    ...overrides,
  }
}

describe('ResourceManager', () => {
  describe('canAfford', () => {
    it('returns true when budget covers the cost', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([{ resourceId: 'xp', amount: 30 }], budgetOf({ xp: 100 }))).toBe(true)
    })

    it('returns true for exact amount', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([{ resourceId: 'xp', amount: 100 }], budgetOf({ xp: 100 }))).toBe(true)
    })

    it('returns false when insufficient', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([{ resourceId: 'xp', amount: 150 }], budgetOf({ xp: 100 }))).toBe(false)
    })

    it('returns false when resource missing from budget', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([{ resourceId: 'gold', amount: 1 }], budgetOf({ xp: 100 }))).toBe(false)
    })

    it('returns true for zero cost', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([{ resourceId: 'xp', amount: 0 }], budgetOf({}))).toBe(true)
    })

    it('returns true for empty cost list', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([], budgetOf({}))).toBe(true)
    })

    it('aggregates multiple costs of the same resource', () => {
      const rm = new ResourceManager()
      expect(
        rm.canAfford(
          [
            { resourceId: 'xp', amount: 60 },
            { resourceId: 'xp', amount: 50 },
          ],
          budgetOf({ xp: 100 }),
        ),
      ).toBe(false)
      expect(
        rm.canAfford(
          [
            { resourceId: 'xp', amount: 60 },
            { resourceId: 'xp', amount: 40 },
          ],
          budgetOf({ xp: 100 }),
        ),
      ).toBe(true)
    })

    it('returns false when any cost is negative', () => {
      const rm = new ResourceManager()
      expect(rm.canAfford([{ resourceId: 'xp', amount: -10 }], budgetOf({ xp: 100 }))).toBe(false)
    })

    it('handles multiple resources', () => {
      const rm = new ResourceManager()
      expect(
        rm.canAfford(
          [
            { resourceId: 'xp', amount: 50 },
            { resourceId: 'gold', amount: 10 },
          ],
          budgetOf({ xp: 100, gold: 5 }),
        ),
      ).toBe(false)
    })
  })

  describe('applyCost', () => {
    it('subtracts the cost and returns new budget', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: 30 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.resources.xp).toBe(70)
      }
    })

    it('does not mutate the original budget', () => {
      const rm = new ResourceManager()
      const original = budgetOf({ xp: 100 })
      rm.applyCost([{ resourceId: 'xp', amount: 30 }], original)
      expect(original.resources.xp).toBe(100)
    })

    it('errors with INSUFFICIENT_RESOURCES when cannot pay', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: 150 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(isYggdrasilError(result.error)).toBe(true)
      }
    })

    it('errors with INVALID_COST for negative amounts', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: -5 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(false)
    })

    it('is atomic: nothing applied if any cost fails', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost(
        [
          { resourceId: 'xp', amount: 50 },
          { resourceId: 'gold', amount: 999 },
        ],
        budgetOf({ xp: 100, gold: 10 }),
      )
      expect(result.ok).toBe(false)
    })

    it('handles multiple resources atomically on success', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost(
        [
          { resourceId: 'xp', amount: 50 },
          { resourceId: 'gold', amount: 5 },
        ],
        budgetOf({ xp: 100, gold: 10 }),
      )
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.resources.xp).toBe(50)
        expect(result.value.resources.gold).toBe(5)
      }
    })

    it('zero cost succeeds without change', () => {
      const rm = new ResourceManager()
      const result = rm.applyCost([{ resourceId: 'xp', amount: 0 }], budgetOf({ xp: 100 }))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.resources.xp).toBe(100)
      }
    })
  })

  describe('refund', () => {
    const resources: Resource[] = [
      { id: 'xp', label: 'XP', refundable: true, refundPercent: 100 },
      { id: 'sp', label: 'SP', refundable: true, refundPercent: 50 },
      { id: 'gold', label: 'Gold', refundable: false },
      { id: 'capped', label: 'Capped', refundable: true, max: 120 },
    ]

    it('refunds 100% for fully refundable resource', () => {
      const rm = new ResourceManager(resources)
      const result = rm.refund([{ resourceId: 'xp', amount: 50 }], budgetOf({ xp: 10 }))
      expect(result.resources.xp).toBe(60)
    })

    it('refunds partial percent', () => {
      const rm = new ResourceManager(resources)
      const result = rm.refund([{ resourceId: 'sp', amount: 10 }], budgetOf({ sp: 0 }))
      expect(result.resources.sp).toBe(5)
    })

    it('does not refund non-refundable resources', () => {
      const rm = new ResourceManager(resources)
      const result = rm.refund([{ resourceId: 'gold', amount: 100 }], budgetOf({ gold: 20 }))
      expect(result.resources.gold).toBe(20)
    })

    it('respects max cap when refunding', () => {
      const rm = new ResourceManager(resources)
      const result = rm.refund([{ resourceId: 'capped', amount: 100 }], budgetOf({ capped: 100 }))
      expect(result.resources.capped).toBe(120)
    })

    it('ignores unknown resources', () => {
      const rm = new ResourceManager(resources)
      const result = rm.refund([{ resourceId: 'mystery', amount: 50 }], budgetOf({ xp: 10 }))
      expect(result.resources.mystery).toBeUndefined()
      expect(result.resources.xp).toBe(10)
    })

    it('ignores zero or negative refund amounts', () => {
      const rm = new ResourceManager(resources)
      const result = rm.refund(
        [
          { resourceId: 'xp', amount: 0 },
          { resourceId: 'xp', amount: -10 },
        ],
        budgetOf({ xp: 10 }),
      )
      expect(result.resources.xp).toBe(10)
    })

    it('does not mutate the original budget', () => {
      const rm = new ResourceManager(resources)
      const original = budgetOf({ xp: 10 })
      rm.refund([{ resourceId: 'xp', amount: 50 }], original)
      expect(original.resources.xp).toBe(10)
    })

    it('uses default 100% when refundPercent unset', () => {
      const rm = new ResourceManager([{ id: 'def', label: 'Def', refundable: true }])
      const result = rm.refund([{ resourceId: 'def', amount: 40 }], budgetOf({ def: 0 }))
      expect(result.resources.def).toBe(40)
    })
  })

  describe('getCostForTier', () => {
    it('returns [] for tier <= 0', () => {
      const rm = new ResourceManager()
      expect(rm.getCostForTier(node({}), 0)).toEqual([])
      expect(rm.getCostForTier(node({}), -1)).toEqual([])
    })

    it('returns costPerTier entry when present', () => {
      const rm = new ResourceManager()
      const def = node({
        costPerTier: [[{ resourceId: 'xp', amount: 10 }], [{ resourceId: 'xp', amount: 20 }]],
      })
      expect(rm.getCostForTier(def, 1)).toEqual([{ resourceId: 'xp', amount: 10 }])
      expect(rm.getCostForTier(def, 2)).toEqual([{ resourceId: 'xp', amount: 20 }])
    })

    it('falls back to flat cost when costPerTier has no entry', () => {
      const rm = new ResourceManager()
      const def = node({
        cost: [{ resourceId: 'xp', amount: 5 }],
        costPerTier: [[{ resourceId: 'xp', amount: 10 }]],
      })
      expect(rm.getCostForTier(def, 2)).toEqual([{ resourceId: 'xp', amount: 5 }])
    })

    it('falls back to flat cost when no costPerTier', () => {
      const rm = new ResourceManager()
      const def = node({ cost: [{ resourceId: 'xp', amount: 7 }] })
      expect(rm.getCostForTier(def, 1)).toEqual([{ resourceId: 'xp', amount: 7 }])
    })

    it('returns [] when neither cost nor costPerTier', () => {
      const rm = new ResourceManager()
      expect(rm.getCostForTier(node({}), 1)).toEqual([])
    })
  })

  describe('getTotalCost', () => {
    it('returns [] when fromTier >= toTier', () => {
      const rm = new ResourceManager()
      const def = node({ cost: [{ resourceId: 'xp', amount: 10 }] })
      expect(rm.getTotalCost(def, 3, 3)).toEqual([])
      expect(rm.getTotalCost(def, 5, 2)).toEqual([])
    })

    it('sums flat cost across tiers', () => {
      const rm = new ResourceManager()
      const def = node({ cost: [{ resourceId: 'xp', amount: 10 }] })
      expect(rm.getTotalCost(def, 0, 3)).toEqual([{ resourceId: 'xp', amount: 30 }])
    })

    it('sums costPerTier correctly', () => {
      const rm = new ResourceManager()
      const def = node({
        costPerTier: [
          [{ resourceId: 'xp', amount: 10 }],
          [{ resourceId: 'xp', amount: 20 }],
          [{ resourceId: 'xp', amount: 30 }],
        ],
      })
      expect(rm.getTotalCost(def, 0, 3)).toEqual([{ resourceId: 'xp', amount: 60 }])
      expect(rm.getTotalCost(def, 1, 3)).toEqual([{ resourceId: 'xp', amount: 50 }])
    })

    it('accumulates multiple resources', () => {
      const rm = new ResourceManager()
      const def = node({
        costPerTier: [
          [
            { resourceId: 'xp', amount: 10 },
            { resourceId: 'gold', amount: 1 },
          ],
          [
            { resourceId: 'xp', amount: 20 },
            { resourceId: 'gold', amount: 2 },
          ],
        ],
      })
      const total = rm.getTotalCost(def, 0, 2)
      const xp = total.find((c) => c.resourceId === 'xp')
      const gold = total.find((c) => c.resourceId === 'gold')
      expect(xp?.amount).toBe(30)
      expect(gold?.amount).toBe(3)
    })
  })
})
// -- FIN: tests de ResourceManager --
