// ── INICIO: @yggdrasil-forge/storage ──
// Storage backends for Yggdrasil Forge.
// 3.1 — interface StorageAdapter. Implementacións concretas en 3.2-3.4.

export type { StorageAdapter } from './StorageAdapter.js'
export { MemoryStorage } from './MemoryStorage.js'
export { LocalStorageAdapter } from './LocalStorageAdapter.js'
export type { LocalStorageAdapterOptions } from './LocalStorageAdapter.js'

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'
// ── FIN: @yggdrasil-forge/storage ──
