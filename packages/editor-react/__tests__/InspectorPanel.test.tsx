// ── INICIO: tests InspectorPanel ──
// Inspector placeholder (7.5b-i): proba que a selección viaxa
// engine↔UI mostrando o id do nodo seleccionado. O inspector real
// (Property Registry) é 7.5c.

import { act, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/panels/PlaceholderPanels.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'inspector-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test' },
    groups: [],
    nodes: [
      { id: 'foo', type: 'small', label: { en: 'Foo' }, position: { x: 0, y: 0 } },
      { id: 'bar', type: 'small', label: { en: 'Bar' }, position: { x: 50, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('InspectorPanel', () => {
  it('amosa "no selection" cando non hai nada seleccionado', () => {
    const engine = buildEngine()
    render(<InspectorPanel engine={engine} />)
    expect(screen.getByText(/no selection/i)).toBeDefined()
  })

  it('amosa o id do nodo seleccionado tras SelectionEngine.replace', () => {
    const engine = buildEngine()
    render(<InspectorPanel engine={engine} />)
    expect(screen.queryByText(/no selection/i)).not.toBeNull()
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    expect(screen.queryByText(/no selection/i)).toBeNull()
    expect(screen.getByText('foo')).toBeDefined()
  })

  it('actualízase cando a selección cambia (foo → bar)', () => {
    const engine = buildEngine()
    render(<InspectorPanel engine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    expect(screen.queryByText('foo')).not.toBeNull()
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'bar' }])
    })
    expect(screen.queryByText('foo')).toBeNull()
    expect(screen.queryByText('bar')).not.toBeNull()
  })
})
// ── FIN: tests InspectorPanel ──
