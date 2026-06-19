// ── INICIO: tests useViewport hook (F10.6) ──
import { act, renderHook } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { describe, expect, it } from 'vitest'
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
// ── FIN: tests useViewport hook ──
