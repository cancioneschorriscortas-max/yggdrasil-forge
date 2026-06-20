import type { JSX } from 'react'
import { useState } from 'react'

/**
 * Valores en vivo do tema, con `--yf-color-node-fill`, `--yf-ring-width` e
 * `canvas` que non son parte do `Theme` pero o demo aplica vía CSS vars
 * inline no wrapper que envolve a `<SkillTree>`.
 */
export interface ThemeLabValues {
  readonly canvas: string
  readonly fill: string
  readonly text: string
  readonly nodeLocked: string
  readonly nodeUnlockable: string
  readonly nodeUnlocked: string
  readonly nodeMaxed: string
  readonly nodeInProgress: string
  readonly edge: string
  readonly ringWidth: number
  // Renderer sub-fase 1: fill por estado (opcional). Cadea baleira =
  // "non establecer" (cae a `fill` legado). Manter como strings sempre
  // para que o input de cor mostre algo razoable.
  readonly nodeFillLocked: string
  readonly nodeFillUnlockable: string
  readonly nodeFillUnlocked: string
  readonly nodeFillMaxed: string
  readonly nodeFillInProgress: string
}

/** Preset "plano claro" — fondo papel + cores vivas. */
export const presetFlatLight: ThemeLabValues = {
  canvas: '#f4f4ef',
  fill: '#ffffff',
  text: '#2c2c2a',
  nodeLocked: '#9a958a',
  nodeUnlockable: '#c08a2e',
  nodeUnlocked: '#4f9a3f',
  nodeMaxed: '#d4a017',
  nodeInProgress: '#c77a2e',
  edge: '#b9b3a5',
  ringWidth: 3,
  // Plano claro: sen fills por estado (todos = fill xeral, comportamento legado).
  nodeFillLocked: '#ffffff',
  nodeFillUnlockable: '#ffffff',
  nodeFillUnlocked: '#ffffff',
  nodeFillMaxed: '#ffffff',
  nodeFillInProgress: '#ffffff',
}

/** Preset "escuro limpo" — fondo noite + cores vivas pero saturadas. */
export const presetDarkClean: ThemeLabValues = {
  canvas: '#11131a',
  fill: '#2a2f3d',
  text: '#e6d5a8',
  nodeLocked: '#5b6b86',
  nodeUnlockable: '#e0a93c',
  nodeUnlocked: '#6fcf97',
  nodeMaxed: '#f0c14b',
  nodeInProgress: '#e08a3c',
  edge: '#46506b',
  ringWidth: 3,
  // Showcase: o corpo enteiro fala. Contraste suficiente sobre `canvas`
  // (#11131a): locked claramente visible pero atenuado; unlockable
  // neutral; unlocked tinte verde; maxed e in_progress dourados pero
  // diferenciados entre si para que un 2/3 e un 3/3 NON se confundan.
  nodeFillLocked: '#363c4d', // máis claro ca antes (#1d2230 era case invisible)
  nodeFillUnlockable: '#3b3f55',
  nodeFillUnlocked: '#2e4538', // verdoso saturado
  nodeFillMaxed: '#6d5118', // dourado escuro e pleno
  nodeFillInProgress: '#4d3a1a', // dourado tenue, ben distinto de maxed
}

interface ThemeLabProps {
  readonly value: ThemeLabValues
  readonly onChange: (next: ThemeLabValues) => void
  // Capa 2 — Selector de rexión (columna activa) + cor da rexión.
  /** Lista de rexións dispoñibles (id + label) para o selector. */
  readonly regions?: ReadonlyArray<{ readonly id: string; readonly label: string }>
  /** Mapa id → cor actual de cada rexión. */
  readonly regionColors?: Readonly<Record<string, string>>
  /** Id da rexión activa (a que está sendo editada). */
  readonly activeRegion?: string
  /** Callback ao cambiar de rexión activa no selector. */
  readonly onActiveRegionChange?: (id: string) => void
  /** Callback ao cambiar a cor da rexión activa. */
  readonly onRegionColorChange?: (id: string, color: string) => void
}

interface ColorFieldDef {
  readonly key: keyof Omit<ThemeLabValues, 'ringWidth'>
  readonly label: string
}

