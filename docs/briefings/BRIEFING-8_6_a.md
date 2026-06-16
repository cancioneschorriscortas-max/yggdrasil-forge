# BRIEFING — SUB-FASE 8.6.a de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA das 2 sub-sub-fases de 8.6** (SearchPlugin +
> @yggdrasil-forge/search). 8.6.a entrega:
> 1. **Actualizar scaffold** `@yggdrasil-forge/search` xa existente:
>    - package.json: engadir dependencies (@common, @core).
>    - tsup.config.ts: aplicar DT-14 fix (composite:false).
>    - tsconfig.json: engadir references a @common + @core.
> 2. **SearchEngine** standalone (clase con index/search/clear/size).
>    Algoritmo custom simple (substring + scoring por campo).
> 3. **Substituír placeholders**: src/index.ts (VERSION → exports
>    reais), smoke.test.ts (→ SearchEngine.test.ts via git mv).
>
> **8.6.b (próxima)** engadirá SearchPlugin (Plugin interface +
> integration con TreeEngine via plugin system).
>
> **Decisións confirmadas polo director**:
> - **Algoritmo custom simple** (cero deps externas tipo Lunr/FlexSearch).
> - **Scoring por campo**: name=10, searchKeywords=7, description=5,
>   tags=3.
> - **Múltiples matches no mesmo nodo suman scores**.
> - **Sort por score descendente**.
> - **Limit configurable** (default Infinity).
> - **Fields configurable** (default todos: name/description/tags/searchKeywords).
> - **Case-insensitive sempre** (decisión simplificadora; cero
>   `caseSensitive` option — confusa por mor da indexación lowercase).
> - **Query vacía devolve `[]`** (cero matches; semánticamente
>   "buscar nada non atopa nada").
> - **Auto-reindex DIFERIDO** a sub-fase futura cando applyChanges
>   exista; en 8.6 treeDef é inmutable tras construción.
> - **SearchEngine standalone exportado** (usable sen Plugin).
>   SearchPlugin será o entrypoint principal en 8.6.b.
> - **Git mv smoke.test.ts → SearchEngine.test.ts** para preservar
>   history.
> - **README update DIFERIDO** a 8.6.b (entrypoint principal será
>   SearchPlugin).
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente o estado
> actual do scaffold @search (xa verificado polo director).
>
> 8.6.b, 8.7, 8.8 DIFERIDOS.

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
- Pushed: `═══ SUB-FASE 8.6.a — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.6.a — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica en types/SearchOptions.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: SearchEngine.ts chega a **100/100/100/100**.
Cero regresión na baseline post-8.5.b.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: cero modificación de
calquera test existente fora do `git mv` de smoke.test.ts (placeholder
que substitúe por SearchEngine.test.ts real). Tódolos ~2077 tests
previos en outros paquetes (core/common/storage/react/plugins)
deben pasar intactos.

**0.14 — pnpm install OBRIGATORIO** tras modificar package.json
(engadir deps). Sen iso, tests fallan con "cannot find module
'@yggdrasil-forge/common'".

**0.15 — `git mv` para renomear smoke.test.ts**: preserva git
history. Sintaxe:
```bash
git mv packages/search/__tests__/smoke.test.ts packages/search/__tests__/SearchEngine.test.ts
```
Despois reemplazar o contido (cero necesario o original; era
placeholder).

**0.16 — Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
que SearchEngine.ts non existe + smoke.test.ts é placeholder
(verificado polo director).

---

## 1. IDENTIFICACIÓN

Sub-fase **8.6.a** de Yggdrasil Forge. **PRIMEIRA das 2 sub-sub-fases
de 8.6** (SearchPlugin + @search). Scaffold updates + SearchEngine
standalone.

**Pezas (4 grupos)**:

**Grupo A — Actualizar scaffold @search (3 MODIFICADOS)**:
1. `packages/search/package.json` (engadir dependencies @common +
   @core; verificar scripts coherentes).
2. `packages/search/tsup.config.ts` (aplicar DT-14 fix:
   `dts.compilerOptions.composite:false`).
3. `packages/search/tsconfig.json` (engadir references a @common
   + @core).

**Grupo B — SearchEngine + types (3 NOVOS)**:
4. `packages/search/src/types.ts` (NOVO; SearchOptions, SearchResult,
   SearchMatch, IndexedNode internal).
5. `packages/search/src/SearchEngine.ts` (NOVO; class).
6. `packages/search/src/index.ts` (**SUBSTITUÍR** placeholder
   VERSION; engadir exports).

**Grupo C — Tests (1 git mv + reemplazar contido)**:
7. **`git mv`** `__tests__/smoke.test.ts` →
   `__tests__/SearchEngine.test.ts`.
8. **Substituír contido** de SearchEngine.test.ts (~20 tests).

**Grupo D — Housekeeping**:
9. `.changeset/search-engine-8-6-a.md` (NOVO).
10. `CHANGELOG.md` (MODIFICADO).

**Total: ~10 ficheiros tocados** (3 NOVOS + 5 MODIFICADOS + 1
renomeo).

**Cero modificación de**:
- `packages/search/README.md` (DIFERIDO a 8.6.b).
- `packages/search/vitest.config.ts` (intacto; xa funciona).
- `packages/plugins/`, `packages/core/`, `packages/common/`,
  outros paquetes.
- Tests existentes (~2077 totais).
- `package.json` root, configs root.
- MASTER.md.

**CERO deps de npm externas engadidas**. Só **@yggdrasil-forge/common**
e **@yggdrasil-forge/core** como dependencies internas (workspace).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `b8576c7`, verificada
empíricamente)**.

### MASTER §28 (literal)

```typescript
interface SearchEngine {
  index(tree: TreeDef): void
  search(query: string, options?: SearchOptions): SearchResult[]
  clear(): void
}
```

**Decisión do director**: estender con `size(): number` para
inspección + tests. Cero rotura.

### NodeDef campos relevantes para search (verificados)

```ts
interface NodeDef {
  // ...
  readonly tags?: string[]
  readonly searchKeywords?: string[]
  // ...
  // (name e description son standard NodeDef fields)
}
```

**4 campos indexados**: `name`, `description`, `tags`, `searchKeywords`.

### Scoring decidido (FIXADO)

| Campo | Score |
|---|---|
| name | **10** (highest; matches no nome son máis significativos) |
| searchKeywords | **7** |
| description | **5** |
| tags | **3** |

Múltiples matches no mesmo nodo **suman scores**. Sort descendente
final.

### Estado scaffold actual (verificado)

```
packages/search/
├── README.md                     (intacto en 8.6.a; actualizarase en 8.6.b)
├── __tests__/
│   └── smoke.test.ts             (PLACEHOLDER; verificar VERSION constant)
├── package.json                  (sen dependencies de runtime; require update)
├── src/
│   └── index.ts                  (PLACEHOLDER: solo `export const VERSION`)
├── tsconfig.json                 (cero references; require update)
├── tsup.config.ts                (SEN DT-14 fix; require update)
└── vitest.config.ts              (OK; intacto)
```

**Verificacións empíricas en T0.2**:
- `cat packages/search/src/index.ts` mostra placeholder.
- `cat packages/search/__tests__/smoke.test.ts` mostra placeholder
  (verifica VERSION).
- `cat packages/search/tsup.config.ts` mostra `dts: true` (cero fix
  DT-14).
- `cat packages/search/package.json` mostra cero dependencies.

### Decisión do director sobre case-sensitivity

**Eliminada**: case-insensitive sempre. Razóns:
- Indexar lowercase + comparar lowercase → coherente.
- `caseSensitive: true` requeriría almacenar valores originais
  ademáis dos lowercase. Complica scoring.
- Sub-fase futura pode estender se require.

### Decisión sobre query vacía

`search('')` devolve **`[]`** (cero matches). Razóns:
- `''.includes('')` é `true` para tódolos values → matches falsos.
- Semánticamente "buscar nada non atopa nada".
- Cero ambigüidade.

### Decisión sobre auto-reindex

**DIFERIDO**: en 8.6, treeDef é **inmutable** tras construción do
TreeEngine. Cero `applyChanges` aínda implementado (sub-fase
futura). Polo tanto **cero auto-reindex** require en 8.6.

8.6.b conectará SearchPlugin que chama `engine.index(getTreeDef())`
en `install()` (única vez).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `b8576c7` (sub-fase 8.5.b — DebugPlugin).
- 1673 core + 60 common + 193 storage + 116 react + 35 plugins =
  **~2077 tests** monorepo limpo.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 50 ErrorCodes existentes.
- **Cadea 46 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Actualizar o scaffold do paquete `@yggdrasil-forge/search` (package.json
con deps @common+@core; tsup.config.ts con DT-14 fix; tsconfig.json
con references); engadir **SearchEngine** clase standalone con API
`index(tree) / search(query, options?) / clear() / size()` usando
algoritmo custom simple (substring case-insensitive con scoring por
campo: name=10, searchKeywords=7, description=5, tags=3; múltiples
matches suman scores; sort descendente; limit configurable);
**SearchOptions** mínimo `{ fields?, limit? }` (cero caseSensitive
por simplificación); **SearchResult** `{ nodeId, score, matches }`
con `SearchMatch { field, value }`; query vacía devolve `[]`;
substituír placeholders en src/index.ts (VERSION → exports reais)
e renomear `__tests__/smoke.test.ts` → `__tests__/SearchEngine.test.ts`
via `git mv` (preserva history) con tests reais (~20). **Cero
modificación** de README (DIFERIDO a 8.6.b), outros paquetes, ou
calquera test existente noutros paquetes.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (3)**:
- `packages/search/src/types.ts` (~50 liñas).
- `packages/search/src/SearchEngine.ts` (~140 liñas).
- `.changeset/search-engine-8-6-a.md` (NOVO).

**MODIFICADOS (5)**:
- `packages/search/package.json` (engadir dependencies).
- `packages/search/tsup.config.ts` (DT-14 fix).
- `packages/search/tsconfig.json` (engadir references).
- `packages/search/src/index.ts` (substituír placeholder).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**RENOMEADO + REEMPLAZADO (1)**:
- `packages/search/__tests__/smoke.test.ts` → `SearchEngine.test.ts`
  via `git mv` + substituír contido (~280 liñas; ~20 tests).

**Total: 10 ficheiros tocados** (3 NOVOS + 5 MODIFICADOS + 1
renomeo).

**Cero modificación de**:
- `packages/search/README.md` (DIFERIDO a 8.6.b).
- `packages/search/vitest.config.ts` (intacto).
- Outros paquetes (`core/common/storage/react/plugins`).
- Tests existentes (~2077 totais).
- `package.json` root, configs root.
- MASTER.md.

### 5.2 — package.json (FIXADO)

**Substituír** `packages/search/package.json` por:

```json
{
  "name": "@yggdrasil-forge/search",
  "version": "0.0.0",
  "description": "Search engine for Yggdrasil Forge skill trees",
  "license": "MIT",
  "author": "Agarfal",
  "homepage": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git",
    "directory": "packages/search"
  },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@yggdrasil-forge/common": "workspace:*",
    "@yggdrasil-forge/core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "vitest": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "typescript": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  },
  "engines": {
    "node": ">=22"
  }
}
```

**Cambios vs actual** (probable):
- Engadir `dependencies` con @common + @core (workspace).
- Verificar/normalizar devDependencies + scripts (probable que xa
  estean OK do scaffold original).

### 5.3 — tsup.config.ts (FIXADO; DT-14 fix)

**Substituír** `packages/search/tsup.config.ts` por:

```ts
// ── INICIO: tsup config para @yggdrasil-forge/search ──
// DT-14 fix aplicado: composite:false necesario porque @search
// depende transitivamente de @common (composite:true).
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  tsconfig: 'tsconfig.json',
})
// ── FIN: tsup config ──
```

### 5.4 — tsconfig.json (FIXADO)

**Substituír** `packages/search/tsconfig.json` por:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src/**/*", "__tests__/**/*"],
  "references": [
    { "path": "../common" },
    { "path": "../core" }
  ]
}
```

