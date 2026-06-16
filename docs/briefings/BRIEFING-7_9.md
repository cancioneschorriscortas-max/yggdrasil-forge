# BRIEFING — SUB-FASE 7.9 de Yggdrasil Forge

> Pega este documento no chat executor.
> **NOVENA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react`:
> 1. **`SkillTreeStatic`** — compoñente público novo (cero hooks, cero
>    `'use client'`) que renderiza estaticamente unha árbore dado
>    `treeDef` + `state` opcional. RSC-safe.
> 2. **`serializeForClient(treeDef, state?)`** — función pura que
>    serializa o par a JSON con escape HTML, listo para inxectar
>    dentro de `<script>` tags.
> 3. **Terceiro entry point `/server`** — `@yggdrasil-forge/react/server`
>    que re-exporta `SkillTreeStatic`, `computeLayout` (do core), e
>    `serializeForClient`. **Cero compoñentes con `'use client'`**
>    expostos.
>
> **DIFERIDA**: migración a `engine.getServerSnapshot.bind(engine)`
> nos hooks + SkillTree existentes. Actualmente `getServerSnapshot`
> e `getSnapshot` son funcionalmente idénticos no core
> (verificado empíricamente en §2), polo que cero risco de tearing
> ou hydration mismatch. **Anotada como débeda para hixiene MASTER
> post-Fase 7** (mellora opcional para preparar futuras divergencias).
>
> **Cero modificación de SkillTree, SkillNode, SkillEdge, MeshOverlay,
> SVGRenderer, ThemeProvider, SkillTreeWithDefaultTheme, SkillTreeAnnouncer,
> svg-helpers, createDefaultLayoutRegistry, theme-types, themes/minimal,
> animations, hooks/*** nin os seus tests.
>
> 7.10 (mobile/touch), 7.11 (error boundaries), 7.12 (tests visuais)
> DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Lección 7.5 L1**:
verificación empírica de comportamento runtime aplicada en §2 vía
script `tsx`.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.9 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.9 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación. **Cero
regresión de cobertura tolerada** respecto á baseline post-7.8.

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de calquera
ficheiro existente en `packages/react/src/` salvo `package.json` e
`tsup.config.ts` (engadir terceiro entry point). **Cero modificación
de tests existentes**.

**Tódolos 78 tests existentes deben pasar intactos**.

**0.14 — SSR safety crítica**: SkillTreeStatic.tsx debe ser
**verificable con `renderToString`** sen erro. **Cero `'use client'`,
cero hooks, cero useEffect, cero useState, cero useContext**. Todo
síncrono e funcional puro. **Cero acceso a `window`, `document`,
`localStorage`, `navigator`, ou calquera API DOM**.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.9** de Yggdrasil Forge. **NOVENA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (4 grupos)**:

**Grupo A — Compoñente público RSC-safe**:
1. **`SkillTreeStatic`** (NOVO): compoñente React funcional puro
   (cero hooks). Renderiza inline o `<svg>` con `<MeshOverlay>` (se
   `mesh` está dispoñible), `<g>` para edges, e `<g>` para nodes.
   **NON usa `SVGRenderer`** (que ten `'use client'` desde 7.4).
   Renderizado inline sen `<style>` interno nin CSS vars (modo
   "headless por defecto").

**Grupo B — Función pura RSC-safe**:
2. **`serializeForClient(treeDef, state?)`**: función pura que
   devolve `string` JSON con escape de `<` e `>` (patrón estándar
   Next.js/Remix para inxección segura dentro de `<script>` tags).

**Grupo C — Novo entry point**:
3. **`packages/react/src/server.ts`** (NOVO entry point): re-exporta
   `SkillTreeStatic`, `computeLayout` (do core), `serializeForClient`,
   e tipos asociados. **NON re-exporta**: `SkillTree`, `ThemeProvider`,
   `SkillTreeAnnouncer`, `SVGRenderer`, hooks/*, `minimal`, `Theme`
   (todos requirintes de `'use client'`).
4. **`packages/react/package.json`** (MODIFICADO): engadir `./server`
   a `exports`.
5. **`packages/react/tsup.config.ts`** (MODIFICADO): engadir
   `'src/server.ts'` a `entry`.

**Grupo D — Tests**:
6. **`__tests__/SkillTreeStatic.test.tsx`** (NOVO, ~6 tests).
7. **`__tests__/serializeForClient.test.ts`** (NOVO, ~5 tests).
8. **`__tests__/server-entry.test.ts`** (NOVO, ~3 tests).

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- **Calquera outro ficheiro de packages/react/src/**: SkillTree,
  SkillNode, SkillEdge, MeshOverlay, SVGRenderer, ThemeProvider,
  SkillTreeWithDefaultTheme, SkillTreeAnnouncer, svg-helpers,
  animations, createDefaultLayoutRegistry, theme-types, themes/minimal,
  headless, index, hooks/*.
- Tests existentes (smoke, SkillTree, MeshOverlay, SVGRenderer,
  ThemeProvider, themes, headless, hooks, animations, SkillNode,
  SkillTreeAnnouncer).
- `tsconfig.json`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `c329774`, verificada
empíricamente en clone independente)**.

### MASTER §38 (literal)

```ts
// @yggdrasil-forge/react/server (RSC-safe):
export { SkillTreeStatic, computeLayout, serializeForClient }

