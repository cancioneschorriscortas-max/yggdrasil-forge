# BRIEFING — SUB-FASE 6.2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Segunda sub-fase da Fase 6 (TreeRegistry + Multi-tenancy).** Engadir
> as 4 **Aggregate queries** ao `TreeRegistry` xa existente:
> `getAggregateStats`, `getNodePopularity`, `getProgressDistribution`,
> `getStuckUsers`. **Todas operan directamente sobre storage sen
> instanciar TreeEngines** (MASTER §5.6.5). **`ScopedStorage` (6.3),
> Quotas + Permissions (6.4) seguen DIFERIDAS**.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír falsos
positivos como "TODOS" en galego = "all", precedente 6.1).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2,
3.6.a L1, 4.3 L1, 5.2 L1+L2, 6.1 L1+L2**: calquera modificación fóra
de §6 require **ESCALAR ANTES DE APLICAR**. **APIs prescritas en
código exemplo deben verificarse empíricamente** (5.2 L2): se algún
método/campo prescrito non existe na sinatura real, **cazar e
corrixir transparentemente**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 6.2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 6.2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.
NON consolidar coa de 6.1.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1)**: ramas defensivas verificablemente
inalcanzables por API pública anótanse con `/* c8 ignore next */ +
comentario xustificativo`, NON tolerar baixadas globais de cobertura.

---

## 1. IDENTIFICACIÓN

Sub-fase **6.2** de Yggdrasil Forge. **Segunda da Fase 6**
(TreeRegistry + Multi-tenancy).

**Pezas**:

1. **`AggregateStats` interface** exportada publicamente.
2. **4 métodos novos** en `TreeRegistry`:
   - `getAggregateStats(): Promise<AggregateStats>`
   - `getNodePopularity(): Promise<Map<string, number>>`
   - `getProgressDistribution(nodeId: string): Promise<number[]>`
   - `getStuckUsers(threshold?: number): Promise<string[]>`
3. **1 helper privado** `loadAllStates()` para reutilización.
4. **Exportación pública** de `AggregateStats` desde `engine/index.ts`.

**Cero modificación de pezas non listadas**: TreeEngine, SubtreeManager,
Federator, layouts, StorageAdapter, lifecycle de TreeRegistry (createEngine,
getEngine, etc.), build management.

**`ScopedStorage` (6.3), `Quotas` + `Permissions` (6.4) DIFERIDAS**.

**CERO ErrorCodes novos** (as 4 queries devolven valores directos sen
`Result<>` segundo MASTER §11; storage failures manexánse internamente
con best-effort skip). **Cero modificación de `packages/common/`**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Spec MASTER §11 (interface fixada, NON modificable)**:

```typescript
interface AggregateStats {
  totalUsers: number
  avgUnlockedCount: number
  avgProgress: number
  mostPopularNodes: { nodeId: string, count: number }[]
  leastPopularNodes: { nodeId: string, count: number }[]
  completionRate: number
}

// En clase TreeRegistry:
async getAggregateStats(): Promise<AggregateStats>
async getNodePopularity(): Promise<Map<string, number>>
async getProgressDistribution(nodeId: string): Promise<number[]>
async getStuckUsers(threshold?: number): Promise<string[]>
```

**Decisión MASTER §5.6.5** (autoritativa): *"Aggregate queries directas
sobre storage. Sen cargar engines."* — leemos `engine:${userId}:state`
desde storage e procesamos in-memory. **Cero TreeEngine instances**.

**Auditoría do director (sobre commit `2ddc511`, verificada empíricamente
en clone independente)**:

- `TreeRegistry` xa ten `this.storage: StorageAdapter`, `this.userIds:
  Set<string>`, e o schema de claves `engine:${userId}:state`.
- `TreeState` shape (verificada en `packages/core/src/types/tree.ts`):
  ```ts
  interface TreeState {
    nodes: Record<string, NodeInstance>
    budget: Budget
    computedStats?: Record<string, number>
    metadata?: Record<string, unknown>
    subtreeStates?: Record<string, TreeState>
  }
  ```
- `NodeInstance.state: NodeState` (union: `'locked' | 'unlockable' |
  'in_progress' | 'unlocked' | 'maxed' | 'disabled' | 'expired'`).
- `NodeInstance.progress?: number` (0-100).
- **Semántica autoritativa de "unlocked"**: 3 callsites en TreeEngine.ts
  (liñas 583, 813, 1203) confirman `state === 'unlocked' || state ===
  'maxed'`. **Usar esta convención**.
- `StorageAdapter.get(key)` devolve `Promise<Result<unknown | null>>`.
- Test pattern xa establecido en `__tests__/engine/TreeRegistry.test.ts`:
  `makeTreeDef()`, `makeOptions()`, `MemoryStorage` real, `engine.unlock()`
  para xerar state non-default.

