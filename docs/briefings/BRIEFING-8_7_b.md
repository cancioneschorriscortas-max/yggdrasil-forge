# BRIEFING — SUB-FASE 8.7.b de Yggdrasil Forge

> Pega este documento no chat executor.
> **SEGUNDA das 2 sub-sub-fases de 8.7** (Validators). Tras 8.7.a
> (scaffold + ValidatorEngine + 6 regras estruturais), 8.7.b
> engade:
> 1. **3 regras complexas** en rules.ts:
>    - `noRedundantPrerequisitesRule` (warning).
>    - `progressiveDifficultyRule` (info).
>    - `balancedBranchesRule(maxDepthVariance)` (factory, info).
> 2. **`TreeEngine.validatePedagogically<R>(validator)`** —
>    modificación cirúrxica con **Inversion of Control** (cero dep
>    circular).
> 3. **Tests adicionais** (~18 tests).
> 4. **README.md update completo** (sección Validators integral).
> 5. **src/index.ts** actualizado con +3 exports.
>
> **Tras 8.7.b, paquete @validators é completo end-to-end**:
> - ValidatorEngine standalone (8.7.a) ✅
> - 6 regras estruturais (8.7.a) ✅
> - 3 regras complexas (8.7.b) ✅
> - TreeEngine.validatePedagogically integration via IoC ✅
> - README completo ✅
>
> **`valid_subtree_references` DIFERIDA totalmente** (require feature
> sub-trees aínda non implementado).
>
> **Decisión arquitectónica clave do director — Inversion of Control**:
> TreeEngine.validatePedagogically usa generic `<R>` para evitar
> dependencia circular:
> ```ts
> async validatePedagogically<R>(
>   validator: { validate(treeDef: TreeDef): Promise<R> }
> ): Promise<R> {
>   return validator.validate(this.store.getTreeDef())
> }
> ```
> **Cero importar @validators desde @core**. Usuario crea
> ValidatorEngine + rexistra regras + pásao a TreeEngine.
>
> **Decisións confirmadas polo director**:
> - **`noRedundantPrerequisitesRule`**: warning; algoritmo BFS
>   alternativo path.
> - **`progressiveDifficultyRule`**: info; usa cost[0]?.amount como
>   métrica de dificultade.
> - **`balancedBranchesRule(maxDepthVariance)`**: factory parameterizada;
>   info.
> - **TreeEngine.validatePedagogically**: IoC generic; cero dep
>   circular; engadir ao final da clase TreeEngine.
> - **Tests de integration** van en `@validators/__tests__/` (cero
>   en @core; @core cero require @validators).
> - **README substitución total**: sección Validators completa con
>   tódalas 9 regras + uso via TreeEngine.validatePedagogically.
> - **`valid_subtree_references` DIFERIDA** TOTALMENTE.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que as
> 3 regras non existen + que `validatePedagogically` non existe
> aínda en TreeEngine.
>
> 8.8 DIFERIDO.

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
- Pushed: `═══ SUB-FASE 8.7.b — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.7.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: rules.ts mantén **100/100/100/100** + as 3
regras novas chegan a 100%. TreeEngine.ts: 1 método novo con
cobertura completa via tests. Cero regresión na baseline post-8.7.a.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: cero modificación de
calquera test existente. Tódolos ~2153 tests previos deben pasar
intactos.

**0.14 — Cero modificación de ValidatorEngine.ts** (intacta desde
8.7.a). Cero modificación de types.ts (xa exportan ValidationRule,
ValidationIssue, etc.).

**0.15 — TreeEngine.ts modificación cirúrxica**: engadir 1 método
público ao final da clase. **Cero modificar outros métodos**.

**0.16 — Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente:
- 3 regras non existen en rules.ts.
- `validatePedagogically` non existe en TreeEngine.

**0.17 — Lección 8.6.a L1 reaplicada**: NodeDef.cost é
`readonly Cost[]` opcional; verificar empíricamente Cost
structure ANTES de codificar progressiveDifficultyRule.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.7.b** de Yggdrasil Forge. **SEGUNDA das 2 sub-sub-fases
de 8.7** (Validators).

**Pezas (5 grupos)**:

**Grupo A — 3 regras complexas en rules.ts (1 MODIFICADO)**:
1. `packages/validators/src/rules.ts`: engadir 3 regras (cero
   ficheiros separados).

**Grupo B — Updates src/index.ts (1 MODIFICADO)**:
2. `packages/validators/src/index.ts`: engadir 3 exports.

**Grupo C — TreeEngine integration (1 MODIFICADO)**:
3. `packages/core/src/engine/TreeEngine.ts`: engadir método público
   `validatePedagogically<R>()` ao final da clase. IoC con generic.

**Grupo D — Tests (1 MODIFICADO)**:
4. `packages/validators/__tests__/ValidatorEngine.test.ts`: engadir
   ~18 tests (3 regras + integration con TreeEngine).

**Grupo E — README + housekeeping (3 ficheiros)**:
5. `packages/validators/README.md`: substituír contido total con
   sección Validators completa.
6. `.changeset/validators-complete-8-7-b.md` (NOVO).
7. `CHANGELOG.md` (MODIFICADO).

**Total: 7 ficheiros tocados** (1 NOVO + 6 MODIFICADOS).

**Cero modificación de**:
- `packages/validators/src/ValidatorEngine.ts` (intacto desde 8.7.a).
- `packages/validators/src/types.ts` (intacto; tipos completos).
- `packages/validators/package.json`, `tsconfig.json`,
  `tsup.config.ts`, `vitest.config.ts` (scaffold intacto).
- Outros paquetes (common/storage/react/plugins/search).
- Tests existentes en outros paquetes (~2108 totais).
- TreeEngine.ts métodos existentes (engadir 1 método NOVO ao final;
  cero modificar outros).
- `package.json` root, configs root.
- MASTER.md.

**CERO deps de npm externas engadidas**. **CERO modificación de
package.json de @validators** (deps xa configuradas en 8.7.a).
**CERO modificación de package.json de @core** (cero require
importar @validators).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `04e713c`, verificada
empíricamente)**.

### MASTER §17 referencias 9 built-in

Tódalas 9 (excluído `valid_subtree_references`):
- 6 simples (8.7.a): `no_cycles`, `all_reachable_from_root`,
  `no_orphan_nodes`, `no_dead_ends`, `max_branching_factor`,
  `min_branching_factor`.
- **3 complexas (8.7.b)**:
  - `progressive_difficulty`.
  - `balanced_branches`.
  - `no_redundant_prerequisites`.

### Decisión IoC para TreeEngine.validatePedagogically

**Problema**: @validators depende de @core. Se @core depende de
@validators → circular dependency.

**Solución do director — IoC con generic**:
```ts
async validatePedagogically<R>(
  validator: { validate(treeDef: TreeDef): Promise<R> }
): Promise<R> {
  return validator.validate(this.store.getTreeDef())
}
```

**Vantaxes**:
- Cero importar @validators desde @core.
- TreeEngine cero coñece ValidatorEngine; só un structural type
  con método `validate`.
- Generic `<R>` permite que o retorno sexa o tipo concreto do
  validator pasado (ValidationReport, ou outro tipo se sub-fase
  futura engade outro validator).
- Aliñado con MASTER intent (método existe en TreeEngine).

**Posición prescrita en TreeEngine.ts**: ao final da clase
(despois do último método público existente). **Cero modificar
outros métodos**.

### TreeDef.store.getTreeDef vs this.treeDef

**TreeEngine usa `this.store.getTreeDef()`** (verificado empíricamente
en métodos existentes como `respec`, `unlock`, etc.). **Cero
`this.treeDef`** directo. **Coherencia**: usar `this.store.getTreeDef()`.

### Cost structure (necesaria para progressiveDifficultyRule)

**Verificación empírica requerida en T0.2** (lección 8.6.a L1):
- ¿Cost ten `amount`? `value`? `quantity`?
- ¿Cost ten `resourceId`?
- Estructura exacta determina algoritmo de progressiveDifficultyRule.

**Decisión preliminar (a confirmar en T0.2)**: usar **suma de
`amount` de tódolos costs** como métrica de dificultade. Se
`cost` é undefined: dificultade = 0.

### Decisión sobre noRedundantPrerequisitesRule

**Algoritmo**:
- Para cada edge directo (A → C) de tipo `dependency`:
  - Eliminar temporalmente o edge directo.
  - Facer BFS desde A seguindo outros dependency edges.
  - Se chegamos a C: o edge directo é redundante (existe path
    alternativo).
  - Restaurar o edge.
- Emitir issue por cada edge redundante.

**Severity**: warning.

**Complexidade**: O(E × (V + E)) onde V=nodes, E=edges. Aceptable
para trees pequenas-medianas (típica: <500 nodos).

### Decisión sobre progressiveDifficultyRule

**Algoritmo**:
- Construír grafo adjacency con dependency edges.
- BFS desde rootNodeId (se existe).
- Para cada edge A → B durante BFS, comparar `difficulty(B) >=
  difficulty(A)`.
- Se `difficulty(B) < difficulty(A)`: info issue (rampa de
  dificultade descendente).

**Métrica de dificultade**: suma de `amount` de `cost` array. Se
undefined: 0.

**Edge case**: rootNodeId undefined → cero issues (regra inaplicable).

**Severity**: info.

### Decisión sobre balancedBranchesRule

**Algoritmo (factory)**:
- Require `maxDepthVariance: number`.
- Se rootNodeId é undefined: cero issues.
- Para cada nodo fillo directo do root (segundo dependency edges):
  - Calcular profundidade máxima do subtree (DFS).
- Calcular `max - min` entre tódalas profundidades.
- Se `max - min > maxDepthVariance`: 1 issue global (cero nodeId
  específico).

**Severity**: info.

### Tests de integration (decisión)

**Localización**: `@validators/__tests__/ValidatorEngine.test.ts`
(engadir aos 45 tests existentes).

**Razón**: @validators **xa importa** @core (TreeDef). Pode importar
TreeEngine sen problema. **Cero require** crear test file en @core,
o que evitará importar @validators desde @core.

### Estado actual @validators (verificado tras 8.7.a)

```
packages/validators/
├── README.md                            (placeholder; substituír)
├── __tests__/
│   └── ValidatorEngine.test.ts          (45 tests; engadir +18)
├── package.json                          (intacto)
├── src/
│   ├── ValidatorEngine.ts                (88 liñas; INTACTO)
│   ├── index.ts                          (~26 liñas; engadir +3 exports)
│   ├── rules.ts                          (281 liñas; engadir +3 regras)
│   └── types.ts                          (60 liñas; INTACTO)
├── tsconfig.json                         (intacto)
├── tsup.config.ts                        (intacto)
└── vitest.config.ts                      (intacto)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `04e713c` (sub-fase 8.7.a — Validators).
- 1673 core + 60 common + 193 storage + 116 react + 35 plugins +
  32 search + 45 validators = **~2154 tests** monorepo limpo.
