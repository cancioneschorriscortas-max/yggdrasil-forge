// ── INICIO: tests de constants ──
import { describe, expect, it } from 'vitest'
import { PROJECT_NAME, SCHEMA_VERSION, VERSION } from '../src/index.js'

describe('constants', () => {
  it('exports PROJECT_NAME', () => {
    expect(PROJECT_NAME).toBe('Yggdrasil Forge')
  })

  it('exports VERSION as semver-like string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('exports SCHEMA_VERSION as semver-like string', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
// ── FIN: tests de constants ──
