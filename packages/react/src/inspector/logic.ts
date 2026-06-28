// ── INICIO: inspector/logic (lóxica pura do NodeInspector) ──
// Promovido desde examples/oberon-panadeiro/src/detailLogic.ts.
// Cero React: usable desde tests + consumers que constrúan o seu propio
// inspector custom sobre estas regras.

export type TierState = 'completado' | 'actual' | 'bloqueado'

export interface TierRow {
  readonly tier: number
  readonly state: TierState
}

/**
 * Deriva o estado de cada fila (1..maxTier) en base a `currentTier`.
 *
 * Regra:
 *   - r <= currentTier                              → 'completado'
 *   - r === currentTier + 1 e currentTier < maxTier → 'actual'
 *   - r > currentTier + 1                           → 'bloqueado'
 *   - currentTier === maxTier → todas 'completado'
 *
 * Os identificadores en galego (`completado`/`actual`/`bloqueado`) son
 * tokens internos de estado, NON texto user-facing. O `NodeInspector`
 * mapeaos a strings localizables vía a prop `strings`.
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
 * Devolve a clave do badge de cabeceira segundo o tier:
 *   - currentTier < maxTier   → 'progress'  ("NIVEL X DE Y")
 *   - currentTier === maxTier → 'maxed'     ("NIVEL X DE Y · MÁXIMO")
 *
 * Devolver a clave (e non a string) permite ao NodeInspector compoñer
 * o texto coa locale activa.
 */
export function badgeKind(currentTier: number, maxTier: number): 'progress' | 'maxed' {
  return currentTier >= maxTier ? 'maxed' : 'progress'
}

/**
 * Compatibilidade: texto fixo do badge (galego) usado polo exemplo.
 * Mantido como helper para tests do consumidor; non se usa internamente
 * no NodeInspector (que compón co `strings`).
 */
export function badgeText(currentTier: number, maxTier: number): string {
  if (currentTier >= maxTier) return `NIVEL ${maxTier} DE ${maxTier} · MÁXIMO`
  return `NIVEL ${currentTier + 1} DE ${maxTier}`
}
// ── FIN: inspector/logic ──
