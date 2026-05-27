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

  // ── INICIO: tests da sub-fase 2.5 — 10 validacións hardening ──
  // Helper local para extraer issues do error tipados como any[] (z.ZodIssue
  // SERIALIZADO por TreeDefValidator.extractIssues como
  // { path: string, message: string } onde path = issue.path.join('.')).
  // Cada teste negativo confirma que existe un issue cun path e message
  // concretos da validación correspondente.
  type SerializedIssue = { path: string; message: string }
  const getIssues = (result: ReturnType<typeof validateTreeDef>): SerializedIssue[] => {
    if (result.ok) return []
    const raw = result.error.context?.issues
    return Array.isArray(raw) ? (raw as SerializedIssue[]) : []
  }
  // Constrúe a forma "a.b.0.c" a partir dun array de segmentos.
  const pathOf = (segments: (string | number)[]): string => segments.join('.')
  const hasIssue = (
    issues: SerializedIssue[],
    expectedMessage: string,
    expectedPathSuffix?: (string | number)[],
  ): boolean => {
    return issues.some((iss) => {
      if (iss.message !== expectedMessage) return false
      if (expectedPathSuffix === undefined) return true
      const suffix = pathOf(expectedPathSuffix)
      return iss.path === suffix || iss.path.endsWith(`.${suffix}`)
    })
  }

  describe('sub-fase 2.5 — validacións por campo (1-5)', () => {
    // #1 maxTier > 0
    it('#1 maxTier=1 → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({ nodes: [{ id: 'n', type: 'small', label: 'N', maxTier: 1 }] }),
      )
      expect(r.ok).toBe(true)
    })
    it('#1 maxTier=0 → err con mensaxe "maxTier debe ser maior que 0"', () => {
      const r = validateTreeDef(
        makeValidTreeDef({ nodes: [{ id: 'n', type: 'small', label: 'N', maxTier: 0 }] }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
        expect(hasIssue(getIssues(r), 'maxTier debe ser maior que 0', ['maxTier'])).toBe(true)
      }
    })

    // #2 tier > 0
    it('#2 tier=2 → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({ nodes: [{ id: 'n', type: 'small', label: 'N', tier: 2 }] }),
      )
      expect(r.ok).toBe(true)
    })
    it('#2 tier=-1 → err con mensaxe "tier debe ser maior que 0"', () => {
      const r = validateTreeDef(
        makeValidTreeDef({ nodes: [{ id: 'n', type: 'small', label: 'N', tier: -1 }] }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(hasIssue(getIssues(r), 'tier debe ser maior que 0', ['tier'])).toBe(true)
      }
    })

    // #3 progressMilestones en [0, 100]
    it('#3 progressMilestones=[0,25,50,100] → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              supportsProgress: true,
              progressMilestones: [0, 25, 50, 100],
            },
          ],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#3 progressMilestones=[10, 150] → err rango', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              supportsProgress: true,
              progressMilestones: [10, 150],
            },
          ],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'progressMilestones debe conter só valores en [0, 100]', [
            'progressMilestones',
          ]),
        ).toBe(true)
      }
    })

    // #4 progressMilestones estrictamente ordenado
    it('#4 progressMilestones=[10, 20, 30] → ok (ordenado estricto)', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              supportsProgress: true,
              progressMilestones: [10, 20, 30],
            },
          ],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#4 progressMilestones=[10, 10, 20] → err orde (duplicado)', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              supportsProgress: true,
              progressMilestones: [10, 10, 20],
            },
          ],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(
            getIssues(r),
            'progressMilestones debe estar ordenado ascendentemente sen duplicados',
            ['progressMilestones'],
          ),
        ).toBe(true)
      }
    })

    // #5 cost.amount > 0
    it('#5 cost.amount=10 → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              cost: [{ resourceId: 'xp', amount: 10 }],
            },
          ],
          resources: [{ id: 'xp', label: 'XP' }],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#5 cost.amount=0 → err con mensaxe "amount debe ser maior que 0"', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              cost: [{ resourceId: 'xp', amount: 0 }],
            },
          ],
          resources: [{ id: 'xp', label: 'XP' }],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(hasIssue(getIssues(r), 'amount debe ser maior que 0', ['amount'])).toBe(true)
      }
    })
  })

  describe('sub-fase 2.5 — validación cross-field (6)', () => {
    // #6 progressSource require supportsProgress: true
    it('#6 progressSource + supportsProgress=true → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              supportsProgress: true,
              progressSource: { type: 'manual' },
            },
          ],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#6 progressSource sen supportsProgress → err', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'n',
              type: 'small',
              label: 'N',
              progressSource: { type: 'manual' },
            },
          ],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'progressSource require supportsProgress: true', [
            'supportsProgress',
          ]),
        ).toBe(true)
      }
    })
  })

  describe('sub-fase 2.5 — validacións cross-node (7-10)', () => {
    // #7 dependsOn referencia nodos existentes
    it('#7 dependsOn apunta a nodo existente → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            { id: 'a', type: 'small', label: 'A' },
            {
              id: 'b',
              type: 'small',
              label: 'B',
              supportsProgress: true,
              progressSource: { type: 'computed', dependsOn: ['a'], formula: 'sum' },
            },
          ],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#7 dependsOn apunta a nodo inexistente → err', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'b',
              type: 'small',
              label: 'B',
              supportsProgress: true,
              progressSource: { type: 'computed', dependsOn: ['ghost'], formula: 'sum' },
            },
          ],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'dependsOn referencia nodo inexistente: "ghost"', [
            'nodes',
            0,
            'progressSource',
            'dependsOn',
            0,
          ]),
        ).toBe(true)
      }
    })

    // #8 prerequisites referencia nodos/stats existentes (recursivo)
    it('#8 prerequisites con nodeId existente → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            { id: 'a', type: 'small', label: 'A' },
            {
              id: 'b',
              type: 'small',
              label: 'B',
              prerequisites: {
                type: 'all',
                conditions: [
                  { type: 'node_unlocked', nodeId: 'a' },
                  { type: 'node_state', nodeId: 'a', state: 'unlocked' },
                ],
              },
            },
          ],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#8 prerequisites con nodeId inexistente (anidado en all) → err', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'b',
              type: 'small',
              label: 'B',
              prerequisites: {
                type: 'all',
                conditions: [{ type: 'node_unlocked', nodeId: 'ghost' }],
              },
            },
          ],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'prerequisite referencia nodo/stat inexistente: "ghost"', [
            'nodes',
            0,
            'prerequisites',
            'conditions',
            0,
            'nodeId',
          ]),
        ).toBe(true)
      }
    })
    it('#8 prerequisites distance_max con fromNodeId inexistente → err', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'b',
              type: 'small',
              label: 'B',
              prerequisites: { type: 'distance_max', fromNodeId: 'ghost', maxSteps: 2 },
            },
          ],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'prerequisite referencia nodo/stat inexistente: "ghost"', [
            'nodes',
            0,
            'prerequisites',
            'fromNodeId',
          ]),
        ).toBe(true)
      }
    })
    it('#8 prerequisites stat_min con statId inexistente → err', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            {
              id: 'b',
              type: 'small',
              label: 'B',
              prerequisites: { type: 'stat_min', statId: 'ghost-stat', amount: 5 },
            },
          ],
          stats: [{ id: 's-real', label: 'S' }],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'prerequisite referencia nodo/stat inexistente: "ghost-stat"', [
            'nodes',
            0,
            'prerequisites',
            'statId',
          ]),
        ).toBe(true)
      }
    })

    // #9 exclusions referencia nodos existentes
    it('#9 exclusions apunta a nodo existente → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            { id: 'a', type: 'small', label: 'A' },
            { id: 'b', type: 'small', label: 'B', exclusions: ['a'] },
          ],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#9 exclusions apunta a nodo inexistente → err', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [{ id: 'b', type: 'small', label: 'B', exclusions: ['ghost'] }],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(
          hasIssue(getIssues(r), 'exclusion referencia nodo inexistente: "ghost"', [
            'nodes',
            0,
            'exclusions',
            0,
          ]),
        ).toBe(true)
      }
    })

    // #10 edges.source/target referencian nodos existentes
    it('#10 edge con source/target existentes → ok', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [
            { id: 'a', type: 'small', label: 'A' },
            { id: 'b', type: 'small', label: 'B' },
          ],
          edges: [{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }],
        }),
      )
      expect(r.ok).toBe(true)
    })
    it('#10 edge con source/target inexistentes → err nos dous extremos', () => {
      const r = validateTreeDef(
        makeValidTreeDef({
          nodes: [{ id: 'a', type: 'small', label: 'A' }],
          edges: [{ id: 'e1', source: 'ghost1', target: 'ghost2', type: 'dependency' }],
        }),
      )
      expect(r.ok).toBe(false)
      if (!r.ok) {
        const issues = getIssues(r)
        expect(
          hasIssue(issues, 'edge referencia nodo inexistente: "ghost1"', ['edges', 0, 'source']),
        ).toBe(true)
        expect(
          hasIssue(issues, 'edge referencia nodo inexistente: "ghost2"', ['edges', 0, 'target']),
        ).toBe(true)
      }
    })
  })
  // ── FIN: tests da sub-fase 2.5 ──
})
// ── FIN: tests de TreeDefValidator (1.17) ──
