// ── INICIO: PathBuilder ──
import type { Position } from '../../types/node.js'
import type { EdgePath, LayoutResult } from './LayoutResult.js'

/**
 * Estilo de curva para edges.
 *
 * - `'straight'`: liña recta (2 puntos). Compatible cos edges
 *   producidos por IdentityLayout/RadialLayout/TreeLayout (4.1-4.4).
 * - `'diagonal-vertical'`: cubic Bézier con tangentes verticais.
 *   Ideal para TreeLayout top-down/bottom-up.
 * - `'diagonal-horizontal'`: cubic Bézier con tangentes horizontais.
 *   Ideal para TreeLayout left-right/right-left.
 * - `'radial'`: cubic Bézier en coordenadas polares (control points
 *   no medio do segmento). Ideal para RadialLayout.
 * - `'orthogonal'`: polyline (L-shape ou S-shape). Patrón "Manhattan".
 */
export type CurveStyle =
  | 'straight'
  | 'diagonal-vertical'
  | 'diagonal-horizontal'
  | 'radial'
  | 'orthogonal'

/**
 * Opcións para PathBuilder.
 *
 * - `tension`: para cubic Bézier, controla "intensidade" das
 *   tangentes (0..1). Default 0.5.
 * - `centerX/centerY`: centro do layout (para 'radial'). Default 0.
 * - `cornerRatio`: para 'orthogonal', posición do "corner" como
 *   fracción (0..1). Default 0.5 (midpoint).
 */
export interface PathBuilderOptions {
  readonly tension?: number
  readonly centerX?: number
  readonly centerY?: number
  readonly cornerRatio?: number
}

/**
 * Función pura que transforma os edges dun LayoutResult aplicando un
 * estilo de curva. Devolve un novo LayoutResult con `edges`
 * actualizado; o resto (nodes, bounds, layoutType, mesh) intacto.
 */
export function buildPaths(
  layoutResult: LayoutResult,
  style: CurveStyle,
  options: PathBuilderOptions = {},
): LayoutResult {
  const tension = options.tension ?? 0.5
  const centerX = options.centerX ?? 0
  const centerY = options.centerY ?? 0
  const cornerRatio = options.cornerRatio ?? 0.5

  const newEdges = new Map<string, EdgePath>()
  for (const [edgeId, oldPath] of layoutResult.edges) {
    const points = oldPath.points
    if (points.length < 2) {
      newEdges.set(edgeId, oldPath)
      continue
    }
    const source = points[0]
    const target = points[points.length - 1]
    if (source === undefined || target === undefined) {
      newEdges.set(edgeId, oldPath)
      continue
    }
    const newPath = buildPath(style, source, target, {
      tension,
      centerX,
      centerY,
      cornerRatio,
    })
    newEdges.set(edgeId, newPath)
  }

  return {
    ...layoutResult,
    edges: newEdges,
  }
}

/** Helper: constrúe un EdgePath para un par source/target. */
function buildPath(
  style: CurveStyle,
  source: Position,
  target: Position,
  opts: {
    tension: number
    centerX: number
    centerY: number
    cornerRatio: number
  },
): EdgePath {
  switch (style) {
    case 'straight':
      return { points: [source, target], kind: 'line' }

    case 'diagonal-vertical': {
      const dy = target.y - source.y
      const c1: Position = {
        x: source.x,
        y: source.y + dy * opts.tension,
      }
      const c2: Position = {
        x: target.x,
        y: target.y - dy * opts.tension,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'diagonal-horizontal': {
      const dx = target.x - source.x
      const c1: Position = {
        x: source.x + dx * opts.tension,
        y: source.y,
      }
      const c2: Position = {
        x: target.x - dx * opts.tension,
        y: target.y,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'radial': {
      const mid: Position = {
        x: (source.x + target.x) / 2,
        y: (source.y + target.y) / 2,
      }
      const c1: Position = {
        x: source.x + (mid.x - source.x) * opts.tension,
        y: source.y + (mid.y - source.y) * opts.tension,
      }
      const c2: Position = {
        x: target.x + (mid.x - target.x) * opts.tension,
        y: target.y + (mid.y - target.y) * opts.tension,
      }
      return { points: [source, c1, c2, target], kind: 'cubic' }
    }

    case 'orthogonal': {
      const cornerX = source.x + (target.x - source.x) * opts.cornerRatio
      if (opts.cornerRatio === 0 || opts.cornerRatio === 1) {
        const lcorner: Position =
          opts.cornerRatio === 0 ? { x: source.x, y: target.y } : { x: target.x, y: source.y }
        return { points: [source, lcorner, target], kind: 'polyline' }
      }
      const corner: Position = { x: cornerX, y: source.y }
      const corner2: Position = { x: cornerX, y: target.y }
      return {
        points: [source, corner, corner2, target],
        kind: 'polyline',
      }
    }
  }
}
// ── FIN: PathBuilder ──
