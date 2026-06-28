// ── INICIO: bakerIcons (set propio do exemplo oberon-panadeiro) ──
//
// Iconas SVG recoloreables do panadeiro (Opción A: cor uniforme do tema).
// Formato `IconDef` exacto do registry de `@react` (F10.5):
// `{ paths: [{ d, mode }] }`, viewBox default '0 0 24 24'.
//
// As claves de BAKER_ICONS son **slugs** (ids rexistrados); as claves de
// BAKER_NODE_ICONS son **ids de microskill** do fixture do panadeiro.
// Sonda en `__verify_baker_icons.test.ts` garda 1:1 contra o fixture.
//
// OLLO: `pan_seleccion_fariña` leva ñ — coincide byte a byte co id do
// fixture. Ficheiro gardado como UTF-8.

import type { IconDef } from '@yggdrasil-forge/react'

export const BAKER_ICONS: Record<string, IconDef> = {
  'amasar-a-man': {
    paths: [
      {
        d: 'M3 18C7 20 17 20 21 18M5 14C5 10 11 10 11 14M13 14C13 10 19 10 19 14',
        mode: 'stroke',
      },
    ],
  },
  'control-do-forno': {
    paths: [
      {
        d: 'M3 20V13C3 8 7 5 12 5C17 5 21 8 21 13V20M2 20H22M8 20V16C8 14 10 13 12 13C14 13 16 14 16 16V20',
        mode: 'stroke',
      },
    ],
  },
  'formado-das-pezas': {
    paths: [
      {
        d: 'M3 14C3 11 6 9 12 9C18 9 21 11 21 14C21 17 18 18 12 18C6 18 3 17 3 14ZM8 12L10 14M11 12L13 14M14 12L16 14',
        mode: 'stroke',
      },
    ],
  },
  'corte-e-marca': {
    paths: [
      {
        d: 'M4 4L14 14M14 14L17 14M14 14L14 11M6 18L10 14M9 21L13 17',
        mode: 'stroke',
      },
    ],
  },
  'levedo-natural': {
    paths: [
      {
        d: 'M6 20V10C6 9 7 8 8 8H16C17 8 18 9 18 10V20H6ZM8 5H16V8H8ZM9 13A1 1 0 1 1 11 13A1 1 0 1 1 9 13ZM13 16A1 1 0 1 1 15 16A1 1 0 1 1 13 16Z',
        mode: 'stroke',
      },
    ],
  },
  'lectura-da-fermentacion': {
    paths: [
      {
        d: 'M3 13C3 19 21 19 21 13M5 13C5 9 8 7 12 7C16 7 19 9 19 13M10 4L12 2L14 4M12 2V6',
        mode: 'stroke',
      },
    ],
  },
  'planificacion-da-xornada': {
    paths: [
      {
        d: 'M12 4A8 8 0 1 1 12 20A8 8 0 1 1 12 4M12 8V12L15 14',
        mode: 'stroke',
      },
    ],
  },
  'temperatura-e-humidade': {
    paths: [
      {
        d: 'M14 14V5A2 2 0 0 0 10 5V14A4 4 0 1 0 14 14M15 7H17M15 10H17M15 13H17',
        mode: 'stroke',
      },
    ],
  },
  'doces-artesanos': {
    paths: [
      {
        d: 'M8 12C8 8 16 8 16 12H8M6 20L8 12H16L18 20H6M10 14V18M14 14V18',
        mode: 'stroke',
      },
    ],
  },
  'innovacion-con-respecto': {
    paths: [
      {
        d: 'M5 19C5 10 12 5 19 5C19 12 14 19 5 19ZM5 19L19 5M18 9L20 7M18 7L20 9',
        mode: 'stroke',
      },
    ],
  },
  'receitas-propias': {
    paths: [
      {
        d: 'M3 6C5 5 9 5 12 7M21 6C19 5 15 5 12 7M12 7V20M3 6V19C5 18 9 18 12 20M21 6V19C19 18 15 18 12 20',
        mode: 'stroke',
      },
    ],
  },
  'tradicion-galega': {
    paths: [
      {
        d: 'M3 18C3 10 21 10 21 18H3M12 18V10M8 18L9.5 10M16 18L14.5 10M6 18L7.5 11M18 18L16.5 11',
        mode: 'stroke',
      },
    ],
  },
  madrugadas: {
    paths: [{ d: 'M18 14A8 8 0 0 1 10 6A8 8 0 1 0 18 14Z', mode: 'stroke' }],
  },
  'aguante-diante-da-calor': {
    paths: [
      {
        d: 'M9 4C11 6 13 9 13 12C13 16 11 18 9 18C7 18 5 16 5 13C5 10 7 8 9 4ZM18 13C19 13 20 14 20 16C20 18 19 19 18 19C17 19 16 18 16 16C16 14 17 13 18 13Z',
        mode: 'stroke',
      },
    ],
  },
  constancia: {
    paths: [
      {
        d: 'M12 12C9 9 6 9 6 12C6 15 9 15 12 12C15 9 18 9 18 12C18 15 15 15 12 12',
        mode: 'stroke',
      },
    ],
  },
  'resolver-imprevistos': {
    paths: [
      {
        d: 'M8 8A4 4 0 1 0 8 16A4 4 0 1 0 8 8M12 12H22M18 12V15M22 12V15',
        mode: 'stroke',
      },
    ],
  },
  'seleccion-de-farina': {
    paths: [
      {
        d: 'M12 4V20M10 6L12 8L14 6M9 9L12 11L15 9M9 12L12 14L15 12M9 15L12 17L15 15',
        mode: 'stroke',
      },
    ],
  },
  'proporcions-exactas': {
    paths: [
      {
        d: 'M12 4V18M10 20H14M12 18V20M5 7H19M5 7V9M19 7V9M2 9A3 3 0 0 0 8 9M16 9A3 3 0 0 0 22 9',
        mode: 'stroke',
      },
    ],
  },
  'calidade-dos-ingredientes': {
    paths: [
      {
        d: 'M12 5A5 5 0 1 1 12 15A5 5 0 1 1 12 5M9 13V21L12 18L15 21V13',
        mode: 'stroke',
      },
    ],
  },
}

