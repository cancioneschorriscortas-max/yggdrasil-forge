// ── INICIO: LocalStorageAdapter ──
// Segunda implementación concreta de StorageAdapter. Wrapper sobre
// Storage interface estándar do DOM con serialización JSON e inversión
// de control. Sub-fase 3.2.b.

import {
  type ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import { ErrorCode as EC } from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/common'

/**
 * Opcións do constructor de LocalStorageAdapter.
 */
export interface LocalStorageAdapterOptions {
  /**
   * Backend Storage a usar. Por defecto `globalThis.localStorage`.
   * Permite inxectar mocks nos tests sen depender de jsdom/happy-dom.
   * Tamén permite usar `sessionStorage` ou polyfills compatibles.
   *
   * **Importante**: en Node puro `globalThis.localStorage` é `undefined`.
   * Os tests deben pasar `storage` explicitamente sempre.
   */
  readonly storage?: Storage
  /**
   * Locale para mensaxes de erro. Por defecto `'gl'` (coherente co
   * resto do motor).
   */
  readonly locale?: Locale
}

/**
 * Implementación de `StorageAdapter` sobre a interface `Storage` estándar
 * do DOM (por defecto `globalThis.localStorage`).
 *
 * **Serialización JSON**: os valores pasan por `JSON.stringify` ao gardar
 * e `JSON.parse` ao ler. Iso implica:
 * - Pérdese a identidade referencial (`set + get` devolve unha copia, non
 *   a mesma referencia).
 * - `undefined` como valor rexéitase explicitamente (`STORAGE_WRITE_FAILED`).
 * - `BigInt` e circular refs lanzan en `JSON.stringify` → `STORAGE_WRITE_FAILED`.
 * - `NaN` convértese en `null` (comportamento estándar de JSON).
 * - Funcións son ignoradas por JSON (propiedades con función desaparecen).
 *
 * **Asimetría con MemoryStorage**: MemoryStorage garda referencias directas
 * sen serialización; LocalStorageAdapter sempre serializa. A mesma TreeDef
 * gardada en MemoryStorage devolve a referencia orixinal (`===`); gardada
 * aquí, devolve unha copia profunda via JSON.
 *
 * **`watch` non se implementa**: o evento `storage` do DOM só se dispara
 * entre tabs, non na mesma tab. Implementar `watch` parcialmente sería
 * confuso. Os consumidores que necesiten observación deben combinar con
 * MemoryStorage en patrón cache, ou usar IndexedDBAdapter.
 *
 * **Inversión de control**: acepta un `Storage` inxectado no constructor
 * para tests sen jsdom e para usar `sessionStorage` ou polyfills.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly storage: Storage
  private readonly locale: Locale

  constructor(options: LocalStorageAdapterOptions = {}) {
    this.storage = options.storage ?? globalThis.localStorage
    this.locale = options.locale ?? 'gl'
  }

  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non existe.
   * Deserializa con `JSON.parse`. Valores corruptos (non JSON válido)
   * devolven err `STORAGE_READ_FAILED`.
   */
  async get(key: string): Promise<Result<unknown | null>> {
    let raw: string | null
    try {
      raw = this.storage.getItem(key)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          key,
          reason: 'getItem threw',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    if (raw === null) {
      return ok(null)
    }

    try {
      return ok(JSON.parse(raw))
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          key,
          reason: 'JSON parse failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Garda un valor para unha clave. Serializa con `JSON.stringify`.
   * Rexeita `undefined` explicitamente. Detecta `QuotaExceededError`
   * multi-navegador e mapéao a `STORAGE_QUOTA_EXCEEDED`.
   */
  async set(key: string, value: unknown): Promise<Result<void>> {
    // undefined non é serializable por JSON.stringify (devolve undefined, non string).
    if (value === undefined) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'undefined is not serializable to JSON',
        }),
      )
    }

    let serialized: string
    try {
      serialized = JSON.stringify(value)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'JSON.stringify failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    try {
      this.storage.setItem(key, serialized)
      return ok(undefined)
    } catch (e) {
      if (isQuotaExceededError(e)) {
        return err(
          this.makeError(EC.STORAGE_QUOTA_EXCEEDED, {
            key,
            originalErrorMessage: e instanceof Error ? e.message : String(e),
          }),
        )
      }
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'setItem threw',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Elimina o valor asociado a unha clave. Cero erro se non existe
   * (comportamento estándar de `Storage.removeItem`).
   */
  async delete(key: string): Promise<Result<void>> {
    try {
      this.storage.removeItem(key)
      return ok(undefined)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'removeItem threw',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Lista as claves que comezan por `prefix` (ou todas se non se pasa).
   * Usa `Storage.key(index)` con iteración manual. Ignora nulls
   * defensivamente (posible se outra tab modifica entre `length` e `key`).
   */
  async list(prefix?: string): Promise<Result<string[]>> {
    try {
      const keys: string[] = []
      const length = this.storage.length
      for (let i = 0; i < length; i++) {
        const key = this.storage.key(i)
        if (key === null) continue // defensivo; nunca debería pasar
        if (prefix === undefined || key.startsWith(prefix)) {
          keys.push(key)
        }
      }
      return ok(keys)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          reason: 'list iteration threw',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Elimina TODAS as claves. Operación destrutiva.
   */
  async clear(): Promise<Result<void>> {
    try {
      this.storage.clear()
      return ok(undefined)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          reason: 'clear threw',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Helper interno para crear YggdrasilError co locale da instancia.
   */
  private makeError(code: ErrorCode, context: Record<string, unknown>): YggdrasilError {
    const message = getErrorMessage(code, this.locale, context)
    return new YggdrasilError(code, message, { context })
  }
}

/**
 * Detecta `QuotaExceededError` de forma robusta para Chrome, Firefox,
 * Safari, iOS (códigos de DOMException 22 e 1014).
 */
function isQuotaExceededError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  // Chrome/Edge/Safari/Firefox modernos.
  if (e.name === 'QuotaExceededError') return true
  // Firefox antigo.
  if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  // Algúns Safari/iOS reportan código numérico.
  // DOMException code 22 = QUOTA_EXCEEDED_ERR
  // DOMException code 1014 = NS_ERROR_DOM_QUOTA_REACHED
  const code = (e as { code?: number }).code
  if (code === 22 || code === 1014) return true
  return false
}
// ── FIN: LocalStorageAdapter ──
