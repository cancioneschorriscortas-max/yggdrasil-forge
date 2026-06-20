# BRIEFING — Showcase · Capa 1a-fix-core (BUG 1): sincronización de stats

> **4º Arquitecto (Director) → Executor.**
> **Bug real do motor.** `state.computedStats` iníciase a `{}` (`StateStore.ts`)
> e **non se escribe nunca**. `UnlockResolver.getStat` (liña ~597) le esa caché
> morta → **todo stat vale 0** → `stat_min` sempre falla. O `StatComputer`
> calcula ben pero o resolver non o consulta. **Fix:** o resolver pasa a obter
> stats **en vivo** vía `StatComputer`, inxectado no `UnlockResolverContext`.
> Afecta a `canUnlock` E `explainUnlock` (mesmo ctx — A.6.26). `@core` **patch**
> (bugfix). **Sen visual check** (tests + gate). Desbloquea Xuízo Divino no demo.

---

## 1. Estado á entrada (verificado polo Director, HEAD `31951e6`)

- `StateStore.ts:131` → `computedStats: {}` (única asignación; **nunca** se
  reescribe).
- `UnlockResolver.getStat` (~596): `return ctx.state.computedStats?.[statId] ?? 0`
  → sempre 0.
- `UnlockResolver` usa `getStat` en `stat_min` (avaliación liña ~215 e
  explicación liña ~398).
- `TreeEngine.statComputer.computeStat(statId)` (liña ~385) **calcula ben**
  (initial + contribucións, per-tier incluído — `StatComputer.ts:282`).
- `UnlockResolverContext` constrúese en `canUnlock` **e** `explainUnlock` (deben
  quedar idénticos).

## 2. Modelo (NON discutible)

`state.computedStats` é unha **caché morta**: a fonte de verdade dos stats é o
`StatComputer`. O resolver debe consultalo **en vivo**, non ler a caché.

1. Engadir ao **`UnlockResolverContext`** un accessor:
   ```typescript
   readonly getStat: (statId: string) => number
   ```
2. O `TreeEngine` cableao a `this.statComputer.computeStat` **na construción do
   ctx**, idéntico en `canUnlock` e `explainUnlock`:
   ```typescript
   const ctx: UnlockResolverContext = {
     treeDef, state, locale, progressManager,
     getStat: (statId) => this.statComputer.computeStat(statId),
   }
   ```
3. `UnlockResolver.getStat` pasa a delegar:
   ```typescript
   private getStat(statId: string, ctx: UnlockResolverContext): number {
     return ctx.getStat(statId)
   }
   ```
   (Elimínase a lectura de `ctx.state.computedStats`.)
4. **NON** se toca `StatComputer` nin a forma de `state`. `state.computedStats`
   pode quedar como está (caché legacy sen uso no resolver) ou documentarse como
   deprecada; **non a borres** neste fix (podería usala outra ruta — confírmao
   en T0 e reporta; se ninguén máis a le, déixaa cun TODO).

## 3. Tarefas (T0–T4)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `31951e6`. Identidade git. GREP e reporta:
- Confirmar que `computedStats` só se asigna en `StateStore.ts:131` (`{}`) e
  **ningures máis** (`grep -rn "computedStats" packages/core/src`).
- `UnlockResolverContext` (interface): campos actuais (para engadir `getStat`).
- A construción do ctx en `canUnlock` **e** `explainUnlock` (líñas exactas).
- Firma de `StatComputer.computeStat` e que devolve initial+contribucións.
- ¿Algún outro lector de `state.computedStats`? (decide se deprecar ou deixar).

### T1 — `UnlockResolverContext` + resolver
- Engadir `getStat: (statId: string) => number` á interface do contexto.
- `UnlockResolver.getStat` delega en `ctx.getStat(statId)`.

### T2 — `TreeEngine`: cablear o accessor
- En `canUnlock` **e** `explainUnlock`, engadir
  `getStat: (statId) => this.statComputer.computeStat(statId)` ao ctx (idéntico
  nos dous — coherencia A.6.26).

### T3 — Tests
- Árbore con `stats:[{id:'pwr', initial:6}]` e dous nodos que contribúen
  `+3`/`+2` a `pwr` (un `perTier`). Desbloquear → `stat_min(pwr, 10)` **pasa**
  (6+3+... ≥ 10); con menos contribucións **falla**. (Replica o caso faith=12 do
  Paladín.)
- `explainUnlock` dun nodo con `stat_min` reflicte `satisfied` correcto e o
  `reason` co valor real (non 0).
- Regresión: tests existentes de stats/unlock seguen verdes.
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T4 — Docs + changeset + commit
- `docs/architecture/MASTER.md`: lección nova (A.6.27?) — «`state.computedStats`
  era unha caché morta (`{}` e nunca escrita); a avaliación de `stat_min` debe
  ler os stats **en vivo** do `StatComputer` vía accessor no
  `UnlockResolverContext`. Mesmo ctx en canUnlock/explainUnlock.»
- Changeset `.changeset/fix-stat-sync.md` → `@yggdrasil-forge/core` **patch**:
  `fix(core): stat_min reads live stats from StatComputer (computedStats was a dead cache)`
- Copia este briefing a `docs/briefings/BRIEFING_SHOWCASE_1a_FIX_CORE_STATS.md`.
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/engine/UnlockResolver.ts                   (M)
packages/core/src/engine/TreeEngine.ts                       (M)
packages/core/src/types/unlock.ts  (ou onde viva UnlockResolverContext) (M)
packages/core/__tests__/...stat...                           (A/M)
docs/architecture/MASTER.md                                  (M)
.changeset/fix-stat-sync.md                                  (A)
docs/briefings/BRIEFING_SHOWCASE_1a_FIX_CORE_STATS.md        (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON tocar `StatComputer` (xa calcula ben).
- ❌ NON borrar `state.computedStats` (confirma usos en T0; déixaa cun TODO se orfa).
- ❌ NON diverxer o ctx de `canUnlock` vs `explainUnlock` (idéntico).
- ❌ NON inventar API (GREP T0).

## 6. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T4) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` (usos de computedStats + ctx) · `🟢 GATE` (conta tests) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing Capa 1a-fix-core. 4º Arquitecto. O motor que xa calculaba, agora tamén se le. 🌳*
