# BRIEFING — SUB-FASE 4.5 de Yggdrasil Forge

> Pega este documento no chat executor.
> **A sub-fase máis grande da Fase 4.** Tres pezas heteroxéneas pero
> conceptualmente independentes nun só sprint (decisión do autor
> sobre partición). Esperar ~470 liñas + ~70 tests. **Risco
> consciente** de complexity blooming en QuadTree (lección 4.3 L1
> aplicable); mitigación: pseudo-código exhaustivo + cobertura branch
> relaxada desde o principio.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5
L2, 3.6.a L1, 4.3 L1**: calquera modificación fóra de §6 require
**ESCALAR ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 4.5 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 4.5 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **4.5** de Yggdrasil Forge. **Quinta da Fase 4** (Layout
Engine). **Sub-fase con 3 pezas heteroxéneas** (decisión do autor:
non partir):

1. **PathBuilder**: enriquece `LayoutResult.edges` con curvas (Bézier
   cubic, polyline orthogonal). 5 estilos.
2. **BoundsCalculator**: cálculo de Bounds máis sofisticado que o
   trivial actual; padding configurable, inclusión opcional de mesh
   e edges curvos.
3. **QuadTree**: spatial index para range queries e nearest neighbor.
   Para uso futuro en `useVisibleNodes(engine, viewport)` (React).

**Decisión arquitectónica clave do director**: as 3 pezas viven en **3
ficheiros separados** dentro de `engine/layouts/`, **non se mestura
fisicamente**. Cero acoplamento horizontal.

---

## 2. CONTEXTO MÍNIMO

§20 MASTER cero spec adicional sobre estas 3 pezas. **Toda decisión
arquitectónica é do director** (pre-resolvida en §5).

**Pista do MASTER §9**: `useVisibleNodes(engine: TreeEngine, viewport:
Viewport)` está prometida para Fase 7 (React renderer). **QuadTree
preparase para esto**.

**Estilo de curvas D3**: a 4.5 implementa o equivalente a `d3-shape`
`linkVertical` / `linkHorizontal` / `linkRadial` + Manhattan
(orthogonal). **Cero dependencia de d3**; implementación propia.

**Risco coñecido**: QuadTree é algoritmo non trivial (subdivisión
recursiva, range queries, nearest neighbor). **Lección 4.3 L1
aplicable**: pseudo-código exhaustivo en §5.10 para evitar ambigüidade.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `f055555` (parseCustomConfig 4.4).
- 1140 tests core + 60 common + 171 storage = ~1371 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **Pezas Fase 4 dispoñibles**: LayoutEngine, LayoutEngineRegistry,
  IdentityLayout (4.1), RadialLayout, MeshGenerator,
  RadialLayoutConfig (4.2), TreeLayout, TreeLayoutConfig (4.3),
  CustomLayoutConfig (4.4).
- **Tipos dispoñibles**: LayoutResult, EdgePath, Bounds, MeshElement,
  Position.
- **`EdgePath.points: readonly Position[]`** será **ampliado
  con campo opcional `kind?`** (5.3.b; cero ruptura).
- **`Bounds`** segue sendo simple AABB.
- **Cero NodeDef.size/radius** existe; **5.4.c require pasar
  padding global ou por nodo via callback**.
- **`ErrorCode.LAYOUT_COMPUTE_FAILED`** dispoñible. **Cero novos**.
- DT-9, DT-11, DT-12, DT-14, DT-15, DT-16, DT-17 abertas.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir 3 pezas a `packages/core/src/engine/layouts/`: (1)
`PathBuilder.ts` cunha función `buildPaths(layoutResult, style,
options?)` que transforma os edges en curvas (5 estilos), (2)
`BoundsCalculator.ts` cunha función `computeBounds(layoutResult,
options?)` máis sofisticada que o min/max actual, (3) `QuadTree.ts`
cunha clase para spatial indexing; ampliar `EdgePath` con campo
opcional `kind?: PathKind` para distinguir curvas/liñas/polilíneas;
exportar publicamente desde core; e cubrir con tests funcionais
completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estructura de ficheiros

Engadir 3 ficheiros baixo `packages/core/src/engine/layouts/`:

```
PathBuilder.ts        ← NOVO: funcións buildPaths + helpers
BoundsCalculator.ts   ← NOVO: función computeBounds + options
QuadTree.ts           ← NOVO: clase QuadTree + algoritmo
```

**Cero subdirectorios** dentro de layouts/. **Cero mestura
fisicamente**: cada peza vive no seu propio ficheiro. **Cero
acoplamento horizontal entre as 3 pezas**.

### 5.2 — Ampliación de EdgePath con `kind?`

**Modificar** `LayoutResult.ts` para engadir `PathKind` type + campo
`kind?` opcional a EdgePath:

```ts
/**
 * Tipo de path para un edge. Determina como se interpreta o array
 * `points` de EdgePath:
 *
 * - `'line'` (default): 2 puntos (start, end). Liña recta.
 * - `'cubic'`: 4 puntos (P0, P1=control1, P2=control2, P3=end).
 *   Cubic Bézier curve.
 * - `'polyline'`: 3+ puntos. Polyline (segmentos rectos
 *   consecutivos). Usado para 'orthogonal' L-shape ou S-shape.
 *
 * Engadido en 4.5 (cero ruptura: campo opcional con default 'line'
 * para EdgePaths producidos por sub-fases 4.1-4.4).
 */
export type PathKind = 'line' | 'cubic' | 'polyline'

export interface EdgePath {
  /**
   * Lista de puntos. Interpretación segundo `kind`:
   * - `'line'` (default): 2 puntos (start, end).
   * - `'cubic'`: 4 puntos (P0, P1=control1, P2=control2, P3).
   * - `'polyline'`: 3+ puntos.
   */
  readonly points: readonly Position[]

  /**
   * Tipo de path. Default `'line'` se non se especifica.
   * Engadido en 4.5 para soportar curvas e orthogonal.
   */
  readonly kind?: PathKind
}
```

