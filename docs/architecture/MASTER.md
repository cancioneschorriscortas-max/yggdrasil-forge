# YGGDRASIL FORGE
## Documento mestre de arquitectura

> "The world tree from which all skill trees grow"

**Versión:** 6.0 — final pre-implementación
**Data:** 2026-05-10
**Estado:** aprobado para empezar implementación

---

## SOBRE ESTE DOCUMENTO

Este é o **documento mestre** do proxecto Yggdrasil Forge. Establece todas as decisións arquitectónicas, convencións, e o plan de execución completo. Está dirixido a:

- **O director do proxecto** (chat principal con o autor): mantén a visión global, asigna fases a chats executores, valida entregables, axusta o plan.
- **Os chats executores** (un por sub-fase): reciben briefings derivados deste documento, executan tarefas concretas, entregan código.
- **O autor (Agarfal)**: revisa o documento, reporta ao director os progresos dos executores, decide cando avanzar.

Todas as decisións aquí están **xa tomadas**. Non hai opcións pendentes. Os executores non deben preguntar "X ou Y?" — todo está aquí.

---

## ÍNDICE

### PARTE I — PROXECTO
0. Protocolo de traballo director-executor
1. Convencións de proxecto
2. Visión do proxecto
3. Perfís de usuario obxectivo
4. Filosofía de deseño
5. Decisións arquitectónicas críticas

### PARTE II — ESTRUCTURA
6. Arquitectura de paquetes
7. Tipos fundamentais
8. State management interno
9. Subscription patterns

### PARTE III — MOTOR
10. TreeEngine
11. TreeRegistry
12. StatComputer
13. UnlockResolver
14. Effects DSL
15. Time-based mechanics
16. External progress sources
17. Pedagogical validators
18. Sub-trees e composición
19. Tree federation

### PARTE IV — DATOS
20. Layouts
21. Persistencia
22. Migracións de esquema
23. Reconciliación de saves
24. CSV workflows
25. Builds, loadouts, snapshots
26. Comparación de builds
27. Audit trail
28. Search e filtering

### PARTE V — UI
29. Renderizado e temas
30. Animation framework
31. Internacionalización
32. Accesibilidade
33. Mobile e touch input
34. Read-only mode
35. Rich content
36. Heatmap e analytics visuais
37. Editor visual + wizards + templates

### PARTE VI — INTEGRACIÓN
38. SSR e React Server Components
39. Sistema de plugins e eventos
40. Plugin sandboxing
41. Webhooks
42. Importers / Exporters
43. Embed mode

### PARTE VII — ROBUSTEZ
44. Error handling
45. React error boundaries
46. Concurrency e thread safety
47. Failure modes
48. Performance e escalabilidade
49. Multi-tenancy primitives
50. Hot reload e dev experience

### PARTE VIII — OPERACIÓNS
51. Browser support matrix
52. Bundle splitting strategy
53. TypeScript export strategy
54. CLI
55. DevTools
56. Runtime metrics
57. Testing
58. Telemetría e analytics
59. Seguranza e privacidade

### PARTE IX — PROXECTO
60. API stability tiers
61. Backwards compatibility
62. Editor PWA / offline
63. Contribution model
64. Branding e documentación
65. Marketplace (futuro)
66. Versionado de paquetes
67. Roadmap por fases (executable)
68. Stack técnico
69. Licencia
70. No-goals
71. Diferenciación vs. competencia

### PARTE X — REFERENCIA
72. API final (exemplo)

---

# PARTE I — PROXECTO

## 0. PROTOCOLO DE TRABALLO DIRECTOR-EXECUTOR

### 0.1 Roles

**Director (chat principal, modelo actual):**
- Mantén o documento mestre actualizado
- Prepara briefings por sub-fase
- Recibe reportes do autor sobre o que entregaron os executores
- Valida que o entregado cumpre criterios
- Axusta o plan se algo cambia
- NUNCA executa código directamente; só dirixe

**Executor (chat novo, instancia separada):**
- Recibe briefing autosuficiente dunha sub-fase concreta
- Executa só o que pide ese briefing — nada máis, nada menos
- Non pregunta "X ou Y?"; todo está xa decidido no briefing
- Entrega código, ficheiros e instrucións de verificación
- Reporta ao final: "feito X, Y e Z; bloqueos: A, B"

**Autor (Agarfal):**
- Conexión humana entre director e executores
- Revisa o que o executor entrega
- Reporta ao director: "fíxose X, ten erro Y, non funciona Z"
- Decide cando empezar seguinte sub-fase

### 0.2 Fluxo

```
Director prepara briefing 0.1
  ↓
Autor abre chat novo, pega briefing 0.1
  ↓
Executor 0.1 fai o traballo
  ↓
Autor verifica e reporta ao director
  ↓
Director valida + prepara briefing 0.2
  ↓
... repítese ...
```

### 0.3 Estrutura dun briefing

Cada briefing por sub-fase contén:

1. **Identificación:** "Briefing para sub-fase X.Y de Yggdrasil Forge"
2. **Contexto mínimo:** que é Yggdrasil Forge en 3 liñas
3. **Que se fixo antes:** estado do proxecto á entrada
4. **Obxectivo desta sub-fase:** unha frase concreta
5. **Decisións xa tomadas:** non discutibles
6. **Tarefas a executar:** lista numerada con criterios "feito"
7. **Convencións obrigatorias:** comentarios INICIO/FIN, idiomas, etc.
8. **Que entregar ao final:** lista de ficheiros + instrucións de verificación
9. **Que NON facer:** scope creep evitable
10. **Como reportar:** formato esperado de resposta final

### 0.4 Granularidade

Sub-fases son atómicas: o que cabe nunha sesión razoable de chat. Tipicamente 1-3 horas de traballo do executor.

Se unha sub-fase é demasiado grande, divídese máis. Se é demasiado pequena, agrúpase con outra.

---

## 1. CONVENCIÓNS DE PROXECTO

**Obrigatorias para todos os executores. Non son opcionais.**

### 1.1 Repositorio

- **GitHub:** https://github.com/cancioneschorriscortas-max/yggdrasil-forge
- **Visibilidade:** público desde o inicio
- **Licencia:** MIT
- **Owner:** cancioneschorriscortas-max (Agarfal)
- **Path local de desenvolvemento:** `C:\Users\tajes\proxectos\yggdrasil-forge` (Windows, Git Bash: `/c/Users/tajes/proxectos/yggdrasil-forge`)

### 1.1.1 Restricións de entorno

O autor desenvolve en **Windows con Git Bash**, no disco C:\ (NTFS). O proxecto moveuse de D:\ a C:\ na sub-fase 0.1 porque D:\ era disco externo en exFAT (sen soporte de symlinks, incompatible con pnpm 11).

Decisións obrigatorias integradas no proxecto:

- **Node.js 22+** — `.nvmrc` está en `22`. `package.json` ten `engines.node: ">=22"`. Razón: pnpm 11+ require Node 22+.
- **pnpm 11.0.9** — versión declarada en `packageManager`. Os executores deben usar exactamente esta ou compatible.
- **`.npmrc` con `node-linker=hoisted`** — decisión inicial cando o proxecto estaba en D:\. Agora en C:\ podería revisitarse para usar o modo `isolated` por defecto de pnpm (con symlinks), pero a decisión queda **mantida por agora** para non introducir cambios adicionais nesta fase. **Revisable en sub-fase 0.5 ou posterior** se hai necesidade.
- **`.gitattributes` con `* text=auto eol=lf` + regras de binarios** — Git en Windows convertería LF→CRLF; o ficheiro forza LF para todos os colaboradores. Inclúe regras adicionais marcando `*.png`, `*.jpg`, `*.woff2`, etc. como `binary` para evitar diffs e conversións de encoding.
- **Turborepo telemetry desactivada** (`npx turbo telemetry disable`) — aliñado coa filosofía PRIVACY.md (opt-in only). Reversible se algún día se necesita.
- **Build scripts requiren aprobación explícita** — pnpm 11 ten `strictDepBuilds=true` por defecto. Calquera dependencia con `postinstall` ou similar (Biome, esbuild, electron, cypress, sharp, sqlite3, etc.) require ser explícitamente aprobada en `pnpm-workspace.yaml` no bloque `allowBuilds`. Procedimento estándar:
  ```bash
  pnpm add <pkg>
  pnpm approve-builds   # menú interactivo, seleccionar o paquete
  ```
  Os paquetes aprobados quedan rexistrados en `pnpm-workspace.yaml`. **Os executores deben rexistrar e xustificar cada nova aprobación no CHANGELOG.**

**Os executores futuros NON deben revertir estas decisións.** Se atopan problemas relacionados, repórtano ao director, non improvisan solucións alternativas.

### 1.2 Idiomas

| Contexto | Idioma |
|----------|--------|
| Nomes de clases, funcións, tipos públicos | Inglés (estándar npm) |
| Nomes de paquetes | Inglés (`@yggdrasil-forge/core`) |
| Variables locais | Inglés (consistencia) |
| Comentarios no código | **Castelán** |
| Documentación pública (README, docs site) | Inglés |
| Mensaxes de error públicas | Localizadas (gl/es/en) |
| Commit messages | Inglés (Conventional Commits) |
| Issues, PRs, discussions | Inglés |
| Comunicación co autor | Castelán ou galego (mestura natural) |

### 1.3 Convencións de código

