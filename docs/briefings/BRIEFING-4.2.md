# BRIEFING — SUB-FASE 4.2 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Segunda sub-fase da Fase 4 (Layout Engine).** Implementar
> RadialLayout (algoritmo de árbore radial clásica con BFS + sectores
> iguais) + MeshGenerator (elementos visuais auxiliares). Engadir
> `mesh?: readonly MeshElement[]` opcional a LayoutResult. Estrea o
> uso do `LAYOUT_COMPUTE_FAILED` anticipado na 4.1.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2
e 3.6.a L1**: calquera modificación fóra de §6 require **ESCALAR
ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 4.2 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 4.2 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **4.2** de Yggdrasil Forge. **Segunda da Fase 4** (Layout
Engine). Engadimos a primeira implementación non-trivial:
RadialLayout (algoritmo de árbore radial clásica con BFS desde roots
+ sectores angulares iguais por nodo). Tamén implementamos
MeshGenerator que produce elementos visuais auxiliares (círculos
concéntricos, polígono perimetral, etc.).

**Pezas novas/modificadas**:

1. `RadialLayoutConfig` interface + `PolygonConfig` + `MeshType`.
2. `MeshElement` discriminated union.
3. `MeshGenerator` función pura.
4. `RadialLayout` clase (LayoutEngine para 'radial').
5. Helper `parseRadialConfig` función validadora.
6. **Modificación de `LayoutResult`**: engadir `mesh?` opcional.

---

## 2. CONTEXTO MÍNIMO

§20 MASTER lista 'radial' como "Polígono + radios + malla", inspirado
en Oberón e Skyrim perks. **Iso refírese a estética visual**, NON á
estrutura matemática (Skyrim usa constellations, que é layout
separado). **A estrutura matemática real é a árbore radial clásica de
Wikipedia**: roots no centro/nivel 0, niveles concéntricos, BFS desde
roots para determinar profundidade.

§52 MASTER establece bundle splitting cun critical path <35KB.
RadialLayout é o único layout non-lazy (vai no bundle principal). **A
sub-fase 4.2 NON aplica subpath exports** (decisión do autor: diferir
a sub-fase futura específica de bundle splitting que tocará
`tsup.config.ts` integrada coa fix do DT-14).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `0bcc66d` (LayoutEngine base 4.1).
- 1023 tests core + 60 common + 171 storage = ~1254 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **LayoutEngine, LayoutEngineRegistry, IdentityLayout, computeLayout,
  LayoutResult, BaseLayoutConfig** dispoñibles desde core.
- **LayoutConfig** segue intacto (con `[key: string]: unknown` por
  compatibilidade T0.2 da 4.1).
- **`DependencyGraph`** existe en `packages/core/src/engine/DependencyGraph.ts`
  con métodos `getRoots()`, `getLeaves()`, `getOutgoing()`,
  `getDependencies()`, etc. **Reutilízase** en 4.2.
- **`ErrorCode.LAYOUT_COMPUTE_FAILED`** (YGG_L002) anticipado en 4.1,
  cero rama de código. **Estréase nesta sub-fase**.
- DT-14 (tsup composite) e DT-15 (type-test naming) abertas, non
  bloqueantes.
- DT-16 NOVA prevista: RadialLayout usa sectores iguais (cero
  proporcional a número de descendentes; ver §5.5).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/src/engine/layouts/RadialLayout.ts` cunha clase
LayoutEngine para 'radial' que usa BFS desde os roots da
DependencyGraph + sectores angulares iguais por nodo, crear
`MeshGenerator.ts` con función pura que xera elementos visuais
auxiliares (círculos, polígonos, liñas), engadir tipos
`RadialLayoutConfig`, `PolygonConfig`, `MeshType`, `MeshElement`,
ampliar `LayoutResult` con `mesh?` opcional, validar config con
`parseRadialConfig` helper, exportar publicamente desde core, e
cubrir con tests funcionais completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estrutura de ficheiros

```
packages/core/src/engine/layouts/
├── LayoutEngine.ts        ← (existe 4.1, sen cambios)
├── LayoutEngineRegistry.ts ← (existe 4.1, sen cambios)
├── LayoutResult.ts        ← MODIFICADO: +mesh? + MeshElement type
├── IdentityLayout.ts      ← (existe 4.1, sen cambios)
├── computeLayout.ts       ← (existe 4.1, sen cambios)
├── RadialLayout.ts        ← NOVO
├── RadialLayoutConfig.ts  ← NOVO (RadialLayoutConfig + PolygonConfig + MeshType + parseRadialConfig)
└── MeshGenerator.ts       ← NOVO
```

**Decisión**: separar `RadialLayoutConfig.ts` do `RadialLayout.ts`
porque os tipos son útiles a sub-fases posteriores (consumidores
poden importar só os tipos sen importar a implementación).

### 5.2 — RadialLayoutConfig

`RadialLayoutConfig.ts`:

```ts
import type { BaseLayoutConfig } from '../../types/tree.js'

