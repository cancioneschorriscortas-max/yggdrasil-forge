# @yggdrasil-forge/react

## 0.5.0

### Minor Changes

- 30ce28f: feat(react): `coordinateBounds` and `backgroundImage` props on `SkillTree`

  Two new optional props on `SkillTree` (and `SVGRenderer`) for consumers
  that need to align the tree with a background image deterministically.

  **`coordinateBounds`** fixes the SVG coordinate space instead of
  deriving it from the layout nodes. The `viewBox` becomes exactly the
  provided box (plus `padding`, default 0), without the auto-fit
  inflation (`maxRadius + 28`). Nodes written at `(x, y)` in the fixture
  map 1:1 to `(x, y)` on screen. Recommended combination:
  `coordinateBounds={...} padding={0} fitOnMount={false}`.

  **`backgroundImage`** renders an `<image>` inside the pan/zoom group of
  the SVG (so it moves and scales with the nodes, unlike a CSS background
  layer). The image occupies the bounds box with
  `preserveAspectRatio="xMidYMid meet"`. Typically combined with
  `coordinateBounds` set to the image's pixel box.

  Both props are purely additive: omitting them keeps the legacy
  behaviour intact (zero regression). Exercised by the upcoming refactor
  of the `cyberware-ripperdoc` example, where the cyberpunk body image
  needs to align with anatomically-placed nodes.

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

- 2a11e25: fix(react): `fit on mount` disparaba en cada cambio de `bounds`, non só ao montar

  **Reportado polo dono**: engadir nodos co editor producía un "zoom
  raro" — a vista reencadraba a cada nodo novo, e calquera pan/zoom
  manual perdíase.

  **Causa raíz**: o efecto "fit on mount" en `useViewport` tiña deps
  `[bounds, fitOnMount]`, así que se re-disparaba cada vez que `bounds`
  cambiaba de referencia — non só ao montar, coma o seu propio nome e
  comentario prometían. En consumidores sen `coordinateBounds` explícito
  (onde `bounds` = layout bounds, recalculados en cada edición
  estrutural), iso resetaba o pan/zoom interactivo a cada cambio.

  **Fix**: `hasFittedRef` garante que `fit()` se chama COMO MOITO unha
  vez na vida do hook. Se `bounds` non está dispoñible aínda no primeiro
  render, o efecto agarda a transición inicial undefined→definido (as
  deps seguen a incluír `bounds` para iso), pero unha vez fitted (con
  éxito OU por bounds dexenerados), nunca máis volve chamar `fit()`.
  Para reencadrar baixo demanda, o contrato xa existía:
  `SkillTreeHandle.fit()`.

  **Garda engadida — bounds dexenerados**: unha árbore baleira produce
  bounds `{minX:0,minY:0,maxX:0,maxY:0}` (largo/alto 0). A garda
  existente en `fitTransform` só detecta isto cando `padding=0`; no uso
  real (`effectivePadding = padding + maxRadius + 28`, sempre > 0), esa
  garda NUNCA se activaba. Engadida unha garda adicional no propio
  efecto (antes de padding) que salta o fit por completo se
  `bounds` é dexenerado, deixando o viewport por defecto (identidade)
  en vez de encadrar un box de tamaño cero (zoom extremo).

  **Tests**: 4 tests novos — cambiar `bounds` tras montar non volve
  agendar `requestAnimationFrame`; bounds dexenerados ao montar non
  agendan fit; state queda en identidade con bounds dexenerados; `fit()`
  manual segue funcionando. 29 tests existentes (incluíndo os de
  `fitTransform`) pasan sen cambios.

- Updated dependencies [27b9f61]
- Updated dependencies [e2e9df4]
- Updated dependencies [8597e50]
- Updated dependencies [99d0d44]
- Updated dependencies [5f41960]
  - @yggdrasil-forge/core@0.5.0

## 0.4.0

### Minor Changes

