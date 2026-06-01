# BRIEFING — SUB-FASE 3.2.b de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase de implementación con decisión arquitectónica real.**
> Crear `LocalStorageAdapter`, segunda implementación concreta de
> `StorageAdapter`. Wrapper sobre `Storage` interface estándar do DOM
> con serialización JSON e inversión de control. **Cero dependencia
> de jsdom/happy-dom** nos tests.

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
- Pushed: `═══ SUB-FASE 3.2.b — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.2.b — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.2.b** de Yggdrasil Forge. **Segunda implementación
concreta da Fase 3.** Tipo: **adapter sobre Storage interface
estándar** — implementar `LocalStorageAdapter` que envolve un obxecto
`Storage` (típicamente `globalThis.localStorage`) cumprindo a interface
`StorageAdapter` de 3.1.

---

## 2. CONTEXTO MÍNIMO

Tras 3.2.a, `MemoryStorage` é a primeira implementación de
`StorageAdapter`. Esta sub-fase engade `LocalStorageAdapter` para
persistencia real no navegador, con tres complexidades novas:
1. **Serialización JSON** (Storage só acepta strings).
2. **Manexo de `QuotaExceededError`** (límite ~5-10MB segundo navegador).
3. **Inversión de control** no constructor (acepta `Storage` inxectado).

A inversión de control permite tests SEN jsdom/happy-dom: o test
inxecta un mock manual de `Storage` interface. Filosofía aliñada coa
Fase 2 (peza pura, dependencia inxectada).

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `3658808` (MemoryStorage 3.2.a).
- 36 tests pasan en storage (14 da 3.1 + 22 de MemoryStorage); cobertura
  MemoryStorage 100%. 896 core + 17 common intactos.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`Storage` interface dispoñible globalmente** en TS (lib DOM xa
  habilitada en `tsconfig.base.json`).
- **`StorageAdapter`** importable de `@yggdrasil-forge/storage`.
- **`Result`, `ok`, `err`, `YggdrasilError`, `ErrorCode`** importables
  de `@yggdrasil-forge/common`.
- **ErrorCodes existentes** (reutilizables):
  - `STORAGE_READ_FAILED = YGG_S001`
  - `STORAGE_WRITE_FAILED = YGG_S002`
  - `STORAGE_QUOTA_EXCEEDED = YGG_S003`
- **`packages/storage/package.json` xa ten dep `@yggdrasil-forge/common`**
  (engadida en 3.1).
- **`packages/storage/package.json` NON ten script `test:coverage`**
  (anomalía cosmética; `core` e `common` si o teñen). T7 deste briefing
  inclúe engadir o script.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/storage/src/LocalStorageAdapter.ts` cunha clase
`LocalStorageAdapter` que envolve un `Storage` inxectado (por defecto
`globalThis.localStorage`), serializa valores con `JSON.stringify` ao
gardar e `JSON.parse` ao ler, propaga erros como `Result<err>` con
`STORAGE_READ_FAILED`/`STORAGE_WRITE_FAILED`/`STORAGE_QUOTA_EXCEEDED`,
exportala desde `index.ts`, e cubrir con tests funcionais usando mock
manual de Storage interface (cero jsdom).

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Inversión de control: `Storage` inxectado no constructor

```ts
export interface LocalStorageAdapterOptions {
  /**
   * Backend Storage a usar. Por defecto `globalThis.localStorage`.
   * Permite inxectar mocks nos tests sen depender de jsdom/happy-dom.
   * Tamén permite usar `sessionStorage` ou polyfills compatibles.
   */
  readonly storage?: Storage
}

export class LocalStorageAdapter implements StorageAdapter {
  private readonly storage: Storage

  constructor(options: LocalStorageAdapterOptions = {}) {
    this.storage = options.storage ?? globalThis.localStorage
  }
  // ...
}
```

Razóns:
- Tests sen jsdom: mock manual de `Storage` interface no propio test.
- Reutilizable con `sessionStorage` (que cumpre Storage interface).
- Permite polyfills se procede.
- Filosofía aliñada coa Fase 2: peza pura con dependencias inxectables.

**Importante sobre `globalThis.localStorage`**: en Node puro
(`environment: 'node'` no Vitest, configuración actual do storage),
`globalThis.localStorage` é **`undefined`**. **Iso é correcto**: o
constructor sen `options.storage` fallaría se non o pasas; é
responsabilidade do consumidor pasalo en entornos sen DOM.

