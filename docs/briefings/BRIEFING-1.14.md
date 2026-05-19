# BRIEFING — SUB-FASE 1.14 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo (Sonnet 4.6).
> É autosuficiente. Se algo non está aquí, NON o inventes: aplica a
> sección 0.6 (escalado).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE — LER PRIMEIRO)

**0.1 — Scripts.** En `/tmp/ygg-exec/` (`mkdir -p`). NUNCA na raíz. Rutas ao
repo dentro dos scripts en estilo `C:/Users/tajes/proxectos/yggdrasil-forge/...`
(NON `/c/Users/...`). Un script por operación, `assert` antes de modificar.

**0.2 — .gitignore** xa ten o bloque defensivo. NON o toques.

**0.3 — Tests SEMPRE con --force:**
`pnpm turbo run test --filter=@yggdrasil-forge/core --force`. Nunca `pnpm test`
a secas para validar.

**0.4 — Decisións do director (non se consultan):** rama `main` (commit
directo); ficheiros con `python3`+`utf-8`, nunca heredoc; edición parcial
`str_replace`; orde T0→T9 sen cambios.

**0.5 — ANTI-PLACEHOLDER (artefacto verificable).** ANTES do commit final:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Pega o resultado LITERAL no reporte, xustificando cada coincidencia ou
confirmando "0 novas". As coincidencias de `unknown` como tipo TS lexítimo
e `placeholder` en comentarios de tipos de fases futuras (1.3/1.4) son
débeda PRE-EXISTENTE coñecida: identifícaas como tales, non son falta túa,
pero teñen que aparecer listadas igualmente.

**0.6 — ESCALADO DE DECISIÓNS (NOVO — IMPORTANTE).**
Se durante o traballo atopas unha **decisión de contrato ou arquitectura**
que non está resolta neste briefing —especialmente: falta un ErrorCode
axeitado, semántica ambigua dun tipo, comportamento non especificado que
afecta á API pública, ou un conflito co MASTER— **PARA. NON decidas ti.
NON reutilices "o máis próximo" e sigas.** No reporte, nunha sección
destacada `🛑 DECISIÓN REQUERIDA DO ARQUITECTO`, formula a pregunta concreta
con opcións e a túa recomendación, e **detén o avance nese punto** (entrega
o feito ata aí, marca o resto como bloqueado). O autor levaralle a pregunta
ao director (arquitecto) e volverás cunha resposta. Custa unha rolda; é
máis barato que débeda. Reutilizar+documentar XA NON é aceptable para
decisións de contrato; só para detalles internos triviais e reversibles.

---

## 1. IDENTIFICACIÓN

Briefing para a **sub-fase 1.14** de Yggdrasil Forge.
Tipo: **feature nova** (mecanismo de cambios dinámicos) **+ pago de DT-8**.

---

## 2. CONTEXTO MÍNIMO

