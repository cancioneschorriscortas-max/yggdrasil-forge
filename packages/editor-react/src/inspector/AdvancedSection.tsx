// ── INICIO: AdvancedSection ──
// Sección colapsable "Avanzado" (Briefing 7.5c-U §3). Pregada por
// defecto para non abafar ao usuario medio. Contén os descriptors
// marcados con `advanced: true` no registry.

import { type JSX, type ReactNode, useState } from 'react'

export interface AdvancedSectionProps {
  readonly children: ReactNode
  /** Cantos campos hai dentro (para amosar contador na cabeceira). */
  readonly fieldCount: number
}

export function AdvancedSection({ children, fieldCount }: AdvancedSectionProps): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <section className="editor-inspector__advanced">
      <button
        type="button"
        className="editor-inspector__advanced-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="editor-inspector__advanced-caret" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="editor-inspector__advanced-title">Avanzado</span>
        <span className="editor-inspector__advanced-count">{fieldCount}</span>
      </button>
      {open && <div className="editor-inspector__advanced-body">{children}</div>}
    </section>
  )
}
// ── FIN: AdvancedSection ──
