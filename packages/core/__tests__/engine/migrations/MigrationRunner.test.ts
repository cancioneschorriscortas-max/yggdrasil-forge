import { ErrorCode, YggdrasilError, err, isErr, isOk, ok } from '@yggdrasil-forge/common'
// ── INICIO: tests de MigrationRunner ──
import { describe, expect, it } from 'vitest'
import type { Migration } from '../../../src/engine/migrations/Migration.js'
import { MigrationRegistry } from '../../../src/engine/migrations/MigrationRegistry.js'
import { MigrationRunner } from '../../../src/engine/migrations/MigrationRunner.js'

function makeMigration(from: string, to: string, transform?: (d: unknown) => unknown): Migration {
  return {
    from,
    to,
    description: `${from} → ${to}`,
    migrate: async (data: unknown) => ok(transform ? transform(data) : data),
  }
}

function makeFailingMigration(from: string, to: string): Migration {
  return {
    from,
    to,
    description: `${from} → ${to} (falla)`,
    migrate: async () => err(new YggdrasilError(ErrorCode.MIGRATION_FAILED, 'internal failure')),
  }
}

describe('MigrationRunner — operacións básicas', () => {
  it('from === to → cero migracións, ok(data) inmediato', async () => {
    const reg = new MigrationRegistry()
    const runner = new MigrationRunner(reg)
    const result = await runner.run({ v: 1 }, '1.0.0', '1.0.0')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ v: 1 })
  })

  it('migración directa 1.0.0 → 2.0.0', async () => {
    const reg = new MigrationRegistry().register(
      makeMigration('1.0.0', '2.0.0', (d) => ({ ...(d as object), v: 2 })),
    )
    const runner = new MigrationRunner(reg)
    const result = await runner.run({ v: 1 }, '1.0.0', '2.0.0')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ v: 2 })
  })

  it('migración encadeada 1.0.0 → 1.5.0 → 2.0.0', async () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '1.5.0', (d) => ({ ...(d as object), step1: true })))
      .register(makeMigration('1.5.0', '2.0.0', (d) => ({ ...(d as object), step2: true })))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({ v: 1 }, '1.0.0', '2.0.0')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ v: 1, step1: true, step2: true })
  })
})

describe('MigrationRunner — greedy (salto máximo)', () => {
  it('prefire 1.0→2.0 sobre 1.0→1.5 cando destino é 2.0', async () => {
    let directUsed = false
    const reg = new MigrationRegistry().register(makeMigration('1.0.0', '1.5.0')).register({
      from: '1.0.0',
      to: '2.0.0',
      description: 'direct',
      migrate: async (d) => {
        directUsed = true
        return ok(d)
      },
    })
    const runner = new MigrationRunner(reg)
    await runner.run({}, '1.0.0', '2.0.0')
    expect(directUsed).toBe(true)
  })

  it('encadea cando non hai directa', async () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '1.5.0', (d) => ({ ...(d as object), s1: true })))
      .register(makeMigration('1.5.0', '2.0.0', (d) => ({ ...(d as object), s2: true })))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ s1: true, s2: true })
  })

  it('con múltiples saltos, prefire o maior (greedy)', async () => {
    // 1.0→1.3, 1.0→1.7, 1.7→2.0. Destino 2.0: debería ir 1.0→1.7→2.0
    const steps: string[] = []
    const reg = new MigrationRegistry()
      .register({
        from: '1.0.0',
        to: '1.3.0',
        description: '→1.3',
        migrate: async (d) => {
          steps.push('1.3')
          return ok(d)
        },
      })
      .register({
        from: '1.0.0',
        to: '1.7.0',
        description: '→1.7',
        migrate: async (d) => {
          steps.push('1.7')
          return ok(d)
        },
      })
      .register({
        from: '1.7.0',
        to: '2.0.0',
        description: '→2.0',
        migrate: async (d) => {
          steps.push('2.0')
          return ok(d)
        },
      })
      .register({
        from: '1.3.0',
        to: '2.0.0',
        description: '1.3→2.0',
        migrate: async (d) => {
          steps.push('1.3→2.0')
          return ok(d)
        },
      })
    const runner = new MigrationRunner(reg)
    await runner.run({}, '1.0.0', '2.0.0')
    // Direct 1.0→2.0 non existe, así que busca greedy: 1.7 > 1.3, vai a 1.7
    expect(steps).toEqual(['1.7', '2.0'])
  })
})

