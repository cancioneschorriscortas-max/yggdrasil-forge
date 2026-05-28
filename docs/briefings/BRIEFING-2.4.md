# BRIEFING — SUB-FASE 2.4 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase pequena.** ProgressManager acotado a fonte `manual`, sen
> auto-unlock. Resto de fontes (remote/callback/event/computed) e
> auto-unlock quedan FÓRA, asignados a 2.4.b/c.

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
T0→T8 sen cambios.

**0.5 — ANTI-PLACEHOLDER (grep verificable).** Antes do commit:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Resultado LITERAL no reporte.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`, detén o avance. As decisións
clave **xa están pre-resoltas** (sec 5).

**0.7 — ENTREGA E TÍTULO DE REPORTE (LECCIÓNS 2.2.b/2.3/2.3.b).**
Integración = `git push` directo a `origin/main`. Se transporte por
parche: aplícase **DENDE A RAÍZ** (1.15) e **con working tree limpo
previo** (2.1.b L1).

**O título do reporte (sección 10) DEBE ser inequívoco:**
- Se está pushed e en `origin/main`: usa **literalmente**
  `═══ SUB-FASE 2.4 — COMPLETADA E EN origin/main ═══`.
- Se está **só na túa máquina, parche xerado pero non pushed**: usa
  **literalmente**
  `═══ SUB-FASE 2.4 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`.

NON inventes formulacións intermedias coma "LISTA PARA APLICAR LOCAL".

**0.8 — CHANGELOG (DT-12, lección A.6 L4).** O CHANGELOG.md do proxecto
ten múltiples cabeceiras `## [Unreleased]` aboliñadas (unha por
sub-fase). **Este é o patrón actual do proxecto e é deliberado.** Para
esta sub-fase, **engade unha nova cabeceira `## [Unreleased]` ao
principio do ficheiro** con `### Added` / `### Note` debaixo. **NON
intentes reagrupar nin consolidar entradas existentes; NON intentes
"limpar" o formato.** A consolidación canónica de Keep a Changelog é
tarefa diferida (DT-12, futura sub-fase ou release `0.1.0-alpha`).

---

## 1. IDENTIFICACIÓN

Sub-fase **2.4** de Yggdrasil Forge. **Sétima sub-fase de Fase 2.**
Tipo: **feature nova pequena** — `ProgressManager` para fonte `manual`,
acotada e sen auto-unlock.

---

## 2. CONTEXTO MÍNIMO

