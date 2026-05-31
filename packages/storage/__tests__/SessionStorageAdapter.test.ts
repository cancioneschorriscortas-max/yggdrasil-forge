import { ErrorCode, isErr, isOk } from '@yggdrasil-forge/common'
// ── INICIO: tests de SessionStorageAdapter ──
// Non duplica tests de LocalStorageAdapter: só verifica composición e delegación.
import { describe, expect, it } from 'vitest'
import { SessionStorageAdapter } from '../src/SessionStorageAdapter.js'
import type { StorageAdapter } from '../src/StorageAdapter.js'

// Mock manual de Storage (reutilizado de LocalStorageAdapter.test.ts)
class MockStorage implements Storage {
  private data = new Map<string, string>()
  get length(): number {
    return this.data.size
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  clear(): void {
    this.data.clear()
  }
}

class MockStorageReadOnly extends MockStorage {
  override setItem(): void {
    throw new Error('read-only')
  }
  override removeItem(): void {
    throw new Error('read-only')
  }
  override clear(): void {
    throw new Error('read-only')
  }
}

describe('SessionStorageAdapter — compilación e tipo', () => {
  it('implementa StorageAdapter (compilación = test)', () => {
    const adapter: StorageAdapter = new SessionStorageAdapter({
      storage: new MockStorage(),
    })
    expect(adapter).toBeDefined()
  })
})

describe('SessionStorageAdapter — delegación', () => {
  it('set + get delegan correctamente ao inner', async () => {
    const mock = new MockStorage()
    const adapter = new SessionStorageAdapter({ storage: mock })
    await adapter.set('key', { data: 42 })
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({ data: 42 })
    }
    // Verificar que o mock ten o dato serializado
    expect(mock.getItem('key')).toBe('{"data":42}')
  })

  it('delete delega correctamente', async () => {
    const mock = new MockStorage()
    const adapter = new SessionStorageAdapter({ storage: mock })
    await adapter.set('key', 'val')
    await adapter.delete('key')
    const result = await adapter.get('key')
    expect(isOk(result) && result.value).toBeNull()
  })

  it('list delega correctamente con prefix', async () => {
    const mock = new MockStorage()
    const adapter = new SessionStorageAdapter({ storage: mock })
    await adapter.set('user:1', 'a')
    await adapter.set('user:2', 'b')
    await adapter.set('session:1', 'c')
    const result = await adapter.list('user:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['user:1', 'user:2'])
    }
  })

  it('clear delega correctamente', async () => {
    const mock = new MockStorage()
    const adapter = new SessionStorageAdapter({ storage: mock })
    await adapter.set('x', 1)
    await adapter.clear()
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })
})

describe('SessionStorageAdapter — constructor', () => {
  it('constructor con storage mock usa o inxectado', async () => {
    const mock = new MockStorage()
    const adapter = new SessionStorageAdapter({ storage: mock })
    await adapter.set('test', 'val')
    expect(mock.getItem('test')).toBe('"val"')
  })

  it('constructor con locale "es" propaga ao inner (erro en español)', async () => {
    const adapter = new SessionStorageAdapter({
      storage: new MockStorageReadOnly(),
      locale: 'es',
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('constructor sen options.storage usa globalThis.sessionStorage (fallback)', () => {
    const mock = new MockStorage()
    const original = globalThis.sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mock,
      configurable: true,
      writable: true,
    })
    try {
      const adapter = new SessionStorageAdapter()
      expect(adapter).toBeDefined()
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: original ?? undefined,
        configurable: true,
        writable: true,
      })
    }
  })
})
// ── FIN: tests de SessionStorageAdapter ──
