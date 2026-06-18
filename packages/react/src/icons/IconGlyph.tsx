// ── INICIO: icons/IconGlyph ──
// Compoñente puro que renderiza un `IconDef` como `<svg>` aniñado
// dentro do `<g>` do nodo SVG. O recolor faise por `currentColor`:
// o `<svg>` ten `style={{ color }}` (CSS color), e cada path usa
// `fill="currentColor"` ou `stroke="currentColor"` (segundo o mode).
//
// Patrón coherente con F10.3.fix (theming inline; sen CSS vars nin
// <style> scopeado).

import type { CSSProperties, JSX } from 'react'
import type { IconDef } from './registry.js'

const DEFAULT_VIEWBOX = '0 0 24 24'
const STROKE_WIDTH = 2

export interface IconGlyphProps {
  readonly def: IconDef
  /** Tamaño total do `<svg>` (cadrado). */
  readonly size: number
  /** Cor aplicada ao SVG (vía CSS `color`; paths usan `currentColor`). */
  readonly color?: string
}

/**
 * Renderiza un `IconDef` SVG dimensionado a `size` × `size` centrado
 * no orixe (x = -size/2, y = -size/2). O wrapper SVG é
 * `aria-hidden="true"` porque a label do nodo xa transmite a
 * semántica.
 */
export function IconGlyph({ def, size, color }: IconGlyphProps): JSX.Element {
  const viewBox = def.viewBox ?? DEFAULT_VIEWBOX
  const style: CSSProperties = color !== undefined ? { color } : {}
  const x = -size / 2
  const y = -size / 2
  return (
    <svg
      className="yf-skill-node__icon"
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox={viewBox}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {def.paths.map((p, i) => {
        const mode = p.mode ?? 'fill'
        if (mode === 'stroke') {
          return (
            <path
              key={`p-${String(i)}`}
              d={p.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }
        return <path key={`p-${String(i)}`} d={p.d} fill="currentColor" />
      })}
    </svg>
  )
}
// ── FIN: icons/IconGlyph ──
