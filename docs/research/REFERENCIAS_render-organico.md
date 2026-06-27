# Referencias de render orgánico — conectores, pertenza a cluster, root

> Documento de **referencia** (non normativo). Captura as técnicas e repos atopados
> mentres se buscaba como mellorar o aspecto da árbore central de Oberón
> (estrela radial: panadeiro). Obxectivo: que **F12/F13 non reinventen** e que as
> fontes queden documentadas no proxecto. Cada técnica leva a súa orixe explícita ao
> final (§7).
>
> Contexto: o exemplo `examples/oberon-panadeiro` chegou a unha estrela `clustered-radial`
> con `memberLayout: 'fan'` (forma confirmada), pero o render aínda é esquelético. As
> seis carencias detectadas (análise visual de v2/v3): liñas que non comunican, pertenza
> con rectángulos que rompen a forma radial, root sen diferenciar, etiquetas que dominan.

---

## 1. O problema, en catro eixes

1. **Conectores** centro→cluster: hoxe `meshType:'spokes'`, liñas rectas dun só ton.
   Non rematan en nada interpretable; só intentan suxerir "estrela".
2. **Pertenza a cluster**: hoxe `regions` debuxa `<rect>` tinguidos. As caixas
   rectangulares rompen unha forma que quere ser radial/orgánica.
3. **Root**: `type:'root'` con `size:52`, pero mesmo tratamento ca un microskill (anel +
   interior). Non "goberna" visualmente.
4. **Etiquetas de cluster**: en maiúsculas grandes, dominan sobre os propios microskills.

---

## 2. Técnicas para os conectores

### 2.1 Hierarchical edge bundling (recomendada)
Algoritmo de Danny Holten (2006). As arestas **agrúpanse nun tronco** preto do centro e
**ábrense en abano** no extremo do cluster — a analoxía do autor: "agrupar os cables nun
feixe para reducir o caos, e abrilos no extremo para enchufalos". En d3 conséguese con
`d3.curveBundle.beta(β)` sobre un `lineRadial`: `β=0` recta, `β=1` totalmente curvada pola
xerarquía. É **a** técnica estándar para grafos radiais con xerarquía.
→ Mapeo YF: nova `CurveStyle` (p.ex. `'bundle'`) en `PathBuilder`, ou un construtor de
paths consciente do `clustered-radial`. Substitúe os spokes secos. (Fontes: §7-A.)

### 2.2 Sen liñas — "pozo de gravidade"
A posición dos clusters xa fai a estrela; a conexión pode ser un **campo de luz**: un
degradado/halo radial desde o root que se esvae cara fóra. Cero liñas, cero ruído.
→ Mapeo YF: **consumidor-side hoxe** (CSS radial-gradient no lenzo) + `meshType:'none'`.

### 2.3 Conectores con brillo
Fíos luminosos en vez de liñas planas, vía filtros SVG `feGaussianBlur` + `feMerge`
(intensidade = nº de capas de blur). Atmosférico, non ruído.
→ Mapeo YF: filtro opcional no renderer (sub-fase visual). (Fonte: §7-D.)

---

## 3. Técnicas para a pertenza a cluster (sen caixas)

### 3.1 Convex hull suavizado (blob) (recomendada)
Calcúlase o `convexHull` dos nodos do cluster, **expándese desde o centroide** (factor
~0.15) e **suavízanse os bordos con curvas Bézier** entre vértices → unha mancha redondeada
orgánica que abraza o cluster. Variante máis cinguida: concave hull / alpha-shape.
→ Mapeo YF: novo **tipo de region** para `clustered-radial` que pinte hull-blob no canto
de `<rect>`. Toca `@react` (`SkillRegions`). (Fontes: §7-B.)

### 3.2 Halo/fondo por grupo (patrón Path of Exile)
**Dato de ouro**: PoE define o fondo de cada grupo **no propio obxecto de grupo** cunha
propiedade `background` (un sprite circular/oval); se falta, non se debuxa fondo. É
exactamente a idea "pertenza = mancha, non caixa".
→ Mapeo YF: `GroupDef` podería levar `background`/`tint` e o renderer pintaría un halo
radial tinguido por cluster. (Fonte: §7-C.)

### 3.3 Cor por nodo (a máis barata)
A pertenza vive no propio nodo: `node.color` = cor do cluster (anel/interior). Cada
microskill identifícase pola súa paleta; sen ningunha forma envolvente.
→ Mapeo YF: **consumidor-side hoxe** (asignar `node.color` por `group` no exemplo).

---

## 4. Root e etiquetas

- **Root diferenciado**: en PoE os nodos "notable" (os que definen un cluster) teñen
  **iconas máis grandes** e nome propio, e deixan ver dun golpe o que fai o cluster. Para o
  root-profesión: anel duplo, brillo radial, ou forma poligonal (hexágono/medalla). É o
  **escudo composto bancado**. (Fonte: §7-C.)
- **Etiquetas discretas**: reducir tamaño/opacidade, ou mover a categoría ao panel lateral
  ("Pertence a: Forno e masas") cando se selecciona un nodo — iso é **F12 (DetailPanel)**.

---

## 5. Agora (consumidor-side) vs investimento en `@react`

