# BRIEFING — SUB-FASE 1.13 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo (Sonnet 4.6).
> É autosuficiente. NON preguntes "X ou Y?": todo está decidido aquí.
> Se algo non está no briefing, decídelo ti e segues; NON consultas.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE — LER PRIMEIRO)

Violar calquera punto desta sección é motivo de rexeite do entregable.

**0.1 — Scripts auxiliares.** Os scripts Python créanse SEMPRE en
`/tmp/ygg-exec/` (`mkdir -p /tmp/ygg-exec`). NUNCA na raíz do proxecto.
Dentro dos scripts, as rutas ao repo en estilo **`C:/Users/tajes/proxectos/yggdrasil-forge/...`**
(Python en Windows NON acepta `/c/Users/...` de Git Bash). Un script por
operación, con `assert` que comprobe o estado esperado ANTES de modificar.

**0.2 — .gitignore.** Xa ten o bloque defensivo (commit `697e9ce`). Confirma
que segue e NON o toques. Se por algún motivo non está, engádeo (ver Anexo A.7
do MASTER) como microcommit propio antes de empezar.

**0.3 — Verificación de tests SEMPRE con --force.**
```
pnpm turbo run test --filter=@yggdrasil-forge/core --force
```
NUNCA `pnpm test` a secas para validar cambios (turbo cachea por hash).

**0.4 — Decisións do director (non se consultan).** Rama: `main` (commit
directo). Creación de ficheiros: `python3` + `encoding='utf-8'`, nunca
heredoc. Edición parcial: `str_replace`. Orde dos pasos: T0→T8, sen cambios.

**0.5 — ANTI-PLACEHOLDER (artefacto verificable obrigatorio).**
Detectouse un patrón en 3 sub-fases: meter valores falsos (`'unknown'`,
`'valor-invalido'`, `TODO`, `any` "temporal", ramas mortas) para pasar
checks sen reportalo. **Acabouse.** ANTES do commit final executas:

```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```

e **pegas o resultado completo no reporte final**, xustificando cada
coincidencia (por que é lexítima) ou confirmando "limpo, 0 coincidencias".
Se metes un placeholder e non aparece nese grep porque usaches outra
palabra, é falta grave igual. A regra real é: **non hai valores de recheo;
ou o fas ben, ou o reportas como débeda explícita con ficheiro:liña.**

---

## 1. IDENTIFICACIÓN

Briefing para a **sub-fase 1.13** de Yggdrasil Forge.
Tipo: **feature nova** (primeiras mutacións do motor) **+ pago de DT-7**.

---

## 2. CONTEXTO MÍNIMO

