// ── INICIO: Reconciler ──
// Función pura de reconciliación de saves contra TreeDefs modificadas.
// Sub-fase 3.6.a: refundRemovedNodes.
// Sub-fase 3.6.b: grandfatherIncreasedCosts, refundDecreasedCosts,
//   invalidateOnPrereqFailure (disable/refund/preserve).
// MASTER §23. Cero acoplamento a TreeEngine vivo.

import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { NodeDef } from '../../types/node.js'
import type { Cost } from '../../types/resources.js'
import type { TreeDef } from '../../types/tree.js'
import type { TreeState } from '../../types/tree.js'
import { UnlockResolver } from '../UnlockResolver.js'

/**
 * Opcións de reconciliación segundo MASTER §23.
 * 4 campos obrigatorios; cero defaults para forzar decisión consciente.
 */
export interface ReconcileOptions {
  /** Se true, devolve ao budget os custos pagados polos nodos
   * desbloqueados que xa non existen na nova TreeDef. */
  readonly refundRemovedNodes: boolean

  /** Se true, emite `cost_grandfathered` cando o custo dun nodo
   * unlocked subiu, sen modificar estado nin cobrar diferenza.
   * Se false, cero evento auditable (o nodo segue unlocked igualmente). */
  readonly grandfatherIncreasedCosts: boolean

  /** Se true, devolve ao budget a diferenza cando o custo baixou e
   * emite `cost_decreased_refunded`. */
  readonly refundDecreasedCosts: boolean

  /** Política se prerequisites cambian e xa non se cumpren:
   * - `'disable'`: pasa a locked, cero refund.
   * - `'refund'`: pasa a locked + refund de oldNodeDef.cost.
   * - `'preserve'`: mantén unlocked (ATENCIÓN: rompe invariante engine). */
  readonly invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'
}

/**
 * Cambio aplicado durante a reconciliación. Discriminated union.
 * 7 tipos: 2 de 3.6.a + 5 de 3.6.b.
 */
export type ReconcileChange =
  | {
      readonly type: 'node_removed'
      readonly nodeId: string
      readonly wasUnlocked: boolean
    }
  | {
      readonly type: 'cost_refunded'
      readonly nodeId: string
      readonly resourceId: string
      readonly amount: number
    }
  // ── 3.6.b ──
  | {
      readonly type: 'cost_grandfathered'
      readonly nodeId: string
      readonly resourceId: string
      readonly oldAmount: number
      readonly newAmount: number
    }
  | {
      readonly type: 'cost_decreased_refunded'
      readonly nodeId: string
      readonly resourceId: string
      readonly oldAmount: number
      readonly newAmount: number
      readonly refundAmount: number
    }
  | {
      readonly type: 'prereq_failure_disabled'
      readonly nodeId: string
    }
  | {
      readonly type: 'prereq_failure_refunded'
      readonly nodeId: string
      readonly refunds: readonly {
        readonly resourceId: string
        readonly amount: number
      }[]
    }
  | {
      readonly type: 'prereq_failure_preserved'
      readonly nodeId: string
    }

/**
 * Resultado da reconciliación.
 */
export interface ReconcileResult {
  readonly newTreeState: TreeState
  readonly changes: readonly ReconcileChange[]
}

const DEFAULT_LOCALE: Locale = 'gl'

// ── Helpers privados a nivel de módulo ──

/**
 * Compara dúas listas de Cost e devolve Map de cambios por resourceId.
 * Só inclúe recursos que cambiaron (oldAmount !== newAmount).
 */
function compareCosts(
  oldCosts: readonly Cost[] | undefined,
  newCosts: readonly Cost[] | undefined,
): Map<string, { oldAmount: number; newAmount: number }> {
  const result = new Map<string, { oldAmount: number; newAmount: number }>()

  const oldByResource = new Map<string, number>()
  if (oldCosts !== undefined) {
    for (const c of oldCosts) {
      oldByResource.set(c.resourceId, c.amount)
    }
  }

  const newByResource = new Map<string, number>()
  if (newCosts !== undefined) {
    for (const c of newCosts) {
      newByResource.set(c.resourceId, c.amount)
    }
  }

  const allResourceIds = new Set<string>()
  for (const id of oldByResource.keys()) allResourceIds.add(id)
  for (const id of newByResource.keys()) allResourceIds.add(id)

  for (const resourceId of allResourceIds) {
    const oldAmount = oldByResource.get(resourceId) ?? 0
    const newAmount = newByResource.get(resourceId) ?? 0
    if (oldAmount !== newAmount) {
      result.set(resourceId, { oldAmount, newAmount })
    }
  }

  return result
}