### 5.5 — src/types.ts (NOVO; FIXADO)

```ts
// ── INICIO: SearchEngine types ──

/**
 * Campos do NodeDef que SearchEngine indexa e busca.
 */
export type SearchField = 'name' | 'description' | 'tags' | 'searchKeywords'

/**
 * Opcións para SearchEngine.search().
 */
export interface SearchOptions {
  /**
   * Campos onde buscar. Default: todos os 4 campos
   * (name, description, tags, searchKeywords).
   */
  readonly fields?: readonly SearchField[]

  /**
   * Límite máximo de resultados.
   * Default: Infinity (cero limit).
   */
  readonly limit?: number
}

/**
 * Match individual dentro dun SearchResult.
 */
export interface SearchMatch {
  /** Campo do nodo onde houbo match. */
  readonly field: SearchField
  /** Valor (lowercased) do campo onde houbo match. */
  readonly value: string
}

/**
 * Resultado individual dunha busca.
 */
export interface SearchResult {
  /** Id do nodo que matcheou. */
  readonly nodeId: string
  /**
   * Score acumulado. Maior = mellor match.
   * Scoring por campo:
   * - name: +10 por match.
   * - searchKeywords: +7 por keyword que matcheou.
   * - description: +5 por match.
   * - tags: +3 por tag que matcheou.
   * Múltiples matches no mesmo nodo suman scores.
   */
  readonly score: number
  /** Lista de matches específicos dentro deste nodo. */
  readonly matches: readonly SearchMatch[]
}

// ── FIN: SearchEngine types ──
```

