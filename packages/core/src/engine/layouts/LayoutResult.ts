// ── INICIO: LayoutResult tipos ──
import type { Position } from '../../types/node.js'

/**
 * Paths para un edge. En 4.1 é simplemente unha lista de puntos
 * (mínimo 2). 4.5 (PathBuilder) ampliará con curvas/beziers se
 * procede; engadirase como campo opcional para non romper
 * consumidores.
 */
export interface EdgePath {
  /** Mínimo 2 puntos (orixe + destino). */
  readonly points: readonly Position[]
}

/**
 * Caixa contedora do layout (axis-aligned bounding box).
 *
 * Para un TreeDef baleiro: `{minX: 0, minY: 0, maxX: 0, maxY: 0}`.
 */
export interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/**
 * Resultado dunha computación de layout.
 *
 * - `nodes`: posición por id de nodo.
 * - `edges`: path por id de edge.
 * - `bounds`: caixa contedora axis-aligned.
 * - `layoutType`: tipo de layout que produciu este resultado
 *   (`'radial'`, `'tree'`, `'custom'`, etc.).
 */
export interface LayoutResult {
  readonly nodes: ReadonlyMap<string, Position>
  readonly edges: ReadonlyMap<string, EdgePath>
  readonly bounds: Bounds
  readonly layoutType: string
}
// ── FIN: LayoutResult tipos ──
