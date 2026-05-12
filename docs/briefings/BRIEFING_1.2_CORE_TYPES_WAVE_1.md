# BRIEFING EXECUTABLE — Sub-fase 1.2
## Yggdrasil Forge: Tipos fundamentais de @core (1ª onda)

---

## 1. CONTEXTO MÍNIMO

Yggdrasil Forge é un motor de skill trees profesional para a web. Monorepo TypeScript con pnpm + turborepo. Open source MIT.

**Estado actual:**
- Fase 0 (setup) completa, CI verde, 19 paquetes scaffolded
- `@yggdrasil-forge/common` con código real (constantes, locales, i18n, errores)
- `@yggdrasil-forge/core` aínda con só un placeholder
- Documento mestre en `docs/architecture/MASTER.md`

Esta é a **primeira onda de tipos de `@core`**: as estruturas de datos fundamentais do dominio sen aínda lóxica.

---

## 2. QUEN ES TI

Es un chat executor encargado **só desta sub-fase 1.2**. Non improvisas, non preguntas. Ao final, reportas no formato da sección 9.

⚠️ **IMPORTANTE:** Antes de empezar, lee no documento mestre (`docs/architecture/MASTER.md`):
- **Sección 7** completa (tipos fundamentais) — esencial
- **Sección 1.3** (convencións de código)
- **Sección 1.3.2** (reglas de Biome estritas)
- **Sección 5** (decisións arquitectónicas críticas — sobre todo 5.2 NodeDef frozen)

---

## 3. OBXECTIVO DESTA SUB-FASE

Dúas partes:

### Parte A: Correccións pequenas previas (5 min)

Engadir `test:coverage` script aos package.json de `common` e `core`, e actualizar o template `create-package.mjs` para incluílo por defecto en futuros paquetes.

### Parte B: Tipos de @core (1ª onda)

Crear os tipos fundamentais en `packages/core/src/types/`:

1. **`result.ts`** — `Result<T, E>` type + helpers
2. **`content.ts`** — `RichContent`, `NodeContent`
3. **`node.ts`** — `NodeType`, `NodeState`, `NodeDef`, `NodeInstance`, helpers
4. **`edge.ts`** — `EdgeType`, `EdgeDef`, `EdgeStyle`
5. **`tree.ts`** — `TreeDef`, `TreeState`, `StatDef`, `GroupDef`
6. **`index.ts`** — re-exports públicos
7. **`errors.ts`** — adapta YggdrasilError de common para uso en core (re-export tipado)

**NON** crear: `unlock.ts`, `resources.ts`, `i18n.ts`, `events.ts`, `plugin.ts`, `audit.ts`, `changes.ts`, `time.ts`, `stats.ts`, `auth.ts`, `metrics.ts` (vén en 1.3 e 1.4).

**NON** crear lóxica nin clases (TreeEngine, etc. — vén despois).

---

## 4. DECISIÓNS XA TOMADAS

- **NodeDef é frozen.** Object.freeze recursivo. Mutar = substituír por novo NodeDef vía `applyChanges` (sec. 5.2 do mestre).
- **NodeInstance é mutable.** Vive no estado do engine.
- **Result type** é `{ ok: true, value: T } | { ok: false, error: E }`. Helpers `ok()` e `err()`. (sec. 7.1 do mestre)
- **LocalizedString** xa existe en `@yggdrasil-forge/common`. Reúsase, NON se redefine.
- **YggdrasilError** xa existe en common. Reúsase tamén.
- **ErrorCode** xa existe en common.
- **Imports relativos con extensión `.js`** (esixido por NodeNext + ESM).
- **`type` keyword obrigatorio** en exports/imports de tipos (regla `useImportType` de Biome).
- **`readonly` en todos os campos de NodeDef** (para reforzar inmutabilidade a nivel tipo).

---

## 5. TAREFAS A EXECUTAR

### 5.0 Verificar estado de partida

```bash
git status                        # Clean
git log --oneline -3              # Último commit: 1897fbf
pnpm check-env                    # Pasa
pnpm validate                     # Pasa
```

### 5.1 PARTE A — Correccións previas

#### 5.1.1 Engadir test:coverage ao package.json de common

Editar `packages/common/package.json`. No `scripts` block, engadir entre `test:watch` e `typecheck`:

```json
    "test:coverage": "vitest run --coverage",
```

Resultado final do bloque `scripts` debería ser:

```json
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
```

#### 5.1.2 Engadir test:coverage ao package.json de core

Mesmo cambio en `packages/core/package.json`. Engadir a script `test:coverage`.

#### 5.1.3 Actualizar template en scripts/create-package.mjs

Editar `scripts/create-package.mjs`. Buscar a parte onde se define o `scripts` block do package.json xerado (estará nun obxecto chamado `packageJson`). Substituír por:

```javascript
  scripts: {
    build: 'tsup',
    dev: 'tsup --watch',
    test: 'vitest run',
    'test:watch': 'vitest',
    'test:coverage': 'vitest run --coverage',
    typecheck: 'tsc --noEmit',
    clean: 'rm -rf dist .turbo *.tsbuildinfo',
  },
```

#### 5.1.4 Verificar

```bash
pnpm --filter @yggdrasil-forge/common test:coverage   # Debe pasar
pnpm --filter @yggdrasil-forge/core test:coverage     # Debe pasar (1 smoke test)
```

⚠️ **NON facer commit aínda.** Acumúlase coa Parte B.

### 5.2 PARTE B — Tipos fundamentais de @core

#### 5.2.0 Limpar contido placeholder

O `packages/core/src/index.ts` actual ten `greet()` placeholder. Bórralo todo. Tamén borrar o smoke test antigo:

```bash
rm packages/core/__tests__/smoke.test.ts
```

Mantén `packages/core/src/types/` baleiro (xa existe). Aseguras que están eses subdirectorios:

```bash
mkdir -p packages/core/src/types
mkdir -p packages/core/__tests__/types
```

#### 5.2.1 packages/core/src/types/result.ts

```typescript
// ── INICIO: Result type ──
// Tipo Result para operacións que poden fallar.
// Inspirado en Rust: forza ao consumidor a manexar ambos casos.

import type { YggdrasilError } from '@yggdrasil-forge/common'

/**
 * Resultado dunha operación: ou éxito con valor, ou fallo con error.
 *
 * @example
 * async function loadConfig(): Promise<Result<Config>> {
 *   try {
 *     const data = await fs.readFile('config.json', 'utf-8')
 *     return ok(JSON.parse(data))
 *   } catch (cause) {
 *     return err(new YggdrasilError(ErrorCode.STORAGE_READ_FAILED, 'Failed to load', { cause }))
 *   }
 * }
 *
 * const result = await loadConfig()
 * if (!result.ok) {
 *   console.error(result.error.code)
 *   return
 * }
 * useConfig(result.value)
 */
export type Result<T, E = YggdrasilError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/**
 * Constrúe un Result con éxito.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/**
 * Constrúe un Result con fallo.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Type guard: verifica se un Result é exitoso.
 */
export function isOk<T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
  return result.ok
}

/**
 * Type guard: verifica se un Result é un erro.
 */
export function isErr<T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } {
  return !result.ok
}

/**
 * Extrae o valor dun Result exitoso, ou lanza o error se é fallo.
 * Útil en tests ou cando o caller sabe que vai ser ok.
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value
  }
  throw result.error
}

/**
 * Extrae o valor dun Result exitoso, ou devolve un default se é fallo.
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}
// ── FIN: Result type ──
```

#### 5.2.2 packages/core/src/types/content.ts

```typescript
// ── INICIO: Rich content types ──
// Contido enriquecido para tooltips, descricións detalladas e media.

import type { LocalizedString } from '@yggdrasil-forge/common'

/**
 * Contido enriquecido que pode aparecer en tooltips, paneles de detalle,
 * ou en calquera lugar que precise máis que texto plano.
 *
 * O tipo "custom" permite ao consumidor inxectar compoñentes propios.
 */
export type RichContent =
  | { readonly type: 'text'; readonly value: LocalizedString }
  | { readonly type: 'markdown'; readonly value: LocalizedString }
  | { readonly type: 'html'; readonly value: LocalizedString; readonly sanitized?: boolean }
  | {
      readonly type: 'image'
      readonly src: string
      readonly alt?: LocalizedString
      readonly width?: number
      readonly height?: number
    }
  | {
      readonly type: 'video'
      readonly src: string
      readonly poster?: string
      readonly provider?: 'youtube' | 'vimeo' | 'mp4'
    }
  | { readonly type: 'audio'; readonly src: string }
  | {
      readonly type: 'link'
      readonly href: string
      readonly label: LocalizedString
      readonly external?: boolean
    }
  | { readonly type: 'composite'; readonly items: readonly RichContent[] }
  | {
      readonly type: 'custom'
      readonly componentId: string
      readonly props?: Readonly<Record<string, unknown>>
    }

/**
 * Conxunto de contidos asociados a un nodo para distintos contextos de presentación.
 */
export interface NodeContent {
  /** Mostrado en tooltips ao pasar por riba do nodo. */
  readonly tooltip?: RichContent
  /** Mostrado en vista detallada (panel lateral, modal). */
  readonly detail?: RichContent
  /** Vista previa curta (hover rápido). */
  readonly preview?: RichContent
  /** Contido revelado só despois de desbloquear o nodo. */
  readonly unlocked?: RichContent
  /** Texto poético / atmosférico (estilo Oberón). */
  readonly flavor?: LocalizedString
}
// ── FIN: Rich content types ──
```

