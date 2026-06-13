import type { TreeDef } from '@yggdrasil-forge/core'
// ── INICIO: tests serializeForClient ──
import { describe, expect, it } from 'vitest'
import { serializeForClient } from '../src/serializeForClient.js'

function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
    ...overrides,
  }
}

describe('serializeForClient', () => {
  it('devolve JSON válido (parseable)', () => {
    const result = serializeForClient(makeMinimalTreeDef())
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('inclúe treeDef e state no parsed result', () => {
    const td = makeMinimalTreeDef()
    const result = serializeForClient(td)
    const parsed = JSON.parse(result)
    expect(parsed.treeDef).toBeDefined()
    expect('state' in parsed).toBe(true)
  })

  it('state undefined → state: null no output', () => {
    const result = serializeForClient(makeMinimalTreeDef())
    const parsed = JSON.parse(result)
    expect(parsed.state).toBeNull()
  })

  it('escapa < como \\u003c', () => {
    const td = makeMinimalTreeDef({ label: 'test<script>' })
    const result = serializeForClient(td)
    expect(result).not.toContain('<')
    expect(result).toContain('\\u003c')
  })

  it('escapa > como \\u003e', () => {
    const td = makeMinimalTreeDef({ label: 'test>' })
    const result = serializeForClient(td)
    expect(result).not.toContain('>')
    expect(result).toContain('\\u003e')
  })
})
// ── FIN: tests serializeForClient ──
