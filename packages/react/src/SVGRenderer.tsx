'use client'

import type { Bounds } from '@yggdrasil-forge/core'
// ── INICIO: SVGRenderer ──
import { type CSSProperties, type JSX, type ReactNode, useId } from 'react'
import { useTheme } from './ThemeProvider.js'
import { buildAnimationsCSS } from './animations.js'
import { buildViewBox } from './svg-helpers.js'
import type { Theme } from './theme-types.js'

export interface SVGRendererProps {
  readonly bounds?: Bounds
  readonly padding?: number
  readonly layoutType?: string
  readonly error?: string
  readonly ariaLabel?: string
  readonly children?: ReactNode
}

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

  const themeStyle = theme !== null ? buildThemeStyle(theme) : undefined
  const themeRulesCSS = theme !== null ? buildThemeRules(theme, themeId) : null

  return (
    <svg
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      {...(theme !== null && { 'data-theme-id': themeId })}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
      {...(themeStyle !== undefined && { style: themeStyle })}
    >
      {themeRulesCSS !== null && <style>{themeRulesCSS}</style>}
      {children}
    </svg>
  )
}

/**
 * Constrúe o objeto `style` con CSS variables a partir do tema.
 */
function buildThemeStyle(theme: Theme): CSSProperties {
  const style: Record<string, string | number> = {
    '--yf-color-text': theme.colors.text,
    '--yf-color-node-locked': theme.colors.nodeLocked,
    '--yf-color-node-unlockable': theme.colors.nodeUnlockable,
    '--yf-color-node-unlocked': theme.colors.nodeUnlocked,
    '--yf-color-node-maxed': theme.colors.nodeMaxed,
    '--yf-color-node-in-progress': theme.colors.nodeInProgress,
    '--yf-color-node-stroke': theme.colors.nodeStroke,
    '--yf-color-edge': theme.colors.edge,
    '--yf-color-mesh': theme.colors.mesh,
    '--yf-stroke-width': theme.sizes.strokeWidth,
    '--yf-font-size': theme.sizes.fontSize,
    '--yf-font-size-small': theme.sizes.fontSizeSmall,
  }
  /* v8 ignore next 3 -- rama background defensiva; cero tema actual define background pero o tipo opcional require o check */
  if (theme.colors.background !== undefined) {
    style['--yf-color-background'] = theme.colors.background
  }
  return style as CSSProperties
}

/**
 * Constrúe as regras CSS internas scopeadas via `[data-theme-id="..."]`
 * para evitar interferencia entre múltiples SkillTree na mesma páxina.
 */
function buildThemeRules(theme: Theme, themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  /* v8 ignore next 3 -- rama background defensiva; cero tema actual define background */
  const bgRule =
    theme.colors.background !== undefined
      ? `${sel} { background: var(--yf-color-background); }\n`
      : ''
  return (
    `${bgRule}` +
    `${sel} .yf-skill-node__circle { fill: var(--yf-color-node-locked); stroke: var(--yf-color-node-stroke); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { fill: var(--yf-color-node-unlockable); }\n` +
    `${sel} .yf-skill-node[data-state="unlocked"] .yf-skill-node__circle { fill: var(--yf-color-node-unlocked); }\n` +
    `${sel} .yf-skill-node[data-state="maxed"] .yf-skill-node__circle { fill: var(--yf-color-node-maxed); }\n` +
    `${sel} .yf-skill-node[data-state="in_progress"] .yf-skill-node__circle { fill: var(--yf-color-node-in-progress); }\n` +
    `${sel} .yf-skill-node__label { font-size: var(--yf-font-size); fill: var(--yf-color-text); }\n` +
    `${sel} .yf-skill-node__progress { font-size: var(--yf-font-size-small); fill: var(--yf-color-text); }\n` +
    `${sel} .yf-skill-edge { stroke: var(--yf-color-edge); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-mesh-overlay__line { stroke: var(--yf-color-mesh); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-mesh-overlay__circle { stroke: var(--yf-color-mesh); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-mesh-overlay__polygon { stroke: var(--yf-color-mesh); stroke-width: var(--yf-stroke-width); }` +
    `\n${buildAnimationsCSS(themeId)}`
  )
}
// ── FIN: SVGRenderer ──
