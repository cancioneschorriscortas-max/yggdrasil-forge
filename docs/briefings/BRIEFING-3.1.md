# BRIEFING — SUB-FASE 3.1 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase declarativa pequena.** Crear a interface `StorageAdapter`
> en `@yggdrasil-forge/storage` segundo MASTER §21. Cero implementación
> concreta (esa vén en 3.2-3.4). Cero migracións (3.5).

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
- Pushed: `═══ SUB-FASE 3.1 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.1 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.1** de Yggdrasil Forge. **Primeira sub-fase real de Fase 3
(Persistencia + Migracións).** Tipo: **interface declarativa** —
definir o contrato `StorageAdapter` que terán todas as implementacións
concretas (`MemoryStorage`, `LocalStorageAdapter`, `IndexedDBAdapter`,
etc.) en sub-fases 3.2-3.4.

---

## 2. CONTEXTO MÍNIMO

Tras 3.0, `@yggdrasil-forge/common` exporta `Result<T>`, `ok`, `err`,
etc. Iso permite que `@yggdrasil-forge/storage` defina a interface
`StorageAdapter` (cuxos métodos devolven `Promise<Result<T>>`) sen
depender de `@yggdrasil-forge/core`.

Esta sub-fase **só define a interface + tipos auxiliares**. Cero
implementación. Cero backend (MemoryStorage etc. faranse en 3.2).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `de16c01` (refactor Result a common).
- 956 tests pasan no monorepo (896 core + 17 common novos + outros).
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`@yggdrasil-forge/common` xa exporta `Result`, `ok`, `err`, `isOk`,
  `isErr`, `unwrap`, `unwrapOr`** desde `index.ts`.
- **`packages/storage/`** existe pero é **scaffold baleiro**:
  - `src/index.ts`: 9 liñas, só `export const VERSION = '0.0.0'`.
  - `__tests__/smoke.test.ts`: 1 test que verifica VERSION.
  - `package.json`: **NON ten `@yggdrasil-forge/common` como
    dependencia** (engadirase en T1).
  - `tsconfig.json`: **NON ten `references` a common** (engadirase en T1).
- **ErrorCodes xa existen** en common (E055-057):
  - `STORAGE_READ_FAILED = YGG_S001`
  - `STORAGE_WRITE_FAILED = YGG_S002`
  - `STORAGE_QUOTA_EXCEEDED = YGG_S003`
  - Mensaxes nas tres locales (gl/es/en) **xa están**.
- **MASTER §21 especifica a interface** (liñas 1616-1623):
  ```typescript
  interface StorageAdapter {
    get(key: string): Promise<Result<unknown | null>>
    set(key: string, value: unknown): Promise<Result<void>>
    delete(key: string): Promise<Result<void>>
    list(prefix?: string): Promise<Result<string[]>>
    clear(): Promise<Result<void>>
    watch?(key: string, callback: (value: unknown) => void): () => void
  }
  ```

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/storage/src/StorageAdapter.ts` co interface
`StorageAdapter` segundo MASTER §21, exportar publicamente desde
`packages/storage/src/index.ts`, configurar a dependencia `common` no
package.json e tsconfig.json, e engadir tests de tipo + smoke
implementando un `MockStorage` mínimo nos tests.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Interface exacta segundo MASTER §21

**Cero desviación da especificación.** Cero "melloras" ou "extensións".
Se durante T1 detectas algo que parece deber estar pero non está,
**escala (0.6)** — non improvises.

Asinaturas exactas:

