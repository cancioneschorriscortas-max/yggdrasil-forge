# BRIEFING — SUB-FASE 4.3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Terceira sub-fase da Fase 4 (Layout Engine).** Implementar
> TreeLayout co algoritmo de Buchheim et al. 2002 (linear-time
> variante do Reingold-Tilford), con 4 direccións soportadas, e
> manexo de DAGs mediante "primary parent" (menor level BFS). Sub-fase
> matemáticamente densa pero arquitectónicamente illada.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2
e 3.6.a L1**: calquera modificación fóra de §6 require **ESCALAR
ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 4.3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 4.3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **4.3** de Yggdrasil Forge. **Terceira da Fase 4** (Layout
Engine). Implementamos o tree layout xerárquico clásico ao estilo
Diablo/WoW talents.

**Decisión clave do autor**: usar o algoritmo **Buchheim et al. 2002**
(linear-time variante do Reingold-Tilford 1981) en vez do
simplificado. **~300 liñas de matemática densa pero industrial
estándar**.

**Pezas novas**:

1. `TreeDirection` type.
2. `TreeLayoutConfig` interface.
3. `parseTreeConfig` validador.
4. `TreeLayout` clase (LayoutEngine para 'tree').

---

## 2. CONTEXTO MÍNIMO

§20 MASTER lista 'tree' como "Vertical/horizontal" inspirado en
Diablo, WoW talents. **Estrutura clásica xerárquica**: roots na liña
superior, fillos abaixo en niveis. **4 direccións** soportadas en
4.3.

**Importante**: TreeDef en Yggdrasil é **DAG**, NON árbore estricta:
un nodo pode ter múltiples prereqs. Buchheim require **árbore
estricta** (un só pai). **Solución decisión do director**: para cada
nodo cuxo level BFS > 0, elixir o seu **"primary parent"** como o
único pai estructural a efectos de layout. Edges seguen visibles
**todos**; só o **layout xerárquico** elixe un parent.

**Referencias do algoritmo Buchheim** (cero dependencia externa; o
executor implementa desde pseudo-código):
- Paper Buchheim, Jünger, Leipert 2002: "Improving Walker's Algorithm
  to Run in Linear Time".
