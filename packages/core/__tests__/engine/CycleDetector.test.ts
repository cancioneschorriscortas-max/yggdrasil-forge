// ── INICIO: tests de CycleDetector ──
import { describe, expect, it } from 'vitest'
import { CycleDetector, DependencyGraph } from '../../src/engine/index.js'
import type { EdgeDef } from '../../src/types/index.js'

function edge(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'dependency' }
}

function graphOf(nodeIds: string[], edges: EdgeDef[]): DependencyGraph {
  return new DependencyGraph(nodeIds, edges)
}

describe('CycleDetector', () => {
  describe('hasCycle', () => {
    it('returns false for acyclic graph', () => {
      const g = graphOf(['a', 'b', 'c'], [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')])
      expect(new CycleDetector(g).hasCycle()).toBe(false)
    })

    it('returns false for empty graph', () => {
      const g = graphOf([], [])
      expect(new CycleDetector(g).hasCycle()).toBe(false)
    })

    it('detects a simple 2-node cycle', () => {
      const g = graphOf(['a', 'b'], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')])
      expect(new CycleDetector(g).hasCycle()).toBe(true)
    })

    it('detects a self-loop as a cycle', () => {
      const g = graphOf(['a'], [edge('e1', 'a', 'a')])
      expect(new CycleDetector(g).hasCycle()).toBe(true)
    })

    it('detects a longer cycle', () => {
      const g = graphOf(
        ['a', 'b', 'c', 'd'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd'), edge('e4', 'd', 'b')],
      )
      expect(new CycleDetector(g).hasCycle()).toBe(true)
    })

    it('returns false for tree-shaped graph', () => {
      const g = graphOf(
        ['r', 'a', 'b', 'c', 'd'],
        [edge('e1', 'r', 'a'), edge('e2', 'r', 'b'), edge('e3', 'a', 'c'), edge('e4', 'a', 'd')],
      )
      expect(new CycleDetector(g).hasCycle()).toBe(false)
    })
  })

  describe('findCycles', () => {
    it('returns empty array for acyclic graph', () => {
      const g = graphOf(['a', 'b'], [edge('e1', 'a', 'b')])
      expect(new CycleDetector(g).findCycles()).toEqual([])
    })

    it('finds a simple cycle', () => {
      const g = graphOf(['a', 'b'], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')])
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles).toHaveLength(1)
      // Pecha co primeiro nodo
      const c = cycles[0]
      expect(c).toBeDefined()
      if (c !== undefined) {
        expect(c[0]).toBe(c[c.length - 1])
        expect(new Set(c.slice(0, -1))).toEqual(new Set(['a', 'b']))
      }
    })

    it('finds a self-loop cycle', () => {
      const g = graphOf(['a'], [edge('e1', 'a', 'a')])
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles.length).toBeGreaterThanOrEqual(1)
    })

    it('deduplicates equivalent cycles', () => {
      // a→b→c→a é o mesmo ciclo independentemente do nodo de inicio.
      const g = graphOf(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a')],
      )
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles).toHaveLength(1)
    })

    it('finds multiple distinct cycles', () => {
      const g = graphOf(
        ['a', 'b', 'x', 'y'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'a'), edge('e3', 'x', 'y'), edge('e4', 'y', 'x')],
      )
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles).toHaveLength(2)
    })
  })

  describe('findCycleContaining', () => {
    it('returns a cycle that includes the node', () => {
      const g = graphOf(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a')],
      )
      const cycle = new CycleDetector(g).findCycleContaining('b')
      expect(cycle).not.toBeNull()
      if (cycle !== null) {
        expect(cycle.slice(0, -1)).toContain('b')
      }
    })

    it('returns null when node is not in any cycle', () => {
      const g = graphOf(['a', 'b', 'free'], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')])
      expect(new CycleDetector(g).findCycleContaining('free')).toBeNull()
    })

    it('returns null for unknown node', () => {
      const g = graphOf(['a'], [])
      expect(new CycleDetector(g).findCycleContaining('zzz')).toBeNull()
    })
  })
})
// ── FIN: tests de CycleDetector ──