// @yggdrasil-forge/react ('use client'):
export { SkillTree, useSkillTree, ThemeProvider }
```

**Polo tanto 7.9 entrega exactamente eses 3 elementos no entry
`/server`**. **`SkillTreeStatic`** + **`computeLayout`** (re-exportado
do core) + **`serializeForClient`** (función nova).

### Verificación empírica T0.2 do director (script tsx)

```bash
$ pnpm exec tsx /tmp/check-ssr.mjs
JSON roundtrip OK; state.nodes keys: []
Round-trip preserved treeDef.nodes count: 2
Tras unlock: nodes keys: [ 'a' ]
Tras unlock: a.state = unlocked
```

**Confirmado**:
- `TreeDef` e `TreeState` son **JSON-safe** (cero Date, Map, Set, ou
  outros non-serializables).
- `TreeState.nodes` é **sparse** (consistente con 7.5 L1; nodos só
  aparecen cando son modificados).

### `getServerSnapshot` vs `getSnapshot` (verificado en StateStore.ts)

```ts
getSnapshot(): TreeState {
  return this.treeState
}

getServerSnapshot(): TreeState {
  return this.treeState   // ← idéntico actualmente
}
```

**Funcionalmente idénticos no estado actual do core**. Polo tanto
**cero risco de tearing nin hydration mismatch** con o uso actual
de `getSnapshot` como 3º param en useSyncExternalStore (precedente
desde 7.2). **A divergencia futura é posible** se o core engade
non-determinismo a `getSnapshot` (e.g., Date.now no metadata), o que
xustificaría usar `getServerSnapshot` no 3º param. **Migración
DIFERIDA** a hixiene MASTER post-Fase 7 (cero risco actual; modificar
5 ficheiros agora introduce risco innecesario).

### Decisión arquitectónica: SkillTreeStatic SEN SVGRenderer

**SVGRenderer.tsx ten `'use client'`** desde 7.4 (usa useTheme +
useId). **Polo tanto NON é importable desde RSC**.

**SkillTreeStatic** non usa SVGRenderer. En vez:
- Renderiza inline o `<svg>` con `className="yf-skill-tree"`,
  `viewBox` calculado, `role="img"`, `aria-label="Skill tree"`.
- **Cero `<style>` interno** (cero CSS vars, cero animacións — modo
  headless puro). O consumidor que queira estilos en SSR debe
  inxectar CSS externo (vía `<head>`).
- Importa `MeshOverlay`, `SkillEdge`, `SkillNode` (todos compoñentes
  puros sen `'use client'`) directamente.
- Importa `computeLayout` + `createDefaultLayoutRegistry` (funcións
  puras) para o layout.
- Importa `buildViewBox` de `svg-helpers` (función pura).

**Cero modificación dos compoñentes importados**.

### Decisión sobre `serializeForClient`

API:
```ts
function serializeForClient(treeDef: TreeDef, state?: TreeState): string
```

Devolve `JSON.stringify({ treeDef, state: state ?? null })` con
**escape de `<` → `\u003c`** e **`>` → `\u003e`** (patrón estándar
Next.js/Remix para inxección segura dentro de `<script>`).

**Razón do escape**: evita XSS se o resultado se inxecta directamente
como `<script>{result}</script>`. Sen escape, un treeDef con
`label: '</script><script>alert(1)</script>'` poderia romper o tag
e inxectar código malicioso.

**Cero escape de outros caracteres** (JSON.stringify xa escape `"`,
`\`, etc.).

### Estado scaffold tras 7.8

```
packages/react/src/
├── animations.ts                  (cero modif)
├── SVGRenderer.tsx                (cero modif)
├── theme-types.ts                 (cero modif)
├── themes/minimal.ts              (cero modif)
├── ThemeProvider.tsx              (cero modif)
├── SkillTreeWithDefaultTheme.tsx  (cero modif)
├── SkillTree.tsx                  (cero modif)
├── SkillNode.tsx                  (cero modif)
├── SkillEdge.tsx                  (cero modif)
├── MeshOverlay.tsx                (cero modif)
├── SkillTreeAnnouncer.tsx         (cero modif)
├── svg-helpers.ts                 (cero modif)
├── createDefaultLayoutRegistry.ts (cero modif)
├── SkillTreeStatic.tsx            (NOVO en 7.9)
├── serializeForClient.ts          (NOVO en 7.9)
├── server.ts                      (NOVO entry point en 7.9)
├── headless.ts                    (cero modif)
├── index.ts                       (cero modif)
└── hooks/                         (cero modif)
```

### Exports actuais en `package.json` (verificado)

```json
"exports": {
  ".": { ... },
  "./headless": { ... },
  "./package.json": "./package.json"
}
```

Engadir `"./server"` análogo a `"./headless"`.

### Tsup entries actuais

`entry: ['src/index.ts', 'src/headless.ts']`. **Engadir `'src/server.ts'`**.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `c329774` (prefers-reduced-motion 7.8).
- 1523 core + 60 common + 193 storage + 78 react = ~1854 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- 7 compoñentes públicos + 1 wrapper interno + 4 hooks + 4 módulos
  internos + 2 entry points (root + /headless).
- Cobertura post-7.8: 92.9 / 92.63 / 84.78 / 93.79.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` un **terceiro entry point
`/server`** (RSC-safe) que expón **`SkillTreeStatic`** (compoñente
React funcional puro sen hooks que renderiza estaticamente con
`treeDef + state` opcional; cero `'use client'`, cero `<style>`
interno, cero SVGRenderer dependency), **`computeLayout`**
(re-exportado do core), e **`serializeForClient(treeDef, state?)`**
(función pura que devolve JSON con escape de `<`/`>` para inxección
segura en `<script>` tags). **Cero modificación de calquera compoñente
ou test existente** salvo `package.json` (engadir `./server` a
exports) e `tsup.config.ts` (engadir `src/server.ts` a entry).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/SkillTreeStatic.tsx` (~110 liñas).
- `packages/react/src/serializeForClient.ts` (~35 liñas).
- `packages/react/src/server.ts` (~25 liñas; barrel/entry point).
- `packages/react/__tests__/SkillTreeStatic.test.tsx` (~140 liñas;
  ~6 tests).
- `packages/react/__tests__/serializeForClient.test.ts` (~75 liñas;
  ~5 tests).
- `packages/react/__tests__/server-entry.test.ts` (~60 liñas; ~3 tests).
- `.changeset/ssr-rsc.md` (NOVO).

**MODIFICADOS**:
- `packages/react/package.json` (engadir `./server` a exports).
- `packages/react/tsup.config.ts` (engadir `'src/server.ts'` a entry).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de**:
- Calquera outro ficheiro en `packages/react/src/` ou
  `packages/react/__tests__/`.
- `packages/react/tsconfig.json`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — `SkillTreeStatic.tsx` (FIXADO)

```tsx
// packages/react/src/SkillTreeStatic.tsx
// ── INICIO: SkillTreeStatic ──
// Compoñente público RSC-safe que renderiza unha árbore de habilidades
// estaticamente. Cero hooks, cero 'use client', cero <style> interno
// (modo headless puro). Pensado para SSR + React Server Components.
//
// Diferenzas chave fronte ao SkillTree do entry root:
//   - Cero subscrición a engine (toma treeDef + state directos).
//   - Cero hooks (useSyncExternalStore, useMemo, useId, useContext).
//   - Cero <style> inxectado (cero CSS vars). O consumidor SSR é
//     responsable de inxectar CSS externo se require estilos.
//   - Cero onClick / onKeyDown handlers (cero interactividade ata
//     hidratación; se queres interactividade, usa SkillTree client).
//
// **Estilos en SSR**: o consumidor pode incluir un stylesheet externo
// que use as mesmas classes públicas (.yf-skill-node, .yf-skill-edge,
// .yf-mesh-overlay) + data-attributes (data-state, data-layout, etc.)
// que xa son contrato estable desde 7.2-7.6.

