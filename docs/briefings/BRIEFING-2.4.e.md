# BRIEFING — SUB-FASE 2.4.e de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión non resolta → sección 0.6 (ESCALAR).
> **Sub-fase cirúrxica.** Pecha a asimetría 2.4.d: EffectsRunner e
> StatComputer pasan a consultar ProgressManager para `progress_min`
> condicións. Require reordering trivial do constructor.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/` (`mkdir -p`). NUNCA na raíz. Rutas
internas `C:/Users/tajes/proxectos/yggdrasil-forge/...` (NON `/c/Users/...`).
Un script por operación, `assert` antes de modificar.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**:
`pnpm turbo run test --filter=@yggdrasil-forge/core --force`.

**0.4 — Decisións do director non se consultan:** rama `main`; ficheiros
`python3`+`utf-8`, nunca heredoc; edición parcial `str_replace`; orde
T0→T6 estrita.

**0.5 — ANTI-PLACEHOLDER**:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
LITERAL no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA, `🛑 DECISIÓN REQUERIDA
DO ARQUITECTO`. **Toda a decisión arquitectónica está pre-resolta
(sec 5).**

**0.7 — ENTREGA E TÍTULO DE REPORTE**:
- Pushed: `═══ SUB-FASE 2.4.e — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.4.e — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` ANTES de teorizar
sobre fallos.

**0.9 — CHANGELOG (DT-12, A.6 L4)**: nova cabeceira `## [Unreleased]`
ao principio; NON consolidar.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.4.e** de Yggdrasil Forge. **Décimo primeira sub-fase de
Fase 2.** Tipo: **integración pequena cirúrxica** — pecha a asimetría
documentada explicitamente en 2.4.d: `progress_min` condicións sobre
nodos computed agora funcionan en TODOS os puntos onde se constrúe
`UnlockResolverContext`, non só en TreeEngine.

---

## 2. CONTEXTO MÍNIMO

Tras 2.4.d, `UnlockResolverContext` admite un campo opcional
`progressManager?: ProgressManagerLike`. **TreeEngine xa o pasa** nos
seus 2 contexts. **EffectsRunner e StatComputer non**: a 2.4.d decidiu
diferir esa parte a esta sub-fase 2.4.e (decisión Opción C do
director).

