import { render } from '@testing-library/react'
// ── INICIO: tests SVGRenderer ──
import { describe, expect, it } from 'vitest'
import { ARROW_MARKER_ID, SVGRenderer } from '../src/SVGRenderer.js'
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

  it('backgroundImage: renderiza <image> co box dos bounds dentro do grupo pan/zoom', () => {
    const { container } = render(
      <SVGRenderer
        bounds={{ minX: 0, minY: 0, maxX: 1402, maxY: 1122 }}
        padding={0}
        backgroundImage="data:image/png;base64,iVBORw0KGgo="
      />,
    )
    const img = container.querySelector('.yf-skill-tree__background')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('href')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(img?.getAttribute('x')).toBe('0')
    expect(img?.getAttribute('y')).toBe('0')
    expect(img?.getAttribute('width')).toBe('1402')
    expect(img?.getAttribute('height')).toBe('1122')
    expect(img?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
  })

  it('backgroundImage non se renderiza cando non se pasa', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />,
    )
    expect(container.querySelector('.yf-skill-tree__background')).toBeNull()
  })

  it('backgroundImage sen bounds: non se renderiza (require box)', () => {
    const { container } = render(
      <SVGRenderer backgroundImage="data:image/png;base64,iVBORw0KGgo=" />,
    )
    expect(container.querySelector('.yf-skill-tree__background')).toBeNull()
  })

  it('error definido produce svg con class yf-skill-tree--error + data-error; en DEV (env de test) aria-label inclúe o código', () => {
    const { container } = render(
      <SVGRenderer error="YGG_E018">
        <circle cx="0" cy="0" r="5" />
      </SVGRenderer>,
    )
    const svg = q(container, 'svg')
    expect(svg.getAttribute('class')).toContain('yf-skill-tree--error')
    expect(svg.getAttribute('data-error')).toBe('YGG_E018')
    // DEV (env de test, NODE_ENV !== 'production'): aria-label inclúe o código
    // para axudar a depurar. En PROD volve á mensaxe xenérica (ver test dedicado).
    expect(svg.getAttribute('aria-label')).toBe('Skill tree (layout error: YGG_E018)')
    // Children pasados como props NON se renderizan en modo erro (a única
    // saída interior é o banner DEV con <g><rect><text/></g>).
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

  // F10.6: viewport transform group
  it('children pasados quedan dentro do <g transform> (F10.6)', () => {
    const { container } = render(
      <SVGRenderer
        bounds={{ minX: 0, minY: 0, maxX: 10, maxY: 10 }}
        transform="translate(5 10) scale(2)"
      >
        <rect x="0" y="0" width="10" height="10" data-testid="child" />
      </SVGRenderer>,
    )
    const child = container.querySelector('[data-testid="child"]')
    expect(child).not.toBeNull()
    const parent = child?.parentElement
    expect(parent?.tagName.toLowerCase()).toBe('g')
    expect(parent?.getAttribute('transform')).toBe('translate(5 10) scale(2)')
  })

  it('sen transform prop, o <g> wrap segue existindo pero sen atributo transform (F10.6)', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 10, maxY: 10 }}>
        <rect data-testid="child" />
      </SVGRenderer>,
    )
    const child = container.querySelector('[data-testid="child"]')
    const parent = child?.parentElement
    expect(parent?.tagName.toLowerCase()).toBe('g')
    expect(parent?.getAttribute('transform')).toBeNull()
  })
})

// ── Bloque 2: Integración con tema ──

describe('SVGRenderer — integración con tema', () => {
  it('sen Provider: cero CSS vars, cero <style>, cero data-theme-id', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />,
    )
    const svg = q(container, 'svg') as SVGElement
    expect(container.querySelector('style')).toBeNull()
    expect(svg.getAttribute('data-theme-id')).toBeNull()
    // Layout-L fix: o style existe (fill base), pero NON ten background do tema.
    expect(svg.style.background).toBe('')
  })

  it('con Provider(minimal): <style> só con animacións + data-theme-id (sen vars de cor)', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />
      </ThemeProvider>,
    )
    const svg = q(container, 'svg') as SVGElement
    // F10.3.fix: data-theme-id consérvase (áncora das animacións).
    expect(svg.getAttribute('data-theme-id')).toBeTruthy()
    // Layout-L fix: minimal NON define colors.background, polo que o style
    // existe (fill base) pero o background queda baleiro.
    expect(svg.style.background).toBe('')
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

// ── Bloque 4: <defs> con marker de frecha (F10.4) ──

describe('SVGRenderer — marker de frecha en <defs> (F10.4)', () => {
  it('con tema: <defs> presente con marker#yf-arrow-marker e fill=edge', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />
      </ThemeProvider>,
    )
    const defs = container.querySelector('defs')
    expect(defs).not.toBeNull()
    const marker = container.querySelector(`marker#${ARROW_MARKER_ID}`)
    expect(marker).not.toBeNull()
    expect(marker?.getAttribute('orient')).toBe('auto-start-reverse')
    const arrowPath = marker?.querySelector('path')
    expect(arrowPath?.getAttribute('d')).toBe('M 0 0 L 10 5 L 0 10 z')
    expect(arrowPath?.getAttribute('style') ?? '').toContain(`fill: ${minimal.colors.edge}`)
  })

  it('sen tema (headless): cero <defs> nin marker', () => {
    const { container } = render(
      <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />,
    )
    expect(container.querySelector('defs')).toBeNull()
    expect(container.querySelector(`marker#${ARROW_MARKER_ID}`)).toBeNull()
  })

  // Layout-L fix: o <svg> enche o seu contedor por defecto (cero
  // sorpresa de "banda morta" para o consumidor).
  describe('estilo base do <svg> (enche contedor por defecto)', () => {
    it('caso normal: style ten display:block + width/height 100%', () => {
      const { container } = render(
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />,
      )
      const svg = q(container, 'svg') as SVGElement
      expect(svg.style.display).toBe('block')
      expect(svg.style.width).toBe('100%')
      expect(svg.style.height).toBe('100%')
    })

    it('caso erro: tamén leva o estilo de fill', () => {
      const { container } = render(<SVGRenderer error="YGG_E018" />)
      const svg = q(container, 'svg') as SVGElement
      expect(svg.style.display).toBe('block')
      expect(svg.style.width).toBe('100%')
      expect(svg.style.height).toBe('100%')
    })

    it('o background do tema sobreescribe pero conserva o fill', () => {
      // minimal non define colors.background; usamos un tema cun
      // background explícito para verificar a fusión.
      const themedBackground = {
        ...minimal,
        colors: { ...minimal.colors, background: '#101020' },
      }
      const { container } = render(
        <ThemeProvider theme={themedBackground}>
          <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} />
        </ThemeProvider>,
      )
      const svg = q(container, 'svg') as SVGElement
      // Background ven do tema
      expect(svg.style.background).toContain('rgb(16, 16, 32)')
      // Fill base segue presente
      expect(svg.style.display).toBe('block')
      expect(svg.style.width).toBe('100%')
      expect(svg.style.height).toBe('100%')
    })
  })
})
// ── FIN: tests SVGRenderer ──
