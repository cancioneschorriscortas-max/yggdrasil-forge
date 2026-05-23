// ── INICIO: tests de TreeEngine.getStat / getAllStats (2.2.b) ──
// Valida a integración do StatComputer no TreeEngine:
//  - getStat / getAllStats expostos na API pública.
//  - Invalidación automática da cache tras unlock / lock / respec /
//    applyChanges.
//  - modify_stat segue como EFFECT_TYPE_UNSUPPORTED (regresión).
//
// NON proba a lóxica interna do StatComputer (xa cuberta na 2.2): só
// o cableado.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type {
  NodeDef,
  StatContribution,
  StatDef,
  TreeChange,
  TreeDef,
} from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    label: id,
    type: 'small',
    ...overrides,
  }
}

function makeStat(id: string, overrides?: Partial<StatDef>): StatDef {
  return {
    id,
    label: id,
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

// ───────────────────────────────────────────────
// 1. getStat — lecturas básicas
// ───────────────────────────────────────────────

describe('TreeEngine.getStat — lecturas básicas', () => {
  it('devolve initial cando ningún nodo desbloqueado contribúe', () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 10 })],
      nodes: [makeNode('a')],
    })
    const engine = new TreeEngine(tree)
    expect(engine.getStat('damage')).toBe(10)
  })

  it('devolve 0 se non hai initial nin contribucións', () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage')],
    })
    expect(new TreeEngine(tree).getStat('damage')).toBe(0)
  })

  it('reflicte unha contribución activa tras unlock exitoso', async () => {
    const contribs: readonly StatContribution[] = [{ statId: 'damage', op: '+', value: 5 }]
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 0 })],
      nodes: [makeNode('a', { statContributions: contribs })],
    })
    const engine = new TreeEngine(tree)
    expect(engine.getStat('damage')).toBe(0)
    const r = await engine.unlock('a')
    expect(r.ok).toBe(true)
    expect(engine.getStat('damage')).toBe(5)
  })

  it('statId descoñecido devolve NaN', () => {
    const tree = makeTreeDef({ stats: [makeStat('damage')] })
    expect(new TreeEngine(tree).getStat('nope')).toBeNaN()
  })

  it('treeDef sen stats: getStat de calquera id devolve NaN', () => {
    const engine = new TreeEngine(makeTreeDef({ nodes: [makeNode('a')] }))
    expect(engine.getStat('damage')).toBeNaN()
  })
})

// ───────────────────────────────────────────────
// 2. getAllStats
// ───────────────────────────────────────────────

describe('TreeEngine.getAllStats', () => {
  it('devolve unha entrada por cada stat declarado', async () => {
    const tree = makeTreeDef({
      stats: [
        makeStat('a', { initial: 1 }),
        makeStat('b', { initial: 2 }),
        makeStat('c', { initial: 3 }),
      ],
      nodes: [
        makeNode('n1', {
          statContributions: [
            { statId: 'a', op: '+', value: 10 },
            { statId: 'c', op: '+', value: 7 },
          ],
        }),
      ],
    })
    const engine = new TreeEngine(tree)
    const before = engine.getAllStats()
    expect(Object.keys(before)).toEqual(['a', 'b', 'c'])
    expect(before).toEqual({ a: 1, b: 2, c: 3 })

    await engine.unlock('n1')
    const after = engine.getAllStats()
    expect(after).toEqual({ a: 11, b: 2, c: 10 })
  })

  it('devolve un Record vacío se treeDef.stats está ausente', () => {
    const engine = new TreeEngine(makeTreeDef({ nodes: [makeNode('a')] }))
    expect(engine.getAllStats()).toEqual({})
  })
})

// ───────────────────────────────────────────────
// 3. Invalidación automática da cache
// ───────────────────────────────────────────────

