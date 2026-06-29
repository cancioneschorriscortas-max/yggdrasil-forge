// ── INICIO: EditorDocument ──
// O modelo de edición = TreeDef (motor) + metadatos de NIVEL EDITOR.
//
// Diferencia importante:
//   - `tree` é o que o motor le e executa: nodos, edges, recursos, etc.
//   - `meta` é o que VIVE NO FICHEIRO pero o motor IGNORA: fondo, bounds
//     de coordenadas, miniatura, importacións. Este split namespacing
//     evita que o motor coñeza nada do editor (separation of concerns).
//
// Cero React. Cero UI. Cero clases — todo data + factories.

import type { Bounds, TreeDef } from '@yggdrasil-forge/core'

/** Documento de edición = motor + metadatos de nivel editor. */
export interface EditorDocument {
  readonly tree: TreeDef
  readonly meta: DocumentMeta
}

/**
 * Metadatos da ÁRBORE que viven NO FICHEIRO (non no TreeDef, non no
 * Workspace de usuario). Persisten ao gardar e cargar.
 */
export interface DocumentMeta {
  /** Versión do formato (semver). Para migracións futuras. */
  readonly formatVersion: string
  /** Referencia ao fondo (imaxe + tratamento visual). Opcional. */
  readonly background?: BackgroundRef
  /**
   * Espazo de coordenadas fixo do canvas. Cando está presente, o
   * SkillTree pode mapear posicións 1:1 a este box (a mesma idea
   * que `coordinateBounds` en `@react`).
   */
  readonly coordinateBounds?: Bounds
  /** Captura PNG/SVG en base64 ou URL. Opcional. */
  readonly thumbnail?: string
  /** Outros documentos referenciados (para composition futura). */
  readonly imports?: readonly string[]
  // FUTURO (NON v1): comments, annotations, bookmarks, revisions.
}

/** Tratamento visual do fondo aplicado polo consumidor (overlay/SkillTree). */
export interface BackgroundRef {
  /** URL, ruta ou asset-id; o consumidor decide como resolvela. */
  readonly src: string
  /** 0..1; opcidade aplicada á imaxe. */
  readonly opacity?: number
  /** Tratamento de contraste do consumidor. Semántica abierta. */
  readonly contrast?: number
  /** Tratamento de saturación do consumidor. */
  readonly desaturate?: number
  /** Se true, o consumidor non permite mover/cambiar este fondo. */
  readonly locked?: boolean
}

/**
 * Defaults oficiais para `DocumentMeta`. Cando un documento carga sen
 * `editor` namespace (compat con TreeDefs pelados), úsanse estes.
 */
export const DEFAULT_DOCUMENT_META: DocumentMeta = {
  formatVersion: '1.0.0',
}

/**
 * Crea un `EditorDocument` fusionando `meta` partial co default.
 *
 * Implementación con **spread condicional** para respectar
 * `exactOptionalPropertyTypes`: nunca asignamos `undefined` explícito
 * aos opcionais; ou están presentes co valor, ou non están.
 */
export function createEditorDocument(tree: TreeDef, meta?: Partial<DocumentMeta>): EditorDocument {
  const merged: DocumentMeta = {
    formatVersion: meta?.formatVersion ?? DEFAULT_DOCUMENT_META.formatVersion,
    ...(meta?.background !== undefined && { background: meta.background }),
    ...(meta?.coordinateBounds !== undefined && { coordinateBounds: meta.coordinateBounds }),
    ...(meta?.thumbnail !== undefined && { thumbnail: meta.thumbnail }),
    ...(meta?.imports !== undefined && { imports: meta.imports }),
  }
  return { tree, meta: merged }
}
// ── FIN: EditorDocument ──
