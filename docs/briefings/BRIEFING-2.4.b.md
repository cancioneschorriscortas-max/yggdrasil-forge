# BRIEFING — SUB-FASE 2.4.b de Yggdrasil Forge

> Pega este documento completo nun chat executor novo.
> Autosuficiente. Decisión de contrato non resolta aquí → sección 0.6 (ESCALAR).
> **Sub-fase pequena de integración.** Cablear o ProgressManager xa
> construído ao TreeEngine, expoñendo `setProgress` / `getProgress` /
> `getReachedMilestones`. `computed` source e auto-unlock seguen FÓRA.

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
Resultado LITERAL no reporte. Cero matches **novos**; preexistentes
documentados.

**0.6 — ESCALADO.** Decisión de contrato non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. As decisións clave **xa están
pre-resoltas** (sec 5).

**0.7 — ENTREGA E TÍTULO DE REPORTE (lección 2.3/2.3.b L2).**
Integración = `git push` directo a `origin/main`. Se transporte por
parche: aplícase **DENDE A RAÍZ** (1.15) e **con working tree limpo
previo** (2.1.b L1).

**O título do reporte (sección 10) DEBE ser inequívoco:**
- Se está pushed: usa **literalmente**
  `═══ SUB-FASE 2.4.b — COMPLETADA E EN origin/main ═══`.
- Se está só na túa máquina, parche xerado: usa **literalmente**
  `═══ SUB-FASE 2.4.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`.

NON inventes formulacións intermedias.

**0.8 — `git am` (lección 2.4 L1).** Antes de aplicar calquera parche
ou de teorizar sobre fallos de aplicación: **primeiro `git status` +
`git log -1`** para confirmar se o parche xa está aplicado en intentos
previos. Diagnosticar antes de teorizar (CRLF, base, etc.).

**0.9 — CHANGELOG (DT-12, lección A.6 L4).** Engade **unha nova
cabeceira `## [Unreleased]` ao principio do ficheiro**. NON intentes
reagrupar nin consolidar entradas existentes.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.4.b** de Yggdrasil Forge.
Tipo: **integración pura** — cablear `ProgressManager` (construído en
2.4) ao `TreeEngine`, expoñendo a súa API pública.

---

## 2. CONTEXTO MÍNIMO

Tras 2.4, `ProgressManager` é peza standalone con `setProgress` /
`getProgress` / `getReachedMilestones`. Esta sub-fase **integra a peza
en `TreeEngine`** expoñendo eses tres métodos na API pública e
preparando o terreo para `computed` source (sub-fase 2.4.c separada).

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `1774a81`.
- 788 tests pasan en core (40 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **TreeEngine ten todas as pezas privadas** xa configuradas:
  `store`, `locale`, `events`, `resources`, `resolver`, `audit`,
  `effectsRunner`, `statComputer`, `timeManager` (todas
  `private readonly`).
- Orde de instanciación no constructor: events → resources → resolver
  → audit → effectsRunner → statComputer → timeManager → **(aquí
  vai progressManager)**.
- `ProgressManagerContext` esixe: `treeDef`, `store`, `events`,
  `audit`, `locale`. Todas as pezas accesibles desde o constructor
  de `TreeEngine`.
- ErrorCodes engadidos en 2.4: `PROGRESS_NOT_SUPPORTED` (E019),
  `PROGRESS_SOURCE_UNSUPPORTED` (E020), `INVALID_PROGRESS_VALUE`
  (E021). `NODE_NOT_FOUND` é `YGG_E001` (reutilizado).
- DT-9 (infra), DT-11 (cycle detection), DT-12 (CHANGELOG
  cosmético). Ningunha bloqueante.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir `setProgress(nodeId, percent)`, `getProgress(nodeId)` e
`getReachedMilestones(nodeId)` á API pública de `TreeEngine`
(delegando en `ProgressManager`), **sen** auto-unlock e **sen**
transición automática a `'in_progress'`.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas; non escalar estas)

### 5.1 — `computed` source: FÓRA DESTA SUB-FASE

`computed` source (derivar progress dunha fórmula sobre outros nodos)
queda asignada a **sub-fase 2.4.c separada**. Razóns:
- Arrastra detección de ciclos en `dependsOn`, cache + invalidación,
  e definición clara de fórmulas (sum/avg/min/max). Iso é decisión
  arquitectónica propia.
