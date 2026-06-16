# BRIEFING — SUB-FASE 6.4 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Cuarta sub-fase da Fase 6 (TreeRegistry + Multi-tenancy).** Engadir
> **Quotas** ao `TreeRegistry` xa existente: límites configurables de
> `maxUsers`, `maxBuildsPerUser`, `maxStorageBytes`. Validación previa
> a operacións críticas (`createEngine`, `saveBuild`, escritura interna
> a storage). **Permissions (6.5) DIFERIDAS**. Cero modificación de
> `packages/storage/`.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente 6.1+6.2+6.3).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2,
3.6.a L1, 4.3 L1, 5.2 L1+L2, 6.1 L1+L2, 6.2 L1**: calquera modificación
fóra de §6 require **ESCALAR ANTES DE APLICAR**. **APIs prescritas en
código exemplo deben verificarse empíricamente** (5.2 L2).

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 6.4 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 6.4 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.
NON consolidar coas previas.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas verificablemente
inalcanzables anótanse con `/* v8 ignore next */ + xustificación
inline`, NON tolerar baixadas globais de cobertura. **Cero regresión
da baseline 97.49% global core**.

**0.12 — MODIFICACIÓN DE PEZA EXISTENTE (importante)**: 6.4 modifica
`TreeRegistry.ts` (peza grande de 555+ liñas existente). 9 callsites
de `this.storage.set/delete` deben substituírse por helpers privados
con quota checks. Esta modificación é **decisión consciente do
director** (§5.6), non scope creep. Cero modificación funcional do
comportamento externo cando quotas é `undefined` (back-compat total
con 6.1, 6.2, 6.3).

---

## 1. IDENTIFICACIÓN

Sub-fase **6.4** de Yggdrasil Forge. **Cuarta da Fase 6**
(TreeRegistry + Multi-tenancy).

**Pezas**:

1. **`QuotaConfig` interface** pública exportada (3 campos opcionais).
2. **Engadir `quotas?: QuotaConfig`** a `TreeRegistryOptions`.
3. **Estado interno** en TreeRegistry: `quotas`, `bytesUsed`,
   `bytesPerKey`.
4. **2 helpers privados** `quotaCheckedSet`, `quotaCheckedDelete`
   que reemplazan os 9 callsites de `this.storage.set/delete` existentes.
5. **Validación previa** en `createEngine` (maxUsers) e `saveBuild`
   (maxBuildsPerUser).
6. **Reinicialización en `load()`** do accounting de bytes (só se
   maxStorageBytes definido).
7. **3 ErrorCodes novos** YGG_E033, E034, E035.
8. **Tests** (~28 novos).

**Cero modificación de pezas non listadas**: TreeEngine, SubtreeManager,
Federator, layouts, build management externo (saveBuild/loadBuild API
intacta para o consumidor), StorageAdapter, ScopedStorage, AggregateStats,
adapters concretos.

**Cero opt-in necesario para back-compat**: se `quotas: undefined`,
helpers privados delegan directo a storage; **cero overhead, cero
cambio observable**.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Spec MASTER §49 (sinatura fixada)**:

```typescript
const registry = new TreeRegistry(treeDef, {
  storage, cache,  // ← campos existentes en TreeRegistryOptions
  quotas: { maxUsers: 10000, maxBuildsPerUser: 50, maxStorageBytes: 100 * 1024 * 1024 }
})
```

**Auditoría do director (sobre commit `f6c41b5`, verificada empíricamente
en clone independente)**:

- `TreeRegistryOptions` actual:
  ```ts
  export interface TreeRegistryOptions {
    readonly storage: StorageAdapter
    readonly cache: TreeRegistryCacheConfig
    readonly locale?: Locale
  }
  ```
- **9 callsites de `this.storage.set/delete`** en TreeRegistry.ts (todos
  documentados por el director, liñas 208, 214, 444, 533, 576, 593,
  600, 612, 750). Estes son os 9 puntos onde se grava ou borra do
  storage e onde aplicará o quota check de maxStorageBytes.
- **6 callsites de `this.storage.get/list`** non modificados (cero
  impact en quotas; lecturas non gastan bytes).
- **Patrón estándar de error propagation**:
  ```ts
  const setResult = await this.storage.set(...)
  if (!setResult.ok) return setResult
  ```
- **ErrorCodes existentes**: ata YGG_E032 (53 totais). `STORAGE_QUOTA_EXCEEDED`
  (YGG_S003) **xa existe** pero é distinto: é o erro **físico** (backend
  cheo, ex: IndexedDB sin sitio). O noso `QUOTA_STORAGE_EXCEEDED` será
  o erro **lóxico** (config maxStorageBytes excedido). **Cero conflito
  semántico** — son dous dominios distintos.
- **Valores serializados a storage en TreeRegistry**: todos son
  **JSON-friendly** (Array.from(Set) en lugar de Set; objetos planos
  en lugar de Map). Polo tanto `JSON.stringify(value).length` é
  aproximación razoable para pesar bytes. Documentar como precondición.
- **Adapters de storage existentes** (MemoryStorage, LocalStorage, etc.)
  serializan internamente con JSON.stringify. **Cero cambio neles**.

