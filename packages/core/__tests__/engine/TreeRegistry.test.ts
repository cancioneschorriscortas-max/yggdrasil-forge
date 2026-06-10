import { ErrorCode } from '@yggdrasil-forge/common'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/TreeEngine.js'
import {
  TreeRegistry,
  type TreeRegistryCacheConfig,
  type TreeRegistryOptions,
} from '../../src/engine/TreeRegistry.js'
import type { Build, TreeChange, TreeDef } from '../../src/types/index.js'

// ── Helpers ──

/** TreeDef mínimo válido. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes: [
      { id: 'n1', type: 'skill', label: 'Nodo 1' },
      { id: 'n2', type: 'skill', label: 'Nodo 2' },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    layout: { type: 'identity' },
    ...overrides,
  }
}

/** Crea un Build falso para tests. */
function makeBuild(overrides?: Partial<Build>): Build {
  return {
    id: 'build-1',
    treeId: 'test-tree',
    treeVersion: '1.0.0',
    schemaVersion: '1.0.0',
    author: 'alice',
    createdAt: 1000,
    updatedAt: 1000,
    state: {
      nodes: {},
      budget: { resources: {} },
      meta: {
        treeId: 'test-tree',
        treeVersion: '1.0.0',
        schemaVersion: '1.0.0',
        createdAt: 1000,
        lastModifiedAt: 1000,
      },
    },
    ...overrides,
  }
}

function makeOptions(cache: TreeRegistryCacheConfig, storage?: MemoryStorage): TreeRegistryOptions {
  return {
    storage: storage ?? new MemoryStorage(),
    cache,
  }
}

// ── Construción ──

describe('TreeRegistry — construción', () => {
  const treeDef = makeTreeDef()

  it('crea con defaults', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    expect(registry).toBeInstanceOf(TreeRegistry)
  })

  it('acepta strategy all-in-memory', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    expect(registry.getSharedTreeDef()).toBe(treeDef)
  })

  it('acepta strategy lru con maxInMemory', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'lru', maxInMemory: 5 }))
    expect(registry.getSharedTreeDef()).toBe(treeDef)
  })

  it('acepta strategy lru con ttlMs', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'lru', ttlMs: 5000 }))
    expect(registry.getSharedTreeDef()).toBe(treeDef)
  })

  it('acepta strategy on-demand', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }))
    expect(registry.getSharedTreeDef()).toBe(treeDef)
  })
})

// ── createEngine ──

describe('TreeRegistry — createEngine', () => {
  const treeDef = makeTreeDef()

  it('crea engine novo sen build', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.createEngine('alice')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeInstanceOf(TreeEngine)
    }
  })

  it('crea engine con build.state como initialState', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    // Primeiro crear sen build para obter un state modificado
    const r1 = await registry.createEngine('temp')
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    // Desbloquear un nodo para ter state non-default
    await r1.value.unlock('n1')
    const snapshot = r1.value.getSnapshot()
    const build = makeBuild({ state: snapshot })

    const registry2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry2.createEngine('bob', build)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const engineState = result.value.getSnapshot()
      expect(engineState.nodes.n1?.state).toBe('unlocked')
    }
  })

  it('userId xa existe: err TREE_REGISTRY_USER_EXISTS', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.createEngine('alice')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.TREE_REGISTRY_USER_EXISTS)
    }
  })

  it('engine resultante usa treeDef compartido', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const r1 = await registry.createEngine('alice')
    const r2 = await registry.createEngine('bob')
    expect(r1.ok && r2.ok).toBe(true)
  })

  it('on-demand persiste inmediatamente', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await registry.createEngine('alice')
    // Verificar que o state foi persistido
    const getResult = await storage.get('engine:alice:state')
    expect(getResult.ok).toBe(true)
    if (getResult.ok) {
      expect(getResult.value).not.toBeNull()
    }
  })

  it('all-in-memory / lru garda en cache', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const r1 = await registry.createEngine('alice')
    const r2 = await registry.getEngine('alice')
    expect(r1.ok && r2.ok).toBe(true)
    if (r1.ok && r2.ok) {
      expect(r2.value).toBe(r1.value) // mesma referencia
    }
  })
})

// ── getEngine ──

