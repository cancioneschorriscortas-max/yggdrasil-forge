# BRIEFING — Interactivo · Capa A (`@core`): `lockOneTier`

> **4º Arquitecto (Director) → Executor.**
> **Bloqueante do construtor interactivo.** `lock()` resetea un nodo enteiro
> (tier→0) e refunde o **custo total**. Para "retirar un punto para reasignar"
> cómpre decrementar **un só tier** e refundar **só ese tier**. Engádese
> `TreeEngine.lockOneTier(nodeId): Promise<Result<LockResult>>` como **variante
> reducida** de `lock()`. `lock()` queda **intacto** (coexisten). Local (**non
> cascadea**, igual ca `lock()`). `@core` **minor**. **Sen visual check** (tests
> + gate).

---

## 1. Estado á entrada (verificado polo Director, HEAD `df4a41d`)

- `lock(nodeId)`: esixe estado `unlocked|maxed`; `costs = getTotalCost(nodeDef,
  0, currentTier)`; `newBudget = resources.refund(costs, oldBudget)`; pon
  `state='locked'`, `currentTier=0`; corre `runBeforeLock`; emite eventos.
- `LockResult = { nodeId, newState: NodeState, refunded: readonly Cost[] }`.
- `ResourceManager.refund(costs, budget): Budget` e
  `getCostForTier(nodeDef, tier): readonly Cost[]` (custo dun tier concreto).
- `instance.currentTier`, `instance.state`.

## 2. Modelo (NON discutible)

`lockOneTier` = `lock()` pero **un tier**:

```typescript
/**
 * Retira UN tier do nodo e refunde só o custo dese tier (para reasignar
 * puntos). A diferenza de `lock()` (que resetea o nodo enteiro), isto
 * decrementa currentTier en 1. Local: NON re-bloquea dependentes (os
 * prerequisitos son portas no momento de unlock, non invariantes continuos —
 * igual ca `lock()`).
 *
 * - Nodo inexistente → err(NODE_NOT_FOUND).
 * - currentTier === 0 (ou estado 'locked') → err(INVALID_NODE_STATE).
 * - Senón: targetTier = currentTier - 1;
 *          refunded = getCostForTier(nodeDef, currentTier);  // o tier que se quita
 *          newState = targetTier === 0 ? 'locked' : 'unlocked';
 *          budget = resources.refund(refunded, budget).
 */
lockOneTier(nodeId: string): Promise<Result<LockResult>>
```

Regras:
1. **Espello de `lock()`** en estrutura: readOnly guard, busca `nodeDef`
   (NODE_NOT_FOUND), `runBeforeLock`, mutación vía `store.update`, emisión de
   eventos (lockChange/budgetChange — **idénticos** aos de `lock`).
2. Guarda de estado: se `currentTier === 0` ou estado `'locked'` →
   `err(INVALID_NODE_STATE)` (mesma semántica ca `lock` para estado inválido).
3. `refunded = getCostForTier(nodeDef, currentTier)` (**o tier que se retira**,
   non o total).
4. `newState = targetTier === 0 ? 'locked' : 'unlocked'` (un parcial nunca é
   'maxed' tras decrementar).
5. **NON** tocar `lock()`, `unlock()`, nin `respec()`.
6. **NON** cascadear (decisión v1; conectividade = feature futura).

## 3. Tarefas (T0–T4)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `df4a41d`. Identidade git. GREP e reporta:
- Corpo completo de `lock()` (para espellar: guards, hooks, `store.update`,
  eventos emitidos e os seus payloads).
- `getCostForTier` e `refund` (firmas, confirmadas).
- ¿`lock()` cascadea a dependentes? (se si, reportar; decidiremos. Asumo que NON.)
- Onde se exporta/usa `LockResult`.

### T1 — `TreeEngine.lockOneTier`
- Implementar §2, **xunto a `lock()`** (mesma rexión), espellando a súa estrutura.
- Emitir os mesmos eventos ca `lock` (lockChange + budgetChange) cos payloads
  correctos (newState, refunded, oldBudget/newBudget).

### T2 — (se procede) export
- Confirmar `lockOneTier` accesible no API público (método de instancia; sen
  cambios de index salvo que `LockResult` non estivese exportado).

### T3 — Tests (6-8)
- maxed (tier 3/3) → `lockOneTier` → tier 2, `newState='unlocked'`, `refunded` =
  custo do tier 3, budget +1 punto.
- tier 1 → `lockOneTier` → tier 0, `newState='locked'`, budget +1.
- tier 0 / locked → `err(INVALID_NODE_STATE)`.
- nodo inexistente → `err(NODE_NOT_FOUND)`.
- Secuencia unlock×3 → lockOneTier×3 → volta a tier 0 e **budget restaurado** ao
  inicial (refund acumulado == custo investido).
- Evento(s) emitidos co payload correcto.
- `lock()` segue resetando enteiro (regresión: non afectado).
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T4 — Docs + changeset + commit
- `docs/architecture/MASTER.md`: lección curta — «`lock` reseta o nodo (refund
  total); `lockOneTier` decrementa 1 tier (refund dese tier). Ambos locais (sen
  cascada): prereqs = portas en unlock, non invariantes».
- `docs/GUIDE.md`: engadir `lockOneTier` ao lado de `lock`/`unlock` (muda API
  pública → regra do doc vivo).
- Changeset `.changeset/feat-lock-one-tier.md` → `@yggdrasil-forge/core` minor:
  `feat(core): TreeEngine.lockOneTier(nodeId) — decrement one tier and refund its cost`
- Copia este briefing a `docs/briefings/BRIEFING_INTERACTIVO_A_LOCK_ONE_TIER.md`.
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/engine/TreeEngine.ts                       (M)
packages/core/__tests__/TreeEngine.lockOneTier.test.ts       (A)
docs/architecture/MASTER.md                                  (M)
docs/GUIDE.md                                                (M)
.changeset/feat-lock-one-tier.md                             (A)
docs/briefings/BRIEFING_INTERACTIVO_A_LOCK_ONE_TIER.md       (A)
```

## 5. Que NON facer
- ❌ NON tocar `lock`/`unlock`/`respec`.
- ❌ NON cascadear dependentes (v1 local).
- ❌ NON refundar o total (só o tier retirado).
- ❌ NON inventar API (GREP T0 do corpo de `lock`).

## 6. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T4) · `📂 DIFF` · `🔎 GREP T0` (corpo de lock +
  ¿cascada?) · `🟢 GATE` (conta tests) · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Interactivo · Capa A. 4º Arquitecto. Retirar un punto para reasignar. 🌳*
