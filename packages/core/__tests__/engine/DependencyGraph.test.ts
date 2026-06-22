// ── INICIO: tests de DependencyGraph ──
import { describe, expect, it } from 'vitest'
import { DependencyGraph } from '../../src/engine/index.js'
import type { EdgeDef } from '../../src/types/index.js'

function edge(
  id: string,
  source: string,
  target: string,
  type: EdgeDef['type'] = 'dependency',
  bidirectional?: boolean,
): EdgeDef {
  return bidirectional === undefined
    ? { id, source, target, type }
    : { id, source, target, type, bidirectional }
}

describe('DependencyGraph', () => {
  describe('construction & edge filtering', () => {
    it('only includes dependency edges by default', () => {
      const g = new DependencyGraph(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b', 'dependency'), edge('e2', 'b', 'c', 'exclusion')],
      )
      expect(g.getDependents('a')).toEqual(['b'])
      expect(g.getDependents('b')).toEqual([]) // exclusion ignorada
    })

    it('can include soft_dependency when configured', () => {
      const g = new DependencyGraph(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b', 'dependency'), edge('e2', 'b', 'c', 'soft_dependency')],
        { edgeTypes: ['dependency', 'soft_dependency'] },
      )
      expect(g.getDependents('b')).toEqual(['c'])
    })

    it('ignores enhancement/path/cluster/subtree_link', () => {
      const g = new DependencyGraph(
        ['a', 'b'],
        [
          edge('e1', 'a', 'b', 'enhancement'),
          edge('e2', 'a', 'b', 'path'),
          edge('e3', 'a', 'b', 'cluster'),
          edge('e4', 'a', 'b', 'subtree_link'),
        ],
      )
      expect(g.getDependents('a')).toEqual([])
    })

    it('adds nodes referenced only by edges', () => {
      const g = new DependencyGraph([], [edge('e1', 'x', 'y')])
      expect(g.hasNode('x')).toBe(true)
      expect(g.hasNode('y')).toBe(true)
    })

    it('handles bidirectional edges', () => {
      const g = new DependencyGraph(['a', 'b'], [edge('e1', 'a', 'b', 'dependency', true)])
      expect(g.getOutgoing('a')).toEqual(['b'])
      expect(g.getOutgoing('b')).toEqual(['a'])
    })

    it('handles self-loops', () => {
      const g = new DependencyGraph(['a'], [edge('e1', 'a', 'a')])
      expect(g.getOutgoing('a')).toEqual(['a'])
    })
  })

  describe('dependencies / dependents', () => {
    const g = new DependencyGraph(
      ['a', 'b', 'c', 'd'],
      [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'd'), edge('e4', 'c', 'd')],
    )

    it('getDependencies returns direct prerequisites', () => {
      expect(g.getDependencies('d').sort()).toEqual(['b', 'c'])
      expect(g.getDependencies('b')).toEqual(['a'])
      expect(g.getDependencies('a')).toEqual([])
    })

    it('getDependents returns direct followers', () => {
      expect(g.getDependents('a').sort()).toEqual(['b', 'c'])
      expect(g.getDependents('d')).toEqual([])
    })

    it('getAllDependencies returns transitive closure', () => {
      expect(g.getAllDependencies('d')).toEqual(new Set(['b', 'c', 'a']))
      expect(g.getAllDependencies('a')).toEqual(new Set())
    })

    it('getAllDependents returns transitive closure', () => {
      expect(g.getAllDependents('a')).toEqual(new Set(['b', 'c', 'd']))
      expect(g.getAllDependents('d')).toEqual(new Set())
    })

    it('getDependencies/getDependents return [] for unknown node', () => {
      expect(g.getDependencies('zzz')).toEqual([])
      expect(g.getDependents('zzz')).toEqual([])
    })

    // Topoloxía A→B→C, A→C: 'A' é pushed dúas veces no stack durante
    // getAllDependencies('C') (unha por B, outra por C directo), polo
    // que a rama "if (result.has(current)) continue" dentro do while
    // do BFS dispárase. (Cobertura paydown.)
    it('getAllDependencies revisita: cobre rama result.has(current)', () => {
      const g2 = new DependencyGraph(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'c')],
      )
      expect(g2.getAllDependencies('c')).toEqual(new Set(['a', 'b']))
    })

    it('getAllDependents revisita: cobre rama result.has(current)', () => {
      // Topoloxía A→B, A→C, C→B: forza que 'B' se push dúas veces no
      // stack de getAllDependents('A') (unha vez como dependent directo,
      // outra vía C). A segunda pop dispara `result.has(current) → continue`.
      const g2 = new DependencyGraph(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'c', 'b')],
      )
      expect(g2.getAllDependents('a')).toEqual(new Set(['b', 'c']))
    })
  })

  describe('roots & leaves', () => {
    it('identifies roots and leaves', () => {
      const g = new DependencyGraph(['a', 'b', 'c'], [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')])
      expect(g.getRoots()).toEqual(['a'])
      expect(g.getLeaves()).toEqual(['c'])
    })

    it('isolated node is both root and leaf', () => {
      const g = new DependencyGraph(['solo'], [])
      expect(g.getRoots()).toContain('solo')
      expect(g.getLeaves()).toContain('solo')
    })

    it('multiple roots and leaves', () => {
      const g = new DependencyGraph(
        ['r1', 'r2', 'mid', 'l1', 'l2'],
        [
          edge('e1', 'r1', 'mid'),
          edge('e2', 'r2', 'mid'),
          edge('e3', 'mid', 'l1'),
          edge('e4', 'mid', 'l2'),
        ],
      )
      expect(g.getRoots().sort()).toEqual(['r1', 'r2'])
      expect(g.getLeaves().sort()).toEqual(['l1', 'l2'])
    })
  })

  describe('distanceBetween', () => {
    const g = new DependencyGraph(
      ['a', 'b', 'c', 'd', 'isolated'],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd')],
    )

    it('distance to self is 0', () => {
      expect(g.distanceBetween('a', 'a')).toBe(0)
    })

    it('adjacent distance is 1', () => {
      expect(g.distanceBetween('a', 'b')).toBe(1)
    })

    it('multi-hop distance', () => {
      expect(g.distanceBetween('a', 'd')).toBe(3)
    })

    it('no directed path is POSITIVE_INFINITY', () => {
      expect(g.distanceBetween('d', 'a')).toBe(Number.POSITIVE_INFINITY)
    })

    it('unknown node is POSITIVE_INFINITY', () => {
      expect(g.distanceBetween('a', 'zzz')).toBe(Number.POSITIVE_INFINITY)
      expect(g.distanceBetween('zzz', 'a')).toBe(Number.POSITIVE_INFINITY)
    })

    it('disconnected node is POSITIVE_INFINITY', () => {
      expect(g.distanceBetween('a', 'isolated')).toBe(Number.POSITIVE_INFINITY)
    })

    // Cobertura paydown: rama "visited.has(neighbor) === true" no BFS.
    // Topoloxía: root→a, root→b, a→c, b→c, c→target. O BFS visita 'c'
    // desde 'a' e marca como visitada; cando 'b' tamén tenta engadir
    // 'c', cae na rama "xa visitada" do `if (!visited.has(neighbor))`.
    it('diamond: cobre rama visited.has(neighbor) ao re-explorar', () => {
      const diamond = new DependencyGraph(
        ['root', 'a', 'b', 'c', 'target'],
        [
          edge('e1', 'root', 'a'),
          edge('e2', 'root', 'b'),
          edge('e3', 'a', 'c'),
          edge('e4', 'b', 'c'),
          edge('e5', 'c', 'target'),
        ],
      )
      expect(diamond.distanceBetween('root', 'target')).toBe(3)
    })
  })

  describe('getShortestPath', () => {
    const g = new DependencyGraph(
      ['a', 'b', 'c', 'd', 'x'],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd'), edge('e4', 'a', 'd')],
    )

    it('path to self is [self]', () => {
      expect(g.getShortestPath('a', 'a')).toEqual(['a'])
    })

    it('finds shortest path (prefers fewer hops)', () => {
      expect(g.getShortestPath('a', 'd')).toEqual(['a', 'd'])
    })

    it('finds multi-hop path', () => {
      expect(g.getShortestPath('b', 'd')).toEqual(['b', 'c', 'd'])
    })

    it('returns null when no path', () => {
      expect(g.getShortestPath('d', 'a')).toBeNull()
    })

    it('returns null for unknown nodes', () => {
      expect(g.getShortestPath('a', 'zzz')).toBeNull()
      expect(g.getShortestPath('zzz', 'a')).toBeNull()
    })

    it('returns null when target unreachable (isolated)', () => {
      expect(g.getShortestPath('a', 'x')).toBeNull()
    })
  })

  describe('getNodeIds / hasNode', () => {
    it('lists all node ids', () => {
      const g = new DependencyGraph(['a', 'b'], [edge('e1', 'b', 'c')])
      expect(g.getNodeIds().sort()).toEqual(['a', 'b', 'c'])
    })

    it('hasNode reflects presence', () => {
      const g = new DependencyGraph(['a'], [])
      expect(g.hasNode('a')).toBe(true)
      expect(g.hasNode('z')).toBe(false)
    })
  })
})
// ── FIN: tests de DependencyGraph ──
