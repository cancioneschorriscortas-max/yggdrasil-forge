// ── INICIO: costPerTierHelpers ──
// Helpers headless para o editor de `NodeDef.costPerTier` (7.5f §1).
//
// **Deseño (adendo do Arquitecto)**: array DENSO de lonxitude N,
// onde N = `maxTier ?? current.length ?? 1`. Fila baleira `[]` =
// "gratis neste rango". "Volver á base global" **só se expresa a
// nivel de campo** (dispatch `undefined`) — non por rango.
//
// **Motivación**: aínda que o runtime ResourceManager distingue
// `perTier[i] === undefined` (fallback a `cost` global) vs `[]`
// (gratis), o schema Zod é denso-only, JSON non representa sparse
// (`[…, , …]` → `[…, null, …]`) e o schema rexeita null. Un editor
// que autora estados sparse fabrica corrupción no gardado. O
// subconxunto autorable = o persistible.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { Cost } from '@yggdrasil-forge/core'

/** Unha fila do editor: rango + lista de custos. */
export interface CostPerTierRow {
  /** Rango 1-based que corresponde a esta fila. */
  readonly tier: number
  /**
   * Lista de custos para o rango. **Sempre unha lista real** (nunca
   * `undefined`) — o array denso do editor non ten buracos.
   * Un array baleiro `[]` significa "gratis neste rango".
   */
  readonly costs: readonly Cost[]
}

/**
 * Deriva N filas densas (rango 1..N) para o editor.
 *
 * `N = max(1, maxTier ?? current.length ?? 1)`. Filas que non
 * estean en `current` amósanse como `[]` (gratis).
 *
 * Non depende de React; consumible desde tests headless.
 */
export function costPerTierRowsFor(
  maxTier: number | undefined,
  current: readonly (readonly Cost[])[] | undefined,
): readonly CostPerTierRow[] {
  const currentLen = current?.length ?? 0
  const n = Math.max(1, maxTier ?? currentLen ?? 1)
  const rows: CostPerTierRow[] = []
  for (let t = 1; t <= n; t++) {
    const entry = current?.[t - 1]
    rows.push({ tier: t, costs: entry ?? [] })
  }
  return rows
}

/**
 * Constrúe o valor DENSO a gardar en `NodeDef.costPerTier` a partir
 * dun array de listas (unha por rango).
 *
 * - Trunca/estende sempre a `N = max(1, maxTier ?? rows.length ?? 1)`.
 * - Filas fóra do `rows` inicial complétanse con `[]`.
 * - **Nunca devolve sparse nin `null`** — array denso puro.
 *
 * O caller decide se dispatchar isto ou `undefined` (borrar campo).
 * Non hai "usa base" por rango — só o botón global «Quitar».
 */
export function packCostPerTier(
  maxTier: number | undefined,
  rows: readonly (readonly Cost[])[],
): readonly (readonly Cost[])[] {
  const n = Math.max(1, maxTier ?? rows.length ?? 1)
  const out: (readonly Cost[])[] = new Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = rows[i] ?? []
  }
  return out
}

// ── Strings localizadas (para o widget) ──
export const COST_PER_TIER_STRINGS = {
  header: {
    en: 'Cost per rank',
    gl: 'Custo por rango',
  } as LocalizedString,
  headerHelp: {
    en: 'Cost for each rank. An empty rank is free. If you leave this field unset, all ranks use the base Cost.',
    gl: 'Custo de cada rango. Un rango sen custos é gratis. Se non defines este campo, todos os rangos usan o Custo base.',
  } as LocalizedString,
  noCostThisTier: {
    en: 'No cost this rank (free)',
    gl: 'Sen custo neste rango (gratis)',
  } as LocalizedString,
  addResource: {
    en: 'Add resource',
    gl: 'Engadir recurso',
  } as LocalizedString,
  rankPrefix: {
    en: 'Rank',
    gl: 'Rango',
  } as LocalizedString,
  singleRankHint: {
    en: 'This node has only 1 rank. Raise "Ranks" to add more.',
    gl: 'Este nodo só ten 1 rango. Sube "Rangos" para engadir máis.',
  } as LocalizedString,
  clearField: {
    en: 'Clear field',
    gl: 'Quitar',
  } as LocalizedString,
  clearFieldHelp: {
    en: 'Removes the field. All ranks fall back to the base Cost.',
    gl: 'Elimina o campo. Todos os rangos volven ao Custo base.',
  } as LocalizedString,
} as const

/** Devolve `"Rango N"` / `"Rank N"` segundo locale. */
export function rankLabel(tier: number, locale: 'gl' | 'en' = 'gl'): string {
  const prefix = COST_PER_TIER_STRINGS.rankPrefix
  const p = typeof prefix === 'string' ? prefix : (prefix[locale] ?? prefix.en ?? 'Rank')
  return `${p} ${tier}`
}
// ── FIN: costPerTierHelpers ──
