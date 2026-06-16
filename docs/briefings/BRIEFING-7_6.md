# BRIEFING — SUB-FASE 7.6 de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEXTA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react` un módulo interno **`animations.ts`** que
> xenera regras CSS de animación, e modifica **`SVGRenderer.tsx`**
> para incluír esas regras no `<style>` interno cando hai un tema
> activo (mesmo mecanismo que as regras de cor desde 7.4).
>
> **Animacións entregadas (4 efectos)**:
> 1. **Transition de cor/stroke** nos nodos (cambio suave cando muda
>    o `data-state`).
> 2. **Hover effect** en nodos clickables (cursor + opacity sutil).
> 3. **Pulse** para nodos `data-state="unlockable"` (sinal de affordance).
> 4. **Transition de stroke/width** nos edges (preparado para futuras
>    highlights).
>
> **DIFERIDOS**: glow específico para `in_progress`, edge highlights
> coordinados, animacións de aparición/desaparición de nodos,
> Framer Motion (rich animations), `prefers-reduced-motion` (7.8).
>
> **Cero modificación de** SkillTree, SkillNode, SkillEdge,
> MeshOverlay, ThemeProvider, SkillTreeWithDefaultTheme, svg-helpers,
> createDefaultLayoutRegistry, theme-types, themes/minimal, hooks/*
> **nin** os seus tests.
>
> Keyboard/ARIA (7.7), prefers-reduced-motion (7.8), SSR/RSC entry
> points (7.9), mobile/touch (7.10), error boundaries (7.11), tests
> visuais (7.12) DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Lección 7.5 L1
(verificación empírica de comportamento runtime de APIs)**: o director
verificou en §2 os comportamentos do core e de useId() para sustentar
as decisións deste briefing.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.6 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.6 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas reais con
xustificación. **Cero regresión de cobertura tolerada** respecto á
baseline post-7.5.

**0.12 — Lección 7.5 L1**: scripts de verificación runtime onde
aplique. En 7.6 cero comportamento crítico require script novo (a
infraestrutura `<style>` xa probada en 7.4).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de
SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx, MeshOverlay.tsx,
ThemeProvider.tsx, SkillTreeWithDefaultTheme.tsx, svg-helpers.ts,
createDefaultLayoutRegistry.ts, theme-types.ts, themes/minimal.ts,
hooks/*. **Tódolos 55 tests existentes deben pasar intactos**.

**0.14 — PREPARACIÓN PARA 7.8 (prefers-reduced-motion)**: o módulo
animations.ts **agrupa todas as regras de animación nun bloque
documentado** ("ANIMATION BLOCK START" / "ANIMATION BLOCK END")
para que 7.8 só engada un `@media` envoltorio. **Cero implementación
de prefers-reduced-motion** neste briefing.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.6** de Yggdrasil Forge. **SEXTA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (3 grupos)**:

**Grupo A — Módulo de animacións (NOVO)**:
1. **`packages/react/src/animations.ts`**: función pura
   `buildAnimationsCSS(themeId: string): string` que devolve un bloque
   de regras CSS scopeadas por `[data-theme-id="${themeId}"]` con:
   - Transitions de fill/stroke nos nodos.
   - Hover effects en nodos clickables.
   - `@keyframes yf-pulse` + animation aplicada a `data-state="unlockable"`.
   - Transitions de stroke nos edges.

**Grupo B — Integración en SVGRenderer (MODIFICADO)**:
2. **`packages/react/src/SVGRenderer.tsx`**: importar
   `buildAnimationsCSS` e concatenar o seu output ao final de
   `buildThemeRules(theme, themeId)` cando hai tema activo. **Cero
   cambio na estrutura DOM** (segue sendo un só `<style>` element).

**Grupo C — Tests**:
3. **`packages/react/__tests__/animations.test.ts`** (NOVO): ~6
   tests para verificar contido do CSS xerado.
4. **`packages/react/__tests__/SVGRenderer.test.tsx`** (MODIFICADO):
   engadir ~2 tests para verificar que as animacións están presentes
   no `<style>` cando hai tema, e ausentes en modo headless. **Cero
   modificación dos 9 tests existentes**.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- `SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`, `MeshOverlay.tsx`,
  `ThemeProvider.tsx`, `SkillTreeWithDefaultTheme.tsx`, `svg-helpers.ts`,
  `createDefaultLayoutRegistry.ts`, `theme-types.ts`, `themes/minimal.ts`,
  `hooks/*`, `headless.ts`, `index.ts`.
- Tests existentes (smoke, SkillTree, MeshOverlay, ThemeProvider,
  themes, headless, hooks). **Só `SVGRenderer.test.tsx`** se amplía
  con +2 tests.
- `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `86d5157`, verificada empíricamente
en clone independente)**.

### Spec MASTER §30 (literal)

```
## 30. ANIMATION FRAMEWORK

CSS-first + Framer Motion opcional para `animations="rich"`.
```

§67: "**7.6** Animation framework básico (CSS)".
§107 (build size table): "Animations base | CSS" e "Animations rich
| Framer Motion (peer)".

**Polo tanto 7.6 entrega só o "base CSS"**. Framer Motion como peer
opcional **DIFERIDO** (probable sub-fase fora da Fase 7).

### Estado de SVGRenderer.tsx tras 7.4 (verificado)

A función interna `buildThemeRules(theme: Theme, themeId: string):
string` xera regras CSS scopeadas via `[data-theme-id="${themeId}"]`
e inxéctase no `<style>` interno do SVG. **Iso é o mecanismo
natural para engadir animacións**: concatenar máis regras no mesmo
output.

`useId()` de React 19 devolve algo como `«r0»` ou `:r0:` (depende da
versión). **Verificado empíricamente** en 7.4: o id producido por
useId() funciona como **valor de atributo HTML/SVG (`data-theme-id="..."`)** e
funciona en **CSS attribute selectors (`[data-theme-id="..."]`)**.
**NON é necesariamente válido como CSS identifier directo** (e.g.
`@keyframes :r0:` non funciona). Polo tanto:
- **Selectores scopeados por attribute selector**: ✓ funciona.
- **Nomes de `@keyframes` scopeados por themeId**: ✗ non viable
  con useId().

### Decisión sobre nome de keyframes

**Decisión**: usar **nome global `yf-pulse`** (cero scope). Razóns:
- React useId() non produce identifiers CSS válidos directamente.
- A probabilidade de colisión con outro CSS na mesma páxina que use
  `@keyframes yf-pulse` é extremadamente baixa (prefixo `yf-`
  reservado).
- **Documentar** como contrato público (`yf-pulse` é parte do
  nome reservado polo paquete).

### Decisión sobre `<style>` único vs múltiples

Mantemos **un só `<style>` element por SVGRenderer**, igual que
en 7.4. As regras de animación concatenan ao final das regras de
tema. **Cero cambio estrutural en DOM**.

### Modo headless (theme === null)

En modo headless, **cero `<style>` se inxecta** (decisión 7.4
mantida). Polo tanto **cero animación CSS automática** en headless.
**O consumidor headless pode aplicar as súas animacións custom** via
CSS externo, usando os mesmos selectors (yf-skill-node[data-state="..."],
yf-skill-edge, etc.) que son contrato público estable.

### Estado scaffold tras 7.5

```
packages/react/src/
├── animations.ts                  (NOVO en 7.6)
├── SVGRenderer.tsx                (MODIFICADO en 7.6)
├── theme-types.ts                 (cero modif)
├── themes/minimal.ts              (cero modif)
├── ThemeProvider.tsx              (cero modif)
├── SkillTreeWithDefaultTheme.tsx  (cero modif)
├── SkillTree.tsx                  (cero modif)
├── SkillNode.tsx                  (cero modif)
├── SkillEdge.tsx                  (cero modif)
├── MeshOverlay.tsx                (cero modif)
├── svg-helpers.ts                 (cero modif)
├── createDefaultLayoutRegistry.ts (cero modif)
├── headless.ts                    (cero modif)
├── index.ts                       (cero modif)
└── hooks/                         (cero modif)
    ├── useSkillTree.ts
    ├── useNodeState.ts
    ├── useNodeSelector.ts
    ├── useStat.ts
    └── index.ts
```

**Cero compoñentes nin módulos novos publicamente expostos**: o módulo
`animations.ts` é **interno** (cero export desde index.ts/headless.ts).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `86d5157` (hooks customizados 7.5).
- 1523 core + 60 common + 193 storage + 55 react = ~1831 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- packages/react/: 6 compoñentes públicos + 1 wrapper interno + 4
  hooks customizados + 2 módulos internos + sistema de temas.
- Cobertura global packages/react post-7.5: **93.04% Stmts /
  82.22% Branch / 93.75% Funcs / 94.17% Lines**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` o módulo interno
`animations.ts` (función `buildAnimationsCSS(themeId)` que devolve
regras CSS scopeadas con 4 efectos: transitions de fill/stroke nos
nodos, hover en nodos clickables, pulse para `data-state="unlockable"`,
transitions de stroke en edges), e modificar `SVGRenderer.tsx` para
concatenar ese output ao final das regras de tema dentro do `<style>`
interno cando hai tema activo (cero cambio estrutural en DOM, cero
animacións en modo headless). **Cero exposición pública do módulo
animations**. **Cero modificación de calquera outro compoñente ou
módulo nin dos seus tests (salvo SVGRenderer.test.tsx que amplíase
con +2 tests sen tocar os 9 existentes)**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/animations.ts` (~50 liñas).
- `packages/react/__tests__/animations.test.ts` (~100 liñas; ~6 tests).
- `.changeset/animations.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/SVGRenderer.tsx` (engadir import +
  concatenar call a `buildAnimationsCSS(themeId)` ao final de
  `buildThemeRules`).
- `packages/react/__tests__/SVGRenderer.test.tsx` (engadir 2 tests;
  cero modificación dos 9 existentes).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de** (lista completa):
- `packages/react/src/SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `ThemeProvider.tsx`,
  `SkillTreeWithDefaultTheme.tsx`, `svg-helpers.ts`,
  `createDefaultLayoutRegistry.ts`, `theme-types.ts`, `themes/minimal.ts`,
  `headless.ts`, `index.ts`, `hooks/*`.
- Tests: smoke, SkillTree, MeshOverlay, ThemeProvider, themes,
  headless, hooks.
- `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`,
  `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — `animations.ts` (FIXADO)

```ts
// packages/react/src/animations.ts
// ── INICIO: animations ──
// Módulo interno: xera regras CSS de animación scopeadas por
// data-theme-id. Concatenado polo SVGRenderer ao output de tema
// dentro do <style> interno do SVG.
//
// **Contrato público de selectores** (estables; reutilizables polo
// consumidor headless ou por temas externos):
//   - `.yf-skill-node__circle` — círculo do nodo.
//   - `.yf-skill-node[data-state="<state>"]` — selector por estado.
//   - `.yf-skill-edge` — path do edge.
//   - `.yf-skill-node[role="button"]` — nodo clickable.
//
// **Nome de keyframes**: `yf-pulse` (global, NON scopeable con useId
// porque o output de useId non é un CSS identifier válido directo).
// Prefixo `yf-` reservado polo paquete; colisión externa extremadamente
// improbable.
//
// **Preparación para 7.8 (prefers-reduced-motion)**: tódalas regras
// están agrupadas entre "ANIMATION BLOCK START" e "ANIMATION BLOCK
// END" no string final, para que 7.8 só envolvva con @media query.

/**
 * Devolve un string con regras CSS de animación scopeadas por
 * `[data-theme-id="${themeId}"]`. Diseñado para ser concatenado
 * ao output das regras de tema dentro do `<style>` interno do
 * SVGRenderer.
 *
 * Anima:
 * - Transitions de fill/stroke nos `.yf-skill-node__circle`.
 * - Hover en nodos clickables (`.yf-skill-node[role="button"]`).
 * - Pulse en `.yf-skill-node[data-state="unlockable"]`.
 * - Transitions de stroke nos `.yf-skill-edge`.
 *
 * En modo headless (cero tema), este módulo non se invoca (o
 * SVGRenderer non inxecta `<style>` cando theme === null).
 */
