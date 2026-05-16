// ── INICIO: tests de UnlockResolver ──
import { describe, expect, it, vi } from 'vitest'
import {
  type DependencyGraphLike,
  UnlockResolver,
  type UnlockResolverContext,
} from '../../src/engine/index.js'
import type {
  ConditionEvaluator,
  NodeInstance,
  TreeDef,
  TreeState,
  UnlockCondition,
  UnlockRule,
} from '../../src/types/index.js'

// ── Helpers ──

function makeTree(nodes: TreeDef['nodes'] = []): TreeDef {
  return {
    id: 'test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes,
    edges: [],
    layout: { type: 'radial' },
  }
}

function makeState(
  nodes: Record<string, NodeInstance> = {},
  resources: Record<string, number> = {},
  computedStats: Record<string, number> = {},
): TreeState {
  return {
    nodes,
    budget: { resources },
    computedStats,
  }
}

function ctx(
  partial: Partial<UnlockResolverContext> & {
    treeDef?: TreeDef
    state?: TreeState
  },
): UnlockResolverContext {
  return {
    treeDef: partial.treeDef ?? makeTree(),
    state: partial.state ?? makeState(),
    ...partial,
  }
}

const resolver = new UnlockResolver()

// ── Tests por tipo de condición ──

describe('UnlockResolver — atomic conditions', () => {
  describe('node_unlocked', () => {
    it('returns true when node is unlocked', () => {
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state })),
      ).toBe(true)
    })

    it('returns true when node is maxed', () => {
      const state = makeState({
        a: { id: 'a', state: 'maxed', currentTier: 5 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state })),
      ).toBe(true)
    })

    it('returns false when node is locked', () => {
      const state = makeState({
        a: { id: 'a', state: 'locked', currentTier: 0 },
      })
      expect(
        resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state })),
      ).toBe(false)
    })

    it('returns false when node does not exist', () => {
      expect(resolver.evaluateCondition({ type: 'node_unlocked', nodeId: 'x' }, ctx({}))).toBe(
        false,
      )
    })
  })

  describe('node_maxed', () => {
    it('returns true only when maxed', () => {
      const state = makeState({
        a: { id: 'a', state: 'maxed', currentTier: 5 },
        b: { id: 'b', state: 'unlocked', currentTier: 2 },
      })
      expect(resolver.evaluateCondition({ type: 'node_maxed', nodeId: 'a' }, ctx({ state }))).toBe(
        true,
      )
      expect(resolver.evaluateCondition({ type: 'node_maxed', nodeId: 'b' }, ctx({ state }))).toBe(
        false,
      )
    })
  })

  describe('node_state', () => {
    it('matches exact state', () => {
      const state = makeState({
        a: { id: 'a', state: 'in_progress', currentTier: 0, progress: 50 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'node_state', nodeId: 'a', state: 'in_progress' },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'node_state', nodeId: 'a', state: 'unlocked' },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('returns false when node missing', () => {
      expect(
        resolver.evaluateCondition({ type: 'node_state', nodeId: 'x', state: 'locked' }, ctx({})),
      ).toBe(false)
    })
  })

  describe('nodes_count', () => {
    it('counts globally without scope', () => {
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
        c: { id: 'c', state: 'maxed', currentTier: 3 },
        d: { id: 'd', state: 'locked', currentTier: 0 },
      })
      expect(resolver.evaluateCondition({ type: 'nodes_count', count: 3 }, ctx({ state }))).toBe(
        true,
      )
      expect(resolver.evaluateCondition({ type: 'nodes_count', count: 4 }, ctx({ state }))).toBe(
        false,
      )
    })

    it('counts by group scope', () => {
      const tree = makeTree([
        { id: 'a', type: 'small', label: 'A', group: 'gA' },
        { id: 'b', type: 'small', label: 'B', group: 'gB' },
      ])
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'nodes_count', count: 1, scope: 'gA' },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'nodes_count', count: 2, scope: 'gA' },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(false)
    })

    it('counts by tag scope', () => {
      const tree = makeTree([
        { id: 'a', type: 'small', label: 'A', tags: ['social'] },
        { id: 'b', type: 'small', label: 'B', tags: ['social', 'combat'] },
        { id: 'c', type: 'small', label: 'C', tags: ['combat'] },
      ])
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
        c: { id: 'c', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'nodes_count', count: 2, scope: 'social' },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
    })
  })

  describe('resource_min', () => {
    it('returns true when resource >= amount', () => {
      const state = makeState({}, { xp: 100 })
      expect(
        resolver.evaluateCondition(
          { type: 'resource_min', resourceId: 'xp', amount: 100 },
          ctx({ state }),
        ),
      ).toBe(true)
    })

    it('returns false when below', () => {
      const state = makeState({}, { xp: 50 })
      expect(
        resolver.evaluateCondition(
          { type: 'resource_min', resourceId: 'xp', amount: 100 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing resource as 0', () => {
      expect(
        resolver.evaluateCondition({ type: 'resource_min', resourceId: 'xp', amount: 1 }, ctx({})),
      ).toBe(false)
    })
  })

  describe('tier_min', () => {
    it('compares currentTier', () => {
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 3 },
      })
      expect(
        resolver.evaluateCondition({ type: 'tier_min', nodeId: 'a', tier: 3 }, ctx({ state })),
      ).toBe(true)
      expect(
        resolver.evaluateCondition({ type: 'tier_min', nodeId: 'a', tier: 4 }, ctx({ state })),
      ).toBe(false)
    })

    it('treats missing node as tier 0', () => {
      expect(resolver.evaluateCondition({ type: 'tier_min', nodeId: 'x', tier: 1 }, ctx({}))).toBe(
        false,
      )
    })
  })

  describe('distance_max', () => {
    it('returns false when no dependencyGraph provided', () => {
      expect(
        resolver.evaluateCondition({ type: 'distance_max', fromNodeId: 'a', maxSteps: 3 }, ctx({})),
      ).toBe(false)
    })

    it('uses dependencyGraph when provided', () => {
      const graph: DependencyGraphLike = {
        distanceBetween: (from, to) => (from === 'a' && to === 'b' ? 2 : Number.POSITIVE_INFINITY),
      }
      const state = makeState({
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
          ctx({ state, dependencyGraph: graph }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'distance_max', fromNodeId: 'a', maxSteps: 1 },
          ctx({ state, dependencyGraph: graph }),
        ),
      ).toBe(false)
    })
  })

  describe('tag_count', () => {
    it('counts unlocked nodes with the given tag', () => {
      const tree = makeTree([
        { id: 'a', type: 'small', label: 'A', tags: ['t1'] },
        { id: 'b', type: 'small', label: 'B', tags: ['t1'] },
        { id: 'c', type: 'small', label: 'C', tags: ['t2'] },
      ])
      const state = makeState({
        a: { id: 'a', state: 'unlocked', currentTier: 1 },
        b: { id: 'b', state: 'unlocked', currentTier: 1 },
        c: { id: 'c', state: 'unlocked', currentTier: 1 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'tag_count', tag: 't1', count: 2 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'tag_count', tag: 't1', count: 3 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(false)
    })
  })

  describe('progress_min', () => {
    it('checks the node progress', () => {
      const state = makeState({
        a: { id: 'a', state: 'in_progress', currentTier: 0, progress: 75 },
      })
      expect(
        resolver.evaluateCondition(
          { type: 'progress_min', nodeId: 'a', percent: 50 },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'progress_min', nodeId: 'a', percent: 80 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing progress as 0', () => {
      expect(
        resolver.evaluateCondition({ type: 'progress_min', nodeId: 'x', percent: 1 }, ctx({})),
      ).toBe(false)
    })
  })

  describe('subtree_completion', () => {
    it('returns 0% when subtree state missing', () => {
      expect(
        resolver.evaluateCondition(
          { type: 'subtree_completion', subtreeId: 's1', percent: 1 },
          ctx({}),
        ),
      ).toBe(false)
    })

    it('calculates percentage of unlocked nodes', () => {
      const subtreeDef: TreeDef = makeTree([
        { id: 's1.a', type: 'small', label: 'A' },
        { id: 's1.b', type: 'small', label: 'B' },
        { id: 's1.c', type: 'small', label: 'C' },
        { id: 's1.d', type: 'small', label: 'D' },
      ])
      const tree = {
        ...makeTree(),
        subtrees: { s1: subtreeDef },
      }
      const state: TreeState = {
        nodes: {},
        budget: { resources: {} },
        subtreeStates: {
          s1: {
            nodes: {
              's1.a': { id: 's1.a', state: 'unlocked', currentTier: 1 },
              's1.b': { id: 's1.b', state: 'unlocked', currentTier: 1 },
              's1.c': { id: 's1.c', state: 'locked', currentTier: 0 },
              's1.d': { id: 's1.d', state: 'locked', currentTier: 0 },
            },
            budget: { resources: {} },
          },
        },
      }
      // 2/4 = 50%
      expect(
        resolver.evaluateCondition(
          { type: 'subtree_completion', subtreeId: 's1', percent: 50 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'subtree_completion', subtreeId: 's1', percent: 51 },
          ctx({ treeDef: tree, state }),
        ),
      ).toBe(false)
    })
  })

  describe('stat_min', () => {
    it('reads from computedStats', () => {
      const state = makeState({}, {}, { damage: 50 })
      expect(
        resolver.evaluateCondition(
          { type: 'stat_min', statId: 'damage', amount: 50 },
          ctx({ state }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'stat_min', statId: 'damage', amount: 51 },
          ctx({ state }),
        ),
      ).toBe(false)
    })

    it('treats missing stat as 0', () => {
      expect(
        resolver.evaluateCondition({ type: 'stat_min', statId: 'unknown', amount: 1 }, ctx({})),
      ).toBe(false)
    })
  })

  describe('time_after / time_before', () => {
    it('time_after evaluates against Date.now()', () => {
      const past = Date.now() - 10000
      const future = Date.now() + 10000
      expect(resolver.evaluateCondition({ type: 'time_after', timestamp: past }, ctx({}))).toBe(
        true,
      )
      expect(resolver.evaluateCondition({ type: 'time_after', timestamp: future }, ctx({}))).toBe(
        false,
      )
    })

    it('time_before evaluates against Date.now()', () => {
      const past = Date.now() - 10000
      const future = Date.now() + 10000
      expect(resolver.evaluateCondition({ type: 'time_before', timestamp: future }, ctx({}))).toBe(
        true,
      )
      expect(resolver.evaluateCondition({ type: 'time_before', timestamp: past }, ctx({}))).toBe(
        false,
      )
    })
  })

  describe('custom', () => {
    it('returns false when customEvaluators not provided', () => {
      expect(resolver.evaluateCondition({ type: 'custom', evaluator: 'x' }, ctx({}))).toBe(false)
    })

    it('returns false when evaluator not registered', () => {
      const evaluators = new Map<string, ConditionEvaluator>()
      expect(
        resolver.evaluateCondition(
          { type: 'custom', evaluator: 'missing' },
          ctx({ customEvaluators: evaluators }),
        ),
      ).toBe(false)
    })

    it('uses registered evaluator result', () => {
      const truthy = vi.fn(() => true)
      const falsy = vi.fn(() => false)
      const evaluators = new Map<string, ConditionEvaluator>([
        ['truthy', truthy],
        ['falsy', falsy],
      ])
      expect(
        resolver.evaluateCondition(
          { type: 'custom', evaluator: 'truthy' },
          ctx({ customEvaluators: evaluators }),
        ),
      ).toBe(true)
      expect(
        resolver.evaluateCondition(
          { type: 'custom', evaluator: 'falsy' },
          ctx({ customEvaluators: evaluators }),
        ),
      ).toBe(false)
      expect(truthy).toHaveBeenCalled()
      expect(falsy).toHaveBeenCalled()
    })
  })
})

describe('UnlockResolver — combinators', () => {
  const trueCond: UnlockCondition = { type: 'time_after', timestamp: 0 }
  const falseCond: UnlockCondition = {
    type: 'time_after',
    timestamp: Date.now() + 1_000_000,
  }

  describe('all', () => {
    it('returns true when empty', () => {
      const rule: UnlockRule = { type: 'all', conditions: [] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns true when all satisfied', () => {
      const rule: UnlockRule = { type: 'all', conditions: [trueCond, trueCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns false when any fails', () => {
      const rule: UnlockRule = { type: 'all', conditions: [trueCond, falseCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })
  })

  describe('any', () => {
    it('returns false when empty', () => {
      const rule: UnlockRule = { type: 'any', conditions: [] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })

    it('returns true when at least one satisfied', () => {
      const rule: UnlockRule = { type: 'any', conditions: [falseCond, trueCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns false when none satisfied', () => {
      const rule: UnlockRule = { type: 'any', conditions: [falseCond, falseCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })
  })

  describe('none', () => {
    it('returns true when empty', () => {
      const rule: UnlockRule = { type: 'none', conditions: [] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns true when none satisfied', () => {
      const rule: UnlockRule = { type: 'none', conditions: [falseCond, falseCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(true)
    })

    it('returns false when any satisfied', () => {
      const rule: UnlockRule = { type: 'none', conditions: [falseCond, trueCond] }
      expect(resolver.evaluate(rule, ctx({}))).toBe(false)
    })
  })

  describe('atomic rule (no wrapper)', () => {
    it('evaluates a bare UnlockCondition', () => {
      expect(resolver.evaluate(trueCond, ctx({}))).toBe(true)
      expect(resolver.evaluate(falseCond, ctx({}))).toBe(false)
    })
  })
})

describe('UnlockResolver — explain()', () => {
  it('returns evaluation per condition with localized reason', () => {
    const state = makeState({}, { xp: 50 })
    const rule: UnlockRule = {
      type: 'all',
      conditions: [
        { type: 'resource_min', resourceId: 'xp', amount: 30 },
        { type: 'resource_min', resourceId: 'xp', amount: 100 },
      ],
    }
    const explanation = resolver.explain(rule, ctx({ state }))
    expect(explanation.satisfied).toBe(false)
    expect(explanation.conditions).toHaveLength(2)
    expect(explanation.conditions[0]?.satisfied).toBe(true)
    expect(explanation.conditions[1]?.satisfied).toBe(false)
    // Localized reason: por defecto LocalizedString como obxecto.
    expect(typeof explanation.conditions[0]?.reason).toBe('object')
  })

  it('returns satisfied=true for empty all', () => {
    const explanation = resolver.explain({ type: 'all', conditions: [] }, ctx({}))
    expect(explanation.satisfied).toBe(true)
    expect(explanation.conditions).toHaveLength(0)
  })

  it('returns satisfied=false for empty any', () => {
    const explanation = resolver.explain({ type: 'any', conditions: [] }, ctx({}))
    expect(explanation.satisfied).toBe(false)
  })

  it('returns satisfied=true for empty none', () => {
    const explanation = resolver.explain({ type: 'none', conditions: [] }, ctx({}))
    expect(explanation.satisfied).toBe(true)
  })

  it('explains an atomic rule', () => {
    const state = makeState({}, { xp: 100 })
    const explanation = resolver.explain(
      { type: 'resource_min', resourceId: 'xp', amount: 50 },
      ctx({ state }),
    )
    expect(explanation.satisfied).toBe(true)
    expect(explanation.conditions).toHaveLength(1)
  })

  it('explains distance_max with no graph', () => {
    const explanation = resolver.explain(
      { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
      ctx({}),
    )
    expect(explanation.satisfied).toBe(false)
    expect(explanation.conditions[0]?.reason).toBeDefined()
  })

  it('explains custom missing evaluator', () => {
    const explanation = resolver.explain({ type: 'custom', evaluator: 'missing' }, ctx({}))
    expect(explanation.satisfied).toBe(false)
  })

  it('explains custom with registered evaluator (true)', () => {
    const evaluators = new Map<string, ConditionEvaluator>([['ok', () => true]])
    const explanation = resolver.explain(
      { type: 'custom', evaluator: 'ok' },
      ctx({ customEvaluators: evaluators }),
    )
    expect(explanation.satisfied).toBe(true)
    expect(typeof explanation.conditions[0]?.reason).toBe('object')
  })

  it('explains custom with registered evaluator (false)', () => {
    const evaluators = new Map<string, ConditionEvaluator>([['no', () => false]])
    const explanation = resolver.explain(
      { type: 'custom', evaluator: 'no' },
      ctx({ customEvaluators: evaluators }),
    )
    expect(explanation.satisfied).toBe(false)
  })

  it('explains node_unlocked satisfied and not satisfied', () => {
    const stateYes = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 1 } })
    const stateNo = makeState({ a: { id: 'a', state: 'locked', currentTier: 0 } })
    expect(
      resolver.explain({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state: stateYes })).satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'node_unlocked', nodeId: 'a' }, ctx({ state: stateNo })).satisfied,
    ).toBe(false)
  })

  it('explains node_maxed satisfied and not satisfied', () => {
    const stateYes = makeState({ a: { id: 'a', state: 'maxed', currentTier: 5 } })
    const stateNo = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 2 } })
    expect(
      resolver.explain({ type: 'node_maxed', nodeId: 'a' }, ctx({ state: stateYes })).satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'node_maxed', nodeId: 'a' }, ctx({ state: stateNo })).satisfied,
    ).toBe(false)
  })

  it('explains node_state satisfied and not satisfied', () => {
    const state = makeState({ a: { id: 'a', state: 'in_progress', currentTier: 0, progress: 10 } })
    expect(
      resolver.explain({ type: 'node_state', nodeId: 'a', state: 'in_progress' }, ctx({ state }))
        .satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'node_state', nodeId: 'a', state: 'unlocked' }, ctx({ state }))
        .satisfied,
    ).toBe(false)
  })

  it('explains nodes_count satisfied and not satisfied (with and without scope)', () => {
    const state = makeState({
      a: { id: 'a', state: 'unlocked', currentTier: 1 },
      b: { id: 'b', state: 'unlocked', currentTier: 1 },
    })
    expect(resolver.explain({ type: 'nodes_count', count: 2 }, ctx({ state })).satisfied).toBe(true)
    expect(resolver.explain({ type: 'nodes_count', count: 3 }, ctx({ state })).satisfied).toBe(
      false,
    )
    // Con scope
    const tree = makeTree([
      { id: 'a', type: 'small', label: 'A', group: 'g1' },
      { id: 'b', type: 'small', label: 'B', group: 'g2' },
    ])
    expect(
      resolver.explain(
        { type: 'nodes_count', count: 1, scope: 'g1' },
        ctx({ treeDef: tree, state }),
      ).satisfied,
    ).toBe(true)
    expect(
      resolver.explain(
        { type: 'nodes_count', count: 2, scope: 'g1' },
        ctx({ treeDef: tree, state }),
      ).satisfied,
    ).toBe(false)
  })

  it('explains tier_min satisfied and not satisfied', () => {
    const state = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 3 } })
    expect(
      resolver.explain({ type: 'tier_min', nodeId: 'a', tier: 2 }, ctx({ state })).satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'tier_min', nodeId: 'a', tier: 5 }, ctx({ state })).satisfied,
    ).toBe(false)
  })

  it('explains distance_max satisfied with graph', () => {
    const graph: DependencyGraphLike = {
      distanceBetween: (from, to) => (from === 'a' && to === 'b' ? 1 : Number.POSITIVE_INFINITY),
    }
    const state = makeState({ b: { id: 'b', state: 'unlocked', currentTier: 1 } })
    const explanation = resolver.explain(
      { type: 'distance_max', fromNodeId: 'a', maxSteps: 3 },
      ctx({ state, dependencyGraph: graph }),
    )
    expect(explanation.satisfied).toBe(true)
    expect(typeof explanation.conditions[0]?.reason).toBe('object')
  })

  it('explains distance_max not satisfied with graph', () => {
    const graph: DependencyGraphLike = {
      distanceBetween: () => Number.POSITIVE_INFINITY,
    }
    const state = makeState({ b: { id: 'b', state: 'unlocked', currentTier: 1 } })
    const explanation = resolver.explain(
      { type: 'distance_max', fromNodeId: 'a', maxSteps: 1 },
      ctx({ state, dependencyGraph: graph }),
    )
    expect(explanation.satisfied).toBe(false)
  })

  it('explains tag_count satisfied and not satisfied', () => {
    const tree = makeTree([
      { id: 'a', type: 'small', label: 'A', tags: ['t1'] },
      { id: 'b', type: 'small', label: 'B', tags: ['t1'] },
    ])
    const state = makeState({
      a: { id: 'a', state: 'unlocked', currentTier: 1 },
      b: { id: 'b', state: 'unlocked', currentTier: 1 },
    })
    expect(
      resolver.explain({ type: 'tag_count', tag: 't1', count: 2 }, ctx({ treeDef: tree, state }))
        .satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'tag_count', tag: 't1', count: 3 }, ctx({ treeDef: tree, state }))
        .satisfied,
    ).toBe(false)
  })

  it('explains progress_min satisfied and not satisfied', () => {
    const state = makeState({ a: { id: 'a', state: 'in_progress', currentTier: 0, progress: 60 } })
    expect(
      resolver.explain({ type: 'progress_min', nodeId: 'a', percent: 50 }, ctx({ state }))
        .satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'progress_min', nodeId: 'a', percent: 80 }, ctx({ state }))
        .satisfied,
    ).toBe(false)
  })

  it('explains subtree_completion satisfied and not satisfied', () => {
    const subtreeDef: TreeDef = makeTree([
      { id: 's1.a', type: 'small', label: 'A' },
      { id: 's1.b', type: 'small', label: 'B' },
    ])
    const tree = { ...makeTree(), subtrees: { s1: subtreeDef } }
    const state: TreeState = {
      nodes: {},
      budget: { resources: {} },
      subtreeStates: {
        s1: {
          nodes: {
            's1.a': { id: 's1.a', state: 'unlocked', currentTier: 1 },
            's1.b': { id: 's1.b', state: 'locked', currentTier: 0 },
          },
          budget: { resources: {} },
        },
      },
    }
    // 1/2 = 50%
    expect(
      resolver.explain(
        { type: 'subtree_completion', subtreeId: 's1', percent: 50 },
        ctx({ treeDef: tree, state }),
      ).satisfied,
    ).toBe(true)
    expect(
      resolver.explain(
        { type: 'subtree_completion', subtreeId: 's1', percent: 51 },
        ctx({ treeDef: tree, state }),
      ).satisfied,
    ).toBe(false)
  })

  it('explains stat_min satisfied and not satisfied', () => {
    const state = makeState({}, {}, { str: 10 })
    expect(
      resolver.explain({ type: 'stat_min', statId: 'str', amount: 10 }, ctx({ state })).satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'stat_min', statId: 'str', amount: 11 }, ctx({ state })).satisfied,
    ).toBe(false)
  })

  it('explains time_after satisfied and not satisfied', () => {
    expect(
      resolver.explain({ type: 'time_after', timestamp: Date.now() - 10000 }, ctx({})).satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'time_after', timestamp: Date.now() + 10000 }, ctx({})).satisfied,
    ).toBe(false)
  })

  it('explains time_before satisfied and not satisfied', () => {
    expect(
      resolver.explain({ type: 'time_before', timestamp: Date.now() + 10000 }, ctx({})).satisfied,
    ).toBe(true)
    expect(
      resolver.explain({ type: 'time_before', timestamp: Date.now() - 10000 }, ctx({})).satisfied,
    ).toBe(false)
  })

  it('explains custom: evaluators map exists but evaluator missing', () => {
    const evaluators = new Map<string, ConditionEvaluator>()
    const explanation = resolver.explain(
      { type: 'custom', evaluator: 'nothere' },
      ctx({ customEvaluators: evaluators }),
    )
    expect(explanation.satisfied).toBe(false)
    expect(typeof explanation.conditions[0]?.reason).toBe('object')
  })

  it('explains any combinator (satisfied path)', () => {
    const rule: UnlockRule = {
      type: 'any',
      conditions: [
        { type: 'time_after', timestamp: Date.now() + 1_000_000 },
        { type: 'time_after', timestamp: 0 },
      ],
    }
    const explanation = resolver.explain(rule, ctx({}))
    expect(explanation.satisfied).toBe(true)
    expect(explanation.conditions).toHaveLength(2)
  })

  it('explains any combinator (not satisfied path)', () => {
    const rule: UnlockRule = {
      type: 'any',
      conditions: [
        { type: 'time_after', timestamp: Date.now() + 1_000_000 },
        { type: 'time_after', timestamp: Date.now() + 2_000_000 },
      ],
    }
    expect(resolver.explain(rule, ctx({})).satisfied).toBe(false)
  })

  it('explains none combinator with non-empty conditions', () => {
    const ruleOk: UnlockRule = {
      type: 'none',
      conditions: [{ type: 'time_after', timestamp: Date.now() + 1_000_000 }],
    }
    expect(resolver.explain(ruleOk, ctx({})).satisfied).toBe(true)

    const ruleFail: UnlockRule = {
      type: 'none',
      conditions: [{ type: 'time_after', timestamp: 0 }],
    }
    expect(resolver.explain(ruleFail, ctx({})).satisfied).toBe(false)
  })

  it('explains node_state when instance is missing (defaults to locked)', () => {
    const explanation = resolver.explain(
      { type: 'node_state', nodeId: 'ghost', state: 'unlocked' },
      ctx({}),
    )
    expect(explanation.satisfied).toBe(false)
    expect(typeof explanation.conditions[0]?.reason).toBe('object')
  })
})

