---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/react': minor
---

feat(core): LayeredLayout — motor de capas para DAGs (Sugiyama-lite)

Novo `LayoutEngine` tipo `'layered'`: capa = camiño máis longo desde as
raíces (tódolos pais quedan arriba), orde intra-capa por baricentro con
3 pasadas e desempates deterministas por orde de declaración. Para
nodos con varios pais evita as arestas diagonais cruzadas do tree
(que só usa o "primary parent"). Ciclos → `err(CYCLE_DETECTED)` cos
nodos culpables no context — nunca colga nin coloca lixo.
`parseLayeredConfig` + `LayeredLayoutConfig` (espello da config de
tree). Rexistrado en `createDefaultLayoutRegistry` de @react.
