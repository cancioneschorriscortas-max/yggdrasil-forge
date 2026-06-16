# BRIEFING — SUB-FASE 7.2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEGUNDA sub-fase da Fase 7 (React Renderer + a11y + SSR + RSC).**
> Primeira sub-fase con compoñentes React reais. Entrega 3 compoñentes:
> **`SkillTree`** (raíz SVG), **`SkillNode`** (átomo), **`SkillEdge`**
> (conexión). Reactivos via `useSyncExternalStore` (hook nativo de
> React, NON hook customizado — eses van en 7.5). **Headless por
> defecto** (cero estilos hardcoded; só classes CSS + data-attributes
> documentados). **SSR-safe** verificable con `renderToString`.
> **MeshOverlay/SVGRenderer dedicados (7.3), ThemeProvider (7.4),
> hooks customizados (7.5), animacións (7.6), a11y avanzada (7.7+)
> DIFERIDOS**.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente Fases 6 + 7.1).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 6.5 L1
(verificación empírica de sinaturas)**: o director **VERIFICOU
EMPÍRICAMENTE** en T0 todas as APIs prescritas neste briefing.
Calquera desvío empírico → **ESCALAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas verificablemente
inalcanzables anótanse con `/* v8 ignore next */ + xustificación`.
**Cero regresión de cobertura tolerada** (baseline: cero, peza nova
sen baseline previa).

**0.12 — PRIMEIRA SUB-FASE CON DOM EN TESTS**: 7.2 introduce `jsdom`
como test environment + `@testing-library/react` para tests de
interacción. **Engadir tamén ao catálogo pnpm-workspace.yaml** para
reutilización en sub-fases futuras (7.3, 7.4, 7.5...).

---

## 1. IDENTIFICACIÓN

Sub-fase **7.2** de Yggdrasil Forge. **SEGUNDA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (4 grupos)**:

**Grupo A — Compoñentes React**:
1. **`SkillTree`** (compoñente raíz): toma `engine` como prop,
   subscríbese a el via `useSyncExternalStore`, calcula layout via
   `computeLayout(engine.getTreeDef(), registry)`, renderiza `<svg>`
   container con `<g>` para edges + `<g>` para nodes.
2. **`SkillNode`** (compoñente átomo): renderiza `<g>` por nodo con
   `<circle>` + `<text>`. Props: `node: NodeDef`, `instance:
   NodeInstance`, `position: Position`, `onClick?`.
3. **`SkillEdge`** (compoñente conexión): renderiza `<path>` SVG cun
   `d` derivado de `EdgePath.points` + `EdgePath.kind`. Props:
   `edgeId`, `edge: EdgeDef`, `path: EdgePath`, `onClick?`.

**Grupo B — Layout registry helper interno**:
4. **`createDefaultLayoutRegistry()`** función interna do paquete
   react (non exportada publicamente en 7.2; uso interno por
   SkillTree). Constrúe `LayoutEngineRegistry` con `IdentityLayout`,
   `RadialLayout`, `TreeLayout`.

**Grupo C — Dependencias e configuración**:
5. **`@yggdrasil-forge/core: workspace:*`** engadido como `dependencies`
   (require os tipos + 3 layout classes + computeLayout).
6. **`jsdom`** + **`@testing-library/react`** + **`@vitejs/plugin-react`**
   engadidos a devDependencies e ao catálogo pnpm.
7. **`vitest.config.ts`** do paquete: engadir `environment: 'jsdom'`
   + plugin React.

**Grupo D — Exports**:
8. **`packages/react/src/index.ts`** exporta `SkillTree`,
   `SkillNode`, `SkillEdge` + tipos de props
   (`SkillTreeProps`, `SkillNodeProps`, `SkillEdgeProps`).

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/` enteiros.
- Outros 14 paquetes scaffold (cero modificación).
- Entry points `/server` ou `/headless` (diferidos a 7.9, 7.4).
- `ThemeProvider` (diferido a 7.4).
- Hooks customizados como `useSkillTree`, `useNodeState` (diferidos a 7.5).
- `SkillTreeErrorBoundary` (diferido a 7.11).
- Animacións CSS (7.6).
- `prefers-reduced-motion` (7.8).
- Mobile/touch input (7.10).
- ARIA avanzada + keyboard navigation (7.7).

**CERO ErrorCodes novos.** Erros propágánse desde `computeLayout`
(que xa ten `LAYOUT_TYPE_UNKNOWN` desde Fase 4) ou desde o engine.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `02a9c52`, verificada empíricamente
en clone independente)**:

### APIs autoritativas do core (verificadas en T0 do director)

```ts
// TreeEngine (packages/core/src/engine/TreeEngine.ts)
class TreeEngine {
  getSnapshot(): TreeState                          // liña 407
  subscribe(listener: () => void): () => void       // liña 415
  getTreeDef(): Readonly<TreeDef>                   // liña 297
  // ... outros métodos non usados en 7.2 ...
}

// computeLayout (packages/core/src/engine/layouts/computeLayout.ts:26)
function computeLayout(
  treeDef: TreeDef,
  registry: LayoutEngineRegistry,
  locale?: Locale,
): Result<LayoutResult>

// LayoutResult
interface LayoutResult {
  readonly nodes: ReadonlyMap<string, Position>
  readonly edges: ReadonlyMap<string, EdgePath>
  readonly bounds: Bounds
  readonly layoutType: string
  readonly mesh?: readonly MeshElement[]
}

// EdgePath
interface EdgePath {
  readonly points: readonly Position[]
  readonly kind?: 'line' | 'cubic' | 'polyline'   // default 'line'
}

