// ── INICIO: Tree types ──
// Definición global da árbore e estado runtime asociado.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { Locale } from '@yggdrasil-forge/common'
import type { EdgeDef } from './edge.js'
import type { I18nConfig } from './i18n.js'
import type { NodeDef, NodeInstance, Position } from './node.js'
import type { Budget, Resource } from './resources.js'

/**
 * Definición visual e funcional dun grupo / cluster de nodos.
 */
export interface GroupDef {
  readonly id: string
  readonly label: LocalizedString
  readonly color?: string
  readonly icon?: string
  /** IDs de nodos explícitos no grupo (alternativa a node.group). */
  readonly nodeIds?: readonly string[]
  readonly position?: Position
}

/**
 * Definición dun stat (variable global agregada polo StatComputer).
 *
 * O motor mantén un Record<statId, number> co valor actual calculado
 * a partir das StatContributions dos nodos desbloqueados.
 */
export interface StatDef {
  readonly id: string
  readonly label: LocalizedString
  /** Valor inicial cando ningún nodo contribúe. */
  readonly initial?: number
  /** Tope mínimo. */
  readonly min?: number
  /** Tope máximo. */
  readonly max?: number
  /** Formato preferido de presentación. */
  readonly format?: 'number' | 'percent' | 'currency'
}

/**
 * Configuración do layout para a árbore.
 *
 * O tipo concreto desenrolarase en 1.4. Por agora un placeholder estructurado.
 */
export interface LayoutConfig {
  readonly type: string // 'radial' | 'tree' | 'constellation' | 'grid' | 'web' | 'linear' | 'sphere_grid' | 'custom'
  /** Resto de campos específicos do layout type. */
  readonly [key: string]: unknown
}

/**
 * Definición declarativa completa dunha árbore.
 *
 * **Mutable a nivel motor:** `engine.applyChanges()` substitúe campos.
 * **Inmutable como input:** se se pasa unha TreeDef ao constructor de TreeEngine,
 * o motor non a muta directamente — fai unha copia interna e cambia esa.
 */
export interface TreeDef {
  readonly id: string
  /** Versión do esquema (sec. SCHEMA_VERSION de common). */
  readonly schemaVersion: string
  /** Versión do contido (semver libre, definido polo autor). */
  readonly version: string
  readonly label: LocalizedString
  readonly description?: LocalizedString
  readonly author?: string
  /** ID do nodo raíz (coroa, punto de entrada). */
  readonly rootNodeId?: string
  readonly nodes: readonly NodeDef[]
  readonly edges: readonly EdgeDef[]
  readonly groups?: readonly GroupDef[]
  /**
   * Recursos da economía da árbore.
   * Tipo concreto en 1.3 (resources.ts).
   */
  readonly resources?: readonly Resource[]
  readonly stats?: readonly StatDef[]
  /**
   * Presuposto inicial de recursos.
   * Tipo concreto en 1.3.
   */
  readonly startingBudget?: Budget
  readonly layout: LayoutConfig
  /** ID do tema visual. */
  readonly theme?: string
  /**
   * Configuración de i18n específica desta árbore.
   * Tipo concreto en 1.3 (i18n.ts engadirá I18nConfig en core).
   */
  readonly i18n?: I18nConfig
  readonly metadata?: Readonly<Record<string, unknown>>
  /** Sub-árbores aniñadas, indexadas por id. */
  readonly subtrees?: Readonly<Record<string, TreeDef>>
}

/**
 * Estado runtime da árbore: instancias de nodos, budget actual, stats calculados.
 *
 * O motor mantén isto en memoria e persísteo via StorageAdapter.
 */
export interface TreeState {
  /** Mapa de nodeId → instancia con estado actual. */
  nodes: Record<string, NodeInstance>
  /**
   * Presuposto actual (recursos restantes).
   * Tipo concreto en 1.3.
   */
  budget: Budget
  /** Stats calculados polo StatComputer (cache reactivo). */
  computedStats?: Record<string, number>
  /** Metadata runtime libre. */
  metadata?: Record<string, unknown>
  /** Estado das sub-árbores aniñadas, indexado por subtreeId. */
  subtreeStates?: Record<string, TreeState>
}
export interface TreeEngineOptions {
  readonly locale?: Locale
  readonly readOnly?: boolean
  /**
   * Configuración do rexistro de auditoría (AuditLogger).
   * Por defecto desactivado: cero overhead cando non se usa.
   */
  readonly audit?: {
    /** Activa o rexistro de accións. Default: false. */
    readonly enabled?: boolean
    /** Máximo de entradas en memoria (FIFO). Default: 1000. */
    readonly maxEntries?: number
  }
  /**
   * Función que devolve o instante actual en UTC ms.
   * Inxéctase no `TimeManager` interno do motor (sub-fase 2.3.b) para
   * que toda a lóxica temporal (canUnlock con `timeConstraints`,
   * `tick()`, `nextTickAt()`) use un reloxo virtual controlable.
   * Default en produción: `Date.now`. En tests ou contornos
   * deterministas, inxecta unha función que devolva un valor fixo ou
   * incrementable.
   */
  readonly timeNow?: () => number
}
// ── FIN: Tree types ──
