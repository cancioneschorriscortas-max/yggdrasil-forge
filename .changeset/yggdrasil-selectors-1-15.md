---
'@yggdrasil-forge/core': minor
---

Add selectors and selective subscription to TreeEngine (sub-fase 1.15).

- Added `Selector<T>` type (exported from `@yggdrasil-forge/core`)
- Added `createSelector` pure utility: reselect-style memoized selector factory with last-args cache (size 1) and referential input equality; typed via overloads for 1-3 input selectors plus a combiner (zero `any`)
- Added `shallowEqual` pure helper (one-level shallow comparison) for optional use as a custom `equalityFn` (NOT the default; default stays `Object.is`)
- Added `TreeEngine.select<T>(selector): T`: synchronous pure read of a derived slice of the current snapshot; selector exceptions propagate (not captured)
- Added `TreeEngine.subscribeWithSelector<T>(selector, listener, options?)`: subscribes to the global store but only invokes `listener(selected, previous)` when the selected value changes per `equalityFn` (default `Object.is`); supports `fireImmediately`; returns an `Unsubscribe`
- Added tests for `createSelector` (memoization, recompute, multi-input), `shallowEqual`, `select`, `subscribeWithSelector` (no-change/change/fireImmediately/custom equalityFn/unsubscribe/(selected, previous) ordering) and `getSnapshot` reference stability
