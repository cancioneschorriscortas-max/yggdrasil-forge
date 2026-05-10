// ── INICIO: smoke test para @yggdrasil-forge/core ──
import { describe, expect, it } from 'vitest'
import { VERSION, greet } from '../src/index.js'

describe('@yggdrasil-forge/core', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })

  it('should greet correctly', () => {
    const greeting = greet()
    expect(greeting).toContain('Yggdrasil Forge')
    expect(greeting).toContain('core v0.0.0')
    expect(greeting).toContain('common v0.0.0')
  })
})
// ── FIN: smoke test ──
