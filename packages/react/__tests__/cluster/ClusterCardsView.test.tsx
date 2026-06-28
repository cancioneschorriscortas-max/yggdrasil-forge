// ── INICIO: tests ClusterCardsView (render + interaccións) ──
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClusterCardsView, type ClusterGroup } from '../../src/cluster/ClusterCardsView.js'

function makeGroups(): ClusterGroup[] {
  return [
    {
      id: 'g1',
      label: 'GRUPO 1',
      color: '#aabbcc',
      members: [
        { id: 'g1-a', label: 'Item A', currentTier: 0, maxTier: 3 },
        { id: 'g1-b', label: 'Item B', currentTier: 1, maxTier: 3 },
        { id: 'g1-c', label: 'Item C', currentTier: 3, maxTier: 3 },
      ],
    },
    {
      id: 'g2',
      label: 'GRUPO 2',
      color: '#ccbbaa',
      members: [{ id: 'g2-a', label: 'Item D', currentTier: 0, maxTier: 1 }],
    },
  ]
}

describe('ClusterCardsView — render', () => {
  it('renderiza unha tarxeta por grupo coas filas correspondentes', () => {
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />)
    const cards = container.querySelectorAll('.yf-cluster-card')
    expect(cards.length).toBe(2)
    const rows = container.querySelectorAll('.yf-cluster-row')
    expect(rows.length).toBe(4)
  })

  it('estados das filas: done/actual/locked aplican modificadores', () => {
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />)
    expect(container.querySelectorAll('.yf-cluster-row--locked').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.yf-cluster-row--actual').length).toBe(1)
    expect(container.querySelectorAll('.yf-cluster-row--done').length).toBe(1)
  })

  it('selectedNodeId aplica yf-cluster-row--selected', () => {
    const { container } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} selectedNodeId="g1-b" />,
    )
    const selected = container.querySelectorAll('.yf-cluster-row--selected')
    expect(selected.length).toBe(1)
  })

  it('click nunha fila chama onRowClick co id do membro', () => {
    const onClick = vi.fn()
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={onClick} />)
    const firstButton = container.querySelector(
      '.yf-cluster-row__button',
    ) as HTMLButtonElement | null
    expect(firstButton).not.toBeNull()
    if (firstButton === null) return
    fireEvent.click(firstButton)
    expect(onClick).toHaveBeenCalledWith('g1-a')
  })

  it('crown: renderízase só se hai crownLabel ou crownIcon', () => {
    const { container: noCrown } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />,
    )
    expect(noCrown.querySelector('.yf-cluster-crown')).toBeNull()

    const { container: withCrown } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} crownLabel="Centro" />,
    )
    expect(withCrown.querySelector('.yf-cluster-crown')).not.toBeNull()
    expect(withCrown.querySelector('.yf-cluster-crown__label')?.textContent).toBe('Centro')
  })

  it('positions: cando hai entrada para o groupId, úsase tal cal', () => {
    const { container } = render(
      <ClusterCardsView
        groups={makeGroups()}
        onRowClick={vi.fn()}
        positions={{ g1: { left: '10%', top: '20%' } }}
      />,
    )
    const cards = Array.from(container.querySelectorAll('.yf-cluster-card')) as HTMLElement[]
    // Primeira tarxeta = g1 (mesma orde que makeGroups)
    const g1 = cards[0]
    expect(g1?.style.left).toBe('10%')
    expect(g1?.style.top).toBe('20%')
  })

  it('positions ausente: anel automático coloca os grupos arredor do centro', () => {
    const { container } = render(
      <ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} autoRadiusPercent={30} />,
    )
    const cards = Array.from(container.querySelectorAll('.yf-cluster-card')) as HTMLElement[]
    // Co anel automático, ningunha tarxeta queda en 50%/50% (raio > 0).
    for (const card of cards) {
      const left = card.style.left
      const top = card.style.top
      expect(left).not.toBe('')
      expect(top).not.toBe('')
    }
    // O primeiro grupo arranca arriba (-π/2) → top < 50%.
    const first = cards[0]
    const topPercent = Number.parseFloat(first?.style.top.replace('%', '') ?? '0')
    expect(topPercent).toBeLessThan(50)
  })

  it('badge: ✓ se done, ct/mt se non', () => {
    const { container } = render(<ClusterCardsView groups={makeGroups()} onRowClick={vi.fn()} />)
    const badges = Array.from(container.querySelectorAll('.yf-cluster-row__badge')).map(
      (b) => b.textContent,
    )
    expect(badges).toContain('0/3')
    expect(badges).toContain('1/3')
    expect(badges).toContain('✓') // g1-c (3/3) e g2-a (1/1)
  })
})
// ── FIN: tests ClusterCardsView ──
