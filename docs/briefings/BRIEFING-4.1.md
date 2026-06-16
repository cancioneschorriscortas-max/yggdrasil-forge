# BRIEFING — SUB-FASE 4.1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Primeira sub-fase da Fase 4 (Layout Engine).** Crear interface
> `LayoutEngine`, registry, función `computeLayout`, tipos
> `LayoutResult`/`EdgePath`/`Bounds`, e implementación trivial
> `IdentityLayout`. Cero implementación de layouts complexos
> (radial/tree/custom avanzado; vén en 4.2-4.4).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2
e 3.6.a L1**: calquera modificación fóra de §6 require **ESCALAR ANTES
DE APLICAR**. Calquera ampliación de comportamento non listada
require **escalar ou reportar transparentemente en ⚠️ Limitacións**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 4.1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 4.1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **4.1** de Yggdrasil Forge. **Primeira da Fase 4** (Layout
Engine). Establecemos o contrato + infraestrutura mínima para que
sub-fases posteriores (4.2 RadialLayout, 4.3 TreeLayout, 4.4
CustomLayout) implementen layouts concretos sen necesidade de cambiar
a base.

**Cinco pezas + 1 ampliación**:

1. `LayoutEngine` interface.
2. `LayoutEngineRegistry` clase.
3. `IdentityLayout` clase (implementación trivial registrada como
   `type: 'custom'`).
4. `LayoutResult`, `EdgePath`, `Bounds` tipos.
5. `computeLayout` función pública.
6. **Ampliación de `LayoutConfig`** existente: tighten parcial con
   `BaseLayoutConfig`.

---

## 2. CONTEXTO MÍNIMO

§20 do MASTER lista 8 tipos de layout pero **non prescribe spec
técnico**. Toda a decisión arquitectónica é nova; ver §5 deste
briefing.

A sub-fase 4.1 **non integra computeLayout no TreeEngine** (cache de
LayoutResult). Iso é decisión futura.

A 4.1 **non implementa** layouts matemáticos (radial polígonos, tree
hierarchies, etc.). **Só establece a base**. IdentityLayout é
implementación trivial: copia `NodeDef.position` se existe, senón
`(0,0)`.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `835fd24` (peche oficial Fase 3).
- 997 tests core + 60 common + 171 storage = ~1228 monorepo limpo.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`LayoutConfig` existe en `packages/core/src/types/tree.ts:48`**
  como placeholder loose:
  ```ts
  export interface LayoutConfig {
    readonly type: string
    readonly [key: string]: unknown
  }
  ```
  **Esta sub-fase ampliao** (5.4).
- **`Position { readonly x: number; readonly y: number }`** existe
  en `packages/core/src/types/node.ts`.
- **`NodeDef.position?: Position`** xa definido (placeholder).
- **`TreeDef.layout: LayoutConfig`** xa definido (obrigatorio).
- **`EdgeDef`** existe en core types; verifica forma exacta en T0
  (probablemente `{id, source, target, ...}`).
- **`Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`, `Locale`,
  `getErrorMessage`** dispoñibles en `@yggdrasil-forge/common`.
- DT-9, DT-11, DT-12, DT-14 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/layouts/` con interface
`LayoutEngine`, clase `LayoutEngineRegistry`, función pública
`computeLayout(treeDef, registry, locale?)`, tipos `LayoutResult`,
`EdgePath`, `Bounds`, e clase `IdentityLayout` (trivial, type='custom'),
ampliar lixeiramente `LayoutConfig` cunha `BaseLayoutConfig` común
sen romper TreeDefs existentes, exportar publicamente desde core,
engadir 2 ErrorCodes da familia YGG_L con mensaxes nas 3 locales, e
cubrir con tests funcionais.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — LayoutEngine vive en `core`

`packages/core/src/engine/layouts/` (paralelo a `engine/migrations/`,
`engine/reconciler/`).

**NON crear paquete novo** `@yggdrasil-forge/layouts`. Razóns:
1. LayoutEngine require TreeDef/NodeDef/EdgeDef de core; vivir en
   paquete dependente xeraría risco de ciclo cando se integre no
   InternalState cache (futuro).
2. Coherencia coas pezas Fase 3.
3. Tree-shaking lograrase con **subpath exports** cando os layouts
   concretos (4.2-4.4) sexan grandes. **Decisión para 4.2**, cero
   acción en 4.1.

### 5.2 — Estrutura de ficheiros

```
packages/core/src/engine/layouts/
├── LayoutEngine.ts        ← interface
├── LayoutEngineRegistry.ts ← clase Registry
├── LayoutResult.ts        ← tipos LayoutResult, EdgePath, Bounds
├── IdentityLayout.ts      ← clase trivial
└── computeLayout.ts       ← función pública
```

Cinco ficheiros. **Cero subdirectorios** dentro de `layouts/`.

### 5.3 — LayoutEngine interface

`LayoutEngine.ts`:

```ts
// ── INICIO: LayoutEngine interface ──
import type { Result } from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { LayoutResult } from './LayoutResult.js'

