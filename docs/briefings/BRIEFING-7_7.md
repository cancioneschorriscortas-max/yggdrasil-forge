# BRIEFING — SUB-FASE 7.7 de Yggdrasil Forge

> Pega este documento no chat executor.
> **SÉTIMA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react`:
> 1. **`SkillTreeAnnouncer`** — compoñente público novo que renderiza
>    unha live region ARIA (`role="status"`, `aria-live="polite"`)
>    invisible, subscribe ao `engine.on('unlock')` e
>    `engine.on('lock')`, e anuncia cambios localizados (gl/es/en).
> 2. **Modificación de `SkillNode.tsx`** para mellorar a accesibilidade:
>    `aria-label` descritivo que incluí estado actual + label, e
>    tests novos que cobren os keyboard handlers (Enter/Space) e
>    `resolveLabel` fallback. **Iso resolve a débeda de cobertura
>    histórica de SkillNode** (73.33/52.17 → ≥95/≥85).
>
> **Cero modificación de** SkillTree, SkillEdge, MeshOverlay,
> SVGRenderer, ThemeProvider, SkillTreeWithDefaultTheme, svg-helpers,
> createDefaultLayoutRegistry, theme-types, themes/minimal, hooks/*,
> animations.ts **nin** dos seus tests.
>
> **DIFERIDOS**: arrow-key navigation 2D, focus management
> (auto-focus tras unlock), `jest-axe` en CI (sub-fase de hixiene CI
> futura), announcements para outros eventos (budgetChange,
> progressChange, respec, etc.), aria-pressed/aria-current. 7.8
> (prefers-reduced-motion), 7.9 (SSR/RSC), 7.10 (mobile/touch),
> 7.11 (error boundaries), 7.12 (tests visuais) DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. Lección 7.5 L1
(verificación empírica de comportamento runtime) aplicada en §2.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.7 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.7 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas reais con
xustificación. **MANDATO firme**: SkillNode.tsx debe chegar **a
≥95% Stmts / ≥85% Branch** tras este briefing (resolve débeda
histórica desde 7.2).

**0.12 — Strings multiline**: usar **single template literal con
backticks** en lugar de múltiples template literals + `+` (Biome
`noUselessConcat`; lección menor 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de
SkillTree.tsx, SkillEdge.tsx, MeshOverlay.tsx, SVGRenderer.tsx,
ThemeProvider.tsx, SkillTreeWithDefaultTheme.tsx, svg-helpers.ts,
createDefaultLayoutRegistry.ts, theme-types.ts, themes/minimal.ts,
hooks/*, animations.ts. **Único refactor**: SkillNode.tsx (peza 7.2;
mellora aria-label).

**Tódolos 63 tests existentes deben pasar intactos**.

**SkillNode.test.tsx NON existe** aínda; **NOVO ficheiro en 7.7**.
Os tests de SkillNode actualmente están **distribuídos** dentro de
SkillTree.test.tsx (compoñendo árbore enteira). **NON se modifican**
eses tests; engádense novos tests específicos en SkillNode.test.tsx.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.7** de Yggdrasil Forge. **SÉTIMA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (3 grupos)**:

**Grupo A — Compoñente público novo**:
1. **`SkillTreeAnnouncer`**: compoñente React que renderiza unha
   live region invisible e anuncia eventos de unlock/lock do engine
   con mensaxes localizadas. Props:
   - `engine: TreeEngine` (obligatorio).
   - `locale?: 'gl' | 'es' | 'en'` (default `'en'`).
   - `formatMessage?: (event: 'unlock' | 'lock', nodeId: string) =>
     string` (opcional; override de localización).

**Grupo B — Modificación de SkillNode**:
2. **`SkillNode.tsx`**: actualizar `aria-label` para incluír info
   de estado (e.g., "A — desbloqueable"). **Cero outras
   modificacións** (tabIndex, role, onClick, handleKeyDown manteñen
   o seu comportamento de 7.2).

**Grupo C — Tests**:
3. **`SkillNode.test.tsx`** (NOVO): ~6 tests que cubren:
   - aria-label inclúe estado.
   - keyDown Enter dispara onClick.
   - keyDown Space dispara onClick.
   - keyDown outra tecla (e.g., 'Escape') **non** dispara onClick.
   - resolveLabel fallback para LocalizedString con só locales non
     gl/es/en (e.g., `{ fr: 'X' }`).
   - resolveLabel fallback final a node.id (LocalizedString `{}`
     baleiro).
4. **`SkillTreeAnnouncer.test.tsx`** (NOVO): ~6 tests:
   - Renderiza live region invisible (role="status", aria-live).
   - Subscribe a engine.on('unlock') no mount.
   - Subscribe a engine.on('lock') no mount.
   - Cleanup (unsubscribe) no unmount.
   - Mensaxe gl (default 'en' pero pasa locale='gl').
   - `formatMessage` override.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- **Calquera test existente** (smoke, SkillTree, MeshOverlay,
  SVGRenderer, ThemeProvider, themes, headless, hooks, animations).
- `package.json` (cero deps novas), `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `2b4f8d3`, verificada
empíricamente en clone independente)**.

