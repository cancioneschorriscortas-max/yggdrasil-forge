// ── INICIO: tests de EventEmitter ──
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from '../../src/engine/index.js'
import type { NodeInstance } from '../../src/types/index.js'

/** Helper: crea un NodeInstance mínimo para tests. */
function makeInstance(id: string): NodeInstance {
  return { id, state: 'unlocked', currentTier: 1 }
}

describe('EventEmitter', () => {
  describe('on / emit', () => {
    it('calls registered handler on emit', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('unlock', handler)
      const instance = makeInstance('forno')
      emitter.emit('unlock', 'forno', instance)
      expect(handler).toHaveBeenCalledWith('forno', instance)
    })

    it('calls multiple handlers in registration order', () => {
      const emitter = new EventEmitter()
      const calls: number[] = []
      emitter.on('unlock', () => calls.push(1))
      emitter.on('unlock', () => calls.push(2))
      emitter.on('unlock', () => calls.push(3))
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(calls).toEqual([1, 2, 3])
    })

    it('does nothing when emitting an event with no handlers', () => {
      const emitter = new EventEmitter()
      expect(() => emitter.emit('unlock', 'x', makeInstance('x'))).not.toThrow()
    })
  })

  describe('unsubscribe', () => {
    it('on returns a working unsubscribe function', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      const unsub = emitter.on('unlock', handler)
      unsub()
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('off removes a specific handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('unlock', handler)
      emitter.off('unlock', handler)
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(handler).not.toHaveBeenCalled()
    })

    it('off only removes the targeted handler', () => {
      const emitter = new EventEmitter()
      const keep = vi.fn()
      const remove = vi.fn()
      emitter.on('unlock', keep)
      emitter.on('unlock', remove)
      emitter.off('unlock', remove)
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(keep).toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
    })
  })

  describe('once', () => {
    it('handler fires only once', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.once('unlock', handler)
      emitter.emit('unlock', 'a', makeInstance('a'))
      emitter.emit('unlock', 'b', makeInstance('b'))
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('a', makeInstance('a'))
    })

    it('once unsubscribe cancels before firing', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      const unsub = emitter.once('unlock', handler)
      unsub()
      emitter.emit('unlock', 'a', makeInstance('a'))
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('a throwing handler does not stop other handlers', () => {
      const emitter = new EventEmitter()
      const after = vi.fn()
      emitter.on('unlock', () => {
        throw new Error('handler boom')
      })
      emitter.on('unlock', after)
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(after).toHaveBeenCalled()
    })

    it('error handler receives the thrown error', () => {
      const emitter = new EventEmitter()
      const errorHandler = vi.fn()
      emitter.setErrorHandler(errorHandler)
      const boom = new Error('handler boom')
      emitter.on('unlock', () => {
        throw boom
      })
      emitter.emit('unlock', 'x', makeInstance('x'))
      expect(errorHandler).toHaveBeenCalledWith(boom, 'unlock')
    })
  })

  describe('listenerCount / removeAllListeners', () => {
    it('listenerCount returns the number of handlers', () => {
      const emitter = new EventEmitter()
      expect(emitter.listenerCount('unlock')).toBe(0)
      emitter.on('unlock', vi.fn())
      emitter.on('unlock', vi.fn())
      expect(emitter.listenerCount('unlock')).toBe(2)
    })

    it('removeAllListeners(event) clears one event', () => {
      const emitter = new EventEmitter()
      emitter.on('unlock', vi.fn())
      emitter.on('lock', vi.fn())
      emitter.removeAllListeners('unlock')
      expect(emitter.listenerCount('unlock')).toBe(0)
      expect(emitter.listenerCount('lock')).toBe(1)
    })

    it('removeAllListeners() clears everything', () => {
      const emitter = new EventEmitter()
      emitter.on('unlock', vi.fn())
      emitter.on('lock', vi.fn())
      emitter.removeAllListeners()
      expect(emitter.listenerCount('unlock')).toBe(0)
      expect(emitter.listenerCount('lock')).toBe(0)
    })
  })

  describe('mutation during emit', () => {
    it('handler that unsubscribes during emit does not break iteration', () => {
      const emitter = new EventEmitter()
      const calls: string[] = []
      const unsubSelf = emitter.on('unlock', () => {
        calls.push('first')
        unsubSelf()
      })
      emitter.on('unlock', () => {
        calls.push('second')
      })
      emitter.emit('unlock', 'x', makeInstance('x'))
      emitter.emit('unlock', 'x', makeInstance('x'))
      // Primeira emisión: first + second. Segunda: só second.
      expect(calls).toEqual(['first', 'second', 'second'])
    })

    it('off() sobre evento sen handlers: non lanza', () => {
      const emitter = new EventEmitter()
      // Cobre rama `handlers === undefined`. Cero handlers rexistrados.
      expect(() => emitter.off('unlock', () => undefined)).not.toThrow()
    })

    it('off() cun handler que non foi rexistrado: non lanza', () => {
      const emitter = new EventEmitter()
      const registered = (): void => undefined
      const notRegistered = (): void => undefined
      emitter.on('unlock', registered)
      // Cobre rama `index === -1` (handler non rexistrado).
      expect(() => emitter.off('unlock', notRegistered)).not.toThrow()
    })
  })
})
// ── FIN: tests de EventEmitter ──
