// ── INICIO: tests de BuildSerializer ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { deserialize, serialize } from '../../src/builds/BuildSerializer.js'
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

describe('BuildSerializer', () => {
  it('serialize(build) produce JSON parseable', () => {
    const build = makeBuild()
    const json = serialize(build)
    expect(() => JSON.parse(json)).not.toThrow()
    const parsed = JSON.parse(json)
    expect(parsed.id).toBe('build-1')
  })

  it('serialize → deserialize roundtrip preserva build', () => {
    const build = makeBuild()
    const json = serialize(build)
    const result = deserialize(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe(build.id)
      expect(result.value.treeId).toBe(build.treeId)
      expect(result.value.state.nodes).toEqual(build.state.nodes)
    }
  })

  it('deserialize con JSON inválido devolve err BUILD_DESERIALIZE_FAILED', () => {
    const result = deserialize('invalid json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.BUILD_DESERIALIZE_FAILED)
    }
  })

  it('deserialize de "null" devolve err BUILD_INVALID_SHAPE', () => {
    const result = deserialize('null')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.BUILD_INVALID_SHAPE)
    }
  })

  it('deserialize con campos requiridos ausentes devolve err BUILD_INVALID_SHAPE', () => {
    const result = deserialize('{"id": "x"}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.BUILD_INVALID_SHAPE)
    }
  })

  it('deserialize con state sen nodes devolve err BUILD_INVALID_SHAPE', () => {
    const json = JSON.stringify({
      id: 'b',
      treeId: 't',
      treeVersion: '1',
      schemaVersion: '1',
      createdAt: 1,
      updatedAt: 1,
      state: {},
    })
    const result = deserialize(json)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.BUILD_INVALID_SHAPE)
    }
  })

  it('deserialize de build con tags/label/author opcionais preserva os campos', () => {
    const build = makeBuild({
      tags: ['pvp', 'meta'],
      label: { gl: 'Tanque', es: 'Tanque', en: 'Tank' },
      author: 'user-42',
    })
    const json = serialize(build)
    const result = deserialize(json)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.tags).toEqual(['pvp', 'meta'])
      expect(result.value.label).toEqual({ gl: 'Tanque', es: 'Tanque', en: 'Tank' })
      expect(result.value.author).toBe('user-42')
    }
  })
})
// ── FIN: tests de BuildSerializer ──
