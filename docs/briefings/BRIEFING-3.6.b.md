# BRIEFING — SUB-FASE 3.6.b de Yggdrasil Forge

> Pega este documento no chat executor.
> **Última sub-fase de implementación da Fase 3.** Completar o
> Reconciler implementando as tres opcións pendentes de
> `ReconcileOptions`: `grandfatherIncreasedCosts`,
> `refundDecreasedCosts`, e `invalidateOnPrereqFailure` (con 3 valores).
> Tras esta sub-fase, Fase 3 pode pecharse oficialmente.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1**:
calquera modificación fóra de §6 require **ESCALAR ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.6.b — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.6.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.6.b** de Yggdrasil Forge. **Completa o Reconciler**
implementando as tres opcións pendentes de `ReconcileOptions`:

1. `grandfatherIncreasedCosts`: mantén nodos unlocked sen cobrar
   diferenza cando o custo subiu.
2. `refundDecreasedCosts`: devolve diferenza ao budget cando custo baixou.
3. `invalidateOnPrereqFailure`: 3 políticas (`disable`/`refund`/`preserve`)
   para nodos cuxos prerequisites xa non se cumpren co estado actual.

---

## 2. CONTEXTO MÍNIMO

A 3.6.a entregou o Reconciler base con `refundRemovedNodes`. As
outras tres opcións de `ReconcileOptions` xa están **na interface**
pero non afectaban o comportamento. Esta sub-fase **actívaas**.

**Reutilización**: a peza `UnlockResolver` xa existe e expón
`evaluate(rule, ctx): boolean`. **Reutilízase** para
`invalidateOnPrereqFailure` (cero re-implementación).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `3005c41` (hixiene MASTER tras 3.6.a).
- 966 tests core + 60 common + 171 storage = ~1290 monorepo limpo.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`Reconciler.ts`** existe en
  `packages/core/src/engine/reconciler/Reconciler.ts` con:
  - `ReconcileOptions` interface (4 campos) — **non modificar**.
  - `ReconcileChange` discriminated union con só 2 tipos
    (`'node_removed'`, `'cost_refunded'`) — engadiranse 4 máis nesta
    sub-fase.
  - `ReconcileResult` interface — **non modificar**.
  - Función `reconcile(...)` ~180 liñas — amplíase.
- **`UnlockResolver`** dispoñible en
  `packages/core/src/engine/UnlockResolver.ts`:
  - `evaluate(rule: UnlockRule, ctx: UnlockResolverContext): boolean`.
  - `UnlockResolverContext` require `treeDef`, `state`, e
    opcionalmente `dependencyGraph`, `customEvaluators`, `locale`,
    `progressManager`.
- **`Cost { resourceId: string; amount: number }`** simple.
- **`NodeDef.cost?: readonly Cost[]`** (opcional).
- **`NodeDef.prerequisites?: UnlockRule`** (opcional).
- **`NodeInstance.state`** valores: `'locked' | 'unlockable' |
  'in_progress' | 'unlocked' | 'maxed'`.
- **3.6.a decidiu**: `'maxed'` tráctase como `'unlocked'` para refund.
  **Coherencia obriga**: o mesmo aplica en 3.6.b (`grandfatherIncreasedCosts`,
  `refundDecreasedCosts` e `invalidateOnPrereqFailure` consideran
  ambos estados como "desbloqueado").
- **ErrorCode `RECONCILE_TREE_MISMATCH` (YGG_R001)** existe; cero
  ErrorCodes novos en 3.6.b.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Ampliar `packages/core/src/engine/reconciler/Reconciler.ts` para
implementar as tres opcións pendentes (`grandfatherIncreasedCosts`,
`refundDecreasedCosts`, `invalidateOnPrereqFailure`), engadir 4 tipos
novos a `ReconcileChange`, manter `ReconcileOptions` e
`ReconcileResult` intactas, reutilizar `UnlockResolver` para a
avaliación de prereqs, e cubrir con tests funcionais completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estrutura: Reconciler.ts único con helpers privados

**Mantén un só ficheiro** `Reconciler.ts`. Engade helpers privados a
**nivel de módulo** (funcións privadas non exportadas) para
estruturar internamente.

Estrutura proposta:

