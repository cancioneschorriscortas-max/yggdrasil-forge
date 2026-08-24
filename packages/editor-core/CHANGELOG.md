# @yggdrasil-forge/editor-core

## 1.0.0

### Major Changes

- Yggdrasil Forge 1.0 — motor de árbores de progresión, completo de punta a punta

  - **Renderer tematizable**: SkillTree SVG accesible con viewport, temas
    claro/escuro, recheos por estado, rexións, e tres sets de iconas
    recoloreables (builtin, norse, logic).
  - **Editor completo**: autoría visual (crear/mover/conectar), Inspector
    co rexistro de propiedades, validación en vivo, auto-layout con cinco
    motores, vista de tarxetas, presets de tema con nome, selector de
    iconas, modo Proba, exportación SVG/PNG, autosave e PWA offline.
  - **A vía do dato**: JSON Schema publicado, galería de ouro garantida
    por test, e o CLI `ygg` (validate · layout · render · schema · new) —
    unha IA xera unha árbore completa sen abrir o editor.
  - **Docs públicas bilingües** (galego primeiro): guías, contrato,
    layouts, theming e exemplos renderizados en cada build.

### Minor Changes

- b13974f: feat: selector visual de iconas no campo Icona (nodo e recurso)

  O banco de 7.19 cobra: novo `IconWidget` compartido — texto libre de
  sempre (emojis, URLs, ids á man: cero regresión) + preview en vivo +
  popover con busca instantánea, grella agrupada por set (Builtin /
  Norse / Lóxica / Outras), «Sen icona», teclado completo (frechas pola
  grella, Enter, Esc devolve o foco, Tab atrapado) e peche por clic
  fóra. `PropertyType` gaña `kind: 'icon'` (o dato segue sendo texto; a
  UI resolve o selector). Axe en verde co popover aberto.

- 31eecec: feat(editor-core): Zod para o namespace `editor` do ficheiro (7.15)

  Novos schemas públicos (`documentMetaSchema`, `themeSpecSchema`,
  `backgroundRefSchema`, `boundsSchema`, `themeRegionTintSchema`) que
  espellan os tipos TS do documento. `deserializeDocument` valida agora
  tamén o namespace `editor`: tipos errados nos campos coñecidos → `err`
  coa ruta do campo (ex. `editor.theme.nodeFills.locked`); claves
  descoñecidas do futuro consérvanse tal cal (passthrough,
  forward-compat). Contrato ampliado: se devolve `ok`, o documento
  ENTEIRO é san — árbore E meta.

- ba14f74: feat(editor-core): comando `replaceDocument` (7.15b)

  Novo comando que substitúe `tree` E `meta` dun golpe nunha soa
  transacción: **un undo devolve o documento anterior enteiro**. É a
  base do «Aplicar» do panel Código (pegar JSON dunha IA e convertelo
  en árbore como un único paso de historial). A selección debe limpala
  o chamador tras aplicar (os ids poden non existir no doc novo).

- ccfe428: feat(editor-core): `deriveClusterGroups` — derivación headless da vista de tarxetas (7.15c)

  TreeDef → grupos coa forma que pide a ClusterCardsView de @react (icon
  cru como string; resólvese na capa react). Pertenza dual (unión de
  `GroupDef.nodeIds` + `node.group`, sen duplicados, orde estable), nodos
  sen grupo nun «Sen grupo» sintético ao final (a vista nunca oculta
  contido), labels localizadas e rotación determinista de paleta para
  grupos sen cor. A fixture adversarial gaña `groups` coa pertenza dual
  mesturada (mellora de paso).

- a40dba3: feat(editor-core): `applyAutoLayout` — dispor headless (7.16)

  Executa un motor de layout de @core (radial / tree / clustered-radial /
  constellation) UNHA vez e devolve os comandos `moveNode` que cocen as
  posicións en `node.position` (decisión de deseño: cocer, non vivir).
  Configs por defecto derivadas do dato en `defaultLayoutConfigs`
  (`radius`/`groupRadius` calculados SEMPRE — lección A.6.9). Determinista;
  `err` propaga o erro do motor. A sonda A.6.9 queda como test permanente
  (4 algos × 3 árbores da galería → ok).

- 0fc56ff: feat(editor-core): helpers de render — `themeOverridesFromSpec` + `standaloneSvg` (7.17)

  - `themeOverridesFromSpec(spec, dark)`: o mapeo `meta.theme → overrides
de ThemeColors` extraído de EditorCanvas SEN cambio de comportamento,
    para que o CLI e calquera consumidor headless o compartan.
  - `standaloneSvg(markup, opts)`: autocontención dun SVG de árbore
    (xmlns, width/height deterministas do viewBox, rect de fondo, fonte
    embebida, cero `var(--…)` — erro honesto se as hai). A ÚNICA fonte
    para o export do editor e para `ygg render`.

