# BRIEFING — SUB-FASE 7.4 de Yggdrasil Forge

> Pega este documento no chat executor.
> **CUARTA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react`:
> 1. **`Theme` interface** + **`minimal: Theme`** const (tokens
>    documentados).
> 2. **`ThemeProvider`** + `useTheme` hook interno + ThemeContext.
> 3. **`SVGRenderer` refactorizado** para consumir o tema e inxectar
>    CSS variables + `<style>` interno scopeado.
> 4. **Root entry SkillTree envolto en ThemeProvider(minimal)
>    automáticamente** (autoload). Implementado vía wrapper
>    `SkillTreeWithDefaultTheme`.
> 5. **Novo entry point `/headless`**: re-exporta os mesmos
>    compoñentes pero o `SkillTree` exportado é o **core sen wrapper**
>    (cero tema autoload).
>
> **Tema `oberon` DIFERIDO** ao paquete `@yggdrasil-forge/themes`
> (sub-fase futura; MASTER §493 sitúa `oberon` neste paquete externo).
> **Cero modificación de SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx,
> MeshOverlay.tsx, svg-helpers.ts, createDefaultLayoutRegistry.ts**
> (garantía: tests 7.2 e 7.3 pasan intactos).
>
> Hooks customizados (7.5), animacións (7.6), keyboard/ARIA (7.7),
> prefers-reduced-motion (7.8), SSR/RSC entry points (7.9),
> mobile/touch (7.10), error boundaries (7.11), tests visuais (7.12)
> DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente Fases 6 + 7.1 + 7.2 + 7.3).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Lección 7.2 L1
estendida (verificación empírica de literais + campos requeridos en
fixtures + recurrencia 7.3)**: o director verificou empíricamente
todos os literais e fixtures en T0 (ver §2). Calquera desvío empírico
en T0.2 → **ESCALAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.4 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.4 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique
(precedente 7.3 mesh).

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas
verificablemente inalcanzables anótanse con `/* v8 ignore next */ +
xustificación`. **Cero regresión de cobertura tolerada** respecto á
baseline post-7.3.

**0.12 — Lección 7.2 L1 ESTENDIDA**: T0.2 inclúe **grep mandatorio**
para literais E **verificación de campos requeridos** dos types
(NodeType, EdgeType, RadialLayoutConfig.radius, etc.). Reutilizar
`makeMinimalTreeDef` fixture xa probado en 7.2/7.3 (ver §2).

**0.13 — GARANTÍA DE INMUTABILIDADE DE PEZAS 7.2/7.3**: SkillTree.tsx,
SkillNode.tsx, SkillEdge.tsx, MeshOverlay.tsx, svg-helpers.ts,
createDefaultLayoutRegistry.ts **NON se modifican**. **Cero modificación
dos seus tests** (smoke.test.tsx, SkillTree.test.tsx, MeshOverlay.test.tsx).
Único refactor: **SVGRenderer.tsx** (consume useTheme + useId, inxecta
CSS vars + `<style>` interno cando theme != null). SVGRenderer.test.tsx
**pode** require pequenas modificacións para tests existentes que asuman
ausencia de `<style>` — **PERO** asercións por queryselector existentes
deberían pasar intactas (verificación obrigatoria en T7).

---

## 1. IDENTIFICACIÓN

Sub-fase **7.4** de Yggdrasil Forge. **CUARTA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (5 grupos)**:

**Grupo A — Tipos e tema default**:
1. **`Theme` interface** (tokens públicos estables).
2. **`minimal: Theme`** const exportada (tema default razoable).

**Grupo B — Context + Provider**:
3. **`ThemeContext`** (default value: `null`).
4. **`ThemeProvider`** compoñente público.
5. **`useTheme()`** hook interno (cero exposto publicamente).

**Grupo C — Integración no rendering**:
6. **`SVGRenderer.tsx` refactorizado** para consumir useTheme + useId
   e inxectar CSS variables + `<style>` interno scopeado por
   `data-theme-id`.

**Grupo D — Autoload + headless entry point**:
7. **`SkillTreeWithDefaultTheme`** (NOVO ficheiro): wrapper que envolve
   `<SkillTree>` co `<ThemeProvider theme={minimal}>`. Exportado **como
   `SkillTree`** desde `index.ts`.
8. **`src/headless.ts`** (NOVO entry point): re-exporta `SkillTree as
   SkillTree` directamente desde `./SkillTree.js` (cero wrapper). Cero
   re-export de ThemeProvider/minimal/Theme.

**Grupo E — Tests**:
9. **`ThemeProvider.test.tsx`** (NOVO): ~6 tests.
10. **`themes.test.ts`** (NOVO): ~3 tests para validar minimal.
11. **`SVGRenderer.test.tsx`** ampliado: engadir ~4 tests para
    integración con tema (cero modificación dos 5 tests existentes).
12. **`headless.test.tsx`** (NOVO): ~3 tests verifican que o entry
    point /headless devolve compoñentes sen autoload.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- `SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`, `MeshOverlay.tsx`,
  `svg-helpers.ts`, `createDefaultLayoutRegistry.ts`.
- `smoke.test.tsx`, `SkillTree.test.tsx`, `MeshOverlay.test.tsx`.

**CERO ErrorCodes novos.** Cero modificación de `packages/common/`.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `d2f2296`, verificada empíricamente
en clone independente)**.

### Spec MASTER §493 (decisión clave)

```text
"@yggdrasil-forge/react é headless por defecto pero carga tema
'minimal' automaticamente. Power users importan de /headless para
0 estilos."
```

Polo tanto:
- **Root entry**: autoload de minimal.
- **`/headless` entry**: cero estilos.
- **Tema `oberon`**: vive en `@yggdrasil-forge/themes` (paquete
  separado existente como scaffold). **DIFERIDO** a sub-fase futura
  do paquete themes.

### Estado verificado de packages/react/ post-7.3

```
packages/react/
├── src/
│   ├── SkillTree.tsx              (138 liñas; cero modificación)
│   ├── SkillNode.tsx              (89 liñas; cero modificación)
│   ├── SkillEdge.tsx              (~50 liñas; cero modificación)
│   ├── MeshOverlay.tsx            (~70 liñas; cero modificación)
│   ├── SVGRenderer.tsx            (~90 liñas; MODIFICADO en 7.4)
│   ├── svg-helpers.ts             (62 liñas; cero modificación)
│   ├── createDefaultLayoutRegistry.ts (cero modificación)
│   └── index.ts                   (~21 liñas; MODIFICADO)
├── __tests__/
│   ├── smoke.test.tsx             (3 tests; cero modificación)
│   ├── SkillTree.test.tsx         (15 tests; cero modificación)
│   ├── MeshOverlay.test.tsx       (6 tests; cero modificación)
│   └── SVGRenderer.test.tsx       (5 tests; ENGADIR ~4 tests novos)
├── package.json                   (MODIFICADO: exports + dual entry)
├── tsconfig.json                  (cero modificación)
├── tsup.config.ts                 (MODIFICADO: 2 entries)
└── vitest.config.ts               (cero modificación)
```

### Fixture verificado (post-7.3)

`makeMinimalTreeDef` xa probado en tests existentes:

```ts
function makeMinimalTreeDef(overrides?: Partial<TreeDef>): TreeDef {
  return {
    id: 'test-tree',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'Test',
    nodes: [
      { id: 'a', type: 'small', label: 'A' },  // NodeType verificado
      { id: 'b', type: 'small', label: 'B' },
    ],
    edges: [
      { id: 'a-b', source: 'a', target: 'b', type: 'dependency' }  // EdgeType verificado
    ],
    layout: { type: 'custom' },  // IdentityLayout.type = 'custom' verificado
    ...overrides,
  }
}
```

**Reutilizar** sen modificación.

### Asercións de tests existentes (verificadas)

`expect(svg.getAttribute('class')).toBe('yf-skill-tree')` — **exacto
.toBe()**. Polo tanto **a aplicación do tema NON pode engadir classes
adicionais ao `<svg>`** raíz. Debe aplicarse vía `style` inline + `<style>`
interno. **Atributo `data-theme-id`** non choca con asercións existentes
(cero asercion sobre ese atributo).

### `'use client'` directives post-7.4

- **`SkillTree.tsx`**: mantén `'use client'` xa existente.
- **`ThemeProvider.tsx`**: novo, **engadir `'use client'`** (usa
  createContext + hooks).
- **`SVGRenderer.tsx`**: pasa de compoñente puro a consumir
  useTheme + useId. **Engadir `'use client'`** ao principio.
- **`SkillTreeWithDefaultTheme.tsx`**: usa ThemeProvider. **Engadir
  `'use client'`**.
- **`SkillNode.tsx`, `SkillEdge.tsx`, `MeshOverlay.tsx`**: mantén
  pureza (cero `'use client'`).
- **`themes/minimal.ts`, `theme-types.ts`**: módulos de tipos/datos;
  cero directiva.

### Hooks nativos de React 18+ usados

- `useTheme()` (helper interno): wrappea `useContext(ThemeContext)`.
- `useId()` en SVGRenderer: para xenerar themeId único por instance
  (scope dos selectors CSS dentro do `<style>` interno). useId é
  SSR-safe (consistent entre server e client).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `d2f2296` (MeshOverlay+SVGRenderer 7.3).
- 1523 core + 60 common + 193 storage + 29 react = ~1805 monorepo
  limpo (+ paquetes scaffold con 1 smoke test cada un).
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- packages/react/: 5 compoñentes públicos + 2 módulos internos.
- Cobertura post-7.3: MeshOverlay/SVGRenderer/SkillTree/SkillEdge/createDefaultLayoutRegistry 100/100/100/100,
  SkillNode 73.33/52.17/75/69.23 (mantén; 7.7), svg-helpers
  92.59/83.33/100/100 (mantén; rama cubic non cuberta naturalmente).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react`: (a) tipos de tema (`Theme`
interface + tokens estables); (b) tema default `minimal` exportado;
(c) `ThemeProvider` + `useTheme` hook interno + ThemeContext con
default null; (d) refactor de `SVGRenderer` para consumir useTheme +
useId e inxectar CSS variables + `<style>` interno scopeado por
`data-theme-id` (cero modificación de classes do svg raíz, polo tanto
cero rotura de tests existentes); (e) wrapper `SkillTreeWithDefaultTheme`
exportado como `SkillTree` desde root entry (autoload de minimal); (f)
novo entry point `/headless` que re-exporta os compoñentes sen
wrapper (cero tema). **Tema `oberon` DIFERIDO** ao paquete
`@yggdrasil-forge/themes`. **Cero modificación de SkillTree.tsx,
SkillNode.tsx, SkillEdge.tsx, MeshOverlay.tsx, svg-helpers.ts,
createDefaultLayoutRegistry.ts ou os seus tests**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/theme-types.ts` (~50 liñas; interfaces).
- `packages/react/src/themes/minimal.ts` (~50 liñas).
- `packages/react/src/ThemeProvider.tsx` (~70 liñas).
- `packages/react/src/SkillTreeWithDefaultTheme.tsx` (~25 liñas).
- `packages/react/src/headless.ts` (~20 liñas).
- `packages/react/__tests__/ThemeProvider.test.tsx` (~120 liñas; ~6 tests).
- `packages/react/__tests__/themes.test.ts` (~50 liñas; ~3 tests).
- `packages/react/__tests__/headless.test.tsx` (~70 liñas; ~3 tests).
- `.changeset/theme-provider.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/SVGRenderer.tsx` (consume useTheme + useId,
  inxecta CSS vars + `<style>`; engade `'use client'`).
- `packages/react/__tests__/SVGRenderer.test.tsx` (engadir ~4 tests;
  cero modificación dos 5 existentes).
- `packages/react/src/index.ts` (re-organizar exports: SkillTree =
  wrapper, expose ThemeProvider + minimal + Theme; expose SkillTreeCore
  como nome alternativo para uso interno).
- `packages/react/package.json` (engadir `"./headless"` a `exports`).
- `packages/react/tsup.config.ts` (engadir `'src/headless.ts'` a
  entry).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de**:
- `packages/react/src/SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `svg-helpers.ts`, `createDefaultLayoutRegistry.ts`.
- `packages/react/__tests__/smoke.test.tsx`, `SkillTree.test.tsx`,
  `MeshOverlay.test.tsx`.
