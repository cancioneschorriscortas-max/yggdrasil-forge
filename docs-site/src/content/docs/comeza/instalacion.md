---
title: Instalación
description: Que instalar segundo o que queiras facer — usar o editor, integrar o renderer nunha app, ou xerar árbores por liña de comandos.
sidebar:
  order: 1
---

Yggdrasil Forge é un monorepo. Escolle a porta de entrada segundo o teu caso:

| Quero… | Que precisas |
|---|---|
| **Construír árbores visualmente** | Clonar o repo e arrancar o editor (abaixo). |
| **Mostrar unha árbore na miña app React** | `@yggdrasil-forge/core` + `@yggdrasil-forge/react`. |
| **Xerar/validar árbores por pipeline ou con IA** | `@yggdrasil-forge/cli` (`ygg`). |
| **Só o motor (sen UI)** | `@yggdrasil-forge/core`. |

> **Estado: alpha (0.x).** A API pública de `core`/`react` estabilízase cara ao 1.0; os paquetes `editor-*` viven no repo e aínda non se publican.

## Requisitos

- **Node.js ≥ 22** e **pnpm 11** (via `corepack`).
- Un navegador moderno (Chromium, Firefox, Safari) para o editor.

## O editor (desde o repo)

```bash
git clone https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git
cd yggdrasil-forge
corepack pnpm install
corepack pnpm --filter @yggdrasil-forge-examples/editor run dev
```

Abre a URL que imprime Vite (normalmente `http://localhost:5173`). Carga a árbore de exemplo do panadeiro; desde aí, [a túa primeira árbore](../primeira-arbore/).

## O renderer na túa app

```bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/react react react-dom
```

```tsx
import { TreeEngine } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'
import treeDef from './a-mina-arbore.json'

const engine = new TreeEngine(treeDef.tree) // o campo `tree` do documento

export function Arbore() {
  return <SkillTree engine={engine} />
}
```

`SkillTree` renderiza SVG accesible e interactivo (pan, zoom, selección) e subscríbese ao motor: cando un nodo se desbloquea, o render segue. Tema, iconas e layouts explícanse nas súas seccións.

## A liña de comandos

```bash
pnpm add -D @yggdrasil-forge/cli
npx ygg --help
```

`ygg validate`, `ygg layout`, `ygg render`, `ygg schema`, `ygg new`. É a ferramenta da [vía do dato](../../via-do-dato/): todo o que o editor sabe facer sobre un documento, sen abrir o editor.

## No repo (para contribuír)

```bash
corepack pnpm install
corepack pnpm build          # todos os paquetes e exemplos
corepack pnpm test           # suite completa
corepack pnpm run docs:dev   # esta documentación en local
```

As portas de calidade (lint, formato, typecheck, tests) e as convencións están en `docs/architecture/MASTER.md`, o documento canónico do proxecto.