**Caso de uso primario**: SaaS multi-tenant con plan freemium.
```ts
const baseStorage = new IndexedDBAdapter(...)
const tenantFree = new ScopedStorage(baseStorage, 'tenant_free')
const freeRegistry = new TreeRegistry(treeDef, {
  storage: tenantFree,
  cache: { strategy: 'lru', maxInMemory: 10, ttlMs: 60000 },
  quotas: { maxUsers: 100, maxBuildsPerUser: 5, maxStorageBytes: 10 * 1024 * 1024 }
})

const tenantPro = new ScopedStorage(baseStorage, 'tenant_pro')
const proRegistry = new TreeRegistry(treeDef, {
  storage: tenantPro,
  cache: { strategy: 'all-in-memory' },
  quotas: { maxUsers: 10000, maxBuildsPerUser: 50, maxStorageBytes: 100 * 1024 * 1024 }
})
```

Cada tenant ten os seus límites; combinación natural con ScopedStorage.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `f6c41b5` (hixiene MASTER post-6.3).
- 1481 core + 60 common + 193 storage = **~1734 monorepo limpo**.
- Typecheck 21/21, lint 0/0, format 0/0.
- 53 ErrorCodes existentes (ata YGG_E032).
- Global core cobertura **97.49%** (baseline post-6.2).
- Storage 100/96.73/100/100 (baseline post-6.3).
- DT abertas: DT-9, DT-11, DT-12, DT-14 a DT-21, DT-23, DT-24, DT-25
  (DT-22 PECHADA en 6.2).
- 9 callsites identificados para substitución por helpers privados.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao `TreeRegistry` existente: unha interface pública `QuotaConfig`
(3 campos opcionais), un campo `quotas?: QuotaConfig` a
`TreeRegistryOptions`, dous helpers privados `quotaCheckedSet` e
`quotaCheckedDelete` que envolven os 9 callsites de storage.set/delete
existentes con accounting de bytes (best-effort, JSON.stringify), e
validación previa de `maxUsers` en `createEngine` + `maxBuildsPerUser`
en `saveBuild`. **3 ErrorCodes novos** (YGG_E033, E034, E035).
**Cero opt-in necesario**: se `quotas` é `undefined`, helpers delegan
directo (back-compat absoluta con 6.1, 6.2, 6.3). **Cero modificación
de packages/storage/, cero modificación de adapters, cero modificación
de TreeEngine ou outras pezas core**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**MODIFICADO** `packages/core/src/engine/TreeRegistry.ts` (peza
existente; ~150 liñas engadidas + 9 substitucións mecánicas dos
callsites de storage.set/delete).
**MODIFICADO** `packages/core/src/engine/index.ts` (engadir
`export type { QuotaConfig }`).
**MODIFICADO** `packages/core/__tests__/engine/TreeRegistry.test.ts`
(engadir ~28 tests novos; cero modif dos existentes).
**MODIFICADO** `packages/common/src/errors/codes.ts` (engadir 3
ErrorCodes: E033, E034, E035).
**MODIFICADO** `packages/common/src/errors/messages.ts` (engadir 9
mensaxes [3 codes × 3 locales]).
**MODIFICADO** `CHANGELOG.md` (nova `## [Unreleased]` ao principio).
**NOVO** `.changeset/quotas-core.md` (minor para core).
**NOVO** `.changeset/quotas-common.md` (patch para common).

**Cero ficheiro novo en src/**. **Cero modificación de
packages/storage/**.

### 5.2 — QuotaConfig interface (FIXADA, non negociable)

```ts
export interface QuotaConfig {
  /**
   * Número máximo de usuarios (engines) que se poden rexistrar
   * neste registry. `createEngine` falla con `QUOTA_USERS_EXCEEDED`
   * se se intenta crear un cando xa hai maxUsers rexistrados.
   * Se non se define, sen límite.
   */
  readonly maxUsers?: number

  /**
   * Número máximo de builds por usuario. `saveBuild` falla con
   * `QUOTA_BUILDS_EXCEEDED` se o usuario xa ten maxBuildsPerUser
   * builds. `importBuilds` tamén valida por usuario.
   * Se non se define, sen límite.
   */
  readonly maxBuildsPerUser?: number

  /**
   * Número máximo de bytes acumulados en storage (escrituras feitas
   * polo TreeRegistry: engine states + builds + metadata). Calculado
   * como `JSON.stringify(value).length` por clave (best-effort).
   * Cualquera escritura interna que vaia exceder este límite falla
   * con `QUOTA_STORAGE_EXCEEDED`. Se non se define, sen límite.
   *
   * **Precondición**: storage values son JSON-serializables (cero
   * Set, Map, Date, etc. crús; o consumidor é responsable de pasalos
   * en forma JSON-friendly, como xa fai TreeRegistry internamente
   * con `Array.from(set)` etc.).
   */
  readonly maxStorageBytes?: number
}
```

**Os 3 campos son opcionais individualmente**. Cero campo significa
"esa cota sen límite". Cero `quotas` obj significa "todas as cotas
sen límite" = comportamento idéntico ao 6.3 pre-6.4.

### 5.3 — TreeRegistryOptions actualizado

```ts
export interface TreeRegistryOptions {
  readonly storage: StorageAdapter
  readonly cache: TreeRegistryCacheConfig
  readonly locale?: Locale
  /**
   * Cotas opcionais multi-tenant. Se non se define, cero límites
   * (back-compat con sub-fases anteriores).
   */
  readonly quotas?: QuotaConfig
}
```

Engadir o campo `quotas?` ao final, despois de `locale?`. Cero outras
modificacións á interface.

### 5.4 — ErrorCodes novos (3)

En `packages/common/src/errors/codes.ts`, despois de `APPLY_CHANGES_FAILED`:

```ts
QUOTA_USERS_EXCEEDED = 'YGG_E033',
QUOTA_BUILDS_EXCEEDED = 'YGG_E034',
QUOTA_STORAGE_EXCEEDED = 'YGG_E035',
```

En `packages/common/src/errors/messages.ts`, despois das mensaxes de
`APPLY_CHANGES_FAILED`, engadir os 3 bloques:

```ts
[ErrorCode.QUOTA_USERS_EXCEEDED]: {
  gl: 'Cota de usuarios excedida: {current}/{max}',
  es: 'Cuota de usuarios excedida: {current}/{max}',
  en: 'User quota exceeded: {current}/{max}',
},
[ErrorCode.QUOTA_BUILDS_EXCEEDED]: {
  gl: 'Cota de builds excedida para usuario {userId}: {current}/{max}',
  es: 'Cuota de builds excedida para usuario {userId}: {current}/{max}',
  en: 'Build quota exceeded for user {userId}: {current}/{max}',
},
[ErrorCode.QUOTA_STORAGE_EXCEEDED]: {
  gl: 'Cota de bytes en storage excedida: {current}/{max}',
  es: 'Cuota de bytes en storage excedida: {current}/{max}',
  en: 'Storage bytes quota exceeded: {current}/{max}',
},
```

**Cero punto final** (estilo do proxecto). **Placeholders verificados
empíricamente compatibles** co patrón `{key}` que usa `interpolate()`
de common.

**Cero conflito con STORAGE_QUOTA_EXCEEDED (YGG_S003)**: ese é o erro
físico do backend (IndexedDB cheo, etc.). O noso QUOTA_STORAGE_EXCEEDED
(YGG_E035) é o lóxico (config maxStorageBytes do TreeRegistry).
**Documentar a distinción nos JSDoc** de QuotaConfig.maxStorageBytes.

### 5.5 — Estado interno

Engadir como **campos privados** de `TreeRegistry`:

```ts
/** Quotas configuradas; undefined se non se pasaron en options. */
private readonly quotas: QuotaConfig | undefined

