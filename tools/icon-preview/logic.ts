'use client'

// ── INICIO: LOGIC_ICONS ──
// Iconset opt-in para showcase de prerequisitos (F10.9+).
//
// Cobertura semántica: estados (locked/unlockable/unlocked), operadores
// lóxicos (AND/OR/NOT), tokens de progresión (gate/keystone/mastery),
// e atribución (region/quest/boss/attribute/progress).
//
// **Opt-in**: NON auto-rexístrase (igual que NORSE_ICONS). O consumidor
// chama `registerIcons(LOGIC_ICONS)` antes do primeiro render. Razón:
// byte-cost — non todo o mundo quere os 19 paths se non vai mostrar
// lóxica de prerequisitos no UI.
//
// IDs prefixados `logic-*` para cero colisión cos BUILTIN ou NORSE.
//
// Todos os paths en viewBox 24×24, modo 'stroke' (recoloreables via
// `currentColor` igual que o resto do paquete).

import type { IconDef } from './registry.js'

export const LOGIC_ICONS: Record<string, IconDef> = {
  // ── Estados de nodo ─────────────────────────────────────────
  /** Candado pechado — nodo en estado `locked`. */
  'logic-lock': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10v9H7z', mode: 'stroke' }],
  },
  /** Candado aberto — evento de unlock (animación de transición). */
  'logic-unlock': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M16 11V8a4 4 0 0 0-8 0M7 11h10v9H7z', mode: 'stroke' }],
  },
  /** Chave — nodo `unlockable` (premédeme). */
  'logic-key': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M11 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6M14 10h6M17 10v2M20 10v2',
        mode: 'stroke',
      },
    ],
  },

  // ── Marcadores estruturais ──────────────────────────────────
  /** Coroa — nodo crítico de rama (keystone). */
  'logic-crown': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M4 17l2-8 6 4 6-4 2 8H4z', mode: 'stroke' }],
  },
  /** Porta — gate / requisito de puntos investidos. */
  'logic-gate': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M6 20V6h12v14M12 6v14', mode: 'stroke' }],
  },
  /** Pergamiño — nodo cun bloque de prerrequisitos por amosar. */
  'logic-scroll': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M8 4h7l3 3v13H8z M8 4v0a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h12', mode: 'stroke' }],
  },

  // ── Validación de prerrequisitos ────────────────────────────
  /** Tique — prerrequisito satisfeito. */
  'logic-check': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M5 13l4 4L19 7', mode: 'stroke' }],
  },
  /** Aspa — prerrequisito non satisfeito / erro de unlock. */
  'logic-cross': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M6 6l12 12M18 6L6 18', mode: 'stroke' }],
  },

  // ── Topoloxía da árbore ─────────────────────────────────────
  /** Bruxula / rosa dos ventos — etiqueta de rexión. */
  'logic-compass': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M12 3l6 6-3 9-9 3 3-9z', mode: 'stroke' }],
  },
  /** Pin de mapa — quest / waypoint dentro da árbore. */
  'logic-map-marker': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 3a6 6 0 0 1 6 6c0 5-6 12-6 12s-6-7-6-12a6 6 0 0 1 6-6zM12 7a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
        mode: 'stroke',
      },
    ],
  },
  /** Chama — nodo clímax / boss da rama. */
  'logic-flame': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 3c1 3 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 2-4M12 14c0-1 1-2 2-2',
        mode: 'stroke',
      },
    ],
  },

  // ── Operadores lóxicos (prerequisitos compostos) ────────────
  /** Intersección — operador AND (`all_of`). */
  'logic-intersect': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M9 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M15 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
        mode: 'stroke',
      },
    ],
  },
  /** Bifurcación — operador OR (`any_of`). */
  'logic-fork': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M12 20V8M12 8l-5-5M12 8l5-5', mode: 'stroke' }],
  },
  /** Prohibido — operador NOT (`none_of`, exclusión mutua). */
  'logic-forbidden': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M6 18L18 6', mode: 'stroke' }],
  },

  // ── Estados de visibilidade e progresión ────────────────────
  /** Ollo pechado — nodo `hidden` (oculto ata cumprir condición). */
  'logic-eye-closed': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M3 12c2 3 5 5 9 5s7-2 9-5M5 16l14-8', mode: 'stroke' }],
  },
  /** Chispa — evento de descubrimento / `unlock` notable. */
  'logic-sparkle': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M12 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z', mode: 'stroke' }],
  },
  /** Estrela — `maxed` / mastery de tier máximo. */
  'logic-star': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M12 4l2 5 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1z', mode: 'stroke' }],
  },
  /** Runa — atributo / stat investible. */
  'logic-rune': {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M12 3v18M6 3l6 8 6-8M9 14h6', mode: 'stroke' }],
  },
  /** Plántula — estado `in_progress`. */
  'logic-seedling': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 20v-8M12 12c0-3 3-5 6-5c0 3-2 6-6 6M12 12c0-3-3-5-6-5c0 3 2 6 6 6',
        mode: 'stroke',
      },
    ],
  },
}

// ── FIN: LOGIC_ICONS ──
