# BRIEFING — Showcase · Capa 1b (Panel Inspector de Condicións)

> **4º Arquitecto (Director) → Executor.**
> **Os ollos que len o motor.** Un panel React (no demo) que, ao seleccionar un
> nodo, fai **visible** todo o que o motor xa sabe: **prerequisitos ✓/✗ por
> condición** (vía `explainUnlock`), **custo vs budget** (puntos/piedade), as
> **exclusións** activas, e un **veredicto final** (vía `canUnlock`). É o
> «Inspector de Condicións» + «Explicación de Bloqueo» do mockup, fundido nun
> panel. **Cero `@core`/`@react` novos** — só UI sobre APIs existentes. **Human
> visual check.** Examples non publican → **sen changeset**.

---

## 1. Estado á entrada (verificado polo Director, HEAD `1d65eb9`)

- `engine.explainUnlock(nodeId): Result<UnlockExplanation>` →
  `{ satisfied, conditions: UnlockConditionEvaluation[] }`,
  cada `{ condition, satisfied, reason }` (`reason` = `LocalizedString`).
- `engine.canUnlock(nodeId): Result<UnlockCheck>` → `{ allowed, reason? }`
  (veredicto final, xa contando estado/custo/exclusións).
- `engine.getBudget(): Readonly<Budget>` → `{ resources: Record<string,number> }`.
- `engine.getTreeDef()` → nodos con `cost?`, `exclusions?`, `maxTier?`.
- `engine.getNodeState(id)?.state` e `?.currentTier`.
- `engine.subscribe` + `getSnapshot` → reactividade (xa usados no Status panel).
- O demo xa rastrexa `selectedNodeId` (selección F10.7) e ten locale activo.

## 2. Modelo (NON discutible)

Un compoñente **`ConditionInspector`** (ficheiro novo no demo) que recibe
`engine`, `selectedNodeId`, `locale`, e é **reactivo** (re-renderiza ao mudar o
estado vía `useSyncExternalStore`). Estrutura (de arriba a abaixo):

1. **Cabeceira**: label do nodo + `Tier currentTier / maxTier` (se multi-tier).
   Se non hai nodo seleccionado → mensaxe «Selecciona un nodo».
2. **Prerequisitos** (`explainUnlock(nodeId)`):
   - Lista; cada condición = `[✓/✗] reason[locale]`.
   - Cabeceira do bloque indica o combinador se o hai (AND/OR/NONE) e o resumo
     `(cumpridas / total)`.
   - Se `prerequisites` baleiro → «Sen prerequisitos (raíz)».
3. **Custo** (`nodeDef.cost`, se hai): por recurso, `amount` vs
   `getBudget().resources[resourceId]` → `[✓/✗] «3 Piedade (tes 4)»`.
4. **Exclusións** (`nodeDef.exclusions`, se hai): por cada id, se
   `getNodeState(id)?.state ∈ {unlocked, in_progress, maxed}` →
   `✗ «Incompatible con <label>»`; senón `✓`.
5. **Veredicto** (`canUnlock(nodeId)`): faixa final
   `✓ «Pode desbloquearse»` (verde) ou `✗ «Non se pode: <reason[locale]>»` (vermello).

Regras:
- **Reactivo**: re-avalía ao cambiar selección OU estado do engine (un unlock
  noutro nodo pode cambiar este). Usar `useSyncExternalStore(subscribe, getSnapshot)`
  + recomputar `explainUnlock/canUnlock` no render.
- **Localización**: resolver `LocalizedString` co locale activo (helper que xa
  use o demo para os labels; reutilizar, non duplicar).
- **Defensivo**: `explainUnlock`/`canUnlock` devolven `Result` → tratar `err`
  (nodo inexistente) sen crashear.
- **Sen lóxica de motor na UI**: o panel **le e amosa**, non decide. Exclusións/
  custo compóñense de datos (`getTreeDef`/`getBudget`/`getNodeState`); os
  prerequisitos veñen **xa avaliados** de `explainUnlock` (non reimplementar).

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `1d65eb9`. Identidade git. GREP e reporta:
- Forma exacta de `UnlockExplanation`/`UnlockConditionEvaluation` e da
  `UnlockCondition` (para amosar tipo/combinador se procede).