- Typecheck 23/23 successful.
- Lint 0/0, format 0/0.
- 50 ErrorCodes existentes.
- **Cadea 49 sub-fases consecutivas sen rollback**.
- **Paquetes activos: 7** (common, core, storage, react, plugins,
  search, validators).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir **3 regras complexas** ao paquete @validators (extensión
de `rules.ts`): **`noRedundantPrerequisitesRule`** (warning;
detección de edges redundantes vía BFS alternativo path),
**`progressiveDifficultyRule`** (info; verifica dificultade
non-descendente via cost summation), **`balancedBranchesRule(maxDepthVariance)`**
(factory, info; compara profundidades dos subtrees do root); engadir
método público **`validatePedagogically<R>(validator)`** ao
TreeEngine ao final da clase usando **Inversion of Control con
generic** para evitar dependencia circular @core ↔ @validators
(cero importar @validators desde @core; usuario crea ValidatorEngine
externamente e pásao); actualizar exports en `src/index.ts` con as
3 regras novas; engadir ~18 tests en `ValidatorEngine.test.ts`
(5-6 por regra + 3 de integration con TreeEngine real); substituír
**README.md** con sección Validators completa (uso via TreeEngine
+ 9 regras + algoritmos + ValidatorEngine standalone). **Cero
modificación** de outros métodos de TreeEngine.ts; cero modificación
de ValidatorEngine.ts ou types.ts (intactos); cero modificación de
calquera test existente.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (1)**:
- `.changeset/validators-complete-8-7-b.md`.

