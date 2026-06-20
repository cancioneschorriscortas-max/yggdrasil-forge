// ── INICIO: SkillRegions (Capa 2 — rexións por tag) ──
// Renderiza tintes de fondo por columna/rexión, calculando o bounding box
// dos nodos cuxo array `tags` inclúe `region.tag`. Aplícase dentro do
// `<g transform>` do viewport, ANTES de edges e nodos (z-order: rexións
// → edges → nodos).
//
// Render minimalista: <rect> de baixa opacidade + <text> co label da
// rexión na parte superior do bbox. Cero acoplamento ao motor: o
// consumidor pasa os specs e nós resolvemos posicións.
import type { NodeDef } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { useTheme } from './ThemeProvider.js'
import { resolveRadius } from './nodeGeometry.js'

/**
 * Especificación dunha rexión visual (Capa 2 — rexións + Theme Lab).
 *
 * Cada rexión é un grupo de nodos identificados por un tag compartido
 * no `tags` do `NodeDef`. O renderer pinta un `<rect>` con tinte detrás
 * dos edges e nodos cuxo bbox engloba a tódolos nodos do grupo.
 *
 * Cero schema en `@core`: o `RegionSpec` é unha prop de `@react`, polo
 * que o consumidor pode definir grupos sen migrar o seu TreeDef. Iso
 * permite iterar grupos sen mudar o motor.
 */
export interface RegionSpec {
  /** Identificador interno (key para React + selector no Theme Lab). */
  readonly id: string
  /** Etiqueta lexible da rexión (ex. "Guerreiro"). */
  readonly label: string
  /** Tag que un `NodeDef.tags` debe incluír para pertencer á rexión. */
  readonly tag: string
  /** Cor do tinte. Aplícase con baixa opacidade (~0.12) sobre o canvas. */
  readonly color: string
}

interface SkillRegionsProps {
  /** Especificacións das rexións (orde de render = orde no array). */
  readonly regions: readonly RegionSpec[]
  /** Posicións dos nodos no espazo do layout (de `computeLayout`). */
  readonly nodePositions: ReadonlyMap<string, { readonly x: number; readonly y: number }>
  /** Definicións dos nodos do TreeDef (para ler `tags` e `radius`). */
  readonly nodes: readonly NodeDef[]
  /** Padding (en unidades do layout) ao redor do bbox da rexión. Default 32. */
  readonly padding?: number
  /** Opacidade do tinte. Default 0.12 (baixa, para non tapar). */
  readonly tintOpacity?: number
}

interface ComputedRegion {
  readonly spec: RegionSpec
  readonly bbox: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  }
}

/**
 * Calcula o bounding box dos nodos cuxo `tags` inclúe `tag`, expandido
 * por `radius + padding` en cada lado. Devolve `null` se non hai nodos
 * dese tag (a rexión non se debuxa nese caso).
 */
function computeRegionBbox(
  tag: string,
  nodes: readonly NodeDef[],
  positions: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
  padding: number,
): ComputedRegion['bbox'] | null {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let found = false

  for (const node of nodes) {
    if (node.tags === undefined || !node.tags.includes(tag)) continue
    const pos = positions.get(node.id)
    if (pos === undefined) continue
    const r = resolveRadius(node)
    if (pos.x - r < minX) minX = pos.x - r
    if (pos.y - r < minY) minY = pos.y - r
    if (pos.x + r > maxX) maxX = pos.x + r
    if (pos.y + r > maxY) maxY = pos.y + r
    found = true
  }

  if (!found) return null
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  }
}

/**
 * Renderiza tintes de fondo por rexión. Aplícase dentro do `<g transform>`
 * do viewport e ANTES dos edges/nodos (z-order: rexións → edges → nodos).
 */
export function SkillRegions({
  regions,
  nodePositions,
  nodes,
  padding = 32,
  tintOpacity = 0.12,
}: SkillRegionsProps): JSX.Element | null {
  const theme = useTheme()
  if (regions.length === 0) return null

  const computed: ComputedRegion[] = []
  for (const spec of regions) {
    const bbox = computeRegionBbox(spec.tag, nodes, nodePositions, padding)
    if (bbox !== null) computed.push({ spec, bbox })
  }
  if (computed.length === 0) return null

  const textColor = theme?.colors.text ?? '#666666'

  return (
    <g className="yf-skill-regions" data-testid="skill-regions" pointerEvents="none">
      {computed.map(({ spec, bbox }) => {
        const width = bbox.maxX - bbox.minX
        const height = bbox.maxY - bbox.minY
        return (
          <g key={spec.id} className="yf-skill-region" data-region-id={spec.id}>
            <rect
              x={bbox.minX}
              y={bbox.minY}
              width={width}
              height={height}
              rx={12}
              ry={12}
              fill={spec.color}
              fillOpacity={tintOpacity}
              stroke={spec.color}
              strokeOpacity={tintOpacity * 1.5}
              strokeWidth={1}
            />
            <text
              x={bbox.minX + width / 2}
              y={bbox.minY + 18}
              textAnchor="middle"
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fill: textColor,
                fillOpacity: 0.55,
              }}
            >
              {spec.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
// ── FIN: SkillRegions ──