Tras 2.3.b, o motor ten EffectsRunner, StatComputer e TimeManager
integrados. Esta sub-fase engade un xestor de progreso para nodos con
`supportsProgress: true`. **Só fonte manual** (a API ten que chamarse
explícitamente con `engine.setProgress(nodeId, percent)`); as outras
catro fontes definidas en `types/progress.ts` (`remote`, `callback`,
`event`, `computed`) **quedan fóra**.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `48a720a` (docs MASTER DT-12).
- 748 tests pasan en core (39 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **Toda a infraestrutura de tipos xa existe** (cero cambios en tipos
  nin en common):
  - `NodeDef.supportsProgress?: boolean` en `types/node.ts:152`.
  - `NodeDef.progressMilestones?: readonly number[]` en `node.ts:155`.
  - `NodeDef.progressSource?: ProgressSourceConfig` en `node.ts:161`.
  - `ProgressSourceConfig` con 5 variantes en `types/progress.ts`.
  - `NodeInstance.progress?: number` en `node.ts:199`.
  - `NodeState` xa inclúe `'in_progress'`.
  - `EventMap.progressChange(nodeId, percent): void` xa declarado.
  - `AuditAction.progress_updated` xa declarado (verificarás a
    estrutura exacta en T0).
- DT-9 (infra), DT-11 (cycle detection), DT-12 (CHANGELOG cosmético).
  Ningunha bloqueante.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `ProgressManager` como peza standalone que xestiona o valor de
progreso (0-100) dos nodos con `supportsProgress: true` e fonte
`manual`, validando rangos, emitindo eventos en cambios, e expoñendo
unha API mínima cableable a `TreeEngine` **sen** auto-unlock.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Alcance acotado a fonte `manual`

Implementa **só** o caso `ProgressSourceConfig { type: 'manual' }`.

Cando un `NodeDef.progressSource` é distinto de `manual`
(`remote` / `callback` / `event` / `computed`) ou está
**ausente** pero `supportsProgress: true`, o ProgressManager
**rexeita as chamadas a `setProgress`** cun erro específico
(`PROGRESS_SOURCE_UNSUPPORTED`, novo — ver 5.6).

**Por que rexeitar se `progressSource` está ausente?** Porque a
intención do autor da árbore é ambigua: "supportsProgress sen
source" non está documentado nin especificado. Mellor ser explícito
e que o autor configure `{ type: 'manual' }` se quere control
manual. Iso prevén tamén que se confunda "supportsProgress" como
"acepta progress sen máis".

**Outras fontes**: nesta sub-fase 2.4, calquera fonte distinta de
`manual` → `PROGRESS_SOURCE_UNSUPPORTED`. Quedan asignadas a:
- **2.4.b: `computed`** (determinista, sen I/O, encaixa coa
  filosofía do motor).
- **Fase 5 (integracións externas)**: `remote`, `callback`, `event`
  (require infraestrutura de I/O asíncrono que NON debe vivir no core).

### 5.2 — Standalone, **non** integrado a TreeEngine nesta sub-fase

Patrón consistente con 2.1/2.2/2.3: peza standalone primeiro,
integración en sub-fase aparte (2.4.b ou cando ti decidas tras esta
entrega).

`TreeEngine` NON o instancia nin chama `setProgress` desde a API
pública nesta sub-fase. A API pública `engine.setProgress(nodeId,
percent)` queda para 2.4.b.

**Excepción mínima de integración**: na sub-fase 2.4 facemos algo que
en 2.1/2.2/2.3 deixamos para a `.b`: **un test de integración
demostrativo no ficheiro de tests do ProgressManager, usando o motor
real para construír o contexto**, mostrando como a peza se conectará
en 2.4.b. **NON** se engaden métodos públicos a `TreeEngine`.

### 5.3 — API exacta do ProgressManager

```ts
class ProgressManager {
  constructor(context: ProgressManagerContext)

  /**
   * Establece o progreso dun nodo. Devolve Result<ProgressUpdateResult>.
   * Errores tipados (ver 5.4).
   */
  setProgress(nodeId: string, percent: number): Result<ProgressUpdateResult>

  /**
   * Lee o progreso actual dun nodo. Devolve 0 se o nodo non ten
   * progress definido ou non existe (defensivo; cero excepcións).
   */
  getProgress(nodeId: string): number

  /**
   * Devolve a lista de milestones xa alcanzados para un nodo,
   * baseándose no seu progress actual e no progressMilestones do
   * NodeDef. Útil para UI mostrar marcas conseguidas.
   * Cero side effects.
   */
  getReachedMilestones(nodeId: string): readonly number[]
}

export interface ProgressManagerContext {
  readonly treeDef: TreeDef
  readonly store: StateStore
  readonly events: EventEmitter
  readonly audit: AuditLogger
  readonly locale: Locale
}

export interface ProgressUpdateResult {
  readonly nodeId: string
  readonly oldPercent: number
  readonly newPercent: number
  /** Milestones cruzados nesta chamada (ex: pasar de 40 a 80 cruza 50 e 75). */
  readonly crossedMilestones: readonly number[]
}
```

### 5.4 — Algoritmo de `setProgress`

1. **Validacións previas** (cada unha devolve `err` distinto se falla):
   - `treeDef.nodes[nodeId]` existe → senón `NODE_NOT_FOUND`.
   - `nodeDef.supportsProgress === true` → senón
     `PROGRESS_NOT_SUPPORTED` (novo, ver 5.6).
   - `nodeDef.progressSource?.type === 'manual'` → senón
     `PROGRESS_SOURCE_UNSUPPORTED` (novo, ver 5.6).
   - `Number.isFinite(percent) && percent >= 0 && percent <= 100`
     → senón `INVALID_PROGRESS_VALUE` (novo, ver 5.6).
2. **Idempotencia**: se `oldPercent === newPercent` (incluído tras
   redondeo ou se ambos son exactamente o mesmo), **NON emitir evento,
   NON rexistrar audit, NON mutar estado**. Devolver `ok` con
   `ProgressUpdateResult { oldPercent, newPercent: oldPercent,
   crossedMilestones: [] }`.
3. **Calcular `crossedMilestones`**: se `nodeDef.progressMilestones`
   existe, calcular array dos milestones que están en
   `(oldPercent, newPercent]` (exclusivo no inferior, inclusivo no
   superior, asumindo progress só sube; para baixadas, ver 5.5).
4. **Mutar estado**: `store.update(draft => { draft.nodes[nodeId] =
   { ...existingInstance, progress: percent } })`. Se a `NodeInstance`
   non existía aínda (caso raro: nodo locked con `setProgress` antes
   de ningún unlock), crear unha mínima: `{ id: nodeId, state:
   'locked', currentTier: 0, progress: percent }`.
5. **Emitir evento**: `events.emit('progressChange', nodeId, percent)`.
6. **Audit**: rexistrar `{ type: 'progress_updated', nodeId,
   oldValue: oldPercent, newValue: newPercent, ...(crossedMilestones
   non baleiro && { crossedMilestones }) }` (verifica a estrutura
   exacta de `AuditAction.progress_updated` en T0 e adapta os campos
   se difiren). `rollbackable: true` (un cambio de progress pódese
   reverter en respec).
7. **NON cambia `NodeInstance.state`**: nesta sub-fase 2.4, NON
   transitamos a `'in_progress'` automáticamente nin a `'unlocked'`
   con percent=100 (decisión 5.7). O `progress` é só un valor
   asociado.

### 5.5 — Progress que baixa (regresión)

¿Está permitido `setProgress(80) → setProgress(40)`?

**Decisión do director: SI, permitido sen restricións especiais.**
Razóns:
- Hai casos reais (anular avance: "fixen mal o exercicio, resetéo").
- Esixir "só sube" complica a semántica.
- O consumidor pode forzar "só sube" externamente se quere.

Implicación para `crossedMilestones`: cando o progress baixa
(`newPercent < oldPercent`), `crossedMilestones` devólvese **baleiro**.
Os milestones "des-cruzados" non se sinalan negativamente nesta
sub-fase (semántica nova que require deseño aparte; non necesario
agora).

### 5.6 — ErrorCodes novos: catro

Engadir a `packages/common/src/errors/codes.ts` na familia Engine
(continuando dende E018):

| Código | Valor | Mensaxe gl |
|---|---|---|
| `NODE_NOT_FOUND` | `YGG_E019` | `O nodo "{nodeId}" non existe na árbore.` |
| `PROGRESS_NOT_SUPPORTED` | `YGG_E020` | `O nodo "{nodeId}" non admite progreso (`supportsProgress` é false ou ausente).` |
| `PROGRESS_SOURCE_UNSUPPORTED` | `YGG_E021` | `A fonte de progreso do nodo "{nodeId}" non é "manual" e non está soportada nesta versión.` |
| `INVALID_PROGRESS_VALUE` | `YGG_E022` | `Valor de progreso inválido para "{nodeId}": {percent}. Debe estar en [0, 100] e ser finito.` |

**Verifica con grep** que YGG_E019/E020/E021/E022 non están xa en uso
antes de asignalos (deberían estar libres; o último engadido en 2.3.b
é E018). Mensaxes gl/es/en seguindo o patrón existente.

**Sobre `NODE_NOT_FOUND`**: probablemente xa existe un código análogo
no proxecto para casos parecidos. **Verifica con grep antes de
engadir** (`grep -n "NODE_NOT_FOUND\|NodeNotFound\|node_not_found"
packages/`). Se xa existe, **reutilízao**; se non, engádeo como E019.
**Se atopas un código similar pero con nome distinto** (ex:
`NODE_DOES_NOT_EXIST`), **escala** (0.6) — non duplices nin asumas
equivalencia.

### 5.7 — Cero auto-unlock, cero transición de estado

`setProgress` **NON cambia** `NodeInstance.state` baixo ningunha
circunstancia:
- progress=100 → o nodo segue en `'locked'`/`'unlockable'`/o que
  estivese.
- progress=0 → idem.
- O estado segue sendo responsabilidade exclusiva de `unlock`/`lock`/
  `respec`/`tick`/`applyChanges`.

**Por que esta decisión**: coherencia coa filosofía da Fase 2 (consumidor
decide cando desbloquear); evita bucles con effects (`set_progress`
nun effect podería disparar auto-unlock que disparase máis effects);
mantén a semántica de `progress` como **dato** separado da semántica
de `state` como **transición discreta**.

O consumidor que queira "auto-unlock when progress=100" implémentao
en 3 liñas no seu wrapper:
```ts
const result = engine.setProgress(nodeId, percent)  // 2.4.b
if (result.ok && result.value.newPercent === 100) {
  const canResult = await engine.canUnlock(nodeId)
  if (canResult.ok && canResult.value.allowed) {
    await engine.unlock(nodeId)
  }
}
```

Documentar isto na cabeceira de `ProgressManager.ts` como comentario.

### 5.8 — `getReachedMilestones` semántica

Dado `nodeDef.progressMilestones = [25, 50, 75, 100]` e
`progress = 73`, devolve `[25, 50]` (os que están en `<= progress`).

- Se o nodo non ten `progressMilestones` → devolve `[]`.
- Se o nodo non existe → `[]` (defensivo, sen erro).
- Devolve **ordeados ascendentemente** (asumindo
  `progressMilestones` ven xa ordenados; **NON** ordenes
  internamente: se vén desordenado é responsabilidade do validador
  da TreeDef). Comenta isto.

### 5.9 — Cero scheduling, cero polling, cero handlers

Cero `setInterval`, cero `setTimeout`, cero rexistro de handlers.
Toda a peza é **síncrona e determinista**. Mesmas razóns ca
TimeManager (2.3.b): determinismo, SSR/Workers, lifecycle simple.

### 5.10 — Validacións do TreeDef (Zod): fóra de alcance

O validador Zod xa existente en `engine/TreeDefValidator.ts` podería
non rexeitar inconsistencias semánticas como:
- `progressMilestones` con valores fóra de [0, 100].
- `progressMilestones` non ordeados.
- `progressSource` definido sen `supportsProgress`.

**Estas validacións quedan FÓRA desta sub-fase.** Documenta como
pendente para "sub-fase de hardening do validador" futura. Igual que
"validador non rexeita maxTier<=0" (xa documentado).

---

## 6. UBICACIÓN E ESTRUTURA

`packages/core/src/engine/ProgressManager.ts` (novo, ~250-350 liñas
estimadas). Helpers internos non exportados. `ProgressManagerContext`
e `ProgressUpdateResult` exportados.

Export desde `engine/index.ts`:
```ts
export {
  ProgressManager,
  type ProgressManagerContext,
  type ProgressUpdateResult,
} from './ProgressManager.js'
```

`packages/common/src/errors/codes.ts` + `messages.ts` modificados con
catro códigos novos (E019-E022), agás se `NODE_NOT_FOUND` xa existe
(en cuxo caso só 3 códigos novos: E019-E021).

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións previas
1. `pnpm install`. Confirma 748 tests `--force`.
2. **Verifica con grep** que `NODE_NOT_FOUND` non existe xa
   (`grep -rn "NODE_NOT_FOUND" packages/`). Se existe, anótao e
   reutilizarás en lugar de crealo. Se atopas variante con nome
   distinto (ex: `NODE_DOES_NOT_EXIST`), **escala (0.6)**.
3. **Verifica a estrutura exacta** de `AuditAction.progress_updated`
   (`grep -A5 "progress_updated" packages/core/src/types/audit.ts`)
   para adaptar o paso 6 de 5.4. Reporta a estrutura no chat antes
   de continuar T1.
4. **Verifica con grep** YGG_E019/E020/E021/E022 non en uso.

### T1 — Common: ErrorCodes novos (5.6)
Engadir os ErrorCodes confirmados (3 ou 4) + mensaxes gl/es/en.
Typecheck 20/20.

Commit propio recomendado: `feat(common): add progress error codes (E019-E022)`.

### T2 — ProgressManager: esqueleto + getProgress + getReachedMilestones (5.3, 5.8)
Crea `ProgressManager.ts`. Implementa `getProgress` e
`getReachedMilestones` (os dous defensivos, sen excepcións). Cero
`any`.

### T3 — setProgress completo (5.4, 5.5, 5.6, 5.7)
Implementa segundo algoritmo de 5.4 paso a paso. Validacións na orde
indicada. Idempotencia. Cálculo de `crossedMilestones`. Mutación de
estado **sen tocar `NodeInstance.state`**. Emisión de evento. Audit.

### T4 — Exports (engine/index.ts)
Exportar `ProgressManager`, `ProgressManagerContext`,
`ProgressUpdateResult`.

### T5 — Tests
`packages/core/__tests__/engine/ProgressManager.test.ts`. Cobre **como
mínimo**:

- **setProgress válido**: nodo con `supportsProgress: true` +
  `progressSource: { type: 'manual' }`, setProgress(50) → ok,
  emite progressChange, audit progress_updated.
- **setProgress idempotente**: setProgress(50) dúas veces → segunda
  vez non emite evento nin audit. crossedMilestones vacío.
- **setProgress que baixa** (5.5): setProgress(80) → setProgress(40)
  → ok, crossedMilestones vacío.
- **Validacións de erro** (.code exacto):
  - Nodo inexistente → `NODE_NOT_FOUND`.
  - Nodo sen `supportsProgress: true` → `PROGRESS_NOT_SUPPORTED`.
  - Nodo con `progressSource: { type: 'remote', ... }` →
    `PROGRESS_SOURCE_UNSUPPORTED`.
  - Nodo con `supportsProgress: true` pero sen `progressSource` →
    `PROGRESS_SOURCE_UNSUPPORTED`.
  - `setProgress(-1)`, `setProgress(101)`, `setProgress(NaN)`,
    `setProgress(Infinity)` → `INVALID_PROGRESS_VALUE`.
- **crossedMilestones**: nodo con `progressMilestones: [25, 50, 75,
  100]`, oldPercent=40, setProgress(80) → crossedMilestones = [50, 75].
- **crossedMilestones con `progressMilestones` ausente**: lista vacía.
- **NodeInstance non existía**: setProgress crea unha instancia mínima
  co `progress`. **Estado segue `'locked'`** (5.7).
- **state NON muta**: setProgress(100) → `NodeInstance.state` non
  cambia a `'unlocked'`. setProgress(50) → non cambia a `'in_progress'`.
- **getProgress**:
  - Nodo con progress → devolve o valor.
  - Nodo sen progress → devolve 0.
  - Nodo inexistente → devolve 0 (defensivo).
- **getReachedMilestones**:
  - progress=73, milestones=[25,50,75,100] → [25,50].
  - progress=0, milestones=[25,50] → [].
  - progress=100, milestones=[25,50,75,100] → [25,50,75,100].
  - Nodo sen milestones → [].
  - Nodo inexistente → [].
- **Integración demostrativa** (5.2 excepción mínima): un só test que
  monte un `TreeEngine` real, obteña as pezas vía construción
  manual de `ProgressManagerContext`, e demostre que setProgress
  funciona contra o store real. **Non engade métodos públicos a
  TreeEngine.**
- **.code exacto en TODOS os err** (lección recorrente).
- **Cero regresión**: 748 tests previos seguen pasando.

Número exacto de tests novos no reporte. Cobertura ≥90% en
ProgressManager.ts.

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`.
**ProgressManager.ts a ≥90% nas 4 métricas.** Global non baixa do
baseline **98.14%**.

### T7 — Verificación + grep
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Grep LITERAL. Cobertura LITERAL.

### T8 — Changeset + CHANGELOG + commit + push

- Changeset **minor** — common (3 ou 4 ErrorCodes) e core
  sincronizados.
- CHANGELOG: **NOVA cabeceira `## [Unreleased]` ao principio do
  ficheiro** (lección A.6 L4 / DT-12). NON consolidar. Contido:
  - Added: `ProgressManager` (peza standalone) con `setProgress`,
    `getProgress`, `getReachedMilestones`. Soporta só fonte `manual`.
  - Added: ErrorCodes E019-E022 (4 novos, ou 3 se NODE_NOT_FOUND
    xa existía).
  - Note: outras fontes de progress (remote/callback/event/computed)
    diferidas. Auto-unlock con progress=100 **non implementado**
    por deseño (decisión 5.7); o consumidor debe chamar a `unlock`
    explicitamente tras `setProgress`.
  - Note: a integración co `TreeEngine` (expoñer
    `engine.setProgress`, etc.) é sub-fase aparte (probablemente
    2.4.b).

Commits separados recomendados:
1. `feat(common): add progress error codes (E019-E0XX)`
2. `feat(core): add standalone ProgressManager (manual source only) (sub-phase 2.4)`
3. (opcional) `chore: changeset + CHANGELOG for 2.4`

Push directo a `origin/main` (base `48a720a`). Reporta hashes.

### Ficheiros esperados no diff final (verifica con `git status` antes
de commitear; lección 2.2.b/2.3 L1):

