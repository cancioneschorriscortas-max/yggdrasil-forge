// ── INICIO: tests coverage-paydown ──
// Bloque de tests dirixidos a cubrir ramas alcanzables identificadas
// na auditoría de cobertura (briefing "cola longa"). Ramas defensivas
// /inalcanzables márcanse con `v8 ignore` no propio src; aquí só van
// camiños reais que faltaban exercicio.
import { describe, expect, it } from 'vitest'
import { computeBounds } from '../src/engine/layouts/BoundsCalculator.js'
import type { LayoutResult } from '../src/engine/layouts/LayoutResult.js'
import { freezeNodeDef } from '../src/types/node.js'
import { deepClone } from '../src/utils/deepClone.js'
import { deepEqual } from '../src/utils/deepEqual.js'

// ── deepEqual: rama "typeof distinto" ──
describe('coverage-paydown: deepEqual', () => {
  it('deepEqual(1, "1") → false (typeof distinto)', () => {
    expect(deepEqual(1, '1' as unknown as number)).toBe(false)
  })

  it('deepEqual(true, 1) → false (typeof distinto)', () => {
    expect(deepEqual(true, 1 as unknown as boolean)).toBe(false)
  })
})

// ── deepClone: fallback manual cando structuredClone non está ──
describe('coverage-paydown: deepClone fallback', () => {
  it('usa deepCloneManual cando structuredClone non está dispoñible', () => {
    const originalSC = globalThis.structuredClone
    try {
      // biome-ignore lint/suspicious/noExplicitAny: stub global para exercer o fallback do deepCloneManual.
      ;(globalThis as any).structuredClone = undefined
      const original = { a: 1, b: { c: 2, d: [3, 4] } }
      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.b).not.toBe(original.b)
      expect(cloned.b.d).not.toBe(original.b.d)
    } finally {
      // biome-ignore lint/suspicious/noExplicitAny: restauración do stub.
      ;(globalThis as any).structuredClone = originalSC
    }
  })
})

// ── freezeNodeDef: recursión cuberta + idempotencia ──
describe('coverage-paydown: freezeNodeDef', () => {
  it('conxela un NodeDef con array (recursión)', () => {
    const frozen = freezeNodeDef({
      id: 'n1',
      type: 'small',
      label: 'N1',
      tags: ['a', 'b'],
    })
    expect(Object.isFrozen(frozen)).toBe(true)
    expect(frozen.tags).toEqual(['a', 'b'])
  })

  it('idempotente: chamar dúas veces non rompe (rama isFrozen)', () => {
    const def = freezeNodeDef({ id: 'n', type: 'small', label: 'N' })
    const def2 = freezeNodeDef(def)
    expect(def2).toBe(def)
  })
})

// ── BoundsCalculator: ramas das comparacións minY (edges) + maxX/Y (polygon) ──
describe('coverage-paydown: BoundsCalculator edge cases', () => {
  function makeLR(overrides?: Partial<LayoutResult>): LayoutResult {
    return {
      // Un nodo dummy para que o cálculo non saia polo early-return de
      // nodes.size === 0 e si chegue aos bucles de edges/mesh.
      nodes: new Map([['root', { x: 0, y: 0 }]]),
      edges: new Map(),
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      layoutType: 'test',
      ...overrides,
    }
  }

  it('edges con punto baixo (pt.y < minY): branch coberta', () => {
    const edges = new Map<string, { points: { x: number; y: number }[] }>()
    edges.set('e1', {
      points: [
        { x: 0, y: 0 },
        { x: 10, y: -50 }, // dispara branch pt.y < minY
        { x: 20, y: 40 }, // dispara branch pt.x > maxX
      ],
    })
    const lr = makeLR({ edges })
    const b = computeBounds(lr, { includesEdges: true })
    expect(b.minY).toBeLessThanOrEqual(-50)
    expect(b.maxX).toBeGreaterThanOrEqual(20)
  })

  it('polygon mesh: ramas maxX/maxY do bucle de points', () => {
    const lr = makeLR({
      mesh: [
        {
          type: 'polygon',
          points: [
            { x: -10, y: 0 }, // minX
            { x: 0, y: -10 }, // minY
            { x: 10, y: 0 }, // maxX
            { x: 0, y: 10 }, // maxY
          ],
        },
      ],
    })
    const b = computeBounds(lr, { includesMesh: true })
    // Co nodo en (0,0), o polygon expande os bounds:
    expect(b.minX).toBeLessThanOrEqual(-10)
    expect(b.minY).toBeLessThanOrEqual(-10)
    expect(b.maxX).toBeGreaterThanOrEqual(10)
    expect(b.maxY).toBeGreaterThanOrEqual(10)
  })
})
// ── FIN: tests coverage-paydown ──
