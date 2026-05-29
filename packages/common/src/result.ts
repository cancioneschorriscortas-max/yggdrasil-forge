// ── INICIO: Result type ──
// Tipo Result para operacións que poden fallar.
// Inspirado en Rust: forza ao consumidor a manexar ambos casos.
// Movido de @yggdrasil-forge/core/types/result.ts a common en sub-fase 3.0
// para que paquetes futuros (storage, validators, etc.) poidan importar
// Result sen acoplarse a core.

import type { YggdrasilError } from './errors/index.js'

/**
 * Resultado dunha operación: ou éxito con valor, ou fallo con error.
 *
 * @example
 * async function loadConfig(): Promise<Result<Config>> {
 *   try {
 *     const data = await fs.readFile('config.json', 'utf-8')
 *     return ok(JSON.parse(data))
 *   } catch (cause) {
 *     return err(new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'Failed to load', { cause }))
 *   }
 * }
 *
 * const result = await loadConfig()
 * if (!result.ok) {
 *   console.error(result.error.code)
 *   return
 * }
 * useConfig(result.value)
 */
export type Result<T, E = YggdrasilError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/**
 * Constrúe un Result con éxito.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/**
 * Constrúe un Result con fallo.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Type guard: verifica se un Result é exitoso.
 */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok
}

/**
 * Type guard: verifica se un Result é un erro.
 */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok
}

/**
 * Extrae o valor dun Result exitoso, ou lanza o error se é fallo.
 * Útil en tests ou cando o caller sabe que vai ser ok.
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value
  }
  throw result.error
}

/**
 * Extrae o valor dun Result exitoso, ou devolve un default se é fallo.
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}
// ── FIN: Result type ──
