# BRIEFING — SUB-FASE 5.3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Terceira e última sub-fase da Fase 5.** Federator: clase para
> mesturar múltiples TreeDefs nun só (`mergeTreeDefs`) e detectar
> conflitos (`detectConflicts`). **`loadFederation` DIFERIDA** (DT-20
> NOVA). Peza completamente independente: cero TreeEngine, cero
> SubtreeManager, cero outras pezas runtime. Sub-fase mediana-grande
> con risco arquitectónico baixo.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5
L2, 3.6.a L1, 4.3 L1, 5.2 L1+L2**: calquera modificación fóra de §6
require **ESCALAR ANTES DE APLICAR**. **Briefings con APIs prescritas
en código exemplo deben verificarse empíricamente** (5.2 L2): se
algún método/campo prescrito non existe na sinatura real, **cazar e
corrixir transparentemente**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 5.3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 5.3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **5.3** de Yggdrasil Forge. **Terceira e ÚLTIMA da Fase 5**.
**Pecha a Fase 5**.

**Pezas**:

1. **`Federator` clase** con dous métodos puros:
   - `detectConflicts(trees: TreeDef[]): ConflictReport`.
   - `mergeTreeDefs(trees: TreeDef[], strategy: MergeStrategy, options?: MergeOptions): Result<TreeDef>`.
2. **`MergeStrategy` type**: `'namespace_all' | 'first_wins' | 'last_wins' | 'manual'`.
3. **`Conflict` discriminated union**: 7 tipos (node_id, edge_id,
   group_id, resource_id, stat_id, subtree_id, tree_id).
4. **`ConflictReport` interface**.
5. **`MergeOptions` interface** con `mergedMeta?` (personalizar id/
   version/label do resultado) + `locale?`.
6. **3 ErrorCodes novos**: `MERGE_INVALID_INPUT` (YGG_E026),
   `MERGE_CONFLICTS_DETECTED` (YGG_E027), `MERGE_INCOMPATIBLE_SCHEMA`
   (YGG_E028).

**`loadFederation` DIFERIDA** (DT-20 NOVA): require decisión
arquitectónica sobre `FederationSource` (URL? File? Storage?) sin
caso de uso real documentado. Aplicación de 4.4 L1.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Spec MASTER §19**:
```typescript
class Federator {
  loadFederation(sources: FederationSource[]): Promise<Result<TreeDef>>
  mergeTreeDefs(trees: TreeDef[], strategy: MergeStrategy): Result<TreeDef>
  detectConflicts(trees: TreeDef[]): ConflictReport
}
type MergeStrategy = 'namespace_all' | 'first_wins' | 'last_wins' | 'manual'
```

**Cero spec adicional**. Toda decisión arquitectónica é miña.

**Casos de uso reais** (validados por web search):
- Game mods (Barotrauma, WoW): combinar talent trees de múltiples
  expansions ou clases.
- Plataformas educativas: combinar módulos curriculares de provedores
  diferentes.
- Plugin systems: cada plugin contribúe a un segmento; o engine final
  fede.

**TreeDef contén 6 coleccións de elementos con `id`**: nodes, edges,
groups, resources, stats, subtrees. **Tamén tree.id top-level**.
Tódalas poden colidir.

**Cross-references entre nodos** (problema máis complexo):
- `EdgeDef.source`, `EdgeDef.target`.
- `TreeDef.rootNodeId`.
- **Prereq** referencia ids (verificado en types/unlock.ts):
  - `node_unlocked.nodeId`, `node_locked.nodeId`, `node_maxed.nodeId`,
    `node_state.nodeId`, `tier_min.nodeId`, `progress_min.nodeId`.
  - `resource_min.resourceId`, `stat_min.statId`,
    `subtree_completion.subtreeId`.
  - `all_of.children` (recursive), `any_of.children` (recursive).
- **Effect** referencia ids (verificado en types/effects.ts):
  - `unlock_node.nodeId`, `set_progress.nodeId`,
    `set_node_visibility.nodeId`.
- **NodeDef.subtreeId** referencia TreeDef.subtrees key.

**Para `'namespace_all'`**: todas estas references deben **reescribirse
con prefixo `${tree.id}:`** para manter consistencia interna.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `1f7de89` (TreeEngine integration 5.2).
- 1306 tests core + 60 common + 171 storage = ~1537 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **Pezas SubtreeManager + TreeEngine.getSubtreeEngine/enterSubtree**
  funcionais e testeadas.
- **TreeDef shape** (verificado en types/tree.ts):
  - id, schemaVersion, version, label, description?, author?,
    rootNodeId?, nodes, edges, groups?, resources?, stats?,
    startingBudget?, layout, theme?, i18n?, metadata?, subtrees?.
- **ErrorCodes existentes**: 46 (incluído SUBTREE_NOT_UNLOCKED
  YGG_E025).