### 5.6 — src/SearchEngine.ts (NOVO; FIXADO)

```ts
// ── INICIO: SearchEngine ──
// Motor de busca custom para Yggdrasil Forge skill trees.
//
// **Sub-fase 8.6.a**: implementación standalone (cero Plugin
// integration aínda). Algoritmo simple: substring case-insensitive
// con scoring por campo.
//
// **Algoritmo**:
// 1. index(tree): garda lowercased name/description/tags/searchKeywords
//    de cada NodeDef.
// 2. search(query, options): substring match en campos elixidos +
//    suma scores por campo + sort descendente + apply limit.
// 3. Query vacía devolve [].
//
// **DIFERIDO a sub-fases futuras**:
// - Auto-reindex (require applyChanges + treeChanged event).
// - Fuzzy matching / stemming.
// - caseSensitive option.

import type { TreeDef } from '@yggdrasil-forge/core'
import type { SearchField, SearchMatch, SearchOptions, SearchResult } from './types.js'

interface IndexedNode {
  readonly name: string
  readonly description: string
  readonly tags: readonly string[]
  readonly searchKeywords: readonly string[]
}

const ALL_FIELDS: readonly SearchField[] = [
  'name',
  'description',
  'tags',
  'searchKeywords',
]

const SCORE_BY_FIELD: Readonly<Record<SearchField, number>> = {
  name: 10,
  searchKeywords: 7,
  description: 5,
  tags: 3,
}

/**
 * Motor de busca custom para skill trees.
 *
 * Indexa lowercased name/description/tags/searchKeywords de cada
 * NodeDef. Busca substring case-insensitive con scoring acumulado.
 *
 * @example
 * const engine = new SearchEngine()
 * engine.index(treeDef)
 * const results = engine.search('warrior', { limit: 5 })
 * // [{ nodeId: 'n1', score: 10, matches: [{ field: 'name', value: 'warrior' }] }, ...]
 */
export class SearchEngine {
  private readonly indexed = new Map<string, IndexedNode>()

  /**
   * Indexa un TreeDef. Limpa o index previo antes.
   */
  index(tree: TreeDef): void {
    this.indexed.clear()
    for (const node of tree.nodes) {
      this.indexed.set(node.id, {
        name: (node.name ?? '').toLowerCase(),
        description: (node.description ?? '').toLowerCase(),
        tags: (node.tags ?? []).map((t) => t.toLowerCase()),
        searchKeywords: (node.searchKeywords ?? []).map((k) => k.toLowerCase()),
      })
    }
  }

  /**
   * Busca nodos que matcheen `query` (substring case-insensitive).
   *
   * @param query Texto a buscar. Se vacía, devolve `[]`.
   * @param options `fields` (default todos) + `limit` (default Infinity).
   */
  search(query: string, options?: SearchOptions): readonly SearchResult[] {
    // Query vacía: cero matches (decisión do director).
    if (query.length === 0) return []

    const normalizedQuery = query.toLowerCase()
    const fields = options?.fields ?? ALL_FIELDS
    const limit = options?.limit ?? Number.POSITIVE_INFINITY

    const results: SearchResult[] = []

    for (const [nodeId, idx] of this.indexed) {
      const matches: SearchMatch[] = []
      let score = 0

      if (fields.includes('name') && idx.name.includes(normalizedQuery)) {
        matches.push({ field: 'name', value: idx.name })
        score += SCORE_BY_FIELD.name
      }
      if (
        fields.includes('description') &&
        idx.description.includes(normalizedQuery)
      ) {
        matches.push({ field: 'description', value: idx.description })
        score += SCORE_BY_FIELD.description
      }
      if (fields.includes('tags')) {
        for (const tag of idx.tags) {
          if (tag.includes(normalizedQuery)) {
            matches.push({ field: 'tags', value: tag })
            score += SCORE_BY_FIELD.tags
          }
        }
      }
      if (fields.includes('searchKeywords')) {
        for (const kw of idx.searchKeywords) {
          if (kw.includes(normalizedQuery)) {
            matches.push({ field: 'searchKeywords', value: kw })
            score += SCORE_BY_FIELD.searchKeywords
          }
        }
      }

      if (matches.length > 0) {
        results.push({ nodeId, score, matches })
      }
    }

    // Sort por score descendente:
    results.sort((a, b) => b.score - a.score)

    // Apply limit:
    if (limit === Number.POSITIVE_INFINITY) return results
    return results.slice(0, limit)
  }

  /**
   * Limpa o index.
   */
  clear(): void {
    this.indexed.clear()
  }

  /**
   * Devolve o número de nodos indexados.
   */
  size(): number {
    return this.indexed.size
  }
}
// ── FIN: SearchEngine ──
```

