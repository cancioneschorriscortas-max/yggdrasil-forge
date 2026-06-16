# BRIEFING — SUB-FASE 8.4.c de Yggdrasil Forge

> Pega este documento no chat executor.
> **ÚLTIMA das 3 sub-sub-fases de 8.4** (PluginManager + HookRunner).
> Tras 8.4.a (PluginManager) + 8.4.b.i (HookRunner) + 8.4.b.ii
> (PluginAPI + connection), 8.4.c **integra hooks** en
> TreeEngine.unlock/lock/respec/canUnlock — os 4 métodos máis
> usados do engine (303 chamadas en tests existentes).
>
> **🚨 SUB-FASE DE MAIOR RISCO DA FASE 8**. Modificación cirúrxica
> simultánea de 4 métodos críticos. **Garantía dura backward-compat**:
> con cero hooks rexistrados, comportamento **idéntico ao actual**
> (303 tests existentes pasan inchanged).
>
> **Pezas (5 grupos)**:
> 1. 1 ErrorCode novo: `YGG_PL007 OPERATION_CANCELLED_BY_HOOK`.
> 2. Mensaxe localizada gl/es/en con `{operation}` placeholder.
> 3. **TreeEngine.unlock** modificado cirúrxicamente: `runBeforeUnlock`
>    despois da validación; `runAfterUnlock` tras éxito.
> 4. **TreeEngine.lock** análogo.
> 5. **TreeEngine.respec** análogo (con readonly string[] nodeIds).
> 6. **TreeEngine.canUnlock** modificado: `runComputeUnlockability`
>    **só ao return final** (path "all checks passed"); cero
>    aplicar a early returns.
> 7. **Tests novos**: ~18-20 cubrindo hooks + backward-compat.
>
> **Decisións confirmadas polo director**:
> - **Punto de inxección runBefore***: despois de toda a validación,
>   antes da mutación. Plugin recibe nodeId xa validado.
> - **Punto de inxección runAfter***: tras éxito completo (post
>   mutation + events + audit + invalidate). NON chamado se
>   operación cancelou ou fallou por outras razóns.
> - **runComputeUnlockability**: só ao return final "allowed: true"
>   path. Early returns son hard reasons (NODE_NOT_FOUND, etc.) e
>   non pasan polos hooks.
> - **Cancelación**: cero efectos colaterais (cero events, cero
>   audit, cero invalidate). Devolve `err(OPERATION_CANCELLED_BY_HOOK)`
>   con `{operation: 'unlock'|'lock'|'respec'}`.
> - **`computeCost` DIFERIDO** a sub-fase futura (cero use case
>   inmediato; require modificar ResourceManager).
> - **HookContext mínimo**: `{ locale, timestamp: Date.now(),
>   metadata: {} }`. `actor` DIFERIDO.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
> localización exacta dos 4 métodos + cero chamadas previas a
> hookRunner.run* (verificado polo director).
>
> 8.5-8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.4.c — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.4.c — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando
aplique (HookContext.actor opcional).

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: liñas novas (5 puntos de inxección + 1 ErrorCode)
chegan a **100% cobertura**. Cero regresión na baseline post-8.4.b.ii.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE DURA**: Cero modificación de
calquera test existente. **Tódolos 1655 core + 60 common + 193
storage + 116 react = 2024 tests** deben pasar **intactos**.

**Verificación CRÍTICA T4**: tras modificar TreeEngine.ts,
**OBRIGATORIO** correr tests + confirmar que pasan tódolos 1655
previos. Especial atención aos **303 tests dependentes**:
- 222 `engine.unlock(...)`.
- 22 `engine.lock(...)`.
- 29 `engine.respec(...)`.
- 30 `engine.canUnlock(...)`.

**Se algún falla → ESCALAR INMEDIATAMENTE. NON CONTINUAR**.

**0.14 — Lección 8.3 L1 aplicada con rigor**: T0.2 verifica
empíricamente:
- Liñas exactas dos 4 métodos (unlock 805, lock 1141, respec 1246,
  canUnlock 655 — verificadas polo director sobre commit `7adb1a2`).
- `this.hookRunner.run*` cero chamadas no TreeEngine actual.

**0.15 — Aliñamento estrito con §5**: o briefing prescribe os 5
puntos de inxección con detalle. **Cero engadir hooks adicionais**
(cero `computeCost` aínda; DIFERIDO).

---

## 1. IDENTIFICACIÓN

Sub-fase **8.4.c** de Yggdrasil Forge. **ÚLTIMA das 3 sub-sub-fases
de 8.4** (PluginManager + HookRunner). **Sub-fase de maior risco
da Fase 8** por modificación cirúrxica simultánea de 4 métodos
críticos con 303 chamadas en tests existentes.

**Pezas (5 grupos)**:

**Grupo A — 1 ErrorCode novo**:
1. `packages/common/src/errors/codes.ts`: engadir 1 entrada despois
   das PL001-PL006:
   ```ts
   OPERATION_CANCELLED_BY_HOOK = 'YGG_PL007',
   ```

**Grupo B — Mensaxe localizada**:
2. `packages/common/src/errors/messages.ts`: engadir 1 entrada
   (gl/es/en) con `{operation}` placeholder.

**Grupo C — TreeEngine.unlock modificado** (línea 805):
3. **`runBeforeUnlock(nodeId, ctx)`** despois de toda a validación,
   antes da mutación. Se devolve false → `err(OPERATION_CANCELLED_BY_HOOK,
   { operation: 'unlock' })`.
