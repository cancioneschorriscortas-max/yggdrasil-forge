---
'@yggdrasil-forge/editor-core': patch
'@yggdrasil-forge/editor-react': minor
---

**7.5f — Editor de custo por rango (`costPerTier`) + polish do Inspector**

- Novo sub-editor `CostPerTierEditor` en `@editor-react` para
  `NodeDef.costPerTier`. Substitúe o `StructuredSummaryWidget` que
  antes servía como resumo só-lectura. Cada fila = un rango; unha
  fila sen custos = gratis nese rango. Botón «Quitar» a nivel de
  campo → borrar `costPerTier` (todos os rangos volven ao Custo
  base).
- Novos helpers headless en `@editor-core`: `costPerTierRowsFor`,
  `packCostPerTier`, `rankLabel`, `COST_PER_TIER_STRINGS`, tipo
  `CostPerTierRow`. **Semántica densa** (adendo do Arquitecto): o
  editor autora sempre arrays densos, sen sparse nin `null`. O
  runtime `ResourceManager` distingue `perTier[i]===undefined` vs
  `[]` **en memoria**, pero o schema Zod é denso-only e JSON non
  representa sparse. O subconxunto autorable = o persistible.
- Describe do descriptor `color` menciona a precedencia sobre o
  recheo por estado do tema (fleco A.6.17 pechado).
- Polish do `StructuredSummaryWidget`: retirada a nota vella
  «· edición en 7.5c-ii», substituída por «· só lectura» (o widget
  agora é fallback puro para `tiers` UNIMPLEMENTED).
- Fixture panadeiro con `resources: [{ id: 'fariña' }]` e nodo
  `masa_dulce` con `maxTier: 3` + `costPerTier` demo (1/2/3
  fariñas), para que a demo abra co widget cheo.
