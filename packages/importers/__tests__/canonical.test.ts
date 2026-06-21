// ── INICIO: tests F9.2 — checkCanonicalCoherence ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { checkCanonicalCoherence } from '../src/index.js'

function makeTree(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'T',
    nodes: [],
    edges: [],
    layout: { type: 'identity' },
    ...overrides,
  }
}

describe('checkCanonicalCoherence', () => {
  it('árbore coherente → []', () => {
    const tree = makeTree({
      nodes: [
        {
          id: 'a',
          type: 'small',
          label: 'A',
          metadata: { gaia: { canonicalSkillId: 'sk1' } },
        },
        {
          id: 'b',
          type: 'small',
          label: 'B',
          metadata: { gaia: { canonicalSkillId: 'sk2' } },
        },
      ],
      metadata: { gaia: { canonicalWeights: { sk1: 3, sk2: 2 } } },
    })
    expect(checkCanonicalCoherence(tree)).toEqual([])
  })

  it('nodo con canonicalSkillId descoñecido → 1 problema', () => {
    const tree = makeTree({
      nodes: [
        {
          id: 'a',
          type: 'small',
          label: 'A',
          metadata: { gaia: { canonicalSkillId: 'sk_ghost' } },
        },
      ],
      metadata: { gaia: { canonicalWeights: { sk1: 3 } } },
    })
    const problems = checkCanonicalCoherence(tree)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('sk_ghost')
    expect(problems[0]).toContain('"a"')
  })

  it('árbore sen metadata gaia → []', () => {
    const tree = makeTree({
      nodes: [{ id: 'a', type: 'small', label: 'A' }],
    })
    expect(checkCanonicalCoherence(tree)).toEqual([])
  })

  it('nodo sen metadata gaia ignórase', () => {
    const tree = makeTree({
      nodes: [
        { id: 'a', type: 'small', label: 'A' },
        {
          id: 'b',
          type: 'small',
          label: 'B',
          metadata: { gaia: { canonicalSkillId: 'sk1' } },
        },
      ],
      metadata: { gaia: { canonicalWeights: { sk1: 3 } } },
    })
    expect(checkCanonicalCoherence(tree)).toEqual([])
  })

  it('canonicalSkillId non-string ignórase (defensive)', () => {
    const tree = makeTree({
      nodes: [
        {
          id: 'a',
          type: 'small',
          label: 'A',
          metadata: { gaia: { canonicalSkillId: 42 as unknown as string } },
        },
      ],
      metadata: { gaia: { canonicalWeights: { sk1: 3 } } },
    })
    expect(checkCanonicalCoherence(tree)).toEqual([])
  })
})
// ── FIN: tests F9.2 ──
