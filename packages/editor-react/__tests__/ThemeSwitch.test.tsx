// ── INICIO: tests switch de tema (7.8) ──
// Cobre o punto "Tests" do briefing 7.8:
//   - TopBar: o switch renderiza cando hai `theme`, non renderiza sen ela.
//   - Clic chama `onThemeChange` co valor oposto.
//   - Aria correcto (role="switch", aria-checked).
//   - EditorShell propaga `theme` ao TopBar.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorShell } from '../src/EditorShell.js'
import { TopBar } from '../src/shell/TopBar.js'
import { useEditorMode } from '../src/shell/useEditorMode.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    nodes: [{ id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } }],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

function renderTopBar(props: Partial<Parameters<typeof TopBar>[0]> = {}): void {
  const engine = buildEngine()
  function Harness(): ReturnType<typeof TopBar> {
    const { mode, toggleMode } = useEditorMode('authoring')
    return (
      <TopBar
        engine={engine}
        mode={mode}
        onToggleMode={toggleMode}
        panels={[]}
        visiblePanelIds={[]}
        onTogglePanel={vi.fn()}
        onResetLayout={vi.fn()}
        {...props}
      />
    )
  }
  render(<Harness />)
}

describe('★ 7.8 — switch de tema no TopBar', () => {
  it('non renderiza o switch se non se pasa `theme`', () => {
    renderTopBar()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('renderiza o switch cando hai `theme`', () => {
    renderTopBar({ theme: 'light', onThemeChange: vi.fn() })
    expect(screen.getByRole('switch')).not.toBeNull()
  })

  it('aria-checked reflicte o tema actual', () => {
    renderTopBar({ theme: 'dark', onThemeChange: vi.fn() })
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('aria-label identifica o control', () => {
    renderTopBar({ theme: 'light', onThemeChange: vi.fn() })
    expect(screen.getByRole('switch', { name: /Tema escuro/i })).not.toBeNull()
  })

  it('★ clic chama onThemeChange co valor OPOSTO ao actual (light → dark)', () => {
    const onThemeChange = vi.fn()
    renderTopBar({ theme: 'light', onThemeChange })
    act(() => fireEvent.click(screen.getByRole('switch')))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('★ clic chama onThemeChange co valor OPOSTO ao actual (dark → light)', () => {
    const onThemeChange = vi.fn()
    renderTopBar({ theme: 'dark', onThemeChange })
    act(() => fireEvent.click(screen.getByRole('switch')))
    expect(onThemeChange).toHaveBeenCalledWith('light')
  })
})

describe('★ 7.8 — EditorShell propaga theme ao TopBar', () => {
  it('sen `theme`, o switch non aparece', async () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('con `theme`, o switch aparece co estado correcto', () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} theme="dark" onThemeChange={vi.fn()} />)
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('★ clic no switch dentro de EditorShell invoca onThemeChange', () => {
    const engine = buildEngine()
    const onThemeChange = vi.fn()
    render(<EditorShell engine={engine} theme="light" onThemeChange={onThemeChange} />)
    act(() => fireEvent.click(screen.getByRole('switch')))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })
})
// ── FIN: tests switch de tema (7.8) ──
