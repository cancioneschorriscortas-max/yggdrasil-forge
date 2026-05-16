---
"@yggdrasil-forge/core": minor
---

Add UnlockResolver: stateless evaluator of UnlockRules. Supports all 15 atomic conditions, all/any/none combinators, evaluate() for fast boolean and explain() for detailed localized feedback. Accepts injected DependencyGraph (for distance_max) and custom evaluators registry.
