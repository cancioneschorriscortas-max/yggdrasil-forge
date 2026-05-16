# BRIEFING EXECUTABLE — Sub-fase 1.9
## Yggdrasil Forge: DependencyGraph + CycleDetector

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa
- `@yggdrasil-forge/common` con código real
- `@yggdrasil-forge/core` con:
  - Tipos das 3 ondas (1.2, 1.3, 1.4)
  - EventEmitter + ConcurrencyGuard + utils (1.5)
  - StateStore (1.6)
  - ChangeTracker (1.7)
  - UnlockResolver (1.8) — xa espera unha `DependencyGraphLike` inxectable
- CI verde, 237 tests pasan
- Documento mestre en `docs/architecture/MASTER.md`

**Esta sub-fase implementa o grafo de dependencias e a detección de ciclos.** Faise completo e ben — estas primitivas aliméntana `distance_max`, validación pedagóxica, reconciliación, pathfinding e o futuro Simulator.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.9**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Sección 7** (EdgeDef, EdgeType — os 7 tipos)
- **Sección 12** (UnlockResolver — para entender `DependencyGraphLike`)
- **Sección 1.1.1** completa (restricións de entorno: heredoc, useLiteralKeys, v8+optional chaining, Number.POSITIVE_INFINITY)
- **Sección 1.3.2** (reglas de Biome estritas)

⚠️ **LECCIÓNS CRÍTICAS xa aprendidas (aplica dende o primeiro intento):**
- **NON usar optional chaining encadeado** (`a?.b?.c`) en código que require 100% cobertura. Usar comprobacións explícitas. v8 coverage non as cobre ben.
- **Usar `Number.POSITIVE_INFINITY`**, nunca `Infinity`.
- **Acceso por punto** (`.foo`) en propiedades con identificador válido, non `['foo']`.
- **NON usar heredoc de Git Bash** para ficheiros TypeScript (corrompe xenéricos). Usar create_file directo.
- **`pnpm lint:fix && pnpm format`** antes de cada commit.

---

## 3. OBXECTIVO DESTA SUB-FASE

Implementar dúas clases en `packages/core/src/engine/`:

### 3.1 DependencyGraph

Grafo dirixido construído a partir de `TreeDef.edges`, **configurable por tipo de edge**.

Métodos:
- `distanceBetween(fromId, toId): number` — BFS, número de saltos; `Number.POSITIVE_INFINITY` se non hai camiño. **Implementa `DependencyGraphLike`** (interface que UnlockResolver xa espera).
- `getDependencies(nodeId): string[]` — nodos dos que `nodeId` depende DIRECTAMENTE
- `getDependents(nodeId): string[]` — nodos que dependen DIRECTAMENTE de `nodeId`
- `getAllDependencies(nodeId): Set<string>` — peche transitivo (todo o que `nodeId` necesita, recursivo)
- `getAllDependents(nodeId): Set<string>` — peche transitivo inverso
- `getRoots(): string[]` — nodos sen dependencias (in-degree 0)
- `getLeaves(): string[]` — nodos dos que ninguén depende (out-degree 0)
- `getShortestPath(fromId, toId): string[] | null` — o camiño completo (lista de nodeIds), ou null se non hai
- `hasNode(nodeId): boolean`
- `getNodeIds(): string[]` — todos os nodos do grafo

### 3.2 CycleDetector

Detección de ciclos no grafo (DFS con coloración branco/gris/negro).

Métodos:
- `hasCycle(): boolean` — detección rápida
- `findCycles(): string[][]` — TODOS os ciclos atopados (cada ciclo é unha lista de nodeIds, pechando co primeiro)
- `findCycleContaining(nodeId): string[] | null` — un ciclo que conteña ese nodo, ou null

---

## 4. DECISIÓNS XA TOMADAS

### 4.1 Que edges contan como dependencia

O grafo é **configurable**. Por defecto considera só `dependency`. Opcionalmente pódese incluír `soft_dependency`.

Os tipos `exclusion`, `enhancement`, `path`, `cluster`, `subtree_link` **non son dependencias de desbloqueo** e nunca se inclúen no grafo de dependencias (poderían modelarse noutros grafos no futuro, pero non aquí).

```typescript
interface DependencyGraphOptions {
  /** Tipos de edge que contan como dependencia. Default: ['dependency']. */
  readonly edgeTypes?: readonly EdgeType[]
}
```

### 4.2 Dirección semántica dos edges

Un `EdgeDef` ten `source` e `target`. Decisión de semántica: **un edge `dependency` de A→B significa "B depende de A"** (A é prerrequisito de B; A debe desbloquearse antes ca B).

Polo tanto:
- `getDependencies(B)` inclúe A (B necesita A)
- `getDependents(A)` inclúe B (B depende de A)
- Un **root** é un nodo sen prerrequisitos (ninguén apunta cara a el como dependencia → in-degree 0 na dirección "depende de")
- `distanceBetween(A, B)` = número de saltos seguindo a dirección dos edges dende A ata B

⚠️ Esta decisión é **crítica**. Documéntaa nun comentario destacado na clase.

### 4.3 distanceBetween: dirección

