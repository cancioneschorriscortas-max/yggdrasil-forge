---
'@yggdrasil-forge/core': minor
---

feat(core): `CurveStyle: 'octilinear'` in `PathBuilder`

New routing style for edges: one straight segment (horizontal or
vertical, dominant axis) followed by one 45° segment. PCB / subway /
Deus Ex look. Useful for fixed-position layouts (IdentityLayout) with
local connections — exercised by the upcoming `cyberware-ripperdoc`
example.

Algorithm: the straight leg follows the dominant axis (max |delta|)
until only |min delta| remains, then closes at 45°. Degenerates to a
two-point line when source and target are aligned horizontally or
vertically.

Implementation is local to the per-edge router (same `kind: 'polyline'`
as `'orthogonal'`); the renderer needs no changes. Glow / circuit joins
remain consumer-side (CSS) as with `'orthogonal'`. Future grid-routing
with obstacles is out of scope.
