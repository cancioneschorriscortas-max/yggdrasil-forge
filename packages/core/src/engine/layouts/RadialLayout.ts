// ── INICIO: RadialLayout ──
import { type Result, ok } from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import { DependencyGraph } from '../DependencyGraph.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'
import { generateMesh } from './MeshGenerator.js'
import { type RadialLayoutConfig, parseRadialConfig } from './RadialLayoutConfig.js'

/** Ángulo por defecto: "arriba" en coordenadas estándar. */
const DEFAULT_START_ANGLE = -Math.PI / 2

/**
 * Layout radial clásico. Distribúe nodos en niveles concéntricos
 * arredor dun centro, usando BFS desde os roots da DependencyGraph.
 *
 * Algoritmo:
 * 1. Construír DependencyGraph desde os nodos e edges do TreeDef.
 * 2. Identificar roots (nodos sen prerequisites).
 * 3. BFS multifrente desde roots → asignar profundidade mínima
 *    (`level`) a cada nodo.
 * 4. Para cada nivel:
 *    - 1 root: posición = (centerX, centerY); fillos no nivel 1.
 *    - N > 1 roots: distribúense no nivel 1 (raio = radius * 1).
 *      Os fillos van ao nivel 2 (raio = radius * 2). E así.
 *    - Sectores angulares iguais por nodo do nivel.
 * 5. Calcular posicións: x = centerX + r * cos(angle),
 *                         y = centerY + r * sin(angle).
 *
 * Sectores **iguais por nodo** (cero proporcional a número de
 * descendentes; DT-16 non bloqueante).
 *
 * Nodos illados (sen prereqs nin sucesores) trátanse como roots.
 *
 * **Ignora `NodeDef.position` totalmente**. Para posicións manuais,
 * use o layout 'custom' (IdentityLayout).
 *
 * Determinismo: orde dos nodos no nivel coincide coa orde de
 * aparición en `treeDef.nodes`.
 */
export class RadialLayout implements LayoutEngine {
  readonly type = 'radial'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    // 1. Validar config
    const configResult = parseRadialConfig(treeDef.layout)
    if (!configResult.ok) return configResult

    const config = configResult.value
    const centerX = config.centerX ?? 0
    const centerY = config.centerY ?? 0
    const startAngle = config.startAngle ?? DEFAULT_START_ANGLE
    const meshType = config.meshType ?? 'rings'

    // 2. Caso baleiro
    if (treeDef.nodes.length === 0) {
      return ok({
        nodes: new Map(),
        edges: new Map(),
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        layoutType: 'radial',
      })
    }

    // 3. Construír DependencyGraph
    const nodeIds = treeDef.nodes.map((n) => n.id)
    const graph = new DependencyGraph(nodeIds, treeDef.edges)

    // 4. BFS para determinar niveis
    const nodeLevels = this.computeNodeLevels(graph, treeDef)

    // Detectar se hai un só root
    const roots = graph.getRoots()
    const isSingleRoot = roots.length === 1

    // 5. Distribuír posicións angulamente
    const nodes = this.computePositions(
      treeDef,
      nodeLevels,
      config,
      centerX,
      centerY,
      startAngle,
      isSingleRoot,
    )

    // 6. Edges como liñas rectas
    const edges = this.computeEdges(treeDef, nodes)

    // 7. Bounds
    const bounds = this.computeBounds(nodes, config, centerX, centerY)

    // 8. Mesh elements
    const maxLevel = Math.max(...nodeLevels.values(), 0)
    const ringRadii: number[] = []
    // Single root: ring 1..maxLevel. Multi root: ring 1..(maxLevel+1) por shift visual.
    const maxRing = isSingleRoot ? maxLevel : maxLevel + 1
    for (let i = 1; i <= maxRing; i++) {
      ringRadii.push(config.radius * i)
    }
    const mesh = generateMesh(meshType, config, centerX, centerY, ringRadii, nodeLevels, startAngle)

