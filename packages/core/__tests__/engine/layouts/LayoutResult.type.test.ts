// ── INICIO: type-tests de LayoutResult ──
//
// Nota: este ficheiro vive en __tests__/ e usa `expectTypeOf` de vitest
// para verificar tipos en runtime. O tsconfig.json exclúe __tests__/ do
// typecheck, pero vitest executa as comprobacións de tipo igualmente.
import { describe, expectTypeOf, it } from 'vitest'
import type { Bounds, EdgePath, LayoutResult } from '../../../src/engine/layouts/LayoutResult.js'
import type { Position } from '../../../src/types/node.js'

describe('LayoutResult type-tests', () => {
  // 1. LayoutResult.nodes é ReadonlyMap<string, Position>
  it('nodes é ReadonlyMap<string, Position>', () => {
    expectTypeOf<LayoutResult['nodes']>().toEqualTypeOf<ReadonlyMap<string, Position>>()
  })

  // 2. EdgePath.points é readonly Position[]
  it('EdgePath.points é readonly array de Position', () => {
    expectTypeOf<EdgePath['points']>().toEqualTypeOf<readonly Position[]>()
  })

  // 3. Bounds ten 4 campos numéricos readonly
  it('Bounds ten minX, minY, maxX, maxY como number', () => {
    expectTypeOf<Bounds>().toHaveProperty('minX')
    expectTypeOf<Bounds['minX']>().toBeNumber()
    expectTypeOf<Bounds>().toHaveProperty('minY')
    expectTypeOf<Bounds['minY']>().toBeNumber()
    expectTypeOf<Bounds>().toHaveProperty('maxX')
    expectTypeOf<Bounds['maxX']>().toBeNumber()
    expectTypeOf<Bounds>().toHaveProperty('maxY')
    expectTypeOf<Bounds['maxY']>().toBeNumber()
  })
})
// ── FIN: type-tests de LayoutResult ──