4. **`runAfterUnlock(nodeId, ctx)`** **tras o return ok** (despois
   de mutation + events + audit + invalidate). **Cero await** se
   precisamos devolver ok síncronamente — pero hooks son async,
   require await.

**Grupo D — TreeEngine.lock modificado** (línea 1141):
5. Análogo a unlock: `runBeforeLock` + `runAfterLock`.

**Grupo E — TreeEngine.respec modificado** (línea 1246):
6. `runBeforeRespec(nodeIdsToLock, ctx)` despois da validación
   (post readOnly + costPercent + normalización + filter + cascade
   fixpoint computado). **Pasa nodeIdsToLock** (array final tras
   cascade) ao hook.
7. `runAfterRespec(nodeIdsToLock, ctx)` tras o return ok.

**Grupo F — TreeEngine.canUnlock modificado** (línea 655):
8. `runComputeUnlockability(nodeId, defaultResult)` **só** ao return
   final do path "all checks passed". Os early returns (NODE_NOT_FOUND,
   NODE_ALREADY_UNLOCKED, NODE_EXPIRED, READ_ONLY_VIOLATION, etc.)
   **NON pasan polos hooks**.

**Grupo G — Tests novos**:
9. `packages/core/__tests__/plugins/TreeEngine.hooks.test.ts`
   (NOVO; ~18-20 tests).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros 14 paquetes
  scaffold.
- **Calquera outro ficheiro** en `packages/core/src/` fora de
  TreeEngine.ts.
- **Calquera test existente** (1655 core + 60 common + 193 storage
  + 116 react = 2024 tests).
- `packages/core/src/plugins/` (HookRunner, PluginManager,
  PluginAPI intactos).
- `packages/core/src/types/` (Hooks, HookContext, UnlockCheck xa
  tipados).
- `package.json`, configs, lockfile.
- `docs/architecture/MASTER.md`.

**CERO deps de npm engadidas.** Cero entry points novos. Cero
`computeCost` chamada (DIFERIDO).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `7adb1a2`, verificada
empíricamente)**.

### Estado actual dos 4 métodos (verificado polo director)

| Método | Liña | Signature | Tests dependentes |
|---|---|---|---|
| `unlock` | **805** | `async unlock(nodeId: string): Promise<Result<UnlockResult>>` | 222 |
| `lock` | **1141** | `async lock(nodeId: string): Promise<Result<LockResult>>` | 22 |
| `respec` | **1246** | `async respec(nodeIdOrIds?, opts?): Promise<Result<RespecResult>>` | 29 |
| `canUnlock` | **655** | **sync** `canUnlock(nodeId: string): Result<UnlockCheck>` | 30 |

**Total 303 tests dependentes**.

### HookRunner xa dispoñible (8.4.b.ii)

```ts
private readonly hookRunner: HookRunner  // existente desde 8.4.b.ii
```

**Verificado polo director**: `this.hookRunner.run*` **cero matches**
no TreeEngine actual. ✅ Libre para 8.4.c.

### HookContext interface (literal)

```ts
export interface HookContext {
  readonly locale: string
  readonly timestamp: number
  readonly actor?: string
  metadata: Record<string, unknown>
}
```

**Construción prescrita** en cada lugar onde se chama un hook:

```ts
const ctx: HookContext = {
  locale: this.locale,
  timestamp: Date.now(),
  metadata: {},
}
```

**Cero `actor`** (DIFERIDO; sub-fase futura pode inxectar desde
tenancy/permissions).

### unlock estructura actual (verificada)

```ts
async unlock(nodeId: string): Promise<Result<UnlockResult>> {
  // 1. readOnly check
  // 2. NODE_NOT_FOUND check (treeDef.nodes.find)
  // 3. canUnlock check (devolve checkResult)
  // 4. Se !check.allowed → derivar erro específico
  // 5. Mutación (store.update)
  // 6. Eventos (stateChange, unlock, budgetChange)
  // 7. Audit (audit.record)
  // 8. statComputer.invalidate
  // 9. return ok(...)
}
```

**Punto de inxección `runBeforeUnlock`**: **inmediatamente despois
do paso 4** (toda a validación) e **antes do paso 5** (mutación).

**Punto de inxección `runAfterUnlock`**: **inmediatamente antes
do paso 9** (return ok). Tras tódolos efectos colaterais exitosos.

### lock estructura actual

Análoga a unlock:
- readOnly check.
- NODE_NOT_FOUND check.
- Estado check (debe estar unlocked/maxed).
- Mutación + eventos + audit + invalidate.

**Puntos de inxección**: idénticos (despois validation, tras éxito).

### respec estructura actual (sub-fase 8.3 REVISED)

```ts
async respec(nodeIdOrIds?, opts?): Promise<Result<RespecResult>> {
  // 1. readOnly check
  // 2. Validar costPercent ∈ [0, 100]
  // 3. Determinar nodeIdsToLock (normalización + filter + cascade fixpoint)
  // 4. Se nodeIdsToLock.length === 0 → early return ok(empty)
  // 5. Calcular refund con costPercent factor
  // 6. store.update (lock + budget)
  // 7. invalidate
  // 8. audit
  // 9. events
  // 10. return ok(...)
}
```

**Punto de inxección `runBeforeRespec`**: despois do paso 4
(early return de empty ja pasou) e antes do paso 5. **Pasa o
array `nodeIdsToLock` final** ao hook.

**Punto de inxección `runAfterRespec`**: inmediatamente antes do
paso 10 (return ok). Pasa o mesmo `nodeIdsToLock`.

