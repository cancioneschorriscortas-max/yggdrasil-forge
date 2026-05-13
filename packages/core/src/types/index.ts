// ── INICIO: types public API ──
// Tipos públicos do paquete @yggdrasil-forge/core.
//
// Ondas:
// - 1ª (1.2): Result, Node, Edge, Tree, RichContent, errors
// - 2ª (1.3): unlock, resources, i18n, events, plugin  ← actual
// - 3ª (1.4): audit, changes, time, stats, auth, metrics, progress
//             + substitución dos `unknown` placeholders por tipos reais

// Result
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './result.js'

// Content
export type { RichContent, NodeContent } from './content.js'

// Node
export type {
  NodeType,
  NodeState,
  NodeDef,
  NodeInstance,
  StateChange,
  Position,
} from './node.js'
export { freezeNodeDef } from './node.js'

// Edge
export type { EdgeType, EdgeDef, EdgeStyle } from './edge.js'

// Tree
export type { TreeDef, TreeState, GroupDef, StatDef, LayoutConfig } from './tree.js'

// Resources (1.3)
export type { Resource, Cost, Budget } from './resources.js'

// I18n config (1.3)
export type { I18nConfig } from './i18n.js'

// Unlock (1.3)
export type {
  UnlockCondition,
  UnlockRule,
  UnlockCheck,
  UnlockExplanation,
  UnlockConditionEvaluation,
} from './unlock.js'

// Events (1.3)
export type { EventMap, EventName, EventHandler } from './events.js'

// Plugin (1.3)
export type {
  Plugin,
  PluginAPI,
  PluginEngineHandle,
  PluginInstallResult,
  PluginLogLevel,
  PluginPermission,
  Hooks,
  HookContext,
  ConditionEvaluator,
  StorageAdapterPlaceholder,
  LayoutAlgorithmPlaceholder,
} from './plugin.js'

// Errors (re-export from common)
export {
  ErrorCode,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from './errors.js'
// ── FIN: types public API ──