**MODIFICADOS (6)**:
- `packages/validators/src/rules.ts` (+3 regras).
- `packages/validators/src/index.ts` (+3 exports).
- `packages/validators/__tests__/ValidatorEngine.test.ts` (+18
  tests).
- `packages/core/src/engine/TreeEngine.ts` (+1 método novo ao
  final).
- `packages/validators/README.md` (substituír contido total).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 7 ficheiros tocados** (1 NOVO + 6 MODIFICADOS).

### 5.2 — 3 regras a engadir en rules.ts (FIXADO)

**Engadir ao final** de `packages/validators/src/rules.ts` (despois
da regra `minBranchingFactorRule`):

```ts
// ── Rule 7: no_redundant_prerequisites ─────────────────────────

/**
 * Detecta edges dependency redundantes: un edge directo A→C é
 * redundante se existe un path alternativo A→...→C usando outros
 * dependency edges.
 *
 * Algoritmo: para cada dependency edge directo, BFS desde source
 * excluíndo o edge directo; se chega ao target, é redundante.
 *
 * Complexidade O(E × (V + E)).
 * Severity: warning.
 */
export const noRedundantPrerequisitesRule: ValidationRule = {
  id: 'no_redundant_prerequisites',
  label: {
    gl: 'Sen prerrequisitos redundantes',
    es: 'Sin prerrequisitos redundantes',
    en: 'No redundant prerequisites',
  },
  severity: 'warning',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const depEdges = dependencyEdges(treeDef.edges)

    for (const directEdge of depEdges) {
      // Construír adjacency excluíndo o edge directo:
      const adj = new Map<string, string[]>()
      for (const e of depEdges) {
        if (e.id === directEdge.id) continue
        const targets = adj.get(e.source) ?? []
        targets.push(e.target)
        adj.set(e.source, targets)
      }

      // BFS desde source buscando target:
      const visited = new Set<string>()
      const queue: string[] = [directEdge.source]
      let found = false

      while (queue.length > 0) {
        const node = queue.shift()
        if (node === undefined) continue
        if (visited.has(node)) continue
        visited.add(node)

        if (node === directEdge.target && node !== directEdge.source) {
          found = true
          break
        }

        for (const next of adj.get(node) ?? []) {
          if (!visited.has(next)) queue.push(next)
        }
      }

      if (found) {
        issues.push({
          ruleId: 'no_redundant_prerequisites',
          severity: 'warning',
          message: `Edge "${directEdge.id}" (${directEdge.source}→${directEdge.target}) is redundant (alternative path exists)`,
          edgeId: directEdge.id,
        })
      }
    }

    return issues
  },
}

// ── Rule 8: progressive_difficulty ─────────────────────────────

/**
 * Suma o `amount` de todos os Cost dun array. Cero se cost undefined.
 */
function totalCost(costs: readonly Cost[] | undefined): number {
  if (costs === undefined) return 0
  let sum = 0
  for (const c of costs) {
    sum += c.amount
  }
  return sum
}

/**
 * Verifica que a dificultade (suma de cost amounts) é non-descendente
 * seguindo dependency edges desde root.
 *
 * Se rootNodeId é undefined: cero issues (regra inaplicable).
 * Severity: info.
 */
export const progressiveDifficultyRule: ValidationRule = {
  id: 'progressive_difficulty',
  label: {
    gl: 'Dificultade progresiva',
    es: 'Dificultad progresiva',
    en: 'Progressive difficulty',
  },
  severity: 'info',
  validate(treeDef: TreeDef): readonly ValidationIssue[] {
    if (treeDef.rootNodeId === undefined) return []

    const issues: ValidationIssue[] = []
    const adj = buildAdjacency(treeDef.edges)
    const difficulty = new Map<string, number>()

    for (const node of treeDef.nodes) {
      difficulty.set(node.id, totalCost(node.cost))
    }

    // BFS desde root:
    const visited = new Set<string>()
    const queue: string[] = [treeDef.rootNodeId]

    while (queue.length > 0) {
      const node = queue.shift()
      if (node === undefined) continue
      if (visited.has(node)) continue
      visited.add(node)

      const fromDifficulty = difficulty.get(node) ?? 0

      for (const next of adj.get(node) ?? []) {
        const toDifficulty = difficulty.get(next) ?? 0
        if (toDifficulty < fromDifficulty) {
          issues.push({
            ruleId: 'progressive_difficulty',
            severity: 'info',
            message: `Difficulty decreases from "${node}" (${fromDifficulty}) to "${next}" (${toDifficulty})`,
            nodeId: next,
          })
        }
        if (!visited.has(next)) queue.push(next)
      }
    }

    return issues
  },
}

// ── Rule 9: balanced_branches (factory) ────────────────────────

/**
 * Calcula a profundidade máxima do subtree desde un nodo via DFS.
 */
function subtreeDepth(
  start: string,
  adj: Map<string, string[]>,
  visited: Set<string>,
): number {
  if (visited.has(start)) return 0
  visited.add(start)
  const children = adj.get(start) ?? []
  if (children.length === 0) return 1
  let maxChildDepth = 0
  for (const child of children) {
    const d = subtreeDepth(child, adj, visited)
    if (d > maxChildDepth) maxChildDepth = d
  }
  return 1 + maxChildDepth
}

/**
 * Factory: crea unha regra que verifica que as ramas directas do
 * root teñen profundidades similares (diferenza ≤ maxDepthVariance).
 *
 * Se rootNodeId é undefined ou root cero ten fillos: cero issues.
 * Severity: info.
 *
 * @example
 * validator.registerRule(balancedBranchesRule(3))
 */
export function balancedBranchesRule(maxDepthVariance: number): ValidationRule {
  return {
    id: 'balanced_branches',
    label: {
      gl: `Ramas balanceadas (varianza máx: ${maxDepthVariance})`,
      es: `Ramas balanceadas (varianza máx: ${maxDepthVariance})`,
      en: `Balanced branches (max variance: ${maxDepthVariance})`,
    },
    severity: 'info',
    validate(treeDef: TreeDef): readonly ValidationIssue[] {
      if (treeDef.rootNodeId === undefined) return []
      const adj = buildAdjacency(treeDef.edges)
      const rootChildren = adj.get(treeDef.rootNodeId) ?? []
      if (rootChildren.length === 0) return []

      const depths: number[] = []
      for (const child of rootChildren) {
        const depth = subtreeDepth(child, adj, new Set())
        depths.push(depth)
      }

      const max = Math.max(...depths)
      const min = Math.min(...depths)
      const variance = max - min

      if (variance > maxDepthVariance) {
        return [{
          ruleId: 'balanced_branches',
          severity: 'info',
          message: `Root branches have unbalanced depths (max=${max}, min=${min}, variance=${variance}, allowed=${maxDepthVariance})`,
          nodeId: treeDef.rootNodeId,
        }]
      }

      return []
    },
  }
}

// ── FIN: Built-in validation rules ──
```

