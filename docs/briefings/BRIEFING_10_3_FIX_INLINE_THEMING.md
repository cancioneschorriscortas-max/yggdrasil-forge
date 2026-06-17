# BRIEFING — sub-fase F10.3.fix (tematización por atributo directo)

> **4º Arquitecto (Director) → Executor.**
> **Arranxo de raíz do Theme Lab.** A tematización dos nodos pasa de
> «CSS vars + `<style>` scopeado por `useId`» a **`fill`/`stroke` inline
> calculado desde `useTheme()`** nos propios compoñentes. Inline style ten
> máxima prioridade, mantén transicións, e **elimina** a superficie fráxil
> (cascada/scope/herdanza de vars no SVG) que facía que o Theme Lab só
> reflectise o fondo. Publicable → `@react` **minor**. **Human visual check.**

---

## 1. Diagnóstico (verificado polo Director)

O chain «vars + regras `var()` + `<style>` scopeado por `[data-theme-id]`»
**está correcto na fonte** e o código en execución **é F10.3** (a anatomía
orbe próbao). Aínda así o navegador non aplica as regras de cor: só
funciona o `background` (inline). Conclusión: **o `<style>` interno do
`<svg>` non se aplica de forma fiable** neste contexto. En vez de perseguir
o porqué exacto na cascada (invisible en remoto), **eliminamos a
dependencia do `<style>`**: cada compoñente calcula a súa cor desde
`useTheme()` e aplícaa como **inline style** (propiedade CSS, non atributo,
para conservar transicións).

## 2. Estado á entrada

`origin/main` en `931794b` (F10.3 + theme-lab). Verde. Este traballo
refactoriza a capa de tematización; **non** cambia a anatomía orbe.

## 3. Modelo novo (NON discutible)

1. **`SkillNode`, `SkillEdge`, `MeshOverlay`** chaman `useTheme()` e
   calculan as súas cores en JS. Aplícanas como **inline `style`**
   (`style={{ fill, stroke, strokeWidth }}`) — NON como atributos SVG
   (atributos non transicionan con CSS).
2. **`SVGRenderer`** deixa de emitir `buildThemeStyle` (vars) e as **regras
   de cor** de `buildThemeRules`. **Conserva** `data-theme-id` + o bloque
   `<style>` de **animacións** (`buildAnimationsCSS`: transicións, keyframes,
   pulse, reduced-motion) — eses scopéanse por `data-theme-id` e seguen
   válidos. As transicións funcionan porque o `style` inline cambia a
   propiedade CSS `fill`/`stroke`.
3. **`Theme` gaña dous campos opcionais** (sen romper temas existentes):
   - `ThemeColors.nodeFill?: string` — interior do orbe (fallback `#f4f4ef`).
   - `ThemeSizes.ringWidth?: number` — grosor do anel (fallback `3`).
4. **Mapa estado→cor** (en `SkillNode`, helper puro):
   `locked→nodeLocked`, `unlockable→nodeUnlockable`, `unlocked→nodeUnlocked`,
   `maxed→nodeMaxed`, `in_progress→nodeInProgress`. (GREP os valores reais
   de `NodeState` antes — non inventes.)
5. **Demo Theme Lab**: `fill`→`theme.colors.nodeFill`,
   `ringWidth`→`theme.sizes.ringWidth`. O wrapper só conserva `background`
   (canvas). Elimínanse as vars `--yf-color-node-fill`/`--yf-ring-width` do
   wrapper.
6. **Fallback headless** (`theme === null`): sen tema, os shapes quedan sen
   `fill`/`stroke` inline (herdan o que haxa) — comportamento actual headless.

## 4. Tarefas (T0–T8)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional:
> spreads condicionais; cero `undefined` literal en props opcionais.

### T0 — Preflight
Fresh clone; HEAD `931794b`. Identidade git. **GREP**: valores de `NodeState`;
firma de `renderNodeShape` (de `nodeGeometry.tsx`); como `SkillEdge` e
`MeshOverlay` pintan hoxe (clases). Reporta o que atopes.

### T1 — `Theme` (campos opcionais)
- `packages/react/src/theme-types.ts`: engadir
  `readonly nodeFill?: string` a `ThemeColors` (doc: «Interior do orbe») e
  `readonly ringWidth?: number` a `ThemeSizes` (doc: «Grosor do anel»).
- Se hai tema `minimal` (interno), darlle `nodeFill` e `ringWidth` sensatos.
- Se existe validación/tipo-test do Theme, actualizala.

### T2 — `nodeGeometry.tsx`: aceptar estilo
- `renderNodeShape(shape, r, style?: CSSProperties)`: pasar `style` ao
  elemento (`<circle style={style} .../>`, etc.). Manter `className` SHAPE_CLASS.

### T3 — `SkillNode.tsx`: cor desde `useTheme()` inline
- `import { useTheme } from './ThemeProvider.js'`.
- Helper puro `ringColorForState(theme, state): string` co mapa de §3.4.
- Calcular:
  ```typescript
  const theme = useTheme()
  const fill = theme?.colors.nodeFill ?? '#f4f4ef'
  const ring = theme !== null ? ringColorForState(theme, state) : undefined
  const ringWidth = theme?.sizes.ringWidth ?? 3
  const textColor = theme?.colors.text
  const fontSize = theme?.sizes.fontSize
  ```
- Pasar a `renderNodeShape(shape, radius, { fill, ...(ring && { stroke: ring }), strokeWidth: ringWidth })`.
- Aos `<text>` (icon/label/progress): `style={{ ...(textColor && { fill: textColor }), ...(fontSize && { fontSize }) }}`.

