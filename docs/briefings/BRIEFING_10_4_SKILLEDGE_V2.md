# BRIEFING — sub-fase F10.4 (SkillEdge v2: curvas + estado + frechas)

> **4º Arquitecto (Director) → Executor.**
> **O edge cobra vida.** Tres melloras visibles: (1) **edges curvos** por
> defecto (look constelación), (2) **cor por estado do edge** —camiños
> «acesos» entre nodos desbloqueados, apagados se non—, (3) **frechas**
> opcionais (`directed`). Toda a tematización segue por **inline style desde
> `useTheme()`** (patrón fiable do F10.3.fix). **Defírese** a variedade de
> routing por-edge (orthogonal/chain mesturados) → será 10.4b (require
> refactor de `buildPaths` en core). Publicable → `@core` **minor** +
> `@react` **minor**. **Human visual check obrigatorio.**

---

## 1. Estado á entrada (verificado polo Director)

- `EdgeDef` ten `id/source/target/type/bidirectional?/label?/weight?/style?`.
  `EdgeStyle` = `color?/width?/dashPattern?/glow?/animated?`. **NON** ten
  `directed` nin `routing`.
- Routing vive en core: `buildPaths(layoutResult, style: CurveStyle, opts)`
  aplica **un** `CurveStyle` a **todos** os edges (straight / diagonal-* /
  radial). `EdgePath { points, kind: 'line'|'cubic'|'polyline' }`.
- `@react`: `buildPathD(path)` xera `d`; `SkillEdge` pinta `<path>` con
  `stroke` inline do tema (`theme.colors.edge`); `SkillTree` itera
  `layoutResult.edges` (Map edgeId→EdgePath) e renderiza `<SkillEdge>`.

## 2. Alcance (NON discutible)

**SI nesta sub-fase:**
1. **Curvar por defecto** os edges do demo (constelación).
2. **Estado do edge** (active/inactive) derivado dos estados dos nodos
   source/target → cor/opacidade.
3. **Frechas** opcionais: `EdgeStyle.directed?: boolean` + marker SVG.

**NON nesta sub-fase (→ 10.4b/futuro):**
- Variedade de routing **por-edge** (orthogonal/chain mesturados). Require
  que `buildPaths` lea overrides por-edge — refactor de core, aparte.
- Edges animados (`animated`), glow do edge.

## 3. Decisións de deseño

1. **Estado do edge** (helper puro): `active` se o nodo **source** está en
   `{unlocked, maxed}`; senón `inactive`. (Camiño «aceso» desde nodos
   conquistados.) **GREP `NodeState` e `engine.getNodeState`** en T0 para a
   firma real.
2. **Cor**:
   - `active` → `theme.colors.edgeActive ?? theme.colors.edge`, opacidade 1.
   - `inactive` → `theme.colors.edge`, opacidade ~0.4 (inline
     `style.opacity`).
3. **`ThemeColors.edgeActive?`** novo, **opcional** (fallback a `edge`). Non
   rompe temas.
4. **Frechas**: marker SVG único nos `<defs>` do `SVGRenderer`, fill =
   `theme.colors.edge` (inline/themed). `SkillEdge` engade `marker-end`
   **só** se `edge.style?.directed === true`.
5. **Curvar**: preferir facelo pola **configuración de layout** (se
   `LayoutConfig`/engine xa expón un curve style), non hardcodeando en
   @react. **GREP en T0**: ¿onde/como se aplica `buildPaths`? ¿`LayoutConfig`
   ten campo de curva? Se si → o demo sételo (ex. `diagonal-vertical`). Se
   non hai vía limpa, **escala** antes de inventar (non meter `buildPaths` a
   man no @react sen acordo).

## 4. Tarefas (T0–T7)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional:
> spreads condicionais; cero `undefined` literal.

### T0 — Preflight + GREP (obrigatorio, reporta)
HEAD = `origin/main` post-merge do version PR. Identidade git. GREP e reporta:
- `NodeState` (valores) e firma de `engine.getNodeState`.
- Como se aplica `buildPaths`/curva hoxe (engine pipeline? `LayoutConfig`
  ten curve style? o demo curva ou vai recto?).
- Esquema **Zod** de `EdgeStyle` (onde está; para engadir `directed`).
- Estrutura de `<defs>` no `SVGRenderer` (¿existe xa algún `<defs>`?).

### T1 — core: `EdgeStyle.directed?` (type + Zod + tests)
- `packages/core/src/types/edge.ts`: engadir a `EdgeStyle`
  `readonly directed?: boolean` (doc: «Debuxar frecha no extremo target»).
- Engadir ao **Zod schema** de `EdgeStyle` (`directed: z.boolean().optional()`).
- Test de schema (acepta `directed`; type-test aliñación tipo↔schema se
  existe ese patrón no repo).

### T2 — @react: `ThemeColors.edgeActive?`
- `theme-types.ts`: `readonly edgeActive?: string` en `ThemeColors`
  (doc: «Cor do edge activo/aceso»).
- Tema `minimal` (interno): darlle `edgeActive` sensato (ex. un pouco máis
  claro/cálido que `edge`).

### T3 — @react: estado do edge (helper + SkillTree)
- Helper puro `edgeStateFor(sourceState: NodeState | undefined): 'active' | 'inactive'`
  (active se source ∈ {unlocked, maxed}).
- `SkillTree.tsx`: ao renderizar cada edge, resolver o estado do **source**
  vía `engine.getNodeState(edge.source)` e pasar
  `edgeState` ao `<SkillEdge>`. (GREP: o `edge` (EdgeDef) por edgeId — pode
  vir de `engine.getTreeDef().edges` ou similar; **non inventes**.)

