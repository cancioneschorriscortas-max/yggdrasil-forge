# BRIEFING — SUB-FASE 1.12 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo (Sonnet 4.6).
> É autosuficiente. NON preguntes "X ou Y?": todo está decidido aquí.
> Se algo non está no briefing, decídelo ti e segues; NON consultas.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE — LER PRIMEIRO)

Estas regras aplícanse a TODA a sesión. Violalas é motivo de rexeite do entregable.

**0.1 — Onde van os scripts auxiliares.**
Os scripts Python que xeres para crear/editar ficheiros créanse SEMPRE en
`/tmp/ygg-exec/` (Git Bash en Windows: `mkdir -p /tmp/ygg-exec`).
**NUNCA** na raíz do proxecto, **NUNCA** dentro de `C:\Users\tajes\proxectos\yggdrasil-forge\`.
Se precisas executalos, `cd /tmp/ygg-exec && python3 script.py` e que o script
escriba co path absoluto ao repo. Non descargues nada á raíz.

**0.2 — Defensa no .gitignore (primeira microtarefa, T0).**
Antes de calquera outra cousa, engade ao `.gitignore` da raíz, ao final, un
bloque novo (cinto e tirantes, por se 0.1 falla):

```
# Executor scratch (nunca commitear scripts de execución)
/*.py
/scripts-exec/
/tmp-exec/
```

Commitea isto só (T0) antes de empezar o traballo real:
`chore: ignore executor scratch scripts`

**0.3 — Verificación de tests SEMPRE con --force.**
Turbo cachea resultados por hash e PODE non reexecutar tests que modificaches.
Para verificar tests usa SEMPRE, sen excepción:

```
pnpm turbo run test --filter=@yggdrasil-forge/core --force
```

NUNCA `pnpm test` a secas para validar cambios. (`pnpm test` só vale como
sanity final do monorepo completo, despois do --force do core.)

**0.4 — Decisións xa tomadas.**
Rama de traballo: `main` (commit directo, como nas sub-fases anteriores).
Método de creación de ficheiros: `python3` + `encoding='utf-8'`. NUNCA heredoc
de Git Bash (corrompe contido). Edición parcial: `str_replace`.
Orde dos pasos: a deste briefing, de T0 a T7. Non a cambies, non a consultes.

**0.5 — Política anti-placeholder (IMPORTANTE).**
Se en calquera momento metes un valor falso, `'unknown'`, `TODO`, `null`
de recheo, ou un `any` "temporal" só para que typecheck/tests pasen: PARA.
Ou o fas ben, ou o reportas EXPLICITAMENTE na sección de incidencias do
reporte final como débeda técnica nova (con ficheiro e liña). Un test que
pasa enmascarando un valor incorrecto é peor que un test que falla.

---

## 1. IDENTIFICACIÓN

Briefing para a **sub-fase 1.12** de Yggdrasil Forge.
Tipo: **feature nova** (primeira peza do motor público) **+ pago de débeda DT-6**.

---

## 2. CONTEXTO MÍNIMO (que é Yggdrasil Forge)

Motor de skill trees para web. Monorepo pnpm 11.0.9 + turbo. TypeScript strict.
- `@yggdrasil-forge/common`: error codes, i18n, constantes.
- `@yggdrasil-forge/core`: o motor. Xa ten os `types/` completos e varias
  pezas internas do engine (StateStore, ResourceManager, UnlockResolver,
  DependencyGraph, CycleDetector, ChangeTracker, EventEmitter,
  ConcurrencyGuard). Falta a fachada pública: **`TreeEngine`**.
Estamos na Fase 1. Esta sub-fase crea o `TreeEngine` SÓ co constructor e os
getters síncronos. As mutacións (unlock/lock/applyChanges) son 1.13+.

---

## 3. ESTADO DO PROXECTO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `3ee42ec`.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` →
  **315 tests pasan** en core (15 ficheiros). ✓ Este é o número exacto previo.
- `pnpm lint` → 0 warnings, 0 errors. ✓
- `pnpm typecheck` → 20/20. ✓
- `TreeEngine.ts` **NON existe aínda**. Hai que crealo.
- `TreeEngineOptions` **NON está definido** en types. Hai que definilo (T2).
- Débeda **DT-6** aberta: ver T1.

Pezas internas xa dispoñibles que TreeEngine vai envolver:
- `StateStore` (`./StateStore.js`): `getState()`, `getTreeDef()`,
  `subscribe(listener)`, `getSnapshot()`, `getServerSnapshot()`,
  `getCacheVersion(type)`, `invalidate(types)`. Constructor:
  `new StateStore(treeDef, options?)`. Crea o estado inicial a partir de
  `treeDef.startingBudget`.
- `ResourceManager` (`./ResourceManager.js`): `new ResourceManager(resources)`,
  `canAfford`, `applyCost`, `refund`, `getCostForTier`, `getTotalCost`.
- `EventEmitter` (`./EventEmitter.js`).
- Tipos: `TreeDef`, `TreeState`, `NodeDef`, `NodeInstance`, `Budget`,
  `Resource`, `Cost`, `Result`/`ok`/`err`, `EngineMetrics`, `Locale`,
  todo exportado desde `../types/index.js`.

Entorno: Windows + Git Bash. Path real:
`C:\Users\tajes\proxectos\yggdrasil-forge` (`/c/Users/tajes/proxectos/yggdrasil-forge`).

---

## 4. OBXECTIVO DESTA SUB-FASE (unha frase)

Crear a clase `TreeEngine` co constructor (que valida e inicializa estado a
partir dun `TreeDef`) e todos os getters síncronos de lectura, sen ningunha
mutación; e de paso pagar a débeda DT-6 do ResourceManager.

---

## 5. DECISIÓNS XA TOMADAS (non discutibles)

1. **`TreeEngine` é unha fachada** sobre `StateStore` + `ResourceManager`.
   NON reimplementa estado: delega en `StateStore`.
2. **Constructor síncrono.** `new TreeEngine(treeDef, options?)`. Se o
   `treeDef` é inválido → **lanza `YggdrasilError`** (`INVALID_TREE_DEF`),
   o engine non se crea (sección 47 do MASTER: "TreeDef inválido constructor →
   Throw"). Esta é a ÚNICA situación onde se lanza en vez de devolver Result.
3. **Getters devolven null / readonly, nunca lanzan.** `getNodeState` →
   `NodeInstance | null`. `getBudget()` → `Readonly<Budget>`. Etc.
4. **`TreeEngineOptions`** defínese en `packages/core/src/types/tree.ts`
   (xunto a TreeDef) e expórtase desde `types/index.ts`. Campos para 1.12
   (só os que o constructor necesita agora; o resto en fases futuras):
   ```ts
   export interface TreeEngineOptions {
     readonly locale?: Locale
     readonly readOnly?: boolean
   }
   ```
   NON engadas storage/autoSave/audit/time/onError aínda: son fases 1.13+.
   Se os engades agora sen implementalos, é placeholder → prohibido (0.5).
5. **Locale por defecto:** `options.locale ?? 'gl'` (FALLBACK do proxecto).
   Garda a locale; expona via `getLocale()`. `setLocale()` é mutación → NON
   nesta sub-fase (é 1.13+). Só o getter.
6. **DT-6 córrixese aquí** (T1) porque TreeEngine vai empezar a propagar os
   erros do ResourceManager e a mensaxe `unknown` non pode chegar ao usuario.
7. **Validación do TreeDef no constructor:** mínima e concreta (T3.b). NON
   construír aquí un validador Zod completo (iso é a sub-fase 1.17). Só
   chequeos estruturais baratos que xustifican o throw.

---

## 6. TAREFAS A EXECUTAR (orde estrita, criterio "feito")

### T0 — Defensa .gitignore (ver sección 0.2)
Commit propio. **Feito cando:** `.gitignore` ten o bloque; commit feito.

### T1 — Pagar DT-6: mensaxe real en INVALID_COST do ResourceManager

Ficheiro: `packages/core/src/engine/ResourceManager.ts`.
Problema actual (liña ~39): cando `aggregateCosts()` devolve `null`, créase
`getErrorMessage(ErrorCode.INVALID_COST, 'gl', { amount: 'unknown' })`.
A mensaxe sae como "...(recibido **unknown**)". Inútil.

Causa: `aggregateCosts()` devolve `null` sen dicir cal custo era negativo.

Corrección:
- Modifica `aggregateCosts` (método privado) para que, en vez de devolver
  `null` cando atopa un custo negativo, identifique o custo ofensivo. Opción
  recomendada: que devolva un `Result`-like interno ou que `applyCost`
  detecte o custo negativo ANTES de agregar, iterando `costs` e atopando o
  primeiro `cost.amount < 0`. Pasa ese `cost.amount` real (e o `resourceId`)
  ao `getErrorMessage` no context: `{ amount: String(cost.amount) }` (ou
  inclúe tamén resourceId se queres enriquecer; a mensaxe actual só usa
  `{amount}`, NON cambies a mensaxe de common, só pásalle o valor real).
- Engade tamén `context` ao `YggdrasilError` coas mesmas variables reais
  (telemetría, sección 56-58 do MASTER).
- NON cambies a firma pública de `applyCost` nin de `canAfford`.

**Feito cando:** ningunha mensaxe contén a cadea literal `'unknown'`;
`grep -n "unknown" packages/core/src/engine/ResourceManager.ts` non devolve
nada relacionado con isto; o test de localización segue pasando.

### T2 — Definir TreeEngineOptions

Ficheiro: `packages/core/src/types/tree.ts`. Engade a interface
`TreeEngineOptions` (ver decisión 5.4, exactamente eses campos). Necesitarás
importar `Locale` (xa hai tipos de i18n; `Locale` vén de common, re-exportado;
mira como o fai `unlockMessages`/`UnlockResolver` se dubidas do path).
Exporta `TreeEngineOptions` desde `packages/core/src/types/index.ts` na
mesma zona que `TreeDef`.

**Feito cando:** `pnpm typecheck` 20/20; `TreeEngineOptions` importable
desde `@yggdrasil-forge/core`.

### T3 — Crear TreeEngine.ts (constructor + getters)

Ficheiro novo: `packages/core/src/engine/TreeEngine.ts`.

**T3.a — Constructor.**
```
constructor(treeDef: TreeDef, options?: TreeEngineOptions)
```
- Valida o treeDef (chama a T3.b).
- Crea internamente: `new StateStore(treeDef)`,
  `new ResourceManager(treeDef.resources ?? [])`, e un `EventEmitter`.
- Garda `locale = options?.locale ?? 'gl'` e `readOnly = options?.readOnly ?? false`.
- Non fai I/O. Non é async.

**T3.b — Validación mínima do TreeDef** (método privado, ou helper).
Lanza `new YggdrasilError(ErrorCode.INVALID_TREE_DEF, getErrorMessage(...))`
(localizado, usa a locale resolta) se:
- `treeDef` non é obxecto plano, ou
- `treeDef.id` falta/baleiro, ou
- `treeDef.nodes` non é array, ou
- hai IDs de nodo duplicados (usa un Set; este é un anti-patrón explícito
  da sección 4.2 do MASTER: "String IDs duplicados").
NON valides aquí prerequisites/ciclos/edges en profundidade (iso é 1.17).
A mensaxe de `INVALID_TREE_DEF` xa existe en common con placeholder
`{details}`: pásalle un `details` concreto (ex.: `duplicate node id "x"`).

**T3.c — Getters síncronos** (todos os que o MASTER lista como síncronos na
sección 10, alcance 1.12). Implementa exactamente estes, delegando en
StateStore/ResourceManager:
- `getNodeState(nodeId: string): NodeInstance | null`
- `getAllNodeStates(): ReadonlyMap<string, NodeInstance>`
- `getBudget(): Readonly<Budget>`
- `getProgress(nodeId: string): number`  (0 se non hai progreso/nodo)
- `getTreeDef(): Readonly<TreeDef>`
- `getLocale(): Locale`
- `isReadOnly(): boolean`
- `getSnapshot(): TreeState`  (delega StateStore.getSnapshot)
- `getServerSnapshot(): TreeState`  (delega StateStore.getServerSnapshot)
- `subscribe(listener: () => void): () => void`  (delega StateStore.subscribe)

NON implementes nesta sub-fase: `unlock`, `lock`, `respec`, `applyChanges`,
`setProgress`, `getStat`/`getAllStats` (precisan StatComputer, fase 2),
`getMetrics` (fase posterior), plugins, audit, serialización, `destroy`.
Se algún getter precisa algo que aínda non existe (ex. stats), NON o crees
con placeholder: simplemente NON o incluyas e anótao no reporte.

**T3.d — Export.** Engade a `packages/core/src/engine/index.ts`:
`export { TreeEngine } from './TreeEngine.js'` e o tipo se procede.
Verifica que `packages/core/src/index.ts` reexporta o engine (debería xa).

**Feito cando:** `TreeEngine` importable desde `@yggdrasil-forge/core`;
typecheck 20/20.

### T4 — Tests de TreeEngine

Ficheiro novo: `packages/core/__tests__/engine/TreeEngine.test.ts`.
Cobre como mínimo:
- Constructor con TreeDef válido mínimo → non lanza, getters devolven
  estado inicial coherente (budget = startingBudget; nodos en estado inicial).
- Constructor con TreeDef inválido (sen id / nodes non array / **ids
  duplicados**) → lanza `YggdrasilError` con `code === INVALID_TREE_DEF`.
  Verifica o `.code` explícitamente (lección da 1.11: non só `toThrow()`).
- Cada getter: caso normal + caso límite (`getNodeState('inexistente')`
  → `null`; `getProgress('inexistente')` → `0`).
- `getLocale()` devolve a locale de options, ou `'gl'` por defecto.
- `isReadOnly()` reflicte options.
- `subscribe` devolve unha función que desuscribe (chama unsubscribe e
  verifica que xa non notifica — podes forzar unha notificación vía unha
  operación interna dispoñible, ou simplemente comproba `listenerCount` se
  está exposto; se non, verifica que unsubscribe non lanza).
- `getBudget()` / `getTreeDef()` devolven algo que mutar non rompe o estado
  interno (readonly de facto): muta a copia, comproba que o engine non cambia.

Mínimo **8 tests novos** ben diferenciados.

**Feito cando:** `pnpm turbo run test --filter=@yggdrasil-forge/core --force`
pasa con **323 tests** en core (315 previos + 8 novos). Se o teu número
final difire, repórtao co número exacto e a razón (NON axustes a forza para
chegar a 323; o importante é que todos pasen e a cobertura sexa real).

### T5 — Cobertura
O core esixe **90%+** (sección 1.7 do MASTER). Comproba que TreeEngine.ts
e a corrección de ResourceManager non baixan a cobertura por baixo de 90%.
`pnpm --filter @yggdrasil-forge/core test:coverage` se está dispoñible, ou
o equivalente. Se algunha rama queda sen cubrir, engade o test ou anótao
como débeda no reporte (NON a ignores en silencio).

### T6 — Verificación final (orde exacta)
```
pnpm lint:fix
pnpm format
pnpm lint                                                  # 0 warnings
pnpm format:check                                          # pasa
pnpm typecheck                                             # 20/20
pnpm turbo run test --filter=@yggdrasil-forge/core --force # 323 (ou nº reportado)
pnpm test                                                  # sanity monorepo completo
```

### T7 — Changeset + CHANGELOG + commit
- Changeset **minor** (afecta `@yggdrasil-forge/core`; sincronizado con common
  só se tocaches common — neste briefing NON se toca common, polo que é
  só core; confírmao).
- CHANGELOG baixo `## [Unreleased]`:
  - Added: `TreeEngine` (constructor + getters síncronos) e `TreeEngineOptions`.
  - Fixed: DT-6 — `ResourceManager` `INVALID_COST` agora reporta o importe
    real en vez de `unknown`.
- Commits (Conventional Commits, inglés). Podes facer 2 commits limpos:
  1. `fix(core): report real cost amount in INVALID_COST (DT-6)`
  2. `feat(core): add TreeEngine constructor and synchronous getters`
  (T0 xa foi o seu commit propio aparte.)
- Push a `origin/main` SÓ tras avisar ao autor de que verifique
  (o autor pasa o código a ChatGPT como revisor; tómao en serio).

---

## 7. CONVENCIÓNS OBRIGATORIAS

Comentarios no código en **castelán**, marcadores `// ── INICIO: … ──` /
`// ── FIN: … ──` (mesmo estilo que os ficheiros existentes — ábreos e
imítaos). 2 espazos, comilla simple, sen `;`, trailing commas multi-liña,
máx 100 cols, UTF-8 + LF. TypeScript strict, **cero `any`**.
`Number.parseInt` namespaced. Importacións Node core con `node:`.
NON desactives regras de Biome.

---

## 8. QUE ENTREGAR

- `.gitignore` (bloque novo).
- `packages/core/src/engine/ResourceManager.ts` (DT-6 corrixido).
- `packages/core/src/types/tree.ts` (+ `TreeEngineOptions`).
- `packages/core/src/types/index.ts` (export de `TreeEngineOptions`).
- `packages/core/src/engine/TreeEngine.ts` (novo).
- `packages/core/src/engine/index.ts` (export).
- `packages/core/__tests__/engine/TreeEngine.test.ts` (novo).
- `.changeset/<nome>.md`, `CHANGELOG.md`.
- Commits en `origin/main`.

Pega no reporte as saídas de: `pnpm lint`, `pnpm typecheck`, e
`pnpm turbo run test --filter=@yggdrasil-forge/core --force` (liña de total).

---

## 9. QUE NON FACER

- ❌ NON implementes mutacións (unlock/lock/respec/applyChanges/setProgress).
- ❌ NON crees StatComputer, TimeManager, AuditLogger, plugins, serialización.
- ❌ NON engadas campos a TreeEngineOptions máis aló de `locale`/`readOnly`.
- ❌ NON construyas un validador Zod (iso é 1.17); só os chequeos de T3.b.
- ❌ NON metas placeholders/any/TODO para pasar typecheck (sección 0.5).
- ❌ NON toques `@yggdrasil-forge/common` (DT-6 resólvese só en core).
- ❌ NON toques `UnlockResolver`, `unlockMessages`, `StateStore` internos.
- ❌ NON cambies o lockfile nin engadas dependencias.
- ❌ NON deixes scripts `.py` no repo (sección 0).

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.12 — COMPLETADA
═══════════════════════════════════════
✅ T0: .gitignore defensivo + commit propio
✅ DT-6 resolto: INVALID_COST reporta importe real (sen 'unknown')
✅ TreeEngineOptions definido e exportado
✅ TreeEngine: constructor + validación + getters síncronos
✅ Tests: <N> pasan en core (<delta> novos) — verificado con --force
✅ Cobertura core: <X>% (≥90%)
✅ Typecheck: 20/20
✅ Lint: 0 warnings, 0 errors
✅ Changeset minor (core)
✅ CHANGELOG actualizado
✅ Commits: <hashes> — en origin/main
⚠️ Incidencias / débeda nova (placeholders evitados, decisións forzadas,
   ramas sen cubrir): <descríbeo con ficheiro:liña, ou "ningunha">
📋 Confirmado: scripts en /tmp/ygg-exec, sen heredoc, --force usado
LISTO PARA PROCEDER Á SUB-FASE 1.13 (TreeEngine: unlock/lock/respec)
```

---

*Fin do briefing 1.12. Dúbidas estruturais → ao director, NON improvisar.*