- Implementación canónica accesible:
  https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/
  (pseudo-código C# claro).
- Implementación funcional clara:
  https://williamyaoh.com/posts/2023-04-22-drawing-trees-functionally.html

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `b9eef4c` (RadialLayout + MeshGenerator
  4.2).
- 1082 tests core + 60 common + 171 storage = ~1313 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **LayoutEngine, LayoutEngineRegistry, IdentityLayout, RadialLayout,
  computeLayout, LayoutResult, BaseLayoutConfig, EdgePath, Bounds,
  MeshElement, parseRadialConfig** dispoñibles desde core.
- **`DependencyGraph`** API verificada en 4.2:
  `constructor(nodeIds, edges, options?)` con default
  `edgeTypes=['dependency']`, `getRoots()`, `getOutgoing()`,
  `getDependencies()`.
- **ErrorCode `LAYOUT_COMPUTE_FAILED` (YGG_L002)** xa estreado en
  4.2; reutilízase aquí.
- **`Position { x: number; y: number }`** dispoñible.
- DT-9, DT-11, DT-12, DT-14, DT-15, DT-16 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/layouts/TreeLayout.ts` cunha clase
`TreeLayout` que implementa o algoritmo Buchheim et al. 2002, crear
`TreeLayoutConfig.ts` con tipos + validador (paralelo a
RadialLayoutConfig de 4.2), soportar 4 direccións via transformación
post-cálculo, reducir DAG a árbore lóxica mediante "primary parent"
(menor level BFS), exportar publicamente desde core, e cubrir con
tests funcionais completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estrutura de ficheiros

Engadir 2 ficheiros novos baixo `packages/core/src/engine/layouts/`:

```
TreeLayout.ts        ← NOVO: clase TreeLayout (Buchheim)
TreeLayoutConfig.ts  ← NOVO: TreeLayoutConfig + parseTreeConfig
```

**Cero subdirectorios**. **Cero ficheiros de auxiliar separados**
(Buchheim implementación inteira dentro de `TreeLayout.ts`, igual ca
RadialLayout en 4.2).

### 5.2 — TreeLayoutConfig + TreeDirection

`TreeLayoutConfig.ts`:

```ts
import type { BaseLayoutConfig } from '../../types/tree.js'

/**
 * Dirección do layout xerárquico.
 *
 * - `'top-down'`: roots arriba, fillos abaixo. Default. (Diablo, WoW).
 * - `'bottom-up'`: roots abaixo, fillos arriba (organigrama
 *   invertido).
 * - `'left-right'`: roots á esquerda, fillos cara a dereita.
 * - `'right-left'`: roots á dereita, fillos cara a esquerda.
 */
export type TreeDirection = 'top-down' | 'bottom-up' | 'left-right' | 'right-left'

/**
 * Configuración do TreeLayout.
 *
 * Algoritmo: Buchheim et al. 2002 (linear-time variante de
 * Reingold-Tilford 1981). Para TreeDefs que son DAGs (nodo con
 * múltiples prereqs), cada nodo elixe o seu "primary parent" como
 * pai estructural (menor level BFS; desempate por orde en
 * treeDef.nodes). Edges seguen visibles **todos**; só o layout
 * xerárquico usa o primary parent.
 *
 * Múltiples roots: cada root é unha árbore independente; colócanse
 * un á dereita do outro con separación `nodeSpacing * 2`.
 *
 * Nodos illados (sen prereqs nin sucesores) trátanse como roots
 * (árbore dun só nodo).
 */
export interface TreeLayoutConfig extends BaseLayoutConfig {
  readonly type: 'tree'

  /** Dirección do layout. Default `'top-down'`. */
  readonly direction?: TreeDirection

  /**
   * Distancia entre nodos do mesmo nivel (eixe perpendicular á
   * dirección). Default 80. Debe ser > 0.
   */
  readonly nodeSpacing?: number

  /**
   * Distancia entre niveles consecutivos (eixe da dirección).
   * Default 120. Debe ser > 0.
   */
  readonly levelSpacing?: number

  /** Centro X do layout. Default 0. */
  readonly centerX?: number

  /** Centro Y do layout. Default 0. */
  readonly centerY?: number
}
```

### 5.3 — parseTreeConfig

No mesmo ficheiro `TreeLayoutConfig.ts`:

```ts
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { LayoutConfig } from '../../types/tree.js'

const DEFAULT_LOCALE: Locale = 'gl'
const VALID_DIRECTIONS: readonly TreeDirection[] = [
  'top-down',
  'bottom-up',
  'left-right',
  'right-left',
]

/**
 * Valida e parsea un LayoutConfig xenérico a TreeLayoutConfig
 * estricto. Devolve err(LAYOUT_COMPUTE_FAILED) con `reason`
 * específica se algún campo é inválido.
 */
export function parseTreeConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<TreeLayoutConfig> {
  // type
  if (config.type !== 'tree') {
    return makeError(locale, `expected type 'tree', got '${config.type}'`)
  }

  // direction (opcional)
  const direction = config.direction
  if (direction !== undefined) {
    if (typeof direction !== 'string' ||
        !VALID_DIRECTIONS.includes(direction as TreeDirection)) {
      return makeError(locale, `invalid direction: ${String(direction)}`)
    }
  }

  // nodeSpacing (opcional, > 0)
  const nodeSpacing = config.nodeSpacing
  if (nodeSpacing !== undefined) {
    if (typeof nodeSpacing !== 'number' || !Number.isFinite(nodeSpacing) || nodeSpacing <= 0) {
      return makeError(locale, `nodeSpacing must be a positive number; got ${String(nodeSpacing)}`)
    }
  }

  // levelSpacing (opcional, > 0)
  // ... análogo

  // centerX, centerY (opcionais, número finito)
  // ... análogo

  return ok({
    type: 'tree',
    ...(direction !== undefined && { direction }),
    ...(nodeSpacing !== undefined && { nodeSpacing }),
    // ... resto
  } as TreeLayoutConfig)
}

function makeError(locale: Locale, reason: string): Result<TreeLayoutConfig> {
  return err(
    new YggdrasilError(
      ErrorCode.LAYOUT_COMPUTE_FAILED,
      getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
        type: 'tree',
        reason,
      }),
      { context: { reason } },
    ),
  )
}
```

**Decisión**:
- Paralelo a `parseRadialConfig` (4.2): mesmo patrón.
- Spread condicional con `exactOptionalPropertyTypes` (0.10).

### 5.4 — Buchheim algoritmo: estrutura interna

**Implementación dentro de `TreeLayout.ts`**. **Cero nodos virtuais
expostos**; toda a estrutura é interna á clase.

**Tipo interno** `TreeNode`:

```ts
interface TreeNode {
  readonly id: string
  readonly children: TreeNode[]
  parent: TreeNode | null
  leftSibling: TreeNode | null
  rightSibling: TreeNode | null
  // Buchheim algorithm state:
  prelim: number       // Preliminary X coordinate
  mod: number          // Modifier value (acumulado)
  thread: TreeNode | null  // Thread pointer (para contour rápido)
  ancestor: TreeNode   // Default ancestor (para apportion)
  change: number       // Para shifts agregados
  shift: number        // Para shifts agregados
  // Resultado final:
  x: number           // X final (lóxico)
  y: number           // Y final (nivel * 1)
}
```

### 5.5 — Algoritmo Buchheim paso a paso

**Implementación completa dentro de `TreeLayout.compute()`** (con
métodos privados para clarear):

```ts
class TreeLayout implements LayoutEngine {
  readonly type = 'tree'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    // 1. Validar config
    const configResult = parseTreeConfig(treeDef.layout)
    if (!configResult.ok) return configResult
    const config = configResult.value

