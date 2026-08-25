// ── INICIO: icons/forge ──
// Iconset Forge (17.1) — 25 iconos de taller e campo de batalla
// industrial: trazo fino, esquemático, coma un plano de taller.
//
// Orixe: arte do dono, debuxada para a doutrina de TUERCA (o xogo de
// robots industriais) e promovida a set oficial. É o terceiro rexistro
// semántico da casa: `logic-*` (educativo), `norse-*` (fantasía) e
// agora `forge-*` (industrial/mecánico) — que ademais é o oco que a
// propia TUERCA atopou: «son iconos de fantasía nun xogo de robots
// industriais; o chasis de serie saía cun brote».
//
// Os orixinais son 64×64 con `<circle>`/`<rect>`; aquí van convertidos
// ao formato da casa: viewBox 24×24, un só path por icona (círculos e
// rectángulos como arcos), modo 'stroke' recoloreable via
// `currentColor`. Sen recheos, sen degradados.
//
// **Opt-in** (igual que NORSE/LOGIC): NON se auto-rexistra. O
// consumidor chama `registerIcons(FORGE_ICONS)` antes do primeiro
// render. Razón: byte-cost.
//
// IDs prefixados `forge-*` para cero colisión cos outros sets.

import type { IconDef } from './registry.js'

/**
 * Iconset Forge — 25 iconos industriais/mecánicos.
 *
 * Categorías:
 * - **Máquina**: `forge-nut`, `forge-spring`, `forge-plate`,
 *   `forge-scope`, `forge-rivet`, `forge-assembly`
 * - **Carga e defensa**: `forge-cart`, `forge-weight`, `forge-guard`,
 *   `forge-wall`, `forge-breach`
 * - **Puntería**: `forge-crosshair`, `forge-cadence`, `forge-arc`,
 *   `forge-range`, `forge-mortar`, `forge-eye`
 * - **Oficio**: `forge-wrench`, `forge-hook`, `forge-weld`,
 *   `forge-revive`
 * - **Identidade e loxística**: `forge-nameplate`, `forge-barcode`,
 *   `forge-link`, `forge-shelf`
 */
