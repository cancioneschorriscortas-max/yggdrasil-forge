import { render } from '@testing-library/react'
// ── INICIO: tests MeshOverlay ──
import { describe, expect, it } from 'vitest'
import { MeshOverlay } from '../src/MeshOverlay.js'

/** Helper: busca ou falla. */
function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}

describe('MeshOverlay', () => {
  it('mesh undefined devolve null (cero render DOM)', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <MeshOverlay />
      </svg>,
    )
    expect(container.querySelector('.yf-mesh-overlay')).toBeNull()
  })

  it('mesh array vacío devolve null', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <MeshOverlay mesh={[]} />
      </svg>,
    )
    expect(container.querySelector('.yf-mesh-overlay')).toBeNull()
  })

  it("MeshElement 'line' renderiza <line> con x1/y1/x2/y2 correctos", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <MeshOverlay mesh={[{ type: 'line', from: { x: 1, y: 2 }, to: { x: 3, y: 4 } }]} />
      </svg>,
    )
    const line = q(container, '.yf-mesh-overlay__line')
    expect(line.getAttribute('x1')).toBe('1')
    expect(line.getAttribute('y1')).toBe('2')
    expect(line.getAttribute('x2')).toBe('3')
    expect(line.getAttribute('y2')).toBe('4')
  })

  it("MeshElement 'circle' renderiza <circle> con cx/cy/r correctos", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <MeshOverlay mesh={[{ type: 'circle', center: { x: 10, y: 20 }, radius: 5 }]} />
      </svg>,
    )
    const circle = q(container, '.yf-mesh-overlay__circle')
    expect(circle.getAttribute('cx')).toBe('10')
    expect(circle.getAttribute('cy')).toBe('20')
    expect(circle.getAttribute('r')).toBe('5')
  })

  it("MeshElement 'polygon' renderiza <polygon> con points correctos", () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <MeshOverlay
          mesh={[
            {
              type: 'polygon',
              points: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 5, y: 10 },
              ],
            },
          ]}
        />
      </svg>,
    )
    const polygon = q(container, '.yf-mesh-overlay__polygon')
    expect(polygon.getAttribute('points')).toBe('0,0 10,0 5,10')
  })

  it('mix de 3 tipos renderiza os 3 elementos na orde do array', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <MeshOverlay
          mesh={[
            { type: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
            { type: 'circle', center: { x: 5, y: 5 }, radius: 3 },
            {
              type: 'polygon',
              points: [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 0, y: 1 },
              ],
            },
          ]}
        />
      </svg>,
    )
    const group = q(container, '.yf-mesh-overlay')
    const children = group.children
    expect(children.length).toBe(3)
    expect(children[0]?.tagName.toLowerCase()).toBe('line')
    expect(children[1]?.tagName.toLowerCase()).toBe('circle')
    expect(children[2]?.tagName.toLowerCase()).toBe('polygon')
  })
})
// ── FIN: tests MeshOverlay ──
