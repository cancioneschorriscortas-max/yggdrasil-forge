// ── INICIO: tests PrerequisitesEditor (7.5c-ii fase 2) ──
// Verifica:
//   - Renderiza combinador + condicións localizadas.
//   - Add/remove/edit → setNodeField.
//   - Normalización: bare condition ↔ grupo all.
//   - ★ Loop conciencia-voz: ciclo → warning en Problems → clic
//     selecciona.
//
// Todos os tests abren primeiro a sección Avanzado (o prerequisites
// vive alí desde 7.5c-U).

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef, UnlockRule } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
  setNodeField,
} from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'
import { ProblemsPanel } from '../src/panels/ProblemsPanel.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    resources: [{ id: 'xp', label: { en: 'XP' }, initial: 0 }],
    nodes: [
      {
        id: 'foo',
        type: 'notable',
        label: { en: 'Foo' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'bar',
        type: 'notable',
        label: { en: 'Bar' },
        position: { x: 100, y: 0 },
      },
      {
        id: 'baz',
        type: 'notable',
        label: { en: 'Baz' },
        position: { x: 200, y: 0 },
      },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree), {
    validators: createDefaultValidators(),
  })
}

function openAdvanced(): void {
  const toggle = screen.getByRole('button', { name: /Avanzado/i })
  act(() => {
    fireEvent.click(toggle)
  })
}

describe('★ PrerequisitesEditor — render', () => {
  it('sen prereqs: amosa combinador + hint "sen condicións"', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    expect(screen.getByRole('button', { name: /Combinador/i })).toBeDefined()
    expect(screen.getByText(/Sen condicións/i)).toBeDefined()
  })

  it('★ selector de "engadir condición" ofrece as 14 (todas soportadas)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    const addTrigger = screen.getByRole('button', { name: /Engadir condición/i })
    act(() => {
      fireEvent.click(addTrigger)
    })
    const listbox = screen.getByRole('listbox')
    const opts = Array.from(listbox.querySelectorAll('[role="option"]'))
    // 14 condicións + 1 placeholder "— engadir condición —".
    expect(opts.length).toBe(15)
    // Algunhas localizadas.
    const optsText = opts.map((o) => o.textContent ?? '').join(' ')
    expect(optsText).toContain('Nodo desbloqueado')
    expect(optsText).toContain('Recurso mínimo')
    expect(optsText).toContain('Regra personalizada')
  })

  it('★ engadir "Nodo desbloqueado" → prerequisites reflicte con grupo all', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    const addTrigger = screen.getByRole('button', { name: /Engadir condición/i })
    act(() => {
      fireEvent.click(addTrigger)
    })
    const opt = screen.getByRole('option', { name: /Nodo desbloqueado/i })
    act(() => {
      fireEvent.click(opt)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    // Normalización: sempre gárdase como grupo, non como condición bare.
    expect(fooAfter?.prerequisites).toMatchObject({
      type: 'all',
      conditions: [{ type: 'node_unlocked' }],
    })
    // O nodeId por defecto é un dos outros nodos (non foo).
    const rule = fooAfter?.prerequisites as { conditions: readonly { nodeId: string }[] }
    expect(rule.conditions[0]?.nodeId).not.toBe('foo')
  })

  it('engadir + eliminar → prerequisites undefined (buida = undefined)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    // Add
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Engadir condición/i }))
    })
    act(() => {
      fireEvent.click(screen.getByRole('option', { name: /Nodo desbloqueado/i }))
    })
    // Remove
    const removeBtn = screen.getByLabelText(/Quitar condición node_unlocked/i)
    act(() => {
      fireEvent.click(removeBtn)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.prerequisites).toBeUndefined()
  })

  it('cambiar combinador all → any', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    // Add
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Engadir condición/i }))
    })
    act(() => {
      fireEvent.click(screen.getByRole('option', { name: /Nodo desbloqueado/i }))
    })
    // Cambiar combinador — abre o dropdown do combinador e escopea ao listbox aberto.
    const combTrigger = screen.getByRole('button', { name: /Combinador/i })
    act(() => {
      fireEvent.click(combTrigger)
    })
    const listbox = screen.getByRole('listbox')
    const algunhaOpt = Array.from(listbox.querySelectorAll('[role="option"]')).find((el) =>
      /Algunha/.test(el.textContent ?? ''),
    ) as HTMLElement
    expect(algunhaOpt).toBeDefined()
    act(() => {
      fireEvent.click(algunhaOpt)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    const rule = fooAfter?.prerequisites as { type: string }
    expect(rule.type).toBe('any')
  })
})

describe('★ Normalización UnlockRule (bare condition ↔ grupo)', () => {
  it('bare UnlockCondition preexistente amósase como grupo `all` cunha condición', () => {
    const engine = buildEngine()
    // Precondición: foo ten un prerequisites bare (non grupo).
    engine.dispatch({
      type: 'setBarePrereq',
      mutate(draft) {
        const n = draft.tree.nodes.find((nn) => nn.id === 'foo')
        if (n !== undefined) {
          ;(n as { prerequisites?: unknown }).prerequisites = {
            type: 'node_unlocked',
            nodeId: 'bar',
          }
        }
      },
    })
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    // Vese o combinador "Todas" activo + a condición "Nodo desbloqueado".
    const combTrigger = screen.getByRole('button', { name: /Combinador/i })
    expect(combTrigger.textContent).toContain('Todas')
    expect(screen.getByText('Nodo desbloqueado')).toBeDefined()
  })
})

describe('★★ Loop conciencia-voz (7.5c-ii fase 2 §5)', () => {
  it('crear ciclo (A require B, B require A) → warning PREREQ_CYCLE en Problems', () => {
    const engine = buildEngine()
    render(
      <>
        <InspectorPanel editorEngine={engine} />
        <ProblemsPanel engine={engine} />
      </>,
    )
    // foo prereq bar + bar prereq foo → ciclo (envolto en act para
    // forzar o re-render do ProblemsPanel).
    act(() => {
      engine.dispatch(
        setNodeField('foo', 'prerequisites', {
          type: 'all',
          conditions: [{ type: 'node_unlocked', nodeId: 'bar' }],
        } as UnlockRule),
      )
    })
    act(() => {
      engine.dispatch(
        setNodeField('bar', 'prerequisites', {
          type: 'all',
          conditions: [{ type: 'node_unlocked', nodeId: 'foo' }],
        } as UnlockRule),
      )
    })
    // ★ CANAL 1: motor detecta o ciclo.
    const issues = engine.getIssues()
    const cycleIssue = issues.find((i) => i.code === 'PREREQ_CYCLE')
    expect(cycleIssue).toBeDefined()
    expect(cycleIssue?.severity).toBe('warning')
    // ★ CANAL 2: UI amosa o ciclo (loop conciencia-voz completo).
    expect(document.body.textContent).toContain('PREREQ_CYCLE')
  })
})
// ── FIN: tests PrerequisitesEditor ──
