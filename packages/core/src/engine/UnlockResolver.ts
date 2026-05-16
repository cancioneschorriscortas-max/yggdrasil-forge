// ── INICIO: UnlockResolver ──
// Avalía UnlockRules contra o estado actual.
// Stateless: recibe todo o necesario por parámetros.

import type { Locale } from '@yggdrasil-forge/common'
import type {
  ConditionEvaluator,
  TreeDef,
  TreeState,
  UnlockCondition,
  UnlockConditionEvaluation,
  UnlockExplanation,
  UnlockRule,
} from '../types/index.js'
import { messages } from './unlockMessages.js'

/**
 * Interface mínima para inxectar un grafo de dependencias.
 * Implementarase completo en sub-fase 1.9 (DependencyGraph).
 */
export interface DependencyGraphLike {
  /**
   * Distancia (en steps de edges) entre dous nodos.
   * Devolve Infinity se non hai camiño.
   */
  distanceBetween(fromId: string, toId: string): number
}

/**
 * Contexto pasado ao UnlockResolver.
 */
export interface UnlockResolverContext {
  readonly treeDef: TreeDef
  readonly state: TreeState
  readonly dependencyGraph?: DependencyGraphLike
  readonly customEvaluators?: ReadonlyMap<string, ConditionEvaluator>
  readonly locale?: Locale
}

/**
 * Avalía UnlockRules e UnlockConditions.
 *
 * Stateless: todos os métodos son puros respecto ao contexto que se pasa.
 *
 * @example
 * const resolver = new UnlockResolver()
 * const canUnlock = resolver.evaluate(
 *   { type: 'all', conditions: [
 *     { type: 'node_unlocked', nodeId: 'a' },
 *     { type: 'resource_min', resourceId: 'xp', amount: 100 },
 *   ] },
 *   { treeDef, state }
 * )
 */
export class UnlockResolver {
  /**
   * Avalía un UnlockRule. Versión rápida (boolean).
   *
   * Usa short-circuit: en 'all' para no primeiro fallo, en 'any' para no primeiro éxito.
   */
  evaluate(rule: UnlockRule, ctx: UnlockResolverContext): boolean {
    // Atómica directa.
    if (this.isAtomic(rule)) {
      return this.evaluateCondition(rule, ctx)
    }

    if (rule.type === 'all') {
      if (rule.conditions.length === 0) {
        return true
      }
      return rule.conditions.every((c) => this.evaluateCondition(c, ctx))
    }

    if (rule.type === 'any') {
      if (rule.conditions.length === 0) {
        return false
      }
      return rule.conditions.some((c) => this.evaluateCondition(c, ctx))
    }

    // rule.type === 'none'
    if (rule.conditions.length === 0) {
      return true
    }
    return !rule.conditions.some((c) => this.evaluateCondition(c, ctx))
  }

  /**
   * Avalía unha condición atómica.
   */
  evaluateCondition(condition: UnlockCondition, ctx: UnlockResolverContext): boolean {
    switch (condition.type) {
      case 'node_unlocked':
        return this.checkNodeUnlocked(condition.nodeId, ctx)

      case 'node_maxed':
        return this.checkNodeMaxed(condition.nodeId, ctx)

      case 'node_state':
        return this.checkNodeState(condition.nodeId, condition.state, ctx)

      case 'nodes_count':
        return this.countUnlockedNodes(condition.scope, ctx) >= condition.count

      case 'resource_min':
        return this.getResource(condition.resourceId, ctx) >= condition.amount

      case 'tier_min':
        return this.getCurrentTier(condition.nodeId, ctx) >= condition.tier

      case 'distance_max':
        return this.checkDistance(condition.fromNodeId, condition.maxSteps, ctx)

      case 'tag_count':
        return this.countNodesWithTag(condition.tag, ctx) >= condition.count

      case 'progress_min':
        return this.getProgress(condition.nodeId, ctx) >= condition.percent

      case 'subtree_completion':
        return this.getSubtreeCompletion(condition.subtreeId, ctx) >= condition.percent

      case 'stat_min':
        return this.getStat(condition.statId, ctx) >= condition.amount

      case 'time_after':
        return Date.now() >= condition.timestamp

      case 'time_before':
        return Date.now() < condition.timestamp

      case 'custom':
        return this.evaluateCustom(condition.evaluator, ctx)
    }
  }

  /**
   * Versión detallada que devolve explicación localizada.
   * Avalía TODAS as condicións (sen short-circuit) para ofrecer feedback completo.
   */
  explain(rule: UnlockRule, ctx: UnlockResolverContext): UnlockExplanation {
    if (this.isAtomic(rule)) {
      const evaluation = this.explainCondition(rule, ctx)
      return {
        satisfied: evaluation.satisfied,
        conditions: [evaluation],
      }
    }

    const evaluations = rule.conditions.map((c) => this.explainCondition(c, ctx))

    let satisfied: boolean
    if (rule.type === 'all') {
      satisfied = evaluations.length === 0 || evaluations.every((e) => e.satisfied)
    } else if (rule.type === 'any') {
      satisfied = evaluations.length > 0 && evaluations.some((e) => e.satisfied)
    } else {
      // none
      satisfied = evaluations.length === 0 || !evaluations.some((e) => e.satisfied)
    }

    return {
      satisfied,
      conditions: evaluations,
    }
  }

