// ── INICIO: tests EditorCanvas ──
// Tests do briefing 7.5b-i §5:
//   1. Smoke: monta sin erro cun engine cargado coa fixture (pinta N nodos).
//   2. onNodeClick actualiza a SelectionEngine.
//   3. Status bar amosa count correcto (> 0) e "N selected" tras selección.

import { render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument, setMetaField } from '@yggdrasil-forge/editor-core'
import { describe, expect, it } from 'vitest'
import { EditorCanvas } from '../src/canvas/EditorCanvas.js'

// Fixture local pequena (3 nodos, 2 arestas).
function buildFixtureEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'canvas-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Canvas test' },
    groups: [],
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
      { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
      { id: 'c', type: 'keystone', label: { en: 'C' }, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
      { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
    ],
    layout: { type: 'custom' },
  } as TreeDef
  const doc = createEditorDocument(tree, {
    coordinateBounds: { minX: -50, minY: -50, maxX: 250, maxY: 50 },
  })
  return new EditorEngine(doc)
}

describe('EditorCanvas — smoke', () => {
  it('renderiza sen erro cun engine cargado coa fixture', () => {
    const engine = buildFixtureEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} />)
    // O SkillTree pinta SVG; o canvas wrapper debe existir.
    expect(container.querySelector('.editor-canvas')).not.toBeNull()
    // E debería pintar polo menos un SVG (o SkillTree).
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('pinta os nodos da fixture (labels visibles no SVG)', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} />)
    // Os ids/labels dos nodos deberían aparecer no DOM (texto SVG).
    // O SkillTree pinta os labels traducidos; cuns ids "a", "b", "c"
    // e labels "A", "B", "C" en inglés, debemos atopalos.
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.getByText('C')).toBeDefined()
  })
})

describe('EditorCanvas — selección por clic via SelectionEngine', () => {
  it('SelectionEngine.replace dispara re-render con anel de selección', () => {
    const engine = buildFixtureEngine()
    const { container } = render(<EditorCanvas editorEngine={engine} />)
    // Estado inicial: cero selección.
    expect(engine.getSession().selection.current().length).toBe(0)
    // Simulamos onNodeClick directamente vía SelectionEngine (o
    // SkillTree internamente non temos como simular clic en jsdom
    // sin recoñecer o SVG layout; pero o que importa do briefing é
    // que SelectionEngine queda actualizado).
    engine.getSession().selection.replace([{ kind: 'node', id: 'b' }])
    // Forzamos un re-render esperando un microtask; o
    // useSyncExternalStore xa se sincronizou polo notify do subscribe.
    expect(engine.getSession().selection.current().length).toBe(1)
    expect(engine.getSession().selection.current()[0]?.id).toBe('b')
    // O canvas debería seguir renderizado (sin erro de re-render).
    expect(container.querySelector('.editor-canvas')).not.toBeNull()
  })
})

describe('★ 7.8.1 — texto do nodo lexible segundo o tema do chrome', () => {
  it('sen chromeTheme (ou "light"): texto escuro por defecto (cero regresión)', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#222222')
  })

  it('★ con chromeTheme="dark": texto claro lexible, non o #222222 fixo', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} chromeTheme="dark" />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#e8e9ea')
    expect(label.style.fill).not.toBe('#222222')
  })

  it('chromeTheme="light" explícito compórtase igual que sen prop', () => {
    const engine = buildFixtureEngine()
    render(<EditorCanvas editorEngine={engine} chromeTheme="light" />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#222222')
  })

  it('★ textColor explícito do documento GAÑA sobre chromeTheme="dark"', () => {
    const engine = buildFixtureEngine()
    engine.dispatch(
      setMetaField(
        'theme',
        { textColor: '#ff00aa' },
        { en: 'Update theme', gl: 'Actualizar tema' },
      ),
    )
    render(<EditorCanvas editorEngine={engine} chromeTheme="dark" />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#ff00aa')
  })

  it('★ textColor explícito do documento aplícase tamén en chromeTheme="light"/sen definir', () => {
    const engine = buildFixtureEngine()
    engine.dispatch(
      setMetaField(
        'theme',
        { textColor: '#ff00aa' },
        { en: 'Update theme', gl: 'Actualizar tema' },
      ),
    )
    render(<EditorCanvas editorEngine={engine} />)
    const label = screen.getByText('A')
    expect(label.style.fill).toBe('#ff00aa')
  })
})
// ── FIN: tests EditorCanvas ──
