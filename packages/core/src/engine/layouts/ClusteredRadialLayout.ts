// ── INICIO: ClusteredRadialLayout (F11.2a — base común) ──
import { type Result, ok } from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import { parseClusteredRadialConfig } from './ClusteredRadialConfig.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult, MeshElement } from './LayoutResult.js'

const DEFAULT_START_ANGLE = -Math.PI / 2
const DEFAULT_ORBIT_RATIO = 0.45
/**
 * Abano placeholder en radiáns ao colocar os membros dun grupo
 * arredor do seu punto-de-grupo. 2a é só a BASE; este valor é
 * suficientemente aberto para que se vexan separados, pero pequeno
 * dabondo para non solaparse con grupos veciños cando hai 5 grupos.
 * As variantes `list`/`cluster` (2b) substituirán esta colocación.
 */
const DEFAULT_MEMBER_ARC = 2.2
/**
 * Separación vertical por defecto entre membros consecutivos en modo
 * `memberLayout: 'list'`. Pensada para etiquetas lexibles unha sobre
 * outra (≈ liña + marxe). Sobrescríbese co campo `rowGap` no config.
 */
const DEFAULT_ROW_GAP = 64

interface Cluster {
  readonly id: string
  readonly memberIds: readonly string[]
}

/**
 * Layout `clustered-radial` (F11.2a — base común).
 *
 * Coloca a raíz no centro, os grupos en radial uniforme arredor dela,
 * e os membros de cada grupo nun abano placeholder cara afóra arredor
 * do seu punto-de-grupo. Xera mesh `spokes` centro→grupo por defecto
 * (representa o esqueleto da estrela cando non hai edges semánticos
 * entre raíz e grupos — caso panadeiro).
 *
 * **Cero `NodeDef.position`**: o motor calcula todas as posicións. Para
 * posicións manuais, use o layout `'custom'` (IdentityLayout).
 *
 * **Esta versión (2a) é só o esqueleto de posicionamento.** As
 * variantes intra-grupo (`memberLayout: 'list' | 'cluster'`) e a áncora
 * real (`anchorNodeId`) virán en 2b/2c sen tocar este motor: engadirán
 * ramas de colocación con campos opcionais novos no config.
 *
 * Determinismo: orde dos membros nun cluster = orde de aparición en
 * `treeDef.nodes`; orde dos clusters = orde de `treeDef.groups`,
 * seguido dun cluster implícito `__ungrouped__` ao final se hai
 * nodos non-raíz sen grupo asignado.
 */
export class ClusteredRadialLayout implements LayoutEngine {
  readonly type = 'clustered-radial'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    // 1. Config
    const parsed = parseClusteredRadialConfig(treeDef.layout)
    if (!parsed.ok) return parsed
    const cfg = parsed.value
    const centerX = cfg.centerX ?? 0
    const centerY = cfg.centerY ?? 0
    const startAngle = cfg.startAngle ?? DEFAULT_START_ANGLE
    const groupRadius = cfg.groupRadius
    const orbitRadius = cfg.orbitRadius ?? groupRadius * DEFAULT_ORBIT_RATIO
    const meshType = cfg.meshType ?? 'spokes'
    const memberLayout = cfg.memberLayout ?? 'fan'
    const rowGap = cfg.rowGap ?? DEFAULT_ROW_GAP
    const centerClearance = cfg.centerClearance ?? rowGap
    const center: Position = { x: centerX, y: centerY }

    const positions = new Map<string, Position>()
    const mesh: MeshElement[] = []

    // 2. Árbore baleira: devolve directamente. computeBounds tamén
    //    sabe manexar un Map baleiro, pero saltamos o resto do
    //    pipeline (sen clusters nin mesh) para optimizar.
    if (treeDef.nodes.length === 0) {
      return ok({
        nodes: positions,
        edges: new Map(),
        bounds: this.computeBounds(positions),
        layoutType: 'clustered-radial',
      })
    }

    // 3. Raíz no centro (se existe e é nodo real)
    const rootId = treeDef.rootNodeId
    const hasRoot = rootId !== undefined && treeDef.nodes.some((n) => n.id === rootId)
    if (hasRoot && rootId !== undefined) {
      positions.set(rootId, center)
    }

    // 4. Constrúe clusters (un por GroupDef + un implícito para os
    //    non-agrupados). Excluímos a raíz; non se asigna a ningún cluster.
    const clusters = this.buildClusters(treeDef, rootId)

