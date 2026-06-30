# 01 — Guía do editor de Yggdrasil Forge

**Para quen abre o editor e quere construír un skill tree sen necesariamente coñecer o código.**

---

## Que é o editor

Yggdrasil Forge é un editor visual de **grafos de progresión**: skill trees, currículos educativos, tech trees, árbores de quests… Calquera estrutura de "para chegar a B precisas A primeiro" pódese modelar coa mesma ferramenta.

O editor é unha **app web** (vive en `examples/editor`, accesible co comando `pnpm --filter @yggdrasil-forge-examples/editor run dev`).

### Dous modos: Authoring e Preview

Na esquina superior dereita verás dous botóns: **Authoring** e **Preview**.

- **Authoring**: estás **editando** a árbore. Podes mover nodos, cambiar propiedades, engadir effects, etc.
- **Preview**: estás **xogando** a árbore como o faría o usuario final. Podes facer clic nos nodos para desbloquealos, ver como medran os tiers, etc. **Os cambios feitos en Preview non se gardan na árbore** — son simulación.

Comeza en Authoring. Cambia a Preview para probar como queda. Volta a Authoring para axustar.

---

## Os catro paneis

A pantalla está dividida en catro paneis. Podes redimensionalos arrastrando os bordes entre eles. Tamén podes pechalos cun ✕ na pestana.

```
┌─────────────────────────────────────────────────────────────┐
│  Yggdrasil editor  | Design  Tree  Testing  ↶  ↷  -  +  | Authoring  Preview │
├─────────┬─────────────────────────────┬─────────────────────┤
│         │                             │                     │
│Outliner │           Canvas            │       Inspector     │
│         │                             │                     │
│ pan     │       (nodos + arestas)     │   SELECTED NODE     │
│ docería │                             │   masa_dulce        │
│         │                             │                     │
│ NODES   ├─────────────────────────────┤   IDENTIDADE        │
│ fariña  │           Problems          │   ID (readonly)     │
│ pan_b…  │                             │   Tipo: notable     │
│         │       (lista de warnings)   │   …                 │
├─────────┴─────────────────────────────┴─────────────────────┤
│ nodes 5 │ edges 4 │ authoring │ World 350×350 │ 1 selected  │
└─────────────────────────────────────────────────────────────┘
```

### 1. Outliner (esquerda)
Lista textual de **GROUPS** e **NODES** da túa árbore. Os ids son os identificadores estables (`pan_básico`, `fariña`, …). Útil para ver dunha ollada todo o que tes.

### 2. Canvas (centro arriba)
O lenzo visual. Aquí pintan os **nodos** (círculos, hexágonos, diamantes…) e as **arestas** (liñas que os conectan). É onde traballas a maior parte do tempo.

### 3. Inspector (dereita)
Cando seleccionas un nodo, aquí apareceren **todas as súas propiedades editables**. Está organizado en tres seccións: Identidade, Aparencia, Lóxica.

### 4. Problems (centro abaixo)
Lista os **warnings** que detecta a "conciencia" do editor (validadores brandos). Por exemplo: exclusións asimétricas, ciclos de prerequisites, layouts que se saen do canvas, effects non soportados. **Clicar un warning leva ao nodo afectado**.

### Status bar (abaixo)
Información rápida: número de nodos e arestas, modo actual, dimensións do mundo, número de seleccionados. **Es a túa "cinta indicadora" de contexto.**

---

## Seleccionar nodos

### Selección simple — clic
Clica un nodo. Aparecera un **anel azul** ao seu redor. O Inspector énchese coas súas propiedades. O Outliner non destaca nada visible (limitación actual; en versións futuras destacarase).

### Selección múltiple — Shift+clic
Mantén **Shift** e clica outros nodos. Cada clic engade ou quita un nodo da selección. **Cada nodo seleccionado leva o seu propio anel.**

Cando hai 2+ seleccionados, o Inspector di "**N seleccionados**" e desactiva os widgets. (A edición de propiedades comúns a varios nodos é unha funcionalidade futura.)

### Selección por área — Shift+arrastra no baleiro
Mantén **Shift** e arrastra co rato sobre o fondo do canvas (non sobre un nodo). Pintarase un **rectángulo azul dashed**. Cando soltas, **todos os nodos cuxa posición está dentro do rect** quedan seleccionados.

### Deseleccionar — clic no baleiro
Clica nun sitio do canvas que non sexa un nodo. A selección lim­pase.

### Cancelar interacción — Escape
Pulsando Escape durante un drag ou marquee, **a operación cancela sin tocar o documento**. Útil cando empezas a arrastrar por erro.

---

## Mover nodos (drag)

1. Clica un nodo e mantén premido.
2. Arrastra. Veras un **ghost semitransparente** na nova posición mentres a posición orixinal segue alí.
3. Solta. O nodo móvese ao destino.

### Mover varios xuntos
Se varios nodos están seleccionados, arrastra **calquera deles**. Todos se moven xuntos mantendo a súa posición relativa. **★ Iso é unha única entrada de history** — podes desfacelos todos cun só undo.