`distanceBetween(fromId, toId)` fai BFS **seguindo a dirección dos edges** (de source a target). É dicir, conta cantos saltos hai para chegar de `fromId` a `toId` percorrendo edges no sentido source→target.

- `distanceBetween(A, A)` = 0 (mesmo nodo)
- Se hai edge A→B: `distanceBetween(A, B)` = 1
- Se A→B→C: `distanceBetween(A, C)` = 2
- Se non hai camiño dirixido: `Number.POSITIVE_INFINITY`
- Se `fromId` ou `toId` non existen no grafo: `Number.POSITIVE_INFINITY`

### 4.4 bidirectional edges

Se `EdgeDef.bidirectional === true`, o edge engádese nos dous sentidos (source→target E target→source). Aplícase tanto para distancias como para dependencias.

### 4.5 Self-loops e duplicados

- Un edge con `source === target` (self-loop) **engádese** ao grafo (é un ciclo trivial; o CycleDetector debe detectalo).
- Edges duplicados (mesmo source/target) non causan erro; o grafo usa estruturas que toleran isto (Set de adxacencia).

### 4.6 Construción inmutable

O DependencyGraph constrúese unha vez no constructor a partir de `nodes: readonly string[]` e `edges: readonly EdgeDef[]`. Non se muta despois. Se a TreeDef cambia, créase un novo DependencyGraph (a invalidación de cache xa o xestiona o StateStore/ChangeTracker).

### 4.7 CycleDetector recibe o DependencyGraph

`CycleDetector` non reconstrúe o grafo: recibe un `DependencyGraph` xa construído no constructor e opera sobre el. Usa unha API mínima do grafo (`getNodeIds`, `getDependents` ou equivalente de adxacencia dirixida).

⚠️ Necesitarás expoñer no DependencyGraph un xeito de iterar a adxacencia dirixida (source→targets). Engade un método `getOutgoing(nodeId): string[]` que devolva os targets directos seguindo a dirección dos edges (distinto de getDependents/getDependencies que teñen semántica "depende de"). Documenta ben a diferenza.

### 4.8 Convencións

- Imports relativos con `.js`, `import type` para tipos
- Cero `any`, cero `console.log`
- Comentarios INICIO/FIN, en castelán
- Cobertura **100%** (algoritmos deterministas, totalmente testables)
- Sen optional chaining encadeado; `Number.POSITIVE_INFINITY`; acceso por punto

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: 79ba574
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 Crear packages/core/src/engine/DependencyGraph.ts