describe('TreeRegistry — getEngine', () => {
  const treeDef = makeTreeDef()

  it('userId non existe: err TREE_REGISTRY_USER_NOT_FOUND', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.getEngine('nobody')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND)
    }
  })

  it('userId existe + cache hit: devolve engine', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.getEngine('alice')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeInstanceOf(TreeEngine)
    }
  })

  it('all-in-memory: non load lazy se non está en cache', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    // Crear e gardar
    await registry.createEngine('alice')
    await registry.save()
    // Novo registry con load: engine debería estar en cache
    const registry2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await registry2.load()
    const result = await registry2.getEngine('alice')
    expect(result.ok).toBe(true)
  })

  it('lru: load lazy se cache miss', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(
      treeDef,
      makeOptions({ strategy: 'lru', maxInMemory: 10 }, storage),
    )
    await registry.createEngine('alice')
    await registry.save()
    // Novo registry: load() carga só userIds, non engines
    const registry2 = new TreeRegistry(
      treeDef,
      makeOptions({ strategy: 'lru', maxInMemory: 10 }, storage),
    )
    await registry2.load()
    // getEngine debería cargar desde storage (lazy)
    const result = await registry2.getEngine('alice')
    expect(result.ok).toBe(true)
  })

  it('on-demand: load sempre desde storage', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await registry.createEngine('alice')
    await registry.save()
    // Novo registry cargado
    const registry2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await registry2.load()
    const result = await registry2.getEngine('alice')
    expect(result.ok).toBe(true)
  })

  it('LRU: bump lastAccessAt en hit', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'lru', maxInMemory: 2 }))
    await registry.createEngine('alice')
    await registry.createEngine('bob')
    // Acceder a alice para bumpeala (máis recente)
    await registry.getEngine('alice')
    // Engadir charlie: debería evictar bob (o máis vello)
    await registry.createEngine('charlie')
    // alice debería seguir en cache (foi bumpeada)
    const aliceR = await registry.getEngine('alice')
    expect(aliceR.ok).toBe(true)
  })

  it('TTL: entries expiradas son recargadas', async () => {
    const storage = new MemoryStorage()
    vi.useFakeTimers()
    try {
      const registry = new TreeRegistry(
        treeDef,
        makeOptions({ strategy: 'lru', maxInMemory: 10, ttlMs: 100 }, storage),
      )
      await registry.createEngine('alice')
      await registry.save()
      // Avanzar reloxo para expirar a entry
      vi.advanceTimersByTime(200)
      // getEngine debería recargar desde storage
      const result = await registry.getEngine('alice')
      expect(result.ok).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('múltiples getEngine devolve mesma instance (cache)', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const r1 = await registry.getEngine('alice')
    const r2 = await registry.getEngine('alice')
    expect(r1.ok && r2.ok).toBe(true)
    if (r1.ok && r2.ok) {
      expect(r1.value).toBe(r2.value)
    }
  })
})

// ── removeEngine ──

describe('TreeRegistry — removeEngine', () => {
  const treeDef = makeTreeDef()

  it('existe: elimina e devolve ok', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.removeEngine('alice')
    expect(result.ok).toBe(true)
    // Xa non se pode obter
    const getResult = await registry.getEngine('alice')
    expect(getResult.ok).toBe(false)
  })

  it('non existe: ok (idempotent)', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.removeEngine('nobody')
    expect(result.ok).toBe(true)
  })

  it('elimina engine state do storage', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await registry.createEngine('alice')
    // Verificar que existe en storage
    const before = await storage.get('engine:alice:state')
    expect(before.ok && before.value !== null).toBe(true)
    await registry.removeEngine('alice')
    const after = await storage.get('engine:alice:state')
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.value).toBeNull()
  })

  it('elimina todos os builds asociados', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await registry.createEngine('alice')
    const buildR = await registry.saveBuild('alice')
    expect(buildR.ok).toBe(true)
    if (!buildR.ok) return
    const buildId = buildR.value.id
    await registry.removeEngine('alice')
    // Build debería estar eliminado
    const getR = await storage.get(`build:${buildId}`)
    expect(getR.ok).toBe(true)
    if (getR.ok) expect(getR.value).toBeNull()
  })

  it('actualiza listEngines', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.createEngine('bob')
    await registry.removeEngine('alice')
    const list = await registry.listEngines()
    expect(list).toEqual(['bob'])
  })
})

// ── listEngines ──

describe('TreeRegistry — listEngines', () => {
  const treeDef = makeTreeDef()

  it('vacío: []', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const list = await registry.listEngines()
    expect(list).toEqual([])
  })

  it('tras N createEngines: N userIds', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.createEngine('bob')
    await registry.createEngine('charlie')
    const list = await registry.listEngines()
    expect(list).toHaveLength(3)
    expect(list).toContain('alice')
    expect(list).toContain('bob')
    expect(list).toContain('charlie')
  })

  it('tras removeEngine: lista actualizada', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.createEngine('bob')
    await registry.removeEngine('alice')
    const list = await registry.listEngines()
    expect(list).toEqual(['bob'])
  })
})

// ── getSharedTreeDef ──

describe('TreeRegistry — getSharedTreeDef', () => {
  const treeDef = makeTreeDef()

  it('devolve mesmo TreeDef pasado no constructor', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    expect(registry.getSharedTreeDef()).toBe(treeDef)
  })

  it('referencia (cero clone)', () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const td1 = registry.getSharedTreeDef()
    const td2 = registry.getSharedTreeDef()
    expect(td1).toBe(td2)
  })
})

// ── applyChangesToAll ──

