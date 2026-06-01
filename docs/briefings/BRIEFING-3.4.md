# BRIEFING — SUB-FASE 3.4 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase grande con dúas pezas heteroxéneas.** Crear
> `SessionStorageAdapter` (wrapper trivial sobre LocalStorageAdapter
> via composición) e `FileSystemAdapter` (OPFS, paralelo arquitectónico
> a IndexedDBAdapter). Quédanos 1 backend máis tras esta sub-fase para
> chegar a 100% do roadmap de backends.

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
inesperado de `opfs-mock` en edge cases → ESCALAR antes de adaptar o
test (lección 2.6.fix L1: bug latente cazado escala, non se arranxa).**

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.4 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.4 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.4** de Yggdrasil Forge. **Dúas pezas heteroxéneas
xuntas** (decisión do autor explícita, contra a lección 3.2 L1
"partir por complexidade"; xustificada porque SessionStorageAdapter é
wrapper trivial e non aporta valor partilo):

1. **`SessionStorageAdapter`**: wrapper trivial sobre
   `LocalStorageAdapter` via composición, cambiando o default de
   storage a `globalThis.sessionStorage`. ~50 liñas.
2. **`FileSystemAdapter`**: paralelo arquitectónico a
   `IndexedDBAdapter`, pero sobre OPFS (Origin Private File System) en
   vez de IndexedDB. ~280 liñas.

---

## 2. CONTEXTO MÍNIMO

Tras 3.3, temos tres backends concretos: MemoryStorage,
LocalStorageAdapter, IndexedDBAdapter. Esta sub-fase engade dous
máis. Tras 3.4 quedará pendente `Neo4jAdapter` no roadmap de backends
(non está nesta Fase; iría como sub-fase posterior se procede).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `1528fa8` (IndexedDBAdapter 3.3).
- 115 tests pasan en storage; cobertura paquete 100/97.02/100/100.
- 5 sub-fases consecutivas limpas (3.0, 3.1, 3.2.a, 3.2.b, 3.3); cero
  escalados na Fase 3.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`StorageAdapter` interface** dispoñible.
- **`MemoryStorage`, `LocalStorageAdapter`, `IndexedDBAdapter`**
  exportados.
- **`Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`, `Locale`,
  `getErrorMessage`** dispoñibles desde `@yggdrasil-forge/common`.
- **ErrorCodes existentes** reutilizables:
  - `STORAGE_READ_FAILED = YGG_S001`
  - `STORAGE_WRITE_FAILED = YGG_S002`
  - `STORAGE_QUOTA_EXCEEDED = YGG_S003`
- **Patrón de erro verificado en LocalStorageAdapter** e replicado en
  IndexedDBAdapter:
  ```ts
  private makeError(code: ErrorCode, context: Record<string, unknown>): YggdrasilError {
    const message = getErrorMessage(code, this.locale, context)
    return new YggdrasilError(code, message, { context })
  }
  ```
- **`packages/storage/package.json`** ten devDeps:
  - `tsup`, `vitest`, `@vitest/coverage-v8`, `typescript` (via catalog).
  - `fake-indexeddb: catalog:` (engadido en 3.3).
  - **Engadirase `opfs-mock`** en T1.
- **Catalog do workspace** ten `fake-indexeddb: ^6.2.5`.
  **Engadirase `opfs-mock`** en T1.
- **engines: node >=22** garantido → OPFS API e structured clone
  nativos.
- **OPFS tipos dispoñibles en TS strict**: `FileSystemDirectoryHandle`,
  `FileSystemFileHandle`, `FileSystemWritableFileStream`,
  `StorageManager`. **lib DOM xa habilitada** en tsconfig.base.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear dúas pezas en `packages/storage/src/`: (1) `SessionStorageAdapter`
como wrapper trivial sobre `LocalStorageAdapter` via composición; (2)
`FileSystemAdapter` que envolve OPFS (`navigator.storage.getDirectory()`)
cunha estrutura plana de ficheiros, exportalas desde `index.ts`,
engadir `opfs-mock` como devDependency e cubrir con tests funcionais
completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — SessionStorageAdapter via COMPOSICIÓN, non herdanza