**Decisión do director**: se early return de `nodeIdsToLock.length === 0`
ocurre (cero nodos a lockear), **cero chama hooks**. Razón: cero
operación efectiva tivo lugar.

### canUnlock estructura actual

```ts
canUnlock(nodeId: string): Result<UnlockCheck> {
  // Multiple early returns:
  // - NODE_NOT_FOUND
  // - readOnly (NODE_DISABLED?)
  // - currentState === 'maxed' → NODE_ALREADY_UNLOCKED
  // - currentState === 'unlocked' && tier full → NODE_ALREADY_UNLOCKED
  // - currentState === 'expired' → NODE_EXPIRED
  // - Prerequisites check
  // - Budget check
  // - ... finalmente:
  return ok({ allowed: true })
}
```

**Punto de inxección `runComputeUnlockability`**: **só** no return
final `ok({ allowed: true })`. Tódolos early returns **non pasan**
polo hook.

**Patrón prescrito**:
```ts
// (toda a lóxica existente con early returns intacta)

// Final do path "all checks passed":
const defaultResult: UnlockCheck = { allowed: true }
const modified = this.hookRunner.runComputeUnlockability(nodeId, defaultResult)
return ok(modified)
```

### Decisión sobre cancelación

Cando `runBefore*(args, ctx)` devolve `false`:
1. **Cero state mutation**.
2. **Cero events emitidos**.
3. **Cero audit record**.
4. **Cero invalidate de caches**.
5. **Devolve** `err(OPERATION_CANCELLED_BY_HOOK)` con mensaxe
   localizada usando `{operation: 'unlock'|'lock'|'respec'}`.

**Razón**: cancelación é "como se a chamada nunca ocorrese".

### Decisión sobre runAfter*

**Chamada só tras éxito completo** da operación (despois de
todos os efectos colaterais).

**NON chamada se**:
- Operación foi cancelada por runBefore.
- Operación fallou por outras razóns (validation, etc.).

**Comportamento de erros en runAfter handlers**: HookRunner xa
captura erros (8.4.b.i) + emite pluginError via onError callback
(8.4.b.ii). Cero require manejo adicional en 8.4.c.

### Lección 8.3 L1 aplicada

```bash
# Confirmar que NINGÚN dos run* métodos de hookRunner é chamado
# actualmente no TreeEngine:
grep -nE "this\.hookRunner\.run" packages/core/src/engine/TreeEngine.ts
# Esperado: 0 matches.
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `7adb1a2` (sub-fase 8.4.b.ii — PluginAPI).
- 1655 core + 60 common + 193 storage + 116 react = 2024 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 49 ErrorCodes existentes (incluído PL001-PL006).
- DT abertas: 11.
- **Cadea 43 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

**Integrar hooks** en TreeEngine.unlock/lock/respec/canUnlock —
os 4 métodos máis usados (303 tests dependentes): `runBeforeUnlock/Lock/Respec`
despois da validación e antes da mutación (se devolve false →
cancela con `err(OPERATION_CANCELLED_BY_HOOK)` + cero efectos
colaterais); `runAfterUnlock/Lock/Respec` tras éxito completo da
operación (cero chamado se cancelado ou se fallou); 
`runComputeUnlockability` **só** ao return final do path "all
checks passed" de canUnlock (cero modifica early returns);
HookContext mínimo `{ locale, timestamp: Date.now(), metadata: {} }`
construído inline en cada lugar; 1 ErrorCode novo
`OPERATION_CANCELLED_BY_HOOK` con mensaxe localizada gl/es/en; tests
específicos (~18-20) cubrindo hooks + backward-compat. **Garantía
dura**: cero hooks rexistrados → comportamento idéntico ao actual
(303 tests existentes pasan inchanged). `computeCost` DIFERIDO a
sub-fase futura.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (2)**:
- `packages/core/__tests__/plugins/TreeEngine.hooks.test.ts`
  (~250 liñas; ~18-20 tests).
- `.changeset/treeengine-hooks-8-4-c.md` (NOVO).

**MODIFICADOS (4)**:
- `packages/common/src/errors/codes.ts` (engadir 1 entrada).
- `packages/common/src/errors/messages.ts` (engadir 1 entrada
  gl/es/en).
- `packages/core/src/engine/TreeEngine.ts` (modificación cirúrxica
  de 4 métodos + imports).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 6 ficheiros tocados** (2 NOVOS + 4 MODIFICADOS).

**Cero modificación de**:
- `packages/core/src/plugins/HookRunner.ts` (intacto desde 8.4.b.i).
- `packages/core/src/plugins/PluginManager.ts` (intacto desde
  8.4.b.ii).
- `packages/core/src/plugins/PluginAPI.ts` (intacto desde 8.4.b.ii).
- `packages/core/src/types/plugin.ts` (intacto desde 8.4.b.ii).
- **Calquera test existente** (1655 core + 60 common + 193 storage
  + 116 react). Especialmente os 303 dependentes pasan inchanged.
- Outros ficheiros en `packages/core/src/`.
- `packages/storage/`, `packages/react/`, outros paquetes.
- Configs.
- MASTER.md.

### 5.2 — ErrorCode novo (FIXADO)

**Engadir** en `packages/common/src/errors/codes.ts` despois de
PL006:

```ts
  OPERATION_CANCELLED_BY_HOOK = 'YGG_PL007',
