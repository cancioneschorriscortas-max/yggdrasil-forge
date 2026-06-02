// ── INICIO: tests de IdentityLayout ──
import { describe, expect, it } from 'vitest'
import { IdentityLayout } from '../../../src/engine/layouts/IdentityLayout.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isOk, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

/** Helper: crea un TreeDef mínimo para tests de layout. */
function makeLayoutTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'layout-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Layout Test',
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
    ...overrides,
  }
}

/** Helper: crea un NodeDef mínimo con position opcional. */
function makeNode(id: string, position?: { x: number; y: number }): NodeDef {
  return {
    id,
    type: 'skill',
    label: id,
    ...(position !== undefined ? { position } : {}),
  }
}

describe('IdentityLayout', () => {
  const layout = new IdentityLayout()

  // 1. Nodo con position: copia a LayoutResult.nodes
  it('copia NodeDef.position ao LayoutResult.nodes', () => {
    const treeDef = makeLayoutTreeDef({
      nodes: [makeNode('a', { x: 10, y: 20 })],
    })
    const result = layout.compute(treeDef)
    expect(isOk(result)).toBe(true)
    const lr = unwrap(result)
    expect(lr.nodes.get('a')).toEqual({ x: 10, y: 20 })
  })

  // 2. Nodo SEN position: fallback (0, 0)
  it('asigna (0, 0) a nodos sen position', () => {
    const treeDef = makeLayoutTreeDef({
      nodes: [makeNode('b')],
    })
    const lr = unwrap(layout.compute(treeDef))
    expect(lr.nodes.get('b')).toEqual({ x: 0, y: 0 })
  })

  // 3. Edge: path = [sourcePos, targetPos]
  it('calcula edge path como liña recta entre source e target', () => {
    const treeDef = makeLayoutTreeDef({
      nodes: [makeNode('s', { x: 1, y: 2 }), makeNode('t', { x: 3, y: 4 })],
      edges: [{ id: 'e1', source: 's', target: 't', type: 'prerequisite' }],
    })
    const lr = unwrap(layout.compute(treeDef))
    const edgePath = lr.edges.get('e1')
    expect(edgePath).toBeDefined()
    expect(edgePath?.points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
  })

  // 4. TreeDef baleiro: bounds = (0, 0, 0, 0)
  it('TreeDef baleiro produce bounds (0, 0, 0, 0)', () => {
    const treeDef = makeLayoutTreeDef()
    const lr = unwrap(layout.compute(treeDef))
    expect(lr.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  // 5. Múltiples nodos: bounds calculados correctamente
  it('calcula bounds min/max de múltiples nodos', () => {
    const treeDef = makeLayoutTreeDef({
      nodes: [
        makeNode('a', { x: -5, y: 10 }),
        makeNode('b', { x: 15, y: -3 }),
        makeNode('c', { x: 0, y: 7 }),
      ],
    })
    const lr = unwrap(layout.compute(treeDef))
    expect(lr.bounds).toEqual({ minX: -5, minY: -3, maxX: 15, maxY: 10 })
  })

  // 6. layoutType === 'custom'
  it('layoutType é custom', () => {
    const treeDef = makeLayoutTreeDef({
      nodes: [makeNode('a', { x: 0, y: 0 })],
    })
    const lr = unwrap(layout.compute(treeDef))
    expect(lr.layoutType).toBe('custom')
  })

  // 7. Edge con source/target non presentes nos nodos: fallback (0, 0)
  it('edge con source/target inexistente usa (0, 0) como fallback', () => {
    const treeDef = makeLayoutTreeDef({
      nodes: [],
      edges: [{ id: 'e1', source: 'ghost-s', target: 'ghost-t', type: 'prerequisite' }],
    })
    const lr = unwrap(layout.compute(treeDef))
    const edgePath = lr.edges.get('e1')
    expect(edgePath).toBeDefined()
    expect(edgePath?.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ])
  })
})
// ── FIN: tests de IdentityLayout ──
