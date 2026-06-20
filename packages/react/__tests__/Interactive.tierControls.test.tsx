// ── INICIO: tests Interactivo Capa B — tier badge + controls ──
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { SkillNodeControls } from '../src/SkillNodeControls.js'

describe('SkillNode — tier badge', () => {
  it('amosa badge "2/3" en multi-tier por defecto', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A', maxTier: 3 }}
          instance={{ id: 'a', state: 'unlocked', currentTier: 2 }}
          position={{ x: 0, y: 0 }}
        />
      </svg>,
    )
    const badge = container.querySelector('[data-testid="tier-badge"]')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toContain('2/3')
  })

  it('NON amosa badge en single-tier por defecto', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A', maxTier: 1 }}
          instance={{ id: 'a', state: 'maxed', currentTier: 1 }}
          position={{ x: 0, y: 0 }}
        />
      </svg>,
    )
    expect(container.querySelector('[data-testid="tier-badge"]')).toBeNull()
  })

  it('showTierBadge=true forza badge en single-tier', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A', maxTier: 1 }}
          instance={{ id: 'a', state: 'locked', currentTier: 0 }}
          position={{ x: 0, y: 0 }}
          showTierBadge
        />
      </svg>,
    )
    const badge = container.querySelector('[data-testid="tier-badge"]')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toContain('0/1')
  })

  it('showTierBadge=false oculta badge en multi-tier', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNode
          node={{ id: 'a', type: 'small', label: 'A', maxTier: 3 }}
          instance={{ id: 'a', state: 'unlocked', currentTier: 1 }}
          position={{ x: 0, y: 0 }}
          showTierBadge={false}
        />
      </svg>,
    )
    expect(container.querySelector('[data-testid="tier-badge"]')).toBeNull()
  })
})

describe('SkillNodeControls — botóns ➕/➖', () => {
  it('renderiza dous botóns adxacentes ao nodo', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 100, y: 100 }}
          nodeRadius={30}
          nodeId="a"
          currentTier={1}
          maxTier={3}
          onIncrease={vi.fn()}
          onDecrease={vi.fn()}
        />
      </svg>,
    )
    expect(container.querySelector('[data-testid="control-plus"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="control-minus"]')).not.toBeNull()
  })

  it('➖ disabled cando currentTier=0', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 0, y: 0 }}
          nodeRadius={30}
          nodeId="a"
          currentTier={0}
          maxTier={3}
          onIncrease={vi.fn()}
          onDecrease={vi.fn()}
        />
      </svg>,
    )
    const minus = container.querySelector('[data-testid="control-minus"]')
    expect(minus?.getAttribute('data-disabled')).toBe('true')
  })

  it('➕ disabled cando currentTier >= maxTier (maxed)', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 0, y: 0 }}
          nodeRadius={30}
          nodeId="a"
          currentTier={3}
          maxTier={3}
          onIncrease={vi.fn()}
          onDecrease={vi.fn()}
        />
      </svg>,
    )
    const plus = container.querySelector('[data-testid="control-plus"]')
    expect(plus?.getAttribute('data-disabled')).toBe('true')
  })

  it('➕ disabled cando canIncrease=false (prereqs / budget)', () => {
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 0, y: 0 }}
          nodeRadius={30}
          nodeId="a"
          currentTier={0}
          maxTier={3}
          canIncrease={false}
          onIncrease={vi.fn()}
          onDecrease={vi.fn()}
        />
      </svg>,
    )
    const plus = container.querySelector('[data-testid="control-plus"]')
    expect(plus?.getAttribute('data-disabled')).toBe('true')
  })

  it('click en ➕ dispara onIncrease co nodeId', () => {
    const handleInc = vi.fn()
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 0, y: 0 }}
          nodeRadius={30}
          nodeId="my-node"
          currentTier={0}
          maxTier={3}
          onIncrease={handleInc}
          onDecrease={vi.fn()}
        />
      </svg>,
    )
    const plus = container.querySelector('[data-testid="control-plus"]')
    if (plus === null) throw new Error('plus button missing')
    fireEvent.click(plus)
    expect(handleInc).toHaveBeenCalledWith('my-node')
  })

  it('click en ➖ dispara onDecrease co nodeId', () => {
    const handleDec = vi.fn()
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 0, y: 0 }}
          nodeRadius={30}
          nodeId="my-node"
          currentTier={1}
          maxTier={3}
          onIncrease={vi.fn()}
          onDecrease={handleDec}
        />
      </svg>,
    )
    const minus = container.querySelector('[data-testid="control-minus"]')
    if (minus === null) throw new Error('minus button missing')
    fireEvent.click(minus)
    expect(handleDec).toHaveBeenCalledWith('my-node')
  })

  it('click en botón disabled NON dispara callback', () => {
    const handleDec = vi.fn()
    const { container } = render(
      <svg aria-label="test">
        <title>test</title>
        <SkillNodeControls
          position={{ x: 0, y: 0 }}
          nodeRadius={30}
          nodeId="my-node"
          currentTier={0}
          maxTier={3}
          onIncrease={vi.fn()}
          onDecrease={handleDec}
        />
      </svg>,
    )
    const minus = container.querySelector('[data-testid="control-minus"]')
    if (minus === null) throw new Error('minus button missing')
    // pointerEvents: none impide o evento na práctica; pero o handler tamén
    // chequea minusDisabled. Verificamos que NON se chama.
    fireEvent.click(minus)
    expect(handleDec).not.toHaveBeenCalled()
  })
})
// ── FIN: tests Capa B ──
