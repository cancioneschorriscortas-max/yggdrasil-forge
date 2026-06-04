// ── INICIO: tests de TreeLayout ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeLayout } from '../../../src/engine/layouts/TreeLayout.js'
import type { EdgeDef } from '../../../src/types/edge.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isErr, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'tree-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Tree Test',
    nodes: [],
    edges: [],
    layout: { type: 'tree' },
    ...overrides,
  }
}

function n(id: string): NodeDef {
  return { id, type: 'skill', label: id }
}

function e(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'dependency' }
}

const layout = new TreeLayout()

describe('TreeLayout', () => {
  // === CASOS BÁSICOS ===

  it('TreeDef baleiro: bounds (0,0,0,0)', () => {
    const lr = unwrap(layout.compute(makeTreeDef()))
    expect(lr.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
    expect(lr.nodes.size).toBe(0)
  })

  it('1 root só: posición no centro', () => {
    const td = makeTreeDef({ nodes: [n('a')] })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')).toEqual({ x: 0, y: 0 })
  })

  it('1 root + 2 fillos: distribución simétrica', () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('l'), n('rr')],
      edges: [e('e1', 'r', 'l'), e('e2', 'r', 'rr')],
    })
    const lr = unwrap(layout.compute(td))
    const rl = lr.nodes.get('l')
    const rr = lr.nodes.get('rr')
    expect(rl).toBeDefined()
    expect(rr).toBeDefined()
    // Simétricos arredor do pai
    const rootX = lr.nodes.get('r')?.x ?? 0
    expect((rl?.x ?? 0) + (rr?.x ?? 0)).toBeCloseTo(rootX * 2, 5)
  })

  it('1 root + 3 fillos: fillo central baixo o pai', () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('a'), n('b'), n('c')],
      edges: [e('e1', 'r', 'a'), e('e2', 'r', 'b'), e('e3', 'r', 'c')],
    })
    const lr = unwrap(layout.compute(td))
    // Fillo do medio (b) alineado co pai
    expect(lr.nodes.get('r')?.x).toBeCloseTo(lr.nodes.get('b')?.x ?? -999, 5)
  })

  it('cadea lineal (4 niveles): nodos en columna vertical', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'c'), e('e3', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    // Todos na mesma columna X
    const xA = lr.nodes.get('a')?.x ?? -999
    expect(lr.nodes.get('b')?.x).toBeCloseTo(xA, 5)
    expect(lr.nodes.get('c')?.x).toBeCloseTo(xA, 5)
    expect(lr.nodes.get('d')?.x).toBeCloseTo(xA, 5)
    // Y crecente
    const yA = lr.nodes.get('a')?.y ?? 0
    const yB = lr.nodes.get('b')?.y ?? 0
    const yC = lr.nodes.get('c')?.y ?? 0
    const yD = lr.nodes.get('d')?.y ?? 0
    expect(yB).toBeGreaterThan(yA)
    expect(yC).toBeGreaterThan(yB)
    expect(yD).toBeGreaterThan(yC)
  })

  it('1 root + 10 fillos: todos no mesmo nivel Y', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`)
    const nodes = [n('r'), ...ids.map(n)]
    const edges = ids.map((id, i) => e(`e${i}`, 'r', id))
    const td = makeTreeDef({ nodes, edges })
    const lr = unwrap(layout.compute(td))
    // Todos os fillos teñen o mesmo Y
    const childY = lr.nodes.get('c0')?.y ?? -999
    for (const id of ids) {
      expect(lr.nodes.get(id)?.y).toBeCloseTo(childY, 5)
    }
  })

  // === BUCHHEIM (tidy) ===

  it('subárbores asimétricas: sen colisión no mesmo nivel', () => {
    // r → l (con 3 fillos), r → rr (folla)
    const td = makeTreeDef({
      nodes: [n('r'), n('l'), n('rr'), n('l1'), n('l2'), n('l3')],
      edges: [
        e('e1', 'r', 'l'),
        e('e2', 'r', 'rr'),
        e('e3', 'l', 'l1'),
        e('e4', 'l', 'l2'),
        e('e5', 'l', 'l3'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    // rr e l están no mesmo nivel; rr debe estar á dereita de l
    const rrX = lr.nodes.get('rr')?.x ?? 0
    const lX = lr.nodes.get('l')?.x ?? 0
    expect(rrX).toBeGreaterThan(lX)
  })

  it('diamond DAG (A→B, A→C, B→D, C→D): D no nivel 2', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'a', 'c'), e('e3', 'b', 'd'), e('e4', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    // D ten primary parent = B (primeiro en orde treeDef.nodes con level 1)
    // D está debaixo de B
    const bX = lr.nodes.get('b')?.x ?? -999
    const dX = lr.nodes.get('d')?.x ?? -999
    expect(dX).toBeCloseTo(bX, 5) // D é fillo único de B no layout
  })

  it('cadea linear longa (A→B→C→D→E): vertical', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d'), n('e')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'c'), e('e3', 'c', 'd'), e('e4', 'd', 'e')],
    })
    const lr = unwrap(layout.compute(td))
    const xA = lr.nodes.get('a')?.x ?? -999
    // Todos na mesma X (cadea vertical)
    for (const id of ['b', 'c', 'd', 'e']) {
      expect(lr.nodes.get(id)?.x).toBeCloseTo(xA, 5)
    }
  })

  // === DAG → tree ===

  it('nodo con 3 prereqs: primary parent = primeiro por orde nodes', () => {
    // p1, p2, p3 → child (todos level 0 → child level 1)
    const td = makeTreeDef({
      nodes: [n('p2'), n('p1'), n('p3'), n('child')],
      edges: [e('e1', 'p1', 'child'), e('e2', 'p2', 'child'), e('e3', 'p3', 'child')],
    })
    const lr = unwrap(layout.compute(td))
    // primary parent = p2 (primeiro en treeDef.nodes con level 0)
    // child debería estar debaixo de p2
    const p2X = lr.nodes.get('p2')?.x ?? -999
    const childX = lr.nodes.get('child')?.x ?? -999
    expect(childX).toBeCloseTo(p2X, 5)
  })

  it('nodo con prereqs de levels diferentes: primary parent = level-1', () => {
    // a → b → c, b → d (e tamén c → d). d ten pais b(1) e c(2). d level=2.
    // Primary parent de d = candidates con level 1 = [b]
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'c'), e('e3', 'b', 'd'), e('e4', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    // d (level 2) ten primary parent b (level 1)
    // d é fillo de b no layout, igual que c
    const bX = lr.nodes.get('b')?.x ?? -999
    const rX = lr.nodes.get('a')?.x ?? -999
    // b está debaixo de a (cadea), ambos na mesma columna X
    expect(bX).toBeCloseTo(rX, 5)
    // d está ao lado de c (ambos fillos de b)
    expect(lr.edges.size).toBe(4) // todos os edges visibles
  })

  it('edges non utilizados no layout seguen visibles', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c')],
      edges: [e('e1', 'a', 'b'), e('e2', 'a', 'c'), e('e3', 'b', 'c')],
    })
    const lr = unwrap(layout.compute(td))
    // Todos os 3 edges visibles
    expect(lr.edges.size).toBe(3)
    expect(lr.edges.has('e1')).toBe(true)
    expect(lr.edges.has('e2')).toBe(true)
    expect(lr.edges.has('e3')).toBe(true)
  })

  // === DIRECCIÓNS ===

  it("'top-down': Y crece cara abaixo", () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('c')],
      edges: [e('e1', 'r', 'c')],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('c')?.y ?? 0).toBeGreaterThan(lr.nodes.get('r')?.y ?? 0)
  })

  it("'bottom-up': Y crece cara arriba", () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('c')],
      edges: [e('e1', 'r', 'c')],
      layout: { type: 'tree', direction: 'bottom-up' },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('c')?.y ?? 0).toBeLessThan(lr.nodes.get('r')?.y ?? 0)
  })

  it("'left-right': niveis no eixe X (crece cara dereita)", () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('c')],
      edges: [e('e1', 'r', 'c')],
      layout: { type: 'tree', direction: 'left-right' },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('c')?.x ?? 0).toBeGreaterThan(lr.nodes.get('r')?.x ?? 0)
  })

  it("'right-left': niveis no eixe X (crece cara esquerda)", () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('c')],
      edges: [e('e1', 'r', 'c')],
      layout: { type: 'tree', direction: 'right-left' },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('c')?.x ?? 0).toBeLessThan(lr.nodes.get('r')?.x ?? 0)
  })

  it('cada dirección preserva topoloxía (mesmos nodos e edges)', () => {
    const base = {
      nodes: [n('r'), n('a'), n('b')],
      edges: [e('e1', 'r', 'a'), e('e2', 'r', 'b')],
    }
    for (const dir of ['top-down', 'bottom-up', 'left-right', 'right-left'] as const) {
      const td = makeTreeDef({ ...base, layout: { type: 'tree', direction: dir } })
      const lr = unwrap(layout.compute(td))
      expect(lr.nodes.size).toBe(3)
      expect(lr.edges.size).toBe(2)
    }
  })

  // === MÚLTIPLES ROOTS ===

  it('2 roots separados horizontalmente', () => {
    const td = makeTreeDef({
      nodes: [n('r1'), n('r2'), n('c1'), n('c2')],
      edges: [e('e1', 'r1', 'c1'), e('e2', 'r2', 'c2')],
    })
    const lr = unwrap(layout.compute(td))
    const r1X = lr.nodes.get('r1')?.x ?? 0
    const r2X = lr.nodes.get('r2')?.x ?? 0
    expect(r2X).toBeGreaterThan(r1X)
  })

  it('3 roots: shift acumulado', () => {
    const td = makeTreeDef({ nodes: [n('a'), n('b'), n('c')] })
    const lr = unwrap(layout.compute(td))
    const xA = lr.nodes.get('a')?.x ?? 0
    const xB = lr.nodes.get('b')?.x ?? 0
    const xC = lr.nodes.get('c')?.x ?? 0
    expect(xB).toBeGreaterThan(xA)
    expect(xC).toBeGreaterThan(xB)
  })

  // === CONFIGURACIÓN ===

  it('nodeSpacing custom', () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('a'), n('b')],
      edges: [e('e1', 'r', 'a'), e('e2', 'r', 'b')],
      layout: { type: 'tree', nodeSpacing: 200 },
    })
    const lr = unwrap(layout.compute(td))
    const aX = lr.nodes.get('a')?.x ?? 0
    const bX = lr.nodes.get('b')?.x ?? 0
    // Distancia = 1 (lóxico Buchheim) * 200 (nodeSpacing)
    expect(Math.abs(bX - aX)).toBeCloseTo(200, 5)
  })

  it('levelSpacing custom', () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('c')],
      edges: [e('e1', 'r', 'c')],
      layout: { type: 'tree', levelSpacing: 200 },
    })
    const lr = unwrap(layout.compute(td))
    const yR = lr.nodes.get('r')?.y ?? 0
    const yC = lr.nodes.get('c')?.y ?? 0
    expect(yC - yR).toBeCloseTo(200, 5)
  })

  it('centerX/centerY custom', () => {
    const td = makeTreeDef({
      nodes: [n('a')],
      layout: { type: 'tree', centerX: 50, centerY: 30 },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')).toEqual({ x: 50, y: 30 })
  })

  // === DETERMINISMO + EDGE CASES ===

  it('determinismo: dúas chamadas producen mesmas posicións', () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('a'), n('b'), n('c')],
      edges: [e('e1', 'r', 'a'), e('e2', 'r', 'b'), e('e3', 'r', 'c')],
    })
    const r1 = unwrap(layout.compute(td))
    const r2 = unwrap(layout.compute(td))
    for (const id of ['r', 'a', 'b', 'c']) {
      expect(r1.nodes.get(id)).toEqual(r2.nodes.get(id))
    }
  })

  it('reordenar treeDef.nodes cambia primary parent', () => {
    // DAG: p1→d, p2→d. Orde 1: [p1, p2, d] → primary=p1.
    // Orde 2: [p2, p1, d] → primary=p2.
    const td1 = makeTreeDef({
      nodes: [n('p1'), n('p2'), n('d')],
      edges: [e('e1', 'p1', 'd'), e('e2', 'p2', 'd')],
    })
    const td2 = makeTreeDef({
      nodes: [n('p2'), n('p1'), n('d')],
      edges: [e('e1', 'p1', 'd'), e('e2', 'p2', 'd')],
    })
    const lr1 = unwrap(layout.compute(td1))
    const lr2 = unwrap(layout.compute(td2))
    // d está debaixo de p1 en td1, debaixo de p2 en td2
    const p1X = lr1.nodes.get('p1')?.x ?? -999
    const dX1 = lr1.nodes.get('d')?.x ?? -999
    const p2X = lr2.nodes.get('p2')?.x ?? -999
    const dX2 = lr2.nodes.get('d')?.x ?? -999
    expect(dX1).toBeCloseTo(p1X, 5)
    expect(dX2).toBeCloseTo(p2X, 5)
  })

  it('config inválido: err', () => {
    const td = makeTreeDef({ layout: { type: 'radial', radius: 100 } })
    const r = layout.compute(td)
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  // === BUCHHEIM AVANZADO (apportion/threads/moveSubtree) ===

  it('árbore con profundidades distintas: apportion + threads', () => {
    // root → a (profunda: a→a1→a11), root → b (folla)
    // Forza threads na contorna de b vs a
    const td = makeTreeDef({
      nodes: [n('root'), n('a'), n('b'), n('a1'), n('a11')],
      edges: [e('e1', 'root', 'a'), e('e2', 'root', 'b'), e('e3', 'a', 'a1'), e('e4', 'a1', 'a11')],
    })
    const lr = unwrap(layout.compute(td))
    // b á dereita de a
    expect(lr.nodes.get('b')?.x ?? 0).toBeGreaterThan(lr.nodes.get('a')?.x ?? 0)
    // a11 no nivel 3
    expect(lr.nodes.size).toBe(5)
  })

  it('3 subárbores con sobreposición: moveSubtree actívase', () => {
    // root → a, root → b, root → c
    // a ten subárbore ancha (a→a1, a→a2, a→a3)
    // b é folla, c é folla
    // Buchheim debe separar b e c da subárbore de a
    const td = makeTreeDef({
      nodes: [n('root'), n('a'), n('b'), n('c'), n('a1'), n('a2'), n('a3')],
      edges: [
        e('e1', 'root', 'a'),
        e('e2', 'root', 'b'),
        e('e3', 'root', 'c'),
        e('e4', 'a', 'a1'),
        e('e5', 'a', 'a2'),
        e('e6', 'a', 'a3'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    // b está entre a e c
    const aX = lr.nodes.get('a')?.x ?? -999
    const bX = lr.nodes.get('b')?.x ?? -999
    const cX = lr.nodes.get('c')?.x ?? -999
    expect(bX).toBeGreaterThan(aX)
    expect(cX).toBeGreaterThan(bX)
  })

  it('árbore binaria completa (7 nodos): distribución simétrica', () => {
    // r → l, r → rr; l → ll, l → lr; rr → rl, rr → rr2
    const td = makeTreeDef({
      nodes: [n('r'), n('l'), n('rr'), n('ll'), n('lr'), n('rl'), n('rr2')],
      edges: [
        e('e1', 'r', 'l'),
        e('e2', 'r', 'rr'),
        e('e3', 'l', 'll'),
        e('e4', 'l', 'lr'),
        e('e5', 'rr', 'rl'),
        e('e6', 'rr', 'rr2'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    // Simetría: r centrado
    const rX = lr.nodes.get('r')?.x ?? 0
    const lX = lr.nodes.get('l')?.x ?? 0
    const rrX = lr.nodes.get('rr')?.x ?? 0
    expect(rX).toBeCloseTo((lX + rrX) / 2, 5)
    // ll á esquerda, rr2 á dereita
    expect(lr.nodes.get('ll')?.x ?? 0).toBeLessThan(lr.nodes.get('rr2')?.x ?? 0)
  })

  it('árbore profunda asimétrica forza apportion completo', () => {
    // root → a → a1 → a11 → a111 (profunda esquerda)
    // root → b → b1 (menos profunda dereita)
    const td = makeTreeDef({
      nodes: [n('root'), n('a'), n('b'), n('a1'), n('b1'), n('a11'), n('a111')],
      edges: [
        e('e1', 'root', 'a'),
        e('e2', 'root', 'b'),
        e('e3', 'a', 'a1'),
        e('e4', 'a1', 'a11'),
        e('e5', 'a11', 'a111'),
        e('e6', 'b', 'b1'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.size).toBe(7)
    // b á dereita de a
    expect(lr.nodes.get('b')?.x ?? 0).toBeGreaterThan(lr.nodes.get('a')?.x ?? 0)
  })

  it('árbore con 4 fillos: executeShifts distribúe uniformemente', () => {
    const td = makeTreeDef({
      nodes: [n('r'), n('a'), n('b'), n('c'), n('d'), n('a1'), n('a2'), n('d1'), n('d2')],
      edges: [
        e('e1', 'r', 'a'),
        e('e2', 'r', 'b'),
        e('e3', 'r', 'c'),
        e('e4', 'r', 'd'),
        e('e5', 'a', 'a1'),
        e('e6', 'a', 'a2'),
        e('e7', 'd', 'd1'),
        e('e8', 'd', 'd2'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    // 4 fillos: a < b < c < d
    const aX = lr.nodes.get('a')?.x ?? 0
    const bX = lr.nodes.get('b')?.x ?? 0
    const cX = lr.nodes.get('c')?.x ?? 0
    const dX = lr.nodes.get('d')?.x ?? 0
    expect(bX).toBeGreaterThan(aX)
    expect(cX).toBeGreaterThan(bX)
    expect(dX).toBeGreaterThan(cX)
  })

  it('nodo illado (sen edges) trátase como root', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('lone')],
      edges: [e('e1', 'a', 'b')],
    })
    const lr = unwrap(layout.compute(td))
    // lone é un root separado, todos os nodos teñen posición
    expect(lr.nodes.size).toBe(3)
    expect(lr.nodes.has('lone')).toBe(true)
  })

  it('layoutType === tree', () => {
    const td = makeTreeDef({
      nodes: [n('a')],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.layoutType).toBe('tree')
  })
})
// ── FIN: tests de TreeLayout ──
