# BRIEFING — SUB-FASE 6.3 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Terceira sub-fase da Fase 6 (TreeRegistry + Multi-tenancy).** Engadir
> a clase **`ScopedStorage`** ao paquete `@yggdrasil-forge/storage`. É
> un adapter que envolve outro `StorageAdapter` e prefixa todas as
> claves cun `scope`, para illar tenants nun storage compartido.
> **Quotas + Permissions seguen DIFERIDOS** (irán en 6.4).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente 6.1+6.2).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2,
3.6.a L1, 4.3 L1, 5.2 L1+L2, 6.1 L1+L2, 6.2 L1**: calquera modificación
fóra de §6 require **ESCALAR ANTES DE APLICAR**. **APIs prescritas en
código exemplo deben verificarse empíricamente** (5.2 L2).

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 6.3 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 6.3 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.
NON consolidar coa de 6.2.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1, aplicado proactivamente en 6.2 L1)**: ramas
defensivas verificablemente inalcanzables anótanse con `/* v8 ignore
next */ + comentario xustificativo`, NON tolerar baixadas globais de
cobertura.

---

## 1. IDENTIFICACIÓN

Sub-fase **6.3** de Yggdrasil Forge. **Terceira da Fase 6**
(TreeRegistry + Multi-tenancy).

**Subdivisión consciente da Fase 6 (nota arquitectónica)**: o MASTER §67
consolida `6.3 = ScopedStorage + Quotas + Permissions`. O director
mantén a subdivisión adoptada en briefings 6.1+6.2 e separa explícitamente:
- **6.3 = ScopedStorage** (esta sub-fase).
- **6.4 = Quotas + Permissions** (seguinte).

Razóns: reduce scope por sub-fase (cero rollback en 20 consecutivas);
mantén o ritmo de 1-1.5h por sub-fase; permite revisar de forma
independente. A subdivisión rexístrase no MASTER no próximo ciclo de
hixiene.

**Pezas**:

1. **`ScopedStorage` clase** implementando `StorageAdapter`.
2. **Export público** en `@yggdrasil-forge/storage`.
3. **Tests funcionais** (~22).

**Cero modificación de pezas non listadas**: outros adapters
(MemoryStorage, LocalStorageAdapter, IndexedDBAdapter, SessionStorageAdapter,
FileSystemAdapter), StorageAdapter interface, `@yggdrasil-forge/common`,
`@yggdrasil-forge/core` (TreeRegistry incluído).

**Cero ErrorCodes novos.** Validación de args do constructor via `throw
Error(...)` síncrono (igual que outros adapters falla en setup phase).
**Cero modificación de `packages/common/`** e **cero modificación de
`packages/core/`**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Spec MASTER §49 (API canónica fixada)**:

```typescript
const tenant1Storage = new ScopedStorage(baseStorage, 'tenant_1')
const tenant1Registry = new TreeRegistry(treeDef, { storage: tenant1Storage })
```

Constructor: **2 args posicionais, sen options object**. Documentado
explícitamente no MASTER.

**Auditoría do director (sobre commit `8de28f6`, verificada empíricamente
en clone independente)**:

- `StorageAdapter` interface (en `packages/storage/src/StorageAdapter.ts`):
  ```ts
  interface StorageAdapter {
    get(key: string): Promise<Result<unknown | null>>
    set(key: string, value: unknown): Promise<Result<void>>
    delete(key: string): Promise<Result<void>>
    list(prefix?: string): Promise<Result<string[]>>
    clear(): Promise<Result<void>>             // ⚠ "Elimina TODAS as claves"
    watch?(key: string, callback: (value: unknown) => void): () => void
  }
  ```
- Adapters concretos: 5 (MemoryStorage, LocalStorageAdapter, IndexedDBAdapter,
  SessionStorageAdapter, FileSystemAdapter). Cero modificación deles.
- **Schema de claves usado por TreeRegistry** (15 callsites en
  `TreeRegistry.ts`):
  - `engine:${userId}:state`
  - `build:${buildId}`
  - `registry:userIds`
  - `registry:buildsIndex`
  - `registry:meta`
  Patrón común: **separador `:` entre segmentos**. ScopedStorage **DEBE**
  usar `:` como separador para coherencia (un `tenant_1` envolvendo
  TreeRegistry resulta en claves físicas tipo `tenant_1:engine:alice:state`).
