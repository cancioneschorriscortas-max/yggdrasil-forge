# @yggdrasil-forge/core

## 0.2.0

### Minor Changes

- [`1bb3902`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1bb3902c0a295af91f74f0cb13ebb7c1854bb999) - feat(core): add optional `NodeDef.tiers` (per-rank label/description) with `NodeTierInfo` type and Zod validation (F9.1)

### Patch Changes

- [`155881b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/155881b013f8672d114b73c622e31c712f048f63) - docs(examples): total visual redesign of React demo with dragonborn theme + Cinzel typography + glow effects (examples-2-fix-visual)

- [`410dcb6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/410dcb66208d14ef9024137e57bb3d4a4442295e) - docs(examples): add interactive React demo with Vite + Stackblitz support (examples-2)

- [`36cd1f0`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/36cd1f0cf394877d4e5e60a637cefbb92c4215dd) - docs(readme): add "Why Yggdrasil Forge?" section to global README (readme-why)

## 0.1.0

### Minor Changes

- [`8de28f6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8de28f630e0eebdfddc09ed6d04c17ec7caa0f7c) - feat(core): add aggregate queries to TreeRegistry (sub-phase 6.2)

- [`760c11d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/760c11d4522df6c52d11901f2f05bfd9d9aeb97e) - feat(core): add Build serialization + URL share links (sub-phase 8.1)

- [`b1ee18d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b1ee18d3da98f231d7a638fa919aeb54daa20e8f) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Added INVALID_COST (YGG_V006) error code with localized messages (gl/es/en) for invalid resource cost amounts.
  ResourceManager now emits localized error messages via getErrorMessage() instead of hardcoded English strings.
  Strengthened ResourceManager tests to verify error codes and localization.

- [`35ac5d5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/35ac5d584cabd9473f642efa0045ee1816849d86) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add foundational types: Result, NodeDef, EdgeDef, TreeDef, RichContent. Re-export error utilities from common.

- [`05dbf46`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/05dbf46446cc6779830bd06613cd038304bbf19c) - Fixed: DT-10 — `unlock` now supports complete multi-tier semantics for
  nodes with `maxTier >= 2`. Consecutive `unlock` calls on the same node
  advance its tier until `currentTier === maxTier`, at which point it
  becomes `'maxed'`. Each tier transition emits `unlock`, `stateChange`
  and `budgetChange` events, and (when audit is enabled) records a
  `node_unlocked` audit entry with the achieved tier. Atomicity is
  preserved: if `applyCost` fails mid-sequence the state remains intact.

  Edge-case semantics are unchanged (decision: Option C):

  - `maxTier === undefined`: first `unlock` leaves the node in `'unlocked'`;
    any retry returns `NODE_ALREADY_UNLOCKED` (same as before).
  - `maxTier === 1`: first `unlock` transitions to `'maxed'`; retries
    return `NODE_ALREADY_UNLOCKED` (same as before).

  Multi-tier is therefore opt-in via an explicit `maxTier >= 2`.

- [`953cda7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/953cda7d0e7fc8fd68c9f666b6c1470fa406c7e2) - Add Federator class with mergeTreeDefs (4 strategies: namespace_all, first_wins, last_wins, manual) and detectConflicts (7 conflict types). Sub-phase 5.3, closes Phase 5.

- [`7d9458c`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7d9458cafdbd0b378868eae29bd9258ce075a006) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add TreeEngine constructor and synchronous getters; fix INVALID_COST to report real amount (DT-6)

- [`8c5347c`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8c5347c70d890c1e0c227b05af5d8163b7e12f89) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add wave 2 of foundational types: UnlockCondition/UnlockRule (15 atomic conditions, AND/OR/NOT combinators), Resource/Cost/Budget, I18nConfig, EventMap (15 events), Plugin interface with Hooks and PluginPermission.

- [`fae0e04`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/fae0e04459d9fe9676ec6d06afb361377189af22) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add DependencyGraph (configurable by edge type, BFS distances, transitive closures, shortest path, roots/leaves) and CycleDetector (DFS coloring, finds all cycles, cycle-containing-node queries). DependencyGraph implements DependencyGraphLike for UnlockResolver's distance_max.

- [`7e408d8`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7e408d85c4b357d20ef9ca264aa227c8258dfbac) - refactor: move StorageAdapter interface from @storage to @common (DT-21; hardening pre-0.1.0-alpha)

- [`b10f780`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b10f780a048fc2d6f660ff7a1aadd151051c1457) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add wave 3 of foundational types: Effect DSL, TimeConstraints (dual API: UTC ms + calendar with timezone), StatContribution, AuthConfig (registrable providers), ProgressSourceConfig, Build/BuildShareLink/BuildSnapshot, AuditEntry/AuditAction, TreeChange (with rename_node_id), EngineMetrics. Replace all unknown placeholders in NodeDef, TreeDef, TreeState, NodeInstance, EventMap with concrete types.

- [`0f9ab45`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/0f9ab453ce4a323ae4206c724962c09bc41cde06) - feat(core): add HookRunner standalone class (sub-phase 8.4.b.i)

- [`ad80454`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ad804548af77245ca0bdf0e97f248f108023872f) - feat(core): add Loadouts + Snapshots managers with opt-in storage (sub-phase 8.2)

- [`e435e5b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e435e5bff69c3472365c5c323c1da2d6b6c6583a) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add first engine primitives: typed EventEmitter (over EventMap), ConcurrencyGuard (serializes async operations with optional timeout), and internal utilities (deepClone, deepEqual, generateId, isPlainObject, clamp).

- [`ecb08e9`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ecb08e9499165b37b2ebdc1e67c16063a3694757) - feat(core): add PermissionChecker to TreeRegistry + fix save() error propagation (sub-phase 6.5)

- [`7adb1a2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7adb1a22287f5325d5f613fd7673de561c872515) - feat(core): connect PluginManager + HookRunner via PluginAPI (sub-phase 8.4.b.ii)

- [`df7c696`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/df7c69678c2a17ecb50297a5bb21fa2d7a5ad348) - feat(core): add PluginManager + 4 plugin APIs in TreeEngine (sub-phase 8.4.a)

- [`e52fc33`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e52fc33023368aac0296ffc490de0daf56f5e97c) - feat(core): add Quotas to TreeRegistry (sub-phase 6.4)

- [`2bee085`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2bee0856e521440d3395d01a7a1b77dfebb09ddc) - feat(core): complete read-only mode (block setProgress + restoreSnapshot + loadLoadout) — 🎯 FASE 8 PECHADA (sub-phase 8.8)

- [`9ce26dd`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/9ce26dda03093b3f3aa09f16cf1ac49388e8cea1) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add ResourceManager: immutable economy management (canAfford, atomic applyCost, refund with refundable/refundPercent/max handling, per-tier and cumulative cost calculation). Also adds missing test coverage for CycleDetector cycle normalization (DT-4).

- [`357b69b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/357b69b5ff8413617431085337a7857f77ec2e6a) - feat(core): extend engine.respec() with array nodeIds + costPercent option (sub-phase 8.3 REVISED)

- [`3fb3199`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/3fb31997cde92fb1b1637c9e1db9c965aa3c7259) - `TreeEngine.unlock` now automatically executes `nodeDef.effects` after a successful unlock, with full atomicity. If any effect fails, the entire unlock rolls back: the node state is restored, the budget is restored exactly to its previous value (independent of `refundable` flags), reversal events are emitted (`budgetChange`, `stateChange` with `reason: 'effect_failed'`, `lock`), and a compensating audit entry is recorded.

  Added single aggregated audit entry per unlock with effects: `custom` action with `name: 'effects_applied'` (on success, with per-effect detail) or `'effects_failed'` (on rollback, with failure context).

  Multi-tier semantics: effects execute on every tier transition.

