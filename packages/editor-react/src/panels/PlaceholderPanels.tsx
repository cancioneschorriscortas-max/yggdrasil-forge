// ── INICIO: paneis placeholder (Problems) ──
// 7.5c-i: InspectorPanel xa non é placeholder — substituíuse polo
// Inspector real (inspector/InspectorPanel.tsx) con Property Registry
// e widgets que despachan Commands.
//
// Problems segue placeholder até que se renderice o panel real con
// engine.getIssues().

import type { JSX } from 'react'

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
