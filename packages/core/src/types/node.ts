// ── INICIO: Node types ──
// Tipos para nodos: definición (frozen) e instancia (mutable).

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeContent } from './content.js'
import type { Effect } from './effects.js'
import type { ProgressSourceConfig } from './progress.js'
import type { Cost } from './resources.js'
import type { StatContribution } from './stats.js'
import type { TimeConstraints } from './time.js'
import type { TreeState } from './tree.js'
import type { TreeDef } from './tree.js'
import type { UnlockRule } from './unlock.js'

/**
 * Tipo semántico dun nodo.
 *
 * - `small` — Bonificación menor (estilo PoE small passive)
 * - `notable` — Bonificación significativa
 * - `keystone` — Cambia mecánicas fundamentais (con trade-off)
 * - `mastery` — Desbloqueado tras investir N puntos nun cluster
 * - `ascendancy` — Especialización de clase
 * - `root` — Punto de inicio (coroa en Oberón)
 * - `cluster` — Agrupador visual
 * - `gateway` — Abre/pecha ramas
 * - `milestone` — Marca de progreso (sen efecto mecánico)
 * - `subtree_anchor` — Ancora a outra TreeDef (composición)
 * - `custom` — Definido polo usuario
 */
export type NodeType =
  | 'small'
  | 'notable'
  | 'keystone'
  | 'mastery'
  | 'ascendancy'
  | 'root'
  | 'cluster'
  | 'gateway'
  | 'milestone'
  | 'subtree_anchor'
  | 'custom'

/**
 * Forma visual dun nodo. O renderer derívaa por `type` se o nodo non
 * especifica `shape`. Aditiva: novos valores en sub-fases futuras.
 */
export type NodeShape = 'circle' | 'square' | 'diamond' | 'hexagon' | 'octagon'

/**
 * Estado actual dun nodo na árbore.
 *
 * - `locked` — Non cumpre prerrequisitos
 * - `unlockable` — Cumpre prerrequisitos, pode desbloquearse
 * - `in_progress` — Parcialmente completado (educativo: 60%)
 * - `unlocked` — Desbloqueado (tier actual > 0)
 * - `maxed` — Todos os rangos completados
 * - `disabled` — Desactivado por exclusión ou regra dinámica
 * - `expired` — Caducou (time-based mechanics)
 */
export type NodeState =
  | 'locked'
  | 'unlockable'
  | 'in_progress'
  | 'unlocked'
  | 'maxed'
  | 'disabled'
  | 'expired'

/**
 * Posición 2D en coordenadas normalizadas (0-1) ou píxeles, segundo contexto.
 */
export interface Position {
  readonly x: number
  readonly y: number
}

/**
 * Definición declarativa dun nodo.
 *
 * **Inmutable:** Object.freeze(). Para modificar, usar `engine.applyChanges()`
 * que substituirá o NodeDef por outro novo (sec. 5.2 do MASTER).
 *
 * Os tipos avanzados (Cost, Effect, UnlockRule, TimeConstraints, StatContribution,
 * ProgressSourceConfig) defínense en módulos posteriores (1.3, 1.4) e referéncianse
 * como `unknown` por agora ata que estean dispoñibles.
 */
// ── INICIO: F9.1 — info por rango (tier) ──
/**
 * Información de presentación POR RANGO (tier) dun nodo multi-rango.
 *
 * Índice no array `NodeDef.tiers` = `tier - 1` (tier 1 → índice 0).
 * Complementa `costPerTier`/`effects` (custo/efectos por rango); aquí só
 * vai texto: etiqueta e descrición localizadas. Ambos campos opcionais.
 *
 * Caso GAIA: os 3 niveis dunha microskill ("Aprendiz/Oficial/Mestre" +
 * descrición de cada un). Caso xogo: "Rango 1: Iniciado".
 *
 * Deséñase extensible: campos futuros por rango (ex. criterio de acceso)
 * engádense como opcionais sen romper.
 */
export interface NodeTierInfo {
  /** Etiqueta do rango (ex. "Aprendiz"). Localizable. */
  readonly label?: LocalizedString
  /** Descrición do rango. Localizable. */
  readonly description?: LocalizedString
}
// ── FIN: F9.1 ──

export interface NodeDef {
  /** Identificador único do nodo dentro da súa árbore. */
  readonly id: string

  /** Tipo semántico do nodo. */
  readonly type: NodeType

  /** Etiqueta visible para o usuario (localizable). */
  readonly label: LocalizedString

  /** Descrición curta opcional. */
  readonly description?: LocalizedString

  /** Contido enriquecido para tooltips e paneles. */
  readonly content?: NodeContent

  /** Identificador de icona (URL, emoji, etc.). */
  readonly icon?: string

  /** Cor visual asociada ao nodo. */
  readonly color?: string

  /** Forma visual do nodo. Se ausente, o renderer derívaa por `type`. */
  readonly shape?: NodeShape

  /** Tamaño base en unidades de layout (raio para `circle`). > 0. Se ausente, derívase por `type`. */
  readonly size?: number

  /** Rango actual (para multi-tier nodes). */
  readonly tier?: number

  /** Rango máximo (default: 1). */
  readonly maxTier?: number

  /**
   * Custo para desbloquear (1ª tier).
   * Tipo concreto en 1.3 (resources.ts). Por agora: array de placeholder.
   */
  readonly cost?: readonly Cost[]