- af88cf8: feat(core): constellation layout — radial threaded strands (`shape: 'line'`)

  New `LayoutEngine` in `@yggdrasil-forge/core`: `ConstellationLayout`. Each
  cluster becomes a radial strand growing from the crown (root) outward: members
  thread along the strand from `innerRadius` to `outerRadius`. Fills the radial
  space — kills the "dead ring" that `clustered-radial` leaves in `list` mode
  (grow-outward invariant).

  Configuration knobs:

  - `shape: 'line'` — only value implemented in v1 (`curve`/`spiral` future,
    parser rejects them today).
  - `innerRadius` (default 90) and `outerRadius` (default 320).
  - `lengthMode: 'equal-span' | 'fixed-step'`: - `equal-span` (default) — every strand spans the full `[innerRadius,
outerRadius]` regardless of member count; clusters with fewer members have
    more spacing. - `fixed-step` — constant radial step across all strands; shorter clusters
    finish before reaching `outerRadius`.
  - `startAngle` (default `-π/2`) to rotate the whole constellation.

  This layout only positions; the visible strands come from `treeDef.edges`
  (`type: 'path'`) so they don't introduce unlock gates. Cluster building shares
  a new helper module (`ClusterBuilder`) used additively — `ClusteredRadialLayout`
  remains untouched, no regression in the core test suite.

  Registered in `@yggdrasil-forge/react`'s default layout registry.

- a7765c0: fix(react): ThemeContext cross-bundle singleton (Symbol.for) so /index + /headless share one context; re-export ThemeProvider/Theme from /headless (F10.3.fix-2)
- d9751dd: refactor(react): theme node/edge/mesh via inline style from useTheme (not scoped <style> CSS vars); add ThemeColors.nodeFill + ThemeSizes.ringWidth (F10.3.fix)
- fbf9b06: feat(react): flat orb node — shape with neutral fill + state-colored ring (no glow), icon inside, label below; radius-aware padding (F10.3)
- c275965: feat(react): SkillEdge v2 — edge-state coloring + directed arrowheads + ThemeColors.edgeActive + SkillTree.curve prop (F10.4)
- 40acddc: feat(react): SVG icon registry (Symbol.for singleton) + builtin starter set + recolorable icons with emoji/URL fallback (F10.5)
- 95e5aac: feat(react): NORSE_ICONS iconset (26 icons, opt-in via registerIcons) (F10.5b)
- 5d06ab1: feat(react): viewport — pan, wheel-zoom-to-cursor, fit-to-bounds + imperative handle (F10.6)
- 86a2ecf: feat(react): node selection overlay + hover affordance + cursor + focus ring + onNodeHover; ThemeColors.selected (F10.7)
- d4ab8fe: feat(react): extended theme — typography + background + surface applied by renderer; removes demo CSS font/bg hacks (F10.8)
- 77864f5: feat(core+react): novo motor de layout `clustered-radial` (base común, F11.2a). Coloca a raíz no centro da árbore, os grupos repartidos en radial uniforme arredor dela, e os membros de cada grupo nun abano placeholder cara afóra. Xera mesh `spokes` centro→grupo por defecto (esqueleto da estrela cando non hai edges semánticos). Rexístrase no default registry de `@react`. Esta é a BASE común para F11.2b (memberLayout: list/cluster) e F11.2c (anchorNodeId real); 2a non implementa esas variantes.
- 279194d: feat(react): `node.icon` admite rutas/recursos de imaxe locais (F11.3). A detección `iconIsUrl` no `SkillNode` amplíase para que rutas absolutas (`/badges/x.webp`), relativas (`./a.png`, `../b.avif`), `data:` URIs e calquera cadea que remate en extensión de imaxe (`webp`/`avif`/`png`/`jpg`/`jpeg`/`gif`/`svg`) se renderice como `<image>` SVG en vez de caer ao fallback `<text>`. Os ids de glyph rexistrados seguen resolvéndose como `IconGlyph` (regresión cero). Os `http(s)://`/`//` seguen funcionando como antes.
- cba98b4: feat(react): badges raster a `imageSize=radius*1.8`, glyphs intactos (F11.3b). En `SkillNode`, as imaxes raster (rutas, `data:` URIs, ou cadeas con extensión de imaxe) renderízanse agora con `width`/`height` == `radius * 1.8` en vez de `radius * 1.0`, e con `preserveAspectRatio="xMidYMid meet"` explícito. Os `IconGlyph` (glyphs vector rexistrados) seguen co tamaño `iconSize = radius * 1.0` sen cambio: regresión cero no panadeiro, camareiro e calquera árbore que use glyphs. Pensado para que os badges AAA do Paladín enchan o círculo do nodo sen tapar o anel de estado.
- c727198: feat(react): atenúa badge de nodos `locked` (F11.3c). En `SkillNode`, os badges raster (rutas, `data:` URIs, ou cadeas con extensión de imaxe) renderízanse con `filter: grayscale(1) brightness(0.5)` cando o estado do nodo é `'locked'`. Pensado para que cos badges grandes e vívidos (F11.3b) o estado de bloqueado salte á vista. **Só afecta á imaxe** — o anel conserva a súa cor de estado, e `IconGlyph` (glyphs vector) e o fallback `<text>` (emoji) **non se tocan**. Outros estados (`unlockable`, `in_progress`, `unlocked`, `maxed`, `disabled`, `expired`) renderizan o badge vívido.
- 2a8da28: feat(react): per-state node fill + in-progress visual for partial tiers + NodeDef.color override
- 67bb611: feat(react): region tints (per-tag bounding box) behind the tree + Theme Lab as right column with region selector
- 43153e4: feat(react): visible tier badge + per-node tier +/- controls (interactive builder)
- 6113f40: Layout errors are now visible in development: when `computeLayout` fails,
  `SkillTree`/`SVGRenderer` render the error code and message on the canvas
  instead of a blank SVG. Production output is unchanged (silent). Adds an
  optional `errorMessage` prop to `SVGRenderer`.
