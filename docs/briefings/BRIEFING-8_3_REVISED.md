# BRIEFING — SUB-FASE 8.3 REVISED de Yggdrasil Forge

> Pega este documento no chat executor. **REEMPLAZA o briefing 8.3
> anterior** que estaba roto por erro do Director (asumiu non-existencia
> dun método `respec` que xa existe na liña 1198 de TreeEngine.ts con
> ~150 liñas + 19 tests dependentes).
>
> **DESCARTA todo o traballo local en 8.3 anterior**: RespecManager.ts,
> tests, e modificacións en TreeEngine.ts non commitedas. Comeza
> dende cero co BRIEFING-8.3-REVISED.
>
> **Scope rediseñado (MODIFICACIÓN CIRÚRXICA BACKWARD-COMPATIBLE)**:
> 1. **Cero `RespecManager.ts` standalone** (overengineering; o método
>    `respec` existente xa fai cascade + refund + atomic update + audit
>    + events + statComputer invalidation; engadir un manager external
>    é redundante).
> 2. **MODIFICACIÓN cirúrxica do método `respec` existente** en
>    TreeEngine.ts (línea 1198) para:
>    - Aceptar **`nodeIdOrIds?: string | readonly string[]`** ademais
>      do `string?` actual (backward-compatible via union type +
>      normalización interna).
>    - Aceptar **`opts?: RespecOptions`** novo segundo argumento.
>    - Aplicar **`costPercent` factor** no cost calculation (cero
>      cambio se costPercent === 0; preserva referencias exactas).
> 3. **`RespecOptions` interface novo** en `types/unlock.ts`:
>    `{ costPercent?: number }` (range [0, 100]; default 0 = full
>    refund; penalty model).
> 4. **1 ErrorCode novo** baixo prefixo existente `YGG_B*`:
>    `YGG_B007 RESPEC_INVALID_COST_PERCENT` (validación tras read-only
>    check).
>
> **Garantías de backward-compatibility (DURAS)**:
> - **Tódolos 19 tests existentes** que chaman `engine.respec()` ou
>   `engine.respec('a')` deben pasar **inchanged** (cero modificación
>   de tests existentes).
> - **Cero cambio de comportamento** cando `opts === undefined` ou
>   `opts.costPercent === 0`.
> - **Cero cambio de comportamento** para chamadas con single string.
>
> **Hooks `beforeRespec`/`afterRespec` SEGUEN DIFERIDOS a 8.4**.
>
> **Lección 8.3 L1 capturada** (verificar empíricamente a existencia
> dun método antes de prescribir API "nova"; o grep en T0.2 do
> briefing anterior foi insuficiente).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.3 (REVISED) — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.3 (REVISED) — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: as ramas novas de costPercent + array branch
chegan a **100% cobertura**. Cero regresión na baseline post-8.2.

**0.12 — GARANTÍA DE INMUTABILIDADE DE TESTS**: Cero modificación
de calquera test existente. **Especialmente**: tests con `.respec()`
ou `.respec('a')` en:
- `TreeEngine.audit.test.ts`
- `TreeEngine.stats.test.ts`
- `TreeEngine.mutations.test.ts`
- `TreeEngine.progress.test.ts`
- `TreeEngine.subtrees.test.ts`
- `integration/lifecycle.test.ts`
- `integration/audit.test.ts`
- `integration/economy.test.ts`

**Tódolos 1588 tests existentes deben pasar intactos**.

**0.13 — DESCARTAR TRABALLO LOCAL ANTERIOR**: se houbo cambios
locais do briefing 8.3 anterior (RespecManager.ts novo, modificacións
en TreeEngine.ts), **descártanse antes de empezar**:
```bash
git reset --hard origin/main
git clean -fd
```

---

## 1. IDENTIFICACIÓN

Sub-fase **8.3 REVISED** de Yggdrasil Forge. **TERCEIRA da Fase 8**.

**Pezas (5 grupos)**:

**Grupo A — ErrorCode novo**:
1. **`packages/common/src/errors/codes.ts`** (MODIFICADO): engadir
   1 entrada baixo o bloque `// Builds`:
   ```ts
   RESPEC_INVALID_COST_PERCENT = 'YGG_B007',
   ```
2. **`packages/common/src/errors/messages.ts`** (MODIFICADO):
   engadir 1 entrada (gl/es/en).

**Grupo B — RespecOptions interface**:
3. **`packages/core/src/types/unlock.ts`** (MODIFICADO): engadir
   `RespecOptions` interface despois de `RespecResult`.

**Grupo C — Re-export**:
4. **`packages/core/src/types/index.ts`** (MODIFICADO): engadir
   `RespecOptions` ao re-export de `./unlock.js`.

**Grupo D — TreeEngine.respec MODIFICADO**:
5. **`packages/core/src/engine/TreeEngine.ts`** (MODIFICADO):
   modificación cirúrxica do método `respec` existente (línea
   1198):
   - Engadir import de `RespecOptions`.
   - Cambiar signature a `respec(nodeIdOrIds?: string | readonly
     string[], opts?: RespecOptions)`.
   - Engadir validación de `costPercent` tras read-only check.
   - Engadir normalización de input (string|array → array).
   - Modificar refund loop para aplicar `costPercent` factor (cero
     cambio se costPercent === 0).
   - Actualizar comentarios JSDoc (T5) para reflectir nova signature.
   - **Cero modificación** de cascade, atomic update, events, audit,
     statComputer.invalidate.

