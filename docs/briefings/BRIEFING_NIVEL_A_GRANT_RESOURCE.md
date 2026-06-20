# BRIEFING — Nivel · Capa A (`@core`): `grantResource`

> **4º Arquitecto (Director) → Executor.**
> **Enabler do sistema de nivel.** O motor non ten forma de **mutar un recurso
> en runtime** (só `cost`/`refund`/`respec`). Para un nivel 1→10 con +/-, e en
> xeral para conceder XP/ouro/etc., engádese
> `TreeEngine.grantResource(resourceId, amount): Promise<Result<GrantResult>>`
> que axusta o valor dun recurso no budget por un delta (pode ser negativo),
> **clampeado a `[0, resource.max]`**. O nivel modelarase como recurso e gátase
> cos `resource_min` existentes (aparece no Inspector de balde). `@core`
> **minor**. **Sen visual check** (tests + gate).

---

## 1. Estado á entrada (verificado polo Director, HEAD `c1f237e`)

- **Non hai** método público que mute un recurso (só mutacións internas en
  unlock/refund). `respec` resetea ao inicial.
- `resource_min` (condición) comproba `budget.resources[id] >= amount` **sen
  gastar** → serve para gatar por nivel.
- `Budget = { resources: Record<string, number> }`; `Resource` ten `max?`.
- Patrón de mutación: `store.update(draft => { draft.budget = ... })` + emisión
  de `budgetChange` (ver `lock`/`unlock`).

## 2. Modelo (NON discutible)

```typescript
/**
 * Axusta o valor dun recurso no budget por `amount` (pode ser negativo).
 * Clampea a [0, resource.max]. Para conceder/retirar recursos en runtime
 * (XP, nivel, ouro...). NON é un custo nin un refund: é unha concesión directa.
 *
 * - resourceId descoñecido → err(UNKNOWN_RESOURCE) (ou o erro estándar do repo).
 * - Senón: novo = clamp(actual + amount, 0, max ?? +∞); escribe budget; emite budgetChange.
 */
grantResource(resourceId: string, amount: number): Promise<Result<GrantResult>>
```
- `GrantResult` (novo ou reuso): `{ resourceId, previous: number, current: number }`.
- Clamp: `Math.max(0, Math.min(max ?? Infinity, actual + amount))`.
- Emitir `budgetChange` (mesmo evento que usan cost/refund) para que a UI
  reactiva (useSyncExternalStore) se actualice.

## 3. Tarefas (T0–T4)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `c1f237e`. Identidade git. GREP e reporta:
- Como `lock`/`unlock` mutan `draft.budget` e emiten `budgetChange` (payload).
- Onde se declara `Resource` (para ler `max`) e o tipo de erro estándar
  (`err(...)`) usado para resource descoñecido.
- ¿Existe xa algún `GrantResult`/`*Result` reusable?

### T1 — `TreeEngine.grantResource`
- Implementar §2 (clamp + escritura + evento). Buscar o `Resource` en
  `treeDef.resources` para `max`; se non existe o recurso → `err`.

### T2 — (se procede) tipo + export
- `GrantResult` exportado se é novo.

### T3 — Tests (5-6)
- grant +3 a un recurso a 7 (max 20) → 10.
- grant que supera `max` → clampea a `max`.
- grant negativo que baixaría de 0 → clampea a 0.
- recurso descoñecido → `err`.
- emite `budgetChange` (subscribe recibe).
- `resource_min` despois de `grantResource` reflicte o novo valor (integración).
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T4 — Docs + changeset + commit
- `docs/GUIDE.md` (doc vivo): `grantResource(resourceId, amount)` ao lado de
  `unlock`/`lock`/`respec`, con exemplo (conceder XP / subir nivel).
- `MASTER.md`: nota curta — «grantResource = concesión directa (clamp [0,max]),
  distinta de cost/refund. Habilita niveis/XP modelados como recurso + resource_min».
- Changeset `.changeset/feat-grant-resource.md` → `@yggdrasil-forge/core` minor:
  `feat(core): TreeEngine.grantResource(id, amount) — runtime resource adjustment (clamped)`
- Copia este briefing a `docs/briefings/BRIEFING_NIVEL_A_GRANT_RESOURCE.md`.
- Commit + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/engine/TreeEngine.ts                       (M)
packages/core/src/types/*.ts                                 (M, se GrantResult novo)
packages/core/__tests__/TreeEngine.grantResource.test.ts     (A)
docs/GUIDE.md                                                (M)
docs/architecture/MASTER.md                                  (M)
.changeset/feat-grant-resource.md                            (A)
docs/briefings/BRIEFING_NIVEL_A_GRANT_RESOURCE.md            (A)
```

## 5. Que NON facer
- ❌ NON tocar cost/refund/respec.
- ❌ NON permitir valores fóra de `[0, max]` (clamp sempre).
- ❌ NON inventar API (GREP T0 do patrón de mutación + evento).

## 6. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` · `📂 DIFF` · `🔎 GREP T0` · `🟢 GATE` (conta tests)
  · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Nivel · Capa A. 4º Arquitecto. O recurso que sobe e baixa. 🌳*