- [`6d391c8`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/6d391c849ffda5e5abd27f40cc9a31455a29ccae) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Wire `StatComputer` into `TreeEngine` (sub-phase 2.2.b). New public API on `TreeEngine`:

  - `getStat(statId: string): number` — returns the aggregate value of a global stat, or `NaN` if the id is unknown.
  - `getAllStats(): Readonly<Record<string, number>>` — snapshot of every declared stat.

  The `StatComputer`'s cache is now invalidated automatically after every state-mutating operation: `unlock`, `lock`, `respec`, and `applyChanges`. Multi-tier unlocks invalidate per tier transition, so `perTier` contributions reflect the current tier on the next read.

  Internal change to `StatComputerContext`: replaced the captured `state: TreeState` field with `store: StateStore` so the computer reads the live snapshot via `store.getState()` on every computation. This is the minimal adjustment required for integration with Immer-backed mutations; the public surface of `StatComputer` is unchanged.

  Note: the `modify_stat` effect still returns `EFFECT_TYPE_UNSUPPORTED` (wrapped as `EFFECT_APPLICATION_FAILED` when reached through `unlock`, with `originalErrorCode: 'YGG_E013'` in the error context); the `EventMap.statChange` event remains declared but not emitted. Both are deferred to a future sub-phase that will tackle transient stat deltas with explicit storage semantics.

- [`ace8bcb`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ace8bcba25181670a5178e71c8b7a3fee749ab07) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add standalone `StatComputer` (sub-phase 2.2). Calculates aggregate values for global stats from the `statContributions` of unlocked nodes. Public API: `computeStat(statId)`, `computeAllStats()`, `explainStat(statId)`, `invalidate()`. Supports operations `+`, `-`, `*`, `/`, `min`, `max`, `set`; `perTier` multiplier based on `NodeInstance.currentTier`; optional `conditions?` evaluated as logical AND via `UnlockResolver`. Final `min`/`max` clamping is applied once after all contributions. Simple, fully-invalidable cache on `computeStat`; `explainStat` never uses the cache. Unknown `statId` returns `NaN` (no exceptions). Pathological math (e.g. division by zero) propagates as `Infinity`/`NaN` and is the tree designer's responsibility.

  Note: integration with `TreeEngine` (`getStat`, `getAllStats` getters) and wiring of the `modify_stat` effect (currently returning `EFFECT_TYPE_UNSUPPORTED`) is deferred to sub-phase 2.2.b, following the same standalone-then-integrate pattern used in 2.1 / 2.1.b.

