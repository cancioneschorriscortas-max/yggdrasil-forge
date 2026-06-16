# BRIEFING — SUB-FASE 7.3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **TERCEIRA sub-fase da Fase 7.** Engade dous compoñentes públicos
> novos a `@yggdrasil-forge/react`:
> 1. **`MeshOverlay`** (renderiza `layoutResult.mesh` como `<g>` con
>    `<line>`/`<circle>`/`<polygon>`).
> 2. **`SVGRenderer`** (envolve `<svg>` con viewBox automático,
>    role/aria, classes; reutilizable para compoñer vistas custom).
>
> Tamén refactoriza **`SkillTree`** para usar internamente `SVGRenderer`
> + `MeshOverlay` (cero cambio funcional observable; tests existentes
> intactos), e extrae **`buildPathD`** de `SkillEdge` a un módulo
> interno `svg-helpers.ts` (reutilizado por SkillEdge sen cambio
> observable).
>
> **ThemeProvider (7.4), hooks customizados (7.5), animacións (7.6),
> a11y/keyboard (7.7), prefers-reduced-motion (7.8), SSR/RSC entry
> points (7.9), mobile/touch (7.10), error boundaries (7.11), tests
> visuais (7.12) DIFERIDOS**.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente Fases 6 + 7.1 + 7.2).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Lección 7.2 L1
APLICADA POLO DIRECTOR**: o director verificou empíricamente todos os
literais e nomenclaturas prescritas neste briefing en T0 (ver §2).
Calquera desvío empírico → **ESCALAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas
verificablemente inalcanzables anótanse con `/* v8 ignore next */ +
xustificación`. **Cero regresión de cobertura tolerada** respecto á
baseline post-7.2 (SkillTree: 100/100/100/100; SkillEdge: 100/100/100/100;
createDefaultLayoutRegistry: 100/100/100/100; SkillNode 73.33/52.17/75/69.23
mantén — non se toca neste briefing).

**0.12 — Lección 7.2 L1 (verificación empírica de literais)**: T0 do
briefing inclúe **grep mandatorio** para confirmar nomenclaturas reais
antes de tocar código.

**0.13 — REFACTOR DE PEZAS DE 7.2**: 7.3 modifica **`SkillTree.tsx`**
e **`SkillEdge.tsx`** entregados en 7.2. **Cero cambio funcional
observable**: tests existentes de SkillTree.test.tsx deben seguir
pasando intactos. Esta é **decisión consciente do director** (§4) e
**permite scope creep controlado** dentro de 7.3.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.3** de Yggdrasil Forge. **TERCEIRA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (4 grupos)**:

**Grupo A — Compoñentes públicos novos**:
1. **`MeshOverlay`**: compoñente puro que renderiza `<g>` con
   `<line>`/`<circle>`/`<polygon>` por cada `MeshElement`. Cero hooks.
2. **`SVGRenderer`**: compoñente puro que envolve `<svg>` con viewBox
   calculado automaticamente desde `bounds + padding`, role/aria, e
   classes (estado normal ou erro). Cero hooks.

**Grupo B — Módulo interno de helpers SVG**:
3. **`svg-helpers.ts`**: módulo privado co `buildPathD(path: EdgePath):
   string` extraído de `SkillEdge.tsx` + `buildViewBox(bounds, padding):
   string` extraído de `SkillTree.tsx`. **Cero cambio de comportamento**.

**Grupo C — Refactor de pezas 7.2 (cero cambio funcional)**:
4. **`SkillTree.tsx`**: refactor para usar internamente `SVGRenderer`
   + `MeshOverlay` + helper `buildViewBox`. Tests existentes intactos.
5. **`SkillEdge.tsx`**: refactor para importar `buildPathD` desde
   `svg-helpers.ts` (en lugar de definilo localmente). Tests intactos.

**Grupo D — Tests novos**:
6. **`MeshOverlay.test.tsx`** (NOVO): ~6 tests para os 3 MeshElement
   types + edge cases.
7. **`SVGRenderer.test.tsx`** (NOVO): ~5 tests para viewBox, classes,
   error state.
8. **`SkillTree.test.tsx`** (MODIFICADO): engadir ~3 tests para
   integración con MeshOverlay (RadialLayout xera mesh → MeshOverlay
   no DOM; outros layouts non → cero MeshOverlay).

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/` enteiros.
- Outros 14 paquetes scaffold.
- `SkillNode.tsx` (cobertura SkillNode 73.33/52.17 manténse —
  cubrirase en 7.7 keyboard).
- `createDefaultLayoutRegistry.ts`.
- `package.json` (cero deps novas), `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml` (cero entradas novas no catálogo).
- `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero modificación de `packages/common/`.
**Cero deps de npm engadidas.**

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `12df2f9`, verificada empíricamente
en clone independente)**.

### Verificación empírica de literais (lección 7.2 L1)

**MeshElement union (literal)** — verificado en
`packages/core/src/engine/layouts/LayoutResult.ts`:

```ts
export type MeshElement =
  | { readonly type: 'line';    readonly from: Position; readonly to: Position }
  | { readonly type: 'circle';  readonly center: Position; readonly radius: number }
  | { readonly type: 'polygon'; readonly points: readonly Position[] }
```

**3 literais exactos**: `'line'`, `'circle'`, `'polygon'`. **Cero
`'arc'`, `'rect'`, `'path'`** ou outros tipos. Discriminated union por
`type` field. Cero campo común salvo `type`.

**Layouts que xeran mesh** (verificado por grep):
- **Só `RadialLayout`** chama a `generateMesh` (liña 102 de
  `RadialLayout.ts`).
- **IdentityLayout** e **TreeLayout** NON producen mesh
  (`layoutResult.mesh` queda undefined).