**Caso de uso**: o profesor (SaaS educativo) quere métricas globais
sobre N estudantes:
- Cantos completaron a árbore? → `completionRate`.
- Que nodos son máis populares (lección X aprendida pola maioría)? →
  `mostPopularNodes`.
- Que nodos son evitados ou difíciles? → `leastPopularNodes`.
- Que estudantes están estancados? → `getStuckUsers(threshold)`.
- Cal é a distribución de progreso para a lección X? →
  `getProgressDistribution(nodeId)`.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `2ddc511` (TreeRegistry sub-fase 6.1).
- 1457 tests core + 60 common + 171 storage = **~1688 monorepo limpo**.
- Typecheck 21/21, lint 0/0.
- 53 ErrorCodes existentes (ata YGG_E032).
- `TreeRegistry.ts` 555 liñas; cobertura 94.53/85.1/100/98.85.
- Global core cobertura 97.26/90.8/98.8/98.05 (novo baseline post-6.1).
- DT abertas: DT-9, DT-11, DT-12, DT-14 a DT-23.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao `packages/core/src/engine/TreeRegistry.ts` existente:
unha interface pública `AggregateStats` (forma fixa segundo MASTER §11),
4 métodos públicos asíncronos (`getAggregateStats`, `getNodePopularity`,
`getProgressDistribution`, `getStuckUsers`) que leen TreeStates
directamente desde storage sen instanciar TreeEngines, un helper
privado `loadAllStates()` para reutilizar lóxica de carga,
exportación pública de `AggregateStats` desde `engine/index.ts`, e
~25 tests funcionais novos. **CERO ErrorCodes novos, CERO modificación
de `packages/common/`, CERO modificación de pezas existentes do
TreeRegistry**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Estructura de ficheiros

**Engadir** ao único ficheiro existente: `packages/core/src/engine/TreeRegistry.ts`.

**Cero ficheiro novo**. `AggregateStats` exportada inline xunto a
`TreeRegistryOptions` e `TreeRegistryCacheConfig` (mesmo padrón da 6.1).

### 5.2 — Forma de AggregateStats (FIXADA, non negociable)

```ts
export interface AggregateStats {
  /** Total de usuarios rexistrados no registry. */
  readonly totalUsers: number
  /** Promedio de nodos unlocked-or-maxed por usuario. 0 se totalUsers=0. */
  readonly avgUnlockedCount: number
  /**
   * Promedio do campo `progress` entre todos os NodeInstance que teñen
   * `progress` definido en todos os usuarios. 0 se cero nodos teñen
   * progress definido.
   */
  readonly avgProgress: number
  /** Top-N nodos máis populares (count = nº de users con unlocked-or-maxed). */
  readonly mostPopularNodes: ReadonlyArray<{ readonly nodeId: string; readonly count: number }>
  /** Bottom-N nodos menos populares (cero excluídos: count pode ser 0). */
  readonly leastPopularNodes: ReadonlyArray<{ readonly nodeId: string; readonly count: number }>
  /**
   * Ratio de usuarios que teñen TODOS os nodos do treeDef en estado
   * unlocked-or-maxed. Rango [0, 1]. 0 se totalUsers=0.
   */
  readonly completionRate: number
}
```

**Top-N fixado**: **10 nodos** en `mostPopularNodes` e `leastPopularNodes`.
Se o treeDef ten menos de 10 nodos, devolver todos os existentes.
Se ten 0 nodos, ambos arrays son `[]`.

### 5.3 — Semántica autoritativa de "unlocked"

```ts
// REUTILIZAR esta convención exacta de TreeEngine.ts (liñas 583, 813, 1203):
const isUnlocked = (instance: NodeInstance): boolean =>
  instance.state === 'unlocked' || instance.state === 'maxed'
```

**Cero divergencia**. **Cero engadir** outras semánticas tipo "in_progress
conta como semi-unlocked". Helper privado.

### 5.4 — Acceso a state — sen instanciar engines (MASTER §5.6.5)

Helper privado central:

```ts
/**
 * Le TreeState de cada userId rexistrado directamente desde storage.
 *
 * **Sen instanciar TreeEngines** (decisión MASTER §5.6.5). Best-effort:
 * se algún userId falla a ler (storage error ou null), skip silencioso.
 * Devolve un Map con só os userIds cuxo state se conseguiu cargar
 * correctamente.
 *
 * **Precondición** (documentar): para que aggregate reflicte estado
 * actual, o consumidor debe ter chamado `save()` previamente. Engines
 * en cache aínda non persistidos non contan. En estratexia 'on-demand'
 * isto cúmplese automaticamente (createEngine persiste in situ); en
 * 'all-in-memory' e 'lru' require save() explícito tras mutacións.
 */
private async loadAllStates(): Promise<Map<string, TreeState>> {
  const states = new Map<string, TreeState>()
  for (const userId of this.userIds) {
    const result = await this.storage.get(`engine:${userId}:state`)
    if (!result.ok) continue                    // best-effort skip
    if (result.value === null) continue          // nunca persistido
    states.set(userId, result.value as TreeState)
  }
  return states
}
```