**Pero hai unha sutileza**: o `this.storage = options.storage ??
globalThis.localStorage` execútase **eagerly** no constructor. Se o
test chama `new LocalStorageAdapter()` sen `options` en Node, captura
`undefined` e o atributo `this.storage` é `undefined`. **Iso quebra**
chamadas posteriores. **Tests deben pasar `options.storage`
explicitamente sempre**. Documenta no JSDoc.

### 5.2 — Serialización JSON

```ts
async set(key: string, value: unknown): Promise<Result<void>> {
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch (e) {
    // JSON.stringify lanza para circular refs ou BigInt.
    return err(makeError(...))
  }

  try {
    this.storage.setItem(key, serialized)
    return ok(undefined)
  } catch (e) {
    // Pode lanzar QuotaExceededError ou outros.
    if (isQuotaExceededError(e)) {
      return err(makeError(STORAGE_QUOTA_EXCEEDED, ...))
    }
    return err(makeError(STORAGE_WRITE_FAILED, ...))
  }
}
```

**Importante**:
- `JSON.stringify(undefined)` devolve `undefined` (non string!) →
  cero gardado. **Decisión: rexeitar `undefined` como valor**
  explicitamente. Devolve err `STORAGE_WRITE_FAILED` con mensaxe
  clara. Iso é asimetría con MemoryStorage (que SI acepta undefined);
  documentar.
- `JSON.stringify(NaN)` devolve `"null"` → cero gardado limpo de NaN.
  **Decisión: aceptar este comportamento de JSON sen warnings**.
  Documentar a asimetría con MemoryStorage.
- Circular refs → `JSON.stringify` lanza → `STORAGE_WRITE_FAILED`.
- BigInt → `JSON.stringify` lanza → `STORAGE_WRITE_FAILED`.
- Funcións → `JSON.stringify` ignóranas (resultan en `{}` ou
  `undefined`). **Decisión: aceptar comportamento de JSON**.

A asimetría con MemoryStorage é **inherente** á natureza serializable
vs in-memory. Documenta no JSDoc da clase.

### 5.3 — `get`: deserialización JSON

```ts
async get(key: string): Promise<Result<unknown | null>> {
  let raw: string | null
  try {
    raw = this.storage.getItem(key)
  } catch (e) {
    return err(makeError(STORAGE_READ_FAILED, ...))
  }

  if (raw === null) {
    return ok(null)
  }

  try {
    return ok(JSON.parse(raw))
  } catch (e) {
    // raw está corrupto (non é JSON válido).
    return err(makeError(STORAGE_READ_FAILED, ..., {
      reason: 'JSON parse failed',
    }))
  }
}
```

**Importante**:
- Clave inexistente → `getItem` devolve `null` → `ok(null)`. **Non** é
  erro.
- Valor existente pero corrupto (alguén modificou directamente o
  localStorage cunha string non JSON) → `JSON.parse` lanza → `err
  STORAGE_READ_FAILED`. Razón: o adapter non pode adiviñar; é mellor
  fallo claro que devolver basura.

### 5.4 — Detección de `QuotaExceededError`

Diferentes navegadores usan diferentes constantes/clases para o
QuotaExceededError. **Detección robusta**:

```ts
function isQuotaExceededError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  // Chrome/Edge/Safari/Firefox modernos.
  if (e.name === 'QuotaExceededError') return true
  // Firefox antigo.
  if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true
  // Algúns Safari/iOS reportan código numérico.
  // DOMException code 22 = QUOTA_EXCEEDED_ERR
  // DOMException code 1014 = NS_ERROR_DOM_QUOTA_REACHED
  const code = (e as { code?: number }).code
  if (code === 22 || code === 1014) return true
  return false
}
```

Helper privado no propio LocalStorageAdapter.ts.

### 5.5 — `delete` e `clear`

```ts
async delete(key: string): Promise<Result<void>> {
  try {
    this.storage.removeItem(key)
    return ok(undefined)
  } catch (e) {
    return err(makeError(STORAGE_WRITE_FAILED, ...))
  }
}

async clear(): Promise<Result<void>> {
  try {
    this.storage.clear()
    return ok(undefined)
  } catch (e) {
    return err(makeError(STORAGE_WRITE_FAILED, ...))
  }
}
```

`removeItem` non lanza para claves inexistentes (comportamento DOM
estándar). Cero `try/catch` adicional para iso.