- Aplicar a lección recorrente: acoutar > ambicionar. 2.4.b é **pura
  integración** sen lóxica nova, igual que 2.1.b, 2.2.b, 2.3.b.

Nodos con `progressSource.type === 'computed'` seguen rexeitando
`setProgress` con `PROGRESS_SOURCE_UNSUPPORTED` (comportamento de
2.4). Sen cambios.

### 5.2 — `ProgressManager` como `private readonly` en TreeEngine

Patrón idéntico a `effectsRunner`/`statComputer`/`timeManager`:
```ts
private readonly progressManager: ProgressManager
```

Constrúese **tras `timeManager`** no constructor. Inicialización:
```ts
this.progressManager = new ProgressManager({
  treeDef: this.treeDef,
  store: this.store,
  events: this.events,
  audit: this.audit,
  locale: this.locale,
})
```

(Verifica como `treeDef` está accesible desde o constructor — pode
ser `treeDef` directo como parámetro do constructor, ou
`this.treeDef` se está como campo. Adapta consecuentemente.)

### 5.3 — API pública nova: tres métodos

Engade a `TreeEngine.ts`:

```ts
/**
 * Establece o progreso dun nodo (0-100). Require que o nodo teña
 * `supportsProgress: true` e `progressSource: { type: 'manual' }`.
 * NON muta `NodeInstance.state`: o estado segue sendo
 * responsabilidade exclusiva de unlock/lock/respec/tick/applyChanges.
 * NON desbloquea automáticamente cando progress=100.
 */
setProgress(nodeId: string, percent: number): Result<ProgressUpdateResult> {
  return this.progressManager.setProgress(nodeId, percent)
}

/**
 * Lee o progreso actual dun nodo. 0 se non ten progress definido
 * ou non existe (defensivo).
 */
getProgress(nodeId: string): number {
  return this.progressManager.getProgress(nodeId)
}

/**
 * Lista de milestones xa alcanzados para un nodo.
 */
getReachedMilestones(nodeId: string): readonly number[] {
  return this.progressManager.getReachedMilestones(nodeId)
}
```

**Reexportar `ProgressUpdateResult`** desde `engine/index.ts` se non
está xa (verifica; debería estar dende 2.4).

### 5.4 — Cero auto-unlock (5.7 da 2.4 reafirmada)

`setProgress(nodeId, 100)` **NON desbloquea o nodo automáticamente**.
O consumidor implementa "auto-unlock" externamente se quere:
```ts
const result = engine.setProgress(nodeId, 100)
if (result.ok && result.value.newPercent === 100) {
  const canResult = await engine.canUnlock(nodeId)
  if (canResult.ok && canResult.value.allowed) {
    await engine.unlock(nodeId)
  }
}
```

### 5.5 — `'in_progress'` state: NON usar nesta sub-fase

`NodeState` ten `'in_progress'` declarado pero **non se usa**
actualmente en ningures (verifícao en T0). Esta sub-fase **NON
empeza a usalo**.

Razóns:
- A semántica de cando entrar/saír de `'in_progress'` non está
  acordada. ¿Entra cando progress > 0? ¿Sae cando progress = 100?
  ¿E se setProgress(0) tras setProgress(50)? Ambigüidade.
- Coherencia con 2.4 (5.7): setProgress NUNCA muta state.
- Asignación a sub-fase futura cando se defina a semántica.

Documenta no comentario do método `setProgress` que iso é deliberado.

### 5.6 — Cero cambio a `lock`/`respec`/`applyChanges`

Esta sub-fase **só** engade tres métodos públicos delegantes. NON
modifica `unlock`, `lock`, `respec`, `applyChanges`, `tick`, `canUnlock`.
Razóns: ProgressManager non ten cache propia que invalidar (lectura
directa do store cada vez), nada que sincronizar.

### 5.7 — Cero ErrorCodes novos

Toda a infraestrutura xa existe (códigos engadidos en 2.4). Cero
edicións a `packages/common/`.

### 5.8 — `respec` e progress: NON limpa o `progress`

Cando o usuario fai `respec`, o progress dos nodos relockeados **NON
se reseta a 0 automáticamente**. Razón: `progress` é dato semántico
("xa fixen o 50% deste exercicio") que pode querer **preservarse**
para non perder traballo. O consumidor decide se reseta tras respec
chamando `engine.setProgress(nodeId, 0)` explicitamente.

