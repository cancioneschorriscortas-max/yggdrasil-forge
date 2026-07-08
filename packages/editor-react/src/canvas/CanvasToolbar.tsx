// ── INICIO: CanvasToolbar ──
// Overlay vertical dentro do panel Canvas (esquina superior esquerda),
// briefing 7.11 Cambio 2. `position: absolute` sobre o contedor do
// canvas — **lembrar a lección do FileMenu (7.10 fix)**: o propio
// contedor leva aquí a súa regra de posicionamento (ver shell.css),
// e o pai (`.editor-canvas` en EditorCanvas.tsx) xa é
// `position: relative`.
//
// Tres tools en radio (Seleccionar/Engadir nodo/Conectar) + o chip
// "Crear requisito" cando Conectar está activa. Só en Autoría — o
// caller (`EditorCanvas`) decide non renderizar en Proba.

import type { JSX } from 'react'

export type CanvasTool = 'select' | 'add' | 'connect'

export interface CanvasToolbarProps {
  readonly tool: CanvasTool
  readonly onToolChange: (tool: CanvasTool) => void
  readonly createPrerequisite: boolean
  readonly onCreatePrerequisiteChange: (value: boolean) => void
}

interface ToolButtonDef {
  readonly tool: CanvasTool
  readonly icon: string
  readonly label: string
  readonly shortcut: string
}

const TOOLS: readonly ToolButtonDef[] = [
  { tool: 'select', icon: '↖', label: 'Seleccionar', shortcut: 'V' },
  { tool: 'add', icon: '⊕', label: 'Engadir nodo', shortcut: 'N' },
  { tool: 'connect', icon: '→', label: 'Conectar', shortcut: 'C' },
]

export function CanvasToolbar({
  tool,
  onToolChange,
  createPrerequisite,
  onCreatePrerequisiteChange,
}: CanvasToolbarProps): JSX.Element {
  return (
    <div className="editor-canvas-toolbar" role="toolbar" aria-label="Ferramentas do canvas">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          type="button"
          aria-pressed={tool === t.tool}
          className={`editor-canvas-toolbar__btn${tool === t.tool ? ' editor-canvas-toolbar__btn--active' : ''}`}
          title={`${t.label} (${t.shortcut})`}
          onClick={() => onToolChange(t.tool)}
        >
          <span aria-hidden="true">{t.icon}</span>
        </button>
      ))}
      {tool === 'connect' && (
        <label
          className="editor-canvas-toolbar__chip"
          title="Ao conectar, o destino pasa a requirir a orixe. Desmárcao para unha conexión só visual."
        >
          <input
            type="checkbox"
            checked={createPrerequisite}
            onChange={(e) => onCreatePrerequisiteChange(e.target.checked)}
          />
          <span>Crear requisito</span>
        </label>
      )}
    </div>
  )
}
// ── FIN: CanvasToolbar ──
