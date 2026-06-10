import { isOk } from '@yggdrasil-forge/common'
// ── INICIO: tests de ScopedStorage ──
import { describe, expect, it } from 'vitest'
import { MemoryStorage } from '../src/MemoryStorage.js'
import { ScopedStorage } from '../src/ScopedStorage.js'
import type { StorageAdapter } from '../src/StorageAdapter.js'

/** StorageAdapter sen watch, para testar a rama condicional. */
class StorageWithoutWatch implements StorageAdapter {
  private readonly inner = new MemoryStorage()
  get = (key: string) => this.inner.get(key)
  set = (key: string, value: unknown) => this.inner.set(key, value)
  delete = (key: string) => this.inner.delete(key)
  list = (prefix?: string) => this.inner.list(prefix)
  clear = () => this.inner.clear()
  // intencionalmente sen watch
}

// ── Constructor ──

describe('ScopedStorage — constructor', () => {
  it('scope vacío lanza Error', () => {
    expect(() => new ScopedStorage(new MemoryStorage(), '')).toThrow('scope cannot be empty')
  })

  it('scope con ":" lanza Error', () => {
    expect(() => new ScopedStorage(new MemoryStorage(), 'a:b')).toThrow("scope cannot contain ':'")
  })

  it('scope válido constrúe sen erro', () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    expect(scoped).toBeInstanceOf(ScopedStorage)
  })
})

// ── Operacións básicas ──

describe('ScopedStorage — operacións básicas', () => {
  it('aplica prefixo: clave física é scope:key', async () => {
    const base = new MemoryStorage()
    const scoped = new ScopedStorage(base, 'tenant_a')
    await scoped.set('foo', 'bar')
    const direct = await base.get('tenant_a:foo')
    expect(isOk(direct)).toBe(true)
    if (isOk(direct)) {
      expect(direct.value).toBe('bar')
    }
  })

  it('get con clave inexistente devolve ok(null)', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    const result = await scoped.get('non-existent')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('set sobreescribe valor existente', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    await scoped.set('key', 'v1')
    await scoped.set('key', 'v2')
    const result = await scoped.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe('v2')
    }
  })

  it('delete elimina; get posterior devolve null', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    await scoped.set('key', 'value')
    await scoped.delete('key')
    const result = await scoped.get('key')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBeNull()
    }
  })

  it('delete sobre clave inexistente devolve ok', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    const result = await scoped.delete('non-existent')
    expect(isOk(result)).toBe(true)
  })

  it('roundtrip dun obxecto complexo', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    const obj = {
      name: 'Alice',
      scores: [10, 20, 30],
      nested: { ok: true },
    }
    await scoped.set('data', obj)
    const result = await scoped.get('data')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual(obj)
    }
  })
})

// ── list ──

describe('ScopedStorage — list', () => {
  it('list() sen prefix: todas as claves do scope, sen scope', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    await scoped.set('a', 1)
    await scoped.set('b', 2)
    const result = await scoped.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['a', 'b'])
    }
  })

  it('list(prefix): claves que casen, sen scope', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    await scoped.set('engine:alice:state', 1)
    await scoped.set('engine:bob:state', 2)
    await scoped.set('build:x', 3)
    const result = await scoped.list('engine:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.sort()).toEqual(['engine:alice:state', 'engine:bob:state'])
    }
  })

  it('list() en storage baleiro devolve ok([])', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    const result = await scoped.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })

  it('list(prefix) non coincidente devolve ok([])', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    await scoped.set('foo', 1)
    const result = await scoped.list('bar:')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([])
    }
  })
})

// ── clear ──

