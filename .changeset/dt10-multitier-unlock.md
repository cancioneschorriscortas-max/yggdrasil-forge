---
'@yggdrasil-forge/core': minor
---

Fixed: DT-10 — `unlock` now supports complete multi-tier semantics for
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
