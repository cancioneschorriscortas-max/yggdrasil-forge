---
"@yggdrasil-forge/core": minor
---

feat(core): `clustered-radial` `memberLayout: 'cluster'` + `GroupDef.anchorNodeId` (F11.2c). Terceiro modo intra-grupo do motor clustered-radial, estilo "camareiro": a áncora do grupo colócase no punto-de-grupo (a `groupRadius` do centro, onde remata o spoke coroa→grupo) e os demais membros (satélites) orbitan a `orbitRadius` da áncora nun arco `clusterArc` centrado na dirección radial saínte (honra `growOutward`). A áncora resólvese leendo `GroupDef.anchorNodeId` se é membro válido do grupo, ou fallback ao primeiro membro. Engade o campo opcional `anchorNodeId?: string` a `GroupDef` (cambio aditivo) e amplía a unión `memberLayout` con `'cluster'`. Os cross-links intra-grupo son edges de dato (posiciónaos `computeEdges`); o motor non emite mesh intra-grupo. `'fan'`/`'list'` idénticos.