describe('ScopedStorage — clear', () => {
  it('clear() borra só o scope; outras claves intactas', async () => {
    const base = new MemoryStorage()
    const tenantA = new ScopedStorage(base, 'tenant_a')
    const tenantB = new ScopedStorage(base, 'tenant_b')
    await tenantA.set('x', 1)
    await tenantB.set('y', 2)
    // Tamén unha clave sen scope
    await base.set('global', 99)

    await tenantA.clear()

    // tenantA baleiro
    const listA = await tenantA.list()
    expect(isOk(listA)).toBe(true)
    if (isOk(listA)) expect(listA.value).toEqual([])

    // tenantB intacto
    const valB = await tenantB.get('y')
    expect(isOk(valB)).toBe(true)
    if (isOk(valB)) expect(valB.value).toBe(2)

    // Global intacto
    const valG = await base.get('global')
    expect(isOk(valG)).toBe(true)
    if (isOk(valG)) expect(valG.value).toBe(99)
  })

  it('clear() en scope baleiro devolve ok', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    const result = await scoped.clear()
    expect(isOk(result)).toBe(true)
  })

  it('clear() despois de set N claves: list() devolve []', async () => {
    const scoped = new ScopedStorage(new MemoryStorage(), 'tenant_a')
    await scoped.set('a', 1)
    await scoped.set('b', 2)
    await scoped.set('c', 3)
    await scoped.clear()
    const result = await scoped.list()
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })
})

// ── watch ──

describe('ScopedStorage — watch', () => {
  it('base con watch: scopedStorage.watch é function', () => {
    const base = new MemoryStorage()
    const scoped = new ScopedStorage(base, 'tenant_a')
    expect(typeof scoped.watch).toBe('function')
  })

  it('watch dispara callback con valor correcto', async () => {
    const base = new MemoryStorage()
    const scoped = new ScopedStorage(base, 'tenant_a')
    let watchedValue: unknown = undefined
    if (scoped.watch) {
      scoped.watch('key', (v) => {
        watchedValue = v
      })
    }
    await scoped.set('key', 'hello')
    expect(watchedValue).toBe('hello')
  })

  it('base sen watch: scopedStorage.watch é undefined', () => {
    const base = new StorageWithoutWatch()
    const scoped = new ScopedStorage(base, 'tenant_a')
    expect(scoped.watch).toBeUndefined()
  })
})

// ── Anidación + isolation ──

describe('ScopedStorage — anidación + isolation', () => {
  it('ScopedStorage anidado: clave física é s2:s1:key', async () => {
    const base = new MemoryStorage()
    const inner = new ScopedStorage(base, 's1')
    const outer = new ScopedStorage(inner, 's2')
    await outer.set('foo', 'bar')
    // Clave física no base é s1:s2:foo (s1 é inner, s2 prefixa sobre s1)
    // inner prefixa con 's1:', outer prefixa con 's2:' sobre inner
    // Así: outer.set('foo') → inner.set('s2:foo') → base.set('s1:s2:foo')
    const direct = await base.get('s1:s2:foo')
    expect(isOk(direct)).toBe(true)
    if (isOk(direct)) {
      expect(direct.value).toBe('bar')
    }
  })

  it('cross-tenant isolation: clear(A) non afecta B', async () => {
    const base = new MemoryStorage()
    const tenantA = new ScopedStorage(base, 'a')
    const tenantB = new ScopedStorage(base, 'b')
    await tenantA.set('data', 'dataA')
    await tenantB.set('data', 'dataB')
    await tenantA.clear()
    // B intacto
    const result = await tenantB.get('data')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toBe('dataB')
    // A baleiro
    const resultA = await tenantA.get('data')
    expect(isOk(resultA)).toBe(true)
    if (isOk(resultA)) expect(resultA.value).toBeNull()
  })

  it('cross-tenant list(): só claves do propio scope', async () => {
    const base = new MemoryStorage()
    const tenantA = new ScopedStorage(base, 'a')
    const tenantB = new ScopedStorage(base, 'b')
    await tenantA.set('x', 1)
    await tenantA.set('y', 2)
    await tenantB.set('z', 3)
    const listA = await tenantA.list()
    expect(isOk(listA)).toBe(true)
    if (isOk(listA)) {
      expect(listA.value.sort()).toEqual(['x', 'y'])
    }
  })
})
// ── FIN: tests de ScopedStorage ──
