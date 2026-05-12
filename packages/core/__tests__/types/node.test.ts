// ── INICIO: tests de Node ──
import { describe, expect, it } from 'vitest'
import { type NodeDef, freezeNodeDef } from '../../src/types/index.js'

describe('freezeNodeDef', () => {
  it('freezes a basic node', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: 'X',
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen)).toBe(true)
  })

  it('freezes nested arrays', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: 'X',
      tags: ['a', 'b', 'c'],
      exclusions: ['y', 'z'],
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen.tags)).toBe(true)
    expect(Object.isFrozen(frozen.exclusions)).toBe(true)
  })

  it('freezes nested objects', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: 'X',
      position: { x: 0.5, y: 0.5 },
      metadata: { autor: 'agarfal', centro: 'IES' },
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen.position)).toBe(true)
    expect(Object.isFrozen(frozen.metadata)).toBe(true)
  })

  it('handles already frozen objects', () => {
    const node: NodeDef = Object.freeze({
      id: 'x',
      type: 'small',
      label: 'X',
    })
    const frozen = freezeNodeDef(node)
    expect(frozen).toBe(node) // Same reference
    expect(Object.isFrozen(frozen)).toBe(true)
  })

  it('freezes LocalizedString objects', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: { gl: 'Ola', es: 'Hola', en: 'Hello' },
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen.label)).toBe(true)
  })

  it('preserves all node fields', () => {
    const node: NodeDef = {
      id: 'panadeiro_forno',
      type: 'cluster',
      label: { gl: 'Forno', es: 'Horno', en: 'Oven' },
      icon: '🔥',
      color: '#e8a547',
      tier: 0,
      maxTier: 5,
      tags: ['cocina'],
      position: { x: 0.5, y: 0.18 },
    }
    const frozen = freezeNodeDef(node)
    expect(frozen.id).toBe('panadeiro_forno')
    expect(frozen.type).toBe('cluster')
    expect(frozen.tier).toBe(0)
    expect(frozen.maxTier).toBe(5)
  })
})
// ── FIN: tests de Node ──
