// ── INICIO: tests de RadialLayout ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { RadialLayout } from '../../../src/engine/layouts/RadialLayout.js'
import type { EdgeDef } from '../../../src/types/edge.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

/** Helper: crea TreeDef mínimo para tests radial. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'radial-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Radial Test',
    nodes: [],
    edges: [],
    layout: { type: 'radial', radius: 100 },
    ...overrides,
  }
}

/** Helper: nodo mínimo. */
function n(id: string, position?: { x: number; y: number }): NodeDef {
  return {
    id,
    type: 'skill',
    label: id,
    ...(position !== undefined ? { position } : {}),
  }
}

/** Helper: edge mínimo (dependency). */
function e(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'dependency' }
}

/** Helper: distancia dun punto ao orixe (seguro, sen non-null assertion). */
function distFromPos(p: { x: number; y: number } | undefined): number {
  const x = p?.x ?? 0
  const y = p?.y ?? 0
  return Math.sqrt(x ** 2 + y ** 2)
}

/** Helper: distancia dun nodo ao orixe (por id no mapa). */
function distFromMap(map: ReadonlyMap<string, { x: number; y: number }>, id: string): number {
  return distFromPos(map.get(id))
}

const layout = new RadialLayout()

describe('RadialLayout', () => {
  // === CASOS BÁSICOS ===

  // 1. TreeDef baleiro
  it('TreeDef baleiro: bounds (0,0,0,0), nodes/edges vacíos', () => {
    const r = layout.compute(makeTreeDef())
    expect(isOk(r)).toBe(true)
    const lr = unwrap(r)
    expect(lr.nodes.size).toBe(0)
    expect(lr.edges.size).toBe(0)
    expect(lr.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  // 2. 1 root sen fillos
  it('1 root sen fillos: nodo en (centerX, centerY)', () => {
    const td = makeTreeDef({ nodes: [n('a')] })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')).toEqual({ x: 0, y: 0 })
  })

  // 3. 1 root con 4 fillos directos
  it('1 root con 4 fillos: fillos no nivel 1 a distancia radius', () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('c1'), n('c2'), n('c3'), n('c4')],
      edges: [
        e('e1', 'root', 'c1'),
        e('e2', 'root', 'c2'),
        e('e3', 'root', 'c3'),
        e('e4', 'root', 'c4'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    // Root en centro
    expect(lr.nodes.get('root')).toEqual({ x: 0, y: 0 })
    // Fillos a distancia 100 do centro
    for (const childId of ['c1', 'c2', 'c3', 'c4']) {
      const pos = lr.nodes.get(childId)
      expect(pos).toBeDefined()
      const dist = distFromPos(pos)
      expect(dist).toBeCloseTo(100, 5)
    }
  })

  // 4. 2 roots: distribuídos no nivel 1 (shift)
  it('2 roots: distribuídos no nivel visual 1 (raio = radius)', () => {
    const td = makeTreeDef({ nodes: [n('a'), n('b')] })
    const lr = unwrap(layout.compute(td))
    const posA = lr.nodes.get('a')
    const posB = lr.nodes.get('b')
    expect(posA).toBeDefined()
    expect(posB).toBeDefined()
    // Ambos a distancia radius do centro
    const distA = distFromPos(posA)
    const distB = distFromPos(posB)
    expect(distA).toBeCloseTo(100, 5)
    expect(distB).toBeCloseTo(100, 5)
  })

  // 5. Diamond (A → B → D, A → C → D): D no nivel 2
  it('diamond: D (nodo con 2 pais) queda no nivel 2', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'a', 'c'), e('e3', 'b', 'd'), e('e4', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    // A é root (nivel 0), B e C nivel 1, D nivel 2
    const posA = lr.nodes.get('a')
    expect(posA).toEqual({ x: 0, y: 0 })
    const posD = lr.nodes.get('d')
    expect(posD).toBeDefined()
    const distD = distFromPos(posD)
    expect(distD).toBeCloseTo(200, 5) // nivel 2 → raio 200
  })

  // 6. Cadea lineal (A → B → C → D)
  it('cadea lineal: cada nodo no seu nivel', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'c'), e('e3', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    // A é root (nivel 0) → centro
    expect(lr.nodes.get('a')).toEqual({ x: 0, y: 0 })
    // B nivel 1, C nivel 2, D nivel 3
    const distB = distFromMap(lr.nodes, 'b')
    const distC = distFromMap(lr.nodes, 'c')
    const distD = distFromMap(lr.nodes, 'd')
    expect(distB).toBeCloseTo(100, 5)
    expect(distC).toBeCloseTo(200, 5)
    expect(distD).toBeCloseTo(300, 5)
  })

  // === EDGE CASES ===

  // 7. Nodo illado
  it('nodo illado (sen edges): trátase como root', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('lone')],
      edges: [],
    })
    const lr = unwrap(layout.compute(td))
    // Ambos son roots, distribúense a raio = radius (multi-root shift)
    const distA = distFromMap(lr.nodes, 'a')
    expect(distA).toBeCloseTo(100, 5)
  })

  // 8. centerX/centerY non-zero
  it('centerX/centerY non-zero: posicións desprazadas', () => {
    const td = makeTreeDef({
      nodes: [n('a')],
      layout: { type: 'radial', radius: 100, centerX: 50, centerY: 30 },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')).toEqual({ x: 50, y: 30 })
  })

  // 9. startAngle custom
  it('startAngle custom: rotación aplicada', () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('child')],
      edges: [e('e1', 'root', 'child')],
      layout: { type: 'radial', radius: 100, startAngle: 0 },
    })
    const lr = unwrap(layout.compute(td))
    // child no nivel 1, ángulo 0 → posición (100, 0)
    const pos = lr.nodes.get('child')
    expect(pos).toBeDefined()
    expect(pos?.x ?? 0).toBeCloseTo(100, 5)
    expect(pos?.y ?? 0).toBeCloseTo(0, 5)
  })

  // 10. radius distinto
  it('radius distinto: distancias cambian proporcionalmente', () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('child')],
      edges: [e('e1', 'root', 'child')],
      layout: { type: 'radial', radius: 50 },
    })
    const lr = unwrap(layout.compute(td))
    const dist = distFromMap(lr.nodes, 'child')
    expect(dist).toBeCloseTo(50, 5)
  })

  // === DETERMINISMO ===

  // 11. Mesma TreeDef dúas chamadas: mesmas posicións
  it('determinismo: dúas chamadas producen mesmas posicións', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c')],
      edges: [e('e1', 'a', 'b'), e('e2', 'a', 'c')],
    })
    const r1 = unwrap(layout.compute(td))
    const r2 = unwrap(layout.compute(td))
    expect(r1.nodes.get('a')).toEqual(r2.nodes.get('a'))
    expect(r1.nodes.get('b')).toEqual(r2.nodes.get('b'))
    expect(r1.nodes.get('c')).toEqual(r2.nodes.get('c'))
  })

  // 12. Reordenar nodes muda a orde dentro de nivel
  it('reordenar nodes en TreeDef cambia distribución dentro de nivel', () => {
    const td1 = makeTreeDef({
      nodes: [n('root'), n('b'), n('c')],
      edges: [e('e1', 'root', 'b'), e('e2', 'root', 'c')],
    })
    const td2 = makeTreeDef({
      nodes: [n('root'), n('c'), n('b')],
      edges: [e('e1', 'root', 'b'), e('e2', 'root', 'c')],
    })
    const r1 = unwrap(layout.compute(td1))
    const r2 = unwrap(layout.compute(td2))
    // b en td1 ten a posición de c en td2 (cambiaron orde)
    expect(r1.nodes.get('b')).toEqual(r2.nodes.get('c'))
    expect(r1.nodes.get('c')).toEqual(r2.nodes.get('b'))
  })

  // === BOUNDS ===

  // 13. Bounds inclúe min/max das posicións
  it('bounds inclúe min/max das posicións dos nodos', () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('child')],
      edges: [e('e1', 'root', 'child')],
    })
    const lr = unwrap(layout.compute(td))
    // Root en (0, 0), child a distancia 100
    expect(lr.bounds.minX).toBeLessThanOrEqual(0)
    expect(lr.bounds.minY).toBeLessThanOrEqual(lr.nodes.get('child')?.y ?? 0)
    expect(lr.bounds.maxX).toBeGreaterThanOrEqual(0)
  })

  // 14. Bounds inclúe polygon
  it('bounds inclúe vértices do polygon se definido', () => {
    const td = makeTreeDef({
      nodes: [n('root')],
      layout: {
        type: 'radial',
        radius: 100,
        polygon: { sides: 4, radius: 500 },
      },
    })
    const lr = unwrap(layout.compute(td))
    // Polygon radius 500 >> nodo position → bounds extendidos
    expect(lr.bounds.maxX).toBeGreaterThanOrEqual(499)
    expect(lr.bounds.minY).toBeLessThanOrEqual(-499)
  })

  // === VALIDACIÓN ===

  // 15. Config inválido
  it('config inválido (type !== radial): err', () => {
    const td = makeTreeDef({ layout: { type: 'tree', radius: 100 } })
    const r = layout.compute(td)
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  // === MESH INTEGRATION ===

  // 16. meshType='none': cero mesh
  it("meshType='none': mesh ausente ou baleiro", () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('c')],
      edges: [e('e1', 'root', 'c')],
      layout: { type: 'radial', radius: 100, meshType: 'none' },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.mesh === undefined || lr.mesh.length === 0).toBe(true)
  })

  // 17. meshType='rings': N círculos
  it("meshType='rings': mesh contén círculos", () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('c')],
      edges: [e('e1', 'root', 'c')],
      layout: { type: 'radial', radius: 100, meshType: 'rings' },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.mesh).toBeDefined()
    const circles = lr.mesh?.filter((m) => m.type === 'circle') ?? []
    expect(circles.length).toBeGreaterThan(0)
  })

  // 18. meshType='cross': 2 liñas
  it("meshType='cross': mesh contén 2 liñas", () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('c')],
      edges: [e('e1', 'root', 'c')],
      layout: { type: 'radial', radius: 100, meshType: 'cross' },
    })
    const lr = unwrap(layout.compute(td))
    const lines = lr.mesh?.filter((m) => m.type === 'line') ?? []
    expect(lines.length).toBe(2)
  })

  // 19. polygon definido: mesh inclúe polígono
  it('polygon definido: mesh inclúe o polígono', () => {
    const td = makeTreeDef({
      nodes: [n('root')],
      layout: {
        type: 'radial',
        radius: 100,
        polygon: { sides: 6, radius: 200 },
      },
    })
    const lr = unwrap(layout.compute(td))
    const polys = lr.mesh?.filter((m) => m.type === 'polygon') ?? []
    expect(polys.length).toBe(1)
  })

  // === NodeDef.position IGNORASE ===

  // 20. NodeDef.position ignorase totalmente
  it('NodeDef.position ignorase totalmente: usa BFS', () => {
    const td = makeTreeDef({
      nodes: [n('root', { x: 999, y: 888 })],
    })
    const lr = unwrap(layout.compute(td))
    // 1 root → posición = (0, 0), NON (999, 888)
    expect(lr.nodes.get('root')).toEqual({ x: 0, y: 0 })
  })

  // 21. Nodos en ciclo non alcanzables por BFS: trátanse como nivel 0
  it('nodos en ciclo mutuo non alcanzables: asígnanse nivel 0', () => {
    const td = makeTreeDef({
      nodes: [n('root'), n('a'), n('b')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'a')],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.size).toBe(3)
  })

  // 22. Edge con source/target non no TreeDef.nodes: fallback (0, 0)
  it('edge con nodos fantasma: edge path usa (0, 0) como fallback', () => {
    const td = makeTreeDef({
      nodes: [n('a')],
      edges: [e('e1', 'a', 'ghost')],
    })
    const lr = unwrap(layout.compute(td))
    const edgePath = lr.edges.get('e1')
    expect(edgePath).toBeDefined()
    // target 'ghost' non está nos nodos → fallback (0, 0)
    expect(edgePath?.points[1]).toEqual({ x: 0, y: 0 })
  })
})
// ── FIN: tests de RadialLayout ──
