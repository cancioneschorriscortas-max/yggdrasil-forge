import { isOk } from '@yggdrasil-forge/common'
// ── INICIO: tests de MemoryStorage ──
import { describe, expect, it, vi } from 'vitest'
import { MemoryStorage } from '../src/MemoryStorage.js'

describe('MemoryStorage — operacións básicas', () => {
  it('get con clave inexistente devolve ok(null)', async () => {
    const store = new MemoryStorage()
    const result = await store.get('non-existent')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('set + get recupera o valor exacto (===)', async () => {
    const store = new MemoryStorage()
    const obj = { id: 1, name: 'test' }
    await store.set('key', obj)
    const result = await store.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe(obj) // referencia exacta
    }
  })

  it('set sobreescribe o valor existente', async () => {
    const store = new MemoryStorage()
    await store.set('key', 'primeiro')
    await store.set('key', 'segundo')
    const result = await store.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('segundo')
    }
  })

  it('delete elimina a clave; get posterior devolve ok(null)', async () => {
    const store = new MemoryStorage()
    await store.set('key', 42)
    const delResult = await store.delete('key')
    expect(isOk(delResult)).toBe(true)
    const getResult = await store.get('key')
    expect(isOk(getResult)).toBe(true)
    if (isOk(getResult)) {
      expect(getResult.value).toBeNull()
    }
  })

  it('delete con clave inexistente non lanza e devolve ok(undefined)', async () => {
    const store = new MemoryStorage()
    const result = await store.delete('non-existent')
    expect(isOk(result)).toBe(true)
  })
})

describe('MemoryStorage — list', () => {
  it('list() sen prefix devolve todas as claves', async () => {
    const store = new MemoryStorage()
    await store.set('a', 1)
    await store.set('b', 2)
    await store.set('c', 3)
    const result = await store.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['a', 'b', 'c'])
    }
  })

  it('list(prefix) filtra correctamente', async () => {
    const store = new MemoryStorage()
    await store.set('user:1', 'alice')
    await store.set('user:2', 'bob')
    await store.set('session:1', 'tok')
    const result = await store.list('user:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['user:1', 'user:2'])
    }
  })

  it('list() en storage baleiro devolve ok([])', async () => {
    const store = new MemoryStorage()
    const result = await store.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })
})

describe('MemoryStorage — clear', () => {
  it('clear elimina todas as claves', async () => {
    const store = new MemoryStorage()
    await store.set('x', 1)
    await store.set('y', 2)
    const clearResult = await store.clear()
    expect(isOk(clearResult)).toBe(true)
    const listResult = await store.list()
    expect(isOk(listResult)).toBe(true)
    if (isOk(listResult)) {
      expect(listResult.value).toEqual([])
    }
  })

  it('clear en storage baleiro non lanza', async () => {
    const store = new MemoryStorage()
    const result = await store.clear()
    expect(isOk(result)).toBe(true)
  })
})

