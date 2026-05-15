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
