// ── INICIO: Resource types ──
// Recursos, custos e presupostos para a economía da árbore.

import type { LocalizedString } from '@yggdrasil-forge/common'

/**
 * Definición dun recurso da economía da árbore.
 *
 * Cada árbore pode definir múltiples recursos (ex: XP, puntos de habilidade,
 * ouro, mana...). Os nodos consumen recursos ao desbloquearse.
 *
 * @example
 * { id: 'xp', label: { gl: 'Experiencia', es: 'Experiencia', en: 'XP' }, initial: 0 }
 * { id: 'skill_points', label: 'Skill points', initial: 5, max: 100 }
 */
export interface Resource {
  readonly id: string
  readonly label: LocalizedString
  /** Identificador de icona ou emoji. */
  readonly icon?: string
  /** Cor visual asociada. */
  readonly color?: string
  /** Valor inicial cando se crea un novo TreeState. */
  readonly initial?: number
  /** Tope máximo (capacidade). */
  readonly max?: number
  /** Permite refund ao facer respec. */
  readonly refundable?: boolean
  /** Porcentaxe que se devolve no refund (0-100, defecto 100). */
  readonly refundPercent?: number
}

/**
 * Custo dunha acción (desbloquear, mellorar tier, etc.) en termos dun recurso.
 *
 * @example
 * { resourceId: 'xp', amount: 100 }
 * { resourceId: 'skill_points', amount: 1 }
 */
export interface Cost {
  readonly resourceId: string
  readonly amount: number
}

/**
 * Presuposto: cantidade actual de cada recurso disponible.
 *
 * É a representación runtime do "estado económico" da árbore.
 *
 * @example
 * { resources: { xp: 1250, skill_points: 3, gold: 500 } }
 */
export interface Budget {
  /** Mapa de resourceId → cantidade actual disponible. */
  resources: Record<string, number>
}
// ── FIN: Resource types ──
