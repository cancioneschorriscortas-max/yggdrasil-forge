// ── INICIO: tests de UrlSerializer ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { decodeFromUrl, encodeForUrl } from '../../src/builds/UrlSerializer.js'
import type { Build } from '../../src/types/index.js'

function makeBuild(overrides?: Partial<Build>): Build {
  return {
    id: 'build-1',
    treeId: 'tree-1',
    treeVersion: '1.0.0',
    schemaVersion: '1.0.0',
    createdAt: 1000,
    updatedAt: 2000,
    state: {
      nodes: { 'node-a': { state: 'locked', points: 0 } },
      budget: { resources: {} },
    },
    ...overrides,
  } as Build
}

describe('UrlSerializer', () => {
  it('encodeForUrl(build) produce string URL-safe', () => {
    const build = makeBuild()
    const code = encodeForUrl(build)
    expect(code).not.toMatch(/[+/=]/)
    expect(code.length).toBeGreaterThan(0)
  })

  it('encodeForUrl → decodeFromUrl roundtrip preserva build', () => {
    const build = makeBuild()
    const code = encodeForUrl(build)
    const result = decodeFromUrl(code)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe(build.id)
      expect(result.value.treeId).toBe(build.treeId)
      expect(result.value.state.nodes).toEqual(build.state.nodes)
    }
  })

  it('decodeFromUrl con base64url inválido devolve err SHARE_LINK_DECODE_FAILED', () => {
    const result = decodeFromUrl('!!!')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.SHARE_LINK_DECODE_FAILED)
    }
  })

  it('decodeFromUrl con base64url válido pero non JSON devolve err BUILD_DESERIALIZE_FAILED', () => {
    // 'hello' en base64url = 'aGVsbG8'
    const result = decodeFromUrl('aGVsbG8')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.BUILD_DESERIALIZE_FAILED)
    }
  })

  it('decodeFromUrl con UTF-8 chars (emoji en label) preserva integridade', () => {
    const build = makeBuild({
      label: { gl: '🌳 Árbore', es: '🌳 Árbol', en: '🌳 Tree' },
    })
    const code = encodeForUrl(build)
    const result = decodeFromUrl(code)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.label).toEqual(build.label)
    }
  })

  it('encodeForUrl con build grande (100 nodos) produce string sen crash', () => {
    const nodes: Record<string, { state: string; points: number }> = {}
    for (let i = 0; i < 100; i++) {
      nodes[`node-${i}`] = { state: 'locked', points: 0 }
    }
    const build = makeBuild({
      state: {
        nodes,
        budget: { resources: {} },
      },
    } as Partial<Build>)
    const code = encodeForUrl(build)
    expect(code.length).toBeGreaterThan(0)
    expect(code).not.toMatch(/[+/=]/)
  })
})
// ── FIN: tests de UrlSerializer ──