```typescript
// ── INICIO: DependencyGraph ──
// Grafo dirixido de dependencias construído dende TreeDef.edges.
//
// SEMÁNTICA CRÍTICA:
// Un edge `dependency` de A→B significa "B depende de A":
//   - A é prerrequisito de B
//   - A debe desbloquearse antes ca B
// Polo tanto:
//   - getDependencies(B) inclúe A   (B necesita A)
//   - getDependents(A)   inclúe B   (B depende de A)
//   - getOutgoing(A)     inclúe B   (dirección bruta do edge: A→B)
//   - distanceBetween(A, B) = saltos seguindo a dirección source→target

import type { EdgeDef, EdgeType } from '../types/index.js'
import type { DependencyGraphLike } from './UnlockResolver.js'

/**
 * Opcións de construción do DependencyGraph.
 */
export interface DependencyGraphOptions {
  /**
   * Tipos de edge que contan como dependencia.
   * Default: ['dependency'].
   * Pódese engadir 'soft_dependency' para incluír recomendacións.
   * Os tipos exclusion/enhancement/path/cluster/subtree_link nunca son
   * dependencias de desbloqueo.
   */
  readonly edgeTypes?: readonly EdgeType[]
}

/**
 * Grafo dirixido de dependencias.
 *
 * Constrúese unha vez e non se muta. Se a TreeDef cambia, créase un novo.
 *
 * Implementa DependencyGraphLike (consumido por UnlockResolver para
 * a condición distance_max).
 *
 * @example
 * const graph = new DependencyGraph(
 *   ['a', 'b', 'c'],
 *   [
 *     { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
 *     { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
 *   ],
 * )
 * graph.getDependencies('c')   // ['b']
 * graph.getAllDependencies('c') // Set { 'b', 'a' }
 * graph.distanceBetween('a', 'c') // 2
 * graph.getRoots()             // ['a']
 * graph.getLeaves()            // ['c']
 */
export class DependencyGraph implements DependencyGraphLike {
  /** Adxacencia bruta seguindo a dirección dos edges: source → Set<target>. */
  private readonly outgoing = new Map<string, Set<string>>()
  /** Adxacencia inversa: target → Set<source>. */
  private readonly incoming = new Map<string, Set<string>>()
  /** Conxunto de todos os nodeIds coñecidos. */
  private readonly nodes = new Set<string>()

  constructor(
    nodeIds: readonly string[],
    edges: readonly EdgeDef[],
    options?: DependencyGraphOptions,
  ) {
    const allowedTypes = new Set<EdgeType>(options?.edgeTypes ?? ['dependency'])

    for (const id of nodeIds) {
      this.nodes.add(id)
      this.outgoing.set(id, new Set<string>())
      this.incoming.set(id, new Set<string>())
    }

    for (const edge of edges) {
      if (!allowedTypes.has(edge.type)) {
        continue
      }
      this.addDirectedEdge(edge.source, edge.target)
      if (edge.bidirectional === true) {
        this.addDirectedEdge(edge.target, edge.source)
      }
    }
  }

  /**
   * Engade un edge dirixido source→target, creando os nodos se non existían.
   */
  private addDirectedEdge(source: string, target: string): void {
    this.ensureNode(source)
    this.ensureNode(target)
    const out = this.outgoing.get(source)
    if (out !== undefined) {
      out.add(target)
    }
    const inc = this.incoming.get(target)
    if (inc !== undefined) {
      inc.add(source)
    }
  }

  /**
   * Garante que un nodo existe nas estruturas internas.
   */
  private ensureNode(id: string): void {
    if (!this.nodes.has(id)) {
      this.nodes.add(id)
      this.outgoing.set(id, new Set<string>())
      this.incoming.set(id, new Set<string>())
    }
  }

  /**
   * True se o nodo existe no grafo.
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId)
  }

  /**
   * Todos os nodeIds do grafo.
   */
  getNodeIds(): string[] {
    return Array.from(this.nodes)
  }

  /**
   * Targets directos seguindo a dirección bruta do edge (source→target).
   *
   * Distinto de getDependents: getOutgoing devolve a dirección literal do
   * edge; útil para algoritmos de grafo (BFS, ciclos).
   */
  getOutgoing(nodeId: string): string[] {
    const set = this.outgoing.get(nodeId)
    if (set === undefined) {
      return []
    }
    return Array.from(set)
  }

  /**
   * Nodos dos que `nodeId` depende directamente.
   *
   * Se A→B (A prerrequisito de B), entón getDependencies(B) = [A].
   * É a adxacencia inversa.
   */
  getDependencies(nodeId: string): string[] {
    const set = this.incoming.get(nodeId)
    if (set === undefined) {
      return []
    }
    return Array.from(set)
  }

  /**
   * Nodos que dependen directamente de `nodeId`.
   *
   * Se A→B (A prerrequisito de B), entón getDependents(A) = [B].
   * É a adxacencia bruta (igual que getOutgoing, pero nomeada
   * semánticamente para o dominio de dependencias).
   */
  getDependents(nodeId: string): string[] {
    return this.getOutgoing(nodeId)
  }

  /**
   * Peche transitivo: todo o que `nodeId` necesita (directa e indirectamente).
   *
   * Percorre cara atrás (incoming) ata esgotar.
   */
  getAllDependencies(nodeId: string): Set<string> {
    const result = new Set<string>()
    const stack: string[] = [...this.getDependencies(nodeId)]
    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) {
        continue
      }
      if (result.has(current)) {
        continue
      }
      result.add(current)
      for (const dep of this.getDependencies(current)) {
        if (!result.has(dep)) {
          stack.push(dep)
        }
      }
    }
    return result
  }

  /**
   * Peche transitivo inverso: todo o que depende de `nodeId`.
   */
  getAllDependents(nodeId: string): Set<string> {
    const result = new Set<string>()
    const stack: string[] = [...this.getDependents(nodeId)]
    while (stack.length > 0) {
      const current = stack.pop()
      if (current === undefined) {
        continue
      }
      if (result.has(current)) {
        continue
      }
      result.add(current)
      for (const dep of this.getDependents(current)) {
        if (!result.has(dep)) {
          stack.push(dep)
        }
      }
    }
    return result
  }

  /**
   * Nodos raíz: sen dependencias (in-degree 0 na semántica "depende de").
   */
  getRoots(): string[] {
    const roots: string[] = []
    for (const id of this.nodes) {
      const deps = this.incoming.get(id)
      if (deps === undefined || deps.size === 0) {
        roots.push(id)
      }
    }
    return roots
  }

  /**
   * Nodos folla: ninguén depende deles (out-degree 0).
   */
  getLeaves(): string[] {
    const leaves: string[] = []
    for (const id of this.nodes) {
      const out = this.outgoing.get(id)
      if (out === undefined || out.size === 0) {
        leaves.push(id)
      }
    }
    return leaves
  }

  /**
   * Distancia (número de saltos) dende `fromId` ata `toId` seguindo a
   * dirección dos edges (source→target). BFS.
   *
   * - distanceBetween(A, A) = 0
   * - Sen camiño dirixido, ou nodos inexistentes: Number.POSITIVE_INFINITY
   */
  distanceBetween(fromId: string, toId: string): number {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return Number.POSITIVE_INFINITY
    }
    if (fromId === toId) {
      return 0
    }

    const visited = new Set<string>([fromId])
    let frontier: string[] = [fromId]
    let distance = 0

    while (frontier.length > 0) {
      distance++
      const next: string[] = []
      for (const node of frontier) {
        for (const neighbor of this.getOutgoing(node)) {
          if (neighbor === toId) {
            return distance
          }
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            next.push(neighbor)
          }
        }
      }
      frontier = next
    }

    return Number.POSITIVE_INFINITY
  }

  /**
   * Camiño máis curto (lista de nodeIds incluíndo extremos) dende `fromId`
   * ata `toId`, ou null se non hai camiño.
   *
   * BFS con tracking de predecesores.
   */
  getShortestPath(fromId: string, toId: string): string[] | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return null
    }
    if (fromId === toId) {
      return [fromId]
    }

    const visited = new Set<string>([fromId])
    const predecessor = new Map<string, string>()
    let frontier: string[] = [fromId]

    while (frontier.length > 0) {
      const next: string[] = []
      for (const node of frontier) {
        for (const neighbor of this.getOutgoing(node)) {
          if (visited.has(neighbor)) {
            continue
          }
          visited.add(neighbor)
          predecessor.set(neighbor, node)
          if (neighbor === toId) {
            return this.reconstructPath(predecessor, fromId, toId)
          }
          next.push(neighbor)
        }
      }
      frontier = next
    }

    return null
  }

  /**
   * Reconstrúe o camiño dende o mapa de predecesores.
   */
  private reconstructPath(
    predecessor: Map<string, string>,
    fromId: string,
    toId: string,
  ): string[] {
    const path: string[] = [toId]
    let current = toId
    while (current !== fromId) {
      const prev = predecessor.get(current)
      if (prev === undefined) {
        // Non debería ocorrer se chamamos tras atopar toId; defensivo.
        break
      }
      path.push(prev)
      current = prev
    }
    path.reverse()
    return path
  }
}
// ── FIN: DependencyGraph ──
```