**Grupo E — Tests novos**:
6. **`packages/core/__tests__/builds/TreeEngine.respec.options.test.ts`**
   (NOVO; ~10 tests). Cubre **só funcionalidade nova**: array
   nodeIds + costPercent + validación. **Cero solapa con tests
   existentes** que cobren respec sen opts.

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros paquetes scaffold.
- **Calquera outro ficheiro** en `packages/core/src/` fora dos 4
  prescritos.
- **Calquera test existente** (incluído 19 tests `.respec*` repartidos
  en 8 ficheiros).
- `package.json`, lockfile, configs.
- `docs/architecture/MASTER.md`.

**CERO deps de npm engadidas.** Cero managers novos. Cero entry
points novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `ad80454`, verificada
empíricamente con lectura completa do método respec existente
liñas 1194-1355)**.

### Método respec existente (FIXADO; cero modificación da súa lóxica core)

```ts
async respec(nodeId?: string): Promise<Result<RespecResult>> {
  if (this.readOnly) {
    return err(new YggdrasilError(ErrorCode.READ_ONLY_VIOLATION, ...))
  }

  const treeDef = this.store.getTreeDef()
  const state = this.store.getState()
  const now = Date.now()

  let nodeIdsToLock: string[]

  if (nodeId === undefined) {
    // Respec total: todos os nodos en unlocked ou maxed
    nodeIdsToLock = Object.values(state.nodes)
      .filter((n) => n.state === 'unlocked' || n.state === 'maxed')
      .map((n) => n.id)
  } else {
    // Respec parcial co fixpoint cascade...
    const targetInst = state.nodes[nodeId]
    if (targetInst === undefined ||
        (targetInst.state !== 'unlocked' && targetInst.state !== 'maxed')) {
      return ok({ nodeIds: [], refunded: [] })
    }
    nodeIdsToLock = [nodeId]
    // ... cascade fixpoint via this.resolver.evaluate ...
  }

  if (nodeIdsToLock.length === 0) {
    return ok({ nodeIds: [], refunded: [] })
  }

  // Refund acumulado:
  let accumulatedBudget = state.budget
  const allCosts: Array<{ resourceId: string; amount: number }> = []
  for (const id of nodeIdsToLock) {
    const inst = state.nodes[id]
    if (inst === undefined) continue
    const def = treeDef.nodes.find((n) => n.id === id)
    if (def === undefined) continue
    const tierCosts = this.resources.getTotalCost(def, 0, inst.currentTier)
    accumulatedBudget = this.resources.refund(tierCosts, accumulatedBudget)
    for (const c of tierCosts) allCosts.push(c)
  }

  // ... store.update + events + audit + statComputer.invalidate ...
  return ok({ nodeIds: nodeIdsToLock, refunded: allCosts })
}
```

### Modificación cirúrxica prescrita

**Puntos exactos de cambio**:

1. **Signature** (líñea 1198):
   ```ts
   // ANTES:
   async respec(nodeId?: string): Promise<Result<RespecResult>>
   // DESPOIS:
   async respec(
     nodeIdOrIds?: string | readonly string[],
     opts?: RespecOptions,
   ): Promise<Result<RespecResult>>
   ```

2. **Validación de costPercent** (insertar despois do read-only
   check; antes de `const treeDef = ...`):
   ```ts
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
   ```

3. **Normalización de input** (REEMPLAZA o bloque `if (nodeId ===
   undefined)` actual; line 1213-1275). Lóxica equivalente
   funcionalmente cando se chama coa signature antiga:

   ```ts
   // Determinar que nodos se van lockear
   let nodeIdsToLock: string[]

   if (nodeIdOrIds === undefined) {
     // Respec total: todos os nodos en unlocked ou maxed
     nodeIdsToLock = Object.values(state.nodes)
       .filter((n) => n.state === 'unlocked' || n.state === 'maxed')
       .map((n) => n.id)
   } else {
     // Respec parcial (single id ou array): normalizar a array
     const inputIds =
       typeof nodeIdOrIds === 'string' ? [nodeIdOrIds] : [...nodeIdOrIds]

     // Filtrar a só os que están unlocked/maxed (silenciosamente
     // ignora os non-unlocked, igual ao comportamento antigo para
     // single id que devolvía ok baleiro):
     nodeIdsToLock = inputIds.filter((id) => {
       const inst = state.nodes[id]
       return (
         inst !== undefined &&
         (inst.state === 'unlocked' || inst.state === 'maxed')
       )
     })

     if (nodeIdsToLock.length === 0) {
       // Se nada está unlocked/maxed, devolve ok baleiro (igual ao
       // comportamento antigo para single id non-unlocked).
       return ok({ nodeIds: [], refunded: [] })
     }

     // Cascade lock fixpoint (lóxica idéntica á do método existente,
     // pero iniciando desde array en lugar de single id):
     let changed = true
     while (changed) {
       changed = false
       for (const candidateDef of treeDef.nodes) {
         if (nodeIdsToLock.includes(candidateDef.id)) continue
         const candidateInst = state.nodes[candidateDef.id]
         if (candidateInst?.state !== 'unlocked' && candidateInst?.state !== 'maxed') continue
         if (candidateDef.prerequisites === undefined) continue

         const simulatedState: TreeState = {
           ...state,
           nodes: Object.fromEntries(
             Object.entries(state.nodes).map(([id, inst]) =>
               nodeIdsToLock.includes(id)
                 ? [id, { ...inst, state: 'locked' as const, currentTier: 0 }]
                 : [id, inst],
             ),
           ),
         }
         const ctx: UnlockResolverContext = {
           treeDef,
           state: simulatedState,
           locale: this.locale,
           progressManager: this.progressManager,
         }
         const stillSatisfied = this.resolver.evaluate(candidateDef.prerequisites, ctx)
         if (!stillSatisfied) {
           nodeIdsToLock.push(candidateDef.id)
           changed = true
         }
       }
     }
   }
   ```

