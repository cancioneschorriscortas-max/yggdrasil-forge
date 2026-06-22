// ── INICIO: QuadTree ──
import type { Position } from '../../types/node.js'
import type { Bounds, LayoutResult } from './LayoutResult.js'

/**
 * Opcións para construír un QuadTree.
 *
 * - `maxDepth`: profundidade máxima. Default 8.
 * - `maxPointsPerNode`: límite antes de subdividir. Default 4.
 * - `extent`: bounds iniciais. Se omitido, auto-calcúlase.
 */
export interface QuadTreeOptions {
  readonly maxDepth?: number
  readonly maxPointsPerNode?: number
  readonly extent?: Bounds
}

/** Nodo interno do QuadTree. Cero exposición pública. */
interface QuadNode {
  bounds: Bounds
  points: Array<{ id: string; position: Position }>
  children: QuadNode[] | null // [NW, NE, SW, SE]
  depth: number
}

/**
 * Spatial index recursivo bidimensional para range queries e
 * nearest neighbor sobre nodos dun LayoutResult.
 *
 * Subdivisión recursiva en 4 cuadrantes (NW, NE, SW, SE).
 * Nodos internos gardan 0 puntos; follas gardan ata
 * `maxPointsPerNode` puntos.
 *
 * Para uso futuro: `useVisibleNodes(engine, viewport)` (Fase 7).
 * Algoritmo paralelo a d3-quadtree (cero dependencia externa).
 */
export class QuadTree {
  private readonly root: QuadNode
  private readonly maxDepth: number
  private readonly maxPointsPerNode: number
  private nodeCount: number

  /**
   * Constrúe un QuadTree desde un Map de posicións.
   */
  constructor(points: ReadonlyMap<string, Position>, options: QuadTreeOptions = {}) {
    this.maxDepth = options.maxDepth ?? 8
    this.maxPointsPerNode = options.maxPointsPerNode ?? 4
    this.nodeCount = 0

    const extent = options.extent ?? this.computeExtent(points)
    this.root = {
      bounds: extent,
      points: [],
      children: null,
      depth: 0,
    }

    for (const [id, position] of points) {
      this.insert(this.root, id, position)
      this.nodeCount++
    }
  }

  /**
   * Constrúe un QuadTree desde un LayoutResult.
   */
  static fromLayoutResult(layoutResult: LayoutResult, options?: QuadTreeOptions): QuadTree {
    return new QuadTree(layoutResult.nodes, options)
  }

  /**
   * Devolve os nodeIds dentro do `bounds` (rectangle query, inclusive).
   */
  queryRange(bounds: Bounds): readonly string[] {
    const results: string[] = []
    this.queryRangeInternal(this.root, bounds, results)
    return results
  }

  /**
   * Devolve o nodeId máis preto ao punto (Euclidean distance).
   * Devolve undefined se o quadtree está baleiro.
   */
  queryNearest(point: Position): string | undefined {
    if (this.nodeCount === 0) return undefined
    const best = { id: undefined as string | undefined, distance: Number.POSITIVE_INFINITY }
    this.queryNearestInternal(this.root, point, best)
    return best.id
  }

  /** Conta de puntos almacenados. */
  size(): number {
    return this.nodeCount
  }

  // ─── Privados: inserción ───

  private insert(node: QuadNode, id: string, position: Position): void {
    if (node.children === null) {
      // É folla
      node.points.push({ id, position })
      if (node.points.length > this.maxPointsPerNode && node.depth < this.maxDepth) {
        this.subdivide(node)
      }
    } else {
      // É interno
      const childIndex = this.whichChild(node, position)
      const child = node.children[childIndex]
      /* v8 ignore start -- defensivo: whichChild devolve sempre 0..3 e
         children é unha tupla de 4 elementos; child sempre está definido.
         Guarda esixida por noUncheckedIndexedAccess. */
      if (child !== undefined) {
        this.insert(child, id, position)
      }
      /* v8 ignore stop */
    }
  }