**Esta decisión NON precisa cambios en `respec` para ser efectiva**
(o respec actual non toca `progress` porque non sabía que existía;
agora si existe, e segue sen tocalo). Documenta no comentario do
método `setProgress` que esta é a semántica esperada.

Se nalgún test ves que tras `respec` o progress se conserva, **é o
comportamento correcto**. Non escribas un test que esixa o contrario.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións en:
- `packages/core/src/engine/TreeEngine.ts` — instanciar
  ProgressManager, engadir 3 métodos públicos.
- `packages/core/src/engine/index.ts` — verificar/asegurar export de
  `ProgressUpdateResult`.

Test novo:
- `packages/core/__tests__/engine/TreeEngine.progress.test.ts`

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 788 tests `--force`.
2. **Verifica que `'in_progress'` non se usa en ningures** xa
   (`grep -rn "'in_progress'" packages/core/src/` excluíndo
   declaracións de tipo). Se aparece usado en algún lugar, **escala
   (0.6)** — non é o esperado.
3. **Verifica que `ProgressUpdateResult` está exportado** desde
   `engine/index.ts`. Se non, anótao para engadilo en T4.

### T1 — Cablear ProgressManager no constructor (5.2)
- Engade `private readonly progressManager: ProgressManager` no
  bloque de campos privados (xunto co resto, tras `timeManager`).
- Instancialo **tras `timeManager`** no constructor.
- Importar ProgressManager se non está importado.

Typecheck 20/20.

### T2 — Tres métodos públicos delegantes (5.3, 5.4, 5.5)
- `setProgress(nodeId, percent): Result<ProgressUpdateResult>`.
- `getProgress(nodeId): number`.
- `getReachedMilestones(nodeId): readonly number[]`.

Todos son **delegantes puros** (un só `return this.progressManager.X(...)`).
Engade JSDoc claro que documente as decisións 5.4 (cero auto-unlock),
5.5 (cero transición a `'in_progress'`), 5.8 (respec non reseta
progress).

### T3 — Asegurar exports
Se T0 detectou que `ProgressUpdateResult` non está exportado,
exportalo desde `engine/index.ts`:
```ts
export type { ProgressUpdateResult } from './ProgressManager.js'
```

### T4 — Tests
`packages/core/__tests__/engine/TreeEngine.progress.test.ts`. Cobre
**como mínimo**:

- **Integración básica**: instanciar TreeEngine, chamar
  `engine.setProgress(nodeId, 50)` nun nodo con `supportsProgress:
  true` + `manual` → ok, `engine.getProgress(nodeId)` devolve 50.
- **Evento progressChange**: subscribirse a `progressChange`,
  chamar `engine.setProgress(nodeId, 75)` → recibido evento con
  `(nodeId, 75)`.
- **Audit emitido**: chamar `engine.setProgress` con audit
  habilitado → entry `progress_updated` no log.
- **state NON cambia** (5.5): tras `engine.setProgress(nodeId, 100)`,
  `engine.getNodeState(nodeId).state` **non é `'unlocked'` nin
  `'in_progress'`**, segue como estaba (`'locked'` se non houbo
  unlock previo).
- **Cero auto-unlock** (5.4): `engine.setProgress(nodeId, 100)` →
  `engine.canUnlock(nodeId)` segue avaliándose normal; o nodo non
  está unlocked.
- **getReachedMilestones**: nodo con `progressMilestones: [25, 50,
  75, 100]`, tras `setProgress(60)` → `engine.getReachedMilestones`
  devolve `[25, 50]`.
- **respec conserva progress** (5.8): desbloquear nodo (estado
  unlocked), setProgress(50), respec → `engine.getProgress(nodeId)`
  segue devolvendo 50 (progress non se reseta).
- **Erros propagados con `.code` exacto**:
  - Nodo inexistente → `NODE_NOT_FOUND` (E001).
  - Nodo sen `supportsProgress` → `PROGRESS_NOT_SUPPORTED` (E019).
  - Nodo con `progressSource: { type: 'remote', ... }` →
    `PROGRESS_SOURCE_UNSUPPORTED` (E020).
  - `setProgress(-1)` ou `setProgress(101)` →
    `INVALID_PROGRESS_VALUE` (E021).