    const direction = config.direction ?? 'top-down'
    const nodeSpacing = config.nodeSpacing ?? 80
    const levelSpacing = config.levelSpacing ?? 120
    const centerX = config.centerX ?? 0
    const centerY = config.centerY ?? 0

    // 2. Caso baleiro
    if (treeDef.nodes.length === 0) {
      return ok({
        nodes: new Map(),
        edges: new Map(),
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        layoutType: 'tree',
      })
    }

    // 3. BFS para determinar niveis (paralelo a RadialLayout)
    const graph = new DependencyGraph(
      treeDef.nodes.map(n => n.id),
      treeDef.edges,
    )
    const nodeLevels = this.computeNodeLevels(graph, treeDef)

    // 4. Determinar primary parent de cada nodo:
    //    Para cada nodo con level > 0, escoller un dos seus
    //    prereqs (incoming edges) cuxo level sexa exactamente
    //    level-1; desempate por orde en treeDef.nodes.
    const primaryParent = this.computePrimaryParents(graph, treeDef, nodeLevels)

    // 5. Construír árbores lóxicas (un TreeNode por cada NodeDef):
    //    Cada TreeNode coñece o seu parent (vía primary parent) e
    //    os seus children (en orde de aparición).
    const { roots, nodesById } = this.buildTrees(treeDef, primaryParent, nodeLevels)

    // 6. Para cada root, executar Buchheim:
    const rootResults: Array<{ root: TreeNode; bounds: { minX: number; maxX: number } }> = []
    for (const root of roots) {
      this.firstWalk(root, 0)  // post-order pass
      this.secondWalk(root, -root.prelim, 0)  // pre-order pass; shift para que minX=0

      // Calcular bounds da árbore
      let minX = Infinity
      let maxX = -Infinity
      this.forEachNode(root, n => {
        if (n.x < minX) minX = n.x
        if (n.x > maxX) maxX = n.x
      })
      rootResults.push({ root, bounds: { minX, maxX } })
    }

    // 7. Shift múltiples roots horizontalmente
    let xOffset = 0
    for (const { root, bounds } of rootResults) {
      const localShift = xOffset - bounds.minX
      this.forEachNode(root, n => {
        n.x += localShift
      })
      xOffset += bounds.maxX - bounds.minX + nodeSpacing * 2  // 2x espazado entre árbores
    }

    // 8. Aplicar transformación de dirección + escalas + centro
    const nodes = new Map<string, Position>()
    for (const treeNode of nodesById.values()) {
      const finalPos = this.transformPosition(
        treeNode.x,
        treeNode.y,
        direction,
        nodeSpacing,
        levelSpacing,
        centerX,
        centerY,
      )
      nodes.set(treeNode.id, finalPos)
    }

    // 9. Edges como liñas rectas (paralelo a outros layouts)
    const edges = this.computeEdges(treeDef, nodes)

    // 10. Bounds
    const bounds = this.computeBounds(nodes)

