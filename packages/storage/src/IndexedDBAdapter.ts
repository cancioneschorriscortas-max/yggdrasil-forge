// ── INICIO: IndexedDBAdapter ──
// Terceira implementación concreta de StorageAdapter. Wrapper sobre
// IndexedDB nativo con apertura lazy e structured clone nativo.
// Sub-fase 3.3.

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
 * Opcións do constructor de IndexedDBAdapter.
 */
export interface IndexedDBAdapterOptions {
  /**
   * Nome da base de datos IndexedDB. **Obrigatorio**: a diferenza de
   * localStorage (singleton global), cada consumidor decide o seu nome.
   * Permite illar bases por estudante, sesión, etc.
   * (ex: 'oberon-{studentId}'). Cero default razoable.
   */
  readonly databaseName: string

  /**
   * Factory IndexedDB a usar. Por defecto `globalThis.indexedDB`.
   * Permite inxectar `fake-indexeddb` nos tests (cero jsdom necesario)
   * ou outros backends compatibles con IDBFactory en Node.
   *
   * **Importante**: en Node puro `globalThis.indexedDB` é `undefined`.
   * Os tests deben pasar `factory` explicitamente sempre.
   */
  readonly factory?: IDBFactory

  /**
   * Locale para mensaxes de erro. Por defecto 'gl' (coherencia co
   * resto do motor; ver TreeDefValidator).
   */
  readonly locale?: Locale
}

/**
 * Implementación de `StorageAdapter` sobre IndexedDB nativo.
 *
 * **Apertura lazy**: o constructor é sync; a BD ábrese na primeira
 * operación e cache-ase para conexión única por instancia. Se a
 * apertura falla, o adapter é inutilizable (cero recuperación nesta
 * sub-fase).
 *
 * **Structured clone nativo**: IndexedDB acepta valores arbitrarios
 * (Date, Map, Set, ArrayBuffer, undefined, null, NaN) sen serialización
 * manual. Rexeita funcións e símbolos (DataCloneError → STORAGE_WRITE_FAILED).
 *
 * **Asimetría con MemoryStorage**: ambos aceptan undefined; IndexedDB
 * tamén acepta Date/Map/Set/ArrayBuffer nativamente.
 *
 * **Asimetría con LocalStorageAdapter**: IndexedDB acepta undefined e
 * tipos complexos; LocalStorageAdapter rexeita undefined e copia via
 * JSON (perde identidade referencial).
 *
 * **`watch` non se implementa**: IndexedDB non ten observador nativo
 * intra-database. Os consumidores que necesiten observación deben
 * combinar con MemoryStorage en patrón cache.
 *
 * **version=1 fixa** con un único object store `'storage'`. Migracións
 * de schema → sub-fase 3.5.
 */
export class IndexedDBAdapter implements StorageAdapter {
  private readonly databaseName: string
  private readonly factory: IDBFactory
  private readonly locale: Locale
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(options: IndexedDBAdapterOptions) {
    this.databaseName = options.databaseName
    this.factory = options.factory ?? globalThis.indexedDB
    this.locale = options.locale ?? 'gl'
  }

  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non existe.
   * IndexedDB `get` devolve `undefined` para claves inexistentes;
   * convértese a `null` para coherencia con StorageAdapter.
   */
  async get(key: string): Promise<Result<unknown | null>> {
    let db: IDBDatabase
    try {
      db = await this.getDb()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          key,
          reason: 'database open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    const tx = db.transaction('storage', 'readonly')
    const store = tx.objectStore('storage')

    try {
      const value = await promisifyRequest(store.get(key))
      return ok(value === undefined ? null : value)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          key,
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Garda un valor para unha clave. Usa `store.put(value, key)` con
   * key externo. Structured clone rexeita funcións/símbolos
   * (DataCloneError → STORAGE_WRITE_FAILED).
   * Acepta `undefined` (asimetría con LocalStorageAdapter).
   */
  async set(key: string, value: unknown): Promise<Result<void>> {
    let db: IDBDatabase
    try {
      db = await this.getDb()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'database open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    const tx = db.transaction('storage', 'readwrite')
    const store = tx.objectStore('storage')

    try {
      await promisifyRequest(store.put(value, key))
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
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Elimina o valor asociado a unha clave. Cero erro se non existe
   * (comportamento estándar de IndexedDB).
   */
  async delete(key: string): Promise<Result<void>> {
    let db: IDBDatabase
    try {
      db = await this.getDb()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'database open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    const tx = db.transaction('storage', 'readwrite')
    const store = tx.objectStore('storage')

    try {
      await promisifyRequest(store.delete(key))
      return ok(undefined)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Lista as claves que comezan por `prefix` (ou todas se non se pasa).
   * Usa `getAllKeys` e filtra defensivamente a `string[]` (IndexedDB
   * pode ter keys non-string; nós só gardamos strings).
   */
  async list(prefix?: string): Promise<Result<string[]>> {
    let db: IDBDatabase
    try {
      db = await this.getDb()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          reason: 'database open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    const tx = db.transaction('storage', 'readonly')
    const store = tx.objectStore('storage')

    try {
      const keys = await promisifyRequest(store.getAllKeys())
      // getAllKeys devolve IDBValidKey[]; filtrar a string[] defensivamente.
      const stringKeys = keys.filter((k): k is string => typeof k === 'string')
      if (prefix === undefined) {
        return ok(stringKeys)
      }
      return ok(stringKeys.filter((k) => k.startsWith(prefix)))
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Elimina TODAS as claves. Operación destrutiva.
   */
  async clear(): Promise<Result<void>> {
    let db: IDBDatabase
    try {
      db = await this.getDb()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          reason: 'database open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    const tx = db.transaction('storage', 'readwrite')
    const store = tx.objectStore('storage')

    try {
      await promisifyRequest(store.clear())
      return ok(undefined)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Abre a BD de forma lazy na primeira chamada. Cache-a para conexión
   * única por instancia. Se a apertura falla, dbPromise queda rejected
   * e todas as operacións posteriores fallan co mesmo erro.
   */
  private async getDb(): Promise<IDBDatabase> {
    if (this.dbPromise !== null) {
      return this.dbPromise
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const openReq = this.factory.open(this.databaseName, 1)

      openReq.onupgradeneeded = () => {
        const db = openReq.result
        // Crear object store 'storage' se non existe.
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage')
        }
      }

      openReq.onsuccess = () => resolve(openReq.result)
      openReq.onerror = () => reject(openReq.error)
      openReq.onblocked = () => reject(new Error('IndexedDB open blocked'))
    })

    return this.dbPromise
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
 * Envuelve un IDBRequest nunha Promise.
 */
function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Detecta `QuotaExceededError` de forma robusta (Chrome, Firefox,
 * Safari, iOS). Patrón idéntico a LocalStorageAdapter.
 * Candidato a extracción compartida en sub-fase de hardening futura.
 */
function isQuotaExceededError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  if (e.name === 'QuotaExceededError') return true
  if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  const code = (e as { code?: number }).code
  if (code === 22 || code === 1014) return true
  return false
}
// ── FIN: IndexedDBAdapter ──