import { type JSX } from 'react'
import {
  type TreeDef,
  type TreeState,
  type LayoutEngineRegistry,
  computeLayout,
} from '@yggdrasil-forge/core'
import { SkillNode } from './SkillNode.js'
import { SkillEdge } from './SkillEdge.js'
import { MeshOverlay } from './MeshOverlay.js'
import { buildViewBox } from './svg-helpers.js'
import { createDefaultLayoutRegistry } from './createDefaultLayoutRegistry.js'

export interface SkillTreeStaticProps {
  /** Definición da árbore (estructura de nodos + edges + layout). */
  readonly treeDef: TreeDef

  /**
   * Estado actual da árbore. Se non se pasa, asume estado inicial
   * (sparse: cero nodos no Record; todos visualmente como 'locked').
   */
  readonly state?: TreeState

  /** Padding ao redor do viewBox. Default 16. */
  readonly padding?: number

  /**
   * Layout registry opcional. Se non se pasa, usa default
   * (Identity + Radial + Tree).
   */
  readonly layoutRegistry?: LayoutEngineRegistry
}

/**
 * Renderiza estaticamente unha árbore de habilidades como SVG. RSC-safe
 * (cero hooks, cero 'use client'). Cero estilos automáticos (modo
 * headless puro; o consumidor inxecta CSS externo se require estilos
 * en SSR).
 *
 * @example
 * ```tsx
 * // En Next.js App Router (server component):
 * import { SkillTreeStatic } from '@yggdrasil-forge/react/server'
 *
 * export default async function Page() {
 *   const treeDef = await loadTreeDef()
 *   return <SkillTreeStatic treeDef={treeDef} />
 * }
 * ```
 */