4. **Refund loop con costPercent factor** (MODIFICAR o bloque
   existente; líneas 1281-1295):

   ```ts
   // Calcular refund acumulado con costPercent factor:
   const factor = 1 - costPercent / 100
   let accumulatedBudget = state.budget
   const allCosts: Array<{ resourceId: string; amount: number }> = []

   for (const id of nodeIdsToLock) {
     const inst = state.nodes[id]
     if (inst === undefined) continue
     const def = treeDef.nodes.find((n) => n.id === id)
     if (def === undefined) continue
     const tierCosts = this.resources.getTotalCost(def, 0, inst.currentTier)
     // Aplicar costPercent factor (cero modificación se costPercent === 0):
     const adjustedCosts =
       costPercent === 0
         ? tierCosts
         : tierCosts.map((c) => ({
             resourceId: c.resourceId,
             amount: Math.floor(c.amount * factor),
           }))
     accumulatedBudget = this.resources.refund(adjustedCosts, accumulatedBudget)
     for (const c of adjustedCosts) {
       allCosts.push(c)
     }
   }
   ```

5. **Comentarios JSDoc** (REEMPLAZAR lineas 1194-1197):
   ```ts
   // ── respec: mutación async (T5, extendido en 8.3) ──
   // Con string: lock dese nodo + cascada de dependentes.
   // Con array: lock dos nodos especificados (filter non-unlocked) +
   //   cascada.
   // Sen primeiro arg: respec total (todos unlocked/maxed → locked).
   // opts.costPercent ∈ [0, 100]: penalty model. Default 0 = full
   //   refund. Fórmula: refunded = floor(original * (1 - costPercent / 100)).
   // Hooks beforeRespec/afterRespec DIFERIDOS a 8.4 (PluginManager
   // + HookRunner).
   // Atómico: unha soa StateStore.update para todo.
   ```

6. **Resto do método (líneas 1300-1354)**: **INCHANGED**.
   - `store.update()` atómico.
   - Eventos (`budgetChange`, `stateChange`, `respec`, `auditEntry`).
   - Audit log.
   - `statComputer.invalidate()`.

### Verificación de backward-compatibility

| Chamada | Comportamento antigo | Comportamento novo | ¿Idéntico? |
|---|---|---|---|
| `respec()` | nodeId=undefined → respec total | nodeIdOrIds=undefined → respec total | ✅ |
| `respec('a')` | nodeId='a' → respec parcial | nodeIdOrIds='a' → normalizado a ['a'] → filter → ['a'] | ✅ (equivalente) |
| `respec('xyz')` (non-unlocked) | early return `ok({nodeIds:[], refunded:[]})` | filter → `[]` → early return | ✅ |
| Refund cando `opts === undefined` | tierCosts directos | costPercent=0 → branch `tierCosts` directos (cero modificación) | ✅ |

**Cero risco de regresión nos 19 tests existentes**.

### Decisión de Director — chamadas con array nodeIds

- `respec(['a', 'b'])` → normaliza a `['a', 'b']` → filter
  unlocked/maxed → cascade fixpoint conxunta → lock todos +
  dependentes.
- `respec([])` (array baleiro) → filter resulta `[]` → early return.
- `respec(['xyz'])` (todos non-unlocked) → filter resulta `[]` →
  early return.

### Lección 8.3 L1 (do briefing anterior; capturada para A.6
post-Fase 8)

**8.3 L1**: cando se prescribe unha API "nova" en TreeEngine,
buscar empíricamente a definición existente con grep específico:
- `grep -nE "^  async <methodName>\(" packages/core/src/engine/TreeEngine.ts`
- NON confiar en grep xenérico de palabra-clave (atopa referencias
  en comentarios e tipos, non a definición do método). Recordar
  que TreeEngine ten ~2270 liñas e ~30+ métodos públicos —
  asumir non-existencia sen verificación explícita é arriscado.

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

