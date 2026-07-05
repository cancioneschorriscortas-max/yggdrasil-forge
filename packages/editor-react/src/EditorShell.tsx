// ── INICIO: EditorShell ──
// Composición top-level do editor:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ TopBar (brand · layouts · undo/redo · zoom · mode toggle)   │
//   ├──────────────┬──────────────────────────┬──────────────────┤
//   │ Outliner     │ Canvas (SkillTree real)  │ Inspector | Tema │
//   │ (left)       │ (center, 7.5b-i)         │  ou Proba (7.6)  │
//   │              ├──────────────────────────┤                  │
//   │              │ Problems (bottom)        │                  │
//   └──────────────┴──────────────────────────┴──────────────────┘
//   │ StatusBar (nodes · edges · mode · world)                    │
//   └──────────────────────────────────────────────────────────────┘
//
// **7.6**: en modo Proba, o panel dereito muda de Inspector|Tema a
// Proba. Nunca conviven os dous mundos. O EditorCanvas recibe a
// sesión de Proba activa para renderizar co runtime real.

import type { EditorEngine } from '@yggdrasil-forge/editor-core'
import { type JSX, useMemo } from 'react'
import { EditorCanvas } from './canvas/EditorCanvas.js'
import { InspectorPanel } from './inspector/InspectorPanel.js'
import { OutlinerPanel } from './panels/OutlinerPanel.js'
import { type PanelDef, PanelHost } from './panels/PanelHost.js'
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
}

export function EditorShell({ engine, initialMode = 'authoring' }: EditorShellProps): JSX.Element {
  const { mode, toggleMode } = useEditorMode(initialMode)
  const probaSession = useProbaSession(engine, mode)

  // PanelDefs estables por modo. En Proba, o grupo dereito é «Proba»
  // (Inspector/Tema fóra). En Autoría, Inspector|Tema (Proba fóra).
  //
  // ★ `key={mode}` no PanelHost forza desmontaxe/montaxe de dockview
  //   ao cambiar de modo — evita layout persistente co panel antigo.
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
        title: 'Problems',
        component: () => <ProblemsPanel engine={engine} />,
        defaultLocation: 'bottom',
      },
    ],
    [engine, mode, probaSession],
  )

  return (
    <div className="editor-shell" data-mode={mode}>
      <TopBar engine={engine} mode={mode} onToggleMode={toggleMode} />
      <div className="editor-workspace">
        <PanelHost key={mode} panels={panels} />
      </div>
      <StatusBar engine={engine} mode={mode} />
    </div>
  )
}
// ── FIN: EditorShell ──
