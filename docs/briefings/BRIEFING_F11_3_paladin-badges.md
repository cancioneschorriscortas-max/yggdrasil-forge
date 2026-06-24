# BRIEFING — F11.3 · Vestir o Paladín cos badges (en vivo)

(Briefing tracked; corpo non incluído aquí — gardado polo Director.)

Sub-fase F11.3: dúas partes.

**Parte A (@react):** `SkillNode.tsx` amplía a detección de `iconIsUrl` para
aceptar tamén rutas locais (/, ./, ../), `data:` URIs, e extensións de imaxe
recoñecidas. Os ids de glyph rexistrados séguense resolvendo a `IconGlyph`;
emoji/texto non-imaxe segue caendo a `<text>`. Regresión `http(s)://`/`//` cero.

**Parte B (examples/react-demo):** os 13 nodos de skill da árbore do Paladín
gañan o seu `icon: '/badges/<id>.webp'` correspondente (a 13 ficheiros
`public/badges/<id>.webp` xa están no repo desde `ce8ac25`). Recursos
(faith/piety/skill-points/level) e raíz non se tocan. `dark-pact` mantén
`color` (A.6.17).

Fóra de alcance: o fondo do lenzo (`fondo.png`) → F11.3b.
