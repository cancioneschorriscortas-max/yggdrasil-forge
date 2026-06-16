# BRIEFING — SUB-FASE 8.6.b de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEGUNDA das 2 sub-sub-fases de 8.6** (SearchPlugin + @search).
> Tras 8.6.a (scaffold updates + SearchEngine standalone), 8.6.b
> engade **SearchPlugin** (Plugin interface) + integration con
> TreeEngine via plugin system + **README update** completo do
> paquete @search.
>
> **Tras 8.6.b, paquete @search é completo end-to-end**:
> - SearchEngine standalone (8.6.a) ✅
> - SearchPlugin (8.6.b) ✅
> - README completo con ambos usos ✅
> - Tests exhaustivos ✅
>
> **Pezas (4 grupos)**:
> 1. **SearchPlugin** (1 ficheiro NOVO en `packages/search/src/`).
> 2. **Tests** (~10) en `__tests__/SearchPlugin.test.ts`.
> 3. **Updates**: `src/index.ts` (+export) + `README.md` (sección
>    Search completa).
> 4. **Housekeeping** (.changeset + CHANGELOG).
>
> **Decisións confirmadas polo director**:
> - **Permissions**: `['read_state']` (SearchPlugin chama
>   `engineHandle.getTreeDef()`).
> - **Constructor sen opts**: cero SearchPluginOptions interface en
>   8.6.b (sub-fase futura pode engadir `autoIndex` ou similar).
> - **`install`**: garda engineHandle + indexa treeDef inicial
>   automáticamente.
> - **`uninstall`**: limpa SearchEngine + descarta engineHandle ref.
> - **API pública**: `search()`, `reindex()`, `getEngine()`.
> - **`getEngine()` expón SearchEngine interno** para casos avanzados
>   (cero require comunmente; útil para test introspection).
> - **`reindex()` sen install previo** = cero efecto (engineHandle=null;
>   defensivo).
> - **README update completo**: sección Search con SearchPlugin
>   (entrypoint principal) + SearchEngine (uso avanzado standalone)
>   + algoritmo + LocalizedString note.
> - **Cero modificación de SearchEngine.ts** (intacto desde 8.6.a).
> - **Cero ErrorCodes novos** (SearchPlugin é fire-and-forget).
>
> **Lección 8.6.a L1 aplicada**: SearchPlugin NON manexa LocalizedString
> directamente; delega a SearchEngine que xa fai flattenLocalized
> internamente.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
> SearchPlugin.ts non existe (xa verificado polo director).
>
> 8.7, 8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.6.b — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.6.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: SearchPlugin.ts chega a **100/100/100/100**.
Cero regresión na baseline post-8.6.a.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: cero modificación de
calquera test existente. Tódolos ~2097 tests previos deben pasar
intactos.

**0.14 — Coherencia co patrón HistoryPlugin/DebugPlugin**: SearchPlugin
segue o mesmo patrón (Plugin interface + permissions + install +
uninstall + tests con TreeEngine real).

**0.15 — Cero modificación de SearchEngine.ts** (intacto desde
8.6.a).

**0.16 — Lección 8.3 L1 aplicada con rigor**: T0.2 verifica que
`packages/search/src/SearchPlugin.ts` non existe.

**0.17 — Lección 8.6.a L1 reaplicada**: cando o briefing menciona
`NodeDef.label` ou outros campos de tipos existentes, **verificar
empíricamente o nome exacto**. Cero asumir `name` ou similares.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.6.b** de Yggdrasil Forge. **SEGUNDA das 2 sub-sub-fases
de 8.6** (SearchPlugin + @search).

**Pezas (4 grupos)**:

**Grupo A — SearchPlugin (1 ficheiro NOVO)**:
1. `packages/search/src/SearchPlugin.ts` (NOVO; class implementing
   Plugin).

**Grupo B — Tests (1 ficheiro NOVO)**:
2. `packages/search/__tests__/SearchPlugin.test.ts` (NOVO; ~10
   tests).

**Grupo C — Updates (2 MODIFICADOS)**:
3. `packages/search/src/index.ts`: engadir export SearchPlugin.
4. `packages/search/README.md`: substituír contido con sección Search
   completa (SearchPlugin entrypoint principal + SearchEngine
   avanzado).

**Grupo D — Housekeeping**:
5. `.changeset/search-plugin-8-6-b.md` (NOVO).
6. `CHANGELOG.md` (MODIFICADO).

