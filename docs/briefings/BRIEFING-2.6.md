# BRIEFING — SUB-FASE 2.6 de Yggdrasil Forge

> Pega este documento completo no chat executor (mesmo que pechou 2.5).
> Autosuficiente. Decisión non resolta → sección 0.6 (ESCALAR).
> **Sub-fase de tests cross-piece.** Pecha Fase 2 demostrando que
> EffectsRunner + StatComputer + TimeManager + ProgressManager
> funcionan xuntos en escenarios realistas. Cero código novo no motor.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/` (`mkdir -p`). NUNCA na raíz.
Rutas internas `C:/Users/tajes/proxectos/yggdrasil-forge/...`.
Un script por operación, `assert` antes de modificar.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**:
`pnpm turbo run test --filter=@yggdrasil-forge/core --force`.

**0.4 — Decisións do director non se consultan:** rama `main`; ficheiros
`python3`+`utf-8`, nunca heredoc; edición parcial `str_replace`; orde
T0→T6 estrita.

**0.5 — ANTI-PLACEHOLDER**:
```
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX|any-temp)" packages/core/src/
```
LITERAL no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA,
`🛑 DECISIÓN REQUERIDA DO ARQUITECTO`. **Lista de escenarios está
pre-resolta (sec 5).**

**0.7 — ENTREGA E TÍTULO DE REPORTE**:
- Pushed: `═══ SUB-FASE 2.6 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 2.6 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` ANTES de teorizar
sobre fallos.

**0.9 — CHANGELOG (DT-12, A.6 L4)**: nova cabeceira `## [Unreleased]`
ao principio; NON consolidar.

**0.10 — exactOptionalPropertyTypes**: para campos opcionais con valor
potencialmente `undefined`, spread condicional
`...(value !== undefined && { field: value })`.

---

## 1. IDENTIFICACIÓN

Sub-fase **2.6** de Yggdrasil Forge. **Última de Fase 2.** Pecha
toda a Fase 2.
Tipo: **tests cross-piece** — verifican que as pezas da Fase 2
(EffectsRunner, StatComputer, TimeManager, ProgressManager) funcionan
xuntas en escenarios realistas. **Cero código novo no motor.**

---

## 2. CONTEXTO MÍNIMO

Tras 2.5 (876 tests, cobertura 98.13%), o motor ten todas as pezas de
Fase 2 implementadas e cableadas. Cada peza ten tests illados e
tests de integración co TreeEngine, pero **case ningún test combina
TRES OU MÁIS pezas** nun escenario realista. Esta sub-fase pecha esa
brecha.

**Tests cross-piece son distintos doutros tests**:
- **Cero ferramenta nova** (sen `.refine`, sen métodos novos).
- **Cero modificación** de pezas do motor (defensa: se algún test
  novo non pasa, é o test que está mal, NON a peza).
- **Cero ErrorCode novo**, cero common, cero types.
- TreeDefs realistas con combinacións de features.
- Verificación de cascadas (eventos, audit, mutacións de estado).

---

## 3. ESTADO Á ENTRADA (verificado polo director)

