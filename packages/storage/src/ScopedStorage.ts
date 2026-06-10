// ── INICIO: ScopedStorage ──
// Adapter que envolve outro StorageAdapter e prefixa todas as claves
// cun scope. Usado para illar tenants nun storage compartido sen
// modificar o backend físico subxacente.
//
// Sub-fase 6.3

import { type Result, ok } from '@yggdrasil-forge/common'
import type { StorageAdapter } from './StorageAdapter.js'

const SEPARATOR = ':'

/**
 * Adapter que prefixa todas as claves cun `scope` antes de delegar a outro
 * `StorageAdapter`. Útil para illar tenants nun backend compartido.
 *
 * **Exemplo**:
 * ```ts
 * const base = new IndexedDBAdapter(...)
 * const tenantA = new ScopedStorage(base, 'tenant_a')
 * const tenantB = new ScopedStorage(base, 'tenant_b')
 * // tenantA.set('foo', 1) garda como 'tenant_a:foo'
 * // tenantA.clear() borra só claves baixo 'tenant_a:', nunca 'tenant_b:'
 * ```
 *
 * **Validación do scope**: rexéitase `''` e calquera scope que conteña
 * `':'` (reservado como separador). Lanza `Error` síncrono no constructor.
 *
 * **`watch` condicional**: expón `watch` só se o base storage a soporta
 * (preserva o contrato opcional de `StorageAdapter.watch?`). Comprobar
 * `if (scopedStorage.watch)` antes de chamar.
 *
 * **`clear()` é O(n)**: itera `list(scope:)` + `delete` cada clave para
 * preservar isolation cross-scope. NUNCA chama a `base.clear()`.
 *
 * **Anidación**: `new ScopedStorage(new ScopedStorage(base, 's1'), 's2')`
 * funciona transparentemente (claves físicas resultan `s2:s1:key`).
 */
export class ScopedStorage implements StorageAdapter {
  private readonly base: StorageAdapter
  private readonly prefix: string

  readonly watch?: (key: string, callback: (value: unknown) => void) => () => void

  constructor(base: StorageAdapter, scope: string) {
    if (scope === '') {
      throw new Error('ScopedStorage: scope cannot be empty')
    }
    if (scope.includes(SEPARATOR)) {
      throw new Error(`ScopedStorage: scope cannot contain '${SEPARATOR}' (reserved as separator)`)
    }
    this.base = base
    this.prefix = `${scope}${SEPARATOR}`

    if (typeof base.watch === 'function') {
      const baseWatch = base.watch.bind(base)
      const prefix = this.prefix
      this.watch = (key, callback) => baseWatch(`${prefix}${key}`, callback)
    }
    // senón, this.watch fica undefined (por non-asignación)
  }

  async get(key: string): Promise<Result<unknown | null>> {
    return this.base.get(`${this.prefix}${key}`)
  }

  async set(key: string, value: unknown): Promise<Result<void>> {
    return this.base.set(`${this.prefix}${key}`, value)
  }

  async delete(key: string): Promise<Result<void>> {
    return this.base.delete(`${this.prefix}${key}`)
  }

  async list(prefix?: string): Promise<Result<string[]>> {
    const scopedPrefix = prefix !== undefined ? `${this.prefix}${prefix}` : this.prefix
    const result = await this.base.list(scopedPrefix)
    /* v8 ignore next -- MemoryStorage.list non falla; defensivo para adapters con I/O */
    if (!result.ok) return result
    const cutLen = this.prefix.length
    return ok(result.value.map((k) => k.slice(cutLen)))
  }

  async clear(): Promise<Result<void>> {
    // Iterar list(scope:) + delete cada, para non borrar cross-scope.
    const listResult = await this.base.list(this.prefix)
    /* v8 ignore next -- MemoryStorage.list non falla; defensivo para adapters con I/O */
    if (!listResult.ok) return listResult
    for (const fullKey of listResult.value) {
      const deleteResult = await this.base.delete(fullKey)
      /* v8 ignore next 3 -- MemoryStorage.delete non falla; defensivo para adapters con I/O */
      if (!deleteResult.ok) {
        return deleteResult
      }
    }
    return ok(undefined)
  }
}
// ── FIN: ScopedStorage ──