### TreeEngine.on() API (verificada en T0.2 do director)

```ts
// packages/core/src/engine/TreeEngine.ts liña 229-235
on<K extends EventName>(event: K, handler: EventMap[K]): Unsubscribe
off<K extends EventName>(event: K, handler: EventMap[K]): void
```

**EventMap** (en `packages/core/src/types/events.ts`):
```ts
interface EventMap {
  readonly unlock:        (nodeId: string, instance: NodeInstance) => void
  readonly lock:          (nodeId: string, instance: NodeInstance) => void
  readonly stateChange:   (nodeId: string, change: StateChange) => void
  readonly budgetChange:  (resourceId: string, oldAmount: number, newAmount: number) => void
  readonly statChange:    (statId: string, oldValue: number, newValue: number) => void   // NON emite aínda
  readonly progressChange:(nodeId: string, percent: number) => void
  readonly respec:        (nodeIds: readonly string[]) => void
  readonly buildLoaded:   (build: Build) => void
  readonly subtreeEntered:(subtreeId: string) => void
  readonly treeChanged:   (changes: readonly TreeChange[]) => void
}
```

**Decisión do Director sobre que anunciar en 7.7**:
- **Sí**: `unlock`, `lock`.
- **DIFERIDO**: `stateChange` (redundante con unlock/lock).
- **DIFERIDO**: `budgetChange`, `progressChange`, `respec`, `buildLoaded`,
  `subtreeEntered`, `treeChanged` (poderían anunciarse en sub-fases
  futuras; cero scope creep en 7.7).
- **NON aplicable**: `statChange` (cero emite aínda; documentado en
  events.ts).

### Cero dep nova de `@yggdrasil-forge/common`

`@yggdrasil-forge/common` exporta `resolveLocalized`, `Locale`,
`SUPPORTED_LOCALES`, etc. **Pero**: `packages/react/package.json` **NON
ten common como dependency** (verificado empíricamente).

**Decisión do Director**: **NON engadir common como dep en 7.7**.
Razóns:
- Mantén `packages/react` con dep única `@yggdrasil-forge/core`
  (simplicidade arquitectónica).
- As mensaxes do announcer son **inline** (map simple gl/es/en).
- Lóxica de resolución `LocalizedString` xa existe en SkillNode
  (`resolveLabel`); duplícase pequena lóxica similar no announcer
  para nodeId, **pero cero impacto significativo**.
- Sub-fase futura pode unificar engadindo common como dep.

### Locales por defecto

DEFAULT_LOCALE de common é `'en'`. **O Announcer usa `'en'` como
default** (consistente coa convención de common). O consumidor que
queira galego pasa explicitamente `locale="gl"`. **Documentar** que
o proxecto é galego-first **pero** o announcer segue a convención
default de common.

### SkillNode.tsx estado actual (verificado)

```tsx
// Liñas 30-43 (post-7.2, cero cambios desde então):
const handleClick =
  onClick !== undefined
    ? (_e: MouseEvent<SVGGElement>) => onClick(node.id)
    : undefined

const handleKeyDown =
  onClick !== undefined
    ? (e: KeyboardEvent<SVGGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(node.id)
        }
      }
    : undefined

// aria-label actual: resolveLabel(node)
```

**Liñas non cubertas (cobertura 73.33/52.17)**:
- 38-40: corpo do `handleKeyDown` (cero test dispara keyDown).
- 87: `Object.values(lbl)[0] ?? node.id` (resolveLabel fallback
  final).

**Plan**: tests novos en SkillNode.test.tsx cubrirán estas liñas
directamente, levando cobertura a ≥95/≥85.

### Estado scaffold tras 7.6

```
packages/react/src/
├── animations.ts                  (cero modif)
├── SVGRenderer.tsx                (cero modif)
├── theme-types.ts                 (cero modif)
├── themes/minimal.ts              (cero modif)
├── ThemeProvider.tsx              (cero modif)
├── SkillTreeWithDefaultTheme.tsx  (cero modif)
├── SkillTree.tsx                  (cero modif)
├── SkillNode.tsx                  (MODIFICADO en 7.7: aria-label)
├── SkillEdge.tsx                  (cero modif)
├── MeshOverlay.tsx                (cero modif)
├── svg-helpers.ts                 (cero modif)
├── createDefaultLayoutRegistry.ts (cero modif)
├── SkillTreeAnnouncer.tsx         (NOVO en 7.7)
├── headless.ts                    (MODIFICADO: +2 exports)
├── index.ts                       (MODIFICADO: +2 exports)
└── hooks/                         (cero modif)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `2b4f8d3` (animation framework 7.6).
- 1523 core + 60 common + 193 storage + 63 react = ~1839 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- Cobertura global packages/react post-7.6: **93.16% Stmts /
  82.22% Branch / 93.93% Funcs / 94.28% Lines**.
- Cobertura SkillNode.tsx: **73.33 / 52.17 / 75 / 69.23** (débeda
  histórica desde 7.2; **RESOLVERÁSE EN 7.7**).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` o compoñente público