- Como o demo **resolve `LocalizedString`** hoxe (helper de locale) — reutilizar.
- Como `App.tsx` mantén `selectedNodeId` e onde encaixar o panel (debaixo do
  Status, ou nova columna).
- `Cost`/`exclusions`/`maxTier`/`currentTier` accesibles desde `getTreeDef`/
  `getNodeState`.

### T1 — `examples/react-demo/src/ConditionInspector.tsx`
- Compoñente segundo §2. Props: `{ engine, selectedNodeId, locale }`.
- `useSyncExternalStore(engine.subscribe, engine.getSnapshot)` para reactividade.
- Funcións puras locais: `resolveLocalized`, `renderConditionRow`,
  `renderCostRow`, `renderExclusionRow`. Sen estado interno máis aló do necesario.
- Estilos inline/clases coherentes co tema escuro do demo (sen libs novas).

### T2 — Integración en `App.tsx`
- Renderizar `<ConditionInspector engine selectedNodeId locale />` no panel
  lateral (debaixo de Status, ou onde encaixe sen romper o layout existente).
- Pasar o `selectedNodeId` que xa se rastrexa; ao non haber selección, o panel
  amosa o estado baleiro.

### T3 — Tests / verificación
- Test de render (se hai runner): seleccionado `divine-judgment` cun estado onde
  faith < 10 → o panel lista a condición `stat_min(faith,10)` como **✗** e o
  veredicto **non se pode**; cun estado faith ≥ 10 → **✓**.
- `dark-pact` seleccionado (con champion/holy-warrior abertos) → bloque
  **Exclusións** marca `✗ Incompatible con Campeón / Guerreiro Sagrado` e
  veredicto non.
- Nodo con custo non affordable → fila de custo **✗**.
- (Se non hai runner, script de verificación que chame `explainUnlock`/`canUnlock`
  e asserte os ✓/✗ esperados; reportar saída.)
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`.

### T4 — Docs (sen changeset)
- `docs/architecture/RENDERER-STATE.md`: «Showcase Capa 1b — panel
  ConditionInspector (consome explainUnlock + cost/budget + exclusións +
  canUnlock; reactivo). A árbore xa se interpreta. Pendente renderer: in-progress
  visual de tiers parciais + labels por columna».
- **Sen changeset**. **Sen GUIDE** (non muda API; *opcional*: nota futura de que
  isto podería promoverse a compoñente de `@react`).
- Copia este briefing a `docs/briefings/BRIEFING_SHOWCASE_1b_INSPECTOR.md`.

### T5 — Commit + patch
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/ConditionInspector.tsx               (A)
examples/react-demo/src/App.tsx                              (M)
examples/react-demo/src/__tests__/inspector.test.tsx         (A, se hai runner)
docs/architecture/RENDERER-STATE.md                          (M)
docs/briefings/BRIEFING_SHOWCASE_1b_INSPECTOR.md             (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON tocar `@core`/`@react` (só examples + docs). Se algo parece necesitalo,
  **escala** en vez de inventar.
- ❌ NON reimplementar a avaliación de prerequisitos: ven de `explainUnlock`.
- ❌ NON decidir desbloqueos na UI: o veredicto é `canUnlock`.
- ❌ NON o in-progress visual nin as labels (seguinte briefing, renderer).
- ❌ NON tooltip in-canvas aínda (panel lateral primeiro; tooltip = futuro).
- ❌ NON changeset. NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal selecciona nodos e o panel **explica**: nun nodo bloqueado vense as
condicións ✓/✗ co seu motivo, o custo fronte ao budget, as incompatibilidades, e
o veredicto final. En concreto: seleccionar **Xuízo Divino** cando faith < 10
debe amosar `stat_min(faith, 10) ✗` — *o «por que» que antes estaba oculto*.
Seleccionar **Pacto Escuro** amosa as exclusións. Visual check **pendente de
Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` · `🟢 GATE` + saída da verificación · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing Showcase · Capa 1b. 4º Arquitecto. O motor que xa sabía, agora déixase ler. 🌳*
