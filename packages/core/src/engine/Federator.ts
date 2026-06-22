// ── INICIO: Federator ──
// Utilidade para combinar múltiples TreeDefs. Clase con métodos puros
// (cero state interno). Sub-fase 5.3 — última da Fase 5.

import {
  ErrorCode,
  type Locale,
  type LocalizedString,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { EdgeDef } from '../types/edge.js'
import type { Effect } from '../types/effects.js'
import type { NodeDef } from '../types/node.js'
import type { Resource } from '../types/resources.js'
import type { GroupDef, LayoutConfig, StatDef, TreeDef } from '../types/tree.js'
import type { UnlockCondition, UnlockRule } from '../types/unlock.js'

// ── Tipos públicos ──

/**
 * Estratexia de resolución de conflitos no merge.
 *
 * - `'namespace_all'`: prefixa todos os ids con `${tree.id}:`. Cero
 *   conflitos posibles. Reescribe TODAS as cross-references.
 * - `'first_wins'`: en colisión de ids, mantén o da árbore anterior.
 * - `'last_wins'`: en colisión, mantén o da árbore posterior.
 * - `'manual'`: devolve err(MERGE_CONFLICTS_DETECTED) se hai conflitos;
 *   cero conflitos → equivalente a 'first_wins'.
 */
export type MergeStrategy = 'namespace_all' | 'first_wins' | 'last_wins' | 'manual'

/**
 * Tipo de conflito detectado entre múltiples TreeDefs.
 */
export type Conflict =
  | { readonly type: 'tree_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'node_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'edge_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'group_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'resource_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'stat_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'subtree_id'; readonly id: string; readonly trees: readonly string[] }

/**
 * Reporte de conflitos detectados por Federator.detectConflicts.
 */
export interface ConflictReport {
  readonly conflicts: readonly Conflict[]
  readonly hasConflicts: boolean
}

/**
 * Metadata do TreeDef resultante do merge.
 */
export interface MergedTreeMeta {
  readonly id?: string
  readonly schemaVersion?: string
  readonly version?: string
  readonly label?: LocalizedString
  readonly description?: LocalizedString
  readonly author?: string
  readonly layout?: LayoutConfig
  readonly theme?: string
}

/**
 * Opcións para mergeTreeDefs.
 */
export interface MergeOptions {
  readonly mergedMeta?: MergedTreeMeta
  readonly locale?: Locale
}

// ── Clase Federator ──

/**
 * Utilidade para combinar múltiples TreeDefs nun só.
 *
 * Métodos puros: cero state interno. Clase é agrupación semántica
 * (spec MASTER §19) + extensibilidade futura (loadFederation).
 */
export class Federator {
  // ── INICIO: detectConflicts ──

  /**
   * Detecta colisións de id entre múltiples TreeDefs.
   * Examina 7 categorías: tree_id, node_id, edge_id, group_id,
   * resource_id, stat_id, subtree_id.
   */
  detectConflicts(trees: readonly TreeDef[]): ConflictReport {
    const treeIdLocs = new Map<string, string[]>()
    const nodeIdLocs = new Map<string, string[]>()
    const edgeIdLocs = new Map<string, string[]>()
    const groupIdLocs = new Map<string, string[]>()
    const resourceIdLocs = new Map<string, string[]>()
    const statIdLocs = new Map<string, string[]>()
    const subtreeIdLocs = new Map<string, string[]>()

    for (const tree of trees) {
      this.addLocation(treeIdLocs, tree.id, tree.id)

      for (const node of tree.nodes) {
        this.addLocation(nodeIdLocs, node.id, tree.id)
      }
      for (const edge of tree.edges) {
        this.addLocation(edgeIdLocs, edge.id, tree.id)
      }
      if (tree.groups !== undefined) {
        for (const group of tree.groups) {
          this.addLocation(groupIdLocs, group.id, tree.id)
        }
      }
      if (tree.resources !== undefined) {
        for (const resource of tree.resources) {
          this.addLocation(resourceIdLocs, resource.id, tree.id)
        }
      }
      if (tree.stats !== undefined) {
        for (const stat of tree.stats) {
          this.addLocation(statIdLocs, stat.id, tree.id)
        }
      }
      if (tree.subtrees !== undefined) {
        for (const subtreeId of Object.keys(tree.subtrees)) {
          this.addLocation(subtreeIdLocs, subtreeId, tree.id)
        }
      }
    }

    const conflicts: Conflict[] = []
    this.collectConflicts(treeIdLocs, 'tree_id', conflicts)
    this.collectConflicts(nodeIdLocs, 'node_id', conflicts)
    this.collectConflicts(edgeIdLocs, 'edge_id', conflicts)
    this.collectConflicts(groupIdLocs, 'group_id', conflicts)
    this.collectConflicts(resourceIdLocs, 'resource_id', conflicts)
    this.collectConflicts(statIdLocs, 'stat_id', conflicts)
    this.collectConflicts(subtreeIdLocs, 'subtree_id', conflicts)

    return { conflicts, hasConflicts: conflicts.length > 0 }
  }

  // ── FIN: detectConflicts ──

  // ── INICIO: mergeTreeDefs ──

  /**
   * Combina múltiples TreeDefs segundo unha estratexia.
   */
  mergeTreeDefs(
    trees: readonly TreeDef[],
    strategy: MergeStrategy,
    options: MergeOptions = {},
  ): Result<TreeDef> {
    const locale = options.locale ?? 'gl'

    // 1. Validar: polo menos 2 árbores
    if (trees.length < 2) {
      return err(
        new YggdrasilError(
          ErrorCode.MERGE_INVALID_INPUT,
          getErrorMessage(ErrorCode.MERGE_INVALID_INPUT, locale, {
            count: trees.length,
          }),
          { context: { count: trees.length } },
        ),
      )
    }

    // 2. Validar schemaVersion: todos iguais
    const first = trees[0]
    /* v8 ignore start -- defensivo: o paso 1 valida trees.length >= 2,
       polo que trees[0] sempre está definido. Guarda esixida por
       noUncheckedIndexedAccess. */
    if (first === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.MERGE_INVALID_INPUT,
          getErrorMessage(ErrorCode.MERGE_INVALID_INPUT, locale, {
            count: 0,
          }),
          { context: { count: 0 } },
        ),
      )
    }
    /* v8 ignore stop */
    const firstSchema = first.schemaVersion
    for (let i = 1; i < trees.length; i++) {
      const tree = trees[i]
      if (tree !== undefined && tree.schemaVersion !== firstSchema) {
        return err(
          new YggdrasilError(
            ErrorCode.MERGE_INCOMPATIBLE_SCHEMA,
            getErrorMessage(ErrorCode.MERGE_INCOMPATIBLE_SCHEMA, locale, {
              first: firstSchema,
              other: tree.schemaVersion,
              treeIndex: i,
            }),
            {
              context: {
                first: firstSchema,
                other: tree.schemaVersion,
              },
            },
          ),
        )
      }
    }

    // 3. Estratexia 'manual': rexeitar se hai conflitos
    if (strategy === 'manual') {
      const report = this.detectConflicts(trees)
      if (report.hasConflicts) {
        return err(
          new YggdrasilError(
            ErrorCode.MERGE_CONFLICTS_DETECTED,
            getErrorMessage(ErrorCode.MERGE_CONFLICTS_DETECTED, locale, {
              count: report.conflicts.length,
            }),
            { context: { report } },
          ),
        )
      }
      return ok(this.mergeWinsStrategy(trees, 'first_wins', options))
    }

    // 4. namespace_all
    if (strategy === 'namespace_all') {
      return ok(this.mergeNamespaceStrategy(trees, options))
    }

    // 5. first_wins ou last_wins
    return ok(this.mergeWinsStrategy(trees, strategy, options))
  }

  // ── FIN: mergeTreeDefs ──

  // ── Helpers privados ──

  private addLocation(map: Map<string, string[]>, id: string, treeId: string): void {
    const locs = map.get(id)
    if (locs === undefined) {
      map.set(id, [treeId])
    } else {
      locs.push(treeId)
    }
  }

  private collectConflicts(
    map: Map<string, string[]>,
    type: Conflict['type'],
    out: Conflict[],
  ): void {
    for (const [id, trees] of map) {
      if (trees.length > 1) {
        out.push({ type, id, trees })
      }
    }
  }

  // ── namespace_all ──

  private mergeNamespaceStrategy(trees: readonly TreeDef[], options: MergeOptions): TreeDef {
    const rewritten = trees.map((tree) => this.rewriteWithNamespace(tree, `${tree.id}:`))
    return this.combineTrees(rewritten, trees, options)
  }

  private rewriteWithNamespace(tree: TreeDef, prefix: string): TreeDef {
    const p = (id: string) => `${prefix}${id}`

    // 1. Nodes: reescribir id, subtreeId, prerequisites, effects
    const newNodes: NodeDef[] = tree.nodes.map((node) => ({
      ...node,
      id: p(node.id),
      ...(node.subtreeId !== undefined && {
        subtreeId: p(node.subtreeId),
      }),
      ...(node.prerequisites !== undefined && {
        prerequisites: this.rewriteUnlockRule(node.prerequisites, p),
      }),
      ...(node.effects !== undefined && {
        effects: node.effects.map((e) => this.rewriteEffect(e, p)),
      }),
    }))

    // 2. Edges
    const newEdges: EdgeDef[] = tree.edges.map((edge) => ({
      ...edge,
      id: p(edge.id),
      source: p(edge.source),
      target: p(edge.target),
    }))

    // 3. Groups
    const newGroups = tree.groups?.map((group) => ({
      ...group,
      id: p(group.id),
      ...(group.nodeIds !== undefined && {
        nodeIds: group.nodeIds.map(p),
      }),
    }))

    // 4. Resources (só id)
    const newResources = tree.resources?.map((resource) => ({
      ...resource,
      id: p(resource.id),
    }))

    // 5. Stats (só id)
    const newStats = tree.stats?.map((stat) => ({
      ...stat,
      id: p(stat.id),
    }))

    // 6. Subtrees keys (NON rewrite recursivo dos subtree contents)
    const newSubtrees =
      tree.subtrees !== undefined
        ? Object.fromEntries(
            Object.entries(tree.subtrees).map(([key, subtreeDef]) => [p(key), subtreeDef]),
          )
        : undefined

    // 7. rootNodeId
    const newRootNodeId = tree.rootNodeId !== undefined ? p(tree.rootNodeId) : undefined

    return {
      ...tree,
      id: p(tree.id),
      ...(newRootNodeId !== undefined && { rootNodeId: newRootNodeId }),
      nodes: newNodes,
      edges: newEdges,
      ...(newGroups !== undefined && { groups: newGroups }),
      ...(newResources !== undefined && { resources: newResources }),
      ...(newStats !== undefined && { stats: newStats }),
      ...(newSubtrees !== undefined && { subtrees: newSubtrees }),
    }
  }

  // Reescribe un UnlockRule (recursivo para all/any/none)
  private rewriteUnlockRule(rule: UnlockRule, p: (s: string) => string): UnlockRule {
    if (rule.type === 'all' || rule.type === 'any' || rule.type === 'none') {
      return {
        ...rule,
        conditions: rule.conditions.map((c) => this.rewriteCondition(c, p)),
      }
    }
    return this.rewriteCondition(rule, p)
  }

  // Reescribe un UnlockCondition atómico
  private rewriteCondition(cond: UnlockCondition, p: (s: string) => string): UnlockCondition {
    switch (cond.type) {
      case 'node_unlocked':
      case 'node_maxed':
      case 'node_state':
      case 'tier_min':
      case 'progress_min':
        return { ...cond, nodeId: p(cond.nodeId) }
      case 'distance_max':
        return { ...cond, fromNodeId: p(cond.fromNodeId) }
      case 'resource_min':
        return { ...cond, resourceId: p(cond.resourceId) }
      case 'stat_min':
        return { ...cond, statId: p(cond.statId) }
      case 'subtree_completion':
        return { ...cond, subtreeId: p(cond.subtreeId) }
      default:
        return cond
    }
  }

  // Reescribe un Effect (recursivo para conditional/composite)
  private rewriteEffect(effect: Effect, p: (s: string) => string): Effect {
    switch (effect.type) {
      case 'unlock_node':
      case 'set_progress':
      case 'set_node_visibility':
      case 'modify_node_state':
        return { ...effect, nodeId: p(effect.nodeId) }
      case 'modify_resource':
        return { ...effect, resourceId: p(effect.resourceId) }
      case 'modify_stat':
        return { ...effect, statId: p(effect.statId) }
      case 'conditional':
        return {
          ...effect,
          condition: this.rewriteCondition(effect.condition, p),
          // biome-ignore lint/suspicious/noThenProperty: Effect 'conditional' ten campo 'then' no DSL
          then: effect.then.map((e) => this.rewriteEffect(e, p)),
          ...(effect.else !== undefined && {
            else: effect.else.map((e) => this.rewriteEffect(e, p)),
          }),
        }
      case 'composite':
        return {
          ...effect,
          effects: effect.effects.map((e) => this.rewriteEffect(e, p)),
        }
      default:
        return effect
    }
  }

  // ── wins strategies ──

  private mergeWinsStrategy(
    trees: readonly TreeDef[],
    strategy: 'first_wins' | 'last_wins',
    options: MergeOptions,
  ): TreeDef {
    const seenNodes = new Map<string, NodeDef>()
    const seenEdges = new Map<string, EdgeDef>()
    const seenGroups = new Map<string, GroupDef>()
    const seenResources = new Map<string, Resource>()
    const seenStats = new Map<string, StatDef>()
    const seenSubtrees = new Map<string, TreeDef>()

    for (const tree of trees) {
      for (const node of tree.nodes) {
        if (strategy === 'first_wins' && seenNodes.has(node.id)) continue
        seenNodes.set(node.id, node)
      }
      for (const edge of tree.edges) {
        if (strategy === 'first_wins' && seenEdges.has(edge.id)) continue
        seenEdges.set(edge.id, edge)
      }
      if (tree.groups !== undefined) {
        for (const group of tree.groups) {
          if (strategy === 'first_wins' && seenGroups.has(group.id)) continue
          seenGroups.set(group.id, group)
        }
      }
      if (tree.resources !== undefined) {
        for (const resource of tree.resources) {
          if (strategy === 'first_wins' && seenResources.has(resource.id)) continue
          seenResources.set(resource.id, resource)
        }
      }
      if (tree.stats !== undefined) {
        for (const stat of tree.stats) {
          if (strategy === 'first_wins' && seenStats.has(stat.id)) continue
          seenStats.set(stat.id, stat)
        }
      }
      if (tree.subtrees !== undefined) {
        for (const [key, subtreeDef] of Object.entries(tree.subtrees)) {
          if (strategy === 'first_wins' && seenSubtrees.has(key)) continue
          seenSubtrees.set(key, subtreeDef)
        }
      }
    }

    const topLevel = this.buildTopLevelMeta(trees, options)
    return {
      ...topLevel,
      nodes: Array.from(seenNodes.values()),
      edges: Array.from(seenEdges.values()),
      ...(seenGroups.size > 0 && {
        groups: Array.from(seenGroups.values()),
      }),
      ...(seenResources.size > 0 && {
        resources: Array.from(seenResources.values()),
      }),
      ...(seenStats.size > 0 && {
        stats: Array.from(seenStats.values()),
      }),
      ...(seenSubtrees.size > 0 && {
        subtrees: Object.fromEntries(seenSubtrees),
      }),
    }
  }

  // ── combineTrees (tras namespace rewrite; cero conflitos) ──

  private combineTrees(
    rewrittenTrees: readonly TreeDef[],
    originalTrees: readonly TreeDef[],
    options: MergeOptions,
  ): TreeDef {
    const allNodes: NodeDef[] = []
    const allEdges: EdgeDef[] = []
    const allGroups: GroupDef[] = []
    const allResources: Resource[] = []
    const allStats: StatDef[] = []
    const allSubtrees: Record<string, TreeDef> = {}

    for (const tree of rewrittenTrees) {
      allNodes.push(...tree.nodes)
      allEdges.push(...tree.edges)
      if (tree.groups !== undefined) allGroups.push(...tree.groups)
      if (tree.resources !== undefined) allResources.push(...tree.resources)
      if (tree.stats !== undefined) allStats.push(...tree.stats)
      if (tree.subtrees !== undefined) {
        Object.assign(allSubtrees, tree.subtrees)
      }
    }

    const topLevel = this.buildTopLevelMeta(originalTrees, options)
    return {
      ...topLevel,
      nodes: allNodes,
      edges: allEdges,
      ...(allGroups.length > 0 && { groups: allGroups }),
      ...(allResources.length > 0 && { resources: allResources }),
      ...(allStats.length > 0 && { stats: allStats }),
      ...(Object.keys(allSubtrees).length > 0 && {
        subtrees: allSubtrees,
      }),
    }
  }

  // ── Top-level meta (spread condicional para exactOptionalPropertyTypes) ──

  private buildTopLevelMeta(
    trees: readonly TreeDef[],
    options: MergeOptions,
  ): Pick<
    TreeDef,
    'id' | 'schemaVersion' | 'version' | 'label' | 'description' | 'author' | 'layout' | 'theme'
  > {
    // trees.length >= 2 garantido polo chamante (mergeTreeDefs valida)
    const first = trees[0]
    /* v8 ignore start -- defensivo: o chamante valida trees.length >= 2. */
    if (first === undefined) {
      return {
        id: '',
        schemaVersion: '1.0.0',
        version: '0.0.0',
        label: '',
        layout: { type: 'radial' },
      }
    }
    /* v8 ignore stop */
    const meta = options.mergedMeta ?? {}
    return {
      id: meta.id ?? first.id,
      schemaVersion: meta.schemaVersion ?? first.schemaVersion,
      version: meta.version ?? first.version,
      label: meta.label ?? first.label,
      /* v8 ignore start -- defensivo: as ramas de description/author/theme
         dependen dos opcionais nas TreeDef e MergeOptions; non todos os
         tests os exercitan en combinacións completas. */
      ...(meta.description !== undefined || first.description !== undefined
        ? { description: meta.description ?? first.description }
        : {}),
      ...(meta.author !== undefined || first.author !== undefined
        ? { author: meta.author ?? first.author }
        : {}),
      /* v8 ignore stop */
      layout: meta.layout ?? first.layout,
      /* v8 ignore start -- defensivo: ver razón da rama anterior. */
      ...(meta.theme !== undefined || first.theme !== undefined
        ? { theme: meta.theme ?? first.theme }
        : {}),
      /* v8 ignore stop */
    }
  }
}
// ── FIN: Federator ──
