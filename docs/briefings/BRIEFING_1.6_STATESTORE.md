# BRIEFING EXECUTABLE — Sub-fase 1.6
## Yggdrasil Forge: StateStore con Immer + cache versioning + subscriptions

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa
- `@yggdrasil-forge/common` con código real
- `@yggdrasil-forge/core` con tipos das 3 ondas + EventEmitter + ConcurrencyGuard + utils
- DT-1 resolto (deepClone simplificado)
- CI verde, 99+ tests pasan
- Documento mestre en `docs/architecture/MASTER.md`

**Esta sub-fase implementa o corazón do estado do motor.**

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.6**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Sección 5.1** (decisión: TreeDef mutable pero rastrexable)
- **Sección 7** completa (tipos: TreeDef, TreeState, NodeInstance, Budget)
- **Sección 8** completa (state management interno con Immer)
- **Sección 9** (subscription patterns — useSyncExternalStore)
- **Sección 1.3.2** (reglas de Biome)

---

## 3. OBXECTIVO DESTA SUB-FASE

Implementar a clase `StateStore` que xestiona:

1. **O estado mutable** (`treeDef` e `treeState`) usando Immer
2. **Sistema de cache versioning** integrado (4 tipos de cache: layout, dependency, search, stats)
3. **Sistema de subscripcións** para reactividade (compatible con `useSyncExternalStore` de React)

Esta clase é **autónoma**: non depende de TreeEngine, UnlockResolver, etc. Recibe TreeDef no constructor e TreeState inicial (ou crea un baleiro).

**NON** crear:
- `applyChanges` completo con validación de TreeChanges → 1.7 (ChangeTracker)
- Reconciliación de NodeInstances tras cambios → 1.7
- Caches específicas (LayoutCache, SearchIndex, etc.) → fases posteriores
- TreeEngine → 1.12+

---

## 4. DECISIÓNS XA TOMADAS

### 4.1 Immer

- **Immer xa está declarada como dependencia** en `core/package.json`
- Usar `produce` para updates ergonómicos (mutación aparente, inmutabilidade real)
- StateStore expón `update(producer)` que internamente chama a Immer

### 4.2 Cache versioning

- **4 tipos de cache:** `layout`, `dependency`, `search`, `stats`
- Cada cache ten un contador `cacheVersions[type]` que se incrementa cando algo a invalida
- StateStore expón:
  - `getCacheVersion(type)` — devolve a versión actual
  - `invalidate(types[])` — incrementa as versións especificadas
  - `setCache(type, value, version)` — garda valor cunha versión asociada
  - `getCache(type)` — devolve o valor SE a versión cachada coincide coa actual; null se está obsoleto
- **Tipo dos valores cacheados:** `unknown` por agora. Cuando se implementen as caches específicas (Layout en fase 4, Search en fase 12, etc.), reemprazaranse cos tipos reais.

### 4.3 Subscripcións

- Patrón clásico de Observer:
  - `subscribe(listener)` → devolve función de unsubscribe
  - `getSnapshot()` → devolve referencia ao estado actual (para `useSyncExternalStore`)
  - `getServerSnapshot()` → mesmo que getSnapshot (sen diferenza SSR por agora)
- **`notify()` é interno:** chámase automaticamente tras cada `update()` ou `applyTreeDefChange()`

### 4.4 TreeDef mutable

- StateStore recibe TreeDef no constructor e gárdao internamente
- `applyTreeDefChange(producer)` permite mutar a TreeDef vía Immer
- **Non valida nada aínda** — a validación de TreeChanges chega en 1.7
- Cada cambio na TreeDef invalida automaticamente as 4 caches (conservador, refinable despois)

### 4.5 Inicialización do TreeState

- Se non se pasa `initialState`, créase un baleiro con:
  - `nodes: {}` (sen NodeInstances)
  - `budget: { resources: {} }` (recursos cargados do TreeDef.startingBudget se existe, senón {})
  - `computedStats: {}`
  - `metadata: {}`
  - **Non** se crean NodeInstances para cada NodeDef automáticamente — iso é responsabilidade do TreeEngine.

### 4.6 Inmutabilidade externa

