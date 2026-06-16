# Changelog

All notable changes to Yggdrasil Forge will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is the **monorepo root CHANGELOG**. Per-package CHANGELOGs are
generated automatically by [Changesets](https://github.com/changesets/changesets)
on publish.

## [Unreleased]

### Documentation
- **README global**: nova sección "Why Yggdrasil Forge?" antes de
  "Quick start" — diferenciación explícita vs solucións ad-hoc.
  4 sub-seccións: párrafo intro + "What you'd build anyway" +
  "What you probably wouldn't build" + "When *not* to use".
- Auto-tracked: BRIEFING-readme-why.md en docs/briefings/.
- **Second practical example**: `examples/react-demo/` —
  interactive React skill tree demo built with Vite + React 18 +
  TypeScript.
  - 8-node RPG character tree with branching prerequisites.
  - Click-to-unlock / click-to-lock interaction.
  - Reactive stats panel + Snapshot/Restore buttons.
  - **Stackblitz-deployable**: "Open in Stackblitz" badge in
    README → instant browser-based exploration.
  - Uses **published npm versions** (`^0.1.0`) instead of
    `workspace:*` for external sandbox compatibility.
- Auto-tracked: BRIEFING-examples-2.md in docs/briefings/.

### Note
- Sub-fase **readme-why** post-release.
- **Pure editorial**: cero código, cero tests, cero impacto.
- 60 sub-fases consecutivas sen rollback.
- Sub-fase **examples-2**. Second practical example post-release.
- **0 modifications** to existing packages, tests, configs.
- 2195 tests pass unchanged.
- 61 consecutive sub-phases without rollback.
- Implements Executor's top recommendation for adoption: visual
  interactive demo is the #1 conversion driver.
- Recomendación implementada do Executor: diferenciación explícita
  é o segundo paso de máis impacto post-release (despois de
  examples-2 React demo).

## [0.1.0] - 2026-06-16

First public release of Yggdrasil Forge — an open-source TypeScript
monorepo skill tree engine.

> **⚠️ Alpha release.** Public API is subject to breaking changes
> until 1.0.0. Pin exact versions in production.

### Added

#### Core engine
- **`@yggdrasil-forge/core`**: TreeEngine with `unlock`, `lock`,
  `respec`, `canUnlock`, `setProgress`, `tick` operations.
- StateStore + ChangeTracker for reactive state management with
  efficient diffing.
- UnlockResolver with composable `UnlockRule` (all/any/none
  conditions).
- StatComputer for per-node and aggregate statistics.
- Effects system with conditional rules (Phase 2).
- DependencyGraph + CycleDetector primitives.

#### Persistence
- **`@yggdrasil-forge/storage`**: 6 storage adapters:
  - `MemoryStorage` (in-memory; tests + SSR).
  - `LocalStorageAdapter` (browser).
  - `SessionStorageAdapter` (browser per-tab).
  - `IndexedDBAdapter` (browser async; large data).
  - `FileSystemAdapter` (Node.js).
  - `ScopedStorage` (multi-tenant wrapper).
- Snapshot system (`snapshot` + `restoreSnapshot`).
- Loadout system (`saveLoadout` + `loadLoadout`).
- Share-link encoding (`encodeForUrl` + `decodeFromUrl`).
- Migration framework with version tracking.

#### Layouts
- Tree layout (hierarchical).
- Radial layout.
- Grid layout.
- Custom layout extensibility via `BaseLayoutConfig`.

#### Federation + Multi-tenancy
- Sub-tree composition with `subtree_anchor` node type.
- `TreeRegistry` for managing multiple trees.
- Federation primitives (Phase 5).

#### React renderer
- **`@yggdrasil-forge/react`**: `SkillTree` component with built-in
  `minimal` theme.
- `SkillNode`, `SkillEdge`, `MeshOverlay`, `SVGRenderer` primitives.
- Reactive hooks: `useSkillTree`, `useNodeState`, `useNodeSelector`,
  `useStat`.
- `ThemeProvider` with `Theme`, `ThemeColors`, `ThemeSizes` types.
- Headless mode via `/headless` entry (no styles bundled).
- SSR-friendly.

#### Plugin system
- **`@yggdrasil-forge/plugins`**: pluggable extension architecture
  with 8 hooks (`beforeUnlock`, `afterUnlock`, `beforeLock`,
  `afterLock`, `beforeRespec`, `afterRespec`, `computeUnlockability`,
  `computeCost`).
- `HistoryPlugin`: FIFO tracking of unlock/lock/respec events.
- `DebugPlugin`: stateless logging via hooks.
- Permission system (V1.0: `read_state` only).

#### Search
- **`@yggdrasil-forge/search`**: custom substring search with
  field-weighted scoring (label=10, searchKeywords=7,
  description=5, tags=3).
- `SearchPlugin` for live indexing as state changes.
- Case-insensitive, handles `LocalizedString` flattening.

#### Validators
- **`@yggdrasil-forge/validators`**: pedagogical and structural
  validators with 9 built-in rules:
  - **Structural**: `noCyclesRule`, `allReachableFromRootRule`,
    `noOrphanNodesRule`, `noDeadEndsRule`,
    `maxBranchingFactorRule` (factory),
    `minBranchingFactorRule` (factory).
  - **Pedagogical**: `noRedundantPrerequisitesRule`,
    `progressiveDifficultyRule`,
    `balancedBranchesRule` (factory).
- `TreeEngine.validatePedagogically()` via Inversion of Control
  (no circular dependencies).

#### Other
- **`@yggdrasil-forge/common`**: shared types (`Result`,
  `LocalizedString`, `StorageAdapter`, error codes,
  `SCHEMA_VERSION`).
- **Read-only mode**: 8 mutating methods blocked when
  `readOnly: true`.
- **i18n**: full Galician/Spanish/English localization for error
  messages.
- **76 ErrorCodes** organized by family (`YGG_E`, `YGG_R`, `YGG_L`,
  `YGG_PL`, `YGG_B`, `YGG_RO`, `YGG_V`).
- **2195 tests** across 7 active packages.

### Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `@yggdrasil-forge/common` | Shared types + utilities | Active |
| `@yggdrasil-forge/core` | TreeEngine + state management | Active |
| `@yggdrasil-forge/storage` | Storage adapters | Active |
| `@yggdrasil-forge/react` | React renderer | Active |
| `@yggdrasil-forge/plugins` | Official plugins | Active |
| `@yggdrasil-forge/search` | Search engine | Active |
| `@yggdrasil-forge/validators` | Pedagogical validators | Active |
| `@yggdrasil-forge/{analytics, cli, devtools, diff, exporters, heatmap, i18n, importers, multitenancy, neo4j, stats, themes, webhooks}` | — | Scaffold (future phases) |

### Notes

- **Alpha-quality release.** Recommended for evaluation, prototyping,
  and feedback; not for production-critical systems.
- API surface area is large; subset usage encouraged.
- Documentation: per-package READMEs, [`docs/architecture/MASTER.md`](docs/architecture/MASTER.md),
  and [`docs/briefings/`](docs/briefings/) (full development history).
- Working example: [`examples/node-basics`](examples/node-basics).