**Total: 6 ficheiros tocados** (3 NOVOS + 3 MODIFICADOS).

**Cero modificación de**:
- `packages/search/src/SearchEngine.ts` (intacto desde 8.6.a).
- `packages/search/src/types.ts` (intacto; SearchOptions / SearchResult
  / SearchField / SearchMatch xa tipados).
- `packages/search/__tests__/SearchEngine.test.ts` (intacto; 21
  tests).
- `packages/search/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts` (scaffold intacto).
- `packages/plugins/`, `packages/core/`, `packages/common/`,
  outros paquetes.
- Tests existentes (~2097 totais).
- `package.json` root, configs root.
- MASTER.md.

**CERO deps de npm externas engadidas**. Cero ErrorCodes novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `22b0204`, verificada
empíricamente)**.

### SearchEngine API estable (verificada desde 8.6.a)

```ts
class SearchEngine {
  index(tree: TreeDef): void
  search(query: string, options?: SearchOptions): readonly SearchResult[]
  clear(): void
  size(): number
}
```

**SearchPlugin** instancia internamente SearchEngine + delega.

### Plugin interface (verificada)

```ts
interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly apiVersion: string
  readonly permissions?: readonly PluginPermission[]
  install(engine: PluginEngineHandle, api: PluginAPI): void | Promise<void>
  uninstall?(engine: PluginEngineHandle): void | Promise<void>
}
```

### PluginEngineHandle.getTreeDef (verificado en 8.4.b.ii)

```ts
readonly getTreeDef: () => Readonly<TreeDef>
```

**SearchPlugin.install** chama `engineHandle.getTreeDef()` para
obter o tree inicial.

### Permissions axeitadas

**`'read_state'`**: SearchPlugin lee o treeDef (parte do "state" do
engine). Cero `modify_state`, cero `register_hooks` (cero require).

### Estado actual scaffold (verificado)

```
packages/search/
├── README.md                     (39 liñas placeholder; require substituír)
├── __tests__/
│   └── SearchEngine.test.ts      (21 tests; INTACTO)
├── package.json                  (intacto desde 8.6.a)
├── src/
│   ├── SearchEngine.ts           (140 liñas; INTACTO)
│   ├── index.ts                  (18 liñas; engadir export SearchPlugin)
│   └── types.ts                  (59 liñas; INTACTO)
├── tsconfig.json                 (intacto)
└── tsup.config.ts                (intacto; DT-14 fix aplicado)
```

### Estado actual README (verificado)

O README actual de @search é placeholder cero útil (probable só
título + descrición). **Substituír** por contido completo en 8.6.b.

### Coordinación con HistoryPlugin/DebugPlugin de 8.5

**Patrón establecido**:
- Plugin class con readonly id/name/version/apiVersion/permissions.
- Constructor con opts opcional.
- install(engineHandle, api) → setup.
- uninstall(_engine) → cleanup.
- API pública con métodos para uso externo.

**SearchPlugin sigue mesmo patrón**.

### Tests de integration con TreeEngine

**Crear TreeEngine real** require `@yggdrasil-forge/core`:
```ts
import { TreeEngine } from '@yggdrasil-forge/core'
```

**Workspace dependency xa configurada** en 8.6.a (package.json
deps inclúe @core).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `22b0204` (sub-fase 8.6.a — SearchEngine).
- 1673 core + 60 common + 193 storage + 116 react + 35 plugins +
  21 search = **~2098 tests** monorepo limpo.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 50 ErrorCodes existentes.
- **Cadea 47 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir **SearchPlugin** completo no paquete `@yggdrasil-forge/search`
(reutilizando o SearchEngine standalone xa creado en 8.6.a):
clase implementando Plugin interface en
`packages/search/src/SearchPlugin.ts` con permissions `['read_state']`;
constructor sen opts; `install(engineHandle, api)` garda engineHandle
internamente + indexa treeDef inicial automáticamente; `uninstall`
limpa SearchEngine + descarta engineHandle; API pública con
**`search(query, options?)`** (delega a SearchEngine), **`reindex()`**
(re-indexa manualmente desde engineHandle), **`getEngine()`** (expón
SearchEngine para casos avanzados); reindex sen install previo é
defensivo (cero efecto); tests específicos (~10) incluído integration
con TreeEngine real e LocalizedString handling (delegado a SearchEngine);
actualizar `src/index.ts` (+export SearchPlugin) + **substituír**
`README.md` con sección Search completa (SearchPlugin entrypoint
principal + SearchEngine standalone + algoritmo + LocalizedString
note). **Cero modificación de SearchEngine.ts** ou ningún test
existente. **Cero ErrorCodes novos**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (3)**:
- `packages/search/src/SearchPlugin.ts` (~110 liñas).
- `packages/search/__tests__/SearchPlugin.test.ts` (~180 liñas;
  ~10 tests).