**Decisión clave**: SessionStorageAdapter **NON estende
LocalStorageAdapter**, **compón con el**. Razóns:

1. **Cero modificación de LocalStorageAdapter**: herdanza requeriría
   cambiar `private` a `protected`, modificando peza estable.
2. **Arquitectónicamente máis limpo**: SessionStorageAdapter declara
   `implements StorageAdapter` directamente; o feito de ter un
   LocalStorageAdapter interno é detalle de implementación.
3. **Cero acoplamento de tipos**: se mañán LocalStorageAdapter cambia
   protected→private de novo, SessionStorageAdapter non rompe.
4. **Mantemento idéntico ao de herdanza**: calquera bug arranxado en
   LocalStorageAdapter beneficia automáticamente.

**Estrutura exacta**:

```ts
export interface SessionStorageAdapterOptions {
  /**
   * Backend Storage a usar. Por defecto `globalThis.sessionStorage`.
   * Permite inxectar mocks ou outros backends compatibles con Storage.
   */
  readonly storage?: Storage

  /**
   * Locale para mensaxes de erro. Por defecto 'gl'.
   */
  readonly locale?: Locale
}

/**
 * Adapter de sessionStorage. Wrapper sobre LocalStorageAdapter con
 * sessionStorage como default. A semántica é idéntica a localStorage
 * salvo na duración: sessionStorage pérdese ao pechar o tab/ventá.
 *
 * Internamente delega en LocalStorageAdapter para cero duplicación
 * de lóxica (serialización JSON, manexo de QuotaExceeded,
 * detección multi-navegador, etc.).
 */
export class SessionStorageAdapter implements StorageAdapter {
  private readonly inner: LocalStorageAdapter

  constructor(options: SessionStorageAdapterOptions = {}) {
    this.inner = new LocalStorageAdapter({
      storage: options.storage ?? globalThis.sessionStorage,
      ...(options.locale !== undefined && { locale: options.locale }),
    })
  }

  get(key: string): Promise<Result<unknown | null>> {
    return this.inner.get(key)
  }

  set(key: string, value: unknown): Promise<Result<void>> {
    return this.inner.set(key, value)
  }

  delete(key: string): Promise<Result<void>> {
    return this.inner.delete(key)
  }

  list(prefix?: string): Promise<Result<string[]>> {
    return this.inner.list(prefix)
  }

  clear(): Promise<Result<void>> {
    return this.inner.clear()
  }
}
```

**Cero `watch`** (LocalStorageAdapter tampouco o implementa).

**NON modificar LocalStorageAdapter para nada**.

### 5.2 — FileSystemAdapter usa OPFS, NON File System Access API

**Decisión arquitectónica grande pre-resolvida polo director**:

- **File System Access API** (`showOpenFilePicker`,
  `showSaveFilePicker`, `showDirectoryPicker`): **Chromium-only**
  (Chrome 86+, Edge 86+, Opera). NON Firefox NON Safari como de
  inicio 2026. **Inviable** para librería xeral.
- **OPFS (Origin Private File System)**: parte do mesmo File System
  API pero **soportado en TODOS os navegadores modernos** desde marzo
  2023 (Chrome, Edge, Firefox, Safari, Opera, Samsung Internet).
  "Baseline Widely available".

**Polo tanto FileSystemAdapter usa OPFS exclusivamente**, accesible
via `navigator.storage.getDirectory()`. Cero menú de selección de
ficheiros do usuario; cero permisos requeridos; persistencia por
orixe; sandbox seguro.

**Vantaxe pedagóxica**: o consumidor que importa FileSystemAdapter
obtén persistencia ficheiro-orientada **sen pop-ups nin diálogos**.

### 5.3 — Estrutura OPFS plana: un directorio raíz, ficheiros por key

**Decisión**: cero subdirectorios. Cada key mapéase a un só ficheiro
no directorio raíz que xestiona o adapter. Razóns:

1. **Coincide co contrato StorageAdapter**: keys son strings planas
   sen xerarquía aparente (`'user-data'`, `'tree-state'`, etc.).
2. **Cero codificación de path separators**: se permitimos `/` na
   key, complicámonos con creación de directorios. Decisión:
   **rexeitar keys con `/` ou `\\`** con `STORAGE_WRITE_FAILED`.
