import { ok } from '@yggdrasil-forge/common'
// ── INICIO: tests de MigrationRegistry ──
import { describe, expect, it } from 'vitest'
import type { Migration } from '../../../src/engine/migrations/Migration.js'
import { MigrationRegistry } from '../../../src/engine/migrations/MigrationRegistry.js'

function makeMigration(from: string, to: string, desc?: string): Migration {
  return {
    from,
    to,
    description: desc ?? `${from} → ${to}`,
    migrate: async (data: unknown) => ok(data),
  }
}

describe('MigrationRegistry', () => {
  it('registry baleiro: isEmpty true, size 0', () => {
    const reg = new MigrationRegistry()
    expect(reg.isEmpty()).toBe(true)
    expect(reg.size()).toBe(0)
  })

  it('register engade migración: find recupera', () => {
    const m = makeMigration('1.0.0', '2.0.0')
    const reg = new MigrationRegistry().register(m)
    expect(reg.find('1.0.0', '2.0.0')).toBe(m)
    expect(reg.isEmpty()).toBe(false)
    expect(reg.size()).toBe(1)
  })

  it('register sobreescribe se xa existe (from, to)', () => {
    const m1 = makeMigration('1.0.0', '2.0.0', 'primeira')
    const m2 = makeMigration('1.0.0', '2.0.0', 'segunda')
    const reg = new MigrationRegistry().register(m1).register(m2)
    expect(reg.find('1.0.0', '2.0.0')?.description).toBe('segunda')
    expect(reg.size()).toBe(1)
  })

  it('find con par inexistente devolve undefined', () => {
    const reg = new MigrationRegistry()
    expect(reg.find('1.0.0', '2.0.0')).toBeUndefined()
  })

  it('find con from existente pero to inexistente devolve undefined', () => {
    const reg = new MigrationRegistry().register(makeMigration('1.0.0', '2.0.0'))
    expect(reg.find('1.0.0', '3.0.0')).toBeUndefined()
  })

  it('findFrom devolve todas as migracións desde unha versión', () => {
    const m1 = makeMigration('1.0.0', '1.5.0')
    const m2 = makeMigration('1.0.0', '2.0.0')
    const reg = new MigrationRegistry().register(m1).register(m2)
    const results = reg.findFrom('1.0.0')
    expect(results).toHaveLength(2)
    expect(results).toContain(m1)
    expect(results).toContain(m2)
  })

  it('findFrom con from inexistente devolve array baleiro', () => {
    const reg = new MigrationRegistry()
    expect(reg.findFrom('1.0.0')).toEqual([])
  })

  it('chaining: register().register() funciona', () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '1.5.0'))
      .register(makeMigration('1.5.0', '2.0.0'))
    expect(reg.size()).toBe(2)
    expect(reg.find('1.0.0', '1.5.0')).toBeDefined()
    expect(reg.find('1.5.0', '2.0.0')).toBeDefined()
  })

  it('size conta total de migracións incluso con múltiples from', () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '1.5.0'))
      .register(makeMigration('1.0.0', '2.0.0'))
      .register(makeMigration('1.5.0', '2.0.0'))
    expect(reg.size()).toBe(3)
  })

  it('register devolve this (non copia)', () => {
    const reg = new MigrationRegistry()
    const returned = reg.register(makeMigration('1.0.0', '2.0.0'))
    expect(returned).toBe(reg)
  })
})
// ── FIN: tests de MigrationRegistry ──