/**
 * Tipo de mesh visual auxiliar.
 *
 * - `'none'`: cero elementos mesh xerados.
 * - `'rings'`: círculos concéntricos un por nivel da árbore. Default.
 * - `'cross'`: dúas liñas (horizontal + vertical) cruzando o centro.
 * - `'star'`: N radios desde o centro, onde N é o número de roots da
 *   árbore. Útil cando hai unha estructura "estrella" natural.
 */
export type MeshType = 'none' | 'rings' | 'cross' | 'star'

/**
 * Configuración dun polígono perimetral decorativo.
 *
 * O polígono debúxase como elemento mesh con `sides` vértices
 * equidistantes nun círculo de radio `radius` arredor do centro do
 * layout.
 */
export interface PolygonConfig {
  /** Número de lados. Min 3. */
  readonly sides: number
  /** Radio do polígono (distancia centro → vértice). Debe ser > 0. */
  readonly radius: number
}

/**
 * Configuración do RadialLayout.
 *
 * Algoritmo: BFS desde os roots da DependencyGraph (nodos sen
 * prerequisites). Cada nivel concéntrico distribúese uniformemente
 * en sectores angulares iguais por nodo do nivel anterior. Os
 * sectores son **iguais por nodo do nivel anterior** (cero
 * proporcional a número de descendentes). Para árbores
 * desbalanceadas pode producir sobreposición visual; algoritmo
 * proporcional diferido a sub-fase futura (ver DT-16).
 *
 * IMPORTANTE: RadialLayout **ignora `NodeDef.position`**. Para
 * posicións manuais, use o layout `'custom'` (IdentityLayout).
 */
export interface RadialLayoutConfig extends BaseLayoutConfig {
  readonly type: 'radial'

  /**
   * Distancia entre niveles concéntricos. Radio do nivel N = radius
   * * N. Debe ser > 0.
   */
  readonly radius: number

  /** Centro X do layout. Default 0. */
  readonly centerX?: number

  /** Centro Y do layout. Default 0. */
  readonly centerY?: number

  /**
   * Ángulo inicial en radiáns. Default `-Math.PI / 2` ("arriba" en
   * coordenadas estándar onde Y crece cara abaixo).
   */
  readonly startAngle?: number

  /** Polígono perimetral decorativo. */
  readonly polygon?: PolygonConfig

  /** Tipo de mesh auxiliar. Default 'rings'. */
  readonly meshType?: MeshType
}
```

### 5.3 — parseRadialConfig

No mesmo ficheiro `RadialLayoutConfig.ts`:

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
import type { LayoutConfig } from '../../types/tree.js'

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Valida e parsea un LayoutConfig xenérico a RadialLayoutConfig
 * estricto. Devolve err(LAYOUT_COMPUTE_FAILED) con `reason` específica
 * se algún campo é inválido.
 */
export function parseRadialConfig(
  config: LayoutConfig,
  locale: Locale = DEFAULT_LOCALE,
): Result<RadialLayoutConfig> {
  // type
  if (config.type !== 'radial') {
    return err(
      new YggdrasilError(
        ErrorCode.LAYOUT_COMPUTE_FAILED,
        getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
          type: config.type,
          reason: `expected type 'radial', got '${config.type}'`,
        }),
        { context: { type: config.type } },
      ),
    )
  }

  // radius obrigatorio + > 0
  const radius = config.radius
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0) {
    return err(
      new YggdrasilError(
        ErrorCode.LAYOUT_COMPUTE_FAILED,
        getErrorMessage(ErrorCode.LAYOUT_COMPUTE_FAILED, locale, {
          type: 'radial',
          reason: `radius must be a positive number; got ${String(radius)}`,
        }),
        { context: { field: 'radius', value: radius } },
      ),
    )
  }

  // centerX, centerY, startAngle opcionais
  // ... validacións análogas se presentes

  // polygon opcional con sides >= 3 e radius > 0 se presente
  // ... validación análoga

  // meshType opcional con valores limitados
  // ... validación análoga

  // Construír resultado tipado
  return ok({
    type: 'radial',
    radius,
    // ... resto de campos con valores xa validados ou default
  } as RadialLayoutConfig)
}
```

**Decisión clave**:
- **`parseRadialConfig` valida estrictamente**.
- **Defaults aplícanse fora** (en RadialLayout.compute), non en parse.
- **Cero `as any`**. **O `as RadialLayoutConfig`** ao final está
  permitido porque acabamos de validar todos os campos contra a forma.

### 5.4 — RadialLayout

`RadialLayout.ts`:

