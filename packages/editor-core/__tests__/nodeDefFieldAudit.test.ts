// ── INICIO: tests nodeDefFieldAudit (7.5c-T + 7.5c-T2) ──
// Verifica o gate arquitectural que obriga a clasificar cada campo
// de NodeDef en UN de tres estados: USED / UNIMPLEMENTED /
// DEPRECATED. O type-test principal xa está en nodeDefFieldAudit.ts
// (compile-time); estes tests engaden garantías runtime sobre a
// estrutura das tuplas.

import { describe, expect, it } from 'vitest'
import {
  DEPRECATED_NODEDEF_FIELDS,
  UNIMPLEMENTED_NODEDEF_FIELDS,
  USED_NODEDEF_FIELDS,
} from '../src/property/nodeDefFieldAudit.js'

describe('★ Gate auditoría dead-code de NodeDef — tres estados (7.5c-T2)', () => {
  it('as tuplas non se solapan (un campo pertence a UN só estado)', () => {
    const used = new Set(USED_NODEDEF_FIELDS)
    const unimplemented = new Set(UNIMPLEMENTED_NODEDEF_FIELDS)
    const deprecated = new Set(DEPRECATED_NODEDEF_FIELDS)

    // USED ∩ UNIMPLEMENTED = ∅
    for (const u of unimplemented) {
      expect(used.has(u as never)).toBe(false)
    }
    // USED ∩ DEPRECATED = ∅
    for (const d of deprecated) {
      expect(used.has(d as never)).toBe(false)
    }
    // UNIMPLEMENTED ∩ DEPRECATED = ∅
    for (const d of deprecated) {
      expect(unimplemented.has(d as never)).toBe(false)
    }
  })

  it('★ tier está en DEPRECATED (retirado do Inspector en 7.5c-T)', () => {
    expect(DEPRECATED_NODEDEF_FIELDS as readonly string[]).toContain('tier')
  })

  it('★ tiers está en UNIMPLEMENTED (F9.1 declarada, non implementada; 7.5c-T2)', () => {
    expect(UNIMPLEMENTED_NODEDEF_FIELDS as readonly string[]).toContain('tiers')
    // Non pode estar en USED nin DEPRECATED.
    expect(USED_NODEDEF_FIELDS as readonly string[]).not.toContain('tiers')
    expect(DEPRECATED_NODEDEF_FIELDS as readonly string[]).not.toContain('tiers')
  })

  it('maxTier está en USED (usado polo runtime para o estado maxed)', () => {
    expect(USED_NODEDEF_FIELDS as readonly string[]).toContain('maxTier')
  })

  it('costPerTier está en USED (ResourceManager.ts:116)', () => {
    expect(USED_NODEDEF_FIELDS as readonly string[]).toContain('costPerTier')
  })

  it('id está en USED (foundational)', () => {
    expect(USED_NODEDEF_FIELDS as readonly string[]).toContain('id')
  })

  it('nas tuplas non hai duplicados', () => {
    expect(new Set(USED_NODEDEF_FIELDS).size).toBe(USED_NODEDEF_FIELDS.length)
    expect(new Set(UNIMPLEMENTED_NODEDEF_FIELDS).size).toBe(UNIMPLEMENTED_NODEDEF_FIELDS.length)
    expect(new Set(DEPRECATED_NODEDEF_FIELDS).size).toBe(DEPRECATED_NODEDEF_FIELDS.length)
  })
})

describe('★ Paralelismo co manifesto de effects (7.5c-T2)', () => {
  it('a filosofía é a mesma: UNIMPLEMENTED_NODEDEF_FIELDS é aos campos o que UNSUPPORTED_EFFECT_TYPES é aos efectos', () => {
    // Este test é documental — non hai que testar código, senón que
    // a existencia da tupla UNIMPLEMENTED enuncia o paralelismo. Se
    // desapareceu, algo se rompeu.
    expect(Array.isArray(UNIMPLEMENTED_NODEDEF_FIELDS)).toBe(true)
    expect(UNIMPLEMENTED_NODEDEF_FIELDS.length).toBeGreaterThan(0)
  })
})
// ── FIN: tests nodeDefFieldAudit ──
