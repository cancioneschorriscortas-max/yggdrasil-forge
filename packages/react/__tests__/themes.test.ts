// ── INICIO: tests themes ──
import { describe, expect, it } from 'vitest'
import { minimal } from '../src/themes/minimal.js'
import { minimalDark } from '../src/themes/minimalDark.js'

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

describe('★ F7.9 — minimalDark theme', () => {
  it('ten os mesmos tokens requeridos de colors que minimal', () => {
    expect(minimalDark.colors.text).toBeDefined()
    expect(minimalDark.colors.nodeLocked).toBeDefined()
    expect(minimalDark.colors.nodeUnlockable).toBeDefined()
    expect(minimalDark.colors.nodeUnlocked).toBeDefined()
    expect(minimalDark.colors.nodeMaxed).toBeDefined()
    expect(minimalDark.colors.nodeInProgress).toBeDefined()
    expect(minimalDark.colors.nodeStroke).toBeDefined()
    expect(minimalDark.colors.edge).toBeDefined()
    expect(minimalDark.colors.mesh).toBeDefined()
  })

  it('★ sizes son IDÉNTICOS a minimal (non desviar)', () => {
    expect(minimalDark.sizes).toEqual(minimal.sizes)
  })

  it('★ ningunha cor de colors coincide coa de minimal (fondos distintos)', () => {
    // As cores de ESTADO (unlocked/maxed/inProgress) poden coincidir
    // a propósito (funcionan en ambos fondos); as demais deben diferir.
    expect(minimalDark.colors.text).not.toBe(minimal.colors.text)
    expect(minimalDark.colors.nodeStroke).not.toBe(minimal.colors.nodeStroke)
    expect(minimalDark.colors.edge).not.toBe(minimal.colors.edge)
    expect(minimalDark.colors.edgeActive).not.toBe(minimal.colors.edgeActive)
    expect(minimalDark.colors.mesh).not.toBe(minimal.colors.mesh)
    expect(minimalDark.colors.nodeFill).not.toBe(minimal.colors.nodeFill)
    expect(minimalDark.colors.nodeLocked).not.toBe(minimal.colors.nodeLocked)
    expect(minimalDark.colors.nodeUnlockable).not.toBe(minimal.colors.nodeUnlockable)
  })

  it('cores de estado maxed/inProgress comparten valor con minimal (funcionan en ambos fondos)', () => {
    expect(minimalDark.colors.nodeMaxed).toBe(minimal.colors.nodeMaxed)
    expect(minimalDark.colors.nodeInProgress).toBe(minimal.colors.nodeInProgress)
  })

  it('background é undefined (cero fondo por defecto, igual que minimal)', () => {
    expect(minimalDark.colors.background).toBeUndefined()
  })
})
// ── FIN: tests themes ──
