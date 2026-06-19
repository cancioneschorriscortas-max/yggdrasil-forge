// ── INICIO: tests F10.8 (typography + background + surface) ──
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SVGRenderer } from '../src/SVGRenderer.js'
import { SkillNode } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'
import { minimal } from '../src/themes/minimal.js'

function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}
function maybeQ(container: HTMLElement, selector: string): Element | null {
  return container.querySelector(selector)
}

describe('SkillNode — typography (F10.8)', () => {
  it('sen `typography`: cero attrs de fontFamily/weight/letterSpacing/transform nos labels', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={minimal}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const label = q(container, '.yf-skill-node__label')
    const style = label.getAttribute('style') ?? ''
    expect(style).not.toMatch(/font-family/)
    expect(style).not.toMatch(/font-weight:\s*600/)
    expect(style).not.toMatch(/letter-spacing/)
    expect(style).not.toMatch(/text-transform/)
  })

  it('con `typography.fontFamily`: aplícase ao label inline', () => {
    const themed: Theme = {
      ...minimal,
      typography: { fontFamily: '"Cinzel", serif' },
    }
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={themed}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const label = q(container, '.yf-skill-node__label')
    expect(label.getAttribute('style') ?? '').toMatch(/font-family:\s*"Cinzel"/i)
  })

  it('typography completa: fontWeight + letterSpacing + textTransform aplícanse', () => {
    const themed: Theme = {
      ...minimal,
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      },
    }
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={themed}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'unlocked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const style = q(container, '.yf-skill-node__label').getAttribute('style') ?? ''
    expect(style).toMatch(/font-weight:\s*700/)
    expect(style).toMatch(/letter-spacing:\s*0\.05em/)
    expect(style).toMatch(/text-transform:\s*uppercase/)
  })

  it('progress label tamén recibe typography (fontWeight aplicado)', () => {
    const themed: Theme = {
      ...minimal,
      typography: { fontFamily: 'Inter', fontWeight: 500 },
    }
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={themed}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'in_progress', currentTier: 0, progress: 42 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const progress = q(container, '.yf-skill-node__progress')
    expect(progress.getAttribute('style') ?? '').toMatch(/font-family/)
  })
})

describe('SVGRenderer — background (F10.8)', () => {
  it('sen `colors.background`: cero `style.background` no <svg>', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }}>
          <g />
        </SVGRenderer>
      </ThemeProvider>,
    )
    const svg = q(container, 'svg.yf-skill-tree')
    expect(svg.getAttribute('style') ?? '').not.toMatch(/background/)
  })

  it('con `colors.background`: aplícase inline ao <svg>', () => {
    const themed: Theme = {
      ...minimal,
      colors: { ...minimal.colors, background: '#11131a' },
    }
    const { container } = render(
      <ThemeProvider theme={themed}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }}>
          <g />
        </SVGRenderer>
      </ThemeProvider>,
    )
    const svg = q(container, 'svg.yf-skill-tree')
    // jsdom normaliza color: #hex → rgb(...)
    expect(svg.getAttribute('style') ?? '').toMatch(
      /background:\s*(?:#11131a|rgb\(17,\s*19,\s*26\))/,
    )
  })
})

describe('SVGRenderer — surface (F10.8)', () => {
  it('sen `colors.surface`: cero <rect> de surface', () => {
    const { container } = render(
      <ThemeProvider theme={minimal}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }}>
          <g />
        </SVGRenderer>
      </ThemeProvider>,
    )
    expect(maybeQ(container, '.yf-skill-tree__surface')).toBeNull()
  })

  it('con `colors.surface`: renderiza <rect> cubrindo bounds+padding', () => {
    const themed: Theme = {
      ...minimal,
      colors: { ...minimal.colors, surface: '#ffeedd' },
    }
    const { container } = render(
      <ThemeProvider theme={themed}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }} padding={20}>
          <g />
        </SVGRenderer>
      </ThemeProvider>,
    )
    const rect = q(container, '.yf-skill-tree__surface')
    expect(rect.tagName.toLowerCase()).toBe('rect')
    // bounds (0,0)→(100,100), padding 20 → x=-20, y=-20, width=140, height=140
    expect(rect.getAttribute('x')).toBe('-20')
    expect(rect.getAttribute('y')).toBe('-20')
    expect(rect.getAttribute('width')).toBe('140')
    expect(rect.getAttribute('height')).toBe('140')
    expect(rect.getAttribute('style') ?? '').toMatch(/fill:\s*(?:#ffeedd|rgb\(255,\s*238,\s*221\))/)
  })

  it('surface só rende cando hai bounds (cero bounds = cero rect)', () => {
    const themed: Theme = {
      ...minimal,
      colors: { ...minimal.colors, surface: '#ffeedd' },
    }
    const { container } = render(
      <ThemeProvider theme={themed}>
        <SVGRenderer>
          <g />
        </SVGRenderer>
      </ThemeProvider>,
    )
    expect(maybeQ(container, '.yf-skill-tree__surface')).toBeNull()
  })

  it('surface é o **primeiro** fillo do <g transform> (queda detrás de todo)', () => {
    const themed: Theme = {
      ...minimal,
      colors: { ...minimal.colors, surface: '#ffeedd' },
    }
    const { container } = render(
      <ThemeProvider theme={themed}>
        <SVGRenderer bounds={{ minX: 0, minY: 0, maxX: 100, maxY: 100 }}>
          <g className="user-content" />
        </SVGRenderer>
      </ThemeProvider>,
    )
    // O <rect> de surface debería preceder ao <g className="user-content">
    // dentro do <g transform> wrapper.
    const surfaceRect = q(container, '.yf-skill-tree__surface')
    const userG = q(container, 'g.user-content')
    const position = surfaceRect.compareDocumentPosition(userG)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Theme schema (F10.8)', () => {
  it('typography é opcional (cero campo non rompe nada)', () => {
    // Test de compilación: estes obxectos teñen que typecheckar.
    const t1: Theme = { ...minimal }
    const t2: Theme = { ...minimal, typography: { fontFamily: 'Inter' } }
    const t3: Theme = { ...minimal, typography: {} }
    expect(t1.typography).toBeUndefined()
    expect(t2.typography?.fontFamily).toBe('Inter')
    expect(t3.typography).toEqual({})
    // Evita 'vi declarado pero non usado' nalgúns lints estritos.
    expect(vi).toBeDefined()
  })

  it('colors.surface é opcional', () => {
    const t1: Theme = { ...minimal }
    const t2: Theme = { ...minimal, colors: { ...minimal.colors, surface: '#abcdef' } }
    expect(t1.colors.surface).toBeUndefined()
    expect(t2.colors.surface).toBe('#abcdef')
  })
})
// ── FIN: tests F10.8 ──