Hoxe, un effect `conditional` con condición `progress_min(nodoComputed,
50)` avalíao como falso aínda que o nodo computed teña progress 80.
Igualmente para stats con conditional rules. **Esta sub-fase arranxa
isto.**

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `c918324`.
- 852 tests pasan en core (42 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **2.4.d xa engadiu**: `ProgressManagerLike` interface, campo
  opcional en `UnlockResolverContext`, fallback legacy en
  `UnlockResolver.getProgress`. Todo iso **xa está** e **funciona
  sen tocalo nesta sub-fase**.
- **`EffectContext`** (en `EffectsRunner.ts`): ten `engine, store,
  resources, resolver, events, locale`. **Non ten `progressManager`**.
- **`StatComputerContext`** (en `StatComputer.ts`): ten `treeDef,
  store, resolver, locale`. **Non ten `progressManager`** nin
  `engine`.
- **Orde actual de construción no constructor de `TreeEngine.ts`**:
  ```
  :115  effectsRunner = new EffectsRunner(...)
  :129  statComputer  = new StatComputer(...)
  :141  timeManager   = new TimeManager(...)
  :152  progressManager = new ProgressManager(...)
  ```
  Isto **debe cambiar** (sec 5.3): ProgressManager primeiro, despois
  todos os demais.
- **Test de asimetría coñecida fixado en 2.4.d** está en
  `TreeEngine.progress.test.ts:464+` (describe "asimetría coñecida
  2.4.d: EffectsRunner non ve computed (asignada a 2.4.e)"). **Este
  test DEBE actualizarse** nesta sub-fase para reflectir que a
  asimetría está resolta. Ver T5.3.
- DT-9, DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir `progressManager?: ProgressManagerLike` (opcional) a
`EffectContext` e a `StatComputerContext`, reordear o constructor de
`TreeEngine` para que `ProgressManager` se construa **antes** de
`EffectsRunner` e `StatComputer`, e modificar as dúas construcións
internas de `UnlockResolverContext` (EffectsRunner:571 e
StatComputer:198) para que pasen `progressManager` desde o seu
contexto.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Solución paralela á 2.4.d

Mesma estratexia: **engadir campo opcional `progressManager?:
ProgressManagerLike`** aos contexts dos consumidores
(`EffectContext`, `StatComputerContext`). Structural typing →
**cero modificación de `ProgressManager.ts`**.

Importacións: `ProgressManagerLike` xa está **exportada** desde
`UnlockResolver.ts` (verifícao en T0). Os contexts importana desde
alí.

### 5.2 — Cero acceso vía `engine.progressManager`

**NON usar** `this.context.engine.progressManager` no `EffectsRunner`
(aínda que `engine` está no EffectContext). Razóns:
- StatComputer non ten `engine` no seu context (asimetría).
- `progressManager` é `private` en TreeEngine; expoñelo rompe
  encapsulamento.
- A coherencia coa solución 2.4.d (campo explícito no context) é máis
  predicible.

**Pasarase explícitamente** como campo do context.

### 5.3 — Reordering trivial do constructor de TreeEngine

Necesario porque os contexts requírense **na construción** das pezas,
non lazy. Hoxe:
```
:111-113  store, resources, audit
:115      effectsRunner    ← ProgressManager aínda non existe
:129      statComputer     ← ProgressManager aínda non existe
:141      timeManager
:152      progressManager
```

Tras esta sub-fase:
```
:111-113  store, resources, audit
:???      progressManager  ← MOVER AQUÍ (xusto despois de audit)
:???      effectsRunner    ← agora pode recibir progressManager
:???      statComputer     ← agora pode recibir progressManager
:???      timeManager      ← sen cambio funcional
```

**Verificación previa (T0.3)**: `ProgressManagerContext` é `{ treeDef,
store, events, audit, locale }`. **Ningún destes campos depende de
effectsRunner/statComputer/timeManager**. Polo tanto, reordering é
**trivial e seguro**.

`this.events` e `this.resolver` están inicializados como **inline
field initializers** (liñas 66, 68 — xa ven asignados antes do corpo
do constructor); cero dependencia inversa.

**Importante**: manter os comentarios `// ── INICIO/FIN ──`
existentes nos seus respectivos bloques. Ao mover ProgressManager,
levas tamén o seu comentario "2.4.b — instanciación do ProgressManager".

### 5.4 — Modificacións nos consumidores

**`EffectContext`** (en `EffectsRunner.ts`):
```ts
export interface EffectContext {
  readonly engine: TreeEngine
  readonly store: StateStore
  readonly resources: ResourceManager
  readonly resolver: UnlockResolver
  readonly events: EventEmitter
  readonly locale: Locale
  /**
   * ProgressManager opcional (engadido en 2.4.e). Se presente,
   * propagase a `UnlockResolverContext` cando se constrúe en
   * `applyConditional` para que `progress_min` condicións consulten
   * valores computed correctamente.
   */
  readonly progressManager?: ProgressManagerLike
}
```

**`StatComputerContext`** (en `StatComputer.ts`):
```ts
export interface StatComputerContext {
  readonly treeDef: TreeDef
  readonly store: StateStore
  readonly resolver: UnlockResolver
  readonly locale: Locale
  /**
   * ProgressManager opcional (engadido en 2.4.e). Se presente,
   * propagase a `UnlockResolverContext` cando se constrúe para
   * cálculo de stats con conditional contributions.
   */
  readonly progressManager?: ProgressManagerLike
}
```

### 5.5 — Propagación nos sitios de uso

**`EffectsRunner.ts:571` (applyConditional)**: modificar a construción
do `UnlockResolverContext` para incluír `progressManager`:

```ts
// Antes:
const ctx: UnlockResolverContext = {
  treeDef: engine.getTreeDef(),
  state: store.getState(),
  locale,
}

// Despois:
const ctx: UnlockResolverContext = {
  treeDef: engine.getTreeDef(),
  state: store.getState(),
  locale,
  progressManager: this.context.progressManager,
}
```

**`StatComputer.ts:198`**: idéntico patrón. Modificar a construción do
`resolverCtx` para incluír `progressManager: this.context.progressManager`.

### 5.6 — TreeEngine pasa progressManager nas dúas instanciaciones

Tras reordering (5.3), no constructor:

- `new EffectsRunner({ ..., progressManager: this.progressManager })`.
- `new StatComputer({ ..., progressManager: this.progressManager })`.

### 5.7 — Fallback legacy mantido (igual ca 2.4.d)

`ProgressManagerLike` segue sendo opcional. Se algún consumidor de
EffectsRunner ou StatComputer constrúe o context **sen**
`progressManager` (tests illados, mocks), funciona igual ca antes:
`UnlockResolver.getProgress` cae no fallback legacy (`state.nodes[nodeId]?.progress ?? 0`).
Cero regresión.

### 5.8 — Cero cambios en common, cero ErrorCodes, cero types

Esta sub-fase pecha asimetría con cambio de **2 contexts** + **2
sitios de uso** + **2 instanciaciones** + **reordering do constructor**.
Cero novidades en common ou tipos.

### 5.9 — Test da asimetría coñecida 2.4.d: ACTUALIZAR

O test en `TreeEngine.progress.test.ts:464+` (`describe('asimetría
coñecida 2.4.d: EffectsRunner non ve computed (asignada a 2.4.e)')`)
**fixaba o contrato intermedio**. Agora que 2.4.e o pecha:

- **Manter o test, pero ACTUALIZAR a aserción**: o effect `conditional`
  con `progress_min(nodoComputed, 50)` cando o computed deriva 80
  agora **avalíase como TRUE** (a rama `then` execútase, non a `else`).
- **Renomear o describe** a algo como `'asimetría 2.4.d pechada en
  2.4.e: EffectsRunner consulta computed correctamente'`.
- **Engadir tamén** un test análogo para StatComputer: un stat con
  conditional contribution que use `progress_min(nodoComputed, ...)`
  → contribución aplicada correctamente.

Este patrón "test de asimetría intermedia que se actualiza ao
pechala" é exactamente o que 2.4.d L2 (lección director) prescribiu.
**Funciona**.

### 5.10 — Cero modificación de UnlockResolver.ts

UnlockResolver xa fixo o seu cambio en 2.4.d. **Cero edicións nesta
sub-fase**.

### 5.11 — Eventos / audit

Cero cambios. As consultas son lecturas; non emiten eventos nin audit.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións en:
- `packages/core/src/engine/EffectsRunner.ts` — `EffectContext`
  (+1 campo), `applyConditional` (+1 campo no resolverCtx).
- `packages/core/src/engine/StatComputer.ts` — `StatComputerContext`
  (+1 campo), `computeStatDef` (+1 campo no resolverCtx).
- `packages/core/src/engine/TreeEngine.ts` — **reordering** +
  `progressManager: this.progressManager` nas instanciaciones de
  EffectsRunner e StatComputer.

Tests:
- `packages/core/__tests__/engine/TreeEngine.progress.test.ts` —
  ACTUALIZAR o test "asimetría coñecida 2.4.d" (renomear + cambiar
  asercións). Engadir caso StatComputer paralelo.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións previas
1. `pnpm install`. Confirma 852 tests `--force`.
2. **Verifica** que `ProgressManagerLike` está exportada desde
   `UnlockResolver.ts`: `grep -n "export.*ProgressManagerLike"
   packages/core/src/engine/UnlockResolver.ts`. Reporta no chat.
3. **Verifica** as dependencias de ProgressManager para o reordering
   (5.3): `grep -B1 -A8 "interface ProgressManagerContext"
   packages/core/src/engine/ProgressManager.ts`. Debe ser
   `{ treeDef, store, events, audit, locale }` — todos dispoñibles
   en `:113` do constructor.
4. **Verifica que `applyChanges` no TreeEngine.ts:1100 segue pasando
   progressManager** (de 2.4.d): `grep -n "progressManager:
   this.progressManager" packages/core/src/engine/TreeEngine.ts`.
   Debe seguir aparecendo nas 2 liñas existentes (546, 1100) + as 2
   novas (instanciaciones de effectsRunner e statComputer). Total
   esperado tras esta sub-fase: 4 ocorrencias.

### T1 — Modificar EffectContext e StatComputerContext (5.4)
- Engadir o campo opcional aos dous interfaces.
- Importar `ProgressManagerLike` desde `./UnlockResolver.js` en cada
  ficheiro (verifica que UnlockResolver xa exporta o tipo).
- JSDoc en ambos según 5.4.

Typecheck 20/20.

### T2 — Reordering do constructor de TreeEngine (5.3)
**Cirúrxico**. Mover o bloque `// ── INICIO: 2.4.b —
instanciación do ProgressManager ──...── FIN: 2.4.b ──` (liñas
~146-158) para situalo **inmediatamente despois** de `this.audit =
new AuditLogger(...)` (~liña 113) e **antes** do bloque
`// ── INICIO: 2.1.b — instanciación do EffectsRunner ──` (~liña 114).

Conserva os comentarios INICIO/FIN intactos.

Tras o movemento, modifica as instanciaciones de **EffectsRunner**
e **StatComputer** para incluír:
```ts
progressManager: this.progressManager,
```

### T3 — Propagación nos sitios de uso (5.5)
- En `EffectsRunner.ts:571` (`applyConditional`): engadir
  `progressManager: this.context.progressManager` ao
  `UnlockResolverContext`.
- En `StatComputer.ts:198` (cálculo de stat): engadir
  `progressManager: this.context.progressManager` ao `resolverCtx`.

### T4 — Verificación post-T2/T3
- Typecheck 20/20.
- Tests todos pasando aínda **agás** o test de asimetría coñecida
  (que vai romper porque o effect `conditional` agora ve computed
  correctamente).
- Se algún OUTRO test rompe, **escala (0.6)** — pode ser un caso
  non considerado.

### T5 — Actualizar tests (5.9)
1. **Renomear o `describe` da asimetría 2.4.d** a:
   `'asimetría 2.4.d pechada en 2.4.e: EffectsRunner consulta computed correctamente'`.
2. **Actualizar asercións**: o effect `conditional` con
   `progress_min(computed, 50)` cando computed=80 agora vai á rama
   `then` (non `else`).
3. **Engadir un caso análogo para StatComputer**: un stat con
   `contributions: [{ ..., conditions: [{ type: 'progress_min',
   nodeId: 'computedNode', percent: 50 }] }]`. Cando o computed
   deriva 80, a contribución aplícase; cando deriva 30, non.
4. **Cero regresión** doutros tests.

### T6 — Verificación final + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
LITERAL. LITERAL.

- Changeset **minor** — só core.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  - Changed: `EffectContext` e `StatComputerContext` agora aceptan
    `progressManager?: ProgressManagerLike` (opcional). Cando se
    inxecta, `progress_min` condicións dentro de effects
    `conditional` e stats con conditional contributions consultan
    o ProgressManager (soportando nodos computed).
  - Changed: `TreeEngine` reordeneou o constructor para que
    `ProgressManager` se construa antes de `EffectsRunner` e
    `StatComputer`. Pásalles a referencia automáticamente.
  - Note: pecha a asimetría coñecida documentada en 2.4.d. Tras
    esta sub-fase, `progress_min` con nodos computed funciona
    **uniformemente** en `canUnlock`, en effects `conditional` e
    en stat contributions.

Commit Conventional:
`feat(core): wire EffectsRunner and StatComputer to ProgressManager (sub-phase 2.4.e)`.

Push directo a `origin/main` (base `c918324`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/EffectsRunner.ts` (modificado: +1
  campo no context, +1 campo no resolverCtx)
- `packages/core/src/engine/StatComputer.ts` (modificado:
  +1 campo no context, +1 campo no resolverCtx)
- `packages/core/src/engine/TreeEngine.ts` (modificado: reordering
  + 2 instanciaciones con progressManager)
- `packages/core/__tests__/engine/TreeEngine.progress.test.ts`
  (modificado: renomear describe + actualizar asercións + engadir
  caso StatComputer)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]`)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/src/types/`, `packages/core/src/engine/UnlockResolver.ts`,
`packages/core/src/engine/ProgressManager.ts`,
`packages/core/src/engine/index.ts`, `pnpm-lock.yaml`,
`packages/core/package.json`.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Modificar `UnlockResolver.ts` (5.10: cambio xa feito en 2.4.d).
- ❌ Modificar `ProgressManager.ts` (cumpre `ProgressManagerLike`
  via structural typing).
- ❌ Acceder a `progressManager` vía `engine.progressManager` (5.2:
  campo explícito no context, non vía referencia).
- ❌ Engadir ErrorCodes ou tocar common (5.8).
- ❌ Modificar tipos públicos (`types/effects.ts`, `types/stats.ts`,
  etc.).
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12, A.6 L4).
- ❌ Refactorizar pezas non listadas ("xa que toco...").
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1).

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.4.e — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base c918324)
✅ EffectContext e StatComputerContext aceptan progressManager? (opcional)
✅ Reordering do constructor: ProgressManager construído tras audit,
   antes de EffectsRunner/StatComputer
✅ EffectsRunner.applyConditional propaga progressManager ao resolverCtx
✅ StatComputer.computeStatDef (ou equivalente) propaga progressManager
   ao resolverCtx
✅ TreeEngine pasa progressManager nas 2 instanciaciones novas
✅ Asimetría 2.4.d PECHADA: progress_min funciona uniformemente
✅ Test de asimetría coñecida actualizado (renomeado + asercións
   reverted + caso StatComputer engadido)
✅ T0.2 ProgressManagerLike: <exportada en UnlockResolver.ts:NN>
✅ T0.3 ProgressManagerContext dependencias: <confirmadas en :113>
✅ T0.4 ocorrencias "progressManager: this.progressManager":
   <4 esperadas: 2 previas + 2 novas>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / EffectsRunner <Y%> / StatComputer <Z%>
   (baseline 2.4.d: 98.21% global; non debe baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: ningunha nova. A 2.4.* completa pecha o ciclo
   de progress (manual + computed integrados uniformemente).
✅ Changeset minor (core; common NON tocado) + nova [Unreleased]
   (DT-12, non consolidada)
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.5 ou 2.6 (decide o director).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR
(parche xerado)".

---

*Fin do briefing 2.4.e. Reordering trivial + 4 cambios mecánicos +
actualización de test intermedio. Calquera caso non cuberto →
ESCALAR (0.6).*
