---
'@yggdrasil-forge/core': patch
---

Sub-phase 2.6.fix — pecha un bug latente do `EffectsRunner` descuberto durante a investigación T0 de 2.6: o effect `set_progress` mutaba o `StateStore` directamente saltándose o `ProgressManager`, polo que **non emitía** o evento `progressChange`, **non rexistraba** a entrada `progress_updated` no audit log, e **non invalidaba** a cache do `StatComputer`. Cambio microcirúrxico ao `applySetProgress`: agora delega en `progressManager.setProgress` cando o `EffectContext` o trae (caso normal cando `TreeEngine` constrúe o `EffectsRunner` desde 2.4.e). Mantense un **fallback legacy** silencioso (mutación directa) para tests illados que constrúen `EffectContext` manualmente sen `progressManager`. Cero cambio en `ProgressManager`, `TreeEngine`, `StatComputer`, `TimeManager`, `engine/index.ts`, `common/` nin types.

**Cambio observable**: o effect `set_progress` agora **rexeita** os nodos sen `supportsProgress: true` (devolve `EFFECT_APPLICATION_FAILED` con `context.reason` que cita o nodeId problemático), onde antes silenciaba a condición. Comportamento correcto e aliñado co contrato de `ProgressManager.setProgress`.

**Expansión de `ProgressManagerLike`**: a interface estructural exportada por `UnlockResolver.ts` (introducida en 2.4.d para evitar a dependencia cíclica `UnlockResolver → ProgressManager`) amplíase con `setProgress(nodeId, percent): Result<ProgressUpdateResult>` definido de forma **estructural inline**, sen importar `ProgressUpdateResult` desde `ProgressManager` para non reintroducir o ciclo. `ProgressManager` real cumpre a forma sen modificación gracias ao structural typing.

**Tests novos en `EffectsRunner.test.ts`** (+6, 882 totais):
1. Propagación de `progressChange` cando se aplica `set_progress` con manager.
2. Rexistro de `progress_updated` no audit log.
3. Invalidación de cache do `StatComputer` (verificación cross-piece con `TreeEngine` real: stat condicional dependente de `progress_min` actualízase tras un effect `set_progress`).
4. Fallback legacy: mutación directa sen evento nin audit cando `progressManager` está ausente.
5. Propagación do erro do `ProgressManager` cando o nodo non soporta progress (documentando o dobre envoltorio de `EffectsRunner.run` arredor dos applyXxx que devolven err).
6. `reverse()` segue restaurando `previousValue` correctamente tras o cableado.

Bug **introducido en 2.1** (cando `set_progress` se implementou e `ProgressManager` aínda non existía); a familia 2.4.b/c/d/e arranxou outras asimetrías análogas pero non esta vía. Esta sub-fase pecha o ciclo antes da 2.6 (tests cross-piece da Fase 2), que retomarase tal cal está escrita (escenarios 1-2 do briefing 2.6 pasarán sen adaptación das asercións sobre eventos/audit).
