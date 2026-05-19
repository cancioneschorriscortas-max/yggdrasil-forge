// ── INICIO: Selector types ──
// Tipo dun selector: función pura que deriva un valor do TreeState.

import type { TreeState } from './tree.js'

/**
 * Selector: función pura que recibe o estado completo da árbore e
 * devolve unha porción derivada del.
 *
 * Úsase con `TreeEngine.select`, `TreeEngine.subscribeWithSelector` e
 * coa factoría `createSelector` para memoizar derivacións custosas.
 *
 * @example
 * const selectBudget: Selector<Budget> = (state) => state.budget
 */
export type Selector<T> = (state: TreeState) => T
// ── FIN: Selector types ──