- Estilo de tests storage: importa `isOk`, `isErr` de `@yggdrasil-forge/common`
  (NON `.ok`/`.error` directo).
- 171 tests storage previos: todos intactos en 6.3.
- Adapter tamaños: MemoryStorage 132 liñas, SessionStorage 66 liñas
  (delegado de LocalStorage). ScopedStorage estimase **~110 liñas**.

**Caso de uso primario**: SaaS multi-tenant.
```ts
const baseStorage = new IndexedDBAdapter(...)
const tenantA = new ScopedStorage(baseStorage, 'tenant_a')
const tenantB = new ScopedStorage(baseStorage, 'tenant_b')
// Cada TreeRegistry illado nun namespace, comparten o backend físico.
// tenantA.clear() borra SÓ tenant_a, deixa tenant_b intacto.
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `8de28f6` (TreeRegistry aggregate queries 6.2).
- 1481 core + 60 common + **171 storage** = **1712 monorepo limpo**.
- Typecheck 21/21, lint 0/0, format 0/0.
- 53 ErrorCodes existentes (ata YGG_E032).
- Global core cobertura **97.49%** (baseline post-6.2).
- DT abertas: DT-9, DT-11, DT-12, DT-14 a DT-21, DT-23, DT-24
  (DT-22 resolta de facto en 6.2).
- Storage adapter tamaños/tests verificados; cero modificación esperada.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/storage` unha nova clase
`ScopedStorage` que implementa `StorageAdapter`, recibe outro
`StorageAdapter` base + un `scope: string`, e prefixa todas as claves
con `\${scope}:` antes de delegar ao base (incluído clear() que itera
list+delete para non borrar fóra do scope), expondo opcionalmente
`watch` só se o base a soporta. **Cero modificación de outros adapters,
de `packages/common/`, ou de `packages/core/`**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVO** `packages/storage/src/ScopedStorage.ts` (~110 liñas estimadas).
**NOVO** `packages/storage/__tests__/ScopedStorage.test.ts` (~280 liñas).
**MODIFICADO** `packages/storage/src/index.ts`: engadir `export { ScopedStorage }`.
**MODIFICADO** `CHANGELOG.md`: nova `## [Unreleased]` ao principio.
**NOVO** `.changeset/scoped-storage.md`: minor para `@yggdrasil-forge/storage`.

**Cero ficheiro novo noutros paquetes. Cero modificación de outros adapters.**

### 5.2 — API canónica (FIXADA, non negociable)

```ts
export class ScopedStorage implements StorageAdapter {
  constructor(base: StorageAdapter, scope: string)
  // implementa: get, set, delete, list, clear; expón watch? só se base.watch
}
```

**Sen options object** (decisión MASTER §49 literal). **2 args
posicionais**. Constructor síncrono.

### 5.3 — Validación do scope (constructor, throw síncrono)

```ts
constructor(base: StorageAdapter, scope: string) {
  if (scope === '') {
    throw new Error('ScopedStorage: scope cannot be empty')
  }
  if (scope.includes(':')) {
    throw new Error("ScopedStorage: scope cannot contain ':' (reserved as separator)")
  }
  this.base = base
  this.scope = scope
  // ... ver §5.8 para watch condicional
}
```

**`throw Error` (non YggdrasilError)**: o constructor é setup phase
síncrono, igual que outros adapters falla con `throw` cando args
inválidos. **Cero ErrorCode novo**, cero `Result`. As mensaxes son
literais inglés (cero localización; setup-phase, non runtime).

**Cero outras validacións** (separadores adicionais, charset, lonxitude
máxima): scope é un identificador opaco para o consumidor. Documentar
no JSDoc que se recomenda evitar caracteres especiais en `list()`
prefix matching, pero non se impón.

### 5.4 — Separador

**`:`** entre scope e key. Aliña co schema do TreeRegistry. Reutilización
natural. Cero configuración (hardcoded).