- DT abertas non bloqueantes: DT-9, DT-11, DT-12, DT-14, DT-15, DT-16,
  DT-17, DT-18, DT-19.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/Federator.ts` cunha clase `Federator`
con métodos puros `detectConflicts(trees)` e `mergeTreeDefs(trees,
strategy, options?)` que soporta 4 estratexias (`'namespace_all'`,
`'first_wins'`, `'last_wins'`, `'manual'`) con rewrite recursivo de
todas as cross-references para `'namespace_all'`, engadir tipos
`MergeStrategy`, `Conflict`, `ConflictReport`, `MergeOptions`,
`MergedTreeMeta`, engadir 3 ErrorCodes novos
(`MERGE_INVALID_INPUT` + `MERGE_CONFLICTS_DETECTED` +
`MERGE_INCOMPATIBLE_SCHEMA`) con mensaxes nas 3 locales, exportar
publicamente desde core, e cubrir con tests funcionais exhaustivos.
**`loadFederation` DIFERIDA**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — loadFederation DIFERIDA (DT-20 NOVA)

**Cero implementar** `loadFederation` en 5.3. Razóns:
1. Require decisión sobre `FederationSource` shape (URL+CORS? File?
   Storage? Plugin?). **Cero spec MASTER**.
2. Cero caso de uso real documentado que demande IO immediata.
3. **mergeTreeDefs cumpre o caso core**: consumidor pode cargar
   TreeDefs co seu propio método e pasar a `mergeTreeDefs`.
4. Aplicación 4.4 L1: minimal-coherence sen inventar features.

**DT-20 NOVA** anotada en CHANGELOG da sub-fase:
> Federator.loadFederation(sources) non implementado en 5.3. Require
> decisión arquitectónica sobre FederationSource shape sin caso de
> uso real documentado. Diferido a sub-fase específica futura cando
> exista demanda real (probable Fase 7 React renderer ou plugin
> system).

### 5.2 — Estrutura de ficheiros

**Un só ficheiro**: `packages/core/src/engine/Federator.ts`.

**Cero ficheiro auxiliar separado**: a peza é mediana (~350 liñas)
e cohesa. **Decisión consciente do director**: cero overhead de subdir.

### 5.3 — Federator é clase con métodos puros

Spec MASTER literal di "class Federator". **Respecto o spec**. **Pero
sen state interno** (cero membros privados con state, cero
constructor con configuración).

```ts
export class Federator {
  detectConflicts(trees: readonly TreeDef[]): ConflictReport {
    // ... puro
  }

  mergeTreeDefs(
    trees: readonly TreeDef[],
    strategy: MergeStrategy,
    options: MergeOptions = {},
  ): Result<TreeDef> {
    // ... puro
  }
}
```

**Constructor cero argumentos**. **Métodos cero `this.someField`**.
**Clase é só agrupación semántica**.

**Razón de manter clase (vs funcións puras)**: spec MASTER literal +
patrón de extensibilidade futura (cando se engada `loadFederation`,
pode ter state como cache).

### 5.4 — Tipos completos

```ts
import type { Locale } from '@yggdrasil-forge/common'
import type { LayoutConfig, TreeDef } from '../types/tree.js'
import type { LocalizedString } from '../types/i18n.js'

/**
 * Estratexia de resolución de conflitos no merge.
 *
 * - `'namespace_all'`: prefixa todos os ids con `${tree.id}:`. Cero
 *   conflitos posibles. Reescribe TODAS as cross-references
 *   (edges, prereqs, effects, rootNodeId, etc.) para manter
 *   consistencia interna.
 * - `'first_wins'`: en colisión de ids, mantén o elemento da árbore
 *   que aparece **antes** na lista. Os outros descártanse
 *   silenciosamente. Cross-references da árbore "perdedora" poden
 *   apuntar a entidades con contido diferente (decisión semántica
 *   aceptada).
 * - `'last_wins'`: análogo a 'first_wins' pero co último.
 * - `'manual'`: NON intenta merge automático. Devolve
 *   `err(MERGE_CONFLICTS_DETECTED)` se hai conflitos; devolve
 *   `ok(merged)` se cero hai conflitos (caso degenerate equivalente
 *   a 'first_wins').
 */
export type MergeStrategy = 'namespace_all' | 'first_wins' | 'last_wins' | 'manual'

/**
 * Tipo de conflito detectado entre múltiples TreeDefs.
 * `trees` contén os ids das árbores que conteñen ese id duplicado.
 */