**Cero ruptura**: campo opcional. **IdentityLayout/RadialLayout/
TreeLayout (4.1-4.4) seguen producindo 2 puntos** sen kind (default
'line'). **Cero modificación destas pezas** prescrita.

**Reexportar `PathKind`** desde core/engine/index.ts.

### 5.3 — PathBuilder

`PathBuilder.ts`:

```ts
import type { Position } from '../../types/node.js'
import type { EdgePath, LayoutResult, PathKind } from './LayoutResult.js'

/**
 * Estilo de curva para edges.
 *
 * - `'straight'`: liña recta (2 puntos). Compatible cos edges
 *   producidos por IdentityLayout/RadialLayout/TreeLayout (4.1-4.4).
 * - `'diagonal-vertical'`: cubic Bézier con tangentes verticais.
 *   Ideal para TreeLayout top-down/bottom-up. Estilo "linkVertical"
 *   de D3.
 * - `'diagonal-horizontal'`: cubic Bézier con tangentes horizontais.
 *   Ideal para TreeLayout left-right/right-left. Estilo
 *   "linkHorizontal" de D3.
 * - `'radial'`: cubic Bézier en coordenadas polares (control points
 *   no medio do segmento, en arco). Ideal para RadialLayout. Estilo
 *   "linkRadial" de D3.
 * - `'orthogonal'`: polyline (L-shape ou S-shape). Patrón "Manhattan",
 *   común en organigramas.
 */
export type CurveStyle =
  | 'straight'
  | 'diagonal-vertical'
  | 'diagonal-horizontal'
  | 'radial'
  | 'orthogonal'

/**
 * Opcións para PathBuilder.
 *
 * - `tension`: para curvas cubic Bézier, controla "intensidade" das
 *   tangentes (0..1). Default 0.5. Cero efecto en 'straight' ou
 *   'orthogonal'.
 * - `centerX/centerY`: centro do layout (necesario para 'radial').
 *   Default 0, 0.
 * - `cornerRatio`: para 'orthogonal', posición do "corner" como
 *   fracción do segmento (0..1). Default 0.5 (midpoint). Cero efecto
 *   nos outros estilos.
 */
export interface PathBuilderOptions {
  readonly tension?: number
  readonly centerX?: number
  readonly centerY?: number
  readonly cornerRatio?: number
}

/**
 * Función pura que transforma os edges dun LayoutResult aplicando un
 * estilo de curva. Devolve un novo LayoutResult con `edges`
 * actualizado; o resto dos campos (nodes, bounds, layoutType, mesh)
 * non se modifican.
 *
 * Cero asincronía. Cero efectos secundarios.
 */
export function buildPaths(
  layoutResult: LayoutResult,
  style: CurveStyle,
  options: PathBuilderOptions = {},
): LayoutResult {
  const tension = options.tension ?? 0.5
  const centerX = options.centerX ?? 0
  const centerY = options.centerY ?? 0
  const cornerRatio = options.cornerRatio ?? 0.5

  const newEdges = new Map<string, EdgePath>()
  for (const [edgeId, oldPath] of layoutResult.edges) {
    const points = oldPath.points
    if (points.length < 2) {
      // Cero puntos suficientes; preserva intacto.
      newEdges.set(edgeId, oldPath)
      continue
    }
    const source = points[0]
    const target = points[points.length - 1]
    if (source === undefined || target === undefined) {
      newEdges.set(edgeId, oldPath)
      continue
    }
    const newPath = buildPath(style, source, target, {
      tension,
      centerX,
      centerY,
      cornerRatio,
    })
    newEdges.set(edgeId, newPath)
  }

  return {
    ...layoutResult,
    edges: newEdges,
  }
}

function buildPath(
  style: CurveStyle,
  source: Position,
  target: Position,
  opts: { tension: number; centerX: number; centerY: number; cornerRatio: number },
): EdgePath {
  switch (style) {
    case 'straight':
      return { points: [source, target], kind: 'line' }

    case 'diagonal-vertical': {
      // Cubic Bézier con tangentes verticais.
      // Control1 = (sx, sy + (ty - sy) * tension)
      // Control2 = (tx, ty - (ty - sy) * tension)
      const dy = target.y - source.y
      const c1: Position = { x: source.x, y: source.y + dy * opts.tension }
      const c2: Position = { x: target.x, y: target.y - dy * opts.tension }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'diagonal-horizontal': {
      // Cubic Bézier con tangentes horizontais.
      const dx = target.x - source.x
      const c1: Position = { x: source.x + dx * opts.tension, y: source.y }
      const c2: Position = { x: target.x - dx * opts.tension, y: target.y }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'radial': {
      // Cubic Bézier coas control points apuntando ao centro.
      // Idea: control1 = source + (mid - source) * tension hacia o radio,
      //       control2 = target + (mid - target) * tension hacia o radio.
      // Simplificado: control points no midpoint angular.
      const mid: Position = {
        x: (source.x + target.x) / 2,
        y: (source.y + target.y) / 2,
      }
      const c1: Position = {
        x: source.x + (mid.x - source.x) * opts.tension,
        y: source.y + (mid.y - source.y) * opts.tension,
      }
      const c2: Position = {
        x: target.x + (mid.x - target.x) * opts.tension,
        y: target.y + (mid.y - target.y) * opts.tension,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'orthogonal': {
      // L-shape: source → corner → target.
      // Corner colocado segundo cornerRatio sobre o eixe horizontal.
      const cornerX = source.x + (target.x - source.x) * opts.cornerRatio
      const corner: Position = { x: cornerX, y: source.y }
      const corner2: Position = { x: cornerX, y: target.y }
      // S-shape (4 puntos) cando cornerRatio != 0 e != 1; senón L (3).
      if (opts.cornerRatio === 0 || opts.cornerRatio === 1) {
        // L-shape simple
        const lcorner: Position = opts.cornerRatio === 0
          ? { x: source.x, y: target.y }
          : { x: target.x, y: source.y }
        return { points: [source, lcorner, target], kind: 'polyline' }
      }
      // S-shape
      return { points: [source, corner, corner2, target], kind: 'polyline' }
    }
  }
}
```

