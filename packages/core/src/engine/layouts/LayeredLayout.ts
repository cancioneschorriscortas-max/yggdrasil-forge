// ── INICIO: LayeredLayout (Sugiyama-lite) ──
import {
  ErrorCode,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { Position } from '../../types/node.js'
import type { TreeDef } from '../../types/tree.js'
import { DependencyGraph } from '../DependencyGraph.js'
import { parseLayeredConfig } from './LayeredLayoutConfig.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'
import type { TreeDirection } from './TreeLayoutConfig.js'

/**
 * Layout por capas para DAGs (Sugiyama-lite).
 *
 * A diferenza de TreeLayout (que elixe un "primary parent" e debuxa as
 * arestas dos demais pais como diagonais cruzadas), layered coloca cada
 * nodo na capa do seu **camiño máis longo** desde as raíces: TÓDOLOS
 * pais quedan en capas superiores e as súas arestas baixan limpas.
 * É o layout correcto cando os nodos teñen varios pais (requisitos
 * múltiples), o caso común nas árbores de GAIA.
 *
 * Tres decisións de corte (Sugiyama COMPLETO non, §13):
 * 1. **Capa = 1 + max(capa dos pais)** (longest path), calculada en
 *    orde topolóxica. Sen minimización de altura nin coordenadas
 *    óptimas (Brandes-Köpf): capas equiespaciadas e centradas.
 * 2. **Orde intra-capa por baricentro** (media das posicións dos
 *    veciños), 3 pasadas abaixo↔arriba↔abaixo. Reduce cruces sen o
 *    custo do ordering completo.
 * 3. **Ciclos → err(CYCLE_DETECTED)**, nunca colgar nin colocar lixo:
 *    os DAGs dos autores traen ciclos por erro, e o motor protéxese
 *    aínda que o validador soft xa avise antes no editor.
 *
 * **Ignora `NodeDef.position` totalmente** (como TreeLayout); para
 * posicións manuais úsase o layout `'custom'`.
 *
 * **Determinismo absoluto**: orde inicial de capas e desempates do
 * baricentro sempre por orde de aparición en `treeDef.nodes`. Cero
 * `Math.random()`, cero `Date.now()`.
 */
export class LayeredLayout implements LayoutEngine {
  readonly type = 'layered'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    // 1. Validar config
    const configResult = parseLayeredConfig(treeDef.layout)
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
        layoutType: 'layered',
      })
    }

    // 3. Orde topolóxica (Kahn) — detecta ciclos ANTES de calcular nada
    const nodeIds = treeDef.nodes.map((n) => n.id)
    const graph = new DependencyGraph(nodeIds, treeDef.edges)
    const topoOrder = this.topologicalOrder(nodeIds, graph)
    if (topoOrder === null) {
      const cyclic = this.findCyclicNodes(nodeIds, graph)
      return err(
        new YggdrasilError(
          ErrorCode.CYCLE_DETECTED,
          getErrorMessage(ErrorCode.CYCLE_DETECTED, 'gl'),
          { context: { layoutType: 'layered', nodesInCycle: cyclic } },
        ),
      )
    }

    // 4. Capa = camiño máis longo desde as raíces (orde topolóxica
    //    garante que os pais xa teñen capa asignada)
    const layerOf = new Map<string, number>()
    for (const id of topoOrder) {
      let layer = 0
      for (const parent of graph.getDependencies(id)) {
        const parentLayer = layerOf.get(parent) ?? 0
        if (parentLayer + 1 > layer) layer = parentLayer + 1
      }
      layerOf.set(id, layer)
    }

    // 5. Capas como arrays ordenados; orde inicial = treeDef.nodes
    const layerCount = Math.max(...Array.from(layerOf.values())) + 1
    const layers: string[][] = Array.from({ length: layerCount }, () => [])
    for (const node of treeDef.nodes) {
      const layer = layerOf.get(node.id) ?? 0
      layers[layer]?.push(node.id)
    }

    // 6. Baricentro: 3 pasadas (abaixo → arriba → abaixo)
    this.barycenterPassDown(layers, graph)
    this.barycenterPassUp(layers, graph)
    this.barycenterPassDown(layers, graph)

    // 7. Coordenadas: cada capa centrada arredor de x=0
    const nodes = new Map<string, Position>()
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex]
      if (layer === undefined) continue
      const halfWidth = (layer.length - 1) / 2
      for (let i = 0; i < layer.length; i++) {
        const id = layer[i]
        if (id === undefined) continue
        nodes.set(
          id,
          this.transformPosition(
            i - halfWidth,
            layerIndex,
            direction,
            nodeSpacing,
            levelSpacing,
            centerX,
            centerY,
          ),
        )
      }
    }

    // 8. Edges como liñas rectas + bounds
    const edges = this.computeEdges(treeDef, nodes)
    const bounds = this.computeBounds(nodes)

    return ok({ nodes, edges, bounds, layoutType: 'layered' })
  }

  // ─── Kahn + ciclo ───

  /**
   * Orde topolóxica por Kahn. Devolve null se hai ciclo (quedan nodos
   * con in-degree > 0 sen procesar). Determinista: a fronteira
   * consúmese en orde de chegada e iníciase en orde de `nodeIds`
   * (= orde de declaración en treeDef.nodes).
   */
  private topologicalOrder(nodeIds: readonly string[], graph: DependencyGraph): string[] | null {
    const indegree = new Map<string, number>()
    const queue: string[] = []
    for (const id of nodeIds) {
      const deg = graph.getDependencies(id).length
      indegree.set(id, deg)
      if (deg === 0) queue.push(id)
    }

    const order: string[] = []
    let head = 0
    while (head < queue.length) {
      const current = queue[head]
      head++
      if (current === undefined) continue
      order.push(current)
      for (const child of graph.getOutgoing(current)) {
        const deg = (indegree.get(child) ?? 0) - 1
        indegree.set(child, deg)
        if (deg === 0) queue.push(child)
      }
    }

    return order.length === nodeIds.length ? order : null
  }

  /**
   * Nodos implicados en (ou augas abaixo de) un ciclo: os que Kahn non
   * puido procesar. Para o `context` do erro — o autor ve ONDE mirar.
   */
  private findCyclicNodes(nodeIds: readonly string[], graph: DependencyGraph): string[] {
    const order = new Set<string>()
    const indegree = new Map<string, number>()
    const queue: string[] = []
    for (const id of nodeIds) {
      const deg = graph.getDependencies(id).length
      indegree.set(id, deg)
      if (deg === 0) queue.push(id)
    }
    let head = 0
    while (head < queue.length) {
      const current = queue[head]
      head++
      if (current === undefined) continue
      order.add(current)
      for (const child of graph.getOutgoing(current)) {
        const deg = (indegree.get(child) ?? 0) - 1
        indegree.set(child, deg)
        if (deg === 0) queue.push(child)
      }
    }
    return nodeIds.filter((id) => !order.has(id))
  }

  // ─── Baricentro ───

  /**
   * Pasada cara abaixo: reordena cada capa (da 1 á última) polo
   * baricentro dos PAIS. Os pais poden estar varias capas arriba
   * (arestas longas): úsase a súa posición actual igualmente.
   */
  private barycenterPassDown(layers: string[][], graph: DependencyGraph): void {
    for (let i = 1; i < layers.length; i++) {
      const layer = layers[i]
      if (layer === undefined) continue
      this.sortByBarycenter(layer, (id) => graph.getDependencies(id), this.indexOfAll(layers))
    }
  }

  /**
   * Pasada cara arriba: reordena cada capa (da penúltima á 0) polo
   * baricentro dos FILLOS.
   */
  private barycenterPassUp(layers: string[][], graph: DependencyGraph): void {
    for (let i = layers.length - 2; i >= 0; i--) {
      const layer = layers[i]
      if (layer === undefined) continue
      this.sortByBarycenter(layer, (id) => graph.getOutgoing(id), this.indexOfAll(layers))
    }
  }

  /**
   * Mapa id → posición CENTRADA dentro da súa capa (índice − centro).
   * Centrar antes de comparar evita o nesgo entre capas de anchos
   * distintos: o índice 0 dunha capa de 5 está moito máis á esquerda
   * có índice 0 dunha capa de 1.
   */
  private indexOfAll(layers: readonly (readonly string[])[]): Map<string, number> {
    const index = new Map<string, number>()
    for (const layer of layers) {
      const halfWidth = (layer.length - 1) / 2
      for (let i = 0; i < layer.length; i++) {
        const id = layer[i]
        if (id !== undefined) index.set(id, i - halfWidth)
      }
    }
    return index
  }

  /**
   * Reordena `layer` in place polo baricentro (media das posicións
   * centradas dos veciños). Nodos SEN veciños conservan a súa posición
   * actual como baricentro (non saltan). Desempate determinista:
   * índice actual — que na primeira pasada é a orde de declaración en
   * treeDef.nodes.
   */
  private sortByBarycenter(
    layer: string[],
    neighborsOf: (id: string) => readonly string[],
    indexOf: ReadonlyMap<string, number>,
  ): void {
    const halfWidth = (layer.length - 1) / 2
    const keyed = layer.map((id, currentIndex) => {
      const neighbors = neighborsOf(id)
      let barycenter = currentIndex - halfWidth
      if (neighbors.length > 0) {
        let sum = 0
        for (const n of neighbors) sum += indexOf.get(n) ?? 0
        barycenter = sum / neighbors.length
      }
      return { id, barycenter, currentIndex }
    })
    keyed.sort((a, b) => a.barycenter - b.barycenter || a.currentIndex - b.currentIndex)
    for (let i = 0; i < keyed.length; i++) {
      const entry = keyed[i]
      if (entry !== undefined) layer[i] = entry.id
    }
  }

  // ─── Transformación + edges + bounds (convención de TreeLayout) ───

  /**
   * Transforma coordenadas lóxicas (x en slots, y en capas) a posicións
   * finais segundo a dirección. Idéntico contrato ca TreeLayout.
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
        return { x: x * nodeSpacing + centerX, y: y * levelSpacing + centerY }
      case 'bottom-up':
        return { x: x * nodeSpacing + centerX, y: -y * levelSpacing + centerY }
      case 'left-right':
        return { x: y * levelSpacing + centerX, y: x * nodeSpacing + centerY }
      case 'right-left':
        return { x: -y * levelSpacing + centerX, y: x * nodeSpacing + centerY }
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
}
// ── FIN: LayeredLayout (Sugiyama-lite) ──
