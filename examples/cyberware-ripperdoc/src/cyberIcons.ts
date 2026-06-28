// ── INICIO: cyberIcons (mini placeholder icon pack) ──
// Iconas placeholder para os slugs que a fixture cyberware usa. Estilo
// xeométrico minimalista cyberpunk (formas dentro dun viewBox 24x24).
// PROVISIONAL: bancado un set definitivo "Capa 1A" coas iconas
// específicas (chip, optic, nerve cluster, etc.). Mentres tanto, este
// pack evita o fallback a `<text>` que mostraba o slug literal.
//
// Patrón: importar + `registerIcons(CYBER_ICONS)` no main.tsx, igual ca
// BAKER_ICONS do oberon-panadeiro.

import type { IconDef } from '@yggdrasil-forge/react'

export const CYBER_ICONS: Readonly<Record<string, IconDef>> = {
  // Coroa estilizada para o root (Neural Link).
  crown: {
    paths: [
      { d: 'M3 18 L4 8 L9 13 L12 5 L15 13 L20 8 L21 18 Z', mode: 'fill' },
      { d: 'M3 20 H21', mode: 'stroke' },
    ],
  },
  // Cerebro: dous lóbulos.
  brain: {
    paths: [
      {
        d: 'M9 4 C6 4 4 7 4 10 C4 12 5 14 6 15 C5 16 5 18 6 19 C7 20 9 20 10 19 L10 5 C10 4 9 4 9 4 Z',
        mode: 'fill',
      },
      {
        d: 'M15 4 C18 4 20 7 20 10 C20 12 19 14 18 15 C19 16 19 18 18 19 C17 20 15 20 14 19 L14 5 C14 4 15 4 15 4 Z',
        mode: 'fill',
      },
    ],
  },
  // Ollo: amendoa + pupila.
  eye: {
    paths: [
      {
        d: 'M2 12 C5 7 9 5 12 5 C15 5 19 7 22 12 C19 17 15 19 12 19 C9 19 5 17 2 12 Z',
        mode: 'stroke',
      },
      { d: 'M12 8 A4 4 0 1 1 12 16 A4 4 0 1 1 12 8 Z', mode: 'fill' },
    ],
  },
  // Nervio: árbore ramificada (nodo central + ramas).
  nerve: {
    paths: [
      { d: 'M12 4 V20 M4 8 L12 12 M20 8 L12 12 M4 16 L12 12 M20 16 L12 12', mode: 'stroke' },
      { d: 'M12 11 A1.5 1.5 0 1 1 12 14 A1.5 1.5 0 1 1 12 11 Z', mode: 'fill' },
    ],
  },
  // Corazón: contorno clásico simplificado.
  heart: {
    paths: [
      {
        d: 'M12 21 L4 13 C2 11 2 7 5 5 C7 4 10 5 12 7 C14 5 17 4 19 5 C22 7 22 11 20 13 L12 21 Z',
        mode: 'fill',
      },
    ],
  },
  // Pel: rombo con pattern (cuadrado xirado).
  skin: {
    paths: [
      { d: 'M12 3 L21 12 L12 21 L3 12 Z', mode: 'stroke' },
      { d: 'M12 7 L17 12 L12 17 L7 12 Z', mode: 'fill' },
    ],
  },
  // Óso: dúas cabezas + diáfise.
  bone: {
    paths: [
      {
        d: 'M5 4 A2 2 0 1 1 9 4 A2 2 0 1 1 11 6 L13 8 L15 6 A2 2 0 1 1 19 4 A2 2 0 1 1 21 6 A2 2 0 1 1 19 8 L17 10 L19 12 L17 14 L15 12 L13 14 L11 12 L9 14 L11 16 L9 18 A2 2 0 1 1 5 20 A2 2 0 1 1 3 18 A2 2 0 1 1 5 16 L7 14 L5 12 L7 10 L5 8 A2 2 0 1 1 3 6 A2 2 0 1 1 5 4 Z',
        mode: 'stroke',
      },
    ],
  },
  // Músculo: bíceps estilizado.
  muscle: {
    paths: [
      {
        d: 'M3 12 C5 8 7 6 11 6 C14 6 16 8 17 10 C18 11 20 11 21 12 C20 13 18 13 17 14 C16 16 14 18 11 18 C7 18 5 16 3 12 Z',
        mode: 'fill',
      },
    ],
  },
  // Componentes (HUD): rectángulo con liñas (PCB).
  comp: {
    paths: [
      { d: 'M4 6 H20 V18 H4 Z', mode: 'stroke' },
      { d: 'M8 6 V18 M16 6 V18 M4 12 H20', mode: 'stroke' },
    ],
  },
  // Capacity (HUD): liña con marcas (regra).
  cap: {
    paths: [{ d: 'M3 12 H21 M6 9 V15 M10 9 V15 M14 9 V15 M18 9 V15', mode: 'stroke' }],
  },
  // Street cred (HUD): círculo con marca diana.
  cred: {
    paths: [
      { d: 'M12 4 A8 8 0 1 1 12 20 A8 8 0 1 1 12 4 Z', mode: 'stroke' },
      { d: 'M12 9 A3 3 0 1 1 12 15 A3 3 0 1 1 12 9 Z', mode: 'fill' },
    ],
  },
}
// ── FIN: cyberIcons ──
