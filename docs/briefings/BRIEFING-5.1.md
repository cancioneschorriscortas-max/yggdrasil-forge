# BRIEFING — SUB-FASE 5.1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Primeira sub-fase da Fase 5 (Sub-trees + Federation).** Crear
> `SubtreeManager` standalone: clase que xestiona o lifecycle dos
> sub-engines (creación, cache, profundidade, ciclos) **SEN modificar
> TreeEngine aínda**. A integración real (TreeEngine.getSubtreeEngine,
> enterSubtree, sincronización parent↔sub) vai en 5.2.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5
L2, 3.6.a L1, 4.3 L1**: calquera modificación fóra de §6 require
**ESCALAR ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 5.1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 5.1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **5.1** de Yggdrasil Forge. **Primeira da Fase 5** (Sub-trees
+ Federation).

**Decisión arquitectónica clave**: SubtreeManager é **standalone** en
5.1. **Cero modificación de TreeEngine**. **Cero sincronización
parent ↔ sub-engine aínda** (vai en 5.2).

**Pezas**:
1. `SubtreeManager` clase.
2. `SubtreeManagerOptions` interface.
3. `TreeEngineFactory` type (factory inxectable para evitar
   acoplamento circular).
4. Helper `mergeTreeDefWithOverrides`.
5. **2 ErrorCodes novos**: `SUBTREE_DEPTH_EXCEEDED` (YGG_E023) +
   `SUBTREE_CYCLE_DETECTED` (YGG_E024).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Tipos de datos xa modelados** (cero crear novos):

- **`NodeType`** ten **`'subtree_anchor'`** (packages/core/src/types/
  node.ts:42).
- **`NodeDef.subtreeId?: string`** existe (node.ts).
- **`NodeDef.subtreeOverrides?: Partial<TreeDef>`** existe (node.ts).
- **`TreeDef.subtrees?: Readonly<Record<string, TreeDef>>`** existe
  (tree.ts:136-138).
- **`TreeState.subtreeStates?: Record<string, TreeState>`** existe
  (tree.ts:136-137).
- **Prereq `subtree_completion`** xa implementada e testada en
  `UnlockResolver` (UnlockResolver.test.ts:326-379).
- **Event `subtreeEntered`** declarado (events.ts:57).
- **`SUBTREE_NOT_FOUND` (YGG_E007)** xa en common, traducido nas
  3 locales.

**O que falta**: a infraestrutura de **xestión** dos sub-engines.
Eso é o que aporta 5.1.

**Modelo inspirador**: Path of Exile Cluster Jewels. Un nodo
`subtree_anchor` ten `subtreeId` que referencia un mini-tree
template (`parentTreeDef.subtrees[subtreeId]`). O `subtreeOverrides`
personaliza esa template (paralelo aos "afixes" do PoE).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `13ef887` (peche oficial Fase 4 no
  MASTER).
- 1221 tests core + 60 common + 171 storage = ~1452 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **Pezas relevantes existentes**:
  - `TreeEngine` constructor: `new TreeEngine(treeDef, initialState?,
    options?)` (T0 verifica sinatura exacta).
  - `Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`, `Locale`,
    `getErrorMessage` dispoñibles en common.
  - `Immer` dispoñible.