- [`5d4cee5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5d4cee5d69ac860eaecff95a9274f497c9f7f099) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Wire `TimeManager` into `TreeEngine` (sub-phase 2.3.b), following the standalone-then-integrate pattern established in 2.1/2.1.b and 2.2/2.2.b. The engine now holds a `private readonly timeManager: TimeManager` instantiated after `statComputer`, fed by a virtual clock from `TreeEngineOptions.timeNow` (default `Date.now`).

  **Public API additions** on `TreeEngine`:

  - `tick(): TickResult` — evaluates all `unlocked`/`maxed` nodes that carry `timeConstraints` and transitions to `'expired'` any whose `expiresAt`/`expiresAtCalendar` has passed. For every transition: mutates `NodeInstance.state` (with a `history` entry), emits `stateChange` (with `from`, `to: 'expired'`, `timestamp`, `reason: 'expired'`), emits `nodeExpired(nodeId)`, records audit `{type: 'node_expired', nodeId}` with `rollbackable: false`, and invalidates the `StatComputer` cache. All transitions in a single `tick()` share the same `timestamp` captured once at the start via `evaluateAt`. Idempotent (a second consecutive `tick` with no state/clock changes is a no-op). No-op when the engine is `readOnly`.
  - `nextTickAt(): number | null` — returns the earliest UTC ms in the strict future at which some `unlocked`/`maxed` node with `timeConstraints` would transition (typically expire). Useful for the consumer to schedule its own `setTimeout(() => engine.tick(), delay)`. The engine itself **never** schedules anything internally: no `setTimeout`/`setInterval` is used, preserving determinism and SSR/Worker compatibility.
  - `TickResult` interface exported from `engine/index.ts` with `{expired: readonly string[], timestamp: number}`.

  **`canUnlock` is now temporal-aware**: between the existing state checks (`maxed`/`unlocked`/`expired`/`disabled`) and the prerequisites/cost checks, it consults `TimeManager.evaluate(nodeDef.timeConstraints)`. If `pending`, returns `allowed: false` with the new error code `NODE_NOT_YET_AVAILABLE` (YGG_E018). If `expired` (detected by `TimeManager` even though the stored state has not yet been transitioned by a `tick`), returns `allowed: false` with the pre-existing `NODE_EXPIRED`. `permanent` and `active` fall through unchanged.

  **`TreeEngineOptions.timeNow?: () => number`** — optional virtual-clock injection point. Tests and SSR/Worker contexts can supply a deterministic source; production code can omit it and use the `Date.now` default.

  **`@yggdrasil-forge/common`** ships the new `ErrorCode.NODE_NOT_YET_AVAILABLE = 'YGG_E018'` with localized messages in gl/es/en (placeholders `{nodeId}` and `{startsAt}` for the consumer to format).

  Out of scope (deliberate, see briefing): `cooldownMs`, `reCertifyAfterMs`, `validForMs` still ignored by `TimeManager` at runtime; the engine does not implement scheduling or polling; `lock`/`respec`/`applyChanges` are unchanged (no time-related cache to invalidate — `TimeManager` is stateless across calls).

- [`7d1f7b9`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7d1f7b9906722ca6fdf25dfaa2daf6312437f09b) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add standalone `TimeManager` (sub-phase 2.3). Evaluates temporal constraints of a node from the three supported window fields: `startsAt`, `expiresAt` (both UTC ms) and `expiresAtCalendar` (`{date, time, timezone}`, TZ-aware). Public API: `evaluate(constraints)`, `evaluateAt(constraints, atMs)`, `nextTransitionAt(constraints)`. Returns a discriminated `TimeStatus` with kinds `permanent` (no applicable constraints), `pending` (now < startsAt), `active` (within window, optionally with `expiresAt`) and `expired` (now >= effective expiry).

  Virtual clock is mandatory: `TimeManager` never calls `Date.now()` directly; the context supplies `now: () => number` (trivially mockable in tests and SSR-friendly). When both `expiresAt` and `expiresAtCalendar` are defined the calendar value wins (it is the more expressive representation; UTC ms is treated as redundant). The calendar-to-UTC conversion uses `Intl.DateTimeFormat` with a two-pass offset correction to handle DST transitions; invalid timezones or malformed date/time strings yield `NaN` and are treated as if the calendar field were absent. All non-finite numeric inputs (`NaN`, ±`Infinity`) are similarly treated as absent. The API is total: no exceptions, no `Result<>` wrappers.

  Out of scope for this sub-phase (declared in `TimeConstraints` but ignored at runtime): `cooldownMs`, `reCertifyAfterMs`, `validForMs`. These require additional state modeling (e.g. `lastUnlockedAt`) and will be addressed in a later sub-phase. `TimeManagerOptions` is accepted by the context but only its presence matters here; the semantics of `enabled`, `checkIntervalMs`, `leadTimeMs` and `timezone` belong to the scheduling layer.

  Note: integration with `TreeEngine` (auto-marking nodes as `'expired'`, emitting `EventMap.nodeExpired`, writing `AuditAction.node_expired`, scheduling checks via `setTimeout`) is deferred to sub-phase 2.3.b, following the same standalone-then-integrate pattern used in 2.1 / 2.1.b and 2.2 / 2.2.b.

- [`a346888`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/a3468889ae55187e480309472332d10beaa06c71) - Expose the `ProgressManager` API on `TreeEngine` (sub-phase 2.4.b), following the standalone-then-integrate pattern established in 2.1/2.1.b, 2.2/2.2.b and 2.3/2.3.b. The engine now holds a `private readonly progressManager: ProgressManager` instantiated after `timeManager` in the constructor.

  **Public API additions** on `TreeEngine`:

  - `setProgress(nodeId, percent): Result<ProgressUpdateResult>` — delegates to `ProgressManager.setProgress`. Validates that the node exists, has `supportsProgress: true`, has `progressSource: { type: 'manual' }`, and that `percent` is finite in `[0, 100]`. Idempotent when `oldPercent === newPercent`. Emits `progressChange` and records audit `{type: 'progress_updated', nodeId, from, to}` with `rollbackable: true`.
  - `getReachedMilestones(nodeId): readonly number[]` — delegates to `ProgressManager.getReachedMilestones`. Returns the milestones in `progressMilestones` that are `<= current progress`.

  **Refactor of existing method**: `getProgress(nodeId): number` (originally from sub-phase 1.12) is now a delegate to `ProgressManager.getProgress` instead of reading directly from the store. Observable behavior is identical: unknown nodes → 0, instances without `progress` → 0, instances with progress=X → X. The change centralizes all progress reads in a single piece, avoiding drift between two implementations. Regression tests in `TreeEngine.progress.test.ts` document the preserved contract.

  **Cero auto-unlock** (decision §5.4): `setProgress(nodeId, 100)` does **not** unlock the node. The consumer who wants that behavior implements it externally combining `setProgress` + `canUnlock` + `unlock`.

  **Cero `NodeInstance.state` mutation** (decision §5.5): `setProgress` never changes `state`. State transitions remain the exclusive responsibility of `unlock` / `lock` / `respec` / `tick` / `applyChanges`. The `'in_progress'` state declared in `NodeState` is **not** used by this sub-phase (its semantics are deferred to a future sub-phase that defines entry/exit conditions).

  **`respec` preserves `progress`** (decision §5.8): a node that was unlocked → `setProgress(50)` → `respec` keeps `getProgress(nodeId) === 50`. Rationale: `progress` is semantic data ("I already did 50% of this exercise") that may want to be preserved across respec. The consumer who wants to reset chooses to call `setProgress(nodeId, 0)` explicitly afterward. **This decision needs no change to `respec`** — the current implementation simply does not touch `progress`.

  Out of scope (deliberate, see briefing 2.4.b):

  - `computed` progress source still rejected with `PROGRESS_SOURCE_UNSUPPORTED`; assigned to **sub-phase 2.4.c**.
  - Cero modifications to `unlock` / `lock` / `respec` / `tick` / `applyChanges` / `canUnlock`.
  - Cero new error codes (the three added in 2.4 cover all integration cases).
  - Cero changes to `@yggdrasil-forge/common`.

- [`cfafc76`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cfafc76e2b747e03d504fefb838c077c12b5ff87) - Add **`computed` progress source** to `ProgressManager` (sub-phase 2.4.c). A node with `progressSource: { type: 'computed', dependsOn, formula }` derives its progress dynamically from a formula (`sum`/`avg`/`min`/`max`) over the progress of other nodes. Sub-phase 2.4 implemented only `manual`; sub-phase 2.4.b wired the manager into `TreeEngine`; this sub-phase completes the second supported source.

  **Public behavior changes**:

  - `engine.getProgress(nodeId)` now returns the dynamically-computed value for nodes with `progressSource.type === 'computed'`. Always clamped to `[0, 100]`. The value is **not** persisted to `NodeInstance.progress`; it recomputes on each call.
  - `engine.setProgress(nodeId, percent)` on a `computed` node now returns `err` with the new error code `INVALID_PROGRESS_OPERATION` (YGG*E022). Previously returned `PROGRESS_SOURCE_UNSUPPORTED` (YGG_E020) along with the other unsupported sources; now `computed` is distinguished because it is a node that \_could* have a progress value but it derives, not is set.
  - `engine.getReachedMilestones(nodeId)` automatically works for computed nodes because it internally calls `getProgress`.

  **`@yggdrasil-forge/common`** ships one new error code with localized messages in gl/es/en:

  - `INVALID_PROGRESS_OPERATION = 'YGG_E022'`

  **Subtle behavior change for non-supported sources** (decision §5.6, option B1 of architect): `getProgress` now returns `0` for nodes with `progressSource` of type `remote`/`callback`/`event` (or missing), **ignoring whatever may be in `NodeInstance.progress`**. Previously (in 2.4 and 2.4.b) it returned the state value regardless of `progressSource`. This change improves semantic coherence: "if we don't know where the progress comes from, return 0 without throwing". No existing test was affected (all tests used `manual`); new explicit tests document the contract.

  **Algorithm**:

  - **Resolution**: recursive `computeProgressFor(nodeId, inProgressSet)`. For each existing `depId` in `dependsOn`, recursively resolve its progress. Non-existent deps are filtered upstream before applying the formula (important for `min`/`max` — treating a ghost as 0 would contaminate the result).
  - **Empty effective list** (after filtering or declared `[]`): returns `0` for all formulas (avoids `NaN`, `Infinity`).
  - **Clamp**: result always in `[0, 100]`. `sum` is the only formula that can naturally exceed (e.g. two deps at 80 → 160 → 100); `min`/`max`/`avg` on values in `[0, 100]` already are, but the clamp is defense in depth.
  - **Cero cache** (§5.2): each `getProgress` call recomputes. Cache invalidation would be a known source of bugs; performance is fine because typical `dependsOn` length is small. Future optimization deferred.
  - **Cycle detection** (§5.4): lazy, via a `Set<string>` passed through recursive calls. On detected cycle, the branch returns `0` silently (no exceptions). Self-references (`A = [A]`), pairs (`A↔B`), and chains (`A→B→C→A`) all handled. Lateral non-cyclic branches in the same tree compute correctly.
  - **Cero `NodeInstance.progress` persistence for computed** (§5.1): the derived value is never written. `JsonSerializer` needs no changes; deserialization simply triggers recomputation.

  **Cero events for computed** (§5.10): `progressChange` is **not** emitted for computed nodes when their derived value changes due to a dependsOn mutation. Reason: cascading events would require detecting all computed nodes that depend (transitively) on the mutated node, and chained event lifecycles are a known source of bugs. **Recommended consumer pattern**: listen to `progressChange` for `manual` nodes and re-query `getProgress` for the computed nodes that depend on them. Documented in the `ProgressManager.ts` header.

  **Cero auto-unlock for computed**: maintains the decision from 2.4 §5.7. `setProgress` (only valid for `manual`) never mutates state. A computed node reaching 100 derived doesn't trigger anything.

  **Out of scope (deliberate, deferred to future sub-phases)**:

  - `remote` / `callback` / `event` progress sources still rejected with `PROGRESS_SOURCE_UNSUPPORTED` (Phase 5).
  - **`progress_min` condition in `UnlockResolver` does not consult derived values of computed nodes**. `UnlockResolver` reads `NodeInstance.progress` directly via its private `getProgress` method, which never goes through this `ProgressManager`. After 2.4.c, a `progress_min` condition pointing at a `computed` node still reads `0` (since computed never persists). **Known limitation; arranged for sub-phase 2.4.d** which requires careful analysis of the potential circular dependency between `UnlockResolver` and `ProgressManager` (the former currently _is_ used by the latter for `unlock` conditions; reversing the relationship would create a cycle that needs architectural resolution). Decision U2 of architect: do not block 2.4.c on this.
  - Zod validation over `dependsOn` (existence, no cycles): deferred to a future validator-hardening sub-phase. Defensive handling (filter inexistent, lazy cycle detection) at runtime is sufficient for now.
  - Cero modifications to `TreeEngine.ts` (§5.9): the three public methods added in 2.4.b are delegates and automatically reflect the new behavior of `ProgressManager`. No new public API on the engine.
  - Cero modifications to `JsonSerializer.ts`: computed values are not persisted.
  - Cero modifications to `types/progress.ts` or `types/node.ts`: all type infrastructure already existed.

- [`c918324`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c9183248bad8bc7f92bc2d3fc23cc5e98dce847a) - Wire `UnlockResolver` to `ProgressManager` via an optional context field (sub-phase 2.4.d). This closes the limitation flagged in 2.4.c: `progress_min` conditions in `canUnlock` now consult the dynamically-derived value of `computed` progress sources.

  **Public API changes**:

  - `UnlockResolverContext` gains an optional `progressManager?: ProgressManagerLike` field.
  - New exported interface `ProgressManagerLike` from `UnlockResolver.ts` — minimal structural type `{ getProgress(nodeId: string): number }`. The concrete `ProgressManager` class satisfies it automatically by TypeScript structural typing; **no changes were needed in `ProgressManager.ts`**.

  **Behavior changes**:

  - When `UnlockResolverContext.progressManager` is present, the resolver's internal `getProgress` (used to evaluate `progress_min` conditions) delegates to it instead of reading `state.nodes[nodeId]?.progress` directly. For nodes with `progressSource: { type: 'computed' }`, this means `progress_min` now reads the live derived value (sum/avg/min/max of dependsOn) instead of always reading 0.
  - `TreeEngine` now passes `progressManager: this.progressManager` in the two `UnlockResolverContext` instances it constructs: in `canUnlock` (direct prerequisite check) and in the cascade re-evaluation inside `applyChanges`.

  **Compatibility**: the field is **optional**. Any consumer building `UnlockResolverContext` manually without it (isolated tests, plugins not using the engine) still gets the legacy behavior. Zero regression: all 837 preexisting tests pass unchanged.

  **Known limitation deferred to sub-phase 2.4.e** (asymmetry intentionally documented as observable contract):

  - `EffectsRunner.applyConditional` and `StatComputer.computeStatDef` each construct their own `UnlockResolverContext` without `progressManager` (these pieces don't currently have access to the engine's `ProgressManager`). Consequently:
    - An `Effect` of `type: 'conditional'` whose `condition` is `progress_min` over a `computed` node will read 0 from the computed node and pick the `else` branch even if the derived value would have satisfied the threshold.
    - A stat contribution gated by `progress_min` on a computed node will likewise read 0.
  - These two paths require extending `EffectsRunnerContext` and `StatComputerContext` to carry `progressManager`, plus propagating it from `TreeEngine` at construction time. Assigned to sub-phase 2.4.e.
  - A regression test in `TreeEngine.progress.test.ts` documents this intermediate behavior as an observable contract, so that a future change cannot accidentally "fix" it without explicit awareness.

  **Tests**: 15 new tests total. 10 isolated tests in `UnlockResolver.progress.test.ts` (delegate vs fallback, mock `ProgressManagerLike`, explain consistency). 5 integration tests in `TreeEngine.progress.test.ts` (computed satisfying `progress_min`, computed below threshold, cycle, manual regression, asymmetry-against-EffectsRunner). Total core: 837 → 852.

  **Coverage**: `UnlockResolver.ts` 100/100/100/100 (maintained); `ProgressManager.ts` 100/100/100/100 (maintained); global 98.21% (= 2.4.c baseline, unchanged).

  **Out of scope** (deliberate):

  - Cero changes to `ProgressManager.ts` (structural typing makes it unnecessary).
  - Cero changes to `@yggdrasil-forge/common` (no new error codes).
  - Cero changes to `packages/core/src/types/` (no type infrastructure needed).
  - Cero changes to `engine/index.ts` (`ProgressManagerLike` is consumed only inside `UnlockResolver` and via the `UnlockResolverContext`; tests import it directly from `UnlockResolver.js`).
  - Cero modifications to `EffectsRunner.ts` or `StatComputer.ts` (assigned to 2.4.e — see asymmetry above).
  - Cero auto-unlock for nodes reaching 100% (decision 2.4 §5.7 maintained).

- [`9afd412`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/9afd41277b5b75a86e52f3f894844964025646f9) - Close the asymmetry documented in 2.4.d (sub-phase 2.4.e). `EffectsRunner` and `StatComputer` now consult `ProgressManager` for `progress_min` conditions, so a `progress_min` apuntando a un nodo `computed` funciona **uniformemente** en `canUnlock`, en effects `conditional` e en stat conditional contributions.

  **Public API changes (additive)**:

  - `EffectContext` gains an optional `progressManager?: ProgressManagerLike` field.
  - `StatComputerContext` gains an optional `progressManager?: ProgressManagerLike` field.
  - Both interfaces import `ProgressManagerLike` from `./UnlockResolver.js` (no new exports, no changes to common, no new error codes).

  **Behavior changes**:

  - `EffectsRunner.applyConditional` constructs `UnlockResolverContext` propagating `this.context.progressManager`. An effect of `type: 'conditional'` whose `condition` is `progress_min` over a computed node now correctly evaluates against the derived value (sum/avg/min/max) instead of always reading 0.
  - `StatComputer.computeStatDef` constructs `resolverCtx` propagating `this.context.progressManager`. A stat contribution gated by `progress_min` on a computed node is now applied or skipped correctly.
  - `TreeEngine` constructor reordered: `ProgressManager` is now instantiated immediately after `audit`, before `EffectsRunner` and `StatComputer`. This is required so that the two consumer pieces can receive `progressManager` as a field in their respective contexts at construction time. The reordering is safe because `ProgressManagerContext` only requires `{ treeDef, store, events, audit, locale }` — all available before `effectsRunner`/`statComputer`/`timeManager` construction.

  **Bug latente 2.4.b corrixido como parte de 2.4.e**:

  - `TreeEngine.setProgress` previously did **not** invalidate `StatComputer.cache` after a successful mutation. This was invisible in 2.4.b/c/d because `StatComputer` always read 0 for computed nodes, so mutating a `manual` source that feeds a `computed` node had no observable effect on stat conditional contributions. **In 2.4.e**, with `StatComputer` finally seeing derived values, the stale cache became visible. Fixed: `setProgress` now calls `this.statComputer.invalidate()` after a successful update. Invalidation is gated on `result.ok` to preserve the engine's atomic semantics (no invalidation on failed operations). All six public mutators that touch state (`unlock`, `lock`, `respec`, `applyChanges`, `tick`, `setProgress`) now invalidate; before 2.4.e, `setProgress` was the only omission.

  **Compatibility**: the new context fields are optional. Any consumer building `EffectContext` or `StatComputerContext` manually without `progressManager` (isolated tests, mocks, plugins) still gets the legacy behavior via `UnlockResolver`'s fallback (`state.nodes[nodeId]?.progress ?? 0`). Cero regresión sobre os 852 tests previos: todos pasan sen modificación.

  **Test updates**:

  - The "asimetría coñecida 2.4.d" test in `TreeEngine.progress.test.ts` was renamed to "asimetría 2.4.d pechada en 2.4.e" and its assertions inverted: the effect conditional with `progress_min(computed, 50)` and `C=80` now correctly chooses the `then` branch.
  - Two new tests added: a negative case for the effect conditional (`C=30` → `else` branch correctly) and a parallel case for `StatComputer` conditional contributions (verifies both the positive and negative branches plus the bug-fix above: cambio de `A` actualiza `power` correctamente).

  **Out of scope (deliberate)**:

  - Cero changes to `UnlockResolver.ts` (its 2.4.d wiring is enough; `progress_min` resolution is unchanged).
  - Cero changes to `ProgressManager.ts` (structural typing makes it unnecessary).
  - Cero changes to `@yggdrasil-forge/common` (no new error codes).
  - Cero changes to `packages/core/src/types/` or `engine/index.ts`.
  - The family 2.4.\* is now functionally complete: progress (manual + computed) is integrated uniformly across the engine.

- [`1774a81`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1774a8166f98ce21de644cfe24a237ae2995f942) - Add `ProgressManager` as a standalone engine piece (sub-phase 2.4), following the same pattern established by `EffectsRunner` (2.1), `StatComputer` (2.2) and `TimeManager` (2.3). Scope is deliberately narrow: **only the `manual` progress source is supported**. The other four sources declared in `types/progress.ts` (`remote`, `callback`, `event`, `computed`) are rejected with a typed error and remain assigned to later sub-phases (2.4.b for `computed`; Phase 5 for the I/O-bound ones).

  **Public API** (exported from `engine/index.ts`):

  - `class ProgressManager` with three methods:
    - `setProgress(nodeId, percent): Result<ProgressUpdateResult>` — validates in strict order (NodeDef exists → `supportsProgress === true` → `progressSource.type === 'manual'` → `percent` finite and in `[0, 100]`), is idempotent when `oldPercent === newPercent` (no event, no audit, no state mutation), tolerates regressions (`setProgress(80)` then `setProgress(40)` is permitted; `crossedMilestones` returns empty on a decrease), computes `crossedMilestones` as the set of `progressMilestones` in the open-closed range `(oldPercent, newPercent]` on increases, and creates a minimal `NodeInstance` with `state: 'locked'` when none exists yet.
  - `getProgress(nodeId): number` — defensive lookup; returns 0 for unknown nodes or for instances with no `progress` value.
  - `getReachedMilestones(nodeId): readonly number[]` — filters `progressMilestones` by `m <= progress`; preserves the order declared in the `TreeDef` (sort is the validator's responsibility).
  - Types `ProgressManagerContext` and `ProgressUpdateResult` are exported alongside.

  **`@yggdrasil-forge/common`** ships three new error codes with localized messages in gl/es/en:

  - `PROGRESS_NOT_SUPPORTED = 'YGG_E019'`
  - `PROGRESS_SOURCE_UNSUPPORTED = 'YGG_E020'`
  - `INVALID_PROGRESS_VALUE = 'YGG_E021'`

  `NODE_NOT_FOUND` (the fourth code originally contemplated in the briefing) **already existed** as `YGG_E001` and is reused.

  **Cero auto-unlock, cero state mutation**: `setProgress` never mutates `NodeInstance.state` under any circumstance. `percent === 100` does **not** transition a node to `'unlocked'`; `percent > 0` does **not** transition to `'in_progress'`. State transitions remain the exclusive responsibility of `unlock` / `lock` / `respec` / `tick` / `applyChanges`. Consumers wanting "auto-unlock at 100%" implement it in three lines in their own wrapper after `setProgress` returns (documented in the file header).

  **Cero scheduling, cero polling, cero async handlers**: the manager is fully synchronous and deterministic. No `setInterval`, no `setTimeout`, no registered listeners. Same philosophy as `TimeManager`.

  **Audit shape**: the `progress_updated` action already declared in `types/audit.ts` carries `{type, nodeId, from, to}` with `rollbackable: true`. `crossedMilestones` is **not** persisted to the audit log (it is not part of the declared `AuditAction` variant); consumers receive it in the `ProgressUpdateResult` returned from `setProgress`.

  Out of scope (deliberate, see briefing 2.4):

  - Other progress sources (`remote`/`callback`/`event`/`computed`) — rejected with `PROGRESS_SOURCE_UNSUPPORTED`.
  - Auto-unlock on `percent === 100` (decision §5.7).
  - Integration with `TreeEngine` — `engine.setProgress` / `engine.getProgress` / `engine.getReachedMilestones` are deferred to sub-phase 2.4.b. The standalone piece can already be wired manually by a consumer that builds its own `ProgressManagerContext`.
  - Zod validations over `progressMilestones` (range / ordering) in `TreeDefValidator` — deferred to a future validator-hardening sub-phase.

- [`8555542`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/855554236d5bc8b6aa92729a6cb4408636d12b22) - Sub-phase 2.5 — hardening do `treeDefSchema` (Zod) na fronteira. Engade as 10 validacións pendentes documentadas durante a Fase 2, sen romper APIs e sen tocar pezas do motor.

  **Validacións por campo (no `nodeDefSchema` e `costSchema`)**:

  - `maxTier > 0` (`.positive('maxTier debe ser maior que 0')`).
  - `tier > 0` (`.positive('tier debe ser maior que 0')`).
  - `cost.amount > 0` (`.refine`).
  - `progressMilestones[i]` ∈ `[0, 100]` (`.refine`).
  - `progressMilestones` ordenado estrictamente ascendente sen duplicados (`.refine`).

  **Validación cross-field (no `nodeDefSchema` enteiro, `.refine` despois do `z.object`)**:

  - Se `progressSource` está definido, `supportsProgress` debe ser `true`.

  **Validacións cross-node (no `treeDefShapeSchema.superRefine`)**:

  - `progressSource.computed.dependsOn[j]` apunta a un nodo existente. Path: `['nodes', i, 'progressSource', 'dependsOn', j]`.
  - `prerequisites` (recursivo sobre `UnlockRule`, incluíndo combinadores `all`/`any`/`none` e condicións `node_unlocked`/`node_maxed`/`node_state`/`tier_min`/`progress_min`/`distance_max`/`stat_min`) referencia nodos/stats existentes. Path: `['nodes', i, 'prerequisites', ...]`.
  - `exclusions[j]` referencia nodos existentes. Path: `['nodes', i, 'exclusions', j]`.
  - `edges[i].source` e `edges[i].target` referencian nodos existentes. Path: `['edges', i, 'source'|'target']`.

  **Out of scope (deliberate)**:

  - Cero `ErrorCode` novo: reutiliza `INVALID_TREE_DEF` (YGG_V001). Cero cambios en `@yggdrasil-forge/common`.
  - Cero modificación de pezas do motor (decisión §5.1 do briefing): `TreeEngine`, `ProgressManager`, `EffectsRunner`, `StatComputer`, `UnlockResolver`, `TimeManager`, `JsonSerializer` e `TreeDefValidator` quedan intocados. `JsonSerializer.fromJSON` xa delega no validador, polo que herda automaticamente as validacións novas sen tocar código.
  - Cero modificación de `packages/core/src/types/` nin de `engine/index.ts`.
  - Cero detección de ciclos en `prerequisites`/`dependsOn` (§5.5 do briefing): asignada a fase pedagóxica posterior (8.7); o motor segue defensivo en runtime.

  **Asimetría deliberada validador-motor (§5.1)**:

  - Entrada externa (`validateTreeDef`, `JsonSerializer.fromJSON`) rexeita `TreeDef` inválidas.
  - Construción directa de `TreeDef` en código (uso típico en tests unitarios) non pasa polo validador; o motor mantén comportamento defensivo interno.

  **Notas sobre o contrato real de `EdgeDef`**: o briefing menciona `edges.from/to` por analoxía; o contrato (`types/edge.ts`) usa `source` e `target`, e así se sinala nos `path` dos issues.

  **Test additions**: 22 tests novos en `TreeDefValidator.test.ts` (10 positivos + 10 negativos das validacións 1-10, máis 2 extra para cubrir ramas `distance_max` e `stat_min` do helper recursivo). Tests do paquete `core`: 854 → 876. Cobertura: `treeDefSchema.ts` 95.83/89.06/94.44/98.83; global 98.13% (vs baseline 2.4.e 98.22%; lixeira baixa explicada por ramas defensivas do helper recursivo de Zod que non se exercen).

- [`f97b467`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/f97b46767c6dff3e34ba2a70f695a4e35d3f6ffc) - feat(core): add migration system with AutoBackup (sub-phase 3.5)

  Sistema de migracións de schema en `@yggdrasil-forge/core/engine/migrations/`: `Migration` interface (segundo MASTER §22), `MigrationRegistry` para rexistrar migracións, `MigrationRunner` con resolución de path greedy (salto máximo) e detección defensiva de ciclos, `AutoBackup` safety net que persiste estado pre-migración nun `BackupStorage` inxectado. `JsonSerializer.deserializeAsync` función nova que acepta `MigrationRegistry` opcional; cando presente e `schemaVersion` non coincide, intenta migrar antes de validar. `deserialize` sync mantense intacta (Caso B). Cero ErrorCodes novos: `MIGRATION_FAILED` e `NO_MIGRATION_PATH` xa existían en common.

- [`2a12ef7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2a12ef7a94b63c6f9bbfdc4e789780efe3e08293) - feat(core): add Reconciler base with refundRemovedNodes (sub-phase 3.6.a)

  Reconciler base en `@yggdrasil-forge/core/engine/reconciler/`: función pura `reconcile(oldTreeDef, newTreeDef, oldTreeState, options, locale?)` para reconciliar saves contra TreeDefs modificadas (MASTER §23). `ReconcileOptions`, `ReconcileChange` e `ReconcileResult` types exportados. ErrorCode `RECONCILE_TREE_MISMATCH = YGG_R001` con mensaxes en gl/es/en. Esta sub-fase implementa só `refundRemovedNodes` das catro opcións; as outras tres serán efectivas na 3.6.b.

