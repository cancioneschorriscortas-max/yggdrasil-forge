# BRIEFING — SUB-FASE 2.2.b de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase pequena e acotada.** Cablear o StatComputer xa construído ao
> TreeEngine, expoñendo `getStat`/`getAllStats`. **`modify_stat` effect
> queda FÓRA de alcance (5.6)** — segue devolvendo `EFFECT_TYPE_UNSUPPORTED`.

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
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`, detén o avance. As decisións
clave desta sub-fase **xa están pre-resoltas** (secs 5 e 6).

**0.7 — ENTREGA.** Integración = `git push` directo a `origin/main`. Se
transporte por parche: aplícase **DENDE A RAÍZ** (NUNCA Downloads —
incidente 1.15) e **con working tree limpo previo** (`git status` ou
`git stash` antes — lección 2.1.b). Push final polo autor.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.2.b** de Yggdrasil Forge.
Tipo: **integración** — cablear `StatComputer` (construído en 2.2) ao
`TreeEngine`, expoñendo `getStat(statId)` e `getAllStats()` na API
pública, **e gestionando a invalidación da cache cando o estado muta**.

---

## 2. CONTEXTO MÍNIMO

`@yggdrasil-forge/core` ten todo o motor da Fase 1 + EffectsRunner
cableado (2.1, 2.1.b) + StatComputer standalone (2.2). Hoxe, ninguén
chama a `StatComputer.computeStat` desde a API pública do `TreeEngine`.
Esta sub-fase cablea ambos compoñentes.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `ace8bcb`.
- 663 tests pasan en core (36 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Grep limpo.
- `StatComputer` con `computeStat` / `computeAllStats` / `explainStat` /
  `invalidate` xa funciona. Cache simple invalidable. NaN para statIds
  descoñecidos. Cobertura 100/98.18/100/100.
- **`TreeEngine` ten as pezas necesarias como `private readonly`**:
  `store: StateStore` (con `getState().nodes` etc.), `resolver:
  UnlockResolver`, `locale: Locale`.
- **`EventMap` xa ten `statChange(statId, oldValue, newValue)`** (liña 36
  de `events.ts`).
- **`modify_stat` effect**: a estrutura é
  `{ type: 'modify_stat', statId, op: '+'|'-'|'*', amount }`.
  **NON inclúe `perTier` nin `conditions`**. É un effect transitorio
  (aplícase unha vez), non unha contribución persistente. **NON
  implementar nesta sub-fase** (sec 5.6).
- DT-11 aberta, non bloqueante; non é deste alcance.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir `getStat(statId): number` e `getAllStats(): Readonly<Record<
string, number>>` á API pública de `TreeEngine` (delegando en
`StatComputer`) **e invalidar a cache do StatComputer cando o estado
muta** (unlock/lock/respec/applyChanges); `modify_stat` segue fóra de
alcance.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Cablear StatComputer como `private` en TreeEngine

`TreeEngine` instancia un `StatComputer` privado no constructor:
```ts
private readonly statComputer: StatComputer
```
Constrúese tras o resto das pezas (probablemente xunto con
`effectsRunner` ou inmediatamente despois). O `StatComputerContext`
construído nese punto usa `this.store.getState()` como `state`, pero
**o StatComputer DEBE ler o estado actual cada vez que computa**, non
unha foto captured no contructor. **Verifica isto** ao implementar:
o context que se pasa ao constructor pode ter referencias estables a
`store`/`resolver`/`treeDef`, pero o `state` debe obterse en cada
chamada vía `store.getState()`.

**Se ao revisar StatComputer ves que captura `state` no constructor en
vez de lelo dinamicamente**: iso é un detalle de implementación que
hai que axustar. Sería un cambio pequeno en `StatComputer.ts`
(reemprazar `this.context.state` por `this.context.store.getState()`
e mover `state` ao `StatComputerContext` como `store` en lugar de
`state` directo). **Verifica primeiro como está implementado**; se
xa lee dinamicamente, perfecto, **non toques nada de StatComputer**.
**Se hai que axustar StatComputer para que lea dinamicamente, faino**
nesta sub-fase como cambio mínimo necesario para a integración —
documenta no reporte que se modificou. **Cero refactor doutras pezas.**

### 5.2 — API pública nova: `getStat` e `getAllStats`

Engade a `TreeEngine.ts`:
```ts
/**
 * Devolve o valor computado dun stat global.
 * NaN se statId non está definido en treeDef.stats.
 */
