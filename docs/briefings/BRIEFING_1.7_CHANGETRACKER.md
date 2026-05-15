# BRIEFING EXECUTABLE — Sub-fase 1.7
## Yggdrasil Forge: ChangeTracker — análise selectiva de TreeChange[]

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa
- `@yggdrasil-forge/common` con código real
- `@yggdrasil-forge/core` con:
  - Tipos das 3 ondas (1.2, 1.3, 1.4)
  - EventEmitter + ConcurrencyGuard + utils (1.5)
  - StateStore con Immer + cache versioning + subscripcións (1.6)
- CI verde, 131 tests pasan, cobertura 100% nas pezas con lóxica
- Documento mestre en `docs/architecture/MASTER.md`

**Esta sub-fase implementa o analizador de cambios.**

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.7**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Sección 7.14** (TreeChange — todos os tipos)
- **Sección 5.6.4** (decisión: rename_node_id con auto-update de referencias)
- **Sección 5.1** (TreeDef mutable pero rastrexable)
- **Sección 8.2** (cache versioning)
- **Sección 1.3.2** (reglas de Biome estritas)
- **Sección 1.1.2** (patrón obrigatorio lint:fix + format)

---

## 3. OBXECTIVO DESTA SUB-FASE

Implementar a clase `ChangeTracker` que analiza arrays de `TreeChange[]` e produce un `ChangeAnalysis` con:

1. **`affectedNodes: Set<string>`** — IDs de nodos cuxas NodeInstances precisan reconciliación
2. **`cachesToInvalidate: Set<CacheType>`** — caches que perderon validez por estes cambios
3. **`internalConflicts: ChangeConflict[]`** — problemas detectados *dentro da propia lista* (sen consultar estado externo)
4. **`renames: Map<string, string>`** — mapa de renames oldId→newId aplicados nesta tanda

**ChangeTracker é PURO E ANALÍTICO:** non muta nada, non valida contra estado externo, non lanza excepcións. Dado un input, sempre produce a mesma saída.

**NON entra nesta sub-fase:**
- Aplicar cambios á TreeDef (iso fai `StateStore.applyTreeDefChange`, xa existente)
- Reconciliar NodeInstances tras un cambio (vai en `Reconciler`, sub-fase posterior)
- Validar referencias contra o estado actual (iso é responsabilidade de TreeEngine en 1.14)
- Substituír a invalidación masiva do StateStore (iso integraranse cando se faga TreeEngine)

---

## 4. DECISIÓNS XA TOMADAS

### 4.1 Análise vs validación

ChangeTracker **só analiza, non valida contra estado**. Razón: separación de responsabilidades. A validación require coñecer o estado actual (que IDs existen, etc.), e iso vén despois.

**Pero si detecta conflitos internos da lista:**
- Mesmo nodeId engadido máis dunha vez (`add_node` duplicado)
- `remove_node` + `modify_node` do mesmo id na mesma lista
- `rename_node_id` con oldId xa renomeado antes na lista
- `rename_node_id` con newId que xa existe como oldId noutro rename
- Outros casos similares

Eses conflitos forman parte do análise puro (non require estado externo).

### 4.2 Mapeo de cambios → caches afectadas

Decisións concretas:

| TreeChange | layout | dependency | search | stats |
|------------|:------:|:----------:|:------:|:-----:|
| `add_node` | ✓ | ✓ | ✓ | ✓ |
| `remove_node` | ✓ | ✓ | ✓ | ✓ |
| `modify_node` (genérico) | ✓ | (depende) | ✓ | ✓ |
| `rename_node_id` | ✓ | ✓ | ✓ | ✓ |
| `add_edge` | ✓ | ✓ | — | — |
| `remove_edge` | ✓ | ✓ | — | — |
| `modify_edge` | ✓ | (depende) | — | — |
| `add_group` | ✓ | — | ✓ | — |
| `remove_group` | ✓ | — | ✓ | — |
| `modify_group` | ✓ | — | ✓ | — |
| `add_resource` | — | — | — | ✓ |
| `modify_layout` | ✓ | — | — | — |

**`modify_node` análise por campo modificado:**
- `position`, `color`, `icon`, `tier`, `maxTier`, `group` → `layout`
- `prerequisites`, `exclusions` → `layout`, `dependency`
- `cost`, `costPerTier`, `effects` → `layout`, `stats`
- `statContributions` → `stats`
- `label`, `description`, `tags`, `searchKeywords`, `content` → `search`
- `metadata` → `search` (por se algún día se indexa)
- `progressSource`, `timeConstraints`, `supportsProgress`, `progressMilestones` → `layout` (porque afectan visualización)
- `subtreeId`, `subtreeOverrides` → `layout`, `dependency`

