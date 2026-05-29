// ── INICIO: StorageAdapter interface ──
// Contrato uniforme para backends de almacenamento de Yggdrasil Forge.
// Sub-fase 3.1 — só define a interface. Implementacións en 3.2-3.4.

import type { Result } from '@yggdrasil-forge/common'

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