```

### 5.3 — Mensaxe localizada (FIXADA)

**Engadir** en `packages/common/src/errors/messages.ts` despois
de PL006:

```ts
  [ErrorCode.OPERATION_CANCELLED_BY_HOOK]: {
    gl: 'Operación "{operation}" cancelada por hook de plugin',
    es: 'Operación "{operation}" cancelada por hook de plugin',
    en: 'Operation "{operation}" cancelled by plugin hook',
  },
```

### 5.4 — Imports a engadir en TreeEngine.ts (FIXADO)

**Engadir** ao import existente de types/index.js:

```ts
import type {
  // ... existentes
  HookContext,           // ← engadir
  // ... resto existentes
} from '../types/index.js'
```

**`ErrorCode.OPERATION_CANCELLED_BY_HOOK`**: usa o import existente
de `ErrorCode` (xa presente).

### 5.5 — TreeEngine.unlock modificación cirúrxica (FIXADO)

**Estructura prescrita** (modificación de unlock línea 805):

```ts
async unlock(nodeId: string): Promise<Result<UnlockResult>> {
  // ── INICIO: validación existente (INCHANGED) ──
  if (this.readOnly) {
    return err(
      new YggdrasilError(
        ErrorCode.READ_ONLY_VIOLATION,
        getErrorMessage(ErrorCode.READ_ONLY_VIOLATION, this.locale, {}),
      ),
    )
  }

  const treeDef = this.store.getTreeDef()
  const nodeDef = treeDef.nodes.find((n) => n.id === nodeId)
  if (nodeDef === undefined) {
    return err(/* NODE_NOT_FOUND */)
  }

  const checkResult = this.canUnlock(nodeId)
  if (!checkResult.ok) return checkResult

  const check = checkResult.value
  if (!check.allowed) {
    // ... derivar ErrorCode específico (INCHANGED) ...
  }
  // ── FIN: validación existente ──

  // ── INICIO: 8.4.c — runBeforeUnlock ──
  const ctx: HookContext = {
    locale: this.locale,
    timestamp: Date.now(),
    metadata: {},
  }
  const proceed = await this.hookRunner.runBeforeUnlock(nodeId, ctx)
  if (!proceed) {
    return err(
      new YggdrasilError(
        ErrorCode.OPERATION_CANCELLED_BY_HOOK,
        getErrorMessage(ErrorCode.OPERATION_CANCELLED_BY_HOOK, this.locale, {
          operation: 'unlock',
        }),
      ),
    )
  }
  // ── FIN: 8.4.c ──

  // ── INICIO: mutación + eventos + audit + invalidate (INCHANGED) ──
  // ... toda a lóxica existente ...
  // ── FIN ──

  // ── INICIO: 8.4.c — runAfterUnlock ──
  await this.hookRunner.runAfterUnlock(nodeId, ctx)
  // ── FIN: 8.4.c ──

  return ok(/* UnlockResult */)
}
```

**Decisións nesta peza**:
- **HookContext construído inline** unha vez; reutilizado en
  runBefore e runAfter (mesmo ctx para coherencia temporal).
- **`await runBeforeUnlock`**: handlers poden ser async.
- **`await runAfterUnlock`**: handlers poden ser async. Cero
  Promise.all (decisión 8.4.b.i for-loop secuencial).
- **`return err` ao cancelar**: cero efectos colaterais
  (store.update non se chamou, etc.).

### 5.6 — TreeEngine.lock modificación cirúrxica (FIXADO)

**Estructura prescrita** (modificación de lock línea 1141 —
análoga a unlock):

```ts
async lock(nodeId: string): Promise<Result<LockResult>> {
  // ── INICIO: validación existente (INCHANGED) ──
  // readOnly + NODE_NOT_FOUND + state check
  // ── FIN ──

  // ── INICIO: 8.4.c — runBeforeLock ──
  const ctx: HookContext = {
    locale: this.locale,
    timestamp: Date.now(),
    metadata: {},
  }
  const proceed = await this.hookRunner.runBeforeLock(nodeId, ctx)
  if (!proceed) {
    return err(
      new YggdrasilError(
        ErrorCode.OPERATION_CANCELLED_BY_HOOK,
        getErrorMessage(ErrorCode.OPERATION_CANCELLED_BY_HOOK, this.locale, {
          operation: 'lock',
        }),
      ),
    )
  }
  // ── FIN: 8.4.c ──

  // ── INICIO: mutación + eventos + audit + invalidate (INCHANGED) ──
  // ── FIN ──

  // ── INICIO: 8.4.c — runAfterLock ──
  await this.hookRunner.runAfterLock(nodeId, ctx)
  // ── FIN: 8.4.c ──

  return ok(/* LockResult */)
}
```

### 5.7 — TreeEngine.respec modificación cirúrxica (FIXADO)

**Estructura prescrita** (modificación de respec línea 1246):

```ts
async respec(
  nodeIdOrIds?: string | readonly string[],
  opts?: RespecOptions,
): Promise<Result<RespecResult>> {
  // ── INICIO: validación existente (INCHANGED) ──
  // readOnly + costPercent validation + nodeIds normalization
  // + filter + cascade fixpoint → nodeIdsToLock final
  // ── FIN ──

  // Early return: cero nodos a lockear → cero hooks chamados.
  if (nodeIdsToLock.length === 0) {
    return ok({ nodeIds: [], refunded: [] })
  }

  // ── INICIO: 8.4.c — runBeforeRespec ──
  const ctx: HookContext = {
    locale: this.locale,
    timestamp: Date.now(),
    metadata: {},
  }
  const proceed = await this.hookRunner.runBeforeRespec(nodeIdsToLock, ctx)
  if (!proceed) {
    return err(
      new YggdrasilError(
        ErrorCode.OPERATION_CANCELLED_BY_HOOK,
        getErrorMessage(ErrorCode.OPERATION_CANCELLED_BY_HOOK, this.locale, {
          operation: 'respec',
        }),
      ),
    )
  }
  // ── FIN: 8.4.c ──

  // ── INICIO: refund + mutación + invalidate + audit + events (INCHANGED) ──
  // ── FIN ──

  // ── INICIO: 8.4.c — runAfterRespec ──
  await this.hookRunner.runAfterRespec(nodeIdsToLock, ctx)
  // ── FIN: 8.4.c ──

  return ok({ nodeIds: nodeIdsToLock, refunded: allCosts })
}
```

**Decisións nesta peza**:
- **Early return `length === 0`** **NON chama hooks** (decisión do
  director: cero operación efectiva).
- **`nodeIdsToLock` final** (tras cascade) é o que se pasa aos
  hooks (cero o input orixinal).
- **Reutilizar ctx** entre runBefore e runAfter.

### 5.8 — TreeEngine.canUnlock modificación cirúrxica (FIXADO)

**Estructura prescrita** (modificación de canUnlock línea 655 —
**só ao return final**):

```ts
canUnlock(nodeId: string): Result<UnlockCheck> {
  // ── INICIO: tódolos early returns existentes (INCHANGED) ──
  // - NODE_NOT_FOUND
  // - readOnly violations (NODE_DISABLED ou similar)
  // - currentState === 'maxed' → NODE_ALREADY_UNLOCKED
  // - currentState === 'unlocked' && tier full → NODE_ALREADY_UNLOCKED
  // - currentState === 'expired' → NODE_EXPIRED
  // - Prerequisites check
  // - Budget check
  // ── FIN ──

  // ── INICIO: 8.4.c — runComputeUnlockability ao return final ──
  // O resto da lóxica chegou aquí: all checks passed.
  const defaultResult: UnlockCheck = { allowed: true }
  const modified = this.hookRunner.runComputeUnlockability(nodeId, defaultResult)
  return ok(modified)
  // ── FIN: 8.4.c ──
}
```

**Decisión nesta peza**:
- **canUnlock é sync**; `runComputeUnlockability` é sync (compute
  hooks son sync por tipo). Compatible.
- **Cero early returns modificados**. Plugins NON poden override
  NODE_NOT_FOUND, NODE_ALREADY_UNLOCKED, NODE_EXPIRED, etc.
- **Sub-fase futura pode estender** se require flexibility maior.

**ATENCIÓN ao Executor**: o final exacto de canUnlock pode requirir
cirurxía para identificar onde termina o último early return e
empeza o "all checks passed". **Verificar empíricamente** en T0.2
buscando o `return ok({ allowed: true })` final (ou similar). Se
existe ya na forma `return ok({ allowed: true, reason: undefined })`
ou similar, **adaptar** mantendo o equivalente como
`defaultResult`.

### 5.9 — Tests prescritos (~18-20 tests)

**`__tests__/plugins/TreeEngine.hooks.test.ts`** (NOVO):

#### Backward-compat (CRÍTICOS — 4 tests)

1. **`unlock()` sen plugins rexistrados**: comportamento idéntico ao
   actual (state change correcto, events emitidos, audit gravado,
   return ok).
2. **`lock()` sen plugins**: análogo.
3. **`respec()` sen plugins**: análogo.
4. **`canUnlock()` sen plugins**: devolve defaultResult inchanged.

#### beforeUnlock hook (3 tests)

5. **beforeUnlock devolve true** → unlock procede normalmente.
6. **beforeUnlock devolve false** → unlock cancela con
   `err(OPERATION_CANCELLED_BY_HOOK)`; **cero state change**, cero
   events relevantes (unlock event NON emitido), cero audit gravado.
7. **beforeUnlock async (Promise<boolean>)** → awaited correctamente.

#### afterUnlock hook (2 tests)

8. **afterUnlock chamado tras unlock exitoso** con (nodeId, ctx)
   correctos.
9. **afterUnlock NON chamado se beforeUnlock cancelou**.

#### lock hooks (1 test)

10. **beforeLock cancela** → err(OPERATION_CANCELLED_BY_HOOK,
    operation='lock').

#### respec hooks (2 tests)

11. **beforeRespec cancela** → err(OPERATION_CANCELLED_BY_HOOK,
    operation='respec'); cero state change.
12. **beforeRespec con array nodeIdsToLock tras cascade**: hook
    recibe array final (tras cascade), cero o input orixinal.

#### computeUnlockability (3 tests)

13. **canUnlock con computeUnlockability hook**: hook modifica
    `allowed: true` a `allowed: false, reason: 'custom'`; canUnlock
    devolve o modificado.
14. **canUnlock con computeUnlockability hook que devolve mesmo
    valor**: result inchanged.
15. **canUnlock con NODE_NOT_FOUND**: cero pasa polo hook (early
    return; hook NON chamado).

#### HookContext (2 tests)

16. **Context recibido**: locale + timestamp + metadata={} correctos.
17. **Context reutilizado** entre runBefore e runAfter (mesmo
    timestamp).

#### Edge cases (1 test)

18. **respec con length=0 (cero nodos a lockear)**: cero hooks
    chamados.

**Total: ~18 tests**. Post-8.4.c esperado: 1655 → **~1673 core
tests**.

**Fixtures**: TreeEngine real con plugins mock (usando
`engine.registerPlugin()` real desde 8.4.b.ii). PluginManager xa
funcional.

### 5.10 — Cobertura prescrita

- **TreeEngine.ts**: 100% nas liñas novas (5 puntos de inxección +
  imports + HookContext construcións).
- **packages/common**: cobertura mantida (mensaxe nova exercida
  polos tests de cancelación).
- **Cero regresión** noutras pezas.

### 5.11 — Cero deps novas

Verificable empíricamente.

### 5.12 — Test counts esperados post-8.4.c

- **core**: 1655 + ~18 = **~1673 tests**.
- **common, storage, react**: intactos.

### 5.13 — Coordinación con sub-fases futuras

- **`computeCost` hook**: DIFERIDO. Cero scope creep en 8.4.c.
  Sub-fase futura específica (probable 9.x ou parte dunha extensión
  de plugins).
- **`actor` no HookContext**: DIFERIDO. Sub-fase futura pode
  inxectar desde tenancy/permissions.
- **runComputeUnlockability en early returns**: DIFERIDO. Sub-fase
  futura pode estender se require flexibility.

### 5.14 — Lección 8.3 L1 aplicada

T0.2 verifica:
```bash
# Confirmar que hookRunner.run* NON se chama en TreeEngine:
grep -nE "this\.hookRunner\.run" packages/core/src/engine/TreeEngine.ts
# Esperado: 0 matches.

