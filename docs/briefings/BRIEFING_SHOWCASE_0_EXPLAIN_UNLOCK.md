# BRIEFING — Showcase · Capa 0 (CORE): `explainUnlock`

> **4º Arquitecto (Director) → Executor.**
> **Enabler do showcase «O Paladín».** O motor xa SABE por que un nodo está
> bloqueado (`UnlockResolver.explain` produce `UnlockExplanation` por-condición),
> pero **non o expón**: `TreeEngine` só ten `canUnlock` (un `{allowed, reason}`
> único). Engádese **`TreeEngine.explainUnlock(nodeId): Result<UnlockExplanation>`**
> que conecta a regra do nodo co `resolver.explain`. Iso é o que alimenta o panel
> «Inspector de Condicións» / «Explicación de Bloqueo» do mockup (o ✓/✗ por
> condición). Enxeñaría **pura** (sen UI, sen creatividade). «S». Publicable →
> `@core` **minor**. **Sen visual check** (verifícase por tests + gate).

---

## 1. Estado á entrada (verificado polo Director, HEAD `d4ab8fe`)

- `TreeEngine.canUnlock(nodeId): Result<UnlockCheck>` (línea ~666): busca
  `nodeDef`, `err(NODE_NOT_FOUND)` se non existe; trata estados
  maxed/unlocked/expired/disabled; constrúe un `UnlockResolverContext` (ctx) e
  chama `this.resolver.evaluate(nodeDef.prerequisites, ctx)` (~línea 758-768).
- `UnlockResolver.explain(rule, ctx): UnlockExplanation` (~línea 233) **existe**
  e devolve `{satisfied, conditions: UnlockConditionEvaluation[]}`.
- `UnlockExplanation` e `UnlockConditionEvaluation` están en
  `types/unlock.ts` e re-exportados en `types/index.ts` (confírmao en T0).
- **`Resource` NON ten regate temporal** (só initial/max/refundable). O
  «recupera 1 cada 30s» do mockup é *flavour* → NON se modela.

## 2. Modelo (NON discutible)

`explainUnlock` é o **xemelgo de `canUnlock`** pero devolvendo a explicación
**por-condición** en vez do veredicto único:

```typescript
/**
 * Explica, condición a condición, por que os PREREQUISITOS dun nodo se
 * cumpren ou non. Para UI pedagóxica ("que falta"), tooltips e devtools.
 *
 * Cobre só `nodeDef.prerequisites` (a regra de desbloqueo). Exclusións e
 * custos de recursos son comprobacións á parte (compoñese na capa de UI a
 * partir de `node.exclusions` e `node.cost` + estado actual).
 *
 * - Nodo inexistente → `err(NODE_NOT_FOUND)`.
 * - Sen prerequisites (raíz / nodo libre) → `ok({ satisfied: true, conditions: [] })`.
 * - Con prerequisites → `ok(resolver.explain(prerequisites, ctx))`.
 */
explainUnlock(nodeId: string): Result<UnlockExplanation>
```

Regras:
1. **Mesma construción de `ctx`** que `canUnlock` (mesma fonte de verdade; NON
   dupliques lóxica de contexto: extrae a un helper privado se procede, ou
   reproduce idéntico). O ctx debe ser **idéntico** ao que usa `canUnlock` para
   que `explain` e `evaluate` coincidan sempre.
2. **NON** filtra por estado actual (maxed/unlocked): `explainUnlock` informa
   dos **prerequisitos** sempre (o panel mostra «✓ Cumplida» mesmo en nodos xa
   abertos). *(canUnlock si corta por estado; explainUnlock NON.)*
3. `err` **só** para nodo inexistente (igual ca `canUnlock`).
4. **Cero** cambios en `canUnlock`, `resolver`, ou tipos (só lectura).

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional,
> noUncheckedIndexedAccess, sen `any`, sen `!`.

### T0 — Preflight + GREP (empírico, A.6.15)
HEAD = `origin/main` (`d4ab8fe`). Identidade git. GREP e **reporta literal**:
- Corpo de `canUnlock`: a **construción exacta do `ctx`** (`UnlockResolverContext`)
  — que campos leva e de onde saen (store/state/resolvers). Cópiao tal cal para
  reproducilo en `explainUnlock`.
