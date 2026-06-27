// ── INICIO: deriveEdges (v5) ──
//
// Función pura para derivar arestas visuais consumidor-side a partir
// dun TreeDef. O fixture do panadeiro chega con `conectadas: []` → cero
// arestas no importer; estas son alternativas conmutables para xulgar
// a forma do grafo contra o mockup orixinal.
//
// As arestas xeradas son `type: 'path'` ("camiño visual sen semántica de
// dependencia", core/types/edge.ts) → o motor as debuxa pero NON as trata
// como prereqs. `canUnlock` non cambia.
//
// Vive aquí (no exemplo) como fonte da verdade. A sonda en
// `@importers/__tests__/__verify_panadeiro_spike.test.ts` non pode
// importala directamente: o tsconfig de @importers ten `rootDir:"."`
// e o exemplo queda fóra (TS6059). Mentres o briefing v5 manteña
// "todo consumidor-side", a sonda duplica a función inline cunha nota
// que apunta aquí; se algún día esta derivación gradúa a un paquete,
// a duplicación desaparece. Función pura sen React: só tipos de `@core`.

import type { EdgeDef, TreeDef } from '@yggdrasil-forge/core'

/**
 * Tres topoloxías + ningunha, sobre o anel de clusters do panadeiro.
 *
 * - `'none'` — sen arestas.
 * - `'star'` — raíz → cada microskill de cada grupo (todos os raios).
 * - `'hub'`  — raíz → ancla (1º membro do grupo); ancla → resto do grupo.
 * - `'chain'` (Fío) — raíz → m0 → m1 → … (constelación, patrón Skyrim).
 */
export type Topology = 'none' | 'star' | 'hub' | 'chain'

/**
 * Constrúe arestas visuais (`type: 'path'`) sobre `def` segundo a `topology`.
 * Devolve `[]` se `topology === 'none'` ou se non hai root no `def`.
 */
export function deriveEdges(def: TreeDef, topology: Topology): EdgeDef[] {
  if (topology === 'none') return []

  const rootId = def.nodes.find((n) => n.type === 'root')?.id
  if (rootId === undefined) return []

  // Agrupa nodos por `node.group` (mantén orde do fixture).
  const byGroup = new Map<string, string[]>()
  for (const n of def.nodes) {
    if (n.group !== undefined) {
      const arr = byGroup.get(n.group) ?? []
      arr.push(n.id)
      byGroup.set(n.group, arr)
    }
  }

  const mkEdge = (source: string, target: string): EdgeDef => ({
    id: `derived:${source}->${target}`,
    source,
    target,
    type: 'path',
  })

  const derived: EdgeDef[] = []
  for (const members of byGroup.values()) {
    const first = members[0]
    if (first === undefined) continue

    if (topology === 'star') {
      // raíz → cada membro (todos os raios)
      for (const m of members) derived.push(mkEdge(rootId, m))
    } else if (topology === 'hub') {
      // raíz → ancla; ancla → resto do grupo
      derived.push(mkEdge(rootId, first))
      for (let i = 1; i < members.length; i++) {
        const m = members[i]
        if (m !== undefined) derived.push(mkEdge(first, m))
      }
    } else {
      // chain (Fío): raíz → m0 → m1 → … → mN
      derived.push(mkEdge(rootId, first))
      for (let i = 0; i < members.length - 1; i++) {
        const a = members[i]
        const b = members[i + 1]
        if (a !== undefined && b !== undefined) derived.push(mkEdge(a, b))
      }
    }
  }

  return derived
}
// ── FIN: deriveEdges ──
