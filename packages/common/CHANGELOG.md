# @yggdrasil-forge/common

## 0.1.0

### Minor Changes

- [`b1ee18d`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b1ee18d3da98f231d7a638fa919aeb54daa20e8f) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Added INVALID_COST (YGG_V006) error code with localized messages (gl/es/en) for invalid resource cost amounts.
  ResourceManager now emits localized error messages via getErrorMessage() instead of hardcoded English strings.
  Strengthened ResourceManager tests to verify error codes and localization.

- [`1897fbf`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/1897fbf5af9ac72a13990a28b5ee3041d30e2e9f) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Summary

- [`5d4cee5`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/5d4cee5d69ac860eaecff95a9274f497c9f7f099) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Wire `TimeManager` into `TreeEngine` (sub-phase 2.3.b), following the standalone-then-integrate pattern established in 2.1/2.1.b and 2.2/2.2.b. The engine now holds a `private readonly timeManager: TimeManager` instantiated after `statComputer`, fed by a virtual clock from `TreeEngineOptions.timeNow` (default `Date.now`).

  **Public API additions** on `TreeEngine`:

  - `tick(): TickResult` — evaluates all `unlocked`/`maxed` nodes that carry `timeConstraints` and transitions to `'expired'` any whose `expiresAt`/`expiresAtCalendar` has passed. For every transition: mutates `NodeInstance.state` (with a `history` entry), emits `stateChange` (with `from`, `to: 'expired'`, `timestamp`, `reason: 'expired'`), emits `nodeExpired(nodeId)`, records audit `{type: 'node_expired', nodeId}` with `rollbackable: false`, and invalidates the `StatComputer` cache. All transitions in a single `tick()` share the same `timestamp` captured once at the start via `evaluateAt`. Idempotent (a second consecutive `tick` with no state/clock changes is a no-op). No-op when the engine is `readOnly`.
  - `nextTickAt(): number | null` — returns the earliest UTC ms in the strict future at which some `unlocked`/`maxed` node with `timeConstraints` would transition (typically expire). Useful for the consumer to schedule its own `setTimeout(() => engine.tick(), delay)`. The engine itself **never** schedules anything internally: no `setTimeout`/`setInterval` is used, preserving determinism and SSR/Worker compatibility.
  - `TickResult` interface exported from `engine/index.ts` with `{expired: readonly string[], timestamp: number}`.

  **`canUnlock` is now temporal-aware**: between the existing state checks (`maxed`/`unlocked`/`expired`/`disabled`) and the prerequisites/cost checks, it consults `TimeManager.evaluate(nodeDef.timeConstraints)`. If `pending`, returns `allowed: false` with the new error code `NODE_NOT_YET_AVAILABLE` (YGG_E018). If `expired` (detected by `TimeManager` even though the stored state has not yet been transitioned by a `tick`), returns `allowed: false` with the pre-existing `NODE_EXPIRED`. `permanent` and `active` fall through unchanged.

  **`TreeEngineOptions.timeNow?: () => number`** — optional virtual-clock injection point. Tests and SSR/Worker contexts can supply a deterministic source; production code can omit it and use the `Date.now` default.

  **`@yggdrasil-forge/common`** ships the new `ErrorCode.NODE_NOT_YET_AVAILABLE = 'YGG_E018'` with localized messages in gl/es/en (placeholders `{nodeId}` and `{startsAt}` for the consumer to format).

  Out of scope (deliberate, see briefing): `cooldownMs`, `reCertifyAfterMs`, `validForMs` still ignored by `TimeManager` at runtime; the engine does not implement scheduling or polling; `lock`/`respec`/`applyChanges` are unchanged (no time-related cache to invalidate — `TimeManager` is stateless across calls).

