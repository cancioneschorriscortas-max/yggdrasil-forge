// ── INICIO: types public API ──
// Tipos públicos do paquete @yggdrasil-forge/core.
// Esta é a 1ª onda (sub-fase 1.2). As ondas seguintes engadirán:
// - unlock, resources, i18n, events, plugin (1.3)
// - audit, changes, time, stats, auth, metrics (1.4)

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
