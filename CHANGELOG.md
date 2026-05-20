# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Phase 1 integration test suite (1.18, closure of Phase 1): new `packages/core/__tests__/integration/` directory with 6 end-to-end scenarios — `lifecycle`, `economy`, `applyChanges`, `audit`, `subscription`, `untrusted-input` — plus targeted coverage tests for `TreeEngine.ts`. Reusable rich fixtures (`fixtures.ts`) build realistic `TreeDef` instances that pass the Zod schema (round-trip safe via `toJSON ↔ fromJSON`).
- No production code changes. Coverage rises: global 92.72% → 97.68%, `TreeEngine.ts` 81.72% → 96.12%. Total core tests: 482 → 538.

## [Unreleased]

### Added
- `treeDefSchema` (engine): esquema Zod que reflicte estruturalmente o tipo `TreeDef`. Só validación estrutural (NON regras pedagóxicas — iso é a Fase 8). Recursivo (`subtrees`) vía `z.lazy`. `InferredTreeDef` exportado (tipo do TreeDef tras validación runtime; difire de `TreeDef` só no artefacto `?:T|undefined` de Zod 3, equivalencia probada por test de tipo).
- `TreeDefValidator.validateTreeDef(input, locale?)`: validación estrutural de entrada non confiable; devolve `Result<InferredTreeDef>`. En erro: `YggdrasilError(INVALID_TREE_DEF)` con `issues` serializables `{path, message}[]` no `context` e mensaxe localizada. Nunca lanza.
- `JsonSerializer` (engine): `serialize(treeDef)` JSON determinista (claves ordenadas de forma estable, recursivo; inclúe `schemaVersion`; só a definición, sen estado runtime) e `deserialize(json, locale?)` (parse → validación → comprobación de `schemaVersion` contra `SCHEMA_VERSION` de common). `schemaVersion` non soportada → `SCHEMA_VERSION_UNSUPPORTED`; JSON malformado → `INVALID_TREE_DEF` controlado.
- `TreeEngine.fromJSON(json, options?)`: factory estático que deserializa+valida e constrúe o engine; devolve `Result<TreeEngine>` SEN lanzar (a entrada é externa). O constructor normal mantén a súa semántica de throw intacta.
- `TreeEngine.toJSON()`: serializa o `TreeDef` actual do engine de forma determinista (round-trip a nivel engine).
- Dependencia `zod` (^3) engadida só a `@yggdrasil-forge/core`.
- `AuditLogger` (engine): rexistro de auditoría en memoria con `record`, `query`, `clear`, `size`. Desactivado por defecto (cero overhead); límite circular FIFO configurable (`maxEntries`, default 1000).
- `TreeEngine.getAuditLog(filter?)`: devolve unha copia filtrada das entradas de auditoría (por `actor`, `action.type`, rango `from`/`to` inclusivo, `limit`). Máis recente primeiro. Síncrono.
- `TreeEngine.clearAuditLog()`: baleira o rexistro de auditoría.
- `TreeEngine.logAudit(action, opts?)`: API manual para rexistrar accións `custom` ou propias; no-op se audit desactivado; emite `auditEntry` cando crea entrada.
- Rexistro automático tras as 4 mutacións exitosas (NON nos erros): `unlock` → `node_unlocked` (rollbackable), `lock` → `node_locked` (rollbackable), `respec` → `respec`, `applyChanges` → `tree_changed`. Cada rexistro emite o evento `auditEntry`.
- `TreeEngineOptions.audit`: configuración opcional `{ enabled?: boolean (default false); maxEntries?: number (default 1000) }`.

## [Unreleased]

### Added
- `Selector<T>` type: función pura `(state: TreeState) => T`.
- `createSelector`: factoría de selectors memoizados estilo reselect, caché last-args (tamaño 1) con igualdade referencial das entradas; tipada con sobrecargas para 1-3 selectors de entrada + combinador (cero `any`).
- `shallowEqual`: helper puro de comparación superficial (un nivel), para uso opcional como `equalityFn`. Non é o default; o default segue sendo `Object.is`.
- `TreeEngine.select<T>(selector)`: lectura pura e síncrona dunha porción derivada do snapshot actual. As excepcións do selector propáganse (non se capturan).
- `TreeEngine.subscribeWithSelector<T>(selector, listener, options?)`: subscríbese ao store global pero só chama a `listener(selected, previous)` cando o valor seleccionado cambia segundo `equalityFn` (default `Object.is`); soporta `fireImmediately`; devolve un `Unsubscribe`.

