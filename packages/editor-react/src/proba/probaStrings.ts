// ── INICIO: probaStrings ──
// Strings localizadas gl+en para o modo Proba (7.6). Cero xerga
// inglesa nas superficies user-facing.

import type { LocalizedString } from '@yggdrasil-forge/editor-core'

export const PROBA_STRINGS = {
  modeAuthoring: { en: 'Authoring', gl: 'Autoría' } as LocalizedString,
  modePreview: { en: 'Preview', gl: 'Proba' } as LocalizedString,
  panelTitle: { en: 'Preview', gl: 'Proba' } as LocalizedString,
  liveBadge: { en: 'live', gl: 'en vivo' } as LocalizedString,
  // ── Recursos ──
  resourcesHeader: { en: 'Resources', gl: 'Recursos' } as LocalizedString,
  resourcesHelp: {
    en: 'Give or take resources to test the tree.',
    gl: 'Dáte ou quítate recursos para probar a árbore.',
  } as LocalizedString,
  noResources: {
    en: 'This tree has no resources defined.',
    gl: 'Esta árbore non ten resources definidos.',
  } as LocalizedString,
  // ── Nodo seleccionado ──
  nodeHeader: { en: 'Selected node', gl: 'Nodo seleccionado' } as LocalizedString,
  noSelectionHint: {
    en: 'Click a node to see its conditions.',
    gl: 'Fai clic nun nodo para ver as súas condicións.',
  } as LocalizedString,
  conditionsHeader: { en: 'Conditions', gl: 'Condicións' } as LocalizedString,
  noConditions: {
    en: 'No prerequisites.',
    gl: 'Sen prerrequisitos.',
  } as LocalizedString,
  costHeader: { en: 'Cost', gl: 'Custo' } as LocalizedString,
  noCost: { en: 'No cost.', gl: 'Sen custo.' } as LocalizedString,
  affordableHint: { en: 'you have', gl: 'tes' } as LocalizedString,
  unlockButton: { en: 'Unlock', gl: 'Desbloquear' } as LocalizedString,
  rankUpButton: { en: 'Rank up', gl: 'Subir rango' } as LocalizedString,
  unlockHelp: {
    en: 'When all conditions are met, the button activates.',
    gl: 'Cando todas as condicións se cumpran, o botón actívase.',
  } as LocalizedString,
  rankSuffix: {
    en: (cur: number, max: number) => `Rank ${cur} of ${max}`,
    gl: (cur: number, max: number) => `Rango ${cur} de ${max}`,
  },
  // ── Reset ──
  resetButton: { en: 'Reset preview', gl: 'Reiniciar proba' } as LocalizedString,
  resetHelp: {
    en: 'Discards this preview session (all locked, resources back to initial).',
    gl: 'Descarta esta sesión de proba (todo bloqueado, recursos ao inicial).',
  } as LocalizedString,
} as const

/** Pick localizado curto (gl default, fallback en, fallback texto plano). */
export function pickLoc(loc: LocalizedString | undefined, locale: 'gl' | 'en' = 'gl'): string {
  if (loc === undefined) return ''
  if (typeof loc === 'string') return loc
  return loc[locale] ?? loc.en ?? ''
}
// ── FIN: probaStrings ──
