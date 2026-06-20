// ── INICIO: tests TreeEngine.grantResource (Nivel · Capa A) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

function makeTreeWithResources(): TreeDef {
  return {
    id: 'grant-test',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Grant',
    rootNodeId: 'a',
    resources: [
      { id: 'level', label: 'Level', initial: 1, max: 10 },
      { id: 'gold', label: 'Gold', initial: 100 }, // sen max
    ],
    startingBudget: { resources: { level: 1, gold: 100 } },
    layout: { type: 'custom' },
    nodes: [
      {
        id: 'a',
        type: 'notable',
        maxTier: 1,
        label: 'A',
        position: { x: 0, y: 0 },
        cost: [],
      },
      {
        id: 'maldito',
        type: 'keystone',
        maxTier: 1,
        label: 'Maldito',
        position: { x: 0, y: 100 },
        prerequisites: { type: 'resource_min', resourceId: 'level', amount: 10 },
        cost: [],
      },
    ],
    edges: [],
  }
}

describe('TreeEngine.grantResource', () => {
  describe('mutación básica', () => {
    it('grant +3 a level (max 10) desde 1 → previous=1, current=4', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      const result = await engine.grantResource('level', 3)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toEqual({ resourceId: 'level', previous: 1, current: 4 })
      }
      expect(engine.getBudget().resources.level).toBe(4)
    })

    it('grant negativo: -2 a gold desde 100 → 98', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      const result = await engine.grantResource('gold', -2)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.current).toBe(98)
      expect(engine.getBudget().resources.gold).toBe(98)
    })
  })

  describe('clamp', () => {
    it('grant +20 a level (max 10) desde 5 → clampea a 10', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      await engine.grantResource('level', 4) // level=5
      const r = await engine.grantResource('level', 20)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value.current).toBe(10)
      expect(engine.getBudget().resources.level).toBe(10)
    })

    it('grant -50 a gold desde 100 → clampea a 0 (sen max pero non baixa de 0)', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      const r = await engine.grantResource('gold', -150)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.value.current).toBe(0)
      expect(engine.getBudget().resources.gold).toBe(0)
    })
  })

  describe('erros', () => {
    it('recurso descoñecido → err UNKNOWN_RESOURCE', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      const r = await engine.grantResource('ghost', 5)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.code).toBe(ErrorCode.UNKNOWN_RESOURCE)
    })
  })

  describe('eventos', () => {
    it('emite budgetChange co payload correcto cando o valor cambia', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      const changes: Array<{ id: string; from: number; to: number }> = []
      engine.events.on('budgetChange', (id, from, to) => {
        changes.push({ id, from, to })
      })
      await engine.grantResource('level', 3)
      expect(changes).toContainEqual({ id: 'level', from: 1, to: 4 })
    })

    it('NON emite budgetChange se o clamp deixa o valor igual', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      await engine.grantResource('level', 9) // level=10 (max)
      const changes: number[] = []
      engine.events.on('budgetChange', (_id, _from, to) => {
        changes.push(to)
      })
      // Outro +5 cando xa estamos en max → previous=10, current=10, sen mutación.
      const r = await engine.grantResource('level', 5)
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.previous).toBe(10)
        expect(r.value.current).toBe(10)
      }
      expect(changes).toEqual([]) // Cero events.
    })
  })

  describe('integración con resource_min', () => {
    it('nodo gatado por nivel 10: bloqueado en nivel 1, accesible tras grant ata 10', async () => {
      const engine = new TreeEngine(makeTreeWithResources())
      // En nivel 1: o nodo "maldito" require resource_min level 10 → bloqueado.
      let check = engine.canUnlock('maldito')
      expect(check.ok && check.value.allowed).toBe(false)

      // Sobe nivel a 10 paso a paso.
      for (let i = 0; i < 9; i++) {
        await engine.grantResource('level', 1)
      }
      expect(engine.getBudget().resources.level).toBe(10)

      // Agora si: o prereq cúmprese.
      check = engine.canUnlock('maldito')
      expect(check.ok && check.value.allowed).toBe(true)

      // Baixa nivel a 9 → volve a bloquear.
      await engine.grantResource('level', -1)
      check = engine.canUnlock('maldito')
      expect(check.ok && check.value.allowed).toBe(false)
    })
  })
})
// ── FIN: tests grantResource ──
