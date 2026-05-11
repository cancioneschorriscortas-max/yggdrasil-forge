// ── INICIO: smoke test para @yggdrasil-forge/themes ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/themes', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })
})
// ── FIN: smoke test ──
