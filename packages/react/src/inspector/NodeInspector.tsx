'use client'
// ── INICIO: NodeInspector (promovido desde DetailPanel) ──
//
// Panel lateral que se abre ao seleccionar un microskill. Le o NodeDef
// + currentTier do engine e mostra: vídeo opcional, cabeceira (icona +
// label + badge), descrición, niveis, acción clave, botón "subir nivel".
//
// **Sen acoplamento ao exemplo**: autoestilado con inline styles +
// classNames `yf-node-inspector*` para override. Sen CSS importado.
// **i18n** vía `locale` prop (default 'en') + `strings` Partial override.
// **Vídeo** vía `renderVideo` prop (default iframe).
//
// Lóxica pura en `./logic.ts` (importada por sondas).

import { resolveLocalized } from '@yggdrasil-forge/common'
import type { NodeDef } from '@yggdrasil-forge/core'
import type { CSSProperties, JSX, ReactNode } from 'react'
import { useTheme } from '../ThemeProvider.js'
import { IconGlyph } from '../icons/IconGlyph.js'
import { getIcon } from '../icons/registry.js'
import { type TierState, badgeKind, tierRowsFor } from './logic.js'

/**
 * Diccionario de strings localizables que o NodeInspector mostra. Todos
 * defaultean a inglés (DEFAULT_STRINGS_EN abaixo); o consumidor pasa
 * `strings: Partial<InspectorStrings>` para sobrescribir só o que quere.
 */
export interface InspectorStrings {
  readonly levels: string
  readonly keyAction: string
  readonly completed: string
  readonly current: string
  readonly locked: string
  readonly levelWord: string
  readonly ofWord: string
  readonly maxedSuffix: string
  readonly increase: string
  readonly maxed: string
  readonly blocked: string
  readonly close: string
}

const DEFAULT_STRINGS_EN: InspectorStrings = {
  levels: 'LEVELS',
  keyAction: 'KEY ACTION',
  completed: 'COMPLETED',
  current: 'CURRENT',
  locked: 'LOCKED',
  levelWord: 'LEVEL',
  ofWord: 'OF',
  maxedSuffix: 'MAX',
  increase: 'Increase level',
  maxed: 'Maxed out',
  blocked: 'Locked',
  close: 'Close',
}

export interface NodeInspectorProps {
  readonly node: NodeDef
  readonly currentTier: number
  readonly canIncrease: boolean
  readonly onIncreaseTier?: (id: string) => void
  readonly onClose?: () => void
  /** Locale para resolver `node.label`/`description`/`content.flavor`. Default `'en'`. */
  readonly locale?: string
  /** Override parcial de strings user-facing. Default inglés. */
  readonly strings?: Partial<InspectorStrings>
  /** Render do vídeo se hai `node.metadata.gaia.video.url`. Default iframe. */
  readonly renderVideo?: (url: string) => ReactNode
}

/**
 * Lectura segura de `node.metadata.gaia.video.url`. `metadata` é
 * `Record<string, unknown>` no NodeDef; navegamos con guards en cada
 * paso para evitar `any`.
 */
function getVideoUrl(node: NodeDef): string | undefined {
  const meta = node.metadata
  if (meta === undefined || typeof meta !== 'object' || meta === null) return undefined
  const gaia = (meta as Record<string, unknown>).gaia
  if (gaia === undefined || typeof gaia !== 'object' || gaia === null) return undefined
  const video = (gaia as Record<string, unknown>).video
  if (video === undefined || typeof video !== 'object' || video === null) return undefined
  const url = (video as Record<string, unknown>).url
  return typeof url === 'string' ? url : undefined
}

function defaultRenderVideo(url: string, label: string): JSX.Element {
  return (
    <iframe
      src={url}
      title={`Video for ${label}`}
      allow="accelerometer; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{ width: '100%', height: '100%', border: 0 }}
    />
  )
}

function stateLabel(state: TierState, strings: InspectorStrings): string {
  switch (state) {
    case 'completado':
      return strings.completed
    case 'actual':
      return strings.current
    case 'bloqueado':
      return strings.locked
  }
}

// Cores de estado (defaults); consumidor pode estilar via classNames.
const STATE_COLOR_DEFAULT: Record<TierState, string> = {
  completado: '#3a8a6a',
  actual: '#d98a2b',
  bloqueado: '#7c8294',
}

