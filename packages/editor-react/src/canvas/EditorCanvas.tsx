// ── INICIO: EditorCanvas ──
// 7.5b-i: o canvas APARECE. Renderiza o documento que teña o engine,
// con pan/zoom built-in (SkillTree) e selección por clic.
//
// **O SkillTree fai o traballo pesado**: render SVG completo, viewport
// pan/zoom (rato + roda), hit-test de clic, anel de selección
// controlado. O editor SÓ orquestra:
//
//   doc (EditorEngine) → TreeEngine derivado → SkillTree pinta
//   onNodeClick(id) → SelectionEngine.replace([{ kind:'node', id }])
//   selection cambia → re-render con selectedNodeId actualizado
//
// **TreeEngine derivado = artefacto de RENDER**, non history nin
// simulación. Recréase do doc en cada commit (Immer dá ref nova só en
// commits, polo que useMemo([doc]) é eficiente).
//
// **Modo Autoría**: onNodeClick = SELECCIONAR, non desbloquear. O
// desbloqueo (xogar a árbore) é Preview-mode, posterior. Mesmo
// SkillTree, distinta interpretación do clic.

import { TreeEngine } from '@yggdrasil-forge/core'
import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { SkillTree, type ViewportState } from '@yggdrasil-forge/react'
import { type JSX, useCallback, useMemo, useState, useSyncExternalStore } from 'react'

export interface EditorCanvasProps {
  readonly editorEngine: EditorEngine
}

/**
 * Hook auxiliar: subscribe ao SelectionEngine e devolve o id único da
 * selección (primeiro nodo seleccionado, ou null se non hai). En -i só
 * importa o caso v1 (selección única); -ii tratará a multi-selección.
 */
function useSelectedNodeId(editorEngine: EditorEngine): string | null {
  const selection = editorEngine.getSession().selection
  return useSyncExternalStore(
    (cb) => selection.subscribe(cb),
    () => {
      const refs = selection.current()
      for (const ref of refs) {
        if (ref.kind === 'node') return ref.id
      }
      return null
    },
    () => null,
  )
}

export function EditorCanvas({ editorEngine }: EditorCanvasProps): JSX.Element {
  // Re-render en commits do EditorEngine. EditorEngineListener é
  // (doc) => void; useSyncExternalStore pasa () => void, JS ignora
  // o argumento extra — patrón usado xa en TopBar/StatusBar/Outliner.
  const doc = useSyncExternalStore(
    (cb) => editorEngine.subscribe(cb),
    () => editorEngine.getDocument(),
  )

  // TreeEngine derivado. useMemo([doc]) é correcto: Immer só cambia a
  // referencia de doc en commits, polo que recréase só cando o
  // documento muta. Para árbores pequenas/medias, o custo é
  // aceptable; en v1.2 podería derivarse incrementalmente.
  const treeEngine = useMemo(() => new TreeEngine(doc.tree), [doc])

  const selectedNodeId = useSelectedNodeId(editorEngine)

  // Viewport observado para a status bar (% de zoom). En 7.5b-ii será
  // a base do screen↔doc para o drag.
  const [, setViewport] = useState<ViewportState | null>(null)
  const handleViewportChange = useCallback((vs: ViewportState) => {
    setViewport(vs)
  }, [])

  const handleNodeClick = useCallback(
    (id: string) => {
      // Modo Autoría: clic = seleccionar (replace, single-select v1).
      editorEngine.getSession().selection.replace([{ kind: 'node', id }])
    },
    [editorEngine],
  )

  const { coordinateBounds } = doc.meta

  return (
    <div className="editor-canvas">
      <SkillTree
        engine={treeEngine}
        onNodeClick={handleNodeClick}
        onViewportChange={handleViewportChange}
        {...(selectedNodeId !== null && { selectedNodeId })}
        {...(coordinateBounds !== undefined && { coordinateBounds })}
      />
    </div>
  )
}
// ── FIN: EditorCanvas ──
