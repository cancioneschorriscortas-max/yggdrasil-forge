# @yggdrasil-forge/stats

Aggregated statistics and metrics over skill trees.

## Status

🚧 **Scaffold package** — planned for a future phase of the
Yggdrasil Forge roadmap.

This package currently contains only a placeholder. Active
implementation will be tracked in the
[architecture document](../../docs/architecture/MASTER.md).

## Purpose

Compute aggregated statistics over `TreeDef` and `TreeState`:
unlock counts, depth distributions, prerequisite chain analytics,
critical paths, completion rates, and other derived metrics. The
core `StatComputer` already provides per-node stats; this package
focuses on aggregations and reporting.

## Related packages

- [@yggdrasil-forge/common](../common): Shared types and utilities.
- [@yggdrasil-forge/core](../core): `StatComputer` and stats
  primitives.

## License

MIT