Motor de skill trees, monorepo pnpm 11.0.9 + turbo, TypeScript strict.
`@yggdrasil-forge/core` ten os `types/` completos e o engine con: StateStore,
ResourceManager, UnlockResolver, DependencyGraph, CycleDetector,
ChangeTracker, EventEmitter, ConcurrencyGuard, e **TreeEngine** (creado en
1.12, só constructor + getters síncronos, SEN mutacións).
Esta sub-fase engade as **primeiras mutacións** a TreeEngine: `unlock`,
`lock`, `respec`. `applyChanges` é a 1.14 (NON aquí).

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `7d9458c`.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` →
  **337 tests pasan** en core (16 ficheiros). Número exacto previo.
- Lint 0/0, typecheck 20/20.
- `TreeEngine` ten constructor + 10 getters. SEN `unlock/lock/respec`.
- DT-7 aberta (ver T1).

API interna dispoñible (verificada no repo):
- `StateStore`:
  - `getState(): TreeState`
  - `getTreeDef(): TreeDef`
  - `update(producer: (draft: Draft<TreeState>) => void): void`  ← vía de
    mutación do estado (Immer). Notifica subscriptores automaticamente.
  - `invalidate(types)`, `getSnapshot()`, `subscribe(listener)`.
- `ResourceManager`:
  - `new ResourceManager(resources)`
  - `canAfford(costs, budget): boolean`
  - `applyCost(costs, budget): Result<Budget>`  (inmutable; devolve novo Budget)
  - `refund(costs, budget): Budget`  (devolve Budget directo, NON Result)
  - `getCostForTier(nodeDef, tier): readonly Cost[]`
  - `getTotalCost(nodeDef, fromTier, toTier): readonly Cost[]`
- `UnlockResolver`:
  - `new UnlockResolver()` (stateless)
  - `evaluate(rule, ctx): boolean`  (síncrono)
  - `explain(rule, ctx): UnlockExplanation`
  - `UnlockResolverContext` (export desde `./UnlockResolver.js`): leva
    `treeDef`, `state`, opcional `dependencyGraph`, `customEvaluators`, `locale`.
- Tipos: `UnlockCheck` (`{ allowed: boolean, reason?: LocalizedString }`)
  XA existe en `types/unlock.ts`. `NodeState` =
  `'locked'|'unlockable'|'in_progress'|'unlocked'|'maxed'|'disabled'|'expired'`.
  `NodeInstance` ten `state`, `currentTier`, `progress?`, `unlockedAt?`,
  `unlockedBy?`, `history?`.
- **NON existen** `UnlockResult`, `LockResult`, `RespecResult`: hai que
  definilos (T2).

Entorno: Windows + Git Bash. Repo:
`C:\Users\tajes\proxectos\yggdrasil-forge`.

---

## 4. OBXECTIVO (unha frase)

Engadir a `TreeEngine` as operacións de mutación `unlock`, `lock` e `respec`
(async, `Promise<Result<...>>`), coa súa validación, custo, cambio de estado
e eventos; e pagar a débeda DT-7 do ResourceManager.

---

## 5. DECISIÓNS XA TOMADAS (non discutibles)

1. **Async-first nos writes** (sección 5.3 do MASTER). `unlock`, `lock`,
   `respec` devolven `Promise<Result<...>>`. Aínda que internamente sexan
   síncronas agora, a firma é async desde xa (flexibilidade futura sen custo).
2. **`Result`, nunca throw**, nas mutacións (sección 44). Só o constructor
   lanza. Estas devolven `err(new YggdrasilError(...))`.
3. **`canUnlock(nodeId): Result<UnlockCheck>` síncrono** (lectura pura,
   sección 5.3 / 10). Reutilízao `unlock` internamente.
4. **Mutación SÓ vía `StateStore.update()`**. NUNCA mutar
   `store.getState()` directamente (anti-patrón sección 4.2; rompe Immer).
5. **Custos vía `ResourceManager`**. `unlock` aplica custo con `applyCost`;
   se falla, NON cambia estado (atómico). `respec` devolve recursos con
   `refund`.
6. **Locale**: usa `this.locale` (xa gardada en 1.12) para as mensaxes de
   erro localizadas (`getErrorMessage`) e para o `UnlockResolverContext`.
7. **readOnly**: se `this.readOnly === true`, as tres mutacións devolven
   `err(new YggdrasilError(ErrorCode.READ_ONLY_VIOLATION, ...))` localizado,
   sen tocar estado.
8. **Eventos**: emítense tras a mutación exitosa. Como en 1.12 NON se cableou
   EventEmitter (corrixiuse o erro de planificación do director), **aquí SI
   se engade** ao constructor de TreeEngine un `EventEmitter` privado, porque
   AGORA xa ten consumidor real. Eventos a emitir (ver `EventMap` en
   `types/events.ts`, respecta as firmas exactas de alí):
   - `unlock(nodeId, instance)` tras unlock OK
   - `lock(nodeId, instance)` tras lock OK
   - `respec(nodeIds)` tras respec OK
   - `stateChange(nodeId, change)` en cada cambio de estado
   - `budgetChange(resourceId, old, new)` cando cambia o budget
   Se algún destes eventos require datos que aínda non existen
   (StateChange completo, etc.), NON inventes campos: emite o mínimo
   coherente e anótao no reporte como simplificación consciente (NON
   placeholder silencioso).
9. **respec scope**: `respec(nodeId?)`. Con `nodeId` → respec dese nodo
   (e dependentes que queden inválidos: ver T5). Sen argumento → respec
   total (todos os nodos desbloqueados volven a `locked`, budget restaurado).
   Para 1.13 a regra de refund é: devólvese o custo pagado segundo
   `ResourceManager.refund` (que xa respecta `refundable`/`refundPercent`).
10. **NON implementar**: `unlockMany`/`lockMany` (bulk, fase posterior),
    `setProgress` (fase 2 progress), efectos (`EffectsRunner`, fase 2),
    time constraints (fase 2), subtrees. Se un nodo ten `effects` ou
    `timeConstraints`, **ignóranse nesta sub-fase** e anótase no reporte
    como limitación coñecida (NON erro).

---

## 6. TAREFAS (orde estrita)

### T0 — Confirmar setup
Verifica `.gitignore` (0.2) e `/tmp/ygg-exec/`. Sen commit se xa está.

### T1 — Pagar DT-7: eliminar rama morta de applyCost

Ficheiro: `packages/core/src/engine/ResourceManager.ts`.
O bloque `if (required === null) { ... 'valor-invalido' ... }` (≈liñas
47-53) é **código morto inalcanzable**: `aggregateCosts()` só devolve `null`
cando hai `cost.amount < 0`, pero ese caso xa retorna antes no bloque
`negativeCost` (≈liña 35). Polo tanto:
- Elimina o bloque `if (required === null)` enteiro de `applyCost`.
- Simplifica `aggregateCosts` para que **non devolva `null` nunca** (xa que o
  caso negativo se trata antes en `applyCost`): que devolva sempre
  `Map<string, number>`. Axusta o tipo de retorno e os usos.
- Verifica que ningún outro chamador de `aggregateCosts` dependía do `null`
  (busca con grep; só `applyCost` e `canAfford` o usan — revísaos).
- Cero placeholders no resultado.

**Feito cando:** `grep -n "valor-invalido\|=== null" ResourceManager.ts`
non mostra a rama morta; `aggregateCosts` non ten `: ... | null`;
tests do core seguen pasando con `--force`.

### T2 — Definir tipos de resultado

Ficheiro: `packages/core/src/types/unlock.ts` (ou crea o que corresponda;
mira onde está `UnlockCheck` e ponos preto). Define e exporta:

```ts
export interface UnlockResult {
  readonly nodeId: string
  readonly newState: NodeState
  readonly tier: number
  readonly spent: readonly Cost[]
}