```ts
import { err, ok, type Result } from '@yggdrasil-forge/common'
import type { TreeDef } from '../../types/tree.js'
import type { Position } from '../../types/node.js'
import { DependencyGraph } from '../DependencyGraph.js'
import type { LayoutEngine } from './LayoutEngine.js'
import type { Bounds, EdgePath, LayoutResult } from './LayoutResult.js'
import {
  parseRadialConfig,
  type RadialLayoutConfig,
} from './RadialLayoutConfig.js'
import { generateMesh } from './MeshGenerator.js'

const DEFAULT_START_ANGLE = -Math.PI / 2 // arriba en coordenadas estándar

/**
 * Layout radial clásico. Distribúe nodos en niveles concéntricos
 * arredor dun centro, usando BFS desde os roots da DependencyGraph.
 *
 * Algoritmo:
 * 1. Construír DependencyGraph desde TreeDef.
 * 2. Identificar roots (nodos sen prerequisites).
 * 3. BFS multifrente desde roots → asignar profundidade mínima
 *    (`level`) a cada nodo.
 * 4. Para cada nivel:
 *    - Nivel 0 (roots): distribución uniforme en 2π.
 *    - Niveles posteriores: cada nodo do nivel N reserva sector
 *      angular igual = 2π / |nivelN|. Os seus fillos do nivel N+1
 *      distribúense uniformemente dentro do sector.
 * 5. Calcular x = centerX + radius*N * cos(angle),
 *           y = centerY + radius*N * sin(angle).
 *
 * Sectores **iguais por nodo** (cero proporcional a número de
 * descendentes). Algoritmo proporcional diferido a sub-fase futura
 * (ver DT-16).
 *
 * Nodos illados (sen prereqs nin sucesores) tratánse como roots.
 *
 * Determinismo: orde dos nodos no nivel coincide coa orde de
 * aparición en `treeDef.nodes`.
 */
export class RadialLayout implements LayoutEngine {
  readonly type = 'radial'

  compute(treeDef: TreeDef): Result<LayoutResult> {
    // 1. Validar config
    const configResult = parseRadialConfig(treeDef.layout)
    if (!configResult.ok) return configResult

    const config = configResult.value
    const centerX = config.centerX ?? 0
    const centerY = config.centerY ?? 0
    const startAngle = config.startAngle ?? DEFAULT_START_ANGLE
    const meshType = config.meshType ?? 'rings'

    // 2. Caso baleiro
    if (treeDef.nodes.length === 0) {
      return ok({
        nodes: new Map(),
        edges: new Map(),
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        layoutType: 'radial',
        // mesh vacía aínda con meshType !== 'none' porque cero nodos.
      })
    }

    // 3. Construír DependencyGraph
    const graph = new DependencyGraph(treeDef)
    // (verifica API exacta en T0; o constructor pode aceptar treeDef
    // ou pode requerir build manual de edges)

    // 4. BFS para determinar niveis
    const nodeLevels = this.computeNodeLevels(graph, treeDef)

    // 5. Para cada nivel, distribuír angulamente
    const nodes = this.computePositions(
      treeDef,
      nodeLevels,
      config,
      centerX,
      centerY,
      startAngle,
    )

    // 6. Edges como liñas rectas (4.5 PathBuilder pode mellorar)
    const edges = this.computeEdges(treeDef, nodes)

    // 7. Bounds
    const bounds = this.computeBounds(nodes, config, centerX, centerY)

    // 8. Mesh elements
    const maxLevel = Math.max(...nodeLevels.values(), 0)
    const ringRadii: number[] = []
    for (let i = 1; i <= maxLevel; i++) {
      ringRadii.push(config.radius * i)
    }
    const mesh = generateMesh(
      meshType,
      config,
      centerX,
      centerY,
      ringRadii,
      nodeLevels,
      startAngle,
    )

    return ok({
      nodes,
      edges,
      bounds,
      layoutType: 'radial',
      mesh,
    })
  }

  private computeNodeLevels(
    graph: DependencyGraph,
    treeDef: TreeDef,
  ): Map<string, number> {
    // BFS desde roots
    // ... implementación
  }

  private computePositions(
    treeDef: TreeDef,
    nodeLevels: Map<string, number>,
    config: RadialLayoutConfig,
    centerX: number,
    centerY: number,
    startAngle: number,
  ): Map<string, Position> {
    // Distribución por nivel
    // ... implementación
  }

  private computeEdges(
    treeDef: TreeDef,
    nodes: Map<string, Position>,
  ): Map<string, EdgePath> {
    // Liñas rectas entre source e target
    // ... implementación
  }

  private computeBounds(
    nodes: Map<string, Position>,
    config: RadialLayoutConfig,
    centerX: number,
    centerY: number,
  ): Bounds {
    // Min/max de posicións + considerar polygon perimetral se existe
  }
}
```

**Decisión clave sobre `computeBounds`**:
- **Inclúe vértices do polígono perimetral** se está definido (o polígono
  ten radio que pode superar o max nivel).
- **NodeDef.position ignórase totalmente**.

### 5.5 — Sectores iguais por nodo (decisión arquitectónica grande)

**ALGORITMO SIMPLIFICADO**:

Para nivel N+1:
1. Cada nodo do nivel N ten un sector angular **igual = 2π /
   |nivelN|**.
