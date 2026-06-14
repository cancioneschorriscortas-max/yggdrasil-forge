// ── INICIO: tests de TreeEngine.loadout ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes: [{ id: 'node-a', label: 'Node A', type: 'passive' }],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

describe('TreeEngine.loadout', () => {
  it('engine.saveLoadout("Tank") devolve ok(loadout)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = await engine.saveLoadout('Tank')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Tank')
      expect(result.value.build.treeId).toBe('test-tree')
    }
  })

  it('engine.saveLoadout("Tank") emite loadoutSaved', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const handler = vi.fn()
    engine.on('loadoutSaved', handler)
    await engine.saveLoadout('Tank')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('engine.saveLoadout("") devolve err(LOADOUT_NAME_INVALID)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = await engine.saveLoadout('')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LOADOUT_NAME_INVALID)
    }
  })

  it('engine.loadLoadout("inexistente") devolve err(LOADOUT_NOT_FOUND)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = await engine.loadLoadout('inexistente')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LOADOUT_NOT_FOUND)
    }
  })

  it('engine.loadLoadout("Tank") aplica state + emite loadoutLoaded', async () => {
    const engine = new TreeEngine(makeTreeDef())
    await engine.saveLoadout('Tank')
    const handler = vi.fn()
    engine.on('loadoutLoaded', handler)
    const result = await engine.loadLoadout('Tank')
    expect(result.ok).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('roundtrip: saveLoadout → mudar state → loadLoadout → state recuperado', async () => {
    const treeDef = makeTreeDef({
      resources: [{ id: 'gold', label: 'Gold', initial: 100 }],
    })
    const engine = new TreeEngine(treeDef)
    const stateBefore = engine.getSnapshot()
    await engine.saveLoadout('Baseline')
    // Aplicar o loadout (sen cambios intermedios, verifica roundtrip)
    await engine.loadLoadout('Baseline')
    const stateAfter = engine.getSnapshot()
    expect(stateAfter.budget).toEqual(stateBefore.budget)
  })

  it('engine.listLoadouts() despois de saveLoadout 3 veces con nomes distintos devolve 3 entries', async () => {
    const engine = new TreeEngine(makeTreeDef())
    await engine.saveLoadout('A')
    await engine.saveLoadout('B')
    await engine.saveLoadout('C')
    const list = await engine.listLoadouts()
    expect(list).toHaveLength(3)
  })

  it('con storage opt-in: novo engine carga loadouts persistidos', async () => {
    const storage = new MemoryStorage()
    const treeDef = makeTreeDef()
    const engine1 = new TreeEngine(treeDef, { storage })
    await engine1.saveLoadout('Tank')
    const engine2 = new TreeEngine(treeDef, { storage })
    const list = await engine2.listLoadouts()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Tank')
  })
})
// ── FIN: tests de TreeEngine.loadout ──
