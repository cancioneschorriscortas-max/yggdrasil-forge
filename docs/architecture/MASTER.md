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

- **DevDependencies compartidas via `pnpm catalog`** — co `node-linker=hoisted` activado, devDependencies declaradas só no workspace root NON son visibles desde os paquetes fillos. Para evitar ter que declarar `tsup`, `vitest`, etc. en cada un dos 15+ paquetes, úsase `pnpm catalog` (introducido en pnpm 9): centraliza versións e cada paquete referénciaas con `catalog:`. Implementación en sub-fase 0.5.

**Os executores futuros NON deben revertir estas decisións.** Se atopan problemas relacionados, repórtano ao director, non improvisan solucións alternativas.

### 1.1.2 Patrón obrigatorio: lint:fix + format despois de crear/pegar ficheiros

Cando un executor:
- Pega contido manual en ficheiros de configuración
- Crea novos ficheiros de código

...Biome detectará case sempre desviacións de formato (CRLF en Windows, indentación, comillas, líneas finais, ordenación de claves).

**Patrón obrigatorio ANTES de calquera commit:**

```bash
pnpm lint:fix      # Corrixe automaticamente o que se poida
pnpm format        # Formatea (idempotente)
pnpm lint          # Verificación final (debe pasar)
pnpm format:check  # Verificación final (debe pasar)
```

O hook pre-commit corrixiríao automaticamente, pero é mellor facelo explícito para entender o que se modificou e evitar commits parciais.

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
- **Naming de directorios:** **kebab-case** (`docs/briefings/`, `packages/multi-tenancy/`). Evitar maiúsculas: causan problemas case-sensitive en Linux/Mac aínda que Windows non se queixe.
- **Naming de ficheiros TypeScript de clases:** PascalCase (`TreeEngine.ts`, `UnlockResolver.ts`)
- **Naming de ficheiros TypeScript de utilidades/funcións:** camelCase (`deepClone.ts`, `resolveLocalized.ts`)
- **Naming de ficheiros de tipos puros:** camelCase (`node.ts`, `unlock.ts`, `events.ts`)

### 1.3.1 Versionado selectivo de .vscode/

Os ficheiros `extensions.json`, `settings.json` e `launch.json` están versionados (decisión de equipo, todos os contributors herdan o setup). Outros ficheiros de `.vscode/` (state, history, caches locais) NON se versionan. Patrón en `.gitignore`:

```
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
!.vscode/launch.json
```

### 1.3.2 Reglas de Biome estritas — disciplinas que impoñen

As reglas activadas en `biome.json` impoñen disciplinas que hai que respetar dende o primeiro día:

- **`noConsole`:** non usar `console.log()` en código de produción. Usar `console.info`, `console.warn`, `console.error` (permitidos) ou un sistema de logging apropiado.
- **`useNodejsImportProtocol`:** importacións de Node.js core deben usar prefixo `node:` (`import { readFile } from 'node:fs/promises'`).
- **`useImportType` / `useExportType`:** importar/exportar tipos con `type` cuando sexan só tipos (`import type { TreeDef } from './types'`).
- **`noUnusedImports` / `noUnusedVariables`:** cero tolerancia. Eliminar antes de commit.
- **`noExplicitAny`:** prohibido `any` salvo casos extremos con comentario xustificativo.
- **`Number.parseInt` (non `parseInt`):** usar versión namespaced para claridade.

Estas reglas detectan problemas reais. Non se desactivan; o código adáptase.

### 1.3.3 Patrón obrigatorio: lint:fix + format despois de pegar configuración

