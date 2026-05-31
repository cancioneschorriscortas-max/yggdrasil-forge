// ── INICIO: Reconciler ──
// Función pura de reconciliación de saves contra TreeDefs modificadas.
// Sub-fase 3.6.a: só refundRemovedNodes implementado.
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
import type { Cost } from '../../types/resources.js'
import type { TreeDef } from '../../types/tree.js'
import type { TreeState } from '../../types/tree.js'

/**
 * Opcións de reconciliación segundo MASTER §23.
 * 4 campos obrigatorios; cero defaults para forzar decisión consciente.
 *
 * **3.6.a**: só `refundRemovedNodes` é efectivo. As outras 3 opcións
 * acéptanse na interface pero non afectan o comportamento aínda.
 * Serán efectivas na sub-fase 3.6.b.
 */
export interface ReconcileOptions {
  /** Se true, devolve ao budget os custos pagados polos nodos
   * desbloqueados que xa non existen na nova TreeDef. */
  readonly refundRemovedNodes: boolean

  /** Se true, mantén o estado "desbloqueado" dos nodos cuxo custo subiu
   * na nova TreeDef sen cobrar a diferenza. NON implementado en 3.6.a. */
  readonly grandfatherIncreasedCosts: boolean

  /** Se true, devolve ao budget a diferenza cando o custo baixa.
   * NON implementado en 3.6.a. */
  readonly refundDecreasedCosts: boolean

  /** Política se prerequisites cambian e xa non se cumpren.
   * NON implementado en 3.6.a. */
  readonly invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'
}

/**
 * Cambio aplicado durante a reconciliación. Discriminated union.
 *
 * **3.6.a**: só `'node_removed'` e `'cost_refunded'` se emiten.
 * Outros tipos engadiranse en 3.6.b.
 */
export type ReconcileChange =
  | {
      readonly type: 'node_removed'
      readonly nodeId: string
      /** Se o nodo estaba en estado 'unlocked' antes da eliminación. */
      readonly wasUnlocked: boolean
    }
  | {
      readonly type: 'cost_refunded'
      readonly nodeId: string
      readonly resourceId: string
      readonly amount: number
    }

/**
 * Resultado da reconciliación.
 */
export interface ReconcileResult {
  /** TreeState actualizado para a nova TreeDef. */
  readonly newTreeState: TreeState

  /** Lista de cambios aplicados, en orde determinista. */
  readonly changes: readonly ReconcileChange[]
}

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Reconcilia un TreeState gardado contra un TreeDef anterior cun
 * TreeDef novo. Función pura: cero mutación dos argumentos.
 *
 * **3.6.a**: só `refundRemovedNodes` das 4 opcións é efectivo.
 * As outras 3 opcións (`grandfatherIncreasedCosts`,
 * `refundDecreasedCosts`, `invalidateOnPrereqFailure`) acéptanse
 * na sinatura pero non afectan o resultado aínda. Serán
 * implementadas na sub-fase 3.6.b.
 *
 * **Refund non comproba límite máximo do recurso**: o fenómeno de
 * "over-cap" é responsabilidade do consumidor ou sub-fase futura.
 *
 * @param oldTreeDef - TreeDef contra a que se gardou o TreeState.
 * @param newTreeDef - TreeDef nova á que se quere migrar o save.
 * @param oldTreeState - TreeState gardado contra oldTreeDef.
 * @param options - Opcións de reconciliación (MASTER §23).
 * @param locale - Locale para mensaxes de erro. Default: 'gl'.
 * @returns ok(ReconcileResult) con TreeState actualizado e cambios.
 */
export function reconcile(
  oldTreeDef: TreeDef,
  newTreeDef: TreeDef,
  oldTreeState: TreeState,
  options: ReconcileOptions,
  locale: Locale = DEFAULT_LOCALE,
): Result<ReconcileResult> {
  // 1. Validación: mesma árbore, distintas versións.
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

  // 2. Identificar nodos eliminados.
  const newNodeIds = new Set(newTreeDef.nodes.map((n) => n.id))
  const removedNodeIds = oldTreeDef.nodes.map((n) => n.id).filter((id) => !newNodeIds.has(id))

  // Índice de custos dos nodos antigos para acceso eficiente.
  const oldCostsByNodeId = new Map<string, readonly Cost[]>()
  for (const node of oldTreeDef.nodes) {
    if (node.cost !== undefined && node.cost.length > 0) {
      oldCostsByNodeId.set(node.id, node.cost)
    }
  }

  // 3. Procesar nodos eliminados.
  const changes: ReconcileChange[] = []
  const refunds: Array<{ resourceId: string; amount: number }> = []

  for (const nodeId of removedNodeIds) {
    const instance = oldTreeState.nodes[nodeId]
    if (instance === undefined) {
      // Defensivo: nodo en oldTreeDef pero non en oldTreeState; ignora.
      continue
    }

    const wasUnlocked = instance.state === 'unlocked' || instance.state === 'maxed'

    changes.push({ type: 'node_removed', nodeId, wasUnlocked })

    if (wasUnlocked && options.refundRemovedNodes) {
      const costs = oldCostsByNodeId.get(nodeId)
      if (costs !== undefined) {
        for (const cost of costs) {
          changes.push({
            type: 'cost_refunded',
            nodeId,
            resourceId: cost.resourceId,
            amount: cost.amount,
          })
          refunds.push({ resourceId: cost.resourceId, amount: cost.amount })
        }
      }
    }
  }

  // 4. Construír newTreeState (copia defensiva).
  const newNodes = { ...oldTreeState.nodes }
  for (const nodeId of removedNodeIds) {
    delete newNodes[nodeId]
  }

  const newResources = { ...oldTreeState.budget.resources }
  for (const refund of refunds) {
    newResources[refund.resourceId] = (newResources[refund.resourceId] ?? 0) + refund.amount
  }

  const newTreeState: TreeState = {
    ...oldTreeState,
    nodes: newNodes,
    budget: {
      ...oldTreeState.budget,
      resources: newResources,
    },
  }

  return ok({ newTreeState, changes })
}
// ── FIN: Reconciler ──
