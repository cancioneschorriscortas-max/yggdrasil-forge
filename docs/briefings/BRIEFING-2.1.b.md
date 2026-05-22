# BRIEFING — SUB-FASE 2.1.b de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase pequena e acotada.** Cablear o EffectsRunner xa construído ao
> TreeEngine.unlock. Cero código novo grande; só integración.

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

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA, abre
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`, detén o avance. Esta sub-fase ten
**dúas decisións clave pre-resoltas polo director** (seccións 5.3 e 5.4);
calquera outra cousa non cuberta → ESCALAR.

**0.7 — ENTREGA.** Integración = `git push` directo a `origin/main`. Se
transporte por parche: aplícase **DENDE A RAÍZ** (NUNCA Downloads — leccion
do incidente 1.15), push final polo autor.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.1.b** de Yggdrasil Forge.
Tipo: **integración** — cablear `EffectsRunner` (construído en 2.1) ao
fluxo de `TreeEngine.unlock` para que `nodeDef.effects` se executen
automaticamente tras un unlock exitoso.

---

## 2. CONTEXTO MÍNIMO

`@yggdrasil-forge/core` ten todo o motor da Fase 1 + EffectsRunner
standalone (2.1). Hoxe, se un `NodeDef.effects` está definido, o unlock
**non fai nada** con eles. Esta sub-fase fai que se executen
automaticamente.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `7dcc609`.
- 615 tests pasan en core (34 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Grep limpo.
- `EffectsRunner` con `run(effects): Promise<Result<EffectResult[]>>`
  e `reverse(results): Promise<Result<void>>` xa funciona. Atómico
  internamente (5.4 do briefing 2.1).
- `TreeEngine` ten as pezas necesarias como `private readonly`:
  `store: StateStore`, `resources: ResourceManager`, `resolver:
  UnlockResolver`, `events: EventEmitter`, `audit: AuditLogger`, `locale`.
- `NodeDef.effects?: readonly Effect[]` xa está no tipo (`types/node.ts`
  liña 125).
- `AuditAction` ten `custom { name: string; data: unknown }` (tipo
  existente, **NON engadir tipo novo nin escalar por audit**).
- `ResourceManager.refund(costs, budget): Budget` para rollback de
  recursos.

Entorno: Windows + Git Bash. Repo `C:\Users\tajes\proxectos\yggdrasil-forge`.

---

## 4. OBXECTIVO (unha frase)

Tras un `unlock` exitoso, se o `NodeDef` ten `effects` definidos,
executalos via `EffectsRunner.run`; se algún falla, **revertilo todo**
(effects parciais via `EffectsRunner.reverse`, recursos via `refund`,
estado do nodo a `locked`) e devolver `err` ao caller. Audit agregada,
NON unha entrada por effect.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Cablear EffectsRunner como `private` en TreeEngine

`TreeEngine` instancia un `EffectsRunner` privado no constructor:
```ts
private readonly effects_runner: EffectsRunner
```
(O nome `effects_runner` evita colisión co campo `events` existente; usa
o estilo que prefiras coherente co resto do ficheiro — `effectsRunner`
en camelCase é probablemente o correcto pero verifica como están os
outros campos privados.)

Constrúese tras `this.audit` no constructor, pasando o `EffectContext`:
```ts
this.effectsRunner = new EffectsRunner({
  engine: this,            // self-reference; usar `this` (ver 5.5)
  store: this.store,
  resources: this.resources,
  resolver: this.resolver,
  events: this.events,
  locale: this.locale,
})
```

### 5.2 — Punto de inxección exacto en `unlock`

`TreeEngine.ts`, dentro do método `unlock`, **tras a chamada a
`this.audit.record({...}, {rollbackable: true})` e ANTES do `return ok(...)`
final** (arredor de liña 555). Aí xa se garante que o unlock foi exitoso
(estado mutado, eventos emitidos, audit feita). Engadir o bloque de
execución de effects xusto aí.

### 5.3 — Atomicidade total (DECISIÓN CLAVE)

Se `nodeDef.effects` está definido e ten elementos:
1. Chamar `await this.effectsRunner.run(nodeDef.effects)`.
2. **Se devolve `err`**: facer rollback **completo**:
   a. `EffectsRunner.run` xa reverteu os effects parciais internamente
      (atomicidade interna de 2.1 sec 5.4). Polo tanto **NON chames
      `reverse` outra vez**; o estado dos effects xa está limpo.
   b. **Refund manual dos recursos** gastados no unlock:
      `this.resources.refund(costs, store.getState().budget)`,
      mutando o estado: `this.store.update(draft => { draft.budget = refundedBudget })`.
   c. **Reverter o estado do nodo**: `this.store.update(draft => {
      if (instance !== undefined) { draft.nodes[nodeId] = instance } else {
      delete draft.nodes[nodeId] } })`. (`instance` é o `NodeInstance`
      previo capturado ao principio do `unlock`; xa existe nesa variable
      local arredor de liña 386 — verifícao e reutilízao. Se non é
      facilmente accesible ao final, **captúrao explicitamente** nunha
      variable `previousInstance` ao principio do método.)
   d. **Emitir eventos de reversión** (importante para consistencia con
      subscriptores):
      - Para cada `cost`: `events.emit('budgetChange', cost.resourceId,
        oldAmount, refundedAmount)` (os valores son: oldAmount = budget
        tras o cobro = state.budget actual; refundedAmount = budget
        tras o refund).
      - `events.emit('stateChange', nodeId, { from: newNodeState, to:
        prevNodeState, timestamp: Date.now(), reason: 'effect_failed' })`.
      - `events.emit('lock', nodeId, previousInstance)` (mesmo evento
        que un lock manual, semánticamente o nodo volveu a estar locked).
   e. **Audit do fallo**: rexistrar unha entrada `custom` co name
      `'effects_failed'` e data `{ nodeId, failedAt: N, reason: <mensaxe
      do err>, revertedCount: N-1 }` (esa info vén no `err.context` de
      EffectsRunner segundo a sec 5.4 do 2.1). Emite `auditEntry`.
   f. **Devolver `err`** ao caller. Crear novo `YggdrasilError` con
      `ErrorCode.EFFECT_APPLICATION_FAILED` (xa existe en common,
      YGG_E017), mensaxe localizada, context co detalle do fallo.
   g. **NON facer rollback do audit `node_unlocked`** previo (xa se
      rexistrou e iso é histórico real do que pasou); a entrada nova
      `effects_failed` é compensatoria.

3. **Se devolve `ok(results)`**: continuar a 5.4 (audit dos effects) e
   logo `return ok({...})`.

### 5.4 — Audit agregada con detalle (DECISIÓN CLAVE)

Tras o `run` exitoso, **antes** do `return ok(...)`:
- Se a lista de effects tiña >=1 elemento, rexistrar **unha** entrada
  `custom`:
  ```ts
  const effectsEntry = this.audit.record({
    type: 'custom',
    name: 'effects_applied',
    data: {
      nodeId,
      count: results.length,
      effects: results.map(r => ({
        type: r.effect.type,
        applied: r.applied,
        reason: r.reason,
      })),
    },
  })
  if (effectsEntry !== null) {
    this.events.emit('auditEntry', effectsEntry)
  }
  ```
- **NON** rexistrar unha entrada por effect (5.4 directiva: agregada).
- Se `nodeDef.effects` é undefined ou array baleiro, NON rexistrar
  esta entrada (nada que reportar).

### 5.5 — Auto-referencia engine en EffectContext

`EffectContext.engine` é unha auto-referencia (this TreeEngine usándose
a si mesmo via EffectsRunner para `unlock_node` recursivo). Iso pode
disparar bucles que **xa están limitados** por `MAX_EFFECT_DEPTH = 8` en
EffectsRunner (sec 5.7 do 2.1). Non hai que cambiar nada aquí; só
confírmao mentalmente.

### 5.6 — Mesmo cambio en `lock`? NON

`lock` non executa effects. Iso sería decisión semántica nova
(¿reverter os effects do unlock orixinal? ¿executar outros effects de
"lock"?). **FÓRA DE ALCANCE.** Só `unlock` nesta sub-fase. Se algunha
vez se decide que `lock` debería reverter os effects do unlock orixinal,
esa será outra sub-fase coa súa decisión de deseño.

### 5.7 — Multi-tier: cada salto executa os seus effects

Cando un `unlock` sobe un tier (de N a N+1) en multi-tier, **execútanse
os `effects` do NodeDef cada vez**. É dicir, se desbloqueas un nodo con
3 tiers e `effects: [modify_resource +5 gold]`, vas gañar 5 gold cada
vez que subas un tier (total 15 gold se chegas a tier 3 facendo 3
unlocks consecutivos). Esta é a semántica natural; documenta no
comentario do código.

Se algunha vez se quere "effects que se aplican só ao alcanzar maxTier"
ou "effects por tier", iso é deseño futuro; non aquí.

---

## 6. TAREFAS (orde estrita)

### T0 — Setup + sanity
`pnpm install`; confirma 615 tests `--force`. Setup 0.1–0.5 ok.

### T1 — Cablear EffectsRunner no constructor (5.1)
Engade `private readonly effectsRunner: EffectsRunner` ao TreeEngine.
Instancialo tras `this.audit`. Pasa o `EffectContext` co `this` self-reference.
Typecheck 20/20.

### T2 — Capturar `previousInstance` ao inicio de `unlock`
Asegúrate de que o `NodeInstance` previo (antes do unlock) está
capturado nunha variable accesible ao final do método, para o rollback
de 5.3.c. Se xa é así (a variable `instance` arredor de liña 386), nada
que facer; confírmao. Se non, engade unha captura explícita
`const previousInstance = this.store.getState().nodes[nodeId]`.

### T3 — Inxectar o bloque de execución de effects (5.2 + 5.3 + 5.4)
Engade o bloque na posición exacta de 5.2 (despois do audit
`node_unlocked`, antes do `return ok` final).

```ts
// ── INICIO: 2.1.b — execución de effects tras unlock exitoso ──
const nodeEffects = nodeDef.effects
if (nodeEffects !== undefined && nodeEffects.length > 0) {
  const effectsResult = await this.effectsRunner.run(nodeEffects)
  if (!effectsResult.ok) {
    // ROLLBACK TOTAL: estado nodo + budget + eventos + audit compensatorio
    // ... (segundo 5.3.b-g)
    return err(/* nova YggdrasilError EFFECT_APPLICATION_FAILED ... */)
  }
  // Audit agregada con detalle (5.4)
  const effectsEntry = this.audit.record({
    type: 'custom',
    name: 'effects_applied',
    data: { /* ... segundo 5.4 ... */ },
  })
  if (effectsEntry !== null) {
    this.events.emit('auditEntry', effectsEntry)
  }
}
// ── FIN: 2.1.b ──