/**
 * Mapa node.id (do fixture) → slug de icona. 19/19, 1:1.
 * Sonda en `__verify_baker_icons.test.ts` garda 1:1 contra o fixture.
 *
 * OLLO: `pan_seleccion_fariña` leva ñ — coincide byte a byte co id do
 * fixture (validado).
 */
export const BAKER_NODE_ICONS: Record<string, string> = {
  pan_amasado: 'amasar-a-man',
  pan_control_forno: 'control-do-forno',
  pan_corte: 'corte-e-marca',
  pan_formado: 'formado-das-pezas',
  pan_lecedo: 'levedo-natural',
  pan_lectura_fermentacion: 'lectura-da-fermentacion',
  pan_planificacion_xornada: 'planificacion-da-xornada',
  pan_temperatura_humidade: 'temperatura-e-humidade',
  pan_doces_artesanos: 'doces-artesanos',
  pan_innovacion: 'innovacion-con-respecto',
  pan_receitas_propias: 'receitas-propias',
  pan_tradicion_galega: 'tradicion-galega',
  pan_calor_forno: 'aguante-diante-da-calor',
  pan_constancia: 'constancia',
  pan_madrugadas: 'madrugadas',
  pan_resolver_imprevistos: 'resolver-imprevistos',
  pan_calidade_ingredientes: 'calidade-dos-ingredientes',
  pan_proporcions: 'proporcions-exactas',
  pan_seleccion_fariña: 'seleccion-de-farina',
}
// ── FIN: bakerIcons ──