export function NodeInspector({
  node,
  currentTier,
  canIncrease,
  onIncreaseTier,
  onClose,
  locale = 'en',
  strings: stringsOverride,
  renderVideo,
}: NodeInspectorProps): JSX.Element {
  const theme = useTheme()
  const strings: InspectorStrings = { ...DEFAULT_STRINGS_EN, ...stringsOverride }
  const maxTier = node.maxTier ?? 1
  const rows = tierRowsFor(currentTier, maxTier)
  const label = resolveLocalized(node.label, locale)
  const description =
    node.description !== undefined ? resolveLocalized(node.description, locale) : undefined
  const flavor = node.content?.flavor
  const flavorText = flavor !== undefined ? resolveLocalized(flavor, locale) : undefined
  const videoUrl = getVideoUrl(node)
  const badgeText =
    badgeKind(currentTier, maxTier) === 'maxed'
      ? `${strings.levelWord} ${maxTier} ${strings.ofWord} ${maxTier} · ${strings.maxedSuffix}`
      : `${strings.levelWord} ${currentTier + 1} ${strings.ofWord} ${maxTier}`

  const iconDef = node.icon !== undefined ? getIcon(node.icon) : undefined
  const textColor = theme?.colors.text ?? '#e8dcc4'

  const rootStyle: CSSProperties = {
    position: 'relative',
    padding: '18px',
    color: textColor,
    font: '13px / 1.5 system-ui, sans-serif',
    background: theme?.colors.surface ?? '#11131a',
    border: '1px solid #262a35',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  return (
    <aside className="yf-node-inspector" style={rootStyle} aria-label={label}>
      <button
        type="button"
        className="yf-node-inspector__close"
        onClick={onClose}
        aria-label={strings.close}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'transparent',
          border: 'none',
          color: '#888',
          fontSize: 22,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 4,
        }}
      >
        ×
      </button>

      {videoUrl !== undefined && (
        <div
          className="yf-node-inspector__video"
          style={{
            aspectRatio: '16 / 9',
            background: '#1c2030',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {renderVideo !== undefined ? renderVideo(videoUrl) : defaultRenderVideo(videoUrl, label)}
        </div>
      )}

      <header
        className="yf-node-inspector__header"
        style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr auto',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div
          className="yf-node-inspector__icon"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#2a2f3d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColor,
          }}
        >
          {iconDef !== undefined ? (
            <IconGlyph def={iconDef} size={36} />
          ) : (
            <span style={{ fontSize: 22, lineHeight: 1 }}>{node.icon ?? '·'}</span>
          )}
        </div>
        <h2
          className="yf-node-inspector__title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: '#d6c89a',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </h2>
        <span
          className="yf-node-inspector__badge"
          style={{
            fontSize: 11,
            padding: '6px 10px',
            border: '1px solid #3a8a6a',
            color: '#5fc89a',
            borderRadius: 999,
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}
        >
          {badgeText}
        </span>
      </header>

      {description !== undefined && (
        <p
          className="yf-node-inspector__description"
          style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#c8c0a8' }}
        >
          {description}
        </p>
      )}

      <section className="yf-node-inspector__tiers">
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: 11,
            letterSpacing: '0.1em',
            fontWeight: 700,
            color: '#b0a888',
            textTransform: 'uppercase',
          }}
        >
          {strings.levels}
        </h3>
        <ol
          className="yf-node-inspector__tier-list"
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {rows.map((row) => {
            const isActual = row.state === 'actual'
            const isBlocked = row.state === 'bloqueado'
            const tierBg = isActual ? 'rgba(217, 138, 43, 0.12)' : 'rgba(255, 255, 255, 0.02)'
            const tierBorder = isActual ? 'rgba(217, 138, 43, 0.4)' : 'transparent'
            const markerBg =
              row.state === 'completado' ? '#3a8a6a' : isActual ? '#d98a2b' : '#2a2f3d'
            const markerColor = row.state === 'completado' ? '#fff' : isActual ? '#1c1712' : '#888'
            return (
              <li
                key={row.tier}
                className={`yf-node-inspector__tier yf-node-inspector__tier--${row.state}`}
                aria-current={isActual ? 'step' : undefined}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: tierBg,
                  border: `1px solid ${tierBorder}`,
                  opacity: isBlocked ? 0.55 : 1,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontWeight: 700,
                    fontSize: 12,
                    background: markerBg,
                    color: markerColor,
                  }}
                >
                  {row.state === 'completado' ? '✓' : isActual ? row.tier : '🔒'}
                </span>
                <span style={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: 12 }}>
                  {strings.levelWord} {row.tier}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    opacity: 0.85,
                    color: STATE_COLOR_DEFAULT[row.state],
                  }}
                >
                  {stateLabel(row.state, strings)}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {flavorText !== undefined && (
        <section className="yf-node-inspector__flavor">
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: 11,
              letterSpacing: '0.1em',
              fontWeight: 700,
              color: '#b0a888',
              textTransform: 'uppercase',
            }}
          >
            {strings.keyAction}
          </h3>
          <blockquote
            className="yf-node-inspector__flavor-quote"
            style={{
              margin: 0,
              padding: '8px 12px',
              borderLeft: '3px solid #d98a2b',
              background: 'rgba(217, 138, 43, 0.05)',
              color: '#e0d4b8',
              fontStyle: 'italic',
              lineHeight: 1.45,
              borderRadius: '0 4px 4px 0',
            }}
          >
            "{flavorText}"
          </blockquote>
        </section>
      )}

      {onIncreaseTier !== undefined && (
        <button
          type="button"
          className="yf-node-inspector__action"
          disabled={!canIncrease}
          onClick={() => onIncreaseTier(node.id)}
          style={{
            marginTop: 4,
            padding: '10px 14px',
            background: canIncrease ? '#d98a2b' : '#2a2f3d',
            color: canIncrease ? '#1c1712' : '#888',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: 12,
            cursor: canIncrease ? 'pointer' : 'not-allowed',
          }}
        >
          {canIncrease
            ? strings.increase
            : currentTier >= maxTier
              ? strings.maxed
              : strings.blocked}
        </button>
      )}
    </aside>
  )
}
// ── FIN: NodeInspector ──
