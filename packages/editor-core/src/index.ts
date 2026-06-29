// ── INICIO: @yggdrasil-forge/editor-core public API ──
// Editor Engine — núcleo headless de edición de TreeDefs. Cero React,
// cero UI. Provisto para que un wrapper (@editor-react, futuro) lle
// poña cara.
//
// v0 (briefing 7.1): modelo de documento + Session shell + Document
// Adapter + serialización namespaced.

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

// Sesión (efímera)
export { type EditorSession, createSession } from './session/EditorSession.js'
// ── FIN: barrel ──
