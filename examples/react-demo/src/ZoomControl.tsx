// ── INICIO: ZoomControl — control flotante de zoom ──
// Flotante sobre o lenzo (posición absoluta dentro de canvas-zone).
// Espella as accións do antigo viewport-controls do sidebar.
import type { JSX } from 'react'

export interface ZoomControlProps {
  readonly zoomPercent: number
  readonly onFit: () => void
  readonly onReset: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
}

export function ZoomControl({
  zoomPercent,
  onFit,
  onReset,
  onZoomIn,
  onZoomOut,
}: ZoomControlProps): JSX.Element {
  return (
    <div className="zoom-control" role="toolbar" aria-label="Control de zoom">
      <button
        type="button"
        className="zoom-button"
        onClick={onFit}
        aria-label="Encadrar (Fit)"
        title="Encadrar"
      >
        ⛶
      </button>
      <button
        type="button"
        className="zoom-button"
        onClick={onReset}
        aria-label="Restablecer zoom"
        title="Restablecer"
      >
        ⟲
      </button>
      <span className="zoom-percent" aria-live="polite">
        {zoomPercent}%
      </span>
      <button
        type="button"
        className="zoom-button"
        onClick={onZoomOut}
        aria-label="Reducir zoom"
        title="Zoom −"
      >
        −
      </button>
      <button
        type="button"
        className="zoom-button"
        onClick={onZoomIn}
        aria-label="Aumentar zoom"
        title="Zoom +"
      >
        +
      </button>
    </div>
  )
}
// ── FIN: ZoomControl ──
