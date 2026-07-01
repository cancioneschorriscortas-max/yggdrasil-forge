// ── INICIO: tests sub-editores estruturados + ProblemsPanel ──
// Verifica:
//   - ExclusionsEditor: add/remove dispatcha setNodeField.
//   - EffectsEditor: selector NON inclúe modify_stat (gate).
//   - ProblemsPanel: renderiza getIssues, clic selecciona o nodo.
//   - ★ Loop integración: engadir exclusión asimétrica → warning aparece
//     no panel → clic → selecciona o nodo.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import {
  EditorEngine,
  createDefaultValidators,
  createEditorDocument,
} from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'
import { ProblemsPanel } from '../src/panels/ProblemsPanel.js'

afterEach(() => cleanup())

/**
 * Helper para tests: abre a sección "Avanzado" do Inspector. Todos os
 * campos estruturados están alí (pregados por defecto en 7.5c-U).
 */
function openAdvanced(): void {
  const toggle = screen.getByRole('button', { name: /Avanzado/i })
  act(() => {
    fireEvent.click(toggle)
  })
}

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 'struct-test',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'Test' },
    groups: [],
    resources: [
      { id: 'gold', label: { en: 'Gold' } },
      { id: 'wood', label: { en: 'Wood' } },
    ],
    nodes: [
      {
        id: 'foo',
        type: 'small',
        label: { en: 'Foo' },
        position: { x: 0, y: 0 },
      },
      { id: 'bar', type: 'small', label: { en: 'Bar' }, position: { x: 50, y: 0 } },
      { id: 'baz', type: 'small', label: { en: 'Baz' }, position: { x: 100, y: 0 } },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree), {
    validators: createDefaultValidators(),
  })
}

describe('ExclusionsEditor — add/remove', () => {
  it('engadir un id → setNodeField commiteado, exclusions reflicte', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    // O Select propio: abrir dropdown do "Engadir exclusión".
    const trigger = screen.getByRole('button', { name: /Engadir exclusión/i })
    act(() => {
      fireEvent.click(trigger)
    })
    const barOption = screen.getByRole('option', { name: 'bar' })
    act(() => {
      fireEvent.click(barOption)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.exclusions).toEqual(['bar'])
    expect(engine.canUndo()).toBe(true)
  })

  it('quitar un id existente → exclusions baleiro', () => {
    const engine = buildEngine()
    // Setup: foo xa ten exclusion sobre bar.
    engine.dispatch({
      type: 'setNodeField',
      mutate(draft) {
        const n = draft.tree.nodes.find((nn) => nn.id === 'foo')
        if (n !== undefined) (n as { exclusions?: string[] }).exclusions = ['bar']
      },
    })
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    const removeBtn = screen.getByLabelText(/Quitar exclusión bar/i)
    act(() => {
      fireEvent.click(removeBtn)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.exclusions).toEqual([])
  })
})

describe('★ EffectsEditor — gate manifesto-descriptor', () => {
  it('selector "engadir effect" NON inclúe modify_stat nin plugin', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    // Abre o dropdown "Engadir effect plano" (Select propio).
    const trigger = screen.getByRole('button', { name: /Engadir effect plano/i })
    act(() => {
      fireEvent.click(trigger)
    })
    const listbox = screen.getByRole('listbox')
    const optionValues = Array.from(listbox.querySelectorAll('[role="option"]')).map(
      (el) => (el as HTMLElement).id.split('-opt-')[0],
    )
    // (Nota: como o Select xera ids opt-INDEX, mellor comprobamos os textos)
    const optionTexts = Array.from(listbox.querySelectorAll('[role="option"]')).map(
      (el) => el.textContent ?? '',
    )
    void optionValues
    // Os UNSUPPORTED NON deben aparecer (labels localizados).
    expect(optionTexts.join(' ')).not.toContain('modify_stat')
    expect(optionTexts.join(' ')).not.toContain('plugin')
    // Os aniñados (fase 2) tampouco no selector plano.
    expect(optionTexts.join(' ')).not.toContain('Composto')
    expect(optionTexts.join(' ')).not.toContain('Condicional')
    // SI deben aparecer os planos soportados (labels gl).
    expect(optionTexts.some((t) => t.includes('Modificar recurso'))).toBe(true)
    expect(optionTexts.some((t) => t.includes('Desbloquear nodo'))).toBe(true)
  })

  it('engadir un modify_resource → effects do nodo contén o effect', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    const trigger = screen.getByRole('button', { name: /Engadir effect plano/i })
    act(() => {
      fireEvent.click(trigger)
    })
    // A opción "Modificar recurso" corresponde a modify_resource.
    const opt = screen.getByRole('option', { name: /Modificar recurso/i })
    act(() => {
      fireEvent.click(opt)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.effects?.length).toBe(1)
    expect(fooAfter?.effects?.[0]?.type).toBe('modify_resource')
  })
})

describe('CostEditor', () => {
  it('engadir custo → cost reflicte', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    openAdvanced()
    const trigger = screen.getByRole('button', { name: /Engadir custo/i })
    act(() => {
      fireEvent.click(trigger)
    })
    const opt = screen.getByRole('option', { name: 'gold' })
    act(() => {
      fireEvent.click(opt)
    })
    const fooAfter = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooAfter?.cost).toEqual([{ resourceId: 'gold', amount: 1 }])
  })
})

describe('ProblemsPanel — voz da conciencia', () => {
  it('sen issues: amosa hint', () => {
    const engine = buildEngine()
    render(<ProblemsPanel engine={engine} />)
    expect(screen.getByText(/Sen problemas detectados/i)).toBeDefined()
  })

  it('★ loop integración: exclusión asimétrica → warning → clic selecciona nodo', () => {
    const engine = buildEngine()
    // Engadir foo.exclusions = ['bar'] SEN engadir bar.exclusions = ['foo'].
    // O asymmetricExclusionValidator (soft, 7.4) emite warning.
    engine.dispatch({
      type: 'setNodeField',
      mutate(draft) {
        const n = draft.tree.nodes.find((nn) => nn.id === 'foo')
        if (n !== undefined) (n as { exclusions?: string[] }).exclusions = ['bar']
      },
    })
    // Confirma que hai issues.
    const issues = engine.getIssues()
    expect(issues.length).toBeGreaterThan(0)
    // O panel renderiza o issue.
    render(<ProblemsPanel engine={engine} />)
    // Cada issue debería ser clickable (botón).
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    // Clic no primeiro → selección do nodo referenciado.
    const nodeIdReferenced = issues[0]?.nodeId
    const firstBtn = buttons[0]
    if (nodeIdReferenced !== undefined && firstBtn !== undefined) {
      act(() => {
        fireEvent.click(firstBtn)
      })
      const sel = engine.getSession().selection.current()
      expect(sel.length).toBe(1)
      expect(sel[0]).toEqual({ kind: 'node', id: nodeIdReferenced })
    }
  })
})
// ── FIN: tests sub-editores + ProblemsPanel ──
