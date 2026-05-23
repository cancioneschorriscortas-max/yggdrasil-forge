---
'@yggdrasil-forge/core': minor
---

Wire `StatComputer` into `TreeEngine` (sub-phase 2.2.b). New public API on `TreeEngine`:

- `getStat(statId: string): number` — returns the aggregate value of a global stat, or `NaN` if the id is unknown.
- `getAllStats(): Readonly<Record<string, number>>` — snapshot of every declared stat.

The `StatComputer`'s cache is now invalidated automatically after every state-mutating operation: `unlock`, `lock`, `respec`, and `applyChanges`. Multi-tier unlocks invalidate per tier transition, so `perTier` contributions reflect the current tier on the next read.

Internal change to `StatComputerContext`: replaced the captured `state: TreeState` field with `store: StateStore` so the computer reads the live snapshot via `store.getState()` on every computation. This is the minimal adjustment required for integration with Immer-backed mutations; the public surface of `StatComputer` is unchanged.

Note: the `modify_stat` effect still returns `EFFECT_TYPE_UNSUPPORTED` (wrapped as `EFFECT_APPLICATION_FAILED` when reached through `unlock`, with `originalErrorCode: 'YGG_E013'` in the error context); the `EventMap.statChange` event remains declared but not emitted. Both are deferred to a future sub-phase that will tackle transient stat deltas with explicit storage semantics.