### 5.6 — `list` con `Storage.key(index)`

`Storage` interface non ten método nativo equivalente a "listar
claves". Iteración manual con `length` + `key(i)`:

```ts
async list(prefix?: string): Promise<Result<string[]>> {
  try {
    const keys: string[] = []
    const length = this.storage.length
    for (let i = 0; i < length; i++) {
      const key = this.storage.key(i)
      if (key === null) continue  // defensivo; nunca debería pasar
      if (prefix === undefined || key.startsWith(prefix)) {
        keys.push(key)
      }
    }
    return ok(keys)
  } catch (e) {
    return err(makeError(STORAGE_READ_FAILED, ...))
  }
}
```

**Importante**: `Storage.key(i)` pode devolver `null` se outra páxina/
tab modifica o storage entre `length` e `key(i)`. **Defensivo: ignora
nulls** sen tratalos como erro.

### 5.7 — `watch` NON se implementa

`Storage` ten o evento `storage` no `window`, pero **só se dispara
entre tabs**, non na mesma tab. Implementar `watch` parcialmente
sería confuso: o consumidor escribiría `set` e o `watch` da mesma
instancia non se enteraría. **Decisión: NON implementar `watch` aquí**.

Iso é correcto porque `watch?` na interface é opcional (decisión 3.1
§5.2). Documenta no JSDoc da clase: "watch non se implementa; os
consumidores que necesiten observación deben combinar con
MemoryStorage en patrón cache, ou usar IndexedDBAdapter (3.3) cuxa API
admite suscriptions".

### 5.8 — Cero novos ErrorCodes

E055/056/057 cobren todos os casos. **Cero edicións** en
`packages/common/`.

### 5.9 — makeError patrón consistente

Usar `makeError` de common (xa importado polo core en 1.17). Verifica
en T0 a sinatura exacta:

```ts
makeError(code, locale, params, context)
```

Para context, incluír:
- `key`: a clave afectada.
- `reason`: descrición curta (opcional).
- `originalErrorMessage`: e.message do erro nativo (se aplicable).

**Importante**: cada `LocalStorageAdapter` precisa coñecer o `locale`
para `makeError`. Engadir `locale` como opción do constructor:

```ts
export interface LocalStorageAdapterOptions {
  readonly storage?: Storage
  readonly locale?: Locale
}

constructor(options: LocalStorageAdapterOptions = {}) {
  this.storage = options.storage ?? globalThis.localStorage
  this.locale = options.locale ?? 'gl'  // default galego
}
```

Por que `'gl'` como default: o resto do motor usa galego por defecto
(verificable: `const DEFAULT_LOCALE: Locale = 'gl'` en
`TreeDefValidator.ts:44`). Coherencia.

### 5.10 — Constructor sen opcións obrigatorias

```ts
// Permitido: new LocalStorageAdapter()
// (require globalThis.localStorage dispoñible)
// Recomendado para tests: new LocalStorageAdapter({ storage: mockStorage })
// Avanzado: new LocalStorageAdapter({ storage: customStore, locale: 'es' })
```

**Cero options obrigatorias**, todos os campos opcionais con defaults.

### 5.11 — Export desde index.ts

```ts
export { LocalStorageAdapter } from './LocalStorageAdapter.js'
export type { LocalStorageAdapterOptions } from './LocalStorageAdapter.js'
```

Despois dos exports de `StorageAdapter` e `MemoryStorage`.

### 5.12 — Tests sen jsdom: mock manual de Storage

Os tests crean un `MockStorage` que implementa **a interface Storage
real** (non a StorageAdapter):

```ts
class MockStorage implements Storage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys())
    return keys[index] ?? null
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }
}
```

Iso é case-trivial e cero jsdom. **Reutiliza patrón de Map<string,
string>**, distinto de MemoryStorage que usa `Map<string, unknown>`
(porque Storage só acepta strings).

**Variantes do mock para tests específicos**:
- `MockStorageWithQuota`: lanza `QuotaExceededError` ao chegar a un
  tamaño.
- `MockStorageReadOnly`: lanza en setItem (cero serializable).

Crea estas variantes inline no test cando faga falta.

### 5.13 — Tests funcionais (mínimos)

Crear `packages/storage/__tests__/LocalStorageAdapter.test.ts`.
**Mínimo 20 tests**:

**Operacións básicas (paralelo a MemoryStorage):**
1-5. get/set/delete/list/clear básicos, igual ca MemoryStorage.

