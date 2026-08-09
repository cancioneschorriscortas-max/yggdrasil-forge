// ── INICIO: tests Logic iconset (7.19, Cambio 1) ──
// Promoción dos 19 LOGIC_ICONS do dono a set oficial. Contrato:
// opt-in (como NORSE), prefixo logic-*, cero colisión cos outros sets.
import { beforeEach, describe, expect, it } from 'vitest'
import { LOGIC_ICONS } from '../src/icons/logic.js'
import { NORSE_ICONS } from '../src/icons/norse.js'
import { BUILTIN_ICONS, getIcon, hasIcon, registerIcons } from '../src/icons/registry.js'

describe('LOGIC_ICONS — contido (7.19)', () => {
  it('contén exactamente 19 iconos', () => {
    expect(Object.keys(LOGIC_ICONS).length).toBe(19)
  })

  it('todos os IDs teñen prefixo "logic-"', () => {
    for (const id of Object.keys(LOGIC_ICONS)) {
      expect(id.startsWith('logic-')).toBe(true)
    }
  })

  it('todos os iconos son stroke 24×24 con d non baleiro (recoloreables)', () => {
    for (const [id, def] of Object.entries(LOGIC_ICONS)) {
      expect(def.viewBox, id).toBe('0 0 24 24')
      expect(def.paths.length, id).toBeGreaterThan(0)
      for (const p of def.paths) {
        expect(p.d.length, id).toBeGreaterThan(0)
        expect(p.mode, id).toBe('stroke')
      }
    }
  })

  it('inclúe os iconos centrais da semántica de prerequisitos', () => {
    const required = [
      'logic-lock',
      'logic-unlock',
      'logic-key',
      'logic-crown',
      'logic-gate',
      'logic-intersect',
      'logic-fork',
      'logic-forbidden',
      'logic-star',
    ]
    for (const id of required) {
      expect(LOGIC_ICONS[id]).toBeDefined()
    }
  })

  it('★ cero colisión: BUILTIN ∩ NORSE ∩ LOGIC = ∅ (par a par)', () => {
    const builtin = new Set(Object.keys(BUILTIN_ICONS))
    const norse = new Set(Object.keys(NORSE_ICONS))
    const logic = new Set(Object.keys(LOGIC_ICONS))
    const intersect = (a: Set<string>, b: Set<string>): string[] => [...a].filter((id) => b.has(id))
    expect(intersect(logic, builtin)).toEqual([])
    expect(intersect(logic, norse)).toEqual([])
    expect(intersect(norse, builtin)).toEqual([])
  })
})

describe('LOGIC_ICONS — opt-in semantics (7.19)', () => {
  beforeEach(() => {
    // Rexistro explícito controlado polo test (contrato opt-in;
    // idempotente — last-write-wins co mesmo data é OK).
    registerIcons(LOGIC_ICONS)
  })

  it('★ tras registerIcons, TODOS os ids resolven via getIcon coa def exacta', () => {
    for (const [id, def] of Object.entries(LOGIC_ICONS)) {
      expect(getIcon(id), id).toEqual(def)
    }
  })

  it('hasIcon devolve true para varios IDs logic', () => {
    expect(hasIcon('logic-key')).toBe(true)
    expect(hasIcon('logic-seedling')).toBe(true)
    expect(hasIcon('logic-forbidden')).toBe(true)
  })

  it('os builtins seguen intactos tras rexistrar logic (sen pisadas)', () => {
    expect(hasIcon('shield')).toBe(true)
    expect(hasIcon('sparkle')).toBe(true)
    // A variante logic convive coa builtin do mesmo concepto.
    expect(hasIcon('logic-sparkle')).toBe(true)
  })
})
// ── FIN: tests Logic iconset ──