## [Unreleased]

### Added
- `TreeEngine.unlock(nodeId)`: mutación async que valida prerequisites, exclusións e recursos, aplica custo atómico, cambia estado e emite eventos `unlock`, `stateChange`, `budgetChange`.
- `TreeEngine.lock(nodeId)`: mutación async que reverte un nodo a `locked`, fai refund segundo `refundable`/`refundPercent`, e emite eventos `lock`, `stateChange`, `budgetChange`.
- `TreeEngine.respec(nodeId?)`: mutación async de respec total ou parcial con detección de cascada de dependentes invalidados. Atómica: unha soa `StateStore.update`.
- `TreeEngine.canUnlock(nodeId)`: comprobación síncrona pura que avalia prerequisites, exclusións e recursos sen mutar estado.
- `TreeEngine.on/off`: subscrición tipada a eventos do `EventMap`.
- Tipos exportados: `UnlockResult`, `LockResult`, `RespecResult`.

### Fixed
- DT-7: eliminada rama morta inalcanzable en `ResourceManager.applyCost` (bloque `if (required === null)` que nunca se executaba). Simplificado `aggregateCosts` para que nunca devolva `null`.

## [Unreleased]

### Added
- `TreeEngine`: fachada pública do motor con constructor e getters síncronos (`getNodeState`, `getAllNodeStates`, `getBudget`, `getProgress`, `getTreeDef`, `getLocale`, `isReadOnly`, `getSnapshot`, `getServerSnapshot`, `subscribe`).
- `TreeEngineOptions`: interface con campos `locale` e `readOnly`.

### Fixed
- DT-6: `ResourceManager` `INVALID_COST` agora reporta o importe real do custo negativo en vez de `unknown`.

### Added
- `INVALID_COST` (`YGG_V006`) error code with localized messages in Galician, Spanish, and English for invalid resource cost amounts.

### Changed
- `ResourceManager` now emits localized error messages via `getErrorMessage()` instead of hardcoded English strings.

### Fixed
- Lint warning `useTemplate` in `ResourceManager` (DT-5).

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: `DependencyGraph` class
  - Configurable by edge type (default: `dependency`; optionally `soft_dependency`)
  - `getDependencies`, `getDependents` (direct), `getAllDependencies`, `getAllDependents` (transitive closures)
  - `getRoots`, `getLeaves`, `getNodeIds`, `hasNode`, `getOutgoing`
  - `distanceBetween` (BFS, `Number.POSITIVE_INFINITY` if unreachable) — implements `DependencyGraphLike`
  - `getShortestPath` (BFS with predecessor tracking)
  - Handles bidirectional edges, self-loops, isolated nodes, disconnected graphs
- `@yggdrasil-forge/core`: `CycleDetector` class
  - `hasCycle` (fast DFS, short-circuits)
  - `findCycles` (all cycles, deduplicated via canonical rotation key)
  - `findCycleContaining` (cycle including a given node, for pedagogical error messages)
  - 100% test coverage for both

### Added
- `@yggdrasil-forge/core`: `UnlockResolver` class
  - Evaluates `UnlockRule` (all/any/none combinators + atomic conditions)
  - Supports all 15 atomic condition types
  - `evaluate(rule, ctx)` — fast boolean evaluation with short-circuit
  - `evaluateCondition(condition, ctx)` — atomic evaluation
  - `explain(rule, ctx)` — detailed explanation with localized reasons (gl/es/en)
  - Stateless: receives `UnlockResolverContext` (treeDef, state, optional dependencyGraph, customEvaluators, locale)
  - Localized error messages for missing dependency graph and unregistered custom evaluators
  - 100% test coverage

