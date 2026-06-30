// ── INICIO: EnumWidget ──
// Widget para `kind:'enum'`. **Commit inmediato**: cambios discretos
// (select). Sin debounce/blur — cada cambio é unha intención clara.

import type { JSX } from 'react'

export interface EnumWidgetProps {
  readonly id: string
  readonly value: string | undefined
  readonly options: readonly string[]
  readonly disabled?: boolean
  readonly onCommit: (next: string) => void
}

export function EnumWidget({
  id,
  value,
  options,
  disabled,
  onCommit,
}: EnumWidgetProps): JSX.Element {
  return (
    <select
      id={id}
      className="editor-inspector-input"
      value={value ?? ''}
      disabled={disabled ?? false}
      onChange={(e) => onCommit(e.target.value)}
    >
      {value === undefined && <option value="">— sen definir —</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
// ── FIN: EnumWidget ──
