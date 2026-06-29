// ── INICIO: EditorShell ──
// Composición top-level do editor:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ TopBar (brand · layouts · undo/redo · zoom · mode toggle)   │
//   ├──────────────┬──────────────────────────┬──────────────────┤
//   │ Outliner     │ Canvas (placeholder)     │ Inspector        │
//   │ (left)       │ (center)                 │ (right)          │
//   │              ├──────────────────────────┤                  │
//   │              │ Problems (bottom)        │                  │
//   └──────────────┴──────────────────────────┴──────────────────┘
//   │ StatusBar (nodes · edges · mode · world)                    │
//   └──────────────────────────────────────────────────────────────┘
//
// O dock central xestiónao PanelHost vía dockview; o EditorShell só
// compón as tres bandas (top/workspace/bottom) e propaga o modo via
// data-attribute.

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useMemo } from 'react'
import { OutlinerPanel } from './panels/OutlinerPanel.js'
import { type PanelDef, PanelHost } from './panels/PanelHost.js'
import { CanvasPanel, InspectorPanel, ProblemsPanel } from './panels/PlaceholderPanels.js'
import { StatusBar } from './shell/StatusBar.js'
import { TopBar } from './shell/TopBar.js'
import { type EditorMode, useEditorMode } from './shell/useEditorMode.js'

export interface EditorShellProps {
  readonly engine: EditorEngine
  readonly initialMode?: EditorMode
}

export function EditorShell({ engine, initialMode = 'authoring' }: EditorShellProps): JSX.Element {
  const { mode, toggleMode } = useEditorMode(initialMode)

  // PanelDefs estables (memo) para non re-rexistrar paneis en cada render.
  const panels = useMemo<readonly PanelDef[]>(
    () => [
      {
        id: 'outliner',
        title: 'Outliner',
        component: () => <OutlinerPanel engine={engine} />,
        defaultLocation: 'left',
      },
      {
        id: 'canvas',
        title: 'Canvas',
        component: CanvasPanel,
        defaultLocation: 'center',
      },
      {
        id: 'inspector',
        title: 'Inspector',
        component: InspectorPanel,
        defaultLocation: 'right',
      },
      {
        id: 'problems',
        title: 'Problems',
        component: ProblemsPanel,
        defaultLocation: 'bottom',
      },
    ],
    [engine],
  )

  return (
    <div className="editor-shell" data-mode={mode}>
      <TopBar engine={engine} mode={mode} onToggleMode={toggleMode} />
      <div className="editor-workspace">
        <PanelHost panels={panels} />
      </div>
      <StatusBar engine={engine} mode={mode} />
    </div>
  )
}
// ── FIN: EditorShell ──
