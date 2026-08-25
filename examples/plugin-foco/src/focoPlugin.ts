// ── O plugin do tutorial: «remata o que empezaches» ──
//
// Regra pedagóxica: mentres teñas un nodo a medias (`in_progress`),
// non podes empezar outro. Unha soa regra, tres hooks — os tres
// patróns que un plugin do motor pode usar:
//
//   - `computeUnlockability` (síncrono): EXPLICA. Modifica o resultado
//     de `canUnlock` para que a UI poida dicir POR QUE non se pode.
//   - `beforeUnlock` (pode ser async): VETA. Devolver `false` cancela
//     o unlock (o motor devolve OPERATION_CANCELLED_BY_HOOK).
//   - `afterUnlock`: REACCIONA. Notificación post-facto (log,
//     analítica, achievements…) — xa non pode cancelar nada.
//
// A lección importante: canUnlock e unlock son dous camiños distintos.
// Se só vetas en `beforeUnlock`, a UI di "podes" e o clic falla; se só
// tocas `computeUnlockability`, a UI di "non podes" pero un unlock()
// directo pasa. Unha regra de verdade implementa OS DOUS lados.

import type { Plugin, PluginEngineHandle, UnlockCheck } from '@yggdrasil-forge/core'

/**
 * Id do nodo en curso, ou null se non hai ningún.
 *
 * "En curso" = progreso parcial (0 < progress < 100). OLLO: o dato de
 * verdade é `progress`, non `state` — o motor NON transita o estado
 * gardado a 'in_progress' cando moves progreso (decisión 2.4.b: o
 * estado só o mutan unlock/lock/respec/tick/applyChanges). Ver a
 * páxina "O ciclo de vida dun nodo" da documentación.
 */
function nodoEnCurso(engine: PluginEngineHandle): string | null {
  for (const node of engine.getTreeDef().nodes) {
    const progress = engine.getProgress(node.id)
    if (progress > 0 && progress < 100) return node.id
  }
  return null
}

export function createFocoPlugin(): Plugin {
  return {
    id: 'exemplo-foco',
    name: 'Foco pedagóxico',
    version: '1.0.0',
    // Versión da Plugin API que require (compatibilidade).
    apiVersion: '1.0.0',
    // Declarativos en 1.x (audit); enforce estrito virá nunha major.
    permissions: ['read_state', 'register_hooks'],

    install(engine, api) {
      // O `engine` é un PluginEngineHandle: 10 getters READONLY.
      // Os handlers son closures sobre el — así len o estado vivo.

      api.registerHook('computeUnlockability', (nodeId, defaultResult): UnlockCheck => {
        const enCurso = nodoEnCurso(engine)
        if (enCurso === null || enCurso === nodeId) return defaultResult
        if (!defaultResult.allowed) return defaultResult // xa hai outra razón
        return {
          allowed: false,
          reason: {
            gl: `Remata o que empezaches: "${enCurso}" está a medias`,
            en: `Finish what you started: "${enCurso}" is in progress`,
          },
        }
      })

      api.registerHook('beforeUnlock', (nodeId) => {
        const enCurso = nodoEnCurso(engine)
        // true = adiante; false = veto (o motor cancela o unlock).
        return enCurso === null || enCurso === nodeId
      })

      api.registerHook('afterUnlock', (nodeId) => {
        api.log('info', `foco: "${nodeId}" desbloqueado — foco libre`)
      })
    },
  }
}
