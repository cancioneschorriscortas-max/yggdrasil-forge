# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `TimeManager` (engine, sub-fase 2.3): peza standalone que avalía restricións temporais dun nodo a partir de tres campos de `TimeConstraints`: `startsAt` e `expiresAt` (UTC ms) e `expiresAtCalendar` (`{date, time, timezone}`, TZ-aware). API pública: `evaluate(constraints)`, `evaluateAt(constraints, atMs)`, `nextTransitionAt(constraints)`. Devolve un `TimeStatus` discriminado con kinds `permanent` / `pending` (con `startsAt`) / `active` (opcionalmente con `expiresAt`) / `expired` (con `expiredAt`). Reloxo virtual obrigatorio: o `TimeManager` non chama nunca a `Date.now()` directamente, todo pasa por `context.now: () => number`, o que permite inxección trivial en tests e SSR. Cando `expiresAtCalendar` e `expiresAt` están ambos definidos prevalece o calendar (resolúcese a UTC ms vía `Intl.DateTimeFormat` con corrección de offset en dúas pasadas para manexar transicións DST). Constraints inválidas (TZ inexistente, data malformada, `NaN`/`Infinity`) trátanse como ausentes; cero excepcións, cero `Result<>`.
- `TreeEngine.getStat(statId): number` e `TreeEngine.getAllStats(): Readonly<Record<string, number>>` (engine, sub-fase 2.2.b): API pública para consultar stats globais agregados. `getStat` devolve `NaN` para statIds descoñecidos; `getAllStats` devolve unha entrada por cada `StatDef` declarado en `treeDef.stats` (Record vacío se non hai stats). Delegan no `StatComputer` interno que se cablea como `private readonly` no constructor tras o `EffectsRunner`.
- Invalidación automática da cache do `StatComputer` tras cada mutación exitosa do estado: `unlock` (antes do bloque de effects para que estes leas valores actualizados), `lock`, `respec`, `applyChanges`. Multi-tier: cada salto de tier dun `unlock` invalida individualmente, polo que `perTier` reflicte sempre o tier vixente.

### Changed
- `StatComputerContext` (engine): o campo `state: TreeState` substituíuse por `store: StateStore` para que o computer lea o snapshot vixente con `store.getState()` en cada cálculo (necesario para integrarse con mutacións Immer en `TreeEngine`). Cambio mínimo requirido pola integración; a API pública de `StatComputer` (`computeStat` / `computeAllStats` / `explainStat` / `invalidate`) **non muda**. Os tests existentes da sub-fase 2.2 que mutaban `state` por referencia foron adaptados a `store.replaceTreeState`.

### Note
- `TimeManager` (sub-fase 2.3) implementa **só caducidades** (`startsAt` / `expiresAt` / `expiresAtCalendar`). Os campos `cooldownMs`, `reCertifyAfterMs`, `validForMs` declarados en `TimeConstraints` **trátanse como ausentes** en runtime nesta sub-fase: requiren modelo de estado adicional (ex: `lastUnlockedAt`) e quedan diferidos a unha sub-fase futura. `TimeManagerOptions` (`enabled`, `checkIntervalMs`, `leadTimeMs`, `timezone`) acéptase no contexto pero ignórase nesta sub-fase standalone; a súa semántica corresponde á capa de scheduling de 2.3.b.
- A integración de `TimeManager` con `TreeEngine` (auto-marcar nodos como `'expired'`, emitir `EventMap.nodeExpired`, escribir `AuditAction.node_expired`, programar checks vía `setTimeout` usando `nextTransitionAt`) é sub-fase aparte (**2.3.b**), seguindo o mesmo patrón ca 2.1→2.1.b e 2.2→2.2.b. `EventMap.nodeExpired` e `AuditAction.node_expired` están declarados pero non se emiten ata 2.3.b.
- Cobertura: `TimeManager.ts` 98.73/96.29/100/98.73 (a única liña non cuberta é a rama defensiva `Number.isNaN(Date.UTC(...))`, inalcanzable con dígitos válidos garantidos polo regex previo); global 98.11% → 98.14%. Tests do paquete `core`: 676 → 721 (45 novos en `__tests__/engine/TimeManager.test.ts`).
- O effect `modify_stat` segue sen implementar: nun unlock con `effects: [{ type: 'modify_stat', ... }]`, o `EffectsRunner.run` rexéitao co código orixinal `EFFECT_TYPE_UNSUPPORTED` (YGG_E013) que `unlock` envolve como `EFFECT_APPLICATION_FAILED` (YGG_E017) cun `context.originalErrorCode = 'YGG_E013'`. Rollback total do unlock como sempre. Implementación diferida a unha sub-fase futura (probablemente 2.2.c ou con `TimeManager`) que defina onde almacenar o delta persistente, como compoñer coa derivación de `StatComputer`, e como serializar.
- O evento `EventMap.statChange` queda declarado pero **non se emite**: a emisión require comparar valores antes/despois por mutación (overhead non trivial). Para observar cambios de stats, subscríbase aos eventos de mutación (`unlock`, `lock`, `respec`, `treeChanged`) e re-consulte `getStat` / `getAllStats`. Documentado no JSDoc do propio campo en `events.ts`.
- `explainStat` queda accesible só polo `StatComputer` interno; non se expón en `TreeEngine` (briefing 2.2.b §5.2: a API pública mantense mínima ata que un consumidor o necesite).
- Cobertura (acumulada 2.2.b): `StatComputer.ts` 100/98.18/100/100 (sen variación); `TreeEngine.ts` 96.20% → 96.25%; global 98.10% → 98.11%. Tests do paquete `core`: 663 → 676 (13 novos en `__tests__/engine/TreeEngine.stats.test.ts`).