Exemplo:
```
scope='tenant_a', key='engine:alice:state'
→ clave física = 'tenant_a:engine:alice:state'
```

### 5.5 — get / set / delete (pseudo-código)

```ts
async get(key: string): Promise<Result<unknown | null>> {
  return this.base.get(`${this.scope}:${key}`)
}

async set(key: string, value: unknown): Promise<Result<void>> {
  return this.base.set(`${this.scope}:${key}`, value)
}

async delete(key: string): Promise<Result<void>> {
  return this.base.delete(`${this.scope}:${key}`)
}
```

**Cero validación de `key` no momento da chamada** (transparente; o
consumidor pode pasar calquera string). Documentar.

### 5.6 — list (pseudo-código)

```ts
async list(prefix?: string): Promise<Result<string[]>> {
  const scopedPrefix =
    prefix !== undefined ? `${this.scope}:${prefix}` : `${this.scope}:`
  const result = await this.base.list(scopedPrefix)
  if (!result.ok) return result
  // Despoxar o prefixo do scope das claves devoltas
  const unscopedLen = this.scope.length + 1  // +1 por ':'
  const unscoped = result.value.map((k) => k.slice(unscopedLen))
  return ok(unscoped)
}
```

**Comportamento**:
- Sen prefix: lista todas as claves do scope, devoltas **sen** o scope.
- Con prefix: lista as que casen, devoltas **sen** o scope (pero **con**
  o prefix orixinal preservado).
- Storage baleiro / cero claves no scope: `ok([])`.
- Importante: o consumidor non ve nunca o scope nas chaves devoltas
  (transparencia completa).

### 5.7 — clear (pseudo-código)

```ts
async clear(): Promise<Result<void>> {
  // Lista todas as claves do scope, despois bórraas individualmente.
  // NUNCA delegar a base.clear() (borraría todo o storage cross-scope).
  const listResult = await this.base.list(`${this.scope}:`)
  if (!listResult.ok) return listResult
  for (const fullKey of listResult.value) {
    const deleteResult = await this.base.delete(fullKey)
    if (!deleteResult.ok) return deleteResult
  }
  return ok(undefined)
}
```

**Decisión crítica de seguridade multi-tenant**: `clear()` **NUNCA** debe
chamar a `base.clear()` (borraría TODOS os scopes, incluído outros
tenants). Iteración explícita `list(scope:) → delete cada`.

**Trade-off documentado**: clear() en ScopedStorage é O(n) en claves
do scope, non O(1) como `base.clear()`. Aceptable: clear() é raro;
isolation é crítica.

### 5.8 — watch condicional (decisión crítica)

`StorageAdapter.watch?` é opcional. ScopedStorage **expón watch só se
base.watch existe** (preserva o contrato orixinal: consumidor sabe
detectar `if (storage.watch)` igual que con calquera adapter).

Implementación no constructor (asignación condicional do método):

```ts
export class ScopedStorage implements StorageAdapter {
  private readonly base: StorageAdapter
  private readonly scope: string

  // Asignación condicional; permanece undefined se base non a soporta
  readonly watch?: (key: string, callback: (value: unknown) => void) => () => void

  constructor(base: StorageAdapter, scope: string) {
    // ... validacións §5.3 ...
    this.base = base
    this.scope = scope

    if (typeof base.watch === 'function') {
      const baseWatch = base.watch.bind(base)
      const fullScope = `${scope}:`
      this.watch = (key, callback) => baseWatch(`${fullScope}${key}`, callback)
    }
    // senón, this.watch fica undefined
  }
  // ...
}
```

**Nota TypeScript**: `readonly watch?: ...` permite asignación no
constructor. exactOptionalPropertyTypes ten que aceptarse; se Biome ou
TS protestan polo non-asignamento na rama "senón", **engadir
explicitamente** `this.watch = undefined` (cero ambigüedade).

**Test**: usar un mock storage SEN `watch` para verificar que
`scopedStorage.watch` é tamén `undefined`.

### 5.9 — Anidación

`ScopedStorage(ScopedStorage(base, 's1'), 's2')` → claves físicas
`s2:s1:key`. **Funciona transparentemente sen lóxica especial**: cada
nivel só prefixa o seu scope.

