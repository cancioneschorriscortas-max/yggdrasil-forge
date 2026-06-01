# BRIEFING — SUB-FASE 3.0 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase de refactor arquitectónico preventivo.** Move `Result<T>`
> de `@yggdrasil-forge/core/types/result.ts` a `@yggdrasil-forge/common`
> mantendo re-exports para CERO ruptura. Preparatoria para Fase 3 onde
> `@yggdrasil-forge/storage` necesita `Result` sen acoplarse a `core`.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Toda a decisión
arquitectónica está pre-resolta (sec 5).**

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.0 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.0 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.0** de Yggdrasil Forge. **Primeira de Fase 3, refactor
preparatorio.** Tipo: **mover primitivo `Result<T>` a paquete máis
fundamental** (`common`), mantendo re-exports en `core/types/result.ts`
para cero ruptura.

---

## 2. CONTEXTO MÍNIMO

A próxima sub-fase (3.1) crea `@yggdrasil-forge/storage` con
`StorageAdapter` que **precisa `Result<T>`** segundo a especificación
MASTER §21. Hoxe `Result` vive en `@yggdrasil-forge/core/types/result.ts`,
o que forzaría a `storage` a depender de `core` — **acoplamento
arquitectónico incorrecto**: storage é máis fundamental que o motor
(non sabe nada do dominio do skill tree).

Esta sub-fase resolve esa tensión movendo `Result` a `common` (onde xa
viven os outros primitivos: `Locale`, `YggdrasilError`, `ErrorCode`),
**sen romper ningún import existente**.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `f14e5c7` (docs publish strategy).
- 896 tests pasan en core (43 ficheiros) con `--force`.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`packages/core/src/types/result.ts`** (80 liñas): contén `type
  Result<T, E>`, helpers `ok`, `err`, `isOk`, `isErr`, `unwrap`,
  `unwrapOr`. Importa `YggdrasilError` desde `@yggdrasil-forge/common`.
- **`packages/common/src/result.ts`**: NON existe.
- **`packages/common/src/index.ts`**: exporta `PROJECT_NAME`, `VERSION`,
  `SCHEMA_VERSION`, `Locale`, `LocalizedString`, `ErrorCode`,
  `YggdrasilError`, etc. **NON exporta Result aínda**.
- **Imports de `Result` en `packages/core/src/`**: **6 ficheiros**
  (verificado con grep). Todos importan vía `'../types/index.js'` ou
  `'../types/result.js'`. Centralizado.
- **Imports de `Result` en `packages/core/__tests__/`**: 1 ficheiro.
- ErrorCodes `STORAGE_READ_FAILED` (YGG_S001), `STORAGE_WRITE_FAILED`
  (YGG_S002), `STORAGE_QUOTA_EXCEEDED` (YGG_S003) **xa existen** en
  common (E055-057). Probablemente postos polo briefing 0.5.

**Investigación da orixe (para xustificación)**:
- `Result` foi engadido en commit `35ac5d5` polo briefing 1.2
  (`BRIEFING_1.2_CORE_TYPES_WAVE_1.md`).
- O briefing 1.2 ubicou `Result` en `core/types/` porque o MASTER §7.1
  ("TIPOS FUNDAMENTAIS") agrupa `Result` con `NodeDef`, `EdgeDef`,
  `TreeDef`. Pero **só `Result` é primitivo xenérico**; os outros son
  específicos do dominio.
- Decisión orixinal foi **mimética da estrutura do spec**, sen análise
  do acoplamento entre paquetes. Era razoable nese momento (core era o
  único consumidor); agora con storage chega o momento de revisar.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `Result` en `@yggdrasil-forge/common`, manter
`@yggdrasil-forge/core/types/result.ts` como re-export para cero
ruptura dos 7 ficheiros que xa importan Result, e dejar a porta aberta
a que paquetes futuros (storage, validators, etc.) importen `Result`
directamente desde `common` sen acoplarse a `core`.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Result vai a common (movemento físico)

