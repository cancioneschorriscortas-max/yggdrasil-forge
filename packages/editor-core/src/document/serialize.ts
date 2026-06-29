// ── INICIO: serialize ──
// Serialización pura do `EditorDocument` a/desde JSON namespaced.
//
// Formato externo:
//
//   {
//     "tree":   { ...TreeDef... },
//     "editor": { ...DocumentMeta... }
//   }
//
// O motor (TreeEngine) le **só `tree`** e ignora `editor`; iso é
// importante para o split de responsabilidades. O editor le ambos.
//
// **Compatibilidade cara atrás**: un JSON que é un `TreeDef` pelado
// (sin envelope `{ tree, editor }`) tamén carga, con `meta` por
// defecto. Iso permite abrir as trees existentes (panadeiro,
// cyberware) sin conversión previa.

import {
  ErrorCode,
  type Result,
  type TreeDef,
  YggdrasilError,
  err,
  ok,
  validateTreeDef,
} from '@yggdrasil-forge/core'
import {
  DEFAULT_DOCUMENT_META,
  type DocumentMeta,
  type EditorDocument,
  createEditorDocument,
} from './EditorDocument.js'

/** Serializa o documento como JSON namespaced `{ tree, editor }`. */
export function serializeDocument(doc: EditorDocument): string {
  return JSON.stringify({ tree: doc.tree, editor: doc.meta })
}

/**
 * Parse JSON defensivo + valida `tree` con `validateTreeDef`.
 *
 * Aceita dúas formas de entrada:
 *   1. `{ tree, editor }` namespaced (formato canónico do editor).
 *   2. `{ ...TreeDef }` pelado (compat con ficheiros pre-editor).
 *
 * Devolve `Result` de erro (non lanza) se:
 *   - O JSON é inválido (parse falla).
 *   - O `tree` non pasa `validateTreeDef`.
 */
export function deserializeDocument(jsonText: string): Result<EditorDocument> {
  // 1. Parse defensivo: JSON.parse pode lanzar; convertimos a Result.
  //    Usamos INVALID_TREE_DEF como código semántico (nivel superior:
  //    "non se puido cargar a árbore"); o validador deeper dará códigos
  //    máis específicos cando o JSON parse SI pasa pero o contido é
  //    inválido (INVALID_NODE_DEF, INVALID_EDGE_DEF, etc.).
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    const cause = e instanceof Error ? e : new Error(String(e))
    return err(
      new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        `invalid JSON: ${cause.message}`,
        { cause },
      ),
    )
  }

  // 2. Identificar forma. Se ten clave `tree` top-level con object,
  //    é o formato namespaced; se non, asumimos TreeDef pelado.
  let treeInput: unknown
  let metaInput: unknown = undefined
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'tree' in parsed &&
    typeof (parsed as { tree: unknown }).tree === 'object'
  ) {
    treeInput = (parsed as { tree: unknown }).tree
    if ('editor' in parsed) {
      metaInput = (parsed as { editor: unknown }).editor
    }
  } else {
    treeInput = parsed
  }

  // 3. Validar tree co motor; o validador é estrito e devolve Result.
  const validated = validateTreeDef(treeInput)
  if (!validated.ok) return validated as Result<EditorDocument>

  // 4. Reconstruír meta (default-merge se falta ou non é object).
  const metaPartial =
    metaInput !== null && typeof metaInput === 'object'
      ? (metaInput as Partial<DocumentMeta>)
      : DEFAULT_DOCUMENT_META

  // O cast a TreeDef é seguro: InferredTreeDef (z.infer) é
  // estruturalmente equivalente a TreeDef (gateado polo type-test
  // treeDefSchema.type-test.ts en @core).
  return ok(createEditorDocument(validated.value as TreeDef, metaPartial))
}
// ── FIN: serialize ──