    return ok({
      nodes,
      edges,
      bounds,
      layoutType: 'tree',
    })
  }

  // ─── Métodos privados ───

  private computeNodeLevels(graph, treeDef): Map<string, number> {
    // BFS desde roots. Mesmo patrón ca RadialLayout.
  }

  private computePrimaryParents(graph, treeDef, levels): Map<string, string | null> {
    // Para cada nodo:
    //   Se level === 0: parent = null (root).
    //   Senón: deps = graph.getDependencies(nodeId)
    //          candidates = deps cuxo level === currentLevel - 1
    //          Se non hai (level skip), candidates = deps cuxo level < currentLevel
    //          Escoller o primeiro candidate por orde en treeDef.nodes.
  }

  private buildTrees(treeDef, primaryParent, levels): { roots, nodesById } {
    // Construír TreeNode para cada NodeDef.
    // Configurar children + leftSibling + rightSibling.
    // Children en orde de aparición en treeDef.nodes.
  }

  private firstWalk(v: TreeNode, distance: number): void {
    // Buchheim FIRST WALK (post-order).
    // Pseudo-código en rachel53461.wordpress.com.
    // Para cada nodo:
    //   Se folla: prelim = 0 ou x do leftSibling + distance.
    //   Senón: walk children, executeShifts, prelim = midpoint.
  }

  private secondWalk(v: TreeNode, m: number, level: number): void {
    // Buchheim SECOND WALK (pre-order).
    // Para cada nodo:
    //   x = prelim + m
    //   y = level
    //   for child: secondWalk(child, m + child.mod, level + 1)
  }

  private apportion(v: TreeNode, defaultAncestor: TreeNode, distance: number): TreeNode {
    // Buchheim APPORTION: maneja conflitos entre subárbores.
    // Pseudo-código en rachel53461.
  }

  // ... outros helpers internos (executeShifts, moveSubtree,
  // nextLeft, nextRight, ancestor)

  private transformPosition(
    x: number, y: number, direction: TreeDirection,
    nodeSpacing: number, levelSpacing: number,
    centerX: number, centerY: number,
  ): Position {
    switch (direction) {
      case 'top-down':
        return { x: x * nodeSpacing + centerX, y: y * levelSpacing + centerY }
      case 'bottom-up':
        return { x: x * nodeSpacing + centerX, y: -y * levelSpacing + centerY }
      case 'left-right':
        return { x: y * levelSpacing + centerX, y: x * nodeSpacing + centerY }
      case 'right-left':
        return { x: -y * levelSpacing + centerX, y: x * nodeSpacing + centerY }
    }
  }

  private computeEdges(treeDef, nodes): Map<string, EdgePath> {
    // Liñas rectas entre source/target.
  }

  private computeBounds(nodes): Bounds {
    // min/max das posicións finais.
  }

  private forEachNode(root: TreeNode, fn: (n: TreeNode) => void): void {
    fn(root)
    for (const child of root.children) {
      this.forEachNode(child, fn)
    }
  }
}
```

### 5.6 — Pseudo-código Buchheim resumido

Para evitar reinventar o algoritmo, o executor implementa
**directamente** o pseudo-código deste resumo (que segue
fielmente o paper Buchheim 2002):

```
FIRST_WALK(v, distance):
  if v is leaf:
    if leftSibling(v) exists:
      v.prelim = leftSibling(v).prelim + distance
    else:
      v.prelim = 0
  else:
    defaultAncestor = leftmost child of v
    for each child w of v in order:
      FIRST_WALK(w, distance)
      defaultAncestor = APPORTION(w, defaultAncestor, distance)
    EXECUTE_SHIFTS(v)
    midpoint = (leftmost(v).prelim + rightmost(v).prelim) / 2
    if leftSibling(v) exists:
      v.prelim = leftSibling(v).prelim + distance
      v.mod = v.prelim - midpoint
    else:
      v.prelim = midpoint

SECOND_WALK(v, m, level):
  v.x = v.prelim + m
  v.y = level
  for each child w of v:
    SECOND_WALK(w, m + v.mod, level + 1)

APPORTION(v, defaultAncestor, distance):
  if leftSibling(v) exists:
    // Walk contours of left subtree and right subtree.
    // Compute "shift" needed to avoid collision.
    vip = v; vop = v
    vim = leftSibling(v); vom = leftmost(v.parent)
    sip = vip.mod; sop = vop.mod
    sim = vim.mod; som = vom.mod
    while NEXT_RIGHT(vim) != nil and NEXT_LEFT(vip) != nil:
      vim = NEXT_RIGHT(vim)
      vip = NEXT_LEFT(vip)
      vom = NEXT_LEFT(vom)
      vop = NEXT_RIGHT(vop)
      vop.ancestor = v
      shift = (vim.prelim + sim) - (vip.prelim + sip) + distance
      if shift > 0:
        MOVE_SUBTREE(ANCESTOR(vim, v, defaultAncestor), v, shift)
        sip += shift
        sop += shift
      sim += vim.mod
      sip += vip.mod
      som += vom.mod
      sop += vop.mod
    if NEXT_RIGHT(vim) != nil and NEXT_RIGHT(vop) = nil:
      vop.thread = NEXT_RIGHT(vim)
      vop.mod += sim - sop
    if NEXT_LEFT(vip) != nil and NEXT_LEFT(vom) = nil:
      vom.thread = NEXT_LEFT(vip)
      vom.mod += sip - som
      defaultAncestor = v
  return defaultAncestor

EXECUTE_SHIFTS(v):
  shift = 0
  change = 0
  for each child w of v from right to left:
    w.prelim += shift
    w.mod += shift
    change += w.change
    shift += w.shift + change

NEXT_LEFT(v):
  if v has children: return leftmost child
  else: return v.thread

NEXT_RIGHT(v):
  if v has children: return rightmost child
  else: return v.thread

