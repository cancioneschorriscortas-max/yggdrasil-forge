// ── INICIO: prerequisiteCycleValidator ──
// Aviso (NON-bloqueante) por ciclos no grafo de prerequisites.
//
// Constrúe o grafo direccionado: aresta A → B cando "para A poder
// desbloquearse, B tense que cumprir" (B vén nas condicións de A).
// Iso inclúe condicións simples (`node_unlocked`, `tier_min`, ...)
// e composables (`all`/`any`/`none`) que se camiñan recursivamente.
//
// Despois DFS con detección de back-edge. Cada nodo nun ciclo recibe
// un warning. Algoritmo: três cores (white/gray/black); back-edge a
// gris = ciclo.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EditorDocument } from '../../document/EditorDocument.js'
import type { ValidationIssue, Validator } from '../Validator.js'

interface PrereqMaybe {
  type?: string
  nodeId?: string
  conditions?: readonly PrereqMaybe[]
}

/**
 * Camiña un prerequisito (composable) e devolve **só** os nodeIds
 * referenciados (sin tipos non-nodo como `resource_min`, `stat_min`).
 */
function collectNodeRefs(prereq: unknown, out: Set<string>): void {
  if (prereq === null || prereq === undefined || typeof prereq !== 'object') return
  const p = prereq as PrereqMaybe
  if (typeof p.nodeId === 'string') out.add(p.nodeId)
  if (Array.isArray(p.conditions)) {
    for (const c of p.conditions) collectNodeRefs(c, out)
  }
}

type Color = 'white' | 'gray' | 'black'

export const prerequisiteCycleValidator: Validator = (doc: EditorDocument) => {
  // Construír grafo: A → B se A depende de B (B aparece nas prereqs de A).
  const graph = new Map<string, string[]>()
  const validIds = new Set<string>(doc.tree.nodes.map((n) => n.id))
  for (const node of doc.tree.nodes) {
    const refs = new Set<string>()
    collectNodeRefs(node.prerequisites, refs)
    // Só seguimos aristas para ids reais (dangling vai ao
    // referentialIntegrityValidator).
    const adj: string[] = []
    for (const r of refs) {
      if (validIds.has(r)) adj.push(r)
    }
    graph.set(node.id, adj)
  }

  const color = new Map<string, Color>()
  for (const id of validIds) color.set(id, 'white')

  const cycleNodes = new Set<string>()

  // DFS iterativa con stack para evitar recursión profunda.
  function visit(start: string): void {
    // [nodeId, índiceFillo seguinte]
    const stack: { id: string; childIdx: number; pathPos: number }[] = []
    const pathStack: string[] = []
    stack.push({ id: start, childIdx: 0, pathPos: 0 })
    color.set(start, 'gray')
    pathStack.push(start)

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (frame === undefined) break // unreachable, asegurándose
      const adj = graph.get(frame.id) ?? []
      if (frame.childIdx >= adj.length) {
        // Procesado todo: marcar negro e pop.
        color.set(frame.id, 'black')
        pathStack.pop()
        stack.pop()
        continue
      }
      const child = adj[frame.childIdx]
      frame.childIdx += 1
      if (child === undefined) continue
      const c = color.get(child)
      if (c === 'gray') {
        // Back-edge → ciclo. Marcar nodos no camiño desde child ata o final.
        const startIdx = pathStack.indexOf(child)
        if (startIdx >= 0) {
          for (let i = startIdx; i < pathStack.length; i += 1) {
            const n = pathStack[i]
            if (n !== undefined) cycleNodes.add(n)
          }
        }
        continue
      }
      if (c === 'white') {
        color.set(child, 'gray')
        pathStack.push(child)
        stack.push({ id: child, childIdx: 0, pathPos: pathStack.length - 1 })
      }
      // c === 'black': xa visitado completamente; saltar.
    }
  }

  for (const id of validIds) {
    if (color.get(id) === 'white') visit(id)
  }

  const issues: ValidationIssue[] = []
  for (const nodeId of cycleNodes) {
    const message: LocalizedString = {
      en: `node '${nodeId}' is part of a prerequisite cycle`,
    }
    issues.push({ severity: 'warning', code: 'PREREQ_CYCLE', message, nodeId })
  }
  return issues
}
// ── FIN: prerequisiteCycleValidator ──
