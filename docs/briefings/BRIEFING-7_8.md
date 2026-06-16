# BRIEFING — SUB-FASE 7.8 de Yggdrasil Forge

> Pega este documento no chat executor.
> **OITAVA sub-fase da Fase 7.** Engade ao output de
> `buildAnimationsCSS` de `animations.ts` un bloque
> `@media (prefers-reduced-motion: reduce) { ... }` que desactiva
> `animation` e `transition` para os elementos animados, **respectando
> a preferencia do usuario**. Cero outras modificacións.
>
> **Modificación cirúrxica** dunha única peza (`animations.ts`) +
> ampliación de tests existentes (`animations.test.ts`) con ~3 tests
> novos. **Cero modificación de calquera outro compoñente, módulo,
> ou test existente**.
>
> SSR/RSC (7.9), mobile/touch (7.10), error boundaries (7.11), tests
> visuais (7.12) DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.8 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.8 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación. **Cero
regresión de cobertura tolerada** respecto á baseline post-7.7.

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1; Biome `noUselessConcat`).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de **toda
peza ou test existente** salvo `animations.ts` (modificado) e
`animations.test.ts` (ampliado con +3 tests sen modificar os 6
existentes).

**Tódolos 75 tests existentes deben pasar intactos**. **Especial
atención** ao test "contén comments delimitadores ANIMATION BLOCK
START/END" (debe seguir pasando porque os comments mantéñense na
mesma posición).

---

## 1. IDENTIFICACIÓN

Sub-fase **7.8** de Yggdrasil Forge. **OITAVA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (2 grupos)**:

**Grupo A — Modificación de animations.ts**:
1. **`buildAnimationsCSS(themeId)`** segue devolvendo string CSS,
   pero engade ao final (antes do `/* ANIMATION BLOCK END */`) un
   bloque `@media (prefers-reduced-motion: reduce) { ... }` que aplica
   `transition: none !important` e `animation: none !important` aos
   selectores con transition/animation.