// Bounds
interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}
```

### Layouts disponibles (clases en core)

- `IdentityLayout` (Fase 4.0)
- `RadialLayout` (Fase 4.1)
- `TreeLayout` (Fase 4.3, Buchheim algorithm)

**Cero `HorizontalLayout`** existe (verificado empíricamente). Se
o usuario pasa `treeDef.layout.type === 'horizontal'`, `computeLayout`
emitirá `LAYOUT_TYPE_UNKNOWN`. **Documentar** como precondición. Os
3 layouts disponibles son suficientes para 7.2 (a roadmap §67 non
prescribe novos layouts en Fase 7; iso é fora do scope).

### useSyncExternalStore compatibility

`TreeEngine.subscribe(listener: () => void): () => void` ten
**exactamente** a sinatura que `useSyncExternalStore` esixe:
- `subscribe: (listener: () => void) => () => void` (devolve unsubscribe).
- `getSnapshot: () => Snapshot` (devolve estado actual).

Para SSR, usar `engine.getSnapshot` como `getServerSnapshot` (mesmo
método; o consumidor é responsable de pasar un engine con state
pre-cargado para SSR).

### Reactividade — útil para Fase 7 enteira

`useSyncExternalStore` é hook **NATIVO de React** (introducido en
React 18). **NON é un hook customizado do paquete**. Hooks customizados
(`useSkillTree`, `useNodeState`) son 7.5. **Cero scope creep** en 7.2.

### Estado scaffold post-7.1

```
packages/react/
├── __tests__/
│   └── smoke.test.tsx       (3 tests: VERSION + 2 renderToString)
├── src/
│   └── index.ts             (só export VERSION)
├── package.json             (React 19.2.7 peer + dev)
├── tsconfig.json            (jsx: "react-jsx")
├── tsup.config.ts           (esm+cjs+dts)
└── vitest.config.ts         (extende raíz; environment 'node')
```

### Caso de uso primario (verificado MASTER §52)

```tsx
import { TreeEngine, IndexedDBAdapter } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'

function MyTreeView({ studentId }: { studentId: string }) {
  const engine = useMemo(
    () => new TreeEngine(treeData, { storage: new IndexedDBAdapter(...) }),
    [studentId],
  )
  useEffect(() => () => engine.destroy(), [engine])

  return (
    <SkillTree
      engine={engine}
      onNodeClick={async (nodeId) => {
        const result = await engine.unlock(nodeId)
        if (!result.ok) toast(result.error.message)
      }}
    />
  )
}
```

**Nota**: o exemplo MASTER §2354 usa props `layout="radial"` e
`renderer="auto"` que **NON están en 7.2**. O director considera
esas props como sintaxe futura (capa de configuración por sub-fases
posteriores ou parte do ThemeProvider en 7.4). **En 7.2 o layout
detérminase via `treeDef.layout.type` no propio engine** (consistente
con MASTER §4 que sitúa o layout no TreeDef).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `02a9c52` (Setup React 7.1).
- 1523 core + 60 common + 193 storage + 3 react = **~1779 monorepo
  limpo** (+ varios paquetes scaffold con 1 smoke test cada un).
- Typecheck 21/21, lint 0/0, format 0/0.
- 57 ErrorCodes existentes (ata YGG_E036).
- DT abertas: 11.
- packages/react/ ten React 19.2.7 + JSX config + smoke test (3 tests).
- Cero compoñente React real aínda.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` 3 compoñentes públicos
(`SkillTree`, `SkillNode`, `SkillEdge`) que renderizan unha árbore
de habilidades como SVG headless: `SkillTree` toma un `TreeEngine`
como prop, subscríbese via `useSyncExternalStore` nativo de React,
computa layout internamente via `computeLayout` (con `LayoutEngineRegistry`
default que rexistra `IdentityLayout`, `RadialLayout` e `TreeLayout`),
e renderiza `<svg>` con `<g>` para `SkillEdge`s + `<g>` para
`SkillNode`s. Cero estilos hardcoded (só classes CSS + data-attributes).
SSR-safe (verificable con `renderToString`). **Cero hooks customizados,
cero ThemeProvider, cero ErrorBoundary, cero ARIA avanzada** (todos
diferidos a sub-fases posteriores). **Cero ErrorCodes novos.
Cero modificación de packages/core/, common/, storage/ ou outros 14
paquetes scaffold**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/SkillTree.tsx` (~110 liñas estimadas).
- `packages/react/src/SkillNode.tsx` (~65 liñas).
- `packages/react/src/SkillEdge.tsx` (~75 liñas).
- `packages/react/src/createDefaultLayoutRegistry.ts` (~25 liñas;
  helper interno).
- `packages/react/__tests__/SkillTree.test.tsx` (~200 liñas; ~10 tests).
- `.changeset/skilltree-components.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/index.ts` (engadir exports).
- `packages/react/package.json` (engadir `@yggdrasil-forge/core` como
  dep + jsdom + @testing-library/react + @vitejs/plugin-react como
  devDeps via catálogo).
- `packages/react/vitest.config.ts` (engadir `environment: 'jsdom'`
  + plugin React).
- `pnpm-workspace.yaml` (engadir 3 entradas ao catálogo: jsdom,
  @testing-library/react, @vitejs/plugin-react).
- `pnpm-lock.yaml` (regenerado polo install).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de packages/core/, common/, storage/, outros
paquetes scaffold**.

### 5.2 — `SkillTreeProps` (FIXADA, non negociable)

```ts
export interface SkillTreeProps {
  /** TreeEngine a renderizar. Subscríbese para re-render automático. */
  readonly engine: TreeEngine

