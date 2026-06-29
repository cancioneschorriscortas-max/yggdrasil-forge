// ── INICIO: DocumentAdapter ──
// Interface da costura "de onde vén / a onde vai" o documento. Permite
// que o editor sexa axena ao backend de persistencia:
//   - JsonDocumentAdapter (v1, string en memoria → JSON namespaced)
//   - FileSystemDocumentAdapter (futuro, Source = ruta / FileHandle)
//   - HttpDocumentAdapter (futuro, Source = URL)
//   - IndexedDbDocumentAdapter (futuro, Source = id de doc)
//   - ...
//
// O `Source` é xenérico: cada adapter elixe o seu tipo concreto
// (string, FileHandle, URL, etc.).
//
// Devolve sempre `Result` (non lanza) — alineado co Result do motor.

import type { Result } from '@yggdrasil-forge/core'
import type { EditorDocument } from './EditorDocument.js'

export interface DocumentAdapter<Source = string> {
  load(source: Source): Promise<Result<EditorDocument>>
  save(document: EditorDocument, target: Source): Promise<Result<void>>
}
// ── FIN: DocumentAdapter ──
