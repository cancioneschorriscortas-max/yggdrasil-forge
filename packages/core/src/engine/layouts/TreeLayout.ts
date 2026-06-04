// ── INICIO: TreeLayout (Buchheim et al. 2002) ──
import { type Result, ok } from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import { DependencyGraph } from '../DependencyGraph.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'
import { type TreeDirection, parseTreeConfig } from './TreeLayoutConfig.js'

/**
 * Nodo interno para o algoritmo Buchheim. Cero exposición pública.
 * Buchheim 2002, §2: cada nodo mantén prelim, mod, thread, ancestor,
 * change, shift, e o índice dentro dos children do pai.
 */
interface TreeNode {
  readonly id: string
  readonly children: TreeNode[]
  parent: TreeNode | null
  leftSibling: TreeNode | null
  rightSibling: TreeNode | null
  /** Índice dentro dos children do pai (para moveSubtree). */
  number: number
  // Buchheim algorithm state:
  prelim: number
  mod: number
  thread: TreeNode | null
  ancestor: TreeNode
  change: number
  shift: number
  // Resultado final:
  x: number
  y: number
}

/**
 * Layout xerárquico clásico (Diablo, WoW talents).
 *
 * Implementa o algoritmo de **Buchheim et al. 2002** (linear-time
 * variante do Reingold-Tilford 1981). Soporta 4 direccións via
 * transformación post-cálculo. Para DAGs (nodo con múltiples prereqs),
 * cada nodo elixe un "primary parent" (menor level BFS; desempate
 * por orde en treeDef.nodes).
 *
 * **Ignora `NodeDef.position` totalmente**. Para posicións manuais,
 * use o layout `'custom'` (IdentityLayout).
 *
 * **Determinismo absoluto**: orde de roots, children e desempates
 * sempre por orde de aparición en `treeDef.nodes`. Cero
 * `Math.random()`, cero `Date.now()`.
 */
export class TreeLayout implements LayoutEngine {
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

    // 3. BFS para determinar niveis
    const graph = new DependencyGraph(
      treeDef.nodes.map((n) => n.id),
      treeDef.edges,
    )
    const nodeLevels = this.computeNodeLevels(graph, treeDef)

    // 4. Primary parent de cada nodo
    const primaryParent = this.computePrimaryParents(graph, treeDef, nodeLevels)

    // 5. Construír árbores lóxicas
    const { roots, nodesById } = this.buildTrees(treeDef, primaryParent, nodeLevels)

    // 6. Para cada root, executar Buchheim
    const rootResults: Array<{
      root: TreeNode
      bounds: { minX: number; maxX: number }
    }> = []
    for (const root of roots) {
      this.firstWalk(root, 1.0)
      this.secondWalk(root, -root.prelim, 0)

      // Calcular bounds locais
      let minX = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      this.forEachNode(root, (n) => {
        if (n.x < minX) minX = n.x
        if (n.x > maxX) maxX = n.x
      })
      rootResults.push({ root, bounds: { minX, maxX } })
    }

    // 7. Shift múltiples roots horizontalmente
    let xOffset = 0
    for (const { root, bounds } of rootResults) {
      const localShift = xOffset - bounds.minX
      this.forEachNode(root, (n) => {
        n.x += localShift
      })
      xOffset += bounds.maxX - bounds.minX + nodeSpacing * 2
    }

    // 8. Transformación de dirección + escalas + centro
    const nodes = new Map<string, Position>()
    for (const treeNode of nodesById.values()) {
      nodes.set(
        treeNode.id,
        this.transformPosition(
          treeNode.x,
          treeNode.y,
          direction,
          nodeSpacing,
          levelSpacing,
          centerX,
          centerY,
        ),
      )
    }

    // 9. Edges como liñas rectas
    const edges = this.computeEdges(treeDef, nodes)

    // 10. Bounds
    const bounds = this.computeBounds(nodes)

