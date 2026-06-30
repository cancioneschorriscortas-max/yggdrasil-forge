import { act, render, screen } from '@testing-library/react'
// ── INICIO: tests StatusBar selección count (7.5b-i) ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'
import { StatusBar } from '../src/shell/StatusBar.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'sb-sel',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test' },
    groups: [],
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 50, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('StatusBar — selección count', () => {
  it('non amosa "selected" cando non hai selección', () => {
    const engine = buildEngine()
    render(<StatusBar engine={engine} mode="authoring" />)
    expect(screen.queryByLabelText(/selection count/i)).toBeNull()
  })

  it('amosa "1 selected" tras seleccionar un nodo', () => {
    const engine = buildEngine()
    render(<StatusBar engine={engine} mode="authoring" />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
    })
    expect(screen.getByLabelText(/selection count/i).textContent).toContain('1 selected')
  })

  it('amosa "2 selected" tras seleccionar dous nodos', () => {
    const engine = buildEngine()
    render(<StatusBar engine={engine} mode="authoring" />)
    act(() => {
      engine.getSession().selection.replace([
        { kind: 'node', id: 'a' },
        { kind: 'node', id: 'b' },
      ])
    })
    expect(screen.getByLabelText(/selection count/i).textContent).toContain('2 selected')
  })
})
// ── FIN: tests StatusBar selección count ──