### 5.2 Crear packages/core/src/engine/CycleDetector.ts

```typescript
// ── INICIO: CycleDetector ──
// Detección de ciclos nun DependencyGraph mediante DFS con coloración.
//
// Coloración clásica:
//   - branco (non visitado)
//   - gris   (na pila de recursión actual)
//   - negro  (procesado completamente)
// Un back-edge cara a un nodo GRIS indica ciclo.

import type { DependencyGraph } from './DependencyGraph.js'

/**
 * Estados de coloración para o DFS.
 */
const WHITE = 0
const GRAY = 1
const BLACK = 2

/**
 * Detecta ciclos nun grafo de dependencias.
 *
 * Opera sobre un DependencyGraph xa construído (non o reconstrúe).
 *
 * @example
 * const graph = new DependencyGraph(['a', 'b'], [
 *   { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
 *   { id: 'e2', source: 'b', target: 'a', type: 'dependency' },
 * ])
 * const detector = new CycleDetector(graph)
 * detector.hasCycle()      // true
 * detector.findCycles()    // [['a', 'b', 'a']]
 */
export class CycleDetector {
  private readonly graph: DependencyGraph

  constructor(graph: DependencyGraph) {
    this.graph = graph
  }

  /**
   * True se o grafo contén polo menos un ciclo.
   *
   * Para rendemento, para no primeiro ciclo atopado.
   */
  hasCycle(): boolean {
    const color = new Map<string, number>()
    for (const id of this.graph.getNodeIds()) {
      color.set(id, WHITE)
    }

    for (const id of this.graph.getNodeIds()) {
      if (color.get(id) === WHITE) {
        if (this.dfsHasCycle(id, color)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * DFS recursivo que devolve true ao atopar un back-edge.
   */
  private dfsHasCycle(node: string, color: Map<string, number>): boolean {
    color.set(node, GRAY)
    for (const neighbor of this.graph.getOutgoing(node)) {
      const c = color.get(neighbor)
      if (c === GRAY) {
        return true
      }
      if (c === WHITE && this.dfsHasCycle(neighbor, color)) {
        return true
      }
    }
    color.set(node, BLACK)
    return false
  }

  /**
   * Devolve TODOS os ciclos atopados.
   *
   * Cada ciclo represéntase como unha lista de nodeIds que empeza e remata
   * no mesmo nodo (ex: ['a', 'b', 'c', 'a']).
   *
   * Nota: a deduplicación de ciclos equivalentes (mesmo ciclo empezando por
   * outro nodo) faise por normalización (rotar ao menor id e comparar).
   */
  findCycles(): string[][] {
    const color = new Map<string, number>()
    for (const id of this.graph.getNodeIds()) {
      color.set(id, WHITE)
    }

    const cycles: string[][] = []
    const seen = new Set<string>()
    const stack: string[] = []

    const dfs = (node: string): void => {
      color.set(node, GRAY)
      stack.push(node)

      for (const neighbor of this.graph.getOutgoing(node)) {
        const c = color.get(neighbor)
        if (c === GRAY) {
          // Back-edge: extrae o ciclo dende `neighbor` ata o tope da pila.
          const startIndex = stack.indexOf(neighbor)
          if (startIndex !== -1) {
            const cyclePath = stack.slice(startIndex)
            cyclePath.push(neighbor) // pecha o ciclo
            const key = this.normalizeCycleKey(cyclePath)
            if (!seen.has(key)) {
              seen.add(key)
              cycles.push(cyclePath)
            }
          }
        } else if (c === WHITE) {
          dfs(neighbor)
        }
      }

      stack.pop()
      color.set(node, BLACK)
    }

    for (const id of this.graph.getNodeIds()) {
      if (color.get(id) === WHITE) {
        dfs(id)
      }
    }

    return cycles
  }

  /**
   * Devolve un ciclo que conteña `nodeId`, ou null se ese nodo non está
   * en ningún ciclo.
   *
   * Útil para mensaxes de erro pedagóxicas:
   * "O nodo X forma parte deste ciclo de dependencias: X → Y → Z → X".
   */
  findCycleContaining(nodeId: string): string[] | null {
    if (!this.graph.hasNode(nodeId)) {
      return null
    }
    for (const cycle of this.findCycles()) {
      // O ciclo péchase repetindo o primeiro; comprobar nos elementos únicos.
      const unique = cycle.slice(0, -1)
      if (unique.includes(nodeId)) {
        return cycle
      }
    }
    return null
  }

  /**
   * Normaliza un ciclo a unha clave canónica para deduplicar.
   *
   * Rota o ciclo (sen o peche) para que empece polo menor id
   * lexicográfico, e únese. Así ['b','c','a','b'] e ['a','b','c','a']
   * producen a mesma clave.
   */
  private normalizeCycleKey(cycle: string[]): string {
    const core = cycle.slice(0, -1) // quita o peche duplicado
    if (core.length === 0) {
      return ''
    }
    let minIndex = 0
    for (let i = 1; i < core.length; i++) {
      const candidate = core[i]
      const currentMin = core[minIndex]
      if (candidate !== undefined && currentMin !== undefined && candidate < currentMin) {
        minIndex = i
      }
    }
    const rotated = [...core.slice(minIndex), ...core.slice(0, minIndex)]
    return rotated.join('->')
  }
}
// ── FIN: CycleDetector ──
```