`packages/common/src/result.ts` será o ficheiro **canónico** de Result.
Contén exactamente o mesmo contido que o actual `core/types/result.ts`
(80 liñas), incluído o import de `YggdrasilError` (xa local a common,
agora será import relativo en vez de `@yggdrasil-forge/common`).

### 5.2 — Core mantén re-export (cero ruptura)

`packages/core/src/types/result.ts` **NON se elimina**. Convérteo nun
**re-export puro** desde common:

```ts
// ── INICIO: 3.0 — re-export desde @yggdrasil-forge/common ──
// Result foi movido a common como primitivo xenérico compartido
// (sub-fase 3.0). Este re-export mantense por compatibilidade cos
// imports existentes en core (`../types/result.js`, `../types/index.js`).
// Novos paquetes deben importar directamente desde
// '@yggdrasil-forge/common'.
//
// Decisión documentada en MASTER §A.6 lección 3.0 L1.
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from '@yggdrasil-forge/common'
// ── FIN: 3.0 ──
```

Razóns:
- **Cero modificación dos 6 ficheiros de `core/src/`** que importan
  `Result` desde `'../types/index.js'` ou `'../types/result.js'`. O
  import segue funcionando porque `types/index.js` re-exporta de
  `types/result.js`, que á súa vez re-exporta de common.
- **Cero modificación do test que importa Result**.
- **Cero modificación de `types/index.js`** (a re-exportación segue
  intacta).

### 5.3 — Common exporta Result publicamente

Engadir ao final de `packages/common/src/index.ts`:

```ts
// Result type (movido desde core en 3.0)
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from './result.js'
```

### 5.4 — Tests novos en common

Crear `packages/common/__tests__/result.test.ts` cos tests do Result.
**Mínimo 12 tests**:
- `ok(value)` devolve `{ ok: true, value }`.
- `err(error)` devolve `{ ok: false, error }`.
- `isOk` discrimina correctamente (positivo + negativo).
- `isErr` discrimina correctamente (positivo + negativo).
- `unwrap` devolve valor cando ok.
- `unwrap` lanza error cando err.
- `unwrapOr` devolve valor cando ok.
- `unwrapOr` devolve fallback cando err.
- Type narrowing via `isOk` funciona (test de tipo via type-test ou
  asserción).
- Test integración: `Result<T, YggdrasilError>` funciona cun
  `YggdrasilError` real.

**Patrón a seguir**: mira `packages/common/__tests__/errors.test.ts` ou
`constants.test.ts` para estilo. Estes tests **existen** no paquete
common e definen o estilo.

### 5.5 — Cero novos tests en core

Os tests existentes en `core` xa cubren Result indirectamente (cada
chamada a `.ok` ou `.value` ou `.error` é un test implícito). **Cero
tests novos en core**. **Cero modificación de tests existentes en
core**.

### 5.6 — Eliminar `YggdrasilError` import path nun lugar

O actual `core/types/result.ts` importa `YggdrasilError` desde
`'@yggdrasil-forge/common'`. Cando se mova a common, **o import pasa
a ser local**:

```ts
// Cambio: '@yggdrasil-forge/common' → './errors/index.js' (ou similar)
import type { YggdrasilError } from './errors/index.js'
```

Verifica en T0 o path exacto do import relativo a YggdrasilError dentro
de common (probablemente `./errors/index.js` ou `./errors/YggdrasilError.js`).

### 5.7 — Cero ErrorCode novo