| Mellora | Mecanismo | Onde |
|---|---|---|
| Cor por nodo | `node.color` = cor do cluster | **Agora** (exemplo) |
| Quitar ruído de liñas | `meshType:'none'` | **Agora** (exemplo) |
| Pozo de gravidade | CSS radial-gradient no `.ob-canvas` | **Agora** (exemplo) |
| Etiquetas discretas | tamaño/opacidade | **Agora** (exemplo) |
| Edge bundling | nova `CurveStyle` / path builder radial | `@react`/`@core` — **F12** |
| Hull-blob de cluster | novo tipo de region | `@react` — **F12** |
| Halo/fondo por grupo | `GroupDef.background` + render | `@core`+`@react` — F12/F13 |
| Brillo (glow) | filtro `feGaussianBlur` | `@react` — sub-fase visual |
| Root-medalla | tratamento especial `type:'root'` / escudo | `@react`/tema — **F13** |

---

## 6. Posicionamento competitivo (estado a 2026-06)

**Como librería/motor, Yggdrasil Forge está diferenciado e por diante.** Ningún dos
candidatos é un motor de progresión real + layouts conmutables + temas + importadores, de
propósito xeral e tipado:

- `beautiful-skill-tree` (andrico1234): React presentacional, layout de grella/árbore
  automático, sen multi-tier/exclusións/recursos/layouts conmutables. **Último release real
  hai ~6 anos.** Non é un motor.
- `@skilltree/skills-client-js` (SkillTree Platform): **plataforma hospedada** de formación
  corporativa (skills-service + dashboard, tiles/charts/ranking). Non é unha librería de
  grafo embebible nin un render de árbore orgánica.
- `nokia/skilltree`: ferramenta/visor para construír e compartir skill-trees.
- `sito-tree`: render de grafo xenérico sobre P5js (Angular).
- PoE (`grindinggear/skilltree-export`, planners): específico dun xogo; datos + visores.
- Galerías d3 / yFiles: primitivas (constrúelo ti) / comercial.

**En polido visual do render orgánico, aínda non.** As técnicas das galerías d3 (edge
bundling, hull) e o render de PoE superan hoxe o noso SVG nese aspecto concreto. Non é un
problema de moat: é **traballo de render pendente** (F12/F13), e é **prestable** desas
fontes.

### Preguntas abertas (porque na parte visual a resposta é "aínda non")
1. ¿O edge bundling entra como `CurveStyle` xenérica ou como construtor específico do
   `clustered-radial`? (¿Reutilízao `radial`/`tree` ou é propio da estrela?)
2. ¿A pertenza de cluster debe ser **hull-blob** (region nova) ou **fondo por grupo**
   (`GroupDef.background`, patrón PoE), ou ambas conmutables? ("Library dá mecanismo;
   consumidor escolle política.")
3. ¿Convén un **preset de layout "constelación"** que combine `fan` + bundling + hull nun
   só `LayoutConfig`, para que o consumidor non tente cablear catro cousas?
4. ¿O root-medalla é tema (`theme`), forma (`shape:'hex'`/medalla), ou o composer de
   badges (escudo)? Decisión de fronteira `@react` vs tema.

---

## 7. Fontes (explícitas)

**A — Hierarchical edge bundling (conectores orgánicos)**
- https://d3-graph-gallery.com/bundle
- https://www.react-graph-gallery.com/hierarchical-edge-bundling
- https://www.data-to-viz.com/graph/edge_bundling.html
- https://gist.github.com/mbostock/1044242  (implementación d3 de Mbostock)
- https://observablehq.com/@d3/hierarchical-edge-bundling
- https://d3js.org/d3-shape/curve  (`curveBundle.beta`)
- Holten, D. (2006). *Hierarchical Edge Bundles*. IEEE TVCG 12(5):741–748.

**B — Convex/smooth hull (pertenza sen caixas)**
- https://gist.github.com/donaldh/2920551  (force-multi-foci con convex hulls en d3)
- https://d3js.org/d3-polygon  (`d3.polygonHull`)
- Técnica de suavizado: expansión desde centroide (~0.15) + Bézier entre vértices do hull;
  alternativa cinguida: concave hull / alpha-shape.

**C — Path of Exile (fondo por grupo + notables)**
- https://github.com/grindinggear/skilltree-export  (propiedade `background` por grupo)
- https://github.com/poe-tool-dev/passive-skill-tree-json
- https://github.com/triinkaz/skilltree05  (visor PoE2 nun só HTML — estudar o render)
- https://www.pathofexile.com/passive-skill-tree  (notables = iconas máis grandes)

**D — Brillo SVG**
- https://dev.to/ninjasoards/make-a-flickering-neon-svg-animation-from-scratch-w-illustrator-react-emotion-39gm  (`feGaussianBlur` + `feMerge`)

**E — Librerías de skill-tree (referencia / competencia)**
- https://github.com/andrico1234/beautiful-skill-tree  (npm `beautiful-skill-tree`; abandonado, grella)
- https://github.com/nokia/skilltree
- https://skilltreeplatform.dev  ·  https://www.npmjs.com/package/@skilltree/skills-client-js  (plataforma)
- https://github.com/sitodav/sito_tree_lib  (`sito-tree`, P5js)
- https://github.com/brillout/awesome-react-components  (índice xeral)

**F — Layout radial (referencia conceptual)**
- https://www.yfiles.com/the-yfiles-sdk/features/automatic-layouts/radial-layout  (comercial)
- https://www.data-to-viz.com/graph/edge_bundling.html

---

### Suxestión de ubicación
Documento á parte (p.ex. `docs/research/REFERENCIAS_render-organico.md`), cun punteiro
desde as seccións F12/F13 do `MASTER.md`. Non mesturar coa canon de arquitectura.
