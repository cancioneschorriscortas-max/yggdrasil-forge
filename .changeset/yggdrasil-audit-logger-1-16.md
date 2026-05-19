---
'@yggdrasil-forge/core': minor
---

Add AuditLogger and TreeEngine audit integration (sub-fase 1.16).

- Added `AuditLogger` engine class: in-memory audit log with `record`, `query`, `clear`, `size`. Disabled by default (zero overhead when unused); circular FIFO cap (configurable `maxEntries`, default 1000); monotonic `audit-<n>` ids; `Date.now()` timestamps (documented future injection point)
- Added `TreeEngineOptions.audit` config: `{ enabled?: boolean (default false); maxEntries?: number (default 1000) }`
- Added `TreeEngine.getAuditLog(filter?)`: returns a filtered copy (by `actor`, `action.type`, inclusive `from`/`to` timestamp range, `limit`); most-recent-first; synchronous
- Added `TreeEngine.clearAuditLog()`: empties the audit log
- Added `TreeEngine.logAudit(action, opts?)`: manual API for `custom`/own actions; no-op when audit disabled; emits `auditEntry` when an entry is created
- Automatic recording after the 4 successful mutations only (NOT on errors): `unlock` → `node_unlocked` (rollbackable), `lock` → `node_locked` (rollbackable), `respec` → `respec`, `applyChanges` → `tree_changed`; each emits the `auditEntry` event
- Mutation logic and Result values unchanged; recording is purely additive
- Added unit tests (`AuditLogger.test.ts`) and integration tests (`TreeEngine.audit.test.ts`): disabled/enabled behaviour, unique ids, FIFO eviction, actor/type/range/limit filters, clear, automatic recording for the 4 mutations, errors not recorded, `auditEntry` event, manual `logAudit`, `maxEntries` via options (zero `any`)
