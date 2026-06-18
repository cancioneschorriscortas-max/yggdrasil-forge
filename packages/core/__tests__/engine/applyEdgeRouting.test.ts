// ── INICIO: tests applyEdgeRouting + computeLayout integration (F10.4b) ──
import { describe, expect, it } from 'vitest'
import { LayoutEngineRegistry } from '../../src/engine/layouts/LayoutEngineRegistry.js'
import { applyEdgeRouting } from '../../src/engine/layouts/PathBuilder.js'
import { TreeLayout } from '../../src/engine/layouts/TreeLayout.js'
import { computeLayout } from '../../src/engine/layouts/computeLayout.js'
import type { CurveStyle, TreeDef } from '../../src/index.js'

function makeRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry().register(new TreeLayout())
}

function makeTree(layoutCurve?: CurveStyle): TreeDef {
  const layout = layoutCurve !== undefined ? { type: 'tree', curve: layoutCurve } : { type: 'tree' }
  return {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { en: 'T', es: 'T', gl: 'T' },
    nodes: [
      { id: 'a', type: 'root', label: { en: 'A', es: 'A', gl: 'A' } },
      { id: 'b', type: 'small', label: { en: 'B', es: 'B', gl: 'B' } },
      { id: 'c', type: 'small', label: { en: 'C', es: 'C', gl: 'C' } },
    ],
    edges: [
      { id: 'e-ab', source: 'a', target: 'b', type: 'dependency' },
      { id: 'e-ac', source: 'a', target: 'c', type: 'dependency' },
    ],
    layout,
  }
}

function makeTreeWithRouting(routing: CurveStyle): TreeDef {
  const tree = makeTree()
  return {
    ...tree,
    edges: [
      { id: 'e-ab', source: 'a', target: 'b', type: 'dependency', style: { routing } },
      { id: 'e-ac', source: 'a', target: 'c', type: 'dependency' },
    ],
  }
}

describe('applyEdgeRouting — tree-wide curve via LayoutConfig.curve (F10.4b)', () => {
  it('sen curve nin routing: paths rectos (retrocompatible)', () => {
    const tree = makeTree()
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      for (const [, path] of result.value.edges) {
        // 'line' ou indefinido (legacy); 2 puntos
        expect(path.points.length).toBe(2)
      }
    }
  })

  it('layout.curve=diagonal-vertical: tódolos edges en cubic (4 puntos)', () => {
    const tree = makeTree('diagonal-vertical')
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      for (const [, path] of result.value.edges) {
        expect(path.kind).toBe('cubic')
        expect(path.points.length).toBe(4)
      }
    }
  })

  it('layout.curve=orthogonal: polyline (3 ou 4 puntos)', () => {
    const tree = makeTree('orthogonal')
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      for (const [, path] of result.value.edges) {
        expect(path.kind).toBe('polyline')
      }
    }
  })

  it('layout.curve=straight: explícito recto, paths con 2 puntos', () => {
    const tree = makeTree('straight')
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      // 'straight' no fast-path → non se chama buildPath, paths conservados.
      // (Igual que sen curve, por definición.)
      for (const [, path] of result.value.edges) {
        expect(path.points.length).toBe(2)
      }
    }
  })
})

describe('applyEdgeRouting — per-edge routing override (F10.4b)', () => {
  it('edge con routing="orthogonal" en árbore sen layout.curve: só ese edge curvo', () => {
    const tree = makeTreeWithRouting('orthogonal')
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      const eAB = result.value.edges.get('e-ab')
      const eAC = result.value.edges.get('e-ac')
      expect(eAB?.kind).toBe('polyline')
      // O outro edge non ten routing → segue recto (2 puntos, sen kind cubic)
      expect(eAC?.points.length).toBe(2)
    }
  })

  it('edge.routing gaña sobre layout.curve', () => {
    const tree: TreeDef = {
      ...makeTree('diagonal-vertical'),
      edges: [
        {
          id: 'e-ab',
          source: 'a',
          target: 'b',
          type: 'dependency',
          style: { routing: 'orthogonal' },
        },
        { id: 'e-ac', source: 'a', target: 'c', type: 'dependency' },
      ],
    }
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.edges.get('e-ab')?.kind).toBe('polyline')
      // e-ac usa layout.curve = diagonal-vertical → cubic
      expect(result.value.edges.get('e-ac')?.kind).toBe('cubic')
    }
  })

  it('edge.routing="straight" en árbore con layout.curve=diagonal-vertical: ese edge recto', () => {
    const tree: TreeDef = {
      ...makeTree('diagonal-vertical'),
      edges: [
        {
          id: 'e-ab',
          source: 'a',
          target: 'b',
          type: 'dependency',
          style: { routing: 'straight' },
        },
        { id: 'e-ac', source: 'a', target: 'c', type: 'dependency' },
      ],
    }
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      // e-ab: routing=straight → recto
      expect(result.value.edges.get('e-ab')?.points.length).toBe(2)
      // e-ac: layout.curve diagonal-vertical → cubic
      expect(result.value.edges.get('e-ac')?.kind).toBe('cubic')
    }
  })
})

describe('applyEdgeRouting — fast-path retrocompatibilidade (F10.4b)', () => {
  it('árbore sen routing definido: applyEdgeRouting devolve o MESMO LayoutResult por referencia', () => {
    const tree = makeTree()
    const result = computeLayout(tree, makeRegistry())
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Aplicación directa para verificar identidade de referencia
      const same = applyEdgeRouting(result.value, tree)
      expect(same).toBe(result.value)
    }
  })
})
// ── FIN: tests applyEdgeRouting ──