```ts
import type { Result } from '@yggdrasil-forge/common'

/**
 * Interface uniforme para backends de almacenamento de Yggdrasil Forge.
 *
 * Cada implementación (MemoryStorage, LocalStorageAdapter,
 * IndexedDBAdapter, etc.) cumpre este contrato. Os métodos devolven
 * `Result<T>` para forzar o manexo explícito de erros (lectura/escritura
 * fallida, cota excedida, claves non válidas).
 *
 * Implementacións concretas vén nas sub-fases 3.2-3.4. Esta sub-fase
 * só define o contrato.
 */
export interface StorageAdapter {
  /**
   * Obtén o valor asociado a unha clave. Devolve `null` se non existe.
   * Erros posibles: STORAGE_READ_FAILED.
   */
  get(key: string): Promise<Result<unknown | null>>

  /**
   * Garda un valor para unha clave. Sobreescribe se xa existe.
   * Erros posibles: STORAGE_WRITE_FAILED, STORAGE_QUOTA_EXCEEDED.
   */
  set(key: string, value: unknown): Promise<Result<void>>

  /**
   * Elimina o valor asociado a unha clave. Cero erro se non existe.
   * Erros posibles: STORAGE_WRITE_FAILED.
   */
  delete(key: string): Promise<Result<void>>

  /**
   * Lista as claves que comezan por `prefix` (ou todas se non se pasa).
   * Erros posibles: STORAGE_READ_FAILED.
   */
  list(prefix?: string): Promise<Result<string[]>>

  /**
   * Elimina TODAS as claves do storage. Operación destrutiva.
   * Erros posibles: STORAGE_WRITE_FAILED.
   */
  clear(): Promise<Result<void>>

  /**
   * (Opcional) Observa cambios nunha clave. Devolve función de
   * desubscrición. Backends que non soporten observación non implementan
   * este método.
   */
  watch?(key: string, callback: (value: unknown) => void): () => void
}
```

### 5.2 — `watch` segue sendo opcional

Marca con `?` na declaración. Backends que non poidan observar
(`MemoryStorage` simple ou similar) non implementan o método. Backends
con capacidade real (IndexedDB con observadores, callbacks externos)
implementan.

**Cero `default no-op`** prescrito. Cada backend decide.

### 5.3 — Tipo `unknown` mantense

A interface acepta e devolve `unknown` (non `any`). Razón: o
StorageAdapter é xenérico — non sabe que tipo de dato persiste. Os
consumidores (engine, devtools, etc.) farán o `JSON.parse` ou
deserialización específica e validarán o tipo.

**Cero genéricos `<T>`** na interface. Razón: complicaría a interface
sen valor (cada chamada decide o seu tipo via narrowing externo).

### 5.4 — Estrutura de ficheiros

```
packages/storage/src/
├── StorageAdapter.ts    ← NOVO: a interface
└── index.ts             ← MODIFICADO: re-exporta StorageAdapter
```

Cero outros ficheiros (cero subdirectorios `backends/`, `adapters/`,
etc. — iso é prematuro porque a primeira impl vén en 3.2).

### 5.5 — Tests

Crear `packages/storage/__tests__/StorageAdapter.test.ts`. Os tests
verifican que a interface **pode implementarse correctamente** (smoke +
type tests) usando un `MockStorage` privado no propio test:

```ts
import { describe, expect, it } from 'vitest'
import { ok, err, type Result } from '@yggdrasil-forge/common'
import { ErrorCode, YggdrasilError } from '@yggdrasil-forge/common'
import type { StorageAdapter } from '../src/StorageAdapter.js'

// Mock interno para validar a forma da interface.
class MockStorage implements StorageAdapter {
  private data = new Map<string, unknown>()

  async get(key: string): Promise<Result<unknown | null>> {
    return ok(this.data.get(key) ?? null)
  }

  async set(key: string, value: unknown): Promise<Result<void>> {
    this.data.set(key, value)
    return ok(undefined)
  }

  // ... etc
}

describe('StorageAdapter interface', () => {
  it('can be implemented', () => { /* type check */ })
  it('get returns null for missing key', async () => { ... })
  // ... etc
})
```

**Mínimo 8 tests**:
1. `MockStorage` implementa StorageAdapter (compilation = test).
2. `get` con clave inexistente devolve `ok(null)`.
3. `get` con clave existente devolve `ok(value)`.
4. `set` garda e `get` recupera.
5. `delete` elimina e `get` posterior devolve `ok(null)`.
6. `delete` con clave inexistente non lanza (devolve `ok(undefined)`).
7. `list()` sen prefix devolve todas as claves.
8. `list(prefix)` filtra correctamente.
9. `clear()` elimina todo.
10. `watch?` é opcional (MockStorage sen `watch` segue cumprindo
    interface) — test de tipo via `satisfies` ou similar.
11. Cando `get` devolve `err`, o caller pode discriminar con `result.ok`.
12. Cando `set` devolve `err` por quota, o `originalErrorCode` é
    `STORAGE_QUOTA_EXCEEDED` (test de propagación).

**Importante**: os tests **non son tests de MockStorage** (iso non
importa); **son tests da forma do contrato**. MockStorage é só vehículo
para verificar que o contrato é implementable e ergonómico.

