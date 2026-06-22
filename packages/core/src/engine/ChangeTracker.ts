// ── INICIO: ChangeTracker ──
// Analiza arrays de TreeChange[] e decide:
// - Que caches invalidar selectivamente
// - Que NodeInstances precisan reconciliación
// - Que conflitos internos hai na lista
//
// É PURO: non muta nada, non lanza excepcións, non consulta estado externo.

import type { TreeChange } from '../types/index.js'
import type { CacheType } from './StateStore.js'

/**
 * Conflito detectado entre cambios da mesma lista.
 *
 * Os conflitos son informativos. O TreeEngine decidirá como reaccionar
 * (abortar, aplicar estratexia, etc.).
 */
export type ChangeConflict =
  | {
      readonly type: 'duplicate_add_node'
      readonly nodeId: string
      readonly positions: readonly number[]
    }
  | {
      readonly type: 'add_then_remove'
      readonly nodeId: string
      readonly addPosition: number
      readonly removePosition: number
    }
  | {
      readonly type: 'remove_then_modify'
      readonly nodeId: string
      readonly removePosition: number
      readonly modifyPosition: number
    }
  | {
      readonly type: 'modify_after_rename'
      readonly oldId: string
      readonly renamePosition: number
      readonly modifyPosition: number
    }
  | {
      readonly type: 'rename_chain'
      readonly firstRename: { readonly oldId: string; readonly newId: string }
      readonly secondRename: { readonly oldId: string; readonly newId: string }
      readonly positions: readonly [number, number]
    }
  | {
      readonly type: 'rename_to_existing'
      readonly newId: string
      readonly conflictingPosition: number
    }
  | {
      readonly type: 'duplicate_edge_id'
      readonly edgeId: string
      readonly positions: readonly number[]
    }

/**
 * Resultado da análise dunha lista de TreeChange.
 */
export interface ChangeAnalysis {
  /** IDs de nodos cuxas NodeInstances precisan reconciliación. */
  readonly affectedNodes: ReadonlySet<string>
  /** Caches que perderon validez. */
  readonly cachesToInvalidate: ReadonlySet<CacheType>
  /** Conflitos internos detectados na lista. */
  readonly internalConflicts: readonly ChangeConflict[]
  /** Mapa oldId → newId dos renames aplicados na lista. */
  readonly renames: ReadonlyMap<string, string>
}

/**
 * Conxunto de campos de NodeDef que afectan a cache de layout.
 */
const LAYOUT_AFFECTING_NODE_FIELDS = new Set<string>([
  'position',
  'color',
  'icon',
  'tier',
  'maxTier',
  'group',
  'type',
  'label',
  'cost',
  'costPerTier',
  'effects',
  'prerequisites',
  'exclusions',
  'supportsProgress',
  'progressMilestones',
  'progressSource',
  'timeConstraints',
  'subtreeId',
  'subtreeOverrides',
])

/**
 * Conxunto de campos de NodeDef que afectan a cache de dependency graph.
 */
const DEPENDENCY_AFFECTING_NODE_FIELDS = new Set<string>([
  'prerequisites',
  'exclusions',
  'subtreeId',
  'subtreeOverrides',
])

/**
 * Conxunto de campos de NodeDef que afectan a cache de search.
 */
const SEARCH_AFFECTING_NODE_FIELDS = new Set<string>([
  'label',
  'description',
  'tags',
  'searchKeywords',
  'content',
  'metadata',
])

/**
 * Conxunto de campos de NodeDef que afectan a cache de stats.
 */
const STATS_AFFECTING_NODE_FIELDS = new Set<string>([
  'cost',
  'costPerTier',
  'effects',
  'statContributions',
])

/**
 * Conxunto de campos de EdgeDef que afectan a cache de layout.
 */
const LAYOUT_AFFECTING_EDGE_FIELDS = new Set<string>([
  'type',
  'weight',
  'style',
  'label',
  'bidirectional',
])

/**
 * Conxunto de campos de EdgeDef que afectan a cache de dependency.
 */
const DEPENDENCY_AFFECTING_EDGE_FIELDS = new Set<string>(['type'])

/**
 * Analiza unha lista de TreeChange e produce un ChangeAnalysis.
 *
 * É unha función pura: non muta nada, non consulta estado externo.
 *
 * Os conflitos detectados son informativos; non se lanzan erros.
 *
 * @example
 * const analysis = analyzeChanges([
 *   { type: 'add_node', node: { id: 'a', type: 'small', label: 'A' } },
 *   { type: 'modify_node', nodeId: 'b', changes: { color: '#fff' } },
 * ])
 * analysis.affectedNodes      // Set { 'a', 'b' }
 * analysis.cachesToInvalidate // Set { 'layout', 'dependency', 'search', 'stats' }
 */