- `.changeset/search-plugin-8-6-b.md` (NOVO).

**MODIFICADOS (3)**:
- `packages/search/src/index.ts` (+2 liñas; engadir export
  SearchPlugin).
- `packages/search/README.md` (substituír contido total; ~70 liñas
  novas).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 6 ficheiros tocados** (3 NOVOS + 3 MODIFICADOS).

### 5.2 — src/SearchPlugin.ts (FIXADO)

```ts
// ── INICIO: SearchPlugin ──
// Plugin oficial para Yggdrasil Forge que integra SearchEngine
// como un Plugin do TreeEngine.
//
// **Sub-fase 8.6.b**: wrapping de SearchEngine como Plugin.
// `install` garda engineHandle + indexa treeDef inicial; `uninstall`
// limpa SearchEngine + descarta engineHandle.
//
// **Permissions**: `['read_state']` — SearchPlugin chama
// `engineHandle.getTreeDef()` para obter o tree inicial.
//
// **API pública**:
// - `search(query, options?)`: delega a SearchEngine.search.
// - `reindex()`: re-indexa manualmente desde engineHandle (útil
//   se treeDef cambia tras applyChanges en sub-fase futura).
// - `getEngine()`: expón SearchEngine interno para casos avanzados.

import type {
  Plugin,
  PluginAPI,
  PluginEngineHandle,
} from '@yggdrasil-forge/core'
import { SearchEngine } from './SearchEngine.js'
import type { SearchOptions, SearchResult } from './types.js'

/**
 * Plugin oficial que integra SearchEngine como un Plugin do
 * TreeEngine.
 *
 * @example
 * import { SearchPlugin } from '@yggdrasil-forge/search'
 *
 * const plugin = new SearchPlugin()
 * await engine.registerPlugin(plugin)
 *
 * const results = plugin.search('warrior', { limit: 5 })
 * // [{ nodeId: 'n1', score: 10, matches: [...] }, ...]
 */
export class SearchPlugin implements Plugin {
  readonly id = 'yggdrasil-search'
  readonly name = 'Search Plugin'
  readonly version = '0.1.0'
  readonly apiVersion = '1.0.0'
  readonly permissions = ['read_state'] as const

  private readonly engine = new SearchEngine()
  private engineHandle: PluginEngineHandle | null = null

  /**
   * Instala o plugin: garda engineHandle + indexa o treeDef inicial.
   */
  install(engineHandle: PluginEngineHandle, _api: PluginAPI): void {
    this.engineHandle = engineHandle
    this.engine.index(engineHandle.getTreeDef())
  }

  /**
   * Desinstala o plugin: limpa SearchEngine + descarta engineHandle.
   */
  uninstall(_engine: PluginEngineHandle): void {
    this.engine.clear()
    this.engineHandle = null
  }

  /**
   * Busca nodos que matcheen `query`. Delega a SearchEngine.search.
   *
   * @param query Texto a buscar. Vacía → `[]`.
   * @param options `fields` (default todos) + `limit` (default Infinity).
   */
  search(query: string, options?: SearchOptions): readonly SearchResult[] {
    return this.engine.search(query, options)
  }

  /**
   * Re-indexa o treeDef desde engineHandle. **Útil se o treeDef
   * cambia tras applyChanges** (sub-fase futura).
   *
   * Se non se chamou `install` previamente (engineHandle=null),
   * cero efecto (defensivo).
   */
  reindex(): void {
    if (this.engineHandle === null) return
    this.engine.index(this.engineHandle.getTreeDef())
  }

  /**
   * Expón o SearchEngine interno para casos avanzados (e.g.,
   * acceso directo a `size()`, indexación manual con TreeDef
   * custom, etc.).
   */
  getEngine(): SearchEngine {
    return this.engine
  }
}
// ── FIN: SearchPlugin ──
```

**Decisións nesta peza**:
- **`engine` privado readonly**: instancia interna; cero cambiar.
- **`engineHandle` mutable**: pode ser null antes de install, instancia
  tras install, null tras uninstall.
