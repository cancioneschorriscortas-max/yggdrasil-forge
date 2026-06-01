# BRIEFING — SUB-FASE 3.6.a de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase mediana de implementación.** Crear o Reconciler base como
> función pura, soportando inicialmente unha das catro opcións
> (`refundRemovedNodes`). As outras tres opcións implementaranse na
> 3.6.b. Quédanos esta + 3.6.b para pechar a Fase 3.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1 +
3.5 L2**: calquera modificación fóra de §6 require **ESCALAR ANTES
DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.6.a — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.6.a — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.6.a** de Yggdrasil Forge. **Primeira metade da
reconciliación de saves** (MASTER §23). Tipo: **función pura** que
toma un TreeDef antigo, un TreeDef novo, un TreeState gardado contra
o antigo, e opcións de reconciliación, e devolve un TreeState
actualizado para o TreeDef novo + lista de cambios aplicados.

**Alcance desta sub-fase**: só `refundRemovedNodes` é honrado das
catro opcións de `ReconcileOptions`. As outras tres
(`grandfatherIncreasedCosts`, `refundDecreasedCosts`,
`invalidateOnPrereqFailure`) acéptanse na interface pero **non se
implementan**; entran na 3.6.b.

---

## 2. CONTEXTO MÍNIMO

MASTER §23 especifica `ReconcileOptions` con 4 campos pero **non
prescribe nin método, nin entradas, nin saídas**. Decisión do
director: **función pura**, cero acoplamento a TreeEngine vivo,
compatible coa futura CLI (`yggdrasil reconcile` xa prometida en
§24).

A reconciliación responde ao caso de uso real: o autor publica unha
TreeDef vN+1 modificando nodos (engadindo, quitando, cambiando custos
ou prerequisites). O usuario tiña un TreeState gardado contra
TreeDef vN. **¿Que facer co progreso?** As `ReconcileOptions` dan
política configurable.

Esta sub-fase implementa **só `refundRemovedNodes`**, o caso máis
sinxelo e impactante: se a TreeDef nova **eliminou nodos que o
usuario tiña desbloqueados**, ¿devolvemos os custos pagados ao
budget?

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `f97b467` (migracións 3.5).
- 945 tests core + 17 common + 171 storage = monorepo limpo.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **MASTER §23** especifica `ReconcileOptions` literal:
  ```ts
  interface ReconcileOptions {
    refundRemovedNodes: boolean
    grandfatherIncreasedCosts: boolean
    refundDecreasedCosts: boolean
    invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'
  }
  ```
- **`TreeDef`, `TreeState`, `NodeDef`, `NodeInstance`, `Budget`,
  `Cost`, `Resource`** dispoñibles en
  `packages/core/src/types/`. Verifica importacións concretas en T0.
- **TreeState** ten estrutura:
  ```ts
  interface TreeState {
    nodes: Record<string, NodeInstance>
    budget: Budget
    computedStats?: Record<string, number>
    // ...
  }
  ```
- **NodeInstance** ten campo `state: 'locked' | 'unlocked' | 'in_progress' | ...`.
  Verifica nomes exactos en T0.
- **`NodeDef.costs`** son `Cost[]` con `{resourceId, amount}` ou
  similar. Verifica forma exacta en T0.
- **ResourceManager** xa existe en core; podería reutilizarse para
  cálculos de refund, ou pode implementarse cálculo trivial directo
  (verifica en T0 cal é máis limpo).
- **`Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`, `Locale`,
  `getErrorMessage`** dispoñibles desde `@yggdrasil-forge/common`.
- **`SCHEMA_VERSION`** dispoñible en common; **NON se usa nesta
  sub-fase** (reconciliación non depende de schemaVersion).
