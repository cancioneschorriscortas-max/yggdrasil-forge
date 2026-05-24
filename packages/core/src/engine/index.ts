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
export {
  DependencyGraph,
  type DependencyGraphOptions,
} from './DependencyGraph.js'
export { CycleDetector } from './CycleDetector.js'
export { ResourceManager } from './ResourceManager.js'
export {
  AuditLogger,
  type AuditLoggerOptions,
  type AuditRecordOptions,
} from './AuditLogger.js'
export { TreeEngine, type TickResult } from './TreeEngine.js'
export { EffectsRunner, type EffectContext } from './EffectsRunner.js'
export { StatComputer, type StatComputerContext } from './StatComputer.js'
export {
  TimeManager,
  type TimeManagerContext,
  type TimeStatus,
} from './TimeManager.js'
export {
  ProgressManager,
  type ProgressManagerContext,
  type ProgressUpdateResult,
} from './ProgressManager.js'
export { createSelector, shallowEqual } from './selectors.js'
export {
  treeDefSchema,
  treeDefShapeSchema,
  type InferredTreeDef,
} from './treeDefSchema.js'
export {
  validateTreeDef,
  type TreeDefValidationIssue,
} from './TreeDefValidator.js'
export {
  JsonSerializer,
  serialize,
  deserialize,
} from './JsonSerializer.js'
// ── FIN: engine public API ──
