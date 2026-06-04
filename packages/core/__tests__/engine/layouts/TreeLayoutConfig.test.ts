// ── INICIO: tests de TreeLayoutConfig ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { parseTreeConfig } from '../../../src/engine/layouts/TreeLayoutConfig.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { LayoutConfig } from '../../../src/types/tree.js'

function validConfig(overrides?: Partial<LayoutConfig>): LayoutConfig {
  return { type: 'tree', ...overrides }
}

describe('parseTreeConfig', () => {
  it('config válido mínimo: ok con type=tree', () => {
    const r = parseTreeConfig(validConfig())
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).type).toBe('tree')
  })

  it('type !== tree: err LAYOUT_COMPUTE_FAILED', () => {
    const r = parseTreeConfig({ type: 'radial', radius: 100 })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  it('direction inválido: err', () => {
    const r = parseTreeConfig(validConfig({ direction: 'diagonal' }))
    expect(isErr(r)).toBe(true)
  })

  it('nodeSpacing <= 0: err', () => {
    const r = parseTreeConfig(validConfig({ nodeSpacing: -5 }))
    expect(isErr(r)).toBe(true)
  })

  it('nodeSpacing NaN: err', () => {
    const r = parseTreeConfig(validConfig({ nodeSpacing: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('levelSpacing <= 0: err', () => {
    const r = parseTreeConfig(validConfig({ levelSpacing: 0 }))
    expect(isErr(r)).toBe(true)
  })

  it('centerX non-number: err', () => {
    const r = parseTreeConfig(validConfig({ centerX: 'abc' as unknown }))
    expect(isErr(r)).toBe(true)
  })

  it('centerY Infinity: err', () => {
    const r = parseTreeConfig(validConfig({ centerY: Number.POSITIVE_INFINITY }))
    expect(isErr(r)).toBe(true)
  })

  it('locale es propaga mensaxe', () => {
    const r = parseTreeConfig({ type: 'radial' }, 'es')
    if (!r.ok) expect(r.error.message).toContain('Error al calcular layout')
  })

  it('locale en propaga mensaxe', () => {
    const r = parseTreeConfig({ type: 'radial' }, 'en')
    if (!r.ok) expect(r.error.message).toContain('Layout computation failed')
  })

  it("'left-right' e 'right-left' son direccións válidas", () => {
    expect(isOk(parseTreeConfig(validConfig({ direction: 'left-right' })))).toBe(true)
    expect(isOk(parseTreeConfig(validConfig({ direction: 'right-left' })))).toBe(true)
  })

  it('campos opcionais válidos propáganse', () => {
    const r = parseTreeConfig(
      validConfig({
        direction: 'bottom-up',
        nodeSpacing: 50,
        levelSpacing: 100,
        centerX: 10,
        centerY: 20,
      }),
    )
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.direction).toBe('bottom-up')
    expect(v.nodeSpacing).toBe(50)
    expect(v.levelSpacing).toBe(100)
    expect(v.centerX).toBe(10)
    expect(v.centerY).toBe(20)
  })
})
// ── FIN: tests de TreeLayoutConfig ──