# Confirmar HookContext xa exportado:
grep -E "HookContext" packages/core/src/types/index.ts
# Esperado: 1+ match (re-export).

# Confirmar localización exacta dos 4 métodos:
for method in unlock lock respec canUnlock; do
  echo -n "$method: "
  grep -nE "^  (async )?${method}\(" packages/core/src/engine/TreeEngine.ts | head -1
done
# Esperado: liñas 805, 1141, 1246, 655 (poden variar un pouco
# tras 8.4.b.ii; verificar).
```

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| 1 ErrorCode | enum entry | codes.ts | +2 |
| 1 mensaxe gl/es/en | object entry | messages.ts | +6 |
| Import HookContext | type import | TreeEngine.ts | +1 modif |
| runBeforeUnlock + ctx + cancelación | 5 liñas en unlock | TreeEngine.ts | +20 |
| runAfterUnlock | 1-2 liñas en unlock | TreeEngine.ts | +3 |
| runBeforeLock + cancelación | análogo en lock | TreeEngine.ts | +18 |
| runAfterLock | en lock | TreeEngine.ts | +3 |
| runBeforeRespec + cancelación | en respec | TreeEngine.ts | +18 |
| runAfterRespec | en respec | TreeEngine.ts | +3 |
| runComputeUnlockability | en canUnlock | TreeEngine.ts | +5 |
| TreeEngine.hooks.test.ts | describe blocks | .test.ts | ~250 |

**Total estimado**: ~70 liñas de código en TreeEngine.ts +
~250 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `packages/core/__tests__/plugins/TreeEngine.hooks.test.ts`
- `.changeset/treeengine-hooks-8-4-c.md`

**MODIFICADOS (4)**:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 6 ficheiros tocados** (2 NOVOS + 4 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`, especialmente:
  - `plugins/HookRunner.ts` (intacto desde 8.4.b.i).
  - `plugins/PluginManager.ts` (intacto desde 8.4.b.ii).
  - `plugins/PluginAPI.ts` (intacto desde 8.4.b.ii).
  - `types/plugin.ts` (Hooks, HookContext, PluginEngineHandle xa
    tipados).
