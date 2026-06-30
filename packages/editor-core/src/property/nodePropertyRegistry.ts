// ── INICIO: nodePropertyRegistry ──
// Property Registry concreto para `NodeDef`. Cubre **campos escalares**
// en 7.5c-i; os estruturados están **declarados** (kind:'structured')
// pero a súa edición vén en 7.5c-ii (sub-editores + gate manifesto).
//
// **Type-test de non-drift**: usamos tuplas literais const para
// `NodeType` e `NodeShape` (xa que TS non xera arrays runtime das
// unións de literais). O `Equals<>` compile-time garante que se
// engades un valor a `NodeType`/`NodeShape` en @core sen actualizar
// aquí, o typecheck falla → cero drift silencioso.

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
// Mark unused vars como usados (vincúlanse polo tipo, non polo valor).
void _typeOptionsCoverNodeType
void _shapeOptionsCoverNodeShape

// ── Helper para descriptores que delegan en setNodeField ──
/**
 * Crea un descriptor que **delega directamente en `setNodeField`**.
 * O xenérico `K extends keyof NodeDef` garante que o tipo do valor
 * coincide con `NodeDef[K]` (ex.: `label` recibe `LocalizedString`,
 * `size` recibe `number`, etc.). `setNodeField` xa trata
 * `LocalizedString` correctamente (acepta `string | Record`), polo
 * que **non fai falta trato especial para `label`/`description`**.
 */
function fieldDescriptor<K extends keyof NodeDef>(args: {
  key: K
  label: LocalizedString
  type: PropertyDescriptor['type']
  group: PropertyDescriptor['group']
  readonly?: boolean
  describe?: LocalizedString
}): PropertyDescriptor<NodeDef[K]> {
  const { key, label, type, group, readonly, describe } = args
  return {
    key: key as string,
    label,
    type,
    group,
    ...(readonly === true && { readonly: true }),
    ...(describe !== undefined && { describe }),
    get(node: NodeDef): NodeDef[K] | undefined {
      return node[key]
    },
    set(nodeId: string, value: NodeDef[K]): Command {
      return setNodeField(nodeId, key, value)
    },
  }
}

// ── Descriptor especial para `id` (readonly, non chamable) ──
/**
 * O `id` é readonly: cambialo rompe referencias (edges, prerequisites,
 * exclusions). O Inspector deshabilita o widget; este `set` lanza
 * defensivamente para que ningún flow accidental termine xerando un
 * Command de id.
 */
const idDescriptor: PropertyDescriptor<string> = {
  key: 'id',
  label: { en: 'ID', gl: 'ID' },
  type: { kind: 'text' },
  group: 'identity',
  readonly: true,
  describe: {
    en: 'Unique identifier. Cannot be changed (would break references).',
    gl: 'Identificador único. Non se pode cambiar (rompería referencias).',
  },
  get(node) {
    return node.id
  },
  set() {
    throw new Error('Property `id` is readonly')
  },
}

// ── Rexistro final ──
/**
 * **Registry de propiedades para NodeDef**. Os widgets do Inspector
 * iteran este array, agrúpano por `group`, e renderizan o widget
 * apropiado por `type.kind`.
 *
 * Orde dentro do array reflicte a orde recomendada de display dentro
 * de cada grupo.
 */
export const nodePropertyRegistry: readonly PropertyDescriptor[] = [
  // ── Identidade ──
  idDescriptor,
  fieldDescriptor({
    key: 'type',
    label: { en: 'Type', gl: 'Tipo' },
    type: { kind: 'enum', options: NODE_TYPE_OPTIONS },
    group: 'identity',
  }),
  fieldDescriptor({
    key: 'label',
    label: { en: 'Label', gl: 'Etiqueta' },
    type: { kind: 'localizedText' },
    group: 'identity',
  }),
  fieldDescriptor({
    key: 'description',
    label: { en: 'Description', gl: 'Descrición' },
    type: { kind: 'localizedText' },
    group: 'identity',
  }),
  // ── Aparencia ──
  fieldDescriptor({
    key: 'color',
    label: { en: 'Color', gl: 'Cor' },
    type: { kind: 'color' },
    group: 'appearance',
  }),
  fieldDescriptor({
    key: 'icon',
    label: { en: 'Icon', gl: 'Icona' },
    type: { kind: 'text' },
    group: 'appearance',
    describe: { en: 'Icon id (URL, emoji, etc.)', gl: 'Id de icona (URL, emoji, etc.)' },
  }),
  fieldDescriptor({
    key: 'shape',
    label: { en: 'Shape', gl: 'Forma' },
    type: { kind: 'enum', options: NODE_SHAPE_OPTIONS },
    group: 'appearance',
  }),
  fieldDescriptor({
    key: 'size',
    label: { en: 'Size', gl: 'Tamaño' },
    type: { kind: 'number', min: 0.01, step: 1 },
    group: 'appearance',
    describe: {
      en: 'Base size in layout units (>0). Default by type.',
      gl: 'Tamaño base en unidades de layout (>0). Default por tipo.',
    },
  }),
  // ── Lóxica (escalar) ──
  fieldDescriptor({
    key: 'tier',
    label: { en: 'Tier', gl: 'Tier' },
    type: { kind: 'number', step: 1 },
    group: 'logic',
  }),
  fieldDescriptor({
    key: 'maxTier',
    label: { en: 'Max tier', gl: 'Tier máximo' },
    type: { kind: 'number', min: 1, step: 1 },
    group: 'logic',
  }),
  // ── Estruturados (DECLARADOS — edición en 7.5c-ii) ──
  fieldDescriptor({
    key: 'cost',
    label: { en: 'Cost', gl: 'Custo' },
    type: { kind: 'structured', of: 'cost' },
    group: 'logic',
  }),
  fieldDescriptor({
    key: 'costPerTier',
    label: { en: 'Cost per tier', gl: 'Custo por tier' },
    type: { kind: 'structured', of: 'costPerTier' },
    group: 'logic',
  }),
  fieldDescriptor({
    key: 'tiers',
    label: { en: 'Tiers info', gl: 'Info de tiers' },
    type: { kind: 'structured', of: 'tiers' },
    group: 'logic',
  }),
  fieldDescriptor({
    key: 'effects',
    label: { en: 'Effects', gl: 'Efectos' },
    type: { kind: 'structured', of: 'effects' },
    group: 'logic',
  }),
  fieldDescriptor({
    key: 'prerequisites',
    label: { en: 'Prerequisites', gl: 'Prerrequisitos' },
    type: { kind: 'structured', of: 'prerequisites' },
    group: 'logic',
  }),
  fieldDescriptor({
    key: 'exclusions',
    label: { en: 'Exclusions', gl: 'Exclusións' },
    type: { kind: 'structured', of: 'exclusions' },
    group: 'logic',
  }),
]

/**
 * **Internos exportados** (para tests / consumidores avanzados que
 * queiran iterar as opcións de enum sen acoplarse aos descriptors).
 */
export { NODE_TYPE_OPTIONS, NODE_SHAPE_OPTIONS }
// ── FIN: nodePropertyRegistry ──
