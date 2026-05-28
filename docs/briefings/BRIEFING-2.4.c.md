# BRIEFING — SUB-FASE 2.4.c de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase media de Fase 2.** Implementación de `computed` progress
> source: deriva o progress dun nodo dunha fórmula (sum/avg/min/max)
> sobre os progress doutros nodos. Sen cache, validación de ciclos lazy.

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

**0.5 — ANTI-PLACEHOLDER (grep verificable):**
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
Resultado LITERAL no reporte.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. **Esta sub-fase ten varias
decisións críticas pre-resoltas** (sec 5). Calquera caso non cuberto →
ESCALAR.

**0.7 — ENTREGA E TÍTULO DE REPORTE.**
- Pushed: `═══ SUB-FASE 2.4.c — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.4.c — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am` (lección 2.4 L1).** Antes de aplicar parches, **primeiro
`git status` + `git log -1`** para verificar se xa foi aplicado.

**0.9 — CHANGELOG (DT-12, A.6 L4).** Engade **unha nova cabeceira
`## [Unreleased]` ao principio**. NON reagrupes nin consolides.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.4.c** de Yggdrasil Forge. **Novena sub-fase de Fase 2.**
Tipo: **feature nova media** — implementar `computed` progress source
en `ProgressManager` (sub-fase 2.4 implementou só `manual`).

---

## 2. CONTEXTO MÍNIMO

Tras 2.4.b, `ProgressManager` está cableado a `TreeEngine` e expón
`setProgress`/`getProgress`/`getReachedMilestones` con soporte só
para fonte `manual`. **Esta sub-fase engade soporte para `computed`**,
onde o progress dun nodo deriva dinámicamente dunha fórmula sobre o
progress doutros nodos:

```ts
nodeDef.progressSource = {
  type: 'computed',
  dependsOn: ['node-a', 'node-b', 'node-c'],
  formula: 'sum' | 'avg' | 'min' | 'max',
}
```

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `79abf8b` (docs MASTER).
- 807 tests pasan en core (41 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **Toda a infraestrutura de tipos xa existe:**
  - `ProgressSourceConfig` variante `computed` en `types/progress.ts`
    con `dependsOn: readonly string[]` e `formula: 'sum'|'avg'|'min'|'max'`.
  - `ProgressManager` con `setProgress`/`getProgress`/`getReachedMilestones`.
- **Ferramentas reutilizables**:
  - `engine/CycleDetector.ts` (clase `CycleDetector`) — usado xa por
    `UnlockResolver` para detectar ciclos en prereqs.
  - `engine/DependencyGraph.ts` (clase `DependencyGraph`) — usado polo
    motor para outras dependencies. **Verifica en T0 a súa API exacta**
    e se podes reutilizalo para `dependsOn` de progress.
- ErrorCodes engadidos en 2.4: E019/E020/E021. Esta sub-fase engade
  E022 (ver 5.6).
- DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Implementar `computed` progress source en `ProgressManager` que
**deriva dinámicamente** o progress dun nodo dunha fórmula sobre
`dependsOn`, **sen cache**, con **validación de ciclos lazy** ao
calcular, e rexeitando `setProgress` sobre nodos computed con erro
específico.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — Derivación dinámica, NON garda en `NodeInstance.progress`

Para un nodo con `progressSource: { type: 'computed', ... }`,
`getProgress(nodeId)` **calcula no momento** baseándose nos `dependsOn`
actuais. **NON** escribe nada en `NodeInstance.progress` para nodos
computed (esa propiedade segue sendo escrita só por `setProgress`
manual).

Razóns:
- Sempre actualizado, sen problemas de invalidación.
- O `NodeInstance.progress` mantén a semántica clara: "valor establecido
  manualmente"; nodos computed non teñen valor establecido.
- Coherente coa filosofía StatComputer (deriva en demanda).

**Consecuencia importante**: `JsonSerializer` non precisa serializar
nada novo (o progress dun nodo computed non se persiste; recalcúlase
ao deserializar). Documenta isto.

### 5.2 — Sen cache inicial

`ProgressManager.getProgress` para nodos computed **recalcula cada
vez**. Sen cache. Razóns:
- Os cálculos son triviais (sum/avg/min/max sobre `dependsOn` cuxa
  lonxitude é tipicamente <10).
- Cache require invalidación coherente (cando cambia o progress dun
  dependsOn, todos os nodos computed que dependan del). Fonte de
  bugs.
- Optimización futura se aparecera evidencia de problema (DT
  documentada se procede; non antecipemos).

Documenta esta decisión cun comentario explícito en `getProgress`.

### 5.3 — Algoritmo de cálculo para `computed`

Para un nodo `N` con `progressSource: { type: 'computed', dependsOn,
formula }`:

1. **Detección de ciclos lazy** (ver 5.4): se o cálculo desencadea
   ciclo, devolve 0 e marca o caso (cero excepcións).
2. **Resolución de dependencias**: para cada `depId` en `dependsOn`:
   a. Se `treeDef.nodes[depId]` non existe → **omitir** (defensivo;
      tampouco lanza).
   b. Senón: chamar **recursivamente** `getProgress(depId)`. Iso
      manexa que un dependsOn poda ser tamén un computed (composición).
3. **Aplicar fórmula** sobre a lista de valores resoltos:
   - Lista baleira (ningún dep válido) → devolve **0** (5.7).
   - `sum`: suma todos. **Clamp a 100** (se `sum(progress) > 100`,
     devolve 100). Razón: progress agregado non pode pasar do 100%.
   - `avg`: media aritmética. Lista baleira → 0.
   - `min`: mínimo.
   - `max`: máximo.
4. **Devolve o número final, clampado a [0, 100]** sempre (defensa
   adicional).

**Cero `Result<>`** para `getProgress`: a API segue sendo `number`
directo. Casos anómalos devolven 0; nunca lanza.

### 5.4 — Detección de ciclos: lazy con `Set` local

Necesitamos detectar e parar bucles como: A depende de B, B depende
de A.

**Implementación recomendada**: durante `getProgress(nodeId)`, manter
un `Set<string>` interno de "nodos en proceso" pasado por parámetro
nas chamadas recursivas. Antes de descender a un `depId`, comprobar
se xa está no `Set`. Se está → **ciclo detectado, devolve 0 para esa
rama** (NON `throw`).

Estrutura sugerida:
```ts
private computeProgressFor(
  nodeId: string,
  inProgress: Set<string> = new Set(),
): number {
  if (inProgress.has(nodeId)) return 0  // ciclo
  inProgress.add(nodeId)
  try {
    // ... lóxica de cálculo (5.3), pasando inProgress recursivamente
  } finally {
    inProgress.delete(nodeId)
  }
}
```

**Reutiliza `CycleDetector` se podes** (T0 verifica a API exacta).
Se non encaixa naturalmente, implementa con `Set` propio coma arriba.
**Se a integración de `CycleDetector` resulta non trivial → escala
(0.6)**; non improvises.

### 5.5 — `setProgress` sobre nodo computed: rexeitar

Cando `progressSource.type === 'computed'`, `setProgress` **devolve
`err`** co código novo `INVALID_PROGRESS_OPERATION` (E022).

Razón: un computed non se establece manualmente; só se deriva.
Permitirlo crearía drift entre o valor establecido e o derivado.

Engade `INVALID_PROGRESS_OPERATION = 'YGG_E022'` a common cunha
mensaxe específica:
- gl: `'A operación setProgress non é válida para o nodo "{nodeId}": é unha fonte computed.'`
- es: `'La operación setProgress no es válida para el nodo "{nodeId}": es una fuente computed.'`
- en: `'setProgress is not valid for node "{nodeId}": it is a computed source.'`

**Verifica con grep que YGG_E022 non está xa en uso** antes (debería
estar libre; o último é E021).

### 5.6 — `getProgress` sobre nodo computed: comportamento

- **Nodo NON existe**: devolve 0 (defensivo, sen cambio).
- **Nodo existe con `progressSource.type === 'manual'`**: devolve
  `NodeInstance.progress ?? 0` (comportamento actual de 2.4).
- **Nodo existe con `progressSource.type === 'computed'`**: calcula
  según 5.3.
- **Nodo existe SEN `progressSource`** ou con tipo distinto
  (remote/callback/event): **devolve 0** (defensivo, sen cambio
  respecto a 2.4 — esos quedan PROGRESS_SOURCE_UNSUPPORTED para
  setProgress; getProgress segue devolvendo 0 por defensivo).

### 5.7 — Lista de dependencias efectivas baleira

Tras filtrar `dependsOn` por inexistentes, se a lista queda baleira:
- `sum`: 0.
- `avg`: 0 (en vez de NaN por división 0).
- `min`: 0 (en vez de `Infinity`).
- `max`: 0 (en vez de `-Infinity`).

Defensa simple, coherente con "devolvemos 0 cando non hai datos".

### 5.8 — `getReachedMilestones` sobre nodo computed

**Mesma semántica ca para manual**: usa o `getProgress` (que xa devolve
o valor calculado) e compara con `progressMilestones`. Cero código
adicional, só reutiliza o algoritmo existente.

### 5.9 — Cero modificacións a TreeEngine

Esta sub-fase **non engade nin modifica métodos públicos** en
`TreeEngine`. Os tres métodos públicos engadidos en 2.4.b
(`setProgress`/`getProgress`/`getReachedMilestones`) son delegantes;
o seu comportamento adapta automáticamente cando `ProgressManager`
soporta computed.

**Excepción**: se atopas que `TreeEngine.getProgress` está usado
internamente en algún sitio que asume "valor establecido", podería
necesitar revisión. **Reporta en T0 calquera uso interno de
`getProgress`/`getReachedMilestones`** antes de modificar nada.

### 5.10 — Eventos: cero `progressChange` para computed

`progressChange` event **non se emite** para nodos computed cando o
seu valor derivado cambia por mutacións en `dependsOn`. Razón: emitir
"cascada de eventos" requiría detectar todos os nodos computed que
dependen indirectamente do nodo mutado, e o lifecycle de eventos
encadeados é fonte de bugs.

**Patrón recomendado para consumidores**: escoitar `progressChange`
para nodos `manual` e **re-consultar manualmente** `getProgress` para
os computed que dependan deles. (Documenta isto na cabeceira de
`ProgressManager.ts`.)

Se algún día se quere "cascada de eventos automática" para computed,
iso é decisión nova; non aquí.

### 5.11 — Validador Zod: `dependsOn` apuntando a inexistentes

Como noutras sub-fases (`maxTier <= 0`, `progressMilestones` fóra de
rango, etc.), validacións estáticas no Zod do TreeDef quedan **fóra
de alcance** desta sub-fase. Defensivamente, o ProgressManager
manexa `dependsOn` con inexistentes sen lanzar (5.3.2.a).

Documenta como pendente para "sub-fase de hardening do validador".

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións en:
- `packages/common/src/errors/codes.ts` — engadir
  `INVALID_PROGRESS_OPERATION` (E022).
- `packages/common/src/errors/messages.ts` — 3 mensaxes (gl/es/en).
- `packages/core/src/engine/ProgressManager.ts` — extender
  `setProgress` (rexeitar computed), extender `getProgress`
  (calcular para computed con detección de ciclos), helpers internos
  privados.

Test:
- Estender `packages/core/__tests__/engine/ProgressManager.test.ts`
  cos casos novos (computed), OU novo ficheiro
  `ProgressManager.computed.test.ts` se prefires. Decide; **NON
  duplicar tests do caso manual**.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 807 tests `--force`.
2. **Verifica con grep** que YGG_E022 non está en uso.
3. **Investiga `CycleDetector` e `DependencyGraph`**: lee a API
   pública. Reporta no chat:
   - Se son reutilizables para detectar ciclos en `dependsOn` de
     computed → vai a T2 reutilizando.
   - Se non encaixan facilmente → implementa con `Set` interno (5.4).
4. **Busca usos internos** de `getProgress` ou `getReachedMilestones`
   dentro de `packages/core/src/engine/` (5.9). Reporta o número
   de chamadas e onde están. **Se hai >0 usos internos que asumen
   "valor manual"**, escala (0.6). Se hai cero usos internos (que
   é o esperado tras 2.4.b), continúa.

### T1 — Common: ErrorCode INVALID_PROGRESS_OPERATION (5.5)
Engadir E022 + 3 mensaxes (gl/es/en). Typecheck 20/20.

Commit propio recomendado: `feat(common): add INVALID_PROGRESS_OPERATION (E022)`.

### T2 — Detección de ciclos (5.4)
Decide segundo T0:
- (a) Reutiliza `CycleDetector` se encaixa.
- (b) Implementa `Set<string>` interno como helper privado.

Esta peza é a base para T3, así que faina primeiro illada.

### T3 — `setProgress` rexeita computed (5.5)
Modifica `setProgress` para que, na cadea de validacións, **antes da
validación actual de `progressSource.type === 'manual'`**, detecte
`progressSource.type === 'computed'` e devolva err
`INVALID_PROGRESS_OPERATION`.

Mantén `PROGRESS_SOURCE_UNSUPPORTED` (E020) para os outros casos
(remote/callback/event). A orde de validacións:
1. Nodo existe → senón `NODE_NOT_FOUND`.
2. `supportsProgress: true` → senón `PROGRESS_NOT_SUPPORTED`.
3. **`progressSource.type === 'computed'` → `INVALID_PROGRESS_OPERATION`**
   (novo).
4. `progressSource.type === 'manual'` → senón
   `PROGRESS_SOURCE_UNSUPPORTED` (cubre remote/callback/event/ausente).
5. `percent` válido → senón `INVALID_PROGRESS_VALUE`.

### T4 — `getProgress` para computed (5.3, 5.6, 5.7)
Modifica `getProgress`:
- Detecta `progressSource.type === 'computed'`.
- Chama helper privado `computeProgressFor(nodeId, inProgress: Set)`.
- O helper aplica algoritmo 5.3 con detección de ciclos 5.4.
- Lista baleira tras filtrar → 0 (5.7).
- Clamp final a [0, 100].

Asegúrate que `getReachedMilestones` (5.8) segue funcionando
automáticamente porque chama `getProgress` internamente.

### T5 — Tests
Estende `ProgressManager.test.ts` (ou novo
`ProgressManager.computed.test.ts`). Cubre **como mínimo**:

**Cálculo básico**:
- Nodo computed con `dependsOn: [A]`, formula `sum`, A.progress=50 →
  `getProgress(computed)` devolve 50.
- Nodo computed con `dependsOn: [A, B]`, formula `sum`, A=30, B=40 →
  devolve 70.
- Mesmo caso con formula `avg` → devolve 35.
- Mesmo caso con formula `min` → devolve 30.
- Mesmo caso con formula `max` → devolve 40.
- `sum` con A=80, B=80 → clamp a 100 (non 160).

**Defensa**:
- `dependsOn` con nodos inexistentes → ignóranse (devolve resultado
  sobre os que existen).
- `dependsOn` con todos inexistentes → devolve 0 (5.7).
- `dependsOn: []` → devolve 0.
- Resultado clamped a [0,100] sempre.

**Composición** (computed depende de computed):
- A=70 (manual), B computed=[A] sum=70, C computed=[A,B] sum=140
  clampado a 100. Verifica.

**Ciclos** (5.4):
- A computed=[B], B computed=[A] → ambos devolven 0 (sen lanzar).
- A computed=[A] (autorreferente) → devolve 0.
- Cadea A→B→C→A → todos 0.

**setProgress rexeita computed** (5.5):
- Nodo computed → `setProgress(50)` devolve err
  `INVALID_PROGRESS_OPERATION` co código exacto.

**getReachedMilestones para computed** (5.8):
- Nodo computed con `progressMilestones: [25, 50, 75]`, deps que dan
  60 → devolve `[25, 50]`.

**Cero regresión**: 807 tests previos seguen pasando.

**.code exacto en TODOS os err**.

Número exacto novos no reporte. Cobertura: ProgressManager.ts non
baixa de 100% (xa estaba a 100%). Global non baixa de 98.18%.

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. Confirmar
baselines.

### T7 — Verificación + grep + commit
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
LITERAL. LITERAL.

- Changeset **minor** — common + core sincronizados.
- CHANGELOG: nova `## [Unreleased]` ao principio (DT-12). Contido:
  - Added: `ProgressManager` agora soporta `computed` progress
    source con fórmulas `sum`/`avg`/`min`/`max` sobre `dependsOn`.
    Derivación dinámica sen cache; detección de ciclos lazy
    (devolve 0 en bucles).
  - Added: ErrorCode `INVALID_PROGRESS_OPERATION` (E022) cando se
    intenta `setProgress` sobre un nodo computed.
  - Note: progressChange event NON se emite para nodos computed
    (cascada non implementada); consumidores re-consultan
    `getProgress` tras eventos de nodos `manual`.
  - Note: `dependsOn` con nodos inexistentes ou ciclos manéxase
    defensivamente (devolve 0); validacións estáticas Zod fóra
    desta sub-fase.

### T8 — Commit + push
Commits separados (mínimo 2):
1. `feat(common): add INVALID_PROGRESS_OPERATION (E022)`
2. `feat(core): add computed progress source to ProgressManager (sub-phase 2.4.c)`
3. (opcional) `chore: changeset + CHANGELOG for 2.4.c`

Push directo a `origin/main` (base `79abf8b`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/common/src/errors/codes.ts` (modificado: +1 código)
- `packages/common/src/errors/messages.ts` (modificado: +3 mensaxes)
- `packages/core/src/engine/ProgressManager.ts` (modificado:
  computed logic + helpers)
- `packages/core/__tests__/engine/ProgressManager.test.ts` ou
  `ProgressManager.computed.test.ts` (modificado/novo)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]`)

**NON deben aparecer** cambios en `packages/core/src/types/`,
`packages/core/src/engine/TreeEngine.ts`, `engine/index.ts`,
`pnpm-lock.yaml`, `packages/core/package.json`.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Cachear o progress derivado de computed (5.2).
- ❌ Escribir o progress derivado en `NodeInstance.progress` (5.1).
- ❌ Emitir `progressChange` event automaticamente para computed
  (5.10).
- ❌ Implementar `remote`/`callback`/`event` (siguen
  `PROGRESS_SOURCE_UNSUPPORTED`; Fase 5).
- ❌ Auto-unlock cando computed alcanza 100 (decisión 2.4 §5.7
  mantida).
- ❌ Modificar `TreeEngine.ts` (5.9: cero cambios na fachada).
- ❌ Modificar `types/progress.ts`, `types/node.ts` (xa están).
- ❌ Engadir validacións ao TreeDefValidator (5.11).
- ❌ Modificar `JsonSerializer` (computed non se persiste; 5.1).
- ❌ Refactorizar pezas existentes ("xa que toco...").
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12, A.6 L4).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1).

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.4.c — COMPLETADA E EN origin/main ═══
✅ Commit(s) <hashes> en origin/main (base 79abf8b)
✅ ProgressManager soporta computed: sum/avg/min/max sobre dependsOn
✅ Derivación dinámica sen cache (5.2)
✅ Detección de ciclos lazy con Set interno / CycleDetector (5.4)
✅ setProgress sobre computed rexeitado con INVALID_PROGRESS_OPERATION
✅ Ciclos / inexistentes / lista baleira → 0 (defensivo, sen excepcións)
✅ Clamp final a [0, 100]
✅ T0 CycleDetector/DependencyGraph: <reutilizado | impl propia>
✅ T0 usos internos de getProgress: <N atopados | cero>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / ProgressManager.ts <Y%>
   (baselines 2.4.b: 98.18% global; 100% ProgressManager)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: remote/callback/event seguen
   PROGRESS_SOURCE_UNSUPPORTED (Fase 5); progressChange non
   se emite para computed (5.10); validacións Zod sobre dependsOn
   fóra (5.11); cero auto-unlock con progress=100 (deseño).
✅ Changeset minor (common+core) + nova [Unreleased] (DT-12)
✅ git status pre-commit confirmou os ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.5 ou 2.6 (decide o director).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR
(parche xerado)".

---

*Fin do briefing 2.4.c. Derivación dinámica sen cache, ciclos lazy,
sen modificar TreeEngine. Calquera caso non cuberto → ESCALAR (0.6).*