- **DT abertas non bloqueantes**: DT-9, DT-11, DT-12, DT-14, DT-15,
  DT-16, DT-17, DT-18.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/SubtreeManager.ts` cunha clase
`SubtreeManager` que xestiona o lifecycle dos sub-engines (creación
lazy, cache, profundidade configurable, detección de ciclos) usando
un `TreeEngineFactory` inxectado para evitar acoplamento circular,
crear helper `mergeTreeDefWithOverrides` que aplica `subtreeOverrides`
a un `TreeDef` base, engadir 2 ErrorCodes novos
(`SUBTREE_DEPTH_EXCEEDED` + `SUBTREE_CYCLE_DETECTED`) con mensaxes
nas 3 locales, exportar publicamente desde core, e cubrir con tests
funcionais. **Cero modificación de TreeEngine**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estrutura de ficheiros

```
packages/core/src/engine/
├── SubtreeManager.ts          ← NOVO: clase SubtreeManager
└── mergeTreeDefWithOverrides.ts ← NOVO: helper
```

**Dous ficheiros físicos** (paralelo a outras pezas separadas como
RadialLayoutConfig + RadialLayout).

### 5.2 — Cero modificación de TreeEngine

**SubtreeManager é standalone**. Para evitar acoplamento circular
(SubtreeManager precisa crear TreeEngine, pero TreeEngine usará
SubtreeManager en 5.2), usamos **factory pattern**:

```ts
export type TreeEngineFactory = (
  treeDef: TreeDef,
  initialState?: TreeState,
) => TreeEngine
```

**O consumidor inxecta a factory**. SubtreeManager **non importa
TreeEngine directamente**, **só usa o tipo TreeEngine** (que pode
importar como `import type`).

**`import type { TreeEngine } from './TreeEngine.js'`**: usar
`import type` é clave para que TypeScript permita a importación
circular sen ciclo a nivel de runtime.

### 5.3 — SubtreeManagerOptions

`SubtreeManager.ts`:

```ts
import type { Locale } from '@yggdrasil-forge/common'
import type { TreeDef, TreeState } from '../types/tree.js'
import type { TreeEngine } from './TreeEngine.js'  // sólo type

/**
 * Factory que crea instancias de TreeEngine.
 *
 * SubtreeManager require unha factory inxectada (cero acoplamento
 * circular con TreeEngine). En 5.2, TreeEngine.getSubtreeEngine
 * pasará a si mesmo como factory ao construír SubtreeManager.
 */
export type TreeEngineFactory = (
  treeDef: TreeDef,
  initialState?: TreeState,
) => TreeEngine

/**
 * Opcións de configuración do SubtreeManager.
 */
export interface SubtreeManagerOptions {
  /**
   * TreeDef do parent. Necesario para resolver subtreeId →
   * `parentTreeDef.subtrees[subtreeId]`.
   */
  readonly parentTreeDef: TreeDef

  /**
   * Estado runtime do parent. Necesario para inicializar sub-engines
   * con `parentState.subtreeStates[subtreeId]` se xa existe.
   */
  readonly parentState: TreeState

  /**
   * Factory para crear sub-engines.
   */
  readonly engineFactory: TreeEngineFactory

  /**
   * Profundidade desta instancia de SubtreeManager. Default 0 (para
   * o do parent principal). Sub-engines crean o seu SubtreeManager
   * con depth+1.
   */
  readonly depth?: number

  /**
   * Máxima profundidade permitida. Default 10. Cando getOrCreateSubtree
   * intenta crear un sub-engine que excedería este límite, devolve
   * err(SUBTREE_DEPTH_EXCEEDED).
   */
  readonly maxDepth?: number

  /**
   * Locale para mensaxes de erro. Default 'gl'.
   */
  readonly locale?: Locale

  /**
   * Set de subtreeIds activos na cadea recursiva ancestral. Usado
   * para cycle detection. Cero pasar desde o consumidor inicial
   * (default Set vacío); SubtreeManager interno propágao aos
   * SubtreeManagers dos sub-engines (en 5.2).
   *
   * NOTA: en 5.1 cero hai uso real porque cero hai recursión
   * (SubtreeManager non se crea desde dentro doutro SubtreeManager
   * aínda). Anticípase para 5.2.
   */
  readonly activeSubtreeIds?: ReadonlySet<string>
}
```

### 5.4 — SubtreeManager clase

```ts
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { TreeDef, TreeState } from '../types/tree.js'
import type { TreeEngine } from './TreeEngine.js'
import { mergeTreeDefWithOverrides } from './mergeTreeDefWithOverrides.js'

const DEFAULT_LOCALE: Locale = 'gl'
const DEFAULT_MAX_DEPTH = 10

/**
 * Xestor do lifecycle de sub-engines (TreeEngine instances para
 * sub-trees aniñadas).
 *
 * Responsabilidades:
 * - Creación lazy de sub-engines ao primeiro acceso.
 * - Cache: o mesmo subtreeId devolve sempre a mesma instance.
 * - Verificación de profundidade (maxDepth).
 * - Detección de ciclos (subtreeId que se referencia a si mesmo
 *   nunha cadea ancestral).
 *
 * NOTA: en 5.1 SubtreeManager é standalone. Non modifica TreeEngine.
 * A integración real (TreeEngine.getSubtreeEngine, enterSubtree,
 * sincronización parent ↔ sub) vai en 5.2.
 *
 * Patrón paralelo a MigrationRegistry, LayoutEngineRegistry,
 * Reconciler: peza standalone reutilizable por TreeEngine cando
 * sexa necesaria.
 */
