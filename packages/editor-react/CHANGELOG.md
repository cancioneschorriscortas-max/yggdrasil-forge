# @yggdrasil-forge/editor-react

## 0.1.0

### Minor Changes

- 7b79150: **7.5f — Editor de custo por rango (`costPerTier`) + polish do Inspector**

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

- b9da309: feat(editor): creación v1 — nodos, conexións, borrado (briefing 7.11)

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

- c59ea73: feat(editor): tema escuro do chrome + selector claro/escuro (briefing 7.8)

  **Paleta escura refrescada** (`tokens.css`, `[data-editor-theme="dark"]`):
  fondo case-negro profundo (`#16171b`/`#0f1013`/`#131418`), paneis
  lixeiramente máis claros, texto gris-claro, acento azul (`#3b82f6`).
  Comparación completa cos tokens do bloque claro — sen orfos. Os alias
  xerais (`--editor-accent`, `--editor-border`) seguen a mesma
  equivalencia documentada que xa tiña o bloque claro (mesmo que
  `authoring`/`strong`, respectivamente).

  **Selector claro/escuro no TopBar**: switch compacto (☀/🌙) á
  esquerda do toggle Autoría/Proba, `role="switch"` + `aria-checked` +
  `aria-label="Tema escuro"`. Só se renderiza se `EditorShell` recibe a
  prop `theme`.

  **Wiring controlado desde a app** (fronteira limpa biblioteca/app):
  `EditorShell` gaña `theme?: 'light' | 'dark'` e
  `onThemeChange?: (theme) => void`, reenviados ao TopBar. A biblioteca
  NON toca `document` nin `localStorage` — iso é responsabilidade da
  app consumidora (ver `examples/editor/src/main.tsx`: estado do tema,
  persistencia en `localStorage` baixo `ygg-editor-theme`, aplicación a
  `document.documentElement.dataset.editorTheme`).

  **Anti-flash** en `examples/editor/index.html`: script que le o tema
  gardado antes de que cargue React/CSS, máis un bloque `<style>` de
  fallback consciente do tema, para evitar un flash claro ao arrincar en
  escuro.

  **Cobertura dockview**: revisadas as vars `--dv-*` non mapeadas —
  confirmado que as non cubertas son ou ben internas doutros temas de
  dockview non usados (abyss/gh/mocha/monokai/nord/sol) ou translúcidas
  por deseño (sash, drag-over, scrollbar), sen risco visual adicional
  sobre o traballo xa feito en 7.5e (grupo/tabs/separadores).

  **Fóra de alcance (explícito no briefing):** logo/iconas novas no TopBar,
  texto "Panels" en inglés, lupa de zoom, `prefers-color-scheme`
  automático, refactor do duplicado `shell.css`/`styles.css`.

  ***

  **7.8.1 → 7.8.2 (mesma sub-fase, tras revisión):** o texto dos nodos no
  canvas (label + número de progreso + etiquetas de rexión) collía
  sempre `#222222` do tema base `minimal` de `@yggdrasil-forge/react`,
  sen relación ningunha co tema do chrome — invisible en escuro se o
  documento non define un `ThemeSpec` propio (caso da fixture
  panadeiro).

  Primeira pasada (7.8.1) engadiu só unha heurística automática en
  `EditorCanvas` (adiviñar texto claro/escuro segundo `chromeTheme`).
  Correcto pero insuficiente: o autor non tiña forma DIRECTA de fixar a
  cor el mesmo. 7.8.2 completa a peza que faltaba:

  - **`ThemeSpec.textColor?: string`** (novo campo, `editor-core`) —
    control directo do autor sobre a cor de texto/iconas dos nodos.
  - **Prioridade de resolución** en `EditorCanvas`: `textColor` explícito
    do documento GAÑA sobre a heurística de `chromeTheme`, que só actúa
    cando o autor non fixou nada.
  - **UI na pestana Tema** (`ThemePanel`): nova fila "Texto e iconas" co
    mesmo `ColorWidget` que xa usan os recheos por estado, máis un botón
    "Automático" que aparece só cando hai un valor fixado e o quita
    (volve á heurística).
  - Tests: prioridade explícito > heurística (en ambas direccións),
    dispatch do campo, aparición condicional e funcionamento do botón
    "Automático".

