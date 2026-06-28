// ── INICIO: tests inspector/logic (puro) ──
import { describe, expect, it } from 'vitest'
import { badgeKind, badgeText, tierRowsFor } from '../../src/inspector/logic.js'

describe('inspector/logic — tierRowsFor', () => {
  it('ct=0 sobre 3: NIVEL 1 actual, 2-3 bloqueados', () => {
    expect(tierRowsFor(0, 3)).toEqual([
      { tier: 1, state: 'actual' },
      { tier: 2, state: 'bloqueado' },
      { tier: 3, state: 'bloqueado' },
    ])
  })

  it('ct=1 sobre 3: 1 completado, 2 actual, 3 bloqueado', () => {
    expect(tierRowsFor(1, 3)).toEqual([
      { tier: 1, state: 'completado' },
      { tier: 2, state: 'actual' },
      { tier: 3, state: 'bloqueado' },
    ])
  })

  it('ct=2 sobre 3: 1-2 completados, 3 actual', () => {
    expect(tierRowsFor(2, 3)).toEqual([
      { tier: 1, state: 'completado' },
      { tier: 2, state: 'completado' },
      { tier: 3, state: 'actual' },
    ])
  })

  it('ct=maxTier (3,3): todas completado', () => {
    expect(tierRowsFor(3, 3).every((r) => r.state === 'completado')).toBe(true)
  })

  it('maxTier=1: ct=0 → 1 actual, ct=1 → 1 completado', () => {
    expect(tierRowsFor(0, 1)).toEqual([{ tier: 1, state: 'actual' }])
    expect(tierRowsFor(1, 1)).toEqual([{ tier: 1, state: 'completado' }])
  })
})

describe('inspector/logic — badgeKind/badgeText', () => {
  it('badgeKind: progress mentres ct < maxTier; maxed cando ct >= maxTier', () => {
    expect(badgeKind(0, 3)).toBe('progress')
    expect(badgeKind(1, 3)).toBe('progress')
    expect(badgeKind(2, 3)).toBe('progress')
    expect(badgeKind(3, 3)).toBe('maxed')
  })

  it('badgeText (galego compat): formato NIVEL X DE Y / · MÁXIMO', () => {
    expect(badgeText(0, 3)).toBe('NIVEL 1 DE 3')
    expect(badgeText(2, 3)).toBe('NIVEL 3 DE 3')
    expect(badgeText(3, 3)).toBe('NIVEL 3 DE 3 · MÁXIMO')
  })
})
// ── FIN: tests inspector/logic ──