export class SubtreeManager {
  private readonly parentTreeDef: TreeDef
  private readonly parentState: TreeState
  private readonly engineFactory: TreeEngineFactory
  private readonly depth: number
  private readonly maxDepth: number
  private readonly locale: Locale
  private readonly activeSubtreeIds: ReadonlySet<string>
  private readonly cache = new Map<string, TreeEngine>()

  constructor(options: SubtreeManagerOptions) {
    this.parentTreeDef = options.parentTreeDef
    this.parentState = options.parentState
    this.engineFactory = options.engineFactory
    this.depth = options.depth ?? 0
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
    this.locale = options.locale ?? DEFAULT_LOCALE
    this.activeSubtreeIds = options.activeSubtreeIds ?? new Set()
  }

  /**
   * Devolve o sub-engine xa creado para subtreeId, ou null se non
   * foi creado aínda. Lookup pasivo.
   */
  getExistingSubtree(subtreeId: string): TreeEngine | null {
    return this.cache.get(subtreeId) ?? null
  }

  /**
   * Verifica se hai un sub-engine creado para subtreeId.
   */
  hasSubtree(subtreeId: string): boolean {
    return this.cache.has(subtreeId)
  }

  /**
   * Crea (ou devolve cached) un sub-engine para subtreeId.
   *
   * Validacións aplicadas (en orde):
   * 1. Cache check: se xa existe, devolve.
   * 2. Cycle check: se subtreeId está en `activeSubtreeIds`, devolve
   *    err(SUBTREE_CYCLE_DETECTED).
   * 3. Depth check: se `depth + 1 > maxDepth`, devolve
   *    err(SUBTREE_DEPTH_EXCEEDED).
   * 4. Existence check: se parentTreeDef.subtrees[subtreeId] non
   *    existe, devolve err(SUBTREE_NOT_FOUND).
   * 5. Procura o subtree_anchor NodeDef no parentTreeDef.nodes con
   *    `subtreeId` matching para obter `subtreeOverrides`. Se cero
   *    nodo o referencia, usa overrides vacíos.
   * 6. Aplicar subtreeOverrides ao TreeDef base usando
   *    mergeTreeDefWithOverrides.
   * 7. Recuperar estado inicial desde parentState.subtreeStates[
   *    subtreeId] se existe.
   * 8. Chamar engineFactory(mergedTreeDef, initialState).
   * 9. Cachear e devolver.
   */
  getOrCreateSubtree(subtreeId: string): Result<TreeEngine> {
    // 1. Cache check
    const cached = this.cache.get(subtreeId)
    if (cached !== undefined) {
      return ok(cached)
    }

    // 2. Cycle check
    if (this.activeSubtreeIds.has(subtreeId)) {
      return err(
        new YggdrasilError(
          ErrorCode.SUBTREE_CYCLE_DETECTED,
          getErrorMessage(ErrorCode.SUBTREE_CYCLE_DETECTED, this.locale, {
            subtreeId,
            chain: Array.from(this.activeSubtreeIds).join(' → '),
          }),
          { context: { subtreeId } },
        ),
      )
    }

    // 3. Depth check
    if (this.depth + 1 > this.maxDepth) {
      return err(
        new YggdrasilError(
          ErrorCode.SUBTREE_DEPTH_EXCEEDED,
          getErrorMessage(ErrorCode.SUBTREE_DEPTH_EXCEEDED, this.locale, {
            depth: this.depth + 1,
            maxDepth: this.maxDepth,
          }),
          { context: { depth: this.depth + 1, maxDepth: this.maxDepth } },
        ),
      )
    }

    // 4. Existence check
    const subtreeTemplate = this.parentTreeDef.subtrees?.[subtreeId]
    if (subtreeTemplate === undefined) {
      return err(
        new YggdrasilError(
          ErrorCode.SUBTREE_NOT_FOUND,
          getErrorMessage(ErrorCode.SUBTREE_NOT_FOUND, this.locale, {
            subtreeId,
          }),
          { context: { subtreeId } },
        ),
      )
    }

    // 5. Buscar subtree_anchor NodeDef que referencia este subtreeId
    const anchorNode = this.parentTreeDef.nodes.find(
      (n) => n.subtreeId === subtreeId,
    )
    const overrides = anchorNode?.subtreeOverrides ?? {}

    // 6. Aplicar overrides
    const mergedTreeDef = mergeTreeDefWithOverrides(
      subtreeTemplate,
      overrides,
    )

    // 7. Recuperar estado inicial
    const initialState = this.parentState.subtreeStates?.[subtreeId]

    // 8. Crear sub-engine via factory
    const subEngine = this.engineFactory(mergedTreeDef, initialState)

    // 9. Cachear e devolver
    this.cache.set(subtreeId, subEngine)
    return ok(subEngine)
  }

