// ── INICIO: tests de JsonSerializer (1.17) ──
import { ErrorCode } from '@yggdrasil-forge/common'
import { describe, expect, it } from 'vitest'
import { deserialize, serialize } from '../../src/engine/index.js'
import type { TreeDef } from '../../src/types/index.js'

/** TreeDef mínimo válido. */
function makeValidTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '0.0.0',
    label: 'Test Tree',
    nodes: [],
    edges: [],
    layout: { type: 'radial' },
    ...overrides,
  }
}

/** TreeDef más rico para round-trip realista. */
function makeRichTreeDef(): TreeDef {
  return makeValidTreeDef({
    description: { gl: 'descrición', es: 'descripción', en: 'description' },
    author: 'autor',
    rootNodeId: 'root',
    nodes: [
      { id: 'root', type: 'root', label: 'Raíz' },
      {
        id: 'a',
        type: 'small',
        label: { gl: 'A', en: 'A' },
        cost: [{ resourceId: 'xp', amount: 10 }],
        prerequisites: { type: 'node_unlocked', nodeId: 'root' },
        tags: ['t1', 't2'],
      },
    ],
    edges: [{ id: 'e1', source: 'root', target: 'a', type: 'dependency' }],
    resources: [{ id: 'xp', label: 'XP', initial: 0, max: 100 }],
    groups: [{ id: 'g1', label: 'Grupo', nodeIds: ['a'] }],
    stats: [{ id: 's1', label: 'Stat', format: 'percent' }],
    metadata: { custom: 'valor', n: 42 },
  })
}

describe('JsonSerializer', () => {
  describe('serialize', () => {
    it('produce JSON parseable que incluye schemaVersion', () => {
      const json = serialize(makeValidTreeDef())
      const parsed = JSON.parse(json)
      expect(parsed.schemaVersion).toBe('1.0.0')
      expect(parsed.id).toBe('test-tree')
    })

    it('es determinista: mismo TreeDef -> misma cadena', () => {
      const a = serialize(makeRichTreeDef())
      const b = serialize(makeRichTreeDef())
      expect(a).toBe(b)
    })

    it('orden de claves estable independientemente del orden de inserción', () => {
      // Dos objetos con las mismas claves en distinto orden.
      const t1 = makeValidTreeDef()
      const t2: TreeDef = {
        layout: { type: 'radial' },
        edges: [],
        nodes: [],
        label: 'Test Tree',
        version: '0.0.0',
        schemaVersion: '1.0.0',
        id: 'test-tree',
      }
      expect(serialize(t1)).toBe(serialize(t2))
    })

    it('NO incluye estado de runtime (solo la definición)', () => {
      const json = serialize(makeRichTreeDef())
      const parsed = JSON.parse(json)
      // TreeState tendría 'budget' / 'computedStats'; TreeDef no.
      expect(parsed.budget).toBeUndefined()
      expect(parsed.computedStats).toBeUndefined()
    })
  })

  describe('deserialize', () => {
    it('round-trip: serialize -> deserialize -> ok con mismos datos', () => {
      const original = makeRichTreeDef()
      const result = deserialize(serialize(original))
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe(original.id)
        expect(result.value.nodes.length).toBe(original.nodes.length)
      }
    })

    it('round-trip determinista: serialize(deserialize(serialize(x))) estable', () => {
      const s1 = serialize(makeRichTreeDef())
      const r = deserialize(s1)
      expect(r.ok).toBe(true)
      if (r.ok) {
        const s2 = serialize(r.value)
        expect(s2).toBe(s1)
        // Tercera vuelta para asegurar punto fijo.
        const r2 = deserialize(s2)
        expect(r2.ok).toBe(true)
        if (r2.ok) {
          expect(serialize(r2.value)).toBe(s1)
        }
      }
    })

    it('schemaVersion incorrecta -> err SCHEMA_VERSION_UNSUPPORTED', () => {
      const bad = serialize(makeValidTreeDef({ schemaVersion: '99.0.0' }))
      const result = deserialize(bad)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.SCHEMA_VERSION_UNSUPPORTED)
        expect(result.error.context?.found).toBe('99.0.0')
        expect(result.error.context?.supported).toBe('1.0.0')
      }
    })

    it('JSON malformado -> err controlado (INVALID_TREE_DEF, no excepción)', () => {
      const result = deserialize('{ esto no es json valido ]')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
        expect(result.error.context?.reason).toBe('JSON parse error')
      }
    })

    it('JSON válido pero estructura inválida -> err INVALID_TREE_DEF con issues', () => {
      const result = deserialize('{"id":"x"}')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
        expect(Array.isArray(result.error.context?.issues)).toBe(true)
      }
    })

    it('JSON "null" -> err controlado', () => {
      const result = deserialize('null')
      expect(result.ok).toBe(false)
    })

    it('schemaVersion incorrecta con locale en -> mensaje en inglés', () => {
      const bad = serialize(makeValidTreeDef({ schemaVersion: '2.0.0' }))
      const result = deserialize(bad, 'en')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Unsupported schema version')
      }
    })
  })
})

