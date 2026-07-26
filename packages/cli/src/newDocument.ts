// ── INICIO: newDocument (7.15, Cambio 4) ──
// `ygg new` — emite un documento baleiro VÁLIDO no formato canónico
// namespaced `{ tree, editor }`. É o mesmo mínimo confirmado polo
// probe A.6.42 (briefing 7.10): id/schemaVersion/version/label/layout
// obrigatorios; nodes/edges sen mínimo.

import type { TreeDef } from '@yggdrasil-forge/core'
import { createEditorDocument, serializeDocument } from '@yggdrasil-forge/editor-core'

export interface NewDocumentOptions {
  readonly id?: string
  readonly label?: string
}

/** Documento baleiro válido, como texto JSON (pretty, 2 espazos). */
export function newDocumentJson(options: NewDocumentOptions = {}): string {
  const tree: TreeDef = {
    id: options.id ?? 'nova-arbore',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: options.label ?? 'Nova árbore' },
    nodes: [],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
  const doc = createEditorDocument(tree)
  // serializeDocument é compacto; re-emitimos pretty para humanos e
  // diffs (a estrutura é a mesma).
  return `${JSON.stringify(JSON.parse(serializeDocument(doc)), null, 2)}\n`
}
// ── FIN: newDocument ──