/**
 * Total acumulado de bytes en storage (só rastreado se
 * quotas?.maxStorageBytes !== undefined). 0 se non aplicable.
 */
private bytesUsed = 0

/**
 * Bytes acumulados por clave (para restar correctamente en
 * delete/overwrite). Baleiro se non se rastrean bytes.
 */
private readonly bytesPerKey = new Map<string, number>()
```

Asignación de `quotas` no constructor:

```ts
// Engadir ao final do constructor existente, antes do bloque final
this.quotas = options.quotas
```

Cero engadir `this.bytesUsed = 0` no constructor (xa inicializa con
field initializer `= 0`).

### 5.6 — Helpers privados (CRÍTICO)

Engadir na sección `// ── Private helpers ──` xa existente, **antes**
de `isUnlocked` (ou nun bloque coherente; pode ir despois doutros
helpers existentes con criterio):

```ts
/**
 * Wrapper de `storage.set` con quota check. Se quotas.maxStorageBytes
 * está definido, pesa o valor con `JSON.stringify(value).length`,
 * comproba se a operación excedería o límite, e só procede se cabe.
 * Se non hai quotas activas, delega directo a storage.set (cero
 * overhead, cero tracking).
 *
 * @internal
 */
private async quotaCheckedSet(key: string, value: unknown): Promise<Result<void>> {
  const maxBytes = this.quotas?.maxStorageBytes
  if (maxBytes === undefined) {
    // Cero accounting cando non hai cota de bytes
    return this.storage.set(key, value)
  }

  const newSize = JSON.stringify(value).length
  const previousSize = this.bytesPerKey.get(key) ?? 0
  const projectedTotal = this.bytesUsed - previousSize + newSize

  if (projectedTotal > maxBytes) {
    return err(
      new YggdrasilError(
        ErrorCode.QUOTA_STORAGE_EXCEEDED,
        getErrorMessage(
          ErrorCode.QUOTA_STORAGE_EXCEEDED,
          this.locale,
          { current: projectedTotal, max: maxBytes },
        ),
      ),
    )
  }

  const setResult = await this.storage.set(key, value)
  if (!setResult.ok) return setResult

  // Actualizar accounting só tras escrita exitosa
  this.bytesPerKey.set(key, newSize)
  this.bytesUsed = projectedTotal
  return ok(undefined)
}

/**
 * Wrapper de `storage.delete` con accounting de bytes. Se hai cota
 * de bytes activa, resta o tamaño previo da clave. Se non, delega
 * directo.
 *
 * @internal
 */
private async quotaCheckedDelete(key: string): Promise<Result<void>> {
  if (this.quotas?.maxStorageBytes === undefined) {
    return this.storage.delete(key)
  }

  const deleteResult = await this.storage.delete(key)
  if (!deleteResult.ok) return deleteResult

  const previousSize = this.bytesPerKey.get(key) ?? 0
  if (previousSize > 0) {
    this.bytesUsed -= previousSize
    this.bytesPerKey.delete(key)
  }
  return ok(undefined)
}
```

### 5.7 — Substitución dos 9 callsites (mecánico)

Substituír literalmente cada un destes 9 callsites:

| Liña aprox. | Antes | Despois |
|---|---|---|
| 208 | `await this.storage.delete(\`engine:${userId}:state\`)` | `await this.quotaCheckedDelete(\`engine:${userId}:state\`)` |
| 214 | `await this.storage.delete(\`build:${buildId}\`)` | `await this.quotaCheckedDelete(\`build:${buildId}\`)` |
| 444 | `const setResult = await this.storage.set(\`build:${buildId}\`, build)` | `const setResult = await this.quotaCheckedSet(\`build:${buildId}\`, build)` |
| 533 | `await this.storage.delete(\`build:${buildId}\`)` | `await this.quotaCheckedDelete(\`build:${buildId}\`)` |
| 576 | `await this.storage.set(\`build:${build.id}\`, build)` | `await this.quotaCheckedSet(\`build:${build.id}\`, build)` |
| 593 | `await this.storage.set('registry:userIds', Array.from(this.userIds))` | `await this.quotaCheckedSet('registry:userIds', Array.from(this.userIds))` |
| 600 | `await this.storage.set('registry:buildsIndex', indexObj)` | `await this.quotaCheckedSet('registry:buildsIndex', indexObj)` |
| 612 | `await this.storage.set('registry:meta', {...})` | `await this.quotaCheckedSet('registry:meta', {...})` |
| 750 | `return await this.storage.set(\`engine:${userId}:state\`, engine.getSnapshot())` | `return await this.quotaCheckedSet(\`engine:${userId}:state\`, engine.getSnapshot())` |

**Substitución mecánica**. **Cero outra modificación funcional**.

**IMPORTANTE**: as liñas 208 e 214 están dentro de `removeEngine`,
que actualmente non comproba o `setResult` (fai await directo sen
asignar resultado). Verificar empíricamente; se é así, **manter o
mesmo patrón** (chamar `quotaCheckedDelete` con `await` sen check, o
side effect interno de accounting acontece igual). Iso preserva o
comportamento idempotente do removeEngine.

### 5.8 — Validación maxUsers en createEngine

Modificar `createEngine` para engadir un check **ANTES** da
verificación actual de "user xa existe". Pseudo-código (engadir
inmediatamente despois da entrada do método e antes da comprobación
de existencia do userId):

```ts
async createEngine(userId: string, build?: Build): Promise<Result<TreeEngine>> {
  // ── Check maxUsers ──
  if (this.quotas?.maxUsers !== undefined) {
    const currentUsers = this.userIds.size
    if (!this.userIds.has(userId) && currentUsers + 1 > this.quotas.maxUsers) {
      return err(
        new YggdrasilError(
          ErrorCode.QUOTA_USERS_EXCEEDED,
          getErrorMessage(
            ErrorCode.QUOTA_USERS_EXCEEDED,
            this.locale,
            { current: currentUsers + 1, max: this.quotas.maxUsers },
          ),
        ),
      )
    }
  }
  // ── Comprobación existente: userId xa rexistrado ──
  if (this.userIds.has(userId)) {
    // ... patrón existente ...
  }
  // ... resto do método intacto ...
}
```

**Importante**: o check **só se aplica se userId é NOVO** (cero
double-counting cando o consumidor chama createEngine sobre un userId
xa existente para recuperar do cache). O check `!this.userIds.has(userId)`
garante iso.

### 5.9 — Validación maxBuildsPerUser en saveBuild

Modificar `saveBuild` para engadir un check **ANTES** de construír o
objeto Build (e antes do storage.set):

```ts
async saveBuild(
  userId: string,
  buildLabel?: LocalizedString,
): Promise<Result<Build>> {
  // ... validacións existentes (userId rexistrado, engine en cache) ...

  // ── Check maxBuildsPerUser ──
  if (this.quotas?.maxBuildsPerUser !== undefined) {
    const currentBuilds = this.buildsIndex.get(userId)?.size ?? 0
    if (currentBuilds + 1 > this.quotas.maxBuildsPerUser) {
      return err(
        new YggdrasilError(
          ErrorCode.QUOTA_BUILDS_EXCEEDED,
          getErrorMessage(
            ErrorCode.QUOTA_BUILDS_EXCEEDED,
            this.locale,
            {
              userId,
              current: currentBuilds + 1,
              max: this.quotas.maxBuildsPerUser,
            },
          ),
        ),
      )
    }
  }
  // ... resto do método intacto: construír build, chamar quotaCheckedSet, etc. ...
}
```

**Cero modificación de importBuilds en 6.4**: importBuilds chama
internamente a `quotaCheckedSet` que xa enforza maxStorageBytes. Para
maxBuildsPerUser en importBuilds, **DIFERIDO** a unha sub-fase futura
se require (cero caso documentado actualmente; o importBuilds asume
restore from export legítimo).

**Documentar** no JSDoc de importBuilds: "Bypassa maxBuildsPerUser
intencionalmente (usuarios poden importar arquivos exportados
previamente sen ser bloqueados; maxStorageBytes segue activo)".

### 5.10 — Reinicialización en load()

Modificar `load()` para reconstruír o accounting **só se maxStorageBytes
está definido**. Engadir bloque despois das chamadas existentes que
restauran userIds, buildsIndex, meta:

```ts
async load(): Promise<Result<void>> {
  // ... código existente que restaura userIds, buildsIndex, meta ...

  // ── Reconstrución de accounting de bytes (só se maxStorageBytes activo) ──
  if (this.quotas?.maxStorageBytes !== undefined) {
    this.bytesUsed = 0
    this.bytesPerKey.clear()
    const listResult = await this.storage.list()
    if (!listResult.ok) return listResult
    for (const key of listResult.value) {
      const getResult = await this.storage.get(key)
      if (!getResult.ok) return getResult
      if (getResult.value === null) continue
      const size = JSON.stringify(getResult.value).length
      this.bytesPerKey.set(key, size)
      this.bytesUsed += size
    }
  }

  // ... resto do método intacto: cargar engines según strategy ...
}
```

