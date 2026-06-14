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

/**
 * Loadout: build cun nome obrigatorio para identificación por nome
 * (en contraste con Build que se identifica por id auto-xerado).
 *
 * Usado en `engine.saveLoadout(name)` / `engine.loadLoadout(name)`.
 * Os loadouts son named profiles para alternar entre configuracións
 * (ex. "Glass cannon" vs "Tank").
 */
export interface Loadout {
  /** Nome único do loadout (case-sensitive). Cero string vacío nin whitespace-only. */
  readonly name: string
  /** Build asociada ao loadout. */
  readonly build: Build
  /** Marca temporal UTC ms da última actualización. */
  readonly updatedAt: number
}
// ── FIN: Build types ──