**Modificación cirúrxica backward-compatible** do método `respec`
existente en `packages/core/src/engine/TreeEngine.ts` (línea 1198):
engadir aceptación de `string | readonly string[]` como primeiro
arg (normalizado internamente a array; preserva semánticas single
id antiguas vía normalización + filter); engadir segundo arg
`opts?: RespecOptions` con `costPercent?` aplicado como penalty
factor no cost calculation (cero modificación cando `costPercent
=== 0`; preserva referencias exactas a `tierCosts`); engadir
validación de `costPercent ∈ [0, 100]` tras read-only check; engadir
`RespecOptions` interface en `types/unlock.ts`; engadir
`RESPEC_INVALID_COST_PERCENT` ErrorCode baixo prefixo existente
`YGG_B*`; engadir ~10 tests novos cubrindo **só funcionalidade
nova** (array nodeIds + costPercent + validación) sen modificar
ningún dos 19 tests existentes. **Cero RespecManager standalone**
(overengineering; o método existente xa fai todo). **Cero
modificación** doutros aspectos do método (cascade, atomic update,
events, audit, statComputer). **Hooks `beforeRespec`/`afterRespec`
seguen diferidos a 8.4**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (2)**:
- `packages/core/__tests__/builds/TreeEngine.respec.options.test.ts`
  (~150 liñas; ~10 tests).
- `.changeset/respec-options.md` (NOVO).

**MODIFICADOS (6)**:
- `packages/common/src/errors/codes.ts` (engadir 1 entrada B007).
- `packages/common/src/errors/messages.ts` (engadir 1 entrada
  gl/es/en).
- `packages/core/src/types/unlock.ts` (engadir RespecOptions
  interface).
- `packages/core/src/types/index.ts` (engadir RespecOptions ao
  re-export).
- `packages/core/src/engine/TreeEngine.ts` (modificación cirúrxica
  do método respec existente — sen RespecManager novo nin método
  novo).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 8 ficheiros tocados** (2 NOVOS + 6 MODIFICADOS).

**Cero modificación de**:
- Calquera outro ficheiro en `packages/core/src/`.
- **Calquera test existente** (incluídos 19 tests `.respec*`).
- `packages/storage/`, `packages/react/`, outros paquetes.
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
   * Fórmula: `refunded = floor(original * (1 - costPercent / 100))`.
   *
   * @example
   * { costPercent: 0 }   // full refund (igual que cero opts)
   * { costPercent: 10 }  // devolve 90%; motor mantén 10%
   * { costPercent: 100 } // cero refund (penalty total)
   */
  readonly costPercent?: number
}
```

### 5.3 — Re-export en types/index.ts (FIXADO)

**Verificar empíricamente** o re-export actual de unlock.js +
engadir `RespecOptions`. Patrón esperado:

```ts
// ANTES:
export type { ..., RespecResult } from './unlock.js'
// DESPOIS:
export type { ..., RespecOptions, RespecResult } from './unlock.js'
```

### 5.4 — ErrorCode YGG_B007 (FIXADO)

**Engadir** en `packages/common/src/errors/codes.ts` despois das
entradas existentes do bloque `// Builds` (B001-B006):

```ts
  RESPEC_INVALID_COST_PERCENT = 'YGG_B007',
```

### 5.5 — Mensaxe localizada (FIXADO)

**Engadir** en `packages/common/src/errors/messages.ts` despois
das entradas existentes (B001-B006):

```ts
  [ErrorCode.RESPEC_INVALID_COST_PERCENT]: {
    gl: 'costPercent inválido: debe estar en [0, 100]; recibido {value}',
    es: 'costPercent inválido: debe estar en [0, 100]; recibido {value}',
    en: 'Invalid costPercent: must be in [0, 100]; received {value}',
  },
```

### 5.6 — Modificación cirúrxica de TreeEngine.respec (FIXADO)

**5 cambios cirúrxicos exactos** no método respec (línea 1194-1355
do TreeEngine.ts):

**Cambio 1** — Engadir import de RespecOptions ao import de
types/index.js existente (top do ficheiro). Buscar a liña que
importa types e engadir `RespecOptions`:

```ts
import type {
  // ... existentes
  RespecOptions,         // ← engadir
  // ... existentes (incluído RespecResult que xa estaba)
} from '../types/index.js'
```

**Cambio 2** — Reemplazar comentarios JSDoc (línea 1194-1197):

```ts
// ── respec: mutación async (T5, extendido en 8.3) ──
// Con string: lock dese nodo + cascada de dependentes.
// Con array: lock dos nodos especificados (filter non-unlocked) +
//   cascada.
// Sen primeiro arg: respec total (todos unlocked/maxed → locked).
// opts.costPercent ∈ [0, 100]: penalty model. Default 0 = full refund.
//   Fórmula: refunded = floor(original * (1 - costPercent / 100)).
// Hooks beforeRespec/afterRespec DIFERIDOS a 8.4 (PluginManager + HookRunner).
// Atómico: unha soa StateStore.update para todo.
```

**Cambio 3** — Reemplazar signature (línea 1198):

```ts
// ANTES:
async respec(nodeId?: string): Promise<Result<RespecResult>> {
// DESPOIS:
async respec(
  nodeIdOrIds?: string | readonly string[],
  opts?: RespecOptions,
): Promise<Result<RespecResult>> {
```

**Cambio 4** — Insertar validación de costPercent **despois** do
read-only check (entre líneas 1206 e 1208; é dicir, despois do `}` que
peche o `if (this.readOnly) { return err(...) }`, antes de `const
treeDef = ...`):

```ts
// Validación de costPercent (sub-fase 8.3):
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
```

