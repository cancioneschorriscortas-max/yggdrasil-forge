# BRIEFING EXECUTABLE — Sub-fase 0.2
## Yggdrasil Forge: Refinamento TypeScript + Biome + DX setup

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT. Desenvolvendo en Windows con Git Bash en `C:\Users\tajes\proxectos\yggdrasil-forge`.

Estado actual: monorepo creado coa estructura raíz, sen paquetes ainda. Configuracións base de TypeScript, Biome e Turborepo instaladas e funcionando. Última subfase (0.1.5) completou aliñación de versións pnpm/Node e migración de disco D:→C:.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 0.2**. Non improvisas, non preguntas "X ou Y?". As decisións xa están tomadas. Ao final, reportas no formato concreto da sección 9.

---

## 3. OBXECTIVO DESTA SUB-FASE

Tres bloques pequenos:

1. **Integrar o documento mestre de arquitectura no repo** (estaba fóra, en D:\).
2. **Refinar TypeScript e Biome** con configuracións extras útiles que se descubriron necesarias.
3. **Preparar DX (Developer Experience):** VS Code workspace, scripts adicionais, husky para hooks de git.

**NON** crear paquetes (sub-fase 0.4). **NON** configurar Vitest (sub-fase 0.3). **NON** configurar GitHub Actions (sub-fase 0.3).

---

## 4. DECISIÓNS XA TOMADAS (NON DISCUTIBLES)

- **Path do proxecto:** `C:\Users\tajes\proxectos\yggdrasil-forge` (Git Bash: `/c/Users/tajes/proxectos/yggdrasil-forge`)
- **Editor recomendado:** VS Code (extensións recomendadas mediante `.vscode/extensions.json`)
- **Git hooks:** Husky + lint-staged (para validar antes de commit)
- **Documento mestre:** `docs/architecture/MASTER.md` (move dende D:\proyectos\YGGDRASIL_FORGE_ARCHITECTURE.md)
- **Idioma de comentarios no código:** castelán
- **Convencións xa fixadas en sub-fase 0.1.1:** non revertibles

---

## 5. TAREFAS A EXECUTAR

### 5.1 Verificar estado de partida

Desde `C:\Users\tajes\proxectos\yggdrasil-forge`:

```bash
git status                        # Debe estar clean
git log --oneline -3              # Debe mostrar d02b4ef como HEAD
pnpm install                      # Debe pasar sen errores
pnpm lint                         # Debe pasar
pnpm format                       # Debe pasar
pnpm typecheck                    # Pode dar "no projects" — está ben
```

Se algo falla, **detente e reporta**. Non avances ata que estea limpo.

### 5.2 Integrar o documento mestre no repo

Crear directorio:
```bash
mkdir -p docs/architecture
```

Copiar o ficheiro mestre dende a súa ubicación externa:
- **Orixe:** `D:\proyectos\YGGDRASIL_FORGE_ARCHITECTURE.md`
- **Destino:** `C:\Users\tajes\proxectos\yggdrasil-forge\docs\architecture\MASTER.md`

Como o ficheiro está fóra do repo, ti como executor non o tes accesible directamente. **Pídeao ao autor**: que cope manualmente o ficheiro a `docs/architecture/MASTER.md` (drag-and-drop ou `cp` desde Git Bash):

```bash
cp /d/proyectos/YGGDRASIL_FORGE_ARCHITECTURE.md docs/architecture/MASTER.md
```

Se o autor xa non ten o ficheiro orixinal accesible, **detente e dimo** — o director ten o documento e farémolo doutro xeito.

Tras copiar, verifica:
```bash
ls -la docs/architecture/
wc -l docs/architecture/MASTER.md   # Debe ser >2000 liñas
```

Crear `docs/architecture/README.md`:
```markdown
# Architecture Documentation

This directory contains the master architecture documents for Yggdrasil Forge.

## Files

- `MASTER.md` — The master architecture document. Single source of truth for all architectural decisions.

## How to use

The master document is the **single source of truth**. All sub-phase briefings derive from it.

When the master document changes, all open sub-phase work must align with the new state. Conflicts are resolved in favor of the master.

## Editing

Edits to the master document are reviewed by the project director before being committed.
```

### 5.3 Refinar tsconfig.base.json

O ficheiro actual é correcto pero falta unha cousa importante: **paths para o monorepo**, e algunhas opcións extra que axudarán cando creemos paquetes.

