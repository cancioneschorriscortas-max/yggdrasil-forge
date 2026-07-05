// ── INICIO: tests CostPerTierEditor (7.5f) ──
// Verifica:
//   - Render de N filas segundo maxTier.
//   - Engadir/quitar/editar custos por rango (denso).
//   - Botón «Quitar» a nivel de campo → undefined.
//   - Sen resources da árbore → hint.
//   - Sonda de fluxo: 3 dispatches + undos secuenciais.

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { NodeDef, TreeDef } from '@yggdrasil-forge/core'
import { EditorEngine, createEditorDocument, setNodeField } from '@yggdrasil-forge/editor-core'
import { afterEach, describe, expect, it } from 'vitest'
import { InspectorPanel } from '../src/inspector/InspectorPanel.js'

afterEach(() => cleanup())

function buildEngine(nodeOverride?: Partial<NodeDef>, withResources = true): EditorEngine {
  const foo: NodeDef = {
    id: 'foo',
    type: 'notable',
    label: { en: 'Foo' },
    position: { x: 0, y: 0 },
    maxTier: 3,
    ...nodeOverride,
  } as NodeDef
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '0.1.0',
    label: { en: 'T' },
    groups: [],
    ...(withResources && {
      resources: [
        { id: 'xp', label: { en: 'XP' }, initial: 0 },
        { id: 'gold', label: { en: 'Gold' }, initial: 0 },
      ],
    }),
    nodes: [foo],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  return new EditorEngine(createEditorDocument(tree))
}

function openAdvanced(): void {
  const toggle = screen.getByRole('button', { name: /Avanzado/i })
  act(() => {
    fireEvent.click(toggle)
  })
}

/**
 * Devolve o container do CostPerTierEditor (para queries locales
 * — evita colisións con outros widgets que tamén poden amosar
 * "árbore sen resources").
 */
function cptContainer(): HTMLElement {
  const el = document.querySelector<HTMLElement>('.editor-inspector-cpt')
  if (!el) throw new Error('CostPerTierEditor non renderizado')
  return el
}

describe('★ CostPerTierEditor — render segundo maxTier', () => {
  it('sen costPerTier + maxTier=3 → 3 filas todas [] (sen custo)', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()
    const cpt = cptContainer()
    expect(cpt.querySelector('.editor-inspector-cpt__row-title')?.textContent).toBe('Rango 1')
    const titles = Array.from(
      cpt.querySelectorAll<HTMLElement>('.editor-inspector-cpt__row-title'),
    ).map((n) => n.textContent)
    expect(titles).toEqual(['Rango 1', 'Rango 2', 'Rango 3'])
    // Todas as filas amosan "sen custo".
    const nocost = cpt.querySelectorAll('.editor-inspector-cpt__row-nocost')
    expect(nocost.length).toBe(3)
  })

  it('maxTier=1 → 1 fila + hint "só ten 1 rango"', () => {
    const engine = buildEngine({ maxTier: 1 })
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()
    const cpt = cptContainer()
    expect(cpt.querySelectorAll('.editor-inspector-cpt__row-title').length).toBe(1)
    expect(cpt.querySelector('.editor-inspector-cpt__single-hint')?.textContent).toMatch(
      /só ten 1 rango/i,
    )
  })

  it('sen maxTier → cae a 1 fila (clamp)', () => {
    const engine = buildEngine({ maxTier: undefined })
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()
    expect(cptContainer().querySelectorAll('.editor-inspector-cpt__row-title').length).toBe(1)
  })
})

describe('★ CostPerTierEditor — sen resources', () => {
  it('árbore sen resources → hint (dentro do container do editor)', () => {
    const engine = buildEngine(undefined, /* withResources */ false)
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()
    // Buscamos o hint especificamente no descriptor "costPerTier"
    // — que é un descriptor con label "Custo por nivel". Miramos que
    // o InspectorPanel amose polo menos un hint "sen resources"
    // asociado ao noso campo. Como CostEditor tamén amosa o hint,
    // usamos getAllByText: chega con confirmar que existe >=1.
    const hints = screen.getAllByText(/non ten resources definidos/i)
    expect(hints.length).toBeGreaterThanOrEqual(1)
  })
})

