// ── INICIO: useProbaSession ──
// Hook que goberna a sesión de xogo/estudo do modo Proba (7.6).
//
// **Principios**:
//   - `mode === 'preview'` → crea un `TreeEngine` fresco co doc do
//     momento; instancia estable entre renders.
//   - `mode === 'authoring'` → descarta (devolve `null`).
//   - Alternar Autoría→Proba→Autoría→Proba dá sempre unha sesión
//     **fresca** (todo bloqueado, recursos ao `initial`).
//   - `reset()` substitúe o TreeEngine por un fresco sen tocar o
//     documento. É o "undo" do modo Proba.
//
// **★ Documento nunca se toca**: o TreeEngine consome `treeDef` e
// mantén o seu propio estado interno. As mutacións (unlock,
// grantResource) non chegan ao EditorDocument nin ao ficheiro
// gardado. Probar non pode estragar nada.

import { TreeEngine } from '@yggdrasil-forge/core'
import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { useMemo, useState } from 'react'
import type { EditorMode } from '../shell/useEditorMode.js'

export interface ProbaSession {
  /** Runtime real de @core que executa a sesión. */
  readonly treeEngine: TreeEngine
  /** Descarta a sesión e crea outra fresca (mesmo doc). */
  readonly reset: () => void
}

/**
 * Devolve a sesión activa de Proba, ou `null` se estamos en
 * Autoría. Cambiar de modo ou chamar `reset()` recrea o TreeEngine.
 */
export function useProbaSession(editorEngine: EditorEngine, mode: EditorMode): ProbaSession | null {
  // `gen` incremented por reset() → invalida o useMemo forzando
  // creación dun TreeEngine novo. Cambiar de modo tamén invalida
  // (dependencia directa) e permite descartar o vello.
  const [gen, setGen] = useState(0)
  return useMemo<ProbaSession | null>(() => {
    // `gen` está listado nas deps para forzar recreación cando reset()
    // incrementa o contador. Non se le no corpo (é o efecto de disparo).
    void gen
    if (mode !== 'preview') return null
    // Snapshot do doc no momento de entrar (a edición está apagada
    // en Proba, non hai carreira doc↔sesión). `getDocument()` é o
    // último committed snapshot.
    const treeEngine = new TreeEngine(editorEngine.getDocument().tree)
    return {
      treeEngine,
      reset: () => setGen((g) => g + 1),
    }
  }, [editorEngine, mode, gen])
}
// ── FIN: useProbaSession ──
