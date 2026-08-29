---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/editor-react': patch
---

`computeCost` cableado (17.9): o hook deixa de estar «declarado pero sen cablear». Un funil único — `getEffectiveCostForTier` (público) — atravesado por `canUnlock`, os dous cobros de `unlock` e os refunds de `lock`/`lockOneTier`/`respec`; a ficha de Proba pregunta ao funil en vez de ler o `nodeDef` cru, así que explica e cobra coinciden. Contrato do refund pinado e testado: recomputa co estado actual (hooks deterministas → refunds exactos; hooks dependentes de estado → refund ao valor actual, non ao histórico).