export function analyzeChanges(changes: readonly TreeChange[]): ChangeAnalysis {
  const affectedNodes = new Set<string>()
  const cachesToInvalidate = new Set<CacheType>()
  const conflicts: ChangeConflict[] = []
  const renames = new Map<string, string>()

  // Tracking interno para detectar conflitos.
  const addedNodePositions = new Map<string, number[]>()
  const removedNodePositions = new Map<string, number>()
  const renamePositions = new Map<string, number>() // oldId → position
  const addedEdgePositions = new Map<string, number[]>()

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]
    /* v8 ignore start -- defensivo: i < changes.length garante in-bounds.
       Guarda esixida por noUncheckedIndexedAccess. */
    if (change === undefined) {
      continue
    }
    /* v8 ignore stop */
    analyzeOne(change, i, {
      affectedNodes,
      cachesToInvalidate,
      conflicts,
      renames,
      addedNodePositions,
      removedNodePositions,
      renamePositions,
      addedEdgePositions,
    })
  }

  // Detecta duplicate_add_node (varios add_node co mesmo id).
  for (const [nodeId, positions] of addedNodePositions.entries()) {
    if (positions.length > 1) {
      conflicts.push({
        type: 'duplicate_add_node',
        nodeId,
        positions: [...positions],
      })
    }
  }

  // Detecta duplicate_edge_id.
  for (const [edgeId, positions] of addedEdgePositions.entries()) {
    if (positions.length > 1) {
      conflicts.push({
        type: 'duplicate_edge_id',
        edgeId,
        positions: [...positions],
      })
    }
  }

  return {
    affectedNodes,
    cachesToInvalidate,
    internalConflicts: conflicts,
    renames,
  }
}

/**
 * Acumulador pasado por referencia para analyzeOne.
 */
interface AnalysisAccumulator {
  affectedNodes: Set<string>
  cachesToInvalidate: Set<CacheType>
  conflicts: ChangeConflict[]
  renames: Map<string, string>
  addedNodePositions: Map<string, number[]>
  removedNodePositions: Map<string, number>
  renamePositions: Map<string, number>
  addedEdgePositions: Map<string, number[]>
}

/**
 * Analiza un cambio individual e actualiza o acumulador.
 */
