// ── INICIO: serializeForClient ──
import type { TreeDef, TreeState } from '@yggdrasil-forge/core'

/**
 * Serializa un par `treeDef + state?` como string JSON co escape de
 * `<` e `>` para inxección segura dentro de `<script>` tags HTML.
 *
 * O escape de `<` evita que un treeDef con label malicioso rompa o
 * tag e inxecte código (patrón estándar Next.js/Remix).
 *
 * @returns String JSON con `<` → `\u003c` e `>` → `\u003e`.
 */
export function serializeForClient(treeDef: TreeDef, state?: TreeState): string {
  const json = JSON.stringify({ treeDef, state: state ?? null })
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}
// ── FIN: serializeForClient ──
