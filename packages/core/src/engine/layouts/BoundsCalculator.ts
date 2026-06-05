// ── INICIO: BoundsCalculator ──
import type { Bounds, LayoutResult, MeshElement } from './LayoutResult.js'

/**
 * Opcións para BoundsCalculator.
 *
 * - `padding`: cantidade engadida a cada lado. Default 0.
 * - `paddingPerNode`: callback que devolve padding para cada nodeId.
 *   Sobrescribe `padding` para nodos onde devolve un número.
 * - `includesMesh`: se true, inclúe mesh no cálculo. Default true.
 * - `includesEdges`: se true, inclúe puntos intermedios de edges
 *   curvos. Default true.
 */
export interface BoundsCalculatorOptions {
  readonly padding?: number
  readonly paddingPerNode?: (nodeId: string) => number | undefined
  readonly includesMesh?: boolean
  readonly includesEdges?: boolean
}

/**
 * Calcula bounds máis sofisticados que o min/max trivial dos nodos.
 * Función pura. Cero modificación do LayoutResult.
 */
export function computeBounds(
  layoutResult: LayoutResult,
  options: BoundsCalculatorOptions = {},
): Bounds {
  const padding = options.padding ?? 0
  const paddingPerNode = options.paddingPerNode
  const includesMesh = options.includesMesh ?? true
  const includesEdges = options.includesEdges ?? true

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

  // Mesh.
  if (includesMesh && layoutResult.mesh !== undefined) {
    for (const element of layoutResult.mesh) {
      const eb = computeMeshElementBounds(element)
      if (eb.minX < minX) minX = eb.minX
      if (eb.minY < minY) minY = eb.minY
      if (eb.maxX > maxX) maxX = eb.maxX
      if (eb.maxY > maxY) maxY = eb.maxY
    }
  }

  // Edges.
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

/** Calcula bounds dun MeshElement individual. */
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
// ── FIN: BoundsCalculator ──
