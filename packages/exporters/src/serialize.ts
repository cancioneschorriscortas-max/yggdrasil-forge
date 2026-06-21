// ── INICIO: F9.4 — serialización de TreeDef (JSON/YAML) ──
import type { TreeDef } from '@yggdrasil-forge/core'
import { stringify as stringifyYaml } from 'yaml'

/** Opcións de exportación a JSON. */
export interface JsonExportOptions {
  /** Saída identada (lexible) vs compacta. Default: true. */
  readonly pretty?: boolean
  /** Espazos de identación cando `pretty`. Default: 2. */
  readonly indent?: number
}

/**
 * Serializa un `TreeDef` a unha cadea JSON.
 *
 * Determinista e sen perda: as claves `undefined` ómitense (igual que nun
 * `TreeDef` construído), polo que `JSON.parse(exportTreeToJson(t))` é
 * estruturalmente igual a `t`. Round-trip cos importadores.
 */
export function exportTreeToJson(tree: TreeDef, options?: JsonExportOptions): string {
  const pretty = options?.pretty ?? true
  const indent = options?.indent ?? 2
  return JSON.stringify(tree, null, pretty ? indent : undefined)
}

/**
 * Serializa un `TreeDef` a unha cadea YAML (paquete `yaml`, pure-JS).
 * Round-trip via `importTreeFromYaml`.
 */
export function exportTreeToYaml(tree: TreeDef): string {
  return stringifyYaml(tree)
}
// ── FIN: F9.4 ──
