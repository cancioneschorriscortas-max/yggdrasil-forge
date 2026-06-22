// ── INICIO: tests de QuadTree ──
import { describe, expect, it } from 'vitest'
import type { LayoutResult } from '../../../src/engine/layouts/LayoutResult.js'
import { QuadTree } from '../../../src/engine/layouts/QuadTree.js'

function pts(
  ...pairs: Array<[string, number, number]>
): ReadonlyMap<string, { x: number; y: number }> {
  return new Map(pairs.map(([id, x, y]) => [id, { x, y }]))
}

describe('QuadTree', () => {
  // Construción
  it('QuadTree baleiro: size 0', () => {
    const qt = new QuadTree(new Map())
    expect(qt.size()).toBe(0)
  })

  it('QuadTree baleiro: queryNearest devolve undefined', () => {
    const qt = new QuadTree(new Map())
    expect(qt.queryNearest({ x: 0, y: 0 })).toBeUndefined()
  })

  it('QuadTree con 1 punto: size 1', () => {
    const qt = new QuadTree(pts(['a', 5, 5]))
    expect(qt.size()).toBe(1)
  })

  it('QuadTree con 1 punto: queryNearest devolve ese', () => {
    const qt = new QuadTree(pts(['a', 5, 5]))
    expect(qt.queryNearest({ x: 0, y: 0 })).toBe('a')
  })

  it('QuadTree con N puntos: size N', () => {
    const qt = new QuadTree(pts(['a', 0, 0], ['b', 1, 1], ['c', 2, 2]))
    expect(qt.size()).toBe(3)
  })

  it('fromLayoutResult: construído correctamente', () => {
    const lr: LayoutResult = {
      nodes: pts(['a', 0, 0], ['b', 10, 10]),
      edges: new Map(),
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      layoutType: 'test',
    }
    const qt = QuadTree.fromLayoutResult(lr)
    expect(qt.size()).toBe(2)
  })

  it('extent custom: usa o proporcionado', () => {
    const qt = new QuadTree(pts(['a', 5, 5]), {
      extent: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    })
    expect(qt.size()).toBe(1)
  })

  // queryRange
  it('range que cubre todos: devolve todos', () => {
    const qt = new QuadTree(pts(['a', 1, 1], ['b', 5, 5], ['c', 9, 9]))
    const r = qt.queryRange({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
    expect(r).toHaveLength(3)
    expect(new Set(r)).toEqual(new Set(['a', 'b', 'c']))
  })

  it('range que non cubre ningún: devolve []', () => {
    const qt = new QuadTree(pts(['a', 1, 1], ['b', 5, 5]))
    const r = qt.queryRange({ minX: 50, minY: 50, maxX: 100, maxY: 100 })
    expect(r).toHaveLength(0)
  })

  it('range parcial: devolve só os contidos', () => {
    const qt = new QuadTree(pts(['a', 1, 1], ['b', 5, 5], ['c', 9, 9]))
    const r = qt.queryRange({ minX: 0, minY: 0, maxX: 6, maxY: 6 })
    expect(new Set(r)).toEqual(new Set(['a', 'b']))
  })

  it('puntos no borde: inclusivos', () => {
    const qt = new QuadTree(pts(['a', 5, 5]))
    const r = qt.queryRange({ minX: 5, minY: 5, maxX: 5, maxY: 5 })
    expect(r).toEqual(['a'])
  })

  it('range fóra dos extents: devolve []', () => {
    const qt = new QuadTree(pts(['a', 5, 5]))
    const r = qt.queryRange({
      minX: 1000,
      minY: 1000,
      maxX: 2000,
      maxY: 2000,
    })
    expect(r).toHaveLength(0)
  })

  // queryNearest
  it('punto distante: devolve o máis preto', () => {
    const qt = new QuadTree(pts(['a', 0, 0], ['b', 100, 100], ['c', 50, 50]))
    expect(qt.queryNearest({ x: 48, y: 48 })).toBe('c')
  })

  it('punto coincidente: devolve ese', () => {
    const qt = new QuadTree(pts(['a', 5, 5], ['b', 10, 10]))
    expect(qt.queryNearest({ x: 5, y: 5 })).toBe('a')
  })

  // Subdivisión
  it('inserir 5 puntos (maxPointsPerNode=4): forza subdivisión', () => {
    const qt = new QuadTree(pts(['a', 1, 1], ['b', 2, 2], ['c', 3, 3], ['d', 4, 4], ['e', 5, 5]), {
      maxPointsPerNode: 4,
    })
    expect(qt.size()).toBe(5)
    // Todos aínda accesibles
    const r = qt.queryRange({ minX: 0, minY: 0, maxX: 10, maxY: 10 })
    expect(r).toHaveLength(5)
  })

  it('inserir 100 puntos: correctamente equilibrada', () => {
    const points = new Map<string, { x: number; y: number }>()
    for (let i = 0; i < 100; i++) {
      points.set(`p${i}`, { x: i * 10, y: i * 5 })
    }
    const qt = new QuadTree(points)
    expect(qt.size()).toBe(100)
    const r = qt.queryRange({
      minX: -1,
      minY: -1,
      maxX: 1000,
      maxY: 500,
    })
    expect(r).toHaveLength(100)
  })

  it('maxDepth limit: puntos coincidentes non excedan profundidade', () => {
    // Todos no mesmo lugar; maxDepth=2 limita recursión
    const qt = new QuadTree(
      pts(['a', 5, 5], ['b', 5, 5], ['c', 5, 5], ['d', 5, 5], ['e', 5, 5], ['f', 5, 5]),
      { maxPointsPerNode: 2, maxDepth: 2 },
    )
    expect(qt.size()).toBe(6)
    const r = qt.queryRange({ minX: 4, minY: 4, maxX: 6, maxY: 6 })
    expect(r).toHaveLength(6)
  })

  // Edge cases
  it('múltiples puntos no mesmo lugar: aceptados', () => {
    const qt = new QuadTree(pts(['a', 5, 5], ['b', 5, 5]))
    expect(qt.size()).toBe(2)
    expect(qt.queryRange({ minX: 5, minY: 5, maxX: 5, maxY: 5 })).toHaveLength(2)
  })

  it('extent cero (minX==maxX): cero crash', () => {
    const qt = new QuadTree(pts(['a', 5, 5]), {
      extent: { minX: 5, minY: 5, maxX: 5, maxY: 5 },
    })
    expect(qt.size()).toBe(1)
  })

  // Integración
  it('fromLayoutResult con LayoutResult baleiro: size 0', () => {
    const lr: LayoutResult = {
      nodes: new Map(),
      edges: new Map(),
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      layoutType: 'test',
    }
    const qt = QuadTree.fromLayoutResult(lr)
    expect(qt.size()).toBe(0)
  })

  // Determinismo
  it('mesmos puntos, mesma orde: mesmos resultados', () => {
    const input = pts(['a', 1, 1], ['b', 5, 5], ['c', 9, 9])
    const qt1 = new QuadTree(input)
    const qt2 = new QuadTree(input)
    const range = { minX: 0, minY: 0, maxX: 6, maxY: 6 }
    expect(qt1.queryRange(range)).toEqual(qt2.queryRange(range))
  })

  // queryNearest sobre QuadTree subdividida: cobre ramas internas
  // (visita ordenada de children + prune por distancia).
  it('queryNearest nun QuadTree subdividido visita children ordenados', () => {
    const qt = new QuadTree(
      pts(['a', 1, 1], ['b', 99, 1], ['c', 1, 99], ['d', 99, 99], ['e', 50, 50]),
      { maxPointsPerNode: 2 }, // forza subdivisión
    )
    // Pregunta cerca de 'a'; visita o seu cuadrante primeiro.
    expect(qt.queryNearest({ x: 2, y: 2 })).toBe('a')
    // Pregunta cerca de 'd'; visita o seu cuadrante primeiro.
    expect(qt.queryNearest({ x: 98, y: 98 })).toBe('d')
  })

  it('queryNearest con punto distante: o prune por distancia executase', () => {
    // Forzamos 100 puntos repartidos para subdividir profundamente.
    const points = new Map<string, { x: number; y: number }>()
    for (let i = 0; i < 100; i++) {
      points.set(`p${i}`, { x: i, y: i })
    }
    const qt = new QuadTree(points, { maxPointsPerNode: 4 })
    // Buscar máis preto de (5,5) → debería ser 'p5'. A prune dispara
    // ao saltar cuadrantes lonxe.
    expect(qt.queryNearest({ x: 5, y: 5 })).toBe('p5')
  })
})
// ── FIN: tests de QuadTree ──