  /**
   * Lista todos os subtreeIds con sub-engine creado.
   */
  listSubtrees(): readonly string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Destrúe o sub-engine para subtreeId (libera memoria). Devolve
   * true se había un sub-engine, false se non.
   */
  destroySubtree(subtreeId: string): boolean {
    return this.cache.delete(subtreeId)
  }

  /**
   * Conta de sub-engines vivos no cache.
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Limpa todos os sub-engines do cache.
   */
  clear(): void {
    this.cache.clear()
  }
}
```

### 5.5 — mergeTreeDefWithOverrides helper

`mergeTreeDefWithOverrides.ts`:

```ts
import type { TreeDef } from '../types/tree.js'

/**
 * Aplica overrides parciais a un TreeDef base.
 *
 * Estratexia (versión simple 5.1):
 * - `id`: NON se sobreescribe (o id do TreeDef base sempre prevalece).
 * - `nodes`: substitúe completamente se overrides.nodes está
 *   definido.
 * - `edges`: substitúe completamente se overrides.edges está
 *   definido.
 * - Todos os outros campos (`name`, `description`, `layout`,
 *   `budget`, `metadata`, `subtrees`): substitúe se está definido
 *   en overrides; preserva base se non.
 *
 * Cero merge intelixente de nodes/edges en 5.1. Sub-fases futuras
 * poden implementar merge granular se procede (ex: engadir nodos
 * a unha sub-tree base sen substituír os existentes).
 */
export function mergeTreeDefWithOverrides(
  base: TreeDef,
  overrides: Partial<TreeDef>,
): TreeDef {
  return {
    ...base,
    ...overrides,
    // id sempre preserva o base (cero sobrescritura)
    id: base.id,
  }
}
```

**Decisión clave**:
- **Cero merge granular** de nodes/edges. **Versión simple**.
- **`id` NON se sobrescribe**: o id do subtree template sempre
  prevalece. Iso garante que `subtreeStates[subtreeId]` apunta
  sempre ao mesmo TreeDef.
- **Implementación 5 liñas**: súper minimal. **A funcionalidade real
  está en saber que `overrides ?? base`** funciona con spread.

### 5.6 — ErrorCodes novos en common

**Familia YGG_E (Engine errors)** ten que ampliarse con 2 códigos:

Modificar `packages/common/src/errors/codes.ts`:

```ts
// Despois de INVALID_PROGRESS_OPERATION = 'YGG_E022':
SUBTREE_DEPTH_EXCEEDED = 'YGG_E023',
SUBTREE_CYCLE_DETECTED = 'YGG_E024',
```

Modificar `packages/common/src/errors/messages.ts` con mensaxes nas
3 locales:

- **SUBTREE_DEPTH_EXCEEDED**:
  - gl: 'Profundidade máxima de sub-árbores excedida: {depth} > {maxDepth}'
  - es: 'Profundidad máxima de sub-árboles excedida: {depth} > {maxDepth}'
  - en: 'Maximum subtree depth exceeded: {depth} > {maxDepth}'
- **SUBTREE_CYCLE_DETECTED**:
  - gl: 'Detectouse un ciclo de sub-árbores: {subtreeId} xa está activo en {chain}'
  - es: 'Se detectó un ciclo de sub-árboles: {subtreeId} ya está activo en {chain}'
  - en: 'Subtree cycle detected: {subtreeId} is already active in {chain}'

**ATENCIÓN procedural**: modificar `packages/common/` está normalmente
prohibido tras 3.4 L1. **Esta sub-fase autoriza explicitamente** os
2 ficheiros (`codes.ts` + `messages.ts`). **Cero outros cambios en
common**.

### 5.7 — Cero modificación de TreeEngine ou outras pezas existentes

**Cero modificación** de:
- TreeEngine.
- ProgressManager, StatComputer, EffectsRunner, UnlockResolver,
  TimeManager, DependencyGraph, AuditLogger, Reconciler.
- Layout Engine (4.1-4.5 intactos).
- Migration Registry / Runner / AutoBackup (3.5).
- Tipos TreeDef, NodeDef, EdgeDef, TreeState.

**SI se modifica**:
- `packages/common/src/errors/codes.ts` (+2 ErrorCodes).
- `packages/common/src/errors/messages.ts` (+2 entradas; 6 mensaxes
  totais).
- `packages/core/src/engine/index.ts` (+exports).

### 5.8 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
export { SubtreeManager } from './SubtreeManager.js'
export type {
  SubtreeManagerOptions,
  TreeEngineFactory,
} from './SubtreeManager.js'
export { mergeTreeDefWithOverrides } from './mergeTreeDefWithOverrides.js'
```