**`modify_edge` análise por campo:**
- `type` → `layout`, `dependency`
- `weight`, `style`, `label`, `bidirectional` → `layout`

### 4.3 Mapeo de cambios → nodos afectados (para reconciliación)

- `add_node`: o propio nodo (NodeInstance hai que crear cando se desbloquee)
- `remove_node`: o propio nodo (NodeInstance hai que eliminar)
- `modify_node`: o propio nodo
- `rename_node_id`: o nodo antigo E o novo
- `add_edge` / `remove_edge` / `modify_edge`: source E target
- `add_group` / `remove_group` / `modify_group`: ningún (os grupos son metadatos visuais)
- `add_resource`: ningún (afecta budget, non NodeInstances)
- `modify_layout`: ningún (afecta posicións, non estado de nodos)

### 4.4 Tipos de conflito internos a detectar

```typescript
type ChangeConflict =
  | { type: 'duplicate_add_node'; nodeId: string; positions: number[] }
  | { type: 'add_then_remove'; nodeId: string; addPosition: number; removePosition: number }
  | { type: 'remove_then_modify'; nodeId: string; removePosition: number; modifyPosition: number }
  | { type: 'modify_after_rename'; oldId: string; renamePosition: number; modifyPosition: number }
  | { type: 'rename_chain'; firstRename: { oldId: string; newId: string }; secondRename: { oldId: string; newId: string }; positions: [number, number] }
  | { type: 'rename_to_existing'; newId: string; conflictingPosition: number }
  | { type: 'duplicate_edge_id'; edgeId: string; positions: number[] }
```

⚠️ Os conflitos son **informativos**, non lanzan erros. O TreeEngine en 1.14 decidirá se aborta a operación ou aplica unha estratexia (skip, last-wins, etc.).

### 4.5 Convencións

- Imports relativos con `.js`
- `import type` para tipos
- Cero `any`
- Cobertura **100%** (toda a lóxica é determinística)
- Acceso por punto (`.xp`) onde sexa identificador válido (regla `useLiteralKeys`)

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: a7d0a02
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 Crear packages/core/src/engine/ChangeTracker.ts

