// ── INICIO: tests useViewport helpers (F10.6) ──
import { describe, expect, it } from 'vitest'
import { clampPan, clampZoom, fitTransform, zoomToward } from '../src/hooks/useViewport.js'

describe('clampZoom (F10.6)', () => {
  it('devolve o valor cando está dentro do rango', () => {
    expect(clampZoom(1, 0.25, 4)).toBe(1)
    expect(clampZoom(2.5, 0.25, 4)).toBe(2.5)
  })

  it('límite inferior', () => {
    expect(clampZoom(0.1, 0.25, 4)).toBe(0.25)
    expect(clampZoom(-1, 0.25, 4)).toBe(0.25)
  })

  it('límite superior', () => {
    expect(clampZoom(10, 0.25, 4)).toBe(4)
  })

  it('rangos arbitrarios', () => {
    expect(clampZoom(5, 1, 10)).toBe(5)
    expect(clampZoom(0, 1, 10)).toBe(1)
    expect(clampZoom(20, 1, 10)).toBe(10)
  })
})

describe('fitTransform (F10.6)', () => {
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }

  it('devolve identidade para bounds e viewport razoables', () => {
    const result = fitTransform(bounds, 16, 500, 500)
    expect(result.panX).toBe(0)
    expect(result.panY).toBe(0)
    expect(result.zoom).toBe(1)
  })

  it('devolve identidade se viewport é 0', () => {
    const result = fitTransform(bounds, 16, 0, 0)
    expect(result.panX).toBe(0)
    expect(result.panY).toBe(0)
    expect(result.zoom).toBe(1)
  })

  it('devolve identidade se bounds é degenerado', () => {
    const degen = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    const result = fitTransform(degen, 0, 500, 500)
    expect(result.zoom).toBe(1)
  })

  it('clampa o zoom se maxZoom é < 1', () => {
    const result = fitTransform(bounds, 16, 500, 500, 0.25, 0.5)
    expect(result.zoom).toBe(0.5)
  })

  it('clampa o zoom se minZoom é > 1', () => {
    const result = fitTransform(bounds, 16, 500, 500, 1.5, 4)
    expect(result.zoom).toBe(1.5)
  })
})

describe('zoomToward — punto do cursor fixo (F10.6)', () => {
  it('aplica o factor cando está dentro dos límites', () => {
    const state = { panX: 0, panY: 0, zoom: 1 }
    const next = zoomToward(state, 2, 50, 50, 0.25, 4)
    expect(next.zoom).toBe(2)
  })

  it('o punto baixo o cursor mantense fixo despois do zoom', () => {
    const state = { panX: 0, panY: 0, zoom: 1 }
    const cursorX = 60
    const cursorY = 80
    const next = zoomToward(state, 2, cursorX, cursorY, 0.25, 4)
    // O punto (60, 80) en coords usuario, antes do zoom, mapea a
    // local (60, 80). Despois do zoom 2, debe seguir caendo en
    // (60, 80) en coords usuario:
    //   newCursorUserX = newPanX + newZoom * localX
    //                  = newPanX + 2 * 60
    //   60 = newPanX + 120  =>  newPanX = -60
    expect(next.panX).toBeCloseTo(-60, 10)
    expect(next.panY).toBeCloseTo(-80, 10)
    expect(next.zoom).toBe(2)
  })

  it('non muda o estado se o zoom queda clampado igual', () => {
    const state = { panX: 10, panY: 20, zoom: 4 }
    const next = zoomToward(state, 2, 50, 50, 0.25, 4)
    expect(next).toBe(state) // referencial equality
  })

  it('clampa ao zoom mínimo', () => {
    const state = { panX: 0, panY: 0, zoom: 0.5 }
    const next = zoomToward(state, 0.1, 50, 50, 0.25, 4)
    expect(next.zoom).toBe(0.25)
  })

  it('clampa ao zoom máximo', () => {
    const state = { panX: 0, panY: 0, zoom: 3 }
    const next = zoomToward(state, 10, 50, 50, 0.25, 4)
    expect(next.zoom).toBe(4)
  })

  it('zoom-then-zoom-back co mesmo cursor restaura aproximadamente o estado', () => {
    const initial = { panX: 0, panY: 0, zoom: 1 }
    const cursorX = 100
    const cursorY = 80
    const zoomed = zoomToward(initial, 2, cursorX, cursorY, 0.25, 4)
    const back = zoomToward(zoomed, 0.5, cursorX, cursorY, 0.25, 4)
    expect(back.zoom).toBeCloseTo(1, 10)
    expect(back.panX).toBeCloseTo(0, 10)
    expect(back.panY).toBeCloseTo(0, 10)
  })
})

describe('clampPan (F10.6)', () => {
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }

  it('non muda o pan se está dentro dos límites', () => {
    const state = { panX: 10, panY: 20, zoom: 1 }
    const next = clampPan(state, bounds, 500, 500)
    expect(next).toBe(state) // referencial equality
  })

  it('limita o pan extremo positivo', () => {
    const state = { panX: 100000, panY: 0, zoom: 1 }
    const next = clampPan(state, bounds, 500, 500, 0.5)
    expect(next.panX).toBeLessThan(100000)
  })

  it('limita o pan extremo negativo', () => {
    const state = { panX: -100000, panY: 0, zoom: 1 }
    const next = clampPan(state, bounds, 500, 500, 0.5)
    expect(next.panX).toBeGreaterThan(-100000)
  })

  it('o zoom intensifica a marxe de pan permitida', () => {
    const stateZoom1 = { panX: 5000, panY: 0, zoom: 1 }
    const stateZoom4 = { panX: 5000, panY: 0, zoom: 4 }
    const next1 = clampPan(stateZoom1, bounds, 500, 500, 0.5)
    const next4 = clampPan(stateZoom4, bounds, 500, 500, 0.5)
    // Con zoom 4, o bounds escalado é 4× máis grande, polo que a
    // marxe permitida tamén é maior; o pan de 5000 é máis tolerable.
    expect(next4.panX).toBeGreaterThanOrEqual(next1.panX)
  })
})
// ── FIN: tests useViewport helpers ──
