import { render } from '@testing-library/react'
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'

function renderNode(node: NodeDef): HTMLElement {
  const { container } = render(
    <svg role="img" aria-label="test">
      <SkillNode node={node} instance={undefined} position={{ x: 0, y: 0 }} />
    </svg>,
  )
  return container
}

describe('SkillNode — forma + tamaño por tipo (F10.3 plano)', () => {
  it('small → <circle> raio 16', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A' })
    expect(c.querySelector('circle.yf-skill-node__shape')?.getAttribute('r')).toBe('16')
  })

  it('root → <circle> raio 40', () => {
    const c = renderNode({ id: 'root', type: 'root', label: 'R' })
    expect(c.querySelector('circle.yf-skill-node__shape')?.getAttribute('r')).toBe('40')
  })

  it('keystone → <polygon> (hexágono), non <circle>', () => {
    const c = renderNode({ id: 'k', type: 'keystone', label: 'K' })
    expect(c.querySelector('polygon.yf-skill-node__shape')).not.toBeNull()
    expect(c.querySelector('circle.yf-skill-node__shape')).toBeNull()
  })

  it('milestone → <rect> (cadrado)', () => {
    const c = renderNode({ id: 'm', type: 'milestone', label: 'M' })
    expect(c.querySelector('rect.yf-skill-node__shape')).not.toBeNull()
  })

  it('node.shape override gaña sobre o default por tipo', () => {
    const c = renderNode({ id: 's', type: 'small', label: 'S', shape: 'diamond' })
    expect(c.querySelector('polygon.yf-skill-node__shape')).not.toBeNull()
    expect(c.querySelector('circle.yf-skill-node__shape')).toBeNull()
  })

  it('node.size override aplica o raio', () => {
    const c = renderNode({ id: 'z', type: 'small', label: 'Z', size: 50 })
    expect(c.querySelector('circle.yf-skill-node__shape')?.getAttribute('r')).toBe('50')
  })
})

describe('SkillNode — anatomía (icon dentro + label debaixo)', () => {
  it('nodo con icon: renderiza .yf-skill-node__icon co texto', () => {
    const c = renderNode({ id: 'i', type: 'small', label: 'I', icon: '⚔' })
    const iconEl = c.querySelector('.yf-skill-node__icon')
    expect(iconEl).not.toBeNull()
    expect(iconEl?.textContent).toBe('⚔')
  })

  it('nodo sen icon: NON renderiza .yf-skill-node__icon', () => {
    const c = renderNode({ id: 'ni', type: 'small', label: 'NI' })
    expect(c.querySelector('.yf-skill-node__icon')).toBeNull()
  })

  it('label vai DEBAIXO do nodo (y > 0)', () => {
    const c = renderNode({ id: 'l', type: 'small', label: 'L' })
    const labelEl = c.querySelector('.yf-skill-node__label')
    expect(labelEl).not.toBeNull()
    const y = Number(labelEl?.getAttribute('y') ?? '0')
    expect(y).toBeGreaterThan(0)
    // small ten raio 16; label vai a radius + 16 = 32.
    expect(y).toBe(32)
  })

  it('icon vai centrado verticalmente dentro do nodo', () => {
    const c = renderNode({ id: 'a', type: 'small', label: 'A', icon: '⚔' })
    const iconEl = c.querySelector('.yf-skill-node__icon')
    expect(iconEl?.getAttribute('y')).toBeNull()
    expect(iconEl?.getAttribute('dominant-baseline')).toBe('central')
  })
})