- **Cero regresión**: 788 tests previos seguen pasando intactos.

Número exacto de tests novos no reporte. Cobertura: TreeEngine.ts
non baixa do baseline **96.46%**. Global non baixa de **98.18%**.

### T5 — Cobertura
`pnpm --filter @yggdrasil-forge/core run test:coverage`. Confirmar
baselines mantidos.

### T6 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
Grep LITERAL. Cobertura LITERAL.

- Changeset **minor** — só core (common NON se toca; confírmao
  co `git diff --stat`).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio**
  (DT-12). Contido:
  - Added: `TreeEngine.setProgress(nodeId, percent)`,
    `getProgress(nodeId)`, `getReachedMilestones(nodeId)` (delegan
    en ProgressManager interno).
  - Note: `setProgress` non desbloquea automaticamente cando
    `progress === 100` nin cambia `NodeInstance.state`; o consumidor
    decide. `respec` non reseta o `progress` dos nodos relockeados.
  - Note: `computed` progress source segue como
    `PROGRESS_SOURCE_UNSUPPORTED` (asignado a sub-fase futura
    2.4.c).

### T7 — Commit + push
Commit Conventional: `feat(core): expose ProgressManager API on
TreeEngine (sub-phase 2.4.b)`. Push directo a `origin/main` (base
`1774a81`). Reporta hash.

---

## 8. CONVENCIÓNS
Comentarios **castelán**, marcadores `// ── INICIO/FIN ──`. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS
strict, **cero `any`**. NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Implementar `computed` source (5.1).
- ❌ Auto-unlock cando progress=100 (5.4).
- ❌ Transitar a `'in_progress'` automaticamente (5.5).
- ❌ Modificar `unlock`/`lock`/`respec`/`applyChanges`/`tick`/
  `canUnlock` (5.6).
- ❌ Resetar `progress` en `respec` (5.8).
- ❌ Engadir ErrorCodes ou tocar common (5.7).
- ❌ Engadir lóxica nova a `ProgressManager`. SÓ delegación.
- ❌ Refactorizar pezas existentes ("xa que toco...").
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12, A.6 L4).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1) ou changeset-release.

### Ficheiros esperados no diff final (verifica `git status` antes
de commitear; lección 2.2.b/2.3 L1):

- `packages/core/src/engine/TreeEngine.ts` (modificado: +1 campo,
  +1 instanciación, +3 métodos públicos)
- `packages/core/src/engine/index.ts` (posiblemente modificado se
  T3 engade export de `ProgressUpdateResult`)
- `packages/core/__tests__/engine/TreeEngine.progress.test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]` ao principio)

**NON deben aparecer** cambios en `packages/common/`,
`packages/core/src/types/`, `packages/core/src/engine/ProgressManager.ts`,
`pnpm-lock.yaml`, `packages/core/package.json`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.4.b — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 1774a81)
✅ ProgressManager cableado como private readonly tras timeManager
✅ API pública nova: setProgress, getProgress, getReachedMilestones
✅ Cero auto-unlock; cero transición a 'in_progress' (5.4, 5.5)
✅ respec conserva progress (5.8 documentado, test verifica)
✅ Cero modificacións a unlock/lock/respec/tick/applyChanges/canUnlock
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> / TreeEngine.ts <Y%>
   (baselines 2.4: 98.18% global; non deben baixar)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: computed source aínda
   PROGRESS_SOURCE_UNSUPPORTED (5.1, 2.4.c futura); 'in_progress'
   state segue sen usarse por deseño (5.5); respec non reseta progress
   (5.8 deliberado).
✅ Changeset minor (core; common NON tocado) + nova [Unreleased]
   en CHANGELOG (DT-12, non consolidada)
✅ git status pre-commit confirmou os ficheiros esperados (§9)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 2.4.c (ProgressManager.computed source) ou
outra que decida o director.
═══
```

**SE NON PUSHED (parche pendente)**:
```
═══ SUB-FASE 2.4.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══
[resto idéntico ao formato 'COMPLETADA']
```

NON inventes formulacións intermedias.

---

*Fin do briefing 2.4.b. Pura integración delegante; cero lóxica nova;
cero auto-unlock; respec conserva progress. Calquera caso non cuberto
→ ESCALAR (0.6).*
