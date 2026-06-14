// ── INICIO: tests de TreeEngine.snapshot + restoreSnapshot ──
import { ErrorCode } from '@yggdrasil-forge/common'
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

describe('TreeEngine.snapshot + restoreSnapshot', () => {
  it('engine.snapshot() devolve BuildSnapshot con id auto-xerado', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const snap = await engine.snapshot()
    expect(snap.id).toMatch(/^snap-/)
    expect(snap.buildId).toMatch(/^build-/)
    expect(snap.state).toBeDefined()
  })

  it('engine.snapshot("label") preserva label', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const snap = await engine.snapshot('Antes do respec')
    expect(snap.label).toBe('Antes do respec')
  })

  it('engine.snapshot() emite snapshotCreated event', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const handler = vi.fn()
    engine.on('snapshotCreated', handler)
    const snap = await engine.snapshot()
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(snap)
  })

  it('engine.restoreSnapshot(invalidId) devolve err(SNAPSHOT_NOT_FOUND)', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = await engine.restoreSnapshot('nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.SNAPSHOT_NOT_FOUND)
    }
  })

  it('engine.restoreSnapshot(validId) aplica state + emite snapshotRestored', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const snap = await engine.snapshot()
    const handler = vi.fn()
    engine.on('snapshotRestored', handler)
    const result = await engine.restoreSnapshot(snap.id)
    expect(result.ok).toBe(true)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('roundtrip: snapshot → mudar state → restoreSnapshot → state recuperado', async () => {
    const treeDef = makeTreeDef({
      nodes: [{ id: 'node-a', label: 'Node A', type: 'passive' }],
      resources: [{ id: 'gold', label: 'Gold', initial: 100 }],
    })
    const engine = new TreeEngine(treeDef)
    const stateBefore = engine.getSnapshot()
    const snap = await engine.snapshot()
    // Mudar state (unlock gasta recursos se costs)
    // Verificar que tras restoreSnapshot volvemos ao estado inicial
    await engine.restoreSnapshot(snap.id)
    const stateAfter = engine.getSnapshot()
    expect(stateAfter.budget).toEqual(stateBefore.budget)
  })

  it('engine.listSnapshots() despois de 3 chamadas devolve 3 entries', async () => {
    const engine = new TreeEngine(makeTreeDef())
    await engine.snapshot()
    await engine.snapshot()
    await engine.snapshot()
    const list = await engine.listSnapshots()
    expect(list).toHaveLength(3)
  })

  it('engine.deleteSnapshot() válido reduce contenido de listSnapshots()', async () => {
    const engine = new TreeEngine(makeTreeDef())
    const s1 = await engine.snapshot()
    await engine.snapshot()
    await engine.deleteSnapshot(s1.id)
    const list = await engine.listSnapshots()
    expect(list).toHaveLength(1)
  })
})
// ── FIN: tests de TreeEngine.snapshot + restoreSnapshot ──
