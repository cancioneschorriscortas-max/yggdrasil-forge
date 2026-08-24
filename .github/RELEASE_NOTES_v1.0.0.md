# Yggdrasil Forge 1.0.0 🌳

*(English below)*

## Galego

**Un motor de grafos de progresión — skill trees, currículos, tech trees — no que o dato é o contrato e o aspecto vén por declaración.** Nacido en galego, para Oberón (a sección de profesións da app educativa GAIA), e deseñado desde o primeiro día para que os xogos e os camiños de aprendizaxe non queden fóra.

### O que trae o 1.0

- **Renderer tematizable** (`@yggdrasil-forge/react`): SkillTree SVG accesible con pan/zoom, temas claro/escuro, recheos por estado, rexións tintadas e tres sets de iconas recoloreables (builtin, norse, logic).
- **Editor completo** (`examples/editor`, sobre `editor-core`/`editor-react`): crear, mover e conectar; Inspector guiado polo rexistro de propiedades; validación en vivo coa «conciencia» (Problemas); auto-layout con cinco motores; vista de tarxetas; presets de tema con nome; selector visual de iconas; modo Proba; exportación SVG/PNG; **autosave con recuperación** e **PWA instalable que funciona sen rede**.
- **A vía do dato** (`@yggdrasil-forge/cli`): JSON Schema publicado, galería de ouro garantida por test, e `ygg validate · layout · render · schema · new` — unha IA xera unha árbore completa, validada, colocada e vestida sen abrir o editor.
- **Docs públicas bilingües** (galego primeiro): https://cancioneschorriscortas-max.github.io/yggdrasil-forge/

### Auditoría contra a liña de «feito» (ROADMAP §2)

| # | Punto da liña | Estado | Evidencia |
|---|---|---|---|
| 1 | Renderer 2.0 — átomo visual + viewport + temas | ✅ | F10: `SkillNode`/`SkillEdge`/`useViewport`; `minimal`/`minimalDark`; `ThemeProvider`; sets de iconas (F10.5, 7.19) |
| 2 | Importador GAIA-shaped + `descriptionPerTier` | ✅ con emenda | `@yggdrasil-forge/importers` (`gaia.ts`, F9). **Emenda honesta**: `NodeDef.tiers` (descriptionPerTier) queda **post-1.0 co tipo xa preparado** — no dique `UNIMPLEMENTED_NODEDEF_FIELDS` (7.5c-T2), a cláusula de escape que o propio §2 define |
| 3 | Layouts de Oberón (radial-por-clusters + manual + auto) | ✅ | F11 `clustered-radial` (list/cluster/fan, anchorNodeId); manual (`custom` + drag); auto «Dispor» con 5 motores incl. `layered` para DAGs (7.16–7.18) |
| 4 | Panel composible (slots) | ✅ | F12: `NodeInspector` con slots/strings, `SkillRegions` (rexións nomeadas con tinte), `SkillNodeControls` (±); promovidos a `@react` a petición de GAIA |
| 5 | Tema educativo pulido + escuro | ✅ | `theme-academic` (`examples/learn-yggdrasil`, F13); `minimalDark` + chrome escuro do editor (7.8) — *Same Data, Different Themes* probado |
| 6 | Editor núcleo aberto cara ao Studio | ✅ | F14–F15: importar → estilo → auto-layout → retocar → exportar; Código sincronizado, Problemas, picker, autosave, PWA (7.5–15.6) |
| 7 | Exemplos-proba: panadeiro + xogo + Duolingo | ✅ | `oberon-panadeiro` · `cyberware-ripperdoc` (action-RPG) · `learn-yggdrasil` (curso) — decisión 16.2/16.3 no ROADMAP |
| 8 | Docs para un descoñecido | ✅ | Docs site bilingüe (16.1): comeza aquí, contrato, guías, galería renderizada en cada build; gardas de i18n e ligazóns |

### Grazas

Ao taller enteiro — Director, Executores e Tester — e ao **Cliente Zero**: Oberón/GAIA, que pediu as cousas na orde correcta. E a quen chegue aquí: a mellor forma de empezar é [a túa primeira árbore en 5 minutos](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/comeza/primeira-arbore/).

---

## English

**A progression-graph engine — skill trees, curricula, tech trees — where the data is the contract and the looks come by declaration.** Born in Galician, for Oberón (the professions section of the GAIA educational app), and designed from day one so games and learning paths are not an afterthought.

### What 1.0 ships

- **Themable renderer** (`@yggdrasil-forge/react`): accessible SVG SkillTree with pan/zoom, light/dark themes, per-state fills, tinted regions and three recolorable icon sets (builtin, norse, logic).
- **A complete editor** (`examples/editor`, on top of `editor-core`/`editor-react`): create, move and connect; a registry-driven Inspector; live validation with a "conscience" (Problems panel); auto-layout with five engines; a cards view; named theme presets; a visual icon picker; Play mode; SVG/PNG export; **autosave with recovery** and an **installable PWA that works fully offline**.
- **The data path** (`@yggdrasil-forge/cli`): a published JSON Schema, a test-guaranteed gold gallery, and `ygg validate · layout · render · schema · new` — an AI can author a complete, validated, laid-out, dressed tree without ever opening the editor.
- **Bilingual public docs** (Galician first): https://cancioneschorriscortas-max.github.io/yggdrasil-forge/

### Audit against the line of done (ROADMAP §2)

| # | Line item | Status | Evidence |
|---|---|---|---|
| 1 | Renderer 2.0 — real visual atom + viewport + themes | ✅ | F10: `SkillNode`/`SkillEdge`/`useViewport`; `minimal`/`minimalDark`; `ThemeProvider`; icon sets (F10.5, 7.19) |
| 2 | GAIA-shaped importer + `descriptionPerTier` | ✅ with amendment | `@yggdrasil-forge/importers` (`gaia.ts`, F9). **Honest amendment**: `NodeDef.tiers` (descriptionPerTier) stays **post-1.0 with the type already in place** — in the `UNIMPLEMENTED_NODEDEF_FIELDS` dike (7.5c-T2), the escape clause §2 itself defines |
| 3 | Oberón's layouts (clustered radial + manual + auto) | ✅ | F11 `clustered-radial` (list/cluster/fan, anchorNodeId); manual (`custom` + drag); "Dispor" auto-layout with 5 engines incl. `layered` for DAGs (7.16–7.18) |
| 4 | Composable panel (slots) | ✅ | F12: `NodeInspector` with slots/strings, `SkillRegions` (named tinted regions), `SkillNodeControls` (±); promoted into `@react` at GAIA's request |
| 5 | One polished educational theme + dark | ✅ | `theme-academic` (`examples/learn-yggdrasil`, F13); `minimalDark` + the editor's dark chrome (7.8) — *Same Data, Different Themes*, proven |
| 6 | Editor core, open towards the Studio | ✅ | F14–F15: import → style → auto-layout → tweak → export; synced Code panel, Problems, picker, autosave, PWA (7.5–15.6) |
| 7 | Proof examples: baker + game + Duolingo-like | ✅ | `oberon-panadeiro` · `cyberware-ripperdoc` (action-RPG) · `learn-yggdrasil` (nested course) — the 16.2/16.3 decision in the ROADMAP |
| 8 | Docs a stranger can build a tree with | ✅ | Bilingual docs site (16.1): start here, the contract, guides, gallery rendered on every build; i18n and link guards |

### Thanks

To the whole workshop — Director, Executors and Tester — and to **Customer Zero**: Oberón/GAIA, who asked for things in the right order. If you just got here, start with [your first tree in 5 minutes](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/en/comeza/primeira-arbore/).