MOVE_SUBTREE(wm, wp, shift):
  subtrees = wp.number - wm.number  // Index dentro do parent
  wp.change -= shift / subtrees
  wp.shift += shift
  wm.change += shift / subtrees
  wp.prelim += shift
  wp.mod += shift

ANCESTOR(vim, v, defaultAncestor):
  if vim.ancestor is sibling of v: return vim.ancestor
  else: return defaultAncestor
```

**Nota**: o termo "número" (`wp.number`, `wm.number`) é o **índice
dentro dos children do pai**. Asignaranse no buildTrees.

### 5.7 — Distance fixed = 1.0

Buchheim require parámetro `distance` (separación mínima entre nodos
do mesmo nivel). **Usamos `distance = 1.0` no algoritmo interno**, e
multiplicamos por `nodeSpacing` no `transformPosition`. **Iso
separa** o algoritmo (lóxico) da escala visual (renderizable).

### 5.8 — DAG → árbore lóxica (primary parent)

**Algoritmo**:
```
para cada nodo N en treeDef.nodes:
  if levels[N] === 0:
    primaryParent[N] = null  // root
    continue
  
  prereqs = graph.getDependencies(N)  // pais directos
  
  // Buscar primero un prereq con level exactamente levels[N] - 1
  candidates = prereqs.filter(p => levels[p] === levels[N] - 1)
  
  // Se non hai (level skip raro), buscar o de menor level
  if candidates.length === 0:
    minLevel = min(levels[p] for p in prereqs)
    candidates = prereqs.filter(p => levels[p] === minLevel)
  
  // Desempate: primeiro candidato en orde de treeDef.nodes
  for each node in treeDef.nodes:
    if candidates.includes(node.id):
      primaryParent[N] = node.id
      break
```

**Determinismo**: a orde de aparición en treeDef.nodes garante mesma
saída entre execucións.

**Edges ignorados no layout pero visibles**: os outros prereqs de N
NON afectan o layout xerárquico, pero **os edges seguen no LayoutResult**
(igual que IdentityLayout/RadialLayout). O renderer (futuro) decidirá
como visualizalos.

### 5.9 — Múltiples roots

**Algoritmo**:
1. Para cada root, executar Buchheim independentemente. Cada un
   produce subárbore con bounds locais.
2. Shift horizontal acumulado: `xOffset += anchoSubárbore + nodeSpacing * 2`.

**Caso 1 root**: `xOffset = 0` ao principio; ningún shift adicional.

### 5.10 — Nodos illados como roots

**Tras BFS**: nodos sen prereqs nin sucesores quedan con level=0.
Trátanse como roots (árbore dun só nodo). **Cero acción especial**.

### 5.11 — Direccións: transformación post-cálculo

**Implementación**:
```ts
switch (direction) {
  case 'top-down':
    finalX = logicalX * nodeSpacing + centerX
    finalY = logicalY * levelSpacing + centerY
    break
  case 'bottom-up':
    finalX = logicalX * nodeSpacing + centerX
    finalY = -logicalY * levelSpacing + centerY  // Y invertido
    break
  case 'left-right':
    finalX = logicalY * levelSpacing + centerX  // Y_logical → X
    finalY = logicalX * nodeSpacing + centerY  // X_logical → Y
    break
  case 'right-left':
    finalX = -logicalY * levelSpacing + centerX  // Y invertido
    finalY = logicalX * nodeSpacing + centerY
    break
}
```

**Importante**: cada dirección preserva a topoloxía da árbore;
cambia só onde apunta o "centro" do nivel.

### 5.12 — Bounds

Calcular **min/max das posicións finais** (despois da transformación
de dirección + escalas + centro). **Cero consideración** doutros
elementos (cero polygon en TreeLayout).

### 5.13 — Cero `mesh` en LayoutResult

TreeLayout **NON xera mesh elements**. Omitir o campo `mesh` no
retorno (LayoutResult.mesh segue sendo opcional).

### 5.14 — Cero modificación de pezas existentes

**Cero modificación** de:
- IdentityLayout, RadialLayout, MeshGenerator (4.1, 4.2 intactas).
- LayoutEngine, LayoutEngineRegistry, computeLayout (4.1 intactas).
- LayoutResult.ts (4.2 final).
- DependencyGraph (reutilízase, cero modificación).
- TreeEngine, ProgressManager, schemas, NodeDef, TreeDef, etc.
- LayoutConfig en tree.ts (segue intacto da 4.1).

### 5.15 — Cero ErrorCodes novos

`LAYOUT_COMPUTE_FAILED` (YGG_L002) **reutilízase** para validación de
config. Cero novos.

### 5.16 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
export { TreeLayout } from './layouts/TreeLayout.js'
export type {
  TreeLayoutConfig,
  TreeDirection,
} from './layouts/TreeLayoutConfig.js'
export { parseTreeConfig } from './layouts/TreeLayoutConfig.js'
```

