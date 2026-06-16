# @yggdrasil-forge/storage

Storage backends for Yggdrasil Forge.

This package provides concrete implementations of the
`StorageAdapter` interface (defined in
[@yggdrasil-forge/common](../common)) for use with the core
`TreeEngine`, `SnapshotManager`, `LoadoutManager`, and
`TreeRegistry`.

## Installation

```bash
pnpm add @yggdrasil-forge/storage @yggdrasil-forge/common
```

## Available adapters

| Adapter | Use case |
|---------|----------|
| `MemoryStorage` | In-memory; ideal for tests and SSR. |
| `LocalStorageAdapter` | Browser `localStorage` (synchronous; ~5MB limit). |
| `SessionStorageAdapter` | Browser `sessionStorage` (per-tab). |
| `IndexedDBAdapter` | Browser IndexedDB (asynchronous; large data). |
| `FileSystemAdapter` | Node.js filesystem (server-side). |
| `ScopedStorage` | Wraps any adapter with a key prefix (multi-tenant). |

## Quick start

```typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'

const storage = new MemoryStorage()
const engine = new TreeEngine(treeDef, { storage })

await engine.snapshot('checkpoint-1')
```

## Adapter examples

### LocalStorageAdapter (browser)

```typescript
import { LocalStorageAdapter } from '@yggdrasil-forge/storage'

const storage = new LocalStorageAdapter({ prefix: 'myapp:' })
```

### IndexedDBAdapter (browser, async, large data)

```typescript
import { IndexedDBAdapter } from '@yggdrasil-forge/storage'

const storage = new IndexedDBAdapter({
  databaseName: 'myapp-trees',
  storeName: 'snapshots',
})
```

### FileSystemAdapter (Node.js)

```typescript
import { FileSystemAdapter } from '@yggdrasil-forge/storage'

const storage = new FileSystemAdapter({
  baseDirectory: './data/trees',
})
```

### ScopedStorage (multi-tenant)

```typescript
import {
  ScopedStorage,
  LocalStorageAdapter,
} from '@yggdrasil-forge/storage'

const base = new LocalStorageAdapter()
const tenant1 = new ScopedStorage(base, 'tenant-1:')
const tenant2 = new ScopedStorage(base, 'tenant-2:')
// tenant-1 and tenant-2 cannot read each other's data.
```

## Custom adapters

Implement the `StorageAdapter` interface (from
[@yggdrasil-forge/common](../common)):

```typescript
import type { StorageAdapter } from '@yggdrasil-forge/common'
import type { Result } from '@yggdrasil-forge/common'

export class MyAdapter implements StorageAdapter {
  async get(key: string): Promise<Result<unknown | null>> {
    // ...
  }

  async set(key: string, value: unknown): Promise<Result<void>> {
    // ...
  }

  async delete(key: string): Promise<Result<void>> {
    // ...
  }

  // ... other methods
}
```

## Notes

- The `StorageAdapter` interface lives in `@yggdrasil-forge/common`
  (moved there in sub-phase hardening-1 to avoid coupling `@core`
  to `@storage`).
- All adapters return `Result<T>` for explicit error handling.
- `MemoryStorage` is reset on process restart; use it for tests
  and SSR only.

## License

MIT
