// ── INICIO: tests integración RadialLayout ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { IdentityLayout } from '../../../src/engine/layouts/IdentityLayout.js'
import { LayoutEngineRegistry } from '../../../src/engine/layouts/LayoutEngineRegistry.js'
import { RadialLayout } from '../../../src/engine/layouts/RadialLayout.js'
import { computeLayout } from '../../../src/engine/layouts/computeLayout.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

/** Helper: TreeDef mínimo. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'int-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Integration Test',
    nodes: [],
    edges: [],
    layout: { type: 'radial', radius: 100 },
    ...overrides,
  }
}

describe('RadialLayout integration', () => {
  // 1. Rexistrar RadialLayout no registry + computeLayout funciona
  it('RadialLayout rexistrado no registry funciona con computeLayout', () => {
    const reg = new LayoutEngineRegistry().register(new RadialLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const r = computeLayout(td, reg)
    expect(isOk(r)).toBe(true)
  })

  // 2. TreeDef con layout.type='radial' usa RadialLayout
  it("layout.type='radial' despacha a RadialLayout", () => {
    const reg = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new RadialLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const lr = unwrap(computeLayout(td, reg))
    expect(lr.layoutType).toBe('radial')
  })

  // 3. Config inválido propaga err via computeLayout
  it('config inválido propaga err via computeLayout', () => {
    const reg = new LayoutEngineRegistry().register(new RadialLayout())
    const td = makeTreeDef({
      layout: { type: 'radial', radius: -1 },
    })
    const r = computeLayout(td, reg)
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  // 4. Resultado ten layoutType='radial'
  it("resultado ten layoutType='radial'", () => {
    const reg = new LayoutEngineRegistry().register(new RadialLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const lr = unwrap(computeLayout(td, reg))
    expect(lr.layoutType).toBe('radial')
  })

  // 5. Resultado ten mesh definido
  it('resultado con nodos e edges ten mesh definido', () => {
    const reg = new LayoutEngineRegistry().register(new RadialLayout())
    const td = makeTreeDef({
      nodes: [
        { id: 'a', type: 'skill', label: 'A' },
        { id: 'b', type: 'skill', label: 'B' },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
    })
    const lr = unwrap(computeLayout(td, reg))
    expect(lr.mesh).toBeDefined()
    expect(lr.mesh?.length ?? 0).toBeGreaterThan(0)
  })

  // 6. IdentityLayout NON produce mesh
  it('IdentityLayout (4.1) non produce mesh', () => {
    const reg = new LayoutEngineRegistry().register(new IdentityLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
      layout: { type: 'custom' },
    })
    const lr = unwrap(computeLayout(td, reg))
    expect(lr.mesh).toBeUndefined()
  })

  // 7. Múltiples engines no registry: usa o correcto
  it('múltiples engines: despacha ao correcto por layout.type', () => {
    const reg = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new RadialLayout())
    const tdCustom = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A', position: { x: 5, y: 10 } }],
      layout: { type: 'custom' },
    })
    const tdRadial = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    expect(unwrap(computeLayout(tdCustom, reg)).layoutType).toBe('custom')
    expect(unwrap(computeLayout(tdRadial, reg)).layoutType).toBe('radial')
  })

  // 8. Locale propaga en LAYOUT_TYPE_UNKNOWN (computeLayout), pero
  //    dentro do engine úsase locale por defecto (gl).
  it('erro de validación do engine usa locale por defecto gl', () => {
    const reg = new LayoutEngineRegistry().register(new RadialLayout())
    const td = makeTreeDef({
      layout: { type: 'radial', radius: -1 },
    })
    const r = computeLayout(td, reg)
    if (!r.ok) {
      expect(r.error.message).toContain('Erro ao calcular layout')
    }
  })
})
// ── FIN: tests integración RadialLayout ──
