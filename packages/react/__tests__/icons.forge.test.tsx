// ── INICIO: tests Forge iconset (17.1) ──
import { beforeEach, describe, expect, it } from 'vitest'
import { FORGE_ICONS } from '../src/icons/forge.js'
import { getIcon, hasIcon, registerIcons } from '../src/icons/registry.js'

describe('FORGE_ICONS — contido (17.1)', () => {
  it('contén 25 iconos', () => {
    expect(Object.keys(FORGE_ICONS).length).toBe(25)
  })

  it('todos os IDs teñen prefixo "forge-"', () => {
    for (const id of Object.keys(FORGE_ICONS)) {
      expect(id.startsWith('forge-')).toBe(true)
    }
  })

  it('todos os iconos son stroke 24×24 cun path non baleiro', () => {
    for (const def of Object.values(FORGE_ICONS)) {
      expect(def.viewBox).toBe('0 0 24 24')
      expect(def.paths.length).toBeGreaterThan(0)
      for (const p of def.paths) {
        expect(p.mode).toBe('stroke')
        expect(p.d.length).toBeGreaterThan(0)
      }
    }
  })

  it('as coordenadas caben no lenzo 24×24 (guarda da conversión 64→24)', () => {
    // Os orixinais son 64×64; unha coordenada sen escalar (>24 en
    // valor absoluto) delataría un erro do conversor. Os flags dos
    // arcos (0/1) e as rotacións (0) caen dentro do rango de seu.
    for (const [id, def] of Object.entries(FORGE_ICONS)) {
      for (const p of def.paths) {
        const numbers = (p.d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
        for (const n of numbers) {
          expect(Math.abs(n), `${id}: ${String(n)} fóra do lenzo`).toBeLessThanOrEqual(24)
        }
      }
    }
  })

  it('inclúe as iconas centrais do set (a tuerca e o oficio)', () => {
    const required = [
      'forge-nut',
      'forge-wrench',
      'forge-crosshair',
      'forge-cart',
      'forge-revive',
      'forge-assembly',
    ]
    for (const id of required) {
      expect(FORGE_ICONS[id]).toBeDefined()
    }
  })
})

describe('FORGE_ICONS — opt-in semantics (17.1)', () => {
  // Mesmo contrato ca NORSE/LOGIC: NON auto-rexistro; o consumidor
  // chama registerIcons(FORGE_ICONS) explicitamente.

  beforeEach(() => {
    registerIcons(FORGE_ICONS)
  })

  it('tras registerIcons(FORGE_ICONS), getIcon devolve a def correcta', () => {
    const def = getIcon('forge-nut')
    expect(def).toBeDefined()
    expect(def?.paths[0]?.d).toContain('M12 2.25')
  })

  it('hasIcon confirma o rexistro do set enteiro', () => {
    for (const id of Object.keys(FORGE_ICONS)) {
      expect(hasIcon(id)).toBe(true)
    }
  })
})
// ── FIN: tests Forge iconset ──
