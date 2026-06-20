// ── INICIO: tests Renderer sub-fase 1 — fill por estado ──
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SkillNode, fillColorForState, visualStateFor } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'

const baseColors = {
  text: '#222',
  nodeLocked: '#888',
  nodeUnlockable: '#fc0',
  nodeUnlocked: '#0c0',
  nodeMaxed: '#fd0',
  nodeInProgress: '#f80',
  nodeStroke: '#444',
  edge: '#aaa',
  mesh: 'rgba(0,0,0,0.05)',
} as const

function themeWith(overrides: Partial<Theme['colors']>): Theme {
  return {
    colors: { ...baseColors, ...overrides },
    sizes: { strokeWidth: 2, fontSize: 14, fontSizeSmall: 11, ringWidth: 3 },
  }
}

describe('visualStateFor', () => {
  it('multi-tier 1/3 → in_progress', () => {
    expect(visualStateFor('unlocked', 1, 3)).toBe('in_progress')
  })

  it('multi-tier 2/3 → in_progress', () => {
    expect(visualStateFor('unlocked', 2, 3)).toBe('in_progress')
  })

  it('multi-tier 3/3 → maxed (estado cru, non in_progress)', () => {
    expect(visualStateFor('maxed', 3, 3)).toBe('maxed')
  })

  it('multi-tier 0/3 → locked (cru)', () => {
    expect(visualStateFor('locked', 0, 3)).toBe('locked')
  })

  it('single-tier unlocked → unlocked (sen derivación)', () => {
    expect(visualStateFor('unlocked', 1, 1)).toBe('unlocked')
  })

  it('single-tier locked → locked', () => {
    expect(visualStateFor('locked', 0, 1)).toBe('locked')
  })

  it('maxTier undefined → estado cru', () => {
    expect(visualStateFor('unlocked', 1, undefined)).toBe('unlocked')
  })

  it('unlockable → unlockable (cru, currentTier=0)', () => {
    expect(visualStateFor('unlockable', 0, 3)).toBe('unlockable')
  })
})

describe('fillColorForState', () => {
  it('prioridade 1: node.color gaña sobre todo', () => {
    const theme = themeWith({
      nodeFill: '#ffffff',
      nodeFillLocked: '#000000',
    })
    expect(fillColorForState(theme, 'locked', '#abcdef')).toBe('#abcdef')
  })

  it('prioridade 2: nodeFill<State> usado se está', () => {
    const theme = themeWith({
      nodeFill: '#ffffff',
      nodeFillLocked: '#111111',
      nodeFillInProgress: '#222222',
      nodeFillMaxed: '#333333',
    })
    expect(fillColorForState(theme, 'locked')).toBe('#111111')
    expect(fillColorForState(theme, 'in_progress')).toBe('#222222')
    expect(fillColorForState(theme, 'maxed')).toBe('#333333')
  })

  it('prioridade 3: nodeFill (legado) cando non hai token por estado', () => {
    const theme = themeWith({ nodeFill: '#abcabc' })
    expect(fillColorForState(theme, 'locked')).toBe('#abcabc')
    expect(fillColorForState(theme, 'unlocked')).toBe('#abcabc')
    expect(fillColorForState(theme, 'maxed')).toBe('#abcabc')
  })

  it('prioridade 4: default último recurso cando o tema non ten nada', () => {
    const theme = themeWith({})
    expect(fillColorForState(theme, 'locked')).toBe('#f4f4ef')
    expect(fillColorForState(theme, 'unlocked')).toBe('#f4f4ef')
  })

  it('unlockable resolve correctamente', () => {
    const theme = themeWith({ nodeFillUnlockable: '#cafe00' })
    expect(fillColorForState(theme, 'unlockable')).toBe('#cafe00')
  })

  it('unlocked resolve correctamente', () => {
    const theme = themeWith({ nodeFillUnlocked: '#1a2b3c' })
    expect(fillColorForState(theme, 'unlocked')).toBe('#1a2b3c')
  })
})

describe('SkillNode — integración fill por estado', () => {
  it('sen tokens nin node.color → usa nodeFill (cero regresión)', () => {
    const theme = themeWith({ nodeFill: '#f0f0f0' })
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <ThemeProvider theme={theme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    // Comprobamos vía atributo data-state que existe e inspeccionamos fill do
    // shape principal (circle). O fill aparece como atributo no <circle>.
    const circle = container.querySelector('circle')
    expect((circle as SVGCircleElement | null)?.style.fill).toBe('#f0f0f0')
  })

  it('con nodeFillLocked → corpo bloqueado usa ese fill', () => {
    const theme = themeWith({
      nodeFill: '#f0f0f0',
      nodeFillLocked: '#202020',
    })
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <ThemeProvider theme={theme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const circle = container.querySelector('circle')
    expect((circle as SVGCircleElement | null)?.style.fill).toBe('#202020')
  })

  it('multi-tier a medias → fill in-progress (visualState derivado)', () => {
    const theme = themeWith({
      nodeFill: '#f0f0f0',
      nodeFillUnlocked: '#aaaaaa',
      nodeFillInProgress: '#cafe00',
    })
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <ThemeProvider theme={theme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A', maxTier: 3 }}
            instance={{ id: 'a', state: 'unlocked', currentTier: 1 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const circle = container.querySelector('circle')
    expect((circle as SVGCircleElement | null)?.style.fill).toBe('#cafe00')
  })

  it('multi-tier maxed → fill maxed (non in_progress)', () => {
    const theme = themeWith({
      nodeFillMaxed: '#deadbe',
      nodeFillInProgress: '#cafe00',
    })
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <ThemeProvider theme={theme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A', maxTier: 3 }}
            instance={{ id: 'a', state: 'maxed', currentTier: 3 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const circle = container.querySelector('circle')
    expect((circle as SVGCircleElement | null)?.style.fill).toBe('#deadbe')
  })

  it('NodeDef.color → gaña sobre todos os tokens', () => {
    const theme = themeWith({
      nodeFillLocked: '#202020',
      nodeFill: '#f0f0f0',
    })
    const { container } = render(
      <svg aria-label="t">
        <title>t</title>
        <ThemeProvider theme={theme}>
          <SkillNode
            node={{ id: 'a', type: 'small', label: 'A', color: '#abcdef' }}
            instance={{ id: 'a', state: 'locked', currentTier: 0 }}
            position={{ x: 0, y: 0 }}
          />
        </ThemeProvider>
      </svg>,
    )
    const circle = container.querySelector('circle')
    expect((circle as SVGCircleElement | null)?.style.fill).toBe('#abcdef')
  })
})
// ── FIN: tests sub-fase 1 ──