**IMPORTANTE**:
- Engadir `import type { Cost } from '@yggdrasil-forge/core'` se non
  está xa importado.
- A helper `totalCost` é interna á regra; cero exportar.
- A helper `subtreeDepth` é interna; cero exportar.
- Manter `dependencyEdges` e `buildAdjacency` helpers existentes
  (xa son privados do ficheiro).

**Decisións nesta peza**:
- **noRedundantPrerequisitesRule**: reconstrúe adjacency O(E) por
  cada edge testado. Optimizable pero cero require en 8.7.b para
  tamaños típicos.
- **progressiveDifficultyRule**: usa `cost[0]?.amount ?? 0` sumado
  por **tódolos** items de cost (cero só primeiro). Cero require
  `costPerTier`; usa só `cost` base (tier 1).
- **balancedBranchesRule**: factory parameterizada con
  `maxDepthVariance`. Calcula profundidade de cada **rama directa**
  do root. Cero recursivo (cero require profundidade real máxima
  do tree completo).
- **subtreeDepth con visited Set**: evita ciclos infinitos en trees
  con ciclos (que serían marcados por `noCyclesRule` igualmente).

### 5.3 — src/index.ts modificación (FIXADO)

**Engadir** os 3 exports despois dos 6 existentes:

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
  // 8.7.b additions:
  noRedundantPrerequisitesRule,
  progressiveDifficultyRule,
  balancedBranchesRule,
} from './rules.js'
export type {
  ValidationIssue,
  ValidationReport,
  ValidationRule,
  ValidationSeverity,
} from './types.js'
// ── FIN: @yggdrasil-forge/validators barrel ──
```

### 5.4 — TreeEngine.ts modificación cirúrxica (FIXADO)

**Engadir** ao final da clase TreeEngine (despois do último método
público existente; antes do `}` final da clase):

```ts
  // ── INICIO: 8.7.b — validatePedagogically ──
  /**
   * Executa validación pedagóxica delegada a un ValidatorEngine
   * externo. Usa **Inversion of Control con generic** para evitar
   * dependencia circular entre @core e @validators.
   *
   * O usuario crea un ValidatorEngine de @yggdrasil-forge/validators
   * (ou outro validator compatible), rexistra as regras desexadas,
   * e pásao a este método.
   *
   * @example
   * import { ValidatorEngine, noCyclesRule } from '@yggdrasil-forge/validators'
   * const validator = new ValidatorEngine()
   * validator.registerRule(noCyclesRule)
   * const report = await engine.validatePedagogically(validator)
   * if (report.hasErrors) { ... }
   *
   * @param validator Calquera obxecto cun método
   *                  `validate(treeDef): Promise<R>`.
   * @returns Resultado da validación tipo R (concreto do validator).
   */
  async validatePedagogically<R>(
    validator: { validate(treeDef: TreeDef): Promise<R> },
  ): Promise<R> {
    return validator.validate(this.store.getTreeDef())
  }
  // ── FIN: 8.7.b ──
```

**Verificación empírica obrigatoria en T0.2**:
- Confirmar que **TreeDef** é importado desde `'../types/index.js'`
  (xa debería estar; verificar).
- Localizar o último método público da clase TreeEngine para
  posición correcta.

**Decisións nesta peza**:
- **Generic `<R>`**: tipo de retorno determinado polo validator
  pasado. Tipicamente `ValidationReport` de @validators.
- **Cero importar @validators**: o tipo do parameter é estructural
  (object con método validate).
- **Cero modificar outros métodos** de TreeEngine.
- **`this.store.getTreeDef()`**: coherente con outros métodos.

### 5.5 — Tests prescritos (~18 tests adicionais)

**Engadir ao final** de
`packages/validators/__tests__/ValidatorEngine.test.ts`:

#### noRedundantPrerequisitesRule (5 tests)

46. **Tree sen edges**: cero issues.
47. **Tree con edges non redundantes**: cero issues.
48. **Tree con 1 edge redundante** (A→B, B→C, A→C): 1 issue
    para A→C.
49. **Tree con múltiples edges redundantes**: N issues.
50. **`noRedundantPrerequisitesRule` properties**: id, label,
    severity='warning'.

#### progressiveDifficultyRule (5 tests)

51. **rootNodeId undefined**: cero issues.
52. **Tree con dificultade progresiva**: cero issues.
53. **Tree con caída de dificultade A(10)→B(5)**: 1 issue para B.
54. **Tree con nodos sen cost**: dificultade=0; cero issue se
    todos 0.
55. **`progressiveDifficultyRule` properties**: id, label,
    severity='info'.

#### balancedBranchesRule (5 tests)

56. **Factory devolve regra correcta**: id, label, severity='info'.
57. **rootNodeId undefined**: cero issues.
58. **Root sen fillos**: cero issues.
59. **Ramas balanceadas** (profundidades 3, 3, 3; variance=3):
    cero issues.
60. **Ramas desbalanceadas** (profundidades 5, 2, 1; variance=3):
    1 issue global con nodeId=root.

#### Integration con TreeEngine.validatePedagogically (3 tests)

61. **`engine.validatePedagogically(validator)`** delega
    correctamente: report identical a `validator.validate(treeDef)`
    directo.
62. **Generic preservation**: tipo de retorno é `ValidationReport`
    cando validator é `ValidatorEngine`.
63. **Validator custom**: obxecto literal `{ validate: async () =>
    ({ ... }) }` funciona (cero require ValidatorEngine class).

**Total: ~18 tests adicionais**. Post-8.7.b esperado: 45 → **~63
tests en @validators**.

**Fixtures**:
- Engadir helper `makeNodeWithCost(id, costAmount)` para tests de
  progressiveDifficultyRule.
- Importar `TreeEngine` desde `@yggdrasil-forge/core` para tests de
  integration.

### 5.6 — README.md (FIXADO; substituír contido total)

**Substituír TOTAL** de `packages/validators/README.md` por:

```markdown
# @yggdrasil-forge/validators

