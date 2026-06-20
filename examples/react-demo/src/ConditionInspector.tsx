// ── INICIO: ConditionInspector (Showcase Capa 1b) ──
// Panel lateral que fai VISIBLE todo o que o motor xa sabe ao seleccionar
// un nodo: prerequisitos ✓/✗ por condición, custo vs budget, exclusións
// activas, e veredicto final.
//
// Cero lóxica de motor aquí: o panel le e amosa. Os prereqs veñen xa
// avaliados de `engine.explainUnlock`; o veredicto vén de `canUnlock`;
// o custo e as exclusións ven de `getTreeDef` + `getBudget` + `getNodeState`.
import type { TreeEngine } from '@yggdrasil-forge/core'
import type { JSX } from 'react'
import { useCallback, useSyncExternalStore } from 'react'

// ── Tipos minimal locais (estructurais) ──────────────────────────────
// Replican a forma dos tipos públicos sen importalos por nome (evita
// acoplar este panel a imports concretos do paquete que poidan moverse).

type Locale = string

/** LocalizedString do core: string ou dict por locale. */
type LocalizedValue = string | Readonly<Record<string, string>>

interface CostEntry {
  readonly resourceId: string
  readonly amount: number
}

interface ConditionLike {
  readonly type: string
  readonly nodeId?: string
  readonly statId?: string
  readonly amount?: number
  readonly tier?: number
  readonly state?: string
  readonly count?: number
  readonly scope?: string
}

interface ConditionEvaluationLike {
  readonly condition: ConditionLike
  readonly satisfied: boolean
  readonly reason: LocalizedValue
}

// ── Helpers puros ────────────────────────────────────────────────────

/**
 * Resolve un `LocalizedString` (string ou dict) ao locale solicitado, con
 * fallback razoable (locale → 'es' → 'gl' → 'en' → primeiro dispoñible →
 * id cru).
 */
function resolveLocalized(
  value: LocalizedValue | undefined,
  locale: Locale,
  fallbackId: string,
): string {
  if (value === undefined) return fallbackId
  if (typeof value === 'string') return value
  const direct = value[locale]
  if (direct !== undefined) return direct
  const es = value.es
  if (es !== undefined) return es
  const gl = value.gl
  if (gl !== undefined) return gl
  const en = value.en
  if (en !== undefined) return en
  const first = Object.values(value)[0]
  return first ?? fallbackId
}

/** Indicador ✓/✗ con cor semántica. */
function StatusIcon({ satisfied }: { readonly satisfied: boolean }): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '1.2em',
        textAlign: 'center',
        color: satisfied ? '#4ade80' : '#f87171',
        fontWeight: 'bold',
      }}
      aria-label={satisfied ? 'cumprida' : 'non cumprida'}
    >
      {satisfied ? '✓' : '✗'}
    </span>
  )
}

// ── Compoñente principal ─────────────────────────────────────────────

interface ConditionInspectorProps {
  readonly engine: TreeEngine
  readonly selectedNodeId: string | null
  readonly locale?: Locale
}