export function buildAnimationsCSS(themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  return (
    `/* ANIMATION BLOCK START */\n` +
    `@keyframes yf-pulse {\n` +
    `  0%, 100% { opacity: 1; }\n` +
    `  50% { opacity: 0.6; }\n` +
    `}\n` +
    `${sel} .yf-skill-node__circle { transition: fill 0.3s ease, stroke 0.3s ease; }\n` +
    `${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { animation: yf-pulse 2s ease-in-out infinite; }\n` +
    `${sel} .yf-skill-node[role="button"] { cursor: pointer; transition: opacity 0.2s ease; }\n` +
    `${sel} .yf-skill-node[role="button"]:hover .yf-skill-node__circle { opacity: 0.9; }\n` +
    `${sel} .yf-skill-edge { transition: stroke 0.3s ease, stroke-width 0.3s ease; }\n` +
    `/* ANIMATION BLOCK END */`
  )
}
// ── FIN: animations ──
```

**Decisións nesta peza**:
- **Función pura**: cero side effects, cero hooks, cero React imports.
  Pode testarse con tests `.ts` puros (cero jsdom necesario).
- **Cero parámetros adicionais** (theme non é argumento). As animacións
  son **independentes do tema** (mesmas curvas/timings). 7.x posteriores
  poden engadir parámetros se require.
- **Cero `@media` queries**: prefers-reduced-motion vai en 7.8. 7.6
  asume "tódolos usuarios queren animación".
- **Comments delimitadores `/* ANIMATION BLOCK START/END */`**: 7.8
  pode envolver entre eles con `@media (prefers-reduced-motion:
  no-preference) {`...`}`.

### 5.3 — Modificación de `SVGRenderer.tsx` (FIXADO)

**ANTES** (post-7.4):

```ts
function buildThemeRules(theme: Theme, themeId: string): string {
  // ... regras de tema ...
}
```

**DESPOIS**:

```ts
import { buildAnimationsCSS } from './animations.js'
// ... resto dos imports ...

