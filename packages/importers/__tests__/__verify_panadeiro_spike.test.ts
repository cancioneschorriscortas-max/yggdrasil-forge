// ── INICIO: sonda runnable spike panadeiro (v2) ──
//
// Lección A.6.9 contra SVG baleiro silencioso + sanity do mapeo
// grupo→region que vai pintar o exemplo oberon-panadeiro.

import {
  ClusteredRadialLayout,
  IdentityLayout,
  LayoutEngineRegistry,
  RadialLayout,
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
})
// ── FIN: sonda spike panadeiro ──