### 5.3 Actualizar packages/core/src/engine/index.ts

Engadir os exports novos. O ficheiro completo debe quedar:

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
export {
  UnlockResolver,
  type DependencyGraphLike,
  type UnlockResolverContext,
} from './UnlockResolver.js'
export {
  DependencyGraph,
  type DependencyGraphOptions,
} from './DependencyGraph.js'
export { CycleDetector } from './CycleDetector.js'
// ── FIN: engine public API ──
```

⚠️ Verifica que TODOS os exports previos seguen presentes (engade, non substitúas á cega).

### 5.4 Tests

Crear `packages/core/__tests__/engine/DependencyGraph.test.ts`:

```typescript
// ── INICIO: tests de DependencyGraph ──
import { describe, expect, it } from 'vitest'
import { DependencyGraph } from '../../src/engine/index.js'
import type { EdgeDef } from '../../src/types/index.js'

function edge(
  id: string,
  source: string,
  target: string,
  type: EdgeDef['type'] = 'dependency',
  bidirectional?: boolean,
): EdgeDef {
  return bidirectional === undefined
    ? { id, source, target, type }
    : { id, source, target, type, bidirectional }
}

describe('DependencyGraph', () => {
  describe('construction & edge filtering', () => {
    it('only includes dependency edges by default', () => {
      const g = new DependencyGraph(
        ['a', 'b', 'c'],
        [
          edge('e1', 'a', 'b', 'dependency'),
          edge('e2', 'b', 'c', 'exclusion'),
        ],
      )
      expect(g.getDependents('a')).toEqual(['b'])
      expect(g.getDependents('b')).toEqual([]) // exclusion ignorada
    })

    it('can include soft_dependency when configured', () => {
      const g = new DependencyGraph(
        ['a', 'b', 'c'],
        [
          edge('e1', 'a', 'b', 'dependency'),
          edge('e2', 'b', 'c', 'soft_dependency'),
        ],
        { edgeTypes: ['dependency', 'soft_dependency'] },
      )
      expect(g.getDependents('b')).toEqual(['c'])
    })

    it('ignores enhancement/path/cluster/subtree_link', () => {
      const g = new DependencyGraph(
        ['a', 'b'],
        [
          edge('e1', 'a', 'b', 'enhancement'),
          edge('e2', 'a', 'b', 'path'),
          edge('e3', 'a', 'b', 'cluster'),
          edge('e4', 'a', 'b', 'subtree_link'),
        ],
      )
      expect(g.getDependents('a')).toEqual([])
    })

    it('adds nodes referenced only by edges', () => {
      const g = new DependencyGraph([], [edge('e1', 'x', 'y')])
      expect(g.hasNode('x')).toBe(true)
      expect(g.hasNode('y')).toBe(true)
    })

    it('handles bidirectional edges', () => {
      const g = new DependencyGraph(
        ['a', 'b'],
        [edge('e1', 'a', 'b', 'dependency', true)],
      )
      expect(g.getOutgoing('a')).toEqual(['b'])
      expect(g.getOutgoing('b')).toEqual(['a'])
    })

    it('handles self-loops', () => {
      const g = new DependencyGraph(['a'], [edge('e1', 'a', 'a')])
      expect(g.getOutgoing('a')).toEqual(['a'])
    })
  })

  describe('dependencies / dependents', () => {
    const g = new DependencyGraph(
      ['a', 'b', 'c', 'd'],
      [
        edge('e1', 'a', 'b'),
        edge('e2', 'a', 'c'),
        edge('e3', 'b', 'd'),
        edge('e4', 'c', 'd'),
      ],
    )

    it('getDependencies returns direct prerequisites', () => {
      expect(g.getDependencies('d').sort()).toEqual(['b', 'c'])
      expect(g.getDependencies('b')).toEqual(['a'])
      expect(g.getDependencies('a')).toEqual([])
    })

    it('getDependents returns direct followers', () => {
      expect(g.getDependents('a').sort()).toEqual(['b', 'c'])
      expect(g.getDependents('d')).toEqual([])
    })

    it('getAllDependencies returns transitive closure', () => {
      expect(g.getAllDependencies('d')).toEqual(new Set(['b', 'c', 'a']))
      expect(g.getAllDependencies('a')).toEqual(new Set())
    })

    it('getAllDependents returns transitive closure', () => {
      expect(g.getAllDependents('a')).toEqual(new Set(['b', 'c', 'd']))
      expect(g.getAllDependents('d')).toEqual(new Set())
    })

    it('getDependencies/getDependents return [] for unknown node', () => {
      expect(g.getDependencies('zzz')).toEqual([])
      expect(g.getDependents('zzz')).toEqual([])
    })
  })

  describe('roots & leaves', () => {
    it('identifies roots and leaves', () => {
      const g = new DependencyGraph(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      )
      expect(g.getRoots()).toEqual(['a'])
      expect(g.getLeaves()).toEqual(['c'])
    })

    it('isolated node is both root and leaf', () => {
      const g = new DependencyGraph(['solo'], [])
      expect(g.getRoots()).toContain('solo')
      expect(g.getLeaves()).toContain('solo')
    })

    it('multiple roots and leaves', () => {
      const g = new DependencyGraph(
        ['r1', 'r2', 'mid', 'l1', 'l2'],
        [
          edge('e1', 'r1', 'mid'),
          edge('e2', 'r2', 'mid'),
          edge('e3', 'mid', 'l1'),
          edge('e4', 'mid', 'l2'),
        ],
      )
      expect(g.getRoots().sort()).toEqual(['r1', 'r2'])
      expect(g.getLeaves().sort()).toEqual(['l1', 'l2'])
    })
  })

  describe('distanceBetween', () => {
    const g = new DependencyGraph(
      ['a', 'b', 'c', 'd', 'isolated'],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd')],
    )

    it('distance to self is 0', () => {
      expect(g.distanceBetween('a', 'a')).toBe(0)
    })

    it('adjacent distance is 1', () => {
      expect(g.distanceBetween('a', 'b')).toBe(1)
    })

    it('multi-hop distance', () => {
      expect(g.distanceBetween('a', 'd')).toBe(3)
    })

    it('no directed path is POSITIVE_INFINITY', () => {
      expect(g.distanceBetween('d', 'a')).toBe(Number.POSITIVE_INFINITY)
    })

    it('unknown node is POSITIVE_INFINITY', () => {
      expect(g.distanceBetween('a', 'zzz')).toBe(Number.POSITIVE_INFINITY)
      expect(g.distanceBetween('zzz', 'a')).toBe(Number.POSITIVE_INFINITY)
    })

    it('disconnected node is POSITIVE_INFINITY', () => {
      expect(g.distanceBetween('a', 'isolated')).toBe(Number.POSITIVE_INFINITY)
    })
  })

  describe('getShortestPath', () => {
    const g = new DependencyGraph(
      ['a', 'b', 'c', 'd', 'x'],
      [
        edge('e1', 'a', 'b'),
        edge('e2', 'b', 'c'),
        edge('e3', 'c', 'd'),
        edge('e4', 'a', 'd'),
      ],
    )

    it('path to self is [self]', () => {
      expect(g.getShortestPath('a', 'a')).toEqual(['a'])
    })

    it('finds shortest path (prefers fewer hops)', () => {
      expect(g.getShortestPath('a', 'd')).toEqual(['a', 'd'])
    })

    it('finds multi-hop path', () => {
      expect(g.getShortestPath('b', 'd')).toEqual(['b', 'c', 'd'])
    })

    it('returns null when no path', () => {
      expect(g.getShortestPath('d', 'a')).toBeNull()
    })

    it('returns null for unknown nodes', () => {
      expect(g.getShortestPath('a', 'zzz')).toBeNull()
      expect(g.getShortestPath('zzz', 'a')).toBeNull()
    })

    it('returns null when target unreachable (isolated)', () => {
      expect(g.getShortestPath('a', 'x')).toBeNull()
    })
  })

  describe('getNodeIds / hasNode', () => {
    it('lists all node ids', () => {
      const g = new DependencyGraph(['a', 'b'], [edge('e1', 'b', 'c')])
      expect(g.getNodeIds().sort()).toEqual(['a', 'b', 'c'])
    })

    it('hasNode reflects presence', () => {
      const g = new DependencyGraph(['a'], [])
      expect(g.hasNode('a')).toBe(true)
      expect(g.hasNode('z')).toBe(false)
    })
  })
})
// ── FIN: tests de DependencyGraph ──
```

Crear `packages/core/__tests__/engine/CycleDetector.test.ts`:

```typescript
// ── INICIO: tests de CycleDetector ──
import { describe, expect, it } from 'vitest'
import { CycleDetector, DependencyGraph } from '../../src/engine/index.js'
import type { EdgeDef } from '../../src/types/index.js'

