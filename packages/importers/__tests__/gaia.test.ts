// ── INICIO: tests F9.3.a — importador GAIA (profesión + grupos) ──
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import { validateTreeDef } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { importGaiaProfession, toI18n } from '../src/gaia.js'
import type { GaiaProfession } from '../src/gaia.js'

/** Input mínimo: profesión con 2 grupos, 2 skills, 0 microskills. */
function makeMinimalInput(): GaiaProfession {
  return {
    id: 'test-prof',
    rol: 'construtor',
    bloque: 'produción',
    label: 'Test Prof',
    icono: '🔧',
    epigrafe_gl: 'Epígrafe GL',
    epigrafe_es: 'Epígrafe ES',
    epigrafe_en: 'Epigraph EN',
    descricion_curta_gl: 'Curta GL',
    descricion_poetica_gl: 'Poética GL',
    descricion_poetica_es: 'Poética ES',
    skills: [
      { id: 'sk1', label: 'Skill 1', categoria: 'física', peso: 3, icono: '💪' },
      { id: 'sk2', label: 'Skill 2', categoria: 'cognitiva', peso: 2 },
    ],
    grupos: [
      {
        id: 'g1',
        label_gl: 'Grupo 1',
        label_es: 'Grupo 1 ES',
        label_en: 'Group 1',
        icono: '🔥',
        cor: '#e8a547',
        skill_canonica_dominante: 'sk1',
        posicion: { x: 0.5, y: 0.2 },
      },
      {
        id: 'g2',
        label_gl: 'Grupo 2',
        cor: '#9bb3ff',
        skill_canonica_dominante: 'sk2',
      },
    ],
    microskills: [],
  }
}

/** Input sen icono, epígrafes, nin poéticas. */
function makeBareInput(): GaiaProfession {
  return {
    id: 'bare',
    rol: 'servizo',
    bloque: 'terciario',
    label: 'Bare Prof',
    skills: [{ id: 's1', label: 'S', categoria: 'c', peso: 1 }],
    grupos: [{ id: 'g1', label_gl: 'G1' }],
    microskills: [],
  }
}

/** Acceso seguro a metadata.gaia dun obxecto con metadata. */
function gaiaMetaOf(obj: { metadata?: Readonly<Record<string, unknown>> }): Record<
  string,
  unknown
> {
  const meta = obj.metadata as Record<string, unknown> | undefined
  const gaia = meta?.gaia as Record<string, unknown> | undefined
  expect(gaia).toBeDefined()
  return gaia as Record<string, unknown>
}

describe('toI18n', () => {
  it('devolve {gl,es,en} cando hai as tres', () => {
    expect(toI18n('a', 'b', 'c')).toEqual({ gl: 'a', es: 'b', en: 'c' })
  })

  it('devolve só as presentes', () => {
    expect(toI18n('a', undefined, 'c')).toEqual({ gl: 'a', en: 'c' })
  })

  it('devolve só gl cando é a única', () => {
    expect(toI18n('a')).toEqual({ gl: 'a' })
  })

  it('devolve undefined cando todas faltan', () => {
    expect(toI18n(undefined, undefined, undefined)).toBeUndefined()
  })

  it('devolve undefined sen argumentos', () => {
    expect(toI18n()).toBeUndefined()
  })
})