return ok({ nodeId, newState: newNodeState, tier: targetTier, spent: costs })
```

Implementa o rollback completo segundo 5.3. Usa funcións privadas se o
bloque queda demasiado grande (>40 liñas inline); pero mantén a lóxica
neste mesmo método ou nun único helper privado adxacente — non a
disperses.

### T4 — Tests novos

Ficheiro: `packages/core/__tests__/engine/TreeEngine.effects.test.ts`
(novo) ou ampliar un dos existentes (`TreeEngine.mutations.test.ts` se
encaixa mellor). Cobre **como mínimo**:

- **Unlock sen effects**: nodo con `effects: undefined` → unlock funciona
  igual que antes; cero entradas `effects_applied` no audit.
- **Unlock con effects exitosos**: nodo con `effects: [modify_resource
  +5 gold, trigger_event 'hooray']` → tras unlock, gold subiu 5, evento
  emitido, audit ten entrada `node_unlocked` + entrada `custom
  effects_applied` co `count: 2`.
- **Unlock con effect que falla**:
  - Caso A: nodo con `effects: [set_progress nodeId percent=999]` (fóra
    de rango). Tras `unlock`:
    - `err` devolto ao caller.
    - Estado do nodo: `locked` (rollback).
    - Budget: refund completo dos custos.
    - Eventos emitidos en orde: `budgetChange` (cobro), `stateChange`
      (locked→unlocked), `unlock`, então `budgetChange` (refund),
      `stateChange` (unlocked→locked, reason: 'effect_failed'), `lock`.
    - Audit: ten `node_unlocked` (xa rexistrada antes do fallo) **E**
      `custom effects_failed` co detalle.
  - Caso B: nodo con `effects: [modify_resource +5 gold, set_progress
    nodeId percent=999]` (primeiro effect OK, segundo falla). Verifica
    que o gold tras o rollback é o mesmo que antes do unlock
    (`EffectsRunner` xa reverteu o primeiro internamente, máis o refund
    do custo do unlock).
- **Multi-tier con effects (5.7)**: nodo con `maxTier: 3` e
  `effects: [modify_resource +5 gold]`. Tras 3 unlocks consecutivos: 15
  gold gañado total + 3 entradas `effects_applied` no audit (unha por
  tier).
- **Effects que tentan unlock recursivo**: nodo A con
  `effects: [unlock_node 'B']`, nodo B con prereq de A. Desbloquear A
  desbloquea B. Verifica audit + eventos coherentes.
- **Detección de bucle**: nodo A con `effects: [unlock_node 'B']`, nodo
  B con `effects: [unlock_node 'A']`. Desbloquear A → err
  `CIRCULAR_EFFECT` (de EffectsRunner) → rollback total de A.
- **Cero regresión**: os 615 tests previos seguen pasando.
- `.code` exacto en TODOS os err (lección recorrente).

### T5 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. **TreeEngine.ts
non debe baixar do baseline 96.18%.** Global non debe baixar do baseline
97.69%. O bloque novo de execución de effects + rollback debe estar
cuberto polos tests de T4 (debería rondar ≥95% local).

### T6 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Grep LITERAL no reporte. Cobertura LITERAL.

- Changeset **minor** — só `@yggdrasil-forge/core` (common NON se toca;
  confírmao).
- CHANGELOG `## [Unreleased]`:
  - Added: `TreeEngine.unlock` agora executa automaticamente
    `nodeDef.effects` tras unlock exitoso, con atomicidade total
    (rollback completo se algún effect falla).
  - Added: entrada audit `custom` con `name: 'effects_applied'` (éxito)
    ou `'effects_failed'` (rollback) por unlock con effects.