export type Conflict =
  | { readonly type: 'tree_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'node_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'edge_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'group_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'resource_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'stat_id'; readonly id: string; readonly trees: readonly string[] }
  | { readonly type: 'subtree_id'; readonly id: string; readonly trees: readonly string[] }

/**
 * Reporte de conflitos detectados por Federator.detectConflicts.
 */
export interface ConflictReport {
  readonly conflicts: readonly Conflict[]
  readonly hasConflicts: boolean
}

/**
 * Metadata do TreeDef resultante do merge. Se cero pasa, usa os
 * valores da primeira árbore.
 */
export interface MergedTreeMeta {
  readonly id?: string
  readonly schemaVersion?: string
  readonly version?: string
  readonly label?: LocalizedString
  readonly description?: LocalizedString
  readonly author?: string
  readonly layout?: LayoutConfig
  readonly theme?: string
}

/**
 * Opcións para mergeTreeDefs.
 */
export interface MergeOptions {
  /** Personalización do top-level metadata do TreeDef resultante. */
  readonly mergedMeta?: MergedTreeMeta
  /** Locale para mensaxes de erro. Default 'gl'. */
  readonly locale?: Locale
}
```

### 5.5 — Federator.detectConflicts

```ts
detectConflicts(trees: readonly TreeDef[]): ConflictReport {
  const conflicts: Conflict[] = []

  // Iterar 7 categorías de id colectando localizacións por id.
  // Por exemplo, para nodes:
  //   Map<nodeId, string[]> onde string[] = ids das árbores que
  //   teñen ese nodeId.

  const treeIdLocations = new Map<string, string[]>()
  const nodeIdLocations = new Map<string, string[]>()
  const edgeIdLocations = new Map<string, string[]>()
  const groupIdLocations = new Map<string, string[]>()
  const resourceIdLocations = new Map<string, string[]>()
  const statIdLocations = new Map<string, string[]>()
  const subtreeIdLocations = new Map<string, string[]>()

  for (const tree of trees) {
    // tree.id
    addLocation(treeIdLocations, tree.id, tree.id)
    
    // Nodes
    for (const node of tree.nodes) {
      addLocation(nodeIdLocations, node.id, tree.id)
    }
    // Edges
    for (const edge of tree.edges) {
      addLocation(edgeIdLocations, edge.id, tree.id)
    }
    // Groups
    if (tree.groups !== undefined) {
      for (const group of tree.groups) {
        addLocation(groupIdLocations, group.id, tree.id)
      }
    }
    // Resources
    if (tree.resources !== undefined) {
      for (const resource of tree.resources) {
        addLocation(resourceIdLocations, resource.id, tree.id)
      }
    }
    // Stats
    if (tree.stats !== undefined) {
      for (const stat of tree.stats) {
        addLocation(statIdLocations, stat.id, tree.id)
      }
    }
    // Subtrees
    if (tree.subtrees !== undefined) {
      for (const subtreeId of Object.keys(tree.subtrees)) {
        addLocation(subtreeIdLocations, subtreeId, tree.id)
      }
    }
  }

  // Extraer conflitos (locations.length > 1)
  collectConflicts(treeIdLocations, 'tree_id', conflicts)
  collectConflicts(nodeIdLocations, 'node_id', conflicts)
  collectConflicts(edgeIdLocations, 'edge_id', conflicts)
  collectConflicts(groupIdLocations, 'group_id', conflicts)
  collectConflicts(resourceIdLocations, 'resource_id', conflicts)
  collectConflicts(statIdLocations, 'stat_id', conflicts)
  collectConflicts(subtreeIdLocations, 'subtree_id', conflicts)

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
  }
}
```

**Helpers privados** `addLocation` e `collectConflicts`:

```ts
private addLocation(
  map: Map<string, string[]>,
  id: string,
  treeId: string,
): void {
  const locs = map.get(id)
  if (locs === undefined) {
    map.set(id, [treeId])
  } else {
    locs.push(treeId)
  }
}

private collectConflicts(
  map: Map<string, string[]>,
  type: Conflict['type'],
  out: Conflict[],
): void {
  for (const [id, trees] of map) {
    if (trees.length > 1) {
      out.push({ type, id, trees })
    }
  }
}
```

### 5.6 — Federator.mergeTreeDefs

```ts
mergeTreeDefs(
  trees: readonly TreeDef[],
  strategy: MergeStrategy,
  options: MergeOptions = {},
): Result<TreeDef> {
  const locale = options.locale ?? 'gl'

  // 1. Validar input: cero árbore ou só unha
  if (trees.length < 2) {
    return err(
      new YggdrasilError(
        ErrorCode.MERGE_INVALID_INPUT,
        getErrorMessage(ErrorCode.MERGE_INVALID_INPUT, locale, {
          count: trees.length,
        }),
        { context: { count: trees.length } },
      ),
    )
  }

  // 2. Validar schemaVersion: todos iguais
  const firstSchema = trees[0]!.schemaVersion
  for (let i = 1; i < trees.length; i++) {
    if (trees[i]!.schemaVersion !== firstSchema) {
      return err(
        new YggdrasilError(
          ErrorCode.MERGE_INCOMPATIBLE_SCHEMA,
          getErrorMessage(ErrorCode.MERGE_INCOMPATIBLE_SCHEMA, locale, {
            first: firstSchema,
            other: trees[i]!.schemaVersion,
            treeIndex: i,
          }),
          { context: { first: firstSchema, other: trees[i]!.schemaVersion } },
        ),
      )
    }
  }

  // 3. Estratexia 'manual': verificar conflitos e rexeitar se hai
  if (strategy === 'manual') {
    const report = this.detectConflicts(trees)
    if (report.hasConflicts) {
      return err(
        new YggdrasilError(
          ErrorCode.MERGE_CONFLICTS_DETECTED,
          getErrorMessage(ErrorCode.MERGE_CONFLICTS_DETECTED, locale, {
            count: report.conflicts.length,
          }),
          { context: { report } },
        ),
      )
    }
    // Cero conflitos: equivalente a first_wins (mantén orde primeira árbore)
    return ok(this.mergeWinsStrategy(trees, 'first_wins', options))
  }

  // 4. Outras estratexias
  if (strategy === 'namespace_all') {
    return ok(this.mergeNamespaceStrategy(trees, options))
  }

  // 'first_wins' ou 'last_wins'
  return ok(this.mergeWinsStrategy(trees, strategy, options))
}
```

### 5.7 — mergeNamespaceStrategy

Esta é a **peza máis complexa**. Aplica prefix `${tree.id}:` a todos
os ids + reescribe todas as cross-references.

```ts
private mergeNamespaceStrategy(
  trees: readonly TreeDef[],
  options: MergeOptions,
): TreeDef {
  const rewrittenTrees = trees.map((tree) => this.rewriteWithNamespace(tree, `${tree.id}:`))
  return this.combineTrees(rewrittenTrees, options)
}

private rewriteWithNamespace(tree: TreeDef, prefix: string): TreeDef {
  // Renomear ids + reescribir todas as cross-references
  // (ver 5.10 pseudo-código exhaustivo)
  // ...
}

