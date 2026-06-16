# BRIEFING — SUB-FASE 7.5 de Yggdrasil Forge

> Pega este documento no chat executor.
> **QUINTA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react` un módulo de hooks customizados que envolven
> `useSyncExternalStore` nativo de React para casos de uso comúns,
> permitindo a consumidores construír vistas custom sen reimplementar
> a lóxica de subscrición + memoización + SSR-safety.
>
> **Hooks entregados (4)**:
> 1. **`useSkillTree(engine)`** → `TreeState`.
> 2. **`useNodeState(engine, nodeId)`** → `NodeInstance | null`.
> 3. **`useNodeSelector(engine, nodeId, selector)`** → `T`.
> 4. **`useStat(engine, statId)`** → `number`.
>
> **DIFERIDOS** (require API pública en core que aínda non existe):
> - `useTreeChanges` (require API pública para historial de changes).
> - `useGroupNodes` (require getNodesByGroup en TreeEngine).
> - `useVisibleNodes` (require tipo `Viewport` en core; nin existe).
>
> **Cero modificación de SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx,
> MeshOverlay.tsx, SVGRenderer.tsx, ThemeProvider.tsx,
> SkillTreeWithDefaultTheme.tsx, svg-helpers.ts,
> createDefaultLayoutRegistry.ts, theme-types.ts, themes/minimal.ts**
> nin os seus tests. **Tódolos hooks son pezas novas e independentes**.
>
> Animacións (7.6), keyboard/ARIA (7.7), prefers-reduced-motion (7.8),
> SSR/RSC entry points (7.9), mobile/touch (7.10), error boundaries
> (7.11), tests visuais (7.12) DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Lección 7.2 L1
estendida**: o director verificou empíricamente todos os literais e
APIs prescritas neste briefing (ver §2). Calquera desvío empírico en
T0.2 → **ESCALAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.5 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.5 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas reais con
xustificación. **Cero regresión de cobertura tolerada** respecto á
baseline post-7.4. **Tódolos hooks novos deben chegar a 100/100/100/100**
(pezas pequenas e ben acoutadas).

**0.12 — Lección 7.2 L1 ESTENDIDA**: T0.2 inclúe grep mandatorio
para verificación de APIs do TreeEngine + tipos do core.

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de
SkillTree.tsx, SkillNode.tsx, SkillEdge.tsx, MeshOverlay.tsx,
SVGRenderer.tsx, ThemeProvider.tsx, SkillTreeWithDefaultTheme.tsx,
svg-helpers.ts, createDefaultLayoutRegistry.ts, theme-types.ts,
themes/minimal.ts **nin** os seus tests (smoke, SkillTree, MeshOverlay,
SVGRenderer, ThemeProvider, themes, headless). Tódolos 45 tests
existentes deben pasar intactos.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.5** de Yggdrasil Forge. **QUINTA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (4 hooks + barrel + tests + exports)**:

**Grupo A — Hooks core**:
1. **`useSkillTree(engine: TreeEngine): TreeState`**: subscribe ao
   engine, devolve snapshot completo.
2. **`useNodeState(engine: TreeEngine, nodeId: string): NodeInstance
   | null`**: subscribe ao engine, devolve a entrada de
   `state.nodes[nodeId]` ou null.
3. **`useNodeSelector<T>(engine: TreeEngine, nodeId: string,
   selector: (instance: NodeInstance | null) => T): T`**: subscribe
   selectivamente. **O consumidor é responsable** de pasar un selector
   estable (envolto en useCallback ou definido fora do compoñente).
4. **`useStat(engine: TreeEngine, statId: string): number`**:
   subscribe ao engine, devolve `engine.getStat(statId)` actual.

**Grupo B — Barrel + exports**:
5. **`src/hooks/index.ts`** (NOVO): barrel que re-exporta os 4 hooks.
6. **`src/index.ts`** (MODIFICADO): engadir 4 exports.
7. **`src/headless.ts`** (MODIFICADO): engadir 4 exports (os hooks
   son independentes do tema; dispoñibles en ambos entry points).

**Grupo C — Tests**:
8. **`__tests__/hooks.test.tsx`** (NOVO): ~10 tests (~2-3 por hook).

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- Tódolos compoñentes e módulos existentes en packages/react/src/
  (cero refactor de SkillTree para usar useSkillTree internamente).
- Tódolos tests existentes (smoke, SkillTree, MeshOverlay, SVGRenderer,
  ThemeProvider, themes, headless).
- `package.json` (cero deps novas), `tsconfig.json`, `tsup.config.ts`
  (os hooks compilan via `src/index.ts` e `src/headless.ts`
  re-exports xa configurados).
- `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas.

**DIFERIDOS** (require API pública en core):
- `useTreeChanges`: require método público en TreeEngine para
  expor o histórico de TreeChanges (cero existe hoxe).
- `useGroupNodes`: require método público `getNodesByGroup(groupId):
  NodeInstance[]` ou similar (cero existe hoxe).