/**
 * Contrato común para todos os layouts.
 *
 * Un LayoutEngine é stateless e puro: dado un TreeDef devolve un
 * LayoutResult con posicións concretas para nodos, paths para edges,
 * e bounds da caixa contedora. Cero efectos secundarios.
 *
 * Cada implementación rexístrase no LayoutEngineRegistry baixo o seu
 * `type` (string) que coincide co `LayoutConfig.type` do TreeDef.
 *
 * Para implementacións concretas ver IdentityLayout (4.1) e os
 * layouts específicos de sub-fases posteriores (RadialLayout 4.2,
 * TreeLayout 4.3, CustomLayout 4.4).
 */
export interface LayoutEngine {
  /**
   * Identificador do tipo de layout. Coincide con LayoutConfig.type
   * dos TreeDefs que este engine procesa.
   * Ex: 'radial', 'tree', 'custom'.
   */
  readonly type: string

  /**
   * Calcula o layout para un TreeDef dado.
   *
   * Devolve Result para permitir fallos limpos (ex: configuración
   * malformada, dependencias inválidas). Cero asincronía: layouts
   * son cálculos puros e síncronos.
   */
  compute(treeDef: TreeDef): Result<LayoutResult>
}
// ── FIN: LayoutEngine interface ──
```

### 5.4 — LayoutConfig tighten parcial

**Modificar** `packages/core/src/types/tree.ts` para cambiar
`LayoutConfig`:

```ts
// Antes:
export interface LayoutConfig {
  readonly type: string
  readonly [key: string]: unknown
}

// Despois:
/**
 * Base común para tódalas configuracións de layout.
 *
 * En 4.1 LayoutConfig é `BaseLayoutConfig`. Sub-fases posteriores
 * (4.2-4.4) ampliarán a unha discriminated union con cada layout
 * concreto extendendo `BaseLayoutConfig`.
 */
export interface BaseLayoutConfig {
  readonly type: string
}

/**
 * Configuración do layout dunha árbore.
 *
 * 4.1: alias de `BaseLayoutConfig`.
 * 4.2+: discriminated union `RadialLayoutConfig | TreeLayoutConfig | ...`.
 */
export type LayoutConfig = BaseLayoutConfig
```

**ATENCIÓN**: este cambio quita o `[key: string]: unknown` catch-all.
**T0 obrigatoriamente verifica** que cero código existente accede a
campos do `LayoutConfig` distintos de `type`. Se hai algún `.cost` ou
similar nun teste, **ESCALAR** antes de proceder.

**Importante**: a sub-fase **NON modifica TreeDef.layout** (segue
sendo `LayoutConfig`). Cero ruptura.

### 5.5 — LayoutResult, EdgePath, Bounds

`LayoutResult.ts`:

```ts
import type { Position } from '../../types/node.js'

/**
 * Paths para un edge. En 4.1 é simplemente unha lista de puntos
 * (mínimo 2). 4.5 (PathBuilder) ampliará con curvas/beziers se
 * procede; engadirase como campo opcional para non romper
 * consumidores.
 */
export interface EdgePath {
  /** Mínimo 2 puntos (orixe + destino). */
  readonly points: readonly Position[]
}

