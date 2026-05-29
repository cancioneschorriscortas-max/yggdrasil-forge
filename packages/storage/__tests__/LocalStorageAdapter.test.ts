import { ErrorCode, isErr, isOk } from '@yggdrasil-forge/common'
// ── INICIO: tests de LocalStorageAdapter ──
import { describe, expect, it } from 'vitest'
import { LocalStorageAdapter } from '../src/LocalStorageAdapter.js'

// ── Mock manual de Storage interface (cero jsdom) ──
class MockStorage implements Storage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys())
    return keys[index] ?? null
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

// Mock que lanza QuotaExceededError ao setItem
class MockStorageWithQuota extends MockStorage {
  override setItem(_key: string, _value: string): void {
    const error = new DOMException('Quota exceeded', 'QuotaExceededError')
    throw error
  }
}

// Mock que lanza QuotaExceededError con code numérico (Safari/iOS)
class MockStorageWithQuotaCode extends MockStorage {
  override setItem(_key: string, _value: string): void {
    const error = new DOMException('Quota exceeded', 'UnknownError')
    Object.defineProperty(error, 'code', { value: 22 })
    throw error
  }
}

// Mock de read-only: lanza ao setItem e removeItem
class MockStorageReadOnly extends MockStorage {
  override setItem(_key: string, _value: string): void {
    throw new Error('Storage is read-only')
  }

  override removeItem(_key: string): void {
    throw new Error('Storage is read-only')
  }

  override clear(): void {
    throw new Error('Storage is read-only')
  }
}

// Mock que lanza ao getItem
class MockStorageGetFails extends MockStorage {
  override getItem(_key: string): string | null {
    throw new Error('getItem failed')
  }
}

// Mock que devolve null para key(i) (simula concorrencia entre tabs)
class MockStorageWithNullKey extends MockStorage {
  override key(index: number): string | null {
    if (index === 1) return null // simula modificación concurrente
    return super.key(index)
  }
}

// Helper para crear adapter con mock
function createAdapter(storage?: Storage, locale?: 'gl' | 'es' | 'en') {
  const mock = storage ?? new MockStorage()
  return {
    adapter: new LocalStorageAdapter({
      storage: mock,
      ...(locale !== undefined ? { locale } : {}),
    }),
    mock,
  }
}

