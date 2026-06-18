// ── INICIO: Edge types ──
// Conexións entre nodos: dependencias, exclusións, camiños visuais.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { CurveStyle } from '../engine/layouts/PathBuilder.js'

/**
 * Tipo semántico dunha conexión.
 *
 * - `dependency` — A require B (B debe estar desbloqueado para que A o sexa)
 * - `soft_dependency` — A recomenda B (informativo, non obrigatorio)
 * - `exclusion` — A e B son mutuamente excluíntes
 * - `enhancement` — A potencia B se ambos están desbloqueados
 * - `path` — Camiño visual sen semántica de dependencia
 * - `cluster` — Pertenza a un cluster (agrupación visual)
 * - `subtree_link` — Conexión a un nodo dentro dunha sub-árbore
 */
export type EdgeType =
  | 'dependency'
  | 'soft_dependency'
  | 'exclusion'
  | 'enhancement'
  | 'path'
  | 'cluster'
  | 'subtree_link'

/**
 * Estilo visual dunha conexión (renderizado).
 */
export interface EdgeStyle {
  readonly color?: string
  readonly width?: number
  /** Patrón de trazo: [5, 3] = 5px liña, 3px oco. */
  readonly dashPattern?: readonly number[]
  /** Aplicar efecto glow. */
  readonly glow?: boolean
  /** Liña animada (partículas, pulso). */
  readonly animated?: boolean
  /** Debuxar frecha no extremo `target` (F10.4). Default `false`. */
  readonly directed?: boolean
  /**
   * Override de curva por-edge (F10.4b). Gaña sobre
   * `LayoutConfig.curve`. Se ambos están ausentes (ou son 'straight'),
   * o path queda recto (do layout). Aplícase por `computeLayout`.
   */
  readonly routing?: CurveStyle
}

/**
 * Definición dunha conexión entre dous nodos.
 *
 * **Inmutable** (igual que NodeDef).
 */
export interface EdgeDef {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: EdgeType
  /** Aplicable nos dous sentidos (defecto: false). */
  readonly bidirectional?: boolean
  /** Etiqueta opcional sobre a conexión. */
  readonly label?: LocalizedString
  /** Peso/distancia para pathfinding (Dijkstra). */
  readonly weight?: number
  /** Estilo visual override. */
  readonly style?: EdgeStyle
}
// ── FIN: Edge types ──
