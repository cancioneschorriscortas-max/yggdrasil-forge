import { fireEvent, render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { renderToString } from 'react-dom/server'
// ── INICIO: tests SkillTree + SkillNode + SkillEdge ──
import { describe, expect, it, vi } from 'vitest'
import { SkillEdge } from '../src/SkillEdge.js'
import { SkillNode } from '../src/SkillNode.js'
import { SkillTree } from '../src/SkillTree.js'

// ── Helpers ──

function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
    ...overrides,
  }
}

function makeTreeEngine(treeDef?: TreeDef): TreeEngine {
  return new TreeEngine(treeDef ?? makeMinimalTreeDef())
}

/** Busca un elemento DOM e falla explícitamente se non existe. */
function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}

// ── Bloque 1: Renderizado SVG básico ──

describe('SkillTree — renderizado SVG básico', () => {
  it('renderiza svg cunha class yf-skill-tree e viewBox correcto', () => {
    const engine = makeTreeEngine()
    const { container } = render(<SkillTree engine={engine} />)
    const svg = q(container, 'svg')
    expect(svg.getAttribute('class')).toBe('yf-skill-tree')
    expect(svg.getAttribute('viewBox')).toBeTruthy()
    expect(svg.getAttribute('data-layout')).toBe('custom')
  })

  it('renderiza N nodos correspondentes ás entradas de treeDef.nodes', () => {
    const engine = makeTreeEngine()
    const { container } = render(<SkillTree engine={engine} />)
    const nodes = container.querySelectorAll('.yf-skill-node')
    expect(nodes.length).toBe(2)
    expect(q(container, '[data-node-id="a"]')).toBeTruthy()
    expect(q(container, '[data-node-id="b"]')).toBeTruthy()
  })

  it('renderiza N edges correspondentes ás entradas de treeDef.edges', () => {
    const engine = makeTreeEngine()
    const { container } = render(<SkillTree engine={engine} />)
    const edges = container.querySelectorAll('.yf-skill-edge')
    expect(edges.length).toBe(1)
    const edge = q(container, '[data-edge-id="a-b"]')
    expect(edge.getAttribute('data-source')).toBe('a')
    expect(edge.getAttribute('data-target')).toBe('b')
  })
})

// ── Bloque 2: SkillNode atributos ──

describe('SkillNode — atributos', () => {
  it('ten data-state correcto baseado en instance.state', () => {
    const engine = makeTreeEngine()
    const { container } = render(<SkillTree engine={engine} />)
    const nodeA = q(container, '[data-node-id="a"]')
    const state = nodeA.getAttribute('data-state')
    expect(['locked', 'unlockable', 'unlocked', 'maxed', 'in_progress']).toContain(state)
  })

  it('mostra texto de progress cando instance.progress está definido', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillNode
          node={{ id: 'p', type: 'small', label: 'Progress' }}
          instance={{
            id: 'p',
            state: 'in_progress',
            currentTier: 0,
            progress: 50,
          }}
          position={{ x: 0, y: 0 }}
        />
      </svg>,
    )
    const progressText = q(container, '.yf-skill-node__progress')
    expect(progressText.textContent).toBe('50%')
  })
})

// ── Bloque 3: SkillEdge paths ──

describe('SkillEdge — paths', () => {
  it('con kind line produce d="M ... L ..."', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillEdge
          edgeId="e1"
          edge={{ id: 'e1', source: 'a', target: 'b', type: 'dependency' }}
          path={{
            points: [
              { x: 0, y: 0 },
              { x: 10, y: 20 },
            ],
            kind: 'line',
          }}
        />
      </svg>,
    )
    const path = q(container, 'path')
    expect(path.getAttribute('d')).toBe('M 0 0 L 10 20')
  })

  it('con kind cubic produce d="M ... C ..."', () => {
    const { container } = render(
      <svg role="img" aria-label="test">
        <SkillEdge
          edgeId="e2"
          edge={{ id: 'e2', source: 'a', target: 'b', type: 'dependency' }}
          path={{
            points: [
              { x: 0, y: 0 },
              { x: 5, y: 10 },
              { x: 15, y: 10 },
              { x: 20, y: 0 },
            ],
            kind: 'cubic',
          }}
        />
      </svg>,
    )
    const path = q(container, 'path')
    expect(path.getAttribute('d')).toBe('M 0 0 C 5 10, 15 10, 20 0')
  })
})

// ── Bloque 4: Interacción ──

describe('SkillTree — interacción', () => {
  it('onNodeClick chámase ao clicar un nodo', () => {
    const engine = makeTreeEngine()
    const handleClick = vi.fn()
    const { container } = render(<SkillTree engine={engine} onNodeClick={handleClick} />)
    fireEvent.click(q(container, '[data-node-id="a"]'))
    expect(handleClick).toHaveBeenCalledWith('a')
  })

  it('onEdgeClick chámase ao clicar un edge', () => {
    const engine = makeTreeEngine()
    const handleClick = vi.fn()
    const { container } = render(<SkillTree engine={engine} onEdgeClick={handleClick} />)
    fireEvent.click(q(container, '[data-edge-id="a-b"]'))
    expect(handleClick).toHaveBeenCalledWith('a-b')
  })
})

