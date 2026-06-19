// ── INICIO: tests SkillNode F10.7 (selection + hover + cursor + focus) ──
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'
import { minimal } from '../src/themes/minimal.js'

const testTheme: Theme = {
  ...minimal,
  colors: {
    ...minimal.colors,
    selected: '#ff00ff', // sentinel cor de selección para tests
  },
}

function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}
function maybeQ(container: HTMLElement, selector: string): Element | null {
  return container.querySelector(selector)
}

describe('SkillNode — selección (F10.7)', () => {
  it('sen `selected`: cero overlay de selección, cero data-selected', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
          />
        </ThemeProvider>
      </svg>,
    )
    expect(maybeQ(container, '.yf-skill-node__selection')).toBeNull()
    const g = q(container, '[data-node-id="a"]')
    expect(g.getAttribute('data-selected')).toBeNull()
  })

  it('con `selected={true}`: overlay de selección presente + data-selected="true"', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'unlockable', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
            selected={true}
          />
        </ThemeProvider>
      </svg>,
    )
    const overlay = q(container, '.yf-skill-node__selection')
    expect(overlay.tagName.toLowerCase()).toBe('circle')
    const g = q(container, '[data-node-id="a"]')
    expect(g.getAttribute('data-selected')).toBe('true')
  })

  it('o overlay de selección usa `theme.colors.selected`', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            selected={true}
          />
        </ThemeProvider>
      </svg>,
    )
    const overlay = q(container, '.yf-skill-node__selection')
    const styleAttr = overlay.getAttribute('style') ?? ''
    // jsdom normaliza color: #hex → rgb(...)
    expect(styleAttr).toMatch(/stroke:\s*(?:#ff00ff|rgb\(255,\s*0,\s*255\))/)
  })

  it('o overlay de selección queda fóra do shape (raio maior)', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            selected={true}
          />
        </ThemeProvider>
      </svg>,
    )
    const overlay = q(container, '.yf-skill-node__selection')
    const overlayR = Number.parseFloat(overlay.getAttribute('r') ?? '0')
    // O raio do shape (small node) é menor que o do overlay.
    expect(overlayR).toBeGreaterThan(0)
    // Verifica que é claramente maior que o radio base (small ≈ 20).
    expect(overlayR).toBeGreaterThan(20)
  })
})

describe('SkillNode — hover (F10.7)', () => {
  it('pointerEnter: aparece overlay de hover + data-hover="true"', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
          />
        </ThemeProvider>
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    expect(maybeQ(container, '.yf-skill-node__hover')).toBeNull()
    fireEvent.pointerEnter(g)
    expect(maybeQ(container, '.yf-skill-node__hover')).not.toBeNull()
    expect(g.getAttribute('data-hover')).toBe('true')
    fireEvent.pointerLeave(g)
    expect(maybeQ(container, '.yf-skill-node__hover')).toBeNull()
    expect(g.getAttribute('data-hover')).toBeNull()
  })

  it('onHover dispárase con id ao entrar e con null ao saír', () => {
    const onHover = vi.fn()
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'hover-id', type: 'small', label: 'H' }}
            instance={{ id: 'hover-id', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
            onHover={onHover}
          />
        </ThemeProvider>
      </svg>,
    )
    const g = q(container, '[data-node-id="hover-id"]')
    fireEvent.pointerEnter(g)
    expect(onHover).toHaveBeenCalledWith('hover-id')
    fireEvent.pointerLeave(g)
    expect(onHover).toHaveBeenCalledWith(null)
    expect(onHover).toHaveBeenCalledTimes(2)
  })

  it('selección ten prioridade sobre hover (cero hover overlay cando selected)', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
            selected={true}
          />
        </ThemeProvider>
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    fireEvent.pointerEnter(g)
    expect(maybeQ(container, '.yf-skill-node__selection')).not.toBeNull()
    expect(maybeQ(container, '.yf-skill-node__hover')).toBeNull()
  })
})

describe('SkillNode — cursor (F10.7)', () => {
  it('cursor: pointer cando hai onClick (interactivo)', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
          />
        </ThemeProvider>
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    expect(g.getAttribute('style') ?? '').toMatch(/cursor:\s*pointer/)
  })

  it('cursor non explicitamente "pointer" cando non hai onClick (default)', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]')
    const styleAttr = g.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/cursor:\s*pointer/)
  })
})

describe('SkillNode — foco de teclado (F10.7)', () => {
  it('tabIndex 0 cando hai onClick; cero atributo (default -1 implícito) cando non', () => {
    const { container: withClick } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
          />
        </ThemeProvider>
      </svg>,
    )
    expect(q(withClick, '[data-node-id="a"]').getAttribute('tabindex')).toBe('0')

    const { container: noClick } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'b', type: 'small', label: 'B' }}
            instance={{ id: 'b', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    // Sen onClick, tabindex non está presente (cero foco automático).
    expect(q(noClick, '[data-node-id="b"]').getAttribute('tabindex')).toBeNull()
  })

  it('focus: aparece overlay de foco (dashed) + data-focused="true"', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <ThemeProvider theme={testTheme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
            onClick={vi.fn()}
          />
        </ThemeProvider>
      </svg>,
    )
    const g = q(container, '[data-node-id="a"]') as SVGElement
    fireEvent.focus(g)
    expect(maybeQ(container, '.yf-skill-node__focus')).not.toBeNull()
    expect(g.getAttribute('data-focused')).toBe('true')
    const focusOverlay = q(container, '.yf-skill-node__focus')
    // O foco usa stroke-dasharray para distinguilo da selección sólida.
    expect(focusOverlay.getAttribute('style') ?? '').toMatch(/stroke-dasharray/)
    fireEvent.blur(g)
    expect(maybeQ(container, '.yf-skill-node__focus')).toBeNull()
  })
})
// ── FIN: tests SkillNode F10.7 ──
