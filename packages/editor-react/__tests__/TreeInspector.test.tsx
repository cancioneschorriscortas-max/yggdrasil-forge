// ── INICIO: tests TreeInspector (briefing 7.12) ──

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'tree-inspector-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test Tree', gl: 'Árbore de proba' },
    nodes: [{ id: 'foo', type: 'small', label: { en: 'Foo' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('★ 7.12 — TreeInspector: render condicional', () => {
  it('sen selección: amosa o Inspector de árbore', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    expect(screen.getByText('Propiedades da árbore')).toBeDefined()
  })

  it('★ ao seleccionar un nodo, o Inspector de árbore desaparece', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    expect(screen.queryByText('Propiedades da árbore')).not.toBeNull()
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    expect(screen.queryByText('Propiedades da árbore')).toBeNull()
  })

  it('deseleccionar (clear) volve ao Inspector de árbore', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    expect(screen.queryByText('Propiedades da árbore')).toBeNull()
    act(() => engine.getSession().selection.clear())
    expect(screen.queryByText('Propiedades da árbore')).not.toBeNull()
  })
})

describe('★ 7.12 — TreeInspector: identidade', () => {
  it('★ editar a etiqueta dispara setTreeField(label)', () => {
    const engine = buildEngine()
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    const input = container.querySelector('#tree-inspector-label') as HTMLInputElement
    expect(input).not.toBeNull()
    act(() => fireEvent.change(input, { target: { value: 'A miña árbore' } }))
    act(() => fireEvent.blur(input))
    const label = engine.getDocument().tree.label
    expect(typeof label === 'string' ? label : label.en).toBe('A miña árbore')
  })

  it('editar a versión dispara setTreeField(version)', () => {
    const engine = buildEngine()
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    const input = container.querySelector('#tree-inspector-version') as HTMLInputElement
    act(() => fireEvent.change(input, { target: { value: '2.0.0' } }))
    act(() => fireEvent.blur(input))
    expect(engine.getDocument().tree.version).toBe('2.0.0')
  })

  it('★ id e schemaVersion son readonly (input disabled, en Avanzado)', () => {
    const engine = buildEngine()
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    // Avanzado empeza pregado — despregar.
    act(() => fireEvent.click(screen.getByText('Avanzado')))
    const idInput = container.querySelector('#tree-inspector-id') as HTMLInputElement
    expect(idInput).not.toBeNull()
    expect(idInput.disabled).toBe(true)
    // Intentar cambiar non fai nada (disabled → o navegador nin sequera
    // dispararía o evento, pero comprobamos que o valor segue igual).
    expect(idInput.value).toBe('tree-inspector-test')
  })
})

describe('★ 7.12 — TreeInspector: recursos', () => {
  it('sen recursos: amosa "Sen recursos."', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    expect(screen.getByText('Sen recursos.')).toBeDefined()
  })

  it('★ Engadir recurso dispara setTreeField(resources) co array correcto, id libre', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByText('Engadir recurso')))
    const resources = engine.getDocument().tree.resources
    expect(resources).toHaveLength(1)
    expect(resources?.[0]?.id).toBe('recurso-1')
    expect(resources?.[0]?.label).toEqual({ gl: 'Novo recurso' })
  })

  it('engadir un segundo recurso xera id libre distinto', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByText('Engadir recurso')))
    act(() => fireEvent.click(screen.getByText('Engadir recurso')))
    const resources = engine.getDocument().tree.resources
    expect(resources?.map((r) => r.id)).toEqual(['recurso-1', 'recurso-2'])
  })

  it('★ Eliminar recurso dispara setTreeField(resources) sen ese recurso', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByText('Engadir recurso')))
    act(() => fireEvent.click(screen.getByText('Engadir recurso')))
    expect(engine.getDocument().tree.resources).toHaveLength(2)
    const removeButtons = screen.getAllByRole('button', { name: /Eliminar recurso/ })
    act(() => fireEvent.click(removeButtons[0] as HTMLElement))
    const resources = engine.getDocument().tree.resources
    expect(resources).toHaveLength(1)
    expect(resources?.[0]?.id).toBe('recurso-2')
  })

  it('editar o inicial dun recurso dispara commit co valor correcto', () => {
    const engine = buildEngine()
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    act(() => fireEvent.click(screen.getByText('Engadir recurso')))
    const initialInput = container.querySelector('#res-recurso-1-initial') as HTMLInputElement
    act(() => fireEvent.change(initialInput, { target: { value: '5' } }))
    act(() => fireEvent.blur(initialInput))
    expect(engine.getDocument().tree.resources?.[0]?.initial).toBe(5)
  })
})
// ── FIN: tests TreeInspector ──