- b2e6861: Add opt-in `theme.sizes.maxLabelChars`: truncates long node labels with an
  ellipsis and adds a hover `<title>` with the full text (preserved in
  `aria-label`). Default off — no change to existing behavior.
- 5225e14: feat(react): promote `ClusterCardsView` and `NodeInspector` from example

  GAIA, the second real consumer, asked to adopt the tarxetas-lista view
  plus the per-node inspector that lived inside the oberon-panadeiro
  example. Since GAIA is JS-only (CRA), copying `.tsx` was not an option;
  promoting to the published package was the clean path.

  New public API on `@yggdrasil-forge/react`:

  - `ClusterCardsView` — a list-of-cards view of any tree, with local
    pan/zoom (drag + wheel, identical UX to `SkillTree` but on HTML).
    Positions are optional: when missing for a group id, an automatic
    ring around the center is used so the component works on any
    profession without a hardcoded map.
  - `NodeInspector` — side panel with the node detail (header, badge,
    description, levels with state, key action, increase-tier button,
    optional video). i18n via `locale` (default `'en'`) and `strings`
    partial override. Video render injectable via `renderVideo` prop so
    consumers can plug their own media player.
  - Pure logic helpers `rowState`, `rowBadge` (cluster) and `tierRowsFor`,
    `badgeKind`, `badgeText` (inspector), plus the matching state types
    `RowState`, `TierState`, `TierRow`. Useful for consumers that build
    their own variants on top of the same rules.

  Both components are self-styled with inline styles (matching the
  package convention) and expose stable `yf-cluster-*` / `yf-node-inspector-*`
  class names for consumer override. No CSS file to import. Zero
  sideEffects.

  The oberon-panadeiro example now consumes the promoted components and
  deletes its local copies; it acts as the first real test of the API.

