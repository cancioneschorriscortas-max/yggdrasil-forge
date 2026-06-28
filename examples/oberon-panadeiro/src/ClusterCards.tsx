// ── INICIO: ClusterCards (vista "tarxetas-lista", consumidor-side) ──
//
// Vista alternativa do mesmo grafo: cada cluster é unha tarxeta (título
// + filas icona/label/estado) en lugar dun cluster espacial. Está pensada
// para casos UI tipo Oberón onde as posicións espaciais non aportan e a
// lectura de lista é máis directa.
//
// **Cero estado propio**: o consumidor (App) prepara `groups` e cablea
// `onRowClick` → setSelectedNodeId. A reactividade (subir tier no
// DetailPanel actualiza os badges das filas) vén de que `groups`
// recálculase co snapshot do engine.
//
// **Render inline de iconas**: para non duplicar IconGlyph (que está
// pensado para `<g>` dentro doutro SVG), pintamos os paths nun `<svg>`
// dimensionado, con `currentColor` herdado vía CSS color. Mesma técnica
// de F10.5 (recoloreabilidade).
//
// **Posicións provisionais**: `CARD_POSITIONS` é un só obxecto editable;
// cambiar a distribución das tarxetas = cambiar este obxecto.

import type { IconDef, IconPath } from '@yggdrasil-forge/react'
import type { CSSProperties, JSX } from 'react'
import { rowBadge, rowState } from './cardLogic.js'

export interface CardMember {
  readonly id: string
  readonly label: string
  readonly icon: IconDef | undefined
  readonly currentTier: number
  readonly maxTier: number
}

export interface CardGroup {
  readonly id: string
  readonly label: string
  readonly color: string
  readonly members: readonly CardMember[]
}

interface ClusterCardsProps {
  readonly groups: readonly CardGroup[]
  readonly crownLabel: string
  readonly crownIcon: IconDef | undefined
  readonly selectedNodeId?: string
  readonly onRowClick: (id: string) => void
}

/**
 * Posicións das tarxetas (porcentaxes respecto ao lenzo). Punto de
 * partida co patrón "pétalas arredor da coroa". Editar este obxecto
 * para mover as tarxetas (a distribución é provisional, decisión do
 * dono cando vexa cómo casa). Coroa centrada en 50%/50%.
 */
const CARD_POSITIONS: Record<string, { readonly left: string; readonly top: string }> = {
  panadeiro_forno_masas: { left: '50%', top: '12%' },
  panadeiro_tempos_fermentacion: { left: '82%', top: '38%' },
  panadeiro_sabor_creatividade: { left: '70%', top: '82%' },
  panadeiro_resistencia_oficio: { left: '30%', top: '82%' },
  panadeiro_materia_prima: { left: '18%', top: '38%' },
}
const CARD_DEFAULT_POSITION = { left: '50%', top: '50%' }

const ROW_STATE_COLOR: Record<'done' | 'actual' | 'locked', string> = {
  done: '#5fc89a',
  actual: '#f0b056',
  locked: '#7c8294',
}

/**
 * Pinta un `IconDef` nun `<svg>` dimensionado, herdando a cor por
 * `currentColor` (CSS color do contedor). Igual técnica que IconGlyph
 * pero como SVG root (non aniñado) para uso libre no DOM.
 */
function InlineIcon({ def, size }: { def: IconDef; size: number }): JSX.Element {
  const viewBox = def.viewBox ?? '0 0 24 24'
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <title>icon</title>
      {def.paths.map((p: IconPath, i: number) => {
        const mode = p.mode ?? 'fill'
        if (mode === 'stroke') {
          return (
            <path
              key={`p-${String(i)}`}
              d={p.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        }
        return <path key={`p-${String(i)}`} d={p.d} fill="currentColor" />
      })}
    </svg>
  )
}

export function ClusterCards({
  groups,
  crownLabel,
  crownIcon,
  selectedNodeId,
  onRowClick,
}: ClusterCardsProps): JSX.Element {
  return (
    <div className="ob-cards">
      <div className="ob-cards__crown" style={CARD_DEFAULT_POSITION}>
        <div className="ob-cards__crown-glyph">
          {crownIcon !== undefined ? <InlineIcon def={crownIcon} size={42} /> : <span>·</span>}
        </div>
        <div className="ob-cards__crown-label">{crownLabel}</div>
      </div>
      {groups.map((g) => {
        const position = CARD_POSITIONS[g.id] ?? CARD_DEFAULT_POSITION
        const style: CSSProperties = { left: position.left, top: position.top }
        return (
          <div key={g.id} className="ob-card" style={style}>
            <div className="ob-card__title" style={{ background: g.color }}>
              {g.label}
            </div>
            <ul className="ob-card__rows">
              {g.members.map((m) => {
                const state = rowState(m.currentTier, m.maxTier)
                const badge = rowBadge(m.currentTier, m.maxTier)
                const isSelected = m.id === selectedNodeId
                return (
                  <li
                    key={m.id}
                    className={`ob-card__row ob-card__row--${state}${isSelected ? ' ob-card__row--selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="ob-card__row-button"
                      onClick={() => onRowClick(m.id)}
                    >
                      <span className="ob-card__row-icon" style={{ color: g.color }}>
                        {m.icon !== undefined ? <InlineIcon def={m.icon} size={20} /> : null}
                      </span>
                      <span className="ob-card__row-label">{m.label}</span>
                      <span
                        className="ob-card__row-badge"
                        style={{ color: ROW_STATE_COLOR[state] }}
                      >
                        {badge}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
// ── FIN: ClusterCards ──
