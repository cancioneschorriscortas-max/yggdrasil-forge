// ── INICIO: Built-in validation rules ──
// 6 regras estruturais simples para 8.7.a.
//
// **DIFERIDAS** a 8.7.b: progressive_difficulty, balanced_branches,
// no_redundant_prerequisites.
// **DIFERIDA totalmente**: valid_subtree_references (require sub-trees).

import type { EdgeDef, TreeDef } from '@yggdrasil-forge/core'
import type { ValidationIssue, ValidationRule } from './types.js'

/**
 * Filtra edges para obter só os de tipo 'dependency'.
 */
function dependencyEdges(edges: readonly EdgeDef[]): readonly EdgeDef[] {
  return edges.filter((e) => e.type === 'dependency')
}

/**
 * Construir mapa adjacency: source → [targets] dos dependency edges.
 */
function buildAdjacency(edges: readonly EdgeDef[]): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const e of dependencyEdges(edges)) {
    const targets = adj.get(e.source) ?? []
    targets.push(e.target)
    adj.set(e.source, targets)
  }
  return adj
}

// ── Rule 1: no_cycles ──────────────────────────────────────────

/**
 * Detecta ciclos no grafo dirixido de dependency edges.
 * Severity: error.
 */
export const noCyclesRule: ValidationRule = {
  id: 'no_cycles',
  label: {
    gl: 'Sen ciclos',
    es: 'Sin ciclos',
    en: 'No cycles',
  },
  severity: 'error',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)
    const visited = new Set<string>()
    const onStack = new Set<string>()

    const dfs = (node: string): string | null => {
      visited.add(node)
      onStack.add(node)

      for (const next of adj.get(node) ?? []) {
        if (!visited.has(next)) {
          const cycle = dfs(next)
          if (cycle !== null) return cycle
        } else if (onStack.has(next)) {
          return next
        }
      }

      onStack.delete(node)
      return null
    }

    for (const node of treeDef.nodes) {
      if (visited.has(node.id)) continue
      const cycle = dfs(node.id)
      if (cycle !== null) {
        issues.push({
          ruleId: 'no_cycles',
          severity: 'error',
          message: `Cycle detected involving node "${cycle}"`,
          nodeId: cycle,
        })
      }
    }

    return issues
  },
}

// ── Rule 2: all_reachable_from_root ────────────────────────────

/**
 * Verifica que tódolos nodos son alcanzables desde rootNodeId
 * seguindo dependency edges.
 *
 * Se rootNodeId é undefined, cero issues (regra inaplicable).
 * Severity: error.
 */
export const allReachableFromRootRule: ValidationRule = {
  id: 'all_reachable_from_root',
  label: {
    gl: 'Tódolos nodos accesibles desde a raíz',
    es: 'Todos los nodos accesibles desde la raíz',
    en: 'All nodes reachable from root',
  },
  severity: 'error',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    if (treeDef.rootNodeId === undefined) return []

    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)
    const reachable = new Set<string>()
    const queue: string[] = [treeDef.rootNodeId]

    while (queue.length > 0) {
      const node = queue.shift()
      /* v8 ignore next -- queue.length > 0 guarantees shift returns a value */
      if (node === undefined) continue
      if (reachable.has(node)) continue
      reachable.add(node)
      for (const next of adj.get(node) ?? []) {
        if (!reachable.has(next)) queue.push(next)
      }
    }

    for (const node of treeDef.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          ruleId: 'all_reachable_from_root',
          severity: 'error',
          message: `Node "${node.id}" is not reachable from root "${treeDef.rootNodeId}"`,
          nodeId: node.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 3: no_orphan_nodes ────────────────────────────────────

/**
 * Detecta nodos orfos: aqueles sen edges in/out (de calquera tipo).
 * Severity: warning.
 */
export const noOrphanNodesRule: ValidationRule = {
  id: 'no_orphan_nodes',
  label: {
    gl: 'Sen nodos orfos',
    es: 'Sin nodos huérfanos',
    en: 'No orphan nodes',
  },
  severity: 'warning',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const connected = new Set<string>()

    for (const e of treeDef.edges) {
      connected.add(e.source)
      connected.add(e.target)
    }

    for (const node of treeDef.nodes) {
      if (!connected.has(node.id)) {
        issues.push({
          ruleId: 'no_orphan_nodes',
          severity: 'warning',
          message: `Node "${node.id}" has no connections (orphan)`,
          nodeId: node.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 4: no_dead_ends ───────────────────────────────────────

/**
 * Detecta nodos sen outgoing dependency edges (excepto a raíz).
 * Severity: warning.
 */
export const noDeadEndsRule: ValidationRule = {
  id: 'no_dead_ends',
  label: {
    gl: 'Sen camiños sen saída',
    es: 'Sin caminos sin salida',
    en: 'No dead ends',
  },
  severity: 'warning',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)

    for (const node of treeDef.nodes) {
      const outgoing = adj.get(node.id)
      if (outgoing === undefined || outgoing.length === 0) {
        if (node.id === treeDef.rootNodeId) continue
        issues.push({
          ruleId: 'no_dead_ends',
          severity: 'warning',
          message: `Node "${node.id}" has no outgoing dependencies (dead end)`,
          nodeId: node.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 5: max_branching_factor (factory) ─────────────────────

/**
 * Factory: crea unha regra que detecta nodos con máis fillos
 * (outgoing dependency edges) que o límite.
 * Severity: warning.
 */
export function maxBranchingFactorRule(limit: number): ValidationRule {
  return {
    id: 'max_branching_factor',
    label: {
      gl: `Factor de ramificación máximo: ${limit}`,
      es: `Factor de ramificación máximo: ${limit}`,
      en: `Maximum branching factor: ${limit}`,
    },
    severity: 'warning',
    validate(treeDef: TreeDef): readonly ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const adj = buildAdjacency(treeDef.edges)

      for (const [nodeId, targets] of adj) {
        if (targets.length > limit) {
          issues.push({
            ruleId: 'max_branching_factor',
            severity: 'warning',
            message: `Node "${nodeId}" has ${targets.length} children (max allowed: ${limit})`,
            nodeId,
          })
        }
      }

      return issues
    },
  }
}

// ── Rule 6: min_branching_factor (factory) ─────────────────────

/**
 * Factory: crea unha regra que detecta nodos non-leaf con menos
 * fillos que o límite (excluíndo nodos sen outgoing).
 * Severity: info.
 */
export function minBranchingFactorRule(limit: number): ValidationRule {
  return {
    id: 'min_branching_factor',
    label: {
      gl: `Factor de ramificación mínimo: ${limit}`,
      es: `Factor de ramificación mínimo: ${limit}`,
      en: `Minimum branching factor: ${limit}`,
    },
    severity: 'info',
    validate(treeDef: TreeDef): readonly ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const adj = buildAdjacency(treeDef.edges)

      for (const [nodeId, targets] of adj) {
        if (targets.length > 0 && targets.length < limit) {
          issues.push({
            ruleId: 'min_branching_factor',
            severity: 'info',
            message: `Node "${nodeId}" has only ${targets.length} children (recommended min: ${limit})`,
            nodeId,
          })
        }
      }

      return issues
    },
  }
}

// ── FIN: Built-in validation rules ──