// ── INICIO: tests de deserializeAsync (sub-fase 3.5) ──
import { isErr, isOk, ok } from '@yggdrasil-forge/common'
import { deserializeAsync } from '../../src/engine/index.js'
import type { Migration } from '../../src/engine/migrations/Migration.js'
import { MigrationRegistry } from '../../src/engine/migrations/MigrationRegistry.js'

describe('deserializeAsync', () => {
  it('sen migrationRegistry: comportamento idéntico a deserialize', async () => {
    const json = serialize(makeValidTreeDef())
    const result = await deserializeAsync(json)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.id).toBe('test-tree')
    }
  })

  it('sen migrationRegistry + schemaVersion distinta: rexeita', async () => {
    const json = serialize(makeValidTreeDef({ schemaVersion: '0.9.0' }))
    const result = await deserializeAsync(json)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.SCHEMA_VERSION_UNSUPPORTED)
    }
  })

  it('con migrationRegistry baleiro + schemaVersion distinta: err(NO_MIGRATION_PATH)', async () => {
    const json = serialize(makeValidTreeDef({ schemaVersion: '0.9.0' }))
    const reg = new MigrationRegistry()
    const result = await deserializeAsync(json, 'gl', reg)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.NO_MIGRATION_PATH)
    }
  })

  it('con migración válida: migra e devolve TreeDef', async () => {
    const oldTree = makeValidTreeDef({ schemaVersion: '0.9.0' })
    const json = serialize(oldTree)

    const migration: Migration = {
      from: '0.9.0',
      to: '1.0.0',
      description: '0.9 → 1.0',
      migrate: async (data: unknown) => {
        const d = data as Record<string, unknown>
        return ok({ ...d, schemaVersion: '1.0.0' })
      },
    }
    const reg = new MigrationRegistry().register(migration)
    const result = await deserializeAsync(json, 'gl', reg)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.schemaVersion).toBe('1.0.0')
    }
  })

  it('schemaVersion coincide + registry presente: cero migración', async () => {
    const json = serialize(makeValidTreeDef())
    let migrateCalled = false
    const migration: Migration = {
      from: '1.0.0',
      to: '2.0.0',
      description: 'non debería chamarse',
      migrate: async (data: unknown) => {
        migrateCalled = true
        return ok(data)
      },
    }
    const reg = new MigrationRegistry().register(migration)
    const result = await deserializeAsync(json, 'gl', reg)
    expect(isOk(result)).toBe(true)
    expect(migrateCalled).toBe(false)
  })

  it('migración que devolve estrutura inválida: validation err', async () => {
    const json = serialize(makeValidTreeDef({ schemaVersion: '0.9.0' }))
    const migration: Migration = {
      from: '0.9.0',
      to: '1.0.0',
      description: 'produce lixo',
      migrate: async () => ok({ garbage: true, schemaVersion: '1.0.0' }),
    }
    const reg = new MigrationRegistry().register(migration)
    const result = await deserializeAsync(json, 'gl', reg)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
    }
  })

  it('JSON malformado: err sen intentar migrar', async () => {
    const reg = new MigrationRegistry()
    const result = await deserializeAsync('{not json', 'gl', reg)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
    }
  })

  it('JSON sen schemaVersion: valida normal (non tenta migración)', async () => {
    const reg = new MigrationRegistry()
    const result = await deserializeAsync('{"id":"x"}', 'gl', reg)
    expect(isErr(result)).toBe(true)
    // Falla na validación (falta schemaVersion e outros campos)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.INVALID_TREE_DEF)
    }
  })

  it('locale propaga a erros de migración', async () => {
    const json = serialize(makeValidTreeDef({ schemaVersion: '0.9.0' }))
    const reg = new MigrationRegistry()
    const result = await deserializeAsync(json, 'en', reg)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('migration')
    }
  })
})

// ── INICIO: F9.1 — round-trip de tiers ──
it('round-trip preserva NodeDef.tiers sen perda', () => {
  const original = makeValidTreeDef({
    nodes: [
      {
        id: 'ms1',
        type: 'small',
        label: 'Micro',
        tiers: [
          { label: { gl: 'Aprendiz', es: 'Aprendiz' }, description: { gl: 'Nivel 1' } },
          { description: { gl: 'Nivel 2' } },
          {},
        ],
      },
    ],
  })
  const json = serialize(original)
  const result = deserialize(json)
  expect(result.ok).toBe(true)
  if (result.ok) {
    const node = result.value.nodes[0]
    expect(node.tiers).toEqual([
      { label: { gl: 'Aprendiz', es: 'Aprendiz' }, description: { gl: 'Nivel 1' } },
      { description: { gl: 'Nivel 2' } },
      {},
    ])
  }
})
// ── FIN: F9.1 ──
// ── FIN: tests de JsonSerializer (1.17) ──
