# YGGDRASIL FORGE — FOLLA DE RUTA A 1.0 (Renderer → Studio)

> **Documento de folla de ruta. 4º Arquitecto.**
> **Supersede** o roadmap orixinal do MASTER §67 e integra o
> `TRANSITION-TO-NEXT-ARCHITECT.md` do 3º Arquitecto.
>
> **Orde de lectura para un arquitecto novo:** MASTER → este documento →
> briefings da sub-fase activa.
>
> Estado base verificado empíricamente: clone de `origin/main` en
> `155881b`. Fase 8 PECHADA. 7 paquetes activos + 13 scaffold.
> ~2195 tests. 51 sub-fases consecutivas sen rollback.

---

## 0. PARA O SEGUINTE ARQUITECTO — contexto en 60 segundos

- **Que é.** Yggdrasil Forge é un **motor de progression graphs** (skill
  trees) open-source. O motor (Fases 1–8) está **maduro e sólido**: core
  extenso, tests abundantes, cero rollbacks. **Ese é o foso. Non se toca
  salvo amplíación aditiva.**
- **Que estaba mal.** O renderer `@yggdrasil-forge/react` (Fase 7) naceu
  **sen North Star visual** — saltou a regra *mockup → arquitectura →
  código*. É literalmente un `<circle>` + `<text>` centrado. Non serve.
- **Cliente cero.** **Oberón**, a sección de profesións da app educativa
  **GAIA** (repo aparte: `github.com/cancioneschorriscortas-max/gaia-frontend`).
  Oberón **consome** a librería; non vive neste repo.
- **A decisión desta sesión.** Reorganizar todo arredor dunha meta
  **finita e alcanzable**: chegar a 1.0 sen scope infinito. Este
  documento é esa meta.

---

## 1. DOUTRINA — *Build narrow, design wide*

A razón pola que "faltaban moitísimas cousas" foi que o roadmap mesturaba
**tres proxectos distintos** (produto Oberón / librería xenérica /
plataforma con editor) sen fronteira. Sen fronteira, o alcance é infinito.

A reconciliación, que é a **lei deste documento**:

> **1.0 constrúese ESTREITO (serve a Oberón). 1.0 deséñase ANCHO
> (non lle pecha a porta a xogos nin a Duolingo).**

- O que **entregamos** en 1.0 é o necesario para Oberón.
- O que **non rompemos nunca** é o resto de casos de uso.

**Test que pasa CADA decisión arquitectónica (tipos, temas, layout, API):**

> **«¿Isto pecharíalle a porta a un dev de videoxogos ou de Duolingo?»**
> Se a resposta é *si* → **rexéitase** e búscase a versión xenérica.

A maioría de quen chega a este repo quere skill trees de xogos. Que nós
o usemos para Oberón non cambia iso. **Sen design-wide non hai post-1.0.**

---

## 2. A LIÑA DE 1.0 — definición de «feito»

> **Yggdrasil Forge 1.0 = renderizar as árbores estilo Oberón/panadeiro
> de forma bonita e tematizable, importalas desde datos tipo GAIA, e un
> editor núcleo para crealas/axustalas — todo deseñado para que xogos e
> Duolingo non queden fóra.**

1.0 entrega, como mínimo:

1. **Renderer 2.0** — átomo visual real + viewport + sistema de temas.
2. **Importador** GAIA-shaped → `TreeDef`, e o campo `descriptionPerTier`.
3. **Layouts** que Oberón usa (radial-por-clusters + manual + auto).
4. **Panel composible** (slots) para que a app meta o seu cromo.
5. **1 tema educativo pulido** + sistema de temas aberto (+1 tema escuro
   como proba de "Same Data, Different Themes").
6. **Editor núcleo** (importar → estilo → auto-layout → retocar → exportar
   `TreeDef`), simple pero **aberto** cara ao Studio.
7. **Exemplos-proba**: Oberón-panadeiro + un de xogo + un Duolingo.
8. **Docs** que permitan a un descoñecido construír unha árbore.

Todo o demais (atlas PoE, 6 temas de marketing, DevTools, CLI, Neo4j,
adapters Vue/Svelte/Solid…) é **post-1.0**, pero co tipo **xa preparado**.

---

## 3. FRONTEIRA LIBRERÍA ↔ APLICACIÓN (Oberón / GAIA)