Pedagogical validators for Yggdrasil Forge skill trees.

Detects structural and pedagogical issues in tree definitions —
cycles, unreachable nodes, dead ends, redundant prerequisites,
unbalanced branches, and more.

## Installation

\`\`\`bash
pnpm add @yggdrasil-forge/validators
\`\`\`

## Usage

### Via TreeEngine (recommended)

\`\`\`typescript
import { TreeEngine } from '@yggdrasil-forge/core'
import {
  ValidatorEngine,
  noCyclesRule,
  allReachableFromRootRule,
  noOrphanNodesRule,
  noDeadEndsRule,
  noRedundantPrerequisitesRule,
  progressiveDifficultyRule,
  maxBranchingFactorRule,
  minBranchingFactorRule,
  balancedBranchesRule,
} from '@yggdrasil-forge/validators'

const engine = new TreeEngine(treeDef)
const validator = new ValidatorEngine()

// Register desired rules:
validator.registerRule(noCyclesRule)
validator.registerRule(allReachableFromRootRule)
validator.registerRule(noOrphanNodesRule)
validator.registerRule(noDeadEndsRule)
validator.registerRule(noRedundantPrerequisitesRule)
validator.registerRule(progressiveDifficultyRule)
validator.registerRule(maxBranchingFactorRule(5))     // factory
validator.registerRule(minBranchingFactorRule(2))     // factory
validator.registerRule(balancedBranchesRule(3))       // factory

// Validate via TreeEngine:
const report = await engine.validatePedagogically(validator)

if (report.hasErrors) {
  console.error('Tree has errors:', report.issues)
}

console.log(\`Errors: \${report.errorCount}\`)
console.log(\`Warnings: \${report.warningCount}\`)
console.log(\`Info: \${report.infoCount}\`)
\`\`\`

**Why \`validatePedagogically(validator)\`?** \`@yggdrasil-forge/core\`
does not depend on \`@yggdrasil-forge/validators\` (to avoid
circular dependencies). The TreeEngine accepts any validator with
a \`validate(treeDef)\` method via Inversion of Control.

### Standalone

\`\`\`typescript
import {
  ValidatorEngine,
  noCyclesRule,
} from '@yggdrasil-forge/validators'

const validator = new ValidatorEngine()
validator.registerRule(noCyclesRule)

const report = await validator.validate(treeDef)
\`\`\`

## Built-in rules

All built-in rules are exported as named values from
\`@yggdrasil-forge/validators\`. Six are plain constants; three are
**factories** that take a configuration argument.

### Structural rules

| Rule | Severity | What it checks |
|------|----------|---------------|
| \`noCyclesRule\` | error | No cycles in dependency edges (DFS). |
| \`allReachableFromRootRule\` | error | All nodes reachable from \`rootNodeId\` via dependency edges. |
| \`noOrphanNodesRule\` | warning | No nodes without edges (any type). |
| \`noDeadEndsRule\` | warning | No non-root nodes without outgoing dependencies. |
| \`maxBranchingFactorRule(limit)\` | warning | No node has more than \`limit\` outgoing dependencies. **Factory.** |
| \`minBranchingFactorRule(limit)\` | info | Each non-leaf node has at least \`limit\` outgoing dependencies. **Factory.** |

### Pedagogical rules

| Rule | Severity | What it checks |
|------|----------|---------------|
| \`noRedundantPrerequisitesRule\` | warning | No dependency edge is redundant (no alternative path exists). |
| \`progressiveDifficultyRule\` | info | Difficulty (sum of cost amounts) does not decrease along dependency edges. |
| \`balancedBranchesRule(maxDepthVariance)\` | info | Direct branches from root have similar depth (difference ≤ variance). **Factory.** |

### Diferido / future work

- **\`valid_subtree_references\`** (referenced in MASTER §17):
  deferred until sub-trees feature is implemented.
- **Custom rules**: implement the \`ValidationRule\` interface and
  register via \`validator.registerRule(myRule)\`.

## Types

\`\`\`typescript
type ValidationSeverity = 'error' | 'warning' | 'info'

interface ValidationIssue {
  ruleId: string
  severity: ValidationSeverity
  message: string
  nodeId?: string
  edgeId?: string
}

interface ValidationRule {
  id: string
  label: LocalizedString  // gl/es/en
  severity: ValidationSeverity
  validate(treeDef: TreeDef): readonly ValidationIssue[]
}

interface ValidationReport {
  issues: readonly ValidationIssue[]
  errorCount: number
  warningCount: number
  infoCount: number
  hasErrors: boolean
}
\`\`\`

## ValidatorEngine API

| Method | Description |
|--------|-------------|
| \`registerRule(rule)\` | Add a rule (or replace by id). |
| \`unregisterRule(id)\` | Remove a rule. Returns \`true\` if removed. |
| \`validate(treeDef)\` | Run all rules. Returns \`Promise<ValidationReport>\`. |
| \`getRules()\` | Returns \`readonly ValidationRule[]\` in insertion order. |
| \`size()\` | Number of registered rules. |

## Notes

- **Dependency edges only**: structural rules use only edges with
  \`type === 'dependency'\`. Other edge types (\`soft_dependency\`,
  \`exclusion\`, \`enhancement\`, \`path\`) are ignored for graph
  analysis (except \`noOrphanNodesRule\` which checks edges of any
  type).
- **Async validate**: \`ValidatorEngine.validate\` returns a Promise.
  Built-in rules are synchronous internally, but the API is async
  to support future IO-based rules.
- **LocalizedString labels**: rule labels are \`Record<string, string>\`
  with gl/es/en variants.

## License

MIT
```

