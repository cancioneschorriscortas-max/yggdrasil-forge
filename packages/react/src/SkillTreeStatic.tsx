// ── INICIO: SkillTreeStatic ──
// Compoñente público RSC-safe que renderiza unha árbore de habilidades
// estaticamente. Cero hooks, cero 'use client', cero <style> interno
// (modo headless puro). Pensado para SSR + React Server Components.

import {
  type LayoutEngineRegistry,
  type TreeDef,
  type TreeState,
  computeLayout,
} from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { MeshOverlay } from './MeshOverlay.js'
import { SkillEdge } from './SkillEdge.js'
import { SkillNode } from './SkillNode.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'
import { buildViewBox } from './svg-helpers.js'

export interface SkillTreeStaticProps {
  /** Definición da árbore (estructura de nodos + edges + layout). */
  readonly treeDef: TreeDef

  /**
   * Estado actual da árbore. Se non se pasa, asume estado inicial
   * (sparse: cero nodos no Record; todos visualmente como 'locked').
   */
  readonly state?: TreeState

  /** Padding ao redor do viewBox. Default 16. */
  readonly padding?: number

  /**
   * Layout registry opcional. Se non se pasa, usa default
   * (Identity + Radial + Tree).
   */
  readonly layoutRegistry?: LayoutEngineRegistry
}

/**
 * Renderiza estaticamente unha árbore de habilidades como SVG. RSC-safe
 * (cero hooks, cero 'use client'). Cero estilos automáticos (modo
 * headless puro; o consumidor inxecta CSS externo se require estilos
 * en SSR).
 */
export function SkillTreeStatic({
  treeDef,
  state,
  padding = 16,
  layoutRegistry,
}: SkillTreeStaticProps): JSX.Element {
  const registry = layoutRegistry ?? createDefaultLayoutRegistry()
  const layoutResult = computeLayout(treeDef, registry)

  if (!layoutResult.ok) {
    return (
      <svg
        className="yf-skill-tree yf-skill-tree--error"
        data-error={layoutResult.error.code}
        viewBox={buildViewBox(undefined, padding)}
        role="img"
        aria-label="Skill tree (layout error)"
      />
    )
  }

  const { nodes: nodePositions, edges: edgePaths, bounds, mesh } = layoutResult.value
  const effectiveState: TreeState = state ?? {
    nodes: {},
    budget: { resources: {} },
  }

  // Constrúe un Map<edgeId, EdgeDef> para lookup rápido.
  const edgeMap = new Map<string, (typeof treeDef.edges)[number]>()
  for (const e of treeDef.edges) edgeMap.set(e.id, e)

  return (
    <svg
      className="yf-skill-tree"
      data-layout={layoutResult.value.layoutType}
      viewBox={buildViewBox(bounds, padding)}
      role="img"
      aria-label="Skill tree"
    >
      <MeshOverlay {...(mesh !== undefined && { mesh })} />
      <g className="yf-skill-edges">
        {[...edgePaths.entries()].map(([edgeId, path]) => {
          const edge = edgeMap.get(edgeId)
          /* v8 ignore next 1 -- defensivo: edgePaths vén de computeLayout sobre treeDef.edges */
          if (edge === undefined) return null
          return <SkillEdge key={edgeId} edgeId={edgeId} edge={edge} path={path} />
        })}
      </g>
      <g className="yf-skill-nodes">
        {treeDef.nodes.map((node) => {
          const position = nodePositions.get(node.id)
          /* v8 ignore next 1 -- defensivo: computeLayout produce posicións para tódolos treeDef.nodes */
          if (position === undefined) return null
          return (
            <SkillNode
              key={node.id}
              node={node}
              instance={effectiveState.nodes[node.id]}
              position={position}
            />
          )
        })}
      </g>
    </svg>
  )
}
// ── FIN: SkillTreeStatic ──