## [Unreleased]

### Added
- `StatComputer` (engine, sub-fase 2.2): peza standalone que calcula valores agregados de stats globais a partir das `statContributions` dos nodos desbloqueados. API pública: `computeStat(statId)`, `computeAllStats()`, `explainStat(statId)`, `invalidate()`. Soporta operacións `+`, `-`, `*`, `/`, `min`, `max`, `set`; multiplicador `perTier` baseado en `NodeInstance.currentTier`; `conditions?` opcionais avaliadas como AND lóxico vía `UnlockResolver` (envolvidas como `UnlockRule { type: 'all', conditions }`). Clamp final de `min`/`max` aplicado **unha soa vez** tras todas as contribucións (briefing §5.3 paso 4), nunca entre operacións.
- Cache simple invalidable: `computeStat` consulta un `Map<string, number>` privado antes de calcular; `invalidate()` baléirao por completo (invalidación granular por nodo deliberadamente fóra de alcance — §5.4). `explainStat` **NUNCA** usa cache; recalcula sempre para reflectir o estado exacto no momento. Os statIds descoñecidos non se cachean (evitan contaminar a cache con NaN).
- Comportamento defensivo: `computeStat('nope')` para statId descoñecido devolve `NaN` (sen lanzar, sen `Result<>`); `explainStat('nope')` devolve `{ statId, finalValue: NaN, contributions: [] }`. `NodeInstance` que referencia un `NodeDef` inexistente saltase silenciosamente (caso defensivo improbable con TreeDef validada por Zod, pero protexido). Cero validación semántica de matemáticas patolóxicas: divisións por cero propágansen como `Infinity`/`NaN`, é responsabilidade do deseñador da árbore.
- `StatExplanation` (consumo): para cada nodo contribuínte, a entrada inclúe `{ nodeId, op, value, appliedTier, conditional? }`. Contribucións aplicadas **sen** `conditions?` → `conditional: undefined`; contribucións con `conditions?` que **pasaron** → `conditional: true` con `appliedTier` real; contribucións saltadas por condición → `conditional: true` con `appliedTier: 0` (briefing §5.5).
- Tests (`__tests__/engine/StatComputer.test.ts`): 40 tests novos cubrindo valor inicial sen contribucións, cada unha das 7 operacións, `perTier` on/off, todos os `NodeState` (só `unlocked`/`maxed` contribúen; `locked`/`unlockable`/`in_progress` ignóranse), conditions AND simple e múltiple, agregación multi-nodo, clamp `min` e `max`, statId inexistente para `computeStat` e `explainStat`, comportamento de cache (sen/con `invalidate()`), `computeAllStats` con e sen `treeDef.stats`, detalle exacto de `explainStat` (incluíndo NON-cache), división por cero como `Infinity`, NodeInstance ghost saltado silenciosamente, e ignorar contribucións con statId diferente. Total tests do paquete `core`: 623 → 663.
- Cobertura de `StatComputer.ts`: 100% Stmts / 98.18% Branch / 100% Func / 100% Lines (ben por riba do limiar ≥90%). Cobertura global do paquete pasa de 98.02% → 98.10% Stmts; sen regresión en ningunha métrica.

