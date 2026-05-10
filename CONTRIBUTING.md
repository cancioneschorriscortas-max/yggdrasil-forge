# Contributing to Yggdrasil Forge

🚧 **The project is in early development.** Contribution guidelines will be detailed here as the project matures.

For now, please open an issue to discuss any contribution before submitting a pull request.

## Prerequisites

- Node.js 22+
- pnpm 11+
- Git

## Setup

```bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git
cd yggdrasil-forge
pnpm install
pnpm check-env   # Verifica o entorno
```

## Development workflow

```bash
pnpm dev           # Watch mode across packages
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm typecheck     # Type-check across packages
pnpm lint          # Lint with Biome
pnpm lint:fix      # Auto-fix linting issues
pnpm format        # Format code with Biome
pnpm validate      # lint + typecheck + test
pnpm fresh         # Clean and reinstall (when something is weird)
```

## Git hooks

Husky runs:
- `pre-commit`: `lint-staged` (formats and checks staged files)
- `pre-push`: `pnpm typecheck` (catches type errors before pushing)

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add new feature
fix(react): fix a bug
docs: update documentation
refactor(core): improve code structure
test(core): add tests
chore: maintenance tasks
```

## Architecture

The master architecture document lives at [`docs/architecture/MASTER.md`](./docs/architecture/MASTER.md).

It is the single source of truth for the project. Major changes require updating it first.