export function SkillTreeStatic({
  treeDef,
  state,
  padding = 16,
  layoutRegistry,
}: SkillTreeStaticProps): JSX.Element {
  const registry = layoutRegistry ?? createDefaultLayoutRegistry()
  const layoutResult = computeLayout(treeDef, registry)

  if (!layoutResult.ok) {
    return (
      <svg
        className="yf-skill-tree yf-skill-tree--error"
        data-error={layoutResult.error.code}
        viewBox={buildViewBox(undefined, padding)}
        role="img"
        aria-label="Skill tree (layout error)"
      />
    )
  }

  const {
    nodes: nodePositions,
    edges: edgePaths,
    bounds,
    mesh,
  } = layoutResult.value
  const effectiveState: TreeState = state ?? {
    nodes: {},
    budget: { resources: {} },
  }

  // Constrúe un Map<edgeId, EdgeDef> para lookup rápido.
  const edgeMap = new Map<string, (typeof treeDef.edges)[number]>()
  for (const e of treeDef.edges) edgeMap.set(e.id, e)

  return (
    <svg
      className="yf-skill-tree"
      data-layout={layoutResult.value.layoutType}
      viewBox={buildViewBox(bounds, padding)}
      role="img"
      aria-label="Skill tree"
    >
      <MeshOverlay {...(mesh !== undefined && { mesh })} />
      <g className="yf-skill-edges">
        {[...edgePaths.entries()].map(([edgeId, path]) => {
          const edge = edgeMap.get(edgeId)
          /* v8 ignore next 1 -- defensivo: edgePaths vén de computeLayout sobre treeDef.edges */
          if (edge === undefined) return null
          return (
            <SkillEdge key={edgeId} edgeId={edgeId} edge={edge} path={path} />
          )
        })}
      </g>
      <g className="yf-skill-nodes">
        {treeDef.nodes.map((node) => {
          const position = nodePositions.get(node.id)
          /* v8 ignore next 1 -- defensivo: computeLayout produce posicións para tódolos treeDef.nodes */
          if (position === undefined) return null
          return (
            <SkillNode
              key={node.id}
              node={node}
              instance={effectiveState.nodes[node.id]}
              position={position}
            />
          )
        })}
      </g>
    </svg>
  )
}
// ── FIN: SkillTreeStatic ──
```

**Decisións clave**:
- **Cero `'use client'`** (compoñente puro).
- **Cero hooks** (useMemo, useId, useContext, useState, useEffect, etc.).
- **Cero `onClick`/`onKeyDown`** (modo estático puro).
- **Computa layout inline** vía `computeLayout` (función pura
  síncrona).
- **`createDefaultLayoutRegistry`** é función pura sen hooks
  (verificado empíricamente: cero import de react).
- **Default state vacío**: `{ nodes: {}, budget: { resources: {} } }`.
  Coherente coa estrutura mínima dun `TreeState`. Iso fai que tódolos
  nodos rendericen como 'locked' (sen instance correspondente).
- **Importa SkillNode, SkillEdge, MeshOverlay**: confirmados sen
  `'use client'` (compoñentes puros desde 7.2/7.3).
- **Importa buildViewBox**: confirmado sen `'use client'` (svg-helpers
  é módulo puro).
- **Cero modificación dos imports** (todos os ficheiros importados
  seguen como están).

### 5.3 — `serializeForClient.ts` (FIXADO)

```ts
// packages/react/src/serializeForClient.ts
// ── INICIO: serializeForClient ──
import type { TreeDef, TreeState } from '@yggdrasil-forge/core'

/**
 * Serializa un par `treeDef + state?` como string JSON co escape de
 * `<` e `>` para inxección segura dentro de `<script>` tags HTML.
 *
 * **Patrón estándar industria** (Next.js, Remix, etc.): o cliente
 * hidrata vía:
 * ```html
 * <script id="ygg-data" type="application/json">{ ... }</script>
 * <script>
 *   const data = JSON.parse(document.getElementById('ygg-data').textContent)
 *   const engine = new TreeEngine(data.treeDef)
 *   // ... aplicar data.state se require ...
 * </script>
 * ```
 *
 * O escape de `<` evita que un treeDef.label malicioso con valor
 * \`</script><script>alert(1)</script>\` rompa o tag e inxecte
 * código.
 *
 * @returns String JSON co formato `{"treeDef":..., "state": ... }`
 * con `<` → `\u003c` e `>` → `\u003e`.
 *
 * @example
 * ```tsx
 * import { serializeForClient } from '@yggdrasil-forge/react/server'
 *
 * function ServerPage() {
 *   const treeDef = await loadTreeDef()
 *   const json = serializeForClient(treeDef)
 *   return (
 *     <>
 *       <SkillTreeStatic treeDef={treeDef} />
 *       <script id="ygg-data" type="application/json"
 *               dangerouslySetInnerHTML={{ __html: json }} />
 *     </>
 *   )
 * }
 * ```
 */
export function serializeForClient(
  treeDef: TreeDef,
  state?: TreeState,
): string {
  const json = JSON.stringify({ treeDef, state: state ?? null })
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}
// ── FIN: serializeForClient ──
```

**Decisións**:
- **Función pura síncrona**. Cero hooks, cero React imports.
- **Escape mínimo**: `<` e `>` (suficiente para `<script>` injection
  prevention). Cero escape de `'`, `"`, `&` (JSON.stringify xa escape
  `"` correctamente; `&` non é necesario en contexto JSON).
- **`state ?? null`**: explícito `null` cando state non se pasa, para
  que o cliente saiba diferenciar entre "non hai estado" vs
  "non se pasou".
- **Cero verificación de input** (asume treeDef + state válidos; é
  responsabilidade do consumidor). Se hai problemas serializing,
  JSON.stringify lanza naturalmente.

