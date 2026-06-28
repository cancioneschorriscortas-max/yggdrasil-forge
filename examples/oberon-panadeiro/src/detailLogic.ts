// ── INICIO: detailLogic (lóxica pura do DetailPanel) ──
//
// Función pura que deriva o estado de cada fila de NIVEL a partir do
// `currentTier` actual e o `maxTier` do nodo. Vive nun ficheiro separado
// (sen React) para que a sonda probe o código REAL que renderiza o
// panel, sen mock. Mesmo patrón que `deriveEdges.ts` en v5.
//
// Regra (§2 do briefing F12):
//   - r <= ct                              → 'completado'
//   - r === ct + 1 e ct < maxTier          → 'actual'
//   - r > ct + 1                           → 'bloqueado'
//   - ct === maxTier → todas 'completado' (cubría a primeira regra)

export type TierState = 'completado' | 'actual' | 'bloqueado'

export interface TierRow {
  readonly tier: number
  readonly state: TierState
}

/**
 * Deriva o estado de cada fila (1..maxTier) en base a `currentTier`.
 * Esta convención coincide coa Imaxe 1 do mock: ct=1 → fila 1 completado,
 * fila 2 actual, fila 3 bloqueado.
 */
export function tierRowsFor(currentTier: number, maxTier: number): TierRow[] {
  const rows: TierRow[] = []
  for (let r = 1; r <= maxTier; r++) {
    let state: TierState
    if (r <= currentTier) state = 'completado'
    else if (r === currentTier + 1 && currentTier < maxTier) state = 'actual'
    else state = 'bloqueado'
    rows.push({ tier: r, state })
  }
  return rows
}

/**
 * Texto do badge de cabeceira segundo a regra:
 *   - ct < maxTier  → 'NIVEL {ct+1} DE {maxTier}'
 *   - ct === maxTier → 'NIVEL {maxTier} DE {maxTier} · MÁXIMO'
 */
export function badgeText(currentTier: number, maxTier: number): string {
  if (currentTier >= maxTier) return `NIVEL ${maxTier} DE ${maxTier} · MÁXIMO`
  return `NIVEL ${currentTier + 1} DE ${maxTier}`
}
// ── FIN: detailLogic ──
