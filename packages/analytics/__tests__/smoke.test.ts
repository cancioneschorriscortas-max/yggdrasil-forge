// ── INICIO: smoke test para @yggdrasil-forge/analytics ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/analytics', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })
})
// ── FIN: smoke test ──
