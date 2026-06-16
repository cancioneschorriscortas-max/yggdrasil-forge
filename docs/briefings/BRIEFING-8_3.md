# BRIEFING — SUB-FASE 8.3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **TERCEIRA sub-fase da Fase 8** (Builds + Plugins + Search +
> Validators). Engade ao paquete `@yggdrasil-forge/core`:
> 1. **`RespecManager`** (interno; stateless calculator puro)
>    — calcula nodos a bloquear (con **cascade lock**) + Costs a
>    refundar segundo `costPercent`. **Cero modificación de state**
>    (puro; o caller aplica).
> 2. **`RespecOptions`** interface novo en `types/unlock.ts`:
>    `{ costPercent?: number }` (range [0, 100]; default 0 = full
>    refund; penalty model).
> 3. **TreeEngine.respec()** API nova: 1 método público async que
>    integra RespecManager + ResourceManager.refund + StateStore.update
>    + emit `respec` event + audit log.
> 4. **1 ErrorCode novo** baixo prefixo existente `YGG_B*`:
>    `YGG_B007 RESPEC_INVALID_COST_PERCENT` (validación de input
>    fora de [0, 100]).
>
> **Decisión arquitectónica clave**: `costPercent` é **penalty
> model** (Opción B do director):
> - `respec()` ou `respec(undefined)` ou `respec(undefined, { costPercent: 0 })`
>   → **full refund** (cero penalty).
> - `respec(undefined, { costPercent: 10 })` → devolve 90% (10%
>   penalty mantida polo motor).
> - Fórmula: **`refunded = original_total_cost * (1 - costPercent / 100)`**.
>
> **Hooks `beforeRespec`/`afterRespec` DIFERIDOS a 8.4** (PluginManager
> + HookRunner). 8.3 implementa respec puro sen chamar hooks. Os
> hooks quedan tipados pero NON chamados ata 8.4. **Documentado
> como coordinación pendente** no CHANGELOG.
>
> **Cero modificación** de calquera outro compoñente, manager ou
> test existente. Modificacións cirúrxicas en TreeEngine (+1 API),
> types/unlock.ts (+RespecOptions), types/index.ts (+re-export),
> e 2 ficheiros de common.
>
> 8.4-8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. **NOTA**:
"TODOS" en castelán/galego = "everything" (falso positivo do grep).
Documentado en 8.2 reporting. **Aplicar grep + filtrar falsos
positivos** se aparecen.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Especial
atención**: se descobres que `NodeDef.unlock?.costs` non ten o
shape esperado para refund cálculo, **ESCALAR** antes de inventar
workarounds.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional para
campos opcionais.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: pezas novas (RespecManager + respec API) chegan
a **100/100/100/100**. Cero regresión na baseline post-8.2.

**0.12 — Strings multiline**: single template literal (lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de
calquera ficheiro existente fora dos prescritos en §5.1. Tódolos
1588 core + 60 common + 193 storage + 116 react = 1957 tests
existentes deben pasar intactos.

**0.14 — Lección 8.1 L2 reaplicada**: T0.2 verifica empíricamente
acceso a `this.store.update()`, `this.store.getTreeDef()`,
`this.resources.refund()`, e `this.audit.record()` en TreeEngine
ANTES de prescribir uso.

**0.15 — Lección 8.1 L3**: código en §5.5 e §5.7 é fonte de
verdade; prosa coherente.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.3** de Yggdrasil Forge. **TERCEIRA da Fase 8**
(Builds + Plugins + Search + Validators).

**Pezas (6 grupos)**:

**Grupo A — ErrorCode novo**:
1. **`packages/common/src/errors/codes.ts`** (MODIFICADO): engadir
   1 entrada baixo o bloque `// Builds`:
   ```ts
   RESPEC_INVALID_COST_PERCENT = 'YGG_B007',
   ```
2. **`packages/common/src/errors/messages.ts`** (MODIFICADO):
   engadir 1 entrada (gl/es/en) para o ErrorCode anterior.

**Grupo B — RespecOptions interface**:
3. **`packages/core/src/types/unlock.ts`** (MODIFICADO): engadir
   `RespecOptions` interface despois de `RespecResult`.

**Grupo C — Re-export**:
4. **`packages/core/src/types/index.ts`** (MODIFICADO): engadir
   `RespecOptions` ao re-export de `unlock.js`.

**Grupo D — RespecManager (NOVO)**:
5. **`packages/core/src/builds/RespecManager.ts`** (NOVO; interno;
   cero export público). **Stateless calculator puro**: dado un
   `TreeState` + `TreeDef` + (nodeIds | undefined) + costPercent,
   devolve `{ toLock: string[], refunded: Cost[] }`. **Cero
   modificación de state**.

**Grupo E — TreeEngine.respec() API**:
6. **`packages/core/src/engine/TreeEngine.ts`** (MODIFICADO):
   engadir imports (RespecManager, RespecOptions, RespecResult) +
   1 API pública async `respec(nodeIds?, opts?): Promise<Result<RespecResult>>`
   que:
   - Valida costPercent ∈ [0, 100].
   - Chama `RespecManager.compute(...)`.
   - Aplica lock via `this.store.update(...)`.
   - Refund via `this.resources.refund(...)`.
   - Anota en audit log via `this.audit.record({ type: 'respec',
     nodeIds })`.
   - Emite `respec` event.
   - **NON** chama hooks beforeRespec/afterRespec (DIFERIDO a 8.4).

**Grupo F — Tests**:
7. **`packages/core/__tests__/builds/RespecManager.test.ts`** (NOVO;
   ~12 tests).
8. **`packages/core/__tests__/builds/TreeEngine.respec.test.ts`**
   (NOVO; ~10 tests).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros 14 paquetes
  scaffold.
- **Calquera outro ficheiro** en `packages/core/src/` fora dos
  prescritos en §5.1.
- **Calquera test existente** (1588 core, 60 common, etc.).
- `packages/core/src/builds/` ficheiros existentes (base64url,
  BuildSerializer, UrlSerializer, SnapshotManager, LoadoutManager —
  todos intactos).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `docs/architecture/MASTER.md`.

**CERO deps de npm engadidas.** Cero entry points novos. Cero
managers persistentes (RespecManager é stateless; cero storage).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `ad80454`, verificada
empíricamente en clone independente)**.

