// ── INICIO: paneis placeholder (Canvas / Inspector / Problems) ──
// Tres paneis "shell" para 7.5a. O contido real vén en 7.5b (Canvas)
// + 7.5c (Inspector) + posterior (Problemas).

import type { JSX } from 'react'

export function CanvasPanel(): JSX.Element {
  return (
    <div className="editor-panel">
      <div className="editor-panel__body" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="editor-panel__placeholder">
          canvas placeholder
          <br />
          (SkillTree + Overlay van aquí en 7.5b)
        </div>
      </div>
    </div>
  )
}

export function InspectorPanel(): JSX.Element {
  return (
    <div className="editor-panel">
      <div className="editor-panel__body">
        <div className="editor-panel__placeholder">
          inspector placeholder
          <br />
          (Property Registry en 7.5c)
        </div>
      </div>
    </div>
  )
}

export function ProblemsPanel(): JSX.Element {
  return (
    <div className="editor-panel">
      <div className="editor-panel__body">
        <div className="editor-panel__placeholder">
          problems placeholder
          <br />
          (renderará ValidationIssue de engine.getIssues())
        </div>
      </div>
    </div>
  )
}
// ── FIN: paneis placeholder ──
