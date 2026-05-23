# BRIEFING — SUB-FASE 2.3.b de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase pequena de integración.** Cablear o TimeManager xa construído
> ao TreeEngine: bloquear unlock de nodos pendentes/expirados, expoñer
> `tick()` para que o consumidor marque expiracións explicitamente.

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
T0→T7 sen cambios.

**0.5 — ANTI-PLACEHOLDER (grep verificable).** Antes do commit:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Resultado LITERAL no reporte.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. As decisións clave **xa están
pre-resoltas** (sec 5).

**0.7 — ENTREGA E TÍTULO DE REPORTE (LECCIÓN POST-2.2.b/2.3).**
Integración = `git push` directo a `origin/main`. Se transporte por
parche: aplícase **DENDE A RAÍZ** (NUNCA Downloads — incidente 1.15) e
**con working tree limpo previo** (`git status` ou `git stash` antes —
lección 2.1.b). Push final polo autor.

**O título do reporte (sección 10) DEBE ser inequívoco:**
- Se está pushed e en `origin/main`: usa **literalmente** o título
  `═══ SUB-FASE 2.3.b — COMPLETADA E EN origin/main ═══`.
- Se está **só na túa máquina, parche xerado pero non pushed polo
  autor**: usa **literalmente** o título
  `═══ SUB-FASE 2.3.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`.

Os incidentes 2.2.b e 2.3 causáronse por reportes con título ambiguo
("LISTA PARA APLICAR LOCAL") que parecían post-push. Esta sub-fase ten
títulos prescritos. NON inventes formulacións intermedias.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.3.b** de Yggdrasil Forge.
Tipo: **integración** — cablear `TimeManager` (construído en 2.3) ao
`TreeEngine`, sen introducir timers nin scheduling.

---

## 2. CONTEXTO MÍNIMO

Tras 2.3, `TimeManager` é peza standalone con `evaluate` / `evaluateAt`
/ `nextTransitionAt` e clock virtual inxectado. Esta sub-fase úsao
dentro do `TreeEngine` para:
- **Bloquear `unlock`** de nodos que están `pending` (`startsAt > now`)
  ou `expired` segundo TimeManager (aínda que o `NodeInstance.state`
  diga outra cousa).
- **Expoñer `engine.tick()`**: o consumidor chama isto cando quere que
  o motor avalíe expiracións. Os nodos unlocked/maxed que TimeManager
  marque como `expired` pasan a `NodeInstance.state = 'expired'`, e
  emítese `nodeExpired` + audit.
- **Cero timers internos** (sen `setTimeout`/`setInterval`). O engine
  permanece síncrono e determinista; o consumidor xestiona scheduling
  externamente se quere.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `7d1f7b9`.
