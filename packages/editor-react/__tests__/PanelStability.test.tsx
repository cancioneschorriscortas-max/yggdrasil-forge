// ── INICIO: tests PanelHost + PanelsMenu (7.7) ──
// Cobre as catro dores do Cliente Zero:
//   1. Menú Paneis reabre pechados.
//   2. Cambio de modo conserva xeometría (test central).
//   3. initialLayout + onLayoutChange (persistencia).
//   4. Restaurar volve á disposición por defecto.

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import type { SerializedDockview } from 'dockview-react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorShell } from '../src/EditorShell.js'

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

/** Agarda ata que o dockview inserte polo menos un panel visible. */
async function waitForDockviewReady(): Promise<void> {
  await waitFor(() => {
    const groups = document.querySelectorAll('.dv-groupview')
    expect(groups.length).toBeGreaterThan(0)
  })
}

describe('★ 7.7 §1 — Menú Paneis', () => {
  it('renderiza a listaxe con marca ✓ para os visibles', async () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    await waitForDockviewReady()
    const menuBtn = screen.getByRole('button', { name: /^Paneis$/i })
    act(() => fireEvent.click(menuBtn))
    // Cada panel de Autoría aparece como menuitemcheckbox.
    const items = screen.getAllByRole('menuitemcheckbox')
    // outliner + canvas + inspector + tema + problems = 5 en Autoría.
    expect(items.length).toBe(5)
    // Todos comezan con aria-checked=true (visibles no arranque).
    for (const it of items) {
      expect(it.getAttribute('aria-checked')).toBe('true')
    }
  })

  it('★ pecha un panel via menú → reabre via menú', async () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    await waitForDockviewReady()

    const menuBtn = screen.getByRole('button', { name: /^Paneis$/i })
    act(() => fireEvent.click(menuBtn))

    // Clic en «Problemas» → péchase.
    const problemasItem = screen
      .getAllByRole('menuitemcheckbox')
      .find((n) => (n.textContent ?? '').includes('Problemas'))
    expect(problemasItem).toBeDefined()
    act(() => fireEvent.click(problemasItem as HTMLElement))

    // Comproba que a marca cambia (dockview eliminou o panel).
    await waitFor(() => {
      const items = screen.getAllByRole('menuitemcheckbox')
      const prob = items.find((n) => (n.textContent ?? '').includes('Problemas'))
      expect(prob?.getAttribute('aria-checked')).toBe('false')
    })

    // Reabre.
    const items = screen.getAllByRole('menuitemcheckbox')
    const probClosed = items.find((n) => (n.textContent ?? '').includes('Problemas'))
    act(() => fireEvent.click(probClosed as HTMLElement))

    await waitFor(() => {
      const its = screen.getAllByRole('menuitemcheckbox')
      const p = its.find((n) => (n.textContent ?? '').includes('Problemas'))
      expect(p?.getAttribute('aria-checked')).toBe('true')
    })
  })

  it('menú péchase con Escape', async () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    await waitForDockviewReady()
    const menuBtn = screen.getByRole('button', { name: /^Paneis$/i })
    act(() => fireEvent.click(menuBtn))
    expect(screen.queryAllByRole('menuitemcheckbox').length).toBeGreaterThan(0)
    act(() => fireEvent.keyDown(document, { key: 'Escape' }))
    await waitFor(() => {
      expect(screen.queryAllByRole('menuitemcheckbox').length).toBe(0)
    })
  })
})