describe('TreeRegistry — applyChangesToAll', () => {
  const treeDef = makeTreeDef()

  it('0 engines en cache: ok', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const changes: TreeChange[] = [
      {
        type: 'add_node',
        node: { id: 'n3', type: 'skill', label: 'Nodo 3' },
      },
    ]
    const result = await registry.applyChangesToAll(changes)
    expect(result.ok).toBe(true)
  })

  it('aplica changes a todos os engines en cache', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.createEngine('bob')
    const changes: TreeChange[] = [
      {
        type: 'add_node',
        node: { id: 'n3', type: 'skill', label: 'Nodo 3' },
      },
    ]
    const result = await registry.applyChangesToAll(changes)
    expect(result.ok).toBe(true)
  })

  it('cero engines en cache (on-demand): cero acción', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await registry.createEngine('alice')
    // on-demand non mantén en cache
    const changes: TreeChange[] = [
      {
        type: 'add_node',
        node: { id: 'n3', type: 'skill', label: 'Nodo 3' },
      },
    ]
    const result = await registry.applyChangesToAll(changes)
    // ok porque cero engines en cache que procesar
    expect(result.ok).toBe(true)
  })

  it('engine fallido: err con context', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const r = await registry.createEngine('alice')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // Forzar que applyChanges falle vía spy
    vi.spyOn(r.value, 'applyChanges').mockResolvedValueOnce({
      ok: false,
      error: {
        name: 'YggdrasilError',
        code: ErrorCode.CHANGE_CONFLICT,
        message: 'test conflict',
      } as never,
    })
    const changes: TreeChange[] = [
      {
        type: 'add_node',
        node: { id: 'n3', type: 'skill', label: 'Nodo 3' },
      },
    ]
    const result = await registry.applyChangesToAll(changes)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.APPLY_CHANGES_FAILED)
    }
  })

  it('engines posteriores continúan tras un fallo', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const r1 = await registry.createEngine('alice')
    await registry.createEngine('bob')
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    // Só alice falla
    vi.spyOn(r1.value, 'applyChanges').mockResolvedValueOnce({
      ok: false,
      error: {
        name: 'YggdrasilError',
        code: ErrorCode.CHANGE_CONFLICT,
        message: 'test conflict',
      } as never,
    })
    const changes: TreeChange[] = [
      {
        type: 'add_node',
        node: { id: 'n3', type: 'skill', label: 'Nodo 3' },
      },
    ]
    const result = await registry.applyChangesToAll(changes)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // context debería ter 1 erro (só alice)
      const ctx = result.error.context as {
        errors: Array<{ userId: string }>
      }
      expect(ctx.errors).toHaveLength(1)
      expect(ctx.errors[0].userId).toBe('alice')
    }
  })
})

// ── saveBuild + loadBuild ──

describe('TreeRegistry — saveBuild + loadBuild', () => {
  const treeDef = makeTreeDef()

  it('saveBuild crea build co state actual', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.saveBuild('alice')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.treeId).toBe('test-tree')
      expect(result.value.author).toBe('alice')
      expect(result.value.state).toBeDefined()
    }
  })

  it('saveBuild persiste en storage', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await registry.createEngine('alice')
    const result = await registry.saveBuild('alice')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const stored = await storage.get(`build:${result.value.id}`)
    expect(stored.ok).toBe(true)
    if (stored.ok) expect(stored.value).not.toBeNull()
  })

  it('saveBuild actualiza buildsIndex', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.saveBuild('alice')
    const builds = await registry.listBuilds('alice')
    expect(builds).toHaveLength(1)
  })

  it('saveBuild con label', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.saveBuild('alice', 'antes do exame')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.label).toBe('antes do exame')
    }
  })

  it('loadBuild aplica state ao engine', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const createR = await registry.createEngine('alice')
    expect(createR.ok).toBe(true)
    if (!createR.ok) return
    // Desbloquear nodo e gardar build
    await createR.value.unlock('n1')
    const buildR = await registry.saveBuild('alice')
    expect(buildR.ok).toBe(true)
    if (!buildR.ok) return
    // Cargar build: crea novo engine co state gardado
    const loadR = await registry.loadBuild('alice', buildR.value.id)
    expect(loadR.ok).toBe(true)
    if (loadR.ok) {
      const state = loadR.value.getSnapshot()
      expect(state.nodes.n1?.state).toBe('unlocked')
    }
  })

  it('loadBuild con buildId non existe: err', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.loadBuild('alice', 'non-existent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND)
    }
  })

  it('loadBuild con userId non existe: err', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.loadBuild('nobody', 'build-1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND)
    }
  })

  it('múltiples saveBuilds teñen ids distintos', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const r1 = await registry.saveBuild('alice')
    const r2 = await registry.saveBuild('alice')
    expect(r1.ok && r2.ok).toBe(true)
    if (r1.ok && r2.ok) {
      expect(r1.value.id).not.toBe(r2.value.id)
    }
  })
})

// ── listBuilds + removeBuild ──