**Decisións nesta peza**:
- **Map interno**: lookup O(1) por id; iteración orde de inserción.
- **`ALL_FIELDS` constante**: cero alocación repetida do array.
- **`SCORE_BY_FIELD` constante**: Readonly<Record>; cero magic numbers
  spread.
- **Indexar lowercase sempre**: simplificador (cero caseSensitive).
- **Early return en query vacía**: `[]` constante.
- **`results.sort(...)` mutates in-place**: aceptable porque é array
  local; devolvemos readonly conversión implícita.
- **Limit: `slice(0, limit)` ou direct return**: optimización para
  Infinity.

### 5.7 — src/index.ts (FIXADO; substituír placeholder)

**Substituír** TOTAL de `packages/search/src/index.ts` por:

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

**Cero `VERSION` constant** (placeholder eliminada).

### 5.8 — Tests prescritos (~20 tests)

**Procedemento**:
```bash
git mv packages/search/__tests__/smoke.test.ts packages/search/__tests__/SearchEngine.test.ts
```

**Despois substituír contido** de `SearchEngine.test.ts`:

#### Constructor + size (3 tests)

1. **`new SearchEngine()`** crea engine con `size()=0`.
2. **`index(tree)` con cero nodos**: `size()=0`.
3. **`index(tree)` con 3 nodos**: `size()=3`.