#### 5.2.3 packages/core/src/types/node.ts

```typescript
// ── INICIO: Node types ──
// Tipos para nodos: definición (frozen) e instancia (mutable).

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { NodeContent } from './content.js'

/**
 * Tipo semántico dun nodo.
 *
 * - `small` — Bonificación menor (estilo PoE small passive)
 * - `notable` — Bonificación significativa
 * - `keystone` — Cambia mecánicas fundamentais (con trade-off)
 * - `mastery` — Desbloqueado tras investir N puntos nun cluster
 * - `ascendancy` — Especialización de clase
 * - `root` — Punto de inicio (coroa en Oberón)
 * - `cluster` — Agrupador visual
 * - `gateway` — Abre/pecha ramas
 * - `milestone` — Marca de progreso (sen efecto mecánico)
 * - `subtree_anchor` — Ancora a outra TreeDef (composición)
 * - `custom` — Definido polo usuario
 */
export type NodeType =
  | 'small'
  | 'notable'
  | 'keystone'
  | 'mastery'
  | 'ascendancy'
  | 'root'
  | 'cluster'
  | 'gateway'
  | 'milestone'
  | 'subtree_anchor'
  | 'custom'

/**
 * Estado actual dun nodo na árbore.
 *
 * - `locked` — Non cumpre prerrequisitos
 * - `unlockable` — Cumpre prerrequisitos, pode desbloquearse
 * - `in_progress` — Parcialmente completado (educativo: 60%)
 * - `unlocked` — Desbloqueado (tier actual > 0)
 * - `maxed` — Todos os rangos completados
 * - `disabled` — Desactivado por exclusión ou regra dinámica
 * - `expired` — Caducou (time-based mechanics)
 */
export type NodeState =
  | 'locked'
  | 'unlockable'
  | 'in_progress'
  | 'unlocked'
  | 'maxed'
  | 'disabled'
  | 'expired'

/**
 * Posición 2D en coordenadas normalizadas (0-1) ou píxeles, segundo contexto.
 */
export interface Position {
  readonly x: number
  readonly y: number
}

/**
 * Definición declarativa dun nodo.
 *
 * **Inmutable:** Object.freeze(). Para modificar, usar `engine.applyChanges()`
 * que substituirá o NodeDef por outro novo (sec. 5.2 do MASTER).
 *
 * Os tipos avanzados (Cost, Effect, UnlockRule, TimeConstraints, StatContribution,
 * ProgressSourceConfig) defínense en módulos posteriores (1.3, 1.4) e referénciaaranse
 * como `unknown` por agora ata que esten dispoñibles, OU mediante tipos placeholder.
 *
 * Para non bloquear a estrutura, usamos placeholders aquí. Reemprazaranse cando
 * cheguen os módulos correspondentes.
 */
export interface NodeDef {
  /** Identificador único do nodo dentro da súa árbore. */
  readonly id: string

  /** Tipo semántico do nodo. */
  readonly type: NodeType

  /** Etiqueta visible para o usuario (localizable). */
  readonly label: LocalizedString

  /** Descrición curta opcional. */
  readonly description?: LocalizedString

  /** Contido enriquecido para tooltips e paneles. */
  readonly content?: NodeContent

  /** Identificador de icona (URL, emoji, etc.). */
  readonly icon?: string

  /** Cor visual asociada ao nodo. */
  readonly color?: string

  /** Rango actual (para multi-tier nodes). */
  readonly tier?: number

  /** Rango máximo (default: 1). */
  readonly maxTier?: number

  /**
   * Custo para desbloquear (1ª tier).
   * Tipo concreto en 1.3 (resources.ts). Por agora: array de placeholder.
   */
  readonly cost?: readonly unknown[]

  /**
   * Custos escalados por tier (índice = tier - 1).
   * Tipo concreto en 1.3.
   */
  readonly costPerTier?: readonly (readonly unknown[])[]

  /**
   * Efectos ao desbloquear (Effects DSL).
   * Tipo concreto en 1.4 (effects.ts).
   */
  readonly effects?: readonly unknown[]

  /**
   * Regra de desbloqueo (prerrequisitos).
   * Tipo concreto en 1.3 (unlock.ts).
   */
  readonly prerequisites?: unknown

  /** IDs de nodos mutuamente excluíntes con este. */
  readonly exclusions?: readonly string[]

  /** Tags arbitrarias para filtrado, busca, agrupación. */
  readonly tags?: readonly string[]

  /** Palabras clave adicionais para busca (non visibles ao usuario). */
  readonly searchKeywords?: readonly string[]

  /** Metadata libre para o usuario. */
  readonly metadata?: Readonly<Record<string, unknown>>

  /** Posición no layout (manual ou calculada). */
  readonly position?: Position

  /** ID do grupo/cluster ao que pertence. */
  readonly group?: string

  /** Permite estado intermedio "in_progress" con porcentaxe. */
  readonly supportsProgress?: boolean

  /** Milestones de progreso (% como [25, 50, 75, 100]). */
  readonly progressMilestones?: readonly number[]

  /**
   * Configuración de fonte externa de progreso.
   * Tipo concreto en 1.4 (progress.ts).
   */
  readonly progressSource?: unknown

  /** ID da sub-árbore que se abre dende este nodo. */
  readonly subtreeId?: string

  /**
   * Overrides locais aplicados á sub-árbore ancorada.
   * Tipo concreto cando TreeDef estea totalmente definido (este módulo).
   */
  readonly subtreeOverrides?: unknown

  /**
   * Restricións temporais (caducidade, cooldown, etc.).
   * Tipo concreto en 1.4 (time.ts).
   */
  readonly timeConstraints?: unknown

  /**
   * Contribucións a stats globais (StatComputer).
   * Tipo concreto en 1.4 (stats.ts).
   */
  readonly statContributions?: readonly unknown[]
}

/**
 * Instancia mutable dun nodo no estado activo do motor.
 *
 * Difire de NodeDef en que se actualiza con accións do usuario
 * (unlock, lock, setProgress) e contén estado runtime.
 */
export interface NodeInstance {
  /** Referencia ao NodeDef.id. */
  id: string
  /** Estado actual do nodo. */
  state: NodeState
  /** Tier actualmente desbloqueado (0 = locked, n = nivel n). */
  currentTier: number
  /** Porcentaxe de progreso (0-100), só se supportsProgress=true. */
  progress?: number
  /** Timestamp UTC de desbloqueo. */
  unlockedAt?: number
  /** Identificador de quen desbloqueou (multiplayer/multi-tenant). */
  unlockedBy?: string
  /** Timestamp UTC de caducidade efectiva. */
  expiresAt?: number
  /** Histórico de cambios de estado (audit local). */
  history?: StateChange[]
  /**
   * Estado da sub-árbore aniñada se o nodo é subtree_anchor.
   * Referencia circular: TreeState → NodeInstance → TreeState.
   */
  subtreeState?: unknown // Tipo concreto en tree.ts (este módulo)
}

/**
 * Evento de cambio de estado para o histórico do nodo.
 */
export interface StateChange {
  readonly from: NodeState
  readonly to: NodeState
  readonly timestamp: number
  /** Causa do cambio: 'manual', 'cascade', 'respec', 'expired', etc. */
  readonly reason?: string
}

/**
 * Conxela un NodeDef recursivamente e devólveo tipado.
 *
 * Os arrays e obxectos aniñados tamén se conxelan para previr mutación accidental.
 *
 * @example
 * const node = freezeNodeDef({ id: 'x', type: 'small', label: 'X' })
 * // node está frozen; intentar mutar lanza TypeError en strict mode
 */
export function freezeNodeDef(def: NodeDef): NodeDef {
  return deepFreeze(def)
}

/**
 * Conxela recursivamente un valor. Implementación interna.
 *
 * Non se exporta — os consumidores deben usar `freezeNodeDef` ou outras
 * funcións dedicadas.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Object.isFrozen(value)) {
    return value
  }

  Object.freeze(value)

  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key]
    if (child !== null && typeof child === 'object') {
      deepFreeze(child)
    }
  }

  return value
}
// ── FIN: Node types ──
```