function analyzeOne(change: TreeChange, position: number, acc: AnalysisAccumulator): void {
  switch (change.type) {
    case 'add_node': {
      const id = change.node.id
      acc.affectedNodes.add(id)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency', 'search', 'stats'])
      trackAdd(acc.addedNodePositions, id, position)

      // Detección: add despois de remove.
      const removedAt = acc.removedNodePositions.get(id)
      /* v8 ignore start -- rama defensiva: corpo do if é só comentario
         documental (patrón "add → remove → add" é válido pero non rexistra
         conflito). Sen efecto observable. */
      if (removedAt !== undefined) {
        // engadir + remove + engadir é un patrón válido (reset). Non é conflito.
      }
      /* v8 ignore stop */
      return
    }

    case 'remove_node': {
      const id = change.nodeId
      acc.affectedNodes.add(id)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency', 'search', 'stats'])

      // Detección: add_then_remove na mesma lista (o add tórnase irrelevante).
      const addPositions = acc.addedNodePositions.get(id) ?? []
      const lastAddPosition = addPositions.at(-1)
      if (lastAddPosition !== undefined && lastAddPosition < position) {
        acc.conflicts.push({
          type: 'add_then_remove',
          nodeId: id,
          addPosition: lastAddPosition,
          removePosition: position,
        })
      }

      acc.removedNodePositions.set(id, position)
      return
    }

    case 'modify_node': {
      const id = change.nodeId
      acc.affectedNodes.add(id)
      addCachesForModifyNode(acc.cachesToInvalidate, change.changes)

      // Detección: remove_then_modify.
      const removedAt = acc.removedNodePositions.get(id)
      if (removedAt !== undefined && removedAt < position) {
        acc.conflicts.push({
          type: 'remove_then_modify',
          nodeId: id,
          removePosition: removedAt,
          modifyPosition: position,
        })
      }

      // Detección: modify_after_rename (modificar o id antigo despois dun rename).
      const renamedAt = acc.renamePositions.get(id)
      if (renamedAt !== undefined && renamedAt < position) {
        acc.conflicts.push({
          type: 'modify_after_rename',
          oldId: id,
          renamePosition: renamedAt,
          modifyPosition: position,
        })
      }
      return
    }

    case 'rename_node_id': {
      acc.affectedNodes.add(change.oldId)
      acc.affectedNodes.add(change.newId)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency', 'search', 'stats'])

      // Detección: rename_chain (renomear A→B e despois B→C).
      for (const [prevOld, prevNew] of acc.renames.entries()) {
        if (prevNew === change.oldId) {
          acc.conflicts.push({
            type: 'rename_chain',
            firstRename: { oldId: prevOld, newId: prevNew },
            secondRename: { oldId: change.oldId, newId: change.newId },
            positions: [
              /* v8 ignore next -- defensivo: renamePositions inclúe prevOld
                 porque tiña rename rexistrado en `acc.renames`. */
              acc.renamePositions.get(prevOld) ?? -1,
              position,
            ],
          })
          break
        }
      }

      // Detección: rename_to_existing — o newId xa foi oldId noutro rename previo.
      if (acc.renames.has(change.newId)) {
        acc.conflicts.push({
          type: 'rename_to_existing',
          newId: change.newId,
          /* v8 ignore next -- defensivo: change.newId está en renames; o
             rename correspondente foi rexistrado en renamePositions tamén. */
          conflictingPosition: acc.renamePositions.get(change.newId) ?? -1,
        })
      }

      acc.renames.set(change.oldId, change.newId)
      acc.renamePositions.set(change.oldId, position)
      return
    }

    case 'add_edge': {
      acc.affectedNodes.add(change.edge.source)
      acc.affectedNodes.add(change.edge.target)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency'])
      trackAdd(acc.addedEdgePositions, change.edge.id, position)
      return
    }

    case 'remove_edge': {
      // Non sabemos source/target sen consultar treeDef; só invalidamos caches.
      // affectedNodes manterase incompleto para este caso — o Reconciler
      // posterior consultará a TreeDef para inferir os nodos afectados.
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency'])
      return
    }

    case 'modify_edge': {
      addCachesForModifyEdge(acc.cachesToInvalidate, change.changes)
      return
    }

    case 'add_group':
    case 'remove_group':
    case 'modify_group':
      addCaches(acc.cachesToInvalidate, ['layout', 'search'])
      return

    case 'add_resource':
      addCaches(acc.cachesToInvalidate, ['stats'])
      return

    case 'modify_layout':
      addCaches(acc.cachesToInvalidate, ['layout'])
      return
  }
}

/**
 * Engade varios CacheType ao set acumulador.
 */
function addCaches(target: Set<CacheType>, types: readonly CacheType[]): void {
  for (const type of types) {
    target.add(type)
  }
}

/**
 * Decide que caches afectar segundo os campos modificados nun modify_node.
 */
function addCachesForModifyNode(target: Set<CacheType>, changes: Record<string, unknown>): void {
  for (const field of Object.keys(changes)) {
    if (LAYOUT_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('layout')
    }
    if (DEPENDENCY_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('dependency')
    }
    if (SEARCH_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('search')
    }
    if (STATS_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('stats')
    }
  }
}

/**
 * Decide que caches afectar segundo os campos modificados nun modify_edge.
 */
function addCachesForModifyEdge(target: Set<CacheType>, changes: Record<string, unknown>): void {
  for (const field of Object.keys(changes)) {
    if (LAYOUT_AFFECTING_EDGE_FIELDS.has(field)) {
      target.add('layout')
    }
    if (DEPENDENCY_AFFECTING_EDGE_FIELDS.has(field)) {
      target.add('dependency')
    }
  }
}

/**
 * Engade unha posición a un mapa de ID → posicións (para detectar duplicados).
 */
function trackAdd(target: Map<string, number[]>, id: string, position: number): void {
  const list = target.get(id) ?? []
  list.push(position)
  target.set(id, list)
}

/**
 * Wrapper class para futuras extensións (memoización, estatísticas, etc.).
 *
 * Por agora é unha capa fina sobre analyzeChanges. Mantense como clase para
 * permitir composición no TreeEngine sen romper APIs cando engada estado interno.
 */
export class ChangeTracker {
  /**
   * Analiza unha lista de cambios.
   */
  analyze(changes: readonly TreeChange[]): ChangeAnalysis {
    return analyzeChanges(changes)
  }
}
// ── FIN: ChangeTracker ──
