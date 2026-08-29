// ── INICIO: deriveClusterGroups (7.15c, Cambio 1) ──
// Derivación HEADLESS da vista de tarxetas: TreeDef → grupos coa forma
// exacta que pide a `ClusterCardsView` de @react (pero SEN IconDef — o
// `icon` viaxa cru como string; a capa react resólveo contra o
// registry de iconas).
//
// Regras (briefing 7.15c):
//   - Pertenza = unión de `GroupDef.nodeIds` + nodos con
//     `node.group === id`. Sen duplicados; orde estable: nodeIds
//     primeiro (na súa orde), despois por orde de aparición en
//     `tree.nodes`.
//   - Nodos sen grupo NON desaparecen en silencio: van a un grupo
//     sintético «Sen grupo» (id reservado UNGROUPED_GROUP_ID) ao
//     final. A vista nunca minte sobre o contido da árbore.
//   - Cor: `GroupDef.color ??` rotación de paleta determinista (a
//     mesma paleta distinguible que usa a rotación de rexións do
//     ThemePanel, 7.13 — duplicada aquí porque aquela vive na capa
//     react e esta derivación é headless).
//
// Pura e sen estado: mesmo TreeDef + opcións → mesmo resultado.

import { type Locale, resolveLocalized } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'

/** Membro dunha tarxeta (forma de ClusterMember, con icon cru). */
export interface DerivedClusterMember {
  readonly id: string
  readonly label: string
  /** Id de icona/emoji/URL CRU — resólvese a IconDef na capa react. */
  readonly icon?: string
  readonly currentTier: number
  readonly maxTier: number
}

/** Tarxeta derivada (forma de ClusterGroup, con members crus). */
export interface DerivedClusterGroup {
  readonly id: string
  readonly label: string
  readonly color: string
  /** Icona do GroupDef, CRUA (17.8) — resólvese na capa react, coma a dos membros. */
  readonly icon?: string
  readonly members: readonly DerivedClusterMember[]
}

export interface DeriveClusterGroupsOptions {
  readonly locale: Locale
  /** currentTier por nodo; en Autoría vai baleiro (todo 0). */
  readonly tiers?: ReadonlyMap<string, number>
}

/** Id reservado do grupo sintético dos nodos sen grupo. */
export const UNGROUPED_GROUP_ID = '__ungrouped'

const UNGROUPED_LABEL = { gl: 'Sen grupo', en: 'Ungrouped' } as const

/** Gris neutro do grupo sintético (recesivo a propósito). */
const UNGROUPED_COLOR = '#9a9a90'

/**
 * Rotación determinista para grupos sen `color` — mesma paleta
 * distinguible que a rotación de rexións (ThemePanel, 7.13).
 */
const GROUP_COLOR_ROTATION: readonly string[] = [
  '#c8875f',
  '#5f9ec8',
  '#7cb37c',
  '#c85f8e',
  '#c8b85f',
  '#8e5fc8',
]

/** Deriva as tarxetas da vista cluster a partir do TreeDef. */
export function deriveClusterGroups(
  tree: TreeDef,
  options: DeriveClusterGroupsOptions,
): readonly DerivedClusterGroup[] {
  const { locale, tiers } = options
  const nodeById = new Map(tree.nodes.map((node) => [node.id, node]))

  const toMember = (nodeId: string): DerivedClusterMember | undefined => {
    const node = nodeById.get(nodeId)
    if (node === undefined) return undefined // nodeIds a nodo inexistente: defensivo
    return {
      id: node.id,
      label: resolveLocalized(node.label, locale),
      ...(typeof node.icon === 'string' && node.icon.length > 0 && { icon: node.icon }),
      currentTier: tiers?.get(node.id) ?? 0,
      maxTier: node.maxTier ?? 1,
    }
  }

  const groups: DerivedClusterGroup[] = []
  const claimed = new Set<string>()
  const defs = tree.groups ?? []

  defs.forEach((def, index) => {
    const memberIds: string[] = []
    const seen = new Set<string>()
    // 1) nodeIds explícitos primeiro, na súa orde.
    for (const id of def.nodeIds ?? []) {
      if (!seen.has(id) && nodeById.has(id)) {
        seen.add(id)
        memberIds.push(id)
      }
    }
    // 2) Despois, nodos con node.group === def.id, por orde de aparición.
    for (const node of tree.nodes) {
      if (node.group === def.id && !seen.has(node.id)) {
        seen.add(node.id)
        memberIds.push(node.id)
      }
    }
    for (const id of memberIds) claimed.add(id)

    const members = memberIds
      .map(toMember)
      .filter((m): m is DerivedClusterMember => m !== undefined)
    groups.push({
      id: def.id,
      label: resolveLocalized(def.label, locale),
      color:
        def.color ?? GROUP_COLOR_ROTATION[index % GROUP_COLOR_ROTATION.length] ?? UNGROUPED_COLOR,
      ...(typeof def.icon === 'string' && def.icon.length > 0 && { icon: def.icon }),
      members,
    })
  })

  // 3) «Sen grupo» ao final — todo nodo non reclamado por ningún grupo.
  const orphanMembers = tree.nodes
    .filter((node) => !claimed.has(node.id))
    .map((node) => toMember(node.id))
    .filter((m): m is DerivedClusterMember => m !== undefined)
  if (orphanMembers.length > 0) {
    groups.push({
      id: UNGROUPED_GROUP_ID,
      label: resolveLocalized(UNGROUPED_LABEL, locale),
      color: UNGROUPED_COLOR,
      members: orphanMembers,
    })
  }

  return groups
}
// ── FIN: deriveClusterGroups ──
