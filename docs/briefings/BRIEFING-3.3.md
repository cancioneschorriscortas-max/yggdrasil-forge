# BRIEFING — SUB-FASE 3.3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase mediana de implementación complexa.** Crear
> `IndexedDBAdapter`, terceira implementación concreta de
> `StorageAdapter`. Wrapper sobre IndexedDB nativo con inversión de
> control via `IDBFactory` inxectado. Tests con `fake-indexeddb`.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Toda a decisión
arquitectónica está pre-resolta (sec 5). Calquera comportamento
inesperado de `fake-indexeddb` en edge cases → ESCALAR antes de
adaptar o test.**

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.3** de Yggdrasil Forge. **Terceira implementación
concreta de `StorageAdapter`.** Tipo: **adapter sobre IndexedDB
nativo** — implementar `IndexedDBAdapter` que envolve un `IDBFactory`
(típicamente `globalThis.indexedDB`) cumprindo a interface
`StorageAdapter` de 3.1. Persistencia real con capacidade superior a
localStorage (≥50MB típico) e soporte para valores arbitrarios via
structured clone (Date, Map, Set, ArrayBuffer aceptados nativamente).

---

## 2. CONTEXTO MÍNIMO

Tras 3.2.b (LocalStorageAdapter), o terceiro backend é
`IndexedDBAdapter`. Comparado con LocalStorage, IndexedDB é máis
complexo:

1. **API request-based async**: usa `IDBRequest` con
   `onsuccess`/`onerror`, non Promises directamente. Helper privado
   `promisifyRequest` para envolver.
2. **Versions e schema**: nesta sub-fase, **version=1 fixa**, un só
   object store `'storage'`. Migracións de schema → sub-fase 3.5.
3. **Apertura asíncrona**: o constructor non pode abrir a BD (é sync);
   ábrese **lazy** na primeira operación.
4. **Structured clone nativo**: IndexedDB acepta valores arbitrarios
   sen serialización manual (Date, Map, Set, ArrayBuffer, etc.).
   Rexeita funcións/símbolos como estándar de structured clone.

**Decisión arquitectónica grande: usar `fake-indexeddb` nos tests**.
Documentada e xustificada en §5.12.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `f0df31d` (hixiene MASTER post-3.2.b).
- 72 tests pasan en storage (13 da 3.1 + 22 MemoryStorage + 36
  LocalStorageAdapter + 1 smoke); cobertura paquete 100/98.18/100/100.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`StorageAdapter` interface dispoñible** con 6 métodos (get, set,
  delete, list, clear, watch?).
- **`Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`, `Locale`,
  `getErrorMessage`** dispoñibles desde `@yggdrasil-forge/common`.
- **ErrorCodes existentes** (reutilizables):
  - `STORAGE_READ_FAILED = YGG_S001`
  - `STORAGE_WRITE_FAILED = YGG_S002`
  - `STORAGE_QUOTA_EXCEEDED = YGG_S003`
- **Patrón de erro real verificado en LocalStorageAdapter** (a
  replicar):
  ```ts
  private makeError(code: ErrorCode, context: Record<string, unknown>): YggdrasilError {
    const message = getErrorMessage(code, this.locale, context)
    return new YggdrasilError(code, message, { context })
  }
  ```
  **NON usar `makeError` exportado de common** (non existe; é método
  privado en cada adapter).
- **`packages/storage/package.json`** ten `@yggdrasil-forge/common` como
  dep workspace (engadida en 3.1) + script `test:coverage` (engadido
  en 3.2.b).
- **Catalog do workspace** (`pnpm-workspace.yaml`) ten: `tsup ^8.3.0`,
  `vitest ^4.1.0`, `@vitest/coverage-v8 ^4.1.0`, `typescript ^5.4.0`.
  **Engadirase `fake-indexeddb ^6.2.5`** en T1 (decisión §5.12).
- **engines: node >=22** garantido → `structuredClone` nativo →
  fake-indexeddb v6 sen polyfill adicional.