export interface LockResult {
  readonly nodeId: string
  readonly newState: NodeState
  readonly refunded: readonly Cost[]
}

export interface RespecResult {
  readonly nodeIds: readonly string[]
  readonly refunded: readonly Cost[]
}
```
Exporta desde `types/index.ts` na zona de unlock. Importa `NodeState`,
`Cost` segundo correspondan (xa existen).

**Feito cando:** typecheck 20/20; os 3 tipos importables desde
`@yggdrasil-forge/core`.

### T3 — TreeEngine: cablear EventEmitter + canUnlock

En `TreeEngine.ts`:
- Engade ao constructor: `private readonly events = new EventEmitter()` (ou
  o nome/import correcto segundo `./EventEmitter.js`). E
  `private readonly resources: ResourceManager` =
  `new ResourceManager(treeDef.resources ?? [])`. E
  `private readonly resolver = new UnlockResolver()`.
  (Estes XA teñen consumidor agora; é correcto instancialos.)
- Engade `on`/`off` públicos delegando en `EventEmitter` (firmas segundo
  `EventMap` de `types/events.ts`).
- Implementa `canUnlock(nodeId: string): Result<UnlockCheck>`:
  - nodo non existe → `err(YggdrasilError NODE_NOT_FOUND)` localizado.
  - nodo xa unlocked → `ok({ allowed: false, reason: ... })` (ou err
    `NODE_ALREADY_UNLOCKED` — usa `ok` con allowed:false + reason; reserva
    err para "non se puido avaliar"). Decide ti e sé consistente; documéntao
    cun comentario.
  - avalía `prerequisites` co `UnlockResolver` (constrúe
    `UnlockResolverContext` con treeDef, state, locale). Sen prerequisites
    → allowed (se o resto pasa).
  - comproba `exclusions` (se algún nodo excluído está unlocked → non
    allowed, reason localizada).
  - comproba custo con `ResourceManager.canAfford`.
  - devolve `ok({ allowed, reason? })`.

**Feito cando:** typecheck 20/20; `canUnlock` cubre os casos de arriba.

### T4 — TreeEngine: unlock + lock (async)

`async unlock(nodeId: string): Promise<Result<UnlockResult>>`:
- Se `readOnly` → err READ_ONLY_VIOLATION.
- Chama `canUnlock`. Se `!result.ok` → propaga o err. Se
  `result.value.allowed === false` → err co código adecuado
  (PREREQUISITES_NOT_MET / EXCLUSION_VIOLATION / INSUFFICIENT_RESOURCES /
  NODE_ALREADY_UNLOCKED segundo a causa; a causa derívase da comprobación).
- Calcula custo (`getCostForTier`/`getTotalCost` segundo tier; para 1.13,
  tier 0→1 simple; multi-tier mínimo coherente).
- `applyCost` sobre o budget actual; se err → propaga, NON cambies estado.
- `StateStore.update(draft => { ... })`: pon o nodo en `'unlocked'`
  (ou `'maxed'` se chega a maxTier), `currentTier += 1`, `unlockedAt`,
  actualiza `budget` co Budget devolto por `applyCost`.
- Emite `budgetChange` (por recurso afectado), `stateChange`, `unlock`.
- Devolve `ok({ nodeId, newState, tier, spent })`.

`async lock(nodeId: string): Promise<Result<LockResult>>`:
- Se `readOnly` → err.
- nodo non existe → err NODE_NOT_FOUND.
- nodo non está unlocked → err (estado inválido para lock; usa o código máis
  apropiado, ex. unha validación E0xx; se non hai un exacto, usa
  `INVALID_NODE_DEF`? NON — mellor reusa lóxica: devolve err cun
  YggdrasilError de engine adecuado e reason localizada. Decide e documenta).
- refund co `ResourceManager.refund`.
- `StateStore.update`: nodo → `'locked'`, `currentTier = 0`, limpa
  `unlockedAt`. Actualiza budget.
- ⚠️ Se outros nodos desbloqueados dependían deste, en 1.13 **NON fagas
  cascada** (iso é parte de respec/applyChanges). Anótao como limitación.
- Emite eventos. Devolve `ok({ nodeId, newState, refunded })`.

**Feito cando:** typecheck 20/20; tests de T7 pasan.

### T5 — TreeEngine: respec (async)

`async respec(nodeId?: string): Promise<Result<RespecResult>>`:
- Se `readOnly` → err.
- Sen `nodeId`: todos os nodos en estado `'unlocked'`/`'maxed'` → `'locked'`,
  budget restaurado (refund acumulado de todos). Emite `respec(nodeIds)`.
- Con `nodeId`: lock dese nodo + lock en cascada dos dependentes que
  quedarían cos prerequisites incumpridos (usa `UnlockResolver` para
  detectar cales). Refund acumulado.
- Unha soa `StateStore.update` para todo o respec (atómico).
- Devolve `ok({ nodeIds, refunded })`.

**Feito cando:** typecheck 20/20; tests de T7 pasan.

### T6 — Exports
Confirma que `TreeEngine` segue exportado e que os novos tipos
(`UnlockResult`/`LockResult`/`RespecResult`) saen por `@yggdrasil-forge/core`.

### T7 — Tests

Ficheiro: `packages/core/__tests__/engine/TreeEngine.test.ts` (amplía o
existente) ou crea `TreeEngine.mutations.test.ts`. Cobre como mínimo:
- `canUnlock`: nodo inexistente, sen prerequisites, con prerequisites
  cumpridos/non, con exclusión activa, sen recursos.
- `unlock`: OK feliz (estado + budget + tier correctos); falla por
  prerequisites; falla por recursos (verifica que budget NON cambiou —
  atomicidade); falla por readOnly; xa desbloqueado.
- `unlock` emite eventos `unlock`/`stateChange`/`budgetChange` (subscríbete
  e verifica).
- `lock`: OK (estado volve, refund correcto segundo refundable/percent);
  falla en nodo non desbloqueado; readOnly.
- `respec()` total: todo volve a locked, budget restaurado.
- `respec(nodeId)`: cascada de dependentes inválidos.
- Verifica `.code` exacto en TODOS os err (lección recorrente: nunca só
  `.ok===false`).
Mínimo razoable: ~25 tests novos (o número real é o que dea a cobertura
honesta dos casos; NON o axustes artificialmente; reporta o número exacto).

### T8 — Cobertura + verificación + grep anti-placeholder + commit
- Primeiro confirma se existe coverage no core:
  `pnpm --filter @yggdrasil-forge/core run test:coverage` (ou revisa
  `packages/core/package.json` scripts). Se non existe o script, NON o
  inventes; reporta que segue sen poder medirse (débeda de verificación,
  herdada). Se existe, comproba ≥90% no core; se baixa, engade tests.
- Verificación final (orde exacta):
```
pnpm lint:fix
pnpm format
pnpm lint
pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
- O resultado do `grep` vai LITERAL no reporte (sección 0.5).
- Changeset **minor** (core).
- CHANGELOG baixo `## [Unreleased]`: Added unlock/lock/respec + tipos de
  resultado; Fixed DT-7.