Motor de skill trees, monorepo pnpm 11.0.9 + turbo, TS strict.
`@yggdrasil-forge/core`: types completos + engine (StateStore,
ResourceManager, UnlockResolver, **ChangeTracker**, EventEmitter,
DependencyGraph, CycleDetector, ConcurrencyGuard, **TreeEngine**).
TreeEngine xa ten: constructor + getters (1.12) + unlock/lock/respec (1.13).
Esta sub-fase engade **`applyChanges`**: modificar a TreeDef en runtime
(engadir/quitar/modificar nodos, edges, grupos, recursos, layout) e
reconciliar o estado.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `2e1b9cb`.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` →
  **374 tests pasan** en core (17 ficheiros). Número exacto previo.
- Lint 0/0, typecheck 20/20. Grep anti-placeholder: limpo (só débeda
  pre-existente documentada).
- DT-8 aberta (ver T1).

API interna dispoñible (verificada no repo — NON a reimplementes):
- `ChangeTracker` (`./ChangeTracker.js`) exporta:
  - `analyzeChanges(changes: readonly TreeChange[]): ChangeAnalysis`
    → `{ affectedNodes: ReadonlySet<string>, cachesToInvalidate:
    ReadonlySet<CacheType>, internalConflicts: readonly ChangeConflict[],
    renames: ReadonlyMap<string,string> }`. **Xa detecta os conflitos
    internos** (duplicate_add_node, add_then_remove, remove_then_modify,
    modify_after_rename, rename_chain, rename_to_existing,
    duplicate_edge_id). NON reimplementes esta lóxica; úsaa.
- `StateStore` (`./StateStore.js`):
  - `getTreeDef(): TreeDef`, `getState(): TreeState`
  - `applyTreeDefChange(producer: (draft: Draft<TreeDef>) => void): void`
    (Immer; muta a TreeDef, invalida ALL caches, notifica)
  - `replaceTreeDef(newDef): void`
  - `update(producer)` (muta TreeState), `invalidate(types)`
  - `createInitialState` é PRIVADO; non o chames. Para reconciliar
    NodeInstances novas, créaas no `update(draft => ...)` co estado inicial
    coherente (estado `'locked'`, tier 0) — replica o mínimo, non accedas
    ao privado.
- Tipos: `TreeChange` (union de 12 variantes, en `types/changes.js`:
  add_node/remove_node/modify_node/rename_node_id/add_edge/remove_edge/
  modify_edge/add_group/remove_group/modify_group/add_resource/
  modify_layout), `ModifyNodeChanges`, `ModifyEdgeChanges`,
  `ChangeAnalysis`, `ChangeConflict`. `treeChanged(changes)` xa está en
  `EventMap` (`types/events.js`).
- **NON existe** `ApplyChangesResult`: defínese en T2.

Entorno: Windows + Git Bash. Repo `C:\Users\tajes\proxectos\yggdrasil-forge`.

---

## 4. OBXECTIVO (unha frase)

Engadir a `TreeEngine` o método `applyChanges(changes)` que valida, detecta
conflitos (vía ChangeTracker), aplica os cambios á TreeDef de forma atómica,
reconcilia as NodeInstances afectadas, invalida caches e emite
`treeChanged`; e pagar DT-8.

---

## 5. DECISIÓNS XA TOMADAS (non discutibles)

1. **Atómico todo-ou-nada.** Se hai conflito interno (de
   `analyzeChanges().internalConflicts`) ou un cambio inválido, NON se
   aplica NINGÚN cambio. Devólvese `err(...)` e o estado queda intacto.
2. **`async applyChanges(changes: readonly TreeChange[]):
   Promise<Result<ApplyChangesResult>>`** (async-first como o resto de
   writes, sección 5.3 MASTER).
3. **`Result`, nunca throw** (só o constructor lanza).
4. **readOnly** → `err(READ_ONLY_VIOLATION)` localizado, sen tocar nada.
5. **Lista baleira** → `ok` cun ApplyChangesResult baleiro (no-op
   explícito; non é erro).
6. **Conflitos internos** detéctaos `analyzeChanges`. Se
   `internalConflicts.length > 0` → `err` cun YggdrasilError. ⚠️ Para o
   código deste erro, ver T1/DT-8 e sección 0.6: se non hai código
   semánticamente correcto, **ESCALA** (probablemente faga falla un
   `CHANGE_CONFLICT`; está na decisión do arquitecto, ver T1).
7. **Validación dos cambios** (antes de aplicar): chequeos baratos
   estruturais — add_node con id que xa existe → erro; remove_node de id
   inexistente → erro; rename a id existente → erro (xa o detecta
   ChangeTracker como `rename_to_existing` se está na mesma lista, pero
   tamén hai que validar contra a TreeDef actual); modify_node de
   inexistente → erro. NON validación profunda de ciclos/prerequisites
   (iso é o Validator de 1.17).
8. **Aplicación**: usa `StateStore.applyTreeDefChange(draft => { ... })`
   para mutar a TreeDef segundo a lista de TreeChange. Procesa os cambios
   na orde dada. Inmutabilidade garantida por Immer.
9. **Reconciliación de NodeInstances** (tras mutar a TreeDef):
   - Nodo engadido (`add_node`) → crea NodeInstance inicial (`'locked'`,
     tier 0) en TreeState vía `store.update`.
   - Nodo eliminado (`remove_node`) → elimina a súa NodeInstance.
   - Nodo renomeado (`rename_node_id`) → move a NodeInstance de oldId a
     newId conservando o seu estado (usa `analysis.renames`).
   - `modify_node` que cambie `maxTier` por debaixo do `currentTier`
     actual → axusta `currentTier` ao novo `maxTier` (clamp). Documenta
     a decisión cun comentario.
   - Os demais cambios (edges/grupos/recursos/layout) NON tocan
     NodeInstances directamente, pero SI invalidan caches.
10. **Invalidación de caches**: usa `analysis.cachesToInvalidate` →
    `store.invalidate([...])`. Non invalides ALL á forza se a análise dá
    un subconxunto (eficiencia; sección de caches do MASTER).
11. **Eventos**: tras aplicar OK, emite `treeChanged(changes)`. Se
    NodeInstances cambiaron de estado por reconciliación, emite tamén
    `stateChange` por nodo afectado (mínimo coherente; se falta info para
    o payload, ESCALA segundo 0.6, NON inventes campos).
12. **NON implementar**: undo/redo, history/audit (1.16), validación Zod
    (1.17), efectos/time (fase 2), migracións. Se un cambio referencia
    eses sistemas, ignórase o aspecto avanzado e anótase.

---

## 6. TAREFAS (orde estrita)

### T0 — Confirmar setup (0.1–0.5). Sen commit se xa está.

### T1 — DT-8: ErrorCode de estado de nodo + revisar uso

**Contexto:** en 1.13, `lock` nun nodo non desbloqueado e `canUnlock` de
nodo `disabled`/`expired` usan `INVALID_NODE_DEF` (`YGG_V002`, familia
Validation). É semánticamente incorrecto: a definición do nodo é válida; o
que é inválido é o **estado** para esa operación. Familia correcta: `YGG_E`
(Engine).

**Decisión do director (xa tomada, NON escalar esta):**
- Engade a `packages/common/src/errors/codes.ts`, na familia `YGG_E`
  (Engine; tras `BULK_OPERATION_FAILED = 'YGG_E010'`):
  `INVALID_NODE_STATE = 'YGG_E011'`
- Engade a `packages/common/src/errors/messages.ts` a mensaxe gl/es/en,
  patrón coas demais, con placeholders `{nodeId}` e `{details}`:
  - gl: `Estado de nodo inválido para a operación: "{nodeId}" ({details})`
  - es: `Estado de nodo inválido para la operación: "{nodeId}" ({details})`
  - en: `Invalid node state for operation: "{nodeId}" ({details})`
- En `TreeEngine.ts`:
  - `lock` de nodo non unlocked/maxed (≈liña 426): `INVALID_NODE_DEF` →
    `INVALID_NODE_STATE`.
  - `canUnlock` (≈liña 174): separa os casos —
    `expired` → usa o XA existente `NODE_EXPIRED` (`YGG_E008`);
    `disabled` → `INVALID_NODE_STATE`.
  - Actualiza/limpa o comentario que dicía "non hai código específico".
- Revisa que ningún test asertaba `INVALID_NODE_DEF` neses casos; se si,
  actualiza o test ao código correcto (con `.code` exacto).

**Feito cando:** typecheck 20/20; `grep -n "INVALID_NODE_DEF"
packages/core/src/engine/TreeEngine.ts` só mostra (se queda) usos
lexítimos de validación de definición real, non de estado; tests do core
pasan con `--force`.

### T2 — Definir ApplyChangesResult

En `packages/core/src/types/changes.ts` (xunto a TreeChange). Define e
exporta desde `types/index.ts`:

```ts
export interface ApplyChangesResult {
  readonly applied: number
  readonly affectedNodes: readonly string[]
  readonly renames: ReadonlyMap<string, string>
  readonly cachesInvalidated: readonly string[]
}
```
(Os tipos exactos dos campos derivados de ChangeAnalysis; mantén `string`
para cache types se CacheType non é trivialmente exportable, pero
preferentemente usa `CacheType` se está dispoñible — se hai dúbida sobre
isto NON escala, é detalle interno reversible: usa `readonly CacheType[]`
se compila limpo, `readonly string[]` se non.)

**Feito cando:** typecheck 20/20; tipo importable desde core.

### T3 — TreeEngine.applyChanges: esqueleto + guardas

- readOnly → err.
- `changes.length === 0` → `ok({ applied: 0, affectedNodes: [], renames:
  new Map(), cachesInvalidated: [] })`.
- `const analysis = analyzeChanges(changes)`.
- Se `analysis.internalConflicts.length > 0` → err. **CÓDIGO DE ERRO PARA
  CONFLITOS:** non existe un código específico. Isto é unha decisión de
  contrato → aplica sección 0.6: **ESCALA ao arquitecto** cunha sección
  `🛑 DECISIÓN REQUERIDA` no reporte. Recomendación a propoñer: engadir
  `CHANGE_CONFLICT = 'YGG_E012'` (Engine). Mentres non haxa resposta, NON
  inventes o código nin reutilices outro: detén o avance de applyChanges
  aquí e entrega T0–T2 + esqueleto, marcando T3–T9 como BLOQUEADO POR
  DECISIÓN. (Se o autor xa che trae a resposta do arquitecto nesta mesma
  sesión, continúa con ela.)

> Nota: T1 (INVALID_NODE_STATE) NON se escala — xa está decidido arriba.
> O que se escala é SÓ o código de conflito de applyChanges.

### T4 — Validación de cambios contra a TreeDef actual
(Só tras desbloqueo de T3.) add_node id duplicado, remove/modify de
inexistente, rename_to_existing contra TreeDef actual, add_edge con
source/target inexistente. Erro localizado co código adecuado (segundo
resolución de T3 / T1). Atómico: validar TODO antes de aplicar NADA.

### T5 — Aplicación á TreeDef
`StateStore.applyTreeDefChange(draft => { ... })` procesando cada
TreeChange na orde. Cubre as 12 variantes (as que non afecten a este
escenario mínimo, impleméntaas igual: son cambios simples sobre arrays/
campos da TreeDef). NON deixes ramas TODO.

### T6 — Reconciliación de NodeInstances (decisión 5.9)
`store.update(draft => { ... })` para add/remove/rename/clamp de tier.
Usa `analysis.renames` e `analysis.affectedNodes`.

### T7 — Invalidación + eventos
`store.invalidate([...analysis.cachesToInvalidate])`. Emite
`treeChanged(changes)` e `stateChange` por nodo reconciliado (5.11; se
falta payload, ESCALA, non inventes).

### T8 — Tests
`packages/core/__tests__/engine/TreeEngine.applyChanges.test.ts` (novo).
Cobre: no-op (lista baleira), readOnly, add_node (instancia creada),
remove_node (instancia eliminada), rename_node_id (estado conservado),
modify_node con maxTier clamp, add/remove edge, conflito interno
(atomicidade: estado intacto), validación contra TreeDef (id duplicado /
inexistente), evento `treeChanged` emitido, `.code` exacto en todos os err.
Número real segundo cobertura honesta; repórtao exacto, NON o axustes.

### T9 — Verificación + grep + commit
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Resultado do grep LITERAL no reporte. Cobertura: confirma se existe
`test:coverage` no core; se non, repórtao como débeda herdada (NON
inventes o script).
Changeset **minor** — afecta `@yggdrasil-forge/common` (novo ErrorCode/s)
**e** `@yggdrasil-forge/core`. Recorda: common e core versionado
**sincronizado**.
CHANGELOG `## [Unreleased]`: Added applyChanges + ApplyChangesResult +
INVALID_NODE_STATE (+ CHANGE_CONFLICT se desbloqueado); Fixed DT-8.
Commits separados: (1) DT-8 fix, (2) feat applyChanges, (3) changeset+CHANGELOG.
Push a `origin/main` tras avisar ao autor (revisor secundario ChatGPT).