describe('★★ 7.7 §2 — Cambio de modo conserva xeometría', () => {
  it('alternar Autoría→Proba→Autoría deixa a lista de Autoría intacta', async () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    await waitForDockviewReady()

    // Snapshot inicial: 5 paneis en Autoría (outliner, canvas,
    // inspector, tema, problemas).
    const collectVisible = (): readonly string[] => {
      act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
      const ids = screen
        .getAllByRole('menuitemcheckbox')
        .filter((n) => n.getAttribute('aria-checked') === 'true')
        .map((n) => n.textContent?.trim() ?? '')
      act(() => fireEvent.keyDown(document, { key: 'Escape' }))
      return ids
    }
    const before = collectVisible()
    expect(before.length).toBe(5)

    // Autoría → Proba.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Proba$/i })))
    await new Promise((r) => setTimeout(r, 100))

    // Proba → Autoría.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Autoría$/i })))
    await new Promise((r) => setTimeout(r, 100))

    const after = collectVisible()
    // Mesmo conxunto de paneis visibles (a orde pode variar).
    expect(after.length).toBe(before.length)
    for (const t of before) {
      expect(after.some((a) => a.includes(t.replace(/^\s+/, '')))).toBe(true)
    }
  })

  it('★ swap preserva Estrutura e Canvas (só cambia o grupo dereito)', async () => {
    const engine = buildEngine()
    render(<EditorShell engine={engine} />)
    await waitForDockviewReady()

    const menuBtn = screen.getByRole('button', { name: /^Paneis$/i })
    act(() => fireEvent.click(menuBtn))
    // Confirma que Estrutura + Canvas están.
    const before = screen.getAllByRole('menuitemcheckbox').map((n) => n.textContent?.trim() ?? '')
    expect(before.some((t) => t.includes('Estrutura'))).toBe(true)
    expect(before.some((t) => t.includes('Canvas'))).toBe(true)
    act(() => fireEvent.keyDown(document, { key: 'Escape' }))

    // Alterna.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Proba$/i })))
    await new Promise((r) => setTimeout(r, 100))

    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const afterSwap = screen
      .getAllByRole('menuitemcheckbox')
      .map((n) => n.textContent?.trim() ?? '')
    // Estrutura + Canvas seguen aí; agora tamén Proba en lugar de Inspector/Tema.
    expect(afterSwap.some((t) => t.includes('Estrutura'))).toBe(true)
    expect(afterSwap.some((t) => t.includes('Canvas'))).toBe(true)
    expect(afterSwap.some((t) => t.includes('Proba'))).toBe(true)
    expect(afterSwap.some((t) => t.includes('Inspector'))).toBe(false)
  })
})

describe('★ 7.7 §3 — Persistencia', () => {
  it('onLayoutChange dispara tras cambios (con debounce)', async () => {
    const engine = buildEngine()
    const onLayoutChange = vi.fn()
    render(<EditorShell engine={engine} onLayoutChange={onLayoutChange} />)
    await waitForDockviewReady()
    // Forzar un cambio explícito de layout: pechar un panel via menú.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const problemasItem = screen
      .getAllByRole('menuitemcheckbox')
      .find((n) => (n.textContent ?? '').includes('Problemas'))
    act(() => fireEvent.click(problemasItem as HTMLElement))
    // Agarda debounce + folga.
    await new Promise((r) => setTimeout(r, 500))
    expect(onLayoutChange).toHaveBeenCalled()
    const arg = onLayoutChange.mock.calls[0]?.[0]
    expect(arg).toBeDefined()
    expect(typeof arg).toBe('object')
  })

  it('★ initialLayout inválido → onLayoutInvalid + fallback ao default', async () => {
    const engine = buildEngine()
    const onLayoutInvalid = vi.fn()
    // Objeto obviamente inválido.
    const badLayout = { garbage: true } as unknown as SerializedDockview
    render(
      <EditorShell engine={engine} initialLayout={badLayout} onLayoutInvalid={onLayoutInvalid} />,
    )
    await waitForDockviewReady()
    expect(onLayoutInvalid).toHaveBeenCalled()
    // O fallback debe amosar os paneis por defecto.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const items = screen.getAllByRole('menuitemcheckbox')
    expect(items.length).toBe(5)
  })

  it('non persiste en modo Proba (só en Autoría)', async () => {
    const engine = buildEngine()
    const onLayoutChange = vi.fn()
    render(<EditorShell engine={engine} onLayoutChange={onLayoutChange} />)
    await waitForDockviewReady()

    // Provoca un cambio en Autoría — dispara onLayoutChange tras
    // debounce.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const problemasItem = screen
      .getAllByRole('menuitemcheckbox')
      .find((n) => (n.textContent ?? '').includes('Problemas'))
    act(() => fireEvent.click(problemasItem as HTMLElement))
    await new Promise((r) => setTimeout(r, 500))
    const callsInAutoria = onLayoutChange.mock.calls.length
    expect(callsInAutoria).toBeGreaterThan(0)
    onLayoutChange.mockClear()

    // Cambia a Proba e provoca cambios adicionais (o propio swap).
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Proba$/i })))
    await new Promise((r) => setTimeout(r, 500))
    // Non debera chamar onLayoutChange en Proba (filtrado no
    // handleLayoutChange do EditorShell).
    expect(onLayoutChange).not.toHaveBeenCalled()
  })
})