getStat(statId: string): number {
  return this.statComputer.computeStat(statId)
}

/**
 * Devolve un snapshot de todos os stats computados.
 */
getAllStats(): Readonly<Record<string, number>> {
  return this.statComputer.computeAllStats()
}
```

Inclúe `explainStat` tamén? **NON nesta sub-fase**. Razón: a spec MASTER
§10 só menciona `getStat` e `getAllStats`. `explainStat` é debug e
expoñela en `TreeEngine` é decisión de API que merece consideración
aparte. **Quédase só accesible polo StatComputer interno**; se algún
consumidor a precisa en algún momento, expomola entón. **Acoutar.**

### 5.3 — Invalidación da cache: en eventos do estado

A cache do StatComputer (de `computeStat`) debe invalidarse cando
algo no estado pode cambiar valores de stats. Pontos onde mutar
require invalidate:

- `unlock` exitoso (nodo pasa a 'unlocked' ou 'maxed' → contribucións
  novas activas).
- `lock` exitoso (nodo deixa de contribuír).
- `respec` exitoso (cambios na cesta de unlocked).
- `applyChanges` exitoso (TreeDef pode cambiar contribucións).

**Patrón:** tras a mutación exitosa do estado e antes do `return ok(...)`
en cada un destes métodos, chamar `this.statComputer.invalidate()`.
Específicamente:
- En `unlock`: tras `audit.record('node_unlocked')`, antes do bloque de
  effects (que está xusto antes do `return ok`). **Logo do invalidate,
  o bloque de effects pode usar a cache xa limpa**.
- En `lock`: tras a mutación final, antes do `return ok`.
- En `respec`: tras a mutación final, antes do `return ok`.
- En `applyChanges`: tras a aplicación das changes, antes do `return ok`.

**Cero emisión de `statChange` evento por agora**: a emisión do evento
require comparar valores antes/despois para incluír `oldValue`/`newValue`,
o que require computar **antes** da mutación + de novo despois. Iso é
overhead non trivial. **Decisión:** o evento `statChange` queda
**FÓRA de alcance desta sub-fase**. Os consumidores que necesiten
observar cambios de stats poden usar `subscribeWithSelector` no estado
ou re-consultar `getAllStats()` tras subscriptions a `unlock`/`lock`/
`respec`/`applyChanges`. Documenta esta limitación.

### 5.4 — `EventMap.statChange` non se elimina

Existe en `events.ts` desde a 1.7. **Non se elimina** — pode usarse no
futuro. Simplemente non se emite nesta sub-fase (ver 5.3). Documenta
isto cun comentario en `events.ts:36` se podes facelo sen romper a
exportación (ex: comentario JSDoc indicando "non emitido ata sub-fase
futura").

### 5.5 — Audit de cambios de stats: NON

Cero entradas audit relacionadas con stats nesta sub-fase. Razón: o
audit actual é por mutacións explícitas (unlock, lock, respec, etc.),
e os stats son derivados. Engadir audit de stats sería duplicación.
Os cambios nos stats reflíctense indirectamente nos audit dos nodos
que os causaron.

### 5.6 — `modify_stat` effect: FÓRA DE ALCANCE

Segue devolvendo `EFFECT_TYPE_UNSUPPORTED` como hoxe. Razón
arquitectónica:
- `modify_stat` é un effect **transitorio** (aplícase unha vez), non
  unha `StatContribution` (que se aplica derivadamente cando un nodo
  está unlocked).
- Implementalo require decidir **onde se almacena ese delta persistente**
  (en `TreeState` cun campo novo? como se compón coa derivación de
  StatComputer? como reverter? como serializar?).
- Esas decisións merecen sub-fase propia con deseño dedicado. Mellor
  sub-fase pequena e limpa ca grande e con débeda silenciosa (lección
  A.6 do MASTER).

**Asignado a sub-fase futura** (probablemente 2.2.c ou ao integrar
con TimeManager, porque os "effects con caducidade" son patrón
relacionado). Anotado xa no Anexo A do MASTER tras esta sub-fase.

### 5.7 — Cero cambios en common

Nada novo en common. Cero ErrorCodes. Cero mensaxes.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións todas en `packages/core/src/engine/TreeEngine.ts`:
- Engadir `private readonly statComputer: StatComputer`.
- Instanciar no constructor.
- Engadir métodos públicos `getStat` e `getAllStats`.
- Engadir `this.statComputer.invalidate()` en 4 puntos (unlock, lock,
  respec, applyChanges).

**Posiblemente:** axuste mínimo en `StatComputer.ts` se non le o estado
dinámicamente (sec 5.1). Se hai que cambialo, é un cambio illado nese
ficheiro + en `StatComputerContext` (cambio de `state: TreeState` a
`store: StateStore`, e `this.context.state` → `this.context.store.getState()`).

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificación 5.1
`pnpm install`; confirma 663 tests `--force`. **Verifica como
StatComputer le o estado**: revisa `StatComputerContext` e como se
usa `state` dentro de `computeStat`/`explainStat`. Reporta no chat
**antes de modificar**:
- "StatComputer le state dinamicamente, non hai que tocar" → continúa T1.
- "StatComputer captura state no constructor, hai que axustar" → segue
  T1 facendo o axuste mínimo (cambia o context a `store: StateStore`
  e adapta os accesos a `state`). Cero refactor doutras pezas.

### T1 — Axuste de StatComputer se necesario (5.1)
Se T0 detectou que StatComputer captura state, axusta. Tests novos
non son necesarios (os existentes da 2.2 deben seguir pasando porque
o cambio é interno; **se algún test rompe, é boa sinal** de que
detectaches algo importante — confírmao e adáptao en T4).

### T2 — Cablear StatComputer no constructor de TreeEngine (5.1, 5.2)
- Engade `private readonly statComputer: StatComputer`.
- Instancialo tras `this.audit` (ou xunto con `effectsRunner`, decide
  pola coherencia con orde de construción).
- Engade os métodos públicos `getStat` e `getAllStats` segundo 5.2.
Typecheck 20/20.

### T3 — Invalidación en 4 puntos (5.3)
- `unlock`: tras `audit.record('node_unlocked', ...)`, antes do bloque
  de effects (que está antes do `return ok`).
- `lock`: tras mutación, antes do `return ok`.
- `respec`: tras mutación, antes do `return ok`.
- `applyChanges`: tras aplicación, antes do `return ok`.

Cero refactor da lóxica de cada método; só engadir a chamada
`this.statComputer.invalidate()`.

### T4 — Tests

`packages/core/__tests__/engine/TreeEngine.stats.test.ts` (novo).
Cobre **como mínimo**:

- **`getStat` con stat sen contribucións**: stat definido en
  `treeDef.stats`, ningún nodo desbloqueado contribúe → devolve
  `StatDef.initial ?? 0`.
- **`getStat` con stat tras unlock**: nodo con `statContributions` para
  un stat → tras `unlock` exitoso, `getStat` devolve o valor agregado
  correcto.
- **`getAllStats`**: TreeDef con 3 stats definidos → tras varios unlocks,
  `getAllStats` devolve `Record` con 3 chaves cos valores correctos.
- **`getStat` con statId descoñecido**: `getStat('nope')` → `NaN`.
- **Invalidación tras `lock`**: nodo desbloqueado que contribúe a un
  stat; `getStat` dá valor X; chamar `lock`; `getStat` dá valor sen a
  contribución do nodo. (**Test crítico**: demostra que invalidate
  funciona.)
- **Invalidación tras `respec`**: similar.
- **Invalidación tras `applyChanges`**: aplicar unha change que
  elimine un nodo unlocked → `getStat` reflicte o cambio.
- **Invalidación tras `unlock` (multi-tier)**: nodo con `maxTier: 3`,
  `statContributions` con `perTier: true`. Tras 3 unlocks consecutivos,
  `getStat` debe reflectir o tier alcanzado (non quedar cachee co tier 1).
- **Cobertura indirecta da cache**: chamar `getStat` 100 veces sen
  mutar → resultado idéntico (smoke test de que non se rompe nada).
  Tras `unlock`, segue a dar valor distinto.
- **`modify_stat` segue `EFFECT_TYPE_UNSUPPORTED`** (regresión):
  TreeDef cunha effects=`[modify_stat ...]` ao desbloquear → unlock
  falla con rollback total, como antes.
- `.code` exacto en TODOS os err.

Número total exacto no reporte; cobertura ≥ baseline.

### T5 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. **TreeEngine.ts
non debe baixar de 96.20%**. Global non debe baixar de **98.10%**.

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
  confírmao co `git diff --stat`).
- CHANGELOG `## [Unreleased]`:
  - Added: `TreeEngine.getStat(statId)` e `TreeEngine.getAllStats()`.
  - Added: invalidación automática da cache do StatComputer tras
    `unlock`/`lock`/`respec`/`applyChanges`.
  - Note: `modify_stat` effect segue como `EFFECT_TYPE_UNSUPPORTED`
    (sub-fase futura); `EventMap.statChange` non se emite ata sub-fase
    futura.