---

## 7. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──` (imita ficheiros
existentes). 2 espazos, comilla simple, sen `;`, trailing commas, máx 100
cols, UTF-8 LF. TS strict, **cero `any`**. Imports Node core `node:`. NON
desactives regras Biome.

---

## 8. QUE ENTREGAR
- `common/src/errors/codes.ts` + `messages.ts` (INVALID_NODE_STATE,
  +CHANGE_CONFLICT se desbloqueado).
- `TreeEngine.ts` (DT-8 corrixido + applyChanges, ou esqueleto se BLOQUEADO).
- `types/changes.ts` + `types/index.ts` (ApplyChangesResult).
- Tests novos.
- changeset + CHANGELOG.
- Commits en `origin/main`.
Pega no reporte: `pnpm lint`, `pnpm typecheck`, test core `--force`, grep
anti-placeholder LITERAL, e a sección `🛑 DECISIÓN REQUERIDA` se aplica.

---

## 9. QUE NON FACER
- ❌ Decidir ti un ErrorCode de conflito (ESCALA — sección 0.6 / T3).
- ❌ Reimplementar `analyzeChanges` / detección de conflitos (xa existe).
- ❌ Acceder a `StateStore.createInitialState` (privado).
- ❌ undo/redo, audit, Zod, efectos, time, migracións.
- ❌ Placeholders / ramas mortas / `any` / valores de recheo.
- ❌ Mutar `getState()`/`getTreeDef()` directamente (usa update/
  applyTreeDefChange).