- **Comentarios de bloque:** `// ── INICIO: descripción ──` / `// ── FIN: descripción ──` para marcar cambios significativos
- **Indentación:** 2 espacios
- **Comilla:** simples para strings, dobles só onde JSON o requira
- **Punto e coma:** non (Biome default)
- **Trailing commas:** sempre (multi-línea)
- **Líneas máx:** 100 caracteres
- **Arquivos:** UTF-8, LF (non CRLF)

### 1.4 Convención de commits

Usar **Conventional Commits**:

```
feat(core): add TreeEngine class
fix(react): resolve hover state bug in SkillNode
docs: update README with installation guide
refactor(core): split UnlockResolver into smaller modules
test(core): add property tests for DependencyGraph
chore: update dependencies
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.

### 1.5 Hábitos do autor

Estes son os patróns coñecidos do autor que os executores deben respetar:

- **Entregas completas, nunca fragmentos.** Se modificas un ficheiro, dálle o ficheiro enteiro, non só o diff. Os "fragmentos" causan errores.
- **Un cambio cada vez con verificación.** Non amontoar cambios sen probar.
- **Recordar git commit antes de cambios grandes.** Antes de calquera modificación substancial, recorda ao autor que faga commit.
- **Restart `node index.js` tras cambios backend.** Cando se modifique código backend, o executor debe recordar.
- **Verificar UI en GL/ES/EN.** Calquera cambio que afecte texto debe probarse nas tres locales.
- **Iteración rápida sobre planificación previa.** O autor prefire ver resultados rápidos e corrixir, non plans longos previos.
- **O autor pasa código a ChatGPT como revisor secundario.** Os executores deben tomar en serio críticas que o autor traia de ChatGPT, non desprezalas.

### 1.6 Estructura de directorios

Tal e como definida en sección 6. Os executores non improvisan estrutura.

### 1.7 Calidade

- **TypeScript strict mode obrigatorio.** Nada de `any` salvo casos extremadamente xustificados con comentario.
- **Tests obrigatorios** para cada función pública.
- **Cobertura mínima:** 90% no core, 80% nos demais paquetes.
- **Lint cero warnings** antes de PR.
- **Tipos cero errores** antes de PR.

---

## 2. VISIÓN DEL PROXECTO

Yggdrasil Forge é un motor de skill trees completo e profesional para a web:

- **Core engine** (paquete npm, framework-agnostic, dep única: Immer)
- **React renderer** (compoñentes headless con presets opcionais)
- **Visual editor** (PWA standalone)
- **Neo4j adapter** (sincronización con grafos)
- **CLI** (ferramenta de liña de comandos)
- **DevTools extension** (Chrome/Firefox)
- **Adapters Vue/Svelte/Solid** (en fases posteriores)

**Casos de uso:**
- Videoxogos web (RPG, RTS, idle games)
- Plataformas educativas
- Aplicacións de produtividade / habit tracking
- Visualización de coñecemento
- Onboarding gamificado
- Career coaching
- Corporate LMS / certificacións
- Multi-tenant SaaS educativos

**Posicionamento de mercado:** non hai competidores reais. `beautiful-skill-tree` (único próximo) leva 5 anos sen actualizar e só soporta árbores verticais lineais.

---

## 3. PERFÍS DE USUARIO OBXECTIVO

A arquitectura está deseñada para soportar estes 10 perfís sen requerir extensións custom para casos comúns:

1. **Game developer indie** — StatComputer, Effects DSL
2. **Profesor / educador** — External progress sources, audit trail
3. **Game designer non-programador** — Editor con wizards e templates
4. **Coach / mentor profesional** — TreeRegistry, multi-instance
5. **UX researcher** — Heatmap analytics
6. **Consultor empresarial / HR** — CSV workflows
7. **Profesor con prerrequisitos lóxicos** — Pedagogical validators
8. **Operador SaaS multi-tenant** — Multi-tenancy primitives
9. **Desenvolvedor LMS corporativo** — Time-based mechanics, webhooks
10. **Mod community** — Tree federation, plugin sandboxing

---

## 4. FILOSOFÍA DE DESEÑO ("THINKING IN YGGDRASIL")

### 4.1 Principios

1. **Datos como source of truth.** Un skill tree é primeiro un dato.
2. **Composición sobre configuración.** Plugins, hooks, sub-trees son a forma de extender.
3. **Mutable + reactivo.** O estado pode crecer e cambiar en runtime.
4. **Progressive disclosure.** API simple para casos simples; complexidade dispoñible cando se necesita.
5. **Tres tipos de skill tree:** Mecánico (RPG), Educativo (GAIA), Visualización (knowledge graphs). A mesma librería serve aos tres.
6. **Falla graciosa.** Datos inválidos non rompen. Plugins erróneos non rompen. Network down non rompe.
7. **Headless por defecto, styled por opt-in.** Quick start funciona out-of-the-box.
8. **Async-first nos writes.** Promise<Result> en operacións que tocan I/O ou hooks.

### 4.2 Anti-patróns

- ❌ String IDs duplicados
- ❌ Ciclos de dependencias non detectados
- ❌ Mutación directa de NodeDefs (frozen)
- ❌ Mestura de lóxica de UI no core
- ❌ Lazy state non serializable
- ❌ APIs síncronas que poden tocar I/O

---

## 5. DECISIÓNS ARQUITECTÓNICAS CRÍTICAS

Estas son as decisións que definen toda a estructura. **Cambialas despois forzaría refactor masivo. Os executores non as cuestionan.**

### 5.1 TreeDef MUTABLE pero rastrexable

**Decisión:** TreeDef pode crecer en tempo real. Engadir/quitar/modificar nodos en runtime.

**Razón:** Casos reais (educación crowdsourced, mods, sync con backend) implican miles de nodos creándose dinámicamente. Inmutable obrigaría a recrear todo en cada cambio.

**Implementación:**
- `TreeEngine.applyChanges(changes)` é o ÚNICO punto de mutación
- Caches (layouts, dependency graph, search index) invalidan automaticamente
- Cambios emiten eventos `treeChanged`
- Reconciliación automática de NodeInstances afectadas

```typescript
await engine.applyChanges([
  { type: 'add_node', node: newNodeDef },
  { type: 'modify_node', nodeId: 'x', changes: { cost: [{ resourceId: 'xp', amount: 5 }] } },
  { type: 'remove_node', nodeId: 'y' },
  { type: 'add_edge', edge: newEdge }
])
```

### 5.2 NodeDef FROZEN, NodeInstance MUTABLE

**Decisión:** Cada NodeDef individual é `Object.freeze()`. Modificar = substituír por novo NodeDef.

**Razón:** Permite compartir NodeDefs entre árbores (federation, sub-trees) con seguridade. Mutar un non afecta os outros.

**NodeInstance é mutable** (vive no estado do engine, cambia con unlocks/progress).

### 5.3 ASYNC-FIRST nos writes

**Decisión:** Todas as operacións públicas que poden tocar I/O, plugins ou hooks devolven `Promise<Result>`. Sync só para getters puros.

```typescript
// Async (writes, lecturas que poden tocar I/O):
await engine.unlock(id)              // Promise<Result>
await engine.applyChanges(changes)   // Promise<Result>
await engine.loadFromShareLink(c)    // Promise<Result>

// Sync (lecturas puras de memoria):
engine.getNodeState(id)              // NodeInstance | null
engine.getBudget()                   // Budget
engine.getMetrics()                  // EngineMetrics
```

**Razón:** Engadir async despois rompe APIs. Async desde o principio é flexibilidade futura sen custo presente.

### 5.4 EFFECTS como DSL declarativo

**Decisión:** Effects son obxectos JSON declarativos, non código. Cubre 90% dos casos sen executar código foráneo.

```typescript
type Effect =
  | { type: 'modify_resource', resourceId: string, op: '+' | '-' | '*', amount: number }
  | { type: 'modify_stat', statId: string, op: '+' | '-' | '*', amount: number }
  | { type: 'modify_node_state', nodeId: string, state: NodeState }
  | { type: 'set_node_visibility', nodeId: string, visible: boolean }
  | { type: 'unlock_node', nodeId: string }
  | { type: 'set_progress', nodeId: string, percent: number }
  | { type: 'trigger_event', eventName: string, payload?: unknown }
  | { type: 'conditional', condition: UnlockCondition, then: Effect[], else?: Effect[] }
  | { type: 'composite', effects: Effect[] }
  | { type: 'plugin', pluginId: string, params?: Record<string, unknown> }
```

**Razón:** Serializable, seguro (sen eval), inspectable, reversible (para respec).

### 5.5 HEADLESS + STYLED HYBRID

**Decisión:** `@yggdrasil-forge/react` é headless por defecto pero carga tema "minimal" automaticamente. Power users importan de `/headless` para 0 estilos.

```typescript
// Quick start (tema minimal automático):
import { SkillTree } from '@yggdrasil-forge/react'

// Headless puro:
import { SkillTree } from '@yggdrasil-forge/react/headless'

// Tema explícito:
import { ThemeProvider } from '@yggdrasil-forge/react'
import { oberon } from '@yggdrasil-forge/themes'
<ThemeProvider theme={oberon}><SkillTree .../></ThemeProvider>
```

### 5.6 Decisións resoltas das 5 críticas pendentes

#### 5.6.1 Auth en external progress sources (#3)

**Decisión:** Sistema de auth providers rexistrables. Tokens nunca persistidos.

```typescript
type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer', token: string }                    // Estático (testes)
  | { type: 'bearer', tokenProvider: string }            // Provider rexistrado
  | { type: 'apikey', header: string, key: string }
  | { type: 'apikey', header: string, keyProvider: string }
  | { type: 'basic', username: string, password: string }
  | { type: 'custom', requestHandlerId: string }