- `getState()` e `getTreeDef()` devolven **o obxecto interno** (que é immutable thanks to Immer).
- O caller pode lelo libremente; intentar mutalo lanza TypeError en strict mode (Immer freeze por defecto).
- **Decisión: `Immer.setAutoFreeze(true)`** (default, déixase como está).

### 4.7 Convencións

- Imports relativos con `.js`
- `import type` para tipos
- Cero `any`
- Cobertura 100% (todo é testable)

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: a8a9d20
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 Verificar que Immer está instalada

```bash
pnpm --filter @yggdrasil-forge/core list immer
```

Debería mostrar `[email protected]` ou similar. Se non, **detente e reporta** — está declarada en core/package.json desde sub-fase 0.4 pero pode non estar instalada efectivamente.

### 5.2 Crear packages/core/src/engine/StateStore.ts

```typescript
// ── INICIO: StateStore ──
// Núcleo do estado mutable do motor. Xestiona TreeDef, TreeState,
// caches versionadas e subscripcións.

import { type Draft, produce } from 'immer'
import type { TreeDef, TreeState } from '../types/index.js'

/**
 * Tipos de cache que o motor mantén versionadas.
 *
 * Cada tipo ten un contador de versión que se incrementa cando algo o invalida.
 * Os consumidores (LayoutEngine, SearchEngine, etc.) garden o seu resultado
 * cunha versión; comparan periodicamente con `getCacheVersion()` para saber
 * se a cache está stale.
 */
export type CacheType = 'layout' | 'dependency' | 'search' | 'stats'

/**
 * Lista das catro caches versionadas. Útil para iteración.
 */
export const ALL_CACHE_TYPES: readonly CacheType[] = [
  'layout',
  'dependency',
  'search',
  'stats',
] as const

/**
 * Función de subscrición que se chama tras cada cambio no estado.
 */
export type StateListener = () => void

/**
 * Función que cancela unha subscrición.
 */
export type Unsubscribe = () => void

/**
 * Opcións de configuración do StateStore.
 */
export interface StateStoreOptions {
  /** Estado inicial. Se non se pasa, créase un baleiro. */
  readonly initialState?: TreeState
}

/**
 * Núcleo do estado mutable do motor.
 *
 * Responsabilidades:
 * - Mantén `treeDef` e `treeState`, ambos mutables vía Immer
 * - Notifica subscriptores tras cada cambio
 * - Xestiona o sistema de cache versioning (4 tipos)
 * - Provee snapshots para useSyncExternalStore de React
 *
 * NON é responsabilidade del:
 * - Validar TreeChanges (iso é ChangeTracker, 1.7)
 * - Reconciliar NodeInstances tras cambios na TreeDef (iso é Reconciler, 1.7+)
 * - Computar layouts, busca, stats (eses son módulos externos que usan a cache)
 *
 * @example
 * const store = new StateStore(myTreeDef)
 * const unsub = store.subscribe(() => console.info('state changed'))
 *
 * store.update((draft) => {
 *   draft.budget.resources['xp'] = (draft.budget.resources['xp'] ?? 0) + 10
 * })
 *
 * console.info(store.getState().budget.resources['xp'])  // 10
 *
 * unsub()
 */
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

  // ───────────────────────────────────────────────
  // Estado
  // ───────────────────────────────────────────────

  /**
   * Devolve o TreeState actual.
   *
   * O valor é estructuralmente inmutable (frozen por Immer): pode lerse
   * libremente, pero intentar mutalo lanza TypeError en strict mode.
   */
  getState(): TreeState {
    return this.treeState
  }

  /**
   * Devolve o TreeDef actual. Inmutable.
   */
  getTreeDef(): TreeDef {
    return this.treeDef
  }

  /**
   * Actualiza o TreeState mediante un producer Immer.
   *
   * O producer recibe un draft mutable; calquera cambio nel reflíctese
   * nun novo TreeState inmutable.
   *
   * Notifica a todos os subscriptores tras o cambio.
   *
   * @example
   * store.update((draft) => {
   *   draft.nodes['forno'] = { id: 'forno', state: 'unlocked', currentTier: 1 }
   * })
   */
  update(producer: (draft: Draft<TreeState>) => void): void {
    const next = produce(this.treeState, producer)
    if (next === this.treeState) {
      // Sen cambios reais (producer non modificou nada): non notificar.
      return
    }
    this.treeState = next
    this.notify()
  }

  /**
   * Actualiza o TreeDef mediante un producer Immer.
   *
   * Por defecto, invalida TODAS as caches (conservador). En sub-fases
   * posteriores (1.7, ChangeTracker), unha invalidación selectiva
   * substituirá esta lóxica.
   *
   * Notifica a todos os subscriptores.
   */
  applyTreeDefChange(producer: (draft: Draft<TreeDef>) => void): void {
    const next = produce(this.treeDef, producer)
    if (next === this.treeDef) {
      return
    }
    this.treeDef = next
    this.invalidate(ALL_CACHE_TYPES)
    this.notify()
  }

  /**
   * Substitúe completamente o TreeDef (uso interno, ex: hot reload).
   * Invalida todas as caches.
   */
  replaceTreeDef(newDef: TreeDef): void {
    this.treeDef = newDef
    this.invalidate(ALL_CACHE_TYPES)
    this.notify()
  }

  /**
   * Substitúe completamente o TreeState (uso interno, ex: cargar build).
   * NON invalida caches por defecto — o caller decide.
   */
  replaceTreeState(newState: TreeState): void {
    this.treeState = newState
    this.notify()
  }

  // ───────────────────────────────────────────────
  // Caches
  // ───────────────────────────────────────────────

  /**
   * Devolve a versión actual dunha cache.
   *
   * Os consumidores comparan esta versión coa que tiñan cando computaron
   * a súa cache para saber se segue válida.
   */
  getCacheVersion(type: CacheType): number {
    return this.cacheVersions[type]
  }

  /**
   * Incrementa o contador de versión das caches especificadas.
   *
   * As caches gardadas pasan a ser consideradas stale: `getCache()` devolverá
   * null para elas ata que se garde un novo valor co contador actualizado.
   */
  invalidate(types: readonly CacheType[]): void {
    for (const type of types) {
      this.cacheVersions[type]++
    }
  }

  /**
   * Garda un valor cachado asociado a unha versión.
   *
   * O valor só será devolto por `getCache()` mentres `version` coincida
   * coa versión actual da cache.
   */
  setCache(type: CacheType, value: unknown, version: number): void {
    this.cacheValues.set(type, { version, value })
  }

  /**
   * Devolve o valor cachado se a súa versión coincide coa actual.
   * Devolve `null` se non hai cache ou está obsoleta.
   */
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

  // ───────────────────────────────────────────────
  // Subscripcións
  // ───────────────────────────────────────────────

  /**
   * Subscribe a cambios no estado.
   *
   * O listener chámase tras cada `update()`, `applyTreeDefChange()`,
   * `replaceTreeDef()` ou `replaceTreeState()`.
   *
   * @returns Función que cancela esta subscrición.
   */
  subscribe(listener: StateListener): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Snapshot estable do estado actual.
   *
   * Compatible con `useSyncExternalStore` de React: devolve a mesma
   * referencia mentres o estado non cambie.
   */
  getSnapshot(): TreeState {
    return this.treeState
  }

  /**
   * Snapshot para SSR. De momento idéntico a getSnapshot.
   */
  getServerSnapshot(): TreeState {
    return this.treeState
  }

  /**
   * Número actual de subscriptores. Útil para tests.
   */
  listenerCount(): number {
    return this.listeners.size
  }

  // ───────────────────────────────────────────────
  // Privado
  // ───────────────────────────────────────────────

  /**
   * Crea un TreeState baleiro a partir do TreeDef.
   *
   * Inicializa só o budget (a partir de startingBudget se existe).
   * NON crea NodeInstances — iso é responsabilidade do TreeEngine cando
   * resolva o estado inicial completo.
   */
  private createInitialState(treeDef: TreeDef): TreeState {
    const initialResources = treeDef.startingBudget?.resources ?? {}
    return {
      nodes: {},
      budget: { resources: { ...initialResources } },
      computedStats: {},
      metadata: {},
    }
  }

  /**
   * Notifica a todos os subscriptores.
   *
   * Cópiase a lista antes de iterar para evitar problemas se un listener
   * se elimina a si mesmo durante a notificación.
   */
  private notify(): void {
    // Snapshot defensivo: un listener pode chamar a unsub() durante o notify.
    const snapshot = Array.from(this.listeners)
    for (const listener of snapshot) {
      try {
        listener()
      } catch {
        // Os erros en subscriptores non rompen o ciclo de notificación.
        // O StateStore non ten EventEmitter — un erro aquí é silencioso.
        // Cando o motor xunte StateStore + EventEmitter (1.12+), poderá
        // reportar este tipo de erros vía evento 'error'.
      }
    }
  }
}
// ── FIN: StateStore ──
```

