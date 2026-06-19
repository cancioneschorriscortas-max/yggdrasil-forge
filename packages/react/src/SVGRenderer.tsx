'use client'

import type { Bounds } from '@yggdrasil-forge/core'
// ── INICIO: SVGRenderer ──
import {
  type CSSProperties,
  type JSX,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useId,
} from 'react'
import { useTheme } from './ThemeProvider.js'
import { buildAnimationsCSS } from './animations.js'
import { buildViewBox } from './svg-helpers.js'

/**
 * ID estable do marker `<marker>` da frecha (F10.4). Compartido entre
 * `SVGRenderer` (que define o marker en `<defs>`) e `SkillEdge` (que o
 * referencia via `marker-end="url(#...)"`).
 *
 * Estable cross-instance: hai un só skill-tree por viewport como caso
 * típico; aínda con varios, todos comparten o mesmo marker (mesmo
 * shape), polo que un id global é suficiente.
 */
export const ARROW_MARKER_ID = 'yf-arrow-marker'

export interface SVGRendererProps {
  readonly bounds?: Bounds
  readonly padding?: number
  readonly layoutType?: string
  readonly error?: string
  readonly ariaLabel?: string
  readonly children?: ReactNode
  /**
   * Transform SVG aplicado ao `<g>` que envolve os children (F10.6).
   * Default: identidade (sen pan/zoom). O `<defs>` queda **fóra** do
   * transform para que os markers non escalen co contido.
   */
  readonly transform?: string
  /** Pan/zoom handlers (F10.6); todos opcionais. */
  readonly onPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void
  readonly onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void
}

/**
 * F10.3.fix — tematización inline.
 *
 * `SVGRenderer` xa NON inxecta CSS variables nin emite regras de cor.
 * As cores aplícanse como inline `style` polos consumidores
 * (`SkillNode`, `SkillEdge`, `MeshOverlay`) calculando desde
 * `useTheme()` no propio compoñente.
 *
 * Conservamos:
 * - `data-theme-id={themeId}` (áncora estable para scope das animacións).
 * - `<style>{buildAnimationsCSS(themeId)}</style>` (transicións,
 *   keyframes, pulse, reduced-motion). Esas si funcionan e dan vida ao
 *   cambio de cor.
 *
 * Por que o cambio: o modelo anterior (CSS vars + regras `var()` nun
 * `<style>` interior scopeado por `data-theme-id`) só aplicaba en
 * background no demo do navegador real (cascade/scope inestable). Vendo
 * que o problema era estrutural, eliminamos a dependencia do `<style>`
 * interior para cores e usamos inline-style coa propiedade CSS (non
 * atributo SVG) para conservar transicións.
 */
export const SVGRenderer = forwardRef<SVGSVGElement, SVGRendererProps>(function SVGRenderer(
  {
    bounds,
    padding = 16,
    layoutType,
    error,
    ariaLabel,
    children,
    transform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  },
  ref,
): JSX.Element {
  const theme = useTheme()
  const themeId = useId()
  const viewBox = buildViewBox(bounds, padding)

  if (error !== undefined) {
    return (
      <svg
        ref={ref}
        className="yf-skill-tree yf-skill-tree--error"
        data-error={error}
        viewBox={viewBox}
        role="img"
        aria-label={ariaLabel ?? 'Skill tree (layout error)'}
      />
    )
  }

  const animationsCSS = theme !== null ? buildAnimationsCSS(themeId) : null

  // F10.4: marker de frecha en <defs>. fill inline desde useTheme()
  // (mesmo patrón que SkillEdge stroke). Só se emite cando hai tema —
  // mesma convención que data-theme-id e o <style> de animacións.
  const arrowFillStyle: CSSProperties | undefined =
    theme !== null && theme.colors.edge !== undefined ? { fill: theme.colors.edge } : undefined

  return (
    <svg
      ref={ref}
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      {...(theme !== null && { 'data-theme-id': themeId })}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
      {...(onPointerDown !== undefined && { onPointerDown })}
      {...(onPointerMove !== undefined && { onPointerMove })}
      {...(onPointerUp !== undefined && { onPointerUp })}
    >
      {animationsCSS !== null && <style>{animationsCSS}</style>}
      {theme !== null && (
        <defs>
          <marker
            id={ARROW_MARKER_ID}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              {...(arrowFillStyle !== undefined && { style: arrowFillStyle })}
            />
          </marker>
        </defs>
      )}
      {/* F10.6: pan/zoom group. Identidade por defecto (cero impacto
          se non se pasa `transform`). <defs> queda fóra para que os
          markers non escalen co contido (decisión: markers manteñen
          tamaño constante percibido, máis predecible). */}
      <g {...(transform !== undefined && { transform })}>{children}</g>
    </svg>
  )
})
// ── FIN: SVGRenderer ──