    return ok({ nodes, edges, bounds, layoutType: 'tree' })
  }

  // ─── BFS + primary parent ───

  /**
   * BFS multifronte desde roots. Asigna nivel mínimo a cada nodo.
   * Nodos non alcanzables reciben nivel 0 (roots illados).
   */
  private computeNodeLevels(graph: DependencyGraph, treeDef: TreeDef): Map<string, number> {
    const levels = new Map<string, number>()
    const roots = graph.getRoots()
    const queue: string[] = []

    for (const root of roots) {
      levels.set(root, 0)
      queue.push(root)
    }

    let head = 0
    while (head < queue.length) {
      const current = queue[head]
      head++
      if (current === undefined) continue
      const currentLevel = levels.get(current) ?? 0
      for (const child of graph.getOutgoing(current)) {
        if (!levels.has(child)) {
          levels.set(child, currentLevel + 1)
          queue.push(child)
        }
      }
    }

    // Nodos non alcanzables → nivel 0
    for (const node of treeDef.nodes) {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0)
      }
    }

    return levels
  }

  /**
   * Calcula o primary parent de cada nodo. §5.8 do briefing.
   * Para cada nodo con level > 0, elixe un prereq cuxo level sexa
   * exactamente level-1; desempate por orde en treeDef.nodes.
   */
  private computePrimaryParents(
    graph: DependencyGraph,
    treeDef: TreeDef,
    levels: ReadonlyMap<string, number>,
  ): Map<string, string | null> {
    // Mapa de id → índice en treeDef.nodes (para desempate)
    const nodeOrder = new Map<string, number>()
    for (let i = 0; i < treeDef.nodes.length; i++) {
      const n = treeDef.nodes[i]
      if (n !== undefined) nodeOrder.set(n.id, i)
    }

    const primaryParent = new Map<string, string | null>()

    for (const node of treeDef.nodes) {
      const level = levels.get(node.id) ?? 0
      if (level === 0) {
        primaryParent.set(node.id, null)
        continue
      }

      const deps = graph.getDependencies(node.id)
      // Buscar prereqs con level exactamente level - 1
      let candidates = deps.filter((p) => (levels.get(p) ?? 0) === level - 1)

      // Se non hai (level skip), buscar o de menor level
      if (candidates.length === 0) {
        let minLevel = Number.POSITIVE_INFINITY
        for (const p of deps) {
          const pl = levels.get(p) ?? 0
          if (pl < minLevel) minLevel = pl
        }
        candidates = deps.filter((p) => (levels.get(p) ?? 0) === minLevel)
      }

      // Desempate: primeiro candidato por orde en treeDef.nodes
      if (candidates.length === 0) {
        primaryParent.set(node.id, null)
        continue
      }

      candidates.sort((a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0))
      primaryParent.set(node.id, candidates[0] ?? null)
    }

    return primaryParent
  }

  // ─── Build trees ───

  /**
   * Constrúe TreeNode por cada NodeDef. Configura children +
   * leftSibling + rightSibling. Children en orde de aparición en
   * treeDef.nodes.
   */
  private buildTrees(
    treeDef: TreeDef,
    primaryParent: ReadonlyMap<string, string | null>,
    levels: ReadonlyMap<string, number>,
  ): { roots: TreeNode[]; nodesById: Map<string, TreeNode> } {
    // Crear TreeNode para cada nodo
    const nodesById = new Map<string, TreeNode>()
    for (const node of treeDef.nodes) {
      const tn: TreeNode = {
        id: node.id,
        children: [],
        parent: null,
        leftSibling: null,
        rightSibling: null,
        number: 0,
        prelim: 0,
        mod: 0,
        thread: null,
        ancestor: null as unknown as TreeNode, // Asignarase abaixo
        change: 0,
        shift: 0,
        x: 0,
        y: levels.get(node.id) ?? 0,
      }
      tn.ancestor = tn // Default ancestor = propio nodo
      nodesById.set(node.id, tn)
    }

    // Configurar parent + children (en orde treeDef.nodes)
    for (const node of treeDef.nodes) {
      const parentId = primaryParent.get(node.id)
      if (parentId === null || parentId === undefined) continue
      const parentNode = nodesById.get(parentId)
      const childNode = nodesById.get(node.id)
      if (parentNode === undefined || childNode === undefined) continue
      childNode.parent = parentNode
      parentNode.children.push(childNode)
    }

    // Configurar leftSibling, rightSibling e number
    for (const tn of nodesById.values()) {
      for (let i = 0; i < tn.children.length; i++) {
        const child = tn.children[i]
        if (child === undefined) continue
        child.number = i
        if (i > 0) {
          child.leftSibling = tn.children[i - 1] ?? null
        }
        if (i < tn.children.length - 1) {
          child.rightSibling = tn.children[i + 1] ?? null
        }
      }
    }

    // Roots = nodos sen parent, en orde treeDef.nodes
    const roots: TreeNode[] = []
    for (const node of treeDef.nodes) {
      const tn = nodesById.get(node.id)
      if (tn !== undefined && tn.parent === null) {
        roots.push(tn)
      }
    }

    return { roots, nodesById }
  }

  // ─── Buchheim et al. 2002 ───

  /**
   * Buchheim FIRST WALK (post-order traversal).
   * Ref: Buchheim 2002, Algorithm 1.
   */
  private firstWalk(v: TreeNode, distance: number): void {
    if (v.children.length === 0) {
      // Folla
      if (v.leftSibling !== null) {
        v.prelim = v.leftSibling.prelim + distance
      } else {
        v.prelim = 0
      }
    } else {
      let defaultAncestor = v.children[0]
      if (defaultAncestor === undefined) return
      for (const w of v.children) {
        this.firstWalk(w, distance)
        defaultAncestor = this.apportion(w, defaultAncestor, distance)
      }
      this.executeShifts(v)
      const leftmost = v.children[0]
      const rightmost = v.children[v.children.length - 1]
      if (leftmost === undefined || rightmost === undefined) return
      const midpoint = (leftmost.prelim + rightmost.prelim) / 2
      if (v.leftSibling !== null) {
        v.prelim = v.leftSibling.prelim + distance
        v.mod = v.prelim - midpoint
      } else {
        v.prelim = midpoint
      }
    }
  }

  /**
   * Buchheim SECOND WALK (pre-order traversal).
   * Ref: Buchheim 2002, Algorithm 2.
   */
  private secondWalk(v: TreeNode, m: number, level: number): void {
    v.x = v.prelim + m
    v.y = level
    for (const w of v.children) {
      this.secondWalk(w, m + v.mod, level + 1)
    }
  }

  /**
   * Buchheim APPORTION: resolve conflitos entre subárbores adxacentes.
   * Ref: Buchheim 2002, Algorithm 3.
   */
  private apportion(v: TreeNode, defaultAncestorParam: TreeNode, distance: number): TreeNode {
    if (v.leftSibling === null) return defaultAncestorParam

    let defaultAncestor = defaultAncestorParam

    let vip: TreeNode | null = v
    let vop: TreeNode | null = v
    let vim: TreeNode | null = v.leftSibling
    let vom: TreeNode | null =
      v.parent !== null && v.parent.children.length > 0 ? (v.parent.children[0] ?? null) : null

    let sip = vip.mod
    let sop = vop.mod
    let sim = vim.mod
    let som = vom?.mod ?? 0

    while (this.nextRight(vim) !== null && this.nextLeft(vip) !== null) {
      vim = this.nextRight(vim)
      vip = this.nextLeft(vip)
      vom = this.nextLeft(vom)
      vop = this.nextRight(vop)
      if (vop !== null) {
        vop.ancestor = v
      }
      const shift = (vim?.prelim ?? 0) + sim - ((vip?.prelim ?? 0) + sip) + distance
      if (shift > 0) {
        this.moveSubtree(this.ancestor(vim, v, defaultAncestor), v, shift)
        sip += shift
        sop += shift
      }
      sim += vim?.mod ?? 0
      sip += vip?.mod ?? 0
      som += vom?.mod ?? 0
      sop += vop?.mod ?? 0
    }

    if (this.nextRight(vim) !== null && this.nextRight(vop) === null) {
      if (vop !== null) {
        vop.thread = this.nextRight(vim)
        vop.mod += sim - sop
      }
    }
    if (this.nextLeft(vip) !== null && this.nextLeft(vom) === null) {
      if (vom !== null) {
        vom.thread = this.nextLeft(vip)
        vom.mod += sip - som
      }
      defaultAncestor = v
    }

    return defaultAncestor
  }

  /**
   * Buchheim EXECUTE_SHIFTS: aplica shifts agregados.
   * Ref: Buchheim 2002, §2.
   */
  private executeShifts(v: TreeNode): void {
    let shift = 0
    let change = 0
    for (let i = v.children.length - 1; i >= 0; i--) {
      const w = v.children[i]
      if (w === undefined) continue
      w.prelim += shift
      w.mod += shift
      change += w.change
      shift += w.shift + change
    }
  }

  /**
   * Buchheim MOVE_SUBTREE: move subárbore wp cara a dereita.
   * Ref: Buchheim 2002, §2.
   */
  private moveSubtree(wm: TreeNode, wp: TreeNode, shift: number): void {
    const subtrees = wp.number - wm.number
    if (subtrees <= 0) return
    wp.change -= shift / subtrees
    wp.shift += shift
    wm.change += shift / subtrees
    wp.prelim += shift
    wp.mod += shift
  }

  /**
   * Buchheim NEXT_LEFT: contorno esquerdo.
   * Ref: Buchheim 2002, §2.
   */
  private nextLeft(v: TreeNode | null): TreeNode | null {
    if (v === null) return null
    if (v.children.length > 0) return v.children[0] ?? null
    return v.thread
  }

  /**
   * Buchheim NEXT_RIGHT: contorno dereito.
   * Ref: Buchheim 2002, §2.
   */
  private nextRight(v: TreeNode | null): TreeNode | null {
    if (v === null) return null
    if (v.children.length > 0) {
      return v.children[v.children.length - 1] ?? null
    }
    return v.thread
  }

  /**
   * Buchheim ANCESTOR: determina o ancestor correcto para apportion.
   * Ref: Buchheim 2002, §2.
   */
  private ancestor(vim: TreeNode | null, v: TreeNode, defaultAncestor: TreeNode): TreeNode {
    if (vim === null) return defaultAncestor
    // vim.ancestor é irmán de v se comparten parent
    if (vim.ancestor.parent === v.parent) {
      return vim.ancestor
    }
    return defaultAncestor
  }

  // ─── Transformación + edges + bounds ───

  /**
   * Transforma coordenadas lóxicas (x, y) a posicións finais
   * segundo a dirección configurada. §5.11 do briefing.
   */
  private transformPosition(
    x: number,
    y: number,
    direction: TreeDirection,
    nodeSpacing: number,
    levelSpacing: number,
    centerX: number,
    centerY: number,
  ): Position {
    switch (direction) {
      case 'top-down':
        return {
          x: x * nodeSpacing + centerX,
          y: y * levelSpacing + centerY,
        }
      case 'bottom-up':
        return {
          x: x * nodeSpacing + centerX,
          y: -y * levelSpacing + centerY,
        }
      case 'left-right':
        return {
          x: y * levelSpacing + centerX,
          y: x * nodeSpacing + centerY,
        }
      case 'right-left':
        return {
          x: -y * levelSpacing + centerX,
          y: x * nodeSpacing + centerY,
        }
    }
  }

  /** Calcula edges como liñas rectas entre source e target. */
  private computeEdges(
    treeDef: TreeDef,
    nodes: ReadonlyMap<string, Position>,
  ): Map<string, EdgePath> {
    const ZERO: Position = { x: 0, y: 0 }
    const edges = new Map<string, EdgePath>()
    for (const edge of treeDef.edges) {
      const sourcePos = nodes.get(edge.source) ?? ZERO
      const targetPos = nodes.get(edge.target) ?? ZERO
      edges.set(edge.id, { points: [sourcePos, targetPos] })
    }
    return edges
  }

  /** Calcula bounds: min/max das posicións finais. */
  private computeBounds(nodes: ReadonlyMap<string, Position>): Bounds {
    if (nodes.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const pos of nodes.values()) {
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x > maxX) maxX = pos.x
      if (pos.y > maxY) maxY = pos.y
    }
    return { minX, minY, maxX, maxY }
  }

  /** Percorre todos os nodos dunha subárbore (pre-order). */
  private forEachNode(root: TreeNode, fn: (n: TreeNode) => void): void {
    fn(root)
    for (const child of root.children) {
      this.forEachNode(child, fn)
    }
  }
}
// ── FIN: TreeLayout (Buchheim et al. 2002) ──