### 5.3 Actualizar packages/core/src/engine/index.ts

Substituír o contido por:

```typescript
// ── INICIO: engine public API ──
// Exporta as pezas do motor.

export { EventEmitter, type Unsubscribe } from './EventEmitter.js'
export {
  ConcurrencyGuard,
  type ConcurrencyGuardOptions,
} from './ConcurrencyGuard.js'
export {
  StateStore,
  type CacheType,
  ALL_CACHE_TYPES,
  type StateListener,
  type StateStoreOptions,
} from './StateStore.js'
// ── FIN: engine public API ──
```

⚠️ **Atención:** Hai dúas declaracións de `Unsubscribe` (en EventEmitter.ts e StateStore.ts). Reexportamos só a de EventEmitter para evitar conflito de nomes. A de StateStore queda como tipo interno do módulo, accesible vía `import type` directo se alguén o precisa.

### 5.4 Tests

Crear `packages/core/__tests__/engine/StateStore.test.ts`:

```typescript
// ── INICIO: tests de StateStore ──
import { describe, expect, it, vi } from 'vitest'
import { ALL_CACHE_TYPES, StateStore } from '../../src/engine/index.js'
import type { TreeDef, TreeState } from '../../src/types/index.js'

/** Helper: TreeDef mínimo válido. */
function makeTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

describe('StateStore', () => {
  describe('initialization', () => {
    it('creates an empty state when no initial state provided', () => {
      const store = new StateStore(makeTreeDef())
      const state = store.getState()
      expect(state.nodes).toEqual({})
      expect(state.budget.resources).toEqual({})
      expect(state.computedStats).toEqual({})
    })

    it('initializes budget from treeDef.startingBudget', () => {
      const tree = makeTreeDef({
        startingBudget: { resources: { xp: 100, sp: 5 } },
      })
      const store = new StateStore(tree)
      expect(store.getState().budget.resources['xp']).toBe(100)
      expect(store.getState().budget.resources['sp']).toBe(5)
    })

    it('accepts custom initialState', () => {
      const initialState: TreeState = {
        nodes: { forno: { id: 'forno', state: 'unlocked', currentTier: 1 } },
        budget: { resources: { xp: 999 } },
      }
      const store = new StateStore(makeTreeDef(), { initialState })
      expect(store.getState()).toBe(initialState)
    })

    it('exposes the treeDef', () => {
      const tree = makeTreeDef({ id: 'my-tree' })
      const store = new StateStore(tree)
      expect(store.getTreeDef().id).toBe('my-tree')
    })
  })

  describe('update', () => {
    it('applies producer changes via Immer', () => {
      const store = new StateStore(makeTreeDef())
      store.update((draft) => {
        draft.budget.resources['xp'] = 50
      })
      expect(store.getState().budget.resources['xp']).toBe(50)
    })

    it('produces a new state object (immutability)', () => {
      const store = new StateStore(makeTreeDef())
      const before = store.getState()
      store.update((draft) => {
        draft.budget.resources['xp'] = 10
      })
      expect(store.getState()).not.toBe(before)
    })

    it('skips notification when producer makes no changes', () => {
      const store = new StateStore(makeTreeDef())
      const before = store.getState()
      const listener = vi.fn()
      store.subscribe(listener)
      store.update(() => {
        // sen cambios
      })
      expect(store.getState()).toBe(before)
      expect(listener).not.toHaveBeenCalled()
    })

    it('notifies subscribers after a real change', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.update((draft) => {
        draft.budget.resources['xp'] = 10
      })
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('applyTreeDefChange', () => {
    it('mutates the treeDef via Immer', () => {
      const store = new StateStore(makeTreeDef({ version: '1.0.0' }))
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      expect(store.getTreeDef().version).toBe('2.0.0')
    })

    it('invalidates all caches', () => {
      const store = new StateStore(makeTreeDef())
      for (const type of ALL_CACHE_TYPES) {
        store.setCache(type, { foo: 'bar' }, store.getCacheVersion(type))
      }
      // Todas as caches están dispoñibles
      for (const type of ALL_CACHE_TYPES) {
        expect(store.getCache(type)).toEqual({ foo: 'bar' })
      }
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      // Tras mutar treeDef, todas as caches están stale
      for (const type of ALL_CACHE_TYPES) {
        expect(store.getCache(type)).toBeNull()
      }
    })

    it('notifies subscribers', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('skips notification when producer makes no changes', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.applyTreeDefChange(() => {
        // sen cambios
      })
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('replaceTreeDef / replaceTreeState', () => {
    it('replaceTreeDef substitutes the def and invalidates caches', () => {
      const store = new StateStore(makeTreeDef({ id: 'a' }))
      store.setCache('layout', 'cached', store.getCacheVersion('layout'))
      const newDef = makeTreeDef({ id: 'b' })
      store.replaceTreeDef(newDef)
      expect(store.getTreeDef().id).toBe('b')
      expect(store.getCache('layout')).toBeNull()
    })

    it('replaceTreeDef notifies subscribers', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      store.replaceTreeDef(makeTreeDef({ id: 'other' }))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('replaceTreeState substitutes the state and notifies', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      store.subscribe(listener)
      const newState: TreeState = {
        nodes: {},
        budget: { resources: { xp: 500 } },
      }
      store.replaceTreeState(newState)
      expect(store.getState()).toBe(newState)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('replaceTreeState does NOT invalidate caches by default', () => {
      const store = new StateStore(makeTreeDef())
      const version = store.getCacheVersion('layout')
      store.setCache('layout', 'cached', version)
      store.replaceTreeState({ nodes: {}, budget: { resources: {} } })
      expect(store.getCache('layout')).toBe('cached')
    })
  })

  describe('cache versioning', () => {
    it('initial cache versions are 0', () => {
      const store = new StateStore(makeTreeDef())
      for (const type of ALL_CACHE_TYPES) {
        expect(store.getCacheVersion(type)).toBe(0)
      }
    })

    it('invalidate increments versions of the specified types only', () => {
      const store = new StateStore(makeTreeDef())
      store.invalidate(['layout', 'search'])
      expect(store.getCacheVersion('layout')).toBe(1)
      expect(store.getCacheVersion('search')).toBe(1)
      expect(store.getCacheVersion('dependency')).toBe(0)
      expect(store.getCacheVersion('stats')).toBe(0)
    })

    it('setCache + getCache round-trip works while version matches', () => {
      const store = new StateStore(makeTreeDef())
      const version = store.getCacheVersion('layout')
      store.setCache('layout', { computed: true }, version)
      expect(store.getCache('layout')).toEqual({ computed: true })
    })

    it('getCache returns null when version mismatch', () => {
      const store = new StateStore(makeTreeDef())
      const oldVersion = store.getCacheVersion('layout')
      store.setCache('layout', { computed: true }, oldVersion)
      store.invalidate(['layout'])
      expect(store.getCache('layout')).toBeNull()
    })

    it('getCache returns null when never set', () => {
      const store = new StateStore(makeTreeDef())
      expect(store.getCache('layout')).toBeNull()
    })

    it('multiple invalidations bump version each time', () => {
      const store = new StateStore(makeTreeDef())
      store.invalidate(['stats'])
      store.invalidate(['stats'])
      store.invalidate(['stats'])
      expect(store.getCacheVersion('stats')).toBe(3)
    })
  })

  describe('subscriptions', () => {
    it('subscribe returns a working unsubscribe', () => {
      const store = new StateStore(makeTreeDef())
      const listener = vi.fn()
      const unsub = store.subscribe(listener)
      unsub()
      store.update((draft) => {
        draft.budget.resources['xp'] = 1
      })
      expect(listener).not.toHaveBeenCalled()
    })

    it('multiple listeners are all notified', () => {
      const store = new StateStore(makeTreeDef())
      const a = vi.fn()
      const b = vi.fn()
      const c = vi.fn()
      store.subscribe(a)
      store.subscribe(b)
      store.subscribe(c)
      store.update((draft) => {
        draft.budget.resources['xp'] = 1
      })
      expect(a).toHaveBeenCalled()
      expect(b).toHaveBeenCalled()
      expect(c).toHaveBeenCalled()
    })

    it('listener error does not break notification chain', () => {
      const store = new StateStore(makeTreeDef())
      const survivor = vi.fn()
      store.subscribe(() => {
        throw new Error('listener boom')
      })
      store.subscribe(survivor)
      store.update((draft) => {
        draft.budget.resources['xp'] = 1
      })
      expect(survivor).toHaveBeenCalled()
    })

    it('listenerCount reflects active subscriptions', () => {
      const store = new StateStore(makeTreeDef())
      expect(store.listenerCount()).toBe(0)
      const u1 = store.subscribe(vi.fn())
      const u2 = store.subscribe(vi.fn())
      expect(store.listenerCount()).toBe(2)
      u1()
      expect(store.listenerCount()).toBe(1)
      u2()
      expect(store.listenerCount()).toBe(0)
    })

    it('listener that unsubscribes during notify does not break iteration', () => {
      const store = new StateStore(makeTreeDef())
      const calls: string[] = []
      const u1 = store.subscribe(() => {
        calls.push('a')
        u1()
      })
      store.subscribe(() => {
        calls.push('b')
      })
      store.update((draft) => {
        draft.budget.resources['xp'] = 1
      })
      expect(calls).toEqual(['a', 'b'])
      // Tras unsubscribe en runtime, segunda emisión non chama 'a'
      store.update((draft) => {
        draft.budget.resources['xp'] = 2
      })
      expect(calls).toEqual(['a', 'b', 'b'])
    })
  })

  describe('snapshots', () => {
    it('getSnapshot returns the same reference until state changes', () => {
      const store = new StateStore(makeTreeDef())
      const a = store.getSnapshot()
      const b = store.getSnapshot()
      expect(a).toBe(b)
    })

    it('getSnapshot returns a new reference after update', () => {
      const store = new StateStore(makeTreeDef())
      const before = store.getSnapshot()
      store.update((draft) => {
        draft.budget.resources['xp'] = 1
      })
      expect(store.getSnapshot()).not.toBe(before)
    })

    it('getServerSnapshot mirrors getSnapshot currently', () => {
      const store = new StateStore(makeTreeDef())
      expect(store.getServerSnapshot()).toBe(store.getSnapshot())
    })
  })

  describe('immutability guarantees', () => {
    it('returned state is frozen by Immer (cannot mutate)', () => {
      const store = new StateStore(makeTreeDef())
      store.update((draft) => {
        draft.budget.resources['xp'] = 10
      })
      const state = store.getState()
      expect(() => {
        state.budget.resources['xp'] = 999
      }).toThrow()
    })

    it('returned treeDef is frozen after mutation', () => {
      const store = new StateStore(makeTreeDef({ version: '1.0.0' }))
      store.applyTreeDefChange((draft) => {
        draft.version = '2.0.0'
      })
      const def = store.getTreeDef()
      expect(() => {
        ;(def as { version: string }).version = '3.0.0'
      }).toThrow()
    })
  })
})
// ── FIN: tests de StateStore ──
```

