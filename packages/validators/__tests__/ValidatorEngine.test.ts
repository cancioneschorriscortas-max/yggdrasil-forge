import type { EdgeDef, NodeDef, TreeDef } from '@yggdrasil-forge/core'
// ── INICIO: tests de ValidatorEngine + 6 built-in rules ──
import { describe, expect, it } from 'vitest'
import { ValidatorEngine } from '../src/ValidatorEngine.js'
import {
  allReachableFromRootRule,
  maxBranchingFactorRule,
  minBranchingFactorRule,
  noCyclesRule,
  noDeadEndsRule,
  noOrphanNodesRule,
} from '../src/rules.js'

function makeTree(
  nodes: readonly NodeDef[],
  edges: readonly EdgeDef[] = [],
  rootNodeId?: string,
): TreeDef {
  return {
    id: 'test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes,
    edges,
    layout: { type: 'radial' },
    ...(rootNodeId !== undefined ? { rootNodeId } : {}),
  }
}

function n(id: string): NodeDef {
  return { id, type: 'small', label: id }
}

function dep(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'dependency' }
}

function edge(id: string, source: string, target: string, type: EdgeDef['type']): EdgeDef {
  return { id, source, target, type }
}

// ── ValidatorEngine core ──

describe('ValidatorEngine', () => {
  it('new ValidatorEngine crea engine con size=0', () => {
    const ve = new ValidatorEngine()
    expect(ve.size()).toBe(0)
  })

  it('registerRule engade unha regra', () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    expect(ve.size()).toBe(1)
  })

  it('registerRule con id duplicado substitúe', () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    ve.registerRule(noCyclesRule)
    expect(ve.size()).toBe(1)
  })

  it('unregisterRule existente devolve true', () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    expect(ve.unregisterRule('no_cycles')).toBe(true)
    expect(ve.size()).toBe(0)
  })

  it('unregisterRule inexistente devolve false', () => {
    const ve = new ValidatorEngine()
    expect(ve.unregisterRule('nonexistent')).toBe(false)
  })

  it('getRules devolve array en orde de inserción', () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    ve.registerRule(noOrphanNodesRule)
    const rules = ve.getRules()
    expect(rules).toHaveLength(2)
    expect(rules[0]?.id).toBe('no_cycles')
    expect(rules[1]?.id).toBe('no_orphan_nodes')
  })

  it('getRules cando size=0 devolve array vacío', () => {
    const ve = new ValidatorEngine()
    expect(ve.getRules()).toEqual([])
  })

  it('validate sen regras devolve report con cero issues', async () => {
    const ve = new ValidatorEngine()
    const report = await ve.validate(makeTree([n('a')]))
    expect(report.issues).toEqual([])
    expect(report.hasErrors).toBe(false)
  })

  it('validate con múltiples regras combina issues', async () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noOrphanNodesRule)
    ve.registerRule(noDeadEndsRule)
    const report = await ve.validate(makeTree([n('a'), n('b')]))
    expect(report.issues.length).toBeGreaterThan(0)
  })

  it('validate counters correctos', async () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    ve.registerRule(noOrphanNodesRule)
    ve.registerRule(minBranchingFactorRule(3))
    const tree = makeTree([n('a'), n('b'), n('c')], [dep('e1', 'a', 'b'), dep('e2', 'b', 'a')])
    const report = await ve.validate(tree)
    expect(report.errorCount + report.warningCount + report.infoCount).toBe(report.issues.length)
    if (report.errorCount > 0) expect(report.hasErrors).toBe(true)
  })
})

// ── no_cycles ──

