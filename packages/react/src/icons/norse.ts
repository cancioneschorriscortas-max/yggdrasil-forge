// ── INICIO: icons/norse ──
// Iconset Norse (F10.5b) — 26 iconos con motivos nórdicos pensados
// para o branding Yggdrasil. Arte iterada en `tools/icon-preview/`
// (set v2/002).
//
// Patrón **opt-in** (vs `BUILTIN_ICONS` que se auto-rexistran):
// este set non se rexistra automaticamente ao importar o paquete.
// O consumidor decide explícitamente:
//
//     import { registerIcons, NORSE_ICONS } from '@yggdrasil-forge/react'
//     registerIcons(NORSE_ICONS)
//
// Razón: 26 paths extra son byte-cost que non todo consumidor quere.
// O paquete base mantén o tamaño mínimo cos 6 builtins esenciais; quen
// queira o iconset norse opta por el.
//
// IDs prefixados con `norse-` para evitar colisións cos builtins
// simples (`shield`, `sword`, `sparkle`) e ser explícitos sobre o
// orixe semántico.

import type { IconDef } from './registry.js'

/**
 * Iconset Norse — 26 iconos de inspiración nórdica.
 *
 * Categorías:
 * - **Yggdrasil**: `norse-world-tree`, `norse-sprout`, `norse-leaf`
 * - **Runas**: `norse-rune-fehu`, `norse-rune-algiz`, `norse-rune-tiwaz`, `norse-rune-sowilo`
 * - **Bestiario místico**: `norse-wolf`, `norse-raven`, `norse-serpent`
 * - **Armamento**: `norse-mjolnir`, `norse-axe`, `norse-sword`, `norse-shield`, `norse-horned-helmet`
 * - **Naveghación**: `norse-drakkar`
 * - **Elementos**: `norse-fire`, `norse-ice-crystal`, `norse-mountain`, `norse-lightning`
 * - **Celestes**: `norse-moon`, `norse-sun`
 * - **Simbólicos**: `norse-odin-eye`, `norse-mead-horn`, `norse-triquetra`, `norse-sparkle`
 *
 * Todos os paths son `stroke` mode (perfilados, recolorean co tema vía
 * `currentColor`). ViewBox por defecto (0 0 24 24).
 */