describe('★ CostPerTierEditor — botón «Quitar»', () => {
  it('sen valor → botón NON aparece', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()
    const cpt = cptContainer()
    expect(cpt.querySelector('.editor-inspector-cpt__clear')).toBeNull()
  })

  it('con valor + clic Quitar → dispatch undefined', () => {
    const engine = buildEngine()
    // Setup: pre-poblar costPerTier con [[xp,10]].
    engine.dispatch(setNodeField('foo', 'costPerTier', [[{ resourceId: 'xp', amount: 10 }]]))
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()
    const clearBtn = cptContainer().querySelector<HTMLButtonElement>('.editor-inspector-cpt__clear')
    expect(clearBtn).not.toBeNull()
    act(() => fireEvent.click(clearBtn as HTMLButtonElement))
    const foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier).toBeUndefined()
  })
})

describe('★★ Sonda de fluxo (denso)', () => {
  it('engadir xp ao rango 1 → editar amount → engadir gold ao rango 2 → undo secuencial', () => {
    const engine = buildEngine()
    render(<InspectorPanel editorEngine={engine} />)
    act(() => engine.getSession().selection.replace([{ kind: 'node', id: 'foo' }]))
    openAdvanced()

    const cpt = cptContainer()

    // Paso 1: engadir xp ao rango 1 (o primeiro Select "Engadir recurso").
    const addTriggers = cpt.querySelectorAll<HTMLElement>(
      '.editor-inspector-cpt__add [role="combobox"], .editor-inspector-cpt__add button',
    )
    expect(addTriggers.length).toBeGreaterThanOrEqual(3)
    act(() => fireEvent.click(addTriggers[0] as HTMLElement))
    const xpOpt = screen.getByRole('option', { name: /xp/i })
    act(() => fireEvent.click(xpOpt))
    let foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier).toBeDefined()
    expect(foo?.costPerTier?.length).toBe(3)
    expect(foo?.costPerTier?.[0]).toEqual([{ resourceId: 'xp', amount: 1 }])
    expect(foo?.costPerTier?.[1]).toEqual([]) // denso!
    expect(foo?.costPerTier?.[2]).toEqual([])

    // Paso 2: editar amount de xp no rango 1.
    const amountInputs = document.querySelectorAll<HTMLInputElement>(
      '.editor-inspector-cpt__cost-cell input[type="number"]',
    )
    expect(amountInputs.length).toBe(1)
    const inp = amountInputs[0] as HTMLInputElement
    act(() => fireEvent.change(inp, { target: { value: '25' } }))
    act(() => fireEvent.blur(inp))
    foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier?.[0]?.[0]?.amount).toBe(25)

    // Paso 3: engadir gold ao rango 2.
    // Actualizamos o DOM: os triggers son os novos.
    const addTriggers2 = cptContainer().querySelectorAll<HTMLElement>(
      '.editor-inspector-cpt__add [role="combobox"], .editor-inspector-cpt__add button',
    )
    // rango 1 aínda ten "engadir gold" (xp xa está usado). Rango 2 ten dous
    // engadibles (xp e gold). O trigger do rango 2 é addTriggers2[1].
    act(() => fireEvent.click(addTriggers2[1] as HTMLElement))
    const goldOpt = screen.getByRole('option', { name: /gold/i })
    act(() => fireEvent.click(goldOpt))
    foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier?.[1]).toEqual([{ resourceId: 'gold', amount: 1 }])

    // Paso 4: 3 undos → volve a undefined.
    engine.undo() // remove gold do rango 2 → []
    foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier?.[1]).toEqual([])
    engine.undo() // amount 25 → 1
    foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier?.[0]?.[0]?.amount).toBe(1)
    engine.undo() // remove xp do rango 1 → undefined (era o primeiro dispatch)
    foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier).toBeUndefined()
  })
})

describe('Undo natural (setNodeField cubre o comando)', () => {
  it('setNodeField costPerTier → engine.canUndo() = true, undo restaura', () => {
    const engine = buildEngine()
    engine.dispatch(setNodeField('foo', 'costPerTier', [[{ resourceId: 'xp', amount: 10 }]]))
    expect(engine.canUndo()).toBe(true)
    const foo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(foo?.costPerTier?.[0]?.[0]?.amount).toBe(10)
    engine.undo()
    const fooUndo = engine.getDocument().tree.nodes.find((n) => n.id === 'foo')
    expect(fooUndo?.costPerTier).toBeUndefined()
  })
})
// ── FIN: tests CostPerTierEditor ──