- **`install` non é async**: cero require await (cero IO).
  Devolve void implícito.
- **`uninstall` non é async**: cero require await.
- **`reindex` defensivo**: cero throw se engineHandle=null; só early
  return.
- **`getEngine` devolve SearchEngine class instance**: usuario pode
  chamar size(), index(), clear() directamente se require (potencia
  para casos avanzados).
- **JSDoc completo** en clase + métodos públicos.

### 5.3 — src/index.ts modificación (FIXADO)

**Estado actual** (8.6.a):
```ts
// ── INICIO: @yggdrasil-forge/search barrel ──
export { SearchEngine } from './SearchEngine.js'
export type {
  SearchField,
  SearchMatch,
  SearchOptions,
  SearchResult,
} from './types.js'
// ── FIN: @yggdrasil-forge/search barrel ──
```

**Estado esperado** (tras 8.6.b):
```ts
// ── INICIO: @yggdrasil-forge/search barrel ──
export { SearchEngine } from './SearchEngine.js'
export { SearchPlugin } from './SearchPlugin.js'
export type {
  SearchField,
  SearchMatch,
  SearchOptions,
  SearchResult,
} from './types.js'
// ── FIN: @yggdrasil-forge/search barrel ──
```

**Cambio**: engadir 1 liña con `export { SearchPlugin }`.

### 5.4 — README.md (FIXADO; substituír contido total)

**Substituír** TOTAL de `packages/search/README.md` por:

```markdown
# @yggdrasil-forge/search

Search engine for Yggdrasil Forge skill trees.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/search
\`\`\`

## Usage

### As a Plugin (recommended)

The simplest way to add search to a TreeEngine:

\`\`\`typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import { SearchPlugin } from '@yggdrasil-forge/search'

const engine = new TreeEngine(treeDef)
const search = new SearchPlugin()

await engine.registerPlugin(search)

// The plugin auto-indexes the treeDef on install.
const results = search.search('warrior', { limit: 5 })
// [
//   { nodeId: 'n1', score: 10, matches: [{ field: 'name', value: 'warrior' }] },
//   ...
// ]
\`\`\`

**API:**
- \`search(query: string, options?: SearchOptions): readonly SearchResult[]\` — perform a search.
- \`reindex(): void\` — re-index manually (useful if treeDef changes after \`applyChanges\` in a future release).
- \`getEngine(): SearchEngine\` — access the internal SearchEngine for advanced use cases.

**Permissions:** \`['read_state']\` (reads the treeDef on install).

### Standalone (advanced)

Use \`SearchEngine\` directly without the Plugin wrapper:

\`\`\`typescript
import { SearchEngine } from '@yggdrasil-forge/search'

const engine = new SearchEngine()
engine.index(treeDef)

const results = engine.search('warrior', { fields: ['name', 'tags'] })
\`\`\`

**API:**
- \`index(tree: TreeDef): void\` — index a TreeDef (clears previous index).
- \`search(query: string, options?: SearchOptions): readonly SearchResult[]\` — perform a search.
- \`clear(): void\` — clear the index.
- \`size(): number\` — number of indexed nodes.

## Algorithm

Custom substring search with per-field scoring (no external dependencies).

**Indexed fields** (lowercased on index):
- \`label\` (NodeDef.label is a \`LocalizedString\`; **all locale variants are flattened and indexed** as text).
- \`description\` (also \`LocalizedString\`; flattened).
- \`tags\`.
- \`searchKeywords\`.

**Scoring** (cumulative per match):
- \`label\` match → **+10**.
- \`searchKeywords\` match → **+7** (per keyword that matches).
- \`description\` match → **+5**.
- \`tags\` match → **+3** (per tag that matches).

**Results** are sorted by score (descending), then limited by \`options.limit\` (default Infinity).

## Options

\`\`\`typescript
interface SearchOptions {
  fields?: readonly SearchField[]  // default: all 4 fields
  limit?: number                    // default: Infinity
}

type SearchField = 'name' | 'description' | 'tags' | 'searchKeywords'

interface SearchResult {
  nodeId: string
  score: number
  matches: readonly SearchMatch[]
}

interface SearchMatch {
  field: SearchField
  value: string  // lowercased value where the match occurred
}
\`\`\`

> **Note**: \`SearchField\` uses the name \`'name'\` for backwards-compatible API surface, but internally maps to \`NodeDef.label\` (which is a \`LocalizedString\`).

## Notes

- **Case-insensitive** search by default. Both the index and queries are lowercased.
- **Empty query** returns \`[]\` (no matches).
- **LocalizedString fields** (\`label\`, \`description\`): all locale variants are flattened into a single searchable text. Matching any variant scores the node.
- **No auto-reindex** in this release. If \`treeDef\` changes after install (via \`applyChanges\`, a future feature), call \`plugin.reindex()\` manually.

## License

MIT
```

