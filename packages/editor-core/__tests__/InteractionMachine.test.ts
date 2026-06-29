// ── INICIO: tests InteractionMachine ──
import { describe, expect, it, vi } from 'vitest'
import { createInteractionMachine } from '../src/interaction/InteractionMachine.js'

describe('InteractionMachine — transicións válidas', () => {
  it('idle → dragging: válido', () => {
    const fsm = createInteractionMachine()
    expect(fsm.is('idle')).toBe(true)
    expect(fsm.to({ kind: 'dragging' })).toBe(true)
    expect(fsm.is('dragging')).toBe(true)
  })

  it('idle → marquee: válido', () => {
    const fsm = createInteractionMachine()
    expect(fsm.to({ kind: 'marquee', rect: { x: 0, y: 0, width: 0, height: 0 } })).toBe(true)
    expect(fsm.is('marquee')).toBe(true)
  })

  it('idle → editing: válido', () => {
    const fsm = createInteractionMachine()
    expect(fsm.to({ kind: 'editing', target: { kind: 'node', id: 'a' } })).toBe(true)
    expect(fsm.is('editing')).toBe(true)
  })

  it('idle → creatingEdge: válido', () => {
    const fsm = createInteractionMachine()
    expect(fsm.to({ kind: 'creatingEdge', from: 'a' })).toBe(true)
    expect(fsm.is('creatingEdge')).toBe(true)
  })
})

describe('InteractionMachine — transicións inválidas (exclusividade)', () => {
  it('dragging → editing: rexeitado', () => {
    const fsm = createInteractionMachine()
    fsm.to({ kind: 'dragging' })
    expect(fsm.to({ kind: 'editing', target: { kind: 'node', id: 'a' } })).toBe(false)
    expect(fsm.is('dragging')).toBe(true)
  })

  it('editing → dragging: rexeitado', () => {
    const fsm = createInteractionMachine()
    fsm.to({ kind: 'editing', target: { kind: 'node', id: 'a' } })
    expect(fsm.to({ kind: 'dragging' })).toBe(false)
    expect(fsm.is('editing')).toBe(true)
  })

  it('dragging → marquee: rexeitado', () => {
    const fsm = createInteractionMachine()
    fsm.to({ kind: 'dragging' })
    expect(fsm.to({ kind: 'marquee', rect: { x: 0, y: 0, width: 0, height: 0 } })).toBe(false)
  })
})

describe('InteractionMachine — excepcións especiais', () => {
  it('marquee → marquee: válido (refresh do rect)', () => {
    const fsm = createInteractionMachine()
    fsm.to({ kind: 'marquee', rect: { x: 0, y: 0, width: 0, height: 0 } })
    expect(fsm.to({ kind: 'marquee', rect: { x: 10, y: 10, width: 100, height: 100 } })).toBe(true)
    const state = fsm.state()
    if (state.kind === 'marquee') {
      expect(state.rect.width).toBe(100)
    }
  })

  it('calquera estado → idle: sempre válido (reset)', () => {
    const fsm = createInteractionMachine()
    fsm.to({ kind: 'dragging' })
    expect(fsm.to({ kind: 'idle' })).toBe(true)
    expect(fsm.is('idle')).toBe(true)
  })

  it('reset() desde calquera estado vai a idle', () => {
    const fsm = createInteractionMachine()
    fsm.to({ kind: 'editing', target: { kind: 'node', id: 'a' } })
    fsm.reset()
    expect(fsm.is('idle')).toBe(true)
  })
})

describe('InteractionMachine — subscribe', () => {
  it('notifica en cada transición que efectivamente cambia o estado', () => {
    const fsm = createInteractionMachine()
    const listener = vi.fn()
    fsm.subscribe(listener)
    fsm.to({ kind: 'dragging' })
    fsm.reset()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reset() en idle non dispara notify', () => {
    const fsm = createInteractionMachine()
    const listener = vi.fn()
    fsm.subscribe(listener)
    fsm.reset() // xa estaba en idle
    expect(listener).not.toHaveBeenCalled()
  })
})
// ── FIN: tests InteractionMachine ──