const COLOR_FIELDS: readonly ColorFieldDef[] = [
  { key: 'canvas', label: 'Fondo do lenzo' },
  { key: 'fill', label: 'Interior do nodo' },
  { key: 'text', label: 'Texto (label)' },
  { key: 'nodeLocked', label: 'Anel: locked' },
  { key: 'nodeUnlockable', label: 'Anel: unlockable' },
  { key: 'nodeUnlocked', label: 'Anel: unlocked' },
  { key: 'nodeMaxed', label: 'Anel: maxed' },
  { key: 'nodeInProgress', label: 'Anel: in progress' },
  { key: 'edge', label: 'Edges' },
  // Renderer sub-fase 1: fills por estado (corpo do nodo).
  { key: 'nodeFillLocked', label: 'Fill: locked' },
  { key: 'nodeFillUnlockable', label: 'Fill: unlockable' },
  { key: 'nodeFillUnlocked', label: 'Fill: unlocked' },
  { key: 'nodeFillMaxed', label: 'Fill: maxed' },
  { key: 'nodeFillInProgress', label: 'Fill: in progress' },
]

export function ThemeLab({
  value,
  onChange,
  regions,
  regionColors,
  activeRegion,
  onActiveRegionChange,
  onRegionColorChange,
}: ThemeLabProps): JSX.Element {
  const [copyStatus, setCopyStatus] = useState<string>('')

  const updateColor = (key: keyof Omit<ThemeLabValues, 'ringWidth'>, hex: string): void => {
    onChange({ ...value, [key]: hex })
  }

  const updateRing = (n: number): void => {
    onChange({ ...value, ringWidth: n })
  }

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
      setCopyStatus('✓ Copiado')
    } catch {
      setCopyStatus('✗ Erro')
    }
    setTimeout(() => setCopyStatus(''), 1800)
  }

  // Capa 2 — Selector de rexión activa + picker da súa cor.
  const hasRegions = regions !== undefined && regions.length > 0
  const activeColor =
    activeRegion !== undefined && regionColors !== undefined
      ? (regionColors[activeRegion] ?? '#999999')
      : '#999999'

  return (
    <section className="panel theme-lab">
      <h2 className="panel-title">⚜ Theme Lab</h2>

      <div className="theme-lab-body">
        <div className="theme-lab-presets">
          <button
            type="button"
            className="rune-button rune-button-small"
            onClick={() => onChange(presetFlatLight)}
          >
            ☀ Plano claro
          </button>
          <button
            type="button"
            className="rune-button rune-button-small"
            onClick={() => onChange(presetDarkClean)}
          >
            ☾ Escuro limpo
          </button>
        </div>

        {hasRegions && (
          <div className="theme-lab-region-block">
            <h3 className="theme-lab-subtitle">Cor por columna</h3>
            <label className="theme-lab-row">
              <span className="theme-lab-label">Columna</span>
              <select
                className="theme-lab-select"
                value={activeRegion ?? ''}
                onChange={(e) => onActiveRegionChange?.(e.target.value)}
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="theme-lab-row">
              <span className="theme-lab-label">Tinte</span>
              <input
                type="color"
                className="theme-lab-color"
                value={activeColor}
                onChange={(e) => {
                  if (activeRegion !== undefined) {
                    onRegionColorChange?.(activeRegion, e.target.value)
                  }
                }}
              />
              <code className="theme-lab-hex">{activeColor}</code>
            </label>
          </div>
        )}

        <div className="theme-lab-fields">
          {COLOR_FIELDS.map((field) => (
            <label className="theme-lab-row" key={field.key}>
              <span className="theme-lab-label">{field.label}</span>
              <input
                type="color"
                className="theme-lab-color"
                value={value[field.key]}
                onChange={(e) => updateColor(field.key, e.target.value)}
              />
              <code className="theme-lab-hex">{value[field.key]}</code>
            </label>
          ))}

          <label className="theme-lab-row">
            <span className="theme-lab-label">Grosor de anel</span>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={value.ringWidth}
              onChange={(e) => updateRing(Number.parseInt(e.target.value, 10))}
              className="theme-lab-range"
            />
            <code className="theme-lab-hex">{value.ringWidth}</code>
          </label>
        </div>

        <div className="theme-lab-actions">
          <button type="button" className="rune-button" onClick={handleCopy}>
            ⎘ Copiar valores
          </button>
          {copyStatus !== '' && <span className="theme-lab-status">{copyStatus}</span>}
        </div>

        <p className="theme-lab-note">
          <strong>Nota:</strong> no fondo escuro, os emojis nativos non se ven — iso resólvese
          migrando a iconos recoloreables (sub-fase futura).
        </p>
      </div>
    </section>
  )
}