engine.registerAuthProvider('moodle-token', async () => {
  return await refreshTokenIfNeeded()
})
```

#### 5.6.2 Timezones en time-based mechanics (#4)

**Decisión:** Dual API. UTC ms para absolutos/relativos. Calendar object con timezone explícita para casos calendario.

```typescript
interface TimeConstraints {
  // UTC ms (absolutos):
  startsAt?: number
  expiresAt?: number

  // Relativos (TZ-independentes):
  validForMs?: number
  cooldownMs?: number
  reCertifyAfterMs?: number

  // Calendario (TZ-aware):
  expiresAtCalendar?: { date: string, time: string, timezone: string }
}

const engine = new TreeEngine(treeDef, {
  time: { enabled: true, timezone: 'Europe/Madrid' }
})
```

Usa `Intl.DateTimeFormat` (browser nativo, sen libs).

#### 5.6.3 Bulk operations atomicidade (#9)

**Decisión:** Tres estratexias. Default `stop-on-error`.

```typescript
type BulkStrategy = 'all-or-nothing' | 'best-effort' | 'stop-on-error'

await engine.unlockMany(['a', 'b', 'c'], { strategy: 'all-or-nothing' })
```

`all-or-nothing` aproveita snapshots: snapshot antes, restore se falla.

#### 5.6.4 TreeChange.modify_node restrinxido (#16)

**Decisión:** `id` e `type` non modificables vía modify. Operación dedicada para rename.

```typescript
type ModifyNodeChanges = Omit<Partial<NodeDef>, 'id' | 'type'>

type TreeChange =
  | { type: 'add_node', node: NodeDef }
  | { type: 'remove_node', nodeId: string, cascadeEdges?: boolean }
  | { type: 'modify_node', nodeId: string, changes: ModifyNodeChanges }
  | { type: 'rename_node_id', oldId: string, newId: string }
  | { type: 'add_edge', edge: EdgeDef }
  | { type: 'remove_edge', edgeId: string }
  | { type: 'modify_edge', edgeId: string, changes: Omit<Partial<EdgeDef>, 'id' | 'source' | 'target'> }
  | { type: 'add_group', group: GroupDef }
  | { type: 'remove_group', groupId: string }
  | { type: 'modify_group', groupId: string, changes: Partial<GroupDef> }
  | { type: 'add_resource', resource: Resource }
  | { type: 'modify_layout', changes: Partial<LayoutConfig> }
```

`rename_node_id` actualiza automaticamente todas as referencias (edges, exclusions, prerequisites, effects).

#### 5.6.5 TreeRegistry lazy loading (#18)

**Decisión:** Tres modos: all-in-memory, lru, on-demand. Aggregate queries directas sobre storage.

```typescript
class TreeRegistry {
  constructor(treeDef: TreeDef, options: {
    storage: StorageAdapter
    cache: {
      strategy: 'all-in-memory' | 'lru' | 'on-demand'
      maxInMemory?: number
      ttlMs?: number
    }
  })

  async getEngine(userId: string): Promise<TreeEngine>
  async createEngine(userId: string, build?: Build): Promise<TreeEngine>
  async getNodePopularity(): Promise<Map<string, number>>  // Sen cargar engines
}
```

#### 5.6.6 Versionado de paquetes (#27)

**Decisión:** Hybrid. Core sincronizado, periféricos independente.

**Core sincronizado:**
- `@yggdrasil-forge/common`
- `@yggdrasil-forge/core`
- `@yggdrasil-forge/react`
- `@yggdrasil-forge/themes`

**Periféricos independente:**
- `@yggdrasil-forge/cli`, `editor`, `neo4j`, `storage`, `i18n`, `analytics`, `search`, `diff`, `exporters`, `importers`, `webhooks`, `stats`, `validators`, `heatmap`, `multitenancy`, `devtools`, `vue`, `svelte`, `solid`

**Tooling:** `changesets` para xestionar releases. `peerDependencies` declarando versións de core compatibles.

---

# PARTE II — ESTRUCTURA

## 6. ARQUITECTURA DE PAQUETES

```
yggdrasil-forge/
├── packages/
│   ├── common/                     # Constantes, tipos compartidos
│   ├── core/                       # Motor principal
│   ├── react/                      # Compoñentes React
│   ├── vue/                        # Adapter Vue (fase posterior)
│   ├── svelte/                     # Adapter Svelte (fase posterior)
│   ├── solid/                      # Adapter Solid (fase posterior)
│   ├── editor/                     # Editor visual
│   ├── neo4j/                      # Adapter Neo4j
│   ├── cli/                        # CLI
│   ├── storage/                    # Backends de persistencia
│   ├── i18n/                       # Internacionalización
│   ├── analytics/                  # Adapters analytics
│   ├── themes/                     # Presets de temas
│   ├── search/                     # Motor de busca
│   ├── diff/                       # Comparación de builds
│   ├── exporters/                  # PNG/PDF/SVG
│   ├── importers/                  # Mermaid, Cytoscape, GraphML, CSV
│   ├── webhooks/                   # Webhooks server-side
│   ├── stats/                      # StatComputer extensions
│   ├── validators/                 # Pedagogical validators
│   ├── heatmap/                    # Analytics visuais
│   ├── multitenancy/               # Multi-tenant primitives
│   └── devtools/                   # Browser extension
│
├── apps/
│   ├── editor-web/                 # PWA do editor
│   ├── docs/                       # Sitio de docs (Astro + Starlight)
│   ├── playground/                 # Demo interactivo
│   └── embed/                      # Servizo de embebidos
│
├── examples/
│   ├── oberon/                     # Educativo (caso real GAIA)
│   ├── rpg-classic/
│   ├── poe-style/
│   ├── skyrim-constellation/
│   ├── tech-tree-rts/
│   ├── habit-tracker/
│   ├── corporate-lms/
│   ├── coaching-platform/
│   ├── nextjs-rsc/
│   ├── astro-island/
│   └── readonly-share/
│
├── docs/                           # Markdown adicional
├── scripts/                        # Scripts de build/release
├── .github/                        # CI/CD workflows
│
├── package.json                    # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── biome.json
├── .changeset/                     # Changesets config
├── LICENSE                         # MIT
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── GOVERNANCE.md
├── SECURITY.md
├── PRIVACY.md
├── CHANGELOG.md
└── README.md
```

### 6.1 Estrutura interna de @yggdrasil-forge/core

```
core/
├── src/
│   ├── types/
│   │   ├── node.ts
│   │   ├── edge.ts
│   │   ├── tree.ts
│   │   ├── subtree.ts
│   │   ├── layout.ts
│   │   ├── unlock.ts
│   │   ├── resources.ts
│   │   ├── i18n.ts
│   │   ├── progress.ts
│   │   ├── build.ts
│   │   ├── plugin.ts
│   │   ├── events.ts
│   │   ├── content.ts
│   │   ├── result.ts
│   │   ├── metrics.ts
│   │   ├── audit.ts
│   │   ├── stats.ts
│   │   ├── time.ts
│   │   ├── auth.ts
│   │   ├── changes.ts
│   │   └── index.ts
│   │
│   ├── engine/
│   │   ├── TreeEngine.ts
│   │   ├── TreeRegistry.ts
│   │   ├── StateStore.ts
│   │   ├── ChangeTracker.ts
│   │   ├── CacheInvalidator.ts
│   │   ├── UnlockResolver.ts
│   │   ├── DependencyGraph.ts
│   │   ├── ResourceManager.ts
│   │   ├── StatComputer.ts
│   │   ├── EffectsRunner.ts
│   │   ├── TimeManager.ts
│   │   ├── ProgressSourceManager.ts
│   │   ├── AuthProviderRegistry.ts
│   │   ├── PathFinder.ts
│   │   ├── Simulator.ts
│   │   ├── CycleDetector.ts
│   │   ├── ProgressTracker.ts
│   │   ├── RespecManager.ts
│   │   ├── BuildSerializer.ts
│   │   ├── Reconciler.ts
│   │   ├── Federator.ts
│   │   ├── ConcurrencyGuard.ts
│   │   ├── MetricsCollector.ts
│   │   ├── AuditLogger.ts
│   │   ├── SubtreeManager.ts
│   │   └── SubscriptionManager.ts
│   │
│   ├── layout/
│   ├── procedural/
│   ├── serialization/
│   ├── plugins/
│   ├── i18n/
│   ├── errors/
│   ├── utils/
│   └── index.ts
│
├── __tests__/
│   ├── unit/
│   ├── integration/
│   ├── property/
│   ├── ssr/
│   └── benchmarks/
│
├── package.json
└── tsconfig.json
```

---

## 7. TIPOS FUNDAMENTAIS

### 7.1 Result type

```typescript
type Result<T, E = YggdrasilError> =
  | { ok: true, value: T }
  | { ok: false, error: E }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })
```

### 7.2 Strings localizadas

```typescript
type Locale = string  // ISO 639-1: 'gl', 'es', 'en', 'gl-ES', etc.

type LocalizedString =
  | string
  | { [locale: string]: string }

interface I18nConfig {
  defaultLocale: Locale
  fallbackLocale: Locale
  resolver?: (key: string, locale: Locale) => string
}
```

### 7.3 Rich content

```typescript
type RichContent =
  | { type: 'text', value: LocalizedString }
  | { type: 'markdown', value: LocalizedString }
  | { type: 'html', value: LocalizedString, sanitized?: boolean }
  | { type: 'image', src: string, alt?: LocalizedString, width?: number, height?: number }
  | { type: 'video', src: string, poster?: string, provider?: 'youtube' | 'vimeo' | 'mp4' }
  | { type: 'audio', src: string }
  | { type: 'link', href: string, label: LocalizedString, external?: boolean }
  | { type: 'composite', items: RichContent[] }
  | { type: 'custom', componentId: string, props?: Record<string, unknown> }