- DT-9, DT-11, DT-12, DT-14 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/reconciler/Reconciler.ts` cunha
función pura `reconcile(oldTreeDef, newTreeDef, oldTreeState, options,
locale?)` que aplica `refundRemovedNodes` da `ReconcileOptions`
(devolvendo custos ao budget polos nodos desbloqueados que foron
eliminados na nova TreeDef), produce un `TreeState` actualizado +
lista de `ReconcileChange[]` aplicados, exportar publicamente desde
core, e cubrir con tests funcionais.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Función pura, NON método de TreeEngine

Razóns:
1. **Función pura é a primitiva mínima**: probable, illable, sen estado.
2. **Compatible coa CLI** prometida no MASTER §24 (`yggdrasil reconcile`).
3. **Cero acoplamento a TreeEngine vivo**: o consumidor pode reconciliar
   un save offline sen instanciar engine.
4. **Wrapper `engine.reconcileToNew()` é trivialmente engadible despois**
   (3.6.b ou posterior se procede). Cero presa en 3.6.a.

Sinatura:

```ts
export function reconcile(
  oldTreeDef: TreeDef,
  newTreeDef: TreeDef,
  oldTreeState: TreeState,
  options: ReconcileOptions,
  locale: Locale = 'gl',
): Result<ReconcileResult>
```

### 5.2 — ReconcileOptions segundo MASTER §23 literal

`packages/core/src/engine/reconciler/types.ts` (ou directamente en
Reconciler.ts; decidir polo executor):

```ts
export interface ReconcileOptions {
  /**
   * Se `true`, devolve ao budget os custos pagados polos nodos
   * desbloqueados que xa non existen na nova TreeDef.
   */
  readonly refundRemovedNodes: boolean

  /**
   * Se `true`, mantén o estado "desbloqueado" dos nodos cuxo custo
   * subiu na nova TreeDef sen cobrar a diferenza. NON implementado
   * en 3.6.a; será efectivo en 3.6.b. Inclúese na interface por
   * compatibilidade futura.
   */
  readonly grandfatherIncreasedCosts: boolean

  /**
   * Se `true`, devolve ao budget a diferenza cando o custo baixa.
   * NON implementado en 3.6.a; será efectivo en 3.6.b.
   */
  readonly refundDecreasedCosts: boolean

  /**
   * Política se prerequisites cambian e xa non se cumpren:
   * - `'disable'`: o nodo pasa a `locked`.
   * - `'refund'`: o nodo pasa a `locked` e devólvense os custos.
   * - `'preserve'`: mantén o nodo desbloqueado (advertencia: rompe
   *   invariantes do engine; uso baixo a responsabilidade do consumidor).
   *
   * NON implementado en 3.6.a; será efectivo en 3.6.b.
   */
  readonly invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'
}
```

**Importante**:
- **4 campos obrigatorios** (todos `readonly`).
- **Cero defaults** para forzar decisión consciente do consumidor.
- **3 campos non efectivos en 3.6.a** documéntanse no JSDoc, pero
  acéptanse na interface para evitar ruptura cando 3.6.b actívaos.

### 5.3 — ReconcileChange discriminated union

```ts
export type ReconcileChange =
  | {
      readonly type: 'node_removed'
      readonly nodeId: string
      /** Se foi `unlocked` antes; afecta a decisión de refund. */
      readonly wasUnlocked: boolean
    }
  | {
      readonly type: 'cost_refunded'
      readonly nodeId: string
      readonly resourceId: string
      readonly amount: number
    }
  // Os outros 3 tipos (`cost_grandfathered`, `cost_decreased_refunded`,
  // `prereq_failure_action`) **non se emiten en 3.6.a**. Inclúense na
  // unión cando se implementen en 3.6.b.
```

**Decisión 3.6.a**: só `'node_removed'` e `'cost_refunded'` se emiten.
**Cero outros tipos** definidos aínda; engadiranse en 3.6.b.

**Importante**: cada `cost_refunded` corresponde a unha entrada de
recurso refundida. Se un nodo eliminado tiña custo `[{xp: 10},
{gold: 50}]`, emítense **dous** `cost_refunded` (un por recurso) +
**un** `node_removed`. Documenta no JSDoc.

### 5.4 — ReconcileResult

```ts
export interface ReconcileResult {
  /** TreeState actualizado para a nova TreeDef. */
  readonly newTreeState: TreeState

