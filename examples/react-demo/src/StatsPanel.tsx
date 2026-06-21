// ── INICIO: StatsPanel — pestana Stats do Inspector ──
// Itera `treeDef.stats` da árbore activa. Cada fila usa `useStat` (hook
// reactivo de @react) para re-renderizar cando o valor cambia. Os
// hooks non se chaman en bucle: extráese unha fila por stat.
import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { useStat } from '@yggdrasil-forge/react'
import type { JSX } from 'react'

type LocalizedValue = string | Readonly<Record<string, string>>

function resolveLocalized(value: LocalizedValue | undefined, fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value === 'string') return value
  return value.gl ?? value.es ?? value.en ?? Object.values(value)[0] ?? fallback
}

function StatRow({
  engine,
  statId,
  label,
  format,
}: {
  readonly engine: TreeEngine
  readonly statId: string
  readonly label: string
  readonly format: 'number' | 'percent' | 'currency' | undefined
}): JSX.Element {
  const value = useStat(engine, statId)
  const display =
    format === 'percent'
      ? `${Math.round(value * 100)}%`
      : format === 'currency'
        ? `${value.toLocaleString()}`
        : `${value}`
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{display}</span>
    </div>
  )
}

export interface StatsPanelProps {
  readonly engine: TreeEngine
  readonly treeDef: TreeDef
}

export function StatsPanel({ engine, treeDef }: StatsPanelProps): JSX.Element {
  const stats = treeDef.stats ?? []
  if (stats.length === 0) {
    return <p className="inspector-empty">(esta árbore non declara stats)</p>
  }
  return (
    <div className="stats-panel">
      {stats.map((s) => (
        <StatRow
          key={s.id}
          engine={engine}
          statId={s.id}
          label={resolveLocalized(s.label, s.id)}
          format={s.format}
        />
      ))}
    </div>
  )
}
// ── FIN: StatsPanel ──
