# Teoría de relacións e layout — Yggdrasil Forge

> **Documento guía (v2 · conxelado).** Xa é abondo bo para servir de guía: **déixase
> quieto** e só se revisa contra casos reais. Profundízase **eixe a eixe**, e cada eixe só
> entra no motor cando ten un exemplo que o demostra (§14). Acompañante:
> `REFERENCIAS_render-organico.md`.
>
> *"O grafo é inmutable. A lente cambia como se interpreta, transforma e presenta."*
> *(The graph is immutable. The lens changes how it is interpreted, transformed and presented.)*
>
> **Como ler.** Cada concepto é unha **decisión**: **Pro** · **Contra** ·
> **Esquivar/adaptar** (evitar o contra, ou convertelo en feature).

---

## 0. A tese: de Render Engine a Semantics Engine

A maioría dos motores pensan `Node → Edge → Layout`. A aresta é unha liña.

Yggdrasil Forge pensa, en realidade:

```
Lente → Coñecemento/Semántica → Transformación → Grafo → Layout → Render
           (+ transversais: Explicabilidade · Evolución)
```

**A aresta é un significado; o debuxo é unha consecuencia.** O núcleo non é un Layout
Engine nin un Render Engine: é un **Semantics Engine** (que significa un nodo/relación,
como se deriva, como se explica, como evoluciona, que entra en conflito, que se infire).
O Layout Engine é augas abaixo: só pregunta *"dáme un grafo"*.

**Nome.** Internamente é un *Semantics Engine*; **de cara a fóra** chámase **Progression
(Graph) Engine**, porque "semantic engine" arrastra connotación de RDF/OWL/SPARQL e
despista. **O proxecto non reinventa *knowledge graphs*: reinventa *progression*.** Todo
xira arredor desa palabra (skill tree, learning, tech tree, NPC, Living Mind = progresión).

**A unidade fundamental** xa non é `SkillTree` nin sequera `Graph`. É o **Progression
Graph**: un grafo onde os nodos son **estados de progreso** (habilidades, coñecemento,
recordos, tecnoloxías, logros) e as arestas son **significado**. Skill trees, tech trees,
learning paths, Living Mind, cerebros de NPC e grafos de investigación pasan a ser
**instanciacións** dun mesmo modelo (a analoxía de Unity: primeiro "game engine", despois
descubriron que eran "engine" e os xogos eran un caso de uso). Ese reframe vale máis que
dez layouts ou cen temas.

Regra de ouro estendida: *Same Data, Different Themes* → **Same Meaning, Different
Representations** → e, por riba, **Same Graph, Different Lens**.

---

## 1. O pipeline e as capas (v2)

| Capa | Pregunta |
|---|---|
| **−1 · Lente (Lens)** | ¿Desde onde se mira o grafo? |
| **0 · Derivación** | ¿De onde sae a aresta? |
| **1 · Semántica** | ¿Que significa? |
| **1.5 · Transformación / Proxección** | ¿Que vista do grafo se debuxa? |
| **2 · Representación** | ¿Como se debuxa (rol → forma)? |
| **3 · Organización / Layout** | ¿Que xeometría? |
| **A · Políticas e metas** (transversal) | ¿Que regras/obxectivos? |
| **B · Evolución** (transversal) | ¿Como cambia sen marear? (estabilidade, confianza, lifecycle) |
| **C · Explicabilidade** (transversal) | ¿Por que? (`why*`) |

**Lei de capas:** unha capa baixa nunca coñece unha alta. A **xeometría nunca se exporta**
(relacións xeométricas = substrato). A **representación non é semántica**.

---

## 2. Capa −1 — Lente (Lens)

Unha **lente** non cambia o mundo, só **como o observas** — por iso é a palabra correcta
(mellor que Context, Domain ou Purpose). Un mesmo dato pode querer dicir cousas distintas:
*Cooking* → ensinar; *Skill Tree* → progresión; *Living Mind* → atención. A lente
reconfigura o pipeline: que derivers corren, que `EdgeKind` están activos, que regras
aplican, que layouts se ofrecen.

- **Pro:** unha soa base de datos serve a moitos produtos; é o que fai do motor un
  *engine* e non un *skill tree*. Real: *named graphs*, facetas, views.
- **Contra:** "Intent" como concepto runtime é vago e pode xustificar calquera cousa.
- **Esquivar/adaptar:** a lente é un **Profile** concreto e declarativo (un bundle de
  política + kinds + layouts + regras), **non** unha abstracción etérea. Testable: dáse un
  dato + un Profile → grafo derivado determinista.