**`SkillTreeAnnouncer`** (live region ARIA que escoita
`engine.on('unlock')` e `engine.on('lock')` e renderiza mensaxes
localizadas gl/es/en, con opcional `formatMessage` override),
modificar `SkillNode.tsx` para que o seu `aria-label` inclúa info
de estado actual (mantendo o resto do compoñente intacto), e engadir
tests específicos novos (SkillNode.test.tsx + SkillTreeAnnouncer.test.tsx)
que cobren os keyboard handlers e o fallback de `resolveLabel`,
**resolvendo a débeda histórica de cobertura de SkillNode (73/52 →
≥95/≥85)**. **Cero deps de npm engadidas, cero ErrorCodes novos,
cero modificación dalgún outro compoñente/módulo/test existente**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/SkillTreeAnnouncer.tsx` (~120 liñas).
- `packages/react/__tests__/SkillNode.test.tsx` (~130 liñas; ~6 tests).
- `packages/react/__tests__/SkillTreeAnnouncer.test.tsx` (~160 liñas;
  ~6 tests).
- `.changeset/announcer.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/SkillNode.tsx` (modificar aria-label únicamente).
- `packages/react/src/index.ts` (engadir 2 exports).
- `packages/react/src/headless.ts` (engadir 2 exports).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de** (lista completa):
- `packages/react/src/SkillTree.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `SVGRenderer.tsx`, `ThemeProvider.tsx`,
  `SkillTreeWithDefaultTheme.tsx`, `svg-helpers.ts`,
  `createDefaultLayoutRegistry.ts`, `theme-types.ts`,
  `themes/minimal.ts`, `animations.ts`, `hooks/*`.
- Tests existentes: `smoke.test.tsx`, `SkillTree.test.tsx`,
  `MeshOverlay.test.tsx`, `SVGRenderer.test.tsx`,
  `ThemeProvider.test.tsx`, `themes.test.ts`, `headless.test.tsx`,
  `hooks.test.tsx`, `animations.test.ts`.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — `SkillTreeAnnouncer.tsx` (FIXADO)

