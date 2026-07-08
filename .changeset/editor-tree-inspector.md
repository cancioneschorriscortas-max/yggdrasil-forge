---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
---

feat(editor): Inspector de árbore — identidade + recursos (briefing 7.12)

Coa creación v1 (7.11) xa se poden construír nodos e conexións, pero
a árbore mesma seguía vindo de fábrica. Este arco pon o **Inspector
de árbore**: cando NON hai nodo seleccionado, o Inspector deixa de
dicir "Selecciona un nodo…" e pasa a editar a árbore — identidade e
recursos.

**`@yggdrasil-forge/editor-core`**:

- Novo comando `setTreeField<K>`, espello exacto de
  `setNodeField`/`setMetaField`. Cobre identidade
  (`label`/`description`/`author`/`version`) e `resources`.
- Novo `treePropertyRegistry` (property/) — mesmo principio que
  `nodePropertyRegistry` pero a nivel de árbore (`get(tree)`/`set(value)`,
  sen id). `id`/`schemaVersion` readonly (lanzan se se intenta escribir,
  mesmo patrón defensivo que o `id` de nodo).
- Novo validador soft `danglingResourceRefsValidator` (**`severity:
  'warning'`** — non `'error'`, decisión confirmada explicitamente
  tras detectar que `'error'` bloquearía a transacción de borrado,
  contradicindo a propia decisión de deseño do briefing: borrar un
  recurso en uso PERMÍTESE, só se avisa). Cobre `cost[].resourceId`,
  `costPerTier[][].resourceId`, e `resource_min` en `prerequisites` a
  calquera profundidade. Engadido a `createDefaultValidators()` (agora
  5 soft, non 4).
- Tests: `setTreeField.test.ts` (12), `danglingResourceRefs.test.ts`
  (9, incluíndo sonda de fluxo completa: engadir recurso → custo →
  borrar recurso → issue co nodeId correcto → undo → limpo).

**`@yggdrasil-forge/editor-react`**:

- Novo `TreeInspector`: sección Identidade (registry-driven, mesmo
  patrón que InspectorPanel) + sección Recursos (`ResourcesEditor`,
  editor estruturado propio: filas-tarxeta con Básico
  Etiqueta/Inicial/Máximo e Avanzado pregado
  Icona/Cor/Reembolsable/%reembolso). Id de recurso xerado con
  `nextFreeId` (dos composites de 7.11), readonly despois.
- `InspectorPanel` renderiza `TreeInspector` cando `selection` está
  baleira, en vez do placeholder anterior.
- Tests: `TreeInspector.test.tsx` (11) — render condicional (aparece
  sen selección, desaparece con nodo seleccionado, volve ao
  deseleccionar), edición de identidade, id/schemaVersion readonly,
  engadir/eliminar recurso co array correcto, id libre en filas novas.

**Lección de proceso**: o briefing orixinal especificaba
`severity: 'error'` para o validador de recursos colgantes,
contraditorio coa súa propia decisión de deseño ("permitir + avisar").
Verificado contra o código (`hasErrors` bloquea por calquera
`severity: 'error'`, veña de validador duro ou soft) antes de
implementar — corrixido a `'warning'` tras confirmación explícita.