---

## 3. Capa 1 — Semántica (que significa a aresta)

### 3.0 Meaning ≠ Intent (rol)
O **significado** vive no dato (`Fire causes Smoke`). O **rol** decídeo a lente: a mesma
aresta `causes` pode presentarse como *dependency*, *scientific relation* ou *story
relation*. → Entre Semántica e Representación hai unha capa de **Rol/Proxección** fixada
pola Intent. (Pro: enorme flexibilidade. Contra: confusión se se mestura co significado.
Esquivar: o rol **nunca** muda o dato nin `canUnlock`; é só proxección.)

### 3.1 Estruturais (dependencia, AND/OR, exclusión, tier, gateway, root)
- **Pro:** o núcleo. YF xa o ten (prereqs como **portas** A.6.28; exclusións **simétricas**
  A.6.30).
- **Contra:** AND/OR ambiguos; exclusións mal feitas = bugs.
- **Esquivar/adaptar:** AND/OR son **hiperarestas** (conxunto → nodo), non liñas soltas.

### 3.2 Semánticas (relacionado, contrario, sinerxía, especialización, narrativo…)
- **Pro:** convirte a árbore nun knowledge graph; diferenciador.
- **Contra:** non desbloquean → confúndense; ruído.
- **Esquivar/adaptar:** `kind:'semantic'`, representación distinta, **opt-in por capa**;
  nunca tocan `canUnlock`.

### 3.3 Temporais (antes/despois, cooldown, evento, decay)
- **Pro:** terreo novo (ritmo, estacionalidade).
- **Contra:** tentación de meter un reloxo no core.
- **Esquivar/adaptar:** **metadatos da aresta**, non motor de tempo. O `decay` vive aquí.

### 3.4 De recurso (consome, produce, comparte, converte)
- **Pro:** YF xa ten recursos/orzamento (`grantResource` A.6.29).
- **Contra:** explosión en "simular economías".
- **Esquivar/adaptar:** recurso = gate/custo, non simulación económica.

### 3.5 De peso (confidence, probability, affinity, frequency)
- **Pro:** é un **uncertain knowledge graph** (confianza ∈ [0,1]); alimenta o radar de
  Oberón, Living Mind e Semantic Gravity.
- **Contra:** ¿de onde sae o número?; o render por grosor/opacidade satura.
- **Esquivar/adaptar:** `confidence` **sempre con `provenance`**; render con **limiar**;
  nunca gate por peso sen umbral explícito.

### 3.6 De aprendizaxe (observed-together, co-occurrence, predicted, emergent, decay)
- **Pro:** o gran diferenciador — o grafo *aprende* (Living Mind).
- **Contra:** ML pesado, caixa-negra, **non-determinista** (rompe os tests); privacidade.
- **Esquivar/adaptar (crítico):** empezar por **co-ocorrencia determinista** (contas);
  embeddings/IA = **deriver illado, opt-in, `provenance:'inferred'`**, fóra do core. **O
  core nunca perde o determinismo.**

---

## 4. Capa 0 — Derivación (de onde saen as arestas)

Dúas clases: **deterministas** (id, requires, tag, grupo, recurso, custo, tier, depth,
posición, proximidade) → no core, testables; **inferidas** (semellanza/embeddings,
frecuencia histórica, navegación, IA) → plugin illado.