- **IndexedDB tipos dispoñibles en TS strict**: `IDBFactory`,
  `IDBDatabase`, `IDBObjectStore`, `IDBRequest`, `IDBOpenDBRequest`,
  `IDBTransaction`, `IDBVersionChangeEvent`, etc. **lib DOM xa
  habilitada** en tsconfig.base (confirmado en 3.2.b).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/storage/src/IndexedDBAdapter.ts` cunha clase
`IndexedDBAdapter` que envolve un `IDBFactory` inxectado (por defecto
`globalThis.indexedDB`), abre lazy unha BD con `version=1` e un único
object store `'storage'`, implementa get/set/delete/list/clear sen
`watch` segundo MASTER §21, propaga erros como
`Result<err>` con E055/056/057, exportala desde `index.ts`, engadir
`fake-indexeddb` como devDependency e cubrir con tests funcionais
completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Inversión de control: `IDBFactory` + `databaseName`

```ts
export interface IndexedDBAdapterOptions {
  /**
   * Nome da base de datos IndexedDB. **Obrigatorio**: a diferenza de
   * localStorage (singleton global), cada consumidor decide o seu
   * nome. Permite illar bases por estudante, sesión, etc.
   * (ex: 'oberon-{studentId}'). Cero default razoable.
   */
  readonly databaseName: string

  /**
   * Factory IndexedDB a usar. Por defecto `globalThis.indexedDB`.
   * Permite inxectar `fake-indexeddb` nos tests (cero jsdom necesario)
   * ou outros backends compatibles con IDBFactory en Node.
   */
  readonly factory?: IDBFactory

  /**
   * Locale para mensaxes de erro. Por defecto 'gl' (coherencia co
   * resto do motor; ver TreeDefValidator).
   */
  readonly locale?: Locale
}