### T7 — Commit + push
Commit Conventional: `feat(core): expose getStat/getAllStats and wire
StatComputer to TreeEngine (sub-phase 2.2.b)`. Push directo a
`origin/main` (base `ace8bcb`). Reporta hash.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar `modify_stat` effect (5.6: fóra de alcance; segue
  `EFFECT_TYPE_UNSUPPORTED`).
- ❌ Emitir `statChange` event (5.3, 5.4: fóra de alcance).
- ❌ Engadir entradas audit por cambios de stats (5.5).
- ❌ Engadir `explainStat` á API pública de TreeEngine (5.2).
- ❌ Refactorizar StatComputer máis aló do axuste mínimo de 5.1.
- ❌ Refactorizar TreeEngine ("xa que toco..."). SÓ engadir.
- ❌ Engadir ErrorCodes ou tocar common (5.7).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear PR de release (#1) ou changeset-release.

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 2.2.b — COMPLETADA E EN origin/main
═══════════════════════════════════════
✅ Commit <hash> en origin/main (base ace8bcb)
✅ StatComputer cableado en TreeEngine como private readonly
✅ API pública: getStat(statId), getAllStats()
✅ Invalidación automática en unlock/lock/respec/applyChanges
✅ T0 verificación 5.1: <"StatComputer xa le dinamicamente" |
   "axustado: context cambiou de state a store">
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / TreeEngine.ts <Y%>
   (baselines 2.2: 98.10% / 96.20%; non deben baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: modify_stat segue EFFECT_TYPE_UNSUPPORTED
   (5.6); statChange event non se emite (5.3); explainStat non na API
   pública (5.2).
✅ Changeset minor (core; common NON tocado) + CHANGELOG
📋 Confirmado: /tmp/ygg-exec rutas C:/, sen heredoc, --force,
   working tree limpo antes de aplicar parche (lección 2.1.b),
   integración push directo, transporte <directo|parche dende raíz>
LISTO PARA SEGUINTE SUB-FASE (decisión do director).
═══════════════════════════════════════
```

---

*Fin do briefing 2.2.b. modify_stat fóra de alcance acotado; statChange
event diferido; integración limpa. Calquera caso non cuberto →
ESCALAR (0.6).*