describe('MigrationRunner — edge cases', () => {
  it('cero migracións dispoñibles → err(NO_MIGRATION_PATH)', async () => {
    const reg = new MigrationRegistry()
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe(ErrorCode.NO_MIGRATION_PATH)
  })

  it('migración existe pero non conecta → err(NO_MIGRATION_PATH)', async () => {
    const reg = new MigrationRegistry().register(makeMigration('1.0.0', '1.5.0'))
    const runner = new MigrationRunner(reg)
    // Destino 2.0.0 pero só hai 1.0→1.5 (e non hai 1.5→2.0)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe(ErrorCode.NO_MIGRATION_PATH)
  })

  it('migración interna falla → err(MIGRATION_FAILED)', async () => {
    const reg = new MigrationRegistry().register(makeFailingMigration('1.0.0', '2.0.0'))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.MIGRATION_FAILED)
      expect(result.error.context?.originalError).toBeInstanceOf(YggdrasilError)
    }
  })

  it('ciclo defensivo: 1.0→2.0 e 2.0→1.0 con destino 3.0', async () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '2.0.0'))
      .register(makeMigration('2.0.0', '1.0.0'))
    const runner = new MigrationRunner(reg)
    // Non hai 2.0→3.0 nin nada que leve a 3.0, e visited impide volver a 1.0
    const result = await runner.run({}, '1.0.0', '3.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe(ErrorCode.NO_MIGRATION_PATH)
  })
})

describe('MigrationRunner — compareSemver', () => {
  it('1.0.0 < 1.0.1', async () => {
    const reg = new MigrationRegistry().register(
      makeMigration('1.0.0', '1.0.1', (d) => ({ ...(d as object), patched: true })),
    )
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '1.0.1')
    expect(isOk(result)).toBe(true)
  })

  it('1.0.10 > 1.0.2 (numérico, non lexicográfico)', async () => {
    // Hai 1.0.0→1.0.2 e 1.0.0→1.0.10, destino 1.0.10: usa directa
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '1.0.2'))
      .register(makeMigration('1.0.0', '1.0.10', (d) => ({ ...(d as object), correct: true })))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '1.0.10')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ correct: true })
  })

  it('versión non-numérica via path indirecto (compareSemver NaN)', async () => {
    // Forzar path INDIRECTO para que compareSemver se invoque con NaN
    const reg = new MigrationRegistry()
      .register(makeMigration('alpha', 'beta'))
      .register(makeMigration('beta', 'gamma'))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, 'alpha', 'gamma')
    expect(isOk(result)).toBe(true)
  })

  it('versión con partes non-numéricas mesturadas (1.x.0)', async () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.x.0', '1.y.0'))
      .register(makeMigration('1.y.0', '1.z.0'))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.x.0', '1.z.0')
    expect(isOk(result)).toBe(true)
  })

  it('compareSemver con versións equivalentes (1.0 vs 1.0.0) no sort', async () => {
    // Dous candidatos con `to` numericamente iguais pero formato distinto
    // para forzar compareSemver a devolver 0 no sort.
    const reg = new MigrationRegistry()
      .register(makeMigration('0.9.0', '1.0'))
      .register(makeMigration('0.9.0', '1.0.0'))
    const runner = new MigrationRunner(reg)
    // Destino 1.0.0, hai candidatos 1.0 e 1.0.0 (ambos <= 1.0.0)
    const result = await runner.run({}, '0.9.0', '1.0.0')
    expect(isOk(result)).toBe(true)
  })
})

describe('MigrationRunner — locale', () => {
  it('erros usan locale gl por defecto', async () => {
    const reg = new MigrationRegistry()
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('migración')
    }
  })

  it('erros usan locale inxectado (en)', async () => {
    const reg = new MigrationRegistry()
    const runner = new MigrationRunner(reg, { locale: 'en' })
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('migration')
    }
  })

  it('erros de migración fallida usan locale', async () => {
    const reg = new MigrationRegistry().register(makeFailingMigration('1.0.0', '2.0.0'))
    const runner = new MigrationRunner(reg, { locale: 'es' })
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('migración')
    }
  })
})

describe('MigrationRunner — multi-paso complexo', () => {
  it('cadea longa: 1.0→1.2→1.5→1.8→2.0', async () => {
    const steps: string[] = []
    const reg = new MigrationRegistry()
      .register({
        from: '1.0.0',
        to: '1.2.0',
        description: '→1.2',
        migrate: async (d) => {
          steps.push('1.2')
          return ok(d)
        },
      })
      .register({
        from: '1.2.0',
        to: '1.5.0',
        description: '→1.5',
        migrate: async (d) => {
          steps.push('1.5')
          return ok(d)
        },
      })
      .register({
        from: '1.5.0',
        to: '1.8.0',
        description: '→1.8',
        migrate: async (d) => {
          steps.push('1.8')
          return ok(d)
        },
      })
      .register({
        from: '1.8.0',
        to: '2.0.0',
        description: '→2.0',
        migrate: async (d) => {
          steps.push('2.0')
          return ok(d)
        },
      })
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isOk(result)).toBe(true)
    expect(steps).toEqual(['1.2', '1.5', '1.8', '2.0'])
  })

  it('migración falla no medio da cadea → MIGRATION_FAILED', async () => {
    const reg = new MigrationRegistry()
      .register(makeMigration('1.0.0', '1.5.0'))
      .register(makeFailingMigration('1.5.0', '2.0.0'))
    const runner = new MigrationRunner(reg)
    const result = await runner.run({}, '1.0.0', '2.0.0')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.MIGRATION_FAILED)
      expect(result.error.context?.from).toBe('1.5.0')
    }
  })
})
// ── FIN: tests de MigrationRunner ──