**Cambio 5** — Reemplazar bloque de determinación de
`nodeIdsToLock` (líneas 1213-1275, dende `let nodeIdsToLock:
string[]` ata o pechado da chave do `else` da rama parcial). Lóxica
equivalente con normalización de input + filter:

```ts
// Determinar que nodos se van lockear
let nodeIdsToLock: string[]

if (nodeIdOrIds === undefined) {
  // Respec total: todos os nodos en unlocked ou maxed
  nodeIdsToLock = Object.values(state.nodes)
    .filter((n) => n.state === 'unlocked' || n.state === 'maxed')
    .map((n) => n.id)
} else {
  // Respec parcial (string ou array): normalizar a array.
  const inputIds =
    typeof nodeIdOrIds === 'string' ? [nodeIdOrIds] : [...nodeIdOrIds]

  // Filtrar a só os que están unlocked/maxed (silenciosamente ignora
  // os non-unlocked, equivalente ao comportamento antigo de single id
  // que devolvía ok baleiro se non estaba unlocked).
  nodeIdsToLock = inputIds.filter((id) => {
    const inst = state.nodes[id]
    return (
      inst !== undefined &&
      (inst.state === 'unlocked' || inst.state === 'maxed')
    )
  })

  if (nodeIdsToLock.length === 0) {
    // Se nada está unlocked/maxed, devolve ok baleiro (equivalente ao
    // comportamento antigo para single id non-unlocked).
    return ok({ nodeIds: [], refunded: [] })
  }

  // Cascade lock fixpoint (lóxica IDÉNTICA á do método existente; só
  // muda que pode iniciar desde array en lugar de single id):
  let changed = true
  while (changed) {
    changed = false
    for (const candidateDef of treeDef.nodes) {
      if (nodeIdsToLock.includes(candidateDef.id)) continue
      const candidateInst = state.nodes[candidateDef.id]
      if (candidateInst?.state !== 'unlocked' && candidateInst?.state !== 'maxed') continue
      if (candidateDef.prerequisites === undefined) continue

      // Simular estado sen os nodos que xa vamos lockear
      const simulatedState: TreeState = {
        ...state,
        nodes: Object.fromEntries(
          Object.entries(state.nodes).map(([id, inst]) =>
            nodeIdsToLock.includes(id)
              ? [id, { ...inst, state: 'locked' as const, currentTier: 0 }]
              : [id, inst],
          ),
        ),
      }
      // ── INICIO: 2.4.d — pasar progressManager (igual ca en canUnlock) ──
      const ctx: UnlockResolverContext = {
        treeDef,
        state: simulatedState,
        locale: this.locale,
        progressManager: this.progressManager,
      }
      // ── FIN: 2.4.d ──
      const stillSatisfied = this.resolver.evaluate(candidateDef.prerequisites, ctx)
      if (!stillSatisfied) {
        nodeIdsToLock.push(candidateDef.id)
        changed = true
      }
    }
  }
}
```

**Cambio 6** — Modificar refund loop **só para aplicar costPercent
factor** (líneas 1281-1295):

```ts
// Calcular refund acumulado con costPercent factor (cero cambio se
// costPercent === 0; preserva referencias exactas):
const factor = 1 - costPercent / 100
let accumulatedBudget = state.budget
const allCosts: Array<{ resourceId: string; amount: number }> = []

for (const id of nodeIdsToLock) {
  const inst = state.nodes[id]
  if (inst === undefined) continue
  const def = treeDef.nodes.find((n) => n.id === id)
  if (def === undefined) continue
  const tierCosts = this.resources.getTotalCost(def, 0, inst.currentTier)
  // Aplicar costPercent factor só se costPercent > 0 (preserva
  // referencia tierCosts orixinal para backward-compatibility):
  const adjustedCosts =
    costPercent === 0
      ? tierCosts
      : tierCosts.map((c) => ({
          resourceId: c.resourceId,
          amount: Math.floor(c.amount * factor),
        }))
  accumulatedBudget = this.resources.refund(adjustedCosts, accumulatedBudget)
  for (const c of adjustedCosts) {
    allCosts.push(c)
  }
}
```

**Cero outras modificacións do método** (resto idéntico): atomic
update (líneas 1300-1316), events emission (líneas 1318-1336),
audit (líneas 1338-1346), statComputer.invalidate (líneas 1348-1352),
return (línea 1354).

### 5.7 — Tests novos (FIXADO)

**`__tests__/builds/TreeEngine.respec.options.test.ts`** (~10
tests):

**Aviso importante**: este ficheiro vai en `__tests__/builds/`
(non en `__tests__/engine/`) **para evitar mixing con tests
existentes de respec**. Mantén o agrupamento por sub-fase coherente
(Fase 8 → builds/).

Cubre **só funcionalidade nova**:

1. `respec(['a'])` (array con 1 elemento) é equivalente a
   `respec('a')`: mesmo state final, mesmo refund.
2. `respec(['a', 'b'])` (array múltiple) lockea ambos + cascade.
3. `respec([])` (array baleiro) devolve `ok({nodeIds:[], refunded:[]})`.
4. `respec(['xyz'])` con id non-unlocked → `ok({nodeIds:[], refunded:[]})`
   (filter silencioso).