interface NodeContent {
  tooltip?: RichContent
  detail?: RichContent
  preview?: RichContent
  unlocked?: RichContent
  flavor?: LocalizedString
}
```

### 7.4 Tipos de nodo

```typescript
type NodeType =
  | 'small' | 'notable' | 'keystone' | 'mastery' | 'ascendancy'
  | 'root' | 'cluster' | 'gateway' | 'milestone'
  | 'subtree_anchor' | 'custom'

type NodeState =
  | 'locked' | 'unlockable' | 'in_progress'
  | 'unlocked' | 'maxed' | 'disabled' | 'expired'

interface NodeDef {
  readonly id: string
  readonly type: NodeType
  readonly label: LocalizedString
  readonly description?: LocalizedString
  readonly content?: NodeContent
  readonly icon?: string
  readonly color?: string
  readonly tier?: number
  readonly maxTier?: number
  readonly cost?: Cost[]
  readonly costPerTier?: Cost[][]
  readonly effects?: Effect[]
  readonly prerequisites?: UnlockRule
  readonly exclusions?: string[]
  readonly tags?: string[]
  readonly searchKeywords?: string[]
  readonly metadata?: Record<string, unknown>
  readonly position?: { x: number, y: number }
  readonly group?: string
  readonly supportsProgress?: boolean
  readonly progressMilestones?: number[]
  readonly progressSource?: ProgressSourceConfig
  readonly subtreeId?: string
  readonly subtreeOverrides?: Partial<TreeDef>
  readonly timeConstraints?: TimeConstraints
  readonly statContributions?: StatContribution[]
}

interface NodeInstance {
  id: string
  state: NodeState
  currentTier: number
  progress?: number
  unlockedAt?: number
  unlockedBy?: string
  expiresAt?: number
  history?: StateChange[]
  subtreeState?: TreeState
}
```

NodeDef é frozen tras creación (`Object.freeze` recursivo).

### 7.5 TimeConstraints

```typescript
interface TimeConstraints {
  startsAt?: number                           // Timestamp UTC ms
  expiresAt?: number                          // Timestamp UTC ms
  expiresAtCalendar?: {                       // TZ-aware
    date: string                              // ISO YYYY-MM-DD
    time: string                              // ISO HH:mm:ss
    timezone: string                          // IANA: 'Europe/Madrid'
  }
  validForMs?: number
  cooldownMs?: number
  reCertifyAfterMs?: number
}
```

### 7.6 StatContribution

```typescript
interface StatContribution {
  statId: string
  op: '+' | '-' | '*' | '/' | 'min' | 'max' | 'set'
  value: number
  perTier?: boolean
  conditions?: UnlockCondition[]
}
```

### 7.7 ProgressSourceConfig

```typescript
type ProgressSourceConfig =
  | { type: 'manual' }
  | {
      type: 'remote',
      endpoint: string,
      intervalMs?: number,
      headers?: Record<string, string>,
      auth?: AuthConfig
    }
  | { type: 'callback', handlerId: string, intervalMs?: number }
  | { type: 'event', eventName: string }
  | {
      type: 'computed',
      dependsOn: string[],
      formula: 'sum' | 'avg' | 'min' | 'max'
    }
```

### 7.8 AuthConfig

```typescript
type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer', token: string }
  | { type: 'bearer', tokenProvider: string }
  | { type: 'apikey', header: string, key: string }
  | { type: 'apikey', header: string, keyProvider: string }
  | { type: 'basic', username: string, password: string }
  | { type: 'custom', requestHandlerId: string }
```

### 7.9 Effects DSL

```typescript
type Effect =
  | { type: 'modify_resource', resourceId: string, op: '+' | '-' | '*', amount: number }
  | { type: 'modify_stat', statId: string, op: '+' | '-' | '*', amount: number }
  | { type: 'modify_node_state', nodeId: string, state: NodeState }
  | { type: 'set_node_visibility', nodeId: string, visible: boolean }
  | { type: 'unlock_node', nodeId: string }
  | { type: 'set_progress', nodeId: string, percent: number }
  | { type: 'trigger_event', eventName: string, payload?: unknown, irreversible?: boolean }
  | { type: 'conditional', condition: UnlockCondition, then: Effect[], else?: Effect[] }
  | { type: 'composite', effects: Effect[] }
  | { type: 'plugin', pluginId: string, params?: Record<string, unknown> }
```

### 7.10 Resources, Costs, Budget

```typescript
interface Resource {
  id: string
  label: LocalizedString
  icon?: string
  color?: string
  initial?: number
  max?: number
  refundable?: boolean
  refundPercent?: number
}

interface Cost {
  resourceId: string
  amount: number
}

interface Budget {
  resources: Record<string, number>
}
```

### 7.11 UnlockCondition e UnlockRule

```typescript
type UnlockCondition =
  | { type: 'node_unlocked', nodeId: string }
  | { type: 'node_maxed', nodeId: string }
  | { type: 'node_state', nodeId: string, state: NodeState }
  | { type: 'nodes_count', count: number, scope?: string }
  | { type: 'resource_min', resourceId: string, amount: number }
  | { type: 'tier_min', nodeId: string, tier: number }
  | { type: 'distance_max', fromNodeId: string, maxSteps: number }
  | { type: 'tag_count', tag: string, count: number }
  | { type: 'progress_min', nodeId: string, percent: number }
  | { type: 'subtree_completion', subtreeId: string, percent: number }
  | { type: 'stat_min', statId: string, amount: number }
  | { type: 'time_after', timestamp: number }
  | { type: 'time_before', timestamp: number }
  | { type: 'custom', evaluator: string }

type UnlockRule =
  | { type: 'all', conditions: UnlockCondition[] }
  | { type: 'any', conditions: UnlockCondition[] }
  | { type: 'none', conditions: UnlockCondition[] }
  | UnlockCondition
```

### 7.12 Builds, snapshots, loadouts

```typescript
interface Build {
  id: string
  treeId: string
  treeVersion: string
  schemaVersion: string
  label?: LocalizedString
  author?: string
  createdAt: number
  updatedAt: number
  state: TreeState
  parentBuildId?: string
  tags?: string[]
}

interface TreeState {
  nodes: Record<string, NodeInstance>
  budget: Budget
  computedStats?: Record<string, number>
  metadata?: Record<string, unknown>
  subtreeStates?: Record<string, TreeState>
}

interface BuildShareLink {
  url: string
  shortCode: string
  qrCode?: string
  embedUrl?: string
}
```

### 7.13 Audit

```typescript
interface AuditEntry {
  id: string
  timestamp: number
  actor?: string
  action: AuditAction
  context?: Record<string, unknown>
  rollbackable?: boolean
}

type AuditAction =
  | { type: 'node_unlocked', nodeId: string, tier: number }
  | { type: 'node_locked', nodeId: string }
  | { type: 'progress_updated', nodeId: string, from: number, to: number }
  | { type: 'respec', nodeIds: string[] }
  | { type: 'build_imported', source: 'url' | 'file' | 'remote' }
  | { type: 'tree_loaded', treeId: string }
  | { type: 'tree_modified', changes: ReconcileChange[] }
  | { type: 'tree_changed', changes: TreeChange[] }
  | { type: 'node_expired', nodeId: string }
  | { type: 'progress_synced_external', nodeId: string, from: number, to: number }
  | { type: 'custom', name: string, data: unknown }
```

### 7.14 TreeChange

```typescript
type TreeChange =
  | { type: 'add_node', node: NodeDef }
  | { type: 'remove_node', nodeId: string, cascadeEdges?: boolean }
  | { type: 'modify_node', nodeId: string, changes: Omit<Partial<NodeDef>, 'id' | 'type'> }
  | { type: 'rename_node_id', oldId: string, newId: string }
  | { type: 'add_edge', edge: EdgeDef }
  | { type: 'remove_edge', edgeId: string }
  | { type: 'modify_edge', edgeId: string, changes: Omit<Partial<EdgeDef>, 'id' | 'source' | 'target'> }
  | { type: 'add_group', group: GroupDef }
  | { type: 'remove_group', groupId: string }
  | { type: 'modify_group', groupId: string, changes: Partial<GroupDef> }
  | { type: 'add_resource', resource: Resource }
  | { type: 'modify_layout', changes: Partial<LayoutConfig> }
```

### 7.15 TreeDef

```typescript
interface TreeDef {
  id: string
  schemaVersion: string
  version: string
  label: LocalizedString
  description?: LocalizedString
  author?: string
  rootNodeId?: string
  nodes: NodeDef[]
  edges: EdgeDef[]
  groups?: GroupDef[]
  resources?: Resource[]
  stats?: StatDef[]
  startingBudget?: Budget
  layout: LayoutConfig
  theme?: string
  i18n?: I18nConfig
  metadata?: Record<string, unknown>
  subtrees?: Record<string, TreeDef>
}