- `packages/react/tsconfig.json`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros 14
  paquetes scaffold.

### 5.2 — `Theme` interface (FIXADA)

```ts
// packages/react/src/theme-types.ts
// ── INICIO: Theme types ──

/**
 * Tema do `@yggdrasil-forge/react`. Define tokens (cores, sizes,
 * fontes) que se aplican aos compoñentes via CSS variables inxectadas
 * polo `SVGRenderer` cando hai un `ThemeProvider` ascendente.
 *
 * Os tokens son **contrato público estable**: novos campos pódense
 * engadir en sub-fases futuras como opcionais; eliminacións son
 * breaking change e require bump major.
 */
export interface Theme {
  /**
   * Cores do tema. Valores son CSS color strings (hex, rgb, hsl,
   * named, var()).
   */
  readonly colors: ThemeColors

  /** Sizes (radios, anchos, font sizes en unidades do layout). */
  readonly sizes: ThemeSizes
}

export interface ThemeColors {
  /** Cor de fondo do svg (cero, fondo transparente). */
  readonly background?: string

  /** Cor do texto (labels, progress). */
  readonly text: string

  /** Cor de fondo do nodo cando state='locked'. */
  readonly nodeLocked: string

  /** Cor de fondo do nodo cando state='unlockable'. */
  readonly nodeUnlockable: string

  /** Cor de fondo do nodo cando state='unlocked'. */
  readonly nodeUnlocked: string

  /** Cor de fondo do nodo cando state='maxed'. */
  readonly nodeMaxed: string

  /** Cor de fondo do nodo cando state='in_progress'. */
  readonly nodeInProgress: string

  /** Cor do borde do nodo (todos os estados). */
  readonly nodeStroke: string

  /** Cor das liñas dos edges. */
  readonly edge: string

  /** Cor dos elementos do mesh overlay (line, circle, polygon). */
  readonly mesh: string
}

export interface ThemeSizes {
  /** Stroke width das liñas (edges, mesh, node stroke). Default 2. */
  readonly strokeWidth: number

  /** Font size para labels dos nodos. */
  readonly fontSize: number

  /** Font size para texto de progress (porcentaxe). */
  readonly fontSizeSmall: number
}
// ── FIN: Theme types ──
```