#### Index + clear (3 tests)

4. **`index(tree)` con múltiples nodos seguido**: index actual ten
   só os do segundo tree (clear automático).
5. **`clear()`** vacía o index (size=0 tras).
6. **`index(tree)` con campos undefined**: cero falla; size correcto.

#### Search empty (2 tests)

7. **`search('')`** devolve `[]` (query vacía).
8. **`search('xyz')` en engine vacío**: devolve `[]`.

#### Search por campo (5 tests)

9. **Match en name**: score=10; matches=[{ field:'name', value:... }].
10. **Match en description**: score=5.
11. **Match en tag**: score=3 (un tag).
12. **Match en searchKeyword**: score=7.
13. **Cero match**: devolve `[]`.

#### Score acumulado (2 tests)

14. **Match en múltiples campos no mesmo nodo**: suma scores
    (e.g., name+description → 15).
15. **Múltiples tags matcheen**: suma 3 por cada tag.

#### Sort + limit (2 tests)

16. **Sort descendente por score**: 3 nodos con scores diferentes
    → orden 10, 7, 5 (ou similar).
17. **`limit: 2`** retorna só 2 resultados (os 2 máis altos).

#### Fields option (1 test)

18. **`fields: ['name']`** só busca en name, ignora outros campos.

#### Case-insensitive (1 test)

19. **Query 'WARRIOR'** matchea nodos con 'warrior' (case-insensitive).

#### Re-index (1 test)

20. **`index(tree1)` + `index(tree2)` con nodos diferentes**:
    `search()` só atopa os de tree2.

**Total: ~20 tests**. Esperado: 1 (smoke.test.ts placeholder
borrado) → 20 (SearchEngine.test.ts novo).

**Fixtures**: TreeDef mock con array de nodes que teñen name/description/tags/searchKeywords variados.

### 5.9 — Cobertura prescrita

- **SearchEngine.ts**: **100/100/100/100**.
- **types.ts**: cero impacto (tipos puros).
- **Resto**: sen regresión.

### 5.10 — Cero deps novas externas

Verificable empíricamente: cero modificación de package.json
externos. **Engadir** dependencies workspace internas
(@common + @core).

### 5.11 — Test counts esperados post-8.6.a

- **core**: 1673 tests (intactos).
- **common**: 60 tests (intactos).
- **storage**: 193 tests (intactos).
- **react**: 116 tests (intactos).
- **plugins**: 35 tests (intactos).
- **search**: ~20 tests novos (substituíu 1 smoke placeholder).
- **Total monorepo**: 2077 + ~19 = **~2096 tests**.

### 5.12 — Coordinación con 8.6.b

**8.6.b** engadirá:
- `packages/search/src/SearchPlugin.ts` (NOVO; class implementing
  Plugin).
- `packages/search/__tests__/SearchPlugin.test.ts` (NOVO; ~10 tests).
- Actualizar `src/index.ts` (+export SearchPlugin).
- Actualizar `README.md` con sección SearchPlugin (entrypoint principal).
- 1 ErrorCode novo posible? **Decisión preliminar**: cero require
  (SearchPlugin é fire-and-forget; cero erros funcionais).

**Cero modificación esperada** de SearchEngine.ts en 8.6.b.

### 5.13 — Lección 8.3 L1 aplicada

T0.2 verifica empíricamente:
```bash
# SearchEngine.ts non existe:
ls packages/search/src/SearchEngine.ts 2>/dev/null && echo "ESCALAR" || echo "✅"

# Confirmar placeholders actuais:
cat packages/search/src/index.ts | grep VERSION
cat packages/search/__tests__/smoke.test.ts | head -10

# Confirmar tsup.config.ts SEN DT-14 fix:
grep "composite" packages/search/tsup.config.ts
# Esperado: cero matches (ou dts: true sen options)
```

### 5.14 — pnpm install OBRIGATORIO

**Tras modificar packages/search/package.json**:
```bash
pnpm install
```

