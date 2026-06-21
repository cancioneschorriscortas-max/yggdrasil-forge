// ── INICIO: F9.2 — coherencia da convención canónica (opt-in) ──
import type { TreeDef } from '@yggdrasil-forge/core'

/**
 * Verifica a convención canónica de GAIA (opt-in). Regra: todo
 * `node.metadata.gaia.canonicalSkillId` debe existir como clave en
 * `tree.metadata.gaia.canonicalWeights`. Devolve a lista de problemas
 * (baleira = coherente). Non lanza; non muta. `metadata` é opaco
 * (`Record<string, unknown>`), de aí os casts documentados.
 */
export function checkCanonicalCoherence(tree: TreeDef): readonly string[] {
  const problems: string[] = []
  const treeGaia = (tree.metadata?.gaia ?? {}) as Record<string, unknown>
  const weights = (treeGaia.canonicalWeights ?? {}) as Record<string, number>
  const known = new Set(Object.keys(weights))
  for (const node of tree.nodes) {
    const nodeGaia = (node.metadata?.gaia ?? {}) as Record<string, unknown>
    const canonicalId = nodeGaia.canonicalSkillId
    if (typeof canonicalId === 'string' && !known.has(canonicalId)) {
      problems.push(
        `node "${node.id}": canonicalSkillId "${canonicalId}" non está en canonicalWeights`,
      )
    }
  }
  return problems
}
// ── FIN: F9.2 ──
