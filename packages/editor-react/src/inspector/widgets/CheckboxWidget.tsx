// ── INICIO: CheckboxWidget ──
// Widget para `kind:'boolean'`. **Commit inmediato** (toggle discreto).

import type { JSX } from 'react'

export interface CheckboxWidgetProps {
  readonly id: string
  readonly value: boolean | undefined
  readonly disabled?: boolean
  readonly onCommit: (next: boolean) => void
}

export function CheckboxWidget({
  id,
  value,
  disabled,
  onCommit,
}: CheckboxWidgetProps): JSX.Element {
  return (
    <input
      id={id}
      type="checkbox"
      className="editor-inspector-checkbox"
      checked={value ?? false}
      disabled={disabled ?? false}
      onChange={(e) => onCommit(e.target.checked)}
    />
  )
}
// ── FIN: CheckboxWidget ──
