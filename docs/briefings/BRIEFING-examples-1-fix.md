# BRIEFING — SUB-FASE examples-1-fix de Yggdrasil Forge

> Pega este documento no chat executor.
> **CORRECCIÓN cirúrxica de examples-1**. Engade `prerequisites`
> aos NodeDefs do exemplo para que paso 5 (unlock skill-c sen
> prereqs) falle como pedagóxicamente prescrito.
>
> **Achado crítico do director (verificado empíricamente)**:
> `'dependency'` edges en EdgeDef son **visualización + navegación**,
> NON enforce de prerequisitos. UnlockResolver consulta
> **`NodeDef.prerequisites: UnlockRule`** (discriminated union)
> para enforcement runtime. **A lección 8.6.a L1 cero foi aplicada
> correctamente** ao redactar examples-1 (Director asumiu semántica
> baseada en nome do tipo de edge).
>
> **Pezas (5 grupos)**:
> 1. **Modificar `examples/node-basics/src/index.ts`**: engadir
>    `prerequisites` a skill-b + skill-c.
> 2. **Modificar `examples/node-basics/README.md`**: nova sección
>    "Prerequisites vs dependency edges" + actualizar expected
>    output (paso 5 agora mostra erro PREREQUISITES_NOT_MET).
> 3. **Capturar lección estrutural** no MASTER: nova entrada
>    A.6.9 (examples-1 L1 sobre dependency edges vs prerequisites).
> 4. **Auto-tracking** briefing (convención A.5.2).
> 5. **Housekeeping** (.changeset + CHANGELOG).
>
> **Decisións confirmadas polo director**:
> - **Sintaxe UnlockRule simple**: `prerequisites: { type:
>   'node_unlocked', nodeId: 'skill-a' }` (UnlockCondition directa,
>   cero wrapping en `{type:'all', conditions:[...]}`).
> - **Manter dependency edges**: son válidos como visualización;
>   cero borrar.
> - **README sección educativa** explicando a distinción.
> - **Lección estrutural en novo A.6.9** (primeira lección fora
>   da Fase 8; primeira da "Fase examples").
> - **Risco MOI BAIXO**: cambio cirúrxico (~15 liñas index.ts +
>   ~25 liñas README + ~30 liñas MASTER).
>
> **APIs verificadas empíricamente** (lección 8.6.a L1 aplicada
> con rigor esta vez):
> - `UnlockRule` é discriminated union: `'all' | 'any' | 'none'`
>   + array conditions, ou `UnlockCondition` directa.
> - `UnlockCondition`: `{ type: 'node_unlocked', nodeId: string }`
>   é a forma para "require que outro nodo estea unlocked".
> - `NodeDef.prerequisites?: UnlockRule` (opcional).
> - `PREREQUISITES_NOT_MET = 'YGG_E003'` é o ErrorCode emitido
>   cando UnlockResolver detecta condicións non cumpridas.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1** — Scripts en `/tmp/ygg-exec/`.

**0.2** — `.gitignore` intacto.

**0.3** — Tests SEMPRE con `--force`** (cero novos esperados;
verificar baseline).

**0.4** — Decisións do director non se consultan.

**0.5** — ANTI-PLACEHOLDER grep literal no reporte.

**0.6** — ESCALADO: decisión non resolta → PARA.

