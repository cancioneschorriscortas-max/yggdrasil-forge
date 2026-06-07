import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import {
  SubtreeManager,
  type SubtreeManagerOptions,
  type TreeEngineFactory,
} from '../../src/engine/SubtreeManager.js'
import { TreeEngine } from '../../src/engine/TreeEngine.js'
import type { TreeDef, TreeState } from '../../src/types/tree.js'

// ── Helpers ──

/** TreeDef mínimo válido para usar como sub-tree template. */
function makeSubTreeDef(id: string, overrides?: Partial<TreeDef>): TreeDef {
  return {
    id,
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: `Subtree ${id}`,
    nodes: [{ id: 'sn1', type: 'skill', label: 'Sub Nodo 1' }],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/** TreeDef parent con subtrees configuradas. */
function makeParentTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'parent-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Parent Tree',
    nodes: [
      {
        id: 'anchor-a',
        type: 'subtree_anchor',
        label: 'Anchor A',
        subtreeId: 'sub-a',
      },
      {
        id: 'anchor-b',
        type: 'subtree_anchor',
        label: 'Anchor B',
        subtreeId: 'sub-b',
      },
    ],
    edges: [],
    layout: { type: 'radial' },
    subtrees: {
      'sub-a': makeSubTreeDef('sub-a'),
      'sub-b': makeSubTreeDef('sub-b'),
    },
    ...overrides,
  }
}

/** Estado parent mínimo. */
function makeParentState(overrides?: Partial<TreeState>): TreeState {
  return {
    nodeInstances: {},
    ...overrides,
  }
}

/** Factory real que crea TreeEngine envolta en vi.fn() para espiar. */
function makeSpyFactory(): TreeEngineFactory & ReturnType<typeof vi.fn> {
  return vi.fn((treeDef: TreeDef, _initialState?: TreeState) => {
    return new TreeEngine(treeDef)
  })
}

/** Opcións base para construír SubtreeManager en tests. */
function makeOptions(overrides?: Partial<SubtreeManagerOptions>): SubtreeManagerOptions {
  return {
    parentTreeDef: makeParentTreeDef(),
    parentState: makeParentState(),
    engineFactory: makeSpyFactory(),
    ...overrides,
  }
}

// ── Tests ──

