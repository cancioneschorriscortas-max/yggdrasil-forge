---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/react': minor
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
---

feat: imaxes en nodos — recorte á forma real + zoom regulable con barra

Pedido do dono mentres probaba o Paladín: cargar unha foto nun nodo
xa funcionaba a medias (`node.icon` xa soportaba URLs), pero a imaxe
nunca se axustaba "dentro" da esfera/cadrado/hexágono real do nodo —
quedaba coma un cadrado centrado con marxes baleiras
(`preserveAspectRatio="meet"`), sen recortar á forma.

**`@yggdrasil-forge/core`** — novo campo `NodeDef.iconScale?: number`
(1–3, validado no schema Zod). 1 = a imaxe cobre a forma enteira sen
zoom extra (comportamento por defecto); ata 3 = achega moito máis
(recorta máis) para encadrar a parte interesante dunha foto non
cadrada. Só ten efecto sobre iconas de imaxe (URL); glyphs/emoji
ignórano.

**`@yggdrasil-forge/react`** — `SkillNode` recorta agora a imaxe á
forma REAL do nodo (círculo/hexágono/diamante/...) vía `<clipPath>`
que reutiliza a mesma xeometría de `renderNodeShape` (cero duplicación
de lóxica de forma). `preserveAspectRatio` pasa de `"meet"` (cabe con
marxes) a `"slice"` (cobre e recorta). O clip usa sempre o `radius`
real do nodo, así que a imaxe NUNCA escapa do contorno por moito zoom
que se lle poña — mesmo cun `iconScale` de datos importados á man que
saltase o límite do schema.

**`@yggdrasil-forge/editor-core`** — novo `PropertyType.kind: 'range'`
(barra de axuste continuo, min/max obrigatorios). Descriptor
`iconScale` no `nodePropertyRegistry` (grupo `appearance`, avanzado).
Engadido a `USED_NODEDEF_FIELDS` (uso real xa confirmado no
renderer).

**`@yggdrasil-forge/editor-react`** — novo `RangeWidget` (slider con
valor numérico ao carón, commit inmediato en cada arrastre, coma
`CheckboxWidget`). Dispatch de `kind:'range'` engadido a
`InspectorPanel`.

Tests: schema (5, incl. límites 1/3), `SkillNode` clip-path + slice +
iconScale (10 novos, +cero regresión nos 26 existentes de iconas),
Inspector (3 novos: render en Avanzado, dispatch inmediato, límites
min/max). Dous contadores exactos preexistentes actualizados
(campos avanzados 7→8, tamaño total do registry 14→15) — cambio
lexítimo, non regresión.
