// ── INICIO: tests integración ClusteredRadialLayout ──
import { describe, expect, it } from 'vitest'
import { ClusteredRadialLayout } from '../../../src/engine/layouts/ClusteredRadialLayout.js'
import { IdentityLayout } from '../../../src/engine/layouts/IdentityLayout.js'
import { LayoutEngineRegistry } from '../../../src/engine/layouts/LayoutEngineRegistry.js'
import { computeLayout } from '../../../src/engine/layouts/computeLayout.js'
import type { EdgeDef } from '../../../src/types/edge.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isOk, unwrap } from '../../../src/types/result.js'
import type { GroupDef, TreeDef } from '../../../src/types/tree.js'

/** Helper: nodo. */
function n(id: string, group?: string, position?: { x: number; y: number }): NodeDef {
  return {
    id,
    type: 'skill',
    label: id,
    ...(group !== undefined ? { group } : {}),
    ...(position !== undefined ? { position } : {}),
  }
}

/** Helper: group. */
function g(id: string, overrides?: Partial<GroupDef>): GroupDef {
  return { id, label: id, ...overrides }
}

/** TreeDef "estilo panadeiro" con 5 grupos e 20 microskills. */
function makePanadeiroLike(): TreeDef {
  // 5 grupos cunhas 4 microskills cada un = 20 microskills.
  const nodes: NodeDef[] = [n('panadeiro')]
  const groupIds = ['forno', 'tempos', 'sabor', 'resistencia', 'materia']
  const groups: GroupDef[] = groupIds.map((id) => g(id, { label: id }))
  for (const gid of groupIds) {
    for (let i = 0; i < 4; i++) {
      nodes.push(n(`${gid}_${i}`, gid))
    }
  }
  return {
    id: 'panadeiro',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'O Panadeiro',
    nodes,
    edges: [],
    groups,
    layout: { type: 'clustered-radial', groupRadius: 300, orbitRadius: 120 },
    rootNodeId: 'panadeiro',
  }
}

describe('ClusteredRadialLayout — integración', () => {
  it('panadeiro-like: raíz no centro, 5 puntos de grupo, 20 membros, mesh spokes', () => {
    const layout = new ClusteredRadialLayout()
    const treeDef = makePanadeiroLike()
    const r = layout.compute(treeDef)
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    // 1 raíz + 20 microskills = 21 posicións
    expect(v.nodes.size).toBe(21)
    // Raíz no centro (default centerX/centerY = 0)
    expect(v.nodes.get('panadeiro')).toEqual({ x: 0, y: 0 })
    // 5 clusters => 5 spokes mesh
    expect(v.mesh).toBeDefined()
    const lines = (v.mesh ?? []).filter((m) => m.type === 'line')
    expect(lines).toHaveLength(5)
    // Sen edges => sen paths
    expect(v.edges.size).toBe(0)
  })

  it('recolocación: trocar identity ↔ clustered-radial muda posicións sen tocar datos', () => {
    // Mesma topoloxía, dúas configs distintas.
    const baseNodes: NodeDef[] = [
      n('root', undefined, { x: 0, y: 0 }),
      n('a', 'g1', { x: 50, y: 50 }),
      n('b', 'g2', { x: 100, y: 100 }),
    ]
    const baseGroups: GroupDef[] = [g('g1'), g('g2')]
    const baseEdges: EdgeDef[] = []

    const treeIdentity: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '0.0.0',
      label: 't',
      nodes: baseNodes,
      edges: baseEdges,
      groups: baseGroups,
      layout: { type: 'custom' },
      rootNodeId: 'root',
    }
    const treeClustered: TreeDef = {
      ...treeIdentity,
      layout: { type: 'clustered-radial', groupRadius: 200 },
    }

    const idRes = unwrap(new IdentityLayout().compute(treeIdentity))
    const crRes = unwrap(new ClusteredRadialLayout().compute(treeClustered))

    // Os datos son referencialmente iguais (non tocados).
    expect(treeIdentity.nodes).toBe(baseNodes)
    expect(treeClustered.nodes).toBe(baseNodes)
    expect(treeIdentity.edges).toBe(baseEdges)
    expect(treeClustered.edges).toBe(baseEdges)

    // Pero as posicións de 'a' difiren entre identity e clustered-radial.
    expect(idRes.nodes.get('a')).toEqual({ x: 50, y: 50 })
    const aClustered = crRes.nodes.get('a')
    expect(aClustered).toBeDefined()
    expect(aClustered).not.toEqual({ x: 50, y: 50 })
  })

  it('rexistro: LayoutEngineRegistry.find("clustered-radial") devolve o motor', () => {
    const registry = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new ClusteredRadialLayout())
    const engine = registry.find('clustered-radial')
    expect(engine).toBeDefined()
    expect(engine?.type).toBe('clustered-radial')
  })

  it('computeLayout enruta tree con type "clustered-radial" ao motor correcto', () => {
    const registry = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new ClusteredRadialLayout())
    const treeDef = makePanadeiroLike()
    const r = computeLayout(treeDef, registry)
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.layoutType).toBe('clustered-radial')
  })
})
// ── FIN: tests integración ClusteredRadialLayout ──
