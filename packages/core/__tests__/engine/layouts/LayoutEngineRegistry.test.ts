import { ok } from '@yggdrasil-forge/common'
// ── INICIO: tests de LayoutEngineRegistry ──
import { describe, expect, it } from 'vitest'
import type { LayoutEngine } from '../../../src/engine/layouts/LayoutEngine.js'
import { LayoutEngineRegistry } from '../../../src/engine/layouts/LayoutEngineRegistry.js'
import type { LayoutResult } from '../../../src/engine/layouts/LayoutResult.js'
import type { TreeDef } from '../../../src/types/tree.js'

/** Engine falso para tests do registry. */
function makeFakeEngine(type: string): LayoutEngine {
  return {
    type,
    compute(_treeDef: TreeDef) {
      return ok({
        nodes: new Map(),
        edges: new Map(),
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        layoutType: type,
      } satisfies LayoutResult)
    },
  }
}

describe('LayoutEngineRegistry', () => {
  // 1. Registry baleiro
  it('registry baleiro: size() === 0 e has() devolve false', () => {
    const reg = new LayoutEngineRegistry()
    expect(reg.size()).toBe(0)
    expect(reg.has('any')).toBe(false)
  })

  // 2. Register + find
  it('register + find: recupera o engine rexistrado', () => {
    const reg = new LayoutEngineRegistry()
    const engine = makeFakeEngine('custom')
    reg.register(engine)
    expect(reg.find('custom')).toBe(engine)
  })

  // 3. Register sobreescribe
  it('register sobreescribe un engine co mesmo type', () => {
    const reg = new LayoutEngineRegistry()
    const first = makeFakeEngine('custom')
    const second = makeFakeEngine('custom')
    reg.register(first)
    reg.register(second)
    expect(reg.find('custom')).toBe(second)
    expect(reg.size()).toBe(1)
  })

  // 4. has() devolve true tras register
  it('has() devolve true tras register', () => {
    const reg = new LayoutEngineRegistry()
    reg.register(makeFakeEngine('radial'))
    expect(reg.has('radial')).toBe(true)
  })

  // 5. Chaining funciona
  it('register devolve this para chaining', () => {
    const reg = new LayoutEngineRegistry()
    const result = reg.register(makeFakeEngine('custom')).register(makeFakeEngine('radial'))
    expect(result).toBe(reg)
    expect(reg.size()).toBe(2)
  })

  // 6. find() de type non rexistrado devolve undefined
  it('find() de type non rexistrado devolve undefined', () => {
    const reg = new LayoutEngineRegistry()
    reg.register(makeFakeEngine('custom'))
    expect(reg.find('nonexistent')).toBeUndefined()
  })
})
// ── FIN: tests de LayoutEngineRegistry ──
