// ── INICIO: nodePropertyRegistry ──
// Property Registry concreto para `NodeDef`. Cobre **campos escalares**
// en 7.5c-i, campos estruturados en 7.5c-ii, e a pasada de usabilidade
// en 7.5c-U (labels + describe + `advanced` flag).
//
// **Type-test de non-drift**: usamos tuplas literais const para
// `NodeType` e `NodeShape` (xa que TS non xera arrays runtime das
// unións de literais). O `Equals<>` compile-time garante que se
// engades un valor a `NodeType`/`NodeShape` en @core sen actualizar
// aquí, o typecheck falla → cero drift silencioso.
//
// **★ Usabilidade (7.5c-U)**:
//   - Cada descriptor ten `label` gl + `describe` gl (contido validado
//     no Briefing §7). Cero xerga inglesa exposta ao usuario.
//   - `tier`/`maxTier`/`costPerTier`/`tiers` renomeados a
//     Nivel/Nivel máximo/etc.
//   - Flag `advanced` marca os campos que van pregados baixo
//     "Avanzado" no Inspector. Non-advanced = "Básico" (sempre visible).

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeDef, NodeShape, NodeType } from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import { setNodeField } from '../command/commands/index.js'
import type { PropertyDescriptor } from './PropertyDescriptor.js'

// ── Tuplas para opcións de enum (con type-test de cobertura completa) ──
const NODE_TYPE_OPTIONS = [
  'small',
  'notable',
  'keystone',
  'mastery',
  'ascendancy',
  'root',
  'cluster',
  'gateway',
  'milestone',
  'subtree_anchor',
  'custom',
] as const
const NODE_SHAPE_OPTIONS = ['circle', 'square', 'diamond', 'hexagon', 'octagon'] as const

// Type-tests: se @core engade/quita un valor na unión sin actualizar
// aquí, o `Equals` falla en compile-time.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false
const _typeOptionsCoverNodeType: Equals<(typeof NODE_TYPE_OPTIONS)[number], NodeType> = true
const _shapeOptionsCoverNodeShape: Equals<(typeof NODE_SHAPE_OPTIONS)[number], NodeShape> = true
void _typeOptionsCoverNodeType
void _shapeOptionsCoverNodeShape

// ── Helper para descriptores que delegan en setNodeField ──
function fieldDescriptor<K extends keyof NodeDef>(args: {
  key: K
  label: LocalizedString
  describe: LocalizedString
  type: PropertyDescriptor['type']
  group: PropertyDescriptor['group']
  readonly?: boolean
  advanced?: boolean
}): PropertyDescriptor<NodeDef[K]> {
  const { key, label, describe, type, group, readonly, advanced } = args
  return {
    key: key as string,
    label,
    describe,
    type,
    group,
    ...(readonly === true && { readonly: true }),
    ...(advanced === true && { advanced: true }),
    get(node: NodeDef): NodeDef[K] | undefined {
      return node[key]
    },
    set(nodeId: string, value: NodeDef[K]): Command {
      return setNodeField(nodeId, key, value)
    },
  }
}

// ── Descriptor especial para `id` (readonly, non chamable) ──
const idDescriptor: PropertyDescriptor<string> = {
  key: 'id',
  label: { en: 'ID', gl: 'ID' },
  describe: {
    en: 'Unique internal name. Cannot be changed.',
    gl: 'Nome interno único. Non se pode cambiar.',
  },
  type: { kind: 'text' },
  group: 'identity',
  readonly: true,
  get(node) {
    return node.id
  },
  set() {
    throw new Error('Property `id` is readonly')
  },
}

