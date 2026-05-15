// ── INICIO: StateStore ──
// Núcleo do estado mutable do motor. Xestiona TreeDef, TreeState,
// caches versionadas e subscripcións.

import { type Draft, produce } from 'immer'
import type { TreeDef, TreeState } from '../types/index.js'

export type CacheType = 'layout' | 'dependency' | 'search' | 'stats'

export const ALL_CACHE_TYPES: readonly CacheType[] = [
  'layout',
  'dependency',
  'search',
  'stats',
] as const

export type StateListener = () => void
export type Unsubscribe = () => void

export interface StateStoreOptions {
  readonly initialState?: TreeState
}

export class StateStore {
  private treeDef: TreeDef
  private treeState: TreeState
  private readonly listeners = new Set<StateListener>()
  private readonly cacheVersions: Record<CacheType, number> = {
    layout: 0,
    dependency: 0,
    search: 0,
    stats: 0,
  }
  private readonly cacheValues = new Map<
    CacheType,
    { readonly version: number; readonly value: unknown }
  >()

  constructor(treeDef: TreeDef, options?: StateStoreOptions) {
    this.treeDef = treeDef
    this.treeState = options?.initialState ?? this.createInitialState(treeDef)
  }

  getState(): TreeState {
    return this.treeState
  }

  getTreeDef(): TreeDef {
    return this.treeDef
  }

  update(producer: (draft: Draft<TreeState>) => void): void {
    const next = produce(this.treeState, producer)
    if (next === this.treeState) {
      return
    }
    this.treeState = next
    this.notify()
  }

  applyTreeDefChange(producer: (draft: Draft<TreeDef>) => void): void {
    const next = produce(this.treeDef, producer)
    if (next === this.treeDef) {
      return
    }
    this.treeDef = next
    this.invalidate(ALL_CACHE_TYPES)
    this.notify()
  }

  replaceTreeDef(newDef: TreeDef): void {
    this.treeDef = newDef
    this.invalidate(ALL_CACHE_TYPES)
    this.notify()
  }

  replaceTreeState(newState: TreeState): void {
    this.treeState = newState
    this.notify()
  }

  getCacheVersion(type: CacheType): number {
    return this.cacheVersions[type]
  }

  invalidate(types: readonly CacheType[]): void {
    for (const type of types) {
      this.cacheVersions[type]++
    }
  }

  setCache(type: CacheType, value: unknown, version: number): void {
    this.cacheValues.set(type, { version, value })
  }

  getCache(type: CacheType): unknown {
    const entry = this.cacheValues.get(type)
    if (entry === undefined) {
      return null
    }
    if (entry.version !== this.cacheVersions[type]) {
      return null
    }
    return entry.value
  }

  subscribe(listener: StateListener): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot(): TreeState {
    return this.treeState
  }

  getServerSnapshot(): TreeState {
    return this.treeState
  }

  listenerCount(): number {
    return this.listeners.size
  }

  private createInitialState(treeDef: TreeDef): TreeState {
    const initialResources = treeDef.startingBudget?.resources ?? {}
    return {
      nodes: {},
      budget: { resources: { ...initialResources } },
      computedStats: {},
      metadata: {},
    }
  }

  private notify(): void {
    const snapshot = Array.from(this.listeners)
    for (const listener of snapshot) {
      try {
        listener()
      } catch {
        // Os erros en subscriptores non rompen o ciclo de notificación.
      }
    }
  }
}
// ── FIN: StateStore ──