- **MeshType (config de RadialLayout)**: `'none' | 'rings' | 'cross' |
  'star'`. **NON é o mesmo que `MeshElement.type`**. O MeshGenerator
  traduce MeshType → MeshElement[] (cada MeshType produce un combinado
  de line/circle/polygon).

**Position e Bounds** (verificados xa en 7.2):
- `Position { readonly x: number; readonly y: number }`.
- `Bounds { readonly minX, minY, maxX, maxY: number }`.

### Estado de SkillTree.tsx tras 7.2 (verificado empíricamente)

Estrutura actual (relevante para o refactor):

```tsx
// Liñas 71-80: error path
if (!layoutResult.ok) {
  return (
    <svg
      className="yf-skill-tree yf-skill-tree--error"
      data-error={layoutResult.error.code}
      role="img"
      aria-label="Skill tree (layout error)"
    />
  )
}

// Liñas 82-94: destructure + buildViewBox inline
const { nodes: nodePositions, edges: edgePaths, bounds } = layoutResult.value
// ... edgeMap memo ...
const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${
  bounds.maxX - bounds.minX + padding * 2
} ${bounds.maxY - bounds.minY + padding * 2}`

// Liñas 96-122: <svg> + 2 <g> (edges + nodes)
return (
  <svg
    className="yf-skill-tree"
    data-layout={layoutResult.value.layoutType}
    viewBox={viewBox}
    role="img"
    aria-label="Skill tree"
  >
    <g className="yf-skill-edges">{...}</g>
    <g className="yf-skill-nodes">{...}</g>
  </svg>
)
```

**Refactor target**: substituír os dous `<svg>` (normal + error) por
`<SVGRenderer>`, e engadir `<MeshOverlay>` ANTES dos edges.

### Estado de SkillEdge.tsx tras 7.2

`buildPathD` está como **función local privada** dentro de
`SkillEdge.tsx`. **Refactor target**: mover a `svg-helpers.ts` e
importar.

### Spec MASTER

§67 lista só "**7.3 MeshOverlay + SVGRenderer**" sen máis detalle.
**Cero referencia explícita a SVGRenderer noutras seccións do MASTER**
(verificado por grep exhaustivo). **Decisión arquitectónica recae no
director**:

- **`MeshOverlay`**: claramente prescrito como compoñente público
  (renderiza `layoutResult.mesh`).
- **`SVGRenderer`**: o director interpreta como **wrapper SVG
  reutilizable** que SkillTree usa internamente, **exportado
  publicamente** para que consumidores avanzados poidan compoñer vistas
  custom (ex: `<SVGRenderer bounds={...}><SkillNode .../></SVGRenderer>`).

**Caso de uso futuro previsto**: en sub-fases posteriores (7.4
ThemeProvider, 7.5 hooks customizados), o consumidor podería querer
renderizar fragmentos da árbore (só certos nodos, vistas custom). Ter
`SVGRenderer` como peza pública prepara o terreo.

### Estado scaffold actual

```
packages/react/src/
├── SkillEdge.tsx                  (80 liñas; buildPathD interno)
├── SkillNode.tsx                  (89 liñas; cero cambio en 7.3)
├── SkillTree.tsx                  (138 liñas; refactor en 7.3)
├── createDefaultLayoutRegistry.ts (25 liñas; cero cambio)
└── index.ts                       (10 liñas; engadir exports)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `12df2f9` (SkillTree+SkillNode+SkillEdge 7.2).
- 1523 core + 60 common + 193 storage + **15 react** = ~1791 monorepo limpo
  (+ paquetes scaffold con 1 smoke test cada un).
- Typecheck **22/22**, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- packages/react/ ten 3 compoñentes públicos (SkillTree, SkillNode,
  SkillEdge) + 1 helper interno (createDefaultLayoutRegistry).
- Cobertura packages/react: SkillTree 100/100/100/100, SkillEdge
  100/100/100/100, createDefaultLayoutRegistry 100/100/100/100,
  **SkillNode 73.33/52.17/75/69.23** (manténse — cubrirase en 7.7).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` dous compoñentes públicos
novos (`MeshOverlay` que renderiza `layoutResult.mesh` como `<g>` de
`<line>`/`<circle>`/`<polygon>`, e `SVGRenderer` que envolve `<svg>`
con viewBox automático + role/aria + classes) e un módulo interno
`svg-helpers.ts` (con `buildPathD` extraído de SkillEdge e `buildViewBox`
extraído de SkillTree), refactorizando `SkillTree.tsx` e `SkillEdge.tsx`
para usar internamente as novas pezas sen cambio funcional observable
(tests existentes de 7.2 seguen pasando intactos). **Cero deps novas,
cero ErrorCodes novos, cero modificación de packages/core/common/storage/
ou outros paquetes scaffold, cero modificación de SkillNode**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/MeshOverlay.tsx` (~60 liñas estimadas).
- `packages/react/src/SVGRenderer.tsx` (~75 liñas).
- `packages/react/src/svg-helpers.ts` (~55 liñas; buildPathD + buildViewBox).
- `packages/react/__tests__/MeshOverlay.test.tsx` (~90 liñas; ~6 tests).
- `packages/react/__tests__/SVGRenderer.test.tsx` (~80 liñas; ~5 tests).
- `.changeset/mesh-svg-renderer.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/SkillTree.tsx` (refactor: usa SVGRenderer +
  MeshOverlay + helper buildViewBox).
- `packages/react/src/SkillEdge.tsx` (refactor: importa buildPathD
  de svg-helpers en lugar de definilo localmente).
- `packages/react/src/index.ts` (engadir 2 exports + 2 type exports).
- `packages/react/__tests__/SkillTree.test.tsx` (engadir ~3 tests
  para integración con MeshOverlay; cero modificación de tests
  existentes).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de**:
- `packages/react/src/SkillNode.tsx`, `createDefaultLayoutRegistry.ts`.
- `packages/react/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.

### 5.2 — `MeshOverlay` compoñente (FIXADO)

```tsx
// packages/react/src/MeshOverlay.tsx
// ── INICIO: MeshOverlay ──
import { type JSX } from 'react'
import type { MeshElement } from '@yggdrasil-forge/core'

export interface MeshOverlayProps {
  /**
   * Lista de elementos mesh do layout. Tipicamente
   * `layoutResult.mesh`. Pode ser undefined ou array baleiro; en
   * ambos casos o compoñente devolve null (cero overhead DOM).
   */
  readonly mesh?: readonly MeshElement[]
}

/**
 * Renderiza overlay visual auxiliar do layout. Cada `MeshElement`
 * transformase nun elemento SVG segundo o seu `type`:
 * - `'line'` → `<line x1 y1 x2 y2>`
 * - `'circle'` → `<circle cx cy r>`
 * - `'polygon'` → `<polygon points="x1,y1 x2,y2 ...">`
 *
 * Compoñente puro (cero hooks). SSR-safe. Usable como child directo
 * de SVGRenderer ou de calquera `<svg>`.
 */
export function MeshOverlay({ mesh }: MeshOverlayProps): JSX.Element | null {
  if (mesh === undefined || mesh.length === 0) return null

  return (
    <g className="yf-mesh-overlay">
      {mesh.map((element, idx) => renderElement(element, idx))}
    </g>
  )
}