**Iteración**: usar `this.userIds` (Set xa mantido). Cero `storage.list()`
(evita acoplar a un prefixo concreto; 6.3 ScopedStorage podería cambialo).

### 5.5 — Subtree handling

**Cero descenso a `subtreeStates`**. Todas as queries operan sobre
`state.nodes` top-level únicamente. Análise de sub-árbores **DIFERIDA**
a unha sub-fase futura (non hai signature prescrita en MASTER para isto).
**Documentar como decisión consciente** no JSDoc dos métodos.

### 5.6 — getAggregateStats — pseudo-código

```ts
async getAggregateStats(): Promise<AggregateStats> {
  const states = await this.loadAllStates()
  const totalUsers = states.size
  const treeNodeIds = this.treeDef.nodes.map(n => n.id)
  const totalTreeNodes = treeNodeIds.length

  if (totalUsers === 0) {
    return {
      totalUsers: 0,
      avgUnlockedCount: 0,
      avgProgress: 0,
      mostPopularNodes: [],
      leastPopularNodes: [],
      completionRate: 0,
    }
  }

  // Conteos por nodeId (popularidade)
  const popularity = new Map<string, number>()
  for (const nodeId of treeNodeIds) popularity.set(nodeId, 0)

  let totalUnlocked = 0
  let totalProgressSum = 0
  let totalProgressCount = 0
  let completedUsers = 0

  for (const state of states.values()) {
    let userUnlockedCount = 0
    for (const nodeId of treeNodeIds) {
      const instance = state.nodes[nodeId]
      if (instance !== undefined && isUnlocked(instance)) {
        popularity.set(nodeId, (popularity.get(nodeId) ?? 0) + 1)
        userUnlockedCount++
      }
      if (instance?.progress !== undefined) {
        totalProgressSum += instance.progress
        totalProgressCount++
      }
    }
    totalUnlocked += userUnlockedCount
    if (totalTreeNodes > 0 && userUnlockedCount === totalTreeNodes) {
      completedUsers++
    }
  }

  // Ordenar por count desc, tie-break por nodeId asc (DETERMINISMO)
  const sortedDesc = [...popularity.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const sortedAsc = [...popularity.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))

  return {
    totalUsers,
    avgUnlockedCount: totalUnlocked / totalUsers,
    avgProgress: totalProgressCount > 0 ? totalProgressSum / totalProgressCount : 0,
    mostPopularNodes: sortedDesc.slice(0, 10).map(([nodeId, count]) => ({ nodeId, count })),
    leastPopularNodes: sortedAsc.slice(0, 10).map(([nodeId, count]) => ({ nodeId, count })),
    completionRate: totalTreeNodes > 0 ? completedUsers / totalUsers : 0,
  }
}
```

**Notas**:
- Inicializar `popularity` con 0 para TODOS os `treeDef.nodes`, para que
  `leastPopularNodes` poida devolver nodos con count=0 (nodos nunca
  desbloqueados por ninguén — analítica valiosa).
- `completionRate` con `totalTreeNodes === 0` devolve 0 (tree vacía,
  ninguén pode "completala"; decisión consciente).
- Tie-break alfabético por nodeId garante determinismo.

### 5.7 — getNodePopularity — pseudo-código

```ts
async getNodePopularity(): Promise<Map<string, number>> {
  const states = await this.loadAllStates()
  const popularity = new Map<string, number>()
  // Inicializar con 0 para tódolos nodos do treeDef
  for (const node of this.treeDef.nodes) popularity.set(node.id, 0)

  for (const state of states.values()) {
    for (const node of this.treeDef.nodes) {
      const instance = state.nodes[node.id]
      if (instance !== undefined && isUnlocked(instance)) {
        popularity.set(node.id, (popularity.get(node.id) ?? 0) + 1)
      }
    }
  }
  return popularity
}
```

**Notas**:
- O Map devolto contén **todos os nodos** do treeDef (incluso os que
  teñen count=0). Consistente coa expectativa "popularidade de TODOS
  os nodos".
- **Cero filtrado**. Consumidor decide.

### 5.8 — getProgressDistribution — pseudo-código

