// ── INICIO: tests de exports ──
// Verifica que os tipos públicos exportan o que esperamos.
// Os tipos puros non se poden probar en runtime — só verificamos que
// as funcións/constantes existen.

import { describe, expect, it } from 'vitest'
import * as core from '../../src/index.js'

describe('@yggdrasil-forge/core public exports', () => {
  it('exports VERSION', () => {
    expect(core.VERSION).toBe('0.0.0')
  })

  it('exports Result helpers', () => {
    expect(typeof core.ok).toBe('function')
    expect(typeof core.err).toBe('function')
    expect(typeof core.isOk).toBe('function')
    expect(typeof core.isErr).toBe('function')
    expect(typeof core.unwrap).toBe('function')
    expect(typeof core.unwrapOr).toBe('function')
  })

  it('exports freezeNodeDef', () => {
    expect(typeof core.freezeNodeDef).toBe('function')
  })

  it('re-exports error utilities from common', () => {
    expect(core.ErrorCode).toBeDefined()
    expect(typeof core.YggdrasilError).toBe('function') // class
    expect(typeof core.isYggdrasilError).toBe('function')
    expect(typeof core.getErrorMessage).toBe('function')
  })
})
// ── FIN: tests de exports ──