- [`ccf9187`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ccf9187fd68aa729111a5e0a562c0f0329d96f74) - feat(core): complete Reconciler with 3 remaining options (sub-phase 3.6.b)

  Reconciler completo: tres opcións pendentes da `ReconcileOptions` agora implementadas. `grandfatherIncreasedCosts`: emite `cost_grandfathered` cando o custo dun nodo unlocked subiu, sen modificar estado. `refundDecreasedCosts`: emite `cost_decreased_refunded` e devolve a diferenza ao budget cando o custo baixou. `invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'`: tres políticas para nodos cuxos prerequisites xa non se cumpren co estado actual. ATENCIÓN: 'preserve' rompe invariantes do engine; emite `prereq_failure_preserved` para auditoría. 5 tipos novos en `ReconcileChange`. Reutilización de `UnlockResolver` para avaliación de prereqs. Orde de aplicación: refunds primeiro, prereqs último.

- [`0bcc66d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/0bcc66dd1f202f209333e244bc11f1555926b73c) - Add LayoutEngine base with IdentityLayout (sub-phase 4.1)

- [`b9eef4c`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b9eef4c8baa7da8f7891991160ab42591c023607) - Add RadialLayout and MeshGenerator (sub-phase 4.2)

- [`2006f87`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2006f879422369a325d1cfb3414c285d3c7af178) - Add TreeLayout with Buchheim algorithm (sub-phase 4.3)

- [`e31ec1f`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e31ec1f2f46aa7fc6e1ebcadf99d41c3d5d4a947) - Add PathBuilder, BoundsCalculator and QuadTree (sub-phase 4.5)

- [`1f7de89`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1f7de89abd7f231f777e851add4900b4df91d86e) - Integrate SubtreeManager with TreeEngine (sub-phase 5.2): getSubtreeEngine, enterSubtree with auto-sync, initialState support, cycle detection propagation, TreeEngineFactoryContext.

- [`2fd2e6a`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2fd2e6a172d462d685f4d3f6353a01b4832e006e) - Add SubtreeManager standalone (sub-phase 5.1): lazy sub-engine lifecycle, cache, depth check, cycle detection, mergeTreeDefWithOverrides helper, TreeEngineFactory type.

- [`6719059`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/671905999db6fa000484f645ecc049ca88a4e18e) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add ChangeTracker: pure analyzer of TreeChange[] arrays. Produces selective cache invalidation, affected node IDs, internal conflict detection (duplicates, add_then_remove, rename chains, etc.), and rename mappings.

- [`2e1b9cb`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2e1b9cb9946eb3d02b838f198d7a8ba54f7c284e) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add TreeEngine unlock/lock/respec mutations (sub-fase 1.13).

  - Fixed DT-7: removed unreachable dead branch in `ResourceManager.applyCost`; simplified `aggregateCosts` to never return `null`
  - Added result types: `UnlockResult`, `LockResult`, `RespecResult` (exported from `@yggdrasil-forge/core`)
  - Wired `EventEmitter`, `ResourceManager`, `UnlockResolver` into `TreeEngine` constructor
  - Added `canUnlock(nodeId): Result<UnlockCheck>` synchronous check
  - Added `unlock(nodeId): Promise<Result<UnlockResult>>` with validation, cost, state change, events
  - Added `lock(nodeId): Promise<Result<LockResult>>` with refund, state change, events
  - Added `respec(nodeId?): Promise<Result<RespecResult>>` with cascade detection and atomic state update
  - Added `on`/`off` public event subscription methods

- [`2ddc511`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2ddc511c8680324ba7bdc33e8b12bd743e856123) - Add TreeRegistry class with build management and cache strategies (sub-phase 6.1)

- [`5baefa6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5baefa6df0ee26838f4f42f12b6783d0e66db995) - feat(core): integrate plugin hooks in TreeEngine unlock/lock/respec/canUnlock (sub-phase 8.4.c)

