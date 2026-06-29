// ── INICIO: supportManifest ──
// Contrato MACHINE-READABLE do que o motor REALMENTE implementa.
//
// **Non confundir con tipos**: a unión `Effect['type']` declara 10
// tipos, pero o runtime só APLICA 8 (modify_stat e plugin devolven
// EFFECT_TYPE_UNSUPPORTED). O manifesto reflicte o runtime, non a
// unión.
//
// **Fonte ÚNICA anti-drift**: os arrays `SUPPORTED_*` e
// `UNSUPPORTED_*` son consumidos por:
//   1. O propio runtime (EffectsRunner usa UNSUPPORTED_EFFECT_TYPES
//      para rexeitar; xa non hai función `isUnsupportedType` con
//      strings hardcoded).
//   2. O manifesto (derivado deles).
//   3. O gate de drift (compara consts contra a unión de tipos
//      como type-test exhaustivo).
//
// Se alguén engade un effect kind ao schema sin clasificalo nun dos
// dous conxuntos, o type-test do gate falla en compilación.

import type { Effect } from '../types/effects.js'
import type { UnlockCondition } from '../types/unlock.js'

/**
 * Effects que o runtime aplica realmente. Mantén orde insertion para
 * estabilidade do manifesto.
 */
export const SUPPORTED_EFFECT_TYPES = [
  'modify_resource',
  'modify_node_state',
  'set_node_visibility',
  'unlock_node',
  'set_progress',
  'trigger_event',
  'conditional',
  'composite',
] as const

/**
 * Effects declarados na unión pero NON aplicados polo runtime.
 * Devolven `EFFECT_TYPE_UNSUPPORTED`. NON aparecen no manifesto.
 */
export const UNSUPPORTED_EFFECT_TYPES = ['modify_stat', 'plugin'] as const

/**
 * Conditions avaliadas polo UnlockResolver. Toda a unión actualmente
 * está implementada (cero "declaradas pero non avaliadas").
 */
export const SUPPORTED_CONDITION_TYPES = [
  'node_unlocked',
  'node_maxed',
  'node_state',
  'nodes_count',
  'resource_min',
  'tier_min',
  'distance_max',
  'tag_count',
  'progress_min',
  'subtree_completion',
  'stat_min',
  'time_after',
  'time_before',
  'custom',
] as const

export type SupportedEffectType = (typeof SUPPORTED_EFFECT_TYPES)[number]
export type UnsupportedEffectType = (typeof UNSUPPORTED_EFFECT_TYPES)[number]
export type SupportedConditionType = (typeof SUPPORTED_CONDITION_TYPES)[number]

// ── Gate de exhaustividade (compile-time) ──────────────────────────
// Se alguén engade un kind á unión Effect sen tocar SUPPORTED_*/
// UNSUPPORTED_*, a asignación de abaixo falla en compilación. Igual
// para conditions.

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false

// Type-test exhaustividade Effect:
//   SUPPORTED_EFFECT_TYPES ∪ UNSUPPORTED_EFFECT_TYPES === Effect['type']
type _EffectExhaustive = Equals<Effect['type'], SupportedEffectType | UnsupportedEffectType>
// Se o tipo de arriba non é `true`, a asignación falla en compilación:
const _effectExhaustivenessCheck: _EffectExhaustive = true
void _effectExhaustivenessCheck

// Type-test exhaustividade UnlockCondition:
type _ConditionExhaustive = Equals<UnlockCondition['type'], SupportedConditionType>
const _conditionExhaustivenessCheck: _ConditionExhaustive = true
void _conditionExhaustivenessCheck

// ── Datos do manifesto ─────────────────────────────────────────────

export interface SupportEntry {
  /** Implementación estable (non vai mudar). */
  readonly stable: boolean
  /** Versión do motor na que apareceu (semver). Opcional. */
  readonly since?: string
  /** Marca de feature en proba (raro en `stable: true`). */
  readonly experimental?: boolean
}

export interface SupportManifest {
  readonly coreVersion: string
  readonly effects: Readonly<Record<string, SupportEntry>>
  readonly conditions: Readonly<Record<string, SupportEntry>>
  // Extensible (futuro): readonly layouts, shapes, importers, ...
}

/**
 * Versión do motor reflectida no manifesto. **NOTA**: idealmente esta
 * cadea derívase de `package.json` ou dunha única fonte; actualmente
 * está literal (o VERSION do barrel raíz tampouco está sincronizado).
 * Apuntar para sesión de mantemento.
 */
const CORE_VERSION_FOR_MANIFEST = '0.4.0'

const stable: SupportEntry = { stable: true }

function buildRecord(types: readonly string[]): Readonly<Record<string, SupportEntry>> {
  const obj: Record<string, SupportEntry> = {}
  for (const t of types) obj[t] = stable
  return obj
}

/**
 * O manifesto oficial. Importable do barrel raíz de @core. Consumido
 * polo `unsupportedFeatureValidator` de @editor-core (entre outros).
 */
export const supportManifest: SupportManifest = {
  coreVersion: CORE_VERSION_FOR_MANIFEST,
  effects: buildRecord(SUPPORTED_EFFECT_TYPES),
  conditions: buildRecord(SUPPORTED_CONDITION_TYPES),
}

/** Alias funcional (algúns consumidores prefiren factory). */
export function describeSupport(): SupportManifest {
  return supportManifest
}

/** Predicate: ¿este effect type aplicaríano o runtime? */
export function isEffectSupported(type: string): boolean {
  return (SUPPORTED_EFFECT_TYPES as readonly string[]).includes(type)
}

/** Predicate: ¿este effect type está declarado pero non aplicado? */
export function isEffectUnsupported(type: string): boolean {
  return (UNSUPPORTED_EFFECT_TYPES as readonly string[]).includes(type)
}

/** Predicate: ¿esta condition avaliase polo resolver? */
export function isConditionSupported(type: string): boolean {
  return (SUPPORTED_CONDITION_TYPES as readonly string[]).includes(type)
}
// ── FIN: supportManifest ──