- **Calquera test existente** (1655 core + 60 common + 193 storage
  + 116 react = 2024 tests; especialmente 303 dependentes pasan
  inchanged).
- `packages/storage/`, `packages/react/`, outros paquetes.
- Configs.
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc actualizado** en unlock/lock/respec/canUnlock para reflectir
chamadas a hooks (1 frase adicional na descrición existente).

**Marcadores 8.4.c**: `// ── INICIO: 8.4.c — <nome> ──` / `// ── FIN:
8.4.c ──`.

**Patrón Result**: tódolos métodos modificados manteñen signature.

**Cero throw**: erros encerrados con `err(...)`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/src/plugins/HookRunner.ts` (intacto).
- ❌ Modificar `packages/core/src/plugins/PluginManager.ts` (intacto).
- ❌ Modificar `packages/core/src/plugins/PluginAPI.ts` (intacto).
- ❌ Modificar `packages/core/src/types/plugin.ts` (Hooks, HookContext,
  PluginEngineHandle xa tipados).
- ❌ Modificar **calquera test existente** (1655 core + outros;
  especialmente 303 dependentes).
- ❌ Modificar `packages/core/src/builds/` ou outros directorios.
- ❌ Modificar `packages/storage/`, `packages/react/`, outros.
- ❌ Engadir hooks adicionais (cero `computeCost` aínda; DIFERIDO).
- ❌ Aplicar `runComputeUnlockability` a early returns de canUnlock
  (decisión do director: só final path).
- ❌ Aplicar `runBeforeRespec` antes do early return `length === 0`
  (decisión do director: cero hooks se cero operación).
- ❌ Engadir `actor` ao HookContext (DIFERIDO).
- ❌ Modificar a estrutura interna de canUnlock (early returns
  inchanged).
- ❌ Engadir deps de npm.
- ❌ Usar `!` non-null assertions.
- ❌ Usar `Promise.all` para hooks (cero require; for-loop secuencial
  xa está en HookRunner).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T8)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `7adb1a2` como HEAD.

**T0.2** — Verificacións empíricas (críticas):

```bash
# Localizar exactamente os 4 métodos:
for method in unlock lock respec canUnlock; do
  echo -n "$method: "
  grep -nE "^  (async )?${method}\(" packages/core/src/engine/TreeEngine.ts | head -1