**Estados verificados empíricamente** (en T0.2 do executor):
- NodeState union: 'locked' | 'unlockable' | 'unlocked' | 'maxed' |
  'in_progress'. Verificar mediante:
  `grep -B 1 -A 8 "^export type NodeState" packages/core/src/types/node.ts`

### 5.3 — `minimal: Theme` const (FIXADA)

```ts
// packages/react/src/themes/minimal.ts
// ── INICIO: minimal theme ──
import type { Theme } from '../theme-types.js'

/**
 * Tema "minimal": estética minimalista neutra para uso por defecto
 * cando o consumidor non especifica un tema vía `ThemeProvider`.
 *
 * Aplica cores grises e contraste razoable. Cero adornos. Útil para
 * primeira impresión e testing.
 *
 * Power users que queiran cero estilos importan desde
 * `@yggdrasil-forge/react/headless`.
 */
export const minimal: Theme = {
  colors: {
    text: '#222222',
    nodeLocked: '#cccccc',
    nodeUnlockable: '#e8e8e8',
    nodeUnlocked: '#4a90e2',
    nodeMaxed: '#f5a623',
    nodeInProgress: '#7ed321',
    nodeStroke: '#555555',
    edge: '#999999',
    mesh: '#dddddd',
  },
  sizes: {
    strokeWidth: 2,
    fontSize: 14,
    fontSizeSmall: 11,
  },
}
// ── FIN: minimal theme ──
```

**Cero `background`** (omitido intencionalmente; fondo transparente
por default; consumidor pode aplicar via CSS).

### 5.4 — `ThemeProvider` (FIXADO)

```tsx
// packages/react/src/ThemeProvider.tsx
'use client'

// ── INICIO: ThemeProvider ──
import { createContext, useContext, type JSX, type ReactNode } from 'react'
import type { Theme } from './theme-types.js'

/**
 * Context que distribúe o tema activo aos compoñentes descendentes.
 *
 * **Default value `null`** indica "modo headless" (cero estilos
 * aplicados). O entry point principal de `@yggdrasil-forge/react`
 * envolve automáticamente `SkillTree` cun `ThemeProvider theme={minimal}`,
 * polo que o consumidor casual recibe o tema por defecto. Power
 * users importan desde `/headless` para cero autoload.
 *
 * @internal — Exportado para uso interno por `SVGRenderer` (vía
 * `useTheme`) e polo wrapper de root entry. NON exportado como API
 * pública porque o consumidor debería usar `ThemeProvider` (a
 * abstración).
 */
export const ThemeContext = createContext<Theme | null>(null)

export interface ThemeProviderProps {
  /** Tema a distribuír aos descendentes. */
  readonly theme: Theme

  /** Compoñentes filhos (tipicamente `<SkillTree>` ou similar). */
  readonly children?: ReactNode
}

/**
 * Provee un tema aos compoñentes descendentes. Sobrescribe calquera
 * tema ascendente. Cero animación de transición.
 *
 * Uso típico:
 * ```tsx
 * <ThemeProvider theme={oberon}>
 *   <SkillTree engine={engine} />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps): JSX.Element {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

/**
 * Hook interno que devolve o tema activo ou `null` (cero tema).
 *
 * @internal — Non exportado publicamente. Uso reservado a `SVGRenderer`.
 */
export function useTheme(): Theme | null {
  return useContext(ThemeContext)
}
// ── FIN: ThemeProvider ──
```

### 5.5 — `SVGRenderer.tsx` refactor

**ANTES** (estado actual 7.3): compoñente puro, cero hooks, recibe
todos os datos como props.

**DESPOIS** (7.4): consume `useTheme()` + `useId()`. Inxecta CSS vars
+ `<style>` interno cando theme != null.

```tsx
'use client'   // ← engadir (require hooks)

// ── INICIO: SVGRenderer ──
import { type CSSProperties, type JSX, type ReactNode, useId } from 'react'
import type { Bounds } from '@yggdrasil-forge/core'
import { buildViewBox } from './svg-helpers.js'
import { useTheme } from './ThemeProvider.js'
import type { Theme } from './theme-types.js'

export interface SVGRendererProps {
  readonly bounds?: Bounds
  readonly padding?: number
  readonly layoutType?: string
  readonly error?: string
  readonly ariaLabel?: string
  readonly children?: ReactNode
}

export function SVGRenderer({
  bounds,
  padding = 16,
  layoutType,
  error,
  ariaLabel,
  children,
}: SVGRendererProps): JSX.Element {
  const theme = useTheme()
  const themeId = useId()
  const viewBox = buildViewBox(bounds, padding)

  if (error !== undefined) {
    return (
      <svg
        className="yf-skill-tree yf-skill-tree--error"
        data-error={error}
        viewBox={viewBox}
        role="img"
        aria-label={ariaLabel ?? 'Skill tree (layout error)'}
      />
    )
  }

  const themeStyle = theme !== null ? buildThemeStyle(theme) : undefined
  const themeRulesCSS = theme !== null ? buildThemeRules(theme, themeId) : null

  return (
    <svg
      className="yf-skill-tree"
      {...(layoutType !== undefined && { 'data-layout': layoutType })}
      {...(theme !== null && { 'data-theme-id': themeId })}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel ?? 'Skill tree'}
      {...(themeStyle !== undefined && { style: themeStyle })}
    >
      {themeRulesCSS !== null && <style>{themeRulesCSS}</style>}
      {children}
    </svg>
  )
}