describe('TreeRegistry — listBuilds + removeBuild', () => {
  const treeDef = makeTreeDef()

  it('listBuilds(userId): lista buildIds', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.saveBuild('alice')
    await registry.saveBuild('alice')
    const builds = await registry.listBuilds('alice')
    expect(builds).toHaveLength(2)
  })

  it('listBuilds() sen filtro: todos os builds', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.createEngine('bob')
    await registry.saveBuild('alice')
    await registry.saveBuild('bob')
    const all = await registry.listBuilds()
    expect(all).toHaveLength(2)
  })

  it('removeBuild existe: ok + actualiza índice', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const buildR = await registry.saveBuild('alice')
    expect(buildR.ok).toBe(true)
    if (!buildR.ok) return
    const result = await registry.removeBuild(buildR.value.id)
    expect(result.ok).toBe(true)
    const builds = await registry.listBuilds('alice')
    expect(builds).toHaveLength(0)
  })

  it('removeBuild non existe: err', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.removeBuild('non-existent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.TREE_REGISTRY_BUILD_NOT_FOUND)
    }
  })

  it('removeEngine elimina cascading os builds', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.saveBuild('alice')
    await registry.saveBuild('alice')
    await registry.removeEngine('alice')
    // Tras eliminar, listBuilds de alice está vacío
    const builds = await registry.listBuilds('alice')
    expect(builds).toHaveLength(0)
  })
})

// ── exportAllBuilds + importBuilds ──

describe('TreeRegistry — exportAllBuilds + importBuilds', () => {
  const treeDef = makeTreeDef()

  it('exportAllBuilds: lista de Build objects', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await registry.createEngine('alice')
    await registry.saveBuild('alice')
    const builds = await registry.exportAllBuilds()
    expect(builds).toHaveLength(1)
    expect(builds[0].treeId).toBe('test-tree')
  })

  it('importBuilds: persiste + actualiza índice', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const build = makeBuild({ id: 'imported-1', author: 'bob' })
    const result = await registry.importBuilds([build])
    expect(result.ok).toBe(true)
    const builds = await registry.listBuilds('bob')
    expect(builds).toContain('imported-1')
  })

  it('importBuilds usa build.author como userId', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const build = makeBuild({
      id: 'imported-2',
      author: 'charlie',
    })
    await registry.importBuilds([build])
    const builds = await registry.listBuilds('charlie')
    expect(builds).toContain('imported-2')
  })

  it('importBuilds con build.author undefined: descartado', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const build = makeBuild({ id: 'orphan' })
    // Eliminar author
    const noAuthor = { ...build } as Record<string, unknown>
    noAuthor.author = undefined
    await registry.importBuilds([noAuthor as Build])
    const all = await registry.listBuilds()
    expect(all).toHaveLength(0)
  })

  it('importBuilds sobreescribe buildIds existentes', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const build1 = makeBuild({
      id: 'shared-id',
      author: 'alice',
      treeVersion: '1.0.0',
    })
    const build2 = makeBuild({
      id: 'shared-id',
      author: 'alice',
      treeVersion: '2.0.0',
    })
    await registry.importBuilds([build1])
    await registry.importBuilds([build2])
    // O build gardado debería ter a última versión
    const stored = await storage.get('build:shared-id')
    expect(stored.ok).toBe(true)
    if (stored.ok) {
      expect((stored.value as Build).treeVersion).toBe('2.0.0')
    }
  })

  it('roundtrip export → import → export', async () => {
    const storage1 = new MemoryStorage()
    const reg1 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage1))
    await reg1.createEngine('alice')
    await reg1.saveBuild('alice')
    await reg1.saveBuild('alice')
    const exported = await reg1.exportAllBuilds()
    expect(exported).toHaveLength(2)

    // Importar noutra registry
    const storage2 = new MemoryStorage()
    const reg2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage2))
    await reg2.importBuilds(exported)
    const reExported = await reg2.exportAllBuilds()
    expect(reExported).toHaveLength(2)
    // Verificar que os ids coinciden
    const ids1 = exported.map((b) => b.id).sort()
    const ids2 = reExported.map((b) => b.id).sort()
    expect(ids1).toEqual(ids2)
  })
})

// ── save + load ──

