// ── INICIO: composites ──
// Lóxica de creación/borrado como funcións PURAS que devolven os
// Commands para unha transacción — testable sen DOM, sen React, sen
// motor. O caller (editor-react ou un test) é quen fai
// `engine.transaction(label, (tx) => { for (const c of commands) tx.apply(c) })`.
//
// Briefing 7.11. Decisións do Director xa tomadas co dono: Conectar
// crea prerequisite automático con toggle; borrado con cascada
// completa; nodo nace no clic.

import type { EdgeDef, NodeDef, Position, UnlockCondition, UnlockRule } from '@yggdrasil-forge/core'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { Command } from './Command.js'
import { addEdge, removeEdge, removeNode, setNodeField } from './commands/index.js'

/**
 * Primeiro id libre co prefixo dado: `${prefix}-1`, `${prefix}-2`...
 * Salta ocos xa ocupados (ex. se `nodo-2` non existe pero `nodo-3`
 * si, `nodo-2` é o primeiro libre igual).
 */
export function nextFreeId(existing: ReadonlySet<string>, prefix: string): string {
  let n = 1
  let candidate = `${prefix}-${n}`
  while (existing.has(candidate)) {
    n += 1
    candidate = `${prefix}-${n}`
  }
  return candidate
}

/** Nodo por defecto nacido en `position`. Tipo `small`, etiqueta xenérica. */
export function buildNewNode(doc: EditorDocument, position: Position): NodeDef {
  const existingIds = new Set(doc.tree.nodes.map((n) => n.id))
  return {
    id: nextFreeId(existingIds, 'nodo'),
    type: 'small',
    label: { gl: 'Novo nodo', en: 'New node' },
    position,
  }
}

/** `true` se `condition` referencia algún id de `deletedIds`. */
function conditionReferencesAny(condition: UnlockCondition, ids: ReadonlySet<string>): boolean {
  if (condition.type === 'distance_max') return ids.has(condition.fromNodeId)
  if ('nodeId' in condition) return ids.has(condition.nodeId)
  return false
}

/** `true` se `rule` (grupo ou condición simple) xa contén `node_unlocked(nodeId)`. */
function containsNodeUnlocked(rule: UnlockRule, nodeId: string): boolean {
  if (rule.type === 'all' || rule.type === 'any' || rule.type === 'none') {
    return rule.conditions.some((c) => c.type === 'node_unlocked' && c.nodeId === nodeId)
  }
  return rule.type === 'node_unlocked' && rule.nodeId === nodeId
}

/**
 * Fusiona `node_unlocked(sourceId)` en `existingRule` seguindo as
 * regras do briefing 7.11:
 *   - sen regra → condición simple.
 *   - condición simple → envolver en `all` cos dous.
 *   - grupo `all` → engadir ao final.
 *   - grupo `any`/`none` → NON tocar (semántica ambigua).
 *   - dedupe: se xa está, non tocar.
 */
function mergePrerequisite(
  existingRule: UnlockRule | undefined,
  sourceId: string,
): { readonly changed: boolean; readonly rule: UnlockRule | undefined } {
  const addition: UnlockCondition = { type: 'node_unlocked', nodeId: sourceId }
  if (existingRule === undefined) {
    return { changed: true, rule: addition }
  }
  if (existingRule.type === 'any' || existingRule.type === 'none') {
    return { changed: false, rule: existingRule }
  }
  if (containsNodeUnlocked(existingRule, sourceId)) {
    return { changed: false, rule: existingRule }
  }
  if (existingRule.type === 'all') {
    return {
      changed: true,
      rule: { type: 'all', conditions: [...existingRule.conditions, addition] },
    }
  }
  // existingRule é unha condición simple (non 'all'/'any'/'none').
  return { changed: true, rule: { type: 'all', conditions: [existingRule, addition] } }
}

/**
 * Conexión `sourceId` → `targetId`. Devolve `[]` (sen comandos, sen
 * efecto) se é self-loop ou xa existe esa aresta exacta — o caller
 * non precisa distinguir "rexeitado" de "nada que facer", a
 * transacción resultante sinxelamente non fai nada.
 */