- 7c9bf01: feat(editor): rexións — crealas, poboalas, borralas + fixture adversarial de tests (briefing 7.13)

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

- 834c632: feat(editor): Gardar / Abrir — o editor pasa de demo a ferramenta (briefing 7.10)

  **`@yggdrasil-forge/editor-react`** — `EditorShell` gaña prop opcional
  `documentActions?: { onNew?, onImport?, onExport? }`. Se se pasa (con
  polo menos unha entrada), o TopBar renderiza un dropdown "Ficheiro"
  (mesmo compoñente/estilo que "Paneis", colocado antes del) con **Novo**
  · **Importar JSON…** · **Exportar JSON**. Cada entrada chama o seu
  callback e pecha o menú; entradas ausentes non se renderizan. A
  biblioteca non fai I/O nin toca o DOM global — só UI + callbacks (mesma
  fronteira que co tema e o layout).

  **`examples/editor`** — `main.tsx` reestruturado: o motor xa non se
  crea a nivel de módulo, vive en estado de React. Substituír o
  documento (Novo/Importar) crea un `EditorEngine` novo e remonta o
  `EditorShell` (`key={docEpoch}`), para que selección/undo/sesión de
  proba nazan limpos; a disposición de paneis non se perde (persiste en
  localStorage por 7.7, independente do motor). Exportar usa `toJson` +
  `Blob` + `<a download>`; Importar le un ficheiro local con
  `FileReader` + `deserializeDocument`, con confirmación antes de
  substituír e mensaxe clara se o JSON é inválido (documento actual
  queda intacto). Sen backend, sen localStorage do documento (é dato do
  usuario, non do navegador).

  **`@yggdrasil-forge/editor-core`** — novo test headless
  (`emptyDocumentProbe.test.ts`, probe A.6.42 esixido polo briefing
  antes de tocar UI): confirma que unha árbore baleira (`nodes: []`,
  `edges: []`) inicializa `EditorEngine` sen errors duros, fai
  round-trip completo (incluíndo variante con `theme`+`costPerTier`+
  `resources` xuntos, gap non cuberto por tests existentes), e que JSON
  inválido/incompleto devolve `Result.err` con mensaxe. Sen cambios de
  API — só test novo.

- ab45275: feat(editor): Inspector de árbore — identidade + recursos (briefing 7.12)

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

- e2e9df4: feat: imaxes en nodos — recorte á forma real + zoom regulable con barra

  Pedido do dono mentres probaba o Paladín: cargar unha foto nun nodo
  xa funcionaba a medias (`node.icon` xa soportaba URLs), pero a imaxe
  nunca se axustaba "dentro" da esfera/cadrado/hexágono real do nodo —
  quedaba coma un cadrado centrado con marxes baleiras
  (`preserveAspectRatio="meet"`), sen recortar á forma.

  **`@yggdrasil-forge/core`** — novo campo `NodeDef.iconScale?: number`
  (1–3, validado no schema Zod). 1 = a imaxe cobre a forma enteira sen
  zoom extra (comportamento por defecto); ata 3 = achega moito máis
  (recorta máis) para encadrar a parte interesante dunha foto non
  cadrada. Só ten efecto sobre iconas de imaxe (URL); glyphs/emoji
  ignórano.

  **`@yggdrasil-forge/react`** — `SkillNode` recorta agora a imaxe á
  forma REAL do nodo (círculo/hexágono/diamante/...) vía `<clipPath>`
  que reutiliza a mesma xeometría de `renderNodeShape` (cero duplicación
  de lóxica de forma). `preserveAspectRatio` pasa de `"meet"` (cabe con
  marxes) a `"slice"` (cobre e recorta). O clip usa sempre o `radius`
  real do nodo, así que a imaxe NUNCA escapa do contorno por moito zoom
  que se lle poña — mesmo cun `iconScale` de datos importados á man que
  saltase o límite do schema.

  **`@yggdrasil-forge/editor-core`** — novo `PropertyType.kind: 'range'`
  (barra de axuste continuo, min/max obrigatorios). Descriptor
  `iconScale` no `nodePropertyRegistry` (grupo `appearance`, avanzado).
  Engadido a `USED_NODEDEF_FIELDS` (uso real xa confirmado no
  renderer).

  **`@yggdrasil-forge/editor-react`** — novo `RangeWidget` (slider con
  valor numérico ao carón, commit inmediato en cada arrastre, coma
  `CheckboxWidget`). Dispatch de `kind:'range'` engadido a
  `InspectorPanel`.

  Tests: schema (5, incl. límites 1/3), `SkillNode` clip-path + slice +
  iconScale (10 novos, +cero regresión nos 26 existentes de iconas),
  Inspector (3 novos: render en Avanzado, dispatch inmediato, límites
  min/max). Dous contadores exactos preexistentes actualizados
  (campos avanzados 7→8, tamaño total do registry 14→15) — cambio
  lexítimo, non regresión.

