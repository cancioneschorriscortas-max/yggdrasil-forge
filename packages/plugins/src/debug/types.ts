// ── INICIO: DebugPlugin types ──

import type { PluginLogLevel } from '@yggdrasil-forge/core'

/**
 * Opcións para DebugPlugin.
 */
export interface DebugOptions {
  /**
   * Se false, install() non rexistra ningún hook (plugin pasa a
   * estar "rexistrado pero inactivo").
   *
   * Default: true.
   */
  readonly enabled?: boolean

  /**
   * Nivel de log usado en tódalas mensaxes.
   *
   * Default: 'debug'.
   */
  readonly logLevel?: PluginLogLevel
}

// ── FIN: DebugPlugin types ──
