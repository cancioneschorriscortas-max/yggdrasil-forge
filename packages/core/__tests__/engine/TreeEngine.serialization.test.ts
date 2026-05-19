// ── INICIO: tests de TreeEngine fromJSON/toJSON (1.17) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine, serialize } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

function makeValidTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

function makeTreeDefWithNodes(): TreeDef {
  return makeValidTreeDef({
    rootNodeId: 'root',
    nodes: [
      { id: 'root', type: 'root', label: 'Raíz' },
      { id: 'a', type: 'small', label: 'A' },
    ],
    edges: [{ id: 'e1', source: 'root', target: 'a', type: 'dependency' }],
    resources: [{ id: 'xp', label: 'XP', initial: 10 }],
  })
}

describe('TreeEngine.fromJSON / toJSON', () => {
  describe('fromJSON', () => {
    it('JSON válido -> ok(engine) funcional', () => {
      const json = serialize(makeTreeDefWithNodes())
      const result = TreeEngine.fromJSON(json)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const engine = result.value
        expect(engine).toBeInstanceOf(TreeEngine)
        expect(engine.getTreeDef().id).toBe('test-tree')
        expect(engine.getTreeDef().nodes.length).toBe(2)
      }
    })

    it('JSON inválido (estructura) -> err, NO lanza', () => {
      // No debe lanzar: la llamada se completa devolviendo Result.
      const result = TreeEngine.fromJSON('{"id":"x"}')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
      }
    })

    it('JSON malformado -> err, NO lanza', () => {
      const result = TreeEngine.fromJSON('{{{ no json')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
      }
    })

    it('schemaVersion no soportada -> err SCHEMA_VERSION_UNSUPPORTED, NO lanza', () => {
      const json = serialize(makeValidTreeDef({ schemaVersion: '42.0.0' }))
      const result = TreeEngine.fromJSON(json)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SCHEMA_VERSION_UNSUPPORTED)
      }
    })

    it('respeta options (locale) en el engine construido', () => {
      const json = serialize(makeValidTreeDef())
      const result = TreeEngine.fromJSON(json, { locale: 'en' })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.getLocale()).toBe('en')
      }
    })

    it('el constructor normal sigue lanzando (semántica intacta)', () => {
      // fromJSON devuelve Result, pero el constructor directo con TreeDef
      // inválido sigue lanzando (no se tocó su semántica, decisión 5.5).
      expect(() => new TreeEngine({ id: '' } as unknown as TreeDef)).toThrow()
    })
  })

  describe('toJSON', () => {
    it('produce JSON determinista del TreeDef actual', () => {
      const engine = new TreeEngine(makeTreeDefWithNodes())
      const a = engine.toJSON()
      const b = engine.toJSON()
      expect(a).toBe(b)
      expect(JSON.parse(a).id).toBe('test-tree')
    })

    it('round-trip a nivel engine: fromJSON(e.toJSON()) reconstruye equivalente', () => {
      const engine1 = new TreeEngine(makeTreeDefWithNodes())
      const json1 = engine1.toJSON()
      const result = TreeEngine.fromJSON(json1)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const json2 = result.value.toJSON()
        expect(json2).toBe(json1)
      }
    })

    it('toJSON no incluye estado de runtime', () => {
      const engine = new TreeEngine(makeTreeDefWithNodes())
      const parsed = JSON.parse(engine.toJSON())
      expect(parsed.budget).toBeUndefined()
      expect(parsed.computedStats).toBeUndefined()
    })
  })
})
// ── FIN: tests de TreeEngine fromJSON/toJSON (1.17) ──
