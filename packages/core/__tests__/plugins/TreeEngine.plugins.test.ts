// ── INICIO: tests de TreeEngine plugin APIs (8.4.a) ──
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

function makePlugin(id: string): Plugin {
  return {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '1.0.0',
    install: vi.fn(),
  }
}

describe('TreeEngine plugin APIs (8.4.a)', () => {
  it('registerPlugin(plugin) devolve ok para plugin novo', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = await engine.registerPlugin(makePlugin('p1'))
    expect(result.ok).toBe(true)
  })

  it('registerPlugin(duplicate) devolve err(PLUGIN_ALREADY_REGISTERED)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1')
    await engine.registerPlugin(plugin)
    const result = await engine.registerPlugin(plugin)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_ALREADY_REGISTERED)
    }
  })

  it('unregisterPlugin(id) devolve ok para plugin rexistrado', async () => {
    const engine = new TreeEngine(makeTreeDef())
    await engine.registerPlugin(makePlugin('p1'))
    const result = await engine.unregisterPlugin('p1')
    expect(result.ok).toBe(true)
  })

  it('unregisterPlugin(inexistente) devolve err(PLUGIN_NOT_FOUND)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = await engine.unregisterPlugin('ghost')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.PLUGIN_NOT_FOUND)
    }
  })

  it('getPlugin(id) devolve plugin rexistrado; null se non', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const plugin = makePlugin('p1')
    await engine.registerPlugin(plugin)
    expect(engine.getPlugin('p1')).toBe(plugin)
    expect(engine.getPlugin('ghost')).toBeNull()
  })

  it('listPlugins() devolve readonly array con plugins rexistrados', async () => {
    const engine = new TreeEngine(makeTreeDef())
    await engine.registerPlugin(makePlugin('p1'))
    await engine.registerPlugin(makePlugin('p2'))
    const list = engine.listPlugins()
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('p1')
    expect(list[1].id).toBe('p2')
  })
})
// ── FIN: tests de TreeEngine plugin APIs (8.4.a) ──
