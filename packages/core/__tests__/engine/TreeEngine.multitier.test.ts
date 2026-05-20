// ── INICIO: tests de multi-tier unlock (DT-10, sub-fase 1.19) ──
// Cobre a semántica completa de `unlock` con `maxTier >= 2`:
//   - Fluxo feliz: cada reintento avanza un tier ata maxTier (→ 'maxed').
//   - Custos: cada salto consume getCostForTier(tier+1) atomicamente.
//   - Bloqueo en 'maxed': calquera reintento devolve NODE_ALREADY_UNLOCKED.
//   - Recursos insuficientes a media: o reintento falla, estado intacto.
//   - Invariantes para os casos esquina (decisión Opción C):
//       · maxTier === 1 → 'maxed' tras o primeiro unlock (semántica de
//         sempre, intacta).
//       · maxTier === undefined → 'unlocked' tras o primeiro; reintentos
//         devolven NODE_ALREADY_UNLOCKED (semántica de sempre, intacta).
//   - Eventos por tier: cada salto emite `unlock`, `stateChange`,
//     `budgetChange`.
//   - Audit por tier: cada salto rexistra `node_unlocked` co tier alcanzado.

import { ErrorCode } from '@yggdrasil-forge/common'
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
    id: 'multitier-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Multitier tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/** Árbore cun nodo multi-tier: maxTier=3, custo constante de 5 xp por tier. */
function makeMultiTierTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [
      makeNode('mt', {
        maxTier: 3,
        cost: [{ resourceId: 'xp', amount: 5 }],
      }),
    ],
  })
}

/** Árbore cun nodo multi-tier con custos ESCALADOS por tier. */
function makeScaledCostMultiTierTree(): TreeDef {
  return makeTreeDef({
    startingBudget: { resources: { xp: 100 } },
    resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
    nodes: [
      makeNode('mt', {
        maxTier: 3,
        costPerTier: [
          [{ resourceId: 'xp', amount: 5 }], // tier 1
          [{ resourceId: 'xp', amount: 10 }], // tier 2
          [{ resourceId: 'xp', amount: 15 }], // tier 3
        ],
      }),
    ],
  })
}

// ── Fluxo feliz e bloqueo en maxed ──

describe('multi-tier unlock — fluxo feliz', () => {
  it('maxTier=3 con custo constante: tres unlocks → unlocked, unlocked, maxed', async () => {
    const engine = new TreeEngine(makeMultiTierTree())

    const r1 = await engine.unlock('mt')
    expect(r1.ok).toBe(true)
    expect(engine.getNodeState('mt')?.state).toBe('unlocked')
    expect(engine.getNodeState('mt')?.currentTier).toBe(1)
    expect(engine.getBudget().resources.xp).toBe(95)

    const r2 = await engine.unlock('mt')
    expect(r2.ok).toBe(true)
    expect(engine.getNodeState('mt')?.state).toBe('unlocked')
    expect(engine.getNodeState('mt')?.currentTier).toBe(2)
    expect(engine.getBudget().resources.xp).toBe(90)

    const r3 = await engine.unlock('mt')
    expect(r3.ok).toBe(true)
    expect(engine.getNodeState('mt')?.state).toBe('maxed')
    expect(engine.getNodeState('mt')?.currentTier).toBe(3)
    expect(engine.getBudget().resources.xp).toBe(85)
  })

  it('maxTier=3 con custos escalados: cada tier consume o custo correspondente', async () => {
    const engine = new TreeEngine(makeScaledCostMultiTierTree())

    await engine.unlock('mt')
    expect(engine.getBudget().resources.xp).toBe(95) // 100 - 5

    await engine.unlock('mt')
    expect(engine.getBudget().resources.xp).toBe(85) // 95 - 10

    await engine.unlock('mt')
    expect(engine.getBudget().resources.xp).toBe(70) // 85 - 15
    expect(engine.getNodeState('mt')?.state).toBe('maxed')
  })

  it('tras maxed: reintento → NODE_ALREADY_UNLOCKED', async () => {
    const engine = new TreeEngine(makeMultiTierTree())
    await engine.unlock('mt')
    await engine.unlock('mt')
    await engine.unlock('mt') // maxed

    const r = await engine.unlock('mt')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe(ErrorCode.NODE_ALREADY_UNLOCKED)
    }
    // Estado e budget intactos.
    expect(engine.getNodeState('mt')?.state).toBe('maxed')
    expect(engine.getNodeState('mt')?.currentTier).toBe(3)
    expect(engine.getBudget().resources.xp).toBe(85)
  })

  it('canUnlock entre tiers: allowed: true mentres currentTier < maxTier', async () => {
    const engine = new TreeEngine(makeMultiTierTree())

    // Estado inicial: nodo locked → allowed: true (tier 1 reachable).
    let r = engine.canUnlock('mt')
    expect(r.ok && r.value.allowed).toBe(true)

    await engine.unlock('mt') // tier 1 → 'unlocked'
    r = engine.canUnlock('mt')
    expect(r.ok && r.value.allowed).toBe(true) // hai tiers libres

    await engine.unlock('mt') // tier 2 → 'unlocked'
    r = engine.canUnlock('mt')
    expect(r.ok && r.value.allowed).toBe(true) // aínda hai un tier libre

    await engine.unlock('mt') // tier 3 → 'maxed'
    r = engine.canUnlock('mt')
    expect(r.ok && r.value.allowed).toBe(false) // xa non
  })
})

// ── Atomicidade: recursos insuficientes a media ──

