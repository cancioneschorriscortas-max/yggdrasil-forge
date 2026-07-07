// ── INICIO: EditorShell ──
// Composición top-level do editor:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ TopBar (brand · Paneis · undo/redo · zoom · mode toggle)    │
//   ├──────────────┬──────────────────────────┬──────────────────┤
//   │ Outliner     │ Canvas (SkillTree real)  │ Inspector | Tema │
//   │ (left)       │ (center, 7.5b-i)         │  ou Proba (7.6)  │
//   │              ├──────────────────────────┤                  │
//   │              │ Problems (bottom)        │                  │
//   └──────────────┴──────────────────────────┴──────────────────┘
//   │ StatusBar (nodes · edges · mode · world)                    │
//   └──────────────────────────────────────────────────────────────┘
//
// **7.7 — as 4 dores estables**:
//   1. Menú Paneis no TopBar para reabrir pechados + Restaurar.
//   2. Cambio de modo NON destrúe disposición (reconciliación
//      engadir-antes-de-quitar en PanelHost).
//   3. Persistencia por props: a app decide como gardar/restaurar
//      (localStorage no examples/editor).
//   4. Tamaños/xeometría conservados xa que se elimina `key={mode}`.

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import type { SerializedDockview } from 'dockview-react'
import { type JSX, useCallback, useMemo, useRef, useState } from 'react'
import { EditorCanvas } from './canvas/EditorCanvas.js'
import { InspectorPanel } from './inspector/InspectorPanel.js'
import { OutlinerPanel } from './panels/OutlinerPanel.js'
import { type PanelDef, PanelHost, type PanelHostHandle } from './panels/PanelHost.js'
import { ProblemsPanel } from './panels/ProblemsPanel.js'
import { ThemePanel } from './panels/ThemePanel.js'
import { ProbaPanel } from './proba/ProbaPanel.js'
import { useProbaSession } from './proba/useProbaSession.js'
import { StatusBar } from './shell/StatusBar.js'
import { TopBar } from './shell/TopBar.js'
import { type EditorMode, useEditorMode } from './shell/useEditorMode.js'

export interface EditorShellProps {
  readonly engine: EditorEngine
  readonly initialMode?: EditorMode
  /**
   * Disposición gardada a restaurar no arranque (7.7 §3). Se falla,
   * invócase `onLayoutInvalid` e cae ao default.
   */
  readonly initialLayout?: SerializedDockview
  /**
   * Chamado (debounced ~300ms) tras cada cambio de layout. A app
   * decide se e como gardar.
   */
  readonly onLayoutChange?: (layout: SerializedDockview) => void
  /**
   * Chamado se o `initialLayout` non se puido restaurar. A app debe
   * limpar o gardado.
   */
  readonly onLayoutInvalid?: () => void
  /**
   * Tema do chrome (7.8): `'light' | 'dark'`. Controlado desde a
   * app — EditorShell NON toca `document`/`localStorage`, só reenvía
   * ao TopBar. Se non se pasa, o switch non se renderiza.
   */
  readonly theme?: 'light' | 'dark'
  /** Chamado co novo tema cando o usuario clica o switch do TopBar. */
  readonly onThemeChange?: (theme: 'light' | 'dark') => void
}

export function EditorShell({
  engine,
  initialMode = 'authoring',
  initialLayout,
  onLayoutChange,
  onLayoutInvalid,
  theme,
  onThemeChange,
}: EditorShellProps): JSX.Element {
  const { mode, toggleMode } = useEditorMode(initialMode)
  const probaSession = useProbaSession(engine, mode)
  const handleRef = useRef<PanelHostHandle | null>(null)
  const [visiblePanelIds, setVisiblePanelIds] = useState<readonly string[]>([])

  // **7.7 §3**: só se persiste a disposición de Autoría. En Proba non
  // autogardamos, e o arranque é sempre en Autoría (initialMode). O
  // handler que damos ao PanelHost fai o filtrado.
  const handleLayoutChange = useCallback(
    (layout: SerializedDockview) => {
      if (mode !== 'authoring') return
      onLayoutChange?.(layout)
    },
    [mode, onLayoutChange],
  )

  const panels = useMemo<readonly PanelDef[]>(
    () => [
      {
        id: 'outliner',
        title: 'Estrutura',
        component: () => <OutlinerPanel engine={engine} />,
        defaultLocation: 'left',
      },
      {
        id: 'canvas',
        title: 'Canvas',
        component: () => <EditorCanvas editorEngine={engine} probaSession={probaSession} />,
        defaultLocation: 'center',
      },
      ...(mode === 'preview' && probaSession !== null
        ? [
            {
              id: 'proba',
              title: 'Proba',
              component: () => <ProbaPanel editorEngine={engine} session={probaSession} />,
              defaultLocation: 'right' as const,
            },
          ]
        : [
            {
              id: 'inspector',
              title: 'Inspector',
              component: () => <InspectorPanel editorEngine={engine} />,
              defaultLocation: 'right' as const,
            },
            {
              id: 'theme',
              title: 'Tema',
              component: () => <ThemePanel editorEngine={engine} />,
              defaultLocation: 'right' as const,
              withinPanel: 'inspector',
            },
          ]),
      {
        id: 'problems',
        title: 'Problemas',
        component: () => <ProblemsPanel engine={engine} />,
        defaultLocation: 'bottom',
      },
    ],
    [engine, mode, probaSession],
  )

  const handleTogglePanel = useCallback((id: string) => {
    const h = handleRef.current
    if (h === null) return
    if (h.getVisiblePanelIds().includes(id)) h.hidePanel(id)
    else h.showPanel(id)
  }, [])

  const handleResetLayout = useCallback(() => {
    handleRef.current?.reset()
    onLayoutInvalid?.() // Sinal para que a app limpe o gardado.
  }, [onLayoutInvalid])

  return (
    <div className="editor-shell" data-mode={mode}>
      <TopBar
        engine={engine}
        mode={mode}
        onToggleMode={toggleMode}
        panels={panels}
        visiblePanelIds={visiblePanelIds}
        onTogglePanel={handleTogglePanel}
        onResetLayout={handleResetLayout}
        {...(theme !== undefined && { theme })}
        {...(onThemeChange !== undefined && { onThemeChange })}
      />
      <div className="editor-workspace">
        <PanelHost
          panels={panels}
          handleRef={handleRef}
          onVisiblePanelsChange={setVisiblePanelIds}
          {...(initialLayout !== undefined && { initialLayout })}
          {...(onLayoutChange !== undefined && { onLayoutChange: handleLayoutChange })}
          {...(onLayoutInvalid !== undefined && { onLayoutInvalid })}
        />
      </div>
      <StatusBar engine={engine} mode={mode} />
    </div>
  )
}
// ── FIN: EditorShell ──
