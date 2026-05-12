// ── INICIO: tests de Result ──
import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok, unwrap, unwrapOr } from '../../src/types/index.js'

describe('Result helpers', () => {
  describe('ok', () => {
    it('builds a success result', () => {
      const r = ok(42)
      expect(r.ok).toBe(true)
      expect(r.value).toBe(42)
    })

    it('builds with complex values', () => {
      const r = ok({ name: 'foo', tags: ['a', 'b'] })
      expect(r.ok).toBe(true)
      expect(r.value.name).toBe('foo')
    })
  })

  describe('err', () => {
    it('builds a failure result', () => {
      const e = new Error('boom')
      const r = err(e)
      expect(r.ok).toBe(false)
      expect(r.error).toBe(e)
    })
  })

  describe('isOk / isErr', () => {
    it('distinguishes ok and err', () => {
      const success = ok(1)
      const failure = err(new Error('x'))
      expect(isOk(success)).toBe(true)
      expect(isOk(failure)).toBe(false)
      expect(isErr(success)).toBe(false)
      expect(isErr(failure)).toBe(true)
    })
  })

  describe('unwrap', () => {
    it('returns value on ok', () => {
      expect(unwrap(ok('hello'))).toBe('hello')
    })

    it('throws error on err', () => {
      const e = new Error('boom')
      expect(() => unwrap(err(e))).toThrow('boom')
    })
  })

  describe('unwrapOr', () => {
    it('returns value on ok', () => {
      expect(unwrapOr(ok(10), 0)).toBe(10)
    })

    it('returns fallback on err', () => {
      expect(unwrapOr(err(new Error('x')), 99)).toBe(99)
    })
  })
})
// ── FIN: tests de Result ──
