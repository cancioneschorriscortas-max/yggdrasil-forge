// ── INICIO: smoke test para @yggdrasil-forge/common ──
import { describe, expect, it } from 'vitest'
import { PROJECT_NAME, VERSION } from '../src/index.js'

describe('@yggdrasil-forge/common', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })

  it('should export PROJECT_NAME', () => {
    expect(PROJECT_NAME).toBe('Yggdrasil Forge')
  })
})
// ── FIN: smoke test ──