### MASTER §25 (literal)

```ts
await engine.respec()
await engine.respec(undefined, { costPercent: 10 })
```

### RespecResult xa tipado (verificado en types/unlock.ts:128)

```ts
export interface RespecResult {
  readonly nodeIds: readonly string[]
  readonly refunded: readonly Cost[]
}
```

**Cero modificación**. Reutilízase tal cal.

### Cost shape (verificado)

```ts
export interface Cost {
  readonly resourceId: string
  readonly amount: number
}
```

### NodeInstance shape (verificado)

```ts
export interface NodeInstance {
  id: string
  state: NodeState           // 'locked' | 'unlockable' | 'unlocked' | 'maxed' | etc.
  currentTier: number        // 0 = locked, n = tier n unlocked
  progress?: number
}
```

**Decisión do Director**: nodo "unlocked" significa `state === 'unlocked'` ou `state === 'maxed'` ou `state === 'in_progress'`. **Para respec**: bloquear calquera nodo con `currentTier > 0`.

### EdgeType para cascade (verificado)

```ts
export type EdgeType = 'dependency' | 'soft_dependency' | 'exclusion' | 'enhancement'
```

**Decisión do Director**: cascade lock só por `'dependency'` edges (hard prerequisites). `'soft_dependency'` NON propaga lock (definición de "soft").

### ResourceManager.refund (verificado)

```ts
refund(costs: readonly Cost[], budget: Budget): Budget
```

**Devolve novo Budget** (immutable). **Cero side effects no
ResourceManager** mesmo.

### TreeEngine internals (verificado lección 8.1 L2)

- `this.store: StateStore` — privado readonly.
  - `this.store.getState(): TreeState` — lectura.
  - `this.store.getTreeDef(): TreeDef` — lectura.
  - `this.store.update(producer): void` — mutación con Immer
    producer.
- `this.resources: ResourceManager` — privado readonly.
  - `this.resources.refund(costs, budget): Budget` — calcular
    refund.
  - **NOTA**: ResourceManager interno mantén budget. Vou verificar
    se refund actualiza state ou só calcula. **Análise empírica
    en T0.2**.
- `this.audit: AuditLogger` — privado readonly.
  - `this.audit.record({ type: 'respec', nodeIds }): AuditEntry | null`.
- `this.events: EventEmitter` — privado readonly.
  - `this.events.emit('respec', nodeIds): void`.

### Hooks DIFERIDOS

`Hooks.beforeRespec` e `Hooks.afterRespec` tipados en `plugin.ts`
**pero non chamados** (cero HookRunner aínda). 8.3 implementa
respec puro; **8.4 conectará os hooks**.

**Documentar explícitamente** no CHANGELOG como "coordinación
pendente con 8.4".

### Sobre `engine.lock(nodeId)` existente

TreeEngine xa ten `async lock(nodeId)` pública (línea 1098).

**Decisión do Director**: **cero reutilizar `lock()` desde respec**.
Razóns:
- `lock()` é individual; cascade requíre lock múltiple.
- `lock()` ten o seu propio audit + event; respec ten os seus.
- Performance: respec aplica lock múltiple nun só `store.update()`
  atómico (cero N updates separados).

**RespecManager calcula listaxe de nodos a bloquear**; TreeEngine
aplica todos nun `store.update()` único.

### Cascade lock lóxica

**Algoritmo**:
1. Inicializar `toLock = Set(initialNodeIds ?? allUnlockedNodeIds)`.
2. Loop fixpoint:
   - Para cada nodo unlocked NON en `toLock`:
     - Comprobar se algún `'dependency'` edge apunta a un nodo en
       `toLock`.
     - Se sí, engadir o nodo a `toLock` (cascade).
3. Repetir ata cero cambios nun ciclo completo.

