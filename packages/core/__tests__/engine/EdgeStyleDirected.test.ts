// ── INICIO: tests EdgeStyle.directed (F10.4) ──
import { describe, expect, it } from 'vitest'
import { treeDefSchema } from '../../src/engine/treeDefSchema.js'
import type { EdgeStyle, TreeDef } from '../../src/index.js'

function makeTreeWithEdge(style: EdgeStyle): unknown {
  return {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { en: 'T', es: 'T', gl: 'T' },
    nodes: [
      { id: 'a', type: 'small', label: { en: 'A', es: 'A', gl: 'A' } },
      { id: 'b', type: 'small', label: { en: 'B', es: 'B', gl: 'B' } },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b', type: 'dependency', style }],
    layout: { type: 'identity' },
  }
}

describe('EdgeStyle.directed — schema Zod (F10.4)', () => {
  it('acepta directed: true', () => {
    const data = makeTreeWithEdge({ directed: true })
    const result = treeDefSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      const tree = result.data as TreeDef
      expect(tree.edges[0]?.style?.directed).toBe(true)
    }
  })

  it('acepta directed: false', () => {
    const data = makeTreeWithEdge({ directed: false })
    const result = treeDefSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('acepta directed omitido (campo opcional)', () => {
    const data = makeTreeWithEdge({ color: '#abc' })
    const result = treeDefSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      const tree = result.data as TreeDef
      expect(tree.edges[0]?.style?.directed).toBeUndefined()
    }
  })

  it('rexeita directed con tipo non boolean', () => {
    const data = makeTreeWithEdge({ directed: 'yes' as unknown as boolean })
    const result = treeDefSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
// ── FIN: tests EdgeStyle.directed ──