Tests verifican que iso non rompe e que cross-scope isolation é
correcto.

### 5.10 — Determinismo

- Cero `Date.now`, `Math.random`.
- list() devolve claves na orde que devolve `base.list()` (en MemoryStorage,
  orde de inserción).
- watch() ordenamento determinado polo base.

### 5.11 — Cero modificación de pezas existentes

Cero modif de:
- `packages/storage/src/StorageAdapter.ts` (interface).
- `packages/storage/src/MemoryStorage.ts`.
- `packages/storage/src/LocalStorageAdapter.ts`.
- `packages/storage/src/IndexedDBAdapter.ts`.
- `packages/storage/src/SessionStorageAdapter.ts`.
- `packages/storage/src/FileSystemAdapter.ts`.
- `packages/common/` (cero ErrorCodes novos, cero exports).
- `packages/core/` (TreeRegistry, types, etc.).
- Outros tests existentes (cero modificación).

**SI se modifica**: `packages/storage/src/index.ts` (engadir
`export { ScopedStorage } from './ScopedStorage.js'`).

### 5.12 — Cobertura

- **`ScopedStorage.ts`**: **100% Stmts / Branch / Funcs / Lines**.
  Peza pequena e totalmente testable con `MemoryStorage` como base. Cero
  v8 ignores esperados.
- **Global storage**: ≥ baseline previo (a verificar empíricamente en T0).
  Cero regresión tolerada.

### 5.13 — Tests prescritos (~22)

**Reutilizar** `MemoryStorage` como base nos tests. Para testar a
ausencia de watch, crear un mock local sen método watch:

```ts
class StorageWithoutWatch implements StorageAdapter {
  private inner = new MemoryStorage()
  get = (key: string) => this.inner.get(key)
  set = (key: string, value: unknown) => this.inner.set(key, value)
  delete = (key: string) => this.inner.delete(key)
  list = (prefix?: string) => this.inner.list(prefix)
  clear = () => this.inner.clear()
  // NON expón watch
}
```

**Bloques esperados (~22 tests totais)**:

*Constructor (3):*
1. `scope=''` → throw Error.
2. `scope=':invalid'` → throw Error.
3. Scope válido (ex: 'tenant_a') → constrúe sen erro.

*Operacións básicas (6):*
4. set + get aplica prefixo (verificar inspectivamente: `base.get('tenant_a:foo')` recupera).
5. get(key) cando non existe → ok(null).
6. set sobreescribe valor existente.
7. delete elimina; get posterior devolve null.
8. delete sobre clave inexistente → ok (cero erro).
9. roundtrip dun obxecto complexo via JSON serialization.

*list (4):*
10. list() sen prefix → tódalas claves do scope, **sen** o scope no resultado.
11. list(prefix) → claves que casen, **sen** o scope.
12. list() en storage baleiro → ok([]).
13. list(prefix) con prefix non coincidente → ok([]).

*clear (3):*
14. clear() borra **só o scope**; outras claves físicas (outro scope, ou
    sen scope) **intactas**.
15. clear() en scope baleiro → ok.
16. clear() despois de set N claves → list() posterior devolve [].

*watch (3):*
17. Se base.watch existe, `scopedStorage.watch` é function.
18. watch dispara o callback con valor correcto cando set() actualiza.
19. watch undefined cando base non a expón (usar `StorageWithoutWatch`).

*Anidación + isolation (3):*
20. ScopedStorage(ScopedStorage(base, 's1'), 's2'): set+get funciona;
    inspectivamente, clave física é `s2:s1:key`.
21. Cross-tenant isolation: tenantA + tenantB sobre mesmo base; clear()
    en A non afecta a B.
22. Cross-tenant list(): tenantA.list() devolve só claves de A, mesmo
    se B ten claves no mesmo base.

### 5.14 — Test counts post-6.3 esperado
- **storage**: 171 + ~22 = **~193**.
- common: 60 intactos.
- core: 1481 intactos.
- **Total monorepo**: ~1734.

### 5.15 — Conveniencias TS / Biome