  /** Lista de cambios aplicados, en orde determinista. */
  readonly changes: readonly ReconcileChange[]
}
```

### 5.5 — Algoritmo de reconcile (3.6.a)

**Pseudo-código**:

```
1. Validacións básicas:
   - oldTreeDef.id === newTreeDef.id (mesma árbore, distintas versións).
   - Se non, err(RECONCILE_TREE_MISMATCH).
   - oldTreeState contén nodes correspondentes a oldTreeDef (cero
     check estrito; defensivo: nodos en oldTreeState non en
     oldTreeDef ignóranse).

2. Identificar nodos eliminados:
   - oldNodeIds = oldTreeDef.nodes.map(n => n.id)
   - newNodeIds = new Set(newTreeDef.nodes.map(n => n.id))
   - removedNodeIds = oldNodeIds.filter(id => !newNodeIds.has(id))

3. Para cada nodo eliminado:
   - Obter NodeInstance correspondente en oldTreeState.nodes
   - Se non existe en oldTreeState: ignora (defensivo)
   - Se existe e estaba en estado `'unlocked'`:
     - Engadir cambio `{ type: 'node_removed', nodeId, wasUnlocked: true }`
     - Se options.refundRemovedNodes === true:
       - Obter custos do nodo desde oldTreeDef (tiñámolo antes de eliminar)
       - Para cada cost {resourceId, amount}:
         - Engadir cambio { type: 'cost_refunded', nodeId, resourceId, amount }
         - newBudget.resources[resourceId] += amount
   - Senón (estado != 'unlocked'):
     - Engadir cambio `{ type: 'node_removed', nodeId, wasUnlocked: false }`
     - Cero refund (cero impacto en budget).

4. Construír newTreeState:
   - newNodes = {...oldTreeState.nodes}
   - Eliminar de newNodes os removedNodeIds
   - Manter outros campos de oldTreeState
   - Aplicar budget (con refunds se procede)

5. Devolver ok({ newTreeState, changes })
```

**Importante**:
- **`refundRemovedNodes === false`**: cero refund pero emítense aínda
  `node_removed` para informar.
- **Resto de `ReconcileOptions` ignóranse**. Sub-fase 3.6.a non
  implementa máis.
- **Cero modificación de `oldTreeState`** (función pura; copia
  defensiva).

### 5.6 — Tratamiento de budget

`Budget` é un obxecto con `resources: Record<string, number>`
(verifica forma exacta en T0). Refund é incremento directo:

```ts
newBudget = {
  ...oldTreeState.budget,
  resources: { ...oldTreeState.budget.resources }
}
for (const refund of refunds) {
  newBudget.resources[refund.resourceId] =
    (newBudget.resources[refund.resourceId] ?? 0) + refund.amount
}
```

**Importante**:
- **Cero validación de límites máximos** (Resource.max non se
  comproba aquí; fenómeno de "over-cap" deixa decisión ao consumidor
  ou a sub-fase futura).
- **Cero negativos** (refund é incremento, sempre positivo).

### 5.7 — ErrorCode novo: RECONCILE_TREE_MISMATCH

**Único ErrorCode novo** desta sub-fase. Engadir a
`packages/common/src/errors/codes.ts`:

```ts
RECONCILE_TREE_MISMATCH = 'YGG_R001',
```

**Tamén** mensaxes nas 3 locales en `messages.ts`:
- gl: "Non se pode reconciliar: árbores con id distinto ({{oldId}} vs {{newId}})."
- es: "No se puede reconciliar: árboles con id distinto ({{oldId}} vs {{newId}})."
- en: "Cannot reconcile: trees have different ids ({{oldId}} vs {{newId}})."

**Comentario na sección**: añadir `// YGG_R = Reconcile errors` xunto
ás outras familias.