/**
 * Caixa contedora do layout (axis-aligned bounding box).
 *
 * Para un TreeDef baleiro: `{minX: 0, minY: 0, maxX: 0, maxY: 0}`.
 */
export interface Bounds {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

/**
 * Resultado dunha computación de layout.
 *
 * - `nodes`: posición por id de nodo.
 * - `edges`: path por id de edge.
 * - `bounds`: caixa contedora axis-aligned.
 * - `layoutType`: tipo de layout que produciu este resultado
 *   (`'radial'`, `'tree'`, `'custom'`, etc.).
 */
export interface LayoutResult {
  readonly nodes: ReadonlyMap<string, Position>
  readonly edges: ReadonlyMap<string, EdgePath>
  readonly bounds: Bounds
  readonly layoutType: string
}
```

**Decisión clave**:
- **`ReadonlyMap`** (non `Record<string, Position>`): mantén orde de
  iteración + tipo seguro de claves.
- **Cero `mesh`** en 4.1. **Engadirase como campo opcional en 4.2**
  (RadialLayout + MeshGenerator).
- **Cero `version: number`**. A versión vén do TreeDef/InternalState,
  cero responsabilidade do LayoutResult.

### 5.6 — LayoutEngineRegistry

`LayoutEngineRegistry.ts`:

```ts
import type { LayoutEngine } from './LayoutEngine.js'

export class LayoutEngineRegistry {
  private readonly engines = new Map<string, LayoutEngine>()

  /**
   * Rexistra un engine. Sobreescribe se xa existía un co mesmo `type`.
   * Devolve a propia instancia para chaining.
   */
  register(engine: LayoutEngine): this {
    this.engines.set(engine.type, engine)
    return this
  }

  /**
   * Recupera un engine polo seu `type`. Devolve undefined se non hai.
   */
  find(type: string): LayoutEngine | undefined {
    return this.engines.get(type)
  }

  /**
   * Indica se hai un engine rexistrado para o `type` dado.
   */
  has(type: string): boolean {
    return this.engines.has(type)
  }

  /**
   * Conta de engines rexistrados.
   */
  size(): number {
    return this.engines.size
  }
}
```

**Decisión**:
- **Cero `clear()`** método (cero caso de uso real).
- **Cero `register(engine)` validation** (ex: que `type` non sexa
  string vacío). Filosofía: se o consumidor pasa lixo, rompe nos
  seus tests. **Cero defensiva pesimista**.
- **Chaining** (`register().register()`) paralelo a MigrationRegistry.

### 5.7 — IdentityLayout

`IdentityLayout.ts`:

```ts
import { ok, type Result } from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { Position } from '../../types/node.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'

const ZERO_POSITION: Position = { x: 0, y: 0 }

/**
 * Layout trivial que copia as posicións declaradas en `NodeDef.position`.
 * Se un nodo non ten posición, asigna (0, 0).
 *
 * Para edges, calcula path coma liña recta entre as posicións de
 * source e target.
 *
 * Para bounds, calcula min/max de tódalas posicións de nodos. TreeDef
 * baleiro produce bounds (0, 0, 0, 0).
 *
 * Rexistrase baixo `type: 'custom'` segundo MASTER §20. Sub-fase 4.4
 * (CustomLayout) ampliará esta peza con funcionalidade adicional se
 * procede; IdentityLayout serve como caso base.
 */
export class IdentityLayout implements LayoutEngine {
  readonly type = 'custom'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    const nodes = new Map<string, Position>()
    for (const node of treeDef.nodes) {
      nodes.set(node.id, node.position ?? ZERO_POSITION)
    }

    const edges = new Map<string, EdgePath>()
    for (const edge of treeDef.edges) {
      const sourcePos = nodes.get(edge.source) ?? ZERO_POSITION
      const targetPos = nodes.get(edge.target) ?? ZERO_POSITION
      edges.set(edge.id, { points: [sourcePos, targetPos] })
    }

    const bounds = this.computeBounds(nodes)

    return ok({
      nodes,
      edges,
      bounds,
      layoutType: this.type,
    })
  }

