// ── INICIO: tests ThemePanel (7.5e §7) ──
// Verifica:
//   - Preset Tintado dispatchse ao motor cun clic → doc.meta.theme = Tintado.
//   - Editar unha cor de recheo dispatchse.
//   - Editar cor de rexión existente dispatchse (só cor).
//   - Poñer URL de fondo dispatchse setMetaField('background', ...).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { PRESET_TINTADO, ThemePanel } from '../src/panels/ThemePanel.js'

afterEach(() => cleanup())

function buildEngine(regionsPreloaded = false): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    nodes: [{ id: 'foo', type: 'notable', label: { en: 'Foo' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(
    createEditorDocument(tree, {
      ...(regionsPreloaded && {
        theme: {
          regions: [{ id: 'r1', label: 'R1', tag: 't1', color: '#f00000' }],
        },
      }),
    }),
  )
}

describe('★ ThemePanel — Preset Tintado en 3 clics (7.5e §7)', () => {
  it('clic no chip "Tintado" → doc.meta.theme = PRESET_TINTADO', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    const chip = screen.getByRole('button', { name: /Tintado/i })
    act(() => {
      fireEvent.click(chip)
    })
    expect(engine.getDocument().meta.theme).toEqual(PRESET_TINTADO)
    expect(engine.canUndo()).toBe(true)
  })

  it('clic en Neutro → preset "neutro"', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    const chip = screen.getByRole('button', { name: /Neutro/i })
    act(() => {
      fireEvent.click(chip)
    })
    expect(engine.getDocument().meta.theme?.preset).toBe('neutro')
  })

  it('★ tras aplicar Tintado, o chip aparece como activo (visual feedback)', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    const chip = screen.getByRole('button', { name: /Tintado/i })
    expect(chip.className).not.toContain('editor-theme-panel__chip--active')
    act(() => {
      fireEvent.click(chip)
    })
    // Re-obter tras re-render.
    const chipAfter = screen.getByRole('button', { name: /Tintado/i })
    expect(chipAfter.className).toContain('editor-theme-panel__chip--active')
  })
})

describe('ThemePanel — Recheo por estado', () => {
  it('cambiar cor de locked → theme.nodeFills.locked dispatchse', () => {
    const engine = buildEngine()
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const lockedInput = container.querySelector('#theme-fill-locked') as HTMLInputElement
    expect(lockedInput).toBeDefined()
    act(() => {
      fireEvent.change(lockedInput, { target: { value: '#123456' } })
    })
    act(() => {
      fireEvent.blur(lockedInput)
    })
    expect(engine.getDocument().meta.theme?.nodeFills?.locked).toBe('#123456')
  })
})

describe('ThemePanel — Rexións (só cor editable v1)', () => {
  it('con rexión preloaded → aparece na lista', () => {
    const engine = buildEngine(true)
    render(<ThemePanel editorEngine={engine} />)
    expect(screen.getByText('R1')).toBeDefined()
    expect(screen.getByText(/tag: t1/i)).toBeDefined()
  })

  it('cambiar cor da rexión → só se actualiza a cor (id/label/tag intactos)', () => {
    const engine = buildEngine(true)
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const colorInput = container.querySelector('#theme-region-r1') as HTMLInputElement
    expect(colorInput).toBeDefined()
    act(() => {
      fireEvent.change(colorInput, { target: { value: '#00ff00' } })
    })
    act(() => {
      fireEvent.blur(colorInput)
    })
    const region = engine.getDocument().meta.theme?.regions?.[0]
    expect(region?.color).toBe('#00ff00')
    expect(region?.id).toBe('r1')
    expect(region?.label).toBe('R1')
    expect(region?.tag).toBe('t1')
  })

  it('sen rexións definidas → hint informativo', () => {
    const engine = buildEngine()
    render(<ThemePanel editorEngine={engine} />)
    expect(screen.getByText(/Sen rexións definidas/i)).toBeDefined()
  })
})

describe('ThemePanel — Fondo', () => {
  it('escribir URL → doc.meta.background.src actualízase', () => {
    const engine = buildEngine()
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const bgInput = container.querySelector('#theme-background-src') as HTMLInputElement
    act(() => {
      fireEvent.change(bgInput, { target: { value: 'https://example/bg.png' } })
    })
    act(() => {
      fireEvent.blur(bgInput)
    })
    expect(engine.getDocument().meta.background?.src).toBe('https://example/bg.png')
  })

  it('borrar contido do URL → background pásase a undefined', () => {
    const engine = buildEngine()
    // Setup: background xa presente.
    engine.dispatch({
      type: 'setup',
      mutate(draft) {
        ;(draft.meta as { background?: { src: string } }).background = { src: 'x' }
      },
    })
    const { container } = render(<ThemePanel editorEngine={engine} />)
    const bgInput = container.querySelector('#theme-background-src') as HTMLInputElement
    expect(bgInput.value).toBe('x')
    act(() => {
      fireEvent.change(bgInput, { target: { value: '' } })
    })
    act(() => {
      fireEvent.blur(bgInput)
    })
    expect(engine.getDocument().meta.background).toBeUndefined()
  })
})
// ── FIN: tests ThemePanel ──