3. **`list()` é trivial**: iterar entries do directorio raíz.

**Conflito potencial con caracteres válidos en OPFS**: nomes de
ficheiro OPFS son strings calquera (cero restricións estritas como en
sistemas de ficheiros reais). Pero por seguridade, **rexeitamos
explicitamente `/` e `\\`** no constructor para previr ambiguidade.

### 5.4 — DirectoryName obrigatorio + factory opcional

```ts
export interface FileSystemAdapterOptions {
  /**
   * Nome do directorio OPFS no que se gardarán os ficheiros.
   * **Obrigatorio**: a diferenza de localStorage (singleton global),
   * cada consumidor decide o seu directorio. Permite illar entre
   * sub-aplicacións, sesións, estudantes, etc.
   * Cero default razoable.
   *
   * Restrición: o nome NON debe conter `/` nin `\\`.
   */
  readonly directoryName: string

  /**
   * StorageManager a usar. Por defecto `globalThis.navigator.storage`.
   * Permite inxectar `opfs-mock` nos tests sen DOM.
   */
  readonly storage?: StorageManager

  /**
   * Locale para mensaxes de erro. Por defecto 'gl'.
   */
  readonly locale?: Locale
}
```

**Importante**:
- `directoryName` obrigatorio.
- `storage` (StorageManager) opcional con default
  `globalThis.navigator?.storage` (que en Node puro é `undefined`).
- `locale` default `'gl'` coherente cos outros adapters.

**Inxección de control via StorageManager**: a peza non depende
directamente de `navigator`. Tests inxectan o `storageFactory()` de
opfs-mock.

### 5.5 — Apertura lazy do directorio (paralelo a IndexedDBAdapter)

O constructor é **sync**; obter o directorio raíz e crear o
subdirectorio do adapter é **async** (`getDirectory({ create: true })`).
Polo tanto **apertura lazy** na primeira operación:

```ts
private dirPromise: Promise<FileSystemDirectoryHandle> | null = null

private async getDirectory(): Promise<FileSystemDirectoryHandle> {
  if (this.dirPromise !== null) {
    return this.dirPromise
  }

  this.dirPromise = (async () => {
    const root = await this.storage.getDirectory()
    return root.getDirectoryHandle(this.directoryName, { create: true })
  })()

  return this.dirPromise
}
```

**Erros de apertura** propagan como `STORAGE_READ_FAILED` ou
`STORAGE_WRITE_FAILED` na primeira operación (segundo método).

### 5.6 — Serialización con JSON.stringify (paralelo a LocalStorageAdapter)

**Decisión consistente**: OPFS garda `File`/`Blob`, non `unknown`.
**Usamos JSON.stringify para gardar** e `JSON.parse` para ler.

Razóns:
1. **Consistencia con LocalStorageAdapter**: dous adapters serializan
   a string (un en localStorage, outro nun ficheiro OPFS).
2. **Cero dependencia de structured clone manual** (non existe como
   API pública).
3. **Tipos non serializables rexéitanse** igual ca en
   LocalStorageAdapter: `undefined`, `BigInt`, circular refs,
   funcións.

**Asimetría coñecida con IndexedDBAdapter**: FileSystemAdapter (igual
ca LocalStorageAdapter) **rexeita undefined / BigInt / circular refs /
funcións**. IndexedDBAdapter acéptaos via structured clone nativo.
Documentar no JSDoc da clase.

### 5.7 — Implementación de métodos

**get**:
```ts
async get(key: string): Promise<Result<unknown | null>> {
  this.validateKey(key, 'STORAGE_READ_FAILED')  // valida cero '/'

  let dir: FileSystemDirectoryHandle
  try {
    dir = await this.getDirectory()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, {
      key,
      reason: 'directory open failed',
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }

  let fileHandle: FileSystemFileHandle
  try {
    fileHandle = await dir.getFileHandle(key)
  } catch (e) {
    // NotFoundError → clave inexistente → ok(null).
    if (e instanceof DOMException && e.name === 'NotFoundError') {
      return ok(null)
    }
    return err(this.makeError(EC.STORAGE_READ_FAILED, { ... }))
  }

  try {
    const file = await fileHandle.getFile()
    const text = await file.text()
    return ok(JSON.parse(text))
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, {
      key,
      reason: 'JSON parse failed',
      originalErrorMessage: e instanceof Error ? e.message : String(e),
    }))
  }
}
```

