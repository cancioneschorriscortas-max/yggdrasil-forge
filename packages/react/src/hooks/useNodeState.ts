'use client'

import type { NodeInstance, TreeEngine } from '@yggdrasil-forge/core'
// ── INICIO: useNodeState hook ──
import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook que subscribe ao `TreeEngine` e devolve a entrada
 * `state.nodes[nodeId]` actual ou `null` se non existe.
 *
 * **Garantía de estabilidade**: cando o NodeInstance subxacente non
 * muda (Immer + struct sharing), o objeto devolto é referencialmente
 * igual ao do render anterior (cero re-render innecesario).
 *
 * @example
 * ```tsx
 * function NodeView({ engine, nodeId }: Props) {
 *   const instance = useNodeState(engine, nodeId)
 *   if (instance === null) return <span>(missing)</span>
 *   return <span>{instance.state}</span>
 * }
 * ```
 */
export function useNodeState(engine: TreeEngine, nodeId: string): NodeInstance | null {
  const getSnapshot = useCallback((): NodeInstance | null => {
    const state = engine.getSnapshot()
    return state.nodes[nodeId] ?? null
  }, [engine, nodeId])

  return useSyncExternalStore(engine.subscribe.bind(engine), getSnapshot, getSnapshot)
}
// ── FIN: useNodeState hook ──
