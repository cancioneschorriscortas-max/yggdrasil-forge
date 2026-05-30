import { ErrorCode, isErr, isOk } from '@yggdrasil-forge/common'
import { indexedDB } from 'fake-indexeddb'
// ── INICIO: tests de IndexedDBAdapter ──
import { describe, expect, it } from 'vitest'
import { IndexedDBAdapter } from '../src/IndexedDBAdapter.js'

function createAdapter(opts?: { locale?: 'gl' | 'es' | 'en' }) {
  return new IndexedDBAdapter({
    databaseName: `test-${crypto.randomUUID()}`,
    factory: indexedDB,
    ...(opts?.locale !== undefined ? { locale: opts.locale } : {}),
  })
}

describe('IndexedDBAdapter — operacións básicas', () => {
  it('get con clave inexistente devolve ok(null)', async () => {
    const adapter = createAdapter()
    const result = await adapter.get('non-existent')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('set + get recupera o valor', async () => {
    const adapter = createAdapter()
    await adapter.set('key', { id: 1, name: 'test' })
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({ id: 1, name: 'test' })
    }
  })

  it('set sobreescribe valor existente', async () => {
    const adapter = createAdapter()
    await adapter.set('key', 'primeiro')
    await adapter.set('key', 'segundo')
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('segundo')
    }
  })

  it('delete elimina; get posterior devolve ok(null)', async () => {
    const adapter = createAdapter()
    await adapter.set('key', 42)
    await adapter.delete('key')
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('delete con clave inexistente non lanza', async () => {
    const adapter = createAdapter()
    const result = await adapter.delete('non-existent')
    expect(isOk(result)).toBe(true)
  })
})

describe('IndexedDBAdapter — list', () => {
  it('list() sen prefix devolve todas as claves', async () => {
    const adapter = createAdapter()
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
    const adapter = createAdapter()
    await adapter.set('user:1', 'alice')
    await adapter.set('user:2', 'bob')
    await adapter.set('session:1', 'tok')
    const result = await adapter.list('user:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['user:1', 'user:2'])
    }
  })

  it('list() en BD baleira devolve ok([])', async () => {
    const adapter = createAdapter()
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })
})

describe('IndexedDBAdapter — clear', () => {
  it('clear elimina todas as claves', async () => {
    const adapter = createAdapter()
    await adapter.set('x', 1)
    await adapter.set('y', 2)
    await adapter.clear()
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })

  it('clear en BD baleira non lanza', async () => {
    const adapter = createAdapter()
    const result = await adapter.clear()
    expect(isOk(result)).toBe(true)
  })
})

describe('IndexedDBAdapter — tipos diversos (structured clone)', () => {
  it('acepta Date', async () => {
    const adapter = createAdapter()
    const date = new Date('2025-06-15T12:00:00Z')
    await adapter.set('date', date)
    const result = await adapter.get('date')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeInstanceOf(Date)
      expect((result.value as Date).toISOString()).toBe(date.toISOString())
    }
  })

  it('acepta Map', async () => {
    const adapter = createAdapter()
    const map = new Map([
      ['a', 1],
      ['b', 2],
    ])
    await adapter.set('map', map)
    const result = await adapter.get('map')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeInstanceOf(Map)
      expect((result.value as Map<string, number>).get('a')).toBe(1)
    }
  })

  it('acepta Set', async () => {
    const adapter = createAdapter()
    const set = new Set([1, 2, 3])
    await adapter.set('set', set)
    const result = await adapter.get('set')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeInstanceOf(Set)
      expect((result.value as Set<number>).has(2)).toBe(true)
    }
  })

  it('acepta ArrayBuffer / Uint8Array', async () => {
    const adapter = createAdapter()
    const buffer = new Uint8Array([1, 2, 3, 4])
    await adapter.set('buffer', buffer)
    const result = await adapter.get('buffer')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeInstanceOf(Uint8Array)
      expect(Array.from(result.value as Uint8Array)).toEqual([1, 2, 3, 4])
    }
  })

  it('acepta undefined (asimetría con LocalStorageAdapter)', async () => {
    const adapter = createAdapter()
    await adapter.set('undef', undefined)
    const result = await adapter.get('undef')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      // IndexedDB garda undefined; get converte a null (contrato StorageAdapter)
      expect(result.value).toBeNull()
    }
  })

  it('acepta null', async () => {
    const adapter = createAdapter()
    await adapter.set('nil', null)
    const result = await adapter.get('nil')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('acepta NaN como número', async () => {
    const adapter = createAdapter()
    await adapter.set('nan', Number.NaN)
    const result = await adapter.get('nan')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(Number.isNaN(result.value)).toBe(true)
    }
  })
})