describe('SubtreeManager', () => {
  // ── Construción ──

  describe('construción', () => {
    it('constrúe con opcións mínimas: cero error, size === 0', () => {
      const mgr = new SubtreeManager(makeOptions())
      expect(mgr.size()).toBe(0)
    })

    it('constrúe con defaults: size 0, listSubtrees vacío', () => {
      const mgr = new SubtreeManager(makeOptions())
      expect(mgr.size()).toBe(0)
      expect(mgr.listSubtrees()).toEqual([])
    })

    it('constrúe con depth custom: usa depth pasada', () => {
      // depth=5 non afecta á construción, pero depth+1=6 ≤ 10 (default maxDepth)
      const mgr = new SubtreeManager(makeOptions({ depth: 5 }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(true)
    })

    it('constrúe con maxDepth custom: usa maxDepth pasada', () => {
      const mgr = new SubtreeManager(makeOptions({ depth: 2, maxDepth: 3 }))
      // depth+1=3 ≤ maxDepth=3 → pasa
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(true)
    })
  })

  // ── getExistingSubtree ──

  describe('getExistingSubtree', () => {
    it('subtreeId non creado: devolve null', () => {
      const mgr = new SubtreeManager(makeOptions())
      expect(mgr.getExistingSubtree('sub-a')).toBeNull()
    })

    it('subtreeId creado: devolve TreeEngine', () => {
      const mgr = new SubtreeManager(makeOptions())
      mgr.getOrCreateSubtree('sub-a')
      const engine = mgr.getExistingSubtree('sub-a')
      expect(engine).not.toBeNull()
      expect(engine).toBeInstanceOf(TreeEngine)
    })

    it('distintos IDs: devolven distintas instances', () => {
      const mgr = new SubtreeManager(makeOptions())
      mgr.getOrCreateSubtree('sub-a')
      mgr.getOrCreateSubtree('sub-b')
      const engineA = mgr.getExistingSubtree('sub-a')
      const engineB = mgr.getExistingSubtree('sub-b')
      expect(engineA).not.toBeNull()
      expect(engineB).not.toBeNull()
      expect(engineA).not.toBe(engineB)
    })
  })

  // ── hasSubtree ──

  describe('hasSubtree', () => {
    it('subtree non creado: false', () => {
      const mgr = new SubtreeManager(makeOptions())
      expect(mgr.hasSubtree('sub-a')).toBe(false)
    })

    it('subtree creado: true', () => {
      const mgr = new SubtreeManager(makeOptions())
      mgr.getOrCreateSubtree('sub-a')
      expect(mgr.hasSubtree('sub-a')).toBe(true)
    })
  })

  // ── getOrCreateSubtree — cache ──

  describe('getOrCreateSubtree — cache', () => {
    it('primeira chamada: crea + cachea', () => {
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ engineFactory: factory }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(true)
      expect(factory).toHaveBeenCalledTimes(1)
      expect(mgr.size()).toBe(1)
    })

    it('segunda chamada co mesmo ID: devolve cached (mesma instance)', () => {
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ engineFactory: factory }))
      const r1 = mgr.getOrCreateSubtree('sub-a')
      const r2 = mgr.getOrCreateSubtree('sub-a')
      expect(r1.ok).toBe(true)
      expect(r2.ok).toBe(true)
      if (r1.ok && r2.ok) {
        expect(r1.value).toBe(r2.value)
      }
      // Factory chamada só unha vez
      expect(factory).toHaveBeenCalledTimes(1)
    })
  })

  // ── getOrCreateSubtree — cycle ──

  describe('getOrCreateSubtree — cycle', () => {
    it('activeSubtreeIds contén ese ID: err(SUBTREE_CYCLE_DETECTED)', () => {
      const mgr = new SubtreeManager(makeOptions({ activeSubtreeIds: new Set(['sub-a']) }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SUBTREE_CYCLE_DETECTED)
      }
    })

    it('cycleDetected mensaxe contén o subtreeId', () => {
      const mgr = new SubtreeManager(makeOptions({ activeSubtreeIds: new Set(['sub-a']) }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('sub-a')
      }
    })

    it('cycleDetected mensaxe contén a chain', () => {
      const mgr = new SubtreeManager(
        makeOptions({
          activeSubtreeIds: new Set(['root-sub', 'sub-a']),
        }),
      )
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('root-sub')
      }
    })
  })

  // ── getOrCreateSubtree — depth ──

  describe('getOrCreateSubtree — depth', () => {
    it('depth+1 > maxDepth: err(SUBTREE_DEPTH_EXCEEDED)', () => {
      const mgr = new SubtreeManager(makeOptions({ depth: 5, maxDepth: 5 }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SUBTREE_DEPTH_EXCEEDED)
      }
    })

    it('depth=9, maxDepth=10: getOrCreate pasa (10 ≤ 10)', () => {
      const mgr = new SubtreeManager(makeOptions({ depth: 9, maxDepth: 10 }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(true)
    })

    it('depth=10, maxDepth=10: getOrCreate falla (11 > 10)', () => {
      const mgr = new SubtreeManager(makeOptions({ depth: 10, maxDepth: 10 }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SUBTREE_DEPTH_EXCEEDED)
      }
    })

    it('maxDepth=0 (caso edge): primeira chamada falla', () => {
      const mgr = new SubtreeManager(makeOptions({ depth: 0, maxDepth: 0 }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SUBTREE_DEPTH_EXCEEDED)
      }
    })
  })

  // ── getOrCreateSubtree — existence ──

  describe('getOrCreateSubtree — existence', () => {
    it('parentTreeDef.subtrees indefinido: err(SUBTREE_NOT_FOUND)', () => {
      const parentTreeDef = makeParentTreeDef()
      // Crear versión sen subtrees
      const noSubtrees: TreeDef = {
        ...parentTreeDef,
        subtrees: undefined,
      }
      const mgr = new SubtreeManager(makeOptions({ parentTreeDef: noSubtrees }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SUBTREE_NOT_FOUND)
      }
    })

    it('parentTreeDef.subtrees existe pero non ten ese ID: err(SUBTREE_NOT_FOUND)', () => {
      const mgr = new SubtreeManager(makeOptions())
      const result = mgr.getOrCreateSubtree('non-existente')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SUBTREE_NOT_FOUND)
      }
    })
  })

  // ── getOrCreateSubtree — subtreeOverrides ──

  describe('getOrCreateSubtree — subtreeOverrides', () => {
    it('cero anchor con subtreeId: usa overrides vacíos', () => {
      // Parent con subtrees pero sen nodo anchor que referencie 'sub-orphan'
      const parentTreeDef = makeParentTreeDef({
        subtrees: {
          'sub-orphan': makeSubTreeDef('sub-orphan'),
        },
      })
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ parentTreeDef, engineFactory: factory }))
      const result = mgr.getOrCreateSubtree('sub-orphan')
      expect(result.ok).toBe(true)
      // Factory recibe o treeDef sen overrides aplicados (overrides vacíos)
      expect(factory).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub-orphan' }), undefined)
    })

    it('anchor existe sen overrides: usa overrides vacíos', () => {
      // anchor-a ten subtreeId='sub-a' pero sen subtreeOverrides
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ engineFactory: factory }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(true)
      expect(factory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sub-a', label: 'Subtree sub-a' }),
        undefined,
      )
    })

    it('anchor con subtreeOverrides: aplícanse via mergeTreeDefWithOverrides', () => {
      const parentTreeDef = makeParentTreeDef({
        nodes: [
          {
            id: 'anchor-a',
            type: 'subtree_anchor',
            label: 'Anchor A',
            subtreeId: 'sub-a',
            subtreeOverrides: { label: 'Customizado' },
          },
        ],
      })
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ parentTreeDef, engineFactory: factory }))
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(true)
      // Factory recibe treeDef co label customizado pero id preservado
      expect(factory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sub-a', label: 'Customizado' }),
        undefined,
      )
    })
  })

  // ── getOrCreateSubtree — initial state ──

  describe('getOrCreateSubtree — initial state', () => {
    it('parentState.subtreeStates[id] indefinido: factory recibe undefined', () => {
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ engineFactory: factory }))
      mgr.getOrCreateSubtree('sub-a')
      expect(factory).toHaveBeenCalledWith(expect.anything(), undefined)
    })

    it('parentState.subtreeStates[id] existe: factory recibe ese estado', () => {
      const subtreeState: TreeState = {
        nodeInstances: { sn1: { status: 'unlocked' } },
      }
      const parentState = makeParentState({
        subtreeStates: { 'sub-a': subtreeState },
      })
      const factory = makeSpyFactory()
      const mgr = new SubtreeManager(makeOptions({ parentState, engineFactory: factory }))
      mgr.getOrCreateSubtree('sub-a')
      expect(factory).toHaveBeenCalledWith(expect.anything(), subtreeState)
    })
  })

  // ── listSubtrees + destroySubtree + clear + size ──

  describe('listSubtrees + destroySubtree + clear + size', () => {
    it('listSubtrees baleiro: []', () => {
      const mgr = new SubtreeManager(makeOptions())
      expect(mgr.listSubtrees()).toEqual([])
    })

    it('listSubtrees tras 2 creates: contén ambos IDs', () => {
      const mgr = new SubtreeManager(makeOptions())
      mgr.getOrCreateSubtree('sub-a')
      mgr.getOrCreateSubtree('sub-b')
      const list = mgr.listSubtrees()
      expect(list).toContain('sub-a')
      expect(list).toContain('sub-b')
      expect(list).toHaveLength(2)
    })

    it('destroySubtree existente: devolve true; size diminúe', () => {
      const mgr = new SubtreeManager(makeOptions())
      mgr.getOrCreateSubtree('sub-a')
      expect(mgr.size()).toBe(1)
      expect(mgr.destroySubtree('sub-a')).toBe(true)
      expect(mgr.size()).toBe(0)
    })

    it('destroySubtree non existente: devolve false', () => {
      const mgr = new SubtreeManager(makeOptions())
      expect(mgr.destroySubtree('non-existe')).toBe(false)
    })

    it('clear: size → 0', () => {
      const mgr = new SubtreeManager(makeOptions())
      mgr.getOrCreateSubtree('sub-a')
      mgr.getOrCreateSubtree('sub-b')
      expect(mgr.size()).toBe(2)
      mgr.clear()
      expect(mgr.size()).toBe(0)
      expect(mgr.listSubtrees()).toEqual([])
    })
  })

  // ── Locale ──

  describe('locale', () => {
    it("locale 'es' propágase ás mensaxes", () => {
      const mgr = new SubtreeManager(
        makeOptions({
          locale: 'es',
          activeSubtreeIds: new Set(['sub-a']),
        }),
      )
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Se detectó un ciclo')
      }
    })

    it("locale 'en' propágase ás mensaxes", () => {
      const mgr = new SubtreeManager(
        makeOptions({
          locale: 'en',
          activeSubtreeIds: new Set(['sub-a']),
        }),
      )
      const result = mgr.getOrCreateSubtree('sub-a')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Subtree cycle detected')
      }
    })
  })
})
