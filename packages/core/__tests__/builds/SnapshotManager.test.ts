// ── INICIO: tests de SnapshotManager ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { describe, expect, it } from 'vitest'
import { SnapshotManager } from '../../src/builds/SnapshotManager.js'
import type { TreeState } from '../../src/types/index.js'

function makeState(overrides?: Partial<TreeState>): TreeState {
  return {
    nodes: { 'node-a': { state: 'locked', points: 0 } },
    budget: { resources: {} },
    ...overrides,
  } as TreeState
}

describe('SnapshotManager', () => {
  it('constructor sen storage: cero error', () => {
    const mgr = new SnapshotManager()
    expect(mgr).toBeDefined()
  })

  it('create() engade snapshot á Map', async () => {
    const mgr = new SnapshotManager()
    const snap = await mgr.create(makeState(), 'build-1')
    expect(snap.id).toMatch(/^snap-/)
    expect(snap.buildId).toBe('build-1')
    const list = await mgr.list()
    expect(list).toHaveLength(1)
  })

  it('create() con label opcional preserva label', async () => {
    const mgr = new SnapshotManager()
    const snap = await mgr.create(makeState(), 'build-1', 'Antes do respec')
    expect(snap.label).toBe('Antes do respec')
  })

  it('create() sen label: snapshot.label é undefined', async () => {
    const mgr = new SnapshotManager()
    const snap = await mgr.create(makeState(), 'build-1')
    expect(snap.label).toBeUndefined()
  })

  it('create() xera ids únicos', async () => {
    const mgr = new SnapshotManager()
    const s1 = await mgr.create(makeState(), 'b1')
    const s2 = await mgr.create(makeState(), 'b2')
    expect(s1.id).not.toBe(s2.id)
  })

  it('list() devolve snapshots en orde de inserción', async () => {
    const mgr = new SnapshotManager()
    const s1 = await mgr.create(makeState(), 'b1')
    const s2 = await mgr.create(makeState(), 'b2')
    const list = await mgr.list()
    expect(list[0].id).toBe(s1.id)
    expect(list[1].id).toBe(s2.id)
  })

  it('restore() devolve ok(snapshot) para id existente', async () => {
    const mgr = new SnapshotManager()
    const snap = await mgr.create(makeState(), 'b1')
    const result = await mgr.restore(snap.id)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe(snap.id)
    }
  })

  it('restore() devolve err(SNAPSHOT_NOT_FOUND) para id inexistente', async () => {
    const mgr = new SnapshotManager()
    const result = await mgr.restore('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.SNAPSHOT_NOT_FOUND)
    }
  })

  it('delete() removes do Map', async () => {
    const mgr = new SnapshotManager()
    const snap = await mgr.create(makeState(), 'b1')
    const result = await mgr.delete(snap.id)
    expect(result.ok).toBe(true)
    const list = await mgr.list()
    expect(list).toHaveLength(0)
  })

  it('delete() devolve err(SNAPSHOT_NOT_FOUND) para id inexistente', async () => {
    const mgr = new SnapshotManager()
    const result = await mgr.delete('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.SNAPSHOT_NOT_FOUND)
    }
  })

  it('con storage: create() persiste; novo manager carga via list() (lazy init)', async () => {
    const storage = new MemoryStorage()
    const mgr1 = new SnapshotManager(storage)
    const snap = await mgr1.create(makeState(), 'b1', 'test')
    const mgr2 = new SnapshotManager(storage)
    const list = await mgr2.list()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(snap.id)
    expect(list[0].label).toBe('test')
  })

  it('con storage: delete() borra de storage tamén', async () => {
    const storage = new MemoryStorage()
    const mgr1 = new SnapshotManager(storage)
    const snap = await mgr1.create(makeState(), 'b1')
    await mgr1.delete(snap.id)
    const mgr2 = new SnapshotManager(storage)
    const list = await mgr2.list()
    expect(list).toHaveLength(0)
  })
})
// ── FIN: tests de SnapshotManager ──
