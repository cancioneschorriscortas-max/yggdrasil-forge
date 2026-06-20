# BRIEFING — Showcase · Economía de Puntos (Status panel + BUG 2 + BUG 3)

> **4º Arquitecto (Director) → Executor.**
> **Facer visible a economía** que o motor xa ten oculta. Engádese un recurso
> **`skill-points`** (pool de 18) que cada tier consome (1 pt/tier); o motor xa
> **desconta do budget ao desbloquear** e marca **maxed ao investir o último
> punto** (verificado). Mantense **Piedade** como **segunda economía** (nodos
> divinos). O panel **Status** reescríbese para amosar os dous pools en vivo vía
> **`useSyncExternalStore`** → arranxa **BUG 3** (race do subscribe) de raíz. E
> **BUG 2** péchase cambiando o prereq de Escudo Divino. **Só demo + TreeDef**
> (cero `@core`/`@react`). **Human visual check.** Examples non publican → **sen
> changeset**.

---

## 1. Estado á entrada (verificado polo Director, HEAD `582bd89`)

- `unlock()` colle `getCostForTier(nodeDef, currentTier+1)` e **desconta** vía
  `ResourceManager.applyCost(costs, budget)` (atómico); `targetTier >= maxTier`
  → estado **`maxed`**.
- `getCostForTier`: usa `costPerTier[tier-1]`; **se non hai, usa `cost`** → un
  `cost` único aplícase **a todos os tiers** (= 1 pt/tier sen repetir).
- `engine.getBudget(): Readonly<Budget>` (público); `Budget = { resources:
  Record<string,number> }`.
- `engine.subscribe(listener)` + `engine.getSnapshot(): TreeState` → aptos para
  `useSyncExternalStore`.
- **BUG 2**: no motor `in_progress` = `supportsProgress` (0-100%), **non**
  multi-tier; un multi-tier a medias é `unlocked`. Logo
  `node_state(healing-hands,'in_progress')` nunca se cumpre.

## 2. Modelo (resolucións de Director)

1. **Recurso `skill-points`** (pool xeral de progresión), `initial:18, max:18`.
2. **Todos os nodos de progresión** levan `cost:[{resourceId:'skill-points',
   amount:1}]` → 1 punto por tier (multi-tier = N puntos para maxear).
3. **Nodos divinos** (`divine-shield`, `divine-judgment`) seguen con
   `cost:[{resourceId:'piety',amount:3}]` → **segunda economía**.
4. **BUG 2**: `divine-shield.prerequisites` pasa a
   `node_state(healing-hands,'unlocked')` (estado alcanzable; segue demostrando
   `node_state`). *(O "en progreso" visual dos tiers parciais é unha feature do
   renderer — vén no briefing seguinte; e un `in_progress` xenuíno vía
   `supportsProgress` queda como mellora futura.)*
5. **BUG 3**: o panel Status le estado/budget vía **`useSyncExternalStore`**
   (`subscribe` + `getSnapshot`/`getBudget`) → sen perder eventos do snapshot
   async nin do StrictMode.
6. **Contador de nodos** corríxese: conta `unlocked` + `in_progress` + `maxed`
   (tier ≥ 1), non só `'unlocked'`.
7. O **badge do nodo (2/3)** XA é "puntos investidos / total" — non hai que
   tocalo; é a vista por-nodo.

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `582bd89`. Identidade git. GREP e reporta:
- `engine.getBudget` / `getSnapshot` / `subscribe` (firmas).
- Estrutura actual do panel Status en `App.tsx` (o efecto subscribe + count a
  substituír) e como se le `engine.getNodeState`.
- Confirmar que `cost` único se aplica por tier (re-ler `getCostForTier`).
- Forma de `Resource` (para declarar `skill-points`).

### T1 — `tree-def-paladin.ts`: economía
- Engadir recurso `skill-points`:
  ```typescript
  { id: 'skill-points', label: { gl: 'Puntos', es: 'Puntos', en: 'Points' },
    initial: 18, max: 18, icon: '⭐', color: '#f0c040' }
  ```
  (mantén `piety`). `startingBudget: { resources: { 'skill-points': 18, piety: 7 } }`.
