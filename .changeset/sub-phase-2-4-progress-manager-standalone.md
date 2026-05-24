---
'@yggdrasil-forge/common': minor
'@yggdrasil-forge/core': minor
---

Add `ProgressManager` as a standalone engine piece (sub-phase 2.4), following the same pattern established by `EffectsRunner` (2.1), `StatComputer` (2.2) and `TimeManager` (2.3). Scope is deliberately narrow: **only the `manual` progress source is supported**. The other four sources declared in `types/progress.ts` (`remote`, `callback`, `event`, `computed`) are rejected with a typed error and remain assigned to later sub-phases (2.4.b for `computed`; Phase 5 for the I/O-bound ones).

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