- [`580f53f`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/580f53f8e79563fbeb8008a1791a4af22c0eba2e) - feat(validators+core): 3 complex rules + TreeEngine.validatePedagogically integration (sub-phase 8.7.b)

- [`a7d0a02`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/a7d0a02c5d4bf7978eb0265c51b427fdd1794c39) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add StateStore: mutable state container with Immer, integrated cache versioning (4 cache types), and subscription system compatible with useSyncExternalStore.

- [`79ba574`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/79ba574adbc8be2649167e89dba4949a12859617) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add UnlockResolver: stateless evaluator of UnlockRules. Supports all 15 atomic conditions, all/any/none combinators, evaluate() for fast boolean and explain() for detailed localized feedback. Accepts injected DependencyGraph (for distance_max) and custom evaluators registry.

- [`b913aae`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b913aae47370495617522a0c34f34e01742a9d22) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add TreeEngine.applyChanges and two new Engine error codes (sub-fase 1.14).

  - Added INVALID_NODE_STATE (YGG_E011) error code with localized messages (gl/es/en) for invalid node-state operations (DT-8)
  - Added CHANGE_CONFLICT (YGG_E012) error code with localized messages (gl/es/en) for internally inconsistent change lists
  - Fixed DT-8: `TreeEngine.lock` and `TreeEngine.canUnlock` now use semantically correct codes (INVALID_NODE_STATE / NODE_EXPIRED) instead of INVALID_NODE_DEF
  - Added `ApplyChangesResult` type (exported from `@yggdrasil-forge/core`)
  - Added `applyChanges(changes): Promise<Result<ApplyChangesResult>>`: atomic (all-or-nothing) runtime TreeDef mutation covering all 12 TreeChange variants, with internal-conflict detection (delegated to `analyzeChanges`), structural validation against the current TreeDef, NodeInstance reconciliation (add/remove/rename/clamp), cache invalidation and `treeChanged`/`stateChange` events
  - On internal conflicts, returns CHANGE_CONFLICT; the localized message describes the first conflict and the error context carries all conflicts for telemetry
  - Added tests for applyChanges (no-op, readOnly, apply, reconciliation, internal conflicts, validation, events)

