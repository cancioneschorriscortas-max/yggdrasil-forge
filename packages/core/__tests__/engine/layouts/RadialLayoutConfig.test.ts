// ── INICIO: tests de RadialLayoutConfig ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { parseRadialConfig } from '../../../src/engine/layouts/RadialLayoutConfig.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { LayoutConfig } from '../../../src/types/tree.js'

/** Helper: config válido mínimo. */
function validConfig(overrides?: Partial<LayoutConfig>): LayoutConfig {
  return { type: 'radial', radius: 100, ...overrides }
}

describe('parseRadialConfig', () => {
  // 1. Config válido mínimo
  it('config válido mínimo: ok con type=radial e radius', () => {
    const r = parseRadialConfig(validConfig())
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.type).toBe('radial')
    expect(v.radius).toBe(100)
  })

  // 2. type !== 'radial'
  it('type !== radial: err LAYOUT_COMPUTE_FAILED', () => {
    const r = parseRadialConfig({ type: 'tree', radius: 100 })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  // 3. radius ausente
  it('radius ausente: err', () => {
    const r = parseRadialConfig({ type: 'radial' })
    expect(isErr(r)).toBe(true)
  })

  // 4. radius negativo
  it('radius negativo: err', () => {
    const r = parseRadialConfig(validConfig({ radius: -10 }))
    expect(isErr(r)).toBe(true)
  })

  // 5. radius cero
  it('radius cero: err', () => {
    const r = parseRadialConfig(validConfig({ radius: 0 }))
    expect(isErr(r)).toBe(true)
  })

  // 6. radius NaN / Infinity
  it('radius NaN: err', () => {
    const r = parseRadialConfig(validConfig({ radius: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('radius Infinity: err', () => {
    const r = parseRadialConfig(validConfig({ radius: Number.POSITIVE_INFINITY }))
    expect(isErr(r)).toBe(true)
  })

  // 7. polygon.sides < 3
  it('polygon.sides < 3: err', () => {
    const r = parseRadialConfig(validConfig({ polygon: { sides: 2, radius: 50 } }))
    expect(isErr(r)).toBe(true)
  })

  // 8. polygon.radius <= 0
  it('polygon.radius <= 0: err', () => {
    const r = parseRadialConfig(validConfig({ polygon: { sides: 4, radius: 0 } }))
    expect(isErr(r)).toBe(true)
  })

  // 9. meshType valor inválido
  it('meshType inválido: err', () => {
    const r = parseRadialConfig(validConfig({ meshType: 'invalid' }))
    expect(isErr(r)).toBe(true)
  })

  // 10. Locale propaga
  it('locale es propaga á mensaxe de erro', () => {
    const r = parseRadialConfig({ type: 'tree', radius: 100 }, 'es')
    if (!r.ok) {
      expect(r.error.message).toContain('Error al calcular layout')
    }
  })

  // 11. Campos opcionais correctos propáganse
  it('campos opcionais válidos propáganse ao resultado', () => {
    const r = parseRadialConfig(
      validConfig({
        centerX: 10,
        centerY: 20,
        startAngle: 0,
        meshType: 'cross',
        polygon: { sides: 6, radius: 200 },
      }),
    )
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.centerX).toBe(10)
    expect(v.centerY).toBe(20)
    expect(v.startAngle).toBe(0)
    expect(v.meshType).toBe('cross')
    expect(v.polygon).toEqual({ sides: 6, radius: 200 })
  })

  // 12. polygon.sides decimal: err
  it('polygon.sides decimal: err', () => {
    const r = parseRadialConfig(validConfig({ polygon: { sides: 3.5, radius: 50 } }))
    expect(isErr(r)).toBe(true)
  })

  // ── Coverage paydown: campos opcionais presentes pero inválidos ──
  it('centerX presente non-finito: err', () => {
    const r = parseRadialConfig(validConfig({ centerX: Number.POSITIVE_INFINITY }))
    expect(isErr(r)).toBe(true)
  })

  it('centerX presente non-número: err', () => {
    const r = parseRadialConfig(validConfig({ centerX: 'centro' as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  it('centerY presente NaN: err', () => {
    const r = parseRadialConfig(validConfig({ centerY: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('startAngle presente non-finito: err', () => {
    const r = parseRadialConfig(validConfig({ startAngle: Number.NEGATIVE_INFINITY }))
    expect(isErr(r)).toBe(true)
  })

  it('meshType valor inválido: err', () => {
    const r = parseRadialConfig(validConfig({ meshType: 'spiral' }))
    expect(isErr(r)).toBe(true)
  })

  // polygon=null: cobre rama do String() ternario interno
  it('polygon null: err (cobre rama interna do error message)', () => {
    const r = parseRadialConfig(validConfig({ polygon: null as unknown as undefined }))
    expect(isErr(r)).toBe(true)
  })
})
// ── FIN: tests de RadialLayoutConfig ──
