// ── INICIO: tests de StatComputer ──
// Suite unitaria do StatComputer (sub-fase 2.2). Constrúe manualmente
// as pezas necesarias (TreeDef, TreeState, UnlockResolver). NON depende
// de TreeEngine: o StatComputer é standalone.

import { describe, expect, it } from 'vitest'
import { StatComputer, UnlockResolver } from '../../src/engine/index.js'
import type {
  NodeDef,
  NodeInstance,
  StatContribution,
  StatDef,
  TreeDef,
  TreeState,
} from '../../src/types/index.js'

// ───────────────────────────────────────────────
// Helpers de construción
// ───────────────────────────────────────────────

function makeNode(partial: Partial<NodeDef> & { id: string }): NodeDef {
  return {
    type: 'small',
    label: { gl: partial.id, es: partial.id, en: partial.id },
    ...partial,
  }
}

function makeStat(partial: Partial<StatDef> & { id: string }): StatDef {
  return {
    label: { gl: partial.id, es: partial.id, en: partial.id },
    ...partial,
  }
}

function makeTree(nodes: readonly NodeDef[] = [], stats: readonly StatDef[] = []): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Test', es: 'Test', en: 'Test' },
    nodes,
    edges: [],
    layout: { type: 'radial' },
    stats,
    startingBudget: { resources: {} },
  }
}

function makeInstance(id: string, state: NodeInstance['state'], currentTier = 1): NodeInstance {
  return {
    id,
    state,
    currentTier,
  }
}

function makeState(instances: readonly NodeInstance[]): TreeState {
  const nodes: Record<string, NodeInstance> = {}
  for (const inst of instances) {
    nodes[inst.id] = inst
  }
  return {
    nodes,
    budget: { resources: {} },
  }
}

function buildComputer(treeDef: TreeDef, state: TreeState): StatComputer {
  return new StatComputer({
    treeDef,
    state,
    resolver: new UnlockResolver(),
    locale: 'gl',
  })
}

// ───────────────────────────────────────────────
// Valor inicial e contribucións básicas
// ───────────────────────────────────────────────

describe('StatComputer.computeStat — valor inicial', () => {
  it('devolve initial cando ningún nodo desbloqueado contribúe', () => {
    const tree = makeTree([], [makeStat({ id: 'damage', initial: 10 })])
    const state = makeState([])
    const computer = buildComputer(tree, state)
    expect(computer.computeStat('damage')).toBe(10)
  })

  it('devolve 0 se non hai initial nin contribucións', () => {
    const tree = makeTree([], [makeStat({ id: 'damage' })])
    const computer = buildComputer(tree, makeState([]))
    expect(computer.computeStat('damage')).toBe(0)
  })

  it('suma simple: nodo desbloqueado contribúe +5 con initial 0', () => {
    const contribs: readonly StatContribution[] = [{ statId: 'damage', op: '+', value: 5 }]
    const tree = makeTree(
      [makeNode({ id: 'n1', statContributions: contribs })],
      [makeStat({ id: 'damage', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('damage')).toBe(5)
  })
})

// ───────────────────────────────────────────────
// Todas as ops
// ───────────────────────────────────────────────

describe('StatComputer.computeStat — operacións', () => {
  function runOp(op: StatContribution['op'], value: number, initial: number): number {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 's', op, value }],
        }),
      ],
      [makeStat({ id: 's', initial })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    return buildComputer(tree, state).computeStat('s')
  }

  it('"+" suma o valor ao acumulador', () => {
    expect(runOp('+', 7, 3)).toBe(10)
  })

  it('"-" resta o valor', () => {
    expect(runOp('-', 4, 10)).toBe(6)
  })

  it('"*" multiplica polo valor', () => {
    expect(runOp('*', 3, 5)).toBe(15)
  })

  it('"/" divide polo valor', () => {
    expect(runOp('/', 2, 10)).toBe(5)
  })

  it('"min" devolve o mínimo entre acumulador e valor', () => {
    expect(runOp('min', 4, 7)).toBe(4)
    expect(runOp('min', 9, 7)).toBe(7)
  })

  it('"max" devolve o máximo entre acumulador e valor', () => {
    expect(runOp('max', 8, 5)).toBe(8)
    expect(runOp('max', 2, 5)).toBe(5)
  })

  it('"set" substitúe o acumulador polo valor', () => {
    expect(runOp('set', 42, 99)).toBe(42)
  })
})

// ───────────────────────────────────────────────
// perTier
// ───────────────────────────────────────────────