### T4 — `SkillEdge.tsx`: stroke inline desde `useTheme()`
- `useTheme()` → `stroke = theme?.colors.edge`; `strokeWidth = theme?.sizes.strokeWidth`.
- Aplicar inline `style={{ ...(stroke && { stroke }), ...(strokeWidth && { strokeWidth }) }}`
  no path do edge. (Manter className para a transición.)

### T5 — `MeshOverlay.tsx`: stroke inline desde `useTheme()`
- Igual: `stroke = theme?.colors.mesh`, `strokeWidth = theme?.sizes.strokeWidth`,
  inline nos elementos do mesh.

### T6 — `SVGRenderer.tsx`: eliminar vars + regras de cor
- **Borrar** `buildThemeStyle` e a súa aplicación (`style={themeStyle}`).
- En `buildThemeRules`: **eliminar** as regras de cor de nodo/edge/mesh/label
  e a `bgRule`. **Conservar** só a chamada a `buildAnimationsCSS(themeId)`
  (transicións/keyframes). Renomear a algo coherente se procede
  (ex. inliner directo de `buildAnimationsCSS`).
- **Conservar** `data-theme-id={themeId}` (áncora das animacións).
- O `<svg>` xa non leva `style` de vars (o canvas vén do wrapper do demo).

### T7 — Demo (`examples/react-demo`)
- `App.tsx`: `builtTheme` inclúe `colors.nodeFill = themeVals.fill` e
  `sizes.ringWidth = themeVals.ringWidth`. `wrapperStyle` só
  `{ background: themeVals.canvas }` (fóra as vars `--yf-color-node-fill`/
  `--yf-ring-width`).
- `ThemeLab.tsx`: sen cambios de UI (segue controlando `fill`/`ringWidth`),
  só cambia onde aterran (xa o fai vía `onChange`→`themeVals`→`builtTheme`).
- `styles.css`: as regras `.yf-skill-node__shape`/`text` que quedan
  (transition/font/opacity) seguen válidas; non tocar cor.

### T8 — Tests + changeset + commit
- Actualizar tests de `SVGRenderer` que asertaban as regras `var()` de cor
  (xa non existen) → asertar que **non** se emiten regras de cor de nodo, e
  que `data-theme-id` + bloque de animacións seguen presentes.
- `SkillNode`: novo/actualizado — co theme do `ThemeProvider`, o shape leva
  inline `style.fill`/`style.stroke`/`style.strokeWidth` esperados por estado;
  os `<text>` levan `style.fill = text`.
- `SkillEdge`/`MeshOverlay`: stroke inline desde tema.
- Gate completo verde (lint→format→typecheck:packages→test, conta tests).
- `.changeset/f10-3-fix-inline-theming.md`:
  ```markdown
  ---
  '@yggdrasil-forge/react': minor
  ---

  refactor(react): theme node/edge/mesh via inline style from useTheme (not scoped <style> CSS vars); add ThemeColors.nodeFill + ThemeSizes.ringWidth (F10.3.fix)
  ```
- Copia este briefing a `docs/briefings/BRIEFING_10_3_FIX_INLINE_THEMING.md`.
- Commit único + `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada)
```
packages/react/src/theme-types.ts                      (M)
packages/react/src/nodeGeometry.tsx                    (M)
packages/react/src/SkillNode.tsx                       (M)
packages/react/src/SkillEdge.tsx                       (M)
packages/react/src/MeshOverlay.tsx                     (M)
packages/react/src/SVGRenderer.tsx                     (M)
packages/react/src/theme-minimal.ts (ou onde estea minimal)  (M, se existe)
packages/react/__tests__/SVGRenderer.test.tsx          (M)
packages/react/__tests__/SkillNode.*.test.tsx          (M/A)
packages/react/__tests__/SkillEdge.*.test.tsx          (M, se existe)
examples/react-demo/src/App.tsx                        (M)
.changeset/f10-3-fix-inline-theming.md                 (A)
docs/briefings/BRIEFING_10_3_FIX_INLINE_THEMING.md     (A)
```
Outros ficheiros (ou nomes que difiran tras o GREP T0) → **reporta e
adapta**, non inventes. Se algún paso revela que `SkillEdge`/`MeshOverlay`/
`minimal` teñen outra estrutura, **escala con datos**, non forces.

## 6. Que NON facer
- ❌ NON usar atributos SVG `fill=`/`stroke=` (non transicionan) — **inline `style`**.
- ❌ NON deixar regras de cor `var()` no `SVGRenderer` (a fonte do bug).
- ❌ NON converter `nodeFill`/`ringWidth` en obrigatorios (rompe temas).
- ❌ NON tocar a anatomía orbe nin o engine.
- ❌ NON inventar `NodeState`/firmas (GREP T0).

## 7. Human visual check (REGRA SAGRADA)
Tras aplicar: Agarfal abre o demo, **cambia cores no Theme Lab e confirma
que os NODOS (fill + anel) e os edges actualizan ao instante**, non só o
fondo. Despois tunea a paleta e decide claro/escuro. Visual check
**pendente de Agarfal**; a sub-fase non se pecha sen o seu OK.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T8) · `📂 DIFF` (== §5) ·
- `🔎 GREP T0` (NodeState, renderNodeShape, SkillEdge/MeshOverlay/minimal reais) ·
- `🟢 GATE` (lint/format:check/typecheck:packages/test; conta tests) ·
- `👁️ VISUAL` (PENDENTE de Agarfal) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.3.fix. 4º Arquitecto. Inline e á proba de balas; adeus á cascada fantasma. 🌳*
