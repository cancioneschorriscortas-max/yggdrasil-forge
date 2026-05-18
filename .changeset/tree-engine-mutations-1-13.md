---
'@yggdrasil-forge/core': minor
---

Add TreeEngine unlock/lock/respec mutations (sub-fase 1.13).

- Fixed DT-7: removed unreachable dead branch in `ResourceManager.applyCost`; simplified `aggregateCosts` to never return `null`
- Added result types: `UnlockResult`, `LockResult`, `RespecResult` (exported from `@yggdrasil-forge/core`)
- Wired `EventEmitter`, `ResourceManager`, `UnlockResolver` into `TreeEngine` constructor
- Added `canUnlock(nodeId): Result<UnlockCheck>` synchronous check
- Added `unlock(nodeId): Promise<Result<UnlockResult>>` with validation, cost, state change, events
- Added `lock(nodeId): Promise<Result<LockResult>>` with refund, state change, events
- Added `respec(nodeId?): Promise<Result<RespecResult>>` with cascade detection and atomic state update
- Added `on`/`off` public event subscription methods
