---
'@yggdrasil-forge/core': minor
---

Close the asymmetry documented in 2.4.d (sub-phase 2.4.e). `EffectsRunner` and `StatComputer` now consult `ProgressManager` for `progress_min` conditions, so a `progress_min` apuntando a un nodo `computed` funciona **uniformemente** en `canUnlock`, en effects `conditional` e en stat conditional contributions.

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
- The family 2.4.* is now functionally complete: progress (manual + computed) is integrated uniformly across the engine.
