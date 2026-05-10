# BRIEFING EXECUTABLE — Sub-fase 0.3
## Yggdrasil Forge: Vitest + GitHub Actions CI + axustes finais

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT. Desenvolvendo en Windows con Git Bash en `C:\Users\tajes\proxectos\yggdrasil-forge`.

**Estado actual:**
- Monorepo creado coa estructura raíz (sub-fase 0.1)
- pnpm 11, Node 22+, configuracións aliñadas (0.1.5)
- TypeScript + Biome refinados, Husky + lint-staged + VS Code workspace, scripts utilitarios (0.2)
- Documento mestre integrado en `docs/architecture/MASTER.md`

Sen paquetes ainda. Primeiro paquete real virá na sub-fase 0.4.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 0.3**. Non improvisas, non preguntas "X ou Y?". As decisións xa están tomadas. Ao final, reportas no formato concreto da sección 9.

---

## 3. OBXECTIVO DESTA SUB-FASE

Tres bloques:

1. **Pequenos axustes finais** descubertos durante 0.2 (renomeado de directorio, axuste de gitignore).
2. **Configurar Vitest** a nivel raíz preparado para os paquetes futuros.
3. **Configurar GitHub Actions CI** mínimo pero útil: lint + format check + typecheck + test, en cada PR e push a main.

**NON** crear paquetes (0.4). **NON** instalar React. **NON** configurar Storybook nin Chromatic.

---

## 4. DECISIÓNS XA TOMADAS

- **Naming de directorios:** kebab-case obrigatorio. `BRIEFINGS` debe pasar a `briefings`.
- **Test framework:** Vitest (xa decidido en arquitectura, sec. 57)
- **Cobertura de tests:** v8 provider (built-in en Vitest, sen necesidade de istanbul)
- **CI:** GitHub Actions, executar en push a `main` e en cada PR
- **Cache:** Turborepo cache local. Remote cache de Vercel **NON** se configura agora (require conta).
- **Matrix de Node:** só Node 22 por agora (matriz Node 22, 24 cando o proxecto sexa máis estable)
- **OS:** ubuntu-latest por defecto (windows-latest podería engadirse no futuro)
- **Tempo límite por job:** 10 minutos
- **Concurrency:** cancelar runs anteriores se chega un novo commit á mesma rama

---

## 5. TAREFAS A EXECUTAR

### 5.1 Verificar estado de partida

Desde `C:\Users\tajes\proxectos\yggdrasil-forge`:

```bash
git status                        # Debe estar clean
git log --oneline -5              # Último commit debe ser e66b00a
pnpm check-env                    # Debe pasar
pnpm lint                         # Debe pasar
pnpm format                       # Debe pasar
pnpm typecheck                    # Debe pasar (ou "no projects")
```

Se algo falla, **detente e reporta**.

### 5.2 Renomear docs/BRIEFINGS → docs/briefings

A directora establece: **directorios en kebab-case obrigatorio**. `BRIEFINGS` debe ser `briefings`.

⚠️ **Atención en Windows:** o sistema de ficheiros é case-insensitive, polo que `mv` directo pode non funcionar. Hai que facer un movemento intermedio:

```bash
git mv docs/BRIEFINGS docs/briefings_temp
git mv docs/briefings_temp docs/briefings
git status     # Debe mostrar "renamed: docs/BRIEFINGS/... -> docs/briefings/..."
```

Se Git non detecta os cambios como renames, é porque Windows non distingue maiúsculas. Forza o cambio:

```bash
# Opción alternativa se o anterior falla:
git mv -f docs/BRIEFINGS docs/briefings_tmp
git commit -m "chore: temporary rename for case-sensitive fix"
git mv docs/briefings_tmp docs/briefings
git commit --amend --no-edit
```

Verifica:
```bash
ls docs/                          # Debe mostrar briefings/ (todo minúsculas)
ls docs/briefings/                # Debe ter o briefing 0.2
```

### 5.3 Instalar Vitest

```bash
pnpm add -D -w vitest @vitest/coverage-v8 @vitest/ui
```

`-D` = devDependency. `-w` = workspace root.

⚠️ **Probable que pida aprobar build scripts.** Se o pide:
```bash
pnpm approve-builds
```
Aproba `vitest` se aparece (e calquera dependencia con script que apareza). Documentaranse no CHANGELOG.

### 5.4 Crear vitest.config.ts raíz

Esta config é a base que herdarán os paquetes individuais. Por agora vacía pero deixa o esqueleto.

Crear `vitest.config.ts` na raíz:

```typescript
// ── INICIO: vitest config raíz ──
// Configuración base de Vitest para o workspace.
// Cada paquete pode ter o seu propio vitest.config.ts que extenda este.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Globals desactivado: imports explícitos de describe/it/expect
    // Mellor para tree-shaking e claridade
    globals: false,

    // Entorno por defecto: node
    // Os paquetes que precisen DOM (react, editor) sobrescriben a 'jsdom'
    environment: 'node',

    // Patróns de tests
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.{ts,js,mjs}',
        '**/index.ts',
      ],
      // Thresholds aplican cando haxa código real
      // (de momento desactivados para non bloquear)
    },

    // Reporters
    reporters: ['default'],

    // Timeouts conservadores
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})
// ── FIN: vitest config raíz ──
```

### 5.5 Engadir scripts de test ao package.json raíz

Substituír o `scripts` block actual por:

```json
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev",
    "clean": "turbo run clean && rm -rf node_modules",
    "fresh": "pnpm clean && pnpm install",
    "validate": "pnpm lint && pnpm typecheck && pnpm test",
    "check-env": "node scripts/check-env.mjs",
    "prepare": "husky"
  },
```

Cambios respecto a 0.2:
- Engadiu `test:ui` (Vitest UI no navegador)
- Engadiu `test:coverage` (xera report de cobertura)
- Engadiu `format:check` (sen modificar — para CI)

### 5.6 Configurar tasks de Vitest en turbo.json

Substituír `turbo.json` por:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": ["*.tsbuildinfo"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

Cambios:
- Engadiu `ui: "stream"` para output máis lexible
- Engadiu `test:watch` como persistent + non-cacheable
- Engadiu `lint` task
- `test` task agora declara coverage como output

### 5.7 Crear test de smoke a nivel raíz

Para verificar que Vitest funciona, crear un test trivial:

```bash
mkdir -p __tests__
```

Crear `__tests__/smoke.test.ts`:

```typescript
// ── INICIO: smoke test ──
// Test trivial para verificar que Vitest funciona.
// Será eliminado cando creemos os primeiros paquetes con tests reais.

import { describe, expect, it } from 'vitest'

describe('Smoke test', () => {
  it('should run vitest correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support async tests', async () => {
    const value = await Promise.resolve('yggdrasil')
    expect(value).toBe('yggdrasil')
  })

  it('should fail correctly when expected', () => {
    expect(() => {
      throw new Error('expected')
    }).toThrow('expected')
  })
})
// ── FIN: smoke test ──
```

Verificar:
```bash
pnpm vitest run __tests__/smoke.test.ts
```

Debe pasar os 3 tests.

Tamén verificar coverage:
```bash
pnpm test:coverage
```

Debe xerar `coverage/` (que xa está en `.gitignore`).

### 5.8 Crear directorio .github/workflows e workflow de CI

Crear `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: Validate (lint, format, typecheck, test)
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.0.9
          run_install: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test
```

Cambios sobre o estándar:
- `concurrency` para cancelar runs antigos da mesma rama
- `frozen-lockfile` no install (estricto, non actualiza lock)
- `cache: pnpm` no setup-node para acelerar instalacións
- `format:check` (non escribe) en vez de `format` (que escribiría)

### 5.9 Crear workflow de PR title check

Para asegurar que os títulos de PR seguen Conventional Commits.

Crear `.github/workflows/pr-title.yml`:

```yaml
name: PR Title

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  validate:
    name: Validate PR title
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            docs
            style
            refactor
            perf
            test
            build
            ci
            chore
            revert
          requireScope: false
          subjectPattern: ^(?![A-Z]).+$
          subjectPatternError: |
            The subject "{subject}" found in the pull request title "{title}"
            didn't match the configured pattern. Please ensure that the subject
            doesn't start with an uppercase character.
```

### 5.10 Engadir badge de CI ao README

Editar `README.md`. Despois da liña con `> The world tree from which all skill trees grow.` engadir liña vacía e despois:

```markdown
[![CI](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

### 5.11 Actualizar CHANGELOG.md

Engadir á sección "[Unreleased]" estas entradas:

```markdown
### Added
- Vitest configured at workspace root with v8 coverage provider
- Smoke tests to verify Vitest installation
- GitHub Actions CI workflow (lint, format, typecheck, test)
- PR title validation workflow (enforces Conventional Commits)
- CI and License badges in README
- New scripts: `test:ui`, `test:coverage`, `format:check`