- Firma de `UnlockResolverContext` (a interface).
- Firma de `resolver.explain` e que `this.resolver` é accesible no método.
- Confirmar export público de `UnlockExplanation`/`UnlockConditionEvaluation`
  desde o index do paquete (`packages/core/src/index.ts` ou via `types/index`).

### T1 — `TreeEngine.explainUnlock`
- Engadir o método público (§2) **xunto a `canUnlock`** (mesma rexión).
- Busca `nodeDef`; `err(NODE_NOT_FOUND)` (mesma mensaxe/locale ca `canUnlock`).
- `nodeDef.prerequisites === undefined` → `ok({ satisfied: true, conditions: [] })`.
- Senón: construír `ctx` **idéntico** a `canUnlock` e
  `return ok(this.resolver.explain(nodeDef.prerequisites, ctx))`.
- Doc TSDoc en galego (§2).

### T2 — Exports
- Garantir que `UnlockExplanation` e `UnlockConditionEvaluation` se exportan no
  index público de `@core` (se non o estaban, engadir; se xa, confirmar).

### T3 — Tests (`packages/core/__tests__/`)
- Nodo inexistente → `err` con `NODE_NOT_FOUND`.
- Nodo raíz / sen prerequisites → `ok({satisfied:true, conditions:[]})`.
- `all` con 2 condicións, unha falla → `satisfied:false`, a condición que falla
  ten `satisfied:false` e a outra `true` (verifica o mapeo por-condición).
- `any` (unha cumprida) → `satisfied:true`.
- `none` (unha presente) → `satisfied:false`.
- Coherencia: para o mesmo nodo/estado, `explainUnlock().satisfied` ==
  resultado de prerequisites de `canUnlock` (mesmo ctx → mesmo veredicto na
  parte de prerequisitos).
- Gate verde: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test` (conta tests).

### T4 — Docs + changeset
- **`docs/GUIDE.md`** (regra do doc vivo): na sección de interacción/engine,
  engadir `explainUnlock(nodeId)` ao lado de `canUnlock`, cun exemplo curto de
  como recorrer `explanation.conditions` para pintar ✓/✗.
- `docs/architecture/MASTER.md`: nova lección curta (A.6.26?) — «`canUnlock` =
  veredicto único; `explainUnlock` = explicación por-condición (mesmo ctx).
  Exclusións/custos compóñense na UI, non están na regra de prerequisitos».
- Changeset `.changeset/showcase-0-explain-unlock.md` → `@yggdrasil-forge/core`
  minor: `feat(core): TreeEngine.explainUnlock(nodeId) exposing per-condition UnlockExplanation (showcase enabler)`
- Copia este briefing a `docs/briefings/BRIEFING_SHOWCASE_0_EXPLAIN_UNLOCK.md`.

### T5 — Commit + patch
- Commit único + `git format-patch -1 HEAD -o /tmp` → entregar vía
  `present_files`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/core/src/engine/TreeEngine.ts                   (M)
packages/core/src/index.ts                               (M, se faltaban exports)
packages/core/__tests__/TreeEngine.explainUnlock.test.ts (A)
docs/GUIDE.md                                            (M)
docs/architecture/MASTER.md                              (M)
.changeset/showcase-0-explain-unlock.md                  (A)
docs/briefings/BRIEFING_SHOWCASE_0_EXPLAIN_UNLOCK.md     (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON tocar `canUnlock`/`resolver`/tipos (só engadir + ler).
- ❌ NON cortar por estado actual en `explainUnlock` (informa prereqs sempre).
- ❌ NON meter exclusións/custos aquí (compóñense na UI; build narrow).
- ❌ NON modelar regate temporal de recursos (non existe; flavour do mockup).
- ❌ NON duplicar a lóxica de `ctx` diverxente: debe ser idéntica á de `canUnlock`.
- ❌ NON inventar API (GREP T0).

## 6. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` (ctx + firmas literais) · `🟢 GATE` (conta tests) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing Showcase · Capa 0. 4º Arquitecto. O motor que xa sabe, agora tamén o conta. 🌳*
