// ── INICIO: tests TreeEngine.explainUnlock (Showcase Capa 0) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

/**
 * Helper: TreeDef con dous nodos: A (raíz, sen prerequisites) e B
 * dependente de A vía `node_unlocked`. Pode estenderse via overrides.
 */
function makeTwoNodeTree(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'explain-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Explain test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      {
        id: 'b',
        type: 'small',
        label: 'B',
        prerequisites: { type: 'node_unlocked', nodeId: 'a' },
      },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'radial' },
    ...overrides,
  }
}

describe('TreeEngine.explainUnlock', () => {
  describe('casos básicos', () => {
    it('nodo inexistente → err(NODE_NOT_FOUND)', () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      const result = engine.explainUnlock('ghost')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.NODE_NOT_FOUND)
      }
    })

    it('nodo sen prerequisites → ok({satisfied:true, conditions:[]})', () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      const result = engine.explainUnlock('a')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.satisfied).toBe(true)
        expect(result.value.conditions).toEqual([])
      }
    })

    it('nodo con prereq simple non cumprido → ok({satisfied:false, conditions:[atomic]})', () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      // A non desbloqueado → B falla
      const result = engine.explainUnlock('b')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.satisfied).toBe(false)
        expect(result.value.conditions.length).toBe(1)
        const first = result.value.conditions[0]
        expect(first?.satisfied).toBe(false)
      }
    })

    it('nodo con prereq simple cumprido → ok({satisfied:true})', async () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      await engine.unlock('a')
      const result = engine.explainUnlock('b')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.satisfied).toBe(true)
        expect(result.value.conditions[0]?.satisfied).toBe(true)
      }
    })
  })

  describe('regras compostas', () => {
    it('`all` con 2 condicións, unha falla → satisfied:false, mapeo por-condición correcto', async () => {
      const tree = makeTwoNodeTree({
        nodes: [
          { id: 'a', type: 'small', label: 'A' },
          { id: 'b', type: 'small', label: 'B' },
          {
            id: 'paladin',
            type: 'small',
            label: 'Paladin',
            prerequisites: {
              type: 'all',
              conditions: [
                { type: 'node_unlocked', nodeId: 'a' },
                { type: 'node_unlocked', nodeId: 'b' },
              ],
            },
          },
        ],
        edges: [
          { id: 'a-p', source: 'a', target: 'paladin', type: 'dependency' },
          { id: 'b-p', source: 'b', target: 'paladin', type: 'dependency' },
        ],
      })
      const engine = new TreeEngine(tree)
      await engine.unlock('a') // só A; B segue locked

      const result = engine.explainUnlock('paladin')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.satisfied).toBe(false)
        expect(result.value.conditions.length).toBe(2)
        // A condición de A (node_unlocked: a) está satisfeita; B non.
        const aCond = result.value.conditions[0]
        const bCond = result.value.conditions[1]
        expect(aCond?.satisfied).toBe(true)
        expect(bCond?.satisfied).toBe(false)
      }
    })

    it('`any` (unha cumprida) → satisfied:true; cero short-circuit (avalíanse todas)', async () => {
      const tree = makeTwoNodeTree({
        nodes: [
          { id: 'a', type: 'small', label: 'A' },
          { id: 'b', type: 'small', label: 'B' },
          {
            id: 'berserker',
            type: 'small',
            label: 'Berserker',
            prerequisites: {
              type: 'any',
              conditions: [
                { type: 'node_unlocked', nodeId: 'a' },
                { type: 'node_unlocked', nodeId: 'b' },
              ],
            },
          },
        ],
        edges: [
          { id: 'a-bk', source: 'a', target: 'berserker', type: 'dependency' },
          { id: 'b-bk', source: 'b', target: 'berserker', type: 'dependency' },
        ],
      })
      const engine = new TreeEngine(tree)
      await engine.unlock('a')

      const result = engine.explainUnlock('berserker')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.satisfied).toBe(true)
        // explain avalúa TODAS sen short-circuit (UnlockResolver.explain doc):
        // verificamos que vemos as dúas condicións na lista.
        expect(result.value.conditions.length).toBe(2)
      }
    })

    it('`none` (unha presente) → satisfied:false', async () => {
      const tree = makeTwoNodeTree({
        nodes: [
          { id: 'a', type: 'small', label: 'A' },
          {
            id: 'pacifist',
            type: 'small',
            label: 'Pacifist',
            prerequisites: {
              type: 'none',
              conditions: [{ type: 'node_unlocked', nodeId: 'a' }],
            },
          },
        ],
        edges: [],
      })
      const engine = new TreeEngine(tree)
      await engine.unlock('a') // A desbloqueado → pacifist falla por exclusión semántica

      const result = engine.explainUnlock('pacifist')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.satisfied).toBe(false)
        expect(result.value.conditions.length).toBe(1)
      }
    })
  })

  describe('coherencia con canUnlock', () => {
    it('mesmo ctx → `explainUnlock.satisfied` coincide co veredicto de prereqs de `canUnlock` (locked)', () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      // A non desbloqueado → B falla por prereqs.
      const explain = engine.explainUnlock('b')
      const check = engine.canUnlock('b')
      expect(explain.ok).toBe(true)
      expect(check.ok).toBe(true)
      if (explain.ok && check.ok) {
        // explain di prereqs non cumpridos; canUnlock devolve allowed:false.
        expect(explain.value.satisfied).toBe(false)
        expect(check.value.allowed).toBe(false)
      }
    })

    it('mesmo ctx → ambos coinciden cando prereqs si están cumpridos', async () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      await engine.unlock('a')
      const explain = engine.explainUnlock('b')
      const check = engine.canUnlock('b')
      expect(explain.ok).toBe(true)
      expect(check.ok).toBe(true)
      if (explain.ok && check.ok) {
        expect(explain.value.satisfied).toBe(true)
        expect(check.value.allowed).toBe(true)
      }
    })

    it('NON corta por estado actual: nodo xa unlocked → explain segue informando prereqs', async () => {
      const engine = new TreeEngine(makeTwoNodeTree())
      await engine.unlock('a')
      await engine.unlock('b')
      // B agora está unlocked. canUnlock cortaría por estado; explainUnlock
      // segue informando dos prereqs (que están satisfeitos).
      const explain = engine.explainUnlock('b')
      const check = engine.canUnlock('b')
      expect(explain.ok).toBe(true)
      if (explain.ok) {
        // Explain segue avaliando prereqs: cumpridos.
        expect(explain.value.satisfied).toBe(true)
      }
      // canUnlock corta antes de avaliar prereqs (NODE_ALREADY_UNLOCKED).
      if (check.ok) {
        expect(check.value.allowed).toBe(false)
      }
    })
  })
})
// ── FIN: tests TreeEngine.explainUnlock ──
