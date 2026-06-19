# Renderer 2.0 — estado consolidado

> Estado das sub-fases do **Renderer 2.0** (Fase 10) do Yggdrasil Forge.
> Fonte de verdade para o estado actual do renderer; complementaria a
> `MASTER.md` (decisións arquitectónicas + leccións).

## Sub-fases pechadas

| Sub-fase | Descrición | Estado |
|---|---|---|
| **F10.1** | `SkillTreeWithDefaultTheme` respecta `ThemeProvider` ascendente (non sobrescribe sempre con `minimal`). | ✅ pushed |
| **F10.2** | `NodeDef.shape?` + `NodeDef.size?` + `NodeShape` (`circle/square/diamond/hexagon/octagon`) tipados + Zod. | ✅ pushed |
| **F10.3** | Flat orb: shape + icono dentro + label debaixo + anel de cor por estado. Padding aware do raio máximo. | ✅ pushed |
| **theme-lab** | Demo: panel "Theme Lab" en vivo (color pickers + ring-width + presets + copy-values). | ✅ pushed |
| **F10.3.fix** | Tematización por **inline style desde `useTheme()`** (eliminada a cascada via CSS vars no `<style>` interior, que era fráxil). | ✅ pushed |
| **F10.3.fix-2** | `ThemeContext` = **singleton cross-bundle** (`Symbol.for(globalThis)`); `/headless` re-exporta `ThemeProvider`. Resolve o `useTheme()===null` cando se mestura `/index` + `/headless`. | ✅ pushed |
| **F10.4** | SkillEdge v2: `SkillTree.curve?` prop + edge-state coloring (`edgeStateFor`) + `ThemeColors.edgeActive?` + frechas (`EdgeStyle.directed?` + `<defs><marker>`) + `shortenEdgeAtTarget` para visibilidade. | ✅ pushed |
| **F10.4b** | Curva e routing baixan ao **contrato de datos**: `LayoutConfig.curve?` + `EdgeStyle.routing?` aplicados por `computeLayout` via `applyEdgeRouting`. `SkillTree.curve` queda como override de presentación. | ✅ pushed |
| **F10.5** | Rexistro de iconos SVG (`registerIcon/getIcon/hasIcon`, `Symbol.for` singleton — A.6.21). `IconGlyph` con recolor via `currentColor`. Resolución en `SkillNode`: id rexistrado → URL → emoji/char (fallback). Iconset starter de 6 iconos. `ThemeColors.icon?`. | ✅ pushed |
| **F10.5b** | Iconset **Norse** (26 iconos: yggdrasil, runas, bestiario, armamento, drakkar, elementos, celestes, simbólicos). **Opt-in** via `registerIcons(NORSE_ICONS)` (non auto-rexistra; mantén byte-size mínimo no paquete base). IDs prefixados `norse-*` sen colisión cos builtins. Demo usa 7 iconos norse + 1 emoji fallback (whirlwind). | ✅ pushed |
| **F10.6** | Viewport interactivo: **pan** (arrastrar con umbral anti-click), **wheel-zoom** cara ao cursor (listener nativo non-pasivo — A.6.23), **fit-to-bounds** ao montar + accesible imperativamente. Hook `useViewport` + helpers puros testables (`clampZoom`, `fitTransform`, `zoomToward`, `clampPan`). `<g transform>` arredor dos children do `SVGRenderer`; `<defs>` queda **fóra** para que os markers non escalen. `SkillTree` convertido a `forwardRef` expoñendo `SkillTreeHandle { fit, reset, zoomIn, zoomOut, getZoom }`; `SkillTreeWithDefaultTheme` reenvía o ref. Demo: 4 botóns Fit/Reset/Zoom±. | ✅ pushed |
| **F10.7** | **Selección + hover + cursor de man + foco de teclado**. `SkillTree.selectedNodeId?: string` (controlado) marca un nodo cunha anel exterior themed (`theme.colors.selected`, fallback a `nodeUnlockable`). `SkillNode` engade estado local de hover/focus, render dun overlay con prioridade selected > focused > hovering: selección sólida, foco *dashed*, hover sutil opacity 0.5. `cursor: pointer` inline cando hai `onClick` (afordancia descubribilidade). Atributos `data-selected`/`data-hover`/`data-focused` para debug e selectores. Evento `onNodeHover(nodeId \| null)` propágase desde `SkillTree`. Tabindex preserved; nodos seguen sendo `role="button"`. | ✅ pushed |
| **F10.8** | **Aplicación de tema ampliado**. `Theme.typography?` (`fontFamily`, `fontWeight`, `letterSpacing`, `textTransform`) aplícase inline aos `<text>` de label e ao fallback de icono-texto. `colors.background` aplícase **inline** ao `<svg>` (vía fiable, post-experimento con CSS-vars). `colors.surface?` debuxa un `<rect>` cubrindo o viewBox como primeiro fillo do `<g transform>` (panel composible completo → F12). Demo: Cinzel + canvas escuro móvense ao tema; hack `font-family: !important` no styles.css eliminado; wrapper `style={canvas}` retirado. Os temas pulidos (Oberón/educativo) son F13 — aquí só se entrega a **maquinaria**. **Renderer 2.0 MVP completo: contrato de Theme pechado (cores + sizes + typography + background/surface).** | ⏳ neste patch |