### 5.7 — Cobertura prescrita

- **rules.ts**: mantén **100/100/100/100** + 3 regras novas con
  100% (incluído edge cases: rootNodeId undefined, custom costs,
  etc.).
- **TreeEngine.ts**: baseline mantida + método novo 100% (via tests
  de integration).
- **ValidatorEngine.ts**: intacta (100/100/100/100).
- **Cero regresión** noutras pezas.

### 5.8 — Test counts esperados post-8.7.b

- **core**: 1673 tests (intactos).
- **common**: 60 tests (intactos).
- **storage**: 193 tests (intactos).
- **react**: 116 tests (intactos).
- **plugins**: 35 tests (intactos).
- **search**: 32 tests (intactos).
- **validators**: 45 + ~18 = **~63 tests**.
- **Total monorepo**: ~2154 + ~18 = **~2172 tests**.

### 5.9 — Coordinación con sub-fase 8.8

**8.8** (Read-only mode):
- Modificación cirúrxica de TreeEngine constructor para aceptar
  `readOnly: true`.
- Bloqueo de tódalas mutations cando readOnly=true.
- Tests específicos.

**Cero modificación esperada** dos artefactos de 8.7.b (validators
son operacións de lectura; cero afectados por read-only mode).

### 5.10 — Leccións aplicadas

**Lección 8.3 L1**: T0.2 verifica que `validatePedagogically` non
existe en TreeEngine + que as 3 regras non existen en rules.ts.

**Lección 8.6.a L1**: T0.2 verifica Cost structure empíricamente
(crítico para progressiveDifficultyRule).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| 3 regras complexas | TS additions | validators/src/rules.ts | +~200 |
| index.ts exports | TS additions | validators/src/index.ts | +3 modif |
| TreeEngine método novo | TS additions | core/src/engine/TreeEngine.ts | +~25 |
| Tests adicionais | TS additions | validators/tests/ValidatorEngine.test.ts | +~250 |
| README substitution | Markdown | validators/README.md | ~200 (substituír) |
| .changeset | YAML+md | .changeset/validators-complete-8-7-b.md | ~6 |
| CHANGELOG | Markdown | CHANGELOG.md | ~35 |

**Total estimado**: ~720 liñas (incluído ~250 tests + ~200 README).

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (1)**:
- `.changeset/validators-complete-8-7-b.md`

**MODIFICADOS (6)**:
- `packages/validators/src/rules.ts`
- `packages/validators/src/index.ts`
- `packages/core/src/engine/TreeEngine.ts`
- `packages/validators/__tests__/ValidatorEngine.test.ts`
- `packages/validators/README.md`
- `CHANGELOG.md`

**Total: 7 ficheiros tocados**.

**NON deben aparecer cambios en**:
- `packages/validators/src/ValidatorEngine.ts` (intacto).
- `packages/validators/src/types.ts` (intacto).
- `packages/validators/package.json`, `tsconfig.json`,
  `tsup.config.ts`, `vitest.config.ts`.
- Outros paquetes (common/storage/react/plugins/search).
- `packages/core/__tests__/` (tests de integration van en
  @validators/__tests__).
- `packages/core/package.json` (cero require @validators dep).
- Outros métodos de TreeEngine.ts (cero modificar; só engadir 1
  método novo).
- Outros ficheiros de @core (cero modificar).
- Tests existentes en outros paquetes (~2108 totais).
- `package.json` root, configs root.
- `pnpm-lock.yaml` (cero deps novas).
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en regras novas + método validatePedagogically.

**Marcadores**: `// ── INICIO: 8.7.b — <nome> ──` / `// ── FIN: 8.7.b ──`
en TreeEngine.ts. Marcadores de regra `// ── Rule 7: ... ──` en
rules.ts.

**Generic `<R>`** en validatePedagogically (cero `any`).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/validators/src/ValidatorEngine.ts`
  (intacto).
- ❌ Modificar `packages/validators/src/types.ts` (intacto).
- ❌ Modificar configs do paquete @validators.
- ❌ Modificar outros métodos de TreeEngine.ts (engadir só 1 método
  novo).
- ❌ Modificar outros ficheiros de @core.
- ❌ Importar `@yggdrasil-forge/validators` en `@core`
  (causaría circular dep). Usar IoC generic.
- ❌ Engadir `@yggdrasil-forge/validators` como dep en
  `packages/core/package.json`.
- ❌ Modificar outros paquetes (common/storage/react/plugins/search).
- ❌ Modificar **calquera test existente** (~2154 totais; engadir
  ~18 ao final de ValidatorEngine.test.ts).
- ❌ Implementar `valid_subtree_references` (DIFERIDA totalmente).
- ❌ Crear ficheiros separados por regra nova (engadir todas a
  rules.ts).
- ❌ Crear ficheiro de tests novo en @core (tests van en
  @validators).
- ❌ Engadir métodos extras en TreeEngine (só `validatePedagogically`).
- ❌ Modificar deps de npm.
- ❌ Usar `!` non-null assertions.
- ❌ Usar `any` (usar generic `<R>`).
- ❌ Modificar package.json root.
- ❌ Placeholders / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T10)

### T0 — Verificación previa + leccións aplicadas

**T0.1** — `git status` limpo. `git log -1` mostra `04e713c` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Lección 8.3 L1: confirmar que as 3 regras non existen + método
# non existe:
grep -E "noRedundantPrerequisitesRule|progressiveDifficultyRule|balancedBranchesRule" packages/validators/src/rules.ts
# Esperado: 0 matches

grep -E "validatePedagogically" packages/core/src/engine/TreeEngine.ts
# Esperado: 0 matches

# Lección 8.6.a L1: confirmar Cost structure:
grep -B 2 -A 10 "^export interface Cost " packages/core/src/types/resources.ts 2>/dev/null || \
  grep -B 2 -A 10 "^export interface Cost " packages/core/src/types/*.ts | head -20

# Confirmar NodeDef.cost type:
grep -E "readonly cost" packages/core/src/types/node.ts | head -3

# Confirmar TreeDef + rootNodeId acccesible:
grep -E "rootNodeId|nodes|edges" packages/core/src/types/tree.ts | head -5

# Confirmar TreeEngine.store.getTreeDef pattern:
grep "this\.store\.getTreeDef" packages/core/src/engine/TreeEngine.ts | head -3

# Localizar último método público de TreeEngine (para posición de
# validatePedagogically):
grep -n "^  async \|^  public " packages/core/src/engine/TreeEngine.ts | tail -5
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/core build
pnpm turbo run typecheck --force                        # 23/23
pnpm --filter @yggdrasil-forge/validators test --force  # 45 tests
pnpm --filter @yggdrasil-forge/core test --force        # 1673 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 3 regras en rules.ts

Aplicar §5.2 literal. Engadir helpers privados (`totalCost`,
`subtreeDepth`) + 3 regras (`noRedundantPrerequisitesRule`,
`progressiveDifficultyRule`, `balancedBranchesRule`).

**Tamén**: engadir `import type { Cost } from '@yggdrasil-forge/core'`
se non existe xa.

### T2 — Modificar src/index.ts (engadir 3 exports)

Aplicar §5.3 literal.

### T3 — Verificación typecheck + tests parciais

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/validators test --force    # 45 tests (regras novas aínda sen tests)
```

