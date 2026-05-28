---
'@yggdrasil-forge/core': patch
---

Sub-phase 2.6.fix2 — pecha o bug latente DT-13 cazado no escenario 8 de 2.6: o effect `modify_resource` mutaba o budget pero **non emitía o evento `budgetChange`**, polo que os suscritores externos non se enteraban dos cambios de budget producidos vía effect. Agora `EffectsRunner.applyModifyResource` emite `budgetChange(resourceId, oldAmount, newAmount)` tras a mutación, **só cando o valor cambia** (`currentAmount !== nextAmount`), replicando o patrón establecido en `TreeEngine`. Mesma familia que o bug de `set_progress` arranxado en 2.6.fix.

**Emisión directa, non delegación** (§5.1): a diferenza de 2.6.fix (que delegaba en `ProgressManager`), aquí `ResourceManager.applyCost` é cálculo puro (devolve `Result<Budget>` sen efectos secundarios); a emisión de `budgetChange` faina sempre o chamante, así que `EffectsRunner` emítea directamente vía `this.context.events`.

**Cero audit** (§5.4): `budgetChange` non leva audit en ningunha vía existente (nin sequera na vía `TreeEngine`); esta sub-fase non engade audit.

**Rollback fóra de alcance** (§5.5): a emisión de `budgetChange` durante effects que posteriormente se revierten é coherente co comportamento actual de `set_progress` (2.6.fix); eventos compensatorios de rollback son decisión futura se procede.

**Actualización do escenario 8 de 2.6** (autorizada por addendum do director): o test `cascade event ordering` en `phase-2-cross-piece.test.ts` fixara empíricamente unha cadea de 5 eventos SEN `budgetChange`, documentando a súa ausencia como bug latente (patrón de contrato intermedio 2.4.d L2). Agora que o bug se arranxa, o test actualízase para reflectir a orde correcta de 6 eventos: `stateChange → unlock → auditEntry(node_unlocked) → budgetChange(xp=15) → progressChange(b=100) → auditEntry(custom)`. Orde verificada empíricamente; `budgetChange` aparece na posición 4, respectando a orde declarativa dos effects (modify_resource é o 1º, set_progress o 2º).

**Tests do paquete `core`**: 891 → 896 (+5 novos en `EffectsRunner.test.ts`: emisión con `+`/`-`/`*`, non-emisión con delta cero, e integración cross-piece vía `engine.unlock`). O escenario 8 mantense (actualizado, non engadido).

**Cobertura**: global 98.18% (= baseline 2.6); `EffectsRunner.ts` 100% statements/lines/funcs.

**Out of scope**: cero modificación de `TreeEngine`, `ResourceManager`, `ProgressManager`, `UnlockResolver`, `types/`, `common/`, `engine/index.ts`. Cero `ErrorCode` novo.

**DT-13 PECHADA.** Coa fix2 a Fase 2 queda sen asimetrías de emisión coñecidas: tanto `set_progress` (2.6.fix) como `modify_resource` (2.6.fix2) propagan os seus eventos cando se invocan desde effects.