    // 4b. Anti-colisión: en modo 'list', auto-expande effGroupRadius para
    //     que o fondo de ningunha columna chegue ao centro/coroa. Cada
    //     columna ocupa `M * rowGap` cara abaixo; precisa que o punto-de-
    //     grupo estea polo menos a `maxColH + centerClearance` do centro.
    //     En 'fan' non aplica → effGroupRadius == groupRadius (regresión cero).
    let effGroupRadius = groupRadius
    if (memberLayout === 'list') {
      let maxColH = 0
      for (const c of clusters) {
        const h = c.memberIds.length * rowGap
        if (h > maxColH) maxColH = h
      }
      const needed = maxColH + centerClearance
      if (needed > effGroupRadius) effGroupRadius = needed
    }

    // 5. Coloca cada cluster en radial e os seus membros segundo memberLayout.
    const G = clusters.length
    if (G > 0) {
      for (const [i, cluster] of clusters.entries()) {
        const theta = startAngle + i * ((2 * Math.PI) / G)
        const groupPoint: Position = {
          x: centerX + effGroupRadius * Math.cos(theta),
          y: centerY + effGroupRadius * Math.sin(theta),
        }
        if (meshType === 'spokes') {
          mesh.push({ type: 'line', from: center, to: groupPoint })
        }

        const ids = cluster.memberIds
        const M = ids.length

        if (memberLayout === 'list') {
          // Columna vertical estrita cara abaixo desde o punto-de-grupo.
          // (Conector intra-grupo orgánico = F12, non aquí; 2b emite só
          // posicións.) `orbitRadius` ignórase neste modo; o eixe é
          // `rowGap`. A anti-colisión do paso 4b garante que o fondo
          // non cruza o centro.
          for (const [j, mid] of ids.entries()) {
            positions.set(mid, { x: groupPoint.x, y: groupPoint.y + (j + 1) * rowGap })
          }
        } else {
          // 'fan' — base de 2a, intacta. PLACEHOLDER 2a substituíuse
          // pola elección explícita do modo via config; o cálculo é
          // idéntico ao do briefing F11.2a.
          for (const [j, mid] of ids.entries()) {
            const phi = M === 1 ? theta : theta + (j - (M - 1) / 2) * (DEFAULT_MEMBER_ARC / (M - 1))
            positions.set(mid, {
              x: groupPoint.x + orbitRadius * Math.cos(phi),
              y: groupPoint.y + orbitRadius * Math.sin(phi),
            })
          }
        }
      }
    }

    // 6. Edges de dato (mesmo patrón que RadialLayout.computeEdges)
    const edges = this.computeEdges(treeDef, positions)

    // 7. Bounds = envolvente das posicións (mesmo patrón ca RadialLayout,
    //    sen polygon: 2a non o expón).
    const bounds = this.computeBounds(positions)

    return ok({
      nodes: positions,
      edges,
      bounds,
      layoutType: 'clustered-radial',
      ...(mesh.length > 0 ? { mesh } : {}),
    })
  }

  /**
   * Constrúe a lista determinista de clusters.
   *
   * - Un cluster por `GroupDef`, na orde de `treeDef.groups`.
   * - Membros do cluster: nodos onde `node.group === group.id` OU id
   *   listado en `group.nodeIds` (unión sen duplicar). A orde dos
   *   membros segue `treeDef.nodes` para determinismo.
   * - A raíz nunca se asigna a ningún cluster.
   * - Cluster implícito `__ungrouped__` ao final con todos os nodos
   *   non-raíz que non foron asignados a ningún grupo (degrada limpo
   *   se non hai `treeDef.groups`).
   */
  private buildClusters(treeDef: TreeDef, rootId: string | undefined): Cluster[] {
    const groups = treeDef.groups ?? []
    const assigned = new Set<string>()
    const clusters: Cluster[] = []

    for (const g of groups) {
      const explicit = new Set<string>(g.nodeIds ?? [])
      const ids: string[] = []
      for (const n of treeDef.nodes) {
        if (n.id === rootId) continue
        if ((n.group === g.id || explicit.has(n.id)) && !assigned.has(n.id)) {
          ids.push(n.id)
          assigned.add(n.id)
        }
      }
      clusters.push({ id: g.id, memberIds: ids })
    }

    const ungrouped: string[] = []
    for (const n of treeDef.nodes) {
      if (n.id !== rootId && !assigned.has(n.id)) {
        ungrouped.push(n.id)
      }
    }
    if (ungrouped.length > 0) {
      clusters.push({ id: '__ungrouped__', memberIds: ungrouped })
    }

    return clusters
  }

  /** Calca exacta de `RadialLayout.computeEdges`. */
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

  /**
   * Calca de `RadialLayout.computeBounds` simplificada (sen rama
   * `polygon`, que 2a non expón).
   */
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
// ── FIN: ClusteredRadialLayout ──