/**
 * Constrúe o objeto `style` con CSS variables a partir do tema.
 */
function buildThemeStyle(theme: Theme): CSSProperties {
  const style: Record<string, string | number> = {
    '--yf-color-text': theme.colors.text,
    '--yf-color-node-locked': theme.colors.nodeLocked,
    '--yf-color-node-unlockable': theme.colors.nodeUnlockable,
    '--yf-color-node-unlocked': theme.colors.nodeUnlocked,
    '--yf-color-node-maxed': theme.colors.nodeMaxed,
    '--yf-color-node-in-progress': theme.colors.nodeInProgress,
    '--yf-color-node-stroke': theme.colors.nodeStroke,
    '--yf-color-edge': theme.colors.edge,
    '--yf-color-mesh': theme.colors.mesh,
    '--yf-stroke-width': theme.sizes.strokeWidth,
    '--yf-font-size': theme.sizes.fontSize,
    '--yf-font-size-small': theme.sizes.fontSizeSmall,
  }
  if (theme.colors.background !== undefined) {
    style['--yf-color-background'] = theme.colors.background
  }
  return style as CSSProperties
}

/**
 * Constrúe as regras CSS internas scopeadas via `[data-theme-id="..."]`
 * para evitar interferencia entre múltiples SkillTree na mesma páxina.
 */
function buildThemeRules(theme: Theme, themeId: string): string {
  const sel = `[data-theme-id="${themeId}"]`
  const bgRule = theme.colors.background !== undefined
    ? `${sel} { background: var(--yf-color-background); }\n`
    : ''
  return (
    `${bgRule}` +
    `${sel} .yf-skill-node__circle { fill: var(--yf-color-node-locked); stroke: var(--yf-color-node-stroke); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-skill-node[data-state="unlockable"] .yf-skill-node__circle { fill: var(--yf-color-node-unlockable); }\n` +
    `${sel} .yf-skill-node[data-state="unlocked"] .yf-skill-node__circle { fill: var(--yf-color-node-unlocked); }\n` +
    `${sel} .yf-skill-node[data-state="maxed"] .yf-skill-node__circle { fill: var(--yf-color-node-maxed); }\n` +
    `${sel} .yf-skill-node[data-state="in_progress"] .yf-skill-node__circle { fill: var(--yf-color-node-in-progress); }\n` +
    `${sel} .yf-skill-node__label { font-size: var(--yf-font-size); fill: var(--yf-color-text); }\n` +
    `${sel} .yf-skill-node__progress { font-size: var(--yf-font-size-small); fill: var(--yf-color-text); }\n` +
    `${sel} .yf-skill-edge { stroke: var(--yf-color-edge); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-mesh-overlay__line { stroke: var(--yf-color-mesh); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-mesh-overlay__circle { stroke: var(--yf-color-mesh); stroke-width: var(--yf-stroke-width); }\n` +
    `${sel} .yf-mesh-overlay__polygon { stroke: var(--yf-color-mesh); stroke-width: var(--yf-stroke-width); }`
  )
}
// ── FIN: SVGRenderer ──
```

**Decisións nesta peza**:
- **Compoñente NON puro** (consume hooks). Engade `'use client'`.
- **`useId()`** xenera ID único e estable por instance. **SSR-safe**.
- **CSS vars vía `style` inline** + **`<style>` element interno**.
  Ambos scopeados via `data-theme-id`.
- **Cero clase adicional ao `<svg>`** raíz (preserva
  `expect(svg.getAttribute('class')).toBe('yf-skill-tree')` dos tests
  existentes).
- **Spread condicional para `data-theme-id`** (exactOptionalPropertyTypes).
- **`background` opcional**: só engade a regra CSS se está definido.
- **Modo error**: cero aplicación de tema (cero CSS vars, cero
  `<style>`). Coherente con estado de erro.

**Limitación documentada**: en SSR sen RSC, useId garante consistencia
server↔cliente. **PERO**: o themeId será **distinto entre diferentes
instances** de SkillTree na mesma páxina (intencional). **Cero
interferencia entre instances** grazas ao scope `[data-theme-id="..."]`.

### 5.6 — `SkillTreeWithDefaultTheme` (FIXADO)

```tsx
// packages/react/src/SkillTreeWithDefaultTheme.tsx
'use client'

// ── INICIO: SkillTreeWithDefaultTheme ──
import { type JSX } from 'react'
import { SkillTree as SkillTreeCore, type SkillTreeProps } from './SkillTree.js'
import { ThemeProvider } from './ThemeProvider.js'
import { minimal } from './themes/minimal.js'

/**
 * Wrapper sobre `SkillTree` que aplica automáticamente o tema
 * `minimal` se non hai un `ThemeProvider` ascendente. Usado polo
 * root entry de `@yggdrasil-forge/react` para que consumidores
 * casuales obteñan estilos por defecto.
 *
 * Power users que queiran cero estilos importan desde
 * `@yggdrasil-forge/react/headless`.
 *
 * Se o consumidor envolve `<ThemeProvider theme={X}><SkillTree .../>
 * </ThemeProvider>`, o tema X sobrescribe minimal (precedencia
 * normal de React Context).
 */
export function SkillTreeWithDefaultTheme(props: SkillTreeProps): JSX.Element {
  return (
    <ThemeProvider theme={minimal}>
      <SkillTreeCore {...props} />
    </ThemeProvider>
  )
}
// ── FIN: SkillTreeWithDefaultTheme ──
```

**Nota crítica**: o wrapper envolve **incondicional** en ThemeProvider.
Iso non é "se non hai un Provider ascendente"; en realidade **sempre**
hai ThemeProvider co tema minimal. Se o consumidor pon
`<ThemeProvider theme={oberon}><SkillTree/></ThemeProvider>` por fora,
o **interior** ten un segundo ThemeProvider(minimal) que **sobrescribe**
oberon. **Iso é problema potencial!**

**Resolución arquitectónica**: o `<ThemeProvider>` interno sempre
gaña. Polo tanto **para usar un tema distinto de minimal cando o
consumidor importa do root entry, debe usar a peza directamente**:

```tsx
// Patrón A — autoload minimal (default):
import { SkillTree } from '@yggdrasil-forge/react'
<SkillTree engine={engine} />   // tema minimal