**0.7** — TÍTULOS PRESCRITOS:
- Pushed: `═══ SUB-FASE examples-1-fix — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE examples-1-fix — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8** — `git am`: `git status` + `git log -1` antes de teorizar.

**0.9** — CHANGELOG (DT-12): nova `[Unreleased]`.

**0.10 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 ficheiros .ts modificados nos paquetes existentes** (@core,
  @common, @storage).
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 modificacións de configs**.
- Tódolos **2195 tests** deben seguir pasando inchanged.

**0.11 — VERIFICACIÓN CRÍTICA T5 OBRIGATORIA**: executar `pnpm
--filter @yggdrasil-forge-examples/node-basics start` e confirmar
que paso 5 **agora si falla** con mensaxe PREREQUISITES_NOT_MET.
Se cero falla → ESCALAR.

**0.12** — Convención A.5.2 (auto-tracking briefings): copia
este briefing a `docs/briefings/BRIEFING-examples-1-fix.md`.

**0.13** — Lección 8.6.a L1: o Director aplicou empíricamente
esta vez (verificou UnlockRule estructura + UnlockResolver lóxica
antes de prescribir).

---

## 1. IDENTIFICACIÓN

Sub-fase **examples-1-fix**. **Corrección cirúrxica** de
examples-1 (commit `a9c9909`).

**Pezas (5 grupos)**:

**Grupo A — Corrixir exemplo Node.js (2 MODIFICADOS)**:
1. `examples/node-basics/src/index.ts` (engadir `prerequisites`
   a 2 nodos).
2. `examples/node-basics/README.md` (nova sección + atualizar
   expected output).

**Grupo B — Capturar lección estrutural (1 MODIFICADO)**:
3. `docs/architecture/MASTER.md` (engadir nova subsección A.6.9).

**Grupo C — Auto-tracking briefing (1 NOVO)**:
4. `docs/briefings/BRIEFING-examples-1-fix.md`.

**Grupo D — Housekeeping (2 ficheiros)**:
5. **NOVO** `.changeset/examples-1-fix-prerequisites.md`.
6. **MODIFICADO** `CHANGELOG.md`.

**Total: 6 ficheiros tocados** (2 NOVOS + 4 MODIFICADOS).

**Cero modificación de**:
- Calquera ficheiro en `packages/`.
- Configs root.
- `pnpm-workspace.yaml`.
- Tests existentes.
- READMEs dos paquetes.
- `pnpm-lock.yaml`.
- Outros ficheiros do exemplo (package.json, tsconfig.json).

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría sobre commit `a9c9909`, verificada empíricamente**.

### Achado crítico do reporte do Executor

Reporte examples-1 dixo:
> *"O paso 5 do exemplo (unlock bloqueado por prereqs) non produce
> output visible — a semántica de dependency edges permite unlock
> sen prereqs neste contexto."*

### Verificación empírica do Director

**UnlockRule estructura** (verificada en `packages/core/src/types/unlock.ts`):
```ts
export type UnlockRule =
  | { readonly type: 'all'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'any'; readonly conditions: readonly UnlockCondition[] }
  | { readonly type: 'none'; readonly conditions: readonly UnlockCondition[] }
  | UnlockCondition
```

**UnlockCondition** (uso máis simple):
```ts
{ readonly type: 'node_unlocked'; readonly nodeId: string }
```

**NodeDef.prerequisites** (verificado en `packages/core/src/types/node.ts`):
```ts
readonly prerequisites?: UnlockRule
```

**ErrorCode esperado**: `PREREQUISITES_NOT_MET = 'YGG_E003'`.

### Decisión arquitectónica

**`'dependency'` edges** en EdgeDef son:
- **Visualización**: renderizar arestas no canvas.
- **Navegación**: BFS/DFS para layouts, search, validators.
- **Documentación**: comentar relacións.

**`NodeDef.prerequisites: UnlockRule`** é:
- **Runtime enforcement** real do unlock.
- Consultado por UnlockResolver.
- Emite `PREREQUISITES_NOT_MET` (YGG_E003) cando non cumprido.

**Decisión do director**: na exemplo, engadir `prerequisites` a
skill-b e skill-c (apuntando ao skill anterior). Manter dependency
edges (son válidos como visualización).

### Sintaxe prescrita (FIXADA)

```ts
{
  id: 'skill-b',
  type: 'small',
  label: { ... },
  prerequisites: { type: 'node_unlocked', nodeId: 'skill-a' },
}

