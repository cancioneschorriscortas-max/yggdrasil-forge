// ── INICIO: ClusterBuilder ──
// Helper compartido entre layouts que operan sobre clusters declarados.
//
// **Aditivo**: nace aquí coa lóxica idéntica á que `ClusteredRadialLayout`
// usa internamente. ClusteredRadialLayout NON se modifica para preservar a
// cero-regresión (1880 tests do core seguen pasando). `ConstellationLayout`
// (F-constellation) si usa este helper desde o seu nacemento.
//
// Determinismo (mesmas regras que ClusteredRadialLayout.buildClusters):
//   - Un cluster por `GroupDef` na orde de `treeDef.groups`.
//   - Membros do cluster: `node.group === group.id` OU id en `group.nodeIds`
//     (unión sen duplicar). Orde dos membros segue `treeDef.nodes`.
//   - A raíz nunca se asigna a ningún cluster.
//   - Cluster implícito `__ungrouped__` ao final cos non-raíz sen grupo.
//
// Función pura, stateless.

import type { TreeDef } from '../../types/tree.js'

/**
 * Cluster computado a partir do `TreeDef`. Inmutable; consómese polos
 * layouts que reparten clusters en radial.
 */
export interface Cluster {
  readonly id: string
  readonly memberIds: readonly string[]
  /**
   * Áncora declarada do grupo orixinal (`GroupDef.anchorNodeId`). Pode non
   * ser membro válido (id descoñecido); o consumidor decide o fallback.
   * Ausente nos clusters implícitos `__ungrouped__` e nos grupos sen
   * `anchorNodeId`.
   */
  readonly anchorNodeId?: string
}

/**
 * Constrúe a lista determinista de clusters dun `TreeDef`.
 *
 * @param treeDef árbore de entrada (read-only).
 * @param rootId  id da raíz para excluíla dos clusters (opcional).
 *
 * @returns lista de clusters (incluíndo `__ungrouped__` ao final se procede).
 */
export function buildClusters(treeDef: TreeDef, rootId: string | undefined): Cluster[] {
  const groups = treeDef.groups ?? []
  const assigned = new Set<string>()
  const clusters: Cluster[] = []

  for (const g of groups) {
    const explicit = new Set<string>(g.nodeIds ?? [])
    const ids: string[] = []
    for (const n of treeDef.nodes) {
      if (n.id === rootId) continue
      if ((n.group === g.id || explicit.has(n.id)) && !assigned.has(n.id)) {
        ids.push(n.id)
        assigned.add(n.id)
      }
    }
    clusters.push({
      id: g.id,
      memberIds: ids,
      ...(g.anchorNodeId !== undefined ? { anchorNodeId: g.anchorNodeId } : {}),
    })
  }

  const ungrouped: string[] = []
  for (const n of treeDef.nodes) {
    if (n.id !== rootId && !assigned.has(n.id)) {
      ungrouped.push(n.id)
    }
  }
  if (ungrouped.length > 0) {
    clusters.push({ id: '__ungrouped__', memberIds: ungrouped })
  }

  return clusters
}
// ── FIN: ClusterBuilder ──