**O único contrato entre GAIA e Yggdrasil é o `TreeDef` (JSON/YAML).**

- A **base de datos é problema de GAIA**. A librería non a toca nunca.
- **Importar** = mapear datos de GAIA → `TreeDef`.
- **Exportar** = gardar o `TreeDef` (que GAIA mete na súa BD).
- **«Varios estilos»** = presets de **(layout + tema)** aplicados aos
  **mesmos datos**. Trocar de estilo recoloca, non re-importa.

Reparto de responsabilidades na pantalla do panadeiro (mockup Oberón):

| Capa | Quen | Que |
|---|---|---|
| **Árbore central** | **Librería** | nodos en clusters, conectores curvos, estados, niveis, panel-con-slots |
| **Cromo** | **Oberón (gaia-frontend)** | radar de afinidade, arte de personaxe, cabeceira, lenda "como ler", integración do perfil do alumno |

**A ponte é `metadata`:** a librería **carga** `canonicalSkillId` e os
pesos da profesión sen entendelos; **GAIA calcula** a afinidade e debuxa
o radar. Así a librería segue valéndolle a un dev de xogos.

**Estrutura ≠ estado (importante).** O `TreeDef` é a estrutura **estática**
(nodos, grupos, conexións). O **estado** dinámico (que nodo está
desbloqueado, en que rango, % de progreso) é o `NodeInstance`/save que
xestiona o `TreeEngine` (doutrina §5.2: NodeDef frozen, NodeInstance
mutable). GAIA calcula a afinidade e pásaa como **estado inicial por nodo**
(progreso/tier), que o motor carga coa persistencia existente (Fase 3).
Polo tanto: o importador (9.3) produce **só estrutura**; a afinidade entra
como estado, por separado. Nunca se mestura.

> **O editor é un entregable DESTE repo** (paquete/app, cf. MASTER §37),
> **non** de gaia-frontend. Así o reutiliza calquera, non só Oberón.

---

## 4. MODELO DE DATOS GAIA → `TreeDef` (mapeo verificado)

Verificado contra os tipos reais en `packages/core/src/types/`. **Os
datos do panadeiro caben no motor actual case enteiros.**

Xerarquía GAIA: **Profesión → Grupo temático → Microskill**, máis 12
**skills canónicas** universais (atención, precisión, memoria,
comunicación, empatía, liderazgo, análise, resolución_de_problemas,
creatividade, planificación, coordinación, resistencia_física) que só
serven para o **cálculo de afinidade** (app), non para a estrutura.

| GAIA | Yggdrasil `TreeDef` | Estado |
|---|---|---|
| Profesión (coroa) | `NodeDef` `type: 'root'` | ✓ existe |
| Grupo temático | `GroupDef` (id, label, color, icon, position) | ✓ existe |
| Microskill | `NodeDef` (`group`, `position`, `icon`, `prerequisites`) | ✓ existe |
| `label_gl/es/en` | `LocalizedString = string \| {gl,es,en}` | ✓ existe |
| posición normalizada 0-1 | `Position {x,y}` (admite normalizado) | ✓ existe |
| 3 niveis (1/2/3) | `maxTier: 3` + `tier` (o "X/Y") | ✓ existe |
| `conectadas` (prereqs futuro) | `prerequisites` (UnlockRule) + `EdgeDef` | ✓ existe |
| `skill_canonica_id` (afinidade) | `metadata.canonicalSkillId` | ✓ cabe (opaco) |
| pesos 1-3 da profesión | `tree.metadata.canonicalWeights` | ✓ cabe |
| `skill_canonica_dominante` (grupo) | `GroupDef` via metadata convention | ✓ cabe |
| `accion_clave_gl` / poética | `NodeContent` / `description` | ✓ existe |

**A ÚNICA ampliación de motor necesaria:** info **por nivel/rango**.
Os datos reais de GAIA (campo `niveis`, aínda non pechado) dan a cada
nivel unha **etiqueta** ("Aprendiz/Oficial/Mestre") **e** unha
descrición. Hai `costPerTier` (custo por rango) e `effects`, pero non
texto por rango. → Campo opcional `tiers?: readonly { label?, description? }[]`
(complementa, non duplica, cost/effects). **É design-wide**: un RPG quere
"Rango 1: Iniciado, +5% / Rango 2: Adepto, +10%". → **Sub-fase 9.1.**
(GAIA marcou `niveis` e `criterio_acceso` como *non decididos*; o campo
nace co mínimo —label+description— e amplíase cando GAIA peche a forma.)

