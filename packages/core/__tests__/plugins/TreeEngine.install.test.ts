// ── INICIO: tests de TreeEngine install/uninstall (8.4.b.ii) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { Plugin, TreeDef } from '../../src/types/index.js'

function makeTreeDef(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
  }
}

function makePlugin(id: string, overrides?: Partial<Plugin>): Plugin {
  return {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '1.0.0',
    install: vi.fn(),
    ...overrides,
  }
}

describe('TreeEngine install/uninstall (8.4.b.ii)', () => {
  it('registerPlugin chama install() con engineHandle + PluginAPI', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1')
    const result = await engine.registerPlugin(plugin)
    expect(result.ok).toBe(true)
    expect(plugin.install).toHaveBeenCalledTimes(1)
    expect(plugin.install).toHaveBeenCalledWith(expect.any(Object), expect.any(Object))
  })

  it('install async (Promise<void>) é awaited correctamente', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1', {
      install: vi.fn(async () => {
        /* noop async */
      }),
    })
    const result = await engine.registerPlugin(plugin)
    expect(result.ok).toBe(true)
    expect(plugin.install).toHaveBeenCalledOnce()
  })

  it('install sync (void) funciona', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1', {
      install: vi.fn(() => {
        /* noop sync */
      }),
    })
    const result = await engine.registerPlugin(plugin)
    expect(result.ok).toBe(true)
  })

  it('install que lanza → err(PLUGIN_INSTALL_FAILED) + non en listPlugins', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1', {
      install: vi.fn(() => {
        throw new Error('boom')
      }),
    })
    const result = await engine.registerPlugin(plugin)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_INSTALL_FAILED)
    }
    expect(engine.listPlugins()).toHaveLength(0)
  })

  it('install que rexistra hooks parciais + falla → hooks limpados', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1', {
      install: vi.fn((_eng, api) => {
        api.registerHook('beforeUnlock', () => false)
        throw new Error('partial fail')
      }),
    })
    const result = await engine.registerPlugin(plugin)
    expect(result.ok).toBe(false)
    // Plugin non rexistrado:
    expect(engine.listPlugins()).toHaveLength(0)
  })

  it('unregisterPlugin chama uninstall(engineHandle) se existe', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const uninstall = vi.fn()
    const plugin = makePlugin('p1', { uninstall })
    await engine.registerPlugin(plugin)
    const result = await engine.unregisterPlugin('p1')
    expect(result.ok).toBe(true)
    expect(uninstall).toHaveBeenCalledTimes(1)
    expect(uninstall).toHaveBeenCalledWith(expect.any(Object))
  })

  it('unregister sen uninstall (undefined) funciona; plugin removido', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1')
    await engine.registerPlugin(plugin)
    const result = await engine.unregisterPlugin('p1')
    expect(result.ok).toBe(true)
    expect(engine.listPlugins()).toHaveLength(0)
  })

  it('uninstall que lanza → err(PLUGIN_UNINSTALL_FAILED) pero plugin removido', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1', {
      uninstall: vi.fn(() => {
        throw new Error('cleanup fail')
      }),
    })
    await engine.registerPlugin(plugin)
    const result = await engine.unregisterPlugin('p1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_UNINSTALL_FAILED)
    }
    // Plugin xa removido do Map (best effort):
    expect(engine.listPlugins()).toHaveLength(0)
  })
})
// ── FIN: tests de TreeEngine install/uninstall (8.4.b.ii) ──
