# YGGDRASIL FORGE — EDITOR DOMAIN MODEL

> Documento mestre do **Editing Engine**. Faime para o editor o mesmo papel que o
> Mental Model fai para o motor: a fonte única de verdade conceptual antes de
> baixar a fases e briefings. Síntese do consenso de arquitectura (Director +
> ChatGPT + Gemini + Copilot) e da dirección visual pechada, máis a guía dos dous
> mockups de referencia. Versión 1.0 — o borrador fundacional (v0.1) consérvase intacto como visión; o
> estado real tras a fase 7 vai no **Anexo as-built** ao final.

---

## 0. Tese

Non construímos «un editor». Construímos o **terceiro motor** do ecosistema:

> **Progression Engine (`@core`) → Rendering Engine (`@react`) → Editing Engine (`@editor-core`)**

Os tres comparten a mesma disciplina: **unha fonte de verdade, transformacións
deterministas, capas ben separadas, interfaces explícitas**. O editor non é «un
React app con paneis»: é un **Editor Engine headless ao que React lle pon cara**.
Esa decisión é a que decide se dentro de tres anos isto segue sendo mantible ou se
converte nun labirinto de estado compartido.

**Sensación obxectivo:** *composed* — precisión tranquila. O grafo xa existía e ti
revélalo; non loitas contra a ferramenta. Referencias: Affinity Designer,
Lightroom Classic, ArcGIS Pro, PoE Atlas. **Non** Blender/Unreal/n8n.

---

## 1. Os dous paquetes

- **`@editor-core`** — headless. Depende de `@core`. **Cero React.** Document,
  Session, Pipeline, Services, Selection, FSM, Command/Transaction, Property
  Registry. **Testable só con Vitest**, como `@core`. Isto é requisito, non
  aspiración: «Editor Engine ao que React lle pon cara» só é real se o Engine se
  proba sen UI.
- **`@editor-react`** — a cara. PanelHost (sobre dockview), EditorCanvas, widgets
  do inspector, overlay do lenzo.

`@editor-react` depende de `@editor-core`, **nunca ao revés** (igual que
`@react`→`@core`). Isto habilita, sen reescribir o núcleo: editor React, editor
Tauri, editor web, e ferramentas CLI que modifiquen documentos — todos sobre o
mesmo Editing Engine.

---

## 2. O modelo de capas

```
Workspace  →  Session  →  Document  →  TreeDef
                                ↑
                         Document Adapter
```

| Capa | Que contén | Persiste |
|---|---|---|
| **Workspace** | Layout de docks, tema do editor, atallos, ventás, último estado | Por **usuario/máquina** (nunca no documento) |
| **Session** | Undo, clipboard, hover, dragging, marquee, preview runtime | **Efímero** (morre ao pechar) |
| **Document** | `TreeDef` + metadatos-de-árbore (background, coordinateBounds, thumbnail, version, imports) + futuro: comentarios, anotacións, bookmarks, revisións | No **ficheiro** |
| **TreeDef** | O modelo do motor | Sempre, dentro do Document |

**Tres niveis de metadato** (a regra que evita o caos):
- **Modelo** → vai no `TreeDef`, sempre.
- **Documento** → vai no ficheiro (background, coordinateBounds, thumbnail…).
- **Workspace** → nunca no documento (é do usuario).

**Document Adapter** desde o día 1: internamente sempre hai un `EditorDocument`;
externamente pode vir dun ficheiro único, varios (`.tree`/`.layout`/`.workspace`),
nube ou BD. O núcleo non se reescribe cando cambia o medio.

**Persistencia v1:** un ficheiro único con `tree:` + `editor:` namespaced ao nivel
superior (o motor ignora `editor`). Mover/compartir é atómico. O Adapter deixa
aberta a porta a sidecar/multi-ficheiro despois.

---

## 3. O pipeline de edición

A mesma filosofía declarativa do motor, aplicada á interacción:

```
Intent → Tool → Operation → Command → Transaction → Validation → Document → Layout → Renderer
```

