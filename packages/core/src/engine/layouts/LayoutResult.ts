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
