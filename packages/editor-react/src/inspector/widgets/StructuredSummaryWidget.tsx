// ── INICIO: StructuredSummaryWidget ──
// Resumo de lectura para campos `kind:'structured'` que aínda non teñen
// sub-editor propio (case defensivo para `tiers` UNIMPLEMENTED). Mostra
// unha contaxe simple ("3 effects") para que o Inspector se vexa
// completo e o usuario saiba que existe o campo.
//
// **7.5f**: retirouse a nota vella "· edición en 7.5c-ii" — a maioría
// dos casos xa teñen sub-editor; este widget agora é fallback puro.

import type { JSX } from 'react'

export interface StructuredSummaryWidgetProps {
  /** Categoría: 'effects' | 'prerequisites' | 'exclusions' | 'cost' | etc. */
  readonly of: string
  /** Valor actual (array, obxecto, etc. — só se usa para conta/non-vacuidade). */
  readonly value: unknown
}

/** Conta elementos cunha heurística simple. */
function summarize(of: string, value: unknown): string {
  if (value === undefined || value === null) return `Sen ${of}`
  if (Array.isArray(value)) {
    return `${value.length} ${of}${value.length === 1 ? '' : 's'}`
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    return `${keys.length} entrada${keys.length === 1 ? '' : 's'}`
  }
  return `1 ${of}`
}

export function StructuredSummaryWidget({ of, value }: StructuredSummaryWidgetProps): JSX.Element {
  return (
    <div className="editor-inspector-structured-summary">
      <span className="editor-inspector-structured-count">{summarize(of, value)}</span>
      <span className="editor-inspector-structured-hint">· só lectura</span>
    </div>
  )
}
// ── FIN: StructuredSummaryWidget ──