### 5.6 — Configuración de dependencias (T1)

**`packages/storage/package.json`** debe engadir:

```json
{
  "dependencies": {
    "@yggdrasil-forge/common": "workspace:*"
  }
}
```

**`packages/storage/tsconfig.json`** debe engadir:

```json
{
  "references": [{ "path": "../common" }]
}
```

Patrón idéntico ao de `core/tsconfig.json` (verificado polo director).

### 5.7 — VERSION mantense

`export const VERSION = '0.0.0'` mantense no `index.ts`. **Non subir
a 0.0.1 nin similar nesta sub-fase**. As versións xestiónaas
changesets.

### 5.8 — Cero ErrorCodes novos

Os 3 ErrorCodes de storage xa existen en common (E055-057). **Cero
edicións** en `packages/common/`. **Cero modificación** de mensaxes.

### 5.9 — Cero modificación de `core` ou outros paquetes

`packages/core` non se toca. Ningún outro paquete tampouco.
**Estritamente** isto vale para esta sub-fase.

### 5.10 — Cobertura

`StorageAdapter.ts` é só tipos (interface + JSDoc). **Non aporta
liñas executables**. A cobertura "do ficheiro" non é medible — só hai
type info. Os tests cobren MockStorage (interno ao test, non se mide).

**Global do monorepo**: non debe baixar de 98.18% (baseline 2.6.fix2).
Se baixa, **escala** — pode ser que algo da configuración cambiase.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:
- `packages/storage/src/StorageAdapter.ts` — **NOVO**: a interface.
- `packages/storage/src/index.ts` — **MODIFICADO**: re-exporta
  `StorageAdapter`.
- `packages/storage/package.json` — **MODIFICADO**: engade dep
  `@yggdrasil-forge/common`.
- `packages/storage/tsconfig.json` — **MODIFICADO**: engade reference
  a common.
- `packages/storage/__tests__/StorageAdapter.test.ts` — **NOVO**: 10+
  tests.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 956 tests `--force`.
2. **Verifica** que common exporta Result publicamente:
   `grep "Result\|ok\|err" packages/common/src/index.ts`. Espera ver
   o bloque "Result type (movido desde core en 3.0)".
3. **Verifica** o estado dos 3 ErrorCodes de storage:
   `grep "STORAGE_" packages/common/src/errors/codes.ts`. Espera 3.
4. **Confirma** patrón actual de `package.json` e `tsconfig.json` de
   `storage`: **ningunha dep a common, ningunha reference**.

### T1 — Configurar deps + references (5.6)
1. Editar `packages/storage/package.json`: engadir bloque
   `dependencies: { "@yggdrasil-forge/common": "workspace:*" }` antes
   de `devDependencies`.
2. Editar `packages/storage/tsconfig.json`: engadir
   `"references": [{ "path": "../common" }]` despois de `exclude`.
3. `pnpm install` para rexenerar symlinks de workspace.
4. Typecheck 20/20.

### T2 — Crear StorageAdapter.ts (5.1, 5.2, 5.3)
Crear `packages/storage/src/StorageAdapter.ts` co contido segundo 5.1
+ JSDoc completo en cada método. Cero desviación.

Typecheck 20/20.

### T3 — Re-exportar desde index.ts (5.4)
Modificar `packages/storage/src/index.ts`:

```ts
// ── INICIO: @yggdrasil-forge/storage ──
// Storage backends for Yggdrasil Forge.
// 3.1 — interface StorageAdapter. Implementacións concretas en 3.2-3.4.

export type { StorageAdapter } from './StorageAdapter.js'

/**
 * Versión actual do paquete.
 */
export const VERSION = '0.0.0'
// ── FIN: @yggdrasil-forge/storage ──
```

### T4 — Tests da interface (5.5)
Crear `packages/storage/__tests__/StorageAdapter.test.ts` cos 10+
tests segundo 5.5. MockStorage privado dentro do test.

**Importante**: actualizar `smoke.test.ts`:
- Antes: só verifica VERSION.
- Despois: pode quedar como está, ou eliminarse se os novos tests
  cubren máis. **Decisión do executor**: se o smoke parece redundante
  trala creación dos novos tests, elimínao; se non, déixalo.
  Documentar no reporte.

Tests pasan: 10+ novos en storage.

