import type { Bounds } from '@yggdrasil-forge/core'
// ── INICIO: SVGRenderer ──
import type { JSX, ReactNode } from 'react'
import { buildViewBox } from './svg-helpers.js'

export interface SVGRendererProps {
  /**
   * Bounds do contido (do layoutResult). Se non se pasa, viewBox
   * defaultea a `'0 0 0 0'` (estado vacío; mostra cero contido).
   */
  readonly bounds?: Bounds

  /**
   * Padding ao redor dos bounds (en unidades do layout). Default 16.
   * Cero pasa = sen marxen.
   */
  readonly padding?: number

  /**
   * Tipo de layout activo (p.ex. 'custom', 'radial', 'tree').
   * Renderizado como `data-layout` no `<svg>`. Útil para CSS por
   * layout.
   */
  readonly layoutType?: string

  /**
   * Modo de erro. Se `error` está definido, renderízase un svg
   * con `class="yf-skill-tree--error"` + `data-error={error}` e
   * un `aria-label` específico. Cero children renderízanse en
   * estado de erro.
   */
  readonly error?: string

  /**
   * Etiqueta aria do svg. Default 'Skill tree' (ou 'Skill tree
   * (layout error)' en estado erro).
   */
  readonly ariaLabel?: string

  /**
   * Contido SVG interior. Tipicamente `<MeshOverlay />` + `<g>`s
   * con SkillEdges e SkillNodes.
   */
  readonly children?: ReactNode
}

/**
 * Compoñente público wrapper para `<svg>` co viewBox calculado
 * automáticamente desde `bounds + padding`, role/aria, classes
 * documentadas e modo de erro. Usado internamente por SkillTree;
 * exportado publicamente para que consumidores poidan compoñer
 * vistas custom (combinando con SkillNode, SkillEdge, MeshOverlay).
 *
 * Compoñente puro (cero hooks). SSR-safe.
 */
export function SVGRenderer({
  bounds,
  padding = 16,
  layoutType,
  error,
  ariaLabel,
  children,
}: SVGRendererProps): JSX.Element {
  const viewBox = buildViewBox(bounds, padding)

  if (error !== undefined) {
    return (
      <svg
        className="yf-skill-tree yf-skill-tree--error"
        data-error={error}
        viewBox={viewBox}
        role="img"
        aria-label={ariaLabel ?? 'Skill tree (layout error)'}
      />
    )
  }

  return (
    <svg
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
    >
      {children}
    </svg>
  )
}
// ── FIN: SVGRenderer ──
