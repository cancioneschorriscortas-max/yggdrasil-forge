---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/react': minor
---

feat(core): constellation layout — radial threaded strands (`shape: 'line'`)

New `LayoutEngine` in `@yggdrasil-forge/core`: `ConstellationLayout`. Each
cluster becomes a radial strand growing from the crown (root) outward: members
thread along the strand from `innerRadius` to `outerRadius`. Fills the radial
space — kills the "dead ring" that `clustered-radial` leaves in `list` mode
(grow-outward invariant).

Configuration knobs:

- `shape: 'line'` — only value implemented in v1 (`curve`/`spiral` future,
  parser rejects them today).
- `innerRadius` (default 90) and `outerRadius` (default 320).
- `lengthMode: 'equal-span' | 'fixed-step'`:
  - `equal-span` (default) — every strand spans the full `[innerRadius,
    outerRadius]` regardless of member count; clusters with fewer members have
    more spacing.
  - `fixed-step` — constant radial step across all strands; shorter clusters
    finish before reaching `outerRadius`.
- `startAngle` (default `-π/2`) to rotate the whole constellation.

This layout only positions; the visible strands come from `treeDef.edges`
(`type: 'path'`) so they don't introduce unlock gates. Cluster building shares
a new helper module (`ClusterBuilder`) used additively — `ClusteredRadialLayout`
remains untouched, no regression in the core test suite.

Registered in `@yggdrasil-forge/react`'s default layout registry.
