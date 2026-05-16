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

Supports all 15 atomic conditions (node_unlocked, resource_min, tier_min,
distance_max, tag_count, progress_min, subtree_completion, stat_min,
time_after, time_before, custom, etc.) and all/any/none combinators.