- e795f26: **7.7 — Estabilidade das ventás (as 4 dores do Cliente Zero)**

  - **Menú «Paneis»** no TopBar (substitúe os presets Design/Tree/Testing
    disabled): dropdown propio con listaxe de paneis dispoñibles + marca
    ✓ para os visibles; clic alterna. Última entrada, separada:
    «Restaurar disposición». Peche por clic fóra ou Escape.
  - **Cambio de modo conserva a disposición**: eliminado `key={mode}` do
    `PanelHost`; ao cambiar `panels` prop, faise reconciliación
    engadir-antes-de-quitar. Cando engade un panel novo con `withinPanel`
    que xa non existe, procura un panel vivo co mesmo `defaultLocation`
    como pivot — así Inspector/Tema aterran no mesmo grupo onde estaba
    Proba e viceversa. Alternar Autoría↔Proba non destrúe grupos, tamaños
    nin reordenacións do usuario.
  - **Persistencia** por props na `EditorShell`:
    - `initialLayout?: SerializedDockview` — restaurada no `onReady`; se
      falla, invócase `onLayoutInvalid` (a app limpa o gardado) e cae ao
      default.
    - `onLayoutChange?: (layout) => void` — chamado debounced a 300 ms
      tras cada cambio. **Só en Autoría** (filtrado no shell). A biblioteca
      non toca localStorage — é decisión da app.
  - **`examples/editor` cablea** localStorage con clave versionada
    `ygg-editor-layout@v1`. Se cambia o conxunto/ids de paneis, bump da
    versión → layouts vellos ignorados sen crash.
  - **«Restaurar disposición»** reconstrúe o layout inicial (unha soa
    fonte de verdade en `buildDefaultLayout`) e sinala `onLayoutInvalid`
    á app para que limpe o gardado.
  - **Bug latente arranxado**: o `PanelHost` fixaba os callbacks
    (`onLayoutChange`, `onVisiblePanelsChange`) no `onReady` inicial e
    nunca os actualizaba. Agora usa refs → invoca sempre a versión máis
    recente. Isto era necesario para que o filtrado por modo do
    `EditorShell` tivese efecto.

  O `PanelHost` segue sendo o único importador de dockview (nova API
  imperativa a `SerializedDockview` inclusive). Cero cambios en `@core`,
  `@editor-core`.

- 6b6089e: fix(editor): `PanelHost` conserva identidade e tamaño real do grupo ao alternar Autoría↔Proba (7.7c)

  A reconciliación de paneis (engadir-antes-de-quitar, briefing 7.7) buscaba
  un panel vivo da mesma banda (`defaultLocation`) só dentro do conxunto
  NOVO de `panels`, que xa non inclúe os paneis que están a desaparecer
  (p.ex. `inspector`/`tema` ao entrar en Proba). Iso facía que nunca
  atopase un candidato, caese sempre ao _fallback_ de posicionamento, e
  creara un **grupo dockview novo** en cada swap de modo en vez de
  reutilizar o existente — perdendo o axuste manual de tamaño do usuario
  e provocando recálculos erráticos das proporcións veciñas (o grupo
  esquerdo tamén se via afectado).

  Arranxo: a reconciliación agora busca sobre a **unión** dos `PanelDef`
  anteriores e novos, así atopa o panel vivo da banda aínda que xa non
  estea no conxunto novo. Ademais, captura o `width`/`height` real de
  cada grupo vivo (por `group.id`, estable mentres o grupo non queda
  baleiro) antes de engadir/quitar, e reaplícao despois — belt-and-suspenders
  sobre a identidade xa corrixida.

  Sen cambios de API pública.