### T4 — Modificar TreeEngine.ts (engadir método)

Aplicar §5.4 literal. **Engadir 1 método ao final da clase**. Cero
modificar outros métodos.

**Verificación**:
```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm --filter @yggdrasil-forge/core test --force          # 1673 tests INTACTOS
```

**Especial atención**: tódolos 1673 tests core existentes deben
pasar intactos (método novo cero rompe nada).

### T5 — Engadir tests en ValidatorEngine.test.ts

Aplicar §5.5 literal (~18 tests adicionais).

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/validators test --force    # 45 + 18 = ~63 tests
pnpm --filter @yggdrasil-forge/core test --force          # 1673 INTACTOS
```

### T6 — Substituír README.md

Aplicar §5.6 literal. **Substituír TOTAL** o contido de
`packages/validators/README.md`.

### T7 — Cobertura final

```bash
pnpm --filter @yggdrasil-forge/validators exec vitest run --coverage 2>&1 | \
  grep -E "ValidatorEngine|rules\.ts|^All files" | head -5
# Esperado:
#   rules.ts: 100/100/100/100
#   ValidatorEngine.ts: 100/100/100/100 (intacta)

pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "TreeEngine|^All files" | head -5
# Esperado: cobertura igual ou superior (método novo cuberto por
# @validators tests de integration).
```

**Nota**: o método `validatePedagogically` é testado vía
`@validators/__tests__/ValidatorEngine.test.ts` (tests 61-63), non
via @core. Polo tanto a cobertura en @core require os tests do
core SEN ese método. **Se @core cobertura é 100% sen este método**:
**ok** (cobertura non se calcula transversalmente entre paquetes).

### T8 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm --filter @yggdrasil-forge/validators build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/validators/src/ \
  packages/validators/__tests__/ \
  packages/core/src/engine/TreeEngine.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

### T9 — Verificación final monorepo

```bash
pnpm turbo run typecheck --force                          # 23/23
pnpm turbo run test --force                               # tódolos paquetes
# Esperado:
#   core: 1673 (intactos)
#   common: 60 (intactos)
#   storage: 193 (intactos)
#   react: 116 (intactos)
#   plugins: 35 (intactos)
#   search: 32 (intactos)
#   validators: 45 + ~18 = ~63
```

### T10 — Changeset + CHANGELOG + commit + push

`.changeset/validators-complete-8-7-b.md`:
```
---
'@yggdrasil-forge/validators': minor
'@yggdrasil-forge/core': minor
---

feat(validators+core): 3 complex rules + TreeEngine.validatePedagogically integration (sub-phase 8.7.b)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- **3 regras pedagóxicas complexas** en \`@yggdrasil-forge/validators\`:
  - **\`noRedundantPrerequisitesRule\`** (\`warning\`): detección
    de edges dependency redundantes via BFS alternativo path.
    Algoritmo O(E × (V + E)).
  - **\`progressiveDifficultyRule\`** (\`info\`): verifica que a
    dificultade (suma de \`cost.amount\`) é non-descendente
    seguindo dependency edges desde \`rootNodeId\`. Se rootNodeId
    é undefined: regra inaplicable (cero issues).
  - **\`balancedBranchesRule(maxDepthVariance)\`** (factory,
    \`info\`): verifica que as ramas directas do root teñen
    profundidades similares. Calcula \`max - min\` profundidade
    via DFS por rama; se \`> maxDepthVariance\`: 1 issue global.
- **\`TreeEngine.validatePedagogically<R>(validator)\`**: método
  novo en \`@yggdrasil-forge/core\` que delega validación pedagóxica
  a un ValidatorEngine externo via **Inversion of Control con
  generic**. Cero importa @validators desde @core (evita
  dependencia circular). Usuario crea ValidatorEngine, rexistra
  regras, e pásao a este método.
- Actualizado \`@validators/src/index.ts\` con 3 exports novos
  (\`noRedundantPrerequisitesRule\`, \`progressiveDifficultyRule\`,
  \`balancedBranchesRule\`).

### Changed
- **README.md** de \`@yggdrasil-forge/validators\` substituído con
  sección completa: 9 regras built-in documentadas, uso via
  \`TreeEngine.validatePedagogically()\`, uso standalone, types,
  notas sobre dependency edges + LocalizedString labels.

### Note
- Sub-fase 8.7.b ÚLTIMA das 2 sub-sub-fases de 8.7. **🎯 FASE 8.7
  PECHADA**.
- **9 das 10 regras built-in implementadas**:
  - **8.7.a (6 simples)**: no_cycles, all_reachable_from_root,
    no_orphan_nodes, no_dead_ends, max_branching_factor,
    min_branching_factor.
  - **8.7.b (3 complexas)**: no_redundant_prerequisites,
    progressive_difficulty, balanced_branches.
- **\`valid_subtree_references\` DIFERIDA totalmente** (require
  feature sub-trees aínda non implementado).
- **Inversion of Control en TreeEngine.validatePedagogically**:
  evita dependencia circular @core ↔ @validators. \`@core\` cero
  importa \`@validators\`; o tipo do parameter é estructural
  (\`{ validate(treeDef): Promise<R> }\`). Generic \`<R>\` permite
  que o tipo de retorno sexa o concreto do validator (tipicamente
  \`ValidationReport\` de @validators).
- **Tests de integration** localizados en
  \`@validators/__tests__/ValidatorEngine.test.ts\` (en lugar de
  \`@core\`): @validators xa importa TreeEngine de @core; @core
  cero require importar @validators.
- **noRedundantPrerequisitesRule** algoritmo O(E × (V + E)):
  reconstrúe adjacency excluíndo edge testado por cada iteración.
  Optimizable se require para trees moi grandes; aceptable para
  tamaños típicos (<500 nodos).
- **progressiveDifficultyRule** usa \`cost\` base (tier 1)
  exclusivamente; cero require \`costPerTier\`.
- **balancedBranchesRule** factory parameterizada (cero default
  para maxDepthVariance). Mide só ramas directas do root (cero
  profundidade real máxima do tree completo).
- **Cero modificación** de:
  - ValidatorEngine.ts (intacto desde 8.7.a).
  - types.ts (intacto; tipos completos).
  - Outros métodos de TreeEngine.ts (engadir só 1 método novo).
  - Outros paquetes.
  - Calquera test existente (~2154 totais).
- **Cero ErrorCodes novos**.
- **Cero deps de npm engadidas**.
- **Cero modificación de package.json**.
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que as
  3 regras non existen + método non existe.
- **Lección 8.6.a L1 aplicada**: T0.2 verifica Cost structure
  empíricamente antes de codificar progressiveDifficultyRule.
- **🎯 FASE 8.7 COMPLETA**: ValidatorEngine + 9 built-in rules +
  TreeEngine integration. 1 sub-fase pendente da Fase 8 (8.8
  Read-only mode).
```

