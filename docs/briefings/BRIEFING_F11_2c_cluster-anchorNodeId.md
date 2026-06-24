# BRIEFING — F11.2c · `memberLayout: 'cluster'` + `anchorNodeId` (estilo camareiro)

(Briefing tracked; corpo non incluído aquí — gardado polo Director.)

Sub-fase F11.2c: terceiro modo intra-grupo do motor `clustered-radial`.

- `memberLayout: 'cluster'`: áncora no punto-de-grupo (onde remata o
  spoke coroa→grupo), satélites a `orbitRadius` repartidos en arco
  `clusterArc` centrado na dirección radial saínte (honra
  `growOutward`).
- `GroupDef.anchorNodeId?: string`: campo aditivo opcional para
  designar o membro áncora. Fallback ao primeiro membro se ausente,
  inválido ou non-membro.
- `clusterArc?: number` no Config; default π (semicírculo).
- `'fan'` e `'list'` intactos — regresión cero.
- Conector intra-grupo orgánico (a teia do camareiro) NON se emite;
  os cross-links son edges de DATO. Panadeiro sen edges intra-grupo →
  áncoras + satélites soltos (correcto, esperado).

Cero renderer, cero exemplos.
