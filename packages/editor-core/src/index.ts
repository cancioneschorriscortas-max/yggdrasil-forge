// ── INICIO: @yggdrasil-forge/editor-core public API ──
// Editor Engine — núcleo headless de edición de TreeDefs. Cero React,
// cero UI. Provisto para que un wrapper (@editor-react, futuro) lle
// poña cara.

export const VERSION = '0.0.0'

// Documento (modelo + metadatos)
export {
  type BackgroundRef,
  DEFAULT_DOCUMENT_META,
  type DocumentMeta,
  type EditorDocument,
  createEditorDocument,
} from './document/EditorDocument.js'

// Persistencia
export type { DocumentAdapter } from './document/DocumentAdapter.js'
export { JsonDocumentAdapter, toJson } from './document/JsonDocumentAdapter.js'
export { deserializeDocument, serializeDocument } from './document/serialize.js'

// Sesión (efímera, estendida con selection+fsm+activeOperation en 7.3)
export { type EditorSession, createSession } from './session/EditorSession.js'

// Pipeline de edición (7.2)
export type { Command } from './command/Command.js'
export {
  addEdge,
  addNode,
  moveNode,
  removeEdge,
  removeNode,
  setNodeField,
} from './command/commands/index.js'
export {
  type Severity,
  type ValidationIssue,
  type Validator,
  ValidatorRegistry,
  hasErrors,
} from './validation/Validator.js'
export { structuralValidator } from './validation/structuralValidator.js'
export { uniqueIdsValidator } from './validation/uniqueIdsValidator.js'
export { referentialIntegrityValidator } from './validation/referentialIntegrityValidator.js'
export { History, type HistoryOptions } from './history/History.js'
export {
  EditorEngine,
  type EditorEngineListener,
  type EditorEngineOptions,
  type TransactionContext,
} from './EditorEngine.js'

// Interacción (7.3): Selection + FSM + Operation + Tool + Controller
export {
  type SelectionEngine,
  type SelectionRef,
  createSelectionEngine,
} from './selection/Selection.js'
export type {
  InputEvent,
  Modifiers,
  Rect,
} from './interaction/InputEvent.js'
export {
  type InteractionMachine,
  type InteractionState,
  createInteractionMachine,
} from './interaction/InteractionMachine.js'
export type { Operation, OperationPreview } from './operation/Operation.js'
export { createMoveOperation } from './operation/MoveOperation.js'
export type { Tool, ToolContext } from './tool/Tool.js'
export { type ToolRegistry, createToolRegistry } from './tool/ToolRegistry.js'
export { createSelectTool } from './tool/tools/SelectTool.js'
export { createMoveTool } from './tool/tools/MoveTool.js'
export {
  InteractionController,
  type InteractionControllerOptions,
} from './interaction/InteractionController.js'
// ── FIN: barrel ──
