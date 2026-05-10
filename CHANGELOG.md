# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Vitest configured at workspace root with v8 coverage provider
- Smoke tests to verify Vitest installation
- GitHub Actions CI workflow (lint, format, typecheck, test)
- PR title validation workflow (enforces Conventional Commits)
- CI and License badges in README
- New scripts: `test:ui`, `test:coverage`, `format:check`

### Changed
- Renamed `docs/BRIEFINGS` to `docs/briefings` (kebab-case convention)
- Refined `turbo.json` with stream UI and test:watch task

### Added
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

### Changed
- TypeScript: enabled `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `incremental`
- Biome: enabled `noUnusedImports`, `useImportType`, `noConsole`, more strict rules