### 5.9 — Tests funcionais

Crear dous ficheiros de test en
`packages/core/__tests__/engine/`:

**`SubtreeManager.test.ts`** (~25 tests):

*Construción:*
1. Construír con opcións mínimas: cero error, size === 0.
2. Construír con defaults: depth=0, maxDepth=10, locale='gl'.
3. Construír con depth custom: usa depth pasada.
4. Construír con maxDepth custom: usa maxDepth pasada.

*getExistingSubtree:*
5. SubtreeId non creado: devolve null.
6. SubtreeId creado: devolve TreeEngine.
7. Distintos IDs: devolven distintas instances.

*hasSubtree:*
8. Subtree non creado: false.
9. Subtree creado: true.

*getOrCreateSubtree - cache:*
10. Primera chamada: crea + cachea.
11. Segunda chamada co mesmo ID: devolve cached (mesma instance).

*getOrCreateSubtree - cycle:*
12. activeSubtreeIds contén ese ID: err(SUBTREE_CYCLE_DETECTED).
13. cycleDetected mensaxe contén o subtreeId.
14. cycleDetected mensaxe contén a chain.

*getOrCreateSubtree - depth:*
15. depth+1 > maxDepth: err(SUBTREE_DEPTH_EXCEEDED).
16. depth=9, maxDepth=10: getOrCreate pasa (10 ≤ 10).
17. depth=10, maxDepth=10: getOrCreate falla (11 > 10).
18. maxDepth=0 (caso edge): primera chamada falla.

*getOrCreateSubtree - existence:*
19. parentTreeDef.subtrees indefinido: err(SUBTREE_NOT_FOUND).
20. parentTreeDef.subtrees existe pero non ten ese ID:
    err(SUBTREE_NOT_FOUND).

*getOrCreateSubtree - subtreeOverrides:*
21. Cero anchor con subtreeId: usa overrides vacíos.
22. Anchor existe sen overrides: usa overrides vacíos.
23. Anchor con subtreeOverrides: aplícanse via
    mergeTreeDefWithOverrides.

*getOrCreateSubtree - initial state:*
24. parentState.subtreeStates[id] indefinido: factory recibe
    undefined.
25. parentState.subtreeStates[id] existe: factory recibe ese estado.

*listSubtrees + destroySubtree + clear + size:*
26. listSubtrees baleiro: [].
27. listSubtrees tras 2 creates: contén ambos IDs.
28. destroySubtree existente: devolve true; size diminúe.
29. destroySubtree non existente: devolve false.
30. clear: size → 0.

*Locale:*
31. Locale 'es' propágase ás mensaxes.
32. Locale 'en' propágase.

**Total: ~32 tests (engadín algúns ao listado inicial; conta final 
aproximada 25-32 segundo agrupación).**

**`mergeTreeDefWithOverrides.test.ts`** (~10 tests):

