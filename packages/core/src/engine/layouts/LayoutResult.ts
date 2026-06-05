// ── INICIO: LayoutResult tipos ──
import type { Position } from '../../types/node.js'

/**
 * Tipo de path para un edge. Determina como se interpreta o array
 * `points` de EdgePath:
 *
 * - `'line'` (default): 2 puntos (start, end). Liña recta.
 * - `'cubic'`: 4 puntos (P0, P1=control1, P2=control2, P3=end).
 *   Cubic Bézier curve.
 * - `'polyline'`: 3+ puntos. Polyline (segmentos rectos
 *   consecutivos). Usado para 'orthogonal' L-shape ou S-shape.
 *
 * Engadido en 4.5 (cero ruptura: campo opcional con default 'line'
 * para EdgePaths producidos por sub-fases 4.1-4.4).
 */
export type PathKind = 'line' | 'cubic' | 'polyline'

/**
 * Paths para un edge.
 */
export interface EdgePath {
  /**
   * Lista de puntos. Interpretación segundo `kind`:
   * - `'line'` (default): 2 puntos (start, end).
   * - `'cubic'`: 4 puntos (P0, P1=control1, P2=control2, P3).
   * - `'polyline'`: 3+ puntos.
   */
  readonly points: readonly Position[]

  /**
   * Tipo de path. Default `'line'` se non se especifica.
   * Engadido en 4.5 para soportar curvas e orthogonal.
   */
  readonly kind?: PathKind
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
 * Elemento visual auxiliar do layout. Discriminated union por `type`.
 *
 * Os layouts opcionalmente xeran elementos mesh (círculos
 * concéntricos para `radial`, etc.) para guiar visualmente ao
 * usuario. Os renderers (React/SVG futuros) decidirán como debuxalos.
 */
export type MeshElement =
  | {
      readonly type: 'line'
      readonly from: Position
      readonly to: Position
    }
  | {
      readonly type: 'circle'
      readonly center: Position
      readonly radius: number
    }
  | {
      readonly type: 'polygon'
      readonly points: readonly Position[]
    }

/**
 * Resultado dunha computación de layout.
 *
 * - `nodes`: posición por id de nodo.
 * - `edges`: path por id de edge.
 * - `bounds`: caixa contedora axis-aligned.
 * - `layoutType`: tipo de layout que produciu este resultado.
 * - `mesh`: elementos visuais auxiliares (opcional). Engadido en 4.2.
 */
export interface LayoutResult {
  readonly nodes: ReadonlyMap<string, Position>
  readonly edges: ReadonlyMap<string, EdgePath>
  readonly bounds: Bounds
  readonly layoutType: string
  /** Elementos visuais auxiliares. Engadido en 4.2 (campo opcional, cero ruptura). */
  readonly mesh?: readonly MeshElement[]
}
// ── FIN: LayoutResult tipos ──