interface StatDef {
  id: string
  label: LocalizedString
  initial?: number
  min?: number
  max?: number
  format?: 'number' | 'percent' | 'currency'
}
```

### 7.16 Errores

```typescript
enum ErrorCode {
  // Engine
  NODE_NOT_FOUND = 'YGG_E001',
  NODE_ALREADY_UNLOCKED = 'YGG_E002',
  PREREQUISITES_NOT_MET = 'YGG_E003',
  INSUFFICIENT_RESOURCES = 'YGG_E004',
  EXCLUSION_VIOLATION = 'YGG_E005',
  CYCLE_DETECTED = 'YGG_E006',
  SUBTREE_NOT_FOUND = 'YGG_E007',
  NODE_EXPIRED = 'YGG_E008',
  TIME_CONSTRAINT_VIOLATION = 'YGG_E009',
  BULK_OPERATION_FAILED = 'YGG_E010',

  // Validation
  INVALID_TREE_DEF = 'YGG_V001',
  INVALID_NODE_DEF = 'YGG_V002',
  INVALID_EDGE_DEF = 'YGG_V003',
  SCHEMA_VERSION_UNSUPPORTED = 'YGG_V004',
  PEDAGOGICAL_RULE_VIOLATED = 'YGG_V005',

  // Migration
  MIGRATION_FAILED = 'YGG_M001',
  NO_MIGRATION_PATH = 'YGG_M002',

  // Storage
  STORAGE_READ_FAILED = 'YGG_S001',
  STORAGE_WRITE_FAILED = 'YGG_S002',
  STORAGE_QUOTA_EXCEEDED = 'YGG_S003',

  // Plugins
  PLUGIN_INSTALL_FAILED = 'YGG_P001',
  PLUGIN_HOOK_FAILED = 'YGG_P002',
  PLUGIN_PERMISSION_DENIED = 'YGG_P003',

  // External progress
  PROGRESS_SOURCE_UNAVAILABLE = 'YGG_X001',
  PROGRESS_SOURCE_INVALID_DATA = 'YGG_X002',
  AUTH_PROVIDER_NOT_FOUND = 'YGG_X003',
  AUTH_PROVIDER_FAILED = 'YGG_X004',

  // Federation
  FEDERATION_ID_CONFLICT = 'YGG_F001',
  FEDERATION_INCOMPATIBLE_SCHEMA = 'YGG_F002',

  // Concurrency
  OPERATION_LOCKED = 'YGG_C001',

  // Read-only
  READ_ONLY_VIOLATION = 'YGG_RO001',

  // Multi-tenancy
  TENANT_QUOTA_EXCEEDED = 'YGG_T001',
  TENANT_PERMISSION_DENIED = 'YGG_T002',
}

class YggdrasilError extends Error {
  code: ErrorCode
  context?: Record<string, unknown>
  cause?: Error
  toJSON(): SerializedError
}
```

---

## 8. STATE MANAGEMENT INTERNO

### 8.1 Decisión: Immer + invalidación de caches

```typescript
class StateStore {
  private state: TreeState
  private treeDef: TreeDef
  private caches: CacheInvalidator

  async applyChanges(changes: TreeChange[]): Promise<Result<void>> {
    // 1. Valida cambios
    // 2. Aplica cambios á treeDef
    // 3. Invalida caches afectadas
    // 4. Reconcilia NodeInstances afectadas
    // 5. Emite eventos
  }

  update(producer: (draft: Draft<TreeState>) => void): void {
    this.state = produce(this.state, producer)
    this.notify()
  }
}
```

### 8.2 Cache invalidation granular

Cada cache ten unha versión. Cambios incrementan versión correspondente. Caches obsoletas invalidan automaticamente.

```typescript
interface InternalState {
  treeDef: TreeDef
  treeState: TreeState
  caches: {
    layout?: LayoutResult
    dependencyGraph?: DependencyGraph
    searchIndex?: SearchIndex
    statValues?: Record<string, number>
  }
  cacheVersions: {
    layoutVersion: number
    dependencyVersion: number
    searchVersion: number
    statsVersion: number
  }
}
```

### 8.3 Selectors memoizados

```typescript
const selectUnlockedNodes = createSelector(
  (state: TreeState) => state.nodes,
  (nodes) => Object.entries(nodes).filter(([, n]) => n.state === 'unlocked')
)
```

---

## 9. SUBSCRIPTION PATTERNS

### 9.1 React: useSyncExternalStore

```typescript
function useSkillTree(engine: TreeEngine): TreeState
function useNodeState(engine: TreeEngine, nodeId: string): NodeInstance | null
function useNodeSelector<T>(engine: TreeEngine, nodeId: string, selector: (n: NodeInstance | null) => T): T
function useTreeChanges(engine: TreeEngine): TreeChange[]
function useStat(engine: TreeEngine, statId: string): number
function useGroupNodes(engine: TreeEngine, groupId: string): NodeInstance[]
function useVisibleNodes(engine: TreeEngine, viewport: Viewport): NodeInstance[]
```

### 9.2 Outras frameworks (fases posteriores)

- `@yggdrasil-forge/vue` (computed + ref)
- `@yggdrasil-forge/svelte` (writable store)
- `@yggdrasil-forge/solid` (signals)

---

# PARTE III — MOTOR

## 10. TREEENGINE

```typescript
class TreeEngine {
  constructor(treeDef: TreeDef, options?: TreeEngineOptions)

  // Estado (síncrono)
  getNodeState(nodeId: string): NodeInstance | null
  getAllNodeStates(): ReadonlyMap<string, NodeInstance>
  getBudget(): Readonly<Budget>
  getProgress(nodeId: string): number
  getStat(statId: string): number
  getAllStats(): Readonly<Record<string, number>>
  getTreeDef(): Readonly<TreeDef>

  // Mutación da árbore (async)
  applyChanges(changes: TreeChange[]): Promise<Result<void>>

  // Sub-trees
  getSubtreeEngine(subtreeId: string): TreeEngine | null
  enterSubtree(subtreeId: string): Result<TreeEngine>

  // Accións do usuario (async)
  canUnlock(nodeId: string): Result<UnlockCheck>
  unlock(nodeId: string): Promise<Result<UnlockResult>>
  setProgress(nodeId: string, percent: number): Promise<Result<ProgressResult>>
  lock(nodeId: string): Promise<Result<LockResult>>
  respec(nodeId?: string): Promise<Result<RespecResult>>
  reset(): Promise<Result<void>>

  // Bulk operations
  unlockMany(nodeIds: string[], options?: { strategy: BulkStrategy }): Promise<Result<UnlockResult[]>>
  lockMany(nodeIds: string[], options?: { strategy: BulkStrategy }): Promise<Result<LockResult[]>>

  // Consultas
  getUnlockableNodes(): NodeDef[]
  getPathTo(nodeId: string): Result<NodeDef[]>
  getNodesInGroup(groupId: string): NodeDef[]
  getConnectedNodes(nodeId: string, edgeType?: EdgeType): NodeDef[]
  getDependents(nodeId: string): NodeDef[]
  getExpiredNodes(): NodeDef[]
  getNodesExpiringWithin(ms: number): NodeDef[]

  // Simulación
  simulate(sequence: string[]): SimulationResult
  findOptimalPath(targetNodeId: string, budget: Budget): Result<string[]>
  detectCycles(): string[][]
  validateBuild(build: Build): ValidationResult
  validatePedagogically(): Promise<ValidationReport>

  // Builds (async)
  exportBuild(): Build
  importBuild(build: Build): Promise<Result<void>>
  shareBuild(): Promise<BuildShareLink>
  loadFromShareLink(code: string): Promise<Result<void>>
  snapshot(label?: string): Promise<Build>
  restoreSnapshot(buildId: string): Promise<Result<void>>

  // Read-only
  setReadOnly(readOnly: boolean): void
  isReadOnly(): boolean

  // Plugins (async)
  registerPlugin(plugin: Plugin): Promise<Result<void>>
  unregisterPlugin(pluginId: string): Promise<Result<void>>

  // External progress
  registerProgressHandler(id: string, handler: ProgressHandler): void
  registerAuthProvider(id: string, provider: AuthProvider): void
  refreshExternalProgress(nodeId?: string): Promise<Result<void>>

  // Locale
  setLocale(locale: Locale): void
  getLocale(): Locale

  // Audit
  getAuditLog(filter?: AuditFilter): AuditEntry[]
  clearAuditLog(): void

  // Eventos
  on<K extends keyof EventMap>(event: K, handler: EventMap[K]): () => void
  off<K extends keyof EventMap>(event: K, handler: EventMap[K]): void

  // Subscription
  subscribe(listener: () => void): () => void
  getSnapshot(): TreeState
  getServerSnapshot(): TreeState

  // Selectors
  select<T>(selector: (state: TreeState) => T): T

  // Metrics
  getMetrics(): EngineMetrics

  // Serialización
  export(): { treeDef: TreeDef, state: TreeState }
  import(data: { treeDef: TreeDef, state: TreeState }): Promise<Result<void>>

  // Cleanup
  destroy(): void
}

interface EventMap {
  unlock: (nodeId: string, instance: NodeInstance) => void
  lock: (nodeId: string, instance: NodeInstance) => void
  stateChange: (nodeId: string, change: StateChange) => void
  budgetChange: (resourceId: string, oldAmount: number, newAmount: number) => void
  statChange: (statId: string, oldValue: number, newValue: number) => void
  progressChange: (nodeId: string, percent: number) => void
  respec: (nodeIds: string[]) => void
  buildLoaded: (build: Build) => void
  subtreeEntered: (subtreeId: string) => void
  treeChanged: (changes: TreeChange[]) => void
  nodeExpired: (nodeId: string) => void
  externalProgressSynced: (nodeId: string, percent: number) => void
  pluginError: (pluginId: string, error: YggdrasilError) => void
  error: (error: YggdrasilError) => void
  auditEntry: (entry: AuditEntry) => void
}
```

---

## 11. TREEREGISTRY

```typescript
class TreeRegistry {
  constructor(treeDef: TreeDef, options: {
    storage: StorageAdapter
    cache: {
      strategy: 'all-in-memory' | 'lru' | 'on-demand'
      maxInMemory?: number
      ttlMs?: number
    }
  })