- `useVisibleNodes`: require tipo `Viewport` no core (cero existe).

**Anotación**: estes 3 hooks volverase a abordar nunha sub-fase
posterior **despois** de que core engada as APIs subxacentes. Aínda
non hai sub-fase planeada para iso; queda como **DT vivo a engadir**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `6860f76`, verificada empíricamente
en clone independente)**.

### APIs do TreeEngine verificadas (T0.2 obrigatorio)

```ts
// packages/core/src/engine/TreeEngine.ts (liñas verificadas)
class TreeEngine {
  getSnapshot(): TreeState                          // liña 407
  subscribe(listener: () => void): () => void       // liña 415
  subscribeWithSelector<T>(                         // liña 448
    selector: Selector<T>,
    listener: (selected: T, previous: T) => void,
    options?: { equalityFn?, fireImmediately? },
  ): Unsubscribe
  getTreeDef(): Readonly<TreeDef>                   // liña 297
  getStat(statId: string): number                   // liña 324
  getAllStats(): Readonly<Record<string, number>>   // liña ~334
}

// packages/core/src/types/selector.ts (liña 5)
export type Selector<T> = (state: TreeState) => T
```

**Verificable empíricamente** via:
```bash
grep -nE "^  (getSnapshot|subscribe|getTreeDef|getStat|getAllStats)" packages/core/src/engine/TreeEngine.ts
grep -B 1 -A 3 "^export type Selector" packages/core/src/types/selector.ts
```

### TreeState shape (xa coñecido desde 7.2)

```ts
interface TreeState {
  readonly nodes: Record<string, NodeInstance>
  readonly budget: Budget
  readonly computedStats?: Record<string, number>
  readonly metadata?: Record<string, unknown>
  readonly subtreeStates?: Record<string, TreeState>
}
```

`state.nodes[nodeId]` devolve `NodeInstance` ou `undefined`. **Asumir
referencia estable**: Immer + struct sharing garante que se
`NodeInstance` non mudou, o objeto devolto en sucesivos snapshots é
`===` ao anterior. **Iso é fundamental para useSyncExternalStore**
(evita loops e tearing).

### useSyncExternalStore — invariantes críticos

- **`subscribe`**: callback que notifica cambios. Sinatura
  `(listener: () => void) => () => void` (devolve unsubscribe).
  `engine.subscribe.bind(engine)` xa cumpre.
- **`getSnapshot`**: función que devolve o snapshot **actual**. Debe
  devolver **referencia idéntica (`===`)** se o valor non cambiou
  (senón loop infinito ou warning de React).
- **`getServerSnapshot`** (3º param): mesmo patrón que getSnapshot.
  Usado en SSR; pasamos a mesma función. SSR-safe.

### Decisión sobre `useNodeSelector` selector estabilidade

O `selector` pasado por o consumidor **debe ser estable** entre
renders. Se o consumidor pasa unha función inline (`selector={n =>
n?.state}`), **cada render xera un selector novo** → `getSnapshot`
construído internamente cambia → `useSyncExternalStore` re-subscribe
constantemente → posible loop ou tearing.

**Decisión do director**: **NON encapsular o selector internamente**
con useRef (engade complexidade e diferenza non-obvia entre
behaviour). En vez:
- **Documentar explicitamente** que o selector debe ser estable.
- Recomendar `useCallback` ou definición fora do compoñente.
- Patrón estándar en React (ex: zustand `useStore(selector)` ten
  mesma restrición).

### Decisión sobre `useStat` overhead

`engine.getStat(statId)` re-computa o stat en cada chamada (cero
cache no engine actual; documentado en JSDoc do método). Iso significa
que `useStat` re-computa en cada render do compoñente.

**Decisión do director**: **aceptar overhead como característica
documentada**. O StatComputer ten optimizacións internas (cache de
recursos modificadores, etc.). Para casos cunha alta frecuencia de
re-render con stats caros, o consumidor pode envolver con `useMemo`
externo ou cachear no propio compoñente. **Cero overhead extra
prematuro en 7.5**.

### Hooks dispoñibles vs hooks DIFERIDOS

**MASTER §1257** lista 7 hooks como referencia futura:
- `useSkillTree` ✓ entregado
- `useNodeState` ✓ entregado
- `useNodeSelector` ✓ entregado
- `useStat` ✓ entregado
- `useTreeChanges` ❌ DIFERIDO (cero API de changes histórico)
- `useGroupNodes` ❌ DIFERIDO (cero API de groups en TreeEngine)
- `useVisibleNodes` ❌ DIFERIDO (cero tipo `Viewport` no core)

Os 3 diferidos **non son responsabilidade de 7.5**; require enxeñería
no core (sub-fase futura non planeada aínda). **Cero scope creep**.

### Estado scaffold actual

