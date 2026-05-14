// ── INICIO: Build types ──
// Estado serializable dunha build do usuario.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { TreeState } from './tree.js'

/**
 * Estado serializable dunha build de usuario.
 */
export interface Build {
  readonly id: string
  readonly treeId: string
  readonly treeVersion: string
  readonly schemaVersion: string
  readonly label?: LocalizedString
  readonly author?: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly state: TreeState
  readonly parentBuildId?: string
  readonly tags?: readonly string[]
}

/**
 * Enlace compartible dunha build.
 */
export interface BuildShareLink {
  readonly url: string
  readonly shortCode: string
  readonly qrCode?: string
  readonly embedUrl?: string
}

/**
 * Snapshot dunha build (un punto gardado no tempo).
 */
export interface BuildSnapshot {
  readonly id: string
  readonly buildId: string
  readonly label?: string
  readonly createdAt: number
  readonly state: TreeState
}
// ── FIN: Build types ──
