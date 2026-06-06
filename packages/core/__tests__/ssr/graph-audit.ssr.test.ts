import { describe, expect, it } from 'vitest'
import { AuditLogger, DependencyGraph, reconcile } from '../../src/index.js'
import { createSimpleTreeDef } from './_helpers.js'

describe('SSR: DependencyGraph + AuditLogger + Reconciler en Node sen DOM', () => {
  it('importa todas tres sen crash', () => {
    expect(DependencyGraph).toBeDefined()
    expect(AuditLogger).toBeDefined()
    expect(reconcile).toBeDefined()
  })

  it('DependencyGraph: construír + getRoots/getOutgoing en Node', () => {
    const graph = new DependencyGraph(
      ['root', 'child1', 'child2'],
      [
        { id: 'e1', source: 'root', target: 'child1', type: 'dependency' },
        { id: 'e2', source: 'root', target: 'child2', type: 'dependency' },
      ],
    )
    expect(graph.getRoots()).toEqual(['root'])
    expect(graph.getOutgoing('root')).toContain('child1')
  })

  it('AuditLogger: query en Node (Date.now é Node-safe)', () => {
    const logger = new AuditLogger({ enabled: true })
    const log = logger.query()
    expect(Array.isArray(log)).toBe(true)
  })

  it('Reconciler: reconcile cun diff trivial en Node', () => {
    const oldDef = createSimpleTreeDef('custom')
    const newDef = { ...oldDef, version: '0.0.1' }
    const emptyState = { nodes: {}, budget: { resources: {} }, computedStats: {} }
    const result = reconcile(oldDef, newDef, emptyState, {})
    expect(result.ok).toBe(true)
  })
})