- 721 tests pasan en core (38 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- `TimeManager` con `evaluate(constraints)` → `TimeStatus { kind:
  'permanent' | 'pending' | 'active' | 'expired' }` xa funciona.
- `TreeEngine.canUnlock` xa contempla `currentState === 'expired'`
  (liña 375) → devolve `allowed: false` con `NODE_EXPIRED`.
- `NodeState` inclúe `'expired'`. `EventMap.nodeExpired(nodeId)` xa
  declarado. `AuditAction.node_expired { nodeId }` xa existe.
- `NodeDef.timeConstraints?: TimeConstraints` xa existe.
- `TreeEngineOptions` actual ten `locale`, `readOnly`, `audit`. **NON
  ten `timeNow` nin `time` aínda; engadirémolo en T1 (5.1).**
- DT-11 aberta, non bloqueante.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir un `TimeManager` privado a `TreeEngine`, expoñer
`engine.tick()` para detectar e materializar expiracións, e modificar
`canUnlock` para rexeitar nodos `pending` ou `expired` segundo
TimeManager — **sen introducir timers internos** no engine.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — `TreeEngineOptions.timeNow?: () => number`

Engade a `TreeEngineOptions` en `packages/core/src/types/tree.ts`:

```ts
/**
 * Función que devolve o instante actual en UTC ms.
 * Inxectada no TimeManager. Default: Date.now (en produción).
 * Sobreescribir en tests para clock virtual controlable.
 */
readonly timeNow?: () => number
```

No constructor de `TreeEngine`, ao instanciar `TimeManager`:
```ts
this.timeManager = new TimeManager({
  now: options?.timeNow ?? Date.now,
  locale: this.locale,
})
```

**Cero `TimeManagerOptions` expostos** nesta sub-fase. `enabled`,
`checkIntervalMs`, etc., son para o scheduling automático que **non
implementamos** (5.5). Se algún día se engade, modifícase
`TreeEngineOptions` entón.

### 5.2 — `TimeManager` como `private readonly` en TreeEngine

Patrón idéntico a `effectsRunner`/`statComputer`:
```ts
private readonly timeManager: TimeManager
```

Constrúese tras `statComputer` no constructor. Inicialización con `now`
de `options?.timeNow ?? Date.now`.

### 5.3 — `canUnlock` integra TimeManager

Modifica `canUnlock` para que, **antes** de comprobar
prerequisites/recursos, consulte TimeManager:

```ts
// Tras as comprobacións actuais de state === 'expired' / 'maxed' /
// 'unlocked' (que xa existen), engadir:
const timeStatus = this.timeManager.evaluate(nodeDef.timeConstraints)
if (timeStatus.kind === 'pending') {
  return ok({
    allowed: false,
    reason: getErrorMessage(ErrorCode.NODE_NOT_YET_AVAILABLE, this.locale, {
      nodeId,
      startsAt: timeStatus.startsAt,
    }),
  })
}
if (timeStatus.kind === 'expired') {
  return ok({
    allowed: false,
    reason: getErrorMessage(ErrorCode.NODE_EXPIRED, this.locale, { nodeId }),
  })
}
// Se 'active' ou 'permanent': segue avaliando.
```

**`NODE_NOT_YET_AVAILABLE`** é un ErrorCode novo (5.7). `NODE_EXPIRED`
xa existe (vén de fase 1).

**Posición na cadea de comprobacións:** TimeManager **DESPOIS** das
comprobacións de estado actual (expired/maxed/unlocked, que xa están
arredor das liñas 270-295) e **ANTES** das de prerequisites/recursos.
Razón: se o nodo xa está marcado como `'expired'` no estado, o erro
existente é máis específico; só se o estado NON detecta expiración
pero TimeManager si (escenario común se ningún `tick()` se chamou
aínda), TimeManager intervén.

### 5.4 — `engine.tick(): TickResult`

Método público novo:

```ts
/**
 * Avalía o estado temporal de todos os nodos unlocked/maxed e
 * marca como 'expired' os que TimeManager detecte como expirados.
 * Emite `nodeExpired` e rexistra `node_expired` no audit por cada
 * transición.
 *
 * **Cero efecto en nodos en estados distintos de unlocked/maxed**:
 * un nodo locked con startsAt no pasado NON pasa a unlockable
 * automáticamente; iso é responsabilidade do consumidor (que pode
 * chamar a canUnlock ou getNodeState para inspeccionar).
 */
tick(): TickResult
```

Onde `TickResult`:
```ts
export interface TickResult {
  /** Nodos que pasaron a 'expired' nesta chamada. */
  readonly expired: readonly string[]
  /** Timestamp do tick (segundo `timeNow`). */
  readonly timestamp: number
}
```

Implementación:
1. Capturar `now = this.timeManager` lendo `context.now()` — non
   necesario directamente; o TimeManager xa o fai internamente cando
   `evaluate(constraints)` é chamado.
2. Iterar `Object.values(store.getState().nodes)` filtrando
   `state === 'unlocked' || state === 'maxed'`.
3. Para cada un, buscar `NodeDef` por id en `treeDef`. Se non hai
   `timeConstraints`, saltar.
4. Chamar `timeManager.evaluate(nodeDef.timeConstraints)`. Se devolve
   `{ kind: 'expired' }`:
   a. `store.update(draft => { draft.nodes[nodeId].state = 'expired' })`
   b. **Capturar `previousInstance`** antes da mutación para o evento
      `stateChange`.
   c. Emitir `events.emit('stateChange', nodeId, { from: previousState,
      to: 'expired', timestamp: <now>, reason: 'expired' })`.
   d. Emitir `events.emit('nodeExpired', nodeId)`.
   e. Rexistrar `audit.record({ type: 'node_expired', nodeId },
      { rollbackable: false })` e emitir `auditEntry` se non é null.
   f. Invalidar `statComputer.invalidate()` (nodo expirado deixa de
      contribuír a stats).
   g. Engadir `nodeId` ao array `expired`.
5. Devolver `{ expired, timestamp: <captured now via timeManager si
   accesible, ou Date.now() directo se non — decide; recomendable
   gardar o `now` capturado ao inicio do tick para que todos os
   nodos do mesmo tick teñan o mesmo timestamp> }`.

**NON consume EffectsRunner.** A expiración non dispara `nodeDef.effects`
(esos son para unlock, non para expiración). Se algún día se quere
"effects ao expirar", iso é decisión nova; non aquí.

**Cero rollback**: se algo falla a media (improbable; é mutación
local), déixase o estado coa parte feita. Documenta como esperado.

### 5.5 — Cero timers internos. Cero scheduling automático.

`TreeEngine` **NUNCA** chama `setTimeout`/`setInterval`. O consumidor
decide cando chama `tick()`. Razóns:
- Determinismo: o engine ten os mesmos resultados se se chama tick()
  unha vez por segundo ou unha vez ao día (asumindo as mesmas
  constraints).
- Compatibilidade SSR/Workers/test: cero lifecycle de timers que
  limpar.
- Simplicidade: lifecycle de timers en TypeScript é fonte recorrente
  de bugs.

O consumidor pode usar `nextTransitionAt` de TimeManager (xa existe en
2.3) para programar el mesmo `setTimeout(tick, delay)` se quere
automatización. **Exporta `nextTransitionAt` ao motor** como método
público de conveniencia (5.6).

### 5.6 — API pública nova en TreeEngine

```ts
/** Avalía expiracións pendentes e marca nodos como 'expired'. */
tick(): TickResult

/**
 * Devolve o instante (UTC ms) no que o status temporal dalgún nodo
 * unlocked/maxed cambiaría, ou null se non hai cambios futuros
 * previsibles. Útil para programar `setTimeout(tick, delay)`.
 */
nextTickAt(): number | null
```

**`nextTickAt`**: itera `Object.values(state.nodes)` filtrando
unlocked/maxed con `timeConstraints`, chama `timeManager.nextTransitionAt`
para cada un, devolve o mínimo (`> now`) ou `null` se ninguén ten
transición futura. (Implementación trivial, ~10 liñas.)

### 5.7 — ErrorCode novo: `NODE_NOT_YET_AVAILABLE = 'YGG_E018'`

Engadir a `packages/common/src/errors/codes.ts` na familia Engine.
Mensaxe en gl/es/en seguindo o patrón existente, con placeholders
`{nodeId}` e `{startsAt}` (timestamp UTC ms; o consumidor formatérao
como prefira).

Exemplo gl: `'O nodo "{nodeId}" aínda non está dispoñible (comeza en {startsAt}).'`

**Verifica con grep que YGG_E018 non está xa en uso** antes de
asignalo. (Engadeuse `YGG_E017` na 2.1; debería estar libre, pero
confirma.)

### 5.8 — Audit ao expirar: única entrada `node_expired`

Por cada nodo que expira nun `tick()`, **unha entrada** `{type:
'node_expired', nodeId}` no audit. Cero entradas agregadas tipo
"tick_completed". Razón: cada expiración é unha mutación semántica
independente, igual a un `unlock`.

`rollbackable: false`: a expiración non se desfai por respec (semántica:
o tempo non se reverte). Documéntalo no comentario.

### 5.9 — Cero cambio a `lock`/`respec`/`applyChanges`

Esta sub-fase **só** modifica `canUnlock` e engade `tick`/`nextTickAt`.
NON cambies `lock`, `respec`, `applyChanges` para que invaliden o
TimeManager nin nada similar. Razón: TimeManager non ten cache propia
(consulta `now()` cada chamada), nada que invalidar.

### 5.10 — Test de regresión obrigatorio

A integración non debe romper ningún test existente. Ningún dos 721
tests previos debe necesitar ser modificado, **agás se nalgún caso un
test usa nodos sen `timeConstraints` e a nova lóxica de `canUnlock`
devolve cousa distinta** (NON debería: se `timeConstraints` é
`undefined`, TimeManager devolve `permanent` e `canUnlock` segue ata
prerequisites como sempre). Verifica execución completa antes/despois.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións en:
- `packages/common/src/errors/codes.ts` — novo ErrorCode.
- `packages/common/src/errors/messages.ts` — 3 mensaxes (gl/es/en).
- `packages/core/src/types/tree.ts` — engadir `timeNow?` a `TreeEngineOptions`.
- `packages/core/src/engine/TreeEngine.ts` — instanciar TimeManager,
  modificar canUnlock, engadir tick/nextTickAt, exportar TickResult.
- Posiblemente `packages/core/src/engine/index.ts` se TickResult é
  reexportable.

Test novo:
- `packages/core/__tests__/engine/TreeEngine.time.test.ts`

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity
`pnpm install`; confirma 721 tests `--force`. Verifica que YGG_E018
**non está xa en uso** (`grep -n "YGG_E018" packages/common/src/`).

### T1 — Common: NODE_NOT_YET_AVAILABLE (5.7)
Engadir o ErrorCode + 3 mensaxes (gl/es/en). Commit propio recomendado:
`feat(common): add NODE_NOT_YET_AVAILABLE error code (E018)`.

### T2 — TreeEngineOptions.timeNow (5.1)
Engadir a `types/tree.ts`. Typecheck 20/20.

### T3 — Cablear TimeManager (5.2)
- `private readonly timeManager: TimeManager`.
- Instanciar tras `statComputer` co `now` correcto.
- Importar TimeManager.

### T4 — Modificar canUnlock (5.3)
Engadir o bloque que consulta TimeManager despois das comprobacións
de estado existentes e antes de prerequisites/recursos. Cero refactor;
só un bloque novo.

### T5 — tick + nextTickAt (5.4, 5.6)
- Engadir `TickResult` (interface exportada).
- Implementar `tick()` segundo 5.4.
- Implementar `nextTickAt()` segundo 5.6.

### T6 — Tests

`packages/core/__tests__/engine/TreeEngine.time.test.ts`. Cobre **como
mínimo**:

- **canUnlock pending**: nodo con `startsAt` no futuro, clock virtual
  apuntando ao pasado de startsAt → `canUnlock` devolve `allowed:
  false` con reason que conteña `NODE_NOT_YET_AVAILABLE` (verifica
  via getErrorMessage o `.code` se accesible, ou a string contendo
  o nodeId).
- **canUnlock expired (vía TimeManager, non estado)**: nodo con
  `expiresAt` no pasado, estado actual `'locked'` (non foi
  tickeado aínda) → `canUnlock` devolve `allowed: false` por
  TimeManager. (Distinto do caso onde o estado xa é `'expired'`,
  que xa funcionaba antes.)
- **canUnlock active**: nodo con `startsAt` pasado e `expiresAt`
  futuro → `canUnlock` non bloquea por TimeManager (segue ata
  prerequisites como antes).
- **canUnlock permanent**: nodo sen `timeConstraints` → comportamento
  idéntico ao previo a 2.3.b.
- **tick básico**: desbloquear un nodo con `expiresAt` futuro, avanzar
  o reloxo virtual a despois de `expiresAt`, chamar `tick()` → nodo
  pasa a `'expired'`, `TickResult.expired` contén o nodeId,
  `nodeExpired` evento emitido, audit `node_expired` rexistrado.
- **tick múltiples**: 3 nodos con caducidades distintas, avanzar
  reloxo a despois de todas, un único `tick()` → todos 3 expiran no
  mesmo tick.
- **tick parcial**: 3 nodos con `expiresAt` en t1 < t2 < t3; reloxo
  en t2; tick → expiran os de t1 e t2, t3 segue activo.
- **tick non afecta locked**: nodo locked con `expiresAt` pasado →
  tick non muta nada (a expiración só aplica a unlocked/maxed).
- **tick non afecta sen timeConstraints**: nodos sen constraints
  permanecen unlocked.
- **tick invalidate stats**: nodo unlocked que contribúe a un stat,
  expira por tick → `getStat` reflicte a falta da contribución (verifica
  que statComputer.invalidate funcionou).
- **tick emite stateChange ben formado**: `from: 'unlocked'/'maxed'`,
  `to: 'expired'`, `reason: 'expired'`, `timestamp: <now>`.
- **tick idempotente**: chamar tick dúas veces seguidas → segundo non
  emite eventos nin engade audit (nodos xa están 'expired'; `tick`
  só procesa unlocked/maxed).
- **nextTickAt**: 2 nodos con `expiresAt` t1 < t2 unlocked → devolve
  t1. Tras tick que expira t1 → devolve t2. Tras tick que expira
  ambos → devolve null.
- **Cero regresión**: 721 tests previos seguen pasando intactos.
- **`.code` exacto en TODOS os err.**

### T7 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Grep LITERAL. Cobertura LITERAL.

- Changeset **minor** — common (+E018) e core sincronizados.
- CHANGELOG `## [Unreleased]`:
  - Added: `TreeEngine.tick()` materializa expiracións de nodos
    unlocked/maxed; emite `nodeExpired` + audit `node_expired` +
    invalida cache de stats.
  - Added: `TreeEngine.nextTickAt()` devolve o próximo instante no
    que algún nodo expirará (para programar tick externamente).
  - Added: `TreeEngineOptions.timeNow` para inxectar clock virtual.
  - Added: ErrorCode `NODE_NOT_YET_AVAILABLE` (YGG_E018) usado en
    `canUnlock` cando un nodo ten `startsAt` no futuro.
  - Note: O engine NON usa `setTimeout` internamente; `tick()` é
    sempre chamado polo consumidor. `cooldownMs`, `reCertifyAfterMs`,
    `validForMs` seguen sen implementar (sub-fase futura).

Commits separados (mínimo 2):
1. `feat(common): add NODE_NOT_YET_AVAILABLE error code (E018)`
2. `feat(core): wire TimeManager into TreeEngine; add tick/nextTickAt
   (sub-phase 2.3.b)`
3. (opcional) `chore: changeset + CHANGELOG for 2.3.b`

**Push directo a `origin/main`** (base `7d1f7b9`), tras avisar ao
autor.

### Ficheiros esperados no diff final (verifica `git status` antes
de commitear):

