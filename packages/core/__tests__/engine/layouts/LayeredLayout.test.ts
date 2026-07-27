// ── INICIO: tests de LayeredLayout ──
// Regra P4 (lei deste briefing): toda posición asertada leva MAGNITUDE
// (toBeCloseTo ou cota superior xustificada) — NUNCA só orde relativa.
// Lección do bug multi-root de TreeLayout: `r2X > r1X` é certo tanto a
// 160px coma a 16.000px.
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { LayeredLayout } from '../../../src/engine/layouts/LayeredLayout.js'
import type { EdgeDef } from '../../../src/types/edge.js'
import type { NodeDef } from '../../../src/types/node.js'
import { isErr, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'layered-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Layered Test',
    nodes: [],
    edges: [],
    layout: { type: 'layered' },
    ...overrides,
  }
}

function n(id: string): NodeDef {
  return { id, type: 'skill', label: id }
}

function e(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'dependency' }
}

const layout = new LayeredLayout()

// Defaults do motor (espello de TreeLayout)
const NODE_SPACING = 80
const LEVEL_SPACING = 120

describe('LayeredLayout', () => {
  // === CASOS BÁSICOS ===

  it('TreeDef baleiro: bounds (0,0,0,0)', () => {
    const lr = unwrap(layout.compute(makeTreeDef()))
    expect(lr.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
    expect(lr.nodes.size).toBe(0)
    expect(lr.layoutType).toBe('layered')
  })

  it('1 nodo só: exactamente no centro (0,0)', () => {
    const td = makeTreeDef({ nodes: [n('a')] })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')?.x).toBeCloseTo(0, 5)
    expect(lr.nodes.get('a')?.y).toBeCloseTo(0, 5)
  })

  it('cadea simple a→b→c→d: columna x=0, capas a levelSpacing exacto (equivale a tree)', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'c'), e('e3', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    const ids = ['a', 'b', 'c', 'd']
    for (let i = 0; i < ids.length; i++) {
      const pos = lr.nodes.get(ids[i] as string)
      expect(pos?.x).toBeCloseTo(0, 5)
      expect(pos?.y).toBeCloseTo(i * LEVEL_SPACING, 5)
    }
  })

  // === O CASO QUE MOTIVA O MOTOR: multi-pai (panadeiro) ===

  it('panadeiro (pan con 2 pais): AMBOS pais na capa 0, magnitudes exactas', () => {
    // Réplica estrutural do panadeiro da galería:
    // fariña→pan, levadura→pan, fariña→masa, masa→churros
    const td = makeTreeDef({
      nodes: [n('fariña'), n('levadura'), n('pan'), n('masa'), n('churros')],
      edges: [
        e('e1', 'fariña', 'pan'),
        e('e2', 'levadura', 'pan'),
        e('e3', 'fariña', 'masa'),
        e('e4', 'masa', 'churros'),
      ],
    })
    const lr = unwrap(layout.compute(td))
    const fariña = lr.nodes.get('fariña')
    const levadura = lr.nodes.get('levadura')
    const pan = lr.nodes.get('pan')
    const masa = lr.nodes.get('masa')
    const churros = lr.nodes.get('churros')

    // A propiedade que TreeLayout NON dá: levadura non é unha raíz
    // apartada — comparte capa 0 con fariña, separadas UN slot exacto.
    expect(fariña?.y).toBeCloseTo(0, 5)
    expect(levadura?.y).toBeCloseTo(0, 5)
    expect(Math.abs((levadura?.x ?? 0) - (fariña?.x ?? 0))).toBeCloseTo(NODE_SPACING, 5)

    // pan na capa 1, coa x DENTRO do rango dos seus pais (as dúas
    // arestas baixan, ningunha cruza o layout en diagonal longa).
    expect(pan?.y).toBeCloseTo(LEVEL_SPACING, 5)
    const minPaiX = Math.min(fariña?.x ?? 0, levadura?.x ?? 0)
    const maxPaiX = Math.max(fariña?.x ?? 0, levadura?.x ?? 0)
    expect(pan?.x).toBeGreaterThanOrEqual(minPaiX)
    expect(pan?.x).toBeLessThanOrEqual(maxPaiX)

    // Posicións completas exactas (calculadas a man co algoritmo):
    // capa0 [fariña, levadura] → ±40; capa1 [masa, pan] tras
    // baricentro → masa -40 (baixo fariña), pan +40 (baixo levadura);
    // capa2 [churros] → 0.
    expect(fariña?.x).toBeCloseTo(-NODE_SPACING / 2, 5)
    expect(levadura?.x).toBeCloseTo(NODE_SPACING / 2, 5)
    expect(masa?.x).toBeCloseTo(-NODE_SPACING / 2, 5)
    expect(masa?.y).toBeCloseTo(LEVEL_SPACING, 5)
    expect(pan?.x).toBeCloseTo(NODE_SPACING / 2, 5)
    expect(churros?.x).toBeCloseTo(0, 5)
    expect(churros?.y).toBeCloseTo(2 * LEVEL_SPACING, 5)
  })

  it('diamante A→B, A→C, B→D, C→D: D centrado exactamente baixo B e C', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c'), n('d')],
      edges: [e('e1', 'a', 'b'), e('e2', 'a', 'c'), e('e3', 'b', 'd'), e('e4', 'c', 'd')],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')?.x).toBeCloseTo(0, 5)
    expect(lr.nodes.get('a')?.y).toBeCloseTo(0, 5)
    expect(lr.nodes.get('b')?.x).toBeCloseTo(-NODE_SPACING / 2, 5)
    expect(lr.nodes.get('c')?.x).toBeCloseTo(NODE_SPACING / 2, 5)
    expect(lr.nodes.get('b')?.y).toBeCloseTo(LEVEL_SPACING, 5)
    expect(lr.nodes.get('c')?.y).toBeCloseTo(LEVEL_SPACING, 5)
    // D no punto medio exacto dos dous pais, unha capa por baixo.
    expect(lr.nodes.get('d')?.x).toBeCloseTo(0, 5)
    expect(lr.nodes.get('d')?.y).toBeCloseTo(2 * LEVEL_SPACING, 5)
  })

  it('capa por camiño MÁIS LONGO, non mínimo: A→B→C e A→C pon C na capa 2', () => {
    // BFS (TreeLayout) daríalle a C nivel 1 (aresta directa A→C).
    // Longest path faille sitio: C debaixo de B, coas DÚAS arestas
    // entrantes baixando.
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'c'), e('e3', 'a', 'c')],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')?.y).toBeCloseTo(0, 5)
    expect(lr.nodes.get('b')?.y).toBeCloseTo(LEVEL_SPACING, 5)
    expect(lr.nodes.get('c')?.y).toBeCloseTo(2 * LEVEL_SPACING, 5)
    // Cadea única en x: columna exacta.
    expect(lr.nodes.get('c')?.x).toBeCloseTo(lr.nodes.get('b')?.x ?? -999, 5)
  })

  it('nodo illado (sen arestas): capa 0 canda as raíces, dentro dos bounds', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('solto')],
      edges: [e('e1', 'a', 'b')],
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('solto')?.y).toBeCloseTo(0, 5)
    // Capa 0 = [a, solto] → separación exacta dun slot.
    expect(Math.abs((lr.nodes.get('solto')?.x ?? 0) - (lr.nodes.get('a')?.x ?? 0))).toBeCloseTo(
      NODE_SPACING,
      5,
    )
  })

  // === CICLOS: err claro, nunca colgar nin colocar lixo ===

  it('ciclo directo a→b→a: err(CYCLE_DETECTED) cos nodos no context', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b')],
      edges: [e('e1', 'a', 'b'), e('e2', 'b', 'a')],
    })
    const result = layout.compute(td)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.CYCLE_DETECTED)
      const inCycle = result.error.context?.nodesInCycle as string[]
      expect(inCycle).toContain('a')
      expect(inCycle).toContain('b')
    }
  })

  it('ciclo parcial nun grafo maior: err, e o context NON acusa aos nodos sans', () => {
    const td = makeTreeDef({
      nodes: [n('san'), n('x'), n('y'), n('z')],
      edges: [e('e1', 'x', 'y'), e('e2', 'y', 'z'), e('e3', 'z', 'x')],
    })
    const result = layout.compute(td)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.CYCLE_DETECTED)
      const inCycle = result.error.context?.nodesInCycle as string[]
      expect(inCycle).toEqual(expect.arrayContaining(['x', 'y', 'z']))
      expect(inCycle).not.toContain('san')
    }
  })

  it('aresta dependency bidirectional: é un ciclo semántico → err', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b')],
      edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency', bidirectional: true }],
    })
    const result = layout.compute(td)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.CYCLE_DETECTED)
    }
  })

  // === CONFIG ===

  it('config con spacings custom: magnitudes escalan exactamente', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b'), n('c')],
      edges: [e('e1', 'a', 'b'), e('e2', 'a', 'c')],
      layout: { type: 'layered', nodeSpacing: 90, levelSpacing: 130 },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('b')?.x).toBeCloseTo(-45, 5)
    expect(lr.nodes.get('c')?.x).toBeCloseTo(45, 5)
    expect(lr.nodes.get('b')?.y).toBeCloseTo(130, 5)
  })

  it('direction left-right: capas avanzan en x, slots en y', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b')],
      edges: [e('e1', 'a', 'b')],
      layout: { type: 'layered', direction: 'left-right' },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')?.x).toBeCloseTo(0, 5)
    expect(lr.nodes.get('b')?.x).toBeCloseTo(LEVEL_SPACING, 5)
    expect(lr.nodes.get('b')?.y).toBeCloseTo(0, 5)
  })

  it('centerX/centerY: traslación exacta', () => {
    const td = makeTreeDef({
      nodes: [n('a')],
      layout: { type: 'layered', centerX: 300, centerY: 200 },
    })
    const lr = unwrap(layout.compute(td))
    expect(lr.nodes.get('a')?.x).toBeCloseTo(300, 5)
    expect(lr.nodes.get('a')?.y).toBeCloseTo(200, 5)
  })

  it('nodeSpacing inválido (≤0): err(LAYOUT_COMPUTE_FAILED)', () => {
    const td = makeTreeDef({
      nodes: [n('a')],
      layout: { type: 'layered', nodeSpacing: -5 },
    })
    const result = layout.compute(td)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
    }
  })

  it('type distinto de layered: err(LAYOUT_COMPUTE_FAILED)', () => {
    const td = makeTreeDef({ nodes: [n('a')], layout: { type: 'tree' } })
    const result = layout.compute(td)
    expect(isErr(result)).toBe(true)
  })

  // === DETERMINISMO ===

  it('determinismo byte a byte: dúas execucións → posicións idénticas', () => {
    const td = makeTreeDef({
      nodes: [n('fariña'), n('levadura'), n('pan'), n('masa'), n('churros')],
      edges: [
        e('e1', 'fariña', 'pan'),
        e('e2', 'levadura', 'pan'),
        e('e3', 'fariña', 'masa'),
        e('e4', 'masa', 'churros'),
      ],
    })
    const serialize = (): string =>
      JSON.stringify(Array.from(unwrap(layout.compute(td)).nodes.entries()))
    expect(serialize()).toBe(serialize())
  })

  // === EDGES + BOUNDS ===

  it('edges: liñas rectas entre posicións reais; bounds axustados ás posicións', () => {
    const td = makeTreeDef({
      nodes: [n('a'), n('b')],
      edges: [e('e1', 'a', 'b')],
    })
    const lr = unwrap(layout.compute(td))
    const path = lr.edges.get('e1')
    expect(path?.points).toEqual([lr.nodes.get('a'), lr.nodes.get('b')])
    expect(lr.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: LEVEL_SPACING })
  })
})
// ── FIN: tests de LayeredLayout ──
