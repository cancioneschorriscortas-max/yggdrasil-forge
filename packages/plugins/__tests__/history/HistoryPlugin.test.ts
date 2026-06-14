import { TreeEngine } from '@yggdrasil-forge/core'
import type { PluginAPI, PluginEngineHandle, TreeDef } from '@yggdrasil-forge/core'
// ── INICIO: tests de HistoryPlugin ──
import { describe, expect, it, vi } from 'vitest'
import { HistoryPlugin } from '../../src/history/HistoryPlugin.js'

function makeCostTree(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [
      { id: 'node-a', label: 'A', type: 'small', cost: [{ resourceId: 'xp', amount: 10 }] },
      { id: 'node-b', label: 'B', type: 'small', cost: [{ resourceId: 'xp', amount: 5 }] },
    ],
    edges: [],
    layout: { type: 'radial' },
  }
}

describe('HistoryPlugin', () => {
  // ── Constructor + configuration ──

  it('constructor sen opts: maxSize=100, size=0', () => {
    const plugin = new HistoryPlugin()
    expect(plugin.getMaxSize()).toBe(100)
    expect(plugin.size()).toBe(0)
  })

  it('constructor con maxSize custom', () => {
    const plugin = new HistoryPlugin({ maxSize: 50 })
    expect(plugin.getMaxSize()).toBe(50)
  })

  it('plugin properties correctas', () => {
    const plugin = new HistoryPlugin()
    expect(plugin.id).toBe('yggdrasil-history')
    expect(plugin.name).toBe('History Plugin')
    expect(plugin.version).toBe('0.1.0')
    expect(plugin.apiVersion).toBe('1.0.0')
    expect(plugin.permissions).toEqual(['register_hooks'])
  })

  // ── Install + hook registration ──

  it('install rexistra 3 hooks', () => {
    const plugin = new HistoryPlugin()
    const registerHook = vi.fn()
    const api = { registerHook } as unknown as PluginAPI
    plugin.install({} as PluginEngineHandle, api)
    expect(registerHook).toHaveBeenCalledTimes(3)
    expect(registerHook).toHaveBeenCalledWith('afterUnlock', expect.any(Function))
    expect(registerHook).toHaveBeenCalledWith('afterLock', expect.any(Function))
    expect(registerHook).toHaveBeenCalledWith('afterRespec', expect.any(Function))
  })

  it('install cero usa engine', () => {
    const plugin = new HistoryPlugin()
    const registerHook = vi.fn()
    const api = { registerHook } as unknown as PluginAPI
    expect(() => plugin.install({} as PluginEngineHandle, api)).not.toThrow()
  })

  // ── Integration con TreeEngine real ──

  it('tras unlock, historia ten 1 entry de tipo unlock', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    const history = plugin.getHistory()
    expect(history).toHaveLength(1)
    expect(history[0]?.operation).toBe('unlock')
    expect(history[0]?.nodeIds).toEqual(['node-a'])
  })

  it('tras lock, historia engade entry lock', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    await engine.lock('node-a')
    const history = plugin.getHistory()
    expect(history).toHaveLength(2)
    expect(history[1]?.operation).toBe('lock')
  })

  it('tras respec, historia engade entry respec con nodeIds', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    await engine.respec()
    const history = plugin.getHistory()
    expect(history).toHaveLength(2)
    expect(history[1]?.operation).toBe('respec')
    expect(history[1]?.nodeIds).toContain('node-a')
  })

  it('HistoryEntry.timestamp propágase desde ctx', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    expect(plugin.getHistory()[0]?.timestamp).toBeGreaterThan(0)
  })

  it('HistoryEntry.locale propágase desde ctx', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    expect(plugin.getHistory()[0]?.locale).toBe('gl')
  })

  // ── FIFO behavior ──

  it('FIFO ao chegar a maxSize', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin({ maxSize: 2 })
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    await engine.unlock('node-b')
    await engine.lock('node-a')
    const history = plugin.getHistory()
    expect(history).toHaveLength(2)
    expect(history[0]?.nodeIds).toEqual(['node-b'])
    expect(history[1]?.operation).toBe('lock')
  })

  it('FIFO con maxSize=1', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin({ maxSize: 1 })
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    await engine.unlock('node-b')
    expect(plugin.size()).toBe(1)
    expect(plugin.getHistory()[0]?.nodeIds).toEqual(['node-b'])
  })

  it('FIFO con maxSize=0: historia sempre vacía', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin({ maxSize: 0 })
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    expect(plugin.size()).toBe(0)
  })

  // ── API pública ──

  it('clearHistory() borra entries', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    expect(plugin.size()).toBe(1)
    plugin.clearHistory()
    expect(plugin.size()).toBe(0)
  })

  it('size() devolve número correcto', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    expect(plugin.size()).toBe(0)
    await engine.unlock('node-a')
    expect(plugin.size()).toBe(1)
    await engine.unlock('node-b')
    expect(plugin.size()).toBe(2)
  })

  it('getHistory() devolve copia inmutable', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    const h1 = plugin.getHistory()
    const h2 = plugin.getHistory()
    expect(h1).not.toBe(h2)
    expect(h1).toEqual(h2)
  })

  // ── Uninstall ──

  it('uninstall borra entries', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    expect(plugin.size()).toBe(1)
    await engine.unregisterPlugin(plugin.id)
    expect(plugin.size()).toBe(0)
  })

  it('uninstall + reinstall preserva instancia', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin()
    await engine.registerPlugin(plugin)
    await engine.unlock('node-a')
    await engine.unregisterPlugin(plugin.id)
    await engine.registerPlugin(plugin)
    await engine.unlock('node-b')
    expect(plugin.size()).toBe(1)
    expect(plugin.getHistory()[0]?.nodeIds).toEqual(['node-b'])
  })

  // ── Edge cases ──

  it('múltiples operacións con maxSize=10: só últimas 10', async () => {
    const engine = new TreeEngine(makeCostTree())
    const plugin = new HistoryPlugin({ maxSize: 10 })
    await engine.registerPlugin(plugin)
    for (let i = 0; i < 15; i++) {
      await engine.unlock('node-a')
      await engine.lock('node-a')
    }
    expect(plugin.size()).toBe(10)
  })

  it('cancel via beforeUnlock NON engade entry', async () => {
    const engine = new TreeEngine(makeCostTree())
    const history = new HistoryPlugin()
    await engine.registerPlugin(history)
    await engine.registerPlugin({
      id: 'blocker',
      name: 'Blocker',
      version: '1.0.0',
      apiVersion: '1.0.0',
      install: (_eng, api) => {
        api.registerHook('beforeUnlock', () => false)
      },
    })
    await engine.unlock('node-a')
    expect(history.size()).toBe(0)
  })
})
// ── FIN: tests de HistoryPlugin ──
