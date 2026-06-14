// ── INICIO: tests de PluginManager ──
import { ErrorCode } from '@yggdrasil-forge/common'
import type { Locale } from '@yggdrasil-forge/common'
import type { Result } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from '../../src/engine/EventEmitter.js'
import { HookRunner } from '../../src/plugins/HookRunner.js'
import { PluginManager } from '../../src/plugins/PluginManager.js'
import type { Plugin, PluginEngineHandle } from '../../src/types/index.js'
import { ok } from '../../src/types/index.js'
import type { Budget, NodeInstance, TreeDef, UnlockCheck } from '../../src/types/index.js'

function makePlugin(id: string): Plugin {
  return {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '1.0.0',
    install: vi.fn(),
  }
}

const makeEngineHandle = (): PluginEngineHandle => ({
  getNodeState: () => null,
  getAllNodeStates: () => new Map<string, NodeInstance>(),
  getBudget: () => ({ resources: {} }) as Budget,
  getProgress: () => 0,
  getTreeDef: () => ({ id: 't', name: 'test', nodes: [], edges: [] }) as unknown as TreeDef,
  getLocale: () => 'gl',
  getStat: () => 0,
  getAllStats: () => ({}),
  isReadOnly: () => false,
  canUnlock: () => ok({ allowed: false }) as Result<UnlockCheck>,
})

const makePluginManager = (locale?: Locale): PluginManager => {
  const engineHandle = makeEngineHandle()
  const hookRunner = new HookRunner()
  const events = new EventEmitter()
  return new PluginManager(engineHandle, hookRunner, events, locale)
}

describe('PluginManager', () => {
  it('constructor: creado con locale gl por defecto', () => {
    const mgr = makePluginManager()
    expect(mgr).toBeDefined()
  })

  it('constructor con locale custom: es resulta en mensaxes en español', async () => {
    const mgr = makePluginManager('es')
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    const result = await mgr.register(plugin)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('ya registrado')
    }
  })

  it('register(plugin) engade ao Map; get(id) devolve o plugin', async () => {
    const mgr = makePluginManager()
    const plugin = makePlugin('p1')
    const result = await mgr.register(plugin)
    expect(result.ok).toBe(true)
    expect(mgr.get('p1')).toBe(plugin)
  })

  it('register(duplicate) devolve err(PLUGIN_ALREADY_REGISTERED)', async () => {
    const mgr = makePluginManager()
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    const result = await mgr.register(plugin)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_ALREADY_REGISTERED)
    }
  })

  it('unregister(id) borra do Map; get(id) devolve null', async () => {
    const mgr = makePluginManager()
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    const result = await mgr.unregister('p1')
    expect(result.ok).toBe(true)
    expect(mgr.get('p1')).toBeNull()
  })

  it('unregister(inexistente) devolve err(PLUGIN_NOT_FOUND)', async () => {
    const mgr = makePluginManager()
    const result = await mgr.unregister('ghost')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_NOT_FOUND)
    }
  })

  it('list() devolve plugins en orde de inserción', async () => {
    const mgr = makePluginManager()
    const p1 = makePlugin('p1')
    const p2 = makePlugin('p2')
    await mgr.register(p1)
    await mgr.register(p2)
    const list = mgr.list()
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('p1')
    expect(list[1].id).toBe('p2')
  })

  it('register() chama plugin.install() con engineHandle + api (8.4.b.ii)', async () => {
    const mgr = makePluginManager()
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    expect(plugin.install).toHaveBeenCalledTimes(1)
    expect(plugin.install).toHaveBeenCalledWith(expect.any(Object), expect.any(Object))
  })
})
// ── FIN: tests de PluginManager ──