Toda a infraestrutura xa existe. **Cero edicións en common/errors/**.

### 5.8 — Cero modificación de types existentes en core

Non se modifica `core/src/types/node.ts`, `tree.ts`, `edge.ts`, etc.
**Só `core/src/types/result.ts`** (que pasa a ser re-export).

Confirmar con `git diff --stat` antes do commit.

### 5.9 — Configuración do paquete

`packages/common/package.json` xa expón a API pública via
`./dist/index.js`. **Cero cambios en package.json**: Result accédese
naturalmente vía o mesmo entry point.

`packages/core/package.json` xa ten `@yggdrasil-forge/common` como
dependencia (verifica en T0). **Cero cambios en deps**.

### 5.10 — Actualización do MASTER

Esta sub-fase **NON modifica MASTER**. As actualizacións ao MASTER
(lección 3.0 L1 sobre acoplamento de tipos primitivos vs dominio)
faraas o director nun ciclo de hixiene posterior.

### 5.11 — Cobertura

Engadir Result a common **aumenta os ficheiros source** (de 5 a 6).
Os 12 tests novos cobren Result a 100%. **Cobertura global de common
non debe baixar** (estaba próxima a 100% probablemente). **Cobertura
global do monorepo non debe baixar de 98.18%** (baseline 2.6.fix2).

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:
- `packages/common/src/result.ts` — **NOVO**: contido exacto do antigo
  `core/types/result.ts`, con import de YggdrasilError adaptado a
  relativo.
- `packages/common/src/index.ts` — **MODIFICADO**: engadir export
  block para Result.
- `packages/core/src/types/result.ts` — **MODIFICADO**: contido pasa
  a ser re-export desde `@yggdrasil-forge/common`.

Tests:
- `packages/common/__tests__/result.test.ts` — **NOVO**: 12 tests
  segundo 5.4.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 896 tests `--force`.
2. **Verifica o path exacto** do import de YggdrasilError dentro de
   common: `grep -n "YggdrasilError" packages/common/src/errors/index.ts
   | head -3`. Reporta o nome do ficheiro do export.
3. **Confirma** que `packages/core/package.json` ten
   `@yggdrasil-forge/common` como dependencia:
   `grep "@yggdrasil-forge/common" packages/core/package.json`.
4. **Confirma** os 6 ficheiros de core/src que importan Result:
   `grep -rln "from '.*result" packages/core/src/ --include="*.ts" | head`.

### T1 — Crear `packages/common/src/result.ts` (5.1, 5.6)
Copia exacta do contido de `packages/core/src/types/result.ts` (80
liñas) adaptando o import:
- Antes: `import type { YggdrasilError } from '@yggdrasil-forge/common'`
- Despois: `import type { YggdrasilError } from './errors/index.js'`
  (ou path real verificado en T0.2).

Cero outros cambios.

Typecheck 20/20.

### T2 — Exportar desde common public API (5.3)
Engadir a `packages/common/src/index.ts` o bloque de exports do Result.
Mantén o estilo de comentarios das outras seccións.

Typecheck 20/20.

### T3 — Tests do Result en common (5.4)
Crear `packages/common/__tests__/result.test.ts` cos 12+ tests.
Importa **desde o paquete público**:
```ts
import { ok, err, isOk, isErr, unwrap, unwrapOr, type Result } from '../src/index.js'
```

Tests pasan: 12+ novos en common.

### T4 — Refactor core/types/result.ts a re-export (5.2)
Substituír o contido (80 liñas) polo re-export (10 liñas
aproximadamente):

```ts
// ── INICIO: 3.0 — re-export desde @yggdrasil-forge/common ──
// Result foi movido a common como primitivo xenérico compartido
// (sub-fase 3.0). Este re-export mantense por compatibilidade.
// Novos paquetes deben importar directamente desde
// '@yggdrasil-forge/common'.
export {
  type Result,
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
} from '@yggdrasil-forge/common'
// ── FIN: 3.0 ──
```

### T5 — Verificación de cero ruptura
**Crítico**:
```bash
pnpm typecheck    # 20/20
pnpm turbo run test --filter=@yggdrasil-forge/core --force    # 896 + tests previos
pnpm turbo run test --filter=@yggdrasil-forge/common --force  # tests previos + 12 novos
```

Os 896 tests previos do core **deben seguir pasando todos**. Se algún
rompe, **escala (0.6)** — probablemente significa que o re-export ten
algún problema sutil (ex: o tipo non se propaga correctamente).

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/common run test:coverage`.
`pnpm --filter @yggdrasil-forge/core run test:coverage`.
- `result.ts` en common: 100%.
- Global do monorepo: ≥ 98.18% (baseline 2.6.fix2).

### T7 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
pnpm --filter @yggdrasil-forge/common run test:coverage
pnpm --filter @yggdrasil-forge/core run test:coverage
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/common/src/ packages/core/src/
pnpm test
```
LITERAL. LITERAL.

- Changeset: **patch** para `@yggdrasil-forge/common` (engade
  exportación pública nova; non breaking porque é só engadido).
  **patch** para `@yggdrasil-forge/core` (refactor interno; comportamento
  observable idéntico).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Changed
  - `Result<T, E>` type e helpers (`ok`, `err`, `isOk`, `isErr`,
    `unwrap`, `unwrapOr`) movidos de `@yggdrasil-forge/core/types/`
    a `@yggdrasil-forge/common` como primitivo xenérico compartido.
    `@yggdrasil-forge/core/types/result.js` mantén re-export para
    cero ruptura dos imports existentes en core. Sub-fase preparatoria
    para Fase 3 (StorageAdapter en `@yggdrasil-forge/storage` agora pode
    importar Result sen depender de core).
  ```

### T8 — Commit + push
Commit Conventional:
`refactor(common): move Result type from core (sub-phase 3.0)`.
Push directo a `origin/main` (base `f14e5c7`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/common/src/result.ts` (NOVO)
- `packages/common/src/index.ts` (MODIFICADO)
- `packages/common/__tests__/result.test.ts` (NOVO)
- `packages/core/src/types/result.ts` (MODIFICADO: agora é re-export)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/src/errors/`,
`packages/common/src/locales.ts`, `packages/common/src/i18n.ts`,
`packages/common/src/constants.ts`, `packages/core/src/types/index.ts`,
`packages/core/src/types/` (calquera outro que non sexa result.ts),
`packages/core/src/engine/` (ningún ficheiro), `packages/core/__tests__/`,
`packages/common/package.json`, `packages/core/package.json`,
`pnpm-lock.yaml`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

---

## 9. QUE NON FACER

- ❌ Eliminar `packages/core/src/types/result.ts` (5.2: ten que seguir
  existindo como re-export).
- ❌ Modificar **ningún dos 6 ficheiros de core/src** que importan
  Result (5.2: cero ruptura).
- ❌ Modificar tests existentes en core (5.5).
- ❌ Modificar `types/index.ts` de core (segue re-exportando de
  result.ts, que segue re-exportando de common; cadea transparente).
- ❌ Engadir Result a outros paquetes (3.1 fará iso en storage).
- ❌ Engadir ErrorCodes (5.7: a infra xa existe).
- ❌ Modificar `package.json` de common ou core (5.9).
- ❌ Modificar MASTER (5.10: faino o director).
- ❌ Refactorizar pezas non listadas ("xa que toco...").
- ❌ Modificar o CHANGELOG existente.
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.0 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base f14e5c7)
✅ Result movido a @yggdrasil-forge/common
✅ core/types/result.ts agora re-export (cero ruptura dos 6 ficheiros)
✅ Cero modificación dos tests existentes (896 seguen pasando)
✅ T0 path YggdrasilError en common: <path verificado>
✅ T0 core/package.json común dep: <confirmado>
✅ T0 ficheiros core/src que importan Result: <6 confirmados>
✅ Tests: <N> pasan en monorepo (<delta> novos en common)
✅ Cobertura: global <X%> / common.result <Y%>
   (baselines: 98.18% global; result.ts 100%)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: ningunha nova. Novos paquetes (storage,
   validators, etc.) poden importar Result desde common sen depender
   de core.
✅ Changeset patch (common + core) + nova [Unreleased] con Changed
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.1 (StorageAdapter interface).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.0. Refactor preparatorio, cero ruptura. ~80 liñas
movidas + 10 liñas de re-export + 12 tests novos. Calquera caso non
cuberto → ESCALAR.*
