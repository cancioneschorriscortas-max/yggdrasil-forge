// ── INICIO: clase YggdrasilError ──
// Clase base de error para todo o proxecto.
// Extende Error para compatibilidade con catch xenérico.

import type { ErrorCode } from './codes.js'

/**
 * Forma serializable dun YggdrasilError (sen instancias).
 * Útil para logs, telemetría, transmisión por rede.
 */
export interface SerializedError {
  name: 'YggdrasilError'
  code: ErrorCode
  message: string
  context?: Record<string, unknown>
  cause?: SerializedError | { name: string; message: string }
  stack?: string
}

/**
 * Opcións para construír un YggdrasilError.
 */
export interface YggdrasilErrorOptions {
  context?: Record<string, unknown>
  cause?: Error
}

/**
 * Error canónico de Yggdrasil Forge.
 */
export class YggdrasilError extends Error {
  public readonly code: ErrorCode
  public readonly context: Record<string, unknown> | undefined
  public override readonly cause: Error | undefined

  constructor(code: ErrorCode, message: string, options?: YggdrasilErrorOptions) {
    super(message)
    this.name = 'YggdrasilError'
    this.code = code
    this.context = options?.context
    this.cause = options?.cause

    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, ctor: unknown) => void
    }
    /* v8 ignore next 3 */
    if (typeof ErrorWithCapture.captureStackTrace === 'function') {
      ErrorWithCapture.captureStackTrace(this, YggdrasilError)
    }
  }

  /**
   * Serializa o error a un obxecto plano JSON-safe.
   */
  toJSON(): SerializedError {
    const serialized: SerializedError = {
      name: 'YggdrasilError',
      code: this.code,
      message: this.message,
    }

    if (this.context !== undefined) {
      serialized.context = this.context
    }

    if (this.cause !== undefined) {
      if (this.cause instanceof YggdrasilError) {
        serialized.cause = this.cause.toJSON()
      } else {
        serialized.cause = {
          name: this.cause.name,
          message: this.cause.message,
        }
      }
    }

    /* v8 ignore next 3 */
    if (this.stack !== undefined) {
      serialized.stack = this.stack
    }

    return serialized
  }
}

/**
 * Type guard: comproba se un valor é un YggdrasilError.
 */
export function isYggdrasilError(value: unknown): value is YggdrasilError {
  return value instanceof YggdrasilError
}
// ── FIN: clase YggdrasilError ──
