---
'@yggdrasil-forge/core': patch
---

Added Phase 1 integration test suite (1.18, closure of Phase 1).
New `__tests__/integration/` directory with 6 end-to-end scenarios
(lifecycle, economy, applyChanges, audit, subscription, untrusted-input)
plus targeted coverage tests. Reusable rich fixtures in
`__tests__/integration/fixtures.ts` validate the engine surface with
realistic TreeDefs (no trivial mocks). No production code changes.

Coverage rises (global 92.72% → 97.68%, TreeEngine.ts 81.72% → 96.12%).
Total core tests: 482 → 538.
