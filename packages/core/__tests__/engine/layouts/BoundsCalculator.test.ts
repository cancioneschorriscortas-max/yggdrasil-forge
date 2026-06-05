// ── INICIO: tests de BoundsCalculator ──
import { describe, expect, it } from 'vitest'
import { computeBounds } from '../../../src/engine/layouts/BoundsCalculator.js'
import type { LayoutResult } from '../../../src/engine/layouts/LayoutResult.js'

function makeLR(overrides?: Partial<LayoutResult>): LayoutResult {
  return {
    nodes: new Map(),
    edges: new Map(),
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    layoutType: 'test',
    ...overrides,
  }
}

describe('computeBounds', () => {
  // Básicos
  it('LayoutResult baleiro: bounds (0,0,0,0)', () => {
    expect(computeBounds(makeLR())).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    })
  })

  it('un nodo: bounds redondea o nodo', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 5, y: 10 }]]),
      }),
    )
    expect(b).toEqual({ minX: 5, minY: 10, maxX: 5, maxY: 10 })
  })

  it('múltiples nodos: min/max correctos', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([
          ['a', { x: -5, y: 10 }],
          ['b', { x: 15, y: -3 }],
        ]),
      }),
    )
    expect(b).toEqual({ minX: -5, minY: -3, maxX: 15, maxY: 10 })
  })

  it('padding uniforme: amplía bounds', () => {
    const b = computeBounds(makeLR({ nodes: new Map([['a', { x: 0, y: 0 }]]) }), { padding: 10 })
    expect(b).toEqual({ minX: -10, minY: -10, maxX: 10, maxY: 10 })
  })

  // paddingPerNode
  it('paddingPerNode devolve undefined: fallback ao default', () => {
    const b = computeBounds(makeLR({ nodes: new Map([['a', { x: 0, y: 0 }]]) }), {
      padding: 5,
      paddingPerNode: () => undefined,
    })
    expect(b).toEqual({ minX: -5, minY: -5, maxX: 5, maxY: 5 })
  })

  it('paddingPerNode devolve número: usa ese', () => {
    const b = computeBounds(makeLR({ nodes: new Map([['a', { x: 0, y: 0 }]]) }), {
      paddingPerNode: () => 20,
    })
    expect(b).toEqual({ minX: -20, minY: -20, maxX: 20, maxY: 20 })
  })

  it('paddingPerNode varía por nodo', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([
          ['a', { x: 0, y: 0 }],
          ['b', { x: 10, y: 10 }],
        ]),
      }),
      { paddingPerNode: (id) => (id === 'a' ? 5 : 20) },
    )
    expect(b.minX).toBe(-10) // b(10) con padding 20 → 10-20=-10
    expect(b.maxX).toBe(30) // b(10) con padding 20 → 10+20=30
    expect(b.minY).toBe(-10) // b(10) con padding 20 → 10-20=-10
    expect(b.maxY).toBe(30) // b(10) con padding 20 → 10+20=30
  })

  // Mesh
  it('includesMesh true + circles: bounds inclúe', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 0, y: 0 }]]),
        mesh: [{ type: 'circle', center: { x: 0, y: 0 }, radius: 100 }],
      }),
    )
    expect(b.minX).toBe(-100)
    expect(b.maxX).toBe(100)
  })

  it('includesMesh false: mesh ignorado', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 0, y: 0 }]]),
        mesh: [{ type: 'circle', center: { x: 0, y: 0 }, radius: 100 }],
      }),
      { includesMesh: false },
    )
    expect(b.minX).toBe(0)
    expect(b.maxX).toBe(0)
  })

  it('mesh con lines e polygons: bounds inclúe', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 0, y: 0 }]]),
        mesh: [
          { type: 'line', from: { x: -50, y: -50 }, to: { x: 50, y: 50 } },
          {
            type: 'polygon',
            points: [
              { x: -30, y: -30 },
              { x: 70, y: 70 },
            ],
          },
        ],
      }),
    )
    expect(b.minX).toBe(-50)
    expect(b.maxX).toBe(70)
  })

  // Edges
  it('includesEdges true + cubic: control points incluidos', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 0, y: 0 }]]),
        edges: new Map([
          [
            'e1',
            {
              points: [
                { x: 0, y: 0 },
                { x: -50, y: 25 },
                { x: 50, y: 75 },
                { x: 10, y: 100 },
              ],
              kind: 'cubic',
            },
          ],
        ]),
      }),
    )
    expect(b.minX).toBe(-50)
    expect(b.maxX).toBe(50)
  })

  it('includesEdges false: só nodes', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 0, y: 0 }]]),
        edges: new Map([
          [
            'e1',
            {
              points: [
                { x: -100, y: -100 },
                { x: 100, y: 100 },
              ],
            },
          ],
        ]),
      }),
      { includesEdges: false, includesMesh: false },
    )
    expect(b.minX).toBe(0)
    expect(b.maxX).toBe(0)
  })

  // Edge cases
  it('mesh undefined: cero crash', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 5, y: 5 }]]),
      }),
    )
    expect(b.minX).toBe(5)
  })

  it('edges baleiros: cero efecto', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 5, y: 5 }]]),
      }),
    )
    expect(b).toEqual({ minX: 5, minY: 5, maxX: 5, maxY: 5 })
  })

  it('polygon baleiro: cero crash', () => {
    const b = computeBounds(
      makeLR({
        nodes: new Map([['a', { x: 0, y: 0 }]]),
        mesh: [{ type: 'polygon', points: [] }],
      }),
    )
    expect(b.minX).toBe(0)
  })

  // Determinismo
  it('determinismo: mesma entrada = mesma saída', () => {
    const input = makeLR({
      nodes: new Map([
        ['a', { x: 1, y: 2 }],
        ['b', { x: 3, y: 4 }],
      ]),
    })
    expect(computeBounds(input)).toEqual(computeBounds(input))
  })

  // Inmutabilidade
  it('LayoutResult input non modificado', () => {
    const input = makeLR({
      nodes: new Map([['a', { x: 5, y: 5 }]]),
    })
    const origNodes = input.nodes
    computeBounds(input, { padding: 100 })
    expect(input.nodes).toBe(origNodes)
  })
})
// ── FIN: tests de BoundsCalculator ──
