import { ErrorCode, isErr, isOk } from '@yggdrasil-forge/common'
import { storageFactory } from 'opfs-mock'
// ── INICIO: tests de FileSystemAdapter ──
import { describe, expect, it } from 'vitest'
import { FileSystemAdapter } from '../src/FileSystemAdapter.js'

async function createAdapter(opts?: { locale?: 'gl' | 'es' | 'en' }) {
  const storage = await storageFactory()
  return new FileSystemAdapter({
    directoryName: `test-${crypto.randomUUID()}`,
    storage,
    ...(opts?.locale !== undefined ? { locale: opts.locale } : {}),
  })
}

describe('FileSystemAdapter — operacións básicas', () => {
  it('get con clave inexistente devolve ok(null)', async () => {
    const adapter = await createAdapter()
    const result = await adapter.get('non-existent')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('set + get recupera o valor', async () => {
    const adapter = await createAdapter()
    await adapter.set('key', { id: 1, name: 'test' })
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({ id: 1, name: 'test' })
    }
  })

  it('set sobreescribe valor existente', async () => {
    const adapter = await createAdapter()
    await adapter.set('key', 'primeiro')
    await adapter.set('key', 'segundo')
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('segundo')
    }
  })

  it('delete elimina; get posterior devolve ok(null)', async () => {
    const adapter = await createAdapter()
    await adapter.set('key', 42)
    await adapter.delete('key')
    const result = await adapter.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('delete con clave inexistente non lanza', async () => {
    const adapter = await createAdapter()
    const result = await adapter.delete('non-existent')
    expect(isOk(result)).toBe(true)
  })
})

describe('FileSystemAdapter — list', () => {
  it('list() sen prefix devolve todas as claves', async () => {
    const adapter = await createAdapter()
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
    const adapter = await createAdapter()
    await adapter.set('user-1', 'alice')
    await adapter.set('user-2', 'bob')
    await adapter.set('session-1', 'tok')
    const result = await adapter.list('user-')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['user-1', 'user-2'])
    }
  })

  it('list() en directorio baleiro devolve ok([])', async () => {
    const adapter = await createAdapter()
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })
})

describe('FileSystemAdapter — clear', () => {
  it('clear elimina todas as claves', async () => {
    const adapter = await createAdapter()
    await adapter.set('x', 1)
    await adapter.set('y', 2)
    await adapter.clear()
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })

  it('clear en directorio baleiro non lanza', async () => {
    const adapter = await createAdapter()
    const result = await adapter.clear()
    expect(isOk(result)).toBe(true)
  })
})