- `exactOptionalPropertyTypes: true` activa: para `watch?` definido
  condicionalmente, NUNCA asignar `undefined` explícitamente cando
  unha rama non o asigna; Biome/TS pode protestar. **Patrón recomendado**:
  ```ts
  readonly watch?: ...
  constructor(...) {
    // ...
    if (typeof base.watch === 'function') {
      this.watch = ...
    }
    // sen `else`. Watch fica undefined por non-asignación.
  }
  ```
  Se TS protesta (improbable con `readonly watch?`), engadir
  `as ScopedStorage['watch']` no asignamento; cero solucións con `any`.
- **Cero non-null assertions** (`!`); Biome rexéitaas.
- 2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `ScopedStorage` clase | Clase implements StorageAdapter | ScopedStorage.ts | ~110 |
| Validacións constructor | throw síncrono | ScopedStorage.ts | (dentro) |
| Export público | export { ScopedStorage } | storage/src/index.ts | +1 |
| Tests | 22 it() | ScopedStorage.test.ts | ~280 |

**Total estimado**: ~110 liñas de ScopedStorage.ts + ~280 liñas tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/storage/src/ScopedStorage.ts` (NOVO)
- `packages/storage/src/index.ts` (MODIFICADO: +1 export)
- `packages/storage/__tests__/ScopedStorage.test.ts` (NOVO)
- `.changeset/scoped-storage.md` (NOVO: minor para storage)
- `CHANGELOG.md` (modificado: nova `## [Unreleased]` ao principio)

**NON deben aparecer cambios en**:
- `packages/storage/src/MemoryStorage.ts` e outros adapters (5.11).
- `packages/storage/src/StorageAdapter.ts` (interface intacta).
- `packages/storage/__tests__/*.test.ts` (outros tests, cero modificación).
- `packages/common/` (cero ErrorCodes novos).
- `packages/core/` enteiro.
- `pnpm-lock.yaml`, `tsconfig.base.json`, `tsup.config.ts`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` ao principio/fin do ficheiro (estilo dos outros
adapters). 2 espazos, comilla simple, sen `;`, trailing commas, máx
100 cols, UTF-8 LF. TS strict, cero `any`. NON desactives Biome.

**Comparativa con outros adapters**: o estilo de `MemoryStorage.ts`
(132 liñas, JSDoc por método, INICIO/FIN comments) é o modelo a seguir.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/common/` (cero ErrorCodes novos).
- ❌ Modificar `packages/core/` (TreeRegistry NON precisa cambios; xa
  acepta calquera StorageAdapter polo contrato).
- ❌ Modificar outros adapters (MemoryStorage, LocalStorage, IndexedDB,
  SessionStorage, FileSystemAdapter, StorageAdapter.ts).
- ❌ Engadir `Result<>` ao return type do constructor (síncrono, throw).
- ❌ Delegar `clear()` a `base.clear()` (5.7: borraría cross-scope).
- ❌ Aceptar scope vacío ou con `:` (5.3: validación obrigatoria).
- ❌ Implementar `watch` se base non a expón (5.8: condicional).
- ❌ Permitir un options object no constructor (5.2: 2 args posicionais).
- ❌ Soportar separadores configurables (5.4: hardcoded `:`).
- ❌ Engadir lóxica especial para anidación (5.9: transparente).
- ❌ Cachear nada (cero estado interno fora de base + scope + watch).
- ❌ Validar contidos das claves do consumidor (5.5: transparente).
- ❌ Localizar mensaxes de erro do constructor (5.3: literal inglés).
- ❌ Engadir Date.now / Math.random.
- ❌ Implementar quotas (6.4).
- ❌ Implementar permissions (6.4).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Modificar tests existentes (cero modificación de outros .test.ts).
- ❌ Tolerar regresión de cobertura (6.1 L1; 6.2 L1).
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T11)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `8de28f6` como HEAD.

**T0.2** — Verificar `StorageAdapter` interface intacta (5 métodos
obrigatorios + watch? opcional):
```bash
grep -E "^\s*(get|set|delete|list|clear|watch)" packages/storage/src/StorageAdapter.ts
```

**T0.3** — Verificar `MemoryStorage` con watch implementado (para tests):
```bash
grep -n "watch(" packages/storage/src/MemoryStorage.ts
```