**Custo**: O(n) sobre todas as claves do storage. Aceptable porque
load() é raro (unha vez por arranque). Documentar como precondición.

**Importante**: o `storage.list()` aquí lista **todas** as claves do
storage (NON un prefixo). Iso é intencional: o accounting é sobre o
total que TreeRegistry escribiu. **Pero**: se o storage está
compartido (sen ScopedStorage), as claves de outros consumidores tamén
se contan. **Documentar** que para multi-tenancy correcto, **usar
SEMPRE un ScopedStorage** como base.

### 5.11 — Determinismo

- Cero `Date.now()`, `Math.random()` nos novos helpers.
- `JSON.stringify` é determinista para JSON-serializable values con
  ordenamento de claves consistente (a maioría dos runtimes JS xa
  iteran objetos en orde de inserción). Cero workaround necesario.

### 5.12 — Cero efectos secundarios cando quotas undefined

**Verificable empíricamente**: con `quotas: undefined`, todos os
helpers deveñen pass-through:
- `quotaCheckedSet` → `this.storage.set` directo, **cero JSON.stringify**.
- `quotaCheckedDelete` → `this.storage.delete` directo, **cero bytesPerKey
  touch**.
- `createEngine` salta o check (cero cambio funcional).
- `saveBuild` salta o check (cero cambio funcional).
- `load()` salta o bloque de reconstrución (cero `list+get all`).

**Tests específicos verifican back-compat**: sub-fase 6.1-6.3 tests
seguen pasando intactos sen modificación.

### 5.13 — Cobertura

- **`TreeRegistry.ts`**: ≥98.36% Stmts / ≥90% Branch (manter baseline
  post-6.2). Os ~150 liñas novas deben estar ao 100% ou con v8 ignore
  xustificado para ramas defensivas.
- **Global core**: ≥97.49% (baseline post-6.2). **Cero regresión
  tolerada** (lección 6.1 L1).
- **common**: 100% mantida (3 ErrorCodes engadidos coas súas mensaxes,
  cero código novo).

### 5.14 — Tests prescritos (~28)

Engadir bloque `describe('TreeRegistry — quotas', ...)` en
`TreeRegistry.test.ts`. **Cero modificación dos describes existentes
de 6.1, 6.2**.

**Bloques esperados**:

*Back-compat (5):*
1. Sen quotas (undefined): createEngine funciona ata 100 users.
2. Sen quotas: saveBuild funciona ata 100 builds por user.
3. Sen quotas: save/load roundtrip funciona sen cambio.
4. Cero overhead: con quotas undefined, bytesPerKey segue baleiro
   tras N escrituras (verificable indirectamente: load() non escanea).
5. quotas: {} (obx vacío sen campos) equivale a undefined.

*maxUsers (5):*
6. createEngine excede maxUsers → QUOTA_USERS_EXCEEDED. Mensaxe ten
   {current}/{max} interpolados.
7. createEngine no límite exacto: maxUsers=10, 10º createEngine ok,
   11º falla.
8. createEngine sobre userId existente cando maxUsers cheo: ok
   (cero double-counting).
9. removeEngine libera quota: createEngine novo despois é ok.
10. maxUsers=0: calquera createEngine falla.

*maxBuildsPerUser (5):*
11. saveBuild excede maxBuildsPerUser → QUOTA_BUILDS_EXCEEDED. Mensaxe
    ten {userId}/{current}/{max}.
12. Distintos usuarios contan independentemente.
13. removeBuild libera quota; saveBuild novo é ok.
14. maxBuildsPerUser=0: calquera saveBuild falla.
15. importBuilds NON enforza maxBuildsPerUser (documentado §5.9).

*maxStorageBytes (8):*
16. quotaCheckedSet excede → QUOTA_STORAGE_EXCEEDED. Mensaxe ten
    {current}/{max} en bytes.
17. quotaCheckedDelete libera bytes; set posterior é ok.
18. Sobreescribir clave existente: bytes calculados correctamente
    (resta previo, suma novo).
19. maxStorageBytes=0: calquera set falla.
20. bytesUsed correcto tras N escrituras (test inspectivo via
    propiedades públicas si non existen, ou via try-saveBuild en
    límite).
21. load() reconstrúe accounting: arrancar registry novo + load() →
    bytesUsed coincide cos datos persistidos.
22. load() con maxStorageBytes undefined: cero escaneo (verificable
    mockeando storage.list para contar chamadas).
23. createEngine con build inicial que excede maxStorageBytes →
    QUOTA_STORAGE_EXCEEDED no momento de persistir.

*Integración cross-quota (3):*
24. Todas as 3 quotas activas simultaneamente: cada unha enforzada
    no seu punto.
25. Quotas + ScopedStorage: load() escanea só claves do scope cando
    se usa ScopedStorage como base.
26. Quotas + 3 cache strategies: comportamento consistente.

*Localización (2):*
27. Mensaxes en locale='es': interpolación correcta.
28. Mensaxes en locale='en': interpolación correcta.

**Total: ~28 tests novos**. Baseline post-6.4 esperado: 1481 + 28 =
**1509 core**.

### 5.15 — Test counts esperados post-6.4

- **core**: 1481 + ~28 = **~1509**.
- **common**: 60 intactos (cero novos; só engadidas entradas a táboas
  internas que xa están testadas).
- **storage**: 193 intactos.
- **Total monorepo**: ~1762.

### 5.16 — Locale 'gl' default