### Pan & Zoom do canvas
- **Arrastra o fondo** (non un nodo) → pan (despraza a vista).
- **Roda do rato** → zoom in/out.
- Os aneis e ghosts **medran e decrecen cos nodos** ao facer zoom.

---

## Inspector — editar propiedades

Cando hai un só nodo seleccionado, o Inspector amósao en tres seccións:

### Identidade
- **ID** *(readonly)*: identificador único. Non se pode cambiar (rompería referencias).
- **Tipo**: selector con 11 valores (`small`, `notable`, `keystone`, `mastery`, `ascendancy`, `root`, `cluster`, `gateway`, `milestone`, `subtree_anchor`, `custom`). O tipo determina o tamaño/forma por defecto e a semántica do nodo (ex.: `keystone` é un nodo importante que cambia gameplay).
- **Etiqueta** (LocalizedString): o texto que se ve no canvas. Acepta string simple ou edición de locale individual se a árbore é multi-idioma.
- **Descrición** (opcional): explicación máis longa para tooltips.

### Aparencia
- **Cor**: color picker. Cambia a cor do nodo.
- **Icona**: id (URL, emoji, slug) que o renderer resolve.
- **Forma**: 5 opcións (`circle`, `square`, `diamond`, `hexagon`, `octagon`). Se non se especifica, derívase do tipo.
- **Tamaño**: número >0 que define o radio.

### Lóxica
**Escalares**:
- **Tier**: rango actual do nodo (para nodos multi-tier).
- **Tier máximo**: cantos rangos pode acadar.

**Estruturados**:
- **Custo**: lista de pares (resource, amount). Cánto costa desbloquear/avanzar este nodo.
- **Cost per tier**: variación de custo por tier (lectura, edición en fase futura).
- **Tiers info**: información de presentación por tier (lectura).
- **Effects**: efectos que pasan ao desbloquear o nodo.
- **Prerrequisitos**: regra de cando se pode desbloquear (lectura, edición en fase futura).
- **Exclusións**: outros nodos mutuamente excluíntes con este.

### Granularidade de undo

**Cada tipo de campo ten unha estratexia distinta para evitar spam:**

- **Texto / número / cor**: o cambio confírmase ao **perder foco** (clica fóra, ou pulsa Tab/Enter). Iso significa que escribir "Pan básico" non xera 10 entradas de undo — só 1.
- **Selectores (Tipo, Forma) e checkboxes**: confírmase **inmediatamente**, porque cada cambio é unha decisión discreta.

Se queres descartar un cambio que estás escribindo, pulsa **Escape** mentres o cursor está no input — o valor reverte ao orixinal e perde foco.

---

## Estruturados — listas editables

Os campos estruturados son listas. Cada entrada ten o seu "×" para quitar e un selector "+ engadir" abaixo.

### Exclusións (lista de IDs)
- Lista os IDs doutros nodos que son mutuamente excluíntes con este.
- **Engadir**: dropdown cos demais nodos da árbore. Selecciona un → engádese á lista.
- **Quitar**: clica ✕ na entrada.

> **⚠ Cuidado coa asimetría**: se engades `A` exclusión sobre `B`, pero `B` non ten `A` como exclusión, aparece un **warning amarelo no panel Problems**: "exclusión asimétrica". Para limpar o warning, vai ao Inspector de `B` e engade `A`.

### Custo (lista de Cost{resourceId, amount})
- Cada entrada: dropdown de resource + número (amount) + ✕.
- **Engadir custo**: dropdown que só amosa os resources que **non** están xa na lista.
- O número confírmase ao perder foco.

> Se a túa árbore non ten `resources` definidos no dato (`tree.resources`), o editor di "A árbore non ten resources definidos." e non podes engadir custos. Engade resources á árbore primeiro (cunha edición externa do dato JSON; non hai aínda UI para iso).

### Effects (lista de Effect)
Cada effect ten un mini-formulario por tipo. **A lista de tipos para "engadir effect" é restrinxida**:

**Tipos planos editables na versión actual:**
- `modify_resource` — sumar/restar/multiplicar un recurso. Params: resourceId, op (+/-/×), amount.
- `modify_node_state` — forzar outro nodo a un estado. Params: nodeId, state (locked/unlockable/unlocked/maxed).
- `set_node_visibility` — mostrar/ocultar outro nodo. Params: nodeId, visible.
- `unlock_node` — desbloquear outro nodo. Params: nodeId.
- `set_progress` — establecer porcentaxe de progreso. Params: nodeId, percent.
- `trigger_event` — disparar un event con nome. Params: eventName (string).

**Tipos NON dispoñibles no selector:**
- `modify_stat`, `plugin` — son **non soportados polo runtime** (★ gate manifesto: a "boca" do editor non pode propoñer cousas que a "conciencia" non sabe aplicar).
- `composite`, `conditional` — son **aniñados** (un effect contén outros). Estarán dispoñibles en fase 2.

> Se a túa árbore xa ten effects de tipo `composite` ou `conditional` (de outra fonte), o editor amósaos como **"N aniñados · edición en fase 2"** e podes quitar a entrada enteira, pero non editar os internos por agora.

---

## Panel Problems — a voz da conciencia