### 5.4 — `server.ts` entry point (FIXADO)

```ts
// packages/react/src/server.ts
// ── INICIO: server entry point ──
// Entry point RSC-safe (React Server Components). Re-exporta os
// elementos seguros para usar dende server components ou SSR puro:
//
// - **SkillTreeStatic**: compoñente sen hooks que renderiza
//   estaticamente.
// - **computeLayout**: función pura do core (sin reactividade nin
//   IO).
// - **serializeForClient**: utility para serializar datos para
//   hidratación cliente.
//
// **NON re-exporta** (todos require 'use client' ou son client-only):
//   - SkillTree, SkillTreeWithDefaultTheme (root entry)
//   - ThemeProvider, useTheme (theme-aware)
//   - SkillTreeAnnouncer (require useEffect)
//   - SVGRenderer (require useTheme + useId)
//   - useSkillTree, useNodeState, useNodeSelector, useStat (hooks)
//   - minimal, Theme (tipos relacionados con cliente)
//
// O consumidor que require esas pezas debe importalas desde
// '@yggdrasil-forge/react' (root) ou '@yggdrasil-forge/react/headless'.

export { SkillTreeStatic } from './SkillTreeStatic.js'
export type { SkillTreeStaticProps } from './SkillTreeStatic.js'

export { computeLayout } from '@yggdrasil-forge/core'

export { serializeForClient } from './serializeForClient.js'
// ── FIN: server entry point ──
```

**NON re-exportar**: SkillNode, SkillEdge, MeshOverlay están sen
`'use client'` (compoñentes puros) **pero non son parte da API
"server" oficial** segundo MASTER §38. **Decisión do Director**:
mantemos /server **estrictamente coas 3 pezas prescritas no MASTER**;
se algún consumidor require SkillNode standalone en SSR, importa
desde `/headless`.

### 5.5 — `package.json` exports

Engadir tras `"./headless"`:
```json
"./server": {
  "types": "./dist/server.d.ts",
  "import": "./dist/server.js",
  "require": "./dist/server.cjs"
}
```

### 5.6 — `tsup.config.ts`

Cambiar `entry`:
```ts
entry: ['src/index.ts', 'src/headless.ts', 'src/server.ts'],
```

**Cero outras modificacións**.

### 5.7 — Cero modificación de outros ficheiros

