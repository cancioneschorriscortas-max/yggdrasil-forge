// ── INICIO: Theme types ──

/**
 * Tema do `@yggdrasil-forge/react`. Define tokens (cores, sizes,
 * fontes) que se aplican aos compoñentes via CSS variables inxectadas
 * polo `SVGRenderer` cando hai un `ThemeProvider` ascendente.
 *
 * Os tokens son **contrato público estable**: novos campos pódense
 * engadir en sub-fases futuras como opcionais; eliminacións son
 * breaking change e require bump major.
 */
export interface Theme {
  /**
   * Cores do tema. Valores son CSS color strings (hex, rgb, hsl,
   * named, var()).
   */
  readonly colors: ThemeColors

  /** Sizes (radios, anchos, font sizes en unidades do layout). */
  readonly sizes: ThemeSizes
}

export interface ThemeColors {
  /** Cor de fondo do svg (cero, fondo transparente). */
  readonly background?: string

  /** Cor do texto (labels, progress). */
  readonly text: string

  /** Cor de fondo do nodo cando state='locked'. */
  readonly nodeLocked: string

  /** Cor de fondo do nodo cando state='unlockable'. */
  readonly nodeUnlockable: string

  /** Cor de fondo do nodo cando state='unlocked'. */
  readonly nodeUnlocked: string

  /** Cor de fondo do nodo cando state='maxed'. */
  readonly nodeMaxed: string

  /** Cor de fondo do nodo cando state='in_progress'. */
  readonly nodeInProgress: string

  /** Cor do borde do nodo (todos os estados). */
  readonly nodeStroke: string

  /** Cor das liñas dos edges. */
  readonly edge: string

  /**
   * Cor dos edges activos/«acesos» (F10.4). Opcional; fallback a
   * `edge`. Un edge é activo cando o seu nodo `source` está en
   * `unlocked` ou `maxed` (camiños «acesos» desde nodos conquistados).
   */
  readonly edgeActive?: string

  /** Cor dos elementos do mesh overlay (line, circle, polygon). */
  readonly mesh: string

  /**
   * Interior do orbe (fill do shape). Opcional; fallback `#f4f4ef`.
   * Engadido en F10.3.fix (tematización inline). Coexiste co modelo
   * plano-adaptativo: o fill é neutro/claro; o estado coloréase
   * no anel (stroke).
   */
  readonly nodeFill?: string
}

export interface ThemeSizes {
  /** Stroke width das liñas (edges, mesh, node stroke). Default 2. */
  readonly strokeWidth: number

  /** Font size para labels dos nodos. */
  readonly fontSize: number

  /** Font size para texto de progress (porcentaxe). */
  readonly fontSizeSmall: number

  /**
   * Grosor do anel (stroke-width) do shape do nodo. Opcional;
   * fallback `3`. Engadido en F10.3.fix.
   */
  readonly ringWidth?: number
}
// ── FIN: Theme types ──
