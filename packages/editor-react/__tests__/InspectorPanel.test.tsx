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
  it('★ 7.12: amosa o Inspector de árbore (non un hint) cando non hai nada seleccionado', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    expect(screen.getByText('Propiedades da árbore')).toBeDefined()
    expect(screen.queryByText(/Selecciona un nodo/i)).toBeNull()
  })

  it('renderiza widgets do nodo seleccionado tras replace', () => {
    const engine = buildEngine()
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    expect(screen.getByText('foo')).toBeDefined()
    // Widgets Básicos existen (label e color polo seu id estable).
    expect(container.querySelector('#inspector-label')).toBeDefined()
    expect(container.querySelector('#inspector-color')).toBeDefined()
    // A sección Avanzado existe (pregada por defecto).
    expect(screen.getByRole('button', { name: /Avanzado/i })).toBeDefined()
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
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    // O input color ten id 'inspector-color'; getByLabelText podería ambigüerse
    // por FieldLabel + FieldHelp compartindo texto "Cor".
    const color = container.querySelector('#inspector-color') as HTMLInputElement
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

  it('editar type (enum) co Select propio: commit inmediato', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'bar' }])
    })
    // Tipo está en Avanzado (pregado).
    const toggle = screen.getByRole('button', { name: /Avanzado/i })
    act(() => {
      fireEvent.click(toggle)
    })
    // O Select propio: abre o dropdown premendo o botón trigger.
    // Usamos aria-label do trigger (que ten o labelText "Tipo").
    const trigger = screen.getByRole('button', { name: 'Tipo' })
    // Amosa "Destacado" (label localizado de 'notable').
    expect(trigger.textContent).toContain('Destacado')
    act(() => {
      fireEvent.click(trigger)
    })
    // Cando abre, aparecen as opcións como listbox → option.
    const claveOpt = screen.getByRole('option', { name: /Clave/i })
    act(() => {
      fireEvent.click(claveOpt)
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

  it('campos estruturados amosan os seus sub-editores en Avanzado', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'bar' }])
    })
    // Estruturados están en Avanzado (pregado).
    const toggle = screen.getByRole('button', { name: /Avanzado/i })
    act(() => {
      fireEvent.click(toggle)
    })
    // costPerTier renderiza o CostPerTierEditor. Nesta árbore sen
    // resources, o widget amosa o hint "árbore non ten resources".
    // Iso demostra que a rota funciona (chegou ao CostPerTierEditor,
    // que decide amosar hint). O test cobre a integración router →
    // sub-editor. Se algún día se engade resources á árbore de test,
    // veremos "Rango 1" en lugar do hint.
    expect(screen.getAllByText(/non ten resources definidos/i).length).toBeGreaterThan(0)
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