Substituir o contido completo de `tsconfig.base.json` por:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,

    "incremental": true
  }
}
```

Cambios respecto á versión anterior:
- Engadiu `$schema` para autocomplete en VS Code
- Engadiu `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` (catchear bugs cedo)
- Engadiu `removeComments: false` (preservar JSDoc nos `.d.ts` xerados)
- Engadiu `incremental: true` (compilacións máis rápidas)

### 5.4 Crear tsconfig.json raíz (con references)

Esto prepara o terreo para cando teñamos paquetes. Por agora estará case vacío, pero o seu sitio xa estará reservado.

Crear `tsconfig.json` (na raíz, ao lado de `tsconfig.base.json`):

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": [],
  "references": []
}
```

As references engadiranse cando creemos paquetes (sub-fase 0.4 e seguintes).

### 5.5 Refinar biome.json

O ficheiro actual funciona, pero engadimos algunhas reglas máis para a calidade. Substituir o contido completo de `biome.json` por:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "files": {
    "ignore": [
      "**/dist",
      "**/node_modules",
      "**/.turbo",
      "**/coverage",
      "**/*.min.js",
      "**/*.min.css",
      "pnpm-lock.yaml"
    ]
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf",
    "formatWithErrors": false
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "asNeeded",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  },
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noBannedTypes": "error",
        "noUselessTypeConstraint": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "useImportType": "error",
        "useExportType": "error",
        "useNodejsImportProtocol": "error",
        "useTemplate": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noEmptyBlockStatements": "error",
        "noConsole": {
          "level": "warn",
          "options": { "allow": ["warn", "error", "info"] }
        }
      },
      "performance": {
        "noAccumulatingSpread": "warn"
      }
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

Cambios principais:
- Inclúe `vcs.useIgnoreFile` (le `.gitignore` automaticamente)
- Engade reglas extras úteis: `noUnusedImports`, `useImportType`, `noExplicitAny`, `noConsole` (con excepcións), etc.
- Excluír ficheiros minificados e o lock

Tras editar, verifica:
```bash
pnpm lint        # Debe pasar
pnpm format      # Debe pasar
```

### 5.6 Engadir scripts úteis ao package.json

Substituir o `scripts` block do `package.json` raíz por:

```json
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev",
    "clean": "turbo run clean && rm -rf node_modules",
    "fresh": "pnpm clean && pnpm install",
    "validate": "pnpm lint && pnpm typecheck && pnpm test",
    "prepare": "husky"
  },
```

Cambios:
- `lint:fix` para auto-aplicar correccións
- `test:watch` para desenvolvemento iterativo
- `fresh` (clean + install) cando algo se rompe estraño
- `validate` que executa todo o gauntlet (útil antes de PR)
- `prepare` para husky (instálase automaticamente con `pnpm install`)

### 5.7 Configurar Husky + lint-staged

**Husky** executa hooks de git. **lint-staged** corre lint só nos ficheiros modificados (rápido).

Instalar:
```bash
pnpm add -D -w husky lint-staged
```

`-w` é importante: instala no workspace root, non nun paquete.

**Aprobar build script de Husky** (probablemente o pedirá):
```bash
pnpm approve-builds
```
Selecciona `husky` no menú interactivo.

Inicializar:
```bash
pnpm exec husky init
```

Esto crea `.husky/pre-commit` cun comando por defecto. Substitúeo por:

```bash
pnpm exec lint-staged
```

Crear `.lintstagedrc.json`:

```json
{
  "*.{js,jsx,ts,tsx,json}": ["biome check --write --no-errors-on-unmatched"],
  "*.{md,yml,yaml}": ["biome format --write --no-errors-on-unmatched"]
}
```

Tamén engade un hook de pre-push para validación extra. Crear `.husky/pre-push`:

```bash
pnpm typecheck
```

Make sure ten permisos executables (en Git Bash xa funciona automáticamente, pero por seguranza):
```bash
chmod +x .husky/pre-commit .husky/pre-push 2>/dev/null || true
```

### 5.8 Configurar VS Code workspace

Crear directorio `.vscode/`:
```bash
mkdir -p .vscode
```

Crear `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "biomejs.biome",
    "editorconfig.editorconfig",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "vivaxy.vscode-conventional-commits",
    "github.vscode-pull-request-github",
    "eamodio.gitlens",
    "streetsidesoftware.code-spell-checker",
    "yoavbls.pretty-ts-errors",
    "ms-vscode.vscode-typescript-next"
  ],
  "unwantedRecommendations": []
}
```

Crear `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/.turbo": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.turbo": true,
    "**/dist": true,
    "**/pnpm-lock.yaml": true
  },
  "eslint.enable": false
}
```

ESLint desactivado explícitamente porque usamos Biome.

