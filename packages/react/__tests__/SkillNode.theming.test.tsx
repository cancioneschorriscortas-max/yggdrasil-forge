// ── INICIO: tests SkillNode — tematización inline (F10.3.fix) ──
import { render } from '@testing-library/react'
import type { NodeDef, NodeInstance, NodeState } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode, ringColorForState } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import type { Theme } from '../src/theme-types.js'

const theme: Theme = {
  colors: {
    background: 'transparent',
    text: '#222222',
    nodeLocked: '#AA0001',
    nodeUnlockable: '#AA0002',
    nodeUnlocked: '#AA0003',
    nodeMaxed: '#AA0004',
    nodeInProgress: '#AA0005',
    nodeStroke: '#AA0006',
    edge: '#AA0007',
    mesh: '#AA0008',
    nodeFill: '#FFEECC',
  },
  sizes: { strokeWidth: 2, fontSize: 14, fontSizeSmall: 11, ringWidth: 5 },
}

function renderNode(
  node: NodeDef,
  instance: NodeInstance | undefined,
  withTheme = true,
): HTMLElement {
  const inner = (
    <svg role="img" aria-label="t">
      <SkillNode node={node} instance={instance} position={{ x: 0, y: 0 }} />
    </svg>
  )
  const { container } = render(
    withTheme ? <ThemeProvider theme={theme}>{inner}</ThemeProvider> : inner,
  )
  return container
}

function makeInstance(state: NodeState): NodeInstance {
  return { state, currentTier: 0 } as NodeInstance
}

describe('SkillNode — tematización inline (F10.3.fix)', () => {
  it('locked: shape ten inline fill=#FFEECC, stroke=#AA0001 (nodeLocked), strokeWidth=5', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('locked'))
    const shape = c.querySelector('circle.yf-skill-node__shape')
    const style = shape?.getAttribute('style') ?? ''
    expect(style).toContain('fill: #FFEECC') // #FFEECC
    expect(style).toContain('stroke: #AA0001') // #AA0001
    expect(style).toContain('stroke-width: 5')
  })

  it('unlockable → nodeUnlockable como stroke', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('unlockable'))
    const shape = c.querySelector('circle.yf-skill-node__shape')
    expect(shape?.getAttribute('style') ?? '').toContain('stroke: #AA0002') // #AA0002
  })

  it('unlocked → nodeUnlocked', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('unlocked'))
    expect(c.querySelector('circle.yf-skill-node__shape')?.getAttribute('style') ?? '').toContain(
      'stroke: #AA0003',
    )
  })

  it('maxed → nodeMaxed', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('maxed'))
    expect(c.querySelector('circle.yf-skill-node__shape')?.getAttribute('style') ?? '').toContain(
      'stroke: #AA0004',
    )
  })

  it('in_progress → nodeInProgress', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('in_progress'))
    expect(c.querySelector('circle.yf-skill-node__shape')?.getAttribute('style') ?? '').toContain(
      'stroke: #AA0005',
    )
  })

  it('disabled e expired caen no fallback nodeLocked', () => {
    const c1 = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('disabled'))
    const c2 = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('expired'))
    expect(c1.querySelector('circle.yf-skill-node__shape')?.getAttribute('style') ?? '').toContain(
      'stroke: #AA0001',
    )
    expect(c2.querySelector('circle.yf-skill-node__shape')?.getAttribute('style') ?? '').toContain(
      'stroke: #AA0001',
    )
  })

  it('labels (icon/label/progress) levan inline fill=text + fontSize', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A', icon: '⚔' }, {
      state: 'in_progress',
      currentTier: 0,
      progress: 50,
    } as NodeInstance)
    const label = c.querySelector('.yf-skill-node__label')
    expect(label?.getAttribute('style') ?? '').toContain('fill: #222222') // #222222
    expect(label?.getAttribute('style') ?? '').toContain('font-size: 14')
    const icon = c.querySelector('.yf-skill-node__icon')
    expect(icon?.getAttribute('style') ?? '').toContain('fill: #222222')
    const progress = c.querySelector('.yf-skill-node__progress')
    expect(progress?.getAttribute('style') ?? '').toContain('font-size: 11') // fontSizeSmall
  })

  it('sen ThemeProvider (headless): fill fallback #f4f4ef, sen stroke', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' }, makeInstance('locked'), false)
    const shape = c.querySelector('circle.yf-skill-node__shape')
    const style = shape?.getAttribute('style') ?? ''
    expect(style).toContain('fill: #f4f4ef') // #f4f4ef fallback
    expect(style).not.toContain('stroke:')
  })
})

describe('ringColorForState — helper puro', () => {
  it('todos os estados mapean ao token esperado', () => {
    expect(ringColorForState(theme, 'locked')).toBe('#AA0001')
    expect(ringColorForState(theme, 'unlockable')).toBe('#AA0002')
    expect(ringColorForState(theme, 'unlocked')).toBe('#AA0003')
    expect(ringColorForState(theme, 'maxed')).toBe('#AA0004')
    expect(ringColorForState(theme, 'in_progress')).toBe('#AA0005')
    expect(ringColorForState(theme, 'disabled')).toBe('#AA0001') // fallback
    expect(ringColorForState(theme, 'expired')).toBe('#AA0001') // fallback
  })
})
// ── FIN: tests SkillNode — tematización inline ──
