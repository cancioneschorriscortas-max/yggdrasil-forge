// ── INICIO: tests de AuditLogger (1.16) ──
import { describe, expect, it, vi } from 'vitest'
import { AuditLogger } from '../../src/engine/index.js'
import type { AuditAction } from '../../src/types/index.js'

const ACTION_UNLOCK: AuditAction = { type: 'node_unlocked', nodeId: 'a', tier: 1 }
const ACTION_LOCK: AuditAction = { type: 'node_locked', nodeId: 'b' }

describe('AuditLogger', () => {
  describe('desactivado (default)', () => {
    it('record devolve null e non rexistra nada', () => {
      const log = new AuditLogger()
      expect(log.record(ACTION_UNLOCK)).toBeNull()
      expect(log.size()).toBe(0)
    })

    it('query devolve []', () => {
      const log = new AuditLogger()
      log.record(ACTION_UNLOCK)
      expect(log.query()).toEqual([])
    })

    it('enabled:false explícito tamén é no-op', () => {
      const log = new AuditLogger({ enabled: false })
      expect(log.record(ACTION_LOCK)).toBeNull()
      expect(log.size()).toBe(0)
    })
  })

  describe('activado', () => {
    it('record crea entrada con id, timestamp e action', () => {
      const log = new AuditLogger({ enabled: true })
      const before = Date.now()
      const entry = log.record(ACTION_UNLOCK)
      const after = Date.now()
      expect(entry).not.toBeNull()
      if (entry === null) return
      expect(typeof entry.id).toBe('string')
      expect(entry.id.length).toBeGreaterThan(0)
      expect(entry.timestamp).toBeGreaterThanOrEqual(before)
      expect(entry.timestamp).toBeLessThanOrEqual(after)
      expect(entry.action).toEqual(ACTION_UNLOCK)
      expect(log.size()).toBe(1)
    })

    it('ids son únicos entre entradas', () => {
      const log = new AuditLogger({ enabled: true })
      const a = log.record(ACTION_UNLOCK)
      const b = log.record(ACTION_LOCK)
      const c = log.record(ACTION_UNLOCK)
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(c).not.toBeNull()
      const ids = new Set([a?.id, b?.id, c?.id])
      expect(ids.size).toBe(3)
    })

    it('actor, context e rollbackable só aparecen se se pasan', () => {
      const log = new AuditLogger({ enabled: true })
      const plain = log.record(ACTION_UNLOCK)
      expect(plain?.actor).toBeUndefined()
      expect(plain?.context).toBeUndefined()
      expect(plain?.rollbackable).toBeUndefined()
      const full = log.record(ACTION_LOCK, {
        actor: 'student-42',
        context: { reason: 'manual' },
        rollbackable: true,
      })
      expect(full?.actor).toBe('student-42')
      expect(full?.context).toEqual({ reason: 'manual' })
      expect(full?.rollbackable).toBe(true)
    })

    it('context gárdase como copia (illado de mutacións externas)', () => {
      const log = new AuditLogger({ enabled: true })
      const ctx = { count: 1 }
      const entry = log.record(ACTION_UNLOCK, { context: ctx })
      ctx.count = 999
      expect(entry?.context).toEqual({ count: 1 })
    })
  })

  describe('límite FIFO', () => {
    it('ao superar maxEntries descártanse as máis antigas', () => {
      const log = new AuditLogger({ enabled: true, maxEntries: 3 })
      log.record({ type: 'custom', name: '1', data: null })
      log.record({ type: 'custom', name: '2', data: null })
      log.record({ type: 'custom', name: '3', data: null })
      log.record({ type: 'custom', name: '4', data: null })
      expect(log.size()).toBe(3)
      // query devolve máis recente primeiro: 4, 3, 2 (1 descartada).
      const names = log.query().map((e) => {
        return e.action.type === 'custom' ? e.action.name : ''
      })
      expect(names).toEqual(['4', '3', '2'])
    })
  })

  describe('query con filtros', () => {
    it('filtra por actor exacto', () => {
      const log = new AuditLogger({ enabled: true })
      log.record(ACTION_UNLOCK, { actor: 'alice' })
      log.record(ACTION_LOCK, { actor: 'bob' })
      log.record(ACTION_UNLOCK, { actor: 'alice' })
      const res = log.query({ actor: 'alice' })
      expect(res).toHaveLength(2)
      expect(res.every((e) => e.actor === 'alice')).toBe(true)
    })

    it('filtra por action.type exacto', () => {
      const log = new AuditLogger({ enabled: true })
      log.record(ACTION_UNLOCK)
      log.record(ACTION_LOCK)
      log.record(ACTION_UNLOCK)
      const res = log.query({ action: { type: 'node_unlocked' } })
      expect(res).toHaveLength(2)
      expect(res.every((e) => e.action.type === 'node_unlocked')).toBe(true)
    })

    it('filtra por rango from/to inclusivo', () => {
      const log = new AuditLogger({ enabled: true })
      const spy = vi.spyOn(Date, 'now')
      spy.mockReturnValue(100)
      log.record(ACTION_UNLOCK)
      spy.mockReturnValue(200)
      log.record(ACTION_LOCK)
      spy.mockReturnValue(300)
      log.record(ACTION_UNLOCK)
      spy.mockRestore()
      const res = log.query({ from: 200, to: 300 })
      expect(res).toHaveLength(2)
      expect(res.map((e) => e.timestamp).sort()).toEqual([200, 300])
    })

    it('limit corta as N máis recentes', () => {
      const log = new AuditLogger({ enabled: true })
      log.record({ type: 'custom', name: '1', data: null })
      log.record({ type: 'custom', name: '2', data: null })
      log.record({ type: 'custom', name: '3', data: null })
      const res = log.query({ limit: 2 })
      expect(res).toHaveLength(2)
      const names = res.map((e) => (e.action.type === 'custom' ? e.action.name : ''))
      expect(names).toEqual(['3', '2'])
    })

    it('query devolve copia (mutar o resultado non afecta o log)', () => {
      const log = new AuditLogger({ enabled: true })
      log.record(ACTION_UNLOCK)
      const res = log.query()
      res.pop()
      expect(log.size()).toBe(1)
    })

    it('filtros combinados (actor + type)', () => {
      const log = new AuditLogger({ enabled: true })
      log.record(ACTION_UNLOCK, { actor: 'alice' })
      log.record(ACTION_LOCK, { actor: 'alice' })
      log.record(ACTION_UNLOCK, { actor: 'bob' })
      const res = log.query({ actor: 'alice', action: { type: 'node_unlocked' } })
      expect(res).toHaveLength(1)
      expect(res[0]?.actor).toBe('alice')
      expect(res[0]?.action.type).toBe('node_unlocked')
    })
  })

  describe('clear', () => {
    it('baleira o rexistro', () => {
      const log = new AuditLogger({ enabled: true })
      log.record(ACTION_UNLOCK)
      log.record(ACTION_LOCK)
      expect(log.size()).toBe(2)
      log.clear()
      expect(log.size()).toBe(0)
      expect(log.query()).toEqual([])
    })
  })
})
// ── FIN: tests de AuditLogger ──