**Importante**:
- **5 estilos exhaustivos** (decisión do autor).
- **`'straight'`** preserva comportamento actual (cero curva).
- **`'orthogonal'`** xera **3 puntos (L-shape)** se `cornerRatio === 0
  || 1`; **4 puntos (S-shape)** doutro xeito.
- **Cero validación** das opcións (tension fóra de [0,1] é
  permitido pero produce curvas estrañas; **cero defensivo
  pesimista**, paralelo a 4.2).

### 5.4 — BoundsCalculator

`BoundsCalculator.ts`:

```ts
import type { Position } from '../../types/node.js'
import type { Bounds, EdgePath, LayoutResult, MeshElement } from './LayoutResult.js'

/**
 * Opcións para BoundsCalculator.
 *
 * - `padding`: cantidade engadida a cada lado. Default 0.
 *   Aplica uniformemente a todos os nodos. Para padding por nodo,
 *   usar `paddingPerNode` (callback).
 * - `paddingPerNode`: callback que devolve padding para cada nodeId.
 *   Sobrescribe `padding` para nodos onde devolve un número.
 * - `includesMesh`: se true, inclúe os puntos do mesh no cálculo.
 *   Default true.
 * - `includesEdges`: se true, inclúe os puntos intermedios de edges
 *   curvos (cubic Bézier, polyline) no cálculo. Default true.
 */
export interface BoundsCalculatorOptions {
  readonly padding?: number
  readonly paddingPerNode?: (nodeId: string) => number | undefined
  readonly includesMesh?: boolean
  readonly includesEdges?: boolean
}

/**
 * Calcula bounds máis sofisticados que o min/max trivial dos nodos.
 *
 * Considera (segundo options):
 * - Posicións de tódolos nodos (sempre).
 * - Padding uniforme ou por nodo (se especificado).
 * - Puntos de mesh elements (circles, lines, polygons).
 * - Puntos intermedios de edges curvos (cubic Bézier control points,
 *   polyline waypoints).
 *
 * Cero modificación do LayoutResult. Función pura.
 *
 * Para TreeDef baleiro (cero nodos), devolve (0,0,0,0).
 */
export function computeBounds(
  layoutResult: LayoutResult,
  options: BoundsCalculatorOptions = {},
): Bounds {
  const padding = options.padding ?? 0
  const paddingPerNode = options.paddingPerNode
  const includesMesh = options.includesMesh ?? true
  const includesEdges = options.includesEdges ?? true

  // Cero nodos: bounds (0,0,0,0).
  if (layoutResult.nodes.size === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Nodos.
  for (const [nodeId, pos] of layoutResult.nodes) {
    const nodePadding = paddingPerNode?.(nodeId) ?? padding
    if (pos.x - nodePadding < minX) minX = pos.x - nodePadding
    if (pos.y - nodePadding < minY) minY = pos.y - nodePadding
    if (pos.x + nodePadding > maxX) maxX = pos.x + nodePadding
    if (pos.y + nodePadding > maxY) maxY = pos.y + nodePadding
  }

  // Mesh elements (se procede).
  if (includesMesh && layoutResult.mesh !== undefined) {
    for (const element of layoutResult.mesh) {
      const elementBounds = computeMeshElementBounds(element)
      if (elementBounds.minX < minX) minX = elementBounds.minX
      if (elementBounds.minY < minY) minY = elementBounds.minY
      if (elementBounds.maxX > maxX) maxX = elementBounds.maxX
      if (elementBounds.maxY > maxY) maxY = elementBounds.maxY
    }
  }

  // Edges (control points e waypoints intermedios).
  if (includesEdges) {
    for (const edgePath of layoutResult.edges.values()) {
      for (const pt of edgePath.points) {
        if (pt.x < minX) minX = pt.x
        if (pt.y < minY) minY = pt.y
        if (pt.x > maxX) maxX = pt.x
        if (pt.y > maxY) maxY = pt.y
      }
    }
  }

  return { minX, minY, maxX, maxY }
}

function computeMeshElementBounds(element: MeshElement): Bounds {
  switch (element.type) {
    case 'line':
      return {
        minX: Math.min(element.from.x, element.to.x),
        minY: Math.min(element.from.y, element.to.y),
        maxX: Math.max(element.from.x, element.to.x),
        maxY: Math.max(element.from.y, element.to.y),
      }
    case 'circle':
      return {
        minX: element.center.x - element.radius,
        minY: element.center.y - element.radius,
        maxX: element.center.x + element.radius,
        maxY: element.center.y + element.radius,
      }
    case 'polygon': {
      if (element.points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      }
      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY
      for (const pt of element.points) {
        if (pt.x < minX) minX = pt.x
        if (pt.y < minY) minY = pt.y
        if (pt.x > maxX) maxX = pt.x
        if (pt.y > maxY) maxY = pt.y
      }
      return { minX, minY, maxX, maxY }
    }
  }
}
```

