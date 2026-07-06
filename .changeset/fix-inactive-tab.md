---
'@yggdrasil-forge/editor-react': patch
---

**Fix 7.7 — Inspector activo por defecto no seu grupo**

O default layout facía que Tema (o último panel engadido no grupo
`within: inspector`) quedase como pestana activa, obrigando o usuario
a facer clic en Inspector cada apertura. Corríxese usando
`addPanel({ inactive: true })` para os paneis engadidos como
pestana `within` outro — así o panel referenciado conserva o foco.

Aplícase tanto no `buildDefaultLayout` (arranque limpo) como na
reconciliación de `addPanelSmart` (swap Autoría↔Proba mantén Inspector
como pestana activa cando Tema reaparece).