- **Intent** — o usuario non pensa «activar a ferramenta Move»; pensa «mover este
  nodo». A intención precede á ferramenta.
- **Tool** — resolve a intención (Select, Move, Edge, …). Rexistrable (Tool
  Registry), non hardcode.
- **Operation** — agrega interacción viva. Un drag = 600 `mousemove` → **unha**
  Operation → **un** Move Command ao soltar. Evita 600 entradas de historial.
- **Command** — a unidade reversible e serializable.
- **Transaction** — agrupa (Move de 45 nodos = unha transacción = unha entrada de
  undo).
- **Validation** — **pode RECHAZAR**. Se a transacción rompe un invariante
  (exclusións simétricas, prereqs sen ciclo, `computeLayout().ok`, tipo non
  soportado polo Support Manifest), **abórtase e o Document nunca entra en estado
  inválido**. É exactamente o `unlock()`→rollback do motor. Mesma disciplina,
  mesmo bordo.
- **Document → Layout → Renderer** — resultado determinista.

---

## 4. Os sistemas do núcleo (headless)

- **Services Registry** — a columna. Os paneis non falan con React nin se coñecen
  entre si; **piden a un servizo** e non saben quen hai detrás:
  `SelectionService`, `HistoryService`, `ValidationService`, `SimulationService`,
  `ClipboardService`, `AssetService`, `ViewportService`. Esta é a diferenza entre
  «React Editor» e «Editor Engine».
- **Command → Snapshot** — o historial garda **snapshots** (Immer xa está: barato,
  robusto); o usuario opera con **comandos**. A **simulación nunca entra no undo**
  (cambiar `Faith +3` = undo; desbloquear `Holy Light` = NON undo: é runtime).
- **Selection Model** — `Node | Edge | Group | Region`, non só `Node`. Vive nun
  **Selection Engine** fóra do Canvas (toda a UI depende del). Algún día quererás
  mover un grupo enteiro.
- **FSM de interacción** — desde o día 1. Non podes estar *dragging* + *editing
  label* + *marquee* + *creating edge* á vez. A máquina de estados evita o caos e
  é barata.
- **Event Bus** — **só notifica**, con eventos **tipados**. O estado vive nos
  stores/servizos; o bus non garda estado (senón «non se coñecen» convértese en
  «coñécense por nomes de evento»).
- **Property Registry** — describe **conceptos**, non widgets:
  `{ path, label, category, concept: "resource", visibleIf, enabledIf, validator,
  examples }`. O **widget** resólveo o contexto (inspector clásico / property grid
  / móbil / bulk edit / plugin). En v1 o resolver concepto→widget é 1:1 trivial; a
  separación queda na arquitectura.

---

## 5. Support Manifest — o contrato executable do motor

A peza que faltaba, e que **goberna** ás outras fontes de verdade
(TypeScript / Zod / Runtime). Vive en **`@core`** (quen mellor sabe o que soporta o
motor é o propio motor):

```ts
import { supportManifest } from "@yggdrasil-forge/core"  // ou engine.describeSupport()
```

**Descritivo, non booleano:**

```jsonc
{
  "effects": {
    "modify-stat":   { "stable": true,  "since": "0.2" },
    "grant-resource":{ "stable": true,  "since": "0.1" },
    "spawn-node":    { "stable": false, "experimental": true }
  },
  "conditions": { "node-unlocked": {...}, "resource-min": {...}, "stat-min": {...} },
  "layouts":    { "identity": {...}, "clustered-radial": {...} },
  "shapes":     { "hexagon": {...}, "card": {...}, "circle": {...} }
}
```

O manifesto alimenta, dunha soa fonte:
1. **Gate de drift** — un `PropertyDescriptor` que apunte a algo **fóra** do
   manifesto → falla o build; un campo do manifesto **sen** descriptor → falla. A
   UI non pregunta «existe este campo?» senón «**o motor soporta este concepto?**».
2. **Capability System** — a UI activa/desactiva segundo o manifesto + o perfil do
   documento (derivado, non declarado a man; fino, non permisos).
3. **Documentación, autocompletado, exemplos, plugins** — unha fonte, moitas
   representacións.

