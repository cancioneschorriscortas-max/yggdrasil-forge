// ── INICIO: TreeEngine ──
// Fachada pública do motor. Envuelve StateStore e ResourceManager
// e expón a API de lectura síncrona da sub-fase 1.12.
// As mutacións (unlock/lock/respec/applyChanges) son 1.13+.

import { ErrorCode, type Locale, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Budget, NodeInstance, TreeDef, TreeEngineOptions, TreeState } from '../types/index.js'
import { StateStore } from './StateStore.js'

export class TreeEngine {
  private readonly store: StateStore
  private readonly locale: Locale
  private readonly readOnly: boolean

  constructor(treeDef: TreeDef, options?: TreeEngineOptions) {
    this.locale = options?.locale ?? 'gl'
    this.readOnly = options?.readOnly ?? false
    TreeEngine.validateTreeDef(treeDef, this.locale)
    this.store = new StateStore(treeDef)
  }

  // ── Validación mínima do TreeDef (T3.b) ──
  // Non valida prerequisites/ciclos/edges en profundidade (iso é 1.17).
  private static validateTreeDef(treeDef: TreeDef, locale: Locale): void {
    if (treeDef === null || typeof treeDef !== 'object' || Array.isArray(treeDef)) {
      throw new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: 'treeDef debe ser un obxecto plano',
        }),
      )
    }
    if (typeof treeDef.id !== 'string' || treeDef.id.trim() === '') {
      throw new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: 'falta o campo id ou está baleiro',
        }),
      )
    }
    if (!Array.isArray(treeDef.nodes)) {
      throw new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
          details: 'nodes debe ser un array',
        }),
      )
    }
    const seen = new Set<string>()
    for (const node of treeDef.nodes) {
      if (seen.has(node.id)) {
        throw new YggdrasilError(
          ErrorCode.INVALID_TREE_DEF,
          getErrorMessage(ErrorCode.INVALID_TREE_DEF, locale, {
            details: `id de nodo duplicado: "${node.id}"`,
          }),
        )
      }
      seen.add(node.id)
    }
  }

  // ── Getters síncronos (T3.c) ──

  getNodeState(nodeId: string): NodeInstance | null {
    const state = this.store.getState()
    return state.nodes[nodeId] ?? null
  }

  getAllNodeStates(): ReadonlyMap<string, NodeInstance> {
    const state = this.store.getState()
    return new Map(Object.entries(state.nodes))
  }

  getBudget(): Readonly<Budget> {
    return this.store.getState().budget
  }

  getProgress(nodeId: string): number {
    const node = this.getNodeState(nodeId)
    if (node === null) {
      return 0
    }
    return node.progress ?? 0
  }

  getTreeDef(): Readonly<TreeDef> {
    return this.store.getTreeDef()
  }

  getLocale(): Locale {
    return this.locale
  }

  isReadOnly(): boolean {
    return this.readOnly
  }

  getSnapshot(): TreeState {
    return this.store.getSnapshot()
  }

  getServerSnapshot(): TreeState {
    return this.store.getServerSnapshot()
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener)
  }
}
// ── FIN: TreeEngine ──