- [`d91996e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/d91996e171334e1058406a75a3852dbc1f089f7c) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add AuditLogger and TreeEngine audit integration (sub-fase 1.16).

  - Added `AuditLogger` engine class: in-memory audit log with `record`, `query`, `clear`, `size`. Disabled by default (zero overhead when unused); circular FIFO cap (configurable `maxEntries`, default 1000); monotonic `audit-<n>` ids; `Date.now()` timestamps (documented future injection point)
  - Added `TreeEngineOptions.audit` config: `{ enabled?: boolean (default false); maxEntries?: number (default 1000) }`
  - Added `TreeEngine.getAuditLog(filter?)`: returns a filtered copy (by `actor`, `action.type`, inclusive `from`/`to` timestamp range, `limit`); most-recent-first; synchronous
  - Added `TreeEngine.clearAuditLog()`: empties the audit log
  - Added `TreeEngine.logAudit(action, opts?)`: manual API for `custom`/own actions; no-op when audit disabled; emits `auditEntry` when an entry is created
  - Automatic recording after the 4 successful mutations only (NOT on errors): `unlock` → `node_unlocked` (rollbackable), `lock` → `node_locked` (rollbackable), `respec` → `respec`, `applyChanges` → `tree_changed`; each emits the `auditEntry` event
  - Mutation logic and Result values unchanged; recording is purely additive
  - Added unit tests (`AuditLogger.test.ts`) and integration tests (`TreeEngine.audit.test.ts`): disabled/enabled behaviour, unique ids, FIFO eviction, actor/type/range/limit filters, clear, automatic recording for the 4 mutations, errors not recorded, `auditEntry` event, manual `logAudit`, `maxEntries` via options (zero `any`)

- [`ac823e6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ac823e6c8de4b4f6f88bcf6cfa1c003bb0ebb12c) - Add structural validation and JSON serialization for TreeDef (sub-phase 1.17). New `treeDefSchema` (Zod) reflecting the `TreeDef` type, `TreeDefValidator.validateTreeDef` returning `Result<InferredTreeDef>` with serializable Zod issues, deterministic `JsonSerializer` (`serialize`/`deserialize`) with schema versioning, and `TreeEngine.fromJSON`/`toJSON`. Adds the `zod` dependency (^3) to core only. Structural validation only — no pedagogical rules (Phase 8) and no schema migration.

