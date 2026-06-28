// ── INICIO: CyberInspector (panel dereito) ──
// Le NodeDef + currentTier + engine. Mostra categoría, nome, Mk,
// descrición, contribucións de stat, incompatibles, install cost,
// botón INSTALL gateado por engine.canUnlock().
//
// Vive no exemplo (cyberware-specific layout). Se outro caso o pide
// (§13), promóvese a @react como variante alternativa de NodeInspector.

import { resolveLocalized } from '@yggdrasil-forge/common'
import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { categoryLabel, mkLabel, nextTierCost } from './inspectorLogic.js'

interface CyberInspectorProps {
  readonly engine: TreeEngine
  readonly def: TreeDef
  readonly nodeId: string
  readonly onInstall: (id: string) => void
  readonly onClose: () => void
}

type UnlockCheckResult = ReturnType<TreeEngine['canUnlock']>

const LOCALE = 'en'

function formatStatLabel(def: TreeDef, statId: string): string {
  const stat = def.stats?.find((s) => s.id === statId)
  if (stat === undefined) return statId.toUpperCase()
  return resolveLocalized(stat.label, LOCALE).toUpperCase()
}

function formatStatValue(def: TreeDef, statId: string, value: number, op: string): string {
  const stat = def.stats?.find((s) => s.id === statId)
  const suffix = stat?.format === 'percent' ? '%' : ''
  const sign = op === '+' && value >= 0 ? '+' : ''
  return `${sign}${value}${suffix}`
}

function resolveExclusionLabel(def: TreeDef, exclusionId: string): string {
  const node = def.nodes.find((n) => n.id === exclusionId)
  if (node === undefined) return exclusionId
  return resolveLocalized(node.label, LOCALE).toUpperCase()
}

function reasonText(check: UnlockCheckResult): string | undefined {
  if (!check.ok) return undefined
  if (check.value.allowed) return undefined
  if (check.value.reason === undefined) return 'REQUIREMENTS NOT MET'
  return resolveLocalized(check.value.reason, LOCALE)
}

export function CyberInspector({
  engine,
  def,
  nodeId,
  onInstall,
  onClose,
}: CyberInspectorProps): JSX.Element | null {
  const node = def.nodes.find((n) => n.id === nodeId)
  if (node === undefined) return null

  const state = engine.getNodeState(nodeId)
  const currentTier = state?.currentTier ?? 0
  const maxTier = node.maxTier ?? 1
  const isMaxed = currentTier >= maxTier

  const label = resolveLocalized(node.label, LOCALE)
  const description =
    node.description !== undefined ? resolveLocalized(node.description, LOCALE) : undefined
  const flavor = node.content?.flavor
  const flavorText = flavor !== undefined ? resolveLocalized(flavor, LOCALE) : undefined

  const cost = nextTierCost(node, currentTier)
  const check = engine.canUnlock(nodeId)
  const allowed = check.ok && check.value.allowed
  const reason = reasonText(check)
  const mk = mkLabel(currentTier, maxTier)

  return (
    <aside className="cyber-inspector" data-augmented-ui="border tl-clip tr-clip br-clip bl-clip">
      <button type="button" className="cyber-inspector__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="cyber-inspector__category">{categoryLabel(node)}</div>
      <header className="cyber-inspector__header">
        <h2 className="cyber-inspector__title">{label}</h2>
        {mk !== '' && <span className="cyber-inspector__mk">{mk}</span>}
      </header>

      {description !== undefined && <p className="cyber-inspector__description">{description}</p>}

      {node.statContributions !== undefined && node.statContributions.length > 0 && (
        <ul className="cyber-inspector__stats">
          {node.statContributions.map((c, i) => (
            <li key={`${c.statId}-${String(i)}`} className="cyber-inspector__stat">
              <span className="cyber-inspector__stat-value">
                {formatStatValue(def, c.statId, c.value, c.op)}
              </span>
              <span className="cyber-inspector__stat-label">{formatStatLabel(def, c.statId)}</span>
            </li>
          ))}
        </ul>
      )}

      {node.exclusions !== undefined && node.exclusions.length > 0 && (
        <div className="cyber-inspector__exclusions">
          ⚠ INCOMPATIBLE WITH:{' '}
          {node.exclusions.map((eid) => resolveExclusionLabel(def, eid)).join(', ')}
        </div>
      )}

      {flavorText !== undefined && (
        <blockquote className="cyber-inspector__flavor">"{flavorText}"</blockquote>
      )}

      {!isMaxed && (
        <>
          <div className="cyber-inspector__cost">
            <div className="cyber-inspector__cost-title">INSTALL COST</div>
            <div className="cyber-inspector__cost-line">
              <span className="cyber-inspector__cost-value">
                €$ {cost.eurodollars.toLocaleString('en-US')}
              </span>
              <span className="cyber-inspector__cost-value">{cost.components} COMPONENTS</span>
              {cost.capacity > 0 && (
                <span className="cyber-inspector__cost-value">{cost.capacity} CAP</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="cyber-inspector__install"
            data-augmented-ui="border tl-clip tr-clip br-clip bl-clip"
            disabled={!allowed}
            onClick={() => onInstall(nodeId)}
          >
            {allowed ? 'INSTALL' : (reason ?? 'LOCKED')}
          </button>
        </>
      )}
      {isMaxed && <div className="cyber-inspector__maxed">FULLY INSTALLED · MK.{maxTier}</div>}
    </aside>
  )
}
// ── FIN: CyberInspector ──