### 5.5 Verificación local

```bash
pnpm lint:fix
pnpm format
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @yggdrasil-forge/core test:coverage
pnpm validate
```

⚠️ **Cobertura esperada en StateStore:** 100%. É lóxica pura e completamente testable.

⚠️ **Posibles erros que poden aparecer:**
- Se `produce` falla porque o draft non é mutable: Immer pode requirir `enableMapSet()` se algún día usamos Maps. **Non é o caso aquí** — TreeState e TreeDef son obxectos planos.
- Se `Immer` non está dispoñible: verificar `pnpm --filter @yggdrasil-forge/core list immer`. Se non está, executar `pnpm install` de novo.

### 5.6 Actualizar packages/core/README.md

Engadir despois da sección "Engine primitives":

```markdown
### StateStore

\`\`\`typescript
import { StateStore } from '@yggdrasil-forge/core'

const store = new StateStore(myTreeDef)

// Subscribe to changes
const unsub = store.subscribe(() => {
  console.info('state changed')
})

// Update state via Immer producer
store.update((draft) => {
  draft.budget.resources['xp'] = (draft.budget.resources['xp'] ?? 0) + 10
})

// Cache versioning
const version = store.getCacheVersion('layout')
store.setCache('layout', myLayoutResult, version)
const cached = store.getCache('layout')  // null if invalidated
\`\`\`
```

