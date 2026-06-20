# BRIEFING — Renderer · Sub-fase 1: Cor de nodo por estado

> **4º Arquitecto (Director) → Executor.**
> Hoxe o **corpo** do nodo é unha soa cor (`nodeFill`) e só o **anel** varía por
> estado. Pídese que **o corpo tamén** varíe (bloqueado apagado, etc.), non só o
> aro. Tres niveis: (1) **fill por estado** (tokens opcionais), (2) **estado
> visual derivado** para que un multi-tier a medias se pinte **`in_progress`**
> en corpo *e* anel (resolve o pendente do dourado parcial), e (3) honrar
> **`NodeDef.color`** como override por-nodo (hoxe ignórase). Cero regresión
> (todo opcional, fallback a `nodeFill`). `@react` **minor**. **Human visual check.**

---

## 1. Estado á entrada (verificado polo Director, HEAD `0e5a650`)

- `SkillNode.tsx`: `fill = theme?.colors.nodeFill ?? '#f4f4ef'` (**único**, liña
  ~114); `ring = ringColorForState(theme, state)` (**por estado**, liña ~115).
- `ringColorForState(theme, state): string` está en `SkillNode.tsx:445`.
- `ThemeColors`: cores de estado (anel) `nodeLocked/Unlockable/Unlocked/Maxed/
  InProgress` (liñas 81-93); `nodeFill?` opcional (117).
- `NodeDef.color?` existe (`node.ts:129`) pero **non se aplica** ao render.
- `instance.currentTier` e `nodeDef.maxTier` accesibles no `SkillNode`.

## 2. Modelo (NON discutible)

### 2.1 Fill por estado (tokens novos, opcionais)
A `ThemeColors`, engadir (todos `?`, fallback a `nodeFill`):
```typescript
readonly nodeFillLocked?: string
readonly nodeFillUnlockable?: string
readonly nodeFillUnlocked?: string
readonly nodeFillMaxed?: string
readonly nodeFillInProgress?: string
```

### 2.2 Estado visual derivado (in-progress parcial)
```typescript
// Cosmético: un multi-tier a medias píntase 'in_progress' aínda que o
// NodeState do motor sexa 'unlocked'. NON toca o motor.
export function visualStateFor(
  state: NodeState, currentTier: number, maxTier: number | undefined,
): NodeState {
  if (maxTier !== undefined && maxTier > 1 && currentTier > 0 && currentTier < maxTier) {
    return 'in_progress'
  }
  return state
}
```
- **Tanto o anel como o fill usan `visualState`**: `ringColorForState(theme,
  visualState)` (no canto de `state`) e o novo `fillColorForState(...)`.

### 2.3 `fillColorForState` (xemelgo de `ringColorForState`)
```typescript
export function fillColorForState(
  theme: Theme, visualState: NodeState, nodeColor?: string,
): string {
  // Prioridade: override por-nodo > fill por estado > nodeFill > default.
  if (nodeColor !== undefined) return nodeColor
  const c = theme.colors
  const byState =
    visualState === 'locked' ? c.nodeFillLocked :
    visualState === 'unlockable' ? c.nodeFillUnlockable :
    visualState === 'in_progress' ? c.nodeFillInProgress :
    visualState === 'maxed' ? c.nodeFillMaxed :
    c.nodeFillUnlocked
  return byState ?? c.nodeFill ?? '#f4f4ef'
}
```

### 2.4 Aplicación no `SkillNode`
- `const visualState = visualStateFor(state, currentTier, maxTier)`.
- `const ring = ringColorForState(theme, visualState)`.
- `const fill = fillColorForState(theme, visualState, nodeDef.color)`.
- (O resto igual; o `fill` xa se usa nos elementos do corpo.)

Regras:
- **Cero regresión**: sen tokens de fill nin `node.color` → `nodeFill` (igual ca
  hoxe). O único cambio visible por defecto: os multi-tier a medias pasan a
  ring-**in_progress** (o dourado parcial que xa queriamos).
