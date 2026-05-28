# BRIEFING — SUB-FASE 2.5 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión non resolta → sección 0.6 (ESCALAR).
> **Sub-fase de hardening**: pecha todos os pendentes documentados de
> validación Zod do TreeDef. Cero romper APIs; toda validación na
> fronteira (`validateTreeDef`/`fromJSON`).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/` (`mkdir -p`). NUNCA na raíz.
Rutas internas `C:/Users/tajes/proxectos/yggdrasil-forge/...`.
Un script por operación, `assert` antes de modificar.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**:
`pnpm turbo run test --filter=@yggdrasil-forge/core --force`.

**0.4 — Decisións do director non se consultan:** rama `main`; ficheiros
`python3`+`utf-8`, nunca heredoc; edición parcial `str_replace`; orde
T0→T7 estrita.

**0.5 — ANTI-PLACEHOLDER**:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
LITERAL no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. **Toda a lista de validacións
está pre-resolta (sec 5).**

**0.7 — ENTREGA E TÍTULO DE REPORTE**:
- Pushed: `═══ SUB-FASE 2.5 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.5 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` ANTES de teorizar
sobre fallos.

**0.9 — CHANGELOG (DT-12, A.6 L4)**: nova cabeceira `## [Unreleased]`
ao principio; NON consolidar.

**0.10 — exactOptionalPropertyTypes (lección post-2.4.e)**: o repo ten
`exactOptionalPropertyTypes: true`. Para campos opcionais cuxo valor
pode ser `undefined`, usa spread condicional: `...(value !== undefined
&& { field: value })`.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.5** de Yggdrasil Forge. **Penúltima de Fase 2.**
Tipo: **hardening de validador** — engadir todas as validacións Zod
pendentes documentadas durante toda a Fase 2.

Roadmap orixinal: AuthProviderRegistry (descartado polo director —
non ten consumidor real ata Fase 5 cando se implementen
`remote`/`callback`/`event` sources; sería infraestrutura sen uso e
xeraría débeda).

---

## 2. CONTEXTO MÍNIMO

