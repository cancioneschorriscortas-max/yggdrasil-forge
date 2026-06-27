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

// ── V5: arestas derivadas + startAngle ──
//
// **Duplicación intencional**. A lóxica orixinal vive en
// `examples/oberon-panadeiro/src/deriveEdges.ts` (consumidor-side, sen
// React). Tentamos importala con ruta relativa para probar o código
// REAL, pero o `tsconfig.json` de @importers ten `rootDir: "."` con
// `include: ["src/**/*", "__tests__/**/*"]` → TS6059 ("not under rootDir").
// Ampliar `include` para alcanzar `examples/` é tocar a config do
// paquete, fóra do alcance "todo consumidor-side" do briefing v5; este
// fallback foi explicitamente autorizado polo Director: "se a ruta non
// resolve, duplica a función mínima inline". Manter sincronizada a man
// con `examples/oberon-panadeiro/src/deriveEdges.ts` (se diverxen, a
// fonte da verdade é o exemplo). Se algún día `deriveEdges` gradúa a
// `@importers`/`@core`, esta duplicación desaparece e a sonda pasa a
// importala directamente — o test segue válido sen cambios.

type Topology = 'none' | 'star' | 'hub' | 'chain'

function deriveEdges(
  def: ReturnType<typeof importGaiaProfession>,
  topology: Topology,
): import('@yggdrasil-forge/core').EdgeDef[] {
  if (topology === 'none') return []
  const rootId = def.nodes.find((n) => n.type === 'root')?.id
  if (rootId === undefined) return []

  const byGroup = new Map<string, string[]>()
  for (const n of def.nodes) {
    if (n.group !== undefined) {
      const arr = byGroup.get(n.group) ?? []
      arr.push(n.id)
      byGroup.set(n.group, arr)
    }
  }

  const mkEdge = (source: string, target: string): import('@yggdrasil-forge/core').EdgeDef => ({
    id: `derived:${source}->${target}`,
    source,
    target,
    type: 'path',
  })

  const derived: import('@yggdrasil-forge/core').EdgeDef[] = []
  for (const members of byGroup.values()) {
    const first = members[0]
    if (first === undefined) continue
    if (topology === 'star') {
      for (const m of members) derived.push(mkEdge(rootId, m))
    } else if (topology === 'hub') {
      derived.push(mkEdge(rootId, first))
      for (let i = 1; i < members.length; i++) {
        const m = members[i]
        if (m !== undefined) derived.push(mkEdge(first, m))
      }
    } else {
      derived.push(mkEdge(rootId, first))
      for (let i = 0; i < members.length - 1; i++) {
        const a = members[i]
        const b = members[i + 1]
        if (a !== undefined && b !== undefined) derived.push(mkEdge(a, b))
      }
    }
  }
  return derived
}

describe('spike: panadeiro v5 — arestas derivadas + startAngle', () => {
  const buildDef = (startAngle?: number) =>
    importGaiaProfession(panadeiro as unknown as GaiaProfession, {
      layout: {
        type: 'clustered-radial',
        groupRadius: 320,
        memberLayout: 'fan',
        meshType: 'none',
        ...(startAngle !== undefined ? { startAngle } : {}),
      },
    })

  it('para star/hub/chain, todo source/target é un node.id real', () => {
    const def = buildDef()
    const ids = new Set(def.nodes.map((n) => n.id))
    const microCount = def.nodes.filter((n) => n.type === 'small').length

    for (const topo of ['star', 'hub', 'chain'] as Topology[]) {
      const edges = deriveEdges(def, topo)
      expect(edges.length, `topology=${topo} debe producir arestas`).toBeGreaterThan(0)
      // Conta esperada: star = nº microskills; chain = nº microskills;
      // hub = nº microskills (raíz→ancla por grupo + ancla→satélites).
      expect(edges.length, `topology=${topo} conta`).toBe(microCount)
      for (const e of edges) {
        expect(ids.has(e.source), `source ${e.source} non é id real`).toBe(true)
        expect(ids.has(e.target), `target ${e.target} non é id real`).toBe(true)
        expect(e.type).toBe('path')
        expect(e.id).toBe(`derived:${e.source}->${e.target}`)
      }
    }

    expect(deriveEdges(def, 'none')).toEqual([])
  })

  it('arestas type:path NON crean gates (canUnlock e unlock intactos)', async () => {
    const baseDef = buildDef()
    const derived = deriveEdges(baseDef, 'chain')
    const defWithEdges: typeof baseDef = { ...baseDef, edges: [...baseDef.edges, ...derived] }

    const micro = baseDef.nodes.find((n) => n.type === 'small')
    if (micro === undefined) throw new Error('sen microskills no fixture')

    // Sen arestas: o microskill desbloquéase normalmente.
    const eBase = new TreeEngine(baseDef)
    const r0 = await eBase.unlock(micro.id)
    expect(r0.ok, `sen edges: ${r0.ok ? '' : r0.error.message}`).toBe(true)

    // Con arestas derivadas (type:'path'): mesma capacidade de unlock,
    // multi-tier ×3 segue (A.6.35). As arestas son visuais, non gates.
    const eEdg = new TreeEngine(defWithEdges)
    const r1 = await eEdg.unlock(micro.id)
    expect(r1.ok, `con edges (t1): ${r1.ok ? '' : r1.error.message}`).toBe(true)
    const r2 = await eEdg.unlock(micro.id)
    expect(r2.ok, `con edges (t2): ${r2.ok ? '' : r2.error.message}`).toBe(true)
    const r3 = await eEdg.unlock(micro.id)
    expect(r3.ok, `con edges (t3): ${r3.ok ? '' : r3.error.message}`).toBe(true)
    expect(eEdg.getNodeState(micro.id)?.state).toBe('maxed')
  })

  it('computeLayout(...).ok con arestas e cos dous valores de startAngle', () => {
    const registry = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new RadialLayout())
      .register(new TreeLayout())
      .register(new ClusteredRadialLayout())

    for (const startAngle of [-Math.PI / 2, Math.PI / 2]) {
      const base = buildDef(startAngle)
      const derived = deriveEdges(base, 'chain')
      const def: typeof base = { ...base, edges: [...base.edges, ...derived] }

      const res = computeLayout(def, registry, 'gl')
      expect(res.ok, `startAngle=${startAngle}: ${res.ok ? '' : res.error.message}`).toBe(true)
      if (!res.ok) continue

      // Sanidade: tantas arestas no layout coma na def.
      expect(res.value.edges.size).toBe(def.edges.length)
    }
  })
})
// ── FIN: sonda spike panadeiro ──
