// ── INICIO: tests animations ──
import { describe, expect, it } from 'vitest'
import { buildAnimationsCSS } from '../src/animations.js'

describe('buildAnimationsCSS', () => {
  it('devolve string non vacío con @keyframes yf-pulse', () => {
    const css = buildAnimationsCSS('test-id')
    expect(css.length).toBeGreaterThan(0)
    expect(css).toContain('@keyframes yf-pulse')
  })

  it('contén scope prefix [data-theme-id="..."]', () => {
    const css = buildAnimationsCSS('my-theme-123')
    expect(css).toContain('[data-theme-id="my-theme-123"]')
  })

  it('contén regra de pulse para data-state="unlockable"', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('[data-state="unlockable"]')
    expect(css).toContain('animation: yf-pulse')
  })

  it('contén transition de fill no .yf-skill-node__circle', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('.yf-skill-node__circle')
    expect(css).toContain('transition: fill')
  })

  it('contén cursor: pointer no [role="button"]', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('[role="button"]')
    expect(css).toContain('cursor: pointer')
  })

  it('contén comments delimitadores ANIMATION BLOCK START/END', () => {
    const css = buildAnimationsCSS('t')
    expect(css).toContain('/* ANIMATION BLOCK START */')
    expect(css).toContain('/* ANIMATION BLOCK END */')
  })
})
// ── FIN: tests animations ──