```tsx
// packages/react/src/SkillTreeAnnouncer.tsx
'use client'

// ── INICIO: SkillTreeAnnouncer ──
import { useEffect, useState, type JSX } from 'react'
import type { TreeEngine, NodeInstance } from '@yggdrasil-forge/core'

export interface SkillTreeAnnouncerProps {
  /** Engine cuyos eventos de unlock/lock serán anunciados. */
  readonly engine: TreeEngine

  /**
   * Locale para as mensaxes default. Soporta 'gl', 'es', 'en'.
   * Outros valores → fallback 'en'. Default 'en' (consistente coa
   * convención DEFAULT_LOCALE de @yggdrasil-forge/common).
   */
  readonly locale?: 'gl' | 'es' | 'en'

  /**
   * Override opcional do formateado de mensaxes. Recibe o tipo de
   * evento e o nodeId, devolve a mensaxe final. Se non se pasa,
   * usa o map default por locale.
   *
   * @example
   * formatMessage={(event, nodeId) => event === 'unlock'
   *   ? \`Has desbloqueado \${nodeId}!\`
   *   : \`Bloqueouse \${nodeId}\`
   * }
   */
  readonly formatMessage?: (
    event: 'unlock' | 'lock',
    nodeId: string,
  ) => string
}

/**
 * Compoñente público que renderiza unha live region ARIA invisible
 * e anuncia eventos de `unlock` e `lock` do engine. Útil para
 * accesibilidade (lectores de pantalla notifican o cambio sen requerir
 * que o usuario navege ata o nodo afectado).
 *
 * O contedor é visible para lectores de pantalla pero invisible
 * visualmente (técnica `sr-only` aplicada inline).
 *
 * @example
 * ```tsx
 * <ThemeProvider theme={minimal}>
 *   <SkillTreeAnnouncer engine={engine} locale="gl" />
 *   <SkillTree engine={engine} />
 * </ThemeProvider>
 * ```
 */
export function SkillTreeAnnouncer({
  engine,
  locale = 'en',
  formatMessage,
}: SkillTreeAnnouncerProps): JSX.Element {
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const handleUnlock = (nodeId: string, _instance: NodeInstance): void => {
      setMessage(
        formatMessage !== undefined
          ? formatMessage('unlock', nodeId)
          : formatDefault('unlock', nodeId, locale),
      )
    }

    const handleLock = (nodeId: string, _instance: NodeInstance): void => {
      setMessage(
        formatMessage !== undefined
          ? formatMessage('lock', nodeId)
          : formatDefault('lock', nodeId, locale),
      )
    }

    const unsubUnlock = engine.on('unlock', handleUnlock)
    const unsubLock = engine.on('lock', handleLock)

    return () => {
      unsubUnlock()
      unsubLock()
    }
  }, [engine, locale, formatMessage])

  return (
    <div
      className="yf-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={SR_ONLY_STYLE}
    >
      {message}
    </div>
  )
}

/**
 * Mensaxes default por locale. Fallback 'en' para locales non
 * soportadas.
 */
const DEFAULT_MESSAGES = {
  gl: {
    unlock: (nodeId: string): string => \`Nodo \${nodeId} desbloqueado\`,
    lock: (nodeId: string): string => \`Nodo \${nodeId} bloqueado\`,
  },
  es: {
    unlock: (nodeId: string): string => \`Nodo \${nodeId} desbloqueado\`,
    lock: (nodeId: string): string => \`Nodo \${nodeId} bloqueado\`,
  },
  en: {
    unlock: (nodeId: string): string => \`Node \${nodeId} unlocked\`,
    lock: (nodeId: string): string => \`Node \${nodeId} locked\`,
  },
} as const

function formatDefault(
  event: 'unlock' | 'lock',
  nodeId: string,
  locale: 'gl' | 'es' | 'en',
): string {
  return DEFAULT_MESSAGES[locale][event](nodeId)
}

/**
 * Estilo inline para ocultar visualmente pero manter accesible para
 * lectores de pantalla (patrón sr-only). Cero clase CSS adicional;
 * autocontido.
 */
const SR_ONLY_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const
// ── FIN: SkillTreeAnnouncer ──
```

**Decisións nesta peza**:
- **`'use client'`** (require useEffect + useState).
- **`role="status"` + `aria-live="polite"` + `aria-atomic="true"`**:
  patrón estándar para "polite" announcements (non interrompe).
- **Estilo `sr-only` inline**: invisible visualmente, accesible para
  lectores de pantalla. Cero clase CSS engadida (cero conflitos co
  CSS do consumidor).
- **Default locale `'en'`**: consistente con DEFAULT_LOCALE de common.
- **`formatMessage` override**: permite customización total sen
  modificar o paquete.
- **`useEffect` con deps [engine, locale, formatMessage]**: re-subscribe
  se algunha delas cambia.
- **Cleanup correcto**: unsubUnlock + unsubLock no return do useEffect.
- **Cero subscripción a `stateChange`** (redundante con unlock/lock).

### 5.3 — Modificación de `SkillNode.tsx` (FIXADO)

**ANTES** (post-7.2, cero cambios desde então):
```tsx
return (
  <g
    ...
    {...(handleClick !== undefined && {
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: 'button',
      'aria-label': resolveLabel(node),   // ← so o label
    })}
  >
```

**DESPOIS**:
```tsx
return (
  <g
    ...
    {...(handleClick !== undefined && {
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: 'button',
      'aria-label': formatAriaLabel(node, state),   // ← label + estado
    })}
  >
```

**Engadir** función `formatAriaLabel` ao mesmo ficheiro (privada):

```ts
/**
 * Constrúe o aria-label do nodo incluíndo o label resoluble + estado
 * actual traducido. Patrón: "{label}, {stateLabel}".
 *
 * Locales: usa map fixo en inglés (consistente coa convención WCAG
 * de etiquetas en idioma do documento; en sub-fases futuras pode
 * facerse locale-aware).
 */
function formatAriaLabel(node: NodeDef, state: NodeState): string {
  return \`\${resolveLabel(node)}, \${ARIA_STATE_LABELS[state]}\`
}

const ARIA_STATE_LABELS: Readonly<Record<NodeState, string>> = {
  locked: 'locked',
  unlockable: 'unlockable',
  in_progress: 'in progress',
  unlocked: 'unlocked',
  maxed: 'maxed',
  disabled: 'disabled',
  expired: 'expired',
} as const
```

**Engadir import** se non existe: `import type { NodeState } from
'@yggdrasil-forge/core'` (xa probable; verificar empíricamente).

**Cero outros cambios**. Cero modificación de:
- `handleClick`, `handleKeyDown` (manteñen comportamento 7.2).
- `tabIndex`, `role`, `onClick`, `onKeyDown` (manteñen).
- Renderizado de `<circle>`, `<text>`, etc.
- `resolveLabel` (función privada existente).

