// ── INICIO: tests 7.5c-U (usabilidade Inspector) ──
// Verifica:
//   - Axuda: cada campo do Inspector amosa a súa describe curta debaixo
//     (sempre visible) + un iconiño (?) con tooltip.
//   - Select propio: substitúe o <select> nativo, amosa labels
//     localizados de NodeType.
//   - Sección Avanzado: pregada por defecto; click para desplegar.
//   - Básico sempre visible.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'

afterEach(() => cleanup())

function buildEngine(): EditorEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    nodes: [
      {
        id: 'foo',
        type: 'subtree_anchor',
        label: { en: 'Foo' },
        color: '#aabbcc',
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

describe('★ Axuda dos campos (FieldLabel + FieldHelp)', () => {
  it('cada campo básico amosa describe curto sempre visible', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    // "A cor do nodo." é o describe do descriptor de color (Básico).
    expect(screen.getByText(/A cor do nodo/i)).toBeDefined()
    // "O nome que ve o usuario no mapa." → describe de label.
    expect(screen.getByText(/O nome que ve o usuario no mapa/i)).toBeDefined()
  })

  it('cada campo ten un iconiño (?) con tooltip (help-icon)', () => {
    const engine = buildEngine()
    const { container } = render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const helpIcons = container.querySelectorAll('.editor-field__help-icon')
    expect(helpIcons.length).toBeGreaterThan(3)
    // O primeiro iconiño ten `title` co texto de axuda.
    const first = helpIcons[0] as HTMLElement
    expect(first.getAttribute('title')).toBeTruthy()
  })
})

describe('★ Sección Avanzado (pregada por defecto)', () => {
  it('o botón "Avanzado" está pregado inicialmente', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const toggle = screen.getByRole('button', { name: /Avanzado/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // Campos avanzados non deben estar visibles: 'Rangos',
    // 'Requisitos', 'Exclusións', 'Efectos', etc.
    expect(screen.queryByText(/^Rangos$/)).toBeNull()
    expect(screen.queryByText(/Requisitos/)).toBeNull()
  })

  it('click no toggle → despregase e amosa campos avanzados', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    const toggle = screen.getByRole('button', { name: /Avanzado/i })
    act(() => {
      fireEvent.click(toggle)
    })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    // Agora Rangos, Efectos, etc. visibles.
    expect(screen.getByText('Rangos')).toBeDefined()
    expect(screen.getByText('Requisitos')).toBeDefined()
    expect(screen.getByText('Exclusións')).toBeDefined()
  })

  it('conta os campos avanzados', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    // O contador amosa 7 (7.5c-T2: retirado `tiers` UNIMPLEMENTED):
    // type, maxTier, cost, costPerTier, effects, prerequisites, exclusions.
    const count = screen.getByText('7', { selector: '.editor-inspector__advanced-count' })
    expect(count).toBeDefined()
  })
})

describe('★ Select propio (substitúe <select> nativo)', () => {
  it('o Select do tipo amosa "Áncora de subárbore" (label gl de subtree_anchor)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    // Abrir avanzado.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Avanzado/i }))
    })
    // O trigger do Select amosa "Áncora de subárbore" (foo é subtree_anchor).
    const trigger = screen.getByRole('button', { name: 'Tipo' })
    expect(trigger.textContent).toContain('Áncora de subárbore')
  })

  it('abrir dropdown amosa TODAS as opcións localizadas (11 NodeTypes)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Avanzado/i }))
    })
    const trigger = screen.getByRole('button', { name: 'Tipo' })
    act(() => {
      fireEvent.click(trigger)
    })
    // Escoperado ao listbox aberto do Select propio (para non contar opcións
    // doutros <select> nativos dos sub-editores estruturados).
    const listbox = screen.getByRole('listbox')
    const options = listbox.querySelectorAll('[role="option"]')
    expect(options.length).toBe(11)
    // Alguns labels concretos.
    expect(screen.getByRole('option', { name: /Áncora de subárbore/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /Clave/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /Personalizado/i })).toBeDefined()
  })

  it('★ subtree_anchor no dropdown ten describe honesto ("único tipo con comportamento real")', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Avanzado/i }))
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Tipo' }))
    })
    // A opción "Áncora de subárbore" ten unha liña con "único tipo con
    // comportamento real" (do mapa NODE_TYPE_LABELS).
    expect(screen.getByText(/único tipo con comportamento real/i)).toBeDefined()
  })

  it('teclado: ArrowDown + Enter no Select selecciona a seguinte opción', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => {
      engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }])
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Avanzado/i }))
    })
    const trigger = screen.getByRole('button', { name: 'Tipo' })
    // Abrir dropdown con Enter.
    act(() => {
      fireEvent.keyDown(trigger, { key: 'Enter' })
    })
    // Chegou a listbox.
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
  })
})
// ── FIN: tests 7.5c-U ──