```typescript
// ── INICIO: ChangeTracker ──
// Analiza arrays de TreeChange[] e decide:
// - Que caches invalidar selectivamente
// - Que NodeInstances precisan reconciliación
// - Que conflitos internos hai na lista
//
// É PURO: non muta nada, non lanza excepcións, non consulta estado externo.

import type { CacheType } from './StateStore.js'
import type { TreeChange } from '../types/index.js'

/**
 * Conflito detectado entre cambios da mesma lista.
 *
 * Os conflitos son informativos. O TreeEngine decidirá como reaccionar
 * (abortar, aplicar estratexia, etc.).
 */
export type ChangeConflict =
  | { readonly type: 'duplicate_add_node'; readonly nodeId: string; readonly positions: readonly number[] }
  | {
      readonly type: 'add_then_remove'
      readonly nodeId: string
      readonly addPosition: number
      readonly removePosition: number
    }
  | {
      readonly type: 'remove_then_modify'
      readonly nodeId: string
      readonly removePosition: number
      readonly modifyPosition: number
    }
  | {
      readonly type: 'modify_after_rename'
      readonly oldId: string
      readonly renamePosition: number
      readonly modifyPosition: number
    }
  | {
      readonly type: 'rename_chain'
      readonly firstRename: { readonly oldId: string; readonly newId: string }
      readonly secondRename: { readonly oldId: string; readonly newId: string }
      readonly positions: readonly [number, number]
    }
  | {
      readonly type: 'rename_to_existing'
      readonly newId: string
      readonly conflictingPosition: number
    }
  | { readonly type: 'duplicate_edge_id'; readonly edgeId: string; readonly positions: readonly number[] }

/**
 * Resultado da análise dunha lista de TreeChange.
 */
export interface ChangeAnalysis {
  /** IDs de nodos cuxas NodeInstances precisan reconciliación. */
  readonly affectedNodes: ReadonlySet<string>
  /** Caches que perderon validez. */
  readonly cachesToInvalidate: ReadonlySet<CacheType>
  /** Conflitos internos detectados na lista. */
  readonly internalConflicts: readonly ChangeConflict[]
  /** Mapa oldId → newId dos renames aplicados na lista. */
  readonly renames: ReadonlyMap<string, string>
}

/**
 * Conxunto de campos de NodeDef que afectan a cache de layout.
 */
const LAYOUT_AFFECTING_NODE_FIELDS = new Set<string>([
  'position',
  'color',
  'icon',
  'tier',
  'maxTier',
  'group',
  'type',
  'label',
  'cost',
  'costPerTier',
  'effects',
  'prerequisites',
  'exclusions',
  'supportsProgress',
  'progressMilestones',
  'progressSource',
  'timeConstraints',
  'subtreeId',
  'subtreeOverrides',
])

/**
 * Conxunto de campos de NodeDef que afectan a cache de dependency graph.
 */
const DEPENDENCY_AFFECTING_NODE_FIELDS = new Set<string>([
  'prerequisites',
  'exclusions',
  'subtreeId',
  'subtreeOverrides',
])

/**
 * Conxunto de campos de NodeDef que afectan a cache de search.
 */
const SEARCH_AFFECTING_NODE_FIELDS = new Set<string>([
  'label',
  'description',
  'tags',
  'searchKeywords',
  'content',
  'metadata',
])

/**
 * Conxunto de campos de NodeDef que afectan a cache de stats.
 */
const STATS_AFFECTING_NODE_FIELDS = new Set<string>([
  'cost',
  'costPerTier',
  'effects',
  'statContributions',
])

/**
 * Conxunto de campos de EdgeDef que afectan a cache de layout.
 */
const LAYOUT_AFFECTING_EDGE_FIELDS = new Set<string>([
  'type',
  'weight',
  'style',
  'label',
  'bidirectional',
])

/**
 * Conxunto de campos de EdgeDef que afectan a cache de dependency.
 */
const DEPENDENCY_AFFECTING_EDGE_FIELDS = new Set<string>(['type'])

/**
 * Analiza unha lista de TreeChange e produce un ChangeAnalysis.
 *
 * É unha función pura: non muta nada, non consulta estado externo.
 *
 * Os conflitos detectados son informativos; non se lanzan erros.
 *
 * @example
 * const analysis = analyzeChanges([
 *   { type: 'add_node', node: { id: 'a', type: 'small', label: 'A' } },
 *   { type: 'modify_node', nodeId: 'b', changes: { color: '#fff' } },
 * ])
 * analysis.affectedNodes      // Set { 'a', 'b' }
 * analysis.cachesToInvalidate // Set { 'layout', 'dependency', 'search', 'stats' }
 */
export function analyzeChanges(changes: readonly TreeChange[]): ChangeAnalysis {
  const affectedNodes = new Set<string>()
  const cachesToInvalidate = new Set<CacheType>()
  const conflicts: ChangeConflict[] = []
  const renames = new Map<string, string>()

  // Tracking interno para detectar conflitos.
  const addedNodePositions = new Map<string, number[]>()
  const removedNodePositions = new Map<string, number>()
  const renamePositions = new Map<string, number>() // oldId → position
  const addedEdgePositions = new Map<string, number[]>()

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]
    if (change === undefined) {
      continue
    }
    analyzeOne(change, i, {
      affectedNodes,
      cachesToInvalidate,
      conflicts,
      renames,
      addedNodePositions,
      removedNodePositions,
      renamePositions,
      addedEdgePositions,
    })
  }

  // Detecta duplicate_add_node (varios add_node co mesmo id).
  for (const [nodeId, positions] of addedNodePositions.entries()) {
    if (positions.length > 1) {
      conflicts.push({
        type: 'duplicate_add_node',
        nodeId,
        positions: [...positions],
      })
    }
  }

  // Detecta duplicate_edge_id.
  for (const [edgeId, positions] of addedEdgePositions.entries()) {
    if (positions.length > 1) {
      conflicts.push({
        type: 'duplicate_edge_id',
        edgeId,
        positions: [...positions],
      })
    }
  }

  return {
    affectedNodes,
    cachesToInvalidate,
    internalConflicts: conflicts,
    renames,
  }
}

/**
 * Acumulador pasado por referencia para analyzeOne.
 */
interface AnalysisAccumulator {
  affectedNodes: Set<string>
  cachesToInvalidate: Set<CacheType>
  conflicts: ChangeConflict[]
  renames: Map<string, string>
  addedNodePositions: Map<string, number[]>
  removedNodePositions: Map<string, number>
  renamePositions: Map<string, number>
  addedEdgePositions: Map<string, number[]>
}

/**
 * Analiza un cambio individual e actualiza o acumulador.
 */
function analyzeOne(
  change: TreeChange,
  position: number,
  acc: AnalysisAccumulator,
): void {
  switch (change.type) {
    case 'add_node': {
      const id = change.node.id
      acc.affectedNodes.add(id)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency', 'search', 'stats'])
      trackAdd(acc.addedNodePositions, id, position)

      // Detección: add despois de remove.
      const removedAt = acc.removedNodePositions.get(id)
      if (removedAt !== undefined) {
        // engadir + remove + engadir é un patrón válido (reset). Non é conflito.
      }
      return
    }

    case 'remove_node': {
      const id = change.nodeId
      acc.affectedNodes.add(id)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency', 'search', 'stats'])

      // Detección: add_then_remove na mesma lista (o add tórnase irrelevante).
      const addPositions = acc.addedNodePositions.get(id) ?? []
      const lastAddPosition = addPositions.at(-1)
      if (lastAddPosition !== undefined && lastAddPosition < position) {
        acc.conflicts.push({
          type: 'add_then_remove',
          nodeId: id,
          addPosition: lastAddPosition,
          removePosition: position,
        })
      }

      acc.removedNodePositions.set(id, position)
      return
    }

    case 'modify_node': {
      const id = change.nodeId
      acc.affectedNodes.add(id)
      addCachesForModifyNode(acc.cachesToInvalidate, change.changes)

      // Detección: remove_then_modify.
      const removedAt = acc.removedNodePositions.get(id)
      if (removedAt !== undefined && removedAt < position) {
        acc.conflicts.push({
          type: 'remove_then_modify',
          nodeId: id,
          removePosition: removedAt,
          modifyPosition: position,
        })
      }

      // Detección: modify_after_rename (modificar o id antigo despois dun rename).
      const renamedAt = acc.renamePositions.get(id)
      if (renamedAt !== undefined && renamedAt < position) {
        acc.conflicts.push({
          type: 'modify_after_rename',
          oldId: id,
          renamePosition: renamedAt,
          modifyPosition: position,
        })
      }
      return
    }

    case 'rename_node_id': {
      acc.affectedNodes.add(change.oldId)
      acc.affectedNodes.add(change.newId)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency', 'search', 'stats'])

      // Detección: rename_chain (renomear A→B e despois B→C).
      const previousNewId = acc.renames.get(change.oldId)
      // Caso 1: o oldId actual xa foi destino dun rename previo
      for (const [prevOld, prevNew] of acc.renames.entries()) {
        if (prevNew === change.oldId) {
          acc.conflicts.push({
            type: 'rename_chain',
            firstRename: { oldId: prevOld, newId: prevNew },
            secondRename: { oldId: change.oldId, newId: change.newId },
            positions: [acc.renamePositions.get(prevOld) ?? -1, position],
          })
          break
        }
      }

      // Caso 2: rename_to_existing — o newId xa foi oldId noutro rename previo.
      if (acc.renames.has(change.newId)) {
        acc.conflicts.push({
          type: 'rename_to_existing',
          newId: change.newId,
          conflictingPosition: acc.renamePositions.get(change.newId) ?? -1,
        })
      }

      // Caso 3: doble rename do mesmo oldId (sobrescritura).
      if (previousNewId !== undefined) {
        // O caso 1 xa cubriu chain; aquí é só sobrescritura simple, non engade conflito extra.
      }

      acc.renames.set(change.oldId, change.newId)
      acc.renamePositions.set(change.oldId, position)
      return
    }

    case 'add_edge': {
      acc.affectedNodes.add(change.edge.source)
      acc.affectedNodes.add(change.edge.target)
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency'])
      trackAdd(acc.addedEdgePositions, change.edge.id, position)
      return
    }

    case 'remove_edge': {
      // Non sabemos source/target sen consultar treeDef; só invalidamos caches.
      // affectedNodes manterase incompleto para este caso — o Reconciler
      // posterior consultará a TreeDef para inferir os nodos afectados.
      addCaches(acc.cachesToInvalidate, ['layout', 'dependency'])
      return
    }

    case 'modify_edge': {
      addCachesForModifyEdge(acc.cachesToInvalidate, change.changes)
      return
    }

    case 'add_group':
    case 'remove_group':
    case 'modify_group':
      addCaches(acc.cachesToInvalidate, ['layout', 'search'])
      return

    case 'add_resource':
      addCaches(acc.cachesToInvalidate, ['stats'])
      return

    case 'modify_layout':
      addCaches(acc.cachesToInvalidate, ['layout'])
      return
  }
}

/**
 * Engade varios CacheType ao set acumulador.
 */
function addCaches(target: Set<CacheType>, types: readonly CacheType[]): void {
  for (const type of types) {
    target.add(type)
  }
}

/**
 * Decide que caches afectar segundo os campos modificados nun modify_node.
 */
function addCachesForModifyNode(
  target: Set<CacheType>,
  changes: Record<string, unknown>,
): void {
  for (const field of Object.keys(changes)) {
    if (LAYOUT_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('layout')
    }
    if (DEPENDENCY_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('dependency')
    }
    if (SEARCH_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('search')
    }
    if (STATS_AFFECTING_NODE_FIELDS.has(field)) {
      target.add('stats')
    }
  }
}

/**
 * Decide que caches afectar segundo os campos modificados nun modify_edge.
 */
function addCachesForModifyEdge(
  target: Set<CacheType>,
  changes: Record<string, unknown>,
): void {
  for (const field of Object.keys(changes)) {
    if (LAYOUT_AFFECTING_EDGE_FIELDS.has(field)) {
      target.add('layout')
    }
    if (DEPENDENCY_AFFECTING_EDGE_FIELDS.has(field)) {
      target.add('dependency')
    }
  }
}

/**
 * Engade unha posición a un mapa de ID → posicións (para detectar duplicados).
 */
function trackAdd(target: Map<string, number[]>, id: string, position: number): void {
  const list = target.get(id) ?? []
  list.push(position)
  target.set(id, list)
}

/**
 * Wrapper class para futuras extensións (memoización, estatísticas, etc.).
 *
 * Por agora é unha capa fina sobre analyzeChanges. Mantense como clase para
 * permitir composición no TreeEngine sen romper APIs cando engada estado interno.
 */
export class ChangeTracker {
  /**
   * Analiza unha lista de cambios.
   */
  analyze(changes: readonly TreeChange[]): ChangeAnalysis {
    return analyzeChanges(changes)
  }
}
// ── FIN: ChangeTracker ──
```

