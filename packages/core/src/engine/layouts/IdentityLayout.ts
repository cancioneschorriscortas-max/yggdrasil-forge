// ── INICIO: IdentityLayout ──
import { type Result, ok } from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'

const ZERO_POSITION: Position = { x: 0, y: 0 }

/**
 * Layout trivial que copia as posicións declaradas en `NodeDef.position`.
 * Se un nodo non ten posición, asigna (0, 0).
 *
 * Para edges, calcula path coma liña recta entre as posicións de
 * source e target.
 *
 * Para bounds, calcula min/max de tódalas posicións de nodos. TreeDef
 * baleiro produce bounds (0, 0, 0, 0).
 *
 * Rexistrase baixo `type: 'custom'` segundo MASTER §20. Sub-fase 4.4
 * (CustomLayout) ampliará esta peza con funcionalidade adicional se
 * procede; IdentityLayout serve como caso base.
 */
export class IdentityLayout implements LayoutEngine {
  readonly type = 'custom'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    const nodes = new Map<string, Position>()
    for (const node of treeDef.nodes) {
      nodes.set(node.id, node.position ?? ZERO_POSITION)
    }

    const edges = new Map<string, EdgePath>()
    for (const edge of treeDef.edges) {
      const sourcePos = nodes.get(edge.source) ?? ZERO_POSITION
      const targetPos = nodes.get(edge.target) ?? ZERO_POSITION
      edges.set(edge.id, { points: [sourcePos, targetPos] })
    }

    const bounds = this.computeBounds(nodes)

    return ok({
      nodes,
      edges,
      bounds,
      layoutType: this.type,
    })
  }

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
}
// ── FIN: IdentityLayout ──
