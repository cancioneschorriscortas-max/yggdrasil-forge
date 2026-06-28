// ── INICIO: DetailPanel (F12 v1, consumidor-side) ──
//
// Panel lateral que se abre ao seleccionar un microskill. Le os datos
// reais do `NodeDef` + `currentTier` do engine. Cero cambios de
// librería: só usa o que xa expoñen @core/@react/@importers.
//
// Estrutura (de arriba a abaixo, como na pantalla GAIA real):
//   1. Vídeo (se metadata.gaia.video.url existe). Hoxe oculto sempre
//      no fixture do panadeiro porque non hai URLs.
//   2. Cabeceira: icona (IconGlyph se hai slug rexistrado; emoji
//      se non) + label + badge de nivel.
//   3. Descrición (que_significa).
//   4. NIVEIS (1..maxTier) co estado derivado por `tierRowsFor`.
//   5. ACCIÓN CLAVE (content.flavor) cunha barra ámbar lateral.
//   6. Botón "subir nivel" se canIncrease.
//
// Lóxica pura en `./detailLogic.ts` (importable pola sonda sen React).

import { resolveLocalized } from '@yggdrasil-forge/common'
import type { NodeDef } from '@yggdrasil-forge/core'
import { IconGlyph, getIcon } from '@yggdrasil-forge/react'
import type { JSX } from 'react'
import { badgeText, tierRowsFor } from './detailLogic.js'

interface DetailPanelProps {
  readonly node: NodeDef
  readonly currentTier: number
  readonly canIncrease: boolean
  readonly onIncreaseTier?: (id: string) => void
  readonly onClose?: () => void
}

/**
 * Lectura segura de `node.metadata.gaia.video.url`. `metadata` é
 * `Record<string, unknown>` no NodeDef; navegamos con guards en cada
 * paso para evitar `any`. Devolve `undefined` se calquera tramo non é
 * do tipo esperado.
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

export function DetailPanel({
  node,
  currentTier,
  canIncrease,
  onIncreaseTier,
  onClose,
}: DetailPanelProps): JSX.Element {
  const maxTier = node.maxTier ?? 1
  const rows = tierRowsFor(currentTier, maxTier)
  const label = resolveLocalized(node.label, 'gl')
  const description =
    node.description !== undefined ? resolveLocalized(node.description, 'gl') : undefined
  const flavor = node.content?.flavor
  const flavorText = flavor !== undefined ? resolveLocalized(flavor, 'gl') : undefined
  const videoUrl = getVideoUrl(node)

  // Icona: se node.icon é un slug rexistrado, IconGlyph recoloreable
  // (renderiza SVG; o color vén do CSS color do contedor); se non
  // (ex.: emoji ou icon ausente), fallback a texto.
  const iconDef = node.icon !== undefined ? getIcon(node.icon) : undefined
  const iconNode =
    iconDef !== undefined ? (
      <IconGlyph def={iconDef} size={36} />
    ) : (
      <span className="ob-detail__icon-emoji">{node.icon ?? '·'}</span>
    )

  return (
    <aside className="ob-detail" aria-label="Detalle do microskill">
      <button type="button" className="ob-detail__close" onClick={onClose} aria-label="Pechar">
        ×
      </button>

      {videoUrl !== undefined && (
        <div className="ob-detail__video">
          <iframe
            src={videoUrl}
            title={`Vídeo de ${label}`}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <header className="ob-detail__header">
        <div className="ob-detail__icon">{iconNode}</div>
        <div className="ob-detail__title-block">
          <h2 className="ob-detail__title">{label}</h2>
        </div>
        <span className="ob-detail__badge">{badgeText(currentTier, maxTier)}</span>
      </header>

      {description !== undefined && <p className="ob-detail__description">{description}</p>}

      <section className="ob-detail__tiers">
        <h3 className="ob-detail__section-title">NIVEIS</h3>
        <ol className="ob-detail__tier-list">
          {rows.map((row) => (
            <li
              key={row.tier}
              className={`ob-detail__tier ob-detail__tier--${row.state}`}
              aria-current={row.state === 'actual' ? 'step' : undefined}
            >
              <span className="ob-detail__tier-marker" aria-hidden="true">
                {row.state === 'completado' ? '✓' : row.state === 'actual' ? row.tier : '🔒'}
              </span>
              <span className="ob-detail__tier-label">NIVEL {row.tier}</span>
              <span className="ob-detail__tier-state">{stateLabel(row.state)}</span>
            </li>
          ))}
        </ol>
      </section>

      {flavorText !== undefined && (
        <section className="ob-detail__flavor">
          <h3 className="ob-detail__section-title">ACCIÓN CLAVE</h3>
          <blockquote className="ob-detail__flavor-quote">"{flavorText}"</blockquote>
        </section>
      )}

      {onIncreaseTier !== undefined && (
        <button
          type="button"
          className="ob-detail__action"
          disabled={!canIncrease}
          onClick={() => onIncreaseTier(node.id)}
        >
          {canIncrease
            ? 'Subir nivel'
            : currentTier >= maxTier
              ? 'Habilidade no máximo'
              : 'Bloqueado'}
        </button>
      )}
    </aside>
  )
}

function stateLabel(state: 'completado' | 'actual' | 'bloqueado'): string {
  switch (state) {
    case 'completado':
      return 'COMPLETADO'
    case 'actual':
      return 'ACTUAL'
    case 'bloqueado':
      return 'BLOQUEADO'
  }
}
// ── FIN: DetailPanel ──
