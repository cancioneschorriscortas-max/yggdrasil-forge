// ── INICIO: tests usability (7.5c-U) ──
// Cobertura obrigatoria: ningún valor de enum pode chegar á UI en
// cru. Se @core engade un valor a NodeType/NodeShape/effect, o mapa
// de localización debe cubrilo.

import { SUPPORTED_EFFECT_TYPES, UNSUPPORTED_EFFECT_TYPES } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import {
  EFFECT_TYPE_LABELS,
  NODE_SHAPE_LABELS,
  NODE_SHAPE_OPTIONS,
  NODE_TYPE_LABELS,
  NODE_TYPE_OPTIONS,
  getEffectTypeDescribe,
  getEffectTypeLabel,
  getNodeShapeLabel,
  getNodeTypeDescribe,
  getNodeTypeLabel,
  nodePropertyRegistry,
} from '../src/index.js'

describe('★ Cobertura de localización — enums (Briefing 7.5c-U §6)', () => {
  it('NODE_TYPE_LABELS cobre TODOS os valores de NODE_TYPE_OPTIONS', () => {
    for (const v of NODE_TYPE_OPTIONS) {
      expect(NODE_TYPE_LABELS[v]).toBeDefined()
      expect(NODE_TYPE_LABELS[v].label).toBeDefined()
    }
  })

  it('cada NodeType ten label gl definido (non se filtra valor cru)', () => {
    for (const v of NODE_TYPE_OPTIONS) {
      const label = NODE_TYPE_LABELS[v].label
      expect(typeof label === 'object' ? label.gl : label).toBeDefined()
    }
  })

  it('cada NodeType ten describe gl (contido validado no Briefing §7)', () => {
    for (const v of NODE_TYPE_OPTIONS) {
      const desc = NODE_TYPE_LABELS[v].describe
      expect(desc).toBeDefined()
      const gl = typeof desc === 'object' ? desc?.gl : desc
      expect(gl).toBeDefined()
    }
  })

  it('NODE_SHAPE_LABELS cobre TODOS os valores', () => {
    for (const v of NODE_SHAPE_OPTIONS) {
      expect(NODE_SHAPE_LABELS[v]).toBeDefined()
      expect(NODE_SHAPE_LABELS[v].label).toBeDefined()
    }
  })

  it('EFFECT_TYPE_LABELS cobre TODOS os SUPPORTED_EFFECT_TYPES', () => {
    for (const t of SUPPORTED_EFFECT_TYPES) {
      expect(EFFECT_TYPE_LABELS[t]).toBeDefined()
      expect(EFFECT_TYPE_LABELS[t].label).toBeDefined()
    }
  })

  it('EFFECT_TYPE_LABELS NON inclúe os UNSUPPORTED (modify_stat, plugin)', () => {
    for (const t of UNSUPPORTED_EFFECT_TYPES) {
      expect((EFFECT_TYPE_LABELS as Record<string, unknown>)[t]).toBeUndefined()
    }
  })

  it('cada effect type ten describe gl', () => {
    for (const t of SUPPORTED_EFFECT_TYPES) {
      const desc = EFFECT_TYPE_LABELS[t].describe
      expect(desc).toBeDefined()
      const gl = typeof desc === 'object' ? desc?.gl : desc
      expect(gl).toBeDefined()
    }
  })
})

describe('Getters localizados', () => {
  it('getNodeTypeLabel devolve gl por defecto', () => {
    expect(getNodeTypeLabel('subtree_anchor')).toBe('Áncora de subárbore')
    expect(getNodeTypeLabel('keystone')).toBe('Clave')
  })

  it('getNodeTypeLabel devolve en cando se pide', () => {
    expect(getNodeTypeLabel('subtree_anchor', 'en')).toBe('Subtree anchor')
  })

  it('getNodeTypeDescribe honestidade: subtree_anchor menciona "único tipo con comportamento real"', () => {
    const desc = getNodeTypeDescribe('subtree_anchor')
    expect(desc).toContain('único tipo con comportamento real')
  })

  it('getNodeShapeLabel: rombo/hexágono en gl', () => {
    expect(getNodeShapeLabel('diamond')).toBe('Rombo')
    expect(getNodeShapeLabel('hexagon')).toBe('Hexágono')
  })

  it('getEffectTypeLabel: modify_resource → "Modificar recurso"', () => {
    expect(getEffectTypeLabel('modify_resource')).toBe('Modificar recurso')
  })

  it('getEffectTypeLabel: tipo descoñecido → devolve valor cru (defensivo)', () => {
    expect(getEffectTypeLabel('invented_type')).toBe('invented_type')
  })

  it('getEffectTypeDescribe: modify_resource ten axuda gl', () => {
    expect(getEffectTypeDescribe('modify_resource')).toContain('recurso')
  })
})

