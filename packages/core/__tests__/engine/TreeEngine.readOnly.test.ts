// ── INICIO: tests centralizados de TreeEngine read-only mode ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { Plugin, TreeDef } from '../../src/types/index.js'

function makeTree(): TreeDef {
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
    edges: [{ id: 'e1', source: 'node-a', target: 'node-b', type: 'dependency' }],
    layout: { type: 'radial' },
  }
}

function makeReadOnlyEngine(): TreeEngine {
  return new TreeEngine(makeTree(), { readOnly: true })
}

describe('TreeEngine read-only mode', () => {
  // ── Constructor + isReadOnly ──

  it('readOnly: true → isReadOnly() devolve true', () => {
    const engine = makeReadOnlyEngine()
    expect(engine.isReadOnly()).toBe(true)
  })

  it('default (sen readOnly) → isReadOnly() devolve false', () => {
    const engine = new TreeEngine(makeTree())
    expect(engine.isReadOnly()).toBe(false)
  })

  // ── 5 métodos existentes que xa bloquean ──

  it('unlock en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.unlock('node-a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('lock en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.lock('node-a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('respec en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.respec()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('applyChanges en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.applyChanges({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('tick en readOnly → devolve resultado vacío (cero muta)', () => {
    const engine = makeReadOnlyEngine()
    const result = engine.tick()
    expect(result.expired).toEqual([])
    expect(result.timestamp).toBeGreaterThan(0)
  })

  // ── 3 métodos novos (8.8) ──

  it('setProgress en readOnly → err READ_ONLY_VIOLATION', () => {
    const engine = makeReadOnlyEngine()
    const result = engine.setProgress('node-a', 50)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('restoreSnapshot en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.restoreSnapshot('non-existent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  it('loadLoadout en readOnly → err READ_ONLY_VIOLATION', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.loadLoadout('non-existent')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
    }
  })

  // ── Lectores funcionan en readOnly ──

  it('getNodeState funciona en readOnly', () => {
    const engine = makeReadOnlyEngine()
    const result = engine.getNodeState('node-a')
    expect(result).toBeDefined()
  })

  it('canUnlock funciona en readOnly', () => {
    const engine = makeReadOnlyEngine()
    const result = engine.canUnlock('node-a')
    expect(result.ok).toBe(true)
  })

  it('getStat funciona en readOnly', () => {
    const engine = makeReadOnlyEngine()
    const result = engine.getStat('totalUnlocked')
    expect(typeof result).toBe('number')
  })

  it('getBudget + getProgress + getTreeDef funcionan en readOnly', () => {
    const engine = makeReadOnlyEngine()
    expect(engine.getBudget()).toBeDefined()
    expect(typeof engine.getProgress('node-a')).toBe('number')
    expect(engine.getTreeDef()).toBeDefined()
  })

  // ── Storage non-mutating funciona en readOnly ──

  it('snapshot funciona en readOnly (cero muta state)', async () => {
    const engine = makeReadOnlyEngine()
    const snap = await engine.snapshot('test-label')
    expect(snap.id).toBeDefined()
    expect(snap.state).toBeDefined()
  })

  it('saveLoadout funciona en readOnly (cero muta state)', async () => {
    const engine = makeReadOnlyEngine()
    const result = await engine.saveLoadout('test-loadout')
    expect(result.ok).toBe(true)
  })

  it('getAuditLog + clearAuditLog funcionan en readOnly', () => {
    const engine = makeReadOnlyEngine()
    expect(engine.getAuditLog()).toBeDefined()
    engine.clearAuditLog()
  })

  // ── Plugins en readOnly ──

  it('registerPlugin funciona en readOnly', async () => {
    const engine = makeReadOnlyEngine()
    const plugin: Plugin = {
      id: 'test-plugin',
      name: 'Test',
      version: '0.1.0',
      apiVersion: '1.0.0',
      permissions: ['read_state'],
      install() {
        /* noop */
      },
    }
    await engine.registerPlugin(plugin)
    expect(engine.getPlugin('test-plugin')).not.toBeNull()
  })
})
// ── FIN: tests centralizados de TreeEngine read-only mode ──
