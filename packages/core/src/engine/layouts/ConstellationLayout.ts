// ── INICIO: ConstellationLayout (F-constellation) ──
import { type Result, ok } from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import { buildClusters } from './ClusterBuilder.js'
import { parseConstellationConfig } from './ConstellationConfig.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'

// Defaults aplicados en `compute` (non no parser).
const DEFAULT_INNER_RADIUS = 90
const DEFAULT_OUTER_RADIUS = 320
const DEFAULT_START_ANGLE = -Math.PI / 2
const DEFAULT_LENGTH_MODE = 'equal-span'
const DEFAULT_SHAPE = 'line'

/**
 * Layout `constellation`. Cada cluster é un **fío radial** saínte da
 * coroa: os membros enfilan ao longo del desde `innerRadius` ata
 * `outerRadius`. Enche o espazo radial → mata o "anel morto" de
 * `clustered-radial` en modo `list`.
 *
 * **Cero `NodeDef.position`**: o motor calcula todas as posicións. Para
 * posicións manuais, use o layout `'custom'` (IdentityLayout).
 *
 * **§13 (disciplina)**: na v1 só `shape: 'line'` está implementado.
 * `'curve'`/`'spiral'` son valores futuros (parser rexéitaos hoxe);
 * entrarán como ramas extra de cálculo sen reescribir o config.
 *
 * **Threading do fío**: este layout **só posiciona**. As liñas do fío
 * visible (root → m0 → m1 → … por cluster) constrúense desde os
 * `treeDef.edges` (topoloxía `chain` do consumidor, v5). `computeEdges`
 * faino tal cal como nos demais layouts radiais (paths rectos
 * source→target).
 *
 * Determinismo: clusters via `buildClusters` (mesma orde estable que
 * `ClusteredRadialLayout`). Orde de membros = orde en `treeDef.nodes`.
 */
export class ConstellationLayout implements LayoutEngine {
  readonly type = 'constellation'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    // 1. Config
    const parsed = parseConstellationConfig(treeDef.layout)
    if (!parsed.ok) return parsed
    const cfg = parsed.value
    const centerX = cfg.centerX ?? 0
    const centerY = cfg.centerY ?? 0
    const startAngle = cfg.startAngle ?? DEFAULT_START_ANGLE
    const innerRadius = cfg.innerRadius ?? DEFAULT_INNER_RADIUS
    const outerRadius = cfg.outerRadius ?? DEFAULT_OUTER_RADIUS
    const lengthMode = cfg.lengthMode ?? DEFAULT_LENGTH_MODE
    // shape: na v1 só 'line'. Lese para constancia; non hai branching
    // de cálculo aínda. As ramas curve/spiral chegarán en sub-fases.
    const _shape = cfg.shape ?? DEFAULT_SHAPE
    void _shape

    const center: Position = { x: centerX, y: centerY }
    const positions = new Map<string, Position>()

    // 2. Árbore baleira: devolve mínimo coherente (mesmo patrón ca
    //    ClusteredRadialLayout).
    if (treeDef.nodes.length === 0) {
      return ok({
        nodes: positions,
        edges: new Map(),
        bounds: this.computeBounds(positions),
        layoutType: 'constellation',
      })
    }

    // 3. Coroa (raíz) no centro
    const rootId = treeDef.rootNodeId
    const hasRoot = rootId !== undefined && treeDef.nodes.some((n) => n.id === rootId)
    if (hasRoot && rootId !== undefined) {
      positions.set(rootId, center)
    }

    // 4. Clusters (helper compartido)
    const clusters = buildClusters(treeDef, rootId)

    // 5. Posicionar cada fío
    const N = clusters.length
    if (N > 0) {
      // Para fixed-step: paso radial constante derivado do cluster máis
      // grande. Se Kmax === 1, todos os membros van ao innerRadius (paso
      // 0 = mesma posición).
      let kMax = 0
      for (const c of clusters) {
        if (c.memberIds.length > kMax) kMax = c.memberIds.length
      }
      const fixedStep = kMax <= 1 ? 0 : (outerRadius - innerRadius) / (kMax - 1)

      for (const [i, cluster] of clusters.entries()) {
        const theta = startAngle + i * ((2 * Math.PI) / N)
        const cosT = Math.cos(theta)
        const sinT = Math.sin(theta)
        const ids = cluster.memberIds
        const k = ids.length

        for (const [j, mid] of ids.entries()) {
          let r: number
          if (lengthMode === 'equal-span') {
            // Cada cluster vai sempre de innerRadius a outerRadius. O
            // cluster de 3 reparte os 3 puntos por todo o rango (máis
            // folgura entre puntos). k === 1 → único membro a innerRadius.
            r = k <= 1 ? innerRadius : innerRadius + ((outerRadius - innerRadius) * j) / (k - 1)
          } else {
            // fixed-step: paso constante. Cluster pequeno remata antes
            // de outerRadius (último r < outerRadius).
            r = innerRadius + j * fixedStep
          }
          positions.set(mid, {
            x: centerX + r * cosT,
            y: centerY + r * sinT,
          })
        }
      }
    }

    // 6. Edges desde treeDef.edges (paths rectos source→target). O fío
    //    visible vén das edges declaradas; o layout só posiciona.
    const edges = this.computeEdges(treeDef, positions)

    // 7. Bounds (min/max sobre nodos, patrón do proxecto)
    const bounds = this.computeBounds(positions)

    return ok({
      nodes: positions,
      edges,
      bounds,
      layoutType: 'constellation',
    })
  }

  /** Calca do mesmo helper privado dos demais layouts radiais. */
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

  /** Calca do mesmo helper privado dos demais layouts radiais. */
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
// ── FIN: ConstellationLayout ──