describe('importGaiaProfession', () => {
  it('produce un TreeDef válido (validateTreeDef ok)', () => {
    const result = importGaiaProfession(makeMinimalInput())
    const validation = validateTreeDef(result)
    expect(validation.ok).toBe(true)
  })

  it('id e rootNodeId coinciden co input', () => {
    const result = importGaiaProfession(makeMinimalInput())
    expect(result.id).toBe('test-prof')
    expect(result.rootNodeId).toBe('test-prof')
  })

  it('schemaVersion é SCHEMA_VERSION de @common', () => {
    const result = importGaiaProfession(makeMinimalInput())
    expect(result.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('version por defecto é 1.0.0, overrideable', () => {
    expect(importGaiaProfession(makeMinimalInput()).version).toBe('1.0.0')
    expect(importGaiaProfession(makeMinimalInput(), { version: '2.0.0' }).version).toBe('2.0.0')
  })

  it('layout por defecto é identity, overrideable', () => {
    expect(importGaiaProfession(makeMinimalInput()).layout).toEqual({ type: 'identity' })
    const custom = { type: 'radial' as const }
    expect(importGaiaProfession(makeMinimalInput(), { layout: custom }).layout).toEqual(custom)
  })

  describe('nodo raíz', () => {
    it('ten type root e label do input', () => {
      const result = importGaiaProfession(makeMinimalInput())
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0]?.type).toBe('root')
      expect(result.nodes[0]?.label).toBe('Test Prof')
      expect(result.nodes[0]?.id).toBe('test-prof')
    })

    it('ten icon cando input ten icono', () => {
      const result = importGaiaProfession(makeMinimalInput())
      expect(result.nodes[0]?.icon).toBe('🔧')
    })

    it('omite icon cando input non ten icono', () => {
      const result = importGaiaProfession(makeBareInput())
      const root = result.nodes[0]
      expect(root).toBeDefined()
      expect('icon' in (root ?? {})).toBe(false)
    })

    it('description é i18n do epigrafe', () => {
      const result = importGaiaProfession(makeMinimalInput())
      expect(result.nodes[0]?.description).toEqual({
        gl: 'Epígrafe GL',
        es: 'Epígrafe ES',
        en: 'Epigraph EN',
      })
    })

    it('metadata.gaia contén poetic e short', () => {
      const result = importGaiaProfession(makeMinimalInput())
      const root = result.nodes[0]
      expect(root).toBeDefined()
      const gaia = gaiaMetaOf(root ?? { metadata: {} })
      expect(gaia.poetic).toEqual({ gl: 'Poética GL', es: 'Poética ES' })
      expect(gaia.short).toEqual({ gl: 'Curta GL' })
    })

    it('omite metadata cando non hai poéticas nin curtas', () => {
      const result = importGaiaProfession(makeBareInput())
      const root = result.nodes[0]
      expect(root).toBeDefined()
      expect('metadata' in (root ?? {})).toBe(false)
    })
  })

  describe('grupos', () => {
    it('mapea grupos correctamente', () => {
      const result = importGaiaProfession(makeMinimalInput())
      expect(result.groups).toHaveLength(2)
    })

    it('grupo completo ten label i18n, cor, icon, position', () => {
      const result = importGaiaProfession(makeMinimalInput())
      const g1 = result.groups?.[0]
      expect(g1?.id).toBe('g1')
      expect(g1?.label).toEqual({ gl: 'Grupo 1', es: 'Grupo 1 ES', en: 'Group 1' })
      expect(g1?.color).toBe('#e8a547')
      expect(g1?.icon).toBe('🔥')
      expect(g1?.position).toEqual({ x: 0.5, y: 0.2 })
    })

    it('grupo minimal ten label fallback a label_gl e omite campos ausentes', () => {
      const result = importGaiaProfession(makeMinimalInput())
      const g2 = result.groups?.[1]
      expect(g2?.id).toBe('g2')
      expect(g2?.label).toEqual({ gl: 'Grupo 2' })
      expect(g2?.color).toBe('#9bb3ff')
      expect(g2).toBeDefined()
      expect('icon' in (g2 ?? {})).toBe(false)
      expect('position' in (g2 ?? {})).toBe(false)
    })
  })

  describe('metadata.gaia', () => {
    it('contén profession con rol e bloque', () => {
      const result = importGaiaProfession(makeMinimalInput())
      const gaia = gaiaMetaOf(result)
      const prof = gaia.profession as Record<string, unknown> | undefined
      expect(prof?.rol).toBe('construtor')
      expect(prof?.bloque).toBe('produción')
    })

    it('contén canonicalWeights desde skills', () => {
      const result = importGaiaProfession(makeMinimalInput())
      const gaia = gaiaMetaOf(result)
      expect(gaia.canonicalWeights).toEqual({ sk1: 3, sk2: 2 })
    })

    it('contén groupCanonical desde grupos', () => {
      const result = importGaiaProfession(makeMinimalInput())
      const gaia = gaiaMetaOf(result)
      expect(gaia.groupCanonical).toEqual({ g1: 'sk1', g2: 'sk2' })
    })

    it('omite groupCanonical cando ningún grupo ten dominante', () => {
      const result = importGaiaProfession(makeBareInput())
      const gaia = gaiaMetaOf(result)
      expect('groupCanonical' in gaia).toBe(false)
    })

    it('profession inclúe campos opcionais cando presentes', () => {
      const input = makeMinimalInput()
      input.salario_medio = 1500
      input.proxeccion = 'decrece'
      input.risco_automatizacion = 'alto'
      input.via_formativa = 'fp_basica'
      input.imaxe_escena_url = '/img/test.png'
      input.oberon_completo = true
      const result = importGaiaProfession(input)
      const gaia = gaiaMetaOf(result)
      const prof = gaia.profession as Record<string, unknown> | undefined
      expect(prof).toBeDefined()
      expect(prof?.salario_medio).toBe(1500)
      expect(prof?.proxeccion).toBe('decrece')
      expect(prof?.risco_automatizacion).toBe('alto')
      expect(prof?.via_formativa).toBe('fp_basica')
      expect(prof?.imaxe_escena_url).toBe('/img/test.png')
      expect(prof?.oberon_completo).toBe(true)
    })
  })

  it('edges están baleiros nesta sub-fase', () => {
    const result = importGaiaProfession(makeMinimalInput())
    expect(result.edges).toEqual([])
  })

  it('nodes só contén o raíz nesta sub-fase', () => {
    const result = importGaiaProfession(makeMinimalInput())
    expect(result.nodes).toHaveLength(1)
  })

  it('description a nivel árbore é i18n do epigrafe', () => {
    const result = importGaiaProfession(makeMinimalInput())
    expect(result.description).toEqual({
      gl: 'Epígrafe GL',
      es: 'Epígrafe ES',
      en: 'Epigraph EN',
    })
  })

  it('omite description cando non hai epigrafe', () => {
    const result = importGaiaProfession(makeBareInput())
    expect('description' in result).toBe(false)
  })

  it('input bare tamén produce TreeDef válido', () => {
    const result = importGaiaProfession(makeBareInput())
    const validation = validateTreeDef(result)
    expect(validation.ok).toBe(true)
  })
})
// ── FIN: tests F9.3.a ──
