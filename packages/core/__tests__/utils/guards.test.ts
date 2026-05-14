// ── INICIO: tests de guards ──
import { describe, expect, it } from 'vitest'
import { clamp, isPlainObject } from '../../src/utils/index.js'

describe('isPlainObject', () => {
  it('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
  })

  it('returns false for arrays', () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject([1, 2, 3])).toBe(false)
  })

  it('returns false for null and primitives', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject(42)).toBe(false)
    expect(isPlainObject('string')).toBe(false)
    expect(isPlainObject(true)).toBe(false)
  })

  it('returns false for class instances', () => {
    expect(isPlainObject(new Date())).toBe(false)
    expect(isPlainObject(new Map())).toBe(false)
    expect(isPlainObject(new Set())).toBe(false)
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when below range', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })

  it('returns max when above range', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('works with negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-15, -10, -1)).toBe(-10)
    expect(clamp(5, -10, -1)).toBe(-1)
  })
})
// ── FIN: tests de guards ──
