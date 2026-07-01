// ── INICIO: tests Property Registry ──
import type { NodeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import type { PropertyDescriptor } from '../src/index.js'
import { NODE_SHAPE_OPTIONS, NODE_TYPE_OPTIONS, nodePropertyRegistry } from '../src/index.js'

const sampleNode: NodeDef = {
  id: 'pan_basico',
  type: 'notable',
  label: { en: 'Basic bread', gl: 'Pan básico' },
  description: { en: 'A simple loaf', gl: 'Un pan sinxelo' },
  color: '#cc6600',
  icon: '🍞',
  shape: 'hexagon',
  size: 2,
  tier: 1,
  maxTier: 3,
  position: { x: 100, y: 50 },
}

const sampleNodeMinimal: NodeDef = {
  id: 'minimal',
  type: 'small',
  label: 'Plain label',
}

describe('nodePropertyRegistry — cobertura', () => {
  it('inclúe os 9 escalares + 6 estruturados (=15, tras retirar `tier` en 7.5c-T)', () => {
    expect(nodePropertyRegistry.length).toBe(15)
  })

  it('inclúe os campos escalares esperados', () => {
    const keys = nodePropertyRegistry.map((d) => d.key)
    for (const expected of [
      'id',
      'type',
      'label',
      'description',
      'color',
      'icon',
      'shape',
      'size',
      'maxTier',
    ]) {
      expect(keys).toContain(expected)
    }
  })

  it('★ tier retirado do Inspector (7.5c-T, agora @deprecated no schema)', () => {
    const keys = nodePropertyRegistry.map((d) => d.key)
    expect(keys).not.toContain('tier')
  })

  it('inclúe os campos estruturados (declarados, edición en 7.5c-ii)', () => {
    const structured = nodePropertyRegistry.filter((d) => d.type.kind === 'structured')
    expect(structured.length).toBe(6)
    const ofs = structured.map((d) => (d.type as { of: string }).of)
    expect(new Set(ofs)).toEqual(
      new Set(['cost', 'costPerTier', 'tiers', 'effects', 'prerequisites', 'exclusions']),
    )
  })

  it('agrupa correctamente: id/type/label/description en identity', () => {
    const idDesc = nodePropertyRegistry.find((d) => d.key === 'id')
    expect(idDesc?.group).toBe('identity')
    const typeDesc = nodePropertyRegistry.find((d) => d.key === 'type')
    expect(typeDesc?.group).toBe('identity')
    const colorDesc = nodePropertyRegistry.find((d) => d.key === 'color')
    expect(colorDesc?.group).toBe('appearance')
    const maxTierDesc = nodePropertyRegistry.find((d) => d.key === 'maxTier')
    expect(maxTierDesc?.group).toBe('logic')
  })
})

describe('id descriptor (readonly)', () => {
  const idDesc = nodePropertyRegistry.find((d) => d.key === 'id') as PropertyDescriptor

  it('é readonly', () => {
    expect(idDesc.readonly).toBe(true)
  })

  it('get(node) devolve node.id', () => {
    expect(idDesc.get(sampleNode)).toBe('pan_basico')
  })

  it('set() lanza (defensivo: o Inspector deshabilita o widget)', () => {
    expect(() => idDesc.set('pan_basico', 'novo_id' as never)).toThrow()
  })
})

describe('descriptors escalares — get + set producen Command correcto', () => {
  function findDescriptor(key: string) {
    const desc = nodePropertyRegistry.find((d) => d.key === key)
    if (desc === undefined) throw new Error(`Descriptor ${key} not found`)
    return desc
  }

  it('type: get lee, set produce setNodeField con valor enum', () => {
    const desc = findDescriptor('type')
    expect(desc.type.kind).toBe('enum')
    expect((desc.type as { options: readonly string[] }).options).toEqual(NODE_TYPE_OPTIONS)
    expect(desc.get(sampleNode)).toBe('notable')
    const cmd = desc.set('pan_basico', 'keystone' as never)
    expect(cmd.type).toBe('setNodeField')
  })

  it('label: get lee LocalizedString (Record); set acepta string ou Record', () => {
    const desc = findDescriptor('label')
    expect(desc.type.kind).toBe('localizedText')
    expect(desc.get(sampleNode)).toEqual({ en: 'Basic bread', gl: 'Pan básico' })
    expect(desc.get(sampleNodeMinimal)).toBe('Plain label')
    // set acepta string directo (setNodeField xa cobre LocalizedString string|Record).
    const cmd = desc.set('pan_basico', 'New label' as never)
    expect(cmd.type).toBe('setNodeField')
  })

  it('description: get lee LocalizedString opcional', () => {
    const desc = findDescriptor('description')
    expect(desc.get(sampleNode)).toEqual({ en: 'A simple loaf', gl: 'Un pan sinxelo' })
    expect(desc.get(sampleNodeMinimal)).toBeUndefined()
  })

  it('color: get lee, set produce setNodeField', () => {
    const desc = findDescriptor('color')
    expect(desc.type.kind).toBe('color')
    expect(desc.get(sampleNode)).toBe('#cc6600')
    expect(desc.get(sampleNodeMinimal)).toBeUndefined()
    const cmd = desc.set('pan_basico', '#ff0000' as never)
    expect(cmd.type).toBe('setNodeField')
  })

  it('icon: get lee, set produce setNodeField', () => {
    const desc = findDescriptor('icon')
    expect(desc.type.kind).toBe('text')
    expect(desc.get(sampleNode)).toBe('🍞')
    const cmd = desc.set('pan_basico', '🥖' as never)
    expect(cmd.type).toBe('setNodeField')
  })

  it('shape: get lee, opcións cobren NodeShape', () => {
    const desc = findDescriptor('shape')
    expect(desc.type.kind).toBe('enum')
    expect((desc.type as { options: readonly string[] }).options).toEqual(NODE_SHAPE_OPTIONS)
    expect(desc.get(sampleNode)).toBe('hexagon')
  })

  it('size: get lee, type.min é > 0', () => {
    const desc = findDescriptor('size')
    expect(desc.type.kind).toBe('number')
    expect((desc.type as { min?: number }).min).toBe(0.01)
    expect(desc.get(sampleNode)).toBe(2)
  })

  it('maxTier: get lee, type.min = 1', () => {
    const desc = findDescriptor('maxTier')
    expect(desc.type.kind).toBe('number')
    expect((desc.type as { min?: number }).min).toBe(1)
    expect(desc.get(sampleNode)).toBe(3)
  })
})

describe('Command producido por set — formato correcto', () => {
  it('setLabel produce un Command que ao executalo cambia o NodeDef', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'label') as PropertyDescriptor
    const cmd = desc.set('pan_basico', 'New' as never)
    expect(cmd.type).toBe('setNodeField')
    // Simulación de mutate: aplicar a un draft replicado para confirmar.
    const draft = {
      tree: { nodes: [{ ...sampleNode }] },
    }
    // mutate(draft) cambia o NodeDef directamente.
    cmd.mutate(draft as never)
    expect((draft.tree.nodes[0] as NodeDef).label).toBe('New')
  })

  it('setColor produce un Command para campo color', () => {
    const desc = nodePropertyRegistry.find((d) => d.key === 'color') as PropertyDescriptor
    const cmd = desc.set('pan_basico', '#abcdef' as never)
    const draft = {
      tree: { nodes: [{ ...sampleNode }] },
    }
    cmd.mutate(draft as never)
    expect((draft.tree.nodes[0] as NodeDef).color).toBe('#abcdef')
  })
})

describe('Opcións de enum — cobertura completa (type-test xa garante non-drift)', () => {
  it('NODE_TYPE_OPTIONS ten exactamente 11 valores (estado de @core actual)', () => {
    expect(NODE_TYPE_OPTIONS.length).toBe(11)
  })

  it('NODE_SHAPE_OPTIONS ten exactamente 5 valores', () => {
    expect(NODE_SHAPE_OPTIONS.length).toBe(5)
  })
})
// ── FIN: tests Property Registry ──
