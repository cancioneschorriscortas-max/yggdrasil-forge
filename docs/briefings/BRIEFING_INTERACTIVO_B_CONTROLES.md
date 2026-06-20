# BRIEFING — Interactivo · Capa B (`@react`): badge visible + controis ➕➖

> **4º Arquitecto (Director) → Executor.**
> A peza que fai o demo **xogable**: (1) un **badge de tier visible** que non
> colisione co icono, e (2) **controis ➕/➖** no nodo seleccionado para investir
> e retirar puntos. **Decisión de Director:** os controis son **SVG nativos
> dentro do `<g transform>`** (móvense co viewport, sen proxectar coords á
> pantalla), **NON** overlay HTML ancorado. Depende da Capa A (`lockOneTier`)
> para o cableado do demo. `@react` **minor**. **Human visual check.**

---

## 1. Estado á entrada (verificado polo Director, HEAD `df4a41d`)

- `SkillNode`: `const tier = instance?.currentTier ?? 0` (liña 87); `data-tier`
  (liña 280). **O tier non parece renderizarse como texto visible** (só atributo)
  → confírmao en T0; o badge "2/3" hai que **garantilo visible**.
- Selección (F10.7): `selectedNodeId` + overlay; viewport (F10.6): `<g transform>`
  + `<defs>` fóra. Os controis deben ir **dentro** do transform.
- `nodeDef.maxTier`, `instance.currentTier` accesibles no render.

## 2. Modelo (NON discutible)

### 2.1 Badge de tier visible
- Para nodos **multi-tier** (`maxTier > 1`) ou cando se pida, renderizar
  `${currentTier}/${maxTier}` nun lugar **non-colisionante** (esquina **inferior
  dereita** do nodo), inline-themed, por riba do icono.
- Prop `showTierBadge?: boolean` no `SkillTree`/`SkillNode` (default: amosar en
  multi-tier). Así é visible aínda que o icono caia ao fallback de texto.

### 2.2 Controis ➕/➖ (SVG nativo)
- Cando hai **nodo seleccionado** E se pasan callbacks, renderizar **dous
  controis SVG** (círculos pequenos con ➕ e ➖) **adxacentes** ao nodo
  seleccionado, **dentro do `<g transform>`** (móvense/escalan co viewport).
- Novos props no `SkillTree`:
  ```typescript
  onNodeTierIncrease?: (nodeId: string) => void
  onNodeTierDecrease?: (nodeId: string) => void
  canIncrease?: (nodeId: string) => boolean   // opcional (afordabilidade/prereqs)
  ```
- **Disabled (render)**:
  - ➖ desactivado se `currentTier === 0`.
  - ➕ desactivado se `currentTier >= maxTier` (maxed) **ou** se
    `canIncrease?.(nodeId) === false`. Se `canIncrease` non se pasa → ➕ activo
    (o motor rexeitará e o demo pode avisar).
- onClick dos controis → os callbacks (que **NON** chaman ao motor desde `@react`;
  o demo cablea). `stopPropagation` para non disparar selección/pan.
- Coherencia visual: usar cores do tema (`useTheme`), tamaño proporcional ao nodo.

### 2.3 Demo (cableado)
- `App.tsx`: `onNodeTierIncrease={(id) => void engine.unlock(id)}`,
  `onNodeTierDecrease={(id) => void engine.lockOneTier(id)}`,
  `canIncrease={(id) => engine.canUnlock(id).ok && engine.canUnlock(id).value.allowed}`
  (ou helper equivalente). Reactividade xa cuberta (useSyncExternalStore).

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `df4a41d` (ou o que estea tras Capa A). Identidade git. GREP e reporta:
- Como/se `SkillNode` renderiza o tier hoxe (texto? só `data-tier`?) e onde
  colocar o badge sen tapar icono/label.
- A estrutura do `<g transform>` (onde inxectar os controis do seleccionado).
- Como `SkillTree` recibe `selectedNodeId` e pasa props a `SkillNode`.
- Confirmar que `lockOneTier` xa existe (Capa A aterrada) para o cableado do demo.

### T1 — Badge visible (`SkillNode`)
- Render `${currentTier}/${maxTier}` inferior-dereita (inline-themed) para
  multi-tier; prop `showTierBadge?`.

### T2 — Controis ➕➖ (`SkillTree` + subcompoñente SVG)
- Props §2.2; render SVG dos controis no nodo seleccionado dentro do transform;
  disabled segundo §2.2; `stopPropagation`.

### T3 — Demo (`App.tsx`)
- Cablear os tres props (§2.3). Verificar o ciclo: ➕ sobe tier e baixa puntos;
  ➖ baixa tier e devolve puntos; ao chegar 3/3 desbloquéase o seguinte que o
  requira; ➕ disabled en maxed; ➖ disabled en tier 0.

### T4 — Tests
- `SkillNode`: badge visible en multi-tier; `showTierBadge` respéctase.
- `SkillTree`: con nodo seleccionado + callbacks → controis presentes; ➖
  disabled a tier 0; ➕ disabled a maxed/`canIncrease=false`; clicks disparan os
  callbacks correctos; sen selección → sen controis.
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T5 — Docs + changeset + commit
- `docs/GUIDE.md` (regra do doc vivo): `showTierBadge`, `onNodeTierIncrease`,
  `onNodeTierDecrease`, `canIncrease` + exemplo de construtor interactivo.
- `RENDERER-STATE.md`: «Interactivo Capa B — badge visible + controis ➕➖ SVG no
  nodo seleccionado (decisión: SVG nativo, non overlay HTML)».
- Changeset `.changeset/feat-tier-controls.md` → `@yggdrasil-forge/react` minor:
  `feat(react): visible tier badge + per-node tier +/- controls (interactive builder)`
- Copia este briefing a `docs/briefings/BRIEFING_INTERACTIVO_B_CONTROLES.md`.
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/SkillNode.tsx                             (M)
packages/react/src/SkillTree.tsx                             (M)
packages/react/src/SkillNodeControls.tsx                     (A, subcompoñente SVG)
packages/react/src/SkillTreeWithDefaultTheme.tsx             (M, pass-through props)
packages/react/__tests__/SkillNode.*.test.tsx                (M/A)
packages/react/__tests__/SkillTree.*.test.tsx                (M/A)
examples/react-demo/src/App.tsx                              (M)
docs/GUIDE.md                                                (M)
docs/architecture/RENDERER-STATE.md                          (M)
.changeset/feat-tier-controls.md                             (A)
docs/briefings/BRIEFING_INTERACTIVO_B_CONTROLES.md           (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON overlay HTML proxectado (usar SVG dentro do transform).
- ❌ NON chamar ao motor desde `@react` (callbacks; o demo cablea).
- ❌ NON props obrigatorias (todas opcionais, retrocompatibles).
- ❌ NON esquecer `stopPropagation` (evitar selección/pan ao premer un control).
- ❌ NON esquecer `GUIDE.md`. ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal selecciona un nodo: aparecen **➕ e ➖** ao lado; ➕ sobe `0/3→1/3→…→3/3`
e os **puntos baixan**; ➖ devolve puntos; ao chegar a 3/3 o nodo seguinte que o
require **desbloquéase** e xa admite puntos; ➕ apágase en maxed, ➖ en tier 0. O
badge `x/N` vese sempre. Visual check **pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) · `🔎 GREP T0` ·
  `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Interactivo · Capa B. 4º Arquitecto. A árbore que se constrúe co dedo. 🌳*