### 5.17 — Tests funcionais

Crear tres ficheiros de test en
`packages/core/__tests__/engine/layouts/`:

**`TreeLayoutConfig.test.ts`** (~10 tests):
1. parseTreeConfig con config válido: ok.
2. type !== 'tree': err.
3. direction inválido: err.
4. nodeSpacing <= 0 ou NaN: err.
5. levelSpacing <= 0 ou NaN: err.
6. centerX/centerY non-number se presentes: err.
7. Config con todos os defaults: aplica defaults.
8. Locale 'es' propaga mensaxe.
9. Locale 'en' propaga.
10. Config con 'left-right' e 'right-left': válidos.

**`TreeLayout.test.ts`** (~25 tests):

*Casos básicos:*
1. TreeDef baleiro: bounds (0,0,0,0).
2. 1 root só: posición no centro lóxico.
3. 1 root + 2 fillos: estrutura simétrica.
4. 1 root + 3 fillos: distribución uniforme.
5. Árbore profunda (4 niveles linear): nodos en columna.
6. Árbore ancha (1 root + 10 fillos): nodos en fila.

*Buchheim algorithm (tidy):*
7. Subárbores asimétricas: sen colisión (tidy property).
8. Diamond shape (A → B, A → C, B → D, C → D): D no nivel 2, primary
   parent = B (orde alfabética).
9. Linear chain (A → B → C → D → E): columna vertical.
10. Múltiples sub-árbores desbalanceadas: spacing correcto.

*DAG → tree:*
11. Nodo con 3 prereqs do mesmo level: primary parent = primeiro en
    orde treeDef.nodes.
12. Nodo con prereqs de levels diferentes: primary parent = de level
    máximo.
13. Edges NON utilizados no layout seguen visibles (todos os edges
    no LayoutResult).

*Direccións:*
14. 'top-down': X horizontal, Y crece cara abaixo.
15. 'bottom-up': X horizontal, Y crece cara arriba.
16. 'left-right': X crece cara dereita, Y vertical.
17. 'right-left': X crece cara esquerda, Y vertical.
18. Cada dirección preserva topoloxía (mesmos pais, fillos en mesmo
    nivel relativo).

*Múltiples roots:*
19. 2 roots con subárbores pequenas: separados horizontalmente.
20. 3 roots: shift acumulado.

*Configuración:*
21. nodeSpacing custom: distancia escalada.
22. levelSpacing custom: distancia entre niveis escalada.
23. centerX/centerY custom: tradúcese.

*Determinismo + edge cases:*
24. Mesma TreeDef dúas chamadas: mesmas posicións exactas.
25. Reordenar treeDef.nodes: cambia primary parent (e polo tanto
    posicións).

**`TreeLayout.integration.test.ts`** (~8 tests):
1. Rexistrar TreeLayout no LayoutEngineRegistry + computeLayout
   funciona.
2. TreeDef con layout.type='tree' usa TreeLayout.
3. Config inválido propaga err.
4. layoutType === 'tree' no resultado.
5. mesh é undefined no LayoutResult (TreeLayout non xera mesh).
6. Coexistencia con RadialLayout (4.2) e IdentityLayout (4.1) no mesmo
   registry.
7. Locale propaga.
8. Determinismo via computeLayout.

**Total: ~43 tests**.

### 5.18 — Cobertura