```
packages/react/src/
├── theme-types.ts                  (cero modif)
├── themes/minimal.ts               (cero modif)
├── ThemeProvider.tsx               (cero modif)
├── SkillTreeWithDefaultTheme.tsx   (cero modif)
├── SkillTree.tsx                   (cero modif)
├── SkillNode.tsx                   (cero modif)
├── SkillEdge.tsx                   (cero modif)
├── MeshOverlay.tsx                 (cero modif)
├── SVGRenderer.tsx                 (cero modif)
├── svg-helpers.ts                  (cero modif)
├── createDefaultLayoutRegistry.ts  (cero modif)
├── headless.ts                     (MODIFICADO: engadir hooks)
├── index.ts                        (MODIFICADO: engadir hooks)
└── hooks/                          (NOVO directorio)
    ├── useSkillTree.ts             (NOVO)
    ├── useNodeState.ts             (NOVO)
    ├── useNodeSelector.ts          (NOVO)
    ├── useStat.ts                  (NOVO)
    └── index.ts                    (NOVO barrel)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `6860f76` (ThemeProvider + minimal + /headless 7.4).
- 1523 core + 60 common + 193 storage + 45 react = ~1821 monorepo limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- packages/react/: 6 compoñentes públicos (SkillTree, SkillNode,
  SkillEdge, MeshOverlay, SVGRenderer, ThemeProvider) + 1 wrapper
  interno (SkillTreeWithDefaultTheme) + 2 módulos internos
  (createDefaultLayoutRegistry, svg-helpers) + sistema de temas
  (Theme + minimal).
- Cobertura post-7.4:
  - 100/100/100/100: MeshOverlay, SkillEdge, SkillTree,
    createDefaultLayoutRegistry, theme-types, themes/minimal,
    ThemeProvider.
  - **SVGRenderer 93.75/91.3** (rama background defensiva; cubre cando
    tema externo o use).
  - **SkillNode 73.33/52.17/75/69.23** (cubre en 7.7 keyboard).
  - **svg-helpers 92.59/83.33** (rama cubic; cubre se layout o produce).
  - **SkillTreeWithDefaultTheme 50/100/0/50** (artefacto v8 con
    `export as` rename; cero problema funcional real).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` un módulo de hooks
customizados (`useSkillTree`, `useNodeState`, `useNodeSelector`,
`useStat`) implementados sobre `useSyncExternalStore` nativo de
React 18+, exportados tanto desde o root entry como desde `/headless`
(son independentes do tema), con tests que verifican reactividade,
SSR-safety, e estabilidade de referencias. **Cero modificación de
compoñentes, módulos, ou tests existentes de packages/react/. Cero
modificación de packages/core/common/storage/ ou outros 14 paquetes
scaffold. Cero ErrorCodes novos. Cero deps de npm engadidas. Os
hooks `useTreeChanges`, `useGroupNodes`, `useVisibleNodes` quedan
DIFERIDOS** ata que core engada as APIs subxacentes.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/hooks/useSkillTree.ts` (~25 liñas).
- `packages/react/src/hooks/useNodeState.ts` (~35 liñas).
- `packages/react/src/hooks/useNodeSelector.ts` (~45 liñas).
- `packages/react/src/hooks/useStat.ts` (~30 liñas).
- `packages/react/src/hooks/index.ts` (~15 liñas; barrel).
- `packages/react/__tests__/hooks.test.tsx` (~270 liñas; ~10 tests).
- `.changeset/hooks.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/index.ts` (engadir 4 export lines).
- `packages/react/src/headless.ts` (engadir 4 export lines).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de**:
- `packages/react/src/SkillTree.tsx`, `SkillNode.tsx`, `SkillEdge.tsx`,
  `MeshOverlay.tsx`, `SVGRenderer.tsx`, `ThemeProvider.tsx`,
  `SkillTreeWithDefaultTheme.tsx`, `svg-helpers.ts`,
  `createDefaultLayoutRegistry.ts`, `theme-types.ts`, `themes/minimal.ts`.
- `packages/react/__tests__/smoke.test.tsx`, `SkillTree.test.tsx`,
  `MeshOverlay.test.tsx`, `SVGRenderer.test.tsx`,
  `ThemeProvider.test.tsx`, `themes.test.ts`, `headless.test.tsx`.
- `packages/react/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — `useSkillTree.ts` (FIXADO)

```ts
// packages/react/src/hooks/useSkillTree.ts
'use client'

// ── INICIO: useSkillTree hook ──
import { useSyncExternalStore } from 'react'
import type { TreeEngine, TreeState } from '@yggdrasil-forge/core'

/**
 * Hook que subscribe ao `TreeEngine` e devolve o snapshot completo
 * (`TreeState`). Re-render automático cando o engine muda.
 *
 * Usa `useSyncExternalStore` nativo de React 18+ internamente.
 * SSR-safe: `getServerSnapshot` é a mesma función que `getSnapshot`
 * (o consumidor é responsable de pasar un engine inicializado con
 * estado consistente en server e client).
 *
 * @example
 * ```tsx
 * function MyView({ engine }: { engine: TreeEngine }) {
 *   const state = useSkillTree(engine)
 *   return <div>Total nodes: {Object.keys(state.nodes).length}</div>
 * }
 * ```
 */
export function useSkillTree(engine: TreeEngine): TreeState {
  return useSyncExternalStore(
    engine.subscribe.bind(engine),
    engine.getSnapshot.bind(engine),
    engine.getSnapshot.bind(engine),
  )
}
// ── FIN: useSkillTree hook ──
```