```ts
// ── Helpers privados a nivel de módulo ──
function compareCosts(...): Map<string, { oldAmount: number; newAmount: number }> { ... }
function processRemovedNodes(...): ... { ... } // xa existe (3.6.a)
function processCostChanges(...): ... { ... } // NOVO (5.4 + 5.5)
function processPrereqFailures(...): ... { ... } // NOVO (5.6)

// ── Función pública ──
export function reconcile(...): Result<ReconcileResult> { ... }
```

**Cero subdirectorios novos**. **Cero exportación destes helpers**.

### 5.2 — ReconcileChange: 4 tipos novos

Ampliar a discriminated union con 4 variantes novas:

```ts
export type ReconcileChange =
  | { readonly type: 'node_removed'; readonly nodeId: string; readonly wasUnlocked: boolean }
  | { readonly type: 'cost_refunded'; readonly nodeId: string; readonly resourceId: string; readonly amount: number }
  // ── NOVOS en 3.6.b ──
  | {
      readonly type: 'cost_grandfathered'
      readonly nodeId: string
      readonly resourceId: string
      readonly oldAmount: number
      readonly newAmount: number
    }
  | {
      readonly type: 'cost_decreased_refunded'
      readonly nodeId: string
      readonly resourceId: string
      readonly oldAmount: number
      readonly newAmount: number
      readonly refundAmount: number  // = oldAmount - newAmount
    }
  | {
      readonly type: 'prereq_failure_disabled'
      readonly nodeId: string
    }
  | {
      readonly type: 'prereq_failure_refunded'
      readonly nodeId: string
      readonly refunds: readonly { readonly resourceId: string; readonly amount: number }[]
    }
  | {
      readonly type: 'prereq_failure_preserved'
      readonly nodeId: string
    }
```

**Total: 7 tipos** (2 de 3.6.a + 5 novos en 3.6.b).

### 5.3 — Helper `compareCosts`

Compara dúas listas de Cost e devolve Map de cambios por resourceId:

```ts
function compareCosts(
  oldCosts: readonly Cost[] | undefined,
  newCosts: readonly Cost[] | undefined,
): Map<string, { oldAmount: number; newAmount: number }> {
  const result = new Map<string, { oldAmount: number; newAmount: number }>()

  // Indexar oldCosts por resourceId.
  const oldByResource = new Map<string, number>()
  if (oldCosts !== undefined) {
    for (const c of oldCosts) {
      oldByResource.set(c.resourceId, c.amount)
    }
  }

  // Indexar newCosts por resourceId.
  const newByResource = new Map<string, number>()
  if (newCosts !== undefined) {
    for (const c of newCosts) {
      newByResource.set(c.resourceId, c.amount)
    }
  }

  // Unir todos os resourceIds.
  const allResourceIds = new Set<string>()
  for (const id of oldByResource.keys()) allResourceIds.add(id)
  for (const id of newByResource.keys()) allResourceIds.add(id)

  for (const resourceId of allResourceIds) {
    const oldAmount = oldByResource.get(resourceId) ?? 0
    const newAmount = newByResource.get(resourceId) ?? 0
    if (oldAmount !== newAmount) {
      result.set(resourceId, { oldAmount, newAmount })
    }
  }

  return result
}
```

**Importante**:
- Devolve **só os recursos que cambiaron** (oldAmount !== newAmount).
- Recurso que aparece en new pero non en old: `oldAmount = 0`,
  `newAmount = X`. **Trátase como custo subido**.
- Recurso que aparece en old pero non en new: `oldAmount = X`,
  `newAmount = 0`. **Trátase como custo baixado**.

### 5.4 — `grandfatherIncreasedCosts`: implementación

**Lóxica**:
1. Para cada nodo que está en ambas TreeDef (intersección oldNodeIds ∩ newNodeIds):
2. Se o NodeInstance está `unlocked` ou `maxed` no oldTreeState:
3. Comparar costs vellos vs novos con `compareCosts`.
4. Para cada `(resourceId, {oldAmount, newAmount})` onde `newAmount > oldAmount`:
   - Se `options.grandfatherIncreasedCosts === true`: emitir
     `cost_grandfathered`. **Cero modificación de estado** (o nodo
     segue unlocked).
   - Se `false`: **cero acción** nesta sub-fase. Documenta: o
     comportamento default cando `grandfatherIncreasedCosts === false`
     **non é "cobrar a diferenza" nin "lock o nodo"**. É **deixar
     unlocked sen cobrar** (estado actual sen cambios). Iso é **decisión
     do director**: a opción só **opta a marcar explicitamente o
     grandfathering como evento auditable**; rexeitalo non implica
     mudar comportamento.

