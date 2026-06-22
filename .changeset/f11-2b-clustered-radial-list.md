---
"@yggdrasil-forge/core": minor
---

feat(core): `clustered-radial` memberLayout `'list'` (F11.2b). Engade a `ClusteredRadialConfig` o campo opcional `memberLayout: 'fan' | 'list'` (default `'fan'`, equivalente ao comportamento de F11.2a). En modo `'list'`, os membros de cada grupo cólganse nunha columna vertical cara abaixo desde o punto-de-grupo, con separación configurable via `rowGap` (default 64). Inclúe anti-colisión automática que auto-expande `groupRadius` se algunha columna chegaría ao centro (controlable con `centerClearance`, default `= rowGap`). Modo `'cluster'` (orgánico) diferido a sub-fase posterior. Conector intra-grupo (vide curva) diferido a F12 (renderer).