describe('TreeRegistry — save + load', () => {
  const treeDef = makeTreeDef()

  it('save persiste userIds + buildsIndex + engines', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await registry.createEngine('alice')
    await registry.saveBuild('alice')
    const result = await registry.save()
    expect(result.ok).toBe(true)
    // Verificar que userIds e buildsIndex foron gardados
    const uids = await storage.get('registry:userIds')
    expect(uids.ok).toBe(true)
    if (uids.ok) expect(uids.value).toEqual(['alice'])
  })

  it('load() restaura userIds + buildsIndex', async () => {
    const storage = new MemoryStorage()
    const reg1 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await reg1.createEngine('alice')
    await reg1.createEngine('bob')
    await reg1.saveBuild('alice')
    await reg1.save()
    // Novo registry
    const reg2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await reg2.load()
    const list = await reg2.listEngines()
    expect(list).toHaveLength(2)
    const builds = await reg2.listBuilds('alice')
    expect(builds).toHaveLength(1)
  })

  it('all-in-memory load: carga todos os engines', async () => {
    const storage = new MemoryStorage()
    const reg1 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const createR = await reg1.createEngine('alice')
    expect(createR.ok).toBe(true)
    if (!createR.ok) return
    await createR.value.unlock('n1')
    await reg1.save()

    const reg2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await reg2.load()
    const r = await reg2.getEngine('alice')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.getSnapshot().nodes.n1?.state).toBe('unlocked')
    }
  })

  it('lru load: carga só userIds (cero engines)', async () => {
    const storage = new MemoryStorage()
    const reg1 = new TreeRegistry(
      treeDef,
      makeOptions({ strategy: 'lru', maxInMemory: 10 }, storage),
    )
    await reg1.createEngine('alice')
    await reg1.save()

    const reg2 = new TreeRegistry(
      treeDef,
      makeOptions({ strategy: 'lru', maxInMemory: 10 }, storage),
    )
    await reg2.load()
    const list = await reg2.listEngines()
    expect(list).toContain('alice')
    // getEngine carga lazy
    const r = await reg2.getEngine('alice')
    expect(r.ok).toBe(true)
  })

  it('on-demand load: carga só userIds', async () => {
    const storage = new MemoryStorage()
    const reg1 = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await reg1.createEngine('alice')
    await reg1.save()

    const reg2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await reg2.load()
    const list = await reg2.listEngines()
    expect(list).toContain('alice')
  })

  it('roundtrip create → save → new registry → load → getEngine', async () => {
    const storage = new MemoryStorage()
    const reg1 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const createR = await reg1.createEngine('alice')
    expect(createR.ok).toBe(true)
    if (!createR.ok) return
    await createR.value.unlock('n1')
    await reg1.saveBuild('alice', 'checkpoint')
    await reg1.save()

    const reg2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await reg2.load()
    const engineR = await reg2.getEngine('alice')
    expect(engineR.ok).toBe(true)
    if (engineR.ok) {
      expect(engineR.value.getSnapshot().nodes.n1?.state).toBe('unlocked')
    }
    const builds = await reg2.listBuilds('alice')
    expect(builds).toHaveLength(1)
  })

  it('load() de storage vacío: estado limpo', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const result = await registry.load()
    expect(result.ok).toBe(true)
    const list = await registry.listEngines()
    expect(list).toEqual([])
  })

  it('save() persiste registry:meta', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    await registry.save()
    const meta = await storage.get('registry:meta')
    expect(meta.ok).toBe(true)
    if (meta.ok) {
      const m = meta.value as {
        schemaVersion: string
        createdAt: number
      }
      expect(m.schemaVersion).toBe('1.0.0')
      expect(m.createdAt).toBeGreaterThan(0)
    }
  })
})

// ── destroy ──

describe('TreeRegistry — destroy', () => {
  const treeDef = makeTreeDef()

  it('limpa cache', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    registry.destroy()
    // getEngine non atopa a ninguén
    const result = await registry.getEngine('alice')
    expect(result.ok).toBe(false)
  })

  it('limpa userIds + buildsIndex', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    await registry.saveBuild('alice')
    registry.destroy()
    const list = await registry.listEngines()
    expect(list).toEqual([])
    const builds = await registry.listBuilds()
    expect(builds).toEqual([])
  })

  it('posterior usage tras destroy: registry como novo', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    registry.destroy()
    // Debería poder crear de novo
    const result = await registry.createEngine('alice')
    expect(result.ok).toBe(true)
  })
})

// ── Edge cases para cobertura extra ──