private combineTrees(rewrittenTrees: readonly TreeDef[], options: MergeOptions): TreeDef {
  // Combinar (cero conflitos posibles tras rewrite):
  // - nodes: concatenar todos
  // - edges: concatenar todos
  // - groups: concatenar todos
  // - resources: concatenar todos
  // - stats: concatenar todos
  // - subtrees: mestura de Records (cero conflitos)
  // - metadata: mestura (last_wins en metadata keys)
  // - top-level: aplicar mergedMeta ou defaults da primeira árbore
  // ...
}
```

### 5.8 — mergeWinsStrategy

```ts
private mergeWinsStrategy(
  trees: readonly TreeDef[],
  strategy: 'first_wins' | 'last_wins',
  options: MergeOptions,
): TreeDef {
  // Iterar trees na orde correcta (forward para first_wins, reverse para last_wins)
  // Pero mantemos a aparente orde de inserción para a saída:
  //   - first_wins: percorrer trees[0..n-1]; manter o primeiro id visto
  //   - last_wins: percorrer trees[0..n-1] PERO sobreescribir cada vez
  //     que se ve o id (efectivamente keep-last)

  const iterationOrder = strategy === 'first_wins' ? trees : [...trees].reverse()
  const keepFirst = strategy === 'first_wins'
  // ... (en ambos casos, percorremos en orde declarada para iteración)

  // Para cada colección, manter Map<id, Element> onde:
  //   first_wins: NON sobreescribir (cero set se xa existe)
  //   last_wins: sempre sobreescribir

  const seenNodes = new Map<string, NodeDef>()
  const seenEdges = new Map<string, EdgeDef>()
  // ... análogo para 6 coleccións

  for (const tree of trees) {
    for (const node of tree.nodes) {
      if (strategy === 'first_wins' && seenNodes.has(node.id)) continue
      seenNodes.set(node.id, node)
    }
    for (const edge of tree.edges) {
      if (strategy === 'first_wins' && seenEdges.has(edge.id)) continue
      seenEdges.set(edge.id, edge)
    }
    // ... 4 coleccións restantes (groups, resources, stats, subtrees)
  }

  // Combinar en TreeDef. Cero rewrite de references (manter as
  // orixinais; references "rotas" son responsabilidade do consumidor
  // que escolleu wins strategy).

  return this.buildTreeDefFromCollections(
    seenNodes, seenEdges, /*...*/, trees, options,
  )
}
```

### 5.9 — Aplicación de mergedMeta

```ts
private buildTopLevelMeta(
  trees: readonly TreeDef[],
  options: MergeOptions,
): Pick<TreeDef, 'id' | 'schemaVersion' | 'version' | 'label' | 'description' | 'author' | 'layout' | 'theme'> {
  const first = trees[0]!
  const meta = options.mergedMeta ?? {}
  return {
    id: meta.id ?? first.id,
    schemaVersion: meta.schemaVersion ?? first.schemaVersion,
    version: meta.version ?? first.version,
    label: meta.label ?? first.label,
    ...(meta.description !== undefined || first.description !== undefined ? { description: meta.description ?? first.description } : {}),
    ...(meta.author !== undefined || first.author !== undefined ? { author: meta.author ?? first.author } : {}),
    layout: meta.layout ?? first.layout,
    ...(meta.theme !== undefined || first.theme !== undefined ? { theme: meta.theme ?? first.theme } : {}),
  }
}
```

**Spread condicional** segundo `exactOptionalPropertyTypes`.

### 5.10 — PSEUDO-CÓDIGO EXHAUSTIVO: rewriteWithNamespace

**Esta é a peza con maior risco de complexity blooming**. Pseudo-
código completo para evitar ambigüidade (paralelo a Buchheim 4.3 e
QuadTree 4.5):

```
function rewriteWithNamespace(tree: TreeDef, prefix: string): TreeDef {
  // Helper local: prefixar un id
  const p = (id: string) => `${prefix}${id}`

  // 1. Reescribir nodes
  const newNodes = tree.nodes.map((node) => ({
    ...node,
    id: p(node.id),
    // subtreeId (NodeDef opcional): reescribir se existe
    ...(node.subtreeId !== undefined && { subtreeId: p(node.subtreeId) }),
    // unlockable.prereq: reescribir recursivamente
    ...(node.unlockable !== undefined && {
      unlockable: rewriteUnlockable(node.unlockable, p),
    }),
    // effects: reescribir
    ...(node.effects !== undefined && {
      effects: node.effects.map((e) => rewriteEffect(e, p)),
    }),
    // Cero modificar máis campos (label, cost, etc.: cero ids)
  }))

  // 2. Reescribir edges
  const newEdges = tree.edges.map((edge) => ({
    ...edge,
    id: p(edge.id),
    source: p(edge.source),
    target: p(edge.target),
  }))

  // 3. Reescribir groups (se ten campo nodes con refs)
  const newGroups = tree.groups?.map((group) => ({
    ...group,
    id: p(group.id),
    // group.nodes? (verificar GroupDef shape en T0)
    ...(group.nodes !== undefined && {
      nodes: group.nodes.map(p),
    }),
  }))

  // 4. Reescribir resources (só id; cero refs internas conocidas)
  const newResources = tree.resources?.map((resource) => ({
    ...resource,
    id: p(resource.id),
  }))

  // 5. Reescribir stats (só id)
  const newStats = tree.stats?.map((stat) => ({
    ...stat,
    id: p(stat.id),
  }))

  // 6. Reescribir subtrees keys (Record<string, TreeDef>)
  const newSubtrees = tree.subtrees !== undefined
    ? Object.fromEntries(
        Object.entries(tree.subtrees).map(([key, subtreeDef]) => [
          p(key),
          subtreeDef,  // O subtree NON se rewrite recursivamente
                       // (a profundidade é responsabilidade do
                       // consumidor; se quere namespace recursivo,
                       // chama mergeTreeDefs aniñado)
        ]),
      )
    : undefined

  // 7. Reescribir rootNodeId
  const newRootNodeId = tree.rootNodeId !== undefined ? p(tree.rootNodeId) : undefined

  return {
    ...tree,
    id: p(tree.id),  // tree.id tamén con prefix
    ...(newRootNodeId !== undefined && { rootNodeId: newRootNodeId }),
    nodes: newNodes,
    edges: newEdges,
    ...(newGroups !== undefined && { groups: newGroups }),
    ...(newResources !== undefined && { resources: newResources }),
    ...(newStats !== undefined && { stats: newStats }),
    ...(newSubtrees !== undefined && { subtrees: newSubtrees }),
  }
}

