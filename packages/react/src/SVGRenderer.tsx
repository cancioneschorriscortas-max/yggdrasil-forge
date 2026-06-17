'use client'

import type { Bounds } from '@yggdrasil-forge/core'
// ── INICIO: SVGRenderer ──
import { type JSX, type ReactNode, useId } from 'react'
import { useTheme } from './ThemeProvider.js'
import { buildAnimationsCSS } from './animations.js'
import { buildViewBox } from './svg-helpers.js'

export interface SVGRendererProps {
  readonly bounds?: Bounds
  readonly padding?: number
  readonly layoutType?: string
  readonly error?: string
  readonly ariaLabel?: string
  readonly children?: ReactNode
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
export function SVGRenderer({
  bounds,
  padding = 16,
  layoutType,
  error,
  ariaLabel,
  children,
}: SVGRendererProps): JSX.Element {
  const theme = useTheme()
  const themeId = useId()
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

  const animationsCSS = theme !== null ? buildAnimationsCSS(themeId) : null

  return (
    <svg
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      {...(theme !== null && { 'data-theme-id': themeId })}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
    >
      {animationsCSS !== null && <style>{animationsCSS}</style>}
      {children}
    </svg>
  )
}
// ── FIN: SVGRenderer ──
