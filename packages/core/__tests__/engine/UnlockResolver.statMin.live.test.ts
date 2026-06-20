// ── INICIO: tests stat_min reads live stats (1a-fix-core BUG 1) ──
// Verifica que `stat_min` (en canUnlock e explainUnlock) avalúa
// contra o valor en vivo do StatComputer, non contra a caché morta
// `state.computedStats` que sempre era 0.
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

function makeStatTree(): TreeDef {
  return {
    id: 'stat-min-fix',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Stat min',
    rootNodeId: 'a',
    stats: [{ id: 'pwr', label: 'Power', initial: 6 }],
    layout: { type: 'custom' },
    nodes: [
      {
        id: 'a',
        type: 'notable',
        maxTier: 1,
        label: 'A',
        position: { x: 0, y: 0 },
        statContributions: [{ statId: 'pwr', op: '+', value: 3 }],
      },
      {
        id: 'b',
        type: 'notable',
        maxTier: 1,
        label: 'B',
        position: { x: 0, y: 0 },
        statContributions: [{ statId: 'pwr', op: '+', value: 2 }],
      },
      {
        id: 'gated-easy',
        type: 'notable',
        maxTier: 1,
        label: 'Easy',
        position: { x: 0, y: 0 },
        prerequisites: { type: 'stat_min', statId: 'pwr', amount: 8 },
      },
      {
        id: 'gated-hard',
        type: 'notable',
        maxTier: 1,
        label: 'Hard',
        position: { x: 0, y: 0 },
        prerequisites: { type: 'stat_min', statId: 'pwr', amount: 15 },
      },
    ],
    edges: [],
  }
}

describe('stat_min reads live stats (1a-fix-core BUG 1)', () => {
  it('engine.getStat e UnlockResolver ven o mesmo valor agora', async () => {
    const engine = new TreeEngine(makeStatTree())
    await engine.unlock('a') // pwr = 6 + 3 = 9
    expect(engine.getStat('pwr')).toBe(9)

    // Antes do fix: explainUnlock veería pwr=0 (caché morta).
    // Despois do fix: pwr=9 vía StatComputer en vivo.
    const expl = engine.explainUnlock('gated-easy')
    expect(expl.ok).toBe(true)
    if (expl.ok) {
      expect(expl.value.satisfied).toBe(true)
      // O `reason` (cando insatisfacción) debe reflectir o valor real.
      // Para este caso (satisfeito), o test máis directo é o satisfied.
    }
  })

  it('canUnlock(gated-easy).allowed=true tras superar o umbral', async () => {
    const engine = new TreeEngine(makeStatTree())
    // Sen contribucións: pwr = 6 → 8 require ≥ 8: falla.
    let check = engine.canUnlock('gated-easy')
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.value.allowed).toBe(false)

    // Co A: pwr = 6 + 3 = 9 ≥ 8 → pasa.
    await engine.unlock('a')
    check = engine.canUnlock('gated-easy')
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.value.allowed).toBe(true)
  })

  it('canUnlock(gated-hard).allowed=false aínda con A e B (pwr=11 < 15)', async () => {
    const engine = new TreeEngine(makeStatTree())
    await engine.unlock('a')
    await engine.unlock('b')
    expect(engine.getStat('pwr')).toBe(11) // 6 + 3 + 2

    const check = engine.canUnlock('gated-hard')
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.value.allowed).toBe(false)
  })

  it('explainUnlock reason inclúe o valor real do stat (non 0)', async () => {
    const engine = new TreeEngine(makeStatTree())
    await engine.unlock('a') // pwr = 9

    const expl = engine.explainUnlock('gated-hard') // require ≥ 15
    expect(expl.ok).toBe(true)
    if (expl.ok) {
      expect(expl.value.satisfied).toBe(false)
      expect(expl.value.conditions.length).toBe(1)
      const cond = expl.value.conditions[0]
      // reason é LocalizedString; pode ser un dict por locale.
      // Verificamos que NON aparece "(is 0)" / "(é 0)" / "(es 0)".
      const reason = cond?.reason
      let reasonStr = ''
      if (typeof reason === 'string') reasonStr = reason
      else if (reason && typeof reason === 'object') {
        reasonStr = Object.values(reason).join(' ')
      }
      expect(reasonStr).not.toMatch(/\bis 0\b|\bé 0\b|\bes 0\b/)
      // E que reflicte 9 nalgunha forma (o valor real).
      expect(reasonStr).toMatch(/\b9\b/)
    }
  })

  it('paladín-style: faith=12 ≥ 10 → divine-judgment desbloquéase', async () => {
    // Replica directa do caso real do Paladín: 3 nodos contribuíntes
    // (holy-light +3, healing-hands +2, smite +1) e un nodo con stat_min.
    const tree: TreeDef = {
      id: 'paladin-mini',
      schemaVersion: '1.0.0',
      version: '0.0.0',
      label: 'Paladin mini',
      rootNodeId: 'holy-light',
      stats: [{ id: 'faith', label: 'Faith', initial: 6 }],
      layout: { type: 'custom' },
      nodes: [
        {
          id: 'holy-light',
          type: 'notable',
          maxTier: 3,
          label: 'Holy Light',
          position: { x: 0, y: 0 },
          statContributions: [{ statId: 'faith', op: '+', value: 3 }],
        },
        {
          id: 'healing-hands',
          type: 'notable',
          maxTier: 2,
          label: 'Healing Hands',
          position: { x: 0, y: 0 },
          prerequisites: { type: 'node_unlocked', nodeId: 'holy-light' },
          statContributions: [{ statId: 'faith', op: '+', value: 2 }],
        },
        {
          id: 'smite',
          type: 'notable',
          maxTier: 1,
          label: 'Smite',
          position: { x: 0, y: 0 },
          prerequisites: { type: 'node_unlocked', nodeId: 'holy-light' },
          statContributions: [{ statId: 'faith', op: '+', value: 1 }],
        },
        {
          id: 'divine-judgment',
          type: 'notable',
          maxTier: 1,
          label: 'Divine Judgment',
          position: { x: 0, y: 0 },
          prerequisites: { type: 'stat_min', statId: 'faith', amount: 10 },
        },
      ],
      edges: [],
    }
    const engine = new TreeEngine(tree)
    await engine.unlock('holy-light')
    await engine.unlock('healing-hands')
    await engine.unlock('smite')

    expect(engine.getStat('faith')).toBe(12) // 6 + 3 + 2 + 1

    const check = engine.canUnlock('divine-judgment')
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.value.allowed).toBe(true)
  })
})

describe('Backwards compatibility (consumers without engine)', () => {
  it('ctx sen getStat: cae á caché morta (sempre 0), comportamento legacy', async () => {
    // Importamos UnlockResolver para probar directamente.
    const { UnlockResolver } = await import('../../src/engine/UnlockResolver.js')
    const resolver = new UnlockResolver()
    const ctx = {
      treeDef: makeStatTree(),
      state: {
        nodes: {},
        resources: {},
        stats: {},
        computedStats: {}, // caché morta, sempre vacía
        version: '0.0.0',
        schemaVersion: '1.0.0',
      },
    }
    // Sen getStat inxectado, faith=0 → stat_min(8) falla.
    const satisfied = resolver.evaluate(
      { type: 'stat_min', statId: 'pwr', amount: 8 },
      // biome-ignore lint/suspicious/noExplicitAny: test de retrocompatibilidade — ctx sen getStat.
      ctx as any,
    )
    expect(satisfied).toBe(false)
  })
})
// ── FIN: tests stat_min live ──