**Razón da decisión do director sobre `grandfatherIncreasedCosts === false`**:
- O TreeState non se modifica polo mero feito de que un custo subiu.
- A diferenza non se cobra retroactivamente (sería arbitrario).
- O nodo non se lock (sería castigar ao usuario por cambios do autor).
- **`grandfatherIncreasedCosts: false` significa**: "non marques como
  cambio auditable". `true` significa: "marca como grandfathered para
  auditoría/UI".

### 5.5 — `refundDecreasedCosts`: implementación

**Lóxica**:
1. Mesma identificación que 5.4.
2. Para cada `(resourceId, {oldAmount, newAmount})` onde
   `newAmount < oldAmount`:
   - Se `options.refundDecreasedCosts === true`:
     - Calcular `refundAmount = oldAmount - newAmount`.
     - Emitir `cost_decreased_refunded`.
     - Aplicar refund: `budget.resources[resourceId] += refundAmount`.
   - Se `false`: cero acción.

**Importante**:
- Igual ca refundRemovedNodes da 3.6.a, **cero comprobación de
  máximo do recurso** (over-cap = responsabilidade do consumidor).

### 5.6 — `invalidateOnPrereqFailure`: implementación

**A opción máis complexa**. Tres comportamentos según valor.

**Lóxica común a todos os valores**:
1. Para cada nodo cuxo NodeInstance está `unlocked` ou `maxed`:
2. Se o nodo segue en newTreeDef (cero acción para nodos eliminados;
   xa procesados en 5.4 de 3.6.a):
3. Construír `UnlockResolverContext` co **newTreeDef** e o
   **TreeState en curso de reconciliación** (despois de procesar
   refunds anteriores).
4. Avaliar `newNodeDef.prerequisites` se existen:
   - Se cumpre → cero acción.
   - Se non cumpre → aplicar política según valor de
     `invalidateOnPrereqFailure`.

**Construción do `UnlockResolverContext`**:

```ts
// Crear instance do UnlockResolver ao principio do reconcile.
const resolver = new UnlockResolver()

// Para cada nodo a avaliar:
const ctx: UnlockResolverContext = {
  treeDef: newTreeDef,
  state: workingTreeState,  // o TreeState que está sendo construído
  locale,
}
const cumpre = resolver.evaluate(newNodeDef.prerequisites, ctx)
```

**Importante**:
- `workingTreeState` é o **estado en construcción**, non o
  oldTreeState. Iso é crítico: se previamente quitamos nodos via
  refundRemovedNodes, o estado xa non os ten. Avaliar prereqs contra
  o estado en curso é coherente.
- **Cero `progressManager`** no context: para reconciliación, o
  progress dos nodos é o que está no state (cero cómputo dinámico).
  UnlockResolver xa ten fallback legacy se progressManager non se
  pasa (documentado).

**Política según valor**:

```ts
switch (options.invalidateOnPrereqFailure) {
  case 'disable':
    // Pasa o nodo a 'locked'. Cero refund.
    workingTreeState.nodes[nodeId].state = 'locked'
    changes.push({ type: 'prereq_failure_disabled', nodeId })
    break

  case 'refund':
    // Pasa o nodo a 'locked' + refund de oldNodeDef.cost.
    const oldCost = oldTreeDef.nodes.find(n => n.id === nodeId)?.cost
    const refunds: { resourceId: string; amount: number }[] = []
    if (oldCost !== undefined) {
      for (const c of oldCost) {
        workingBudget.resources[c.resourceId] =
          (workingBudget.resources[c.resourceId] ?? 0) + c.amount
        refunds.push({ resourceId: c.resourceId, amount: c.amount })
      }
    }
    workingTreeState.nodes[nodeId].state = 'locked'
    changes.push({ type: 'prereq_failure_refunded', nodeId, refunds })
    break

  case 'preserve':
    // ATENCIÓN: rompe invariante "nodo unlocked SEMPRE cumpre prereqs".
    // Cero modificación de estado. Emite o evento para que o consumidor
    // poida auditar.
    changes.push({ type: 'prereq_failure_preserved', nodeId })
    break
}
```

**Documentación obrigatoria no JSDoc da función `reconcile`**:

> "`invalidateOnPrereqFailure: 'preserve'`: **ATENCIÓN**: mantén o
> nodo desbloqueado aínda que os seus prerequisites xa non se cumpren
> co estado actual. **Este modo rompe a invariante fundamental do
> engine** ('un nodo unlocked sempre cumpre os seus prereqs'). Pode
> provocar comportamentos inesperados en operacións posteriores
> (canUnlock, applyChanges, recálculo de stats derivados). Use só se
> o consumidor xestiona explicitamente as consecuencias. O
> `ReconcileResult.changes` inclúe `prereq_failure_preserved` para
> cada caso afectado para permitir auditoría."

### 5.7 — Orde de aplicación: refunds primeiro, prereqs último

**Orde estrita** dentro de `reconcile`:

1. **Validación** oldTreeDef.id === newTreeDef.id (xa existe, 3.6.a).
2. **processRemovedNodes** (refundRemovedNodes) — xa existe, 3.6.a.
3. **processCostChanges** (grandfatherIncreasedCosts + refundDecreasedCosts) — NOVO 5.4 + 5.5.
4. **processPrereqFailures** (invalidateOnPrereqFailure) — NOVO 5.6.

**Cero rollback**: orde fixa, **cero estado intermedio que xestionar**.

**Razón**:
- Refunds non poden invalidar outros refunds (operacións
  acumulativas no budget).
- prereqs último: se un nodo é `disabled` ou `refunded` por prereq,
  iso é o estado final. **Os refunds previos do mesmo nodo seguen
  sendo válidos** (un nodo con custo grandfathered que despois é
  invalidated por prereq → segue marcando grandfathered no rexistro,
  e ademais pasa a locked).

**Documentar orde no JSDoc**.

### 5.8 — Determinismo: orde dos nodos procesados

Iterar nodos en **orde de aparición na newTreeDef** (orde do array
`newTreeDef.nodes`). **Cero ordenación adicional**. **Cero
randomness**. **Cero hashing**. Resultado: mesma entrada produce
sempre mesma saída no mesmo orde.

**Razón**: tests determinist (igual saída entre execucións); reportes
auditables.

### 5.9 — `'maxed'` consistente con 3.6.a

**Coherencia obriga**: o estado `'maxed'` tráctase como
`'unlocked'` en todas as operacións desta sub-fase:

- 5.4 grandfather: se NodeInstance.state === 'unlocked' || 'maxed'.
- 5.5 refundDecreased: idem.
- 5.6 invalidateOnPrereqFailure: idem.

Documentar no JSDoc da función `reconcile`.

### 5.10 — `processPrereqFailures` cero recursividade

Avaliar prereqs **unha vez** por nodo, sobre o estado en curso. **Cero
recursión** (se invalidar nodo A causa que B xa non cumpre, B non se
re-avaliar nesta pasada). Razón:
- A reconciliación é unha operación **discreta** sobre snapshot.
- Recursión expande o tempo de execución e introduce cuestións de orde
  arbitraria.
- O consumidor pode aplicar varias rondas de reconciliación se quere
  estado completamente consistente.

Documentar como **limitación coñecida** no JSDoc.

### 5.11 — Cero modificación de pezas existentes

**Cero modificación** de TreeEngine, UnlockResolver, ProgressManager,
StatComputer, EffectsRunner, TreeDefValidator, ningún tipo, ningún
schema. **Cero modificación** de `ReconcileOptions` interface
(xa ten os 4 campos). **Cero modificación** de `ReconcileResult`.

A **única ampliación**:
- `ReconcileChange`: 5 tipos novos engadidos á unión.
- Función `reconcile()`: ampliada con lóxica para as 3 opcións
  pendentes.

### 5.12 — Cero ErrorCodes novos

`RECONCILE_TREE_MISMATCH` (YGG_R001) é o único de Reconcile e xa
existe. **Cero edicións** en `packages/common/`.

### 5.13 — Tests funcionais

Crear novos tests en
`packages/core/__tests__/engine/reconciler/Reconciler.test.ts`
(ou ampliar o existente).

**Mínimo 40 tests** distribuídos:

**compareCosts helper (testar indirectamente, ~5 tests):**
1. Custo subido emite cambio con oldAmount, newAmount.
2. Custo baixado emite cambio.
3. Custo igual non emite cambio.
4. Recurso novo (non en old) tráctase como subido desde 0.
5. Recurso eliminado (non en new) tráctase como baixado a 0.

**grandfatherIncreasedCosts (5.4, ~7 tests):**
6. Custo subido + grandfather=true + nodo unlocked → emite
   cost_grandfathered, cero modificación de estado.
