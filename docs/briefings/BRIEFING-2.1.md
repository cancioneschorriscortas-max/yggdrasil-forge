# BRIEFING — SUB-FASE 2.1 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Primeira sub-fase da Fase 2.** Marca o ton; deseñouse con coidado especial
> para minimizar escalados.

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
T0→T9 sen cambios.

**0.5 — ANTI-PLACEHOLDER (grep verificable).** Antes do commit:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Resultado LITERAL no reporte. Distingue débeda pre-existente das NOVAS.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`, detén o avance. As decisións
máis comúns desta sub-fase **xa están pre-resoltas** abaixo (secs. 5 e
6) precisamente para evitar escalados; aínda así, **se atopas algo non
cuberto, escala**, non improvises.

**0.7 — ENTREGA.** Integración = `git push` directo a `origin/main`. Se
transporte por parche: aplícase **DENDE A RAÍZ** (NUNCA Downloads —
incidente 1.15), push final polo autor.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.1** de Yggdrasil Forge. **Primeira sub-fase da Fase 2.**
Tipo: **feature nova grande** — `EffectsRunner` standalone con 8 dos 10
tipos de Effect, forward + reverse.
Á entrada: Fase 1 pechada con 1.19 addendum (`05dbf46`), 547 tests,
cobertura 97.69%, 0 débeda funcional.

---

## 2. CONTEXTO MÍNIMO

`@yggdrasil-forge/core` ten o motor completo da Fase 1. **`types/
effects.ts` xa define os 10 tipos de Effect e o tipo `EffectResult`**
(creado en 1.4). Esta sub-fase implementa a clase `EffectsRunner` que
executa eses effects.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `05dbf46`.
- 547 tests pasan en core (33 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Grep limpo.
- `types/effects.ts` define `Effect` (unión de 10 variantes) e
  `EffectResult { effect, applied, reason? }`. NON modificar estes
  tipos sen escalar.
- `UnlockResolver.evaluate(rule, ctx): boolean` xa existe e avalía
  `UnlockCondition`. **Reutilízase para `conditional` effect.**
- `ResourceManager.applyCost/refund` existe. **Reutilízase para
  `modify_resource`.**
- `EventEmitter` con `EventMap` xa ten 15 eventos. **NON ten un evento
  xenérico `customEvent` para `trigger_event`** — esta é unha das
  decisións pre-resoltas (sección 5).
- `NodeInstance` NON ten campo `visibility/hidden` — outra decisión
  pre-resolta (sección 5).
- ErrorCodes Engine ata `YGG_E012`. Engadiremos algúns novos (sección 5).

Entorno: Windows + Git Bash. Repo `C:\Users\tajes\proxectos\yggdrasil-forge`.

---

## 4. OBXECTIVO (unha frase)

Implementar `EffectsRunner` como peza illada do engine, con `run` e
`reverse` (síncronos por agora; firma `Promise<Result<...>>` para
flexibilidade futura) e `validate`, cubrindo 8 dos 10 tipos de Effect
con forward + reverse completos, e **sen** conectalo a `TreeEngine.unlock`
(iso é sub-fase aparte 2.1.b).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Standalone, NON integrado en TreeEngine.unlock

`EffectsRunner` constrúese como peza illada. `TreeEngine` NON o
instancia nin o chama nesta sub-fase. A integración `unlock → effects` é
**sub-fase 2.1.b** (despois de 2.1 e antes de 2.2 ou xunta a 2.6 de
tests de integración da Fase 2). Razón: separar deseño de runner de
deseño de integración reduce a superficie de decisión simultánea.

### 5.2 — Alcance: 8 dos 10 effects

**Implementar (forward + reverse):**
1. `modify_resource` (reusa `ResourceManager`)
2. `trigger_event` (ver 5.6)
3. `conditional` (reusa `UnlockResolver`)
4. `composite` (recursión sobre os internos)
5. `set_node_visibility` (require campo novo en NodeInstance; ver 5.5)
6. `unlock_node` (recibe TreeEngine no contexto; ver 5.7)
7. `modify_node_state` (con restricións; ver 5.8)
8. `set_progress` (validación 0-100; ver 5.9)

**NON implementar (devolven err `EFFECT_TYPE_UNSUPPORTED`):**
- `modify_stat` (precisa `StatComputer`, sub-fase 2.2)
- `plugin` (precisa `PluginRegistry`, fase 8)

### 5.3 — ErrorCodes novos (engadir a common nesta sub-fase)

Familia Engine (`YGG_E`), tras `CHANGE_CONFLICT=YGG_E012`:
- `EFFECT_TYPE_UNSUPPORTED = 'YGG_E013'` — para `modify_stat` e `plugin`.
- `IRREVERSIBLE_EFFECT = 'YGG_E014'` — para `reverse()` sobre un effect
  marcado `irreversible: true` (só `trigger_event` o admite hoxe).
- `CIRCULAR_EFFECT = 'YGG_E015'` — bucle detectado en `unlock_node`
  recursivo (ver 5.7).
- `EFFECT_TARGET_NOT_FOUND = 'YGG_E016'` — `nodeId`/`resourceId`
  referenciado por un effect non existe na TreeDef.
- `EFFECT_APPLICATION_FAILED = 'YGG_E017'` — fallo xeral ao aplicar
  (ex. recursos insuficientes nun `modify_resource`).

Cada un cunha mensaxe gl/es/en seguindo o patrón de `messages.ts`.
Placeholders mínimos pero útiles (ex. `{effectType}`, `{nodeId}`,
`{cycle}`).

### 5.4 — Atomicidade: todo-ou-nada con reverse automático

Cando `run(effects)` aplica unha lista e o N-ésimo effect falla:
- **Revertir automaticamente** os N-1 anteriores en orde inversa.
- Devolver `err(EFFECT_APPLICATION_FAILED)` co context: `{ failedAt: N,
  failedEffect, reason, revertedCount }`.
- Se algún dos reverts tamén falla, o estado queda nun punto coñecido
  pero non recuperado; devolve err especial co detalle. (Caso patolóxico
  raro; documentalo no comentario, non agochar.)

`run` devolve `ok(EffectResult[])` só se TODOS aplicaron. Se algún
estaba marcado `irreversible: true` e estaba antes do N-ésimo que
fallou: documentar no reason que **non se reverteu** (é por deseño dos
`irreversible`).

### 5.5 — `set_node_visibility`: engade campo a NodeInstance

`NodeInstance` non ten campo de visibilidade. Engádeo nesta sub-fase a
`types/node.ts`:
```ts
/** Visibilidade do nodo na UI (default true se omitido). */
readonly visible?: boolean
```
`set_node_visibility` muta este campo vía `StateStore.update`. **Para
reverse:** garda o valor previo en `EffectResult.previousValue` (campo
novo no tipo; ver 5.10).

### 5.6 — `trigger_event`: usa novo evento `customEvent` no EventMap

`EventMap` non ten un xenérico `trigger_event`. **Engade a
`types/events.ts`:**
```ts
/** Effect 'trigger_event' disparou un evento custom. */
readonly customEvent: (eventName: string, payload?: unknown) => void
```
O `trigger_event` effect emite este evento. **Reverse:** se
`irreversible: true` → err `IRREVERSIBLE_EFFECT`; senón, emite o mesmo
evento cun payload especial `{ reverted: true, original: payload }`
(porque non se pode "desemitir" un evento real). Documenta isto no
comentario do effect.

### 5.7 — `unlock_node`: TreeEngine no EffectContext + detección de bucles

Define `EffectContext` (tipo novo):
```ts
export interface EffectContext {
  readonly engine: TreeEngine          // para unlock_node, modify_node_state, set_progress
  readonly store: StateStore           // para set_node_visibility
  readonly resources: ResourceManager  // para modify_resource
  readonly resolver: UnlockResolver    // para conditional
  readonly events: EventEmitter        // para trigger_event
  readonly locale: Locale              // para mensaxes de erro
}
```
**Detección de bucles**: `run` mantén un `Set<string>` interno de
`nodeIds` desbloqueados durante esta invocación. Se `unlock_node` tenta
desbloquear un nodo que xa está nese set durante a mesma invocación, ou
si a profundidade recursiva supera **8** (constante;
`MAX_EFFECT_DEPTH`), devolve err `CIRCULAR_EFFECT` con `{ cycle:
[nodeIds] }` no context.

`unlock_node` chama a `engine.unlock(nodeId)` (do contexto). Se devolve
err, propaga. **Reverse:** chama a `engine.lock(nodeId)`. Se o lock
falla (ex. xa estaba locked), documentar no `reason` pero non considerar
fallo crítico do reverse.

### 5.8 — `modify_node_state`: restricións

Permitir SÓ transicións explícitas e seguras. **Lista branca de pares
(from→to) permitidos:**
- `'locked' → 'unlockable'` (mostrar que está dispoñible)
- `'unlockable' → 'locked'` (ocultar dispoñibilidade)
- `'unlocked' → 'disabled'` (desactivar temporalmente)
- `'disabled' → 'unlocked'` (rehabilitar)

Calquera outra transición devolve err `EFFECT_APPLICATION_FAILED` co
context indicando "transition not allowed: {from}→{to}". **NON** permitir
saltar a `'maxed'` ou a `'unlocked'` directamente (iso debe pasar por
`unlock` co seu fluxo de custos/prerequisites). Reverse: aplica a
transición inversa (mesmas regras).

### 5.9 — `set_progress`: validación 0-100

Effect `set_progress { nodeId, percent }`. Valida `0 ≤ percent ≤ 100`;
fóra de rango → err `EFFECT_APPLICATION_FAILED`. Aplica vía
`store.update`, garda valor previo para reverse. **Reverse:** restaura o
valor previo (ou 0 se non había progreso).

### 5.10 — Extensión de `EffectResult` para reverse

`EffectResult` actual ten `{ effect, applied, reason? }`. **Engade en
`types/effects.ts`:**
```ts
/** Valor previo do campo modificado, gardado para reverse. */
readonly previousValue?: unknown
```
Cada effect que muta estado debe gardar o `previousValue` necesario para
reverter (cantidade previa do recurso, visibilidade previa, estado
previo do nodo, progreso previo). `trigger_event` non garda valor.
`composite` garda os `previousValue` dos internos.

### 5.11 — API pública exacta

```ts
class EffectsRunner {
  constructor(context: EffectContext)

