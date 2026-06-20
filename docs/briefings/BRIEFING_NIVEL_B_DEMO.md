# BRIEFING — Nivel · Capa B (demo): recurso `level` + control +/- + gates

> **4º Arquitecto (Director) → Executor.**
> O **sistema de nivel** visible. Modélase o nivel como recurso **`level` (1→10)**;
> os nodos gátanse co `resource_min(level, N)` **existente** (logo aparece **só
> no Inspector**: «Necesitas nivel 10, tes X»). Control **+/-** no panel Status
> que chama a `grantResource('level', ±1)` (xa aterrado). O **Pacto Escuro
> maldito** ábrese a **nivel 10**; un nodo intermedio a **nivel 3** para amosar
> desbloqueos escalonados. **Só demo + TreeDef** (sen `@core`/`@react`). **Human
> visual check.** Sen changeset.

---

## 1. Estado á entrada (verificado polo Director, HEAD `67bb611`)

- `engine.grantResource(resourceId, amount): Promise<Result<GrantResult>>`
  (clamp `[0, max]`, emite budgetChange) — **xa existe** (liña ~1525).
- `resource_min{resourceId, amount}` comproba budget sen gastar; pasa por
  `explainUnlock` → o Inspector amósao.
- Demo arranca limpo (Capa C) → non hai snapshot que romper ao gatar por nivel.
- Status panel reactivo (useSyncExternalStore); o Inspector consome explainUnlock.
- `dark-pact` ten `color:'#7d3cff'` (node.color, gaña sempre → segue morado aínda
  bloqueado; ver §5 nota).

## 2. Modelo (resolucións de Director)

1. **Recurso `level`**: `{ id:'level', label:{gl:'Nivel',es:'Nivel',en:'Level'},
   initial: 1, max: 10, icon:'🎖️' }`. **Non** se gasta (sen `cost` en level);
   só se axusta co +/-. `startingBudget.resources.level = 1`.
2. **Gates por nivel** (combínanse co prereq existente vía `all`):
   - `dark-pact`: engadir `resource_min(level, 10)` →
     `all[node_unlocked(sword-basics), resource_min(level, 10)]` (mantén
     exclusións). *O maldito ábrese a nivel 10.*
   - `war-veteran`: engadir `resource_min(level, 3)` →
     `all[nodes_count(4, warrior), resource_min(level, 3)]`. *Desbloqueo
     escalonado a nivel 3.*
   - *(Os niveis/nodos son contido tuneable por Agarfal; estes son os defaults.)*
3. **Control +/-** no Status: amosar **«Nivel: X / 10»** con ➕/➖.
   - ➕ → `grantResource('level', +1)`; ➖ → `grantResource('level', -1)`
     (o clamp xa o fai o motor). Reactividade vía o subscribe existente.
4. **Sen auto-relock**: baixar o nivel **non** re-bloquea nodos xa abertos
   (prereqs = portas en unlock, non invariantes — coherente con lock/lockOneTier).

## 3. Tarefas (T0–T4)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `67bb611`. Identidade git. GREP e reporta:
- `grantResource` (firma confirmada) e como o demo le o budget (`getBudget`) no
  Status reactivo.
- `dark-pact` e `war-veteran` no `tree-def-paladin` (prereqs actuais, para
  envolver en `all`).
- Onde colocar o control +/- de nivel no panel Status.

### T1 — `tree-def-paladin.ts`: recurso + gates
- Engadir recurso `level` (§2.1) + `startingBudget.resources.level = 1`.
- Envolver os prereqs de `dark-pact` e `war-veteran` en `all` co `resource_min`
  (§2.2). Manter `exclusions` de dark-pact.

### T2 — demo: control de nivel no Status
- «Nivel: X / 10» + ➕/➖ → `grantResource('level', ±1)`.
- Verificar reactividade (o valor e os estados dos nodos actualízanse).

### T3 — Tests / verificación
- `grantResource('level', +1)` sobe; clamp a 10; ➖ clamp a 0.
- A nivel < 10, `dark-pact` **bloqueado**; `explainUnlock('dark-pact')` lista
  `resource_min(level,10)` como **✗**. A nivel 10 → a condición pasa a ✓ (e o
  veredicto depende das exclusións).
- `war-veteran`: a nivel < 3 a condición de nivel ✗; a nivel ≥ 3 ✓.
- (Se non hai runner, script de verificación + reportar saída.)
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`.

### T4 — Docs (sen changeset)
- `RENDERER-STATE.md`: «Nivel · Capa B — recurso `level` 1→10 + control +/-
  (grantResource) + gates `resource_min(level,N)` (dark-pact=10, war-veteran=3);
  o Inspector explica os gates de nivel; nodos bloqueados por nivel = fill de
  bloqueo».
- Copia este briefing a `docs/briefings/BRIEFING_NIVEL_B_DEMO.md`.
- Commit + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/tree-def-paladin.ts                  (M)
examples/react-demo/src/App.tsx                              (M)
examples/react-demo/src/__tests__/*.test.ts*                 (M, se hai runner)
docs/architecture/RENDERER-STATE.md                          (M)
docs/briefings/BRIEFING_NIVEL_B_DEMO.md                      (A)
```

## 5. Que NON facer
- ❌ NON `@core`/`@react` (grantResource e resource_min xa existen).
- ❌ NON auto-relock ao baixar nivel.
- ❌ NON changeset.
- ❌ NON inventar API (GREP T0).
- **Nota dark-pact**: ten `node.color` (morado sempre, mesmo bloqueado). Se
  Agarfal quere que se vexa **apagado** ata nivel 10, hai dúas vías (decidir
  despois, **non** neste briefing): (a) quitarlle `node.color` → segue o fill de
  estado; (b) modular node.color por estado (mellora futura). Por agora **queda
  morado** (a súa identidade); o Inspector xa explica o gate de nivel igual.

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: ve **«Nivel: 1 / 10»** con ➕/➖. Sube o nivel; ao chegar a
**3**, Veterano de Guerra deixa de estar bloqueado por nivel; ao chegar a **10**,
o **Pacto Escuro** queda dispoñible (segundo exclusións). Selecciona un nodo
bloqueado por nivel → o **Inspector** di «Necesitas nivel N, tes X ✗». Visual
check **pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T4) · `📂 DIFF` (== §4) · `🔎 GREP T0` ·
  `🟢 GATE` + saída de verificación · `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` ·
  `🚨 ESCALADAS`.

---

*Briefing Nivel · Capa B. 4º Arquitecto. O nivel que abre portas. 🌳*