  private computeBounds(nodes: ReadonlyMap<string, Position>): Bounds {
    if (nodes.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const pos of nodes.values()) {
      if (pos.x < minX) minX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.x > maxX) maxX = pos.x
      if (pos.y > maxY) maxY = pos.y
    }

    return { minX, minY, maxX, maxY }
  }
}
```

**Decisión**:
- **Cero erro nunca**. IdentityLayout sempre devolve `ok`.
- **`type = 'custom'`** (MASTER §20).
- **(0,0) fallback** se nodo non ten posición. **Documentado**.
- **`Infinity` sentinel**: práctica común en cálculo de bounds. Se
  array baleiro, fallback a 0.

### 5.8 — computeLayout función pública

`computeLayout.ts`:

```ts
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
} from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { LayoutEngineRegistry } from './LayoutEngineRegistry.js'
import type { LayoutResult } from './LayoutResult.js'

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Calcula o layout dun TreeDef usando o engine apropiado do registry.
 *
 * Determinación: busca o engine con `type === treeDef.layout.type`.
 * Se non hai engine rexistrado, devolve err(LAYOUT_TYPE_UNKNOWN).
 *
 * Cero estado: a función é pura e síncrona. O resultado pode
 * cachearse externamente (responsabilidade do consumidor; en futuro
 * o TreeEngine farao mediante InternalState.caches.layout).
 */
export function computeLayout(
  treeDef: TreeDef,
  registry: LayoutEngineRegistry,
  locale: Locale = DEFAULT_LOCALE,
): Result<LayoutResult> {
  const layoutType = treeDef.layout.type
  const engine = registry.find(layoutType)

  if (engine === undefined) {
    return err(
      new YggdrasilError(
        ErrorCode.LAYOUT_TYPE_UNKNOWN,
        getErrorMessage(ErrorCode.LAYOUT_TYPE_UNKNOWN, locale, {
          type: layoutType,
        }),
        { context: { type: layoutType } },
      ),
    )
  }

  return engine.compute(treeDef)
}
```

**Decisión**:
- **Registry inxectado**, **non singleton global**. Razón: tests
  illados.
- **Locale opcional** con default 'gl' (consistencia).
- **Erros propagan**: se engine.compute devolve err, propágase tal cal.
- **Cero try/catch** ao redor de engine.compute. Razón: o contrato
  obriga ao engine a devolver Result; un throw é bug da implementación
  do engine, non algo que LayoutEngine quera atrapar.

### 5.9 — Engadir ErrorCodes en common

**Familia nova `YGG_L = Layout errors`**.

Modificar `packages/common/src/errors/codes.ts`:

```ts
//   YGG_R   = Reconcile errors
//   YGG_L   = Layout errors   ← NOVA FAMILIA

// ... outras ErrorCodes ...

// Layout
LAYOUT_TYPE_UNKNOWN = 'YGG_L001',
LAYOUT_COMPUTE_FAILED = 'YGG_L002',
```

**LAYOUT_COMPUTE_FAILED non se usa en 4.1**. Inclúese xa por
**anticipo** para que 4.2-4.4 non teñan que modificar common cada
vez. Iso é decisión do director: o ErrorCode existe como constante
exportada pero **cero rama de código que o emita en 4.1**. **Cero
impacto en cobertura** (constantes non son ramas).

**Modificar tamén** `packages/common/src/errors/messages.ts` con
mensaxes nas 3 locales:

- **LAYOUT_TYPE_UNKNOWN**:
  - gl: 'Layout descoñecido: tipo {type} non rexistrado'
  - es: 'Layout desconocido: tipo {type} no registrado'
  - en: 'Unknown layout: type {type} not registered'
- **LAYOUT_COMPUTE_FAILED**:
  - gl: 'Erro ao calcular layout {type}: {reason}'
  - es: 'Error al calcular layout {type}: {reason}'
  - en: 'Layout computation failed ({type}): {reason}'

**ATENCIÓN procedural**: modificar `packages/common/` está normalmente
prohibido tras 3.4 L1. **Esta sub-fase autoriza explicitamente** estes
2 ficheiros (`codes.ts` + `messages.ts`). **Cero outros cambios en
common**.

### 5.10 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts` ou
`packages/core/src/index.ts` (verifica patrón en T0):

