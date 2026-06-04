// ── INICIO: tests de CustomLayoutConfig ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { parseCustomConfig } from '../../../src/engine/layouts/CustomLayoutConfig.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'

describe('parseCustomConfig', () => {
  it("config { type: 'custom' }: ok", () => {
    const r = parseCustomConfig({ type: 'custom' })
    expect(isOk(r)).toBe(true)
    expect(unwrap(r)).toEqual({ type: 'custom' })
  })

  it("type 'radial': err LAYOUT_COMPUTE_FAILED", () => {
    const r = parseCustomConfig({ type: 'radial', radius: 100 })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  it("type 'tree': err", () => {
    const r = parseCustomConfig({ type: 'tree' })
    expect(isErr(r)).toBe(true)
  })

  it("type 'foo' (calquera outro string): err", () => {
    const r = parseCustomConfig({ type: 'foo' })
    expect(isErr(r)).toBe(true)
  })

  it("locale 'es' propaga á mensaxe", () => {
    const r = parseCustomConfig({ type: 'radial' }, 'es')
    if (!r.ok) expect(r.error.message).toContain('Error al calcular layout')
  })

  it("locale 'en' propaga á mensaxe", () => {
    const r = parseCustomConfig({ type: 'radial' }, 'en')
    if (!r.ok) expect(r.error.message).toContain('Layout computation failed')
  })
})
// ── FIN: tests de CustomLayoutConfig ──