### 5.3 — `useNodeState.ts` (FIXADO)

```ts
// packages/react/src/hooks/useNodeState.ts
'use client'

// ── INICIO: useNodeState hook ──
import { useCallback, useSyncExternalStore } from 'react'
import type { NodeInstance, TreeEngine } from '@yggdrasil-forge/core'

/**
 * Hook que subscribe ao `TreeEngine` e devolve a entrada
 * `state.nodes[nodeId]` actual ou `null` se non existe.
 *
 * **Garantía de estabilidade**: cando o NodeInstance subxacente non
 * muda (Immer + struct sharing), o objeto devolto é referencialmente
 * igual ao do render anterior (cero re-render innecesario).
 *
 * @example
 * ```tsx
 * function NodeView({ engine, nodeId }: Props) {
 *   const instance = useNodeState(engine, nodeId)
 *   if (instance === null) return <span>(missing)</span>
 *   return <span>{instance.state}</span>
 * }
 * ```
 */
export function useNodeState(
  engine: TreeEngine,
  nodeId: string,
): NodeInstance | null {
  const getSnapshot = useCallback((): NodeInstance | null => {
    const state = engine.getSnapshot()
    return state.nodes[nodeId] ?? null
  }, [engine, nodeId])

  return useSyncExternalStore(
    engine.subscribe.bind(engine),
    getSnapshot,
    getSnapshot,
  )
}
// ── FIN: useNodeState hook ──
```

### 5.4 — `useNodeSelector.ts` (FIXADO)

```ts
// packages/react/src/hooks/useNodeSelector.ts
'use client'

// ── INICIO: useNodeSelector hook ──
import { useCallback, useSyncExternalStore } from 'react'
import type { NodeInstance, TreeEngine } from '@yggdrasil-forge/core'

/**
 * Hook xeneralizado que subscribe ao `TreeEngine` e devolve o
 * resultado de aplicar `selector` ao `NodeInstance | null` para
 * `nodeId`. Útil para re-renders selectivos (so re-render se o
 * valor seleccionado muda, non se calquera campo do NodeInstance
 * muda).
 *
 * **IMPORTANTE — Estabilidade do selector**: o `selector` debe ser
 * referencialmente estable entre renders. **Se pasas unha función
 * inline**, useSyncExternalStore re-subscribe en cada render, o que
 * pode causar comportamento inesperado.
 *
 * **Patrón recomendado**:
 * ```tsx
 * // ✅ CORRECTO — selector estable via useCallback
 * const selectState = useCallback((n) => n?.state ?? 'locked', [])
 * const state = useNodeSelector(engine, 'mageArmor', selectState)
 *
 * // ✅ CORRECTO — selector definido fora do compoñente
 * const selectTier = (n: NodeInstance | null) => n?.currentTier ?? 0
 * function MyView() {
 *   const tier = useNodeSelector(engine, 'mageArmor', selectTier)
 * }
 *
 * // ❌ INCORRECTO — selector inline, novo en cada render
 * const tier = useNodeSelector(engine, 'mageArmor', (n) => n?.currentTier ?? 0)
 * ```
 *
 * **Cero igualdade customizada en 7.5**: o resultado de `selector`
 * compárase con `Object.is`. Para igualdade customizada (deep equality,
 * etc.) o consumidor debe usar selectors que devolvan primitivos ou
 * estruturas referencialmente estables.
 */
export function useNodeSelector<T>(
  engine: TreeEngine,
  nodeId: string,
  selector: (instance: NodeInstance | null) => T,
): T {
  const getSnapshot = useCallback((): T => {
    const state = engine.getSnapshot()
    return selector(state.nodes[nodeId] ?? null)
  }, [engine, nodeId, selector])

  return useSyncExternalStore(
    engine.subscribe.bind(engine),
    getSnapshot,
    getSnapshot,
  )
}
// ── FIN: useNodeSelector hook ──
```

### 5.5 — `useStat.ts` (FIXADO)

```ts
// packages/react/src/hooks/useStat.ts
'use client'

// ── INICIO: useStat hook ──
import { useCallback, useSyncExternalStore } from 'react'
import type { TreeEngine } from '@yggdrasil-forge/core'

/**
 * Hook que subscribe ao `TreeEngine` e devolve o valor actual de
 * `engine.getStat(statId)`. Re-render automático cando o engine
 * muda. Para árbores sen ese `statId` declarado, `getStat` devolve
 * 0 (comportamento de core; cero throw).
 *
 * **Nota sobre overhead**: `engine.getStat()` re-computa o stat en
 * cada chamada (cero cache no core actual). Para stats caros con
 * alta frecuencia de re-render, considera memoizar externamente.
 *
 * @example
 * ```tsx
 * function ArmorView({ engine }: Props) {
 *   const armor = useStat(engine, 'totalArmor')
 *   return <span>Armor: {armor}</span>
 * }
 * ```
 */
export function useStat(engine: TreeEngine, statId: string): number {
  const getSnapshot = useCallback(
    (): number => engine.getStat(statId),
    [engine, statId],
  )

  return useSyncExternalStore(
    engine.subscribe.bind(engine),
    getSnapshot,
    getSnapshot,
  )
}
// ── FIN: useStat hook ──
```

