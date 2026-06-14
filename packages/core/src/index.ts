// ── INICIO: @yggdrasil-forge/core public API ──
// Motor principal de Yggdrasil Forge.

/**
 * Versión actual de @yggdrasil-forge/core.
 */
export const VERSION = '0.0.0'

// Tipos públicos
export * from './types/index.js'

// Pezas do motor (1.5+)
export * from './engine/index.js'

// Builds: serialization e share links (sub-fase 8.1)
export {
  serialize as serializeBuild,
  deserialize as deserializeBuild,
} from './builds/BuildSerializer.js'
export { encodeForUrl, decodeFromUrl } from './builds/UrlSerializer.js'
// ── FIN: @yggdrasil-forge/core public API ──