done
# Esperado: 4 matches (uno cada un)

# Confirmar hookRunner.run* cero chamadas en TreeEngine:
grep -nE "this\.hookRunner\.run" packages/core/src/engine/TreeEngine.ts
# Esperado: 0 matches

# Confirmar HookContext re-exportado desde types/index.ts:
grep -E "HookContext" packages/core/src/types/index.ts

# Confirmar 222 + 22 + 29 + 30 = 303 chamadas en tests:
for pattern in "engine\.unlock\(" "engine\.lock\(" "engine\.respec\(" "engine\.canUnlock\("; do
  count=$(grep -rE "$pattern" packages/core/__tests__ | wc -l)
  echo "$pattern: $count"
done
# Esperado: 222 + 22 + 29 + 30
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1655 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir ErrorCode + mensaxe a common

Aplicar §5.2 e §5.3 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/common test --force      # 60 tests intactos
```

### T2 — Modificar TreeEngine.ts (4 métodos cirúrxicamente)

Aplicar §5.4, §5.5, §5.6, §5.7, §5.8 literal **en orde**:

1. **Engadir HookContext** ao import existente de types/index.js.
2. **unlock**: insertar runBeforeUnlock + runAfterUnlock segundo §5.5.
3. **lock**: insertar runBeforeLock + runAfterLock segundo §5.6.
4. **respec**: insertar runBeforeRespec + runAfterRespec segundo
   §5.7.
5. **canUnlock**: insertar runComputeUnlockability ao return final
   segundo §5.8.

**ATENCIÓN**: a posición exacta de inxección depende da estrutura
real do código. **Verificar empíricamente** os marcadores existentes
e adaptar coherentemente. **Cero modificación** de outras partes
dos métodos.

### T3 — Verificación typecheck

```bash
pnpm turbo run typecheck --force                          # 22/22
```

### T4 — Verificación CRÍTICA: 1655 tests previos pasan inchanged

```bash
pnpm --filter @yggdrasil-forge/core test --force          # 1655 tests intactos
```

**Tódolos 1655 tests previos deben pasar SEN MODIFICAR**.

**Especial atención**:
- 222 tests con `engine.unlock(...)`.
- 22 tests con `engine.lock(...)`.
- 29 tests con `engine.respec(...)`.
- 30 tests con `engine.canUnlock(...)`.
- Tests de TreeEngine.install.test.ts, TreeEngine.plugins.test.ts,
  TreeEngine.snapshot.test.ts, TreeEngine.loadout.test.ts,
  TreeEngine.respec.options.test.ts.

**Se algún falla → ESCALAR INMEDIATAMENTE. NON CONTINUAR**.

### T5 — Crear test TreeEngine.hooks.test.ts

Aplicar §5.9 literal (~18 tests).

### T6 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1673 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "TreeEngine|^All files" | head -5
# Cobertura targets:
#   TreeEngine.ts: baseline mantida ou superada (liñas novas 100%)
#   Resto: sen regresión
```

### T7 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/__tests__/plugins/TreeEngine.hooks.test.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T8 — Changeset + CHANGELOG + commit + push

`.changeset/treeengine-hooks-8-4-c.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): integrate plugin hooks in TreeEngine unlock/lock/respec/canUnlock (sub-phase 8.4.c)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **TreeEngine.unlock**: chama `runBeforeUnlock(nodeId, ctx)` despois
  da validación; se devolve false → cancela con
  `err(OPERATION_CANCELLED_BY_HOOK, operation='unlock')` e **cero
  efectos colaterais** (cero state mutation, cero events, cero audit).
  Tras éxito chama `runAfterUnlock(nodeId, ctx)`.
- **TreeEngine.lock**: análogo (`runBeforeLock` + `runAfterLock`).
- **TreeEngine.respec**: análogo (`runBeforeRespec(nodeIds, ctx)`
  + `runAfterRespec(nodeIds, ctx)`). `nodeIds` é o array final tras
  cascade. **Cero hooks** se `nodeIdsToLock.length === 0` (early
  return).
- **TreeEngine.canUnlock**: chama `runComputeUnlockability(nodeId,
  defaultResult)` **só ao return final** do path "all checks passed".
  Early returns (NODE_NOT_FOUND, NODE_ALREADY_UNLOCKED, NODE_EXPIRED,
  etc.) **NON pasan polos hooks** — son hard reasons; plugins non
  poden override en 8.4.c (sub-fase futura pode estender).
- `@yggdrasil-forge/common`: **1 ErrorCode novo** baixo prefixo
  existente `YGG_PL*`:
  - `OPERATION_CANCELLED_BY_HOOK` (`YGG_PL007`): operación
    cancelada por hook do plugin.
  - Mensaxe localizada gl/es/en con `{operation}` placeholder.

### Note
- Sub-fase 8.4.c **ÚLTIMA das 3 sub-sub-fases de 8.4** (PluginManager
  + HookRunner).
- **Tras 8.4.c, hooks son funcionais end-to-end**:
  - Plugins poden interceptar unlock/lock/respec (before:
    cancela; after: notifica).
  - Plugins poden modificar canUnlock result (computeUnlockability).
- **Garantía dura backward-compat**: con cero hooks rexistrados,
  comportamento idéntico ao actual. **1655 tests previos pasan
  inchanged** (incluído 303 chamadas a unlock/lock/respec/canUnlock).
- **HookContext mínimo**: `{ locale, timestamp: Date.now(),
  metadata: {} }`. **`actor` DIFERIDO** (sub-fase futura pode
  inxectar desde tenancy).
- **DIFERIDOS** (sub-fases futuras):
  - `computeCost` hook: require modificar ResourceManager
    profundamente; cero use case inmediato.
  - `runComputeUnlockability` en early returns de canUnlock.
  - `actor` no HookContext.
- **Cero modificación de plugins/ ficheiros** (HookRunner,
  PluginManager, PluginAPI intactos desde sub-fases anteriores).
- **Cero modificación de calquera test existente** (2024 tests
  totais intactos).
- **Cero deps de npm engadidas**.
- **Cero modificación de packages/storage/, packages/react/**, outros.
- **Lección 8.3 L1 aplicada con rigor**: T0.2 verifica
  empíricamente as 4 localizacións + cero chamadas previas a
  hookRunner.run*.
- **🎯 FASE 8 PRACTICAMENTE COMPLETA**: 4 sub-fases pendentes
  (8.5-8.8: plugins oficiais, search, validators, read-only mode).
```