- 918eafa: feat(react): `SkillRegions` accepts `regionShape: 'box' | 'hull'`

  New optional prop on `SkillTree` (forwarded to `SkillRegions`) selects the
  shape of region tints:

  - `'box'` (default) — current behaviour: rounded `<rect>` around the
    region's bounding box.
  - `'hull'` — organic blob (`<path>`) that follows the actual shape of the
    region's nodes. Built from a sampled convex hull (Monotone Chain on
    `K=10` perimeter points per node) smoothed by a closed Catmull-Rom
    spline. Useful on image backgrounds where rectangles overlap between
    fan clusters and wash out over warm areas.

  The public helper `computeRegionHullPath(tag, nodes, positions, padding)`
  is exported for consumers that want to render the path themselves.

  Zero regressions: default is `'box'`; existing consumers see no change.
  The legacy `SkillRegions.test.tsx` keeps passing untouched as the
  regression guard.

### Patch Changes

- 42227ef: fix(react): o `<svg>` do skill-tree enche o seu contedor por defecto (display:block, width:100%, height:100%). Antes renderizaba ao tamaño intrínseco do viewBox, producindo unha "banda morta" en contedores dimensionados a non ser que o consumidor engadise CSS extra. O fix é aditivo e sobreescribíbel polo tema (background) e por estilos do consumidor.
- Updated dependencies [af88cf8]
- Updated dependencies [c275965]
- Updated dependencies [997e783]
- Updated dependencies [77864f5]
- Updated dependencies [b149ee9]
- Updated dependencies [3164597]
- Updated dependencies [10a995b]
- Updated dependencies [169049f]
- Updated dependencies [942cff7]
- Updated dependencies [8523a05]
- Updated dependencies [582bd89]
- Updated dependencies [0a8900d]
  - @yggdrasil-forge/core@0.4.0
  - @yggdrasil-forge/common@0.4.0

## 0.3.0

### Patch Changes

- [`22e8297`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/22e8297d5663e36b59f5ed8f5aca4c66418954fd) - fix(react): SkillTreeWithDefaultTheme respects an ascendant ThemeProvider instead of always overriding with the minimal theme (F10.1)

- Updated dependencies [[`4a85088`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/4a8508855c79001dfdd68ca767fe329aebe718aa)]:
  - @yggdrasil-forge/core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [[`155881b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/155881b013f8672d114b73c622e31c712f048f63), [`410dcb6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/410dcb66208d14ef9024137e57bb3d4a4442295e), [`1bb3902`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1bb3902c0a295af91f74f0cb13ebb7c1854bb999), [`36cd1f0`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/36cd1f0cf394877d4e5e60a637cefbb92c4215dd)]:
  - @yggdrasil-forge/core@0.2.0

## 0.1.0

### Minor Changes

- [`f94f225`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/f94f225d4416a6b506e3d2cf4f1210d7bda056d8) - test(react): add jest-axe a11y tests + SSR no-dom-imports guard (sub-phase 7.12)

- [`2b4f8d3`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2b4f8d393666ca00acf1209b688171b70fee8958) - feat(react): add basic CSS animation framework (sub-phase 7.6)

- [`8e9a146`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8e9a146a14ab4906727622869020087e917ba009) - feat(react): add SkillTreeAnnouncer + improved SkillNode aria-label (sub-phase 7.7)

- [`856bdb4`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/856bdb427c0f5d6d264d144a5bacef29226c5b0d) - feat(react): add SkillTreeErrorBoundary component (sub-phase 7.11)

- [`86d5157`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/86d5157efc8a64b47fe25b42a46922d53a11ddde) - feat(react): add hooks customizados (useSkillTree, useNodeState, useNodeSelector, useStat) (sub-phase 7.5)

- [`d2f2296`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/d2f22960a06deb56103926821211290b0753fa95) - feat(react): add MeshOverlay + SVGRenderer components (sub-phase 7.3)