- Rama `main`, último commit `4856382` (docs MASTER 2.5).
- 876 tests pasan en core (42 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **Tests integración existentes** en `packages/core/__tests__/integration/`:
  - `applyChanges.test.ts` (9)
  - `audit.test.ts` (6 — verifica)
  - `coverage-targeted.test.ts` (23)
  - `economy.test.ts` (6)
  - `lifecycle.test.ts` (3)
  - `subscription.test.ts` (5)
  - `untrusted-input.test.ts` (5)
- **Fixtures dispoñibles**: `fixtures.ts` con `makeNode`, `makeRoot`,
  `makeEdge`, `makeResource`, `makeMinimalTreeDef`, `makeRichTreeDef`,
  `makeMultiTierTreeDef`, `makeChainedPrereqTreeDef`.
- **Brechas cross-piece**: cero tests combinan effects + stats +
  time + progress. Cada peza testada en par como máximo (peza +
  TreeEngine).
- DT-9, DT-11, DT-12 abertas, non bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear tests de integración que combinen **3+ pezas da Fase 2** nun
mesmo escenario realista, verificando que (a) o estado final é
coherente, (b) a cascada de eventos sucede na orde correcta, (c) o
audit reflecte as accións esperadas, e (d) o round-trip
serializa/deserializa preserva todo.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estrutura: un só ficheiro novo

Crea un único ficheiro
`packages/core/__tests__/integration/phase-2-cross-piece.test.ts`. Un
ficheiro novo é máis claro que estender 7 existentes. **NON tocar os
existentes** (cero risco de regresión).

### 5.2 — Lista exacta de escenarios

Implementa **estes 8 escenarios** (cada un en `describe`/`it` propio).
**NON engadas escenarios non listados** (acoutar > ambicionar; se
descobres unha combinación interesante non listada, **escala** ou
anótaa para 2.7/Fase 3).

**Escenario 1: Effects + Stats**
- TreeDef: nodo A con `effects: [{type: 'modify_resource', resourceId: 'xp', op: '+', amount: 10}]`
  e `statContributions: [{statId: 'power', op: '+', value: 5}]`.
- Stat `power` con initial=0.
- Unlock A.
- Verifica: budget xp subiu 10, `getStat('power')` devolve 5,
  audit ten `node_unlocked` + `effects_applied`.

**Escenario 2: Effects + Progress**
- TreeDef: nodo A con `effects: [{type: 'set_progress', nodeId: 'B', percent: 75}]`.
  Nodo B con `supportsProgress: true`, `progressSource: { type: 'manual' }`,
  `progressMilestones: [25, 50, 75, 100]`.
- Unlock A.
- Verifica: `engine.getProgress('B')` devolve 75,
  `engine.getReachedMilestones('B')` devolve `[25, 50, 75]`,
  evento `progressChange(B, 75)` emitido.

**Escenario 3: TimeManager + Progress (preservación tras expiración)**
- TreeDef: nodo A con `supportsProgress: true`, `progressSource: { type: 'manual' }`,
  `timeConstraints: { expiresAt: NOW + 1000 }`.
- Clock virtual: now = NOW.
- Unlock A. setProgress(A, 60).
- Avanzar clock a NOW + 2000.
- `engine.tick()`.
- Verifica: A.state === 'expired'. `engine.getProgress('A')` **segue
  devolvendo 60** (decisión 2.4.b §5.8 e §5.5 mantida).
  `engine.canUnlock(A)` rexeita por estar 'expired'.

**Escenario 4: Computed progress + canUnlock**
- TreeDef: nodos A, B (ambos manual con supportsProgress=true). Nodo C
  con `progressSource: { type: 'computed', dependsOn: ['A', 'B'],
  formula: 'avg' }`. Nodo D con prereq `{ type: 'progress_min',
  nodeId: 'C', percent: 50 }`.
- setProgress(A, 80). setProgress(B, 20).
- Verifica: `engine.getProgress('C')` devolve 50 (media).
  `engine.canUnlock('D')` ALLOWED.
- setProgress(B, 0).
- Verifica: `engine.getProgress('C')` devolve 40.
  `engine.canUnlock('D')` NON allowed.

**Escenario 5: StatContribution condicional + computed**
- TreeDef: nodos A, B manual. Nodo C computed sobre [A, B] sum
  clamp 100. Nodo D unlocked con `statContributions: [{
  statId: 'power', op: '+', value: 10, conditions: [{ type: 'progress_min',
  nodeId: 'C', percent: 50 }] }]`. Stat power initial=0.
- Inicio: A=0, B=0 → C=0. Unlock D. `getStat('power')` = 0 (condition
  falla).
- setProgress(A, 30). setProgress(B, 30). → C=60.
- Verifica: `getStat('power')` agora = 10 (condition pasa).
- setProgress(B, 0). → C=30.
- Verifica: `getStat('power')` volve a 0.
- **Importante**: esta proba require que StatComputer.cache se
  invalide automáticamente tras setProgress (decisión 2.4.e bug-fix).

**Escenario 6: Round-trip Fase 2 completo**
- TreeDef "monstruo" que ten:
  - Recursos múltiples (xp, sp, gold).
  - Nodos con effects (modify_resource + set_progress + unlock_node).
  - Nodos con statContributions (algunhas con conditions, perTier=true).
  - Nodos con timeConstraints (expiresAt UTC).
  - Nodos con supportsProgress + progressSource manual.
  - Un nodo computed sobre 3 dependencias.
  - Stats con min/max clamp.
- Serializa con `serialize`/`toJSON`.
- Deserializa con `TreeEngine.fromJSON`.
- Aplica unhas mutacións (unlock, setProgress, etc.).
- Re-serializa.
- Verifica: as mutacións aplicadas reflíctense no JSON re-serializado.
  TreeDef definicional non muda (só `state.nodes`, `state.budget`).

**Escenario 7: applyChanges atómico cross-piece**
- TreeDef coa que un nodo A está unlocked con custo pagado e effects
  aplicados.
- Batch de changes que toquen:
  - `modify_node`: cambiar `cost` dun nodo.
  - `modify_node`: cambiar `effects` dun nodo.
  - `modify_node`: cambiar `statContributions` dun nodo.
  - `modify_node`: cambiar `timeConstraints` dun nodo.
  - `modify_node`: cambiar `progressSource` (de manual a computed).
- Verifica atomicidade: se TODO o batch é válido, aplícase. Estado
  final coherente: stats reflicten as contributions novas; canUnlock
  reflicte timeConstraints novas; etc.
- **Caso negativo**: o mesmo batch con UNHA change inválida no medio
  (ex: `cost` negativo). Verifica que NADA se aplica (rollback total).

**Escenario 8: Cascade event ordering**
- TreeDef: nodo A con `effects: [{type: 'modify_resource', xp, +5},
  {type: 'set_progress', nodeId: 'B', percent: 100}]`. Nodo B con
  supportsProgress + manual.
- Stat S contribuído por A (perTier=true).
- Subscribirse a TODOS os eventos (`engine.on('unlock', ...)`,
  `engine.on('budgetChange', ...)`, `engine.on('effectApplied', ...)`,
  `engine.on('progressChange', ...)`, `engine.on('auditEntry', ...)`).
- Unlock A.
- Verifica orde exacta dos eventos recibidos (verificar empíricamente
  primeiro — lección 2.1.b L2 — antes de fixar asercións estrictas).

### 5.3 — Helpers e fixtures

**Reutiliza `fixtures.ts` existente** sempre que poidas. Se algún
escenario require unha TreeDef especialmente complexa que **non
encaixa coas fixtures actuais**, defínea **inline no test mesmo** (non
modifiques fixtures.ts; sería tocar dependencia compartida innecesaria).

Se varios escenarios comparten estrutura, **pódese definir un helper
privado no propio ficheiro de test** (`function makeMonstruoTreeDef()`).
Cero export.

### 5.4 — Clock virtual nos escenarios 3 e 6/7 se aplica

Onde se require manipulación temporal (escenario 3 obrigatorio,
posiblemente 6/7), inxecta `timeNow` no `TreeEngineOptions`:
```ts
let now = 1000000
const engine = new TreeEngine(treeDef, { timeNow: () => now })
// ... avanzar now manualmente cando faga falta
now += 2000
engine.tick()
```

### 5.5 — Verificación empírica antes de asercións estrictas (L2 2.1.b)

Para o **escenario 8 (cascade event ordering)**: NON fixes
expectativas a priori. **Primeiro executa e captura a orde real**;
después fixa a aserción co que viches. Documenta no comentario que
a orde **é o contrato observable, fixado por este test**.

### 5.6 — Validacións Zod NON son cross-piece

A 2.5 xa cubriu validacións Zod. **NON repetir** aquí. Esta sub-fase
asume TreeDefs válidas.

### 5.7 — Cero modificación do motor

Se algún test non pasa porque **descobre un bug**, **escala (0.6)**.
NON arranxes silenciosamente. Os bugs cazados son outro escalado
preventivo, non parte do alcance.

### 5.8 — Cobertura

Probablemente esta sub-fase NON suba a cobertura (xa estamos a 98%);
podería incluso baixar lixeiramente porque tests-only non aporta
branches novos. **Acepto baixa ata 0.2 puntos** (lección 2.5 L2 estendida).
Se baixa máis, **escala**.

### 5.9 — Cero novos tests negativos para casos xa cubertos

Os tests negativos individuais (ex: setProgress(-1) → erro) **xa
están** nos tests illados. Esta sub-fase **NON os duplica**. Foco en
escenarios positivos cross-piece.

### 5.10 — Tests asíncronos

Algúns escenarios poden requirir `async/await` (ex: `engine.unlock`
en bash de 2.1.b). Usa `it('...', async () => {...})` cando proceda.
Cero promesas pendentes.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións SÓ en:
- `packages/core/__tests__/integration/phase-2-cross-piece.test.ts`
  (NOVO ficheiro).

Sen toques a:
- `packages/core/src/`
- `packages/common/`
- `packages/core/__tests__/integration/fixtures.ts` (excepto se T0
  detecta un helper que falta e tras escalado).

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións previas
1. `pnpm install`. Confirma 876 tests `--force`.
2. **Lee** `packages/core/__tests__/integration/lifecycle.test.ts` e
   `economy.test.ts` para ver patrón estándar de tests integración.
3. **Lee** `packages/core/__tests__/integration/fixtures.ts` para ver
   helpers dispoñibles.
4. **Verifica** o nome exacto dos eventos no `EventMap` (lección 2.5
   L1 sobre nomes de propiedades). Importante para escenario 8.
   `grep -A20 "interface EventMap" packages/core/src/types/events.ts`.
   Reporta no chat os nomes dos eventos relevantes.

### T1 — Escenarios 1-3 (effects + stats / effects + progress / time + progress)
Implementa os tres primeiros escenarios. Son os máis pequenos e
independentes.

Typecheck 20/20. Tests pasan (878 → 879 → 880 aprox).

### T2 — Escenarios 4-5 (computed + canUnlock / contribution conditional con computed)
Implementa os escenarios 4 e 5. Verifica o bug-fix 2.4.e (escenario 5).

### T3 — Escenario 6 (round-trip Fase 2)
TreeDef "monstruo" inline ou helper privado. Serialize → fromJSON →
mutate → serialize again. Verifica que o roundtrip preserva estado.

### T4 — Escenario 7 (applyChanges atómico cross-piece)
Caso positivo + caso negativo. Verifica atomicidade total.

### T5 — Escenario 8 (cascade event ordering)
**Cría empíricamente primeiro** (5.5). Logging temporal das ordes,
inspección, e despois fixa as asercións.

### T6 — Verificación final + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/core/src/
pnpm test
```
LITERAL. LITERAL.

- Changeset **patch** (es só tests, non hai cambio observable de
  API) — só `@yggdrasil-forge/core`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  - Added: tests de integración cross-piece para Fase 2
    (`phase-2-cross-piece.test.ts`). 8 escenarios cubrindo
    combinacións de Effects + Stats + TimeManager + ProgressManager
    (manual + computed).
  - Note: pecha Fase 2. Próximo: Fase 3 (Persistencia + Migracións) ou
    etapa intermedia de exemplos prácticos segundo o director.

### Ficheiros esperados no diff final:
- `packages/core/__tests__/integration/phase-2-cross-piece.test.ts`
  (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado: nova `[Unreleased]`)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/src/`, `packages/core/__tests__/` agás o ficheiro
novo, `packages/core/__tests__/integration/fixtures.ts`,
`pnpm-lock.yaml`, `core/package.json`.

---

## 8. CONVENCIÓNS

Comentarios **galego** (consistencia cos demais tests de integración
existentes que están en galego — verifica). Marcadores `// ──
INICIO/FIN ──` para bloques. 2 espazos, comilla simple, sen `;`,
trailing commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**.
NON desactives Biome.

---

## 9. QUE NON FACER

- ❌ Tocar pezas do motor (5.7).
- ❌ Engadir ErrorCodes (Fase 2 está pechada para isto).
- ❌ Modificar tipos públicos.
- ❌ Modificar fixtures.ts (5.3).
- ❌ Repetir tests negativos xa cubertos por tests illados (5.9).
- ❌ Engadir escenarios non listados (5.2: lista exacta).
- ❌ Validar `INVALID_TREE_DEF` casos novos (5.6: cuberto en 2.5).
- ❌ Arranxar bugs descubertos silenciosamente (5.7: escala).
- ❌ Modificar tests existentes para que pasen.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12, A.6 L4).
- ❌ Placeholders / `any` / valores de recheo (0.5).
- ❌ Tocar/mergear o PR de release (#1).

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 2.6 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 4856382)
✅ phase-2-cross-piece.test.ts creado (cero modificación de motor)
✅ 8 escenarios cross-piece implementados:
   1. Effects + Stats
   2. Effects + Progress
   3. TimeManager + Progress (preservación tras expiración)
   4. Computed progress + canUnlock
   5. StatContribution condicional + computed (verifica bug-fix 2.4.e)
   6. Round-trip Fase 2 completo (serialize/deserialize)
   7. applyChanges atómico cross-piece
   8. Cascade event ordering (orde fixada empíricamente)
✅ T0 EventMap eventos relevantes: <lista>
✅ Tests: <N> pasan en core (<delta> novos) — verificado --force
✅ Cobertura: global <X%> (baseline 2.5: 98.13%; aceptable ata -0.2)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
🐛 BUGS CAZADOS: <ningún | detalle (cada un escalado)>
⚠️ Limitacións coñecidas: ningunha nova. **FASE 2 PECHADA.**
✅ Changeset patch (core; common NON tocado) + nova [Unreleased]
   (DT-12, non consolidada)
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
🎉 FASE 2 PECHADA — 13 sub-fases (2.1 a 2.6).
LISTO PARA: hixiene MASTER final + peche Fase 2 + decisión do
director sobre Fase 3 ou etapa intermedia (exemplos prácticos).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR
(parche xerado)".

---

*Fin do briefing 2.6. Tests cross-piece pechan Fase 2. Cero modificación
do motor; cero ferramenta nova. Calquera bug cazado → ESCALAR (0.6)
como escalado preventivo.*