**Garantía dura**. Especialmente:
- **SkillTree.tsx, SkillTreeWithDefaultTheme.tsx, ThemeProvider.tsx,
  SVGRenderer.tsx, SkillTreeAnnouncer.tsx, hooks/***: cero cambio.
  **Aínda non se migra a `getServerSnapshot.bind`** (anotado como
  débeda para hixiene MASTER post-Fase 7; cero risco actual porque
  `getServerSnapshot === getSnapshot` empíricamente).
- **SkillNode, SkillEdge, MeshOverlay, svg-helpers, animations,
  createDefaultLayoutRegistry, theme-types, themes/minimal,
  headless.ts, index.ts**: cero cambio.
- **Tódolos tests existentes (78)**: cero cambio.

### 5.8 — Tests prescritos (~14 totais)

**`SkillTreeStatic.test.tsx`** (~6 tests, NOVO):

1. **Renderiza SVG válido con renderToString** (SSR-safe): cero
   throw, output contén `class="yf-skill-tree"`.
2. **renderToString con state undefined**: cero throw; tódolos nodos
   rendericen co default (data-state="locked").
3. **renderToString con state cunha entrada**: o nodo con instance
   ten data-state correspondente.
4. **renderToString con RadialLayout produce mesh**:
   container contén `yf-mesh-overlay`.
5. **renderToString con layout unknown produce error mode**:
   container contén `yf-skill-tree--error` e `data-error`.
6. **renderToString con custom layoutRegistry**: usa o registry
   pasado en lugar do default.

**`serializeForClient.test.ts`** (~5 tests, NOVO):

7. **Devolve JSON válido (parseable)**: `JSON.parse(...)` non lanza.
8. **Inclúe treeDef e state**: parsed object ten as 2 propiedades.
9. **state undefined → state: null no output**.
10. **Escape de `<`**: `treeDef` con label conteñendo `<` produce
    `\u003c` no output.
11. **Escape de `>`**: similar.

**`server-entry.test.ts`** (~3 tests, NOVO):

12. **`/server` exporta SkillTreeStatic, computeLayout,
    serializeForClient** (dynamic import + property check).
13. **`/server` NON exporta SkillTree, ThemeProvider, hooks** (verificar
    que esas propiedades son `undefined`).
14. **`/server` SkillTreeStatic é unha función React (typeof
    'function')**.

**Total: ~14 tests novos**. Post-7.9 esperado: 78 + 14 = **~92 tests**.

### 5.9 — Cobertura prescrita

- **SkillTreeStatic.tsx**: **100/100/100/100** (peza pura ben
  testable). 2 v8 ignores prescritos en ramas defensivas (edgeMap +
  position).
- **serializeForClient.ts**: **100/100/100/100**.
- **server.ts**: **100/100/100/100** (re-exports triviais).
- **Resto sen cambio respecto a 7.8**:
  - SVGRenderer.tsx: 93.75/91.3 (mantén).
  - SkillNode.tsx: 100/100 (resolto en 7.7).
  - svg-helpers.ts: 92.59/83.33 (mantén).
  - SkillTreeWithDefaultTheme.tsx: 50/100/0/50 (artefacto v8).
  - SkillTreeAnnouncer.tsx: 72.72/60/50/72.72 (débeda 7.7).
  - headless.ts: 0/0/0/0 (artefacto similar).
  - Resto: 100/100/100/100.

### 5.10 — Helpers de tests recomendados

Reutilizar `makeMinimalTreeDef` xa probado:

```ts
function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [{ id: 'a-b', source: 'a', target: 'b', type: 'dependency' }],
    layout: { type: 'custom' },
    ...overrides,
  }
}
```

**Para test de RadialLayout**: usar overrides `{ layout: { type:
'radial', radius: 100 } }` (radius é requerido; lección 7.3
recordada).

### 5.11 — Test counts esperados post-7.9

- **react**: 78 (previo) + ~14 (novos) = **~92 tests**.
- **core, common, storage**: intactos.

### 5.12 — Build verificación

```bash
pnpm --filter @yggdrasil-forge/react build
# Esperado: 3 entry points producidos
#   dist/index.{js,cjs,d.ts,d.cts}
#   dist/headless.{js,cjs,d.ts,d.cts}
#   dist/server.{js,cjs,d.ts,d.cts}
```

**Verificar dist/server.js NON contén `'use client'` directives**
(verificable con grep):
```bash
grep "'use client'" packages/react/dist/server.js
# esperado: cero matches (todo o exportado é RSC-safe)
```

Se hai algún match, o tsup probablemente bundleou un compoñente con
'use client' por mistake. **ESCALAR**.

### 5.13 — Patrón de import en tests

Os tests poden importar **directamente desde paths relativos** dentro
do paquete (`../src/server.js`), evitando depender do resolution
do package.json exports durante tests. **Pero**: o test 12 de
server-entry.test.ts **debería importar via path absoluto**
(`@yggdrasil-forge/react/server`) para verificar empíricamente que
o exports field do package.json está correcto. **Decisión flexible**:
o executor pode usar o patrón que mellor lle funcione coa
configuración actual de vitest (probable que sexa import relativo
para evitar problemas de resolution).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `SkillTreeStatic` compoñente | React FC puro | SkillTreeStatic.tsx | ~110 |
| `serializeForClient` función | TS function | serializeForClient.ts | ~35 |
| `server.ts` entry point | TS re-exports | server.ts | ~25 |
| package.json exports `./server` | JSON edit | package.json | +6 |
| tsup entry array | TS edit | tsup.config.ts | +1 |
| Tests SkillTreeStatic | describe block | SkillTreeStatic.test.tsx | ~140 |
| Tests serializeForClient | describe block | serializeForClient.test.ts | ~75 |
| Tests server entry | describe block | server-entry.test.ts | ~60 |

**Total estimado**: ~170 liñas de código + ~275 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/SkillTreeStatic.tsx` (NOVO)
- `packages/react/src/serializeForClient.ts` (NOVO)
- `packages/react/src/server.ts` (NOVO)
- `packages/react/__tests__/SkillTreeStatic.test.tsx` (NOVO)
- `packages/react/__tests__/serializeForClient.test.ts` (NOVO)
- `packages/react/__tests__/server-entry.test.ts` (NOVO)
- `packages/react/package.json` (MODIFICADO: +exports./server)
- `packages/react/tsup.config.ts` (MODIFICADO: +entry server)
- `.changeset/ssr-rsc.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 10 ficheiros tocados** (6 NOVOS + 2 MODIFICADOS infra + 2
housekeeping).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/react/src/` ou `packages/react/__tests__/`.
- `packages/react/tsconfig.json`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx`. **Cero `'use client'`** en SkillTreeStatic.tsx,
serializeForClient.ts, server.ts (todos RSC-safe).

Tests de SkillTreeStatic: con **renderToString** principalmente
(verifica SSR-safety real). Tests de serializeForClient: `.ts` puro
sen DOM.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en `SkillTreeStatic`, `serializeForClient`, e nos
re-exports do server.ts.

**Marcadores**: `// ── INICIO: <peza> ──` / `// ── FIN: ──`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar **calquera ficheiro existente** de `packages/react/src/`
  ou `packages/react/__tests__/` (incluíndo SkillTree, hooks/*,
  SVGRenderer, etc.).
- ❌ Migrar `getSnapshot` a `getServerSnapshot` nos hooks ou
  SkillTree (DIFERIDO a hixiene MASTER post-Fase 7).
- ❌ Engadir `'use client'` a SkillTreeStatic.tsx, serializeForClient.ts,
  ou server.ts.
- ❌ Usar hooks en SkillTreeStatic (useMemo, useId, useContext,
  useState, useEffect).
- ❌ Importar SVGRenderer, ThemeProvider, SkillTreeWithDefaultTheme,
  SkillTreeAnnouncer en SkillTreeStatic.tsx ou server.ts.
- ❌ Re-exportar pezas client-only en `/server` (cero SkillTree,
  ThemeProvider, hooks, etc.).
- ❌ Engadir `<style>` interno en SkillTreeStatic.
- ❌ Engadir interactividade (onClick, onKeyDown) en SkillTreeStatic.
- ❌ Engadir deps de npm.
- ❌ Usar `!` non-null assertions (TS).
- ❌ Engadir Date.now() / Math.random() (cero non-determinismo).
- ❌ Engadir acceso a window, document, navigator, localStorage,
  ou outras APIs DOM (rompería SSR).
- ❌ Mobile/touch — 7.10.
- ❌ Error boundaries — 7.11.
- ❌ Tests visuais — 7.12.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa (baseline) + lección 7.5 L1

**T0.1** — `git status` limpo. `git log -1` mostra `c329774` como HEAD.

**T0.2** — **APIs verificadas + scripts de comportamento runtime**:

```bash
# Verificar getServerSnapshot existe en TreeEngine:
grep -n "getServerSnapshot" packages/core/src/engine/TreeEngine.ts
# esperado: liña 411

# Verificar JSON-safety de TreeDef + TreeState (script tsx):
cat > /tmp/check-ssr.mjs <<'EOF'
import { TreeEngine } from '/home/.../packages/core/src/index.ts'
// (script de §2 do briefing)
EOF
pnpm exec tsx /tmp/check-ssr.mjs
# esperado: roundtrip OK, sparse nodes confirmado

# Verificar que createDefaultLayoutRegistry non importa react:
grep "from 'react'" packages/react/src/createDefaultLayoutRegistry.ts
# esperado: cero matches

# Verificar que SkillNode/SkillEdge/MeshOverlay non teñen 'use client':
grep "'use client'" packages/react/src/SkillNode.tsx packages/react/src/SkillEdge.tsx packages/react/src/MeshOverlay.tsx
# esperado: cero matches
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 78 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear serializeForClient.ts

Crear `packages/react/src/serializeForClient.ts` segundo §5.3 literal.

### T2 — Crear SkillTreeStatic.tsx

Crear `packages/react/src/SkillTreeStatic.tsx` segundo §5.2 literal.

**Cero `'use client'`** na primeira liña.

### T3 — Crear server.ts entry point

Crear `packages/react/src/server.ts` segundo §5.4 literal.

### T4 — Modificar package.json

Engadir `./server` a exports segundo §5.5.

### T5 — Modificar tsup.config.ts

Engadir `'src/server.ts'` a entry array segundo §5.6.

### T6 — Verificación intermedia (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 78 tests pasando
pnpm --filter @yggdrasil-forge/react build
# Verificar 3 entry points:
ls packages/react/dist/server.{js,cjs,d.ts,d.cts}
# Verificar cero 'use client' en dist/server.js:
grep "'use client'" packages/react/dist/server.js
# esperado: cero matches
```

**Tódolos 78 tests previos deben pasar intactos**. Se algún falla
→ **ESCALAR**.

### T7 — Crear tests novos

Implementar segundo §5.8:
- `__tests__/SkillTreeStatic.test.tsx` (~6 tests).
- `__tests__/serializeForClient.test.ts` (~5 tests).
- `__tests__/server-entry.test.ts` (~3 tests).

### T8 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~92 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   SkillTreeStatic.tsx: 100/100/100/100
#   serializeForClient.ts: 100/100/100/100
#   server.ts: 100/100/100/100
#   Resto: sen regresión respecto a 7.8
```

### T9 — Lint + Format + Grep + Changeset + CHANGELOG + commit + push

```bash
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/SkillTreeStatic.tsx \
  packages/react/src/serializeForClient.ts \
  packages/react/src/server.ts \
  packages/react/__tests__/SkillTreeStatic.test.tsx \
  packages/react/__tests__/serializeForClient.test.ts \
  packages/react/__tests__/server-entry.test.ts
```

`.changeset/ssr-rsc.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add SSR + RSC compatibility via /server entry point (sub-phase 7.9)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: **terceiro entry point `/server`**
  (RSC-safe) para uso desde React Server Components ou SSR puro.
  Exporta 3 pezas seguras (cero `'use client'`, cero hooks, cero
  acceso DOM):
  - **`SkillTreeStatic`**: compoñente React funcional puro que
    renderiza estaticamente unha árbore dado `treeDef` + `state`
    opcional. Props: `treeDef`, `state?`, `padding?` (default 16),
    `layoutRegistry?` (default Identity+Radial+Tree). Cero
    interactividade, cero `<style>` interno. O consumidor inxecta
    CSS externo se require estilos en SSR (selectors públicos
    estables: `.yf-skill-tree`, `.yf-skill-node`, `.yf-skill-edge`,
    `.yf-mesh-overlay`, `[data-state="..."]`, etc.).
  - **`computeLayout`**: re-exportado do `@yggdrasil-forge/core`
    (función pura síncrona).
  - **`serializeForClient(treeDef, state?)`**: función pura que
    devolve string JSON con escape de `<`/`>` para inxección segura
    dentro de `<script>` tags. Patrón estándar Next.js/Remix.
- `package.json` exports inclúe agora `./server` (xunto con `.` e
  `./headless`).
- `tsup.config.ts` produce 3 entry points: `dist/index.*`,
  `dist/headless.*`, `dist/server.*`.

### Note
- Sub-fase 7.9 NOVENA da Fase 7 (12 sub-fases totais).
- **Comportamiento empírico do core (verificado en T0.2 do director)**:
  `TreeEngine.getServerSnapshot()` é funcionalmente idéntico a
  `getSnapshot()` no estado actual; ambos devolven `this.treeState`.
  Polo tanto **cero risco de hydration mismatch ou tearing** con o
  uso actual de `getSnapshot` como 3º param de `useSyncExternalStore`
  en hooks/* e SkillTree.tsx (precedente desde 7.2). **Migración a
  `getServerSnapshot.bind(engine)` DIFERIDA a hixiene MASTER
  post-Fase 7** (mellora opcional para preparar futuras divergencias).
- **Selectores e data-attributes públicos** mantéñense estables
  como contrato (usables polos consumidores SSR para CSS externo).
- **SkillTreeStatic NON usa SVGRenderer** (que ten `'use client'`
  desde 7.4). En vez, renderiza inline o `<svg>` cos compoñentes
  puros `SkillNode`, `SkillEdge`, `MeshOverlay`. **Cero `<style>`
  inxectado** (modo headless puro; consistente con MASTER §493).
- **`serializeForClient` escape**: `<` → `\u003c`, `>` → `\u003e`.
  Cero escape adicional (JSON.stringify xa escape `"`, `\`, etc.).
- **DIFERIDOS**: 7.10 (mobile/touch), 7.11 (error boundaries),
  7.12 (tests visuais).
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **Cero modificación de calquera compoñente, módulo, hook, ou test
  existente** en packages/react/. Os 78 tests previos pasan intactos.
```

Commit Conventional:
`feat(react): add SSR + RSC compatibility via /server entry point (sub-phase 7.9)`

Push directo a `origin/main` (base `c329774`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.9 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base c329774)
✅ SkillTreeStatic compoñente RSC-safe (cero 'use client', cero hooks)
✅ serializeForClient función pura con escape de </> para <script>
✅ Terceiro entry point /server (cero 'use client' no dist/server.js)
✅ package.json exports + tsup.config.ts: 3 entry points (root,
   /headless, /server)
✅ T0.2 verificación empírica: getServerSnapshot existe, JSON
   roundtrip OK, sparse nodes confirmado, createDefaultLayoutRegistry
   cero import react, SkillNode/SkillEdge/MeshOverlay cero 'use client'
✅ T6 verificación intermedia: 78 tests previos pasan intactos
✅ CERO modificación de SkillTree, SkillNode, SkillEdge, MeshOverlay,
   SVGRenderer, ThemeProvider, SkillTreeWithDefaultTheme,
   SkillTreeAnnouncer, svg-helpers, createDefaultLayoutRegistry,
   theme-types, themes/minimal, animations, hooks/*, headless.ts,
   index.ts
✅ CERO modificación de tests existentes
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ Tests: <N> pasan en react (<delta> novos, 78 previos intactos)
   - 6 SkillTreeStatic (renderToString, state, mesh, error, registry)
   - 5 serializeForClient (JSON, escape <, escape >, state null)
   - 3 server-entry (exporta 3, non exporta client-only, function)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - SkillTreeStatic.tsx: 100/100/100/100
   - serializeForClient.ts: 100/100/100/100
   - server.ts: 100/100/100/100
   - Resto: sen regresión respecto a 7.8
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok (3 entry points producidos)
   - dist/index.{js,cjs,d.ts,d.cts}
   - dist/headless.{js,cjs,d.ts,d.cts}
   - dist/server.{js,cjs,d.ts,d.cts}
✅ grep "'use client'" packages/react/dist/server.js: cero matches
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.9 NOVENA da Fase 7.
   - 3 sub-fases pendentes (7.10, 7.11, 7.12).
   - getServerSnapshot funcionalmente idéntico a getSnapshot;
     migración nos hooks/SkillTree DIFERIDA a hixiene MASTER
     post-Fase 7 (cero risco actual).
   - SkillTreeStatic cero <style> (modo headless puro); consumidor
     inxecta CSS externo para SSR estilizado.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 10 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.10 (mobile/touch input).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.9. Novena sub-fase da Fase 7. Engade terceiro
entry point `/server` con SkillTreeStatic + computeLayout +
serializeForClient (RSC-safe). Risco arquitectónico MEDIO: 3 pezas
novas independentes (cero modificación de pezas existentes) + 2
modificacións de infra (package.json + tsup.config.ts). Cero deps
novas. Cero ErrorCodes. Cobertura prescrita 100/100/100/100 nas 3
pezas novas. Anota explícitamente a débeda de getSnapshot →
getServerSnapshot como mellora opcional para hixiene MASTER post-Fase
7. Calquera dúbida → ESCALAR.*

*Lección 7.5 L1 estendida aplicada rigorosamente: script tsx en T0.2
verifica empíricamente JSON-safety + sparse nodes + getServerSnapshot
existence + ausencia de 'use client' en compoñentes puros. Lección
7.3 sobre fixtures verificada: makeMinimalTreeDef reutilizado intacto;
RadialLayout require radius (verificable empíricamente antes de usar
nos tests).*
