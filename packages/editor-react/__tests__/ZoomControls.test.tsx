// ── INICIO: tests zoom da TopBar (auto-1) ──
// Pecha o «TODO» histórico dos botóns −/+ da TopBar. Regra P4: o zoom
// asertado con magnitude exacta (factor 1.2 do handle), nunca só
// "cambiou".

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorShell } from '../src/EditorShell.js'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import type { ViewportControls } from '../src/shell/ShellRuntimeContext.js'
import { TopBar } from '../src/shell/TopBar.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'zoom-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Zoom' },
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { gl: 'B' }, position: { x: 100, y: 100 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

function viewportScale(container: HTMLElement): string | null {
  return container.querySelector('svg > g')?.getAttribute('transform') ?? null
}

describe('TopBar — botóns de zoom', () => {
  const base = {
    mode: 'authoring' as const,
    onToggleMode: () => undefined,
    panels: [],
    visiblePanelIds: [],
    onTogglePanel: () => undefined,
    onResetLayout: () => undefined,
  }

  it('sen handlers: os botóns existen pero desactivados (comportamento de antes)', () => {
    render(<TopBar engine={buildEngine()} {...base} />)
    expect(screen.getByRole('button', { name: 'Achegar' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Afastar' })).toHaveProperty('disabled', true)
  })

  it('con handlers: clic chama onZoomIn / onZoomOut', () => {
    const onZoomIn = vi.fn()
    const onZoomOut = vi.fn()
    render(<TopBar engine={buildEngine()} {...base} onZoomIn={onZoomIn} onZoomOut={onZoomOut} />)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Achegar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Afastar' }))
    })
    expect(onZoomIn).toHaveBeenCalledOnce()
    expect(onZoomOut).toHaveBeenCalledOnce()
  })

  it('zoomDisabled (tarxetas) desactiva aínda con handlers', () => {
    render(
      <TopBar
        engine={buildEngine()}
        {...base}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        zoomDisabled
      />,
    )
    expect(screen.getByRole('button', { name: 'Achegar' })).toHaveProperty('disabled', true)
  })
})

describe('EditorCanvas — rexistro dos controis de viewport', () => {
  it('★ en grafo: zoomIn escala o transform EXACTAMENTE ×1.2 (regra P4)', () => {
    const engine = buildEngine()
    let controls: ViewportControls | null = null
    const { container } = render(
      <EditorCanvas
        editorEngine={engine}
        registerViewportControls={(c) => {
          controls = c
        }}
      />,
    )
    expect(controls).not.toBeNull()
    act(() => {
      controls?.zoomIn()
    })
    expect(viewportScale(container)).toBe('translate(0 0) scale(1.2)')
    act(() => {
      controls?.zoomOut()
    })
    // 1.2 / 1.2 = 1 (con tolerancia de coma flotante no serializado).
    expect(viewportScale(container)).toMatch(/^translate\(0 0\) scale\((1|0\.9999+|1\.0000+\d*)\)$/)
  })

  it('en tarxetas: sen SkillTree, zoomIn é no-op sen erro', () => {
    let controls: ViewportControls | null = null
    render(
      <EditorCanvas
        editorEngine={buildEngine()}
        view="cards"
        registerViewportControls={(c) => {
          controls = c
        }}
      />,
    )
    expect(() => {
      act(() => {
        controls?.zoomIn()
      })
    }).not.toThrow()
  })

  it('ao desmontar dá de baixa os controis (null)', () => {
    const register = vi.fn()
    const { unmount } = render(
      <EditorCanvas editorEngine={buildEngine()} registerViewportControls={register} />,
    )
    unmount()
    expect(register).toHaveBeenLastCalledWith(null)
  })
})

describe('EditorShell — zoom cableado de punta a punta', () => {
  it('os botóns da TopBar están ACTIVOS en grafo (xa non hai TODO)', () => {
    render(<EditorShell engine={buildEngine()} />)
    expect(screen.getByRole('button', { name: 'Achegar' })).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: 'Afastar' })).toHaveProperty('disabled', false)
  })
})
// ── FIN: tests zoom da TopBar ──
