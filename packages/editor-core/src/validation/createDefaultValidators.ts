// ── INICIO: createDefaultValidators ──
// Set por defecto = os 3 duros (error, bloquean) + os 5 soft
// (warning/info, non bloquean). O EditorEngine pode arrancar con:
//
//   new EditorEngine(doc, { validators: createDefaultValidators() })
//
// Os duros xa van automaticamente cando se construe o EditorEngine
// (engine instancia eles internamente); polo tanto, **pasar tamén os
// duros como `validators` faríaos correr dúas veces**. Para evitar
// duplicación, este helper devolve **só os soft**.
//
// Nome `Default` porque é o set "completo recomendado" que o
// consumidor engade ademáis dos duros automáticos.

import type { Validator } from './Validator.js'
import { asymmetricExclusionValidator } from './soft/asymmetricExclusionValidator.js'
import { danglingResourceRefsValidator } from './soft/danglingResourceRefsValidator.js'
import { layoutOverflowValidator } from './soft/layoutOverflowValidator.js'
import { prerequisiteCycleValidator } from './soft/prerequisiteCycleValidator.js'
import { unsupportedFeatureValidator } from './soft/unsupportedFeatureValidator.js'

/**
 * Devolve os 5 validadores soft por defecto. **Os 3 duros engádeos
 * o EditorEngine automaticamente** — non os incluas tamén aquí ou
 * correrían dúas veces.
 */
export function createDefaultValidators(): readonly Validator[] {
  return [
    asymmetricExclusionValidator,
    prerequisiteCycleValidator,
    layoutOverflowValidator,
    unsupportedFeatureValidator,
    danglingResourceRefsValidator,
  ]
}
// ── FIN: createDefaultValidators ──