export class IndexedDBAdapter implements StorageAdapter {
  private readonly databaseName: string
  private readonly factory: IDBFactory
  private readonly locale: Locale
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(options: IndexedDBAdapterOptions) {
    this.databaseName = options.databaseName
    this.factory = options.factory ?? globalThis.indexedDB
    this.locale = options.locale ?? 'gl'
  }
  // ...
}
```

**Importante**:
- `databaseName` obrigatorio (sen default; consumidor decide).
- `factory` opcional con default `globalThis.indexedDB` (que en Node
  puro **non existe**; require pasarse en tests sen fake-indexeddb
  global).
- `locale` default `'gl'` coherente con LocalStorageAdapter.

### 5.2 — Apertura lazy da BD

A BD ábrese **na primeira operación**, non no constructor (constructor
é sync; abrir é async). Cache `dbPromise` para non reabrir múltiples
veces:

```ts
private async getDb(): Promise<IDBDatabase> {
  if (this.dbPromise !== null) {
    return this.dbPromise
  }

  this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const openReq = this.factory.open(this.databaseName, 1)

    openReq.onupgradeneeded = () => {
      const db = openReq.result
      // Crear object store 'storage' se non existe.
      if (!db.objectStoreNames.contains('storage')) {
        db.createObjectStore('storage')
      }
    }

    openReq.onsuccess = () => resolve(openReq.result)
    openReq.onerror = () => reject(openReq.error)
    openReq.onblocked = () => reject(
      new Error('IndexedDB open blocked'),
    )
  })

  return this.dbPromise
}
```

**Razóns**:
- Constructor sync → erros de apertura non se poden propagar.
- Lazy → erros propagan como `err` na primeira operación, non como
  excepción inesperada.
- Cache → unha conexión por instancia.

**Importante**: se a apertura falla, o `dbPromise` queda con `reject`.
Operacións posteriores reciben o mesmo reject (await dunha promise
rejected). **Decisión: aceptar este comportamento**; o adapter é
inutilizable se non se pode abrir, non hai recuperación posible nesta
sub-fase. Documenta.

### 5.3 — Helper `promisifyRequest`

```ts
function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
```

Helper privado (función a nivel de módulo, fóra da clase). Aplica a
todas as operacións que usan IDBRequest individuais (`get`, `put`,
`delete`, `clear`, `count`, `getAllKeys`).

### 5.4 — Implementación de métodos

**get**:
```ts
async get(key: string): Promise<Result<unknown | null>> {
  let db: IDBDatabase
  try {
    db = await this.getDb()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, {
      key,
      reason: 'database open failed',
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }

  const tx = db.transaction('storage', 'readonly')
  const store = tx.objectStore('storage')

  try {
    const value = await promisifyRequest(store.get(key))
    return ok(value === undefined ? null : value)
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, {
      key,
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }
}
```

**Importante**: IndexedDB `get` devolve `undefined` para claves
inexistentes; **convértese a `null`** para coherencia con
`StorageAdapter` (que devolve `null` segundo a interface 3.1).

**set**:
```ts
async set(key: string, value: unknown): Promise<Result<void>> {
  let db: IDBDatabase
  try {
    db = await this.getDb()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, {
      key,
      reason: 'database open failed',
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }

  const tx = db.transaction('storage', 'readwrite')
  const store = tx.objectStore('storage')

  try {
    await promisifyRequest(store.put(value, key))
    return ok(undefined)
  } catch (e) {
    if (isQuotaExceededError(e)) {
      return err(this.makeError(EC.STORAGE_QUOTA_EXCEEDED, {
        key,
        originalErrorMessage: e instanceof Error ? e.message : String(e),
      }))
    }
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, {
      key,
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }
}
```

**Importante**:
- `store.put(value, key)` con keyPath externo (cero `keyPath` no
  createObjectStore = key explícita).
- Structured clone interno de IndexedDB rexeita funcións/símbolos →
  `DataCloneError` → mapéase a `STORAGE_WRITE_FAILED`.
- **Acepta `undefined` como valor** (asimetría coñecida con
  LocalStorageAdapter, que o rexeita; con MemoryStorage que o acepta
  como referencia). Documentar.

**delete**:
```ts
async delete(key: string): Promise<Result<void>> {
  let db: IDBDatabase
  try {
    db = await this.getDb()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }

  const tx = db.transaction('storage', 'readwrite')
  const store = tx.objectStore('storage')

  try {
    await promisifyRequest(store.delete(key))
    return ok(undefined)
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }
}
```

**clear**:
```ts
async clear(): Promise<Result<void>> {
  let db: IDBDatabase
  try {
    db = await this.getDb()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, {
      reason: 'database open failed',
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }

  const tx = db.transaction('storage', 'readwrite')
  const store = tx.objectStore('storage')

  try {
    await promisifyRequest(store.clear())
    return ok(undefined)
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }
}
```

**list**:
```ts
async list(prefix?: string): Promise<Result<string[]>> {
  let db: IDBDatabase
  try {
    db = await this.getDb()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, { ... }))
  }

  const tx = db.transaction('storage', 'readonly')
  const store = tx.objectStore('storage')

  try {
    const keys = await promisifyRequest(store.getAllKeys())
    // getAllKeys devolve IDBValidKey[]; filtrar a string[].
    const stringKeys = keys.filter(
      (k): k is string => typeof k === 'string',
    )
    if (prefix === undefined) {
      return ok(stringKeys)
    }
    return ok(stringKeys.filter(k => k.startsWith(prefix)))
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, { ... }))
  }
}
```

**Importante**: `getAllKeys` devolve `IDBValidKey[]` (pode ser number,
ArrayBuffer, etc., aínda que nós só gardamos strings). **Filtrar
defensivamente** a strings. Iso garante o contrato `Result<string[]>`
da interface.

### 5.5 — `watch` NON se implementa

Igual ca LocalStorageAdapter: IndexedDB non ten observador nativo
intra-database. Cero `watch` implementado. Documentar no JSDoc da
clase: "watch non se implementa; os consumidores que necesiten
observación deben combinar con MemoryStorage en patrón cache".

### 5.6 — Helper `isQuotaExceededError` (reutilizar patrón)

```ts
function isQuotaExceededError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  if (e.name === 'QuotaExceededError') return true
  if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  const code = (e as { code?: number }).code
  if (code === 22 || code === 1014) return true
  return false
}
```

**Patrón idéntico** ao de LocalStorageAdapter (§5.4 de 3.2.b).
**Decisión**: facelo función a nivel de módulo en
`IndexedDBAdapter.ts`. **Cero refactor** para extraer a un módulo
compartido — iso sería decisión arquitectónica nova. Anótase como
candidato a unha sub-fase de hardening futura se a duplicación
medra.

### 5.7 — `makeError` privado (patrón consistente)

Replica o patrón exacto de LocalStorageAdapter:

```ts
private makeError(
  code: ErrorCode,
  context: Record<string, unknown>,
): YggdrasilError {
  const message = getErrorMessage(code, this.locale, context)
  return new YggdrasilError(code, message, { context })
}
```

**Cero invención**: usa `getErrorMessage` + `new YggdrasilError`
directamente. **NON existe `makeError` global** (verificado polo
director).

### 5.8 — VersionError defensivo

Caso de borde: alguén abriu antes a mesma BD con version > 1
(hipotético tras 3.5). IndexedDB lanza `VersionError`. **Decisión do
director**: aceptar como `STORAGE_READ_FAILED` na apertura. Cero
recuperación; o consumidor é responsable da xestión de versions tras
3.5. Documentar.

Iso fai que o `.catch` no `openReq.onerror` cubra automáticamente
este caso. **Cero lóxica especial**.

### 5.9 — Cero ErrorCodes novos

E055/056/057 cobren todos os casos. **Cero edicións** en
`packages/common/`.

### 5.10 — Constructor con databaseName obrigatorio

```ts
// Permitido (require databaseName):
new IndexedDBAdapter({ databaseName: 'mi-app' })

