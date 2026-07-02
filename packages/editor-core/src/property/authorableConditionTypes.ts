// ── INICIO: authorableConditionTypes ──
// **★ Gate descriptor�база manifesto de UnlockCondition** (Briefing 7.5c-ii §1
// fase 2). Espello exacto do gate `authorableEffectTypes` pero para
// condicións do sistema de prerequisites.
//
// O `supportManifest` (de @core, 7.4) é a **fonte única** sobre que
// tipos de condición aplica o runtime. Esta función deriva del a lista
// dispoñible para o **selector do PrerequisitesEditor**.
//
// **Estado a 7.5c-ii fase 2**: as 14 condicións de
// `SUPPORTED_CONDITION_TYPES` están soportadas polo runtime. Non hai
// `UNSUPPORTED_CONDITION_TYPES` (as 14 son autorables). Aínda así, o
// gate existe para protexer de drift futuro:
//   - Se @core engade unha condición nova → o type-test do manifesto
//     obriga a clasificala e este derivado reflíctea automaticamente
//     no selector.
//   - Se @core retira unha condición → desaparece do selector.
//
// **Non recursivo**: `UnlockRule` é `UnlockCondition` bare ou grupo
// (all/any/none) cunha lista **plana** de UnlockCondition. Non hai
// grupos aniñados. Iso simplifica o editor a "combinador + lista".

import { SUPPORTED_CONDITION_TYPES } from '@yggdrasil-forge/core'

/**
 * Tipos de UnlockCondition autorables (todos os soportados polo
 * runtime). Coincide con SUPPORTED_CONDITION_TYPES; ningunha condición
 * é UNSUPPORTED de momento. **Esta é a única fonte de verdade para o
 * selector do PrerequisitesEditor**.
 */
export function authorableConditionTypes(): readonly string[] {
  return SUPPORTED_CONDITION_TYPES
}

/**
 * Comproba se un tipo de condición é editable na fase actual.
 */
export function isAuthorableConditionType(type: string): boolean {
  return authorableConditionTypes().includes(type)
}
// ── FIN: authorableConditionTypes ──