Commit Conventional:
`feat(validators+core): 3 complex rules + TreeEngine.validatePedagogically integration (sub-phase 8.7.b)`

Push directo a `origin/main` (base `04e713c`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.7.b — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 04e713c)
✅ 3 regras complexas engadidas a rules.ts:
   - noRedundantPrerequisitesRule (warning)
   - progressiveDifficultyRule (info)
   - balancedBranchesRule(maxDepthVariance) (factory, info)
✅ TreeEngine.validatePedagogically<R>(validator) engadido:
   - IoC con generic; cero dep circular
   - @core cero importa @validators
✅ src/index.ts actualizado con 3 exports novos
✅ README.md substituído con sección Validators completa:
   - Uso via TreeEngine.validatePedagogically (recommended)
   - Uso standalone
   - Táboas 9 regras built-in (structural + pedagogical)
   - Types + ValidatorEngine API
   - Notas (dependency edges, async, LocalizedString)
✅ T0.2 verificación empírica (leccións 8.3 L1 + 8.6.a L1):
   - 3 regras non existen aínda (libre)
   - validatePedagogically non existe (libre)
   - Cost structure verificada
   - NodeDef.cost confirmado opcional readonly Cost[]
✅ T4 verificación crítica: 1673 tests core INTACTOS tras engadir
   validatePedagogically
✅ T5 verificación tests:
   - validators: 45 + ~18 = ~63 tests
   - core: 1673 INTACTOS
   - outros paquetes INTACTOS
✅ T7 cobertura:
   - rules.ts: 100/100/100/100
   - ValidatorEngine.ts: 100/100/100/100 (intacta)
   - TreeEngine.ts: cobertura mantida (método novo testado vía
     @validators)
✅ CERO modificación de ValidatorEngine.ts (intacto)
✅ CERO modificación de types.ts (intacto)
✅ CERO modificación de outros métodos de TreeEngine
✅ CERO modificación de outros paquetes
✅ CERO modificación de calquera test existente
✅ CERO deps de npm engadidas
✅ CERO modificación de package.json (root, @validators, @core)
✅ CERO ErrorCodes novos
✅ Tests: ~2154 + ~18 = ~2172 monorepo
✅ Typecheck: 23/23 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + validators: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.7.b ÚLTIMA das 2 de 8.7.
   - 🎯 FASE 8.7 PECHADA: 9 das 10 regras built-in implementadas.
   - valid_subtree_references DIFERIDA totalmente.
   - 50 sub-fases consecutivas sen rollback.
   - Inversion of Control aplicada con éxito (cero dep circular).
   - 1 sub-fase pendente para pechar Fase 8 (8.8 Read-only mode).
✅ Changeset minor (validators + core) + nova [Unreleased]
✅ git status pre-commit: 7 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.8 (Read-only mode — última da Fase 8).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.7.b. **ÚLTIMA das 2 sub-sub-fases de 8.7**.
Engade 3 regras complexas + integration con TreeEngine via **Inversion
of Control con generic** (decisión arquitectónica clave: evita
dependencia circular @core ↔ @validators). README substituído con
sección Validators completa documentando 9 regras built-in + uso
via TreeEngine.validatePedagogically. 7 ficheiros tocados (1 NOVO
+ 6 MODIFICADOS). ~18 tests novos. Risco MEDIO: combinación de
regras complexas + modificación cirúrxica TreeEngine + README
completo; mitigado por IoC pattern + 1673 tests core protexidos.
Leccións 8.3 L1 + 8.6.a L1 aplicadas con rigor en T0.2.*

*🎯 **FASE 8.7 PECHADA TRAS 8.7.b**: ValidatorEngine + 9 built-in
rules + TreeEngine integration. 1 sub-fase pendente da Fase 8
(8.8 Read-only mode).*

*Decisións críticas documentadas:
- Inversion of Control con generic en TreeEngine.validatePedagogically.
- Cero importar @validators desde @core (evita circular dep).
- Tests integration en @validators (cero en @core).
- 3 regras complexas con algoritmos prescritos.
- noRedundantPrerequisites: BFS alternativo path O(E × (V+E)).
- progressiveDifficulty: BFS desde root + suma cost.amount.
- balancedBranches: DFS subtree depths + maxDepthVariance.
- valid_subtree_references DIFERIDA totalmente.
- progressive_difficulty usa cost base (cero costPerTier).
- balancedBranches mide só ramas directas do root.
- README substitución total con táboas estruturadas.*
