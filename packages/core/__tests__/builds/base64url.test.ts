// ── INICIO: tests de base64url ──
import { describe, expect, it } from 'vitest'
import { decodeBase64Url, encodeBase64Url } from '../../src/builds/base64url.js'

describe('base64url', () => {
  it('roundtrip básico: encode → decode preserva string', () => {
    const input = 'hello'
    const encoded = encodeBase64Url(input)
    const decoded = decodeBase64Url(encoded)
    expect(decoded).toBe(input)
  })

  it('UTF-8 emoji: roundtrip preserva caracteres multibyte', () => {
    const input = '🌳 árbore'
    const encoded = encodeBase64Url(input)
    const decoded = decodeBase64Url(encoded)
    expect(decoded).toBe(input)
  })

  it('output URL-safe: cero +, /, = no encoded string', () => {
    // JSON con caracteres que producen +, /, = en base64 estándar
    const input = '{"hello":"world","emoji":"🌳","data":[1,2,3]}'
    const encoded = encodeBase64Url(input)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('edge case: string vacío → encode → decode → string vacío', () => {
    const encoded = encodeBase64Url('')
    const decoded = decodeBase64Url(encoded)
    expect(decoded).toBe('')
  })
})
// ── FIN: tests de base64url ──
