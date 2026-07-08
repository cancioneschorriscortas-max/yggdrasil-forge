---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
---

feat(editor): creación v1 — nodos, conexións, borrado (briefing 7.11)

O editor pasa de "edita pero non constrúe" a permitir construír unha
árbore enteira desde cero (xunto co Gardar/Abrir de 7.10).

**`@yggdrasil-forge/editor-core`** — novos composites headless
(`command/composites.ts`), funcións puras que devolven `Command[]`
para unha transacción, testables sen DOM:

- `nextFreeId(existing, prefix)` — primeiro id libre, salta ocos.
- `buildNewNode(doc, position)` — nodo `small` por defecto nun punto.
- `buildConnect(doc, sourceId, targetId, opts)` — aresta `dependency`;
  rexeita self-loop e duplicado exacto (`[]`); con
  `opts.withPrerequisite`, fusiona `node_unlocked(source)` no
  `prerequisites` do destino seguindo 5 regras (sen regra → simple;
  simple → envolve en `all`; grupo `all` → engade; grupo `any`/`none`
  → non toca; dedupe se xa existe).
- `buildRemoveCascade(doc, nodeIds, edgeIds)` — borrado con cascada
  COMPLETA: arestas conectadas, poda de referencias en `exclusions` e
  `prerequisites` (todas as variantes con `nodeId`, incluído
  `distance_max.fromNodeId`) doutros nodos, e por último os propios
  nodos. Todo nun só array de Commands (unha transacción, un undo).

27 tests + probe de fluxo círculo-completo (crear→conectar→canUnlock
reflicte→borrar cascada→undo ×3) máis 5 tests do probe A.6.42
(documento baleiro) xa entregados en 7.10.

**`@yggdrasil-forge/editor-react`**:

- Novo `FileMenu`-like `CanvasToolbar`: overlay dentro do panel
  Canvas (esquina superior esquerda) con tres tools —
  **Seleccionar** (`V`) · **Engadir nodo** (`N`) · **Conectar** (`C`).
  Chip "Crear requisito" (marcado por defecto) só visible coa tool
  Conectar. Só en Autoría (oculta en Proba, mesmo patrón que
  Inspector/Tema).
- `EditorCanvas` estende a máquina de punteiro existente (7.5b-ii):
  - **Engadir nodo**: clic en baleiro crea+selecciona; clic en nodo
    existente só selecciona (evita solapado).
  - **Conectar**: primeiro clic (orixe) → liña fantasma escalada co
    CTM (segue o cursor) → segundo clic (destino) → despacha
    `buildConnect`. Clic en baleiro ou Esc cancela.
  - **Supr/Delete** (tool Seleccionar): despacha `buildRemoveCascade`
    sobre a selección actual (nodos e/ou arestas).
  - Atallos de teclado non se interceptan mentres se escribe nun
    input/textarea/contentEditable. Esc sempre volve a Seleccionar e
    cancela calquera xesto en curso (drag/marquee/connect).
  - Drag-de-mover e marquee seguen SÓ coa tool Seleccionar.
- `InteractionController` de 7.3 queda deliberadamente latente (banco
  documentado xa en 7.5b-ii); esta xeira usa a máquina local.
- Tests: renderizado condicional da toolbar, cambio de tool (clic +
  atallos V/N/C), chip contextual, Esc, oculta en Proba, Supr sobre
  selección xa existente. **Nota honesta (A.6.40)**: clic-en-canvas
  para Engadir nodo/Conectar non se testea a nivel de compoñente —
  jsdom non ten `PointerEvent` como construtor global e
  `fireEvent.pointerDown` non propaga `clientX/Y` baixo jsdom (mesma
  limitación xa documentada en `EditorCanvas.dragFlow.test.ts` para o
  drag). Esa lóxica xa está exhaustivamente cuberta en
  `composites.test.ts`; o xeométrico fino queda para o gate visual do
  dono.