- [`cfafc76`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cfafc76e2b747e03d504fefb838c077c12b5ff87) - Add **`computed` progress source** to `ProgressManager` (sub-phase 2.4.c). A node with `progressSource: { type: 'computed', dependsOn, formula }` derives its progress dynamically from a formula (`sum`/`avg`/`min`/`max`) over the progress of other nodes. Sub-phase 2.4 implemented only `manual`; sub-phase 2.4.b wired the manager into `TreeEngine`; this sub-phase completes the second supported source.

  **Public behavior changes**:

  - `engine.getProgress(nodeId)` now returns the dynamically-computed value for nodes with `progressSource.type === 'computed'`. Always clamped to `[0, 100]`. The value is **not** persisted to `NodeInstance.progress`; it recomputes on each call.
  - `engine.setProgress(nodeId, percent)` on a `computed` node now returns `err` with the new error code `INVALID_PROGRESS_OPERATION` (YGG_E022). Previously returned `PROGRESS_SOURCE_UNSUPPORTED` (YGG_E020) along with the other unsupported sources; now `computed` is distinguished because it is a node that _could_ have a progress value but it derives, not is set.
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

- [`b913aae`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/b913aae47370495617522a0c34f34e01742a9d22) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Add TreeEngine.applyChanges and two new Engine error codes (sub-fase 1.14).

  - Added INVALID_NODE_STATE (YGG_E011) error code with localized messages (gl/es/en) for invalid node-state operations (DT-8)
  - Added CHANGE_CONFLICT (YGG_E012) error code with localized messages (gl/es/en) for internally inconsistent change lists
  - Fixed DT-8: `TreeEngine.lock` and `TreeEngine.canUnlock` now use semantically correct codes (INVALID_NODE_STATE / NODE_EXPIRED) instead of INVALID_NODE_DEF
  - Added `ApplyChangesResult` type (exported from `@yggdrasil-forge/core`)
  - Added `applyChanges(changes): Promise<Result<ApplyChangesResult>>`: atomic (all-or-nothing) runtime TreeDef mutation covering all 12 TreeChange variants, with internal-conflict detection (delegated to `analyzeChanges`), structural validation against the current TreeDef, NodeInstance reconciliation (add/remove/rename/clamp), cache invalidation and `treeChanged`/`stateChange` events
  - On internal conflicts, returns CHANGE_CONFLICT; the localized message describes the first conflict and the error context carries all conflicts for telemetry
  - Added tests for applyChanges (no-op, readOnly, apply, reconciliation, internal conflicts, validation, events)

### Patch Changes

- [`de16c01`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/de16c01fdcba47bc4f83348d911d9da2f3c5c14c) - refactor(common): move Result type from core (sub-phase 3.0)

  `Result<T, E>` type e helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`) movidos de `@yggdrasil-forge/core/types/` a `@yggdrasil-forge/common` como primitivo xenérico compartido. `@yggdrasil-forge/core/types/result.js` mantén re-export para cero ruptura dos imports existentes en core. Sub-fase preparatoria para Fase 3 (StorageAdapter en `@yggdrasil-forge/storage` agora pode importar Result sen depender de core).

- [`2a12ef7`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/2a12ef7a94b63c6f9bbfdc4e789780efe3e08293) - feat(core): add Reconciler base with refundRemovedNodes (sub-phase 3.6.a)

  Reconciler base en `@yggdrasil-forge/core/engine/reconciler/`: función pura `reconcile(oldTreeDef, newTreeDef, oldTreeState, options, locale?)` para reconciliar saves contra TreeDefs modificadas (MASTER §23). `ReconcileOptions`, `ReconcileChange` e `ReconcileResult` types exportados. ErrorCode `RECONCILE_TREE_MISMATCH = YGG_R001` con mensaxes en gl/es/en. Esta sub-fase implementa só `refundRemovedNodes` das catro opcións; as outras tres serán efectivas na 3.6.b.

- [`cd61e7e`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/commit/cd61e7e05e63d6e4d85c12c68216eb95c9e5ec16) Thanks [@cancioneschorriscortas-max](https://github.com/cancioneschorriscortas-max)! - Initial monorepo skeleton with all packages stubbed
