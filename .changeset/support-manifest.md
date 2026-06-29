---
'@yggdrasil-forge/core': minor
---

feat(core): support manifest (machine-readable runtime contract)

Adds a new public API that exposes what the engine actually
implements at runtime, distinct from what the type union declares.
Useful for editor tooling that needs to warn authors about features
the engine won't apply (e.g. `modify_stat` is in the `Effect` union
but the runtime rejects it with `EFFECT_TYPE_UNSUPPORTED`).

New public exports from `@yggdrasil-forge/core`:

  supportManifest: SupportManifest
  describeSupport(): SupportManifest
  SupportEntry, SupportManifest (types)

  SUPPORTED_EFFECT_TYPES        (8 effect kinds actually applied)
  UNSUPPORTED_EFFECT_TYPES      (2 declared-but-not-applied)
  SUPPORTED_CONDITION_TYPES     (14 conditions evaluated by UnlockResolver)
  isEffectSupported(type)
  isEffectUnsupported(type)
  isConditionSupported(type)
  SupportedEffectType, UnsupportedEffectType, SupportedConditionType

Internally, `EffectsRunner` now derives its unsupported check from
`UNSUPPORTED_EFFECT_TYPES` (single source) instead of a hardcoded
local function. Behaviour is unchanged.

Compile-time gate: `SUPPORTED_EFFECT_TYPES ∪ UNSUPPORTED_EFFECT_TYPES`
must equal `Effect['type']` exactly (via `Equals<>` type-test). Adding
a new effect kind to the union without classifying it breaks the build.
Same for `UnlockCondition['type']` against `SUPPORTED_CONDITION_TYPES`.

Consumed by `@yggdrasil-forge/editor-core` (forthcoming) to surface
non-blocking warnings when documents reference unsupported features.
