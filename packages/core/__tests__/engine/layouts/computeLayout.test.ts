// ── INICIO: tests de computeLayout ──
import { ErrorCode, YggdrasilError, err, ok } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { IdentityLayout } from '../../../src/engine/layouts/IdentityLayout.js'
import type { LayoutEngine } from '../../../src/engine/layouts/LayoutEngine.js'
import { LayoutEngineRegistry } from '../../../src/engine/layouts/LayoutEngineRegistry.js'
import type { LayoutResult } from '../../../src/engine/layouts/LayoutResult.js'
import { computeLayout } from '../../../src/engine/layouts/computeLayout.js'
import { isErr, isOk, unwrap } from '../../../src/types/result.js'
import type { TreeDef } from '../../../src/types/tree.js'

/** Helper: crea un TreeDef mínimo para tests. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'cl-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'CL Test',
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
    ...overrides,
  }
}

/** Resultado dummy para engines falsos. */
const DUMMY_RESULT: LayoutResult = {
  nodes: new Map(),
  edges: new Map(),
  bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  layoutType: 'fake',
}

/** Engine falso que devolve ok. */
function makeOkEngine(type: string): LayoutEngine {
  return {
    type,
    compute: () => ok(DUMMY_RESULT),
  }
}

/** Engine falso que devolve err. */
function makeErrEngine(type: string): LayoutEngine {
  return {
    type,
    compute: () => err(new YggdrasilError(ErrorCode.LAYOUT_COMPUTE_FAILED, 'Erro simulado')),
  }
}

describe('computeLayout', () => {
  // 1. Layout type rexistrado: chama engine.compute
  it('con layout type rexistrado devolve o resultado do engine', () => {
    const reg = new LayoutEngineRegistry().register(makeOkEngine('custom'))
    const result = computeLayout(makeTreeDef(), reg)
    expect(isOk(result)).toBe(true)
    expect(unwrap(result)).toBe(DUMMY_RESULT)
  })

  // 2. Layout type NON rexistrado: err(LAYOUT_TYPE_UNKNOWN)
  it('con layout type non rexistrado devolve err LAYOUT_TYPE_UNKNOWN', () => {
    const reg = new LayoutEngineRegistry()
    const result = computeLayout(makeTreeDef({ layout: { type: 'inexistent' } }), reg)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LAYOUT_TYPE_UNKNOWN)
    }
  })

  // 3. Engine.compute devolve err: propágase
  it('propaga err do engine tal cal', () => {
    const reg = new LayoutEngineRegistry().register(makeErrEngine('custom'))
    const result = computeLayout(makeTreeDef(), reg)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.LAYOUT_COMPUTE_FAILED)
    }
  })

  // 4. Engine.compute devolve ok: propágase
  it('propaga ok do engine tal cal', () => {
    const reg = new LayoutEngineRegistry().register(makeOkEngine('custom'))
    const result = computeLayout(makeTreeDef(), reg)
    expect(isOk(result)).toBe(true)
  })

  // 5. Locale 'es' propaga á mensaxe
  it('locale es inclúese na mensaxe do erro', () => {
    const reg = new LayoutEngineRegistry()
    const result = computeLayout(makeTreeDef({ layout: { type: 'missing' } }), reg, 'es')
    if (!result.ok) {
      expect(result.error.message).toContain('no registrado')
    }
  })

  // 6. Locale 'en' propaga á mensaxe
  it('locale en inclúese na mensaxe do erro', () => {
    const reg = new LayoutEngineRegistry()
    const result = computeLayout(makeTreeDef({ layout: { type: 'missing' } }), reg, 'en')
    if (!result.ok) {
      expect(result.error.message).toContain('not registered')
    }
  })

  // 7. Locale por defecto 'gl'
  it('locale por defecto é gl', () => {
    const reg = new LayoutEngineRegistry()
    const result = computeLayout(makeTreeDef({ layout: { type: 'missing' } }), reg)
    if (!result.ok) {
      expect(result.error.message).toContain('non rexistrado')
    }
  })

  // 8. Registry con múltiples engines: usa o correcto para o type
  it('con múltiples engines usa o correcto para o layout type', () => {
    const customEngine = makeOkEngine('custom')
    const radialEngine = makeOkEngine('radial')
    const reg = new LayoutEngineRegistry().register(customEngine).register(radialEngine)
    const result = computeLayout(makeTreeDef({ layout: { type: 'radial' } }), reg)
    expect(isOk(result)).toBe(true)
  })

  // 9. context do erro inclúe type
  it('o erro LAYOUT_TYPE_UNKNOWN inclúe type no context', () => {
    const reg = new LayoutEngineRegistry()
    const result = computeLayout(makeTreeDef({ layout: { type: 'xyzzy' } }), reg)
    if (!result.ok) {
      expect(result.error.context).toEqual({ type: 'xyzzy' })
    }
  })

  // 10. Integración: IdentityLayout rexistrado + computeLayout
  it('integración: IdentityLayout rexistrado produce LayoutResult correcto', () => {
    const reg = new LayoutEngineRegistry().register(new IdentityLayout())
    const treeDef = makeTreeDef({
      nodes: [{ id: 'n1', type: 'skill', label: 'N1', position: { x: 5, y: 10 } }],
    })
    const result = computeLayout(treeDef, reg)
    expect(isOk(result)).toBe(true)
    const lr = unwrap(result)
    expect(lr.nodes.get('n1')).toEqual({ x: 5, y: 10 })
    expect(lr.layoutType).toBe('custom')
    expect(lr.bounds).toEqual({ minX: 5, minY: 10, maxX: 5, maxY: 10 })
  })
})
// ── FIN: tests de computeLayout ──
