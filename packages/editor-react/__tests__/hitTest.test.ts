// ── INICIO: tests hitTest ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { hitTestNode, nodesInRect } from '../src/canvas/internals/hitTest.js'

const tree: TreeDef = {
  id: 'hit-test',
  schemaVersion: '1.0.0',
  version: '0.1.0',
  label: { en: 'Hit test' },
  groups: [],
  nodes: [
    { id: 'a', type: 'small', label: { en: 'A' }, position: { x: 0, y: 0 } },
    { id: 'b', type: 'small', label: { en: 'B' }, position: { x: 100, y: 0 } },
    { id: 'c', type: 'small', label: { en: 'C' }, position: { x: 200, y: 200 } },
    { id: 'no-pos', type: 'small', label: { en: 'No position' } },
  ],
  edges: [],
  layout: { type: 'custom' },
} as TreeDef

describe('hitTestNode', () => {
  it('punto exacto sobre nodo → hit', () => {
    expect(hitTestNode({ x: 0, y: 0 }, tree)).toEqual({ kind: 'node', id: 'a' })
  })

  it('punto dentro do radio (default 30) → hit', () => {
    expect(hitTestNode({ x: 10, y: 15 }, tree)).toEqual({ kind: 'node', id: 'a' })
  })

  it('punto xusto fóra do radio → null', () => {
    expect(hitTestNode({ x: 50, y: 0 }, tree)).toBeNull()
  })

  it('punto cerca de outro nodo distinto → hit ese', () => {
    expect(hitTestNode({ x: 105, y: 5 }, tree)).toEqual({ kind: 'node', id: 'b' })
  })

  it('nodos sin position → ignorados (non rebotan)', () => {
    // 'no-pos' non ten position; non debería casar nada se a posición non hai
    expect(hitTestNode({ x: 5000, y: 5000 }, tree)).toBeNull()
  })

  it('radio custom: 5 → solo punto exacto', () => {
    expect(hitTestNode({ x: 4, y: 0 }, tree, 5)).toEqual({ kind: 'node', id: 'a' })
    expect(hitTestNode({ x: 6, y: 0 }, tree, 5)).toBeNull()
  })
})

describe('nodesInRect', () => {
  it('rect que contén os tres nodos → 3 refs', () => {
    const refs = nodesInRect({ x: -10, y: -10, width: 300, height: 300 }, tree)
    expect(refs.length).toBe(3)
    expect(new Set(refs.map((r) => r.id))).toEqual(new Set(['a', 'b', 'c']))
  })

  it('rect que só contén "a" → 1 ref', () => {
    const refs = nodesInRect({ x: -10, y: -10, width: 50, height: 50 }, tree)
    expect(refs.length).toBe(1)
    expect(refs[0]?.id).toBe('a')
  })

  it('rect baleiro (fóra de todo) → 0 refs', () => {
    const refs = nodesInRect({ x: 500, y: 500, width: 50, height: 50 }, tree)
    expect(refs.length).toBe(0)
  })

  it('nodos sin position → ignorados (no-pos non aparece nunca)', () => {
    const refs = nodesInRect({ x: -10000, y: -10000, width: 20000, height: 20000 }, tree)
    expect(refs.find((r) => r.id === 'no-pos')).toBeUndefined()
  })
})
// ── FIN: tests hitTest ──
