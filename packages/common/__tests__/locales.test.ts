// ── INICIO: tests de locales ──
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
} from '../src/index.js'

describe('locales', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('contains gl, es, en', () => {
      expect(SUPPORTED_LOCALES).toContain('gl')
      expect(SUPPORTED_LOCALES).toContain('es')
      expect(SUPPORTED_LOCALES).toContain('en')
    })

    it('has exactly 3 locales', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(3)
    })
  })

  describe('DEFAULT_LOCALE and FALLBACK_LOCALE', () => {
    it('default is en', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })

    it('fallback is en', () => {
      expect(FALLBACK_LOCALE).toBe('en')
    })
  })

  describe('isSupportedLocale', () => {
    it('returns true for supported locales', () => {
      expect(isSupportedLocale('gl')).toBe(true)
      expect(isSupportedLocale('es')).toBe(true)
      expect(isSupportedLocale('en')).toBe(true)
    })

    it('returns false for unsupported locales', () => {
      expect(isSupportedLocale('fr')).toBe(false)
      expect(isSupportedLocale('de')).toBe(false)
      expect(isSupportedLocale('')).toBe(false)
      expect(isSupportedLocale('gl-ES')).toBe(false)
    })
  })
})
// ── FIN: tests de locales ──
