// ── INICIO: tests SkillTree F10.7 (selección + hover propagation) ──
import { fireEvent, render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it, vi } from 'vitest'
import { SkillTree } from '../src/SkillTree.js'

function makeTwoNodeTree(): TreeDef {
  return {
    id: 'sel-test',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Sel',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
  }
}

function q(container: HTMLElement, selector: string): Element {
  const el = container.querySelector(selector)
  if (!el) throw new Error(`Expected element matching "${selector}"`)
  return el
}

describe('SkillTree.selectedNodeId (F10.7)', () => {
  it('marca o nodo cuxo id coincide con `selectedNodeId`', () => {
    const engine = new TreeEngine(makeTwoNodeTree())
    const { container } = render(<SkillTree engine={engine} selectedNodeId="b" />)
    const a = q(container, '[data-node-id="a"]')
    const b = q(container, '[data-node-id="b"]')
    expect(a.getAttribute('data-selected')).toBeNull()
    expect(b.getAttribute('data-selected')).toBe('true')
  })

  it('cero `selectedNodeId`: ningún nodo seleccionado', () => {
    const engine = new TreeEngine(makeTwoNodeTree())
    const { container } = render(<SkillTree engine={engine} />)
    expect(q(container, '[data-node-id="a"]').getAttribute('data-selected')).toBeNull()
    expect(q(container, '[data-node-id="b"]').getAttribute('data-selected')).toBeNull()
  })

  it('`selectedNodeId` apuntando a id inexistente: cero selección, sen erro', () => {
    const engine = new TreeEngine(makeTwoNodeTree())
    const { container } = render(<SkillTree engine={engine} selectedNodeId="ghost" />)
    expect(q(container, '[data-node-id="a"]').getAttribute('data-selected')).toBeNull()
    expect(q(container, '[data-node-id="b"]').getAttribute('data-selected')).toBeNull()
  })
})

describe('SkillTree.onNodeHover (F10.7)', () => {
  it('dispárase con id ao entrar nun nodo, con null ao saír', () => {
    const onNodeHover = vi.fn()
    const engine = new TreeEngine(makeTwoNodeTree())
    const { container } = render(
      <SkillTree engine={engine} onNodeClick={vi.fn()} onNodeHover={onNodeHover} />,
    )
    const a = q(container, '[data-node-id="a"]')
    fireEvent.pointerEnter(a)
    expect(onNodeHover).toHaveBeenLastCalledWith('a')
    fireEvent.pointerLeave(a)
    expect(onNodeHover).toHaveBeenLastCalledWith(null)
  })

  it('hover nun nodo despois doutro emite a secuencia correcta', () => {
    const onNodeHover = vi.fn()
    const engine = new TreeEngine(makeTwoNodeTree())
    const { container } = render(<SkillTree engine={engine} onNodeHover={onNodeHover} />)
    const a = q(container, '[data-node-id="a"]')
    const b = q(container, '[data-node-id="b"]')
    fireEvent.pointerEnter(a)
    fireEvent.pointerLeave(a)
    fireEvent.pointerEnter(b)
    fireEvent.pointerLeave(b)
    expect(onNodeHover.mock.calls.map((c) => c[0])).toEqual(['a', null, 'b', null])
  })
})
// ── FIN: tests SkillTree F10.7 ──
