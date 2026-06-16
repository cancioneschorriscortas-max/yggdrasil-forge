# BRIEFING — SUB-FASE 8.7.a de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA das 2 sub-sub-fases de 8.7** (ValidatorEngine + 9
> built-in rules). 8.7.a entrega:
> 1. **Actualizar scaffold** `@yggdrasil-forge/validators` xa existente
>    (package.json + tsup.config.ts + tsconfig.json — análogo a
>    8.6.a).
> 2. **ValidatorEngine** standalone (clase con registerRule/unregisterRule/validate/getRules/size).
> 3. **6 regras built-in estruturais** simples (lóxica basada en
>    grafo): no_cycles, all_reachable_from_root, no_orphan_nodes,
>    no_dead_ends, max_branching_factor, min_branching_factor.
> 4. **Substituír placeholders**: src/index.ts (VERSION → exports
>    reais), smoke.test.ts (→ ValidatorEngine.test.ts via git mv
>    preservando history).
>
> **8.7.b (próxima)** engadirá:
> - 3 regras complexas: progressive_difficulty, balanced_branches,
>   no_redundant_prerequisites.
> - `TreeEngine.validatePedagogically()` integration (modificación
>   cirúrxica de TreeEngine).
> - README update final con sección completa.
>
> **`valid_subtree_references` DIFERIDA totalmente** (require feature
> sub-trees aínda non implementado).
>
> **Decisións confirmadas polo director**:
> - **Standalone** (cero Plugin pattern). ValidatorEngine é unha
>   class importable que pode usarse sen TreeEngine.
> - **API estendida con helpers**: unregisterRule(id), getRules(),
>   size().
> - **ValidationIssue con nodeId? + edgeId?** opcionais.
> - **ValidationReport** con shortcuts (errorCount, warningCount,
>   infoCount, hasErrors).
> - **6 regras simples** en 8.7.a; 3 complexas + integration en
>   8.7.b.
> - **`validate()` é async** (segundo MASTER §17 e prep futuro para
>   regras IO).
> - **state? DIFERIDO** en 8.7.a (regras built-in usan só treeDef).
> - **max_branching_factor + min_branching_factor son factories**
>   parameterizadas (require limite numérico).
> - **dependency edges** son o tipo principal para grafo de
>   prerequisites (EdgeType `'dependency'`).
> - **rules.ts único ficheiro** con as 6 regras como const exports
>   (cero ficheiros separados por regra para evitar boilerplate).
> - **`label` como LocalizedString Record gl/es/en** en cada regra
>   (lección 8.6.a L1 aplicada: cero usar string simple).
>
> **Aviso ao Executor**: paquete @validators está scaffold pero
> require updates análogos aos de @search en 8.6.a (package.json
> sen deps, tsup.config.ts sen DT-14 fix). Aplicar mesmo patrón.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
> ValidatorEngine.ts non existe (xa verificado polo director).
>
> 8.7.b, 8.8 DIFERIDOS.

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
- Pushed: `═══ SUB-FASE 8.7.a — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.7.a — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica en types (nodeId?,
edgeId? en ValidationIssue).

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: ValidatorEngine.ts + rules.ts chega a
**100/100/100/100**. Cero regresión na baseline post-8.6.b.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: cero modificación de
calquera test existente fora do `git mv` de smoke.test.ts (placeholder
que substitúe por ValidatorEngine.test.ts real). Tódolos ~2108
tests previos en outros paquetes deben pasar intactos.

**0.14 — pnpm install OBRIGATORIO** tras modificar package.json
(engadir deps).

**0.15 — `git mv` para renomear smoke.test.ts**: preserva git
history. Sintaxe:
```bash
git mv packages/validators/__tests__/smoke.test.ts packages/validators/__tests__/ValidatorEngine.test.ts
```

**0.16 — Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
que ValidatorEngine.ts non existe.

**0.17 — Lección 8.6.a L1 aplicada con rigor**: NodeDef ten `label:
LocalizedString` (cero `name`). EdgeDef ten `source`, `target`,
`type`. Verificar empíricamente antes de codificar regras.

**0.18 — Coordinación con 8.6.a/b**: usar mesmo patrón de scaffold
update (deps, DT-14 fix, references), git mv para tests, README
DIFERIDO a 8.7.b.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.7.a** de Yggdrasil Forge. **PRIMEIRA das 2 sub-sub-fases
de 8.7** (ValidatorEngine + built-in rules).

**Pezas (4 grupos)**:

**Grupo A — Actualizar scaffold @validators (3 MODIFICADOS)**:
1. `packages/validators/package.json` (engadir deps @common +
   @core; scripts coherentes).
2. `packages/validators/tsup.config.ts` (DT-14 fix:
   `dts.compilerOptions.composite:false`).
3. `packages/validators/tsconfig.json` (engadir references a
   @common + @core).

**Grupo B — ValidatorEngine + tipos + 6 regras (4 NOVOS)**:
4. `packages/validators/src/types.ts` (NOVO; ValidationRule,
   ValidationIssue, ValidationReport, ValidationSeverity).
5. `packages/validators/src/ValidatorEngine.ts` (NOVO; class).
6. `packages/validators/src/rules.ts` (NOVO; 6 regras built-in
   como const exports e factory functions onde aplique).
7. `packages/validators/src/index.ts` (**SUBSTITUÍR** placeholder
   VERSION; engadir exports).

**Grupo C — Tests (1 git mv + reemplazar contido)**:
8. **`git mv`** `__tests__/smoke.test.ts` →
   `__tests__/ValidatorEngine.test.ts`.
9. **Substituír contido** de ValidatorEngine.test.ts (~45-55 tests:
   ~10 ValidatorEngine core + ~6-8 por cada regra).

**Grupo D — Housekeeping**:
10. `.changeset/validators-engine-8-7-a.md` (NOVO).
11. `CHANGELOG.md` (MODIFICADO).

**Total: ~10 ficheiros tocados** (4 NOVOS + 5 MODIFICADOS + 1
renomeo).

**Cero modificación de**:
- `packages/validators/README.md` (DIFERIDO a 8.7.b).
- `packages/validators/vitest.config.ts` (intacto).
- Outros paquetes (core/common/storage/react/plugins/search).
- Tests existentes (~2108 totais).
- `package.json` root, configs root.
- MASTER.md.

**CERO deps de npm externas engadidas**. Só **@yggdrasil-forge/common**
e **@yggdrasil-forge/core** como dependencies internas (workspace).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `0222885`, verificada
empíricamente)**.

### MASTER §17 (literal, verificado)

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

**Built-in MASTER prescritas**: `no_cycles`, `all_reachable_from_root`,
`no_orphan_nodes`, `no_dead_ends`, `max_branching_factor`,
`min_branching_factor`, `progressive_difficulty`, `balanced_branches`,
`no_redundant_prerequisites`, `valid_subtree_references` (**10 totais**).

**Distribución 8.7.a vs 8.7.b**:
- **8.7.a (6 simples)**: no_cycles, all_reachable_from_root,
  no_orphan_nodes, no_dead_ends, max_branching_factor,
  min_branching_factor.
- **8.7.b (3 complexas)**: progressive_difficulty, balanced_branches,
  no_redundant_prerequisites.
- **DIFERIDA totalmente**: valid_subtree_references (require sub-trees).

### TreeDef estrutura (verificada literal)

```ts
interface TreeDef {
  readonly id: string
  readonly schemaVersion: string
  readonly version: string
  readonly label: LocalizedString
  readonly description?: LocalizedString
  readonly author?: string
  readonly rootNodeId?: string  // ← usado por all_reachable_from_root
  readonly nodes: readonly NodeDef[]
  readonly edges: readonly EdgeDef[]
  readonly groups?: readonly GroupDef[]
  readonly resources?: readonly Resource[]
  readonly stats?: readonly StatDef[]
}
```

### EdgeDef estrutura (verificada literal)

```ts
interface EdgeDef {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type: EdgeType  // 'dependency' | 'soft_dependency' | 'exclusion' | 'enhancement' | 'path'
  readonly bidirectional?: boolean
  readonly label?: LocalizedString
  readonly weight?: number
  readonly style?: EdgeStyle
}
```

**Decisión do director**: para grafo de prerequisites, **usar
edges co type `'dependency'`** únicamente. Outros tipos
(soft_dependency, exclusion, enhancement, path) cero contan como
prereqs estruturais. Esta é a interpretación máis estrita; sub-fase
futura pode estender se require.

### LocalizedString (verificada)

```ts
type LocalizedString = string | Record<string, string>
```

Definida en `@yggdrasil-forge/common/i18n`. **Importar desde
@common** nas regras.

### State DIFERIDO en 8.7.a

`ValidationRule.validate(treeDef, state?)`: **state? DIFERIDO**.
Tódalas 6 regras built-in en 8.7.a usan **só treeDef**.

### Lección 8.6.a L1 aplicada con rigor

- **NodeDef ten `label: LocalizedString`** (cero `name`).
- **EdgeDef ten `source`, `target`** (cero `from`, `to`).
- Verificar empíricamente sempre antes de codificar regras.

### Estado scaffold actual (verificado)

```
packages/validators/
├── README.md                     (intacto en 8.7.a; actualizarase en 8.7.b)
├── __tests__/
│   └── smoke.test.ts             (PLACEHOLDER; verifica VERSION)
├── package.json                  (sen dependencies; require update)
├── src/
│   └── index.ts                  (PLACEHOLDER: solo `export const VERSION`)
├── tsconfig.json                 (cero references; require update)
├── tsup.config.ts                (SEN DT-14 fix; require update)
└── vitest.config.ts              (OK; intacto)
```

**Verificacións empíricas en T0.2** (análogas a 8.6.a):
- `cat packages/validators/src/index.ts` mostra placeholder VERSION.
- `cat packages/validators/__tests__/smoke.test.ts` mostra placeholder.
- `cat packages/validators/tsup.config.ts` mostra `dts: true` (cero
  fix DT-14).
- `cat packages/validators/package.json` mostra cero dependencies.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `0222885` (sub-fase 8.6.b — SearchPlugin).
- 1673 core + 60 common + 193 storage + 116 react + 35 plugins +
  32 search = **~2108 tests** monorepo limpo.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 50 ErrorCodes existentes.
- **Cadea 48 sub-fases consecutivas sen rollback**.
- **Paquetes activos: 6** (common, core, storage, react, plugins,
  search).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Actualizar o scaffold do paquete `@yggdrasil-forge/validators`
(package.json con deps @common+@core; tsup.config.ts con DT-14
fix; tsconfig.json con references) **análogo a 8.6.a**; engadir
**ValidatorEngine** clase standalone con API `registerRule(rule) /
unregisterRule(id) / validate(treeDef, state?) / getRules() /
size()` (validate async devolve ValidationReport con `issues`,
`errorCount`, `warningCount`, `infoCount`, `hasErrors`); engadir
**6 regras built-in estruturais** (cero require state; usan só
treeDef): **no_cycles** (DFS error severity), **all_reachable_from_root**
(BFS desde rootNodeId error severity), **no_orphan_nodes** (warning),
**no_dead_ends** (warning), **max_branching_factor(limit)** (factory
function warning), **min_branching_factor(limit)** (factory info);
**ValidationRule.label como LocalizedString Record gl/es/en**;
**ValidationIssue con nodeId? + edgeId?** opcionais; cero ErrorCodes
novos; substituír placeholders en src/index.ts (VERSION → exports
reais) e renomear `__tests__/smoke.test.ts` → `ValidatorEngine.test.ts`
via `git mv` con tests reais (~45-55 totais). **Cero modificación**
de README (DIFERIDO a 8.7.b), outros paquetes, ou calquera test
existente noutros paquetes.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (4)**:
- `packages/validators/src/types.ts` (~70 liñas).
- `packages/validators/src/ValidatorEngine.ts` (~110 liñas).
- `packages/validators/src/rules.ts` (~280 liñas; 6 regras).
- `.changeset/validators-engine-8-7-a.md` (NOVO).

**MODIFICADOS (5)**:
- `packages/validators/package.json` (substituír).
- `packages/validators/tsup.config.ts` (substituír; DT-14 fix).
- `packages/validators/tsconfig.json` (substituír; +references).
- `packages/validators/src/index.ts` (substituír placeholder).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**RENOMEADO + REEMPLAZADO (1)**:
- `packages/validators/__tests__/smoke.test.ts` →
  `ValidatorEngine.test.ts` via `git mv` + substituír contido (~600
  liñas; ~45-55 tests).

**Total: 10 ficheiros tocados** (4 NOVOS + 5 MODIFICADOS + 1
renomeo).

### 5.2 — package.json (FIXADO; análogo a 8.6.a)

```json
{
  "name": "@yggdrasil-forge/validators",
  "version": "0.0.0",
  "description": "Pedagogical validators for Yggdrasil Forge",
  "license": "MIT",
  "author": "Agarfal",
  "homepage": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/cancioneschorriscortas-max/yggdrasil-forge.git",
    "directory": "packages/validators"
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

### 5.3 — tsup.config.ts (FIXADO; DT-14 fix)

```ts
// ── INICIO: tsup config para @yggdrasil-forge/validators ──
// DT-14 fix aplicado: composite:false necesario porque @validators
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
// ── INICIO: ValidatorEngine types ──

import type { LocalizedString } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'

/**
 * Severidade dunha ValidationIssue.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * Issue individual atopada durante validación.
 */
export interface ValidationIssue {
  /** Id da regra que producíu este issue. */
  readonly ruleId: string
  /** Severidade do issue. */
  readonly severity: ValidationSeverity
  /** Mensaxe humana describindo o problema. */
  readonly message: string
  /** Id do nodo afectado (se aplica). */
  readonly nodeId?: string
  /** Id do edge afectado (se aplica). */
  readonly edgeId?: string
}

/**
 * Regra de validación. Pode rexistrarse en ValidatorEngine.
 */
export interface ValidationRule {
  /** Identificador único da regra (e.g., 'no_cycles'). */
  readonly id: string
  /** Etiqueta visible localizable. */
  readonly label: LocalizedString
  /** Severidade dos issues que producirá. */
  readonly severity: ValidationSeverity
  /**
   * Validar o treeDef. Devolve array de issues (vacío se cero
   * problemas).
   *
   * **Nota**: en 8.7.a, `state` é opcional e cero usado polas
   * regras built-in. Sub-fases futuras poden engadir regras que
   * o usen.
   */
  validate(treeDef: TreeDef): readonly ValidationIssue[]
}

/**
 * Resultado da validación. Contén issues + counters por severidade.
 */
export interface ValidationReport {
  /** Tódalas issues producidas, en orde de aparición. */
  readonly issues: readonly ValidationIssue[]
  /** Número de issues con severity='error'. */
  readonly errorCount: number
  /** Número de issues con severity='warning'. */
  readonly warningCount: number
  /** Número de issues con severity='info'. */
  readonly infoCount: number
  /** True se errorCount > 0. */
  readonly hasErrors: boolean
}

// ── FIN: ValidatorEngine types ──
```

**Decisións nesta peza**:
- **`validate` sync por regra** (cero async). `ValidatorEngine.validate`
  é async pero internamente chama síncronamente cada regra.
- **`state?` parameter eliminado** da signature en 8.7.a (DIFERIDO).
  Sub-fase futura engadirá overload se require.
- **`nodeId?`, `edgeId?` opcionais**: permite issues globais ou
  específicas.
- **`ValidationReport` con counters**: facilita o uso (UI, CI, etc.).

### 5.6 — src/ValidatorEngine.ts (NOVO; FIXADO)

```ts
// ── INICIO: ValidatorEngine ──
// Motor de validación pedagóxica para Yggdrasil Forge.
//
// **Sub-fase 8.7.a**: implementación standalone (cero Plugin
// pattern; cero TreeEngine integration aínda). API:
// registerRule + unregisterRule + validate + getRules + size.
//
// **Async validate**: aínda que as regras built-in son sync, o
// método é async para preparar sub-fases futuras que poden engadir
// regras con IO.

import type { TreeDef } from '@yggdrasil-forge/core'
import type {
  ValidationIssue,
  ValidationReport,
  ValidationRule,
  ValidationSeverity,
} from './types.js'

/**
 * Motor de validación pedagóxica.
 *
 * @example
 * import { ValidatorEngine, noCyclesRule, allReachableFromRootRule } from '@yggdrasil-forge/validators'
 *
 * const validator = new ValidatorEngine()
 * validator.registerRule(noCyclesRule)
 * validator.registerRule(allReachableFromRootRule)
 *
 * const report = await validator.validate(treeDef)
 * if (report.hasErrors) {
 *   console.error('Tree has errors:', report.issues)
 * }
 */
export class ValidatorEngine {
  private readonly rules = new Map<string, ValidationRule>()

  /**
   * Rexistra unha regra. Se xa existe unha con o mesmo id,
   * substitúe.
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * Desinscribe a regra polo id. Devolve true se existía e foi
   * eliminada; false se non existía.
   */
  unregisterRule(id: string): boolean {
    return this.rules.delete(id)
  }

  /**
   * Devolve un array inmutable das regras rexistradas, en orde
   * de inserción.
   */
  getRules(): readonly ValidationRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Devolve o número de regras rexistradas.
   */
  size(): number {
    return this.rules.size
  }

  /**
   * Executa tódalas regras rexistradas contra o treeDef.
   *
   * Devolve un ValidationReport con tódolos issues atopados +
   * counters por severidade.
   */
  async validate(treeDef: TreeDef): Promise<ValidationReport> {
    const issues: ValidationIssue[] = []

    for (const rule of this.rules.values()) {
      const ruleIssues = rule.validate(treeDef)
      for (const issue of ruleIssues) {
        issues.push(issue)
      }
    }

    let errorCount = 0
    let warningCount = 0
    let infoCount = 0

    for (const issue of issues) {
      if (issue.severity === 'error') errorCount += 1
      else if (issue.severity === 'warning') warningCount += 1
      else infoCount += 1
    }

    return {
      issues,
      errorCount,
      warningCount,
      infoCount,
      hasErrors: errorCount > 0,
    }
  }
}
// ── FIN: ValidatorEngine ──
```

**Decisións nesta peza**:
- **Map interno por id**: rexistrar substitúe se id duplicado
  (semántica de "última gana").
- **`getRules` devolve array de Map.values()**: orde de inserción
  preservada.
- **`validate` é async** (cero await necesario actualmente; preparación
  para futuro).
- **For-loop sobre Map.values()**: máis eficiente que conversión a
  array.
- **Counters separados** vs `issues.filter(i => i.severity === 'error').length`
  (máis eficiente: unha sola iteración).

### 5.7 — src/rules.ts (NOVO; FIXADO; 6 regras)

```ts
// ── INICIO: Built-in validation rules ──
// 6 regras estruturais simples para 8.7.a.
//
// **DIFERIDAS** a 8.7.b: progressive_difficulty, balanced_branches,
// no_redundant_prerequisites.
// **DIFERIDA totalmente**: valid_subtree_references (require sub-trees).

import type { EdgeDef, TreeDef } from '@yggdrasil-forge/core'
import type { ValidationIssue, ValidationRule } from './types.js'

/**
 * Filtra edges para obter só os de tipo 'dependency' (prerequisites
 * estruturais; outros tipos son soft, exclusion, enhancement, path).
 */
function dependencyEdges(edges: readonly EdgeDef[]): readonly EdgeDef[] {
  return edges.filter((e) => e.type === 'dependency')
}

/**
 * Construir mapa adjacency: source → [targets] dos dependency edges.
 */
function buildAdjacency(
  edges: readonly EdgeDef[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>()
  for (const e of dependencyEdges(edges)) {
    const targets = adj.get(e.source) ?? []
    targets.push(e.target)
    adj.set(e.source, targets)
  }
  return adj
}

// ── Rule 1: no_cycles ──────────────────────────────────────────

/**
 * Detecta ciclos no grafo dirixido de dependency edges.
 * Severity: error.
 */
export const noCyclesRule: ValidationRule = {
  id: 'no_cycles',
  label: {
    gl: 'Sen ciclos',
    es: 'Sin ciclos',
    en: 'No cycles',
  },
  severity: 'error',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)
    const visited = new Set<string>()
    const onStack = new Set<string>()

    const dfs = (node: string): string | null => {
      visited.add(node)
      onStack.add(node)

      for (const next of adj.get(node) ?? []) {
        if (!visited.has(next)) {
          const cycle = dfs(next)
          if (cycle !== null) return cycle
        } else if (onStack.has(next)) {
          return next
        }
      }

      onStack.delete(node)
      return null
    }

    for (const node of treeDef.nodes) {
      if (visited.has(node.id)) continue
      const cycle = dfs(node.id)
      if (cycle !== null) {
        issues.push({
          ruleId: 'no_cycles',
          severity: 'error',
          message: `Cycle detected involving node "${cycle}"`,
          nodeId: cycle,
        })
      }
    }

    return issues
  },
}

// ── Rule 2: all_reachable_from_root ────────────────────────────

/**
 * Verifica que tódolos nodos son alcanzables desde rootNodeId
 * seguindo dependency edges.
 *
 * Se rootNodeId é undefined, cero issues (regra inaplicable).
 * Severity: error.
 */
export const allReachableFromRootRule: ValidationRule = {
  id: 'all_reachable_from_root',
  label: {
    gl: 'Tódolos nodos accesibles desde a raíz',
    es: 'Todos los nodos accesibles desde la raíz',
    en: 'All nodes reachable from root',
  },
  severity: 'error',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    if (treeDef.rootNodeId === undefined) return []

    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)
    const reachable = new Set<string>()
    const queue: string[] = [treeDef.rootNodeId]

    while (queue.length > 0) {
      const node = queue.shift()
      if (node === undefined) continue
      if (reachable.has(node)) continue
      reachable.add(node)
      for (const next of adj.get(node) ?? []) {
        if (!reachable.has(next)) queue.push(next)
      }
    }

    for (const node of treeDef.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          ruleId: 'all_reachable_from_root',
          severity: 'error',
          message: `Node "${node.id}" is not reachable from root "${treeDef.rootNodeId}"`,
          nodeId: node.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 3: no_orphan_nodes ────────────────────────────────────

/**
 * Detecta nodos orfos: aqueles sen edges in/out (de calquera tipo).
 * Severity: warning.
 */
export const noOrphanNodesRule: ValidationRule = {
  id: 'no_orphan_nodes',
  label: {
    gl: 'Sen nodos orfos',
    es: 'Sin nodos huérfanos',
    en: 'No orphan nodes',
  },
  severity: 'warning',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const connected = new Set<string>()

    for (const e of treeDef.edges) {
      connected.add(e.source)
      connected.add(e.target)
    }

    for (const node of treeDef.nodes) {
      if (!connected.has(node.id)) {
        issues.push({
          ruleId: 'no_orphan_nodes',
          severity: 'warning',
          message: `Node "${node.id}" has no connections (orphan)`,
          nodeId: node.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 4: no_dead_ends ───────────────────────────────────────

/**
 * Detecta nodos sen outgoing dependency edges (excepto a raíz e
 * nodos terminais lóxicos non distinguibles aquí; tódolos non-raíz
 * sen outgoing edges son potenciais dead ends).
 *
 * Nota: para distinguir terminais lóxicos require lóxica adicional;
 * 8.7.a marca todos como warning.
 * Severity: warning.
 */
export const noDeadEndsRule: ValidationRule = {
  id: 'no_dead_ends',
  label: {
    gl: 'Sen camiños sen saída',
    es: 'Sin caminos sin salida',
    en: 'No dead ends',
  },
  severity: 'warning',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)

    for (const node of treeDef.nodes) {
      const outgoing = adj.get(node.id)
      if (outgoing === undefined || outgoing.length === 0) {
        // É raíz? cero é necesariamente dead end:
        if (node.id === treeDef.rootNodeId) continue
        issues.push({
          ruleId: 'no_dead_ends',
          severity: 'warning',
          message: `Node "${node.id}" has no outgoing dependencies (dead end)`,
          nodeId: node.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 5: max_branching_factor (factory) ─────────────────────

/**
 * Factory: crea unha regra que detecta nodos con máis fillos
 * (outgoing dependency edges) que o límite.
 * Severity: warning.
 *
 * @example
 * validator.registerRule(maxBranchingFactorRule(5))
 */
export function maxBranchingFactorRule(limit: number): ValidationRule {
  return {
    id: 'max_branching_factor',
    label: {
      gl: `Factor de ramificación máximo: ${limit}`,
      es: `Factor de ramificación máximo: ${limit}`,
      en: `Maximum branching factor: ${limit}`,
    },
    severity: 'warning',
    validate(treeDef: TreeDef): readonly ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const adj = buildAdjacency(treeDef.edges)

      for (const [nodeId, targets] of adj) {
        if (targets.length > limit) {
          issues.push({
            ruleId: 'max_branching_factor',
            severity: 'warning',
            message: `Node "${nodeId}" has ${targets.length} children (max allowed: ${limit})`,
            nodeId,
          })
        }
      }

      return issues
    },
  }
}

// ── Rule 6: min_branching_factor (factory) ─────────────────────

/**
 * Factory: crea unha regra que detecta nodos non-leaf con menos
 * fillos que o límite (excluíndo nodos sen outgoing, que son
 * cubertos por no_dead_ends).
 * Severity: info.
 *
 * @example
 * validator.registerRule(minBranchingFactorRule(2))
 */
export function minBranchingFactorRule(limit: number): ValidationRule {
  return {
    id: 'min_branching_factor',
    label: {
      gl: `Factor de ramificación mínimo: ${limit}`,
      es: `Factor de ramificación mínimo: ${limit}`,
      en: `Minimum branching factor: ${limit}`,
    },
    severity: 'info',
    validate(treeDef: TreeDef): readonly ValidationIssue[] {
      const issues: ValidationIssue[] = []
      const adj = buildAdjacency(treeDef.edges)

      for (const [nodeId, targets] of adj) {
        // Solo consideramos nodos que **xa teñen outgoing edges**;
        // nodos sen outgoing son responsabilidade de no_dead_ends.
        if (targets.length > 0 && targets.length < limit) {
          issues.push({
            ruleId: 'min_branching_factor',
            severity: 'info',
            message: `Node "${nodeId}" has only ${targets.length} children (recommended min: ${limit})`,
            nodeId,
          })
        }
      }

      return issues
    },
  }
}

// ── FIN: Built-in validation rules ──
```

**Decisións nesta peza**:
- **Helpers privados `dependencyEdges` + `buildAdjacency`**:
  reutilizados por 5 das 6 regras (cero no_orphan_nodes que usa
  tódolos edges).
- **`noOrphanNodesRule` usa edges de tódolos tipos**: orfo = cero
  conexión de ningún tipo.
- **Outras 5 regras usan só dependency edges** (criterio máis
  estrito para prerequisites).
- **`max_branching_factor` + `min_branching_factor` son factories**:
  parameterizadas con `limit`. Cero values default; usuario debe
  especificar.
- **`min_branching_factor` excluye nodos sen outgoing**: serían
  duplicados con `no_dead_ends`. Solo emite issue se `0 < targets.length
  < limit`.
- **Label como LocalizedString Record gl/es/en**: lección 8.6.a L1
  aplicada con rigor.
- **DFS iterativo? non, recursivo**: máis lexible; treeDef cero
  esperase ter centos de miles de nodos. Stack-safe na práctica.
- **`messages` en inglés**: convenio do proxecto (cero require
  localizar internamente; aínda permite localizar via labels).

### 5.8 — src/index.ts (FIXADO; substituír placeholder)

**Substituír TOTAL** de `packages/validators/src/index.ts` por:

```ts
// ── INICIO: @yggdrasil-forge/validators barrel ──
export { ValidatorEngine } from './ValidatorEngine.js'
export {
  noCyclesRule,
  allReachableFromRootRule,
  noOrphanNodesRule,
  noDeadEndsRule,
  maxBranchingFactorRule,
  minBranchingFactorRule,
} from './rules.js'
export type {
  ValidationIssue,
  ValidationReport,
  ValidationRule,
  ValidationSeverity,
} from './types.js'
// ── FIN: @yggdrasil-forge/validators barrel ──
```

**Cero `VERSION` constant** (placeholder eliminada).

### 5.9 — Tests prescritos (~45-55 tests)

**Procedemento**:
```bash
git mv packages/validators/__tests__/smoke.test.ts packages/validators/__tests__/ValidatorEngine.test.ts
```

**Substituír contido** con tests categorizados:

#### ValidatorEngine core (10 tests)

1. **`new ValidatorEngine()`** crea engine con `size()=0`.
2. **`registerRule(rule)`** engade unha regra; size=1.
3. **`registerRule` con id duplicado** substitúe a previa.
4. **`unregisterRule(id)` con id existente** devolve true; size-1.
5. **`unregisterRule(id)` con id inexistente** devolve false; size
   intacto.
6. **`getRules()`** devolve array de regras en orde de inserción.
7. **`getRules()` cando size=0** devolve array vacío.
8. **`validate(treeDef)` sen regras rexistradas** devolve report
   con cero issues.
9. **`validate(treeDef)` con múltiples regras** combina issues de
   todas.
10. **`validate` counters correctos**: errorCount + warningCount +
    infoCount + hasErrors = true se erros.

#### no_cycles (6 tests)

11. **Tree sen ciclos** devolve cero issues.
12. **Tree con ciclo simple A→B→A** devolve 1 issue con
    severity='error'.
13. **Tree con ciclo de 3 nodos A→B→C→A** detectado.
14. **Tree con múltiples ciclos** detectados todos.
15. **Tree con edges non-dependency (soft_dependency, etc.)** NON
    detectan ciclos.
16. **noCyclesRule properties**: id, label gl/es/en, severity='error'.

#### all_reachable_from_root (5 tests)

17. **Tree con rootNodeId undefined** devolve cero issues
    (inaplicable).
18. **Tree con todos os nodos alcanzables** devolve cero issues.
19. **Tree con 1 nodo orfo non alcanzable** devolve 1 issue.
20. **Tree con múltiples nodos non alcanzables** devolve N issues.
21. **allReachableFromRootRule properties**: id, label, severity='error'.

#### no_orphan_nodes (5 tests)

22. **Tree con todos os nodos conectados** devolve cero issues.
23. **Tree con 1 nodo orfo** devolve 1 issue con nodeId correcto.
24. **Tree con múltiples orfos** devolve N issues.
25. **Tree con nodo conectado só por edge non-dependency
    (e.g., 'enhancement')** NON é orfo.
26. **noOrphanNodesRule properties**: severity='warning'.

#### no_dead_ends (5 tests)

27. **Tree con todos os nodos con outgoing** devolve cero issues.
28. **Tree con dead end** devolve 1 issue.
29. **rootNodeId é dead end** (cero outgoing): **NON é issue**
    (raíz é OK).
30. **Tree sen rootNodeId**: tódolos nodos sen outgoing son issues.
31. **noDeadEndsRule properties**: severity='warning'.

#### max_branching_factor (4 tests)

32. **Factory devolve unha regra correcta**: id, label, severity,
    validate function.
33. **Tree con tódolos nodos por debaixo do límite** devolve cero
    issues.
34. **Tree con 1 nodo que excede o límite** devolve 1 issue con
    mensaxe contendo o count.
35. **limit=0**: tódolos nodos con outgoing > 0 → issue (edge case).

#### min_branching_factor (4 tests)

36. **Factory devolve unha regra**: id, label, severity='info'.
37. **Tree con tódolos non-leaf por encima do límite** cero issues.
38. **Tree con 1 nodo non-leaf por debaixo do límite** devolve 1
    issue.
39. **Nodos sen outgoing (leaves) NON contan**: validation cero
    issue (responsabilidade de no_dead_ends).

#### Integration (3 tests)

40. **Rexistrar tódalas 6 regras + validate**: report ten issues
    de varias regras.
41. **Tree perfecto (cero issues)**: hasErrors=false, counters=0.
42. **Tree con erros + warnings + info**: counters correctos.

**Total: ~42 tests** (axustable a ~45-55 segundo edge cases
necesarios).

**Fixtures**:
- TreeDef mock con nodos + edges configurables.
- Helper `makeTree(nodes, edges, rootNodeId?)` para crear trees
  rápidos.

### 5.10 — Cobertura prescrita

- **ValidatorEngine.ts**: **100/100/100/100**.
- **rules.ts**: **100/100/100/100**.
- **types.ts**: cero impacto (tipos puros).
- **Resto**: sen regresión.

### 5.11 — Cero deps novas externas

Verificable empíricamente. Engadir só @common + @core como deps
workspace internas.

### 5.12 — Test counts esperados post-8.7.a

- **core**: 1673 tests (intactos).
- **common**: 60 tests (intactos).
- **storage**: 193 tests (intactos).
- **react**: 116 tests (intactos).
- **plugins**: 35 tests (intactos).
- **search**: 32 tests (intactos).
- **validators**: ~42-55 tests novos (substituíu 1 smoke
  placeholder).
- **Total monorepo**: 2108 + ~41 = **~2149 tests**.

### 5.13 — Coordinación con 8.7.b

**8.7.b** engadirá:
- 3 regras complexas: `progressive_difficulty`, `balanced_branches`,
  `no_redundant_prerequisites`.
- **`TreeEngine.validatePedagogically()`** integration: novo
  método async en TreeEngine que crea internamente ValidatorEngine
  + rexistra as 9 built-in rules + chama validate.
- README update completo con sección Validators (ValidatorEngine
  + tódalas 9 regras + uso via TreeEngine.validatePedagogically).
- Tests adicionais en ValidatorEngine.test.ts.
- Posible test de integration en `packages/core/__tests__/`.

**Cero rotura de signatures** de ValidatorEngine/types/rules
existentes esperada en 8.7.b.

### 5.14 — Lección 8.3 L1 aplicada

T0.2 verifica empíricamente:
```bash
ls packages/validators/src/ValidatorEngine.ts 2>/dev/null && echo "ESCALAR" || echo "✅"
cat packages/validators/src/index.ts | grep VERSION  # debería mostrar placeholder
cat packages/validators/__tests__/smoke.test.ts | head -10
grep -c "composite" packages/validators/tsup.config.ts  # esperado: 0
```

### 5.15 — Lección 8.6.a L1 aplicada con rigor

**NodeDef.label** é LocalizedString (cero `name`). **EdgeDef.source/target**
(cero `from/to`). Verificar empíricamente os tipos antes de codificar
regras:

```bash
grep -E "readonly (label|source|target|name|from|to)" packages/core/src/types/node.ts packages/core/src/types/edge.ts
```

### 5.16 — pnpm install OBRIGATORIO

```bash
pnpm install
```

Sen iso, tests fallan con "cannot find module '@yggdrasil-forge/common'".

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| package.json | JSON | validators/package.json | ~50 (substituír) |
| tsup.config.ts | TS config | validators/tsup.config.ts | ~20 (DT-14 fix) |
| tsconfig.json | JSON | validators/tsconfig.json | ~12 (+references) |
| types.ts | TS interfaces | validators/src/types.ts | ~70 |
| ValidatorEngine.ts | TS class | validators/src/ValidatorEngine.ts | ~110 |
| rules.ts | TS rules | validators/src/rules.ts | ~280 |
| src/index.ts | TS barrel | validators/src/index.ts | ~25 (substituír placeholder) |
| ValidatorEngine.test.ts | tests | validators/tests/ValidatorEngine.test.ts | ~600 (substituír smoke) |
| .changeset | YAML+md | .changeset/validators-engine-8-7-a.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~35 |

**Total estimado**: ~1200 liñas (incluído ~600 de tests).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (4)**:
- `packages/validators/src/types.ts`
- `packages/validators/src/ValidatorEngine.ts`
- `packages/validators/src/rules.ts`
- `.changeset/validators-engine-8-7-a.md`

**MODIFICADOS (5)**:
- `packages/validators/package.json`
- `packages/validators/tsup.config.ts`
- `packages/validators/tsconfig.json`
- `packages/validators/src/index.ts`
- `CHANGELOG.md`

**RENOMEADO + REEMPLAZADO (1)**:
- `packages/validators/__tests__/smoke.test.ts` →
  `packages/validators/__tests__/ValidatorEngine.test.ts` (via git
  mv + substituír contido).

**Total: 10 ficheiros tocados** + pnpm-lock.yaml update.

**Cambios secundarios esperados** (de pnpm install):
- `pnpm-lock.yaml`: actualízase para reflexar novas deps workspace.
  **Incluír no commit**.

**NON deben aparecer cambios en**:
- `packages/validators/README.md` (DIFERIDO a 8.7.b).
- `packages/validators/vitest.config.ts` (intacto).
- Calquera outro ficheiro en outros paquetes.
- Tests existentes (~2108 noutros paquetes).
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

**JSDoc completo** en clases + métodos públicos + regras (descrición
+ severity + complexidade).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**LocalizedString como Record gl/es/en** en labels (cero string
simple).

**Patrón coherente con SearchEngine (8.6.a)**: estructura, JSDoc,
marcadores.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/validators/README.md` (DIFERIDO a 8.7.b).
- ❌ Modificar `packages/validators/vitest.config.ts` (intacto).
- ❌ Modificar outros paquetes (core/common/storage/react/plugins/search).
- ❌ Modificar **calquera test existente** noutros paquetes
  (~2108 totais).
- ❌ Engadir deps de npm externas.
- ❌ Implementar as 3 regras complexas en 8.7.a (DIFERIDAS a 8.7.b).
- ❌ Implementar `valid_subtree_references` (DIFERIDA totalmente).
- ❌ Implementar `TreeEngine.validatePedagogically()` (DIFERIDO a
  8.7.b).
- ❌ Engadir Plugin pattern (ValidatorEngine é standalone).
- ❌ Usar `state` parameter en regras built-in (DIFERIDO; cero
  require en 8.7.a).
- ❌ Engadir ValidationRule.validate con state parameter na signature
  (mantén só treeDef en 8.7.a; sub-fase futura pode estender).
- ❌ Crear ficheiros separados por regra (rules.ts único para
  simplificar; cero boilerplate).
- ❌ Usar `name` ou similar en NodeDef (é `label`).
- ❌ Usar `from/to` en EdgeDef (son `source/target`).
- ❌ Modificar TreeEngine.ts.
- ❌ Engadir ErrorCodes novos (cero require).
- ❌ Modificar `package.json` root, configs root.
- ❌ Olvidar `pnpm install` tras modificar package.json.
- ❌ Olvidar `git mv` para renomear smoke.test.ts.
- ❌ Borrar smoke.test.ts e crear ValidatorEngine.test.ts como dúas
  operacións separadas (rompe history).
- ❌ Esquecer aplicar DT-14 fix en tsup.config.ts.
- ❌ Usar `!` non-null assertions.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T10)

### T0 — Verificación previa + leccións aplicadas

**T0.1** — `git status` limpo. `git log -1` mostra `0222885` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar ValidatorEngine.ts non existe:
ls packages/validators/src/ValidatorEngine.ts 2>/dev/null && echo "ESCALAR" || echo "✅"

# Confirmar placeholders actuais:
cat packages/validators/src/index.ts | grep VERSION
cat packages/validators/__tests__/smoke.test.ts | head -10

# Confirmar tsup.config.ts SEN DT-14 fix:
grep -c "composite" packages/validators/tsup.config.ts
# Esperado: 0

# Confirmar NodeDef.label + EdgeDef.source/target (lección 8.6.a L1):
grep -E "readonly (label|source|target)" packages/core/src/types/node.ts packages/core/src/types/edge.ts | head -6

# Confirmar TreeDef.rootNodeId + nodes + edges:
grep -E "readonly (rootNodeId|nodes|edges)" packages/core/src/types/tree.ts | head -5

# Confirmar LocalizedString import path:
grep -E "^export (type|interface) LocalizedString" packages/common/src/**/*.ts
# Esperado: packages/common/src/i18n.ts:export type LocalizedString = string | Record<string, string>

# Confirmar @common + @core exports requeridos:
grep -E "TreeDef|EdgeDef|NodeDef" packages/core/src/index.ts | head -5
grep -E "LocalizedString" packages/common/src/index.ts | head -3
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/core build
pnpm turbo run typecheck --force                        # 23/23
pnpm --filter @yggdrasil-forge/validators test --force  # 1 test (smoke placeholder)
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Actualizar scaffold @validators (3 ficheiros)

Aplicar §5.2, §5.3, §5.4 literal:
- `packages/validators/package.json` (substituír).
- `packages/validators/tsup.config.ts` (substituír; DT-14 fix).
- `packages/validators/tsconfig.json` (substituír; +references).

### T2 — pnpm install (OBRIGATORIO)

```bash
pnpm install
```

### T3 — Crear types.ts + ValidatorEngine.ts + rules.ts

Aplicar §5.5 + §5.6 + §5.7 literal:
- `packages/validators/src/types.ts` (NOVO).
- `packages/validators/src/ValidatorEngine.ts` (NOVO).
- `packages/validators/src/rules.ts` (NOVO).

### T4 — Substituír src/index.ts

Aplicar §5.8 literal.

### T5 — Verificación typecheck

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/validators build           # build OK
```

### T6 — git mv smoke.test.ts → ValidatorEngine.test.ts

```bash
git mv packages/validators/__tests__/smoke.test.ts packages/validators/__tests__/ValidatorEngine.test.ts
```

**Despois substituír contido** segundo §5.9.

### T7 — Verificación tests

```bash
pnpm --filter @yggdrasil-forge/validators test --force   # ~42-55 tests
pnpm --filter @yggdrasil-forge/core test --force         # 1673 tests INTACTOS
pnpm --filter @yggdrasil-forge/search test --force       # 32 tests INTACTOS
pnpm --filter @yggdrasil-forge/plugins test --force      # 35 tests INTACTOS
```

### T8 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/validators exec vitest run --coverage 2>&1 | \
  grep -E "ValidatorEngine|rules\.ts|^All files" | head -5
# Esperado:
#   ValidatorEngine.ts: 100/100/100/100
#   rules.ts: 100/100/100/100
```

### T9 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/validators build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/validators/src/ \
  packages/validators/__tests__/
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T10 — Changeset + CHANGELOG + commit + push

`.changeset/validators-engine-8-7-a.md`:
```
---
'@yggdrasil-forge/validators': minor
---

feat(validators): activate package + ValidatorEngine + 6 built-in rules (sub-phase 8.7.a)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **`@yggdrasil-forge/validators`** paquete **activado** (scaffold
  xa existía; 8.7.a aplica updates + código real). Aliñado con
  MASTER §17 ("Pedagogical validators").
  - **dependencies engadidas**: `@yggdrasil-forge/common`,
    `@yggdrasil-forge/core` (workspace).
  - **DT-14 fix aplicado** en tsup.config.ts (composite:false).
  - **tsconfig.json**: engadidos references a @common + @core.
- **`ValidatorEngine`** clase standalone con API:
  - \`registerRule(rule: ValidationRule): void\`.
  - \`unregisterRule(id: string): boolean\`.
  - \`validate(treeDef: TreeDef): Promise<ValidationReport>\`.
  - \`getRules(): readonly ValidationRule[]\`.
  - \`size(): number\`.
- **6 built-in rules estruturais**:
  - **\`noCyclesRule\`** (\`error\`): DFS detección ciclos en
    dependency edges.
  - **\`allReachableFromRootRule\`** (\`error\`): BFS desde
    \`rootNodeId\` seguindo dependency edges.
  - **\`noOrphanNodesRule\`** (\`warning\`): nodos sen edges in/out
    (calquera tipo).
  - **\`noDeadEndsRule\`** (\`warning\`): nodos sen outgoing
    dependency edges (raíz excluída).
  - **\`maxBranchingFactorRule(limit)\`** (factory, \`warning\`):
    nodos con máis fillos que \`limit\`.
  - **\`minBranchingFactorRule(limit)\`** (factory, \`info\`):
    nodos non-leaf con menos fillos que \`limit\`.
- **Tipos exportados**: \`ValidationRule\`, \`ValidationIssue\`,
  \`ValidationReport\`, \`ValidationSeverity\`.
- Actualizado \`src/index.ts\` con exports reais (substitúe VERSION
  placeholder).

### Changed
- \`packages/validators/__tests__/smoke.test.ts\` →
  \`ValidatorEngine.test.ts\` (vía \`git mv\`; substitúe placeholder
  por ~42-55 tests reais).

### Note
- Sub-fase 8.7.a PRIMEIRA das 2 sub-sub-fases de 8.7. **8.7.b**
  engadirá:
  - 3 regras complexas: \`progressive_difficulty\`,
    \`balanced_branches\`, \`no_redundant_prerequisites\`.
  - \`TreeEngine.validatePedagogically()\` integration.
  - README update completo.
- **\`valid_subtree_references\` DIFERIDA TOTALMENTE** (require
  feature sub-trees aínda non implementado).
- **ValidatorEngine é standalone** (cero Plugin pattern). Class
  importable usable sen TreeEngine. **Sub-fase 8.7.b** conectará
  TreeEngine cunha modificación cirúrxica.
- **\`validate\` é async** por compatibilidade con regras IO
  futuras (rules sync internamente en 8.7.a).
- **\`state?\` parameter DIFERIDO** en 8.7.a: tódalas regras
  built-in usan só treeDef. Sub-fase futura pode estender con
  overload.
- **Lección 8.6.a L1 aplicada con rigor**: NodeDef ten \`label:
  LocalizedString\` (cero \`name\`); EdgeDef ten \`source/target\`
  (cero \`from/to\`). Verificado empíricamente en T0.2.
- **Built-in rules usan dependency edges** únicamente
  (\`type === 'dependency'\`) para grafo de prerequisites. Outros
  tipos (soft_dependency, exclusion, enhancement, path) cero
  contan como prereqs estructurais.
- **\`maxBranchingFactorRule\` + \`minBranchingFactorRule\` son
  factories** parameterizadas (cero default limit; usuario debe
  especificar).
- **\`minBranchingFactorRule\` excluye nodos sen outgoing**:
  responsabilidade de \`noDeadEndsRule\`.
- **DT-14 fix aplicado**: tsup.config.ts inclúe composite:false
  dende inicio.
- **Cero modificación de TreeEngine.ts** (validators é externo).
- **Cero modificación de outros paquetes** (~2108 tests intactos).
- **Cero ErrorCodes novos**.
- **Cero deps de npm externas engadidas**.
- **🎯 Cuarto paquete scaffold activado** (de 15 totais): @plugins
  (8.5.a) + @search (8.6.a) + @validators (8.7.a).
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
  ValidatorEngine.ts non existe + placeholders actuais antes de
  substituír.
```

Commit Conventional:
`feat(validators): activate package + ValidatorEngine + 6 built-in rules (sub-phase 8.7.a)`

Push directo a `origin/main` (base `0222885`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.7.a — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 0222885)
✅ Scaffold @validators actualizado:
   - package.json: +dependencies @common + @core
   - tsup.config.ts: DT-14 fix aplicado
   - tsconfig.json: +references
✅ ValidatorEngine NOVO en packages/validators/src/:
   - ValidatorEngine.ts: class standalone
   - types.ts: ValidationRule, ValidationIssue, ValidationReport,
     ValidationSeverity
   - rules.ts: 6 regras built-in (5 const + 1 factory cada)
✅ 6 regras implementadas:
   - noCyclesRule (error): DFS
   - allReachableFromRootRule (error): BFS
   - noOrphanNodesRule (warning)
   - noDeadEndsRule (warning)
   - maxBranchingFactorRule(limit) (factory, warning)
   - minBranchingFactorRule(limit) (factory, info)
✅ src/index.ts substituído (placeholder VERSION eliminado)
✅ smoke.test.ts → ValidatorEngine.test.ts via git mv
✅ T0.2 verificación empírica (leccións 8.3 L1 + 8.6.a L1):
   - ValidatorEngine.ts non existe (libre)
   - Placeholder VERSION confirmado
   - NodeDef.label + EdgeDef.source/target confirmados
   - LocalizedString definida en @common/i18n
✅ T2 pnpm install: lock actualizado
✅ T5 typecheck: 23/23 successful (engadiu @validators)
✅ T7 verificación tests:
   - validators: ~42-55 tests novos
   - core: 1673 tests INTACTOS
   - common: 60 INTACTOS
   - storage: 193 INTACTOS
   - react: 116 INTACTOS
   - plugins: 35 INTACTOS
   - search: 32 INTACTOS
✅ T8 cobertura ValidatorEngine + rules: 100/100/100/100
✅ CERO modificación de README (DIFERIDO a 8.7.b)
✅ CERO modificación de outros paquetes
✅ CERO modificación de calquera test existente
✅ CERO deps de npm externas engadidas
✅ CERO ErrorCodes novos
✅ Tests: ~2108 + ~41 = ~2149 monorepo
✅ Typecheck: 23/23 | Lint: 0/0 | Format: 0/0
✅ Build paquete validators: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.7.a PRIMEIRA das 2 de 8.7.
   - 49 sub-fases consecutivas sen rollback.
   - 🎯 Cuarto paquete scaffold activado (@validators).
   - DT-14 fix aplicado proactivamente (4/15 paquetes scaffold).
   - 1 sub-fase pendente da 8.7 (8.7.b).
   - 1 sub-fase pendente tras 8.7 (8.8 Read-only mode).
   - valid_subtree_references DIFERIDA totalmente.
   - state? parameter DIFERIDO en regras built-in.
✅ Changeset minor (validators) + nova [Unreleased]
✅ git status pre-commit: 10 ficheiros + renomeo + lock update
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.7.b (3 regras complexas + TreeEngine integration).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.7.a. **PRIMEIRA das 2 sub-sub-fases de 8.7**.
Activa o paquete @yggdrasil-forge/validators (cuarto paquete
scaffold activado tras @plugins/@search). ValidatorEngine standalone
+ 6 regras built-in estruturais cumpre MASTER §17. DT-14 fix
aplicado proactivamente. 10 ficheiros tocados (4 NOVOS + 5
MODIFICADOS + 1 renomeo via git mv para preservar history). ~42-55
tests novos. Risco MEDIO: scaffold actualizado + clase nova + 6
regras ben acoutadas con leccións 8.3 L1 + 8.6.a L1 aplicadas con
rigor en T0.2. Cero modificación de outros paquetes nin tests
existentes.*

*🎯 **Próxima** 8.7.b**: 3 regras complexas (progressive_difficulty,
balanced_branches, no_redundant_prerequisites) + TreeEngine.validatePedagogically()
integration + README update completo. valid_subtree_references
DIFERIDA totalmente ata sub-trees implementarse.*

*Decisións críticas documentadas:
- ValidatorEngine standalone (cero Plugin).
- validate async (preparación para regras IO futuras).
- 6 regras simples en 8.7.a; 3 complexas + integration en 8.7.b.
- valid_subtree_references DIFERIDA totalmente.
- state? parameter DIFERIDO en regras built-in.
- Dependency edges únicamente para grafo de prerequisites.
- max/min branching factor como factories parameterizadas.
- noOrphanNodes usa edges de tódolos tipos (cero só dependency).
- noDeadEnds excluye rootNodeId.
- minBranchingFactor excluye nodos sen outgoing (deduplicación con
  noDeadEnds).
- rules.ts único ficheiro (cero boilerplate).
- Labels como LocalizedString Record gl/es/en.*
