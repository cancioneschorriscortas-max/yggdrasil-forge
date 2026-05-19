// ── INICIO: tests de TreeDefValidator (1.17) ──
// Tests FUNCIONALES runtime de validateTreeDef.
//
// Los tests de TIPO (helper cirúrgico de igualdad + test negativo
// @ts-expect-error, condiciones obligatorias del arquitecto) viven en
// `src/engine/treeDefSchema.type-test.ts` PORQUE el tsconfig del core
// excluye `__tests__/` del typecheck y vitest no tiene test.typecheck: un
// @ts-expect-error aquí sería decorativo. Ver cabecera de ese fichero.

import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { validateTreeDef } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

/** TreeDef mínimo válido (forma fiel al contrato de tipos). */
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

describe('TreeDefValidator.validateTreeDef', () => {
  describe('casos válidos', () => {
    it('TreeDef mínimo válido -> ok', () => {
      const result = validateTreeDef(makeValidTreeDef())
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('test-tree')
        expect(result.value.schemaVersion).toBe('1.0.0')
      }
    })

    it('TreeDef con nodos, edges y campos opcionales -> ok', () => {
      const treeDef = makeValidTreeDef({
        description: { gl: 'desc', en: 'desc' },
        author: 'tester',
        rootNodeId: 'root',
        nodes: [
          { id: 'root', type: 'root', label: 'Raíz' },
          {
            id: 'a',
            type: 'small',
            label: { gl: 'A', en: 'A' },
            cost: [{ resourceId: 'xp', amount: 10 }],
            prerequisites: { type: 'node_unlocked', nodeId: 'root' },
          },
        ],
        edges: [{ id: 'e1', source: 'root', target: 'a', type: 'dependency' }],
        resources: [{ id: 'xp', label: 'XP', initial: 0 }],
        groups: [{ id: 'g1', label: 'Grupo' }],
        stats: [{ id: 's1', label: 'Stat', format: 'number' }],
      })
      const result = validateTreeDef(treeDef)
      expect(result.ok).toBe(true)
    })

    it('TreeDef con subtree anidado -> ok (recursión)', () => {
      const treeDef = makeValidTreeDef({
        subtrees: {
          sub1: makeValidTreeDef({ id: 'sub1' }),
        },
      })
      const result = validateTreeDef(treeDef)
      expect(result.ok).toBe(true)
    })

    it('TreeDef con effect recursivo (composite/conditional) -> ok', () => {
      const treeDef = makeValidTreeDef({
        nodes: [
          {
            id: 'n1',
            type: 'notable',
            label: 'N1',
            effects: [
              {
                type: 'composite',
                effects: [
                  { type: 'unlock_node', nodeId: 'n2' },
                  {
                    type: 'conditional',
                    condition: { type: 'node_unlocked', nodeId: 'n2' },
                    // biome-ignore lint/suspicious/noThenProperty: `then` es el campo del contrato Effect (variante 'conditional', types/effects.ts), no una thenable.
                    then: [{ type: 'set_progress', nodeId: 'n1', percent: 50 }],
                  },
                ],
              },
            ],
          },
        ],
      })
      const result = validateTreeDef(treeDef)
      expect(result.ok).toBe(true)
    })
  })

  describe('casos inválidos', () => {
    it('campo requerido faltante (sin id) -> err con issues en context', () => {
      const broken = makeValidTreeDef()
      const { id: _omitId, ...withoutId } = broken
      void _omitId
      const result = validateTreeDef(withoutId)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
        const issues = result.error.context?.issues
        expect(Array.isArray(issues)).toBe(true)
        if (Array.isArray(issues)) {
          expect(issues.length).toBeGreaterThan(0)
          expect(issues[0]).toHaveProperty('path')
          expect(issues[0]).toHaveProperty('message')
        }
      }
    })

    it('tipo incorrecto (nodes no es array) -> err con issues', () => {
      const result = validateTreeDef({ ...makeValidTreeDef(), nodes: 'malo' })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
        const issues = result.error.context?.issues
        expect(Array.isArray(issues)).toBe(true)
      }
    })

    it('nodo con type fuera del contrato -> err', () => {
      const result = validateTreeDef(
        makeValidTreeDef({
          nodes: [{ id: 'x', type: 'inventado', label: 'X' } as never],
        }),
      )
      expect(result.ok).toBe(false)
    })

    it('unknown arbitrario (number) -> err sin petar', () => {
      const result = validateTreeDef(42)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
      }
    })

    it('unknown arbitrario (null) -> err sin petar', () => {
      const result = validateTreeDef(null)
      expect(result.ok).toBe(false)
    })

    it('unknown arbitrario (array) -> err sin petar', () => {
      const result = validateTreeDef([1, 2, 3])
      expect(result.ok).toBe(false)
    })

    it('unknown arbitrario (string) -> err sin petar', () => {
      const result = validateTreeDef('non son unha árbore')
      expect(result.ok).toBe(false)
    })

    it('mensaje de error localizado (gl por defecto)', () => {
      const result = validateTreeDef(42)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('A definición')
      }
    })

    it('locale explícito (en) cambia el mensaje', () => {
      const result = validateTreeDef(42, 'en')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Tree definition is invalid')
      }
    })
  })
})
// ── FIN: tests de TreeDefValidator (1.17) ──