**Serialización:**
6. Acepta string, number, boolean, null, object, array.
7. `set(key, undefined)` → err `STORAGE_WRITE_FAILED` (5.2).
8. `set(key, circularRef)` → err `STORAGE_WRITE_FAILED`.
9. `set(key, BigInt(...))` → err `STORAGE_WRITE_FAILED`.
10. `set(key, functionRef)` ou con función dentro de obxecto: documenta
    o comportamento real (probablemente garda `{}` por filtrado de JSON).
11. `set(key, NaN)` → garda `null` (comportamento JSON estándar; non é
    err).
12. **Asimetría con MemoryStorage**: `set + get` dun obxecto **non**
    devolve a mesma referencia (`!==`); é unha copia profunda via JSON.

**QuotaExceeded:**
13. Mock que lanza `QuotaExceededError` con `name`. `set` devolve err
    `STORAGE_QUOTA_EXCEEDED`.
14. Mock que lanza con `code: 22` (Safari iOS). Igual comportamento.

**get con corrupción:**
15. Mock con valor non-JSON directo (alguén o puxo a man). `get`
    devolve err `STORAGE_READ_FAILED` con reason "JSON parse failed".

**get con clave inexistente:**
16. `get` de clave que nunca se gardou → `ok(null)`.

**list:**
17. `list` con prefix filtra correctamente.
18. `list` ignora nulls de `Storage.key(i)` (mock que devolve null para
    algún index).

**clear:**
19. `clear` elimina todo.

**Constructor:**
20. `new LocalStorageAdapter({ storage: mock })` usa o mock.
21. `new LocalStorageAdapter({ storage: mock, locale: 'es' })` usa o
    locale (test indirecto: a mensaxe de erro vén en español).

**Adicionais (opcionais pero recomendados):**
22-23. Test de propagación de erros con `e.message` no context.

### 5.14 — Cobertura

`LocalStorageAdapter.ts` debe alcanzar **100% en Stmts/Funcs/Lines**.
Branch pode quedar lixeiramente por debaixo se hai ramas defensivas que
non se exercen (ex: `key === null` en list); aceptable ata **95%
branch** sen escalado. Por debaixo: escalar.

### 5.15 — Script `test:coverage` en storage

Engadir ao `packages/storage/package.json`:
```json
"scripts": {
  ...
  "test:coverage": "vitest run --coverage"
}
```
Patrón idéntico a `core` e `common`. **Cosmético pero permite
uniformidade**. Sub-fase oportuna para arranxalo.

### 5.16 — Cero modificación de outros paquetes

Só `packages/storage/`. Cero common, cero core, cero outros.

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:
- `packages/storage/src/LocalStorageAdapter.ts` — **NOVO**.
- `packages/storage/src/index.ts` — **MODIFICADO**: +2 exports.
- `packages/storage/package.json` — **MODIFICADO**: script
  `test:coverage`.
- `packages/storage/__tests__/LocalStorageAdapter.test.ts` — **NOVO**.

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións
1. `pnpm install`. Confirma 36 tests `--force` en storage.
2. **Verifica** sinatura de `makeError` en core para reutilizar
   patrón: `grep -B1 -A6 "function makeError\|export function makeError"
   packages/core/src/engine/errors.ts 2>/dev/null` (ou onde estea).
   **Pode estar en common**: `grep -rn "function makeError" packages/common/src`.
   Reporta a sinatura exacta.
3. **Confirma** que `Locale` está exportado desde common:
   `grep "Locale" packages/common/src/index.ts | head -3`.
4. **Verifica** que `Storage` interface está accesible en TS strict:
   crea un script trivial `const s: Storage = null as any` e que
   typecheck pase (xa debería; lib DOM activada).

### T1 — Crear LocalStorageAdapter.ts (5.1-5.10)
- Estrutura: clase + `LocalStorageAdapterOptions` interface.
- Helper privado `isQuotaExceededError`.
- Métodos públicos: get, set, delete, list, clear.
- Cero watch (5.7).
- JSDoc completo documentando asimetrías con MemoryStorage.

Typecheck 20/20.

### T2 — Exportar (5.11)
Engadir os 2 exports a `index.ts`.

### T3 — Tests con mock Storage (5.12, 5.13)
Crear `__tests__/LocalStorageAdapter.test.ts`. Defínese `MockStorage`
e variantes (con quota, read-only) inline. 20+ tests.