**Determinismo**: orde de iteración estable (Map insertion order).

### Cost calculation para refund

**Para cada nodo en `toLock`**:
- Lookup `NodeDef = treeDef.nodes.find(n => n.id === nodeId)`.
- `NodeDef.unlock?.costs` é o cost **por tier** (verificable en
  T0.2).
- Total pagado polo nodo = `nodeInstance.currentTier * costs[i]`
  para cada Cost.

**Acumular** todos os Costs en `refundedRaw`.

**Aplicar costPercent**: `refunded[i].amount = floor(refundedRaw[i].amount * (1 - costPercent/100))`.

**Decisión do Director sobre rounding**: `Math.floor` (cero
fraccional refund; conservative para o usuario; cumpre constraint
"cero negative budget").

### Estado scaffold tras 8.2

```
packages/core/src/builds/
├── base64url.ts                 (existente 8.1)
├── BuildSerializer.ts           (existente 8.1)
├── UrlSerializer.ts             (existente 8.1)
├── SnapshotManager.ts           (existente 8.2)
├── LoadoutManager.ts            (existente 8.2)
└── RespecManager.ts             (NOVO 8.3)

packages/core/__tests__/builds/
├── base64url.test.ts            (existente 8.1)
├── BuildSerializer.test.ts      (existente 8.1)
├── UrlSerializer.test.ts        (existente 8.1)
├── TreeEngine.shareBuild.test.ts (existente 8.1)
├── SnapshotManager.test.ts      (existente 8.2)
├── LoadoutManager.test.ts       (existente 8.2)
├── TreeEngine.snapshot.test.ts  (existente 8.2)
├── TreeEngine.loadout.test.ts   (existente 8.2)
├── RespecManager.test.ts        (NOVO 8.3)
└── TreeEngine.respec.test.ts    (NOVO 8.3)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `ad80454` (sub-fase 8.2 — Loadouts +
  Snapshots managers).
- 1588 core + 60 common + 193 storage + 116 react = 1957 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 42 ErrorCodes existentes (incluído B001-B006).
- DT abertas: 11.
- **Cadea 39 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/core` un **`RespecManager`
stateless calculator puro** en `packages/core/src/builds/` (compute
lista de nodos a bloquear con **cascade lock por `'dependency'`
edges** + Costs a refundar segundo `costPercent` penalty model;
cero modificación de state); + **`RespecOptions` interface novo**
en `types/unlock.ts` (`{ costPercent? }`, range [0, 100], default
0); + **TreeEngine.respec(nodeIds?, opts?)** API pública async que
integra RespecManager + ResourceManager.refund + StateStore.update
atómico + audit log + emit event; + **1 ErrorCode novo** baixo
prefixo existente `YGG_B*` (B007 RESPEC_INVALID_COST_PERCENT) con
mensaxes gl/es/en; + tests específicos (~22). **Hooks beforeRespec
/afterRespec DIFERIDOS a 8.4** (tipados pero non chamados). **Cero
modificación de pezas existentes** salvo TreeEngine cirúrxico (+1
API) + 3 ficheiros de tipos + 2 de common.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (3)**:
- `packages/core/src/builds/RespecManager.ts` (~140 liñas).
- `packages/core/__tests__/builds/RespecManager.test.ts` (~200
  liñas; ~12 tests).
- `packages/core/__tests__/builds/TreeEngine.respec.test.ts` (~180
  liñas; ~10 tests).
- `.changeset/respec-manager.md` (NOVO).

**MODIFICADOS (6)**:
- `packages/common/src/errors/codes.ts` (engadir 1 entrada).
- `packages/common/src/errors/messages.ts` (engadir 1 entrada
  gl/es/en).
- `packages/core/src/types/unlock.ts` (engadir RespecOptions
  interface).
- `packages/core/src/types/index.ts` (engadir RespecOptions ao
  re-export).
- `packages/core/src/engine/TreeEngine.ts` (engadir imports + 1
  API).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de** (lista completa):
- Calquera outro ficheiro en `packages/core/src/`.
- Tests existentes (62 ficheiros en core + 4 builds/ 8.1 + 4
  builds/ 8.2).
- `packages/storage/`, `packages/react/`, outros 14 paquetes
  scaffold.
- Outros ficheiros de tipos (build.ts, tree.ts, events.ts, etc.).
- Outros ficheiros de manager (SnapshotManager, LoadoutManager,
  TreeRegistry, etc.).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `docs/architecture/MASTER.md`.

### 5.2 — RespecOptions interface (FIXADO)

**Engadir** en `packages/core/src/types/unlock.ts` despois de
`RespecResult`:

```ts
/**
 * Opcións para `engine.respec()`.
 *
 * Sub-fase 8.3.
 */
export interface RespecOptions {
  /**
   * Porcentaxe do cost ORIXINAL que se mantén polo motor (penalty).
   *
   * Range: [0, 100]. Default 0 (full refund; cero penalty).
   *
   * Fórmula: `refunded = original_cost * (1 - costPercent / 100)`.
   *
   * @example
   * { costPercent: 0 }   // full refund (igual que cero opts)
   * { costPercent: 10 }  // devolve 90%, motor mantén 10%
   * { costPercent: 100 } // cero refund (penalty total)
   */
  readonly costPercent?: number
}
```

