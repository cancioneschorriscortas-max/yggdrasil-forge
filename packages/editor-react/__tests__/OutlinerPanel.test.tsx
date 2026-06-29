// ── INICIO: tests OutlinerPanel ──
// Proba a conexión engine↔UI sen render de canvas: o Outliner reflicte
// os nodos e grupos do documento, e re-renderiza cando o engine
// commitea cambios (vía useSyncExternalStore + engine.subscribe).

import { act, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument, removeNode } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'
import { OutlinerPanel } from '../src/panels/OutlinerPanel.js'

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'outliner-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test' },
    groups: [
      { id: 'g1', label: { en: 'Group 1' } },
      { id: 'g2', label: { en: 'Group 2' } },
    ],
    nodes: [
      { id: 'n1', type: 'small', label: { en: 'N1' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'small', label: { en: 'N2' }, position: { x: 50, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('OutlinerPanel', () => {
  it('lista os grupos e nodos do documento', () => {
    const engine = buildEngine()
    render(<OutlinerPanel engine={engine} />)
    expect(screen.getByText('g1')).toBeDefined()
    expect(screen.getByText('g2')).toBeDefined()
    expect(screen.getByText('n1')).toBeDefined()
    expect(screen.getByText('n2')).toBeDefined()
    expect(screen.getByText(/nodes \(2\)/i)).toBeDefined()
  })

  it('re-renderiza cando o engine commitea (engine.subscribe)', () => {
    const engine = buildEngine()
    render(<OutlinerPanel engine={engine} />)
    expect(screen.queryByText('n1')).not.toBeNull()
    // Eliminar n1 vía Command (commit real, dispara subscribers).
    let dispatchResult: { ok: boolean } | undefined
    act(() => {
      dispatchResult = engine.dispatch(removeNode('n1'))
    })
    expect(dispatchResult?.ok).toBe(true)
    // O Outliner xa non debería listar n1.
    expect(screen.queryByText('n1')).toBeNull()
    expect(screen.queryByText('n2')).not.toBeNull()
    expect(screen.getByText(/nodes \(1\)/i)).toBeDefined()
  })

  it('amosa placeholder en documento baleiro', () => {
    const tree: TreeDef = {
      id: 'empty',
      schemaVersion: '1.0.0',
      version: '0.1.0',
      label: { en: 'Empty' },
      groups: [],
      nodes: [],
      edges: [],
      layout: { type: 'custom' },
    } as TreeDef
    const engine = new EditorEngine(createEditorDocument(tree))
    render(<OutlinerPanel engine={engine} />)
    expect(screen.getByText(/empty document/i)).toBeDefined()
  })
})
// ── FIN: tests OutlinerPanel ──