### 5.2 Actualizar packages/core/src/engine/index.ts

Substituír o contido por:

```typescript
// ── INICIO: engine public API ──
// Exporta as pezas do motor.

export { EventEmitter, type Unsubscribe } from './EventEmitter.js'
export {
  ConcurrencyGuard,
  type ConcurrencyGuardOptions,
} from './ConcurrencyGuard.js'
export {
  StateStore,
  type CacheType,
  ALL_CACHE_TYPES,
  type StateListener,
  type StateStoreOptions,
} from './StateStore.js'
export {
  ChangeTracker,
  analyzeChanges,
  type ChangeAnalysis,
  type ChangeConflict,
} from './ChangeTracker.js'
// ── FIN: engine public API ──
```

### 5.3 Tests

Crear `packages/core/__tests__/engine/ChangeTracker.test.ts`:

```typescript
// ── INICIO: tests de ChangeTracker ──
import { describe, expect, it } from 'vitest'
import {
  analyzeChanges,
  ChangeTracker,
  type ChangeConflict,
} from '../../src/engine/index.js'
import type { NodeDef, TreeChange } from '../../src/types/index.js'

/** Helper: NodeDef mínimo válido. */
function makeNode(id: string, overrides?: Partial<NodeDef>): NodeDef {
  return {
    id,
    type: 'small',
    label: id,
    ...overrides,
  }
}

describe('analyzeChanges (function)', () => {
  describe('add_node', () => {
    it('adds the nodeId to affectedNodes', () => {
      const result = analyzeChanges([{ type: 'add_node', node: makeNode('a') }])
      expect(result.affectedNodes.has('a')).toBe(true)
    })

    it('invalidates all four cache types', () => {
      const result = analyzeChanges([{ type: 'add_node', node: makeNode('a') }])
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })

    it('detects duplicate_add_node when same id added twice', () => {
      const result = analyzeChanges([
        { type: 'add_node', node: makeNode('a') },
        { type: 'add_node', node: makeNode('a') },
      ])
      const dup = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'duplicate_add_node' }> =>
          c.type === 'duplicate_add_node',
      )
      expect(dup).toBeDefined()
      expect(dup?.nodeId).toBe('a')
      expect(dup?.positions).toEqual([0, 1])
    })
  })

  describe('remove_node', () => {
    it('adds the nodeId to affectedNodes', () => {
      const result = analyzeChanges([{ type: 'remove_node', nodeId: 'a' }])
      expect(result.affectedNodes.has('a')).toBe(true)
    })

    it('invalidates all four cache types', () => {
      const result = analyzeChanges([{ type: 'remove_node', nodeId: 'a' }])
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })

    it('detects add_then_remove conflict', () => {
      const result = analyzeChanges([
        { type: 'add_node', node: makeNode('a') },
        { type: 'remove_node', nodeId: 'a' },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'add_then_remove' }> =>
          c.type === 'add_then_remove',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.nodeId).toBe('a')
      expect(conflict?.addPosition).toBe(0)
      expect(conflict?.removePosition).toBe(1)
    })
  })

  describe('modify_node', () => {
    it('adds the nodeId to affectedNodes', () => {
      const result = analyzeChanges([
        { type: 'modify_node', nodeId: 'a', changes: { color: '#fff' } },
      ])
      expect(result.affectedNodes.has('a')).toBe(true)
    })

    it('invalidates layout for visual fields', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { position: { x: 1, y: 2 }, color: '#fff' },
        },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
    })

    it('invalidates dependency for prerequisites/exclusions', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { exclusions: ['x'] },
        },
      ])
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
    })

    it('invalidates search for label/description/tags', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: { label: 'New', tags: ['t1'] },
        },
      ])
      expect(result.cachesToInvalidate.has('search')).toBe(true)
    })

    it('invalidates stats for statContributions', () => {
      const result = analyzeChanges([
        {
          type: 'modify_node',
          nodeId: 'a',
          changes: {
            statContributions: [{ statId: 'damage', op: '+', value: 5 }],
          },
        },
      ])
      expect(result.cachesToInvalidate.has('stats')).toBe(true)
    })

    it('detects remove_then_modify conflict', () => {
      const result = analyzeChanges([
        { type: 'remove_node', nodeId: 'a' },
        { type: 'modify_node', nodeId: 'a', changes: { color: '#fff' } },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'remove_then_modify' }> =>
          c.type === 'remove_then_modify',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.nodeId).toBe('a')
    })
  })

  describe('rename_node_id', () => {
    it('adds both oldId and newId to affectedNodes', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
      ])
      expect(result.affectedNodes.has('a')).toBe(true)
      expect(result.affectedNodes.has('b')).toBe(true)
    })

    it('records the rename in the renames map', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
      ])
      expect(result.renames.get('a')).toBe('b')
    })

    it('invalidates all four caches', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
      ])
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })

    it('detects rename_chain (A→B then B→C)', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
        { type: 'rename_node_id', oldId: 'b', newId: 'c' },
      ])
      const chain = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'rename_chain' }> =>
          c.type === 'rename_chain',
      )
      expect(chain).toBeDefined()
      expect(chain?.firstRename).toEqual({ oldId: 'a', newId: 'b' })
      expect(chain?.secondRename).toEqual({ oldId: 'b', newId: 'c' })
    })

    it('detects rename_to_existing (newId is already an oldId)', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
        { type: 'rename_node_id', oldId: 'c', newId: 'a' },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'rename_to_existing' }> =>
          c.type === 'rename_to_existing',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.newId).toBe('a')
    })

    it('detects modify_after_rename', () => {
      const result = analyzeChanges([
        { type: 'rename_node_id', oldId: 'a', newId: 'b' },
        { type: 'modify_node', nodeId: 'a', changes: { color: '#fff' } },
      ])
      const conflict = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'modify_after_rename' }> =>
          c.type === 'modify_after_rename',
      )
      expect(conflict).toBeDefined()
      expect(conflict?.oldId).toBe('a')
    })
  })

  describe('edges', () => {
    it('add_edge marks source and target as affected', () => {
      const result = analyzeChanges([
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
      ])
      expect(result.affectedNodes.has('a')).toBe(true)
      expect(result.affectedNodes.has('b')).toBe(true)
    })

    it('add_edge invalidates layout and dependency', () => {
      const result = analyzeChanges([
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
      expect(result.cachesToInvalidate.has('search')).toBe(false)
    })

    it('detects duplicate_edge_id', () => {
      const result = analyzeChanges([
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
        },
        {
          type: 'add_edge',
          edge: { id: 'e1', source: 'c', target: 'd', type: 'dependency' },
        },
      ])
      const dup = result.internalConflicts.find(
        (c): c is Extract<ChangeConflict, { type: 'duplicate_edge_id' }> =>
          c.type === 'duplicate_edge_id',
      )
      expect(dup).toBeDefined()
      expect(dup?.edgeId).toBe('e1')
    })

    it('remove_edge invalidates layout and dependency', () => {
      const result = analyzeChanges([{ type: 'remove_edge', edgeId: 'e1' }])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
    })

    it('modify_edge with weight only invalidates layout', () => {
      const result = analyzeChanges([
        { type: 'modify_edge', edgeId: 'e1', changes: { weight: 5 } },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(false)
    })

    it('modify_edge with type invalidates layout and dependency', () => {
      const result = analyzeChanges([
        { type: 'modify_edge', edgeId: 'e1', changes: { type: 'soft_dependency' } },
      ])
      expect(result.cachesToInvalidate.has('layout')).toBe(true)
      expect(result.cachesToInvalidate.has('dependency')).toBe(true)
    })
  })

  describe('groups, resources, layout', () => {
    it('add_group invalidates layout and search', () => {
      const result = analyzeChanges([
        { type: 'add_group', group: { id: 'g1', label: 'G1' } },
      ])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout', 'search']))
    })

    it('remove_group invalidates layout and search', () => {
      const result = analyzeChanges([{ type: 'remove_group', groupId: 'g1' }])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout', 'search']))
    })

    it('modify_group invalidates layout and search', () => {
      const result = analyzeChanges([
        { type: 'modify_group', groupId: 'g1', changes: { color: '#fff' } },
      ])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout', 'search']))
    })

    it('add_resource invalidates stats only', () => {
      const result = analyzeChanges([
        { type: 'add_resource', resource: { id: 'gold', label: 'Gold' } },
      ])
      expect(result.cachesToInvalidate).toEqual(new Set(['stats']))
    })

    it('modify_layout invalidates layout only', () => {
      const result = analyzeChanges([
        { type: 'modify_layout', changes: { type: 'tree' } },
      ])
      expect(result.cachesToInvalidate).toEqual(new Set(['layout']))
    })
  })

  describe('empty / edge cases', () => {
    it('empty list returns empty analysis', () => {
      const result = analyzeChanges([])
      expect(result.affectedNodes.size).toBe(0)
      expect(result.cachesToInvalidate.size).toBe(0)
      expect(result.internalConflicts).toHaveLength(0)
      expect(result.renames.size).toBe(0)
    })

    it('combines effects of multiple change types', () => {
      const changes: TreeChange[] = [
        { type: 'add_node', node: makeNode('a') },
        { type: 'add_group', group: { id: 'g1', label: 'G1' } },
        { type: 'add_resource', resource: { id: 'xp', label: 'XP' } },
      ]
      const result = analyzeChanges(changes)
      expect(result.affectedNodes.has('a')).toBe(true)
      expect(result.cachesToInvalidate).toEqual(
        new Set(['layout', 'dependency', 'search', 'stats']),
      )
    })
  })
})

describe('ChangeTracker (class)', () => {
  it('analyze delegates to analyzeChanges', () => {
    const tracker = new ChangeTracker()
    const result = tracker.analyze([{ type: 'add_node', node: makeNode('a') }])
    expect(result.affectedNodes.has('a')).toBe(true)
    expect(result.cachesToInvalidate.size).toBeGreaterThan(0)
  })

  it('multiple analyze calls are independent', () => {
    const tracker = new ChangeTracker()
    const a = tracker.analyze([{ type: 'add_node', node: makeNode('x') }])
    const b = tracker.analyze([{ type: 'add_node', node: makeNode('y') }])
    expect(a.affectedNodes.has('x')).toBe(true)
    expect(a.affectedNodes.has('y')).toBe(false)
    expect(b.affectedNodes.has('y')).toBe(true)
    expect(b.affectedNodes.has('x')).toBe(false)
  })
})
// ── FIN: tests de ChangeTracker ──
```