{
  id: 'skill-c',
  type: 'small',
  label: { ... },
  prerequisites: { type: 'node_unlocked', nodeId: 'skill-b' },
}
```

**Cero usar** `{type:'all', conditions:[{type:'node_unlocked',
nodeId:'a'}]}` (máis verboso; cero require para 1 sola condition).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `a9c9909` (examples-1).
- **2195 tests monorepo limpos**.
- Typecheck 24/24 successful (engadiu examples).
- 76 ErrorCodes.
- **57 sub-fases consecutivas sen rollback** (récord).
- 7 paquetes activos + 1 exemplo + 13 scaffold.
- `examples/node-basics/` activo con T5 OK pero paso 5 cero
  funciona como prescrito.

---

## 4. OBXECTIVO (unha frase)

Corrixir cirúrxicamente `examples/node-basics/src/index.ts`
engadindo `prerequisites: { type: 'node_unlocked', nodeId: '<prev>' }`
a skill-b (require skill-a) e skill-c (require skill-b) para que
o paso 5 (unlock skill-c antes de unlock skill-b) **realmente
falle** con `PREREQUISITES_NOT_MET` como pedagóxicamente prescrito;
actualizar README con sección **"Prerequisites vs dependency edges"**
que explica a distinción semántica (edges = visualización +
navegación; prerequisites = runtime enforcement) e actualizar
expected output; **capturar lección estrutural examples-1 L1** no
MASTER (nova subsección A.6.9; primeira lección fora da Fase 8)
sobre o achado; **cero modificación de ficheiros .ts dos paquetes
existentes**; **2195 tests inchanged**; **verificación crítica
T5 obrigatoria** require que paso 5 agora falle. Risco MOI BAIXO.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (2)**:
- `docs/briefings/BRIEFING-examples-1-fix.md`.
- `.changeset/examples-1-fix-prerequisites.md`.

**MODIFICADOS (4)**:
- `examples/node-basics/src/index.ts`.
- `examples/node-basics/README.md`.
- `docs/architecture/MASTER.md`.
- `CHANGELOG.md`.

**Total: 6 ficheiros tocados**.

### 5.2 — `examples/node-basics/src/index.ts` modificación cirúrxica (FIXADO)

**Localización**: nodos `skill-b` e `skill-c` en `treeDef.nodes`.

**Modificación 1 — skill-b**:

**Antes**:
```ts
{
  id: 'skill-b',
  type: 'small',
  label: { gl: 'Habilidade B', es: 'Habilidad B', en: 'Skill B' },
},
```

**Despois**:
```ts
{
  id: 'skill-b',
  type: 'small',
  label: { gl: 'Habilidade B', es: 'Habilidad B', en: 'Skill B' },
  prerequisites: { type: 'node_unlocked', nodeId: 'skill-a' },
},
```

**Modificación 2 — skill-c**:

**Antes**:
```ts
{
  id: 'skill-c',
  type: 'small',
  label: { gl: 'Habilidade C', es: 'Habilidad C', en: 'Skill C' },
},
```

**Despois**:
```ts
{
  id: 'skill-c',
  type: 'small',
  label: { gl: 'Habilidade C', es: 'Habilidad C', en: 'Skill C' },
  prerequisites: { type: 'node_unlocked', nodeId: 'skill-b' },
},
```

**Cero modificar** outros nodos (skill-a queda igual; cero
prereqs).

**Cero modificar** dependency edges (mantéñense como visualización).

**Cero modificar** outras pezas do index.ts (engine creation, unlock
calls, snapshot logic).

### 5.3 — `examples/node-basics/README.md` modificacións (FIXADO)

**Modificación 1 — Actualizar "Expected output"**:

**Antes**:
```
▶ unlock(skill-c) bloqueado correctamente: ...
```

**Despois**:
```
▶ unlock(skill-c) bloqueado correctamente: <PREREQUISITES_NOT_MET message>
```

(Manter o "..." se o briefing orixinal o tiña; cero alterar
unnecessarily o resto do output esperado.)

**Modificación 2 — Engadir nova sección antes de "Key concepts shown"**:

```markdown
## Prerequisites vs dependency edges

Yggdrasil Forge has **two distinct mechanisms** for expressing
relationships between nodes:

### `dependency` edges (visualization + navigation)

\`\`\`ts
edges: [
  { id: 'e1', source: 'skill-a', target: 'skill-b', type: 'dependency' },
]
\`\`\`

Used by the renderer to draw arrows, by graph layouts (Tree,
Radial), and by search/navigation features. **They do NOT enforce
unlock prerequisites at runtime.**

### `NodeDef.prerequisites` (runtime enforcement)

\`\`\`ts
{
  id: 'skill-b',
  type: 'small',
  label: { ... },
  prerequisites: { type: 'node_unlocked', nodeId: 'skill-a' },
}
\`\`\`

This is what `TreeEngine.unlock()` consults. If unmet, the call
returns `{ ok: false, error }` with `PREREQUISITES_NOT_MET`
(`YGG_E003`).

### Why both?

- Edges enable rich visualization (multiple edge types: `dependency`,
  `soft_dependency`, `exclusion`, `enhancement`, `path`).
- Prerequisites allow flexible rules beyond pairwise edges (e.g.,
  "unlock if any of [A, B, C] is unlocked", "unlock if resource X
  ≥ 100", etc.) via `UnlockRule` discriminated unions.

This example uses **both consistently**: dependency edges for
visualization (a→b→c chain) + prerequisites for enforcement (skill-b
requires skill-a; skill-c requires skill-b).
```

### 5.4 — `docs/architecture/MASTER.md` modificación (FIXADO)

**Localizar** o final da subsección A.6.8 (leccións estructurais
Fase 8 establecida en doc-8).

