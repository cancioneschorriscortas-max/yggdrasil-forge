---
"@yggdrasil-forge/core": minor
---

Add structural validation and JSON serialization for TreeDef (sub-phase 1.17). New `treeDefSchema` (Zod) reflecting the `TreeDef` type, `TreeDefValidator.validateTreeDef` returning `Result<InferredTreeDef>` with serializable Zod issues, deterministic `JsonSerializer` (`serialize`/`deserialize`) with schema versioning, and `TreeEngine.fromJSON`/`toJSON`. Adds the `zod` dependency (^3) to core only. Structural validation only — no pedagogical rules (Phase 8) and no schema migration.