  /**
   * Locale para mensaxes de erro de layout (propagadas desde
   * computeLayout). Default 'gl'.
   */
  readonly locale?: Locale

  /** Callback cando o usuario activa un nodo (clic ou Enter). */
  readonly onNodeClick?: (nodeId: string) => void

  /** Callback cando o usuario activa un edge (clic). */
  readonly onEdgeClick?: (edgeId: string) => void

  /**
   * Layout registry opcional. Se non se pasa, usa default interno
   * (Identity + Radial + Tree). Permite a consumidores avanzados
   * inxectar layouts customizados ou substituír os defaults.
   */
  readonly layoutRegistry?: LayoutEngineRegistry

  /**
   * Padding adicional ao redor do viewBox (en unidades do layout).
   * Default 16. Cero asume o bounds estricto.
   */
  readonly padding?: number
}
```

**Cero outras props en 7.2**. Específicamente:
- ❌ `theme` (ven via ThemeProvider en 7.4).
- ❌ `layout="radial"` runtime override (o layout vive en TreeDef).
- ❌ `renderer="auto"` (SVG é o único renderer en 7.2).
- ❌ `debug` (futuro).
- ❌ `style`, `className` (decisión consciente: o consumidor compón
  envolvendo en `<div className="...">` se require; manter API mínima).

### 5.3 — `SkillNodeProps`

```ts
export interface SkillNodeProps {
  /** Definición do nodo (do TreeDef). */
  readonly node: NodeDef

  /**
   * Instancia actual do nodo (do TreeState). Pode ser undefined se
   * o engine aínda non inicializou esta entrada (defensivo).
   */
  readonly instance: NodeInstance | undefined

  /** Posición no layout. */
  readonly position: Position

  /** Callback cando o usuario clica/activa este nodo. */
  readonly onClick?: (nodeId: string) => void
}
```

### 5.4 — `SkillEdgeProps`

```ts
export interface SkillEdgeProps {
  /** ID do edge (mesmo que NodeEdge.id). */
  readonly edgeId: string

  /** Definición do edge (do TreeDef). */
  readonly edge: EdgeDef

  /** Path computado polo layout. */
  readonly path: EdgePath

  /** Callback cando o usuario clica este edge. */
  readonly onClick?: (edgeId: string) => void
}
```

### 5.5 — Implementación de `SkillTree` (pseudo-código autoritativo)

```tsx
'use client'   // (anotación; cero efecto en bundlers actuais sen RSC; ver §5.13)

import { useMemo, useSyncExternalStore } from 'react'
import {
  type TreeEngine,
  type Locale,
  type LayoutEngineRegistry,
  computeLayout,
} from '@yggdrasil-forge/core'
import { SkillNode } from './SkillNode.js'
import { SkillEdge } from './SkillEdge.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'

export interface SkillTreeProps {
  readonly engine: TreeEngine
  readonly locale?: Locale
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
  // Subscrición ao engine (re-render automático).
  // useSyncExternalStore é hook NATIVO de React 18+; cero hook customizado.
  const state = useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getSnapshot.bind(engine),   // server snapshot = client snapshot
  )

  // Layout: computado por memo sobre treeDef (estable durante o ciclo
  // de vida do engine). Registry resólvese unha vez (memoizado).
  const treeDef = engine.getTreeDef()
  const registry = useMemo(
    () => layoutRegistry ?? createDefaultLayoutRegistry(),
    [layoutRegistry],
  )
  const layoutResult = useMemo(
    () => computeLayout(treeDef, registry, locale),
    [treeDef, registry, locale],
  )

  // Manexo de erro de layout: render placeholder semántico.
  // Cero throw (preserva error boundary explícito para 7.11).
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

  const { nodes: nodePositions, edges: edgePaths, bounds } = layoutResult.value

  // Constrúe un Map<edgeId, EdgeDef> para lookup rápido.
  const edgeMap = useMemo(() => {
    const m = new Map<string, typeof treeDef.edges[number]>()
    for (const e of treeDef.edges) m.set(e.id, e)
    return m
  }, [treeDef])

  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${
    bounds.maxX - bounds.minX + padding * 2
  } ${bounds.maxY - bounds.minY + padding * 2}`

  return (
    <svg
      className="yf-skill-tree"
      data-layout={layoutResult.value.layoutType}
      viewBox={viewBox}
      role="img"
      aria-label="Skill tree"
    >
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
    </svg>
  )
}
```

### 5.6 — Implementación de `SkillNode` (pseudo-código)

