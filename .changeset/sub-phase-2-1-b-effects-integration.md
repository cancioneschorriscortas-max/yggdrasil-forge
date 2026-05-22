---
'@yggdrasil-forge/core': minor
---

`TreeEngine.unlock` now automatically executes `nodeDef.effects` after a successful unlock, with full atomicity. If any effect fails, the entire unlock rolls back: the node state is restored, the budget is restored exactly to its previous value (independent of `refundable` flags), reversal events are emitted (`budgetChange`, `stateChange` with `reason: 'effect_failed'`, `lock`), and a compensating audit entry is recorded.

Added single aggregated audit entry per unlock with effects: `custom` action with `name: 'effects_applied'` (on success, with per-effect detail) or `'effects_failed'` (on rollback, with failure context).

Multi-tier semantics: effects execute on every tier transition.
