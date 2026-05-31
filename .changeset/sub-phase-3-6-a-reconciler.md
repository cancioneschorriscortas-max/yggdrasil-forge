---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': patch
---

feat(core): add Reconciler base with refundRemovedNodes (sub-phase 3.6.a)

Reconciler base en `@yggdrasil-forge/core/engine/reconciler/`: función pura `reconcile(oldTreeDef, newTreeDef, oldTreeState, options, locale?)` para reconciliar saves contra TreeDefs modificadas (MASTER §23). `ReconcileOptions`, `ReconcileChange` e `ReconcileResult` types exportados. ErrorCode `RECONCILE_TREE_MISMATCH = YGG_R001` con mensaxes en gl/es/en. Esta sub-fase implementa só `refundRemovedNodes` das catro opcións; as outras tres serán efectivas na 3.6.b.