describe('multi-tier unlock — atomicidade', () => {
  it('recursos insuficientes a media: estado intacto en tier 2, unlocked (non maxed)', async () => {
    // Budget só para 2 tiers (10 xp) con custo constante de 5 xp.
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 10 } },
      resources: [{ id: 'xp', label: 'XP', refundable: true, refundPercent: 100 }],
      nodes: [
        makeNode('mt', {
          maxTier: 3,
          cost: [{ resourceId: 'xp', amount: 5 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)

    expect((await engine.unlock('mt')).ok).toBe(true)
    expect((await engine.unlock('mt')).ok).toBe(true)
    expect(engine.getNodeState('mt')?.currentTier).toBe(2)
    expect(engine.getNodeState('mt')?.state).toBe('unlocked')
    expect(engine.getBudget().resources.xp).toBe(0)

    // Terceiro intento falla por recursos.
    const r3 = await engine.unlock('mt')
    expect(r3.ok).toBe(false)
    if (!r3.ok) {
      expect(r3.error.code).toBe(ErrorCode.INSUFFICIENT_RESOURCES)
    }
    // Estado intacto: tier 2, 'unlocked', non 'maxed'.
    expect(engine.getNodeState('mt')?.currentTier).toBe(2)
    expect(engine.getNodeState('mt')?.state).toBe('unlocked')
    expect(engine.getBudget().resources.xp).toBe(0)
  })
})

// ── Invariantes Opción C: undefined ≠ 1 ──

describe('multi-tier unlock — invariantes de casos esquina (Opción C)', () => {
  it('maxTier === 1 explícito: o primeiro unlock pasa a maxed', async () => {
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 100 } },
      resources: [{ id: 'xp', label: 'XP' }],
      nodes: [makeNode('a', { maxTier: 1, cost: [{ resourceId: 'xp', amount: 5 }] })],
    })
    const engine = new TreeEngine(tree)
    const r = await engine.unlock('a')
    expect(r.ok).toBe(true)
    expect(engine.getNodeState('a')?.state).toBe('maxed')
    expect(engine.getNodeState('a')?.currentTier).toBe(1)

    // Reintento bloqueado.
    const r2 = await engine.unlock('a')
    expect(r2.ok).toBe(false)
    if (!r2.ok) {
      expect(r2.error.code).toBe(ErrorCode.NODE_ALREADY_UNLOCKED)
    }
  })

  it('maxTier === undefined: o primeiro unlock pasa a unlocked; reintento → NODE_ALREADY_UNLOCKED', async () => {
    // Invariante explícita da decisión Opción C: undefined NON é
    // equivalente a 1. Un nodo sen maxTier definido queda en 'unlocked'
    // (non 'maxed') e os reintentos rebotan con NODE_ALREADY_UNLOCKED,
    // exactamente como sempre.
    const tree = makeTreeDef({
      startingBudget: { resources: { xp: 100 } },
      resources: [{ id: 'xp', label: 'XP' }],
      nodes: [makeNode('a', { cost: [{ resourceId: 'xp', amount: 5 }] })],
    })
    const engine = new TreeEngine(tree)

    const r1 = await engine.unlock('a')
    expect(r1.ok).toBe(true)
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
    expect(engine.getNodeState('a')?.currentTier).toBe(1)

    const r2 = await engine.unlock('a')
    expect(r2.ok).toBe(false)
    if (!r2.ok) {
      expect(r2.error.code).toBe(ErrorCode.NODE_ALREADY_UNLOCKED)
    }
    // Estado intacto.
    expect(engine.getNodeState('a')?.state).toBe('unlocked')
    expect(engine.getNodeState('a')?.currentTier).toBe(1)
  })
})

// ── Eventos por tier ──

describe('multi-tier unlock — eventos', () => {
  it('cada salto emite unlock, stateChange e budgetChange', async () => {
    const engine = new TreeEngine(makeMultiTierTree())
    const unlockHandler = vi.fn()
    const stateChangeHandler = vi.fn()
    const budgetHandler = vi.fn()
    engine.on('unlock', unlockHandler)
    engine.on('stateChange', stateChangeHandler)
    engine.on('budgetChange', budgetHandler)

    await engine.unlock('mt')
    await engine.unlock('mt')
    await engine.unlock('mt')

    // Tres saltos → tres emisións de cada evento.
    expect(unlockHandler).toHaveBeenCalledTimes(3)
    expect(stateChangeHandler).toHaveBeenCalledTimes(3)
    expect(budgetHandler).toHaveBeenCalledTimes(3)

    // O último stateChange debe ter `to: 'maxed'`.
    const lastStateCall = stateChangeHandler.mock.calls[2]
    expect(lastStateCall?.[1].to).toBe('maxed')
  })
})

// ── Audit por tier ──

describe('multi-tier unlock — audit', () => {
  it('con audit activo: tres unlocks → tres entradas node_unlocked con tier 1, 2, 3', async () => {
    const engine = new TreeEngine(makeMultiTierTree(), { audit: { enabled: true } })

    await engine.unlock('mt')
    await engine.unlock('mt')
    await engine.unlock('mt')

    const log = engine.getAuditLog({ action: { type: 'node_unlocked' } })
    expect(log).toHaveLength(3)

    // O log devólvese máis recente primeiro: invertemos para ler en orde
    // cronolóxica e verificar os tiers.
    const tiers = log
      .map((e: AuditEntry) => (e.action.type === 'node_unlocked' ? e.action.tier : undefined))
      .reverse()
    expect(tiers).toEqual([1, 2, 3])
  })
})
// ── FIN: tests de multi-tier unlock (DT-10, sub-fase 1.19) ──