```ts
async getProgressDistribution(nodeId: string): Promise<number[]> {
  const states = await this.loadAllStates()
  const values: number[] = []
  // Iterar en orde alfabética de userId para DETERMINISMO
  const sortedUserIds = [...states.keys()].sort()
  for (const userId of sortedUserIds) {
    const state = states.get(userId)
    const instance = state?.nodes[nodeId]
    if (instance?.progress !== undefined) {
      values.push(instance.progress)
    }
  }
  return values
}
```

**Notas**:
- Inclúese **só** usuarios cuxo `nodes[nodeId].progress !== undefined`.
- Usuarios sen o nodo, ou con o nodo pero sen progress definido → non
  se inclúen (cero zeros artificiais).
- Orde determinística por userId alfabético (necesario para tests
  reproducibles e snapshots).
- Se ningún usuario ten progress definido para ese nodo → `[]`.
- Se `nodeId` non existe no treeDef → tamén `[]` (cero erro, cero throw).

### 5.9 — getStuckUsers — pseudo-código

```ts
async getStuckUsers(threshold?: number): Promise<string[]> {
  const effectiveThreshold = threshold ?? 1
  const states = await this.loadAllStates()
  const stuck: string[] = []
  for (const [userId, state] of states) {
    let unlockedCount = 0
    for (const node of this.treeDef.nodes) {
      const instance = state.nodes[node.id]
      if (instance !== undefined && isUnlocked(instance)) {
        unlockedCount++
      }
    }
    if (unlockedCount < effectiveThreshold) {
      stuck.push(userId)
    }
  }
  return stuck.sort()  // determinismo
}
```

**Notas**:
- **Threshold default = 1**: usuarios con CERO nodos unlocked.
- Threshold é nº absoluto de nodos unlocked, NON porcentaxe.
  (Documentar no JSDoc; semántica simple).
- Orde alfabética por userId.
- Usuarios sen state en storage (best-effort skip de `loadAllStates`)
  **NON** contan como stuck (porque nin sequera os puidemos avaliar).
  Documentar.

### 5.10 — Determinismo

- **CERO** `Date.now()`, `Math.random()`, ou outras fontes non-deterministas
  nos 4 métodos novos nin no helper.
- Tie-breaks por `localeCompare` (orde alfabético de userId/nodeId).
- Tests verifican determinismo: dúas chamadas consecutivas devolven
  resultados estructuralmente idénticos.

### 5.11 — Cero caché de resultados

**Decisión consciente**: cada chamada lee storage fresco. **NON gardar**
o último AggregateStats / popularity. Se o consumidor precisa cache,
implementa externamente. Documentar.

### 5.12 — Cero ErrorCodes novos

As 4 queries devolven valores directos sen `Result<>` (segundo MASTER §11).
Storage failures manexánse internamente con **best-effort skip** en
`loadAllStates()`. Cero `throw`, cero `Result.err`. **Cero modificación
de `packages/common/`**.

### 5.13 — Cero modificación de pezas existentes

**Cero modificación** de:
- TreeEngine, SubtreeManager, Federator, layouts, Reconciler, ProgressManager,
  StatComputer, EffectsRunner, UnlockResolver, TimeManager, AuditLogger,
  ResourceManager, StateStore, MigrationRunner.
- Tipos NodeDef, EdgeDef, TreeDef, TreeState, NodeInstance, Build, TreeChange.
- StorageAdapter ou adapters concretos.
- **Constructor + lifecycle existentes de TreeRegistry (createEngine,
  getEngine, removeEngine, listEngines, applyChangesToAll, save, load,
  destroy, build management).**
- Schema de claves do storage (`engine:${userId}:state`, `build:${buildId}`,
  `registry:userIds`, `registry:buildsIndex`, `registry:meta`).
- `packages/common/` enteiro.
- `packages/storage/` enteiro.

**SI se modifica**:
- `packages/core/src/engine/TreeRegistry.ts`: engadir interface `AggregateStats`,
  os 4 métodos públicos novos, e o helper privado `loadAllStates`.
  Engadir o helper local `isUnlocked` (función arrow privada).
- `packages/core/src/engine/index.ts`: engadir `export type { AggregateStats }`.

### 5.14 — Exportación pública

Engadir a `packages/core/src/engine/index.ts`:

```ts
export type {
  TreeRegistryOptions,
  TreeRegistryCacheConfig,
  AggregateStats,                // ← NOVO
} from './TreeRegistry.js'
```

### 5.15 — Localización dos métodos no ficheiro

Engadir os 4 métodos públicos novos despois de `applyChangesToAll` (que
está na sección `// ── Shared tree ──`) e antes de `// ── Build
management ──`. Crear nova sección `// ── Aggregate queries ──`.