**Importante**:
- **Función pura**, NON clase.
- **`paddingPerNode` callback** evita necesidade de modificar NodeDef.
- **`includesEdges` true por defecto**: control points de cubic Béziers
  poden estenderse fóra da liña recta entre source/target;
  considerados.

### 5.5 — QuadTree (a peza máis complexa)

`QuadTree.ts`. **Algoritmo descrito con pseudo-código exhaustivo en
§5.10** para evitar ambigüidade (lección 4.3 L1).

```ts
import type { Position } from '../../types/node.js'
import type { Bounds, LayoutResult } from './LayoutResult.js'

/**
 * Opcións para construír un QuadTree.
 *
 * - `maxDepth`: profundidade máxima da subdivisión. Default 8.
 * - `maxPointsPerNode`: número máximo de puntos antes de
 *   subdividir. Default 4.
 * - `extent`: bounds iniciais do quadtree. Se omitido, calcúlanse
 *   automaticamente desde os puntos.
 */
export interface QuadTreeOptions {
  readonly maxDepth?: number
  readonly maxPointsPerNode?: number
  readonly extent?: Bounds
}

/**
 * Spatial index recursivo bidimensional para range queries e
 * nearest neighbor sobre nodos dun LayoutResult.
 *
 * Implementa subdivisión recursiva en 4 cuadrantes (NW, NE, SW, SE).
 * Cada nodo interno garda 0 puntos; cada nodo folla garda ata
 * `maxPointsPerNode` puntos.
 *
 * Para uso futuro: `useVisibleNodes(engine, viewport)` (Fase 7
 * React); hit-testing (drag/drop futuro); culling para renderers
 * de árbores grandes (>1000 nodos).
 *
 * Algoritmo paralelo a d3-quadtree (cero dependencia externa).
 */
export class QuadTree {
  // ─── Estado interno ───
  // (descrito en §5.10 pseudo-código)

  static fromLayoutResult(
    layoutResult: LayoutResult,
    options?: QuadTreeOptions,
  ): QuadTree {
    // Construír desde os nodos do LayoutResult
  }

  constructor(
    points: ReadonlyMap<string, Position>,
    options: QuadTreeOptions = {},
  ) {
    // Implementación segundo §5.10
  }

  /**
   * Devolve os nodeIds cuxas posicións están dentro do `bounds`
   * proporcionado (rectangle query, inclusive).
   */
  queryRange(bounds: Bounds): readonly string[] {
    // Implementación segundo §5.10
  }

  /**
   * Devolve o nodeId máis preto ao punto dado (Euclidean distance).
   * Devolve undefined se o quadtree está baleiro.
   */
  queryNearest(point: Position): string | undefined {
    // Implementación segundo §5.10
  }

  /**
   * Conta de puntos almacenados.
   */
  size(): number { ... }
}
```

### 5.6 — Opcións de construcción de QuadTree

- **`extent`**: se omitido, calcúlase automaticamente como AABB dos
  puntos. Se proporcionado, **debe conter todos os puntos** (cero
  validación; consumidor responsable).
- **`maxDepth=8`**: previne recursión infinita (puntos coincidentes).
- **`maxPointsPerNode=4`**: limite estándar antes de subdividir.

### 5.7 — Range query: rectángulo inclusivo

`queryRange(bounds)` inclúe puntos con `x ∈ [minX, maxX]` e `y ∈
[minY, maxY]`. **Inclusive nos dous lados**.

### 5.8 — Nearest neighbor: Euclidean distance

`queryNearest(point)` usa `√((px-x)² + (py-y)²)`. **Devolve un só
nodeId** (cero ties handling complex; primeiro topado).

### 5.9 — Estado interno do QuadTree

```ts
private readonly root: QuadNode
private readonly maxDepth: number
private readonly maxPointsPerNode: number
private nodeCount: number  // total puntos

interface QuadNode {
  bounds: Bounds  // extensión deste node
  points: Array<{ id: string; position: Position }>  // só nos leaves
  children: QuadNode[] | null  // [NW, NE, SW, SE] cando subdividido
  depth: number
}
```

### 5.10 — Pseudo-código QuadTree