function buildThemeRules(theme: Theme, themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  // ... regras de tema existentes ... (cero cambio na súa lóxica)
  return (
    `${themeRulesString}` +
    `\n${buildAnimationsCSS(themeId)}`
  )
}
```

**Detalle exacto da modificación**:
1. **Engadir import** no top: `import { buildAnimationsCSS } from
   './animations.js'`.
2. **Modificar o último `return` da função `buildThemeRules`** para
   concatenar `'\n' + buildAnimationsCSS(themeId)`.

**Cero outros cambios** en SVGRenderer.tsx.

**Garantía DOM**: o `<style>` interno **segue sendo un só elemento**;
contén regras de tema seguidas das regras de animación. Atributos
`<svg>` e `<style>` non cambian.

### 5.4 — Tests prescritos (~8 totais)

**`animations.test.ts`** (NOVO, ~6 tests):

1. `buildAnimationsCSS('test-id')` devolve un string non vacío.
2. O output contén `@keyframes yf-pulse` (definición do keyframe global).
3. O output contén `[data-theme-id="test-id"]` como scope prefix
   (verificable con `.includes(...)`).
4. O output contén regra de pulse aplicada a `[data-state="unlockable"]`.
5. O output contén `transition: fill` no `.yf-skill-node__circle`.
6. O output contén `cursor: pointer` no `[role="button"]`.
7. Os comments delimitadores `/* ANIMATION BLOCK START */` e
   `/* ANIMATION BLOCK END */` están presentes (preparación para 7.8).

**Wait, son 7 — axusto a 6 consolidando 1+2** (un test que verifica
both: non-empty + @keyframes presente).

**Total animations.test.ts**: ~6 tests.

**`SVGRenderer.test.tsx`** (MODIFICADO, +2 tests):

8. SVGRenderer **con** ThemeProvider(minimal): o `<style>` interno
   contén o substring `@keyframes yf-pulse` (verificable con
   `container.querySelector('style')?.textContent?.includes(...)`).
9. SVGRenderer **sen** ThemeProvider (theme === null): **cero**
   `<style>` element no DOM (xa testado polo test existente 10 de
   7.4; engadir aserción explícita de que `@keyframes` non aparece
   en ningún sitio do output).

**Total SVGRenderer.test.tsx ampliado**: 9 → **11 tests**.

**Total monorepo post-7.6**: 55 (previo) + 6 (animations) + 2
(SVGRenderer ampliado) = **~63 tests en packages/react**.

### 5.5 — Cobertura prescrita

- **animations.ts**: **100/100/100/100** (función pura simple; 1
  branch posible se houbese condicional, pero é stright-line).
- **SVGRenderer.tsx**: **manter ou mellorar** baseline post-7.4
  (93.75/91.3). A modificación só engade unha chamada extra na rama
  `theme !== null`, polo que cobertura debería **manterse** ou
  mellorar. **Cero regresión tolerada**.
- **Resto sen cambio**.

### 5.6 — Cero exposición pública

`animations.ts` é **módulo interno**. **NON exportar** desde
`src/index.ts` nin `src/headless.ts`. **NON aparece** no diff destes
ficheiros. **Se aparece** → **ESCALAR**.

### 5.7 — Cero `'use client'` no animations.ts

`animations.ts` é un módulo puro de utilidade (cero hooks, cero JSX).
**Cero `'use client'` directive**.

### 5.8 — Cero deps novas

Verificable empíricamente: cero modificación de package.json deps,
cero modificación de pnpm-workspace.yaml, cero modificación de
pnpm-lock.yaml. **Cero CSS-in-JS frameworks** (emotion,
styled-components, Framer Motion, etc.). **Se aparecen** → **ESCALAR**.

### 5.9 — Convención sobre `<style>` único

O `<style>` interno do SVGRenderer **debe seguir sendo un só elemento**.
**NON crear segundos `<style>` ou separados** por categoría (regras de
tema vs animacións). **Razón**: simplicidade DOM + asercións existentes
en SVGRenderer.test.tsx que asumen un só `<style>`.

### 5.10 — Test counts esperados post-7.6

- **react**: 55 (previo) + ~8 (novos) = **~63 tests**.
- **core, common, storage**: intactos.

### 5.11 — Comportamento esperado en modo headless

**Tema null → cero `<style>` → cero animacións**. Iso é decisión
arquitectónica firme. **O consumidor headless é responsable de aplicar
animacións custom** via CSS externo, usando os selectors públicos
(`yf-skill-node`, `yf-skill-edge`, `data-state="..."`, etc.).

**Documentar** no CHANGELOG.

### 5.12 — Decisión sobre `data-state` para non-unlockable

A animación pulse aplícase só cando `data-state="unlockable"`. Os outros
estados (locked, unlocked, maxed, in_progress, disabled, expired) **cero
animación pulse**. **Decisión consciente**: pulse é un sinal forte de
"acción dispoñible". Aplicalo a outros estados sería ruído visual.

**Futuro 7.x**: posibilidade de animación distinta para `in_progress`
(ex: rotación lenta dunha indicación de actividade). **Fora de scope
7.6**.

### 5.13 — Decisión sobre transición de stroke nos edges

Aínda que **non se observa** un cambio visible de stroke nos edges en
ningún uso típico actual (cero atributo runtime que cambie a cor do
edge segundo o seu estado), a transición está prescrita **anticipando**
sub-fases futuras que poderían introducir `data-edge-state="active"` ou
similar. **Cero scope creep**: a regra é trivial (1 liña CSS) e prepara
o terreo sen comprometer nada.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `buildAnimationsCSS` función pura | TS function | animations.ts | ~50 |
| Integración en SVGRenderer | Edits | SVGRenderer.tsx | +2 modif (1 import + 1 concat) |
| Tests animations | describe block | animations.test.ts | ~100 |
| Tests SVGRenderer (ampliación) | engadir +2 tests | SVGRenderer.test.tsx | +40 |

**Total estimado**: ~55 liñas de código + ~140 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/animations.ts` (NOVO)
- `packages/react/src/SVGRenderer.tsx` (MODIFICADO: +1 import,
  +1 concat na función buildThemeRules)