- `TreeLayoutConfig.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch.
- `TreeLayout.ts`: 100% Stmts/Funcs/Lines, **≥90% Branch** (Buchheim
  ten moitas ramas defensivas tipo `?? 0` que ev forzar con
  `noUncheckedIndexedAccess`). **Lección 3.5 L1 aplicable**.
- Global core: non baixar de baseline (98.15% post-4.2).

### 5.19 — Determinismo absoluto

**Determinismo é crítico** para Buchheim:
- Orde dos roots: orde de aparición en `treeDef.nodes` (filtrados a
  os que son root).
- Orde dos children dun nodo: orde de aparición en `treeDef.nodes`
  (filtrados aos que teñen este nodo como primary parent).
- Desempate en primary parent: orde en `treeDef.nodes`.

**Cero `Math.random()`**, **cero `Date.now()`**, **cero hashing**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/layouts/TreeLayout.ts` (NOVO)
- `packages/core/src/engine/layouts/TreeLayoutConfig.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +3 exports)

**Tests:**
- `packages/core/__tests__/engine/layouts/TreeLayoutConfig.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/TreeLayout.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/TreeLayout.integration.test.ts`
  (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1082 tests core + 60 common + 171 storage con `--force`.

2. **Verifica API de DependencyGraph** (xa coñecida de 4.2):
   ```
   grep -B1 -A3 "constructor\|getRoots\|getOutgoing\|getDependencies" \
     packages/core/src/engine/DependencyGraph.ts | head -20
   ```
   Confirma que `getDependencies(nodeId)` devolve **incoming** (os
   pais directos), non outgoing. **Crítico** para o cálculo de
   primary parent. Se difire, **ESCALAR**.

3. **Verifica patrón de exports en `packages/core/src/engine/index.ts`**.

4. **Verifica que MeshElement segue exportado** desde 4.2 (cero
   afectado por esta sub-fase).

### T1 — TreeLayoutConfig + parseTreeConfig (5.2 + 5.3)

Crear `packages/core/src/engine/layouts/TreeLayoutConfig.ts`.

Typecheck 20/20.

### T2 — Tests TreeLayoutConfig (5.17)

Crear `__tests__/engine/layouts/TreeLayoutConfig.test.ts` cos ~10
tests. Cobertura 100%.

### T3 — Buchheim: deseño do esqueleto (5.4 + 5.5)

Crear `packages/core/src/engine/layouts/TreeLayout.ts` con:
- Interface privada `TreeNode`.
- Clase `TreeLayout` que implementa `LayoutEngine`.
- Métodos privados esqueleto: `computeNodeLevels`,
  `computePrimaryParents`, `buildTrees`, `firstWalk`, `secondWalk`,
  `apportion`, `executeShifts`, `moveSubtree`, `nextLeft`,
  `nextRight`, `ancestor`, `transformPosition`, `computeEdges`,
  `computeBounds`, `forEachNode`.

Implementar primeiro **estructura + caso baleiro + caso 1 nodo**
para que typecheck pase. **NON implementar Buchheim aínda**.

Typecheck 20/20.

### T4 — Implementar `computeNodeLevels` + `computePrimaryParents` (5.8)

BFS estándar paralelo a RadialLayout. Tests indirectos vén despois.

### T5 — Implementar `buildTrees` (5.4)

Construír TreeNode por cada NodeDef, configurar children +
leftSibling + rightSibling + index dentro dos children do parent
(`number` para Buchheim).

### T6 — Implementar Buchheim (5.5 + 5.6)

Implementar **fielmente** o pseudo-código de 5.6:
- `firstWalk(v, distance)`.
- `secondWalk(v, m, level)`.
- `apportion(v, defaultAncestor, distance)`.
- `executeShifts(v)`.
- `moveSubtree(wm, wp, shift)`.
- `nextLeft(v)`, `nextRight(v)`.
- `ancestor(vim, v, defaultAncestor)`.

**Importante**: usar `distance = 1.0` (5.7). A escala vén despois.

**Calquera dúbida sobre o pseudo-código** → **ESCALAR**, NON inventar.

### T7 — Implementar shift de múltiples roots (5.9)

Tras Buchheim para cada root, calcular bounds locais e aplicar shift
acumulado.

### T8 — Implementar `transformPosition` (5.11)

4 direccións aplicadas como transformación final.

### T9 — Implementar `computeEdges` + `computeBounds` (5.12)

Liñas rectas + min/max das posicións.

### T10 — Tests TreeLayout (5.17)

Crear `__tests__/engine/layouts/TreeLayout.test.ts` cos ~25 tests.

### T11 — Tests integration (5.17)

Crear `__tests__/engine/layouts/TreeLayout.integration.test.ts` cos
~8 tests.

### T12 — Exportar dende engine/index.ts (5.16)

Engadir 3 exports.

### T13 — Verificación post-T12

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1082 tests previos seguen pasando intactos.
- 60 common intactos.
- 171 storage intactos.

### T14 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- TreeLayoutConfig.ts 100/≥95%/100/100.
- TreeLayout.ts 100/≥90%/100/100 (Buchheim ten ramas defensivas;
  5.18).
- Global core ≥98%.

### T15 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/layouts/TreeLayout.ts \
  packages/core/src/engine/layouts/TreeLayoutConfig.ts
pnpm test
```

**Nota sobre `unknown`**: cero esperado salvo en parseTreeConfig
(input loose).

