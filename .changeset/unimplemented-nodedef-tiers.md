---
'@yggdrasil-forge/core': patch
---

Clarify that `NodeDef.tiers` (F9.1: `NodeTierInfo[]` for per-rank
label/description) is declared but **not implemented** in the runtime.
The engine ignores it; consumers should not rely on it having any
effect. Analogous to `modify_stat` in the effect manifest (declared,
unsupported). No API change; JSDoc `@remarks` only.
