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

## Documentation

See the [master architecture document](../../docs/architecture/MASTER.md).

## License

MIT