// Recomendado en tests:
import { indexedDB } from 'fake-indexeddb'
new IndexedDBAdapter({
  databaseName: 'test-db',
  factory: indexedDB,
})

// Avanzado:
new IndexedDBAdapter({
  databaseName: 'mi-app',
  factory: customFactory,
  locale: 'es',
})
```

A diferenza de LocalStorageAdapter (todas as opcións opcionais),
**`databaseName` é obrigatorio**. Razón: cero default razoable.

### 5.11 — Exportación pública

Engadir a `packages/storage/src/index.ts`:

```ts
export { IndexedDBAdapter } from './IndexedDBAdapter.js'
export type { IndexedDBAdapterOptions } from './IndexedDBAdapter.js'
```

Despois dos exports existentes de StorageAdapter / MemoryStorage /
LocalStorageAdapter.

### 5.12 — TESTING CON `fake-indexeddb` (decisión arquitectónica grande)

**O autor confirmou esta decisión explícitamente** ao director. Aínda
así, o briefing documenta a xustificación para que o executor entenda
por que se desvía da filosofía "cero jsdom" de 3.2.b:

**Filosofía "cero jsdom" mantense, pero esta non é jsdom**:

- jsdom é unha implementación parcial de TODO o DOM (window, document,
  events, etc.). **Cero necesidade aquí**: o adapter só usa
  `IDBFactory`, non DOM.
- `fake-indexeddb` é unha implementación específica do estándar
  IndexedDB. Pure JS, in-memory, **cero DOM**. Funciona en Node puro.
- Implementala manualmente sería re-inventar centos de liñas dun
  estándar complexo (~30 clases, 100+ métodos, transactions, cursors,
  errors). Mock manual = alto risco de divergencia coa realidade do
  estándar.
- `fake-indexeddb` v6.2.5 é o estándar real do ecosistema:
  - Usada por Nuxt test-utils, Jest setupFiles, vitest discussions
    oficiais.
  - Comparada contra browsers reais nos Web Platform Tests
    (~40% edge-case coverage; mais que suficiente para uso típico).
  - Cero polyfill adicional con Node ≥22 (structuredClone nativo).

**Polo tanto**:
1. Engadir `fake-indexeddb: ^6.2.5` ao catalog do workspace.
2. Engadir como devDependency en `packages/storage/package.json` con
   `catalog:`.
3. Importar `indexedDB` (factory) nos tests:
   ```ts
   import { indexedDB } from 'fake-indexeddb'
   ```
4. Inxectalo en cada instancia de IndexedDBAdapter nos tests:
   ```ts
   const adapter = new IndexedDBAdapter({
     databaseName: 'test-' + crypto.randomUUID(),
     factory: indexedDB,
   })
   ```
5. **`databaseName` único por test** (uuid ou similar) para evitar
   estado compartido entre testes.

**Cero uso de `fake-indexeddb/auto`** (que inxecta no global).
**Inxección explícita** mantén a filosofía de IoC.

### 5.13 — Tests funcionais

Crear `packages/storage/__tests__/IndexedDBAdapter.test.ts`. **Mínimo
25 tests**.

**Estrutura básica do test**:
```ts
import { describe, expect, it } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import { IndexedDBAdapter } from '../src/IndexedDBAdapter.js'