export function ConditionInspector({
  engine,
  selectedNodeId,
  locale = 'es',
}: ConditionInspectorProps): JSX.Element {
  // Reactividade: re-renderiza con cada cambio do engine (un unlock noutro
  // nodo pode mudar este nodo de locked → unlockable, etc.).
  const subscribe = useCallback((listener: () => void) => engine.subscribe(listener), [engine])
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine])
  useSyncExternalStore(subscribe, getSnapshot)

  // ── Estado baleiro ──
  if (selectedNodeId === null) {
    return (
      <section className="panel">
        <h2 className="panel-title">🔍 Inspector de Condicións</h2>
        <p style={{ opacity: 0.7, fontStyle: 'italic', margin: '0.5rem 0' }}>
          Selecciona un nodo para ver por que pode ou non desbloquearse.
        </p>
      </section>
    )
  }

  const treeDef = engine.getTreeDef()
  const nodeDef = treeDef.nodes.find((n) => n.id === selectedNodeId)
  if (nodeDef === undefined) {
    return (
      <section className="panel">
        <h2 className="panel-title">🔍 Inspector de Condicións</h2>
        <p style={{ color: '#f87171' }}>Nodo «{selectedNodeId}» non atopado.</p>
      </section>
    )
  }

  const nodeState = engine.getNodeState(selectedNodeId)
  const nodeLabel = resolveLocalized(nodeDef.label as LocalizedValue, locale, selectedNodeId)
  const currentTier = nodeState?.currentTier ?? 0
  const maxTier = nodeDef.maxTier ?? 1

  // ── Avaliación reactiva (cada render le o estado actual). ──
  const explainResult = engine.explainUnlock(selectedNodeId)
  const verdictResult = engine.canUnlock(selectedNodeId)
  const budget = engine.getBudget()

  // ── Bloque PREREQUISITOS ──
  const renderPrereqsBlock = (): JSX.Element => {
    if (!explainResult.ok) {
      return (
        <p style={{ color: '#f87171', margin: '0.5rem 0' }}>
          Erro ao explicar: {explainResult.error.message}
        </p>
      )
    }
    const explanation = explainResult.value
    if (explanation.conditions.length === 0) {
      return (
        <p style={{ opacity: 0.7, fontStyle: 'italic', margin: '0.5rem 0' }}>
          Sen prerequisitos (raíz da árbore).
        </p>
      )
    }
    const total = explanation.conditions.length
    const passed = explanation.conditions.filter((c) => c.satisfied).length
    // Detectar combinador a partir do prereq raíz do nodo (se hai).
    let combinatorLabel = ''
    const rule = nodeDef.prerequisites
    if (rule !== undefined && 'type' in rule) {
      if (rule.type === 'all') combinatorLabel = ' (TODOS — AND)'
      else if (rule.type === 'any') combinatorLabel = ' (ALGÚN — OR)'
      else if (rule.type === 'none') combinatorLabel = ' (NINGÚN — NOT)'
    }
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
          Prerequisitos{combinatorLabel}{' '}
          <span style={{ opacity: 0.6, fontWeight: 400 }}>
            ({passed} / {total})
          </span>
        </div>
        {explanation.conditions.map((c, idx) => {
          const evaluation = c as ConditionEvaluationLike
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: condicións son posicionais e estables.
              key={idx}
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                padding: '0.25rem 0',
                fontSize: '0.9em',
              }}
            >
              <StatusIcon satisfied={evaluation.satisfied} />
              <span style={{ opacity: evaluation.satisfied ? 1 : 0.85 }}>
                {resolveLocalized(evaluation.reason, locale, evaluation.condition.type)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Bloque CUSTO ──
  const renderCostBlock = (): JSX.Element | null => {
    const cost = nodeDef.cost as readonly CostEntry[] | undefined
    if (cost === undefined || cost.length === 0) return null
    return (
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Custo</div>
        {cost.map((c) => {
          const have = budget.resources[c.resourceId] ?? 0
          const affordable = have >= c.amount
          const resource = treeDef.resources?.find((r) => r.id === c.resourceId)
          const resLabel = resolveLocalized(resource?.label as LocalizedValue, locale, c.resourceId)
          const icon = resource?.icon ?? ''
          return (
            <div
              key={c.resourceId}
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.2rem 0',
                fontSize: '0.9em',
              }}
            >
              <StatusIcon satisfied={affordable} />
              <span style={{ opacity: affordable ? 1 : 0.85 }}>
                {c.amount} {icon} {resLabel} <span style={{ opacity: 0.6 }}>(tes {have})</span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Bloque EXCLUSIÓNS ──
  const renderExclusionsBlock = (): JSX.Element | null => {
    const exclusions = nodeDef.exclusions
    if (exclusions === undefined || exclusions.length === 0) return null
    return (
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Exclusións</div>
        {exclusions.map((excludedId) => {
          const excludedDef = treeDef.nodes.find((n) => n.id === excludedId)
          const excludedLabel = resolveLocalized(
            excludedDef?.label as LocalizedValue,
            locale,
            excludedId,
          )
          const excludedState = engine.getNodeState(excludedId)?.state ?? 'locked'
          // Se o nodo excluído está activo (tier ≥ 1) → conflito.
          const conflicting =
            excludedState === 'unlocked' ||
            excludedState === 'in_progress' ||
            excludedState === 'maxed'
          // ✓ = sen conflito (compatible); ✗ = conflito activo (incompatible).
          return (
            <div
              key={excludedId}
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.2rem 0',
                fontSize: '0.9em',
              }}
            >
              <StatusIcon satisfied={!conflicting} />
              <span style={{ opacity: conflicting ? 0.85 : 0.7 }}>
                {conflicting ? 'Incompatible con' : 'Sen conflito con'} {excludedLabel}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Faixa VEREDICTO ──
  const renderVerdictBlock = (): JSX.Element => {
    if (!verdictResult.ok) {
      return (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.25rem',
            background: 'rgba(248, 113, 113, 0.15)',
            border: '1px solid rgba(248, 113, 113, 0.5)',
            color: '#fca5a5',
          }}
        >
          ✗ Erro: {verdictResult.error.message}
        </div>
      )
    }
    const verdict = verdictResult.value
    const allowed = verdict.allowed
    const reasonText =
      verdict.reason !== undefined
        ? resolveLocalized(verdict.reason as LocalizedValue, locale, 'unknown')
        : ''
    return (
      <div
        style={{
          marginTop: '1rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.25rem',
          background: allowed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
          border: `1px solid ${allowed ? 'rgba(74, 222, 128, 0.5)' : 'rgba(248, 113, 113, 0.5)'}`,
          color: allowed ? '#86efac' : '#fca5a5',
          fontWeight: 600,
        }}
      >
        {allowed ? '✓ Pode desbloquearse' : `✗ Non se pode: ${reasonText}`}
      </div>
    )
  }

  return (
    <section className="panel">
      <h2 className="panel-title">🔍 Inspector de Condicións</h2>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 600, fontSize: '1.05em' }}>{nodeLabel}</div>
        {maxTier > 1 && (
          <div style={{ opacity: 0.7, fontSize: '0.85em' }}>
            Tier {currentTier} / {maxTier}
          </div>
        )}
      </div>
      {renderPrereqsBlock()}
      {renderCostBlock()}
      {renderExclusionsBlock()}
      {renderVerdictBlock()}
    </section>
  )
}
// ── FIN: ConditionInspector ──