describe('FileSystemAdapter — serialización', () => {
  it('acepta string, number, boolean, null, object, array', async () => {
    const adapter = await createAdapter()
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
    const adapter = await createAdapter()
    const result = await adapter.set('key', undefined)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set(key, circularRef) → err STORAGE_WRITE_FAILED', async () => {
    const adapter = await createAdapter()
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const result = await adapter.set('key', circular)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('set(key, BigInt) → err STORAGE_WRITE_FAILED', async () => {
    const adapter = await createAdapter()
    const result = await adapter.set('key', BigInt(42))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })
})

describe('FileSystemAdapter — validación de keys', () => {
  it('set con "/" na key → err STORAGE_WRITE_FAILED', async () => {
    const adapter = await createAdapter()
    const result = await adapter.set('a/b', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
      expect(result.error.context?.reason).toBe('key contains forward slash')
    }
  })

  it('set con "\\\\" na key → err STORAGE_WRITE_FAILED', async () => {
    const adapter = await createAdapter()
    const result = await adapter.set('a\\b', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
      expect(result.error.context?.reason).toBe('key contains backslash')
    }
  })

  it('get con "/" na key → err STORAGE_READ_FAILED', async () => {
    const adapter = await createAdapter()
    const result = await adapter.get('a/b')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('delete con "/" na key → err STORAGE_WRITE_FAILED', async () => {
    const adapter = await createAdapter()
    const result = await adapter.delete('a/b')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })
})

describe('FileSystemAdapter — apertura lazy', () => {
  it('múltiples operacións consecutivas funcionan', async () => {
    const adapter = await createAdapter()
    await adapter.set('a', 1)
    await adapter.set('b', 2)
    await adapter.set('c', 3)
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['a', 'b', 'c'])
    }
  })

  it('operacións paralelas non rompen entre si', async () => {
    const adapter = await createAdapter()
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

describe('FileSystemAdapter — inversión de control', () => {
  it('usa o storage inxectado (opfs-mock)', async () => {
    const adapter = await createAdapter()
    await adapter.set('test', 'val')
    const result = await adapter.get('test')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('val')
    }
  })

  it('locale es propaga a mensaxes de erro', async () => {
    const adapter = await createAdapter({ locale: 'es' })
    const result = await adapter.set('a/b', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })
})

describe('FileSystemAdapter — isolamento entre instancias', () => {
  it('dúas instancias con directoryName distintos son independentes', async () => {
    const storage = await storageFactory()
    const adapter1 = new FileSystemAdapter({
      directoryName: `iso-a-${crypto.randomUUID()}`,
      storage,
    })
    const adapter2 = new FileSystemAdapter({
      directoryName: `iso-b-${crypto.randomUUID()}`,
      storage,
    })
    await adapter1.set('key', 'val1')
    await adapter2.set('key', 'val2')
    const r1 = await adapter1.get('key')
    const r2 = await adapter2.get('key')
    expect(isOk(r1) && r1.value).toBe('val1')
    expect(isOk(r2) && r2.value).toBe('val2')
  })

  it('dúas instancias co MESMO directoryName ven os mesmos datos', async () => {
    const storage = await storageFactory()
    const dirName = `shared-${crypto.randomUUID()}`
    const adapter1 = new FileSystemAdapter({ directoryName: dirName, storage })
    const adapter2 = new FileSystemAdapter({ directoryName: dirName, storage })
    await adapter1.set('key', 'shared-value')
    const result = await adapter2.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('shared-value')
    }
  })
})

describe('FileSystemAdapter — corrupción', () => {
  it('ficheiro con contido non-JSON → err STORAGE_READ_FAILED', async () => {
    const storage = await storageFactory()
    const dirName = `corrupt-${crypto.randomUUID()}`
    const adapter = new FileSystemAdapter({ directoryName: dirName, storage })

    // Escribir contido corrupto directamente no ficheiro via OPFS API
    const root = await storage.getDirectory()
    const dir = await root.getDirectoryHandle(dirName, { create: true })
    const fileHandle = await dir.getFileHandle('corrupt-key', { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write('{not valid json')
    await writable.close()

    const result = await adapter.get('corrupt-key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.reason).toBe('JSON parse failed')
    }
  })
})

describe('FileSystemAdapter — erro de apertura do directorio', () => {
  // Mock StorageManager que falla
  const failingStorage = {
    getDirectory: () => Promise.reject(new Error('OPFS unavailable')),
    estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
    persisted: () => Promise.resolve(false),
    persist: () => Promise.resolve(false),
  } as unknown as StorageManager

  it('get con directory open failure → err STORAGE_READ_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'fail-dir',
      storage: failingStorage,
    })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.reason).toBe('directory open failed')
    }
  })

  it('set con directory open failure → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'fail-dir-set',
      storage: failingStorage,
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('delete con directory open failure → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'fail-dir-del',
      storage: failingStorage,
    })
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('list con directory open failure → err STORAGE_READ_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'fail-dir-list',
      storage: failingStorage,
    })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('clear con directory open failure → err STORAGE_WRITE_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'fail-dir-clear',
      storage: failingStorage,
    })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('non-Error na apertura manéxase con String(e)', async () => {
    const nonErrorStorage = {
      getDirectory: () => Promise.reject('string error'),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager

    // Cada instancia nova para exercitar cada método
    const mk = () =>
      new FileSystemAdapter({
        directoryName: `ne-${crypto.randomUUID()}`,
        storage: nonErrorStorage,
      })

    const getR = await mk().get('key')
    expect(isErr(getR)).toBe(true)

    const setR = await mk().set('key', 'val')
    expect(isErr(setR)).toBe(true)

    const delR = await mk().delete('key')
    expect(isErr(delR)).toBe(true)

    const listR = await mk().list()
    expect(isErr(listR)).toBe(true)

    const clearR = await mk().clear()
    expect(isErr(clearR)).toBe(true)
  })
})

describe('FileSystemAdapter — constructor fallback', () => {
  it('constructor sen storage usa globalThis.navigator?.storage', () => {
    const mockStorage = {
      getDirectory: () => Promise.resolve({}),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager

    const original = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { storage: mockStorage },
      configurable: true,
      writable: true,
    })
    try {
      const adapter = new FileSystemAdapter({ directoryName: 'fb-test' })
      expect(adapter).toBeDefined()
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: original,
        configurable: true,
        writable: true,
      })
    }
  })
})

