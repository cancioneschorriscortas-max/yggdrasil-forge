# Yggdrasil Forge

> Open-source TypeScript monorepo for building interactive skill
> trees — engine, storage, React renderer, plugins, search, and
> validators.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ⚠️ Status: Alpha (0.1.0)

This is an **alpha release**. Public APIs may change before 1.0.0.
Use for evaluation, prototyping, and feedback. **Pin exact versions
in production environments.**

## What is Yggdrasil Forge?

A modular TypeScript engine for designing, rendering, and
interacting with skill trees — the kind of branching progression
systems found in RPGs, learning platforms, gamified curricula,
and competency frameworks.

**Highlights**:

- 🌳 **Composable trees**: nodes, edges, prerequisites, costs,
  resources, stats — all typed strictly.
- ⚡ **Reactive state**: efficient diffing via `StateStore` +
  `ChangeTracker`; subscribers fire only on relevant changes.
- 💾 **Persistence**: 6 storage adapters (Memory, LocalStorage,
  SessionStorage, IndexedDB, FileSystem, ScopedStorage).
- 📸 **Snapshots + loadouts**: save / restore / share builds via
  serialized URLs.
- ⚛️ **React renderer**: drop-in `<SkillTree>` component with
  themes + hooks.
- 🔌 **Plugin system**: 8 lifecycle hooks; official `HistoryPlugin`,
  `DebugPlugin`, `SearchPlugin`.
- 🔍 **Search**: custom substring engine with field-weighted
  scoring + `LocalizedString` support.
- ✅ **Validators**: 9 built-in structural + pedagogical rules
  (cycles, reachability, branching balance, etc.).
- 🌐 **i18n-first**: every error message localized in gl / es / en.

## Quick start

### Installation

```bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/common @yggdrasil-forge/storage
```

For React:

```bash
pnpm add @yggdrasil-forge/react react
```

### Minimal example

```typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'

const treeDef = {
  id: 'my-tree',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { en: 'My skill tree' },
  nodes: [
    { id: 'a', type: 'small' as const, label: { en: 'Skill A' } },
    {
      id: 'b',
      type: 'small' as const,
      label: { en: 'Skill B' },
      prerequisites: { type: 'node_unlocked' as const, nodeId: 'a' },
    },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b', type: 'dependency' as const },
  ],
}

const engine = new TreeEngine(treeDef, { storage: new MemoryStorage() })

const result = await engine.unlock('a')
if (result.ok) {
  console.log('Unlocked!')
}
```

See [`examples/node-basics`](./examples/node-basics) for the
complete annotated walkthrough.

## Packages

This is a monorepo. The following packages are published to npm:

### Active

| Package | Description |
|---------|-------------|
| [`@yggdrasil-forge/common`](packages/common) | Shared types, errors, `Result<T>`, `LocalizedString`, `StorageAdapter` interface. |
| [`@yggdrasil-forge/core`](packages/core) | `TreeEngine`, state management, layouts, federation. |
| [`@yggdrasil-forge/storage`](packages/storage) | 6 storage adapter implementations. |
| [`@yggdrasil-forge/react`](packages/react) | React renderer + hooks + themes. |
| [`@yggdrasil-forge/plugins`](packages/plugins) | Official plugins: History, Debug. |
| [`@yggdrasil-forge/search`](packages/search) | Search engine + SearchPlugin. |
| [`@yggdrasil-forge/validators`](packages/validators) | 9 built-in pedagogical rules. |

### Scaffold (reserved for future phases)

`@yggdrasil-forge/{analytics, cli, devtools, diff, exporters,
heatmap, i18n, importers, multitenancy, neo4j, stats, themes,
webhooks}` — see each package's README for planned scope.

## Documentation

- **[Architecture MASTER document](docs/architecture/MASTER.md)** —
  full design rationale + roadmap.
- **[Development briefings](docs/briefings/)** — complete
  per-sub-phase history (~85 briefings).
- **Per-package READMEs** — installation + API summary for each
  package.

## Development

Requires **Node.js ≥ 22** and **pnpm 11**.

```bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge
cd yggdrasil-forge
pnpm install
pnpm typecheck   # 24/24
pnpm test        # 2195 tests
pnpm build       # all packages
```

Run the example:

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

## Roadmap

The project follows a phased development plan documented in
[MASTER.md](docs/architecture/MASTER.md). Phases 0–8 are complete
(58+ sub-phases without rollback). Phase 9 (Visual Editor + Wizards
+ Templates) is next.

## Contributing

The project is in active alpha development. Issues and feedback
welcome via GitHub. PR contributions accepted after 0.1.0 is
stable.

## License

[MIT](LICENSE)

---

*Yggdrasil Forge is named after the world tree of Norse mythology,
the cosmic ash whose branches connect the nine realms — a fitting
metaphor for a system that connects nodes across domains.*
