// ── INICIO: conditionLabels ──
// **Mapa localizado** para tipos de UnlockCondition + combinadores
// UnlockRule (Briefing 7.5c-ii fase 2 §2 e §8).
//
// **Cobertura obrigatoria (test)**: cada valor de
// `SUPPORTED_CONDITION_TYPES` ten label. Se @core engade unha
// condición nova sen actualizar o mapa, un test específico falla.
// Mesma filosofía que `NODE_TYPE_LABELS` / `EFFECT_TYPE_LABELS`.
//
// **Params spec**: cada condición ten unha lista de "campos" a editar
// (nodeId, resourceId, amount, etc.), que o PrerequisitesEditor
// interpreta para renderizar o mini-formulario correcto. Non é un
// widget completo; é a descrición do que necesita.
//
// **UnlockCondition** (14 tipos, verificado en packages/core/src/types/unlock.ts):
//   - node_unlocked        { nodeId }
//   - node_maxed           { nodeId }
//   - node_state           { nodeId, state: NodeState }
//   - nodes_count          { count, scope? }
//   - resource_min         { resourceId, amount }
//   - tier_min             { nodeId, tier }
//   - distance_max         { fromNodeId, maxSteps }
//   - tag_count            { tag, count }
//   - progress_min         { nodeId, percent }
//   - subtree_completion   { subtreeId, percent }
//   - stat_min             { statId, amount }
//   - time_after           { timestamp }
//   - time_before          { timestamp }
//   - custom               { evaluator }

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { SUPPORTED_CONDITION_TYPES } from '@yggdrasil-forge/core'

/** Tipo dun campo dun mini-formulario de condición. */
export type ConditionParamKind =
  | 'nodeId' // picker de nodos da árbore
  | 'resourceId' // picker de tree.resources
  | 'statId' // picker de tree.stats
  | 'subtreeId' // texto libre (non hai lista); coa futura UI de subtrees serialase a picker
  | 'nodeState' // enum NodeState localizado
  | 'number' // input numérico
  | 'percent' // input numérico 0-100
  | 'tag' // texto libre (o tree non expón tags dun sitio central)
  | 'scope' // texto libre opcional
  | 'timestamp' // data/hora
  | 'code' // texto libre longo (evaluator custom; aviso avanzado)

export interface ConditionParamSpec {
  readonly key: string
  readonly kind: ConditionParamKind
  readonly label: LocalizedString
  /** Se o campo é opcional (schema-level readonly? é opcional). */
  readonly optional?: boolean
}

export interface ConditionLabelEntry {
  readonly label: LocalizedString
  readonly describe: LocalizedString
  readonly params: readonly ConditionParamSpec[]
}

// ── Combinadores UnlockRule (all/any/none) ──
export const RULE_COMBINATOR_LABELS: Readonly<
  Record<
    'all' | 'any' | 'none',
    { readonly label: LocalizedString; readonly describe: LocalizedString }
  >
> = {
  all: {
    label: { en: 'All', gl: 'Todas' },
    describe: {
      en: 'ALL conditions must be met (AND).',
      gl: 'Cúmprense TODAS as condicións (E).',
    },
  },
  any: {
    label: { en: 'Any', gl: 'Algunha' },
    describe: {
      en: 'ANY condition (OR).',
      gl: 'Cúmprese ALGUNHA (OU).',
    },
  },
  none: {
    label: { en: 'None', gl: 'Ningunha' },
    describe: {
      en: 'NO condition must be met (blocks if any is true).',
      gl: 'NON se cumpre ningunha (bloquea se algunha é certa).',
    },
  },
}

// ── UnlockCondition types (as 14) ──
export const CONDITION_TYPE_LABELS: Readonly<
  Record<(typeof SUPPORTED_CONDITION_TYPES)[number], ConditionLabelEntry>
