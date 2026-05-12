// ── INICIO: Rich content types ──
// Contido enriquecido para tooltips, descricións detalladas e media.

import type { LocalizedString } from '@yggdrasil-forge/common'

/**
 * Contido enriquecido que pode aparecer en tooltips, paneles de detalle,
 * ou en calquera lugar que precise máis que texto plano.
 *
 * O tipo "custom" permite ao consumidor inxectar compoñentes propios.
 */
export type RichContent =
  | { readonly type: 'text'; readonly value: LocalizedString }
  | { readonly type: 'markdown'; readonly value: LocalizedString }
  | { readonly type: 'html'; readonly value: LocalizedString; readonly sanitized?: boolean }
  | {
      readonly type: 'image'
      readonly src: string
      readonly alt?: LocalizedString
      readonly width?: number
      readonly height?: number
    }
  | {
      readonly type: 'video'
      readonly src: string
      readonly poster?: string
      readonly provider?: 'youtube' | 'vimeo' | 'mp4'
    }
  | { readonly type: 'audio'; readonly src: string }
  | {
      readonly type: 'link'
      readonly href: string
      readonly label: LocalizedString
      readonly external?: boolean
    }
  | { readonly type: 'composite'; readonly items: readonly RichContent[] }
  | {
      readonly type: 'custom'
      readonly componentId: string
      readonly props?: Readonly<Record<string, unknown>>
    }

/**
 * Conxunto de contidos asociados a un nodo para distintos contextos de presentación.
 */
export interface NodeContent {
  /** Mostrado en tooltips ao pasar por riba do nodo. */
  readonly tooltip?: RichContent
  /** Mostrado en vista detallada (panel lateral, modal). */
  readonly detail?: RichContent
  /** Vista previa curta (hover rápido). */
  readonly preview?: RichContent
  /** Contido revelado só despois de desbloquear o nodo. */
  readonly unlocked?: RichContent
  /** Texto poético / atmosférico (estilo Oberón). */
  readonly flavor?: LocalizedString
}
// ── FIN: Rich content types ──
