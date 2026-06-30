// ── INICIO: tests InspectorPanel (7.5c-i — Property Registry) ──
// O Inspector real lee o nodo seleccionado, agrupa descriptors e
// renderiza widgets que dispatchean Commands. Cada edición =
// 1 entrada de history (undo/redo funciona).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'inspector-real',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test' },
    groups: [],
    nodes: [
      {
        id: 'foo',
        type: 'small',
        label: { en: 'Foo en', gl: 'Foo gl' },
        color: '#aabbcc',
        position: { x: 0, y: 0 },
      },
      { id: 'bar', type: 'notable', label: 'Bar plain', position: { x: 50, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('InspectorPanel — modos de selección', () => {
  it('amosa hint cando non hai nada seleccionado', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    expect(screen.getByText(/Selecciona un nodo/i)).toBeDefined()
  })

  it('renderiza widgets do nodo seleccionado tras replace', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    expect(screen.getByText('foo')).toBeDefined()
    expect(screen.getByText('Identidade')).toBeDefined()
    expect(screen.getByText('Aparencia')).toBeDefined()
    expect(screen.getByText('Lóxica')).toBeDefined()
    expect(screen.getByLabelText(/Etiqueta/i)).toBeDefined()
  })

  it('multi-selección (>1): amosa conta e desactiva edición', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([
        { kind: 'node', id: 'foo' },
        { kind: 'node', id: 'bar' },
      ])
    })
    expect(screen.getByText(/2 seleccionados/i)).toBeDefined()
    expect(screen.queryByLabelText(/Etiqueta/i)).toBeNull()
  })
})

describe('InspectorPanel — edición despacha Commands', () => {
  it('editar label e perder foco → setNodeField commitea 1 entrada history', () => {
    const engine = buildEngine()
    const docBefore = engine.getDocument()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'bar' }])
    })
    const input = screen.getByLabelText(/Etiqueta/i) as HTMLInputElement
    expect(input.value).toBe('Bar plain')
    act(() => {
      fireEvent.change(input, { target: { value: 'Bar editado' } })
    })
    // Aínda non commiteado (commit on blur).
    expect(engine.getDocument()).toBe(docBefore)
    act(() => {
      fireEvent.blur(input)
    })
    const docAfter = engine.getDocument()
    expect(docAfter).not.toBe(docBefore)
    const barAfter = docAfter.tree.nodes.find((n) => n.id === 'bar')
    expect(barAfter?.label).toBe('Bar editado')
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getDocument()).toBe(docBefore)
  })

  it('editar color: commit on blur', () => {
    const engine = buildEngine()
    const docBefore = engine.getDocument()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const color = screen.getByLabelText(/Cor/i) as HTMLInputElement
    expect(color.value).toBe('#aabbcc')
    act(() => {
      fireEvent.change(color, { target: { value: '#ff0000' } })
    })
    expect(engine.getDocument()).toBe(docBefore)
    act(() => {
      fireEvent.blur(color)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.color).toBe('#ff0000')
  })

  it('editar type (enum): commit inmediato', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'bar' }])
    })
    const typeSelect = screen.getByLabelText(/Tipo/i) as HTMLSelectElement
    expect(typeSelect.value).toBe('notable')
    act(() => {
      fireEvent.change(typeSelect, { target: { value: 'keystone' } })
    })
    const barAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'bar')
    expect(barAfter?.type).toBe('keystone')
  })

  it('id é readonly: o input está desactivado', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const idInput = screen.getByLabelText(/^ID/i) as HTMLInputElement
    expect(idInput.disabled).toBe(true)
  })

  it('campos estruturados amosan resumo (non editables)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'bar' }])
    })
    expect(screen.getAllByText(/edición en 7\.5c-ii/i).length).toBeGreaterThan(0)
  })
})

describe('InspectorPanel — LocalizedText (Record vs string)', () => {
  it('foo.label é Record: edita a entrada en, conserva gl', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const labelInput = screen.getByLabelText(/Etiqueta/i) as HTMLInputElement
    expect(labelInput.value).toBe('Foo en')
    act(() => {
      fireEvent.change(labelInput, { target: { value: 'Foo en NOVO' } })
      fireEvent.blur(labelInput)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.label).toEqual({ en: 'Foo en NOVO', gl: 'Foo gl' })
  })
})
// ── FIN: tests InspectorPanel ──