// Patrón B — autoload con tema custom (require headless + ThemeProvider explícito):
import { SkillTree } from '@yggdrasil-forge/react/headless'
import { ThemeProvider } from '@yggdrasil-forge/react'
import { oberon } from '@yggdrasil-forge/themes'

<ThemeProvider theme={oberon}>
  <SkillTree engine={engine} />
</ThemeProvider>
```

**Documentar** esta convención no CHANGELOG e no JSDoc do
SkillTreeWithDefaultTheme.

### 5.7 — `headless.ts` entry point (FIXADO)

```ts
// packages/react/src/headless.ts
// ── INICIO: headless entry point ──
// Entry point alternativo para power users que queiran cero estilos
// por defecto. Re-exporta os compoñentes core sen aplicar autoload
// de tema.
//
// Diferenza fronte ao root entry:
// - `SkillTree`: exporta o core directamente (cero ThemeProvider
//   wrapper, cero autoload de minimal).
// - **NON** se re-exportan: `ThemeProvider`, `Theme`, `minimal`.
//   O consumidor headless decide o tema explícitamente (importando
//   desde root) ou non aplica ningún (modo verdadeiramente headless).

export { SkillTree } from './SkillTree.js'
export type { SkillTreeProps } from './SkillTree.js'

export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'

export { MeshOverlay } from './MeshOverlay.js'
export type { MeshOverlayProps } from './MeshOverlay.js'

export { SVGRenderer } from './SVGRenderer.js'
export type { SVGRendererProps } from './SVGRenderer.js'
// ── FIN: headless entry point ──
```

**NON re-exportar** desde headless: ThemeProvider, Theme,
ThemeProviderProps, minimal. (Reservados ao root entry; se consumidor
headless require, importa de root explícitamente).

### 5.8 — `index.ts` actualizado

```ts
// packages/react/src/index.ts
// ── INICIO: @yggdrasil-forge/react ──
// Entry point principal. Inclúe SkillTree con autoload do tema
// 'minimal' por defecto. Para cero estilos, importar desde
// `@yggdrasil-forge/react/headless`.

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'

// SkillTree exportado como wrapper con autoload de tema minimal.
// O core SkillTree (sen wrapper) está dispoñible vía /headless.
export { SkillTreeWithDefaultTheme as SkillTree } from './SkillTreeWithDefaultTheme.js'
export type { SkillTreeProps } from './SkillTree.js'

// Compoñentes individuais (cero diferenza fronte a /headless).
export { SkillNode } from './SkillNode.js'
export type { SkillNodeProps } from './SkillNode.js'

export { SkillEdge } from './SkillEdge.js'
export type { SkillEdgeProps } from './SkillEdge.js'

export { MeshOverlay } from './MeshOverlay.js'
export type { MeshOverlayProps } from './MeshOverlay.js'

export { SVGRenderer } from './SVGRenderer.js'
export type { SVGRendererProps } from './SVGRenderer.js'

// Tema infra (só dispoñible desde root entry).
export { ThemeProvider } from './ThemeProvider.js'
export type { ThemeProviderProps } from './ThemeProvider.js'
export type { Theme, ThemeColors, ThemeSizes } from './theme-types.js'
export { minimal } from './themes/minimal.js'
// ── FIN: @yggdrasil-forge/react ──
```

**Cambio clave**: `SkillTree` exportado é o **wrapper**, NON
SkillTreeCore. Tests existentes que `import { SkillTree } from
'../src/index.js'` reciben **automáticamente** o wrapper con tema
minimal. **Asercións básicas seguen pasando** (verificación
empírica en T7).

### 5.9 — `package.json` exports

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./headless": {
    "types": "./dist/headless.d.ts",
    "import": "./dist/headless.js",
    "require": "./dist/headless.cjs"
  },
  "./package.json": "./package.json"
}
```

### 5.10 — `tsup.config.ts`

Cambiar `entry`:
```ts
entry: ['src/index.ts', 'src/headless.ts'],
```

**Cero outras modificacións** (`external`, `dts`, etc. quédanse igual).

### 5.11 — Cero modificación de tests existentes

**Garantía**:
- `smoke.test.tsx` (3 tests): cero modificación.
- `SkillTree.test.tsx` (15 tests): cero modificación. Tras o
  refactor, tests importan SkillTree **wrapper**. Asercións básicas
  (class, viewBox, data-*, role, aria, querySelectors) **pasan
  intactas**.
- `MeshOverlay.test.tsx` (6 tests): cero modificación.
- `SVGRenderer.test.tsx` (5 tests existentes): cero modificación.
  Os tests usan `<SVGRenderer ...>` **directamente sen
  `<ThemeProvider>`**, polo que `useTheme()` devolve null e cero CSS
  vars/`<style>` inxectados. Asercións pasan intactas.

**Se algún test existente falla** → **ESCALAR** (algo no refactor
cambiou comportamento observable; revisar diff).

### 5.12 — Tests prescritos (~16 totais)

**`ThemeProvider.test.tsx`** (~6 tests, NOVO):
1. ThemeProvider provee tema aos descendentes (usar render helper +
   compoñente test que chama useTheme).
2. useTheme sen Provider devolve null.
3. ThemeProvider aniñado: o interior gaña.
4. Cambio do prop `theme` actualiza descendentes.
5. ThemeContext exposto para uso interno (verificable importando
   ThemeContext directamente; cero asercion específica salvo que se
   pode importar).
6. ThemeProvider con `children` undefined renderiza cero contido (cero
   crash).

**`themes.test.ts`** (~3 tests, NOVO):
7. `minimal: Theme` ten os tokens requeridos (colors.text,
   nodeLocked, ..., sizes.strokeWidth, fontSize, fontSizeSmall).
8. minimal.colors.background é undefined (cero fondo).
9. minimal valores son CSS color strings válidos (verificable con
   regex básico ou simple type check).

**`SVGRenderer.test.tsx`** ampliado (~4 tests novos):
10. SVGRenderer **sen** Provider: cero CSS vars, cero `<style>`
    interno (verificable via `container.querySelector('style')` é
    null + cero `data-theme-id`).