- [`e4c594e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e4c594ee2e813204ec8e4bc4330384d5c793812f) - feat(react): add long press support for mobile/touch (sub-phase 7.10)

- [`02a9c52`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/02a9c52d3800729b0c2cfcd93f6fb37a76764590) - feat(react): setup React 19.2.7 dependencies + JSX config (sub-phase 7.1)

- [`c329774`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c3297745420f8a58326e8b487acb37b26ae2fa13) - feat(react): respect prefers-reduced-motion in animation framework (sub-phase 7.8)

- [`12df2f9`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/12df2f98b2f725c2a2e36515e109bb7f4b5c82ac) - feat(react): add SkillTree + SkillNode + SkillEdge components (sub-phase 7.2)

- [`b4f35d5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b4f35d544c8e6ad1ee805e666ecdd4204585a1b9) - feat(react): add SSR + RSC compatibility via /server entry point (sub-phase 7.9)

- [`6860f76`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/6860f764801ea56395be4fb91f29281832dc4f65) - feat(react): add ThemeProvider + minimal theme + headless entry point (sub-phase 7.4)

### Patch Changes

- [`79b6ad2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/79b6ad237dc1991e9c3883afcd2177d96242af62) - chore(react): code hygiene post-Phase 7 (resolve 6 of 9 open coverage/SSR debts)

- [`458b56b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/458b56bbecdc4745ba030b551c9eb91e0b4057c0) - docs: close Phase 7 officially in MASTER (Annex A + A.6 lessons)

