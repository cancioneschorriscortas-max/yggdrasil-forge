// packages/core/src/builds/SnapshotManager.ts
// ── INICIO: SnapshotManager ──
// Maneja snapshots in-memory dun TreeEngine local + opt-in
// persistencia via StorageAdapter.
//
// **Patrón**:
// - In-memory `Map<id, BuildSnapshot>`.
// - Opt-in storage: se se pasa, write-through cache.
// - Lazy init: primeira chamada a list/restore/delete carga desde
//   storage.
// - Storage keys: `snapshots:${id}`.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { StorageAdapter } from '@yggdrasil-forge/storage'
import type { BuildSnapshot, Result, TreeState } from '../types/index.js'
import { err, ok } from '../types/index.js'

const STORAGE_PREFIX = 'snapshots:'

export class SnapshotManager {
  private readonly snapshots = new Map<string, BuildSnapshot>()
  private readonly storage: StorageAdapter | undefined
  private counter = 0
  private loaded = false

  constructor(storage?: StorageAdapter) {
    this.storage = storage
  }

  /**
   * Crea un snapshot do estado actual.
   *
   * @param state Estado a snapshotear (typicamente o do engine).
   * @param buildId Id da build asociada (typicamente do engine).
   * @param label Label opcional (ex. "Antes do experimento").
   */
  async create(state: TreeState, buildId: string, label?: string): Promise<BuildSnapshot> {
    await this.ensureLoaded()
    const id = `snap-${Date.now()}-${this.counter++}`
    const snapshot: BuildSnapshot = {
      id,
      buildId,
      ...(label !== undefined ? { label } : {}),
      createdAt: Date.now(),
      state,
    }
    this.snapshots.set(id, snapshot)
    if (this.storage !== undefined) {
      const result = await this.storage.set(STORAGE_PREFIX + id, snapshot)
      /* v8 ignore start -- storage.set always ok in MemoryStorage; defensive guard */
      if (!result.ok) {
        this.snapshots.delete(id)
        throw result.error
      }
      /* v8 ignore stop */
    }
    return snapshot
  }

  /**
   * Restaura un snapshot por id. Devolve `Result<BuildSnapshot>`
   * (o caller aplica `state` ao engine).
   */
  async restore(id: string): Promise<Result<BuildSnapshot>> {
    await this.ensureLoaded()
    const snapshot = this.snapshots.get(id)
    if (snapshot === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.SNAPSHOT_NOT_FOUND,
          getErrorMessage(ErrorCode.SNAPSHOT_NOT_FOUND, 'gl', { id }),
        ),
      )
    }
    return ok(snapshot)
  }

  /** Lista todos os snapshots (orde de inserción). */
  async list(): Promise<readonly BuildSnapshot[]> {
    await this.ensureLoaded()
    return Array.from(this.snapshots.values())
  }

  /** Borra un snapshot por id. */
  async delete(id: string): Promise<Result<void>> {
    await this.ensureLoaded()
    if (!this.snapshots.has(id)) {
      return err(
        new YggdrasilError(
          ErrorCode.SNAPSHOT_NOT_FOUND,
          getErrorMessage(ErrorCode.SNAPSHOT_NOT_FOUND, 'gl', { id }),
        ),
      )
    }
    this.snapshots.delete(id)
    if (this.storage !== undefined) {
      const result = await this.storage.delete(STORAGE_PREFIX + id)
      /* v8 ignore start -- storage.delete always ok in MemoryStorage; defensive guard */
      if (!result.ok) {
        throw result.error
      }
      /* v8 ignore stop */
    }
    return ok(undefined)
  }

  /**
   * Lazy init: carga snapshots desde storage na primeira chamada.
   * Idempotente (cero re-carga tras a primeira).
   */
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
      const snapshot = valueResult.value as BuildSnapshot
      this.snapshots.set(snapshot.id, snapshot)
    }
    this.loaded = true
  }
}
// ── FIN: SnapshotManager ──