#### 5.2.4 packages/core/src/types/edge.ts

```typescript
// ── INICIO: Edge types ──
// Conexións entre nodos: dependencias, exclusións, camiños visuais.

import type { LocalizedString } from '@yggdrasil-forge/common'

/**
 * Tipo semántico dunha conexión.
 *
 * - `dependency` — A require B (B debe estar desbloqueado para que A o sexa)
 * - `soft_dependency` — A recomenda B (informativo, non obrigatorio)
 * - `exclusion` — A e B son mutuamente excluíntes
 * - `enhancement` — A potencia B se ambos están desbloqueados
 * - `path` — Camiño visual sen semántica de dependencia
 * - `cluster` — Pertenza a un cluster (agrupación visual)
 * - `subtree_link` — Conexión a un nodo dentro dunha sub-árbore
 */
export type EdgeType =
  | 'dependency'
  | 'soft_dependency'
  | 'exclusion'
  | 'enhancement'
  | 'path'
  | 'cluster'
  | 'subtree_link'

/**
 * Estilo visual dunha conexión (renderizado).
 */
export interface EdgeStyle {
  readonly color?: string
  readonly width?: number
  /** Patrón de trazo: [5, 3] = 5px liña, 3px oco. */
  readonly dashPattern?: readonly number[]
  /** Aplicar efecto glow. */
  readonly glow?: boolean
  /** Liña animada (partículas, pulso). */
  readonly animated?: boolean
}

/**
 * Definición dunha conexión entre dous nodos.
 *
 * **Inmutable** (igual que NodeDef).
 */
export interface EdgeDef {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: EdgeType
  /** Aplicable nos dous sentidos (defecto: false). */
  readonly bidirectional?: boolean
  /** Etiqueta opcional sobre a conexión. */
  readonly label?: LocalizedString
  /** Peso/distancia para pathfinding (Dijkstra). */
  readonly weight?: number
  /** Estilo visual override. */
  readonly style?: EdgeStyle
}
// ── FIN: Edge types ──
```