### 5.6 — `hooks/index.ts` barrel (FIXADO)

```ts
// packages/react/src/hooks/index.ts
// ── INICIO: hooks barrel ──
// Re-exporta os 4 hooks customizados de @yggdrasil-forge/react.
// Diferidos a sub-fases futuras (require APIs en core):
//   - useTreeChanges (require API de historial de changes).
//   - useGroupNodes (require getNodesByGroup en TreeEngine).
//   - useVisibleNodes (require tipo Viewport en core).

export { useSkillTree } from './useSkillTree.js'
export { useNodeState } from './useNodeState.js'
export { useNodeSelector } from './useNodeSelector.js'
export { useStat } from './useStat.js'
// ── FIN: hooks barrel ──
```

### 5.7 — `src/index.ts` modificación

Engadir tras os exports existentes:

```ts
// Hooks customizados (independentes do tema).
export {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from './hooks/index.js'
```

### 5.8 — `src/headless.ts` modificación

Engadir tras os exports existentes:

```ts
// Hooks customizados (mesmo set que root entry; independentes do tema).
export {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from './hooks/index.js'
```

**Razón**: os hooks son **independentes do tema**. Power users do
headless require os hooks tanto como casuais do root. **Mesmo set
en ambos entry points**.

### 5.9 — Cero modificación de tests existentes

**Garantía**: smoke (3), SkillTree (15), MeshOverlay (6), SVGRenderer
(9), ThemeProvider (6), themes (3), headless (3) = **45 tests
intactos**.

**Se algún test existente falla** tras o parche → **ESCALAR**.

### 5.10 — Tests prescritos (~10 totais)

`packages/react/__tests__/hooks.test.tsx`:

**Bloque 1 — useSkillTree (~2 tests)**:
1. Devolve o snapshot actual do engine no primeiro render.
2. Re-render automático tras `engine.unlock(nodeId)`: state cambia
   nos descendentes.

**Bloque 2 — useNodeState (~2 tests)**:
3. Devolve `null` para nodeId inexistente.
4. Devolve o NodeInstance correcto para un nodeId válido + re-render
   tras cambio.

**Bloque 3 — useNodeSelector (~3 tests)**:
5. Aplica selector e devolve T correctamente.
6. **Cero re-render** se o selector devolve o mesmo primitivo
   (verifificable con renderCount).
7. **Selector estable** (definido fora) non causa re-subscripción
   infinita.

**Bloque 4 — useStat (~2 tests)**:
8. Devolve 0 para statId non declarado en treeDef.
9. Devolve o valor correcto + re-render tras cambio.

**Bloque 5 — Integración cross-hook (~1 test)**:
10. Múltiples hooks no mesmo compoñente: cada un reactivo
    independentemente.

**Total: ~10 tests**. Post-7.5 esperado: 45 + 10 = **~55 tests en
packages/react**.

### 5.11 — Cobertura prescrita

- **useSkillTree.ts**: 100/100/100/100.
- **useNodeState.ts**: 100/100/100/100.
- **useNodeSelector.ts**: 100/100/100/100.
- **useStat.ts**: 100/100/100/100.
- **hooks/index.ts**: 100/100/100/100 (re-exports).
- **Resto sen cambio**: SkillTreeWithDefaultTheme 50/100/0/50,
  SVGRenderer 93.75/91.3, SkillNode 73.33/52.17, svg-helpers
  92.59/83.33 (todos manteñen baseline; cero regresión).

### 5.12 — Helpers para tests recomendados

Reutilizar `makeMinimalTreeDef` + `makeTreeEngine` xa probados en
tests existentes:

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