Recordatorio: `locale: 'gl'` é o default. As mensaxes de erro
emitidas polos novos códigos respectan `this.locale` que pode ter
sido configurado polo constructor. Tests devolvelo ao locale por
defecto ou explicitamente probar outros locales.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `QuotaConfig` interface | Tipo público | TreeRegistry.ts | ~25 (incl. JSDoc) |
| Campo `quotas?` en TreeRegistryOptions | +1 liña | TreeRegistry.ts | +5 |
| Campos privados `quotas`, `bytesUsed`, `bytesPerKey` | +3 fields | TreeRegistry.ts | ~10 |
| Asignación de `this.quotas` no constructor | +1 liña | TreeRegistry.ts | +1 |
| `quotaCheckedSet` helper | Método privado | TreeRegistry.ts | ~30 |
| `quotaCheckedDelete` helper | Método privado | TreeRegistry.ts | ~15 |
| 9 substitucións mecánicas storage.set/delete | Edits | TreeRegistry.ts | (mecánico) |
| Check maxUsers en createEngine | +14 liñas | TreeRegistry.ts | ~14 |
| Check maxBuildsPerUser en saveBuild | +18 liñas | TreeRegistry.ts | ~18 |
| Reconstrución de accounting en load() | +12 liñas | TreeRegistry.ts | ~12 |
| Export QuotaConfig | export type | engine/index.ts | +1 |
| 3 ErrorCodes | enum entries | common/codes.ts | +3 |
| 9 mensaxes | dict entries | common/messages.ts | +20 |
| Tests | Describe block | TreeRegistry.test.ts | ~480 |

**Total estimado**: ~150 liñas novas en TreeRegistry.ts + 9 substitucións
mecánicas + ~480 liñas de tests + 23 liñas en common.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/core/src/engine/TreeRegistry.ts` (MODIFICADO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +1 export type)
- `packages/core/__tests__/engine/TreeRegistry.test.ts` (MODIFICADO: +28 tests)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +3 ErrorCodes)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +9 mensaxes)
- `.changeset/quotas-core.md` (NOVO: minor para core)
- `.changeset/quotas-common.md` (NOVO: patch para common)
- `CHANGELOG.md` (modificado: nova `## [Unreleased]` ao principio)

**NON deben aparecer cambios en**:
- `packages/storage/` enteiro (cero adapters tocados, cero
  ScopedStorage modificada).
- `packages/common/src/index.ts` (ErrorCode xa exportado, cero novo
  símbolo público a engadir).
- TreeEngine, SubtreeManager, Federator, ou outras pezas de core.
- Tipos NodeDef, EdgeDef, TreeDef, TreeState, NodeInstance, Build,
  TreeChange.
- `pnpm-lock.yaml`, `tsconfig.base.json`, `tsup.config.ts`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── ... ──` para secciones novas (`// ── Quotas (validacións) ──`,
`// ── Quota accounting ──`). 2 espazos, comilla simple, sen `;`,
trailing commas, máx 100 cols, UTF-8 LF. TS strict, cero `any`. NON
desactives Biome.

**Cero punto final** nas mensaxes de erro (estilo do proxecto;
verificado en STORAGE_QUOTA_EXCEEDED e demais YGG_*).

