// ── INICIO: tests authorableEffectTypes (★ gate manifesto-descriptor) ──
// O gate (7.5c-ii §4): authorableEffectTypes() coincide co SUPPORTED do
// manifesto e exclúe os UNSUPPORTED (modify_stat/plugin). Iso garante
// que o Inspector (boca) non poida divirxir do motor (conciencia).

import {
  SUPPORTED_EFFECT_TYPES,
  UNSUPPORTED_EFFECT_TYPES,
  supportManifest,
} from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import {
  authorableEffectTypes,
  authorablePlainEffectTypes,
  isPlainAuthorableEffectType,
} from '../src/index.js'

describe('★ Gate manifesto-descriptor: authorableEffectTypes', () => {
  it('coincide EXACTAMENTE co SUPPORTED_EFFECT_TYPES do manifesto', () => {
    const authorable = new Set(authorableEffectTypes())
    const supported = new Set(SUPPORTED_EFFECT_TYPES)
    expect(authorable).toEqual(supported)
  })

  it('EXCLÚE modify_stat (UNSUPPORTED)', () => {
    const authorable = authorableEffectTypes()
    expect(authorable).not.toContain('modify_stat')
  })

  it('EXCLÚE plugin (UNSUPPORTED)', () => {
    const authorable = authorableEffectTypes()
    expect(authorable).not.toContain('plugin')
  })

  it('garante que ningún UNSUPPORTED aparece na lista autorable', () => {
    const authorable = new Set(authorableEffectTypes())
    for (const u of UNSUPPORTED_EFFECT_TYPES) {
      expect(authorable.has(u)).toBe(false)
    }
  })

  it('cada autorable está marcado supported no manifesto', () => {
    for (const t of authorableEffectTypes()) {
      // Cada SupportEntry é {stable: true} cando soportado; basta con
      // verificar que existe e ten stable:true.
      expect(supportManifest.effects[t]?.stable).toBe(true)
    }
  })
})

describe('authorablePlainEffectTypes — exclúe aniñados', () => {
  it('non inclúe composite', () => {
    expect(authorablePlainEffectTypes()).not.toContain('composite')
  })

  it('non inclúe conditional', () => {
    expect(authorablePlainEffectTypes()).not.toContain('conditional')
  })

  it('SÍ inclúe modify_resource, unlock_node, set_progress, etc.', () => {
    const plain = authorablePlainEffectTypes()
    for (const expected of [
      'modify_resource',
      'modify_node_state',
      'set_node_visibility',
      'unlock_node',
      'set_progress',
      'trigger_event',
    ]) {
      expect(plain).toContain(expected)
    }
  })

  it('tamén exclúe modify_stat/plugin', () => {
    const plain = authorablePlainEffectTypes()
    expect(plain).not.toContain('modify_stat')
    expect(plain).not.toContain('plugin')
  })
})

describe('isPlainAuthorableEffectType', () => {
  it('true para modify_resource', () => {
    expect(isPlainAuthorableEffectType('modify_resource')).toBe(true)
  })

  it('false para composite (aniñado)', () => {
    expect(isPlainAuthorableEffectType('composite')).toBe(false)
  })

  it('false para conditional (aniñado)', () => {
    expect(isPlainAuthorableEffectType('conditional')).toBe(false)
  })

  it('false para modify_stat (UNSUPPORTED)', () => {
    expect(isPlainAuthorableEffectType('modify_stat')).toBe(false)
  })

  it('false para tipo descoñecido', () => {
    expect(isPlainAuthorableEffectType('invented_type')).toBe(false)
  })
})
// ── FIN: tests authorableEffectTypes ──
