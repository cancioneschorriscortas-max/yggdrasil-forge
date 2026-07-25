// ── INICIO: RangeWidget ──
// Widget para `kind:'range'`. **Commit ao final do xesto**
// (pointerup / keyup / blur), NON en cada `onChange`.
//
// Por que: arrastrar o slider dispara decenas de `onChange`; se cada un
// commitea, o xesto contamina o historial con decenas de entradas de
// undo (viola «un xesto do usuario = UN undo»). Mantemos o número en
// vivo co estado local (retroalimentación inmediata na UI) pero só
// persistimos o valor final cando remata o xesto. Amosa o valor
// numérico actual ao carón para claridade.

import { type JSX, useCallback, useEffect, useState } from 'react'

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
  // Estado local: segue o arrastre en vivo (número + posición do
  // slider). `resolved` reflicte o último valor COMMITEADO; ao
  // sincronizar con el vía effect, tras commitear `local === resolved`
  // e os disparos redundantes (ex. blur despois de pointerup) non
  // volven commitear.
  const [local, setLocal] = useState(resolved)
  useEffect(() => {
    setLocal(resolved)
  }, [resolved])

  // Commit ao final do xesto: só se o valor cambiou respecto ao
  // committed (evita entradas de undo baleiras en blur sen cambio).
  const commit = useCallback(() => {
    if (local !== resolved) onCommit(local)
  }, [local, resolved, onCommit])

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
        // En vivo: só actualiza o estado local (sen tocar o documento).
        onChange={(e) => setLocal(Number(e.target.value))}
        // Fin do xesto: persiste unha soa vez. Cubrimos rato (pointerup),
        // teclado (keyup: frechas/Home/End) e perda de foco (blur) como
        // rede de seguridade.
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <span className="editor-range-widget__value">{local.toFixed(1)}</span>
    </div>
  )
}
// ── FIN: RangeWidget ──
