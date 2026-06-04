// ── INICIO: tests de MeshGenerator ──
import { describe, expect, it } from 'vitest'
import { generateMesh } from '../../../src/engine/layouts/MeshGenerator.js'
import type { RadialLayoutConfig } from '../../../src/engine/layouts/RadialLayoutConfig.js'

/** Config base para tests. */
const BASE_CONFIG: RadialLayoutConfig = { type: 'radial', radius: 100 }

describe('generateMesh', () => {
  // 1. 'none': cero elementos (sen polígono)
  it("meshType='none' sen polígono: array baleiro", () => {
    const r = generateMesh('none', BASE_CONFIG, 0, 0, [100, 200], new Map([['a', 0]]), 0)
    expect(r).toEqual([])
  })

  // 2. 'rings': N círculos para N niveis
  it("meshType='rings': un círculo por cada ringRadius", () => {
    const r = generateMesh('rings', BASE_CONFIG, 0, 0, [100, 200], new Map([['a', 0]]), 0)
    expect(r).toHaveLength(2)
    expect(r[0]).toEqual({ type: 'circle', center: { x: 0, y: 0 }, radius: 100 })
    expect(r[1]).toEqual({ type: 'circle', center: { x: 0, y: 0 }, radius: 200 })
  })

  // 3. 'cross': exactamente 2 liñas
  it("meshType='cross': 2 liñas (horizontal + vertical)", () => {
    const r = generateMesh('cross', BASE_CONFIG, 0, 0, [100, 200], new Map([['a', 0]]), 0)
    expect(r).toHaveLength(2)
    expect(r[0]).toEqual({
      type: 'line',
      from: { x: -200, y: 0 },
      to: { x: 200, y: 0 },
    })
    expect(r[1]).toEqual({
      type: 'line',
      from: { x: 0, y: -200 },
      to: { x: 0, y: 200 },
    })
  })

  // 4. 'star': N liñas para N roots
  it("meshType='star': N liñas para N roots (nodos de nivel 0)", () => {
    const levels = new Map([
      ['a', 0],
      ['b', 0],
      ['c', 1],
    ])
    const r = generateMesh('star', BASE_CONFIG, 0, 0, [100], levels, 0)
    // 2 roots → 2 radios
    expect(r).toHaveLength(2)
    expect(r[0].type).toBe('line')
    expect(r[1].type).toBe('line')
  })

  // 5. polygon sides=3: triángulo con 3 vértices
  it('polygon sides=3: triángulo', () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 3, radius: 50 },
    }
    const r = generateMesh('none', config, 0, 0, [], new Map(), 0)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('polygon')
    if (r[0].type === 'polygon') {
      expect(r[0].points).toHaveLength(3)
    }
  })

  // 6. polygon sides=4: cadrado con 4 vértices
  it('polygon sides=4: cadrado', () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 4, radius: 50 },
    }
    const r = generateMesh('none', config, 0, 0, [], new Map(), 0)
    expect(r).toHaveLength(1)
    if (r[0].type === 'polygon') {
      expect(r[0].points).toHaveLength(4)
    }
  })

  // 7. polygon sides=6: hexágono
  it('polygon sides=6: hexágono', () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 6, radius: 50 },
    }
    const r = generateMesh('none', config, 0, 0, [], new Map(), 0)
    if (r[0].type === 'polygon') {
      expect(r[0].points).toHaveLength(6)
    }
  })

  // 8. polygon NON definido: cero polígono
  it('polygon non definido: cero polígono no resultado', () => {
    const r = generateMesh('rings', BASE_CONFIG, 0, 0, [100], new Map([['a', 0]]), 0)
    const polygons = r.filter((e) => e.type === 'polygon')
    expect(polygons).toHaveLength(0)
  })

  // 9. 'rings' + polygon: ambos
  it("'rings' + polygon: ambos presentes", () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 4, radius: 200 },
    }
    const r = generateMesh('rings', config, 0, 0, [100], new Map([['a', 0]]), 0)
    const circles = r.filter((e) => e.type === 'circle')
    const polygons = r.filter((e) => e.type === 'polygon')
    expect(circles).toHaveLength(1)
    expect(polygons).toHaveLength(1)
  })

  // 10. 'none' + polygon: só polígono
  it("'none' + polygon: só polígono", () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 5, radius: 150 },
    }
    const r = generateMesh('none', config, 0, 0, [100], new Map(), 0)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('polygon')
  })

  // 11. cero ringRadii: 'rings' produce cero círculos
  it("cero ringRadii: 'rings' produce cero círculos", () => {
    const r = generateMesh('rings', BASE_CONFIG, 0, 0, [], new Map([['a', 0]]), 0)
    expect(r).toHaveLength(0)
  })

  // 12. cero roots: 'star' produce cero radios
  it("cero roots (0 nodos nivel 0): 'star' produce cero radios", () => {
    const levels = new Map([
      ['a', 1],
      ['b', 2],
    ])
    const r = generateMesh('star', BASE_CONFIG, 0, 0, [100], levels, 0)
    expect(r).toHaveLength(0)
  })

  // 13. 'cross' con cero ringRadii e sen polígono: maxR=0 → cero liñas
  it("'cross' sen ringRadii nin polígono: cero liñas", () => {
    const r = generateMesh('cross', BASE_CONFIG, 0, 0, [], new Map(), 0)
    expect(r).toHaveLength(0)
  })

  // 14. 'star' con cero ringRadii e sen polígono: maxR=0 → cero liñas
  it("'star' sen ringRadii nin polígono: cero liñas", () => {
    const levels = new Map([['a', 0]])
    const r = generateMesh('star', BASE_CONFIG, 0, 0, [], levels, 0)
    expect(r).toHaveLength(0)
  })

  // 15. 'cross' con cero ringRadii pero con polígono: usa polygon.radius
  it("'cross' con polígono pero sen ringRadii: usa polygon.radius", () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 4, radius: 200 },
    }
    const r = generateMesh('cross', config, 0, 0, [], new Map(), 0)
    // 1 polígono + 2 liñas cross
    const lines = r.filter((el) => el.type === 'line')
    expect(lines).toHaveLength(2)
  })

  // 16. 'star' con polígono pero sen ringRadii: usa polygon.radius
  it("'star' con polígono pero sen ringRadii: usa polygon.radius", () => {
    const config: RadialLayoutConfig = {
      ...BASE_CONFIG,
      polygon: { sides: 4, radius: 200 },
    }
    const levels = new Map([['a', 0]])
    const r = generateMesh('star', config, 0, 0, [], levels, 0)
    // 1 polígono + 1 radio (1 root)
    const lines = r.filter((el) => el.type === 'line')
    expect(lines).toHaveLength(1)
  })
})
// ── FIN: tests de MeshGenerator ──
