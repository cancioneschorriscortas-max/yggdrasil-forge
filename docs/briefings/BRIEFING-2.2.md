# BRIEFING — SUB-FASE 2.2 de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase media de Fase 2.** StatComputer standalone, NON integrado a
> TreeEngine (integración en 2.2.b, mesmo patrón ca 2.1/2.1.b).

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
Resultado LITERAL no reporte. Distingue débeda pre-existente das NOVAS.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. As decisións típicas desta
sub-fase **xa están pre-resoltas** (secs 5 e 6); aínda así, **se atopas
algo non cuberto**, escala.

**0.7 — ENTREGA.** Integración = `git push` directo a `origin/main`. Se
transporte por parche: aplícase **DENDE A RAÍZ** (NUNCA Downloads —
incidente 1.15) **e con working tree limpo previo** (`git status` ou
`git stash` antes — lección 2.1.b). Push final polo autor.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.2** de Yggdrasil Forge. **Terceira sub-fase da Fase 2.**
Tipo: **feature nova media** — `StatComputer` standalone (peza illada,
non cableada a TreeEngine).

---

## 2. CONTEXTO MÍNIMO

`@yggdrasil-forge/core` ten todo o motor da Fase 1 + EffectsRunner
cableado (2.1, 2.1.b). Esta sub-fase implementa o **StatComputer**, que
calcula valores agregados de "stats globais" da árbore a partir das
`statContributions` dos nodos desbloqueados.