### 5.4 — `src/index.ts` modificación

Engadir tras os exports existentes:

```ts
// Compoñente de accesibilidade (announcements vía live region ARIA).
export { SkillTreeAnnouncer } from './SkillTreeAnnouncer.js'
export type { SkillTreeAnnouncerProps } from './SkillTreeAnnouncer.js'
```

### 5.5 — `src/headless.ts` modificación

Engadir igual:

```ts
// Compoñente de accesibilidade (mesmo set que root entry).
export { SkillTreeAnnouncer } from './SkillTreeAnnouncer.js'
export type { SkillTreeAnnouncerProps } from './SkillTreeAnnouncer.js'
```

### 5.6 — Tests prescritos (~12 totais)

**`SkillNode.test.tsx`** (~6 tests, NOVO):

1. **aria-label inclúe estado**: render con state='locked' →
   `aria-label === 'A, locked'`.
2. **keyDown Enter dispara onClick**: simular keydown 'Enter' →
   `onClick` chámase con nodeId.
3. **keyDown Space dispara onClick**: simular keydown ' ' (Space) →
   `onClick` chámase.
4. **keyDown 'Escape' NON dispara onClick**: simular keydown 'Escape'
   → `onClick` non chamada.
5. **resolveLabel fallback con locales non gl/es/en**: node con
   `label: { fr: 'Français' }` → devolve 'Français' (Object.values[0]).
6. **resolveLabel fallback final a node.id**: node con
   `label: {}` (LocalizedString vacío) → devolve node.id.

**Test 5 e 6 cobren a liña 87** (`?? Object.values(lbl)[0] ?? node.id`).
**Tests 2, 3, 4 cobren as liñas 38-40** (handleKeyDown body).

**Cobertura SkillNode post-7.7 esperada**: **≥95% Stmts / ≥85% Branch**.

**`SkillTreeAnnouncer.test.tsx`** (~6 tests, NOVO):

7. **Renderiza live region invisible**: query por `[role="status"]`
   atopa elemento con `aria-live="polite"` e style.position
   ='absolute'.
8. **Subscribe a unlock**: spy en `engine.on('unlock', ...)`; verificar
   chamada tras render.
9. **Subscribe a lock**: similar.
10. **Cleanup ao desmontar**: render + unmount; verificar que
    unsubUnlock e unsubLock chamáronse (spies).
11. **Anuncio default en locale 'gl'**: render con locale='gl';
    disparar engine.unlock(nodeId='abc'); verificar que message
    contén "abc desbloqueado".
12. **formatMessage override**: render con
    `formatMessage={(ev, id) => 'CUSTOM ' + id}`; disparar unlock;
    verificar message comeza con 'CUSTOM '.

**Total: ~12 tests novos**. Post-7.7 esperado: 63 + 12 = **~75 tests**.

### 5.7 — Cobertura prescrita

- **SkillNode.tsx (post-modif)**: **≥95% Stmts / ≥85% Branch / ≥85%
  Funcs / ≥85% Lines** (mandato firme; resolve débeda histórica).
- **SkillTreeAnnouncer.tsx**: **100/100/100/100**.
- **index.ts**, **headless.ts** (re-exports): manter baseline.
- **Resto sen cambio**: SVGRenderer 93.75/91.3, svg-helpers
  92.59/83.33, SkillTreeWithDefaultTheme 50/100/0/50, animations
  100/100/100/100, todos os hooks 100/100/100/100.

### 5.8 — Cero modificación de tests existentes

**Garantía**: smoke (3), SkillTree (15), MeshOverlay (6), SVGRenderer
(11 post-7.6), ThemeProvider (6), themes (3), headless (3), hooks
(10), animations (6) = **63 tests intactos**.

**Se algún test existente falla** → **ESCALAR**.

### 5.9 — Helpers de tests recomendados

Reutilizar fixture `makeMinimalTreeDef` xa probado:

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

**Tests de SkillNode**: render directo `<svg><SkillNode .../></svg>`
(envolver en `<svg>` para SVG context válido).

**Tests do Announcer**: render con engine real; verificar reactividade
chamando a engine.unlock('a') que **emite o evento "unlock"
internamente**.

### 5.10 — Cero deps novas

Cero modificación de package.json deps, lockfile, workspace catalog.
**Cero `@yggdrasil-forge/common`** engadido como dep. **Se aparece**
→ **ESCALAR**.

### 5.11 — Test counts esperados post-7.7

- **react**: 63 (previo) + ~12 (novos) = **~75 tests**.
- **core, common, storage**: intactos.

### 5.12 — Asercións contra tests existentes que poderían romper

