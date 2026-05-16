# @yggdrasil-forge/core

The core engine of Yggdrasil Forge — a comprehensive skill tree engine for the web.

## Status

🚧 **Early development.** Public API not yet stable.

Currently exports type definitions only. Engine classes (TreeEngine, UnlockResolver,
etc.) will be added in upcoming sub-phases.

## Installation

```bash
pnpm add @yggdrasil-forge/core
```

## What's available

### Result type

```typescript
import { ok, err, type Result } from '@yggdrasil-forge/core'
```

### Node and Tree types

```typescript
import type {
  NodeDef,
  NodeInstance,
  NodeType,
  NodeState,
  EdgeDef,
  TreeDef,
  TreeState,
} from '@yggdrasil-forge/core'
```

### Content types

```typescript
import type { RichContent, NodeContent } from '@yggdrasil-forge/core'
```

### Errors (re-exported from common)

```typescript
import {
  ErrorCode,
  YggdrasilError,
  getErrorMessage,
} from '@yggdrasil-forge/core'
```

### StateStore

```typescript
import { StateStore } from '@yggdrasil-forge/core'
```

### ChangeTracker

```typescript
import { ChangeTracker, analyzeChanges } from '@yggdrasil-forge/core'

const tracker = new ChangeTracker()
const analysis = tracker.analyze([
  { type: 'add_node', node: { id: 'a', type: 'small', label: 'A' } },
  { type: 'modify_node', nodeId: 'b', changes: { color: '#fff' } },
])

console.info(analysis.affectedNodes)       // Set { 'a', 'b' }
console.info(analysis.cachesToInvalidate)  // Set { 'layout', 'search', ... }
console.info(analysis.internalConflicts)   // []
console.info(analysis.renames)             // Map {}
```

## Documentation

See the [master architecture document](../../docs/architecture/MASTER.md).

## License

MIT

### UnlockResolver

```typescript
import { UnlockResolver } from '@yggdrasil-forge/core'

const resolver = new UnlockResolver()

const canUnlock = resolver.evaluate(
  {
    type: 'all',
    conditions: [
      { type: 'node_unlocked', nodeId: 'panadeiro_inicio' },
      { type: 'resource_min', resourceId: 'xp', amount: 100 },
    ],
  },
  { treeDef, state },
)

// Detailed explanation with localized reasons
const explanation = resolver.explain(rule, { treeDef, state, locale: 'gl' })
for (const e of explanation.conditions) {
  console.info(e.satisfied, e.reason)
}
```
import { DependencyGraph, CycleDetector } from '@yggdrasil-forge/core'

const graph = new DependencyGraph(
  ['a', 'b', 'c'],
  [
    { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
    { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
  ],
)

graph.getDependencies('c')    // ['b']
graph.getAllDependencies('c') // Set { 'b', 'a' }
graph.distanceBetween('a', 'c') // 2
graph.getShortestPath('a', 'c') // ['a', 'b', 'c']
graph.getRoots()              // ['a']

const detector = new CycleDetector(graph)
detector.hasCycle()           // false
detector.findCycles()         // []
detector.findCycleContaining('a') // null
Supports all 15 atomic conditions (node_unlocked, resource_min, tier_min,
distance_max, tag_count, progress_min, subtree_completion, stat_min,
time_after, time_before, custom, etc.) and all/any/none combinators.
### ResourceManager

```typescript
import { ResourceManager } from '@yggdrasil-forge/core'

const rm = new ResourceManager([
  { id: 'xp', label: 'XP', refundable: true, refundPercent: 50 },
])

const budget = { resources: { xp: 100 } }

rm.canAfford([{ resourceId: 'xp', amount: 30 }], budget) // true

const result = rm.applyCost([{ resourceId: 'xp', amount: 30 }], budget)
// result.ok === true, result.value.resources.xp === 70

const refunded = rm.refund([{ resourceId: 'xp', amount: 30 }], budget)
// refunded.resources.xp === 115  (50% of 30 = 15)

rm.getCostForTier(nodeDef, 2)         // cost of reaching tier 2
rm.getTotalCost(nodeDef, 0, 3)        // cumulative cost tiers 1..3
```