  /**
   * Custos escalados por tier (índice = tier - 1).
   * Tipo concreto en 1.3.
   */
  readonly costPerTier?: readonly (readonly Cost[])[]
  // ── INICIO: F9.1 — info de presentación por rango ──
  /**
   * Info de presentación por rango (etiqueta/descrición localizadas).
   * Índice = tier - 1. Complementa costPerTier/effects (non os duplica).
   */
  readonly tiers?: readonly NodeTierInfo[]
  // ── FIN: F9.1 ──

  /**
   * Efectos ao desbloquear (Effects DSL).
   * Tipo concreto en 1.4 (effects.ts).
   */
  readonly effects?: readonly Effect[]

  /**
   * Regra de desbloqueo (prerrequisitos).
   * Tipo concreto en 1.3 (unlock.ts).
   */
  readonly prerequisites?: UnlockRule

  /** IDs de nodos mutuamente excluíntes con este. */
  readonly exclusions?: readonly string[]

  /** Tags arbitrarias para filtrado, busca, agrupación. */
  readonly tags?: readonly string[]

  /** Palabras clave adicionais para busca (non visibles ao usuario). */
  readonly searchKeywords?: readonly string[]

  /** Metadata libre para o usuario. */
  readonly metadata?: Readonly<Record<string, unknown>>

  /** Posición no layout (manual ou calculada). */
  readonly position?: Position

  /** ID do grupo/cluster ao que pertence. */
  readonly group?: string

  /** Permite estado intermedio "in_progress" con porcentaxe. */
  readonly supportsProgress?: boolean

  /** Milestones de progreso (% como [25, 50, 75, 100]). */
  readonly progressMilestones?: readonly number[]

  /**
   * Configuración de fonte externa de progreso.
   * Tipo concreto en 1.4 (progress.ts).
   */
  readonly progressSource?: ProgressSourceConfig

  /** ID da sub-árbore que se abre dende este nodo. */
  readonly subtreeId?: string

  /**
   * Overrides locais aplicados á sub-árbore ancorada.
   * Tipo concreto cando TreeDef estea totalmente definido.
   */
  readonly subtreeOverrides?: Partial<TreeDef>

  /**
   * Restricións temporais (caducidade, cooldown, etc.).
   * Tipo concreto en 1.4 (time.ts).
   */
  readonly timeConstraints?: TimeConstraints

  /**
   * Contribucións a stats globais (StatComputer).
   * Tipo concreto en 1.4 (stats.ts).
   */
  readonly statContributions?: readonly StatContribution[]
}

/**
 * Instancia mutable dun nodo no estado activo do motor.
 *
 * Difire de NodeDef en que se actualiza con accións do usuario
 * (unlock, lock, setProgress) e contén estado runtime.
 */
export interface NodeInstance {
  /** Referencia ao NodeDef.id. */
  id: string
  /** Estado actual do nodo. */
  state: NodeState
  /** Tier actualmente desbloqueado (0 = locked, n = nivel n). */
  currentTier: number
  /** Porcentaxe de progreso (0-100), só se supportsProgress=true. */
  progress?: number
  /** Timestamp UTC de desbloqueo. */
  unlockedAt?: number
  /** Identificador de quen desbloqueou (multiplayer/multi-tenant). */
  unlockedBy?: string
  /** Timestamp UTC de caducidade efectiva. */
  expiresAt?: number
  /** Histórico de cambios de estado (audit local). */
  history?: StateChange[]
  /**
   * Visibilidad del nodo en la UI. Mutable a propósito (set_node_visibility).
   * `undefined` = no se ha establecido explícitamente; se trata como visible
   * por defecto. Sin `readonly` para mantener coherencia con el resto de
   * campos del tipo, que también son mutables vía StateStore.update (Immer
   * garantiza la inmutabilidad externa).
   */
  visible?: boolean
  /**
   * Estado da sub-árbore aniñada se o nodo é subtree_anchor.
   * Referencia circular: TreeState → NodeInstance → TreeState.
   */
  subtreeState?: TreeState
}

/**
 * Evento de cambio de estado para o histórico do nodo.
 */
export interface StateChange {
  readonly from: NodeState
  readonly to: NodeState
  readonly timestamp: number
  /** Causa do cambio: 'manual', 'cascade', 'respec', 'expired', etc. */
  readonly reason?: string
}

/**
 * Conxela un NodeDef recursivamente e devólveo tipado.
 *
 * Os arrays e obxectos aniñados tamén se conxelan para previr mutación accidental.
 *
 * @example
 * const node = freezeNodeDef({ id: 'x', type: 'small', label: 'X' })
 * // node está frozen; intentar mutar lanza TypeError en strict mode
 */
export function freezeNodeDef(def: NodeDef): NodeDef {
  return deepFreeze(def)
}

/**
 * Conxela recursivamente un valor. Implementación interna.
 *
 * Non se exporta — os consumidores deben usar `freezeNodeDef` ou outras
 * funcións dedicadas.
 */
function deepFreeze<T>(value: T): T {
  /* v8 ignore start -- defensivo: a recursión inferior filtra primitivos
     (só chama deepFreeze(child) se child é object), e a entrada inicial
     é sempre un NodeDef. Garda redundante por seguridade de tipos. */
  if (value === null || typeof value !== 'object') {
    return value
  }
  /* v8 ignore stop */

  if (Object.isFrozen(value)) {
    return value
  }

  Object.freeze(value)

  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key]
    if (child !== null && typeof child === 'object') {
      deepFreeze(child)
    }
  }

  return value
}
// ── FIN: Node types ──
