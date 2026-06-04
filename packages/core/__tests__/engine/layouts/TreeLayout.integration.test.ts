// ── INICIO: tests integración TreeLayout ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { IdentityLayout } from '../../../src/engine/layouts/IdentityLayout.js'
import { LayoutEngineRegistry } from '../../../src/engine/layouts/LayoutEngineRegistry.js'
import { RadialLayout } from '../../../src/engine/layouts/RadialLayout.js'
import { TreeLayout } from '../../../src/engine/layouts/TreeLayout.js'
import { computeLayout } from '../../../src/engine/layouts/computeLayout.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'int-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Int Test',
    nodes: [],
    edges: [],
    layout: { type: 'tree' },
    ...overrides,
  }
}

describe('TreeLayout integration', () => {
  it('TreeLayout rexistrado no registry funciona con computeLayout', () => {
    const reg = new LayoutEngineRegistry().register(new TreeLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    expect(isOk(computeLayout(td, reg))).toBe(true)
  })

  it("layout.type='tree' despacha a TreeLayout", () => {
    const reg = new LayoutEngineRegistry().register(new IdentityLayout()).register(new TreeLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    expect(unwrap(computeLayout(td, reg)).layoutType).toBe('tree')
  })

  it('config inválido propaga err', () => {
    const reg = new LayoutEngineRegistry().register(new TreeLayout())
    const td = makeTreeDef({ layout: { type: 'tree', nodeSpacing: -1 } })
    const r = computeLayout(td, reg)
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
  })

  it("layoutType === 'tree'", () => {
    const reg = new LayoutEngineRegistry().register(new TreeLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    expect(unwrap(computeLayout(td, reg)).layoutType).toBe('tree')
  })

  it('mesh é undefined (TreeLayout non xera mesh)', () => {
    const reg = new LayoutEngineRegistry().register(new TreeLayout())
    const td = makeTreeDef({
      nodes: [{ id: 'a', type: 'skill', label: 'A' }],
    })
    const lr = unwrap(computeLayout(td, reg))
    expect(lr.mesh).toBeUndefined()
  })

  it('coexistencia con RadialLayout e IdentityLayout', () => {
    const reg = new LayoutEngineRegistry()
      .register(new IdentityLayout())
      .register(new RadialLayout())
      .register(new TreeLayout())
    expect(reg.size()).toBe(3)
    expect(reg.has('custom')).toBe(true)
    expect(reg.has('radial')).toBe(true)
    expect(reg.has('tree')).toBe(true)
  })

  it('locale propaga en LAYOUT_TYPE_UNKNOWN', () => {
    const reg = new LayoutEngineRegistry().register(new TreeLayout())
    const td = makeTreeDef({ layout: { type: 'unknown' } })
    const r = computeLayout(td, reg, 'en')
    if (!r.ok) expect(r.error.message).toContain('not registered')
  })

  it('determinismo via computeLayout', () => {
    const reg = new LayoutEngineRegistry().register(new TreeLayout())
    const td = makeTreeDef({
      nodes: [
        { id: 'r', type: 'skill', label: 'R' },
        { id: 'a', type: 'skill', label: 'A' },
      ],
      edges: [{ id: 'e1', source: 'r', target: 'a', type: 'dependency' }],
    })
    const r1 = unwrap(computeLayout(td, reg))
    const r2 = unwrap(computeLayout(td, reg))
    expect(r1.nodes.get('r')).toEqual(r2.nodes.get('r'))
    expect(r1.nodes.get('a')).toEqual(r2.nodes.get('a'))
  })
})
// ── FIN: tests integración TreeLayout ──