### 5.3 — Re-export en types/index.ts (FIXADO)

**Engadir** `RespecOptions` ao re-export existente de unlock.js:

```ts
// Actualizar de:
//   export type { ..., RespecResult } from './unlock.js'
// a:
//   export type { ..., RespecOptions, RespecResult } from './unlock.js'
```

**Verificar empíricamente** o re-export actual de unlock.js en
types/index.ts e engadir `RespecOptions` na liña correspondente.

### 5.4 — ErrorCodes en codes.ts (FIXADO)

**Engadir** despois das entradas existentes do bloque `// Builds`
(B001-B006):

```ts
  RESPEC_INVALID_COST_PERCENT = 'YGG_B007',
```

### 5.5 — Mensaxes en messages.ts (FIXADO)

**Engadir** despois das entradas existentes (B001-B006):

```ts
  [ErrorCode.RESPEC_INVALID_COST_PERCENT]: {
    gl: 'costPercent inválido: debe estar en [0, 100]; recibido {value}',
    es: 'costPercent inválido: debe estar en [0, 100]; recibido {value}',
    en: 'Invalid costPercent: must be in [0, 100]; received {value}',
  },
```

### 5.6 — RespecManager.ts (FIXADO)

```ts
// packages/core/src/builds/RespecManager.ts
// ── INICIO: RespecManager ──
// Stateless calculator puro para respec: dado un TreeState +
// TreeDef + (nodeIds | undefined) + costPercent, calcula:
// - Lista de nodos a bloquear (con cascade por 'dependency' edges).
// - Costs a refundar (aplicando penalty costPercent).
//
// **Cero modificación de state**. O caller aplica os resultados.

import type {
  Cost,
  EdgeDef,
  NodeDef,
  NodeInstance,
  TreeDef,
  TreeState,
} from '../types/index.js'

/**
 * Resultado interno de RespecManager.compute().
 *
 * - `toLock`: ids dos nodos a bloquear (inclúe cascade).
 * - `refunded`: Costs totais a refundar (aplicado costPercent).
 */
export interface RespecComputeResult {
  readonly toLock: readonly string[]
  readonly refunded: readonly Cost[]
}

/**
 * Calcula o resultado dunha operación respec.
 *
 * @param state Estado actual do engine.
 * @param treeDef Definición do tree (para nodos e edges).
 * @param nodeIds Subset selectivo, ou undefined para respec
 *   completo (tódolos nodos con currentTier > 0).
 * @param costPercent Penalty en [0, 100]. Cero validación neste
 *   nivel (caller valida).
 */
export function compute(
  state: TreeState,
  treeDef: TreeDef,
  nodeIds: readonly string[] | undefined,
  costPercent: number,
): RespecComputeResult {
  // 1. Lista inicial de nodos a bloquear:
  const initialToLock = new Set<string>()
  if (nodeIds === undefined) {
    // Full respec: tódolos nodos con currentTier > 0.
    for (const [id, instance] of Object.entries(state.nodes)) {
      if (instance.currentTier > 0) initialToLock.add(id)
    }
  } else {
    for (const id of nodeIds) {
      const instance = state.nodes[id]
      if (instance !== undefined && instance.currentTier > 0) {
        initialToLock.add(id)
      }
    }
  }

  // 2. Cascade lock por 'dependency' edges (fixpoint).
  const toLock = new Set(initialToLock)
  const edges = treeDef.edges
  let changed = true
  while (changed) {
    changed = false
    for (const [id, instance] of Object.entries(state.nodes)) {
      if (toLock.has(id)) continue
      if (instance.currentTier === 0) continue
      // ¿Algún 'dependency' edge target apunta a este nodo desde
      // un source en toLock? Iso significa que este nodo depende
      // dun bloqueado → cascade lock.
      for (const edge of edges) {
        if (edge.type !== 'dependency') continue
        if (edge.target === id && toLock.has(edge.source)) {
          toLock.add(id)
          changed = true
          break
        }
      }
    }
  }

  // 3. Calcular refund total (acumular Costs).
  const refundMap = new Map<string, number>()
  for (const id of toLock) {
    const nodeDef = treeDef.nodes.find((n) => n.id === id)
    const instance = state.nodes[id]
    if (nodeDef === undefined || instance === undefined) continue
    const costs = nodeDef.unlock?.costs
    if (costs === undefined) continue
    for (const cost of costs) {
      // Total pagado polo nodo: cost.amount * currentTier.
      const totalPaid = cost.amount * instance.currentTier
      const prev = refundMap.get(cost.resourceId) ?? 0
      refundMap.set(cost.resourceId, prev + totalPaid)
    }
  }

  // 4. Aplicar costPercent penalty (Math.floor).
  const factor = 1 - costPercent / 100
  const refunded: Cost[] = []
  for (const [resourceId, total] of refundMap) {
    const refundedAmount = Math.floor(total * factor)
    if (refundedAmount > 0) {
      refunded.push({ resourceId, amount: refundedAmount })
    }
  }

  return {
    toLock: Array.from(toLock),
    refunded,
  }
}
// ── FIN: RespecManager ──
```

