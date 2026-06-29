// ── INICIO: useEditorMode ──
// Hook trivial para o modo do editor. Vive no shell e propágase via
// data-attribute para que o CSS aplique o accent correcto.

import { useState } from 'react'

export type EditorMode = 'authoring' | 'preview'

export interface UseEditorModeResult {
  readonly mode: EditorMode
  readonly setMode: (mode: EditorMode) => void
  readonly toggleMode: () => void
}

export function useEditorMode(initial: EditorMode = 'authoring'): UseEditorModeResult {
  const [mode, setMode] = useState<EditorMode>(initial)
  return {
    mode,
    setMode,
    toggleMode: () => setMode((m) => (m === 'authoring' ? 'preview' : 'authoring')),
  }
}
// ── FIN: useEditorMode ──