    return ok({
      nodes,
      edges,
      bounds,
      layoutType: 'radial',
      ...(mesh.length > 0 ? { mesh } : {}),
    })
  }

  /**
   * BFS multifrente desde os roots. Asigna nivel mínimo (profundidade
   * BFS) a cada nodo. Nodos non alcanzables (illados sen edges)
   * reciben nivel 0 (trátanse como roots).
   */
  private computeNodeLevels(graph: DependencyGraph, treeDef: TreeDef): Map<string, number> {
    const levels = new Map<string, number>()
    const roots = graph.getRoots()

    // BFS
    const queue: string[] = []
    for (const root of roots) {
      levels.set(root, 0)
      queue.push(root)
    }

    let head = 0
    while (head < queue.length) {
      const current = queue[head]
      head++
      /* v8 ignore start -- defensivo: `head < queue.length` garante in-bounds. */
      if (current === undefined) continue
      /* v8 ignore stop */
      /* v8 ignore start -- defensivo: `current` foi enqueued con level definido. */
      const currentLevel = levels.get(current) ?? 0
      /* v8 ignore stop */
      const children = graph.getOutgoing(current)
      for (const child of children) {
        if (!levels.has(child)) {
          levels.set(child, currentLevel + 1)
          queue.push(child)
        }
      }
    }

    // Nodos non alcanzables → nivel 0 (roots illados)
    for (const node of treeDef.nodes) {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0)
      }
    }

    return levels
  }

  /**
   * Calcula posicións por nivel.
   *
   * - 1 root: root en (centerX, centerY); nivel N → raio N * radius.
   * - N > 1 roots: roots no nivel visual 1 (raio 1 * radius);
   *   nivel BFS N → raio (N + 1) * radius.
   *
   * Dentro de cada nivel, os nodos distribúense uniformemente en 2π
   * (sectores iguais). A orde é a de aparición en treeDef.nodes.
   */
  private computePositions(
    treeDef: TreeDef,
    nodeLevels: ReadonlyMap<string, number>,
    config: RadialLayoutConfig,
    centerX: number,
    centerY: number,
    startAngle: number,
    isSingleRoot: boolean,
  ): Map<string, Position> {
    // Agrupar nodos por nivel, mantendo a orde de treeDef.nodes
    const byLevel = new Map<number, string[]>()
    for (const node of treeDef.nodes) {
      /* v8 ignore start -- defensivo: nodeLevels poboado para todos os
         nodos no paso previo (computeNodeLevels). */
      const level = nodeLevels.get(node.id) ?? 0
      /* v8 ignore stop */
      const arr = byLevel.get(level)
      if (arr !== undefined) {
        arr.push(node.id)
      } else {
        byLevel.set(level, [node.id])
      }
    }

    const positions = new Map<string, Position>()

    for (const [level, nodeIds] of byLevel) {
      const r = this.ringRadius(level, isSingleRoot, config.radius)
      const count = nodeIds.length

      if (r === 0) {
        // Todos ao centro (1 root no nivel 0)
        for (const id of nodeIds) {
          positions.set(id, { x: centerX, y: centerY })
        }
      } else {
        for (let i = 0; i < count; i++) {
          const id = nodeIds[i]
          /* v8 ignore start -- defensivo: `i < count` garante in-bounds. */
          if (id === undefined) continue
          /* v8 ignore stop */
          const angle = startAngle + i * ((2 * Math.PI) / count)
          positions.set(id, {
            x: centerX + r * Math.cos(angle),
            y: centerY + r * Math.sin(angle),
          })
        }
      }
    }

    return positions
  }

  /**
   * Calcula o raio visual dun nivel BFS.
   *
   * - 1 root: nivel 0 → raio 0 (centro), nivel N → N * radius.
   * - N > 1 roots: nivel 0 → 1 * radius (shift visual +1),
   *   nivel N → (N + 1) * radius.
   */
  private ringRadius(level: number, isSingleRoot: boolean, radius: number): number {
    if (isSingleRoot) {
      return level * radius
    }
    return (level + 1) * radius
  }

  /** Calcula edges como liñas rectas entre source e target. */
  private computeEdges(
    treeDef: TreeDef,
    nodes: ReadonlyMap<string, Position>,
  ): Map<string, EdgePath> {
    const ZERO: Position = { x: 0, y: 0 }
    const edges = new Map<string, EdgePath>()
    for (const edge of treeDef.edges) {
      /* v8 ignore start -- defensivo: o RadialLayout coloca todos os nodos
         antes de chamar a computeEdges; o `?? ZERO` só dispara con trees
         malformadas. */
      const sourcePos = nodes.get(edge.source) ?? ZERO
      const targetPos = nodes.get(edge.target) ?? ZERO
      /* v8 ignore stop */
      edges.set(edge.id, { points: [sourcePos, targetPos] })
    }
    return edges
  }

  /**
   * Calcula bounds: min/max de posicións de nodos + vértices do
   * polígono perimetral se definido.
   */
  private computeBounds(
    nodes: ReadonlyMap<string, Position>,
    config: RadialLayoutConfig,
    centerX: number,
    centerY: number,
  ): Bounds {
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

    // Incluír vértices do polígono perimetral se definido
    if (config.polygon !== undefined) {
      const poly = config.polygon
      for (let i = 0; i < poly.sides; i++) {
        const angle = -Math.PI / 2 + i * ((2 * Math.PI) / poly.sides)
        const px = centerX + poly.radius * Math.cos(angle)
        const py = centerY + poly.radius * Math.sin(angle)
        if (px < minX) minX = px
        if (py < minY) minY = py
        if (px > maxX) maxX = px
        if (py > maxY) maxY = py
      }
    }

    return { minX, minY, maxX, maxY }
  }
}
// ── FIN: RadialLayout ──
