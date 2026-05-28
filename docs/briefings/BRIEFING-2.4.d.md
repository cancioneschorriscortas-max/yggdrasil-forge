# BRIEFING — SUB-FASE 2.4.d de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase pequena cirúrxica.** Conectar `UnlockResolver.getProgress`
> con `ProgressManager` via context opcional. Cero dependencia circular
> real (UnlockResolver é stateless).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/` (`mkdir -p`). NUNCA na raíz. Rutas
internas `C:/Users/tajes/proxectos/yggdrasil-forge/...` (NON `/c/Users/...`).
Un script por operación, `assert` antes de modificar.

**0.2 — .gitignore** xa ten bloque defensivo. NON o toques.

**0.3 — Tests SEMPRE con --force:**
`pnpm turbo run test --filter=@yggdrasil-forge/core --force`.

**0.4 — Decisións do director (non se consultan):** rama `main`; ficheiros
`python3`+`utf-8`, nunca heredoc; edición parcial `str_replace`; orde
T0→T6 sen cambios.

**0.5 — ANTI-PLACEHOLDER (grep verificable):**
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Resultado LITERAL no reporte.

**0.6 — ESCALADO.** Decisión non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. **Esta sub-fase é cirúrxica**:
toda a decisión arquitectónica está pre-resolta (sec 5).

**0.7 — ENTREGA E TÍTULO DE REPORTE.**
- Pushed: `═══ SUB-FASE 2.4.d — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.4.d — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: antes de aplicar parches, `git status` + `git log -1`
para confirmar.

**0.9 — CHANGELOG (DT-12, A.6 L4)**: nova cabeceira `## [Unreleased]`
ao principio; NON consolidar.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.4.d** de Yggdrasil Forge. **Décima sub-fase de Fase 2.**
Tipo: **integración pequena cirúrxica** — conectar
`UnlockResolver.getProgress` con `ProgressManager` para que as
condicións `progress_min` lean valores derivados de nodos computed.

---

## 2. CONTEXTO MÍNIMO

Tras 2.4.c, ProgressManager soporta `manual` e `computed`. Os nodos
computed teñen progress derivado dinámicamente; **non se persiste en
`NodeInstance.progress`** (decisión 2.4.c §5.1).

Hoxe, `UnlockResolver.getProgress` (privado, liña 465 de
`UnlockResolver.ts`) lee directamente `ctx.state.nodes[nodeId]?.progress`.
Para nodos computed, iso devolve `undefined → 0`, fallando as
condicións `progress_min` cando un autor de árbore declara
"desbloquear cando un nodo computed alcance X%".

