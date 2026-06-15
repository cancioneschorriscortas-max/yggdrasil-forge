# @yggdrasil-forge/search

Search engine for Yggdrasil Forge skill trees.

## Installation

```bash
pnpm add @yggdrasil-forge/search
```

## Usage

### As a Plugin (recommended)

The simplest way to add search to a TreeEngine:

```typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { SearchPlugin } from '@yggdrasil-forge/search'

const engine = new TreeEngine(treeDef)
const search = new SearchPlugin()

await engine.registerPlugin(search)

// The plugin auto-indexes the treeDef on install.
const results = search.search('warrior', { limit: 5 })
// [
//   { nodeId: 'n1', score: 10, matches: [{ field: 'name', value: 'warrior' }] },
//   ...
// ]
```

**API:**
- `search(query: string, options?: SearchOptions): readonly SearchResult[]` — perform a search.
- `reindex(): void` — re-index manually (useful if treeDef changes after `applyChanges` in a future release).
- `getEngine(): SearchEngine` — access the internal SearchEngine for advanced use cases.

**Permissions:** `['read_state']` (reads the treeDef on install).

### Standalone (advanced)

Use `SearchEngine` directly without the Plugin wrapper:

```typescript
import { SearchEngine } from '@yggdrasil-forge/search'

const engine = new SearchEngine()
engine.index(treeDef)

const results = engine.search('warrior', { fields: ['name', 'tags'] })
```

**API:**
- `index(tree: TreeDef): void` — index a TreeDef (clears previous index).
- `search(query: string, options?: SearchOptions): readonly SearchResult[]` — perform a search.
- `clear(): void` — clear the index.
- `size(): number` — number of indexed nodes.

## Algorithm

Custom substring search with per-field scoring (no external dependencies).

**Indexed fields** (lowercased on index):
- `label` (NodeDef.label is a `LocalizedString`; **all locale variants are flattened and indexed** as text).
- `description` (also `LocalizedString`; flattened).
- `tags`.
- `searchKeywords`.

**Scoring** (cumulative per match):
- `label` match → **+10**.
- `searchKeywords` match → **+7** (per keyword that matches).
- `description` match → **+5**.
- `tags` match → **+3** (per tag that matches).

**Results** are sorted by score (descending), then limited by `options.limit` (default Infinity).

## Options

```typescript
interface SearchOptions {
  fields?: readonly SearchField[]  // default: all 4 fields
  limit?: number                    // default: Infinity
}

type SearchField = 'name' | 'description' | 'tags' | 'searchKeywords'

interface SearchResult {
  nodeId: string
  score: number
  matches: readonly SearchMatch[]
}

interface SearchMatch {
  field: SearchField
  value: string  // lowercased value where the match occurred
}
```

> **Note**: `SearchField` uses the name `'name'` for backwards-compatible API surface, but internally maps to `NodeDef.label` (which is a `LocalizedString`).

## Notes

- **Case-insensitive** search by default. Both the index and queries are lowercased.
- **Empty query** returns `[]` (no matches).
- **LocalizedString fields** (`label`, `description`): all locale variants are flattened into a single searchable text. Matching any variant scores the node.
- **No auto-reindex** in this release. If `treeDef` changes after install (via `applyChanges`, a future feature), call `plugin.reindex()` manually.

## License

MIT