### T4 — @react: `SkillEdge` v2 (cor por estado + marker-end)
- Novo prop `readonly edgeState?: 'active' | 'inactive'`.
- Cor inline (substitúe o cálculo actual de stroke):
  ```typescript
  const theme = useTheme()
  const base = theme?.colors.edge
  const activeColor = theme?.colors.edgeActive ?? base
  const isActive = edgeState === 'active'
  const stroke = isActive ? activeColor : base
  const style: CSSProperties = {
    ...(stroke !== undefined && { stroke }),
    ...(theme?.sizes.strokeWidth !== undefined && { strokeWidth: theme.sizes.strokeWidth }),
    ...(isActive ? {} : { opacity: 0.4 }),
  }
  ```
- `marker-end`: se `edge.style?.directed === true`, engadir
  `markerEnd={`url(#${arrowMarkerId})`}`. O `arrowMarkerId` debe coincidir
  co do `SVGRenderer` (ex. `yf-arrow` ou `yf-arrow-${themeId}`); **pásao por
  prop** desde SkillTree/SVGRenderer ou usa un id estable compartido —
  decide a vía máis limpa segundo o GREP de `<defs>`.

### T5 — @react: `SVGRenderer` `<defs>` con marker de frecha
- Engadir (ou ampliar) `<defs>` co marker de frecha:
  ```tsx
  <defs>
    <marker id={arrowMarkerId} viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" style={arrowFillStyle} />
    </marker>
  </defs>
  ```
  `arrowFillStyle = { fill: theme?.colors.edge }` (inline, themed). Só
  emitir o marker se `theme !== null` (coherente co resto).

### T6 — Demo
- **Curvar**: aplicar o curve style vía a vía limpa do T0 (ex.
  `rpgTreeDef.layout` con curva, ou config do engine). Edges curvos.
- **Frecha**: marcar 1–2 edges con `style: { directed: true }` no `tree-def.ts`
  para validar a frecha (ex. as dependencias principais).
- Resultado: camiños curvos; os que saen de nodos desbloqueados **acesos**
  (edgeActive), o resto apagados; frechas onde se marcou.

### T7 — Tests + changeset + commit
- Tests: `edgeStateFor` (mapa de estados); `SkillEdge` (active→stroke
  edgeActive+op1; inactive→edge+op0.4; `directed`→marker-end presente);
  `SVGRenderer` (marker en defs cando hai tema); core schema `directed`.
- Gate verde (lint→format→typecheck:packages→test; conta tests).
- Changesets:
  - `.changeset/f10-4-edge-directed.md` → `@yggdrasil-forge/core` minor:
    `feat(core): EdgeStyle.directed for arrowheads (F10.4)`
  - `.changeset/f10-4-skilledge-v2.md` → `@yggdrasil-forge/react` minor:
    `feat(react): SkillEdge v2 — edge-state coloring + directed arrowheads + ThemeColors.edgeActive (F10.4)`
- Copia este briefing a `docs/briefings/BRIEFING_10_4_SKILLEDGE_V2.md`.
- Actualiza `docs/architecture/RENDERER-STATE.md` (marca 10.4 ✅; move
  «routing por-edge» a 10.4b no backlog).
- Commit único + `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/types/edge.ts                          (M)
packages/core/src/engine/<zod-schema-de-EdgeStyle>.ts    (M)   ← localiza no T0
packages/core/__tests__/<edge-schema>.test.ts            (M/A)
packages/react/src/theme-types.ts                        (M)
packages/react/src/themes/minimal.ts                     (M)
packages/react/src/SkillTree.tsx                         (M)
packages/react/src/SkillEdge.tsx                         (M)
packages/react/src/SVGRenderer.tsx                       (M)
packages/react/__tests__/SkillEdge.*.test.tsx            (M/A)
packages/react/__tests__/SVGRenderer.test.tsx            (M)
examples/react-demo/src/tree-def.ts                      (M)
examples/react-demo/src/App.tsx (ou layout config)       (M, se procede)
.changeset/f10-4-edge-directed.md                        (A)
.changeset/f10-4-skilledge-v2.md                         (A)
docs/briefings/BRIEFING_10_4_SKILLEDGE_V2.md             (A)
docs/architecture/RENDERER-STATE.md                      (M)
```
Rutas exactas confírmaas no T0; se difiren, **adapta e reporta**, non inventes.

## 6. Que NON facer
- ❌ NON tocar `buildPaths`/routing por-edge (é 10.4b).
- ❌ NON hardcodear cores nin curvas no @react (curva vía layout config;
  cor vía `useTheme()` inline).
- ❌ NON `directed` obrigatorio nin `edgeActive` obrigatorio (rompe).
- ❌ NON volver a CSS vars/`<style>` para cor de edges (inline style).
- ❌ NON inventar API do engine (GREP T0).

## 7. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: edges **curvos**; ao desbloquear nodos, os edges que
saen deles **acéndense** (cor/opacidade), o resto apagados; as frechas
aparecen nos edges marcados `directed`. Visual check **pendente de Agarfal**;
non se pecha sen o seu OK.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T7) · `📂 DIFF` (== §5) ·
- `🔎 GREP T0` (NodeState, getNodeState, vía de curva, Zod EdgeStyle, defs) ·
- `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.4. 4º Arquitecto. Camiños curvos e acesos; o ceo da árbore. 🌳*
