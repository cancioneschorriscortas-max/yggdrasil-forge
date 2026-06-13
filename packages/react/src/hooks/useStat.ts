'use client'

import type { TreeEngine } from '@yggdrasil-forge/core'
// ── INICIO: useStat hook ──
import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook que subscribe ao `TreeEngine` e devolve o valor actual de
 * `engine.getStat(statId)`. Re-render automático cando o engine
 * muda. Para árbores sen ese `statId` declarado, `getStat` devolve
 * 0 (comportamento de core; cero throw).
 *
 * **Nota sobre overhead**: `engine.getStat()` re-computa o stat en
 * cada chamada (cero cache no core actual). Para stats caros con
 * alta frecuencia de re-render, considera memoizar externamente.
 *
 * @example
 * ```tsx
 * function ArmorView({ engine }: Props) {
 *   const armor = useStat(engine, 'totalArmor')
 *   return <span>Armor: {armor}</span>
 * }
 * ```
 */
export function useStat(engine: TreeEngine, statId: string): number {
  const getSnapshot = useCallback((): number => engine.getStat(statId), [engine, statId])

  return useSyncExternalStore(engine.subscribe.bind(engine), getSnapshot, getSnapshot)
}
// ── FIN: useStat hook ──