  async getEngine(userId: string): Promise<TreeEngine>
  async createEngine(userId: string, build?: Build): Promise<TreeEngine>
  async removeEngine(userId: string): Promise<void>
  listEngines(): Promise<string[]>

  getSharedTreeDef(): TreeDef
  applyChangesToAll(changes: TreeChange[]): Promise<Result<void>>

  async getAggregateStats(): Promise<AggregateStats>
  async getNodePopularity(): Promise<Map<string, number>>
  async getProgressDistribution(nodeId: string): Promise<number[]>
  async getStuckUsers(threshold?: number): Promise<string[]>

  async exportAllBuilds(): Promise<Build[]>
  async importBuilds(builds: Build[]): Promise<Result<void>>

  async save(): Promise<Result<void>>
  async load(): Promise<Result<void>>

  destroy(): void
}

interface AggregateStats {
  totalUsers: number
  avgUnlockedCount: number
  avgProgress: number
  mostPopularNodes: { nodeId: string, count: number }[]
  leastPopularNodes: { nodeId: string, count: number }[]
  completionRate: number
}
```

---

## 12. STATCOMPUTER

```typescript
class StatComputer {
  computeStat(statId: string): number
  computeAllStats(): Record<string, number>
  subscribe(statId: string, callback: (value: number) => void): () => void
  explainStat(statId: string): StatExplanation
}

interface StatExplanation {
  statId: string
  finalValue: number
  contributions: {
    nodeId: string
    op: '+' | '-' | '*' | '/' | 'min' | 'max' | 'set'
    value: number
    appliedTier: number
    conditional?: boolean
  }[]
}
```

---

## 13. UNLOCKRESOLVER

```typescript
class UnlockResolver {
  evaluate(rule: UnlockRule, state: TreeState, treeDef: TreeDef): boolean
  evaluateCondition(condition: UnlockCondition, state: TreeState, treeDef: TreeDef): boolean
  explain(rule: UnlockRule, state: TreeState, treeDef: TreeDef): UnlockExplanation
}

interface UnlockExplanation {
  satisfied: boolean
  conditions: {
    condition: UnlockCondition
    satisfied: boolean
    reason: LocalizedString
  }[]
}
```

---

## 14. EFFECTS DSL

```typescript
class EffectsRunner {
  run(effects: Effect[], context: EffectContext): Promise<Result<EffectResult[]>>
  reverse(effects: Effect[], context: EffectContext): Promise<Result<void>>
  validate(effects: Effect[]): Result<void>
}
```

Reversibilidade automática para respec. Effects marcados `irreversible: true` son excepción.

---

## 15. TIME-BASED MECHANICS

```typescript
class TimeManager {
  start(): void
  stop(): void

  checkExpirations(): NodeInstance[]
  getExpiringWithin(ms: number): NodeInstance[]

  onNodeExpired(callback: (nodeId: string) => void): () => void
  onNodeApproachingExpiration(callback: (nodeId: string, msRemaining: number) => void, leadTimeMs: number): () => void

  canReCertify(nodeId: string): boolean
  reCertify(nodeId: string): Promise<Result<void>>
}
```

---

## 16. EXTERNAL PROGRESS SOURCES

```typescript
class ProgressSourceManager {
  registerHandler(id: string, handler: ProgressHandler): void
  unregisterHandler(id: string): void

  refresh(nodeId?: string): Promise<Result<void>>
  refreshAll(): Promise<Result<void>>

  startPolling(): void
  stopPolling(): void
}

class AuthProviderRegistry {
  register(id: string, provider: AuthProvider): void
  unregister(id: string): void
  resolve(authConfig: AuthConfig): Promise<Headers>
}
```

---

## 17. PEDAGOGICAL VALIDATORS

```typescript
class ValidatorEngine {
  registerRule(rule: ValidationRule): void
  validate(): Promise<ValidationReport>
}

interface ValidationRule {
  id: string
  label: LocalizedString
  severity: 'error' | 'warning' | 'info'
  validate(treeDef: TreeDef, state?: TreeState): ValidationIssue[]
}
```

Built-in: `no_cycles`, `all_reachable_from_root`, `no_orphan_nodes`, `no_dead_ends`, `max_branching_factor`, `min_branching_factor`, `progressive_difficulty`, `balanced_branches`, `no_redundant_prerequisites`, `valid_subtree_references`.

---

## 18. SUB-TREES E COMPOSICIÓN

```typescript
const mainEngine = new TreeEngine(mainTree)
await mainEngine.unlock('cluster_jewel_1')
const subEngine = mainEngine.getSubtreeEngine('cluster_jewel_1')
await subEngine?.unlock('mini_node_a')
```

Tres modos de renderizado: inline, modal, page navigation.

---

## 19. TREE FEDERATION

```typescript
class Federator {
  loadFederation(sources: FederationSource[]): Promise<Result<TreeDef>>
  mergeTreeDefs(trees: TreeDef[], strategy: MergeStrategy): Result<TreeDef>
  detectConflicts(trees: TreeDef[]): ConflictReport
}

type MergeStrategy = 'namespace_all' | 'first_wins' | 'last_wins' | 'manual'
```

---

# PARTE IV — DATOS

## 20. LAYOUTS

| Layout | Descripción | Inspiración |
|--------|-----------|-------------|
| `radial` | Polígono + radios + malla | Oberón, Skyrim perks |
| `tree` | Vertical/horizontal | Diablo, WoW talents |
| `constellation` | Clusters libres | Skyrim |
| `grid` | Grella regular ou hexagonal | Civilization |
| `web` | Rede masiva | Path of Exile |
| `linear` | Liña con bifurcacións | God of War |
| `sphere_grid` | Esférico con caminos cerrados | FFX |
| `custom` | Posicións manuais | Editor |

---

## 21. PERSISTENCIA

```typescript
interface StorageAdapter {
  get(key: string): Promise<Result<unknown | null>>
  set(key: string, value: unknown): Promise<Result<void>>
  delete(key: string): Promise<Result<void>>
  list(prefix?: string): Promise<Result<string[]>>
  clear(): Promise<Result<void>>
  watch?(key: string, callback: (value: unknown) => void): () => void
}
```

Backends: MemoryStorage, LocalStorageAdapter, IndexedDBAdapter, SessionStorageAdapter, FileSystemAdapter, Neo4jAdapter, custom.

Migration safety net: backup automático antes de migracións.

---

## 22. MIGRACIÓNS DE ESQUEMA

```typescript
interface Migration {
  from: string
  to: string
  migrate(oldData: unknown): Promise<Result<unknown>>
  description: string
  irreversible?: boolean
}
```

---

## 23. RECONCILIACIÓN DE SAVES

```typescript
interface ReconcileOptions {
  refundRemovedNodes: boolean
  grandfatherIncreasedCosts: boolean
  refundDecreasedCosts: boolean
  invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'
}
```

---

## 24. CSV WORKFLOWS

```typescript
import { exportToCSV, importFromCSV } from '@yggdrasil-forge/importers/csv'

const csv = exportToCSV(treeDef, {
  format: 'multi-sheet',
  locales: ['gl', 'es', 'en']
})

const result = await importFromCSV(csv, {
  mergeStrategy: 'update-existing',
  validateOnImport: true,
  reportErrors: true
})
```

---

## 25. BUILDS, LOADOUTS, SNAPSHOTS

```typescript
const link = await engine.shareBuild()
await engine.loadFromShareLink(code)

await engine.saveLoadout('Glass cannon')
await engine.loadLoadout('Tank')

const snap = await engine.snapshot('Antes do experimento')
await engine.restoreSnapshot(snap.id)

await engine.respec()
await engine.respec(undefined, { costPercent: 10 })
```

---

## 26. COMPARACIÓN DE BUILDS

```typescript
import { diffBuilds } from '@yggdrasil-forge/diff'
const diff = diffBuilds(buildA, buildB)
```

---

## 27. AUDIT TRAIL

```typescript
engine.getAuditLog({
  actor: 'student-42',
  action: { type: 'node_unlocked' },
  from: timestamp1,
  to: timestamp2
})
```

---

## 28. SEARCH E FILTERING

```typescript
interface SearchEngine {
  index(tree: TreeDef): void
  search(query: string, options?: SearchOptions): SearchResult[]
  clear(): void
}
```

Auto-reindex cando treeDef cambia.

---

# PARTE V — UI

## 29. RENDERIZADO E TEMAS

Headless + styled hybrid. Themes con inheritance. Renderers SVG/Canvas/HTML con auto-selección.

---

## 30. ANIMATION FRAMEWORK

CSS-first + Framer Motion opcional para `animations="rich"`.

---

## 31. INTERNACIONALIZACIÓN

`LocalizedString` everywhere. Compatibilidade GAIA (`label_gl`, `label_es`, `label_en`).

---

## 32. ACCESIBILIDADE

WCAG 2.1 AA. Navegación teclado completa. ARIA + announcements. `prefers-reduced-motion`. jest-axe en CI.

---

## 33. MOBILE E TOUCH

Tap, double tap, long press, pinch, pan. Botóns 44x44px. Tooltips como bottom sheets.

---

## 34. READ-ONLY MODE

```typescript
const engine = new TreeEngine(treeDef, { readOnly: true })
```

---

## 35. RICH CONTENT

Markdown sanitizado, vídeos lazy (YouTube/Vimeo/MP4), imaxes, audio, links, custom components.

---

## 36. HEATMAP E ANALYTICS VISUAIS

```tsx
<SkillTree engine={engine}>
  <HeatmapOverlay metric="popularity" colorScale={['#ddd', '#ff0000']} opacity={0.5} />
