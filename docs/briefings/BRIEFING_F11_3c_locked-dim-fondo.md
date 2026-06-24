# BRIEFING — F11.3c · Atenuar locked + Fondo do lenzo

(Briefing tracked; corpo non incluído aquí — gardado polo Director.)

Sub-fase F11.3c, dúas partes nun patch:

**Parte A (@react):** atenuar o `<image>` (badge raster) cando o estado do
nodo é `'locked'`. Filter aplicado: `grayscale(1) brightness(0.5)`. Só a
imaxe — o anel, o glyph, e o `<text>` (emoji) non se tocan. O union
`NodeState` non inclúe 'incompatible' (esa categoría calcúlase fóra do
motor, no exemplo, por exclusións), polo que se atenúa só con
`state === 'locked'`.

**Parte B (examples/react-demo/theme.ts):** o `background` do tema demo
cambia de `'transparent'` a un shorthand con `linear-gradient` + `url('/bg/fondo.png')`
para mostrar a textura escura detrás da árbore co dourado lexíbel. **Plan A**
aplicable (o tipo `colors.background` acepta o shorthand completo, compila
limpo). Plan B (CSS + undefined no tema) non necesario.

F12 (vides curvas, conector intra-grupo orgánico) segue diferido.