7. Custo subido + grandfather=false + nodo unlocked → cero evento,
   cero modificación.
8. Custo subido + nodo locked → cero acción (só procesa unlocked/maxed).
9. Custo igual + grandfather=true → cero evento.
10. Múltiples recursos subidos no mesmo nodo: un evento por recurso.
11. Nodo maxed (non só unlocked) tamén procesado.
12. Cero refund de budget nunca (grandfather é só auditoría).

**refundDecreasedCosts (5.5, ~7 tests):**
13. Custo baixado + refund=true + nodo unlocked → emite
    cost_decreased_refunded + refund aplicado ao budget.
14. Custo baixado + refund=false + nodo unlocked → cero evento, cero
    refund.
15. Custo baixado + nodo locked → cero acción.
16. Custo igual + refund=true → cero evento.
17. Múltiples recursos baixados: un evento e refund por cada.
18. refundAmount calculado correctamente: oldAmount - newAmount.
19. Nodo maxed tamén procesado.

**invalidateOnPrereqFailure (5.6, ~12 tests):**

*disable:*
20. Nodo unlocked, prereq nuevo non cumpre → pasa a locked, emite
    prereq_failure_disabled.
21. Nodo unlocked, prereq cumpre → cero acción.
22. Nodo unlocked sen prereq definido en newTreeDef → cero acción.
23. Nodo locked, prereq non cumpre → cero acción (só procesa
    unlocked/maxed).

*refund:*
24. Nodo unlocked, prereq non cumpre, refund=política → pasa a locked
    + refund de oldNodeDef.cost ao budget.
25. Nodo con oldCost múltiples recursos → refund de todos.
26. Nodo sen oldCost (cost: undefined) → emite evento con refunds: []
    (sen erro).
27. refunds entrega array baleiro se cost era empty.

*preserve:*
28. Nodo unlocked, prereq non cumpre, preserve → mantén unlocked,
    emite prereq_failure_preserved.
29. Cero modificación de budget en preserve.
30. Múltiples nodos en preserve: todos emiten evento.

*Combinación con outras opcións:*
31. Nodo con custo subido E prereq quebrado + grandfather=true +
    disable: emite cost_grandfathered + prereq_failure_disabled.
    Estado final: locked.

**Determinismo + orde (5.7 + 5.8, ~3 tests):**
32. Mesma entrada produce mesma saída entre dúas chamadas (changes
    en mesma orde).
33. Refunds aplican antes de prereqs: nodo con custo baixado E prereq
    quebrado produce ambos eventos en orde correcta.
34. Cero recursividade: invalidar nodo A non re-avalía B aínda que A
    fose prereq de B (5.10).

**Edge cases (~6 tests):**
35. Nodos novos en newTreeDef que non están en oldTreeState: cero
    acción, cero evento.
36. options con 3 opcións pendentes a true + refundRemovedNodes false:
    procesa as 3 e ignora refundRemovedNodes.
37. options con todas a false: cero evento, cero modificación (salvo
    o que xa fixese 3.6.a refundRemovedNodes se aplicable).
38. Locale 'es' propaga ás mensaxes (cero mensaxes nesta sub-fase,
    pero verificar que cero quebra).
39. Cero modificación de oldTreeDef, newTreeDef, oldTreeState tras
    chamada (función pura).
40. Test integración 3.6.a + 3.6.b: nodo eliminado, custo subido,
    custo baixado, prereq quebrado nun mesmo reconcile.

### 5.14 — Cobertura

- `Reconciler.ts`: 100% Stmts/Funcs/Lines, **≥95% Branch salvo
  ramas defensivas documentadas no JSDoc** (lección 3.5 L1).
- Global core: non baixar de baseline (98.19% post-3.6.a).

### 5.15 — Cero modificación de tests existentes da 3.6.a

Os 21 tests existentes de Reconciler (3.6.a) **non se tocan**. Os
tests novos van engadidos.

**Excepción**: os tests 16-18 da 3.6.a (que verificaban que as opcións
non implementadas non afectaban) **agora SI afectan**. **Esos 3 tests
deben actualizarse para reflectir o comportamento real**.

**Importante**: iso é o **patrón do "contrato intermedio fixado por test"**
(lección 2.4.d L2 + 2.6.fix2 L1). Cando un test documenta un bug
coñecido / opción non implementada como **"verifica que non
funciona"**, ao implementala **o test actualízase para verificar que
funciona ben agora**. Iso non é "facer pasar un test ocultando un
problema"; é **completar o patrón de contrato intermedio**.