`isUnlocked` helper + `loadAllStates` privado: na sección `// ── Private
helpers ──` xa existente, **antes** de `putInCache`.

`AggregateStats` interface: xunto a `TreeRegistryOptions` e
`TreeRegistryCacheConfig` na sección `// ── Interfaces públicas ──`.

### 5.16 — Tests funcionais (~25 tests novos)

Engadir a `packages/core/__tests__/engine/TreeRegistry.test.ts`. Reutilizar
`makeTreeDef`, `makeOptions`, `makeBuild` xa existentes.

**Tests esperados** (orde suxerida):

*Helper loadAllStates — implícito vía os 4 métodos públicos.*

*getAggregateStats (~7):*
1. 0 usuarios: totalUsers=0, todos os campos en 0, arrays vacíos.
2. 1 usuario sen state persistido (createEngine sen save): totalUsers=1
   se userIds está poboado **mais** loadAllStates skipea (decisión 5.4);
   o resultado depende de se userIds inclúe o usuario mais `states.size`
   é 0. **Aclaración decisión**: `totalUsers` = `states.size` (só os
   con state persistido), NON `this.userIds.size`. **Engadir á 5.6 que
   totalUsers é `states.size`.** Test verifica iso.
3. N usuarios cunha mestura de nodos unlocked: avgUnlockedCount correcto.
4. N usuarios con `progress` parcial: avgProgress correcto (só inclúe
   instancias con progress definido).
5. mostPopularNodes / leastPopularNodes: Top-10 con tie-break alfabético.
6. completionRate=1 cando todos os usuarios completaron a árbore.
7. completionRate=0 cando ninguén completou; mixto cando algúns sí.

*getNodePopularity (~4):*
8. 0 usuarios: Map con todos os nodos do treeDef apuntando a 0.
9. N usuarios con unlocks diferentes: count correcto por nodeId.
10. Map inclúe nodos nunca desbloqueados (count=0).
11. Determinismo: dúas chamadas devolven Maps equivalentes.

*getProgressDistribution (~4):*
12. 0 usuarios: [].
13. nodeId inexistente no treeDef: [].
14. N usuarios con progress definido para o nodeId: array ordenado
    determinísticamente por userId.
15. Usuarios sen progress para o nodeId: excluídos do array.

*getStuckUsers (~4):*
16. Threshold default (1): só usuarios con 0 unlocks.
17. Threshold custom (ex: 3): usuarios con <3 unlocks.
18. 0 usuarios: [].
19. Orde alfabética determinística.

*Integración + edge cases (~6):*
20. Roundtrip: createEngine → unlock → save → getAggregateStats devolve
    resultado consistente.
21. Roundtrip: createEngine → unlock → SEN save → getAggregateStats
    devolve datos "stale" (cero unlocks visibles para o user en cuestión
    se nunca foi persistido).
22. Storage error (StorageAdapter que devolve `err`) → skip silencioso,
    aggregate working coas restantes.
23. applyChangesToAll modifica engines en cache; getAggregateStats
    posterior **non** ve os changes ata save(). Documentado.
24. Subtree handling: TreeState con subtreeStates → cero descenso
    (subtree unlocks **non** contan).
25. Determinismo cross-call: tres chamadas seguidas con mesmo state
    devolven resultados estructuralmente iguais.

**Total: ~25 tests novos.** Baseline post-6.2 esperado: 1457 + 25 = **1482
tests core**.

### 5.17 — Cobertura

- **`TreeRegistry.ts`**: subir cara **≥96% Stmts / ≥90% Branch / 100%
  Funcs / ≥98% Lines** (era 94.53/85.1/100/98.85; os ~150 liñas
  engadidas debe estar ao 100% para empuxar o global).
- **Global core**: **≥97.26%** (baseline post-6.1). **Cero regresión**
  tolerada (aplicar lección 6.1 L1).
- **Ramas defensivas**: se algunha rama nova é verificablemente
  inalcanzable por API pública, anotar con `/* c8 ignore next */` +
  comentario inline (NON deixar que baixe a cobertura).

### 5.18 — Determinismo dos tests

- Cero `Date.now()` nos tests novos para xerar UserIds (usar literais
  alfabéticos: 'alice', 'bob', 'carol'...).
- Tests verifican explicitamente orde alfabética e tie-breaks.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `AggregateStats` interface | Tipo público | TreeRegistry.ts | ~20 |
| `isUnlocked` helper | Arrow privada | TreeRegistry.ts | ~3 |
| `loadAllStates` helper | Método privado | TreeRegistry.ts | ~15 |
| `getAggregateStats` | Método público | TreeRegistry.ts | ~55 |
| `getNodePopularity` | Método público | TreeRegistry.ts | ~15 |
| `getProgressDistribution` | Método público | TreeRegistry.ts | ~15 |
| `getStuckUsers` | Método público | TreeRegistry.ts | ~20 |
| Export de tipo | export type | engine/index.ts | +1 |
| Tests | Block describe | TreeRegistry.test.ts | ~350 |