5. `respec(['a', 'xyz'])` (mix unlocked + non-unlocked) → lockea só
   'a' + cascade.
6. `respec(undefined, { costPercent: 0 })` é equivalente a
   `respec()`: mesmo refund.
7. `respec(undefined, { costPercent: 50 })` devolve **50%** dos
   custos orixinais (Math.floor).
8. `respec(undefined, { costPercent: 100 })` devolve **0**
   (full penalty).
9. `respec(undefined, { costPercent: -1 })` → `err(RESPEC_INVALID_COST_PERCENT)`.
10. `respec(undefined, { costPercent: 101 })` → `err(...)`.
11. `respec(undefined, { costPercent: NaN })` → `err(...)`.
12. `respec(['a'], { costPercent: 25 })` aplica selectivo + penalty.

**Total: ~12 tests novos** (axustado de ~10 a ~12 para cubrir
tódalas ramas).

Post-8.3 esperado: 1588 + 12 = **~1600 core tests**.

**Fixture treeDef**: reutilizar helper minimal do test
`TreeEngine.snapshot.test.ts` ou `TreeEngine.loadout.test.ts` de
8.2. Engadir prerequisites en algún nodo para tests de cascade.

### 5.8 — Cobertura prescrita

- **TreeEngine.ts respec method**: 100% nas liñas novas (validación
  costPercent, normalización input, costPercent factor branch).
- **types/unlock.ts**: cero impacto (tipo puro).
- **packages/common (codes + messages)**: cobertura mantida.
- **Cero regresión** noutras pezas.

### 5.9 — Cero deps novas

Verificable empíricamente: cero modificación de `package.json`
deps nin lockfile.

### 5.10 — Test counts esperados post-8.3 REVISED

- **core**: 1588 + ~12 = **~1600 tests**.
- **common, storage, react**: intactos.

### 5.11 — Sobre hooks DIFERIDOS

Hooks `beforeRespec` e `afterRespec` están tipados en plugin.ts
**pero non chamados** (cero HookRunner aínda). **Coordinación con
8.4 PluginManager + HookRunner** documentada explicitamente:

- Comentarios JSDoc do método respec inclúen NOTE.
- CHANGELOG inclúe sección "Note" con explicación.

### 5.12 — Sobre cero modificación dos 19 tests existentes

**Garantía dura**: ningún dos 19 tests existentes que usan
`engine.respec()` ou `engine.respec('a')` debe modificarse.

**Verificación durante T6**: tras aplicar os cambios cirúrxicos,
correr tests:
- `TreeEngine.audit.test.ts`
- `TreeEngine.stats.test.ts`
- `TreeEngine.mutations.test.ts`
- `TreeEngine.progress.test.ts`
- `TreeEngine.subtrees.test.ts`
- `integration/lifecycle.test.ts`
- `integration/audit.test.ts`
- `integration/economy.test.ts`

**Tódolos deben pasar inchanged**. Se algún falla → **ESCALAR**
(probable regresión non prevista; require análise).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| RespecOptions | TS interface | types/unlock.ts | +20 |
| Re-export | export type | types/index.ts | +1 modif |
| 1 ErrorCode | enum entry | codes.ts | +2 |
| 1 mensaxe gl/es/en | object entry | messages.ts | +6 |
| Mod cirúrxica respec | 5 cambios | TreeEngine.ts | ~+50/-40 |
| Tests novos | describe blocks | .options.test.ts | ~150 |

**Total estimado**: ~80 liñas de código (cero NOVO src; modificación
cirúrxica) + ~150 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `packages/core/__tests__/builds/TreeEngine.respec.options.test.ts`
- `.changeset/respec-options.md`

**MODIFICADOS (6)**:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/types/unlock.ts`
- `packages/core/src/types/index.ts`
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 8 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`.
- **Calquera test existente** (incluídos 19 tests `.respec*` en
  8 ficheiros distintos).
- `packages/storage/`, `packages/react/`, outros paquetes.
- `package.json`, configs, lockfile.
- `docs/architecture/MASTER.md`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en `RespecOptions` interface (cero modificar
RespecResult que xa existe).

**Marcadores existentes** mantéñense (cero modificación dos
`// ── INICIO/FIN ──` no método respec).

**Patrón Result**: respec devolve `Result<RespecResult>` (xa establecido).

**Cero throw**: validation usa `return err(...)`.

---

## 9. QUE NON FACER

- ❌ Crear `RespecManager.ts` standalone (overengineering;
  REJEITADO no rediseño).
- ❌ Crear método novo `respecV2`, `respecWithOptions`, etc.
  (REJEITADO; modificación cirúrxica do método existente).
- ❌ Modificar a lóxica core do método respec (cascade fixpoint,
  atomic update, events emission, audit, statComputer.invalidate):
  **cero modificación destes bloques**.
- ❌ Modificar **calquera test existente** (especialmente os 19
  tests `.respec*` en 8 ficheiros).
- ❌ Modificar outros métodos do TreeEngine (canUnlock, unlock,
  lock, etc.): cero require.
- ❌ Modificar StateStore, ResourceManager, EventEmitter, AuditLogger,
  StatComputer, UnlockResolver, ProgressManager: cero require.
- ❌ Modificar `packages/storage/`, `packages/react/`, outros
  paquetes scaffold.
