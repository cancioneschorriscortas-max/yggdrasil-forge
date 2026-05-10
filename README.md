# Yggdrasil Forge

> The world tree from which all skill trees grow.

A comprehensive skill tree engine and visual editor for the web.

## Status

🚧 **Early development.** This project is in active construction.

## Known constraints

- Uses `node-linker=hoisted` in `.npmrc` (Windows compatibility on non-NTFS drives).
- Turborepo telemetry is disabled by default. Re-enable with `npx turbo telemetry enable` if desired.
- Line endings forced to LF cross-platform via `.gitattributes`.
- Build scripts must be explicitly approved via `allowBuilds` in `pnpm-workspace.yaml` (pnpm 11 default security policy). `@biomejs/biome` is currently approved.

## Vision

Yggdrasil Forge is a complete skill tree solution for web applications:

- **Core engine** — Framework-agnostic TypeScript library
- **React renderer** — Headless components with optional theme presets
- **Visual editor** — Standalone PWA for designing skill trees
- **Adapters** — Vue, Svelte, Solid, Neo4j, and more
- **CLI** — Command-line tools for skill tree management
- **DevTools** — Browser extension for debugging

## Use cases

- Web games (RPG, RTS, idle games)
- Educational platforms
- Productivity / habit tracking
- Knowledge visualization
- Career coaching
- Corporate certifications
- Multi-tenant SaaS

## License

[MIT](./LICENSE)
