// ── INICIO: tests SkillNode icon resolution (F10.5) ──
import { render } from '@testing-library/react'
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { registerIcon } from '../src/icons/registry.js'
import { minimal } from '../src/themes/minimal.js'

// Setup: rexistrar 1 icona para os tests (idempotente)
registerIcon('test-svg-icon', {
  paths: [{ d: 'M12 2 L22 22 L2 22 Z', mode: 'fill' }],
})

function makeNode(icon: string | undefined): NodeDef {
  const base: NodeDef = {
    id: 'n1',
    type: 'small',
    label: { en: 'X', es: 'X', gl: 'X' },
  }
  return icon !== undefined ? { ...base, icon } : base
}

function renderNode(node: NodeDef) {
  return render(
    <ThemeProvider theme={minimal}>
      <svg role="img" aria-label="t">
        <SkillNode node={node} instance={undefined} position={{ x: 0, y: 0 }} />
      </svg>
    </ThemeProvider>,
  )
}

describe('SkillNode icon — resolución (F10.5)', () => {
  it('id rexistrado → renderiza IconGlyph (<svg> aniñado)', () => {
    const { container } = renderNode(makeNode('test-svg-icon'))
    const iconSvg = container.querySelector('svg.yf-skill-node__icon')
    expect(iconSvg?.tagName.toLowerCase()).toBe('svg')
    // path con fill="currentColor" → confirma IconGlyph
    expect(iconSvg?.querySelector('path')?.getAttribute('fill')).toBe('currentColor')
    // NON debe haber un <text> de icono nin <image>
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })

  it('URL absoluta → renderiza <image>', () => {
    const { container } = renderNode(makeNode('https://example.com/icon.png'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('href')).toBe('https://example.com/icon.png')
    expect(container.querySelector('svg.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
  })

  it('URL relativa (//cdn...) → renderiza <image>', () => {
    const { container } = renderNode(makeNode('//cdn.example.com/icon.svg'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('href')).toBe('//cdn.example.com/icon.svg')
  })

  it('emoji/char (non rexistrado, non URL) → renderiza <text> (fallback)', () => {
    const { container } = renderNode(makeNode('🔥'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text?.textContent).toBe('🔥')
    expect(container.querySelector('svg.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })

  it('node sen icon → cero elementos de icono', () => {
    const { container } = renderNode(makeNode(undefined))
    expect(container.querySelector('svg.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
  })

  it('id non rexistrado pero non URL → renderiza <text> (fallback)', () => {
    const { container } = renderNode(makeNode('not-registered-id-12345'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text?.textContent).toBe('not-registered-id-12345')
  })
})

describe('SkillNode icon — recolor (F10.5)', () => {
  it('aplica color do tema (ThemeColors.text por default)', () => {
    const { container } = renderNode(makeNode('test-svg-icon'))
    const iconSvg = container.querySelector('svg.yf-skill-node__icon')
    const styleAttr = iconSvg?.getAttribute('style') ?? ''
    // minimal.colors.text = '#222222' → jsdom normaliza a rgb(34, 34, 34)
    expect(styleAttr).toMatch(/color:\s*(?:#222222|rgb\(34,\s*34,\s*34\))/)
  })
})
// ── FIN: tests SkillNode icon ──
