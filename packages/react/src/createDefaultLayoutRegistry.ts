// ── INICIO: createDefaultLayoutRegistry ──
// Helper interno para construír un LayoutEngineRegistry default cos
// 3 layouts dispoñibles en core (Identity, Radial, Tree).
//
// NON exportado publicamente en 7.2. Pode promocionarse a export
// público en sub-fases futuras se require.

import {
  IdentityLayout,
  LayoutEngineRegistry,
  RadialLayout,
  TreeLayout,
} from '@yggdrasil-forge/core'

/**
 * Constrúe un LayoutEngineRegistry rexistrando os 3 layouts default
 * disponibles en `@yggdrasil-forge/core`.
 */
export function createDefaultLayoutRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry()
    .register(new IdentityLayout())
    .register(new RadialLayout())
    .register(new TreeLayout())
}
// ── FIN: createDefaultLayoutRegistry ──
