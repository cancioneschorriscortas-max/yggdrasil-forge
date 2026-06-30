// ── INICIO: ColorWidget ──
// Widget para `kind:'color'`. Usa `<input type="color">` nativo.
//
// **Commit on blur**: o color picker emite onChange continuamente
// mentres o usuario move o cursor; commit on blur evita 1-command-
// por-pixel. (Igual estratexia que TextWidget.) Tamén mostra un
// preview da cor en label para feedback visual inmediato.

import { type JSX, useEffect, useState } from 'react'

export interface ColorWidgetProps {
  readonly id: string
  readonly value: string | undefined
  readonly disabled?: boolean
  readonly onCommit: (next: string) => void
}

export function ColorWidget({ id, value, disabled, onCommit }: ColorWidgetProps): JSX.Element {
  // <input type="color"> require formato #rrggbb estrito.
  const initial = value ?? '#000000'
  const [local, setLocal] = useState(initial)
  useEffect(() => {
    setLocal(initial)
  }, [initial])

  const commit = (): void => {
    if (local !== initial) onCommit(local)
  }

  return (
    <div className="editor-inspector-color-row">
      <input
        id={id}
        type="color"
        className="editor-inspector-color"
        value={local}
        disabled={disabled ?? false}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
      <span className="editor-inspector-color-hex">{local}</span>
    </div>
  )
}
// ── FIN: ColorWidget ──