  // Síncrono por agora; firma async para flexibilidade futura.
  run(effects: readonly Effect[]): Promise<Result<readonly EffectResult[]>>
  reverse(results: readonly EffectResult[]): Promise<Result<void>>
  validate(effects: readonly Effect[]): Result<void>
}
```

**`validate`** comproba (estaticamente, sen aplicar):
- Cada `Effect` é dun tipo coñecido.
- `modify_stat` e `plugin` → err `EFFECT_TYPE_UNSUPPORTED` (rexéitanse
  na validación, non só ao executar).
- `nodeId`/`resourceId` referenciados existen na TreeDef (require acceso
  a `context.engine.getTreeDef()`).
- `set_progress`: `0 ≤ percent ≤ 100`.
- `modify_node_state`: transición na lista branca (5.8).
- `composite` / `conditional`: validar recursivamente os internos.

**`reverse`** recibe os `EffectResult[]` que devolveu un `run` anterior.
Itera en orde **inversa**. Cada effect-result aplica o seu reverse
usando o `previousValue`. Se algún effect era `irreversible: true` →
err `IRREVERSIBLE_EFFECT`.

---

## 6. UBICACIÓN E ESTRUTURA

`packages/core/src/engine/EffectsRunner.ts` (un único ficheiro, ~400-500
liñas estimadas). Helpers internos no mesmo ficheiro (non exportados).
`EffectContext` exportada desde `engine/EffectsRunner.ts` ou
`types/effects.ts` (decide ti pola coherencia; reversible).

Export desde `engine/index.ts` segundo patrón existente:
```ts
export { EffectsRunner, type EffectContext } from './EffectsRunner.js'
```

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity
`pnpm install`; 547 tests `--force`. Setup 0.1–0.5 confirmado.

### T1 — Engadir ErrorCodes novos a common (sección 5.3)
Edita `packages/common/src/errors/codes.ts` e `messages.ts`. 5 códigos
novos (`YGG_E013`...`YGG_E017`) con mensaxes gl/es/en. Typecheck 20/20.
Commit propio: `feat(common): add effects error codes`.

### T2 — Extender tipos en core (seccións 5.5, 5.6, 5.10)
- `types/node.ts`: engadir `readonly visible?: boolean` a `NodeInstance`.
- `types/events.ts`: engadir `customEvent` ao `EventMap`.
- `types/effects.ts`: engadir `readonly previousValue?: unknown` a
  `EffectResult`. Tamén define `EffectContext` aquí ou en
  `EffectsRunner.ts` (decide).
- Actualiza o esquema Zod (`treeDefSchema.ts`) se o cambio en
  `NodeInstance` afecta — **probablemente NON afecta** porque `visible` é
  campo de estado runtime, non de definición; pero verifícao.
- Confirma que ningún test pre-existente rompe co cambio aditivo (cero
  modificacións de tests existentes; se algún rompe, **escala**).

### T3 — EffectsRunner: esqueleto + validate
Crea `EffectsRunner.ts` con:
- Constructor recibe `EffectContext`.
- `validate(effects)` segundo 5.11. Recursión para `composite`/`conditional`.

Tests unitarios para `validate` antes de seguir: cada tipo de effect, casos
válidos e inválidos.

### T4 — run() forward
Implementa `run` con atomicidade (5.4): aplica un a un, garda
`EffectResult` con `previousValue`. Se algún falla, revira os
anteriores e devolve err con contexto rico.
- `modify_resource`: usa `ResourceManager.applyCost([{resourceId, amount}])`
  para `op:'-'`, `refund` para `op:'+'`. Para `op:'*'` calcula
  manualmente e usa `applyCost` co diferencial.
- `trigger_event`: emite `customEvent`.
- `conditional`: avalía con `UnlockResolver.evaluate`; segundo resultado
  executa `then` ou `else` (recursión).
- `composite`: recursión.
- `set_node_visibility`: `store.update` mutando `visible`.
- `unlock_node`: detección de bucles (5.7); chamar `engine.unlock`.
- `modify_node_state`: lista branca (5.8); `store.update`.
- `set_progress`: validar rango; `store.update`.
- `modify_stat` / `plugin`: err `EFFECT_TYPE_UNSUPPORTED`.

### T5 — reverse()
Itera en orde inversa sobre `EffectResult[]`. Cada un usa o seu
`previousValue` para reverter:
- `modify_resource`: aplica operación inversa.
- `trigger_event`: se `irreversible:true` → err `IRREVERSIBLE_EFFECT`;
  senón emite `customEvent` co payload `{ reverted: true, original }`.
- `conditional`: reverse dos effects que se aplicaron (gardados nos
  results internos do composite-like que xeraches).
- `composite`: reverse recursivo en orde inversa.
- `set_node_visibility`: restaura `previousValue`.
- `unlock_node`: `engine.lock(nodeId)`. Se falla, documenta no reason.
- `modify_node_state`: aplica transición inversa.
- `set_progress`: restaura `previousValue` (ou 0).

### T6 — Tests
`packages/core/__tests__/engine/EffectsRunner.test.ts` (unitario). Cobre
COMO MÍNIMO:
- Cada un dos 8 effects: forward feliz + reverse feliz + verificación
  de `previousValue` correcto.
- `validate`: válido e inválido para cada tipo (incluído rexeite de
  `modify_stat` e `plugin`).
- Atomicidade: lista de 5 effects onde o 3º falla → estado intacto, os
  2 primeiros revertidos.
- `irreversible`: `trigger_event` con `irreversible:true` → reverse
  devolve err `IRREVERSIBLE_EFFECT`.
- Detección de bucles: dous nodos A→B→A con `unlock_node` mutuos → err
  `CIRCULAR_EFFECT`.
- Profundidade > 8 → err `CIRCULAR_EFFECT`.
- `modify_node_state` con transición non na lista branca → err.
- `set_progress` fóra de 0-100 → err.
- `conditional`: `then` aplicado se condición true, `else` se false.
- `composite` aniñado a 3 niveis.
- `.code` exacto en TODOS os err (lección recorrente).

Número segundo cobertura honesta; reporta o exacto.

### T7 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. **EffectsRunner.ts
debe estar a ≥90% nas catro métricas.** Global non debe baixar do baseline
97.69%. Se algunha rama queda sen cubrir, engade test ou documenta como
imposible-de-alcanzar con xustificación.

### T8 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Resultado grep LITERAL no reporte. Cobertura LITERAL no reporte
(global + EffectsRunner.ts).

- Changeset **minor** — **common + core sincronizado** (engaden códigos novos
  a common + EffectsRunner novo en core). Sincronización de versionado xa
  é o costume do proxecto.
- CHANGELOG `## [Unreleased]`:
  - Added: EffectsRunner (8 dos 10 effects, forward+reverse, atomicidade);
    EffectContext; campo `NodeInstance.visible`; evento `customEvent`;
    `EffectResult.previousValue`; ErrorCodes `EFFECT_TYPE_UNSUPPORTED`
    (E013), `IRREVERSIBLE_EFFECT` (E014), `CIRCULAR_EFFECT` (E015),
    `EFFECT_TARGET_NOT_FOUND` (E016), `EFFECT_APPLICATION_FAILED` (E017).
  - Note: EffectsRunner é peza standalone; integración automática con
    `TreeEngine.unlock` é sub-fase aparte (2.1.b). `modify_stat` e
    `plugin` quedan para 2.2 / fase 8.