**Insertar un punto**:
```
INSERT(node, id, position):
  if node.children is null:
    // É folla
    node.points.push({ id, position })
    if node.points.length > maxPointsPerNode and node.depth < maxDepth:
      SUBDIVIDE(node)
  else:
    // É interno
    childIndex = WHICH_CHILD(node, position)
    INSERT(node.children[childIndex], id, position)

SUBDIVIDE(node):
  midX = (node.bounds.minX + node.bounds.maxX) / 2
  midY = (node.bounds.minY + node.bounds.maxY) / 2

  node.children = [
    // NW
    { bounds: { minX: node.bounds.minX, minY: node.bounds.minY,
                maxX: midX, maxY: midY },
      points: [], children: null, depth: node.depth + 1 },
    // NE
    { bounds: { minX: midX, minY: node.bounds.minY,
                maxX: node.bounds.maxX, maxY: midY },
      points: [], children: null, depth: node.depth + 1 },
    // SW
    { bounds: { minX: node.bounds.minX, minY: midY,
                maxX: midX, maxY: node.bounds.maxY },
      points: [], children: null, depth: node.depth + 1 },
    // SE
    { bounds: { minX: midX, minY: midY,
                maxX: node.bounds.maxX, maxY: node.bounds.maxY },
      points: [], children: null, depth: node.depth + 1 },
  ]

  // Redistribuír puntos existentes
  for (const p of node.points):
    childIndex = WHICH_CHILD(node, p.position)
    INSERT(node.children[childIndex], p.id, p.position)
  node.points = []  // baleirar; os puntos viven nos children

WHICH_CHILD(node, position):
  midX = (node.bounds.minX + node.bounds.maxX) / 2
  midY = (node.bounds.minY + node.bounds.maxY) / 2
  if position.x < midX:
    return position.y < midY ? 0 (NW) : 2 (SW)
  else:
    return position.y < midY ? 1 (NE) : 3 (SE)
```

**Range query**:
```
QUERY_RANGE(node, queryBounds, results):
  if not INTERSECTS(node.bounds, queryBounds):
    return  // skip esta rama

  if node.children is null:
    // folla
    for (const p of node.points):
      if CONTAINS(queryBounds, p.position):
        results.push(p.id)
  else:
    // interno: recurse en children
    for (const child of node.children):
      QUERY_RANGE(child, queryBounds, results)

INTERSECTS(b1, b2):
  return not (b1.maxX < b2.minX or b1.minX > b2.maxX or
              b1.maxY < b2.minY or b1.minY > b2.maxY)

CONTAINS(bounds, position):
  return position.x >= bounds.minX and position.x <= bounds.maxX and
         position.y >= bounds.minY and position.y <= bounds.maxY
```

**Nearest neighbor** (simplificado, cero priority queue):
```
QUERY_NEAREST(node, point, best):
  // best = { id: string | undefined, distance: number }
  if best.distance > 0 and MIN_DISTANCE(node.bounds, point) > best.distance:
    return  // skip esta rama (prune)

  if node.children is null:
    // folla
    for (const p of node.points):
      d = EUCLIDEAN(p.position, point)
      if d < best.distance:
        best.distance = d
        best.id = p.id
  else:
    // visitar children en orde por proximidade
    sortedChildren = sort children by MIN_DISTANCE(child.bounds, point)
    for (const child of sortedChildren):
      QUERY_NEAREST(child, point, best)

MIN_DISTANCE(bounds, point):
  // distancia mínima dun rectangle a un punto
  dx = max(0, max(bounds.minX - point.x, point.x - bounds.maxX))
  dy = max(0, max(bounds.minY - point.y, point.y - bounds.maxY))
  return sqrt(dx * dx + dy * dy)

EUCLIDEAN(p1, p2):
  return sqrt((p1.x - p2.x)² + (p1.y - p2.y)²)
```

**Auto-calcular extent**:
```
COMPUTE_EXTENT(points):
  if points.size === 0:
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }

  minX = ...  // como en computeBounds
  maxX = ...
  // Engadir margen pequena para evitar puntos exactamente no borde
  // (que poderían acabar en NW ou NE arbitrariamente).
  const padding = max((maxX - minX) * 0.001, 0.001)
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
```

### 5.11 — Cero modificación de pezas existentes

**Cero modificación** de:
- IdentityLayout, RadialLayout, MeshGenerator, RadialLayoutConfig,
  TreeLayout, TreeLayoutConfig, CustomLayoutConfig.
- LayoutEngine, LayoutEngineRegistry, computeLayout.
- DependencyGraph.
- TreeEngine, ProgressManager, schemas.
- Calquera outra peza de core, common, ou storage.

**SI se modifica**:
- `LayoutResult.ts` para engadir `PathKind` type + campo opcional
  `kind?` a EdgePath (5.2). **Cero ruptura**.

### 5.12 — Cero ErrorCodes novos

`LAYOUT_COMPUTE_FAILED` non se usa nesta sub-fase (PathBuilder e
BoundsCalculator non fallan; QuadTree devolve undefined no nearest
empty). **Cero modificación de common**.

### 5.13 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
// PathBuilder
export type { CurveStyle, PathBuilderOptions } from './layouts/PathBuilder.js'
export { buildPaths } from './layouts/PathBuilder.js'

// BoundsCalculator
export type { BoundsCalculatorOptions } from './layouts/BoundsCalculator.js'
export { computeBounds } from './layouts/BoundsCalculator.js'

// QuadTree
export type { QuadTreeOptions } from './layouts/QuadTree.js'
export { QuadTree } from './layouts/QuadTree.js'