- [`c3410e2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c3410e26310bfb6ba72428914e23a75a1eef8040) - Add selectors and selective subscription to TreeEngine (sub-fase 1.15).

  - Added `Selector<T>` type (exported from `@yggdrasil-forge/core`)
  - Added `createSelector` pure utility: reselect-style memoized selector factory with last-args cache (size 1) and referential input equality; typed via overloads for 1-3 input selectors plus a combiner (zero `any`)
  - Added `shallowEqual` pure helper (one-level shallow comparison) for optional use as a custom `equalityFn` (NOT the default; default stays `Object.is`)
  - Added `TreeEngine.select<T>(selector): T`: synchronous pure read of a derived slice of the current snapshot; selector exceptions propagate (not captured)
  - Added `TreeEngine.subscribeWithSelector<T>(selector, listener, options?)`: subscribes to the global store but only invokes `listener(selected, previous)` when the selected value changes per `equalityFn` (default `Object.is`); supports `fireImmediately`; returns an `Unsubscribe`
  - Added tests for `createSelector` (memoization, recompute, multi-input), `shallowEqual`, `select`, `subscribeWithSelector` (no-change/change/fireImmediately/custom equalityFn/unsubscribe/(selected, previous) ordering) and `getSnapshot` reference stability

### Patch Changes

- [`8bc4900`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/8bc490050257b4165f5ac45f946543e6dfc4e5ed) - docs(master): close Fase 8 officially + consolidate 5 structural lessons + update counters (sub-phase doc-8)

- [`21ca51b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/21ca51ba0a66b00687f74c3a442bddae12aa988e) - docs(examples): fix prerequisites in node-basics example + capture structural lesson (examples-1-fix)

- [`a9c9909`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/a9c9909a7266ace15112d8649e2c8a81dfeffbf0) - docs(examples): add Node.js basics example demonstrating core APIs end-to-end (examples-1)

- [`5eeef8b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5eeef8bc2f096573f7786bf6424c86899fbc58fa) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - docs(briefings): track 44 historical briefings in docs/briefings/ (DT-25 RESOLTA; hardening-2)

- [`05096f2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/05096f2ea1132d5322e57e04a7f41227476b9ce3) - docs(packages): informative READMEs for 15 packages + remove briefings.zip (hardening-3)

- [`dc53f10`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/dc53f1020a65a2b44ce37144b5779faeedd21049) - Added Phase 1 integration test suite (1.18, closure of Phase 1).
  New `__tests__/integration/` directory with 6 end-to-end scenarios
  (lifecycle, economy, applyChanges, audit, subscription, untrusted-input)
  plus targeted coverage tests. Reusable rich fixtures in
  `__tests__/integration/fixtures.ts` validate the engine surface with
  realistic TreeDefs (no trivial mocks). No production code changes.

  Coverage rises (global 92.72% → 97.68%, TreeEngine.ts 81.72% → 96.12%).
  Total core tests: 482 → 538.

- [`10d535a`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/10d535aabc273c7c904ccaf87a699625e0611ba0) - docs(release): prepare for 0.1.0 release — rewrite CHANGELOG (Keep-a-Changelog format), update global README, activate npm publish workflow (release-prep)

