# BRIEFING — F11.3b · Tamaño dos badges raster (imageSize ≠ iconSize)

(Briefing tracked; corpo non incluído aquí — gardado polo Director.)

Sub-fase F11.3b: badges raster vense pequenos coa decisión de F11.3
porque comparten `iconSize = radius * 1.0` cos glyphs vector.

Cambios:

1. Engadir `const imageSize = radius * 1.8` xunto a `iconSize`.
2. O `<image>` usa `imageSize` (non `iconSize`) + `preserveAspectRatio="xMidYMid meet"`.
3. `IconGlyph` mantén `iconSize = radius * 1.0` — regresión cero nos
   glyphs do panadeiro/camareiro.
4. O `<text>` (emoji fallback) sen cambios.

Decisións do Director:
- Opción B (tamaños separados) sobre A (global) ou C (por-nodo).
- 1.8 sobre 2.0 (deixa anel de estado visible).
- preserveAspectRatio explícito (badges non son cadrados: 197×256, 218×256…).
