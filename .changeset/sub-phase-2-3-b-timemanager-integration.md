---
'@yggdrasil-forge/common': minor
'@yggdrasil-forge/core': minor
---

Wire `TimeManager` into `TreeEngine` (sub-phase 2.3.b), following the standalone-then-integrate pattern established in 2.1/2.1.b and 2.2/2.2.b. The engine now holds a `private readonly timeManager: TimeManager` instantiated after `statComputer`, fed by a virtual clock from `TreeEngineOptions.timeNow` (default `Date.now`).

**Public API additions** on `TreeEngine`:
- `tick(): TickResult` — evaluates all `unlocked`/`maxed` nodes that carry `timeConstraints` and transitions to `'expired'` any whose `expiresAt`/`expiresAtCalendar` has passed. For every transition: mutates `NodeInstance.state` (with a `history` entry), emits `stateChange` (with `from`, `to: 'expired'`, `timestamp`, `reason: 'expired'`), emits `nodeExpired(nodeId)`, records audit `{type: 'node_expired', nodeId}` with `rollbackable: false`, and invalidates the `StatComputer` cache. All transitions in a single `tick()` share the same `timestamp` captured once at the start via `evaluateAt`. Idempotent (a second consecutive `tick` with no state/clock changes is a no-op). No-op when the engine is `readOnly`.
- `nextTickAt(): number | null` — returns the earliest UTC ms in the strict future at which some `unlocked`/`maxed` node with `timeConstraints` would transition (typically expire). Useful for the consumer to schedule its own `setTimeout(() => engine.tick(), delay)`. The engine itself **never** schedules anything internally: no `setTimeout`/`setInterval` is used, preserving determinism and SSR/Worker compatibility.
- `TickResult` interface exported from `engine/index.ts` with `{expired: readonly string[], timestamp: number}`.

**`canUnlock` is now temporal-aware**: between the existing state checks (`maxed`/`unlocked`/`expired`/`disabled`) and the prerequisites/cost checks, it consults `TimeManager.evaluate(nodeDef.timeConstraints)`. If `pending`, returns `allowed: false` with the new error code `NODE_NOT_YET_AVAILABLE` (YGG_E018). If `expired` (detected by `TimeManager` even though the stored state has not yet been transitioned by a `tick`), returns `allowed: false` with the pre-existing `NODE_EXPIRED`. `permanent` and `active` fall through unchanged.

**`TreeEngineOptions.timeNow?: () => number`** — optional virtual-clock injection point. Tests and SSR/Worker contexts can supply a deterministic source; production code can omit it and use the `Date.now` default.

**`@yggdrasil-forge/common`** ships the new `ErrorCode.NODE_NOT_YET_AVAILABLE = 'YGG_E018'` with localized messages in gl/es/en (placeholders `{nodeId}` and `{startsAt}` for the consumer to format).

Out of scope (deliberate, see briefing): `cooldownMs`, `reCertifyAfterMs`, `validForMs` still ignored by `TimeManager` at runtime; the engine does not implement scheduling or polling; `lock`/`respec`/`applyChanges` are unchanged (no time-related cache to invalidate — `TimeManager` is stateless across calls).