2. Os fillos do nodo X (do nivel N+1) distribúense uniformemente
   dentro do sector de X.

**Iso NON é proporcional ao número de descendentes**: un root con 1
fillo tería o mesmo sector que un root con 50. **DT-16 anotado** (
algoritmo proporcional diferido).

**Pero hai unha sutileza**: ¿e se un nodo do nivel N **non ten fillos
no nivel N+1**? O seu sector queda **valeiro**. **Cero acción**.

**Algoritmo paso a paso**:

```
Nivel 0 (roots = nodos sen prereqs):
- N = |roots|
- Para cada root R_i (en orde de aparición en treeDef.nodes):
  - angle_i = startAngle + i * (2π / N)
  - posición = (centerX + radius*0 * cos, centerY + radius*0 * sin) = (centerX, centerY) ¡!
  - PERO se hai 1 root só: posición = (centerX, centerY).
  - Se hai múltiples roots: posición no nivel 0 = ?

PROBLEMA: con radius*0 = 0 todos os roots quedan en (centerX, centerY).

SOLUCIÓN: 
- Caso 1 root: posición = (centerX, centerY).
- Caso múltiples roots: trátanse como nivel 1 (raio = radius * 1) e
  distribúense uniformemente.
```

**Decisión do director**: **caso especial multiple roots**:
- **1 root**: posición = `(centerX, centerY)`. **Sin BFS sub-niveis arriba**.
- **N > 1 roots**: tratase o **conjunto de roots como nivel 1** (raio = radius * 1).
  Despois, **os fillos directos** dos roots van ao **nivel 2** (raio = radius * 2). E así.

**Iso é a interpretación máis estética**. Documentar no JSDoc.

### 5.6 — MeshElement

`LayoutResult.ts` AMPLIADO (NON SUBSTITUÍDO):

```ts
// (campos existentes intactos)

/**
 * Elemento visual auxiliar do layout. Discriminated union por `type`.
 *
 * Os layouts opcionalmente xeran elementos mesh (círculos
 * concéntricos para `radial`, etc.) para guiar visualmente ao
 * usuario. Os renderers (React/SVG futuros) decidirán como debuxalos.
 */
export type MeshElement =
  | {
      readonly type: 'line'
      readonly from: Position
      readonly to: Position
    }
  | {
      readonly type: 'circle'
      readonly center: Position
      readonly radius: number
    }
  | {
      readonly type: 'polygon'
      readonly points: readonly Position[]
    }

/**
 * Resultado dunha computación de layout.
 *
 * - `nodes`: posición por id de nodo.
 * - `edges`: path por id de edge.
 * - `bounds`: caixa contedora axis-aligned.
 * - `layoutType`: tipo de layout que produciu este resultado.
 * - `mesh`: elementos visuais auxiliares (opcional). Engadido en 4.2.
 */
export interface LayoutResult {
  readonly nodes: ReadonlyMap<string, Position>
  readonly edges: ReadonlyMap<string, EdgePath>
  readonly bounds: Bounds
  readonly layoutType: string
  /** Elementos visuais auxiliares. Engadido en 4.2 (campo opcional, cero ruptura). */
  readonly mesh?: readonly MeshElement[]
}
```

**Decisión**: **engadir `mesh?` opcional**. Cero ruptura de IdentityLayout
(que segue sen producir mesh). **IdentityLayout NON se modifica**.

### 5.7 — MeshGenerator

`MeshGenerator.ts`:

```ts
import type { Position } from '../../types/node.js'
import type { MeshElement } from './LayoutResult.js'
import type { RadialLayoutConfig, MeshType } from './RadialLayoutConfig.js'

/**
 * Xera elementos visuais auxiliares para un RadialLayout.
 *
 * Outputs por `meshType`:
 * - `'none'`: array baleiro (cero elementos).
 * - `'rings'`: un círculo por nivel da árbore.
 * - `'cross'`: dúas liñas (horizontal + vertical) cruzando o centro.
 * - `'star'`: N radios desde o centro (N = número de roots).
 *
 * Adicionalmente, se `config.polygon` está definido, engade o
 * polígono perimetral independentemente do `meshType`.
 *
 * Función pura: cero efectos secundarios, cero asincronía.
 */
export function generateMesh(
  meshType: MeshType,
  config: RadialLayoutConfig,
  centerX: number,
  centerY: number,
  ringRadii: readonly number[],
  nodeLevels: ReadonlyMap<string, number>,
  startAngle: number,
): readonly MeshElement[] {
  const elements: MeshElement[] = []

  // Polígono perimetral (independente do meshType)
  if (config.polygon !== undefined) {
    elements.push(buildPolygon(config.polygon, centerX, centerY))
  }

  switch (meshType) {
    case 'none':
      // Cero elementos adicionais.
      break

    case 'rings':
      for (const radius of ringRadii) {
        elements.push({
          type: 'circle',
          center: { x: centerX, y: centerY },
          radius,
        })
      }
      break

    case 'cross': {
      // Calcular extensión: max ringRadius ou polygon radius
      const maxR = Math.max(...ringRadii, config.polygon?.radius ?? 0)
      elements.push({
        type: 'line',
        from: { x: centerX - maxR, y: centerY },
        to: { x: centerX + maxR, y: centerY },
      })
      elements.push({
        type: 'line',
        from: { x: centerX, y: centerY - maxR },
        to: { x: centerX, y: centerY + maxR },
      })
      break
    }

    case 'star': {
      // N radios desde centro, N = número de roots (nodos de nivel 0)
      let rootsCount = 0
      for (const level of nodeLevels.values()) {
        if (level === 0) rootsCount++
      }
      // Caso excepcional: 1 root só => 1 radio único (estética
      // probablemente non desexada, pero coherente co algoritmo).
      // Caso 0 roots: cero radios (defensivo; non debería pasar
      // con TreeDef válido).
      const maxR = Math.max(...ringRadii, config.polygon?.radius ?? 0)
      for (let i = 0; i < rootsCount; i++) {
        const angle = startAngle + i * (2 * Math.PI / Math.max(rootsCount, 1))
        elements.push({
          type: 'line',
          from: { x: centerX, y: centerY },
          to: {
            x: centerX + maxR * Math.cos(angle),
            y: centerY + maxR * Math.sin(angle),
          },
        })
      }
      break
    }
  }

  return elements
}

function buildPolygon(
  polygon: { sides: number; radius: number },
  centerX: number,
  centerY: number,
): MeshElement {
  const points: Position[] = []
  for (let i = 0; i < polygon.sides; i++) {
    const angle = -Math.PI / 2 + i * (2 * Math.PI / polygon.sides)
    points.push({
      x: centerX + polygon.radius * Math.cos(angle),
      y: centerY + polygon.radius * Math.sin(angle),
    })
  }
  return { type: 'polygon', points }
}
```

**Decisión**:
- **`generateMesh` é función pura exportada**, NON método de clase.
- **Cero clase MeshGenerator** (clase só engade overhead).
- **buildPolygon é privado** (helper interno).

### 5.8 — Caso especial: 1 root vs múltiples roots

**1 root**: posición = `(centerX, centerY)`. **Nivel 0 = (centerX,
centerY) exacto**. Os fillos directos van ao **nivel 1** (raio
`radius * 1`).

**N > 1 roots**: roots distribúense uniformemente no **nivel 1** (raio
`radius * 1`). Os seus fillos van ao **nivel 2** (raio `radius * 2`).

**Implementación**:
```ts
const allLevels = Array.from(nodeLevels.values())
const minLevel = Math.min(...allLevels)
// Se 1 só root: minLevel = 0 → ese root vai a (centerX, centerY).
// Se N roots: shift de niveis +1 visual.
```

**Decisión arquitectónica**: NON facer shift dos niveis (manter os
valores reais de BFS). En vez diso, **adaptar o cálculo do raio**:

```ts
function ringRadius(level: number, isSingleRoot: boolean, radius: number): number {
  if (isSingleRoot) {
    return level * radius // 0 para root, 1*radius para nivel 1, etc.
  }
  return (level + 1) * radius // shift visual: +1 raio para todos
}
```

**Documentar no JSDoc**: o nivel BFS é separado do raio visual.

### 5.9 — DependencyGraph integración

T0 verifica:
- **Constructor**: `new DependencyGraph(treeDef)` ou
  `new DependencyGraph(options)` con build manual?
- **`getRoots()`**: devolve `string[]` con nodos sen incoming?
- **`getOutgoing(nodeId)`**: devolve fillos directos?

**Se a API difire substancialmente**, ESCALAR antes de implementar.

### 5.10 — Cero modificación de pezas existentes

**Cero modificación** de:
- IdentityLayout (4.1 intacta).
- LayoutEngine.ts, LayoutEngineRegistry.ts, computeLayout.ts (4.1
  intactas).
- DependencyGraph (reutilízase, NON se modifica).
- TreeEngine, ProgressManager, schemas, etc.
- LayoutConfig en tree.ts (segue intacto da 4.1).
- BaseLayoutConfig (engadido en 4.1 con cero modificación agora).

**SI se modifica**:
- `LayoutResult.ts` para engadir `mesh?` opcional + tipo MeshElement.
  **Cero ruptura** porque mesh é opcional.

### 5.11 — Cero ErrorCodes novos

`LAYOUT_COMPUTE_FAILED` (YGG_L002) **estréase nesta sub-fase** (4.1
anticipouno como constante). Cero códigos adicionais.

### 5.12 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts`:

```ts
export { RadialLayout } from './layouts/RadialLayout.js'
export type {
  RadialLayoutConfig,
  PolygonConfig,
  MeshType,
} from './layouts/RadialLayoutConfig.js'
export { parseRadialConfig } from './layouts/RadialLayoutConfig.js'
export { generateMesh } from './layouts/MeshGenerator.js'
export type { MeshElement } from './layouts/LayoutResult.js'
```