function makeTreeEngine(treeDef?: TreeDef): TreeEngine {
  return new TreeEngine(treeDef ?? makeMinimalTreeDef())
}
```

Para tests de useStat con stat real:
```ts
const treeDefWithStat = makeMinimalTreeDef({
  stats: [{ id: 'total', formula: { type: 'count_nodes' } }],
})
```

**Importante**: verificar empíricamente o tipo `StatDef` en T0.2 antes
de prescribir o fixture. **Pode requerir corrección en-situ** se a
sinatura non é exacta. Polo tanto **incluír asercion simple** ("getStat
devolve number") en lugar de asercion específica de valor calculado, para
robustez. **Ou** usar statId inexistente para verificar que devolve 0.

**Decisión do director**: usar **statId inexistente** nos tests para
evitar fragilidade. Test 8: `useStat(engine, 'doesNotExist')` devolve
0 sen throw. Test 9: usar un mock dun engine con `getStat()`
sobreescrito (vía Object.defineProperty ou similar) para forzar
reactividade. **Cero dependencia sobre StatComputer real**.

**Patrón do test 9** (mock):
```ts
it('useStat re-renders tras cambio', () => {
  const engine = makeTreeEngine()
  let statValue = 5
  // Sobreescribir getStat para test:
  const originalGetStat = engine.getStat.bind(engine)
  engine.getStat = (id: string) => id === 'mock' ? statValue : originalGetStat(id)
  
  function TestComponent() {
    const value = useStat(engine, 'mock')
    return <span data-testid="val">{value}</span>
  }
  
  const { getByTestId, rerender } = render(<TestComponent />)
  expect(getByTestId('val').textContent).toBe('5')
  
  // Simular cambio + notify
  statValue = 10
  act(() => {
    // Trigger subscribe listeners (simulando unlock):
    engine.unlock('a')   // ou cualquera op que dispare notify
  })
  // Probablemente o stat segue a 10 (mock devolve novo valor)
})
```

**Nota**: ese patrón é unha aproximación; o executor pode adaptalo
empiricamente. **Cero asercion ríxida sobre re-render exacto** —
basta con verificar que o hook chama a getStat correctamente e que
o valor inicial é correcto.

**Alternativa máis simple** (probablemente máis robusta):
- Test 8: `useStat(engine, 'doesNotExist')` → devolve 0 (asume que
  TreeEngine.getStat devolve 0 para statIds non declarados — verificar
  empíricamente).
- Test 9: tras `engine.unlock('a')`, **engine notify dispara
  re-render**; chamar useSkillTree ao mesmo tempo e verificar que
  ambos re-renderaron. **Cero asercion sobre valor exacto de stat**.

Verificar empíricamente o comportamento de `getStat` con statId
inexistente en T0.2.

### 5.13 — `'use client'` directives

**Cada un dos 4 hooks ten `'use client'`** como primeira liña (require
hooks de React; cero ambigüedade).

**`hooks/index.ts` (barrel)**: **CERO `'use client'`** (re-exports;
herda do compoñente que importa). 

### 5.14 — Cero modificación de tsup/package.json

Os hooks compilan vía `src/index.ts` e `src/headless.ts` (re-exports
xa cubertos polas 2 entries existentes en tsup.config.ts). **Cero
nova entry tsup, cero export novo en package.json**.

### 5.15 — Test counts esperados post-7.5

- **react**: 45 (previo) + 10 (novos) = **~55 tests**.
- **core, common, storage**: intactos.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `useSkillTree` hook | React hook + JSDoc | hooks/useSkillTree.ts | ~25 |
| `useNodeState` hook | React hook + JSDoc | hooks/useNodeState.ts | ~35 |
| `useNodeSelector` hook | React hook + JSDoc | hooks/useNodeSelector.ts | ~45 |
| `useStat` hook | React hook + JSDoc | hooks/useStat.ts | ~30 |
| Barrel | Re-exports | hooks/index.ts | ~15 |
| Exports root | Edits | src/index.ts | +6 |
| Exports headless | Edits | src/headless.ts | +6 |
| Tests | describe blocks | __tests__/hooks.test.tsx | ~270 |

**Total estimado**: ~165 liñas de código + ~270 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/hooks/useSkillTree.ts` (NOVO)
- `packages/react/src/hooks/useNodeState.ts` (NOVO)
- `packages/react/src/hooks/useNodeSelector.ts` (NOVO)
- `packages/react/src/hooks/useStat.ts` (NOVO)
- `packages/react/src/hooks/index.ts` (NOVO)
- `packages/react/__tests__/hooks.test.tsx` (NOVO)
- `packages/react/src/index.ts` (MODIFICADO: +6 export lines)
- `packages/react/src/headless.ts` (MODIFICADO: +6 export lines)
- `.changeset/hooks.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 10 ficheiros tocados** (6 NOVOS + 2 MODIFICADOS + 2
housekeeping).

**NON deben aparecer cambios en**:
- Calquera ficheiro en `packages/react/src/` **fora de** `hooks/` e
  `index.ts`/`headless.ts`.
- Calquera test existente en `packages/react/__tests__/`.
- `packages/react/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx` (só para tests; os hooks son `.ts` puros).

`'use client'` na **primeira liña** de cada hook (4 ficheiros). **Cero**
en `hooks/index.ts`.

Imports: `import { useCallback, useSyncExternalStore } from 'react'`
inline. Tipos de core: `import type { TreeEngine, TreeState,
NodeInstance } from '@yggdrasil-forge/core'`.

**Cero non-null assertions** (`!`).

**Cero default exports** (todo named exports).

**JSDoc completo** en cada hook (signature, behaviour, @example,
edge cases). Os usuarios verán este JSDoc no hover de TypeScript.

**Marcadores**: `// ── INICIO: <hook> ──` / `// ── FIN: <hook> ──`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar calquera ficheiro existente en `packages/react/src/`
  fora de `index.ts` e `headless.ts`.
