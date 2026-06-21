// ── INICIO: TopHud — barra superior north-star ──
// Presentacional puro. O HUD substitúe a antiga `app-header` + parte do
// panel Status (Puntos / Piedade / Nivel) + os botóns de acción
// globais (Save, Restore, Tema, Axuda). NON contén estado da árbore.
import type { JSX } from 'react'

export interface ResourceBar {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly max: number
  readonly icon?: string
}

export interface TopHudProps {
  readonly bars: readonly ResourceBar[]
  readonly level: number
  readonly onLevelChange: (delta: number) => void
  readonly onSave: () => void
  readonly onRestore: () => void
  readonly canRestore: boolean
  readonly onOpenTheme: () => void
  readonly onOpenHelp: () => void
}

function Bar({ bar, isLevel = false }: { bar: ResourceBar; isLevel?: boolean }): JSX.Element {
  const pct = bar.max > 0 ? Math.max(0, Math.min(1, bar.value / bar.max)) * 100 : 0
  return (
    <div className={`hud-bar${isLevel ? ' hud-bar--level' : ''}`}>
      <div className="hud-bar-label">
        {bar.icon !== undefined && <span className="hud-bar-icon">{bar.icon}</span>}
        <span>{bar.label}</span>
      </div>
      <div className="hud-bar-track">
        <div className="hud-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="hud-bar-value">
        {bar.value}
        <span className="hud-bar-of"> / {bar.max}</span>
      </div>
    </div>
  )
}

export function TopHud({
  bars,
  level,
  onLevelChange,
  onSave,
  onRestore,
  canRestore,
  onOpenTheme,
  onOpenHelp,
}: TopHudProps): JSX.Element {
  return (
    <header className="top-hud">
      <div className="hud-brand">
        <h1 className="hud-title">Yggdrasil Forge</h1>
        <p className="hud-tagline">⚔ Forge thy character</p>
      </div>

      <div className="hud-bars">
        {bars.map((bar) => {
          if (bar.id === 'level') {
            return (
              <div key={bar.id} className="hud-level">
                <Bar bar={bar} isLevel />
                <div className="hud-level-controls">
                  <button
                    type="button"
                    className="hud-icon-button"
                    onClick={() => onLevelChange(-1)}
                    aria-label="Baixar nivel"
                    disabled={level <= 1}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="hud-icon-button"
                    onClick={() => onLevelChange(+1)}
                    aria-label="Subir nivel"
                    disabled={level >= bar.max}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          }
          return <Bar key={bar.id} bar={bar} />
        })}
      </div>

      <div className="hud-actions">
        <button type="button" className="hud-action" onClick={onSave}>
          📸 Gardar
        </button>
        <button type="button" className="hud-action" onClick={onRestore} disabled={!canRestore}>
          ↺ Restaurar
        </button>
        <button type="button" className="hud-action" onClick={onOpenTheme}>
          🎨 Tema
        </button>
        <button
          type="button"
          className="hud-action hud-action--icon"
          onClick={onOpenHelp}
          aria-label="Axuda"
        >
          ?
        </button>
      </div>
    </header>
  )
}
// ── FIN: TopHud ──
