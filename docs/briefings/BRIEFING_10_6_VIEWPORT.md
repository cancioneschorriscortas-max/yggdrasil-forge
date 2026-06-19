# BRIEFING — sub-fase F10.6 (Viewport: pan + wheel-zoom + fit)

> **4º Arquitecto (Director) → Executor.**
> **A árbore faise navegable.** Pan (arrastrar), **wheel-zoom** (cara ao
> cursor), **fit-to-bounds** (ao montar + imperativo), con *clamps* de zoom e
> pan. O `viewBox` actual dá o **fit inicial**; un `<g transform>` arredor dos
> `children` do `SVGRenderer` fai o **pan/zoom interactivo**. Toda a lóxica
> nun hook `useViewport`; **headless segue sen estilos hardcoded** (isto é
> comportamento, non CSS). Publicable → `@react` **minor**. **Human visual
> check.**
>
> **Por que importa (norte Oberón):** a árbore de profesións real **non cabe**
> en pantalla. Sen pan/zoom/fit o renderer é escaparate, non ferramenta.

---

## 1. Estado á entrada (verificado polo Director)

- `SVGRenderer`: props `bounds?`, `padding=16`; `viewBox = buildViewBox(bounds,
  padding)`; dúas ramas `<svg>` (baleiro/erro + principal). O contido
  (mesh/edges/nodes) chega como **`children`** desde `SkillTree`. `<defs>` co
  marker de frecha (F10.4).
- Hai patrón de hooks (`hooks/useNodeState.ts`, `hooks/useStat.ts`).
- **Sen** estado de viewport/pan/zoom hoxe.

## 2. Modelo (NON discutible)

1. **`useViewport` hook** (en `hooks/`): estado `{ panX, panY, zoom }` +
   handlers + accións. **SSR-safe**: nada de `window`/medición fóra de
   `useEffect`/handlers.
2. **Transform group**: o `SVGRenderer` envolve `{children}` nun
   `<g transform={`translate(${panX} ${panY}) scale(${zoom})`}>`. O `viewBox`
   (bounds+padding) **non se toca** → segue dando o encadre base; o `<g>`
   transforma por riba; o `<svg>` recorta o que sobresae (overflow natural).
3. **Pan**: pointer-drag sobre área baleira do `<svg>`. **Umbral anti-click**
   (~4 px): por baixo do umbral = clic (pasa aos nodos); por riba = pan.
   `setPointerCapture` para arrastre suave.
4. **Wheel-zoom cara ao cursor**: `onWheel` → factor por `deltaY`, **clamp**
   `[minZoom, maxZoom]`; manter fixo o punto baixo o cursor (mapear cursor →
   coords de usuario con `svg.getScreenCTM()?.inverse()`). `preventDefault`
   para non rolar a páxina (ver §5: pode requirir listener nativo
   non-pasivo).
5. **Fit**: `fit()` calcula `{panX, panY, zoom}` para encadrar `bounds` no
   tamaño cliente do `<svg>` (con `padding`). **Fit ao montar** (`fitOnMount`
   default `true`), medindo en `useEffect`.
6. **Clamps**: `zoom ∈ [minZoom=0.25, maxZoom=4]` (props); pan limitado para
   non perder a árbore de vista (margen razoable arredor de bounds*zoom).
7. **API imperativa**: `SkillTree` expón vía `ref` un handle
   `SkillTreeHandle { fit(): void; reset(): void; zoomIn(): void; zoomOut(): void; getZoom(): number }`
   para que o demo poña botóns. (GREP en T0 se `SkillTree` é `forwardRef`;
   reenviar a través de `SkillTreeWithDefaultTheme`. Se o reenvío resulta
   enguedellado, **escala** antes de forzar.)
8. **Interacción de nodos intacta**: os clics seguen seleccionando/desbloque-
   ando (o umbral anti-click protéxeo).

## 3. Tarefas (T0–T7)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional.
> Helpers de matemática **puros** (testables sen DOM).