**set**:
```ts
async set(key: string, value: unknown): Promise<Result<void>> {
  this.validateKey(key, 'STORAGE_WRITE_FAILED')

  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }

  // JSON.stringify(undefined) devolve `undefined`, non string.
  if (serialized === undefined) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, {
      key,
      reason: 'undefined is not serializable to JSON',
    }))
  }

  let dir: FileSystemDirectoryHandle
  try {
    dir = await this.getDirectory()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }

  try {
    const fileHandle = await dir.getFileHandle(key, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(serialized)
    await writable.close()
    return ok(undefined)
  } catch (e) {
    if (isQuotaExceededError(e)) {
      return err(this.makeError(EC.STORAGE_QUOTA_EXCEEDED, { ... }))
    }
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }
}
```

**delete**:
```ts
async delete(key: string): Promise<Result<void>> {
  this.validateKey(key, 'STORAGE_WRITE_FAILED')

  let dir: FileSystemDirectoryHandle
  try {
    dir = await this.getDirectory()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }

  try {
    await dir.removeEntry(key)
    return ok(undefined)
  } catch (e) {
    // NotFoundError → clave inexistente; segundo o contrato
    // StorageAdapter, delete dunha clave inexistente NON é erro.
    if (e instanceof DOMException && e.name === 'NotFoundError') {
      return ok(undefined)
    }
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }
}
```

**list**:
```ts
async list(prefix?: string): Promise<Result<string[]>> {
  let dir: FileSystemDirectoryHandle
  try {
    dir = await this.getDirectory()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, { ... }))
  }

  try {
    const keys: string[] = []
    for await (const [name, handle] of dir.entries()) {
      // Filtrar a só ficheiros (defensivo); cero subdirectorios.
      if (handle.kind === 'file') {
        if (prefix === undefined || name.startsWith(prefix)) {
          keys.push(name)
        }
      }
    }
    return ok(keys)
  } catch (e) {
    return err(this.makeError(EC.STORAGE_READ_FAILED, { ... }))
  }
}
```

**Importante**: `dir.entries()` é `AsyncIterable`, require `for await`.
Filtrado defensivo a `kind === 'file'` por se algunha vez se crearan
subdirectorios manualmente.

**clear**:
```ts
async clear(): Promise<Result<void>> {
  let dir: FileSystemDirectoryHandle
  try {
    dir = await this.getDirectory()
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }

  try {
    const names: string[] = []
    for await (const name of dir.keys()) {
      names.push(name)
    }
    for (const name of names) {
      await dir.removeEntry(name)
    }
    return ok(undefined)
  } catch (e) {
    return err(this.makeError(EC.STORAGE_WRITE_FAILED, { ... }))
  }
}
```

**Importante**: hai que iterar primeiro a unha lista (porque modificar
o directorio durante iteración é compartamento non especificado), logo
borrar.

### 5.8 — validateKey helper privado

```ts
private validateKey(
  key: string,
  errorCode: ErrorCode,
): Result<void> | null {
  if (key.includes('/') || key.includes('\\')) {
    // ... pero como devolvemos Result, isto é un patrón non trivial.
    // ALTERNATIVA: throw e capturalo no chamante. Decidir.
  }
  return null
}
```

**Decisión do director**: simplificar usando un patrón distinto.
En vez de helper que devolve `Result | null`, fai unha **función
privada que devolve `string | null`** indicando o motivo, e os
chamantes converten:

```ts
private invalidKeyReason(key: string): string | null {
  if (key.includes('/')) return 'key contains forward slash'
  if (key.includes('\\')) return 'key contains backslash'
  return null
}

// Uso en get/set/delete:
const invalid = this.invalidKeyReason(key)
if (invalid !== null) {
  return err(this.makeError(EC.STORAGE_WRITE_FAILED, {
    key,
    reason: invalid,
  }))
}
```

