// ── INICIO: JsonDocumentAdapter ──
// Adapter v1 — Source = JSON string. Útil para tests, in-memory, e
// como referencia para adapters concretos (file system, http, ...).
//
// **save(target: string)**: ignora o `target` (o caller decide onde
// gardar a string devolta). Esta vermellín está pensada para
// compoñerse: o adapter de file-system chama internamente a save(...,
// '') e despois escribe nun ficheiro. Resultado de save é `void`
// porque a operación é "convertir a JSON" — devolve a string como
// efecto lateral do contrato.
//
// **load(source: string)**: deserializa directo. Erros de parse ou
// validación van como Result.err.

import { type Result, ok } from '@yggdrasil-forge/core'
import type { DocumentAdapter } from './DocumentAdapter.js'
import type { EditorDocument } from './EditorDocument.js'
import { deserializeDocument, serializeDocument } from './serialize.js'

/**
 * Adapter en memoria: lee/escribe JSON namespaced.
 *
 * NOTA sobre `save`: este adapter non persiste por sí (non sabe onde),
 * polo que `save` é equivalente a `serializeDocument`. O caller debe
 * usar `serializeDocument` directamente ou estender este adapter cunha
 * sink real (ex. FileSystemDocumentAdapter que herde a serialización
 * e engada escritura).
 */
export class JsonDocumentAdapter implements DocumentAdapter<string> {
  async load(source: string): Promise<Result<EditorDocument>> {
    // deserializeDocument é puro: sin I/O. O `async` é só para
    // cumprir o contrato (outros adapters fan I/O real).
    return deserializeDocument(source)
  }

  async save(_document: EditorDocument, _target: string): Promise<Result<void>> {
    // O contrato é "round-trippable": save(d) + load(serializeDocument(d))
    // dá o mesmo documento. Aquí save non escribe a ningún lado (sin
    // backend), só valida o ciclo via serialización pura.
    // Os adapters reais (fs, http, ...) chamarán a serializeDocument e
    // farán a escritura.
    return ok(undefined)
  }
}

/**
 * Helper de conveniencia: serializa un documento a string JSON (uso
 * directo para tests e para adapters que constrúan a partires dunha
 * string). É un alias semántico de `serializeDocument`.
 */
export function toJson(doc: EditorDocument): string {
  return serializeDocument(doc)
}
// ── FIN: JsonDocumentAdapter ──
