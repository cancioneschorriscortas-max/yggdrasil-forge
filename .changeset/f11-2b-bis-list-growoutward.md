---
"@yggdrasil-forge/core": minor
---

feat(core): `clustered-radial` `list` honra `growOutward`; elimina `effGroupRadius` (F11.2b-bis). En modo `memberLayout: 'list'`, a columna agora **irradia cara afóra** desde o punto-de-grupo (grupo por riba do centro → cara arriba; grupo por baixo ou no eixe → cara abaixo). É a primeira aplicación dun invariante explícito do contrato de auto-layout (A.1 `growOutward`), e fai obsoleto o anti-colisión `effGroupRadius`/`centerClearance` introducido en F11.2b. O campo `centerClearance` elimínase do `ClusteredRadialConfig`. `'fan'` (default) idéntico. `'cluster'` segue diferido.