export function buildConnect(
  doc: EditorDocument,
  sourceId: string,
  targetId: string,
  opts: { readonly withPrerequisite: boolean },
): readonly Command[] {
  if (sourceId === targetId) return []
  const isDuplicate = doc.tree.edges.some((e) => e.source === sourceId && e.target === targetId)
  if (isDuplicate) return []

  const existingEdgeIds = new Set(doc.tree.edges.map((e) => e.id))
  const edge: EdgeDef = {
    id: nextFreeId(existingEdgeIds, 'aresta'),
    source: sourceId,
    target: targetId,
    type: 'dependency',
  }
  const commands: Command[] = [addEdge(edge)]

  if (opts.withPrerequisite) {
    const targetNode = doc.tree.nodes.find((n) => n.id === targetId)
    if (targetNode !== undefined) {
      const merged = mergePrerequisite(targetNode.prerequisites, sourceId)
      if (merged.changed) {
        commands.push(setNodeField(targetId, 'prerequisites', merged.rule))
      }
    }
  }

  return commands
}

/** Poda de `rule` as condicións que referencien algún id de `deletedIds`. */
function prunePrerequisite(
  rule: UnlockRule,
  deletedIds: ReadonlySet<string>,
): UnlockRule | undefined {
  if (rule.type === 'all' || rule.type === 'any' || rule.type === 'none') {
    const kept = rule.conditions.filter((c) => !conditionReferencesAny(c, deletedIds))
    if (kept.length === 0) return undefined
    if (kept.length === rule.conditions.length) return rule // sen cambios (mesma referencia)
    return { type: rule.type, conditions: kept }
  }
  // Condición simple.
  return conditionReferencesAny(rule, deletedIds) ? undefined : rule
}

/**
 * Borrado con cascada COMPLETA: arestas conectadas, referencias en
 * `exclusions` e `prerequisites` doutros nodos, e por último os
 * propios nodos. Todo en UN array de Commands — o caller aplícaos
 * nunha soa transacción (un só undo).
 */
export function buildRemoveCascade(
  doc: EditorDocument,
  nodeIds: readonly string[],
  edgeIds: readonly string[],
): readonly Command[] {
  const deletedNodeIds = new Set(nodeIds)
  const commands: Command[] = []

  // 1. Arestas: as seleccionadas directamente + calquera que toque
  //    un nodo que vai desaparecer.
  const edgeIdsToRemove = new Set<string>(edgeIds)
  for (const edge of doc.tree.edges) {
    if (deletedNodeIds.has(edge.source) || deletedNodeIds.has(edge.target)) {
      edgeIdsToRemove.add(edge.id)
    }
  }
  for (const id of edgeIdsToRemove) commands.push(removeEdge(id))

  // 2. Limpar referencias nos nodos SUPERVIVENTES (exclusions +
  //    prerequisites). Os nodos que van desaparecer non fai falta
  //    limpalos — bórranse enteiros no paso 3.
  for (const node of doc.tree.nodes) {
    if (deletedNodeIds.has(node.id)) continue

    if (node.exclusions !== undefined) {
      const keptExclusions = node.exclusions.filter((id) => !deletedNodeIds.has(id))
      if (keptExclusions.length !== node.exclusions.length) {
        commands.push(
          setNodeField(
            node.id,
            'exclusions',
            keptExclusions.length > 0 ? keptExclusions : undefined,
          ),
        )
      }
    }

    if (node.prerequisites !== undefined) {
      const pruned = prunePrerequisite(node.prerequisites, deletedNodeIds)
      if (pruned !== node.prerequisites) {
        commands.push(setNodeField(node.id, 'prerequisites', pruned))
      }
    }
  }

  // 3. Borrar os propios nodos.
  for (const id of nodeIds) commands.push(removeNode(id))

  return commands
}
// ── FIN: composites ──
