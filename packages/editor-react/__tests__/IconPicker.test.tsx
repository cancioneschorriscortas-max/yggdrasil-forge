// ── INICIO: tests IconWidget / selector visual de iconas (15.5) ──
// O banco cobra: popover con busca, grella agrupada, «Sen icona»,
// teclado (Esc devolve o foco), texto libre sen regresión, e axe en
// verde co popover ABERTO (a garda de auto-2 non é opcional).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { LOGIC_ICONS, NORSE_ICONS, registerIcons } from '@yggdrasil-forge/react'
import { axe } from 'jest-axe'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'

afterEach(() => cleanup())
beforeAll(() => {
  // Como fai examples/editor no arranque.
  registerIcons(NORSE_ICONS)
  registerIcons(LOGIC_ICONS)
})

function buildEngine(icon?: string): EditorEngine {
  const tree: TreeDef = {
    id: 'icon-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Iconas' },
    nodes: [
      {
        id: 'a',
        type: 'small',
        label: { gl: 'A' },
        position: { x: 0, y: 0 },
        ...(icon !== undefined && { icon }),
      },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  const engine = new EditorEngine(createEditorDocument(tree))
  engine.getSession().selection.replace([{ kind: 'node', id: 'a' }])
  return engine
}

const nodeIcon = (engine: EditorEngine): string | undefined =>
  engine.getDocument().tree.nodes[0]?.icon

function openPicker(): void {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Escoller icona' }))
  })
}

describe('15.5 — selector visual de iconas', () => {
  it('★ o popover abre e lista as rexistradas agrupadas por set', () => {
    render(<InspectorPanel editorEngine={buildEngine()} />)
    openPicker()
    const dialog = screen.getByRole('dialog', { name: 'Selector de iconas' })
    expect(dialog).toBeDefined()
    // Grupos derivados do prefixo.
    for (const group of ['Builtin', 'Norse', 'Lóxica']) {
      expect(screen.getByText(group)).toBeDefined()
    }
    // Celas co id en letra pequena.
    expect(screen.getByRole('button', { name: /logic-key/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /norse-wolf/ })).toBeDefined()
  })

  it('a busca filtra por subcadea do id, instantánea', () => {
    render(<InspectorPanel editorEngine={buildEngine()} />)
    openPicker()
    act(() => {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar icona' }), {
        target: { value: 'lock' },
      })
    })
    expect(screen.getByRole('button', { name: /logic-lock/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /logic-unlock/ })).toBeDefined()
    expect(screen.queryByRole('button', { name: /norse-wolf/ })).toBeNull()
    // Norse queda sen entradas → o grupo desaparece.
    expect(screen.queryByText('Norse')).toBeNull()
  })

  it('★ clic nunha cela → setNodeField("icon", id) e o popover pecha', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    openPicker()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /logic-key/ }))
    })
    expect(nodeIcon(engine)).toBe('logic-key')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('«Sen icona» → undefined', () => {
    const engine = buildEngine('logic-crown')
    render(<InspectorPanel editorEngine={engine} />)
    openPicker()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sen icona' }))
    })
    expect(nodeIcon(engine)).toBeUndefined()
  })

  it('a icona actual vai resaltada na grella', () => {
    render(<InspectorPanel editorEngine={buildEngine('logic-crown')} />)
    openPicker()
    const current = screen.getByRole('button', { name: /logic-crown/ })
    expect(current.className).toContain('editor-iconwidget__cell--current')
  })

  it('Esc pecha e devolve o foco ao botón de grella', () => {
    render(<InspectorPanel editorEngine={buildEngine()} />)
    openPicker()
    act(() => {
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Escoller icona' }))
  })

  it('★ o texto libre segue commiteando (emoji, cero regresión)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    const input = document.getElementById(
      screen
        .getByRole('button', { name: 'Escoller icona' })
        .closest('.editor-iconwidget')
        ?.querySelector('input')?.id ?? '',
    ) as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { value: '🍞' } })
      fireEvent.blur(input)
    })
    expect(nodeIcon(engine)).toBe('🍞')
  })

  it('★ axe en verde co popover aberto (garda auto-2)', async () => {
    const { container } = render(<InspectorPanel editorEngine={buildEngine('logic-key')} />)
    openPicker()
    const results = await axe(container)
    const msgs = results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.help}`)
    expect(msgs, msgs.join('\n')).toEqual([])
  })
})
// ── FIN: tests IconWidget ──