- **Pro:** o motor **descobre**, non só debuxa.
- **Contra:** a parte inferida é non-determinista, opaca, custosa, sensible.
- **Esquivar/adaptar:** **política declarativa** decide que derivers corren; as inferidas
  opt-in con proveniencia. **Converter o contra en feature:** `explainEdge(id)` ("por que
  existe esta conexión"), irmán de `explainUnlock`.

---

## 5. Capa 1.5 — Transformación / Proxección

O grafo que se **debuxa** é unha **vista derivada** do grafo verdade: collapse, expand,
fold, summarize, aggregate, filter, highlight. Campo real: **graph summarization**,
**degree-of-interest** (Furnas 1986), **semantic zoom**, roll-up/drill-down. Exemplo:
España → 17 comunidades → 8000 concellos, pero quero ver España → Galicia → A Coruña.

- **Pro:** separa "o grafo verdade" do "o grafo que vexo"; escala a grafos enormes;
  habilita focus+context e drill-in (que Oberón xa quere).
- **Contra:** outra capa = máis complexidade; transformacións inconsistentes confunden.
- **Esquivar/adaptar:** transformacións **puras e compoñibles** (grafo → grafo), nunca
  mesturadas co layout nin co render. A estabilidade (§9) aplícase ás transicións.

---

## 6. Capa 2 — Representación (rol → forma)

Estilos (straight, bezier, **radial**, orthogonal, arc, ribbon, energy, flow, dotted,
gradient) + técnicas investigadas (edge bundling, hull-blob, glow, enrutado).
- **Pro:** desacople total significado↔debuxo (*Same Meaning, Different Representations*).
- **Contra:** liberdade = inconsistencia; animacións distraen/custan.
- **Esquivar/adaptar:** **registry por `kind`** con defaults; **forma ≠ enrutado**;
  animacións opt-in.

---

## 7. Capa 3 — Organización / Layout

Os 24 modos mapean a algoritmos reais: layered/**Sugiyama** (dot/dagre/ELK) para
tech-trees; **force/stress** para galaxy/neural; **radial**/clustered-radial (o voso);
**hyperbolic** (foco); circular; treemap/island; **constellation**.
- **Pro:** YF xa ten registry de layouts; ampliable sen tocar o modelo.
- **Contra:** **cada forma = traballo + exemplo** (a parte dura); moitas son vistosas pero
  pouco funcionais.
- **Esquivar/adaptar:** priorizar as que serven a Oberón (clustered-radial, constellation,
  layered); as exóticas, presets tardíos; **nunca exportar** xeometría.

---

## 8. Transversal A — Políticas e metas

**Edge Policies** (declaras derivers/merges) e **Layout Goals** (declaras `goal: readable
| compact | semantic | narrative | emotional`). Campo real: **constraint-based layout**
(`cola.js`/WebCoLa; **SetCoLa** de Heer et al. — restricións sobre propiedades dos datos,
reaplicables).
- **Pro:** o consumidor declara **intención**; reaplica a calquera grafo; moi "voso".
- **Contra:** multi-obxectivo é **NP-hard** → non óptimo; a "maxia" custa de depurar.
- **Esquivar/adaptar:** meta = **pesos/restricións** sobre layouts existentes (heurístico,
  honesto), non solucionador máxico; vender "mellor esforzo", non "óptimo".

---

## 9. Transversal B — Evolución (estabilidade · confianza · lifecycle)

- **Estabilidade** = preservación do **mapa mental** (Misue–Eades–Lai 1995; Archambault &
  Purchase): mover o mínimo entre estados (pinning, aging).
- **Confidence propagation** = **belief/trust propagation**: a confianza flúe con
  decaemento (determinista, fermoso).
- **Node lifecycle** = activación/decaemento (spreading activation): `seed → candidate →
  active → reinforced → dominant → aging → dormant → archived`. Distinta da de unlock.
- **Contradiction detection** = consistencia **derivada** sobre semántica (xa tedes
  exclusións; estendelo a conflitos inferidos).

- **Pro:** o grafo evoluciona sen marear; raro de ver → diferenciador; encaixa con Oberón.
- **Contra:** estabilidade vs calidade do layout están en **tensión**; custo.
- **Esquivar/adaptar:** `previousLayout` opcional + pinning; toggle **estable vs limpo**
  (xa o fixemos co `memberLayout`); propagación e lifecycle **deterministas**.

---

## 10. Transversal C — Explicabilidade (`why*`)

Non só `explainUnlock()`: tamén `whyConnected · whyCluster · whyHere · whyMoved ·
whyDerived · whyHighlighted`. **Non é unha feature: é unha consecuencia.** Se cada etapa
(derivación, política, meta, estabilidade) deixa **proveniencia** (estilo W3C PROV), a
familia `why*` cae soa.

A peza estrela é **`graph.explain(...)`**: unha **explicación de sistema** que atravesa
**todas as capas** —*nodo activo → por esta condición → derivada por esta política →
proxección desta lente → debuxado con este layout → movido por esta restrición*— non a
explicación dunha regra soa. Difícil de facer; **moi** difícil de copiar unha vez existe.
- **Pro:** pode ser a **API estrela**; difícil de copiar (esixe trazabilidade de raíz);
  conecta co voso `explainUnlock`.
- **Contra:** trazar todo custa memoria/CPU e disciplina en cada etapa.
- **Esquivar/adaptar:** proveniencia como **subproduto** de cada operación (non un sistema
  aparte); opt-in o nivel de detalle.

---

## 11. A arquitectura en Yggdrasil Forge — registries + álxebra

Os registries (patrón que xa tedes con layouts):
1. **`EdgeKind`** — `structural | semantic | resource | temporal | weight | learning`.
   Aresta = `{ from, to | froms[], kind, semantics, confidence?, provenance, explain? }`.
2. **`EdgeDeriver`** — deterministas no core; inferidos fóra; saída con `provenance`.
3. **`EdgeRepresentation`** — `kind`/`rol` → forma + enrutado + estilo.
4. **`LayoutGoal` + estabilidade** — meta → restricións/pesos; layout recibe `previousLayout`.
5. **`EdgePolicy`** + **`Lens/Profile`** — declarativos.

E, por riba, **unha álxebra de operacións** que lle dá superficie precisa ao motor (coma a
álxebra relacional ás BD): `project · transform · derive · explain · diff · simulate`. **Se
esas operacións compóñense, é un motor; se non, é un slogan.**

**Fronteira dura:** core **determinista** (estrutural + derivación determinista +
estados/tiers/recursos + propagación/lifecycle deterministas). Inferencia/IA/embeddings/
física de forzas = **plugins opcionais fóra do core**. Protexe os 1760 tests.

---

## 12. Horizonte — ir máis lonxe (bancado ata ter exemplo)

- **De visualizar a simular:** correr **axentes** sobre o grafo (un aprendiz percorre, un
  NPC aprende, un recomendador propón o seguinte nodo). De *describir* a *simular*.
- **Lazo de retroalimentación:** a navegación **deriva** arestas e **activa** nodos → o
  grafo aprende do uso. Living Mind = sistema con feedback, non vista.
- **Federación:** moitos progression graphs **compóñense** (as 56 profesións de Oberón, un
  currículo, unha matriz de competencias) con relacións cross-graph.

Todo isto é **horizonte**: vai ao doc para non pechalo, pero non se constrúe sen exemplo.

---

## 13. A disciplina — non morrer no second-system

A maior ameaza desta visión non é técnica: é **xeneralizar tanto que nunca se envía**.
Regras que nos salvan:
1. A xeneralidade **gáñase caso a caso**: cada capacidade entra cando **un exemplo a
   proba**, nin antes.
2. O **core segue determinista**; inferencia/IA/física = plugins fóra.
3. O **skill tree segue sendo a áncora**; **Oberón é o cliente cero**, non algo a superar.
   O motor gaña o dereito a ser xeral sendo **excelente no concreto primeiro**.

Síntese: **máis lonxe no modelo** (pensar é barato; o doc contén toda a visión para non
pechala) e **estreitos no build** (un exemplo de cada vez). Factorizar para non *impedir* o
grande; construír só o que ten exemplo.

---

## 14. Estratexia de exemplos — pouco a pouco

1. **Un eixe de cada vez.** Bancar o resto explícitamente.
2. **Ningún concepto entra no motor sen exemplo + sonda runtime** que simula o fluxo.
3. **Orde:** (a) rematar a forma de Oberón (Representación: bundling/hull/cor — F12/F13,
   **xa en marcha**, é o exemplo cero); (b) un exemplo por eixe novo, un a un (semántica →
   peso/confianza → derivación determinista → metas → estabilidade → transformación); (c)
   inferencia/IA/simulación ao final, illadas.
4. **Cada eixe pecha cunha lección** (Annex A) e, se procede, sub-fase no ROADMAP.

---

## 15. Fontes

- **Layout:** ELK (arxiv 2311.00533); Cytoscape (blog.js.cytoscape.org); Graphviz; G6.
- **Edge bundling:** Holten 2006 (IEEE TVCG 12(5)); d3-graph-gallery.com/bundle.
- **Constraint/declarativo:** cola.js (github.com/tgdwyer/WebCola); SetCoLa (idl.uw.edu/papers/setcola).
- **Mapa mental/estabilidade:** Misue–Eades–Lai 1995; Archambault & Purchase 2011/2013.
- **Transformación:** graph summarization (surveys); degree-of-interest (Furnas 1986); semantic zoom.
- **Knowledge graph/link prediction/uncertain KG:** survey MDPI Symmetry 13(3):485; NoGE (arxiv 2104.07396).
- **Proveniencia:** W3C PROV.
- **Activación/propagación:** spreading activation (ACT-R); belief propagation.
- **Significado vs xeometría:** Splunk Eng. (medium).
- **Render orgánico:** `REFERENCIAS_render-organico.md`.
