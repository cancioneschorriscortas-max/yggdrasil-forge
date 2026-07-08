// ── INICIO: treePropertyRegistry ──
// Property Registry para `TreeDef` (briefing 7.12) — mesmo principio
// que `nodePropertyRegistry`, pero a nivel de árbore: describe
// CONCEPTOS editables (identidade), non widgets.
//
// **Diferenza coa forma de NodeDef**: só hai UNHA árbore por
// documento, así que `set` non precisa un id — só o valor. `get`
// recibe o `TreeDef` en vez dun `NodeDef`.
//
// Alcance deliberado (§13 do briefing): só identidade
// (label/description/author/version + id/schemaVersion readonly).
// `resources` ten o seu propio editor estruturado (non pasa por este
// rexistro — é unha lista, non un campo escalar). Stats quedan
// bancados para cando toquen, co mesmo patrón.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import { setTreeField } from '../command/commands/index.js'
import type { PropertyType } from './PropertyDescriptor.js'

export interface TreePropertyDescriptor<T = unknown> {
  /** Nome do campo en `TreeDef`. Tamén id estable do descriptor. */
  readonly key: string
  readonly label: LocalizedString
  readonly type: PropertyType
  /** v1 só ten 'identity' — bancado para 'economy'/'stats' futuros. */
  readonly group: 'identity'
  readonly readonly?: boolean
  readonly advanced?: boolean
  readonly describe?: LocalizedString
  /** Lee o valor actual desde o TreeDef. */
  get(tree: TreeDef): T | undefined
  /** Produce o Command que aplica o novo valor (sempre `setTreeField`). */
  set(value: T): Command
}

function fieldDescriptor<K extends keyof TreeDef>(args: {
  key: K
  label: LocalizedString
  describe: LocalizedString
  type: PropertyType
  readonly?: boolean
  advanced?: boolean
}): TreePropertyDescriptor<TreeDef[K]> {
  const { key, label, describe, type, readonly, advanced } = args
  return {
    key: key as string,
    label,
    describe,
    type,
    group: 'identity',
    ...(readonly === true && { readonly: true }),
    ...(advanced === true && { advanced: true }),
    get(tree: TreeDef): TreeDef[K] | undefined {
      return tree[key]
    },
    set(value: TreeDef[K]): Command {
      if (readonly === true) {
        throw new Error(`Property \`${key as string}\` is readonly`)
      }
      return setTreeField(key, value)
    },
  }
}

export const treePropertyRegistry: readonly TreePropertyDescriptor[] = [
  fieldDescriptor({
    key: 'label',
    label: { en: 'Label', gl: 'Etiqueta' },
    describe: { en: 'The name of the tree.', gl: 'O nome da árbore.' },
    type: { kind: 'localizedText' },
  }),
  fieldDescriptor({
    key: 'description',
    label: { en: 'Description', gl: 'Descrición' },
    describe: {
      en: 'A short text that explains what this tree is about.',
      gl: 'Un texto curto que explica de que vai esta árbore.',
    },
    type: { kind: 'localizedText' },
  }),
  fieldDescriptor({
    key: 'author',
    label: { en: 'Author', gl: 'Autor' },
    describe: { en: 'Who made this tree (optional).', gl: 'Quen fixo esta árbore (opcional).' },
    type: { kind: 'text' },
  }),
  fieldDescriptor({
    key: 'version',
    label: { en: 'Version', gl: 'Versión' },
    describe: {
      en: 'Content version, at your own criteria (e.g. 1.0.0).',
      gl: 'Versión do contido, ao teu criterio (p.ex. 1.0.0).',
    },
    type: { kind: 'text' },
  }),
  fieldDescriptor({
    key: 'id',
    label: { en: 'ID', gl: 'ID' },
    describe: {
      en: 'Unique internal name. Cannot be changed.',
      gl: 'Nome interno único. Non se pode cambiar.',
    },
    type: { kind: 'text' },
    readonly: true,
    advanced: true,
  }),
  fieldDescriptor({
    key: 'schemaVersion',
    label: { en: 'Schema version', gl: 'Versión do esquema' },
    describe: {
      en: 'Internal format version. Cannot be changed.',
      gl: 'Versión interna do formato. Non se pode cambiar.',
    },
    type: { kind: 'text' },
    readonly: true,
    advanced: true,
  }),
]
// ── FIN: treePropertyRegistry ──
