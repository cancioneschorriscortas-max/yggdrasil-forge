// ── INICIO: tests «Ir ao nodo» (7.18b) ──
// Petición literal do dono: «Gustaríame poder clickar nos nodos da
// estructura e ir directamente a ese nodo». Cobre:
//   - Estrutura: clic → selecciona + navega.
//   - Problemas: clic → selecciona + navega (lazo de regalo).
//   - EditorCanvas: rexistra o navegador; en grafo centra o SkillTree
//     co transform EXACTO (regra P4); en tarxetas é no-op sen erro.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
} from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import { OutlinerPanel } from '../src/panels/OutlinerPanel.js'
import { ProblemsPanel } from '../src/panels/ProblemsPanel.js'
import { type ShellRuntime, ShellRuntimeProvider } from '../src/shell/ShellRuntimeContext.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'nav-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Nav test' },
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { gl: 'B' }, position: { x: 100, y: 0 } },
      { id: 'c', type: 'small', label: { gl: 'C' }, position: { x: 0, y: 100 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree), {
    validators: createDefaultValidators(),
  })
}

function runtimeWith(overrides: Partial<ShellRuntime>): ShellRuntime {
  return {
    probaSession: null,
    canvasView: 'graph',
    onCanvasViewChange: () => undefined,
    onNavigateToNode: () => undefined,
    registerNodeNavigator: () => undefined,
    registerViewportControls: () => undefined,
    ...overrides,
  }
}

describe('7.18b — Estrutura navegable', () => {
  it('★ clic nun nodo: selection.replace + onNavigateToNode co id', () => {
    const engine = buildEngine()
    const navigate = vi.fn()
    render(
      <ShellRuntimeProvider value={runtimeWith({ onNavigateToNode: navigate })}>
        <OutlinerPanel engine={engine} />
      </ShellRuntimeProvider>,
    )
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'b' }))
    })
    expect(engine.getSession().selection.current()).toEqual([{ kind: 'node', id: 'b' }])
    expect(navigate).toHaveBeenCalledExactlyOnceWith('b')
  })
})

describe('7.18b — Problemas navegable (lazo de regalo)', () => {
  it('★ clic nun aviso con nodeId: selecciona E navega', () => {
    const engine = buildEngine()
    // Exclusión asimétrica → warning con nodeId (patrón do loop 7.5c).
    engine.dispatch({
      type: 'setNodeField',
      mutate(draft) {
        const n = draft.tree.nodes.find((nn) => nn.id === 'a')
        if (n !== undefined) (n as { exclusions?: string[] }).exclusions = ['b']
      },
    })
    const issues = engine.getIssues()
    const withNode = issues.find((i) => i.nodeId !== undefined)
    expect(withNode).toBeDefined()
    if (withNode === undefined) return

    const navigate = vi.fn()
    render(
      <ShellRuntimeProvider value={runtimeWith({ onNavigateToNode: navigate })}>
        <ProblemsPanel engine={engine} />
      </ShellRuntimeProvider>,
    )
    const row = screen.getByRole('button', {
      name: new RegExp(`en ${withNode.nodeId ?? ''}`),
    })
    act(() => {
      fireEvent.click(row)
    })
    expect(engine.getSession().selection.current()).toEqual([{ kind: 'node', id: withNode.nodeId }])
    expect(navigate).toHaveBeenCalledExactlyOnceWith(withNode.nodeId)
  })
})

describe('7.18b — EditorCanvas: navegador rexistrado', () => {
  it('★ en grafo: navegar centra o SkillTree co transform EXACTO (regra P4)', () => {
    const engine = buildEngine()
    let navigator: ((nodeId: string) => void) | null = null
    const { container } = render(
      <EditorCanvas
        editorEngine={engine}
        registerNodeNavigator={(fn) => {
          navigator = fn
        }}
      />,
    )
    expect(navigator).not.toBeNull()
    // Bounds derivados dos nodos: (0,0)-(100,100) → centro (50,50).
    // centerOn('b'=(100,0)) a zoom 1 → pan = (50−100, 50−0) = (−50, 50).
    act(() => {
      navigator?.('b')
    })
    const g = container.querySelector('svg > g')
    expect(g?.getAttribute('transform')).toBe('translate(-50 50) scale(1)')
  })

  it('en tarxetas: sen SkillTree montado, navegar é no-op sen erro', () => {
    const engine = buildEngine()
    let navigator: ((nodeId: string) => void) | null = null
    const { container } = render(
      <EditorCanvas
        editorEngine={engine}
        view="cards"
        registerNodeNavigator={(fn) => {
          navigator = fn
        }}
      />,
    )
    expect(container.querySelector('svg.yf-skill-tree')).toBeNull()
    expect(() => {
      act(() => {
        navigator?.('b')
      })
    }).not.toThrow()
  })

  it('ao desmontar, o canvas dá de baixa o navegador (null)', () => {
    const engine = buildEngine()
    const register = vi.fn()
    const { unmount } = render(
      <EditorCanvas editorEngine={engine} registerNodeNavigator={register} />,
    )
    unmount()
    expect(register).toHaveBeenLastCalledWith(null)
  })
})
// ── FIN: tests «Ir ao nodo» ──
