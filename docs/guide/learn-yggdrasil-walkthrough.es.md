# Tutorial de Learn Yggdrasil Forge — la cáscara de consumidor pulida

> **Destacados**
> - Un curso anidado — la misma composición-como-datos que el [tutorial del Curriculum](./curriculum-walkthrough.es.md), ahora con una **cáscara de consumidor pulida** encima.
> - **El drill-in es 100% consumidor-side**: una pila de motores + una miga de pan sobre `enterSubtree` — **cero cambios en `@core` o `@react`**.
> - Las puertas de los módulos usan **`subtree_completion` al 80%** (el Curriculum usa 100%) — no necesitas todas las lecciones para avanzar.
> - La cáscara añade un HUD, un panel de "por qué está bloqueado" y una afordancia de seleccionar/abrir — todo desde la API pública.

![Learn Yggdrasil Forge en marcha](./img/learn-yggdrasil-overview.png)
<!-- captura: poner aquí una captura del ejemplo learn-yggdrasil en marcha -->

## Qué muestra este ejemplo

`examples/learn-yggdrasil` es un curso **sobre Yggdrasil Forge, construido con Yggdrasil Forge**. Sus módulos — Core concepts, React rendering, Layouts, Nesting & composition — son a su vez árboles de habilidades, con puertas y compuestos como cualquier otra progresión. Mientras el [tutorial del Curriculum](./curriculum-walkthrough.es.md) mantiene la UI deliberadamente sobria para aislar la *composición*, este hermano envuelve el mismo motor en una **cáscara pulida** para mostrar cómo es una UI de consumidor real — sin tocar la librería.

## La forma: un curso como subárboles anidados

El árbol padre `learn-yggdrasil` (layout `custom`) tiene cuatro anclas de módulo más un capstone:

- **Core concepts** — la entrada; sin prerrequisito.
- **React rendering** y **Layouts** — ambos con puerta sobre Core (ramas paralelas).
- **Nesting & composition** — con puerta sobre React *y* Layouts (una convergencia).
- **Capstone** — un `keystone` con puerta sobre los cuatro.

Cada ancla lleva un `subtreeId` que apunta a un `TreeDef` completo en el registro `subtrees` del padre. Un módulo — Core concepts — anida otro subárbol (`gates-deep`) tras su ancla **Gates ↳**, dando **dos niveles** de composición. Nada de esto es un caso especial: es el mismo modelo de datos a cualquier profundidad.

## Puertas: `subtree_completion` al 80%

Los módulos se desbloquean según lo completo que esté un subárbol prerrequisito. `subtree_completion` es un porcentaje (0–100): nodos desbloqueados ÷ total × 100. Este curso pone la puerta al **80%** en vez del 100% — un contraste deliberado con el Curriculum. El mensaje: quien aprende no tiene que terminar *todas* las lecciones de Core para empezar React o Layouts; con la mayoría basta. Las convergencias usan una regla `all` (Nesting necesita React **y** Layouts al 80%; el Capstone necesita los cuatro).

Los prerrequisitos controlan el *desbloqueo*; no son invariantes continuos, así que bajar el progreso más tarde no vuelve a bloquear lo ya abierto.

## Drill-in: una pila de motores, un solo renderizador

![El drill-in es consumidor-side](./img/learn-yggdrasil-drillin.svg)

Abrir un módulo entra en su subárbol. `engine.enterSubtree(subtreeId)` devuelve un **`TreeEngine` hijo**, y ese hijo se renderiza con el **mismo componente `<SkillTree>`** que el padre. La cáscara mantiene una pila de migas `{ engine, label }`; el `goTo(i)` de la miga de pan sube de nivel.

Este es el mensaje de adopción: un drill-in pulido y multinivel se construye **enteramente sobre la API pública** — `enterSubtree`, `getSnapshot`, `subscribe` — **sin cambios en `@core` ni `@react`**. El renderizador nunca se entera del anidamiento; lo compone el consumidor.

## La cáscara pulida

![Anatomía de la cáscara](./img/learn-yggdrasil-shell.svg)

Todo lo que rodea al árbol es código de consumidor llano (~260 líneas), y cada región se alimenta de una llamada a la API pública:

- **HUD** (`.ly-hud`) — título más una barra de progreso del nivel actual, desde `currentProgress(engine)`.
- **Miga de pan** (`.ly-crumb`) — la pila de motores renderizada como enlaces; `goTo(i)` regresa a un nivel.
- **Barra de selección** (`.ly-select`) — muestra uno de tres estados para el nodo seleccionado: progreso del subárbol (si es un ancla abierta), una lista de **por qué bloqueado** (si está bloqueado), o un botón **Open** explícito (si es un ancla desbloqueada). La lista de por-qué-bloqueado viene de `explainUnlock(id)`, que devuelve cada condición con un ✓/✗ y una razón legible.
- **Lienzo** (`.ly-canvas`) — el propio `<SkillTree>`, bajo un `ThemeProvider`. `onNodeClick` distingue un **clic simple (selecciona)** de un **doble clic en menos de 300 ms (abre el ancla)**, y un `unlock(id)` de "dispara y olvida" gestiona las lecciones — el `canUnlock` del motor es el guardián real.

## El tema académico

El curso usa un tema `academic` — papel `#faf8f2`, tinta `#1f2933`, teal para desbloqueado, sepia para maximizado — y activa `maxLabelChars: 14`, de modo que etiquetas largas como `unlock / canUnlock` se truncan con puntos suspensivos y un tooltip al pasar el ratón, mientras el texto completo permanece en el `aria-label`. La librería aporta el *mecanismo* (truncado opcional); el consumidor elige la *política* (aquí, un aspecto académico más denso). El mismo motor, otra piel.

## Ejecutarlo

```bash
pnpm install
pnpm --filter @yggdrasil-forge-examples/learn-yggdrasil dev
```

## Resumen

Un curso pulido sigue siendo solo *datos más una cáscara de consumidor*. Los datos son anclas + `subtreeId` + un registro `subtrees` recursivo con puertas `subtree_completion`; la cáscara es una pila de motores, una miga de pan, un HUD y una barra de selección — todo sobre la API pública. El drill-in, el panel de por-qué-bloqueado, las barras de progreso: nada de eso necesitó un solo cambio en `@core` ni en `@react`.
