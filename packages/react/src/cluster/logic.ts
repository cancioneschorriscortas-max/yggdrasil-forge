// ── INICIO: cluster/logic (lóxica pura do ClusterCardsView) ──
// Promovido desde examples/oberon-panadeiro/src/cardLogic.ts.
// Cero React: usable desde tests + consumers custom.

export type RowState = 'done' | 'actual' | 'locked'

/**
 * Estado resumido dunha fila a partir do tier actual/máximo.
 *
 *   - `done`: o nodo está no máximo (`currentTier >= maxTier > 0`).
 *   - `actual`: hai progreso (`currentTier > 0`) pero non máximo.
 *   - `locked`: ningún progreso (`currentTier === 0`).
 *
 * `maxTier === 0` (raro) trátase como `locked` se ct=0 ou `actual` se
 * ct>0; nunca como `done` (evita falsos positivos no caso degenerado).
 */
export function rowState(currentTier: number, maxTier: number): RowState {
  if (maxTier > 0 && currentTier >= maxTier) return 'done'
  if (currentTier > 0) return 'actual'
  return 'locked'
}

/**
 * Texto compacto do badge da fila:
 *   - `✓` se `done` (no máximo).
 *   - `ct/mt` en caso contrario.
 */
export function rowBadge(currentTier: number, maxTier: number): string {
  return currentTier >= maxTier && maxTier > 0 ? '✓' : `${currentTier}/${maxTier}`
}
// ── FIN: cluster/logic ──
