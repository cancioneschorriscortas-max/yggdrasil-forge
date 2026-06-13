'use client'
// ── INICIO: SkillTree ──
// Compoñente raíz SVG que toma un TreeEngine como prop e renderiza
// a árbore enteira. Subscríbese ao engine via useSyncExternalStore
// nativo de React 18+ (re-render automático). Computa layout
// internamente via computeLayout. Headless: cero estilos hardcoded.

import { type LayoutEngineRegistry, type TreeEngine, computeLayout } from '@yggdrasil-forge/core'
import { type JSX, useMemo, useSyncExternalStore } from 'react'
import { SkillEdge } from './SkillEdge.js'
import { SkillNode } from './SkillNode.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'

export interface SkillTreeProps {
  /** TreeEngine a renderizar. Subscríbese para re-render automático. */
  readonly engine: TreeEngine

  /**
   * Locale para mensaxes de erro de layout (propagadas desde
   * computeLayout). Default 'gl'.
   */
  readonly locale?: string

  /** Callback cando o usuario activa un nodo (clic ou Enter). */
  readonly onNodeClick?: (nodeId: string) => void

  /** Callback cando o usuario activa un edge (clic). */
  readonly onEdgeClick?: (edgeId: string) => void

  /**
   * Layout registry opcional. Se non se pasa, usa default interno
   * (Identity + Radial + Tree). Permite a consumidores avanzados
   * inxectar layouts customizados ou substituír os defaults.
   */
  readonly layoutRegistry?: LayoutEngineRegistry

  /**
   * Padding adicional ao redor do viewBox (en unidades do layout).
   * Default 16. Cero asume o bounds estricto.
   */
  readonly padding?: number
}

export function SkillTree({
  engine,
  locale,
  onNodeClick,
  onEdgeClick,
  layoutRegistry,
  padding = 16,
}: SkillTreeProps): JSX.Element {
  // Subscrición ao engine (re-render automático).
  // useSyncExternalStore é hook NATIVO de React 18+; cero hook customizado.
  const state = useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getSnapshot.bind(engine), // server snapshot = client snapshot
  )

  // Layout: computado por memo sobre treeDef (estable durante o ciclo
  // de vida do engine). Registry resólvese unha vez (memoizado).
  const treeDef = engine.getTreeDef()
  const registry = useMemo(() => layoutRegistry ?? createDefaultLayoutRegistry(), [layoutRegistry])
  const layoutResult = useMemo(
    () => computeLayout(treeDef, registry, locale),
    [treeDef, registry, locale],
  )

  // Manexo de erro de layout: render SVG vacío semántico.
  // Cero throw (preserva error boundary explícito para 7.11).
  if (!layoutResult.ok) {
    return (
      <svg
        className="yf-skill-tree yf-skill-tree--error"
        data-error={layoutResult.error.code}
        role="img"
        aria-label="Skill tree (layout error)"
      />
    )
  }

  const { nodes: nodePositions, edges: edgePaths, bounds } = layoutResult.value

  // Constrúe un Map<edgeId, EdgeDef> para lookup rápido.
  const edgeMap = useMemo(() => {
    const m = new Map<string, (typeof treeDef.edges)[number]>()
    for (const e of treeDef.edges) m.set(e.id, e)
    return m
  }, [treeDef])

  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${
    bounds.maxX - bounds.minX + padding * 2
  } ${bounds.maxY - bounds.minY + padding * 2}`

  return (
    <svg
      className="yf-skill-tree"
      data-layout={layoutResult.value.layoutType}
      viewBox={viewBox}
      role="img"
      aria-label="Skill tree"
    >
      <g className="yf-skill-edges">
        {[...edgePaths.entries()].map(([edgeId, path]) => {
          const edge = edgeMap.get(edgeId)
          /* v8 ignore next 1 -- defensivo: edgePaths vén de computeLayout sobre treeDef.edges */
          if (edge === undefined) return null
          return (
            <SkillEdge
              key={edgeId}
              edgeId={edgeId}
              edge={edge}
              path={path}
              {...(onEdgeClick !== undefined && { onClick: onEdgeClick })}
            />
          )
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
              instance={state.nodes[node.id]}
              position={position}
              {...(onNodeClick !== undefined && { onClick: onNodeClick })}
            />
          )
        })}
      </g>
    </svg>
  )
}
// ── FIN: SkillTree ──