describe('TreeRegistry — edge cases de cobertura', () => {
  const treeDef = makeTreeDef()

  it('save() con on-demand non persiste engines desde cache', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await registry.createEngine('alice')
    await registry.save()
    // userIds debe estar persistido
    const uids = await storage.get('registry:userIds')
    expect(uids.ok).toBe(true)
    if (uids.ok) expect(uids.value).toEqual(['alice'])
  })

  it('load() con buildsIndex non gardado devolve ok', async () => {
    const storage = new MemoryStorage()
    // Simular storage con userIds pero sen buildsIndex
    await storage.set('registry:userIds', ['alice'])
    await storage.set('engine:alice:state', null)
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }, storage))
    const result = await registry.load()
    expect(result.ok).toBe(true)
    const list = await registry.listEngines()
    expect(list).toContain('alice')
  })

  it('lru con ttlMs undefined: entry non expira', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'lru', maxInMemory: 10 }))
    await registry.createEngine('alice')
    // Acceso múltiple, sen expiración
    const r1 = await registry.getEngine('alice')
    const r2 = await registry.getEngine('alice')
    expect(r1.ok && r2.ok).toBe(true)
    if (r1.ok && r2.ok) expect(r1.value).toBe(r2.value)
  })

  it('LRU evicta correctamente cando cache cheo', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(
      treeDef,
      makeOptions({ strategy: 'lru', maxInMemory: 1 }, storage),
    )
    await registry.createEngine('alice')
    await registry.save()
    await registry.createEngine('bob')
    // alice debería ser evictada (maxInMemory=1, bob é o último)
    // Pero alice segue en userIds; poderíase recargar desde storage
    await registry.save()
    const bobR = await registry.getEngine('bob')
    expect(bobR.ok).toBe(true)
  })

  it('getEngine lru con TTL non expirado: devolve cached', async () => {
    vi.useFakeTimers()
    try {
      const registry = new TreeRegistry(
        treeDef,
        makeOptions({
          strategy: 'lru',
          maxInMemory: 10,
          ttlMs: 10000,
        }),
      )
      await registry.createEngine('alice')
      vi.advanceTimersByTime(100) // Moi por debaixo do TTL
      const r = await registry.getEngine('alice')
      expect(r.ok).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('applyChangesToAll con changes baleiro: ok', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const result = await registry.applyChangesToAll([])
    expect(result.ok).toBe(true)
  })

  it('saveBuild sobre usuario non existente: err', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.saveBuild('nobody')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.TREE_REGISTRY_USER_NOT_FOUND)
    }
  })

  it('importBuilds con builds baleiro: ok', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const result = await registry.importBuilds([])
    expect(result.ok).toBe(true)
  })

  it('exportAllBuilds sen builds: []', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    const builds = await registry.exportAllBuilds()
    expect(builds).toEqual([])
  })

  it('listBuilds de usuario non existente: []', async () => {
    const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
    const builds = await registry.listBuilds('nobody')
    expect(builds).toEqual([])
  })

  it('on-demand getEngine tras save+load roundtrip', async () => {
    const storage = new MemoryStorage()
    const reg1 = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await reg1.createEngine('alice')
    await reg1.save()

    const reg2 = new TreeRegistry(treeDef, makeOptions({ strategy: 'on-demand' }, storage))
    await reg2.load()
    const r = await reg2.getEngine('alice')
    expect(r.ok).toBe(true)
  })

  it('createEngine con locale custom', async () => {
    const registry = new TreeRegistry(treeDef, {
      storage: new MemoryStorage(),
      cache: { strategy: 'all-in-memory' },
      locale: 'en',
    })
    const result = await registry.createEngine('alice')
    expect(result.ok).toBe(true)
  })
})

// ── Aggregate queries ──

/** TreeDef con supportsProgress para tests de progress. */
function makeProgressTreeDef(): TreeDef {
  return {
    id: 'prog-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Progress Tree',
    nodes: [
      {
        id: 'p1',
        type: 'skill',
        label: 'P1',
        supportsProgress: true,
        progressSource: { type: 'manual' },
      },
      {
        id: 'p2',
        type: 'skill',
        label: 'P2',
        supportsProgress: true,
        progressSource: { type: 'manual' },
      },
      { id: 'p3', type: 'skill', label: 'P3' },
    ],
    edges: [],
    layout: { type: 'identity' },
  }
}

/**
 * Crea un registry con usuarios, desbloquea nodos e opcionalmente
 * establece progress. Chama save() ao final para persistir.
 */
async function setupRegistryWithUsers(
  users: Array<{
    id: string
    unlockedNodes: string[]
    progress?: Record<string, number>
  }>,
  treeDef: TreeDef = makeTreeDef(),
): Promise<TreeRegistry> {
  const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
  for (const u of users) {
    const createRes = await registry.createEngine(u.id)
    if (!createRes.ok) {
      throw new Error(`createEngine fallou: ${createRes.error.code}`)
    }
    const eng = createRes.value
    for (const nodeId of u.unlockedNodes) {
      const r = await eng.unlock(nodeId)
      if (!r.ok) {
        throw new Error(`unlock fallou: ${r.error.code}`)
      }
    }
    if (u.progress !== undefined) {
      for (const [nodeId, value] of Object.entries(u.progress)) {
        const r = eng.setProgress(nodeId, value)
        if (!r.ok) {
          throw new Error(`setProgress fallou: ${r.error.code}`)
        }
      }
    }
  }
  await registry.save()
  return registry
}