function edge(id: string, source: string, target: string): EdgeDef {
  return { id, source, target, type: 'dependency' }
}

function graphOf(nodeIds: string[], edges: EdgeDef[]): DependencyGraph {
  return new DependencyGraph(nodeIds, edges)
}

describe('CycleDetector', () => {
  describe('hasCycle', () => {
    it('returns false for acyclic graph', () => {
      const g = graphOf(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      )
      expect(new CycleDetector(g).hasCycle()).toBe(false)
    })

    it('returns false for empty graph', () => {
      const g = graphOf([], [])
      expect(new CycleDetector(g).hasCycle()).toBe(false)
    })

    it('detects a simple 2-node cycle', () => {
      const g = graphOf(
        ['a', 'b'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
      )
      expect(new CycleDetector(g).hasCycle()).toBe(true)
    })

    it('detects a self-loop as a cycle', () => {
      const g = graphOf(['a'], [edge('e1', 'a', 'a')])
      expect(new CycleDetector(g).hasCycle()).toBe(true)
    })

    it('detects a longer cycle', () => {
      const g = graphOf(
        ['a', 'b', 'c', 'd'],
        [
          edge('e1', 'a', 'b'),
          edge('e2', 'b', 'c'),
          edge('e3', 'c', 'd'),
          edge('e4', 'd', 'b'),
        ],
      )
      expect(new CycleDetector(g).hasCycle()).toBe(true)
    })

    it('returns false for tree-shaped graph', () => {
      const g = graphOf(
        ['r', 'a', 'b', 'c', 'd'],
        [
          edge('e1', 'r', 'a'),
          edge('e2', 'r', 'b'),
          edge('e3', 'a', 'c'),
          edge('e4', 'a', 'd'),
        ],
      )
      expect(new CycleDetector(g).hasCycle()).toBe(false)
    })
  })

  describe('findCycles', () => {
    it('returns empty array for acyclic graph', () => {
      const g = graphOf(['a', 'b'], [edge('e1', 'a', 'b')])
      expect(new CycleDetector(g).findCycles()).toEqual([])
    })

    it('finds a simple cycle', () => {
      const g = graphOf(
        ['a', 'b'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
      )
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles).toHaveLength(1)
      // Pecha co primeiro nodo
      const c = cycles[0]
      expect(c).toBeDefined()
      if (c !== undefined) {
        expect(c[0]).toBe(c[c.length - 1])
        expect(new Set(c.slice(0, -1))).toEqual(new Set(['a', 'b']))
      }
    })

    it('finds a self-loop cycle', () => {
      const g = graphOf(['a'], [edge('e1', 'a', 'a')])
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles.length).toBeGreaterThanOrEqual(1)
    })

    it('deduplicates equivalent cycles', () => {
      // a→b→c→a é o mesmo ciclo independentemente do nodo de inicio.
      const g = graphOf(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a')],
      )
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles).toHaveLength(1)
    })

    it('finds multiple distinct cycles', () => {
      const g = graphOf(
        ['a', 'b', 'x', 'y'],
        [
          edge('e1', 'a', 'b'),
          edge('e2', 'b', 'a'),
          edge('e3', 'x', 'y'),
          edge('e4', 'y', 'x'),
        ],
      )
      const cycles = new CycleDetector(g).findCycles()
      expect(cycles).toHaveLength(2)
    })
  })

  describe('findCycleContaining', () => {
    it('returns a cycle that includes the node', () => {
      const g = graphOf(
        ['a', 'b', 'c'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'c', 'a')],
      )
      const cycle = new CycleDetector(g).findCycleContaining('b')
      expect(cycle).not.toBeNull()
      if (cycle !== null) {
        expect(cycle.slice(0, -1)).toContain('b')
      }
    })

    it('returns null when node is not in any cycle', () => {
      const g = graphOf(
        ['a', 'b', 'free'],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')],
      )
      expect(new CycleDetector(g).findCycleContaining('free')).toBeNull()
    })

    it('returns null for unknown node', () => {
      const g = graphOf(['a'], [])
      expect(new CycleDetector(g).findCycleContaining('zzz')).toBeNull()
    })
  })
})
// ── FIN: tests de CycleDetector ──
```

### 5.5 Verificación local

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

⚠️ **Cobertura esperada:** **100%** en DependencyGraph e CycleDetector. Son algoritmos deterministas, totalmente testables.

⚠️ Se algunha rama defensiva non se pode cubrir (ex: `prev === undefined` en reconstructPath, que non debería ocorrer tras atopar o target), **NON exportes API interna nin crees débeda**. Déixaa sen cubrir e anótao no reporte (segundo o patrón establecido). O ratio global debe seguir >99%.

### 5.6 Actualizar packages/core/README.md

Engadir despois da sección "UnlockResolver":

```markdown
### DependencyGraph & CycleDetector

