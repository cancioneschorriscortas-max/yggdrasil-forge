# @yggdrasil-forge/exporters

Export skill tree definitions to external formats.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Convert Yggdrasil Forge `TreeDef` instances to external formats
(GraphML, JSON-LD, DOT/Graphviz, Mermaid, custom LMS formats) for
integration with external tooling and pipelines.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): TreeEngine and core APIs.
- [@yggdrasil-forge/importers](../importers): Inverse direction
  (import from external formats).
- [@yggdrasil-forge/cli](../cli): CLI exposes exporters.

## License

MIT
