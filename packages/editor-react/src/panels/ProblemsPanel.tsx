// ── INICIO: ProblemsPanel real (7.5c-ii) ──
// A voz da conciencia: mostra `editorEngine.getIssues()` (warnings dos
// soft validators de 7.4) e permite **clic → selección do nodo**.
//
// **★ Loop conciencia↔voz**: editas algo dubidoso (ex.: engadir unha
// exclusión asimétrica A→B sin B→A) → o asymmetricExclusionValidator
// emite warning → aparece aquí → clic → o canvas e o Inspector
// enfocan o nodo afectado.
//
// **Cache estable**: o getIssues() devolve unha referencia que cambia
// no commit; non require cache porque cambiamos só por commit do engine,
// e o engine.subscribe garante a actualización.

import type { EditorEngine, ValidationIssue } from '@yggdrasil-forge/editor-core'
import { type JSX, useSyncExternalStore } from 'react'

export interface ProblemsPanelProps {
  readonly engine: EditorEngine
}

/** Resolve o texto da mensaxe (LocalizedString → galego con fallback inglés). */
function messageText(msg: ValidationIssue['message']): string {
  if (typeof msg === 'string') return msg
  return msg.gl ?? msg.en ?? '(sin mensaxe)'
}

const SEVERITY_LABEL: Record<ValidationIssue['severity'], string> = {
  error: 'Erro',
  warning: 'Aviso',
  info: 'Info',
}

export function ProblemsPanel({ engine }: ProblemsPanelProps): JSX.Element {
  const issues = useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getIssues(),
  )

  if (issues.length === 0) {
    return (
      <div className="editor-problems editor-problems--empty">
        <p className="editor-inspector__hint">Sen problemas detectados.</p>
      </div>
    )
  }

  const handleClickIssue = (issue: ValidationIssue): void => {
    // Clic selecciona o nodo afectado (se hai).
    if (issue.nodeId !== undefined) {
      engine.getSession().selection.replace([{ kind: 'node', id: issue.nodeId }])
    }
    // (Para edgeId: en 7.5d quizais sumar selección de edge.)
  }

  return (
    <div className="editor-problems">
      <ul className="editor-problems__list">
        {issues.map((issue, idx) => (
          <li
            key={`${issue.code}-${idx}`}
            className={`editor-problems__row editor-problems__row--${issue.severity}`}
          >
            <button
              type="button"
              className="editor-problems__btn"
              onClick={() => handleClickIssue(issue)}
              disabled={issue.nodeId === undefined && issue.edgeId === undefined}
              aria-label={`${SEVERITY_LABEL[issue.severity]} en ${issue.nodeId ?? issue.edgeId ?? '(sen referencia)'}`}
            >
              <span className={`editor-problems__sev editor-problems__sev--${issue.severity}`}>
                {SEVERITY_LABEL[issue.severity]}
              </span>
              <span className="editor-problems__msg">{messageText(issue.message)}</span>
              {issue.nodeId !== undefined && (
                <span className="editor-problems__ref">node: {issue.nodeId}</span>
              )}
              {issue.edgeId !== undefined && (
                <span className="editor-problems__ref">edge: {issue.edgeId}</span>
              )}
              <span className="editor-problems__code">{issue.code}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
// ── FIN: ProblemsPanel real ──