Cando un executor pega contido manual en ficheiros de configuración (`package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, etc.), Biome detectará case sempre desviacións de formato (indentación, comillas, líneas finais, ordenación de claves).

**Patrón obrigatorio tras editar configuración manualmente:**

```bash
pnpm lint:fix      # Corrixe automaticamente o que se poida
pnpm format        # Formatea (idempotente)
```

Despois verificar:

```bash
pnpm lint          # Debe pasar
pnpm format:check  # Debe pasar
```

Os executores deben facer isto **antes** de tentar commit. O hook pre-commit corrixiríao automaticamente, pero é mellor facelo explícito para entender o que se modificou.

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

> ⚠️ **SUPERSEDED (4º Arquitecto, etapa Renderer→Studio).** As Fases 9+
> deste roadmap orixinal quedan substituídas por
> `docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md` (folla de ruta a
> 1.0). As Fases 0–8 abaixo mantéñense como **rexistro histórico**
> (pechadas). Para o traballo activo, ler o roadmap novo.


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

### Fase 6 — TreeRegistry + Multi-tenancy ✅ PECHADA
- **6.1** TreeRegistry ✅
- **6.2** Aggregate queries ✅
- **6.3** ScopedStorage ✅
- **6.4** Quotas ✅
- **6.5** Permissions (interface mínima — modelo completo difírese a 8.4) ✅

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
- **8.4** PluginManager + HookRunner — **inclúe**: modelo expandido de
  Permissions vía hooks (`beforeCreateEngine`, `beforeSaveBuild`,
  `beforeApplyChanges`, etc.). Paralelo á interface mínima
  `PermissionChecker` entregada en 6.5; os consumidores que precisen
  ACL/RBAC/policies declarativas implementarán hook callbacks en 8.4.
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

# ANEXO A — ERRATAS, SINCRONIZACIÓN E DÉBEDA

> Mantido polo director. Estado real fronte ao roadmap (sección 67).
> **🎉 FASE 2 PECHADA OFICIALMENTE — 13 sub-fases + 2 hotfixes.**
> Regra: unha sub-fase só se marca "Feito" cando o director a verifica
> independentemente. Un bo reporte non substitúe a verificación.

## A.1–A.2 — Estado actual

Fase 1 pechada + addendum 1.19. **Fase 2 PECHADA. Fase 3 PECHADA.
Fase 4 PECHADA. Fase 5 PECHADA (Sub-trees + Federation completos).
🎉 FASE 6 PECHADA (TreeRegistry + Multi-tenancy completos): 5 sub-fases
(TreeRegistry + Aggregate queries + ScopedStorage + Quotas + Permissions
mínima). Modelo enriquecido de Permissions difírido a 8.4
PluginManager + HookRunner.**

| Sub-fase | Estado | Commit | Tests |
|---|---|---|---|
| 1.12–1.18 | (Fase 1) | varios | 538 |
| 1.19 multi-tier (DT-10) | Feito | `05dbf46` | 547 |
| 2.1 EffectsRunner standalone | Feito | `7dcc609` | 615 |
| 2.1.b EffectsRunner cableado | Feito | `3fb3199` | 623 |
| 2.2 StatComputer standalone | Feito | `ace8bcb` | 663 |
| 2.2.b StatComputer cableado | Feito | `6d391c8` (+inc. `72b36a7`) | 676 |
| 2.3 TimeManager standalone | Feito | `7d1f7b9` (+inc. `34e5513`) | 721 |
| 2.3.b TimeManager cableado | Feito | `5d4cee5` + `13d06dd` | 748 |
| 2.4 ProgressManager (manual) | Feito | `f136ad8`+`9e5aee2`+`1774a81` | 788 |
| 2.4.b ProgressManager cableado | Feito | `5885bac`+`1dd379a`+`a346888` | 807 |
| 2.4.c ProgressManager.computed | Feito | `747e48d`+`c4f03d4`+`cfafc76` | 837 |
| 2.4.d UnlockResolver wiring | Feito | `c918324` | 852 |
| 2.4.e EffectsRunner+StatComputer wiring | Feito | `9afd412` | 854 |
| 2.5 Zod hardening | Feito | `8555542` | 876 |
| 2.6.fix set_progress wiring (bug latente) | Feito | `cd750c3` | 882 |
| 2.6 Tests integración Fase 2 | Feito | `c8bed7e` | 891 |
| 2.6.fix2 modify_resource budgetChange (DT-13) | Feito | `3f42e79` | 896 |
| docs: briefings Fase 2 | Feito | `624e682` | — |
| docs: close Phase 2 en MASTER | Feito | `7974214` | — |
| docs: publish strategy + investigation | Feito | `f14e5c7` | — |
| **3.0 Result movido a common (refactor preparatorio)** | Feito | `de16c01` | 956 |
| **3.1 StorageAdapter interface** | Feito | `c39b8d7` | 14 storage |
| **3.2.a MemoryStorage backend** | Feito | `3658808` | 36 storage |
| **3.2.b LocalStorageAdapter** | Feito | `2e6998a` | 72 storage |
| **3.3 IndexedDBAdapter** | Feito | `1528fa8` | 115 storage |
| **3.4 SessionStorage + FileSystem (OPFS)** | Feito | `190fd98` | 171 storage |
| **3.5 Migration system + AutoBackup** | Feito | `f97b467` | 945 core |
| **3.6.a Reconciler base + refundRemovedNodes** | Feito | `2a12ef7` | 966 core |
| **3.6.b Reconciler: 3 opcións restantes** | Feito | `ccf9187` | 997 core |
| docs: MASTER through 3.6.a + leccións | Feito | `3005c41` | — |
| docs: briefings Fase 3 (3.0 → 3.6.b) | Feito | `1fe9374` | — |
| docs: close Phase 3 in MASTER | Feito | `835fd24` | — |
| **4.1 LayoutEngine base + IdentityLayout** | Feito | `0bcc66d` | 1023 core |
| **4.2 RadialLayout + MeshGenerator** | Feito | `b9eef4c` | 1082 core |
| **4.3 TreeLayout (Buchheim)** | Feito | `2006f87` | 1134 core |
| **4.4 CustomLayoutConfig (minimal)** | Feito | `f055555` | 1140 core |
| **4.5 PathBuilder + BoundsCalculator + QuadTree** | Feito | `e31ec1f` | 1196 core |
| **4.6 SSR verification + regression guard** | Feito | `5a80acf` | 1221 core |
| docs: close Phase 4 in MASTER | Feito | `13ef887` | — |
| **5.1 SubtreeManager standalone** | Feito | `2fd2e6a` | 1263 core |
| **5.2 Recursive engine integration** | Feito | `1f7de89` | 1306 core |
| **5.3 Federator (mergeTreeDefs + detectConflicts)** | Feito | `953cda7` | 1381 core |
| docs: close Phase 5 in MASTER | Feito | `b8b6d89` | — |
| **6.1 TreeRegistry (lifecycle + builds + 3 cache strategies)** | Feito | `2ddc511` | 1457 core |
| **6.2 Aggregate queries (4 queries directas sobre storage)** | Feito | `8de28f6` | 1481 core |
| **6.3 ScopedStorage (tenant isolation adapter)** | Feito | `60a2305` | 193 storage |
| docs: hygiene post-6.3 (close 6.1+6.2+6.3 + DT-21..24 + lessons) | Feito | `f6c41b5` | — |
| **6.4 Quotas (maxUsers / maxBuildsPerUser / maxStorageBytes)** | Feito | `e52fc33` | 1506 core |
| **6.5 Permissions (interface mínima) + DT-26 fix (save() error propagation)** | Feito | `ecb08e9` | 1523 core |
| **7.1 React 19 deps + JSX config** | Feito | `02a9c52` | 3 react |
| **7.2 SkillTree + SkillNode + SkillEdge** | Feito | `12df2f9` | 18 react |
| **7.3 MeshOverlay + SVGRenderer** | Feito | `d2f2296` | ~25 react |
| **7.4 ThemeProvider + minimal + /headless** | Feito | `6860f76` | ~40 react |
| **7.5 Hooks (useSkillTree/useNodeState/etc.)** | Feito | `86d5157` | 55 react |
| **7.6 CSS animation framework** | Feito | `2b4f8d3` | 63 react |
| **7.7 SkillTreeAnnouncer + aria-label + cover SkillNode** | Feito | `8e9a146` | 75 react |
| **7.8 prefers-reduced-motion** | Feito | `c329774` | 78 react |
| **7.9 SSR/RSC: SkillTreeStatic + /server entry** | Feito | `b4f35d5` | 92 react |
| **7.10 Long press mobile/touch** | Feito | `e4c594e` | 97 react |
| **7.11 SkillTreeErrorBoundary (class component)** | Feito | `856bdb4` | 104 react |
| **7.12 jest-axe a11y + SSR no-dom-imports** | Feito | `f94f225` | 111 react |
| docs: hygiene post-Phase 7 (code) | Feito | `79b6ad2` | 116 react |

**Tag `phase-1-closed`** en `1290378`. **Fase 2 PECHADA. Fase 3 PECHADA. Fase 4 PECHADA. Fase 5 PECHADA. Fase 6 PECHADA. Fase 7 PECHADA (12/12 sub-fases + 1 hixiene de código). 🎉 FASE 8 PECHADA OFICIALMENTE (13/13 sub-fases; cadea 3.0 → 8.8 = 51 sub-fases consecutivas con cero rollbacks — RÉCORD HISTÓRICO).**

**Métricas Fase 8 finais (8.1–8.8):**
- **13 sub-fases pechadas**: 8.1, 8.2, 8.3 (REVISED tras escalación), 8.4.a, 8.4.b.i, 8.4.b.ii, 8.4.c, 8.5.a, 8.5.b, 8.6.a, 8.6.b, 8.7.a, 8.7.b, 8.8.
- **Rollbacks**: 0.
- **Escalacións resoltas sen rollback**: 1 (8.3 ORIXINAL → 8.3 REVISED).
- **Cadea consecutiva desde 3.0**: **51 sub-fases sen rollback**.
- **ErrorCodes engadidos**: +15 (familia YGG_PL: PL001-PL007; familia YGG_B: B001-B007; familia YGG_RO: RO001). Total: 57 → 76.
- **Paquetes activos engadidos**: +3 (@yggdrasil-forge/plugins, @yggdrasil-forge/search, @yggdrasil-forge/validators). Total: 4 → 7.
- **Tests engadidos**: ~+700 totais. Total monorepo: 2195.
  - core: 1691 (+18 en 8.8 + integration en 8.4.c).
  - validators: 68 (NOVO en 8.7.a + 8.7.b).
  - search: 32 (NOVO en 8.6.a + 8.6.b).
  - plugins: 35 (NOVO en 8.5.a + 8.5.b).
- **Funcionalidades clave entregadas**:
  - Plugin system completo end-to-end (PluginManager + HookRunner + PluginAPI + 8 hooks integration en TreeEngine).
  - 2 plugins oficiais (HistoryPlugin + DebugPlugin).
  - SearchEngine + SearchPlugin con algoritmo custom (cero deps externas).
  - ValidatorEngine + 9 built-in rules (6 estruturais + 3 pedagóxicas).
  - **Inversion of Control pattern** establecido (TreeEngine.validatePedagogically).
  - Read-only mode completo (8 métodos bloqueados).
  - Snapshots + Loadouts + Builds share links.
  - Respec extension (costPercent + nodeIdOrIds backward-compat).
- **5 leccións estruturais capturadas** (ver A.6.8): 8.1 L1/L2/L3 + 8.3 L1 + 8.6.a L1.
- **DT-14 fix aplicado en 3 paquetes** (proactivo); 12 scaffold pendentes.
- **🎉 ZERO ROLLBACKS** en toda a Fase 8.

**Paquetes activos tras Fase 8**: 7 (de 15 totais):
- common (codificado completo).
- core (~2700+ liñas, 1691 tests).
- storage (193 tests).
- react (116 tests).
- plugins (NOVO en 8.5; 35 tests; HistoryPlugin + DebugPlugin).
- search (NOVO en 8.6; 32 tests; SearchEngine + SearchPlugin).
- validators (NOVO en 8.7; 68 tests; ValidatorEngine + 9 regras).

**Paquetes scaffold pendentes**: 12 (analytics, cli, devtools, diff, exporters, heatmap, i18n, importers, multitenancy, neo4j, stats, themes, webhooks). Todos teñen smoke.test.ts + placeholder VERSION. DT-14 fix require aplicarse a cada un cando se active.

**Métricas Fase 3 finais (3.0–3.6.b):**
- 0 escalados funcionais (cero asimetrías abertas).
- 1 escalado procedural en 3.4 (fixes globais aplicados sen escalar; anotado
  e resolto retroactivamente; non require rollback).
- 2 bugs latentes do scaffold orixinal cazados en 3.4 (DOM.AsyncIterable +
  tsup dts.composite). Ambos arranxados.
- 9 sub-fases pechadas (3.0/3.1/3.2.a/3.2.b/3.3/3.4/3.5/3.6.a/3.6.b).
- 5 backends de storage implementados (Memory + LocalStorage + Session +
  IndexedDB + FileSystem OPFS).
- Sistema de migracións completo (Registry + Runner + AutoBackup
  + JsonSerializer.deserializeAsync integrado).
- Reconciler completo (4/4 opcións de ReconcileOptions implementadas:
  refundRemovedNodes en 3.6.a; grandfatherIncreasedCosts +
  refundDecreasedCosts + invalidateOnPrereqFailure en 3.6.b).

**Métricas Fase 7 finais (7.1–hixiene):**
- 0 rollbacks (12 sub-fases + 1 hixiene = 13 commits limpos).
- 0 escalados funcionais.
- 0 ErrorCodes novos en toda a Fase 7.
- 0 modificacións de packages/core/, packages/common/, packages/storage/.
- Tests packages/react: 3 → 116 (+113).
- 9 compoñentes públicos: SkillTree, SkillNode, SkillEdge,
  MeshOverlay, SVGRenderer, ThemeProvider, SkillTreeAnnouncer,
  SkillTreeStatic, SkillTreeErrorBoundary.
- 1 wrapper interno: SkillTreeWithDefaultTheme (autoload do tema
  minimal no root entry).
- 4 hooks customizados: useSkillTree, useNodeState,
  useNodeSelector, useStat.
- 3 entry points: root (autoload theme), `/headless` (cero
  estilos), `/server` (RSC-safe).
- 4 módulos internos: svg-helpers, animations,
  createDefaultLayoutRegistry, serializeForClient.
- 1 class component (primeiro do paquete): SkillTreeErrorBoundary.
- 4 devDeps engadidas (testing infrastructure só): jsdom,
  @testing-library/react, jest-axe, @types/jest-axe. Cero deps
  runtime.
- Cobertura final packages/react: **100% / 100% / 100% / 100%**
  en tódolos ficheiros instrumentados (post-hixiene).
- Known limitations documentadas:
  - `headless.ts` cobertura 0/0/0/0 — artefacto v8 inherente
    (módulo puramente de re-exports + dynamic import en tests).
  - `server.ts` cobertura 0/0/0/0 — mesmo patrón.
- Patrón mantido: cero deps runtime engadidas durante Fase 7
  completa.

## A.3 — Débeda técnica

| ID | Descrición | Estado |
|---|---|---|
| DT-1, DT-4..DT-8, DT-10 | (historial Fase 1) | Resoltas |
| DT-9 | infra: `__tests__` non typechean; workaround `src/*.type-test.ts` | Aberta, Fase hardening |
| DT-11 | Detección de ciclos `unlock_node` recursivos non se activa cando pasan polo `TreeEngine.unlock`. Estado coherente polo camiño colateral `NODE_ALREADY_UNLOCKED`. Non bloqueante | Aberta, sub-fase futura |
| DT-12 (cosmética) | CHANGELOG.md ten múltiples cabeceiras `## [Unreleased]` aboliñadas (unha por sub-fase). Decisión: deixar como está, consolidar nunha futura sub-fase ou no release `0.1.0-alpha` | Aberta cosmética, consolidación futura |
| DT-13 | `EffectsRunner.applyModifyResource` non emitía `budgetChange` desde effects | **PECHADA en 2.6.fix2 (3f42e79)** |
| DT-14 | tsup `dts: {composite: false, incremental: false}` necesario en paquetes que dependen de common (composite=true). Cazado en 3.4 para storage. **Aplicado proactivamente en 3 paquetes durante Fase 8**: @plugins (8.5.a), @search (8.6.a), @validators (8.7.a). **12 paquetes scaffold pendentes** (analytics, cli, devtools, diff, exporters, heatmap, i18n, importers, multitenancy, neo4j, stats, themes, webhooks); fix aplicará cando se active cada un (patrón establecido). | Aberta non bloqueante; parcialmente resolta en Fase 8 |
| DT-15 | `Migration.type-test.ts` (3.5) e `treeDefSchema.type-test.ts` non son executados por Vitest (config root inclúe só `*.{test,spec}.ts`; o sufixo `.type-test.ts` non casa). Cazado en 4.1 cando renomearon a `.type.test.ts` para activalo. **Plan**: renomear os dous existentes nun ciclo de hardening futuro, ou cambiar o include do vitest.config para casar tamén `*.type-test.ts`. Cero impacto funcional. | Aberta non bloqueante |
| DT-16 | RadialLayout (4.2) usa sectores angulares iguais por nodo, cero proporcional a número de descendentes. Para árbores moi desbalanceadas pode producir sobreposición visual. **Plan**: sub-fase futura específica implementará o algoritmo proporcional (require dous BFS + cálculo de tamaño do sector proporcional). | Aberta non bloqueante |
| DT-17 | TreeLayout.ts (Buchheim 2002, 4.3) entregou con cobertura Stmts 89.6% / Branch 70.12% (560 liñas, +87% sobre estimación). Ramas non cubertas son ramas internas do algoritmo (apportion thread setting + ancestor default + computeBounds redundancia). **Cero impacto funcional**: 1134 tests pasan, todos os casos comúns producen LayoutResults correctos. **Plan**: hardening específico nun ciclo futuro engadirá ~10-15 tests con árbores en formas particulares (asimétricas profundas, multi-roots desbalanceados) para activar ramas internas. | Aberta non bloqueante |
| DT-18 | Tras 4.5, cobertura global core baixou a 97.91% (de 98.05%). 0.04 puntos por encima do tope ≤0.1 prescrito no briefing. Atribuíble a ramas defensivas legítimas en PathBuilder (1 rama imposible por `noUncheckedIndexedAccess`) e QuadTree (2 ramas de nearest-neighbor: prune + ordenación de visita). **Cero impacto funcional**. **Plan**: hardening cosmético opcional cando se aborde DT-17. | Aberta cosmética |
| DT-19 | Budget compartido entre parent e sub-engines non implementado en 5.2. **Modelo actual**: cada sub-engine usa o seu propio budget illado (configurable via `subtreeOverrides.budget` ou recuperado desde `parentState.subtreeStates[id].budget` via `initialState`). **Para implementar compartido** (modelo PoE estrito): refactor de ResourceManager con `BudgetSource` inxectable + dúas codepaths en TreeEngine.unlock/respec/lock. **Diferido** a sub-fase específica de hardening cando exista caso de uso real demostrado. Cero impacto funcional. | Aberta non bloqueante |
| DT-20 | `Federator.loadFederation(sources)` non implementado en 5.3. Require decisión arquitectónica sobre `FederationSource` shape (URL+CORS? File? Storage? Plugin?). Cero spec MASTER, cero caso de uso real documentado. `mergeTreeDefs` + `detectConflicts` cumpren o caso core (consumidor carga TreeDefs e pasa array). **Diferido** a sub-fase específica futura cando exista demanda real (probable Fase 7 React renderer ou plugin system). Cero impacto funcional. | Aberta non bloqueante |
| DT-21 | `StorageAdapter` interface vive en `@yggdrasil-forge/storage`. En 6.1, ao engadir `TreeRegistry` que require `StorageAdapter` no constructor, creouse a dependencia `core → storage`. **Ideal arquitectónico**: mover a interface a `@yggdrasil-forge/common` (paralelo ao movemento de `Result` na 3.0); as implementacións concretas seguirían en `storage`. Cero impacto funcional (a dependencia non é circular: storage → common, core → common, core → storage). **Diferido**: require breaking change menor (imports cambiarían `from '@yggdrasil-forge/storage'` a `from '@yggdrasil-forge/common'`) que se acometerá nun ciclo de hardening anterior á 0.1.0-alpha. | Aberta non bloqueante |
| DT-22 | `TreeRegistry.ts` (sub-fase 6.1) entregou con cobertura Branch 85.1% (dúas ramas defensivas: `all-in-memory` cache miss fallback + `evictLRU else break`; ambas inalcanzables por API pública). **PECHADA en 6.2**: o executor engadiu `/* v8 ignore next */ + xustificación inline` ás ramas defensivas (incluíndo outras catro en `load()`/`loadEngineFromStorage`/`clear()` para adapters con I/O), levando a cobertura global core de 97.26% a 97.49% (+0.23pp). Acción aliñada coa lección 6.1 L1 (c8 ignore preferible a baixadas globais). | **PECHADA en 6.2 (8de28f6)** |
| DT-23 | `BULK_OPERATION_FAILED` (YGG_E010) está declarado en `packages/common/src/errors/codes.ts` con mensaxe localizada (`{nodeId}/{reason}`) deseñada para "fallou en nodo X durante operación bulk", **pero nunca cableado** en ningún callsite do proxecto. Foi unha reserva semántica do brifing temprano (probablemente 1.x) que ningunha sub-fase emitiu. En 6.1 estivo a piques de reutilizarse para `applyChangesToAll`, pero os placeholders eran incompatibles co payload (`{count}`); resolveuse creando YGG_E032 (`APPLY_CHANGES_FAILED`) en lugar. **Plan**: ou ben cablear `BULK_OPERATION_FAILED` cando proceda (ex: TreeEngine.applyChanges fallo por-nodo), ou eliminar nun ciclo de hixiene se non hai caso de uso planificado tras Fase 8. Cero impacto funcional. | Aberta non bloqueante |
| DT-24 | `TreeEngine.setProgress(nodeId, percent)` require que o NodeDef ten `progressSource: { type: 'manual' }` (ou compatible) configurado. Esta precondición **non está documentada explícitamente no JSDoc de `setProgress`** nin no MASTER §7.7 (ProgressSourceConfig). Cazada empíricamente polo executor en 6.2 cando construíu tests con NodeDefs por defecto. **Plan**: engadir nota explicativa ao JSDoc de `setProgress` e/ou a `§7.7` do MASTER, e/ou un erro máis informativo cando se chama setProgress sobre un nodo sen progressSource manual. Cero impacto funcional (o erro actual emite código existente, simplemente é menos pedagóxico que podería). | Aberta non bloqueante, cosmética |
| DT-25 | Briefings de Fases 4, 5 e 6 (ata 6.3) non están trackeados nun commit `docs:` consolidado. **PECHADA en hardening-2 (7e408d8)**: o autor recuperou os 38 briefings de Fases 4-8 en local + Director aportou 5 desta sesión + este propio briefing hardening-2. 84 briefings totais trackeados en `docs/briefings/`. **Convención nova establecida** en §A.5.2 para evitar reaparecer: todo briefing futuro tráckase na súa propia sub-fase. | **PECHADA en hardening-2** |
| DT-26 | `TreeRegistry.save()` ten patrón fire-and-forget preexistente desde sub-fase 6.1: as 4 chamadas internas a `storage.set` (despois `quotaCheckedSet` en 6.4) estaban `await`-ed pero non capturaban resultado, polo que save() devolvía `ok(undefined)` aínda que algunha escritura interna fallase. **Identificada post-6.4** durante a auditoría do director (e52fc33). **Crítico para 6.4 porque silenciaba `QUOTA_STORAGE_EXCEEDED`** durante save. **PECHADA en 6.5 (ecb08e9)**: refactor de save() para capturar resultado de cada chamada (`quotaCheckedSet` x3 + `persistEngine` x N) e devolver early en erro. Garantía actual: "first error wins" — se a primeira escritura falla, as posteriores non se executan (cero estado intermedio adicional). Cero modificación de `persistEngine` ou `load()` (ambos xa propagaban correctamente). | **PECHADA en 6.5 (ecb08e9)** |

**0 débeda funcional crítica. 0 asimetrías coñecidas.**

**Bugs latentes arranxados durante Fase 2 (3 totais, todos declaradamente):**
- **Cache stale en `TreeEngine.setProgress`** (introducido en 2.4.b; revelado e corrixido en 2.4.e con `if (result.ok) this.statComputer.invalidate()`).
- **`EffectsRunner.applySetProgress` non pasaba por ProgressManager** (introducido en 2.1; cazado en T0 de 2.6; corrixido en 2.6.fix con delegación via context).
- **`EffectsRunner.applyModifyResource` non emitía `budgetChange`** (DT-13; introducido en 2.1; cazado no escenario 8 de 2.6; corrixido en 2.6.fix2 con emisión directa).

**Pendentes futuras documentadas:**

*Validador Zod (2.5 pechou 5 + 5 bonus):*
- ✅ Todas as 10 validacións listadas en versións anteriores deste anexo.

*Pendentes que aínda quedan abertos:*
- `modify_stat` effect → `EFFECT_TYPE_UNSUPPORTED` (require decisión sobre persistencia).
- TimeManager: `cooldownMs`, `reCertifyAfterMs`, `validForMs` non implementados.
- ProgressManager: `remote`, `callback`, `event` sources fóra (Fase 5; integracións externas).
- AuthProviderRegistry (roadmap orixinal 2.5; **substituído por Zod hardening na 2.5 real**; vai a Fase 5).
- Auto-unlock cando `progress === 100`: non implementado por deseño.
- `'in_progress'` state declarado pero non usado.
- `respec` conserva `progress` (decisión deliberada 2.4.b §5.8).
- TreeEngine non emite `statChange` event (declarado, non emitido).
- **Detección de ciclos en prerequisites/dependsOn** (Fase 8.7 pedagóxica; motor xa defensivo en runtime).
- **Eventos compensatorios no rollback de effects** (cuestión arquitectónica documentada en 2.6.fix2 §5.5; afecta tanto a `set_progress` como a `modify_resource` cando os effects revírtense).

## A.3.1 — Contrato ErrorCode

| Código | Valor | Familia | Orixe |
|---|---|---|---|
| `NODE_NOT_FOUND` | `YGG_E001` | Engine | (preexistente, reutilizado en 2.4) |
| `INVALID_TREE_DEF` | `YGG_V001` | Validation | (preexistente, reutilizado en 2.5) |
| `INVALID_COST` | `YGG_V006` | Validation | 1.11 |
| `INVALID_NODE_STATE` | `YGG_E011` | Engine | 1.14 |
| `CHANGE_CONFLICT` | `YGG_E012` | Engine | 1.14 |
| `EFFECT_TYPE_UNSUPPORTED` | `YGG_E013` | Engine | 2.1 |
| `IRREVERSIBLE_EFFECT` | `YGG_E014` | Engine | 2.1 |
| `CIRCULAR_EFFECT` | `YGG_E015` | Engine | 2.1 (ver DT-11) |
| `EFFECT_TARGET_NOT_FOUND` | `YGG_E016` | Engine | 2.1 |
| `EFFECT_APPLICATION_FAILED` | `YGG_E017` | Engine | 2.1 |
| `NODE_NOT_YET_AVAILABLE` | `YGG_E018` | Engine | 2.3.b |
| `PROGRESS_NOT_SUPPORTED` | `YGG_E019` | Engine | 2.4 |
| `PROGRESS_SOURCE_UNSUPPORTED` | `YGG_E020` | Engine | 2.4 |
| `INVALID_PROGRESS_VALUE` | `YGG_E021` | Engine | 2.4 |
| `INVALID_PROGRESS_OPERATION` | `YGG_E022` | Engine | 2.4.c |
| `RECONCILE_TREE_MISMATCH` | `YGG_R001` | Reconcile | 3.6.a |
| `LAYOUT_TYPE_UNKNOWN` | `YGG_L001` | Layout | 4.1 |
| `LAYOUT_COMPUTE_FAILED` | `YGG_L002` | Layout | 4.1 (anticipado), estreado 4.2 |
| `SUBTREE_DEPTH_EXCEEDED` | `YGG_E023` | Engine | 5.1 |
| `SUBTREE_CYCLE_DETECTED` | `YGG_E024` | Engine | 5.1 |
| `SUBTREE_NOT_UNLOCKED` | `YGG_E025` | Engine | 5.2 |
| `MERGE_INVALID_INPUT` | `YGG_E026` | Engine | 5.3 |
| `MERGE_CONFLICTS_DETECTED` | `YGG_E027` | Engine | 5.3 |
| `MERGE_INCOMPATIBLE_SCHEMA` | `YGG_E028` | Engine | 5.3 |
| `TREE_REGISTRY_USER_NOT_FOUND` | `YGG_E029` | TreeRegistry | 6.1 |
| `TREE_REGISTRY_USER_EXISTS` | `YGG_E030` | TreeRegistry | 6.1 |
| `TREE_REGISTRY_BUILD_NOT_FOUND` | `YGG_E031` | TreeRegistry | 6.1 |
| `APPLY_CHANGES_FAILED` | `YGG_E032` | TreeRegistry | 6.1 (resolución 6.1 L2 — ver DT-23) |
| `QUOTA_USERS_EXCEEDED` | `YGG_E033` | TreeRegistry quotas | 6.4 |
| `QUOTA_BUILDS_EXCEEDED` | `YGG_E034` | TreeRegistry quotas | 6.4 |
| `QUOTA_STORAGE_EXCEEDED` | `YGG_E035` | TreeRegistry quotas (lóxico; distinto de YGG_S003 STORAGE_QUOTA_EXCEEDED que é físico) | 6.4 |
| `PERMISSION_DENIED` | `YGG_E036` | TreeRegistry permissions (cero conflito con `PLUGIN_PERMISSION_DENIED` YGG_P003 que é específico de plugins) | 6.5 |

**Total: 76 ErrorCodes. Familia YGG_R nova en 3.6.a, familia YGG_L nova en 4.1, +6 entradas en YGG_E durante Fase 5 (SUBTREE_DEPTH_EXCEEDED, SUBTREE_CYCLE_DETECTED, SUBTREE_NOT_UNLOCKED, MERGE_INVALID_INPUT, MERGE_CONFLICTS_DETECTED, MERGE_INCOMPATIBLE_SCHEMA). +4 entradas en YGG_E durante Fase 6.1 (TREE_REGISTRY_USER_NOT_FOUND, TREE_REGISTRY_USER_EXISTS, TREE_REGISTRY_BUILD_NOT_FOUND, APPLY_CHANGES_FAILED). +4 entradas en YGG_E durante Fase 6.4-6.5 (QUOTA_USERS_EXCEEDED, QUOTA_BUILDS_EXCEEDED, QUOTA_STORAGE_EXCEEDED, PERMISSION_DENIED). +15 entradas en Fase 8: familia YGG_PL nova con 7 codes (PL001-PL007 para Plugins), familia YGG_B nova con 7 codes (B001-B007 para Builds), familia YGG_RO nova con 1 code (RO001 READ_ONLY_VIOLATION).**

## A.3.2 — Cadea de escalado 1.17 (6 capas)

Resolta sen débeda silenciosa.

## A.3.3 — Escalados Fase 2 (15 acumulados; 7 preventivos)

- 1.19: `maxTier === undefined` Opción C conservadora.
- 2.1: escalado pequeno preventivo (`readonly`, getters TreeEngine).
- 2.2: mellora preventiva (NaN-non-cache).
- **2.4.b preventivo**: `TreeEngine.getProgress` preexistente desde 1.12.
- **2.4.c preventivo**: `UnlockResolver.getProgress` privado + §5.6 redactado como "sen cambio".
- **2.4.d preventivo**: 4 lugares con `UnlockResolverContext` cando briefing dicía 2.
- **2.4.e preventivo**: bug latente cache stale 2.4.b.
- **2.5 preventivo**: nome incorrecto `edges.from/to` (real: `source/target`).
- **2.6 preventivo (T0)**: bug latente `applySetProgress` non pasaba por ProgressManager.
- **2.6 preventivo (escenario 8)**: bug latente `applyModifyResource` non emitía budgetChange.
- **2.6.fix2 preventivo**: contradición interna do briefing (§T2.5 anticipaba cambio
  do escenario 8; §9/§T3 prohibían tocar tests existentes).

**Patrón confirmado**: escalados preventivos do executor protexen contra
erros do director. **7 preventivos só en Fase 2**, todos resoltos limpamente.
Tres deses (2.4.e, 2.6, 2.6.fix2) revelaron bugs latentes funcionais que se
arranxaron declaradamente.

## A.3.4 — Decisións pre-resoltas en sub-fases `.b`/`.c`/`.d`/`.e`/`.fix*`

Patrón consolidado: **standalone → integración como sub-fase aparte**.
A familia 2.4 mostra a mellor expresión: 2.4 → 2.4.b → 2.4.c → 2.4.d → 2.4.e.
A familia 2.6 mostra o patrón **bug-fix declarado**: 2.6.fix (set_progress) +
2.6 (tests cross-piece) + 2.6.fix2 (modify_resource budgetChange).

Decisións consistentes en toda Fase 2: atomicidade, audit agregada,
oldBudget directo (vs refund), clock virtual obrigatorio, cero timers
internos, tick explícito, cero auto-unlock, respec conserva progress,
fallback legacy sempre que se inxecta peza opcional, validación na
fronteira (motor defensivo internamente).

## A.4 / A.4.1 — Release/aclaracións

**Briefings versionados**: tras 2.6.fix2 e o trackeo en `624e682`, **15
briefings 2.x trackeados** en `docs/briefings/`. Todos os briefings da
Fase 2 están persistidos no repo.

**AuthProviderRegistry**: roadmap orixinal incluíao como 2.5. Director
substituíuno por Zod hardening por non ter consumidor real. Vai con Fase
5 cando se implementen `remote`/`callback`/`event`.

### A.4.2 — Plan de publicación a npm (decisión do autor, 28-may-2026)

**Decisión do autor**: a publicación a npm **DIFÍRESE** ata ter código
máis maduro **+ exemplos prácticos probados**. Razón: publicar a npm é
case irreversible (deprecación posible, pero versions publicadas viven
para sempre); mellor cazar problemas de API / ergonomía / configuración
nun escenario controlado antes do primeiro publish real.

**Casos prácticos / exemplos** (idea inicialmente posta como "antes de
Fase 3"): **REVISADA polo autor**. Mellor diferilos **antes do editor**
(probablemente Fase 7+) cando xa exista persistencia (Fase 3), React
hooks (Fase 6), e a demo poda ter feedback loop visual real. Hoxe un
exemplo tipo script Node sen persistencia confunde máis do que axuda
(estado pérdese ao acabar, consumidor preguntaría "como gardo isto?").

**Plan de transición**:
- **Próxima sub-fase**: Fase 3.1 (StorageAdapter interface) segundo
  roadmap orixinal. **NON** release-prep agora.
- **Cando publiquemos** (probablemente tras Fase 6 ou tras exemplos):
  sub-fase específica "release-prep + npm publish".
- Mentres tanto: os 34 changesets pendentes seguen acumulándose;
  PR #1 mantense automáticamente actualizada por `changesets/action`;
  cero risco porque `release.yml` actual **NON** chama `pnpm publish`.

### A.4.3 — Investigación pre-release (feita 28-may-2026, NON aplicada)

Investigación realizada para preparar release-prep futura. **Decisións
pre-resoltas para cando chegue o momento**, gardadas aquí para o
próximo arquitecto:

**Configuración do monorepo verificada:**
- **19 paquetes en `packages/`**: 2 reais (`common` 641 liñas, `core`
  10111 liñas), **17 baleiros** (9 liñas cada = `export const VERSION
  = '0.0.0'` placeholder do briefing 0.5 "scaffold all packages").
- **Todos os 19 son publicables**: `private: false` + `publishConfig:
  { access: 'public' }` + license MIT.
- **Linked group actual** en `.changeset/config.json`: `[['common',
  'core', 'react', 'themes']]`. Iso significa que cando sobe versión
  `core`, sobe automáticamente `react` e `themes` (baleiros). Coherente
  co plan de "publicar todos á vez" para reservar nomes npm.
- **`release.yml`**: SÓ xera PRs de versión (changesets/action), NON
  publica. Para activar publicación require: NPM_TOKEN secret + engadir
  `publish: pnpm changeset:publish` no step. Está documentado no propio
  workflow.
- **PR #1 está VIVO**: mantida automaticamente por changesets/action,
  54 commits adiantados sobre main, 0 atrasados. Último commit:
  `8cf587d chore: version packages`. Propón bumpear linked group a
  `0.1.0` baseado nos 34 changesets `minor` acumulados. **NON é
  obsoleto; é a release vivente**.

**Decisións xa tomadas para cando publiquemos:**
1. **Versión inicial: `0.1.0`** (o que `changesets` xa propón en PR #1;
   aceptamos en vez de loitar contra a ferramenta).
2. **Manter 17 paquetes baleiros como publicables** (NON marcar
   `private: true`): plan é publicar todos á vez para reservar nomes
   npm. Patrón estándar en monorepos grandes (Material-UI, Babel).
3. **Engadir README placeholder real a cada baleiro** antes do primeiro
   publish ("planned for Phase X — see roadmap"), para non publicar
   paquetes completamente baleiros.
4. **CHANGELOG: reescribir dende cero formato Keep-a-Changelog** ao
   publicar (https://keepachangelog.com). Substitúe a DT-12 (15
   cabeceiras `[Unreleased]` apiladas). Aplícase a CHANGELOG raíz +
   common + core; borrar nos 17 baleiros.
5. **Mergear PR #1 vivente** cando chegue o momento (NON pechalo).

**Aclaración importante para próximo arquitecto sobre seguridade:**
- **GitHub repo**: protexido por defecto (só autor pushea a main; forks
  son copias independentes que NON tocan o repo orixinal).
- **npm registry**: independente do repo GitHub. Calquera podería
  rexistrar `@yggdrasil-forge/*` en npm se non está reservado. Por iso
  o plan de "publicar todos á vez" cando chegue o momento.
- **Licencia MIT**: autoriza expresamente modificar e redistribuír
  copias. Iso é compatible coa intención do autor ("código visible,
  forks lexítimos, pero NON modificación do MEU repo en GitHub"); ambas
  cousas son cousas distintas.
- **Recomendación opcional** (decisión do autor pendente): configurar
  **Branch Protection** en GitHub (Settings → Branches → main →
  "Require pull request reviews before merging") para reforzar a
  intención. Cero cambio no código.

## A.5 — Evolución do executor

Fase 1: aprendizaxe do protocolo. Fase 2: protocolo maduro,
bidireccional, con escrutinio empírico do executor (DT-11 cazada en
2.1.b; 3 bugs latentes cazados durante 2.4.e + 2.6 + 2.6) e **7
escalados preventivos** contra erros do propio briefing.

**Notas de despedida do executor saliente (post-2.4.e)** incluídas en
A.7 X.

## A.5.1 — Modelo executor

Opus 4.7 desde ~1.14. Sección 0 e escalado INTACTOS.

### A.5.2 — Convención de tracking de briefings (desde hardening-2)

Tras hardening-2 (DT-25 PECHADA), establécese a seguinte convención
permanente:

**Todo briefing producido polo Director debe copiarse a
`docs/briefings/` como parte da súa propia sub-fase**, antes do
commit. Naming permitido:
- **Dot** (`BRIEFING-X.Y.md`): pre-6_2 (histórico).
- **Underscore** (`BRIEFING-X_Y.md`): desde 6_2 en adiante
  (convención actual).

Cero renomeo retrocompatible (preserva git history e refrexa
evolución do proxecto).

Esta convención evita que DT-25 reaparezca en sub-fases futuras.
Briefings producidos pero non trackeados desde hardening-2 en
adiante considéranse erro de proceso.

## A.6 — Leccións do director

**Fase 1:** 1.11, 1.12, 1.17 #2-#6, 1.18, 1.19.

**Fase 2:**
- 2.1: estilo do tipo destino antes de convencións por inercia.
- 2.1.b L1: working tree limpo antes de `git am`.
- 2.1.b L2: tests de orde de eventos verificados empíricamente.
- 2.1.b L3: débeda descuberta merece DT explícita inmediata.
- 2.2.b/2.3 L1: lista de "Ficheiros esperados no diff final".
- 2.3/2.3.b L2: títulos de reporte prescritos inequívocos.
- 2.3.b L3: o director sempre verifica `origin/main`.
- 2.3.b L4 (CHANGELOG): "nova cabeceira `[Unreleased]`; NON consolidar" (DT-12).
- 2.4 L1 (`git am`): primeiro `git status` + `git log -1` antes de teorizar.
- 2.4.b L1: verificar solapamento de API antes de prescribir "engadir engine.X".
- 2.4.c L1: cando briefing pide "buscar usos cruzados", debe **tamén prescribir a política** (Opción A/B/C).
- 2.4.d L1: listar **explicitamente todas as pezas** que poderían construír o tipo de contexto.
- 2.4.d L2: asimetrías parciais → **contrato intermedio fixado por test**.
- 2.4.e L1: ao engadir mutators, T explícito de "auditar invalidación de pezas derivativas".
- 2.4.e L2: verificar orde de construción das pezas antes de redactar.
- 2.5 L1: verificar empíricamente nomes exactos de propiedades de tipos existentes.
- 2.5 L2: baixas de ~0.1 puntos de cobertura por ramas defensivas razoables son aceptables.
- **2.6 L1**: sub-fases de tests-only deben prescribir explicitamente "bugs cazados escalan, non se arranxan na propia sub-fase". O briefing 2.6 fíxoo (§5.7); funcionou (executor cazou modify_resource e non o tocou).
- **2.6.fix L1**: bug-fixes que arranxan comportamentos previamente fixados por test (contratos intermedios da L2 2.4.d) deben **explicitamente listar e autorizar** a actualización deses tests no briefing.
- **2.6.fix2 L1**: cando un briefing anticipa que un test cambia (§T2.5) E á vez ten regra anti-modificación de tests (§9), DEBE eximir explícitamente ese test. Senón créase contradición interna. O briefing 2.6.fix2 omitiuno; executor cazou a contradición; resolveuse con addendum explícito.

**Fase 3 (pechada):**
- **3.0 L1 (acoplamento de tipos primitivos vs dominio)**: cando o
  MASTER spec ubique un tipo nunha sección de "tipos fundamentais",
  verificar antes de prescribir se é **primitivo xenérico** ou
  **dominio-específico**. Os primitivos (Result, Locale,
  YggdrasilError, ErrorCode) vai a `@yggdrasil-forge/common`. Os
  dominio-específicos (NodeDef, EdgeDef, TreeDef) vai ao paquete
  dominio. Decisión orixinal do briefing 1.2 (poñer Result en core)
  foi mimética da estrutura do MASTER §7 sen análise de acoplamento;
  resolveuse arquitectónicamente en 3.0 cando storage precisou Result
  sen acoplarse a core. Patrón de re-export en `core/types/result.ts`
  mantén cero ruptura para imports existentes.
- **3.2 L1 (partir sub-fases por complexidade arquitectónica)**: o
  roadmap orixinal listaba 3.2 como "MemoryStorage + LocalStorageAdapter"
  xuntas. Director decidiu partir en 3.2.a + 3.2.b porque arquitectónicamente
  son distintas: MemoryStorage é trivial; LocalStorageAdapter ten
  serialización JSON + QuotaExceeded + inversión de control + mock
  manual de Storage. Sinerxia natural se a precede: MemoryStorage
  publicado pode servir de referencia/inspiración no test de
  LocalStorageAdapter. Resultado: 4 sub-fases consecutivas limpas
  (3.0/3.1/3.2.a/3.2.b) sen escalados. Confirma que "acoutar >
  ambicionar" funciona tamén en sub-fases pequenas tipo backend.
- **3.4 L1 (riscos non documentados na primeira ampliación de scope
  técnico)**: cando un briefing introduce funcionalidade que **podería
  revelar bugs latentes do scaffold orixinal** (configuracións de tsup,
  tsconfig, lib DOM, project references, etc.) — típicamente cando o
  paquete pasa de "scaffold 9 liñas" a "compilación real con código
  complexo" — o briefing DEBE explicitar:
  1. Que **escalar inmediatamente** se cazara que algunha config global
     precisa modificación.
  2. Que **calquera fix de scaffold non listado en §6 é decisión
     arquitectónica do director**, non implementación do executor.
  O briefing 3.4 omitiu isto. O executor cazou dous bugs lexítimos
  (DOM.AsyncIterable para OPFS for-await, dts.composite:false para
  tsup co tipo composite de common) pero aplicounos directamente como
  "fix" sen escalar. **Funcionalmente correcto, procedimentalmente
  non**. **Briefings posteriores (3.5, 3.6.a) reforzaron §0.6** con
  esta lección explícita e funcionou: executor aplicou
  correctamente en 3.5 evitando Caso A para non modificar
  TreeEngine.fromJSON.
- **3.5 L1 (límite de cobertura branch debe permitir ramas defensivas
  documentadas)**: O briefing 3.5 prescribiu "≥95% Branch en
  MigrationRunner". O executor entregou 88% con 2 liñas non cubertas:
  ambas son ramas defensivas para invariantes que TypeScript non pode
  garantir (cadeas non-semver no fallback de comparación; `array[length-1]
  === undefined` por `noUncheckedIndexedAccess`). Testealas require
  forzar tipos con `as`, prohibido. **A cobertura era irrecuperable**,
  non débeda real. **Briefings futuros distinguen**: "≥95% Branch
  *salvo ramas defensivas documentadas no JSDoc con comentario
  explicativo*". Pasos defensivos comentados con "// Defensivo; non
  debería pasar" son aceptables por debaixo de 95% **sempre que estean
  razoadas e o resto da peza chegue ao limite**.
- **3.5 L2 (decisión condicional dentro de briefing debe considerar §6
  dependencies)**: A decisión T9 do briefing 3.5 prescribiu Caso A
  (converter `deserialize` a `async`) para "≤2 consumidores", sen
  comprobar que ese consumidor (TreeEngine.fromJSON) está fóra de §6.
  Caso A obriga a modificar TreeEngine, o cal require escalar segundo
  3.4 L1. **Polo tanto Caso A é incompatible co espírito do propio
  briefing**. Briefings futuros con bifurcacións condicionais deben
  verificar que **TODAS as ramas da bifurcación respectan §6**. O
  executor xa resolveu ben preferindo Caso B (e así protexendo a
  sub-fase de escalado innecesario), demostrando madureza procedural.
- **3.6.a L1 (decisión arquitectónica pequena reportada transparentemente
  non require escalado retrospectivo)**: O briefing 3.6.a §5.5
  prescribía `state === 'unlocked'` literal. O executor cazou que existe
  tamén estado `'maxed'` (T0.2: 5 valores: locked|unlockable|in_progress|
  unlocked|maxed). Decidiu tratar `'maxed'` como `'unlocked'` para refund
  (razonable: para chegar a maxed pagouse o custo inicial). **Reportouno
  transparentemente en ⚠️ Limitacións**, **NON como "🔧 FIX silencioso"**.
  Distintamente de 3.4 L1, **o comportamento foi correcto**: o executor
  ampliou comportamento pequeno con xustificación clara, comunicou
  abertamente, e a decisión é arquitectónicamente defensible. **Director
  acepta retroactivamente** e anota como lección. Briefings futuros con
  valores enumerados deben **lista-los exhaustivamente** ou autorizar
  interpretación ampliada explicitamente.
- **3.6.b L1 (cobertura branch en pezas que medran require reescalado)**:
  O briefing 3.6.a entregou Reconciler.ts a 100/100/100/100 (peza de 156
  liñas). A 3.6.b ampliouna a 342 liñas (+186, máis do dobre) engadindo
  3 funcións privadas + 5 tipos a discriminated union + lóxica para 3
  políticas. **Resultado: 99/94.64/100/100** (3 liñas defensivas non
  testeables sen forzar tipos). **O briefing 3.6.b prescribía ≥95%
  Branch**; a entrega quedou 0.36 puntos por debaixo. As 3 ramas non
  cubertas son **defensivas razonables** (nodo en oldState pero non en
  oldDef; `?? 0` fallback en workingResources; `oldNode?.cost !== undefined`
  cando o nodo está unlocked). **Aceptable per lección 3.5 L1**. **Lección
  futura**: cando unha peza medra significativamente (>+100 liñas), o
  límite de cobertura no briefing **debe reescalarse explicitamente** ou
  o "salvo ramas defensivas documentadas" debe estenderse claramente. O
  patrón 3.5 L1 → 3.6.b é coherente; non é débeda real.

**Fase 4 (pechada):**
- **4.1 L1 (naming pattern de type-test files debe coincidir co
  config Vitest)**: O briefing 4.1 prescribía sufixo `.type-test.ts`
  paralelo a `Migration.type-test.ts` da 3.5. O executor cazou que
  o `vitest.config.ts` root inclúe só `*.{test,spec}.ts`, polo que
  `.type-test.ts` NON se executa por Vitest (só TypeScript o
  procesa). Cambiou unilateralmente a `.type.test.ts` para que
  Vitest si os execute (os 3 type-tests usan `expectTypeOf` runtime
  da API de Vitest). Reportouno transparentemente en ⚠️ Limitacións
  (patrón paralelo a 3.6.a L1). **Director acepta retroactivamente**.
  Revelou DT-15: ficheiros existentes `.type-test.ts` da 3.5 están
  silenciosamente ignorados por Vitest. **Lección**: briefings con
  tests de tipos deben verificar empíricamente o pattern de
  inclusión do vitest.config antes de prescribir naming.
- **4.3 L1 (algoritmos densos producen ratios de cobertura
  inferiores)**: O briefing 4.3 prescribía Buchheim full ~300 liñas
  con cobertura ≥90% Branch (xa relaxada vs usual 95%). O executor
  entregou 560 liñas (+87%) con 70.12% Branch. **Iso non é só
  "ramas defensivas"** (patrón 3.5 L1) — son ramas internas do
  algoritmo Buchheim non exercitadas polos 32 tests. **Patrón
  distinto a 3.5 L1**: aquí o algoritmo en si é grande e ten ramas
  internas (apportion contour walk, thread setting, ancestor
  fallback) que requiren árbores con estruturas moi específicas
  para activarse. **Briefings futuros con algoritmos densos** (>200
  liñas) deben **especificar tests por estrutura de árbore**
  (asimétrica profunda, multi-root desbalanceado, etc.) máis que
  por "feature da config". **Hardening preventivo**. Considerar
  tamén partir o algoritmo en sub-fases (esqueleto + apportion
  completo) cando se prevea complexity blooming. DT-17 anotado.
- **4.4 L1 (sub-fase consciente minimal vale como decisión válida)**:
  Cando o roadmap MASTER lista unha sub-fase pero o spec é cero,
  a sub-fase minimal-defensiva que **só engade coherencia
  arquitectónica** con sub-fases anteriores (sen inventar features
  para xustificar a sub-fase) é decisión válida. A 4.4 estaba
  inicialmente camiñada a inflar scope (renomear IdentityLayout →
  CustomLayout + `requireAllPositions` + `defaultPosition`). O
  director cazou que ningunha desas tres ten caso de uso real
  documentado, e que IdentityLayout (4.1) xa cumpre o contrato §20
  literal ("Posicións manuais"). Reducida a `parseCustomConfig`
  validador (paralelo a parseRadialConfig + parseTreeConfig). Cero
  modificación de pezas existentes. Cero inflación. **Aplicación
  directa de 3.0 L1 + 4.3 L1**: cero refactor sen valor inmediato,
  cero complexity blooming. **Briefings futuros**: cando o roadmap
  lista unha sub-fase con spec cero, considerar minimal-coherence
  como opción de primeira clase, **non como "non-acción"**.
- **4.5 L1 (sub-fase única con múltiples pezas independentes pode
  funcionar se a cohesión arquitectónica é baixa)**: A 4.5 entregou
  3 pezas (PathBuilder + BoundsCalculator + QuadTree) nun só sprint
  contra a recomendación inicial do director de partir en tres
  sub-fases. **Funcionou**: 1196 tests, cobertura razoable por peza
  (Branch ≥85% QuadTree, Branch ≥95% PathBuilder, 100% perfecta
  BoundsCalculator), +19% sobre estimación (vs +87% en 4.3).
  **Diferenza crítica con 4.3 L1**: as 3 pezas da 4.5 son
  **conceptualmente independentes** (cero acoplamento horizontal:
  PathBuilder modifica edges, BoundsCalculator computa caixa,
  QuadTree indexa puntos; cero hai imports cruzados entre os 3
  ficheiros). **As anomalías de Buchheim 4.3 eran interdependencias
  dun só algoritmo denso**. **Briefings futuros con múltiples
  pezas**: a decisión "sub-fase única vs partir" debe valorar
  cohesión arquitectónica, non só número de pezas. **Heurística**:
  se ficheiros separados teñen <30% de imports cruzados, sub-fase
  única é viable se ademáis cada peza pode entregarse e testarse
  independentemente.

**Fase 5 (pechada):**
- **5.2 L1 (cobertura prescritiva debe ser relativa cando se modifica
  peza preexistente sub-óptima)**: O briefing 5.2 prescribía ≥95%
  Branch para TreeEngine. **Pero TreeEngine xa estaba en 84.54% Branch
  antes da modificación 5.2** (cobertura sub-óptima histórica desde
  Fase 2). A 5.2 mellorou +0.61 puntos (a 85.15%), **funcionalmente
  cumpridora**, **pero formalmente non-conforme co prescrito**.
  **Patrón futuro**: investigación previa do director debe **verificar
  baseline da peza modificada** e prescribir incremento ("non baixar")
  en vez de absoluto ("≥95%"). **Aplicable a TreeEngine sempre** (peza
  monumental de ~1900 liñas); aplicable a outras pezas grandes
  similares no futuro. Patrón consistente coa lección 3.5 L1 pero
  aplicado a métricas globais en vez de só ramas defensivas.
- **5.2 L2 (briefings con APIs prescritas en código exemplo deben
  verificar empíricamente cada chamada de método)**: O briefing 5.2
  prescribía `subEngine.getState()` que **non existe na API pública
  do TreeEngine** (TreeEngine expón `getSnapshot()`, non `getState()`;
  `getState` é privado de StateStore). O executor cazou na
  implementación e usou `getSnapshot()` correctamente, reportándoo
  transparentemente en ⚠️ Limitacións. **Director acepta retroactivamente**
  (patrón paralelo a 3.6.a L1 + 4.1 L1: decisión transparente do
  executor é mellor que escalado bloqueante para erros factuais
  simples). **Pero ideal**: cero erros factuais. **Investigación
  previa debe `grep -n "^  get" TreeEngine.ts` para listar a API
  real** antes de prescribir chamadas no pseudo-código.

**Fase 6 (PECHADA — 5 sub-fases, 6.1 → 6.5):**
- **6.1 L1 (c8 ignore preferible a tolerar baixadas globais)**: en 6.1
  o entregue `TreeRegistry.ts` tiña dúas ramas defensivas verificablemente
  inalcanzables por API pública (`all-in-memory` cache miss + `evictLRU
  else break`). O briefing 6.1 §5.15 prescribía non baixar a cobertura
  global, pero a peza nova (555 liñas, cobertura propia 94.53/85.1/100/98.85)
  baixou a media de 97.42% a 97.26%. Foi tolerada como anomalía
  matemática inevitable. **Lección estructural**: cando unha peza nova
  ten ramas defensivas inalcanzables, **anotar con `/* v8 ignore next */
  + xustificación inline é preferible a aceptar baixadas globais**.
  Iso evita que o baseline drift acumule descenso ao longo de varias
  sub-fases. Patrón consistente con TreeLayout (4.3, DT-17) e
  PathBuilder/QuadTree (4.5, DT-18) que tamén optaron por aceptar
  baixadas; **a partir de Fase 6 a preferencia é v8 ignore proactivo**.
- **6.2 L1 (resolución proactiva de débedas de cobertura)**: en 6.2 o
  executor aplicou a lección 6.1 L1 retroactivamente: engadiu 7 v8
  ignores ás ramas defensivas xenuinas de `TreeRegistry.ts` (incluíndo
  4 liñas preexistentes de 6.1), levando a cobertura global core de
  97.26% a 97.49% (+0.23pp) e resolvendo DT-22 de facto. **Tecnicamente
  excedeu o scope do briefing §5.13** ("cero modificación de pezas
  existentes"), pero aplicando exclusivamente comentarios (cero cambio
  semántico). **Lección estructural**: cando unha sub-fase nova toca
  un módulo con débedas de cobertura preexistentes, anotar v8 ignore
  proactivo é unha intervención mínima aceptable se: (a) é só
  comentario, (b) elimina unha DT explícita, (c) sobe a cobertura
  global. Documentar a DT como PECHADA no peche de fase ou na seguinte
  hixiene. **Director aprobou retroactivamente** o comportamento do
  executor; rexistro formal como lección. Patrón aplicable a outras
  DT de cobertura abertas (DT-17 TreeLayout, DT-18 QuadTree+PathBuilder)
  cando se aborden as áreas correspondentes nunha sub-fase futura.
- **6.5 L1 (recurrencia da 5.2 L2: sinaturas multi-parámetro)**: o
  briefing 6.5 §5.8.5 prescribía `removeBuild(userId, buildId)` cando
  a sinatura real é `removeBuild(buildId)` — o método **deduce o owner**
  percorrendo internamente `buildsIndex`. **É unha recurrencia da
  lección 5.2 L2**: o director debe `grep -nE "^  async (createEngine|
  removeEngine|saveBuild|loadBuild|removeBuild)"` para listar
  **sinaturas literais completas** antes de prescribir bodies. **Patrón
  futuro para briefings que tocan métodos por nome**: o `T0.X` debe
  listar non só nomes senón **sinaturas reais empíricas**.
  **Resolución elegante do executor** (§0.6 transparente): lookup do
  owner via `buildsIndex` antes do check de permiso (cero modificación
  de API pública). Aplica **lección 5.2 L1 ampliada**: cazar e corrixir
  transparentemente cando hai unha solución arquitectonicamente correcta.
- **Nota de seguridade colateral 6.5 (información leak)**: a solución
  do executor para `removeBuild` introduce un information-leak teórico
  — un atacante pode distinguir "buildId inexistente" (BUILD_NOT_FOUND)
  de "buildId existente sen permiso" (PERMISSION_DENIED) polo código
  de erro devolto. **Non é unha DT formal** (consideración de seguridade,
  non bug); o modelo enriquecido en 8.4 PluginManager + HookRunner
  pode mitigar (ex: devolver PERMISSION_DENIED nos dous casos como
  política configurable do plugin). Anotar como **consideración para
  Fase 8.4**.

**Fase 7 (pechada):**
- **7.2 L1 (verificación empírica de literais)**: antes de prescribir
  literais (e.g. valores aceptables de `node.type`, NodeState
  unions), grep o source real do core en lugar de asumir. Aplicado
  preventivamente desde 7.3.
- **7.3 L1 (verificación de fixtures)**: cando reutilizo
  fixtures/helpers entre sub-fases, verificar que tódolos campos
  obrigatorios están (e.g. RadialLayout require `radius`; sen iso
  computeLayout falla silenciosamente). Verificar shape do tipo
  destino antes de usar.
- **7.5 L1 (scripts de verificación runtime de APIs)**: para APIs
  complexas (engine.getSnapshot semantics, TreeState.nodes sparse
  vs dense, getStat behavior con unknownId), executar **scripts tsx
  empíricos** en T0.2 do briefing en lugar de asumir
  comportamento. Aplicado en 7.5, 7.9, 7.10, hixiene.
- **7.6 L1 (single template literal multiline)**: Biome
  `noUselessConcat` rexeita concatenación `+` entre múltiples
  template literals. Prescribir desde o briefing usando **un só
  template literal multiline** con interpolación en lugar de
  múltiples literais concatenados. Aplicado retroactivamente desde
  7.7 en adiante.
- **7.7 L1 (preferir elementos HTML5 semánticos)**: Biome
  `useSemanticElements` rexeita `<div role="status">` (e similares).
  Preferir **elementos HTML5 con role implícito**: `<output>` para
  status, `<main>` para main, `<nav>` para nav, `<aside>` para
  complementary, etc. Aplicado en SkillTreeAnnouncer (7.7) e
  documentado para futuras pezas con role ARIA.

### A.6.8 — Leccións estruturais da Fase 8 — verificación empírica

Durante a Fase 8 (8.1 → 8.8, 13 sub-fases) capturáronse **5
leccións estruturais** sobre verificación empírica antes de
prescribir cambios. Tódalas foron incorporadas como mandato firme
nos briefings posteriores e aplicadas con éxito (cero rollbacks
en Fase 8).

#### 8.1 L1 — Conflitos de nomes en re-exports root barrel

**Contexto**: Durante 8.1 (BuildSerializer + UrlSerializer),
prescribiu un nome xenérico que colidía con exports previos no
barrel root.

**Aprendizaxe**: Verificar collisions antes de prescribir exports
en root barrels.

**Mitigación**: En briefings posteriores, T0.2 verifica os exports
root previos con `grep "^export" packages/.../src/index.ts`. Usar
nomes específicos (e.g., `BuildSerializer` cero `Serializer`).

#### 8.1 L2 — Acceso a internals do TreeEngine

**Contexto**: TreeEngine ten ~2270 liñas + ~35+ métodos. Acceso
a internals require verificación empírica do patrón establecido
(`this.store.getTreeDef()` vs `this.treeDef` directo).

**Aprendizaxe**: cero asumir patróns de acceso a internals sen
grep prévio.

**Mitigación**: T0.2 inclúe verificación do patrón actual antes
de prescribir.

#### 8.1 L3 — Código prescrito é fonte de verdade

**Contexto**: Cando briefings teñen prosa descriptiva + código
prescrito, ambos poden estar dessincronizados. Executor de 8.1
seguiu correctamente o código.

**Aprendizaxe**: o **código prescrito é fonte de verdade**; a
prosa é descritiva.

**Mitigación**: documentado explícitamente no setup dos briefings
posteriores.

#### 8.3 L1 — Grep específico de método vs xenérico

**Contexto**: Durante 8.3, prescribiu `engine.respec(nodeId)` como
API nova baseado en grep xenérico (cero matches). Realidade: o
método xa existía con ~150 liñas + 19 tests dependentes. Executor
parou e escalou.

**Aprendizaxe**: cando verificar que un método **non existe** nunha
clase grande, usar grep específico da definición:
`^  async <methodName>\(`. Cero confiar en grep xenérico que pode
coincidir con referencias en comentarios, imports, tipos, etc.

**Mitigación**: rediseño cirúrxico backward-compat con
`respec(nodeIdOrIds?, opts?)` (8.3 REVISED). Cero rollback
(capturado antes do commit). **Esta lección levou ao patrón actual
de T0.2 con verificacións empíricas explícitas**.

#### 8.6.a L1 — Verificar campos exactos de tipos (corolario de 8.3 L1)

**Contexto**: Durante 8.6.a (SearchEngine), prescribiu `node.name`
para indexación. Realidade: `NodeDef.label` é `LocalizedString`
(cero `name`). Executor detectou + adaptou con `flattenLocalized()`
+ engadiu test específico para LocalizedString Record.

**Aprendizaxe**: cando prescribir APIs ou campos de tipos
existentes (NodeDef, EdgeDef, Cost, etc.), **verificar empíricamente
os nomes exactos** dos campos via grep do tipo. Cero asumir nomes
comúns como `name` que poden ser `label`, `title`, etc.

**Mitigación**: T0.2 inclúe verificación empírica dos tipos
ANTES de codificar. Aplicado con éxito en 8.7.a (NodeDef.label,
EdgeDef.source/target) e 8.7.b (Cost.amount).

**Esta é a lección máis valiosa da Fase 8**: é un corolario de
8.3 L1 aplicado a tipos en lugar de métodos, e marca o patrón de
**verificación empírica como primeira tarefa de calquera sub-fase**.

#### Patrón global emerxente

As 5 leccións converxen nun **patrón único**:
> Cero prescribir cambios sobre código existente sen primeiro
> verificar empíricamente o estado actual (campos, métodos,
> exports, patróns de acceso). T0.2 é a fase de verificación
> empírica obrigatoria en cada sub-fase.

Este patrón será o **estándar para a Fase 9** e seguintes.

### A.6.9 — Leccións estruturais dos exemplos prácticos

A partires da serie de exemplos prácticos post-Fase 8 (examples-1
en adiante), captúrase aquí as leccións estruturais sobre **a
propia API do sistema** que so se detectaron por validación
empírica nun contexto real (fora dos tests unitarios).

#### examples-1 L1 — Dependency edges vs Prerequisites (semántica)

**Contexto**: Durante examples-1, o briefing do Director prescribiu
un exemplo onde `unlock(skill-c)` sen unlock previo de skill-b
debería fallar (paso 5 demostrativo de Result.err pattern). O
Executor verificou empíricamente: **paso 5 cero produciu output
de erro**. `unlock(skill-c)` tivo éxito aínda con skill-b locked,
porque os `'dependency'` edges entre skill-b e skill-c son
**meramente visuais + navegacionais**.

**Descubrimento empírico**:
- **`EdgeDef` con `type: 'dependency'`**: visualización (renderizar
  arrows) + navegación (BFS/DFS para layouts, search, validators).
  **NON enforce de prereqs en runtime**.
- **`NodeDef.prerequisites: UnlockRule`**: mecanismo real de
  enforcement runtime. Consultado por `UnlockResolver`.
- **`UnlockRule`** é discriminated union: `'all' | 'any' | 'none'`
  + array de `UnlockCondition`, ou `UnlockCondition` directa
  (e.g., `{type:'node_unlocked', nodeId:'X'}`).
- **`PREREQUISITES_NOT_MET = 'YGG_E003'`** é o ErrorCode emitido
  cando unha condition non se cumpre.

**Aprendizaxe**: a lección 8.6.a L1 (verificar empíricamente APIs
antes de prescribir) **debe aplicarse tamén á SEMÁNTICA** dos
mecanismos, non só aos nomes de campos. Director asumiu que
`'dependency'` edges enforce prereqs **baseándose no nome**; iso
foi un erro. **Briefings didácticos requiren empíricamente probar
a semántica antes de prescribir exemplos**.

**Mitigación**: examples-1-fix engade `prerequisites` aos NodeDefs
do exemplo + sección README explicando a distinción. Lección
capturada aquí para evitar repetir o erro en exemplos futuros
(examples-2 React, examples-3 plugins, etc.) e en Fase 9 (Visual
Editor) onde a distinción será crítica para o UX.

**Patrón emerxente** (corolario de 8.6.a L1):
> Cero asumir semántica de mecanismos baseándose en nomes de tipos
> ou campos. Para briefings que prescriben código demostrativo,
> **executar mentalmente** ou (mellor) **probar empíricamente** o
> comportamento esperado contra o código real antes de prescribir.

Esta lección extende o patrón "verificación empírica T0.2" a
**verificación empírica de semántica** (cero só de estructura de
tipos).

### A.6.10 — Renderer arquitectónicamente insuficiente sen North Star (examples-2 L1)

A Fase 7 implementou o renderer `@react` **sen mockup de referencia**:
construíuse para pasar tests, non para vender. Tras 0.1.0, o feedback
empírico revelou ~18 gaps arquitectónicos. **Aprendizaxe:** orde estricta
**mockup → arquitectura → código**; cero código de UI antes de North Star
+ análise. **Customer Zero:** cando un OSS nace dunha necesidade interna
(Oberón), ese cliente é o North Star autoritativo; cada decisión pasa
«¿isto serve a Oberón?».

### A.6.11 — «Same Data. Different Themes.»

Separación radical entre **lóxica** (estrutura do grafo) e **presentación**
(tema). **Nunca acoplar unha decisión de tema á estrutura de datos.** A
comparación visual de temas sobre os mesmos datos é a validación explícita
desta promesa.

### A.6.12 — Build narrow, design wide (reconciliación de alcance)

Un roadmap que mestura tres proxectos (produto / librería / plataforma)
sen fronteira ten **alcance infinito**. Doutrina: **entrégase o estreito**
(cliente cero, Oberón) e **deséñase o ancho** (sen pechar xogos nin
Duolingo). Test por decisión: «¿isto pecharíalle a porta a un dev de
xogos ou de Duolingo?». E: **verificar empíricamente que os datos do
cliente caben no motor ANTES de planificar a capa visual**. Detalle en
`docs/architecture/ROADMAP-1.0-RENDERER-TO-STUDIO.md`.

### A.6.13 — Pechar o lazo da CI (non só o estado local)

Síntoma: master-transition, F9.1 e F9.3.a quedaron VERMELLOS en CI aínda
que o Executor reportou "todo verde" e o Director verificou o diff. Causa
raíz: un erro de lint dunha liña en `examples/react-demo/src/App.tsx`
(`organizeImports`) introducido en examples-2. `pnpm lint:fix` arránxao,
pero o protocolo dicía "reverte cambios fóra de scope", así que o Executor
revertía o arranxo en cada sub-fase → o erro persistía e a CI fallaba en
`lint`. Ademais medíase `pnpm lint` ANTES de reverter → o "verde" estaba
caduco.

Correccións de protocolo (obrigatorias desde agora):
1. **Gate final = secuencia completa de CI**, como ÚLTIMO paso antes do
   patch, DESPOIS de todos os edits/reverts:
   `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`. O
   reporte DEBE incluír esa saída. Prohibido medir antes de reverter.
2. **Nunca reverter arranxos lexítimos de lint/format.** Se `lint:fix` toca
   ficheiros fóra de scope, é débeda preexistente: inclúese o arranxo (se é
   trivial e CI-relevante) ou escálase — nunca se reverte. Reverter só vale
   para churn de formato espurio.
3. **Unha sub-fase NON está "feita" ata que a CI estea verde en
   origin/main.** A verificación do Director inclúe confirmar o run de
   Actions. (As "53 sub-fases sen rollback" medían verde LOCAL; as últimas
   3 estaban vermellas en CI — o código sólido, a pipeline non.)

Débeda non bloqueante coñecida: 3 warnings `suppressions/unused`
(`noConsole`) en `packages/core/src/plugins/PluginAPI.ts` (info/warn/error);
`pnpm lint` sae 0 con warnings, non bloquean. Límpanse nunha futura
sub-fase que xa toque @core.

### A.6.14 — Release: lockfile stale tras `changeset version` + hooks no bot

Síntoma: o workflow Release quedou VERMELLO en todos os commits con
changeset desde examples-2 (git exit 1 no step changesets/action). Causa
raíz (verificada, NON a primeira hipótese):
1. `changeset version` bumpa @core (e linked) e actualiza os rangos de
   dependencia dos EXEMPLOS privados (react-demo, node-basics), que usan
   semver publicado `^0.1.0`→`^0.2.0`. Como @core 0.2.0 non está publicado
   e `link-workspace-packages` é false (default pnpm v11), pnpm vai ao
   rexistro e o `pnpm-lock.yaml` queda stale → `ERR_PNPM_OUTDATED_LOCKFILE`.
2. Os git hooks de Husky (pre-commit `lint-staged`, pre-push `typecheck`)
   disparan dentro do bot de changesets/action ao facer commit/push.

Hipótese errada inicial: "o pre-commit corre `pnpm install`". É falso —
corre `lint-staged`. **Verifica sempre o hook real antes de diagnosticar.**

Fix (verificado de punta a punta):
- `changeset:version`: `changeset version && pnpm install --lockfile-only
  --no-frozen-lockfile --config.link-workspace-packages=true` (o flag forza
  linkar o @core local; o lockfile resultante pasa `--frozen-lockfile` sen
  flag).
- `HUSKY: '0'` no env dos workflows (hooks só para dev local, nunca bots).

Os exemplos seguen en semver publicado a propósito (Stackblitz); non se
pasan a `workspace:*` nin se toca `.npmrc`.

### A.6.15 — Bot PRs e publish: illamento dos exemplos + secondary invokers

Tras o merge do PR de versión 0.2.0, o Release workflow fallaba por:
1. `files: [...]` multiline en 6 `package.json` (Biome esixe oneline;
   `pnpm lint:fix` arránxao; NON revertir estes cambios automáticos).
2. 3 comentarios `biome-ignore noConsole` inútiles en PluginAPI.ts
   (liñas 80, 84, 88; aplican a `console.info/warn/error` que Biome xa
   acepta sen suppression). A liña 76 conservouse porque suprime
   activamente `console.debug` (Biome SI considera violation).
3. Os exemplos privados (`react-demo`, `node-basics`) usan deps por
   semver publicado (`^0.2.0`) para compatibilidade con Stackblitz.
   Ao publicar 0.2.0, esas versións non existen aínda no rexistro →
   o build de Release falla con TS2307. Fix: `build:packages` exclúe
   `./examples/*` do turbo build.

**Lección secundaria — secondary invokers de `pnpm build`**.
Excluír os exemplos no step Build do workflow non é suficiente se
outros scripts invocan `pnpm build` por si mesmos. Concretamente,
`changeset:publish = "pnpm build && changeset publish"` corre **despois**
do step Build, dentro de `changesets/action`, e tamén falla. Tódolos
invocadores indirectos de `pnpm build` no pipeline deben migrar a
`build:packages` ou ser auditados.

**Lección terciaria — verificación empírica vs prescrición teórica**.
O briefing v1 prescribiu "borrar 4 suppressions" asumindo todas
inútiles. A verificación empírica do Executor (`pnpm lint:fix` output)
revelou que SO 3 son `Suppression has no effect`; a cuarta (console.debug)
está activa. Borrar as 4 sen verificar produciría 1 erro lint novo.
**Principio reforzado**: o output de tooling é tribunal final, por
encima de asuncións do briefing.

Patrón xeral: os exemplos son demostradores, non código publicable.
O build de Release só debe compilar paquetes da librería, non exemplos.
Cando se introduce un script de filtro como `build:packages`,
**buscar todos os invokers de `build`** (`grep "pnpm build" package.json
.github/`) antes de dar a tarefa por feita.

### A.6.16 — Release: formato automático no paso de versión (fix permanente de A.6.15)

A.6.15 documentou que `changeset version` re-expande os arrays `files` dos
`package.json` e, como o bot corre con `HUSKY=0` (A.6.14), Biome non os
recolle → `main` queda lint/format vermello tras cada merge de PR de
versión. O parche dunha-vez (`pnpm format` manual) repetíase en cada release.

Fix permanente: `changeset:version` remata con `&& pnpm format`. O bot
formatea os manifests despois de versionar e antes de commitear; o PR de
versión xa vai limpo, e o merge non rompe a CI. `pnpm format` só afecta
JSON/TS (ignora ficheiros non soportados), é idempotente e seguro no bot.

### A.6.17 — Tematización + multi-entry-point (Context singleton)

Un paquete con varios entry points (`/index`, `/headless`) que comparten
React Context **debe** garantir unha soa instancia de `createContext`
(singleton vía `Symbol.for` en `globalThis`), ou cada bundle terá o seu
Context e `useContext` devolverá o default. Síntoma: `useTheme()===null` en
compoñentes dun entry distinto ao do `Provider`. Pode quedar **enmascarado**
por tematización vía cascada DOM (CSS vars no SVG); aparece ao migrar a
theming por Context (inline style desde `useTheme`).

Detectado en F10.3.fix-2: o demo importaba `ThemeProvider` de
`@yggdrasil-forge/react` (entry /index) e `SkillTree` de
`@yggdrasil-forge/react/headless`, polo que cada bundle tiña o seu
`ThemeContext` e `useTheme()` no `SkillNode` devolvía `null`. O modelo
anterior (CSS vars no `<svg>` herdadas por cascada DOM) sobrevivía sen
notar o bug; o salto a inline-theming destapouno.

Regra: tematizar por inline style desde `useTheme()` **e** Context
singleton cross-bundle (`Symbol.for(globalThis)`). Adicionalmente,
`/headless` debe re-exportar `ThemeProvider`/`Theme` para que un
consumidor en modo headless poida tematizar dun único bundle.

### A.6.18 — Multi-package builds con DTS interdependente

`pnpm --filter <pkg> build` **non** respecta o pipeline de dependencias de
turbo. Se `@react` depende de tipos de `@core` e ambos tiveron cambios no
mesmo PR/patch, o `tsup-dts` de `@react` lerá `@core/dist/index.d.ts`
**vello** porque o seu `@core/dist` non se reconstruíu antes. Síntoma:
`error TS2339: Property 'X' does not exist on type 'Y'` durante o DTS
build dunha rama onde X **si** existe no source.

Regra: para builds multi-paquete tras aplicar un patch que toca varios,
**sempre** `pnpm turbo run build --filter=@<consumidor> --force`. Turbo
reconstrúe automáticamente os deps upstream antes do consumidor.

Detectado en F10.4 (EdgeStyle.directed novo no core): `pnpm --filter
@react build` rompeu DTS porque `EdgeStyle.directed` non existía en
`packages/core/dist/index.d.ts`. `pnpm turbo run build --filter=@react
--force` resolveu en un só comando.

### A.6.19 — SVG `marker-end` e orde de render

Un `<marker>` referenciado por `marker-end` debúxase **no último punto do
path**, **centrado no anchor**. Se ese punto está dentro dun shape máis
grande (ex. círculo dun nodo) e o shape se renderiza **despois** do path
(orden estándar en skill trees: `<edges>` antes que `<nodes>` para que
estes pinten encima), o marker queda **completamente oculto polo fill** do
nodo.

Solucións consideradas:
- Aumentar `markerWidth/markerHeight`: non funciona — o marker queda
  centrado no punto, polo que máis grande = máis cuberto polo nodo.
- `markerUnits="userSpaceOnUse"`: mellora marxinal, mesmo problema.
- **Acortar o path** no extremo target (escollida en F10.4): helper puro
  `shortenEdgeAtTarget(path, gap)` move o último punto cara o anterior
  unha distancia `gap`. Para edges `directed`, `gap = targetRadius + 2`.
  A frecha queda visible fóra do bordo. Helper en
  `packages/react/src/edgeGeometry.ts`.

Aplicable a calquera SVG con markers e shapes opacos nos extremos.

### A.6.20 — Curva/routing = contrato de datos (non prop de React)

A xeometría dos edges (curva tree-wide, routing por-edge) é parte do
**contrato de datos** (viaxa co `TreeDef`, serialízase, vale para Studio,
exportadores e calquera renderer), **non** un prop de presentación.

Canónico (F10.4b):
- `LayoutConfig.curve?: CurveStyle` — estilo por defecto da árbore.
- `EdgeStyle.routing?: CurveStyle` — override por-edge (gaña sobre o de
  layout).
- `computeLayout` aplica `applyEdgeRouting(layoutResult, treeDef)` tras o
  layout para reescribir os paths afectados. Retrocompatible: árbores sen
  routing definido seguen retas.

`SkillTree.curve` (React) **sobrevive como override de presentación**:
gaña sobre o dato cando se pasa. Útil para axustes de UI puntuais; non é
o canónico.

Razón do principio: o **tema** (cores) é runtime e vive en
`ThemeProvider` (A.6.17). A **xeometría**, en cambio, é estrutura — debe
ir co TreeDef para que se conserve ao serializar/exportar/editar.

### A.6.21 — Rexistros compartidos cross-bundle (Symbol.for singleton) + tree-shaking

Esta é a forma xeneralizada de A.6.17: **calquera rexistro mutable
compartido entre os múltiples entry points dun paquete** (Context, Map,
Set, etc.) require o mesmo patrón `Symbol.for(globalThis)`. Se non, cada
bundle (`/index`, `/headless`, ...) crea a súa propia instancia e os
valores rexistrados nun non son visibles dende o outro.

Detectado/aplicado en F10.5 cun rexistro de iconos SVG:
- Patrón: `const REGISTRY_KEY = Symbol.for('@yggdrasil-forge/react#IconRegistry')`,
  almacenado en `globalThis[REGISTRY_KEY]` como `Map<string, IconDef>`.
- API pública: `registerIcon/registerIcons/getIcon/hasIcon`.

**Sub-lección — auto-rexistro de defaults non pode depender de side-effect
imports** cando `package.json` ten `"sideEffects": false`. O patrón
inicial era `import './builtin.js'` desde os barrels para disparar
`registerIcons(BUILTIN_ICONS)`. Esbuild/tsup recoñecen `sideEffects:
false` e **eliminan** o bare import durante o build do propio paquete
(o warning é explícito: `Ignoring this import because "X" was marked as
having no side effects`). Resultado: o auto-rexistro non está no `dist`
final, e os builtins **non se rexistran en runtime** mesmo aínda que o
ficheiro fonte exista.

Patrón correcto: o auto-rexistro vive **dentro do propio módulo do
rexistro** (`registry.ts`), no top-level. Como o módulo é importado por
calquera consumidor de `getIcon`/`registerIcon` (e por `SkillNode`), o
seu top-level execútase sempre. Cero bare imports. Cero dependencia da
política de side-effects.

Regra para revisores: cando un PR introduce un *novo* rexistro mutable
compartido (LRU cache, listener registry, factory registry...), revisar
(1) que use Symbol.for + globalThis e (2) que o auto-rexistro de
defaults estea no propio módulo do rexistro, non en módulos satélites
acoplados por side-effect imports. Un Map a nivel de módulo é unha
*trap* silenciosa: funciona nos tests (un só bundle por suite), rompe
en runtime se o consumidor mestura `/index` + `/headless` ou se
`sideEffects: false`.

## A.7 — Protocolo consolidado

Sección 0 en todo briefing. Salvagardas executables; afirmacións
técnicas verificadas empíricamente; redacción sen ambigüidade dupla
nin contradicións internas (lección 2.6.fix2 L1); estilo de tipo
destino antes de convención xeral; working tree limpo antes de
aplicar parche; títulos de reporte prescritos; lista de ficheiros
esperados no diff final; `git status` + `git log -1` antes de
teorizar; verificación de solapamento de API; auditoría de
invalidación cando se engaden mutators; verificación empírica de
nomes exactos de campos.

**CHANGELOG (DT-12 / A.6 L4):** os briefings prescriben "engadir nova
cabeceira `## [Unreleased]` ao principio". O executor non consolida;
consolidación canónica diferida.

**`exactOptionalPropertyTypes: true`**: para campos opcionais con valor
potencialmente `undefined`, spread condicional `...(value !== undefined
&& { field: value })`.

**Subdivisión consciente de Fase 6 (Director Yggdrasil 3, 10-jun-2026)**:
o §67 orixinal lista Fase 6 como 3 sub-fases (`6.1 TreeRegistry`,
`6.2 Aggregate queries`, `6.3 ScopedStorage + Quotas + Permissions`).
A xestión real partiu de forma consciente en **5 sub-fases**:
`6.1 TreeRegistry`, `6.2 Aggregate queries`, `6.3 ScopedStorage`,
`6.4 Quotas`, `6.5 Permissions (interface mínima)`. Razóns:
(a) mantén o ritmo de 1-1.5h por sub-fase do proxecto; (b) reduce
risco arquitectónico individual; (c) Permissions enterga só interface
mínima (`PermissionChecker` opcional) co modelo completo diferido a
8.4 PluginManager + HookRunner. Patrón análogo á familia 2.4 de Fase 2
("acoutar > ambicionar"). **Cero impacto funcional**; só afecta á
contabilidade de sub-fases (Fase 6 = 5 entregas, non 3).
**Resultado tras peche (11-jun-2026)**: cadea 6.1 → 6.5 = 5 sub-fases
consecutivas pechadas con cero rollbacks. Decisión subdivisión
ratificada como exitosa. (post-2.4.e, extendidos
post-2.6.fix2)

- **Verificacións T0 antes de tocar nada** salvaron premisas erróneas
  dos briefings. Tres bugs latentes cazados durante T0/T1/T2.
- **Escalar ante descubrimentos non previstos** sempre mellor que
  asumir. 7 escalados preventivos en Fase 2, todos resoltos.
- **Patrón "test intermedio que se actualiza ao pechar a asimetría"**
  funcionou tres veces (2.4.d→e, 2.6.fix, 2.6.fix2 con escenario 8).
- **Commits separados con `git format-patch` + `git am`** robusto.
- **Detalles do entorno**: `exactOptionalPropertyTypes: true` require
  spread condicional. Biome `noThenProperty` da DSL Effect →
  `biome-ignore` localizado. `useLiteralKeys` arranxa con
  `npx biome check --fix --unsafe`. Mensaxes de erro **sen punto final**.
  Comentarios en galego/castelán. Marcadores `// ── INICIO/FIN ──`.
  Sen `;`, 2 espazos.
- **Lección máis aplicable**: **"acoutar > ambicionar"**. Familia 2.4
  (5 sub-fases) e familia 2.6 (3 entregas) emerxeron precisamente por
  aplicar esta regra.

## A.8 — Método de entrega

Integración: SEMPRE push directo a `origin/main`. Transporte: `.patch`
aceptable se non hai credenciais, aplicado **dende a raíz** (1.15) e
**con working tree limpo previo** (2.1.b L1). Push final polo autor.

**Títulos prescritos en reportes**:
- Pushed: `═══ SUB-FASE X — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE X — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

## A.9 — Estado cuantitativo final Fase 2

```
Commit final Fase 2:     624e682 (briefings) → 7974214 (close) →
                         f14e5c7 (publish strategy)
Tag Fase 1:              phase-1-closed (en 1290378)
Tests:                   896 (43 ficheiros)
Cobertura global:        98.18%
Pezas a 100% cobertura:  EffectsRunner, StatComputer, UnlockResolver,
                         ProgressManager (4 pezas core completas)
Cobertura treeDefSchema: 95.83% (2.5)
Cobertura TreeEngine:    96.46%
Cobertura TimeManager:   98.73/96.29/100/98.73
Lint / Typecheck:        0/0 / 20/20 (sen caché)
Deps externas (core):    immer + zod
ErrorCodes:              40 (cero novos desde 2.4.c)
Sub-fases Fase 1:        8 pechadas + addendum 1.19
Sub-fases Fase 2:        13 pechadas + 2 hotfixes = 15 entregas
Escalados resoltos:      15 (7 preventivos na Fase 2)
Incidentes transporte:   3 (ningún desde 2.3.b)
Bugs latentes arranxados: 3 (todos declaradamente, cero silenciosos)
Briefings trackeados:    15 da Fase 2 (commit 624e682)
Débeda funcional:        0 crítica · 0 asimetrías coñecidas
Débeda non bloqueante:   DT-9 (infra), DT-11 (cycles), DT-12 (CHANGELOG cosmético)
DT-13:                   PECHADA en 2.6.fix2
```

## A.9.b — Estado cuantitativo final Fase 3 (PECHADA)

```
Commit actual:           1fe9374 (origin/main; tras peche oficial)
Sub-fases Fase 3:        9 entregas (3.0, 3.1, 3.2.a, 3.2.b, 3.3, 3.4,
                         3.5, 3.6.a, 3.6.b)
Tests adicionais:        +43 common (Result + Reconcile mensaxes)
                         +171 storage (5 backends)
                         +101 core (migracións + reconciler completo)
                         Total monorepo: ~1228 tests
Cobertura paquete storage: 100/97/100/100
  - StorageAdapter.ts:   só interface (sen liñas executables)
  - MemoryStorage.ts:    100/100/100/100
  - LocalStorageAdapter.ts: 100/97.67/100/100
  - IndexedDBAdapter.ts: 100/95.65/100/100
  - SessionStorageAdapter.ts: 100/100/100/100
  - FileSystemAdapter.ts: 100/95.71/100/100
Cobertura paquete core (engadidos 3.5 + 3.6.a + 3.6.b):
  - MigrationRegistry.ts: 100/100/100/100
  - MigrationRunner.ts:  95.12/88/100/94.44 (2 ramas defensivas; ver 3.5 L1)
  - AutoBackup.ts:       100/100/100/100
  - JsonSerializer.ts (ampliado): 100/93.1/100/100
  - Reconciler.ts:       99/94.64/100/100 (3 ramas defensivas; ver 3.6.b L1)
  Global core:           98.2% Stmts
Cobertura paquete common: 100%
Lint / Typecheck:        0/0 / 20/20 (sen caché, 253 ficheiros)
ErrorCodes:              41 (RECONCILE_TREE_MISMATCH YGG_R001 novo en 3.6.a)
Escalados resoltos:      15 acumulados + 1 procedural en 3.4 (anotado;
                         resolto retroactivamente sen rollback)
Bugs latentes cazados:   2 do scaffold orixinal en 3.4 (DOM.AsyncIterable
                         + tsup composite); arranxados.
Asimetrías abertas:      cero
Incidentes transporte:   cero novos en Fase 3
Débeda nova:             DT-14 (tsup composite; non bloqueante)
Briefings trackeados:    9 da Fase 3 (commit 1fe9374)
Filosofía aplicada:      "cero jsdom" (mock manual de Storage en 3.2.b;
                         mock manual de mock interno en SessionStorage 3.4).
                         Exceptúase con fake-indexeddb (3.3) e opfs-mock
                         (3.4): librerías específicas dun estándar
                         complexo, paralelo arquitectónico documentado.
Backends storage:        5 implementacións concretas
                         (Memory + LocalStorage + Session + IndexedDB
                          + FileSystem OPFS)
Sistema migracions:      completo (Registry + Runner + AutoBackup +
                         JsonSerializer.deserializeAsync integrado)
Reconciler:              completo (4/4 opcións de ReconcileOptions
                         implementadas):
                         - refundRemovedNodes (3.6.a)
                         - grandfatherIncreasedCosts (3.6.b)
                         - refundDecreasedCosts (3.6.b)
                         - invalidateOnPrereqFailure 3 valores (3.6.b)
```

## A.9.c — Estado cuantitativo final Fase 4 (PECHADA)

```
Commit actual:           5a80acf (origin/main; SSR verification 4.6)
Sub-fases Fase 4:        6 entregas (4.1, 4.2, 4.3, 4.4, 4.5, 4.6)
Tests adicionais Fase 4: +224 en core (1023 → 1221)
                         +0 en common (cero cambios)
                         +0 en storage (cero cambios)
                         Total monorepo: ~1452 tests
Cobertura paquete core:  97.91% Stmts global (drop 0.29 desde 98.2%
                         de Fase 3 close; DT-17 + DT-18)
  Pezas Fase 4 (engadidas):
  - LayoutEngine.ts:           interface (sen liñas executables)
  - LayoutEngineRegistry.ts:   100/100/100/100
  - LayoutResult.ts:           tipos + ampliación (sen liñas executables)
  - IdentityLayout.ts:         100/100/100/100
  - computeLayout.ts:          100/100/100/100
  - RadialLayout.ts:           98.21/91.07/100/100 (4 ramas defensivas)
  - RadialLayoutConfig.ts:     100/100/100/100
  - MeshGenerator.ts:          100/100/100/100
  - TreeLayout.ts:             89.55/70.12/95.45/93.69 (DT-17: ramas
                               internas de Buchheim apportion + thread)
  - TreeLayoutConfig.ts:       100/100/100/100
  - CustomLayoutConfig.ts:     100/100/100/100
  - PathBuilder.ts:            94.87/96.15/100/94.87 (1 rama defensiva)
  - BoundsCalculator.ts:       100/100/100/100
  - QuadTree.ts:               94.04/92.98/93.75/93.58 (DT-18: prune
                               + ordenación nearest-neighbor)
Cobertura paquete common: 100% (cero cambios)
Cobertura paquete storage: cero cambios (4.6 verifica SSR sen tocar
                          storage)
Lint / Typecheck:        0/0 / 20/20 (sen caché, 288 ficheiros)
ErrorCodes:              43 (+2 da familia YGG_L nova en 4.1:
                         LAYOUT_TYPE_UNKNOWN + LAYOUT_COMPUTE_FAILED)
Escalados resoltos:      1 procedural en 4.1 T0.2 (LayoutConfig
                         tighten parcial rompería tests existentes;
                         resolveuse Opción 3: cero tighten, manter
                         intacto). Cero escalados funcionais.
Asimetrías abertas:      cero
Incidentes transporte:   cero novos en Fase 4
Débedas novas:           DT-15 (type-test naming) + DT-16 (radial
                         sectores iguais) + DT-17 (TreeLayout
                         Buchheim cobertura sub-óptima) + DT-18
                         (global core cosmético)
Briefings trackeados:    pendente (commit separado posterior;
                         paralelo a 1fe9374 da Fase 3)
Layout engine completo:  3 layouts implementados (IdentityLayout
                         como 'custom', RadialLayout, TreeLayout
                         Buchheim O(n) con 4 direccións) +
                         5 estilos de curva (PathBuilder:
                         straight, diagonal-V/H, radial,
                         orthogonal) + BoundsCalculator (padding
                         + mesh + edges inclusion) + QuadTree
                         (range + nearest queries)
SSR-safety:              core verificado completamente SSR-safe.
                         Regression guard programático en
                         `__tests__/ssr/no-dom-imports.ssr.test.ts`
                         escanea `packages/core/src/` en cada
                         execución de tests. docs/SSR.md publicado.
                         Validado empíricamente: forzar `document.
                         title` artificial → guard reporta exacto
                         path:line:código.
```

## A.9.d — Estado cuantitativo final Fase 5 (PECHADA)

```
Commit actual:           953cda7 (origin/main; Federator 5.3)
Sub-fases Fase 5:        3 entregas (5.1, 5.2, 5.3)
Tests adicionais Fase 5: +160 en core (1221 → 1381)
                         +0 en common (cero cambios estruturais; só
                          ErrorCodes engadidos)
                         +0 en storage (cero cambios)
                         Total monorepo: ~1612 tests
Cobertura paquete core:  97.42% Stmts global (drop 0.55 desde 97.97%
                         post-5.1; explicación matemática: a base
                         ampliou con Federator 98.77% Stmts mais que
                         a media; pezas existentes DT-17 + DT-18
                         seguen sub-óptimas)
  Pezas Fase 5 (engadidas):
  - SubtreeManager.ts:            100/100/100/100 (modificado en 5.2)
  - mergeTreeDefWithOverrides.ts: 100/100/100/100
  - Federator.ts:                 98.77/93.33/100/98.63 (2 ramas
                                  defensivas por noUncheckedIndexedAccess;
                                  lección 3.5 L1)
  TreeEngine.ts (modificado en 5.2):
  - Branch coverage subiu 84.54% → 85.15% (+0.61 puntos; cero
    regresión pese a +150 liñas; lección 5.2 L1 anotada)
Cobertura paquete common: 100% (cero cambios estruturais; +6 entradas
                          en codes/messages)
Cobertura paquete storage: cero cambios (Fase 5 standalone)
Lint / Typecheck:         0/0 / 20/20 (sen caché, 295 ficheiros)
ErrorCodes:               49 (+6 da familia YGG_E en Fase 5:
                          SUBTREE_DEPTH_EXCEEDED, SUBTREE_CYCLE_DETECTED,
                          SUBTREE_NOT_UNLOCKED, MERGE_INVALID_INPUT,
                          MERGE_CONFLICTS_DETECTED,
                          MERGE_INCOMPATIBLE_SCHEMA)
Escalados resoltos:       0 procedurales en Fase 5 (cadea limpa
                          completa 5.1 → 5.3)
                          2 erros do briefing 5.2 cazados polo
                          executor transparentemente sen escalado
                          (getSnapshot vs getState + branch coverage
                          prescripción irrealista; ambos decisión
                          correcta in-situ; lecciones 5.2 L1 + L2)
Asimetrías abertas:       cero
Incidentes transporte:    cero novos en Fase 5
Débedas novas:            DT-19 (budget compartido entre engines;
                          modelo PoE estrito non implementado) +
                          DT-20 (loadFederation diferida)
Briefings trackeados:     pendente (commit separado posterior;
                          paralelo a 1fe9374 da Fase 3)
Sub-trees + Federation completos:
                          - SubtreeManager standalone (5.1): cache,
                            depth limit, cycle detection,
                            TreeEngineFactory pattern para evitar
                            acoplamento circular.
                          - TreeEngine integration (5.2):
                            getSubtreeEngine + enterSubtree con
                            sincronización automática parent ↔
                            sub-engine via subscribe + Unsubscribe
                            handles xestionados; recursividade real
                            con cycle detection propagada;
                            initialState recovery; anchor unlocked
                            enforcement.
                          - Federator (5.3): mergeTreeDefs con 4
                            estratexias (namespace_all con rewrite
                            recursivo completo, first_wins, last_wins,
                            manual rexeita), detectConflicts en 7
                            tipos de id, MergedTreeMeta personalizable.
                          - Pendente conscientemente diferido:
                            budget compartido (DT-19), loadFederation
                            (DT-20).
```


## A.9.e — Estado cuantitativo final Fase 6 (PECHADA)

```
Commit actual:           ecb08e9 (origin/main; Permissions + DT-26 fix 6.5)
Sub-fases Fase 6:        5 entregas (6.1, 6.2, 6.3, 6.4, 6.5)
                         + 2 commits docs (f6c41b5 hixiene post-6.3,
                                           <hash> hixiene post-6.5)
Tests adicionais Fase 6: +142 en core (1381 → 1523)
                         +0 en common (cero cambios estruturais; 7
                          ErrorCodes engadidos en codes/messages:
                          E029-E032 en 6.1, E033-E035 en 6.4, E036 en 6.5)
                         +22 en storage (171 → 193: ScopedStorage en 6.3)
                         Total monorepo: ~1776 tests (+164 vs Fase 5)
Cobertura paquete core:  97.51% Stmts global (+0.09 vs 97.42% baseline
                         Fase 5; mellora consciente vía leccións 6.1 L1
                         + 6.2 L1 que substituíron "aceptar baixadas"
                         por "v8 ignore proactivo + xustificación").
  Pezas Fase 6 (engadidas en TreeRegistry.ts; 6.1 + 6.2 + 6.4 + 6.5):
  - TreeRegistry.ts:    98.41/92.44/100/100 (modificado en 6.2, 6.4, 6.5)
                        Branch coverage subiu 85.1% (post-6.1) →
                        92.44% (post-6.5) = +7.34 puntos. Aplicación
                        proactiva de leccións 6.1 L1 + 6.2 L1.
  Pezas Fase 6 (engadidas en storage; 6.3):
  - ScopedStorage.ts:   100/100/100/100 (peza nova autocontida)
Cobertura paquete common: 100% (cero cambios estruturais; +7 entradas
                          en codes/messages)
Cobertura paquete storage: 100/96.73/100/100 (Stmts subiu a 100% con
                           ScopedStorage)
Lint / Typecheck:         0/0 / 21/21 (sen caché, 299 ficheiros)
ErrorCodes:               57 (+7 da familia YGG_E en Fase 6 post-6.1:
                          E029 TREE_REGISTRY_USER_NOT_FOUND,
                          E030 TREE_REGISTRY_USER_EXISTS,
                          E031 TREE_REGISTRY_BUILD_NOT_FOUND,
                          E032 APPLY_CHANGES_FAILED (resolveu colisión
                               de placeholders con E010 reservado;
                               lección 6.1 L2),
                          E033 QUOTA_USERS_EXCEEDED,
                          E034 QUOTA_BUILDS_EXCEEDED,
                          E035 QUOTA_STORAGE_EXCEEDED (lóxico;
                               coexiste con YGG_S003 físico),
                          E036 PERMISSION_DENIED (interface mínima;
                               modelo enriquecido en 8.4))
Escalados resoltos:       0 procedurales en Fase 6 (cadea limpa
                          completa 6.1 → 6.5)
                          3 erros do briefing cazados polo executor
                          transparentemente sen escalado:
                          - 6.1: progressSource manual non documentado
                                 (→ DT-24)
                          - 6.4: campo scope privado non lido (TS6133;
                                 substituído por prefix precalculado)
                          - 6.5: sinatura real de removeBuild (1 param,
                                 non 2; → lección 6.5 L1)
Asimetrías abertas:       cero
Incidentes transporte:    cero novos en Fase 6
Débedas resoltas Fase 6:  DT-22 (cobertura defensiva TreeRegistry,
                          PECHADA en 6.2; aplicou lección 6.1 L1)
                          DT-26 (save() fire-and-forget preexistente
                          desde 6.1, PECHADA en 6.5 con refactor "first
                          error wins")
Débedas novas Fase 6:     DT-21 (StorageAdapter en common idealmente;
                          decisión arquitectónica diferida á 0.1.0-alpha),
                          DT-23 (BULK_OPERATION_FAILED YGG_E010 declarado
                          mais non cableado dende Fase 1; review en
                          hixiene futura),
                          DT-24 (progressSource manual non documentado
                          no JSDoc de setProgress; cosmética),
                          DT-25 (briefings trackeados Fases 4+5+6
                          pendentes nun único commit docs; cosmética)
Briefings trackeados:     pendente (DT-25; commit consolidado tras
                          peche dunha fase futura)
TreeRegistry + Multi-tenancy completos:
                          - TreeRegistry (6.1): lifecycle (createEngine
                            + getEngine + removeEngine + listEngines),
                            3 estratexias de cache ('all-in-memory',
                            'lru', 'on-demand'), build management
                            completo (saveBuild + loadBuild + listBuilds
                            + removeBuild + exportAllBuilds +
                            importBuilds), persistence vía StorageAdapter.
                          - Aggregate queries (6.2): 4 queries operando
                            directamente sobre storage sen instanciar
                            engines (MASTER §5.6.5):
                            getAggregateStats, getNodePopularity,
                            getProgressDistribution, getStuckUsers.
                            Determinismo via tie-breaks alfabéticos.
                          - ScopedStorage (6.3): adapter envolvendo
                            outro StorageAdapter cunha clave de scope.
                            Isolation cross-tenant segura
                            (clear() iterativo, NUNCA delega a
                            base.clear()). Anidación transparente.
                            watch condicional.
                          - Quotas (6.4): maxUsers + maxBuildsPerUser
                            + maxStorageBytes. Helpers privados
                            quotaCheckedSet/Delete envolvendo 9
                            callsites existentes. Cero opt-in para
                            back-compat (undefined → pass-through).
                            Reconstrución de accounting en load().
                          - Permissions mínima (6.5): PermissionChecker
                            interface co método único check(action,
                            userId). 5 acciones de mutación per-user
                            (createEngine, removeEngine, saveBuild,
                            loadBuild, removeBuild). Ordering:
                            permiso ANTES que quota. Modelo enriquecido
                            (ACL/RBAC/policies) difírido a 8.4
                            PluginManager + HookRunner.
                          - Pendente conscientemente diferido:
                            DT-21 (StorageAdapter en common),
                            modelo enriquecido de Permissions (8.4),
                            análise de subtreeStates en aggregate
                            queries (sub-fase futura sen spec en MASTER).
```

**Fase 6 modélica.** 142 tests engadidos en core + 22 en storage = +164
tests totais, cero asimetrías funcionais abertas, 3 leccións estruturais
aprendidas (6.1 L1 + 6.2 L1 + 6.5 L1), TreeRegistry como interface
canónica para multi-tenancy (3 estratexias de cache + builds + persistence),
ScopedStorage como wrapper de isolation, Quotas e Permissions integradas
opcionalmente con back-compat absoluta. 2 DT resoltas (DT-22, DT-26)
mediante aplicación proactiva das súas propias leccións. Decisión de
subdividir Fase 6 en 5 sub-fases (en vez das 3 do §67 orixinal)
ratificada exitosa: cadea sen rollback completa.

## A.10.b — Comparación inicio/fin Fase 3

```
Inicio Fase 3:    896 tests core + 17 common + 1 storage smoke = 914 tests
                  Cero backend de persistencia (StorageAdapter aínda
                  non existía como interface)
                  Cero sistema de migracións
                  Cero reconciler

Fin Fase 3:       997 core + 60 common + 171 storage = ~1228 tests (+314)
                  5 backends storage completos
                  Sistema de migracións completo (Registry + Runner +
                  AutoBackup + JsonSerializer integrado)
                  Reconciler completo con 4/4 opcións de ReconcileOptions

Leccións do director engadidas en Fase 3:
                  3.0 L1, 3.2 L1, 3.4 L1, 3.5 L1, 3.5 L2,
                  3.6.a L1, 3.6.b L1 (7 leccións de aprendizaxe estrutural)

ErrorCodes:       40 → 41 (+1: RECONCILE_TREE_MISMATCH YGG_R001)
                  Familia YGG_R nova para Reconcile.

Débeda nova:      DT-14 (tsup composite, non bloqueante).
Bugs latentes arranxados: 2 do scaffold orixinal (DOM.AsyncIterable +
                         tsup composite, ambos en 3.4).
```

**Fase 3 modélica.** 314 tests engadidos, cero asimetrías funcionais
abertas, 7 leccións estruturais aprendidas, 5 backends storage cubrindo
o ecosistema completo de persistencia web (Memory, LocalStorage,
SessionStorage, IndexedDB, OPFS), sistema de migracións con safety net,
e Reconciler con 4 políticas configurables de reconciliación de saves.

## A.10.c — Comparación inicio/fin Fase 4

```
Inicio Fase 4:    997 tests core + 60 common + 171 storage = ~1228 tests
                  (estado fin Fase 3, commit 1fe9374 / 835fd24)
                  Cero Layout Engine
                  Cero PathBuilder / BoundsCalculator / QuadTree
                  Cero verificación formal SSR
                  Cero regression guard

Fin Fase 4:       1221 core + 60 common + 171 storage = ~1452 tests (+224)
                  Layout Engine completo:
                  - 3 layouts (IdentityLayout/'custom', RadialLayout,
                    TreeLayout Buchheim O(n))
                  - 4 direccións para TreeLayout (top-down, bottom-up,
                    left-right, right-left)
                  - 4 tipos de mesh (none, rings, cross, star)
                  - 5 estilos de PathBuilder (straight, diagonal-V/H,
                    radial, orthogonal)
                  - BoundsCalculator con padding/mesh/edges inclusion
                  - QuadTree con range/nearest queries
                  Verificación formal SSR-safety + regression guard
                  programático + docs/SSR.md publicado

Leccións do director engadidas en Fase 4:
                  4.1 L1, 4.3 L1, 4.4 L1, 4.5 L1
                  (4 leccións estruturais; 11 leccións acumuladas
                  desde Fase 2)

ErrorCodes:       41 → 43 (+2: LAYOUT_TYPE_UNKNOWN +
                  LAYOUT_COMPUTE_FAILED en 4.1; familia YGG_L nova)

Débedas novas:    DT-15 (type-test naming), DT-16 (radial sectores
                  iguais), DT-17 (Buchheim cobertura sub-óptima),
                  DT-18 (global core cosmético). Todas non bloqueantes.

Cero bugs latentes cazados en Fase 4 (Fase 3 cazara 2 do scaffold
                         orixinal; Fase 4 cazou cero, indicando
                         madurez do core).
```

**Fase 4 modélica.** 224 tests engadidos, cero asimetrías funcionais
abertas, 4 leccións estruturais aprendidas, Layout Engine completo
con 3 layouts + 5 estilos de curva + spatial index + SSR
verification. Cadea 3.0 → 4.6: 15 sub-fases consecutivas pechadas
con cero rollbacks.

## A.10.d — Comparación inicio/fin Fase 5

```
Inicio Fase 5:    1221 tests core + 60 common + 171 storage = ~1452 tests
                  (estado fin Fase 4, commit 13ef887)
                  Cero SubtreeManager
                  Cero TreeEngine.getSubtreeEngine / enterSubtree
                  Cero Federator
                  Modelo de datos sub-trees xa modelado desde Fase 1
                  (NodeType 'subtree_anchor', NodeDef.subtreeId/
                  subtreeOverrides, TreeDef.subtrees, TreeState.
                  subtreeStates, Prereq subtree_completion) pero
                  sen infraestrutura de XESTIÓN.

Fin Fase 5:       1381 core + 60 common + 171 storage = ~1612 tests (+160)
                  Sub-trees + Federation completos:
                  - SubtreeManager standalone con lifecycle completo
                  - TreeEngine.getSubtreeEngine (lookup pasivo)
                  - TreeEngine.enterSubtree (creación + sincronización
                    + evento subtreeEntered + anchor unlocked check)
                  - Recursividade real con cycle detection (maxDepth=10)
                  - Sincronización automática parent ↔ sub-engine via
                    subscribe + Unsubscribe handles
                  - initialState recovery (parent.subtreeStates →
                    sub-engine inicial)
                  - Federator con 4 estratexias (namespace_all,
                    first_wins, last_wins, manual)
                  - detectConflicts en 7 categorías de id

Leccións do director engadidas en Fase 5:
                  5.2 L1 (cobertura prescritiva relativa para pezas
                  preexistentes sub-óptimas)
                  5.2 L2 (verificación empírica de APIs en pseudo-código)
                  (2 leccións estruturais; 13 leccións acumuladas
                  desde Fase 2)

ErrorCodes:       43 → 49 (+6: SUBTREE_DEPTH_EXCEEDED YGG_E023,
                  SUBTREE_CYCLE_DETECTED YGG_E024, SUBTREE_NOT_UNLOCKED
                  YGG_E025, MERGE_INVALID_INPUT YGG_E026,
                  MERGE_CONFLICTS_DETECTED YGG_E027,
                  MERGE_INCOMPATIBLE_SCHEMA YGG_E028; todas familia
                  YGG_E existente)

Débedas novas:    DT-19 (budget compartido diferido por refactor
                  maior de ResourceManager + cero caso de uso real
                  documentado), DT-20 (loadFederation diferida por
                  decisión arquitectónica sobre FederationSource
                  shape). Ambas non bloqueantes con plan claro.

Modelo PoE Cluster Jewels funcionalmente completo para casos básicos.

Cero asimetrías funcionais abertas.

Cero rollbacks en Fase 5 (consistente con Fases 3 e 4).

Cero escalados procedurales (vs 1 en Fase 4 T0.2 e 1 en Fase 3
T0.4 / 3.4 L1). **Fase 5 modélica**.

Cadea 3.0 → 5.3: 18 sub-fases consecutivas pechadas con cero
rollbacks (incluíndo 2 hixienes intermedias MASTER).
**Cadea 3.0 → 8.8: 51 sub-fases consecutivas pechadas con cero
rollbacks (récord histórico tras Fase 8).**
```

**Fase 5 modélica.** 160 tests engadidos, cero escalados, cero
asimetrías funcionais abertas, 2 leccións estruturais aprendidas,
Sub-trees + Federation funcionalmente completos. Modelo Path of
Exile Cluster Jewels cumpre o spec MASTER §18-19 para casos
básicos. DT-19 (budget compartido) e DT-20 (loadFederation)
diferidas conscientemente con plan claro.


## A.10.e — Comparación inicio/fin Fase 6

```
Inicio Fase 6:    1381 tests core + 60 common + 171 storage = ~1612 tests
                  (estado fin Fase 5, commit 953cda7 / b8b6d89)
                  Cero TreeRegistry (engines aislados de a un)
                  Cero Build management (snapshots persistidos)
                  Cero Aggregate queries (analíticas multi-user)
                  Cero ScopedStorage (tenants compartindo backend)
                  Cero Quotas
                  Cero Permissions interface
                  Cobertura global core: 97.42% (baseline post-5.3)

Fin Fase 6:       1523 core + 60 common + 193 storage = ~1776 tests (+164)
                  TreeRegistry completo (lifecycle + builds + 3 cache
                  strategies + persistence vía StorageAdapter)
                  4 Aggregate queries directas sobre storage
                  ScopedStorage como adapter de isolation multi-tenant
                  Quotas (3 dimensións: users, builds/user, bytes) con
                  back-compat absoluta
                  Permissions interface mínima (PermissionChecker
                  opcional, 5 acciones de mutación per-user)
                  Cobertura global core: 97.51% (+0.09 vs Fase 5)

Leccións do director engadidas en Fase 6:
                  6.1 L1 (c8 ignore preferible a tolerar baixadas),
                  6.2 L1 (resolución proactiva de débedas cobertura),
                  6.5 L1 (sinaturas multi-parámetro empíricas)
                  (3 leccións estruturais; 14 leccións acumuladas
                  desde Fase 2)

ErrorCodes:       49 → 57 (+8: 4 en 6.1 [E029-E032] + 3 en 6.4
                  [E033-E035] + 1 en 6.5 [E036]).
                  E032 APPLY_CHANGES_FAILED creado para evitar
                  colisión de placeholders con YGG_E010
                  BULK_OPERATION_FAILED reservado (lección 6.1 L2).
                  E035 QUOTA_STORAGE_EXCEEDED é lóxico; cero conflito
                  con YGG_S003 STORAGE_QUOTA_EXCEEDED preexistente
                  físico.

Débeda pechada:   DT-22 (cobertura defensiva TreeRegistry, PECHADA
                  en 6.2 vía v8 ignore proactivo).
                  DT-26 (save() fire-and-forget, PECHADA en 6.5
                  vía refactor "first error wins").

Débeda nova:      DT-21, DT-23, DT-24, DT-25 (4 cosméticas / non
                  bloqueantes; ver §A.3).

Bugs latentes arranxados: 1 (save() fire-and-forget preexistente
                          desde 6.1; arranxado en 6.5 como `Fixed`
                          declarado no CHANGELOG).
```

**Fase 6 modélica.** 164 tests engadidos, cero asimetrías funcionais
abertas, 3 leccións estruturais aprendidas, TreeRegistry + Multi-tenancy
como capa completa para SaaS sobre o motor (5 estratexias de cache,
build management, queries agregadas, isolation multi-tenant, cotas
configurables, control de permisos opcional). Decisión consciente de
subdividir Fase 6 en 5 sub-fases (en vez das 3 do §67 orixinal)
ratificada exitosa: cadea 6.1 → 6.5 = 5 sub-fases consecutivas con
cero rollbacks; cadea total 3.0 → 6.5 = 23 sub-fases sen rollback.
Aplicación proactiva de leccións de cobertura (6.1 L1 + 6.2 L1)
permitiu pechar DT-22 retroactivamente e levar Branch coverage de
TreeRegistry.ts de 85.1% a 92.44% (+7.34 puntos). save() refactor
en 6.5 arranxou un bug latente desde 6.1 que silenciaba erros internos
(incluído `QUOTA_STORAGE_EXCEEDED` durante save).

## A.10 — Comparación inicio/fin Fase 2

```
Inicio Fase 2:    538 tests · 1 peza nova esperada (EffectsRunner)
Fin Fase 2:       896 tests (+358) · 4 pezas novas (EffectsRunner +
                  StatComputer + TimeManager + ProgressManager) + 5
                  cableados/reordenamentos + 10 validacións Zod + 3
                  bugs latentes arranxados declaradamente +
                  0 asimetrías coñecidas + 0 débeda silenciosa
```

**Fase 2 modélica.** A regra "acoutar > ambicionar" xerou a familia 2.4
(5 sub-fases pequenas estables en vez de 1 monolítica) e a familia 2.6
(3 entregas con bug-fixes declarados). Os 7 escalados preventivos do
executor protexeron contra erros de redacción do briefing. Os 3 bugs
latentes arranxáronse declaradamente como `Fixed` no CHANGELOG, nunca
como contratos observables silenciosos.

---

*Yggdrasil Forge — Forxando árbores de habilidades para a web.*

**FIN DO DOCUMENTO MESTRE v6 — con Anexo A (Fase 1 completa + Fases
2, 3, 4, 5, 6 PECHADAS; cadea 23 sub-fases sen rollback)**
