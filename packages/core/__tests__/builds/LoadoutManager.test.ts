// ── INICIO: tests de LoadoutManager ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { describe, expect, it } from 'vitest'
import { LoadoutManager } from '../../src/builds/LoadoutManager.js'
import type { Build } from '../../src/types/index.js'

function makeBuild(overrides?: Partial<Build>): Build {
  return {
    id: 'build-1',
    treeId: 'tree-1',
    treeVersion: '1.0.0',
    schemaVersion: '1.0.0',
    createdAt: 1000,
    updatedAt: 2000,
    state: {
      nodes: { 'node-a': { state: 'locked', points: 0 } },
      budget: { resources: {} },
    },
    ...overrides,
  } as Build
}

describe('LoadoutManager', () => {
  it('constructor sen storage: cero error', () => {
    const mgr = new LoadoutManager()
    expect(mgr).toBeDefined()
  })

  it('save() engade loadout; updatedAt timestamp', async () => {
    const mgr = new LoadoutManager()
    const before = Date.now()
    const result = await mgr.save('Tank', makeBuild())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Tank')
      expect(result.value.updatedAt).toBeGreaterThanOrEqual(before)
    }
  })

  it('save() sobreescribe loadout existente refrescando updatedAt', async () => {
    const mgr = new LoadoutManager()
    const r1 = await mgr.save('Tank', makeBuild())
    expect(r1.ok).toBe(true)
    const r2 = await mgr.save('Tank', makeBuild({ id: 'build-2' }))
    expect(r2.ok).toBe(true)
    if (r2.ok) {
      expect(r2.value.build.id).toBe('build-2')
    }
    const list = await mgr.list()
    expect(list).toHaveLength(1)
  })

  it('save() con name vacío devolve err(LOADOUT_NAME_INVALID)', async () => {
    const mgr = new LoadoutManager()
    const result = await mgr.save('', makeBuild())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LOADOUT_NAME_INVALID)
    }
  })

  it('save() con name whitespace-only devolve err(LOADOUT_NAME_INVALID)', async () => {
    const mgr = new LoadoutManager()
    const result = await mgr.save('   ', makeBuild())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LOADOUT_NAME_INVALID)
    }
  })

  it('save() con nome con espazos no medio é válido', async () => {
    const mgr = new LoadoutManager()
    const result = await mgr.save('Glass cannon', makeBuild())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Glass cannon')
    }
  })

  it('load() devolve ok(loadout) para name existente', async () => {
    const mgr = new LoadoutManager()
    await mgr.save('Tank', makeBuild())
    const result = await mgr.load('Tank')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Tank')
    }
  })

  it('load() devolve err(LOADOUT_NOT_FOUND) para name inexistente', async () => {
    const mgr = new LoadoutManager()
    const result = await mgr.load('Ghost')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LOADOUT_NOT_FOUND)
    }
  })

  it('load() case-sensitive: Tank ≠ tank', async () => {
    const mgr = new LoadoutManager()
    await mgr.save('Tank', makeBuild())
    const result = await mgr.load('tank')
    expect(result.ok).toBe(false)
  })

  it('list() devolve loadouts en orde de inserción', async () => {
    const mgr = new LoadoutManager()
    await mgr.save('A', makeBuild())
    await mgr.save('B', makeBuild())
    const list = await mgr.list()
    expect(list[0].name).toBe('A')
    expect(list[1].name).toBe('B')
  })

  it('delete() borra; subsequente load devolve err', async () => {
    const mgr = new LoadoutManager()
    await mgr.save('Tank', makeBuild())
    const delResult = await mgr.delete('Tank')
    expect(delResult.ok).toBe(true)
    const loadResult = await mgr.load('Tank')
    expect(loadResult.ok).toBe(false)
  })

  it('delete() devolve err(LOADOUT_NOT_FOUND) para name inexistente', async () => {
    const mgr = new LoadoutManager()
    const result = await mgr.delete('Ghost')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LOADOUT_NOT_FOUND)
    }
  })

  it('con storage: delete() borra de storage tamén', async () => {
    const storage = new MemoryStorage()
    const mgr1 = new LoadoutManager(storage)
    await mgr1.save('Tank', makeBuild())
    await mgr1.delete('Tank')
    const mgr2 = new LoadoutManager(storage)
    const list = await mgr2.list()
    expect(list).toHaveLength(0)
  })

  it('con storage: lazy init carga loadouts via list()', async () => {
    const storage = new MemoryStorage()
    const mgr1 = new LoadoutManager(storage)
    await mgr1.save('Tank', makeBuild())
    const mgr2 = new LoadoutManager(storage)
    const list = await mgr2.list()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Tank')
  })
})
// ── FIN: tests de LoadoutManager ──
