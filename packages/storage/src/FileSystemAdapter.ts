// ── INICIO: FileSystemAdapter ──
// Cuarta implementación concreta de StorageAdapter. Wrapper sobre OPFS
// (Origin Private File System) con serialización JSON e estrutura plana.
// Sub-fase 3.4.

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
import type { StorageAdapter } from './StorageAdapter.js'

/**
 * Opcións do constructor de FileSystemAdapter.
 */
export interface FileSystemAdapterOptions {
  /**
   * Nome do directorio OPFS no que se gardarán os ficheiros.
   * **Obrigatorio**: cada consumidor decide o seu directorio. Permite
   * illar entre sub-aplicacións, sesións, estudantes, etc.
   * Cero default razoable.
   *
   * Restrición: o nome NON debe conter `/` nin `\\`.
   */
  readonly directoryName: string

  /**
   * StorageManager a usar. Por defecto `globalThis.navigator?.storage`.
   * Permite inxectar `opfs-mock` nos tests sen DOM.
   */
  readonly storage?: StorageManager

  /**
   * Locale para mensaxes de erro. Por defecto 'gl'.
   */
  readonly locale?: Locale
}

/**
 * Implementación de `StorageAdapter` sobre OPFS (Origin Private File System).
 *
 * **OPFS, NON File System Access API**: usa
 * `navigator.storage.getDirectory()` — soportado en todos os navegadores
 * modernos desde marzo 2023 (Chrome, Edge, Firefox, Safari, Opera).
 * Cero pop-ups nin diálogos; cero permisos requeridos.
 *
 * **Estrutura plana**: cada key mapéase a un ficheiro no directorio do
 * adapter. Cero subdirectorios. Keys que conteñan `/` ou `\\` rexéitanse
 * con `STORAGE_WRITE_FAILED`/`STORAGE_READ_FAILED`.
 *
 * **Serialización JSON**: valores pasan por `JSON.stringify`/`JSON.parse`.
 * Tipos non serializables (undefined, BigInt, circular refs, funcións)
 * rexéitanse igual ca en LocalStorageAdapter.
 *
 * **Asimetría con IndexedDBAdapter**: FileSystemAdapter rexeita
 * undefined/BigInt/funcións/circular refs (igual ca LocalStorageAdapter,
 * polo uso de JSON). IndexedDBAdapter acéptaos via structured clone nativo.
 *
 * **Asimetría con MemoryStorage**: FileSystemAdapter serializa (copia via
 * JSON, perde identidade referencial). MemoryStorage garda referencias
 * directas.
 *
 * **`watch` non se implementa**: OPFS non ten observador nativo
 * intra-origin. Os consumidores que necesiten observación deben combinar
 * con MemoryStorage en patrón cache.
 *
 * **Apertura lazy**: o constructor é sync; o directorio OPFS ábrese na
 * primeira operación e cache-ase para conexión única por instancia.
 */
export class FileSystemAdapter implements StorageAdapter {
  private readonly directoryName: string
  private readonly storage: StorageManager
  private readonly locale: Locale
  private dirPromise: Promise<FileSystemDirectoryHandle> | null = null