### T9 — Commits + push directo
Commits Conventional separados (mínimo 3):
1. `feat(common): add effects error codes (E013-E017)`
2. `feat(core): add EffectsRunner with 8 effect types, atomic forward/reverse`
3. `chore: changeset + CHANGELOG for 2.1`

**Push directo a `origin/main`** (base `05dbf46`), tras avisar ao autor.
Confirma hash e `git log` no reporte.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`** (incluído no manexo de `payload?: unknown` —
trátase como `unknown`, non `any`). NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Conectar EffectsRunner a `TreeEngine.unlock` (5.1 — é 2.1.b aparte).
- ❌ Implementar `modify_stat` ou `plugin` (5.2 — devolven `EFFECT_TYPE_UNSUPPORTED`).
- ❌ Modificar `Effect` types existentes (10 variantes son contrato fixo de 1.4).
- ❌ Permitir transicións de estado fóra da lista branca (5.8).
- ❌ Permitir `unlock_node` sen detección de bucles (5.7 require contador
  + profundidade máxima 8).
- ❌ `any` en ningún sitio (use `unknown` para payloads e gardas de tipo).
- ❌ Placeholders / valores de recheo (0.5).
- ❌ Refactorizar pezas existentes ("xa que toco..."). SÓ engadir.
- ❌ Tocar/mergear o PR de release (#1) nin o de changeset-release.
- ❌ Engadir dependencias / tocar lockfile (Zod xa está, immer xa está,
  non necesitas máis).

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 2.1 — COMPLETADA E EN origin/main
═══════════════════════════════════════
✅ Commits <hashes> en origin/main (base 05dbf46)
✅ ErrorCodes E013-E017 engadidos a common + mensaxes gl/es/en
✅ Tipos: NodeInstance.visible, EventMap.customEvent,
   EffectResult.previousValue, EffectContext
✅ EffectsRunner: 8 effects forward+reverse + atomicidade +
   detección de bucles + validate
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / EffectsRunner.ts <Y%>
   (baseline 1.19: 97.69% global; obxectivo ≥90% en EffectsRunner)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: <ex. modify_stat/plugin como
   EFFECT_TYPE_UNSUPPORTED, integración con unlock diferida a 2.1.b,
   ou "ningunha">
✅ Changeset minor (common+core sincronizado) + CHANGELOG
📋 Confirmado: /tmp/ygg-exec rutas C:/, sen heredoc, --force,
   integración push directo, transporte <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.1.b (integración EffectsRunner ↔ TreeEngine.unlock)
ou 2.2 (StatComputer) segundo decida o director.
═══════════════════════════════════════
```

---

*Fin do briefing 2.1. Primeira sub-fase da Fase 2. Decisións principais
pre-resoltas para minimizar escalados; escalar igual se aparece algo
non cuberto.*