- `@yggdrasil-forge/core`: `ChangeTracker` class + `analyzeChanges` function
  - Pure analysis of `TreeChange[]` (no mutation, no external state access)
  - Selective cache invalidation per change type (layout / dependency / search / stats)
  - Field-aware analysis of `modify_node` and `modify_edge` (only invalidates caches affected by the modified fields)
  - Internal conflict detection: `duplicate_add_node`, `add_then_remove`, `remove_then_modify`, `modify_after_rename`, `rename_chain`, `rename_to_existing`, `duplicate_edge_id`
  - Rename tracking (oldId → newId map)
  - 100% test coverage

### Added
- `@yggdrasil-forge/core`: `StateStore` class
  - Holds mutable `treeDef` and `treeState` via Immer
  - `update(producer)` and `applyTreeDefChange(producer)` for ergonomic mutations
  - `replaceTreeDef`, `replaceTreeState` for full replacements
  - Integrated cache versioning for 4 cache types (`layout`, `dependency`, `search`, `stats`)
  - `getCacheVersion`, `invalidate`, `setCache`, `getCache` for cache lifecycle
  - Subscription system: `subscribe`, `getSnapshot`, `getServerSnapshot` (React `useSyncExternalStore`-compatible)
  - 100% test coverage



### Added
- `@yggdrasil-forge/core`: wave 3 type definitions
  - `Effect` DSL with 10 effect types (modify_resource, modify_stat, modify_node_state, set_node_visibility, unlock_node, set_progress, trigger_event, conditional, composite, plugin)
  - `TimeConstraints` with dual API (UTC ms absolutes/relatives + calendar with explicit timezone)
  - `TimeManagerOptions`
  - `StatContribution` with 7 operations (+/-/*//min/max/set), perTier, conditional contributions
  - `StatExplanation` for debugging stat computations
  - `AuthConfig` (none/bearer-static/bearer-provider/apikey-static/apikey-provider/basic/custom)
  - `AuthProvider`, `AuthRequestHandler`
  - `ProgressSourceConfig` (5 types: manual/remote/callback/event/computed)
  - `ProgressHandler`, `ProgressHandlerContext`
  - `Build`, `BuildShareLink`, `BuildSnapshot`
  - `AuditEntry`, `AuditAction` (10 action types), `AuditFilter`
  - `TreeChange` (12 change types including `rename_node_id` with auto-reference updates)
  - `ModifyNodeChanges`, `ModifyEdgeChanges` (constrained partials excluding id/type)
  - `EngineMetrics`

### Changed
- `NodeDef`: `unknown` placeholders replaced with concrete types (cost, costPerTier, effects, prerequisites, progressSource, subtreeOverrides, timeConstraints, statContributions)
- `TreeDef`: `resources`, `startingBudget`, `i18n` now use concrete types
- `TreeState.budget`: now `Budget`
- `NodeInstance.subtreeState`: now `TreeState`
- `EventMap`: `buildLoaded`, `treeChanged`, `auditEntry` now use concrete types


### Added
- `@yggdrasil-forge/core`: foundational type definitions
  - `Result<T, E>` with helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`)
  - `NodeDef`, `NodeInstance`, `NodeType`, `NodeState`, `Position`, `StateChange`
  - `freezeNodeDef(def)` for recursive Object.freeze of node definitions
  - `EdgeDef`, `EdgeType`, `EdgeStyle`
  - `TreeDef`, `TreeState`, `GroupDef`, `StatDef`, `LayoutConfig`
  - `RichContent`, `NodeContent`
  - Re-exports of `ErrorCode`, `YggdrasilError`, `isYggdrasilError`, `getErrorMessage` from `@yggdrasil-forge/common`
- `test:coverage` script in package.json template (and in `common` + `core` retroactively)

- `@yggdrasil-forge/core`: wave 2 type definitions
  - `Resource`, `Cost`, `Budget` (economy primitives)
  - `I18nConfig` (per-tree i18n configuration)
  - `UnlockCondition` (15 atomic types: node-based, resource-based, distance, tags, time, custom, etc.)
  - `UnlockRule` (AND/OR/NOT combinators + atomic conditions)
  - `UnlockCheck`, `UnlockExplanation`, `UnlockConditionEvaluation`
  - `EventMap` (15 events: unlock, lock, stateChange, budgetChange, statChange, progressChange, respec, buildLoaded, subtreeEntered, treeChanged, nodeExpired, externalProgressSynced, pluginError, error, auditEntry)
  - `Plugin`, `PluginAPI`, `PluginEngineHandle`, `PluginInstallResult`
  - `Hooks` (beforeUnlock/afterUnlock/beforeLock/afterLock/beforeRespec/afterRespec/computeUnlockability/computeCost)
  - `HookContext`, `ConditionEvaluator`, `PluginLogLevel`, `PluginPermission`
### Changed
- `scripts/create-package.mjs` now includes `test:coverage` in scaffolded packages

### Added
- `@yggdrasil-forge/common`: real content (constants, locales, i18n, errors)
  - `Locale`, `SupportedLocale`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `FALLBACK_LOCALE`, `isSupportedLocale`
  - `LocalizedString`, `resolveLocalized`, `interpolate`
  - `ErrorCode` enum (30+ codes covering engine, validation, storage, plugins, etc.)
  - `YggdrasilError` class with `code`, `context`, `cause`, `toJSON()`
  - `isYggdrasilError` type guard
  - `getErrorMessage` with localized messages in gl/es/en for all error codes
- 100% test coverage in `@yggdrasil-forge/common`

### Fixed
- lint-staged now processes the entire repo with Biome instead of file-by-file (fixes Windows command line length limit)
- Release workflow no longer attempts to publish to npm without NPM_TOKEN configured (avoids spurious red runs)
- Turbo `test` task now declares explicit empty outputs (silences warning)

### Added
- Created `@yggdrasil-forge/common` package (placeholder)
- Created `@yggdrasil-forge/core` package (placeholder, depends on common)
- Configured tsup for ESM + CJS dual builds across packages
- Configured TypeScript project references for incremental builds
- Per-package vitest configs that extend the root config
- Per-package tsconfig with composite mode
- Approved esbuild build scripts via `pnpm approve-builds`
- Vitest configured at workspace root with v8 coverage provider
- Smoke tests to verify Vitest installation
- GitHub Actions CI workflow (lint, format, typecheck, test)
- PR title validation workflow (enforces Conventional Commits)
- CI and License badges in README
- New scripts: `test:ui`, `test:coverage`, `format:check`
- Initial monorepo structure
- .gitattributes for cross-platform LF line endings
- .npmrc with hoisted node-linker (Windows compatibility)
- Turborepo telemetry disabled by default
- Approved build scripts for @biomejs/biome via pnpm allowBuilds
- TypeScript, Biome, and Turborepo configuration
- License (MIT) and contribution guidelines
- Master architecture document at `docs/architecture/MASTER.md`
- VS Code workspace settings and recommended extensions
- Husky git hooks (pre-commit lint-staged, pre-push typecheck)
- Environment check script (`pnpm check-env`)
- Refined Biome configuration with stricter rules
- Refined TypeScript configuration with extra safety options
- Additional npm scripts: `lint:fix`, `test:watch`, `fresh`, `validate`
- Configured `pnpm catalog` for shared devDependencies (tsup, vitest, etc.)
- Configured `@changesets/cli` with hybrid versioning (4 core packages linked, others independent)
- Created GitHub Actions release workflow (preparation, requires NPM_TOKEN to activate)
- Created `scripts/create-package.mjs` for consistent package scaffolding
- Created 15 placeholder packages following the standard template:
  - Core (linked): themes, react
  - Independent: storage, i18n, analytics, search, diff, exporters, importers,
    webhooks, stats, validators, heatmap, multitenancy, devtools, neo4j, cli


### Changed
- Removed root-level `__tests__/smoke.test.ts` (replaced by per-package smoke tests)
- Added tsup as devDependency per-package (required for pnpm workspace isolation)
- Renamed `docs/BRIEFINGS` to `docs/briefings` (kebab-case convention)
- Refined `turbo.json` with stream UI and test:watch task
- TypeScript: enabled `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `incremental`
- Refactored `common` and `core` packages to use catalog references
