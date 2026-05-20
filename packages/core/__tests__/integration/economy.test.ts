// ── INICIO: integración — economía + prerequisites (1.18) ──
// Recursos insuficientes, prerequisites incumpridos, exclusións mutuas:
// cada fallo debe ser ATÓMICO (estado intacto), e devolver o .code exacto.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import { makeMultiTierTreeDef, makeRichTreeDef } from './fixtures.js'

describe('integración — economía e prerequisites', () => {
  it('unlock falla por INSUFFICIENT_RESOURCES, estado intacto', async () => {
    const engine = new TreeEngine(makeRichTreeDef())

    // root é gratis; despois desbloqueamos a e b para chegar a c.
    await engine.unlock('root')
    await engine.unlock('a')
    await engine.unlock('c') // 10 xp
    // Quedan 50 - 5 - 10 = 35 xp e 5 sp.
    // keystone require 20 xp + 1 sp, podemos pagalo. Drenemos primeiro.

    // Bloqueamos a (devolve 5xp → 40) e desbloqueamos b (5xp → 35).
    await engine.lock('a')
    await engine.unlock('b')

    // Para forzar fallo: respec parcial de root non é viable; en vez diso,
    // creamos engine con orzamento moi baixo.
    const lowBudget = new TreeEngine({
      ...makeRichTreeDef(),
      startingBudget: { resources: { xp: 1, sp: 0 } },
    })
    await lowBudget.unlock('root')
    const stateBefore = lowBudget.getNodeState('a')
    const budgetBefore = lowBudget.getBudget().resources.xp

    const result = await lowBudget.unlock('a') // require 5 xp
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)
    }
    // Atomicidade: nin estado nin budget cambiaron.
    expect(lowBudget.getNodeState('a')).toEqual(stateBefore)
    expect(lowBudget.getBudget().resources.xp).toBe(budgetBefore)
  })

  it('unlock falla por PREREQUISITES_NOT_MET', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    // Intentar desbloquear 'a' sen 'root' debe fallar.
    const r = await engine.unlock('a')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.PREREQUISITES_NOT_MET)
    }
    // Estado de 'a' segue sen instancia.
    expect(engine.getNodeState('a')).toBeNull()
  })

  it('unlock falla por EXCLUSION_VIOLATION', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    await engine.unlock('root')
    await engine.unlock('a')
    await engine.unlock('b')
    await engine.unlock('c') // c queda unlocked → d quedará excluído

    const r = await engine.unlock('d')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.EXCLUSION_VIOLATION)
    }
  })

  it('unlock falla por NODE_NOT_FOUND con id inexistente', async () => {
    const engine = new TreeEngine(makeRichTreeDef())
    const r = await engine.unlock('no-existe')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
    }
  })

  it('maxTier=1: o primeiro unlock deixa o nodo en maxed e bloquea reintentos', async () => {
    // O motor da Fase 1 trata `unlock` como operación única por nodo (non
    // hai escalado de tier en runtime polo método unlock; o multi-tier real
    // é fase posterior). Verificamos a transición a maxed cando maxTier=1 e
    // que un segundo unlock devolve NODE_ALREADY_UNLOCKED.
    const engine = new TreeEngine({
      ...makeMultiTierTreeDef(),
      nodes: [
        {
          id: 'one',
          type: 'small',
          label: 'one',
          maxTier: 1,
          cost: [{ resourceId: 'xp', amount: 5 }],
        },
      ],
    })

    const r1 = await engine.unlock('one')
    expect(r1.ok).toBe(true)
    expect(engine.getNodeState('one')?.state).toBe('maxed')
    expect(engine.getNodeState('one')?.currentTier).toBe(1)

    const r2 = await engine.unlock('one')
    expect(r2.ok).toBe(false)
    if (!r2.ok) {
      expect(r2.error.code).toBe(ErrorCode.NODE_ALREADY_UNLOCKED)
    }
  })

  it('readOnly bloquea unlock, lock e respec con READ_ONLY_VIOLATION', async () => {
    const engine = new TreeEngine(makeRichTreeDef(), { readOnly: true })

    const rU = await engine.unlock('root')
    const rL = await engine.lock('root')
    const rR = await engine.respec()
    for (const r of [rU, rL, rR]) {
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.error.code).toBe(ErrorCode.READ_ONLY_VIOLATION)
      }
    }
  })
})
// ── FIN: integración — economía + prerequisites (1.18) ──