```tsx
import type { NodeDef, NodeInstance, Position } from '@yggdrasil-forge/core'
import type { KeyboardEvent, MouseEvent } from 'react'

export interface SkillNodeProps {
  readonly node: NodeDef
  readonly instance: NodeInstance | undefined
  readonly position: Position
  readonly onClick?: (nodeId: string) => void
}

const NODE_RADIUS = 24

export function SkillNode({
  node,
  instance,
  position,
  onClick,
}: SkillNodeProps): JSX.Element {
  const state = instance?.state ?? 'locked'
  const tier = instance?.currentTier ?? 0
  const progress = instance?.progress

  const handleClick = onClick !== undefined
    ? (_e: MouseEvent<SVGGElement>) => onClick(node.id)
    : undefined

  const handleKeyDown = onClick !== undefined
    ? (e: KeyboardEvent<SVGGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(node.id)
        }
      }
    : undefined

  return (
    <g
      className="yf-skill-node"
      data-node-id={node.id}
      data-state={state}
      data-tier={tier}
      transform={`translate(${position.x},${position.y})`}
      {...(handleClick !== undefined && {
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        tabIndex: 0,
        role: 'button',
        'aria-label': resolveLabel(node),
      })}
    >
      <circle r={NODE_RADIUS} className="yf-skill-node__circle" />
      <text
        className="yf-skill-node__label"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {resolveLabel(node)}
      </text>
      {progress !== undefined && (
        <text
          className="yf-skill-node__progress"
          textAnchor="middle"
          dominantBaseline="middle"
          y={NODE_RADIUS + 12}
        >
          {progress}%
        </text>
      )}
    </g>
  )
}

/**
 * Resolve o label do nodo. Se é LocalizedString, devolve un fallback
 * razoable (en 7.4 ThemeProvider proverá locale; en 7.2 cero contexto).
 */
function resolveLabel(node: NodeDef): string {
  const lbl = node.label
  if (typeof lbl === 'string') return lbl
  if (lbl === undefined) return node.id
  // LocalizedString: pick gl > es > en > id como fallback básico (7.2).
  return lbl.gl ?? lbl.es ?? lbl.en ?? Object.values(lbl)[0] ?? node.id
}
```

**Decisión de tier display**: 7.2 só mostra `data-tier={tier}` no
`<g>` (CSS pode usalo para colorear). **Cero rendering de tier
markers** (anel exterior, badges, etc.) en 7.2 — esa é decisión de
7.4 ThemeProvider/temas.

### 5.7 — Implementación de `SkillEdge` (pseudo-código)

```tsx
import type { EdgeDef } from '@yggdrasil-forge/core'
import type { EdgePath } from '@yggdrasil-forge/core'
import type { MouseEvent } from 'react'

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

/**
 * Constrúe o atributo `d` SVG a partir dun EdgePath.
 *
 * - `'line'` (default): M x0 y0 L x1 y1
 * - `'cubic'`: M x0 y0 C x1 y1, x2 y2, x3 y3
 * - `'polyline'`: M x0 y0 L x1 y1 L x2 y2 ... (3+ puntos)
 */
function buildPathD(path: EdgePath): string {
  const pts = path.points
  /* v8 ignore next 1 -- defensivo: layouts producen polo menos 2 puntos por edge */
  if (pts.length === 0) return ''

  const kind = path.kind ?? 'line'
  const first = pts[0]!

  if (kind === 'cubic' && pts.length >= 4) {
    const [p0, p1, p2, p3] = pts
    return `M ${p0!.x} ${p0!.y} C ${p1!.x} ${p1!.y}, ${p2!.x} ${p2!.y}, ${p3!.x} ${p3!.y}`
  }

  // 'line' (2 puntos) ou 'polyline' (3+ puntos): tratamento uniforme con M + L*
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!
    d += ` L ${p.x} ${p.y}`
  }
  return d
}
```

### 5.8 — `createDefaultLayoutRegistry` (helper interno)

```ts
// packages/react/src/createDefaultLayoutRegistry.ts
// ── INICIO: createDefaultLayoutRegistry ──
// Helper interno para construír un LayoutEngineRegistry default cos
// 3 layouts dispoñibles en core (Identity, Radial, Tree).
//
// NON exportado publicamente en 7.2. Pode promocionarse a export
// público en sub-fases futuras se require.

import {
  LayoutEngineRegistry,
  IdentityLayout,
  RadialLayout,
  TreeLayout,
} from '@yggdrasil-forge/core'

/**
 * Constrúe un LayoutEngineRegistry rexistrando os 3 layouts default
 * disponibles en `@yggdrasil-forge/core`.
 */
export function createDefaultLayoutRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry()
    .register(new IdentityLayout())
    .register(new RadialLayout())
    .register(new TreeLayout())
}
// ── FIN: createDefaultLayoutRegistry ──
```

### 5.9 — `packages/react/src/index.ts` actualizado

```ts
// ── INICIO: @yggdrasil-forge/react ──
// React renderer for Yggdrasil Forge

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'

export { SkillTree } from './SkillTree.js'
export type { SkillTreeProps } from './SkillTree.js'

export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'
// ── FIN: @yggdrasil-forge/react ──
```

**`createDefaultLayoutRegistry` NON se exporta publicamente en 7.2**
(uso interno só por SkillTree).

### 5.10 — Dependencias e catálogo

**`pnpm-workspace.yaml`** — engadir 3 entradas ao catálogo:

```yaml
catalog:
  # ... entradas existentes intactas ...
  jsdom: ^25.0.0
  '@testing-library/react': ^16.0.0
  '@vitejs/plugin-react': ^4.3.0
```

**`packages/react/package.json`** — engadir:

```json
{
  ...intacto...
  "dependencies": {
    "@yggdrasil-forge/core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "vitest": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "typescript": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "jsdom": "catalog:",
    "@testing-library/react": "catalog:",
    "@vitejs/plugin-react": "catalog:"
  }
}
```

**Importante**: `@yggdrasil-forge/core` vai en **`dependencies`**, NON
en `peerDependencies`. É un paquete workspace interno; o consumidor
do paquete `@yggdrasil-forge/react` recibe core como dep transitiva
automáticamente.

### 5.11 — `vitest.config.ts` do paquete actualizado

```ts
// ── INICIO: vitest config para @yggdrasil-forge/react ──
import { defineConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import rootConfig from '../../vitest.config'

export default mergeConfig(
  rootConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      include: [
        '__tests__/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
    },
  }),
)
// ── FIN: vitest config ──
```

