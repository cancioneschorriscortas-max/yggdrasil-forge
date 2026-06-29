---
'@yggdrasil-forge/react': minor
---

feat(react): `coordinateBounds` and `backgroundImage` props on `SkillTree`

Two new optional props on `SkillTree` (and `SVGRenderer`) for consumers
that need to align the tree with a background image deterministically.

**`coordinateBounds`** fixes the SVG coordinate space instead of
deriving it from the layout nodes. The `viewBox` becomes exactly the
provided box (plus `padding`, default 0), without the auto-fit
inflation (`maxRadius + 28`). Nodes written at `(x, y)` in the fixture
map 1:1 to `(x, y)` on screen. Recommended combination:
`coordinateBounds={...} padding={0} fitOnMount={false}`.

**`backgroundImage`** renders an `<image>` inside the pan/zoom group of
the SVG (so it moves and scales with the nodes, unlike a CSS background
layer). The image occupies the bounds box with
`preserveAspectRatio="xMidYMid meet"`. Typically combined with
`coordinateBounds` set to the image's pixel box.

Both props are purely additive: omitting them keeps the legacy
behaviour intact (zero regression). Exercised by the upcoming refactor
of the `cyberware-ripperdoc` example, where the cyberpunk body image
needs to align with anatomically-placed nodes.