- `packages/react/__tests__/animations.test.ts` (NOVO)
- `packages/react/__tests__/SVGRenderer.test.tsx` (MODIFICADO: +2 tests)
- `.changeset/animations.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 6 ficheiros tocados** (2 NOVOS src + 1 NOVO test + 1
MODIFICADO src + 1 MODIFICADO test + 2 housekeeping).

**NON deben aparecer cambios en**:
- `packages/react/src/SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `ThemeProvider.tsx`,
  `SkillTreeWithDefaultTheme.tsx`, `svg-helpers.ts`,
  `createDefaultLayoutRegistry.ts`, `theme-types.ts`, `themes/minimal.ts`,
  `headless.ts`, `index.ts`, `hooks/*`.
- Tests existentes: `smoke.test.tsx`, `SkillTree.test.tsx`,
  `MeshOverlay.test.tsx`, `ThemeProvider.test.tsx`, `themes.test.ts`,
  `headless.test.tsx`, `hooks.test.tsx`.
- `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

`animations.ts` é **ficheiro `.ts` puro** (cero JSX). Cero `'use
client'` (módulo de utilidade puro).

Tests animations: **`.ts` puro** (cero jsdom necesario; testan
strings).

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en `buildAnimationsCSS`.

**Marcadores**: `// ── INICIO: animations ──` / `// ── FIN: animations ──`.