### 5.9 — Cero `watch` en FileSystemAdapter

OPFS non ten observador nativo intra-origin. **Cero `watch`**.
Documenta no JSDoc da clase.

### 5.10 — Helper `isQuotaExceededError` (duplicación aceptada)

**Replicar** o helper de LocalStorageAdapter e IndexedDBAdapter (mesma
implementación literal). **Duplicación aceptada** como nas sub-fases
anteriores; extraer a módulo compartido sería decisión arquitectónica
nova (anotado como candidato a hardening futuro, igual ca 3.3 §5.6).

### 5.11 — Cero ErrorCodes novos

E055/056/057 cobren todos os casos. **Cero edicións** en
`packages/common/`.

### 5.12 — TESTING CON `opfs-mock` (paralelo a fake-indexeddb da 3.3)

**Decisión arquitectónica pre-resolvida polo director, paralelo a 3.3
§5.12**: usar `opfs-mock` como devDependency.

**Filosofía consistente**:
- jsdom = DOM completo. **Non engadimos jsdom**.
- `opfs-mock` = implementación específica do estándar OPFS. Pure JS,
  in-memory, **cero DOM**. Funciona en Node puro.
- Mock manual de OPFS = re-inventar
  `FileSystemDirectoryHandle`/`FileSystemFileHandle`/etc, +50 clases.
  Inviable como nas 3.3.
- `opfs-mock` é estándar do ecosistema: específicamente deseñado para
  Jest/Vitest, Node 20-25 testado, in-memory.

**Polo tanto**:
1. Engadir `opfs-mock: ^1.0.0` (ou versión actual estable) ao catalog
   do workspace.
2. Engadir como devDependency en `packages/storage/package.json` con
   `catalog:`.

**Patrón de uso nos tests** (segundo doc do paquete):
```ts
import { storageFactory } from 'opfs-mock'
import { FileSystemAdapter } from '../src/FileSystemAdapter.js'

function createAdapter() {
  const storage = await storageFactory()
  return new FileSystemAdapter({
    directoryName: 'test-' + crypto.randomUUID(),
    storage,
  })
}
```

**T0 IMPORTANTE**: verifica a API real de `opfs-mock` (versión última,
forma de `storageFactory` ou similar). Se difire substancialmente do
que aquí se asume, **ESCALA** antes de adaptar — pode ser que opfs-mock
expoña `navigator.storage` directamente; o briefing asume IoC explícita.

### 5.13 — Exportación pública

Engadir a `packages/storage/src/index.ts`:

```ts
export { SessionStorageAdapter } from './SessionStorageAdapter.js'
export type { SessionStorageAdapterOptions } from './SessionStorageAdapter.js'
export { FileSystemAdapter } from './FileSystemAdapter.js'
export type { FileSystemAdapterOptions } from './FileSystemAdapter.js'
```

Despois dos exports existentes.

### 5.14 — Tests funcionais (mínimos)

**Para SessionStorageAdapter** (sub-fase A): crear
`packages/storage/__tests__/SessionStorageAdapter.test.ts`. Como é
wrapper trivial sobre LocalStorageAdapter, **non duplicar todos os
tests de LocalStorageAdapter**. Mínimo **5-8 tests**:

1. Constructor sen opcións usa `globalThis.sessionStorage` por defecto
   (test indirecto: spy en sessionStorage.getItem ou mock manual).
2. Constructor con `options.storage` usa o inxectado.
3. Constructor con `options.locale: 'es'` propaga ao
   LocalStorageAdapter interno.
4. `get/set/delete/list/clear` delegan correctamente (test cun mock
   Storage compartido que verifica chamadas).
5. SessionStorageAdapter `implements StorageAdapter` (compilation
   test).

**Importante**: NON duplicar serialización JSON, QuotaExceeded, etc.
**Iso xa está testado en LocalStorageAdapter**.

**Para FileSystemAdapter**: crear
`packages/storage/__tests__/FileSystemAdapter.test.ts`. Mínimo **25
tests** (paralelo a IndexedDBAdapter da 3.3).

