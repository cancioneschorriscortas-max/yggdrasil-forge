// ── INICIO: smoke test ──
// Test trivial para verificar que Vitest funciona.
// Será eliminado cando creemos os primeiros paquetes con tests reais.

import { describe, expect, it } from 'vitest'

describe('Smoke test', () => {
  it('should run vitest correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support async tests', async () => {
    const value = await Promise.resolve('yggdrasil')
    expect(value).toBe('yggdrasil')
  })

  it('should fail correctly when expected', () => {
    expect(() => {
      throw new Error('expected')
    }).toThrow('expected')
  })
})
// ── FIN: smoke test ──