**T0.4** — Verificar índice storage actual (export pattern a imitar):
```bash
cat packages/storage/src/index.ts
```

**T0.5** — Baseline previo:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force            # esperado: 21/21
pnpm turbo run test --filter=@yggdrasil-forge/storage --force  # 171 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1** (5.2 L2).

### T1 — Crear ScopedStorage.ts

Crear `packages/storage/src/ScopedStorage.ts` segundo §5.

**Estrutura recomendada**:

```ts
// ── INICIO: ScopedStorage ──
// Adapter que envolve outro StorageAdapter e prefixa todas as claves
// cun scope. Usado para illar tenants nun storage compartido sen
// modificar o backend físico subxacente.
//
// Sub-fase 6.3

import { type Result, ok } from '@yggdrasil-forge/common'
import type { StorageAdapter } from './StorageAdapter.js'

const SEPARATOR = ':'

/**
 * Adapter que prefixa todas as claves cun `scope` antes de delegar a outro
 * `StorageAdapter`. Útil para illar tenants nun backend compartido.
 *
 * **Exemplo**:
 * ```ts
 * const base = new IndexedDBAdapter(...)
 * const tenantA = new ScopedStorage(base, 'tenant_a')
 * const tenantB = new ScopedStorage(base, 'tenant_b')
 * // tenantA.set('foo', 1) garda como 'tenant_a:foo'
 * // tenantA.clear() borra só claves baixo 'tenant_a:', nunca 'tenant_b:'
 * ```
 *
 * **Validación do scope**: rexéitase `''` e calquera scope que conteña
 * `':'` (reservado como separador). Lanza `Error` síncrono no constructor.
 *
 * **`watch` condicional**: expón `watch` só se o base storage a soporta
 * (preserva o contrato opcional de `StorageAdapter.watch?`). Comprobar
 * `if (scopedStorage.watch)` antes de chamar.
 *
 * **`clear()` é O(n)**: itera `list(scope:)` + `delete` cada clave para
 * preservar isolation cross-scope. NUNCA chama a `base.clear()`.
 *
 * **Anidación**: `new ScopedStorage(new ScopedStorage(base, 's1'), 's2')`
 * funciona transparentemente (claves físicas resultan `s2:s1:key`).
 */
export class ScopedStorage implements StorageAdapter {
  private readonly base: StorageAdapter
  private readonly scope: string
  private readonly prefix: string  // `${scope}:` precalculado

  readonly watch?: (key: string, callback: (value: unknown) => void) => () => void

  constructor(base: StorageAdapter, scope: string) {
    if (scope === '') {
      throw new Error('ScopedStorage: scope cannot be empty')
    }
    if (scope.includes(SEPARATOR)) {
      throw new Error(
        `ScopedStorage: scope cannot contain '${SEPARATOR}' (reserved as separator)`,
      )
    }
    this.base = base
    this.scope = scope
    this.prefix = `${scope}${SEPARATOR}`

    if (typeof base.watch === 'function') {
      const baseWatch = base.watch.bind(base)
      const prefix = this.prefix
      this.watch = (key, callback) => baseWatch(`${prefix}${key}`, callback)
    }
    // senón, this.watch fica undefined (por non-asignación)
  }

  async get(key: string): Promise<Result<unknown | null>> {
    return this.base.get(`${this.prefix}${key}`)
  }

  async set(key: string, value: unknown): Promise<Result<void>> {
    return this.base.set(`${this.prefix}${key}`, value)
  }

  async delete(key: string): Promise<Result<void>> {
    return this.base.delete(`${this.prefix}${key}`)
  }

  async list(prefix?: string): Promise<Result<string[]>> {
    const scopedPrefix = prefix !== undefined ? `${this.prefix}${prefix}` : this.prefix
    const result = await this.base.list(scopedPrefix)
    if (!result.ok) return result
    const cutLen = this.prefix.length
    return ok(result.value.map((k) => k.slice(cutLen)))
  }

  async clear(): Promise<Result<void>> {
    // Iterar list(scope:) + delete cada, para non borrar cross-scope.
    const listResult = await this.base.list(this.prefix)
    if (!listResult.ok) return listResult
    for (const fullKey of listResult.value) {
      const deleteResult = await this.base.delete(fullKey)
      /* v8 ignore next 3 -- MemoryStorage.delete non falla; defensivo para adapters con I/O */
      if (!deleteResult.ok) {
        return deleteResult
      }
    }
    return ok(undefined)
  }
}
// ── FIN: ScopedStorage ──
```