#### 5.2.5 packages/core/src/types/tree.ts

```typescript
// ── INICIO: Tree types ──
// Definición global da árbore e estado runtime asociado.

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { EdgeDef } from './edge.js'
import type { NodeDef, NodeInstance, Position } from './node.js'

/**
 * Definición visual e funcional dun grupo / cluster de nodos.
 */
export interface GroupDef {
  readonly id: string
  readonly label: LocalizedString
  readonly color?: string
  readonly icon?: string
  /** IDs de nodos explícitos no grupo (alternativa a node.group). */
  readonly nodeIds?: readonly string[]
  readonly position?: Position
}

/**
 * Definición dun stat (variable global agregada polo StatComputer).
 *
 * O motor mantén un Record<statId, number> con o valor actual calculado
 * a partir das StatContributions dos nodos desbloqueados.
 */
export interface StatDef {
  readonly id: string
  readonly label: LocalizedString
  /** Valor inicial cando ningún nodo contribúe. */
  readonly initial?: number
  /** Tope mínimo. */
  readonly min?: number
  /** Tope máximo. */
  readonly max?: number
  /** Formato preferido de presentación. */
  readonly format?: 'number' | 'percent' | 'currency'
}

/**
 * Configuración do layout para a árbore.
 *
 * O tipo concreto desenrolarase en 1.4. Por agora un placeholder estructurado.
 */
export interface LayoutConfig {
  readonly type: string // 'radial' | 'tree' | 'constellation' | 'grid' | 'web' | 'linear' | 'sphere_grid' | 'custom'
  /** Resto de campos específicos do layout type. */
  readonly [key: string]: unknown
}

/**
 * Definición declarativa completa dunha árbore.
 *
 * **Mutable a nivel motor:** `engine.applyChanges()` substitúe campos.
 * **Inmutable como input:** se se pasa unha TreeDef ao constructor de TreeEngine,
 * o motor non a muta directamente — fai unha copia interna e cambia esa.
 */
export interface TreeDef {
  readonly id: string
  /** Versión do esquema (sec. SCHEMA_VERSION de common). */
  readonly schemaVersion: string
  /** Versión do contido (semver libre, definido polo autor). */
  readonly version: string
  readonly label: LocalizedString
  readonly description?: LocalizedString
  readonly author?: string
  /** ID do nodo raíz (coroa, punto de entrada). */
  readonly rootNodeId?: string
  readonly nodes: readonly NodeDef[]
  readonly edges: readonly EdgeDef[]
  readonly groups?: readonly GroupDef[]
  /**
   * Recursos da economía da árbore.
   * Tipo concreto en 1.3 (resources.ts).
   */
  readonly resources?: readonly unknown[]
  readonly stats?: readonly StatDef[]
  /**
   * Presuposto inicial de recursos.
   * Tipo concreto en 1.3.
   */
  readonly startingBudget?: unknown
  readonly layout: LayoutConfig
  /** ID do tema visual. */
  readonly theme?: string
  /**
   * Configuración de i18n específica desta árbore.
   * Tipo concreto en 1.3 (i18n.ts engadirá I18nConfig en core).
   */
  readonly i18n?: unknown
  readonly metadata?: Readonly<Record<string, unknown>>
  /** Sub-árbores aniñadas, indexadas por id. */
  readonly subtrees?: Readonly<Record<string, TreeDef>>
}

/**
 * Estado runtime da árbore: instancias de nodos, budget actual, stats calculados.
 *
 * O motor mantén isto en memoria e persísteo via StorageAdapter.
 */
export interface TreeState {
  /** Mapa de nodeId → instancia con estado actual. */
  nodes: Record<string, NodeInstance>
  /**
   * Presuposto actual (recursos restantes).
   * Tipo concreto en 1.3.
   */
  budget: unknown
  /** Stats calculados polo StatComputer (cache reactivo). */
  computedStats?: Record<string, number>
  /** Metadata runtime libre. */
  metadata?: Record<string, unknown>
  /** Estado das sub-árbores aniñadas, indexado por subtreeId. */
  subtreeStates?: Record<string, TreeState>
}
// ── FIN: Tree types ──
```

#### 5.2.6 packages/core/src/types/errors.ts

Este ficheiro **non define nada novo**: só re-exporta o que core necesita de common para que os módulos internos non teñan que importar de dous sitios.