### 5.7 Engadir changeset

```bash
pnpm changeset
```

- Selecciona `@yggdrasil-forge/core`
- **Minor** (non major)
- Summary: `Add StateStore: mutable state container with Immer, integrated cache versioning (4 cache types), and subscription system compatible with useSyncExternalStore.`

### 5.8 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: `StateStore` class
  - Holds mutable `treeDef` and `treeState` via Immer
  - `update(producer)` and `applyTreeDefChange(producer)` for ergonomic mutations
  - `replaceTreeDef`, `replaceTreeState` for full replacements
  - Integrated cache versioning for 4 cache types (`layout`, `dependency`, `search`, `stats`)
  - `getCacheVersion`, `invalidate`, `setCache`, `getCache` for cache lifecycle
  - Subscription system: `subscribe`, `getSnapshot`, `getServerSnapshot` (React `useSyncExternalStore`-compatible)
  - 100% test coverage
```

### 5.9 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add StateStore with Immer, cache versioning, and subscriptions"
git push origin main
```

Verifica **CI verde**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN** en todos os ficheiros novos.
- **Idioma de comentarios:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar código.
- **Imports relativos con `.js`**, `import type` para tipos.
- **Cero `any`**, cero `console.log`.
- **CI verde obrigatorio.**

---

## 7. QUE NON FACER