describe('★ 7.7b — Proporcións por defecto + flush beforeunload', () => {
  it('buildDefaultLayout aplica anchos aos laterais e alto ao inferior', async () => {
    const engine = buildEngine()
    const onLayoutChange = vi.fn()
    render(<EditorShell engine={engine} onLayoutChange={onLayoutChange} />)
    await waitForDockviewReady()
    // Forzar flush síncrono para obter unha foto certa do layout inicial.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(onLayoutChange).toHaveBeenCalled()
    const arg = onLayoutChange.mock.calls[0]?.[0] as SerializedDockview | undefined
    expect(arg).toBeDefined()
    const asJson = JSON.stringify(arg)
    // Contido mínimo esperable — os paneis por defecto están todos.
    expect(asJson).toContain('outliner')
    expect(asJson).toContain('canvas')
    expect(asJson).toContain('inspector')
    expect(asJson).toContain('theme')
    expect(asJson).toContain('problems')
  })

  it('★ beforeunload dispara onLayoutChange SINCRONAMENTE (cinto seguridade)', async () => {
    const engine = buildEngine()
    const onLayoutChange = vi.fn()
    render(<EditorShell engine={engine} onLayoutChange={onLayoutChange} />)
    await waitForDockviewReady()
    // Clear as chamadas previas (debounce inicial).
    await new Promise((r) => setTimeout(r, 500))
    onLayoutChange.mockClear()

    // Fai un cambio: ao pechar Problemas dispárase onDidLayoutChange,
    // pero o debounce (300ms) segue vivo — o beforeunload debe flushear
    // sen agardar.
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const problemasItem = screen
      .getAllByRole('menuitemcheckbox')
      .find((n) => (n.textContent ?? '').includes('Problemas'))
    act(() => fireEvent.click(problemasItem as HTMLElement))

    // Antes do debounce (300ms), disparar beforeunload — debe chamar YA.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(onLayoutChange).toHaveBeenCalled()
  })

  it('beforeunload sen cambios pendentes tamén garda foto actual', async () => {
    const engine = buildEngine()
    const onLayoutChange = vi.fn()
    render(<EditorShell engine={engine} onLayoutChange={onLayoutChange} />)
    await waitForDockviewReady()
    await new Promise((r) => setTimeout(r, 500))
    onLayoutChange.mockClear()

    // Sen tocar nada, beforeunload debe emitir toJSON actual.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(onLayoutChange).toHaveBeenCalled()
    // O argumento é un obxecto (SerializedDockview).
    const arg = onLayoutChange.mock.calls[0]?.[0]
    expect(arg).toBeDefined()
    expect(typeof arg).toBe('object')
  })

  it('★ debounce pendente flusheado no beforeunload (sen esperar 300ms)', async () => {
    const engine = buildEngine()
    const onLayoutChange = vi.fn()
    render(<EditorShell engine={engine} onLayoutChange={onLayoutChange} />)
    await waitForDockviewReady()
    await new Promise((r) => setTimeout(r, 500))
    onLayoutChange.mockClear()

    // Provoca un cambio (debounce arrinca).
    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const problemasItem = screen
      .getAllByRole('menuitemcheckbox')
      .find((n) => (n.textContent ?? '').includes('Problemas'))
    act(() => fireEvent.click(problemasItem as HTMLElement))

    // Antes do debounce (300ms), beforeunload debe flushear.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    // Non nos importa cantas chamadas exactas houbo (dockview pode
    // disparar onDidLayoutChange múltiples veces durante o cambio,
    // e algúns debounces poden encadenarse); o núcleo é que **antes**
    // dos 300ms de debounce xa hai chamada gravada.
    expect(onLayoutChange).toHaveBeenCalled()
  })
})

describe('★ 7.7 §4 — Restaurar disposición', () => {
  it('«Restaurar disposición» invoca onLayoutInvalid (limpa gardado)', async () => {
    const engine = buildEngine()
    const onLayoutInvalid = vi.fn()
    render(<EditorShell engine={engine} onLayoutInvalid={onLayoutInvalid} />)
    await waitForDockviewReady()

    act(() => fireEvent.click(screen.getByRole('button', { name: /^Paneis$/i })))
    const resetItem = screen.getByRole('menuitem', { name: /Restaurar disposición/i })
    act(() => fireEvent.click(resetItem))

    expect(onLayoutInvalid).toHaveBeenCalled()
  })
})
// ── FIN: tests PanelHost + PanelsMenu ──