describe('TreeEngine — invalidación automática da cache de stats', () => {
  it('invalidación tras lock: contribución do nodo desaparece', async () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 0 })],
      nodes: [
        makeNode('a', {
          statContributions: [{ statId: 'damage', op: '+', value: 5 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)
    await engine.unlock('a')
    expect(engine.getStat('damage')).toBe(5)
    const lockResult = await engine.lock('a')
    expect(lockResult.ok).toBe(true)
    expect(engine.getStat('damage')).toBe(0)
  })

  it('invalidación tras respec: contribución desaparece', async () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 1 })],
      nodes: [
        makeNode('a', {
          statContributions: [{ statId: 'damage', op: '+', value: 9 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)
    await engine.unlock('a')
    expect(engine.getStat('damage')).toBe(10)
    const respec = await engine.respec()
    expect(respec.ok).toBe(true)
    expect(engine.getStat('damage')).toBe(1)
  })

  it('invalidación tras applyChanges: remove_node dun nodo unlocked', async () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 0 })],
      nodes: [
        makeNode('a', {
          statContributions: [{ statId: 'damage', op: '+', value: 4 }],
        }),
        makeNode('b'),
      ],
    })
    const engine = new TreeEngine(tree)
    await engine.unlock('a')
    expect(engine.getStat('damage')).toBe(4)
    const changes: TreeChange[] = [{ type: 'remove_node', nodeId: 'a', cascadeEdges: true }]
    const r = await engine.applyChanges(changes)
    expect(r.ok).toBe(true)
    // O nodo xa non existe → a súa contribución non se aplica.
    expect(engine.getStat('damage')).toBe(0)
  })

  it('invalidación tras unlock multi-tier: perTier reflicte o tier alcanzado', async () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 0 })],
      nodes: [
        makeNode('a', {
          maxTier: 3,
          statContributions: [{ statId: 'damage', op: '+', value: 4, perTier: true }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)
    // Tier 1: 4
    expect((await engine.unlock('a')).ok).toBe(true)
    expect(engine.getStat('damage')).toBe(4)
    // Tier 2: 8
    expect((await engine.unlock('a')).ok).toBe(true)
    expect(engine.getStat('damage')).toBe(8)
    // Tier 3 = maxTier: maxed; perTier × 3 = 12
    expect((await engine.unlock('a')).ok).toBe(true)
    expect(engine.getStat('damage')).toBe(12)
  })

  it('cache estable: 100 lecturas seguidas sen mutar dan o mesmo valor', async () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 1 })],
      nodes: [
        makeNode('a', {
          statContributions: [{ statId: 'damage', op: '+', value: 2 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)
    await engine.unlock('a')
    for (let i = 0; i < 100; i++) {
      expect(engine.getStat('damage')).toBe(3)
    }
    // Tras mutación, segue funcionando correctamente.
    await engine.lock('a')
    expect(engine.getStat('damage')).toBe(1)
  })
})

// ───────────────────────────────────────────────
// 4. modify_stat segue EFFECT_TYPE_UNSUPPORTED (regresión)
// ───────────────────────────────────────────────

describe('TreeEngine — modify_stat effect aínda non implementado', () => {
  it('unlock dun nodo con effects modify_stat falla con rollback total', async () => {
    const tree = makeTreeDef({
      stats: [makeStat('damage', { initial: 5 })],
      nodes: [
        makeNode('a', {
          effects: [{ type: 'modify_stat', statId: 'damage', op: '+', amount: 3 }],
        }),
      ],
    })
    const engine = new TreeEngine(tree)
    const r = await engine.unlock('a')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // O EffectsRunner.run envolve o erro orixinal como
      // EFFECT_APPLICATION_FAILED (YGG_E017), preservando o código orixinal
      // (EFFECT_TYPE_UNSUPPORTED, YGG_E013) en `context.originalErrorCode`.
      expect(r.error.code).toBe(ErrorCode.EFFECT_APPLICATION_FAILED)
      expect(r.error.context?.originalErrorCode).toBe(ErrorCode.EFFECT_TYPE_UNSUPPORTED)
    }
    // Rollback completo: o estado do nodo restaurado, getStat sen cambios.
    expect(engine.getNodeState('a')?.state ?? 'locked').toBe('locked')
    expect(engine.getStat('damage')).toBe(5)
  })
})

// ── FIN: tests de TreeEngine.getStat / getAllStats (2.2.b) ──
