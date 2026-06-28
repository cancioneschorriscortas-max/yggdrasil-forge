// ── INICIO: tests cluster/logic (puro) ──
import { describe, expect, it } from 'vitest'
import { rowBadge, rowState } from '../../src/cluster/logic.js'

describe('cluster/logic — rowState', () => {
  it('locked: currentTier === 0', () => {
    expect(rowState(0, 3)).toBe('locked')
    expect(rowState(0, 1)).toBe('locked')
  })
  it('actual: 0 < currentTier < maxTier', () => {
    expect(rowState(1, 3)).toBe('actual')
    expect(rowState(2, 3)).toBe('actual')
  })
  it('done: currentTier >= maxTier (con maxTier > 0)', () => {
    expect(rowState(3, 3)).toBe('done')
    expect(rowState(1, 1)).toBe('done')
  })
  it('maxTier=0: nunca dá done', () => {
    expect(rowState(0, 0)).toBe('locked')
    expect(rowState(1, 0)).toBe('actual')
  })
})

describe('cluster/logic — rowBadge', () => {
  it('formato ct/mt cando non está no máximo', () => {
    expect(rowBadge(0, 3)).toBe('0/3')
    expect(rowBadge(1, 3)).toBe('1/3')
    expect(rowBadge(2, 3)).toBe('2/3')
  })
  it('marca ✓ no máximo', () => {
    expect(rowBadge(3, 3)).toBe('✓')
    expect(rowBadge(1, 1)).toBe('✓')
  })
  it('maxTier=0: 0/0 (non hai concepto de máximo alcanzable)', () => {
    expect(rowBadge(0, 0)).toBe('0/0')
  })
})
// ── FIN: tests cluster/logic ──