### 5.13 — Tests funcionais

Crear catro ficheiros de test en
`packages/core/__tests__/engine/layouts/`:

**`RadialLayoutConfig.test.ts`** (~10 tests):
1. parseRadialConfig con config válido: ok.
2. type !== 'radial': err(LAYOUT_COMPUTE_FAILED).
3. radius ausente: err.
4. radius negativo: err.
5. radius cero: err.
6. radius NaN/Infinity: err.
7. polygon.sides < 3: err.
8. polygon.radius <= 0: err.
9. meshType valor inválido: err.
10. Locale propaga.

**`RadialLayout.test.ts`** (~20 tests):

*Casos básicos:*
1. TreeDef baleiro: bounds (0,0,0,0), nodes/edges vacíos.
2. 1 root só sen fillos: nodo en (centerX, centerY).
3. 1 root con 4 fillos directos: fillos no nivel 1 (raio = radius),
   distribuídos uniformemente.
4. 2 roots: distribuídos no nivel 1 (shift).
5. Diamond (A → B → D, A → C → D): D no nivel 2.
6. Linear chain (A → B → C → D): cada un no seu nivel.

*Edge cases:*
7. Nodo illado (sen prereqs nin sucesores): tratase como root.
8. centerX/centerY non-zero: posicións desprazadas.
9. startAngle custom: rotación aplicada.
10. radius distinto: distancias entre niveis cambia proporcionalmente.

*Determinismo:*
11. Mesma TreeDef dúas chamadas: mesmas posicións.
12. Reordenar nodes en TreeDef: cambia orde dentro de nivel.

*Bounds:*
13. Bounds inclúe min/max das posicións dos nodos.
14. Bounds inclúe polygon se está definido.

*Validación:*
15. Config inválido (type !== 'radial'): err.

*Mesh integration:*
16. meshType='none': mesh = [].
17. meshType='rings': mesh ten N círculos = N niveis.
18. meshType='cross': mesh ten 2 liñas.
19. polygon definido: mesh inclúe o polígono.

*NodeDef.position ignorase:*
20. NodeDef.position ignorase totalmente; usa BFS.

**`MeshGenerator.test.ts`** (~12 tests):

*meshType variants:*
1. 'none': cero elementos (salvo polígono se aplica).
2. 'rings': N círculos para N niveis.
3. 'cross': exactamente 2 liñas.
4. 'star': N liñas para N roots.

*Polygon:*
5. polygon sides=3: triángulo con 3 vértices.
6. polygon sides=4: cadrado con 4 vértices.
7. polygon sides=6: hexágono.
8. polygon NON definido: cero polígono no resultado.

*Combinacións:*
9. 'rings' + polygon: ambos no resultado.
10. 'none' + polygon: só polígono no resultado.

*Edge cases:*
11. cero ringRadii (TreeDef sen niveis profundos): 'rings' produce
    cero círculos.
12. cero roots (0 nodos de nivel 0): 'star' produce cero radios.

**`RadialLayout.integration.test.ts`** (~8 tests):
1. Rexistrar RadialLayout no LayoutEngineRegistry + computeLayout
   funciona.
2. TreeDef con layout.type='radial' usa RadialLayout.
3. Config inválido propaga err via computeLayout.
4. Resultado ten layoutType='radial'.
5. Resultado ten mesh definido (campo opcional poblado).
6. IdentityLayout (4.1) NON modifica mesh (segue sen mesh ou
   undefined).
7. Múltiples engines no registry: usa o correcto.
8. Locale propaga.

**Total: ~50 tests**.

### 5.14 — Cobertura

- `RadialLayout.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch (lección
  3.5 L1 aplicable).
- `RadialLayoutConfig.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch.
- `MeshGenerator.ts`: 100% Stmts/Funcs/Lines, ≥95% Branch.
- Global core: non baixar de baseline (98.23%).

### 5.15 — Cero ErrorCodes adicionais en common

