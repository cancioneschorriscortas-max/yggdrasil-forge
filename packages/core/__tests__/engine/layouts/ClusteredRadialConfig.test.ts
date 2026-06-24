// ── INICIO: tests de ClusteredRadialConfig ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { parseClusteredRadialConfig } from '../../../src/engine/layouts/ClusteredRadialConfig.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { LayoutConfig } from '../../../src/types/tree.js'

/** Helper: config válido mínimo. */
function validConfig(overrides?: Partial<LayoutConfig>): LayoutConfig {
  return { type: 'clustered-radial', groupRadius: 200, ...overrides }
}

describe('parseClusteredRadialConfig', () => {
  // 1. Válido mínimo
  it('config válido mínimo: ok con type + groupRadius', () => {
    const r = parseClusteredRadialConfig(validConfig())
    expect(isOk(r)).toBe(true)
    const v = unwrap(r)
    expect(v.type).toBe('clustered-radial')
    expect(v.groupRadius).toBe(200)
    // Defaults non se aplican aquí (aplícanse en compute)
    expect(v.orbitRadius).toBeUndefined()
    expect(v.centerX).toBeUndefined()
    expect(v.startAngle).toBeUndefined()
    expect(v.meshType).toBeUndefined()
  })

  // 2. type errado
  it('type !== clustered-radial: err LAYOUT_COMPUTE_FAILED', () => {
    const r = parseClusteredRadialConfig({ type: 'radial', groupRadius: 200 })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  // 3. groupRadius — cada rama de err
  it('groupRadius ausente: err', () => {
    const r = parseClusteredRadialConfig({ type: 'clustered-radial' })
    expect(isErr(r)).toBe(true)
  })

  it('groupRadius = 0: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ groupRadius: 0 }))
    expect(isErr(r)).toBe(true)
  })

  it('groupRadius negativo: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ groupRadius: -10 }))
    expect(isErr(r)).toBe(true)
  })

  it('groupRadius NaN: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ groupRadius: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('groupRadius Infinity: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ groupRadius: Number.POSITIVE_INFINITY }))
    expect(isErr(r)).toBe(true)
  })

  it('groupRadius non-número: err', () => {
    const r = parseClusteredRadialConfig({
      type: 'clustered-radial',
      groupRadius: 'big' as unknown as number,
    })
    expect(isErr(r)).toBe(true)
  })

  // 4. orbitRadius opcional con validacións se presente
  it('orbitRadius presente e válido: ok e preservado', () => {
    const r = parseClusteredRadialConfig(validConfig({ orbitRadius: 90 }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).orbitRadius).toBe(90)
  })

  it('orbitRadius = 0: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ orbitRadius: 0 }))
    expect(isErr(r)).toBe(true)
  })

  it('orbitRadius negativo: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ orbitRadius: -5 }))
    expect(isErr(r)).toBe(true)
  })

  it('orbitRadius NaN: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ orbitRadius: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('orbitRadius non-número: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ orbitRadius: 'far' as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  // 5. centerX / centerY: opcional, finito se presente
  it('centerX presente finito: ok', () => {
    const r = parseClusteredRadialConfig(validConfig({ centerX: 50 }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).centerX).toBe(50)
  })

  it('centerX NaN: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ centerX: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('centerX non-número: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ centerX: 'middle' as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  it('centerY presente finito: ok', () => {
    const r = parseClusteredRadialConfig(validConfig({ centerY: -30 }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).centerY).toBe(-30)
  })

  it('centerY Infinity: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ centerY: Number.NEGATIVE_INFINITY }))
    expect(isErr(r)).toBe(true)
  })

  it('centerY non-número: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ centerY: null as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  // 6. startAngle
  it('startAngle presente finito: ok', () => {
    const r = parseClusteredRadialConfig(validConfig({ startAngle: 0 }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).startAngle).toBe(0)
  })

  it('startAngle NaN: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ startAngle: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('startAngle non-número: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ startAngle: 'top' as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  // 7. meshType
  it("meshType 'spokes': ok", () => {
    const r = parseClusteredRadialConfig(validConfig({ meshType: 'spokes' }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).meshType).toBe('spokes')
  })

  it("meshType 'none': ok", () => {
    const r = parseClusteredRadialConfig(validConfig({ meshType: 'none' }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).meshType).toBe('none')
  })

  it('meshType inválido: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ meshType: 'rings' }))
    expect(isErr(r)).toBe(true)
  })

  it('meshType non-string: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ meshType: 42 as unknown as string }))
    expect(isErr(r)).toBe(true)
  })

  // 8. Locale custom (cobertura da rama)
  it('respeta locale custom no err', () => {
    const r = parseClusteredRadialConfig({ type: 'tree' }, 'es')
    expect(isErr(r)).toBe(true)
  })

  // ── F11.2b / 2b-bis: memberLayout / rowGap ──
  // (centerClearance eliminado en 2b-bis ao honrar growOutward)

  it("memberLayout 'fan': ok", () => {
    const r = parseClusteredRadialConfig(validConfig({ memberLayout: 'fan' }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).memberLayout).toBe('fan')
  })

  it("memberLayout 'list': ok", () => {
    const r = parseClusteredRadialConfig(validConfig({ memberLayout: 'list' }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).memberLayout).toBe('list')
  })

  it("memberLayout 'cluster': ok (F11.2c)", () => {
    const r = parseClusteredRadialConfig(validConfig({ memberLayout: 'cluster' }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).memberLayout).toBe('cluster')
  })

  it('memberLayout valor arbitrario: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ memberLayout: 'spiral' }))
    expect(isErr(r)).toBe(true)
  })

  it('memberLayout non-string: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ memberLayout: 42 as unknown as string }))
    expect(isErr(r)).toBe(true)
  })

  it('rowGap presente e válido: ok', () => {
    const r = parseClusteredRadialConfig(validConfig({ rowGap: 80 }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).rowGap).toBe(80)
  })

  it('rowGap = 0: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ rowGap: 0 }))
    expect(isErr(r)).toBe(true)
  })

  it('rowGap negativo: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ rowGap: -10 }))
    expect(isErr(r)).toBe(true)
  })

  it('rowGap NaN: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ rowGap: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('rowGap non-número: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ rowGap: 'big' as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  it('centerClearance no longer aceptado (eliminado en F11.2b-bis): err se presente', () => {
    // Sanity: tras eliminar `centerClearance`, pasarllo ao parser cae no
    // catch-all do BaseLayoutConfig (campos descoñecidos ignóranse en
    // exactOptionalPropertyTypes, polo que devolve ok pero sen o campo).
    const r = parseClusteredRadialConfig(validConfig({ centerClearance: 50 as unknown as number }))
    // Comportamento: o parser non rexeita campos descoñecidos (a
    // ClusteredRadialConfig é base-loose), simplemente ignóraos.
    expect(isOk(r)).toBe(true)
    // E o resultado non contén `centerClearance`.
    expect('centerClearance' in unwrap(r)).toBe(false)
  })

  // ── F11.2c: clusterArc ──

  it('clusterArc presente e válido: ok', () => {
    const r = parseClusteredRadialConfig(validConfig({ clusterArc: Math.PI / 2 }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).clusterArc).toBeCloseTo(Math.PI / 2, 6)
  })

  it('clusterArc = 0: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ clusterArc: 0 }))
    expect(isErr(r)).toBe(true)
  })

  it('clusterArc negativo: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ clusterArc: -1 }))
    expect(isErr(r)).toBe(true)
  })

  it('clusterArc NaN: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ clusterArc: Number.NaN }))
    expect(isErr(r)).toBe(true)
  })

  it('clusterArc non-número: err', () => {
    const r = parseClusteredRadialConfig(validConfig({ clusterArc: 'wide' as unknown as number }))
    expect(isErr(r)).toBe(true)
  })

  it('clusterArc ausente: ok (default aplícase en compute)', () => {
    const r = parseClusteredRadialConfig(validConfig({ memberLayout: 'cluster' }))
    expect(isOk(r)).toBe(true)
    expect(unwrap(r).clusterArc).toBeUndefined()
  })
})
// ── FIN: tests de ClusteredRadialConfig ──
