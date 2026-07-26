// ── INICIO: tests deriveClusterGroups (7.15c, Cambio 1) ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { adversarialTreeDef } from '../src/testing/adversarialFixture.js'
import { UNGROUPED_GROUP_ID, deriveClusterGroups } from '../src/view/deriveClusterGroups.js'

function baseTree(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'Árbore', en: 'Tree' },
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
    ...overrides,
  } as TreeDef
}
const node = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'small',
  label: { gl: `${id}-gl`, en: `${id}-en` },
  position: { x: 0, y: 0 },
  ...extra,
})

describe('deriveClusterGroups — pertenza dual e orde', () => {
  it('★ unión nodeIds + node.group, sen duplicados, nodeIds primeiro', () => {
    const tree = baseTree({
      groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['b', 'a'] }],
      nodes: [
        node('x', { group: 'g' }), // via node.group, aparece DESPOIS dos nodeIds
        node('a', { group: 'g' }), // reclamado polas DÚAS vías → dedup
        node('b'),
      ],
    })
    const [g] = deriveClusterGroups(tree, { locale: 'gl' })
    expect(g?.members.map((m) => m.id)).toEqual(['b', 'a', 'x'])
  })

  it('nodeIds a nodo inexistente ignórase (defensivo)', () => {
    const tree = baseTree({
      groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['fantasma', 'a'] }],
      nodes: [node('a')],
    })
    const [g] = deriveClusterGroups(tree, { locale: 'gl' })
    expect(g?.members.map((m) => m.id)).toEqual(['a'])
  })

  it('sen grupos → TODO nun único «Sen grupo» ao final', () => {
    const tree = baseTree({ nodes: [node('a'), node('b')] })
    const groups = deriveClusterGroups(tree, { locale: 'gl' })
    expect(groups).toHaveLength(1)
    expect(groups[0]?.id).toBe(UNGROUPED_GROUP_ID)
    expect(groups[0]?.label).toBe('Sen grupo')
    expect(groups[0]?.members.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('árbore baleira → sen grupos (nin «Sen grupo» baleiro)', () => {
    expect(deriveClusterGroups(baseTree(), { locale: 'gl' })).toEqual([])
  })

  it('os non reclamados van a «Sen grupo» AO FINAL; os reclamados non', () => {
    const tree = baseTree({
      groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['a'] }],
      nodes: [node('a'), node('orfo')],
    })
    const groups = deriveClusterGroups(tree, { locale: 'gl' })
    expect(groups.map((g) => g.id)).toEqual(['g', UNGROUPED_GROUP_ID])
    expect(groups[1]?.members.map((m) => m.id)).toEqual(['orfo'])
  })
})

describe('deriveClusterGroups — tiers, labels, cores, iconas', () => {
  it('tiers do mapa aplicados; ausentes → 0; maxTier ?? 1', () => {
    const tree = baseTree({
      groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['a', 'b'] }],
      nodes: [node('a', { maxTier: 3 }), node('b')],
    })
    const [g] = deriveClusterGroups(tree, {
      locale: 'gl',
      tiers: new Map([['a', 2]]),
    })
    expect(g?.members[0]).toMatchObject({ id: 'a', currentTier: 2, maxTier: 3 })
    expect(g?.members[1]).toMatchObject({ id: 'b', currentTier: 0, maxTier: 1 })
  })

  it('labels localizadas: gl primeiro, fallback a en', () => {
    const tree = baseTree({
      groups: [{ id: 'g', label: { en: 'Only-EN' }, nodeIds: ['a'] }],
      nodes: [node('a')],
    })
    const gl = deriveClusterGroups(tree, { locale: 'gl' })
    expect(gl[0]?.label).toBe('Only-EN') // fallback
    expect(gl[0]?.members[0]?.label).toBe('a-gl')
    const en = deriveClusterGroups(tree, { locale: 'en' })
    expect(en[0]?.members[0]?.label).toBe('a-en')
  })

  it('color explícito respectado; sen color → rotación determinista polo índice', () => {
    const tree = baseTree({
      groups: [
        { id: 'g0', label: { gl: 'G0' }, color: '#123456', nodeIds: ['a'] },
        { id: 'g1', label: { gl: 'G1' }, nodeIds: ['b'] },
        { id: 'g2', label: { gl: 'G2' }, nodeIds: ['c'] },
      ],
      nodes: [node('a'), node('b'), node('c')],
    })
    const groups = deriveClusterGroups(tree, { locale: 'gl' })
    expect(groups[0]?.color).toBe('#123456')
    // Determinista: mesma entrada → mesma cor; e g1 ≠ g2.
    const again = deriveClusterGroups(tree, { locale: 'gl' })
    expect(again[1]?.color).toBe(groups[1]?.color)
    expect(groups[1]?.color).not.toBe(groups[2]?.color)
  })

  it('icon do nodo viaxa CRU (string); sen icon → ausente', () => {
    const tree = baseTree({
      groups: [{ id: 'g', label: { gl: 'G' }, nodeIds: ['a', 'b'] }],
      nodes: [node('a', { icon: 'shield' }), node('b')],
    })
    const [g] = deriveClusterGroups(tree, { locale: 'gl' })
    expect(g?.members[0]?.icon).toBe('shield')
    expect('icon' in (g?.members[1] ?? {})).toBe(false)
  })
})

describe('deriveClusterGroups — fixture adversarial (pertenza dual real)', () => {
  it('★ fronte por nodeIds; sombra por unión con dedup; orfos en «Sen grupo»', () => {
    const groups = deriveClusterGroups(adversarialTreeDef(), { locale: 'gl' })
    expect(groups.map((g) => g.id)).toEqual(['fronte', 'sombra', UNGROUPED_GROUP_ID])

    const fronte = groups[0]
    expect(fronte?.label).toBe('A Fronte')
    expect(fronte?.color).toBe('#c8875f')
    expect(fronte?.members.map((m) => m.id)).toEqual(['raiz', 'con-tier'])

    // sombra: nodeIds [grupo-none, exclusivo-a] primeiro (exclusivo-a
    // TAMÉN ten group='sombra' → dedup), despois grupo-any por node.group.
    const sombra = groups[1]
    expect(sombra?.members.map((m) => m.id)).toEqual(['grupo-none', 'exclusivo-a', 'grupo-any'])
    // Sen color → rotación (índice 1 da paleta).
    expect(sombra?.color).toBe('#5f9ec8')

    const orfos = groups[2]
    expect(orfos?.members.map((m) => m.id)).toEqual(['con-cor', 'sen-posicion'])
  })
})
// ── FIN: tests deriveClusterGroups ──