- [`c8bed7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/c8bed7e7a1dcf375c6bc28489858ecb6b2ef3eb2) - Sub-phase 2.6 — tests de integración cross-piece que pechan a Fase 2. **Cero código novo no motor.** Engade un único ficheiro `packages/core/__tests__/integration/phase-2-cross-piece.test.ts` con 8 escenarios que combinan tres ou máis pezas da Fase 2 (`EffectsRunner`, `StatComputer`, `TimeManager`, `ProgressManager`) nun mesmo escenario realista:

  1. **Effects + Stats**: un único `unlock` aplica `modify_resource` e contribúe ao stat `power`; o audit rexistra `node_unlocked` + `custom 'effects_applied'`.
  2. **Effects + Progress**: o effect `set_progress(B, 75)` actualiza `engine.getProgress('B')`, calcula os milestones acadados, e emite `progressChange` (cableado vía sub-fase 2.6.fix).
  3. **TimeManager + Progress**: un nodo expirado tras `tick()` conserva o progress establecido (decisión 2.4.b §5.8); `canUnlock` rexéitao por `expired`.
  4. **Computed progress + canUnlock**: un nodo `D` con prereq `progress_min(C, 50)` onde `C` é `computed avg [A, B]` reflicte cambios das fontes en tempo real (ALLOWED ↔ non ALLOWED segundo o estado das fontes).
  5. **StatContribution condicional + computed (verifica bug-fix 2.4.e)**: un stat con `conditions: [progress_min(C, 50)]` onde `C` é computed dependente de `A` e `B` actualízase tras `setProgress` sobre `A`/`B`, confirmando que a cache do `StatComputer` se invalida adecuadamente.
  6. **Round-trip Fase 2 completo**: TreeDef "monstruo" (3 recursos, effects mixtos, contribucións con `conditions` e `perTier`, `timeConstraints`, `progressSource` manual + computed, stats con clamp) que pasa por `fromJSON → unlock/setProgress → toJSON → fromJSON`. Verifica explícitamente que `toJSON` serializa **só TreeDef** (lifecycle.test.ts L:76) e que un `applyChanges` SI muta a TreeDef e persiste tras round-trip.
  7. **applyChanges atómico cross-piece**: caso positivo (batch de 5 cambios sobre `cost`/`effects`/`statContributions`/`timeConstraints`/`progressSource` aplícase enteiro) + caso negativo (cambio inválido no medio → rollback total verificado por comparación serializada da TreeDef antes/despois).
  8. **Cascade event ordering (verificación empírica §5.5)**: a orde dos eventos durante un `unlock` con effects fíxase contra a saída real observada — **`stateChange` → `unlock` → `auditEntry(node_unlocked)` → `progressChange` (vía effect) → `auditEntry(custom)`**. Esta orde é o contrato observable estable que se establece nesta sub-fase.

  ### Tests do paquete `core`: 882 → 891 (+9 novos, 8 escenarios; o 7 ten dous tests).

  ### Cobertura

  Global 98.18% (mellora levemente fronte á baseline 2.5: 98.13%; os tests integración exercitan camiños de `TreeEngine` que ata agora non se cubrían en par cruzado).

  ### Observación durante o escenario 8 (escalado preventivo)

  Captúrase a orde real e detéctase que o effect `modify_resource` muta o `budget` correctamente pero **non emite `budgetChange`** cando se invoca desde un effect (camiño `EffectsRunner → ResourceManager.modify`). É unha asimetría análoga á que a sub-fase 2.6.fix corrixiu para `set_progress`: outro cableado pendente da Fase 2. Briefing 2.6 §5.7 esixe non arranxar bugs descubertos silenciosamente; deixase rexistrado aquí como **escalado preventivo** para decidir posteriormente (candidato a unha 2.6.fix2 ou a Fase 3). Mentres tanto a TreeDef + estado interno seguen sendo coherentes; só fáltase a propagación do evento aos suscritores externos.

  ### Out of scope

  - Cero modificación do motor (§5.7).
  - Cero `ErrorCode` novo.
  - Cero modificación de `types/`, `common/`, `engine/index.ts`, `fixtures.ts`.

  ### Fase 2 pechada

  13 sub-fases (2.1 → 2.6) con as pezas `EffectsRunner`, `StatComputer`, `TimeManager`, `ProgressManager` implementadas, cableadas e verificadas en escenarios cross-piece. Próximo paso: hixiene MASTER + decisión sobre Fase 3 (Persistencia + Migracións) ou etapa intermedia de exemplos prácticos.

- [`cd750c3`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd750c39e37d37fd1ae155d0d51f4590262e7cbb) - Sub-phase 2.6.fix — pecha un bug latente do `EffectsRunner` descuberto durante a investigación T0 de 2.6: o effect `set_progress` mutaba o `StateStore` directamente saltándose o `ProgressManager`, polo que **non emitía** o evento `progressChange`, **non rexistraba** a entrada `progress_updated` no audit log, e **non invalidaba** a cache do `StatComputer`. Cambio microcirúrxico ao `applySetProgress`: agora delega en `progressManager.setProgress` cando o `EffectContext` o trae (caso normal cando `TreeEngine` constrúe o `EffectsRunner` desde 2.4.e). Mantense un **fallback legacy** silencioso (mutación directa) para tests illados que constrúen `EffectContext` manualmente sen `progressManager`. Cero cambio en `ProgressManager`, `TreeEngine`, `StatComputer`, `TimeManager`, `engine/index.ts`, `common/` nin types.

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

- [`3f42e79`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/3f42e79af39e12e52ee0093dc93b3af469c5ba35) - Sub-phase 2.6.fix2 — pecha o bug latente DT-13 cazado no escenario 8 de 2.6: o effect `modify_resource` mutaba o budget pero **non emitía o evento `budgetChange`**, polo que os suscritores externos non se enteraban dos cambios de budget producidos vía effect. Agora `EffectsRunner.applyModifyResource` emite `budgetChange(resourceId, oldAmount, newAmount)` tras a mutación, **só cando o valor cambia** (`currentAmount !== nextAmount`), replicando o patrón establecido en `TreeEngine`. Mesma familia que o bug de `set_progress` arranxado en 2.6.fix.

  **Emisión directa, non delegación** (§5.1): a diferenza de 2.6.fix (que delegaba en `ProgressManager`), aquí `ResourceManager.applyCost` é cálculo puro (devolve `Result<Budget>` sen efectos secundarios); a emisión de `budgetChange` faina sempre o chamante, así que `EffectsRunner` emítea directamente vía `this.context.events`.

  **Cero audit** (§5.4): `budgetChange` non leva audit en ningunha vía existente (nin sequera na vía `TreeEngine`); esta sub-fase non engade audit.

  **Rollback fóra de alcance** (§5.5): a emisión de `budgetChange` durante effects que posteriormente se revierten é coherente co comportamento actual de `set_progress` (2.6.fix); eventos compensatorios de rollback son decisión futura se procede.

  **Actualización do escenario 8 de 2.6** (autorizada por addendum do director): o test `cascade event ordering` en `phase-2-cross-piece.test.ts` fixara empíricamente unha cadea de 5 eventos SEN `budgetChange`, documentando a súa ausencia como bug latente (patrón de contrato intermedio 2.4.d L2). Agora que o bug se arranxa, o test actualízase para reflectir a orde correcta de 6 eventos: `stateChange → unlock → auditEntry(node_unlocked) → budgetChange(xp=15) → progressChange(b=100) → auditEntry(custom)`. Orde verificada empíricamente; `budgetChange` aparece na posición 4, respectando a orde declarativa dos effects (modify_resource é o 1º, set_progress o 2º).

  **Tests do paquete `core`**: 891 → 896 (+5 novos en `EffectsRunner.test.ts`: emisión con `+`/`-`/`*`, non-emisión con delta cero, e integración cross-piece vía `engine.unlock`). O escenario 8 mantense (actualizado, non engadido).

  **Cobertura**: global 98.18% (= baseline 2.6); `EffectsRunner.ts` 100% statements/lines/funcs.

  **Out of scope**: cero modificación de `TreeEngine`, `ResourceManager`, `ProgressManager`, `UnlockResolver`, `types/`, `common/`, `engine/index.ts`. Cero `ErrorCode` novo.

  **DT-13 PECHADA.** Coa fix2 a Fase 2 queda sen asimetrías de emisión coñecidas: tanto `set_progress` (2.6.fix) como `modify_resource` (2.6.fix2) propagan os seus eventos cando se invocan desde effects.

- [`de16c01`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/de16c01fdcba47bc4f83348d911d9da2f3c5c14c) - refactor(common): move Result type from core (sub-phase 3.0)

  `Result<T, E>` type e helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`) movidos de `@yggdrasil-forge/core/types/` a `@yggdrasil-forge/common` como primitivo xenérico compartido. `@yggdrasil-forge/core/types/result.js` mantén re-export para cero ruptura dos imports existentes en core. Sub-fase preparatoria para Fase 3 (StorageAdapter en `@yggdrasil-forge/storage` agora pode importar Result sen depender de core).

- [`f055555`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/f055555bb6fb4e8be4c17e5b4f8212f20a91353b) - Add parseCustomConfig validator (sub-phase 4.4)

- [`5a80acf`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5a80acf86450199b2cfd852579d853ca4aa1bede) - Add SSR verification tests + docs (sub-phase 4.6)

- [`cd61e7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd61e7e05e63d6e4d85c12c68216eb95c9e5ec16) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Initial monorepo skeleton with all packages stubbed

- Updated dependencies [[`760c11d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/760c11d4522df6c52d11901f2f05bfd9d9aeb97e), [`b1ee18d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b1ee18d3da98f231d7a638fa919aeb54daa20e8f), [`1897fbf`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1897fbf5af9ac72a13990a28b5ee3041d30e2e9f), [`953cda7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/953cda7d0e7fc8fd68c9f666b6c1470fa406c7e2), [`7e408d8`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7e408d85c4b357d20ef9ca264aa227c8258dfbac), [`ad80454`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ad804548af77245ca0bdf0e97f248f108023872f), [`ecb08e9`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/ecb08e9499165b37b2ebdc1e67c16063a3694757), [`7adb1a2`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/7adb1a22287f5325d5f613fd7673de561c872515), [`df7c696`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/df7c69678c2a17ecb50297a5bb21fa2d7a5ad348), [`e52fc33`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/e52fc33023368aac0296ffc490de0daf56f5e97c), [`357b69b`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/357b69b5ff8413617431085337a7857f77ec2e6a), [`5d4cee5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5d4cee5d69ac860eaecff95a9274f497c9f7f099), [`cfafc76`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cfafc76e2b747e03d504fefb838c077c12b5ff87), [`1774a81`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1774a8166f98ce21de644cfe24a237ae2995f942), [`de16c01`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/de16c01fdcba47bc4f83348d911d9da2f3c5c14c), [`2a12ef7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2a12ef7a94b63c6f9bbfdc4e789780efe3e08293), [`0bcc66d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/0bcc66dd1f202f209333e244bc11f1555926b73c), [`2fd2e6a`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2fd2e6a172d462d685f4d3f6353a01b4832e006e), [`1f7de89`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1f7de89abd7f231f777e851add4900b4df91d86e), [`cd61e7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd61e7e05e63d6e4d85c12c68216eb95c9e5ec16), [`2ddc511`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2ddc511c8680324ba7bdc33e8b12bd743e856123), [`5baefa6`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5baefa6df0ee26838f4f42f12b6783d0e66db995), [`b913aae`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b913aae47370495617522a0c34f34e01742a9d22)]:
  - @yggdrasil-forge/common@0.1.0