*Operacións básicas (paralelo a outros adapters):*
1. `get` con clave inexistente devolve `ok(null)`.
2. `set` + `get` recupera o valor.
3. `set` sobreescribe valor existente.
4. `delete` elimina; `get` posterior devolve `ok(null)`.
5. `delete` con clave inexistente non lanza.

*list:*
6. `list()` sen prefix devolve todas as claves.
7. `list(prefix)` filtra correctamente.
8. `list()` en directorio baleiro devolve `ok([])`.

*clear:*
9. `clear` elimina todas as claves.
10. `clear` en directorio baleiro non lanza.

*Serialización (asimetrías):*
11. Acepta string, number, boolean, null, object, array.
12. `set(key, undefined)` → err STORAGE_WRITE_FAILED (igual que
    LocalStorageAdapter).
13. `set(key, circularRef)` → err STORAGE_WRITE_FAILED.
14. `set(key, BigInt(...))` → err STORAGE_WRITE_FAILED.
15. **Asimetría con IndexedDBAdapter**: undefined RÉXÉITASE aquí
    (igual ca LocalStorageAdapter).

*Validación de keys:*
16. `set('a/b', value)` → err STORAGE_WRITE_FAILED con reason "key
    contains forward slash".
17. `set('a\\b', value)` → err STORAGE_WRITE_FAILED con reason "key
    contains backslash".
18. `get('a/b')` → err STORAGE_READ_FAILED (igual validación).
19. `delete('a/b')` → err STORAGE_WRITE_FAILED.

*Apertura lazy:*
20. Múltiples operacións consecutivas: o directorio ábrese unha vez
    (test indirecto: spy ou conteo).
21. Operacións paralelas non rompen entre si.

*Inversión de control:*
22. `new FileSystemAdapter({ directoryName, storage })` usa o storage
    inxectado.
23. Locale 'es' devolve mensaxe en español (forzando erro).

*Isolamento entre instancias:*
24. Dúas instancias con `directoryName` distintos son independentes.
25. Dúas instancias co MESMO `directoryName` ven os mesmos datos
    (verifica persistencia entre instancias).

*Corrupción:*
26. Ficheiro con contido non-JSON → err STORAGE_READ_FAILED con reason
    "JSON parse failed". (Achdega o contido a man via mock interno.)

### 5.15 — Cobertura

- **SessionStorageAdapter.ts**: 100% Stmts/Branch/Funcs/Lines (peza
  trivial, sen escusa).
- **FileSystemAdapter.ts**: 100% Stmts/Funcs/Lines, ≥95% Branch
  (tolerable algunhas ramas defensivas en erros raros).
- Global do paquete: ≥97% Branch.

### 5.16 — Cero modificación de outros paquetes nin pezas previas

Só `packages/storage/`. Cero common, cero core. **Cero modificación**
de StorageAdapter.ts, MemoryStorage.ts, LocalStorageAdapter.ts,
IndexedDBAdapter.ts.

### 5.17 — Actualizar catalog + storage/package.json

`pnpm-workspace.yaml`:
```yaml
catalog:
  # ... existentes ...
  fake-indexeddb: ^6.2.5
  opfs-mock: ^1.0.0    # NOVO (verifica versión real en T1)
```

`packages/storage/package.json` (`devDependencies`):
```json
"opfs-mock": "catalog:"
```

`pnpm install` actualizará `pnpm-lock.yaml`. Espera diff aí.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:
- `packages/storage/src/SessionStorageAdapter.ts` — **NOVO**.
- `packages/storage/src/FileSystemAdapter.ts` — **NOVO**.
- `packages/storage/src/index.ts` — **MODIFICADO**: +4 exports.
- `packages/storage/package.json` — **MODIFICADO**: +1 devDep.
- `pnpm-workspace.yaml` — **MODIFICADO**: +1 catalog entry.
- `pnpm-lock.yaml` — **MODIFICADO** (automático).
- `packages/storage/__tests__/SessionStorageAdapter.test.ts` — **NOVO**.
- `packages/storage/__tests__/FileSystemAdapter.test.ts` — **NOVO**.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 115 tests `--force` en storage.
2. **Verifica versión actual de opfs-mock** no npm registry:
   `npm view opfs-mock version`. Reporta a versión exacta para
   actualizar o briefing se difire de ^1.0.0.