### Note
- Integración con `TreeEngine` (`getStat`, `getAllStats` getters) e cableado do effect `modify_stat` (hoxe `EFFECT_TYPE_UNSUPPORTED`) queda diferida á sub-fase 2.2.b, replicando o patrón illado→integrado xa usado en 2.1/2.1.b. `TreeState.computedStats` (xa presente en `tree.ts:113`, inicializado a `{}` en `StateStore.ts:131`) **NON se usa nesta sub-fase**; a sincronización co StateStore tamén é 2.2.b.

## [Unreleased]

### Added
- `TreeEngine.unlock` (engine, sub-fase 2.1.b): executa automaticamente `nodeDef.effects` vía o `EffectsRunner` integrado tras un unlock exitoso. Atomicidade total: se algún effect falla, faise rollback completo do unlock — restáurase o estado previo do nodo, o budget vólvese exacto ao previo (oldBudget directo, **independente da flag `refundable` dos recursos**: este é rollback técnico, NON refund voluntario), emítense eventos de reversión (`budgetChange`, `stateChange` con `reason: 'effect_failed'`, `lock`) e rexístrase unha entrada audit compensatoria. O audit `node_unlocked` previo NON se reverte (é histórico real do que pasou).
- Audit agregada con detalle: unha única entrada `custom` por unlock con effects, en lugar dunha entrada por effect. `name: 'effects_applied'` no éxito (cos detalles `{ nodeId, count, effects: [{ type, applied, reason }] }`) ou `name: 'effects_failed'` no rollback (cos detalles `{ nodeId, ...errorContext }` que inclúe `failedAt`, `failedEffect`, `reason`, `revertedCount`, `originalErrorCode`).
- Multi-tier (sec. 5.7): se un nodo ten `maxTier >= 2` e `effects`, cada salto de tier executa os effects (semántica natural). Ex: nodo con `effects: [modify_resource +5 gold]` e `maxTier: 3` dá 15 gold acumulados tras 3 unlocks.
- `EffectContext.engine` é auto-referencia ao mesmo `TreeEngine` que aloxa o runner, permitindo a `unlock_node` effects chamar de volta a `engine.unlock` (uso seguro pola atomicidade do propio `run`).
- Tests novos (`__tests__/engine/TreeEngine.effects.test.ts`): 8 tests cubrindo unlock sen effects (backwards compat), effects exitosos con audit agregada, fallo de effect simple (Caso A: rollback completo de estado/budget/eventos), fallo composto (Caso B: primeiro effect revertido + cost refundado), multi-tier (3 saltos = 3 audit entries), unlock_node recursivo sen ciclo, e ciclo A↔B (estado coherente; ver DT-11). Total tests do paquete `core`: 615 → 623.
- Cobertura: `TreeEngine.ts` 96.18% → 96.20% Stmts; global 97.69% → 98.02%. Baseline non baixou en ningunha métrica.

### Known issues
- DT-11 — Detección de ciclos `unlock_node` recursivos non se activa cando pasan polo `TreeEngine.unlock`: cada chamada a `engine.unlock` desde un effect `unlock_node` crea un novo `EffectsRunner.run` co seu propio `unlockedDuringRun` Set local, polo que a protección con `MAX_EFFECT_DEPTH = 8` é inerte nese fluxo concreto. O ciclo detéctase de forma colateral como `NODE_ALREADY_UNLOCKED` ao longo da cadea de erros propagados, e o estado queda coherente (rollback aplicado correctamente en cada nivel). Solución futura: estender o `EffectContext` para compartir o `Set<string>` entre invocacións aniñadas, ou mover a detección a `TreeEngine.unlock`. Non bloqueante.

## [Unreleased]

