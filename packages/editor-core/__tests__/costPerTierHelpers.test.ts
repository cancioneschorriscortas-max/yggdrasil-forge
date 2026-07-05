// ── INICIO: tests costPerTierHelpers (7.5f §1) ──
// **Semántica densa (adendo do Arquitecto)**: o editor autora sempre
// arrays densos. Non hai sparse. Fila baleira `[]` = gratis. "Volver
// á base" só a nivel de campo (dispatch undefined).

import type { Cost } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import {
  COST_PER_TIER_STRINGS,
  costPerTierRowsFor,
  packCostPerTier,
  rankLabel,
} from '../src/property/costPerTierHelpers.js'

describe('★ costPerTierRowsFor (denso)', () => {
  it('sen current + maxTier=3 → 3 filas todas []', () => {
    const rows = costPerTierRowsFor(3, undefined)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ tier: 1, costs: [] })
    expect(rows[1]).toEqual({ tier: 2, costs: [] })
    expect(rows[2]).toEqual({ tier: 3, costs: [] })
  })

  it('sen current + maxTier=1 → 1 fila []', () => {
    const rows = costPerTierRowsFor(1, undefined)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ tier: 1, costs: [] })
  })

  it('maxTier=undefined + sen current → 1 fila (clamp)', () => {
    const rows = costPerTierRowsFor(undefined, undefined)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.costs).toEqual([])
  })

  it('maxTier=undefined + current de 3 → 3 filas (usa lonxitude de current)', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c2: Cost[] = [{ resourceId: 'xp', amount: 20 }]
    const c3: Cost[] = [{ resourceId: 'xp', amount: 30 }]
    const rows = costPerTierRowsFor(undefined, [c1, c2, c3])
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.costs)).toEqual([c1, c2, c3])
  })

  it('maxTier=0 → clamp a 1', () => {
    const rows = costPerTierRowsFor(0, undefined)
    expect(rows).toHaveLength(1)
  })

  it('current cheo → 3 filas con costs específicos', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c2: Cost[] = [{ resourceId: 'xp', amount: 20 }]
    const c3: Cost[] = [{ resourceId: 'xp', amount: 30 }]
    const rows = costPerTierRowsFor(3, [c1, c2, c3])
    expect(rows.map((r) => r.costs)).toEqual([c1, c2, c3])
  })

  it('current máis longo que maxTier → trunca a maxTier', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c2: Cost[] = [{ resourceId: 'xp', amount: 20 }]
    const c3: Cost[] = [{ resourceId: 'xp', amount: 30 }]
    const rows = costPerTierRowsFor(2, [c1, c2, c3])
    expect(rows).toHaveLength(2)
    expect(rows[0]?.costs).toEqual(c1)
    expect(rows[1]?.costs).toEqual(c2)
  })

  it('current máis curto que maxTier → completa con []', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const rows = costPerTierRowsFor(3, [c1])
    expect(rows).toHaveLength(3)
    expect(rows[0]?.costs).toEqual(c1)
    expect(rows[1]?.costs).toEqual([])
    expect(rows[2]?.costs).toEqual([])
  })

  it('costs=[] preservase (gratis neste rango)', () => {
    const rows = costPerTierRowsFor(2, [[], [{ resourceId: 'xp', amount: 5 }]])
    expect(rows[0]?.costs).toEqual([])
    expect(rows[1]?.costs).toHaveLength(1)
  })
})

describe('★ packCostPerTier (denso, sen sparse, sen null)', () => {
  it('rows baleiro + maxTier=3 → [[],[],[]]', () => {
    const packed = packCostPerTier(3, [])
    expect(packed).toEqual([[], [], []])
    expect(packed).toHaveLength(3)
    expect(0 in packed).toBe(true)
    expect(1 in packed).toBe(true)
    expect(2 in packed).toBe(true)
  })

  it('rows cheo → array denso normal', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c2: Cost[] = [{ resourceId: 'xp', amount: 20 }]
    const packed = packCostPerTier(2, [c1, c2])
    expect(packed).toEqual([c1, c2])
  })

  it('curto → completa con []', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const packed = packCostPerTier(3, [c1])
    expect(packed).toEqual([c1, [], []])
    expect(packed).toHaveLength(3)
  })

  it('trunca a maxTier', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c2: Cost[] = [{ resourceId: 'xp', amount: 20 }]
    const c3: Cost[] = [{ resourceId: 'xp', amount: 30 }]
    const packed = packCostPerTier(2, [c1, c2, c3])
    expect(packed).toEqual([c1, c2])
  })

  it('maxTier=undefined → usa rows.length', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c2: Cost[] = [{ resourceId: 'xp', amount: 20 }]
    const packed = packCostPerTier(undefined, [c1, c2])
    expect(packed).toHaveLength(2)
  })

  it('maxTier=undefined + rows.length=0 → 1', () => {
    const packed = packCostPerTier(undefined, [])
    expect(packed).toHaveLength(1)
    expect(packed[0]).toEqual([])
  })

  it('★ round-trip: pack → rowsFor mantén todos os custos', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const c3: Cost[] = [{ resourceId: 'xp', amount: 30 }]
    // Modelo: rango 2 é gratis ([]).
    const packed = packCostPerTier(3, [c1, [], c3])
    expect(packed).toEqual([c1, [], c3])
    const rows = costPerTierRowsFor(3, packed)
    expect(rows[0]?.costs).toEqual(c1)
    expect(rows[1]?.costs).toEqual([])
    expect(rows[2]?.costs).toEqual(c3)
  })

  it('★ round-trip: JSON stringify/parse sobrevive (invariante clave)', () => {
    const c1: Cost[] = [{ resourceId: 'xp', amount: 10 }]
    const packed = packCostPerTier(3, [c1, [], []])
    const round = JSON.parse(JSON.stringify(packed))
    expect(round).toEqual([c1, [], []])
    // NON hai null tras round-trip (a diferencia de arrays sparse).
    expect(JSON.stringify(round)).not.toContain('null')
  })
})

describe('Strings localizadas', () => {
  it('COST_PER_TIER_STRINGS ten labels en gl', () => {
    const strs = [
      COST_PER_TIER_STRINGS.header,
      COST_PER_TIER_STRINGS.headerHelp,
      COST_PER_TIER_STRINGS.noCostThisTier,
      COST_PER_TIER_STRINGS.rankPrefix,
      COST_PER_TIER_STRINGS.clearField,
    ]
    for (const s of strs) {
      const gl = typeof s === 'object' ? s.gl : s
      expect(gl).toBeDefined()
    }
  })

  it('rankLabel(3) = "Rango 3" en gl (default)', () => {
    expect(rankLabel(3)).toBe('Rango 3')
  })

  it('rankLabel(2, "en") = "Rank 2"', () => {
    expect(rankLabel(2, 'en')).toBe('Rank 2')
  })

  it('★ headerHelp menciona "Custo base" (referencia clara)', () => {
    const help = COST_PER_TIER_STRINGS.headerHelp
    const gl = typeof help === 'object' ? help.gl : help
    expect(gl).toContain('Custo base')
  })
})
// ── FIN: tests costPerTierHelpers ──
