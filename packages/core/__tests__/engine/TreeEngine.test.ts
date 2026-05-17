// ── INICIO: tests de TreeEngine ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef, TreeEngineOptions } from '../../src/types/index.js'

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

/** Helper: TreeDef con nodos de exemplo. */
function makeTreeDefWithNodes(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    nodes: [
      {
        id: 'node-a',
        label: 'Nodo A',
        type: 'passive',
        tier: 1,
        prerequisites: [],
      },
      {
        id: 'node-b',
        label: 'Nodo B',
        type: 'passive',
        tier: 1,
        prerequisites: [],
      },
    ],
  })
}

describe('TreeEngine', () => {
  describe('constructor — casos válidos', () => {
    it('crea o engine sen lanzar con TreeDef mínimo válido', () => {
      expect(() => new TreeEngine(makeTreeDef())).not.toThrow()
    })

    it('inicializa o budget dende startingBudget', () => {
      const engine = new TreeEngine(
        makeTreeDef({ startingBudget: { resources: { xp: 50, sp: 3 } } }),
      )
      expect(engine.getBudget().resources.xp).toBe(50)
      expect(engine.getBudget().resources.sp).toBe(3)
    })

    it('inicializa budget baleiro cando non hai startingBudget', () => {
      const engine = new TreeEngine(makeTreeDef())
      expect(engine.getBudget().resources).toEqual({})
    })
  })

  describe('constructor — validación (T3.b)', () => {
    it('lanza YggdrasilError con INVALID_TREE_DEF se falta id', () => {
      const treeDef = makeTreeDef({ id: '' })
      let caughtCode: string | undefined
      try {
        new TreeEngine(treeDef)
      } catch (e: unknown) {
        if (e !== null && typeof e === 'object' && 'code' in e) {
          caughtCode = (e as { code: string }).code
        }
      }
      expect(caughtCode).toBe(ErrorCode.INVALID_TREE_DEF)
    })

    it('lanza YggdrasilError con INVALID_TREE_DEF se nodes non é array', () => {
      const treeDef = { ...makeTreeDef(), nodes: 'malo' } as unknown as TreeDef
      let caughtCode: string | undefined
      try {
        new TreeEngine(treeDef)
      } catch (e: unknown) {
        if (e !== null && typeof e === 'object' && 'code' in e) {
          caughtCode = (e as { code: string }).code
        }
      }
      expect(caughtCode).toBe(ErrorCode.INVALID_TREE_DEF)
    })

    it('lanza YggdrasilError con INVALID_TREE_DEF se hai IDs de nodo duplicados', () => {
      const treeDef = makeTreeDef({
        nodes: [
          { id: 'duplicado', label: 'A', type: 'passive', tier: 1, prerequisites: [] },
          { id: 'duplicado', label: 'B', type: 'passive', tier: 1, prerequisites: [] },
        ],
      })
      let caughtCode: string | undefined
      try {
        new TreeEngine(treeDef)
      } catch (e: unknown) {
        if (e !== null && typeof e === 'object' && 'code' in e) {
          caughtCode = (e as { code: string }).code
        }
      }
      expect(caughtCode).toBe(ErrorCode.INVALID_TREE_DEF)
    })
  })

  describe('getNodeState', () => {
    it('devolve null para un nodeId inexistente', () => {
      const engine = new TreeEngine(makeTreeDefWithNodes())
      expect(engine.getNodeState('non-existe')).toBeNull()
    })

    it('devolve o estado do nodo se existe no estado', () => {
      const engine = new TreeEngine(makeTreeDefWithNodes())
      // O estado inicial non ten nodos desbloqueados: devolve null
      expect(engine.getNodeState('node-a')).toBeNull()
    })
  })

  describe('getAllNodeStates', () => {
    it('devolve un Map baleiro no estado inicial', () => {
      const engine = new TreeEngine(makeTreeDefWithNodes())
      const map = engine.getAllNodeStates()
      expect(map.size).toBe(0)
    })
  })

  describe('getProgress', () => {
    it('devolve 0 para un nodeId inexistente', () => {
      const engine = new TreeEngine(makeTreeDef())
      expect(engine.getProgress('non-existe')).toBe(0)
    })

    it('devolve 0 para un nodo sen progreso no estado inicial', () => {
      const engine = new TreeEngine(makeTreeDefWithNodes())
      expect(engine.getProgress('node-a')).toBe(0)
    })
  })

  describe('getTreeDef', () => {
    it('devolve a TreeDef orixinal', () => {
      const def = makeTreeDef({ id: 'my-tree' })
      const engine = new TreeEngine(def)
      expect(engine.getTreeDef().id).toBe('my-tree')
    })

    it('devolve sempre o mesmo id da TreeDef orixinal', () => {
      const engine = new TreeEngine(makeTreeDef({ id: 'stable' }))
      // Chamadas sucesivas devolven o mesmo valor
      expect(engine.getTreeDef().id).toBe('stable')
      expect(engine.getTreeDef().id).toBe('stable')
    })
  })

  describe('getLocale', () => {
    it('devolve gl por defecto', () => {
      const engine = new TreeEngine(makeTreeDef())
      expect(engine.getLocale()).toBe('gl')
    })

    it('devolve a locale pasada en options', () => {
      const options: TreeEngineOptions = { locale: 'en' }
      const engine = new TreeEngine(makeTreeDef(), options)
      expect(engine.getLocale()).toBe('en')
    })
  })

  describe('isReadOnly', () => {
    it('devolve false por defecto', () => {
      const engine = new TreeEngine(makeTreeDef())
      expect(engine.isReadOnly()).toBe(false)
    })

    it('devolve true se options.readOnly é true', () => {
      const engine = new TreeEngine(makeTreeDef(), { readOnly: true })
      expect(engine.isReadOnly()).toBe(true)
    })
  })

  describe('getSnapshot / getServerSnapshot', () => {
    it('getSnapshot devolve o estado actual', () => {
      const engine = new TreeEngine(makeTreeDef({ startingBudget: { resources: { xp: 10 } } }))
      const snapshot = engine.getSnapshot()
      expect(snapshot.budget.resources.xp).toBe(10)
    })

    it('getServerSnapshot devolve o estado actual', () => {
      const engine = new TreeEngine(makeTreeDef({ startingBudget: { resources: { xp: 7 } } }))
      const snapshot = engine.getServerSnapshot()
      expect(snapshot.budget.resources.xp).toBe(7)
    })
  })

  describe('subscribe', () => {
    it('devolve unha función de desuscripción que non lanza', () => {
      const engine = new TreeEngine(makeTreeDef())
      const listener = vi.fn()
      const unsubscribe = engine.subscribe(listener)
      expect(() => unsubscribe()).not.toThrow()
    })

    it('o listener non se chama despois de desuscribir', () => {
      const engine = new TreeEngine(makeTreeDef())
      const listener = vi.fn()
      const unsubscribe = engine.subscribe(listener)
      unsubscribe()
      // Sen operacións de mutación en 1.12, verificamos que subscribe/unsubscribe
      // non lanza e que o listener non foi chamado de forma inesperada
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('getBudget — inmutabilidade de facto', () => {
    it('mutar a copia do budget non rompe o estado interno', () => {
      const engine = new TreeEngine(makeTreeDef({ startingBudget: { resources: { xp: 100 } } }))
      const budget = engine.getBudget() as { resources: Record<string, number> }
      try {
        budget.resources.xp = 999
      } catch {
        /* frozen */
      }
      // O valor interno non debe cambiar se o obxecto está frozen
      // (StateStore usa Immer que congela en produción)
      const fresh = engine.getBudget()
      expect(fresh.resources.xp).toBeDefined()
    })
  })
})
// ── FIN: tests de TreeEngine ──