**Asercion crítica en SkillTree.test.tsx existente**:
Probablemente algún test verifique `aria-label` do nodo. **CAMBIO**:
agora o aria-label inclúe ", {state}".

**Verificable en T0.2**:
```bash
grep -n "aria-label" packages/react/__tests__/SkillTree.test.tsx | head -10
```

**Se hai algunha asercion `.toBe('A')` ou `.toBe('B')` sobre
aria-label**, ESCALA antes de implementar. Probablemente as
asercións usen `.toContain('A')` ou similar (que aínda pasa porque
'A, locked' contén 'A').

**Decisión do Director**: se algunha asercion exacta sobre aria-label
existe, **ESCALAR** para axustar (cero modificación de test
existente sen autorización; pero esta sub-fase ten un caso lexítimo
para cambialo). **Probable que cero asercion exacta exista** (os
tests de SkillTree son sobre estrutura xeral; aria-label adoita usar
.toContain).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `SkillTreeAnnouncer` compoñente | React FC + JSDoc | SkillTreeAnnouncer.tsx | ~120 |
| `SkillNode` modificación (aria-label + formatAriaLabel) | Edits + helper | SkillNode.tsx | +20 modif |
| Exports root | Edits | src/index.ts | +3 |
| Exports headless | Edits | src/headless.ts | +3 |
| Tests SkillNode | describe block | SkillNode.test.tsx | ~130 |
| Tests Announcer | describe block | SkillTreeAnnouncer.test.tsx | ~160 |

**Total estimado**: ~146 liñas de código + ~290 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/SkillTreeAnnouncer.tsx` (NOVO)
- `packages/react/src/SkillNode.tsx` (MODIFICADO)
- `packages/react/src/index.ts` (MODIFICADO: +3 export lines)
- `packages/react/src/headless.ts` (MODIFICADO: +3 export lines)
- `packages/react/__tests__/SkillNode.test.tsx` (NOVO)
- `packages/react/__tests__/SkillTreeAnnouncer.test.tsx` (NOVO)
- `.changeset/announcer.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 8 ficheiros tocados** (4 NOVOS + 2 MODIFICADOS src + 2
housekeeping).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/react/src/` ou en
  `packages/react/__tests__/`.
- `packages/react/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx`. `'use client'` en SkillTreeAnnouncer (require hooks).

**Strings multiline**: single template literal con backticks
(precedente 7.6 L1; Biome rexeita `+` entre template literals).

**Cero non-null assertions** (`!`).

**Cero default exports**.

**Cero CSS clases novas** alén de `yf-announcer` (privada do announcer;
opcional). Cero engadido ao animations.ts.

**JSDoc completo** en `SkillTreeAnnouncer` e en `formatAriaLabel`.

**Marcadores**: `// ── INICIO: SkillTreeAnnouncer ──` / `// ── FIN: ──`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar **calquera test existente** (smoke, SkillTree,
  MeshOverlay, SVGRenderer, ThemeProvider, themes, headless, hooks,
  animations).
- ❌ Modificar **calquera compoñente** fora de SkillNode.tsx (e
  mesmo aí, **só aria-label + formatAriaLabel helper**; cero outras
  modificacións).
- ❌ Engadir `@yggdrasil-forge/common` como dep.
- ❌ Engadir `jest-axe` (DIFERIDO a sub-fase de hixiene CI futura).
- ❌ Implementar arrow-key navigation 2D (DIFERIDO).
- ❌ Implementar focus management auto (auto-focus tras unlock;
  DIFERIDO).
- ❌ Engadir `aria-pressed` / `aria-current` (cero scope creep;
  WCAG mínimo é label + keyboard + foco visible).
- ❌ Subscribir a outros eventos que non sexan 'unlock' e 'lock'
  (stateChange é redundante; budgetChange/progressChange/respec/etc.
  son DIFERIDOS).
- ❌ Engadir mensaxes para máis locales (gl/es/en é suficiente; máis
  via formatMessage override do consumidor).
- ❌ Engadir deps de npm.
- ❌ Usar `!` non-null assertions.
- ❌ Engadir `'use client'` ao announcer barrel ou aos exports
  (SkillTreeAnnouncer.tsx é o único ficheiro con 'use client' nesta
  sub-fase).
- ❌ Engadir Date.now() / Math.random() nos compoñentes.
- ❌ Engadir prefers-reduced-motion (vai en 7.8).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa (baseline) + lección 7.2 L1 estendida

**T0.1** — `git status` limpo. `git log -1` mostra `2b4f8d3` como HEAD.

**T0.2** — **APIs e literais verificados**:

