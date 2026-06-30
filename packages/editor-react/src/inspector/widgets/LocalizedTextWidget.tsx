// ── INICIO: LocalizedTextWidget ──
// Widget para `LocalizedString` (string | Record<string,string>).
//
// **v1 deseño**:
//   - Se o valor é `string` simple → edita como string (o set despois
//     pasa string e setNodeField acéptao).
//   - Se o valor é `Record` → edita a entrada da locale **default** (`en`
//     se existe, senon a primeira clave). As outras locales **consérvanse**.
//
// **Limitación coñecida (banco "locale do canvas")**: o editor non
// permite cambiar a locale activa nin engadir locales novas. Para
// edición multi-locale: 7.5d ou posterior.

import type { LocalizedString } from '@yggdrasil-forge/editor-core'
import { type JSX, useEffect, useState } from 'react'

export interface LocalizedTextWidgetProps {
  readonly id: string
  readonly value: LocalizedString | undefined
  readonly disabled?: boolean
  readonly onCommit: (next: LocalizedString) => void
}

/**
 * Extrae a string editable. Para Record, prioriza 'en' e cae á primeira
 * clave dispoñible.
 */
function pickEditableString(v: LocalizedString | undefined): {
  text: string
  preserveLocale: string | null
  preserveRecord: Record<string, string> | null
} {
  if (v === undefined) return { text: '', preserveLocale: null, preserveRecord: null }
  if (typeof v === 'string') return { text: v, preserveLocale: null, preserveRecord: null }
  // Record: prioriza 'en', senon primeira clave.
  const locale = 'en' in v ? 'en' : (Object.keys(v)[0] ?? 'en')
  return { text: v[locale] ?? '', preserveLocale: locale, preserveRecord: { ...v } }
}

export function LocalizedTextWidget({
  id,
  value,
  disabled,
  onCommit,
}: LocalizedTextWidgetProps): JSX.Element {
  const { text: initial, preserveLocale, preserveRecord } = pickEditableString(value)
  const [local, setLocal] = useState(initial)
  useEffect(() => {
    setLocal(initial)
  }, [initial])

  const commit = (): void => {
    if (local === initial) return
    if (preserveLocale === null) {
      // Era string (ou undefined) → commit como string.
      onCommit(local)
    } else if (preserveRecord !== null) {
      // Era Record → preserva todo, sobreescribe só a locale editada.
      onCommit({ ...preserveRecord, [preserveLocale]: local })
    } else {
      onCommit(local)
    }
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
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setLocal(initial)
          e.currentTarget.blur()
        }
      }}
      {...(preserveLocale !== null && {
        title: `Editando locale '${preserveLocale}'. As outras locales consérvanse.`,
      })}
    />
  )
}
// ── FIN: LocalizedTextWidget ──
