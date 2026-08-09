// ── INICIO: tests themePresets (7.19, Cambio 2) ──
// O tema como dato reutilizable: rexistro con 5 presets, specs
// completos, ids únicos, round-trip por serialización.

import { describe, expect, it } from 'vitest'
import { createEditorDocument } from '../src/document/EditorDocument.js'
import { deserializeDocument, serializeDocument } from '../src/document/serialize.js'
import { THEME_PRESETS, getThemePreset } from '../src/document/themePresets.js'

const NODE_STATES = ['locked', 'unlockable', 'unlocked', 'maxed', 'inProgress'] as const

describe('THEME_PRESETS — rexistro (7.19)', () => {
  it('contén exactamente 5 presets cos ids esperados, en orde', () => {
    expect(THEME_PRESETS.map((p) => p.id)).toEqual([
      'tintado',
      'neutro',
      'pergamino',
      'neon',
      'bosque',
    ])
  })

  it('ids únicos e ASCII (o id viaxa en ThemeSpec.preset)', () => {
    const ids = THEME_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('cada spec leva o preset anotado co seu propio id', () => {
    for (const p of THEME_PRESETS) {
      expect(p.spec.preset, p.id).toBe(p.id)
    }
  })

  it('★ specs COMPLETOS: os 5 estados presentes en cada preset con recheos', () => {
    // Neutro é a excepción POR DESEÑO: cero override → cae ao minimal
    // de @react (contrato desde 7.5e).
    for (const p of THEME_PRESETS) {
      if (p.id === 'neutro') {
        expect(p.spec.nodeFills).toBeUndefined()
        continue
      }
      const fills = p.spec.nodeFills
      expect(fills, p.id).toBeDefined()
      for (const state of NODE_STATES) {
        expect(fills?.[state], `${p.id}.${state}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('os presets escuros/medios traen textColor (lexibilidade sobre os fills)', () => {
    expect(getThemePreset('pergamino')?.spec.textColor).toBeDefined()
    expect(getThemePreset('neon')?.spec.textColor).toBeDefined()
    expect(getThemePreset('bosque')?.spec.textColor).toBeDefined()
  })

  it('getThemePreset: atopa por id; undefined para descoñecidos', () => {
    expect(getThemePreset('pergamino')?.label).toEqual({ gl: 'Pergamiño', en: 'Parchment' })
    expect(getThemePreset('vaporwave')).toBeUndefined()
  })

  it('tintado conserva EXACTAMENTE os valores históricos (contrato 7.5e)', () => {
    expect(getThemePreset('tintado')?.spec).toEqual({
      preset: 'tintado',
      nodeFills: {
        locked: '#c8c4bb',
        unlockable: '#e6b8a2',
        unlocked: '#7cb37c',
        maxed: '#4a8f4a',
        inProgress: '#e6c98a',
      },
    })
  })

  it('★ round-trip: un doc cun preset aplicado sobrevive serializar→deserializar', () => {
    const preset = getThemePreset('neon')
    expect(preset).toBeDefined()
    if (preset === undefined) return
    const doc = createEditorDocument(
      {
        id: 'preset-rt',
        schemaVersion: '1.0.0',
        version: '1.0.0',
        label: { gl: 'RT' },
        nodes: [{ id: 'a', type: 'small', label: { gl: 'A' }, position: { x: 0, y: 0 } }],
        edges: [],
        layout: { type: 'custom' },
      },
      { theme: preset.spec },
    )
    const restored = deserializeDocument(serializeDocument(doc))
    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.value.meta.theme).toEqual(preset.spec)
    expect(restored.value.meta.theme?.preset).toBe('neon')
  })
})
// ── FIN: tests themePresets ──