Resultado: o caso `modify-stat` (declarado en tipo+Zod, **non** implementado en
runtime, que nos rebentou) faise **estruturalmente imposible**.

---

## 6. Agnose de forma — INVARIANTE

**A forma do nodo é dato do `NodeDef`/tema, NON unha decisión do editor.** O editor
autora `TreeDef`; o renderer (`@react`) xa pinta calquera `shape`. Polo tanto:

- O editor debe reproducir **todo o feito**: Oberón en **tarxetas**, cyberware en
  **hexágonos**, constelacións, círculos, formas custom — todas de primeira clase.
- O lenzo renderiza a **forma declarada**. O panadeiro vese **en tarxetas** (a súa
  forma canónica), non re-skinead a hexágonos. *(Corrección sobre os mockups de
  referencia, que defaultearon o lenzo a hexágonos.)*
- Nada de «semántica nas caras do hexágono». A semántica vive no `NodeDef` e no
  inspector, **independente da forma**.

---

## 7. A superficie de UI (a cara)

**Tres zonas** + barra superior + faixa inferior emerxente. Acoplamento magnético
(tiling), flotantes permitidos pero **sen vinte columnas**. **Presets** na barra
(Deseño / Árbore / Testeo) + Reset.

- **Esquerda — Outliner.** Non árbore de ficheiros: `Regións → Clusters → Nodes`,
  con cor e icona.
- **Centro — Lenzo.** Protagonista. `EditorCanvas → SkillTree (PURO) → Overlay`. O
  renderer non se contamina; o overlay debuxa handles/selección/marquee/snapping/
  guías/rulers. **Sen grid permanente** (iso é CAD): grid e guías **aparecen ao
  mover e desaparecen ao soltar** (modelo Affinity). **Hover** = anel fino +
  elevación 2px (nunca glow enorme; haberá centos de nodos). **Handles** só en
  hover/selección, pequenos. **Snapping multi-fonte** (nodo / cluster / guía /
  image-anchor), cada fonte cunha cor. **Fondo opcional** en **capa separada**
  (`Image → Overlay → Nodes`) con opacity/contraste/desaturación, ancorado **1:1**
  ao espazo (nada de parallax → marea).
- **Dereita — Inspector.** Densidade progresiva; **cambia segundo a ferramenta
  activa, non só segundo a selección**. Xerado polo Property Registry. Tabs:
  Ferramenta / Propiedades / Estilo / Datos. Contén o contrato enteiro do
  `NodeDef`: id, nome, descrición, icona, cor, estado inicial, posición,
  relacións, **custo base** (recursos+stats), efectos, desbloqueos, **exclusións**,
  notas.
- **Inferior (emerxente).** **Problemas/Validación** e **Preview**, tipo terminal,
  só cando fan falta.

**Dous modos no MESMO lenzo** (o espazo non cambia; o cerebro conserva o mapa),
sinalados por **atmosfera**, non por badge:
- **Autoría** (acento **azul**): grid/guías/handles/overlay, todo editable.
- **Preview** (acento **verde**): grid/handles/overlay desaparecen; aparece runtime
  (glow, desbloqueo en vivo, partículas); lenzo estrutural en **só-lectura**; o
  Inspector vólvese **monitor de variables**. A transición cambia o
  **comportamento visual**, non só unha etiqueta.

---

## 8. Validación como guardarraís

O panel **Problemas** corre as nosas leccións **en vivo**, con severidades
(Erro / Aviso / Info):
- **Exclusións simétricas** (A.6.30): «X exclúe Y pero non á inversa».
- **Prereqs alcanzables e sen ciclos** (gates, non invariantes — A.6.28).
- **`computeLayout().ok`** e tempo (A.6.31): «Layout compute: OK (2.31s)».
- **Tipos vs Support Manifest** (§5): efecto/condición/forma non soportada.
- **Nodos fóra da área ancorada á imaxe** (info).
- Nodo sen descrición, icona recomendada, etc.