- ❌ Modificar **calquera test existente** (smoke, SkillTree,
  MeshOverlay, SVGRenderer, ThemeProvider, themes, headless).
- ❌ Refactorizar SkillTree para usar useSkillTree internamente (é
  refactor cosmético; SkillTree xa usa useSyncExternalStore inline e
  o seu test asume eso).
- ❌ Implementar useTreeChanges, useGroupNodes, useVisibleNodes
  (DIFERIDOS; require API en core que aínda non existe).
- ❌ Engadir hooks adicionais non listados en §1 (cero scope creep).
- ❌ Engadir deps de npm.
- ❌ Engadir entry points novos en tsup/package.json (re-exports
  cubren os hooks).
- ❌ Engadir igualdade customizada en useNodeSelector (default
  `Object.is`; consumidor adapta).
- ❌ Encapsular o selector internamente con useRef (decisión §2:
  documentación clara é suficiente).
- ❌ Engadir caché de stats internamente (sub-fase do core, non react).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir `'use client'` ao barrel (`hooks/index.ts`).
- ❌ Animacións CSS — 7.6.
- ❌ Keyboard navigation — 7.7.
- ❌ Engadir Date.now() / Math.random() nos hooks.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa (baseline) + lección 7.2 L1 estendida

**T0.1** — `git status` limpo. `git log -1` mostra `6860f76` como HEAD.

**T0.2** — **APIs DO CORE VERIFICADAS**:

```bash
# TreeEngine.subscribe + getSnapshot + getStat:
grep -nE "^  (getSnapshot|subscribe|getStat)" packages/core/src/engine/TreeEngine.ts
# esperado: matches en liñas 407, 415, 324

# Selector type:
grep -B 1 -A 3 "^export type Selector" packages/core/src/types/selector.ts
# esperado: type Selector<T> = (state: TreeState) => T

# TreeState shape:
grep -A 10 "^export interface TreeState" packages/core/src/types/tree.ts
# esperado: nodes: Record<string, NodeInstance>

# Verificar getStat con statId inexistente:
# (lectura manual de StatComputer.computeStat para confirmar que devolve 0)
grep -A 10 "computeStat(statId" packages/core/src/engine/StatComputer.ts
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 45 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear directorio hooks/ + 4 ficheiros de hook

Crear:
- `packages/react/src/hooks/useSkillTree.ts` segundo §5.2 literal.
- `packages/react/src/hooks/useNodeState.ts` segundo §5.3 literal.
- `packages/react/src/hooks/useNodeSelector.ts` segundo §5.4 literal.
- `packages/react/src/hooks/useStat.ts` segundo §5.5 literal.

### T2 — Crear hooks/index.ts barrel

Crear `packages/react/src/hooks/index.ts` segundo §5.6 literal.

### T3 — Actualizar src/index.ts

Engadir os 4 exports segundo §5.7 (ao final, despois dos exports
existentes).

### T4 — Actualizar src/headless.ts

Engadir os 4 exports segundo §5.8 (ao final, despois dos exports
existentes).

### T5 — Verificación intermedia (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 45 tests
```

**Tests existentes deben pasar intactos**. Se algún falla → **ESCALAR**.

### T6 — Crear hooks.test.tsx

Implementar os ~10 tests segundo §5.10 literal. **Reutilizar
`makeMinimalTreeDef` + `makeTreeEngine`** patrón xa probado en
tests existentes (§5.12).