  constructor(options: FileSystemAdapterOptions) {
    this.directoryName = options.directoryName
    this.storage = options.storage ?? globalThis.navigator?.storage
    this.locale = options.locale ?? 'gl'
  }

  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non existe.
   * Deserializa con `JSON.parse`. Valores corruptos (non JSON válido)
   * devolven err `STORAGE_READ_FAILED`.
   */
  async get(key: string): Promise<Result<unknown | null>> {
    const invalid = this.invalidKeyReason(key)
    if (invalid !== null) {
      return err(this.makeError(EC.STORAGE_READ_FAILED, { key, reason: invalid }))
    }

    let dir: FileSystemDirectoryHandle
    try {
      dir = await this.getDirectory()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          key,
          reason: 'directory open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    let fileHandle: FileSystemFileHandle
    try {
      fileHandle = await dir.getFileHandle(key)
    } catch (e) {
      // NotFoundError → clave inexistente → ok(null).
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        return ok(null)
      }
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          key,
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    try {
      const file = await fileHandle.getFile()
      const text = await file.text()
      return ok(JSON.parse(text))
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
   * Rexeita `undefined` e tipos non serializables.
   * Keys con `/` ou `\\` rexéitanse con STORAGE_WRITE_FAILED.
   */
  async set(key: string, value: unknown): Promise<Result<void>> {
    const invalid = this.invalidKeyReason(key)
    if (invalid !== null) {
      return err(this.makeError(EC.STORAGE_WRITE_FAILED, { key, reason: invalid }))
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

    // JSON.stringify(undefined) devolve `undefined`, non string.
    if (serialized === undefined) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'undefined is not serializable to JSON',
        }),
      )
    }

    let dir: FileSystemDirectoryHandle
    try {
      dir = await this.getDirectory()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'directory open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    try {
      const fileHandle = await dir.getFileHandle(key, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(serialized)
      await writable.close()
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
   * (NotFoundError ignorado).
   */
  async delete(key: string): Promise<Result<void>> {
    const invalid = this.invalidKeyReason(key)
    if (invalid !== null) {
      return err(this.makeError(EC.STORAGE_WRITE_FAILED, { key, reason: invalid }))
    }

    let dir: FileSystemDirectoryHandle
    try {
      dir = await this.getDirectory()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          key,
          reason: 'directory open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    try {
      await dir.removeEntry(key)
      return ok(undefined)
    } catch (e) {
      // NotFoundError → clave inexistente; non é erro.
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        return ok(undefined)
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
   * Lista as claves que comezan por `prefix` (ou todas se non se pasa).
   * Itera entries do directorio; filtra defensivamente a só ficheiros.
   */
  async list(prefix?: string): Promise<Result<string[]>> {
    let dir: FileSystemDirectoryHandle
    try {
      dir = await this.getDirectory()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          reason: 'directory open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    try {
      const keys: string[] = []
      for await (const [name, handle] of dir.entries()) {
        // Filtrar a só ficheiros (defensivo); cero subdirectorios.
        if (handle.kind === 'file') {
          if (prefix === undefined || name.startsWith(prefix)) {
            keys.push(name)
          }
        }
      }
      return ok(keys)
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_READ_FAILED, {
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  /**
   * Elimina TODAS as claves. Itera primeiro a unha lista, despois borra
   * (modificar o directorio durante iteración é comportamento non
   * especificado).
   */
  async clear(): Promise<Result<void>> {
    let dir: FileSystemDirectoryHandle
    try {
      dir = await this.getDirectory()
    } catch (e) {
      return err(
        this.makeError(EC.STORAGE_WRITE_FAILED, {
          reason: 'directory open failed',
          originalErrorMessage: e instanceof Error ? e.message : String(e),
        }),
      )
    }

    try {
      const names: string[] = []
      for await (const name of dir.keys()) {
        names.push(name)
      }
      for (const name of names) {
        await dir.removeEntry(name)
      }
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
   * Apertura lazy do directorio OPFS. Cache-a para conexión única.
   */
  private async getDirectory(): Promise<FileSystemDirectoryHandle> {
    if (this.dirPromise !== null) {
      return this.dirPromise
    }

    this.dirPromise = (async () => {
      const root = await this.storage.getDirectory()
      return root.getDirectoryHandle(this.directoryName, { create: true })
    })()

    return this.dirPromise
  }

  /**
   * Valida que a key non conteña `/` nin `\\`.
   * Devolve o motivo do rexeitamento ou null se é válida.
   */
  private invalidKeyReason(key: string): string | null {
    if (key.includes('/')) return 'key contains forward slash'
    if (key.includes('\\')) return 'key contains backslash'
    return null
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
 * Detecta QuotaExceededError de forma robusta (Chrome, Firefox, Safari, iOS).
 * Patrón idéntico a LocalStorageAdapter e IndexedDBAdapter.
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
// ── FIN: FileSystemAdapter ──
