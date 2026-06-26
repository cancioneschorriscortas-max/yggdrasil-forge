// ── INICIO: sonda runnable spike panadeiro (v3) ──
//
// Lección A.6.9 contra SVG baleiro silencioso + sanity do mapeo
// grupo→region que vai pintar o exemplo oberon-panadeiro.
//
// V3: engádese unha sonda de RUNTIME (unlock x3 por tier). Os exemplos
// punta-de-lanza poden cubrir forma de layout (estática) PERO non
// cubrir comportamento de motor (multi-tier, prereqs, custos). A
// crítica do v2 (microskills atascados en 1/3) escapou da sonda v2
// porque só validaba layout; ese tipo de bug pílase aquí.

import {
  ClusteredRadialLayout,
  IdentityLayout,
  LayoutEngineRegistry,
  RadialLayout,
  TreeEngine,
  TreeLayout,
  computeLayout,
} from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { type GaiaProfession, importGaiaProfession } from '../src/gaia.js'
import panadeiro from './fixtures/panadeiro.fixture.json'

describe('spike: panadeiro → clustered-radial (v2)', () => {
  it('produce un layout con posicións espalladas (anti SVG-baleiro)', () => {
    const def = importGaiaProfession(panadeiro as unknown as GaiaProfession, {
      layout: {
        type: 'clustered-radial',
        groupRadius: 320,
        memberLayout: 'list',
        meshType: 'spokes',
      },
    })

    const registry = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new RadialLayout())
      .register(new TreeLayout())
      .register(new ClusteredRadialLayout())

    const res = computeLayout(def, registry, 'gl')
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const pts = [...res.value.nodes.values()]
    // 20 nodos no TreeDef resultante (1 root profession + 19 microskills).
    expect(pts.length).toBe(20)

    // Espalladas + algunha lonxe do centro.
    const distinct = new Set(pts.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`))
    expect(distinct.size).toBeGreaterThan(10)
    const maxR = Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))
    expect(maxR).toBeGreaterThan(160) // > groupRadius/2 (groupRadius=320)
  })

  it('cada un dos 5 grupos ten ≥ 1 microskill (sanity grupo→region)', () => {
    const def = importGaiaProfession(panadeiro as unknown as GaiaProfession, {
      layout: {
        type: 'clustered-radial',
        groupRadius: 320,
        memberLayout: 'list',
        meshType: 'spokes',
      },
    })

    expect(def.groups).toBeDefined()
    expect(def.groups?.length).toBe(5)

    const expectedGroupIds = new Set([
      'panadeiro_forno_masas',
      'panadeiro_tempos_fermentacion',
      'panadeiro_sabor_creatividade',
      'panadeiro_resistencia_oficio',
      'panadeiro_materia_prima',
    ])
    const actualGroupIds = new Set(def.groups?.map((g) => g.id))
    for (const id of expectedGroupIds) {
      expect(actualGroupIds.has(id)).toBe(true)
    }

    // Cada grupo ten ≥ 1 nodo cuxo `node.group === groupId`.
    for (const groupId of expectedGroupIds) {
      const members = def.nodes.filter((n) => n.group === groupId)
      expect(members.length, `grupo ${groupId} debe ter ≥ 1 nodo`).toBeGreaterThan(0)
    }
  })

  it('un microskill multi-tier sobe os 3 tiers (runtime probe v3)', async () => {
    const def = importGaiaProfession(panadeiro as unknown as GaiaProfession, {
      layout: {
        type: 'clustered-radial',
        groupRadius: 320,
        memberLayout: 'fan',
        meshType: 'spokes',
      },
    })
    const e = new TreeEngine(def)
    // Calquera microskill (type 'small'); o panadeiro non ten prereqs nin
    // costs na fixture, polo que calquera deles serve.
    const micro = def.nodes.find((n) => n.type === 'small')
    if (micro === undefined) throw new Error('sen microskills no fixture')

    const r1 = await e.unlock(micro.id)
    expect(r1.ok, `tier1: ${r1.ok ? '' : r1.error.message}`).toBe(true)
    const r2 = await e.unlock(micro.id)
    expect(r2.ok, `tier2: ${r2.ok ? '' : r2.error.message}`).toBe(true)
    const r3 = await e.unlock(micro.id)
    expect(r3.ok, `tier3: ${r3.ok ? '' : r3.error.message}`).toBe(true)

    // Tras tier 3, o nodo deberia estar en 'maxed' (sen máis unlocks).
    const stMaxed = e.getNodeState(micro.id)?.state
    expect(stMaxed).toBe('maxed')
  })
})
// ── FIN: sonda spike panadeiro ──
