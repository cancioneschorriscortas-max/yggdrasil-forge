// ── INICIO: DependencyGraph ──
// Grafo dirixido de dependencias construído dende TreeDef.edges.
//
// SEMÁNTICA CRÍTICA:
// Un edge `dependency` de A→B significa "B depende de A":
//   - A é prerrequisito de B
//   - A debe desbloquearse antes ca B
// Polo tanto:
//   - getDependencies(B) inclúe A   (B necesita A)
//   - getDependents(A)   inclúe B   (B depende de A)
//   - getOutgoing(A)     inclúe B   (dirección bruta do edge: A→B)
//   - distanceBetween(A, B) = saltos seguindo a dirección source→target

import type { EdgeDef, EdgeType } from '../types/index.js'
import type { DependencyGraphLike } from './UnlockResolver.js'

/**
 * Opcións de construción do DependencyGraph.
 */
export interface DependencyGraphOptions {
  /**
   * Tipos de edge que contan como dependencia.
   * Default: ['dependency'].
   * Pódese engadir 'soft_dependency' para incluír recomendacións.
   * Os tipos exclusion/enhancement/path/cluster/subtree_link nunca son
   * dependencias de desbloqueo.
   */
  readonly edgeTypes?: readonly EdgeType[]
}

/**
 * Grafo dirixido de dependencias.
 *
 * Constrúese unha vez e non se muta. Se a TreeDef cambia, créase un novo.
 *
 * Implementa DependencyGraphLike (consumido por UnlockResolver para
 * a condición distance_max).
 *
 * @example
 * const graph = new DependencyGraph(
 *   ['a', 'b', 'c'],
 *   [
 *     { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
 *     { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
 *   ],
 * )
 * graph.getDependencies('c')   // ['b']
 * graph.getAllDependencies('c') // Set { 'b', 'a' }
 * graph.distanceBetween('a', 'c') // 2
 * graph.getRoots()             // ['a']
 * graph.getLeaves()            // ['c']
 */
export class DependencyGraph implements DependencyGraphLike {
  /** Adxacencia bruta seguindo a dirección dos edges: source → Set<target>. */
  private readonly outgoing = new Map<string, Set<string>>()
  /** Adxacencia inversa: target → Set<source>. */
  private readonly incoming = new Map<string, Set<string>>()
  /** Conxunto de todos os nodeIds coñecidos. */
  private readonly nodes = new Set<string>()

  constructor(
    nodeIds: readonly string[],
    edges: readonly EdgeDef[],
    options?: DependencyGraphOptions,
  ) {
    const allowedTypes = new Set<EdgeType>(options?.edgeTypes ?? ['dependency'])

    for (const id of nodeIds) {
      this.nodes.add(id)
      this.outgoing.set(id, new Set<string>())
      this.incoming.set(id, new Set<string>())
    }

    for (const edge of edges) {
      if (!allowedTypes.has(edge.type)) {
        continue
      }
      this.addDirectedEdge(edge.source, edge.target)
      if (edge.bidirectional === true) {
        this.addDirectedEdge(edge.target, edge.source)
      }
    }
  }

  /**
   * Engade un edge dirixido source→target, creando os nodos se non existían.
   */
  private addDirectedEdge(source: string, target: string): void {
    this.ensureNode(source)
    this.ensureNode(target)
    const out = this.outgoing.get(source)
    /* v8 ignore start -- defensivo: ensureNode(source) acaba de crear o
       Set en outgoing; out sempre está definido. */
    if (out !== undefined) {
      out.add(target)
    }
    /* v8 ignore stop */
    const inc = this.incoming.get(target)
    /* v8 ignore start -- defensivo: ensureNode(target) acaba de crear o
       Set en incoming; inc sempre está definido. */
    if (inc !== undefined) {
      inc.add(source)
    }
    /* v8 ignore stop */
  }

  /**
   * Garante que un nodo existe nas estruturas internas.
   */
  private ensureNode(id: string): void {
    if (!this.nodes.has(id)) {
      this.nodes.add(id)
      this.outgoing.set(id, new Set<string>())
      this.incoming.set(id, new Set<string>())
    }
  }

  /**
   * True se o nodo existe no grafo.
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId)
  }

  /**
   * Todos os nodeIds do grafo.
   */
  getNodeIds(): string[] {
    return Array.from(this.nodes)
  }

  /**
   * Targets directos seguindo a dirección bruta do edge (source→target).
   *
   * Distinto de getDependents: getOutgoing devolve a dirección literal do
   * edge; útil para algoritmos de grafo (BFS, ciclos).
   */
  getOutgoing(nodeId: string): string[] {
    const set = this.outgoing.get(nodeId)
    if (set === undefined) {
      return []
    }
    return Array.from(set)
  }

  /**
   * Nodos dos que `nodeId` depende directamente.
   *
   * Se A→B (A prerrequisito de B), entón getDependencies(B) = [A].
   * É a adxacencia inversa.
   */
  getDependencies(nodeId: string): string[] {
    const set = this.incoming.get(nodeId)
    if (set === undefined) {
      return []
    }
    return Array.from(set)
  }

