// ── INICIO: tests icon registry (F10.5) ──
import { describe, expect, it } from 'vitest'
// F10.5 fix-tree-shake: BUILTIN_ICONS + auto-rexistro viven en
// registry.ts; builtin.ts re-exporta BUILTIN_ICONS por compatibilidade.
import { BUILTIN_ICONS } from '../src/icons/builtin.js'
import {
  type IconDef,
  getIcon,
  hasIcon,
  registerIcon,
  registerIcons,
} from '../src/icons/registry.js'

describe('icon registry — API básica (F10.5)', () => {
  it('registerIcon + getIcon devolven o mesmo IconDef', () => {
    const def: IconDef = { paths: [{ d: 'M0 0 L10 10' }] }
    registerIcon('test-basic', def)
    expect(getIcon('test-basic')).toBe(def)
  })

  it('hasIcon devolve true para rexistrados, false para non rexistrados', () => {
    registerIcon('test-has', { paths: [{ d: 'M0 0' }] })
    expect(hasIcon('test-has')).toBe(true)
    expect(hasIcon('non-existent-icon-id-12345')).toBe(false)
  })

  it('getIcon de id non rexistrado devolve undefined', () => {
    expect(getIcon('non-existent-icon-id-67890')).toBeUndefined()
  })

  it('registerIcons rexistra múltiples dunha vez', () => {
    registerIcons({
      'multi-a': { paths: [{ d: 'M0 0' }] },
      'multi-b': { paths: [{ d: 'M1 1' }] },
    })
    expect(hasIcon('multi-a')).toBe(true)
    expect(hasIcon('multi-b')).toBe(true)
  })

  it('registerIcon sobrescribe o anterior (último gaña)', () => {
    const v1: IconDef = { paths: [{ d: 'M0 0' }] }
    const v2: IconDef = { paths: [{ d: 'M1 1' }] }
    registerIcon('overwrite', v1)
    registerIcon('overwrite', v2)
    expect(getIcon('overwrite')).toBe(v2)
  })
})

describe('icon registry — builtins auto-rexistrados', () => {
  it.each([['crossed-swords'], ['shield'], ['sparkle'], ['arrow'], ['gem'], ['bolt']])(
    "'%s' está rexistrado dende o módulo builtin",
    (id) => {
      expect(hasIcon(id)).toBe(true)
      const def = getIcon(id)
      expect(def).toBeDefined()
      expect(def?.paths.length).toBeGreaterThan(0)
    },
  )

  it('BUILTIN_ICONS contén todos os IDs do starter', () => {
    expect(Object.keys(BUILTIN_ICONS).sort()).toEqual(
      ['arrow', 'bolt', 'crossed-swords', 'gem', 'shield', 'sparkle'].sort(),
    )
  })
})

describe('icon registry — Symbol.for singleton (A.6.21)', () => {
  it('o rexistro persiste entre múltiples imports (mesma Map global)', () => {
    registerIcon('singleton-marker', { paths: [{ d: 'M5 5' }] })
    // Re-import: aínda que sexa o mesmo módulo no test, isto verifica
    // que o singleton funciona dentro do mesmo bundle. Cross-bundle
    // está garantido polo Symbol.for(globalThis) pattern (mesmo que
    // ThemeContext en A.6.17).
    expect(hasIcon('singleton-marker')).toBe(true)
    expect(getIcon('singleton-marker')?.paths[0]?.d).toBe('M5 5')
  })
})
// ── FIN: tests icon registry ──
