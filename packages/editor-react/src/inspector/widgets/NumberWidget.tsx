// ── INICIO: NumberWidget ──
// Widget para `kind:'number'`. Commit on blur (igual que TextWidget).
// Se o input non é un número válido → reverte ao inicial sin commit.

import { type JSX, useEffect, useState } from 'react'

export interface NumberWidgetProps {
  readonly id: string
  readonly value: number | undefined
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly disabled?: boolean
  readonly onCommit: (next: number) => void
}

export function NumberWidget({
  id,
  value,
  min,
  max,
  step,
  disabled,
  onCommit,
}: NumberWidgetProps): JSX.Element {
  const initial = value === undefined ? '' : String(value)
  const [local, setLocal] = useState(initial)
  useEffect(() => {
    setLocal(initial)
  }, [initial])

  const commit = (): void => {
    if (local === initial) return
    const parsed = Number(local)
    if (!Number.isFinite(parsed)) {
      // Valor inválido: reverte.
      setLocal(initial)
      return
    }
    onCommit(parsed)
  }

  return (
    <input
      id={id}
      type="number"
      className="editor-inspector-input"
      value={local}
      disabled={disabled ?? false}
      {...(min !== undefined && { min })}
      {...(max !== undefined && { max })}
      {...(step !== undefined && { step })}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setLocal(initial)
          e.currentTarget.blur()
        }
      }}
    />
  )
}
// ── FIN: NumberWidget ──
