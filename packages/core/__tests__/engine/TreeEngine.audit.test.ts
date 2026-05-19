// ── INICIO: tests de integración audit en TreeEngine (1.16) ──
import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { AuditEntry, NodeDef, TreeDef } from '../../src/types/index.js'

// ── Helpers ──

function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    label: id,
    type: 'passive',
    ...overrides,
  }
}

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/** Árbore simple sen custo: unlock/lock libres. */
function makeSimpleTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
  })
}

/** Árbore onde 'expensive' non se pode pagar (budget insuficiente). */
function makeCostTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 5 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [makeNode('expensive', { cost: [{ resourceId: 'xp', amount: 20 }] })],
  })
}

describe('TreeEngine — integración audit', () => {
  describe('audit desactivado (default)', () => {
    it('getAuditLog devolve [] aínda con mutacións', async () => {
      const engine = new TreeEngine(makeSimpleTree())
      await engine.unlock('a')
      await engine.lock('a')
      expect(engine.getAuditLog()).toEqual([])
    })

    it('logAudit manual é no-op se desactivado', () => {
      const engine = new TreeEngine(makeSimpleTree())
      engine.logAudit({ type: 'custom', name: 'x', data: 1 })
      expect(engine.getAuditLog()).toEqual([])
    })
  })

  describe('audit activado — rexistro automático', () => {
    it('unlock OK rexistra node_unlocked', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      await engine.unlock('a')
      const log = engine.getAuditLog()
      expect(log).toHaveLength(1)
      expect(log[0]?.action).toEqual({ type: 'node_unlocked', nodeId: 'a', tier: 1 })
      expect(log[0]?.rollbackable).toBe(true)
    })

    it('lock OK rexistra node_locked', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      await engine.unlock('a')
      await engine.lock('a')
      const res = engine.getAuditLog({ action: { type: 'node_locked' } })
      expect(res).toHaveLength(1)
      expect(res[0]?.action).toEqual({ type: 'node_locked', nodeId: 'a' })
      expect(res[0]?.rollbackable).toBe(true)
    })

    it('respec OK rexistra respec coa lista de nodeIds', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      await engine.unlock('a')
      await engine.respec('a')
      const res = engine.getAuditLog({ action: { type: 'respec' } })
      expect(res).toHaveLength(1)
      const action = res[0]?.action
      expect(action?.type).toBe('respec')
      if (action?.type === 'respec') {
        expect(action.nodeIds).toContain('a')
      }
    })

    it('applyChanges OK rexistra tree_changed', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      await engine.applyChanges([{ type: 'add_node', node: makeNode('d') }])
      const res = engine.getAuditLog({ action: { type: 'tree_changed' } })
      expect(res).toHaveLength(1)
      expect(res[0]?.action.type).toBe('tree_changed')
      // tree_changed non é rollbackable (decisión do briefing).
      expect(res[0]?.rollbackable).toBeUndefined()
    })

    it('as 4 mutacións xeran 4 entradas', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      await engine.unlock('a')
      await engine.lock('a')
      await engine.unlock('b')
      await engine.respec('b')
      await engine.applyChanges([{ type: 'add_node', node: makeNode('z') }])
      expect(engine.getAuditLog()).toHaveLength(5)
    })
  })

  describe('os erros de mutación NON rexistran', () => {
    it('unlock que falla por recursos non engade entrada', async () => {
      const engine = new TreeEngine(makeCostTree(), { audit: { enabled: true } })
      const result = await engine.unlock('expensive')
      expect(result.ok).toBe(false)
      expect(engine.getAuditLog()).toEqual([])
    })

    it('readOnly: unlock bloqueado non rexistra', async () => {
      const engine = new TreeEngine(makeSimpleTree(), {
        readOnly: true,
        audit: { enabled: true },
      })
      const result = await engine.unlock('a')
      expect(result.ok).toBe(false)
      expect(engine.getAuditLog()).toEqual([])
    })
  })

  describe('evento auditEntry', () => {
    it('emítese cando hai rexistro automático', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      const received: AuditEntry[] = []
      engine.on('auditEntry', (e) => received.push(e))
      await engine.unlock('a')
      expect(received).toHaveLength(1)
      expect(received[0]?.action.type).toBe('node_unlocked')
    })

    it('NON se emite se audit está desactivado', async () => {
      const engine = new TreeEngine(makeSimpleTree())
      const handler = vi.fn()
      engine.on('auditEntry', handler)
      await engine.unlock('a')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('API manual logAudit', () => {
    it('rexistra unha acción custom e emite auditEntry', () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      const handler = vi.fn()
      engine.on('auditEntry', handler)
      engine.logAudit(
        { type: 'custom', name: 'note', data: { msg: 'ola' } },
        { actor: 'teacher-1' },
      )
      const log = engine.getAuditLog()
      expect(log).toHaveLength(1)
      expect(log[0]?.action).toEqual({ type: 'custom', name: 'note', data: { msg: 'ola' } })
      expect(log[0]?.actor).toBe('teacher-1')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('clearAuditLog', () => {
    it('baleira o rexistro', async () => {
      const engine = new TreeEngine(makeSimpleTree(), { audit: { enabled: true } })
      await engine.unlock('a')
      await engine.unlock('b')
      expect(engine.getAuditLog()).toHaveLength(2)
      engine.clearAuditLog()
      expect(engine.getAuditLog()).toEqual([])
    })
  })

  describe('maxEntries configurable', () => {
    it('aplica o límite FIFO desde TreeEngineOptions', async () => {
      const engine = new TreeEngine(makeSimpleTree(), {
        audit: { enabled: true, maxEntries: 2 },
      })
      await engine.unlock('a')
      await engine.unlock('b')
      await engine.unlock('c')
      const log = engine.getAuditLog()
      expect(log).toHaveLength(2)
      // Máis recente primeiro: c, b (a descartada).
      const ids = log.map((e) => (e.action.type === 'node_unlocked' ? e.action.nodeId : ''))
      expect(ids).toEqual(['c', 'b'])
    })
  })
})
// ── FIN: tests de integración audit en TreeEngine ──
