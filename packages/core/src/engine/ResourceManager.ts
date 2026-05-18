// -- INICIO: ResourceManager --
// Xestion da economia da arbore: budget, custos, refunds.
// Inmutable: nunca muta o Budget recibido; devolve un novo.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Budget, Cost, NodeDef, Resource, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'

export class ResourceManager {
  private readonly resourcesById: Map<string, Resource>

  constructor(resources: readonly Resource[] = []) {
    this.resourcesById = new Map<string, Resource>()
    for (const resource of resources) {
      this.resourcesById.set(resource.id, resource)
    }
  }

  canAfford(costs: readonly Cost[], budget: Budget): boolean {
    // Custo negativo → inválido; non se pode pagar
    if (costs.some((c) => c.amount < 0)) {
      return false
    }
    const required = this.aggregateCosts(costs)
    for (const [resourceId, amount] of required.entries()) {
      const available = budget.resources[resourceId] ?? 0
      if (available < amount) {
        return false
      }
    }
    return true
  }

  applyCost(costs: readonly Cost[], budget: Budget): Result<Budget> {
    // Detectar custos negativos antes de agregar para reportar o valor real (DT-6)
    const negativeCost = costs.find((c) => c.amount < 0)
    if (negativeCost !== undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_COST,
          getErrorMessage(ErrorCode.INVALID_COST, 'gl', {
            amount: String(negativeCost.amount),
          }),
          { context: { amount: negativeCost.amount, resourceId: negativeCost.resourceId } },
        ),
      )
    }
    const required = this.aggregateCosts(costs)

    for (const [resourceId, amount] of required.entries()) {
      const available = budget.resources[resourceId] ?? 0
      if (available < amount) {
        return err(
          new YggdrasilError(
            ErrorCode.INSUFFICIENT_RESOURCES,
            getErrorMessage(ErrorCode.INSUFFICIENT_RESOURCES, 'gl', {
              needed: String(amount),
              resourceId,
              available: String(available),
            }),
          ),
        )
      }
    }

    const nextResources: Record<string, number> = { ...budget.resources }
    for (const [resourceId, amount] of required.entries()) {
      const available = nextResources[resourceId] ?? 0
      nextResources[resourceId] = available - amount
    }

    return ok({ resources: nextResources })
  }

  refund(costs: readonly Cost[], budget: Budget): Budget {
    const nextResources: Record<string, number> = { ...budget.resources }

    for (const cost of costs) {
      if (cost.amount <= 0) {
        continue
      }
      const resource = this.resourcesById.get(cost.resourceId)
      if (resource === undefined) {
        continue
      }
      if (resource.refundable !== true) {
        continue
      }
      const percent = resource.refundPercent ?? 100
      const refundAmount = (cost.amount * percent) / 100
      const current = nextResources[cost.resourceId] ?? 0
      let updated = current + refundAmount
      if (resource.max !== undefined && updated > resource.max) {
        updated = resource.max
      }
      nextResources[cost.resourceId] = updated
    }

    return { resources: nextResources }
  }

  getCostForTier(nodeDef: NodeDef, tier: number): readonly Cost[] {
    if (tier <= 0) {
      return []
    }
    const perTier = nodeDef.costPerTier
    if (perTier !== undefined) {
      const entry = perTier[tier - 1]
      if (entry !== undefined) {
        return entry
      }
    }
    if (nodeDef.cost !== undefined) {
      return nodeDef.cost
    }
    return []
  }

  getTotalCost(nodeDef: NodeDef, fromTier: number, toTier: number): readonly Cost[] {
    if (fromTier >= toTier) {
      return []
    }
    const accumulated = new Map<string, number>()
    for (let tier = fromTier + 1; tier <= toTier; tier++) {
      const tierCost = this.getCostForTier(nodeDef, tier)
      for (const cost of tierCost) {
        const previous = accumulated.get(cost.resourceId) ?? 0
        accumulated.set(cost.resourceId, previous + cost.amount)
      }
    }
    const result: Cost[] = []
    for (const [resourceId, amount] of accumulated.entries()) {
      result.push({ resourceId, amount })
    }
    return result
  }

  private aggregateCosts(costs: readonly Cost[]): Map<string, number> {
    const aggregated = new Map<string, number>()
    for (const cost of costs) {
      if (cost.amount < 0) {
        // Os custos negativos detéctanse antes en applyCost; aquí ignorámolos
        continue
      }
      const previous = aggregated.get(cost.resourceId) ?? 0
      aggregated.set(cost.resourceId, previous + cost.amount)
    }
    return aggregated
  }
}
// -- FIN: ResourceManager --
