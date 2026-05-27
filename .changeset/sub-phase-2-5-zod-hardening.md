---
'@yggdrasil-forge/core': minor
---

Sub-phase 2.5 — hardening do `treeDefSchema` (Zod) na fronteira. Engade as 10 validacións pendentes documentadas durante a Fase 2, sen romper APIs e sen tocar pezas do motor.

**Validacións por campo (no `nodeDefSchema` e `costSchema`)**:
- `maxTier > 0` (`.positive('maxTier debe ser maior que 0')`).
- `tier > 0` (`.positive('tier debe ser maior que 0')`).
- `cost.amount > 0` (`.refine`).
- `progressMilestones[i]` ∈ `[0, 100]` (`.refine`).
- `progressMilestones` ordenado estrictamente ascendente sen duplicados (`.refine`).

**Validación cross-field (no `nodeDefSchema` enteiro, `.refine` despois do `z.object`)**:
- Se `progressSource` está definido, `supportsProgress` debe ser `true`.

**Validacións cross-node (no `treeDefShapeSchema.superRefine`)**:
- `progressSource.computed.dependsOn[j]` apunta a un nodo existente. Path: `['nodes', i, 'progressSource', 'dependsOn', j]`.
- `prerequisites` (recursivo sobre `UnlockRule`, incluíndo combinadores `all`/`any`/`none` e condicións `node_unlocked`/`node_maxed`/`node_state`/`tier_min`/`progress_min`/`distance_max`/`stat_min`) referencia nodos/stats existentes. Path: `['nodes', i, 'prerequisites', ...]`.
- `exclusions[j]` referencia nodos existentes. Path: `['nodes', i, 'exclusions', j]`.
- `edges[i].source` e `edges[i].target` referencian nodos existentes. Path: `['edges', i, 'source'|'target']`.

**Out of scope (deliberate)**:
- Cero `ErrorCode` novo: reutiliza `INVALID_TREE_DEF` (YGG_V001). Cero cambios en `@yggdrasil-forge/common`.
- Cero modificación de pezas do motor (decisión §5.1 do briefing): `TreeEngine`, `ProgressManager`, `EffectsRunner`, `StatComputer`, `UnlockResolver`, `TimeManager`, `JsonSerializer` e `TreeDefValidator` quedan intocados. `JsonSerializer.fromJSON` xa delega no validador, polo que herda automaticamente as validacións novas sen tocar código.
- Cero modificación de `packages/core/src/types/` nin de `engine/index.ts`.
- Cero detección de ciclos en `prerequisites`/`dependsOn` (§5.5 do briefing): asignada a fase pedagóxica posterior (8.7); o motor segue defensivo en runtime.

**Asimetría deliberada validador-motor (§5.1)**:
- Entrada externa (`validateTreeDef`, `JsonSerializer.fromJSON`) rexeita `TreeDef` inválidas.
- Construción directa de `TreeDef` en código (uso típico en tests unitarios) non pasa polo validador; o motor mantén comportamento defensivo interno.

**Notas sobre o contrato real de `EdgeDef`**: o briefing menciona `edges.from/to` por analoxía; o contrato (`types/edge.ts`) usa `source` e `target`, e así se sinala nos `path` dos issues.

**Test additions**: 22 tests novos en `TreeDefValidator.test.ts` (10 positivos + 10 negativos das validacións 1-10, máis 2 extra para cubrir ramas `distance_max` e `stat_min` do helper recursivo). Tests do paquete `core`: 854 → 876. Cobertura: `treeDefSchema.ts` 95.83/89.06/94.44/98.83; global 98.13% (vs baseline 2.4.e 98.22%; lixeira baixa explicada por ramas defensivas do helper recursivo de Zod que non se exercen).
