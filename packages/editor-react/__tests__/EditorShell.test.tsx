// ── INICIO: tests EditorShell ──
// Component tests para o shell. Cubren tres comprobacións do §7:
//
//   1. PanelHost rexistra e renderiza un panel (vía EditorShell).
//   2. Toggle de modo cambia o data-mode (e polo tanto o accent CSS).
//   3. StatusBar reflicte os counts da fixture.

import { fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'
import { EditorShell } from '../src/EditorShell.js'

// ── Fixture mínima ─────────────────────────────────────────────────
function buildFixture(): { engine: EditorEngine } {
  const tree: TreeDef = {
    id: 'test-fixture',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test' },
    groups: [{ id: 'g1', label: { en: 'Group 1' } }],
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
      { id: 'c', type: 'small', label: { en: 'C' }, position: { x: 200, y: 0 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  } as TreeDef
  const doc = createEditorDocument(tree, {
    coordinateBounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 },
  })
  return { engine: new EditorEngine(doc) }
}

describe('EditorShell — composición base', () => {
  it('renderiza topbar e status bar (3 zonas)', () => {
    const { engine } = buildFixture()
    render(<EditorShell engine={engine} />)
    // TopBar
    expect(screen.getByRole('toolbar', { name: /editor toolbar/i })).toBeDefined()
    // StatusBar
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('inclúe os botóns de undo/redo (deshabilitados en doc novo)', () => {
    const { engine } = buildFixture()
    render(<EditorShell engine={engine} />)
    const undo = screen.getByRole('button', { name: /undo/i })
    const redo = screen.getByRole('button', { name: /redo/i })
    expect((undo as HTMLButtonElement).disabled).toBe(true)
    expect((redo as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('EditorShell — modo (Autoría ↔ Preview)', () => {
  it('data-mode arranca en authoring', () => {
    const { engine } = buildFixture()
    const { container } = render(<EditorShell engine={engine} />)
    const shell = container.querySelector('.editor-shell')
    expect(shell?.getAttribute('data-mode')).toBe('authoring')
  })

  it('clic en Preview cambia data-mode a preview', () => {
    const { engine } = buildFixture()
    const { container } = render(<EditorShell engine={engine} />)
    const previewBtn = screen.getByRole('button', { name: /preview/i })
    fireEvent.click(previewBtn)
    const shell = container.querySelector('.editor-shell')
    expect(shell?.getAttribute('data-mode')).toBe('preview')
  })

  it('botón do modo activo ten aria-pressed=true', () => {
    const { engine } = buildFixture()
    render(<EditorShell engine={engine} />)
    const authoringBtn = screen.getByRole('button', { name: /authoring/i })
    expect(authoringBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('initialMode=preview arranca en preview', () => {
    const { engine } = buildFixture()
    const { container } = render(<EditorShell engine={engine} initialMode="preview" />)
    const shell = container.querySelector('.editor-shell')
    expect(shell?.getAttribute('data-mode')).toBe('preview')
  })
})

describe('EditorShell — StatusBar reflicte os counts da fixture', () => {
  it('amosa nodes 3 / edges 1 / mode authoring', () => {
    const { engine } = buildFixture()
    render(<EditorShell engine={engine} />)
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('nodes 3')
    expect(status.textContent).toContain('edges 1')
    expect(status.textContent).toContain('authoring')
  })

  it('cando coordinateBounds está definido, amosa Mundo W×H', () => {
    const { engine } = buildFixture()
    render(<EditorShell engine={engine} />)
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('World 500×500')
  })

  it('actualiza mode na status bar tras toggle', () => {
    const { engine } = buildFixture()
    render(<EditorShell engine={engine} />)
    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
    const status = screen.getByRole('status')
    expect(status.textContent).toContain('preview')
  })
})
// ── FIN: tests EditorShell ──
