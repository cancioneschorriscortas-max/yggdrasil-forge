import {
  ErrorCode,
  type Result,
  YggdrasilError,
  err,
  isErr,
  isOk,
  ok,
} from '@yggdrasil-forge/common'
// ── INICIO: tests de AutoBackup ──
import { describe, expect, it, vi } from 'vitest'
import { AutoBackup, type BackupStorage } from '../../../src/engine/migrations/AutoBackup.js'

class MockBackupStorage implements BackupStorage {
  private data = new Map<string, unknown>()
  async set(key: string, value: unknown): Promise<Result<void>> {
    this.data.set(key, value)
    return ok(undefined)
  }
  async get(key: string): Promise<Result<unknown | null>> {
    const value = this.data.get(key)
    return ok(value === undefined ? null : value)
  }
}

class FailingSetStorage implements BackupStorage {
  async set(): Promise<Result<void>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_WRITE_FAILED, 'write failed'))
  }
  async get(): Promise<Result<unknown | null>> {
    return ok(null)
  }
}

class FailingGetStorage implements BackupStorage {
  async set(_k: string, _v: unknown): Promise<Result<void>> {
    return ok(undefined)
  }
  async get(): Promise<Result<unknown | null>> {
    return err(new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'read failed'))
  }
}

describe('AutoBackup — backup', () => {
  it('backup con storage OK devolve clave e timestamp', async () => {
    const ab = new AutoBackup(new MockBackupStorage())
    const result = await ab.backup('tree-1', { data: 42 })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.key).toMatch(/^backup:tree-1:\d+$/)
      expect(typeof result.value.timestamp).toBe('number')
    }
  })

  it('backup con storage que falla → err(STORAGE_WRITE_FAILED)', async () => {
    const ab = new AutoBackup(new FailingSetStorage())
    const result = await ab.backup('tree-1', { data: 42 })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED)
    }
  })

  it('clave ten formato backup:{treeId}:{timestamp}', async () => {
    const ab = new AutoBackup(new MockBackupStorage())
    const result = await ab.backup('myTree', { v: 1 })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      const parts = result.value.key.split(':')
      expect(parts[0]).toBe('backup')
      expect(parts[1]).toBe('myTree')
      expect(Number.isFinite(Number(parts[2]))).toBe(true)
    }
  })

  it('dous backups consecutivos teñen claves distintas', async () => {
    const ab = new AutoBackup(new MockBackupStorage())
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000)
    const r1 = await ab.backup('tree-1', { v: 1 })
    const r2 = await ab.backup('tree-1', { v: 2 })
    expect(isOk(r1) && isOk(r2)).toBe(true)
    if (isOk(r1) && isOk(r2)) {
      expect(r1.value.key).not.toBe(r2.value.key)
    }
    vi.restoreAllMocks()
  })

  it('múltiples treeIds son independentes', async () => {
    const storage = new MockBackupStorage()
    const ab = new AutoBackup(storage)
    const r1 = await ab.backup('tree-A', { a: 1 })
    const r2 = await ab.backup('tree-B', { b: 2 })
    expect(isOk(r1) && isOk(r2)).toBe(true)
    if (isOk(r1) && isOk(r2)) {
      expect(r1.value.key).toContain('tree-A')
      expect(r2.value.key).toContain('tree-B')
    }
  })
})

describe('AutoBackup — restore', () => {
  it('restore cunha clave existente devolve o valor gardado', async () => {
    const storage = new MockBackupStorage()
    const ab = new AutoBackup(storage)
    const bkResult = await ab.backup('tree-1', { original: true })
    expect(isOk(bkResult)).toBe(true)
    if (isOk(bkResult)) {
      const result = await ab.restore(bkResult.value.key)
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual({ original: true })
      }
    }
  })

  it('restore con clave inexistente → err(STORAGE_READ_FAILED)', async () => {
    const ab = new AutoBackup(new MockBackupStorage())
    const result = await ab.restore('backup:tree-1:9999999')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
      expect(result.error.context?.reason).toBe('backup not found')
    }
  })

  it('restore con storage que falla → propaga err', async () => {
    const ab = new AutoBackup(new FailingGetStorage())
    const result = await ab.restore('backup:tree-1:1000')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe(ErrorCode.STORAGE_READ_FAILED)
    }
  })
})

describe('AutoBackup — round-trip', () => {
  it('backup + restore preserva o dato', async () => {
    const storage = new MockBackupStorage()
    const ab = new AutoBackup(storage)
    const data = { nodes: [1, 2, 3], schemaVersion: '1.0.0' }
    const bk = await ab.backup('tree-rt', data)
    expect(isOk(bk)).toBe(true)
    if (isOk(bk)) {
      const restored = await ab.restore(bk.value.key)
      expect(isOk(restored)).toBe(true)
      if (isOk(restored)) {
        expect(restored.value).toEqual(data)
      }
    }
  })
})

describe('AutoBackup — locale', () => {
  it('locale propaga a mensaxes de erro', async () => {
    const ab = new AutoBackup(new MockBackupStorage(), { locale: 'en' })
    const result = await ab.restore('non-existent')
    expect(isErr(result)).toBe(true)
  })
})
// ── FIN: tests de AutoBackup ──