> = {
  node_unlocked: {
    label: { en: 'Node unlocked', gl: 'Nodo desbloqueado' },
    describe: {
      en: 'Requires another node to be unlocked.',
      gl: 'Require que outro nodo estea desbloqueado.',
    },
    params: [{ key: 'nodeId', kind: 'nodeId', label: { en: 'Node', gl: 'Nodo' } }],
  },
  node_maxed: {
    label: { en: 'Node maxed', gl: 'Nodo ao máximo' },
    describe: {
      en: 'Requires another node to be at its max rank.',
      gl: 'Require que outro nodo estea no seu rango máximo.',
    },
    params: [{ key: 'nodeId', kind: 'nodeId', label: { en: 'Node', gl: 'Nodo' } }],
  },
  node_state: {
    label: { en: 'Node state', gl: 'Estado dun nodo' },
    describe: {
      en: 'Requires a node to be in a specific state.',
      gl: 'Require que un nodo estea nun estado concreto.',
    },
    params: [
      { key: 'nodeId', kind: 'nodeId', label: { en: 'Node', gl: 'Nodo' } },
      { key: 'state', kind: 'nodeState', label: { en: 'State', gl: 'Estado' } },
    ],
  },
  nodes_count: {
    label: { en: 'Node count', gl: 'Número de nodos' },
    describe: {
      en: 'Requires having N unlocked nodes.',
      gl: 'Require ter N nodos desbloqueados.',
    },
    params: [
      { key: 'count', kind: 'number', label: { en: 'Count', gl: 'Número' } },
      { key: 'scope', kind: 'scope', label: { en: 'Scope', gl: 'Ámbito' }, optional: true },
    ],
  },
  resource_min: {
    label: { en: 'Minimum resource', gl: 'Recurso mínimo' },
    describe: {
      en: 'Requires at least X of a resource (e.g., 100 XP).',
      gl: 'Require ter polo menos X dun recurso (ex.: 100 de XP).',
    },
    params: [
      { key: 'resourceId', kind: 'resourceId', label: { en: 'Resource', gl: 'Recurso' } },
      { key: 'amount', kind: 'number', label: { en: 'Amount', gl: 'Cantidade' } },
    ],
  },
  tier_min: {
    label: { en: 'Minimum rank', gl: 'Rango mínimo' },
    describe: {
      en: 'Requires a node to reach a certain rank.',
      gl: 'Require que un nodo alcance certo rango.',
    },
    params: [
      { key: 'nodeId', kind: 'nodeId', label: { en: 'Node', gl: 'Nodo' } },
      { key: 'tier', kind: 'number', label: { en: 'Rank', gl: 'Rango' } },
    ],
  },
  distance_max: {
    label: { en: 'Maximum distance', gl: 'Distancia máxima' },
    describe: {
      en: 'Requires being at N steps or fewer from another node.',
      gl: 'Require estar a N pasos ou menos doutro nodo.',
    },
    params: [
      { key: 'fromNodeId', kind: 'nodeId', label: { en: 'From node', gl: 'Desde o nodo' } },
      { key: 'maxSteps', kind: 'number', label: { en: 'Max steps', gl: 'Pasos máximos' } },
    ],
  },
  tag_count: {
    label: { en: 'Count by tag', gl: 'Número por etiqueta' },
    describe: {
      en: 'Requires N nodes with a tag.',
      gl: 'Require N nodos cunha etiqueta.',
    },
    params: [
      { key: 'tag', kind: 'tag', label: { en: 'Tag', gl: 'Etiqueta' } },
      { key: 'count', kind: 'number', label: { en: 'Count', gl: 'Número' } },
    ],
  },
  progress_min: {
    label: { en: 'Minimum progress', gl: 'Progreso mínimo' },
    describe: {
      en: 'Requires a node to reach X% progress.',
      gl: 'Require que un nodo alcance X% de progreso.',
    },
    params: [
      { key: 'nodeId', kind: 'nodeId', label: { en: 'Node', gl: 'Nodo' } },
      { key: 'percent', kind: 'percent', label: { en: 'Percent', gl: 'Porcentaxe' } },
    ],
  },
  subtree_completion: {
    label: { en: 'Subtree completion', gl: 'Subárbore completa' },
    describe: {
      en: 'Requires a subtree to be X% complete.',
      gl: 'Require unha subárbore X% completa.',
    },
    params: [
      { key: 'subtreeId', kind: 'subtreeId', label: { en: 'Subtree', gl: 'Subárbore' } },
      { key: 'percent', kind: 'percent', label: { en: 'Percent', gl: 'Porcentaxe' } },
    ],
  },
  stat_min: {
    label: { en: 'Minimum stat', gl: 'Estatística mínima' },
    describe: {
      en: 'Requires a stat to reach X.',
      gl: 'Require que unha estatística alcance X.',
    },
    params: [
      { key: 'statId', kind: 'statId', label: { en: 'Stat', gl: 'Estatística' } },
      { key: 'amount', kind: 'number', label: { en: 'Amount', gl: 'Cantidade' } },
    ],
  },
  time_after: {
    label: { en: 'After', gl: 'Despois de' },
    describe: {
      en: 'Only starting from a date/time.',
      gl: 'Só a partir dunha data/hora.',
    },
    params: [{ key: 'timestamp', kind: 'timestamp', label: { en: 'When', gl: 'Cando' } }],
  },
  time_before: {
    label: { en: 'Before', gl: 'Antes de' },
    describe: {
      en: 'Only until a date/time.',
      gl: 'Só ata unha data/hora.',
    },
    params: [{ key: 'timestamp', kind: 'timestamp', label: { en: 'When', gl: 'Cando' } }],
  },
  custom: {
    label: { en: 'Custom rule', gl: 'Regra personalizada' },
    describe: {
      en: 'Custom (advanced; requires code).',
      gl: 'A medida (avanzado; require código).',
    },
    params: [{ key: 'evaluator', kind: 'code', label: { en: 'Evaluator', gl: 'Avaliador' } }],
  },
}

