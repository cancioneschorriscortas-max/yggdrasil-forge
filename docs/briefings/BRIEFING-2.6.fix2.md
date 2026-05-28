# BRIEFING — SUB-FASE 2.6.fix2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase microcirúrxica.** Pecha o bug latente cazado no escenario
> 8 de 2.6: `EffectsRunner.applyModifyResource` muta o budget pero
> NON emite o evento `budgetChange`, polo que os suscritores externos
> non se enteran dos cambios de budget que veñen dun effect.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Esta sub-fase non
debería xerar escalado** (cambio pequeno, pre-decidido).

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 2.6.fix2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.6.fix2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.6.fix2** de Yggdrasil Forge. **Microcirúrxica post-2.6.**
Tipo: **bug-fix funcional** — emitir `budgetChange` desde
`EffectsRunner.applyModifyResource`.

---

## 2. CONTEXTO MÍNIMO

Durante o escenario 8 de 2.6 (cascade event ordering), o executor
descubriu empíricamente que `modify_resource` invocado desde un
effect **non emite `budgetChange`**. Mesma familia de bug que
`set_progress` (arranxado en 2.6.fix): a vía `EffectsRunner →
ResourceManager` muta o estado pero salta a emisión de evento que
si fai a vía `TreeEngine`.

Rexistrado como **DT-13** polo director. Esta sub-fase péchao.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `c8bed7e` (tests 2.6).
- 891 tests pasan en core (43 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`EffectContext` xa ten `events: EventEmitter`** (usado por
  `trigger_event`). **Cero cableado novo necesario.**
- **`applyModifyResource`** (EffectsRunner.ts:495-577) calcula
  `currentAmount` (old) e `nextAmount` (new), muta o budget vía
  `store.update`, pero **non emite `budgetChange`**.
- **Patrón de emisión establecido** en TreeEngine.ts:788-792:
  ```ts
  for (const cost of costs) {
    const oldAmount = oldBudget.resources[cost.resourceId] ?? 0
    const newAmount = newBudget.resources[cost.resourceId] ?? 0
    if (oldAmount !== newAmount) {
      this.events.emit('budgetChange', cost.resourceId, oldAmount, newAmount)
    }
  }
  ```
- **`budgetChange` NON ten audit asociado** (verificado: nin sequera
  TreeEngine emite audit ao cambiar budget; o audit é do `unlock`, non
  do budget). **Polo tanto esta sub-fase NON engade audit, só o
  evento.**
- **`EffectsRunner` xa emite `customEvent`** (liñas 581, 1045), polo
  que o patrón `this.context.events.emit(...)` xa está en uso na peza.
- **Ningún test existente verifica `budgetChange` desde effect**
  (cero risco de romper).
- DT-9, DT-11, DT-12, DT-13 abertas. Esta sub-fase pecha DT-13.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir a emisión de `budgetChange(resourceId, oldAmount, newAmount)`
ao final de `EffectsRunner.applyModifyResource` (só cando
`oldAmount !== newAmount`), replicando o patrón establecido en
`TreeEngine`, sen tocar ningunha outra peza.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Emisión directa, NON delegación

A diferenza de 2.6.fix (que delegaba en `ProgressManager`), aquí
**non hai peza con efectos secundarios** que delegue:
`ResourceManager.applyCost` é cálculo puro (devolve `Result<Budget>`
sen emitir nada). A emisión de `budgetChange` faina **sempre o
chamante** (TreeEngine en 4 sitios; agora tamén EffectsRunner).

Polo tanto: **emitir directamente** `this.context.events.emit(
'budgetChange', effect.resourceId, currentAmount, nextAmount)` ao
final de `applyModifyResource`, tras a mutación exitosa.

### 5.2 — Só emitir se houbo cambio real

Replicar a guarda do patrón TreeEngine: emitir **só se
`currentAmount !== nextAmount`**. O caso `delta === 0` (no-op,
`applied: true`) **non emite** evento. Coherente.

### 5.3 — Posición da emisión: tras a mutación, antes do return

A emisión vai **despois** dos dous `store.update` (rama `delta < 0`
e rama `delta > 0`) e **antes** do `return ok(...)`. Como ambas ramas
rematan no mesmo punto, colócase unha única emisión tras o bloque
if/else if, gardada por `currentAmount !== nextAmount`:

```ts
// ── INICIO: 2.6.fix2 — emitir budgetChange tras mutación ──
// Bug latente (DT-13): applyModifyResource mutaba o budget pero non
// emitía budgetChange, polo que os suscritores externos non se
// enteraban dos cambios vía effect. Replicamos o patrón de TreeEngine
// (só emitir se houbo cambio real). budgetChange non ten audit
// asociado (nin sequera na vía TreeEngine), polo que só se emite o
// evento.
if (currentAmount !== nextAmount) {
  this.context.events.emit(
    'budgetChange',
    effect.resourceId,
    currentAmount,
    nextAmount,
  )
}
// ── FIN: 2.6.fix2 ──

return ok({
  effect,
  applied: true,
  previousValue: currentAmount,
})
```

### 5.4 — Cero audit (5.6 contexto)

`budgetChange` **non leva audit** en ningunha vía existente. Esta
sub-fase **non engade audit**. Se no futuro se quere audit de budget,
é decisión nova (afectaría tamén a TreeEngine para consistencia).

### 5.5 — Rollback: fóra de alcance (igual ca 2.6.fix)

Se os effects fallan e TreeEngine reverte o budget (helper de
rollback de 2.1.b), o `budgetChange` xa emitido **non se "des-emite"**.
Esta é a **mesma característica** que xa ten `set_progress` (2.6.fix)
e que tería calquera evento emitido durante effects que logo se
revierten. **Non amplíamos o alcance** para tratar isto: sería unha
decisión arquitectónica máis ampla (emisión de eventos compensatorios
no rollback) que afecta a TODAS as vías, non só esta.

Documenta como nota: "a emisión de `budgetChange` durante effects que
posteriormente se revierten é coherente co comportamento actual de
`set_progress`; eventos compensatorios de rollback son decisión futura
se procede".

### 5.6 — Cero cambios noutras pezas

**Só** `EffectsRunner.ts` + tests. Cero `TreeEngine.ts`, cero
`ResourceManager`, cero `types/`, cero `common/`, cero
`engine/index.ts`.

### 5.7 — `EffectContext.events` xa dispoñible

Verifica en T0 que `this.context.events` está accesible en
`applyModifyResource` (debería; xa se desestrutura `const { store,
resources, locale } = this.context` — engadir `events` aí).

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións SÓ en:
- `packages/core/src/engine/EffectsRunner.ts` — método
  `applyModifyResource` (engadir `events` ao destructuring +
  emisión).

Tests:
- Estender `packages/core/__tests__/engine/EffectsRunner.test.ts`.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 891 tests `--force`.
2. **Verifica** o nome exacto e firma do evento `budgetChange` no
   EventMap: `grep -A2 "budgetChange" packages/core/src/types/events.ts`.
   Confirma a sinatura `(resourceId: string, oldAmount: number,
   newAmount: number)` ou a que sexa real. **Adapta a chamada á
   sinatura real** (lección 2.5 L1: verificar antes de codificar).
3. **Verifica** que `applyModifyResource` desestrutura o context e
   engade `events` se falta.
4. **Confirma** que ningún test existente de `modify_resource`
   verifica (ou rompe con) `budgetChange`.

### T1 — Modificar applyModifyResource (5.1, 5.2, 5.3)
- Engadir `events` ao destructuring `const { store, resources,
  locale, events } = this.context`.
- Engadir o bloque de emisión gardado por `currentAmount !==
  nextAmount` antes do `return ok(...)`.

Typecheck 20/20.

### T2 — Tests novos
Engade tests específicos en `EffectsRunner.test.ts`:

1. **modify_resource '+' emite budgetChange**: subscribirse a
   `budgetChange`, executar effect `{ type: 'modify_resource',
   resourceId: 'xp', op: '+', amount: 10 }` con budget inicial
   xp=50 → recíbese `budgetChange('xp', 50, 60)`.
2. **modify_resource '-' emite budgetChange**: idem con op '-' →
   `budgetChange('xp', 50, 40)`.
3. **modify_resource '*' emite budgetChange**: idem con op '*'
   amount=2 → `budgetChange('xp', 50, 100)`.
4. **delta cero NON emite**: effect que resulte en mesmo valor
   (ex: op '+' amount 0, ou op '*' amount 1) → **cero** eventos
   `budgetChange`.
5. **Integración cross-piece**: replica o escenario 8 da 2.6 (ou
   referencia que agora budgetChange aparece na cascada). Verifica
   que tras unlock dun nodo con effect modify_resource, o
   `budgetChange` do effect emítese.

### T3 — Verificación post-T2
- Typecheck 20/20.
- Tests todos pasando.
- Se algún test existente rompe (improbable: ningún verificaba
  budgetChange desde effect), **escala (0.6)** antes de modificalo.

### T4 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. EffectsRunner
mantén ≥99%. Global non baixa de 98.18% (baseline 2.6).

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
  toca). Sección `Fixed`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio**.
  Contido:
  ```
  ### Fixed
  - Bug latente (DT-13): o effect `modify_resource` mutaba o budget
    pero non emitía o evento `budgetChange`, polo que os suscritores
    externos non se enteraban dos cambios de budget producidos vía
    effect. Agora `EffectsRunner.applyModifyResource` emite
    `budgetChange` tras a mutación (só cando o valor cambia),
    replicando o patrón de `TreeEngine`. Mesma familia que o bug
    de `set_progress` arranxado en 2.6.fix. Detectado no escenario 8
    de 2.6 (cascade event ordering).
  ```

