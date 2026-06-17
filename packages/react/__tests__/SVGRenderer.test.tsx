import { render } from '@testing-library/react'
// ── INICIO: tests SVGRenderer ──
import { describe, expect, it } from 'vitest'
import { SVGRenderer } from '../src/SVGRenderer.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { minimal } from '../src/themes/minimal.js'

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

// ── Bloque 2: Integración con tema ──

describe('SVGRenderer — integración con tema', () => {
  it('sen Provider: cero CSS vars, cero <style>, cero data-theme-id', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />,
    )
    const svg = q(container, 'svg')
    expect(container.querySelector('style')).toBeNull()
    expect(svg.getAttribute('data-theme-id')).toBeNull()
    expect(svg.getAttribute('style')).toBeNull()
  })

  it('con Provider(minimal): <style> só con animacións + data-theme-id (sen vars de cor)', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />
      </ThemeProvider>,
    )
    const svg = q(container, 'svg')
    // F10.3.fix: data-theme-id consérvase (áncora das animacións).
    expect(svg.getAttribute('data-theme-id')).toBeTruthy()
    // F10.3.fix: o <svg> NON leva CSS variables no style (eliminado).
    expect(svg.getAttribute('style')).toBeNull()
    const styleEl = container.querySelector('style')
    expect(styleEl).not.toBeNull()
    // F10.3.fix: o <style> só ten animacións; cero regras de cor de nodo/edge/mesh.
    expect(styleEl?.textContent).toContain('@keyframes yf-pulse')
    expect(styleEl?.textContent ?? '').not.toMatch(/\.yf-skill-node__shape\s*\{[^}]*fill:/)
    expect(styleEl?.textContent ?? '').not.toMatch(/\.yf-skill-edge\s*\{[^}]*stroke:/)
    expect(styleEl?.textContent ?? '').not.toContain('--yf-color-node-locked')
  })

  it('modo error con Provider: cero CSS vars, cero <style>', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer error="YGG_E018" />
      </ThemeProvider>,
    )
    const svg = q(container, 'svg')
    expect(svg.getAttribute('class')).toContain('yf-skill-tree--error')
    expect(container.querySelector('style')).toBeNull()
    expect(svg.getAttribute('data-theme-id')).toBeNull()
  })

  it('dúas instances teñen data-theme-id distintos', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <div>
          <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 10, maxY: 10 }} />
          <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 20, maxY: 20 }} />
        </div>
      </ThemeProvider>,
    )
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBe(2)
    const id1 = svgs[0]?.getAttribute('data-theme-id')
    const id2 = svgs[1]?.getAttribute('data-theme-id')
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })
})

// ── Bloque 3: Integración con animacións ──

describe('SVGRenderer — integración con animacións', () => {
  it('con tema activo, <style> contén @keyframes yf-pulse', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />
      </ThemeProvider>,
    )
    const styleEl = container.querySelector('style')
    expect(styleEl).not.toBeNull()
    expect(styleEl?.textContent).toContain('@keyframes yf-pulse')
    expect(styleEl?.textContent).toContain('ANIMATION BLOCK START')
  })

  it('sen tema (headless), cero animacións no DOM', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />,
    )
    expect(container.querySelector('style')).toBeNull()
    expect(container.innerHTML).not.toContain('@keyframes')
  })
})
// ── FIN: tests SVGRenderer ──