**Sen iso, tests fallan** con "cannot find module '@yggdrasil-forge/common'"
porque pnpm non sabe que @search agora ten deps a @common + @core.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| package.json | JSON update | search/package.json | ~50 (substituír) |
| tsup.config.ts | TS config | search/tsup.config.ts | ~20 (substituír; DT-14 fix) |
| tsconfig.json | JSON update | search/tsconfig.json | ~12 (substituír; +references) |
| types.ts | TS interface | search/src/types.ts | ~50 |
| SearchEngine.ts | TS class | search/src/SearchEngine.ts | ~140 |
| src/index.ts | TS barrel | search/src/index.ts | ~10 (substituír placeholder) |
| SearchEngine.test.ts | tests | search/tests/SearchEngine.test.ts | ~280 (substituír smoke.test.ts) |
| .changeset | YAML+md | .changeset/search-engine-8-6-a.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~30 |

**Total estimado**: ~600 liñas (incluído ~280 de tests).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (3)**:
- `packages/search/src/types.ts`
- `packages/search/src/SearchEngine.ts`
- `.changeset/search-engine-8-6-a.md`

**MODIFICADOS (5)**:
- `packages/search/package.json`
- `packages/search/tsup.config.ts`
- `packages/search/tsconfig.json`
- `packages/search/src/index.ts`
- `CHANGELOG.md`

**RENOMEADO + REEMPLAZADO (1)**:
- `packages/search/__tests__/smoke.test.ts` →
  `packages/search/__tests__/SearchEngine.test.ts` (via git mv +
  substituír contido).

**Total: 10 ficheiros tocados**.

**Cambios secundarios esperados** (de pnpm install):
- `pnpm-lock.yaml`: actualízase para reflexar novas deps workspace.
  **Incluír no commit**.

**NON deben aparecer cambios en**:
- `packages/search/README.md` (DIFERIDO a 8.6.b).
- `packages/search/vitest.config.ts` (intacto).
- Calquera outro ficheiro en outros paquetes.
- Tests existentes (~2077 noutros paquetes).
- `package.json` root, configs root.
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en SearchEngine clase + métodos públicos.

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Constants como `const` con `as const` ou `Readonly<>`** para
inmutabilidade explícita.

**Patrón coherente con HistoryPlugin/DebugPlugin** de 8.5
(estructura, JSDoc, marcadores).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/search/README.md` (DIFERIDO a 8.6.b).
- ❌ Modificar `packages/search/vitest.config.ts` (intacto; xa
  funciona).
- ❌ Modificar outros paquetes (core/common/storage/react/plugins).
- ❌ Modificar **calquera test existente** noutros paquetes
  (~2077 totais).
- ❌ Engadir deps de npm externas (Lunr, FlexSearch, etc.).
- ❌ Implementar SearchPlugin en 8.6.a (DIFERIDO a 8.6.b).
- ❌ Engadir `caseSensitive` option (DIFERIDO; simplificación).
- ❌ Implementar fuzzy matching, stemming, ou regex (sub-fases
  futuras).
- ❌ Implementar auto-reindex (DIFERIDO; treeDef inmutable
  actualmente).
- ❌ Modificar TreeEngine.ts (cero require).
- ❌ Engadir ErrorCodes novos (cero require en 8.6.a).
- ❌ Modificar `package.json` root.
- ❌ Modificar configs root.
- ❌ Olvidar `pnpm install` tras modificar package.json.
- ❌ Olvidar `git mv` para renomear smoke.test.ts (preserva history).
- ❌ Borrar smoke.test.ts e crear SearchEngine.test.ts como dúas
  operacións separadas (rompe history).
- ❌ Esquecer aplicar DT-14 fix en tsup.config.ts.
- ❌ Usar `!` non-null assertions.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T10)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `b8576c7` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar SearchEngine.ts non existe:
ls packages/search/src/SearchEngine.ts 2>/dev/null && echo "ESCALAR" || echo "✅"

# Confirmar placeholders actuais:
cat packages/search/src/index.ts
# Esperado: contén "export const VERSION = '0.0.0'"

cat packages/search/__tests__/smoke.test.ts | head -10
# Esperado: placeholder (probable verifica VERSION)

# Confirmar tsup.config.ts SEN DT-14 fix:
grep -c "composite" packages/search/tsup.config.ts
# Esperado: 0

# Confirmar @common + @core dispoñibles desde @search:
ls packages/common/dist/index.d.ts 2>/dev/null || echo "build common primeiro"
ls packages/core/dist/index.d.ts 2>/dev/null || echo "build core primeiro"

# Confirmar Plugin types + TreeDef exportados desde @core:
grep -E "TreeDef|Plugin" packages/core/src/index.ts | head -5
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/core build
pnpm turbo run typecheck --force                        # 23/23
pnpm --filter @yggdrasil-forge/search test --force      # 1 test (smoke; placeholder)
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Actualizar scaffold @search (3 ficheiros)

Aplicar §5.2, §5.3, §5.4 literal:
- `packages/search/package.json` (substituír).
- `packages/search/tsup.config.ts` (substituír; DT-14 fix).
- `packages/search/tsconfig.json` (substituír; +references).

### T2 — pnpm install (OBRIGATORIO)

```bash
pnpm install
```

**Verificación**: pnpm-lock.yaml actualizado para reflexar novas
deps workspace.

### T3 — Crear types.ts + SearchEngine.ts

Aplicar §5.5 + §5.6 literal:
- `packages/search/src/types.ts` (NOVO).
- `packages/search/src/SearchEngine.ts` (NOVO).

### T4 — Substituír src/index.ts (eliminar VERSION placeholder)

Aplicar §5.7 literal. **Substituír TOTAL** o contido de
`packages/search/src/index.ts`.

### T5 — Verificación typecheck

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/search build               # build OK
```