```typescript
// ── INICIO: Errors re-export ──
// Re-exporta as utilidades de error de common para uso interno en core.
// Os consumidores externos deben importar directamente de @yggdrasil-forge/common.

export {
  ErrorCode,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from '@yggdrasil-forge/common'
// ── FIN: Errors re-export ──
```

#### 5.2.7 packages/core/src/types/index.ts

```typescript
// ── INICIO: types public API ──
// Tipos públicos do paquete @yggdrasil-forge/core.
// Esta é a 1ª onda (sub-fase 1.2). As ondas seguintes engadirán:
// - unlock, resources, i18n, events, plugin (1.3)
// - audit, changes, time, stats, auth, metrics (1.4)

// Result
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './result.js'

// Content
export type { RichContent, NodeContent } from './content.js'

// Node
export type {
  NodeType,
  NodeState,
  NodeDef,
  NodeInstance,
  StateChange,
  Position,
} from './node.js'
export { freezeNodeDef } from './node.js'

// Edge
export type { EdgeType, EdgeDef, EdgeStyle } from './edge.js'

// Tree
export type { TreeDef, TreeState, GroupDef, StatDef, LayoutConfig } from './tree.js'

// Errors (re-export from common)
export {
  ErrorCode,
  type SerializedError,
  type YggdrasilErrorOptions,
  YggdrasilError,
  isYggdrasilError,
  getErrorMessage,
} from './errors.js'
// ── FIN: types public API ──
```

#### 5.2.8 packages/core/src/index.ts

Substituír o contido (que tiña `greet()`) por:

```typescript
// ── INICIO: @yggdrasil-forge/core public API ──
// Motor principal de Yggdrasil Forge.
// Actualmente expón só tipos. As clases (TreeEngine, etc.) engadiranse
// nas sub-fases 1.5+.

/**
 * Versión actual de @yggdrasil-forge/core.
 */
export const VERSION = '0.0.0'

// Tipos públicos (re-exports completos de ./types)
export * from './types/index.js'
// ── FIN: @yggdrasil-forge/core public API ──
```

### 5.3 Tests dos tipos

Crear tests para os ficheiros que conteñen lóxica real (result, node con freezeNodeDef). Edge, tree, content son tipos puros sen función — non requiren tests directos, pero faremos un "type check test" sinxelo para garantir que se exportan.

#### 5.3.1 packages/core/__tests__/types/result.test.ts

```typescript
// ── INICIO: tests de Result ──
import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok, unwrap, unwrapOr } from '../../src/types/index.js'

describe('Result helpers', () => {
  describe('ok', () => {
    it('builds a success result', () => {
      const r = ok(42)
      expect(r.ok).toBe(true)
      expect(r.value).toBe(42)
    })

    it('builds with complex values', () => {
      const r = ok({ name: 'foo', tags: ['a', 'b'] })
      expect(r.ok).toBe(true)
      expect(r.value.name).toBe('foo')
    })
  })

  describe('err', () => {
    it('builds a failure result', () => {
      const e = new Error('boom')
      const r = err(e)
      expect(r.ok).toBe(false)
      expect(r.error).toBe(e)
    })
  })

  describe('isOk / isErr', () => {
    it('distinguishes ok and err', () => {
      const success = ok(1)
      const failure = err(new Error('x'))
      expect(isOk(success)).toBe(true)
      expect(isOk(failure)).toBe(false)
      expect(isErr(success)).toBe(false)
      expect(isErr(failure)).toBe(true)
    })
  })

  describe('unwrap', () => {
    it('returns value on ok', () => {
      expect(unwrap(ok('hello'))).toBe('hello')
    })

    it('throws error on err', () => {
      const e = new Error('boom')
      expect(() => unwrap(err(e))).toThrow('boom')
    })
  })

  describe('unwrapOr', () => {
    it('returns value on ok', () => {
      expect(unwrapOr(ok(10), 0)).toBe(10)
    })

    it('returns fallback on err', () => {
      expect(unwrapOr(err(new Error('x')), 99)).toBe(99)
    })
  })
})
// ── FIN: tests de Result ──
```

#### 5.3.2 packages/core/__tests__/types/node.test.ts

