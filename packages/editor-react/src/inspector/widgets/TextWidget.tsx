// ── INICIO: TextWidget ──
// Widget para campos `kind:'text'`. **Commit on blur**: o estado local
// mantén o valor mentres o usuario edita; o `onCommit` (dispatch do
// Command) só se chama ao perder foco ou pulsar Enter. Iso garante
// **1 edición = 1 entrada de history** (sin spam de undo por tecla).

import { type JSX, useEffect, useState } from 'react'

export interface TextWidgetProps {
  readonly id: string
  readonly value: string | undefined
  readonly disabled?: boolean
  readonly onCommit: (next: string) => void
}

export function TextWidget({ id, value, disabled, onCommit }: TextWidgetProps): JSX.Element {
  const initial = value ?? ''
  const [local, setLocal] = useState(initial)
  // Re-sincroniza co `value` externo (ex.: undo/redo cambia o doc).
  useEffect(() => {
    setLocal(initial)
  }, [initial])

  const commit = (): void => {
    if (local !== initial) onCommit(local)
  }

  return (
    <input
      id={id}
      type="text"
      className="editor-inspector-input"
      value={local}
      disabled={disabled ?? false}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur() // dispara commit
        } else if (e.key === 'Escape') {
          setLocal(initial)
          e.currentTarget.blur()
        }
      }}
    />
  )
}
// ── FIN: TextWidget ──