Esperado: build do paquete OK con DT-14 fix aplicado.

### T6 — git mv smoke.test.ts → SearchEngine.test.ts

```bash
git mv packages/search/__tests__/smoke.test.ts packages/search/__tests__/SearchEngine.test.ts
```

**Despois substituír contido** de SearchEngine.test.ts segundo §5.8.

### T7 — Verificación tests

```bash
pnpm --filter @yggdrasil-forge/search test --force       # ~20 tests
pnpm --filter @yggdrasil-forge/core test --force         # 1673 tests INTACTOS
pnpm --filter @yggdrasil-forge/plugins test --force      # 35 tests INTACTOS
```

**Especial atención**: tódolos tests existentes noutros paquetes
deben pasar intactos.

### T8 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/search exec vitest run --coverage 2>&1 | \
  grep -E "SearchEngine|^All files" | head -3
# Esperado:
#   SearchEngine.ts: 100/100/100/100
```

### T9 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/search build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/search/src/ \
  packages/search/__tests__/
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
# IMPORTANTE: "placeholder" SI debe aparecer 0 veces (xa eliminamos
# o placeholder de VERSION).
```

### T10 — Changeset + CHANGELOG + commit + push

`.changeset/search-engine-8-6-a.md`:
```
---
'@yggdrasil-forge/search': minor
---

feat(search): activate package + SearchEngine standalone (sub-phase 8.6.a)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **`@yggdrasil-forge/search`** paquete **activado** (scaffold xa
  existía; 8.6.a aplica updates + código real). Aliñado con MASTER
  §28 ("Search e filtering").
  - **dependencies engadidas**: `@yggdrasil-forge/common`, `@yggdrasil-forge/core`
    (workspace).
  - **DT-14 fix aplicado** en tsup.config.ts (composite:false).
  - **tsconfig.json**: engadidos references a @common + @core.
- **`SearchEngine`** clase standalone en
  `packages/search/src/SearchEngine.ts`. Algoritmo custom simple:
  - **Indexa** lowercased `name`, `description`, `tags`,
    `searchKeywords` de cada NodeDef.
  - **Busca substring case-insensitive** con scoring por campo:
    name=10, searchKeywords=7, description=5, tags=3.
  - **Múltiples matches no mesmo nodo suman scores**.
  - **Sort descendente por score**.
  - **Limit configurable** (default Infinity).
  - **Fields configurable** (default todos os 4 campos).
  - **Query vacía devolve `[]`** (cero matches).
- **`SearchOptions`**, **`SearchResult`**, **`SearchMatch`**,
  **`SearchField`** tipos exportados.
- Actualizado `src/index.ts` con exports reais (substitúe VERSION
  placeholder).

### Changed
- `packages/search/__tests__/smoke.test.ts` → `SearchEngine.test.ts`
  (vía `git mv`; substitúe placeholder por ~20 tests reais).

### Note
- Sub-fase 8.6.a PRIMEIRA das 2 sub-sub-fases de 8.6. **8.6.b**
  engadirá **SearchPlugin** (Plugin interface) + integration con
  TreeEngine + README update.
- **DIFERIDOS** en 8.6.a:
  - **SearchPlugin** (8.6.b).
  - **README update con sección Search** (8.6.b).
  - **Auto-reindex automático** (require applyChanges + treeChanged
    event; sub-fase futura).
  - **`caseSensitive` option** (simplificación; sub-fase futura
    pode estender).
  - **Fuzzy matching / stemming** (algoritmo custom simple; sub-fases
    futuras poden estender).
- **Algoritmo custom simple**: cero deps externas (coherente coa
  filosofía do proxecto; cero deps externas en core/common ata
  agora).
- **DT-14 fix aplicado**: tsup.config.ts inclúe composite:false
  dende inicio.
- **Cero modificación de TreeEngine.ts** (search é externo).
- **Cero modificación de outros paquetes** (core/common/storage/react/plugins
  intactos).
- **Cero modificación de calquera test existente** noutros paquetes
  (~2077 totais intactos).
- **Cero deps de npm externas engadidas**.
- **Cero ErrorCodes novos** (search é fire-and-forget sen erros
  funcionais).
- **🎯 Segundo paquete scaffold activado** (de 15 totais): @plugins
  (8.5.a) + @search (8.6.a).
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
  SearchEngine.ts non existe + placeholders actuais antes de
  substituír.
```