3. **Verifica API de opfs-mock**: `npm view opfs-mock`. Confirma se
   exporta `storageFactory` ou similar, e como inxectar como
   `StorageManager` (vs polyfill global). Se difire substancialmente
   do asumido en 5.12, **ESCALA**.
4. **Confirma** patrón makeError verificable en LocalStorageAdapter:
   `grep -A4 "private makeError" packages/storage/src/LocalStorageAdapter.ts`.

### T1 — Catalog + devDependency (5.17)
1. Editar `pnpm-workspace.yaml`: engadir `opfs-mock: <versión real>` ao
   catalog.
2. Editar `packages/storage/package.json`: engadir
   `"opfs-mock": "catalog:"` en `devDependencies`.
3. `pnpm install` para resolver. Verifica que `pnpm-lock.yaml`
   actualizouse.

### T2 — SessionStorageAdapter (5.1)
Crear `packages/storage/src/SessionStorageAdapter.ts` con
`SessionStorageAdapterOptions` interface + clase + composición sobre
LocalStorageAdapter. ~50 liñas + JSDoc.

Typecheck 20/20.

### T3 — Tests SessionStorageAdapter (5.14, A)
Crear `__tests__/SessionStorageAdapter.test.ts` cos 5-8 tests
mínimos. NON duplicar tests de LocalStorageAdapter.

### T4 — FileSystemAdapter (5.2-5.10)
Crear `packages/storage/src/FileSystemAdapter.ts`:
- Estrutura: clase + `FileSystemAdapterOptions` interface.
- Función a nivel de módulo `isQuotaExceededError` (replicada).
- Método privado `invalidKeyReason`.
- Método privado `getDirectory` (apertura lazy).
- Método privado `makeError` (patrón consistente).
- Métodos públicos: get, set, delete, list, clear (cero watch).
- JSDoc completo documentando asimetrías cos outros adapters.

Typecheck 20/20.

### T5 — Tests FileSystemAdapter (5.14, B)
Crear `__tests__/FileSystemAdapter.test.ts` cos 25+ tests.

### T6 — Exportar (5.13)
Engadir os 4 exports a `src/index.ts`.

### T7 — Verificación post-T6
- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/storage --force` pasa.
- 115 tests previos seguen pasando intactos.

### T8 — Cobertura
`pnpm --filter @yggdrasil-forge/storage run test:coverage`. Confirma
SessionStorageAdapter 100% e FileSystemAdapter 100/100/100/≥95%.

### T9 — Verificación + grep + commit + push
```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" packages/storage/src/
pnpm test
```
LITERAL.

- Changeset **minor** para `@yggdrasil-forge/storage`.
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - `SessionStorageAdapter` (en `@yggdrasil-forge/storage`): wrapper
    sobre `LocalStorageAdapter` con `globalThis.sessionStorage` como
    default. Cero duplicación de lóxica; herda automáticamente todos
    os arranxos futuros de LocalStorageAdapter. A semántica é
    idéntica salvo na duración (sessionStorage pérdese ao pechar a
    pestana).
  - `FileSystemAdapter` (en `@yggdrasil-forge/storage`): cuarta
    implementación concreta de `StorageAdapter`. Usa OPFS (Origin
    Private File System) accesible via `navigator.storage.getDirectory()`.
    Soporte amplo: Chrome, Edge, Firefox, Safari, Opera (desde marzo
    2023). `directoryName` obrigatorio no constructor; `storage`
    (StorageManager) opcional permite inxectar `opfs-mock` nos tests.
    Estrutura plana de ficheiros (cero subdirectorios); keys que
    conteñan `/` ou `\\` rexéitanse. Serialización JSON (asimetría
    con IndexedDBAdapter: rexeita undefined/BigInt/funcións/circular
    refs, idéntico a LocalStorageAdapter).
  - `SessionStorageAdapterOptions` e `FileSystemAdapterOptions`
    interfaces exportadas.
  - devDependency: `opfs-mock` no catalog para tests de
    FileSystemAdapter.
  ```