**Grupo B — Tests novos**:
2. **`animations.test.ts`**: engadir ~3 tests novos (sen modificar
   os 6 existentes):
   - Output contén `@media (prefers-reduced-motion: reduce)`.
   - Dentro do @media hai `animation: none` e `transition: none`.
   - `!important` está presente nas regras override.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- **Calquera outro ficheiro de packages/react/** salvo
  `animations.ts` e `animations.test.ts`.
- Tests existentes (incluídos os 6 de `animations.test.ts`).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `8e9a146`, verificada
empíricamente en clone independente)**.

### Estado actual de `animations.ts` (post-7.6, verificado literal)

```ts
export function buildAnimationsCSS(themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  return `/* ANIMATION BLOCK START */
@keyframes yf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
${sel} .yf-skill-node__circle { transition: fill 0.3s ease, stroke 0.3s ease; }
${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { animation: yf-pulse 2s ease-in-out infinite; }
${sel} .yf-skill-node[role="button"] { cursor: pointer; transition: opacity 0.2s ease; }
${sel} .yf-skill-node[role="button"]:hover .yf-skill-node__circle { opacity: 0.9; }
${sel} .yf-skill-edge { transition: stroke 0.3s ease, stroke-width 0.3s ease; }
/* ANIMATION BLOCK END */`
}
```

### Tests existentes en `animations.test.ts` (verificados literal)

6 tests `it(...)` dentro de `describe('buildAnimationsCSS')`:
1. "devolve string non vacío con @keyframes yf-pulse"
2. "contén scope prefix [data-theme-id=\"...\"]"
3. "contén regra de pulse para data-state=\"unlockable\""
4. "contén transition de fill no .yf-skill-node__circle"
5. "contén cursor: pointer no [role=\"button\"]"
6. "contén comments delimitadores ANIMATION BLOCK START/END"

**Tódolos seguirán pasando intactos** cos cambios prescritos
(verificación obrigatoria en T3).

### Decisión arquitectónica do Director

**Patrón escollido**: `@media (prefers-reduced-motion: reduce) { ...
override con !important }`. **NON** `@media (prefers-reduced-motion:
no-preference)` envolvendo o resto.

**Razóns**:
- **Patrón estándar da industria** (MDN, WCAG, accesibility blogs).
- **Graceful degradation**: browsers que non soportan
  `prefers-reduced-motion` seguen tendo as animacións normais. Só
  os que SI soportan + usuario opted in para reducir aplican override.
- **`cursor: pointer` mantense** (parte da regra `transition: opacity
  0.2s ease`) — non se desactivaría aínda en reduce mode (cero impacto
  semántico do cursor).
- **`!important`**: necesario porque a regra base ten especificidade
  alta (`[data-theme-id="X"] .yf-skill-node__circle`) e o override
  ten que ser determinístico.

### Estructura do output post-7.8 (prescrita)

```css
/* ANIMATION BLOCK START */
@keyframes yf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
[data-theme-id="X"] .yf-skill-node__circle { transition: ... }
[data-theme-id="X"] .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { animation: ... }
[data-theme-id="X"] .yf-skill-node[role="button"] { cursor: pointer; transition: opacity ... }
[data-theme-id="X"] .yf-skill-node[role="button"]:hover .yf-skill-node__circle { opacity: 0.9; }
[data-theme-id="X"] .yf-skill-edge { transition: stroke ... }
@media (prefers-reduced-motion: reduce) {
  [data-theme-id="X"] .yf-skill-node__circle,
  [data-theme-id="X"] .yf-skill-node[role="button"],
  [data-theme-id="X"] .yf-skill-edge {
    transition: none !important;
    animation: none !important;
  }
}
/* ANIMATION BLOCK END */
```

**Cero cambio nas regras existentes**; só se engade un bloque @media
**antes** do comment `/* ANIMATION BLOCK END */`.

### Estado scaffold tras 7.7

```
packages/react/src/
├── animations.ts                  (MODIFICADO en 7.8: engadir @media)
├── ... (todo o resto cero modif)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `8e9a146` (SkillTreeAnnouncer + aria-label
  7.7).
- 1523 core + 60 common + 193 storage + 75 react = ~1851 monorepo limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- 7 compoñentes públicos + 1 wrapper interno + 4 hooks + 4 módulos
  internos.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao output de `buildAnimationsCSS(themeId)` de
`packages/react/src/animations.ts` un bloque
`@media (prefers-reduced-motion: reduce) { selectors { transition:
none !important; animation: none !important; } }` antes do comment
`/* ANIMATION BLOCK END */`, e ampliar `animations.test.ts` con ~3
tests novos que verifican a presenza do `@media`, `transition: none`,
`animation: none`, e `!important` no output. **Cero modificación dos
6 tests existentes nin de calquera outro ficheiro do proxecto**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**MODIFICADOS**:
- `packages/react/src/animations.ts` (engadir bloque @media antes
  do comment END; cero outras modificacións).
- `packages/react/__tests__/animations.test.ts` (engadir +3 tests
  ao final; cero modificación dos 6 existentes).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**NOVO**:
- `.changeset/reduced-motion.md` (NOVO).

**Cero modificación de** (lista completa):
- Calquera outro ficheiro en `packages/react/`.
- Tests existentes (animations.test.ts mantén os 6 tests previos
  intactos; engádense só +3 ao final).
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — Modificación de `animations.ts` (FIXADA)

Substituír o template literal actual por:

```ts
export function buildAnimationsCSS(themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  return `/* ANIMATION BLOCK START */
@keyframes yf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
${sel} .yf-skill-node__circle { transition: fill 0.3s ease, stroke 0.3s ease; }
${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { animation: yf-pulse 2s ease-in-out infinite; }
${sel} .yf-skill-node[role="button"] { cursor: pointer; transition: opacity 0.2s ease; }
${sel} .yf-skill-node[role="button"]:hover .yf-skill-node__circle { opacity: 0.9; }
${sel} .yf-skill-edge { transition: stroke 0.3s ease, stroke-width 0.3s ease; }
@media (prefers-reduced-motion: reduce) {
  ${sel} .yf-skill-node__circle,
  ${sel} .yf-skill-node[role="button"],
  ${sel} .yf-skill-edge {
    transition: none !important;
    animation: none !important;
  }
}
/* ANIMATION BLOCK END */`
}
```

**Único cambio**: engadir 8 liñas (o bloque `@media`) entre a última
regra existente (`${sel} .yf-skill-edge { ... }`) e o comment
`/* ANIMATION BLOCK END */`. **Cero outras modificacións**.

**Actualizar tamén o JSDoc**: na sección **"En modo headless"**,
engadir unha liña:
- **Substituír** o comment `// **Preparación para 7.8
  (prefers-reduced-motion)**: tódalas regras están agrupadas entre
  "ANIMATION BLOCK START" e "ANIMATION BLOCK END" no string final,
  para que 7.8 só envolva con @media query.`
- **Por**: `// **Reduced motion (7.8)**: o bloque inclúe un
  override `@media (prefers-reduced-motion: reduce)` que aplica
  transition: none e animation: none aos elementos animados,
  respectando a preferencia do usuario.`

**Actualizar tamén o JSDoc da función** para mencionar reduced
motion na lista de comportamentos.

### 5.3 — Tests novos en `animations.test.ts`

Engadir 3 tests **ao final** do describe block existente (despois
do test "contén comments delimitadores"):

```ts
it('contén media query @media (prefers-reduced-motion: reduce)', () => {
  const css = buildAnimationsCSS('test-id')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
})

it('aplica transition: none e animation: none no override reducido', () => {
  const css = buildAnimationsCSS('test-id')
  expect(css).toContain('transition: none')
  expect(css).toContain('animation: none')
})

it('usa !important nas regras de override (especificidade alta da regra base)', () => {
  const css = buildAnimationsCSS('test-id')
  // !important debe estar tanto en transition como en animation no override
  expect(css.match(/!important/g)?.length).toBeGreaterThanOrEqual(2)
})
```

**Cero modificación dos 6 tests existentes**.

### 5.4 — Cero modificación de outros ficheiros

**Garantía**:
- SVGRenderer.tsx **NON se modifica**. A integración co `<style>`
  interno xa está feita desde 7.6 (chama a `buildAnimationsCSS` e
  concatena). Cambio no output de buildAnimationsCSS propaga
  automaticamente.
- SVGRenderer.test.tsx **NON se modifica** (os 11 tests existentes,
  incluíndo o que verifica que o `<style>` contén `@keyframes yf-pulse`,
  seguen pasando porque o substring segue presente no output).

### 5.5 — Cobertura prescrita

- **animations.ts**: **100/100/100/100** (mantén baseline; cero
  novas ramas, só engade liñas a un template literal).
- **Resto sen cambio** respecto a 7.7.

### 5.6 — Tests counts esperados post-7.8

- **react**: 75 (previo) + 3 (novos) = **~78 tests**.
- **core, common, storage**: intactos.

### 5.7 — Verificación de compatibilidade dos tests existentes (CRÍTICA)

**Tests críticos a verificar en T3 (intermedia)**:

1. **Test 6 de animations.test.ts**: "contén comments delimitadores
   ANIMATION BLOCK START/END" — debe seguir pasando porque os
   comments mantéñense na mesma posición (START ao principio, END
   ao final).

2. **Test de SVGRenderer.test.tsx que verifica `<style>` contén
   `@keyframes yf-pulse`** (test #10 ou similar, engadido en 7.6) —
   debe seguir pasando porque `@keyframes yf-pulse` non se moveu.

3. **Tests 1-5 de animations.test.ts** — todos verifican substrings
   que aínda están presentes no output ampliado.

**Se algún test existente falla** → **ESCALAR**.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `buildAnimationsCSS` ampliado | Template literal extension | animations.ts | +9 modif |
| JSDoc actualizado | Comments | animations.ts | +3 modif |
| Tests novos | 3 it() blocks | animations.test.ts | +18 |

**Total estimado**: ~12 liñas de código + ~18 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/animations.ts` (MODIFICADO)
- `packages/react/__tests__/animations.test.ts` (MODIFICADO: +3 tests)
- `.changeset/reduced-motion.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 4 ficheiros tocados** (1 NOVO + 3 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/react/`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

`animations.ts` é ficheiro `.ts` puro (cero JSX, cero `'use client'`,
cero hooks).

Single template literal con backticks (precedente 7.6 L1).

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Marcadores**: `// ── INICIO: animations ──` / `// ── FIN: animations ──`
manteñen idénticos.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar **calquera ficheiro de `packages/react/`** salvo
  `animations.ts` e `animations.test.ts`.
- ❌ Modificar **calquera dos 6 tests existentes** de
  `animations.test.ts` (engádense só 3 novos ao final).
- ❌ Cambiar a posición dos comments `/* ANIMATION BLOCK START */`
  e `/* ANIMATION BLOCK END */`.
- ❌ Cambiar o `@keyframes yf-pulse` (cero modificación).
- ❌ Cambiar as 5 regras CSS existentes (transition de fill, pulse
  unlockable, hover button, etc.).
- ❌ Engadir outras animacións ou efectos novos.
- ❌ Engadir CSS classes novas.
- ❌ Implementar `@media (prefers-reduced-motion: no-preference)`
  envoltorio (decisión arquitectónica §2: usar `reduce` con
  `!important` é o patrón estándar).
- ❌ Modificar SVGRenderer.tsx (cero require; integración xa feita
  en 7.6).
- ❌ Engadir deps de npm.
- ❌ Engadir entry points novos.
- ❌ Usar `!` non-null assertions (TS).
- ❌ Engadir Date.now() / Math.random().
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T6)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `8e9a146` como HEAD.