\`\`\`typescript
import { DependencyGraph, CycleDetector } from '@yggdrasil-forge/core'

const graph = new DependencyGraph(
  ['a', 'b', 'c'],
  [
    { id: 'e1', source: 'a', target: 'b', type: 'dependency' },
    { id: 'e2', source: 'b', target: 'c', type: 'dependency' },
  ],
)

graph.getDependencies('c')    // ['b']
graph.getAllDependencies('c') // Set { 'b', 'a' }
graph.distanceBetween('a', 'c') // 2
graph.getShortestPath('a', 'c') // ['a', 'b', 'c']
graph.getRoots()              // ['a']

const detector = new CycleDetector(graph)
detector.hasCycle()           // false
detector.findCycles()         // []
detector.findCycleContaining('a') // null
\`\`\`

`DependencyGraph` implements `DependencyGraphLike`, so it can be injected
into `UnlockResolver` for `distance_max` conditions.
```

### 5.7 Engadir changeset

```bash
pnpm changeset
```

- Selecciona `@yggdrasil-forge/core`
- **Minor** (non major)
- Summary: `Add DependencyGraph (configurable by edge type, BFS distances, transitive closures, shortest path, roots/leaves) and CycleDetector (DFS coloring, finds all cycles, cycle-containing-node queries). DependencyGraph implements DependencyGraphLike for UnlockResolver's distance_max.`