Commit Conventional:
`feat(core): integrate plugin hooks in TreeEngine unlock/lock/respec/canUnlock (sub-phase 8.4.c)`

Push directo a `origin/main` (base `7adb1a2`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.4.c — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 7adb1a2)
✅ TreeEngine.unlock MODIFICADO cirúrxicamente:
   - runBeforeUnlock + cancelación con PL007
   - runAfterUnlock tras éxito
✅ TreeEngine.lock MODIFICADO cirúrxicamente (análogo)
✅ TreeEngine.respec MODIFICADO cirúrxicamente:
   - runBeforeRespec con nodeIdsToLock final
   - runAfterRespec
   - Cero hooks se length === 0
✅ TreeEngine.canUnlock MODIFICADO:
   - runComputeUnlockability só ao return final
   - Early returns inchanged
✅ HookContext construído inline: { locale, timestamp, metadata: {} }
✅ 1 ErrorCode novo: YGG_PL007 OPERATION_CANCELLED_BY_HOOK
✅ Mensaxe localizada gl/es/en con {operation} placeholder
✅ T0.2 verificación empírica (lección 8.3 L1):
   - 4 métodos localizados: unlock, lock, respec, canUnlock
   - hookRunner.run* cero chamadas previas (libre)
   - HookContext re-exportado desde types/index.ts
   - 303 chamadas en tests existentes confirmadas
✅ T4 verificación CRÍTICA: 1655 tests previos pasan inchanged
   - 222 engine.unlock() tests: OK
   - 22 engine.lock() tests: OK
   - 29 engine.respec() tests: OK
   - 30 engine.canUnlock() tests: OK
   - Outros tests: OK
✅ CERO modificación de HookRunner/PluginManager/PluginAPI
   (intactos desde sub-fases anteriores)
✅ CERO modificación de calquera test existente
✅ CERO modificación de types/plugin.ts (xa tipado)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ CERO computeCost (DIFERIDO)
✅ Tests: 1655 + ~18 = ~1673 core tests
   - 4 backward-compat (unlock/lock/respec/canUnlock sen hooks)
   - 3 beforeUnlock (true, false=cancela, async)
   - 2 afterUnlock (chamado/non chamado)
   - 1 lock cancela
   - 2 respec (cancela, nodeIdsToLock final)
   - 3 computeUnlockability (modifica, inchanged, early return skip)
   - 2 HookContext (recibido, reutilizado)
   - 1 respec length=0 (cero hooks)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - TreeEngine.ts: baseline mantida ou superada
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.4.c ÚLTIMA das 3 sub-sub-fases de 8.4.
   - 🎯 PLUGINS SON AGORA FUNCIONAIS END-TO-END.
   - 44 sub-fases consecutivas sen rollback.
   - 4 sub-fases pendentes (8.5-8.8: plugins oficiais, search,
     validators, read-only mode).
   - computeCost DIFERIDO; cero use case inmediato.
   - actor no HookContext DIFERIDO.
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 6 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.5 (plugins oficiais: History, Debug).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.4.c. **ÚLTIMA das 3 sub-sub-fases de 8.4**.
Integra hooks en TreeEngine.unlock/lock/respec/canUnlock — os 4
métodos máis usados do engine (303 tests dependentes). Modificación
cirúrxica con garantía dura backward-compat: cero hooks rexistrados
→ comportamento idéntico ao actual. 6 ficheiros tocados (2 NOVOS
+ 4 MODIFICADOS), ~18 tests novos, 1 ErrorCode novo PL007. Risco
ALTO mitigado por T4 verificación crítica dos 1655 tests previos.
Lección 8.3 L1 aplicada con rigor en T0.2.*

*Decisións críticas documentadas:
- runBefore* despois da validación, antes da mutación.
- runAfter* tras éxito completo; cero chamado se cancelado ou erro.
- runComputeUnlockability só ao return final de canUnlock.
- Cancelación = cero efectos colaterais.
- Early return length=0 en respec → cero hooks.
- computeCost DIFERIDO.
- actor no HookContext DIFERIDO.*

*🎯 Tras 8.4.c, **PLUGINS SON FUNCIONAIS END-TO-END**:
- registerPlugin chama install() con engineHandle + PluginAPI real.
- Plugins poden rexistrar hooks.
- Hooks chamados en unlock/lock/respec (before: cancela; after:
  notifica) + canUnlock (compute: modifica).*