// PathKind (re-exportar)
export type { PathKind } from './layouts/LayoutResult.js'
```

### 5.14 — Tests funcionais

Crear tres ficheiros de test en
`packages/core/__tests__/engine/layouts/`:

**`PathBuilder.test.ts`** (~25 tests):

*Estilo 'straight':*
1. Input liña recta: output igual (preserva 2 puntos, kind='line').
2. Edges múltiples: todos transformados.
3. EdgePath con `< 2` puntos: preservado intacto (defensivo).

*Estilo 'diagonal-vertical':*
4. Source (0,0) e target (10, 100): 4 puntos cubic, kind='cubic'.
5. Control points con tangentes verticais (mesmo x que source/target).
6. tension 0.5 por defecto: control1.y = sy + dy*0.5.
7. tension custom: aplícase.

*Estilo 'diagonal-horizontal':*
8. Control points con tangentes horizontais.
9. 4 puntos cubic.

*Estilo 'radial':*
10. Control points en torno ao midpoint.
11. centerX/centerY non se usan (pero opción aceptada).

*Estilo 'orthogonal':*
12. cornerRatio 0.5 (default): 4 puntos S-shape.
13. cornerRatio 0: 3 puntos L-shape.
14. cornerRatio 1: 3 puntos L-shape inverso.
15. kind='polyline' en todos os casos.

*Inmutabilidade:*
16. Input layoutResult non modificado.
17. Mesh, nodes, bounds, layoutType preservados intactos.

*Integración:*
18. buildPaths sobre RadialLayout output: 4 puntos cubic en cada edge.
19. buildPaths sobre TreeLayout output: cubic edges.
20. buildPaths sobre IdentityLayout output: cubic ou polyline edges.

*Edge cases:*
21. layoutResult.edges baleiro: output con edges baleiro.
22. tension > 1 (fora de rango): cero erro, curvas estrañas pero
    matemáticamente válidas.
23. tension negativo: idem.

*Determinismo:*
24. Mesma entrada: mesma saída exacta.
25. PathKind type-test.

**`BoundsCalculator.test.ts`** (~20 tests):

*Casos básicos:*
1. LayoutResult baleiro: bounds (0,0,0,0).
2. Un nodo: bounds redondea o nodo.
3. Múltiples nodos: min/max correctos.
4. Padding uniforme: amplía bounds.

*paddingPerNode:*
5. paddingPerNode devolve undefined para nodos sen padding (fallback
   ao default).
6. paddingPerNode devolve número: usa ese padding por nodo.
7. paddingPerNode pode variar por nodo.

*Mesh:*
8. includesMesh true (default) e mesh con circles: bounds inclúe.
9. includesMesh false: mesh ignorado.
10. Mesh con lines, polygons: bounds inclúe.

*Edges:*
11. includesEdges true (default) e edges cubic: control points
    incluidos.
12. includesEdges false: só nodes + mesh.

*Edge cases:*
13. Mesh undefined no LayoutResult: cero crash.
14. Edges baleiros: cero efecto.

*Integración:*
15. computeBounds(RadialLayout output) coa mesh: bounds ampliado
    polo polygon perimetral.
16. Diferenza entre includesEdges true vs false coa cubic Béziers.
17. computeBounds vs LayoutResult.bounds: distintos cando se aplica
    padding.

*Determinismo:*
18. Mesma entrada: mesma saída.

*Inmutabilidade:*
19. LayoutResult input non modificado.

*Type-test:*
20. BoundsCalculatorOptions shape.

**`QuadTree.test.ts`** (~25 tests):

*Construción:*
1. QuadTree baleiro: size 0, queryNearest devolve undefined.
2. QuadTree con 1 punto: size 1, queryNearest devolve ese.
3. QuadTree con N puntos: size N.
4. fromLayoutResult: construído correctamente.
5. extent custom: usa o proporcionado.
6. extent auto: calculado.

*queryRange:*
7. Range que cubre todos os puntos: devolve todos.
8. Range que non cubre ningún: devolve [].
9. Range parcial: devolve só os contidos.
10. Range cos límites exactos (puntos no borde): inclusivos.
11. Range fóra dos extents: devolve [].

*queryNearest:*
12. Punto distante: devolve o máis preto.
13. Punto coincidente cun punto stored: devolve ese.
14. Punto equidistante de varios: devolve algún (consistencia, cero
    estabilidade prescrita).
15. QuadTree baleiro: undefined.

*Subdivisión:*
16. Inserir 5 puntos próximos (maxPointsPerNode=4): forza subdivisión.
17. Inserir 100 puntos: árbore correctamente equilibrada.
18. maxDepth limit: puntos coincidentes non excedan profundidade.

*Edge cases:*
19. Múltiples puntos no mesmo lugar: aceptados, gardados xuntos.
20. Punto exactamente nun border de cuadrante: asignación consistente
    (NW priority).
21. extent cero (minX==maxX): cero crash.

*Integración:*
22. QuadTree.fromLayoutResult(RadialLayout output): funciona.
23. QuadTree con LayoutResult baleiro: size 0.

*Type-test:*
24. QuadTreeOptions shape.

*Determinismo:*
25. Mesmos puntos, mesma orde de inserción: mesma estrutura interna
    (queryRange devolve mesmos resultados).

### 5.15 — Cobertura

- `PathBuilder.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch.
- `BoundsCalculator.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch.
- `QuadTree.ts`: **100% Stmts/Funcs/Lines, ≥85% Branch** (relaxado
  fronte ao usual; **anticipo de lección 4.3 L1**: QuadTree é
  algoritmo recursivo con ramas internas que requiren puntos en
  posicións específicas para activarse).
- Global core: non baixar significativamente (98.05% baseline post-4.4;
  tolerancia ≤0.1 puntos).

### 5.16 — Cero modificación de tests existentes

Os 1140 tests previos non se tocan.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/layouts/PathBuilder.ts` (NOVO)
- `packages/core/src/engine/layouts/BoundsCalculator.ts` (NOVO)
- `packages/core/src/engine/layouts/QuadTree.ts` (NOVO)
- `packages/core/src/engine/layouts/LayoutResult.ts` (MODIFICADO:
  engadir PathKind type + campo opcional `kind?` en EdgePath)
