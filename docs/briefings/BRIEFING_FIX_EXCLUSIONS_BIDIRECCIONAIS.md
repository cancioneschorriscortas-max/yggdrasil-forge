# BRIEFING — BUGFIX (`@core`): exclusións bidireccionais

> **4º Arquitecto (Director) → Executor.**
> **Bug de corrección.** `canUnlock` (liña ~783) e `unlock` (liña ~945) só
> comproban `nodeDef.exclusions` (o array **propio** do nodo), nunca a relación
> **inversa**. Resultado: se A exclúe B pero B ten `exclusions: []`, podes
> desbloquear A e despois B → **coexisten dous nodos mutuamente excluíntes**
> (Camiño B). As exclusións deben ser **simétricas**. **Fix:** índice inverso
> construído unha vez + comprobación de **exclusións efectivas** (propias ∪
> inversas) en `canUnlock` E `unlock`; e expoñer `getEffectiveExclusions` para a
> UI. `@core` **minor** (fix + método novo). **Sen visual check** (tests + gate).

---

## 1. Estado á entrada (verificado polo Director, HEAD `8c9ad65`)

- `canUnlock` (~783): `if (nodeDef.exclusions !== undefined) for (excludedId of
  nodeDef.exclusions) { if (estado unlocked|maxed) → EXCLUSION_VIOLATION }`.
- `unlock` (~945): **mesmo patrón** (duplicado).
- Ningún comproba: «¿hai algún Y desbloqueado que teña ESTE nodo no seu
  `Y.exclusions`?».
- `ErrorCode.EXCLUSION_VIOLATION` con `{nodeId, conflictId}` xa existe.
- `treeDef` é estático (os nodos non cambian) → o índice inverso pódese
  construír **unha vez**.

## 2. Modelo (NON discutible)

1. **Índice inverso** (construído unha vez; memoizado ou en construción do engine):
   ```
   reverseExclusions: Map<string, Set<string>>
   // para cada Y con Y.exclusions: para cada X en Y.exclusions:
   //   reverseExclusions.get(X).add(Y)
   ```
2. **Exclusións efectivas** dun nodo X:
   ```
   effectiveExclusions(X) = (X.exclusions ?? []) ∪ (reverseExclusions.get(X) ?? ∅)
   ```
   (deduplicado).
3. **`canUnlock` e `unlock`**: substituír o bucle sobre `nodeDef.exclusions` por
   un bucle sobre **`effectiveExclusions(nodeId)`**. Se algún está `unlocked|maxed`
   → `EXCLUSION_VIOLATION` con `conflictId` = ese nodo. **Mesma lóxica nos dous**
   (extraer a un helper privado para non duplicar).
4. **Expoñer** `getEffectiveExclusions(nodeId): readonly string[]` (público) para
   que a UI mostre as incompatibilidades **en ambas direccións** sen reimplementar.
5. **Sen cambio de schema** (o `TreeDef` non cambia; a simetría calcúlase).

## 3. Tarefas (T0–T4)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `8c9ad65`. Identidade git. GREP e reporta:
- O bloque de exclusións **exacto** en `canUnlock` e `unlock` (para substituír os
  dous polo helper).
- Onde construír o índice inverso (constructor do engine? memoización lazy?).
- `getErrorMessage(EXCLUSION_VIOLATION, ...)` (firma do payload).
- ¿Hai xa algún getter público similar (getTreeDef/getNodeState) para situar
  `getEffectiveExclusions`?

### T1 — Índice inverso + helper
- Construír `reverseExclusions` unha vez (desde `treeDef.nodes`).
- Helper privado `effectiveExclusions(nodeId): Set<string>` (§2.2).
- Helper privado `findActiveConflict(nodeId, state): string | undefined` que
  devolve o primeiro nodo en `effectiveExclusions` que estea `unlocked|maxed`.

### T2 — `canUnlock` + `unlock`
- Substituír **ambos** bucles polo helper (`findActiveConflict`). Se devolve un
  id → `EXCLUSION_VIOLATION` con `conflictId` = ese id (mesmo formato actual).
- **Idéntico** nos dous métodos (sen diverxencia).

### T3 — `getEffectiveExclusions` (público) + tests
- `getEffectiveExclusions(nodeId): readonly string[]` (ordenado/deduplicado).
- Tests:
  - **Camiño A** (excluidor primeiro, despois excluído): bloquea (xa ía).
  - **Camiño B** (excluído primeiro... espera: o excluído ten exclusions=[]):
    desbloquea A (que exclúe B), logo intenta B → **agora bloquea** (era o bug).
  - Simetría: A exclúe B; con A unlocked, `canUnlock(B)` bloquea; con B unlocked,
    `canUnlock(A)` bloquea.
  - `getEffectiveExclusions` devolve ambas direccións.
  - Nodo sen exclusións nin excluído por ninguén → sen conflito.
  - `unlock` (mutación) respecta o mesmo (intentar Camiño B vía unlock → err).
  - Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T4 — Docs + changeset + commit
- `MASTER.md`: lección — «exclusións eran unilaterais (só o array propio); agora
  simétricas vía índice inverso + `effectiveExclusions`. `getEffectiveExclusions`
  exposto para a UI. Mesma lóxica en canUnlock/unlock (helper único)».
- `docs/GUIDE.md` (doc vivo): nota de que as exclusións son **bidireccionais**
  (declarar nun lado abonda) + `getEffectiveExclusions(nodeId)`.
- Changeset `.changeset/fix-bidirectional-exclusions.md` →
  `@yggdrasil-forge/core` **minor**:
  `fix(core): exclusions are now symmetric (check inverse relation); add getEffectiveExclusions`
- Copia este briefing a `docs/briefings/BRIEFING_FIX_EXCLUSIONS_BIDIRECCIONAIS.md`.
- Commit + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/engine/TreeEngine.ts                       (M)
packages/core/__tests__/TreeEngine.exclusions.test.ts        (A/M)
docs/architecture/MASTER.md                                  (M)
docs/GUIDE.md                                                (M)
.changeset/fix-bidirectional-exclusions.md                   (A)
docs/briefings/BRIEFING_FIX_EXCLUSIONS_BIDIRECCIONAIS.md     (A)
```

## 5. Que NON facer
- ❌ NON cambiar o schema do `TreeDef` (simetría calcúlase, non se declara dúas veces).
- ❌ NON diverxer canUnlock vs unlock (helper único).
- ❌ NON escanear todo en cada chamada (índice inverso unha vez).
- ❌ NON tocar a UI aquí (é a sub-fase seguinte). ❌ NON inventar API (GREP T0).

## 6. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T4) · `📂 DIFF` (== §4) · `🔎 GREP T0` ·
  `🟢 GATE` (conta tests; incluír o test do Camiño B) · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Bugfix · Exclusións bidireccionais. 4º Arquitecto. A incompatibilidade vai nos dous sentidos. 🌳*