**ATENCIÓN**: modificar `common/` é normalmente prohibido tras 3.4
L1. **Esta sub-fase autoriza explicitamente** estes 3 cambios en
common (`codes.ts` + `messages.ts` × 3 locales). **Cero outros
cambios en common**.

### 5.8 — Cero modificación de TreeState/TreeDef tipos

Os tipos `TreeState`, `TreeDef`, `NodeInstance` etc. **non se tocan**.

### 5.9 — Cero modificación de pezas existentes (TreeEngine, etc.)

Reconciler é peza nova **fora do TreeEngine** segundo 5.1 (función
pura). **Cero modificación** de TreeEngine, ProgressManager,
StatComputer, EffectsRunner, etc.

### 5.10 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts` (ou onde se centralicen
os exports do motor; verifica en T0):

```ts
export type {
  ReconcileOptions,
  ReconcileChange,
  ReconcileResult,
} from './reconciler/Reconciler.js'
export { reconcile } from './reconciler/Reconciler.js'
```

### 5.11 — Estrutura de ficheiros

```
packages/core/src/engine/reconciler/
└── Reconciler.ts        ← interface + función reconcile()
```

**Cero subdirectorios** dentro de reconciler nesta sub-fase. Un só
ficheiro coa interface + función + tipos. Mantén estructura mínima
para 3.6.a; 3.6.b decidirá se procede partir en máis ficheiros.

### 5.12 — Tests funcionais

Crear `packages/core/__tests__/engine/reconciler/Reconciler.test.ts`.
**Mínimo 20 tests** centrados en `refundRemovedNodes`:

**Operacións básicas:**
1. TreeDef sen cambios entre old e new: cero cambios reportados,
   cero modificación de TreeState.
2. Nodo eliminado pero estaba `locked`: emite `node_removed` con
   `wasUnlocked: false`, cero refund.
3. Nodo eliminado e estaba `unlocked` con `refundRemovedNodes: true`:
   emite `node_removed` + `cost_refunded` por cada recurso, budget
   actualizado.
4. Nodo eliminado e estaba `unlocked` con `refundRemovedNodes: false`:
   emite `node_removed` con `wasUnlocked: true`, cero refund, budget
   sen cambios.
5. Múltiples nodos eliminados nun só reconcile: todos procesados.

**Validacións:**
6. `oldTreeDef.id !== newTreeDef.id`: err(RECONCILE_TREE_MISMATCH).
7. Locale 'es' propaga á mensaxe de erro.

**Edge cases:**
8. TreeState con nodo en oldNodes pero non en oldTreeDef: ignora
   defensivamente (cero crash).
9. Nodo eliminado con múltiples recursos en cost: un `cost_refunded`
   por recurso.
10. Nodo eliminado con `cost: []` (sen custos): emite `node_removed`
    pero cero `cost_refunded`.
11. Nodo eliminado con cost = undefined ou ausente: tratase como sen
    custos.
12. TreeState sen budget.resources existente para o resourceId: trata
    como 0 e suma o refund (defensivo).

**Inmutabilidade:**
13. `oldTreeState` non se modifica tras chamar reconcile (verificar con
    snapshot).
14. `oldTreeDef` non se modifica.
15. `newTreeDef` non se modifica.

**Opcións non implementadas (3.6.a non honra):**
16. `grandfatherIncreasedCosts: true` con cost subido: cero efecto
    aínda (será implementado en 3.6.b).
17. `refundDecreasedCosts: true` con cost baixado: cero efecto aínda.
18. `invalidateOnPrereqFailure: 'refund'` con prereq roto: cero efecto
    aínda.

(Tests 16-18 documentan que a sub-fase NON implementa esas opcións,
non son "bugs". 3.6.b os removerá ou cambiará comportamento.)

**Múltiples recursos:**
19. Refund con recursos novos no Resource máximo non altera a lóxica
    (cero check de máximo en 3.6.a).
20. Determinismo: dúas chamadas idénticas producen exactamente o mesmo
    resultado.

### 5.13 — Cobertura