**Cambios respecto a 7.1**:
- Engadir `plugins: [react()]` (para procesar JSX en tests).
- Cambiar `environment` a `'jsdom'`.
- Cero outras modificacións.

### 5.12 — Reactividade vía `useSyncExternalStore`

**Decisión clave**: SkillTree usa `useSyncExternalStore` NATIVO de
React 18+ para subscribirse ao engine. Iso garante:
- Re-render automático cando engine.subscribe dispara o callback.
- SSR-safe (server snapshot pasa como 3º argumento).
- Cero hook customizado (esos son 7.5).
- Tearing prevention en concurrent mode.

**Cero `useState` + `useEffect` patrón manual**. Iso sería retrocompatible
con React <18 pero o proxecto require React ^19.2.7 (engadido en
7.1).

### 5.13 — `'use client'` directive

**Decisión**: engadir `'use client'` na primeira liña de
**`SkillTree.tsx`** únicamente. Razóns:
- SkillTree usa hooks (`useSyncExternalStore`, `useMemo`) → require ser
  client component en RSC.
- `SkillNode` e `SkillEdge` son **pure functional components sen hooks**;
  poden ser usados tanto en server como en client → **cero `'use client'`**
  neles.
- En entornos sen RSC (e.g. vitest, build estándar), a directiva é un
  no-op (cero efecto sobre o bundler).

### 5.14 — Cero efectos secundarios (SSR-safe)

Tódolos 3 compoñentes son **puros**:
- Cero `window.X` access.
- Cero `document.X` access.
- Cero `useEffect`.
- Cero estado interno con useState.
- Renderizado completamente derivable de props + engine.getSnapshot.

**Tests SSR**: incluír un test que renderiza SkillTree con
`renderToString` (cero DOM) e verifica que produce SVG válido.

### 5.15 — Headless por defecto

**Cero estilos hardcoded** alén de:
- `fill="none"` en `<path>` (require para non encher pathos).
- `stroke="currentColor"` en `<path>` (require para que CSS pode
  cambiar a cor via `color:` na clase pai).
- `textAnchor="middle"` + `dominantBaseline="middle"` en `<text>` (xeometría, non estilo).

**Cero `width`/`height` hardcoded** no `<svg>` (consumidor controla
via CSS).

**Classes CSS documentadas** (estables, parte do contrato público):
- `yf-skill-tree` (raíz svg).
- `yf-skill-tree--error` (modificador cando layout error).
- `yf-skill-edges` (grupo de edges).
- `yf-skill-nodes` (grupo de nodes).
- `yf-skill-node` (átomo nodo).
- `yf-skill-node__circle` (círculo do nodo).
- `yf-skill-node__label` (texto do nodo).
- `yf-skill-node__progress` (texto de progress).
- `yf-skill-edge` (átomo edge).

**Data attributes documentados**:
- En `yf-skill-tree`: `data-layout` (tipo do layout: 'identity' | 'radial' | 'tree').
- En `yf-skill-tree--error`: `data-error` (código do ErrorCode).
- En `yf-skill-node`: `data-node-id`, `data-state`, `data-tier`.
- En `yf-skill-edge`: `data-edge-id`, `data-source`, `data-target`.

Estas classes + data-attributes son **contrato público estable** (7.4
ThemeProvider e temas usaranse).

### 5.16 — `padding` viewBox (default 16)

**Decisión**: o `padding` añade un margin around `bounds` para evitar
que nodos no borde se corten visualmente. Default `16` (unidades do
layout). Documentar.

### 5.17 — Cero ErrorCodes novos

Cero modificación de `packages/common/`. Erros propágánse desde
`computeLayout` (LAYOUT_TYPE_UNKNOWN xa existe desde Fase 4) ou
desde callbacks do consumidor (que decide o seu propio manexo).

### 5.18 — Tests prescritos (~10 totais)

`packages/react/__tests__/SkillTree.test.tsx` (todos os tests
consolidados nun ficheiro para evitar fragmentación; 7.2 ten só 3
compoñentes pequenos):

**Bloque 1 — Renderizado SVG básico (~3 tests)**:
1. Renderiza `<svg>` cunha class `yf-skill-tree` e viewBox correcto.
2. Renderiza N nodos correspondentes ás entradas de `treeDef.nodes`.
3. Renderiza N edges correspondentes ás entradas de `treeDef.edges`.

**Bloque 2 — SkillNode atributos (~2 tests)**:
4. SkillNode ten `data-state` correcto baseado en `instance.state`.
5. SkillNode con `instance.progress` mostra texto de progress.

**Bloque 3 — SkillEdge paths (~2 tests)**:
6. SkillEdge con kind `'line'` produce `d="M ... L ..."`.
7. SkillEdge con kind `'cubic'` produce `d="M ... C ..."`.

**Bloque 4 — Interacción (~2 tests, require jsdom)**:
8. onNodeClick chámase ao clicar un nodo (vía
   `@testing-library/react`).
9. onEdgeClick chámase ao clicar un edge.

**Bloque 5 — SSR + Reactividade + Erro (~3 tests)**:
10. `renderToString(<SkillTree engine={...} />)` produce HTML válido
    sen lanzar (cero DOM access).
11. `engine.unlock(nodeId)` dispara re-render de SkillTree (verificar
    que data-state cambia tras o cambio do engine).
12. Layout `type: 'unknown'` produce SVG cun
    `class="yf-skill-tree--error"` + `data-error="YGG_E???"`
    (manexo gracioso, cero throw).