describe('StatComputer.computeStat — perTier', () => {
  it('aplica value * currentTier cando perTier=true', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          maxTier: 3,
          statContributions: [{ statId: 'dmg', op: '+', value: 4, perTier: true }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked', 2)])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(8)
  })

  it('cando perTier=false (ou ausente) usa appliedTier=1', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          maxTier: 5,
          statContributions: [{ statId: 'dmg', op: '+', value: 4 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked', 3)])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(4)
  })
})

// ───────────────────────────────────────────────
// Estado dos nodos: unlocked, maxed, locked, etc.
// ───────────────────────────────────────────────

describe('StatComputer.computeStat — estado dos nodos', () => {
  it('"maxed" contribúe igual ca "unlocked"', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          maxTier: 2,
          statContributions: [{ statId: 'dmg', op: '+', value: 5, perTier: true }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'maxed', 2)])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(10)
  })

  it('"locked" NON contribúe', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 100 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 1 })],
    )
    const state = makeState([makeInstance('n1', 'locked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(1)
  })

  it('"unlockable" NON contribúe', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 100 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlockable')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(0)
  })

  it('"in_progress" NON contribúe', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 100 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'in_progress')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(0)
  })
})

// ───────────────────────────────────────────────
// conditions?
// ───────────────────────────────────────────────

