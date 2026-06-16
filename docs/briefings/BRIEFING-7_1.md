# BRIEFING — SUB-FASE 7.1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA sub-fase da Fase 7 (React Renderer + a11y + SSR + RSC).**
> Setup mínimo do paquete `@yggdrasil-forge/react`: engadir
> dependencias de React 19, configurar JSX no tsconfig, actualizar
> smoke test para verificar que React pode renderizar (vía
> `renderToString` — cero DOM environment necesario aínda).
>
> **Cero compoñentes**, **cero entry points novos** (`/server`,
> `/headless`), **cero hooks**, **cero modificación de outros
> paquetes**. Sub-fase de infraestrutura pura.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente Fase 6).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 6.5 L1
(recurrencia 5.2 L2)**: o director **VERIFICOU EMPÍRICAMENTE** as
sinaturas de packages/react/* antes de redactar este briefing (ver
§2). Calquera desvío empírico en T0 → **ESCALAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: aplicable.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: probablemente non aplicable
en 7.1 (peza minúscula sen ramas defensivas).

**0.12 — SUB-FASE DE INFRAESTRUTURA**: 7.1 modifica package.json,
tsconfig.json, smoke test, pnpm-workspace.yaml e pnpm-lock.yaml. **NON
crea ningún compoñente React nin engade pezas funcionais**. Iso é
**decisión consciente do director** (§4) que respecta a roadmap §67:
7.1 = setup; 7.2 = SkillTree + SkillNode + SkillEdge.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.1** de Yggdrasil Forge. **PRIMEIRA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (3 grupos)**:

**Grupo A — Dependencias**:
1. Engadir `react` ^19.2.7 e `react-dom` ^19.2.7 a **peerDependencies**.
2. Engadir `react` 19.2.7 + `react-dom` 19.2.7 (exactas) a **devDependencies**.
3. Engadir `@types/react` ^19.0.0 + `@types/react-dom` ^19.0.0 a **devDependencies**.
4. Engadir as 4 deps ao **catálogo pnpm** (`pnpm-workspace.yaml`) para
   reutilización futura noutros paquetes (devtools, themes, heatmap, etc.).

**Grupo B — Configuración**:
5. Engadir `"jsx": "react-jsx"` a `packages/react/tsconfig.json`.
6. **Cero modificación de tsup.config.ts** (esbuild manexa JSX
   automaticamente con `jsx: react-jsx` en tsconfig).
7. **Cero modificación de vitest.config.ts** (sen DOM environment
   en 7.1; usaremos `renderToString` para o test).

**Grupo C — Smoke test ampliado**:
8. Actualizar `smoke.test.ts`: manter o test de VERSION existente +
   engadir un test que verifique que React 19 pode renderizar un
   compoñente trivial vía `react-dom/server.renderToString`.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/` (todas
  intactas).
- Outros 15 paquetes scaffold (`analytics`, `cli`, `devtools`, etc.).
- `src/index.ts` de packages/react/ (segue exportando só VERSION).
- Entry points novos (`/server`, `/headless` → 7.9, 7.4 respectivamente).
- Hooks, compoñentes, ThemeProvider.

**CERO ErrorCodes novos.** Cero modificación de `packages/common/`.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `8b54a34`, verificada empíricamente
en clone independente)**:

### Estado scaffold actual de packages/react/

- ✅ `package.json` con metadata (versión 0.0.0, exports, scripts típicos).
- ✅ `tsconfig.json` (extende tsconfig.base.json, `composite: true`).
- ✅ `tsup.config.ts` estándar (esm + cjs + dts, target es2022).
- ✅ `vitest.config.ts` (extende vitest.config raíz, include `__tests__/*`).
- ✅ `src/index.ts` con só `export const VERSION = '0.0.0'`.
- ✅ `__tests__/smoke.test.ts` con un só test trivial de VERSION.
- ❌ **Cero deps de React** (peer/dev/runtime).
- ❌ **Cero `@types/react`** ou `@types/react-dom`.
- ❌ **Cero configuración JSX** no tsconfig.

### Versión React confirmada empíricamente (web search 11-jun-2026)

- **React 19.2.7** é o **latest stable** (publicada 1-jun-2026, hai 10 días).
- **Critical security context**: CVE-2025-55182 (React2Shell) afectaba
  19.0.0 → 19.2.2. **Mínimo seguro: 19.2.3**. **Recomendación: 19.2.7
  latest** sen vulnerabilidades coñecidas.
- Por uniformidade, **react** e **react-dom** mesma versión exacta
  19.2.7 (sempre van xuntas en React; releases son sincronizadas).

### Catálogo pnpm-workspace.yaml verificado

```yaml
catalog:
  tsup: ^8.3.0
  vitest: ^4.1.0
  '@vitest/coverage-v8': ^4.1.0
  fake-indexeddb: ^6.2.5
  opfs-mock: ^2.7.0
  typescript: ^5.4.0
```

**Patrón de uso**: `"react": "catalog:"` no package.json en lugar da
versión literal. Engadir react, react-dom, @types/react, @types/react-dom
ao catálogo permite reutilización **estable** en futuros paquetes Fase
7+ (devtools, themes, heatmap) sen risco de mismatch de versións.

### Vitest config raíz verificado

```ts
environment: 'node',  // por defecto
include: ['**/*.{test,spec}.{ts,tsx}'],  // .tsx xa permitido
```

**Comentario inline na config raíz**: *"Os paquetes que precisen DOM
(react, editor) sobrescriben a 'jsdom'"*. **Para 7.1 NON é necesario
jsdom** porque usaremos `react-dom/server.renderToString` (que non
require DOM). jsdom engadirase en 7.2 cando teñamos compoñentes
para renderizar no cliente.

### Estilo de scaffold dos outros 15 paquetes Fase 7+

15 paquetes scaffold confirmados existentes (`analytics`, `cli`,
`devtools`, `diff`, `exporters`, `heatmap`, `i18n`, `importers`,
`multitenancy`, `neo4j`, `search`, `stats`, `themes`, `validators`,
`webhooks`). **Cero modificación deles en 7.1**; cada un terá a súa
propia sub-fase futura.

### Spec MASTER relevante para Fase 7

- **§38 SSR + React Server Components**: dous entry points
  (`@yggdrasil-forge/react` cliente con `'use client'`,
  `@yggdrasil-forge/react/server` RSC-safe). **Iso é 7.9**.
- **§43-44 EMBED + COMPOÑENTES**: spec dos compoñentes (`SkillTree`,
  `SkillTreeErrorBoundary`, `ThemeProvider`). **Iso é 7.2-7.4**.
- **§32-33 Themes**: tema Oberón + minimal. **Iso é 7.4**.

**Para 7.1, ninguña destas seccións aplica directamente**. 7.1 é só
setup das deps + JSX config.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `8b54a34` (peche hixiene MASTER Fase 6).
- 1523 core + 60 common + 193 storage = **~1776 monorepo limpo**.
- Typecheck **21/21** (con cache; o usuario confirmou `FULL TURBO`).
- Lint 0/0, format 0/0.
- 57 ErrorCodes existentes (ata YGG_E036).
- DT abertas: 11 (DT-9, DT-11, DT-12, DT-14 a DT-21, DT-23 reservada,
  DT-24, DT-25).
- packages/react/ scaffold completo (4 ficheiros de config + 1
  índice + 1 smoke test); cero React aínda.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` existente: dependencias