- **`Reconciler.ts`**: 100% Stmts/Funcs/Lines. **Branch ≥95%** salvo
  ramas defensivas explicitamente comentadas con "// Defensivo:" no
  código (lección 3.5 L1 aceptada).
- **Global core**: non baixar de baseline (~98%).

### 5.14 — Cero modificación de tests existentes

Os tests existentes de `core` non se tocan. 945 tests intactos.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/reconciler/Reconciler.ts` — NOVO
- `packages/core/src/engine/index.ts` — MODIFICADO (+4 exports)
- `packages/common/src/errors/codes.ts` — MODIFICADO (+1 ErrorCode +
  comentario YGG_R)
- `packages/common/src/errors/messages.ts` — MODIFICADO (+3 mensaxes
  locales: gl, es, en)

**Tests:**
- `packages/core/__tests__/engine/reconciler/Reconciler.test.ts` — NOVO

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install`. Confirma 945 tests core + 17 common con `--force`.
2. **Verifica forma exacta de NodeInstance e estado**:
   ```
   grep -B1 -A10 "interface NodeInstance\|type NodeInstance" \
     packages/core/src/types/*.ts
   ```
   Reporta nomes exactos de campos e valores de `state`.
3. **Verifica forma exacta de Budget**:
   ```
   grep -B1 -A8 "interface Budget\|type Budget" \
     packages/core/src/types/*.ts
   ```
4. **Verifica forma exacta de NodeDef.costs**:
   ```
   grep -B1 -A4 "costs[?:]" packages/core/src/types/node.ts
   ```
5. **Verifica patrón de exports en `packages/core/src/engine/index.ts`**.
6. **Verifica patrón de erros en `packages/common/src/errors/codes.ts`**:
   - ¿Onde engadir YGG_R001?
   - ¿Como se estrutura o comentario das familias?
   - ¿Patrón de mensaxes en `messages.ts` (template strings con `{{var}}`?).

### T1 — Engadir ErrorCode + mensaxes en common (5.7)

1. Editar `packages/common/src/errors/codes.ts`: engadir comentario
   `//   YGG_R   = Reconcile errors` na sección de comentarios + a
   liña `RECONCILE_TREE_MISMATCH = 'YGG_R001',` na enum.
2. Editar `packages/common/src/errors/messages.ts`: engadir as 3
   mensaxes (gl/es/en) seguindo o patrón existente.
3. Typecheck 20/20.

### T2 — Reconciler.ts (5.1-5.6)

Crear `packages/core/src/engine/reconciler/Reconciler.ts`:
- `ReconcileOptions` interface (5.2).
- `ReconcileChange` discriminated union (5.3).
- `ReconcileResult` interface (5.4).
- Función `reconcile(...)` (5.5).

JSDoc completo documentando:
- Que 3 das 4 opcións NON están implementadas aínda.
- Asimetría: refund non comproba límite máximo do recurso.

Typecheck 20/20.

### T3 — Tests Reconciler (5.12)

Crear `__tests__/engine/reconciler/Reconciler.test.ts` cos 20+ tests.

### T4 — Exportar dende engine/index.ts (5.10)

Engadir os 4 exports.

### T5 — Verificación post-T4

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 945 tests previos seguen pasando intactos.
- 17 common previos intactos.
- 171 storage previos intactos.

### T6 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- Reconciler.ts 100/≥95%/100/100.
- Global core ≥98%.