### Added
- `EffectsRunner` (engine, sub-fase 2.1): runner standalone do Effects DSL (`types/effects.ts`) que aplica e revira efectos declarativos contra unha pila inxectada de pezas do motor (`StateStore`, `ResourceManager`, `UnlockResolver`, `EventEmitter`, `TreeEngine`). Construído como peza illada por deseño: o consumidor instancia manualmente `EffectContext` con `{ engine, store, resources, resolver, events, locale }`. NON se conecta automaticamente a `TreeEngine.unlock` — a integración cómoda queda para a sub-fase 2.1.b.
- Cobertura desta sub-fase: 8 dos 10 effect types con forward + reverse — `modify_resource` (+/-/*), `trigger_event`, `conditional`, `composite`, `set_node_visibility`, `unlock_node`, `modify_node_state`, `set_progress`. Os outros dous (`modify_stat`, `plugin`) devolven `EFFECT_TYPE_UNSUPPORTED` (validate e run); quedan para 2.2 e fase 8.
- Atomicidade en `run()`: todo-ou-nada. Se o N-ésimo effect falla, os N-1 anteriores revírtense automaticamente en orde inversa; o error devolve `EFFECT_APPLICATION_FAILED` cun `context` que inclúe `failedAt`, `failedEffect`, `revertedCount` e `originalErrorCode` da causa real.
- `EffectsRunner.validate(effects)`: comprobación estática sen aplicar — tipos coñecidos, referencias a `nodeId`/`resourceId` existen na TreeDef, rango `[0, 100]` para `set_progress`, lista branca de transicións para `modify_node_state`, recursión completa sobre `composite`/`conditional`.
- `EffectsRunner.run(effects)`: forward atómico. Detección de bucles vía `Set<string>` de nodos desbloqueados durante a corrida (`unlock_node` repetido → `CIRCULAR_EFFECT`). Profundidade máxima de cascada `MAX_EFFECT_DEPTH = 8` (composite/conditional aniñados en exceso → `CIRCULAR_EFFECT`).
- `EffectsRunner.reverse(results)`: itera en orde inversa, cada effect usa o seu `previousValue` para restaurar o estado previo. Effects con `irreversible: true` → `IRREVERSIBLE_EFFECT`. Para `set_node_visibility` preservase a distinción "campo ausente vs explicitamente `undefined`" (decisión do arquitecto): se `previousValue === undefined`, elimínase o campo do draft; se é boolean, restaúrase exactamente.
- Lista branca de transicións de `modify_node_state` (sec. 5.8 do briefing): só `locked↔unlockable` e `unlocked↔disabled` están permitidas. Calquera outra (incluíndo saltar a `'unlocked'` ou `'maxed'` directamente) → `EFFECT_APPLICATION_FAILED`. Os saltos a `'unlocked'/'maxed'` deben pasar polo fluxo normal de `unlock` con custos e prerequisites.
- `EffectContext` (engine, public): interface inxectable que agrupa as pezas do motor que cada effect necesita. Exportada xunto co `EffectsRunner`.
- `NodeInstance.visible?: boolean` (types/node.ts): novo campo opcional mutable (sen `readonly`, coherente co estilo do tipo; Immer garante a inmutabilidade externa). Usado polo effect `set_node_visibility`.
- `EventMap.customEvent: (eventName: string, payload?: unknown) => void`: novo evento emitido polo effect `trigger_event`. O `payload` trátase como `unknown`; o consumidor é responsable de validalo.
- `EffectResult.previousValue?: unknown`: novo campo opcional para soportar `reverse()`. Cada effect coñece o tipo concreto que garda (number/boolean/string/array/object); reversores defensivos no caso de `previousValue` corrupto.
- `ErrorCode` ampliado con 5 códigos novos (`@yggdrasil-forge/common`): `EFFECT_TYPE_UNSUPPORTED` (YGG_E013), `IRREVERSIBLE_EFFECT` (YGG_E014), `CIRCULAR_EFFECT` (YGG_E015), `EFFECT_TARGET_NOT_FOUND` (YGG_E016), `EFFECT_APPLICATION_FAILED` (YGG_E017). Mensaxes localizadas en `gl`/`es`/`en`.
- Tests (`__tests__/engine/EffectsRunner.test.ts`): 68 tests novos cubrindo validate, run/reverse felices por tipo, atomicidade, detección de bucles, casos de error con `.code` exacto, integración con `customEvent`, e cobertura adicional de ramas defensivas. Total tests do paquete `core`: 547 → 615.
- Cobertura de `EffectsRunner.ts`: 100% Stmts / 97.29% Branch / 100% Func / 100% Lines. Cobertura global do paquete sobe a 98.04% Stmts / 91.09% Branch (de 97.69 / 89.93 baseline). Ramas defensivas xenuínas anotadas con `c8 ignore` xustificado.

## [Unreleased]

### Fixed
- DT-10 — Multi-tier unlock completo para nodos con `maxTier >= 2`: chamadas consecutivas a `unlock` sobre o mesmo nodo avanzan o seu tier ata `currentTier === maxTier`, momento no que pasa a `'maxed'`. Cada salto emite `unlock`, `stateChange` e `budgetChange`, e (con audit activo) rexistra unha entrada `node_unlocked` co tier alcanzado. Atomicidade preservada: se `applyCost` falla a media, o estado permanece intacto. A semántica de `maxTier === undefined` (queda en `'unlocked'`, reintentos bloqueados) e `maxTier === 1` (pasa a `'maxed'` no primeiro unlock) **non cambia**: multi-tier é opt-in vía `maxTier >= 2` explícito.

## [Unreleased]

### Added
- Phase 1 integration test suite (1.18, closure of Phase 1): new `packages/core/__tests__/integration/` directory with 6 end-to-end scenarios — `lifecycle`, `economy`, `applyChanges`, `audit`, `subscription`, `untrusted-input` — plus targeted coverage tests for `TreeEngine.ts`. Reusable rich fixtures (`fixtures.ts`) build realistic `TreeDef` instances that pass the Zod schema (round-trip safe via `toJSON ↔ fromJSON`).
- No production code changes. Coverage rises: global 92.72% → 97.68%, `TreeEngine.ts` 81.72% → 96.12%. Total core tests: 482 → 538.

## [Unreleased]

### Added
- `treeDefSchema` (engine): esquema Zod que reflicte estruturalmente o tipo `TreeDef`. Só validación estrutural (NON regras pedagóxicas — iso é a Fase 8). Recursivo (`subtrees`) vía `z.lazy`. `InferredTreeDef` exportado (tipo do TreeDef tras validación runtime; difire de `TreeDef` só no artefacto `?:T|undefined` de Zod 3, equivalencia probada por test de tipo).
- `TreeDefValidator.validateTreeDef(input, locale?)`: validación estrutural de entrada non confiable; devolve `Result<InferredTreeDef>`. En erro: `YggdrasilError(INVALID_TREE_DEF)` con `issues` serializables `{path, message}[]` no `context` e mensaxe localizada. Nunca lanza.
- `JsonSerializer` (engine): `serialize(treeDef)` JSON determinista (claves ordenadas de forma estable, recursivo; inclúe `schemaVersion`; só a definición, sen estado runtime) e `deserialize(json, locale?)` (parse → validación → comprobación de `schemaVersion` contra `SCHEMA_VERSION` de common). `schemaVersion` non soportada → `SCHEMA_VERSION_UNSUPPORTED`; JSON malformado → `INVALID_TREE_DEF` controlado.
- `TreeEngine.fromJSON(json, options?)`: factory estático que deserializa+valida e constrúe o engine; devolve `Result<TreeEngine>` SEN lanzar (a entrada é externa). O constructor normal mantén a súa semántica de throw intacta.
- `TreeEngine.toJSON()`: serializa o `TreeDef` actual do engine de forma determinista (round-trip a nivel engine).
- Dependencia `zod` (^3) engadida só a `@yggdrasil-forge/core`.
- `AuditLogger` (engine): rexistro de auditoría en memoria con `record`, `query`, `clear`, `size`. Desactivado por defecto (cero overhead); límite circular FIFO configurable (`maxEntries`, default 1000).
- `TreeEngine.getAuditLog(filter?)`: devolve unha copia filtrada das entradas de auditoría (por `actor`, `action.type`, rango `from`/`to` inclusivo, `limit`). Máis recente primeiro. Síncrono.
- `TreeEngine.clearAuditLog()`: baleira o rexistro de auditoría.
- `TreeEngine.logAudit(action, opts?)`: API manual para rexistrar accións `custom` ou propias; no-op se audit desactivado; emite `auditEntry` cando crea entrada.
- Rexistro automático tras as 4 mutacións exitosas (NON nos erros): `unlock` → `node_unlocked` (rollbackable), `lock` → `node_locked` (rollbackable), `respec` → `respec`, `applyChanges` → `tree_changed`. Cada rexistro emite o evento `auditEntry`.
- `TreeEngineOptions.audit`: configuración opcional `{ enabled?: boolean (default false); maxEntries?: number (default 1000) }`.

## [Unreleased]

### Added
- `Selector<T>` type: función pura `(state: TreeState) => T`.
- `createSelector`: factoría de selectors memoizados estilo reselect, caché last-args (tamaño 1) con igualdade referencial das entradas; tipada con sobrecargas para 1-3 selectors de entrada + combinador (cero `any`).
- `shallowEqual`: helper puro de comparación superficial (un nivel), para uso opcional como `equalityFn`. Non é o default; o default segue sendo `Object.is`.
- `TreeEngine.select<T>(selector)`: lectura pura e síncrona dunha porción derivada do snapshot actual. As excepcións do selector propáganse (non se capturan).
- `TreeEngine.subscribeWithSelector<T>(selector, listener, options?)`: subscríbese ao store global pero só chama a `listener(selected, previous)` cando o valor seleccionado cambia segundo `equalityFn` (default `Object.is`); soporta `fireImmediately`; devolve un `Unsubscribe`.

## [Unreleased]

### Added
- `TreeEngine.unlock(nodeId)`: mutación async que valida prerequisites, exclusións e recursos, aplica custo atómico, cambia estado e emite eventos `unlock`, `stateChange`, `budgetChange`.
- `TreeEngine.lock(nodeId)`: mutación async que reverte un nodo a `locked`, fai refund segundo `refundable`/`refundPercent`, e emite eventos `lock`, `stateChange`, `budgetChange`.
- `TreeEngine.respec(nodeId?)`: mutación async de respec total ou parcial con detección de cascada de dependentes invalidados. Atómica: unha soa `StateStore.update`.
- `TreeEngine.canUnlock(nodeId)`: comprobación síncrona pura que avalia prerequisites, exclusións e recursos sen mutar estado.
- `TreeEngine.on/off`: subscrición tipada a eventos do `EventMap`.
- Tipos exportados: `UnlockResult`, `LockResult`, `RespecResult`.

### Fixed
- DT-7: eliminada rama morta inalcanzable en `ResourceManager.applyCost` (bloque `if (required === null)` que nunca se executaba). Simplificado `aggregateCosts` para que nunca devolva `null`.

## [Unreleased]

### Added
- `TreeEngine`: fachada pública do motor con constructor e getters síncronos (`getNodeState`, `getAllNodeStates`, `getBudget`, `getProgress`, `getTreeDef`, `getLocale`, `isReadOnly`, `getSnapshot`, `getServerSnapshot`, `subscribe`).
- `TreeEngineOptions`: interface con campos `locale` e `readOnly`.

### Fixed
- DT-6: `ResourceManager` `INVALID_COST` agora reporta o importe real do custo negativo en vez de `unknown`.

### Added
- `INVALID_COST` (`YGG_V006`) error code with localized messages in Galician, Spanish, and English for invalid resource cost amounts.

### Changed
- `ResourceManager` now emits localized error messages via `getErrorMessage()` instead of hardcoded English strings.

### Fixed
- Lint warning `useTemplate` in `ResourceManager` (DT-5).

## [Unreleased]

### Added
- `@yggdrasil-forge/core`: `DependencyGraph` class
  - Configurable by edge type (default: `dependency`; optionally `soft_dependency`)
  - `getDependencies`, `getDependents` (direct), `getAllDependencies`, `getAllDependents` (transitive closures)
  - `getRoots`, `getLeaves`, `getNodeIds`, `hasNode`, `getOutgoing`
  - `distanceBetween` (BFS, `Number.POSITIVE_INFINITY` if unreachable) — implements `DependencyGraphLike`
  - `getShortestPath` (BFS with predecessor tracking)
  - Handles bidirectional edges, self-loops, isolated nodes, disconnected graphs
- `@yggdrasil-forge/core`: `CycleDetector` class
  - `hasCycle` (fast DFS, short-circuits)
  - `findCycles` (all cycles, deduplicated via canonical rotation key)
  - `findCycleContaining` (cycle including a given node, for pedagogical error messages)
  - 100% test coverage for both

### Added
- `@yggdrasil-forge/core`: `UnlockResolver` class
  - Evaluates `UnlockRule` (all/any/none combinators + atomic conditions)
  - Supports all 15 atomic condition types
  - `evaluate(rule, ctx)` — fast boolean evaluation with short-circuit
  - `evaluateCondition(condition, ctx)` — atomic evaluation
  - `explain(rule, ctx)` — detailed explanation with localized reasons (gl/es/en)
  - Stateless: receives `UnlockResolverContext` (treeDef, state, optional dependencyGraph, customEvaluators, locale)
  - Localized error messages for missing dependency graph and unregistered custom evaluators
  - 100% test coverage

- `@yggdrasil-forge/core`: `ChangeTracker` class + `analyzeChanges` function
  - Pure analysis of `TreeChange[]` (no mutation, no external state access)
  - Selective cache invalidation per change type (layout / dependency / search / stats)
  - Field-aware analysis of `modify_node` and `modify_edge` (only invalidates caches affected by the modified fields)
  - Internal conflict detection: `duplicate_add_node`, `add_then_remove`, `remove_then_modify`, `modify_after_rename`, `rename_chain`, `rename_to_existing`, `duplicate_edge_id`
  - Rename tracking (oldId → newId map)
  - 100% test coverage

### Added
- `@yggdrasil-forge/core`: `StateStore` class
  - Holds mutable `treeDef` and `treeState` via Immer
  - `update(producer)` and `applyTreeDefChange(producer)` for ergonomic mutations
  - `replaceTreeDef`, `replaceTreeState` for full replacements
  - Integrated cache versioning for 4 cache types (`layout`, `dependency`, `search`, `stats`)
  - `getCacheVersion`, `invalidate`, `setCache`, `getCache` for cache lifecycle
  - Subscription system: `subscribe`, `getSnapshot`, `getServerSnapshot` (React `useSyncExternalStore`-compatible)
  - 100% test coverage



### Added
- `@yggdrasil-forge/core`: wave 3 type definitions
  - `Effect` DSL with 10 effect types (modify_resource, modify_stat, modify_node_state, set_node_visibility, unlock_node, set_progress, trigger_event, conditional, composite, plugin)
  - `TimeConstraints` with dual API (UTC ms absolutes/relatives + calendar with explicit timezone)
  - `TimeManagerOptions`
  - `StatContribution` with 7 operations (+/-/*//min/max/set), perTier, conditional contributions
  - `StatExplanation` for debugging stat computations
  - `AuthConfig` (none/bearer-static/bearer-provider/apikey-static/apikey-provider/basic/custom)
  - `AuthProvider`, `AuthRequestHandler`
  - `ProgressSourceConfig` (5 types: manual/remote/callback/event/computed)
  - `ProgressHandler`, `ProgressHandlerContext`
  - `Build`, `BuildShareLink`, `BuildSnapshot`
  - `AuditEntry`, `AuditAction` (10 action types), `AuditFilter`
  - `TreeChange` (12 change types including `rename_node_id` with auto-reference updates)
  - `ModifyNodeChanges`, `ModifyEdgeChanges` (constrained partials excluding id/type)
  - `EngineMetrics`

