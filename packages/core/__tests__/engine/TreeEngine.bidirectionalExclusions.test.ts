// ── INICIO: tests bidirectional exclusions (BUGFIX A.6.30) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

/**
 * TreeDef mínimo onde **só A declara `exclusions: ['B']`**. B non
 * declara nada. Iso era o trigger do BUG: pre-fix podían coexistir.
 */
function makeAsymmetricExclusionTree(): TreeDef {
  return {
    id: 'excl-bidir',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Excl bidir',
    rootNodeId: 'a',
    resources: [{ id: 'pts', label: 'Pts', initial: 10, max: 10 }],
    startingBudget: { resources: { pts: 10 } },
    layout: { type: 'custom' },
    nodes: [
      {
        id: 'a',
        type: 'small',
        maxTier: 1,
        label: 'A',
        position: { x: 0, y: 0 },
        cost: [{ resourceId: 'pts', amount: 1 }],
        exclusions: ['b'],
      },
      {
        id: 'b',
        type: 'small',
        maxTier: 1,
        label: 'B',
        position: { x: 50, y: 0 },
        cost: [{ resourceId: 'pts', amount: 1 }],
        // Sen exclusions declaradas. A simetría debe vir do índice inverso.
      },
      // Nodo sen relacións de exclusión, para verificar non-falso-positivo.
      {
        id: 'c',
        type: 'small',
        maxTier: 1,
        label: 'C',
        position: { x: 100, y: 0 },
        cost: [{ resourceId: 'pts', amount: 1 }],
      },
    ],
    edges: [],
  }
}

describe('Exclusións bidireccionais (BUGFIX A.6.30)', () => {
  describe('canUnlock — simetría', () => {
    it('Camiño A (A primeiro → B): B bloqueado (xa funcionaba antes)', async () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      await engine.unlock('a')
      const check = engine.canUnlock('b')
      expect(check.ok).toBe(true)
      if (check.ok) {
        expect(check.value.allowed).toBe(false)
      }
    })

    it('Camiño B (B primeiro → A): A bloqueado (era o BUG: pre-fix devolvía allowed=true)', async () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      await engine.unlock('b')
      const check = engine.canUnlock('a')
      expect(check.ok).toBe(true)
      if (check.ok) {
        expect(check.value.allowed).toBe(false)
        // O conflito reportado é 'b' (o nodo activo que entra en colisión).
        expect(check.value.reason).toContain('b')
      }
    })

    it('Sen ningún excluinte activo: ambos canUnlock = allowed', () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      const ca = engine.canUnlock('a')
      const cb = engine.canUnlock('b')
      expect(ca.ok && ca.value.allowed).toBe(true)
      expect(cb.ok && cb.value.allowed).toBe(true)
    })
  })

  describe('unlock — mesma lóxica que canUnlock (helper único)', () => {
    it('Camiño B vía unlock: tras unlock(B), unlock(A) devolve err EXCLUSION_VIOLATION', async () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      const r1 = await engine.unlock('b')
      expect(r1.ok).toBe(true)
      const r2 = await engine.unlock('a')
      expect(r2.ok).toBe(false)
      if (!r2.ok) {
        expect(r2.error.code).toBe(ErrorCode.EXCLUSION_VIOLATION)
      }
      // Estado final: B unlocked, A NON debe estar tocado.
      expect(engine.getNodeState('a')?.state ?? 'locked').toBe('locked')
      expect(engine.getNodeState('b')?.state).toBe('maxed')
    })

    it('Camiño A vía unlock: tras unlock(A), unlock(B) devolve err', async () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      await engine.unlock('a')
      const r = await engine.unlock('b')
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.error.code).toBe(ErrorCode.EXCLUSION_VIOLATION)
      }
    })
  })

  describe('getEffectiveExclusions', () => {
    it('devolve as exclusións declaradas no propio nodo', () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      expect(engine.getEffectiveExclusions('a')).toEqual(['b'])
    })

    it('devolve as exclusións inversas (B é excluído por A)', () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      expect(engine.getEffectiveExclusions('b')).toEqual(['a'])
    })

    it('nodo sen exclusións nin excluído por ninguén → array baleiro', () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      expect(engine.getEffectiveExclusions('c')).toEqual([])
    })

    it('nodo inexistente → array baleiro (defensivo)', () => {
      const engine = new TreeEngine(makeAsymmetricExclusionTree())
      expect(engine.getEffectiveExclusions('ghost')).toEqual([])
    })

    it('dedupa cando un nodo aparece tanto directo coma inverso', () => {
      // TreeDef onde A exclúe B E B exclúe A (declaración redundante).
      const td: TreeDef = {
        id: 'dedup',
        schemaVersion: '1.0.0',
        version: '0.0.0',
        label: 'Dedup',
        rootNodeId: 'a',
        resources: [{ id: 'pts', label: 'Pts', initial: 10, max: 10 }],
        startingBudget: { resources: { pts: 10 } },
        layout: { type: 'custom' },
        nodes: [
          {
            id: 'a',
            type: 'small',
            maxTier: 1,
            label: 'A',
            position: { x: 0, y: 0 },
            cost: [{ resourceId: 'pts', amount: 1 }],
            exclusions: ['b'],
          },
          {
            id: 'b',
            type: 'small',
            maxTier: 1,
            label: 'B',
            position: { x: 50, y: 0 },
            cost: [{ resourceId: 'pts', amount: 1 }],
            exclusions: ['a'],
          },
        ],
        edges: [],
      }
      const engine = new TreeEngine(td)
      // Cada nodo aparece unha soa vez no resultado, non dúas.
      expect(engine.getEffectiveExclusions('a')).toEqual(['b'])
      expect(engine.getEffectiveExclusions('b')).toEqual(['a'])
    })
  })

  describe('regresión: exclusión múltiple', () => {
    it('A exclúe B e C; con B unlocked, A bloqueado co conflictId=B', async () => {
      const td: TreeDef = {
        id: 'multi',
        schemaVersion: '1.0.0',
        version: '0.0.0',
        label: 'Multi',
        rootNodeId: 'a',
        resources: [{ id: 'pts', label: 'Pts', initial: 10, max: 10 }],
        startingBudget: { resources: { pts: 10 } },
        layout: { type: 'custom' },
        nodes: [
          {
            id: 'a',
            type: 'small',
            maxTier: 1,
            label: 'A',
            position: { x: 0, y: 0 },
            cost: [{ resourceId: 'pts', amount: 1 }],
            exclusions: ['b', 'c'],
          },
          {
            id: 'b',
            type: 'small',
            maxTier: 1,
            label: 'B',
            position: { x: 50, y: 0 },
            cost: [{ resourceId: 'pts', amount: 1 }],
          },
          {
            id: 'c',
            type: 'small',
            maxTier: 1,
            label: 'C',
            position: { x: 100, y: 0 },
            cost: [{ resourceId: 'pts', amount: 1 }],
          },
        ],
        edges: [],
      }
      const engine = new TreeEngine(td)
      await engine.unlock('b')
      // B inverso a A → A bloqueado.
      const check = engine.canUnlock('a')
      expect(check.ok && check.value.allowed).toBe(false)
      // E inversamente: A excluiría C tamén, pero como A non está
      // activo, C segue desbloqueable.
      const checkC = engine.canUnlock('c')
      expect(checkC.ok && checkC.value.allowed).toBe(true)
    })
  })
})
// ── FIN: tests bidirectional exclusions ──