**Total estimado**: ~150 liñas en TreeRegistry.ts + ~350 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/core/src/engine/TreeRegistry.ts` (MODIFICADO)
- `packages/core/src/engine/index.ts` (MODIFICADO)
- `packages/core/__tests__/engine/TreeRegistry.test.ts` (MODIFICADO)
- `.changeset/*.md` (NOVO: 1 ficheiro **minor** para core)
- `CHANGELOG.md` (modificado: nova `## [Unreleased]` ao principio)

**NON deben aparecer cambios en**:
- `packages/common/` (cero ErrorCodes novos, cero cambios).
- `packages/storage/` (cero adapters tocados).
- `packages/core/package.json` (cero deps novas).
- `pnpm-lock.yaml`.
- `tsconfig.base.json`, `tsup.config.ts`, ou outros globais.
- TreeEngine, SubtreeManager, Federator, ou outras pezas (5.13).
- Tipos NodeDef, EdgeDef, TreeDef, TreeState, NodeInstance, Build,
  TreeChange (5.13).
- Tests existentes de 6.1 (cero modificación).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` opcionais. Sección nova `// ── Aggregate queries ──`
xunto cos outros bloques de métodos. 2 espazos, comilla simple, sen `;`,
trailing commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**.
NON desactives Biome.

**Estilo dos novos métodos**: idéntico aos existentes (Promise<T>,
`for...of` sobre Map, cero `forEach`, JSDoc completo en castelán/galego).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/common/` (cero ErrorCodes novos, cero cambios).
- ❌ Engadir `Result<>` wrapper ás 4 queries (MASTER §11 prescribe sen Result).
- ❌ Instanciar TreeEngines internamente (MASTER §5.6.5: directo sobre storage).
- ❌ Usar `this.storage.list()` para iterar usuarios (usar `this.userIds`).
- ❌ Descender a `subtreeStates` (5.5: top-level únicamente).
- ❌ Cachear resultados aggregate (5.11).
- ❌ Modificar pezas existentes de TreeRegistry (constructor, lifecycle,
  build management, save, load, destroy).
- ❌ Modificar StorageAdapter, TreeEngine, SubtreeManager, Federator.
- ❌ Engadir `Date.now()` ou `Math.random()` nos métodos novos (5.10).
- ❌ Modificar TreeState, NodeInstance, NodeState tipos.
- ❌ Implementar ScopedStorage (6.3).
- ❌ Implementar Quotas ou Permissions (6.4).
- ❌ Engadir Top-N configurable (5.2: hardcode 10).
- ❌ Tolerar regresión de cobertura (lección 6.1 L1).
- ❌ Implementar 'progress' artificial para nodos unlocked (5.8: só
  os que teñen `progress !== undefined`).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T13)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` debe estar limpo. `git log -1` debe mostrar
`2ddc511` como HEAD.

**T0.2** — Verificar empíricamente que `NodeInstance.state` é union de
7 valores incluíndo `'unlocked'` e `'maxed'`:
```bash
grep -A 8 "^export type NodeState" packages/core/src/types/node.ts
```

**T0.3** — Verificar `NodeInstance.progress?: number`:
```bash
grep "progress\?" packages/core/src/types/node.ts | head -3
```

**T0.4** — Verificar `TreeState.nodes: Record<string, NodeInstance>`:
```bash
grep -A 5 "^export interface TreeState" packages/core/src/types/tree.ts
```

**T0.5** — Verificar que `TreeRegistry.userIds: Set<string>` está dispoñible
como `private` campo (xa exite en 6.1):
```bash
grep "userIds" packages/core/src/engine/TreeRegistry.ts | head -3
```

**T0.6** — Verificar que `StorageAdapter.get()` devolve
`Promise<Result<unknown | null>>`:
```bash
grep -A 3 "get(key: string)" packages/storage/src/StorageAdapter.ts
```

**T0.7** — Verificar baseline previo:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --filter=@yggdrasil-forge/core --force  # 1457
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1** (lección 5.2 L2 +
6.1 procedural).

### T1 — Engadir interface AggregateStats

En `TreeRegistry.ts`, sección `// ── Interfaces públicas ──`, despois
de `TreeRegistryOptions`, engadir `AggregateStats` segundo §5.2 literal.

### T2 — Engadir helper isUnlocked

En sección `// ── Private helpers ──` (existente), antes de `putInCache`,
engadir:
```ts
/**
 * Convención autoritativa de "unlocked" reutilizada de TreeEngine
 * (TreeEngine.ts liñas 583, 813, 1203).
 */
