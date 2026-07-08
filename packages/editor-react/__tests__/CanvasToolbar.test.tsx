// ── INICIO: tests toolbar (briefing 7.11) ──
// Toolbar (render/tool/atallos/Proba) e Supr proban o compoñente
// completo con RTL — non precisan CTM.
//
// **O que NON está aquí, e por que (A.6.40)**: clic-en-canvas para
// Engadir nodo/Conectar precisan `screenToDoc` (CTM real) para
// resolver coordenadas. Tentei shimear `getScreenCTM`/`createSVGPoint`
// para simular clics completos — atopei que **jsdom nin sequera ten
// `PointerEvent` como construtor global** (`ReferenceError: PointerEvent
// is not defined`), e `fireEvent.pointerDown` de testing-library non
// propaga `clientX`/`clientY` ao evento sintético baixo jsdom. Mesma
// limitación xa documentada en `EditorCanvas.dragFlow.test.ts` para o
// drag. A lóxica de creación/conexión xa está exhaustivamente probada
// en `editor-core/__tests__/composites.test.ts` (27 tests, sen DOM);
// aquí só cubrimos o que é xenuinamente React (render condicional,
// cambio de tool, atallos). O clic real queda para o gate visual do
// dono.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'toolbar-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Toolbar test' },
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('★ 7.11 — CanvasToolbar: render, cambio de tool, Proba', () => {
  it('renderiza as tres tools, Seleccionar activa por defecto', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    const toolbar = screen.getByRole('toolbar', { name: 'Ferramentas do canvas' })
    expect(toolbar).not.toBeNull()
    const radios = screen.getAllByRole('button')
    expect(radios).toHaveLength(3)
    const select = radios.find((r) => r.getAttribute('title')?.startsWith('Seleccionar'))
    expect(select?.getAttribute('aria-pressed')).toBe('true')
  })

  it('clic en "Engadir nodo" activa esa tool', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    const addBtn = screen
      .getAllByRole('button')
      .find((r) => r.getAttribute('title')?.startsWith('Engadir nodo'))
    expect(addBtn).toBeDefined()
    act(() => fireEvent.click(addBtn as HTMLElement))
    expect(addBtn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('chip "Crear requisito" só aparece coa tool Conectar activa, marcado por defecto', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    expect(screen.queryByText('Crear requisito')).toBeNull()
    const connectBtn = screen
      .getAllByRole('button')
      .find((r) => r.getAttribute('title')?.startsWith('Conectar'))
    act(() => fireEvent.click(connectBtn as HTMLElement))
    const checkbox = screen.getByRole('checkbox', { name: 'Crear requisito' })
    expect(checkbox).not.toBeNull()
    expect((checkbox as HTMLInputElement).checked).toBe(true)
  })

  it('★ atallos de teclado (N/C/V) cambian a tool', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    act(() => fireEvent.keyDown(window, { key: 'n' }))
    expect(
      screen
        .getAllByRole('button')
        .find((r) => r.getAttribute('title')?.startsWith('Engadir nodo'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')

    act(() => fireEvent.keyDown(window, { key: 'c' }))
    expect(
      screen
        .getAllByRole('button')
        .find((r) => r.getAttribute('title')?.startsWith('Conectar'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')

    act(() => fireEvent.keyDown(window, { key: 'v' }))
    expect(
      screen
        .getAllByRole('button')
        .find((r) => r.getAttribute('title')?.startsWith('Seleccionar'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('atallos de teclado NON se interceptan mentres se escribe nun input', () => {
    render(
      <div>
        <input type="text" aria-label="campo de proba" />
        <EditorCanvas editorEngine={buildEngine()} />
      </div>,
    )
    const input = screen.getByLabelText('campo de proba')
    act(() => fireEvent.keyDown(input, { key: 'n' }))
    // Segue en Seleccionar — "n" non troca a tool porque o foco está nun input.
    expect(
      screen
        .getAllByRole('button')
        .find((r) => r.getAttribute('title')?.startsWith('Seleccionar'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('★ Esc volve sempre a Seleccionar', () => {
    render(<EditorCanvas editorEngine={buildEngine()} />)
    act(() => fireEvent.keyDown(window, { key: 'c' }))
    act(() => fireEvent.keyDown(window, { key: 'Escape' }))
    expect(
      screen
        .getAllByRole('button')
        .find((r) => r.getAttribute('title')?.startsWith('Seleccionar'))
        ?.getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('★ en modo Proba non renderiza a toolbar', () => {
    // probaSession=null é "sen proba"; para simular EN proba precisamos
    // un obxecto non-null. Un mock mínimo abonda (EditorCanvas só
    // comproba !== null para decidir inProba).
    const fakeProbaSession = {} as unknown as Parameters<typeof EditorCanvas>[0]['probaSession']
    render(<EditorCanvas editorEngine={buildEngine()} probaSession={fakeProbaSession} />)
    expect(screen.queryByRole('toolbar', { name: 'Ferramentas do canvas' })).toBeNull()
  })
})

describe('★ 7.11 — Supr/Delete (non precisa CTM: opera sobre a selección xa existente)', () => {
  it('★ Supr con nodo seleccionado dispara a cascada de borrado', () => {
    const engine = buildEngine()
    render(<EditorCanvas editorEngine={engine} />)
    engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
    act(() => fireEvent.keyDown(window, { key: 'Delete' }))
    expect(engine.getDocument().tree.nodes.map((n) => n.id)).toEqual(['b'])
    expect(engine.canUndo()).toBe(true)
  })

  it('Supr sen selección: non fai nada (sen transacción nova)', () => {
    const engine = buildEngine()
    render(<EditorCanvas editorEngine={engine} />)
    act(() => fireEvent.keyDown(window, { key: 'Delete' }))
    expect(engine.canUndo()).toBe(false)
  })

  it('Supr con tool distinta de Seleccionar: non fai nada', () => {
    const engine = buildEngine()
    render(<EditorCanvas editorEngine={engine} />)
    engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
    act(() => fireEvent.keyDown(window, { key: 'n' })) // trocar a Engadir nodo
    act(() => fireEvent.keyDown(window, { key: 'Delete' }))
    expect(engine.canUndo()).toBe(false)
    expect(engine.getDocument().tree.nodes).toHaveLength(2)
  })
})
// ── FIN: tests toolbar ──