### T0 — Preflight + GREP
HEAD = `origin/main` (`95e5aac`). Identidade git. GREP e reporta:
- `SVGRenderer`: render body, onde van `{children}`, as dúas ramas `<svg>`,
  `buildViewBox`, e `Bounds` (forma: x/y/width/height?).
- `SkillTree`: ¿é `forwardRef`? ¿como envolve `SkillTreeWithDefaultTheme`?
  ¿de onde sae `bounds`/`padding` que pasa ao `SVGRenderer`?
- Patrón de `hooks/` (forma de `useNodeState` para imitar estilo).

### T1 — `hooks/useViewport.ts` (NOVO): estado + accións + handlers
- Estado `{ panX, panY, zoom }` (`useState` ou `useReducer`).
- Helpers **puros** (exportables para test):
  - `clampZoom(z, min, max)`.
  - `fitTransform(bounds, padding, viewportW, viewportH)` → `{panX, panY, zoom}`.
  - `zoomToward(state, factor, cursorUserX, cursorUserY, min, max)` →
    novo estado mantendo fixo o punto do cursor.
  - `clampPan(state, bounds, viewportW, viewportH, margin)`.
- Accións: `fit()`, `reset()`, `zoomBy(factor)`, `zoomIn()`, `zoomOut()`,
  `setPan(...)`.
- Handlers: `onWheel(e)`, `onPointerDown/Move/Up(e)` (umbral anti-click +
  pointer capture). Reciben o `svgRef` para `getScreenCTM`/medición.
- Devolve `{ transform, onWheel, onPointerDown, onPointerMove, onPointerUp, fit, reset, zoomIn, zoomOut, getZoom, isPanning }`.

### T2 — `SVGRenderer.tsx`: aplicar transform + handlers
- `const svgRef = useRef<SVGSVGElement>(null)`; usar `useViewport(svgRef, bounds, padding, { minZoom, maxZoom, fitOnMount })`.
- `<svg ref={svgRef} ... onWheel onPointerDown onPointerMove onPointerUp>`.
- Envolver `{children}` en `<g transform={transform}>` (na rama principal; a
  rama baleiro/erro queda igual).
- `fitOnMount`: `useEffect` que mide `svgRef.current.getBoundingClientRect()`
  e chama `fit()` (cliente only; guard se `bounds` indefinido).
- **`<defs>` queda FÓRA do `<g>` transform** (markers non se deben escalar co
  contido… ou si, segundo se vexa; por defecto fóra). Decide e nota no reporte.

### T3 — API imperativa (`SkillTree` + wrapper)
- `forwardRef` no `SkillTree` (headless) expoñendo `SkillTreeHandle` (§2.7) vía
  `useImperativeHandle`, conectado ás accións do `useViewport` (pasar refs/
  callbacks desde `SVGRenderer` ou elevar o hook a `SkillTree`; decide a vía
  máis limpa — probablemente **elevar `useViewport` a `SkillTree`** e pasar
  `transform`+handlers ao `SVGRenderer` por props, para que o handle viva onde
  vive a API pública).
- Reenviar o ref a través de `SkillTreeWithDefaultTheme`.

### T4 — Props
- `SkillTree`/`SVGRenderer`: `minZoom?` (0.25), `maxZoom?` (4),
  `fitOnMount?` (true), opcional `onViewportChange?({panX,panY,zoom})`.
  Todas **opcionais**, retrocompatibles.

### T5 — Demo
- `App.tsx`: `const treeRef = useRef<SkillTreeHandle>(null)`; pasar
  `ref={treeRef}`. Botóns no panel **Controls**: **Fit**, **Reset**,
  **Zoom +**, **Zoom −** (chaman ás accións do handle).
- Verificar: arrastrar = pan; roda = zoom cara ao cursor; clic en nodo segue
  desbloqueando; botóns funcionan.

