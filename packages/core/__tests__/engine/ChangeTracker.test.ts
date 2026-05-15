// ── INICIO: tests de ChangeTracker ──
import { describe, expect, it } from 'vitest'
import { type ChangeConflict, ChangeTracker, analyzeChanges } from '../../src/engine/index.js'
import type { NodeDef, TreeChange } from '../../src/types/index.js'

/** Helper: NodeDef mínimo válido. */
function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    type: 'small',
    label: id,
    ...overrides,
  }
}

describe('analyzeChanges (function)', () => {
  describe('add_node', () => {
    it('adds the nodeId to affectedNodes', () => {
      const result = analyzeChanges([{ type: 'add_node', node: makeNode('a') }])
      expect(result.affectedNodes.has('a')).toBe(true)
    })

    it('invalidates all four cache types', () => {
      const result = analyzeChanges([{ type: 'add_node', node: makeNode('a') }])
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })

    it('detects duplicate_add_node when same id added twice', () => {
      const result = analyzeChanges([
        { type: 'add_node', node: makeNode('a') },
        { type: 'add_node', node: makeNode('a') },
      ])
      const dup = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'duplicate_add_node' }> =>
          c.type === 'duplicate_add_node',
      )
      expect(dup).toBeDefined()
      expect(dup?.nodeId).toBe('a')
      expect(dup?.positions).toEqual([0, 1])
    })
  })

  describe('remove_node', () => {
    it('adds the nodeId to affectedNodes', () => {
      const result = analyzeChanges([{ type: 'remove_node', nodeId: 'a' }])
      expect(result.affectedNodes.has('a')).toBe(true)
    })

    it('invalidates all four cache types', () => {
      const result = analyzeChanges([{ type: 'remove_node', nodeId: 'a' }])
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })

    it('detects add_then_remove conflict', () => {
      const result = analyzeChanges([
        { type: 'add_node', node: makeNode('a') },
        { type: 'remove_node', nodeId: 'a' },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'add_then_remove' }> =>
          c.type === 'add_then_remove',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.nodeId).toBe('a')
      expect(conflict?.addPosition).toBe(0)
      expect(conflict?.removePosition).toBe(1)
    })
  })

  describe('modify_node', () => {
    it('adds the nodeId to affectedNodes', () => {
      const result = analyzeChanges([
        { type: 'modify_node', nodeId: 'a', changes: { color: '#fff' } },
      ])
      expect(result.affectedNodes.has('a')).toBe(true)
    })

    it('invalidates layout for visual fields', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { position: { x: 1, y: 2 }, color: '#fff' },
        },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
    })

    it('invalidates dependency for prerequisites/exclusions', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { exclusions: ['x'] },
        },
      ])
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
    })

    it('invalidates search for label/description/tags', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { label: 'New', tags: ['t1'] },
        },
      ])
      expect(result.cachesToInvalidate.has('search')).toBe(true)
    })

    it('invalidates stats for statContributions', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: {
            statContributions: [{ statId: 'damage', op: '+', value: 5 }],
          },
        },
      ])
      expect(result.cachesToInvalidate.has('stats')).toBe(true)
    })

    it('detects remove_then_modify conflict', () => {
      const result = analyzeChanges([
        { type: 'remove_node', nodeId: 'a' },
        { type: 'modify_node', nodeId: 'a', changes: { color: '#fff' } },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'remove_then_modify' }> =>
          c.type === 'remove_then_modify',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.nodeId).toBe('a')
    })
  })

  describe('rename_node_id', () => {
    it('adds both oldId and newId to affectedNodes', () => {
      const result = analyzeChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'b' }])
      expect(result.affectedNodes.has('a')).toBe(true)
      expect(result.affectedNodes.has('b')).toBe(true)
    })

    it('records the rename in the renames map', () => {
      const result = analyzeChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'b' }])
      expect(result.renames.get('a')).toBe('b')
    })

    it('invalidates all four caches', () => {
      const result = analyzeChanges([{ type: 'rename_node_id', oldId: 'a', newId: 'b' }])
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })

    it('detects rename_chain (A→B then B→C)', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
        { type: 'rename_node_id', oldId: 'b', newId: 'c' },
      ])
      const chain = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'rename_chain' }> => c.type === 'rename_chain',
      )
      expect(chain).toBeDefined()
      expect(chain?.firstRename).toEqual({ oldId: 'a', newId: 'b' })
      expect(chain?.secondRename).toEqual({ oldId: 'b', newId: 'c' })
    })

    it('detects rename_to_existing (newId is already an oldId)', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
        { type: 'rename_node_id', oldId: 'c', newId: 'a' },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'rename_to_existing' }> =>
          c.type === 'rename_to_existing',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.newId).toBe('a')
    })

    it('detects modify_after_rename', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
        { type: 'modify_node', nodeId: 'a', changes: { color: '#fff' } },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'modify_after_rename' }> =>
          c.type === 'modify_after_rename',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.oldId).toBe('a')
    })
  })

  describe('edges', () => {
    it('add_edge marks source and target as affected', () => {
      const result = analyzeChanges([
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
      ])
      expect(result.affectedNodes.has('a')).toBe(true)
      expect(result.affectedNodes.has('b')).toBe(true)
    })

    it('add_edge invalidates layout and dependency', () => {
      const result = analyzeChanges([
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
      expect(result.cachesToInvalidate.has('search')).toBe(false)
    })

    it('detects duplicate_edge_id', () => {
      const result = analyzeChanges([
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'c', target: 'd', type: 'dependency' },
        },
      ])
      const dup = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'duplicate_edge_id' }> =>
          c.type === 'duplicate_edge_id',
      )
      expect(dup).toBeDefined()
      expect(dup?.edgeId).toBe('e1')
    })

    it('remove_edge invalidates layout and dependency', () => {
      const result = analyzeChanges([{ type: 'remove_edge', edgeId: 'e1' }])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
    })

    it('modify_edge with weight only invalidates layout', () => {
      const result = analyzeChanges([{ type: 'modify_edge', edgeId: 'e1', changes: { weight: 5 } }])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(false)
    })

    it('modify_edge with type invalidates layout and dependency', () => {
      const result = analyzeChanges([
        { type: 'modify_edge', edgeId: 'e1', changes: { type: 'soft_dependency' } },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
    })
  })

  describe('groups, resources, layout', () => {
    it('add_group invalidates layout and search', () => {
      const result = analyzeChanges([{ type: 'add_group', group: { id: 'g1', label: 'G1' } }])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout', 'search']))
    })

    it('remove_group invalidates layout and search', () => {
      const result = analyzeChanges([{ type: 'remove_group', groupId: 'g1' }])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout', 'search']))
    })

    it('modify_group invalidates layout and search', () => {
      const result = analyzeChanges([
        { type: 'modify_group', groupId: 'g1', changes: { color: '#fff' } },
      ])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout', 'search']))
    })

    it('add_resource invalidates stats only', () => {
      const result = analyzeChanges([
        { type: 'add_resource', resource: { id: 'gold', label: 'Gold' } },
      ])
      expect(result.cachesToInvalidate).toEqual(new Set(['stats']))
    })

    it('modify_layout invalidates layout only', () => {
      const result = analyzeChanges([{ type: 'modify_layout', changes: { type: 'tree' } }])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout']))
    })
  })

  describe('empty / edge cases', () => {
    it('empty list returns empty analysis', () => {
      const result = analyzeChanges([])
      expect(result.affectedNodes.size).toBe(0)
      expect(result.cachesToInvalidate.size).toBe(0)
      expect(result.internalConflicts).toHaveLength(0)
      expect(result.renames.size).toBe(0)
    })

    it('combines effects of multiple change types', () => {
      const changes: TreeChange[] = [
        { type: 'add_node', node: makeNode('a') },
        { type: 'add_group', group: { id: 'g1', label: 'G1' } },
        { type: 'add_resource', resource: { id: 'xp', label: 'XP' } },
      ]
      const result = analyzeChanges(changes)
      expect(result.affectedNodes.has('a')).toBe(true)
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })
  })
})

describe('ChangeTracker (class)', () => {
  it('analyze delegates to analyzeChanges', () => {
    const tracker = new ChangeTracker()
    const result = tracker.analyze([{ type: 'add_node', node: makeNode('a') }])
    expect(result.affectedNodes.has('a')).toBe(true)
    expect(result.cachesToInvalidate.size).toBeGreaterThan(0)
  })

  it('multiple analyze calls are independent', () => {
    const tracker = new ChangeTracker()
    const a = tracker.analyze([{ type: 'add_node', node: makeNode('x') }])
    const b = tracker.analyze([{ type: 'add_node', node: makeNode('y') }])
    expect(a.affectedNodes.has('x')).toBe(true)
    expect(a.affectedNodes.has('y')).toBe(false)
    expect(b.affectedNodes.has('y')).toBe(true)
    expect(b.affectedNodes.has('x')).toBe(false)
  })
})
// ── FIN: tests de ChangeTracker ──