**T0.2** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 75 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Modificar animations.ts

1. Localizar a regra final actual: `${sel} .yf-skill-edge { transition:
   stroke 0.3s ease, stroke-width 0.3s ease; }`.
2. Engadir o bloque `@media (prefers-reduced-motion: reduce)` segundo
   §5.2 literal, **inmediatamente despois desa regra e antes do
   comment `/* ANIMATION BLOCK END */`**.
3. Actualizar o JSDoc inline (substituír o comment "Preparación para
   7.8" polo descritor da implementación; ver §5.2).

**Cero outras modificacións** ao ficheiro.

### T2 — Verificación intermedia (CRÍTICA)

```bash
pnpm --filter @yggdrasil-forge/react test --force         # 75 tests pasando intactos
```

**Tódolos 75 tests existentes deben pasar intactos**.

**Especial atención** ao test 6 de animations.test.ts ("contén
comments delimitadores ANIMATION BLOCK START/END") e ao test de
SVGRenderer.test.tsx que verifica `@keyframes yf-pulse` (de 7.6).

**Se algún test existente falla** → **ESCALAR**.

### T3 — Ampliar animations.test.ts

Engadir 3 tests novos ao final do describe block existente, segundo
§5.3 literal. **Cero modificación dos 6 tests previos**.

### T4 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~78 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   animations.ts: 100/100/100/100 (mantén baseline)
#   Resto: sen regresión respecto a 7.7
```

### T5 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/animations.ts \
  packages/react/__tests__/animations.test.ts
```

### T6 — Changeset + CHANGELOG + commit + push

`.changeset/reduced-motion.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): respect prefers-reduced-motion in animation framework (sub-phase 7.8)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: respect for `prefers-reduced-motion`
  user preference. O output de `buildAnimationsCSS` agora inclúe un
  bloque `@media (prefers-reduced-motion: reduce) { ... }` ao final
  do `ANIMATION BLOCK` que aplica `transition: none !important` e
  `animation: none !important` aos elementos animados
  (`.yf-skill-node__circle`, `.yf-skill-node[role="button"]`,
  `.yf-skill-edge`). Browsers que non soporten esta media query
  manteñen as animacións normais (graceful degradation).

### Note
- Sub-fase 7.8 OITAVA da Fase 7 (12 sub-fases totais).
- **Cero modificación de SVGRenderer**: a integración xa estaba feita
  desde 7.6 (concatena o output de buildAnimationsCSS dentro do
  `<style>` interno cando hai tema). O cambio no output propaga
  automaticamente.
- **Patrón escollido**: `@media (prefers-reduced-motion: reduce)` con
  `!important` (estándar industria). Cero envoltorio `no-preference`
  (alternativa rexeitada por compatibilidade con `@keyframes` e por
  consistencia con WCAG/MDN).
- **`cursor: pointer` mantense** en reduce mode (forma parte da regra
  base con `transition: opacity`; cero impacto semántico de manter
  o cursor activo).
- **Modo headless**: cero animacións automáticas (xa documentado
  desde 7.6); a media query é irrelevante porque `<style>` non se
  inxecta. Consumidores headless implementan reduced-motion no seu
  propio CSS.
- **DIFERIDOS**: 7.9 (SSR/RSC compatibility), 7.10 (mobile/touch),
  7.11 (error boundaries), 7.12 (tests visuais).
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**.
- **Cero modificación de packages/core/, packages/common/,
  packages/storage/** ou outros 14 paquetes scaffold.
- **Cero modificación de calquera ficheiro de packages/react/** salvo
  `animations.ts` e `animations.test.ts` (este último ampliado con
  +3 tests sen modificar os 6 existentes).
```

Commit Conventional:
`feat(react): respect prefers-reduced-motion in animation framework (sub-phase 7.8)`

Push directo a `origin/main` (base `8e9a146`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.8 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 8e9a146)
✅ animations.ts: engadiuse @media (prefers-reduced-motion: reduce)
   con override transition: none + animation: none + !important
✅ Cero modificación de SVGRenderer (integración xa feita en 7.6)
✅ Cero modificación de calquera outro ficheiro de packages/react/
✅ Cero modificación dos 6 tests existentes de animations.test.ts
✅ Cero modificación de packages/core/, common/, storage/
✅ Cero deps de npm engadidas
✅ Cero ErrorCodes novos
✅ T2 verificación intermedia: 75 tests previos pasan intactos
   (incluíndo "contén comments delimitadores" e "<style> contén
   @keyframes yf-pulse" de SVGRenderer.test.tsx)
✅ Tests: <N> pasan en react (3 novos, 75 previos intactos)
   - 3 prefers-reduced-motion (presenza @media, none, !important)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - animations.ts: 100/100/100/100 (sen regresión)
   - Resto: sen cambio respecto a 7.7
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.8 OITAVA da Fase 7.
   - 4 sub-fases pendentes (7.9 a 7.12).
   - Modo headless: cero animacións (xa documentado desde 7.6);
     consumidor implementa reduced-motion no seu propio CSS.
   - Patrón estándar industria: @media (prefers-reduced-motion:
     reduce) con !important.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 4 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.9 (SSR + RSC compatibility).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.8. Oitava sub-fase da Fase 7. **Sub-fase máis pequena
da Fase 7 ata o momento** (4 ficheiros tocados, ~30 liñas totais).
Risco arquitectónico MOI BAIXO: modificación cirúrxica nun único
ficheiro existente + 3 tests adicionais. A infraestrutura `<style>`
+ buildAnimationsCSS xa probada desde 7.6 propaga automáticamente o
cambio. Cero deps novas, cero ErrorCodes novos, cero modificación
de outros ficheiros. Calquera dúbida → ESCALAR.*