**Engadir despois** unha nova subsección A.6.9:

```markdown
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
```

### 5.5 — Verificación T5 crítica (OBRIGATORIA)

Tras as modificacións, executar:

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

**Output esperado** (paso 5 agora debe fallar):
```
▶ TreeEngine criado co tree: sample-tree
  Nodos: 3
  Edges: 2

▶ canUnlock(skill-a): OK
▶ unlock(skill-a): OK (tier 1)
▶ unlock(skill-c) bloqueado correctamente: <PREREQUISITES_NOT_MET message>
▶ unlock(skill-b): OK
▶ unlock(skill-c): OK (cadea completa)

▶ Snapshot creado: build-...
▶ lock(skill-a): OK
  skill-a estado tras lock: locked
▶ restoreSnapshot: OK
  skill-a estado tras restore: unlocked ✓

✓ Exemplo completado correctamente.
```

**Clave**: o paso 5 **DEBE** mostrar a mensaxe de erro
PREREQUISITES_NOT_MET. Se cero a mostra → **ESCALAR**.

### 5.6 — Garantía pure correction

- **0 ficheiros .ts modificados** en /packages/.
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 modificacións de configs**.
- **2195 tests inchanged**.
- **Typecheck 24/24 inchanged**.

### 5.7 — Lección 8.6.a L1 aplicada (esta vez con rigor)

**T0.2 verifica empíricamente**:
- `UnlockRule` é discriminated union (verificado).
- `UnlockCondition` con `{type:'node_unlocked', nodeId}` é válido
  (verificado).
- `NodeDef.prerequisites` é opcional `UnlockRule` (verificado).
- `PREREQUISITES_NOT_MET` está en codes.ts como `YGG_E003`
  (verificado).

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Liñas aprox |
|---|---|---|
| index.ts: +prerequisites a 2 nodos | MODIFICADO | +2 (1 por nodo) |
| README.md: nova sección + output update | MODIFICADO | +50 |
| MASTER.md: nova A.6.9 | MODIFICADO | +50 |
| BRIEFING-examples-1-fix.md | NOVO | (este) |
| .changeset | NOVO | ~6 |
| CHANGELOG | MODIFICADO | ~25 |

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (2)**:
- `docs/briefings/BRIEFING-examples-1-fix.md`.
- `.changeset/examples-1-fix-prerequisites.md`.

**MODIFICADOS (4)**:
- `examples/node-basics/src/index.ts`.
- `examples/node-basics/README.md`.
- `docs/architecture/MASTER.md`.
- `CHANGELOG.md`.

**Total: 6 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera ficheiro en `packages/`.
- Configs (tsconfig, tsup, vitest, package.json root,
  pnpm-workspace.yaml).
- Tests.
- Outros ficheiros do exemplo (package.json, tsconfig.json).
- `pnpm-lock.yaml`.
- Outras secciones do MASTER (só A.6.9 nova; non modificar A.6.X
  existentes).
- Os 86 briefings xa en docs/briefings/ (inchanged).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

**TypeScript**: strict mode (heredado). Cero `any`.

**2 espazos, comilla simple, sen `;`, trailing commas, máx 100
cols, UTF-8 LF**.

**Cero non-null assertions** (`!`).

**Markdown**: encabezados xerárquicos coherentes.

**Lección estrutural en MASTER**: formato idéntico a A.6.8 (Fase 8).

---

## 9. QUE NON FACER

- ❌ Modificar **calquera ficheiro .ts** en `/packages/`.
- ❌ Modificar `package.json` ou `tsconfig.json` do exemplo.
- ❌ Modificar dependency edges (mantéñense como visualización).
- ❌ Modificar outras pezas do `index.ts` (engine, unlock, snapshot).
- ❌ Borrar skill-a (debe quedar sen prereqs como primeiro nodo
  da cadea).
- ❌ Engadir `prerequisites` a skill-a (cero ten prereqs).
- ❌ Usar sintaxe `{type:'all', conditions:[...]}` para 1 sola
  condition (innecesariamente verboso).
- ❌ Modificar outras subsecciones A.6.X do MASTER (só engadir
  A.6.9).
- ❌ Modificar tests.
- ❌ Engadir tests novos.
- ❌ Modificar configs root ou pnpm-workspace.yaml.
- ❌ Engadir deps de npm.
- ❌ Placeholders / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T7)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `a9c9909` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar UnlockRule estructura:
grep -B 1 -A 5 "^export type UnlockRule" packages/core/src/types/unlock.ts

