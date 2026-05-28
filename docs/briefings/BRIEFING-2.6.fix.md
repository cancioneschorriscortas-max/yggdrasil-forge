# BRIEFING — SUB-FASE 2.6.fix de Yggdrasil Forge

> Pega este documento no chat executor que reportou o escalado.
> **Sub-fase microcirúrxica.** Pecha o bug latente descuberto pola
> investigación T0 de 2.6: `EffectsRunner.applySetProgress` muta
> directamente o store sen pasar polo `ProgressManager`, perdendo
> emisión de evento + audit + invalidación de cache de stats.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Esta sub-fase non
debería xerar escalado**: o cambio é pequeno e está pre-decidido.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 2.6.fix — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.6.fix — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.
NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.6.fix** de Yggdrasil Forge. **Microcirúrxica pre-2.6.**
Tipo: **bug-fix funcional** — cablear `EffectsRunner.applySetProgress`
ao `ProgressManager` (Opción 1 do executor).

---

## 2. CONTEXTO MÍNIMO

Durante T0 de 2.6, o executor descubriu empíricamente que o effect
`set_progress` muta directamente o `StateStore` saltándose o
`ProgressManager`. Consecuencias verificadas:
1. Cero emisión de `progressChange` event.
2. Cero rexistro de `progress_updated` no audit.
3. Cero invalidación de `statComputer.cache`.

É **o mesmo patrón** que o bug latente arranxado en 2.4.e
(setProgress non invalidaba cache), pero **noutra vía** (vía effect).

