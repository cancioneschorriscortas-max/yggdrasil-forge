// ── INICIO: Migration interface ──
// Contrato de migración entre versións de esquema de TreeDef segundo
// MASTER §22. O parámetro é `unknown` (non `TreeDef`) porque o dato
// migrado é un TreeDef dunha versión anterior cuxa estrutura non
// coincide co schema actual; o consumidor da migración casteará
// internamente á forma que coñece.

import type { Result } from '@yggdrasil-forge/common'

/**
 * Migración entre dúas versións de schema concretas.
 *
 * - `from` e `to` son cadeas semver exactas (sen ranges).
 * - `migrate` é async e devolve Result para permitir fallos limpos.
 * - `irreversible` é informativo nesta sub-fase (cero unmigrate aínda).
 */
export interface Migration {
  /**
   * Versión do schema de orixe (semver exacto, ex: '1.0.0').
   */
  readonly from: string

  /**
   * Versión do schema de destino (semver exacto, ex: '2.0.0').
   */
  readonly to: string

  /**
   * Función que transforma datos de `from` a `to`. Acepta `unknown`
   * porque a estrutura de orixe non coincide co schema actual.
   *
   * O retorno é `Result<unknown>` (non `Result<TreeDef>`) porque pode
   * haber migracións encadeadas; só a final é validada contra o
   * schema actual.
   */
  migrate(oldData: unknown): Promise<Result<unknown>>

  /**
   * Descrición humana da migración (para logs e debugging).
   */
  readonly description: string

  /**
   * Se true, indica que esta migración non se pode reverter. Campo
   * informativo nesta sub-fase; o sistema non implementa unmigrate.
   */
  readonly irreversible?: boolean
}
// ── FIN: Migration interface ──
