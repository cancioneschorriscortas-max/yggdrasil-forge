# Tutorial del curriculum — componiendo subárboles anidados

> Modela un curso multinivel como **datos puros**: anclas más un registro `subtrees` recursivo, con puertas según lo completo que esté cada módulo. Este es el hermano *mínimo* — aísla la **composición**. Para la cáscara de consumidor pulida (HUD, por-qué-bloqueado, UI de drill-in), ver la [guía de Learn Yggdrasil Forge](./learn-yggdrasil-walkthrough.es.md).
> Cada fragmento de abajo es código real de `examples/curriculum`.

![Programming 101 en marcha](./img/curriculum-overview.png)

## El modelo mental

```
TreeDef padre
   │  un nodo con type: 'subtree_anchor' + subtreeId
   ▼
subtree_anchor ──apunta a──► TreeDef hijo     registrado bajo parent.subtrees
   │  el hijo puede llevar subtree_anchors también…
   ▼
…recursivamente, a cualquier profundidad
```

Un curso no es una estructura especial — es un `TreeDef` cuyos nodos apuntan a *otros* `TreeDef`. El motor trata cada profundidad de forma idéntica; las puertas entre módulos son solo un porcentaje de lo completo que está un subárbol.

## 1. Un módulo es solo un TreeDef

Tres helpers mantienen los datos legibles (cópialos):

```ts
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { EdgeDef, NodeDef, TreeDef } from '@yggdrasil-forge/core'

const lesson = (id: string, label: string, needs?: string): NodeDef =>
  needs === undefined
    ? { id, type: 'small', label: { en: label } }
    : { id, type: 'small', label: { en: label }, prerequisites: { type: 'node_unlocked', nodeId: needs } }

const edge = (source: string, target: string): EdgeDef =>
  ({ id: `${source}__${target}`, source, target, type: 'dependency' })

const scaffold = (id: string, label: string): Omit<TreeDef, 'nodes' | 'edges' | 'subtrees'> => ({
  id, schemaVersion: SCHEMA_VERSION, version: '1.0.0', label: { en: label },
  layout: { type: 'tree', nodeSpacing: 180, levelSpacing: 150 },
  startingBudget: { resources: { xp: 999 } },            // los desbloqueos son gratis → clic-para-completar
  resources: [{ id: 'xp', label: { en: 'XP' }, refundable: true, refundPercent: 100 }],
})
```

Un módulo es entonces un árbol normal de lecciones:

```ts
const fundamentals: TreeDef = {
  ...scaffold('fundamentals', 'Fundamentals'),
  nodes: [
    lesson('variables', 'Variables'),
    lesson('control-flow', 'Control flow', 'variables'),    // necesita variables
    lesson('functions', 'Functions', 'control-flow'),
  ],
  edges: [edge('variables', 'control-flow'), edge('control-flow', 'functions')],
}
```

## 2. Componer: anclas + un registro `subtrees`

Para meter un módulo *dentro* de otro árbol, añade un nodo con `type: 'subtree_anchor'` y un `subtreeId`, y registra el hijo bajo `subtrees`:

```ts
const trees: TreeDef = {                                   // un módulo de nivel 2
  ...scaffold('trees', 'Trees'),
  nodes: [lesson('binary-tree', 'Binary tree'), lesson('bst', 'Binary search tree', 'binary-tree')],
  edges: [edge('binary-tree', 'bst')],
}

const dataStructures: TreeDef = {
  ...scaffold('data-structures', 'Data Structures'),
  nodes: [
    lesson('arrays', 'Arrays'),
    lesson('maps', 'Maps', 'arrays'),
    { id: 'trees-anchor', type: 'subtree_anchor', label: { en: 'Trees (nested)' },
      subtreeId: 'trees', prerequisites: { type: 'node_unlocked', nodeId: 'arrays' } },
  ],
  edges: [edge('arrays', 'maps'), edge('arrays', 'trees-anchor')],
  subtrees: { trees },     // ← `trees` es a su vez un TreeDef completo → dos niveles de anidamiento
}
```

Como un subárbol es *a su vez* un `TreeDef`, puede llevar sus propios `subtrees` — el anidamiento es recursivo, sin caso especial a ninguna profundidad.

![Estructura anidada](./img/curriculum-nesting.svg)

## 3. Puertas entre módulos: `subtree_completion`

Los módulos se desbloquean según lo completo que esté un subárbol prerrequisito. `subtree_completion` es un porcentaje (0–100): nodos desbloqueados ÷ total × 100. Tres patrones de cableado cubren la mayoría de los cursos:

```ts
// CADENA — Data Structures se abre cuando Fundamentals está del todo terminado
prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 }

// PARALELO — Web depende del mismo Fundamentals: una rama hermana, no una secuela
prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 }

// CONVERGENCIA — el Capstone necesita AMBAS ramas finales a la vez
prerequisites: { type: 'all', conditions: [
  { type: 'subtree_completion', subtreeId: 'algorithms', percent: 100 },
  { type: 'subtree_completion', subtreeId: 'web',        percent: 100 },
]}
```

Este curso usa el **100%** (todas las lecciones obligatorias). Bájalo a `80` y un módulo se abre antes de agotar su prerrequisito — esa es la decisión que toma el curso de [Learn Yggdrasil Forge](./learn-yggdrasil-walkthrough.es.md).

> Los prerrequisitos controlan solo el *desbloqueo* — no son invariantes continuos. Bajar el progreso de un subárbol más tarde no vuelve a bloquear un módulo ya abierto.

## 4. La raíz: montar el curso

La raíz es un `TreeDef` como cualquier otro. Usa `layout: { type: 'custom' }` porque el curso es un DAG con una convergencia (el Capstone tiene dos padres), así que los nodos se colocan a mano en un diamante limpio:

```ts
export const curriculumDef: TreeDef = {
  ...scaffold('programming-101', 'Programming 101'),
  layout: { type: 'custom' },
  nodes: [
    { id: 'mod-fundamentals', type: 'subtree_anchor', label: { en: 'Fundamentals' },
      subtreeId: 'fundamentals', position: { x: 300, y: 40 } },
    { id: 'mod-data-structures', type: 'subtree_anchor', label: { en: 'Data Structures' },
      subtreeId: 'data-structures', position: { x: 150, y: 200 },
      prerequisites: { type: 'subtree_completion', subtreeId: 'fundamentals', percent: 100 } },
    // …mod-web (paralelo) y mod-algorithms (tras data-structures)…
    { id: 'capstone', type: 'keystone', label: { en: 'Capstone project' }, position: { x: 300, y: 540 },
      prerequisites: { type: 'all', conditions: [
        { type: 'subtree_completion', subtreeId: 'algorithms', percent: 100 },
        { type: 'subtree_completion', subtreeId: 'web',        percent: 100 },
      ] } },
  ],
  edges: [
    edge('mod-fundamentals', 'mod-data-structures'), edge('mod-fundamentals', 'mod-web'),
    edge('mod-data-structures', 'mod-algorithms'),
    edge('mod-algorithms', 'capstone'), edge('mod-web', 'capstone'),
  ],
  subtrees: { fundamentals, 'data-structures': dataStructures, algorithms, web },
}
```

> **Gotcha — dale aire a los layouts `tree`.** El solver coloca los nodos pero aún no mide el ancho de las etiquetas, así que hermanos con poco espacio solapan su texto. El `scaffold` de arriba usa `nodeSpacing`/`levelSpacing` generosos a propósito; la raíz usa `custom` con `position`s a mano por lo mismo.

## 5. Renderizarlo, y entrar

Renderizar un árbol compuesto no se diferencia de cualquier otro — crea un motor, pásalo a un `<SkillTree>`:

```ts
import { TreeEngine } from '@yggdrasil-forge/core'

const engine = new TreeEngine(curriculumDef)
// <SkillTree engine={engine} onNodeClick={id => engine.unlock(id)} />
```

Abrir un módulo entra en su subárbol. `enterSubtree` devuelve el hijo como un **nuevo `TreeEngine`** que renderizas con el **mismo `<SkillTree>`**:

```ts
const res = engine.enterSubtree('fundamentals')   // → Result<TreeEngine>
if (res.ok) {
  // renderiza res.value con el mismo <SkillTree>; mantén una pila para subir
}
```

Ese es el drill-in mínimo. La [guía de Learn Yggdrasil Forge](./learn-yggdrasil-walkthrough.es.md) construye la versión pulida sobre estas mismas llamadas — una miga de pan, progreso por módulo y un panel de "¿por qué está bloqueado?".

## 6. Ejecutarlo

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/curriculum dev
```

## En una línea

Un curso multinivel es solo *datos*: anclas + `subtreeId` + un registro `subtrees` recursivo, con puertas `subtree_completion`. El motor trata cada profundidad de forma idéntica, y un `<SkillTree>` renderiza cada nivel — sin código de motor a medida, sin caso especial para el anidamiento.
