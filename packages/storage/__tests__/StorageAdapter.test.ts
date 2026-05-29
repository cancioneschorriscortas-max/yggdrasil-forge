import {
  ErrorCode,
  type Result,
  YggdrasilError,
  err,
  isErr,
  isOk,
  ok,
} from '@yggdrasil-forge/common'
// ── INICIO: tests de StorageAdapter interface ──
import { describe, expect, it } from 'vitest'
import type { StorageAdapter } from '../src/StorageAdapter.js'

// Mock interno para validar a forma da interface.
// Non é un test de MockStorage: é un vehículo para verificar
// que o contrato StorageAdapter é implementable e ergonómico.
class MockStorage implements StorageAdapter {
  private data = new Map<string, unknown>()

  async get(key: string): Promise<Result<unknown | null>> {
    return ok(this.data.get(key) ?? null)
  }

  async set(key: string, value: unknown): Promise<Result<void>> {
    this.data.set(key, value)
    return ok(undefined)
  }

  async delete(key: string): Promise<Result<void>> {
    this.data.delete(key)
    return ok(undefined)
  }

  async list(prefix?: string): Promise<Result<string[]>> {
    const keys = [...this.data.keys()]
    const filtered = prefix !== undefined ? keys.filter((k) => k.startsWith(prefix)) : keys
    return ok(filtered)
  }

  async clear(): Promise<Result<void>> {
    this.data.clear()
    return ok(undefined)
  }
}

// MockStorage con watch para verificar que o método opcional funciona
class MockStorageWithWatch extends MockStorage {
  watch(key: string, callback: (value: unknown) => void): () => void {
    // Mock trivial: non emite nada, só devolve a función de desubscrición
    void key
    void callback
    return () => {
      // desubscrición non-op — mock sen efectos secundarios
    }
  }
}

// MockStorage que simula erros para verificar a propagación
class MockStorageWithErrors implements StorageAdapter {
  async get(_key: string): Promise<Result<unknown | null>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'Lectura fallida'))
  }

  async set(_key: string, _value: unknown): Promise<Result<void>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_QUOTA_EXCEEDED, 'Cota excedida'))
  }

  async delete(_key: string): Promise<Result<void>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_WRITE_FAILED, 'Escritura fallida'))
  }

  async list(_prefix?: string): Promise<Result<string[]>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'Lectura fallida'))
  }

  async clear(): Promise<Result<void>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_WRITE_FAILED, 'Escritura fallida'))
  }
}

describe('StorageAdapter interface', () => {
  it('MockStorage implementa StorageAdapter (compilación = test)', () => {
    // Se este test compila, a interface é implementable
    const adapter: StorageAdapter = new MockStorage()
    expect(adapter).toBeDefined()
  })

  it('get con clave inexistente devolve ok(null)', async () => {
    const adapter = new MockStorage()
    const result = await adapter.get('non-existent')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('get con clave existente devolve ok(value)', async () => {
    const adapter = new MockStorage()
    await adapter.set('key1', { data: 42 })
    const result = await adapter.get('key1')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({ data: 42 })
    }
  })

  it('set garda e get recupera o valor', async () => {
    const adapter = new MockStorage()
    const setResult = await adapter.set('mykey', 'myvalue')
    expect(isOk(setResult)).toBe(true)
    const getResult = await adapter.get('mykey')
    expect(isOk(getResult)).toBe(true)
    if (isOk(getResult)) {
      expect(getResult.value).toBe('myvalue')
    }
  })

  it('delete elimina e get posterior devolve ok(null)', async () => {
    const adapter = new MockStorage()
    await adapter.set('toDelete', 'valor')
    const delResult = await adapter.delete('toDelete')
    expect(isOk(delResult)).toBe(true)
    const getResult = await adapter.get('toDelete')
    expect(isOk(getResult)).toBe(true)
    if (isOk(getResult)) {
      expect(getResult.value).toBeNull()
    }
  })

  it('delete con clave inexistente non lanza e devolve ok(undefined)', async () => {
    const adapter = new MockStorage()
    const result = await adapter.delete('non-existent')
    expect(isOk(result)).toBe(true)
  })

  it('list() sen prefix devolve todas as claves', async () => {
    const adapter = new MockStorage()
    await adapter.set('a', 1)
    await adapter.set('b', 2)
    await adapter.set('c', 3)
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['a', 'b', 'c'])
    }
  })

  it('list(prefix) filtra correctamente', async () => {
    const adapter = new MockStorage()
    await adapter.set('user:1', 'alice')
    await adapter.set('user:2', 'bob')
    await adapter.set('session:1', 'tok')
    const result = await adapter.list('user:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['user:1', 'user:2'])
    }
  })

  it('clear() elimina todas as claves', async () => {
    const adapter = new MockStorage()
    await adapter.set('x', 1)
    await adapter.set('y', 2)
    const clearResult = await adapter.clear()
    expect(isOk(clearResult)).toBe(true)
    const listResult = await adapter.list()
    expect(isOk(listResult)).toBe(true)
    if (isOk(listResult)) {
      expect(listResult.value).toEqual([])
    }
  })

  it('watch? é opcional: MockStorage sen watch segue cumprindo interface', () => {
    // MockStorage non implementa watch pero satisface StorageAdapter
    const adapter: StorageAdapter = new MockStorage()
    expect(adapter.watch).toBeUndefined()
  })

  it('watch? funciona cando está implementado', () => {
    const adapter: StorageAdapter = new MockStorageWithWatch()
    expect(typeof adapter.watch).toBe('function')
    const unsubscribe = adapter.watch?.('key', () => {
      // callback non-op — mock sen efectos secundarios
    })
    expect(typeof unsubscribe).toBe('function')
  })

  it('cando get devolve err, o caller pode discriminar con result.ok', async () => {
    const adapter = new MockStorageWithErrors()
    const result = await adapter.get('anykey')
    expect(isErr(result)).toBe(true)
    expect(result.ok).toBe(false)
  })

  it('cando set devolve err por quota, o errorCode é STORAGE_QUOTA_EXCEEDED', async () => {
    const adapter = new MockStorageWithErrors()
    const result = await adapter.set('anykey', 'anyvalue')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(YggdrasilError)
      expect((result.error as YggdrasilError).code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })
})
// ── FIN: tests de StorageAdapter interface ──