- Commits separados: (1) `fix(core): remove dead branch in applyCost (DT-7)`
  (2) `feat(core): add TreeEngine unlock/lock/respec mutations`
  (3) changeset+CHANGELOG.
- Push a `origin/main` tras avisar ao autor de que verifique (revisor
  secundario ChatGPT; tómao en serio).

---

## 7. CONVENCIÓNS
Comentarios en **castelán**, marcadores `// ── INICIO/FIN ──` (imita os
ficheiros existentes). 2 espazos, comilla simple, sen `;`, trailing commas,
máx 100 cols, UTF-8 LF. TypeScript strict, **cero `any`** (nin "temporal").
Imports Node core con `node:`. NON desactives regras de Biome.

---

## 8. QUE ENTREGAR
- `ResourceManager.ts` (DT-7 resolto, sen rama morta).
- `types/unlock.ts` + `types/index.ts` (3 tipos novos).
- `TreeEngine.ts` (EventEmitter/ResourceManager/UnlockResolver cableados +
  canUnlock + unlock + lock + respec + on/off).
- `engine/index.ts` (exports).
- Tests (ampliados/novos).
- changeset + CHANGELOG.
- Commits en `origin/main`.
Pega no reporte: saídas de `pnpm lint`, `pnpm typecheck`, test core con
`--force`, e o `grep` anti-placeholder LITERAL.