- `packages/common/src/errors/codes.ts` (modificado)
- `packages/common/src/errors/messages.ts` (modificado)
- `packages/core/src/types/tree.ts` (modificado: timeNow)
- `packages/core/src/engine/TreeEngine.ts` (modificado: TimeManager +
  canUnlock + tick + nextTickAt + TickResult)
- `packages/core/__tests__/engine/TreeEngine.time.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)
- `docs/briefings/BRIEFING-2.3.b.md` (NOVO, opcional)

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar `setTimeout`/`setInterval` no engine (5.5).
- ❌ Implementar scheduling automático ou polling.
- ❌ Cablear `nodeDef.effects` ao expirar (semánticamente distinto).
- ❌ Modificar `lock`/`respec`/`applyChanges` por TimeManager (5.9).
- ❌ Engadir estado novo a NodeState (`'pending'`, etc.). `'pending'` é
  un kind de TimeStatus, NON un NodeState.
- ❌ Implementar cooldown/recertify/validFor (segue fóra de alcance).
- ❌ Engadir métodos públicos non listados en 5.6.
- ❌ Tocar pezas existentes ("xa que toco..."). SÓ os puntos
  prescritos.
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1) ou changeset-release.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.3.b — COMPLETADA E EN origin/main ═══
✅ Commit(s) <hashes> en origin/main (base 7d1f7b9)
✅ TimeManager cableado en TreeEngine como private readonly
✅ TreeEngineOptions.timeNow (default Date.now)
✅ canUnlock rexeita pending (E018) e expired (vía TimeManager)
✅ tick() / nextTickAt() expostos. Cero setTimeout interno.
✅ E018 NODE_NOT_YET_AVAILABLE engadido a common (gl/es/en)
✅ Tests: <N> pasan (<delta> novos) — --force verificado
✅ Cobertura: global <X%> / TreeEngine.ts <Y%>
   (baseline 2.3: 98.14% global; non debe baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
✅ git status pre-commit confirmou os ficheiros esperados (§7)
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: cooldown/recertify/validFor seguen fóra;
   tick é manual, sen scheduling automático (5.5 deliberado).
✅ Changeset minor (common+core sync) + CHANGELOG
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.4 (ou peche de Fase 2 segundo decida o director).
═══
```

**SE NON PUSHED (parche pendente)**:
```
═══ SUB-FASE 2.3.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══
✅ Base verificada: 7d1f7b9 (721 tests)
✅ Implementación verificada localmente: <N> tests pasan
✅ Parche xerado: <ruta>
⚠️ NON pushed a origin/main. O autor debe aplicar e pushear.
[resto dos detalles técnicos como no formato 'COMPLETADA']
```

NON inventes formulacións intermedias coma "LISTA PARA APLICAR LOCAL".
Os dous títulos son inequívocos por deseño (lección 2.2.b/2.3).

---

*Fin do briefing 2.3.b. Cero timers. Tick explícito. Calquera caso
non cuberto → ESCALAR (0.6).*