describe('noCyclesRule', () => {
  it('tree sen ciclos: cero issues', () => {
    const tree = makeTree([n('a'), n('b'), n('c')], [dep('e1', 'a', 'b'), dep('e2', 'b', 'c')])
    expect(noCyclesRule.validate(tree)).toEqual([])
  })

  it('ciclo simple A→B→A', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b'), dep('e2', 'b', 'a')])
    const issues = noCyclesRule.validate(tree)
    expect(issues.length).toBeGreaterThanOrEqual(1)
    expect(issues[0]?.severity).toBe('error')
  })

  it('ciclo de 3 nodos A→B→C→A', () => {
    const tree = makeTree(
      [n('a'), n('b'), n('c')],
      [dep('e1', 'a', 'b'), dep('e2', 'b', 'c'), dep('e3', 'c', 'a')],
    )
    const issues = noCyclesRule.validate(tree)
    expect(issues.length).toBeGreaterThanOrEqual(1)
  })

  it('múltiples branches: un con ciclo, outro sen', () => {
    const tree = makeTree(
      [n('a'), n('b'), n('c'), n('d')],
      [dep('e1', 'a', 'b'), dep('e2', 'a', 'c'), dep('e3', 'c', 'd'), dep('e4', 'd', 'c')],
    )
    const issues = noCyclesRule.validate(tree)
    expect(issues.length).toBeGreaterThanOrEqual(1)
  })

  it('edges non-dependency NON detectan ciclos', () => {
    const tree = makeTree(
      [n('a'), n('b')],
      [edge('e1', 'a', 'b', 'soft_dependency'), edge('e2', 'b', 'a', 'enhancement')],
    )
    expect(noCyclesRule.validate(tree)).toEqual([])
  })

  it('nodo visitado pero non en stack (cross-edge): cero ciclo', () => {
    // a→b, a→c, b→c: cando procesamos a→c, c xa foi visitado via b
    // pero xa non está en stack (b→c completouse)
    const tree = makeTree(
      [n('a'), n('b'), n('c')],
      [dep('e1', 'a', 'b'), dep('e2', 'b', 'c'), dep('e3', 'a', 'c')],
    )
    expect(noCyclesRule.validate(tree)).toEqual([])
  })

  it('properties correctas', () => {
    expect(noCyclesRule.id).toBe('no_cycles')
    expect(noCyclesRule.severity).toBe('error')
    expect((noCyclesRule.label as Record<string, string>).en).toBe('No cycles')
  })
})

// ── all_reachable_from_root ──

describe('allReachableFromRootRule', () => {
  it('rootNodeId undefined: cero issues', () => {
    const tree = makeTree([n('a'), n('b')])
    expect(allReachableFromRootRule.validate(tree)).toEqual([])
  })

  it('todos alcanzables: cero issues', () => {
    const tree = makeTree(
      [n('root'), n('a'), n('b')],
      [dep('e1', 'root', 'a'), dep('e2', 'root', 'b')],
      'root',
    )
    expect(allReachableFromRootRule.validate(tree)).toEqual([])
  })

  it('1 nodo non alcanzable: 1 issue', () => {
    const tree = makeTree([n('root'), n('a'), n('orphan')], [dep('e1', 'root', 'a')], 'root')
    const issues = allReachableFromRootRule.validate(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.nodeId).toBe('orphan')
    expect(issues[0]?.severity).toBe('error')
  })

  it('múltiples non alcanzables: N issues', () => {
    const tree = makeTree([n('root'), n('x'), n('y')], [], 'root')
    const issues = allReachableFromRootRule.validate(tree)
    expect(issues).toHaveLength(2)
  })

  it('BFS con nodo xa alcanzado: cero duplicados', () => {
    const tree = makeTree(
      [n('root'), n('a'), n('b')],
      [dep('e1', 'root', 'b'), dep('e2', 'root', 'a'), dep('e3', 'a', 'b')],
      'root',
    )
    expect(allReachableFromRootRule.validate(tree)).toEqual([])
  })

  it('BFS diamond: nodo duplicado en queue procesado unha vez', () => {
    // root→a, root→b, a→c, b→c: c é enqueued dúas veces
    const tree = makeTree(
      [n('root'), n('a'), n('b'), n('c')],
      [dep('e1', 'root', 'a'), dep('e2', 'root', 'b'), dep('e3', 'a', 'c'), dep('e4', 'b', 'c')],
      'root',
    )
    expect(allReachableFromRootRule.validate(tree)).toEqual([])
  })

  it('properties correctas', () => {
    expect(allReachableFromRootRule.id).toBe('all_reachable_from_root')
    expect(allReachableFromRootRule.severity).toBe('error')
  })
})

// ── no_orphan_nodes ──

describe('noOrphanNodesRule', () => {
  it('todos conectados: cero issues', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    expect(noOrphanNodesRule.validate(tree)).toEqual([])
  })

  it('1 orfo: 1 issue', () => {
    const tree = makeTree([n('a'), n('b'), n('orphan')], [dep('e1', 'a', 'b')])
    const issues = noOrphanNodesRule.validate(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.nodeId).toBe('orphan')
  })

  it('múltiples orfos: N issues', () => {
    const tree = makeTree([n('a'), n('b'), n('c')])
    expect(noOrphanNodesRule.validate(tree)).toHaveLength(3)
  })

  it('conectado por edge non-dependency: NON é orfo', () => {
    const tree = makeTree([n('a'), n('b')], [edge('e1', 'a', 'b', 'enhancement')])
    expect(noOrphanNodesRule.validate(tree)).toEqual([])
  })

  it('severity=warning', () => {
    expect(noOrphanNodesRule.severity).toBe('warning')
  })
})

// ── no_dead_ends ──