11. SVGRenderer **con** Provider(minimal): inxecta CSS vars como
    `style` inline + `<style>` element como first child + atributo
    `data-theme-id`.
12. SVGRenderer en modo error **con** Provider: cero CSS vars, cero
    `<style>` (modo erro non aplica tema; comportamento prescrito).
13. SVGRenderer con dous instances na mesma páxina: `data-theme-id`
    son distintos (useId garante unicidade), pero ambos están
    presentes.

**`headless.test.tsx`** (~3 tests, NOVO):
14. Import desde headless entry: `SkillTree` é importable e renderiza
    sen `<style>` interno (cero autoload de minimal).
15. Headless entry **non** exporta `ThemeProvider`, `minimal`, `Theme`
    (verificable via dynamic import + check de propiedades).
16. Headless + ThemeProvider explícito: aplicar `<ThemeProvider
    theme={minimal}>` por fora dun SkillTree do headless si aplica o
    tema.

**Total: ~16 tests novos**. Baseline post-7.4 esperada: 29 + 16 = **~45 tests**.

### 5.13 — Cobertura prescrita

- **theme-types.ts**: 100/100/100/100 (peza trivial de tipos; cero
  código executable significativo).
- **themes/minimal.ts**: 100/100/100/100 (peza trivial: const único).
- **ThemeProvider.tsx**: 100/100/100/100 (3 elementos exportados, todos
  cubertos por tests).
- **SkillTreeWithDefaultTheme.tsx**: 100/100/100/100 (wrapper trivial).
- **SVGRenderer.tsx** (post-refactor): **100/100/100/100** (mantén
  baseline; engaden ramas de tema cubertas por tests 7.4).
- **headless.ts**: 100/100/100/100 (re-exports).
- **Resto sen cambio**: SkillTree 100, SkillNode 73.33/52.17 (mantén),
  SkillEdge 100, MeshOverlay 100, svg-helpers 92.59/83.33 (mantén),
  createDefaultLayoutRegistry 100.

### 5.14 — Garantía de inmutabilidade DOM nos tests existentes

**Verificación crítica T7**: tras o refactor, os 15 tests de
SkillTree.test.tsx **deben pasar intactos sen modificación**. **Se
algún falla**:
- **Posible causa 1**: o atributo `class` cambiou (engadiuse algo
  como `yf-theme-active`). **PROHIBIDO** (§5.5).
- **Posible causa 2**: a estrutura DOM cambia (engadiuse outro `<g>`
  envoltorio). **PROHIBIDO**.
- **Posible causa 3**: data-* attributes cambiaron. **PROHIBIDO**.

**Acción se algún rompe**: ESCALAR. Cero modificación dos tests
existentes permitida.

### 5.15 — Test counts esperados post-7.4

- **react**: 29 (previo) + 16 (novos) = **~45 tests**.
- **core, common, storage**: intactos.

### 5.16 — Locale 'gl' / convencións

Sen ErrorCodes novos, sen mensaxes localizadas novas, cero
modificación de packages/common/. Toda a lóxica de tema é UI-only.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `Theme` interface + types | TS module | theme-types.ts | ~50 |
| `minimal: Theme` const | TS module | themes/minimal.ts | ~50 |
| `ThemeProvider` + Context + useTheme | React FC + hook | ThemeProvider.tsx | ~70 |
| `SkillTreeWithDefaultTheme` wrapper | React FC | SkillTreeWithDefaultTheme.tsx | ~25 |
| `SVGRenderer` refactor (use hooks) | Edits | SVGRenderer.tsx | ~75 modif |
| `headless.ts` entry point | TS re-exports | headless.ts | ~20 |
| Index re-exports | Edits | src/index.ts | ~20 |
| package.json exports `./headless` | JSON edit | package.json | +6 |
| tsup entry array | TS edit | tsup.config.ts | +1 |
| Tests ThemeProvider | describe block | ThemeProvider.test.tsx | ~120 |
| Tests themes | describe block | themes.test.ts | ~50 |
| Tests SVGRenderer (ampliación) | engadir block | SVGRenderer.test.tsx | ~80 |
| Tests headless | describe block | headless.test.tsx | ~70 |

**Total estimado**: ~290 liñas de código + ~320 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/theme-types.ts` (NOVO)
- `packages/react/src/themes/minimal.ts` (NOVO)
- `packages/react/src/ThemeProvider.tsx` (NOVO)
- `packages/react/src/SkillTreeWithDefaultTheme.tsx` (NOVO)
- `packages/react/src/SVGRenderer.tsx` (MODIFICADO)
- `packages/react/src/headless.ts` (NOVO)
- `packages/react/src/index.ts` (MODIFICADO)
- `packages/react/__tests__/ThemeProvider.test.tsx` (NOVO)
- `packages/react/__tests__/themes.test.ts` (NOVO)
- `packages/react/__tests__/SVGRenderer.test.tsx` (MODIFICADO: +4 tests)
- `packages/react/__tests__/headless.test.tsx` (NOVO)
- `packages/react/package.json` (MODIFICADO: +exports./headless)
- `packages/react/tsup.config.ts` (MODIFICADO: +entry)
- `.changeset/theme-provider.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**NON deben aparecer cambios en**:
- `packages/react/src/SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `svg-helpers.ts`, `createDefaultLayoutRegistry.ts`.
- `packages/react/__tests__/smoke.test.tsx`, `SkillTree.test.tsx`,
  `MeshOverlay.test.tsx`.
- `packages/react/tsconfig.json`, `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros 14
  paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx`. 2 espazos, comilla simple, sen `;`, trailing commas,
máx 100 cols, UTF-8 LF. TS strict, cero `any`. NON desactives Biome.

**`'use client'`**: en ThemeProvider.tsx, SVGRenderer.tsx (engadir),
SkillTreeWithDefaultTheme.tsx. **Cero `'use client'`** en theme-types.ts,
themes/minimal.ts, headless.ts (re-exports sen lóxica).

**Cero non-null assertions `!`** (Biome compliance).

**CSS vars naming**: `--yf-color-<X>`, `--yf-stroke-width`,
`--yf-font-size`, `--yf-font-size-small`. **Contrato público estable**.

**Selectors CSS scopeados**: sempre `[data-theme-id="<themeId>"]` como
prefixo para evitar interferencia entre instances.

**Marcadores**: `// ── INICIO: <peza> ──` / `// ── FIN: <peza> ──`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar `SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `svg-helpers.ts`, `createDefaultLayoutRegistry.ts`.
- ❌ Modificar tests existentes (smoke, SkillTree, MeshOverlay).
- ❌ Engadir clase ao `<svg>` raíz (rompe asercion `.toBe('yf-skill-tree')`).
- ❌ Engadir tema `oberon` ou outros (vai en packages/themes/, sub-fase
  futura).
