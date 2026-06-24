---
"@yggdrasil-forge/react": minor
---

feat(react): badges raster a `imageSize=radius*1.8`, glyphs intactos (F11.3b). En `SkillNode`, as imaxes raster (rutas, `data:` URIs, ou cadeas con extensión de imaxe) renderízanse agora con `width`/`height` == `radius * 1.8` en vez de `radius * 1.0`, e con `preserveAspectRatio="xMidYMid meet"` explícito. Os `IconGlyph` (glyphs vector rexistrados) seguen co tamaño `iconSize = radius * 1.0` sen cambio: regresión cero no panadeiro, camareiro e calquera árbore que use glyphs. Pensado para que os badges AAA do Paladín enchan o círculo do nodo sen tapar o anel de estado.
