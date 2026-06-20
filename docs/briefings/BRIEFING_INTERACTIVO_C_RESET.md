# BRIEFING — Interactivo · Capa C (demo): arranque limpo + Reset global

> **4º Arquitecto (Director) → Executor.**
> Un skill tree enténdese **construíndoo**, non mirando unha foto. O demo
> arranca **a cero** (0 nodos investidos, 18 puntos) e o usuario constrúe a
> árbore punto a punto. Engádese un **Reset global** (`engine.respec()`, full
> refund — verificado). **Só demo** (cero `@core`/`@react`). Independente da
> Capa A (pode ir en paralelo). **Human visual check.** Sen changeset.

---

## 1. Estado á entrada (verificado polo Director, HEAD `df4a41d`)

- `setupPaladinSnapshot(engine)` precarga a foto do mockup (multi-unlocks).
- `engine.respec(nodeIdOrIds?, opts?): Promise<Result<RespecResult>>` → **sen
  args = toda a árbore, refund completo** (costPercent default 0). Devolve
  budget ao inicial e nodos a 'locked'.
- O panel Status xa é reactivo (`useSyncExternalStore`, Capa economía).

## 2. Modelo (NON discutible)

1. **Arranque limpo**: NON chamar `setupPaladinSnapshot` no arranque. O demo
   crea o engine co `paladinTreeDef` e **non desbloquea nada** → 18 puntos,
   todo `locked`/`unlockable` segundo prereqs. *(Manter a función `export`ada en
   `tree-def-paladin.ts` por se se quere para un test ou modo "foto"; só deixa
   de invocarse no arranque do App.)*
2. **Reset global**: botón **«↻ Reset»** no panel Status →
   `await engine.respec()`. **Confirmation dialog** antes (ex. `window.confirm`
   ou un pequeno modal) para evitar resets accidentais. Tras o respec, o estado
   reactivo xa refresca (subscribe).

## 3. Tarefas (T0–T4)

> Scripts en `/tmp/ygg-exec/`.

### T0 — Preflight + GREP
HEAD `df4a41d`. GREP e reporta:
- Onde `App.tsx` invoca `setupPaladinSnapshot` (para retirar a chamada do
  arranque).
- Firma de `respec` e forma de `RespecResult` (para tratar o `Result`).
- Onde está o panel Status / CONTROLS (para colocar o botón Reset).

### T1 — Arranque limpo
- Eliminar a invocación de `setupPaladinSnapshot` no arranque (e o seu efecto/
  guarda). Manter o `export` da función no ficheiro de tree-def.
- Verificar que o demo arranca con budget 18/18 e cero nodos investidos.

### T2 — Reset global
- Botón «↻ Reset» no panel Status (preto do contador de puntos).
- onClick → `window.confirm('Reiniciar toda a árbore?')` (ou modal) →
  se confirma, `await engine.respec()`; tratar `Result` (err → aviso discreto).
- Tras respec, o estado reactivo (useSyncExternalStore) reflicte budget=18 e
  todo locked.

### T3 — Verificación
- Manual/script: tras `respec()`, `getBudget().resources['skill-points'] === 18`
  e ningún nodo con tier ≥ 1.
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`.

### T4 — Docs + commit (sen changeset)
- `docs/architecture/RENDERER-STATE.md`: «Interactivo Capa C — demo arranca
  limpo (sen snapshot precargada) + Reset global (respec)».
- Copia este briefing a `docs/briefings/BRIEFING_INTERACTIVO_C_RESET.md`.
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/App.tsx                              (M)
examples/react-demo/src/tree-def-paladin.ts                  (M, só se hai que axustar export)
docs/architecture/RENDERER-STATE.md                          (M)
docs/briefings/BRIEFING_INTERACTIVO_C_RESET.md               (A)
```

## 5. Que NON facer
- ❌ NON borrar a función `setupPaladinSnapshot` (só deixar de invocala).
- ❌ NON `@core`/`@react`. ❌ NON changeset. ❌ NON reset sen confirmación.

## 6. Human visual check (REGRA SAGRADA)
Agarfal abre o demo: arranca **a cero** (18/18 puntos, nada investido). Tras
investir varios puntos, **«↻ Reset»** (con confirmación) devolve todo a cero.
Visual check **pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` · `📂 DIFF` · `🔎 GREP T0` · `🟢 GATE` ·
  `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Interactivo · Capa C. 4º Arquitecto. A árbore que se constrúe desde cero. 🌳*
