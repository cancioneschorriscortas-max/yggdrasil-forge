// ── INICIO: smoke test para @yggdrasil-forge/multitenancy ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/multitenancy', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })
})
// ── FIN: smoke test ──
