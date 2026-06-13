'use client'

import type { NodeInstance, TreeEngine } from '@yggdrasil-forge/core'
// ── INICIO: useNodeSelector hook ──
import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook xeneralizado que subscribe ao `TreeEngine` e devolve o
 * resultado de aplicar `selector` ao `NodeInstance | null` para
 * `nodeId`. Útil para re-renders selectivos (so re-render se o
 * valor seleccionado muda, non se calquera campo do NodeInstance
 * muda).
 *
 * **IMPORTANTE — Estabilidade do selector**: o `selector` debe ser
 * referencialmente estable entre renders. **Se pasas unha función
 * inline**, useSyncExternalStore re-subscribe en cada render, o que
 * pode causar comportamento inesperado.
 *
 * **Patrón recomendado**:
 * ```tsx
 * // Correcto — selector estable via useCallback
 * const selectState = useCallback((n) => n?.state ?? 'locked', [])
 * const state = useNodeSelector(engine, 'mageArmor', selectState)
 *
 * // Correcto — selector definido fora do compoñente
 * const selectTier = (n: NodeInstance | null) => n?.currentTier ?? 0
 * function MyView() {
 *   const tier = useNodeSelector(engine, 'mageArmor', selectTier)
 * }
 * ```
 *
 * **Cero igualdade customizada en 7.5**: o resultado de `selector`
 * compárase con `Object.is`. Para igualdade customizada o consumidor
 * debe usar selectors que devolvan primitivos ou estruturas
 * referencialmente estables.
 */
export function useNodeSelector<T>(
  engine: TreeEngine,
  nodeId: string,
  selector: (instance: NodeInstance | null) => T,
): T {
  const getSnapshot = useCallback((): T => {
    const state = engine.getSnapshot()
    return selector(state.nodes[nodeId] ?? null)
  }, [engine, nodeId, selector])

  return useSyncExternalStore(engine.subscribe.bind(engine), getSnapshot, getSnapshot)
}
// ── FIN: useNodeSelector hook ──
