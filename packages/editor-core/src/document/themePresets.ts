// ── INICIO: themePresets (7.19, Cambio 2) ──
// Presets de tema con nome — o tema como DATO reutilizable, non como
// constantes inline dun panel. Cada preset é un `ThemeSpec` COMPLETO
// (os 5 estados con recheo, salvo Neutro, que por deseño non trae
// overrides) co `preset` anotado: aplicar = substituír o tema enteiro,
// nunca fusionar.
//
// Tintado e Neutro migran TAL CAL do ThemePanel (7.5e — os seus tests
// son o contrato; cero cambio visual). Os tres novos son proposta do
// Executor partindo das harmonías de minimal/minimalDark; o gate de
// gusto do dono afina os valores.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { ThemeSpec } from './ThemeSpec.js'

export interface ThemePreset {
  /** Id estable (ASCII, sen diacríticos) — o que viaxa en `ThemeSpec.preset`. */
  readonly id: string
  readonly label: LocalizedString
  /** Spec completo que se dispatcha ao aplicar o preset. */
  readonly spec: ThemeSpec
}

/**
 * Rexistro ordenado dos presets do editor. A orde é a das fichas na
 * UI: os dous históricos primeiro, logo os curados do 7.19.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'tintado',
    label: { gl: 'Tintado', en: 'Tinted' },
    // ≈ paleta distinguible tipo panadeiro (validada visualmente en 7.5e).
    spec: {
      preset: 'tintado',
      nodeFills: {
        locked: '#c8c4bb',
        unlockable: '#e6b8a2',
        unlocked: '#7cb37c',
        maxed: '#4a8f4a',
        inProgress: '#e6c98a',
      },
    },
  },
  {
    id: 'neutro',
    label: { gl: 'Neutro', en: 'Neutral' },
    // Sen nodeFills → cae ao `minimal` de @react (por deseño).
    spec: { preset: 'neutro' },
  },
  {
    id: 'pergamino',
    label: { gl: 'Pergamiño', en: 'Parchment' },
    // Claros cálidos terrosos sobre a harmonía do `minimal` (#f4f4ef);
    // progresión de pergamiño apagado a dourado vello, texto tinta sepia.
    spec: {
      preset: 'pergamino',
      nodeFills: {
        locked: '#d9d2c4',
        unlockable: '#eadfc0',
        unlocked: '#cfa968',
        maxed: '#a8813f',
        inProgress: '#e4c98f',
      },
      textColor: '#3b2f1d',
    },
  },
  {
    id: 'neon',
    label: { gl: 'Néon', en: 'Neon' },
    // Fondos-fills escuros profundos (base do `minimalDark`, #1e2026)
    // con acentos saturados; pensado co chrome escuro. Texto case
    // branco frío para ler sobre os fills escuros.
    spec: {
      preset: 'neon',
      nodeFills: {
        locked: '#252a38',
        unlockable: '#7c3aed',
        unlocked: '#06b6d4',
        maxed: '#ec4899',
        inProgress: '#a3e635',
      },
      textColor: '#e8f7ff',
    },
  },
  {
    id: 'bosque',
    label: { gl: 'Bosque', en: 'Forest' },
    // Verdes profundos e dourados apagados; texto marfil para
    // contraste sobre os verdes medios.
    spec: {
      preset: 'bosque',
      nodeFills: {
        locked: '#4a5340',
        unlockable: '#7d8f5a',
        unlocked: '#3e7a4c',
        maxed: '#b08d3e',
        inProgress: '#96a86c',
      },
      textColor: '#f4efdf',
    },
  },
]

/** Busca un preset polo seu id. `undefined` se non existe. */
export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id)
}
// ── FIN: themePresets ──
