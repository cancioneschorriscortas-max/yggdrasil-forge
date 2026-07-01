---
'@yggdrasil-forge/core': patch
---

Deprecate `NodeDef.tier` field (no runtime effect). The current rank of a
node lives in the runtime state (`state.currentTier`), and the maximum in
`NodeDef.maxTier`. The `tier` field will be removed in a future major
release. Consumers should not reference this field; if they need
declarative rank data, they should use `maxTier` or the runtime state.