// ── NodeState localizado (para o kind:'nodeState') ──
export const NODE_STATE_LABELS: Readonly<
  Record<
    'locked' | 'unlockable' | 'in_progress' | 'unlocked' | 'maxed' | 'disabled' | 'expired',
    { readonly label: LocalizedString }
  >
> = {
  locked: { label: { en: 'Locked', gl: 'Bloqueado' } },
  unlockable: { label: { en: 'Unlockable', gl: 'Desbloqueable' } },
  in_progress: { label: { en: 'In progress', gl: 'En progreso' } },
  unlocked: { label: { en: 'Unlocked', gl: 'Desbloqueado' } },
  maxed: { label: { en: 'Maxed', gl: 'Ao máximo' } },
  disabled: { label: { en: 'Disabled', gl: 'Desactivado' } },
  expired: { label: { en: 'Expired', gl: 'Expirado' } },
}

// ── Getters ──
function pick(loc: LocalizedString | undefined, prefer: 'gl' | 'en' = 'gl'): string | undefined {
  if (loc === undefined) return undefined
  if (typeof loc === 'string') return loc
  return loc[prefer] ?? loc.en ?? Object.values(loc)[0]
}

export function getConditionTypeLabel(type: string, locale: 'gl' | 'en' = 'gl'): string {
  const entry = (CONDITION_TYPE_LABELS as Record<string, ConditionLabelEntry | undefined>)[type]
  return pick(entry?.label, locale) ?? type
}

export function getConditionTypeDescribe(
  type: string,
  locale: 'gl' | 'en' = 'gl',
): string | undefined {
  const entry = (CONDITION_TYPE_LABELS as Record<string, ConditionLabelEntry | undefined>)[type]
  return pick(entry?.describe, locale)
}

export function getConditionParams(type: string): readonly ConditionParamSpec[] {
  const entry = (CONDITION_TYPE_LABELS as Record<string, ConditionLabelEntry | undefined>)[type]
  return entry?.params ?? []
}

export function getCombinatorLabel(
  combinator: 'all' | 'any' | 'none',
  locale: 'gl' | 'en' = 'gl',
): string {
  return pick(RULE_COMBINATOR_LABELS[combinator].label, locale) ?? combinator
}

export function getCombinatorDescribe(
  combinator: 'all' | 'any' | 'none',
  locale: 'gl' | 'en' = 'gl',
): string | undefined {
  return pick(RULE_COMBINATOR_LABELS[combinator].describe, locale)
}

export function getNodeStateLabel(state: string, locale: 'gl' | 'en' = 'gl'): string {
  const entry = (NODE_STATE_LABELS as Record<string, { label: LocalizedString } | undefined>)[state]
  return pick(entry?.label, locale) ?? state
}
// ── FIN: conditionLabels ──
