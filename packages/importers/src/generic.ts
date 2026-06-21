// ── INICIO: F9.4 — import xenérico + identity import (JSON/YAML) ──
import {
  ErrorCode,
  type LocalizedString,
  type Result,
  SCHEMA_VERSION,
  YggdrasilError,
  err,
  ok,
} from '@yggdrasil-forge/common'
import type { EdgeDef, GroupDef, LayoutConfig, NodeDef, TreeDef } from '@yggdrasil-forge/core'
import { validateTreeDef } from '@yggdrasil-forge/core'
import { parse as parseYaml } from 'yaml'

/**
 * Mapeo design-wide: describe como obter as pezas dun `TreeDef` a partir de
 * calquera forma de entrada `TInput`. O importador GAIA é UN consumidor; un
 * xogo ou un curso tipo Duolingo definen o seu propio `TreeMapping`.
 *
 * Obrigatorias (mínimo dun TreeDef): `id`, `label`, `nodes`.
 * O resto teñen defaults sensatos (edges=[], layout=identity, version='1.0.0').
 */
export interface TreeMapping<TInput> {
  readonly id: (input: TInput) => string
  readonly label: (input: TInput) => LocalizedString
  readonly nodes: (input: TInput) => readonly NodeDef[]
  readonly edges?: (input: TInput) => readonly EdgeDef[]
  readonly groups?: (input: TInput) => readonly GroupDef[]
  readonly rootNodeId?: (input: TInput) => string | undefined
  readonly metadata?: (input: TInput) => Readonly<Record<string, unknown>> | undefined
  readonly version?: (input: TInput) => string
  readonly layout?: (input: TInput) => LayoutConfig
}

/**
 * Importa calquera entrada a un `TreeDef` aplicando un `TreeMapping`.
 * Mapeo puro (sen I/O, determinista). NON valida: a validación é traballo
 * do motor (`validateTreeDef`) ou dos tests.
 */
export function importTree<TInput>(data: TInput, mapping: TreeMapping<TInput>): TreeDef {
  const rootNodeId = mapping.rootNodeId?.(data)
  const groups = mapping.groups?.(data)
  const metadata = mapping.metadata?.(data)
  return {
    id: mapping.id(data),
    schemaVersion: SCHEMA_VERSION,
    version: mapping.version?.(data) ?? '1.0.0',
    label: mapping.label(data),
    ...(rootNodeId !== undefined ? { rootNodeId } : {}),
    nodes: mapping.nodes(data),
    edges: mapping.edges?.(data) ?? [],
    ...(groups !== undefined ? { groups } : {}),
    layout: mapping.layout?.(data) ?? { type: 'identity' },
    ...(metadata !== undefined ? { metadata } : {}),
  }
}

/**
 * Carga un documento que XA ten forma de `TreeDef` (a inversa de exportar):
 * parse + validación estrutural co motor. Nunca lanza: JSON inválido ou
 * estrutura incorrecta → `err` controlado.
 */
export function importTreeFromJson(json: string): Result<TreeDef> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch (e) {
    const detail = e instanceof Error ? e.message : /* v8 ignore next */ String(e)
    return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `JSON inválido: ${detail}`))
  }
  return finishImport(parsed)
}

/** Igual que `importTreeFromJson` pero para YAML. */
export function importTreeFromYaml(yaml: string): Result<TreeDef> {
  let parsed: unknown
  try {
    parsed = parseYaml(yaml) as unknown
  } catch (e) {
    const detail = e instanceof Error ? e.message : /* v8 ignore next */ String(e)
    return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `YAML inválido: ${detail}`))
  }
  return finishImport(parsed)
}

/**
 * Valida a estrutura e estreita a `TreeDef`. `validateTreeDef` devolve
 * `InferredTreeDef` (estruturalmente TreeDef; o único delta é o artefacto
 * `T | undefined` de Zod 3 vs `T?` con exactOptionalPropertyTypes). Cast
 * único e documentado nesta fronteira de confianza.
 */
function finishImport(parsed: unknown): Result<TreeDef> {
  const validation = validateTreeDef(parsed)
  if (!validation.ok) return err(validation.error)
  return ok(validation.value as TreeDef)
}
// ── FIN: F9.4 ──