Commit Conventional:
`feat(search): activate package + SearchEngine standalone (sub-phase 8.6.a)`

Push directo a `origin/main` (base `b8576c7`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.6.a — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base b8576c7)
✅ Scaffold @search actualizado:
   - package.json: +dependencies @common + @core
   - tsup.config.ts: DT-14 fix aplicado (composite:false)
   - tsconfig.json: +references @common + @core
✅ SearchEngine NOVO en packages/search/src/:
   - SearchEngine.ts: class con index/search/clear/size
   - types.ts: SearchOptions, SearchResult, SearchMatch, SearchField
   - Algoritmo custom: substring lowercase + scoring por campo
     (name=10, searchKeywords=7, description=5, tags=3)
   - Sort descendente; limit configurable
   - Query vacía → []
✅ src/index.ts substituído (placeholder VERSION eliminado;
   exports reais)
✅ smoke.test.ts → SearchEngine.test.ts via git mv (preserva history)
✅ T0.2 verificación empírica (lección 8.3 L1):
   - SearchEngine.ts non existe (libre)
   - Placeholder VERSION confirmado
   - Smoke.test.ts placeholder confirmado
   - tsup.config.ts SEN DT-14 fix confirmado
✅ T2 pnpm install: lock actualizado
✅ T5 typecheck: 23/23 successful (engadiu @search activo)
✅ T7 verificación tests:
   - search: ~20 tests novos pasan
   - core: 1673 tests INTACTOS
   - common: 60 tests INTACTOS
   - storage: 193 tests INTACTOS
   - react: 116 tests INTACTOS
   - plugins: 35 tests INTACTOS
✅ T8 cobertura SearchEngine: 100/100/100/100
✅ CERO modificación de README (DIFERIDO a 8.6.b)
✅ CERO modificación de outros paquetes
✅ CERO modificación de calquera test existente
✅ CERO deps de npm externas engadidas
✅ Tests: ~2077 + ~19 = ~2096 monorepo
   (search 1 smoke → 20 reais = +19 neto)
✅ Typecheck: 23/23 | Lint: 0/0 | Format: 0/0
✅ Build paquete search: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
   (placeholder VERSION xa eliminado)
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.6.a PRIMEIRA das 2 de 8.6.
   - 47 sub-fases consecutivas sen rollback.
   - 🎯 Segundo paquete scaffold activado (@search).
   - DT-14 fix aplicado proactivamente (2/15 paquetes scaffold).
   - 2 sub-fases pendentes da Fase 8 tras 8.6 (8.7 ValidatorEngine,
     8.8 Read-only mode).
   - Algoritmo custom simple; cero deps externas.
   - Auto-reindex DIFERIDO (treeDef inmutable actualmente).
✅ Changeset minor (search) + nova [Unreleased]
✅ git status pre-commit: 10 ficheiros + 1 renomeo + lock update
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.6.b (SearchPlugin + README update).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.6.a. **PRIMEIRA das 2 sub-sub-fases de 8.6**.
Activa o paquete @yggdrasil-forge/search (segundo paquete scaffold
activado tras @plugins). SearchEngine standalone con algoritmo
custom simple (substring + scoring por campo) cumple MASTER §28.
DT-14 fix aplicado proactivamente. 10 ficheiros tocados (3 NOVOS
+ 5 MODIFICADOS + 1 renomeo via git mv para preservar history).
~20 tests novos. Risco MEDIO: scaffold actualizado + clase nova
ben acoutada. Cero modificación de outros paquetes nin tests
existentes. SearchPlugin (Plugin interface + integration) DIFERIDO
a 8.6.b.*

*Decisións críticas documentadas:
- Algoritmo custom simple (cero deps externas).
- Scoring por campo fixado (name=10/searchKeywords=7/description=5/tags=3).
- Múltiples matches suman scores.
- Sort descendente por score.
- Query vacía → [].
- Case-insensitive sempre (decisión simplificadora).
- Auto-reindex DIFERIDO.
- Git mv para preservar history (smoke.test.ts → SearchEngine.test.ts).
- README update DIFERIDO a 8.6.b.*
