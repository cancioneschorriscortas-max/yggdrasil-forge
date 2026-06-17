// ── INICIO: @yggdrasil-forge/importers ──
// Importadores de formatos externos a TreeDef.

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'

// ── F9.3.a: importador GAIA ──
export { importGaiaProfession, toI18n } from './gaia.js'
export type {
  GaiaCanonicalWeight,
  GaiaGroup,
  GaiaImportOptions,
  GaiaMicroskill,
  GaiaProfession,
} from './gaia.js'
// ── FIN: @yggdrasil-forge/importers ──