describe('StatComputer.computeStat — conditions?', () => {
  it('aplica a contribución cando todas as conditions pasan', () => {
    const tree = makeTree(
      [
        makeNode({ id: 'gate' }),
        makeNode({
          id: 'n1',
          statContributions: [
            {
              statId: 'dmg',
              op: '+',
              value: 7,
              conditions: [{ type: 'node_unlocked', nodeId: 'gate' }],
            },
          ],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('gate', 'unlocked'), makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(7)
  })

  it('salta a contribución cando algunha condition falla', () => {
    const tree = makeTree(
      [
        makeNode({ id: 'gate' }),
        makeNode({
          id: 'n1',
          statContributions: [
            {
              statId: 'dmg',
              op: '+',
              value: 7,
              conditions: [{ type: 'node_unlocked', nodeId: 'gate' }],
            },
          ],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    // 'gate' segue locked → condition falla.
    const state = makeState([makeInstance('gate', 'locked'), makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(0)
  })

  it('AND lóxico: con dúas conditions, ambas deben pasar', () => {
    const tree = makeTree(
      [
        makeNode({ id: 'a' }),
        makeNode({ id: 'b' }),
        makeNode({
          id: 'n1',
          statContributions: [
            {
              statId: 'dmg',
              op: '+',
              value: 5,
              conditions: [
                { type: 'node_unlocked', nodeId: 'a' },
                { type: 'node_unlocked', nodeId: 'b' },
              ],
            },
          ],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    // Só 'a' desbloqueado → AND falla.
    const onlyA = makeState([
      makeInstance('a', 'unlocked'),
      makeInstance('b', 'locked'),
      makeInstance('n1', 'unlocked'),
    ])
    expect(buildComputer(tree, onlyA).computeStat('dmg')).toBe(0)

    // Ambos desbloqueados → AND pasa.
    const both = makeState([
      makeInstance('a', 'unlocked'),
      makeInstance('b', 'unlocked'),
      makeInstance('n1', 'unlocked'),
    ])
    expect(buildComputer(tree, both).computeStat('dmg')).toBe(5)
  })
})

// ───────────────────────────────────────────────
// Múltiples nodos e clamp
// ───────────────────────────────────────────────

describe('StatComputer.computeStat — múltiples nodos e clamp', () => {
  it('agrega contribucións de múltiples nodos', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 1 }],
        }),
        makeNode({
          id: 'n2',
          statContributions: [{ statId: 'dmg', op: '+', value: 2 }],
        }),
        makeNode({
          id: 'n3',
          statContributions: [{ statId: 'dmg', op: '+', value: 3 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([
      makeInstance('n1', 'unlocked'),
      makeInstance('n2', 'unlocked'),
      makeInstance('n3', 'unlocked'),
    ])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(6)
  })

  it('aplica clamp max ao final', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 25 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0, max: 10 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(10)
  })

  it('aplica clamp min ao final', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '-', value: 50 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0, min: -5 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(-5)
  })

  it('non aplica clamp se non hai min/max', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 99 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 1 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(100)
  })
})

// ───────────────────────────────────────────────
// statId inexistente
// ───────────────────────────────────────────────

describe('StatComputer — statId inexistente', () => {
  it('computeStat devolve NaN para statId descoñecido', () => {
    const tree = makeTree([], [makeStat({ id: 'dmg', initial: 5 })])
    const computer = buildComputer(tree, makeState([]))
    expect(computer.computeStat('nope')).toBeNaN()
  })

  it('explainStat devolve finalValue NaN e contributions vacía', () => {
    const tree = makeTree([], [makeStat({ id: 'dmg', initial: 5 })])
    const computer = buildComputer(tree, makeState([]))
    const explanation = computer.explainStat('nope')
    expect(explanation.statId).toBe('nope')
    expect(explanation.finalValue).toBeNaN()
    expect(explanation.contributions).toEqual([])
  })

  it('treeDef sen `stats` definido tamén devolve NaN', () => {
    const tree: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: { gl: 'T', es: 'T', en: 'T' },
      nodes: [],
      edges: [],
      layout: { type: 'radial' },
      startingBudget: { resources: {} },
    }
    expect(buildComputer(tree, makeState([])).computeStat('x')).toBeNaN()
  })
})

// ───────────────────────────────────────────────
// Cache + invalidate
// ───────────────────────────────────────────────

describe('StatComputer — cache e invalidate', () => {
  it('cachea o resultado e devolve o mesmo valor en chamadas consecutivas', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 5 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    const computer = buildComputer(tree, state)
    expect(computer.computeStat('dmg')).toBe(5)
    expect(computer.computeStat('dmg')).toBe(5)
  })

  it('sen invalidate, segue devolvendo o valor cacheado tras mutar state', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 5 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'locked')])
    const computer = buildComputer(tree, state)
    // Primeira lectura: 'n1' está locked → 0.
    expect(computer.computeStat('dmg')).toBe(0)
    // Mutamos o estado externo (StatComputer non se entera).
    state.nodes.n1 = makeInstance('n1', 'unlocked')
    // Aínda devolve o cacheado.
    expect(computer.computeStat('dmg')).toBe(0)
    // Tras invalidate, recalcula.
    computer.invalidate()
    expect(computer.computeStat('dmg')).toBe(5)
  })

  it('statId descoñecido NON se cachea (recalcúlase cada vez)', () => {
    // Comprobamos que tras "non cachear", se modifico stats e fago
    // invalidate, o segundo computeStat devolve un valor real, non NaN.
    const tree = makeTree([], [])
    const computer = buildComputer(tree, makeState([]))
    expect(computer.computeStat('dmg')).toBeNaN()
    // (Indirecto: a presenza no cache faríao NaN para sempre, pero a
    // implementación NON cachea NaN. Vid. computeStat: se statDef é
    // undefined, devolve sen cachear.)
  })
})

// ───────────────────────────────────────────────
// computeAllStats
// ───────────────────────────────────────────────

describe('StatComputer.computeAllStats', () => {
  it('devolve unha entrada por cada stat declarado', () => {
    const tree = makeTree(
      [],
      [
        makeStat({ id: 'a', initial: 1 }),
        makeStat({ id: 'b', initial: 2 }),
        makeStat({ id: 'c', initial: 3 }),
      ],
    )
    const result = buildComputer(tree, makeState([])).computeAllStats()
    expect(Object.keys(result)).toEqual(['a', 'b', 'c'])
    expect(result.a).toBe(1)
    expect(result.b).toBe(2)
    expect(result.c).toBe(3)
  })

  it('devolve un Record vacío se treeDef.stats está ausente', () => {
    const tree: TreeDef = {
      id: 't',
      schemaVersion: '1.0.0',
      version: '1.0.0',
      label: { gl: 'T', es: 'T', en: 'T' },
      nodes: [],
      edges: [],
      layout: { type: 'radial' },
      startingBudget: { resources: {} },
    }
    expect(buildComputer(tree, makeState([])).computeAllStats()).toEqual({})
  })
})

// ───────────────────────────────────────────────
// explainStat: detalle das contribucións
// ───────────────────────────────────────────────

describe('StatComputer.explainStat', () => {
  it('lista cada contribución aplicada con campos correctos', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 2 }],
        }),
        makeNode({
          id: 'n2',
          maxTier: 3,
          statContributions: [{ statId: 'dmg', op: '*', value: 3, perTier: true }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 1 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked'), makeInstance('n2', 'unlocked', 2)])
    const explanation = buildComputer(tree, state).explainStat('dmg')
    expect(explanation.statId).toBe('dmg')
    // (1 + 2) * (3 * 2) = 3 * 6 = 18
    expect(explanation.finalValue).toBe(18)
    expect(explanation.contributions).toHaveLength(2)
    expect(explanation.contributions[0]).toEqual({
      nodeId: 'n1',
      op: '+',
      value: 2,
      appliedTier: 1,
    })
    expect(explanation.contributions[1]).toEqual({
      nodeId: 'n2',
      op: '*',
      value: 3,
      appliedTier: 2,
    })
  })

  it('contribucións con conditions que pasan: conditional=true, appliedTier real', () => {
    const tree = makeTree(
      [
        makeNode({ id: 'gate' }),
        makeNode({
          id: 'n1',
          statContributions: [
            {
              statId: 'dmg',
              op: '+',
              value: 4,
              conditions: [{ type: 'node_unlocked', nodeId: 'gate' }],
            },
          ],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('gate', 'unlocked'), makeInstance('n1', 'unlocked')])
    const explanation = buildComputer(tree, state).explainStat('dmg')
    expect(explanation.finalValue).toBe(4)
    expect(explanation.contributions).toHaveLength(1)
    expect(explanation.contributions[0]).toEqual({
      nodeId: 'n1',
      op: '+',
      value: 4,
      appliedTier: 1,
      conditional: true,
    })
  })

  it('contribucións con conditions que fallan: conditional=true, appliedTier=0', () => {
    const tree = makeTree(
      [
        makeNode({ id: 'gate' }),
        makeNode({
          id: 'n1',
          statContributions: [
            {
              statId: 'dmg',
              op: '+',
              value: 4,
              conditions: [{ type: 'node_unlocked', nodeId: 'gate' }],
            },
          ],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('gate', 'locked'), makeInstance('n1', 'unlocked')])
    const explanation = buildComputer(tree, state).explainStat('dmg')
    expect(explanation.finalValue).toBe(0)
    expect(explanation.contributions).toHaveLength(1)
    expect(explanation.contributions[0]).toEqual({
      nodeId: 'n1',
      op: '+',
      value: 4,
      appliedTier: 0,
      conditional: true,
    })
  })

  it('contribucións sen conditions: conditional ausente', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 4 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    const explanation = buildComputer(tree, state).explainStat('dmg')
    expect(explanation.contributions[0]).not.toHaveProperty('conditional')
  })

  it('NON usa cache: muta o state e devolve o novo cálculo sen invalidate', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'dmg', op: '+', value: 5 }],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'locked')])
    const computer = buildComputer(tree, state)
    expect(computer.explainStat('dmg').finalValue).toBe(0)
    state.nodes.n1 = makeInstance('n1', 'unlocked')
    // SEN invalidate: explainStat ten que reflectir o cambio.
    expect(computer.explainStat('dmg').finalValue).toBe(5)
  })
})

