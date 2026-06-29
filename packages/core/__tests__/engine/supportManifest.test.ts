// ── INICIO: gate de drift manifesto ↔ runtime ──
// Garantía: o manifesto e o runtime non poden divirxir.
//
// Tres capas de garantía:
//   1. Type-test exhaustivo en compilación (en supportManifest.ts):
//      SUPPORTED_* ∪ UNSUPPORTED_* === Effect['type']. Engadir un kind
//      á unión sen clasificalo rompe a compilación.
//   2. Comportamento: cada effect type listado como soportado NON
//      devolve EFFECT_TYPE_UNSUPPORTED no runtime; cada un listado
//      como non soportado SI o devolve.
//   3. Coherencia: o manifesto público (`supportManifest.effects`)
//      contén exactamente os SUPPORTED_EFFECT_TYPES, e
//      `supportManifest.conditions` contén exactamente os
//      SUPPORTED_CONDITION_TYPES.

import { describe, expect, it } from 'vitest'
import {
  SUPPORTED_CONDITION_TYPES,
  SUPPORTED_EFFECT_TYPES,
  UNSUPPORTED_EFFECT_TYPES,
  isConditionSupported,
  isEffectSupported,
  isEffectUnsupported,
  supportManifest,
} from '../../src/engine/supportManifest.js'

describe('supportManifest — coherencia interna', () => {
  it('SUPPORTED_EFFECT_TYPES e UNSUPPORTED_EFFECT_TYPES non se solapan', () => {
    const supported = new Set<string>(SUPPORTED_EFFECT_TYPES)
    for (const u of UNSUPPORTED_EFFECT_TYPES) {
      expect(supported.has(u)).toBe(false)
    }
  })

  it('supportManifest.effects contén exactamente os SUPPORTED_EFFECT_TYPES', () => {
    const keys = Object.keys(supportManifest.effects).sort()
    const expected = [...SUPPORTED_EFFECT_TYPES].sort()
    expect(keys).toEqual(expected)
  })

  it('supportManifest.conditions contén exactamente os SUPPORTED_CONDITION_TYPES', () => {
    const keys = Object.keys(supportManifest.conditions).sort()
    const expected = [...SUPPORTED_CONDITION_TYPES].sort()
    expect(keys).toEqual(expected)
  })

  it('predicates: isEffectSupported / isEffectUnsupported son consistentes', () => {
    for (const e of SUPPORTED_EFFECT_TYPES) {
      expect(isEffectSupported(e)).toBe(true)
      expect(isEffectUnsupported(e)).toBe(false)
    }
    for (const e of UNSUPPORTED_EFFECT_TYPES) {
      expect(isEffectSupported(e)).toBe(false)
      expect(isEffectUnsupported(e)).toBe(true)
    }
    // Tipo descoñecido: false en ambos.
    expect(isEffectSupported('totally_made_up')).toBe(false)
    expect(isEffectUnsupported('totally_made_up')).toBe(false)
  })

  it('predicate: isConditionSupported recoñece todas as condicións do resolver', () => {
    for (const c of SUPPORTED_CONDITION_TYPES) {
      expect(isConditionSupported(c)).toBe(true)
    }
    expect(isConditionSupported('totally_made_up')).toBe(false)
  })

  it('supportManifest.coreVersion é semver-ish', () => {
    expect(supportManifest.coreVersion).toMatch(/^\d+\.\d+\.\d+/)
  })
})
// ── FIN: gate de drift ──
