import { ok } from '@yggdrasil-forge/common'
// ── INICIO: type-test de Migration ──
// Tests estáticos de tipos. Se compila, os tipos son correctos.
import { describe, expect, it } from 'vitest'
import type { Migration } from '../../../src/engine/migrations/Migration.js'

describe('Migration type-test', () => {
  it('acepta sinatura correcta con todos os campos', () => {
    const m: Migration = {
      from: '1.0.0',
      to: '2.0.0',
      description: 'Test migration',
      irreversible: true,
      migrate: async (data: unknown) => ok(data),
    }
    expect(m.from).toBe('1.0.0')
  })

  it('acepta sinatura sen irreversible (campo opcional)', () => {
    const m: Migration = {
      from: '1.0.0',
      to: '2.0.0',
      description: 'Test migration',
      migrate: async (data: unknown) => ok(data),
    }
    expect(m.irreversible).toBeUndefined()
  })

  it('migrate acepta unknown e devolve Result<unknown>', async () => {
    const m: Migration = {
      from: '1.0.0',
      to: '2.0.0',
      description: 'Test',
      migrate: async (data: unknown) => ok(data),
    }
    const result = await m.migrate({ test: true })
    expect(result.ok).toBe(true)
  })

  it('from e to son readonly', () => {
    const m: Migration = {
      from: '1.0.0',
      to: '2.0.0',
      description: 'Test',
      migrate: async (data: unknown) => ok(data),
    }
    // @ts-expect-error - from é readonly
    m.from = '3.0.0'
    expect(m).toBeDefined()
  })
})
// ── FIN: type-test de Migration ──
