---
'@yggdrasil-forge/core': minor
---

Add standalone `TimeManager` (sub-phase 2.3). Evaluates temporal constraints of a node from the three supported window fields: `startsAt`, `expiresAt` (both UTC ms) and `expiresAtCalendar` (`{date, time, timezone}`, TZ-aware). Public API: `evaluate(constraints)`, `evaluateAt(constraints, atMs)`, `nextTransitionAt(constraints)`. Returns a discriminated `TimeStatus` with kinds `permanent` (no applicable constraints), `pending` (now < startsAt), `active` (within window, optionally with `expiresAt`) and `expired` (now >= effective expiry).

Virtual clock is mandatory: `TimeManager` never calls `Date.now()` directly; the context supplies `now: () => number` (trivially mockable in tests and SSR-friendly). When both `expiresAt` and `expiresAtCalendar` are defined the calendar value wins (it is the more expressive representation; UTC ms is treated as redundant). The calendar-to-UTC conversion uses `Intl.DateTimeFormat` with a two-pass offset correction to handle DST transitions; invalid timezones or malformed date/time strings yield `NaN` and are treated as if the calendar field were absent. All non-finite numeric inputs (`NaN`, ±`Infinity`) are similarly treated as absent. The API is total: no exceptions, no `Result<>` wrappers.

Out of scope for this sub-phase (declared in `TimeConstraints` but ignored at runtime): `cooldownMs`, `reCertifyAfterMs`, `validForMs`. These require additional state modeling (e.g. `lastUnlockedAt`) and will be addressed in a later sub-phase. `TimeManagerOptions` is accepted by the context but only its presence matters here; the semantics of `enabled`, `checkIntervalMs`, `leadTimeMs` and `timezone` belong to the scheduling layer.

Note: integration with `TreeEngine` (auto-marking nodes as `'expired'`, emitting `EventMap.nodeExpired`, writing `AuditAction.node_expired`, scheduling checks via `setTimeout`) is deferred to sub-phase 2.3.b, following the same standalone-then-integrate pattern used in 2.1 / 2.1.b and 2.2 / 2.2.b.
