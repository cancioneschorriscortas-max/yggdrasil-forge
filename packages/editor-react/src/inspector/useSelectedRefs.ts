// ── INICIO: useSelectedRefs ──
// Extraído de InspectorPanel (era privado alí) para que ThemePanel
// tamén poida subscribirse á selección (briefing 7.13, botóns
// "Asignar/Quitar da selección"). Mesma fonte de verdade para os dous.

import type { EditorEngine, SelectionRef } from '@yggdrasil-forge/editor-core'
import { useCallback, useRef, useSyncExternalStore } from 'react'

/** Cache estable para current() (patrón documentado). */
export function useSelectedRefs(editorEngine: EditorEngine): readonly SelectionRef[] {
  const selection = editorEngine.getSession().selection
  const cacheRef = useRef<readonly SelectionRef[]>([])
  const subscribe = useCallback(
    (cb: () => void) => {
      const unsubscribe = selection.subscribe(() => {
        cacheRef.current = selection.current()
        cb()
      })
      cacheRef.current = selection.current()
      return unsubscribe
    },
    [selection],
  )
  const getSnapshot = useCallback(() => cacheRef.current, [])
  const getServerSnapshot = useCallback(() => cacheRef.current, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
// ── FIN: useSelectedRefs ──