describe('noDeadEndsRule', () => {
  it('todos con outgoing: cero issues', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b'), dep('e2', 'b', 'a')])
    expect(noDeadEndsRule.validate(tree)).toEqual([])
  })

  it('dead end: 1 issue', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    const issues = noDeadEndsRule.validate(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.nodeId).toBe('b')
  })

  it('rootNodeId é dead end: NON é issue', () => {
    const tree = makeTree([n('root'), n('a')], [dep('e1', 'a', 'root')], 'root')
    const issues = noDeadEndsRule.validate(tree)
    // root non ten outgoing pero non é issue; a ten outgoing → OK
    expect(issues.every((i) => i.nodeId !== 'root')).toBe(true)
  })

  it('sen rootNodeId: tódolos sen outgoing son issues', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    const issues = noDeadEndsRule.validate(tree)
    expect(issues.some((i) => i.nodeId === 'b')).toBe(true)
  })

  it('severity=warning', () => {
    expect(noDeadEndsRule.severity).toBe('warning')
  })
})

// ── max_branching_factor ──

describe('maxBranchingFactorRule', () => {
  it('factory devolve regra correcta', () => {
    const rule = maxBranchingFactorRule(3)
    expect(rule.id).toBe('max_branching_factor')
    expect(rule.severity).toBe('warning')
    expect(typeof rule.validate).toBe('function')
  })

  it('todos por debaixo do límite: cero issues', () => {
    const tree = makeTree([n('a'), n('b'), n('c')], [dep('e1', 'a', 'b'), dep('e2', 'a', 'c')])
    expect(maxBranchingFactorRule(3).validate(tree)).toEqual([])
  })

  it('1 nodo excede límite: 1 issue', () => {
    const tree = makeTree(
      [n('a'), n('b'), n('c'), n('d')],
      [dep('e1', 'a', 'b'), dep('e2', 'a', 'c'), dep('e3', 'a', 'd')],
    )
    const issues = maxBranchingFactorRule(2).validate(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.nodeId).toBe('a')
  })

  it('limit=0: tódolos con outgoing son issue', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    expect(maxBranchingFactorRule(0).validate(tree)).toHaveLength(1)
  })
})

// ── min_branching_factor ──

describe('minBranchingFactorRule', () => {
  it('factory devolve regra correcta', () => {
    const rule = minBranchingFactorRule(2)
    expect(rule.id).toBe('min_branching_factor')
    expect(rule.severity).toBe('info')
  })

  it('todos non-leaf por encima do límite: cero issues', () => {
    const tree = makeTree([n('a'), n('b'), n('c')], [dep('e1', 'a', 'b'), dep('e2', 'a', 'c')])
    expect(minBranchingFactorRule(2).validate(tree)).toEqual([])
  })

  it('1 non-leaf por debaixo do límite: 1 issue', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    const issues = minBranchingFactorRule(2).validate(tree)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.nodeId).toBe('a')
  })

  it('nodos sen outgoing (leaves) NON contan', () => {
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    const issues = minBranchingFactorRule(2).validate(tree)
    // b ten 0 outgoing → NON é issue (responsabilidade de noDeadEnds)
    expect(issues.every((i) => i.nodeId !== 'b')).toBe(true)
  })
})

// ── Integration ──

describe('Integration', () => {
  it('tódalas 6 regras + validate', async () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    ve.registerRule(allReachableFromRootRule)
    ve.registerRule(noOrphanNodesRule)
    ve.registerRule(noDeadEndsRule)
    ve.registerRule(maxBranchingFactorRule(2))
    ve.registerRule(minBranchingFactorRule(2))
    const tree = makeTree(
      [n('root'), n('a'), n('b'), n('orphan')],
      [dep('e1', 'root', 'a'), dep('e2', 'root', 'b')],
      'root',
    )
    const report = await ve.validate(tree)
    expect(report.issues.length).toBeGreaterThan(0)
  })

  it('tree perfecto: hasErrors=false, counters=0', async () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    ve.registerRule(noOrphanNodesRule)
    const tree = makeTree([n('a'), n('b')], [dep('e1', 'a', 'b')])
    const report = await ve.validate(tree)
    expect(report.hasErrors).toBe(false)
    expect(report.errorCount).toBe(0)
    expect(report.warningCount).toBe(0)
  })

  it('tree con erros + warnings + info: counters correctos', async () => {
    const ve = new ValidatorEngine()
    ve.registerRule(noCyclesRule)
    ve.registerRule(noOrphanNodesRule)
    ve.registerRule(minBranchingFactorRule(5))
    const tree = makeTree([n('a'), n('b'), n('orphan')], [dep('e1', 'a', 'b'), dep('e2', 'b', 'a')])
    const report = await ve.validate(tree)
    expect(report.errorCount).toBeGreaterThan(0)
    expect(report.warningCount).toBeGreaterThan(0)
    expect(report.hasErrors).toBe(true)
  })
})
// ── FIN: tests de ValidatorEngine + 6 built-in rules ──
