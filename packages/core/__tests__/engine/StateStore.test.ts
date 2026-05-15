// ── INICIO: tests de StateStore ──
import { describe, expect, it, vi } from 'vitest'
import { ALL_CACHE_TYPES, StateStore } from '../../src/engine/index.js'
import type { TreeDef, TreeState } from '../../src/types/index.js'

/** Helper: TreeDef mínimo válido. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

describe('StateStore', () => {
  describe('initialization', () => {
    it('creates an empty state when no initial state provided', () => {
      const store = new StateStore(makeTreeDef())
      const state = store.getState()
      expect(state.nodes).toEqual({})
      expect(state.budget.resources).toEqual({})
      expect(state.computedStats).toEqual({})
    })

    it('initializes budget from treeDef.startingBudget', () => {
      const tree = makeTreeDef({
        startingBudget: { resources: { xp: 100, sp: 5 } },
      })
      const store = new StateStore(tree)
      expect(store.getState().budget.resources.xp).toBe(100)
      expect(store.getState().budget.resources.sp).toBe(5)
    })

    it('accepts custom initialState', () => {
      const initialState: TreeState = {
        nodes: { forno: { id: 'forno', state: 'unlocked', currentTier: 1 } },
        budget: { resources: { xp: 999 } },
      }
      const store = new StateStore(makeTreeDef(), { initialState })
      expect(store.getState()).toBe(initialState)
    })

    it('exposes the treeDef', () => {
      const tree = makeTreeDef({ id: 'my-tree' })
      const store = new StateStore(tree)
      expect(store.getTreeDef().id).toBe('my-tree')
    })
  })

  describe('update', () => {
    it('applies producer changes via Immer', () => {
      const store = new StateStore(makeTreeDef())
      store.update((draft) => {
        draft.budget.resources.xp = 50
      })
      expect(store.getState().budget.resources.xp).toBe(50)
    })

    it('produces a new state object (immutability)', () => {
      const store = new StateStore(makeTreeDef())
      const before = store.getState()
      store.update((draft) => {
        draft.budget.resources.xp = 10
      })
      expect(store.getState()).not.toBe(before)
    })

    it('skips notification when producer makes no changes', () => {
      const store = new StateStore(makeTreeDef())
      const before = store.getState()
      const listener = vi.fn()
      store.subscribe(listener)
      store.update(() => {
        // sen cambios
      })
      expect(store.getState()).toBe(before)
      expect(listener).not.toHaveBeenCalled()
    })

    it('notifies subscribers after a real change', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.update((draft) => {
        draft.budget.resources.xp = 10
      })
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('applyTreeDefChange', () => {
    it('mutates the treeDef via Immer', () => {
      const store = new StateStore(makeTreeDef({ version: '1.0.0' }))
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      expect(store.getTreeDef().version).toBe('2.0.0')
    })

    it('invalidates all caches', () => {
      const store = new StateStore(makeTreeDef())
      for (const type of ALL_CACHE_TYPES) {
        store.setCache(type, { foo: 'bar' }, store.getCacheVersion(type))
      }
      // Todas as caches están dispoñibles
      for (const type of ALL_CACHE_TYPES) {
        expect(store.getCache(type)).toEqual({ foo: 'bar' })
      }
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      // Tras mutar treeDef, todas as caches están stale
      for (const type of ALL_CACHE_TYPES) {
        expect(store.getCache(type)).toBeNull()
      }
    })

    it('notifies subscribers', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('skips notification when producer makes no changes', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.applyTreeDefChange(() => {
        // sen cambios
      })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('replaceTreeDef / replaceTreeState', () => {
    it('replaceTreeDef substitutes the def and invalidates caches', () => {
      const store = new StateStore(makeTreeDef({ id: 'a' }))
      store.setCache('layout', 'cached', store.getCacheVersion('layout'))
      const newDef = makeTreeDef({ id: 'b' })
      store.replaceTreeDef(newDef)
      expect(store.getTreeDef().id).toBe('b')
      expect(store.getCache('layout')).toBeNull()
    })

    it('replaceTreeDef notifies subscribers', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.replaceTreeDef(makeTreeDef({ id: 'other' }))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('replaceTreeState substitutes the state and notifies', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      const newState: TreeState = {
        nodes: {},
        budget: { resources: { xp: 500 } },
      }
      store.replaceTreeState(newState)
      expect(store.getState()).toBe(newState)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('replaceTreeState does NOT invalidate caches by default', () => {
      const store = new StateStore(makeTreeDef())
      const version = store.getCacheVersion('layout')
      store.setCache('layout', 'cached', version)
      store.replaceTreeState({ nodes: {}, budget: { resources: {} } })
      expect(store.getCache('layout')).toBe('cached')
    })
  })

  describe('cache versioning', () => {
    it('initial cache versions are 0', () => {
      const store = new StateStore(makeTreeDef())
      for (const type of ALL_CACHE_TYPES) {
        expect(store.getCacheVersion(type)).toBe(0)
      }
    })

    it('invalidate increments versions of the specified types only', () => {
      const store = new StateStore(makeTreeDef())
      store.invalidate(['layout', 'search'])
      expect(store.getCacheVersion('layout')).toBe(1)
      expect(store.getCacheVersion('search')).toBe(1)
      expect(store.getCacheVersion('dependency')).toBe(0)
      expect(store.getCacheVersion('stats')).toBe(0)
    })

    it('setCache + getCache round-trip works while version matches', () => {
      const store = new StateStore(makeTreeDef())
      const version = store.getCacheVersion('layout')
      store.setCache('layout', { computed: true }, version)
      expect(store.getCache('layout')).toEqual({ computed: true })
    })

    it('getCache returns null when version mismatch', () => {
      const store = new StateStore(makeTreeDef())
      const oldVersion = store.getCacheVersion('layout')
      store.setCache('layout', { computed: true }, oldVersion)
      store.invalidate(['layout'])
      expect(store.getCache('layout')).toBeNull()
    })

    it('getCache returns null when never set', () => {
      const store = new StateStore(makeTreeDef())
      expect(store.getCache('layout')).toBeNull()
    })

    it('multiple invalidations bump version each time', () => {
      const store = new StateStore(makeTreeDef())
      store.invalidate(['stats'])
      store.invalidate(['stats'])
      store.invalidate(['stats'])
      expect(store.getCacheVersion('stats')).toBe(3)
    })
  })

  describe('subscriptions', () => {
    it('subscribe returns a working unsubscribe', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      const unsub = store.subscribe(listener)
      unsub()
      store.update((draft) => {
        draft.budget.resources.xp = 1
      })
      expect(listener).not.toHaveBeenCalled()
    })

    it('multiple listeners are all notified', () => {
      const store = new StateStore(makeTreeDef())
      const a = vi.fn()
      const b = vi.fn()
      const c = vi.fn()
      store.subscribe(a)
      store.subscribe(b)
      store.subscribe(c)
      store.update((draft) => {
        draft.budget.resources.xp = 1
      })
      expect(a).toHaveBeenCalled()
      expect(b).toHaveBeenCalled()
      expect(c).toHaveBeenCalled()
    })

    it('listener error does not break notification chain', () => {
      const store = new StateStore(makeTreeDef())
      const survivor = vi.fn()
      store.subscribe(() => {
        throw new Error('listener boom')
      })
      store.subscribe(survivor)
      store.update((draft) => {
        draft.budget.resources.xp = 1
      })
      expect(survivor).toHaveBeenCalled()
    })

    it('listenerCount reflects active subscriptions', () => {
      const store = new StateStore(makeTreeDef())
      expect(store.listenerCount()).toBe(0)
      const u1 = store.subscribe(vi.fn())
      const u2 = store.subscribe(vi.fn())
      expect(store.listenerCount()).toBe(2)
      u1()
      expect(store.listenerCount()).toBe(1)
      u2()
      expect(store.listenerCount()).toBe(0)
    })

    it('listener that unsubscribes during notify does not break iteration', () => {
      const store = new StateStore(makeTreeDef())
      const calls: string[] = []
      const u1 = store.subscribe(() => {
        calls.push('a')
        u1()
      })
      store.subscribe(() => {
        calls.push('b')
      })
      store.update((draft) => {
        draft.budget.resources.xp = 1
      })
      expect(calls).toEqual(['a', 'b'])
      // Tras unsubscribe en runtime, segunda emisión non chama 'a'
      store.update((draft) => {
        draft.budget.resources.xp = 2
      })
      expect(calls).toEqual(['a', 'b', 'b'])
    })
  })

  describe('snapshots', () => {
    it('getSnapshot returns the same reference until state changes', () => {
      const store = new StateStore(makeTreeDef())
      const a = store.getSnapshot()
      const b = store.getSnapshot()
      expect(a).toBe(b)
    })

    it('getSnapshot returns a new reference after update', () => {
      const store = new StateStore(makeTreeDef())
      const before = store.getSnapshot()
      store.update((draft) => {
        draft.budget.resources.xp = 1
      })
      expect(store.getSnapshot()).not.toBe(before)
    })

    it('getServerSnapshot mirrors getSnapshot currently', () => {
      const store = new StateStore(makeTreeDef())
      expect(store.getServerSnapshot()).toBe(store.getSnapshot())
    })
  })

  describe('immutability guarantees', () => {
    it('returned state is frozen by Immer (cannot mutate)', () => {
      const store = new StateStore(makeTreeDef())
      store.update((draft) => {
        draft.budget.resources.xp = 10
      })
      const state = store.getState()
      expect(() => {
        state.budget.resources.xp = 999
      }).toThrow()
    })

    it('returned treeDef is frozen after mutation', () => {
      const store = new StateStore(makeTreeDef({ version: '1.0.0' }))
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      const def = store.getTreeDef()
      expect(() => {
        ;(def as { version: string }).version = '3.0.0'
      }).toThrow()
    })
  })
})
// ── FIN: tests de StateStore ──