- c2a6e2b: **7.6 — Modo Proba (o toggle deixa de mentir)**

  O toggle Autoría/Proba pasa a **gobernar** a experiencia, non só cambiar
  a cor da barra. Entrar en Proba crea unha **sesión de xogo real** sobre
  a árbore actual (novo `TreeEngine`) que permite desbloquear nodos,
  gastar recursos e ver estados en acción **sen tocar o documento**. Saír
  descártaa; volver entrar dá unha nova sesión fresca.

  - Novo hook `useProbaSession(engine, mode)` — devolve un `TreeEngine`
    fresco cando `mode === 'preview'`; `null` en Autoría. Ten `reset()`
    para descartar e recrear a sesión.
  - Novo `ProbaPanel`: cabeceira con badge «en vivo», recursos con
    botóns `+` / `−` (via `grantResource`), ficha do nodo seleccionado
    con condicións (`explainUnlock`), custo do próximo rango con
    afordabilidade, botón «Desbloquear» / «Subir rango» gated por
    `canUnlock`, e «Reiniciar proba».
  - `EditorCanvas` acepta `probaSession?`. Con sesión: SkillTree
    renderiza co runtime da sesión (estados vivos, temas locindo);
    drag/marquee desactivados; clic segue seleccionando para a ficha;
    pan/zoom intactos.
  - `EditorShell` cambia os paneis por modo — en Proba só se ve «Proba»
    no grupo dereito; en Autoría, Inspector | Tema. `key={mode}` no
    PanelHost forza reset do layout de dockview.
  - TopBar: toggle localizado («Autoría» / «Proba»); undo/redo do
    documento ocúltanse en Proba (o seu «undo» é «Reiniciar proba»).
  - StatusBar: modo localizado.

  Cero cambios en `@core` e `@editor-core`. O motor xa daba todo o
  necesario (`canUnlock`, `explainUnlock`, `unlock`, `grantResource`,
  `getBudget`, `getNodeState`).

- 416df9a: feat(react,editor): base de tema `minimalDark` + arranxo de raíz da costura chrome↔documento (briefing 7.9)

  **Contexto:** o tema `minimal` (base por defecto cando o documento non
  opina) asume fondo claro en TODAS as súas cores. O editor agora pode
  poñer fondo escuro (7.8) — cada cor fixa de `minimal` era un bug
  latente en escuro, xa detectado dúas veces (texto en 7.8.1/7.8.2,
  arestas/malla pendentes segundo o informe de sesión).

  **`@yggdrasil-forge/react`** — novo tema `minimalDark`, exportado
  xunto a `minimal`. Mesma forma (`Theme`), `sizes` idénticos a
  propósito (non hai motivo para que radios/font-sizes cambien só por
  mudar de fondo). Cores de estado (`nodeMaxed`, `nodeInProgress`)
  comparten valor con `minimal` — xa funcionan en ambos fondos; o resto
  (`text`, `nodeStroke`, `edge`, `edgeActive`, `mesh`, `nodeFill`,
  `nodeLocked`, `nodeUnlockable`) ten valores propios para fondo escuro.

  **`@yggdrasil-forge/editor-react`** — `EditorCanvas` xa non aplica
  unha heurística ad-hoc só para o campo `text` (a que se engadira en
  7.8.1/7.8.2). Agora escolle a BASE ENTEIRA do tema segundo
  `chromeTheme`: `minimalDark` en escuro, `minimal` en claro/sen
  definir. Arestas, malla, trazos e recheo base tamén len ben en escuro
  agora, non só o texto. Os overrides explícitos do documento
  (`ThemeSpec.textColor`, `nodeFills`) seguen gañando sempre sobre a
  base escollida — comportamento visible idéntico ao anterior para
  quen xa usaba `textColor`.

  Verificado que é o único punto de construción de tema en todo
  `editor-react` (ningunha outra rama usaba `minimal` a pelo). Tests
  adaptados (non borrados) para cubrir o mesmo contrato: base correcta
  segundo chrome, override do documento gaña, arestas confirman que o
  arranxo é da base enteira e non un parche de campo.

### Patch Changes