**Nome `yf-pulse`**: prefixo `yf-` reservado polo paquete (contrato
público estable; cero outros nomes de keyframe deberán colidir).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar calquera compoñente ou módulo existente en
  `packages/react/src/` **fora de** `SVGRenderer.tsx`.
- ❌ Modificar **calquera test existente** fora de `SVGRenderer.test.tsx`
  (e mesmo aí, **cero modificación dos 9 tests existentes**; só engadir
  novos).
- ❌ Exportar `animations.ts` desde `index.ts` ou `headless.ts` (módulo
  interno).
- ❌ Modificar `headless.ts` ou `index.ts`.
- ❌ Engadir compoñentes React novos (animations é función pura).
- ❌ Engadir CSS-in-JS frameworks (emotion, styled-components,
  Framer Motion).
- ❌ Engadir `prefers-reduced-motion` agora (vai en 7.8; só preparar
  os comments delimitadores).
- ❌ Crear módulos de CSS (`.css` files) — todo inline via string.
- ❌ Engadir 2 ou máis `<style>` elements no SVGRenderer (mantén
  un só).
- ❌ Engadir keyboard navigation, glow para in_progress, edge
  highlights — DIFERIDOS.
- ❌ Engadir deps de npm.
- ❌ Engadir entry points novos.
- ❌ Usar `!` non-null assertions.
- ❌ Engadir Date.now() / Math.random().
- ❌ Engadir hooks de React no animations.ts.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T8)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `86d5157` como HEAD.

