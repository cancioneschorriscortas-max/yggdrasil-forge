// ── INICIO: tests de deepEqual ──
import { describe, expect, it } from 'vitest'
import { deepEqual } from '../../src/utils/index.js'

describe('deepEqual', () => {
  it('compares primitives', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
  })

  it('compares flat objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('compares nested objects', () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
  })

  it('compares arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false)
  })

  it('compares nested arrays and objects', () => {
    expect(deepEqual({ items: [{ x: 1 }] }, { items: [{ x: 1 }] })).toBe(true)
    expect(deepEqual({ items: [{ x: 1 }] }, { items: [{ x: 2 }] })).toBe(false)
  })

  it('distinguishes arrays from objects', () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
  })

  it('compares Date objects', () => {
    expect(deepEqual(new Date('2026-01-01'), new Date('2026-01-01'))).toBe(true)
    expect(deepEqual(new Date('2026-01-01'), new Date('2026-01-02'))).toBe(false)
  })

  it('returns true for same reference', () => {
    const obj = { a: 1 }
    expect(deepEqual(obj, obj)).toBe(true)
  })
})
// ── FIN: tests de deepEqual ──
