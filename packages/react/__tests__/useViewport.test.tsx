// ── INICIO: tests useViewport hook (F10.6) ──
import { act, renderHook } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useViewport } from '../src/hooks/useViewport.js'

const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }

/**
 * Helper que crea un ref nulo (sen `<svg>` real) e instancia o hook.
 * En jsdom non hai `<svg>` real montado; o hook devolve as accións
 * pero `fit()` non efectúa cambios porque `svg.current === null`.
 * As accións de `zoom` SI mutan o estado (non dependen do DOM real).
 */
function useViewportTest() {
  const ref = useRef<SVGSVGElement>(null) as RefObject<SVGSVGElement | null>
  return useViewport(ref, bounds, 16, { fitOnMount: false })
}

describe('useViewport — estado inicial (F10.6)', () => {
  it('arranca con transform identidade', () => {
    const { result } = renderHook(() => useViewportTest())
    expect(result.current.state).toEqual({ panX: 0, panY: 0, zoom: 1 })
    expect(result.current.transform).toBe('translate(0 0) scale(1)')
    expect(result.current.isPanning).toBe(false)
  })

  it('expón as accións esperadas', () => {
    const { result } = renderHook(() => useViewportTest())
    expect(typeof result.current.fit).toBe('function')
    expect(typeof result.current.reset).toBe('function')
    expect(typeof result.current.zoomIn).toBe('function')
    expect(typeof result.current.zoomOut).toBe('function')
    expect(typeof result.current.zoomBy).toBe('function')
    expect(typeof result.current.getZoom).toBe('function')
    expect(typeof result.current.onPointerDown).toBe('function')
    expect(typeof result.current.onPointerMove).toBe('function')
    expect(typeof result.current.onPointerUp).toBe('function')
  })

  it('getZoom devolve 1 inicialmente', () => {
    const { result } = renderHook(() => useViewportTest())
    expect(result.current.getZoom()).toBe(1)
  })
})

describe('useViewport — zoom actions (F10.6)', () => {
  it('zoomIn aumenta o zoom por 1.2', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.zoomIn()
    })
    expect(result.current.state.zoom).toBeCloseTo(1.2, 5)
  })

  it('zoomOut divide o zoom por 1.2', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.zoomOut()
    })
    expect(result.current.state.zoom).toBeCloseTo(1 / 1.2, 5)
  })

  it('zoomIn repetido clampa ao máximo 4', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomIn()
    })
    expect(result.current.state.zoom).toBeLessThanOrEqual(4)
    expect(result.current.state.zoom).toBeGreaterThanOrEqual(2)
  })

  it('zoomOut repetido clampa ao mínimo 0.25', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      for (let i = 0; i < 20; i++) result.current.zoomOut()
    })
    expect(result.current.state.zoom).toBeGreaterThanOrEqual(0.25)
  })

  it('zoomBy aplica un factor arbitrario', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.zoomBy(2)
    })
    expect(result.current.state.zoom).toBe(2)
  })
})

describe('useViewport — reset (F10.6)', () => {
  it('reset volve a identidade despois de zoom', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.zoomBy(3)
    })
    expect(result.current.state.zoom).toBe(3)
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toEqual({ panX: 0, panY: 0, zoom: 1 })
  })
})

describe('useViewport — getZoom segue o estado (F10.6)', () => {
  it('getZoom reflicte cambios despois de zoom', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.zoomBy(2)
    })
    expect(result.current.getZoom()).toBe(2)
  })
})

describe('★ useViewport — fit on mount dispara UNHA soa vez (fix reportado por un consumidor)', () => {
  // O bug: deps [bounds, fitOnMount] facían que o efecto (e por tanto
  // fitRef.current(), agendado vía requestAnimationFrame) se
  // re-disparase cada vez que `bounds` cambiaba de referencia — non
  // só ao montar. Espiamos requestAnimationFrame como proxy: se o
  // fit se agenda máis dunha vez tras varios cambios de bounds, o
  // bug volveu.

  function useViewportMountTest(bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }) {
    const ref = useRef<SVGSVGElement>(null) as RefObject<SVGSVGElement | null>
    return useViewport(ref, bounds, 16, { fitOnMount: true })
  }

  it('★ cambiar bounds despois de montar NON volve agendar fit()', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame')
    const boundsA = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const { rerender } = renderHook(({ b }) => useViewportMountTest(b), {
      initialProps: { b: boundsA },
    })
    const callsAfterMount = rafSpy.mock.calls.length
    expect(callsAfterMount).toBeGreaterThanOrEqual(1) // fit agendado UNHA vez ao montar

    // Simula bounds novos (referencia E valores distintos, coma
    // layoutBounds recalculado tras engadir un nodo).
    const boundsB = { minX: 0, minY: 0, maxX: 250, maxY: 180 }
    rerender({ b: boundsB })
    const boundsC = { minX: 0, minY: 0, maxX: 400, maxY: 300 }
    rerender({ b: boundsC })

    // Cero chamadas NOVAS a requestAnimationFrame tras o mount.
    expect(rafSpy.mock.calls.length).toBe(callsAfterMount)
    rafSpy.mockRestore()
  })

  it('bounds dexenerados (árbore baleira) ao montar: NON agenda fit', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame')
    const degenerate = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    renderHook(() => useViewportMountTest(degenerate))
    expect(rafSpy.mock.calls.length).toBe(0)
    rafSpy.mockRestore()
  })

  it('bounds dexenerados ao montar → state queda en identidade (sen zoom extremo)', () => {
    const degenerate = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    const { result } = renderHook(() => useViewportMountTest(degenerate))
    expect(result.current.state).toEqual({ panX: 0, panY: 0, zoom: 1 })
  })

  it('fit() manual (baixo demanda) segue funcionando despois do fix', () => {
    const { result } = renderHook(() =>
      useViewportMountTest({ minX: 0, minY: 0, maxX: 100, maxY: 100 }),
    )
    expect(typeof result.current.fit).toBe('function')
    // svg.current é null en jsdom (sen <svg> real montado) — fit() é
    // no-op defensivo, pero o contrato (función callable, sen throw)
    // segue intacto.
    act(() => {
      result.current.fit()
    })
  })
})
// ── FIN: tests useViewport hook ──