describe('MemoryStorage — watch', () => {
  it('watch con set posterior chama o callback co valor novo', async () => {
    const store = new MemoryStorage()
    const cb = vi.fn()
    store.watch('key', cb)
    await store.set('key', 'valor')
    expect(cb).toHaveBeenCalledOnce()
    expect(cb).toHaveBeenCalledWith('valor')
  })

  it('watch non recibe notificación ao modificar OUTRA clave', async () => {
    const store = new MemoryStorage()
    const cb = vi.fn()
    store.watch('key-a', cb)
    await store.set('key-b', 'outro')
    expect(cb).not.toHaveBeenCalled()
  })

  it('watch con delete chama o callback con null', async () => {
    const store = new MemoryStorage()
    const cb = vi.fn()
    store.watch('key', cb)
    await store.set('key', 'valor')
    cb.mockClear()
    await store.delete('key')
    expect(cb).toHaveBeenCalledOnce()
    expect(cb).toHaveBeenCalledWith(null)
  })

  it('watch con clear chama o callback con null para esa clave', async () => {
    const store = new MemoryStorage()
    const cb = vi.fn()
    store.watch('key', cb)
    await store.set('key', 'valor')
    cb.mockClear()
    await store.clear()
    expect(cb).toHaveBeenCalledOnce()
    expect(cb).toHaveBeenCalledWith(null)
  })

  it('función de desubscrición funciona: tras chamala o callback non se chama', async () => {
    const store = new MemoryStorage()
    const cb = vi.fn()
    const unsubscribe = store.watch('key', cb)
    unsubscribe()
    await store.set('key', 'valor')
    expect(cb).not.toHaveBeenCalled()
  })

  it('desubscrición limpa o set de watchers cando queda baleiro', async () => {
    const store = new MemoryStorage()
    const cb = vi.fn()
    const unsubscribe = store.watch('key', cb)
    // Desubscrición cando hai un só watcher → o Set elimínase completamente
    unsubscribe()
    // Chamar de novo non debe lanzar (o Set xa non existe)
    unsubscribe()
    await store.set('key', 'valor')
    expect(cb).not.toHaveBeenCalled()
  })

  it('desubscrición dun callback non elimina os restantes', async () => {
    const store = new MemoryStorage()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const unsubscribe1 = store.watch('key', cb1)
    store.watch('key', cb2)
    // Desubscrición de cb1 cando cb2 aínda está rexistrado (s.size > 0 tras delete)
    unsubscribe1()
    await store.set('key', 'valor')
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledWith('valor')
  })

  it('múltiples watchers na mesma clave: todos reciben notificación', async () => {
    const store = new MemoryStorage()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    store.watch('key', cb1)
    store.watch('key', cb2)
    await store.set('key', 42)
    expect(cb1).toHaveBeenCalledWith(42)
    expect(cb2).toHaveBeenCalledWith(42)
  })

  it('callback que lanza erro non rompe outros watchers nin operacións posteriores', async () => {
    const store = new MemoryStorage()
    const cbMalo = vi.fn(() => {
      throw new Error('callback roto')
    })
    const cbBo = vi.fn()
    store.watch('key', cbMalo)
    store.watch('key', cbBo)
    await store.set('key', 'valor')
    expect(cbBo).toHaveBeenCalledWith('valor')
    // Operación posterior tamén funciona
    const result = await store.get('key')
    expect(isOk(result)).toBe(true)
  })
})

describe('MemoryStorage — comportamento referencial', () => {
  it('set garda referencia: mutar o orixinal afecta o almacenado', async () => {
    const store = new MemoryStorage()
    const obj = { count: 0 }
    await store.set('key', obj)
    obj.count = 99
    const result = await store.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect((result.value as typeof obj).count).toBe(99)
    }
  })
})

describe('MemoryStorage — tipos diversos', () => {
  it('acepta valores arbitrarios sen serializar: Date, Map, Set, funcións, undefined, null, NaN', async () => {
    const store = new MemoryStorage()
    const date = new Date('2025-01-01')
    const map = new Map([['a', 1]])
    const set = new Set([1, 2, 3])
    const fn = () => 42
    await store.set('date', date)
    await store.set('map', map)
    await store.set('set', set)
    await store.set('fn', fn)
    await store.set('undef', undefined)
    await store.set('null', null)
    await store.set('nan', Number.NaN)

    const rDate = await store.get('date')
    const rMap = await store.get('map')
    const rSet = await store.get('set')
    const rFn = await store.get('fn')
    const rUndef = await store.get('undef')
    const rNull = await store.get('null')
    const rNan = await store.get('nan')

    expect(isOk(rDate) && rDate.value).toBe(date)
    expect(isOk(rMap) && rMap.value).toBe(map)
    expect(isOk(rSet) && rSet.value).toBe(set)
    expect(isOk(rFn) && rFn.value).toBe(fn)
    // undefined gardar → get devolve null (Map.get retorna undefined, ?? null converte)
    expect(isOk(rUndef) && rUndef.value).toBeNull()
    expect(isOk(rNull) && rNull.value).toBeNull()
    expect(isOk(rNan)).toBe(true)
    if (isOk(rNan)) {
      expect(Number.isNaN(rNan.value)).toBe(true)
    }
  })
})

describe('MemoryStorage — asincronía', () => {
  it('todos os métodos devolven Promise (compatible coa interface)', async () => {
    const store = new MemoryStorage()
    const setP = store.set('k', 1)
    const getP = store.get('k')
    const listP = store.list()
    const delP = store.delete('k')
    const clearP = store.clear()

    expect(setP).toBeInstanceOf(Promise)
    expect(getP).toBeInstanceOf(Promise)
    expect(listP).toBeInstanceOf(Promise)
    expect(delP).toBeInstanceOf(Promise)
    expect(clearP).toBeInstanceOf(Promise)

    await Promise.all([setP, getP, listP, delP, clearP])
  })
})
// ── FIN: tests de MemoryStorage ──
