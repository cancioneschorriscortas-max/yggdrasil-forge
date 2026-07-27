// ── INICIO: tests SkillTreeHandle.centerOn (7.18b) ──
// «Ir ao nodo»: o handle gaña navegación. Regra P4: transform asertado
// con magnitude exacta, nunca só "cambiou".

import { act, render, renderHook } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { type RefObject, createRef, useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { type SkillTreeHandle, SkillTree } from '../src/SkillTree.js'
import { useViewport } from '../src/hooks/useViewport.js'

const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }

function useViewportTest() {
  const ref = useRef<SVGSVGElement>(null) as RefObject<SVGSVGElement | null>
  return useViewport(ref, bounds, 16, { fitOnMount: false })
}

describe('useViewport.centerOn (7.18b)', () => {
  it('centra o punto co zoom actual: pan exacto', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.centerOn(80, 80)
    })
    // centro (50,50) − 1·(80,80) = (−30,−30).
    expect(result.current.state).toEqual({ panX: -30, panY: -30, zoom: 1 })
  })

  it('conserva o zoom manual previo (sen opts.zoom)', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.zoomBy(2)
    })
    act(() => {
      result.current.centerOn(80, 80)
    })
    // pan = 50 − 2·80 = −110, zoom intacto.
    expect(result.current.state.panX).toBeCloseTo(-110, 10)
    expect(result.current.state.panY).toBeCloseTo(-110, 10)
    expect(result.current.state.zoom).toBe(2)
  })

  it('con zoom explícito fixa o zoom (clampado)', () => {
    const { result } = renderHook(() => useViewportTest())
    act(() => {
      result.current.centerOn(50, 50, 3)
    })
    expect(result.current.state).toEqual({ panX: -100, panY: -100, zoom: 3 })
  })
})

// ─── SkillTreeHandle ───

function makeTree(): TreeDef {
  return {
    id: 'center-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Center',
    nodes: [
      { id: 'a', type: 'small', label: 'A', position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: 'B', position: { x: 100, y: 100 } },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  }
}

/** Le o transform do `<g>` interactivo do viewport. */
function viewportTransform(container: HTMLElement): string | null {
  return container.querySelector('svg > g')?.getAttribute('transform') ?? null
}

describe('SkillTreeHandle.centerOn (7.18b)', () => {
  it('★ centerOn(nodeId) move o transform ao esperado — magnitude exacta', () => {
    const ref = createRef<SkillTreeHandle>()
    const engine = new TreeEngine(makeTree())
    const { container } = render(<SkillTree engine={engine} ref={ref} fitOnMount={false} />)
    // Bounds do layout custom: (0,0)-(100,100) → centro (50,50).
    // centerOn('b'=(100,100)) a zoom 1 → pan (−50,−50).
    act(() => {
      ref.current?.centerOn('b')
    })
    expect(viewportTransform(container)).toBe('translate(-50 -50) scale(1)')
  })

  it('opts.zoom fixa o zoom: transform completo exacto', () => {
    const ref = createRef<SkillTreeHandle>()
    const engine = new TreeEngine(makeTree())
    const { container } = render(<SkillTree engine={engine} ref={ref} fitOnMount={false} />)
    // pan = 50 − 2·100 = −150.
    act(() => {
      ref.current?.centerOn('b', { zoom: 2 })
    })
    expect(viewportTransform(container)).toBe('translate(-150 -150) scale(2)')
  })

  it('nodeId inexistente → no-op silencioso documentado (o handle non lanza)', () => {
    const ref = createRef<SkillTreeHandle>()
    const engine = new TreeEngine(makeTree())
    const { container } = render(<SkillTree engine={engine} ref={ref} fitOnMount={false} />)
    const before = viewportTransform(container)
    expect(() => {
      act(() => {
        ref.current?.centerOn('non-existe')
      })
    }).not.toThrow()
    expect(viewportTransform(container)).toBe(before)
  })

  it('fit() segue intacto no handle tras centerOn', () => {
    const ref = createRef<SkillTreeHandle>()
    const engine = new TreeEngine(makeTree())
    render(<SkillTree engine={engine} ref={ref} fitOnMount={false} />)
    act(() => {
      ref.current?.centerOn('b')
    })
    expect(() => {
      act(() => {
        ref.current?.fit()
      })
    }).not.toThrow()
    expect(typeof ref.current?.getZoom()).toBe('number')
  })
})
// ── FIN: tests SkillTreeHandle.centerOn ──