### Changed
- Renamed `docs/BRIEFINGS` to `docs/briefings` (kebab-case convention)
- Refined `turbo.json` with stream UI and test:watch task
```

Tamén, se vitest pediu approve-builds, engadir á sección "Added":
- Approved build scripts for `vitest` (or whatever package) via pnpm allowBuilds

### 5.12 Verificación final

Executa:
```bash
pnpm check-env
pnpm install                          # Debe pasar
pnpm lint                             # Debe pasar
pnpm format:check                     # Debe pasar
pnpm typecheck                        # Debe pasar (ou "no projects")
pnpm test                             # Debe pasar (smoke tests)
pnpm test:coverage                    # Debe xerar coverage/ e pasar
pnpm validate                         # Debe pasar todo
```

Verificar que husky segue funcionando:
```bash
ls .husky/
cat .husky/pre-commit
cat .husky/pre-push
```

### 5.13 Commit e push

```bash
git add .
git status                            # Revisa que está todo
git commit -m "feat: add vitest config, CI workflow, and PR title validation"
git push origin main
```

Despois do push, vai a https://github.com/cancioneschorriscortas-max/yggdrasil-forge/actions e verifica que o workflow CI se executa e pasa.

Se falla, **non avances**. Reporta o erro exacto ao autor.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN:** úsanse en `vitest.config.ts` e `__tests__/smoke.test.ts` (xa incluídos).
- **Idioma de comentarios no código:** castelán.
- **Verificación tras cada paso:** especialmente o renomeado de directorio en 5.2 (Windows é tricky).
- **Git commit ao final con descrición clara.**
- **Idioma de comunicación:** castelán/galego.

---

## 7. QUE NON FACER

- ❌ Non crear paquetes en `packages/` (sub-fase 0.4).
- ❌ Non instalar React, jsdom, ou framework algún. Vitest configúrase con entorno node por defecto.
- ❌ Non configurar Storybook (fase posterior).
- ❌ Non configurar Chromatic, Codecov, ou servizos externos que requiran tokens.
- ❌ Non configurar remote cache de Turborepo (require conta Vercel).
- ❌ Non engadir matriz de OS (windows/macos) ao CI por agora — só Linux.
- ❌ Non configurar release automation (sub-fase 0.5 con changesets).

---

## 8. QUE ENTREGAR AO FINAL

Confirma que:

1. ✅ `docs/briefings/` (minúsculas) en vez de `docs/BRIEFINGS/`
2. ✅ Vitest instalado con coverage v8 e UI
3. ✅ `vitest.config.ts` raíz creado
4. ✅ `__tests__/smoke.test.ts` pasa 3 tests
5. ✅ `turbo.json` actualizado con tasks de test
6. ✅ `package.json` con scripts novos
7. ✅ `.github/workflows/ci.yml` creado
8. ✅ `.github/workflows/pr-title.yml` creado
9. ✅ Badges en README
10. ✅ CHANGELOG actualizado
11. ✅ Verificacións pasadas localmente
12. ✅ Commit pusheado
13. ✅ **Workflow CI executou e PASOU en GitHub** (verificable na pestana Actions)

Mostra ao autor:
```bash
ls docs/                              # briefings/ (minúsculas)
ls .github/workflows/                 # ci.yml, pr-title.yml
git log --oneline -5
pnpm test                             # output dos smoke tests
pnpm validate                         # output completo
```

---

## 9. COMO REPORTAR

Ao final, presenta este resumo ao autor:

```
═══════════════════════════════════════
SUB-FASE 0.3 — COMPLETADA
═══════════════════════════════════════

✅ docs/BRIEFINGS renombrado a docs/briefings (kebab-case)
✅ Vitest 1.x instalado con coverage v8 e UI
✅ vitest.config.ts raíz creado e funcional
✅ Smoke tests pasan (3/3)
✅ turbo.json refinado con tasks de test
✅ Scripts engadidos: test:ui, test:coverage, format:check
✅ GitHub Actions CI workflow creado
✅ PR title validation workflow creado
✅ Badges (CI + License) en README
✅ CHANGELOG actualizado

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

🔗 CI execution: https://github.com/cancioneschorriscortas-max/yggdrasil-forge/actions
   Estado: [PASSED / FAILED + motivo]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor (se houbo algunha fóra do briefing):
[Lista, ou "Ningunha"]

📋 Estado para a directora:
LISTO PARA PROCEDER Á SUB-FASE 0.4
```

---

**FIN DO BRIEFING 0.3**

Cando completes todos os pasos, fai o reporte e detente. Non procedas a 0.4 — iso virá nun chat novo.