// Helper: reescribe un Prereq (recursivo para all_of, any_of)
function rewriteUnlockable(unlockable: Unlockable, p: (s: string) => string): Unlockable {
  if (unlockable.prereq === undefined) return unlockable
  return {
    ...unlockable,
    prereq: rewritePrereq(unlockable.prereq, p),
  }
}

function rewritePrereq(prereq: Prereq, p: (s: string) => string): Prereq {
  switch (prereq.type) {
    case 'node_unlocked':
    case 'node_locked':
    case 'node_maxed':
      return { ...prereq, nodeId: p(prereq.nodeId) }
    case 'node_state':
      return { ...prereq, nodeId: p(prereq.nodeId) }
    case 'tier_min':
      return { ...prereq, nodeId: p(prereq.nodeId) }
    case 'progress_min':
      return { ...prereq, nodeId: p(prereq.nodeId) }
    case 'resource_min':
      return { ...prereq, resourceId: p(prereq.resourceId) }
    case 'stat_min':
      return { ...prereq, statId: p(prereq.statId) }
    case 'subtree_completion':
      return { ...prereq, subtreeId: p(prereq.subtreeId) }
    case 'all_of':
    case 'any_of':
      return {
        ...prereq,
        children: prereq.children.map((c) => rewritePrereq(c, p)),
      }
    case 'nodes_count':
      // scope é opcional e probablemente NON é un nodeId (cero claro);
      // cero rewrite por defecto.
      return prereq
    // Outros tipos: cero rewrite se cero referencian ids.
    default:
      return prereq
  }
}

