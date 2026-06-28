import { fireEvent, render } from '@testing-library/react'
// ── INICIO: tests NodeInspector (render + interaccións) ──
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it, vi } from 'vitest'
import { NodeInspector } from '../../src/inspector/NodeInspector.js'

function makeNode(overrides: Partial<NodeDef> = {}): NodeDef {
  return {
    id: 'amasado',
    type: 'small',
    label: { gl: 'Amasado', en: 'Kneading' },
    description: { gl: 'Mans na masa', en: 'Hands on dough' },
    maxTier: 3,
    content: {
      flavor: { gl: '"A masa fala coas mans"', en: '"Dough speaks through hands"' },
    },
    ...overrides,
  } as NodeDef
}

describe('NodeInspector — render', () => {
  it('label resolto coa locale (default en)', () => {
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={0} canIncrease={true} />,
    )
    expect(container.querySelector('h2')?.textContent).toBe('Kneading')
  })

  it('label resolto coa locale gl cando se pasa', () => {
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={0} canIncrease={true} locale="gl" />,
    )
    expect(container.querySelector('h2')?.textContent).toBe('Amasado')
  })

  it('strings default en (LEVELS, KEY ACTION)', () => {
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={1} canIncrease={true} />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('LEVELS')
    expect(text).toContain('KEY ACTION')
  })

  it('strings override (galego) substitúe os defaults', () => {
    const { container } = render(
      <NodeInspector
        node={makeNode()}
        currentTier={1}
        canIncrease={true}
        strings={{ levels: 'NIVEIS', keyAction: 'ACCIÓN CLAVE' }}
      />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('NIVEIS')
    expect(text).toContain('ACCIÓN CLAVE')
    expect(text).not.toContain('LEVELS')
  })

  it('badge: NIVEL X DE Y cando hai progreso', () => {
    const { container } = render(
      <NodeInspector
        node={makeNode()}
        currentTier={1}
        canIncrease={true}
        strings={{ levelWord: 'NIVEL', ofWord: 'DE' }}
      />,
    )
    expect(container.textContent ?? '').toContain('NIVEL 2 DE 3')
  })

  it('badge: · MAX cando ct === maxTier', () => {
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={3} canIncrease={false} />,
    )
    expect(container.textContent ?? '').toContain('MAX')
  })

  it('renderiza 3 filas tier para maxTier=3', () => {
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={1} canIncrease={true} />,
    )
    const tiers = container.querySelectorAll('.yf-node-inspector__tier')
    expect(tiers.length).toBe(3)
  })

  it('botón "Subir nivel": chamar onIncreaseTier co id do nodo', () => {
    const onIncrease = vi.fn()
    const { getByRole } = render(
      <NodeInspector
        node={makeNode()}
        currentTier={1}
        canIncrease={true}
        onIncreaseTier={onIncrease}
      />,
    )
    // botón aparece como o ÚLTIMO botón render (close é o primeiro).
    const buttons = document.querySelectorAll('button')
    const actionButton = buttons[buttons.length - 1]
    if (actionButton === undefined) throw new Error('no action button')
    fireEvent.click(actionButton)
    expect(onIncrease).toHaveBeenCalledWith('amasado')
    // close button tamén funciona
    void getByRole
  })

  it('botón "Subir nivel" desactivado se canIncrease=false', () => {
    const onIncrease = vi.fn()
    const { container } = render(
      <NodeInspector
        node={makeNode()}
        currentTier={3}
        canIncrease={false}
        onIncreaseTier={onIncrease}
      />,
    )
    const action = container.querySelector('.yf-node-inspector__action') as HTMLButtonElement | null
    expect(action?.disabled).toBe(true)
  })

  it('botón "×": chama onClose', () => {
    const onClose = vi.fn()
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={0} canIncrease={true} onClose={onClose} />,
    )
    const close = container.querySelector('.yf-node-inspector__close') as HTMLButtonElement | null
    expect(close).not.toBeNull()
    if (close === null) return
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalled()
  })

  it('vídeo: ocultado se non hai metadata.gaia.video.url', () => {
    const { container } = render(
      <NodeInspector node={makeNode()} currentTier={0} canIncrease={true} />,
    )
    expect(container.querySelector('.yf-node-inspector__video')).toBeNull()
  })

  it('vídeo: renderVideo custom úsase cando hai url', () => {
    const node = makeNode({
      metadata: { gaia: { video: { url: 'https://example.com/v.mp4' } } },
    })
    const renderVideo = vi.fn((url: string) => <span data-testid="custom-video">{url}</span>)
    const { getByTestId } = render(
      <NodeInspector node={node} currentTier={0} canIncrease={true} renderVideo={renderVideo} />,
    )
    expect(getByTestId('custom-video').textContent).toBe('https://example.com/v.mp4')
    expect(renderVideo).toHaveBeenCalledOnce()
  })
})
// ── FIN: tests NodeInspector ──