- `packages/common/src/errors/codes.ts` (modificado: +3 ou +4 códigos)
- `packages/common/src/errors/messages.ts` (modificado: +9 ou +12
  mensaxes)
- `packages/core/src/engine/ProgressManager.ts` (NOVO)
- `packages/core/src/engine/index.ts` (modificado: exports)
- `packages/core/__tests__/engine/ProgressManager.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]` ao principio)
- `docs/briefings/BRIEFING-2.4.md` (NOVO, opcional)

**NON deben aparecer cambios en** `packages/core/src/types/`,
`pnpm-lock.yaml`, `packages/core/package.json`, ou modificacións a
TreeEngine.ts.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar fontes distintas de `manual` (5.1: rexeitan con
  `PROGRESS_SOURCE_UNSUPPORTED`).
- ❌ Implementar auto-unlock cando progress=100 (5.7).
- ❌ Mutar `NodeInstance.state` desde `setProgress` (5.7).
- ❌ Engadir métodos públicos a `TreeEngine` (5.2: integración é
  2.4.b).
- ❌ Engadir validacións ao TreeDefValidator (5.10).
- ❌ Implementar `setInterval`/`setTimeout`/handlers async (5.9).
- ❌ Modificar `types/node.ts`, `types/progress.ts`, `types/events.ts`,
  `types/audit.ts` (xa están; se algo non encaixa → ESCALAR).