**Concepto:** un nodo pode declarar contribucións a stats globais
(ex: `damage: +5`, `speed: ×1.1`). Cando o nodo está desbloqueado, esas
contribucións aplícanse ao stat correspondente. StatComputer agrega
todas as contribucións de todos os nodos desbloqueados e devolve o
valor final por stat.

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `d87b494`.
- 623 tests pasan en core (35 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Grep limpo. Working tree limpo.
- DT-11 aberta (non bloqueante; non é deste alcance).
- **`types/stats.ts` xa existe** (creado en 1.4). Define:
  - `StatContributionOp = '+' | '-' | '*' | '/' | 'min' | 'max' | 'set'`
  - `StatContribution { statId, op, value, perTier?, conditions? }`
  - `StatExplanation { statId, finalValue, contributions[...] }`
- **`NodeDef.statContributions?: readonly StatContribution[]`** xa
  existe (`types/node.ts:182`). NON modificar.
- **`StatDef`** en `types/tree.ts:30`: `{ id, label, initial?, min?,
  max?, format? }`. NON modificar.
- **`TreeState.computedStats?: Record<string, number>`** existe en
  `tree.ts:113`; `StateStore.ts:131` inicialízao a `{}`. **NON usar
  nesta sub-fase** (a integración co StateStore é 2.2.b).
- `UnlockResolver.evaluate(rule, ctx)` xa existe e avalía
  `UnlockCondition`. **Reutilízase** para `conditions?` das
  contribucións.
- **NON existe `StatComputer.ts` no engine.** Hai que crealo.
- Spec MASTER §12 (liñas 1445-1465): API canónica de StatComputer.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `StatComputer` como peza illada do engine, que calcula valores
agregados de stats globais a partir das `statContributions` dos nodos
desbloqueados, con cache invalidable e `StatExplanation` para
debugging, **sen** integrar a `TreeEngine` (iso é 2.2.b).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Standalone, NON integrado a TreeEngine

`StatComputer` constrúese como peza illada. `TreeEngine` NON o
instancia nin chama `getStat`/`getAllStats` nesta sub-fase. **Estes
métodos da API canónica do MASTER (§10) implementaranse na sub-fase
2.2.b**, xunto co cableado de `modify_stat` effect (que hoxe devolve
`EFFECT_TYPE_UNSUPPORTED`).

Razón: mesmo patrón ca 2.1/2.1.b (peza illada → integración aparte).
Reduce decisións simultáneas.

### 5.2 — API exacta do StatComputer

```ts
class StatComputer {
  constructor(context: StatComputerContext)

  computeStat(statId: string): number
  computeAllStats(): Readonly<Record<string, number>>
  explainStat(statId: string): StatExplanation
  invalidate(): void  // borra cache (chámase desde fora ao mutar)
}

export interface StatComputerContext {
  readonly treeDef: TreeDef       // para StatDef + NodeDef
  readonly state: TreeState       // para nodos desbloqueados (state + currentTier)
  readonly resolver: UnlockResolver  // para conditions?
  readonly locale: Locale         // para mensaxes de erro
}
```

**`computeStat` (statId): devolve o número final do stat.**
- Se `statId` non existe na `treeDef.stats` → devolve **NaN** e marca
  internamente, **NON** lanza. (Razón: a API canónica devolve `number`,
  non `Result<number>`; e os consumidores adoitan chamala en cadea con
  outras stats; lanzar sería disruptivo. NaN é un sinal claro e é
  detectable con `Number.isNaN()`.)
- Se `statId` existe pero ningún nodo desbloqueado contribúe → devolve
  `StatDef.initial ?? 0`.
- Aplica clamp con `min`/`max` ao final. Aplicar tras todas as
  contribucións, NON entre operacións.

**`computeAllStats`**: devolve `Record<string, number>` con un valor
por cada `statId` definido en `treeDef.stats`. Reutiliza `computeStat`.

**`explainStat`**: devolve `StatExplanation` (xa tipado en
`types/stats.ts`) co valor final + lista detallada de contribucións
aplicadas (nodeId, op, value, appliedTier, conditional).

**`invalidate`**: limpa a cache completa. Chámase desde fora cando o
estado muta (en 2.2.b conectarase aos eventos relevantes; nesta
sub-fase só existe o método, os tests chámano explicitamente).

NON inclúe `subscribe(statId, callback)` da spec MASTER §12: o sistema
xeral de eventos (`statsChange`) será o mecanismo en 2.2.b. Cero
subscripción específica de stats nesta sub-fase.

### 5.3 — Algoritmo de cálculo (orde semántica)

Para cada `statId`:

1. Empezar co valor `StatDef.initial ?? 0`.
2. Iterar sobre `Object.values(state.nodes)` (NodeInstance) na orde
   natural (declaración en `treeDef.nodes`, NON ordenadas por nada).
3. Para cada nodo con `state === 'unlocked' || state === 'maxed'`:
   - Buscar `NodeDef` en `treeDef.nodes` (por id). Se non existe
     (caso patolóxico), saltar.
   - Para cada `StatContribution` en `nodeDef.statContributions`
     onde `contribution.statId === statId`:
     - **Avaliar `conditions?` se está**: usando `UnlockResolver.evaluate`
       cun pseudo-`UnlockRule` que envolva o array. Se falsa, **saltar**
       a contribución (e marcar `conditional: true` cando se exclúe pola
       condición; `appliedTier: 0`).
     - Calcular `appliedTier`:
       - Se `perTier === true`: `appliedTier = nodeInstance.currentTier`
         (que é >=1 se está unlocked/maxed).
       - Se non: `appliedTier = 1`.
     - Calcular o valor efectivo: `effectiveValue = contribution.value
       * appliedTier`.
     - Aplicar a operación ao acumulador segundo `contribution.op`:
       - `'+' / '-' / '*' / '/'`: aritméticas estándar.
       - `'min'`: `Math.min(acc, effectiveValue)`.
       - `'max'`: `Math.max(acc, effectiveValue)`.
       - `'set'`: o valor substitúe ao acumulador (`acc = effectiveValue`).
4. Tras todas as contribucións, aplicar clamp:
   - Se `StatDef.min !== undefined`: `acc = Math.max(acc, StatDef.min)`.
   - Se `StatDef.max !== undefined`: `acc = Math.min(acc, StatDef.max)`.
5. Devolver `acc`.

**Cero validación semántica de operacións** (ex: division por 0). Se
`'/'` con `effectiveValue === 0` produce `Infinity` ou `NaN`, déixase
pasar; é responsabilidade do deseñador da árbore non producilo. (Documenta
no comentario do método.)

### 5.4 — Cache: simple, completa

`StatComputer` mantén un `Map<string, number>` privado. `computeStat`
consulta antes de calcular; se hai hit, devólveo. `invalidate()` baleira
o Map. **Cero invalidación granular por nodo** — invalidación completa
é máis simple, robusta, e a recomputación é O(N×M) (N=nodos, M=stats)
que para árbores típicas (<1000 nodos, <50 stats) é despreciable.

`explainStat` **NUNCA usa cache** (computa sempre); a explicación é
para debug e necesita ser exacta no momento.

### 5.5 — Que pasa con `conditions?` na `StatContribution`

Cada `StatContribution` ten `conditions?: readonly UnlockCondition[]`
opcional. **Semántica:** as conditions trátanse como **AND lóxico** (todas
deben cumprirse para que a contribución aplique).

Para avaliar: para cada `UnlockCondition`, chamar
`UnlockResolver.evaluate(condition, ctx)` (a firma actual é
`evaluate(rule, ctx)` onde `rule` pode ser unha `UnlockCondition` pura;
**verifica esta firma** — se non encaixa directamente, envólvea como
`{ type: 'all', conditions: [...] }` UnlockRule). Se algunha devolve
`false`, a contribución salta.

Na `StatExplanation`, as contribucións saltadas por condición aparecen
con `conditional: true` e `appliedTier: 0`. As contribucións aplicadas
**sen** `conditions?` aparecen con `conditional: undefined`. As
contribucións aplicadas **con** `conditions?` (que pasaron a comprobación)
aparecen con `conditional: true` e `appliedTier` real.

### 5.6 — Erros: cero ErrorCodes novos

Esta sub-fase **NON engade ErrorCodes**. As únicas situacións anómalas
son:
- `statId` non existe → `computeStat` devolve `NaN`, `explainStat`
  devolve un `StatExplanation` con `finalValue: NaN` e `contributions: []`.
- Estado inconsistente (NodeInstance referencia NodeDef que xa non
  existe na TreeDef) → saltar silenciosamente (defensivo; non debería
  pasar con TreeDef validada por Zod).

NON lanzar excepcións. NON `Result<>`. A API canónica é `: number` e
`: StatExplanation` directamente.

---

## 6. UBICACIÓN E ESTRUTURA

`packages/core/src/engine/StatComputer.ts` (un só ficheiro, ~250-350
liñas estimadas). Helpers internos no mesmo ficheiro (non exportados).
`StatComputerContext` exportada desde `StatComputer.ts`.

Export desde `engine/index.ts`:
```ts
export { StatComputer, type StatComputerContext } from './StatComputer.js'
```

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity
`pnpm install`; confirma 623 tests `--force`. Setup 0.1–0.5 ok.

### T1 — StatComputer: esqueleto + computeStat + invalidate (5.2, 5.3, 5.4)
- Crea `StatComputer.ts` con constructor recibindo `StatComputerContext`.
- Implementa `computeStat(statId): number` con o algoritmo de 5.3.
- Implementa `invalidate(): void` que baleira a cache.
- Cero `any`. Imports `type-only` onde proceda.

Typecheck 20/20.

### T2 — computeAllStats + explainStat (5.2)
- `computeAllStats`: itera `treeDef.stats ?? []` chamando `computeStat`.
- `explainStat`: similar a `computeStat` pero acumulando o array de
  `contributions` co detalle (nodeId, op, value, appliedTier,
  conditional?). NON usa cache (5.4).

### T3 — Avaliación de `conditions?` (5.5)
Verifica primeiro a firma real de `UnlockResolver.evaluate` no código
(`UnlockResolver.ts`). Se acepta `UnlockCondition` directamente,
utilízaa. Se require `UnlockRule`, envolve as conditions como
`{ type: 'all', conditions: [...] }`. **Se a firma non encaixa con
ningunha das dúas opcións → ESCALA (0.6)**, non improvises.

Documenta no comentario do método como se está envolvendo (se procede).

### T4 — Tests
`packages/core/__tests__/engine/StatComputer.test.ts`. Cobre **como
mínimo**:

- **Valor inicial sen contribucións**: stat con `initial: 10`, ningún
  nodo desbloqueado → `computeStat` devolve `10`.
- **Suma simple**: nodo desbloqueado contribúe `+5` a `damage` con
  `initial: 0` → `computeStat('damage')` devolve `5`.
- **Todas as ops**: testar `'+'`, `'-'`, `'*'`, `'/'`, `'min'`, `'max'`,
  `'set'` cada unha cun caso.
- **perTier**: nodo con `maxTier: 3` desbloqueado a tier 2,
  `perTier: true`, `value: 4` → contribución efectiva `8`.
- **maxed**: nodo desbloqueado a `'maxed'` con tier=maxTier conta igual
  ca `'unlocked'`.
- **locked NON contribúe**: nodo bloqueado con `statContributions` →
  ignórase.
- **conditions cumprida**: contribución con `conditions: [...]` que
  pasa → aplícase, `conditional: true` na explicación.
- **conditions non cumprida**: contribución cuxas conditions fallan →
  saltase, na explicación aparece con `conditional: true` e
  `appliedTier: 0`.
- **Múltiples nodos**: 3 nodos contribuíndo `+1, +2, +3` → total `6`.
- **clamp min/max**: stat con `max: 10`, contribucións sumando 25 →
  resultado `10`.
- **statId inexistente**: `computeStat('nope')` → `NaN`;
  `explainStat('nope')` → `{ statId: 'nope', finalValue: NaN,
  contributions: [] }`.
- **Cache funciona**: chamar `computeStat` dúas veces sen mutar →
  segunda chamada devolve o mesmo. Tras `invalidate()`, recalcula.
  (Spy/contador na lóxica interna se podes; se non, comproba indirectamente
  mutando `state` e verificando que sen `invalidate` segue devolvendo
  o vello, e con `invalidate` o novo.)
- **computeAllStats**: 3 stats definidos → 3 claves no Record.
- **explainStat detalle**: stat con 2 contribucións → array de 2 con
  campos correctos.
- **División por 0** (caso patolóxico): contribución `/0` produce
  `Infinity`; non lanza. Documenta como esperado.
- **NodeInstance que referencia NodeDef inexistente**: saltase
  silenciosamente; non lanza. (Caso defensivo, difícil de reproducir
  realmente; se non é trivial montalo, NON o forces — coméntao no test
  e ségue.)

Número total exacto no reporte; cobertura ≥90% en StatComputer.ts.

### T5 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. **StatComputer.ts
debe estar a ≥90% nas catro métricas.** Global non debe baixar do
baseline **98.02%**.

### T6 — Verificación + grep
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Resultado grep LITERAL no reporte. Cobertura LITERAL.

### T7 — Changeset + CHANGELOG
- Changeset **minor** — só `@yggdrasil-forge/core` (common NON se toca;
  confírmao co `git diff --stat`).
- CHANGELOG `## [Unreleased]`:
  - Added: `StatComputer` (peza standalone) con `computeStat`,
    `computeAllStats`, `explainStat`, `invalidate`. Soporta operacións
    `+`, `-`, `*`, `/`, `min`, `max`, `set`, `perTier` e
    `conditions?`. Cache simple invalidable. Devolve `NaN` para statIds
    descoñecidos.
  - Note: a integración con `TreeEngine` (`getStat`, `getAllStats`) e
    co effect `modify_stat` é sub-fase aparte (2.2.b).

### T8 — Commit + push
Commit Conventional: `feat(core): add standalone StatComputer with
explanations (sub-phase 2.2)`. Inclúe tamén o changeset/CHANGELOG no
mesmo commit ou nun segundo `chore` se prefires (decide).

**Push directo a `origin/main`** (base `d87b494`), tras avisar ao
autor. Confirma hash no reporte.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Integrar StatComputer en TreeEngine (`getStat`, `getAllStats` non
  se engaden hoxe; 2.2.b).
- ❌ Implementar o effect `modify_stat` (segue devolvendo
  `EFFECT_TYPE_UNSUPPORTED` ata 2.2.b).
- ❌ Engadir `subscribe(statId, callback)` (5.2: queda fóra).
- ❌ Modificar `types/stats.ts`, `types/node.ts`, `types/tree.ts` (xa
  están; se algo non encaixa → ESCALAR).
- ❌ Engadir ErrorCodes novos (5.6).
- ❌ Tocar `StateStore.computedStats` (esa integración é 2.2.b).
- ❌ Tocar `TreeEngine` (cero refactor; cero getters novos).
- ❌ Validar semánticamente division por 0 ou outras matemáticas
  patolóxicas (5.3 ad fin: responsabilidade do deseñador da árbore).
- ❌ Invalidación granular por nodo (5.4: invalidación completa).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1) nin changeset-release.