---

## 9. QUE NON FACER
- ❌ `applyChanges` (é 1.14), `unlockMany`/`lockMany`, `setProgress`,
  efectos, time constraints, subtrees.
- ❌ Validador Zod (é 1.17).
- ❌ Placeholders / `any` / ramas mortas / valores de recheo (sección 0.5).
- ❌ Mutar `store.getState()` directamente (usa `store.update`).
- ❌ Tocar common, UnlockResolver internos, StateStore internos.
- ❌ Mergear nin tocar o PR de release (#1). Ver Anexo A.4 do MASTER.
- ❌ Engadir dependencias / tocar lockfile.
- ❌ Deixar scripts `.py` no repo.

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.13 — COMPLETADA
═══════════════════════════════════════
✅ DT-7 resolto: rama morta de applyCost eliminada, aggregateCosts simplificado
✅ Tipos: UnlockResult / LockResult / RespecResult definidos e exportados
✅ TreeEngine: EventEmitter/ResourceManager/UnlockResolver cableados
✅ canUnlock + unlock + lock + respec (async, Result, eventos)
✅ Tests: <N> pasan en core (<delta> novos) — verificado con --force
✅ Cobertura core: <X%, ou "script inexistente — débeda herdada">
✅ Typecheck: 20/20
✅ Lint: 0 warnings, 0 errors
✅ GREP ANTI-PLACEHOLDER (literal):
   <pega aquí a saída completa do grep, ou "0 coincidencias">
✅ Changeset minor (core)
✅ CHANGELOG actualizado
✅ Commits: <hashes> — en origin/main
⚠️ Limitacións coñecidas / decisións forzadas / débeda nova:
   <efectos e timeConstraints ignorados (esperado); calquera outra cousa
   con ficheiro:liña; ou "ningunha">
📋 Confirmado: scripts /tmp/ygg-exec con rutas C:/, sen heredoc, --force
LISTO PARA PROCEDER Á SUB-FASE 1.14 (TreeEngine: applyChanges)
```

---

*Fin do briefing 1.13. Dúbidas estruturais → ao director, NON improvisar.*