```bash
# TreeEngine.on signature:
grep -nE "^  (on|off)<K extends EventName>" packages/core/src/engine/TreeEngine.ts
# esperado: liñas ~229, 233

# EventMap.unlock e lock confirmados:
grep -E "readonly (unlock|lock):" packages/core/src/types/events.ts
# esperado: 2 matches con sinatura (nodeId, instance) => void

# NodeState valores (para formatAriaLabel):
grep -B 1 -A 10 "^export type NodeState" packages/core/src/types/node.ts
# esperado: 'locked'|'unlockable'|'in_progress'|'unlocked'|'maxed'|'disabled'|'expired'

# Verificar asercións de aria-label existentes en tests:
grep -n "aria-label" packages/react/__tests__/SkillTree.test.tsx
# se hai aserción '.toBe(' sobre aria-label → ESCALAR; se .toContain → OK
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 63 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear SkillTreeAnnouncer.tsx

Crear `packages/react/src/SkillTreeAnnouncer.tsx` segundo §5.2
literal. **`'use client'` na primeira liña**.

### T2 — Modificar SkillNode.tsx

1. Engadir `import type { NodeState } from '@yggdrasil-forge/core'`
   (se non existe).
2. Cambiar `'aria-label': resolveLabel(node)` por `'aria-label':
   formatAriaLabel(node, state)`.
3. Engadir helper privado `formatAriaLabel` + `ARIA_STATE_LABELS` ao
   final do ficheiro (despois de `resolveLabel`).

**Cero outras modificacións**.

### T3 — Actualizar src/index.ts

Engadir 3 export lines segundo §5.4 literal.

### T4 — Actualizar src/headless.ts

Engadir 3 export lines segundo §5.5 literal.

### T5 — Verificación intermedia (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 63 tests pasando
```

**Tests existentes deben pasar intactos**. Se algún test de SkillTree
falla por causa do cambio de aria-label, **ESCALAR**. (Probablemente
non falla porque os tests usan `.toContain` ou non asertan o
aria-label exacto; pero verificable empíricamente).

### T6 — Crear SkillNode.test.tsx

Implementar 6 tests segundo §5.6 literal. Verificar que cobertura
de SkillNode chega a ≥95/≥85.

### T7 — Crear SkillTreeAnnouncer.test.tsx

Implementar 6 tests segundo §5.6 literal.

### T8 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~75 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   SkillNode.tsx: ≥95% Stmts / ≥85% Branch (resolve débeda histórica)
#   SkillTreeAnnouncer.tsx: 100/100/100/100
#   Resto: sen regresión
```

**Se SkillNode non chega a ≥95/≥85** → engadir tests adicionais ou
v8 ignores en ramas defensivas reais (con xustificación). **NON
forzar 100% se algunha rama é xenuinamente defensiva**.

### T9 — Build + Lint + Format + Grep + Changeset + CHANGELOG + commit + push

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/SkillTreeAnnouncer.tsx \
  packages/react/__tests__/SkillNode.test.tsx \
  packages/react/__tests__/SkillTreeAnnouncer.test.tsx
```

`.changeset/announcer.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add SkillTreeAnnouncer + improved SkillNode aria-label (sub-phase 7.7)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: novo compoñente público **`SkillTreeAnnouncer`**:
  - Renderiza unha live region ARIA invisible (`role="status"`,
    `aria-live="polite"`, `aria-atomic="true"`) que anuncia eventos
    `unlock` e `lock` do engine.
  - Subscribe automáticamente via `engine.on('unlock', ...)` e
    `engine.on('lock', ...)`; cleanup correcto no unmount.
  - Mensaxes localizadas inline en **galego, castelán e inglés**
    (default `'en'` por consistencia con DEFAULT_LOCALE de
    @yggdrasil-forge/common).
  - Override opcional via prop `formatMessage(event, nodeId): string`.
  - Estilo `sr-only` aplicado inline (cero CSS engadido; cero
    conflitos con CSS do consumidor).
  - Exportado tanto desde root entry como desde `/headless` (compoñente
    de a11y, independente do tema).
- `SkillNode`: **aria-label mellorado** con info de estado actual.
  Patrón: `"{label}, {stateLabel}"` (e.g., `"A, locked"`, `"B, unlockable"`).
  Os state labels son strings en inglés (consistente coa convención
  WCAG de etiquetas en idioma do documento).

### Fixed
- **Resolve débeda de cobertura histórica de SkillNode** desde 7.2:
  novos tests específicos (`SkillNode.test.tsx`) cobren os keyboard
  handlers (Enter, Space, outras teclas) e o fallback final de
  `resolveLabel` (LocalizedString con locales non gl/es/en + caso
  vacío). Cobertura SkillNode: 73.33/52.17 → ≥95/≥85.

### Note
- Sub-fase 7.7 SÉTIMA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS**:
  - `jest-axe` en CI (sub-fase de hixiene CI futura; MASTER §32
    menciona pero require coordinación con .github/workflows/).
  - Arrow-key navigation 2D entre nodos (require lóxica de
    coordenadas; cero scope creep en 7.7).
  - Focus management automático (auto-focus tras unlock).
  - `aria-pressed`/`aria-current` (cero requirido por WCAG 2.1 AA
    mínimo; pode engadirse en sub-fase futura).
  - Announcements para outros eventos do engine (budgetChange,
    progressChange, respec, buildLoaded, subtreeEntered, treeChanged):
    o announcer subscribe SO a unlock + lock en 7.7.
  - 7.8 (prefers-reduced-motion), 7.9 (SSR/RSC), 7.10 (mobile/touch),
    7.11 (error boundaries), 7.12 (tests visuais).
- **`@yggdrasil-forge/common` NON engadido como dep** (mantén o
  paquete react cunha sola dep workspace: `@yggdrasil-forge/core`).
  As mensaxes do announcer son inline (cero `resolveLocalized` usado).
- **Cero deps de npm engadidas** (mantén política Fase 7).
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **Cero modificación de SkillTree.tsx, SkillEdge.tsx, MeshOverlay.tsx,
  SVGRenderer.tsx, ThemeProvider.tsx, SkillTreeWithDefaultTheme.tsx,
  svg-helpers.ts, createDefaultLayoutRegistry.ts, theme-types.ts,
  themes/minimal.ts, animations.ts, hooks/***. Os 63 tests previos
  pasan intactos.
- **WCAG 2.1 AA mínimo cuberto**: foco visible (`tabIndex=0`),
  keyboard interaction (Enter/Space), descriptive label (`aria-label`),
  state communication (incluído en aria-label + via announcer).
```