de React 19.2.7 (`react`, `react-dom`, `@types/react`, `@types/react-dom`)
declaradas como peerDependencies estables (^19.2.7) + devDependencies
exactas (19.2.7) para tests, con entradas correspondentes no catálogo
de `pnpm-workspace.yaml`; configuración JSX no tsconfig (`"jsx":
"react-jsx"`); e un smoke test ampliado que verifica que React pode
renderizar un compoñente trivial vía `react-dom/server.renderToString`.
**Cero compoñentes, cero entry points novos, cero hooks** (todo iso
en 7.2-7.12). **Cero modificación de outros paquetes, cero ErrorCodes
novos, cero modificación de packages/common/ ou packages/core/**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**MODIFICADO** `packages/react/package.json` (deps + peerDependencies).
**MODIFICADO** `packages/react/tsconfig.json` (jsx).
**MODIFICADO** `packages/react/__tests__/smoke.test.ts` (test ampliado).
**MODIFICADO** `pnpm-workspace.yaml` (engadir 4 entradas ao catálogo).
**MODIFICADO** `pnpm-lock.yaml` (regenerado automáticamente polo install).
**MODIFICADO** `CHANGELOG.md` (nova `## [Unreleased]` ao principio).
**NOVO** `.changeset/react-setup.md` (minor para react).

**Cero ficheiro novo en src/**. **Cero modificación de outros paquetes**.

### 5.2 — Versións de React (FIXADAS, non negociables)

| Paquete | Versión | Posición |
|---|---|---|
| `react` | `^19.2.7` | peerDependencies |
| `react-dom` | `^19.2.7` | peerDependencies |
| `react` | `catalog:` (= `19.2.7` exacta) | devDependencies |
| `react-dom` | `catalog:` (= `19.2.7` exacta) | devDependencies |
| `@types/react` | `catalog:` (= `^19.0.0`) | devDependencies |
| `@types/react-dom` | `catalog:` (= `^19.0.0`) | devDependencies |

**Razón da elección**:
- React 19.2.7 é o latest stable (1-jun-2026).
- Critical security context: CVE-2025-55182 afectou 19.0.0–19.2.2. **Mínimo
  seguro 19.2.3; recomendado latest 19.2.7**.
- `^19.2.7` en peerDependencies permite a consumidores usar futuras
  19.x.x (sen breaking changes esperadas dentro do major 19).
- Versión exacta `19.2.7` en devDependencies via catálogo garante
  determinismo de tests internos.
- `@types/react` e `@types/react-dom` van con `^19.0.0` (rangos amplos
  dos tipos; tipos non teñen breaking changes minor en práctica).

### 5.3 — Catálogo pnpm-workspace.yaml

Engadir 4 entradas ao bloque `catalog:` existente (despois de
`typescript`):

```yaml
catalog:
  tsup: ^8.3.0
  vitest: ^4.1.0
  '@vitest/coverage-v8': ^4.1.0
  fake-indexeddb: ^6.2.5
  opfs-mock: ^2.7.0
  typescript: ^5.4.0
  react: 19.2.7              # ← NOVO (exacta para determinismo)
  react-dom: 19.2.7          # ← NOVO (exacta)
  '@types/react': ^19.0.0    # ← NOVO
  '@types/react-dom': ^19.0.0  # ← NOVO
```

**Cero modificación de outras seccións** (packages:, allowBuilds:, etc.).

### 5.4 — package.json de @yggdrasil-forge/react

Estrutura final esperada (engadindo só os bloques peerDependencies +
deps de devDependencies):

```json
{
  "name": "@yggdrasil-forge/react",
  "version": "0.0.0",
  ...existente intacto...
  "scripts": {
    ...existente intacto...
  },
  "peerDependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "vitest": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "typescript": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:"
  },
  "publishConfig": {...intacto...},
  "engines": {...intacto...}
}
```

**Cero modificación de**:
- `name`, `version`, `description`, `license`, `author`, etc.
- `type`, `main`, `module`, `types`, `exports` (sen `/server` nin
  `/headless` aínda — esas son 7.9 e 7.4).
- `files`, `sideEffects` (false; correcto para tree-shaking).
- `scripts`.
- `publishConfig`, `engines`.

### 5.5 — tsconfig.json de @yggdrasil-forge/react

Engadir `"jsx": "react-jsx"` en `compilerOptions`:

**ANTES**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

**DESPOIS**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./.tsbuildinfo",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

**Razón**: `"jsx": "react-jsx"` é o modo moderno do React 17+ que usa
o **automatic JSX runtime** (cero `import React from 'react'` en cada
ficheiro TSX). `jsxImportSource` non require (default é `'react'`).

**Cero modificación de**:
- `tsup.config.ts` (esbuild manexa JSX automaticamente cando jsx
  está configurado en tsconfig).
- `vitest.config.ts` (sen jsdom en 7.1).

### 5.6 — Smoke test ampliado

`packages/react/__tests__/smoke.test.ts`:

**ANTES** (actual):
```ts
// ── INICIO: smoke test para @yggdrasil-forge/react ──
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/react', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })
})
// ── FIN: smoke test ──
```

**DESPOIS** (ampliado con verificación de React 19 + renderToString):
```ts
// ── INICIO: smoke test para @yggdrasil-forge/react ──
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { VERSION } from '../src/index.js'

describe('@yggdrasil-forge/react — smoke', () => {
  it('exporta VERSION', () => {
    expect(VERSION).toBe('0.0.0')
  })

  it('React 19 está dispoñible (renderToString funciona)', () => {
    // Compoñente trivial usando JSX automatic runtime (cero import React)
    const TrivialComponent = (): JSX.Element => <div>Yggdrasil</div>

    const html = renderToString(<TrivialComponent />)
    expect(html).toBe('<div>Yggdrasil</div>')
  })

  it('renderToString manexa props básicas', () => {
    interface GreetingProps {
      readonly name: string
    }
    const Greeting = ({ name }: GreetingProps): JSX.Element => (
      <span>Ola, {name}</span>
    )

    const html = renderToString(<Greeting name="Yggdrasil" />)
    expect(html).toBe('<span>Ola, <!-- -->Yggdrasil</span>')
  })
})
// ── FIN: smoke test ──
```

**Notas técnicas**:
- O ficheiro segue chamándose `smoke.test.ts` (non `.tsx`). **Vitest
  detecta JSX automaticamente** se está habilitado en tsconfig E o
  vitest config raíz inclúe `.ts` no patrón. **Verificar empíricamente
  en T0**.
- **Alternativa segura** se vitest non procesa JSX en `.ts`: renomear
  o ficheiro a `smoke.test.tsx` (require modificar tamén o
  `vitest.config.ts` include do paquete, **pero** o config raíz xa
  ten `.tsx`, polo que probablemente non hai que tocar nada).
- **Decisión preferida**: renomear a `smoke.test.tsx` (máis explícito
  + cero risco de mistery TS errors).
- O comentario `<!-- -->` na asserción do test 3 é o **token de
  fronteira de texto** que React 19 emite cando hai múltiples nodos
  de texto adxacentes (parte do contrato estable do server renderer).
  Verificable empíricamente: se cambia, asercion pode necesitar axuste.

### 5.7 — Decisión sobre extensión de ficheiro do test

**Decisión do Director**: **renomear `smoke.test.ts` → `smoke.test.tsx`**.

Razóns:
- JSX só compila correctamente con extensión `.tsx`.
- O vitest config raíz xa inclúe `**/*.{test,spec}.{ts,tsx}` (cero
  modificación necesaria).
- O packages/react/vitest.config.ts actual ten
  `include: ['__tests__/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts']`
  — **só `.ts`**, NON `.tsx`. **Hai que actualizar**.

**Modificación de packages/react/vitest.config.ts**:

**ANTES**:
```ts
test: {
  include: ['__tests__/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
},
```

**DESPOIS**:
```ts
test: {
  include: [
    '__tests__/**/*.{test,spec}.{ts,tsx}',
    'src/**/*.{test,spec}.{ts,tsx}',
  ],
},
```

**Cero outras modificacións** ao vitest.config.ts (cero jsdom, cero
setupFiles, cero outros plugins).

### 5.8 — Cero entry points novos en 7.1

**Confirmar explícitamente**: o `exports` field de package.json NON
se modifica en 7.1. Segue só:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./package.json": "./package.json"
}
```

**`/server`** vai en sub-fase 7.9 (SSR + RSC compatibility).
**`/headless`** vai en sub-fase 7.4 (ThemeProvider + tema minimal,
co fork headless).

### 5.9 — Cero modificación de src/index.ts

`src/index.ts` segue intacto:
```ts
// ── INICIO: @yggdrasil-forge/react ──
// React renderer for Yggdrasil Forge
// O contido real engadirase en sub-fases posteriores.

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'
// ── FIN: @yggdrasil-forge/react ──
```

**Razón**: 7.1 é setup; compoñentes van en 7.2-7.4.

### 5.10 — Cero ErrorCodes novos

**Cero modificación de packages/common/**.

### 5.11 — Cobertura

- `packages/react/src/`: cero código aínda (só VERSION export). Cobertura
  segue **100%** trivialmente.
- **Cero target global** para 7.1 (paquete autocontido sen impacto en
  outros).
- Cero v8 ignores esperados.

### 5.12 — Tests prescritos

3 tests totais en `smoke.test.tsx`:
1. `exporta VERSION` (xa existente).
2. `React 19 está dispoñible (renderToString funciona)`.
3. `renderToString manexa props básicas`.

**Total: 3 tests en packages/react/**.

### 5.13 — Test counts esperados post-7.1

- **react**: 1 (previo) + 2 (novos) = **3 tests**.
- **core**: 1523 (intacto).
- **common**: 60 (intacto).
- **storage**: 193 (intacto).
- **Total monorepo**: 1776 + 2 = **1778 tests**.

### 5.14 — `pnpm install --frozen-lockfile` previo

**Importante**: tras engadir entradas ao catálogo + package.json,
**`pnpm-lock.yaml` cambiará**. **Iso é esperado e necesario**. O
executor debe correr `pnpm install` (sen `--frozen-lockfile`) **unha
vez** para regenerar o lockfile, e logo o resto das verificacións con
`--frozen-lockfile` para garantir reproducibilidade.

### 5.15 — Build do paquete

Verificar empíricamente que `pnpm --filter @yggdrasil-forge/react build`
funciona tras as modificacións:
- `dist/index.js` (ESM) e `dist/index.cjs` (CJS) producidos.
- `dist/index.d.ts` producido.
- **Tamaños esperados**: cero crecemento significativo (cero código
  React real aínda; só VERSION export).
- React/react-dom **NON** deben ir bundleados en `dist/` (peerDependencies
  son externalizadas por tsup por defecto).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| 4 entradas catálogo pnpm | YAML edits | pnpm-workspace.yaml | +4 |
| peerDependencies React | JSON block | packages/react/package.json | +5 |
| devDependencies React + types | JSON block | packages/react/package.json | +4 |
| jsx config | tsconfig key | packages/react/tsconfig.json | +1 |
| vitest include .tsx | array entry | packages/react/vitest.config.ts | +1 mod |
| Smoke test ampliado | 2 tests novos | __tests__/smoke.test.tsx | ~25 |
| Rename .ts → .tsx | rename file | __tests__/ | (rename) |

**Total estimado**: ~50 liñas modificadas. **Cero código novo en
src/**.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/package.json` (MODIFICADO)
- `packages/react/tsconfig.json` (MODIFICADO)
- `packages/react/vitest.config.ts` (MODIFICADO)
- `packages/react/__tests__/smoke.test.ts` **DELETED** + `smoke.test.tsx` **NEW** (efectivo: rename + edit)
- `pnpm-workspace.yaml` (MODIFICADO: +4 entradas catálogo)
- `pnpm-lock.yaml` (MODIFICADO: regenerado polo install)
- `.changeset/react-setup.md` (NOVO: minor para react)
- `CHANGELOG.md` (MODIFICADO: nova `## [Unreleased]`)

**NON deben aparecer cambios en**:
- `packages/core/`, `packages/common/`, `packages/storage/` enteiros.
- `packages/react/src/` (cero modificación de index.ts).
- `packages/react/tsup.config.ts`.
- Outros 15 paquetes scaffold.
- `tsconfig.base.json`, `vitest.config.ts` raíz.
- `docs/architecture/MASTER.md`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx` files. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, cero `any`. NON desactives
Biome.

**JSX automatic runtime**: cero `import React from 'react'` en
ficheiros TSX. O runtime importa automáticamente desde `react/jsx-runtime`.

**`type` annotations no test helper components**: usar
`(): JSX.Element` ou `(props: P): JSX.Element` para tipar explicitamente
o return. Cero `React.FC` (anti-pattern moderno).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Crear ningún compoñente real (SkillTree, SkillNode, etc.) — **iso é 7.2**.
- ❌ Engadir hooks (useSkillTree, useNodeState) — **iso é 7.5**.
- ❌ Crear entry points `/server` ou `/headless` — son 7.9 e 7.4.
- ❌ Modificar `src/index.ts` (segue só exportando VERSION).
- ❌ Engadir `@testing-library/react` ou `jsdom` (non necesarios ata 7.2).
- ❌ Engadir `react/jsx-runtime` como import manual (`jsx: react-jsx`
  habilita o automatic runtime; o compilador inxecta os imports).
- ❌ Modificar `tsup.config.ts` (esbuild manexa JSX automáticamente).
- ❌ Engadir `ThemeProvider`, temas Oberón/minimal — son 7.4.
- ❌ Modificar `vitest.config.ts` raíz (cero modificación de raíz; só
  o do paquete).
- ❌ Engadir `"use client"` directive (cero `'use client'` en 7.1;
  ese é o tema de 7.9 RSC).
- ❌ Engadir Plugin de React a Vite/vitest (vitest detecta JSX
  nativamente con jsx en tsconfig).
- ❌ Cambiar `react` ou `react-dom` por versión inferior á 19.2.3
  (vulnerabilidade CVE-2025-55182).
- ❌ Pinear React/react-dom con versión EXACTA en peerDependencies
  (debe ser `^19.2.7` para que consumidores poidan usar futuras 19.x).
- ❌ Mover React a `dependencies` (debe ser **peerDependencies**;
  consumidores controlan a súa versión).
- ❌ Modificar `pnpm-workspace.yaml.packages` ou `allowBuilds:` (só
  engadir entradas ao bloque `catalog:`).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T11)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `8b54a34` como HEAD.

**T0.2** — Verificar estrutura scaffold actual de packages/react/:
```bash
ls packages/react/
# esperado: README.md __tests__ node_modules package.json src tsconfig.json tsup.config.ts vitest.config.ts
```

**T0.3** — Verificar que package.json **NON ten** peerDependencies aínda:
```bash
grep -E "peerDependencies|react" packages/react/package.json | grep -v "@yggdrasil" | head -5
# esperado: cero matches relevantes (cero "react" como dep)
```

**T0.4** — Verificar catálogo pnpm-workspace.yaml ten 6 entradas:
```bash
grep -E "^  [a-z@]" pnpm-workspace.yaml | head -10
# esperado: tsup, vitest, @vitest/coverage-v8, fake-indexeddb, opfs-mock, typescript
```

**T0.5** — Confirmar que `vitest.config.ts` raíz ten `environment: 'node'`
e include `.tsx`:
```bash
grep -E "environment|include" vitest.config.ts | head -5
```

**T0.6** — Baseline previo:
```bash
pnpm install --frozen-lockfile        # debe instalar sen cambios
pnpm turbo run typecheck --force       # esperado: 21/21
pnpm turbo run test --force            # esperado: 1776 totais
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir entradas ao catálogo pnpm-workspace.yaml

Engadir as 4 entradas segundo §5.3 literal. Manter aliñamento dos
elementos existentes (2 espazos de indentación).

### T2 — Actualizar package.json de @yggdrasil-forge/react

Engadir bloques `peerDependencies` + entradas a `devDependencies`
segundo §5.4 literal.

### T3 — Engadir jsx config a tsconfig.json

Engadir `"jsx": "react-jsx"` a `compilerOptions` segundo §5.5 literal.

### T4 — Actualizar vitest.config.ts do paquete

Cambiar include para soportar `.tsx` segundo §5.7.

### T5 — Renomear smoke.test.ts a smoke.test.tsx

```bash
mv packages/react/__tests__/smoke.test.ts packages/react/__tests__/smoke.test.tsx
```

**Importante**: usar `git mv` se posible (para preservar history).

### T6 — Ampliar smoke.test.tsx con 2 tests novos

Substituír contido segundo §5.6 literal.

### T7 — Instalar deps novas

```bash
pnpm install                          # SEN --frozen-lockfile (regenera lock)
```

Verificar que `pnpm-lock.yaml` actualizouse e que react/react-dom/@types
están en `packages/react/node_modules/`.

### T8 — Verificación post-install

```bash
pnpm install --frozen-lockfile        # debe pasar (lockfile estable)
pnpm turbo run typecheck --force       # 21/21
pnpm --filter @yggdrasil-forge/react test  # 3 tests pasando
```

### T9 — Build do paquete

```bash
pnpm --filter @yggdrasil-forge/react build
```

Verificar:
- `dist/index.js` (ESM), `dist/index.cjs` (CJS), `dist/index.d.ts`
  producidos.
- Tamaños sen crecemento significativo respecto á baseline (cero
  código React real bundleado).
- Cero `react` ou `react-dom` no contido bundleado (peerDependencies
  externalizadas correctamente):
  ```bash
  grep -c "react/jsx-runtime" packages/react/dist/index.js
  # esperado: 0 (cero matches)
  ```

### T10 — Lint + format + grep

```bash
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/
# esperado: cero matches reais
```

### T11 — Changeset + CHANGELOG + commit

`.changeset/react-setup.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): setup React 19.2.7 dependencies + JSX config (sub-phase 7.1)
```

**CHANGELOG**: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
Contido:

```
### Added
- `@yggdrasil-forge/react`: dependencias de React 19 + configuración
  inicial. React 19.2.7 (latest stable) e react-dom 19.2.7 declarados
  como `peerDependencies` (`^19.2.7`) e como `devDependencies` exactas
  (via catálogo pnpm) para tests internos. `@types/react` ^19.0.0 e
  `@types/react-dom` ^19.0.0 engadidos a devDependencies. Catálogo
  pnpm-workspace.yaml ampliado con 4 entradas (react, react-dom,
  @types/react, @types/react-dom) para reutilización en futuros paquetes
  da Fase 7+ (devtools, themes, heatmap).
- Configuración JSX no tsconfig do paquete (`"jsx": "react-jsx"`)
  para usar o automatic runtime moderno (cero `import React` necesario
  en ficheiros TSX).
- Smoke test ampliado (3 tests): verifica que React 19 pode renderizar
  un compoñente trivial vía `react-dom/server.renderToString` (cero
  DOM environment requerido para 7.1; jsdom engadirase cando 7.2+
  introduza compoñentes para renderizar no cliente).

### Note
- Sub-fase 7.1 PRIMEIRA da Fase 7 (React Renderer + a11y + SSR + RSC).
- **Cero compoñentes reais**: `SkillTree`, `SkillNode`, `SkillEdge` van
  en 7.2. `ThemeProvider` + temas en 7.4. Hooks en 7.5. SSR + RSC
  entry points (`/server`, `/headless`) en 7.9.
- **Critical security context**: React 19.2.7 escollido (latest stable
  do 1-jun-2026) por seguranza ante CVE-2025-55182 (React2Shell) que
  afecta 19.0.0–19.2.2.
- **Cero modificación de packages/core/, packages/common/,
  packages/storage/ ou outros 15 paquetes scaffold**. Sub-fase
  infraestrutura pura.
- **Cero ErrorCodes novos**.
```

Commit Conventional:
`feat(react): setup React 19.2.7 dependencies + JSX config (sub-phase 7.1)`

Push directo a `origin/main` (base `8b54a34`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 8b54a34)
✅ React 19.2.7 + react-dom 19.2.7 en peerDependencies (^19.2.7)
✅ React + react-dom + @types/react + @types/react-dom en
   devDependencies (via catálogo pnpm)
✅ Catálogo pnpm-workspace.yaml ampliado con 4 entradas
✅ JSX config no tsconfig: "jsx": "react-jsx" (automatic runtime)
✅ Smoke test ampliado: 3 tests (VERSION + renderToString trivial +
   props básicas)
✅ Ficheiro renomeado: smoke.test.ts → smoke.test.tsx
✅ vitest.config.ts do paquete: include .tsx engadido
✅ CERO compoñentes reais (van en 7.2+)
✅ CERO entry points novos (/server, /headless en 7.9, 7.4)
✅ CERO hooks (van en 7.5)
✅ CERO ThemeProvider (van en 7.4)
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO modificación de outros 15 paquetes scaffold
✅ CERO ErrorCodes novos
✅ T0.2 scaffold packages/react/ verificado: 6 ficheiros
✅ T0.3 cero peer/deps react previas: confirmado
✅ T0.4 catálogo previo: 6 entradas confirmadas
✅ T0.5 vitest.config raíz: environment 'node' + include .tsx
✅ Tests: 3 pasan en react (1 previo + 2 novos)
   - 1 VERSION export (existente)
   - 1 React 19 renderToString trivial
   - 1 React 19 renderToString con props
   Core: 1523 intactos | Common: 60 intactos | Storage: 193 intactos
✅ Typecheck: 21/21 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok
   - dist/index.js, dist/index.cjs, dist/index.d.ts producidos
   - Cero react/react-dom bundleados (peerDeps externalizadas)
✅ pnpm-lock.yaml regenerado + frozen-lockfile validado
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.1 PRIMEIRA da Fase 7.
   - 11 sub-fases pendentes en Fase 7 (7.2 a 7.12).
   - jsdom + @testing-library/react engadiránse cando 7.2 introduza
     compoñentes reais para renderizar no cliente.
   - React 19.2.7 elixido por seguranza (CVE-2025-55182 afecta
     19.0.0-19.2.2).
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 6 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.2 (SkillTree + SkillNode + SkillEdge).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.1. Primeira sub-fase da Fase 7. Setup infraestrutural
de React 19 sen compoñentes nin entry points novos. Risco arquitectónico
MOI BAIXO (sub-fase de configuración pura). Cero modificación de outros
paquetes core. Calquera dúbida → ESCALAR.*

*A cadea actual segue en 23 sub-fases sen rollback. 7.1 pretende manter
o ritmo abrindo Fase 7 cunha base sólida. As sub-fases reais con risco
arquitectónico empezarán en 7.2 (compoñentes) e 7.9 (RSC + SSR).*
