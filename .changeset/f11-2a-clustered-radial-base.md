---
"@yggdrasil-forge/core": minor
"@yggdrasil-forge/react": minor
---

feat(core+react): novo motor de layout `clustered-radial` (base común, F11.2a). Coloca a raíz no centro da árbore, os grupos repartidos en radial uniforme arredor dela, e os membros de cada grupo nun abano placeholder cara afóra. Xera mesh `spokes` centro→grupo por defecto (esqueleto da estrela cando non hai edges semánticos). Rexístrase no default registry de `@react`. Esta é a BASE común para F11.2b (memberLayout: list/cluster) e F11.2c (anchorNodeId real); 2a non implementa esas variantes.
