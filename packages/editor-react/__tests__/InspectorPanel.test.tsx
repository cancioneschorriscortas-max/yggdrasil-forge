// ── INICIO: tests InspectorPanel (7.5c-i — Property Registry) ──
// O Inspector real lee o nodo seleccionado, agrupa descriptors e
// renderiza widgets que dispatchean Commands. Cada edición =
// 1 entrada de history (undo/redo funciona).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument, setNodeField } from '@yggdrasil-forge/editor-core'
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
  it('★ foo.label é Record: edita a entrada gl (o que ve o canvas), conserva en', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const labelInput = screen.getByLabelText(/Etiqueta/i) as HTMLInputElement
    expect(labelInput.value).toBe('Foo gl')
    act(() => {
      fireEvent.change(labelInput, { target: { value: 'Foo gl NOVO' } })
      fireEvent.blur(labelInput)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.label).toEqual({ en: 'Foo en', gl: 'Foo gl NOVO' })
  })
})

describe('★ regresión: nodo novo (buildNewNode) — editar a etiqueta reflíctese no que ve o canvas', () => {
  it('label con gl+en (como nace un nodo novo): editar actualiza gl, non en', () => {
    // Mesmo shape que buildNewNode (7.11): { gl: 'Novo nodo', en: 'New node' }.
    // O canvas (SkillTree via computeLayout) usa locale 'gl' por defecto
    // cando o consumidor non especifica ningunha (EditorCanvas non o
    // fai) — así que 'gl' é a clave que realmente se ve.
    const tree: TreeDef = {
      id: 'regresion-locale',
      schemaVersion: '1.0.0',
      version: '0.1.0',
      label: { en: 'T' },
      nodes: [
        {
          id: 'nodo-1',
          type: 'small',
          label: { gl: 'Novo nodo', en: 'New node' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
      layout: { type: 'custom' },
    } as TreeDef
    const engine = new EditorEngine(createEditorDocument(tree))
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'nodo-1' }]))

    const labelInput = screen.getByLabelText(/Etiqueta/i) as HTMLInputElement
    // Se isto amosase "New node", estaríamos editando a clave errada outra vez.
    expect(labelInput.value).toBe('Novo nodo')

    act(() => {
      fireEvent.change(labelInput, { target: { value: 'caca' } })
      fireEvent.blur(labelInput)
    })

    const node = engine.getDocument().tree.nodes.find((n) => n.id === 'nodo-1')
    // A clave que realmente renderiza o canvas por defecto (gl) ten
    // que levar o valor novo. Se isto fallase con 'gl' aínda en
    // 'Novo nodo', o bug reportado polo dono volveu.
    expect(node?.label).toEqual({ gl: 'caca', en: 'New node' })
  })
})

describe('★ 7.13 — Inspector de nodo: sección Rexións', () => {
  function buildEngineWithRegions(): EditorEngine {
    const tree: TreeDef = {
      id: 'regions-node-test',
      schemaVersion: '1.0.0',
      version: '0.1.0',
      label: { en: 'T' },
      nodes: [{ id: 'foo', type: 'small', label: { en: 'Foo' }, position: { x: 0, y: 0 } }],
      edges: [],
      layout: { type: 'custom' },
    } as TreeDef
    return new EditorEngine(
      createEditorDocument(tree, {
        theme: {
          regions: [
            { id: 'rexion-1', label: 'Guerreiro', tag: 'guerreiro', color: '#c8875f' },
            { id: 'rexion-2', label: 'Sur', tag: 'sur', color: '#5f9ec8' },
          ],
        },
      }),
    )
  }

  it('sen rexións definidas: mensaxe cruzada á pestana Tema', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    expect(screen.getByText('Sen rexións. Créaas na pestana Tema.')).toBeDefined()
  })

  it('con rexións definidas: unha checkbox por rexión, sen marcar por defecto', () => {
    const engine = buildEngineWithRegions()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    const guerreiro = screen.getByLabelText('Guerreiro') as HTMLInputElement
    const sur = screen.getByLabelText('Sur') as HTMLInputElement
    expect(guerreiro.checked).toBe(false)
    expect(sur.checked).toBe(false)
  })

  it('★ marcar unha checkbox dispatchea setNodeField(tags) co tag correcto', () => {
    const engine = buildEngineWithRegions()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    const guerreiro = screen.getByLabelText('Guerreiro') as HTMLInputElement
    act(() => fireEvent.click(guerreiro))
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toEqual(['guerreiro'])
  })

  it('★ desmarcar quita SÓ ese tag, preserva outros tags alleos', () => {
    const engine = buildEngineWithRegions()
    engine.dispatch(setNodeField('foo', 'tags', ['guerreiro', 'outra-cousa']))
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    const guerreiro = screen.getByLabelText('Guerreiro') as HTMLInputElement
    expect(guerreiro.checked).toBe(true)
    act(() => fireEvent.click(guerreiro))
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toEqual([
      'outra-cousa',
    ])
  })

  it('marcar dúas rexións distintas preserva ambas', () => {
    const engine = buildEngineWithRegions()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    act(() => fireEvent.click(screen.getByLabelText('Guerreiro')))
    act(() => fireEvent.click(screen.getByLabelText('Sur')))
    expect(engine.getDocument().tree.nodes.find((n) => n.id === 'foo')?.tags).toEqual([
      'guerreiro',
      'sur',
    ])
  })
})
// ── FIN: tests InspectorPanel ──