// Helper: reescribe un Effect (renomear nodeId se aplica)
function rewriteEffect(effect: Effect, p: (s: string) => string): Effect {
  switch (effect.type) {
    case 'unlock_node':
    case 'set_progress':
    case 'set_node_visibility':
      return { ...effect, nodeId: p(effect.nodeId) }
    case 'trigger_event':
      // eventName cero é id de TreeDef; cero rewrite.
      return effect
    default:
      return effect
  }
}
```

**Punto crítico**: `rewritePrereq` é **recursivo** para `all_of` e
`any_of`. **Tests específicos para esto en 5.13**.

**Outro punto crítico**: **`tree.subtrees[id].nodes` non se rewrite
recursivamente**. **Decisión arquitectónica**: o subtree é unha
template **interna**; o consumidor que quere flatten todo nun só
namespace debe **expandir manualmente** os subtrees antes ou facer
recursive merge.

**T0 verifica que GroupDef ten campo `nodes?: readonly string[]`** ou
similar. **Se non, cero rewrite de groups.nodes**.

### 5.11 — Cero modificación de pezas existentes

**Cero modificación** de:
- TreeEngine, SubtreeManager, mergeTreeDefWithOverrides.
- Layout Engine, MigrationRegistry, Reconciler.
- ProgressManager, StatComputer, EffectsRunner, UnlockResolver,
  TimeManager, DependencyGraph, AuditLogger, ResourceManager.
- Tipos TreeDef, NodeDef, EdgeDef, Prereq, Effect (xa modelados).
- StateStore.

**SI se modifica**:
- `packages/common/src/errors/codes.ts` (+3 ErrorCodes; autorizado
  por 5.12).
- `packages/common/src/errors/messages.ts` (+9 mensaxes: 3
  ErrorCodes × 3 locales; autorizado por 5.12).
- `packages/core/src/engine/index.ts` (+exports).

### 5.12 — ErrorCodes novos en common

Modificar `packages/common/src/errors/codes.ts`:

```ts
// Despois de SUBTREE_NOT_UNLOCKED = 'YGG_E025':
MERGE_INVALID_INPUT = 'YGG_E026',
MERGE_CONFLICTS_DETECTED = 'YGG_E027',
MERGE_INCOMPATIBLE_SCHEMA = 'YGG_E028',
```

Modificar `packages/common/src/errors/messages.ts`:

- **MERGE_INVALID_INPUT**:
  - gl: 'Federator require polo menos 2 TreeDefs para mesturar; recibiu {count}'
  - es: 'Federator requiere al menos 2 TreeDefs para mezclar; recibió {count}'
  - en: 'Federator requires at least 2 TreeDefs to merge; got {count}'
- **MERGE_CONFLICTS_DETECTED**:
  - gl: 'Detectáronse {count} conflitos durante o merge; estratexia "manual" require resolución externa'
  - es: 'Se detectaron {count} conflictos durante el merge; estrategia "manual" requiere resolución externa'
  - en: '{count} conflicts detected during merge; "manual" strategy requires external resolution'
- **MERGE_INCOMPATIBLE_SCHEMA**:
  - gl: 'TreeDefs con schemaVersion incompatibles: primeira={first}, árbore {treeIndex}={other}. Use MigrationRunner antes de federar.'
  - es: 'TreeDefs con schemaVersion incompatibles: primera={first}, árbol {treeIndex}={other}. Use MigrationRunner antes de federar.'
  - en: 'TreeDefs with incompatible schemaVersion: first={first}, tree {treeIndex}={other}. Use MigrationRunner before federating.'

**Autorización explícita** (excepción 3.4 L1): modificar
`packages/common/` só para estes 2 ficheiros.

### 5.13 — Tests funcionais (~50)

Crear `packages/core/__tests__/engine/Federator.test.ts`:

**detectConflicts (~12 tests):**
1. Array vacío: cero conflitos, hasConflicts=false.
2. 1 só tree: cero conflitos.
3. 2 trees sen colisión: cero conflitos.
4. 2 trees con node_id duplicado: 1 conflict.
5. 3 trees con node_id en 2/3: trees=[treeA, treeB] no Conflict.
6. tree_id duplicado: detectado.
7. edge_id duplicado: detectado.
8. group_id duplicado: detectado.
9. resource_id duplicado: detectado.
10. stat_id duplicado: detectado.
11. subtree_id duplicado: detectado.
12. Múltiples tipos de conflitos á vez: todos no report.

**mergeTreeDefs validation (~6 tests):**
13. 0 trees: err(MERGE_INVALID_INPUT).
14. 1 tree: err(MERGE_INVALID_INPUT).
15. schemaVersion distintos: err(MERGE_INCOMPATIBLE_SCHEMA).
16. schemaVersion iguais: ok.
17. Locale 'es' propaga.
18. Locale 'en' propaga.

**mergeTreeDefs 'namespace_all' (~15 tests):**
19. 2 trees simples: nodes con prefix correcto.
20. Edges: source/target prefixados.
21. RootNodeId prefixado.
22. Groups: id + nodes refs prefixados.
23. Resources, stats: ids prefixados.
24. Subtrees keys prefixadas.
25. Prereq node_unlocked: nodeId prefixado.
26. Prereq all_of recursivo: prefixos en todos os children.
27. Prereq any_of recursivo: prefixos en todos os children.
28. Prereq resource_min, stat_min, subtree_completion: ids
    prefixados.
29. Effect unlock_node, set_progress, set_node_visibility:
    nodeId prefixado.
30. tree.id resultante: usa mergedMeta ou primeira árbore.
31. Cero references rotas tras merge.
32. NodeDef.subtreeId prefixado correctamente.
33. tree.subtrees[id].nodes NON se rewrite (subtree intacto).

**mergeTreeDefs 'first_wins' (~6 tests):**
34. Sen colisións: equivalente a concat.
35. Con colisión node: mantén o primeiro; descarta segundo.
36. Cross-references NON se rewrite (id mantense; cero conflito real).
37. Con colisión subtree_id: mantén o primeiro.
38. metadata mestura: first_wins en keys.
39. Verificar exact instances (cero mutación de input).

**mergeTreeDefs 'last_wins' (~6 tests):**
40. Sen colisións: equivalente a concat.
41. Con colisión node: mantén o último; descarta primeiro.
42. Con colisión múltiple (3 trees): último prevalece.

**mergeTreeDefs 'manual' (~5 tests):**
43. Sen conflitos: equivalente a first_wins ok.
44. Con conflitos: err(MERGE_CONFLICTS_DETECTED).
45. context inclúe ConflictReport.
46. Locale propaga á mensaxe.
47. Cero merge real cando devolve err.

**MergedTreeMeta (~5 tests):**
48. Cero mergedMeta: usa primeira árbore.
49. mergedMeta.id custom: aplícase.
50. mergedMeta.label custom: aplícase.
51. mergedMeta parcial: combina con primeira árbore.
52. mergedMeta sobreescribe layout.

**Inmutabilidade (~3 tests):**
53. Input trees NON modificados (deep equality despois).
54. Cero shared references entre input e output.

**Total: ~55 tests.**

### 5.14 — Cobertura

- `Federator.ts`: **100% Stmts/Funcs/Lines, ≥90% Branch** (peza
  grande con switch en rewritePrereq e rewriteEffect que poden ter
  ramas defensivas para casos non-cubertos por tests). **Lección 3.5
  L1 e 4.3 L1 aplicables**.
- Global core: non baixar de baseline (97.97%). **Esperada mellora
  porque Federator engade código exercitado por ~55 tests novos**.

### 5.15 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
export { Federator } from './Federator.js'
export type {
  MergeStrategy,
  Conflict,
  ConflictReport,
  MergeOptions,
  MergedTreeMeta,
} from './Federator.js'
```

### 5.16 — Determinismo

- Orde dos conflitos en `ConflictReport.conflicts`: orde de
  declaración (tree_id primeiro, despois nodes, etc.). **Estable**.
- Orde dos elementos no TreeDef resultante: orde de aparición na
  primera árbore + segunda + etc.
- `Map` iteration: preserva orde de inserción.

### 5.17 — Tamaño previsto

- `Federator.ts`: ~400-500 liñas (rewriteWithNamespace é a maioría).
- Tests: ~500-600 liñas.
- ErrorCodes + mensaxes: ~12 liñas.
- **Total**: ~900-1100 liñas. **Sub-fase grande pero risco baixo**
  (peza standalone).

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/Federator.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +6 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +3 ErrorCodes;
  autorizado por 5.12)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +9 mensaxes;
  autorizado por 5.12)

