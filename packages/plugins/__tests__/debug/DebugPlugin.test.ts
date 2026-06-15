import { TreeEngine } from '@yggdrasil-forge/core'
import type { PluginAPI, PluginEngineHandle, TreeDef } from '@yggdrasil-forge/core'
// ── INICIO: tests de DebugPlugin ──
import { describe, expect, it, vi } from 'vitest'
import { DebugPlugin } from '../../src/debug/DebugPlugin.js'

function makeCostTree(): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [{ id: 'node-a', label: 'A', type: 'small', cost: [{ resourceId: 'xp', amount: 10 }] }],
    edges: [],
    layout: { type: 'radial' },
  }
}

function makeMockApi() {
  return {
    registerHook: vi.fn(),
    log: vi.fn(),
    emit: vi.fn(),
    registerCondition: vi.fn(),
    registerLayout: vi.fn(),
    registerStorageAdapter: vi.fn(),
  } as unknown as PluginAPI
}

describe('DebugPlugin', () => {
  // ── Constructor + configuration ──

  it('constructor sen opts: enabled=true, logLevel=debug', () => {
    const plugin = new DebugPlugin()
    expect(plugin.isEnabled()).toBe(true)
    expect(plugin.getLogLevel()).toBe('debug')
  })

  it('constructor con enabled=false', () => {
    const plugin = new DebugPlugin({ enabled: false })
    expect(plugin.isEnabled()).toBe(false)
  })

  it('constructor con logLevel=info', () => {
    const plugin = new DebugPlugin({ logLevel: 'info' })
    expect(plugin.getLogLevel()).toBe('info')
  })

  it('plugin properties correctas', () => {
    const plugin = new DebugPlugin()
    expect(plugin.id).toBe('yggdrasil-debug')
    expect(plugin.name).toBe('Debug Plugin')
    expect(plugin.version).toBe('0.1.0')
    expect(plugin.apiVersion).toBe('1.0.0')
    expect(plugin.permissions).toEqual(['register_hooks'])
  })

  // ── Install behavior ──

  it('install con enabled=true rexistra 8 hooks', () => {
    const plugin = new DebugPlugin()
    const api = makeMockApi()
    plugin.install({} as PluginEngineHandle, api)
    expect(api.registerHook).toHaveBeenCalledTimes(8)
    expect(api.registerHook).toHaveBeenCalledWith('beforeUnlock', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('afterUnlock', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('beforeLock', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('afterLock', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('beforeRespec', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('afterRespec', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('computeUnlockability', expect.any(Function))
    expect(api.registerHook).toHaveBeenCalledWith('computeCost', expect.any(Function))
  })

  it('install con enabled=false cero hooks rexistrados', () => {
    const plugin = new DebugPlugin({ enabled: false })
    const api = makeMockApi()
    plugin.install({} as PluginEngineHandle, api)
    expect(api.registerHook).not.toHaveBeenCalled()
  })

  // ── Integration con TreeEngine real ──

  it('unlock loga beforeUnlock + afterUnlock', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin())
    const spy = vi.spyOn(console, 'debug').mockImplementation(vi.fn())
    await engine.unlock('node-a')
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls.some((c) => String(c[0]).includes('beforeUnlock'))).toBe(true)
    expect(calls.some((c) => String(c[0]).includes('afterUnlock'))).toBe(true)
    spy.mockRestore()
  })

  it('lock loga beforeLock + afterLock', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin())
    await engine.unlock('node-a')
    const spy = vi.spyOn(console, 'debug').mockImplementation(vi.fn())
    await engine.lock('node-a')
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(calls.some((c) => String(c[0]).includes('beforeLock'))).toBe(true)
    expect(calls.some((c) => String(c[0]).includes('afterLock'))).toBe(true)
    spy.mockRestore()
  })

  it('canUnlock loga computeUnlockability; resultado inchanged', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin())
    const spy = vi.spyOn(console, 'debug').mockImplementation(vi.fn())
    const result = engine.canUnlock('node-a')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.allowed).toBe(true)
    }
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('computeUnlockability'))
    expect(calls.length).toBeGreaterThanOrEqual(1)
    spy.mockRestore()
  })

  it('respec loga beforeRespec + afterRespec', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin())
    await engine.unlock('node-a')
    const spy = vi.spyOn(console, 'debug').mockImplementation(vi.fn())
    await engine.respec()
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(calls.some((c) => String(c[0]).includes('beforeRespec'))).toBe(true)
    expect(calls.some((c) => String(c[0]).includes('afterRespec'))).toBe(true)
    spy.mockRestore()
  })

  // ── LogLevel propagation ──

  it('logLevel=debug usa console.debug', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin({ logLevel: 'debug' }))
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(vi.fn())
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(vi.fn())
    await engine.unlock('node-a')
    const debugCalls = debugSpy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    const infoCalls = infoSpy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(debugCalls.length).toBeGreaterThan(0)
    expect(infoCalls.length).toBe(0)
    debugSpy.mockRestore()
    infoSpy.mockRestore()
  })

  it('logLevel=info usa console.info', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin({ logLevel: 'info' }))
    const spy = vi.spyOn(console, 'info').mockImplementation(vi.fn())
    await engine.unlock('node-a')
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(calls.length).toBeGreaterThan(0)
    spy.mockRestore()
  })

  it('logLevel=warn usa console.warn', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin({ logLevel: 'warn' }))
    const spy = vi.spyOn(console, 'warn').mockImplementation(vi.fn())
    await engine.unlock('node-a')
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(calls.length).toBeGreaterThan(0)
    spy.mockRestore()
  })

  it('logLevel=error usa console.error', async () => {
    const engine = new TreeEngine(makeCostTree())
    await engine.registerPlugin(new DebugPlugin({ logLevel: 'error' }))
    const spy = vi.spyOn(console, 'error').mockImplementation(vi.fn())
    await engine.unlock('node-a')
    const calls = spy.mock.calls.filter((c) => String(c[0]).includes('yggdrasil-debug'))
    expect(calls.length).toBeGreaterThan(0)
    spy.mockRestore()
  })

  // ── Uninstall ──

  it('uninstall non lanza erro', () => {
    const plugin = new DebugPlugin()
    expect(() => plugin.uninstall({} as PluginEngineHandle)).not.toThrow()
  })
})
// ── FIN: tests de DebugPlugin ──