describe('★ Cobertura de labels + describe no registry', () => {
  it('todo descriptor ten label + describe', () => {
    for (const d of nodePropertyRegistry) {
      expect(d.label).toBeDefined()
      expect(d.describe).toBeDefined()
    }
  })

  it('todo descriptor ten label en galego (non xerga inglesa)', () => {
    for (const d of nodePropertyRegistry) {
      const gl = typeof d.label === 'object' ? d.label.gl : d.label
      expect(gl).toBeDefined()
      // Non pode ser un string tipo "tier" ou "maxTier" cru.
      expect(gl).not.toMatch(/^[a-z_]+$/)
    }
  })

  it('todo descriptor ten describe en galego', () => {
    for (const d of nodePropertyRegistry) {
      const desc = d.describe
      const gl = typeof desc === 'object' ? desc?.gl : desc
      expect(gl).toBeDefined()
    }
  })
})

describe('★ Flag advanced (partición Básico vs Avanzado)', () => {
  it('Básico contén: label, description, color, icon, shape, size', () => {
    const basic = nodePropertyRegistry.filter((d) => d.advanced !== true && d.readonly !== true)
    const keys = new Set(basic.map((d) => d.key))
    for (const expected of ['label', 'description', 'color', 'icon', 'shape', 'size']) {
      expect(keys.has(expected)).toBe(true)
    }
  })

  it('Avanzado contén: type, maxTier, prerequisites, exclusions, effects, cost, costPerTier, tiers', () => {
    const advanced = nodePropertyRegistry.filter((d) => d.advanced === true)
    const keys = new Set(advanced.map((d) => d.key))
    for (const expected of [
      'type',
      'maxTier',
      'prerequisites',
      'exclusions',
      'effects',
      'cost',
      'costPerTier',
      'tiers',
    ]) {
      expect(keys.has(expected)).toBe(true)
    }
  })

  it('★ tier NON está en Avanzado (retirado do Inspector en 7.5c-T)', () => {
    const keys = new Set(nodePropertyRegistry.map((d) => d.key))
    expect(keys.has('tier')).toBe(false)
  })

  it('id: readonly, NON está en Básico nin Avanzado (vai na cabeceira)', () => {
    const idDesc = nodePropertyRegistry.find((d) => d.key === 'id')
    expect(idDesc?.readonly).toBe(true)
    expect(idDesc?.advanced).toBeUndefined()
  })
})

describe('Labels renomeados (7.5c-U + 7.5c-T)', () => {
  it('★ maxTier → "Rangos" (7.5c-T: renomeo desde "Nivel máximo")', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'maxTier')
    const gl = typeof desc?.label === 'object' ? desc.label.gl : desc?.label
    expect(gl).toBe('Rangos')
  })

  it('★ maxTier describe ten exemplo Mk.I → Mk.II → Mk.III', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'maxTier')
    const gl = typeof desc?.describe === 'object' ? desc.describe.gl : desc?.describe
    expect(gl).toContain('Mk.I')
    expect(gl).toContain('Mk.II')
    expect(gl).toContain('Mk.III')
    // Menciona ambos "rangos" e "etapas" para cubrir contextos xogo/educación.
    expect(gl).toContain('rangos')
    expect(gl).toContain('etapas')
  })

  it('costPerTier → "Custo por nivel"', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'costPerTier')
    const gl = typeof desc?.label === 'object' ? desc.label.gl : desc?.label
    expect(gl).toBe('Custo por nivel')
  })

  it('tiers → "Info de niveis"', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'tiers')
    const gl = typeof desc?.label === 'object' ? desc.label.gl : desc?.label
    expect(gl).toBe('Info de niveis')
  })

  it('prerequisites → "Requisitos"', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'prerequisites')
    const gl = typeof desc?.label === 'object' ? desc.label.gl : desc?.label
    expect(gl).toBe('Requisitos')
  })
})
// ── FIN: tests usability ──
