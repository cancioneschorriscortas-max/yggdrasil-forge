'use client'
// ── INICIO: SkillTree ──
// Compoñente raíz SVG que toma un TreeEngine como prop e renderiza
// a árbore enteira. Subscríbese ao engine via useSyncExternalStore
// nativo de React 18+ (re-render automático). Computa layout
// internamente via computeLayout. Headless: cero estilos hardcoded.

import {
  type CurveStyle,
  type LayoutEngineRegistry,
  type TreeEngine,
  buildPaths,
  computeLayout,
} from '@yggdrasil-forge/core'
import { forwardRef, useImperativeHandle, useMemo, useRef, useSyncExternalStore } from 'react'
import { MeshOverlay } from './MeshOverlay.js'
import { SVGRenderer } from './SVGRenderer.js'
import { SkillEdge, edgeStateFor } from './SkillEdge.js'
import { SkillNode } from './SkillNode.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'
import { shortenEdgeAtTarget } from './edgeGeometry.js'
import { type ViewportState, useViewport } from './hooks/useViewport.js'
import { resolveRadius } from './nodeGeometry.js'

/**
 * Handle imperativo expoñido vía `ref` (F10.6) para que consumidores
 * (ex. botóns no toolbar do demo) poidan controlar o viewport.
 */
export interface SkillTreeHandle {
  /** Encadra `bounds` (con `padding`) no viewport actual. */
  fit(): void
  /** Volve ao transform identidade (panX=0, panY=0, zoom=1). */
  reset(): void
  zoomIn(): void
  zoomOut(): void
  getZoom(): number
}

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
  /**
   * Override de presentación de curva (F10.4b). Cando se pasa, aplica
   * `buildPaths(layoutResult, curve)` tree-wide **por riba** do que
   * `computeLayout` produza (que xa pode traer xeometría desde o
   * contrato de datos via `LayoutConfig.curve` + `EdgeStyle.routing`).
   *
   * **Canónico = contrato de datos**: para skill-trees serializables /
   * que viaxen entre Studio, exportadores e outros renderers, prefire
   * configurar `treeDef.layout.curve` (e `edge.style.routing` para
   * overrides por-edge). Este prop é só para axustes de
   * presentación puntuais en UI (MASTER A.6.20).
   */
  readonly curve?: CurveStyle
  /** Zoom mínimo do viewport interactivo (F10.6). Default `0.25`. */
  readonly minZoom?: number
  /** Zoom máximo do viewport interactivo (F10.6). Default `4`. */
  readonly maxZoom?: number
  /**
   * Encadrar bounds ao montar (F10.6). Default `true`. Cando `false`,
   * o viewport arranca con transform identidade (panX=0, panY=0,
   * zoom=1).
   */
  readonly fitOnMount?: boolean
  /**
   * Callback opcional disparado cando cambia o transform do viewport
   * (F10.6).
   */
  readonly onViewportChange?: (state: ViewportState) => void
}

export const SkillTree = forwardRef<SkillTreeHandle, SkillTreeProps>(function SkillTree(
  {
    engine,
    locale,
    onNodeClick,
    onEdgeClick,
    onNodeLongPress,
    layoutRegistry,
    padding = 16,
    curve,
    minZoom,
    maxZoom,
    fitOnMount,
    onViewportChange,
  },
  ref,
) {
  const state = useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getServerSnapshot.bind(engine),
  )

  const treeDef = engine.getTreeDef()
  const registry = useMemo(() => layoutRegistry ?? createDefaultLayoutRegistry(), [layoutRegistry])
  const layoutResult = useMemo(
    () => computeLayout(treeDef, registry, locale),
    [treeDef, registry, locale],
  )

  // F10.6: bounds + effectivePadding pre-calculados (pasamos undefined
  // ao useViewport cando layoutResult non é ok, e o hook xa guarda).
  // Tódolos hooks (useRef, useViewport, useImperativeHandle) chamáns
  // ANTES do return condicional para non violar a regra dos hooks.
  const okBounds = layoutResult.ok ? layoutResult.value.bounds : undefined
  const maxRadius = treeDef.nodes.reduce((m, n) => Math.max(m, resolveRadius(n)), 0)
  const effectivePadding = padding + maxRadius + 28

  const svgRef = useRef<SVGSVGElement>(null)
  const viewport = useViewport(svgRef, okBounds, effectivePadding, {
    ...(minZoom !== undefined && { minZoom }),
    ...(maxZoom !== undefined && { maxZoom }),
    ...(fitOnMount !== undefined && { fitOnMount }),
    ...(onViewportChange !== undefined && { onChange: onViewportChange }),
  })

  useImperativeHandle(
    ref,
    () => ({
      fit: viewport.fit,
      reset: viewport.reset,
      zoomIn: viewport.zoomIn,
      zoomOut: viewport.zoomOut,
      getZoom: viewport.getZoom,
    }),
    [viewport.fit, viewport.reset, viewport.zoomIn, viewport.zoomOut, viewport.getZoom],
  )

  // Caso de erro: delegar en SVGRenderer co modo erro.
  if (!layoutResult.ok) {
    return <SVGRenderer padding={padding} error={layoutResult.error.code} />
  }

  // F10.4: aplicar curve (opcional). buildPaths é puro — recibe o
  // LayoutResult sen mutar; cando `curve` non se pasa, salta a
  // transformación (paths retos do layout, comportamento legacy).
  const finalLayout =
    curve !== undefined ? buildPaths(layoutResult.value, curve) : layoutResult.value

  const { nodes: nodePositions, edges: edgePaths, bounds, mesh } = finalLayout

  const edgeMap = useMemo(() => {
    const m = new Map<string, (typeof treeDef.edges)[number]>()
    for (const e of treeDef.edges) m.set(e.id, e)
    return m
  }, [treeDef])

  // F10.4.fix-arrow: lookup de raio por id de nodo, para acortar paths
  // de edges `directed` e que a frecha quede visible fóra do nodo target.
  const nodeRadius = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of treeDef.nodes) m.set(n.id, resolveRadius(n))
    return m
  }, [treeDef])

  return (
    <SVGRenderer
      ref={svgRef}
      bounds={bounds}
      padding={effectivePadding}
      layoutType={layoutResult.value.layoutType}
      transform={viewport.transform}
      onPointerDown={viewport.onPointerDown}
      onPointerMove={viewport.onPointerMove}
      onPointerUp={viewport.onPointerUp}
    >
      <MeshOverlay {...(mesh !== undefined && { mesh })} />
      <g className="yf-skill-edges">
        {[...edgePaths.entries()].map(([edgeId, path]) => {
          const edge = edgeMap.get(edgeId)
          /* v8 ignore next 1 -- defensivo: edgePaths vén de computeLayout sobre treeDef.edges */
          if (edge === undefined) return null
          // F10.4: estado do edge = derivado do estado do source.
          const sourceState = state.nodes[edge.source]?.state
          const edgeState = edgeStateFor(sourceState)
          // F10.4.fix-arrow: se o edge é directed, acortamos o path no
          // extremo target o suficiente para que a frecha quede visible
          // fóra do nodo. Gap = radio do target + pequena marxe.
          const directed = edge.style?.directed === true
          const targetRadius = nodeRadius.get(edge.target) ?? 0
          const finalPath =
            directed && targetRadius > 0 ? shortenEdgeAtTarget(path, targetRadius + 2) : path
          return (
            <SkillEdge
              key={edgeId}
              edgeId={edgeId}
              edge={edge}
              path={finalPath}
              edgeState={edgeState}
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
})
// ── FIN: SkillTree ──
