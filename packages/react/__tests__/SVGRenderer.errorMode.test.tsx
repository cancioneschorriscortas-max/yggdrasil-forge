// ── INICIO: tests SVGRenderer — modo erro visible en DEV ──
//
// Cobre o cambio: cando `computeLayout` falla, en DEV mostramos un
// banner co código + mensaxe; en PROD mantemos o svg baleiro de antes.

import { render } from '@testing-library/react'
import type { TreeDef } from '@yggdrasil-forge/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SVGRenderer } from '../src/SVGRenderer.js'
import { SkillTree } from '../src/SkillTree.js'

describe('SVGRenderer — modo erro (DEV vs PROD)', () => {
  it('DEV (NODE_ENV !== "production"): banner con código + mensaxe + nota', () => {
    const { container } = render(<SVGRenderer error="YGG_L002" errorMessage="radius must be > 0" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('data-error')).toBe('YGG_L002')
    // viewBox fixo en DEV.
    expect(svg?.getAttribute('viewBox')).toBe('0 0 320 120')
    const text = svg?.textContent ?? ''
    expect(text).toContain('Layout error: YGG_L002')
    expect(text).toContain('radius must be > 0')
    expect(text).toContain('visible in dev only')
  })

  it('DEV sen errorMessage: banner amosa só o código + nota', () => {
    const { container } = render(<SVGRenderer error="YGG_L002" />)
    const svg = container.querySelector('svg')
    const text = svg?.textContent ?? ''
    expect(text).toContain('Layout error: YGG_L002')
    expect(text).toContain('visible in dev only')
    // O <text> da mensaxe non existe; só o do código e o do disclaimer.
    expect(svg?.querySelectorAll('text').length).toBe(2)
  })

  describe('PROD (NODE_ENV = "production")', () => {
    const original = process.env.NODE_ENV
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })
    afterEach(() => {
      if (original === undefined) {
        process.env.NODE_ENV = undefined as unknown as string
      } else {
        process.env.NODE_ENV = original
      }
    })

    it('SVG baleiro (sen <g>, sen <text>, sen <rect>) — saída idéntica á previa', () => {
      const { container } = render(<SVGRenderer error="YGG_L002" errorMessage="msg" />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg?.getAttribute('data-error')).toBe('YGG_L002')
      expect(svg?.querySelector('g')).toBeNull()
      expect(svg?.querySelector('text')).toBeNull()
      expect(svg?.querySelector('rect')).toBeNull()
      // aria-label xenérico en PROD (sen revelar o código).
      expect(svg?.getAttribute('aria-label')).toBe('Skill tree (layout error)')
    })
  })
})

describe('SkillTree — propaga mensaxe ao SVGRenderer cando computeLayout falla', () => {
  it('en DEV o banner amosa o código + a mensaxe do error', () => {
    // RadialLayout require `radius` obrigatorio; sen el → YGG_L002.
    const badDef: TreeDef = {
      id: 'bad',
      schemaVersion: 1,
      version: '1.0.0',
      label: { en: 'Bad' },
      layout: { type: 'radial' } as unknown as TreeDef['layout'],
      nodes: [{ id: 'a', type: 'small', label: { en: 'A' } }],
      edges: [],
    }
    // Snapshot ESTABLE (mesma referencia entre chamadas) para evitar que
    // `useSyncExternalStore` interprete cada read como un cambio e dispare
    // un loop infinito de re-render.
    const stableSnap = { nodes: {}, subtreeStates: {} } as unknown as ReturnType<
      import('@yggdrasil-forge/core').TreeEngine['getSnapshot']
    >
    const stubEngine = {
      subscribe(_c: () => void): () => void {
        return () => {
          /* noop */
        }
      },
      getSnapshot() {
        return stableSnap
      },
      getServerSnapshot() {
        return stableSnap
      },
      getTreeDef() {
        return badDef
      },
    } as unknown as import('@yggdrasil-forge/core').TreeEngine
    const { container } = render(<SkillTree engine={stubEngine} />)
    const svg = container.querySelector('svg.yf-skill-tree--error')
    expect(svg).not.toBeNull()
    const text = svg?.textContent ?? ''
    expect(text).toContain('Layout error:')
    // A mensaxe exacta do error de validación pode cambiar; asegúrase que
    // algunha mensaxe non baleira se renderiza (presenza de texto adicional
    // alén do título e da nota).
    expect(text.length).toBeGreaterThan('Layout error: YGG_L002(visible in dev only)'.length)
  })
})
// ── FIN: tests SVGRenderer — modo erro visible en DEV ──