export const FORGE_ICONS: Readonly<Record<string, IconDef>> = {
  // ── Máquina ─────────────────────────────────────────────────
  /** A tuerca. Hexágono con oco e dous planos de chave. */
  'forge-nut': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 2.25L21 7.13v9.75L12 21.75 3 16.88V7.13z M7.88 12a4.13 4.13 0 1 0 8.25 0a4.13 4.13 0 1 0 -8.25 0 M3 9.75h2.25M21 9.75h-2.25',
        mode: 'stroke',
      },
    ],
  },
  /** Resorte entre dous topes — velocidade/mobilidade. Cando o
   * obxecto non se pode debuxar, debúxase o efecto. */
  'forge-spring': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3 8.25v7.5M21 8.25v7.5 M3 12h2.25l1.88 -5.25 2.25 10.5 2.25 -10.5 2.25 10.5 2.25 -10.5 1.88 5.25h2.25',
        mode: 'stroke',
      },
    ],
  },
  /** Chapa con bisel e remaches nunha banda (nas catro esquinas
   * saía un dado). */
  'forge-plate': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M4.5 5.25h12l3 3v10.5H4.5z M16.5 5.25v3h3 M6.56 8.63a0.94 0.94 0 1 0 1.88 0a0.94 0.94 0 1 0 -1.87 0 M6.56 12a0.94 0.94 0 1 0 1.88 0a0.94 0.94 0 1 0 -1.87 0 M6.56 15.38a0.94 0.94 0 1 0 1.88 0a0.94 0.94 0 1 0 -1.87 0',
        mode: 'stroke',
      },
    ],
  },
  /** Tubo de mira con campá e lente — sensores. */
  'forge-scope': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3 9.75h11.25v4.5H3z M14.25 7.5h5.25v9H14.25z M15 12a1.88 1.88 0 1 0 3.75 0a1.88 1.88 0 1 0 -3.75 0 M6 14.25v2.25M10.5 14.25v2.25',
        mode: 'stroke',
      },
    ],
  },
  /** Xunta solapada cun remache atravesándoa. As dúas chapas van
   * DESPRAZADAS: iso é o que fai que non lea como outra cousa. */
  'forge-rivet': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.25 7.5h12v4.5H2.25z M9.75 12h12v4.5H9.75z M12 5.25v13.5 M10.5 5.25a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M10.5 18.75a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
        mode: 'stroke',
      },
    ],
  },
  /** A mesma tuerca, feita de anacos soltos — montaxe por pezas. */
  'forge-assembly': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12.38 2.63l7.88 4.13 M21 8.63v6.75 M19.5 17.63L12.75 21.38 M11.25 21.38L4.13 17.25 M3 15.38V8.63 M4.5 6.75L11.25 2.63 M8.63 12a3.38 3.38 0 1 0 6.75 0a3.38 3.38 0 1 0 -6.75 0',
        mode: 'stroke',
      },
    ],
  },

  // ── Carga e defensa ─────────────────────────────────────────
  /** Chasis pesado sobre tres rodas — transporte de carga. */
  'forge-cart': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3.75 6.75h16.5v7.5H3.75z M3 17.25h18 M5.25 17.25a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M10.5 17.25a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M15.75 17.25a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
        mode: 'stroke',
      },
    ],
  },
  /** Bloque colgado dunha cadea a trazos — lastre. */
  'forge-weight': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 2.25v1.88M12 5.25v1.88M12 8.25v1.5 M5.25 9.75h13.5v9H5.25z M5.25 14.25h13.5',
        mode: 'stroke',
      },
    ],
  },
  /** Figura detrás da chapa — escudo corporal. A figura ten que ser
   * grande; pequena le como un ollo de pechadura. */
  'forge-guard': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M5.25 4.5h13.5v7.5c0 4.5 -3.75 6.75 -6.75 8.25 -3 -1.5 -6.75 -3.75 -6.75 -8.25z M9.75 9.38a2.25 2.25 0 1 0 4.5 0a2.25 2.25 0 1 0 -4.5 0 M8.25 16.13a3.75 3.75 0 0 1 7.5 0',
        mode: 'stroke',
      },
    ],
  },
  /** Muralla: fiada de bloques trabados. */
  'forge-wall': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.25 6h19.5v12H2.25z M2.25 12h19.5M8.63 6v6M15.38 6v6M5.63 12v6M12 12v6M18.38 12v6',
        mode: 'stroke',
      },
    ],
  },
  /** Mazo e tabique coa greta en zigzag — abrir brecha. */
  'forge-breach': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.25 8.25h6.75v5.25H2.25z M9 10.88h4.5 M15 2.25h6.75v19.5H15z M18.38 2.25l-2.25 5.25 2.25 4.5 -2.25 5.25 2.25 4.5',
        mode: 'stroke',
      },
    ],
  },

  // ── Puntería ────────────────────────────────────────────────
  /** Retícula con marcas de alcance. */
  'forge-crosshair': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M4.5 12a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0 -15 0 M12 1.5v4.5M12 18v4.5M1.5 12h4.5M18 12h4.5 M9.75 12h4.5M12 9.75v4.5',
        mode: 'stroke',
      },
    ],
  },
  /** Onda que se detén nunha barra — respiración, cadencia. */
  'forge-cadence': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.25 15c2.25 0 2.25 -6 4.5 -6s2.25 6 4.5 6 2.25 -6 4.5 -6 M19.5 6v12 M21.75 9v6',
        mode: 'stroke',
      },
    ],
  },
  /** Tiro parabólico: arco dominante, tabique como unha vertical, e o
   * proxectil no cume. */
  'forge-arc': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.25 19.5C4.5 5.25 19.5 5.25 21.75 19.5 M12 20.25V12 M10.69 7.13a1.31 1.31 0 1 0 2.63 0a1.31 1.31 0 1 0 -2.62 0',
        mode: 'stroke',
      },
    ],
  },
  /** Branco lonxano: a aproximación a trazos porque a distancia é o
   * que se está a debuxar. */
  'forge-range': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M1.5 12h2.63M5.63 12h2.63M9.75 12h2.25 M12.75 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0 M17.25 7.5v9M12.75 12h9',
        mode: 'stroke',
      },
    ],
  },
  /** Tubo, bípode e placa base. O que di «morteiro» é a peaña, non o
   * tubo (só, lía como un lapis). */
  'forge-mortar': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M6 18L15 8.25 M13.5 6l3.75 3.75 M10.5 13.5l2.25 6M10.5 13.5l-3 6 M3 20.25h9.75 M18.75 3l1.31 1.88 -1.31 1.88 -1.31 -1.87z',
        mode: 'stroke',
      },
    ],
  },
  /** Ollo cun branco marcado dentro — observador. */
  'forge-eye': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M1.5 12s3.75 -5.25 10.5 -5.25 10.5 5.25 10.5 5.25 -3.75 5.25 -10.5 5.25S1.5 12 1.5 12z M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 9v6M9 12h6',
        mode: 'stroke',
      },
    ],
  },

  // ── Oficio ──────────────────────────────────────────────────
  /** A chave fixa apertando: o oficio enteiro nun debuxo. */
  'forge-wrench': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M15.75 3a4.5 4.5 0 1 0 3 7.5l3 3 -3 3 -3 -3a4.5 4.5 0 0 1 -5.25 -5.25z M10.5 11.25L3 18.75l2.25 2.25 7.5 -7.5',
        mode: 'stroke',
      },
    ],
  },
  /** Gancho de remolque: garfo e cabo. */
  'forge-hook': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M12 2.25v7.5 M12 9.75a5.25 5.25 0 1 0 5.25 5.25 M17.25 15v3.75',
        mode: 'stroke',
      },
    ],
  },
  /** Soprete e fagullas (co bico longo saía unha xiringa). */
  'forge-weld': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3 18l6.75 -6.75 3 3 -6.75 6.75z M12.75 11.25l2.63 -2.62 M18 3.75v3.38M21.75 7.5l-3 1.13M21 12l-3 -1.5',
        mode: 'stroke',
      },
    ],
  },
  /** Erguer ao que non responde: a figura caída coa man erguida, un
   * só brazo baixando, e o agarre no medio. Dúas figuras enteiras non
   * funcionan a este tamaño. */
  'forge-revive': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M1.5 20.25h21 M3 17.25a2.25 2.25 0 1 0 4.5 0a2.25 2.25 0 1 0 -4.5 0 M7.5 18h6l3 2.25 M7.88 15.38l3 -2.25 M20.25 3L15.75 8.25l-3 3 M9.94 12.38a1.69 1.69 0 1 0 3.38 0a1.69 1.69 0 1 0 -3.37 0',
        mode: 'stroke',
      },
    ],
  },

  // ── Identidade e loxística ──────────────────────────────────
  /** Chapa de nome co nome gravado nela. */
  'forge-nameplate': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3 6.75h18v10.5H3z M5.06 12a0.94 0.94 0 1 0 1.88 0a0.94 0.94 0 1 0 -1.87 0 M9.75 10.13h8.25M9.75 12.75h8.25M9.75 15.38h4.5',
        mode: 'stroke',
      },
    ],
  },
  /** Código de barras: un número de serie non se le, escanéase. */
  'forge-barcode': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M3.75 5.25v13.5M6.75 5.25v13.5M9 5.25v13.5M12 5.25v13.5M14.25 5.25v13.5M17.25 5.25v13.5M20.25 5.25v13.5',
        mode: 'stroke',
      },
    ],
  },
  /** Dous elos que non se soltan — vínculo. */
  'forge-link': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M6 8.25h3.75a3.75 3.75 0 0 1 3.75 3.75v0a3.75 3.75 0 0 1 -3.75 3.75h-3.75a3.75 3.75 0 0 1 -3.75 -3.75v0a3.75 3.75 0 0 1 3.75 -3.75z M14.25 8.25h3.75a3.75 3.75 0 0 1 3.75 3.75v0a3.75 3.75 0 0 1 -3.75 3.75h-3.75a3.75 3.75 0 0 1 -3.75 -3.75v0a3.75 3.75 0 0 1 3.75 -3.75z',
        mode: 'stroke',
      },
    ],
  },
  /** O andel e a caixa que volve a el — inventario. */
  'forge-shelf': {
    viewBox: '0 0 24 24',
    paths: [
      {
        d: 'M2.25 7.5h19.5M2.25 16.5h19.5 M3.75 7.5v10.5M20.25 7.5v10.5 M8.25 9h7.5v6H8.25z M8.25 12h7.5',
        mode: 'stroke',
      },
    ],
  },
}
// ── FIN: icons/forge ──
