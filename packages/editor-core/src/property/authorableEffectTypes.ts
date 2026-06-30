// ── INICIO: authorableEffectTypes ──
// **★ Gate descriptor↔manifesto** (Briefing 7.5c-ii §4).
//
// O `supportManifest` (de @core, 7.4) é a **fonte única** sobre que
// tipos de effect aplica o runtime. Esta función deriva del a lista
// dispoñible para o **selector de effects do Inspector** — o autor
// nunca verá un tipo non soportado.
//
// **Test do gate**: a unión de `authorableEffectTypes()` con
// `UNSUPPORTED_EFFECT_TYPES` debe ser exactamente `Effect['type']`. Iso
// garante que a **boca** (Inspector) **non diverxe** da **conciencia**
// (motor): se @core engade un Effect kind, o type-test do
// supportManifest atrápao, e este derivado refliccte o cambio
// automaticamente.
//
// **Plano vs aniñado**: `composite` e `conditional` están SUPPORTED
// (o runtime aplícaos), pero requiren sub-editores complexos (effects
// aniñados / Conditions) que aterran en 7.5c-ii fase 2. En 7.5c-ii
// fase 1, o EffectsEditor amósaos como resumo de lectura, e
// `authorablePlainEffectTypes()` filtraos para o selector "Engadir
// effect plano".

import { SUPPORTED_EFFECT_TYPES } from '@yggdrasil-forge/core'

/**
 * Tipos de effect autorables (todos os soportados polo runtime).
 *
 * Coincide co subset SUPPORTED do manifesto; nunca inclúe
 * `modify_stat` nin `plugin` (UNSUPPORTED). **Esta é a única fonte
 * de verdade para o selector do Inspector**.
 */
export function authorableEffectTypes(): readonly string[] {
  return SUPPORTED_EFFECT_TYPES
}

/**
 * Tipos PLANOS (non aniñados). Subset de `authorableEffectTypes()` que
 * exclúe `composite` e `conditional` (precisan sub-editores aniñados,
 * fase 2). Usado polo selector de "Engadir effect" na fase 1.
 */
export function authorablePlainEffectTypes(): readonly string[] {
  return SUPPORTED_EFFECT_TYPES.filter((t) => t !== 'composite' && t !== 'conditional')
}

/**
 * Comproba se un tipo de effect é editable na fase actual (fase 1):
 * só os planos. Os aniñados son lectura.
 */
export function isPlainAuthorableEffectType(type: string): boolean {
  return authorablePlainEffectTypes().includes(type)
}
// ── FIN: authorableEffectTypes ──