</SkillTree>
```

---

## 37. EDITOR VISUAL + WIZARDS + TEMPLATES

Wizard de creación. Templates ricos (PoE-style, Diablo, Skyrim, Habit tracker, Corporate cert path, etc.). Preview interactivo. Export multi-formato.

---

# PARTE VI — INTEGRACIÓN

## 38. SSR E REACT SERVER COMPONENTS

```typescript
// @yggdrasil-forge/react/server (RSC-safe):
export { SkillTreeStatic, computeLayout, serializeForClient }

// @yggdrasil-forge/react ('use client'):
export { SkillTree, useSkillTree, ThemeProvider }
```

---

## 39. SISTEMA DE PLUGINS

```typescript
interface Plugin {
  id: string
  name: string
  version: string
  apiVersion: string
  permissions?: PluginPermission[]
  install(engine: TreeEngine, api: PluginAPI): void | Promise<void>
  uninstall?(engine: TreeEngine): void | Promise<void>
}
```

Built-in: Cooldown, History, AutoUnlock, Debug, Analytics, Search, Webhook, Audit.

---

## 40. PLUGIN SANDBOXING

V1.0: permissions declarativos non enforced strictamente. V2: enforcement con marketplace.

---

## 41. WEBHOOKS

```typescript
new WebhookPlugin({
  endpoints: [{
    url: 'https://my-lms.edu/yggdrasil-events',
    events: ['unlock', 'progressChange', 'nodeExpired'],
    secret: 'shared-secret',
    retries: 3
  }]
})
```

---

## 42. IMPORTERS / EXPORTERS

**Importers:** Mermaid, Cytoscape JSON, GraphML, CSV, Yggdrasil v1.

**Exporters:** SVG, PNG, JPG, WebP, PDF, Unity ScriptableObject template, Godot resource, React/Vue/Svelte components, standalone HTML.

---

## 43. EMBED MODE

```typescript
const embedCode = engine.generateEmbedCode({
  width: 800, height: 600, theme: 'oberon', readOnly: true
})
```

---

# PARTE VII — ROBUSTEZ

## 44. ERROR HANDLING

- Lectura: `null` se non existe
- Modificación: `Result<T, YggdrasilError>`
- Irrecuperables: throw
- Plugins: capturados, emitidos como evento

---

## 45. REACT ERROR BOUNDARIES

```tsx
<SkillTreeErrorBoundary fallback={<Fallback />}>
  <SkillTree engine={engine} />
</SkillTreeErrorBoundary>
```

---

## 46. CONCURRENCY

ConcurrencyGuard serializa modificacións. Web Workers para pathfinding pesado.

---

## 47. FAILURE MODES

| Falla | Comportamento |
|-------|---------------|
| IndexedDB indisponible | Fallback a localStorage |
| Storage cheo | Error YGG_S003 |
| Plugin crashea install | Non rexistra, evento `pluginError` |
| Plugin crashea hook | Hook ignorado, engine continúa |
| External progress timeout | Última medición, retry exponencial |
| Auth provider falla | Retry 3 veces, error YGG_X004 |
| Neo4j caído | Modo offline, sync ao recuperar |
| Webhook 5xx | Retry con backoff |
| TreeDef inválido constructor | Throw, engine non se crea |
| Migration falla | Backup automático restaurado |
| Bulk all-or-nothing falla | Rollback automático |

---

## 48. PERFORMANCE

| Métrica | Obxectivo |
|---------|-----------|
| Render 100 nodos | < 100ms |
| Render 1000 nodos | < 500ms |
| Render 5000 nodos | < 2s |
| Render 10000 nodos | < 5s |
| Frame rate pan/zoom | 60 fps |
| applyChanges 100 cambios | < 50ms |
| applyChanges 1000 cambios | < 500ms |
| Bundle @core | < 35KB gzipped |
| Memory por nodo | < 1KB |

---

## 49. MULTI-TENANCY

```typescript
const tenant1Storage = new ScopedStorage(baseStorage, 'tenant_1')
const tenant1Registry = new TreeRegistry(treeDef, { storage: tenant1Storage })

const registry = new TreeRegistry(treeDef, {
  quotas: { maxUsers: 10000, maxBuildsPerUser: 50, maxStorageBytes: 100 * 1024 * 1024 }
})
```

---

## 50. HOT RELOAD E DEV EXPERIENCE

```typescript
const engine = new TreeEngine(treeData, {
  hotReload: process.env.NODE_ENV === 'development'
})

<SkillTree engine={engine} debug />