private isUnlocked(instance: NodeInstance): boolean {
  return instance.state === 'unlocked' || instance.state === 'maxed'
}
```

Importar `NodeInstance` no top do ficheiro se aínda non está:
```ts
import type { ..., NodeInstance, ... } from '../types/index.js'
```

### T3 — Engadir helper loadAllStates

En `// ── Private helpers ──`, despois de `isUnlocked`, engadir
`loadAllStates` segundo §5.4 literal.

### T4 — Crear sección Aggregate queries

Engadir entre `applyChangesToAll` e `// ── Build management ──`:

```ts
// ── Aggregate queries ──
```

### T5 — Engadir getAggregateStats

Segundo §5.6 pseudo-código literal. JSDoc explicando:
- Operación directa sobre storage (sen instanciar engines).
- Precondición de save() previo para consistencia.
- Cero descenso a subtreeStates.

### T6 — Engadir getNodePopularity

Segundo §5.7 literal.

### T7 — Engadir getProgressDistribution

Segundo §5.8 literal.

### T8 — Engadir getStuckUsers

Segundo §5.9 literal. Default threshold = 1.

### T9 — Exportar tipo en engine/index.ts

Engadir `AggregateStats` ao export type existente.

### T10 — Tests novos

Engadir bloque `describe('TreeRegistry — aggregate queries', ...)` con
~25 tests segundo §5.16. Reutilizar `makeTreeDef`, `makeOptions`.

**Helper local recomendado** (cero `!` non-null assertions, Biome-safe):
```ts
async function setupRegistryWithUsers(
  users: Array<{
    id: string
    unlockedNodes: string[]
    progress?: Record<string, number>
  }>,
  treeDef: TreeDef = makeTreeDef(),
): Promise<TreeRegistry> {
  const registry = new TreeRegistry(treeDef, makeOptions({ strategy: 'all-in-memory' }))
  for (const u of users) {
    const createRes = await registry.createEngine(u.id)
    if (!createRes.ok) throw new Error(`createEngine fallou: ${createRes.error.code}`)
    const eng = createRes.value
    for (const nodeId of u.unlockedNodes) {
      const r = await eng.unlock(nodeId)
      if (!r.ok) throw new Error(`unlock fallou: ${r.error.code}`)
    }
    if (u.progress !== undefined) {
      for (const [nodeId, value] of Object.entries(u.progress)) {
        const r = eng.setProgress(nodeId, value)
        if (!r.ok) throw new Error(`setProgress fallou: ${r.error.code}`)
      }
    }
  }
  await registry.save()
  return registry
}
```

**API verificada empíricamente polo director** (cero T0.8 necesario):
`engine.setProgress(nodeId, percent): Result<ProgressUpdateResult>`
existe en TreeEngine.ts liña 376. **Síncrono**, devolve `Result`.
Patrón nos tests (cero non-null assertions; Biome rexeita `!`):
```ts
const engRes = await registry.getEngine('alice')
if (!engRes.ok) throw new Error('getEngine fallou')
const eng = engRes.value
for (const nodeId of u.unlockedNodes) {
  const unlockRes = await eng.unlock(nodeId)
  if (!unlockRes.ok) throw new Error(`unlock fallou: ${unlockRes.error.code}`)
}
if (u.progress !== undefined) {
  for (const [nodeId, value] of Object.entries(u.progress)) {
    const progRes = eng.setProgress(nodeId, value)
    if (!progRes.ok) throw new Error(`setProgress fallou: ${progRes.error.code}`)
  }
}
```

### T11 — Verificación post-T10

```bash
pnpm turbo run typecheck --force            # debe seguir 21/21
pnpm turbo run test --filter=@yggdrasil-forge/core --force
```

- ≥1482 tests core (1457 previos + ~25 novos).
- 60 common + 171 storage **intactos**.
- Cero ruptura.

