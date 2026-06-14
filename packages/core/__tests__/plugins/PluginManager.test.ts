// ── INICIO: tests de PluginManager ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it, vi } from 'vitest'
import { PluginManager } from '../../src/plugins/PluginManager.js'
import type { Plugin } from '../../src/types/index.js'

function makePlugin(id: string): Plugin {
  return {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '1.0.0',
    install: vi.fn(),
  }
}

describe('PluginManager', () => {
  it('constructor: creado con locale gl por defecto', () => {
    const mgr = new PluginManager()
    expect(mgr).toBeDefined()
  })

  it('constructor con locale custom: es resulta en mensaxes en español', async () => {
    const mgr = new PluginManager('es')
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    const result = await mgr.register(plugin)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('ya registrado')
    }
  })

  it('register(plugin) engade ao Map; get(id) devolve o plugin', async () => {
    const mgr = new PluginManager()
    const plugin = makePlugin('p1')
    const result = await mgr.register(plugin)
    expect(result.ok).toBe(true)
    expect(mgr.get('p1')).toBe(plugin)
  })

  it('register(duplicate) devolve err(PLUGIN_ALREADY_REGISTERED)', async () => {
    const mgr = new PluginManager()
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    const result = await mgr.register(plugin)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_ALREADY_REGISTERED)
    }
  })

  it('unregister(id) borra do Map; get(id) devolve null', async () => {
    const mgr = new PluginManager()
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    const result = await mgr.unregister('p1')
    expect(result.ok).toBe(true)
    expect(mgr.get('p1')).toBeNull()
  })

  it('unregister(inexistente) devolve err(PLUGIN_NOT_FOUND)', async () => {
    const mgr = new PluginManager()
    const result = await mgr.unregister('ghost')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_NOT_FOUND)
    }
  })

  it('list() devolve plugins en orde de inserción', async () => {
    const mgr = new PluginManager()
    const p1 = makePlugin('p1')
    const p2 = makePlugin('p2')
    await mgr.register(p1)
    await mgr.register(p2)
    const list = mgr.list()
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('p1')
    expect(list[1].id).toBe('p2')
  })

  it('register(plugin) NON chama plugin.install() en 8.4.a', async () => {
    const mgr = new PluginManager()
    const plugin = makePlugin('p1')
    await mgr.register(plugin)
    expect(plugin.install).not.toHaveBeenCalled()
  })
})
// ── FIN: tests de PluginManager ──