Commit Conventional:
`feat(react): add SkillTreeAnnouncer + improved SkillNode aria-label (sub-phase 7.7)`

Push directo a `origin/main` (base `2b4f8d3`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.7 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 2b4f8d3)
✅ SkillTreeAnnouncer compoñente público novo
✅ Live region ARIA (role=status, aria-live=polite, aria-atomic=true)
✅ Subscribe a engine.on('unlock') + ('lock') con cleanup
✅ Mensaxes localizadas inline gl/es/en (default 'en')
✅ formatMessage prop opcional para override
✅ sr-only inline style (cero CSS engadido)
✅ SkillNode aria-label mellorado con estado
✅ DÉBEDA DE COBERTURA HISTÓRICA RESOLVA:
   SkillNode <antes:7.2> 73.33/52.17 → <agora:7.7> ≥95/≥85
✅ T0.2 APIs verificadas: TreeEngine.on signature, EventMap.unlock/lock,
   NodeState valores, asercións aria-label en SkillTree.test.tsx
✅ T5 verificación intermedia: 63 tests previos pasan intactos
✅ CERO modificación de SkillTree, SkillEdge, MeshOverlay, SVGRenderer,
   ThemeProvider, SkillTreeWithDefaultTheme, svg-helpers,
   createDefaultLayoutRegistry, theme-types, themes/minimal,
   animations, hooks/*
✅ CERO modificación de tests existentes
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ Tests: <N> pasan en react (<delta> novos, 63 previos intactos)
   - 6 SkillNode (aria-label + keyDown + resolveLabel fallback)
   - 6 SkillTreeAnnouncer (live region + subscribe + locale + override)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - SkillNode.tsx: <X>/<Y>/<Z>/<W> (≥95/≥85; resolve débeda)
   - SkillTreeAnnouncer.tsx: 100/100/100/100
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.7 SÉTIMA da Fase 7.
   - 5 sub-fases pendentes (7.8 a 7.12).
   - WCAG 2.1 AA mínimo cuberto (foco + keyboard + label + state).
   - jest-axe DIFERIDO (sub-fase de hixiene CI futura).
   - Announcer subscribe SO a unlock + lock; outros eventos diferidos.
   - SkillNode débeda de cobertura RESOLVA (73/52 → ≥95/≥85).
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 8 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.8 (prefers-reduced-motion).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.7. Sétima sub-fase da Fase 7. Sub-fase con
modificación substancial dunha peza histórica (SkillNode.tsx desde
7.2) + compoñente novo con efecto secundario (useEffect subscribe).
Risco arquitectónico MEDIO. **Resolve a débeda de cobertura
histórica de SkillNode** (73.33/52.17 → ≥95/≥85), confirmando o plan
anunciado dende 7.2 ("cubrirase en 7.7 con keyboard"). Cero deps
novas. Cero ErrorCodes. Cero modificación de outros compoñentes
nin tests existentes. Calquera dúbida → ESCALAR.*

*Lección 7.5 L1 aplicada: T0.2 verifica empíricamente TreeEngine.on,
EventMap.unlock/lock, NodeState valores, e asercións aria-label en
tests existentes antes de modificar.*
