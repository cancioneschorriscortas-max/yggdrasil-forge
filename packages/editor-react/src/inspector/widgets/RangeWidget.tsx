// ── INICIO: RangeWidget ──
// Widget para `kind:'range'`. **Commit inmediato** en cada cambio
// (igual que CheckboxWidget) — un slider é retroalimentación en vivo,
// non ten sentido esperar a un blur coma TextWidget/NumberWidget.
// Amosa o valor numérico actual ao carón para claridade.

import { type JSX, useEffect, useState } from 'react'

export interface RangeWidgetProps {
  readonly id: string
  readonly value: number | undefined
  readonly min: number
  readonly max: number
  readonly step?: number
  readonly disabled?: boolean
  readonly onCommit: (next: number) => void
}

export function RangeWidget({
  id,
  value,
  min,
  max,
  step,
  disabled,
  onCommit,
}: RangeWidgetProps): JSX.Element {
  const resolved = value ?? min
  // Estado local só para que o número amosado siga o arrastre en
  // tempo real (o commit xa vai en cada onChange, pero re-render do
  // pai podería ir un chisco por detrás do pointer nativo).
  const [local, setLocal] = useState(resolved)
  useEffect(() => {
    setLocal(resolved)
  }, [resolved])

  return (
    <div className="editor-range-widget">
      <input
        id={id}
        type="range"
        className="editor-range-widget__input"
        value={local}
        min={min}
        max={max}
        {...(step !== undefined && { step })}
        disabled={disabled ?? false}
        onChange={(e) => {
          const next = Number(e.target.value)
          setLocal(next)
          onCommit(next)
        }}
      />
      <span className="editor-range-widget__value">{local.toFixed(1)}</span>
    </div>
  )
}
// ── FIN: RangeWidget ──