export const NORSE_ICONS: Readonly<Record<string, IconDef>> = {
  'norse-world-tree': {
    paths: [
      {
        d: 'M12 20V13M12 13C9 13 7 11 7 8C7 5 9 4 12 4C15 4 17 5 17 8C17 11 15 13 12 13M9 17H15M8 20H16',
        mode: 'stroke',
      },
    ],
  },
  'norse-rune-fehu': { paths: [{ d: 'M8 20V4M8 7H15M8 11H13', mode: 'stroke' }] },
  'norse-rune-algiz': { paths: [{ d: 'M12 20V6M12 6L7 11M12 6L17 11', mode: 'stroke' }] },
  'norse-rune-tiwaz': { paths: [{ d: 'M12 20V5M12 5L8 9M12 5L16 9', mode: 'stroke' }] },
  'norse-rune-sowilo': { paths: [{ d: 'M15 4L9 11H14L9 20', mode: 'stroke' }] },
  'norse-wolf': {
    paths: [{ d: 'M6 17L8 7L12 4L16 7L18 17L14 14H10L6 17Z', mode: 'stroke' }],
  },
  'norse-raven': {
    paths: [{ d: 'M5 13L10 8H16L19 11L15 13L19 16H11L5 13Z', mode: 'stroke' }],
  },
  'norse-serpent': {
    paths: [
      {
        d: 'M7 7C7 5 9 4 12 4C15 4 17 5 17 7C17 9 15 10 12 10C9 10 7 11 7 13C7 15 9 16 12 16C15 16 17 17 17 20',
        mode: 'stroke',
      },
    ],
  },
  'norse-mjolnir': {
    paths: [{ d: 'M8 6H16V10H13V20H11V10H8V6Z', mode: 'stroke' }],
  },
  'norse-axe': {
    paths: [{ d: 'M11 20V7M11 7C13 5 16 5 18 7C16 10 13 10 11 8', mode: 'stroke' }],
  },
  'norse-sword': {
    paths: [{ d: 'M12 4L16 8L12 12M12 12V20M9 17H15', mode: 'stroke' }],
  },
  'norse-shield': {
    paths: [{ d: 'M12 4L18 7V12C18 16 15 18 12 20C9 18 6 16 6 12V7L12 4Z', mode: 'stroke' }],
  },
  'norse-horned-helmet': {
    paths: [{ d: 'M7 16V12C7 8 9 6 12 6C15 6 17 8 17 12V16M7 9L4 6M17 9L20 6', mode: 'stroke' }],
  },
  'norse-drakkar': {
    paths: [{ d: 'M5 15H19L17 18H7L5 15ZM12 15V6M9 8H12', mode: 'stroke' }],
  },
  'norse-fire': {
    paths: [
      {
        d: 'M12 4C14 7 16 9 16 13C16 17 14 20 12 20C10 20 8 17 8 13C8 10 10 8 12 4Z',
        mode: 'stroke',
      },
    ],
  },
  'norse-ice-crystal': {
    paths: [{ d: 'M12 4V20M5 8L19 16M19 8L5 16', mode: 'stroke' }],
  },
  'norse-mountain': {
    paths: [{ d: 'M4 18L10 8L13 12L16 7L20 18H4Z', mode: 'stroke' }],
  },
  'norse-leaf': {
    paths: [
      { d: 'M18 6C12 6 7 10 7 15C7 18 9 20 12 20C17 20 18 15 18 6ZM9 18L16 11', mode: 'stroke' },
    ],
  },
  'norse-odin-eye': {
    paths: [
      {
        d: 'M4 12C6 8 9 6 12 6C15 6 18 8 20 12C18 16 15 18 12 18C9 18 6 16 4 12ZM12 10V14',
        mode: 'stroke',
      },
    ],
  },
  'norse-mead-horn': {
    paths: [{ d: 'M6 8C6 14 9 18 14 18C16 18 18 16 18 14V8H6Z', mode: 'stroke' }],
  },
  'norse-triquetra': {
    paths: [
      {
        d: 'M12 6C15 6 17 8 17 11C17 14 15 16 12 16C9 16 7 14 7 11C7 8 9 6 12 6M9 15C9 18 11 20 14 20M15 15C15 18 13 20 10 20',
        mode: 'stroke',
      },
    ],
  },
  'norse-moon': {
    paths: [
      {
        d: 'M15 4C11 5 8 9 8 13C8 17 11 20 15 20C12 18 10 15 10 12C10 9 12 6 15 4Z',
        mode: 'stroke',
      },
    ],
  },
  'norse-sun': {
    paths: [
      {
        d: 'M12 4V6M12 18V20M4 12H6M18 12H20M7 7L8 8M16 16L17 17M16 8L17 7M7 17L8 16M12 8C14 8 16 10 16 12C16 14 14 16 12 16C10 16 8 14 8 12C8 10 10 8 12 8Z',
        mode: 'stroke',
      },
    ],
  },
  'norse-lightning': {
    paths: [{ d: 'M14 4L8 13H12L10 20L16 11H12L14 4Z', mode: 'stroke' }],
  },
  'norse-sprout': {
    paths: [
      {
        d: 'M12 20V13M12 13C10 9 7 8 5 8C5 11 7 13 10 13M12 13C14 9 17 8 19 8C19 11 17 13 14 13',
        mode: 'stroke',
      },
    ],
  },
  'norse-sparkle': {
    paths: [
      {
        d: 'M12 4L13.5 10.5L20 12L13.5 13.5L12 20L10.5 13.5L4 12L10.5 10.5L12 4Z',
        mode: 'stroke',
      },
    ],
  },
}
// ── FIN: icons/norse ──
