// ── INICIO: tests IconGlyph (F10.5) ──
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconGlyph } from '../src/icons/IconGlyph.js'
import type { IconDef } from '../src/icons/registry.js'

const fillIcon: IconDef = { paths: [{ d: 'M12 2 L22 22 L2 22 Z', mode: 'fill' }] }
const strokeIcon: IconDef = { paths: [{ d: 'M2 12 H22', mode: 'stroke' }] }
const mixedIcon: IconDef = {
  paths: [
    { d: 'M0 0 L10 10', mode: 'fill' },
    { d: 'M10 0 L0 10', mode: 'stroke' },
  ],
}

describe('IconGlyph — render básico (F10.5)', () => {
  it('renderiza <svg role="img" aria-label="t"> coa class yf-skill-node__icon e aria-hidden', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={fillIcon} size={24} />
      </svg>,
    )
    const icon = container.querySelector('svg.yf-skill-node__icon')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })

  it('aplica viewBox por defecto "0 0 24 24" se IconDef non o ten', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={fillIcon} size={20} />
      </svg>,
    )
    expect(container.querySelector('svg.yf-skill-node__icon')?.getAttribute('viewBox')).toBe(
      '0 0 24 24',
    )
  })

  it('respecta viewBox custom do IconDef', () => {
    const custom: IconDef = { viewBox: '0 0 100 100', paths: [{ d: 'M0 0' }] }
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={custom} size={20} />
      </svg>,
    )
    expect(container.querySelector('svg.yf-skill-node__icon')?.getAttribute('viewBox')).toBe(
      '0 0 100 100',
    )
  })

  it('aplica style.color cando se pasa', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={fillIcon} size={20} color="#ff0066" />
      </svg>,
    )
    const styleAttr = container.querySelector('svg.yf-skill-node__icon')?.getAttribute('style')
    // jsdom normaliza #ff0066 → rgb(255, 0, 102) en CSS color property
    expect(styleAttr ?? '').toMatch(/color:\s*(?:#ff0066|rgb\(255,\s*0,\s*102\))/)
  })
})

describe('IconGlyph — modes fill/stroke (F10.5)', () => {
  it('mode "fill": path con fill=currentColor e sen stroke', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={fillIcon} size={20} />
      </svg>,
    )
    const path = container.querySelector('svg.yf-skill-node__icon > path')
    expect(path?.getAttribute('fill')).toBe('currentColor')
    expect(path?.getAttribute('stroke')).toBeNull()
  })

  it('mode "stroke": path con stroke=currentColor e fill=none', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={strokeIcon} size={20} />
      </svg>,
    )
    const path = container.querySelector('svg.yf-skill-node__icon > path')
    expect(path?.getAttribute('stroke')).toBe('currentColor')
    expect(path?.getAttribute('fill')).toBe('none')
    expect(path?.getAttribute('stroke-linecap')).toBe('round')
    expect(path?.getAttribute('stroke-linejoin')).toBe('round')
  })

  it('paths mixtos: cada un respecta o seu mode', () => {
    const { container } = render(
      <svg role="img" aria-label="t">
        <IconGlyph def={mixedIcon} size={20} />
      </svg>,
    )
    const paths = container.querySelectorAll('svg.yf-skill-node__icon > path')
    expect(paths.length).toBe(2)
    expect(paths[0]?.getAttribute('fill')).toBe('currentColor')
    expect(paths[1]?.getAttribute('stroke')).toBe('currentColor')
    expect(paths[1]?.getAttribute('fill')).toBe('none')
  })
})
// ── FIN: tests IconGlyph ──
