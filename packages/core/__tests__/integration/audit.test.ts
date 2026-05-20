// ── INICIO: integración — auditoría end-to-end (1.18) ──
// Activamos audit:{enabled:true} e executamos unha secuencia de mutacións
// (unlock, lock, respec, applyChanges, logAudit manual). Comprobamos que
// getAuditLog reflicte a historia completa, que os filtros funcionan, e
// que `auditEntry` emítese por cada entrada creada.

import { describe, expect, it, vi } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { AuditEntry } from '../../src/types/index.js'
import { makeNode, makeRichTreeDef } from './fixtures.js'

describe('integración — auditoría end-to-end', () => {
  it('secuencia de mutacións xera as entradas esperadas no log e emite auditEntry', async () => {
    const engine = new TreeEngine(makeRichTreeDef(), { audit: { enabled: true } })
    const seen: AuditEntry[] = []
    engine.on('auditEntry', (entry) => {
      seen.push(entry)
    })

    await engine.unlock('root')
    await engine.unlock('a')
    await engine.lock('a')
    await engine.respec()
    await engine.applyChanges([{ type: 'add_node', node: makeNode('extra') }])
    engine.logAudit({ type: 'custom', name: 'mark', data: { step: 'fin' } })

    // O log debe ter 6 entradas na orde rexistrada (query devolve máis recente
    // primeiro, polo que invertemos).
    const log = engine.getAuditLog()
    expect(log).toHaveLength(6)
    const types = log.map((e) => e.action.type).reverse()
    expect(types).toEqual([
      'node_unlocked',
      'node_unlocked',
      'node_locked',
      'respec',
      'tree_changed',
      'custom',
    ])

    // O número de eventos auditEntry emitidos coincide co tamaño do log.
    expect(seen).toHaveLength(6)
  })

  it('filtros do audit log: por tipo e por límite', async () => {
    const engine = new TreeEngine(makeRichTreeDef(), { audit: { enabled: true } })
    await engine.unlock('root')
    await engine.unlock('a')
    await engine.lock('a')
    await engine.lock('root')

    // Por tipo node_locked → 2.
    const locks = engine.getAuditLog({ action: { type: 'node_locked' } })
    expect(locks).toHaveLength(2)
    for (const e of locks) {
      expect(e.action.type).toBe('node_locked')
    }

    // Por límite (1) → só a máis recente.
    const last = engine.getAuditLog({ limit: 1 })
    expect(last).toHaveLength(1)
    expect(last[0]?.action.type).toBe('node_locked')
  })

  it('clearAuditLog vacía o rexistro', async () => {
    const engine = new TreeEngine(makeRichTreeDef(), { audit: { enabled: true } })
    await engine.unlock('root')
    expect(engine.getAuditLog()).toHaveLength(1)
    engine.clearAuditLog()
    expect(engine.getAuditLog()).toEqual([])
  })

  it('audit desactivado: getAuditLog é sempre baleiro aínda con mutacións', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const listener = vi.fn()
    engine.on('auditEntry', listener)
    await engine.unlock('root')
    await engine.unlock('a')
    expect(engine.getAuditLog()).toEqual([])
    expect(listener).not.toHaveBeenCalled()
  })

  it('audit non rexistra erros: unlock fallido NON xera entrada', async () => {
    const engine = new TreeEngine(makeRichTreeDef(), { audit: { enabled: true } })
    await engine.unlock('a') // falla por PREREQUISITES_NOT_MET
    expect(engine.getAuditLog()).toEqual([])
  })
})
// ── FIN: integración — auditoría end-to-end (1.18) ──
