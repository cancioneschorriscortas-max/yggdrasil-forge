// ── INICIO: tests de TreeEngine.shareBuild + loadFromShareLink ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { decodeFromUrl } from '../../src/builds/UrlSerializer.js'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes: [{ id: 'node-a', label: 'Node A', type: 'passive' }],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

describe('TreeEngine.shareBuild + loadFromShareLink', () => {
  it('shareBuild() sen baseUrl devolve BuildShareLink con url = shortCode', () => {
    const engine = new TreeEngine(makeTreeDef())
    const link = engine.shareBuild()
    expect(link.shortCode.length).toBeGreaterThan(0)
    expect(link.url).toBe(link.shortCode)
  })

  it('shareBuild({ baseUrl }) constrúe url completa', () => {
    const engine = new TreeEngine(makeTreeDef())
    const link = engine.shareBuild({ baseUrl: 'https://x.com/s/' })
    expect(link.url).toBe(`https://x.com/s/${link.shortCode}`)
  })

  it('shareBuild() produce shortCode decodificable con decodeFromUrl', () => {
    const engine = new TreeEngine(makeTreeDef())
    const link = engine.shareBuild()
    const result = decodeFromUrl(link.shortCode)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.treeId).toBe('test-tree')
    }
  })

  it('loadFromShareLink con código válido devolve ok(build) con treeId correcto', () => {
    const engine = new TreeEngine(makeTreeDef())
    const link = engine.shareBuild()
    const result = engine.loadFromShareLink(link.shortCode)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.treeId).toBe('test-tree')
      expect(result.value.treeVersion).toBe('1.0.0')
    }
  })

  it('loadFromShareLink con código inválido devolve err SHARE_LINK_DECODE_FAILED', () => {
    const engine = new TreeEngine(makeTreeDef())
    const result = engine.loadFromShareLink('invalid!!!')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.SHARE_LINK_DECODE_FAILED)
    }
  })

  it('roundtrip end-to-end: shareBuild → loadFromShareLink → treeId igual', () => {
    const treeDef = makeTreeDef({ id: 'roundtrip-tree', version: '2.0.0' })
    const engine = new TreeEngine(treeDef)
    const link = engine.shareBuild()
    const result = engine.loadFromShareLink(link.shortCode)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.treeId).toBe('roundtrip-tree')
      expect(result.value.treeVersion).toBe('2.0.0')
      expect(result.value.schemaVersion).toBe('1.0.0')
      expect(result.value.state.nodes).toBeDefined()
    }
  })
})
// ── FIN: tests de TreeEngine.shareBuild + loadFromShareLink ──
