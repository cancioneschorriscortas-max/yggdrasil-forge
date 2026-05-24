---
'@yggdrasil-forge/common': minor
'@yggdrasil-forge/core': minor
---

Add **`computed` progress source** to `ProgressManager` (sub-phase 2.4.c). A node with `progressSource: { type: 'computed', dependsOn, formula }` derives its progress dynamically from a formula (`sum`/`avg`/`min`/`max`) over the progress of other nodes. Sub-phase 2.4 implemented only `manual`; sub-phase 2.4.b wired the manager into `TreeEngine`; this sub-phase completes the second supported source.

**Public behavior changes**:
- `engine.getProgress(nodeId)` now returns the dynamically-computed value for nodes with `progressSource.type === 'computed'`. Always clamped to `[0, 100]`. The value is **not** persisted to `NodeInstance.progress`; it recomputes on each call.
- `engine.setProgress(nodeId, percent)` on a `computed` node now returns `err` with the new error code `INVALID_PROGRESS_OPERATION` (YGG_E022). Previously returned `PROGRESS_SOURCE_UNSUPPORTED` (YGG_E020) along with the other unsupported sources; now `computed` is distinguished because it is a node that *could* have a progress value but it derives, not is set.
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
- **`progress_min` condition in `UnlockResolver` does not consult derived values of computed nodes**. `UnlockResolver` reads `NodeInstance.progress` directly via its private `getProgress` method, which never goes through this `ProgressManager`. After 2.4.c, a `progress_min` condition pointing at a `computed` node still reads `0` (since computed never persists). **Known limitation; arranged for sub-phase 2.4.d** which requires careful analysis of the potential circular dependency between `UnlockResolver` and `ProgressManager` (the former currently *is* used by the latter for `unlock` conditions; reversing the relationship would create a cycle that needs architectural resolution). Decision U2 of architect: do not block 2.4.c on this.
- Zod validation over `dependsOn` (existence, no cycles): deferred to a future validator-hardening sub-phase. Defensive handling (filter inexistent, lazy cycle detection) at runtime is sufficient for now.
- Cero modifications to `TreeEngine.ts` (§5.9): the three public methods added in 2.4.b are delegates and automatically reflect the new behavior of `ProgressManager`. No new public API on the engine.
- Cero modifications to `JsonSerializer.ts`: computed values are not persisted.
- Cero modifications to `types/progress.ts` or `types/node.ts`: all type infrastructure already existed.