- ❌ Tocar/mergear o PR de release (#1) — Anexo A.4 MASTER.
- ❌ Engadir dependencias / tocar lockfile. Deixar `.py` no repo.

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 1.14 — <COMPLETADA | BLOQUEADA POR DECISIÓN>
═══════════════════════════════════════
✅ DT-8 resolto: INVALID_NODE_STATE (YGG_E011) + usos corrixidos
✅ ApplyChangesResult definido e exportado
<✅|🛑> applyChanges: <feito | BLOQUEADO en T3 á espera de decisión>
🛑 DECISIÓN REQUERIDA DO ARQUITECTO (se aplica):
   <pregunta concreta + opcións + recomendación>
✅ Tests: <N> pasan en core (<delta> novos) — --force
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal):
   <saída completa; marca débeda pre-existente vs nova>
✅ Cobertura core: <X% | script inexistente, débeda herdada>
✅ Changeset minor (common+core sincronizado)
✅ CHANGELOG actualizado
✅ Commits: <hashes> — en origin/main
⚠️ Limitacións coñecidas: <con ficheiro:liña, ou "ningunha">
📋 Confirmado: /tmp/ygg-exec rutas C:/, sen heredoc, --force
LISTO PARA 1.15 (subscription/selectors) — ou Á ESPERA DE DECISIÓN
```

---

*Fin do briefing 1.14. Decisións de contrato → ESCALAR (0.6), non improvisar.*