**Total: ~12 tests** (consolidados nun describe block grande).
Post-7.2 esperado: 3 → **~15 tests** en packages/react/.

### 5.19 — Cobertura

- **SkillTree.tsx**: ≥95% Stmts / ≥85% Branch. 2 ramas defensivas con
  `/* v8 ignore */` (edge sen edgeMap entry, position sen layout entry).
- **SkillNode.tsx**: ≥95% Stmts / ≥85% Branch.
- **SkillEdge.tsx**: ≥95% Stmts / ≥85% Branch.
- **createDefaultLayoutRegistry.ts**: 100% (peza trivial).
- **Global packages/react**: cero baseline previa (era 3 tests
  triviais). Novo baseline tras 7.2 escollerase a discreción do
  executor pero **≥90% Stmts / ≥80% Branch** é prescritivo.

### 5.20 — Test counts post-7.2 esperados

- **react**: 3 (smoke previo) + 12 (novos) = **~15 tests**.
- **core, common, storage**: intactos.
- Outros paquetes scaffold: intactos.

### 5.21 — Helper de tests recomendado

```tsx
import { TreeEngine, IdentityLayout, LayoutEngineRegistry } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'

function makeTreeEngine(treeDef = makeMinimalTreeDef()): TreeEngine {
  return new TreeEngine(treeDef, {
    storage: new MemoryStorage(),
  })
}

function makeMinimalTreeDef(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'skill', label: 'A' },
      { id: 'b', type: 'skill', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b' }],
    layout: { type: 'identity' },
  }
}
```

**Verificación empírica T0**: o test pattern de TreeRegistry.test.ts
(`type: 'skill'`) está pasando typecheck no proxecto (verificado).
Reutilizar.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `SkillTree` componente | React FC | SkillTree.tsx | ~110 |
| `SkillNode` componente | React FC | SkillNode.tsx | ~65 |
| `SkillEdge` componente | React FC | SkillEdge.tsx | ~75 |
| `createDefaultLayoutRegistry` | Helper interno | createDefaultLayoutRegistry.ts | ~25 |
| Exports públicos | export { ... } | src/index.ts | +6 |
| Deps + devDeps | JSON edits | packages/react/package.json | +14 |
| Catálogo 3 entradas | YAML edits | pnpm-workspace.yaml | +3 |
| Vitest jsdom + plugin React | TS edits | vitest.config.ts | +5 |
| Tests SkillTree | describe block | SkillTree.test.tsx | ~250 |

**Total estimado**: ~275 liñas de código + ~250 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/SkillTree.tsx` (NOVO)
- `packages/react/src/SkillNode.tsx` (NOVO)
- `packages/react/src/SkillEdge.tsx` (NOVO)
- `packages/react/src/createDefaultLayoutRegistry.ts` (NOVO)
- `packages/react/src/index.ts` (MODIFICADO)
- `packages/react/__tests__/SkillTree.test.tsx` (NOVO)
- `packages/react/package.json` (MODIFICADO)
- `packages/react/vitest.config.ts` (MODIFICADO)
- `pnpm-workspace.yaml` (MODIFICADO: +3 entradas catálogo)
- `pnpm-lock.yaml` (MODIFICADO: regenerado polo install)
- `.changeset/skilltree-components.md` (NOVO: minor para react)
- `CHANGELOG.md` (MODIFICADO)

**NON deben aparecer cambios en**:
- `packages/core/`, `packages/common/`, `packages/storage/` enteiros.
- `packages/react/__tests__/smoke.test.tsx` (intacto desde 7.1).
- Outros 14 paquetes scaffold.
- `packages/react/tsconfig.json` (xa configurado para JSX en 7.1).
- `packages/react/tsup.config.ts`.
- `tsconfig.base.json`, `vitest.config.ts` raíz.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx` files. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, cero `any`. NON desactives
Biome.

**JSX automatic runtime**: cero `import React from 'react'`. Importar
hooks específicos: `import { useMemo, useSyncExternalStore } from 'react'`.

**Tipos JSX**: usar `JSX.Element` como return type. Cero `React.FC`
(anti-pattern moderno).

**Estilo de hooks**: `engine.subscribe.bind(engine)` (necesario para
preservar `this` no contexto do subscribe). useSyncExternalStore esixe
referencias estables; bind nun render é aceptable porque o callback
de subscribe é estable.

**Estilo de classes CSS**: BEM modificado con prefixo `yf-`. Cero
camelCase nas classes.

**Marcadores**: `// ── INICIO: <peza> ──` / `// ── FIN: <peza> ──`
en cada ficheiro novo.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Engadir `ThemeProvider` (DIFERIDO a 7.4).
- ❌ Engadir hooks customizados (`useSkillTree`, `useNodeState`) — 7.5.
- ❌ Engadir `SkillTreeErrorBoundary` — 7.11.
- ❌ Engadir entry points `/server` ou `/headless` — 7.9, 7.4.
- ❌ Engadir CSS hardcoded ou inline styles (alén de fill="none" e
  stroke="currentColor" en SVG).
- ❌ Engadir prefers-reduced-motion — 7.8.
- ❌ Engadir ARIA avanzada (live regions, descripcións detalladas) — 7.7.
- ❌ Engadir keyboard navigation entre nodos (Tab+Arrow) — 7.7.
  En 7.2 só engadese `tabIndex=0` + Enter/Space activan o `onClick`
  individual.
- ❌ Engadir mobile/touch input — 7.10.
- ❌ Animacións CSS — 7.6.
- ❌ Layout runtime override (prop `layout="radial"`); o layout vive
  no TreeDef.
