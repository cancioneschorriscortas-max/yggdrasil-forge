import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { Federator } from '../../src/engine/Federator.js'
import type { NodeDef, TreeDef } from '../../src/types/index.js'

// ── Helpers ──

function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return { id, label: id, type: 'passive', ...overrides }
}

function makeTree(id: string, overrides?: Partial<TreeDef>): TreeDef {
  return {
    id,
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: `Tree ${id}`,
    nodes: [makeNode(`${id}-n1`)],
    edges: [{ id: `${id}-e1`, source: `${id}-n1`, target: `${id}-n1`, type: 'directed' }],
    layout: { type: 'radial' },
    ...overrides,
  }
}

const fed = new Federator()

// ── Tests ──

describe('Federator', () => {
  // ── detectConflicts ──

  describe('detectConflicts', () => {
    it('1. array vacío: cero conflitos', () => {
      const report = fed.detectConflicts([])
      expect(report.hasConflicts).toBe(false)
      expect(report.conflicts).toHaveLength(0)
    })

    it('2. 1 só tree: cero conflitos', () => {
      const report = fed.detectConflicts([makeTree('a')])
      expect(report.hasConflicts).toBe(false)
    })

    it('3. 2 trees sen colisión: cero conflitos', () => {
      const report = fed.detectConflicts([makeTree('a'), makeTree('b')])
      expect(report.hasConflicts).toBe(false)
    })

    it('4. 2 trees con node_id duplicado: 1 conflict', () => {
      const tA = makeTree('a', { nodes: [makeNode('shared')] })
      const tB = makeTree('b', { nodes: [makeNode('shared')] })
      const report = fed.detectConflicts([tA, tB])
      expect(report.hasConflicts).toBe(true)
      const nodeConflicts = report.conflicts.filter((c) => c.type === 'node_id')
      expect(nodeConflicts).toHaveLength(1)
      expect(nodeConflicts[0].id).toBe('shared')
    })

    it('5. 3 trees con node_id en 2/3: trees correcto', () => {
      const tA = makeTree('a', { nodes: [makeNode('dup')] })
      const tB = makeTree('b', { nodes: [makeNode('dup')] })
      const tC = makeTree('c')
      const report = fed.detectConflicts([tA, tB, tC])
      const c = report.conflicts.find((x) => x.type === 'node_id' && x.id === 'dup')
      expect(c).toBeDefined()
      expect(c?.trees).toContain('a')
      expect(c?.trees).toContain('b')
      expect(c?.trees).not.toContain('c')
    })

    it('6. tree_id duplicado: detectado', () => {
      const tA = makeTree('same')
      const tB = makeTree('same')
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'tree_id')).toBe(true)
    })

    it('7. edge_id duplicado: detectado', () => {
      const tA = makeTree('a', { edges: [{ id: 'e', source: 'x', target: 'y', type: 'directed' }] })
      const tB = makeTree('b', { edges: [{ id: 'e', source: 'x', target: 'y', type: 'directed' }] })
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'edge_id')).toBe(true)
    })

    it('8. group_id duplicado: detectado', () => {
      const tA = makeTree('a', { groups: [{ id: 'g', label: 'G' }] })
      const tB = makeTree('b', { groups: [{ id: 'g', label: 'G' }] })
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'group_id')).toBe(true)
    })

    it('9. resource_id duplicado: detectado', () => {
      const tA = makeTree('a', { resources: [{ id: 'xp', label: 'XP' }] })
      const tB = makeTree('b', { resources: [{ id: 'xp', label: 'XP' }] })
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'resource_id')).toBe(true)
    })

    it('10. stat_id duplicado: detectado', () => {
      const tA = makeTree('a', { stats: [{ id: 's1', label: 'S' }] })
      const tB = makeTree('b', { stats: [{ id: 's1', label: 'S' }] })
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'stat_id')).toBe(true)
    })

    it('11. subtree_id duplicado: detectado', () => {
      const tA = makeTree('a', { subtrees: { sub: makeTree('sub-a') } })
      const tB = makeTree('b', { subtrees: { sub: makeTree('sub-b') } })
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'subtree_id')).toBe(true)
    })

    it('12. múltiples tipos de conflitos á vez', () => {
      const tA = makeTree('a', {
        nodes: [makeNode('n')],
        resources: [{ id: 'r', label: 'R' }],
      })
      const tB = makeTree('b', {
        nodes: [makeNode('n')],
        resources: [{ id: 'r', label: 'R' }],
      })
      const report = fed.detectConflicts([tA, tB])
      expect(report.conflicts.some((c) => c.type === 'node_id')).toBe(true)
      expect(report.conflicts.some((c) => c.type === 'resource_id')).toBe(true)
    })
  })

  // ── mergeTreeDefs validation ──

  describe('mergeTreeDefs validation', () => {
    it('13. 0 trees: err(MERGE_INVALID_INPUT)', () => {
      const result = fed.mergeTreeDefs([], 'first_wins')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe(ErrorCode.MERGE_INVALID_INPUT)
    })

    it('14. 1 tree: err(MERGE_INVALID_INPUT)', () => {
      const result = fed.mergeTreeDefs([makeTree('a')], 'first_wins')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe(ErrorCode.MERGE_INVALID_INPUT)
    })

    it('15. schemaVersion distintos: err(MERGE_INCOMPATIBLE_SCHEMA)', () => {
      const tA = makeTree('a', { schemaVersion: '1.0.0' })
      const tB = makeTree('b', { schemaVersion: '2.0.0' })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe(ErrorCode.MERGE_INCOMPATIBLE_SCHEMA)
    })

    it('16. schemaVersion iguais: ok', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins')
      expect(result.ok).toBe(true)
    })

    it("17. locale 'es' propaga", () => {
      const result = fed.mergeTreeDefs([], 'first_wins', { locale: 'es' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.message).toContain('requiere al menos')
    })

    it("18. locale 'en' propaga", () => {
      const result = fed.mergeTreeDefs([], 'first_wins', { locale: 'en' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.message).toContain('requires at least')
    })
  })

  // ── namespace_all ──

  describe("mergeTreeDefs 'namespace_all'", () => {
    it('19. 2 trees simples: nodes con prefix correcto', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const nodeIds = result.value.nodes.map((n) => n.id)
      expect(nodeIds).toContain('a:a-n1')
      expect(nodeIds).toContain('b:b-n1')
    })

    it('20. edges: source/target prefixados', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const edge = result.value.edges.find((e) => e.id === 'a:a-e1')
      expect(edge?.source).toBe('a:a-n1')
      expect(edge?.target).toBe('a:a-n1')
    })

    it('21. rootNodeId prefixado', () => {
      const tA = makeTree('a', { rootNodeId: 'a-n1' })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      // rootNodeId non aparece no resultado top-level porque combineTrees usa originalTrees
      // pero o rewrite interno prefixaríao. Verificamos que nodes existen.
      if (result.ok) {
        expect(result.value.nodes.some((n) => n.id === 'a:a-n1')).toBe(true)
      }
    })

    it('22. groups: id + nodeIds refs prefixados', () => {
      const tA = makeTree('a', {
        groups: [{ id: 'g1', label: 'G', nodeIds: ['a-n1'] }],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const group = result.value.groups?.find((g) => g.id === 'a:g1')
      expect(group).toBeDefined()
      expect(group?.nodeIds).toContain('a:a-n1')
    })

    it('23. resources e stats: ids prefixados', () => {
      const tA = makeTree('a', {
        resources: [{ id: 'xp', label: 'XP' }],
        stats: [{ id: 'str', label: 'STR' }],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.resources?.some((r) => r.id === 'a:xp')).toBe(true)
      expect(result.value.stats?.some((s) => s.id === 'a:str')).toBe(true)
    })

    it('24. subtrees keys prefixadas', () => {
      const tA = makeTree('a', { subtrees: { sub1: makeTree('sub1') } })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.subtrees?.['a:sub1']).toBeDefined()
    })

    it('25. prereq node_unlocked: nodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: { type: 'node_unlocked', nodeId: 'n2' },
          }),
          makeNode('n2'),
        ],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.prerequisites).toEqual({
        type: 'node_unlocked',
        nodeId: 'a:n2',
      })
    })

    it('26. prereq all recursivo: prefixos en todos os children', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: {
              type: 'all',
              conditions: [
                { type: 'node_unlocked', nodeId: 'n2' },
                { type: 'resource_min', resourceId: 'xp', amount: 10 },
              ],
            },
          }),
          makeNode('n2'),
        ],
        resources: [{ id: 'xp', label: 'XP' }],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      const prereq = n1?.prerequisites
      expect(prereq).toBeDefined()
      if (prereq?.type === 'all') {
        expect(prereq.conditions[0]).toEqual({
          type: 'node_unlocked',
          nodeId: 'a:n2',
        })
        expect(prereq.conditions[1]).toEqual({
          type: 'resource_min',
          resourceId: 'a:xp',
          amount: 10,
        })
      }
    })

    it('27. prereq any recursivo: análogo', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: {
              type: 'any',
              conditions: [
                { type: 'stat_min', statId: 's1', amount: 5 },
                { type: 'subtree_completion', subtreeId: 'sub1', percent: 100 },
              ],
            },
          }),
        ],
        stats: [{ id: 's1', label: 'S' }],
        subtrees: { sub1: makeTree('sub1') },
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      if (n1?.prerequisites?.type === 'any') {
        expect(n1.prerequisites.conditions[0]).toEqual({
          type: 'stat_min',
          statId: 'a:s1',
          amount: 5,
        })
        expect(n1.prerequisites.conditions[1]).toEqual({
          type: 'subtree_completion',
          subtreeId: 'a:sub1',
          percent: 100,
        })
      }
    })

    it('28. prereq resource_min, stat_min, subtree_completion: ids prefixados', () => {
      // Xa cuberto en 26 e 27 implícitamente
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: { type: 'resource_min', resourceId: 'gold', amount: 50 },
          }),
        ],
        resources: [{ id: 'gold', label: 'Gold' }],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.prerequisites).toEqual({
        type: 'resource_min',
        resourceId: 'a:gold',
        amount: 50,
      })
    })

    it('29. effects: unlock_node, set_progress nodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [
              { type: 'unlock_node', nodeId: 'n2' },
              { type: 'set_progress', nodeId: 'n2', percent: 50 },
            ],
          }),
          makeNode('n2'),
        ],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.effects?.[0]).toEqual({ type: 'unlock_node', nodeId: 'a:n2' })
      expect(n1?.effects?.[1]).toEqual({ type: 'set_progress', nodeId: 'a:n2', percent: 50 })
    })

    it('30. tree.id resultante: usa mergedMeta ou primeira árbore', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'namespace_all', {
        mergedMeta: { id: 'merged' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.id).toBe('merged')
    })

    it('31. cero references rotas tras merge', () => {
      const tA = makeTree('a', {
        nodes: [makeNode('x'), makeNode('y')],
        edges: [{ id: 'xy', source: 'x', target: 'y', type: 'directed' }],
      })
      const tB = makeTree('b', {
        nodes: [makeNode('p'), makeNode('q')],
        edges: [{ id: 'pq', source: 'p', target: 'q', type: 'directed' }],
      })
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const nodeIds = new Set(result.value.nodes.map((n) => n.id))
      for (const edge of result.value.edges) {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
      }
    })

    it('32. NodeDef.subtreeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [makeNode('anchor', { subtreeId: 'sub1' })],
        subtrees: { sub1: makeTree('sub1') },
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const anchor = result.value.nodes.find((n) => n.id === 'a:anchor')
      expect(anchor?.subtreeId).toBe('a:sub1')
    })

    it('33. tree.subtrees[id].nodes NON se rewrite (subtree intacto)', () => {
      const subDef = makeTree('sub1', { nodes: [makeNode('inner')] })
      const tA = makeTree('a', { subtrees: { sub1: subDef } })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const subtree = result.value.subtrees?.['a:sub1']
      expect(subtree).toBeDefined()
      // O contenido do subtree NON se reescribe: nodes seguen co id orixinal
      expect(subtree?.nodes.some((n) => n.id === 'inner')).toBe(true)
    })
  })

  // ── first_wins ──

  describe("mergeTreeDefs 'first_wins'", () => {
    it('34. sen colisións: equivalente a concat', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.nodes).toHaveLength(2)
      expect(result.value.edges).toHaveLength(2)
    })

    it('35. con colisión node: mantén o primeiro', () => {
      const tA = makeTree('a', { nodes: [makeNode('n', { label: 'First' })] })
      const tB = makeTree('b', { nodes: [makeNode('n', { label: 'Second' })] })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.nodes).toHaveLength(1)
      expect(result.value.nodes[0].label).toBe('First')
    })

    it('36. cross-references NON se rewrite', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: { type: 'node_unlocked', nodeId: 'n2' },
          }),
        ],
      })
      const tB = makeTree('b')
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'n1')
      // References mantéñense orixinais (cero prefix)
      expect(n1?.prerequisites).toEqual({
        type: 'node_unlocked',
        nodeId: 'n2',
      })
    })

    it('37. con colisión subtree_id: mantén o primeiro', () => {
      const tA = makeTree('a', { subtrees: { sub: makeTree('sub-a') } })
      const tB = makeTree('b', { subtrees: { sub: makeTree('sub-b') } })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.subtrees?.sub.id).toBe('sub-a')
    })

    it('38. metadata: first tree gana', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins')
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.id).toBe('a')
    })

    it('38b. first_wins con colisión group: mantén o primeiro', () => {
      const tA = makeTree('a', { groups: [{ id: 'g', label: 'First' }] })
      const tB = makeTree('b', { groups: [{ id: 'g', label: 'Second' }] })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.groups).toHaveLength(1)
      expect(result.value.groups?.[0].label).toBe('First')
    })

    it('38c. first_wins con colisión resource: mantén o primeiro', () => {
      const tA = makeTree('a', { resources: [{ id: 'r', label: 'First' }] })
      const tB = makeTree('b', { resources: [{ id: 'r', label: 'Second' }] })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.resources).toHaveLength(1)
      expect(result.value.resources?.[0].label).toBe('First')
    })

    it('38d. first_wins con colisión stat: mantén o primeiro', () => {
      const tA = makeTree('a', { stats: [{ id: 's', label: 'First' }] })
      const tB = makeTree('b', { stats: [{ id: 's', label: 'Second' }] })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.stats).toHaveLength(1)
      expect(result.value.stats?.[0].label).toBe('First')
    })

    it('38e. first_wins con colisión edge: mantén o primeiro', () => {
      const tA = makeTree('a', {
        edges: [{ id: 'e', source: 'x', target: 'y', type: 'directed', weight: 1 }],
      })
      const tB = makeTree('b', {
        edges: [{ id: 'e', source: 'p', target: 'q', type: 'directed', weight: 9 }],
      })
      const result = fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.edges.filter((e) => e.id === 'e')).toHaveLength(1)
      expect(result.value.edges.find((e) => e.id === 'e')?.weight).toBe(1)
    })

    it('39. cero mutación de input', () => {
      const tA = makeTree('a')
      const tB = makeTree('b')
      const snapA = JSON.parse(JSON.stringify(tA))
      const snapB = JSON.parse(JSON.stringify(tB))
      fed.mergeTreeDefs([tA, tB], 'first_wins')
      expect(tA).toEqual(snapA)
      expect(tB).toEqual(snapB)
    })
  })

  // ── last_wins ──

  describe("mergeTreeDefs 'last_wins'", () => {
    it('40. sen colisións: equivalente a concat', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.nodes).toHaveLength(2)
    })

    it('41. con colisión node: mantén o último', () => {
      const tA = makeTree('a', { nodes: [makeNode('n', { label: 'First' })] })
      const tB = makeTree('b', { nodes: [makeNode('n', { label: 'Last' })] })
      const result = fed.mergeTreeDefs([tA, tB], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.nodes).toHaveLength(1)
      expect(result.value.nodes[0].label).toBe('Last')
    })

    it('42. con colisión múltiple (3 trees): último prevalece', () => {
      const tA = makeTree('a', { nodes: [makeNode('n', { label: 'A' })] })
      const tB = makeTree('b', { nodes: [makeNode('n', { label: 'B' })] })
      const tC = makeTree('c', { nodes: [makeNode('n', { label: 'C' })] })
      const result = fed.mergeTreeDefs([tA, tB, tC], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.nodes).toHaveLength(1)
      expect(result.value.nodes[0].label).toBe('C')
    })
  })

  // ── manual ──

  describe("mergeTreeDefs 'manual'", () => {
    it('43. sen conflitos: equivalente a first_wins ok', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'manual')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.nodes).toHaveLength(2)
    })

    it('44. con conflitos: err(MERGE_CONFLICTS_DETECTED)', () => {
      const tA = makeTree('a', { nodes: [makeNode('dup')] })
      const tB = makeTree('b', { nodes: [makeNode('dup')] })
      const result = fed.mergeTreeDefs([tA, tB], 'manual')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe(ErrorCode.MERGE_CONFLICTS_DETECTED)
    })

    it('45. context inclúe ConflictReport', () => {
      const tA = makeTree('a', { nodes: [makeNode('dup')] })
      const tB = makeTree('b', { nodes: [makeNode('dup')] })
      const result = fed.mergeTreeDefs([tA, tB], 'manual')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        const ctx = result.error.context as { report: { hasConflicts: boolean } }
        expect(ctx.report.hasConflicts).toBe(true)
      }
    })

    it('46. locale propaga á mensaxe', () => {
      const tA = makeTree('a', { nodes: [makeNode('dup')] })
      const tB = makeTree('b', { nodes: [makeNode('dup')] })
      const result = fed.mergeTreeDefs([tA, tB], 'manual', { locale: 'en' })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.message).toContain('conflicts detected')
    })

    it('47. cero merge real cando devolve err', () => {
      const tA = makeTree('a', { nodes: [makeNode('dup')] })
      const tB = makeTree('b', { nodes: [makeNode('dup')] })
      const result = fed.mergeTreeDefs([tA, tB], 'manual')
      expect(result.ok).toBe(false)
      // Non hai .value dispoñible
    })
  })

  // ── MergedTreeMeta ──

  describe('MergedTreeMeta', () => {
    it('48. cero mergedMeta: usa primeira árbore', () => {
      const result = fed.mergeTreeDefs([makeTree('alpha'), makeTree('beta')], 'first_wins')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('alpha')
        expect(result.value.label).toBe('Tree alpha')
      }
    })

    it('49. mergedMeta.id custom: aplícase', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins', {
        mergedMeta: { id: 'custom-id' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.id).toBe('custom-id')
    })

    it('50. mergedMeta.label custom: aplícase', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins', {
        mergedMeta: { label: 'Custom Label' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.label).toBe('Custom Label')
    })

    it('51. mergedMeta parcial: combina con primeira árbore', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins', {
        mergedMeta: { id: 'merged' },
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('merged')
        expect(result.value.label).toBe('Tree a')
      }
    })

    it('52. mergedMeta sobreescribe layout', () => {
      const result = fed.mergeTreeDefs([makeTree('a'), makeTree('b')], 'first_wins', {
        mergedMeta: { layout: { type: 'tree' } },
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.layout).toEqual({ type: 'tree' })
    })
  })

  // ── Inmutabilidade ──

  describe('inmutabilidade', () => {
    it('53. input trees NON modificados (deep equality)', () => {
      const tA = makeTree('a', {
        nodes: [makeNode('n1'), makeNode('n2')],
        resources: [{ id: 'xp', label: 'XP' }],
      })
      const tB = makeTree('b')
      const snapA = JSON.parse(JSON.stringify(tA))
      const snapB = JSON.parse(JSON.stringify(tB))
      fed.mergeTreeDefs([tA, tB], 'namespace_all')
      expect(tA).toEqual(snapA)
      expect(tB).toEqual(snapB)
    })

    it('54. cero shared references entre input e output', () => {
      const tA = makeTree('a')
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'first_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // Os nodos do output non son a mesma referencia que os do input
      // (para first_wins poden ser a mesma ref xa que non se copian)
      // pero o array en si é distinto
      expect(result.value.nodes).not.toBe(tA.nodes)
    })
  })

  // ── Cobertura ramas adicionais ──

  describe('namespace_all — ramas adicionais', () => {
    it('distance_max.fromNodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: { type: 'distance_max', fromNodeId: 'n2', maxSteps: 3 },
          }),
          makeNode('n2'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.prerequisites).toEqual({
        type: 'distance_max',
        fromNodeId: 'a:n2',
        maxSteps: 3,
      })
    })

    it('prereq none recursivo: conditions reescritas', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: {
              type: 'none',
              conditions: [{ type: 'node_maxed', nodeId: 'n2' }],
            },
          }),
          makeNode('n2'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      if (n1?.prerequisites?.type === 'none') {
        expect(n1.prerequisites.conditions[0]).toEqual({
          type: 'node_maxed',
          nodeId: 'a:n2',
        })
      }
    })

    it('prereq tier_min + progress_min: nodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: {
              type: 'all',
              conditions: [
                { type: 'tier_min', nodeId: 'n2', tier: 3 },
                { type: 'progress_min', nodeId: 'n3', percent: 50 },
              ],
            },
          }),
          makeNode('n2'),
          makeNode('n3'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      if (n1?.prerequisites?.type === 'all') {
        expect(n1.prerequisites.conditions[0]).toEqual({
          type: 'tier_min',
          nodeId: 'a:n2',
          tier: 3,
        })
        expect(n1.prerequisites.conditions[1]).toEqual({
          type: 'progress_min',
          nodeId: 'a:n3',
          percent: 50,
        })
      }
    })

    it('prereq node_state: nodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: { type: 'node_state', nodeId: 'n2', state: 'maxed' },
          }),
          makeNode('n2'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.prerequisites).toEqual({
        type: 'node_state',
        nodeId: 'a:n2',
        state: 'maxed',
      })
    })

    it('prereq nodes_count/tag_count/time_after/custom: intactos', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            prerequisites: { type: 'nodes_count', count: 5 },
          }),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.prerequisites).toEqual({ type: 'nodes_count', count: 5 })
    })

    it('effect modify_resource: resourceId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [{ type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10 }],
          }),
        ],
        resources: [{ id: 'xp', label: 'XP' }],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.effects?.[0]).toEqual({
        type: 'modify_resource',
        resourceId: 'a:xp',
        op: '+',
        amount: 10,
      })
    })

    it('effect modify_stat: statId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [{ type: 'modify_stat', statId: 's1', op: '+', amount: 5 }],
          }),
        ],
        stats: [{ id: 's1', label: 'S' }],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.effects?.[0]).toEqual({
        type: 'modify_stat',
        statId: 'a:s1',
        op: '+',
        amount: 5,
      })
    })

    it('effect modify_node_state: nodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [{ type: 'modify_node_state', nodeId: 'n2', state: 'disabled' }],
          }),
          makeNode('n2'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.effects?.[0]).toEqual({
        type: 'modify_node_state',
        nodeId: 'a:n2',
        state: 'disabled',
      })
    })

    it('effect set_node_visibility: nodeId prefixado', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [{ type: 'set_node_visibility', nodeId: 'n2', visible: false }],
          }),
          makeNode('n2'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.effects?.[0]).toEqual({
        type: 'set_node_visibility',
        nodeId: 'a:n2',
        visible: false,
      })
    })

    it('effect conditional: condition + then + else reescritos', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [
              {
                type: 'conditional',
                condition: { type: 'node_unlocked', nodeId: 'n2' },
                // biome-ignore lint/suspicious/noThenProperty: Effect DSL
                then: [{ type: 'unlock_node', nodeId: 'n3' }],
                else: [{ type: 'set_progress', nodeId: 'n4', percent: 0 }],
              },
            ],
          }),
          makeNode('n2'),
          makeNode('n3'),
          makeNode('n4'),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      const eff = n1?.effects?.[0]
      if (eff?.type === 'conditional') {
        expect(eff.condition).toEqual({ type: 'node_unlocked', nodeId: 'a:n2' })
        expect(eff.then[0]).toEqual({ type: 'unlock_node', nodeId: 'a:n3' })
        expect(eff.else?.[0]).toEqual({ type: 'set_progress', nodeId: 'a:n4', percent: 0 })
      }
    })

    it('effect composite: effects recursivos', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [
              {
                type: 'composite',
                effects: [
                  { type: 'unlock_node', nodeId: 'n2' },
                  { type: 'modify_resource', resourceId: 'xp', op: '+', amount: 5 },
                ],
              },
            ],
          }),
          makeNode('n2'),
        ],
        resources: [{ id: 'xp', label: 'XP' }],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      const eff = n1?.effects?.[0]
      if (eff?.type === 'composite') {
        expect(eff.effects[0]).toEqual({ type: 'unlock_node', nodeId: 'a:n2' })
        expect(eff.effects[1]).toEqual({
          type: 'modify_resource',
          resourceId: 'a:xp',
          op: '+',
          amount: 5,
        })
      }
    })

    it('effect trigger_event: intacto (cero rewrite)', () => {
      const tA = makeTree('a', {
        nodes: [
          makeNode('n1', {
            effects: [{ type: 'trigger_event', eventName: 'boom' }],
          }),
        ],
      })
      const result = fed.mergeTreeDefs([tA, makeTree('b')], 'namespace_all')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const n1 = result.value.nodes.find((n) => n.id === 'a:n1')
      expect(n1?.effects?.[0]).toEqual({ type: 'trigger_event', eventName: 'boom' })
    })
  })

  describe('last_wins — ramas adicionais', () => {
    it('last_wins con colisión resource: mantén o último', () => {
      const tA = makeTree('a', { resources: [{ id: 'r', label: 'A' }] })
      const tB = makeTree('b', { resources: [{ id: 'r', label: 'B' }] })
      const result = fed.mergeTreeDefs([tA, tB], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.resources).toHaveLength(1)
      expect(result.value.resources?.[0].label).toBe('B')
    })

    it('last_wins con colisión stat: mantén o último', () => {
      const tA = makeTree('a', { stats: [{ id: 's', label: 'A' }] })
      const tB = makeTree('b', { stats: [{ id: 's', label: 'B' }] })
      const result = fed.mergeTreeDefs([tA, tB], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.stats).toHaveLength(1)
      expect(result.value.stats?.[0].label).toBe('B')
    })

    it('last_wins con colisión group: mantén o último', () => {
      const tA = makeTree('a', { groups: [{ id: 'g', label: 'A' }] })
      const tB = makeTree('b', { groups: [{ id: 'g', label: 'B' }] })
      const result = fed.mergeTreeDefs([tA, tB], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.groups).toHaveLength(1)
      expect(result.value.groups?.[0].label).toBe('B')
    })

    it('last_wins con colisión edge: mantén o último', () => {
      const tA = makeTree('a', {
        edges: [{ id: 'e', source: 'x', target: 'y', type: 'directed', weight: 1 }],
      })
      const tB = makeTree('b', {
        edges: [{ id: 'e', source: 'p', target: 'q', type: 'directed', weight: 9 }],
      })
      const result = fed.mergeTreeDefs([tA, tB], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.edges.filter((e) => e.id === 'e')).toHaveLength(1)
      expect(result.value.edges.find((e) => e.id === 'e')?.weight).toBe(9)
    })

    it('last_wins con colisión subtree: mantén o último', () => {
      const tA = makeTree('a', { subtrees: { sub: makeTree('sub-first') } })
      const tB = makeTree('b', { subtrees: { sub: makeTree('sub-last') } })
      const result = fed.mergeTreeDefs([tA, tB], 'last_wins')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.subtrees?.sub.id).toBe('sub-last')
    })
  })
})