```ts
export type { LayoutEngine } from './engine/layouts/LayoutEngine.js'
export { LayoutEngineRegistry } from './engine/layouts/LayoutEngineRegistry.js'
export type {
  LayoutResult,
  EdgePath,
  Bounds,
} from './engine/layouts/LayoutResult.js'
export { IdentityLayout } from './engine/layouts/IdentityLayout.js'
export { computeLayout } from './engine/layouts/computeLayout.js'
```

**E `BaseLayoutConfig`** desde tree types (xa exportado se LayoutConfig
xa o estaba):

```ts
export type { BaseLayoutConfig, LayoutConfig } from './types/tree.js'
```

### 5.11 — Cero modificación de TreeEngine ou outras pezas existentes

**Cero modificación** de TreeEngine, ProgressManager, StatComputer,
EffectsRunner, ProcessChanges, schemas, etc. **Cero integración** co
cache `InternalState.caches.layout` (decisión futura).

### 5.12 — Tests funcionais

Crear catro ficheiros de test en
`packages/core/__tests__/engine/layouts/`:

**`LayoutEngineRegistry.test.ts`** (~6 tests):
1. Registry baleiro: `size() === 0`, `has('any') === false`.
2. Register + find recupera.
3. Register sobreescribe.
4. has() devolve true tras register.
5. Chaining funciona.
6. find() de type non rexistrado devolve undefined.

**`IdentityLayout.test.ts`** (~6 tests):
1. TreeDef cun nodo con position: copia a LayoutResult.nodes.
2. TreeDef cun nodo SEN position: fallback (0,0).
3. TreeDef cun edge: path = [sourcePos, targetPos].
4. TreeDef baleiro: bounds = (0,0,0,0).
5. TreeDef con múltiples nodos: bounds calculados correctamente
   (minX/maxX/minY/maxY).
6. `layoutType === 'custom'`.

**`computeLayout.test.ts`** (~10 tests):
1. TreeDef cun layout type rexistrado: chama engine.compute, propaga
   Result.
2. TreeDef cun layout type NON rexistrado: err(LAYOUT_TYPE_UNKNOWN).
3. Engine.compute devolve err: propágase tal cal.
4. Engine.compute devolve ok: propágase tal cal.
5. Locale 'es' propaga á mensaxe.
6. Locale 'en' propaga á mensaxe.
7. Locale por defecto 'gl'.
8. Registry con múltiples engines: usa o correcto para o type.
9. context do erro inclúe `type`.
10. Integración: IdentityLayout rexistrado + computeLayout devolve
    LayoutResult correcto.

**`LayoutResult.type-test.ts`** (~3 tests):
- LayoutResult shape: nodes é ReadonlyMap.
- EdgePath shape: points é readonly array.
- Bounds shape: 4 números readonly.

**Total: ~25 tests**.

### 5.13 — Cobertura

- `LayoutEngineRegistry.ts`: 100/100/100/100.
- `IdentityLayout.ts`: 100/≥95%/100/100.
- `computeLayout.ts`: 100/≥95%/100/100.
- `LayoutResult.ts`: só tipos (cero liñas executables).
- `LayoutEngine.ts`: só interface (cero liñas executables).
- Global core: ≥98% (non baixar de baseline 98.2%).

### 5.14 — Cero ErrorCodes adicionais

Os 2 prescritos (LAYOUT_TYPE_UNKNOWN + LAYOUT_COMPUTE_FAILED) son
**os únicos** desta sub-fase. **Cero máis**.

### 5.15 — `'maxed'` non aplica