```typescript
// ── INICIO: tests de Node ──
import { describe, expect, it } from 'vitest'
import { freezeNodeDef, type NodeDef } from '../../src/types/index.js'

describe('freezeNodeDef', () => {
  it('freezes a basic node', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: 'X',
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen)).toBe(true)
  })

  it('freezes nested arrays', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: 'X',
      tags: ['a', 'b', 'c'],
      exclusions: ['y', 'z'],
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen.tags)).toBe(true)
    expect(Object.isFrozen(frozen.exclusions)).toBe(true)
  })

  it('freezes nested objects', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: 'X',
      position: { x: 0.5, y: 0.5 },
      metadata: { autor: 'agarfal', centro: 'IES' },
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen.position)).toBe(true)
    expect(Object.isFrozen(frozen.metadata)).toBe(true)
  })

  it('handles already frozen objects', () => {
    const node: NodeDef = Object.freeze({
      id: 'x',
      type: 'small',
      label: 'X',
    })
    const frozen = freezeNodeDef(node)
    expect(frozen).toBe(node) // Same reference
    expect(Object.isFrozen(frozen)).toBe(true)
  })

  it('freezes LocalizedString objects', () => {
    const node: NodeDef = {
      id: 'x',
      type: 'small',
      label: { gl: 'Ola', es: 'Hola', en: 'Hello' },
    }
    const frozen = freezeNodeDef(node)
    expect(Object.isFrozen(frozen.label)).toBe(true)
  })

  it('preserves all node fields', () => {
    const node: NodeDef = {
      id: 'panadeiro_forno',
      type: 'cluster',
      label: { gl: 'Forno', es: 'Horno', en: 'Oven' },
      icon: '🔥',
      color: '#e8a547',
      tier: 0,
      maxTier: 5,
      tags: ['cocina'],
      position: { x: 0.5, y: 0.18 },
    }
    const frozen = freezeNodeDef(node)
    expect(frozen.id).toBe('panadeiro_forno')
    expect(frozen.type).toBe('cluster')
    expect(frozen.tier).toBe(0)
    expect(frozen.maxTier).toBe(5)
  })
})
// ── FIN: tests de Node ──
```

#### 5.3.3 packages/core/__tests__/types/exports.test.ts

Un test "tipo sanity check" que garante que os tipos están exportados (verificación a nivel de runtime do que se pode importar).

```typescript
// ── INICIO: tests de exports ──
// Verifica que os tipos públicos exportan o que esperamos.
// Os tipos puros non se poden probar en runtime — só verificamos que
// as funcións/constantes existen.

import { describe, expect, it } from 'vitest'
import * as core from '../../src/index.js'

describe('@yggdrasil-forge/core public exports', () => {
  it('exports VERSION', () => {
    expect(core.VERSION).toBe('0.0.0')
  })

  it('exports Result helpers', () => {
    expect(typeof core.ok).toBe('function')
    expect(typeof core.err).toBe('function')
    expect(typeof core.isOk).toBe('function')
    expect(typeof core.isErr).toBe('function')
    expect(typeof core.unwrap).toBe('function')
    expect(typeof core.unwrapOr).toBe('function')
  })

  it('exports freezeNodeDef', () => {
    expect(typeof core.freezeNodeDef).toBe('function')
  })

  it('re-exports error utilities from common', () => {
    expect(core.ErrorCode).toBeDefined()
    expect(typeof core.YggdrasilError).toBe('function') // class
    expect(typeof core.isYggdrasilError).toBe('function')
    expect(typeof core.getErrorMessage).toBe('function')
  })
})
// ── FIN: tests de exports ──
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
pnpm test:coverage --filter=@yggdrasil-forge/core
pnpm validate
```

⚠️ **Cobertura esperada en core:** 100% nas funcións con lóxica (result.ts, node.ts freezeNodeDef). Os ficheiros puramente declarativos (edge, tree, content, errors re-export) non contan para cobertura porque non teñen executable code.

### 5.5 Actualizar packages/core/README.md

```markdown
# @yggdrasil-forge/core

The core engine of Yggdrasil Forge — a comprehensive skill tree engine for the web.

## Status

🚧 **Early development.** Public API not yet stable.

Currently exports type definitions only. Engine classes (TreeEngine, UnlockResolver,
etc.) will be added in upcoming sub-phases.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/core
\`\`\`

## What's available

### Result type

\`\`\`typescript
import { ok, err, type Result } from '@yggdrasil-forge/core'
\`\`\`

### Node and Tree types

\`\`\`typescript
import type {
  NodeDef,
  NodeInstance,
  NodeType,
  NodeState,
  EdgeDef,
  TreeDef,
  TreeState,
} from '@yggdrasil-forge/core'
\`\`\`

### Content types

\`\`\`typescript
import type { RichContent, NodeContent } from '@yggdrasil-forge/core'
\`\`\`

### Errors (re-exported from common)

\`\`\`typescript
import {
  ErrorCode,
  YggdrasilError,
  getErrorMessage,
} from '@yggdrasil-forge/core'
\`\`\`

## Documentation

See the [master architecture document](../../docs/architecture/MASTER.md).

## License

MIT
```

### 5.6 Engadir changeset

```bash
pnpm changeset
```

Responder:
- Selecciona `@yggdrasil-forge/core` (espazo + Enter)
- Major? Non
- Minor? Si para core
- Summary: `Add foundational types: Result, NodeDef, EdgeDef, TreeDef, RichContent. Re-export error utilities from common.`