### T4 — Script test:coverage (5.15)
Engadir liña ao `package.json`.

### T5 — Verificación post-T4
- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/storage --force` pasa.
- 22 tests previos de MemoryStorage seguen pasando intactos.
- 14 tests previos de StorageAdapter (3.1) intactos.

### T6 — Cobertura
`pnpm --filter @yggdrasil-forge/storage run test:coverage` (xa
dispoñible tras T4). Confirmar 100% (Stmts/Funcs/Lines) e ≥95% (Branch).

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
  - `LocalStorageAdapter` (en `@yggdrasil-forge/storage`): segunda
    implementación concreta de `StorageAdapter`. Wrapper sobre
    `Storage` interface estándar (por defecto `globalThis.localStorage`)
    con serialización JSON automática. Acepta `Storage` inxectado no
    constructor para tests sen jsdom. Detecta `QuotaExceededError`
    multi-navegador (Chrome, Firefox, Safari, iOS) e mapéao a
    `STORAGE_QUOTA_EXCEEDED`. Valores corruptos no storage devolven
    `STORAGE_READ_FAILED`. Asimetría con MemoryStorage: valores pasan
    por `JSON.parse(JSON.stringify(x))` (perden identidade
    referencial; `undefined`, `BigInt`, funcións e circular refs
    rexéitanse).
  - `LocalStorageAdapterOptions` interface exportada para
    configuración explícita.
  - Script `test:coverage` en `@yggdrasil-forge/storage` (patrón
    idéntico a core e common).
  ```

### T8 — Commit + push
Commit Conventional:
`feat(storage): add LocalStorageAdapter with JSON serialization (sub-phase 3.2.b)`.
Push directo a `origin/main` (base `3658808`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/storage/src/LocalStorageAdapter.ts` (NOVO)
- `packages/storage/src/index.ts` (MODIFICADO: +2 exports)
- `packages/storage/package.json` (MODIFICADO: script test:coverage)
- `packages/storage/__tests__/LocalStorageAdapter.test.ts` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**: `packages/common/`,
`packages/core/`, `packages/storage/src/StorageAdapter.ts`,
`packages/storage/src/MemoryStorage.ts`, `packages/storage/__tests__/`
agás o ficheiro novo, `packages/storage/tsconfig.json`,
`pnpm-lock.yaml`.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown`** é tipo correcto na interface (parte do contrato).
**`Storage`** é interface DOM estándar (lib DOM activada en
tsconfig.base).

---

## 9. QUE NON FACER

- ❌ Engadir dependencia jsdom ou happy-dom (5.12: mock manual).
- ❌ Implementar `watch` (5.7: confuso pola natureza event storage).
- ❌ Modificar a interface StorageAdapter (5.16).
- ❌ Modificar MemoryStorage (5.16).
- ❌ Engadir ErrorCodes (5.8: E055-057 reutilizables).
- ❌ Modificar `common` ou `core` (5.16).
- ❌ Aceptar `undefined` como valor en `set` (5.2: rexeitar
  explicitamente).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.2.b — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 3658808)
✅ LocalStorageAdapter implementa StorageAdapter sobre Storage interface
✅ Inversión de control: Storage inxectado (cero jsdom nos tests)
✅ Serialización JSON automática en set/get
✅ QuotaExceededError detectado multi-navegador → STORAGE_QUOTA_EXCEEDED
✅ Valor corrupto (non JSON) → STORAGE_READ_FAILED
✅ undefined/BigInt/circular refs rexeitados (5.2)
✅ Cero watch implementado (5.7: confuso pola natureza storage event)
✅ Cero ErrorCodes novos (E055-057 reutilizables)
✅ Script test:coverage engadido a storage (uniformidade con core/common)
✅ T0 makeError sinatura: <verificada>
✅ T0 Locale exportado: <confirmado>
✅ Tests: <N> pasan en storage (<delta> novos)
✅ Cobertura: LocalStorageAdapter Stmts/Funcs/Lines 100%, Branch <X%>
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Asimetría documentada con MemoryStorage: LocalStorageAdapter
   serializa via JSON (perde identidade referencial; rexeita
   undefined/BigInt/funcións/circular refs).
✅ Changeset minor (storage) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.3 (IndexedDBAdapter) ou outra que decida o director.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.2.b. Wrapper sobre Storage estándar, inversión de
control, cero jsdom. Calquera caso non cuberto → ESCALAR.*
