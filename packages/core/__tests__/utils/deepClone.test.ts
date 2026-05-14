// ── INICIO: tests de deepClone ──
import { describe, expect, it } from 'vitest'
import { deepClone, deepCloneManual } from '../../src/utils/index.js'

describe('deepClone', () => {
  it('clones primitives as-is', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBe(null)
    expect(deepClone(undefined)).toBe(undefined)
  })

  it('clones flat objects', () => {
    const original = { a: 1, b: 'two', c: true }
    const copy = deepClone(original)
    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
  })

  it('clones nested objects deeply', () => {
    const original = { a: { b: { c: 1 } } }
    const copy = deepClone(original)
    copy.a.b.c = 999
    expect(original.a.b.c).toBe(1)
  })

  it('clones arrays deeply', () => {
    const original = [1, [2, 3], [[4]]]
    const copy = deepClone(original)
    ;(copy[1] as number[]).push(999)
    expect((original[1] as number[]).length).toBe(2)
  })

  it('clones objects with array properties', () => {
    const original = { tags: ['a', 'b'], nested: { items: [1, 2] } }
    const copy = deepClone(original)
    copy.tags.push('c')
    copy.nested.items.push(3)
    expect(original.tags).toEqual(['a', 'b'])
    expect(original.nested.items).toEqual([1, 2])
  })

  it('clones Date objects', () => {
    const original = { created: new Date('2026-01-01') }
    const copy = deepClone(original)
    expect(copy.created.getTime()).toBe(original.created.getTime())
    expect(copy.created).not.toBe(original.created)
  })
})

// Tests do fallback manual (cobre as ramas que structuredClone non exercita)
describe('deepCloneManual', () => {
  it('clones primitives as-is', () => {
    expect(deepCloneManual(42)).toBe(42)
    expect(deepCloneManual('hello')).toBe('hello')
    expect(deepCloneManual(null)).toBe(null)
  })

  it('clones flat objects', () => {
    const original = { a: 1, b: 'two' }
    const copy = deepCloneManual(original)
    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
  })

  it('clones nested objects deeply', () => {
    const original = { a: { b: { c: 1 } } }
    const copy = deepCloneManual(original)
    copy.a.b.c = 999
    expect(original.a.b.c).toBe(1)
  })

  it('clones arrays deeply', () => {
    const original = [1, [2, 3]]
    const copy = deepCloneManual(original)
    ;(copy[1] as number[]).push(999)
    expect((original[1] as number[]).length).toBe(2)
  })

  it('clones Date objects', () => {
    const d = new Date('2026-01-01')
    const copy = deepCloneManual(d)
    expect(copy.getTime()).toBe(d.getTime())
    expect(copy).not.toBe(d)
  })

  it('clones Map objects', () => {
    const original = new Map([['key', { value: 1 }]])
    const copy = deepCloneManual(original)
    const copiedVal = copy.get('key') as { value: number }
    copiedVal.value = 999
    expect((original.get('key') as { value: number }).value).toBe(1)
  })

  it('clones Set objects', () => {
    const inner = { x: 1 }
    const original = new Set([inner])
    const copy = deepCloneManual(original)
    expect(copy.size).toBe(1)
    // O contido é un clon, non a mesma referencia
    const [copiedItem] = copy
    expect(copiedItem).not.toBe(inner)
    expect(copiedItem).toEqual(inner)
  })
})
// ── FIN: tests de deepClone ──
