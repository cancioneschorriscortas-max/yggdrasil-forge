// ── INICIO: createDefaultLayoutRegistry ──
// Helper interno para construír un LayoutEngineRegistry default cos
// 4 layouts dispoñibles en core (Identity, Radial, Tree, ClusteredRadial).
//
// NON exportado publicamente en 7.2. Pode promocionarse a export
// público en sub-fases futuras se require.

import {
  ClusteredRadialLayout,
  IdentityLayout,
  LayoutEngineRegistry,
  RadialLayout,
  TreeLayout,
} from '@yggdrasil-forge/core'

/**
 * Constrúe un LayoutEngineRegistry rexistrando os layouts default
 * disponibles en `@yggdrasil-forge/core`.
 */
export function createDefaultLayoutRegistry(): LayoutEngineRegistry {
  return new LayoutEngineRegistry()
    .register(new IdentityLayout())
    .register(new RadialLayout())
    .register(new TreeLayout())
    .register(new ClusteredRadialLayout())
}
// ── FIN: createDefaultLayoutRegistry ──