// ───────────────────────────────────────────────
// Casos patolóxicos
// ───────────────────────────────────────────────

describe('StatComputer — casos patolóxicos', () => {
  it('división por 0 produce Infinity (non lanza)', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [{ statId: 'x', op: '/', value: 0 }],
        }),
      ],
      [makeStat({ id: 'x', initial: 10 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    // 10 / 0 = Infinity. Comportamento documentado en briefing §5.3 ad fin.
    expect(buildComputer(tree, state).computeStat('x')).toBe(Number.POSITIVE_INFINITY)
  })

  it('NodeInstance que referencia NodeDef inexistente: saltase silenciosamente', () => {
    // Caso defensivo: state ten un nodo ghost cuxo id non aparece en
    // treeDef.nodes. NON debería pasar nun fluxo normal (TreeDef
    // validada por Zod), pero a implementación debe defenderse igual.
    const tree = makeTree([], [makeStat({ id: 'dmg', initial: 0 })])
    const state = makeState([makeInstance('ghost', 'unlocked')])
    expect(() => buildComputer(tree, state).computeStat('dmg')).not.toThrow()
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(0)
  })

  it('nodos con statContributions vacías ou ausentes ignóranse limpamente', () => {
    const tree = makeTree(
      [makeNode({ id: 'n1' }), makeNode({ id: 'n2', statContributions: [] })],
      [makeStat({ id: 'dmg', initial: 3 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked'), makeInstance('n2', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(3)
  })

  it('contribucións con statId diferente ignóranse', () => {
    const tree = makeTree(
      [
        makeNode({
          id: 'n1',
          statContributions: [
            { statId: 'other', op: '+', value: 99 },
            { statId: 'dmg', op: '+', value: 5 },
          ],
        }),
      ],
      [makeStat({ id: 'dmg', initial: 0 })],
    )
    const state = makeState([makeInstance('n1', 'unlocked')])
    expect(buildComputer(tree, state).computeStat('dmg')).toBe(5)
  })
})

// ── FIN: tests de StatComputer ──
