// packages/core/src/builds/LoadoutManager.ts
// ── INICIO: LoadoutManager ──
// Maneja loadouts named in-memory + opt-in persistencia.
//
// **Patrón**: análogo a SnapshotManager pero con `name` como key
// en lugar de id auto-xerado, e Loadout interface en lugar de
// BuildSnapshot.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/storage'
import type { Build, Loadout, Result } from '../types/index.js'
import { err, ok } from '../types/index.js'

const STORAGE_PREFIX = 'loadouts:'

export class LoadoutManager {
  private readonly loadouts = new Map<string, Loadout>()
  private readonly storage: StorageAdapter | undefined
  private loaded = false

  constructor(storage?: StorageAdapter) {
    this.storage = storage
  }

  /**
   * Garda un loadout co nome especificado. Sobreescribe se xa
   * existe (actualizando `updatedAt`).
   */
  async save(name: string, build: Build): Promise<Result<Loadout>> {
    const trimmed = name.trim()
    if (trimmed === '') {
      return err(
        new YggdrasilError(
          ErrorCode.LOADOUT_NAME_INVALID,
          getErrorMessage(ErrorCode.LOADOUT_NAME_INVALID, 'gl', { name }),
        ),
      )
    }
    await this.ensureLoaded()
    const loadout: Loadout = {
      name,
      build,
      updatedAt: Date.now(),
    }
    this.loadouts.set(name, loadout)
    if (this.storage !== undefined) {
      const result = await this.storage.set(STORAGE_PREFIX + name, loadout)
      /* v8 ignore start -- storage.set always ok in MemoryStorage; defensive guard */
      if (!result.ok) {
        this.loadouts.delete(name)
        throw result.error
      }
      /* v8 ignore stop */
    }
    return ok(loadout)
  }

  /** Carga un loadout polo nome. */
  async load(name: string): Promise<Result<Loadout>> {
    await this.ensureLoaded()
    const loadout = this.loadouts.get(name)
    if (loadout === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.LOADOUT_NOT_FOUND,
          getErrorMessage(ErrorCode.LOADOUT_NOT_FOUND, 'gl', { name }),
        ),
      )
    }
    return ok(loadout)
  }

  /** Lista todos os loadouts (orde de inserción). */
  async list(): Promise<readonly Loadout[]> {
    await this.ensureLoaded()
    return Array.from(this.loadouts.values())
  }

  /** Borra un loadout polo nome. */
  async delete(name: string): Promise<Result<void>> {
    await this.ensureLoaded()
    if (!this.loadouts.has(name)) {
      return err(
        new YggdrasilError(
          ErrorCode.LOADOUT_NOT_FOUND,
          getErrorMessage(ErrorCode.LOADOUT_NOT_FOUND, 'gl', { name }),
        ),
      )
    }
    this.loadouts.delete(name)
    if (this.storage !== undefined) {
      const result = await this.storage.delete(STORAGE_PREFIX + name)
      /* v8 ignore start -- storage.delete always ok in MemoryStorage */
      if (!result.ok) {
        throw result.error
      }
      /* v8 ignore stop */
    }
    return ok(undefined)
  }

  /** Lazy init: carga loadouts desde storage na primeira chamada. */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.storage === undefined) {
      this.loaded = true
      return
    }
    const keysResult = await this.storage.list(STORAGE_PREFIX)
    /* v8 ignore start -- storage.list always ok in MemoryStorage */
    if (!keysResult.ok) {
      throw keysResult.error
    }
    /* v8 ignore stop */
    for (const key of keysResult.value) {
      const valueResult = await this.storage.get(key)
      /* v8 ignore start -- storage.get always ok in MemoryStorage */
      if (!valueResult.ok) {
        throw valueResult.error
      }
      /* v8 ignore stop */
      const loadout = valueResult.value as Loadout
      this.loadouts.set(loadout.name, loadout)
    }
    this.loaded = true
  }
}
// ── FIN: LoadoutManager ──
