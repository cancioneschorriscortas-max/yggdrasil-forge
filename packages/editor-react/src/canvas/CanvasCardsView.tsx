// ── INICIO: CanvasCardsView (7.15c) ──
// A vista «tarxetas» do canvas: conecta a ClusterCardsView de @react
// (a vista tipo GAIA: cada grupo unha tarxeta, filas icona+label+badge)
// coa MESMA árbore do editor. "Same Data, Different Views."
//
// Fronteiras:
//   - A derivación (grupos, pertenza dual, «Sen grupo», cores) é
//     headless e vive en @editor-core (`deriveClusterGroups`).
//   - Aquí só: resolver iconas contra o registry de @react, mapear
//     `GroupDef.position` → CardPositions (%), cablear selección e
//     tiers vivos, e render.
//   - En Proba, `treeEngine` é o da SESIÓN → os badges (2/3, ✓)
//     actualizan en vivo ao desbloquear. En Autoría é o de render
//     (todo a 0) — «O progreso vese en Proba».

import type { TreeEngine } from '@yggdrasil-forge/core'
import {
  type DerivedClusterGroup,
  type EditorDocument,
  type EditorEngine,
  deriveClusterGroups,
} from '@yggdrasil-forge/editor-core'
import {
  type CardPositions,
  ClusterCardsView,
  type ClusterGroup,
  type ClusterMember,
  getIcon,
} from '@yggdrasil-forge/react'
import { type JSX, useCallback, useMemo, useSyncExternalStore } from 'react'
import { pickLoc } from '../proba/probaStrings.js'

export interface CanvasCardsViewProps {
  readonly editorEngine: EditorEngine
  /** Runtime a mostrar: o da sesión de Proba, ou o de render (Autoría). */
  readonly treeEngine: TreeEngine
  readonly doc: EditorDocument
  /** Primeiro nodo seleccionado (para o realce de fila). */
  readonly selectedNodeId?: string
}

/** currentTier por nodo, reactivo aos cambios do runtime. */
function useTiers(treeEngine: TreeEngine): ReadonlyMap<string, number> {
  const state = useSyncExternalStore(
    (cb) => treeEngine.subscribe(cb),
    () => treeEngine.getSnapshot(),
    () => treeEngine.getServerSnapshot(),
  )
  return useMemo(() => {
    const map = new Map<string, number>()
    for (const [id, instance] of Object.entries(state.nodes)) {
      map.set(id, instance.currentTier)
    }
    return map
  }, [state])
}

/** DerivedClusterGroup (icon cru) → ClusterGroup (IconDef resolto). */
function toClusterGroups(derived: readonly DerivedClusterGroup[]): readonly ClusterGroup[] {
  return derived.map((group) => ({
    id: group.id,
    label: group.label,
    color: group.color,
    members: group.members.map((member): ClusterMember => {
      const iconDef = member.icon !== undefined ? getIcon(member.icon) : undefined
      return {
        id: member.id,
        label: member.label,
        currentTier: member.currentTier,
        maxTier: member.maxTier,
        ...(iconDef !== undefined && { icon: iconDef }),
      }
    }),
  }))
}

export function CanvasCardsView({
  editorEngine,
  treeEngine,
  doc,
  selectedNodeId,
}: CanvasCardsViewProps): JSX.Element {
  const tiers = useTiers(treeEngine)

  const groups = useMemo(
    () => toClusterGroups(deriveClusterGroups(doc.tree, { locale: 'gl', tiers })),
    [doc, tiers],
  )

  // GroupDef.position → CardPositions en % (precisa coordinateBounds
  // para a escala; sen bounds, todos ao anel automático da vista).
  const positions = useMemo<CardPositions | undefined>(() => {
    const bounds = doc.meta.coordinateBounds
    if (bounds === undefined) return undefined
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    if (width <= 0 || height <= 0) return undefined
    const result: Record<string, { left: string; top: string }> = {}
    for (const def of doc.tree.groups ?? []) {
      if (def.position === undefined) continue
      result[def.id] = {
        left: `${(((def.position.x - bounds.minX) / width) * 100).toFixed(2)}%`,
        top: `${(((def.position.y - bounds.minY) / height) * 100).toFixed(2)}%`,
      }
    }
    return Object.keys(result).length > 0 ? result : undefined
  }, [doc])

  const handleRowClick = useCallback(
    (id: string) => {
      editorEngine.getSession().selection.replace([{ kind: 'node', id }])
    },
    [editorEngine],
  )

  return (
    <div className="editor-canvas-cards">
      <ClusterCardsView
        groups={groups}
        {...(positions !== undefined && { positions })}
        crownLabel={pickLoc(doc.tree.label)}
        {...(selectedNodeId !== undefined && { selectedNodeId })}
        onRowClick={handleRowClick}
      />
    </div>
  )
}
// ── FIN: CanvasCardsView ──
