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
export {
  ChangeTracker,
  analyzeChanges,
  type ChangeAnalysis,
  type ChangeConflict,
} from './ChangeTracker.js'
export {
  UnlockResolver,
  type DependencyGraphLike,
  type UnlockResolverContext,
} from './UnlockResolver.js'
// ── FIN: engine public API ──