function createAdapter(opts?: { locale?: 'gl' | 'es' | 'en' }) {
  return new IndexedDBAdapter({
    databaseName: 'test-' + crypto.randomUUID(),
    factory: indexedDB,
    ...(opts?.locale !== undefined && { locale: opts.locale }),
  })
}
```

**Tests obrigatorios**:

*Operacións básicas (paralelo a outros adapters):*
1. `get` con clave inexistente devolve `ok(null)`.
2. `set` + `get` recupera o valor.
3. `set` sobreescribe valor existente.
4. `delete` elimina; `get` posterior devolve `ok(null)`.
5. `delete` con clave inexistente non lanza (devolve `ok(undefined)`).

*list:*
6. `list()` sen prefix devolve todas as claves.
7. `list(prefix)` filtra correctamente.
8. `list()` en BD baleira devolve `ok([])`.

*clear:*
9. `clear` elimina todas as claves.
10. `clear` en BD baleira non lanza.

*Tipos diversos (vantaxe sobre LocalStorageAdapter):*
11. Acepta Date (IndexedDB structured clone nativo).
12. Acepta Map.
13. Acepta Set.
14. Acepta ArrayBuffer / Uint8Array.
15. Acepta `undefined` (asimetría con LocalStorageAdapter; coherente
    con MemoryStorage).
16. Acepta null.
17. Acepta NaN como número.

*Structured clone fallido:*
18. `set` cunha función directamente → err STORAGE_WRITE_FAILED
    (DataCloneError).
19. `set` cun símbolo → err STORAGE_WRITE_FAILED.

*Apertura asíncrona:*
20. Múltiples operacións consecutivas: a BD ábrese unha vez (test
    indirecto: mediante observación temporal ou conteo de
    `factory.open` chamadas se posible).
21. Operacións paralelas en mesma instancia non se rompen entre si.

*Inversión de control:*
22. `new IndexedDBAdapter({ databaseName, factory })` usa o factory
    inxectado.
23. Locale 'es' devolve mensaxe en español (test indirecto vía erro
    forzado).

*Isolamento entre instancias:*
24. Dúas instancias con `databaseName` diferentes son independentes.
25. Dúas instancias co MESMO `databaseName` ven os mesmos datos
    (verifica reapertura).

**Tests adicionais recomendados**:
- Test que dispara `DataCloneError` con obxecto que ten método.
- Test de comportamento tras erro de apertura (mock de factory que
  lanza).

### 5.14 — Cobertura

`IndexedDBAdapter.ts` debe alcanzar **100% en Stmts/Funcs/Lines**.
Branch ≥95% tolerable (algunhas ramas defensivas en erros raros
poden non exercerse, ex: `onblocked`). Por debaixo de 95%: escalar.

### 5.15 — Cero modificación de outros paquetes nin pezas

Só `packages/storage/`. Cero common, cero core, cero outras pezas
storage existentes (`StorageAdapter.ts`, `MemoryStorage.ts`,
`LocalStorageAdapter.ts`).

Tampouco engadir helpers compartidos extraendo `isQuotaExceededError`
de LocalStorageAdapter (§5.6: refactor futuro, non aquí).

### 5.16 — Actualizar pnpm-workspace.yaml + storage/package.json

**Único caso de modificación fóra de storage/src e tests**: catalog
do workspace e devDependencies do storage:

`pnpm-workspace.yaml`:
```yaml
catalog:
  tsup: ^8.3.0
  vitest: ^4.1.0
  '@vitest/coverage-v8': ^4.1.0
  typescript: ^5.4.0
  fake-indexeddb: ^6.2.5    # NOVO
