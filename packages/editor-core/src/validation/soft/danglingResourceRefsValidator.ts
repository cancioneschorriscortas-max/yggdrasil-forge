// ── INICIO: danglingResourceRefs ──
// Aviso (NON-bloqueante — warning, non error, cf. adendo do briefing
// 7.12) por referencias a `resourceId` que xa non existen en
// `tree.resources`.
//
// **Decisión de deseño (non cambiar)**: borrar un recurso en uso
// PERMÍTESE — non hai cascada silenciosa sobre custos, xa que
// alteraría o balance do xogo ás caladas. Este validador só AVISA;
// o autor decide como resolver, e o panel Problemas guíao (clic no
// issue → selecciona o nodo, vía `nodeId`).
//
// Percorre tres familias de referencia:
//   - `node.cost[].resourceId`
//   - `node.costPerTier[][].resourceId`
//   - condicións `resource_min` dos `prerequisites`, a calquera
//     profundidade (grupos `all`/`any`/`none`).

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { UnlockCondition, UnlockRule } from '@yggdrasil-forge/core'
import type { EditorDocument } from '../../document/EditorDocument.js'
import type { ValidationIssue, Validator } from '../Validator.js'

/** Percorre unha UnlockRule (grupo ou condición simple) collendo resourceId de resource_min. */
function collectResourceMinIds(rule: UnlockRule | undefined, out: string[]): void {
  if (rule === undefined) return
  if (rule.type === 'all' || rule.type === 'any' || rule.type === 'none') {
    for (const c of rule.conditions) collectFromCondition(c, out)
    return
  }
  collectFromCondition(rule, out)
}
function collectFromCondition(condition: UnlockCondition, out: string[]): void {
  if (condition.type === 'resource_min') out.push(condition.resourceId)
}

export const danglingResourceRefsValidator: Validator = (doc: EditorDocument) => {
  const issues: ValidationIssue[] = []
  const validIds = new Set<string>((doc.tree.resources ?? []).map((r) => r.id))

  for (const node of doc.tree.nodes) {
    // cost[].resourceId
    for (const cost of node.cost ?? []) {
      if (!validIds.has(cost.resourceId)) {
        const message: LocalizedString = {
          en: `node '${node.id}' has cost referencing missing resource '${cost.resourceId}'`,
          gl: `o nodo '${node.id}' ten un custo que referencia o recurso inexistente '${cost.resourceId}'`,
        }
        issues.push({
          severity: 'warning',
          code: 'RES_DANGLING_COST',
          message,
          nodeId: node.id,
        })
      }
    }

    // costPerTier[][].resourceId
    for (const tierCosts of node.costPerTier ?? []) {
      for (const cost of tierCosts) {
        if (!validIds.has(cost.resourceId)) {
          const message: LocalizedString = {
            en: `node '${node.id}' has costPerTier referencing missing resource '${cost.resourceId}'`,
            gl: `o nodo '${node.id}' ten un custo por rango que referencia o recurso inexistente '${cost.resourceId}'`,
          }
          issues.push({
            severity: 'warning',
            code: 'RES_DANGLING_COST_PER_TIER',
            message,
            nodeId: node.id,
          })
        }
      }
    }

    // prerequisites → resource_min, a calquera profundidade.
    const resourceIds: string[] = []
    collectResourceMinIds(node.prerequisites, resourceIds)
    for (const resourceId of resourceIds) {
      if (!validIds.has(resourceId)) {
        const message: LocalizedString = {
          en: `node '${node.id}' has prerequisite referencing missing resource '${resourceId}'`,
          gl: `o nodo '${node.id}' ten un requisito que referencia o recurso inexistente '${resourceId}'`,
        }
        issues.push({
          severity: 'warning',
          code: 'RES_DANGLING_PREREQ',
          message,
          nodeId: node.id,
        })
      }
    }
  }

  return issues
}
// ── FIN: danglingResourceRefs ──
