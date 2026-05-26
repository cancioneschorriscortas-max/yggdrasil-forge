---
'@yggdrasil-forge/core': minor
---

Wire `UnlockResolver` to `ProgressManager` via an optional context field (sub-phase 2.4.d). This closes the limitation flagged in 2.4.c: `progress_min` conditions in `canUnlock` now consult the dynamically-derived value of `computed` progress sources.

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
