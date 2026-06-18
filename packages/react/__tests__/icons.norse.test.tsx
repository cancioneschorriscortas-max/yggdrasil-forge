// ── INICIO: tests Norse iconset (F10.5b) ──
import { beforeEach, describe, expect, it } from 'vitest'
import { NORSE_ICONS } from '../src/icons/norse.js'
import { getIcon, hasIcon, registerIcons } from '../src/icons/registry.js'

describe('NORSE_ICONS — contido (F10.5b)', () => {
  it('contén 26 iconos', () => {
    expect(Object.keys(NORSE_ICONS).length).toBe(26)
  })

  it('todos os IDs teñen prefixo "norse-"', () => {
    for (const id of Object.keys(NORSE_ICONS)) {
      expect(id.startsWith('norse-')).toBe(true)
    }
  })

  it('todos os iconos teñen polo menos un path con d non baleiro', () => {
    for (const def of Object.values(NORSE_ICONS)) {
      expect(def.paths.length).toBeGreaterThan(0)
      for (const p of def.paths) {
        expect(p.d.length).toBeGreaterThan(0)
      }
    }
  })

  it('inclúe os iconos centrais do branding Yggdrasil', () => {
    const required = [
      'norse-world-tree',
      'norse-mjolnir',
      'norse-rune-fehu',
      'norse-rune-algiz',
      'norse-rune-tiwaz',
      'norse-rune-sowilo',
      'norse-wolf',
      'norse-raven',
      'norse-triquetra',
    ]
    for (const id of required) {
      expect(NORSE_ICONS[id]).toBeDefined()
    }
  })
})

describe('NORSE_ICONS — opt-in semantics (F10.5b)', () => {
  // O test asume que NORSE_ICONS NON se rexistra automaticamente.
  // Iso é o contrato — non auto-rexistro. O test importa antes do
  // beforeEach para garantir que se faga só un side-effect (rexistro
  // explícito controlado polo test).

  beforeEach(() => {
    // Cada test parte dun estado coherente: rexistramos
    // NORSE_ICONS antes do test, e o registry singleton mantén o
    // estado. Idempotente (last-write-wins é OK para o mesmo data).
    registerIcons(NORSE_ICONS)
  })

  it('tras registerIcons(NORSE_ICONS), getIcon devolve a def correcta', () => {
    const def = getIcon('norse-mjolnir')
    expect(def).toBeDefined()
    expect(def?.paths[0]?.d).toContain('M8 6H16V10')
  })

  it('hasIcon devolve true para varios IDs norse', () => {
    expect(hasIcon('norse-world-tree')).toBe(true)
    expect(hasIcon('norse-odin-eye')).toBe(true)
    expect(hasIcon('norse-triquetra')).toBe(true)
  })

  it('os builtins simples seguen sen ser tocados (sen colisión)', () => {
    // Verifica que NORSE_ICONS non sobrescribe os builtins do mesmo
    // concepto ('shield', 'sword', 'sparkle'); o prefixo norse- evita
    // colisións.
    expect(hasIcon('shield')).toBe(true) // builtin
    expect(hasIcon('sword')).toBe(false) // builtin NON existe (sword non era un builtin)
    expect(hasIcon('sparkle')).toBe(true) // builtin
    expect(hasIcon('norse-shield')).toBe(true) // norse-versión
    expect(hasIcon('norse-sparkle')).toBe(true) // norse-versión
  })
})
// ── FIN: tests Norse iconset ──
