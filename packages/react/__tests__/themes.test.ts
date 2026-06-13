// ── INICIO: tests themes ──
import { describe, expect, it } from 'vitest'
import { minimal } from '../src/themes/minimal.js'

describe('minimal theme', () => {
  it('ten os tokens requeridos de colors', () => {
    expect(minimal.colors.text).toBeDefined()
    expect(minimal.colors.nodeLocked).toBeDefined()
    expect(minimal.colors.nodeUnlockable).toBeDefined()
    expect(minimal.colors.nodeUnlocked).toBeDefined()
    expect(minimal.colors.nodeMaxed).toBeDefined()
    expect(minimal.colors.nodeInProgress).toBeDefined()
    expect(minimal.colors.nodeStroke).toBeDefined()
    expect(minimal.colors.edge).toBeDefined()
    expect(minimal.colors.mesh).toBeDefined()
  })

  it('background é undefined (cero fondo por defecto)', () => {
    expect(minimal.colors.background).toBeUndefined()
  })

  it('sizes ten strokeWidth, fontSize e fontSizeSmall como números', () => {
    expect(typeof minimal.sizes.strokeWidth).toBe('number')
    expect(typeof minimal.sizes.fontSize).toBe('number')
    expect(typeof minimal.sizes.fontSizeSmall).toBe('number')
    expect(minimal.sizes.strokeWidth).toBeGreaterThan(0)
    expect(minimal.sizes.fontSize).toBeGreaterThan(0)
    expect(minimal.sizes.fontSizeSmall).toBeGreaterThan(0)
  })
})
// ── FIN: tests themes ──
