'use client'
// ── INICIO: SkillTree ──
// Compoñente raíz SVG que toma un TreeEngine como prop e renderiza
// a árbore enteira. Subscríbese ao engine via useSyncExternalStore
// nativo de React 18+ (re-render automático). Computa layout
// internamente via computeLayout. Headless: cero estilos hardcoded.

import { type LayoutEngineRegistry, type TreeEngine, computeLayout } from '@yggdrasil-forge/core'
import { type JSX, useMemo, useSyncExternalStore } from 'react'
import { MeshOverlay } from './MeshOverlay.js'
import { SVGRenderer } from './SVGRenderer.js'
import { SkillEdge } from './SkillEdge.js'
import { SkillNode } from './SkillNode.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'

export interface SkillTreeProps {
  readonly engine: TreeEngine
  readonly locale?: string
  readonly onNodeClick?: (nodeId: string) => void
  readonly onEdgeClick?: (edgeId: string) => void
  /**
   * Handler opcional disparado tras un long press (700ms default)
   * sobre un nodo. Propágase a SkillNode internamente.
   */
  readonly onNodeLongPress?: (nodeId: string) => void
  readonly layoutRegistry?: LayoutEngineRegistry
  readonly padding?: number
}

export function SkillTree({
  engine,
  locale,
  onNodeClick,
  onEdgeClick,
  onNodeLongPress,
  layoutRegistry,
  padding = 16,
}: SkillTreeProps): JSX.Element {
  const state = useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getSnapshot.bind(engine),
  )

  const treeDef = engine.getTreeDef()
  const registry = useMemo(() => layoutRegistry ?? createDefaultLayoutRegistry(), [layoutRegistry])
  const layoutResult = useMemo(
    () => computeLayout(treeDef, registry, locale),
    [treeDef, registry, locale],
  )

  // Caso de erro: delegar en SVGRenderer co modo erro.
  if (!layoutResult.ok) {
    return <SVGRenderer padding={padding} error={layoutResult.error.code} />
  }

  const { nodes: nodePositions, edges: edgePaths, bounds, mesh } = layoutResult.value

  const edgeMap = useMemo(() => {
    const m = new Map<string, (typeof treeDef.edges)[number]>()
    for (const e of treeDef.edges) m.set(e.id, e)
    return m
  }, [treeDef])

  return (
    <SVGRenderer bounds={bounds} padding={padding} layoutType={layoutResult.value.layoutType}>
      <MeshOverlay {...(mesh !== undefined && { mesh })} />
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
              {...(onNodeLongPress !== undefined && { onLongPress: onNodeLongPress })}
            />
          )
        })}
      </g>
    </SVGRenderer>
  )
}
// ── FIN: SkillTree ──
