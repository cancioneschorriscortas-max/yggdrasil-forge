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
  deserializeAsync,
} from './JsonSerializer.js'
export type { Migration } from './migrations/Migration.js'
export { MigrationRegistry } from './migrations/MigrationRegistry.js'
export { MigrationRunner } from './migrations/MigrationRunner.js'
export type { BackupStorage } from './migrations/AutoBackup.js'
export { AutoBackup } from './migrations/AutoBackup.js'
export type {
  ReconcileOptions,
  ReconcileChange,
  ReconcileResult,
} from './reconciler/Reconciler.js'
export { reconcile } from './reconciler/Reconciler.js'
export type { LayoutEngine } from './layouts/LayoutEngine.js'
export { LayoutEngineRegistry } from './layouts/LayoutEngineRegistry.js'
export type {
  LayoutResult,
  EdgePath,
  Bounds,
  MeshElement,
} from './layouts/LayoutResult.js'
export { IdentityLayout } from './layouts/IdentityLayout.js'
export { computeLayout } from './layouts/computeLayout.js'
export { RadialLayout } from './layouts/RadialLayout.js'
export type {
  RadialLayoutConfig,
  PolygonConfig,
  MeshType,
} from './layouts/RadialLayoutConfig.js'
export { parseRadialConfig } from './layouts/RadialLayoutConfig.js'
export { generateMesh } from './layouts/MeshGenerator.js'
export { TreeLayout } from './layouts/TreeLayout.js'
export type {
  TreeLayoutConfig,
  TreeDirection,
} from './layouts/TreeLayoutConfig.js'
export { parseTreeConfig } from './layouts/TreeLayoutConfig.js'
export type { CustomLayoutConfig } from './layouts/CustomLayoutConfig.js'
export { parseCustomConfig } from './layouts/CustomLayoutConfig.js'
// ── FIN: engine public API ──