**T0.2** — Verificar APIs e infraestrutura:

```bash
# Confirmar que buildThemeRules existe e é privada en SVGRenderer:
grep -nE "function buildThemeRules|buildThemeRules\(" packages/react/src/SVGRenderer.tsx | head -5

# Confirmar useId vsersión React 19+:
grep "useId" packages/react/src/SVGRenderer.tsx | head -3

# Verificar baseline previo:
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 55 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear animations.ts

Crear `packages/react/src/animations.ts` segundo §5.2 literal.

### T2 — Modificar SVGRenderer.tsx

1. Engadir `import { buildAnimationsCSS } from './animations.js'`
   tras os imports existentes.
2. Modificar a función `buildThemeRules` para que devolva o output
   actual **concatenado con** `'\n' + buildAnimationsCSS(themeId)`.

**Patrón concreto**: localizar o `return` final actual da función,
substituílo por:
```ts
return (
  themeRulesString +
  `\n${buildAnimationsCSS(themeId)}`
)
```

(onde `themeRulesString` é o string que actualmente se devolve).

### T3 — Verificación intermedia (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 55 tests
```

**Tódolos 55 tests existentes deben pasar intactos**. Se algún falla
→ **ESCALAR**.

**Razón**: aínda que `buildThemeRules` cambia o seu output (engade un
chunk de animacións), os 9 tests existentes de SVGRenderer:
- Test 9 (error): cero theme aplicado → cero animacións → cero
  diferenza.
