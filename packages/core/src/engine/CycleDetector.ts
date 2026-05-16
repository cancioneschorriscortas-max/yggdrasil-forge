// ── INICIO: CycleDetector ──
// Detección de ciclos nun DependencyGraph mediante DFS con coloración.
//
// Coloración clásica:
//   - branco (non visitado)
//   - gris   (na pila de recursión actual)
//   - negro  (procesado completamente)
// Un back-edge cara a un nodo GRIS indica ciclo.

import type { DependencyGraph } from './DependencyGraph.js'

/**
 * Estados de coloración para o DFS.
 */
const WHITE = 0
const GRAY = 1
const BLACK = 2

/**
 * Detecta ciclos nun grafo de dependencias.
 *
 * Opera sobre un DependencyGraph xa construído (non o reconstrúe).
 *
 * @example
 * const graph = new DependencyGraph(['a', 'b'], [
 *   { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
 *   { id: 'e2', source: 'b', target: 'a', type: 'dependency' },
 * ])
 * const detector = new CycleDetector(graph)
 * detector.hasCycle()      // true
 * detector.findCycles()    // [['a', 'b', 'a']]
 */
export class CycleDetector {
  private readonly graph: DependencyGraph

  constructor(graph: DependencyGraph) {
    this.graph = graph
  }

  /**
   * True se o grafo contén polo menos un ciclo.
   *
   * Para rendemento, para no primeiro ciclo atopado.
   */
  hasCycle(): boolean {
    const color = new Map<string, number>()
    for (const id of this.graph.getNodeIds()) {
      color.set(id, WHITE)
    }

    for (const id of this.graph.getNodeIds()) {
      if (color.get(id) === WHITE) {
        if (this.dfsHasCycle(id, color)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * DFS recursivo que devolve true ao atopar un back-edge.
   */
  private dfsHasCycle(node: string, color: Map<string, number>): boolean {
    color.set(node, GRAY)
    for (const neighbor of this.graph.getOutgoing(node)) {
      const c = color.get(neighbor)
      if (c === GRAY) {
        return true
      }
      if (c === WHITE && this.dfsHasCycle(neighbor, color)) {
        return true
      }
    }
    color.set(node, BLACK)
    return false
  }

  /**
   * Devolve TODOS os ciclos atopados.
   *
   * Cada ciclo represéntase como unha lista de nodeIds que empeza e remata
   * no mesmo nodo (ex: ['a', 'b', 'c', 'a']).
   *
   * Nota: a deduplicación de ciclos equivalentes (mesmo ciclo empezando por
   * outro nodo) faise por normalización (rotar ao menor id e comparar).
   */
  findCycles(): string[][] {
    const color = new Map<string, number>()
    for (const id of this.graph.getNodeIds()) {
      color.set(id, WHITE)
    }

    const cycles: string[][] = []
    const seen = new Set<string>()
    const stack: string[] = []

    const dfs = (node: string): void => {
      color.set(node, GRAY)
      stack.push(node)

      for (const neighbor of this.graph.getOutgoing(node)) {
        const c = color.get(neighbor)
        if (c === GRAY) {
          // Back-edge: extrae o ciclo dende `neighbor` ata o tope da pila.
          const startIndex = stack.indexOf(neighbor)
          if (startIndex !== -1) {
            const cyclePath = stack.slice(startIndex)
            cyclePath.push(neighbor) // pecha o ciclo
            const key = this.normalizeCycleKey(cyclePath)
            if (!seen.has(key)) {
              seen.add(key)
              cycles.push(cyclePath)
            }
          }
        } else if (c === WHITE) {
          dfs(neighbor)
        }
      }

      stack.pop()
      color.set(node, BLACK)
    }

    for (const id of this.graph.getNodeIds()) {
      if (color.get(id) === WHITE) {
        dfs(id)
      }
    }

    return cycles
  }

  /**
   * Devolve un ciclo que conteña `nodeId`, ou null se ese nodo non está
   * en ningún ciclo.
   *
   * Útil para mensaxes de erro pedagóxicas:
   * "O nodo X forma parte deste ciclo de dependencias: X → Y → Z → X".
   */
  findCycleContaining(nodeId: string): string[] | null {
    if (!this.graph.hasNode(nodeId)) {
      return null
    }
    for (const cycle of this.findCycles()) {
      // O ciclo péchase repetindo o primeiro; comprobar nos elementos únicos.
      const unique = cycle.slice(0, -1)
      if (unique.includes(nodeId)) {
        return cycle
      }
    }
    return null
  }

  /**
   * Normaliza un ciclo a unha clave canónica para deduplicar.
   *
   * Rota o ciclo (sen o peche) para que empece polo menor id
   * lexicográfico, e únese. Así ['b','c','a','b'] e ['a','b','c','a']
   * producen a mesma clave.
   */
  private normalizeCycleKey(cycle: string[]): string {
    const core = cycle.slice(0, -1) // quita o peche duplicado
    if (core.length === 0) {
      return ''
    }
    let minIndex = 0
    for (let i = 1; i < core.length; i++) {
      const candidate = core[i]
      const currentMin = core[minIndex]
      if (candidate !== undefined && currentMin !== undefined && candidate < currentMin) {
        minIndex = i
      }
    }
    const rotated = [...core.slice(minIndex), ...core.slice(0, minIndex)]
    return rotated.join('->')
  }
}
// ── FIN: CycleDetector ──
