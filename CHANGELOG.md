# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