### T7 — Verificación final

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~55 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   hooks/*.ts: 100/100/100/100
#   Resto: sen regresión (baseline post-7.4 mantida)
```

### T8 — Build + Lint + Format + Grep + Changeset + CHANGELOG

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/hooks/ packages/react/__tests__/hooks.test.tsx
```

`.changeset/hooks.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add hooks customizados (useSkillTree, useNodeState, useNodeSelector, useStat) (sub-phase 7.5)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: módulo de hooks customizados:
  - **`useSkillTree(engine)`**: devolve `TreeState` reactivo.
    Subscribe ao engine vía `useSyncExternalStore` nativo. SSR-safe.
  - **`useNodeState(engine, nodeId)`**: devolve `NodeInstance | null`
    para o nodeId, reactivo. Garantía de estabilidade referencial
    cando o NodeInstance subxacente non muda (Immer struct sharing).
  - **`useNodeSelector<T>(engine, nodeId, selector)`**: subscribe
    selectivamente. O resultado é T calculado por `selector(NodeInstance
    | null)`. **O selector debe ser referencialmente estable** entre
    renders (usar useCallback ou definir fora do compoñente);
    documentado no JSDoc.
  - **`useStat(engine, statId)`**: devolve `number` con
    `engine.getStat(statId)` actual, reactivo. Para statIds non
    declarados, devolve 0 (comportamento de core; cero throw).
- Tódolos hooks dispoñibles tanto desde `@yggdrasil-forge/react`
  (root entry con autoload de tema minimal) como desde
  `@yggdrasil-forge/react/headless` (independentes do tema).

### Note
- Sub-fase 7.5 QUINTA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS** (require APIs en core que aínda non existen):
  - `useTreeChanges` (require API pública de historial de
    TreeChanges).
  - `useGroupNodes` (require método getNodesByGroup en TreeEngine).
  - `useVisibleNodes` (require tipo Viewport no core).
  Estes 3 hooks volverase a abordar nunha sub-fase futura tras
  engadir as APIs subxacentes en core.
- **DIFERIDOS Fase 7 restante**: animacións CSS (7.6), keyboard/ARIA
  (7.7), prefers-reduced-motion (7.8), SSR/RSC entry points (7.9),
  mobile/touch (7.10), error boundaries (7.11), tests visuais (7.12).
- **`SkillTree.tsx` NON refactorizado** para usar `useSkillTree`
  internamente. Decisión consciente: o refactor é cosmético e o test
  existente asume o uso inline de useSyncExternalStore. Eventualmente
  poderá facerse nunha hixiene MASTER post-Fase 7.
- **`useNodeSelector` con selector inline**: o documento JSDoc avisa
  expresamente. Patrón estándar en React (idéntico a zustand).
- **`useStat` overhead**: re-computa stat en cada render. Documentado
  como característica. Consumidores con stats caros + alta frecuencia
  poden memoizar externamente.
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **Cero modificación de compoñentes ou tests existentes en
  packages/react/**. Tódolos 45 tests previos pasan intactos.
```

Commit Conventional:
`feat(react): add hooks customizados (useSkillTree, useNodeState, useNodeSelector, useStat) (sub-phase 7.5)`

### T9 — Push directo a origin/main (base 6860f76)

Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.5 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 6860f76)
✅ 4 hooks customizados: useSkillTree, useNodeState, useNodeSelector, useStat
✅ Cada hook con JSDoc completo (signature + behaviour + @example)
✅ Implementados sobre useSyncExternalStore nativo de React 18+
✅ Exportados tanto desde root entry como desde /headless
✅ 'use client' en cada hook (4 ficheiros); cero en hooks/index.ts
✅ Cero non-null assertions
✅ T0.2 APIs verificadas: TreeEngine.subscribe/getSnapshot/getStat,
   Selector type, TreeState shape
✅ T5 verificación intermedia: 45 tests previos pasan intactos
✅ CERO modificación de compoñentes existentes (SkillTree, SkillNode,
   SkillEdge, MeshOverlay, SVGRenderer, ThemeProvider,
   SkillTreeWithDefaultTheme)
✅ CERO modificación de módulos internos (svg-helpers,
   createDefaultLayoutRegistry, theme-types, themes/minimal)
✅ CERO modificación de tests existentes (smoke, SkillTree,
   MeshOverlay, SVGRenderer, ThemeProvider, themes, headless)
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ CERO refactor de SkillTree
✅ Tests: 55 pasan en react (10 novos, 45 previos intactos)
   - 2 useSkillTree
   - 2 useNodeState
   - 3 useNodeSelector
   - 2 useStat
   - 1 integración cross-hook
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - hooks/useSkillTree.ts: 100/100/100/100
   - hooks/useNodeState.ts: 100/100/100/100
   - hooks/useNodeSelector.ts: 100/100/100/100
   - hooks/useStat.ts: 100/100/100/100
   - hooks/index.ts: 100/100/100/100
   - Resto: sen regresión (baseline post-7.4 mantida)
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok (re-exports vía index + headless)
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.5 QUINTA da Fase 7.
   - 7 sub-fases pendentes (7.6 a 7.12).
   - Hooks useTreeChanges, useGroupNodes, useVisibleNodes DIFERIDOS
     (require APIs en core que aínda non existen).
   - SkillTree NON refactorizado para usar useSkillTree (decisión
     consciente; refactor cosmético).
   - useNodeSelector require selector estable; documentado.
   - useStat re-computa cada render; documentado.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 10 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.6 (animacións CSS).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.5. Quinta sub-fase da Fase 7. Sub-fase ben acoutada
con 4 hooks pequenos e independentes (cero modificación de pezas
existentes). Risco arquitectónico BAIXO-MEDIO: lóxica simple (cada
hook é ~15-30 liñas), pero require coidado con (a) estabilidade
referencial en useNodeState, (b) documentación clara de selector
estable en useNodeSelector, (c) overhead de re-computación en useStat.
Cero APIs novas en core. Cero deps novas. Cero ErrorCodes novos.
Calquera dúbida → ESCALAR.*

*Lección 7.2 L1 estendida aplicada rigorosamente: literais (Selector
type), APIs (TreeEngine.subscribe/getSnapshot/getStat), fixtures
(makeMinimalTreeDef reutilizado intacto), comportamento de borde
(`getStat` con statId inexistente devolve 0; verificable en T0.2).*
