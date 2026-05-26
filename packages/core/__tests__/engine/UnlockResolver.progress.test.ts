// ── INICIO: tests illados de UnlockResolver con ProgressManagerLike (2.4.d) ──
// Verifica que o método privado `getProgress` do `UnlockResolver`:
//   - cando o context inclúe `progressManager`, delega nel.
//   - cando non, fai fallback á lectura directa de
//     `NodeInstance.progress` (comportamento legacy, anterior a 2.4.d).
//
// Os tests son **illados**: constrúen `UnlockResolverContext` a man
// sen pasar por TreeEngine. Iso documenta o contrato do
// `UnlockResolver` standalone fronte a unha posible inxección externa
// (peza nova, plugin futuro, etc.).
//
// Os tests de integración con TreeEngine real (TreeDef computed +
// canUnlock) viven en TreeEngine.progress.test.ts (sub-fase 2.4.d
// engadiu alí o bloque correspondente).

import { describe, expect, it } from 'vitest'
import {
  type ProgressManagerLike,
  UnlockResolver,
  type UnlockResolverContext,
} from '../../src/engine/UnlockResolver.js'
import type { NodeInstance, TreeDef, TreeState } from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers locais
// ───────────────────────────────────────────────

function makeTree(nodes: TreeDef['nodes'] = []): TreeDef {
  return {
    id: 'test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes,
    edges: [],
    layout: { type: 'radial' },
  }
}

function makeState(nodes: Record<string, NodeInstance> = {}): TreeState {
  return {
    nodes,
    budget: { resources: {} },
    computedStats: {},
  }
}

/**
 * Mock simple de `ProgressManagerLike`. Devolve un valor fixo para
 * calquera nodeId, ou un mapa {nodeId -> valor} se se prefire.
 */
function mockProgressManager(
  valuesOrFn: Record<string, number> | ((nodeId: string) => number),
): ProgressManagerLike {
  return {
    getProgress(nodeId: string): number {
      if (typeof valuesOrFn === 'function') {
        return valuesOrFn(nodeId)
      }
      return valuesOrFn[nodeId] ?? 0
    },
  }
}

const resolver = new UnlockResolver()

// ───────────────────────────────────────────────
// Fallback legacy (sen progressManager)
// ───────────────────────────────────────────────

describe('UnlockResolver — progress_min sen progressManager (fallback legacy)', () => {
  it('lee NodeInstance.progress directamente cando o context non ten progressManager', () => {
    const state = makeState({
      a: { id: 'a', state: 'locked', currentTier: 0, progress: 75 },
    })
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state,
      // explicítamente sen progressManager
    }
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 50 }, ctx),
    ).toBe(true)
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 80 }, ctx),
    ).toBe(false)
  })

  it('devolve 0 (e por tanto falso para percent > 0) cando o nodo non ten progress no state', () => {
    const state = makeState({
      a: { id: 'a', state: 'locked', currentTier: 0 },
    })
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state,
    }
    expect(resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 1 }, ctx)).toBe(
      false,
    )
  })

  it('devolve 0 cando o nodo non existe no state', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState(),
    }
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'ghost', percent: 50 }, ctx),
    ).toBe(false)
  })
})

// ───────────────────────────────────────────────
// Delegación en progressManager
// ───────────────────────────────────────────────

describe('UnlockResolver — progress_min con progressManager (delega)', () => {
  it('delega no progressManager cando está presente (devolve 75 → satisfeita con percent 50)', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState(),
      progressManager: mockProgressManager({ a: 75 }),
    }
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 50 }, ctx),
    ).toBe(true)
  })

  it('delega: percent 80 contra valor 75 → non satisfeita', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState(),
      progressManager: mockProgressManager({ a: 75 }),
    }
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 80 }, ctx),
    ).toBe(false)
  })

  it('delega: valor 0 (simula computed con ciclo) → percent 1 non satisfeito', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState(),
      progressManager: mockProgressManager({ a: 0 }),
    }
    expect(resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 1 }, ctx)).toBe(
      false,
    )
  })

  it('delega: valor 100 → calquera percent <= 100 satisfeito', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState(),
      progressManager: mockProgressManager({ a: 100 }),
    }
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 50 }, ctx),
    ).toBe(true)
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 100 }, ctx),
    ).toBe(true)
  })

  it('a presenza de progressManager IGNORA NodeInstance.progress (precedencia clara)', () => {
    // O state ten progress=10 para "a", pero o mock devolve 90.
    // O resultado debe seguir a fonte do progressManager.
    const state = makeState({
      a: { id: 'a', state: 'locked', currentTier: 0, progress: 10 },
    })
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state,
      progressManager: mockProgressManager({ a: 90 }),
    }
    expect(
      resolver.evaluateCondition({ type: 'progress_min', nodeId: 'a', percent: 50 }, ctx),
    ).toBe(true)
  })
})

// ───────────────────────────────────────────────
// explain() reflicte a mesma fonte de progress (consistencia)
// ───────────────────────────────────────────────

describe('UnlockResolver.explain — progress_min usa a mesma fonte ca evaluate', () => {
  it('explain() con progressManager mostra o valor desde alí na mensaxe', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState({
        a: { id: 'a', state: 'locked', currentTier: 0, progress: 5 },
      }),
      progressManager: mockProgressManager({ a: 90 }),
    }
    const explanation = resolver.explain(
      { type: 'all', conditions: [{ type: 'progress_min', nodeId: 'a', percent: 50 }] },
      ctx,
    )
    expect(explanation.satisfied).toBe(true)
    // A mensaxe satisfeita usa só o nodeId + percent, non o valor
    // actual, pero a clave é que `satisfied === true` confirma que o
    // valor consultado foi 90 (do progressManager), non 5 (do state).
  })

  it('explain() sen progressManager usa o state (fallback)', () => {
    const ctx: UnlockResolverContext = {
      treeDef: makeTree(),
      state: makeState({
        a: { id: 'a', state: 'locked', currentTier: 0, progress: 5 },
      }),
    }
    const explanation = resolver.explain(
      { type: 'all', conditions: [{ type: 'progress_min', nodeId: 'a', percent: 50 }] },
      ctx,
    )
    expect(explanation.satisfied).toBe(false)
  })
})

// ── FIN: tests illados de UnlockResolver con ProgressManagerLike ──
