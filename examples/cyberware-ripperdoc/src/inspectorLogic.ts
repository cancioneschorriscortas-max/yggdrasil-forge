// ── INICIO: inspectorLogic (puro, testable) ──
// Helpers de presentación do CyberInspector. Cero React; cero engine;
// só transformacións sobre NodeDef. A sonda importa de aquí.

import type { NodeDef } from '@yggdrasil-forge/core'

export interface InstallCost {
  readonly eurodollars: number
  readonly components: number
  readonly capacity: number
}

/**
 * Custo do PRÓXIMO tier a instalar. Para multi-tier (`costPerTier`),
 * indexamos por `currentTier` (0 → custo de Mk.I, 1 → custo de Mk.II,
 * ...). Para nodos single-tier ou sen `costPerTier`, fallback a `cost`.
 *
 * Devolve sempre os 3 recursos do showcase (eurodollars, components,
 * capacity) sumando o que apareza no array de custos. Os non
 * declarados quedan en 0.
 */
export function nextTierCost(node: NodeDef, currentTier: number): InstallCost {
  const tierArr = node.costPerTier?.[currentTier]
  const costEntries = tierArr ?? node.cost ?? []
  let eurodollars = 0
  let components = 0
  let capacity = 0
  for (const entry of costEntries) {
    if (entry.resourceId === 'eurodollars') eurodollars += entry.amount
    else if (entry.resourceId === 'components') components += entry.amount
    else if (entry.resourceId === 'capacity') capacity += entry.amount
  }
  return { eurodollars, components, capacity }
}

/**
 * Etiqueta da categoría a partir de `node.group`. Mapa interno
 * legible — uppercased estilo HUD ('NEURALWARE', 'OPERATING SYSTEM',
 * ...). Fallback a unha versión legibilizada do groupId.
 */
const GROUP_LABEL: Record<string, string> = {
  frontal_cortex: 'NEURALWARE',
  ocular_system: 'OPERATING SYSTEM',
  nervous_system: 'NERVOUS SYSTEM',
  circulatory_system: 'CIRCULATORY',
  integumentary_system: 'INTEGUMENTARY',
  skeletal_system: 'SKELETAL',
  muscular_system: 'MUSCULAR',
}
export function categoryLabel(node: NodeDef): string {
  const g = node.group
  if (g === undefined) return 'CYBERWARE'
  return GROUP_LABEL[g] ?? g.replace(/_/g, ' ').toUpperCase()
}

/**
 * Etiqueta Mk. do nodo:
 *   - `MK.I`/`MK.II`/`MK.III`... segundo o tier que se vaia instalar (currentTier+1).
 *   - `MAX` se xa está no máximo.
 *   - Single-tier (`maxTier=1`): non amosa Mk; chamadores poden ocultalo.
 */
export function mkLabel(currentTier: number, maxTier: number): string {
  if (maxTier <= 0) return ''
  if (currentTier >= maxTier) return 'MAX'
  const next = currentTier + 1
  if (next === 1 && maxTier === 1) return '' // sen Mk
  // Romanos para 1..5; máis aló, Mk.N
  const roman = ['I', 'II', 'III', 'IV', 'V']
  return `MK.${roman[next - 1] ?? String(next)}`
}
// ── FIN: inspectorLogic ──
