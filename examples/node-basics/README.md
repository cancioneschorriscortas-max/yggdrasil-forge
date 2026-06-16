# Node.js basics example

A minimal Node.js example demonstrating the core APIs of Yggdrasil
Forge end-to-end.

## What it demonstrates

This example walks through 8 sequential steps covering the most
common operations:

1. Defining a `TreeDef` with 3 skills (a → b → c).
2. Creating a `TreeEngine` with in-memory storage.
3. Checking if a skill can be unlocked (`canUnlock`).
4. Unlocking the first skill in the chain.
5. Attempting to unlock a skill without its prerequisites (shows
   error handling via `Result`).
6. Unlocking the remaining skills in sequence.
7. Taking a snapshot of the current state.
8. Locking a skill, then restoring from snapshot.

## How to run

From the monorepo root:

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

## Expected output

```
▶ TreeEngine criado co tree: sample-tree
  Nodos: 3
  Edges: 2

▶ canUnlock(skill-a): OK
▶ unlock(skill-a): OK (tier 1 )
▶ unlock(skill-c) bloqueado correctamente: <PREREQUISITES_NOT_MET message>
▶ unlock(skill-b): OK
▶ unlock(skill-c): OK (cadea completa)

▶ Snapshot creado: build-...
▶ lock(skill-a): OK
  skill-a estado tras lock: locked
▶ restoreSnapshot: OK
  skill-a estado tras restore: unlocked ✓

✓ Exemplo completado correctamente.
```

## Prerequisites vs dependency edges

Yggdrasil Forge has **two distinct mechanisms** for expressing
relationships between nodes:

### `dependency` edges (visualization + navigation)

```ts
edges: [
  { id: 'e1', source: 'skill-a', target: 'skill-b', type: 'dependency' },
]
```

Used by the renderer to draw arrows, by graph layouts (Tree,
Radial), and by search/navigation features. **They do NOT enforce
unlock prerequisites at runtime.**

### `NodeDef.prerequisites` (runtime enforcement)

```ts
{
  id: 'skill-b',
  type: 'small',
  label: { ... },
  prerequisites: { type: 'node_unlocked', nodeId: 'skill-a' },
}
```

This is what `TreeEngine.unlock()` consults. If unmet, the call
returns `{ ok: false, error }` with `PREREQUISITES_NOT_MET`
(`YGG_E003`).

### Why both?

- Edges enable rich visualization (multiple edge types: `dependency`,
  `soft_dependency`, `exclusion`, `enhancement`, `path`).
- Prerequisites allow flexible rules beyond pairwise edges (e.g.,
  "unlock if any of [A, B, C] is unlocked", "unlock if resource X
  ≥ 100", etc.) via `UnlockRule` discriminated unions.

This example uses **both consistently**: dependency edges for
visualization (a→b→c chain) + prerequisites for enforcement (skill-b
requires skill-a; skill-c requires skill-b).

## Key concepts shown

- **`Result<T>` pattern**: All async operations return
  `Result<T> = { ok: true, value } | { ok: false, error }`. The
  example checks `.ok` before using `.value`.
- **Dependency edges**: Skills connected via `type: 'dependency'`
  enforce prerequisite chains.
- **Snapshots**: `snapshot(label)` captures the current state;
  `restoreSnapshot(id)` rolls back.
- **Storage**: `MemoryStorage` is the simplest backend; for
  production use `LocalStorageAdapter`, `IndexedDBAdapter`, or
  `FileSystemAdapter` from `@yggdrasil-forge/storage`.

## Source

See [`src/index.ts`](./src/index.ts) for the full annotated source.

## License

MIT