  /**
   * Nodos que dependen directamente de `nodeId`.
   *
   * Se A→B (A prerrequisito de B), entón getDependents(A) = [B].
   * É a adxacencia bruta (igual que getOutgoing, pero nomeada
   * semánticamente para o dominio de dependencias).
   */
  getDependents(nodeId: string): string[] {
    return this.getOutgoing(nodeId)
  }

  /**
   * Peche transitivo: todo o que `nodeId` necesita (directa e indirectamente).
   *
   * Percorre cara atrás (incoming) ata esgotar.
   */
  getAllDependencies(nodeId: string): Set<string> {
    const result = new Set<string>()
    const stack: string[] = [...this.getDependencies(nodeId)]
    while (stack.length > 0) {
      const current = stack.pop()
      /* v8 ignore start -- defensivo: o `while(stack.length > 0)` garante
         que `pop()` devolve un valor non-undefined. Guarda esixida por
         noUncheckedIndexedAccess. */
      if (current === undefined) {
        continue
      }
      /* v8 ignore stop */
      if (result.has(current)) {
        continue
      }
      result.add(current)
      for (const dep of this.getDependencies(current)) {
        if (!result.has(dep)) {
          stack.push(dep)
        }
      }
    }
    return result
  }

  /**
   * Peche transitivo inverso: todo o que depende de `nodeId`.
   */
  getAllDependents(nodeId: string): Set<string> {
    const result = new Set<string>()
    const stack: string[] = [...this.getDependents(nodeId)]
    while (stack.length > 0) {
      const current = stack.pop()
      /* v8 ignore start -- defensivo: o `while(stack.length > 0)` garante
         que `pop()` devolve un valor non-undefined. Guarda esixida por
         noUncheckedIndexedAccess. */
      if (current === undefined) {
        continue
      }
      /* v8 ignore stop */
      if (result.has(current)) {
        continue
      }
      result.add(current)
      for (const dep of this.getDependents(current)) {
        if (!result.has(dep)) {
          stack.push(dep)
        }
      }
    }
    return result
  }

  /**
   * Nodos raíz: sen dependencias (in-degree 0 na semántica "depende de").
   */
  getRoots(): string[] {
    const roots: string[] = []
    for (const id of this.nodes) {
      const deps = this.incoming.get(id)
      if (deps === undefined || deps.size === 0) {
        roots.push(id)
      }
    }
    return roots
  }

  /**
   * Nodos folla: ninguén depende deles (out-degree 0).
   */
  getLeaves(): string[] {
    const leaves: string[] = []
    for (const id of this.nodes) {
      const out = this.outgoing.get(id)
      if (out === undefined || out.size === 0) {
        leaves.push(id)
      }
    }
    return leaves
  }

  /**
   * Distancia (número de saltos) dende `fromId` ata `toId` seguindo a
   * dirección dos edges (source→target). BFS.
   *
   * - distanceBetween(A, A) = 0
   * - Sen camiño dirixido, ou nodos inexistentes: Number.POSITIVE_INFINITY
   */
  distanceBetween(fromId: string, toId: string): number {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return Number.POSITIVE_INFINITY
    }
    if (fromId === toId) {
      return 0
    }

    const visited = new Set<string>([fromId])
    let frontier: string[] = [fromId]
    let distance = 0

    while (frontier.length > 0) {
      distance++
      const next: string[] = []
      for (const node of frontier) {
        for (const neighbor of this.getOutgoing(node)) {
          if (neighbor === toId) {
            return distance
          }
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            next.push(neighbor)
          }
        }
      }
      frontier = next
    }

    return Number.POSITIVE_INFINITY
  }

  /**
   * Camiño máis curto (lista de nodeIds incluíndo extremos) dende `fromId`
   * ata `toId`, ou null se non hai camiño.
   *
   * BFS con tracking de predecesores.
   */
  getShortestPath(fromId: string, toId: string): string[] | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return null
    }
    if (fromId === toId) {
      return [fromId]
    }

    const visited = new Set<string>([fromId])
    const predecessor = new Map<string, string>()
    let frontier: string[] = [fromId]

    while (frontier.length > 0) {
      const next: string[] = []
      for (const node of frontier) {
        for (const neighbor of this.getOutgoing(node)) {
          if (visited.has(neighbor)) {
            continue
          }
          visited.add(neighbor)
          predecessor.set(neighbor, node)
          if (neighbor === toId) {
            return this.reconstructPath(predecessor, fromId, toId)
          }
          next.push(neighbor)
        }
      }
      frontier = next
    }

    return null
  }

  /**
   * Reconstrúe o camiño dende o mapa de predecesores.
   */
  private reconstructPath(
    predecessor: Map<string, string>,
    fromId: string,
    toId: string,
  ): string[] {
    const path: string[] = [toId]
    let current = toId
    while (current !== fromId) {
      const prev = predecessor.get(current)
      /* v8 ignore start -- defensivo: chámase tras atopar toId, polo que
         o mapa de predecesores ten unha cadea completa ata fromId. */
      if (prev === undefined) {
        // Non debería ocorrer se chamamos tras atopar toId; defensivo.
        break
      }
      /* v8 ignore stop */
      path.push(prev)
      current = prev
    }
    path.reverse()
    return path
  }
}
// ── FIN: DependencyGraph ──
