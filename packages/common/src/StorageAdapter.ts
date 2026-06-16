// ── INICIO: StorageAdapter interface ──
// Interface para implementacións de almacenamento (in-memory,
// localStorage, IndexedDB, filesystem).
//
// Movido de @yggdrasil-forge/storage/src/StorageAdapter.ts a
// common en sub-fase hardening-1 (DT-21) para que @core poda
// importar StorageAdapter sen acoplarse a @storage (paralelo ao
// movemento de Result en sub-fase 3.0).
//
// As implementacións concretas (MemoryStorage, LocalStorageAdapter,
// IndexedDBAdapter, FileSystemAdapter) permanecen en @storage.

import type { Result } from './result.js'

/**
 * Interface uniforme para backends de almacenamento de Yggdrasil Forge.
 *
 * Cada implementación (MemoryStorage, LocalStorageAdapter,
 * IndexedDBAdapter, etc.) cumpre este contrato. Os métodos devolven
 * `Result<T>` para forzar o manexo explícito de erros (lectura/escritura
 * fallida, cota excedida, claves non válidas).
 *
 * Implementacións concretas vén nas sub-fases 3.2-3.4. Esta sub-fase
 * só define o contrato.
 */
export interface StorageAdapter {
  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non existe.
   * Erros posibles: STORAGE_READ_FAILED.
   */
  get(key: string): Promise<Result<unknown | null>>

  /**
   * Garda un valor para unha clave. Sobreescribe se xa existe.
   * Erros posibles: STORAGE_WRITE_FAILED, STORAGE_QUOTA_EXCEEDED.
   */
  set(key: string, value: unknown): Promise<Result<void>>

  /**
   * Elimina o valor asociado a unha clave. Cero erro se non existe.
   * Erros posibles: STORAGE_WRITE_FAILED.
   */
  delete(key: string): Promise<Result<void>>

  /**
   * Lista as claves que comezan por `prefix` (ou todas se non se pasa).
   * Erros posibles: STORAGE_READ_FAILED.
   */
  list(prefix?: string): Promise<Result<string[]>>

  /**
   * Elimina TODAS as claves do storage. Operación destrutiva.
   * Erros posibles: STORAGE_WRITE_FAILED.
   */
  clear(): Promise<Result<void>>

  /**
   * (Opcional) Observa cambios nunha clave. Devolve función de
   * desubscrición. Backends que non soporten observación non implementan
   * este método.
   */
  watch?(key: string, callback: (value: unknown) => void): () => void
}
// ── FIN: StorageAdapter interface ──