window.__YGGDRASIL__.engine
window.__YGGDRASIL__.unlockAll()
window.__YGGDRASIL__.exportState()
```

---

# PARTE VIII — OPERACIÓNS

## 51. BROWSER SUPPORT

| Browser | Versión mínima |
|---------|---------------|
| Chrome / Edge | 100+ |
| Firefox | 100+ |
| Safari | 15.4+ |
| iOS Safari | 15.4+ |
| Chrome Android | 100+ |

ES2022 baseline.

---

## 52. BUNDLE SPLITTING

Critical path < 35KB gzipped. Lazy on demand: layouts non-radial, procedural, simulator, BuildSerializer compresión, migrations específicas, plugins, animation rich, CanvasRenderer, HTMLRenderer, StatComputer (se non hai stats), TimeManager (se non hai time constraints), validators avanzados.

---

## 53. TYPESCRIPT EXPORTS

Strict mode. Exports condicionais (`./`, `/server`, `/headless`, `/layouts/*`). Tree-shakeable. JSDoc para uso JS puro.

---

## 54. CLI

```bash
yggdrasil init my-skill-tree
yggdrasil validate ./tree.json
yggdrasil migrate ./tree.json --to-version 2.0.0
yggdrasil generate --template rpg-classic
yggdrasil export ./tree.json --format svg|png|pdf|unity|godot|react
yggdrasil import ./mermaid.mmd --format mermaid
yggdrasil import ./nodos.csv --format csv --merge update-existing
yggdrasil stats ./tree.json
yggdrasil diff ./build-a.json ./build-b.json
yggdrasil reconcile ./old-build.json ./new-tree.json
yggdrasil federate --sources core.json mod1.json --output federated.json
yggdrasil validate-pedagogical ./tree.json
yggdrasil serve ./tree.json --port 3000
yggdrasil bench ./tree.json
```

---

## 55. DEVTOOLS

Browser extension Chrome/Firefox. Tree inspector, event log, time travel, profiler, plugin inspector, build comparison, layout debugger, storage explorer, audit log viewer, stats inspector, federation visualizer.

---

## 56. RUNTIME METRICS

```typescript
interface EngineMetrics {
  unlocksTotal: number
  locksTotal: number
  respecsTotal: number
  errorsTotal: number
  applyChangesTotal: number
  treeChangesPerSecond: number
  avgUnlockTime: number
  avgLayoutTime: number
  avgPathfindTime: number
  avgStatComputeTime: number
  nodeCount: number
  edgeCount: number
  pluginCount: number
  estimatedMemoryBytes: number
  cacheHitRate: number
  cacheSize: number
  externalProgressSourcesActive: number
  pendingExternalSyncs: number
}
```

---

## 57. TESTING

| Tipo | Tool |
|------|------|
| Unitarios | vitest |
| Integración | vitest |
| Property-based | fast-check |
| Visual | Storybook + Chromatic |
| A11y | jest-axe |
| E2E | Playwright |
| SSR | vitest |
| Memory leaks | vitest + node --expose-gc |
| Benchmarks | vitest bench |
| Mobile | Playwright + device emulation |
| Multi-tenancy | Custom |
| Federation | Custom |

Cobertura: 90%+ no core.

---

## 58. TELEMETRÍA E ANALYTICS

Opt-in sempre. Adapters: Console, PostHog, Mixpanel, GoogleAnalytics, OpenTelemetry, Sentry.

---

## 59. SEGURANZA E PRIVACIDADE

SECURITY.md (vulnerabilidades, disclosure 90 días, supply chain). PRIVACY.md (datos mínimos, retention 1 ano, GDPR, opt-in cookies). DOMPurify, Zod estricto, sen eval, CSP recomendada.

---

# PARTE IX — PROXECTO

## 60. API STABILITY TIERS

`@stable`, `@experimental`, `@deprecated`, `@internal`. TypeDoc filtrable.

---

## 61. BACKWARDS COMPATIBILITY

Major: breaking permitidos en `@stable`. Minor: só APIs novas. Patch: bugfixes.

Soporte: actual + previa major.

---

## 62. EDITOR PWA / OFFLINE

Service Worker, manifest, IndexedDB. Funciona offline tras primeira carga.

---

## 63. CONTRIBUTION MODEL

CONTRIBUTING.md, Conventional Commits, RFC process en `rfcs/`. Governance con core team. GitHub Discussions, Discord.

---

## 64. BRANDING E DOCUMENTACIÓN

- **Nome:** Yggdrasil Forge
- **Tagline:** "The world tree from which all skill trees grow"
- **Logo:** Árbore Yggdrasil dourado sobre escuro
- **Tipografía:** Cinzel (display), Atkinson Hyperlegible (body)
- **Cores:** #e8a547, #050810, #9bb3ff

Sitio: yggdrasil-forge.dev. Astro + Starlight para docs. Storybook public.

---

## 65. MARKETPLACE (FUTURO)

Posible v2: yggdrasil-hub.dev.

---

## 66. VERSIONADO DE PAQUETES

**Hybrid mode.**

**Core (sincronizado, mesma versión):**
- `@yggdrasil-forge/common`
- `@yggdrasil-forge/core`
- `@yggdrasil-forge/react`
- `@yggdrasil-forge/themes`

**Periféricos (independente):**
- Todos os outros paquetes

**Tooling:** changesets. Cada PR que toca un paquete publicable inclúe un changeset describindo o cambio.

---

## 67. ROADMAP POR FASES (EXECUTABLE)

Cada fase divídese en sub-fases. Cada sub-fase é un chat executor.

### Fase 0 — Setup do monorepo
- **0.1** Crear repo + estrutura raíz
- **0.2** Configurar TypeScript + Biome
- **0.3** Configurar Vitest + CI básico
- **0.4** Crear paquetes vacíos con package.json
- **0.5** Configurar changesets

### Fase 1 — Core types + Engine + StateStore
- **1.1** `@yggdrasil-forge/common` (constantes, error codes)
- **1.2** Types de @core: node.ts, edge.ts, tree.ts, result.ts, errors
- **1.3** Types de @core: unlock.ts, resources.ts, i18n.ts, content.ts
- **1.4** Types de @core: build.ts, audit.ts, changes.ts, time.ts, stats.ts, auth.ts
- **1.5** EventEmitter, ConcurrencyGuard, helpers
- **1.6** StateStore con Immer + cache invalidation
- **1.7** ChangeTracker + CacheInvalidator
- **1.8** UnlockResolver con explain()
- **1.9** DependencyGraph + CycleDetector
- **1.10** ResourceManager
- **1.11** YggdrasilError + códigos + mensaxes localizadas
- **1.12** TreeEngine: constructor + getters síncronos
- **1.13** TreeEngine: unlock/lock/respec
- **1.14** TreeEngine: applyChanges
- **1.15** TreeEngine: subscription + selectors
- **1.16** AuditLogger
- **1.17** JsonSerializer + Validator (Zod)
- **1.18** Tests integración Fase 1

### Fase 2 — Effects + Stats + Time
- **2.1** EffectsRunner con DSL completo
- **2.2** StatComputer con explanations
- **2.3** TimeManager
- **2.4** ProgressSourceManager
- **2.5** AuthProviderRegistry
- **2.6** Tests integración

### Fase 3 — Persistencia + Migracións
- **3.1** StorageAdapter interface
- **3.2** MemoryStorage + LocalStorageAdapter
- **3.3** IndexedDBAdapter
- **3.4** SessionStorageAdapter + FileSystemAdapter
- **3.5** Migration system + auto backup
- **3.6** Reconciler

### Fase 4 — Layout Engine
- **4.1** LayoutEngine + interface
- **4.2** RadialLayout + MeshGenerator
- **4.3** TreeLayout
- **4.4** CustomLayout
- **4.5** PathBuilder + BoundsCalculator + QuadTree
- **4.6** SSR-friendly verification

### Fase 5 — Sub-trees + Federation
- **5.1** SubtreeManager
- **5.2** Recursive engine
- **5.3** Federator

### Fase 6 — TreeRegistry + Multi-tenancy
- **6.1** TreeRegistry
- **6.2** Aggregate queries
- **6.3** ScopedStorage + Quotas + Permissions

### Fase 7 — React Renderer + a11y + SSR + RSC
- **7.1** Setup @react package + dependencies
- **7.2** SkillTree + SkillNode + SkillEdge
- **7.3** MeshOverlay + SVGRenderer
- **7.4** ThemeProvider + tema Oberón + minimal
- **7.5** Hooks (useSkillTree, useNodeState, etc.)
- **7.6** Animation framework básico (CSS)
- **7.7** Navegación teclado + ARIA + announcements
- **7.8** prefers-reduced-motion
- **7.9** SSR + RSC compatibility
- **7.10** Mobile/touch input
- **7.11** Error boundaries
- **7.12** Tests visuais + a11y + SSR

### Fase 8 — Builds + Plugins + Search + Validators
- **8.1** BuildSerializer + UrlSerializer
- **8.2** Loadouts + Snapshots
- **8.3** RespecManager
- **8.4** PluginManager + HookRunner
- **8.5** Plugins oficiais (History, Debug)
- **8.6** SearchPlugin + @search package
- **8.7** ValidatorEngine + built-in rules
- **8.8** Read-only mode

### Fase 9 — Visual Editor + Wizards + Templates
- **9.1** Setup @editor package
- **9.2** EditorCanvas con zoom/pan
- **9.3** Paneis de control
- **9.4** Ferramentas (engadir, conectar, eliminar, mover)
- **9.5** Selector de layout
- **9.6** Wizard de creación
- **9.7** Templates ricos
- **9.8** Preview interactivo
- **9.9** Import/Export multi-formato
- **9.10** Undo/Redo
- **9.11** Rich content editor
- **9.12** A11y dos controis
- **9.13** PWA setup
- **9.14** Tests E2E

### Fase 10-19
(Performance, Layouts avanzados, Diff/Heatmap, CLI, DevTools, etc. Detalladas en cada momento.)

**MVP funcional:** ao final da fase 9 (~18-22 semanas de traballo).
**v1.0 público:** ao final da fase 19 (~38-48 semanas).

---

## 68. STACK TÉCNICO

| Area | Ferramenta |
|------|-----------|
| Linguaxe | TypeScript strict |
| Monorepo | pnpm + turborepo |
| Build core | tsup |
| Build apps | vite |
| State | Immer |
| Tests | vitest |
| Property tests | fast-check |
| Visual tests | Storybook + Chromatic |
| A11y tests | jest-axe |
| E2E | Playwright |
| Lint/Format | Biome |
| Validation | Zod |
| Markdown | marked + DOMPurify |
| Animations base | CSS |
| Animations rich | Framer Motion (peer) |
| PNG export | resvg-js |
| PDF export | pdf-lib |
| Docs | Astro + Starlight |
| CI/CD | GitHub Actions |
| Editor state | Zustand |
| Editor canvas | react-zoom-pan-pinch |
| Touch gestures | @use-gesture/react |
| Compresión | pako (brotli) |
| Browser ext | WebExtension API |
| Versionado | changesets |

**Core deps:** Immer (única excepción á regra zero-deps).
**React:** react/react-dom como peer.

---

## 69. LICENCIA

**MIT v1.0**, revaluar dual licensing post-launch.

---

## 70. NO-GOALS

❌ Backend completo (BaaS)
❌ Sistema de autenticación
❌ Pagamentos in-app
❌ 3D rendering
❌ AI / xeración con LLMs
❌ Tradución automática
❌ SDK iOS/Android nativo
❌ Plugins Unity/Unreal directos (só exporters de templates)
❌ Versionado tipo Git de árbores
❌ Cross-app drag-and-drop
❌ Marketplace en v1.0
❌ Edición colaborativa en v1.0

---

## 71. DIFERENCIACIÓN VS. COMPETENCIA

(Tabla completa nas iteracións anteriores. Resumo: somos os primeiros e únicos cunha solución completa. Competidores existentes están abandonados ou cubren só parte do problema.)

---

# PARTE X — REFERENCIA

## 72. API FINAL

```tsx
import { TreeEngine, IndexedDBAdapter, TreeRegistry } from '@yggdrasil-forge/core'
import { SkillTree, SkillTreeErrorBoundary, ThemeProvider } from '@yggdrasil-forge/react'
import { oberon } from '@yggdrasil-forge/themes'
import { HistoryPlugin, AnalyticsPlugin } from '@yggdrasil-forge/plugins'
import treeData from './panadeiro.json'

function OberonSkillTree({ studentId }: { studentId: string }) {
  const engine = useMemo(() => {
    const eng = new TreeEngine(treeData, {
      storage: new IndexedDBAdapter(`oberon-${studentId}`),
      autoSave: { enabled: true, debounceMs: 500 },
      i18n: { defaultLocale: 'gl', fallbackLocale: 'en' },
      onError: (error) => Sentry.captureException(error),
      audit: { enabled: true, maxEntries: 5000 },
      time: { enabled: true, timezone: 'Europe/Madrid' }
    })

    eng.registerProgressHandler('moodle', async (nodeId) => {
      return await moodleAPI.getQuizScore(nodeId)
    })

    eng.registerAuthProvider('moodle-token', async () => {
      return await refreshMoodleToken()
    })

    eng.registerPlugin(new HistoryPlugin({ maxSize: 50 }))

    return eng
  }, [studentId])

  useEffect(() => () => engine.destroy(), [engine])

  return (
    <SkillTreeErrorBoundary fallback={<Fallback />}>
      <ThemeProvider theme={oberon}>
        <SkillTree
          engine={engine}
          layout="radial"
          renderer="auto"
          onNodeClick={async (nodeId) => {
            const result = await engine.unlock(nodeId)
            if (!result.ok) toast(result.error.message)
          }}
        />
      </ThemeProvider>
    </SkillTreeErrorBoundary>
  )
}
```

---

*Yggdrasil Forge — Forxando árbores de habilidades para a web.*

**FIN DO DOCUMENTO MESTRE v6**