### T7 — Commit + push
Commit Conventional: `feat(core): wire EffectsRunner into TreeEngine.unlock with atomic rollback (sub-phase 2.1.b)`.
Push directo a `origin/main` (base `7dcc609`). Reporta hash.

---

## 7. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 8. QUE NON FACER

- ❌ Cablear effects en `lock`, `respec`, `applyChanges` (FÓRA DE
  ALCANCE — só `unlock`).
- ❌ Modificar EffectsRunner (xa está feito; só consumir).
- ❌ Engadir un tipo novo de `AuditAction` para effects (usa o `custom`
  existente).
- ❌ Engadir ErrorCodes novos (todos os necesarios existen).
- ❌ Modificar a API pública de `TreeEngine.unlock` (segue devolvendo
  `Promise<Result<UnlockResult>>`; o que cambia é a semántica interna).
- ❌ Cambiar a semántica de multi-tier dos effects (5.7: cada salto
  executa os effects, é o natural).
- ❌ Implementar best-effort en vez de atómico (5.3 é decisión firme).
- ❌ Implementar audit unha-entrada-por-effect en vez de agregada (5.4
  é decisión firme).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Refactorizar pezas existentes ("xa que toco..."). SÓ engadir.
- ❌ Tocar/mergear PR de release (#1) ou changeset-release.

---

## 9. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 2.1.b — COMPLETADA E EN origin/main
═══════════════════════════════════════
✅ Commit <hash> en origin/main (base 7dcc609)
✅ EffectsRunner cableado en TreeEngine como private readonly
✅ unlock executa nodeDef.effects automáticamente tras éxito
✅ Atomicidade total: rollback de effects + budget + estado + eventos
   + audit compensatorio se algún effect falla
✅ Audit agregada: 1 entrada 'custom' (effects_applied | effects_failed)
   por unlock con effects
✅ Multi-tier: effects execútanse en cada salto (5.7)
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / TreeEngine.ts <Y%>
   (baselines 1.19: 97.69% / 96.18%; non deben baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: <effects en lock/respec/applyChanges fóra
   de alcance, ou "ningunha">
✅ Changeset minor (core) + CHANGELOG
📋 Confirmado: /tmp/ygg-exec rutas C:/, sen heredoc, --force,
   integración push directo, transporte <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.2 (StatComputer)
═══════════════════════════════════════
```

---

*Fin do briefing 2.1.b. Atomicidade total + audit agregada decididas
polo director. Calquera caso non cuberto → ESCALAR (0.6).*
