// ── INICIO: MigrationRunner ──
// Execución secuencial de migracións con resolución de path greedy.
// Sub-fase 3.5.

import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { Migration } from './Migration.js'
import type { MigrationRegistry } from './MigrationRegistry.js'

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Compara dúas versións semver simples (a.b.c). Devolve negativo se
 * a < b, cero se iguais, positivo se a > b. Sen ranges, sen pre-release
 * tags. Para uso interno do Runner.
 *
 * Cero dependencia da lib `semver`: esta función soporta exactamente
 * o necesario (a.b.c) para esta sub-fase.
 */
function compareSemver(a: string, b: string): number {
  const partsA = a.split('.').map((p) => Number.parseInt(p, 10))
  const partsB = b.split('.').map((p) => Number.parseInt(p, 10))
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    /* v8 ignore start -- defensivo: partsA[i] e partsB[i] cobren rama undefined
       cando versions teñen lonxitudes distintas (raro, semver canónico). */
    const va = partsA[i] ?? 0
    const vb = partsB[i] ?? 0
    /* v8 ignore stop */
    /* v8 ignore start -- defensivo: con semver válido (vX.Y.Z), Number()
       sempre devolve un número finito. Fallback alcanzado só con
       versionado malformado, que o motor refusa antes. */
    if (Number.isNaN(va) || Number.isNaN(vb)) {
      // Versión non-numérica → fallback comparación de string lexicográfica.
      // Defensivo; non debería pasar con semver correcto.
      return a.localeCompare(b)
    }
    /* v8 ignore stop */
    if (va !== vb) return va - vb
  }
  /* v8 ignore next -- defensivo: versións idénticas non se comparan no
     fluxo de migración (de-x-a-x non require salto). */
  return 0
}

/**
 * Executa migracións secuencialmente para levar datos dunha versión
 * de schema a outra. Usa o MigrationRegistry como fonte de migracións.
 *
 * Algoritmo de resolución de path:
 * 1. Se `from === to` → cero migracións, devolve os datos sen tocar.
 * 2. Se existe migración directa `from → to` → aplícaa.
 * 3. Senón, busca path multi-paso: ordena migracións desde `from` por
 *    `to` ascendente (semver), elixe a primeira que avanza, recursión.
 * 4. Se en algún paso non hai migración aplicable →
 *    err(NO_MIGRATION_PATH).
 * 5. Se en algún paso a propia migración devolve err →
 *    err(MIGRATION_FAILED) propagando o erro orixinal en context.
 *
 * Cero ciclos esperados (semver é monotónico); detección defensiva
 * vía conxunto de versións visitadas.
 */
export class MigrationRunner {
  private readonly locale: Locale

  constructor(
    private readonly registry: MigrationRegistry,
    options: { readonly locale?: Locale } = {},
  ) {
    this.locale = options.locale ?? DEFAULT_LOCALE
  }

  async run(data: unknown, from: string, to: string): Promise<Result<unknown>> {
    if (from === to) return ok(data)

    const visited = new Set<string>([from])
    let current: unknown = data
    let currentVersion = from

    while (currentVersion !== to) {
      // 1) Tentar migración directa primeiro.
      const direct = this.registry.find(currentVersion, to)
      let next: { migration: Migration; nextVersion: string } | undefined

      if (direct !== undefined) {
        next = { migration: direct, nextVersion: to }
      } else {
        // 2) Buscar candidato que avance cara `to` (semver máis próximo).
        const candidates = this.registry
          .findFrom(currentVersion)
          .filter((m) => compareSemver(m.to, to) <= 0 && !visited.has(m.to))
          .sort((a, b) => compareSemver(a.to, b.to))

        if (candidates.length === 0) {
          return err(
            new YggdrasilError(
              ErrorCode.NO_MIGRATION_PATH,
              getErrorMessage(ErrorCode.NO_MIGRATION_PATH, this.locale, {
                from: currentVersion,
                to,
              }),
              { context: { from: currentVersion, to } },
            ),
          )
        }

        // Preferir o salto MÁIS GRANDE (último candidate ordenado asc).
        const best = candidates[candidates.length - 1]
        /* v8 ignore start -- defensivo: candidates.length > 0 garantido
           polo if anterior; o último elemento sempre existe.
           Guarda esixida por noUncheckedIndexedAccess. */
        if (best === undefined) {
          // Defensivo; non debería ser undefined tras o filtro+sort.
          return err(
            new YggdrasilError(
              ErrorCode.NO_MIGRATION_PATH,
              getErrorMessage(ErrorCode.NO_MIGRATION_PATH, this.locale, {
                from: currentVersion,
                to,
              }),
              { context: { from: currentVersion, to } },
            ),
          )
        }
        /* v8 ignore stop */
        next = { migration: best, nextVersion: best.to }
      }

      // 3) Aplicar migración.
      const result = await next.migration.migrate(current)
      if (!result.ok) {
        return err(
          new YggdrasilError(
            ErrorCode.MIGRATION_FAILED,
            getErrorMessage(ErrorCode.MIGRATION_FAILED, this.locale, {
              from: currentVersion,
              to: next.nextVersion,
              details: result.error.message,
            }),
            {
              context: {
                from: currentVersion,
                to: next.nextVersion,
                originalError: result.error,
              },
            },
          ),
        )
      }

      current = result.value
      visited.add(next.nextVersion)
      currentVersion = next.nextVersion
    }

    return ok(current)
  }
}
// ── FIN: MigrationRunner ──