---

## 10. COMO REPORTAR

```
═══════════════════════════════════════
SUB-FASE 2.2 — COMPLETADA E EN origin/main
═══════════════════════════════════════
✅ Commit <hash> en origin/main (base d87b494)
✅ StatComputer.ts: computeStat / computeAllStats / explainStat / invalidate
✅ Algoritmo: orde declaración, perTier, conditions AND, clamp final
✅ Cache simple invalidable (computeStat sí, explainStat non)
✅ NaN para statIds descoñecidos; cero excepcións
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / StatComputer.ts <Y%>
   (baseline 2.1.b: 98.02% global; obxectivo ≥90% en StatComputer)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída; pre-existente vs nova>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: <ex. integración con TreeEngine diferida a
   2.2.b; modify_stat segue como EFFECT_TYPE_UNSUPPORTED; ou "ningunha">
✅ Changeset minor (core; common NON tocado) + CHANGELOG
📋 Confirmado: /tmp/ygg-exec rutas C:/, sen heredoc, --force,
   working tree limpo antes de aplicar parche (lección 2.1.b),
   integración push directo, transporte <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.2.b (integración StatComputer ↔ TreeEngine
+ modify_stat effect) ou outra que decida o director.
═══════════════════════════════════════
```

---

*Fin do briefing 2.2. Decisións principais pre-resoltas para minimizar
escalados. Calquera caso non cuberto → ESCALAR (0.6).*
