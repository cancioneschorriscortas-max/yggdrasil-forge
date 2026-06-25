# ARQUITECTURA — Sistema de Auto-Layout (contrato para o Editor)

> **Estado:** deseño bancado. **NON é implementación.** É o contrato no que se
> apoiará o editor visual (F14/F15) e ao que se conformarán todas as sub-fases de
> layout. Orixe: deseño colaborativo (Agarfal + ChatGPT na parte gráfica + Director).
>
> **Principio reitor:** `layout = estratexia`, `algoritmo = implementación`. NON
> 1-dato-1-algoritmo (iso leva a `XxxLayout.ts` infinitos e á "árbore nova que non
> encaixa"). Sepárase **que dato teño** de **como o debuxo** de **que priorizo**.

---

## 0. O PIPELINE

```
Raw Data
  │
  ▼  E0 · Structure Derivation   deriva ENTIDADES / grupos do dato cru
  │
  ▼  E1 · Graph Derivation        deriva RELACIÓNS / edges reais do dato
  │
  ▼  B  · Topology Detection      observa que TIPO de grafo é (feitos)
  │
  ▼  D  · Auto-Selection Engine   topoloxía + intención + goal → estratexia
  │
  ▼  C  · Layout Strategy         PROPÓN posicións iniciais (honra invariantes)
  │
  ▼  A  · Constraints Solver      APLICA constraints correctivos (común a todas)
  │
  ▼
Final Coordinates
```

Detalle crítico (achega de ChatGPT): **a estratexia non resolve todas as
colisións.** Propón unha distribución; un **solver común** aplica as restricións
globais. Iso dá consistencia entre modos e evita reimplementar correccións en cada
layout.

---

## A. CONSTRAINTS (regras universais) — DÚAS CLASES

A clave: **non son todas do mesmo tipo.**

### A.1 — Invariantes XERATIVOS (a estratexia cúmpreos *por construción*)
Non se poden retroaxustar cun solver. Se a estratexia os incumpre, ningún post-proceso
os arranxa.
- **`growOutward`** — o contido medra afastándose da áncora (raíz/centro/pai),
  **nunca cara dentro**. *(É o que faltaba no `list`: o grupo de arriba colgaba
  cara o centro. Non é bug do solver — é a estratexia incumprindo o invariante.)*
- **`keepParentsAboveChildren`** — xerarquía visual coherente.
- **`preserveUserPositions`** — respectar o que o usuario fixou a man (editor).
- **`deterministic`** — mesmos datos → mesmas coordenadas (orde estábel).

### A.2 — Constraints CORRECTIVOS (o SOLVER común aplícaos a posteriori)
O solver move nodos para cumprilos, despois de que a estratexia propoña.
- **`noOverlap`** — nodos e os seus textos nunca se montan.
- **`minNodeSpacing`** / **`minLabelSpacing`** — ocos mínimos lexíbeis.
- **`avoidEdgeCrossings`** — minimizar cruces de arestas.
- **`centerContent`** / **acoutado** — encadrar nun marco sensato.

> **Conflitos:** os correctivos poden contradicirse (noOverlap vs centerContent).
> O solver precisa unha **orde de prioridade determinista** para resolvelos, senón
> rompe o invariante `deterministic`. (A prioridade exacta defínese ao implementar.)

> **Débeda que valida o modelo:** o `effGroupRadius` de `ClusteredRadialLayout` é
> hoxe un **parche local de `noOverlap`**. Neste modelo, esa lóxica **emigra ao
> solver común** e a estratexia despréndese dela. O que xa fixemos prefiguraba o
> sistema; só estaba no sitio errado.

---

## B. GRAPH TOPOLOGIES (feitos observábeis, NON configuración)

Resultado de analizar o grafo. Un grafo pode ser **varios á vez**.
- `tree` — pai→fillo estrito (Diablo).
- `dag` — converxencias, prerequisitos múltiples (Civilization, Paladín).
- `clustered` — nodos agrupados (Paladín, panadeiro).
- `network` — grafo xeral con ciclos/cross-links (Path of Exile).
- `radial` — estrutura concéntrica natural.

Exemplo · Paladín → `{ dag: true, clustered: true, tree: false }`.

---

## C. LAYOUT STRATEGIES (implementacións que PROPOÑEN posicións)

Cada estratexia coloca nodos honrando os invariantes xerativos (A.1). NON resolve
colisións globais (iso é A.2).
- `hierarchical` — árbore por niveis.
- `columns` — esquerda→dereita por profundidade (tech-tree).
- `radial` — aneis por distancia á raíz.
- `clustered-radial` — grupos en radial + variante intra-grupo. **← o que temos.**
  - Variantes intra-grupo: `list` | `cluster` | `fan`.
- `rings` — concéntrico por tiers.
- `organic` / force-directed — grafo sen estrutura clara (futuro).

> **Onde encaixa o noso traballo:** `clustered-radial` é unha Strategy (C);
> `list`/`cluster`/`fan` son variantes súas; o seu `effGroupRadius` é débeda que vai
> ao Solver (A.2); o arranxo do `forno` é honrar `growOutward` (A.1).

---

## D. AUTO-SELECTION ENGINE (topoloxía + intención + goal → estratexia)

Aquí vive **todo o "semántico"**: NON é unha capa propia, é un **sinal para a
decisión**. `skill-tree`/`tech-tree`/`mastery-tree` non son propiedades estruturais
do grafo — son intencións.

Entrada: `{ topology (detectada), intent/type, goal }` → Estratexia.

Exemplos de regras:
```
type: skill-tree   + { clustered }  + goal: readable   → clustered-radial
type: tech-tree    + { dag }        + goal: readable   → columns
type: mastery-tree + { radial }                        → radial (flower)
type: class-tree   + { tree }                          → vertical branching
```
`layoutMode: 'auto'` mira **o grafo E a intención**, non só a xeometría.

---

## E. LAYOUT GOALS (que priorizo)

Afinan espazado/aire sen cambiar a estratexia. A mesma árbore, distinta sensación.
- `compact` — reduce espazo (bo para o editor).
- `balanced` — equilibrio por defecto.
- `readable` — máis separación (bo para xogadores).
- `epic` — moito aire (bo para marketing).

---

## F. INCREMENTAL LAYOUT / SCOPE (re-layout local)

Imprescindíbel para o editor: ao mover/crear un nodo **non se recalculan 300**.
```
layoutScope: 'full' | 'cluster' | 'subtree' | 'selection'
```
Exemplo: o usuario move "Combat" → `re-layout` só do seu `cluster`/`subtree`, non
de toda a árbore.

**Capacidade emerxente · Auto Layout Locked Regions.** `preserveUserPositions`
(A.1) + `layoutScope` (F) dan, sen código extra, o comportamento profesional: o
usuario coloca `Combat`/`Holy`/`Arcane` a man, pulsa *Auto Layout*, e o sistema
**só recalcula o interior**, respectando o fixado. É a diferenza entre editor
xoguete e editor serio, e xa está implícita neste contrato.

---

## E0. STRUCTURE DERIVATION (pre-paso; NON é layout)

Transformación do dato cru **antes** do pipeline. Deriva **entidades/grupos** para
que as estratexias os reciban xa listos, **agnósticas a se son explícitos ou inferidos**.

`Auto Group By`:
```
group | tag | depth | faction | attribute | prerequisite-chain | region
```
Exemplo: nodos con `tags:[combat]`, `[combat]`, `[holy]` → deriva grupos
`{combat, holy}`. `clustered-radial` nin sabe que se inferiron — vantaxe enorme.

> Pode crecer moito (máis criterios de agrupación) sen tocar layout: todo é
> transformación de dato.

---

## E1. GRAPH DERIVATION (pre-paso; deriva RELACIÓNS) — par de E0

E0 e E1 son **simétricos**: E0 responde *que entidades/grupos existen*; E1 responde
*que relacións existen*. Despois, o resto do pipeline traballa sobre un grafo xa
formado. (Achega de ChatGPT: grupos e arestas son o mesmo problema — converter dato
arbitrario en grafo — así que merecen capas paralelas.)

### Distinción fundamental: MODEL GRAPH ≠ LAYOUT SCAFFOLDING

```
MODEL GRAPH            (forma parte do dato; EXPÓRTASE)
  ├─ semantic
  ├─ derived
  └─ inferred

LAYOUT SCAFFOLDING     (consecuencia visual dunha estratexia; NUNCA se exporta)
  └─ spokes · group halos · region bounds · decorative meshes
```
**Test mental:** "se exporto o grafo, debe aparecer?" → semantic/derived/inferred **Si**;
spoke visual **Non**. Logo o spoke **non é un edge** — é *scaffolding*. Vive no
`LayoutResult` (hoxe xa como `mesh`), efímero, rexenerado por cada layout. Nunca
contamina o modelo, o export, nin `avoidEdgeCrossings`.

> Isto **non** é un `edge.kind = 'presentation'`. A presentación **non é un tipo de
> edge** — é a *ausencia* de edge (decoración do layout). Telo como `kind`
> introduciría unha mentira no modelo.

### Os edges REAIS (entran no modelo, expórtanse)

- **`semantic`** — significado real do dato, **nunca inventado**: `edges` explícitos,
  `requires` (→ dependencia), relacións (`related`/`conectadas` → cross-links).
- **`derived`** — **determinista**, regra pura sobre o dato actual: tier 1→2→3,
  shared-tag, shared-requirement. `mesmo input → mesmo output`. **Recalculábel sempre.**
- **`inferred`** — **estatístico/aprendido**, con peso e historia. **NON recalculábel**
  só co dato actual: é **memoria acumulada**, persístese.
  ```ts
  interface InferredEdge {
    source: string; target: string
    weight: number; observations: number
    firstSeenAt: Date; lastSeenAt: Date
  }
  ```
  *(Living Mind: `Rome ↔ Architecture, weight 0.72` tras miles de consultas. Iso é
  coñecemento acumulado, non derivación.)*

### A propiedade que isto desbloquea

```
Rebuild Derived Graph   SEN destruír   Learned Graph
```
Como `derived` é puro e `inferred` é persistido, podes **recalcular o derivado**
(ex. datos actualizados) **mantendo o aprendido**. Para Living Mind é esencial: o
grafo medra co uso sen esquecer ao recompilar. (`derived` = coñecemento *calculado*;
`inferred` = coñecemento *aprendido* → unha forma de memoria.)

> **Pregunta clave do editor:** non será *onde poño os nodos*, senón *como descubro
> que dous nodos deberían conectarse*. Esa é unha capa distinta do layout — é E1.

---

## G. LAYOUT CAPABILITIES / PREFERENCES — *(FUTURO · reservado, NON implementar)*

> Arquitectura especulativa. **Non se toca agora.** Resérvase o espazo mental para
> que o `goal` non acabe absorbendo 30 parámetros distintos. (Achega de ChatGPT.)

Algún día aparecerán **preferencias finas** que non son nin estratexia nin goal:
```
preferences:
  symmetry: high
  edgeLength: short
  clusterSeparation: high
  preferStraightEdges: true
```
Encaixe limpo no modelo xa existente, sen capa nova:
- As preferencias son **constraints BRANDOS**: o solver (A.2) optimiza *cara* a elas,
  ponderadas — fronte aos **DUROS** (`noOverlap`, `minSpacing`), que son obrigatorios.
  Logo A.2 subdivídese en *duros (must)* e *brandos (optimize)*. `avoidEdgeCrossings`
  e `preferStraightEdges` son brandos.
- O **`goal`** (E) pasa a ser un **preset** sobre esas preferencias
  (ex. `compact = { clusterSeparation: low, edgeLength: short }`,
  `epic = { clusterSeparation: high, … }`). Así o goal **non bloa**: é só un nome
  para unha combinación de preferencias.

Resultado: capa de preferencias = knobs brandos do solver; goal = preset deses knobs.
Reservado para cando o editor o pida; hoxe non existe.

---

## RESUMO DO CONTRATO

```
E0 Structure Derivation — deriva entidades / grupos        (Auto Group By)
E1 Graph Derivation      — deriva relacións / edges reais    (semantic | derived | inferred)
B  Topology Detection    — que tipo de grafo é (feitos)
D  Auto-Selection        — topoloxía + intención + goal → estratexia  (semantic vive aquí)
C  Layout Strategy       — propón posicións + scaffolding (honra invariantes A.1)
A  Constraints Solver    — aplica correctivos A.2 (común a todas)      (effGroupRadius migra aquí)
```

Invariantes (A.1) = contratos da estratexia. Correctivos (A.2) = traballo do solver
común. Esa separación é o que fai o sistema escalábel: unha **árbore nova** só
precisa caer nunha topoloxía + estratexia existentes (ou unha estratexia nova que
**non** reimplemente colisións).

---

## ALCANCE E SEGUINTES

- Isto é **deseño bancado**, contrato para o editor (F14/F15). **Non se implementa
  agora.**
- O traballo de layout actual (clustered-radial · `list`/`cluster`/`fan`) **continúa**
  baixo este marco. O inmediato segue sendo facer que `list` honre `growOutward`
  (o "forno cara afóra") — primeira aplicación concreta dun invariante A.1.
- Cando se aborde o editor, este documento é a folla de ruta das 6 etapas; impleméntase
  incrementalmente (probabelmente B+D+un solver mínimo primeiro).

---

*Arquitectura Auto-Layout · Director (5º Arquitecto) · deseño colaborativo consolidado. Bancado para F14/F15.*
