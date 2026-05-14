// ── INICIO: Time-based mechanics types ──
// Restricións temporais: caducidades, cooldowns, re-certificacións.

/**
 * Restricións temporais dun nodo.
 *
 * Mestura tres modos:
 * - UTC ms (absolutos): startsAt, expiresAt — timestamps directos
 * - Relativos (TZ-independentes): validForMs, cooldownMs, reCertifyAfterMs
 * - Calendario (TZ-aware): expiresAtCalendar para casos "expira o luns as 9am en Madrid"
 */
export interface TimeConstraints {
  readonly startsAt?: number
  readonly expiresAt?: number
  readonly expiresAtCalendar?: {
    readonly date: string
    readonly time: string
    readonly timezone: string
  }
  readonly validForMs?: number
  readonly cooldownMs?: number
  readonly reCertifyAfterMs?: number
}

/**
 * Opcións de configuración do TimeManager.
 */
export interface TimeManagerOptions {
  readonly enabled: boolean
  readonly checkIntervalMs?: number
  readonly leadTimeMs?: number
  readonly timezone?: string
}
// ── FIN: Time-based mechanics types ──