function renderElement(element: MeshElement, idx: number): JSX.Element {
  switch (element.type) {
    case 'line':
      return (
        <line
          key={`line-${idx}`}
          className="yf-mesh-overlay__line"
          x1={element.from.x}
          y1={element.from.y}
          x2={element.to.x}
          y2={element.to.y}
          fill="none"
          stroke="currentColor"
        />
      )
    case 'circle':
      return (
        <circle
          key={`circle-${idx}`}
          className="yf-mesh-overlay__circle"
          cx={element.center.x}
          cy={element.center.y}
          r={element.radius}
          fill="none"
          stroke="currentColor"
        />
      )
    case 'polygon':
      return (
        <polygon
          key={`polygon-${idx}`}
          className="yf-mesh-overlay__polygon"
          points={element.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
        />
      )
  }
}
// ── FIN: MeshOverlay ──
```

**Decisións nesta peza**:
- **Key estable** por índice + tipo prefixo (`line-0`, `circle-1`,
  etc.). Razonable porque o array mesh é estable durante o ciclo de
  vida dun layout dado (cero reorder dinámico).
- **Classes CSS**: `yf-mesh-overlay` (raíz), `yf-mesh-overlay__line`,
  `__circle`, `__polygon` (BEM). Contrato público estable.
- **`fill="none"` + `stroke="currentColor"`**: idéntico ao patrón
  de SkillEdge. Cero estilos hardcoded; o consumidor controla via
  CSS.
- **Cero data-attributes** (cero estado por mesh element; son
  decorativos). Se 7.4 ThemeProvider require, engadirase entón.
- **Switch exhaustive**: TypeScript verifica que tódolos casos do
  union están cubertos (cero default branch necesario).

### 5.3 — `SVGRenderer` compoñente (FIXADO)

```tsx
// packages/react/src/SVGRenderer.tsx
// ── INICIO: SVGRenderer ──
import { type JSX, type ReactNode } from 'react'
import type { Bounds } from '@yggdrasil-forge/core'
import { buildViewBox } from './svg-helpers.js'

export interface SVGRendererProps {
  /**
   * Bounds do contido (do layoutResult). Se non se pasa, viewBox
   * defaultea a `'0 0 0 0'` (estado vacío; mostra cero contido).
   */
  readonly bounds?: Bounds

  /**
   * Padding ao redor dos bounds (en unidades do layout). Default 16.
   * Cero pasa = sen marxen.
   */
  readonly padding?: number

  /**
   * Tipo de layout activo (p.ex. 'custom', 'radial', 'tree').
   * Renderizado como `data-layout` no `<svg>`. Útil para CSS por
   * layout.
   */
  readonly layoutType?: string

  /**
   * Modo de erro. Se `error` está definido, renderízase un svg
   * con `class="yf-skill-tree--error"` + `data-error={error}` e
   * un `aria-label` específico. Cero children renderízanse en
   * estado de erro.
   */
  readonly error?: string

  /**
   * Etiqueta aria do svg. Default 'Skill tree' (ou 'Skill tree
   * (layout error)' en estado erro).
   */
  readonly ariaLabel?: string

  /**
   * Contido SVG interior. Tipicamente `<MeshOverlay />` + `<g>`s
   * con SkillEdges e SkillNodes.
   */
  readonly children?: ReactNode
}

/**
 * Compoñente público wrapper para `<svg>` co viewBox calculado
 * automáticamente desde `bounds + padding`, role/aria, classes
 * documentadas e modo de erro. Usado internamente por SkillTree;
 * exportado publicamente para que consumidores poidan compoñer
 * vistas custom (combinando con SkillNode, SkillEdge, MeshOverlay).
 *
 * Compoñente puro (cero hooks). SSR-safe.
 */
export function SVGRenderer({
  bounds,
  padding = 16,
  layoutType,
  error,
  ariaLabel,
  children,
}: SVGRendererProps): JSX.Element {
  const viewBox = buildViewBox(bounds, padding)

  if (error !== undefined) {
    return (
      <svg
        className="yf-skill-tree yf-skill-tree--error"
        data-error={error}
        viewBox={viewBox}
        role="img"
        aria-label={ariaLabel ?? 'Skill tree (layout error)'}
      />
    )
  }

  return (
    <svg
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
    >
      {children}
    </svg>
  )
}
// ── FIN: SVGRenderer ──
```

**Decisións nesta peza**:
- **Cero `className` ou `style` props** (manter API mínima; o
  contrato de classes é fixo `yf-skill-tree`).
- **`error` é a code string (e.g. 'YGG_E018')**, non un objeto. Coherente
  co que SkillTree pasa (`layoutResult.error.code`).
- **Spread condicional para `data-layout`** (exactOptionalPropertyTypes).
- **`ariaLabel` opcional con default razoable**.
- **`bounds: undefined`** → buildViewBox devolve `'0 0 0 0'` (estado
  vacío). Cero throw.

### 5.4 — `svg-helpers.ts` módulo interno (FIXADO)

```ts
// packages/react/src/svg-helpers.ts
// ── INICIO: svg-helpers ──
// Helpers internos para construír atributos SVG.
//
// NON exportado publicamente. Reutilizado por SkillTree (buildViewBox)
// e SkillEdge (buildPathD).

import type { Bounds, EdgePath } from '@yggdrasil-forge/core'

/**
 * Constrúe o atributo `viewBox` SVG a partir de `bounds + padding`.
 * Se `bounds` é undefined, devolve `'0 0 0 0'` (estado vacío).
 */
export function buildViewBox(bounds: Bounds | undefined, padding: number): string {
  if (bounds === undefined) return '0 0 0 0'
  const x = bounds.minX - padding
  const y = bounds.minY - padding
  const width = bounds.maxX - bounds.minX + padding * 2
  const height = bounds.maxY - bounds.minY + padding * 2
  return `${x} ${y} ${width} ${height}`
}

/**
 * Constrúe o atributo `d` SVG a partir dun EdgePath. Tres formas
 * segundo `EdgePath.kind`:
 * - `'line'` (default): `M x0 y0 L x1 y1`.
 * - `'cubic'`: `M x0 y0 C x1 y1, x2 y2, x3 y3`.
 * - `'polyline'`: `M x0 y0 L x1 y1 L x2 y2 ...`.
 *
 * Se `points` está vacío, devolve `''` (cero throw; SVG path vacío
 * é tratado como cero render polos browsers).
 */
export function buildPathD(path: EdgePath): string {
  const pts = path.points
  /* v8 ignore next 1 -- defensivo: layouts producen polo menos 2 puntos por edge */
  if (pts.length === 0) return ''

  const kind = path.kind ?? 'line'
  const first = pts[0]
  if (first === undefined) return ''   // (typescript narrowing; cero v8 ignore)

  if (kind === 'cubic' && pts.length >= 4) {
    const p0 = pts[0]
    const p1 = pts[1]
    const p2 = pts[2]
    const p3 = pts[3]
    if (p0 === undefined || p1 === undefined || p2 === undefined || p3 === undefined) {
      /* v8 ignore next 1 -- defensivo: length>=4 garante presenza */
      return ''
    }
    return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`
  }

  // 'line' (2 puntos) ou 'polyline' (3+ puntos): tratamento uniforme con M + L*
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    if (p === undefined) continue   // (typescript narrowing; cero v8 ignore)
    d += ` L ${p.x} ${p.y}`
  }
  return d
}
// ── FIN: svg-helpers ──
```

**Decisións nesta peza**:
- **Cero non-null assertions `!`** (Biome compliance). Usar `if (x ===
  undefined) return` patrón.
- **buildPathD migración**: copia literal desde SkillEdge.tsx (refinada
  para non usar `!`).
- **`if (pts.length === 0)` con v8 ignore**: layouts producen sempre
  ≥2 puntos. Rama defensiva real.

### 5.5 — Refactor de `SkillTree.tsx`

**ANTES** (estado actual 7.2):
- Inline buildViewBox: cálculo manual de `viewBox` string.
- Inline `<svg>` con className/data-layout/role/aria/viewBox.
- Cero referencia a layoutResult.value.mesh.

**DESPOIS** (post-7.3):
```tsx
'use client'

import { useMemo, useSyncExternalStore, type JSX } from 'react'
import {
  type TreeEngine,
  type LayoutEngineRegistry,
  computeLayout,
} from '@yggdrasil-forge/core'
import { SkillNode } from './SkillNode.js'
import { SkillEdge } from './SkillEdge.js'
import { SVGRenderer } from './SVGRenderer.js'
import { MeshOverlay } from './MeshOverlay.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'

export interface SkillTreeProps {
  readonly engine: TreeEngine
  readonly locale?: string
  readonly onNodeClick?: (nodeId: string) => void
  readonly onEdgeClick?: (edgeId: string) => void
  readonly layoutRegistry?: LayoutEngineRegistry
  readonly padding?: number
}

export function SkillTree({
  engine,
  locale,
  onNodeClick,
  onEdgeClick,
  layoutRegistry,
  padding = 16,
}: SkillTreeProps): JSX.Element {
  const state = useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getSnapshot.bind(engine),
  )

  const treeDef = engine.getTreeDef()
  const registry = useMemo(
    () => layoutRegistry ?? createDefaultLayoutRegistry(),
    [layoutRegistry],
  )
  const layoutResult = useMemo(
    () => computeLayout(treeDef, registry, locale),
    [treeDef, registry, locale],
  )

  // Caso de erro: delegar en SVGRenderer co modo erro.
  if (!layoutResult.ok) {
    return <SVGRenderer padding={padding} error={layoutResult.error.code} />
  }

  const { nodes: nodePositions, edges: edgePaths, bounds, mesh } = layoutResult.value

  const edgeMap = useMemo(() => {
    const m = new Map<string, typeof treeDef.edges[number]>()
    for (const e of treeDef.edges) m.set(e.id, e)
    return m
  }, [treeDef])

  return (
    <SVGRenderer
      bounds={bounds}
      padding={padding}
      layoutType={layoutResult.value.layoutType}
    >
      <MeshOverlay mesh={mesh} />
      <g className="yf-skill-edges">
        {[...edgePaths.entries()].map(([edgeId, path]) => {
          const edge = edgeMap.get(edgeId)
          /* v8 ignore next 1 -- defensivo: edgePaths vén de computeLayout sobre treeDef.edges */
          if (edge === undefined) return null
          return (
            <SkillEdge
              key={edgeId}
              edgeId={edgeId}
              edge={edge}
              path={path}
              {...(onEdgeClick !== undefined && { onClick: onEdgeClick })}
            />
          )
        })}
      </g>
      <g className="yf-skill-nodes">
        {treeDef.nodes.map((node) => {
          const position = nodePositions.get(node.id)
          /* v8 ignore next 1 -- defensivo: computeLayout produce posicións para tódolos treeDef.nodes */
          if (position === undefined) return null
          return (
            <SkillNode
              key={node.id}
              node={node}
              instance={state.nodes[node.id]}
              position={position}
              {...(onNodeClick !== undefined && { onClick: onNodeClick })}
            />
          )
        })}
      </g>
    </SVGRenderer>
  )
}
```

**Cambios netos**:
- Importa `SVGRenderer` + `MeshOverlay` (cero `buildViewBox` inline).
- Substitúe `<svg ...>` (raíz e error) por `<SVGRenderer ...>`.
- Engade `<MeshOverlay mesh={mesh} />` antes do `<g yf-skill-edges>`.
- Destructure adicional de `mesh` desde layoutResult.value.

**Cero cambio observable**:
- Mesmo DOM output (mesmo viewBox, classes, role, aria).
- MeshOverlay devolve null cando mesh é undefined (a maioría dos
  tests existentes usan IdentityLayout sen mesh → cero diferenza).
- Tests de SkillTree.test.tsx pasan intactos.

### 5.6 — Refactor de `SkillEdge.tsx`

**ANTES** (estado actual 7.2):
- `buildPathD` definida como function local privada ao final do
  ficheiro.

**DESPOIS** (post-7.3):
```tsx
import { type JSX, type MouseEvent } from 'react'
import type { EdgeDef, EdgePath } from '@yggdrasil-forge/core'
import { buildPathD } from './svg-helpers.js'

export interface SkillEdgeProps {
  readonly edgeId: string
  readonly edge: EdgeDef
  readonly path: EdgePath
  readonly onClick?: (edgeId: string) => void
}

export function SkillEdge({
  edgeId,
  edge,
  path,
  onClick,
}: SkillEdgeProps): JSX.Element {
  const d = buildPathD(path)

  const handleClick = onClick !== undefined
    ? (_e: MouseEvent<SVGPathElement>) => onClick(edgeId)
    : undefined

  return (
    <path
      className="yf-skill-edge"
      data-edge-id={edgeId}
      data-source={edge.source}
      data-target={edge.target}
      d={d}
      fill="none"
      stroke="currentColor"
      {...(handleClick !== undefined && { onClick: handleClick })}
    />
  )
}
```

**Cambio neto**: eliminar `function buildPathD(...)` local + importar
desde `./svg-helpers.js`. Resto idéntico.

### 5.7 — Cero modificación de SkillNode.tsx

**Decisión explícita**: SkillNode.tsx **NON se toca en 7.3**. A súa
cobertura post-7.2 (73.33/52.17/75/69.23) **mantense exactamente igual**
post-7.3.

**Razóns**:
- 7.3 é sobre mesh + SVG infraestrutura, non sobre node atómicos.
- SkillNode tocarase en 7.7 (keyboard navigation) onde naturally
  chegará a ≥95/≥85 cobertura cubrindo as ramas non testadas (keyboard
  handler + resolveLabel fallback).
- Cero scope creep.

### 5.8 — Actualización de `index.ts`

```ts
// ── INICIO: @yggdrasil-forge/react ──
export const VERSION = '0.0.0'

export { SkillTree } from './SkillTree.js'
export type { SkillTreeProps } from './SkillTree.js'

export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'

export { SVGRenderer } from './SVGRenderer.js'           // ← NOVO
export type { SVGRendererProps } from './SVGRenderer.js' // ← NOVO

export { MeshOverlay } from './MeshOverlay.js'           // ← NOVO
export type { MeshOverlayProps } from './MeshOverlay.js' // ← NOVO
// ── FIN: @yggdrasil-forge/react ──
```

`svg-helpers.ts` **NON se exporta publicamente** (uso interno só).

### 5.9 — Tests prescritos (~14 totais)

**`MeshOverlay.test.tsx`** (~6 tests, NOVO):
1. `mesh` undefined → devolve null (cero render DOM).
2. `mesh` array vacío → devolve null.
3. MeshElement `'line'` renderiza `<line>` con x1/y1/x2/y2 correctos.
4. MeshElement `'circle'` renderiza `<circle>` con cx/cy/r correctos.
5. MeshElement `'polygon'` renderiza `<polygon>` con points formatado
   correcto (`"x1,y1 x2,y2 ..."`).
6. Mix de 3 tipos: renderiza os 3 elementos no orde do array.

**`SVGRenderer.test.tsx`** (~5 tests, NOVO):
7. `bounds` definido + padding → viewBox correcto (verificable inline).
8. `bounds` undefined → viewBox `'0 0 0 0'`.
9. `error` definido → svg con classes `yf-skill-tree yf-skill-tree--error`
   + data-error + cero children renderizados.
10. `error` undefined + `layoutType` definido → svg con `data-layout`.
11. `children` pasados → renderizan dentro do svg.

**`SkillTree.test.tsx`** (engadir ~3 tests; MODIFICADO):
12. SkillTree con RadialLayout → MeshOverlay presente no DOM
    (`querySelector('.yf-mesh-overlay')` non null).
13. SkillTree con IdentityLayout → MeshOverlay **non presente** no
    DOM (mesh é undefined; MeshOverlay devolve null).
14. Refactor preserva tests existentes: re-correr os 12 tests previos
    de SkillTree → todos pasan intactos (verificación automática vía
    `pnpm test`).

**Total: ~14 tests novos** (6 + 5 + 3). Baseline post-7.3 esperada:
15 + 14 = **~29 tests en packages/react**.

### 5.10 — Cobertura prescrita

- **MeshOverlay.tsx**: **100/100/100/100** (peza pequena con switch
  exhaustive; tódolos casos testables).
- **SVGRenderer.tsx**: **100/100/100/100**.
- **svg-helpers.ts**: **100/100/100/100** (testado indirectamente vía
  SVGRenderer + SkillEdge; pode requerir 1-2 v8 ignores para ramas
  defensivas — xa anotadas no pseudo-código).
- **SkillTree.tsx** (post-refactor): **100/100/100/100** (mantén).
- **SkillEdge.tsx** (post-refactor): **100/100/100/100** (mantén).
- **SkillNode.tsx**: **73.33/52.17/75/69.23** (sen cambios; xa
  anotado en §5.7).
- **Global packages/react**: deberá manter ou superar a media actual.

### 5.11 — Cero cambio funcional observable

**Garantía explícita do refactor**:
- DOM output de SkillTree con IdentityLayout: **idéntico** pre vs
  post-7.3.
- DOM output de SkillTree con RadialLayout: post-7.3 inclúe
  `<g class="yf-mesh-overlay">` + os mesh elements. Iso é **adición
  pura** (cero modificación de yf-skill-edges/yf-skill-nodes).
- Os 12 tests existentes de SkillTree.test.tsx deben **pasar intactos
  sen modificación**. Se algún test falla por cambio de DOM
  inesperado → **ESCALAR**.

### 5.12 — Decisión sobre key estable en MeshOverlay

`mesh.map((element, idx) => ...)` usa **índice como key** (prefixado
con tipo: `line-0`, `circle-1`, etc.).

**Razón**: o array mesh é estable durante o ciclo de vida do layout
(o RadialLayout produce o mesmo número e orde de elementos para o
mesmo treeDef). Cero reorder dinámico esperado.

**Alternativa rexeitada**: hash do contido (caro, innecesario).

### 5.13 — `'use client'` directive

**Decisión**:
- **`SkillTree.tsx`**: mantén `'use client'` (xa existente desde 7.2).
- **`MeshOverlay.tsx`**: **cero `'use client'`** (compoñente puro
  sen hooks; usable en server).
- **`SVGRenderer.tsx`**: **cero `'use client'`** (compoñente puro
  sen hooks).
- **`svg-helpers.ts`**: módulo de utilidades; cero directiva.

**Consistente con 7.2** (SkillNode, SkillEdge tampouco teñen `'use
client'`).

### 5.14 — Cero deps de npm engadidas

Verificable empíricamente: cero modificación de `package.json` deps,
cero modificación de `pnpm-workspace.yaml` catálogo, cero modificación
de `pnpm-lock.yaml`. **Se aparece algunha → ESCALAR**.

### 5.15 — Helpers para tests recomendados

Para tests de MeshOverlay e SVGRenderer (compoñentes puros), usar
`render` de `@testing-library/react` + `container.querySelector` para
inspección DOM. Patrón idéntico ao usado en SkillTree.test.tsx (7.2).

Para tests que require RadialLayout que xere mesh:
```ts
function makeRadialTreeDef(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
      { id: 'c', type: 'small', label: 'C' },
    ],
    edges: [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-c', source: 'b', target: 'c' },
    ],
    layout: { type: 'radial' },  // ← key: type 'radial' xera mesh
  }
}
```

**`type: 'small'`** confirmado correcto en NodeType (lección 7.2 L1
aplicada).

### 5.16 — Test counts esperados post-7.3

- **react**: 15 (previo) + ~14 (novos) = **~29 tests**.
- **core, common, storage**: intactos (cero modificación).
- **Total monorepo**: +14.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `MeshOverlay` compoñente | React FC puro | MeshOverlay.tsx | ~60 |
| `SVGRenderer` compoñente | React FC puro | SVGRenderer.tsx | ~75 |
| `svg-helpers` módulo | TS module | svg-helpers.ts | ~55 |
| Refactor SkillTree | Edits | SkillTree.tsx | ~10 modif |
| Refactor SkillEdge | Edits | SkillEdge.tsx | ~15 modif (eliminar fn local) |
| Exports públicos | Edits | src/index.ts | +6 |
| Tests MeshOverlay | describe block | MeshOverlay.test.tsx | ~90 |
| Tests SVGRenderer | describe block | SVGRenderer.test.tsx | ~80 |
| Tests SkillTree integración | engadir block | SkillTree.test.tsx | ~50 |

**Total estimado**: ~190 liñas de código (+ ~30 de refactor) + ~220
liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/MeshOverlay.tsx` (NOVO)
- `packages/react/src/SVGRenderer.tsx` (NOVO)
- `packages/react/src/svg-helpers.ts` (NOVO)
- `packages/react/src/SkillTree.tsx` (MODIFICADO)
- `packages/react/src/SkillEdge.tsx` (MODIFICADO)
- `packages/react/src/index.ts` (MODIFICADO: +4 export lines)
- `packages/react/__tests__/MeshOverlay.test.tsx` (NOVO)
- `packages/react/__tests__/SVGRenderer.test.tsx` (NOVO)
- `packages/react/__tests__/SkillTree.test.tsx` (MODIFICADO: +3 tests)
- `.changeset/mesh-svg-renderer.md` (NOVO: minor para react)
- `CHANGELOG.md` (MODIFICADO)

**NON deben aparecer cambios en**:
- `packages/react/src/SkillNode.tsx`.
- `packages/react/src/createDefaultLayoutRegistry.ts`.
- `packages/react/__tests__/smoke.test.tsx` (intacto desde 7.1).
- `packages/react/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- `tsconfig.base.json`, `vitest.config.ts` raíz.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx` files. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, cero `any`. NON desactives
Biome.

**JSX automatic runtime** + `import { type JSX, ... } from 'react'`
inline (patrón estable post-7.2).

**Discriminated union switch**: usar `switch (element.type)` con todos
os casos da union; TypeScript verifica exhaustiveness. **Cero `default:`
necesario** (e cero `as never` workarounds).

**Cero non-null assertions** (`!`); Biome rexéitaas. Usar
`if (x === undefined)` patrón.

**Marcadores**: `// ── INICIO: <peza> ──` / `// ── FIN: <peza> ──`
en cada ficheiro novo.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar `SkillNode.tsx` (cobertura cubrirase en 7.7).
- ❌ Modificar `createDefaultLayoutRegistry.ts`.
- ❌ Engadir deps de npm (cero modificación de package.json,
  pnpm-workspace.yaml, pnpm-lock.yaml).
- ❌ Engadir ThemeProvider — 7.4.
- ❌ Engadir hooks customizados (`useSkillTree`, `useNodeState`) — 7.5.
- ❌ Engadir SkillTreeErrorBoundary — 7.11.
- ❌ Engadir entry points `/server` ou `/headless` — 7.9, 7.4.
- ❌ Engadir animacións CSS — 7.6.
- ❌ Engadir ARIA avanzada ou keyboard navigation — 7.7.
- ❌ Cambiar a sinatura observable de SkillTree ou SkillEdge.
- ❌ Modificar tests existentes de SkillTree.test.tsx (só engadir
  novos no mesmo describe ou nun describe novo).
- ❌ Engadir `'use client'` a MeshOverlay/SVGRenderer/svg-helpers
  (son puros).
- ❌ Exportar `svg-helpers` publicamente (uso interno só).
- ❌ Engadir un `default:` no switch de MeshOverlay (exhaustiveness via TS).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir Date.now() / Math.random() nos compoñentes.
- ❌ Tolerar regresión de cobertura para SkillTree, SkillEdge, ou
  createDefaultLayoutRegistry (debían estar a 100%).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T11)

### T0 — Verificación previa (baseline) + lección 7.2 L1

**T0.1** — `git status` limpo. `git log -1` mostra `12df2f9` como HEAD.

**T0.2** — **LITERAIS VERIFICADOS** (lección 7.2 L1 aplicada por
T0 do executor):

```bash
# MeshElement.type literais
grep -E "type: '" packages/core/src/engine/layouts/LayoutResult.ts | head -5
# esperado: 'line', 'circle', 'polygon'

# NodeType reais (para tests):
grep -B 1 -A 5 "^export type NodeType" packages/core/src/types/node.ts
# esperado: 'small' | 'notable' | 'keystone' | 'mastery' | 'ascendancy'

# Layout type que xera mesh ('radial')
grep -E "readonly type =" packages/core/src/engine/layouts/RadialLayout.ts
# esperado: 'radial'

# buildPathD actual en SkillEdge (para confirmar refactor target):
grep -n "function buildPathD" packages/react/src/SkillEdge.tsx
# esperado: 1 match
```

**T0.3** — Verificar baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 15 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear svg-helpers.ts

Crear `packages/react/src/svg-helpers.ts` segundo §5.4 literal.

### T2 — Crear MeshOverlay.tsx

Crear `packages/react/src/MeshOverlay.tsx` segundo §5.2 literal.

### T3 — Crear SVGRenderer.tsx

Crear `packages/react/src/SVGRenderer.tsx` segundo §5.3 literal.

### T4 — Refactor SkillEdge.tsx

Eliminar a función local `buildPathD` e importar desde
`./svg-helpers.js`. Cero outro cambio.

Verificar empíricamente que tests de SkillEdge (parte de SkillTree.test.tsx
en 7.2) seguen pasando:
```bash
pnpm --filter @yggdrasil-forge/react test --force
# esperado: 15 tests pasando
```

### T5 — Refactor SkillTree.tsx

Substituír segundo §5.5 literal. Verificar empíricamente que tests
existentes pasan:
```bash
pnpm --filter @yggdrasil-forge/react test --force
# esperado: 15 tests pasando (cero cambio funcional observable)
```

**Se algún test existente falla** → **ESCALAR** (algo no refactor
cambiou comportamento observable; revisar diff).

### T6 — Actualizar index.ts

Engadir 4 export lines (2 value + 2 type) segundo §5.8 literal.

### T7 — Crear MeshOverlay.test.tsx

Implementar ~6 tests segundo §5.9 bloque 1.

### T8 — Crear SVGRenderer.test.tsx

Implementar ~5 tests segundo §5.9 bloque 2.

### T9 — Engadir tests de integración a SkillTree.test.tsx

Engadir ~3 tests (mesh con RadialLayout, cero mesh con IdentityLayout,
preservación tests existentes) segundo §5.9 bloque 3. **Cero
modificación dos tests existentes** dentro de SkillTree.test.tsx.

### T10 — Verificación

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~29 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   MeshOverlay.tsx, SVGRenderer.tsx, svg-helpers.ts: 100/100/100/100
#   SkillTree.tsx, SkillEdge.tsx, createDefaultLayoutRegistry.ts: 100/100/100/100
#   SkillNode.tsx: 73.33/52.17/75/69.23 (sen cambio)
```

### T11 — Build + Lint + Format + Grep + Changeset + CHANGELOG + commit + push

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/ packages/react/__tests__/
# esperado: cero matches reais
```

`.changeset/mesh-svg-renderer.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add MeshOverlay + SVGRenderer components (sub-phase 7.3)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: dous compoñentes públicos novos:
  - `MeshOverlay`: compoñente puro que renderiza `layoutResult.mesh`
    como `<g>` con `<line>` / `<circle>` / `<polygon>` segundo o
    `MeshElement.type` (3 literais: 'line', 'circle', 'polygon').
    Tipicamente xerado por `RadialLayout` (anel concéntrico, cross,
    star, polygon perimetral). Devolve null cando `mesh` é undefined
    ou array vacío (cero overhead DOM).
  - `SVGRenderer`: wrapper público para `<svg>` con viewBox calculado
    automáticamente desde `bounds + padding`, role/aria, classes
    documentadas (`yf-skill-tree`, `yf-skill-tree--error`,
    `data-layout`, `data-error`), e modo erro explícito. Reutilizable
    para que consumidores avanzados compoñan vistas custom (ex:
    `<SVGRenderer bounds={...}><SkillNode .../></SVGRenderer>`).
- `SkillTree` refactorizado internamente para usar `SVGRenderer` +
  `MeshOverlay`. **Cero cambio funcional observable** para o
  consumidor.
- `SkillEdge` refactorizado para importar `buildPathD` desde un
  módulo interno `svg-helpers.ts` (compartido con `SVGRenderer`).
  Cero cambio observable.

### Note
- Sub-fase 7.3 TERCEIRA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS**: ThemeProvider + temas (7.4), hooks customizados
  (7.5), animacións CSS (7.6), keyboard navigation + ARIA (7.7),
  prefers-reduced-motion (7.8), SSR + RSC entry points (7.9),
  mobile/touch (7.10), error boundaries (7.11), tests visuais (7.12).
- **Classes CSS novas (contrato público estable)**:
  `yf-mesh-overlay`, `yf-mesh-overlay__line`, `yf-mesh-overlay__circle`,
  `yf-mesh-overlay__polygon`. Reutilizables por ThemeProvider en 7.4.
- **`MeshOverlay` e `SVGRenderer` son compoñentes puros** (cero
  hooks, cero `'use client'`); usables tanto en server como en client.
- **`SkillTree` mantén `'use client'`** (usa hooks).
- **`svg-helpers` é módulo interno**, non exportado publicamente.
- **Cero deps de npm engadidas** (cero modificación de package.json
  ou pnpm-workspace.yaml).
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **SkillNode.tsx cobertura (73.33/52.17/75/69.23) mantense igual**;
  cubrirase naturalmente en 7.7 (keyboard navigation).
```

Commit Conventional:
`feat(react): add MeshOverlay + SVGRenderer components (sub-phase 7.3)`

Push directo a `origin/main` (base `12df2f9`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 12df2f9)
✅ 2 compoñentes públicos novos: MeshOverlay, SVGRenderer
✅ 1 módulo interno: svg-helpers (buildPathD + buildViewBox)
✅ SkillTree refactorizado para usar SVGRenderer + MeshOverlay
✅ SkillEdge refactorizado para importar buildPathD desde svg-helpers
✅ CERO cambio funcional observable nos refactors (12 tests
   previos de SkillTree pasan intactos)
✅ Discriminated union switch exhaustive nos 3 MeshElement types
✅ Classes CSS novas (yf-mesh-overlay__line/circle/polygon)
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO modificación de SkillNode.tsx
✅ CERO modificación de createDefaultLayoutRegistry.ts
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ T0.2 literais verificados: MeshElement {line, circle, polygon},
   NodeType {small, notable, keystone, mastery, ascendancy},
   RadialLayout.type = 'radial'
✅ Tests: <N> pasan en react (<delta> novos, 15 previos intactos)
   - 6 MeshOverlay
   - 5 SVGRenderer
   - 3 SkillTree integración con mesh
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - MeshOverlay.tsx: 100/100/100/100
   - SVGRenderer.tsx: 100/100/100/100
   - svg-helpers.ts: 100/100/100/100
   - SkillTree.tsx (post-refactor): 100/100/100/100
   - SkillEdge.tsx (post-refactor): 100/100/100/100
   - SkillNode.tsx: 73.33/52.17/75/69.23 (sen cambios; 7.7)
   - v8 ignore engadidos: <listado se aplica>
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok
✅ GREP ANTI-PLACEHOLDER: <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.3 TERCEIRA da Fase 7.
   - 9 sub-fases pendentes (7.4 a 7.12).
   - MeshOverlay + SVGRenderer son compoñentes puros (cero
     'use client', usables en server).
   - svg-helpers módulo interno; non exportado publicamente.
   - Classes CSS yf-mesh-overlay__* engadidas ao contrato público.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 11 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.4 (ThemeProvider + temas Oberón + minimal).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.3. Terceira sub-fase da Fase 7. Engade MeshOverlay
+ SVGRenderer + svg-helpers ao paquete react, refactorizando SkillTree
+ SkillEdge para usar as novas pezas sen cambio funcional observable.
Risco arquitectónico MEDIO-BAIXO (compoñentes pequenos + refactor
acoutado con garantía de tests intactos). Cero deps novas. Cero
ErrorCodes novos. Cero modificación de pezas fora de packages/react/.
Calquera dúbida → ESCALAR.*

*Lección 7.2 L1 aplicada rigorosamente: tódolos literais (MeshElement
types, NodeType, RadialLayout.type) verificados empíricamente polo
director en §2 e re-verificados polo executor en T0.2 antes de
implementar.*