- ❌ Implementar hooks customizados (`useSkillTree`, `useNodeState`) — 7.5.
- ❌ Engadir animacións CSS — 7.6.
- ❌ Engadir keyboard navigation entre nodos — 7.7.
- ❌ Engadir SkillTreeErrorBoundary — 7.11.
- ❌ Engadir mobile/touch — 7.10.
- ❌ Engadir prefers-reduced-motion — 7.8.
- ❌ Crear entry points `/server` ou `/layouts/*` — 7.9.
- ❌ Engadir deps de npm (cero modificación de package.json deps,
  pnpm-workspace.yaml, pnpm-lock.yaml).
- ❌ Usar CSS-in-JS frameworks (emotion, styled-components, etc.).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir `'use client'` a theme-types.ts, themes/minimal.ts,
  headless.ts.
- ❌ Exportar `ThemeContext` ou `useTheme` publicamente desde index.ts
  (uso interno só; consumidor usa ThemeProvider).
- ❌ Re-exportar ThemeProvider/Theme/minimal desde headless.ts.
- ❌ Aplicar CSS rules sen scope `[data-theme-id="..."]` (require
  scope para múltiples instances).
- ❌ Engadir snapshot tests (frágiles, prohibidos no proxecto).
- ❌ Engadir Date.now() / Math.random() nos compoñentes.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T11)

### T0 — Verificación previa (baseline) + lección 7.2 L1 estendida

**T0.1** — `git status` limpo. `git log -1` mostra `d2f2296` como HEAD.

**T0.2** — **LITERAIS + FIXTURES VERIFICADOS**:

```bash
# NodeState union (para Theme.colors.node* tokens):
grep -B 1 -A 10 "^export type NodeState" packages/core/src/types/node.ts
# esperado: 'locked' | 'unlockable' | 'unlocked' | 'maxed' | 'in_progress'

# Reutilización do fixture comprobado en 7.2/7.3:
grep -A 12 "function makeMinimalTreeDef" packages/react/__tests__/SkillTree.test.tsx
# esperado: type='small', type='dependency', layout={type: 'custom'}

# Verificación de que SkillTree actual NON usa useTheme (cero modificación esperada):
grep "useTheme\|ThemeContext" packages/react/src/SkillTree.tsx
# esperado: cero matches

# Verificación de que SVGRenderer actual NON usa useTheme (refactor target):
grep "useTheme\|ThemeContext" packages/react/src/SVGRenderer.tsx
# esperado: cero matches
```

**T0.3** — Verificar baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 29 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear theme-types.ts

Crear `packages/react/src/theme-types.ts` segundo §5.2 literal.

### T2 — Crear themes/minimal.ts

Crear directorio `packages/react/src/themes/` + ficheiro `minimal.ts`
segundo §5.3 literal.

### T3 — Crear ThemeProvider.tsx

Crear `packages/react/src/ThemeProvider.tsx` segundo §5.4 literal.
**Engadir `'use client'`** como primeira liña.

### T4 — Refactorizar SVGRenderer.tsx

Substituír contido segundo §5.5 literal. **Engadir `'use client'`**
como primeira liña.

### T5 — Crear SkillTreeWithDefaultTheme.tsx

Crear segundo §5.6 literal. **Engadir `'use client'`**.

### T6 — Actualizar index.ts

Re-organizar exports segundo §5.8 literal.

### T7 — Verificación intermedia (CRÍTICA)

**Verificar que tests existentes pasan intactos**:

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 29 tests pasando
```

**Se algún test existente falla** → **ESCALAR** (algo no refactor
cambiou DOM observable).

### T8 — Crear headless.ts

Crear `packages/react/src/headless.ts` segundo §5.7 literal.

### T9 — Actualizar package.json + tsup.config.ts

**package.json** — engadir `"./headless"` a `exports` segundo §5.9.

**tsup.config.ts** — engadir `'src/headless.ts'` a `entry` array
segundo §5.10.

### T10 — Crear tests novos

Implementar segundo §5.12:
- `__tests__/ThemeProvider.test.tsx` (~6 tests).
- `__tests__/themes.test.ts` (~3 tests).
- `__tests__/SVGRenderer.test.tsx` engadir ~4 tests (cero modif
  dos 5 existentes).
- `__tests__/headless.test.tsx` (~3 tests).

### T11 — Verificación final + build + changeset + CHANGELOG + commit + push

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~45 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Targets segundo §5.13.
pnpm --filter @yggdrasil-forge/react build
# Verificar dual entry points:
#   dist/index.{js,cjs,d.ts}
#   dist/headless.{js,cjs,d.ts}
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/ packages/react/__tests__/
# esperado: cero matches reais
```

