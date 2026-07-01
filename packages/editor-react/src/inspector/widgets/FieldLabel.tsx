// ── INICIO: FieldLabel ──
// Compoñente reutilizable para renderizar unha etiqueta de campo do
// Inspector (Briefing 7.5c-U §3): amosa
//   1. O nome do campo (localizado, ex. "Nivel máximo").
//   2. Un iconiño (?) con tooltip nativo (hover).
//   3. O texto de axuda curto SEMPRE VISIBLE debaixo do widget.
//
// A regra "sempre visible + hover" é a propósito: hai lectores que
// non pasan o rato (móbil futuro, touchpads), e o texto curto tamén
// serve como scan rápido cando abres o Inspector.

import type { LocalizedString } from '@yggdrasil-forge/editor-core'
import type { JSX } from 'react'

export interface FieldLabelProps {
  readonly htmlFor: string
  readonly label: LocalizedString
  readonly describe?: LocalizedString
  readonly readonly?: boolean
}

/** Extrae string localizada priorizando gl. */
function pickText(loc: LocalizedString | undefined): string | undefined {
  if (loc === undefined) return undefined
  if (typeof loc === 'string') return loc
  return loc.gl ?? loc.en ?? Object.values(loc)[0]
}

/**
 * Cabeceira dun campo: label + (?)-tooltip con axuda. Renderízase
 * ANTES do widget. O texto describe curto vai NO `FieldHelp` que se
 * renderiza debaixo do widget.
 */
export function FieldLabel({ htmlFor, label, describe, readonly }: FieldLabelProps): JSX.Element {
  const labelText = pickText(label) ?? htmlFor
  const helpText = pickText(describe)
  return (
    <div className="editor-field__label-row">
      <label className="editor-inspector__label" htmlFor={htmlFor}>
        {labelText}
        {readonly === true && <span className="editor-inspector__readonly-tag"> (readonly)</span>}
      </label>
      {helpText !== undefined && (
        <span
          className="editor-field__help-icon"
          title={helpText}
          aria-label={`Axuda: ${helpText}`}
        >
          ?
        </span>
      )}
    </div>
  )
}

/**
 * Texto de axuda curto que se renderiza DEBAIXO do widget. Sempre
 * visible (non hover). Usa a mesma `describe` que o (?)-tooltip para
 * consistencia.
 */
export function FieldHelp({
  describe,
}: { readonly describe?: LocalizedString }): JSX.Element | null {
  const text = pickText(describe)
  if (text === undefined) return null
  return <p className="editor-field__help">{text}</p>
}
// ── FIN: FieldLabel ──