- 6b5dcaf: **Fix 7.7 — Inspector activo por defecto no seu grupo**

  O default layout facía que Tema (o último panel engadido no grupo
  `within: inspector`) quedase como pestana activa, obrigando o usuario
  a facer clic en Inspector cada apertura. Corríxese usando
  `addPanel({ inactive: true })` para os paneis engadidos como
  pestana `within` outro — así o panel referenciado conserva o foco.

  Aplícase tanto no `buildDefaultLayout` (arranque limpo) como na
  reconciliación de `addPanelSmart` (swap Autoría↔Proba mantén Inspector
  como pestana activa cando Tema reaparece).

- 8db6249: **7.7b — As ventás á vontade do usuario (fix de defecto + tamaños)**

  Dous fixes complementarios sobre 7.7:

  - **Proporcións por defecto sas**: `buildDefaultLayout` aplica agora
    tamaños tras crear os paneis: 240 px para Estrutura (esquerda),
    340 px para o grupo dereito (Inspector | Tema), 180 px para
    Problemas (inferior). Canvas queda co resto. Antes non se
    especificaba nada e dockview repartía a partes iguais, deixando o
    panel dereito ~45 % da pantalla.
  - **Cinto de seguridade no beforeunload**: os cambios de tamaño ao
    arrastrar sashes disparan `onDidLayoutChange` de forma pouco fiable
    na versión 6.6.1 de dockview. Engádese listener global de
    `beforeunload` que flushea sincronamente o último `toJSON()` sen
    agardar o debounce (300 ms). Con isto, o F5 ou pechar leva sempre
    a última foto do layout, sexa cal sexa a fonte do cambio. O timer
    do debounce pendente cancélase para non duplicar. O filtrado por
    modo do `EditorShell` séguelle aplicando (o callback é o mesmo).

  Zero cambios en API pública. O `PanelHost` segue como único
  importador de dockview.

- 5dcb8b2: fix(editor): LocalizedTextWidget editaba `en`, o canvas amosaba `gl` — cambios invisibles en nodos novos

  **Reportado polo dono**: renomear un nodo creado coa tool Engadir nodo
  (7.11) "non se cambiaba" no canvas, aínda que o Inspector amosaba
  correctamente o novo nome ao reseleccionar o nodo.

  **Causa raíz**: `LocalizedTextWidget.pickEditableString` priorizaba a
  clave `en` ao editar un `LocalizedString` con varias locales. Pero o
  canvas (`SkillTree` → `computeLayout`) usa `locale='gl'` por defecto
  cando o consumidor non especifica ningunha — e `EditorCanvas` non o
  fai. Un nodo novo (`buildNewNode`, 7.11) nace con
  `{ gl: 'Novo nodo', en: 'New node' }`: editar no Inspector actualizaba
  `en`, pero o canvas seguía a renderizar `gl` (inalterado) — o cambio
  era invisible. Nodos importados adoitan ter só UNHA locale, por iso o
  bug non se detectara antes: 7.10/7.11 (Novo + crear nodos) foron os
  primeiros en abrir a ruta de nodos con AMBAS claves presentes desde o
  nacemento.

  **Fix**: `pickEditableString` prioriza `gl` (a locale que realmente se
  renderiza por defecto), aliñado co patrón `pickText` xa usado en
  `InspectorPanel`/`TreeInspector` e con `resolveLocalized`'s propio
  default.

  **Tests**: dous tests existentes que codificaban a asunción vella
  (`en`) actualizados; novo test de regresión explícito que reproduce o
  escenario exacto reportado (nodo con `{gl, en}`, editar, confirmar que
  a clave `gl` — a visible — leva o valor novo).

- Updated dependencies [30ce28f]
- Updated dependencies [7b79150]
- Updated dependencies [27b9f61]
- Updated dependencies [b9da309]
- Updated dependencies [c59ea73]
- Updated dependencies [7c9bf01]
- Updated dependencies [834c632]
- Updated dependencies [ab45275]
- Updated dependencies [e2e9df4]
- Updated dependencies [8597e50]
- Updated dependencies [416df9a]
- Updated dependencies [99d0d44]
- Updated dependencies [2eac199]
- Updated dependencies [5f41960]
- Updated dependencies [2a11e25]
  - @yggdrasil-forge/react@0.5.0
  - @yggdrasil-forge/editor-core@0.1.0
  - @yggdrasil-forge/core@0.5.0