Crear `.vscode/launch.json` mínimo (debug config):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug current TS file",
      "skipFiles": ["<node_internals>/**"],
      "program": "${file}",
      "runtimeArgs": ["--import", "tsx"],
      "runtimeExecutable": "node"
    }
  ]
}
```

(`tsx` engadirémolo cando o necesitemos. Por agora a config queda lista.)

### 5.9 Engadir scripts úteis no directorio scripts/

Crear `scripts/check-env.mjs` — script que verifica que o entorno de desenvolvemento é correcto:

```javascript
#!/usr/bin/env node
// ── INICIO: check-env ──
// Verifica que o entorno cumpre os requisitos do proxecto.
// Execución: node scripts/check-env.mjs
// Tamén: pnpm exec node scripts/check-env.mjs

import { execSync } from 'node:child_process'
import process from 'node:process'

const REQUIRED_NODE_MAJOR = 22
const REQUIRED_PNPM_MAJOR = 11

let hasErrors = false

function check(label, fn) {
  try {
    const result = fn()
    console.log(`✅ ${label}: ${result}`)
  } catch (err) {
    console.error(`❌ ${label}: ${err.message}`)
    hasErrors = true
  }
}

console.log('🔍 Verificando entorno de desenvolvemento...\n')

check('Node.js', () => {
  const major = parseInt(process.versions.node.split('.')[0], 10)
  if (major < REQUIRED_NODE_MAJOR) {
    throw new Error(`Node ${process.version}, requírese >=${REQUIRED_NODE_MAJOR}`)
  }
  return process.version
})

check('pnpm', () => {
  const version = execSync('pnpm --version', { encoding: 'utf-8' }).trim()
  const major = parseInt(version.split('.')[0], 10)
  if (major < REQUIRED_PNPM_MAJOR) {
    throw new Error(`pnpm ${version}, requírese >=${REQUIRED_PNPM_MAJOR}`)
  }
  return version
})

check('git', () => {
  return execSync('git --version', { encoding: 'utf-8' }).trim()
})

check('TypeScript', () => {
  return execSync('pnpm exec tsc --version', { encoding: 'utf-8' }).trim()
})

check('Biome', () => {
  return execSync('pnpm exec biome --version', { encoding: 'utf-8' }).trim()
})

if (hasErrors) {
  console.error('\n❌ Algunhas verificacións fallaron. Corrixe e volve a executar.')
  process.exit(1)
} else {
  console.log('\n✅ Entorno listo para desenvolver Yggdrasil Forge.')
}
// ── FIN: check-env ──
```

Engadir ao `scripts` block do `package.json`:

```json
    "check-env": "node scripts/check-env.mjs",
```

(Vai entre `validate` e `prepare`.)

### 5.10 Actualizar CONTRIBUTING.md

Substituir o contido completo de `CONTRIBUTING.md` por:

```markdown
# Contributing to Yggdrasil Forge

🚧 **The project is in early development.** Contribution guidelines will be detailed here as the project matures.

For now, please open an issue to discuss any contribution before submitting a pull request.

## Prerequisites

- Node.js 22+
- pnpm 11+
- Git

## Setup

\`\`\`bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git
cd yggdrasil-forge
pnpm install
pnpm check-env   # Verifica o entorno
\`\`\`

## Development workflow

\`\`\`bash
pnpm dev           # Watch mode across packages
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm typecheck     # Type-check across packages
pnpm lint          # Lint with Biome
pnpm lint:fix      # Auto-fix linting issues
pnpm format        # Format code with Biome
pnpm validate      # lint + typecheck + test
pnpm fresh         # Clean and reinstall (when something is weird)
\`\`\`

## Git hooks

Husky runs:
- `pre-commit`: `lint-staged` (formats and checks staged files)
- `pre-push`: `pnpm typecheck` (catches type errors before pushing)

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

\`\`\`
feat(core): add new feature
fix(react): fix a bug
docs: update documentation
refactor(core): improve code structure
test(core): add tests
chore: maintenance tasks
\`\`\`

## Architecture

The master architecture document lives at [`docs/architecture/MASTER.md`](./docs/architecture/MASTER.md).

It is the single source of truth for the project. Major changes require updating it first.
```

### 5.11 Actualizar CHANGELOG.md

Engadir a sección "[Unreleased]" estas entradas:

