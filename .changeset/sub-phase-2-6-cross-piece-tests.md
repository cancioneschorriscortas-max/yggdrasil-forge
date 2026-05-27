---
'@yggdrasil-forge/core': patch
---

Sub-phase 2.6 — tests de integración cross-piece que pechan a Fase 2. **Cero código novo no motor.** Engade un único ficheiro `packages/core/__tests__/integration/phase-2-cross-piece.test.ts` con 8 escenarios que combinan tres ou máis pezas da Fase 2 (`EffectsRunner`, `StatComputer`, `TimeManager`, `ProgressManager`) nun mesmo escenario realista:

1. **Effects + Stats**: un único `unlock` aplica `modify_resource` e contribúe ao stat `power`; o audit rexistra `node_unlocked` + `custom 'effects_applied'`.
2. **Effects + Progress**: o effect `set_progress(B, 75)` actualiza `engine.getProgress('B')`, calcula os milestones acadados, e emite `progressChange` (cableado vía sub-fase 2.6.fix).
3. **TimeManager + Progress**: un nodo expirado tras `tick()` conserva o progress establecido (decisión 2.4.b §5.8); `canUnlock` rexéitao por `expired`.
4. **Computed progress + canUnlock**: un nodo `D` con prereq `progress_min(C, 50)` onde `C` é `computed avg [A, B]` reflicte cambios das fontes en tempo real (ALLOWED ↔ non ALLOWED segundo o estado das fontes).
5. **StatContribution condicional + computed (verifica bug-fix 2.4.e)**: un stat con `conditions: [progress_min(C, 50)]` onde `C` é computed dependente de `A` e `B` actualízase tras `setProgress` sobre `A`/`B`, confirmando que a cache do `StatComputer` se invalida adecuadamente.
6. **Round-trip Fase 2 completo**: TreeDef "monstruo" (3 recursos, effects mixtos, contribucións con `conditions` e `perTier`, `timeConstraints`, `progressSource` manual + computed, stats con clamp) que pasa por `fromJSON → unlock/setProgress → toJSON → fromJSON`. Verifica explícitamente que `toJSON` serializa **só TreeDef** (lifecycle.test.ts L:76) e que un `applyChanges` SI muta a TreeDef e persiste tras round-trip.
7. **applyChanges atómico cross-piece**: caso positivo (batch de 5 cambios sobre `cost`/`effects`/`statContributions`/`timeConstraints`/`progressSource` aplícase enteiro) + caso negativo (cambio inválido no medio → rollback total verificado por comparación serializada da TreeDef antes/despois).
8. **Cascade event ordering (verificación empírica §5.5)**: a orde dos eventos durante un `unlock` con effects fíxase contra a saída real observada — **`stateChange` → `unlock` → `auditEntry(node_unlocked)` → `progressChange` (vía effect) → `auditEntry(custom)`**. Esta orde é o contrato observable estable que se establece nesta sub-fase.

### Tests do paquete `core`: 882 → 891 (+9 novos, 8 escenarios; o 7 ten dous tests).

### Cobertura
Global 98.18% (mellora levemente fronte á baseline 2.5: 98.13%; os tests integración exercitan camiños de `TreeEngine` que ata agora non se cubrían en par cruzado).

### Observación durante o escenario 8 (escalado preventivo)
Captúrase a orde real e detéctase que o effect `modify_resource` muta o `budget` correctamente pero **non emite `budgetChange`** cando se invoca desde un effect (camiño `EffectsRunner → ResourceManager.modify`). É unha asimetría análoga á que a sub-fase 2.6.fix corrixiu para `set_progress`: outro cableado pendente da Fase 2. Briefing 2.6 §5.7 esixe non arranxar bugs descubertos silenciosamente; deixase rexistrado aquí como **escalado preventivo** para decidir posteriormente (candidato a unha 2.6.fix2 ou a Fase 3). Mentres tanto a TreeDef + estado interno seguen sendo coherentes; só fáltase a propagación do evento aos suscritores externos.

### Out of scope
- Cero modificación do motor (§5.7).
- Cero `ErrorCode` novo.
- Cero modificación de `types/`, `common/`, `engine/index.ts`, `fixtures.ts`.

### Fase 2 pechada
13 sub-fases (2.1 → 2.6) con as pezas `EffectsRunner`, `StatComputer`, `TimeManager`, `ProgressManager` implementadas, cableadas e verificadas en escenarios cross-piece. Próximo paso: hixiene MASTER + decisión sobre Fase 3 (Persistencia + Migracións) ou etapa intermedia de exemplos prácticos.
