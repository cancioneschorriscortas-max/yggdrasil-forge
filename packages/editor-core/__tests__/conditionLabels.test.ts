// ── INICIO: tests authorableConditionTypes + conditionLabels ──
// Verifica o **gate condition↔manifesto** e a **cobertura de labels**
// (Briefing 7.5c-ii fase 2 §1 + §2). Espello dos testes do gate de
// efectos + mapa NODE_TYPE_LABELS.

import { SUPPORTED_CONDITION_TYPES } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import {
  CONDITION_TYPE_LABELS,
  NODE_STATE_LABELS,
  RULE_COMBINATOR_LABELS,
  authorableConditionTypes,
  getCombinatorDescribe,
  getCombinatorLabel,
  getConditionParams,
  getConditionTypeDescribe,
  getConditionTypeLabel,
  getNodeStateLabel,
  isAuthorableConditionType,
} from '../src/index.js'

describe('★ Gate authorableConditionTypes (7.5c-ii fase 2 §1)', () => {
  it('coincide con SUPPORTED_CONDITION_TYPES (fonte única)', () => {
    const auth = new Set(authorableConditionTypes())
    const supported = new Set(SUPPORTED_CONDITION_TYPES)
    expect(auth).toEqual(supported)
  })

  it('inclúe as 14 condicións (todas soportadas)', () => {
    expect(authorableConditionTypes().length).toBe(14)
  })

  it('inclúe custom (marcado como avanzado, pero autorable)', () => {
    expect(authorableConditionTypes()).toContain('custom')
    expect(isAuthorableConditionType('custom')).toBe(true)
  })

  it('inclúe as condicións máis comúns', () => {
    for (const t of ['node_unlocked', 'resource_min', 'tier_min', 'node_state']) {
      expect(authorableConditionTypes()).toContain(t)
    }
  })

  it('isAuthorableConditionType: valor descoñecido → false', () => {
    expect(isAuthorableConditionType('invented')).toBe(false)
  })
})

describe('★ Cobertura de labels CONDITION_TYPE_LABELS (7.5c-ii fase 2 §2)', () => {
  it('cobre TODAS as condicións de SUPPORTED_CONDITION_TYPES', () => {
    for (const t of SUPPORTED_CONDITION_TYPES) {
      expect(CONDITION_TYPE_LABELS[t]).toBeDefined()
      expect(CONDITION_TYPE_LABELS[t].label).toBeDefined()
      expect(CONDITION_TYPE_LABELS[t].describe).toBeDefined()
      expect(CONDITION_TYPE_LABELS[t].params).toBeDefined()
    }
  })

  it('cada condición ten label gl', () => {
    for (const t of SUPPORTED_CONDITION_TYPES) {
      const lbl = CONDITION_TYPE_LABELS[t].label
      const gl = typeof lbl === 'object' ? lbl.gl : lbl
      expect(gl).toBeDefined()
    }
  })

  it('cada condición ten describe gl (help curta)', () => {
    for (const t of SUPPORTED_CONDITION_TYPES) {
      const desc = CONDITION_TYPE_LABELS[t].describe
      const gl = typeof desc === 'object' ? desc.gl : desc
      expect(gl).toBeDefined()
    }
  })

  it('node_unlocked ten label gl "Nodo desbloqueado"', () => {
    expect(getConditionTypeLabel('node_unlocked')).toBe('Nodo desbloqueado')
  })

  it('resource_min ten label gl "Recurso mínimo"', () => {
    expect(getConditionTypeLabel('resource_min')).toBe('Recurso mínimo')
  })

  it('custom label gl con "avanzado" no describe', () => {
    const desc = getConditionTypeDescribe('custom')
    expect(desc).toContain('avanzado')
  })

  it('getConditionTypeLabel: fallback a valor cru en descoñecido', () => {
    expect(getConditionTypeLabel('invented_type')).toBe('invented_type')
  })
})

describe('★ Cobertura de params (spec de mini-formularios)', () => {
  it('node_unlocked ten un só param nodeId', () => {
    const params = getConditionParams('node_unlocked')
    expect(params.length).toBe(1)
    expect(params[0]?.key).toBe('nodeId')
    expect(params[0]?.kind).toBe('nodeId')
  })

  it('resource_min ten resourceId + amount', () => {
    const params = getConditionParams('resource_min')
    expect(params.map((p) => p.key)).toEqual(['resourceId', 'amount'])
    expect(params.map((p) => p.kind)).toEqual(['resourceId', 'number'])
  })

  it('node_state ten nodeId + state', () => {
    const params = getConditionParams('node_state')
    expect(params.map((p) => p.key)).toEqual(['nodeId', 'state'])
    expect(params[1]?.kind).toBe('nodeState')
  })

  it('nodes_count ten count + scope opcional', () => {
    const params = getConditionParams('nodes_count')
    expect(params.map((p) => p.key)).toEqual(['count', 'scope'])
    expect(params[1]?.optional).toBe(true)
  })

  it('time_after ten timestamp', () => {
    const params = getConditionParams('time_after')
    expect(params[0]?.kind).toBe('timestamp')
  })

  it('custom ten evaluator (código)', () => {
    const params = getConditionParams('custom')
    expect(params[0]?.key).toBe('evaluator')
    expect(params[0]?.kind).toBe('code')
  })

  it('descoñecido devolve array baleiro', () => {
    expect(getConditionParams('invented')).toEqual([])
  })
})

describe('★ Combinadores UnlockRule (Todas / Algunha / Ningunha)', () => {
  it('RULE_COMBINATOR_LABELS ten os tres', () => {
    expect(RULE_COMBINATOR_LABELS.all).toBeDefined()
    expect(RULE_COMBINATOR_LABELS.any).toBeDefined()
    expect(RULE_COMBINATOR_LABELS.none).toBeDefined()
  })

  it('all → "Todas"', () => {
    expect(getCombinatorLabel('all')).toBe('Todas')
  })

  it('any → "Algunha"', () => {
    expect(getCombinatorLabel('any')).toBe('Algunha')
  })

  it('none → "Ningunha"', () => {
    expect(getCombinatorLabel('none')).toBe('Ningunha')
  })

  it('cada combinador ten describe gl', () => {
    for (const c of ['all', 'any', 'none'] as const) {
      const d = getCombinatorDescribe(c)
      expect(d).toBeDefined()
      expect(d?.length).toBeGreaterThan(3)
    }
  })

  it('all describe menciona "E" (AND)', () => {
    expect(getCombinatorDescribe('all')).toContain('E')
  })

  it('none describe menciona "bloquea"', () => {
    expect(getCombinatorDescribe('none')).toContain('bloquea')
  })
})

describe('NodeState localizado (para node_state)', () => {
  it('NODE_STATE_LABELS cobre os 7 valores de NodeState', () => {
    const keys = Object.keys(NODE_STATE_LABELS)
    expect(keys.length).toBe(7)
    for (const s of [
      'locked',
      'unlockable',
      'in_progress',
      'unlocked',
      'maxed',
      'disabled',
      'expired',
    ]) {
      expect(NODE_STATE_LABELS[s as never]).toBeDefined()
    }
  })

  it('locked → "Bloqueado"', () => {
    expect(getNodeStateLabel('locked')).toBe('Bloqueado')
  })

  it('unlocked → "Desbloqueado"', () => {
    expect(getNodeStateLabel('unlocked')).toBe('Desbloqueado')
  })

  it('in_progress → "En progreso"', () => {
    expect(getNodeStateLabel('in_progress')).toBe('En progreso')
  })
})
// ── FIN: tests ──