- ❌ Chamar hooks `beforeRespec` ou `afterRespec` (DIFERIDO a 8.4).
- ❌ Reset de `progress` no método respec (MASTER 2.4.b §5.8;
  decisión preserved).
- ❌ Engadir HookRunner ou PluginManager (sub-fase 8.4).
- ❌ Engadir deps de npm.
- ❌ Engadir Zod schemas (validation inline é suficiente).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir Date.now() ou Math.random() (cero require nas
  pezas novas).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `ad80454` como HEAD.

**T0.2** — **CRÍTICO** — Verificacións empíricas (lección 8.3 L1):

```bash
# Confirmar método respec existente (signature):
grep -nE "^  async respec\(" packages/core/src/engine/TreeEngine.ts
# esperado: 1 match en liña ~1198 con "async respec(nodeId?: string)"

# Confirmar contidos do método (range exacto):
sed -n '1194,1198p' packages/core/src/engine/TreeEngine.ts
# esperado: comentarios JSDoc + signature

# Contar tests existentes que dependen de respec:
grep -rlE "engine\.respec\(|\.respec\(" packages/core/__tests__/ | wc -l
# esperado: 8 ficheiros

# Listar exactamente os ficheiros afectados:
grep -rlE "engine\.respec\(|\.respec\(" packages/core/__tests__/
# esperado: 8 listas que NON se modifican

# Confirmar ResourceManager.getTotalCost + refund:
grep -nE "getTotalCost|refund\(" packages/core/src/engine/ResourceManager.ts | head -5
# esperado: ambos existentes

# Confirmar RespecResult xa tipado:
grep -E "interface RespecResult" packages/core/src/types/unlock.ts
# esperado: 1 match
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

**Verificación intermedia** (cero código novo aínda):
```bash
pnpm turbo run typecheck --force                          # 22/22 esperado
pnpm --filter @yggdrasil-forge/core test --force          # 1588 intactos
```

### T3 — Modificación cirúrxica de TreeEngine.respec (5 cambios)

Aplicar **§5.6 literal**: os 6 cambios numerados con extrema
precisión:
1. Import.
2. JSDoc comments.
3. Signature.
4. Validación costPercent (NOVO bloque entre read-only check e
   resto).
5. Reemplazar bloque de determinación de nodeIdsToLock.
6. Modificar refund loop con costPercent factor.

**Cero modificación** doutras partes do método (atomic update,
events, audit, statComputer).

### T4 — Verificación CRÍTICA: 1588 tests existentes pasan

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1588 tests
```

**Tódolos 1588 tests previos deben pasar inchanged**.

**Especial atención**: os 19 tests `.respec*` en 8 ficheiros (audit,
stats, mutations, progress, subtrees, lifecycle, audit integration,
economy integration) deben pasar **sen tocar**.

Se algún falla → **ESCALAR INMEDIATAMENTE**. **NON CONTINUAR**
ata resolver.

### T5 — Crear tests novos

Crear `packages/core/__tests__/builds/TreeEngine.respec.options.test.ts`
segundo §5.7 literal (~12 tests).

### T6 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1600 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "TreeEngine|^All files"
# Cobertura targets:
#   TreeEngine.ts: baseline mantida ou superada (liñas novas cubertas)
#   Resto: sen regresión
```

### T7 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/src/types/unlock.ts \
  packages/core/__tests__/builds/TreeEngine.respec.options.test.ts
# NOTA: "TODOS" castelán/galego = "everything"; filtrar mentalmente.
```

### T8 — Changeset + CHANGELOG + commit