- 2a7aafc: feat: «Capas (para DAGs)» en Dispor + axuda por algoritmo + ygg layout --algo layered

  `layered` únese á vía do dato completa: `AutoLayoutAlgo` e config por
  defecto (90/130, espello de tree) en editor-core; entrada no menú
  Dispor e no convite en editor-react, agora cunha liña de axuda por
  algoritmo (cada un di a súa condición de uso); `--algo layered` no CLI.
  O panadeiro da galería queda recolocado con layered como canónico do
  caso multi-pai. O schema publicado xa admitía `layered` (layout.type é
  aberto por deseño): sen drift.

- ca29e3b: feat: presets de tema con nome — Pergamiño, Néon e Bosque únense a Tintado/Neutro

  Os presets saen do ThemePanel e pasan a dato en
  `@editor-core/themePresets` (`THEME_PRESETS`: id + label localizada +
  spec COMPLETO co preset anotado). Tintado e Neutro migran tal cal
  (cero cambio visual; os tests do 7.5e son o contrato). Tres presets
  curados novos con specs completos (5 estados + textColor): pergamino,
  neon (pensado co chrome escuro) e bosque. O ThemePanel renderiza as
  fichas desde o rexistro, en fila desprazable.

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

- 2eac199: Add theme as document data (7.5e):

  - New `ThemeSpec` type: `{ nodeFills?, regions?, preset? }` in
    `DocumentMeta.theme` (optional).
  - New `setMetaField<K>(field, value)` command: typed mirror of
    `setNodeField` but for `DocumentMeta`. Undo/redo automatic; enables
    UI to edit theme (and `background`) as data.
  - `createEditorDocument` and JSON round-trip preserve `theme`
    (spread-conditional over `formatVersion`).

  Consumers importing `EditorDocument`/`DocumentMeta` need no changes —
  `theme` is optional. Consumers doing structural destructuring of
  `DocumentMeta` may need to acknowledge the new field. `ThemeSpec` is
  headless (no React dependency); mapping to a concrete `Theme` from
  `@yggdrasil-forge/react` happens in the UI consumer.

### Patch Changes

- 48cbf0f: fix(editor-core): blindar deserializeDocument contra docs que crashean

  `deserializeDocument` corre agora tamén os tres validadores DUROS
  (structural / uniqueIds / referentialIntegrity) sobre o documento
  parseado e devolve `err` con mensaxe clara se algún falla. O schema Zod
  non pillaba ids de nodo/aresta DUPLICADOS; sen esta garda, un doc así
  cargábase e o `new TreeEngine(doc.tree)` do canvas lanzaba ao
  renderizar, tumbando a UI e perdendo o documento. Contrato reforzado:
  se devolve `ok`, o documento é cargable.

- bde42d7: fix(editor-core): «Dispor» coce tamén o encadre — os nodos nunca quedan fóra do alcance (7.16b)

  `applyAutoLayout` engade un `setMetaField('coordinateBounds')` cos
  bounds do layout (+marxe) á mesma transacción: sen isto, un layout
  maior có box fixo do documento deixaba nodos fóra do viewBox e do
  alcance do pan (que está limitado aos bounds) — invisibles e
  inalcanzables (feedback do gate do dono). Un undo devolve posicións E
  encadre dun golpe. `ygg layout` herda o fix (o JSON de saída leva o
  coordinateBounds actualizado).

- 57746e0: fix(editor-core): afinado do clustered-radial por defecto (7.16c)

  Co gate visual do dono (panadeiro, 2 grupos): o chan de groupRadius
  baixa de 240 a 120 (dous grupos quedaban a 480px con nada no medio —
  Mundo 220×678, agora 220×438), o oco «sen grupo» só conta se HAI
  orfos, e a órbita gaña teito de 180. gaia-cards (5 grupos) queda case
  cadrado (735×726).

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

- Updated dependencies [25dae47]
- Updated dependencies [5e55e2d]
- Updated dependencies [2a7aafc]
- Updated dependencies [27b9f61]
- Updated dependencies [e2e9df4]
- Updated dependencies [8597e50]
- Updated dependencies
- Updated dependencies [99d0d44]
- Updated dependencies [5f41960]
  - @yggdrasil-forge/core@1.0.0
  - @yggdrasil-forge/common@1.0.0