// ── Bloque 5: SSR + Reactividade + Erro ──

describe('SkillTree — SSR + reactividade + erro', () => {
  it('renderToString produce HTML válido sen lanzar', () => {
    const engine = makeTreeEngine()
    const html = renderToString(<SkillTree engine={engine} />)
    expect(html).toContain('yf-skill-tree')
    expect(html).toContain('yf-skill-node')
    expect(html).toContain('yf-skill-edge')
    expect(html).toContain('data-node-id="a"')
  })

  it('engine.unlock dispara re-render con data-state actualizado', async () => {
    const treeDef = makeMinimalTreeDef({
      nodes: [{ id: 'root', type: 'small', label: 'Root' }],
      edges: [],
    })
    const engine = new TreeEngine(treeDef)
    const { container } = render(<SkillTree engine={engine} />)

    // Unlock
    const result = await engine.unlock('root')
    expect(result.ok).toBe(true)

    // Tras unlock, data-state debe ser 'unlocked' ou 'maxed'
    const nodePost = q(container, '[data-node-id="root"]')
    const state = nodePost.getAttribute('data-state')
    expect(['unlocked', 'maxed']).toContain(state)
  })

  it('layout type descoñecido produce SVG con class yf-skill-tree--error', () => {
    const treeDef = makeMinimalTreeDef({
      layout: { type: 'unknown-layout' },
    })
    const engine = new TreeEngine(treeDef)
    const { container } = render(<SkillTree engine={engine} />)
    const svg = q(container, 'svg')
    expect(svg.getAttribute('class')).toContain('yf-skill-tree--error')
    expect(svg.getAttribute('data-error')).toBeTruthy()
    expect(container.querySelectorAll('.yf-skill-node').length).toBe(0)
  })
})

// ── Bloque 6: Integración MeshOverlay ──

describe('SkillTree — integración con MeshOverlay', () => {
  it('con RadialLayout, MeshOverlay está presente no DOM', () => {
    const treeDef = makeMinimalTreeDef({
      nodes: [
        { id: 'a', type: 'small', label: 'A' },
        { id: 'b', type: 'small', label: 'B' },
        { id: 'c', type: 'small', label: 'C' },
      ],
      edges: [
        { id: 'a-b', source: 'a', target: 'b', type: 'dependency' },
        { id: 'b-c', source: 'b', target: 'c', type: 'dependency' },
      ],
      layout: { type: 'radial', radius: 100 },
    })
    const engine = new TreeEngine(treeDef)
    const { container } = render(<SkillTree engine={engine} />)
    expect(container.querySelector('.yf-mesh-overlay')).not.toBeNull()
  })

  it('con IdentityLayout, MeshOverlay non está presente no DOM', () => {
    const engine = makeTreeEngine() // usa layout type: 'custom' (IdentityLayout)
    const { container } = render(<SkillTree engine={engine} />)
    expect(container.querySelector('.yf-mesh-overlay')).toBeNull()
  })

  it('refactor preserva os 12 tests previos (verificación automática)', () => {
    // Este test verifica que SkillTree post-refactor segue producindo
    // a mesma estrutura DOM (svg > g.yf-skill-edges + g.yf-skill-nodes)
    const engine = makeTreeEngine()
    const { container } = render(<SkillTree engine={engine} />)
    const svg = q(container, 'svg')
    expect(svg.getAttribute('class')).toBe('yf-skill-tree')
    expect(container.querySelector('.yf-skill-edges')).not.toBeNull()
    expect(container.querySelector('.yf-skill-nodes')).not.toBeNull()
    expect(container.querySelectorAll('.yf-skill-node').length).toBe(2)
    expect(container.querySelectorAll('.yf-skill-edge').length).toBe(1)
  })

  it('SkillTree pasa onNodeLongPress a SkillNode (pass-through)', () => {
    vi.useFakeTimers()
    const onNodeLongPress = vi.fn()
    const treeDef = makeMinimalTreeDef({
      nodes: [{ id: 'root', type: 'small', label: 'Root' }],
      edges: [],
    })
    const engine = new TreeEngine(treeDef)
    const { container } = render(<SkillTree engine={engine} onNodeLongPress={onNodeLongPress} />)
    const node = container.querySelector('[data-node-id="root"]')
    expect(node).not.toBeNull()
    fireEvent.pointerDown(node as Element)
    vi.advanceTimersByTime(700)
    expect(onNodeLongPress).toHaveBeenCalledWith('root')
    vi.useRealTimers()
  })
})
// ── FIN: tests SkillTree + SkillNode + SkillEdge ──