**§9 desta sub-fase autoriza explicitamente** actualizar eses 3 tests
da 3.6.a.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/reconciler/Reconciler.ts` — MODIFICADO
  (ampliación: +5 tipos a ReconcileChange + helpers privados +
  lóxica nova en reconcile()).

**Tests:**
- `packages/core/__tests__/engine/reconciler/Reconciler.test.ts` —
  MODIFICADO (engadir ~40 tests; **actualizar os 3 tests existentes
  que verificaban opcións non implementadas**).

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install`. Confirma 966 tests core con `--force`.
2. **Verifica** sinatura exacta de `UnlockResolver.evaluate`:
   ```
   grep -B1 -A4 "evaluate(rule" packages/core/src/engine/UnlockResolver.ts
   ```
3. **Verifica** estrutura `UnlockResolverContext`:
   ```
   grep -B1 -A8 "interface UnlockResolverContext" \
     packages/core/src/engine/UnlockResolver.ts
   ```
4. **Verifica** mensaxes locales de RECONCILE_TREE_MISMATCH cubren
   gl/es/en (xa deberían):
   ```
   grep -A3 "RECONCILE_TREE_MISMATCH" \
     packages/common/src/errors/messages.ts
   ```

### T1 — Engadir tipos a ReconcileChange (5.2)

Modificar `Reconciler.ts`: engadir os 5 tipos novos á
discriminated union `ReconcileChange`.

Typecheck 20/20.

### T2 — Helper compareCosts (5.3)

Engadir función privada `compareCosts(...)` a nivel de módulo en
`Reconciler.ts`. Cero exportación.

### T3 — processCostChanges (5.4 + 5.5)

Engadir función privada `processCostChanges(...)` que aplica
grandfatherIncreasedCosts + refundDecreasedCosts.

### T4 — processPrereqFailures (5.6)

Engadir función privada `processPrereqFailures(...)` con switch
sobre `invalidateOnPrereqFailure`.

Importa `UnlockResolver` desde
`../UnlockResolver.js` (verifica path exacto en T0).

### T5 — Integrar nas tarefas de reconcile() (5.7)

Modificar a función `reconcile(...)` para chamar a
`processCostChanges` e `processPrereqFailures` na orde prescrita
(refunds primeiro, prereqs último).

JSDoc da función `reconcile`: actualizar para documentar:
- A orde de aplicación.
- A advertencia sobre `'preserve'` (5.6 documentación obrigatoria).
- A coherencia con `'maxed'` (5.9).
- A non recursividade en prereqs (5.10).

Typecheck 20/20.

### T6 — Actualizar tests existentes (5.15)

Os 3 tests da 3.6.a que verificaban "opcións non implementadas non
afectan" actualizar para reflectir o comportamento real. **Iso é
patrón de contrato intermedio**, autorizado por §9.

### T7 — Tests novos (5.13)

Engadir ~40 tests novos cobrindo as 5 áreas (compareCosts,
grandfather, refundDecreased, invalidateOnPrereqFailure cos 3 valores,
determinismo, edge cases).

### T8 — Verificación post-T7

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- 945 tests previos da core seguen pasando intactos (cero ruptura
  fóra do test de Reconciler).
- 17 tests common previos intactos.
- 171 tests storage previos intactos.

### T9 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- Reconciler.ts 100/≥95%/100/100.
- Global core ≥98%.

### T10 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/reconciler/
pnpm test
```
LITERAL.

- Changeset **minor** para `@yggdrasil-forge/core` (engade
  funcionalidade nova; non breaking porque a interface
  `ReconcileOptions` xa tiña os 4 campos).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - Reconciler completo: tres opcións pendentes da
    `ReconcileOptions` agora implementadas:
    - `grandfatherIncreasedCosts`: emite `cost_grandfathered` cando
      o custo dun nodo unlocked subiu, sen modificar estado.
    - `refundDecreasedCosts`: emite `cost_decreased_refunded` e
      devolve a diferenza ao budget cando o custo baixou.
    - `invalidateOnPrereqFailure: 'disable' | 'refund' | 'preserve'`:
      tres políticas para nodos cuxos prerequisites xa non se cumpren
      co estado actual. ATENCIÓN: 'preserve' rompe invariantes do
      engine; emite `prereq_failure_preserved` para auditoría.
  - 5 tipos novos en `ReconcileChange`: `cost_grandfathered`,
    `cost_decreased_refunded`, `prereq_failure_disabled`,
    `prereq_failure_refunded`, `prereq_failure_preserved`.
  - Reutilización de `UnlockResolver` para a avaliación de prereqs.
  - Orde de aplicación documentada: refunds primeiro, prereqs último.
  ```

