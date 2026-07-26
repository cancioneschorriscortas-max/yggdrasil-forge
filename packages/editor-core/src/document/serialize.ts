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

import { getErrorMessage } from '@yggdrasil-forge/common'
import {
  ErrorCode,
  type Result,
  type TreeDef,
  YggdrasilError,
  err,
  ok,
  validateTreeDef,
} from '@yggdrasil-forge/core'
import { ValidatorRegistry } from '../validation/Validator.js'
import { referentialIntegrityValidator } from '../validation/referentialIntegrityValidator.js'
import { structuralValidator } from '../validation/structuralValidator.js'
import { uniqueIdsValidator } from '../validation/uniqueIdsValidator.js'
import {
  DEFAULT_DOCUMENT_META,
  type DocumentMeta,
  type EditorDocument,
  createEditorDocument,
} from './EditorDocument.js'
import { documentMetaSchema } from './documentMetaSchema.js'

/**
 * Claves de `DocumentMeta` que `createEditorDocument` coñece e copia.
 * Todo o demais no namespace `editor` é "descoñecido do futuro" e
 * consérvase tal cal (forward-compat, 7.15).
 */
const KNOWN_META_KEYS: ReadonlySet<string> = new Set([
  'formatVersion',
  'background',
  'coordinateBounds',
  'thumbnail',
  'imports',
  'theme',
])

/** Serializa o documento como JSON namespaced `{ tree, editor }`. */
export function serializeDocument(doc: EditorDocument): string {
  return JSON.stringify({ tree: doc.tree, editor: doc.meta })
}

/**
 * Parse JSON defensivo + validación COMPLETA do documento.
 *
 * Aceita dúas formas de entrada:
 *   1. `{ tree, editor }` namespaced (formato canónico do editor).
 *   2. `{ ...TreeDef }` pelado (compat con ficheiros pre-editor).
 *
 * Devolve `Result` de erro (non lanza) se:
 *   - O JSON é inválido (parse falla).
 *   - O `tree` non pasa `validateTreeDef` nin os validadores duros
 *     (structural / uniqueIds / referentialIntegrity — 7.14-B).
 *   - O namespace `editor` ten tipos errados nos campos coñecidos
 *     (`documentMetaSchema` — 7.15). Claves descoñecidas NON son erro:
 *     consérvanse tal cal (forward-compat).
 *
 * **Contrato (7.14-B, ampliado en 7.15)**: se devolve `ok`, o documento
 * ENTEIRO é san — árbore E meta. O motor non lanzará ao construírse e o
 * renderer non recibirá tipos imposibles do tema.
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
      new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `invalid JSON: ${cause.message}`, { cause }),
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

  // 4. Validar e reconstruír o namespace `editor` (7.15, Cambio 1).
  //    - Ausente ou null → defaults (compat con TreeDef pelado).
  //    - Presente → documentMetaSchema: tipos errados nos campos
  //      coñecidos rexéitanse con err (que campo, que problema);
  //      claves DESCOÑECIDAS pasan (passthrough) e consérvanse tal
  //      cal no doc final (forward-compat).
  let metaPartial: Partial<DocumentMeta> = DEFAULT_DOCUMENT_META
  const metaExtras: Record<string, unknown> = {}
  if (metaInput !== undefined && metaInput !== null) {
    const parsedMeta = documentMetaSchema.safeParse(metaInput)
    if (!parsedMeta.success) {
      const details = parsedMeta.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? `editor.${issue.path.join('.')}` : 'editor'
          return `${path}: ${issue.message}`
        })
        .join('; ')
      return err(
        new YggdrasilError(
          ErrorCode.INVALID_TREE_DEF,
          getErrorMessage(ErrorCode.INVALID_TREE_DEF, 'gl', { details }),
        ),
      )
    }
    // O output do passthrough trae coñecidas (tipadas) + descoñecidas.
    // O cast é seguro: acabamos de validar a forma en runtime; o
    // artefacto `?: T | undefined` de Zod 3 vs exactOptionalPropertyTypes
    // non existe en runtime (as claves ausentes non están no obxecto).
    const parsed = parsedMeta.data as Record<string, unknown>
    const known: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (KNOWN_META_KEYS.has(key)) known[key] = value
      else metaExtras[key] = value
    }
    metaPartial = known as Partial<DocumentMeta>
  }

  // O cast a TreeDef é seguro: InferredTreeDef (z.infer) é
  // estruturalmente equivalente a TreeDef (gateado polo type-test
  // treeDefSchema.type-test.ts en @core).
  const built = createEditorDocument(validated.value as TreeDef, metaPartial)
  // Reanexar as claves descoñecidas (createEditorDocument só copia as
  // coñecidas): así serializeDocument devólveas intactas no round-trip.
  const doc: EditorDocument =
    Object.keys(metaExtras).length > 0
      ? { tree: built.tree, meta: { ...metaExtras, ...built.meta } as DocumentMeta }
      : built

  // 5. Validadores DUROS (mesma garantía que EditorEngine).
  //    O schema Zod non pilla ids de nodo/aresta DUPLICADOS. Sen esta
  //    garda, un doc con ids duplicados cargaríase e o
  //    `new TreeEngine(doc.tree)` do canvas lanzaría AO RENDERIZAR,
  //    tumbando a UI e perdendo o documento (informe 05, GRAVE).
  //    Contrato reforzado: se `deserializeDocument` devolve `ok`, o
  //    documento é cargable (o motor non lanzará ao construírse).
  const registry = new ValidatorRegistry()
  registry.register(structuralValidator)
  registry.register(uniqueIdsValidator)
  registry.register(referentialIntegrityValidator)
  const blocking = registry.run(doc).filter((issue) => issue.severity === 'error')
  if (blocking.length > 0) {
    const details = blocking
      .map((issue) =>
        typeof issue.message === 'string'
          ? issue.message
          : (issue.message.gl ?? issue.message.en ?? issue.code),
      )
      .join('; ')
    return err(
      new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        getErrorMessage(ErrorCode.INVALID_TREE_DEF, 'gl', { details }),
      ),
    )
  }

  return ok(doc)
}
// ── FIN: serialize ──