- Changeset **minor** para `@yggdrasil-forge/core`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `TreeLayout` (LayoutEngine para type='tree'): implementa o
    algoritmo de Buchheim et al. 2002 (linear-time variante de
    Reingold-Tilford 1981).
  - `TreeLayoutConfig`, `TreeDirection` tipos exportados.
  - `parseTreeConfig(config, locale?)` helper validador.
  - 4 direccións soportadas: 'top-down', 'bottom-up', 'left-right',
    'right-left'.
  - DAG → árbore lóxica via "primary parent" (menor level BFS;
    desempate por orde en treeDef.nodes).

  ### Note
  - **Determinismo absoluto**: orde dos roots/children/desempates
    sempre por orde de aparición en treeDef.nodes.
  - Múltiples roots: cada un é unha árbore independente; colócanse
    horizontalmente con separación nodeSpacing*2.
  - Edges seguen visibles **todos** (incluído diamond DAGs). Só o
    layout xerárquico usa o primary parent.
  - TreeLayout cero xera mesh (LayoutResult.mesh undefined).
  ```

### T16 — Commit + push

Commit Conventional:
`feat(core): add TreeLayout with Buchheim algorithm (sub-phase 4.3)`.
Push directo a `origin/main` (base `b9eef4c`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/layouts/TreeLayout.ts` (NOVO)
- `packages/core/src/engine/layouts/TreeLayoutConfig.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +3 exports)
- `packages/core/__tests__/engine/layouts/TreeLayoutConfig.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/TreeLayout.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/TreeLayout.integration.test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/common/`.
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/src/engine/DependencyGraph.ts` (reutilízase).
- Outras pezas de layouts/ (IdentityLayout, RadialLayout, etc.)
  intactas.
- Tests existentes 4.1, 4.2 (cero modificación).
- TreeDef, NodeDef, LayoutConfig (5.14).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**Buchheim algorithm**: documentar **cada método privado con JSDoc
breve** referenciando ao paper Buchheim 2002. Cero comentarios
extensos do algoritmo (o pseudo-código de 5.6 vale como referencia
externa).

---

## 9. QUE NON FACER

- ❌ Usar Sugiyama / dot layered layout (5.5: usar Buchheim segundo
  decisión do autor).
- ❌ Usar Wetherell-Shannon ou Reingold-Tilford clásico O(n²)
  (decisión do autor: Buchheim full O(n)).
- ❌ Implementar nodos virtuais para diamonds (5.8: primary parent é a
  decisión do director).
- ❌ Engadir flag para escoller algoritmo (cero alternativas en 4.3).
- ❌ Implementar PathBuilder con curvas (4.5).
- ❌ Implementar BoundsCalculator con QuadTree (4.5).
- ❌ Engadir mesh elements (5.13: Tree non xera mesh).
- ❌ Modificar IdentityLayout, RadialLayout, MeshGenerator (5.14).
- ❌ Modificar DependencyGraph (5.14).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/`.
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes (5.15).
- ❌ Usar `NodeDef.position` no algoritmo (igual ca RadialLayout:
  ignorase).
- ❌ Cero `Math.random()`, `Date.now()`, ou hashing (5.19:
  determinismo absoluto).
- ❌ Crear ficheiros auxiliares (5.1: todo dentro de TreeLayout.ts).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 4.3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base b9eef4c)
✅ TreeLayout (type='tree') con algoritmo Buchheim 2002
✅ TreeLayoutConfig + TreeDirection tipos exportados
✅ parseTreeConfig validador (reutiliza LAYOUT_COMPUTE_FAILED)
✅ 4 direccións: top-down, bottom-up, left-right, right-left
✅ DAG → árbore lóxica via primary parent (menor level BFS)
✅ Múltiples roots: shift horizontal acumulado
✅ Determinismo absoluto: orde por treeDef.nodes
✅ Edges todos visibles (cero perda en DAGs)
✅ Cero mesh xerado (LayoutResult.mesh undefined)
✅ Cero modificación de pezas existentes (4.1, 4.2, DependencyGraph)
✅ Cero modificación de common/storage/tsconfig/tsup
✅ T0.2 DependencyGraph.getDependencies verificado: incoming (pais)
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> TreeLayoutConfig (validación)
   - <Y> TreeLayout (algoritmo + direccións + DAG)
   - <Z> TreeLayout.integration
✅ Cobertura:
   - TreeLayoutConfig 100/<X%>/100/100
   - TreeLayout 100/<X%>/100/100 (Branch ≥90% con defensivas;
     5.18)
   - Global core: <X%> (baseline 98.15%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - DAGs: só o primary parent (menor level) afecta o layout
     xerárquico. Os outros prereqs son visibles como edges pero NON
     na estrutura.
   - NodeDef.position ignorase totalmente (use 'custom' layout para
     posicións manuais).
   - Edges como liñas rectas (4.5 PathBuilder pode mellorar).
   - TreeLayout cero xera mesh.
✅ Changeset minor (core) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 4.4 (CustomLayout extended) ou outra que decida
o director.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 4.3. Algoritmo Buchheim O(n) lineal-time + 4
direccións + DAG manexo. Calquera dúbida sobre o pseudo-código →
ESCALAR, NON inventar.*