### 5.8 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: `DependencyGraph` class
  - Configurable by edge type (default: `dependency`; optionally `soft_dependency`)
  - `getDependencies`, `getDependents` (direct), `getAllDependencies`, `getAllDependents` (transitive closures)
  - `getRoots`, `getLeaves`, `getNodeIds`, `hasNode`, `getOutgoing`
  - `distanceBetween` (BFS, `Number.POSITIVE_INFINITY` if unreachable) — implements `DependencyGraphLike`
  - `getShortestPath` (BFS with predecessor tracking)
  - Handles bidirectional edges, self-loops, isolated nodes, disconnected graphs
- `@yggdrasil-forge/core`: `CycleDetector` class
  - `hasCycle` (fast DFS, short-circuits)
  - `findCycles` (all cycles, deduplicated via canonical rotation key)
  - `findCycleContaining` (cycle including a given node, for pedagogical error messages)
  - 100% test coverage for both
```

### 5.9 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add DependencyGraph and CycleDetector"
git push origin main
```

Verifica **CI verde**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN**, en castelán.
- **`pnpm lint:fix && pnpm format`** antes do commit.
- **Imports relativos con `.js`**, `import type` para tipos.
- **Cero `any`**, cero `console.log`.
- **`Number.POSITIVE_INFINITY`** (nunca `Infinity`).
- **Sen optional chaining encadeado** en código que require cobertura.
- **Acceso por punto** en propiedades con identificador válido.
- **NON heredoc de Git Bash** para TypeScript.
- **CI verde obrigatorio.**

---

## 7. QUE NON FACER

- ❌ Non mutar o grafo tras a construción (é inmutable; recrear se cambia a TreeDef).
- ❌ Non integrar DependencyGraph no TreeEngine aínda (TreeEngine vén en 1.12+).
- ❌ Non incluír edges exclusion/enhancement/path/cluster/subtree_link no grafo de dependencias.
- ❌ Non exportar API interna só para cobertura (lección DT-1).
- ❌ Non engadir dependencias externas.

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ `packages/core/src/engine/DependencyGraph.ts` (implementa DependencyGraphLike)
2. ✅ `packages/core/src/engine/CycleDetector.ts`
3. ✅ `packages/core/src/engine/index.ts` actualizado (todos os exports previos + os novos)
4. ✅ `packages/core/__tests__/engine/DependencyGraph.test.ts`
5. ✅ `packages/core/__tests__/engine/CycleDetector.test.ts`
6. ✅ Cobertura 100% (ou >99% global con ramas defensivas anotadas)
7. ✅ `packages/core/README.md` actualizado
8. ✅ Changeset minor creado
9. ✅ CHANGELOG raíz actualizado
10. ✅ Build, test, validate pasan
11. ✅ CI verde

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
SUB-FASE 1.9 — COMPLETADA
═══════════════════════════════════════

✅ DependencyGraph implementado:
   - Configurable por edge type
   - distanceBetween (BFS) — implementa DependencyGraphLike
   - getDependencies/getDependents (directos)
   - getAllDependencies/getAllDependents (transitivos)
   - getRoots/getLeaves/getShortestPath
   - bidirectional, self-loops, illados, desconexos

✅ CycleDetector implementado:
   - hasCycle (DFS coloración)
   - findCycles (todos, deduplicados)
   - findCycleContaining

✅ Tests: [N] tests pasan ([M] novos)
✅ Cobertura: [100% ou >99% con ramas defensivas anotadas]
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
[Se hai ramas defensivas sen cubrir, indícao]

📋 Estado:
LISTO PARA PROCEDER Á SUB-FASE 1.10
(ResourceManager — xestión de budget, custos, refunds)
```

---

**FIN DO BRIEFING 1.9**