Esta sub-fase pecha o ciclo arranxando vía Opción 1 (delegación
directa). Tras ela, 2.6 retómase tal cal está escrita.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `4856382` (docs MASTER 2.5).
- 876 tests pasan en core (42 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`EffectContext` xa ten `progressManager?: ProgressManagerLike`**
  (engadido en 2.4.e §5.4). **Cero modificación de tipos requirida.**
- **`TreeEngine` xa pasa `this.progressManager` ao construír
  `EffectsRunner`** (decisión 2.4.e §5.6). Verificado co grep.
- **`applySetProgress` actual** (EffectsRunner.ts:796-838): muta
  directamente vía `store.update(draft => { ... existing.progress =
  effect.percent })`. Devolve `previousValue: previousProgress` para
  `reverse()`.
- DT-9, DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Modificar `EffectsRunner.applySetProgress` para que delegue en
`this.context.progressManager?.setProgress(nodeId, percent)` se
está dispoñible (fallback legacy se non, igual ca 2.4.d), capturando
correctamente `previousValue` para `reverse()`.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Opción 1 do executor: delegación pura

Cambia o bloque `store.update(...)` por unha chamada a
`this.context.progressManager.setProgress(nodeId, percent)`. Se
`progressManager` está ausente no context (caso teórico: tests
illados de EffectsRunner sen TreeEngine), **fallback** ao
comportamento legacy (mutación directa). Cero ruptura.

Patrón paralelo ao fallback de `UnlockResolver.getProgress` (2.4.d
§5.3). Coherencia arquitectónica total.

### 5.2 — `previousValue` para `reverse()`

A captura de `previousProgress` segue funcionando tal cal estaba
(ler `store.getState().nodes[effect.nodeId]?.progress` antes da
chamada). Iso garante que `reverse()` segue restaurando ao valor
previo correctamente.

**Importante**: o `EffectResult.previousValue` debe seguir contendo
o `previousProgress` (number | undefined), non o `ProgressUpdateResult`
de `ProgressManager`. Isto preserva o contrato existente de
`reverse()`.

### 5.3 — Manexo de erros do `ProgressManager.setProgress`

`ProgressManager.setProgress` devolve `Result<ProgressUpdateResult>`.
Se devolve `err` (ex: nodo non existe en treeDef, supportsProgress
non é true, INVALID_PROGRESS_OPERATION para computed, etc.), o
`applySetProgress` debe **propagalo como `err` do effect**:

```ts
const pmResult = progressManager.setProgress(effect.nodeId, effect.percent)
if (!pmResult.ok) {
  return err(
    makeError(
      ErrorCode.EFFECT_APPLICATION_FAILED,
      locale,
      {
        effectType: effect.type,
        failedAt: '0',
        reason: pmResult.error.message,
      },
      {
        effectType: effect.type,
        nodeId: effect.nodeId,
        percent: effect.percent,
        originalErrorCode: pmResult.error.code,
      },
    ),
  )
}
```

Iso é importante porque agora o effect rexeitará casos que antes
deixaba pasar (ex: `set_progress` sobre un nodo sen
`supportsProgress`). **Cambio observable**: o effect agora é máis
estrito (correcto semánticamente).

**Tests existentes a verificar**: T0 verifica se algún test de
`set_progress` usa un nodo sen `supportsProgress: true` (escala se
si — sería un test que reflexaba o bug).

### 5.4 — Fallback legacy mantido

Se `this.context.progressManager === undefined`, mantén o
comportamento actual de mutación directa. Permite seguir
construíndo `EffectContext` sen `progressManager` en tests
illados de EffectsRunner. Cero ruptura.

Comentario explícito que documente esta decisión.

### 5.5 — Validación de rango: queda no propio applySetProgress

A validación `effect.percent < 0 || > 100` segue na cabeza do
`applySetProgress` (cero cambio). `ProgressManager.setProgress`
tamén validaria, pero validar nos dous sitios é defense in depth
aceptable: o effect produce o `EFFECT_APPLICATION_FAILED` máis
específico, que é o que esperan os tests existentes.

**Alternativa que NON tomamos**: eliminar a validación local. Por
que non: rompería o contrato observable existente
(`EFFECT_APPLICATION_FAILED` con `reason: "percent fóra de rango"`
substitúeo `EFFECT_APPLICATION_FAILED` con `reason:
"INVALID_PROGRESS_VALUE: ..."` máis verbose). Mantemos
compatibilidade.

### 5.6 — Cero cambios en outras pezas

**Cero modificación** de: `ProgressManager.ts`, `TreeEngine.ts`,
`types/`, `common/`, `engine/index.ts`. **Só** `EffectsRunner.ts` +
tests.

### 5.7 — Aclaración da inconsistencia B do reporte do executor

O executor reportou que `effects_applied` non é un `AuditAction`
válido. **Correcto parcialmente**: non é `AuditAction.type =
'effects_applied'`, pero **SI existe** como entrada `{ type:
'custom', name: 'effects_applied', data: {...} }` (decisión 2.1.b
§5.4, verificable en `TreeEngine.ts:848`). É **terminoloxía mixta**:
o `type` é `'custom'`, e o `name` (campo do custom) é
`'effects_applied'`.

**Implicación para 2.6**: no escenario 1 da 2.6, **a aserción do
audit debe verificar `entries.some(e => e.action.type === 'custom'
&& e.action.name === 'effects_applied')`**, non `e.action.type ===
'effects_applied'`. Esta é unha aclaración para o briefing 2.6
cando se retome, **non parte desta 2.6.fix**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións SÓ en:
- `packages/core/src/engine/EffectsRunner.ts` — método
  `applySetProgress` (liñas ~796-838).

Tests:
- Estender `packages/core/__tests__/engine/EffectsRunner.test.ts`
  cos novos casos (5.2 + 5.3 + 5.4).

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións previas
1. `pnpm install`. Confirma 876 tests `--force`.
2. **Verifica** que `EffectContext.progressManager` xa existe:
   `grep -A8 "interface EffectContext" packages/core/src/engine/EffectsRunner.ts`.
   Reporta os campos. Debe incluír `progressManager?:
   ProgressManagerLike`.
3. **Verifica** que `TreeEngine` xa pasa o progressManager:
   `grep -A5 "new EffectsRunner" packages/core/src/engine/TreeEngine.ts`.
4. **Busca tests existentes** que usen `set_progress` effect sobre
   nodos sen `supportsProgress: true`:
   `grep -B5 -A5 "set_progress" packages/core/__tests__/engine/EffectsRunner.test.ts | head -60`.
   Se hai algún que asume que pasa sen erro → **escala (0.6)**. Eses
   tests cambian de comportamento esperado en 2.6.fix.

### T1 — Modificar applySetProgress (5.1, 5.2, 5.3, 5.4)
Modifica o método segundo:

```ts
private async applySetProgress(
  effect: Extract<Effect, { type: 'set_progress' }>,
): Promise<Result<EffectResult>> {
  const { store, locale, progressManager } = this.context

  // Validación local (5.5): mantén compatibilidade con tests existentes.
  if (effect.percent < 0 || effect.percent > 100) {
    return err(makeError(ErrorCode.EFFECT_APPLICATION_FAILED, locale, {
      effectType: effect.type,
      failedAt: '0',
      reason: `percent fóra de rango: ${effect.percent}`,
    }, { effectType: effect.type, percent: effect.percent }))
  }

  // ── INICIO: 2.6.fix — capturar previousValue antes da mutación ──
  const instance = store.getState().nodes[effect.nodeId]
  const previousProgress = instance?.progress
  // ── FIN: 2.6.fix ──

  // ── INICIO: 2.6.fix — cablear via ProgressManager se está dispoñible ──
  // Patrón paralelo ao fallback de UnlockResolver.getProgress (2.4.d):
  // se progressManager está inxectado no context (caso normal cando
  // TreeEngine constrúe o EffectsRunner), delégase nel para que se
  // emita progressChange, se rexistre audit progress_updated e se
  // invalide statComputer.cache. Fallback a mutación directa cando
  // o context se constrúe manualmente sen progressManager (tests
  // illados).
  if (progressManager !== undefined) {
    const pmResult = progressManager.setProgress(effect.nodeId, effect.percent)
    if (!pmResult.ok) {
      return err(makeError(ErrorCode.EFFECT_APPLICATION_FAILED, locale, {
        effectType: effect.type,
        failedAt: '0',
        reason: pmResult.error.message,
      }, {
        effectType: effect.type,
        nodeId: effect.nodeId,
        percent: effect.percent,
        originalErrorCode: pmResult.error.code,
      }))
    }
    return ok({
      effect,
      applied: true,
      previousValue: previousProgress,
    })
  }
  // ── FIN: 2.6.fix ──

  // Fallback legacy: mutación directa cando non hai progressManager.
  // Mantense para compatibilidade con tests illados que construyen
  // EffectContext manualmente sen TreeEngine.
  store.update((draft) => {
    const existing = draft.nodes[effect.nodeId]
    if (existing === undefined) {
      draft.nodes[effect.nodeId] = {
        id: effect.nodeId,
        state: 'locked',
        currentTier: 0,
        progress: effect.percent,
      }
    } else {
      existing.progress = effect.percent
    }
  })

  return ok({
    effect,
    applied: true,
    previousValue: previousProgress,
  })
}
```

**Importante**: a interface `ProgressManagerLike` exportada por
`UnlockResolver.ts` tras 2.4.d **só define `getProgress`**. Verifica
en T0 se é necesario expandir esa interface para incluír `setProgress`
(probablemente si). Se procede expandila:
- **Opción A**: amplía `ProgressManagerLike` en `UnlockResolver.ts`
  con `setProgress(nodeId: string, percent: number):
  Result<ProgressUpdateResult>`. Cero ruptura porque é só engadir.
- **Opción B**: usa o tipo `ProgressManager` concreto importado.
  Acopla; non recomendable.

**Director escolle Opción A**: amplía `ProgressManagerLike`. Cero
modificación de `ProgressManager.ts` (structural typing segue
funcionando). Documenta a expansión cun JSDoc.

Typecheck 20/20.

### T2 — Tests novos en EffectsRunner.test.ts
Engade tests específicos:

1. **Effect set_progress propaga via ProgressManager (event)**: con
   `progressManager` inxectado, executar `set_progress` → verifica
   que `progressChange` evento emítese (subscribete antes).
2. **Effect set_progress propaga via ProgressManager (audit)**: idem
   → verifica entry `progress_updated` no audit.
3. **Effect set_progress propaga via ProgressManager (cache)**:
   nodo computed C depende de A. setProgress(A) via effect → stat
   que usa C como contribución conditional reflicte o cambio. (Test
   indirecto da invalidación de cache.)
4. **Fallback legacy**: EffectContext sen `progressManager` →
   `applySetProgress` segue funcionando (mutación directa). Verifica
   que `store.getState().nodes[X].progress` ten o valor pero **NON**
   emite event nin audit.
5. **Propagación de erro do ProgressManager**: con `progressManager`
   inxectado, set_progress sobre nodo sen `supportsProgress: true`
   → effect devolve err `EFFECT_APPLICATION_FAILED` con
   `originalErrorCode: 'YGG_E019'` (PROGRESS_NOT_SUPPORTED).
6. **reverse() segue funcionando**: tras `run([{type:'set_progress',
   nodeId:'A', percent:80}])` con valor previo 30 → `reverse(results)`
   restaura A a 30.

### T3 — Verificación post-T2
- Typecheck 20/20.
- Tests todos pasando.
- **Especial atención** aos tests existentes de `set_progress` en
  EffectsRunner.test.ts: se algún rompe pola asimetría nova
  (rexeito a nodo sen supportsProgress), **escala** antes de
  modificalo. Pode ser un test que asume o bug.

### T4 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. EffectsRunner
mantén ≥99%. Global non baixa de 98.13% (baseline 2.5).

### T5 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```

- Changeset **patch** — só `@yggdrasil-forge/core` (common NON se
  toca; confírmao). Sección `Fixed` específica.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio**.
  Contido:
  ```
  ### Fixed
  - Bug latente: o effect `set_progress` mutaba directamente o
    `StateStore` saltándose o `ProgressManager`, perdendo emisión
    de `progressChange`, rexistro `progress_updated` no audit, e
    invalidación da cache de stats. Agora `EffectsRunner.applySetProgress`
    delega en `progressManager.setProgress` cando está dispoñible
    no `EffectContext` (mantén fallback legacy para tests illados).
    Bug introducido en 2.1 (cando set_progress se implementou e
    ProgressManager non existía); revelado e arranxado durante
    investigación T0 de 2.6.

  ### Changed
  - `ProgressManagerLike` (exportada por `UnlockResolver`) amplíase
    para incluír `setProgress` ademais de `getProgress`. Cero
    ruptura: `ProgressManager` concreto xa o cumpre.
  ```

### T6 — Commit + push
Commit Conventional: `fix(core): wire EffectsRunner.applySetProgress
through ProgressManager (sub-phase 2.6.fix)`. Push directo a
`origin/main` (base `4856382`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/EffectsRunner.ts` (modificado:
  applySetProgress)
- `packages/core/src/engine/UnlockResolver.ts` (modificado:
  expandir ProgressManagerLike)
- `packages/core/__tests__/engine/EffectsRunner.test.ts`
  (modificado: +6 tests)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/src/types/`, `packages/core/src/engine/ProgressManager.ts`,
`packages/core/src/engine/TreeEngine.ts`,
`packages/core/src/engine/StatComputer.ts`,
`packages/core/src/engine/TimeManager.ts`, `engine/index.ts`,
`pnpm-lock.yaml`, `core/package.json`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

---

## 9. QUE NON FACER

- ❌ Tocar `ProgressManager.ts` (structural typing).
- ❌ Tocar `TreeEngine.ts` (cableado xa correcto desde 2.4.e).
- ❌ Eliminar a validación local de rango percent (5.5).
- ❌ Cambiar a estrutura de `EffectResult.previousValue` (5.2).
- ❌ Engadir ErrorCodes ou tocar common.
- ❌ Modificar tests existentes para que pasen (escala se algún rompe).
- ❌ Engadir á aclaración B do executor unha modificación do briefing
  2.6 (esa aclaración é para min, non parte desta 2.6.fix).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente.
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.6.fix — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 4856382)
✅ applySetProgress delega en progressManager.setProgress se presente
✅ Fallback legacy mantido (tests illados sen TreeEngine)
✅ ProgressManagerLike ampliada con setProgress
✅ Bug latente 2.1 corrixido: progressChange + audit + stat cache
   agora cableados desde effect set_progress
✅ T0 EffectContext.progressManager: <confirmado | engadir>
✅ T0 tests set_progress sen supportsProgress: <ningún | escalado>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / EffectsRunner <Y%>
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Cambio observable: set_progress effect agora rexeita nodos sen
   supportsProgress (era silencioso antes). Comportamento correcto.
✅ Changeset patch (core; common NON tocado) + nova [Unreleased]
   con Fixed + Changed
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA RETOMAR SUB-FASE 2.6 (escenarios 1 e 2 pasan tal cal).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 2.6.fix. Cirúrxico, ~30 liñas + 6 tests + 1
expansión de interface. Calquera caso non cuberto → ESCALAR.*
