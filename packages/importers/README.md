# @yggdrasil-forge/importers

Import skill tree definitions from external formats.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Convert external skill tree formats (game engine exports, LMS
data, Graphviz/Mermaid sources, JSON-LD) into Yggdrasil Forge
`TreeDef` instances, with validation and migration helpers.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/exporters](../exporters): Inverse direction
  (export to external formats).
- [@yggdrasil-forge/validators](../validators): Validate imported
  trees.
- [@yggdrasil-forge/cli](../cli): CLI exposes importers.

## License

MIT
