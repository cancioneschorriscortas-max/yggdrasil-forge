// ── INICIO: smoke test para @yggdrasil-forge/stats ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/stats', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })
})
// ── FIN: smoke test ──