- Engadir `cost: [{ resourceId: 'skill-points', amount: 1 }]` a **estes 11
  nodos**: sword-basics, shield-wall, berserker-rage, war-veteran, holy-warrior,
  champion-of-light, valor-aura, dark-pact, holy-light, healing-hands, smite.
- `divine-shield` e `divine-judgment`: **manter** `cost:[{resourceId:'piety',
  amount:3}]` (segunda economía).
- **BUG 2**: `divine-shield.prerequisites` →
  `{ type: 'node_state', nodeId: 'healing-hands', state: 'unlocked' }`.
- O `setupPaladinSnapshot` non cambia de secuencia; agora gasta puntos
  (sword3+shield2+berserker1+holy-light2+healing1+smite1+holy-warrior1+champion1+
  valor1 = **13** de 18 → **5 restantes**; piety intacta 7). Verificar que todos
  os unlocks seguen sendo affordable na orde.

### T2 — `App.tsx`: panel Status reactivo (BUG 3) + pools
- Substituír o efecto manual de subscribe/count por **`useSyncExternalStore`**:
  - `const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)`
    (ou un wrapper estable de subscribe).
  - Derivar do snapshot: nodos con tier ≥ 1 (unlocked+in_progress+maxed) para o
    contador; e os pools desde `engine.getBudget().resources`.
- Amosar no panel Status:
  - **Puntos**: `skill-points` restantes `/ 18`.
  - **Piedade**: `piety` restante `/ max`.
  - **Nodos**: contador corrixido `/ total`.
- Guarda anti-doble-execución do `setupPaladinSnapshot` (ref flag) para StrictMode.

### T3 — Tests / verificación
- `validateTreeDef(paladinTreeDef)` ok.
- Tras `setupPaladinSnapshot`:
  `getBudget().resources['skill-points'] === 5`, `piety === 7`.
  `getNodeState('divine-shield')==='unlockable'` (node_state(healing-hands,
  unlocked) ✓ + piety ok), `divine-judgment==='unlockable'` (faith 12 ✓).
- Desbloquear un nodo de progresión **resta 1** a `skill-points`.
- (Se non hai runner no demo, script `/tmp/ygg-exec/verify-econ.mjs` + reportar saída.)
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`.

### T4 — Docs (sen changeset)
- `docs/architecture/RENDERER-STATE.md`: nota «Showcase — economía de puntos
  visible (skill-points pool 18 + piety); Status panel reactivo
  (useSyncExternalStore) → BUG 3 resolto; BUG 2 resolto (divine-shield
  node_state→unlocked). Pendente renderer: in-progress visual de tiers parciais
  + labels por columna».
- **Sen changeset** (examples). **Sen GUIDE** (non muda API pública).
- Copia este briefing a `docs/briefings/BRIEFING_SHOWCASE_ECONOMIA_PUNTOS.md`.

### T5 — Commit + patch
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/tree-def-paladin.ts                  (M)
examples/react-demo/src/App.tsx                              (M)
examples/react-demo/src/__tests__/paladin.test.ts            (M, se existe)
docs/architecture/RENDERER-STATE.md                          (M)
docs/briefings/BRIEFING_SHOWCASE_ECONOMIA_PUNTOS.md          (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON tocar `@core` nin `@react` (só examples + docs).
- ❌ NON o "in-progress visual" dos tiers parciais (é o briefing seguinte, renderer).
- ❌ NON as labels por columna (renderer, seguinte).
- ❌ NON `in_progress` xenuíno vía supportsProgress (mellora futura).
- ❌ NON changeset.
- ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: o panel Status amosa **Puntos 5/18** e **Piedade 7/…**;
ao desbloquear un nodo, **os puntos baixan**; o contador de nodos xa **non
queda en 3/13** (reflicte a foto completa). Xuízo e Escudo Divino **dispoñibles**.
*(Os tiers parciais aínda se verán como 'unlocked', non 'en progreso' — iso é o
seguinte briefing.)* Visual check **pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` · `🟢 GATE` + saída da verificación de pools/estados ·
- `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing Showcase · Economía de Puntos. 4º Arquitecto. Os puntos que se ven baixar. 🌳*