**Decisións nesta peza**:
- **Cero exposición de clase**: só function `compute` exportada
  (interna).
- **Cero side effects**: cero modifica state, treeDef, etc.
- **Determinismo**: orde de iteración estable (Object.entries +
  Set insertion order).
- **Cascade fixpoint**: itera ata estable; cero perda de cascade
  profundo.
- **Math.floor**: refund truncado (cero fraccionais).
- **`refundedAmount > 0` filter**: cero engade Costs de 0 amount
  (cleanup).
- **NodeDef lookup via `find`**: cero asumir Map; treeDef.nodes é
  array.
- **`nodeDef === undefined` defensiva**: skip silenciosamente
  (cero error funcional; outras pezas xa validan integridade).

### 5.7 — TreeEngine.respec() API (FIXADO)

**Engadir imports** ao top de TreeEngine.ts (despois dos
existentes):

```ts
import { compute as computeRespec } from '../builds/RespecManager.js'
```

**Engadir tipos** ao import existente:

```ts
import type {
  // ... existentes
  RespecOptions,    // ← engadir
  // ... resto existentes
} from '../types/index.js'
```

**Engadir API pública** despois de `deleteLoadout` (que é da
sub-fase 8.2):

```ts
// ── Respec (8.3) ──

/**
 * Realiza un respec do engine: bloquea nodos (con cascade por
 * 'dependency' edges) e devolve Costs ao budget.
 *
 * @param nodeIds Subset selectivo (esos nodos + cascade). Se
 *   undefined: respec completo (tódolos nodos con tier > 0).
 * @param opts Opcións. `costPercent` é penalty en [0, 100] (default
 *   0 = full refund).
 *
 * @returns `Result<RespecResult>` con `nodeIds` (bloqueados;
 *   inclúe cascade) e `refunded` (Costs devoltos).
 *
 * **NOTA (coordinación pendente con 8.4)**: hooks `beforeRespec`
 * e `afterRespec` están tipados pero **NON se chaman aínda**.
 * Conectaranse en 8.4 PluginManager + HookRunner.
 *
 * @example
 * // Full respec, full refund:
 * await engine.respec()
 *
 * // Full respec con 10% penalty (devolve 90%):
 * await engine.respec(undefined, { costPercent: 10 })
 *
 * // Selective respec (só nodos especificados + cascade):
 * await engine.respec(['node-1', 'node-2'])
 */
async respec(
  nodeIds?: readonly string[],
  opts?: RespecOptions,
): Promise<Result<RespecResult>> {
  // Validación de costPercent:
  const costPercent = opts?.costPercent ?? 0
  if (costPercent < 0 || costPercent > 100 || !Number.isFinite(costPercent)) {
    return err(
      new YggdrasilError(
        ErrorCode.RESPEC_INVALID_COST_PERCENT,
        getErrorMessage(ErrorCode.RESPEC_INVALID_COST_PERCENT, this.locale, {
          value: String(costPercent),
        }),
      ),
    )
  }

  // Calcular resultado (puro):
  const state = this.store.getState()
  const treeDef = this.store.getTreeDef()
  const result = computeRespec(state, treeDef, nodeIds, costPercent)

  // Aplicar lock + refund nun update() atómico:
  this.store.update((draft) => {
    for (const id of result.toLock) {
      const instance = draft.nodes[id]
      if (instance === undefined) continue
      instance.state = 'locked'
      instance.currentTier = 0
      // Cero reset de progress (decisión MASTER 2.4.b §5.8):
      // tras respec, o progreso mantense (cero usuario espera que
      // un respec borre o seu progreso interno).
    }
    // Refund ao budget (via ResourceManager calcula novo Budget):
    const newBudget = this.resources.refund(result.refunded, draft.budget)
    draft.budget = castDraft(newBudget)
  })

  // Invalidar caches afectados:
  this.store.invalidate(ALL_CACHE_TYPES)

  // Audit:
  this.audit.record({
    type: 'respec',
    nodeIds: result.toLock,
  })

  // Emit event:
  this.events.emit('respec', result.toLock)

  return ok({
    nodeIds: result.toLock,
    refunded: result.refunded,
  })
}
```

**Decisións nesta peza**:
- **Validación de costPercent**: inclúe `Number.isFinite` para
  rexeitar NaN/Infinity.
- **`opts?.costPercent ?? 0`**: default 0 (full refund).
- **`store.update()` único**: atomic; cero múltiples notificacións
  intermedias.
- **`castDraft(newBudget)`**: patrón Immer para asignar valor
  externo a draft (verificable en T0.2 que TreeEngine.ts xa importa
  castDraft).
- **`ALL_CACHE_TYPES`**: invalidar tódolos caches tras respec
  (analogo a restoreSnapshot/loadLoadout de 8.2).
