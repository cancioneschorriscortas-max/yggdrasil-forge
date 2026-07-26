// ── INICIO: tests vista tarxetas (7.15c, Cambio 2) ──
// Cobre o wiring editor↔ClusterCardsView: toggle, selección por fila,
// tiers vivos en Proba, tools desactivadas e «Sen grupo». A xeometría
// (pan/zoom da vista, posicións das tarxetas) vai ao gate visual +
// E2E do Tester (A.6.43).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'
import type { ProbaSession } from '../src/proba/useProbaSession.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'cards-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Cartas test', en: 'Cards test' },
    groups: [{ id: 'g1', label: { gl: 'Grupo Un' }, color: '#c8875f', nodeIds: ['a'] }],
    nodes: [
      { id: 'a', type: 'small', label: { gl: 'A' }, position: { x: 0, y: 0 }, maxTier: 3 },
      { id: 'orfo', type: 'small', label: { gl: 'Orfo' }, position: { x: 100, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('7.15c — toggle grafo | tarxetas', () => {
  it('o toggle existe nas dúas vistas e chama onViewChange', () => {
    const engine = buildEngine()
    const onViewChange = vi.fn()
    render(<EditorCanvas editorEngine={engine} view="graph" onViewChange={onViewChange} />)
    const tarxetas = screen.getByRole('button', { name: 'tarxetas' })
    act(() => {
      fireEvent.click(tarxetas)
    })
    expect(onViewChange).toHaveBeenCalledWith('cards')
  })

  it('view=cards renderiza a ClusterCardsView e OCULTA a toolbar de creación', () => {
    const engine = buildEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} view="cards" />)
    expect(container.querySelector('.yf-cluster-cards')).not.toBeNull()
    // Tools de creación desactivadas (toolbar fóra) e sen SkillTree.
    expect(container.querySelector('.editor-canvas-toolbar')).toBeNull()
    expect(container.querySelector('svg.yf-skill-tree')).toBeNull()
    // A coroa leva a identidade da árbore.
    expect(screen.getByText('Cartas test')).toBeDefined()
  })

  it('view=graph segue como sempre (SkillTree + toolbar)', () => {
    const engine = buildEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} view="graph" />)
    expect(container.querySelector('svg.yf-skill-tree')).not.toBeNull()
    expect(container.querySelector('.editor-canvas-toolbar')).not.toBeNull()
    expect(container.querySelector('.yf-cluster-cards')).toBeNull()
  })
})

describe('7.15c — contido e selección', () => {
  it('★ fila clicada → SelectionEngine recibe o nodo (o Inspector funciona)', () => {
    const engine = buildEngine()
    render(<EditorCanvas editorEngine={engine} view="cards" />)
    act(() => {
      fireEvent.click(screen.getByText('A'))
    })
    expect(engine.getSession().selection.current()).toEqual([{ kind: 'node', id: 'a' }])
  })

  it('«Sen grupo» aparece cos nodos non reclamados (nunca ocultos)', () => {
    const engine = buildEngine()
    render(<EditorCanvas editorEngine={engine} view="cards" />)
    expect(screen.getByText('Sen grupo')).toBeDefined()
    expect(screen.getByText('Orfo')).toBeDefined()
  })

  it('en Autoría os badges van a 0 (0/3)', () => {
    const engine = buildEngine()
    render(<EditorCanvas editorEngine={engine} view="cards" />)
    expect(screen.getByText('0/3')).toBeDefined()
  })

  it('★ en Proba os badges veñen da SESIÓN e actualizan en vivo', async () => {
    const engine = buildEngine()
    const treeEngine = new TreeEngine(engine.getDocument().tree)
    const session: ProbaSession = { treeEngine, reset: () => undefined }
    render(<EditorCanvas editorEngine={engine} probaSession={session} view="cards" />)
    expect(screen.getByText('0/3')).toBeDefined()

    // Desbloquear na sesión (como faría a ficha do panel Proba).
    await act(async () => {
      await treeEngine.unlock('a')
    })
    expect(screen.getByText('1/3')).toBeDefined()
    // O nodo single-tier 'orfo' segue 0/1.
    expect(screen.getByText('0/1')).toBeDefined()
  })
})
// ── FIN: tests vista tarxetas ──
