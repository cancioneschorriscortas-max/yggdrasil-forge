---
'@yggdrasil-forge/core': minor
---

feat(core): complete Reconciler with 3 remaining options (sub-phase 3.6.b)

Reconciler completo: tres opcións pendentes da `ReconcileOptions` agora implementadas. `grandfatherIncreasedCosts`: emite `cost_grandfathered` cando o custo dun nodo unlocked subiu, sen modificar estado. `refundDecreasedCosts`: emite `cost_decreased_refunded` e devolve a diferenza ao budget cando o custo baixou. `invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'`: tres políticas para nodos cuxos prerequisites xa non se cumpren co estado actual. ATENCIÓN: 'preserve' rompe invariantes do engine; emite `prereq_failure_preserved` para auditoría. 5 tipos novos en `ReconcileChange`. Reutilización de `UnlockResolver` para avaliación de prereqs. Orde de aplicación: refunds primeiro, prereqs último.