- **`audit.record({ type: 'respec', nodeIds })`**: AuditAction xa
  tipado.
- **`events.emit('respec', nodeIds)`**: EventMap.respec xa existe.
- **Cero chamada de hooks**: DIFERIDO a 8.4 (documentado en JSDoc).
- **Cero reset de progress**: comportamento canónico segundo MASTER
  2.4.b §5.8 (verificado).
- **`Number.isFinite(costPercent)` orden**: aplica primeiro despois
  da operación `||` xerar resultado coherente.

### 5.8 — Tests prescritos (~22 totais)

**`__tests__/builds/RespecManager.test.ts`** (~12 tests):

1. `compute()` con cero nodos unlocked: `toLock=[]`, `refunded=[]`.
2. `compute()` full respec: lockea tódolos con tier>0.
3. `compute()` selective: só ids especificados.
4. `compute()` selective con id non-unlocked: skip silenciosamente.
5. `compute()` cascade básico: A→B (dependency), respec(A) tamén
   bloquea B.
6. `compute()` cascade profundo: A→B→C, respec(A) bloquea todos.
7. `compute()` cero cascade por `soft_dependency` (só
   `'dependency'`).
8. `compute()` refund básico: nodo con cost {gold: 10} tier 1 →
   refund {gold: 10}.
9. `compute()` refund tiered: nodo con cost {gold: 10} tier 3 →
   refund {gold: 30}.
10. `compute()` refund con costPercent=50: tier 1 cost 10 → refund
    5 (Math.floor).
11. `compute()` refund con costPercent=100: cero refund.
12. `compute()` refund múltiples nodos suma resources: nodo A {gold:10}
    + nodo B {gold:5, mana:3} → refund {gold:15, mana:3}.

**`__tests__/builds/TreeEngine.respec.test.ts`** (~10 tests):

13. `engine.respec()` devolve `ok(RespecResult)` con cero state
    inicial → `toLock=[]`.
14. `engine.respec()` tras unlock dun nodo: bloquea + devolve cost.
15. `engine.respec({ costPercent: -1 })` devolve
    `err(RESPEC_INVALID_COST_PERCENT)`.
16. `engine.respec({ costPercent: 101 })` devolve err.
17. `engine.respec({ costPercent: NaN })` devolve err.
18. `engine.respec(['node-1'])` selective: bloquea só node-1 +
    cascade.
19. `engine.respec()` actualiza budget (refund aplicado).
20. `engine.respec()` emite `respec` event con nodeIds correcto.
21. `engine.respec()` anota en audit log (`type: 'respec'`).
22. Roundtrip: unlock → respec → state.nodes[id].state === 'locked'
    + budget restaurado.

**Total: ~22 tests novos**. Post-8.3 esperado: 1588 → **~1610 core
tests**.

**Decisión sobre fixtures**: reutilizar helpers e tree defs dos
tests previos de 8.2 (cero duplicación). Se require un treeDef
específico con edges 'dependency' para cascade tests, definir
inline.

### 5.9 — Cobertura prescrita

- **RespecManager.ts**: **100/100/100/100** (función pura simple
  cubrible).
- **TreeEngine.ts**: manter baseline; cobertura do método novo
  (validación + integration) = 100% nas liñas novas.
- **types/unlock.ts**: cero impacto (tipos puros).
- **packages/common**: cobertura mantida.
- **Cero regresión** noutras pezas.

### 5.10 — Cero deps novas

Verificable empíricamente: cero modificación de `package.json` deps
nin lockfile.

### 5.11 — Test counts esperados post-8.3

- **core**: 1588 + ~22 = **~1610 tests**.
- **common, storage, react**: intactos.

### 5.12 — Sobre hooks DIFERIDOS

Hooks `beforeRespec` e `afterRespec` están tipados en plugin.ts
**pero non chamados**. **Coordinación con 8.4 PluginManager +
HookRunner** documentada explicitamente:

- JSDoc do método respec inclúe NOTE explícita.
- CHANGELOG inclúe sección "Note" con explicación.
- Sub-fase 8.4 conectará hooks via HookRunner; cero modificación
  de respec API public esperada en 8.4 (só implementación interna).

### 5.13 — Sobre cero reset de progress

Decisión MASTER 2.4.b §5.8: **respec NON reseta progress**. Tras
desbloquear, establecer progreso, e logo facer respec, o progreso
mantense.

**Implementación**: en `store.update((draft) => ...)`, cero
`instance.progress = undefined` nin similar. Só:
- `instance.state = 'locked'`
- `instance.currentTier = 0`

Razón: o progreso é un "tracking externo" (e.g., XP acumulada);
cero usuario espera que un respec borre o progreso interno do nodo.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| RespecManager.compute | función pura | RespecManager.ts | ~140 |
| RespecOptions | TS interface | types/unlock.ts | +20 |
| Re-export | export type | types/index.ts | +1 modif |
| 1 ErrorCode | enum entry | codes.ts | +2 |
| 1 mensaxe gl/es/en | object entry | messages.ts | +6 |
| TreeEngine.respec() | método público | TreeEngine.ts | +80 |
| 2 ficheiros tests | describe blocks | 2 .test.ts | ~380 |

