// ── INICIO: documentSchema (7.15, Cambio 2) ──
// **A fonte ÚNICA do JSON Schema publicado** en
// `schema/yggdrasil-document.schema.json` (raíz do repo).
//
// Combina o schema do documento completo `{ tree, editor }`:
//   - `tree` desde o `treeDefSchema` de @core (o motor).
//   - `editor` desde o `documentMetaSchema` de @editor-core (7.15-C1).
//
// Tres consumidores da MESMA fonte (cero drift entre eles):
//   1. O artefacto commiteado (xerado con `pnpm run gen:schema`).
//   2. O comando `ygg schema`.
//   3. O gate de drift (test que rexenera en memoria e compara).

import { treeDefSchema } from '@yggdrasil-forge/core'
import { documentMetaSchema } from '@yggdrasil-forge/editor-core'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

/** $id público do schema (raw de GitHub, rama main). */
export const SCHEMA_ID =
  'https://raw.githubusercontent.com/cancioneschorriscortas-max/yggdrasil-forge/main/schema/yggdrasil-document.schema.json'

/**
 * Documento completo en Zod. `editor` é opcional — un TreeDef pelado
 * envolto en `{ tree }` tamén é un documento válido (a compat con
 * TreeDef SEN envoltorio mantense en `deserializeDocument`, pero o
 * schema publicado describe o formato CANÓNICO namespaced).
 */
export const yggdrasilDocumentSchema = z
  .object({
    tree: treeDefSchema.describe(
      'The skill tree definition. The engine reads only this namespace.',
    ),
    editor: documentMetaSchema
      .optional()
      .describe(
        'Editor-level metadata (background, coordinate bounds, theme…). Engines ignore this namespace; editors read it. Unknown keys are preserved (forward compatibility).',
      ),
  })
  .describe('A complete Yggdrasil Forge document: engine data (tree) plus editor metadata.')

/**
 * Xera o JSON Schema (draft-07, o que emite zod-to-json-schema) do
 * documento completo, con `$id`/`title`/`description` estables.
 * Determinista: mesma entrada → mesmo obxecto (o gate de drift depende
 * diso).
 */
export function buildDocumentJsonSchema(): Record<string, unknown> {
  const generated = zodToJsonSchema(yggdrasilDocumentSchema, {
    name: 'YggdrasilDocument',
    nameStrategy: 'title',
  }) as Record<string, unknown>
  // Os overrides van DESPOIS do spread: $id/title/description estables
  // gañan sobre o que xere zod-to-json-schema.
  return {
    ...generated,
    $id: SCHEMA_ID,
    title: 'Yggdrasil Forge document',
    description:
      'Skill-tree document for Yggdrasil Forge: `tree` is the engine data (nodes, edges, resources, unlock rules), `editor` is editor-level presentation metadata (theme, background, coordinate bounds). Generated from the Zod schemas in @yggdrasil-forge/core and @yggdrasil-forge/editor-core — do not edit by hand; regenerate with `pnpm --filter @yggdrasil-forge/cli run gen:schema`.',
  }
}

/** Serialización canónica do schema (a que se commitea e se compara). */
export function renderDocumentJsonSchema(): string {
  return `${JSON.stringify(buildDocumentJsonSchema(), null, 2)}\n`
}
// ── FIN: documentSchema ──