  private subdivide(node: QuadNode): void {
    const midX = (node.bounds.minX + node.bounds.maxX) / 2
    const midY = (node.bounds.minY + node.bounds.maxY) / 2
    const d = node.depth + 1

    node.children = [
      // NW
      {
        bounds: {
          minX: node.bounds.minX,
          minY: node.bounds.minY,
          maxX: midX,
          maxY: midY,
        },
        points: [],
        children: null,
        depth: d,
      },
      // NE
      {
        bounds: {
          minX: midX,
          minY: node.bounds.minY,
          maxX: node.bounds.maxX,
          maxY: midY,
        },
        points: [],
        children: null,
        depth: d,
      },
      // SW
      {
        bounds: {
          minX: node.bounds.minX,
          minY: midY,
          maxX: midX,
          maxY: node.bounds.maxY,
        },
        points: [],
        children: null,
        depth: d,
      },
      // SE
      {
        bounds: {
          minX: midX,
          minY: midY,
          maxX: node.bounds.maxX,
          maxY: node.bounds.maxY,
        },
        points: [],
        children: null,
        depth: d,
      },
    ]

    // Redistribuír puntos existentes
    for (const p of node.points) {
      const childIndex = this.whichChild(node, p.position)
      const child = node.children[childIndex]
      /* v8 ignore start -- defensivo: igual ca insert; whichChild devolve
         sempre un índice válido para a tupla de 4 children. */
      if (child !== undefined) {
        this.insert(child, p.id, p.position)
      }
      /* v8 ignore stop */
    }
    node.points = []
  }

  private whichChild(node: QuadNode, position: Position): number {
    const midX = (node.bounds.minX + node.bounds.maxX) / 2
    const midY = (node.bounds.minY + node.bounds.maxY) / 2
    if (position.x < midX) {
      return position.y < midY ? 0 : 2 // NW : SW
    }
    return position.y < midY ? 1 : 3 // NE : SE
  }

  // ─── Privados: range query ───

  private queryRangeInternal(node: QuadNode, queryBounds: Bounds, results: string[]): void {
    if (!this.intersects(node.bounds, queryBounds)) return

    if (node.children === null) {
      for (const p of node.points) {
        if (this.contains(queryBounds, p.position)) {
          results.push(p.id)
        }
      }
    } else {
      for (const child of node.children) {
        this.queryRangeInternal(child, queryBounds, results)
      }
    }
  }

  // ─── Privados: nearest neighbor ───

  private queryNearestInternal(
    node: QuadNode,
    point: Position,
    best: { id: string | undefined; distance: number },
  ): void {
    if (best.distance > 0 && this.minDistance(node.bounds, point) > best.distance) {
      return // prune
    }

    if (node.children === null) {
      for (const p of node.points) {
        const d = this.euclidean(p.position, point)
        if (d < best.distance) {
          best.distance = d
          best.id = p.id
        }
      }
    } else {
      // Visitar children en orde por proximidade
      const sorted = [...node.children].sort(
        (a, b) => this.minDistance(a.bounds, point) - this.minDistance(b.bounds, point),
      )
      for (const child of sorted) {
        this.queryNearestInternal(child, point, best)
      }
    }
  }

  // ─── Privados: xeometría ───

  private intersects(b1: Bounds, b2: Bounds): boolean {
    return !(b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY)
  }

  private contains(bounds: Bounds, position: Position): boolean {
    return (
      position.x >= bounds.minX &&
      position.x <= bounds.maxX &&
      position.y >= bounds.minY &&
      position.y <= bounds.maxY
    )
  }

  private minDistance(bounds: Bounds, point: Position): number {
    const dx = Math.max(0, Math.max(bounds.minX - point.x, point.x - bounds.maxX))
    const dy = Math.max(0, Math.max(bounds.minY - point.y, point.y - bounds.maxY))
    return Math.sqrt(dx * dx + dy * dy)
  }

  private euclidean(p1: Position, p2: Position): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
  }

  private computeExtent(points: ReadonlyMap<string, Position>): Bounds {
    if (points.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const pos of points.values()) {
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x > maxX) maxX = pos.x
      if (pos.y > maxY) maxY = pos.y
    }
    const pad = Math.max((maxX - minX) * 0.001, 0.001)
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    }
  }
}
// ── FIN: QuadTree ──
