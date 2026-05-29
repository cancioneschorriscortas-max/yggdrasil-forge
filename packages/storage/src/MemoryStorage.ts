// ── INICIO: MemoryStorage ──
// Primeira implementación concreta de StorageAdapter. Backend en
// memoria sobre Map<string, unknown>. Cero serialización. Ideal para
// tests, SSR, e contextos sen storage persistente.
//
// Sub-fase 3.2.a

import { type Result, ok } from '@yggdrasil-forge/common'
import type { StorageAdapter } from './StorageAdapter.js'

/**
 * Implementación de `StorageAdapter` en memoria sobre `Map<string, unknown>`.
 *
 * **Cero serialización**: os valores gárdanse por referencia directa.
 * Se o consumidor pasa un obxecto e despois muta o orixinal, o valor
 * almacenado tamén muta. É comportamento esperado e documentado.
 * Os consumidores que queiran inmutabilidade deben pasar copias profundas.
 *
 * **Asimetría con LocalStorageAdapter**: un valor pasado por `MemoryStorage`
 * devolve a mesma referencia (`===`). Pasado por `LocalStorageAdapter`,
 * perde a identidade (é un `JSON.parse(JSON.stringify(x))`). Ambos son
 * comportamentos correctos para as súas respectivas pezas.
 *
 * Ideal para tests unitarios, SSR e calquera contexto sen persistencia.
 */
export class MemoryStorage implements StorageAdapter {
  private readonly data = new Map<string, unknown>()
  private readonly watchers = new Map<string, Set<(value: unknown) => void>>()

  // Constructor sen opcións de forma deliberada (sub-fase 3.2.a: peza mínima).
  // Se algún día se precisa precarga, engadirase como método `seed()` explícito.

  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non existe.
   * Nunca lanza; os valores devoltos son referencias directas (sen clone).
   */
  async get(key: string): Promise<Result<unknown | null>> {
    return ok(this.data.get(key) ?? null)
  }

  /**
   * Garda un valor para unha clave. Sobreescribe se xa existe.
   * Garda a referencia directa (sen clone). Notifica os watchers.
   * Nunca falla en condicións normais (memoria infinita teórica).
   */
  async set(key: string, value: unknown): Promise<Result<void>> {
    this.data.set(key, value)
    this.notifyWatchers(key, value)
    return ok(undefined)
  }

  /**
   * Elimina o valor asociado a unha clave. Cero erro se non existe.
   * Notifica os watchers con `null` indicando que a clave foi borrada.
   */
  async delete(key: string): Promise<Result<void>> {
    this.data.delete(key)
    this.notifyWatchers(key, null)
    return ok(undefined)
  }

  /**
   * Lista as claves que comezan por `prefix` (ou todas se non se pasa).
   * Devolve as claves na orde de inserción (comportamento de Map).
   */
  async list(prefix?: string): Promise<Result<string[]>> {
    const keys = Array.from(this.data.keys())
    if (prefix === undefined) {
      return ok(keys)
    }
    return ok(keys.filter((k) => k.startsWith(prefix)))
  }

  /**
   * Elimina TODAS as claves. Notifica os watchers de cada clave con `null`.
   * Operación destrutiva. Non lanza en storage baleiro.
   */
  async clear(): Promise<Result<void>> {
    const keys = Array.from(this.data.keys())
    this.data.clear()
    for (const key of keys) {
      this.notifyWatchers(key, null)
    }
    return ok(undefined)
  }

  /**
   * Observa cambios nunha clave. O callback recibe o novo valor cando a
   * clave se modifica, ou `null` cando se borra (vía `delete` ou `clear`).
   * Devolve función de desubscrición — chamar para deixar de observar.
   *
   * Múltiples callbacks na mesma clave están soportados.
   * Un callback que lanza erro non rompe os outros watchers.
   */
  watch(key: string, callback: (value: unknown) => void): () => void {
    let set = this.watchers.get(key)
    if (set === undefined) {
      set = new Set()
      this.watchers.set(key, set)
    }
    set.add(callback)

    return () => {
      const s = this.watchers.get(key)
      if (s !== undefined) {
        s.delete(callback)
        if (s.size === 0) {
          this.watchers.delete(key)
        }
      }
    }
  }

  /**
   * Notifica todos os callbacks rexistrados para unha clave.
   * Usa un snapshot de Set por se algún callback chama unsubscribe durante
   * a iteración. Illa os erros de callbacks externos.
   */
  private notifyWatchers(key: string, value: unknown): void {
    const set = this.watchers.get(key)
    if (set === undefined) return
    for (const cb of Array.from(set)) {
      try {
        cb(value)
      } catch {
        // Ignora erros de callbacks externos (illa de fallos).
        // Razón: un callback malo non debe romper outros watchers.
      }
    }
  }
}
// ── FIN: MemoryStorage ──