### T12 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/core run test:coverage
```

Verificar:
- `TreeRegistry.ts`: ≥96% Stmts / ≥90% Branch / 100% Funcs / ≥98% Lines.
- Global core: ≥97.26%.

**Se algunha rama defensiva nova non é alcanzable por API pública**:
anotar con `/* c8 ignore next */` + comentario xustificativo
**dentro do mesmo commit** (lección 6.1 L1).

### T13 — Lint + grep + commit + push

```bash
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(\bunknown\b|valor-invalido|placeholder|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/engine/TreeRegistry.ts
```

(O "TODOS" en galego = "all" en comentarios pode aparecer; é falso
positivo. Documentar como en 6.1.)

- **Changeset minor** para `@yggdrasil-forge/core`:
  ```
  ---
  '@yggdrasil-forge/core': minor
  ---

  feat(core): add aggregate queries to TreeRegistry (sub-phase 6.2)
  ```
- **CHANGELOG**: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `TreeRegistry` aggregate queries (todas operan directamente sobre
    storage sen instanciar TreeEngines):
    - `getAggregateStats(): Promise<AggregateStats>` — métricas globais
      (totalUsers, avgUnlockedCount, avgProgress, top/bottom-10 nodos
      máis/menos populares, completionRate).
    - `getNodePopularity(): Promise<Map<string, number>>` — count de
      usuarios con cada nodo desbloqueado (state ∈ {unlocked, maxed}).
      Inclúe nodos nunca desbloqueados (count=0).
    - `getProgressDistribution(nodeId): Promise<number[]>` — array
      determinístico (orde alfabética por userId) dos valores `progress`
      dos usuarios cuxo nodeId ten progress definido.
    - `getStuckUsers(threshold?): Promise<string[]>` — usuarios con
      menos de `threshold` nodos desbloqueados (default 1). Orde
      alfabética.
  - `AggregateStats` interface pública exportada desde core.

  ### Note
  - Sub-fase 6.2 SEGUNDA da Fase 6. ScopedStorage (6.3), Quotas +
    Permissions (6.4) seguen DIFERIDOS.
  - **Precondición de consistencia**: aggregate queries leen storage
    directamente; para ver mutacións recentes de engines en cache
    (estratexia 'all-in-memory' ou 'lru'), o consumidor debe chamar
    `save()` previamente. 'on-demand' actualiza inmediatamente.
  - **Subtree handling**: cero descenso a `subtreeStates`. Análise de
    sub-árbores diferida (sen signature prescrita).
  - **Determinismo**: tie-breaks alfabéticos por nodeId/userId.
    `getProgressDistribution` devolve array ordenado por userId.
  - **Best-effort**: storage failures por usuario individual son
    skipeados silenciosamente. `totalUsers` reflicte só usuarios con
    state persistido.
  - **Cero ErrorCodes novos**, cero modificación de `@yggdrasil-forge/common`.
  ```

### T14 — Commit + push

Commit Conventional:
`feat(core): add aggregate queries to TreeRegistry (sub-phase 6.2)`.
Push directo a `origin/main` (base `2ddc511`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 6.2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 2ddc511)
✅ AggregateStats interface pública exportada
✅ 4 métodos públicos novos en TreeRegistry:
   - getAggregateStats, getNodePopularity,
     getProgressDistribution, getStuckUsers
✅ Acceso directo a storage sen instanciar engines (MASTER §5.6.5)
✅ Helper privado loadAllStates + isUnlocked
✅ Determinismo: tie-breaks alfabéticos en todos os arrays
✅ Subtree handling: cero descenso (decisión consciente)
✅ CERO ErrorCodes novos
✅ CERO modificación de packages/common/
✅ CERO modificación de packages/storage/
✅ CERO modificación de pezas existentes do TreeRegistry
✅ T0.2 NodeState union verificado: <7 valores>
✅ T0.3 NodeInstance.progress verificado: <campo>
✅ T0.5 TreeRegistry.userIds dispoñible: <estado>
✅ T0.6 StorageAdapter.get signature verificada: <forma>
✅ T0.7 baseline previo (typecheck 21/21, 1457 tests) confirmado
✅ Tests: <N> pasan en core (<delta> novos, 1457 previos intactos)
   - <X> getAggregateStats
   - <Y> getNodePopularity
   - <Z> getProgressDistribution
   - <W> getStuckUsers
   - <V> Integración + edge cases
   Common: 60 intactos | Storage: 171 intactos
✅ Cobertura:
   - TreeRegistry.ts: <X%> Stmts / <Y%> Branch / <100%> Funcs / <Z%> Lines
   - Global core: <X%> (baseline 97.26%; mantense ou sobe)
   - c8 ignore engadidos: <listado se aplica, con liña + xustificación>
✅ Typecheck: 21/21 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída; falsos positivos doc.>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 6.2 SEGUNDA da Fase 6.
   - ScopedStorage (6.3), Quotas + Permissions (6.4) DIFERIDOS.
   - Precondición save() para consistencia documentada.
   - subtreeStates non descendidos (decisión consciente).
✅ Changeset minor (core) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 6.3 (ScopedStorage).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 6.2. Segunda sub-fase Fase 6. Aggregate queries
directas sobre storage. Sub-fase media con risco arquitectónico baixo
(reutilización completa de TreeRegistry existente + decisións todas
pre-resoltas). Cero ErrorCodes novos, cero common, cero storage tocados.
Calquera dúbida → ESCALAR.*
