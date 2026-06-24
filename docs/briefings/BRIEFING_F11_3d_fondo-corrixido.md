# BRIEFING — F11.3d · Fondo do lenzo (corrixido)

(Briefing tracked; corpo non incluído aquí — gardado polo Director.)

Sub-fase F11.3d: arranxa o intento previo do fondo (F11.3c parte B)
corrixindo a causa raíz.

**Causa raíz identificada polo Director:** o fondo do `<svg>` en vivo
non sae do `dragonborn` estático en `theme.ts`. Sae de `App.tsx` ≈L96,
onde o tema construído dende `themeVals` inclúe `background:
themeVals.canvas`. SVGRenderer aplícao inline; o inline gaña ao CSS.

**Arranxo:**
1. App.tsx: omitir a clave `background` no obxecto colors (omitir, non
   poñer `undefined` — bloqueado por exactOptionalPropertyTypes).
2. styles.css: substituír `background: rgba(10, 8, 16, 0.6)` da regra
   `.canvas-zone > svg.yf-skill-tree` por `linear-gradient + url('/bg/fondo.png')`.

Toca SÓ `examples/react-demo` (App.tsx + styles.css). NON `@react`/`@core`.
F12 segue diferido. O control "Fondo do lenzo" do Theme Lab queda
inactivo nesta fase; volverá ser theme-aware en sub-fase futura cando
se introduza CSS var por preset.