> `NodeType` xa inclúe `root`, `cluster`, `notable`, `small`, `mastery`,
> `keystone`, `milestone`, `gateway`… — sobra expresividade.
> `NodeState` inclúe `in_progress` con % (caso educativo).

---

## 5. FOLLA DE RUTA — F9 a F16

Convención: cada **fase** divídese en **sub-fases**; cada sub-fase é un
briefing/chat executor (MASTER §0.3). A numeración continúa desde Fase 8
(pechada). Esta lista **substitúe** §67.

Os esforzos son **orientativos** (XS/S/M/L), non compromisos de tempo.
O problema non é o tempo — é a **achievability**. Cada fase ten unha
**barra de aceptación** que define cando está feita.

---

### FASE 9 — Encaixe de datos *(Engine: GAIA data fit)*

**Obxectivo.** Que o motor cargue os datos de GAIA sen perdas e que exista
o camiño de importación. **Sen renderer.** Baixo risco, desbloquea todo.

- **9.1 — Info por rango en `NodeDef`** *(S)*.
  Campo opcional `tiers?: readonly NodeTierInfo[]` onde
  `NodeTierInfo = { label?: LocalizedString; description?: LocalizedString }`
  (índice = tier−1). Complementa `costPerTier`/`effects`, non os duplica.
  Wire no `treeDefSchema` (Zod). Tests. **Única ampliación de motor de
  toda a fase.** Deséñase extensible (engadir `criterio` por rango cando
  GAIA o peche).
- **9.2 — Convención de mapeo canónico** *(S)*.
  Documentar e validar `node.metadata.canonicalSkillId` +
  `tree.metadata.canonicalWeights` como ponte de afinidade. Regra de
  validación **opt-in** (non rompe quen non a use). **Cero tipos novos no
  core** — vive como convención + helper en `@importers`/`@validators`.
- **9.3 — `@importers` + importador GAIA** *(L)*.
  Activar scaffold `@importers` (aplicar fix DT-14). Importador
  configurable GAIA-shaped JSON → `TreeDef`. **Forma real coñecida**: o
  array `microskills` é **plano** con FK `grupo_id`; `conectadas` sempre
  presente e baleiro polo de agora (→ prerequisites/edges cando se encha);
  metadata de profesión (rol, bloque, salario_medio, proxeccion,
  risco_automatizacion, via_formativa, imaxe_escena_url, oberon_completo)
  → `tree.metadata`; `skills[]` con `peso` → `tree.metadata.canonicalWeights`;
  `video_url`/`video_proveedor` → `NodeContent`. Round-trip contra a
  **fixture real** `panadeiro.fixture.json` (5 grupos, 19 microskills).
  Cero perda de datos.
- **9.4 — Import/Export xenérico** *(M)*.
  Generalizar: `importTree(data, mapping)` (design-wide, non só GAIA) +
  export `TreeDef` → JSON/YAML.

**Aceptación F9:** o JSON real do panadeiro importa a un `TreeDef` válido
sen perda; o motor cárgao; os ~2195 tests seguen pasando; cero renderer.

---

### FASE 10 — Renderer 2.0 núcleo *(a grande)*

**Obxectivo.** O átomo visual real. Construír estreito (o que Oberón
precisa) pero co **sistema de tipos design-wide**.
**Regra do 3º Arquitecto: human visual check de Agarfal en CADA sub-fase.**

**Decisións fixadas (non re-litigar):**
- **Substrato = SVG** para 1.0 (Oberón/xogos/Duolingo son decenas–baixos
  centos de nodos; SVG é tematizable, accesible, SSR-friendly,
  debuggable). **Canvas/WebGL = post-1.0**, só para escala atlas.
- **Viewport** = transform nativo de `viewBox` SVG (preferir sobre
  `react-zoom-pan-pinch`; reservar esa dep para o editor se fai falta).
- **Política de deps:** core = só Immer. `@react` = mínimas. Iconas
  propias (SVG), **non** emojis en `<text>` (rompen).