### 5.7 Actualizar CHANGELOG.md raíz

Engadir á sección "[Unreleased]":

```markdown
### Added
- `@yggdrasil-forge/core`: foundational type definitions
  - `Result<T, E>` with helpers (`ok`, `err`, `isOk`, `isErr`, `unwrap`, `unwrapOr`)
  - `NodeDef`, `NodeInstance`, `NodeType`, `NodeState`, `Position`, `StateChange`
  - `freezeNodeDef(def)` for recursive Object.freeze of node definitions
  - `EdgeDef`, `EdgeType`, `EdgeStyle`
  - `TreeDef`, `TreeState`, `GroupDef`, `StatDef`, `LayoutConfig`
  - `RichContent`, `NodeContent`
  - Re-exports of `ErrorCode`, `YggdrasilError`, `isYggdrasilError`, `getErrorMessage` from `@yggdrasil-forge/common`
- `test:coverage` script in package.json template (and in `common` + `core` retroactively)

### Changed
- `scripts/create-package.mjs` now includes `test:coverage` in scaffolded packages
```

### 5.8 Commit e push

```bash
git add .
git status
git commit -m "feat(core): add foundational types (Result, Node, Edge, Tree, RichContent)"
git push origin main
```

Verifica **CI verde**. Se falla, **detente e reporta**.

---

## 6. CONVENCIÓNS OBRIGATORIAS

- **Comentarios INICIO/FIN:** en todos os ficheiros novos.
- **Idioma de comentarios:** castelán.
- **`pnpm lint:fix && pnpm format`** despois de pegar código.
- **Imports relativos con `.js`** (NodeNext ESM).
- **`import type` para tipos**, `import` para valores.
- **Cero `any`**, cero `console.log`.
- **`readonly` en todos os campos de tipos inmutables.**

---

## 7. QUE NON FACER

- ❌ Non crear `unlock.ts`, `resources.ts`, `i18n.ts`, `events.ts`, `plugin.ts` (vén en 1.3).
- ❌ Non crear `audit.ts`, `changes.ts`, `time.ts`, `stats.ts`, `auth.ts`, `metrics.ts` (vén en 1.4).
- ❌ Non crear clases (TreeEngine, etc.).
- ❌ Non engadir lóxica de unlock, layout, ou validación.
- ❌ Non definir tipos exactos para campos marcados como `unknown` (chegará nas seguintes ondas).
- ❌ Non publicar nada en npm.
- ❌ Non instalar dependencias adicionais.

---

## 8. QUE ENTREGAR AO FINAL

1. ✅ `test:coverage` script engadido a `common`, `core` e ao template `create-package.mjs`
2. ✅ `packages/core/src/types/result.ts` con Result + 6 helpers
3. ✅ `packages/core/src/types/content.ts` con RichContent + NodeContent
4. ✅ `packages/core/src/types/node.ts` con NodeType, NodeState, NodeDef, NodeInstance, StateChange, Position, freezeNodeDef
5. ✅ `packages/core/src/types/edge.ts` con EdgeType, EdgeStyle, EdgeDef
6. ✅ `packages/core/src/types/tree.ts` con TreeDef, TreeState, GroupDef, StatDef, LayoutConfig
7. ✅ `packages/core/src/types/errors.ts` re-exporta de common
8. ✅ `packages/core/src/types/index.ts` con public API
9. ✅ `packages/core/src/index.ts` actualizado (sen `greet()`)
10. ✅ 3 ficheiros de tests (result, node, exports)
11. ✅ Cobertura de funcións con lóxica = 100%
12. ✅ `packages/core/README.md` actualizado
13. ✅ Changeset creado
14. ✅ CHANGELOG raíz actualizado
15. ✅ Build pasa
16. ✅ Validate pasa
17. ✅ CI verde

Mostra ao autor:
```bash
ls packages/core/src/types/
ls packages/core/__tests__/types/
pnpm --filter @yggdrasil-forge/core test
pnpm --filter @yggdrasil-forge/core test:coverage
git log --oneline -3
```

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.2 — COMPLETADA
═══════════════════════════════════════

✅ test:coverage engadido a common, core e template
✅ Tipos fundamentais de @core creados (1ª onda):
   - Result<T, E> + 6 helpers
   - NodeDef (frozen-friendly), NodeInstance, freezeNodeDef
   - EdgeDef, EdgeType, EdgeStyle
   - TreeDef, TreeState, GroupDef, StatDef, LayoutConfig
   - RichContent, NodeContent
   - Re-exports de errores desde common

✅ Tests: [N] tests pasan
✅ Cobertura nas funcións con lóxica: 100%
✅ Changeset creado
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
LISTO PARA PROCEDER Á SUB-FASE 1.3
(tipos: unlock, resources, i18n, events, plugin)
```

---

**FIN DO BRIEFING 1.2**