describe('TreeRegistry — aggregate queries — getAggregateStats', () => {
  it('0 usuarios: todos os campos en 0, arrays vacíos', async () => {
    const registry = new TreeRegistry(makeTreeDef(), makeOptions({ strategy: 'all-in-memory' }))
    const stats = await registry.getAggregateStats()
    expect(stats.totalUsers).toBe(0)
    expect(stats.avgUnlockedCount).toBe(0)
    expect(stats.avgProgress).toBe(0)
    expect(stats.mostPopularNodes).toEqual([])
    expect(stats.leastPopularNodes).toEqual([])
    expect(stats.completionRate).toBe(0)
  })

  it('createEngine sen save: totalUsers=0 (non persistido)', async () => {
    const registry = new TreeRegistry(makeTreeDef(), makeOptions({ strategy: 'all-in-memory' }))
    await registry.createEngine('alice')
    // SEN chamar save()
    const stats = await registry.getAggregateStats()
    expect(stats.totalUsers).toBe(0)
  })

  it('N usuarios con unlocks mixtos: avgUnlockedCount correcto', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1'] },
      { id: 'bob', unlockedNodes: ['n1', 'n2'] },
    ])
    const stats = await registry.getAggregateStats()
    expect(stats.totalUsers).toBe(2)
    expect(stats.avgUnlockedCount).toBe(1.5)
  })

  it('N usuarios con progress parcial: avgProgress correcto', async () => {
    const td = makeProgressTreeDef()
    const registry = await setupRegistryWithUsers(
      [
        { id: 'alice', unlockedNodes: [], progress: { p1: 50 } },
        { id: 'bob', unlockedNodes: [], progress: { p1: 100, p2: 80 } },
      ],
      td,
    )
    const stats = await registry.getAggregateStats()
    // 3 valores: 50+100+80 = 230, media = 230/3
    expect(stats.avgProgress).toBeCloseTo(230 / 3)
  })

  it('mostPopular / leastPopular con tie-break alfabético', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1'] },
      { id: 'bob', unlockedNodes: ['n1'] },
    ])
    const stats = await registry.getAggregateStats()
    // n1 count=2, n2 count=0
    expect(stats.mostPopularNodes[0]).toEqual({
      nodeId: 'n1',
      count: 2,
    })
    expect(stats.leastPopularNodes[0]).toEqual({
      nodeId: 'n2',
      count: 0,
    })
  })

  it('completionRate=1 cando todos completaron', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1', 'n2'] },
      { id: 'bob', unlockedNodes: ['n1', 'n2'] },
    ])
    const stats = await registry.getAggregateStats()
    expect(stats.completionRate).toBe(1)
  })

  it('completionRate mixto: algúns completaron, algúns non', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1', 'n2'] },
      { id: 'bob', unlockedNodes: ['n1'] },
    ])
    const stats = await registry.getAggregateStats()
    expect(stats.completionRate).toBe(0.5)
  })
})

describe('TreeRegistry — aggregate queries — getNodePopularity', () => {
  it('0 usuarios: Map con todos nodos a 0', async () => {
    const registry = new TreeRegistry(makeTreeDef(), makeOptions({ strategy: 'all-in-memory' }))
    const pop = await registry.getNodePopularity()
    expect(pop.get('n1')).toBe(0)
    expect(pop.get('n2')).toBe(0)
  })

  it('N usuarios con unlocks diferentes: count correcto', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1'] },
      { id: 'bob', unlockedNodes: ['n1', 'n2'] },
      { id: 'carol', unlockedNodes: [] },
    ])
    const pop = await registry.getNodePopularity()
    expect(pop.get('n1')).toBe(2)
    expect(pop.get('n2')).toBe(1)
  })

  it('inclúe nodos nunca desbloqueados (count=0)', async () => {
    const registry = await setupRegistryWithUsers([{ id: 'alice', unlockedNodes: ['n1'] }])
    const pop = await registry.getNodePopularity()
    expect(pop.has('n2')).toBe(true)
    expect(pop.get('n2')).toBe(0)
  })

  it('determinismo: dúas chamadas devolven Maps equivalentes', async () => {
    const registry = await setupRegistryWithUsers([{ id: 'alice', unlockedNodes: ['n1'] }])
    const pop1 = await registry.getNodePopularity()
    const pop2 = await registry.getNodePopularity()
    expect([...pop1.entries()]).toEqual([...pop2.entries()])
  })
})

describe('TreeRegistry — aggregate queries — getProgressDistribution', () => {
  it('0 usuarios: []', async () => {
    const registry = new TreeRegistry(
      makeProgressTreeDef(),
      makeOptions({ strategy: 'all-in-memory' }),
    )
    const dist = await registry.getProgressDistribution('p1')
    expect(dist).toEqual([])
  })

  it('nodeId inexistente no treeDef: []', async () => {
    const td = makeProgressTreeDef()
    const registry = await setupRegistryWithUsers(
      [{ id: 'alice', unlockedNodes: [], progress: { p1: 50 } }],
      td,
    )
    const dist = await registry.getProgressDistribution('nonexistent')
    expect(dist).toEqual([])
  })

  it('N usuarios con progress: array ordenado por userId', async () => {
    const td = makeProgressTreeDef()
    const registry = await setupRegistryWithUsers(
      [
        { id: 'carol', unlockedNodes: [], progress: { p1: 30 } },
        { id: 'alice', unlockedNodes: [], progress: { p1: 70 } },
        { id: 'bob', unlockedNodes: [], progress: { p1: 50 } },
      ],
      td,
    )
    const dist = await registry.getProgressDistribution('p1')
    // Orde alfabética por userId: alice=70, bob=50, carol=30
    expect(dist).toEqual([70, 50, 30])
  })

  it('usuarios sen progress para o nodeId: excluídos', async () => {
    const td = makeProgressTreeDef()
    const registry = await setupRegistryWithUsers(
      [
        { id: 'alice', unlockedNodes: [], progress: { p1: 50 } },
        { id: 'bob', unlockedNodes: [] },
      ],
      td,
    )
    const dist = await registry.getProgressDistribution('p1')
    expect(dist).toEqual([50])
  })
})