  // ───────────────────────────────────────────────
  // Helpers de avaliación individual
  // ───────────────────────────────────────────────

  private explainCondition(
    condition: UnlockCondition,
    ctx: UnlockResolverContext,
  ): UnlockConditionEvaluation {
    switch (condition.type) {
      case 'node_unlocked': {
        const satisfied = this.checkNodeUnlocked(condition.nodeId, ctx)
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodeUnlocked.satisfied(condition.nodeId)
            : messages.nodeUnlocked.notSatisfied(condition.nodeId),
        }
      }

      case 'node_maxed': {
        const satisfied = this.checkNodeMaxed(condition.nodeId, ctx)
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodeMaxed.satisfied(condition.nodeId)
            : messages.nodeMaxed.notSatisfied(condition.nodeId),
        }
      }

      case 'node_state': {
        const satisfied = this.checkNodeState(condition.nodeId, condition.state, ctx)
        const instance = ctx.state.nodes[condition.nodeId]
        const current = instance?.state ?? 'locked'
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodeState.satisfied(condition.nodeId, condition.state)
            : messages.nodeState.notSatisfied(condition.nodeId, condition.state, current),
        }
      }

      case 'nodes_count': {
        const actual = this.countUnlockedNodes(condition.scope, ctx)
        const satisfied = actual >= condition.count
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.nodesCount.satisfied(condition.count, condition.scope)
            : messages.nodesCount.notSatisfied(condition.count, condition.scope, actual),
        }
      }

      case 'resource_min': {
        const current = this.getResource(condition.resourceId, ctx)
        const satisfied = current >= condition.amount
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.resourceMin.satisfied(condition.resourceId, condition.amount)
            : messages.resourceMin.notSatisfied(condition.resourceId, condition.amount, current),
        }
      }

      case 'tier_min': {
        const current = this.getCurrentTier(condition.nodeId, ctx)
        const satisfied = current >= condition.tier
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.tierMin.satisfied(condition.nodeId, condition.tier)
            : messages.tierMin.notSatisfied(condition.nodeId, condition.tier, current),
        }
      }

      case 'distance_max': {
        if (ctx.dependencyGraph === undefined) {
          return {
            condition,
            satisfied: false,
            reason: messages.distanceMax.noGraph(),
          }
        }
        const satisfied = this.checkDistance(condition.fromNodeId, condition.maxSteps, ctx)
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.distanceMax.satisfied(condition.fromNodeId, condition.maxSteps)
            : messages.distanceMax.notSatisfied(condition.fromNodeId, condition.maxSteps),
        }
      }

      case 'tag_count': {
        const actual = this.countNodesWithTag(condition.tag, ctx)
        const satisfied = actual >= condition.count
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.tagCount.satisfied(condition.tag, condition.count)
            : messages.tagCount.notSatisfied(condition.tag, condition.count, actual),
        }
      }

      case 'progress_min': {
        const current = this.getProgress(condition.nodeId, ctx)
        const satisfied = current >= condition.percent
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.progressMin.satisfied(condition.nodeId, condition.percent)
            : messages.progressMin.notSatisfied(condition.nodeId, condition.percent, current),
        }
      }

      case 'subtree_completion': {
        const actual = this.getSubtreeCompletion(condition.subtreeId, ctx)
        const satisfied = actual >= condition.percent
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.subtreeCompletion.satisfied(condition.subtreeId, condition.percent)
            : messages.subtreeCompletion.notSatisfied(
                condition.subtreeId,
                condition.percent,
                actual,
              ),
        }
      }

      case 'stat_min': {
        const current = this.getStat(condition.statId, ctx)
        const satisfied = current >= condition.amount
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.statMin.satisfied(condition.statId, condition.amount)
            : messages.statMin.notSatisfied(condition.statId, condition.amount, current),
        }
      }

      case 'time_after': {
        const satisfied = Date.now() >= condition.timestamp
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.timeAfter.satisfied(condition.timestamp)
            : messages.timeAfter.notSatisfied(condition.timestamp),
        }
      }

      case 'time_before': {
        const satisfied = Date.now() < condition.timestamp
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.timeBefore.satisfied(condition.timestamp)
            : messages.timeBefore.notSatisfied(condition.timestamp),
        }
      }

      case 'custom': {
        if (ctx.customEvaluators === undefined) {
          return {
            condition,
            satisfied: false,
            reason: messages.custom.notRegistered(condition.evaluator),
          }
        }
        const evaluator = ctx.customEvaluators.get(condition.evaluator)
        if (evaluator === undefined) {
          return {
            condition,
            satisfied: false,
            reason: messages.custom.notRegistered(condition.evaluator),
          }
        }
        const satisfied = evaluator({})
        return {
          condition,
          satisfied,
          reason: satisfied
            ? messages.custom.satisfied(condition.evaluator)
            : messages.custom.notSatisfied(condition.evaluator),
        }
      }
    }
  }

  // ───────────────────────────────────────────────
  // Predicados primitivos
  // ───────────────────────────────────────────────

  private isAtomic(rule: UnlockRule): rule is UnlockCondition {
    return rule.type !== 'all' && rule.type !== 'any' && rule.type !== 'none'
  }

  private checkNodeUnlocked(nodeId: string, ctx: UnlockResolverContext): boolean {
    const instance = ctx.state.nodes[nodeId]
    if (instance === undefined) {
      return false
    }
    return instance.state === 'unlocked' || instance.state === 'maxed'
  }

  private checkNodeMaxed(nodeId: string, ctx: UnlockResolverContext): boolean {
    const instance = ctx.state.nodes[nodeId]
    return instance?.state === 'maxed'
  }

  private checkNodeState(nodeId: string, state: string, ctx: UnlockResolverContext): boolean {
    const instance = ctx.state.nodes[nodeId]
    return instance?.state === state
  }

  private countUnlockedNodes(scope: string | undefined, ctx: UnlockResolverContext): number {
    let count = 0
    for (const [nodeId, instance] of Object.entries(ctx.state.nodes)) {
      if (instance.state !== 'unlocked' && instance.state !== 'maxed') {
        continue
      }
      if (scope === undefined) {
        count++
        continue
      }
      // Scope = group ou tag. Procurar no NodeDef.
      const def = ctx.treeDef.nodes.find((n) => n.id === nodeId)
      if (def === undefined) {
        continue
      }
      if (def.group === scope || def.tags?.includes(scope) === true) {
        count++
      }
    }
    return count
  }

  private getResource(resourceId: string, ctx: UnlockResolverContext): number {
    return ctx.state.budget.resources[resourceId] ?? 0
  }

  private getCurrentTier(nodeId: string, ctx: UnlockResolverContext): number {
    return ctx.state.nodes[nodeId]?.currentTier ?? 0
  }

  private checkDistance(fromNodeId: string, maxSteps: number, ctx: UnlockResolverContext): boolean {
    if (ctx.dependencyGraph === undefined) {
      return false
    }
    // Aínda que iso é "distancia DENDE algún nodo unlocked ata aquí",
    // o significado exacto dependerá do TreeEngine ao chamar. Por agora,
    // tomamos a distancia "desde fromNodeId ata algún nodo unlocked".
    // Implementación mínima: comprobar se hai un nodo unlocked a <= maxSteps de fromNodeId.
    for (const [nodeId, instance] of Object.entries(ctx.state.nodes)) {
      if (instance.state !== 'unlocked' && instance.state !== 'maxed') {
        continue
      }
      const distance = ctx.dependencyGraph.distanceBetween(fromNodeId, nodeId)
      if (distance <= maxSteps) {
        return true
      }
    }
    return false
  }

  private countNodesWithTag(tag: string, ctx: UnlockResolverContext): number {
    let count = 0
    for (const [nodeId, instance] of Object.entries(ctx.state.nodes)) {
      if (instance.state !== 'unlocked' && instance.state !== 'maxed') {
        continue
      }
      const def = ctx.treeDef.nodes.find((n) => n.id === nodeId)
      if (def === undefined) {
        continue
      }
      const tags = def.tags
      if (tags === undefined) {
        continue
      }
      if (tags.includes(tag)) {
        count++
      }
    }
    return count
  }

  private getProgress(nodeId: string, ctx: UnlockResolverContext): number {
    return ctx.state.nodes[nodeId]?.progress ?? 0
  }

  private getSubtreeCompletion(subtreeId: string, ctx: UnlockResolverContext): number {
    const subtreeState = ctx.state.subtreeStates?.[subtreeId]
    if (subtreeState === undefined) {
      return 0
    }
    const subtreeDef = ctx.treeDef.subtrees?.[subtreeId]
    if (subtreeDef === undefined || subtreeDef.nodes.length === 0) {
      return 0
    }
    const totalNodes = subtreeDef.nodes.length
    let unlockedCount = 0
    for (const instance of Object.values(subtreeState.nodes)) {
      if (instance.state === 'unlocked' || instance.state === 'maxed') {
        unlockedCount++
      }
    }
    return (unlockedCount / totalNodes) * 100
  }

  private getStat(statId: string, ctx: UnlockResolverContext): number {
    return ctx.state.computedStats?.[statId] ?? 0
  }

  private evaluateCustom(evaluatorId: string, ctx: UnlockResolverContext): boolean {
    const evaluator = ctx.customEvaluators?.get(evaluatorId)
    if (evaluator === undefined) {
      return false
    }
    return evaluator({})
  }
}
// ── FIN: UnlockResolver ──
