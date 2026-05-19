---
'@yggdrasil-forge/common': minor
'@yggdrasil-forge/core': minor
---

Add TreeEngine.applyChanges and two new Engine error codes (sub-fase 1.14).

- Added INVALID_NODE_STATE (YGG_E011) error code with localized messages (gl/es/en) for invalid node-state operations (DT-8)
- Added CHANGE_CONFLICT (YGG_E012) error code with localized messages (gl/es/en) for internally inconsistent change lists
- Fixed DT-8: `TreeEngine.lock` and `TreeEngine.canUnlock` now use semantically correct codes (INVALID_NODE_STATE / NODE_EXPIRED) instead of INVALID_NODE_DEF
- Added `ApplyChangesResult` type (exported from `@yggdrasil-forge/core`)
- Added `applyChanges(changes): Promise<Result<ApplyChangesResult>>`: atomic (all-or-nothing) runtime TreeDef mutation covering all 12 TreeChange variants, with internal-conflict detection (delegated to `analyzeChanges`), structural validation against the current TreeDef, NodeInstance reconciliation (add/remove/rename/clamp), cache invalidation and `treeChanged`/`stateChange` events
- On internal conflicts, returns CHANGE_CONFLICT; the localized message describes the first conflict and the error context carries all conflicts for telemetry
- Added tests for applyChanges (no-op, readOnly, apply, reconciliation, internal conflicts, validation, events)