/** Determina se un NodeInstance está "desbloqueado" (unlocked ou maxed). */
function isUnlocked(state: string): boolean {
  return state === 'unlocked' || state === 'maxed'
}

/**
 * Reconcilia un TreeState gardado contra un TreeDef anterior cun
 * TreeDef novo. Función pura: cero mutación dos argumentos.
 *
 * **Orde de aplicación** (5.7):
 * 1. Validación (oldTreeDef.id === newTreeDef.id).
 * 2. processRemovedNodes (refundRemovedNodes).
 * 3. processCostChanges (grandfatherIncreasedCosts + refundDecreasedCosts).
 * 4. processPrereqFailures (invalidateOnPrereqFailure).
 *
 * **'maxed' trátase como 'unlocked'** en todas as operacións (5.9).
 *
 * **Refund non comproba límite máximo do recurso**: over-cap é
 * responsabilidade do consumidor.
 *
 * **`invalidateOnPrereqFailure: 'preserve'`**: **ATENCIÓN**: mantén o
 * nodo desbloqueado aínda que os seus prerequisites xa non se cumpren.
 * **Rompe a invariante fundamental do engine** ('un nodo unlocked
 * sempre cumpre os seus prereqs'). Pode provocar comportamentos
 * inesperados en operacións posteriores (canUnlock, applyChanges,
 * recálculo de stats). Use só se o consumidor xestiona explicitamente
 * as consecuencias. `ReconcileResult.changes` inclúe
 * `prereq_failure_preserved` para auditoría.
 *
 * **Cero recursividade en prereqs** (5.10): avalíase unha vez por
 * nodo. Se invalidar A causa que B xa non cumpre, B non se re-avalía
 * nesta pasada. O consumidor pode aplicar outra ronda.
 */