- ❌ Non implementar `applyChanges` con validación de TreeChanges (vai en 1.7 con ChangeTracker).
- ❌ Non reconciliar NodeInstances tras cambios na TreeDef (vai en 1.7+).
- ❌ Non implementar caches específicas (LayoutCache, SearchIndex). O StateStore só xestiona slots versionados; o contido é `unknown` ata que se implementen as caches reais.
- ❌ Non crear TreeEngine, UnlockResolver, etc.
- ❌ Non integrar StateStore con EventEmitter aínda (faino o TreeEngine en 1.12+).
- ❌ Non engadir dependencias externas (Immer xa está).

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ `packages/core/src/engine/StateStore.ts` con clase completa
2. ✅ `packages/core/src/engine/index.ts` actualizado
3. ✅ `packages/core/__tests__/engine/StateStore.test.ts` con cobertura 100%
4. ✅ `packages/core/README.md` actualizado
5. ✅ Changeset minor creado
6. ✅ CHANGELOG raíz actualizado
7. ✅ Build, test, validate pasan
8. ✅ CI verde

Mostra ao autor:
```bash
ls packages/core/src/engine/
pnpm --filter @yggdrasil-forge/core test
pnpm --filter @yggdrasil-forge/core test:coverage
git log --oneline -3
```

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.6 — COMPLETADA
═══════════════════════════════════════

✅ StateStore implementado:
   - Estado mutable con Immer (update / applyTreeDefChange / replaceTreeDef / replaceTreeState)
   - Cache versioning (4 tipos: layout, dependency, search, stats)
   - Subscripcións (subscribe / getSnapshot / getServerSnapshot)
   - Inmutabilidade externa garantida por Immer freeze

✅ Tests: [N] tests pasan
✅ Cobertura: 100% no StateStore
✅ Changeset minor creado
✅ CHANGELOG actualizado
✅ CI verde

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor:
[Lista, ou "Ningunha"]

📋 Estado:
LISTO PARA PROCEDER Á SUB-FASE 1.7
(ChangeTracker — analiza TreeChange[] e decide que caches invalidar selectivamente)
```

---

**FIN DO BRIEFING 1.6**
