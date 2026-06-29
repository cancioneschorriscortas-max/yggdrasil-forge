// ── INICIO: tests Selection ──
import { describe, expect, it, vi } from 'vitest'
import { type SelectionRef, createSelectionEngine } from '../src/selection/Selection.js'

const nodeA: SelectionRef = { kind: 'node', id: 'a' }
const nodeB: SelectionRef = { kind: 'node', id: 'b' }
const edgeX: SelectionRef = { kind: 'edge', id: 'x' }
const groupG: SelectionRef = { kind: 'group', id: 'g' }
const regionR: SelectionRef = { kind: 'region', id: 'r' }

describe('SelectionEngine — operacións básicas', () => {
  it('replace: substitúe a selección actual', () => {
    const sel = createSelectionEngine()
    sel.replace([nodeA, nodeB])
    expect(sel.current().length).toBe(2)
    sel.replace([nodeA])
    expect(sel.current().length).toBe(1)
    expect(sel.isSelected(nodeA)).toBe(true)
    expect(sel.isSelected(nodeB)).toBe(false)
  })

  it('add: idempotente; toggle: alterna; remove: limpa', () => {
    const sel = createSelectionEngine()
    sel.add(nodeA)
    sel.add(nodeA)
    expect(sel.current().length).toBe(1)
    sel.toggle(nodeB)
    expect(sel.current().length).toBe(2)
    sel.toggle(nodeB)
    expect(sel.current().length).toBe(1)
    sel.remove(nodeA)
    expect(sel.current().length).toBe(0)
  })

  it('clear: deixa baleiro', () => {
    const sel = createSelectionEngine()
    sel.replace([nodeA, nodeB])
    sel.clear()
    expect(sel.current().length).toBe(0)
  })

  it('os 4 kinds coexisten (node/edge/group/region)', () => {
    const sel = createSelectionEngine()
    sel.replace([nodeA, edgeX, groupG, regionR])
    expect(sel.current().length).toBe(4)
    expect(sel.isSelected(edgeX)).toBe(true)
    expect(sel.isSelected(groupG)).toBe(true)
    expect(sel.isSelected(regionR)).toBe(true)
  })
})

describe('SelectionEngine — subscribe', () => {
  it('replace dispara notify', () => {
    const sel = createSelectionEngine()
    const listener = vi.fn()
    sel.subscribe(listener)
    sel.replace([nodeA])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('add idempotente non dispara dúas veces', () => {
    const sel = createSelectionEngine()
    const listener = vi.fn()
    sel.subscribe(listener)
    sel.add(nodeA)
    sel.add(nodeA) // duplicado: no-op
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe quita o listener', () => {
    const sel = createSelectionEngine()
    const listener = vi.fn()
    const unsub = sel.subscribe(listener)
    sel.add(nodeA)
    unsub()
    sel.add(nodeB)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
// ── FIN: tests Selection ──