### T11 — Commit + push

Commit Conventional:
`feat(core): complete Reconciler with 3 remaining options (sub-phase 3.6.b)`.
Push directo a `origin/main` (base `3005c41`). Reporta hash.

### Ficheiros esperados no diff final:

- `packages/core/src/engine/reconciler/Reconciler.ts` (MODIFICADO)
- `packages/core/__tests__/engine/reconciler/Reconciler.test.ts`
  (MODIFICADO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/common/` (cero edición).
- `packages/storage/` (cero edición).
- `tsconfig.base.json`, `tsup.config.ts`, ou outros ficheiros globais.
- `packages/core/src/engine/index.ts` (xa exporta o necesario desde
  3.6.a).
- `packages/core/src/engine/UnlockResolver.ts` (reutilízase sen
  modificar).
- Tests existentes fóra de Reconciler.test.ts.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown` cero esperado** (traballamos con tipos coñecidos do
dominio).

---

## 9. QUE NON FACER

- ❌ Modificar `ReconcileOptions` interface (5.11: xa ten os 4
  campos).
- ❌ Modificar `ReconcileResult` interface (5.11).
- ❌ Engadir flag `unsafePreservePrereqFailure: true` ou similar a
  `ReconcileOptions` (decisión do director 5.6: cero modificación do
  spec MASTER §23).
- ❌ Re-implementar avaliación de prereqs (5.6: reutilizar
  `UnlockResolver`).
- ❌ Recursividade en invalidateOnPrereqFailure (5.10: unha pasada).
- ❌ Modificar UnlockResolver (5.11).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou outros
  ficheiros globais (lección 3.4 L1).
- ❌ Modificar `packages/common/` (5.12).
- ❌ Modificar `packages/storage/` (5.11).
- ❌ Engadir ErrorCodes (5.12).
- ❌ Modificar tests existentes da 3.6.a **salvo os 3 que
  verificaban "opcións non implementadas"** (5.15).
- ❌ Engadir subdirectorios baixo `reconciler/` (5.1: un só ficheiro).
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.6.b — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 3005c41)
✅ grandfatherIncreasedCosts implementado (5.4)
✅ refundDecreasedCosts implementado (5.5)
✅ invalidateOnPrereqFailure con 3 valores (disable/refund/preserve) (5.6)
✅ 5 tipos novos en ReconcileChange
✅ Reutilización UnlockResolver.evaluate (cero re-implementación)
✅ Orde de aplicación: refunds primeiro, prereqs último (5.7)
✅ 'preserve' documentado: rompe invariante engine, evento
   prereq_failure_preserved para auditoría
✅ 'maxed' consistente con 3.6.a (5.9)
✅ Cero recursividade en prereqs (5.10)
✅ Cero modificación de ReconcileOptions / ReconcileResult
✅ Cero modificación de UnlockResolver ou outras pezas existentes
✅ Cero modificación de common/storage/tsconfig/tsup
✅ T0.2 UnlockResolver.evaluate sinatura: <verificada>
✅ T0.3 UnlockResolverContext: <campos requeridos>
✅ Tests: <N> pasan en core (<delta> novos)
   - 21 previos de 3.6.a [3 actualizados; resto intactos]
   - <X> tests novos en 3.6.b
✅ Cobertura:
   - Reconciler.ts 100/<X%>/100/100 (≥95% branch ou ramas defensivas
     documentadas)
   - Global core: <X%> (baseline 98.19%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - 'preserve' rompe invariante do engine (consumidor responsable).
   - prereqs avalíanse unha vez por nodo (cero recursividade; se
     invalidar A causa que B xa non cumpre, o consumidor aplica outra
     ronda).
   - refunds non comproban máximo do recurso (over-cap = responsabilidade
     consumidor).
✅ Changeset minor (core) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA: peche oficial Fase 3 (hixiene MASTER final + trackeo
briefings + decisión seguinte Fase).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.6.b. Tras esta sub-fase, Fase 3 pode pecharse
oficialmente. Calquera caso non cuberto → ESCALAR.*