- Test 11 (theme con `<style>`): asercion de presencia de CSS vars
  + `<style>` element. **Engadir animacións ao mesmo `<style>` non
  rompe esa asercion** (só engade contido extra).
- Test 13 (data-theme-id en 2 instances): cero asercion sobre contido
  textual do `<style>` que poda romper.

**Se algún test rompe inesperadamente** → ESCALAR.

### T4 — Crear animations.test.ts

Crear `packages/react/__tests__/animations.test.ts` con ~6 tests
segundo §5.4 bloque 1.

### T5 — Ampliar SVGRenderer.test.tsx

Engadir 2 tests novos ao final do ficheiro (despois dos 9 existentes;
cero modificación dos previos) segundo §5.4 bloque 2.

### T6 — Verificación final

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~63 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   animations.ts: 100/100/100/100
#   SVGRenderer.tsx: ≥ baseline 7.4 (93.75/91.3) — sen regresión
#   Resto: sen cambios respecto a 7.5
```

### T7 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/animations.ts packages/react/__tests__/animations.test.ts
```

### T8 — Changeset + CHANGELOG + commit + push

`.changeset/animations.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add basic CSS animation framework (sub-phase 7.6)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: animation framework básico (CSS-only):
  - Módulo interno `animations.ts` con función pura
    `buildAnimationsCSS(themeId)` que devolve regras CSS scopeadas
    via `[data-theme-id="${themeId}"]`.
  - `SVGRenderer` integra automáticamente as animacións ao `<style>`
    interno cando hai un tema activo (mesmo mecanismo que as regras
    de cor desde 7.4).
  - **4 efectos entregados**:
    - Transitions suaves de `fill`/`stroke` nos
      `.yf-skill-node__circle` (cambios de cor cando muda
      `data-state`).
    - Hover en nodos clickables (`[role="button"]`): cursor
      pointer + opacity sutil.
    - Pulse en `.yf-skill-node[data-state="unlockable"]`
      (`@keyframes yf-pulse`, 2s ease-in-out infinite). Sinal de
      affordance para nodos que o usuario pode unlockear.
    - Transitions de `stroke`/`stroke-width` nos `.yf-skill-edge`
      (preparación para futuras highlights).
- **Contrato público estable**:
  - Nome de keyframes: `yf-pulse` (reservado polo paquete; prefixo
    `yf-`).
  - Comments delimitadores `/* ANIMATION BLOCK START */` /
    `/* ANIMATION BLOCK END */` no output (preparación para 7.8
    `prefers-reduced-motion`).

### Note
- Sub-fase 7.6 SEXTA da Fase 7 (12 sub-fases totais).
- **Modo headless (sin tema)**: cero animacións automáticas. O
  consumidor headless aplica animacións custom via CSS externo,
  usando os selectors públicos (`yf-skill-node`, `yf-skill-edge`,
  `data-state="..."`, `role="button"`).
- **DIFERIDOS**:
  - `prefers-reduced-motion` media query envoltorio → 7.8.
  - Glow específico para `data-state="in_progress"` → futura sub-fase.
  - Edge highlights coordinados → futura sub-fase.
  - Animacións de aparición/desaparición de nodos → futura sub-fase.
  - Framer Motion como peer dependency (`animations="rich"`) → fora
    da Fase 7 (probable sub-fase futura).
- **Cero deps de npm engadidas**. Cero CSS-in-JS frameworks.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **Cero compoñentes React novos**. `animations.ts` é función pura
  TypeScript (cero JSX, cero hooks, cero `'use client'`).
- **Cero exposición pública de `animations.ts`** (módulo interno;
  só `SVGRenderer.tsx` o importa).
- **Cero modificación de SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx,
  MeshOverlay.tsx, ThemeProvider.tsx, SkillTreeWithDefaultTheme.tsx,
  svg-helpers.ts, createDefaultLayoutRegistry.ts, theme-types.ts,
  themes/minimal.ts, headless.ts, index.ts ou hooks/*** nin os seus
  tests. Os 55 tests previos pasan intactos.
```

