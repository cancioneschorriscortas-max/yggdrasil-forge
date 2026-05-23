---
'@yggdrasil-forge/core': minor
---

Add standalone `StatComputer` (sub-phase 2.2). Calculates aggregate values for global stats from the `statContributions` of unlocked nodes. Public API: `computeStat(statId)`, `computeAllStats()`, `explainStat(statId)`, `invalidate()`. Supports operations `+`, `-`, `*`, `/`, `min`, `max`, `set`; `perTier` multiplier based on `NodeInstance.currentTier`; optional `conditions?` evaluated as logical AND via `UnlockResolver`. Final `min`/`max` clamping is applied once after all contributions. Simple, fully-invalidable cache on `computeStat`; `explainStat` never uses the cache. Unknown `statId` returns `NaN` (no exceptions). Pathological math (e.g. division by zero) propagates as `Infinity`/`NaN` and is the tree designer's responsibility.

Note: integration with `TreeEngine` (`getStat`, `getAllStats` getters) and wiring of the `modify_stat` effect (currently returning `EFFECT_TYPE_UNSUPPORTED`) is deferred to sub-phase 2.2.b, following the same standalone-then-integrate pattern used in 2.1 / 2.1.b.
