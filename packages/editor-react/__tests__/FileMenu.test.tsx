// ── INICIO: tests menú Ficheiro (7.10) ──
// Cobre o punto "Tests" do briefing 7.10:
//   - o menú Ficheiro renderiza coas entradas segundo callbacks presentes.
//   - clic dispara callback e pecha o menú.
//   - sen `documentActions` non hai menú.
//   - EditorShell propaga documentActions ao TopBar.

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

describe('★ 7.10 — menú Ficheiro no TopBar', () => {
  it('sen documentActions: non renderiza o botón Ficheiro', () => {
    renderTopBar()
    expect(screen.queryByRole('button', { name: 'Ficheiro' })).toBeNull()
  })

  it('documentActions definido pero SEN entradas: non renderiza o botón Ficheiro', () => {
    renderTopBar({ documentActions: {} })
    expect(screen.queryByRole('button', { name: 'Ficheiro' })).toBeNull()
  })

  it('con onExport só: menú amosa Exportar pero non Novo/Importar', () => {
    renderTopBar({ documentActions: { onExport: vi.fn() } })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Ficheiro' })))
    expect(screen.getByRole('menuitem', { name: 'Exportar JSON' })).not.toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Novo' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /Importar/ })).toBeNull()
  })

  it('con as tres accións: menú amosa Novo, Importar e Exportar', () => {
    renderTopBar({
      documentActions: { onNew: vi.fn(), onImport: vi.fn(), onExport: vi.fn() },
    })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Ficheiro' })))
    expect(screen.getByRole('menuitem', { name: 'Novo' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Importar JSON…' })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Exportar JSON' })).not.toBeNull()
  })

  it('★ clic en Novo chama onNew e pecha o menú', () => {
    const onNew = vi.fn()
    renderTopBar({ documentActions: { onNew } })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Ficheiro' })))
    act(() => fireEvent.click(screen.getByRole('menuitem', { name: 'Novo' })))
    expect(onNew).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menuitem', { name: 'Novo' })).toBeNull() // pechado
  })

  it('★ clic en Exportar chama onExport e pecha o menú', () => {
    const onExport = vi.fn()
    renderTopBar({ documentActions: { onExport } })
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Ficheiro' })))
    act(() => fireEvent.click(screen.getByRole('menuitem', { name: 'Exportar JSON' })))
    expect(onExport).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menuitem', { name: 'Exportar JSON' })).toBeNull()
  })
})

describe('★ 7.10 — EditorShell propaga documentActions ao TopBar', () => {
  it('sen documentActions, o botón Ficheiro non aparece', () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    expect(screen.queryByRole('button', { name: 'Ficheiro' })).toBeNull()
  })

  it('★ con documentActions, clic en Importar invoca onImport', () => {
    const engine = buildEngine()
    const onImport = vi.fn()
    render(<EditorShell engine={engine} documentActions={{ onImport }} />)
    act(() => fireEvent.click(screen.getByRole('button', { name: 'Ficheiro' })))
    act(() => fireEvent.click(screen.getByRole('menuitem', { name: 'Importar JSON…' })))
    expect(onImport).toHaveBeenCalledTimes(1)
  })
})
// ── FIN: tests menú Ficheiro (7.10) ──