- `packages/core/src/engine/index.ts` (MODIFICADO: +7 exports)

**Tests:**
- `packages/core/__tests__/engine/layouts/PathBuilder.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/BoundsCalculator.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/QuadTree.test.ts` (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1140 tests core + 60 common + 171 storage con `--force`.

2. **Verifica que EdgePath/Bounds/MeshElement están como esperaba**:
   ```
   cat packages/core/src/engine/layouts/LayoutResult.ts
   ```
   Confirma:
   - EdgePath ten `points: readonly Position[]` (cero `kind`).
   - MeshElement é discriminated union 'line' | 'circle' | 'polygon'.
   - Bounds é AABB simple.

3. **Verifica patrón de exports en engine/index.ts**.

### T1 — Ampliar EdgePath con `kind?` (5.2)

Editar `packages/core/src/engine/layouts/LayoutResult.ts`:
- Engadir `export type PathKind = 'line' | 'cubic' | 'polyline'`.
- Engadir campo `kind?: PathKind` a EdgePath.
- JSDoc actualizado.

Typecheck 20/20. **Cero ruptura esperada** (campo opcional). 1140
tests previos seguen pasando.

### T2 — PathBuilder (5.3)

Crear `packages/core/src/engine/layouts/PathBuilder.ts` con:
- `CurveStyle` type.
- `PathBuilderOptions` interface.
- `buildPaths(layoutResult, style, options?)` función pura.
- Helper privado `buildPath` con switch sobre estilos.

Typecheck 20/20.

### T3 — Tests PathBuilder (5.14)

Crear `__tests__/engine/layouts/PathBuilder.test.ts` cos ~25 tests.

### T4 — BoundsCalculator (5.4)

Crear `packages/core/src/engine/layouts/BoundsCalculator.ts` con:
- `BoundsCalculatorOptions` interface.
- `computeBounds(layoutResult, options?)` función pura.
- Helper privado `computeMeshElementBounds` para mesh elements.

Typecheck 20/20.

### T5 — Tests BoundsCalculator (5.14)

Crear `__tests__/engine/layouts/BoundsCalculator.test.ts` cos ~20
tests.

### T6 — QuadTree esqueleto (5.5 + 5.9)

Crear `packages/core/src/engine/layouts/QuadTree.ts` con:
- `QuadTreeOptions` interface.
- `QuadNode` interface privada.
- `QuadTree` clase coa estrutura.
- Métodos esqueleto (sen implementar lóxica).

Typecheck 20/20.

### T7 — Implementar QuadTree segundo §5.10

**Implementar fielmente** o pseudo-código de 5.10. Métodos privados:
- `insert(node, id, position, depth)`
- `subdivide(node)`
- `whichChild(node, position)`
- `intersects(b1, b2)`
- `contains(bounds, position)`
- `minDistance(bounds, point)`
- `euclidean(p1, p2)`
- `computeExtent(points)`

E métodos públicos:
- `constructor`
- `static fromLayoutResult`
- `queryRange`
- `queryNearest`
- `size`

**Calquera dúbida sobre pseudo-código → ESCALAR, NON inventar**
(lección 4.3 L1).

Typecheck 20/20.

### T8 — Tests QuadTree (5.14)

Crear `__tests__/engine/layouts/QuadTree.test.ts` cos ~25 tests.

### T9 — Exportar dende engine/index.ts (5.13)

Engadir 7 exports.

### T10 — Verificación post-T9

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1140 tests previos seguen pasando intactos.
- 60 common intactos.
- 171 storage intactos.

### T11 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- PathBuilder.ts 100/≥95%/100/100.
- BoundsCalculator.ts 100/≥95%/100/100.
- QuadTree.ts 100/≥85%/100/100 (anticipo 4.3 L1).
- Global core ≥97.95% (tolerancia desde 98.05%).

### T12 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/layouts/PathBuilder.ts \
  packages/core/src/engine/layouts/BoundsCalculator.ts \
  packages/core/src/engine/layouts/QuadTree.ts
pnpm test
```

- Changeset **minor** para `@yggdrasil-forge/core`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `PathBuilder` (`buildPaths(layoutResult, style, options?)`):
    transforma os edges dun LayoutResult aplicando un dos 5 estilos
    de curva: 'straight', 'diagonal-vertical', 'diagonal-horizontal',
    'radial', 'orthogonal'.
  - `CurveStyle` + `PathBuilderOptions` types.
  - `PathKind` type ('line' | 'cubic' | 'polyline'); campo opcional
    `kind?` engadido a EdgePath (cero ruptura).
  - `BoundsCalculator` (`computeBounds(layoutResult, options?)`):
    cálculo sofisticado con padding uniforme/por nodo, inclusión
    opcional de mesh e edges curvos.
  - `BoundsCalculatorOptions` type.
  - `QuadTree`: spatial index recursivo con queryRange + queryNearest.
    Para uso futuro en useVisibleNodes (Fase 7). Algoritmo paralelo
    a d3-quadtree (cero dependencia externa).
  - `QuadTreeOptions` type.

  ### Note
  - Sub-fase 4.5 entrega 3 pezas heteroxéneas pero
    arquitectónicamente independentes nun só sprint (decisión do
    autor).
  - QuadTree branch coverage ≥85% relaxado (anticipo 4.3 L1):
    algoritmo recursivo con ramas internas que requiren puntos en
    posicións específicas para activarse.
  - EdgePath.kind: campo opcional default 'line'. IdentityLayout/
    RadialLayout/TreeLayout (4.1-4.4) seguen producindo 2 puntos
    sen kind explícito.
  ```

### T13 — Commit + push

Commit Conventional:
`feat(core): add PathBuilder, BoundsCalculator and QuadTree (sub-phase 4.5)`.
Push directo a `origin/main` (base `f055555`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/layouts/PathBuilder.ts` (NOVO)
- `packages/core/src/engine/layouts/BoundsCalculator.ts` (NOVO)
- `packages/core/src/engine/layouts/QuadTree.ts` (NOVO)
- `packages/core/src/engine/layouts/LayoutResult.ts` (MODIFICADO:
  PathKind + EdgePath.kind?)
- `packages/core/src/engine/index.ts` (MODIFICADO: +7 exports)
- `packages/core/__tests__/engine/layouts/PathBuilder.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/BoundsCalculator.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/QuadTree.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/common/`.
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, ou outros globais.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- IdentityLayout, RadialLayout, MeshGenerator, RadialLayoutConfig,
  TreeLayout, TreeLayoutConfig, CustomLayoutConfig (5.11).
- LayoutEngine, LayoutEngineRegistry, computeLayout (5.11).
- DependencyGraph, TreeEngine, schemas, etc.
- Tests existentes 4.1-4.4 (cero modificación).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**Pseudo-código 5.10**: implementar **fielmente**. Calquera ambigüidade
→ **ESCALAR** (lección 4.3 L1).

---

## 9. QUE NON FACER

- ❌ Modificar IdentityLayout, RadialLayout, TreeLayout (5.11).
- ❌ Modificar LayoutEngine, LayoutEngineRegistry, computeLayout (5.11).
- ❌ Modificar EdgePath máis que engadir `kind?` opcional (5.2).
- ❌ Cambiar EdgePath.points a forma distinta (5.2: array de Position).
- ❌ Engadir dependencias externas (cero d3, cero rbush).
- ❌ Engadir 'quadratic' a PathKind (decisión do director: 4 puntos
  para 'cubic', 3+ para 'polyline'; cero quadratic intermedio).
- ❌ Crear paquete novo (5.1: 3 ficheiros en core/engine/layouts/).
- ❌ Engadir 'tier'/'radius'/'size' a NodeDef (5.4: paddingPerNode
  callback).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/`.
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes (5.12).
- ❌ Modificar LayoutResult.bounds automaticamente con buildPaths ou
  computeBounds (5.3, 5.4: ambas son funcións puras que NON modifican
  LayoutResult orixinal; buildPaths devolve novo LayoutResult con
  edges actualizados pero bounds intacto).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.
- ❌ Inventar lóxica de QuadTree distinta da §5.10. Calquera dúbida →
  ESCALAR.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 4.5 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base f055555)
✅ PathBuilder con 5 estilos (straight, diagonal-V/H, radial, orthogonal)
✅ BoundsCalculator con padding + mesh/edges inclusion configurable
✅ QuadTree con queryRange + queryNearest + maxDepth/maxPointsPerNode
✅ EdgePath ampliado con `kind?: PathKind` opcional (cero ruptura)
✅ Cero modificación de IdentityLayout/RadialLayout/TreeLayout
✅ Cero modificación de LayoutEngine/Registry/computeLayout
✅ Cero ErrorCodes novos; cero modificación de common/storage/
   tsconfig/tsup
✅ T0.2 EdgePath e MeshElement actuais verificados
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> PathBuilder (5 estilos)
   - <Y> BoundsCalculator (padding + mesh + edges)
   - <Z> QuadTree (queryRange + queryNearest + subdivisión)
✅ Cobertura:
   - PathBuilder.ts 100/<X%>/100/100
   - BoundsCalculator.ts 100/<X%>/100/100
   - QuadTree.ts 100/<X%>/100/100 (Branch ≥85% por defensivas
     internas de recursión)
   - Global core: <X%> (baseline 98.05%; toleranza ≤0.1)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - Sub-fase con 3 pezas heteroxéneas; complexity blooming risco
     anticipado e mitigado (3 ficheiros físicos).
   - QuadTree branch coverage relaxada ≥85% (lección 4.3 L1).
   - PathBuilder cero validación de tension fora de rango.
   - BoundsCalculator: padding por nodo via callback (cero
     modificación de NodeDef).
   - EdgePath.kind: campo opcional; cero ruptura de pezas 4.1-4.4.
✅ Changeset minor (core) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 4.6 (SSR-friendly verification) — última da
Fase 4.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 4.5. Tres pezas heteroxéneas nun só sprint.
QuadTree con pseudo-código exhaustivo en §5.10; calquera dúbida →
ESCALAR (lección 4.3 L1).*