Cero modificación de `packages/common/`. `LAYOUT_COMPUTE_FAILED` xa
existe.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/layouts/RadialLayout.ts` (NOVO)
- `packages/core/src/engine/layouts/RadialLayoutConfig.ts` (NOVO)
- `packages/core/src/engine/layouts/MeshGenerator.ts` (NOVO)
- `packages/core/src/engine/layouts/LayoutResult.ts` (MODIFICADO:
  engadir `mesh?` + tipo `MeshElement`)
- `packages/core/src/engine/index.ts` (MODIFICADO: +5 exports)

**Tests:**
- `packages/core/__tests__/engine/layouts/RadialLayoutConfig.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/RadialLayout.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/MeshGenerator.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/RadialLayout.integration.test.ts`
  (NOVO)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións CRÍTICAS

1. `pnpm install`. Confirma 1023 tests core + 60 common + 171
   storage con `--force`.

2. **VERIFICACIÓN CRÍTICA**: API exacta de DependencyGraph.
   ```
   grep -B1 -A3 "constructor\|getRoots\|getOutgoing\|getDependencies\|getLeaves\|getNodeIds" \
     packages/core/src/engine/DependencyGraph.ts | head -30
   ```
   Confirma:
   - Sinatura do constructor (acepta TreeDef ou outro?).
   - `getRoots(): string[]` ou similar.
   - `getOutgoing(nodeId: string): string[]` ou similar.
   Se difire substancialmente do asumido en §5.4, **ESCALAR**.

3. **Verifica que mesh? non é xa esperado por algún test**:
   ```
   grep -rn "mesh" packages/core/__tests__/engine/layouts/
   ```
   Espera cero resultados (mesh é campo novo desta sub-fase).

4. **Verifica que LAYOUT_COMPUTE_FAILED existe en common con
   mensaxes nas 3 locales** (engadido en 4.1):
   ```
   grep -A4 "LAYOUT_COMPUTE_FAILED" packages/common/src/errors/messages.ts
   ```

### T1 — Ampliar LayoutResult (5.6)

Editar `packages/core/src/engine/layouts/LayoutResult.ts`:
- Engadir tipo `MeshElement` (discriminated union).
- Engadir campo `mesh?: readonly MeshElement[]` a `LayoutResult`.

Typecheck 20/20. Cero ruptura esperada (campo opcional).

### T2 — RadialLayoutConfig + parseRadialConfig (5.2 + 5.3)

Crear `packages/core/src/engine/layouts/RadialLayoutConfig.ts` con:
- `MeshType` type.
- `PolygonConfig` interface.
- `RadialLayoutConfig` interface (extends BaseLayoutConfig).
- `parseRadialConfig` función validadora.

Typecheck 20/20.

### T3 — Tests RadialLayoutConfig (5.13)

Crear `__tests__/engine/layouts/RadialLayoutConfig.test.ts` con ~10
tests. **Cobertura 100% incluído error paths**.

### T4 — MeshGenerator (5.7)

Crear `packages/core/src/engine/layouts/MeshGenerator.ts` con función
pura `generateMesh` + helper privado `buildPolygon`.

Typecheck 20/20.

### T5 — Tests MeshGenerator (5.13)

Crear `__tests__/engine/layouts/MeshGenerator.test.ts` con ~12 tests.
**Cobertura 100% Stmts/Funcs/Lines, ≥95% Branch**.

### T6 — RadialLayout (5.4 + 5.5 + 5.8)

Crear `packages/core/src/engine/layouts/RadialLayout.ts` con clase
LayoutEngine implementando o algoritmo BFS + sectores iguais.

JSDoc completo da clase + cada método privado.

**Importante** no implementación:
- Reutilizar DependencyGraph (T0.2 confirmou API).
- Caso especial 1 root vs N roots (5.8).
- NodeDef.position **completamente ignorado**.
- Determinismo: orde dos nodos coincide con treeDef.nodes.

Typecheck 20/20.

### T7 — Tests RadialLayout (5.13)

Crear `__tests__/engine/layouts/RadialLayout.test.ts` con ~20 tests.

### T8 — Tests integración (5.13)

Crear `__tests__/engine/layouts/RadialLayout.integration.test.ts` con
~8 tests que verifican RadialLayout + LayoutEngineRegistry +
computeLayout.

### T9 — Exportar dende engine/index.ts (5.12)

Engadir 5 exports.

### T10 — Verificación post-T9

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 1023 tests previos seguen pasando intactos.
- 60 common previos intactos.
- 171 storage previos intactos.

### T11 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- RadialLayoutConfig.ts 100/100/100/100.
- MeshGenerator.ts 100/≥95%/100/100.
- RadialLayout.ts 100/≥95%/100/100.
- Global core ≥98%.

### T12 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/layouts/
pnpm test
```

**Nota sobre `unknown`**: cero esperado salvo no `parseRadialConfig`
onde se valida `config.radius` etc. via `typeof` con narrowing. **Iso
é intencional** (input é loose `LayoutConfig`).