**Comentarios estilísticos**:
- `prefix` precalculado evita repetir concatenación en cada chamada.
- JSDoc detallado seguindo o estilo dos outros adapters.
- v8 ignore na rama defensiva de `clear()` (delete fail) — `MemoryStorage.delete`
  non falla nunca, é rama defensiva para adapters con I/O.
- Cero v8 ignore en `get/set/delete/list` (todas as ramas son
  alcanzables polos tests).

### T2 — Engadir export en index.ts

En `packages/storage/src/index.ts`, despois de
`export { FileSystemAdapter } from './FileSystemAdapter.js'`, engadir:

```ts
export { ScopedStorage } from './ScopedStorage.js'
```

**Sen** export de tipo Options (5.2: cero options object).

### T3 — Tests novos

Crear `packages/storage/__tests__/ScopedStorage.test.ts` con ~22 tests
segundo §5.13. Estilo: idéntico a `MemoryStorage.test.ts` (import
`isOk`, `isErr` de common; `describe` + `it`; `vi` para mocks se preciso).

**Helper interno recomendado** (para tests de watch undefined):

```ts
class StorageWithoutWatch implements StorageAdapter {
  private readonly inner = new MemoryStorage()
  get(key: string) { return this.inner.get(key) }
  set(key: string, value: unknown) { return this.inner.set(key, value) }
  delete(key: string) { return this.inner.delete(key) }
  list(prefix?: string) { return this.inner.list(prefix) }
  clear() { return this.inner.clear() }
  // intencionalmente sen watch
}
```

**Tests inspectivos** (para verificar a forma das claves físicas):
```ts
it('aplica prefixo: clave física é scope:key', async () => {
  const base = new MemoryStorage()
  const scoped = new ScopedStorage(base, 'tenant_a')
  await scoped.set('foo', 'bar')
  const direct = await base.get('tenant_a:foo')
  expect(isOk(direct)).toBe(true)
  if (isOk(direct)) {
    expect(direct.value).toBe('bar')
  }
})
```

### T4 — Verificación post-T3

```bash
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --filter=@yggdrasil-forge/storage --force
```

- ≥193 tests storage (171 previos + ~22 novos).
- 60 common + 1481 core **intactos**.

### T5 — Cobertura

```bash
pnpm --filter @yggdrasil-forge/storage run test:coverage
```

Verificar:
- `ScopedStorage.ts`: **100/100/100/100** (cero v8 ignores agás o
  prescrito en T1 para a rama defensiva de clear).
- Global storage: ≥ baseline previo (verificar empíricamente).

**Se algunha rama nova non é alcanzable por API pública**, anotar con
`/* v8 ignore next */` + xustificación inline (6.1 L1).

### T6 — Build do paquete

Verificar que o build do paquete storage funciona (require tsup):
```bash
pnpm --filter @yggdrasil-forge/storage build
```

Comprobar que `dist/index.d.ts` exporta `ScopedStorage`.

### T7 — Lint + format + grep

```bash
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/storage/src/ScopedStorage.ts packages/storage/__tests__/ScopedStorage.test.ts
```

**TODOS** en galego (= "all") en comentarios pode aparecer; falso positivo.

### T8 — Changeset

`.changeset/scoped-storage.md`:
```
---
'@yggdrasil-forge/storage': minor
---

feat(storage): add ScopedStorage adapter for tenant isolation (sub-phase 6.3)
```

### T9 — CHANGELOG

**Nova cabeceira `## [Unreleased]` ao principio** (DT-12, NON consolidar
coa de 6.2). Contido:

```
### Added
- `@yggdrasil-forge/storage`: nova clase `ScopedStorage` que envolve
  outro `StorageAdapter` e prefixa todas as claves cun `scope:`, para
  illar tenants nun storage compartido.
  - Constructor: `new ScopedStorage(base, scope)` (2 args posicionais,
    sen options).
  - Validación síncrona: rexeita scope vacío e scope con `':'`.
  - `clear()` itera `list(scope:) + delete` cada clave (O(n)) para
    preservar isolation cross-scope; NUNCA delega a `base.clear()`.
  - `watch` exposta condicionalmente só se o base storage a soporta.
  - Anidación soportada transparentemente
    (`ScopedStorage(ScopedStorage(base, 's1'), 's2')` resulta en
    claves `s2:s1:key`).

### Note
- Sub-fase 6.3 TERCEIRA da Fase 6.
- Quotas + Permissions DIFERIDOS a 6.4.
- **Subdivisión consciente**: MASTER §67 consolida `6.3 = ScopedStorage
  + Quotas + Permissions`; o director mantén a subdivisión adoptada en
  briefings 6.1+6.2 para reducir scope por sub-fase. Documentar no
  próximo ciclo de hixiene MASTER.
- **Cero modificación** de outros adapters, de `StorageAdapter`
  interface, de `packages/common/`, ou de `packages/core/`.
- **Cero ErrorCodes novos**.
```

### T10 — Verificación final completa

```bash
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --force                 # ~1734 totais
pnpm --filter @yggdrasil-forge/storage run test:coverage
pnpm lint && pnpm format:check
```

### T11 — Commit + push

Commit Conventional:
`feat(storage): add ScopedStorage adapter for tenant isolation (sub-phase 6.3)`

Push directo a `origin/main` (base `8de28f6`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 6.3 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 8de28f6)
✅ ScopedStorage clase implementing StorageAdapter
✅ Constructor: 2 args posicionais (base, scope), sen options
✅ Validacións síncronas:
   - scope='' lanza Error
   - scope con ':' lanza Error
✅ Separador hardcoded ':' (aliñado co schema TreeRegistry)
✅ clear() iterativo (NUNCA delega a base.clear) — isolation segura
✅ watch condicional: exposta só se base.watch existe
✅ Anidación transparente soportada (test verificado)
✅ Cross-tenant isolation testada
✅ CERO modificación de outros adapters
✅ CERO modificación de StorageAdapter interface
✅ CERO modificación de packages/common/
✅ CERO modificación de packages/core/
✅ CERO ErrorCodes novos
✅ T0.2 StorageAdapter interface intacta: <métodos verificados>
✅ T0.3 MemoryStorage.watch dispoñible: <confirmado>
✅ T0.4 storage/index.ts pattern verificado
✅ Tests: <N> pasan en storage (<delta> novos, 171 previos intactos)
   - 3 Constructor (validacións)
   - 6 Operacións básicas
   - 4 list
   - 3 clear
   - 3 watch (incluído undefined)
   - 3 Anidación + isolation
   Common: 60 intactos | Core: 1481 intactos
✅ Cobertura:
   - ScopedStorage.ts: 100% / 100% / 100% / 100%
   - Global storage: <X%> (baseline <Y%>; mantense ou sobe)
   - v8 ignore engadidos: <listado, se aplica, con liña + razón>
✅ Typecheck: 21/21 | Lint: 0/0 | Format: 0/0
✅ Build paquete storage: <ok>
✅ GREP ANTI-PLACEHOLDER (literal): <saída; falsos positivos doc.>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 6.3 TERCEIRA da Fase 6.
   - Quotas + Permissions (6.4) DIFERIDOS.
   - Subdivisión consciente: MASTER §67 consolida 6.3 completa;
     manténse a subdivisión 6.3/6.4 adoptada en 6.1+6.2.
✅ Changeset minor (storage) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 6.4 (Quotas + Permissions).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 6.3. Terceira sub-fase Fase 6. ScopedStorage como
adapter de illamento multi-tenant. Risco arquitectónico MOI baixo
(peza pequena, autocontida, contrato uniforme StorageAdapter,
decisións todas pre-resoltas, cero acoplamento con TreeRegistry).
Cero ErrorCodes novos, cero common, cero core, cero outros adapters
tocados. Calquera dúbida → ESCALAR.*
