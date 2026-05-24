---
'@yggdrasil-forge/core': minor
---

Expose the `ProgressManager` API on `TreeEngine` (sub-phase 2.4.b), following the standalone-then-integrate pattern established in 2.1/2.1.b, 2.2/2.2.b and 2.3/2.3.b. The engine now holds a `private readonly progressManager: ProgressManager` instantiated after `timeManager` in the constructor.

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