**Total estimado**: ~250 liñas de código + ~380 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (4)**:
- `packages/core/src/builds/RespecManager.ts`
- `packages/core/__tests__/builds/RespecManager.test.ts`
- `packages/core/__tests__/builds/TreeEngine.respec.test.ts`
- `.changeset/respec-manager.md`

**MODIFICADOS (6)**:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/types/unlock.ts`
- `packages/core/src/types/index.ts`
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 10 ficheiros tocados** (4 NOVOS + 6 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`.
- Tests existentes (1588 core + outros).
- `packages/storage/`, `packages/react/`, outros paquetes.
- `package.json`, `tsconfig.json`, `tsup.config.ts`, etc.
- `docs/architecture/MASTER.md`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Función pura en `.ts` puro. Cero clases (cero require state).

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** no método `respec` (incluído NOTE sobre hooks
DIFERIDOS).

**JSDoc en RespecManager.compute**: básico.

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Patrón Result**: `respec` devolve `Result<RespecResult>`.

**Cero throw**: respec encerra erros en Result.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/`, `packages/react/`, outros
  paquetes scaffold.
- ❌ Modificar **calquera outro ficheiro** en `packages/core/src/`
  fora dos 5 prescritos en §5.1.
- ❌ Modificar `StateStore.ts`, `ResourceManager.ts`,
  `EventEmitter.ts`, `AuditLogger.ts` (cero require; uso só da
  API existente).
- ❌ Modificar `JsonSerializer.ts`, `SnapshotManager.ts`,
  `LoadoutManager.ts`, `BuildSerializer.ts`, etc. (cero require).
- ❌ Modificar **calquera test existente** (1588 core + 60 common
  + 193 storage + 116 react = 1957 intactos).
- ❌ Chamar hooks `beforeRespec` ou `afterRespec` (DIFERIDO a 8.4).
- ❌ Resetar `progress` en respec (decisión MASTER 2.4.b §5.8).
- ❌ Engadir HookRunner (sub-fase 8.4).
- ❌ Engadir PluginManager (sub-fase 8.4).
- ❌ Engadir search ou validators (sub-fases 8.6/8.7).
- ❌ Modificar TreeEngine doutras formas (cero modificación de
  existing methods; só engadir 1 método novo).
- ❌ Exportar RespecManager publicamente (interno).
- ❌ Cascade por `soft_dependency`, `exclusion`, ou `enhancement`
  edges (só `'dependency'` é hard prereq).
- ❌ Engadir deps de npm.
- ❌ Engadir Zod schemas (validación inline é suficiente).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir Date.now() ou Math.random() en RespecManager.compute
  (función pura; determinismo total).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa + lección 8.1 L2 reaplicada

**T0.1** — `git status` limpo. `git log -1` mostra `ad80454` como HEAD.

**T0.2** — Verificacións empíricas críticas (lección 8.1 L2 — verificar
acceso a internals):

```bash
# Confirmar RespecResult + Cost xa tipados:
grep -E "interface RespecResult|interface Cost" packages/core/src/types/*.ts | head -3
# esperado: 2 matches

# Confirmar ResourceManager.refund existe + signature:
grep -A 1 "refund(costs" packages/core/src/engine/ResourceManager.ts | head -3
# esperado: 1 match con (costs, budget): Budget

# Confirmar EventMap.respec existe:
grep -E "readonly respec:" packages/core/src/types/events.ts | head -3
# esperado: 1 match

# Confirmar AuditAction 'respec' tipado:
grep -E "type: 'respec'" packages/core/src/types/audit.ts | head -3
# esperado: 1 match

# Confirmar castDraft xa importado en TreeEngine:
grep -E "castDraft" packages/core/src/engine/TreeEngine.ts | head -3
# esperado: 1+ match (import + uso)

# Confirmar ALL_CACHE_TYPES exportado:
grep -E "export const ALL_CACHE_TYPES" packages/core/src/engine/StateStore.ts
# esperado: 1 match

# Confirmar NodeDef.unlock.costs shape:
grep -B 1 -A 5 "unlock?:" packages/core/src/types/node.ts | head -10
# esperado: estrutura coherente (cost[] por tier)
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1588 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir ErrorCode + mensaxe a common

Aplicar §5.4 e §5.5 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/common test --force      # 60 tests
```

### T2 — Engadir RespecOptions + re-export

Aplicar §5.2 e §5.3 literal.

**Verificación intermedia**:
```bash
pnpm turbo run typecheck --force                          # 22/22 esperado
```

Tódolos 1588 tests pasan intactos. Se algún falla → **ESCALAR**.

### T3 — Crear RespecManager.ts

Aplicar §5.6 literal.

### T4 — Crear test RespecManager.test.ts

Aplicar §5.8 literal (12 tests).

**Verificación intermedia**:
```bash
pnpm --filter @yggdrasil-forge/core test --force        # 1588 + 12 = 1600
```

### T5 — Modificar TreeEngine (imports + 1 API)

Aplicar §5.7 literal.

### T6 — Verificación intermedia core (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1600 tests
```

Tódolos 1588 + 12 tests pasan intactos. Se algún falla →
**ESCALAR**.

### T7 — Crear test TreeEngine.respec.test.ts

Aplicar §5.8 literal (10 tests).

### T8 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1610 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "RespecManager|TreeEngine|^All files"
# Cobertura targets:
#   RespecManager.ts: 100/100/100/100
#   TreeEngine.ts: baseline mantida ou superada
#   Resto: sen regresión
```

### T9 — Build + Lint + Format + Grep + Changeset + commit + push

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/builds/RespecManager.ts \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/src/types/unlock.ts \
  packages/core/__tests__/builds/RespecManager.test.ts \
  packages/core/__tests__/builds/TreeEngine.respec.test.ts
# NOTA: "TODOS"/"TODO" en castelán/galego = "everything"; falso
# positivo. Filtrar mentalmente se aparece.
```

`.changeset/respec-manager.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): add RespecManager + engine.respec() API (sub-phase 8.3)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio con contido
detallado (incluír RespecManager + RespecOptions + 1 API + 1
ErrorCode + cascade lógica + cost calculation + costPercent
semantics + hooks DIFERIDOS + cero reset progress).

Commit Conventional:
`feat(core): add RespecManager + engine.respec() API (sub-phase 8.3)`

Push directo a `origin/main` (base `ad80454`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base ad80454)
✅ RespecManager.ts NOVO (stateless calculator puro)
✅ RespecOptions interface novo (costPercent? penalty model)
✅ TreeEngine.respec(nodeIds?, opts?) API nova:
   - Validación costPercent ∈ [0, 100] + Number.isFinite
   - Cascade lock por 'dependency' edges (fixpoint)
   - Cost calculation tiered (currentTier × cost.amount)
   - Refund con Math.floor (cero fraccionais)
   - store.update() atómico (lock + refund nun só update)
   - invalidate(ALL_CACHE_TYPES)
   - audit.record({ type: 'respec', nodeIds })
   - emit 'respec' event
   - Cero hooks (DIFERIDO a 8.4)
   - Cero reset de progress (MASTER 2.4.b §5.8)
✅ 1 ErrorCode novo: YGG_B007 RESPEC_INVALID_COST_PERCENT
✅ Mensaxe localizada gl/es/en
✅ T0.2 verificación empírica: RespecResult + Cost xa tipados,
   ResourceManager.refund + EventMap.respec + AuditAction respec
   xa tipados, castDraft + ALL_CACHE_TYPES dispoñibles
✅ T2 typecheck post-tipos: 22/22, 1588 tests intactos
✅ T6 verificación intermedia: 1588 + 12 = 1600 tests pasan
✅ CERO modificación de pezas existentes en packages/core/src/
   salvo TreeEngine.ts (+imports +1 API) e 4 ficheiros de tipos/common
✅ CERO modificación de tests existentes (1588 core + 60 common +
   193 storage + 116 react = 1957 intactos)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ Tests: 1588 + 22 = ~1610 core tests
   - 12 RespecManager (compute + cascade + refund + costPercent)
   - 10 TreeEngine.respec (basic, validation, events, audit, roundtrip)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - RespecManager.ts: 100/100/100/100
   - TreeEngine.ts: baseline mantida
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias (filtrar "TODOS"
   castelán/galego)
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.3 TERCEIRA da Fase 8.
   - 5 sub-fases pendentes (8.4-8.8).
   - 40 sub-fases consecutivas sen rollback.
   - Hooks beforeRespec/afterRespec DIFERIDOS a 8.4 (conexión
     via HookRunner; cero modificación de respec API esperada).
   - Cero reset de progress en respec (MASTER 2.4.b §5.8).
   - costPercent penalty model: default 0 = full refund.
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 10 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.4 (PluginManager + HookRunner;
probable decomposición 8.4.a + 8.4.b + 8.4.c).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.3. **TERCEIRA sub-fase da Fase 8**. Engade
RespecManager stateless calculator puro + 1 API respec() en
TreeEngine + RespecOptions interface + 1 ErrorCode novo. **Hooks
DIFERIDOS a 8.4**. **Cero reset de progress** (MASTER 2.4.b §5.8).
**costPercent penalty model** (Opción B; default 0 = full refund).
**Cascade lock só por 'dependency' edges** (hard prereqs). Risco
MEDIO: 10 ficheiros tocados (4 NOVOS + 6 MODIFICADOS), ~22 tests
novos, cero managers persistentes, cero storage integration nova.
Mitigación con T0.2 (lección 8.1 L2 reaplicada), T2 (typecheck tras
tipos), T6 (1600 tests pasan tras integration). Calquera dúbida
→ ESCALAR.*

*Leccións 8.1 aplicadas: L1 (cero conflito de nomes RespecOptions),
L2 (T0.2 verifica acceso a internals), L3 (código fonte de verdade;
prosa coherente).*
