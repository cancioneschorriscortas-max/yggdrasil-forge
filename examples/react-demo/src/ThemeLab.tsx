import type { CSSProperties } from 'react'
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
}

interface ThemeLabProps {
  readonly value: ThemeLabValues
  readonly onChange: (next: ThemeLabValues) => void
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
]

export function ThemeLab({ value, onChange }: ThemeLabProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(true)
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

  const headerStyle: CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
  }

  return (
    <section className="panel theme-lab">
      <button
        type="button"
        className="panel-title"
        style={headerStyle}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>⚜ Theme Lab</span>
        <span style={{ fontSize: '0.75em', opacity: 0.7 }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
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
      )}
    </section>
  )
}
