// ── INICIO: tests de i18n ──
import { describe, expect, it } from 'vitest'
import { interpolate, resolveLocalized } from '../src/index.js'

describe('resolveLocalized', () => {
  it('returns plain strings as-is', () => {
    expect(resolveLocalized('Hello', 'en')).toBe('Hello')
    expect(resolveLocalized('Hola', 'es')).toBe('Hola')
  })

  it('returns translation matching locale', () => {
    const value = { gl: 'Ola', es: 'Hola', en: 'Hello' }
    expect(resolveLocalized(value, 'gl')).toBe('Ola')
    expect(resolveLocalized(value, 'es')).toBe('Hola')
    expect(resolveLocalized(value, 'en')).toBe('Hello')
  })

  it('uses fallback when locale not available', () => {
    const value = { es: 'Hola', en: 'Hello' }
    expect(resolveLocalized(value, 'gl')).toBe('Hello')
  })

  it('uses custom fallback', () => {
    const value = { es: 'Hola' }
    expect(resolveLocalized(value, 'gl', 'es')).toBe('Hola')
  })

  it('returns first available when no fallback works', () => {
    const value = { fr: 'Bonjour' }
    expect(resolveLocalized(value, 'gl')).toBe('Bonjour')
  })

  it('returns empty string for empty object', () => {
    expect(resolveLocalized({}, 'gl')).toBe('')
  })
})

describe('interpolate', () => {
  it('substitutes single variable', () => {
    expect(interpolate('Hello, {name}!', { name: 'World' })).toBe('Hello, World!')
  })

  it('substitutes multiple variables', () => {
    expect(interpolate('{greeting}, {name}!', { greeting: 'Hola', name: 'Mundo' })).toBe(
      'Hola, Mundo!',
    )
  })

  it('handles numbers', () => {
    expect(interpolate('Score: {n}', { n: 42 })).toBe('Score: 42')
  })

  it('leaves unmatched placeholders untouched', () => {
    expect(interpolate('Hi {name}, age {age}', { name: 'Ana' })).toBe('Hi Ana, age {age}')
  })

  it('handles empty values object', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
  })

  it('handles string without placeholders', () => {
    expect(interpolate('Plain text', { foo: 'bar' })).toBe('Plain text')
  })
})
// ── FIN: tests de i18n ──