**Tests:**
- `packages/core/__tests__/engine/Federator.test.ts` (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións CRÍTICAS

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1306 tests core + 60 common + 171 storage con `--force`.

2. **Verifica GroupDef shape**: ¿ten campo `nodes?: readonly string[]`
   ou similar?
   ```
   grep -B1 -A8 "interface GroupDef" packages/core/src/types/*.ts
   ```
   Se ten nodes refs, **rewrite groups.nodes** en namespace_all
   (paso 3 do pseudo-código 5.10).
   Se NON ten, **omitir** ese paso (cero rewrite de groups.nodes).

3. **Verifica Prereq types completos** para confirmar pseudo-código
   5.10 cubre todos os tipos:
   ```
   grep -B1 "^  | {" packages/core/src/types/unlock.ts | head -30
   ```

4. **Verifica Effect types completos**:
   ```
   grep -B1 "^  | {" packages/core/src/types/effects.ts | head -20
   ```

5. **Verifica Unlockable shape** (onde vive prereq):
   ```
   grep -B1 -A4 "interface Unlockable\|type Unlockable" packages/core/src/types/*.ts | head -15
   ```

6. **Verifica patrón ErrorCode SUBTREE_NOT_UNLOCKED** para replicar
   estilo:
   ```
   grep -A2 "SUBTREE_NOT_UNLOCKED" packages/common/src/errors/codes.ts
   grep -A4 "SUBTREE_NOT_UNLOCKED" packages/common/src/errors/messages.ts
   ```

7. **5.2 L2 aplicación**: lista API pública de TreeDef e tipos
   relacionados antes de empezar para evitar usar membros que non
   existen.

### T1 — ErrorCodes novos en common (5.12)

1. Editar `packages/common/src/errors/codes.ts`:
   - Engadir 3 ErrorCodes (YGG_E026, YGG_E027, YGG_E028).
2. Editar `packages/common/src/errors/messages.ts`:
   - Engadir as 9 mensaxes (3 ErrorCodes × 3 locales).
3. Typecheck 20/20.
4. Confirma 60 tests common seguen pasando.

### T2 — Tipos en Federator.ts (5.4)

Crear `packages/core/src/engine/Federator.ts` con:
- `MergeStrategy` type.
- `Conflict` discriminated union.
- `ConflictReport` interface.
- `MergedTreeMeta` interface.
- `MergeOptions` interface.
- Esqueleto da clase `Federator` con métodos vacíos.

Typecheck 20/20.

### T3 — detectConflicts (5.5)

Implementar `Federator.detectConflicts` + helpers privados
`addLocation`, `collectConflicts`.

Typecheck 20/20.

### T4 — mergeTreeDefs orquestración (5.6)

Implementar `Federator.mergeTreeDefs` co flow de validacións + delegate
a estratexia.

Typecheck 20/20.

### T5 — mergeWinsStrategy (5.8)

Implementar `mergeWinsStrategy` para 'first_wins' e 'last_wins'.

Typecheck 20/20.

### T6 — mergeNamespaceStrategy + rewriteWithNamespace (5.7 + 5.10)

Implementar fielmente o pseudo-código de 5.10:
- `mergeNamespaceStrategy`.
- `rewriteWithNamespace` (recursivo nos prereqs).
- `rewritePrereq` (switch sobre os 11+ tipos).
- `rewriteEffect` (switch sobre os 5+ tipos).
- `combineTrees`.

**Calquera dúbida sobre o pseudo-código → ESCALAR**.

Typecheck 20/20.

### T7 — buildTopLevelMeta (5.9)

Implementar helper privado con spread condicional para
`exactOptionalPropertyTypes`.

Typecheck 20/20.

### T8 — Tests Federator (5.13)

Crear `__tests__/engine/Federator.test.ts` cos ~55 tests.

**Importante**:
- Test 33 (subtrees NON rewrite recursivo) é crítico.
- Test 53-54 (inmutabilidade input) son críticos.
- Tests prereq recursivos (26-27) son críticos.

### T9 — Exportar dende engine/index.ts (5.15)

Engadir 6 exports.

### T10 — Verificación post-T9

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1306 tests previos seguen pasando intactos.
- 60 common previos intactos.
- 171 storage previos intactos.

### T11 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- Federator.ts 100/≥90%/100/100.
- Global core ≥97.97%.

### T12 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/Federator.ts
pnpm test
```

- Changeset **minor** para `@yggdrasil-forge/core`.
- Changeset **patch** para `@yggdrasil-forge/common`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `Federator` clase: utilidade para combinar múltiples TreeDefs.
    Métodos puros:
    - `detectConflicts(trees)`: detecta colisións de id en 7
      categorías (tree, node, edge, group, resource, stat, subtree).
    - `mergeTreeDefs(trees, strategy, options?)`: combina TreeDefs
      segundo unha estratexia (`'namespace_all'`, `'first_wins'`,
      `'last_wins'`, `'manual'`).
  - `MergeStrategy`, `Conflict`, `ConflictReport`, `MergeOptions`,
    `MergedTreeMeta` types.
  - `'namespace_all'` strategy reescribe TODAS as cross-references
    internas (edges source/target, prereqs nodeId/resourceId/
    statId/subtreeId, effects nodeId, rootNodeId, etc.) recursivamente
    incluíndo all_of/any_of children.
  - `'manual'` strategy devolve err(MERGE_CONFLICTS_DETECTED) se
    hai conflitos; cero conflitos → equivalente a 'first_wins'.
  - 3 ErrorCodes novos: `MERGE_INVALID_INPUT` (YGG_E026),
    `MERGE_CONFLICTS_DETECTED` (YGG_E027), `MERGE_INCOMPATIBLE_SCHEMA`
    (YGG_E028), traducidos en gl/es/en.

  ### Note
  - Sub-fase 5.3 ÚLTIMA da Fase 5. **Fase 5 PECHADA**.
  - `Federator.loadFederation(sources)` **DIFERIDA** a sub-fase
    específica futura. **DT-20 NOVA**: require decisión arquitectónica
    sobre FederationSource shape (URL+CORS? File? Storage?) sin caso
    de uso real documentado. mergeTreeDefs cumpre o caso core; o
    consumidor carga TreeDefs co seu propio método e pasa.
  - `mergeTreeDefs` rexeita TreeDefs con `schemaVersion` distintos
    (MERGE_INCOMPATIBLE_SCHEMA). Workflow: usar MigrationRunner antes
    de federar.
  - tree.subtrees[id].nodes NON se rewrite recursivamente en
    'namespace_all' (decisión consciente: subtree é template
    interna; consumidor pode aplicar mergeTreeDefs recursivamente
    se quere flatten).
  ```

### T13 — Commit + push

Commit Conventional:
`feat(core): add Federator with mergeTreeDefs and detectConflicts (sub-phase 5.3)`.
Push directo a `origin/main` (base `1f7de89`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/Federator.ts` (NOVO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +6 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO)
- `packages/common/src/errors/messages.ts` (MODIFICADO)
- `packages/core/__tests__/engine/Federator.test.ts` (NOVO)
- `.changeset/*.md` (NOVO: 2 ficheiros)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, ou outros globais.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- TreeEngine, SubtreeManager, ou outras pezas existentes (5.11).
- Tipos TreeDef, NodeDef, EdgeDef, Prereq, Effect (xa modelados).
- Tests existentes.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` para os métodos públicos. 2 espazos, comilla
simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS strict,
**cero `any`**. NON desactives Biome.

**rewritePrereq + rewriteEffect**: implementar **fielmente** o
pseudo-código de 5.10. Switch exhaustivo: para tipos non listados,
**devolver intacto** (default branch).

---

## 9. QUE NON FACER

- ❌ Implementar `loadFederation` (5.1: DIFERIDA; DT-20 NOVA).
- ❌ Engadir `FederationSource` type (5.1: cero implementación).
- ❌ Implementar merge intelixente nodo-a-nodo (5.4: estratexias
  prescritas).
- ❌ Implementar resolución manual con callback (5.4: 'manual' rexeita;
  workflow é detectConflicts → resolver externamente → call con outra
  estratexia).
- ❌ Aceptar TreeDefs con schemaVersion distintos (5.6: rexeitar
  err(MERGE_INCOMPATIBLE_SCHEMA)).
- ❌ Reescribir recursivamente `tree.subtrees[id].nodes` (5.10:
  decisión consciente; subtrees son templates internas).
- ❌ Mutate input TreeDefs (tests 53-54 verifican; función pura).
- ❌ Modificar TreeEngine, SubtreeManager, ou outras pezas (5.11).
- ❌ Modificar TreeDef, NodeDef, Prereq, Effect tipos (5.11: xa
  modelados).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` agás `codes.ts` e `messages.ts`
  (5.12 autorizado).
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes adicionais (só os 3 prescritos en 5.12).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.
- ❌ Inventar lóxica distinta da §5.10 pseudo-código. Calquera dúbida
  → ESCALAR.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 5.3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 1f7de89)
✅ Federator clase con detectConflicts + mergeTreeDefs (4 estratexias)
✅ 'namespace_all' con rewrite recursivo completo de cross-references:
   - edges source/target, prereqs (nodeId/resourceId/statId/subtreeId),
     effects (nodeId), rootNodeId, NodeDef.subtreeId, groups, etc.
   - Prereqs all_of/any_of: recursión correcta sobre children
✅ 'first_wins' / 'last_wins': estratexias simples sen rewrite
✅ 'manual': rexeita con err se hai conflitos
✅ MergedTreeMeta opcional para personalizar top-level do resultado
✅ 3 ErrorCodes novos:
   - MERGE_INVALID_INPUT (YGG_E026)
   - MERGE_CONFLICTS_DETECTED (YGG_E027)
   - MERGE_INCOMPATIBLE_SCHEMA (YGG_E028)
   3 locales: gl/es/en
✅ loadFederation NON implementada (DT-20 NOVA; documentado)
✅ Schema version rexeitada distinta (workflow: MigrationRunner antes)
✅ tree.subtrees[id].nodes NON rewrite recursivo (decisión consciente)
✅ Federator puro: cero modificación de pezas existentes
✅ Cero modificación de storage/tsconfig/tsup
✅ T0.2 GroupDef shape verificado: <forma>
✅ T0.3 Prereq types verificados: <lista>
✅ T0.4 Effect types verificados: <lista>
✅ T0.5 Unlockable shape verificado
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> detectConflicts (7 tipos de conflict)
   - <Y> mergeTreeDefs validation (input + schema)
   - <Z> 'namespace_all' (rewrite completo)
   - <W> 'first_wins' / 'last_wins'
   - <V> 'manual'
   - <U> MergedTreeMeta
   - <T> Inmutabilidade input
✅ Cobertura:
   - Federator.ts: <X%> (≥90% Branch; lección 3.5 L1 + 4.3 L1)
   - Global core: <X%> (baseline 97.97%; mantense ou sobe)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 5.3 ÚLTIMA da Fase 5.
   - **FASE 5 PECHADA**: SubtreeManager (5.1) + integration TreeEngine
     (5.2) + Federator (5.3) funcional.
   - DT-20 NOVA: loadFederation diferida a sub-fase futura específica.
   - DT-19 (5.2) aínda pendente: budget compartido entre engines.
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO. FASE 5 PECHADA. Pendente decisión do director:
hixiene MASTER + Fase 6 ou outra dirección.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 5.3. Última sub-fase Fase 5. Federator standalone
con rewrite recursivo de cross-references. Calquera dúbida sobre o
pseudo-código → ESCALAR.*