- ❌ Modificar o CHANGELOG xa existente nin reagrupar
  `[Unreleased]` anteriores (DT-12, lección A.6 L4).
- ❌ Refactorizar pezas existentes ("xa que toco..."). SÓ engadir.
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1) ou changeset-release.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.4 — COMPLETADA E EN origin/main ═══
✅ Commit(s) <hashes> en origin/main (base 48a720a)
✅ ProgressManager standalone: setProgress / getProgress /
   getReachedMilestones
✅ Só fonte 'manual'. Outras → PROGRESS_SOURCE_UNSUPPORTED (5.1)
✅ Cero auto-unlock; cero mutación de NodeInstance.state (5.7)
✅ Cero scheduling, cero polling (5.9)
✅ ErrorCodes engadidos: <lista>
✅ T0 NODE_NOT_FOUND: <"xa existía, reutilizado" | "engadido como E019">
✅ T0 AuditAction.progress_updated estrutura: <descrición>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / ProgressManager.ts <Y%>
   (baseline 2.3.b: 98.14% global; obxectivo ≥90% en ProgressManager)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: outras fontes (remote/callback/event/
   computed) fóra de alcance (5.1); auto-unlock non implementado
   por deseño (5.7); integración con TreeEngine diferida a 2.4.b;
   validacións Zod sobre progressMilestones fóra (5.10).
✅ Changeset minor (common+core sync) + nova [Unreleased] en CHANGELOG
   (cabeceira engadida ao principio segundo patrón DT-12, NON
   consolidada)
✅ git status pre-commit confirmou os ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.4.b (integración + posiblemente computed
source) ou outra que decida o director.
═══
```

**SE NON PUSHED (parche pendente)**:
```
═══ SUB-FASE 2.4 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══
[resto idéntico ao formato 'COMPLETADA']
```

NON inventes formulacións intermedias.

---

*Fin do briefing 2.4. Alcance acotado a fonte manual; cero auto-unlock;
patrón consistente con TimeManager. Calquera caso non cuberto →
ESCALAR (0.6).*
