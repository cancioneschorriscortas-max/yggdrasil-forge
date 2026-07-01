// ── INICIO: tests nodeDefFieldAudit (7.5c-T §3) ──
// Verifica o gate arquitectural que obriga a clasificar cada campo
// de NodeDef como usado/deprecado. O type-test principal xa está en
// nodeDefFieldAudit.ts (compile-time); estes tests engaden garantías
// runtime sobre a estrutura das tuplas.

import { describe, expect, it } from 'vitest'
import {
  DEPRECATED_NODEDEF_FIELDS,
  USED_NODEDEF_FIELDS,
} from '../src/property/nodeDefFieldAudit.js'

describe('★ Gate auditoría dead-code de NodeDef (7.5c-T §3)', () => {
  it('as tuplas non se solapan (un campo é usado OU deprecado, non as dúas)', () => {
    const used = new Set(USED_NODEDEF_FIELDS)
    for (const dep of DEPRECATED_NODEDEF_FIELDS) {
      expect(used.has(dep as never)).toBe(false)
    }
  })

  it('tier está en DEPRECATED (retirado do Inspector en 7.5c-T)', () => {
    expect(DEPRECATED_NODEDEF_FIELDS as readonly string[]).toContain('tier')
  })

  it('maxTier está en USED (usado polo runtime para o estado maxed)', () => {
    expect(USED_NODEDEF_FIELDS as readonly string[]).toContain('maxTier')
  })

  it('id está en USED (foundational)', () => {
    expect(USED_NODEDEF_FIELDS as readonly string[]).toContain('id')
  })

  it('nas tuplas non hai duplicados', () => {
    expect(new Set(USED_NODEDEF_FIELDS).size).toBe(USED_NODEDEF_FIELDS.length)
    expect(new Set(DEPRECATED_NODEDEF_FIELDS).size).toBe(DEPRECATED_NODEDEF_FIELDS.length)
  })
})
// ── FIN: tests nodeDefFieldAudit ──