export function reconcile(
  oldTreeDef: TreeDef,
  newTreeDef: TreeDef,
  oldTreeState: TreeState,
  options: ReconcileOptions,
  locale: Locale = DEFAULT_LOCALE,
): Result<ReconcileResult> {
  // 1. Validación: mesma árbore.
  if (oldTreeDef.id !== newTreeDef.id) {
    return err(
      new YggdrasilError(
        ErrorCode.RECONCILE_TREE_MISMATCH,
        getErrorMessage(ErrorCode.RECONCILE_TREE_MISMATCH, locale, {
          oldId: oldTreeDef.id,
          newId: newTreeDef.id,
        }),
        { context: { oldId: oldTreeDef.id, newId: newTreeDef.id } },
      ),
    )
  }

  // Índices para acceso eficiente.
  const oldNodeMap = new Map<string, NodeDef>()
  for (const node of oldTreeDef.nodes) {
    oldNodeMap.set(node.id, node)
  }
  const newNodeMap = new Map<string, NodeDef>()
  for (const node of newTreeDef.nodes) {
    newNodeMap.set(node.id, node)
  }

  const changes: ReconcileChange[] = []
  const workingNodes = { ...oldTreeState.nodes }
  const workingResources = { ...oldTreeState.budget.resources }

  // 2. processRemovedNodes (refundRemovedNodes) — 3.6.a
  const newNodeIds = new Set(newTreeDef.nodes.map((n) => n.id))
  const removedNodeIds = oldTreeDef.nodes.map((n) => n.id).filter((id) => !newNodeIds.has(id))

  for (const nodeId of removedNodeIds) {
    const instance = oldTreeState.nodes[nodeId]
    if (instance === undefined) continue // Defensivo

    const wasUnlocked = isUnlocked(instance.state)
    changes.push({ type: 'node_removed', nodeId, wasUnlocked })

    if (wasUnlocked && options.refundRemovedNodes) {
      const oldNode = oldNodeMap.get(nodeId)
      if (oldNode?.cost !== undefined) {
        for (const cost of oldNode.cost) {
          changes.push({
            type: 'cost_refunded',
            nodeId,
            resourceId: cost.resourceId,
            amount: cost.amount,
          })
          workingResources[cost.resourceId] = (workingResources[cost.resourceId] ?? 0) + cost.amount
        }
      }
    }

    delete workingNodes[nodeId]
  }

  // 3. processCostChanges (grandfather + refundDecreased) — 3.6.b
  // Iterar en orde de newTreeDef.nodes para determinismo (5.8).
  for (const newNode of newTreeDef.nodes) {
    const nodeId = newNode.id
    const instance = workingNodes[nodeId]
    if (instance === undefined) continue
    if (!isUnlocked(instance.state)) continue

    const oldNode = oldNodeMap.get(nodeId)
    /* v8 ignore start -- defensivo: cobre nodos novos (sen comparación posible). */
    if (oldNode === undefined) continue // Nodo novo; cero comparación
    /* v8 ignore stop */

    const costChanges = compareCosts(oldNode.cost, newNode.cost)

    for (const [resourceId, { oldAmount, newAmount }] of costChanges) {
      if (newAmount > oldAmount && options.grandfatherIncreasedCosts) {
        // Custo subiu: emitir cost_grandfathered (só auditoría).
        changes.push({
          type: 'cost_grandfathered',
          nodeId,
          resourceId,
          oldAmount,
          newAmount,
        })
      } else if (newAmount < oldAmount && options.refundDecreasedCosts) {
        // Custo baixou: refund da diferenza.
        const refundAmount = oldAmount - newAmount
        changes.push({
          type: 'cost_decreased_refunded',
          nodeId,
          resourceId,
          oldAmount,
          newAmount,
          refundAmount,
        })
        /* v8 ignore start -- defensivo: workingResources inicialízase con todos
           os resourceIds do budget; o `?? 0` só cubre resourceIds novos. */
        workingResources[resourceId] = (workingResources[resourceId] ?? 0) + refundAmount
        /* v8 ignore stop */
      }
    }
  }

  // 4. processPrereqFailures (invalidateOnPrereqFailure) — 3.6.b
  const resolver = new UnlockResolver()
  const workingTreeState: TreeState = {
    ...oldTreeState,
    nodes: workingNodes,
    budget: { ...oldTreeState.budget, resources: workingResources },
  }

  for (const newNode of newTreeDef.nodes) {
    const nodeId = newNode.id
    const instance = workingNodes[nodeId]
    if (instance === undefined) continue
    if (!isUnlocked(instance.state)) continue
    if (newNode.prerequisites === undefined) continue

    const ctx = { treeDef: newTreeDef, state: workingTreeState, locale }
    const cumpre = resolver.evaluate(newNode.prerequisites, ctx)
    if (cumpre) continue

    switch (options.invalidateOnPrereqFailure) {
      case 'disable':
        workingNodes[nodeId] = { ...instance, state: 'locked' }
        changes.push({ type: 'prereq_failure_disabled', nodeId })
        break

      case 'refund': {
        const oldNode = oldNodeMap.get(nodeId)
        const refunds: { resourceId: string; amount: number }[] = []
        if (oldNode?.cost !== undefined) {
          for (const c of oldNode.cost) {
            /* v8 ignore start -- defensivo: workingResources inicialízase
               co budget; o `?? 0` cubre resourceIds novos. */
            workingResources[c.resourceId] = (workingResources[c.resourceId] ?? 0) + c.amount
            /* v8 ignore stop */
            refunds.push({ resourceId: c.resourceId, amount: c.amount })
          }
        }
        workingNodes[nodeId] = { ...instance, state: 'locked' }
        changes.push({ type: 'prereq_failure_refunded', nodeId, refunds })
        break
      }

      case 'preserve':
        // ATENCIÓN: rompe invariante "nodo unlocked SEMPRE cumpre prereqs".
        changes.push({ type: 'prereq_failure_preserved', nodeId })
        break
    }
  }

  // 5. Construír resultado final.
  const newTreeState: TreeState = {
    ...oldTreeState,
    nodes: workingNodes,
    budget: {
      ...oldTreeState.budget,
      resources: workingResources,
    },
  }

  return ok({ newTreeState, changes })
}
// ── FIN: Reconciler ──