### 5.4 Verificación local

```bash
pnpm lint:fix
pnpm format
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @yggdrasil-forge/core test:coverage
pnpm validate
```

⚠️ **Cobertura esperada en ChangeTracker:** 100%. Todo é lóxica determinística.

### 5.5 Actualizar packages/core/README.md

Engadir despois da sección "StateStore":

```markdown
### ChangeTracker

\`\`\`typescript
import { ChangeTracker, analyzeChanges } from '@yggdrasil-forge/core'

const tracker = new ChangeTracker()
const analysis = tracker.analyze([
  { type: 'add_node', node: { id: 'a', type: 'small', label: 'A' } },
  { type: 'modify_node', nodeId: 'b', changes: { color: '#fff' } },
])

console.info(analysis.affectedNodes)       // Set { 'a', 'b' }
console.info(analysis.cachesToInvalidate)  // Set { 'layout', 'search', ... }
console.info(analysis.internalConflicts)   // []
console.info(analysis.renames)             // Map {}
\`\`\`
```

### 5.6 Engadir changeset

```bash
pnpm changeset
```

- Selecciona `@yggdrasil-forge/core`
- **Minor** (non major)
- Summary: `Add ChangeTracker: pure analyzer of TreeChange[] arrays. Produces selective cache invalidation, affected node IDs, internal conflict detection (duplicates, add_then_remove, rename chains, etc.), and rename mappings.`