### T10 — Commit + push
Commit Conventional:
`feat(storage): add SessionStorageAdapter and FileSystemAdapter (sub-phase 3.4)`.
Push directo a `origin/main` (base `1528fa8`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/storage/src/SessionStorageAdapter.ts` (NOVO)
- `packages/storage/src/FileSystemAdapter.ts` (NOVO)
- `packages/storage/src/index.ts` (MODIFICADO: +4 exports)
- `packages/storage/package.json` (MODIFICADO: +1 devDep)
- `pnpm-workspace.yaml` (MODIFICADO: +1 catalog entry)
- `pnpm-lock.yaml` (MODIFICADO: automático)
- `packages/storage/__tests__/SessionStorageAdapter.test.ts` (NOVO)
- `packages/storage/__tests__/FileSystemAdapter.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/`, `packages/storage/src/StorageAdapter.ts`,
`packages/storage/src/MemoryStorage.ts`,
`packages/storage/src/LocalStorageAdapter.ts`,
`packages/storage/src/IndexedDBAdapter.ts`, calquera test existente,
`packages/storage/tsconfig.json`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown`** é tipo correcto. **`FileSystemDirectoryHandle`,
`FileSystemFileHandle`, `StorageManager`** son interfaces DOM
estándar (lib DOM activada en tsconfig.base).

---

## 9. QUE NON FACER

- ❌ Implementar SessionStorageAdapter como subclase de
  LocalStorageAdapter (5.1: composición, non herdanza).
- ❌ Modificar LocalStorageAdapter en absoluto (5.1, 5.16).
- ❌ Usar File System Access API con showOpenFilePicker (5.2: OPFS
  exclusivamente).
- ❌ Crear subdirectorios en OPFS (5.3: estrutura plana).
- ❌ Aceptar keys con `/` ou `\\` (5.3, 5.8).
- ❌ Implementar `watch` (5.9).
- ❌ Usar `opfs-mock/auto` se existe (inxección explícita).
- ❌ Engadir ErrorCodes (5.11).
- ❌ Extraer `isQuotaExceededError` a módulo compartido (5.10:
  duplicación aceptada nesta sub-fase).
- ❌ Duplicar tests de LocalStorageAdapter en SessionStorageAdapter
  (5.14, A: só wrappers).
- ❌ Modificar pezas non listadas.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.4 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 1528fa8)
✅ SessionStorageAdapter via composición sobre LocalStorageAdapter
✅ Cero modificación de LocalStorageAdapter
✅ FileSystemAdapter usa OPFS (cero File System Access API)
✅ Estrutura plana en OPFS; keys con '/' ou '\\' rexeitadas
✅ Apertura lazy do directorio (constructor sync; abre en 1ª op)
✅ Serialización JSON en FileSystemAdapter (consistente con LocalStorage)
✅ Cero watch en ningún dos dous (consistente con LocalStorage/IndexedDB)
✅ Cero ErrorCodes novos (E055-057 reutilizables)
✅ opfs-mock engadido ao catalog (versión <real>)
✅ devDependency en storage/package.json con catalog:
✅ T0 versión opfs-mock real: <versión>
✅ T0 API opfs-mock verificada: <storageFactory ou alternativa>
✅ T0 patrón makeError replicado de LocalStorageAdapter
✅ Tests: <N> pasan en storage (<delta> novos)
   - <X> tests SessionStorageAdapter (wrappers, non duplicación)
   - <Y> tests FileSystemAdapter (paralelo a IndexedDBAdapter)
✅ Cobertura:
   - SessionStorageAdapter 100/100/100/100
   - FileSystemAdapter 100/<X%>/100/100
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Asimetrías documentadas:
   - FileSystemAdapter vs IndexedDBAdapter: FileSystemAdapter rexeita
     undefined/BigInt/funcións/circular refs (igual ca LocalStorageAdapter,
     polo uso de JSON); IndexedDBAdapter acéptaos via structured clone.
   - SessionStorageAdapter vs LocalStorageAdapter: semántica idéntica
     salvo na duración (sessionStorage pérdese ao pechar pestana).
✅ Changeset minor (storage) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.5 (Migration system + auto backup).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.4. Dúas pezas heteroxéneas: wrapper trivial +
OPFS adapter. Calquera caso non cuberto → ESCALAR.*