A SAÍDA resume: Estrutura / Tipos e referencias / Layout compute / Efectos /
Recursos. O editor non deixa repetir os erros que nós sufrimos.

---

## 9. Estilo (chrome do editor)

- **Cara neutra que desaparece.** Grafito/negros mate (#0B0B0C–#121214), bordos
  1px. Tipografía UI **Inter**; datos **JetBrains Mono**. **Un** acento: **azul**
  (Autoría) / **verde** (Preview); ámbar (aviso) / vermello (erro). Só temas
  **Dark/Light**.
- **Separación dura de identidade.** A UI do editor **nunca** a tematiza o
  proxecto. O proxecto tematiza **lenzo + nodos** desde un panel de «Tema do
  grafo». (Editor mate; contido luminoso — nunca competir.)
- Medidas de referencia (1440p): barra superior 48px, sidebar esquerda 280px
  (colapsada 56px), inspector dereita 320px (colapsado 56px), marxes panel 16px,
  ritmo vertical constante.

---

## 10. Estadeamento

- **v1 — «Editor canónico»:** Open → Select → Move → Edit Properties → Save,
  impecable. Inclúe a **espiña**: Document/Session, Command→Snapshot, Selection
  Engine, FSM, Validation-que-rexeita, EditorCanvas+Overlay con 2 tools
  (Select/Move), Inspector por Property Registry, dockview tras PanelHost,
  Workspace persistente mínimo, **Support Manifest mínimo en `@core`**.
- **v1.1:** Undo / Redo / Clipboard.
- **v1.2:** Edge Tool / Group Tool / Region Tool.
- **v2:** Plugins (API mínima: `registerPanel/Command/Importer/Exporter/
  InspectorSection/Validator/Tool/Layout`), Asset Manager, Capability System
  completo, Template Library, **Context Zoom semántico** (afastar → «Combat/Magic»;
  achegar → nodos → custos), materiais por estado.

> «O primeiro ano non se escribe código; escríbese infraestrutura.» O v1 demostra
> cinco capacidades; todo o demais constrúese enriba.

---

## 11. Invariantes (os non-negociables)

1. **Núcleo headless e testable sen React.**
2. **Agnose de forma** (a forma é dato, non decisión do editor).
3. **Validation pode rexeitar; o Document sempre é válido.**
4. **Support Manifest é a verdade; nada o pode contradicir.**
5. **`@editor-react` → `@editor-core` → `@core`**, nunca ao revés.
6. **Os paneis non se coñecen**: comunícanse por Services + Event Bus tipado.
7. **§13 — a xeneralidade gáñase caso a caso.** Constrúese a espiña; medramos cara
   aos sistemas cando os toquemos. O labirinto-de-abstracción é tan perigoso coma o
   labirinto-de-estado-compartido.
8. **Cada subsistema = un briefing de magnitude acoutada, testable en illamento**
   (Director→Executor→Agarfal). O pipeline e as costuras fano posible.

---

## 12. O diagrama (o mental model do editor)

```
            ┌───────────────────────────────────────────────┐
            │                Support Manifest                │  (en @core, gobierna)
            └───────────────────────────────────────────────┘
                                  ▲ (valida contra)
 Workspace → Session → Document → Selection → Viewport
                  │
                  ▼
   Intent → Tool → Operation → Command → Transaction → Validation ──(rexeita)──▶ ✗
                                                          │ (ok)
                                                          ▼
                                              Document → Layout → Renderer
                                                          ▲
                                              Services Registry
                  (Selection · History · Validation · Simulation · Clipboard · Asset · Viewport)
```

---

## 13. Seguinte paso

Validado este documento por Agarfal, baixo a **Fase 7.x** en briefings, empezando
pola espiña do v1:
1. `@editor-core` scaffold + Document/Session + Document Adapter.
2. Command/Transaction/Validation (rexeita) + Command→Snapshot (Immer).
3. Selection Engine + FSM.
4. **Support Manifest** en `@core` + gate de drift.
5. `@editor-react` + PanelHost(dockview) + as tres zonas.
6. EditorCanvas (SkillTree+Overlay) + tools Select/Move + snapping.
7. Inspector por Property Registry (campos existentes do `NodeDef`).
8. Save/Open (Document Adapter, ficheiro namespaced).

Cada un, un briefing acoutado e testable.

---

# Anexo as-built (v1.0 — tras a fase 7, 2026-07-27)

O documento de arriba escribiuse ANTES de implementar nada. Este anexo é o
contraste honesto coa realidade construída (espiña 7.1–7.4 e cara 7.5–7.18b).
Referencias ás leccións: `MASTER.md` Annex A.

## Construído tal como se soñou

Os dous paquetes coa frecha de dependencia sagrada · capas
Workspace/Session/Document/TreeDef (disposición en localStorage 7.7; sesión de
Proba efímera fóra do undo 7.6 — o "desbloquear ≠ undo" do §4, literal) ·
Command→Transaction→Validation-que-rexeita (o YGG_V001 de 7.5f foi este deseño
traballando; A.6.42) · SelectionEngine fóra do canvas (nodos e arestas) ·
Property Registry (nodo 7.5c, árbore 7.12) · Support Manifest en @core (+ o
dique de campos, evolución non prevista) · dockview tras PanelHost (regra de
contención repetida con CodeMirror en 7.15b) · Gardar/Abrir namespaced (7.10)
· modos no mesmo lenzo con atmosfera azul/verde (Proba real desde 7.6) ·
separación dura chrome do editor / tema do grafo (§9 → pestana Tema 7.5e;
costura deseñada en 7.9, A.6.41).

## Onde a realidade decidiu distinto (superseded, con motivo)

- **FSM/Tool Registry/Operation (§5):** construído latente (7.3) e
  deliberadamente NON espertado (decisión §13 documentada en 7.11); a máquina
  ad-hoc do canvas chegou. O principio Operation ("600 mousemove → UN comando")
  segue vixente como doutrina — "un xesto = un undo" — e mesmo cazou un bug
  (slider de iconScale).
- **Services Registry + Event Bus tipado (§6):** non existen como tales; os
  paneis falan por subscrición ao engine e selección compartida. Máis simple e
  abondou; o invariante 6 relaxouse na práctica.
- **Grafito escuro por defecto (§9):** superseded polo dono — marfil cálido por
  defecto (7.5d) + escuro refrescado con selector (7.8). A intención (chrome
  recesivo, o grafo protagonista) consérvase; cambiou a temperatura.
- **Presets de barra Deseño/Árbore/Testeo (§8):** morreron sen nacer; menú
  Paneis + Restaurar disposición (7.7) cumpriu mellor.
- **Inspector por pestanas Ferramenta/Propiedades/Estilo/Datos (§8):** un só
  Inspector por registry + pestanas irmás Tema (7.5e) e Código (7.15b).
- Non feitos (sen dor pola ausencia, candidatos de sempre): snapping, regras,
  guías, hover elevation, handles de transformación, tarxeta como FORMA de
  nodo (a vista de tarxetas 7.15c cobre o caso GAIA por outra vía).

## O que a realidade engadiu (non previsto aquí)

`meta.theme` no documento (7.5e) e `textColor` (7.8.2) · modo Proba completo
con recursos/grant/explainUnlock (7.6) · composites de creación con cascada
(7.11) · fixture adversarial e a lección dos "defaults afortunados" (7.13) ·
**a vía do dato enteira** (7.15–7.18: JSON Schema publicado con gate de drift,
galería de ouro, CLI ygg validate/new/layout/render, panel Código, vista de
tarxetas, auto-layout con motor layered para DAGs) · o taller de tres roles
(Director/Executor/Tester) coa suite E2E de navegador real.

## Vixente do §10-v2, reforzado polo Cliente Zero

O **Context Zoom semántico** (afastar → categorías; achegar → nodos) pasou de
soño a necesidade validada: o universo real de GAIA trae 1.652 nodos en tres
niveis (galaxy/constellation/concept). Xunto co arco de rendemento (liña base
do Tester: ~0,7s por arrastre a 1.500 nodos), é o candidato natural da
seguinte era.