Commit Conventional:
`feat(react): add basic CSS animation framework (sub-phase 7.6)`

Push directo a `origin/main` (base `86d5157`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.6 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 86d5157)
✅ animations.ts módulo interno con buildAnimationsCSS(themeId)
✅ SVGRenderer integra animacións ao <style> interno (cando hai tema)
✅ 4 efectos: transitions de cor, hover, pulse unlockable,
   transitions de edge
✅ @keyframes yf-pulse (contrato público)
✅ Comments delimitadores ANIMATION BLOCK START/END (prep 7.8)
✅ Cero <style> separados (segue 1 só elemento por SVGRenderer)
✅ Modo headless: cero animacións automáticas (cero <style>)
✅ T0.2 baseline verificado: 55 tests previos pasan intactos
✅ T3 verificación intermedia: 55 tests previos pasan intactos
   tras modificación de buildThemeRules
✅ CERO modificación de SkillTree, SkillNode, SkillEdge, MeshOverlay,
   ThemeProvider, SkillTreeWithDefaultTheme, svg-helpers,
   createDefaultLayoutRegistry, theme-types, themes/minimal,
   headless, index, hooks/*
✅ CERO modificación de tests existentes (smoke, SkillTree,
   MeshOverlay, ThemeProvider, themes, headless, hooks; só
   SVGRenderer ampliouse con +2 tests sen tocar os 9 previos)
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ CERO exposición pública de animations.ts (cero export en
   index.ts/headless.ts)
✅ Tests: <N> pasan en react (<delta> novos, 55 previos intactos)
   - 6 animations
   - 2 SVGRenderer integración animacións (engadidos)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - animations.ts: 100/100/100/100
   - SVGRenderer.tsx: ≥ baseline 7.4 (93.75/91.3) sen regresión
   - Resto: sen cambios respecto a 7.5
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.6 SEXTA da Fase 7.
   - 6 sub-fases pendentes (7.7 a 7.12).
   - prefers-reduced-motion preparado para 7.8 (comments delimitadores
     ANIMATION BLOCK START/END).
   - Framer Motion DIFERIDO (peer dependency futura fora de Fase 7).
   - Modo headless: consumidor aplica animacións custom via CSS externo.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 6 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.7 (Navegación teclado + ARIA + announcements).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.6. Sexta sub-fase da Fase 7. Sub-fase ben acoutada:
1 módulo novo + 1 modificación cirúrxica de SVGRenderer + 2 ficheiros
de tests + housekeeping. Risco arquitectónico BAIXO (animations.ts é
función pura simple; modificación de SVGRenderer é concatenación
trivial). Decisións documentadas: nome de keyframes global, modo
headless sen animacións, un só `<style>` element por SVGRenderer,
preparación de comments para 7.8. Cero deps novas. Cero ErrorCodes.
Cero modificación de pezas existentes fora de SVGRenderer e o seu test.*

*Lección 7.5 L1 aplicada: cero comportamento runtime crítico new en
7.6 (a infraestrutura `<style>` xa probada en 7.4 + animations é
función pura sen dependencias runtime); cero scripts de verificación
runtime necesarios.*
