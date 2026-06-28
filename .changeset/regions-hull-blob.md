---
'@yggdrasil-forge/react': minor
---

feat(react): `SkillRegions` accepts `regionShape: 'box' | 'hull'`

New optional prop on `SkillTree` (forwarded to `SkillRegions`) selects the
shape of region tints:

- `'box'` (default) — current behaviour: rounded `<rect>` around the
  region's bounding box.
- `'hull'` — organic blob (`<path>`) that follows the actual shape of the
  region's nodes. Built from a sampled convex hull (Monotone Chain on
  `K=10` perimeter points per node) smoothed by a closed Catmull-Rom
  spline. Useful on image backgrounds where rectangles overlap between
  fan clusters and wash out over warm areas.

The public helper `computeRegionHullPath(tag, nodes, positions, padding)`
is exported for consumers that want to render the path themselves.

Zero regressions: default is `'box'`; existing consumers see no change.
The legacy `SkillRegions.test.tsx` keeps passing untouched as the
regression guard.
