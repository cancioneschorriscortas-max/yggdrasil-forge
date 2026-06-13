import { render } from '@testing-library/react'
// ── INICIO: tests SVGRenderer ──
import { describe, expect, it } from 'vitest'
import { SVGRenderer } from '../src/SVGRenderer.js'

/** Helper: busca ou falla. */
function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}

describe('SVGRenderer', () => {
  it('bounds + padding produce viewBox correcto', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 200 }} padding={10} />,
    )
    const svg = q(container, 'svg')
    expect(svg.getAttribute('viewBox')).toBe('-10 -10 120 220')
    expect(svg.getAttribute('class')).toBe('yf-skill-tree')
    expect(svg.getAttribute('role')).toBe('img')
  })

  it("bounds undefined produce viewBox '0 0 0 0'", () => {
    const { container } = render(<SVGRenderer />)
    const svg = q(container, 'svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 0 0')
  })

  it('error definido produce svg con class yf-skill-tree--error + data-error + cero children', () => {
    const { container } = render(
      <SVGRenderer error="YGG_E018">
        <circle cx="0" cy="0" r="5" />
      </SVGRenderer>,
    )
    const svg = q(container, 'svg')
    expect(svg.getAttribute('class')).toContain('yf-skill-tree--error')
    expect(svg.getAttribute('data-error')).toBe('YGG_E018')
    expect(svg.getAttribute('aria-label')).toBe('Skill tree (layout error)')
    // Children non se renderizan en modo erro
    expect(container.querySelector('circle')).toBeNull()
  })

  it('error undefined + layoutType definido produce data-layout', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 50, maxY: 50 }} layoutType="radial" />,
    )
    const svg = q(container, 'svg')
    expect(svg.getAttribute('data-layout')).toBe('radial')
    expect(svg.getAttribute('aria-label')).toBe('Skill tree')
  })

  it('children pasados renderizan dentro do svg', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 10, maxY: 10 }}>
        <rect x="0" y="0" width="10" height="10" data-testid="child" />
      </SVGRenderer>,
    )
    const child = container.querySelector('[data-testid="child"]')
    expect(child).not.toBeNull()
    expect(child?.tagName.toLowerCase()).toBe('rect')
  })
})
// ── FIN: tests SVGRenderer ──