- **`node.color` gaña sempre** (override explícito; o consumidor que o pon quere
  esa cor). *(Modular node.color por estado = mellora futura.)*

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/`. exactOptional, noUncheckedIndexedAccess, sen
> `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `0e5a650`. Identidade git. GREP e reporta:
- `ringColorForState` (corpo, para espellar en `fillColorForState`).
- Onde se usa `fill` no render do corpo (para substituír pola versión por estado).
- `ThemeColors` (para engadir tokens) e o tema `minimal` (déixase **sen** fills
  por estado → comportamento actual).
- Confirmar `instance.currentTier`/`nodeDef.maxTier`/`nodeDef.color` accesibles.

### T1 — `theme-types.ts`
- Engadir os 5 `nodeFill*?` (§2.1) con doc.

### T2 — `SkillNode.tsx`
- `visualStateFor` (§2.2) + `fillColorForState` (§2.3), exportadas (xunto a
  `ringColorForState`).
- Aplicar §2.4 (visualState para anel e fill; `node.color` override).

### T3 — Demo: Theme Lab
- Engadir pickers para os 5 fills por estado (sección "Fill por estado").
- Opcional showcase: no tema escuro do demo, dar `nodeFillLocked` apagado (ex.
  máis escuro/desaturado) e `nodeFillInProgress` dourado tenue, para que se vexa
  a diferenza de corpo. (Sen romper presets existentes.)

### T4 — Tests
- `fillColorForState`: prioridade node.color > estado > nodeFill > default.
- `visualStateFor`: multi-tier 1/3 → 'in_progress'; 3/3 → 'maxed'; single-tier
  unlocked → 'unlocked'; locked → 'locked'.
- `SkillNode`: con `nodeFillLocked` set, nodo locked usa ese fill; multi-tier a
  medias usa fill+ring in_progress; `node.color` gaña; sen tokens → `nodeFill`.
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T5 — Docs + changeset + commit
- `docs/GUIDE.md` (doc vivo): novos tokens `nodeFill*`, a derivación in-progress
  de tiers parciais, e que `node.color` agora tinguir o corpo (override).
- `RENDERER-STATE.md`: «Renderer — fill por estado + in-progress visual de tiers
  parciais + node.color aplicado. Pendente: labels por columna; rexións; iconos».
- Changeset `.changeset/feat-per-state-node-fill.md` → `@yggdrasil-forge/react`
  minor: `feat(react): per-state node fill + in-progress visual for partial tiers + NodeDef.color override`
- Copia este briefing a `docs/briefings/BRIEFING_RENDERER_FILL_POR_ESTADO.md`.
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/theme-types.ts                            (M)
packages/react/src/SkillNode.tsx                             (M)
packages/react/__tests__/SkillNode.*.test.tsx                (M/A)
examples/react-demo/src/ThemeLab.tsx                         (M)
examples/react-demo/src/theme.ts                             (M, se procede)
docs/GUIDE.md                                                (M)
docs/architecture/RENDERER-STATE.md                          (M)
.changeset/feat-per-state-node-fill.md                       (A)
docs/briefings/BRIEFING_RENDERER_FILL_POR_ESTADO.md          (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON facer obrigatorios os tokens (todos `?`, fallback a `nodeFill`).
- ❌ NON tocar o motor (visualState é cosmético).
- ❌ NON dar fills por estado ao tema `minimal` (consérvao neutro).
- ❌ NON modular `node.color` por estado (override directo; mellora futura).
- ❌ NON esquecer `GUIDE.md`. ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: cun tema que defina `nodeFillLocked`, os **bloqueados
vense apagados de corpo enteiro** (non só anel); os multi-tier **a medias**
vense **dourados** (corpo+anel) e os maxed distintos; `Pacto Escuro` (que ten
`node.color`) tínguese coa súa cor propia. Sen tema con fills → igual ca antes.
Visual check **pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) · `🔎 GREP T0` ·
  `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` · `🚨 ESCALADAS`.

---

*Briefing Renderer · Fill por estado. 4º Arquitecto. O nodo enteiro fala, non só o aro. 🌳*