**Esta sub-fase arranxa isto.**

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `cfafc76`.
- 837 tests pasan en core (41 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`UnlockResolver` é stateless**: cero constructor con dependencies,
  cero field `progressManager`. O context pásase como parámetro en cada
  chamada (verificado en `UnlockResolver.ts:55`).
- **`UnlockResolverContext` actual**:
  ```ts
  interface UnlockResolverContext {
    readonly treeDef: TreeDef
    readonly state: TreeState
    readonly dependencyGraph?: DependencyGraphLike
    readonly customEvaluators?: ReadonlyMap<string, ConditionEvaluator>
    readonly locale?: Locale
  }
  ```
- **`UnlockResolverContext` construído en `TreeEngine.ts` en dous
  puntos**: liñas 540 e 1082 (probablemente nos métodos `canUnlock` e
  `applyChanges`).
- **`ProgressManager.getProgress(nodeId)` xa contempla todos os casos**:
  manual, computed (con ciclos), inexistentes, tipos rexeitados →
  sempre devolve número finito en [0, 100].
- **`UnlockResolver.getProgress(nodeId, ctx)`** é privado; usado nos
  casos `progress_min` (liñas 117-122 e 278-292).
- DT-9, DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir un campo opcional `progressManager?: ProgressManager` a
`UnlockResolverContext`, modificar `UnlockResolver.getProgress` para
consultar ese ProgressManager se está presente (fallback ao
comportamento actual senón), e que `TreeEngine` pase o seu
`progressManager` interno nos dous `UnlockResolverContext` que
constrúe.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Solución cirúrxica via context opcional

**Cero refactor arquitectónico**. Cero interface compartida nova.
Cero "terceiro coordinador". Cero inversión de dependencias complexa.

A solución é trivial porque verifiquei tres cousas críticas:
1. `UnlockResolver` é **stateless** (non require modificarlle o
   constructor; nin sequera ten un).
2. `ProgressManager` **NON chama a `UnlockResolver`** internamente
   actualmente (verificado co grep). **Non hai dependencia circular
   real** — só era unha preocupación teórica miña.
3. `UnlockResolverContext` é un parámetro de método, non un campo.
   Engadirlle un campo opcional é cero risco.

**Implementación:**
```ts
// En UnlockResolver.ts:
export interface UnlockResolverContext {
  readonly treeDef: TreeDef
  readonly state: TreeState
  readonly dependencyGraph?: DependencyGraphLike
  readonly customEvaluators?: ReadonlyMap<string, ConditionEvaluator>
  readonly locale?: Locale
  /**
   * ProgressManager opcional. Se presente, `getProgress` interna
   * delega nel para que os nodos computed sexan consultables desde
   * condicións `progress_min`. Se ausente, fallback ao
   * comportamento legacy (lectura directa de NodeInstance.progress).
   */
  readonly progressManager?: ProgressManagerLike
}
```

Onde `ProgressManagerLike` é unha interface **mínima** (5.3) para
evitar importar a clase concreta.

### 5.2 — `ProgressManagerLike`: interface mínima

Para evitar acoplar `UnlockResolver` (peza fundacional, sen
dependencies actuais sobre ProgressManager) coa **clase concreta**,
defínese unha interface mínima **no propio `UnlockResolver.ts`**:

```ts
/**
 * Interface mínima requirida polo UnlockResolver para consultar
 * progress. Permite que ProgressManager sexa inxectado sen acoplar
 * UnlockResolver á clase concreta. Aliñase coa API pública de
 * ProgressManager.getProgress.
 */
export interface ProgressManagerLike {
  getProgress(nodeId: string): number
}
```

`ProgressManager` (clase concreta) xa cumpre esta interface
estructuralmente (TypeScript ten structural typing). **Cero cambio
en `ProgressManager.ts`**.

Razóns desta decisión:
- Mantén `UnlockResolver` desacoplado da clase concreta.
- Permite testar `UnlockResolver` con mocks triviales.
- Permite no futuro substituír `ProgressManager` por outra
  implementación se procede.

### 5.3 — `UnlockResolver.getProgress` modificado

Actualmente (UnlockResolver.ts:465):
```ts
private getProgress(nodeId: string, ctx: UnlockResolverContext): number {
  return ctx.state.nodes[nodeId]?.progress ?? 0
}
```

Modificación:
```ts
private getProgress(nodeId: string, ctx: UnlockResolverContext): number {
  // ── INICIO: 2.4.d — consulta ProgressManager se está dispoñible ──
  if (ctx.progressManager !== undefined) {
    return ctx.progressManager.getProgress(nodeId)
  }
  // ── FIN: 2.4.d ──
  // Fallback legacy: lectura directa de NodeInstance.progress.
  // Mantense para compatibilidade cando UnlockResolver se usa sen
  // ProgressManager (tests illados, ou consumidores que constrúen
  // o context manualmente).
  return ctx.state.nodes[nodeId]?.progress ?? 0
}
```

**Importante**: o fallback **non se elimina**. Razón: o `UnlockResolver`
debe seguir funcionando se alguén constrúe `UnlockResolverContext`
sen `progressManager` (tests illados, escenarios non-engine). Cero
regresión.

### 5.4 — `TreeEngine`: pasar `progressManager` nos contexts

Modifica os dous lugares onde se constrúe `UnlockResolverContext`
(liñas 540 e 1082 segundo localización):

```ts
// Antes:
const ctx: UnlockResolverContext = { treeDef, state, locale: this.locale }

// Despois:
const ctx: UnlockResolverContext = {
  treeDef,
  state,
  locale: this.locale,
  progressManager: this.progressManager,
}
```

**Verifica en T0** se hai outros lugares onde se constrúe o context
(quizais `applyChanges` use outro patrón). **Aplica o mesmo cambio
en todos os lugares onde TreeEngine constrúa o context**.

### 5.5 — Cero cambios en ProgressManager

`ProgressManager.ts` **non se toca**. A súa API pública xa cumpre
`ProgressManagerLike` (`getProgress(nodeId): number` é exactamente o
asinante requirido).

Verifícao en T0: `grep -A2 "^  getProgress" packages/core/src/engine/ProgressManager.ts`.

### 5.6 — Compatibilidade total

A propiedade `progressManager` é **opcional** en
`UnlockResolverContext`. Calquera consumidor existente que constrúe o
context sen este campo segue funcionando exactamente igual (fallback
de 5.3). Cero ruptura de API.

**Os 837 tests existentes deben seguir pasando sen modificación.**
Se algún test rompe, é probable que sexa **bug latente** que xa
existía na 2.4.c (un caso que asumía que `getProgress` lía do state
directo cando agora delega). Reporta en T0 calquera test que rompa
**antes** de tocalo; isto pode revelar un caso non considerado.

### 5.7 — Cero ErrorCodes novos, cero common

Toda a infraestrutura xa existe. **Cero cambios** en
`packages/common/`. **Cero cambios** en `packages/core/src/types/`.

### 5.8 — Eventos / audit

Cero cambio. `UnlockResolver.evaluate` non emite eventos nin audit
(é stateless e puro). A consulta de progress via ProgressManager
**non dispara `progressChange`** (é só lectura).

### 5.9 — `progressManager` como `private` en TreeEngine

Verifica que `this.progressManager` é accesible nos métodos onde se
constrúe o `UnlockResolverContext` (liñas 540 e 1082). **Debería ser
trivialmente accesible** porque foi declarado `private readonly` en
2.4.b. Se por algún motivo non é visible (ex: closure raro), **escala
(0.6)**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións en:
- `packages/core/src/engine/UnlockResolver.ts` — engadir interface
  `ProgressManagerLike`, engadir campo opcional en
  `UnlockResolverContext`, modificar método privado `getProgress`.
- `packages/core/src/engine/TreeEngine.ts` — engadir
  `progressManager: this.progressManager` nos contexts construídos
  (2 ou máis lugares).

Tests:
- Nun ficheiro novo `UnlockResolver.progress.test.ts` (ou estender
  `UnlockResolver.test.ts` existente — decide pola limpeza):
  tests illados que demostren os dous modos (con e sen progressManager).
- En `TreeEngine.progress.test.ts` (existente): **engadir tests de
  integración** que verifiquen que `canUnlock` con condicións
  `progress_min` apuntando a nodos computed funciona correctamente.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 837 tests `--force`.
2. **Verifica** todas as localizacións onde TreeEngine constrúe
   `UnlockResolverContext`: `grep -n "UnlockResolverContext\|: UnlockResolverContext" packages/core/src/engine/TreeEngine.ts`.
   Reporta no chat **antes** de continuar. Se son máis de 2, terás que
   modificar todas elas.
3. **Confirma a firma de `ProgressManager.getProgress`** (debería ser
   `getProgress(nodeId: string): number`, sen máis parámetros). Se
   difere, **escala** (5.5 require ata isto).

### T1 — Modificar UnlockResolverContext + getProgress (5.1, 5.2, 5.3)
- Engadir interface `ProgressManagerLike` (5.2).
- Engadir campo opcional `progressManager?: ProgressManagerLike` ao
  context.
- Modificar método privado `getProgress` segundo 5.3 (delega + fallback).
- JSDoc claro en ambos.

Typecheck 20/20.

### T2 — TreeEngine: pasar progressManager nos contexts (5.4)
Modificar cada localización detectada en T0.2. Cada cambio é
mecánico: engadir `progressManager: this.progressManager` ao obxecto
literal do context.

### T3 — Tests illados de UnlockResolver (5.6)
Ficheiro: `packages/core/__tests__/engine/UnlockResolver.progress.test.ts`
(novo) ou estender `UnlockResolver.test.ts` (decide). Cobre:

- **Sen progressManager (fallback)**: `UnlockResolverContext` sen o
  campo → `getProgress` interno lee `state.nodes[nodeId]?.progress`
  directamente. Comportamento idéntico ao actual.
- **Con progressManager (mock simple)**: pasar un mock con
  `getProgress(nodeId) => 75`. Condición `progress_min: { nodeId,
  percent: 50 }` → satisfeita. Idem con percent: 80 → non satisfeita.
- **progressManager devolve 0 (caso computed con ciclo)**: condición
  `progress_min: { nodeId, percent: 1 }` → non satisfeita.
- **progressManager devolve 100**: condición `progress_min: 50` →
  satisfeita.

### T4 — Tests de integración en TreeEngine (5.6)

En `TreeEngine.progress.test.ts` (ou novo
`TreeEngine.progress.computed.test.ts`):

- **Caso principal**: definir TreeDef onde
  - Nodo A: `supportsProgress: true`, `progressSource: manual`.
  - Nodo C: `progressSource: { type: 'computed', dependsOn: ['A'],
    formula: 'sum' }`.
  - Nodo B: `prerequisites: [{ type: 'progress_min', nodeId: 'C',
    percent: 50 }]`.
  - Setear A.progress=80 → C.progress derivada=80.
  - `engine.canUnlock('B')` → `allowed: true` (porque C >= 50).
- **Caso negativo**: mesmo TreeDef, setear A.progress=30 → C=30.
  `engine.canUnlock('B')` → `allowed: false` (C < 50).
- **Caso ciclo computed**: A computed=[B], B computed=[A], C cuxa
  prereq é `progress_min: A, 1`. → `canUnlock('C')` → `allowed:
  false` (A devolve 0 polo ciclo).
- **Regresión**: TreeDef con prereq `progress_min` apuntando a un
  nodo manual (caso preexistente). Comportamento idéntico ao previo
  a 2.4.d.

**Tests existentes que pasaban**: deben seguir pasando sen
modificación. Se algún rompe, **escala** antes de modificalo (5.6).

### T5 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Grep LITERAL. Cobertura LITERAL.

- Changeset **minor** — só `@yggdrasil-forge/core` (common NON se
  toca; verifícao co `git diff --stat`).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio**
  (DT-12). Contido:
  - Added: `UnlockResolverContext.progressManager?: ProgressManagerLike`
    (opcional). Cando se inxecta, `progress_min` condicións
    consultan o ProgressManager (soportando nodos computed).
  - Added: interface `ProgressManagerLike` exportada de
    `UnlockResolver` (interface mínima para inxección).
  - Changed: `TreeEngine.canUnlock` (e os demais lugares onde
    constrúe `UnlockResolverContext`) agora pasan `progressManager:
    this.progressManager`. `progress_min` con nodos computed agora
    funciona correctamente.
  - Note: `UnlockResolver` mantén fallback legacy (lectura directa
    de `NodeInstance.progress`) cando se constrúe o context sen
    `progressManager`. Cero regresión.

### T6 — Commit + push
Commit Conventional: `feat(core): wire UnlockResolver to
ProgressManager via optional context (sub-phase 2.4.d)`. Push directo
a `origin/main` (base `cfafc76`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/src/engine/UnlockResolver.ts` (modificado: +interface
  +campo +método)
- `packages/core/src/engine/TreeEngine.ts` (modificado: +N
  modificacións de context literal)
- `packages/core/__tests__/engine/UnlockResolver.progress.test.ts`
  (NOVO) **ou** `UnlockResolver.test.ts` (modificado)
- `packages/core/__tests__/engine/TreeEngine.progress.test.ts`
  (modificado: +tests integración) **ou** novo
  `TreeEngine.progress.computed.test.ts`
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]`)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/src/types/`, `packages/core/src/engine/ProgressManager.ts`,
`packages/core/src/engine/index.ts`, `pnpm-lock.yaml`,
`packages/core/package.json`.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Modificar `ProgressManager.ts` (5.5: clase concreta xa cumpre
  `ProgressManagerLike` por structural typing).
- ❌ Importar `ProgressManager` concreto en `UnlockResolver.ts` (5.2:
  acoplaríaos; usar interface estrutural).
- ❌ Engadir `progressManager` ao constructor de `UnlockResolver` (é
  stateless; o context é por chamada).
- ❌ Cambiar a firma do método público de `UnlockResolver.evaluate`.
- ❌ Eliminar o fallback legacy (5.3, 5.6: cero ruptura).
- ❌ Refactorizar pezas non listadas (cero "xa que toco...").
- ❌ Engadir ErrorCodes ou tocar common (5.7).
- ❌ Cachear o resultado de `progressManager.getProgress`
  (UnlockResolver é stateless; cada `evaluate` é puro respecto ao
  ctx).
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12, A.6 L4).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1).

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.4.d — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base cfafc76)
✅ UnlockResolverContext.progressManager? engadido (opcional)
✅ Interface ProgressManagerLike exportada de UnlockResolver
✅ UnlockResolver.getProgress delega en progressManager se presente
   (fallback legacy mantido para compatibilidade)
✅ TreeEngine pasa progressManager nos <N> contexts construídos
✅ progress_min condicións consultan computed correctamente
✅ T0.2 localizacións de UnlockResolverContext: <lista>
✅ T0.3 ProgressManager.getProgress firma: <confirmada/diferente>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / UnlockResolver.ts <Y%>
   (baseline 2.4.c: 98.21% global; non debe baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: ningunha nova (esta sub-fase pecha o
   asunto pendente da 2.4.c sobre progress_min + computed).
✅ Changeset minor (core; common NON tocado) + nova [Unreleased]
   (DT-12, non consolidada)
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.5 ou 2.6 (decide o director).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR
(parche xerado)".

---

*Fin do briefing 2.4.d. Solución cirúrxica via context opcional;
cero refactor arquitectónico; cero dependencia circular (verificada
empíricamente). Calquera caso non cuberto → ESCALAR (0.6).*
