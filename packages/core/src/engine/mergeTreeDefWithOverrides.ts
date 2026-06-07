import type { TreeDef } from '../types/tree.js'

/**
 * Aplica overrides parciais a un TreeDef base.
 *
 * Estratexia (versión simple 5.1):
 * - `id`: NON se sobreescribe (o id do TreeDef base sempre prevalece).
 * - `nodes`: substitúe completamente se overrides.nodes está
 *   definido.
 * - `edges`: substitúe completamente se overrides.edges está
 *   definido.
 * - Todos os outros campos (`name`, `description`, `layout`,
 *   `budget`, `metadata`, `subtrees`): substitúe se está definido
 *   en overrides; preserva base se non.
 *
 * Cero merge intelixente de nodes/edges en 5.1. Sub-fases futuras
 * poden implementar merge granular se procede (ex: engadir nodos
 * a unha sub-tree base sen substituír os existentes).
 */
export function mergeTreeDefWithOverrides(base: TreeDef, overrides: Partial<TreeDef>): TreeDef {
  return {
    ...base,
    ...overrides,
    // id sempre preserva o base (cero sobrescritura)
    id: base.id,
  }
}