describe('UnlockResolver — edge cases for full coverage', () => {
  it('countUnlockedNodes: node in state but not in treeDef (scope)', () => {
    // nodo 'a' está unlocked pero non existe no treeDef → non conta para o scope
    const tree = makeTree([]) // treeDef baleiro
    const state = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 1 } })
    expect(
      resolver.evaluateCondition(
        { type: 'nodes_count', count: 1, scope: 'anygroup' },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(false)
  })

  it('countNodesWithTag: node in state but not in treeDef', () => {
    const tree = makeTree([]) // treeDef baleiro
    const state = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 1 } })
    expect(
      resolver.evaluateCondition(
        { type: 'tag_count', tag: 't1', count: 1 },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(false)
  })

  it('countNodesWithTag: node with matching tag is counted', () => {
    const tree = makeTree([{ id: 'a', type: 'small', label: 'A', tags: ['t1'] }])
    const state = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 1 } })
    expect(
      resolver.evaluateCondition(
        { type: 'tag_count', tag: 't1', count: 1 },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(true)
  })

  it('countNodesWithTag: node in treeDef but without tags property', () => {
    // def existe pero sen tags → def?.tags é undefined → non conta
    const tree = makeTree([{ id: 'a', type: 'small', label: 'A' }])
    const state = makeState({ a: { id: 'a', state: 'unlocked', currentTier: 1 } })
    expect(
      resolver.evaluateCondition(
        { type: 'tag_count', tag: 't1', count: 1 },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(false)
  })

  it('countNodesWithTag: skips locked nodes', () => {
    // nodo locked con tag → non debe contar (cubre o continue)
    const tree = makeTree([
      { id: 'a', type: 'small', label: 'A', tags: ['t1'] },
      { id: 'b', type: 'small', label: 'B', tags: ['t1'] },
    ])
    const state = makeState({
      a: { id: 'a', state: 'locked', currentTier: 0 },
      b: { id: 'b', state: 'unlocked', currentTier: 1 },
    })
    expect(
      resolver.evaluateCondition(
        { type: 'tag_count', tag: 't1', count: 2 },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(false)
    expect(
      resolver.evaluateCondition(
        { type: 'tag_count', tag: 't1', count: 1 },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(true)
  })

  it('checkDistance: skips locked nodes', () => {
    const graph: DependencyGraphLike = {
      distanceBetween: () => 1,
    }
    // só nodos locked — ningún conta
    const state = makeState({
      a: { id: 'a', state: 'locked', currentTier: 0 },
    })
    expect(
      resolver.evaluateCondition(
        { type: 'distance_max', fromNodeId: 'x', maxSteps: 5 },
        ctx({ state, dependencyGraph: graph }),
      ),
    ).toBe(false)
  })

  it('getSubtreeCompletion: subtreeDef missing returns 0', () => {
    const tree = makeTree()
    const state: TreeState = {
      nodes: {},
      budget: { resources: {} },
      subtreeStates: {
        s1: {
          nodes: { 's1.a': { id: 's1.a', state: 'unlocked', currentTier: 1 } },
          budget: { resources: {} },
        },
      },
    }
    // subtreeStates ten 's1' pero treeDef non ten subtrees → retorna 0 → false
    expect(
      resolver.evaluateCondition(
        { type: 'subtree_completion', subtreeId: 's1', percent: 1 },
        ctx({ treeDef: tree, state }),
      ),
    ).toBe(false)
  })
})