**Decisións nesta peza**:
- **Sección "As a Plugin (recommended)"** primeira: entrypoint
  principal.
- **Sección "Standalone (advanced)"**: para casos onde cero
  TreeEngine require.
- **Algoritmo + scoring documentados** claramente.
- **Note explícita** sobre `SearchField.name` mapping a `NodeDef.label`
  (lección 8.6.a L1 documentada para usuarios futuros).
- **LocalizedString handling** explicado.

### 5.5 — Tests prescritos (~10 tests)

**`__tests__/SearchPlugin.test.ts`** (NOVO):

#### Constructor + properties (2 tests)

1. **`new SearchPlugin()`** crea instance correctamente; cero throw.
2. **Plugin properties**: `id='yggdrasil-search'`, `name`, `version`,
   `apiVersion`, `permissions=['read_state']`.

#### Install behavior (2 tests)

3. **`install(engineHandle, api)` garda engineHandle**: verificar
   indirecto via reindex() funcional tras install.
4. **`install` indexa o treeDef inicial**: `plugin.getEngine().size()`
   > 0 tras install con tree non vacío.

#### Uninstall (1 test)

5. **`uninstall` limpa engine + descarta engineHandle**:
   `getEngine().size()=0` tras + reindex() é cero-op tras.

#### search() delega (2 tests)

6. **`plugin.search(query, options)`** devolve mesmo resultado que
   `plugin.getEngine().search(query, options)`.
7. **`plugin.search('')`** devolve `[]` (delegado).

#### reindex() (2 tests)

8. **`reindex()` re-indexa desde engineHandle**: simular cambio
   (cero require modificar treeDef real; suficiente verificar que
   re-chama engineHandle.getTreeDef()).
9. **`reindex()` sen install previo** (engineHandle=null): cero
   efecto, cero throw. `getEngine().size()=0`.

#### Integration con TreeEngine real (1 test)

10. **Full lifecycle**: crear TreeEngine + registerPlugin(new
    SearchPlugin()) + plugin.search('foo') funciona como
    SearchEngine.search('foo') con o mesmo treeDef.

#### LocalizedString integration (1 test bonus)

11. **TreeDef con label como Record<string, string>**: search atopa
    o nodo por matches en calquera variant locale (delegado a
    SearchEngine.flattenLocalized).

**Total: ~10-11 tests**. Post-8.6.b esperado: ~2098 → **~2108-2109
tests monorepo**.