1. Overrides vacíos: devolve base inalterado (deep equal).
2. Overrides con name: name substituído.
3. Overrides con nodes: nodes substituído completamente.
4. Overrides con edges: edges substituído completamente.
5. Overrides con layout: layout substituído.
6. Overrides con budget: budget substituído.
7. Overrides con metadata: metadata substituído.
8. Overrides con id: id NON se sobrescribe (sempre base.id).
9. Overrides combinados (nodes + name + layout): todos aplicados.
10. base inalterado (cero mutación).

**Total: ~10 tests.**

### 5.10 — Cobertura

- `SubtreeManager.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch (peza non
  extremadamente densa; lección 3.5 L1 aplicable só para ramas
  defensivas inevitábeis).
- `mergeTreeDefWithOverrides.ts`: 100/100/100/100 (peza trivial).
- Global core: non baixar de baseline (97.91%). **Mellora esperada**.

### 5.11 — Cero ampliación de TreeDef ou NodeDef

Os tipos xa están modelados (verificado en investigación). **Cero
modificar**.

### 5.12 — Cero relación con Layout Engine

SubtreeManager non interactúa con LayoutEngine ou layouts. **Cero
imports**.

### 5.13 — Determinismo

- `getOrCreateSubtree` ten orde determinista: 1.cache → 2.cycle →
  3.depth → 4.existence → 5.anchor lookup → 6.merge → 7.initial state
  → 8.factory call → 9.cache.
- `listSubtrees`: usa `Array.from(cache.keys())`; orde de inserción
  Map.

### 5.14 — Tamaño previsto

- `SubtreeManager.ts`: ~180 liñas.
- `mergeTreeDefWithOverrides.ts`: ~30 liñas.
- Tests: ~250 liñas.
- **Total**: ~460 liñas (incluíndo tests).

Comparable a 4.4 (sub-fase mediana-pequena).

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/SubtreeManager.ts` (NOVO)
- `packages/core/src/engine/mergeTreeDefWithOverrides.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +3 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +2 ErrorCodes;
  autorizado por 5.6)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +6 mensaxes:
  2 ErrorCodes × 3 locales; autorizado por 5.6)

**Tests:**
- `packages/core/__tests__/engine/SubtreeManager.test.ts` (NOVO)
- `packages/core/__tests__/engine/mergeTreeDefWithOverrides.test.ts`
  (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1221 tests core + 60 common + 171 storage con `--force`.

2. **Verifica sinatura exacta de TreeEngine constructor**:
   ```
   grep -B1 -A8 "constructor\|class TreeEngine" packages/core/src/engine/TreeEngine.ts | head -25
   ```
   Confirma a forma: probablemente
   `constructor(treeDef: TreeDef, initialState?: TreeState, options?: TreeEngineOptions)`.
   Se difire significativamente, **ESCALAR**.

3. **Verifica shape de TreeDef.subtrees e NodeDef.subtreeId**:
   ```
   grep -B2 -A4 "subtrees\b\|subtreeId\|subtreeOverrides\|subtreeStates" \
     packages/core/src/types/*.ts | head -30
   ```
   Confirma que todos os campos modelados están como esperado en §2.

4. **Verifica patrón exacto de ErrorCodes existentes** (para replicar
   estilo):
   ```
   grep -A2 "SUBTREE_NOT_FOUND\|INVALID_PROGRESS_OPERATION" \
     packages/common/src/errors/codes.ts
   grep -A4 "SUBTREE_NOT_FOUND\|INVALID_PROGRESS_OPERATION" \
     packages/common/src/errors/messages.ts
   ```

### T1 — Engadir ErrorCodes + mensaxes en common (5.6)

1. Editar `packages/common/src/errors/codes.ts`:
   - Engadir `SUBTREE_DEPTH_EXCEEDED = 'YGG_E023'` despois de
     INVALID_PROGRESS_OPERATION.
   - Engadir `SUBTREE_CYCLE_DETECTED = 'YGG_E024'` despois.
2. Editar `packages/common/src/errors/messages.ts`:
   - Engadir as 6 mensaxes (gl/es/en × 2 ErrorCodes).
3. Typecheck 20/20.
4. Confirma 60 tests common seguen pasando (cero ruptura).

### T2 — mergeTreeDefWithOverrides (5.5)

Crear `packages/core/src/engine/mergeTreeDefWithOverrides.ts`.

Typecheck 20/20.

### T3 — Tests mergeTreeDefWithOverrides (5.9)

Crear `__tests__/engine/mergeTreeDefWithOverrides.test.ts` cos ~10
tests. **Cobertura 100%**.

### T4 — SubtreeManager (5.3 + 5.4)

Crear `packages/core/src/engine/SubtreeManager.ts` con:
- `TreeEngineFactory` type.
- `SubtreeManagerOptions` interface.
- `SubtreeManager` clase coa lóxica completa.

**Importante**: usar `import type { TreeEngine }` (cero runtime
import) para evitar acoplamento.

Typecheck 20/20.

### T5 — Tests SubtreeManager (5.9)

Crear `__tests__/engine/SubtreeManager.test.ts` cos ~30 tests.
**Cobertura ≥95% Branch**.

**Setup dos tests**: precisas mockear `engineFactory`. Pode ser unha
factory simple que cree un mock TreeEngine ou un TreeEngine real co
construtor verificado en T0.2.

**Recomendación**: usar **TreeEngine real** (cero mock) para
verificar integración. Configurar TreeDefs mínimas (1 nodo).

### T6 — Exportar dende engine/index.ts (5.8)

Engadir 3 exports.

### T7 — Verificación post-T6

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1221 tests previos seguen pasando intactos.
- 60 common previos intactos (cero ruptura por +2 ErrorCodes).
- 171 storage previos intactos.

### T8 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- SubtreeManager.ts 100/≥95%/100/100.
- mergeTreeDefWithOverrides.ts 100/100/100/100.
- Global core ≥97.91%.

### T9 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/SubtreeManager.ts \
  packages/core/src/engine/mergeTreeDefWithOverrides.ts
pnpm test
```

**Nota sobre `unknown`**: cero esperado.

- Changeset **minor** para `@yggdrasil-forge/core` (engade API nova).
- Changeset **patch** para `@yggdrasil-forge/common` (engade ErrorCodes).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `SubtreeManager` clase: xestor de lifecycle dos sub-engines
    (TreeEngine instances para sub-trees aniñadas):
    - Creación lazy via `getOrCreateSubtree(subtreeId)`.
    - Cache: o mesmo subtreeId devolve sempre a mesma instance.
    - Verificación de profundidade (`maxDepth`, default 10).
    - Detección de ciclos (subtreeId activo na cadea ancestral).
    - API: `getExistingSubtree`, `hasSubtree`, `getOrCreateSubtree`,
      `listSubtrees`, `destroySubtree`, `clear`, `size`.
  - `TreeEngineFactory` type: factory inxectable para evitar
    acoplamento circular (en 5.2 TreeEngine pasarase a si mesmo
    como factory).
  - `SubtreeManagerOptions` type.
  - `mergeTreeDefWithOverrides(base, overrides)` helper: aplica
    Partial<TreeDef> a un TreeDef base (substitución simple; id
    sempre preserva base).
  - ErrorCodes novos: `SUBTREE_DEPTH_EXCEEDED` (YGG_E023) +
    `SUBTREE_CYCLE_DETECTED` (YGG_E024), traducidos en gl/es/en.

  ### Note
  - Sub-fase 5.1 PRIMEIRA da Fase 5. SubtreeManager é **standalone**:
    cero modificación de TreeEngine. A integración real
    (TreeEngine.getSubtreeEngine, enterSubtree, sincronización
    parent ↔ sub-engine) vai en 5.2 (Recursive engine).
  - O modelo de datos para sub-trees xa estaba modelado en código
    desde Fase 1 (NodeType 'subtree_anchor', NodeDef.subtreeId/
    subtreeOverrides, TreeDef.subtrees, TreeState.subtreeStates,
    Prereq subtree_completion). A 5.1 engade a infraestrutura de
    XESTIÓN.
  - Modelo inspirador: Path of Exile Cluster Jewels. Un nodo
    subtree_anchor expón un mini-tree ao desbloquearse;
    subtreeOverrides personaliza a template (paralelo aos "afixes"
    de PoE).
  ```

### T10 — Commit + push

Commit Conventional:
`feat(core): add SubtreeManager standalone (sub-phase 5.1)`.
Push directo a `origin/main` (base `13ef887`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/SubtreeManager.ts` (NOVO)
- `packages/core/src/engine/mergeTreeDefWithOverrides.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +3 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +2 ErrorCodes;
  autorizado por 5.6)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +6 mensaxes;
  autorizado por 5.6)
- `packages/core/__tests__/engine/SubtreeManager.test.ts` (NOVO)
- `packages/core/__tests__/engine/mergeTreeDefWithOverrides.test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO; 2 ficheiros: core minor + common patch)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, `vitest.config.ts`,
  `turbo.json`, `biome.json`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- TreeEngine.ts (5.7: cero modificación).
- Calquera outra peza core (ProgressManager, UnlockResolver,
  layouts/, etc.).
- Tests existentes (cero modificación).
- TreeDef, NodeDef tipos.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` opcionais en ficheiros pequenos. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF.
TS strict, **cero `any`**. NON desactives Biome.

**Import type**: usar `import type { TreeEngine }` para evitar
runtime circular dependency.

---

## 9. QUE NON FACER

- ❌ Modificar TreeEngine (5.7: cero modificación; integración vai
  en 5.2).
- ❌ Engadir `getSubtreeEngine` ou `enterSubtree` a TreeEngine
  (vai en 5.2).
- ❌ Implementar sincronización parent ↔ sub-engine (5.7: vai en
  5.2).
- ❌ Implementar budget compartido (5.7: vai en 5.2; en 5.1 cada
  sub-engine ten o seu propio budget desde initialState ou desde
  cero).
- ❌ Implementar merge granular de nodes/edges en
  mergeTreeDefWithOverrides (5.5: versión simple substitúe
  completamente).
- ❌ Engadir `subtree_anchor` a NodeType (xa existe).
- ❌ Modificar NodeDef ou TreeDef (5.11: xa están modelados).
- ❌ Importar TreeEngine como runtime (5.2: usar `import type`).
- ❌ Engadir ErrorCodes adicionais (só os 2 prescritos en 5.6).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` agás `codes.ts` e `messages.ts`
  (5.6 autorizado).
- ❌ Modificar `packages/storage/`.
- ❌ Modificar LayoutEngine ou pezas Fase 4 (5.12: cero relación).
- ❌ Implementar Federator (5.3).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 5.1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 13ef887)
✅ SubtreeManager standalone:
   - getExistingSubtree, hasSubtree, getOrCreateSubtree,
     listSubtrees, destroySubtree, clear, size
   - maxDepth check (default 10)
   - Cycle detection via activeSubtreeIds
   - Cache lazy
✅ TreeEngineFactory type (factory inxectable; cero acoplamento
   circular)
✅ mergeTreeDefWithOverrides helper (substitución simple; id preserva
   base)
✅ 2 ErrorCodes novos:
   - SUBTREE_DEPTH_EXCEEDED (YGG_E023)
   - SUBTREE_CYCLE_DETECTED (YGG_E024)
   3 locales: gl/es/en
✅ Cero modificación de TreeEngine (integración vai en 5.2)
✅ Cero modificación de outras pezas existentes
✅ Cero modificación de storage/tsconfig/tsup
✅ T0.2 TreeEngine constructor verificado: <sinatura>
✅ T0.3 TreeDef.subtrees + NodeDef.subtreeId/subtreeOverrides +
   TreeState.subtreeStates verificados xa modelados
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> SubtreeManager (construcción + cache + cycle + depth +
     existence + overrides + initial state + locale)
   - <Y> mergeTreeDefWithOverrides
✅ Cobertura:
   - SubtreeManager 100/<X%>/100/100
   - mergeTreeDefWithOverrides 100/100/100/100
   - Global core: <X%> (baseline 97.91%; mantense ou sobe)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 5.1 PRIMEIRA da Fase 5. SubtreeManager standalone.
   - Modelo de datos sub-trees xa modelado desde Fase 1; 5.1 engade
     a XESTIÓN.
   - Integración con TreeEngine + sincronización parent ↔ sub-engine
     + budget compartido vai en 5.2.
   - Federator vai en 5.3.
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 5.2 (Recursive engine integration).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 5.1. SubtreeManager standalone. Cero modificación de
TreeEngine. Modelo PoE Cluster Jewels. Cero risco arquitectónico real
porque cero modifica pezas existentes.*
