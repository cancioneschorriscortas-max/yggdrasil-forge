---
'@yggdrasil-forge/react': minor
---

Layout errors are now visible in development: when `computeLayout` fails,
`SkillTree`/`SVGRenderer` render the error code and message on the canvas
instead of a blank SVG. Production output is unchanged (silent). Adds an
optional `errorMessage` prop to `SVGRenderer`.