### Changed
- `NodeDef`: `unknown` placeholders replaced with concrete types (cost, costPerTier, effects, prerequisites, progressSource, subtreeOverrides, timeConstraints, statContributions)
- `TreeDef`: `resources`, `startingBudget`, `i18n` now use concrete types
- `TreeState.budget`: now `Budget`
- `NodeInstance.subtreeState`: now `TreeState`
- `EventMap`: `buildLoaded`, `treeChanged`, `auditEntry` now use concrete types


### Added
- `@yggdrasil-forge/core`: foundational type definitions
  - `Result<T, E>` with helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`)
  - `NodeDef`, `NodeInstance`, `NodeType`, `NodeState`, `Position`, `StateChange`
  - `freezeNodeDef(def)` for recursive Object.freeze of node definitions
  - `EdgeDef`, `EdgeType`, `EdgeStyle`
  - `TreeDef`, `TreeState`, `GroupDef`, `StatDef`, `LayoutConfig`
  - `RichContent`, `NodeContent`
  - Re-exports of `ErrorCode`, `YggdrasilError`, `isYggdrasilError`, `getErrorMessage` from `@yggdrasil-forge/common`
- `test:coverage` script in package.json template (and in `common` + `core` retroactively)

- `@yggdrasil-forge/core`: wave 2 type definitions
  - `Resource`, `Cost`, `Budget` (economy primitives)
  - `I18nConfig` (per-tree i18n configuration)
  - `UnlockCondition` (15 atomic types: node-based, resource-based, distance, tags, time, custom, etc.)
  - `UnlockRule` (AND/OR/NOT combinators + atomic conditions)
  - `UnlockCheck`, `UnlockExplanation`, `UnlockConditionEvaluation`
  - `EventMap` (15 events: unlock, lock, stateChange, budgetChange, statChange, progressChange, respec, buildLoaded, subtreeEntered, treeChanged, nodeExpired, externalProgressSynced, pluginError, error, auditEntry)
  - `Plugin`, `PluginAPI`, `PluginEngineHandle`, `PluginInstallResult`
  - `Hooks` (beforeUnlock/afterUnlock/beforeLock/afterLock/beforeRespec/afterRespec/computeUnlockability/computeCost)
  - `HookContext`, `ConditionEvaluator`, `PluginLogLevel`, `PluginPermission`
### Changed
- `scripts/create-package.mjs` now includes `test:coverage` in scaffolded packages

### Added
- `@yggdrasil-forge/common`: real content (constants, locales, i18n, errors)
  - `Locale`, `SupportedLocale`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `FALLBACK_LOCALE`, `isSupportedLocale`
  - `LocalizedString`, `resolveLocalized`, `interpolate`
  - `ErrorCode` enum (30+ codes covering engine, validation, storage, plugins, etc.)
  - `YggdrasilError` class with `code`, `context`, `cause`, `toJSON()`
  - `isYggdrasilError` type guard
  - `getErrorMessage` with localized messages in gl/es/en for all error codes
- 100% test coverage in `@yggdrasil-forge/common`

### Fixed
- lint-staged now processes the entire repo with Biome instead of file-by-file (fixes Windows command line length limit)
- Release workflow no longer attempts to publish to npm without NPM_TOKEN configured (avoids spurious red runs)
- Turbo `test` task now declares explicit empty outputs (silences warning)

### Added
- Created `@yggdrasil-forge/common` package (placeholder)
- Created `@yggdrasil-forge/core` package (placeholder, depends on common)
- Configured tsup for ESM + CJS dual builds across packages
- Configured TypeScript project references for incremental builds
- Per-package vitest configs that extend the root config
- Per-package tsconfig with composite mode
- Approved esbuild build scripts via `pnpm approve-builds`
- Vitest configured at workspace root with v8 coverage provider
- Smoke tests to verify Vitest installation
- GitHub Actions CI workflow (lint, format, typecheck, test)
- PR title validation workflow (enforces Conventional Commits)
- CI and License badges in README
- New scripts: `test:ui`, `test:coverage`, `format:check`
- Initial monorepo structure
- .gitattributes for cross-platform LF line endings
- .npmrc with hoisted node-linker (Windows compatibility)
- Turborepo telemetry disabled by default
- Approved build scripts for @biomejs/biome via pnpm allowBuilds
- TypeScript, Biome, and Turborepo configuration
- License (MIT) and contribution guidelines
- Master architecture document at `docs/architecture/MASTER.md`
- VS Code workspace settings and recommended extensions
- Husky git hooks (pre-commit lint-staged, pre-push typecheck)
- Environment check script (`pnpm check-env`)
- Refined Biome configuration with stricter rules
- Refined TypeScript configuration with extra safety options
- Additional npm scripts: `lint:fix`, `test:watch`, `fresh`, `validate`
- Configured `pnpm catalog` for shared devDependencies (tsup, vitest, etc.)
- Configured `@changesets/cli` with hybrid versioning (4 core packages linked, others independent)
- Created GitHub Actions release workflow (preparation, requires NPM_TOKEN to activate)
- Created `scripts/create-package.mjs` for consistent package scaffolding
- Created 15 placeholder packages following the standard template:
  - Core (linked): themes, react
  - Independent: storage, i18n, analytics, search, diff, exporters, importers,
    webhooks, stats, validators, heatmap, multitenancy, devtools, neo4j, cli


### Changed
- Removed root-level `__tests__/smoke.test.ts` (replaced by per-package smoke tests)
- Added tsup as devDependency per-package (required for pnpm workspace isolation)
- Renamed `docs/BRIEFINGS` to `docs/briefings` (kebab-case convention)
- Refined `turbo.json` with stream UI and test:watch task
- TypeScript: enabled `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `incremental`
- Refactored `common` and `core` packages to use catalog references