# Confirmar UnlockCondition node_unlocked:
grep -B 1 -A 2 "node_unlocked" packages/core/src/types/*.ts | head -8

# Confirmar NodeDef.prerequisites é opcional UnlockRule:
grep "prerequisites" packages/core/src/types/node.ts

# Confirmar PREREQUISITES_NOT_MET ErrorCode:
grep "PREREQUISITES_NOT_MET" packages/common/src/errors/codes.ts

# Confirmar estado actual index.ts (skill-b cero ten prerequisites):
grep -B 1 -A 5 "id: 'skill-b'" examples/node-basics/src/index.ts | head -10
```

**T0.3** — Baseline (cero esperar cambios):
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 24/24
pnpm --filter @yggdrasil-forge/core test --force         # 1691 tests
```

### T1 — Modificar `examples/node-basics/src/index.ts`

Aplicar §5.2 literal:
- Engadir `prerequisites` a skill-b.
- Engadir `prerequisites` a skill-c.
- skill-a sen cambios.

### T2 — Modificar `examples/node-basics/README.md`

Aplicar §5.3 literal:
- Atualizar expected output (paso 5).
- Engadir nova sección "Prerequisites vs dependency edges" antes
  de "Key concepts shown".

### T3 — Modificar `docs/architecture/MASTER.md`

Aplicar §5.4 literal:
- Engadir nova subsección A.6.9 despois de A.6.8.
- Cero modificar A.6.8 nin outras subsecciones.

### T4 — Typecheck

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics typecheck
# Esperado: cero erros.
```

### T5 — VERIFICACIÓN CRÍTICA: executar exemplo corrixido

```bash
pnpm --filter @yggdrasil-forge-examples/node-basics start
```

**Esperado**:
- Output similar a §5.5.
- Paso 5 **DEBE** mostrar mensaxe PREREQUISITES_NOT_MET.
- Exit code 0.
- Pasos 6-8 funcionan como antes.

**Se paso 5 cero mostra erro** → **ESCALAR INMEDIATAMENTE**.

### T6 — Verificación dura — sen impacto en código

```bash
# Cero ficheiros .ts modificados en /packages/:
git diff --name-only origin/main..HEAD | grep '^packages/.*\.ts$'
# Esperado: cero output.

# Cero tests modificados:
git diff --name-only origin/main..HEAD | grep '__tests__'
# Esperado: cero output.

# Cero modificación pnpm-lock.yaml:
git diff --name-only origin/main..HEAD | grep 'pnpm-lock'
# Esperado: cero output (cero deps novas).

# Tests monorepo:
pnpm turbo run test --force
# Esperado: 2195 INCHANGED.
```

### T7 — Auto-tracking briefing + changeset + CHANGELOG + commit + push

**Auto-tracking** (Agarfal copia o briefing):
```bash
cp /path/to/BRIEFING-examples-1-fix.md docs/briefings/
```

**Changeset**:
```
---
'@yggdrasil-forge/core': patch
---

docs(examples): fix prerequisites in node-basics example + capture structural lesson (examples-1-fix)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio:

```
### Fixed
- **examples/node-basics**: paso 5 do exemplo agora demostra
  correctamente Result.err pattern. Engadidos `prerequisites: {
  type: 'node_unlocked', nodeId: '<prev>' }` aos NodeDefs de
  skill-b e skill-c. Anteriormente, `'dependency'` edges supoñían
  enforce de prereqs (incorrecto; son meramente visuais +
  navegacionais).
- **examples/node-basics/README.md**: nova sección "Prerequisites
  vs dependency edges" explicando a distinción semántica.

### Added
- **MASTER §A.6.9**: nova subsección "Leccións estruturais dos
  exemplos prácticos" co primeiro L1 capturado:
  - **examples-1 L1 — Dependency edges vs Prerequisites**:
    captura o achado de que dependency edges en EdgeDef son
    visualización + navegación (cero runtime enforcement);
    `NodeDef.prerequisites: UnlockRule` é o mecanismo real de
    enforcement via UnlockResolver.
  - **Patrón emerxente** documentado: "verificación empírica de
    semántica" (corolario de 8.6.a L1 que extende a verificación
    estrutural á semántica funcional).

### Note
- Sub-fase **examples-1-fix**. CORRECCIÓN cirúrxica de examples-1
  (commit a9c9909).
- **Pure correction**: cero modificación de ficheiros .ts en
  /packages/. Cambio cirúrxico ao exemplo (2 nodos do treeDef
  ganhan prerequisites).
- **2195 tests pasan inchanged**. Typecheck 24/24.
- **Verificación crítica T5**: executou exemplo + confirmou que
  paso 5 agora falla con PREREQUISITES_NOT_MET como pedagóxicamente
  prescrito.
- **Lección 8.6.a L1 aplicada con rigor**: APIs verificadas
  empíricamente antes de redactar (UnlockRule, UnlockCondition,
  NodeDef.prerequisites, PREREQUISITES_NOT_MET ErrorCode).
- 58 sub-fases consecutivas sen rollback tras examples-1-fix.
- **DTs abertas**: 13 (sen cambio; examples-1-fix cero ligado a
  DT específica).
- **Valor real entregado**: o exemplo deixou ao descuberto unha
  asimetría conceptual entre edges e prereqs **que cero detectarían
  os tests unitarios**. Iso é precisamente o que MASTER A.4.2
  prometía dos exemplos: *"validar empíricamente a API antes de
  release"*.
- **Próximas sub-fases**: examples-2 (React) ou release-prep.
```

Commit Conventional:
`fix(examples): correct prerequisites semantics in node-basics + capture structural lesson (examples-1-fix)`

Push directo a `origin/main` (base `a9c9909`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE examples-1-fix — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base a9c9909)
✅ Correción cirúrxica de examples-1:
   - examples/node-basics/src/index.ts: +prerequisites en skill-b
     e skill-c
   - examples/node-basics/README.md: nova sección "Prerequisites
     vs dependency edges" + expected output atualizado
   - docs/architecture/MASTER.md: nova subsección A.6.9 capturando
     examples-1 L1
✅ T0.2 verificación empírica (lección 8.6.a L1 aplicada con rigor):
   - UnlockRule discriminated union confirmada
   - UnlockCondition node_unlocked confirmada
   - NodeDef.prerequisites opcional confirmada
   - PREREQUISITES_NOT_MET ErrorCode confirmado
✅ T5 VERIFICACIÓN CRÍTICA: pnpm start executou con paso 5
   bloqueado correctamente:
   - Output paso 5: <mensaxe PREREQUISITES_NOT_MET>
   - Resto da execución intacta (pasos 1-4, 6-8 OK)
   - Exit code: 0
✅ T6 verificación dura:
   - Cero ficheiros .ts en /packages/ modificados
   - Cero tests modificados
   - pnpm-lock.yaml inchanged
   - Tests monorepo: 2195 INCHANGED
   - Typecheck: 24/24 successful
✅ Auto-tracking BRIEFING-examples-1-fix.md en docs/briefings/
✅ CERO impacto en paquetes existentes
✅ CERO tests novos
✅ CERO modificacións de configs
✅ CERO deps de npm
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - CORRECCIÓN cirúrxica de examples-1; exemplo agora demostra
     correctamente Result.err pattern.
   - 58 sub-fases consecutivas sen rollback.
   - Lección examples-1 L1 capturada en MASTER A.6.9 (primeira
     lección post-Fase 8).
   - Patrón "verificación empírica de semántica" establecido como
     corolario de 8.6.a L1.
   - DTs abertas: 13 (sen cambio).
   - Próximas: examples-2 (React) ou release-prep.
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit: 6 ficheiros (2 NOVOS + 4 MODIFICADOS)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA examples-2 (React) OU release-prep.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing examples-1-fix. **CORRECCIÓN cirúrxica** de
examples-1. Engade `prerequisites` aos NodeDefs do exemplo para
demostrar correctamente o Result.err pattern. Captura **lección
estrutural examples-1 L1** no MASTER (primeira post-Fase 8). 6
ficheiros tocados (2 NOVOS + 4 MODIFICADOS). 2195 tests inchanged.
Risco MOI BAIXO mitigado por verificación crítica T5 (execución
real do exemplo).*

*🎯 **Valor real entregado por examples-1**: o exemplo deixou ao
descuberto unha asimetría conceptual entre dependency edges e
prereqs que cero detectarían tests unitarios. Esa é exactamente
a razón de existir da serie de exemplos. examples-1-fix consolida
o aprendizaxe nun activo permanente (lección A.6.9 do MASTER) +
mellora a fidelidade do exemplo público.*

*Decisións críticas documentadas:
- Sintaxe UnlockCondition directa (cero wrap en 'all').
- Manter dependency edges (visualización válida).
- README sección educativa.
- Lección estrutural en novo A.6.9.
- Lección 8.6.a L1 aplicada con rigor.
- Verificación crítica T5 obrigatoria.*