- ❌ Implementar `MeshOverlay` ou renderizar `layoutResult.mesh` — 7.3.
- ❌ Engadir `width`/`height` ao `<svg>` (consumidor controla via CSS).
- ❌ Engadir `style` ou `className` props a SkillTree (manter API
  mínima; consumidor pode envolver).
- ❌ Engadir `'use client'` directive a SkillNode ou SkillEdge (son
  puros, sen hooks).
- ❌ Crear hooks customizados nin sequera internos (alén de useMemo +
  useSyncExternalStore nativos).
- ❌ Engadir `@testing-library/jest-dom` (cero matchers extra; usar
  Vitest matchers nativos).
- ❌ Engadir Date.now() / Math.random() nos compoñentes.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T14)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `02a9c52` como HEAD.

**T0.2** — Verificar APIs do core necesarias:
```bash
# TreeEngine.getSnapshot, subscribe, getTreeDef:
grep -nE "^  (getSnapshot|subscribe|getTreeDef)" packages/core/src/engine/TreeEngine.ts
# esperado: 3 matches (liñas 407, 415, 297)

# computeLayout + IdentityLayout + RadialLayout + TreeLayout exportados:
grep -E "^export.*Layout|export \{ (computeLayout|IdentityLayout|RadialLayout|TreeLayout)" packages/core/src/engine/index.ts
# esperado: 4+ matches
```

**T0.3** — Verificar que `LayoutResult.edges` é `ReadonlyMap`:
```bash
grep "readonly edges:" packages/core/src/engine/layouts/LayoutResult.ts
```

**T0.4** — Verificar versión React 19.2.7 instalada:
```bash
grep "\"react\":" packages/react/package.json | head -2
```

**T0.5** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --force                 # baseline actual
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 3 entradas ao catálogo pnpm-workspace.yaml

Engadir segundo §5.10 literal (jsdom ^25.0.0, @testing-library/react
^16.0.0, @vitejs/plugin-react ^4.3.0).

### T2 — Actualizar `packages/react/package.json`

Engadir bloques `dependencies` + as 3 novas devDependencies via
catálogo segundo §5.10.

### T3 — Engadir entradas a `allowBuilds` de pnpm-workspace.yaml se require

Algunhas deps poden requirir build scripts (`@vitejs/plugin-react`
require esbuild que xa está). Verificar empíricamente tras `pnpm
install`. Se aparecen warnings de build scripts non aprobados,
escalar.

### T4 — Actualizar `packages/react/vitest.config.ts`

Substituír segundo §5.11 literal.

### T5 — Crear `packages/react/src/createDefaultLayoutRegistry.ts`

Segundo §5.8 literal.

### T6 — Crear `packages/react/src/SkillEdge.tsx`

Segundo §5.7 literal.

### T7 — Crear `packages/react/src/SkillNode.tsx`

Segundo §5.6 literal.

### T8 — Crear `packages/react/src/SkillTree.tsx`

Segundo §5.5 literal.

### T9 — Actualizar `packages/react/src/index.ts`

Engadir exports segundo §5.9 literal.

### T10 — Instalar deps novas

```bash
pnpm install                          # SEN --frozen-lockfile (regenera lock)
```

Verificar que jsdom, @testing-library/react, @vitejs/plugin-react,
@yggdrasil-forge/core están en `packages/react/node_modules/`.

### T11 — Crear `packages/react/__tests__/SkillTree.test.tsx`

Implementar os ~12 tests segundo §5.18 literal. Reutilizar helpers de
§5.21.

### T12 — Verificación

```bash
pnpm install --frozen-lockfile         # debe pasar
pnpm turbo run typecheck --force       # 21/21
pnpm --filter @yggdrasil-forge/react test --force   # ~15 tests pasando
pnpm --filter @yggdrasil-forge/react run test:coverage
```

Cobertura targets segundo §5.19.

### T13 — Build do paquete

```bash
pnpm --filter @yggdrasil-forge/react build
```

Verificar:
- `dist/index.js` (ESM), `dist/index.cjs` (CJS), `dist/index.d.ts`
  producidos.
- **`@yggdrasil-forge/core` non bundleado** (workspace dep
  externalizada por tsup):
  ```bash
  grep -c "from '@yggdrasil-forge/core'" packages/react/dist/index.js
  # esperado: 0 (cero matches; tsup re-escribe imports a paths
  # relativos resolúbeis polo consumer)
  ```

### T14 — Lint + format + grep + changeset + CHANGELOG + commit + push

```bash
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/ packages/react/__tests__/SkillTree.test.tsx
# esperado: cero matches reais
```

