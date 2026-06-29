// ── INICIO: commands concretos (representativos, non exhaustivos) ──
//
// Cada comando é unha factory que devolve un Command. Reciben os
// parámetros pechados e empacan unha receita Immer. Os tipos públicos
// de @core son moi `readonly`; usamos `castDraft` (mesmo patrón que
// `@core/engine/TreeEngine.ts`) para escribir no draft sen afrouxar
// os tipos públicos. O cast queda INTERNO ao Command.
//
// IMPORTANTE: cero side effects. Os Commands son receitas puras.
// Mutar o draft é o **único** efecto permitido.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, Position } from '@yggdrasil-forge/core'
import { castDraft } from 'immer'
import type { Command } from '../Command.js'

/** Move un nodo a `position`. No-op se o nodo non existe. */
export function moveNode(nodeId: string, position: Position, label?: LocalizedString): Command {
  return {
    type: 'moveNode',
    ...(label !== undefined && { label }),
    mutate(draft) {
      const node = draft.tree.nodes.find((n) => n.id === nodeId)
      if (node === undefined) return
      node.position = castDraft(position)
    },
  }
}

/**
 * Set xenérico dun campo top-level dun nodo. Aceita un sub-conxunto
 * de campos serializables. Útil para o Inspector.
 */
export function setNodeField<K extends keyof NodeDef>(
  nodeId: string,
  field: K,
  value: NodeDef[K],
  label?: LocalizedString,
): Command {
  return {
    type: 'setNodeField',
    ...(label !== undefined && { label }),
    mutate(draft) {
      const node = draft.tree.nodes.find((n) => n.id === nodeId)
      if (node === undefined)
        return // O cast é necesario por exactOptionalPropertyTypes + readonly;
        // queda interno ao Command.
      ;(node as Record<string, unknown>)[field as string] = castDraft(value) as unknown
    },
  }
}

/** Engade un NodeDef ao tree. Non valida unicidade aquí (faino o Validator). */
export function addNode(node: NodeDef, label?: LocalizedString): Command {
  return {
    type: 'addNode',
    ...(label !== undefined && { label }),
    mutate(draft) {
      draft.tree.nodes.push(castDraft(node))
    },
  }
}

/**
 * Elimina un nodo polo id. Non limpa arestas/prereqs referenciados:
 * iso fará que o referentialIntegrityValidator rexeite a transacción.
 * O autor debe encadear `removeEdge(...)` na mesma transacción para
 * compoñer un borrado limpo.
 */
export function removeNode(nodeId: string, label?: LocalizedString): Command {
  return {
    type: 'removeNode',
    ...(label !== undefined && { label }),
    mutate(draft) {
      const idx = draft.tree.nodes.findIndex((n) => n.id === nodeId)
      if (idx >= 0) draft.tree.nodes.splice(idx, 1)
    },
  }
}

/** Engade unha EdgeDef ao tree. */
export function addEdge(edge: EdgeDef, label?: LocalizedString): Command {
  return {
    type: 'addEdge',
    ...(label !== undefined && { label }),
    mutate(draft) {
      draft.tree.edges.push(castDraft(edge))
    },
  }
}

/** Elimina unha aresta polo id. */
export function removeEdge(edgeId: string, label?: LocalizedString): Command {
  return {
    type: 'removeEdge',
    ...(label !== undefined && { label }),
    mutate(draft) {
      const idx = draft.tree.edges.findIndex((e) => e.id === edgeId)
      if (idx >= 0) draft.tree.edges.splice(idx, 1)
    },
  }
}
// ── FIN: commands concretos ──