### T7 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/reconciler/
pnpm test
```

**Nota sobre `unknown`**: cero placeholder esperado en Reconciler.ts
(traballa con tipos coñecidos: TreeDef, TreeState). Se aparece
`unknown`, documenta razón.

- Changeset **minor** para `@yggdrasil-forge/core` (engade API nova)
  + **patch** para `@yggdrasil-forge/common` (engade ErrorCode +
  mensaxes).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - Reconciler base en `@yggdrasil-forge/core/engine/reconciler/`:
    función pura `reconcile(oldTreeDef, newTreeDef, oldTreeState,
    options, locale?)` para reconciliar saves contra TreeDefs
    modificadas (MASTER §23).
  - `ReconcileOptions`, `ReconcileChange` e `ReconcileResult` types
    exportados.
  - ErrorCode `RECONCILE_TREE_MISMATCH = YGG_R001` con mensaxes en
    gl/es/en.

  ### Note
  - Esta sub-fase (3.6.a) implementa só `refundRemovedNodes` das catro
    opcións de `ReconcileOptions`. As outras tres
    (`grandfatherIncreasedCosts`, `refundDecreasedCosts`,
    `invalidateOnPrereqFailure`) acéptanse na interface pero non
    afectan o comportamento aínda; serán efectivas na sub-fase 3.6.b.
  ```

### T8 — Commit + push

Commit Conventional:
`feat(core): add Reconciler base with refundRemovedNodes (sub-phase 3.6.a)`.
Push directo a `origin/main` (base `f97b467`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/reconciler/Reconciler.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +4 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +1 ErrorCode)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +3 mensaxes)
- `packages/core/__tests__/engine/reconciler/Reconciler.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- Calquera outro ficheiro de `packages/common/` agás `codes.ts` e
  `messages.ts`.
- `packages/storage/`.
- `tsconfig.base.json` ou calquera tsconfig.
- Calquera `tsup.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Tests existentes (cero modificación).
- TreeEngine, ProgressManager, StatComputer, etc. (pezas core
  existentes).

**Se algún destes aparece no diff** → **ESCALAR DURANTE A SUB-FASE**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown` cero esperado** nesta sub-fase (traballamos con tipos
coñecidos do dominio). Se aparece, documenta razón concreta.

---

## 9. QUE NON FACER

- ❌ Implementar `grandfatherIncreasedCosts`, `refundDecreasedCosts`
  ou `invalidateOnPrereqFailure` (5.2 e 5.5: son de 3.6.b).
- ❌ Engadir tipos a `ReconcileChange` que non sexan `node_removed` ou
  `cost_refunded` (5.3: 3.6.b engadiraos).
- ❌ Modificar TreeState ou TreeDef tipos (5.8).
- ❌ Modificar TreeEngine ou outras pezas existentes (5.9).
- ❌ Crear método de TreeEngine para reconciliar (5.1: función pura).
- ❌ Integrar con migracións 3.5 (decisión do director: capas
  separadas).
- ❌ Comprobar límite máximo do Resource ao refundar (5.6).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  ficheiros globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` agás `codes.ts` e `messages.ts`
  (5.7).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.6.a — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base f97b467)
✅ Reconciler función pura (cero acoplamento a TreeEngine)
✅ ReconcileOptions, ReconcileChange, ReconcileResult exportados
✅ Soporte de refundRemovedNodes (3 opcións restantes en 3.6.b)
✅ ErrorCode RECONCILE_TREE_MISMATCH (YGG_R001) + mensaxes 3 locales
✅ Cero modificación de pezas existentes core/storage
✅ Cero acoplamento con sistema de migracións 3.5
✅ Función pura: cero mutación de oldTreeDef, newTreeDef, oldTreeState
✅ T0.2 NodeInstance.state: <valores reportados>
✅ T0.3 Budget shape: <forma reportada>
✅ T0.4 NodeDef.costs shape: <forma reportada>
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> tests Reconciler refundRemovedNodes + edge cases
   - 945 previos intactos
✅ Cobertura:
   - Reconciler.ts 100/<X%>/100/100 (≥95% branch)
   - Global core: <X%> (baseline 98.11%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - 3 opcións de ReconcileOptions acéptanse na interface pero non
     afectan o comportamento aínda (serán efectivas en 3.6.b).
   - refund cero comproba límite máximo do recurso (over-cap responsabilidade
     do consumidor).
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.6.b (3 opcións restantes).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.6.a. Reconciler base con refundRemovedNodes
exclusivamente. Tras 3.4 L1 + 3.5 L2: calquera modificación non
listada → ESCALAR antes.*