LayoutEngine non interactúa con NodeInstance.state. **Cero
consideración de estados**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/layouts/LayoutEngine.ts` — NOVO
- `packages/core/src/engine/layouts/LayoutEngineRegistry.ts` — NOVO
- `packages/core/src/engine/layouts/LayoutResult.ts` — NOVO
- `packages/core/src/engine/layouts/IdentityLayout.ts` — NOVO
- `packages/core/src/engine/layouts/computeLayout.ts` — NOVO
- `packages/core/src/types/tree.ts` — MODIFICADO (LayoutConfig
  tighten parcial; 5.4)
- `packages/core/src/engine/index.ts` ou `packages/core/src/index.ts` —
  MODIFICADO (+5 exports)
- `packages/common/src/errors/codes.ts` — MODIFICADO (+2 ErrorCodes
  + comentario YGG_L)
- `packages/common/src/errors/messages.ts` — MODIFICADO (+6 mensaxes:
  2 ErrorCodes × 3 locales)

**Tests:**
- `packages/core/__tests__/engine/layouts/LayoutEngineRegistry.test.ts` — NOVO
- `packages/core/__tests__/engine/layouts/IdentityLayout.test.ts` — NOVO
- `packages/core/__tests__/engine/layouts/computeLayout.test.ts` — NOVO
- `packages/core/__tests__/engine/layouts/LayoutResult.type-test.ts` — NOVO

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións CRÍTICAS

1. `pnpm install`. Confirma 997 tests core + 60 common + 171 storage
   con `--force`.

2. **VERIFICACIÓN CRÍTICA**: ¿hai algún código que acceda a campos do
   `LayoutConfig` distintos de `type`?
   ```
   grep -rn "\.layout\." packages/core/src/ packages/storage/src/ \
     packages/common/src/ packages/core/__tests__/ \
     packages/storage/__tests__/ packages/common/__tests__/ \
     | grep -v "\.layoutType\|\.layoutVersion\|layout\.type"
   ```
   Espera **cero resultados**. Se hai algún, **ESCALAR**: o tighten
   parcial rompería tests existentes.

3. **Verifica EdgeDef shape**:
   ```
   grep -B1 -A8 "interface EdgeDef\|type EdgeDef" packages/core/src/types/*.ts
   ```
   Confirma `id`, `source`, `target` (ou nomes exactos). Se difire,
   adaptar IdentityLayout segundo nomes reais.

4. **Verifica patrón de exports en `packages/core/src/index.ts`** ou
   o ficheiro index principal:
   ```
   cat packages/core/src/index.ts | head -60
   ```

5. **Verifica patrón de erros**:
   ```
   grep -A2 "RECONCILE_TREE_MISMATCH" packages/common/src/errors/codes.ts
   grep -A4 "RECONCILE_TREE_MISMATCH" packages/common/src/errors/messages.ts
   ```
   Confirma exactamente o estilo das familias e mensaxes para
   replicar.

### T1 — Engadir ErrorCodes + mensaxes en common (5.9)

1. Editar `packages/common/src/errors/codes.ts`:
   - Engadir comentario `//   YGG_L   = Layout errors` na sección de
     comentarios das familias.
   - Engadir `LAYOUT_TYPE_UNKNOWN = 'YGG_L001'`.
   - Engadir `LAYOUT_COMPUTE_FAILED = 'YGG_L002'`.
2. Editar `packages/common/src/errors/messages.ts`:
   - Engadir as 6 mensaxes (gl/es/en × 2 ErrorCodes).
3. Typecheck 20/20.
4. Confirma 60 tests common seguen pasando (cero ruptura).

### T2 — Ampliación de LayoutConfig (5.4)

Editar `packages/core/src/types/tree.ts`: substituír a interface
`LayoutConfig` por `BaseLayoutConfig` + alias `LayoutConfig`.

Typecheck 20/20. **Importantísimo**: se algún teste rompe nesta
operación → **ESCALAR**. (O T0.2 deberíao haber detectado xa.)

### T3 — LayoutEngine interface (5.3)

Crear `packages/core/src/engine/layouts/LayoutEngine.ts`.

Typecheck 20/20.

### T4 — LayoutResult tipos (5.5)

Crear `packages/core/src/engine/layouts/LayoutResult.ts`.

Typecheck 20/20.

### T5 — LayoutEngineRegistry (5.6)

Crear `packages/core/src/engine/layouts/LayoutEngineRegistry.ts`.

Typecheck 20/20.

### T6 — Tests Registry (5.12)

Crear `__tests__/engine/layouts/LayoutEngineRegistry.test.ts` cos 6
tests mínimos. **Cobertura 100%**.

### T7 — IdentityLayout (5.7)

Crear `packages/core/src/engine/layouts/IdentityLayout.ts`.

Typecheck 20/20.

### T8 — Tests IdentityLayout (5.12)

Crear `__tests__/engine/layouts/IdentityLayout.test.ts` cos 6 tests
mínimos. **Cobertura ≥95% branch**.

### T9 — computeLayout (5.8)

Crear `packages/core/src/engine/layouts/computeLayout.ts`.

Typecheck 20/20.

### T10 — Tests computeLayout (5.12)

Crear `__tests__/engine/layouts/computeLayout.test.ts` cos 10 tests.

### T11 — Type-test LayoutResult (5.12)

Crear `__tests__/engine/layouts/LayoutResult.type-test.ts` cos 3
type-tests.

### T12 — Exportar dende index (5.10)

Engadir os 5 exports + 2 type exports (BaseLayoutConfig, LayoutConfig
xa existían pero verifica que LayoutConfig se exporta) ao ficheiro
index apropiado de core.

### T13 — Verificación post-T12

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 997 tests previos core seguen pasando intactos.
- 60 tests common previos intactos (común modificou pero non rompe).
- 171 tests storage previos intactos.

### T14 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- LayoutEngineRegistry 100/100/100/100.
- IdentityLayout 100/≥95%/100/100.
- computeLayout 100/≥95%/100/100.
- Global core ≥98%.

### T15 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/layouts/
pnpm test
```

**Nota sobre `unknown`**: cero esperado en layouts/. Se aparece,
documenta razón.

- Changeset **minor** para `@yggdrasil-forge/core` + **patch** para
  `@yggdrasil-forge/common`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - Layout Engine base en
    `@yggdrasil-forge/core/engine/layouts/`:
    - `LayoutEngine` interface (contrato común).
    - `LayoutEngineRegistry` para rexistrar engines por tipo.
    - `LayoutResult`, `EdgePath`, `Bounds` tipos.
    - `IdentityLayout`: implementación trivial (type='custom') que
      copia `NodeDef.position` ou usa (0,0).
    - `computeLayout(treeDef, registry, locale?)` función pública.
  - `BaseLayoutConfig` interface; `LayoutConfig` tighten parcial
    (deixa de ter `[key: string]: unknown` catch-all). Sub-fases
    posteriores (4.2-4.4) ampliarán LayoutConfig a discriminated
    union.
  - ErrorCodes `LAYOUT_TYPE_UNKNOWN = YGG_L001` e
    `LAYOUT_COMPUTE_FAILED = YGG_L002` con mensaxes en gl/es/en.
    Familia nova YGG_L.

  ### Note
  - Esta sub-fase (4.1) **non integra** computeLayout no TreeEngine
    (cache de LayoutResult). Iso é decisión futura.
  - Sub-fases 4.2-4.4 engadirán RadialLayout, TreeLayout e ampliarán
    CustomLayout sobre a base IdentityLayout. 4.5 engadirá
    PathBuilder + BoundsCalculator + QuadTree.
  ```

### T16 — Commit + push

Commit Conventional:
`feat(core): add LayoutEngine base with IdentityLayout (sub-phase 4.1)`.
Push directo a `origin/main` (base `835fd24`). Reporta hash.

### Ficheiros esperados no diff final:

- `packages/core/src/engine/layouts/LayoutEngine.ts` (NOVO)
- `packages/core/src/engine/layouts/LayoutEngineRegistry.ts` (NOVO)
- `packages/core/src/engine/layouts/LayoutResult.ts` (NOVO)
- `packages/core/src/engine/layouts/IdentityLayout.ts` (NOVO)
- `packages/core/src/engine/layouts/computeLayout.ts` (NOVO)
- `packages/core/src/types/tree.ts` (MODIFICADO: LayoutConfig tighten)
- `packages/core/src/index.ts` ou
  `packages/core/src/engine/index.ts` (MODIFICADO: +5 exports)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +2 ErrorCodes)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +6 mensaxes)
- `packages/core/__tests__/engine/layouts/LayoutEngineRegistry.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/IdentityLayout.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/computeLayout.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/LayoutResult.type-test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- Calquera outro ficheiro de `packages/common/` agás `codes.ts` e
  `messages.ts` (5.9 autorizado explicitamente).
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, ou outros globais (lección
  3.4 L1).
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Tests existentes (cero modificación).
- TreeEngine, ProgressManager, StatComputer, schemas, validadores,
  outros tipos de core.

**Se algún destes aparece** → **ESCALAR DURANTE A SUB-FASE**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown` cero esperado** nesta sub-fase. Se aparece, documenta razón.

---

## 9. QUE NON FACER

- ❌ Crear paquete novo `@yggdrasil-forge/layouts` (5.1).
- ❌ Implementar layouts complexos: radial, tree, grid, web, etc.
  (estes son de 4.2-4.4).
- ❌ Implementar MeshGenerator, MeshElement (5.5: vén en 4.2).
- ❌ Implementar PathBuilder con curvas, beziers (5.5: vén en 4.5).
- ❌ Implementar QuadTree, BoundsCalculator avanzados (5.5: vén en 4.5).
- ❌ Integrar computeLayout no TreeEngine cache (5.11: decisión futura).
- ❌ Modificar TreeDef.layout campo (5.4: cero modificación; só o
  tipo LayoutConfig).
- ❌ Modificar TreeEngine, ProgressManager, ou outras pezas existentes
  (5.11).
- ❌ Engadir 'identity' como type novo (5.7: IdentityLayout
  rexistrase como 'custom' segundo MASTER §20).
- ❌ Engadir LayoutConfig discriminated union completa (5.4: tighten
  só parcial; cada layout extenderá BaseLayoutConfig en sub-fases
  posteriores).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` agás `codes.ts` e `messages.ts`
  (5.9).
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes adicionais (5.14).
- ❌ Validar o LayoutEngineRegistry.register input (5.6: cero
  defensiva pesimista).
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 4.1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 835fd24)
✅ LayoutEngine interface establecida (5.3)
✅ LayoutEngineRegistry con register/find/has/size (5.6)
✅ LayoutResult, EdgePath, Bounds tipos (5.5; cero mesh)
✅ IdentityLayout (type='custom'): copia NodeDef.position ou (0,0)
✅ computeLayout(treeDef, registry, locale?) función pública
✅ LayoutConfig tighten parcial: BaseLayoutConfig común
✅ ErrorCodes LAYOUT_TYPE_UNKNOWN (YGG_L001) + LAYOUT_COMPUTE_FAILED
   (YGG_L002) + mensaxes 3 locales (Familia YGG_L nova)
✅ T0.2 cero accesos a campos LayoutConfig distintos de type
✅ T0.3 EdgeDef shape verificado: <forma>
✅ Cero modificación de TreeEngine ou outras pezas existentes
✅ Cero integración con InternalState cache
✅ Cero paquete novo (5.1: layouts viven en core)
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> LayoutEngineRegistry
   - <Y> IdentityLayout
   - <Z> computeLayout
   - <W> LayoutResult type-tests
✅ Cobertura:
   - LayoutEngineRegistry 100/100/100/100
   - IdentityLayout 100/<X%>/100/100
   - computeLayout 100/<X%>/100/100
   - Global core: <X%> (baseline 98.2%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - Cero mesh en LayoutResult (4.2 engadirao opcional).
   - Cero curvas en EdgePath (4.5 PathBuilder).
   - Cero integración con InternalState.caches.layout (decisión futura).
   - LayoutConfig só tighten parcial; discriminated union completa
     en 4.2-4.4.
   - LAYOUT_COMPUTE_FAILED exportado pero cero rama de código que
     o emita (anticipo para 4.2-4.4).
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 4.2 (RadialLayout + MeshGenerator).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 4.1. Primeira sub-fase Fase 4. Base infraestrutural
para layouts. Tras 3.4 L1 + 3.5 L1 + 3.5 L2 + 3.6.a L1: calquera
modificación non listada → ESCALAR antes.*