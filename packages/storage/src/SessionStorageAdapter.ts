// ── INICIO: SessionStorageAdapter ──
// Wrapper sobre LocalStorageAdapter con sessionStorage como default.
// Sub-fase 3.4. Composición, NON herdanza (decisión 5.1).

import type { Locale, Result } from '@yggdrasil-forge/common'
import { LocalStorageAdapter } from './LocalStorageAdapter.js'
import type { StorageAdapter } from './StorageAdapter.js'

/**
 * Opcións do constructor de SessionStorageAdapter.
 */
export interface SessionStorageAdapterOptions {
  /**
   * Backend Storage a usar. Por defecto `globalThis.sessionStorage`.
   * Permite inxectar mocks ou outros backends compatibles con Storage.
   */
  readonly storage?: Storage

  /**
   * Locale para mensaxes de erro. Por defecto 'gl'.
   */
  readonly locale?: Locale
}

/**
 * Adapter de sessionStorage. Wrapper sobre `LocalStorageAdapter` con
 * `sessionStorage` como default. A semántica é idéntica a localStorage
 * salvo na duración: sessionStorage pérdese ao pechar o tab/ventá.
 *
 * Internamente delega en `LocalStorageAdapter` para cero duplicación
 * de lóxica (serialización JSON, manexo de QuotaExceeded, detección
 * multi-navegador, etc.).
 *
 * **Cero `watch`**: LocalStorageAdapter tampouco o implementa.
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly inner: LocalStorageAdapter

  constructor(options: SessionStorageAdapterOptions = {}) {
    this.inner = new LocalStorageAdapter({
      storage: options.storage ?? globalThis.sessionStorage,
      ...(options.locale !== undefined ? { locale: options.locale } : {}),
    })
  }

  get(key: string): Promise<Result<unknown | null>> {
    return this.inner.get(key)
  }

  set(key: string, value: unknown): Promise<Result<void>> {
    return this.inner.set(key, value)
  }

  delete(key: string): Promise<Result<void>> {
    return this.inner.delete(key)
  }

  list(prefix?: string): Promise<Result<string[]>> {
    return this.inner.list(prefix)
  }

  clear(): Promise<Result<void>> {
    return this.inner.clear()
  }
}
// ── FIN: SessionStorageAdapter ──