```

`packages/storage/package.json` (`devDependencies`):
```json
"fake-indexeddb": "catalog:"
```

`pnpm install` actualizará `pnpm-lock.yaml`. **Espera diff aí**.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:
- `packages/storage/src/IndexedDBAdapter.ts` — **NOVO**.
- `packages/storage/src/index.ts` — **MODIFICADO**: +2 exports.
- `packages/storage/package.json` — **MODIFICADO**: +1 devDep.
- `pnpm-workspace.yaml` — **MODIFICADO**: +1 catalog entry.
- `pnpm-lock.yaml` — **MODIFICADO** (automático polo install).
- `packages/storage/__tests__/IndexedDBAdapter.test.ts` — **NOVO**.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 72 tests `--force` en storage.
2. **Verifica** patrón de erro real en LocalStorageAdapter para
   replicar exactamente: `grep -B1 -A5 "private makeError" packages/storage/src/LocalStorageAdapter.ts`.
3. **Confirma** que `Locale` exportado de common:
   `grep "Locale" packages/common/src/index.ts | head -3`.
4. **Confirma** que `getErrorMessage` exportado de common:
   `grep "getErrorMessage" packages/common/src/index.ts`.

### T1 — Catalog + devDependency (5.16)
1. Editar `pnpm-workspace.yaml`: engadir `fake-indexeddb: ^6.2.5` ao
   catalog (alinear con outros).
2. Editar `packages/storage/package.json`: engadir
   `"fake-indexeddb": "catalog:"` en `devDependencies`.
3. `pnpm install` para resolver. Verifica que `pnpm-lock.yaml`
   actualizouse e que `node_modules/fake-indexeddb` existe.

### T2 — Crear IndexedDBAdapter.ts (5.1-5.10)
- Estrutura: clase + `IndexedDBAdapterOptions` interface.
- Función a nivel de módulo `promisifyRequest`.
- Función a nivel de módulo `isQuotaExceededError`.
- Constructor sync, `getDb` privado lazy.
- Métodos públicos: get, set, delete, list, clear (cero watch).
- Método privado: `makeError`.
- JSDoc completo documentando asimetrías cos outros adapters.

Typecheck 20/20.

### T3 — Exportar (5.11)
Engadir os 2 exports a `src/index.ts`.

### T4 — Tests con fake-indexeddb (5.13)
Crear `__tests__/IndexedDBAdapter.test.ts` cos 25+ tests. Cada test
con `databaseName` único.

### T5 — Verificación post-T4
- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/storage --force` pasa.
- 72 tests previos seguen pasando intactos (StorageAdapter +
  MemoryStorage + LocalStorageAdapter + smoke).

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/storage run test:coverage`. Confirma
100% Stmts/Funcs/Lines, ≥95% Branch en `IndexedDBAdapter.ts`.

### T7 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/storage/src/
pnpm test
```
LITERAL.

**Nota sobre `unknown`**: o ficheiro vai conter `unknown` (parte do
contrato). **Cero placeholder**.