- [`cd61e7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd61e7e05e63d6e4d85c12c68216eb95c9e5ec16) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Initial monorepo skeleton with all packages stubbed

- Updated dependencies [[`8de28f6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8de28f630e0eebdfddc09ed6d04c17ec7caa0f7c), [`760c11d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/760c11d4522df6c52d11901f2f05bfd9d9aeb97e), [`b1ee18d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b1ee18d3da98f231d7a638fa919aeb54daa20e8f), [`35ac5d5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/35ac5d584cabd9473f642efa0045ee1816849d86), [`8bc4900`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8bc490050257b4165f5ac45f946543e6dfc4e5ed), [`05dbf46`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/05dbf46446cc6779830bd06613cd038304bbf19c), [`21ca51b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/21ca51ba0a66b00687f74c3a442bddae12aa988e), [`a9c9909`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/a9c9909a7266ace15112d8649e2c8a81dfeffbf0), [`953cda7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/953cda7d0e7fc8fd68c9f666b6c1470fa406c7e2), [`7d9458c`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7d9458cafdbd0b378868eae29bd9258ce075a006), [`8c5347c`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8c5347c70d890c1e0c227b05af5d8163b7e12f89), [`fae0e04`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/fae0e04459d9fe9676ec6d06afb361377189af22), [`7e408d8`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7e408d85c4b357d20ef9ca264aa227c8258dfbac), [`5eeef8b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5eeef8bc2f096573f7786bf6424c86899fbc58fa), [`05096f2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/05096f2ea1132d5322e57e04a7f41227476b9ce3), [`b10f780`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b10f780a048fc2d6f660ff7a1aadd151051c1457), [`0f9ab45`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/0f9ab453ce4a323ae4206c724962c09bc41cde06), [`ad80454`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ad804548af77245ca0bdf0e97f248f108023872f), [`e435e5b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e435e5bff69c3472365c5c323c1da2d6b6c6583a), [`ecb08e9`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ecb08e9499165b37b2ebdc1e67c16063a3694757), [`dc53f10`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/dc53f1020a65a2b44ce37144b5779faeedd21049), [`7adb1a2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7adb1a22287f5325d5f613fd7673de561c872515), [`df7c696`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/df7c69678c2a17ecb50297a5bb21fa2d7a5ad348), [`e52fc33`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e52fc33023368aac0296ffc490de0daf56f5e97c), [`2bee085`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2bee0856e521440d3395d01a7a1b77dfebb09ddc), [`10d535a`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/10d535aabc273c7c904ccaf87a699625e0611ba0), [`9ce26dd`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/9ce26dda03093b3f3aa09f16cf1ac49388e8cea1), [`357b69b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/357b69b5ff8413617431085337a7857f77ec2e6a), [`3fb3199`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/3fb31997cde92fb1b1637c9e1db9c965aa3c7259), [`6d391c8`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/6d391c849ffda5e5abd27f40cc9a31455a29ccae), [`ace8bcb`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ace8bcba25181670a5178e71c8b7a3fee749ab07), [`5d4cee5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5d4cee5d69ac860eaecff95a9274f497c9f7f099), [`7d1f7b9`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7d1f7b9906722ca6fdf25dfaa2daf6312437f09b), [`a346888`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/a3468889ae55187e480309472332d10beaa06c71), [`cfafc76`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cfafc76e2b747e03d504fefb838c077c12b5ff87), [`c918324`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c9183248bad8bc7f92bc2d3fc23cc5e98dce847a), [`9afd412`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/9afd41277b5b75a86e52f3f894844964025646f9), [`1774a81`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1774a8166f98ce21de644cfe24a237ae2995f942), [`8555542`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/855554236d5bc8b6aa92729a6cb4408636d12b22), [`c8bed7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c8bed7e7a1dcf375c6bc28489858ecb6b2ef3eb2), [`cd750c3`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd750c39e37d37fd1ae155d0d51f4590262e7cbb), [`3f42e79`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/3f42e79af39e12e52ee0093dc93b3af469c5ba35), [`de16c01`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/de16c01fdcba47bc4f83348d911d9da2f3c5c14c), [`f97b467`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/f97b46767c6dff3e34ba2a70f695a4e35d3f6ffc), [`2a12ef7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2a12ef7a94b63c6f9bbfdc4e789780efe3e08293), [`ccf9187`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ccf9187fd68aa729111a5e0a562c0f0329d96f74), [`0bcc66d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/0bcc66dd1f202f209333e244bc11f1555926b73c), [`b9eef4c`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b9eef4c8baa7da8f7891991160ab42591c023607), [`2006f87`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2006f879422369a325d1cfb3414c285d3c7af178), [`f055555`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/f055555bb6fb4e8be4c17e5b4f8212f20a91353b), [`e31ec1f`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e31ec1f2f46aa7fc6e1ebcadf99d41c3d5d4a947), [`5a80acf`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5a80acf86450199b2cfd852579d853ca4aa1bede), [`1f7de89`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1f7de89abd7f231f777e851add4900b4df91d86e), [`2fd2e6a`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2fd2e6a172d462d685f4d3f6353a01b4832e006e), [`cd61e7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd61e7e05e63d6e4d85c12c68216eb95c9e5ec16), [`6719059`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/671905999db6fa000484f645ecc049ca88a4e18e), [`2e1b9cb`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2e1b9cb9946eb3d02b838f198d7a8ba54f7c284e), [`2ddc511`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2ddc511c8680324ba7bdc33e8b12bd743e856123), [`5baefa6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5baefa6df0ee26838f4f42f12b6783d0e66db995), [`580f53f`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/580f53f8e79563fbeb8008a1791a4af22c0eba2e), [`a7d0a02`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/a7d0a02c5d4bf7978eb0265c51b427fdd1794c39), [`79ba574`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/79ba574adbc8be2649167e89dba4949a12859617), [`b913aae`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b913aae47370495617522a0c34f34e01742a9d22), [`d91996e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/d91996e171334e1058406a75a3852dbc1f089f7c), [`ac823e6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ac823e6c8de4b4f6f88bcf6cfa1c003bb0ebb12c), [`c3410e2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c3410e26310bfb6ba72428914e23a75a1eef8040)]:
  - @yggdrasil-forge/core@0.1.0
