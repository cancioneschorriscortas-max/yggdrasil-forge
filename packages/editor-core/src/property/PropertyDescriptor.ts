// ── INICIO: PropertyDescriptor ──
// **Property Registry** — describe a forma EDITABLE dun NodeDef.
//
// **Principio do Domain Model** (Briefing 7.5c §0): o Registry describe
// CONCEPTOS, non widgets; o widget resólveo o contexto. O mesmo
// Registry pode alimentar unha UI React, unha CLI, ou unha futura UI
// Tauri/web — sempre describindo o que se pode editar e como
// productizar o cambio (vía Commands).
//
// **Headless por deseño**: os descriptors non saben de React. Cada
// descriptor expón:
//   - `get(node)`: como ler o valor actual desde un NodeDef.
//   - `set(nodeId, value)`: como producir o Command que aplica o cambio
//     (sempre `setNodeField` co campo e tipo correctos).
//
// O Inspector React resolve widgets segundo o `type.kind`; o engine
// recibe os Commands e aplica transaccións con validación → undo/redo
// xa funciona pra edicións.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeDef } from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'

/**
 * Tipo discriminado para o widget xenérico que un campo precisa. As
 * UI consumidoras (Inspector React aquí, futuras Tauri/web) mapean
 * cada `kind` ao widget apropiado.
 */
export type PropertyType =
  | { readonly kind: 'text' }
  | { readonly kind: 'localizedText' }
  | {
      readonly kind: 'number'
      readonly min?: number
      readonly max?: number
      readonly step?: number
    }
  /** Lista pechada de valores. As opcións dáas o descriptor (deriva da unión do tipo de @core). */
  | { readonly kind: 'enum'; readonly options: readonly string[] }
  | { readonly kind: 'color' }
  | { readonly kind: 'boolean' }
  /**
   * **Campo estruturado** (effects, prerequisites, exclusions, cost,
   * etc.). Declarado en 7.5c-i para que o Registry sexa completo, pero
   * a EDICIÓN só vén en 7.5c-ii (sub-editores + gate descriptor↔manifesto).
   * En -i, o Inspector amósao como un resumo de lectura.
   */
  | {
      readonly kind: 'structured'
      readonly of: 'effects' | 'prerequisites' | 'exclusions' | 'cost' | 'tiers' | 'costPerTier'
    }

/**
 * Descriptor concreto dun campo do NodeDef.
 *
 * @template T — tipo do valor (correlaciona con NodeDef[key]).
 */
export interface PropertyDescriptor<T = unknown> {
  /**
   * Nome do campo no `NodeDef`. Tamén usado como id estable do
   * descriptor.
   */
  readonly key: string
  /** Etiqueta visible para o usuario (localizable). */
  readonly label: LocalizedString
  /** Tipo do widget que require + parametrización (min/max, opcións…). */
  readonly type: PropertyType
  /**
   * Sección dentro do Inspector. v1 usa 3 grupos: 'identity' /
   * 'appearance' / 'logic' (rotular como 'Identidade' / 'Aparencia' /
   * 'Lóxica' na UI; a tradución a outra locale é responsabilidade
   * do Inspector).
   */
  readonly group: 'identity' | 'appearance' | 'logic'
  /** Campo non editable (ex.: id). O Inspector deshabilita o widget. */
  readonly readonly?: boolean
  /**
   * Marca o campo como "avanzado" (Briefing 7.5c-U): o Inspector
   * agrupa estes baixo unha sección "Avanzado" **pregada por defecto**
   * para non abafar ao usuario medio. Os non-avanzados van en "Básico"
   * (sempre visible).
   */
  readonly advanced?: boolean
  /** Tooltip/hint opcional. */
  readonly describe?: LocalizedString
  /** Lee o valor actual desde un NodeDef. */
  get(node: NodeDef): T | undefined
  /**
   * Produce o Command que aplica o novo valor. **Cero efecto colateral**;
   * o engine despois dispatch + valida.
   */
  set(nodeId: string, value: T): Command
}
// ── FIN: PropertyDescriptor ──
