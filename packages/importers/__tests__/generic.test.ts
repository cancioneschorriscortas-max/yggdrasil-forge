// ── INICIO: tests F9.4 — import xenérico + identity import ──
import type { NodeDef, TreeDef } from '@yggdrasil-forge/core'
import { validateTreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { stringify as stringifyYaml } from 'yaml'
import {
  type TreeMapping,
  importTree,
  importTreeFromJson,
  importTreeFromYaml,
} from '../src/index.js'

// ── importTree (design-wide, entrada non-GAIA) ──
interface ToyInput {
  slug: string
  title: string
  steps: { key: string; name: string }[]
}

const toyMapping: TreeMapping<ToyInput> = {
  id: (i) => i.slug,
  label: (i) => i.title,
  nodes: (i): readonly NodeDef[] =>
    i.steps.map((s) => ({ id: s.key, type: 'small', label: s.name })),
}

describe('importTree (design-wide)', () => {
  const input: ToyInput = {
    slug: 'curso',
    title: 'Curso',
    steps: [{ key: 'n1', name: 'Un' }],
  }
  const tree = importTree(input, toyMapping)

  it('mapea id/label/nodes e aplica defaults', () => {
    expect(tree.id).toBe('curso')
    expect(tree.nodes).toHaveLength(1)
    expect(tree.edges).toEqual([])
    expect(tree.layout).toEqual({ type: 'identity' })
    expect(tree.version).toBe('1.0.0')
  })

  it('produce un TreeDef válido segundo o motor', () => {
    expect(validateTreeDef(tree).ok).toBe(true)
  })

  it('honra os mappers opcionais cando se dan', () => {
    const tree2 = importTree(input, {
      ...toyMapping,
      rootNodeId: () => 'n1',
      groups: () => [{ id: 'g', label: 'G' }],
      metadata: () => ({ source: 'toy' }),
      version: () => '2.0.0',
      edges: () => [],
    })
    expect(tree2.rootNodeId).toBe('n1')
    expect(tree2.groups).toHaveLength(1)
    expect(tree2.metadata).toEqual({ source: 'toy' })
    expect(tree2.version).toBe('2.0.0')
  })

  it('rootNodeId mapper devolvendo undefined → campo omitido', () => {
    const tree2 = importTree(input, { ...toyMapping, rootNodeId: () => undefined })
    expect('rootNodeId' in tree2).toBe(false)
  })

  it('metadata mapper devolvendo undefined → campo omitido', () => {
    const tree2 = importTree(input, { ...toyMapping, metadata: () => undefined })
    expect('metadata' in tree2).toBe(false)
  })

  it('layout mapper aplica unha config custom', () => {
    const tree2 = importTree(input, {
      ...toyMapping,
      layout: () => ({ type: 'radial' as const }),
    })
    expect(tree2.layout).toEqual({ type: 'radial' })
  })
})

// ── identity import (round-trip vía stringify nativo) ──
const sample: TreeDef = {
  id: 't',
  schemaVersion: '1.0.0',
  version: '1.0.0',
  label: 'T',
  nodes: [{ id: 'a', type: 'small', label: 'A' }],
  edges: [],
  layout: { type: 'identity' },
}

describe('importTreeFromJson', () => {
  it('round-trip dun TreeDef serializado', () => {
    const r = importTreeFromJson(JSON.stringify(sample))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual(sample)
  })

  it('JSON sintacticamente inválido → err', () => {
    const r = importTreeFromJson('{ esto non é json')
    expect(r.ok).toBe(false)
  })

  it('estrutura inválida (non é TreeDef) → err', () => {
    const r = importTreeFromJson('{}')
    expect(r.ok).toBe(false)
  })
})

describe('importTreeFromYaml', () => {
  it('round-trip dun TreeDef serializado', () => {
    const r = importTreeFromYaml(stringifyYaml(sample))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toEqual(sample)
  })

  it('YAML inválido → err', () => {
    const r = importTreeFromYaml(': : : non válido\n  - x')
    expect(r.ok).toBe(false)
  })

  it('estrutura inválida (non é TreeDef) → err', () => {
    const r = importTreeFromYaml('foo: bar\n')
    expect(r.ok).toBe(false)
  })
})
// ── FIN: tests F9.4 (importers) ──