**Fixtures**:
- TreeDef mock con nodos LocalizedString variados.
- Mock PluginAPI para tests unitarios (sen TreeEngine real).
- TreeEngine real para test de integration (#10).

### 5.6 — Cobertura prescrita

- **SearchPlugin.ts**: **100/100/100/100**.
- **SearchEngine.ts**: intacta 100/100/100/100 (xa).
- **types.ts**: cero impacto.
- **Cero regresión** noutras pezas.

### 5.7 — Cero deps novas

Verificable empíricamente: cero modificación de package.json (deps
xa engadidas en 8.6.a).

### 5.8 — Test counts esperados post-8.6.b

- **core**: 1673 tests (intactos).
- **common**: 60 tests (intactos).
- **storage**: 193 tests (intactos).
- **react**: 116 tests (intactos).
- **plugins**: 35 tests (intactos).
- **search**: 21 (SearchEngine) + ~10 (SearchPlugin) = **~31
  tests**.
- **Total monorepo**: ~2097 + ~10 = **~2107 tests**.

### 5.9 — Coordinación con sub-fases futuras

**Sub-fase futura específica** que implemente `applyChanges` en
TreeEngine (sub-fase posterior á Fase 8):
- treeDef pasará a ser modificable.
- SearchPlugin require chamar `reindex()` automáticamente cando
  treeChanged event se emita.
- **Cero modificación de SearchPlugin esperada** para isto se a
  conexión se fai via hook `afterTreeChanged` (novo hook hipotético).
- **Por agora, `reindex()` é manual**.

**Sub-fase 8.7**: ValidatorEngine + @yggdrasil-forge/validators.
**Sub-fase 8.8**: Read-only mode.

### 5.10 — Lección 8.3 L1 aplicada

T0.2 verifica empíricamente:
```bash
ls packages/search/src/SearchPlugin.ts 2>/dev/null && echo "ESCALAR" || echo "✅ libre"
```

### 5.11 — Lección 8.6.a L1 reaplicada

**SearchPlugin NON manexa LocalizedString directamente**. Toda a
lóxica de LocalizedString está xa en SearchEngine (flattenLocalized
implementado en 8.6.a). SearchPlugin **delega completamente** ao
SearchEngine.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| SearchPlugin class | clase + 4 métodos | search/src/SearchPlugin.ts | ~110 |
| SearchPlugin tests | describe blocks | tests/SearchPlugin.test.ts | ~180 |
| src/index.ts update | +1 export | src/index.ts | +2 modif |
| README.md substitution | sección completa | README.md | ~120 (substituír) |
| .changeset | YAML+md | .changeset/search-plugin-8-6-b.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~30 |

**Total estimado**: ~450 liñas (incluído ~180 de tests + ~120 de
README).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (3)**:
- `packages/search/src/SearchPlugin.ts`
- `packages/search/__tests__/SearchPlugin.test.ts`
- `.changeset/search-plugin-8-6-b.md`

**MODIFICADOS (3)**:
- `packages/search/src/index.ts`
- `packages/search/README.md`
- `CHANGELOG.md`

**Total: 6 ficheiros tocados**.

**NON deben aparecer cambios en**:
- `packages/search/src/SearchEngine.ts` (intacto desde 8.6.a).
- `packages/search/src/types.ts` (intacto desde 8.6.a).
- `packages/search/__tests__/SearchEngine.test.ts` (intacto;
  21 tests).
- `packages/search/package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts` (scaffold intacto).
- Outros paquetes (core/common/storage/react/plugins).
- Tests existentes (~2097 totais).
- `package.json` root, configs root.
- `pnpm-lock.yaml` (cero deps novas → cero require update).
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en SearchPlugin clase + métodos públicos.

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Patrón coherente con HistoryPlugin/DebugPlugin** (estructura,
JSDoc, marcadores).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/search/src/SearchEngine.ts` (intacto desde
  8.6.a).
- ❌ Modificar `packages/search/src/types.ts` (intacto; SearchOptions
  / SearchResult xa tipados).
- ❌ Modificar `packages/search/__tests__/SearchEngine.test.ts`
  (intacto; 21 tests).
- ❌ Modificar `packages/search/package.json` (cero deps novas).
- ❌ Modificar configs do paquete (tsconfig, tsup, vitest).
- ❌ Modificar outros paquetes (core/common/storage/react/plugins).
- ❌ Modificar **calquera test existente** (~2097 totais).
- ❌ Engadir métodos extras non prescritos en SearchPlugin (e.g.,
  cero `setOptions`, cero `getStats`, etc.).
- ❌ Engadir `SearchPluginOptions` interface en 8.6.b (DIFERIDO).
- ❌ Implementar auto-reindex via hooks (DIFERIDO; sub-fase futura
  cando applyChanges exista).
- ❌ Manexar LocalizedString en SearchPlugin (delegado a SearchEngine).
- ❌ Engadir TreeEngine import directo en SearchPlugin (só via
  Plugin/PluginAPI/PluginEngineHandle).
- ❌ Engadir ErrorCodes novos (cero require).
- ❌ Engadir deps de npm externas.
- ❌ Usar `!` non-null assertions.
- ❌ Modificar pnpm-lock.yaml (cero deps novas).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa + leccións aplicadas

**T0.1** — `git status` limpo. `git log -1` mostra `22b0204` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar SearchPlugin.ts non existe:
ls packages/search/src/SearchPlugin.ts 2>/dev/null && echo "ESCALAR: xa existe" || echo "✅ libre"

# Confirmar SearchEngine.ts existe + intacto (referencia):
ls packages/search/src/SearchEngine.ts
wc -l packages/search/src/SearchEngine.ts
# Esperado: ~140 liñas

# Confirmar Plugin + PluginAPI + PluginEngineHandle dispoñibles:
grep -E "Plugin|PluginAPI|PluginEngineHandle" packages/core/src/index.ts | head -5

# Confirmar SearchEngine + types xa exportados desde @search:
cat packages/search/src/index.ts

# Confirmar README actual placeholder (a substituír):
head -20 packages/search/README.md
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/core build
pnpm turbo run typecheck --force                        # 23/23
pnpm --filter @yggdrasil-forge/search test --force      # 21 tests (SearchEngine)
pnpm --filter @yggdrasil-forge/core test --force        # 1673 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear SearchPlugin.ts

Aplicar §5.2 literal.

### T2 — Modificar src/index.ts

Aplicar §5.3 literal. Engadir liña `export { SearchPlugin } from
'./SearchPlugin.js'` despois do export de SearchEngine.

### T3 — Verificación typecheck

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/search build               # build OK
```

### T4 — Crear tests SearchPlugin.test.ts

Aplicar §5.5 literal (~10-11 tests).

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/search test --force       # 21 + 10 = ~31 tests
pnpm --filter @yggdrasil-forge/core test --force         # 1673 tests INTACTOS
```

### T5 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/search exec vitest run --coverage 2>&1 | \
  grep -E "SearchPlugin|SearchEngine|^All files" | head -5
# Esperado:
#   SearchEngine.ts: 100/100/100/100 (intacto)
#   SearchPlugin.ts: 100/100/100/100
```

### T6 — Substituír README.md

Aplicar §5.4 literal. **Substituír TOTAL** o contido de
`packages/search/README.md`.

### T7 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/search build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/search/src/SearchPlugin.ts \
  packages/search/__tests__/SearchPlugin.test.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T8 — Verificación final

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm turbo run test --force                               # tódolos paquetes
# Esperado:
#   core: 1673 (intactos)
#   common: 60 (intactos)
#   storage: 193 (intactos)
#   react: 116 (intactos)
#   plugins: 35 (intactos)
#   search: 21 + ~10 = ~31
```

### T9 — Changeset + CHANGELOG + commit + push

`.changeset/search-plugin-8-6-b.md`:
```
---
'@yggdrasil-forge/search': minor
---

feat(search): add SearchPlugin (Plugin wrapper) + README update (sub-phase 8.6.b)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **`SearchPlugin`** clase en `@yggdrasil-forge/search` que integra
  SearchEngine como un Plugin do TreeEngine. Implementa Plugin
  interface con permissions `['read_state']`:
  - Constructor sen opts.
  - \`install(engineHandle, api)\`: garda engineHandle + indexa o
    treeDef inicial automáticamente.
  - \`uninstall(engine)\`: limpa SearchEngine + descarta engineHandle.
  - \`search(query, options?)\`: delega a SearchEngine.search.
  - \`reindex()\`: re-indexa manualmente desde engineHandle (útil
    cando treeDef cambia tras applyChanges en sub-fase futura).
    Cero efecto se install non se chamou previamente (defensivo).
  - \`getEngine(): SearchEngine\`: expón SearchEngine interno para
    casos avanzados.
- Actualizado \`src/index.ts\` con export de SearchPlugin.

### Changed
- Substituído \`README.md\` con sección Search completa: SearchPlugin
  (entrypoint principal recomendado) + SearchEngine (uso avanzado
  standalone) + algoritmo + LocalizedString note.

### Note
- Sub-fase 8.6.b ÚLTIMA das 2 sub-sub-fases de 8.6 (SearchPlugin
  + @yggdrasil-forge/search). **🎯 FASE 8.6 PECHADA**.
- **SearchPlugin é unha wrapper class** sobre SearchEngine:
  - Adapta a API ao Plugin interface do TreeEngine.
  - Indexa automáticamente o treeDef inicial en \`install\`.
  - Permite reindex manual cando treeDef cambie (futuras versións).
- **Cero modificación de SearchEngine.ts** (intacto desde 8.6.a).
- **LocalizedString handling** delegado a SearchEngine (lección
  8.6.a L1 aplicada): SearchPlugin NON manexa LocalizedString
  directamente.
- **DIFERIDOS** en 8.6.b:
  - **\`SearchPluginOptions\` interface** (constructor sen opts en
    8.6.b; sub-fase futura pode engadir \`autoIndex\` ou similar).
  - **Auto-reindex via hooks** (require \`applyChanges\` +
    \`treeChanged\` event; sub-fase futura).
  - **Fuzzy matching / stemming** (algoritmo simple; sub-fase
    futura pode estender SearchEngine).
- **Cero modificación de packages/core/, packages/common/,
  packages/storage/, packages/react/, packages/plugins/** ou
  outros.
- **Cero modificación de calquera test existente** (~2097 totais
  intactos).
- **Cero deps de npm externas engadidas**.
- **Cero ErrorCodes novos** (SearchPlugin é fire-and-forget).
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
  SearchPlugin.ts non existe antes de crear.
- **Lección 8.6.a L1 documentada** en README: SearchField.name
  mapea internamente a NodeDef.label (LocalizedString flattened).
- **🎯 FASE 8.6 COMPLETA**: SearchEngine standalone (8.6.a) +
  SearchPlugin (8.6.b). 2 sub-fases pendentes na Fase 8 (8.7
  ValidatorEngine, 8.8 Read-only mode).
```

Commit Conventional:
`feat(search): add SearchPlugin (Plugin wrapper) + README update (sub-phase 8.6.b)`

Push directo a `origin/main` (base `22b0204`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.6.b — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 22b0204)
✅ SearchPlugin NOVO en packages/search/src/:
   - class implementing Plugin interface
   - permissions: ['read_state']
   - install garda engineHandle + indexa treeDef inicial
   - uninstall limpa engine + descarta engineHandle
   - API: search() delega, reindex() manual, getEngine() expón interno
✅ src/index.ts actualizado con export SearchPlugin
✅ README.md substituído con sección Search completa:
   - Usage As a Plugin (entrypoint principal recomendado)
   - Usage Standalone (uso avanzado SearchEngine)
   - Algorithm + scoring documentado
   - LocalizedString note (lección 8.6.a L1)
✅ T0.2 verificación empírica (lección 8.3 L1):
   - SearchPlugin.ts non existe (libre)
   - SearchEngine.ts intacto (referencia)
   - Plugin types exportados desde @core
✅ T3 build + typecheck: 23/23 paquetes
✅ T4 verificación tests:
   - SearchPlugin: ~10 tests novos pasan
   - SearchEngine: 21 tests INTACTOS
   - core: 1673 tests INTACTOS
✅ T5 cobertura SearchPlugin: 100/100/100/100
✅ CERO modificación de SearchEngine.ts (intacto)
✅ CERO modificación de types.ts (intacto)
✅ CERO modificación de scaffold (package.json, configs intactos)
✅ CERO modificación de outros paquetes
✅ CERO modificación de calquera test existente (~2097 totais)
✅ CERO deps de npm externas engadidas
✅ CERO ErrorCodes novos
✅ Tests: search 21 + ~10 = ~31 | core: 1673 | common: 60 |
   storage: 193 | react: 116 | plugins: 35 = ~2107 monorepo
✅ Typecheck: 23/23 | Lint: 0/0 | Format: 0/0
✅ Build paquete search: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.6.b ÚLTIMA das 2 de 8.6.
   - 🎯 FASE 8.6 PECHADA: SearchEngine + SearchPlugin completos.
   - 48 sub-fases consecutivas sen rollback.
   - 2 sub-fases pendentes (8.7 ValidatorEngine, 8.8 Read-only mode).
   - SearchPlugin é wrapper sobre SearchEngine; cero lóxica nova
     (delegation pattern).
   - Auto-reindex via hooks DIFERIDO (require applyChanges futuro).
   - SearchPluginOptions DIFERIDO (constructor sen opts en 8.6.b).
✅ Changeset minor (search) + nova [Unreleased]
✅ git status pre-commit: 6 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.7 (ValidatorEngine + @yggdrasil-forge/validators).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.6.b. **ÚLTIMA das 2 sub-sub-fases de 8.6**.
Engade SearchPlugin completo reutilizando SearchEngine de 8.6.a:
clase implementando Plugin interface con permissions ['read_state'],
install auto-indexa, uninstall cleanup, API delegation (search,
reindex, getEngine). README substituído con sección Search completa
incluído nota sobre lección 8.6.a L1 (LocalizedString handling).
**Cero modificación de SearchEngine.ts**. 6 ficheiros tocados (3
NOVOS + 3 MODIFICADOS). ~10 tests novos. Risco BAIXO-MEDIO. Lección
8.3 L1 aplicada con rigor en T0.2.*

*🎯 **FASE 8.6 PECHADA TRAS 8.6.b**: SearchEngine standalone (8.6.a)
+ SearchPlugin (8.6.b) completos. 2 sub-fases pendentes na Fase 8
(8.7 ValidatorEngine, 8.8 Read-only mode).*