- Changeset **minor** para `@yggdrasil-forge/core` (engade API nova).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `RadialLayout` (LayoutEngine para type='radial'): algoritmo de
    árbore radial clásica con BFS desde os roots da DependencyGraph
    + sectores angulares iguais por nodo.
  - `RadialLayoutConfig`, `PolygonConfig`, `MeshType` tipos exportados.
  - `parseRadialConfig(config, locale?)` helper validador.
  - `MeshElement` discriminated union exportado (line/circle/polygon).
  - `generateMesh(meshType, config, ...)` función pura exportada.
  - `LayoutResult.mesh?: readonly MeshElement[]` campo opcional
    engadido (cero ruptura).
  - Estréase o ErrorCode `LAYOUT_COMPUTE_FAILED` (YGG_L002) anticipado
    en 4.1: úsase en parseRadialConfig para validación.

  ### Note
  - RadialLayout **ignora `NodeDef.position`**. Para posicións
    manuais, use o layout 'custom' (IdentityLayout). RadialLayout é
    algoritmo automático.
  - **DT-16 (NOVO non bloqueante)**: RadialLayout usa sectores
    iguais por nodo, cero proporcional a número de descendentes.
    Para árbores desbalanceadas pode producir sobreposición visual.
    Algoritmo proporcional diferido a sub-fase futura.
  - Subpath exports `/layouts/*` diferidos a sub-fase futura
    específica de bundle splitting (require tocar tsup config
    integrado co fix de DT-14).
  ```

### T13 — Commit + push

Commit Conventional:
`feat(core): add RadialLayout and MeshGenerator (sub-phase 4.2)`.
Push directo a `origin/main` (base `0bcc66d`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/layouts/RadialLayout.ts` (NOVO)
- `packages/core/src/engine/layouts/RadialLayoutConfig.ts` (NOVO)
- `packages/core/src/engine/layouts/MeshGenerator.ts` (NOVO)
- `packages/core/src/engine/layouts/LayoutResult.ts` (MODIFICADO)
- `packages/core/src/engine/index.ts` (MODIFICADO)
- `packages/core/__tests__/engine/layouts/RadialLayoutConfig.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/layouts/RadialLayout.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/MeshGenerator.test.ts` (NOVO)
- `packages/core/__tests__/engine/layouts/RadialLayout.integration.test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/common/`.
- `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, ou outros globais.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/src/engine/DependencyGraph.ts` (reutilízase sen
  modificar).
- `packages/core/src/engine/layouts/IdentityLayout.ts`,
  `LayoutEngine.ts`, `LayoutEngineRegistry.ts`, `computeLayout.ts`
  (4.1 intactos).
- `packages/core/src/types/tree.ts` (LayoutConfig segue intacto da
  4.1).
- Tests existentes da 4.1 (cero modificación).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar algoritmo de sectores proporcional (5.5: simplificado
  con sectores iguais; DT-16 diferida).
- ❌ Permitir override de `tier?` no NodeDef (decisión do director:
  diferido para sub-fase futura específica).
- ❌ Modificar NodeDef (5.10).
- ❌ Modificar DependencyGraph (5.10).
- ❌ Modificar IdentityLayout (5.10: 4.1 intacta).
- ❌ Implementar subpath exports `/layouts/*` (decisión do autor:
  diferido).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  globais (lección 3.4 L1).
- ❌ Modificar `packages/common/`.
- ❌ Modificar `packages/storage/`.
- ❌ Engadir ErrorCodes (5.11).
- ❌ Implementar PathBuilder con curvas (4.5).
- ❌ Implementar BoundsCalculator con QuadTree (4.5: bounds simple en
  4.2).
- ❌ Usar `NodeDef.position` no algoritmo radial (5.2: ignorase).
- ❌ Validar EdgeDef ou TreeDef (validación é doutra capa).
- ❌ Crear clase MeshGenerator (5.7: función pura).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 4.2 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 0bcc66d)
✅ RadialLayout (type='radial') con BFS + sectores iguais
✅ RadialLayoutConfig + PolygonConfig + MeshType tipos exportados
✅ parseRadialConfig validador con LAYOUT_COMPUTE_FAILED (estrea
   YGG_L002 anticipado en 4.1)
✅ MeshGenerator (función pura) con 4 meshType (none/rings/cross/star)
✅ MeshElement discriminated union (line/circle/polygon)
✅ LayoutResult ampliado con `mesh?` opcional (cero ruptura)
✅ Reutilización de DependencyGraph (cero modificación)
✅ NodeDef.position ignorase totalmente en RadialLayout
✅ Cero modificación de pezas existentes (4.1, DependencyGraph, etc.)
✅ Cero modificación de common/storage/tsconfig/tsup
✅ T0.2 API DependencyGraph verificada: <constructor + métodos clave>
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> RadialLayoutConfig (validación)
   - <Y> RadialLayout (algoritmo)
   - <Z> MeshGenerator (xeometría)
   - <W> RadialLayout.integration
✅ Cobertura:
   - RadialLayoutConfig 100/<X%>/100/100
   - RadialLayout 100/<X%>/100/100
   - MeshGenerator 100/<X%>/100/100
   - Global core: <X%> (baseline 98.23%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - Sectores iguais por nodo (cero proporcional a descendentes;
     DT-16 NOVA non bloqueante).
   - NodeDef.position ignorase totalmente (use 'custom' layout
     para posicións manuais).
   - Edges como liñas rectas (4.5 PathBuilder pode mellorar).
   - Subpath exports /layouts/* diferidos a sub-fase futura.
✅ Changeset minor (core) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 4.3 (TreeLayout) ou outra que decida o director.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 4.2. Primeiro layout matemático real da Fase 4.
Calquera caso non cuberto → ESCALAR.*
