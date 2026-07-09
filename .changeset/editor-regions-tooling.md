---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
---

feat(editor): rexións — crealas, poboalas, borralas + fixture adversarial de tests (briefing 7.13)

Pecha a promesa escrita na propia pestana Tema ("Crear rexións
chegará coa ferramenta de rexións") e o círculo do Paladín-desde-cero:
xa se pode construír unha árbore completa (nodos, conexións, recursos,
identidade, e agora rexións) enteiramente dende o editor.

**`@yggdrasil-forge/editor-core`**:

- `toggleTag(tags, tag, present)` — helper headless puro. Engade/quita
  preservando orde e tags alleas; `[]` resultante → `undefined` (non
  deixar arrays baleiros no schema, mesma doutrina que `exclusions`).
- Fixture adversarial (`testing/adversarialFixture.ts`, `@internal`,
  só para tests): sen `coordinateBounds`, labels bilingües en TODOS os
  niveis, grupos `any`/`none` de prerequisites (as ramas que
  `buildConnect` non toca), `maxTier`+`costPerTier`, exclusions
  simétricas, `color` propio nun nodo, un nodo sen `position`, tags +
  dúas rexións. Pasa as dúas portas A.6.42 (safeParse + round-trip) no
  seu propio test. Non substitúe o panadeiro (dato "amable");
  complementa cubrindo o que este nunca exercitou.
- Tests: `toggleTag` (10), fixture adversarial (5), rexións CRUD via
  `setMetaField('theme', …)` + sonda de fluxo completa (crear rexión →
  asignar a 2 nodos nunha soa transacción → borrar rexión → tags
  intactos → undo ×2 paso a paso).

**`@yggdrasil-forge/editor-react`**:

- `ThemePanel` §3 Rexións v2: "Engadir rexión" (id libre via
  `nextFreeId`, cor da rotación de paleta distinguible), etiqueta
  editable, "Eliminar" (quita SÓ o tinte — os `tags` dos nodos NON se
  tocan, mesma doutrina que ao borrar un recurso en 7.12: nada de
  cascadas silenciosas sobre semántica). Con selección ≥1 nodo, cada
  fila gaña "Asignar á selección"/"Quitar da selección" — unha soa
  transacción, un só undo.
- `InspectorPanel` de nodo gaña sección "Rexións" (tras os grupos do
  registry): checkbox por rexión definida, marcado ⇔ `node.tags`
  contén o `tag`. Sen rexións definidas: mensaxe cruzada á pestana
  Tema.
- `useSelectedRefs` extraído a ficheiro propio (`inspector/useSelectedRefs.ts`)
  — era privado de `InspectorPanel`, agora compartido con `ThemePanel`.
- Tests: 19 en `ThemePanel.test.tsx` (+13 novos), 15 en
  `InspectorPanel.test.tsx` (+5 novos) — fila nova ao engadir, botóns
  de selección só con selección, checkbox dispara o dispatch correcto,
  mensaxes cruzadas nos dous sentidos.