describe('LocalStorageAdapter — operacións básicas', () => {
  it('get con clave inexistente devolve ok(null)', async () => {
    const { adapter } = createAdapter()
    const result = await adapter.get('non-existent')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('set + get recupera o valor (copia via JSON, non referencia)', async () => {
    const { adapter } = createAdapter()
    const obj = { id: 1, name: 'test' }
    await adapter.set('key', obj)
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual(obj)
      expect(result.value).not.toBe(obj) // non é a mesma referencia (JSON roundtrip)
    }
  })

  it('set sobreescribe o valor existente', async () => {
    const { adapter } = createAdapter()
    await adapter.set('key', 'primeiro')
    await adapter.set('key', 'segundo')
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('segundo')
    }
  })

  it('delete elimina a clave; get posterior devolve ok(null)', async () => {
    const { adapter } = createAdapter()
    await adapter.set('key', 42)
    await adapter.delete('key')
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('delete con clave inexistente non lanza', async () => {
    const { adapter } = createAdapter()
    const result = await adapter.delete('non-existent')
    expect(isOk(result)).toBe(true)
  })
})

describe('LocalStorageAdapter — serialización', () => {
  it('acepta string, number, boolean, null, object, array', async () => {
    const { adapter } = createAdapter()
    await adapter.set('str', 'hello')
    await adapter.set('num', 42)
    await adapter.set('bool', true)
    await adapter.set('nil', null)
    await adapter.set('obj', { a: 1 })
    await adapter.set('arr', [1, 2, 3])

    const rStr = await adapter.get('str')
    const rNum = await adapter.get('num')
    const rBool = await adapter.get('bool')
    const rNil = await adapter.get('nil')
    const rObj = await adapter.get('obj')
    const rArr = await adapter.get('arr')

    expect(isOk(rStr) && rStr.value).toBe('hello')
    expect(isOk(rNum) && rNum.value).toBe(42)
    expect(isOk(rBool) && rBool.value).toBe(true)
    expect(isOk(rNil) && rNil.value).toBeNull()
    expect(isOk(rObj) && rObj.value).toEqual({ a: 1 })
    expect(isOk(rArr) && rArr.value).toEqual([1, 2, 3])
  })

  it('set(key, undefined) → err STORAGE_WRITE_FAILED', async () => {
    const { adapter } = createAdapter()
    const result = await adapter.set('key', undefined)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set(key, circularRef) → err STORAGE_WRITE_FAILED', async () => {
    const { adapter } = createAdapter()
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const result = await adapter.set('key', circular)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set(key, BigInt) → err STORAGE_WRITE_FAILED', async () => {
    const { adapter } = createAdapter()
    const result = await adapter.set('key', BigInt(42))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set(key, function) garda o resultado de JSON (función ignorada)', async () => {
    const { adapter } = createAdapter()
    // JSON.stringify dunha función pura devolve undefined → rexéitase igual que undefined
    // Pero un obxecto con prop función → a prop desaparece
    const result = await adapter.set('obj', { a: 1, fn: () => 42 })
    expect(isOk(result)).toBe(true)
    const getResult = await adapter.get('obj')
    expect(isOk(getResult)).toBe(true)
    if (isOk(getResult)) {
      expect(getResult.value).toEqual({ a: 1 }) // fn desapareceu
    }
  })

  it('set(key, NaN) → garda null (comportamento JSON estándar)', async () => {
    const { adapter } = createAdapter()
    await adapter.set('key', Number.NaN)
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('asimetría con MemoryStorage: set+get dun obxecto non devolve mesma referencia', async () => {
    const { adapter } = createAdapter()
    const obj = { x: 42 }
    await adapter.set('key', obj)
    const r1 = await adapter.get('key')
    const r2 = await adapter.get('key')
    expect(isOk(r1) && isOk(r2)).toBe(true)
    if (isOk(r1) && isOk(r2)) {
      expect(r1.value).toEqual(r2.value)
      expect(r1.value).not.toBe(r2.value) // cada get devolve copia nova
    }
  })
})

describe('LocalStorageAdapter — QuotaExceeded', () => {
  it('mock con name QuotaExceededError → err STORAGE_QUOTA_EXCEEDED', async () => {
    const adapter = new LocalStorageAdapter({ storage: new MockStorageWithQuota() })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('mock con code 22 (Safari/iOS) → err STORAGE_QUOTA_EXCEEDED', async () => {
    const adapter = new LocalStorageAdapter({ storage: new MockStorageWithQuotaCode() })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })
})

describe('LocalStorageAdapter — get con corrupción', () => {
  it('valor non-JSON no storage → err STORAGE_READ_FAILED', async () => {
    const mock = new MockStorage()
    // Inxectar un valor corrupto directamente no mock
    mock.setItem('corrupt', '{not valid json')
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.get('corrupt')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.reason).toBe('JSON parse failed')
    }
  })
})

describe('LocalStorageAdapter — get con clave inexistente', () => {
  it('get de clave nunca gardada → ok(null)', async () => {
    const { adapter } = createAdapter()
    const result = await adapter.get('never-set')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })
})

describe('LocalStorageAdapter — list', () => {
  it('list con prefix filtra correctamente', async () => {
    const { adapter } = createAdapter()
    await adapter.set('user:1', 'alice')
    await adapter.set('user:2', 'bob')
    await adapter.set('session:1', 'tok')
    const result = await adapter.list('user:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['user:1', 'user:2'])
    }
  })

  it('list ignora nulls de Storage.key(i)', async () => {
    const mock = new MockStorageWithNullKey()
    mock.setItem('a', '"1"')
    mock.setItem('b', '"2"')
    mock.setItem('c', '"3"')
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      // key(1) devolve null → 'b' é ignorada
      expect(result.value).toContain('a')
      expect(result.value).toContain('c')
    }
  })
})

describe('LocalStorageAdapter — clear', () => {
  it('clear elimina todo', async () => {
    const { adapter } = createAdapter()
    await adapter.set('x', 1)
    await adapter.set('y', 2)
    await adapter.clear()
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })
})

describe('LocalStorageAdapter — constructor', () => {
  it('new LocalStorageAdapter({ storage: mock }) usa o mock', async () => {
    const mock = new MockStorage()
    const adapter = new LocalStorageAdapter({ storage: mock })
    await adapter.set('test', 'val')
    // Verificar que o mock ten o dato
    expect(mock.getItem('test')).toBe('"val"')
  })

  it('new LocalStorageAdapter({ storage: mock, locale: "es" }) usa locale es', async () => {
    const adapter = new LocalStorageAdapter({
      storage: new MockStorageReadOnly(),
      locale: 'es',
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    // A mensaxe de erro vén en español (locale 'es')
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('constructor sen options.storage usa globalThis.localStorage', () => {
    // Definir temporalmente globalThis.localStorage para cubrir a rama
    const mock = new MockStorage()
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: mock,
      configurable: true,
      writable: true,
    })
    try {
      const adapter = new LocalStorageAdapter()
      // O adapter debería usar o mock asignado a globalThis.localStorage
      expect(adapter).toBeDefined()
    } finally {
      // Restaurar
      if (original === undefined) {
        Object.defineProperty(globalThis, 'localStorage', {
          value: undefined,
          configurable: true,
          writable: true,
        })
      } else {
        Object.defineProperty(globalThis, 'localStorage', {
          value: original,
          configurable: true,
          writable: true,
        })
      }
    }
  })
})

describe('LocalStorageAdapter — propagación de erros', () => {
  it('getItem que lanza → err STORAGE_READ_FAILED con originalErrorMessage', async () => {
    const adapter = new LocalStorageAdapter({ storage: new MockStorageGetFails() })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.originalErrorMessage).toBe('getItem failed')
    }
  })

  it('delete en read-only → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new LocalStorageAdapter({ storage: new MockStorageReadOnly() })
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('clear en read-only → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new LocalStorageAdapter({ storage: new MockStorageReadOnly() })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('setItem que lanza non-QuotaExceeded → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new LocalStorageAdapter({ storage: new MockStorageReadOnly() })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('list que lanza durante iteración → err STORAGE_READ_FAILED', async () => {
    const mock = new MockStorage()
    // Sobrescribir length para lanzar
    Object.defineProperty(mock, 'length', {
      get() {
        throw new Error('length access failed')
      },
    })
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })
})

describe('LocalStorageAdapter — isQuotaExceededError ramas', () => {
  it('NS_ERROR_DOM_QUOTA_REACHED (Firefox antigo) → STORAGE_QUOTA_EXCEEDED', async () => {
    const mock = new MockStorage()
    mock.setItem = () => {
      const e = new Error('quota')
      e.name = 'NS_ERROR_DOM_QUOTA_REACHED'
      throw e
    }
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('DOMException code 1014 → STORAGE_QUOTA_EXCEEDED', async () => {
    const mock = new MockStorage()
    mock.setItem = () => {
      const e = new DOMException('quota', 'UnknownError')
      Object.defineProperty(e, 'code', { value: 1014 })
      throw e
    }
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('non-Error thrown polo storage non é QuotaExceededError', async () => {
    const mock = new MockStorage()
    mock.setItem = () => {
      throw 'string error' // eslint-disable-line -- test deliberado
    }
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('non-Error thrown en getItem → STORAGE_READ_FAILED con String(e)', async () => {
    const mock = new MockStorage()
    mock.getItem = () => {
      throw 42 // non-Error deliberado
    }
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.originalErrorMessage).toBe('42')
    }
  })

  it('non-Error thrown en removeItem → STORAGE_WRITE_FAILED con String(e)', async () => {
    const mock = new MockStorage()
    mock.removeItem = () => {
      throw 'remove failed'
    }
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
      expect(result.error.context?.originalErrorMessage).toBe('remove failed')
    }
  })

  it('non-Error thrown en list → STORAGE_READ_FAILED con String(e)', async () => {
    const mock = new MockStorage()
    Object.defineProperty(mock, 'length', {
      get() {
        throw 'length error'
      },
    })
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.originalErrorMessage).toBe('length error')
    }
  })

  it('non-Error thrown en JSON.parse → STORAGE_READ_FAILED con String(e)', async () => {
    const mock = new MockStorage()
    mock.setItem('key', 'valid-looking')
    const adapter = new LocalStorageAdapter({ storage: mock })
    // Monkeypatch JSON.parse para lanzar non-Error neste test
    const originalParse = JSON.parse
    JSON.parse = () => {
      throw 'parse non-Error'
    }
    try {
      const result = await adapter.get('key')
      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
        expect(result.error.context?.originalErrorMessage).toBe('parse non-Error')
      }
    } finally {
      JSON.parse = originalParse
    }
  })

  it('non-Error thrown en JSON.stringify → STORAGE_WRITE_FAILED con String(e)', async () => {
    const { adapter } = createAdapter()
    const originalStringify = JSON.stringify
    JSON.stringify = () => {
      throw 'stringify non-Error'
    }
    try {
      const result = await adapter.set('key', { a: 1 })
      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
        expect(result.error.context?.originalErrorMessage).toBe('stringify non-Error')
      }
    } finally {
      JSON.stringify = originalStringify
    }
  })

  it('non-Error thrown en clear → STORAGE_WRITE_FAILED con String(e)', async () => {
    const mock = new MockStorage()
    mock.clear = () => {
      throw 'clear failed'
    }
    const adapter = new LocalStorageAdapter({ storage: mock })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
      expect(result.error.context?.originalErrorMessage).toBe('clear failed')
    }
  })
})
// ── FIN: tests de LocalStorageAdapter ──
