// ── INICIO: StatesLegend — lenda dos 6 estados de nodo ──
// Franxa flotante na parte inferior do lenzo. Mapea cada estado á súa
// cor (vén do themeVals) + etiqueta legible. Presentacional puro.
import type { JSX } from 'react'

export interface StateChip {
  readonly id: string
  readonly label: string
  readonly color: string
}

export interface StatesLegendProps {
  readonly chips: readonly StateChip[]
}

export function StatesLegend({ chips }: StatesLegendProps): JSX.Element {
  return (
    <fieldset className="states-legend">
      <legend className="states-legend-title">Estados dos nodos</legend>
      {chips.map((chip) => (
        <span key={chip.id} className="states-chip" title={chip.label}>
          <span className="states-chip-dot" style={{ background: chip.color }} />
          <span className="states-chip-label">{chip.label}</span>
        </span>
      ))}
    </fieldset>
  )
}
// ── FIN: StatesLegend ──