## Decisións arquitectónicas relacionadas (MASTER)

- **A.6.17** — `ThemeContext` singleton multi-entry-point.
- **A.6.18** — `pnpm turbo run build --force` (non `pnpm --filter`) para DTS interdependente.
- **A.6.19** — `marker-end` SVG + orde de render + `shortenEdgeAtTarget`.
- **A.6.20** — Curva/routing = contrato de datos, non prop de React.
- **A.6.21** — Rexistros mutables compartidos requiren `Symbol.for(globalThis)` singleton (xeneralización de A.6.17). Sub-lección: o auto-rexistro de defaults debe vivir dentro do propio módulo do rexistro (non en módulos satélites con side-effect imports), porque `sideEffects: false` no `package.json` tree-shakea os bare imports.
- **A.6.22** — Modelo de viewport SVG: `viewBox` para o encadre base (fit visual), `<g transform>` arredor dos children para pan/zoom interactivo. **Non** manipular `viewBox` para zoom — mestura responsabilidades e dificulta o cálculo de cursor→user coords.
- **A.6.23** — `onWheel` de React rexístrase como *passive*, polo que `preventDefault` é ignorado (a páxina rola ao facer zoom). Solución: rexistrar un listener nativo `{ passive: false }` no `<svg>` via `useEffect`. Aplicado en `useViewport`.
- **A.6.24** — `setPointerCapture` en `onPointerDown` mata os `onClick` dos descendentes (redirixe o `pointerup`). Diferir o capture ata cruzar o umbral anti-click (F10.6 fix-click).
- **A.6.25** — Versións consistentes de React+@types/react no monorepo: usar `catalog:` + `workspace:*` en tódolos paquetes; `^X.X.X` literal nun demo pode crear dúas versions de `@types/react` que crashean cando un paquete expón `forwardRef` (F10.6 deps-align).

## Backlog (Renderer 2.0)

> **Renderer 2.0 MVP completo (F10.8).** O contrato do `Theme` xa describe toda
> a estética visible (cores + sizes + typography + background/surface). O que
> queda no backlog é polish, temas pulidos (encher datos, non maquinaria), e
> features de polimorfismo da árbore.

- **Refinar arte do iconset Norse** (opcional): os 26 paths actuais
  son arte funcional/decorativa boa de aspecto consistente; o refino
  pode iterarse vía `tools/icon-preview/` (paste de paths novos →
  preview en vivo → cando guste, substituír os paths en
  `packages/react/src/icons/norse.ts`). Cero downtime arquitectónico.
- **Iconsets adicionais** (opcionais): mesmo patrón opt-in que
  `NORSE_ICONS` (`packages/react/src/icons/<setname>.ts` + export
  desde os barrels). Candidatos futuros: `MEDIEVAL_ICONS`,
  `SCIFI_ICONS`, etc., segundo demanda.
- **Temas pulidos / bancar paletas (F13)**: agora que o contrato do tema
  está completo, crear temas nomeados é só encher datos. Candidatos:
  «Oberón dark» (paleta usada no demo actual), «educativo» (paleta
  alta-contraste para clase / accesibilidade), «sci-fi», etc.
- **Animacións de transición de estado (F11?)**: visualizar transición
  locked → unlockable → unlocked cunha animación curta (CSS transitions
  xa están no `<style>` do renderer; faltan as transitions por estado).
- **Panel composible completo (F12)**: o `surface` actual é só o token
  + rect. F12 abrirá un panel React reutilizable arredor do SVG
  (cabecera, footer, controis) consumindo o mesmo tema.
- **Demo: showcase de prerequisitos**: ampliar tree-def do demo para
  amosar `all_of`, `any_of`, `none_of`, `points_required` (presumir
  visualmente do motor). Conversa pendente co Director.

## Notas de versión externas

- `@yggdrasil-forge/core@0.x`: introduce `LayoutConfig.curve` +
  `EdgeStyle.routing` (F10.4b). Retrocompatible: TreeDefs sen estes
  campos seguen renderizando edges rectos.
- `@yggdrasil-forge/react@0.x`: `SkillTree.curve` prop conservado como
  override de presentación (F10.4b non o elimina; só rebaixa o seu papel
  semántico). Cero breaking changes.