describe('IndexedDBAdapter — structured clone fallido', () => {
  it('set cunha función directamente → err STORAGE_WRITE_FAILED', async () => {
    const adapter = createAdapter()
    const result = await adapter.set('fn', () => 42)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set cun símbolo → err STORAGE_WRITE_FAILED', async () => {
    const adapter = createAdapter()
    const result = await adapter.set('sym', Symbol('test'))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })
})

describe('IndexedDBAdapter — apertura asíncrona', () => {
  it('múltiples operacións consecutivas funcionan (BD ábrese unha vez)', async () => {
    const adapter = createAdapter()
    await adapter.set('a', 1)
    await adapter.set('b', 2)
    await adapter.set('c', 3)
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['a', 'b', 'c'])
    }
  })

  it('operacións paralelas non se rompen entre si', async () => {
    const adapter = createAdapter()
    const results = await Promise.all([
      adapter.set('a', 1),
      adapter.set('b', 2),
      adapter.set('c', 3),
    ])
    for (const r of results) {
      expect(isOk(r)).toBe(true)
    }
    const list = await adapter.list()
    expect(isOk(list)).toBe(true)
    if (isOk(list)) {
      expect(list.value.sort()).toEqual(['a', 'b', 'c'])
    }
  })
})

describe('IndexedDBAdapter — inversión de control', () => {
  it('usa o factory inxectado (fake-indexeddb)', async () => {
    const adapter = createAdapter()
    await adapter.set('test', 'val')
    const result = await adapter.get('test')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('val')
    }
  })

  it('constructor sen factory usa globalThis.indexedDB como fallback', () => {
    // Definir temporalmente globalThis.indexedDB para cubrir a rama
    const original = globalThis.indexedDB
    Object.defineProperty(globalThis, 'indexedDB', {
      value: indexedDB,
      configurable: true,
      writable: true,
    })
    try {
      const adapter = new IndexedDBAdapter({ databaseName: 'fallback-test' })
      expect(adapter).toBeDefined()
    } finally {
      if (original === undefined) {
        Object.defineProperty(globalThis, 'indexedDB', {
          value: undefined,
          configurable: true,
          writable: true,
        })
      } else {
        Object.defineProperty(globalThis, 'indexedDB', {
          value: original,
          configurable: true,
          writable: true,
        })
      }
    }
  })

  it('locale es devolve mensaxe en español (test indirecto)', async () => {
    // Crear un adapter cun factory que lanza ao abrir
    const badFactory = {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          if (req.onerror) {
            Object.defineProperty(req, 'error', {
              value: new Error('open failed'),
            })
            req.onerror(new Event('error'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory

    const adapter = new IndexedDBAdapter({
      databaseName: 'test-locale',
      factory: badFactory,
      locale: 'es',
    })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })
})

describe('IndexedDBAdapter — isolamento entre instancias', () => {
  it('dúas instancias con databaseName diferente son independentes', async () => {
    const adapter1 = new IndexedDBAdapter({
      databaseName: `iso-a-${crypto.randomUUID()}`,
      factory: indexedDB,
    })
    const adapter2 = new IndexedDBAdapter({
      databaseName: `iso-b-${crypto.randomUUID()}`,
      factory: indexedDB,
    })
    await adapter1.set('key', 'val1')
    await adapter2.set('key', 'val2')
    const r1 = await adapter1.get('key')
    const r2 = await adapter2.get('key')
    expect(isOk(r1) && r1.value).toBe('val1')
    expect(isOk(r2) && r2.value).toBe('val2')
  })

  it('dúas instancias co MESMO databaseName ven os mesmos datos', async () => {
    const dbName = `shared-${crypto.randomUUID()}`
    const adapter1 = new IndexedDBAdapter({
      databaseName: dbName,
      factory: indexedDB,
    })
    const adapter2 = new IndexedDBAdapter({
      databaseName: dbName,
      factory: indexedDB,
    })
    await adapter1.set('key', 'shared-value')
    const result = await adapter2.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('shared-value')
    }
  })
})

describe('IndexedDBAdapter — erro de apertura', () => {
  it('factory que falla ao abrir → err en todas as operacións', async () => {
    const badFactory = {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          if (req.onerror) {
            Object.defineProperty(req, 'error', {
              value: new Error('DB corrupted'),
            })
            req.onerror(new Event('error'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory

    const adapter = new IndexedDBAdapter({
      databaseName: 'fail-db',
      factory: badFactory,
    })

    const getR = await adapter.get('key')
    expect(isErr(getR)).toBe(true)
    if (isErr(getR)) {
      expect(getR.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(getR.error.context?.reason).toBe('database open failed')
    }

    // Operacións de escritura tamén fallan
    const setR = await adapter.set('key', 'value')
    expect(isErr(setR)).toBe(true)
    if (isErr(setR)) {
      expect(setR.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }

    const delR = await adapter.delete('key')
    expect(isErr(delR)).toBe(true)

    const listR = await adapter.list()
    expect(isErr(listR)).toBe(true)

    const clearR = await adapter.clear()
    expect(isErr(clearR)).toBe(true)
  })

  it('factory que dispara onblocked → err na apertura', async () => {
    const blockedFactory = {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          if (req.onblocked) {
            req.onblocked(new Event('blocked'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory

    const adapter = new IndexedDBAdapter({
      databaseName: 'blocked-db',
      factory: blockedFactory,
    })

    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.originalErrorMessage).toBe('IndexedDB open blocked')
    }
  })

  it('BD xa existente (objectStore xa creado) non duplica createObjectStore', async () => {
    // Crear a BD primeiro
    const dbName = `exists-${crypto.randomUUID()}`
    const adapter1 = new IndexedDBAdapter({
      databaseName: dbName,
      factory: indexedDB,
    })
    await adapter1.set('test', 'data')

    // Segunda instancia reutiliza a mesma BD sen recrear o objectStore
    const adapter2 = new IndexedDBAdapter({
      databaseName: dbName,
      factory: indexedDB,
    })
    const result = await adapter2.get('test')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('data')
    }
  })

  it('erro non-Error na apertura manéxase con String(e) en todas as ops', async () => {
    const badFactory = {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          if (req.onerror) {
            Object.defineProperty(req, 'error', { value: null })
            req.onerror(new Event('error'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory

    // Cada instancia nova para exercitar o getDb catch en cada método
    const mkAdapter = () =>
      new IndexedDBAdapter({ databaseName: `null-err-${crypto.randomUUID()}`, factory: badFactory })

    const getR = await mkAdapter().get('key')
    expect(isErr(getR)).toBe(true)

    const setR = await mkAdapter().set('key', 'val')
    expect(isErr(setR)).toBe(true)

    const delR = await mkAdapter().delete('key')
    expect(isErr(delR)).toBe(true)

    const listR = await mkAdapter().list()
    expect(isErr(listR)).toBe(true)

    const clearR = await mkAdapter().clear()
    expect(isErr(clearR)).toBe(true)
  })
})

describe('IndexedDBAdapter — erros de operación post-apertura', () => {
  // Helper: crea un factory que abre con éxito pero devolve un store
  // cuxas operacións fallan (simula corruption ou concurrent close).
  function createFailingStoreFactory(operationToFail: string) {
    return {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          // Simular un DB real que ten o objectStore pero as operacións fallan
          const failingStore = {
            get: (k: string) => {
              void k
              const r = {} as IDBRequest
              setTimeout(() => {
                if (operationToFail === 'get' && r.onerror) {
                  Object.defineProperty(r, 'error', {
                    value: new Error('get failed'),
                  })
                  r.onerror(new Event('error'))
                } else if (r.onsuccess) {
                  Object.defineProperty(r, 'result', { value: undefined })
                  r.onsuccess(new Event('success'))
                }
              }, 0)
              return r
            },
            put: (v: unknown, k: string) => {
              void v
              void k
              const r = {} as IDBRequest
              setTimeout(() => {
                if (operationToFail === 'put' && r.onerror) {
                  Object.defineProperty(r, 'error', {
                    value: new Error('put failed'),
                  })
                  r.onerror(new Event('error'))
                } else if (r.onsuccess) {
                  Object.defineProperty(r, 'result', { value: undefined })
                  r.onsuccess(new Event('success'))
                }
              }, 0)
              return r
            },
            delete: (k: string) => {
              void k
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', {
                    value: new Error('delete failed'),
                  })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
            getAllKeys: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', {
                    value: new Error('getAllKeys failed'),
                  })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
            clear: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', {
                    value: new Error('clear failed'),
                  })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
          }

          const fakeDb = {
            transaction: () => ({
              objectStore: () => failingStore,
            }),
            objectStoreNames: { contains: () => true },
          }

          Object.defineProperty(req, 'result', { value: fakeDb })
          if (req.onsuccess) {
            req.onsuccess(new Event('success'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory
  }

  it('get: store.get falla → err STORAGE_READ_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'fail-get',
      factory: createFailingStoreFactory('get'),
    })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('delete: store.delete falla → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'fail-del',
      factory: createFailingStoreFactory('delete'),
    })
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('list: store.getAllKeys falla → err STORAGE_READ_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'fail-list',
      factory: createFailingStoreFactory('list'),
    })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('clear: store.clear falla → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'fail-clear',
      factory: createFailingStoreFactory('clear'),
    })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set: store.put lanza QuotaExceededError → err STORAGE_QUOTA_EXCEEDED', async () => {
    const quotaFactory = {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          const quotaStore = {
            put: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  const qe = new DOMException('Quota exceeded', 'QuotaExceededError')
                  Object.defineProperty(r, 'error', { value: qe })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
          }
          const fakeDb = {
            transaction: () => ({
              objectStore: () => quotaStore,
            }),
            objectStoreNames: { contains: () => true },
          }
          Object.defineProperty(req, 'result', { value: fakeDb })
          if (req.onsuccess) {
            req.onsuccess(new Event('success'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory

    const adapter = new IndexedDBAdapter({
      databaseName: 'fail-quota',
      factory: quotaFactory,
    })
    const result = await adapter.set('key', 'huge-value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })
})

describe('IndexedDBAdapter — non-Error rejections (ramas defensivas)', () => {
  // Helper: factory que rexa operacións con non-Error (null, string, etc.)
  function createNonErrorFactory(operation: string) {
    return {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          const store = {
            get: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (operation === 'get' && r.onerror) {
                  Object.defineProperty(r, 'error', { value: null })
                  r.onerror(new Event('error'))
                } else if (r.onsuccess) {
                  Object.defineProperty(r, 'result', { value: undefined })
                  r.onsuccess(new Event('success'))
                }
              }, 0)
              return r
            },
            put: (_v: unknown, _k: string) => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (operation === 'put' && r.onerror) {
                  Object.defineProperty(r, 'error', { value: null })
                  r.onerror(new Event('error'))
                } else if (r.onsuccess) {
                  Object.defineProperty(r, 'result', { value: undefined })
                  r.onsuccess(new Event('success'))
                }
              }, 0)
              return r
            },
            delete: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', { value: null })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
            getAllKeys: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', { value: null })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
            clear: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', { value: null })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
          }
          const fakeDb = {
            transaction: () => ({
              objectStore: () => store,
            }),
            objectStoreNames: { contains: () => true },
          }
          Object.defineProperty(req, 'result', { value: fakeDb })
          if (req.onsuccess) {
            req.onsuccess(new Event('success'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory
  }

  it('get con non-Error rejection → STORAGE_READ_FAILED con String(e)', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'ne-get',
      factory: createNonErrorFactory('get'),
    })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('set con non-Error rejection → STORAGE_WRITE_FAILED (non quota)', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'ne-set',
      factory: createNonErrorFactory('put'),
    })
    const result = await adapter.set('key', 'val')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('delete con non-Error rejection → STORAGE_WRITE_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'ne-del',
      factory: createNonErrorFactory('delete'),
    })
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
  })

  it('list con non-Error rejection → STORAGE_READ_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'ne-list',
      factory: createNonErrorFactory('list'),
    })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
  })

  it('clear con non-Error rejection → STORAGE_WRITE_FAILED', async () => {
    const adapter = new IndexedDBAdapter({
      databaseName: 'ne-clear',
      factory: createNonErrorFactory('clear'),
    })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
  })
})

describe('IndexedDBAdapter — isQuotaExceededError ramas', () => {
  // Helper: crea factory que fai store.put rexa cun erro concreto
  function createQuotaFactory(error: Error) {
    return {
      open: () => {
        const req = {} as IDBOpenDBRequest
        setTimeout(() => {
          const store = {
            put: () => {
              const r = {} as IDBRequest
              setTimeout(() => {
                if (r.onerror) {
                  Object.defineProperty(r, 'error', { value: error })
                  r.onerror(new Event('error'))
                }
              }, 0)
              return r
            },
          }
          const fakeDb = {
            transaction: () => ({ objectStore: () => store }),
            objectStoreNames: { contains: () => true },
          }
          Object.defineProperty(req, 'result', { value: fakeDb })
          if (req.onsuccess) {
            req.onsuccess(new Event('success'))
          }
        }, 0)
        return req
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
      databases: () => Promise.resolve([]),
      cmp: () => 0,
    } as unknown as IDBFactory
  }

  it('NS_ERROR_DOM_QUOTA_REACHED → STORAGE_QUOTA_EXCEEDED', async () => {
    const e = new Error('quota')
    e.name = 'NS_ERROR_DOM_QUOTA_REACHED'
    const adapter = new IndexedDBAdapter({
      databaseName: 'ns-quota',
      factory: createQuotaFactory(e),
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('DOMException code 22 → STORAGE_QUOTA_EXCEEDED', async () => {
    const e = new DOMException('quota', 'UnknownError')
    Object.defineProperty(e, 'code', { value: 22 })
    const adapter = new IndexedDBAdapter({
      databaseName: 'code22-quota',
      factory: createQuotaFactory(e),
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('DOMException code 1014 → STORAGE_QUOTA_EXCEEDED', async () => {
    const e = new DOMException('quota', 'UnknownError')
    Object.defineProperty(e, 'code', { value: 1014 })
    const adapter = new IndexedDBAdapter({
      databaseName: 'code1014-quota',
      factory: createQuotaFactory(e),
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })
})
// ── FIN: tests de IndexedDBAdapter ──
