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

// ── 17.2: paridade de iconas — os tres camiños da cela ──
describe('17.2 — RowIcon: IconDef | string, nunca descarte silencioso', () => {
  const DATA_URI = 'data:image/svg+xml;base64,PHN2Zy8+'

  function makeIconGroups(): ClusterGroup[] {
    return [
      {
        id: 'g1',
        label: 'ICONAS',
        color: '#aabbcc',
        members: [
          {
            id: 'glyph',
            label: 'Glyph',
            icon: { viewBox: '0 0 24 24', paths: [{ d: 'M4 4L20 20', mode: 'stroke' as const }] },
            currentTier: 0,
            maxTier: 1,
          },
          { id: 'foto', label: 'Foto', icon: DATA_URI, currentTier: 0, maxTier: 1 },
          { id: 'emoji', label: 'Emoji', icon: '🔥', currentTier: 0, maxTier: 1 },
        ],
      },
    ]
  }

  it('IconDef → glyph SVG (como sempre)', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const cell = container.querySelectorAll('.yf-cluster-row__icon')[0]
    expect(cell?.querySelector('svg path')?.getAttribute('d')).toBe('M4 4L20 20')
  })

  it('string-imaxe (data-URI) → <img> con src, alt da label e lazy', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const img = container.querySelectorAll('.yf-cluster-row__icon')[1]?.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe(DATA_URI)
    expect(img?.getAttribute('alt')).toBe('Foto')
    expect(img?.getAttribute('loading')).toBe('lazy')
  })

  it('string-URL http(s) → <img> (mesmo criterio F11.3 có SkillNode)', () => {
    const groups: ClusterGroup[] = [
      {
        id: 'g1',
        label: 'URL',
        color: '#aabbcc',
        members: [
          {
            id: 'u',
            label: 'Retrato',
            icon: 'https://example.test/cara.png',
            currentTier: 0,
            maxTier: 1,
          },
        ],
      },
    ]
    const { container } = render(<ClusterCardsView groups={groups} onRowClick={vi.fn()} />)
    expect(container.querySelector('.yf-cluster-row__icon img')?.getAttribute('src')).toBe(
      'https://example.test/cara.png',
    )
  })

  it('calquera outro string → texto/emoji (nunca null silencioso)', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const cell = container.querySelectorAll('.yf-cluster-row__icon')[2]
    expect(cell?.textContent).toBe('🔥')
    expect(cell?.querySelector('img')).toBeNull()
    expect(cell?.querySelector('svg')).toBeNull()
  })

  it('snapshot da fila cos tres camiños', () => {
    const { container } = render(
      <ClusterCardsView groups={makeIconGroups()} onRowClick={vi.fn()} />,
    )
    const cells = [...container.querySelectorAll('.yf-cluster-row__icon')].map((c) => c.innerHTML)
    expect(cells).toMatchSnapshot()
  })
})
// ── FIN 17.2 ──