**JSDoc completo en castelán/galego** para:
- `QuotaConfig` interface.
- `quotas?` field en TreeRegistryOptions.
- Helpers privados `quotaCheckedSet`, `quotaCheckedDelete`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/` (5.1: cero adapters tocados, cero
  StorageAdapter, cero ScopedStorage).
- ❌ Engadir validación en `importBuilds` para maxBuildsPerUser (5.9:
  intencionalmente bypass).
- ❌ Cambiar a API pública existente (`createEngine`, `saveBuild`,
  etc. seguen co mesmo signature; só ENGADEN posibles erros novos).
- ❌ Modificar tests existentes de 6.1, 6.2, 6.3 (cero modif; teñen
  que seguir pasando intactos).
- ❌ Implementar accounting de bytes via wrapper externo
  (QuotaStorageAdapter ou similar). **Vai en TreeRegistry** (5.6).
- ❌ Pesar bytes con outra técnica distinta de `JSON.stringify(value).length`
  (5.2: precondición; consistente con que storage values son
  JSON-friendly).
- ❌ Tracking de bytes cando maxStorageBytes está undefined (5.12:
  cero overhead).
- ❌ Implementar Permissions (DIFERIDO a 6.5).
- ❌ Refactorizar pezas de TreeRegistry alén das 9 substitucións
  mecánicas + 3 checks novos + 1 reconstrución en load() (cero scope
  creep).
- ❌ Engadir Quotas activas como default. **Default: undefined**
  (back-compat).
- ❌ Reutilizar STORAGE_QUOTA_EXCEEDED (YGG_S003) para o caso lóxico
  (5.4: son dominios distintos; o noso é YGG_E035).
- ❌ Permitir `maxUsers: -1` ou similar como sinal de "ilimitado".
  Para ilimitado, **non pasar o campo** (undefined).
- ❌ Engadir `Date.now()`, `Math.random()` nos novos helpers.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Tolerar regresión de cobertura (6.1 L1).
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T13)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `f6c41b5` como HEAD.

**T0.2** — Verificar que `TreeRegistryOptions` ten 3 campos actuais
(storage, cache, locale?):
```bash
grep -A 8 "interface TreeRegistryOptions" packages/core/src/engine/TreeRegistry.ts
```

**T0.3** — Verificar callsites a substituír (deben ser 9):
```bash
grep -nE "this\.storage\.(set|delete)" packages/core/src/engine/TreeRegistry.ts | wc -l
# esperado: 9
```

**T0.4** — Verificar que `APPLY_CHANGES_FAILED = 'YGG_E032'` é o
último ErrorCode da familia YGG_E:
```bash
grep "YGG_E0[0-9][0-9]" packages/common/src/errors/codes.ts | tail -3
```

**T0.5** — Verificar que `STORAGE_QUOTA_EXCEEDED` existe e ten mensaxe
xenérica (para confirmar que é distinto do noso novo):
```bash
grep -A 4 "STORAGE_QUOTA_EXCEEDED" packages/common/src/errors/messages.ts
```

**T0.6** — Baseline previo:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force            # esperado: 21/21
pnpm turbo run test --filter=@yggdrasil-forge/core --force  # 1481
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 3 ErrorCodes en common

En `packages/common/src/errors/codes.ts`, despois de
`APPLY_CHANGES_FAILED = 'YGG_E032'`, engadir:
```ts
QUOTA_USERS_EXCEEDED = 'YGG_E033',
QUOTA_BUILDS_EXCEEDED = 'YGG_E034',
QUOTA_STORAGE_EXCEEDED = 'YGG_E035',
```

### T2 — Engadir 9 mensaxes en common

En `packages/common/src/errors/messages.ts`, despois das mensaxes de
`APPLY_CHANGES_FAILED`, engadir os 3 bloques literais de §5.4.

### T3 — Build de common

```bash
pnpm --filter @yggdrasil-forge/common build
```

Verificar que o build é ok e que `dist/index.d.ts` ten os 3 novos
membros do enum ErrorCode.

### T4 — Engadir QuotaConfig interface en TreeRegistry.ts

Engadir despois de `TreeRegistryCacheConfig` (e antes de
`TreeRegistryOptions`) segundo §5.2 literal.

### T5 — Actualizar TreeRegistryOptions

Engadir o campo `quotas?` ao final da interface segundo §5.3.

### T6 — Engadir campos privados

Engadir os 3 campos privados (`quotas`, `bytesUsed`, `bytesPerKey`)
na sección de campos da clase, antes do constructor (estilo do
proxecto).

Asignar `this.quotas = options.quotas` no constructor.

### T7 — Engadir helpers privados

En `// ── Private helpers ──` xa existente, engadir `quotaCheckedSet`
e `quotaCheckedDelete` segundo §5.6 literal. Importa `err`,
`YggdrasilError`, `ErrorCode`, `getErrorMessage` do common se algún
non está xa importado (probablemente xa o están todos).

### T8 — Substituír os 9 callsites

Aplicar mecánicamente a táboa de §5.7. **Cero outra modificación nas
liñas afectadas**.

Auditoría post-T8:
```bash
grep -nE "this\.storage\.(set|delete)" packages/core/src/engine/TreeRegistry.ts
# esperado: 0 matches (todos substituídos)
grep -nE "this\.quotaChecked(Set|Delete)" packages/core/src/engine/TreeRegistry.ts | wc -l
# esperado: 9 (uso) + 2 (definición do helper) = 11
```

### T9 — Engadir checks de validación

- `createEngine`: engadir check de maxUsers segundo §5.8.
- `saveBuild`: engadir check de maxBuildsPerUser segundo §5.9.
- `load()`: engadir bloque de reconstrución de accounting segundo §5.10.

### T10 — Engadir export en engine/index.ts

```ts
export type {
  TreeRegistryOptions,
  TreeRegistryCacheConfig,
  AggregateStats,
  QuotaConfig,        // ← NOVO
} from './TreeRegistry.js'
```

### T11 — Tests novos

Engadir bloque `describe('TreeRegistry — quotas', ...)` con ~28 tests
segundo §5.14. Helper recomendado para tests con quotas:

```ts
function makeOptionsWithQuotas(quotas: QuotaConfig): TreeRegistryOptions {
  return {
    storage: new MemoryStorage(),
    cache: { strategy: 'all-in-memory' },
    quotas,
  }
}
```

Para os tests inspectivos de `bytesUsed`: como é privado, **non testar
directamente**. Testar **comportamento observable**:
- "registry con maxStorageBytes=X; intentar persistir Y bytes resulta
  en erro".
- "tras delete, set Y bytes funciona".

Cero acceso a `(registry as any).bytesUsed` (lección 5.2 L2 inversa:
cero hacks via `any`).

### T12 — Verificación

```bash
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm turbo run test --filter=@yggdrasil-forge/common --force
pnpm --filter @yggdrasil-forge/core run test:coverage
pnpm lint && pnpm format:check
```

- ≥1509 tests core (1481 previos + ~28 novos).
- 60 common (intactos; cero novos esperados).
- 193 storage intactos.
- Cobertura: TreeRegistry.ts ≥98.36% Stmts / ≥90% Branch.
- Global core ≥97.49%.

**Se algunha rama defensiva nova non é alcanzable por API pública**,
anotar con `/* v8 ignore next */` + xustificación inline (lección
6.1 L1).

### T13 — Changesets + CHANGELOG

`.changeset/quotas-core.md`:
```
---
'@yggdrasil-forge/core': minor
---

feat(core): add Quotas to TreeRegistry (sub-phase 6.4)
```

`.changeset/quotas-common.md`:
```
---
'@yggdrasil-forge/common': patch
---

feat(common): add quota ErrorCodes E033..E035 (sub-phase 6.4)
```