```markdown
### Added
- Master architecture document at `docs/architecture/MASTER.md`
- VS Code workspace settings and recommended extensions
- Husky git hooks (pre-commit lint-staged, pre-push typecheck)
- Environment check script (`pnpm check-env`)
- Refined Biome configuration with stricter rules
- Refined TypeScript configuration with extra safety options
- Additional npm scripts: `lint:fix`, `test:watch`, `fresh`, `validate`

### Changed
- TypeScript: enabled `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `incremental`
- Biome: enabled `noUnusedImports`, `useImportType`, `noConsole`, more strict rules
```

### 5.12 Verificación final

Executa:
```bash
pnpm check-env       # Debe pasar todos os checks
pnpm install         # Debe pasar
pnpm lint            # Debe pasar
pnpm format          # Debe pasar
pnpm typecheck       # Debe pasar (ou "no projects to typecheck")
pnpm validate        # Debe pasar (lint + typecheck + test)
```

Verifica que husky funciona:
```bash
ls -la .husky/       # Debe mostrar pre-commit e pre-push
cat .husky/pre-commit
cat .husky/pre-push
```

### 5.13 Commit

```bash
git add .
git status            # Revisa que está todo o que esperas
git commit -m "chore: refine TS/Biome config, add DX setup with husky and VS Code workspace"
git push origin main
```

O hook de pre-commit debe executarse e formatear cousas se as hai. Se da erro, corríxeo antes de commit.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN:** úsanse en `scripts/check-env.mjs` (xa incluído).
- **Idioma de comentarios no código:** castelán.
- **Verificación tras cambios:** despois de cada paso, verifica que funciona antes de continuar.
- **Recordar git commit:** o briefing termina cun commit; recórdalle ao autor que está feito.
- **Idioma de comunicación co autor:** castelán/galego.
- **Cero scope creep:** NON instalar Vitest, NON crear paquetes, NON tocar GitHub Actions.

---

## 7. QUE NON FACER

- ❌ Non crear paquetes en `packages/` (sub-fase 0.4).
- ❌ Non instalar Vitest, React, ou framework algún (sub-fases posteriores).
- ❌ Non configurar GitHub Actions / CI (sub-fase 0.3).
- ❌ Non configurar changesets (sub-fase 0.5).
- ❌ Non escribir código TypeScript real (só o `.mjs` do check-env).
- ❌ Non engadir extensions de VS Code que non estean na lista.
- ❌ Non instalar `tsx` (mencionado no launch.json pero non é necesario aínda).

---

## 8. QUE ENTREGAR AO FINAL

Confirma que:

1. ✅ `docs/architecture/MASTER.md` existe (>2000 liñas)
2. ✅ `docs/architecture/README.md` existe
3. ✅ `tsconfig.base.json` actualizado con novas opcións
4. ✅ `tsconfig.json` raíz creado
5. ✅ `biome.json` actualizado con reglas extras
6. ✅ `package.json` ten os novos scripts
7. ✅ Husky instalado e con dous hooks (pre-commit, pre-push)
8. ✅ `.lintstagedrc.json` creado
9. ✅ `.vscode/extensions.json`, `.vscode/settings.json`, `.vscode/launch.json` creados
10. ✅ `scripts/check-env.mjs` creado e funcional
11. ✅ `CONTRIBUTING.md` actualizado
12. ✅ `CHANGELOG.md` actualizado
13. ✅ Verificacións pasadas
14. ✅ Commit pusheado

Mostra ao autor:
```bash
ls -la docs/architecture/
ls -la .vscode/
ls -la .husky/
ls -la scripts/
git log --oneline -5
pnpm check-env
```

---

## 9. COMO REPORTAR

Ao final, presenta este resumo ao autor (mantén o formato visual cos separadores):

```
═══════════════════════════════════════
SUB-FASE 0.2 — COMPLETADA
═══════════════════════════════════════

✅ Documento mestre integrado en docs/architecture/MASTER.md
✅ TypeScript config refinada (noUnusedLocals, incremental, etc.)
✅ Biome config refinada (regras extras, vcs integration)
✅ Husky + lint-staged configurados (pre-commit, pre-push)
✅ VS Code workspace configurado (settings, extensions, launch)
✅ Scripts adicionais en package.json (validate, fresh, check-env)
✅ scripts/check-env.mjs creado
✅ CONTRIBUTING.md e CHANGELOG.md actualizados

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor (se houbo algunha fóra do briefing):
[Lista, ou "Ningunha — todo aliñado co briefing"]

📋 Estado para a directora:
LISTO PARA PROCEDER Á SUB-FASE 0.3
```

---

**FIN DO BRIEFING 0.2**

Cando completes todos os pasos, fai o reporte do punto 9 e detente. Non procedas a 0.3 — iso virá nun chat novo.