`.changeset/respec-options.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): extend engine.respec() with array nodeIds + costPercent option (sub-phase 8.3 REVISED)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `TreeEngine.respec()`: **extended signature** (backward-compatible):
  - `respec(nodeIdOrIds?: string | readonly string[], opts?: RespecOptions)`.
  - **Backward-compatible**: `respec()` e `respec('a')` manteñen
    comportamento idéntico ao previo (cero impacto en 19 tests
    existentes).
  - **Novo**: array `string[]` como primeiro arg → respec selectivo
    múltiple + cascade conxunta.
  - **Novo**: `opts.costPercent` ∈ [0, 100] (penalty model; default
    0 = full refund). Fórmula:
    `refunded = floor(original_total_cost * (1 - costPercent / 100))`.
- `@yggdrasil-forge/core`: `RespecOptions` interface novo en
  `types/unlock.ts`. Re-exportado desde `types/index.ts`.
- `@yggdrasil-forge/common`: **1 ErrorCode novo** baixo prefixo
  existente `YGG_B*`:
  - `RESPEC_INVALID_COST_PERCENT` (`YGG_B007`): validación tras
    read-only check.
  - Mensaxes localizadas gl/es/en.

### Note
- Sub-fase 8.3 REVISED: rediseño completo tras escalación do
  Executor que detectou método `respec` existente. **Briefing
  orixinal 8.3 era roto por erro do Director** (asumiu
  non-existencia dun método con ~150 liñas + 19 tests dependentes).
  **Cero rollback** de main: a cadea de 39 sub-fases sen rollback
  mantense intacta porque o erro foi capturado por escalación
  antes de commit/push.
- **Modificación cirúrxica backward-compatible** do método existente
  en lugar de crear un novo (rejeitada Opción B `respecV2`) ou
  reemplazar (rejeitada Opción A; rompería 19 tests).
- **Cero `RespecManager.ts` standalone**: overengineering rejeitado.
  O método respec existente xa fai cascade + refund + atomic update
  + audit + events + statComputer.invalidate.
- **Lección 8.3 L1 capturada** (anotada para A.6 do MASTER post-Fase
  8): cando se prescribe unha API "nova" en TreeEngine, buscar
  empíricamente a definición existente con grep específico
  (`^  async <methodName>\(`); NON confiar en grep xenérico.
- **Hooks beforeRespec/afterRespec SEGUEN DIFERIDOS a 8.4**.
- **Cero reset de progress** en respec (MASTER 2.4.b §5.8;
  comportamento preservado).
- **Cero deps de npm engadidas**.
- **Cero modificación de packages/storage/, packages/react/**, outros
  14 paquetes scaffold.
- **Cero modificación de calquera test existente** (1588 core + 60
  common + 193 storage + 116 react = 1957 tests intactos).
```

Commit Conventional:
`feat(core): extend engine.respec() with array nodeIds + costPercent option (sub-phase 8.3 REVISED)`

### T9 — Push

Push directo a `origin/main` (base `ad80454`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.3 (REVISED) — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base ad80454)
✅ TreeEngine.respec MODIFICADO cirúrxicamente (5 cambios numerados):
   1. Import RespecOptions
   2. JSDoc actualizado
   3. Signature: respec(nodeIdOrIds?: string|readonly string[], opts?)
   4. Validación costPercent ∈ [0, 100] + Number.isFinite
   5. Normalización input + filter non-unlocked
   6. costPercent factor en refund loop (cero modificación se ===0)
✅ RespecOptions interface novo en types/unlock.ts + re-export
✅ 1 ErrorCode YGG_B007 RESPEC_INVALID_COST_PERCENT + mensaxes gl/es/en
✅ T0.2 verificación empírica (lección 8.3 L1):
   - Método respec existente confirmado en liña ~1198 (signature
     antiga: respec(nodeId?: string))
   - 8 ficheiros con tests dependentes confirmados
   - ResourceManager.getTotalCost + refund confirmados
✅ T2 verificación tras tipos: 22/22, 1588 tests intactos
✅ T4 verificación CRÍTICA: 1588 tests previos pasan SEN TOCAR
   - 19 tests .respec* en 8 ficheiros (audit, stats, mutations,
     progress, subtrees, lifecycle, audit integration, economy)
     pasan inchanged
✅ CERO modificación de pezas existentes en packages/core/src/
   salvo TreeEngine.ts (modificación cirúrxica do método respec)
   e 2 ficheiros de tipos (unlock.ts + index.ts)
✅ CERO modificación de calquera test existente (1957 totais intactos)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ CERO RespecManager.ts standalone (overengineering rejeitado)
✅ CERO método novo (modificación cirúrxica backward-compatible)
✅ Tests: 1588 + 12 = ~1600 core tests
   - 12 tests novos en TreeEngine.respec.options.test.ts:
     - 5 tests array nodeIds (1 elem, múltiple, vacío, non-unlocked, mix)
     - 4 tests costPercent (0, 50, 100, selective+penalty)
     - 3 tests validación (-1, 101, NaN)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura: TreeEngine.ts liñas novas a 100%; resto sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias (filtrar "TODOS")
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.3 REVISED (substituíu briefing 8.3 orixinal roto).
   - 40 sub-fases consecutivas sen rollback (cadea preservada via
     escalación antes de commit).
   - Hooks beforeRespec/afterRespec DIFERIDOS a 8.4.
   - Cero reset progress (MASTER 2.4.b §5.8 preservado).
   - costPercent penalty model: default 0 = full refund.
   - Backward-compatibility garantida: respec() e respec('a')
     comportamento idéntico ao antigo.
   - Lección 8.3 L1 capturada para A.6 do MASTER post-Fase 8.
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 8 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.4 (PluginManager + HookRunner;
probable decomposición 8.4.a + 8.4.b + 8.4.c).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.3 REVISED. **Rediseño completo** tras escalación
do Executor que capturou o erro do Director (briefing 8.3 orixinal
asumiu non-existencia dun método respec existente con ~150 liñas
+ 19 tests). **Modificación cirúrxica backward-compatible** en lugar
de crear ficheiros novos / método novo / reemplazar. **Cero
RespecManager.ts** (overengineering rejeitado). **Cero modificación
de tests existentes** (garantía dura). 8 ficheiros tocados (2 NOVOS
+ 6 MODIFICADOS) en lugar dos 10 do briefing anterior. ~12 tests
novos en lugar dos ~22. Risco BAIXO-MEDIO. Cadea de 39 sub-fases
sen rollback preservada (cero foi pushed do erro orixinal).
Calquera dúbida → ESCALAR.*

*Lección 8.3 L1 capturada explicitamente para A.6 do MASTER
post-Fase 8: verificar empíricamente a existencia dun método antes
de prescribir API "nova" en TreeEngine; usar grep específico
(`^  async <methodName>\(`) en lugar de grep xenérico de
palabra-clave.*