### T5 — Verificación post-T4
- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/storage --force` pasa.
- 896 tests core seguen pasando intactos.
- 17 tests common seguen pasando intactos.

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/storage run test:coverage`. Global do
monorepo non debe baixar de 98.18%.

### T7 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/storage/src/
pnpm test
```
LITERAL.

**Nota sobre `unknown`**: a interface usa `unknown` como tipo de valor
(decisión 5.3 deliberada). **Iso non é placeholder**, é o tipo correcto.
Documenta no grep do reporte que as ocorrencias de `unknown` en
`StorageAdapter.ts` son intencionais (parte do contrato).

- Changeset **patch** para `@yggdrasil-forge/storage`. Indica que se
  engade dep nova `@yggdrasil-forge/common` (informativo).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - Interface `StorageAdapter` exportada desde `@yggdrasil-forge/storage`
    segundo MASTER §21. Define o contrato uniforme para backends de
    almacenamento: `get`, `set`, `delete`, `list`, `clear`, `watch?`.
    Cada método devolve `Promise<Result<T>>` para manexo explícito de
    erros. Implementacións concretas (MemoryStorage, LocalStorage, etc.)
    vén en sub-fases 3.2-3.4.
  - Dependencia nova: `@yggdrasil-forge/storage` agora depende de
    `@yggdrasil-forge/common` (workspace:*) para importar `Result`.
  ```

### T8 — Commit + push
Commit Conventional:
`feat(storage): add StorageAdapter interface (sub-phase 3.1)`.
Push directo a `origin/main` (base `de16c01`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/storage/src/StorageAdapter.ts` (NOVO)
- `packages/storage/src/index.ts` (MODIFICADO)
- `packages/storage/package.json` (MODIFICADO: +1 dep)
- `packages/storage/tsconfig.json` (MODIFICADO: +1 reference)
- `packages/storage/__tests__/StorageAdapter.test.ts` (NOVO)
- `packages/storage/__tests__/smoke.test.ts` (posiblemente
  MODIFICADO/ELIMINADO — decisión 5.5/T4)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)
- **Posiblemente** `pnpm-lock.yaml` (modificado polo `pnpm install`
  do T1 que engade o symlink workspace).

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/`, `packages/i18n/`, ningún outro paquete,
`turbo.json`, `tsconfig.base.json`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**Cero `any`**, pero `unknown` é correcto e esperado na interface
StorageAdapter (decisión 5.3).

---

## 9. QUE NON FACER

- ❌ Implementar `MemoryStorage` ou calquera backend concreto (5.1: iso
  é 3.2).
- ❌ Engadir migracións ou versioning de schema (iso é 3.5).
- ❌ Engadir métodos á interface non especificados no MASTER §21 (5.1).
- ❌ Cambiar `unknown` por genéricos `<T>` (5.3).
- ❌ Implementar un `default no-op` para `watch` (5.2).
- ❌ Crear subdirectorios `backends/` ou `adapters/` (5.4).
- ❌ Engadir ErrorCodes (5.8).
- ❌ Modificar `core`, `common`, ou calquera outro paquete (5.9).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente.
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.1 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base de16c01)
✅ Interface StorageAdapter creada en @yggdrasil-forge/storage
✅ Métodos: get, set, delete, list, clear, watch? (segundo MASTER §21)
✅ Dependencia engadida: @yggdrasil-forge/common (workspace:*)
✅ tsconfig.json: reference a ../common engadida
✅ MockStorage no test verifica que o contrato é implementable
✅ Cero implementación concreta (MemoryStorage etc. en 3.2)
✅ Cero ErrorCode novo (E055-057 reutilizables)
✅ T0 common exporta Result: <confirmado>
✅ T0 ErrorCodes existentes: 3 (E055-057)
✅ Tests: <N> pasan en storage (<delta> novos)
✅ Cobertura: global <X%> (baseline 2.6.fix2: 98.18%)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
   (Nota: 'unknown' en StorageAdapter.ts é tipo correcto da interface, 5.3)
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións coñecidas: ningunha nova. Backends concretos en 3.2-3.4.
✅ Changeset patch (storage) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.2 (MemoryStorage + LocalStorageAdapter).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.1. Interface declarativa, dep + reference engadidas,
10+ tests de contrato. Calquera caso non cuberto → ESCALAR.*