describe('FileSystemAdapter — erros de operación de ficheiro', () => {
  // Helper: crea StorageManager que abre OK pero o dir devolve erros
  function createFailDirStorage(failOp: string) {
    const files = new Map<string, string>()
    return {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              getFileHandle: (name: string, opts?: { create?: boolean }) => {
                if (failOp === 'getFileHandle-error') {
                  return Promise.reject(new Error('getFileHandle generic error'))
                }
                if (failOp === 'write-error' && opts?.create) {
                  return Promise.resolve({
                    createWritable: () =>
                      Promise.resolve({
                        write: () => Promise.reject(new Error('write failed')),
                        close: () => Promise.resolve(),
                      }),
                    getFile: () => Promise.resolve(new File([files.get(name) ?? ''], name)),
                  })
                }
                if (!files.has(name) && !opts?.create) {
                  return Promise.reject(new DOMException('Not found', 'NotFoundError'))
                }
                return Promise.resolve({
                  createWritable: () =>
                    Promise.resolve({
                      write: (data: string) => {
                        files.set(name, data)
                        return Promise.resolve()
                      },
                      close: () => Promise.resolve(),
                    }),
                  getFile: () => Promise.resolve(new File([files.get(name) ?? ''], name)),
                })
              },
              removeEntry: (name: string) => {
                if (failOp === 'removeEntry-error') {
                  return Promise.reject(new Error('removeEntry generic error'))
                }
                if (!files.has(name)) {
                  return Promise.reject(new DOMException('Not found', 'NotFoundError'))
                }
                files.delete(name)
                return Promise.resolve()
              },
              entries: () => {
                if (failOp === 'entries-error') {
                  return {
                    [Symbol.asyncIterator]: () => ({
                      next: () => Promise.reject(new Error('entries failed')),
                    }),
                  }
                }
                const entries = Array.from(files.entries()).map(
                  ([k]) => [k, { kind: 'file' }] as [string, { kind: string }],
                )
                let i = 0
                return {
                  [Symbol.asyncIterator]: () => ({
                    next: () =>
                      i < entries.length
                        ? Promise.resolve({ value: entries[i++], done: false })
                        : Promise.resolve({ value: undefined, done: true }),
                  }),
                }
              },
              keys: () => {
                if (failOp === 'keys-error') {
                  return {
                    [Symbol.asyncIterator]: () => ({
                      next: () => Promise.reject(new Error('keys failed')),
                    }),
                  }
                }
                const keys = Array.from(files.keys())
                let i = 0
                return {
                  [Symbol.asyncIterator]: () => ({
                    next: () =>
                      i < keys.length
                        ? Promise.resolve({ value: keys[i++], done: false })
                        : Promise.resolve({ value: undefined, done: true }),
                  }),
                }
              },
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
  }

  it('getFileHandle error (non NotFoundError) → STORAGE_READ_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'err-read',
      storage: createFailDirStorage('getFileHandle-error'),
    })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('write error durante set → STORAGE_WRITE_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'err-write',
      storage: createFailDirStorage('write-error'),
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('removeEntry error (non NotFoundError) → STORAGE_WRITE_FAILED', async () => {
    const storage = createFailDirStorage('removeEntry-error')
    const adapter = new FileSystemAdapter({ directoryName: 'err-rm', storage })
    // Primeiro gardar algo para que removeEntry se invoque
    const adapter2 = new FileSystemAdapter({
      directoryName: 'err-rm',
      storage: createFailDirStorage(''),
    })
    await adapter2.set('key', 'val')
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('entries error en list → STORAGE_READ_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'err-list',
      storage: createFailDirStorage('entries-error'),
    })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('keys error en clear → STORAGE_WRITE_FAILED', async () => {
    const adapter = new FileSystemAdapter({
      directoryName: 'err-clear',
      storage: createFailDirStorage('keys-error'),
    })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })
})

describe('FileSystemAdapter — QuotaExceeded e isQuotaExceededError ramas', () => {
  // Helper: factory que fai write lanzar QuotaExceededError
  function createQuotaStorage(quotaError: Error) {
    return {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              getFileHandle: (_n: string, _o?: { create?: boolean }) =>
                Promise.resolve({
                  createWritable: () =>
                    Promise.resolve({
                      write: () => Promise.reject(quotaError),
                      close: () => Promise.resolve(),
                    }),
                }),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
  }

  it('QuotaExceededError por name → STORAGE_QUOTA_EXCEEDED', async () => {
    const qe = new DOMException('Quota exceeded', 'QuotaExceededError')
    const adapter = new FileSystemAdapter({
      directoryName: 'q-name',
      storage: createQuotaStorage(qe),
    })
    const result = await adapter.set('key', 'huge')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('NS_ERROR_DOM_QUOTA_REACHED → STORAGE_QUOTA_EXCEEDED', async () => {
    const e = new Error('quota')
    e.name = 'NS_ERROR_DOM_QUOTA_REACHED'
    const adapter = new FileSystemAdapter({
      directoryName: 'q-ns',
      storage: createQuotaStorage(e),
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
    const adapter = new FileSystemAdapter({
      directoryName: 'q-22',
      storage: createQuotaStorage(e),
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
    const adapter = new FileSystemAdapter({
      directoryName: 'q-1014',
      storage: createQuotaStorage(e),
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED)
    }
  })

  it('non-Error en write (non quota) → STORAGE_WRITE_FAILED', async () => {
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              getFileHandle: () =>
                Promise.resolve({
                  createWritable: () =>
                    Promise.resolve({
                      write: () => Promise.reject('string error'),
                      close: () => Promise.resolve(),
                    }),
                }),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager

    const adapter = new FileSystemAdapter({
      directoryName: 'ne-write',
      storage,
    })
    const result = await adapter.set('key', 'value')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })
})

describe('FileSystemAdapter — non-Error en operacións de ficheiro', () => {
  it('non-Error en getFileHandle → STORAGE_READ_FAILED con String(e)', async () => {
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              getFileHandle: () => Promise.reject(42),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
    const adapter = new FileSystemAdapter({ directoryName: 'ne-gfh', storage })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
  })

  it('non-Error en removeEntry → STORAGE_WRITE_FAILED con String(e)', async () => {
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              removeEntry: () => Promise.reject('remove error'),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
    const adapter = new FileSystemAdapter({ directoryName: 'ne-rem', storage })
    const result = await adapter.delete('key')
    expect(isErr(result)).toBe(true)
  })

  it('non-Error en entries → STORAGE_READ_FAILED', async () => {
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              entries: () => ({
                [Symbol.asyncIterator]: () => ({
                  next: () => Promise.reject('entries error'),
                }),
              }),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
    const adapter = new FileSystemAdapter({ directoryName: 'ne-ent', storage })
    const result = await adapter.list()
    expect(isErr(result)).toBe(true)
  })

  it('non-Error en keys (clear) → STORAGE_WRITE_FAILED', async () => {
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              keys: () => ({
                [Symbol.asyncIterator]: () => ({
                  next: () => Promise.reject('keys error'),
                }),
              }),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
    const adapter = new FileSystemAdapter({ directoryName: 'ne-keys', storage })
    const result = await adapter.clear()
    expect(isErr(result)).toBe(true)
  })

  it('non-Error en JSON.parse (lectura corrupta) → STORAGE_READ_FAILED', async () => {
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              getFileHandle: () =>
                Promise.resolve({
                  getFile: () => Promise.resolve(new File(['{invalid'], 'key')),
                }),
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
    const adapter = new FileSystemAdapter({ directoryName: 'ne-parse', storage })
    const result = await adapter.get('key')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })

  it('list con entries que inclúen directorios filtra defensivamente', async () => {
    // Mock que devolve unha entrada de tipo 'directory' mesturada con ficheiros
    const storage = {
      getDirectory: () =>
        Promise.resolve({
          getDirectoryHandle: () =>
            Promise.resolve({
              entries: () => {
                const items: [string, { kind: string }][] = [
                  ['file1', { kind: 'file' }],
                  ['subdir', { kind: 'directory' }],
                  ['file2', { kind: 'file' }],
                ]
                let i = 0
                return {
                  [Symbol.asyncIterator]: () => ({
                    next: () =>
                      i < items.length
                        ? Promise.resolve({ value: items[i++], done: false })
                        : Promise.resolve({ value: undefined, done: true }),
                  }),
                }
              },
            }),
        }),
      estimate: () => Promise.resolve({ quota: 0, usage: 0 }),
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    } as unknown as StorageManager
    const adapter = new FileSystemAdapter({ directoryName: 'dir-filter', storage })
    const result = await adapter.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['file1', 'file2'])
    }
  })
})
// ── FIN: tests de FileSystemAdapter ──
