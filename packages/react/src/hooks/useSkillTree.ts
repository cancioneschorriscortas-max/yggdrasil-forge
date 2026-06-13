'use client'

import type { TreeEngine, TreeState } from '@yggdrasil-forge/core'
// ── INICIO: useSkillTree hook ──
import { useSyncExternalStore } from 'react'

/**
 * Hook que subscribe ao `TreeEngine` e devolve o snapshot completo
 * (`TreeState`). Re-render automático cando o engine muda.
 *
 * Usa `useSyncExternalStore` nativo de React 18+ internamente.
 * SSR-safe: `getServerSnapshot` é a mesma función que `getSnapshot`
 * (o consumidor é responsable de pasar un engine inicializado con
 * estado consistente en server e client).
 *
 * @example
 * ```tsx
 * function MyView({ engine }: { engine: TreeEngine }) {
 *   const state = useSkillTree(engine)
 *   return <div>Total nodes: {Object.keys(state.nodes).length}</div>
 * }
 * ```
 */
export function useSkillTree(engine: TreeEngine): TreeState {
  return useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getSnapshot.bind(engine),
  )
}
// ── FIN: useSkillTree hook ──
