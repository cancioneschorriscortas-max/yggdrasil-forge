// ── INICIO: @yggdrasil-forge/storage ──
// Storage backends for Yggdrasil Forge.
// 3.1 — interface StorageAdapter. Implementacións concretas en 3.2-3.4.

export type { StorageAdapter } from './StorageAdapter.js'
export { MemoryStorage } from './MemoryStorage.js'
export { LocalStorageAdapter } from './LocalStorageAdapter.js'
export type { LocalStorageAdapterOptions } from './LocalStorageAdapter.js'
export { IndexedDBAdapter } from './IndexedDBAdapter.js'
export type { IndexedDBAdapterOptions } from './IndexedDBAdapter.js'
export { SessionStorageAdapter } from './SessionStorageAdapter.js'
export type { SessionStorageAdapterOptions } from './SessionStorageAdapter.js'
export { FileSystemAdapter } from './FileSystemAdapter.js'
export type { FileSystemAdapterOptions } from './FileSystemAdapter.js'

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'
// ── FIN: @yggdrasil-forge/storage ──