A liña azul ao redor de cada warning indica severidade:
- 🟠 **Amarelo** (warning): algo que **probablemente** queres arranxar.
- 🔴 **Vermello** (error): algo que rompe a árbore.
- 🔵 **Azul** (info): mensaxe informativo.

Cada warning amosa:
1. A severidade.
2. A mensaxe lexible.
3. A referencia (`node: pan_básico` ou `edge: e_42`).
4. O código técnico (`YGG_ED_ASYM_EXCL`).

### Clicar = saltar
**★ Clica calquera warning → o nodo afectado selecciónase automaticamente**, o canvas (se está fora de vista) non se despraza pero o Inspector enche cos datos do nodo, e podes arranxalo directamente.

Iso é o **loop conciencia↔voz**: editas algo dubidoso → o warning aparece → clicas → saltas ao nodo → arránxalo.

### Warnings que verás

| Código | Causa | Como arranxar |
|---|---|---|
| `YGG_ED_ASYM_EXCL` | Exclusión asimétrica: `A` exclúe a `B` pero `B` non exclúe a `A`. | Vai ao Inspector de `B`, sección Lóxica → Exclusións → engade `A`. |
| `YGG_ED_PREREQ_CYCLE` | Ciclo en prerequisites: `A → B → A` (directo ou transitivo). | Atenúa a cadea: alguno dos nodos non pode requirir os anteriores. |
| `YGG_ED_LAYOUT_OVF` | Algún nodo está fóra do `coordinateBounds` definido. | Move o nodo cara dentro, ou expande os bounds da árbore. |
| `YGG_ED_UNSUP_FEAT` | A árbore usa unha funcionalidade que o runtime non soporta (`modify_stat`, `plugin`). | Cambia o effect a un tipo soportado, ou implementa o soporte no runtime. |

> Os warnings son **brandos**: a árbore **pódese gardar** con warnings activos. Pero o usuario final pode topar comportamento inesperado se a árbore se "rebeñe" con eles. O panel Problems é o seu mecanismo de "consciencia" — non bloquea, advirte.

---

## Undo & Redo

Os botóns **↶** e **↷** na top bar (ou Ctrl+Z / Ctrl+Y) desfán/refán **unha entrada de history**.

**O que conta como "unha entrada":**
- 1 drag dun ou varios nodos = 1 entrada.
- 1 cambio dun campo escalar (label, color, …) = 1 entrada.
- 1 add/remove en estruturados (exclusions, cost, effects) = 1 entrada.
- 1 cambio dun param dentro dun effect estruturado = 1 entrada.

Iso significa que **podes desfacer cousas con granularidade razonable**, sin spam (escribir "Pan básico" letra a letra non leva 10 entradas).

---

## Atallos

| Atallo | Acción |
|---|---|
| **Ctrl+Z** | Desfacer |
| **Ctrl+Shift+Z** / **Ctrl+Y** | Refacer |
| **Click nodo** | Seleccionar |
| **Shift+click nodo** | Engadir/quitar selección |
| **Drag nodo** | Mover |
| **Shift+drag baleiro** | Marquee |
| **Drag baleiro** | Pan canvas |
| **Roda rato** | Zoom |
| **Escape** | Cancelar drag/marquee, ou descartar edición no input |
| **Enter** (en input) | Confirmar edición + perder foco |
| **Tab** (en input) | Confirmar + ir ao seguinte campo |

---

## Limitacións actuais (que verás na UI)

Estas funcionalidades aparecen pero **non están dispoñibles** na versión actual:

- **`description`/`label` multi-idioma**: pódese editar a entrada `en` por defecto se a árbore é multi-locale. As outras locales **consérvanse** pero non se poden editar dende o editor. (Banco: "locale do canvas".)
- **`prerequisites`**: a edición das regras `all`/`any`/condición agárdase para a fase 2 de 7.5c-ii (a árbore aniñada).
- **`tiers`, `costPerTier`**: lectura. Edición en fase posterior.
- **Effects `composite`/`conditional`**: lectura. Edición en fase 2 (a árbore aniñada de effects).
- **Edición común multi-selección**: cando hai >1 nodos seleccionados, non podes editar propiedades simultaneamente. Selecciona dun en un por agora.
- **Tools de creación** (engadir nodo novo, engadir aresta nova): non hai aínda UI. Engade os nodos editando o JSON da árbore directamente.
- **Open / Save / Import-Export**: o editor carga unha fixture hardcoded (`panadeiro`) ao arranque. Para cambiar a árbore tes que tocar o `main.tsx` ou esperar a unha futura pantalla de bienvida.

---

## Que vén despois

A guía actualízase cando entrega novas fases:

- **7.5c-ii fase 2** — `prerequisites` editable (a árbore aniñada all/any/condition), effects `composite`/`conditional` editables.
- **7.5d** — Tools de creación (engadir/quitar nodos, arestas).
- **7.5e+** — pantalla de bienvida, import/export, locale do canvas.

Para entender **por que** o editor se comporta así, le a [Guía de arquitectura](./02-architecture-guide.md).
Para **engadir capacidades** ti mesmo, le a [Guía de extensión](./03-extension-guide.md).
