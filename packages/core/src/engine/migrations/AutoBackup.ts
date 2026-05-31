// ── INICIO: AutoBackup ──
// Safety net que persiste estado pre-migración en BackupStorage inxectado.
// Sub-fase 3.5. MASTER §47: "Migration falla → Backup automático restaurado."

import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'

/**
 * Interface mínima do StorageAdapter consumido por AutoBackup. Espello
 * de @yggdrasil-forge/storage StorageAdapter pero **NON importamos
 * desde storage** (cero acoplamento entre core e storage). O consumidor
 * pásanos calquera obxecto que cumpra esta forma mínima.
 */
export interface BackupStorage {
  set(key: string, value: unknown): Promise<Result<void>>
  get(key: string): Promise<Result<unknown | null>>
}

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Safety net que garda backup antes de migracións.
 *
 * Política:
 * - Antes de calquera operación: garda o estado actual nun
 *   `BackupStorage` inxectado.
 * - Se a operación falla: o backup queda. Restauración é explícita
 *   (método `restore`).
 * - Se a operación éxito: o backup queda gardado tamén; o consumidor
 *   xestiona limpeza (purga manual ou política de retención).
 *
 * Clave de backup: `backup:{treeId}:{timestamp}`. O consumidor pasa
 * `treeId`; timestamp xérase internamente con `Date.now()`.
 */
export class AutoBackup {
  private readonly locale: Locale

  constructor(
    private readonly storage: BackupStorage,
    options: { readonly locale?: Locale } = {},
  ) {
    this.locale = options.locale ?? DEFAULT_LOCALE
  }

  /**
   * Garda un backup do estado actual e devolve a clave usada.
   * Útil chamar antes dunha migración.
   */
  async backup(
    treeId: string,
    data: unknown,
  ): Promise<Result<{ readonly key: string; readonly timestamp: number }>> {
    const timestamp = Date.now()
    const key = `backup:${treeId}:${timestamp}`
    const result = await this.storage.set(key, data)
    if (!result.ok) {
      return err(
        new YggdrasilError(
          ErrorCode.STORAGE_WRITE_FAILED,
          getErrorMessage(ErrorCode.STORAGE_WRITE_FAILED, this.locale, {
            key,
            reason: 'backup write failed',
            originalErrorMessage: result.error.message,
          }),
          {
            context: { key, treeId, originalError: result.error },
          },
        ),
      )
    }
    return ok({ key, timestamp })
  }

  /**
   * Recupera un backup previamente gardado.
   * Devolve err(STORAGE_READ_FAILED) se non existe ou lectura falla.
   */
  async restore(key: string): Promise<Result<unknown>> {
    const result = await this.storage.get(key)
    if (!result.ok) {
      return result
    }
    if (result.value === null) {
      return err(
        new YggdrasilError(
          ErrorCode.STORAGE_READ_FAILED,
          getErrorMessage(ErrorCode.STORAGE_READ_FAILED, this.locale, {
            key,
            reason: 'backup not found',
          }),
          { context: { key, reason: 'backup not found' } },
        ),
      )
    }
    return ok(result.value)
  }
}
// ── FIN: AutoBackup ──