- Changeset **minor** para `@yggdrasil-forge/storage`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `IndexedDBAdapter` (en `@yggdrasil-forge/storage`): terceira
    implementación concreta de `StorageAdapter`. Wrapper sobre
    IndexedDB nativo con apertura lazy (constructor sync, BD ábrese
    na primeira operación). Soporta valores arbitrarios via structured
    clone nativo (Date, Map, Set, ArrayBuffer, undefined). Capacidade
    superior a localStorage (≥50MB típico). Cero `watch`
    (IndexedDB sen observador nativo intra-database). `databaseName`
    obrigatorio no constructor; `factory` opcional permite inxectar
    fake-indexeddb nos tests sen jsdom.
  - `IndexedDBAdapterOptions` interface exportada.
  - devDependency: `fake-indexeddb ^6.2.5` no catalog para tests.
  ```

### T8 — Commit + push
Commit Conventional:
`feat(storage): add IndexedDBAdapter with native structured clone (sub-phase 3.3)`.
Push directo a `origin/main` (base `f0df31d`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/storage/src/IndexedDBAdapter.ts` (NOVO)
- `packages/storage/src/index.ts` (MODIFICADO: +2 exports)
- `packages/storage/package.json` (MODIFICADO: +1 devDep)
- `pnpm-workspace.yaml` (MODIFICADO: +1 catalog entry)
- `pnpm-lock.yaml` (MODIFICADO: automático)
- `packages/storage/__tests__/IndexedDBAdapter.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/`, `packages/storage/src/StorageAdapter.ts`,
`packages/storage/src/MemoryStorage.ts`,
`packages/storage/src/LocalStorageAdapter.ts`,
`packages/storage/tsconfig.json`, `packages/storage/__tests__/` agás
o ficheiro novo.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown`** é tipo correcto na interface. **`IDBFactory`,
`IDBDatabase`** son interfaces DOM estándar (lib DOM activada en
tsconfig.base).

---

## 9. QUE NON FACER

- ❌ Usar `fake-indexeddb/auto` (que inxecta no global). Inxección
  explícita en cada test (5.12).
- ❌ Implementar `watch` (5.5: IndexedDB sen observador nativo).
- ❌ Implementar lóxica complexa de version > 1 ou onupgradeneeded
  con migracións (5.8: iso é 3.5).
- ❌ Modificar a interface StorageAdapter (5.15).
- ❌ Modificar MemoryStorage ou LocalStorageAdapter (5.15).
- ❌ Engadir ErrorCodes (5.9).
- ❌ Modificar `common` ou `core` (5.15).
- ❌ Extraer `isQuotaExceededError` a módulo compartido (5.6:
  duplicación aceptada nesta sub-fase).
- ❌ Engadir método `close()` ou outros non especificados.
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base f0df31d)
✅ IndexedDBAdapter implementa StorageAdapter sobre IDBFactory
✅ Apertura lazy da BD (constructor sync; abre en 1ª operación)
✅ version=1, único object store 'storage' (migracións en 3.5)
✅ Soporte structured clone nativo (Date, Map, Set, ArrayBuffer,
   undefined aceptados; funcións/símbolos rexeitados con
   STORAGE_WRITE_FAILED)
✅ QuotaExceededError multi-navegador → STORAGE_QUOTA_EXCEEDED
✅ Cero watch implementado (5.5: IndexedDB sen observador nativo)
✅ Cero ErrorCodes novos (E055-057 reutilizables)
✅ databaseName obrigatorio; factory + locale opcionais
✅ fake-indexeddb ^6.2.5 engadido ao catalog do workspace
✅ devDependency en storage/package.json con catalog:
✅ T0 patrón makeError de LocalStorageAdapter: <verificado>
✅ T0 getErrorMessage exportado de common: <confirmado>
✅ Tests: <N> pasan en storage (<delta> novos)
✅ Cobertura: IndexedDBAdapter Stmts/Funcs/Lines 100%, Branch <X%>
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Asimetrías documentadas:
   - vs MemoryStorage: ambos aceptan undefined; IndexedDB tamén
     acepta Date/Map/Set/ArrayBuffer (LocalStorage non).
   - vs LocalStorageAdapter: IndexedDB acepta undefined e tipos
     complexos; LocalStorageAdapter rexeita undefined e copia via
     JSON (perde identidade).
✅ Changeset minor (storage) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.4 (SessionStorageAdapter + FileSystemAdapter).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.3. Adapter sobre IndexedDB nativo, apertura lazy,
fake-indexeddb para tests. Calquera caso non cuberto → ESCALAR.*
