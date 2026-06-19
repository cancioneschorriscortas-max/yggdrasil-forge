# BRIEFING — sub-fase F10.7 (Selección + hover + eventos de nodo)

> **4º Arquitecto (Director) → Executor.**
> **A árbore responde ao usuario.** (1) **Selección** visible (o aro do
> mockup), controlada por `selectedNodeId`; (2) **hover** con afordancia +
> **cursor de man** (a descubribilidade que faltaba); (3) **foco de teclado**
> (a11y); (4) evento `onNodeHover`. Todo tematizado por **inline style desde
> `useTheme()`**. «S» no roadmap. Publicable → `@react` **minor**. **Human
> visual check.**

---

## 1. Estado á entrada (verificado polo Director)

- `SkillNode` props: `node`, `instance`, `position`, `onClick?`,
  `onLongPress?`, `longPressDuration?`. **Sen** `selected`/hover/cursor.
- `SkillTree`: `onNodeClick?` → baixa como `onClick` ao `SkillNode`. **Sen**
  `selectedNodeId`/hover.
- Tema: render por inline style desde `useTheme()` (F10.3.fix). Hai
  `SkillTreeAnnouncer` (a11y) e nodos `role="button"`.

## 2. Modelo (NON discutible)

1. **Selección controlada**: `SkillTree.selectedNodeId?: string`. O nodo que
   coincide recibe `selected`. Overlay = **anel exterior** (offset do anel de
   estado), cor `theme.colors.selected ?? <fallback>`. `data-selected` no `<g>`.
2. **Hover**: `onPointerEnter/Leave` no nodo → estado local → afordancia
   **sutil** (ex. anel exterior fino ou lixeiro realce; **sen glow pesado**,
   coherente co estilo plano). Inline-themed.
3. **Cursor**: `cursor: 'pointer'` no `<g>` do nodo **cando é interactivo**
   (hai `onClick`). É afordancia de interacción (como `role="button"`),
   reversible nunha liña.
4. **Foco teclado**: anel de **focus-visible** (a11y) themed; o nodo xa é
   `role="button"` → asegurar `tabIndex` e estilo de foco.
5. **Evento**: `SkillTree.onNodeHover?: (nodeId: string | null) => void`
   (null ao saír). Opcional.
6. **`ThemeColors.selected?`** novo, **opcional** (fallback sensato, ex.
   `nodeUnlockable` ou un púrpura neutro). Hover **non** precisa cor nova
   (resólvese con opacidade/realce do que xa hai).
7. **Non romper**: pan/click/long-press seguen igual (hover é
   pointerenter/leave, ortogonal).

## 3. Tarefas (T0–T6)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional.

### T0 — Preflight + GREP
HEAD = `origin/main` (`a19f5f6`). Identidade git. GREP e reporta:
- Render do `SkillNode`: o `<g>` raíz (onde van `data-state`/handlers), e como
  se debuxa o anel (para colocar o overlay de selección por fóra sen tapar).
- `SkillTree`: bucle que mapea nodos→`<SkillNode>` (onde inxectar `selected`).
- Forma de `Theme`/`ThemeColors` (engadir `selected`).
- ¿Hai xa `tabIndex`/foco no `SkillNode`?

### T1 — `theme-types.ts`: `ThemeColors.selected?`
- `readonly selected?: string` (doc «Cor do anel de selección»). `minimal`
  pode darlle valor (ou fallback).

### T2 — `SkillNode.tsx`: selección + hover + cursor + foco
- Novo prop `readonly selected?: boolean`.
- Estado hover local (`useState`) con `onPointerEnter/Leave`.
- `useTheme()` → cores: `selected` (selección), e para hover usar realce sutil
  (ex. subir opacidade/anel exterior fino coa cor de estado).
- Render:
  - **Overlay de selección** (se `selected`): un anel exterior (ex. `<circle>`
    /forma a `radius + N`) con `stroke = selectedColor`, inline; `data-selected`.
  - **Afordancia hover** (se hover): anel/realce sutil inline.
  - **Cursor**: `style.cursor = onClick ? 'pointer' : 'default'` no `<g>`.
  - **Foco**: `tabIndex={onClick ? 0 : -1}`; estilo de focus-visible themed.
- Propagar `onNodeHover` cara arriba (callback opcional desde props).

### T3 — `SkillTree.tsx`: `selectedNodeId` + `onNodeHover`
- Props `selectedNodeId?: string`, `onNodeHover?: (id: string | null) => void`.
- No bucle: `selected={node.id === selectedNodeId}`; conectar `onNodeHover`.

### T4 — Demo
- `App.tsx`: pasar `selectedNodeId={selectedNode}` (xa se rastrexa no estado);
  opcionalmente `onNodeHover` para algo visible. Mostrar o aro de selección, o
  cursor de man e o hover.

### T5 — Tests
- `SkillNode`: `selected` → overlay presente; hover (pointerenter) → afordancia;
  cursor pointer cando hai onClick; tabIndex correcto.
- `SkillTree`: `selectedNodeId` marca o nodo certo; `onNodeHover` dispárase.
- Gate verde (lint→format→typecheck:packages→test; conta tests).

### T6 — Docs + changeset + commit
- **`docs/GUIDE.md`**: engadir á sección de interacción/tema: `selectedNodeId`,
  `onNodeHover`, e `ThemeColors.selected`. *(Mantemento do doc vivo — regra
  nova: se cambia a API pública, actualízase a GUIDE.)*
- `RENDERER-STATE.md`: 10.7 ✅; pechar pendente «cursor de man / descubribili-
  dade» do backlog.
- Changeset `.changeset/f10-7-selection-hover.md` → `@yggdrasil-forge/react`
  minor: `feat(react): node selection overlay + hover affordance + cursor + focus ring + onNodeHover; ThemeColors.selected (F10.7)`
- Copia este briefing a `docs/briefings/BRIEFING_10_7_SELECTION_HOVER.md`.
- Commit único + `git format-patch -1 HEAD`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/theme-types.ts                        (M)
packages/react/src/themes/minimal.ts                     (M, se procede)
packages/react/src/SkillNode.tsx                         (M)
packages/react/src/SkillTree.tsx                         (M)
packages/react/src/SkillTreeWithDefaultTheme.tsx         (M, pass-through props)
packages/react/__tests__/SkillNode.*.test.tsx            (M/A)
packages/react/__tests__/SkillTree.*.test.tsx            (M/A)
examples/react-demo/src/App.tsx                          (M)
docs/GUIDE.md                                            (M)
docs/architecture/RENDERER-STATE.md                      (M)
.changeset/f10-7-selection-hover.md                      (A)
docs/briefings/BRIEFING_10_7_SELECTION_HOVER.md          (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON glow pesado no hover/selección (estilo plano; aneis/realces sutís).
- ❌ NON cor por CSS vars/`<style>`: inline desde `useTheme()`.
- ❌ NON romper pan/click/long-press.
- ❌ NON props obrigatorias (todas opcionais, retrocompatibles).
- ❌ NON esquecer actualizar `GUIDE.md` (T6).
- ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: o nodo seleccionado mostra **anel de selección**; ao
pasar o rato hai **afordancia + cursor de man**; co teclado hai **anel de
foco**; o resto (pan/zoom/click/desbloqueo) segue igual. Visual check
**pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T6) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` · `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.7. 4º Arquitecto. A árbore que sente o cursor. 🌳*
