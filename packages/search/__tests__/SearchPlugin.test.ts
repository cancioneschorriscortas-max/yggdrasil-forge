import { TreeEngine } from '@yggdrasil-forge/core'
import type { PluginAPI, PluginEngineHandle, TreeDef } from '@yggdrasil-forge/core'
// ── INICIO: tests de SearchPlugin ──
import { describe, expect, it, vi } from 'vitest'
import { SearchPlugin } from '../src/SearchPlugin.js'

function makeTree(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes: [
      {
        id: 'n1',
        type: 'small',
        label: 'Warrior',
        description: 'A melee fighter',
        tags: ['melee'],
        searchKeywords: ['tank'],
      },
      {
        id: 'n2',
        type: 'small',
        label: 'Mage',
        tags: ['magic'],
      },
    ],
    edges: [],
    layout: { type: 'radial' },
  }
}

function makeMockEngineHandle(tree: TreeDef): PluginEngineHandle {
  return {
    getNodeState: () => null,
    getAllNodeStates: () => new Map(),
    getBudget: () => ({ resources: {} }) as ReturnType<PluginEngineHandle['getBudget']>,
    getProgress: () => 0,
    getTreeDef: () => tree,
    getLocale: () => 'gl',
    getStat: () => 0,
    getAllStats: () => ({}),
    isReadOnly: () => false,
    canUnlock: () =>
      ({ ok: true, value: { allowed: false } }) as ReturnType<PluginEngineHandle['canUnlock']>,
  }
}

function makeMockApi(): PluginAPI {
  return {
    registerHook: vi.fn(),
    log: vi.fn(),
    emit: vi.fn(),
    registerCondition: vi.fn(),
    registerLayout: vi.fn(),
    registerStorageAdapter: vi.fn(),
  } as unknown as PluginAPI
}

describe('SearchPlugin', () => {
  // ── Constructor + properties ──

  it('new SearchPlugin crea instance correctamente', () => {
    const plugin = new SearchPlugin()
    expect(plugin).toBeDefined()
    expect(plugin.getEngine().size()).toBe(0)
  })

  it('plugin properties correctas', () => {
    const plugin = new SearchPlugin()
    expect(plugin.id).toBe('yggdrasil-search')
    expect(plugin.name).toBe('Search Plugin')
    expect(plugin.version).toBe('0.1.0')
    expect(plugin.apiVersion).toBe('1.0.0')
    expect(plugin.permissions).toEqual(['read_state'])
  })

  // ── Install behavior ──

  it('install garda engineHandle (reindex funcional tras install)', () => {
    const plugin = new SearchPlugin()
    const tree = makeTree()
    plugin.install(makeMockEngineHandle(tree), makeMockApi())
    expect(plugin.getEngine().size()).toBe(2)
    plugin.reindex()
    expect(plugin.getEngine().size()).toBe(2)
  })

  it('install indexa o treeDef inicial', () => {
    const plugin = new SearchPlugin()
    plugin.install(makeMockEngineHandle(makeTree()), makeMockApi())
    expect(plugin.getEngine().size()).toBeGreaterThan(0)
  })

  // ── Uninstall ──

  it('uninstall limpa engine + descarta engineHandle', () => {
    const plugin = new SearchPlugin()
    const tree = makeTree()
    plugin.install(makeMockEngineHandle(tree), makeMockApi())
    plugin.uninstall(makeMockEngineHandle(tree))
    expect(plugin.getEngine().size()).toBe(0)
    // reindex é cero-op tras uninstall (engineHandle=null):
    plugin.reindex()
    expect(plugin.getEngine().size()).toBe(0)
  })

  // ── search() delega ──

  it('search devolve resultados correctos', () => {
    const plugin = new SearchPlugin()
    plugin.install(makeMockEngineHandle(makeTree()), makeMockApi())
    const results = plugin.search('warrior')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.nodeId === 'n1')).toBe(true)
  })

  it('search query vacía devolve []', () => {
    const plugin = new SearchPlugin()
    plugin.install(makeMockEngineHandle(makeTree()), makeMockApi())
    expect(plugin.search('')).toEqual([])
  })

  // ── reindex() ──

  it('reindex re-indexa desde engineHandle', () => {
    const plugin = new SearchPlugin()
    const getTreeDef = vi.fn(() => makeTree())
    const handle = { ...makeMockEngineHandle(makeTree()), getTreeDef }
    plugin.install(handle, makeMockApi())
    expect(getTreeDef).toHaveBeenCalledTimes(1)
    plugin.reindex()
    expect(getTreeDef).toHaveBeenCalledTimes(2)
  })

  it('reindex sen install previo: cero efecto, cero throw', () => {
    const plugin = new SearchPlugin()
    expect(() => plugin.reindex()).not.toThrow()
    expect(plugin.getEngine().size()).toBe(0)
  })

  // ── Integration con TreeEngine real ──

  it('full lifecycle con TreeEngine real', async () => {
    const engine = new TreeEngine(makeTree())
    const plugin = new SearchPlugin()
    await engine.registerPlugin(plugin)
    const results = plugin.search('warrior')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.nodeId === 'n1')).toBe(true)
  })

  // ── LocalizedString ──

  it('LocalizedString label: search atopa por calquera variant', async () => {
    const tree: TreeDef = {
      id: 'i18n-tree',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: 'i18n Tree',
      nodes: [{ id: 'i18n', type: 'small', label: { en: 'Warrior', gl: 'Guerreiro' } }],
      edges: [],
      layout: { type: 'radial' },
    }
    const engine = new TreeEngine(tree)
    const plugin = new SearchPlugin()
    await engine.registerPlugin(plugin)
    expect(plugin.search('guerreiro')).toHaveLength(1)
    expect(plugin.search('warrior')).toHaveLength(1)
  })
})
// ── FIN: tests de SearchPlugin ──