### 5.7 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: `ChangeTracker` class + `analyzeChanges` function
  - Pure analysis of `TreeChange[]` (no mutation, no external state access)
  - Selective cache invalidation per change type (layout / dependency / search / stats)
  - Field-aware analysis of `modify_node` and `modify_edge` (only invalidates caches affected by the modified fields)
  - Internal conflict detection: `duplicate_add_node`, `add_then_remove`, `remove_then_modify`, `modify_after_rename`, `rename_chain`, `rename_to_existing`, `duplicate_edge_id`
  - Rename tracking (oldId → newId map)
  - 100% test coverage
```

### 5.8 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add ChangeTracker for selective cache invalidation analysis"
git push origin main
```

Verifica **CI verde**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN** en todos os ficheiros novos.
- **Idioma de comentarios:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar código.
- **Imports relativos con `.js`**, `import type` para tipos.
- **Cero `any`**, cero `console.log`.
- **Acceso por punto** (`.xp`) en propiedades con identificador válido.
- **Evitar heredoc de Git Bash para TypeScript** (usar create_file directo ou script Node).
- **CI verde obrigatorio.**

---

## 7. QUE NON FACER

- ❌ Non aplicar os cambios á TreeDef (iso fai StateStore xa existente).
- ❌ Non reconciliar NodeInstances (Reconciler, sub-fase posterior).
- ❌ Non validar referencias contra estado actual (TreeEngine, 1.14).
- ❌ Non lanzar excepcións — os conflitos van na lista `internalConflicts`.
- ❌ Non integrar ChangeTracker con StateStore (faino TreeEngine cuando exista).
- ❌ Non engadir dependencias externas.

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ `packages/core/src/engine/ChangeTracker.ts` (función `analyzeChanges` + clase `ChangeTracker`)
2. ✅ `packages/core/src/engine/index.ts` actualizado
3. ✅ `packages/core/__tests__/engine/ChangeTracker.test.ts` con cobertura 100%
4. ✅ `packages/core/README.md` actualizado
5. ✅ Changeset minor creado
6. ✅ CHANGELOG raíz actualizado
7. ✅ Build, test, validate pasan
8. ✅ CI verde

Mostra ao autor:
```bash
ls packages/core/src/engine/
pnpm --filter @yggdrasil-forge/core test
pnpm --filter @yggdrasil-forge/core test:coverage
git log --oneline -3
```

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.7 — COMPLETADA
═══════════════════════════════════════

✅ ChangeTracker implementado:
   - analyzeChanges (función pura)
   - ChangeTracker (clase wrapper)
   - Análise selectiva de caches por campo modificado
   - Detección de 7 tipos de conflito interno
   - Tracking de renames

✅ Tests: [N] tests pasan
✅ Cobertura: 100%
✅ Changeset minor creado
✅ CHANGELOG actualizado
✅ CI verde

📁 Path: C:\Users\tajes\proxectos\yggdrasil-forge
🔗 Repo: https://github.com/cancioneschorriscortas-max/yggdrasil-forge
📝 Último commit: [hash + mensaxe]

⚠️ Bloqueos / problemas encontrados:
[Lista, ou "Ningún"]

📊 Decisións do executor:
[Lista, ou "Ningunha"]

📋 Estado:
LISTO PARA PROCEDER Á SUB-FASE 1.8
(UnlockResolver con explain())
```

---

**FIN DO BRIEFING 1.7**