`.changeset/skilltree-components.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add SkillTree + SkillNode + SkillEdge components (sub-phase 7.2)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: tres compoñentes públicos novos:
  - `SkillTree`: compoñente raíz SVG que toma un `TreeEngine` como
    prop e renderiza a árbore enteira. Subscríbese ao engine via
    `useSyncExternalStore` nativo de React 18+ (re-render automático).
    Computa layout internamente via `computeLayout` cun
    `LayoutEngineRegistry` default (Identity + Radial + Tree). Acepta
    props opcionais: `locale`, `onNodeClick`, `onEdgeClick`,
    `layoutRegistry` (override), `padding`. Marcado `'use client'`.
  - `SkillNode`: átomo de nodo. Renderiza `<g>` con `<circle>` +
    `<text>`. Props: `node`, `instance`, `position`, `onClick`. Compoñente
    puro (sen hooks; usable tanto en server como en client).
  - `SkillEdge`: átomo de edge. Renderiza `<path>` SVG cun `d`
    derivado de `EdgePath.points` + `EdgePath.kind` (`'line'`,
    `'cubic'`, `'polyline'`). Props: `edgeId`, `edge`, `path`,
    `onClick`. Compoñente puro.
- **Headless por defecto**: cero estilos hardcoded. Classes CSS
  documentadas (yf-skill-tree, yf-skill-tree--error, yf-skill-edges,
  yf-skill-nodes, yf-skill-node, yf-skill-node__circle, yf-skill-node__label,
  yf-skill-node__progress, yf-skill-edge) + data-attributes (data-layout,
  data-error, data-node-id, data-state, data-tier, data-edge-id,
  data-source, data-target) como contrato público estable para
  ThemeProvider (7.4) e temas.
- **SSR-safe**: verificable con `renderToString` (cero DOM access).
- `@yggdrasil-forge/core` engadido como dependency (require os tipos
  + 3 layout classes + computeLayout).
- Catálogo pnpm-workspace.yaml ampliado con 3 entradas: jsdom ^25.0.0,
  @testing-library/react ^16.0.0, @vitejs/plugin-react ^4.3.0
  (reutilizables en sub-fases 7.3-7.12).

### Note
- Sub-fase 7.2 SEGUNDA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS**: MeshOverlay/SVGRenderer dedicados (7.3), ThemeProvider +
  temas Oberón/minimal (7.4), hooks customizados (7.5), animacións
  CSS (7.6), keyboard navigation + ARIA (7.7), prefers-reduced-motion
  (7.8), SSR + RSC entry points (7.9), mobile/touch (7.10), error
  boundaries (7.11), tests visuais (7.12).
- **Reactividade**: SkillTree usa `useSyncExternalStore` (hook NATIVO
  de React; cero hook customizado do paquete). Hooks customizados
  (`useSkillTree`, `useNodeState`) son 7.5.
- **Cero `'use client'` en SkillNode e SkillEdge** (puros sen hooks).
- **Layout via TreeDef.layout.type**: o layout escóllese desde o
  TreeDef pasado ao engine, non vía prop runtime. Os 3 layouts
  dispoñibles son 'identity', 'radial' e 'tree' (Buchheim). Se o
  TreeDef pasa un layout.type non rexistrado, SkillTree renderiza
  un SVG con clase `yf-skill-tree--error` + `data-error="YGG_E???"`
  (cero throw; preserva ErrorBoundary explícito para 7.11).
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
```

Commit Conventional:
`feat(react): add SkillTree + SkillNode + SkillEdge components (sub-phase 7.2)`

Push directo a `origin/main` (base `02a9c52`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 02a9c52)
✅ 3 compoñentes públicos: SkillTree, SkillNode, SkillEdge
✅ createDefaultLayoutRegistry helper interno (Identity + Radial + Tree)
✅ useSyncExternalStore nativo (cero hook customizado)
✅ 'use client' directive en SkillTree únicamente
✅ Headless por defecto (cero estilos hardcoded)
✅ Classes CSS + data-attributes documentados como contrato público
✅ SSR-safe verificable con renderToString
✅ @yggdrasil-forge/core engadido como dependency
✅ Catálogo pnpm ampliado: jsdom, @testing-library/react, @vitejs/plugin-react
✅ vitest.config.ts: environment 'jsdom' + plugin React
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO modificación de outros paquetes scaffold
✅ CERO modificación de smoke.test.tsx (3 tests previos intactos)
✅ CERO ErrorCodes novos
✅ T0.2 APIs core verificadas: TreeEngine.subscribe/getSnapshot/getTreeDef
✅ T0.3 LayoutResult.edges ReadonlyMap confirmado
✅ T0.4 React 19.2.7 confirmado
✅ Tests: <N> pasan en react (<delta> novos, 3 previos intactos)
   - 3 Renderizado SVG básico
   - 2 SkillNode atributos
   - 2 SkillEdge paths (line + cubic)
   - 2 Interacción (onNodeClick, onEdgeClick)
   - 3 SSR + Reactividade + Erro layout
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - SkillTree.tsx: <X%> / <Y%> / <Z%> / <W%>
   - SkillNode.tsx: <X%> / <Y%> / <Z%> / <W%>
   - SkillEdge.tsx: <X%> / <Y%> / <Z%> / <W%>
   - createDefaultLayoutRegistry.ts: 100% / 100% / 100% / 100%
   - v8 ignore engadidos: <listado>
✅ Typecheck: 21/21 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok
   - dist/index.js, dist/index.cjs, dist/index.d.ts producidos
   - @yggdrasil-forge/core externalizado (cero bundleo)
✅ GREP ANTI-PLACEHOLDER: <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.2 SEGUNDA da Fase 7.
   - 10 sub-fases pendentes en Fase 7 (7.3 a 7.12).
   - Reactividade via useSyncExternalStore nativo.
   - Layout via TreeDef.layout.type (cero prop runtime override).
   - Classes CSS + data-attributes contrato público estable.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: <N> ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.3 (MeshOverlay + SVGRenderer).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.2. Segunda sub-fase da Fase 7. Primeira con
compoñentes React reais. Risco arquitectónico MEDIO (3 compoñentes
novos + DOM environment en tests + reactividade via useSyncExternalStore).
Decisións ben acoutadas: headless, SSR-safe, cero hooks customizados,
cero estilos, classes CSS + data-attributes como contrato público
estable para temas futuros. Cero modificación de packages/core/,
common/, storage/. Calquera dúbida → ESCALAR.*