// ── Rexistro final ──
export const nodePropertyRegistry: readonly PropertyDescriptor[] = [
  // ── Identidade ──
  idDescriptor,
  fieldDescriptor({
    key: 'type',
    label: { en: 'Type', gl: 'Tipo' },
    describe: {
      en: 'The node category; changes its visual weight.',
      gl: 'A categoría do nodo; cambia a súa importancia visual.',
    },
    type: { kind: 'enum', options: NODE_TYPE_OPTIONS },
    group: 'identity',
    advanced: true, // usuario medio non escolle isto habitualmente
  }),
  fieldDescriptor({
    key: 'label',
    label: { en: 'Label', gl: 'Etiqueta' },
    describe: {
      en: 'The name the user sees on the map.',
      gl: 'O nome que ve o usuario no mapa.',
    },
    type: { kind: 'localizedText' },
    group: 'identity',
  }),
  fieldDescriptor({
    key: 'description',
    label: { en: 'Description', gl: 'Descrición' },
    describe: {
      en: 'A short text that explains what this node is.',
      gl: 'Un texto curto que explica que é este nodo.',
    },
    type: { kind: 'localizedText' },
    group: 'identity',
  }),
  // ── Aparencia (todos en Básico) ──
  fieldDescriptor({
    key: 'color',
    label: { en: 'Color', gl: 'Cor' },
    describe: {
      en: "The node's color. Takes precedence over the theme's per-state fill.",
      gl: 'A cor do nodo. Prevalece sobre o recheo por estado do tema.',
    },
    type: { kind: 'color' },
    group: 'appearance',
  }),
  fieldDescriptor({
    key: 'icon',
    label: { en: 'Icon', gl: 'Icona' },
    describe: {
      en: 'An icon or emoji inside the node (optional).',
      gl: 'Unha icona ou emoji dentro do nodo (opcional).',
    },
    type: { kind: 'text' },
    group: 'appearance',
  }),
  fieldDescriptor({
    key: 'iconScale',
    label: { en: 'Image zoom', gl: 'Zoom da imaxe' },
    describe: {
      en: 'Only applies to image icons (URL). Adjusts how much the photo is cropped inside the node shape.',
      gl: 'Só ten efecto en iconas de imaxe (URL). Axusta canto se recorta a foto dentro da forma do nodo.',
    },
    type: { kind: 'range', min: 1, max: 3, step: 0.1 },
    group: 'appearance',
    advanced: true,
  }),
  fieldDescriptor({
    key: 'shape',
    label: { en: 'Shape', gl: 'Forma' },
    describe: { en: 'Circle, hexagon, diamond…', gl: 'Círculo, hexágono, rombo…' },
    type: { kind: 'enum', options: NODE_SHAPE_OPTIONS },
    group: 'appearance',
  }),
  fieldDescriptor({
    key: 'size',
    label: { en: 'Size', gl: 'Tamaño' },
    describe: {
      en: 'Leave empty for the default size.',
      gl: 'Déixao baleiro para o tamaño por defecto.',
    },
    type: { kind: 'number', min: 0.01, step: 1 },
    group: 'appearance',
  }),
  // ── Lóxica (todos AVANZADO) ──
  //
  // NOTA (7.5c-T): `tier` (que existía en NodeDef) foi retirado do
  // Inspector. É `@deprecated` no schema porque **non se lee no runtime**
  // (o rango actual vive en `state.currentTier`, non no NodeDef). Se
  // algún día se implementan semánticos para `NodeDef.tier`, reintróducese
  // o descriptor. Ver docs/architecture/MASTER.md → Annex A.
  fieldDescriptor({
    key: 'maxTier',
    label: { en: 'Ranks', gl: 'Rangos' },
    describe: {
      en: 'How many ranks the node has. Leave at 1 for a simple node. Ex.: 3 = three stages (Mk.I → Mk.II → Mk.III).',
      gl: 'Cantos rangos ou etapas ten o nodo. Déixao en 1 para un nodo simple. Ex.: 3 = tres etapas (Mk.I → Mk.II → Mk.III).',
    },
    type: { kind: 'number', min: 1, step: 1 },
    group: 'logic',
    advanced: true,
  }),
  // ── Estruturados (DECLARADOS — edición en 7.5c-ii+, todos AVANZADO) ──
  fieldDescriptor({
    key: 'cost',
    label: { en: 'Cost', gl: 'Custo' },
    describe: {
      en: 'What has to be paid to unlock it.',
      gl: 'Que hai que pagar para desbloquealo.',
    },
    type: { kind: 'structured', of: 'cost' },
    group: 'logic',
    advanced: true,
  }),
  fieldDescriptor({
    key: 'costPerTier',
    label: { en: 'Cost per level', gl: 'Custo por nivel' },
    describe: {
      en: 'Cost variation per level of the node.',
      gl: 'Variación do custo segundo o nivel do nodo.',
    },
    type: { kind: 'structured', of: 'costPerTier' },
    group: 'logic',
    advanced: true,
  }),
  // NOTA (7.5c-T2): `tiers` (F9.1: NodeTierInfo[]) retirado do Inspector.
  // É unha feature DECLARADA no schema pero NON IMPLEMENTADA no runtime.
  // Non se expón (nin morto nin sen-implementar se expoñen). Cuberto polo
  // gate `UNIMPLEMENTED_NODEDEF_FIELDS` — cando alguén implemente F9.1
  // no runtime, reintróducese aquí + movesé no gate a `USED`.
  fieldDescriptor({
    key: 'effects',
    label: { en: 'Effects', gl: 'Efectos' },
    describe: {
      en: 'What the node does when unlocked (e.g., grant resources).',
      gl: 'Que fai o nodo ao desbloquealo (ex. dar recursos).',
    },
    type: { kind: 'structured', of: 'effects' },
    group: 'logic',
    advanced: true,
  }),
  fieldDescriptor({
    key: 'prerequisites',
    label: { en: 'Requirements', gl: 'Requisitos' },
    describe: {
      en: 'What has to be unlocked before taking this node.',
      gl: 'Que hai que desbloquear antes de coller este nodo.',
    },
    type: { kind: 'structured', of: 'prerequisites' },
    group: 'logic',
    advanced: true,
  }),
  fieldDescriptor({
    key: 'exclusions',
    label: { en: 'Exclusions', gl: 'Exclusións' },
    describe: {
      en: 'Incompatible nodes: taking this blocks those (and vice versa).',
      gl: 'Nodos incompatibles: coller este bloquea eses (e ao revés).',
    },
    type: { kind: 'structured', of: 'exclusions' },
    group: 'logic',
    advanced: true,
  }),
]

export { NODE_TYPE_OPTIONS, NODE_SHAPE_OPTIONS }
// ── FIN: nodePropertyRegistry ──