describe('TreeRegistry — aggregate queries — getStuckUsers', () => {
  it('threshold default (1): usuarios con 0 unlocks', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1'] },
      { id: 'bob', unlockedNodes: [] },
    ])
    const stuck = await registry.getStuckUsers()
    expect(stuck).toEqual(['bob'])
  })

  it('threshold custom: usuarios con <N unlocks', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1', 'n2'] },
      { id: 'bob', unlockedNodes: ['n1'] },
      { id: 'carol', unlockedNodes: [] },
    ])
    const stuck = await registry.getStuckUsers(2)
    // bob ten 1 <2, carol ten 0 <2
    expect(stuck).toEqual(['bob', 'carol'])
  })

  it('0 usuarios: []', async () => {
    const registry = new TreeRegistry(makeTreeDef(), makeOptions({ strategy: 'all-in-memory' }))
    const stuck = await registry.getStuckUsers()
    expect(stuck).toEqual([])
  })

  it('orde alfabética determinística', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'zara', unlockedNodes: [] },
      { id: 'alice', unlockedNodes: [] },
      { id: 'mike', unlockedNodes: [] },
    ])
    const stuck = await registry.getStuckUsers()
    expect(stuck).toEqual(['alice', 'mike', 'zara'])
  })
})

describe('TreeRegistry — aggregate queries — integración + edge cases', () => {
  it('roundtrip: create → unlock → save → getAggregateStats consistente', async () => {
    const registry = await setupRegistryWithUsers([{ id: 'alice', unlockedNodes: ['n1'] }])
    const stats = await registry.getAggregateStats()
    expect(stats.totalUsers).toBe(1)
    expect(stats.avgUnlockedCount).toBe(1)
  })

  it('create → unlock → SEN save → getAggregateStats devolve stale', async () => {
    const registry = await setupRegistryWithUsers([{ id: 'alice', unlockedNodes: ['n1'] }])
    // Desbloquear n2 SEN save
    const engR = await registry.getEngine('alice')
    if (!engR.ok) throw new Error('getEngine fallou')
    await engR.value.unlock('n2')
    // SEN chamar save() → aggregate non ve n2
    const stats = await registry.getAggregateStats()
    expect(stats.avgUnlockedCount).toBe(1) // stale: só n1
  })

  it('storage error → skip silencioso, funciona coas restantes', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(
      makeTreeDef(),
      makeOptions({ strategy: 'all-in-memory' }, storage),
    )
    await registry.createEngine('alice')
    const engR = await registry.getEngine('alice')
    if (!engR.ok) throw new Error('getEngine fallou')
    await engR.value.unlock('n1')
    await registry.save()
    // Corromper storage para un userId falso
    // Engadir userId manualmente que non ten state
    ;(registry as unknown as { userIds: Set<string> }).userIds.add('ghost')
    const stats = await registry.getAggregateStats()
    // Ghost é skipeado; alice persiste con n1 unlocked
    expect(stats.totalUsers).toBe(1)
    expect(stats.avgUnlockedCount).toBe(1)
  })

  it('subtreeStates non se descenden', async () => {
    const storage = new MemoryStorage()
    const registry = new TreeRegistry(
      makeTreeDef(),
      makeOptions({ strategy: 'all-in-memory' }, storage),
    )
    await registry.createEngine('alice')
    await registry.save()
    // Inxectar subtreeStates manualmente en storage
    const stateR = await storage.get('engine:alice:state')
    if (!stateR.ok || stateR.value === null) {
      throw new Error('state non atopado')
    }
    const state = stateR.value as Record<string, unknown>
    state.subtreeStates = {
      sub1: {
        nodes: { x: { id: 'x', state: 'unlocked', currentTier: 1 } },
        budget: { resources: {} },
      },
    }
    await storage.set('engine:alice:state', state)
    const stats = await registry.getAggregateStats()
    // Cero descenso: x non conta
    expect(stats.avgUnlockedCount).toBe(0)
  })

  it('determinismo cross-call: mesmos datos, mesmos resultados', async () => {
    const registry = await setupRegistryWithUsers([
      { id: 'alice', unlockedNodes: ['n1'] },
      { id: 'bob', unlockedNodes: ['n1', 'n2'] },
    ])
    const s1 = await registry.getAggregateStats()
    const s2 = await registry.getAggregateStats()
    const s3 = await registry.getAggregateStats()
    expect(s1).toEqual(s2)
    expect(s2).toEqual(s3)
  })
})
