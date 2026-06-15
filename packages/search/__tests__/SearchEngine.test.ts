import type { TreeDef } from '@yggdrasil-forge/core'
// ── INICIO: tests de SearchEngine ──
import { describe, expect, it } from 'vitest'
import { SearchEngine } from '../src/SearchEngine.js'

function makeTree(nodes: TreeDef['nodes']): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test Tree',
    nodes,
    edges: [],
    layout: { type: 'radial' },
  }
}

const sampleTree = makeTree([
  {
    id: 'n1',
    type: 'small',
    label: 'Warrior',
    description: 'A fierce melee fighter',
    tags: ['melee', 'strength'],
    searchKeywords: ['tank', 'frontline'],
  },
  {
    id: 'n2',
    type: 'small',
    label: 'Mage',
    description: 'Master of arcane arts',
    tags: ['magic', 'ranged'],
    searchKeywords: ['caster', 'spell'],
  },
  {
    id: 'n3',
    type: 'small',
    label: 'Ranger',
    description: 'Swift ranged warrior',
    tags: ['ranged', 'agility'],
    searchKeywords: ['archer', 'bow'],
  },
])

describe('SearchEngine', () => {
  // ── Constructor + size ──

  it('new SearchEngine crea engine con size=0', () => {
    const engine = new SearchEngine()
    expect(engine.size()).toBe(0)
  })

  it('index con cero nodos: size=0', () => {
    const engine = new SearchEngine()
    engine.index(makeTree([]))
    expect(engine.size()).toBe(0)
  })

  it('index con 3 nodos: size=3', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    expect(engine.size()).toBe(3)
  })

  // ── Index + clear ──

  it('index consecutivo limpa o anterior', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    engine.index(makeTree([{ id: 'x', type: 'small', label: 'X' }]))
    expect(engine.size()).toBe(1)
  })

  it('clear vacía o index', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    engine.clear()
    expect(engine.size()).toBe(0)
  })

  it('index con campos undefined: cero falla', () => {
    const engine = new SearchEngine()
    engine.index(makeTree([{ id: 'bare', type: 'small', label: 'Bare Node' }]))
    expect(engine.size()).toBe(1)
  })

  // ── Search empty ──

  it('search query vacía devolve []', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    expect(engine.search('')).toEqual([])
  })

  it('search en engine vacío devolve []', () => {
    const engine = new SearchEngine()
    expect(engine.search('warrior')).toEqual([])
  })

  // ── Search por campo ──

  it('match en name: score=10', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    const results = engine.search('warrior')
    expect(results.length).toBeGreaterThanOrEqual(1)
    const r = results.find((r) => r.nodeId === 'n1')
    expect(r).toBeDefined()
    expect(r?.matches.some((m) => m.field === 'name')).toBe(true)
    expect(r?.score).toBeGreaterThanOrEqual(10)
  })

  it('match en description: score inclúe 5', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    const results = engine.search('arcane')
    const r = results.find((r) => r.nodeId === 'n2')
    expect(r).toBeDefined()
    expect(r?.matches.some((m) => m.field === 'description')).toBe(true)
    expect(r?.score).toBeGreaterThanOrEqual(5)
  })

  it('match en tag: score inclúe 3', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    const results = engine.search('melee')
    const r = results.find((r) => r.nodeId === 'n1')
    expect(r).toBeDefined()
    expect(r?.matches.some((m) => m.field === 'tags')).toBe(true)
    expect(r?.score).toBeGreaterThanOrEqual(3)
  })

  it('match en searchKeyword: score inclúe 7', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    const results = engine.search('tank')
    const r = results.find((r) => r.nodeId === 'n1')
    expect(r).toBeDefined()
    expect(r?.matches.some((m) => m.field === 'searchKeywords')).toBe(true)
    expect(r?.score).toBeGreaterThanOrEqual(7)
  })

  it('cero match devolve []', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    expect(engine.search('zzzznoexist')).toEqual([])
  })

  // ── Score acumulado ──

  it('match en múltiples campos suma scores', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    // "warrior" matchea name (n1 + n3 description) — n3 description contén "warrior"
    const results = engine.search('warrior')
    const n1 = results.find((r) => r.nodeId === 'n1')
    expect(n1).toBeDefined()
    // n1: name "warrior" (10) — pode ter máis se substring matchea noutros campos
    expect(n1?.score).toBeGreaterThanOrEqual(10)
  })

  it('múltiples tags matcheen: suma 3 por cada', () => {
    const engine = new SearchEngine()
    engine.index(makeTree([{ id: 'x', type: 'small', label: 'X', tags: ['abc', 'abcd', 'abcde'] }]))
    const results = engine.search('abc')
    expect(results).toHaveLength(1)
    expect(results[0]?.score).toBe(9) // 3 tags × 3 = 9
  })

  // ── Sort + limit ──

  it('sort descendente por score', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    // "ranged" matchea: n2 tag (3), n3 tag (3) + description (5)
    const results = engine.search('ranged')
    expect(results.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]
      const curr = results[i]
      expect(prev?.score).toBeGreaterThanOrEqual(curr?.score ?? 0)
    }
  })

  it('limit=2 retorna só 2 resultados', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    // "a" should match many things
    const all = engine.search('a')
    const limited = engine.search('a', { limit: 2 })
    expect(limited).toHaveLength(Math.min(2, all.length))
  })

  // ── Fields option ──

  it('fields: [name] só busca en name', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    const results = engine.search('melee', { fields: ['name'] })
    // "melee" está en tags de n1, pero non en name → 0 results
    expect(results).toHaveLength(0)
  })

  // ── Case-insensitive ──

  it('case-insensitive: WARRIOR matchea warrior', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    const results = engine.search('WARRIOR')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.nodeId === 'n1')).toBe(true)
  })

  // ── Re-index ──

  it('re-index só atopa nodos do segundo tree', () => {
    const engine = new SearchEngine()
    engine.index(sampleTree)
    engine.index(makeTree([{ id: 'new', type: 'small', label: 'Unicorn' }]))
    expect(engine.search('warrior')).toHaveLength(0)
    expect(engine.search('unicorn')).toHaveLength(1)
  })

  // ── LocalizedString (i18n Record) ──

  it('LocalizedString Record: tódalas variantes indexadas', () => {
    const engine = new SearchEngine()
    engine.index(
      makeTree([{ id: 'i18n', type: 'small', label: { en: 'Warrior', gl: 'Guerreiro' } }]),
    )
    expect(engine.search('warrior')).toHaveLength(1)
    expect(engine.search('guerreiro')).toHaveLength(1)
  })
})
// ── FIN: tests de SearchEngine ──
