// ── INICIO: tests «Ver no código» (15.6, Cambio 3) ──
// O resto honesto do 15.4: Problemas → abrir/activar o panel Código e
// saltar á liña do nodo. O SCROLL real de CodeMirror é xeometría de
// canvas (A.6.43): verifícase no gate visual/E2E; aquí van as costuras
// que jsdom SI pode probar — o botón, o taboleiro, a activación da
// pestana e o cálculo de liña.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
} from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorShell } from '../src/EditorShell.js'
import { ProblemsPanel } from '../src/panels/ProblemsPanel.js'
import { type ShellRuntime, ShellRuntimeProvider } from '../src/shell/ShellRuntimeContext.js'

afterEach(() => cleanup())

function buildEngineWithIssue(): EditorEngine {
  const tree: TreeDef = {
    id: 'vic-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'VIC' },
    nodes: [
      { id: 'foo', type: 'small', label: { gl: 'Foo' }, position: { x: 0, y: 0 } },
      { id: 'bar', type: 'small', label: { gl: 'Bar' }, position: { x: 100, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  const engine = new EditorEngine(createEditorDocument(tree), {
    validators: createDefaultValidators(),
  })
  // Exclusión asimétrica → warning con nodeId (patrón 7.5c).
  engine.dispatch({
    type: 'setNodeField',
    mutate(draft) {
      const n = draft.tree.nodes.find((nn) => nn.id === 'foo')
      if (n !== undefined) (n as { exclusions?: string[] }).exclusions = ['bar']
    },
  })
  return engine
}

function runtimeWith(overrides: Partial<ShellRuntime>): ShellRuntime {
  return {
    probaSession: null,
    canvasView: 'graph',
    onCanvasViewChange: () => undefined,
    onNavigateToNode: () => undefined,
    registerNodeNavigator: () => undefined,
    registerViewportControls: () => undefined,
    onViewInCode: () => undefined,
    registerCodeReveal: () => undefined,
    ...overrides,
  }
}

describe('15.6 — ProblemsPanel: acción secundaria «Ver no código»', () => {
  it('★ a fila con nodeId leva o botón e o clic chama onViewInCode co id', () => {
    const engine = buildEngineWithIssue()
    const onViewInCode = vi.fn()
    render(
      <ShellRuntimeProvider value={runtimeWith({ onViewInCode })}>
        <ProblemsPanel engine={engine} />
      </ShellRuntimeProvider>,
    )
    const btn = screen.getByRole('button', { name: 'Ver no código: foo' })
    act(() => {
      fireEvent.click(btn)
    })
    expect(onViewInCode).toHaveBeenCalledExactlyOnceWith('foo')
  })
})

describe('15.6 — EditorShell: abrir/activar o panel Código', () => {
  it('★ clic en «Ver no código» activa a pestana Código (estaba detrás do Inspector)', async () => {
    const engine = buildEngineWithIssue()
    render(<EditorShell engine={engine} />)
    // A pestana Código existe pero o Inspector é a activa do grupo.
    const codeTab = (): Element | null =>
      [...document.querySelectorAll('.dv-tab')].find((t) => t.textContent === 'Código') ?? null
    expect(codeTab()).not.toBeNull()
    expect(codeTab()?.className).not.toContain('dv-active-tab')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ver no código: foo' }))
    })
    expect(codeTab()?.className).toContain('dv-active-tab')
    // E o editor de código está diante co documento (o salto de scroll
    // real verifícase no gate/E2E — A.6.43).
    expect(document.querySelector('.editor-code-editor')).not.toBeNull()
  })
})
// ── FIN: tests «Ver no código» ──