Tras pechar familia 2.4 (854 tests, cobertura 98.22%), hai **9
pendentes documentados** de validación Zod do TreeDef que o validador
**non rexeita actualmente**, deixando que o motor manexe entrada
inválida defensivamente. Esta sub-fase peche eses 9 pendentes movendo
a validación á fronteira (lugar correcto).

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `9afd412`.
- 854 tests pasan en core (42 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **Esquema Zod localizado en `packages/core/src/engine/treeDefSchema.ts`**
  (441 liñas). `TreeDefValidator.ts` é só wrapper (99 liñas; non
  precisa modificación nesta sub-fase).
- **Cero `.refine()` actualmente** no schema (verificado co director).
- ErrorCode `INVALID_TREE_DEF = YGG_V001` xa existe.
  **Reutilizable** — cero ErrorCode novo necesario.
- Validador só corre na fronteira (`validateTreeDef`,
  `JsonSerializer.fromJSON`); o motor segue defensivo internamente
  (decisión coherente, **mantense**).
- DT-9, DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir as 10 validacións Zod pendentes ao `treeDefSchema.ts` (campos
puntuais con `.refine`, cross-field con `.refine` no `nodeDefSchema`,
cross-node con `.superRefine` no `treeDefShapeSchema`), reutilizando
`INVALID_TREE_DEF`, **sen romper ningún test existente**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Toda a validación queda na FRONTEIRA

Cero modificación do motor interno (TreeEngine, ProgressManager,
EffectsRunner, etc.). O motor **mantén comportamento defensivo**
cando recibe TreeDefs construídas directamente sen pasar polo
validador (uso típico en tests unitarios).

**Asimetría deliberada**:
- Entrada externa (`validateTreeDef`, `fromJSON`) → **rexeita** TreeDefs
  inválidas (esta sub-fase).
- Construción directa en código → motor **manexa defensivamente**
  (comportamento actual; non se rompe).

Ambos comportamentos son correctos e complementarios. Documenta no
comentario de cabeceira de `treeDefSchema.ts`.

### 5.2 — As 10 validacións a engadir

Numero cada unha. **Implementa exactamente esta lista**.

**Validacións por campo dentro de `nodeDefSchema`** (a cada campo
opcional, engadir `.refine()` cando se define):

1. **`maxTier > 0`** se definido. Mensaxe Zod: `'maxTier debe ser
   maior que 0'`.
2. **`tier > 0`** se definido. Mensaxe: `'tier debe ser maior que 0'`.
3. **`progressMilestones[i]` en `[0, 100]`** cada un. Mensaxe:
   `'progressMilestones debe conter só valores en [0, 100]'`.
4. **`progressMilestones`** estrictamente ordenado ascendentemente.
   Mensaxe: `'progressMilestones debe estar ordenado ascendentemente
   sen duplicados'`.

**Validacións por campo dentro doutros schemas**:

5. **`cost.amount > 0`** dentro de `costSchema`. Mensaxe: `'amount
   debe ser maior que 0'`.
   - **T0 verifica primeiro** se xa está validado (improbable, pero
     verifícao). Se xa está, **omite esta**.

**Validacións cross-field a nivel `nodeDefSchema` enteiro** (`.refine`
no nodeDefSchema):

6. **Se `progressSource` definido, `supportsProgress === true`**.
   Sen `supportsProgress` (undefined ou false) + `progressSource`
   definido → erro. Mensaxe: `'progressSource require supportsProgress:
   true'`.

**Validacións cross-node a nivel `treeDefShapeSchema` enteiro**
(`.superRefine`):

7. **`dependsOn` de `progressSource.computed`** apunta a nodos
   existentes. Path do erro: a cada `nodeId` inexistente, sinala con
   `path: ['nodes', i, 'progressSource', 'dependsOn', j]`. Mensaxe:
   `'dependsOn referencia nodo inexistente: "{depId}"'`.
8. **`prerequisites`** referencia nodos existentes. Recursivo na
   árbore de `UnlockRule` (`type: 'all' | 'any' | 'none'`). Cando
   chegue a `type: 'node_unlocked' | 'node_maxed' | 'node_state' |
   'tier_min' | 'distance_max' | 'progress_min'`, verifica que
   `nodeId` existe. Igual para `stat_min` (`statId` existe en
   `treeDef.stats`).
   Path: `['nodes', i, 'prerequisites', ...]`. Mensaxe: `'prerequisite
   referencia nodo/stat inexistente: "{id}"'`.
9. **`exclusions[]`** referencia nodos existentes. Path: `['nodes',
   i, 'exclusions', j]`. Mensaxe: `'exclusion referencia nodo
   inexistente: "{nodeId}"'`.
10. **`edges.from/to`** referencian nodos existentes. Path: `['edges',
    i, 'from'|'to']`. Mensaxe: `'edge referencia nodo inexistente:
    "{nodeId}"'`.

### 5.3 — Implementación: `.refine` vs `.superRefine`

- **Por campo único** (1-4): cada campo define o seu propio `.refine`
  na liña de declaración.
  Ex: `maxTier: z.number().positive().optional()` ou
  `maxTier: z.number().refine(v => v > 0, 'maxTier debe ser maior que
  0').optional()`. **Usa `.positive()` cando exista**; é máis idiomático.
- **Cross-field nun mesmo obxecto** (6): `.refine` despois do
  `.object({...})`.
- **Cross-node** (7-10): `.superRefine` no `treeDefShapeSchema`
  enteiro (que ten acceso ao mapa completo de nodos para verificar
  referencias).

### 5.4 — `superRefine` para cross-node: estrutura

```ts
treeDefShapeSchema = z.object({...}).superRefine((tree, ctx) => {
  const nodeIds = new Set(tree.nodes.map(n => n.id))
  const statIds = new Set((tree.stats ?? []).map(s => s.id))

  // 7. computed.dependsOn
  tree.nodes.forEach((node, i) => {
    if (node.progressSource?.type === 'computed') {
      node.progressSource.dependsOn.forEach((depId, j) => {
        if (!nodeIds.has(depId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['nodes', i, 'progressSource', 'dependsOn', j],
            message: `dependsOn referencia nodo inexistente: "${depId}"`,
          })
        }
      })
    }
  })

  // 8. prerequisites (recursivo sobre UnlockRule)
  // 9. exclusions
  // 10. edges
  // ... helpers internos
})
```

**Decide pola limpeza**: probablemente un helper privado
`collectNodeReferences(rule: UnlockRule, path: PathPrefix, ctx,
nodeIds, statIds)` que recorre `UnlockRule` recursivamente.

### 5.5 — Cero validación nova de "ciclos en prerequisites/dependsOn"

**Fóra de alcance**: detección de ciclos (un nodo cuxo prereq
referencia outro que indirectamente referencia o primeiro, ou
`computed.dependsOn` ciclo). Razóns:
- Ciclos son detectados defensivamente polo motor en runtime
  (`UnlockResolver`, `ProgressManager`).
- Validación de ciclos require recorrido de grafo en Zod; é
  achievable pero engade complexidade. **Diferido a sub-fase de
  consolidación futura ou Fase 8.7** (pedagóxica) segundo o MASTER
  liña 4 do `TreeDefValidator.ts`.

Documenta isto explicitamente.

### 5.6 — Cero modificación do `JsonSerializer`

`JsonSerializer.fromJSON` xa chama `validateTreeDef` → automáticamente
beneficias das validacións novas. Cero código novo.

### 5.7 — Cero ErrorCode novo

Reutiliza `INVALID_TREE_DEF` (YGG_V001) co contexto enriquecido. Os
issues que devolve Zod inclúen `path` (ruta ao campo) e `message`
(motivo). O contexto do `YggdrasilError` xa serializa esos issues
(implementado en 1.17).

### 5.8 — Test del comportamiento intermedio (lección 2.4.d L2)

Esta sub-fase **pode romper tests de integration que asuman que
TreeDefs inválidas pasan por `fromJSON`/`validateTreeDef`**. T0
verifica:
- `untrusted-input.test.ts` (xa probablemente conforme; non cubría
  estes casos).
- Calquera test que use `fromJSON` con TreeDefs deliberadamente
  malformadas.

**Se algún test rompe por agora rexeitar TreeDefs antes válidas
estructuralmente pero inválidas pedagóxicamente, ESCALA (0.6)**: pode
ser que o test sexa lexítimo (probaba a defensa do motor); requiriría
adaptación cidadosa.

### 5.9 — Cero modificación de `types/` ou `engine/index.ts`

Toda a sub-fase queda en `treeDefSchema.ts` + tests. **Cero exports
novos**.

### 5.10 — Tests de regresión do motor

Despois de engadir as validacións, **executa os 854 tests existentes
e verifica que cero rompe**. Se algún rompe:
- (a) Test deliberadamente usa TreeDef estructuralmente válida pero
  agora rexeitada → **escala**.
- (b) Test usaba construción directa de TreeDef (non `fromJSON`) → non
  debería romper, porque non pasa por validador. **Investiga e
  reporta**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións SÓ en:
- `packages/core/src/engine/treeDefSchema.ts` — engadir `.refine` aos
  campos (1-5), `.refine` no nodeDefSchema (6), `.superRefine` no
  treeDefShapeSchema (7-10).

Tests:
- `packages/core/__tests__/engine/TreeDefValidator.test.ts` —
  estender. Un teste positivo + un negativo por cada das 10
  validacións = 20 tests. Mínimo. Se algún caso encaixa naturalmente
  noutro, fundes; non duplicidades.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións previas
1. `pnpm install`. Confirma 854 tests `--force`.
2. **Verifica** o estado actual de validacións Zod xa existentes:
   `grep -n "\.refine\|\.positive\|\.min\|\.max\|\.superRefine"
   packages/core/src/engine/treeDefSchema.ts`. Reporta no chat se
   xa hai algunha (sobre todo en `cost.amount` — validación 5).
3. **Verifica** que `untrusted-input.test.ts` non cobre xa estas
   validacións: `grep -A5 "INVALID_TREE_DEF" packages/core/__tests__/integration/untrusted-input.test.ts`.
4. **Busca** os tests que poderían romper con validacións cross-node:
   `grep -rn "fromJSON\|validateTreeDef" packages/core/__tests__/ |
   head -20`. Reporta cantos hai e onde están.

### T1 — Validacións por campo (1-5)
Modifica `treeDefSchema.ts`. Engade `.refine` ou `.positive()` aos 4
campos do `nodeDefSchema` (maxTier, tier, progressMilestones rango,
progressMilestones orden) e ao campo amount de `costSchema`.

Typecheck 20/20.

### T2 — Validación cross-field no `nodeDefSchema` (6)
Despois do `.object({...})` do nodeDefSchema, engade `.refine` que
verifique: se `progressSource` está definido, `supportsProgress`
debe ser `true`.

### T3 — Validacións cross-node co `.superRefine` (7-10)
Implementa o `.superRefine` no `treeDefShapeSchema` final. Estructura
segundo 5.4. Helper interno `collectRuleReferences` para `UnlockRule`
recursivo.

### T4 — Tests positivos e negativos
Estende `TreeDefValidator.test.ts`. Por cada validación 1-10, **un test
positivo** (TreeDef válida pasa) e **un test negativo** (TreeDef
inválida rexeitada con `INVALID_TREE_DEF` e o issue correcto en
`error.context.issues`).

Verifica `path` e `message` exactos dos issues nos tests negativos.

### T5 — Regresión: verificar que 854 tests previos seguen pasando
**Crítico**. Calquera test que rompa debe analizarse caso a caso (5.8,
5.10). Se require modificación dun test existente, **escala (0.6)**
antes de modificalo.

### T6 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
LITERAL. LITERAL.

- Changeset **minor** — só `@yggdrasil-forge/core` (common NON se
  toca; verifícao co `git diff --stat`).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  - Added: validacións Zod novas no `treeDefSchema`: maxTier>0,
    tier>0, cost.amount>0, progressMilestones (rango [0,100] e
    orden ascendente), progressSource require supportsProgress=true.
  - Added: validacións cross-node no `treeDefSchema.superRefine`:
    progressSource.computed.dependsOn, prerequisites, exclusions, e
    edges.from/to referencian nodos/stats existentes.
  - Note: motor mantén defensa interna (construción directa de
    TreeDef en código non pasa polo validador). Validación está na
    fronteira (`fromJSON`, `validateTreeDef`).
  - Note: ciclos en prerequisites/dependsOn seguen FÓRA do
    validador (asignados a Fase 8.7 pedagóxica); detéctanse
    defensivamente polo motor en runtime.

### T7 — Commit + push
Commit Conventional: `feat(core): harden Zod validator with field and
cross-node checks (sub-phase 2.5)`. Push directo a `origin/main` (base
`9afd412`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/treeDefSchema.ts` (modificado: +N
  refinamentos)
- `packages/core/__tests__/engine/TreeDefValidator.test.ts`
  (modificado: +20 tests aprox)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]`)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/src/types/`, `packages/core/src/engine/TreeDefValidator.ts`,
`packages/core/src/engine/JsonSerializer.ts`, calquera peza do motor
(`TreeEngine.ts`, `ProgressManager.ts`, `EffectsRunner.ts`,
`StatComputer.ts`, `UnlockResolver.ts`, `TimeManager.ts`),
`engine/index.ts`, `pnpm-lock.yaml`, `core/package.json`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (segue o estilo do ficheiro
existente; mira `treeDefSchema.ts` actual). Marcadores `// ──
INICIO/FIN ──` para bloques novos. 2 espazos, comilla simple, sen
`;`, trailing commas, máx 100 cols, UTF-8 LF. TS strict, **cero
`any`**. NON desactives Biome.

Mensaxes Zod: **sen punto final** (consistencia co estilo dos
ErrorCodes existentes E001-E022).

---

## 9. QUE NON FACER

- ❌ Engadir ErrorCodes (5.7: reutiliza `INVALID_TREE_DEF`).
- ❌ Tocar `TreeDefValidator.ts`, `JsonSerializer.ts` (5.6).
- ❌ Tocar `types/` (5.9).
- ❌ Tocar pezas do motor (filosofía 5.1: validador é fronteira).
- ❌ Engadir validación de ciclos (5.5).
- ❌ Modificar tests existentes para que pasen (5.8: escala antes).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12, A.6 L4).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1).

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.5 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 9afd412)
✅ Validacións Zod engadidas (10 totais):
   - Por campo: maxTier>0, tier>0, cost.amount>0,
     progressMilestones rango [0,100] + orden ascendente
   - Cross-field: progressSource require supportsProgress=true
   - Cross-node: dependsOn, prerequisites, exclusions, edges.from/to
     referencian nodos/stats existentes
✅ Reutiliza INVALID_TREE_DEF (cero ErrorCode novo)
✅ Cero modificación de pezas do motor (5.1: validador é fronteira)
✅ Motor mantén defensa interna para construción directa
✅ T0 cost.amount: <xa validado | engadido como #5>
✅ T0 tests fromJSON / validateTreeDef: <N atopados>; cero rompen
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / treeDefSchema.ts <Y%>
   (baseline 2.4.e: 98.22% global; non debe baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: ciclos en prerequisites/dependsOn fóra
   (5.5; Fase 8.7 pedagóxica; motor defensivo en runtime).
✅ Changeset minor (core; common NON tocado) + nova [Unreleased]
   (DT-12, non consolidada)
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.6 (tests integración Fase 2) — pecha Fase 2.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR
(parche xerado)".

---

*Fin do briefing 2.5. Hardening na fronteira; motor defensivo interno
mantido. Calquera caso non cuberto → ESCALAR (0.6).*