`.changeset/theme-provider.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add ThemeProvider + minimal theme + headless entry point (sub-phase 7.4)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: sistema de temas completo:
  - **`Theme` interface** + tipos auxiliares (`ThemeColors`, `ThemeSizes`).
    Tokens documentados como contrato público estable: cores por NodeState
    (locked, unlockable, unlocked, maxed, in_progress) + nodeStroke + edge
    + mesh + text + background (opcional); sizes (strokeWidth, fontSize,
    fontSizeSmall).
  - **`minimal: Theme`** const exportada: tema default minimalista neutro
    (cores grises, contraste razoable, cero adornos). Aplicado
    automáticamente cando se importa `SkillTree` desde o entry point
    principal.
  - **`ThemeProvider`** compoñente público que distribúe un tema aos
    descendentes via React Context. Pode aniñarse (interior gaña).
- **Refactor de SVGRenderer**: consume internamente `useTheme()` +
  `useId()`. Cando hai un tema activo, inxecta CSS variables como
  `style` inline no `<svg>` raíz + un `<style>` element interno con
  regras default. Selectors scopeados via `[data-theme-id="..."]` para
  evitar interferencia entre múltiples SkillTree na mesma páxina.
  Cero modificación de classes no `<svg>` raíz (tests previos pasan
  intactos).
- **Autoload do tema `minimal`** no entry point principal: `SkillTree`
  exportado desde `@yggdrasil-forge/react` é un wrapper
  (`SkillTreeWithDefaultTheme`) que envolve o core `SkillTree` cun
  `<ThemeProvider theme={minimal}>`. Consumidores casuais obteñen
  estilos por defecto sen acción adicional.
- **Novo entry point `/headless`**: `@yggdrasil-forge/react/headless`
  re-exporta os mesmos compoñentes (`SkillTree`, `SkillNode`,
  `SkillEdge`, `MeshOverlay`, `SVGRenderer`) **sen** o wrapper de
  autoload. Power users que queiran cero estilos importan desde
  aquí. **Non** re-exporta `ThemeProvider`, `Theme`, ou `minimal`
  (reservados ao root entry).
- Classes CSS adicionais como **contrato público estable** (uso por
  futuros temas externos en `@yggdrasil-forge/themes`):
  `[data-theme-id]`, `.yf-skill-node__circle`, `.yf-skill-node__label`,
  `.yf-skill-node__progress`, `.yf-skill-edge`,
  `.yf-mesh-overlay__line/circle/polygon`.
- CSS variables públicas (uso interno por SVGRenderer; útil para
  consumidores que queiran customizar parcialmente): `--yf-color-text`,
  `--yf-color-node-locked/unlockable/unlocked/maxed/in_progress`,
  `--yf-color-node-stroke`, `--yf-color-edge`, `--yf-color-mesh`,
  `--yf-stroke-width`, `--yf-font-size`, `--yf-font-size-small`,
  `--yf-color-background` (opcional).

### Note
- Sub-fase 7.4 CUARTA da Fase 6 (12 sub-fases totais).
- **DIFERIDO**: tema `oberon` (vive en `@yggdrasil-forge/themes`,
  paquete scaffold separado; sub-fase futura). MASTER §493 sitúa
  `oberon` neste paquete externo.
- **DIFERIDOS**: hooks customizados (7.5), animacións CSS (7.6),
  keyboard/ARIA (7.7), prefers-reduced-motion (7.8), SSR/RSC entry
  points (7.9), mobile/touch (7.10), error boundaries (7.11), tests
  visuais (7.12).
- **`SVGRenderer` deixa de ser compoñente puro**: agora consume
  hooks (useTheme + useId). Engadiuse `'use client'`. Mantén SSR-safe
  (useId é SSR-safe en React 18+).
- **`ThemeProvider`, `SVGRenderer`, `SkillTreeWithDefaultTheme`**
  todos teñen `'use client'`. SkillNode, SkillEdge, MeshOverlay
  manteñen pureza.
- **Convención sobre ThemeProvider externo + autoload**: o wrapper
  de root entry envolve **incondicional** en `<ThemeProvider
  theme={minimal}>`. Polo tanto, se o consumidor envolve por fora
  cun `<ThemeProvider theme={X}><SkillTree.../></ThemeProvider>` desde
  o root entry, o tema interno minimal sobrescribe X. **Patrón
  correcto para temas customs**: importar `SkillTree` desde `/headless`
  e envolver explicitamente.
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx,
  MeshOverlay.tsx, svg-helpers.ts, createDefaultLayoutRegistry.ts**
  ou os seus tests.
```

Commit Conventional:
`feat(react): add ThemeProvider + minimal theme + headless entry point (sub-phase 7.4)`

Push directo a `origin/main` (base `d2f2296`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.4 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base d2f2296)
✅ Theme interface + minimal tema entregados
✅ ThemeProvider + useTheme hook interno + ThemeContext
✅ SVGRenderer refactorizado (consume useTheme + useId)
✅ SkillTreeWithDefaultTheme wrapper (autoload minimal en root entry)
✅ Novo entry point /headless (re-exporta sen wrapper)
✅ CSS vars + <style> interno scopeado por [data-theme-id]
✅ Cero modificación de classes no <svg> raíz (tests previos pasan)
✅ T0.2 NodeState verificado: locked, unlockable, unlocked, maxed,
   in_progress (5 estados)
✅ T0.2 fixture makeMinimalTreeDef confirmado intacto
✅ T7 verificación intermedia: 29 tests previos pasan intactos
✅ CERO modificación de SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx,
   MeshOverlay.tsx, svg-helpers.ts, createDefaultLayoutRegistry.ts
✅ CERO modificación de tests existentes (smoke, SkillTree, MeshOverlay)
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas (cero package.json deps, lockfile,
   workspace catalog changes)
✅ CERO ErrorCodes novos
✅ Tests: <N> pasan en react (<delta> novos, 29 previos intactos)
   - 6 ThemeProvider
   - 3 themes (minimal validation)
   - 4 SVGRenderer integración tema (engadidos)
   - 3 headless entry point
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - theme-types.ts: 100/100/100/100
   - themes/minimal.ts: 100/100/100/100
   - ThemeProvider.tsx: 100/100/100/100
   - SkillTreeWithDefaultTheme.tsx: 100/100/100/100
   - SVGRenderer.tsx (post-refactor): 100/100/100/100
   - headless.ts: 100/100/100/100
   - svg-helpers.ts: 92.59/83.33 (sen cambios; 7.5+ cubrirase)
   - SkillNode.tsx: 73.33/52.17/75/69.23 (sen cambios; 7.7 cubrirase)
   - Resto: 100/100/100/100
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok con dual entry points
   - dist/index.{js,cjs,d.ts}
   - dist/headless.{js,cjs,d.ts}
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.4 CUARTA da Fase 7.
   - 8 sub-fases pendentes (7.5 a 7.12).
   - Tema oberon difírido a sub-fase do paquete @yggdrasil-forge/themes.
   - SVGRenderer deixa de ser puro (engadido 'use client'); mantén
     SSR-safe via useId.
   - Convención sobre ThemeProvider externo + autoload documentada
     en CHANGELOG.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 15 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.5 (hooks customizados: useSkillTree, useNodeState).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.4. Cuarta sub-fase da Fase 7. Primeira con CSS real
+ dual entry points. Risco arquitectónico MEDIO-ALTO (refactor de
SVGRenderer + autoload via wrapper + dual entry tsup config), pero ben
acoutado con garantía explícita de tests existentes intactos (T7
verificación intermedia obligatoria). Cero modificación de pezas 7.2/7.3
(salvo SVGRenderer). Cero deps novas. Cero ErrorCodes. Calquera dúbida
→ ESCALAR.*

*Lección 7.2 L1 ESTENDIDA aplicada rigorosamente: literais (NodeState),
fixtures (`makeMinimalTreeDef` reutilizado intacto), e verificación
de baselines (T0 + T7).*