### T6 — Tests
- Helpers puros: `clampZoom`, `fitTransform` (encadre correcto), `zoomToward`
  (punto do cursor fixo), `clampPan`.
- `useViewport` (con `@testing-library/react-hooks` ou render mínimo):
  estado inicial, `zoomIn/Out` clampa, `reset`.
- `SVGRenderer`: `{children}` van dentro do `<g transform>`; handlers
  presentes. (Pointer/wheel en jsdom é limitado → testar sobre todo os
  helpers puros + actualizacións de estado simuladas.)
- Gate verde (lint→format→typecheck:packages→test; conta tests).

### T7 — Docs + changeset + commit
- `RENDERER-STATE.md`: 10.6 ✅; nota do modelo viewport (transform group +
  useViewport + handle imperativo).
- Se aparece o *gotcha* do wheel (listener pasivo / `preventDefault`), **engade
  A.6.23** ao MASTER (ver §5).
- `build`: `pnpm turbo run build --filter=@react --force` se procede (A.6.18).
- Changeset `.changeset/f10-6-viewport.md` → `@yggdrasil-forge/react` minor:
  `feat(react): viewport — pan, wheel-zoom-to-cursor, fit-to-bounds + imperative handle (F10.6)`
- Copia este briefing a `docs/briefings/BRIEFING_10_6_VIEWPORT.md`.
- Commit único + `git format-patch -1 HEAD`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/hooks/useViewport.ts                  (A)
packages/react/src/SVGRenderer.tsx                       (M)
packages/react/src/SkillTree.tsx                         (M)
packages/react/src/SkillTreeWithDefaultTheme.tsx         (M, reenvío ref)
packages/react/src/index.ts / headless.ts                (M, export SkillTreeHandle)
packages/react/__tests__/useViewport.*.test.ts(x)        (A)
packages/react/__tests__/SVGRenderer.test.tsx            (M)
examples/react-demo/src/App.tsx                          (M)
docs/architecture/RENDERER-STATE.md                      (M)
.changeset/f10-6-viewport.md                             (A)
docs/briefings/BRIEFING_10_6_VIEWPORT.md                 (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Riscos / gotchas a vixiar
- **Wheel `preventDefault`**: `onWheel` de React pode rexistrarse como
  *passive* (non deixa `preventDefault`). Se a páxina rola ao facer zoom →
  rexistrar un listener nativo non-pasivo no `svgRef` vía `useEffect`
  (`addEventListener('wheel', h, { passive: false })`). Se pasa → **A.6.23**.
- **Pan vs click**: umbral obrigatorio, ou os nodos non se poderán premer.
- **SSR**: medir tamaño só en `useEffect` (cliente). Guard se non hai `bounds`.
- **`getScreenCTM`**: pode ser `null` (svg non montado) → guard.
- **Headless limpo**: o hook engade comportamento, **non estilos**. O estilo
  dos botóns vive no demo.
- **Reenvío de ref** a través do wrapper de tema: se enguedella, **escala**.

## 6. Que NON facer
- ❌ NON manipular o `viewBox` para zoom/pan (usa o `<g transform>`; o viewBox
  queda como encadre base/fit).
- ❌ NON meter estilos/botóns dentro do `SVGRenderer` headless.
- ❌ NON romper o clic dos nodos (umbral anti-click).
- ❌ NON props obrigatorias (todas opcionais, retrocompatibles).
- ❌ NON `window`/medición fóra de effects/handlers (SSR).
- ❌ NON inventar API (GREP T0).

## 7. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: **arrastrar** despraza a árbore; **roda do rato** fai
zoom cara ao cursor; **Fit** encadra todo; **Reset** volve ao inicial; o
**clic nos nodos segue desbloqueando**. Visual check **pendente de Agarfal**.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T7) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` (children/bounds, SkillTree forwardRef, hooks) ·
- `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `⚠️ WHEEL` (¿fixo falta listener nativo? → A.6.23) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.6. 4º Arquitecto. A árbore, navegable; o ceo, ao alcance. 🌳*