**CHANGELOG**: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
Contido:

```
### Added
- `@yggdrasil-forge/core`: cotas configurables no `TreeRegistry` para
  multi-tenancy. Nova interface pública `QuotaConfig` con tres campos
  opcionais individuais:
  - `maxUsers`: número máximo de usuarios rexistrados (`createEngine`
    falla con `QUOTA_USERS_EXCEEDED` cando se excede).
  - `maxBuildsPerUser`: builds máximos por usuario (`saveBuild` falla
    con `QUOTA_BUILDS_EXCEEDED` cando se excede; `importBuilds` bypassa
    intencionalmente para permitir restauración).
  - `maxStorageBytes`: total de bytes acumulados nas escrituras de
    TreeRegistry (`JSON.stringify(value).length` por clave; helper
    privado `quotaCheckedSet`/`Delete` envolve os 9 callsites
    existentes). Reconstrución do accounting en `load()` (escaneo
    O(n) só se maxStorageBytes está activo).
- `@yggdrasil-forge/common`: 3 ErrorCodes novos `YGG_E033`
  `QUOTA_USERS_EXCEEDED`, `YGG_E034` `QUOTA_BUILDS_EXCEEDED`,
  `YGG_E035` `QUOTA_STORAGE_EXCEEDED`. Mensaxes localizadas gl/es/en
  con placeholders `{current}/{max}` (e `{userId}` para builds).

### Note
- Sub-fase 6.4 CUARTA da Fase 6. Permissions (6.5) DIFERIDAS.
- **Cero opt-in necesario para back-compat**: `quotas: undefined`
  resulta en pass-through directo (cero JSON.stringify, cero tracking).
- **Distinción semántica**: `QUOTA_STORAGE_EXCEEDED` (YGG_E035) é o
  límite **lóxico** (config do registry); `STORAGE_QUOTA_EXCEEDED`
  (YGG_S003) preexistente é o límite **físico** (backend de storage
  cheo). Son dominios distintos; ambos coexisten.
- **Precondición de uso correcto multi-tenant**: combinar con
  `ScopedStorage` (6.3) para que `maxStorageBytes` non conte claves
  de outros tenants no mesmo backend.
- **Cero modificación de packages/storage/**. Cero modificación de
  pezas de core fora de TreeRegistry.
```

### T14 — Commit + push

Commit Conventional:
`feat(core): add Quotas to TreeRegistry (sub-phase 6.4)`

Push directo a `origin/main` (base `f6c41b5`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 6.4 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base f6c41b5)
✅ QuotaConfig interface pública exportada (3 campos opcionais)
✅ TreeRegistryOptions estendido con quotas? (back-compat)
✅ 3 ErrorCodes novos: YGG_E033, E034, E035 (3 locales cada un)
✅ 2 helpers privados (quotaCheckedSet/Delete) envolvendo 9
   callsites de storage.set/delete; pass-through cando quotas
   undefined (cero overhead)
✅ Check maxUsers en createEngine (cero double-count en userIds
   existentes)
✅ Check maxBuildsPerUser en saveBuild
✅ importBuilds bypassa maxBuildsPerUser intencionalmente (doc)
✅ Reconstrución de accounting en load() (O(n), só se maxStorageBytes)
✅ CERO modificación de packages/storage/
✅ CERO modificación de TreeEngine, SubtreeManager, Federator
✅ CERO modificación de tests existentes
✅ T0.2 TreeRegistryOptions inicial verificada: <3 campos>
✅ T0.3 callsites previos: 9 confirmados
✅ T0.4 último YGG_E0XX: E032 (APPLY_CHANGES_FAILED)
✅ T0.5 STORAGE_QUOTA_EXCEEDED (YGG_S003) intacto e distinto
✅ Tests: <N> pasan en core (<delta> novos, 1481 previos intactos)
   - 5 Back-compat
   - 5 maxUsers
   - 5 maxBuildsPerUser
   - 8 maxStorageBytes
   - 3 Cross-quota
   - 2 Localización
   Common: 60 intactos | Storage: 193 intactos
✅ Cobertura:
   - TreeRegistry.ts: <X%> Stmts / <Y%> Branch / <Z%> Funcs / <W%> Lines
   - Global core: <X%> (baseline 97.49%; cero regresión)
   - v8 ignore engadidos: <listado se aplica>
✅ Typecheck: 21/21 | Lint: 0/0 | Format: 0/0
✅ Build paquete common: ok (3 ErrorCodes novos en dist/)
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
✅ Substitución 9 callsites verificada: grep da 0 storage.set/delete
   direct, 9 quotaCheckedSet/Delete
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 6.4 CUARTA da Fase 6.
   - Permissions (6.5) DIFERIDAS; modelo completo en 8.4.
   - Distinción QUOTA_STORAGE_EXCEEDED (lóxico) vs
     STORAGE_QUOTA_EXCEEDED (físico) documentada.
   - JSON.stringify(value).length como aproximación de bytes:
     precondición de values JSON-friendly documentada.
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 6.5 (Permissions mínima).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 6.4. Cuarta sub-fase Fase 6. Quotas multi-tenant
(maxUsers, maxBuildsPerUser, maxStorageBytes) integradas en
TreeRegistry mediante helpers privados con cero opt-in necesario para
back-compat. Risco arquitectónico MEDIO (peza grande modificada,
9 substitucións mecánicas). Cero modificación de
packages/storage/, cero modificación de adapters, cero scope creep.
Calquera dúbida → ESCALAR.*
