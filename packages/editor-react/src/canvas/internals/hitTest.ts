// ── INICIO: hitTest ──
// Hit-test puro en doc-space: dado un punto e a lista de nodos, devolve
// o nodo cuxa posición está dentro do radio dado.
//
// **Por que doc-space e non DOM?** Porque é determinista e simple, e
// non depende de elementos DOM internos do SkillTree (que non expón
// `data-node-id` nin nada similar). O usuario percibe que clica "no
// nodo X" cando o cursor está visualmente sobre o disco — e o disco
// no SkillTree céntrase exactamente en `node.position` con radio
// dependente do tipo (small/keystone). Co radio default 30 cubrimos
// ámbalas dúas. Maior precisión virá co banco do SkillTreeHandle.

import type { Position, TreeDef } from '@yggdrasil-forge/core'
import type { SelectionRef } from '@yggdrasil-forge/editor-core'

/**
 * Devolve a SelectionRef do nodo cuxa `position` está a distancia
 * <= `radius` de `point`. Se hai varios, devolve o **último** (que
 * adoita estar pintado encima en SVG; iso aliña coa percepción
 * visual). Devolve null se ningún encaixa ou se ningún nodo ten
 * `position` definida.
 *
 * @param point  Punto en doc-space (resultado de screenToDoc).
 * @param tree   TreeDef do documento actual.
 * @param radius Radio en doc-space (default 30).
 */
export function hitTestNode(point: Position, tree: TreeDef, radius = 30): SelectionRef | null {
  const r2 = radius * radius
  let hit: SelectionRef | null = null
  for (const node of tree.nodes) {
    const pos = node.position
    if (pos === undefined) continue
    const dx = point.x - pos.x
    const dy = point.y - pos.y
    if (dx * dx + dy * dy <= r2) {
      // Sobreescribir: o último gana (orden de pintado SVG).
      hit = { kind: 'node', id: node.id }
    }
  }
  return hit
}

/**
 * Devolve TODOS os nodos con `position` dentro dun rectángulo
 * doc-space (usado polo marquee).
 */
export function nodesInRect(
  rect: { x: number; y: number; width: number; height: number },
  tree: TreeDef,
): readonly SelectionRef[] {
  const inside: SelectionRef[] = []
  for (const node of tree.nodes) {
    const pos = node.position
    if (pos === undefined) continue
    if (
      pos.x >= rect.x &&
      pos.x <= rect.x + rect.width &&
      pos.y >= rect.y &&
      pos.y <= rect.y + rect.height
    ) {
      inside.push({ kind: 'node', id: node.id })
    }
  }
  return inside
}
// ── FIN: hitTest ──