### T6 — Commit + push
Commit Conventional: `fix(core): emit budgetChange from
EffectsRunner.applyModifyResource (sub-phase 2.6.fix2)`. Push directo
a `origin/main` (base `c8bed7e`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/EffectsRunner.ts` (modificado:
  applyModifyResource)
- `packages/core/__tests__/engine/EffectsRunner.test.ts`
  (modificado: +5 tests)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/src/types/`, `packages/core/src/engine/TreeEngine.ts`,
`packages/core/src/engine/ResourceManager.ts`,
`packages/core/src/engine/ProgressManager.ts`,
`packages/core/src/engine/UnlockResolver.ts`, `engine/index.ts`,
`pnpm-lock.yaml`, `core/package.json`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

---

## 9. QUE NON FACER

- ❌ Delegar nunha peza (5.1: emisión directa; ResourceManager é
  cálculo puro).
- ❌ Engadir audit de budget (5.4: ningunha vía o ten).
- ❌ Tratar eventos compensatorios de rollback (5.5: fóra de alcance).
- ❌ Emitir cando delta === 0 (5.2).
- ❌ Tocar TreeEngine, ResourceManager ou calquera outra peza (5.6).
- ❌ Engadir ErrorCodes ou tocar common.
- ❌ Modificar tests existentes para que pasen (escala se algún rompe).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente.
- ❌ Placeholders / `any`.
- ❌ Tocar/mergear o PR de release (#1).

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.6.fix2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base c8bed7e)
✅ applyModifyResource emite budgetChange tras mutación (só se cambia)
✅ Patrón replicado de TreeEngine (cero peza nova, emisión directa)
✅ Cero audit engadido (budgetChange non ten audit en ningunha vía)
✅ DT-13 PECHADA
✅ T0 sinatura budgetChange: <confirmada>
✅ T0 tests modify_resource existentes: <ningún rompe>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / EffectsRunner <Y%>
   (baseline 2.6: 98.18%)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Nota: emisión de budgetChange durante effects que logo se
   revierten é coherente co comportamento de set_progress (2.6.fix);
   eventos compensatorios de rollback son decisión futura.
✅ Changeset patch (core; common NON tocado) + nova [Unreleased]
   con Fixed
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA: hixiene MASTER final + peche oficial Fase 2 (cero
asimetrías coñecidas) + decisión Fase 3.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 2.6.fix2. Emisión directa dun evento, ~5 liñas + 5
tests. Calquera caso non cuberto → ESCALAR.*