- **10.1 — Fix `ThemeProvider` ascendente** *(XS)*.
  Bug coñecido (gap #1): non detecta provider ascendente. Desbloquea
  temas custom.
- **10.2 — Ampliación de tipos visuais** *(M)*.
  Todo **opcional, non-breaking**: `NodeDef.shape?` ('circle'|'hex'|'rect'
  |'star'), `NodeDef.size?` ('small'|'medium'|'large'|'mega');
  `EdgeDef.directed?`, estilo enriquecido ('straight'|'bezier'|
  'orthogonal'|'chain'); `GroupDef` ampliado (tint/glow/background/
  posición); `Theme` ampliado (typography/panel/background/nodeShape/
  edgeStyle/iconStyle). Zod + tests. **Fundamento design-wide.**
- **10.3 — `SkillNode` v2** *(L)*.
  Forma + icona real (foreignObject / icon registry) + **label FÓRA** do
  nodo + cor por estado + tier "X/Y" + overlay de **padlock** + size.
  Resolve gaps #2–#6. *Human visual check.*
- **10.4 — `SkillEdge` v2** *(L)*.
  bezier/ortogonal/recto/cadea + `directed` (frechas) + estado do edge
  (active/locked). Gaps #10–#11. *Human visual check.*
- **10.5 — Iconografía: iconset built-in + registry** *(M)*.
  Iconas SVG propias + registry para que o consumidor engada as súas. O
  icon-picker do Studio (F15) reutilízao. Design-wide.
- **10.6 — Viewport: pan + wheel-zoom + fit + bounds** *(L)*.
  Gap #7. *Human visual check.*
- **10.7 — Selección/hover (ring por tema) + eventos de nodo** *(S)*.
  Modelo de selección + `onSelect`. Gap #12.
- **10.8 — Aplicación de tema ampliado** *(M)*.
  Implementar typography/panel/background. (O tema educativo pulido é F13;
  aquí ponse a maquinaria.) Resolve gap arquitectónico de `Theme`.

**Aceptación F10:** un `TreeDef` de mostra renderiza con formas, iconas
reais, labels fóra, tiers, padlocks, edges curvos e dirixidos, e
pan/zoom/fit — **visualmente aprobado por Agarfal**, claramente camiño dos
mockups.

---

### FASE 11 — Layouts de Oberón

**Obxectivo.** As colocacións que Oberón usa. Atlas/tier/tech-tree
**diferidos**, pero co tipo de `LayoutConfig` xa previsto.

- **11.1 — `free-manual` (honra posicións dadas)** *(S)*.
  Oberón fornece posicións 0-1; este layout só escala a canvas. Extende/
  verifica o `CustomLayout` existente (4.4).
- **11.2 — `clustered-radial`** *(L)*.
  Grupos como sub-rexións arredor dun centro; microskills orbitan o seu
  grupo. **A forma estrela de Oberón** (panadeiro/camareiro). Sobre
  `RadialLayout` (4.2).
- **11.3 — auto orgánico (force-directed)** *(M, **diferir se non fai
  falta**)*. Auto-layout xeral para árbores sen posicións. Marcar como
  opcional dentro de F11.

**Aceptación F11:** o panadeiro renderiza coas súas posicións **e** con
auto clustered-radial; trocar de "estilo" recoloca sen tocar os datos.

---

### FASE 12 — Panel composible (slots) + clusters visuais

**Obxectivo.** Facer real a fronteira "librería dá ocos, app enche cromo".

- **12.1 — `DetailPanel` compositivo (slots / render-props)** *(L)*.
  Romper o panel monolítico en slots: header / body / requirements /
  bonuses / actions / footer. Resolve gap #13. GAIA inxecta radar+niveis;
  un xogo inxecta stats.
- **12.2 — Requisitos visuais (verde/vermello) + controis multi-tier** *(M)*.
  Display do check de requisitos + UI de incremento de tier (+/−) do panel
  do panadeiro / Mock Mastery. Gap #14 + multi-rank.
- **12.3 — Clusters/grupos visuais nomeados** *(M)*.
  Renderizar `GroupDef` como rexións nomeadas con tint/glow (as etiquetas
  "FORNO E MASAS", etc.). Gap #17.

**Aceptación F12:** o panel do panadeiro é reproducible vía slots (árbore
da librería + cromo enchido por GAIA); rexións de cluster visibles.

---

### FASE 13 — Tema educativo + exemplo PROBA

**Obxectivo.** A proba de que o núcleo de 1.0 funciona de verdade.

- **13.1 — Tema educativo (pulido)** *(L)*.
  Tokens cálidos/claros, tipografía, panel, formas, estilo de icona ao
  estilo Oberón. **O primeiro tema real.**
- **13.2 — Tema escuro/fantasy (proba Same-Data)** *(M)*.
  Segundo tema que proba que os **mesmos datos** renderizan en dúas peles
  (a promesa do mockup de comparación).
- **13.3 — `examples/oberon-panadeiro`** *(L)*.
  Punta a punta: importar o JSON real → clustered-radial → tema educativo
  → árbore renderizada con panel. *Human visual check = a barra real.*

**Aceptación F13:** Agarfal mira e di **«iso si se parece a Oberón»**. Os
mesmos datos renderizan en 2 temas.

---

### FASE 14 — Editor núcleo

**Obxectivo.** Activar a app/paquete editor. **Simple pero aberto.** NON
o Studio completo. **Guardrail:** arquitectura extensible (ferramentas
plug-ables, command pattern listo para undo/redo) para que F15 **non
requira reescritura**.

- **14.1 — Scaffold do editor + canvas (reusa o renderer)** *(L)*.
  O editor renderiza co **mesmo** renderer (modo PREVIEW). Estado con
  Zustand (stack §68). Carga desde `TreeDef`.
- **14.2 — Selección + editor de propiedades** *(L)*.
  Click nodo → editar label (i18n gl/es/en), icona (picker de 10.5), type,
  tier, `description`, `descriptionPerTier`, cost, prerequisites, stats,
  metadata. Escribe ao `TreeDef`.
- **14.3 — Engadir/mover/conectar/eliminar nodos e edges** *(L)*.
  Edición básica do grafo. Arrastrar = override de posición manual.
- **14.4 — Selector de estilo (layout+tema) + botón Auto-Layout** *(M)*.
  Elixir "estilo" → aplica layout engine + tema. **Isto é o «que o
  programa organice os datos segundo ese estilo»** que pediu Agarfal.
- **14.5 — Importar / Exportar `TreeDef`** *(M)*.
  Cargar GAIA JSON (importador F9) → editar → exportar `TreeDef`
  JSON/YAML. **A resposta a «integrar e exportar».**

**Aceptación F14:** Agarfal colle os datos do panadeiro, cárgaos, elixe
estilo, auto-layout, retoca un nodo, e exporta un `TreeDef`. Modular para
que F15 o extenda.

---

### FASE 15 — Studio *(expansión do editor)*

**Obxectivo.** A experiencia das imaxes 13/14 (ou mellor), sobre o núcleo
aberto de F14. Aquí **paga o design-wide**.

- **15.1 — Undo/redo (command stack) + auto-save** *(M)*.
- **15.2 — Vista código (Monaco) YAML/JSON** *(L)*.
- **15.3 — Sync bidireccional (Código ↔ Árbore) + Split view** *(L)* — *a
  peza máis dura do Studio*.
- **15.4 — Vista validación + panel de diagnósticos** *(M)*.
  Usa `@validators` (Fase 8). Overlay visual + lista de issues +
  "view in code".
- **15.5 — Icon picker UI + editor i18n + builder de prerequisites** *(M)*.
- **15.6 — Sistema de tabs (Preview/Edit/Code/Split/Validate) + PWA** *(M)*.
  Integración baixo o chrome de tabs. PWA/offline (MASTER §62).

**Aceptación F15:** edición visual + código + split + validación, todo
aberto e extensible, ao nivel (ou mellor) das imaxes 13/14.

---

### FASE 16 — Endurecemento 1.0

**Obxectivo.** Publicar 1.0 e **probar o design-wide** con exemplos non-Oberón.

- **16.1 — Docs site (Astro/Starlight)** *(L)*.
  Getting started, o contrato `TreeDef`, guía de theming, de layouts, do
  importador e do editor.
- **16.2 — `examples/game-rpg`** *(M)*.
  Árbore estilo xogo (Diablo-ish). **Proba que o renderer serve a xogos.**
- **16.3 — `examples/learning-path`** *(M)*.
  Camiño de aprendizaxe lineal/ramificado estilo Duolingo. **Proba o caso
  educativo non-Oberón.**
- **16.4 — Pase de a11y + perf** *(M)*.
  Teclado/ARIA (moito vén de Fase 7) + reduced-motion; perf para ~centos
  de nodos (escala atlas = post-1.0 canvas).
- **16.5 — Release 1.0** *(S)*.
  Changesets, CHANGELOG, bump, npm publish, README/branding.

**Aceptación F16:** 1.0 publicado; os **tres** exemplos (Oberón + xogo +
Duolingo) renderizan ben; as docs permiten a un descoñecido crear unha
árbore.

---

## 6. DIFERIDO A POST-1.0 (co tipo xa preparado)

Nada disto bloquea 1.0; todo debe quedar **non-pechado** polo design-wide:

- Os **6 temas de marketing** (gothicHorror, sciFiMatrix, techParchment,
  tieredCombat… ademais dos 2 de 1.0).
- **Atlas layout** (PoE, centos de nodos) → require **canvas/WebGL**.
- Layouts **tier** estrito, **era-horizontal** (tech tree), mastery radial
  avanzado.
- **DevTools**, **CLI**, **Neo4j adapter**, adapters **Vue/Svelte/Solid**.
- **Heatmap** analytics, **webhooks**, activación de **multi-tenancy**.
- **Marketplace** (MASTER §65, explicitamente no-goal en v1.0).

---

## 7. DISCIPLINA DE EXECUCIÓN (recordatorio para o seguinte arquitecto)

- **Verificación antes de prescrición.** Grep específico de método/campo
  antes de afirmar que algo "non existe" (lección 8.3 L1 / 8.6.a L1). O
  `TreeEngine` é enorme; nunca asumas.
- **Human visual check no renderer.** En CADA sub-fase de F10/F13.
  A regra que rompeu a Fase 7 non se repite.
- **Cero romper a cadea sen rollback** (51 e contando). Escalada antes de
  decisión unilateral (protocolo §0.6).
- **Aditivo, non breaking.** Os campos novos son **opcionais**. As
  ampliacións de `Theme` documéntanse no CHANGELOG; estamos en alpha, pero
  minimízase a rotura.
- **Comandos clave:** `pnpm turbo run test --force`,
  `pnpm turbo run typecheck --force`; `@common` constrúese antes dos tests
  de core; `lint:fix → format → lint → format:check`. Anti-placeholder
  grep antes de cada commit.
- **Briefings** por sub-fase (T0–TN, coverage ≥90% branch, sen regresión
  global, cabeceiras de estado con emoji). Entrega vía
  `git format-patch` / `git am --keep-cr`.

---

## 8. REXISTRO DE DECISIÓNS DESTA SESIÓN

1. **Reorganización** arredor de *build narrow, design wide*; §67 do MASTER
   queda superseded por este documento.
2. **Oberón vive en `gaia-frontend`** (repo aparte). A librería non toca a
   BD de GAIA. Contrato único = `TreeDef`.
3. **Substrato SVG** para 1.0; canvas/WebGL diferido a post-1.0 (atlas).
4. **O editor é entregable deste repo** (non de gaia-frontend).
5. **Única ampliación de motor para encaixar GAIA:** info por rango
   (`tiers: {label, description}[]`, 9.1). O resto do modelo do panadeiro
   xa cabe.
6. **Afinidade** é cálculo de **app** (GAIA), non da librería; a ponte é
   `metadata` (`canonicalSkillId` + `canonicalWeights`). A afinidade entra
   como **estado** (progreso/save), separado da estrutura (`TreeDef`).
7. **Contrato = JSON. Confirmado polos dous arquitectos (GAIA + Yggdrasil).**
   GAIA consulta Neo4j → entrega JSON ao compoñente. **Yggdrasil nunca toca
   Neo4j.** O paquete `@neo4j` queda como adapter **opcional post-1.0**.
8. **i18n permanece no contrato.** `LocalizedString = string | {gl,es,en}`
   acepta ambos: GAIA pode pre-traducir (string) ou pasar o obxecto.
   **Non se narrow o tipo** — o editor (tabs gl/es/en das imaxes 13/14) e
   os casos xogo/Duolingo precisan a forma obxecto. A estandarización de
   tradución de GAIA é externa e non afecta a este contrato.
9. **1.0 = árbores estilo Oberón/panadeiro + editor núcleo**, con xogos e
   Duolingo non-pechados. ~8 fases (F9–F16), finitas.

---

*Folla de ruta. 4º Arquitecto. A meta é alcanzable e está escrita. 🌳*
