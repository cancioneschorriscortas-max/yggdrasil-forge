# BRIEFING — SUB-FASE 6.5 de Yggdrasil Forge

> Pega este documento no chat executor.
> **QUINTA E ÚLTIMA sub-fase da Fase 6 (TreeRegistry + Multi-tenancy).**
> Tres tarefas combinadas:
> 1. **`PermissionChecker` interface mínima** + integración en `TreeRegistry`
>    (5 acciones de mutación per-user).
> 2. **Corrección de DT-26**: `save()` deixa de ser fire-and-forget e
>    propaga erros correctamente.
> 3. **1 ErrorCode novo** (`PERMISSION_DENIED` = YGG_E036).
>
> O modelo completo de Permissions (ACL, RBAC, policies declarativas)
> seguirá diferido a **8.4 PluginManager + HookRunner** (rexistrado no
> MASTER §67).

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte (excluír "TODOS"
en galego = "all", precedente 6.1–6.4).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5 L2,
3.6.a L1, 4.3 L1, 5.2 L1+L2, 6.1 L1+L2, 6.2 L1**: calquera modificación
fóra de §6 require **ESCALAR ANTES DE APLICAR**. **APIs prescritas en
código exemplo deben verificarse empíricamente** (5.2 L2).

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 6.5 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 6.5 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.
NON consolidar coas previas.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore (6.1 L1 / 6.2 L1)**: ramas defensivas verificablemente
inalcanzables anótanse con `/* v8 ignore next */ + xustificación
inline`, NON tolerar baixadas globais de cobertura. **Cero regresión
da baseline 97.49% global core**.

**0.12 — DECISIÓN COMBINADA**: 6.5 combina **2 cousas funcionais** (Permissions
+ DT-26 fix) **NON porque sexan a mesma peza** senón porque o autor
prefire pechar Fase 6 cunha sub-fase única. Cada cambio é
**arquitectónicamente independente** (Permissions: feature nova;
DT-26: bug fix preexistente desde 6.1). **Implementar cada cambio
nun bloque separado e claro**.

---

## 1. IDENTIFICACIÓN

Sub-fase **6.5** de Yggdrasil Forge. **QUINTA E ÚLTIMA da Fase 6**
(TreeRegistry + Multi-tenancy completa). Pecha o ciclo `6.1 → 6.5`.

**Pezas (2 grupos)**:

**Grupo A — Permissions mínima**:
1. **`PermissionAction` type union** (5 valores literais).
2. **`PermissionChecker` interface** pública (1 método).
3. **Engadir `permissions?: PermissionChecker`** a `TreeRegistryOptions`.
4. **Estado interno**: `private permissions: PermissionChecker | undefined`.
5. **Checks de permiso** en 5 métodos públicos: `createEngine`,
   `removeEngine`, `saveBuild`, `loadBuild`, `removeBuild`.
6. **1 ErrorCode novo** `PERMISSION_DENIED` = `YGG_E036`.

**Grupo B — DT-26 fix (save() error propagation)**:
7. Modificar `save()` para capturar resultado de cada `quotaCheckedSet`
   e `persistEngine`, retornando early en caso de erro.

**Cero modificación de**: TreeEngine, SubtreeManager, Federator, layouts,
adapters de storage, ScopedStorage, AggregateStats, QuotaConfig (xa
existente), build management externo (sinaturas API públicas intactas).

**Cero opt-in necesario para back-compat de Permissions**: se
`permissions: undefined`, todos os checks delegan en "permitido"
(default open).

**DT-26 fix afecta o comportamento observable de save()**: cando hai
falla interna, save() agora **devolve err en lugar de ok**. **Iso é
unha corrección de bug**, non un breaking change. Documentar como
`Fixed` no CHANGELOG.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `e52fc33`, verificada empíricamente
en clone independente)**:

### Sobre Permissions

- **MASTER §49 non especifica forma de Permissions** (a diferenza de
  Quotas que ten spec literal). Decisión arquitectónica recae no Director.
- **Decisión estructural**: interface mínima `PermissionChecker` cunha
  única función `check(action, userId)`. **Cero modelo de datos**.
  Modelos enriquecidos (ACL, RBAC, hierarchies, policies) son
  responsabilidade do consumidor ou difíridos a Fase 8.4
  (PluginManager + HookRunner) segundo MASTER §67 actualizado.
- **5 acciones a cubrir**: createEngine, removeEngine, saveBuild,
  loadBuild, removeBuild. **Operacións de mutación per-user**. As
  operacións de lectura (`getEngine`, `listBuilds`, `listEngines`,
  aggregate queries) **NON** consultan Permissions en 6.5: lecturas
  son cheap e 8.4 pode estender vía hooks se require.
- **Operacións administrativas** (`save`, `load`, `destroy`,
  `applyChangesToAll`, `importBuilds`, `exportAllBuilds`) **NON**
  consultan Permissions: son operacións globais sen owner per-user;
  8.4 expandirá vía hooks.

### Sobre DT-26

- **save()** actual (TreeRegistry.ts liñas 679–706) ten 4 chamadas con
  `await` pero sen capturar resultado:
  ```ts
  await this.quotaCheckedSet('registry:userIds', ...)      // r1 ignorado
  await this.quotaCheckedSet('registry:buildsIndex', ...)  // r2 ignorado
  for (...) await this.persistEngine(...)                  // rN ignorado
  await this.quotaCheckedSet('registry:meta', ...)         // r4 ignorado
  return ok(undefined)                                     // sempre ok
  ```
- **`persistEngine`** (privado) **xa propaga correctamente** (devolve
  directamente `Result` de `quotaCheckedSet`). Cero modificación
  necesaria.
- **`load()`** **xa propaga correctamente** (todas as chamadas capturan
  resultado + return early). Cero modificación necesaria.
- Polo tanto o **fix DT-26 redúcese exclusivamente a save()** (4 puntos).

### Sobre ErrorCodes

- Familia YGG_E actual ata E035 (`QUOTA_STORAGE_EXCEEDED` en 6.4).
- Próximo: `PERMISSION_DENIED = 'YGG_E036'`. Verificado que `YGG_E036`
  non está usado.

### Estilo verificado

- Validacións empíricas dos imports existentes en TreeRegistry.ts:
  `ErrorCode`, `YggdrasilError`, `err`, `ok`, `getErrorMessage`,
  `Locale`, `LocalizedString`, `Result` de `@yggdrasil-forge/common`.
- Todos xa importados; cero modificación de imports necesaria salvo
  para incrementar a lista de tipos exportados de engine/index.ts.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `e52fc33` (Quotas 6.4).
- 1506 core + 60 common + 193 storage = **~1759 monorepo limpo**.
- Typecheck 21/21, lint 0/0, format 0/0.
- 56 ErrorCodes existentes (ata YGG_E035).
- Global core cobertura **97.49%** (baseline post-6.4).
- TreeRegistry.ts cobertura **98.29/91.13/100/100**.
- DT abertas: DT-9, DT-11, DT-12, DT-14 a DT-21, DT-23, DT-24, DT-25,
  **DT-26 (a resolver nesta sub-fase)**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao TreeRegistry existente: (a) tipos públicos `PermissionAction`
+ `PermissionChecker` + campo opcional `permissions?` en
TreeRegistryOptions; (b) checks de permiso en 5 métodos de mutación
per-user (`createEngine`, `removeEngine`, `saveBuild`, `loadBuild`,
`removeBuild`); (c) 1 ErrorCode novo `PERMISSION_DENIED` (YGG_E036)
en common; (d) refactor de `save()` para capturar resultados e
propagar erros (PECHA DT-26). **Cero opt-in para Permissions** (back-compat
total cando `permissions: undefined`). **Modelo enriquecido** (ACL/RBAC/policies)
difírido a 8.4. **Cero modificación de packages/storage/**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**MODIFICADO** `packages/core/src/engine/TreeRegistry.ts`:
- 2 tipos públicos novos (`PermissionAction`, `PermissionChecker`).
- 1 campo en TreeRegistryOptions (`permissions?`).
- 1 campo privado (`this.permissions`).
- 1 helper privado `checkPermission(action, userId)`.
- 5 checks integrados nos 5 métodos públicos.
- Refactor de `save()` (DT-26).

**MODIFICADO** `packages/core/src/engine/index.ts` (engadir
`export type { PermissionAction, PermissionChecker }`).

**MODIFICADO** `packages/core/__tests__/engine/TreeRegistry.test.ts`
(engadir ~18 tests novos; cero modif dos existentes).

**MODIFICADO** `packages/common/src/errors/codes.ts` (engadir 1
ErrorCode: E036).

**MODIFICADO** `packages/common/src/errors/messages.ts` (engadir 3
mensaxes [1 code × 3 locales]).

**MODIFICADO** `CHANGELOG.md` (nova `## [Unreleased]` ao principio
con `### Added` e `### Fixed`).

**NOVO** `.changeset/permissions-core.md` (minor para core).
**NOVO** `.changeset/permissions-common.md` (patch para common).

**Cero ficheiro novo en src/**. **Cero modificación de
packages/storage/**.

### 5.2 — PermissionAction type union (FIXADA)

```ts
/**
 * Acciones sometidas a verificación de permiso polo `PermissionChecker`
 * opcional do TreeRegistry. Limitada a 5 operacións de mutación per-user.
 * Operacións de lectura (`getEngine`, queries agregadas) e operacións
 * administrativas (`save`, `load`, `destroy`, `applyChangesToAll`,
 * `importBuilds`, `exportAllBuilds`) **NON** son sometidas a permiso en
 * 6.5; o modelo enriquecido vía hooks de 8.4 PluginManager poderá
 * estender este ámbito.
 */
export type PermissionAction =
  | 'createEngine'
  | 'removeEngine'
  | 'saveBuild'
  | 'loadBuild'
  | 'removeBuild'
```

**Cero outras acciones**. Cero `'*'` wildcard. Cero `'any'` action.

### 5.3 — PermissionChecker interface (FIXADA, non negociable)

```ts
/**
 * Interface mínima de verificación de permisos para o `TreeRegistry`.
 * Se se pasa en `TreeRegistryOptions.permissions`, o TreeRegistry chama
 * `check(action, userId)` antes de cada operación de mutación per-user.
 * Se devolve `false` (ou Promise resolved a false), a operación falla
 * con `PERMISSION_DENIED` (YGG_E036) sen efectos colaterais.
 *
 * **Default cando undefined**: todas as operacións permitidas
 * (back-compat absoluta con 6.1–6.4).
 *
 * **Modelo expandido**: Fase 8.4 PluginManager + HookRunner ofrecerá
 * hooks máis ricos (`beforeCreateEngine`, `beforeSaveBuild`, etc.)
 * que poderán implementar ACL, RBAC, ownership trees, policies
 * declarativas, etc. **Esta interface mínima é estable e cero break
 * change cando se engadan hooks**.
 */
export interface PermissionChecker {
  /**
   * Verifica se a `action` está permitida para `userId`. Pode ser
   * síncrono (boolean) ou asíncrono (Promise<boolean>). TreeRegistry
   * sempre fai `await` do resultado.
   *
   * @param action - Acción a verificar (createEngine, removeEngine,
   *   saveBuild, loadBuild, removeBuild).
   * @param userId - Usuario afectado pola operación.
   * @returns `true` para permitir, `false` para denegar.
   */
  check(action: PermissionAction, userId: string): boolean | Promise<boolean>
}
```

**Un só método `check`**. Non hai `canRead/canWrite` diferenciados.
A acción xa carrexa a semántica.

**`userId` é o usuario afectado pola operación** (tamén chamado "target").
A separación actor/target (relevante en modelos máis ricos) **non se
modela aquí**; será introducida en 8.4 mediante hooks que poden
acceder a contexto adicional.

### 5.4 — TreeRegistryOptions actualizado

```ts
export interface TreeRegistryOptions {
  readonly storage: StorageAdapter
  readonly cache: TreeRegistryCacheConfig
  readonly locale?: Locale
  readonly quotas?: QuotaConfig
  /**
   * Verificador de permisos opcional. Se non se define, todas as
   * operacións de mutación per-user permítense (back-compat).
   *
   * Modelo enriquecido (ACL/RBAC/policies) difírido a Fase 8.4
   * PluginManager + HookRunner.
   */
  readonly permissions?: PermissionChecker
}
```

Engadir o campo **ao final**, despois de `quotas?`.

### 5.5 — ErrorCode novo en common

En `packages/common/src/errors/codes.ts`, despois de `QUOTA_STORAGE_EXCEEDED`:

```ts
PERMISSION_DENIED = 'YGG_E036',
```

En `packages/common/src/errors/messages.ts`, despois das mensaxes de
`QUOTA_STORAGE_EXCEEDED`:

```ts
[ErrorCode.PERMISSION_DENIED]: {
  gl: 'Permiso denegado: {action} para usuario {userId}',
  es: 'Permiso denegado: {action} para usuario {userId}',
  en: 'Permission denied: {action} for user {userId}',
},
```

**Cero punto final** (estilo do proxecto). **Placeholders `{action}`
e `{userId}`**.

### 5.6 — Estado interno

Engadir como campo privado de `TreeRegistry` (xunto aos campos
existentes, antes do constructor):

```ts
/** Verificador de permisos opcional; undefined se non se pasou. */
private readonly permissions: PermissionChecker | undefined
```

Asignación no constructor (xunto coa de `quotas`):

```ts
this.permissions = options.permissions
```

### 5.7 — Helper privado `checkPermission`

Engadir na sección `// ── Private helpers ──` xa existente, **antes**
dos quota helpers (ou nun lugar coherente; o orde non é crítico).
Estilo igual aos outros helpers:

```ts
/**
 * Verifica permiso para unha acción mediante `this.permissions` se
 * está configurado. Devolve `err(PERMISSION_DENIED)` se o checker
 * devolve `false`. Devolve `ok(undefined)` se o checker devolve
 * `true` ou se `this.permissions` é undefined (default open).
 *
 * @internal
 */
private async checkPermission(
  action: PermissionAction,
  userId: string,
): Promise<Result<void>> {
  if (this.permissions === undefined) {
    return ok(undefined)
  }
  const result = await this.permissions.check(action, userId)
  if (result === false) {
    return err(
      new YggdrasilError(
        ErrorCode.PERMISSION_DENIED,
        getErrorMessage(
          ErrorCode.PERMISSION_DENIED,
          this.locale,
          { action, userId },
        ),
      ),
    )
  }
  return ok(undefined)
}
```

**Nota**: `await this.permissions.check(...)` funciona tanto se devolve
boolean sync como Promise<boolean>; `await` sobre valor non-Promise é
identity. Cero overhead extra.

### 5.8 — Checks integrados en 5 métodos

**Orde dos checks** en cada método modificado: **PERMISSION primeiro,
QUOTA despois** (autenticación/autorización antes de comprobar
recurso). Mantén consistencia con leccións previas e convencións
estándar de seguridad.

**5.8.1 — createEngine**:

Engadir o check ao principio do método, **ANTES** do check de
maxUsers (que xa existe desde 6.4):

```ts
async createEngine(userId: string, build?: Build): Promise<Result<TreeEngine>> {
  // ── Check permiso (6.5) ──
  const permResult = await this.checkPermission('createEngine', userId)
  if (!permResult.ok) return permResult

  // ── Check maxUsers (6.4) ──
  // ... código existente ...
```

**5.8.2 — removeEngine**:

```ts
async removeEngine(userId: string): Promise<Result<void>> {
  // ── Check permiso (6.5) ──
  const permResult = await this.checkPermission('removeEngine', userId)
  if (!permResult.ok) return permResult

  // ... código existente (idempotente: se userId non existe, devolve ok) ...
```

**Nota subtle**: removeEngine actual é **idempotente** (devolve ok se o
userId non está rexistrado). **Manter idempotencia post-6.5**: o check
de permiso execútase **igualmente**, polo que o checker pode denegar
borrar un usuario inexistente. **Documentar**: o consumidor que quere
"silenciar" remove de userId inexistente debe facer o check externo.

**5.8.3 — saveBuild**:

```ts
async saveBuild(
  userId: string,
  buildLabel?: LocalizedString,
): Promise<Result<Build>> {
  // ── Check permiso (6.5) ──
  const permResult = await this.checkPermission('saveBuild', userId)
  if (!permResult.ok) return permResult

  // ── Resto de validacións existentes (userId rexistrado, etc.) ──
  // ... código existente ...
```

**5.8.4 — loadBuild**:

Verificar primeiro a sinatura exacta empíricamente. Asumindo
`loadBuild(userId, buildId)`:

```ts
async loadBuild(userId: string, buildId: string): Promise<Result<TreeEngine>> {
  // ── Check permiso (6.5) ──
  const permResult = await this.checkPermission('loadBuild', userId)
  if (!permResult.ok) return permResult

  // ... código existente ...
```

**5.8.5 — removeBuild**:

```ts
async removeBuild(userId: string, buildId: string): Promise<Result<void>> {
  // ── Check permiso (6.5) ──
  const permResult = await this.checkPermission('removeBuild', userId)
  if (!permResult.ok) return permResult

  // ... código existente ...
```

### 5.9 — Refactor de `save()` (DT-26 fix)

**Cambio funcional**: capturar resultado de cada chamada interna e
propagar erros. **Cero cambio de sinatura**.

**ANTES** (estado actual post-6.4):

```ts
async save(): Promise<Result<void>> {
  // 1. Persistir userIds
  await this.quotaCheckedSet('registry:userIds', Array.from(this.userIds))

  // 2. Persistir buildsIndex (Map → plain object)
  const indexObj: Record<string, string[]> = {}
  for (const [userId, buildIds] of this.buildsIndex) {
    indexObj[userId] = Array.from(buildIds)
  }
  await this.quotaCheckedSet('registry:buildsIndex', indexObj)

  // 3. Persistir engines segundo strategy
  if (this.cacheConfig.strategy === 'all-in-memory' || this.cacheConfig.strategy === 'lru') {
    for (const [userId, entry] of this.cache) {
      await this.persistEngine(userId, entry.engine)
    }
  }
  // 'on-demand': cada createEngine xa persistiu; cero acción extra

  // 4. Meta
  const now = Date.now()
  await this.quotaCheckedSet('registry:meta', {
    schemaVersion: '1.0.0',
    createdAt: now,
    updatedAt: now,
  })

  return ok(undefined)
}
```

**DESPOIS** (post-6.5):

```ts
async save(): Promise<Result<void>> {
  // 1. Persistir userIds
  const userIdsResult = await this.quotaCheckedSet(
    'registry:userIds',
    Array.from(this.userIds),
  )
  if (!userIdsResult.ok) return userIdsResult

  // 2. Persistir buildsIndex (Map → plain object)
  const indexObj: Record<string, string[]> = {}
  for (const [userId, buildIds] of this.buildsIndex) {
    indexObj[userId] = Array.from(buildIds)
  }
  const indexResult = await this.quotaCheckedSet('registry:buildsIndex', indexObj)
  if (!indexResult.ok) return indexResult

  // 3. Persistir engines segundo strategy
  if (this.cacheConfig.strategy === 'all-in-memory' || this.cacheConfig.strategy === 'lru') {
    for (const [userId, entry] of this.cache) {
      const persistResult = await this.persistEngine(userId, entry.engine)
      if (!persistResult.ok) return persistResult
    }
  }
  // 'on-demand': cada createEngine xa persistiu; cero acción extra

  // 4. Meta
  const now = Date.now()
  const metaResult = await this.quotaCheckedSet('registry:meta', {
    schemaVersion: '1.0.0',
    createdAt: now,
    updatedAt: now,
  })
  if (!metaResult.ok) return metaResult

  return ok(undefined)
}
```

**Cambio neto**: 4 captures de resultado + 4 returns early. Cero
modificación de lóxica. Cero modificación de side effects exitosos.

**Comportamento observable** post-fix:
- ANTES: save() sempre devolvía `ok(undefined)` aínda que houbera
  fallas internas (storage error, quota excedido).
- DESPOIS: save() devolve `err(...)` cando algunha escritura falla,
  abortando o resto. **Garantía de "first error wins"**: se userIds
  falla, indexObj/engines/meta non se escriben (cero estado intermedio
  corrupto adicional).

**Documentar como `### Fixed` no CHANGELOG**:

> save() agora propaga correctamente erros de quotaCheckedSet e
> persistEngine internos. Antes ignorábaos silenciosamente (patrón
> fire-and-forget preexistente desde 6.1). Resolve DT-26.

### 5.10 — Determinismo

- Cero `Date.now()`, `Math.random()` nos novos helpers.
- `await` sobre boolean ou Promise<boolean> é determinista (resolución
  síncrona se boolean, asíncrona se Promise).
- Tests verifican ambos camiños.

### 5.11 — Cero opt-in necesario (back-compat para Permissions)

**Verificable empíricamente**: con `permissions: undefined`:
- `checkPermission` retorna `ok(undefined)` no primeiro `if`.
- Cero `await` sobre `permissions.check` (cero overhead).
- Comportamento idéntico a 6.4.

**Tests específicos verifican back-compat**: sub-fase 6.4 e anteriores
seguen pasando intactos.

### 5.12 — Cobertura

- **`TreeRegistry.ts`**: ≥98.29% Stmts / ≥91% Branch (manter baseline
  post-6.4). Os ~80 liñas novas + refactor de save() deben estar ao
  100% ou con v8 ignore xustificado.
- **Global core**: ≥97.49% (baseline). **Cero regresión tolerada**.
- **common**: 100% mantida.

### 5.13 — Tests prescritos (~18 totais)

Engadir 2 bloques describe novos en `TreeRegistry.test.ts`:

**`describe('TreeRegistry — permissions', ...)`** (~15 tests):

*Back-compat (3):*
1. Sen permissions (undefined): todas as 5 operacións funcionan
   como en 6.4.
2. permissions con checker que devolve sempre true: idéntico a
   undefined.
3. permissions con checker async (Promise<true>): tamén funciona.

*Denegación de cada acción (5):*
4. createEngine denegada → PERMISSION_DENIED con `{action: 'createEngine'}`.
5. removeEngine denegada → PERMISSION_DENIED.
6. saveBuild denegada → PERMISSION_DENIED.
7. loadBuild denegada → PERMISSION_DENIED.
8. removeBuild denegada → PERMISSION_DENIED.

*Checker async (2):*
9. checker.check Promise<false> resolve → PERMISSION_DENIED tras await.
10. checker.check Promise rejected → o erro propaga (test
    documentado; non manexar como permission denied, deixar bubble).

*Operacións NON consultan permissions (3):*
11. getEngine NON chama checker.
12. listBuilds NON chama checker.
13. getAggregateStats NON chama checker.

*Orde de checks (1):*
14. PERMISSION_DENIED prima sobre QUOTA_USERS_EXCEEDED (con quotas
    activas + checker que denega: o erro devolto é PERMISSION_DENIED,
    non quota).

*Localización (1):*
15. Mensaxe PERMISSION_DENIED en es/en correctamente interpolada.

**`describe('TreeRegistry — save() error propagation (DT-26 fix)', ...)`** (~3 tests):

16. save() con storage que falla en `set` para `registry:userIds`:
    devolve err de storage; cero escritura de buildsIndex/engines/meta
    posterior (verificable inspeccionando o storage).
17. save() con maxStorageBytes que se excede no `registry:meta`:
    devolve err de QUOTA_STORAGE_EXCEEDED; userIds/buildsIndex/engines
    si se persistiron (xa pasaron antes de meta).
18. save() exitoso: comportamento idéntico ao previo (devolve ok).

**Total: ~18 tests novos**. Baseline post-6.5 esperado: 1506 + 18 = **1524 core**.

### 5.14 — Test counts esperados post-6.5

- **core**: 1506 + ~18 = **~1524**.
- **common**: 60 intactos.
- **storage**: 193 intactos.
- **Total monorepo**: ~1777.

### 5.15 — Helper para tests de Permissions

Recomendado (cero `as any`, Biome-safe):

```ts
function makePermissionChecker(
  decide: (action: PermissionAction, userId: string) => boolean | Promise<boolean>,
): PermissionChecker {
  return { check: decide }
}

// Uso:
const allowAll = makePermissionChecker(() => true)
const denyAll = makePermissionChecker(() => false)
const denyCreateEngine = makePermissionChecker((action) => action !== 'createEngine')
const asyncDeny = makePermissionChecker(() => Promise.resolve(false))
```

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `PermissionAction` type | union de literais | TreeRegistry.ts | ~15 (incl. JSDoc) |
| `PermissionChecker` interface | interface pública | TreeRegistry.ts | ~30 (incl. JSDoc) |
| Campo `permissions?` en TreeRegistryOptions | +1 liña + JSDoc | TreeRegistry.ts | ~8 |
| Campo privado `this.permissions` | +1 liña + JSDoc | TreeRegistry.ts | ~3 |
| Asignación no constructor | +1 liña | TreeRegistry.ts | +1 |
| Helper `checkPermission` | método privado | TreeRegistry.ts | ~25 |
| 5 checks integrados | 5 × 2 liñas + 1 import | TreeRegistry.ts | ~12 |
| Refactor save() (DT-26) | 4 captures + 4 returns | TreeRegistry.ts | ~12 (netas) |
| Export tipos | export type | engine/index.ts | +2 |
| ErrorCode E036 | enum entry | common/codes.ts | +1 |
| 3 mensaxes | dict entries | common/messages.ts | +5 |
| Tests permissions | describe block | TreeRegistry.test.ts | ~280 |
| Tests save() DT-26 | describe block | TreeRegistry.test.ts | ~60 |

**Total estimado**: ~110 liñas novas en TreeRegistry.ts + ~340 liñas
de tests + 6 liñas en common.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/core/src/engine/TreeRegistry.ts` (MODIFICADO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +2 export types)
- `packages/core/__tests__/engine/TreeRegistry.test.ts` (MODIFICADO: +18 tests)
- `packages/common/src/errors/codes.ts` (MODIFICADO: +1 ErrorCode)
- `packages/common/src/errors/messages.ts` (MODIFICADO: +3 mensaxes)
- `.changeset/permissions-core.md` (NOVO: minor para core)
- `.changeset/permissions-common.md` (NOVO: patch para common)
- `CHANGELOG.md` (modificado: nova `## [Unreleased]` con Added + Fixed)

**NON deben aparecer cambios en**:
- `packages/storage/` enteiro.
- `packages/common/src/index.ts` (ErrorCode xa exportado).
- TreeEngine, SubtreeManager, Federator, ou outras pezas de core.
- Tipos NodeDef, EdgeDef, TreeDef, TreeState, NodeInstance, Build,
  TreeChange, QuotaConfig, AggregateStats (intactos).
- `pnpm-lock.yaml`, `tsconfig.base.json`, `tsup.config.ts`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── Permissions (validacións) ──` para a sección nova. 2 espazos,
comilla simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF.
TS strict, cero `any`. NON desactives Biome.

**Cero punto final** nas mensaxes de erro.

**JSDoc completo en castelán/galego** para tódolos tipos públicos
novos.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/` (cero adapters tocados).
- ❌ Implementar modelo enriquecido (ACL, RBAC, hierarchies, policies).
  Iso é 8.4 (PluginManager + HookRunner).
- ❌ Engadir más acciones á union `PermissionAction` (5.2: fixadas en 5).
- ❌ Consultar permissions en operacións de lectura (`getEngine`,
  `listBuilds`, queries agregadas).
- ❌ Consultar permissions en operacións administrativas (`save`,
  `load`, `destroy`, `applyChangesToAll`, `importBuilds`,
  `exportAllBuilds`).
- ❌ Cambiar a sinatura pública de `save()`, `createEngine`, etc.
  (back-compat).
- ❌ Modificar tests existentes (cero modif).
- ❌ Refactorizar outras pezas con patrón fire-and-forget (5.9: DT-26
  redúcese exclusivamente a save(); persistEngine e load() xa propagan).
- ❌ Engadir contexto extra ao `check(action, userId)` (cero opcionais
  como `resource`, `metadata`, etc.; modelo expandido vai en 8.4).
- ❌ Implementar caché de decisións de permissions (cero estado en
  TreeRegistry sobre o resultado de checks; cada chamada delega).
- ❌ Reutilizar `STORAGE_QUOTA_EXCEEDED` ou outros ErrorCodes existentes
  para denegación de permiso. **YGG_E036 PERMISSION_DENIED é
  semántica distinta**.
- ❌ Engadir Date.now() / Math.random() nos novos helpers.
- ❌ Tolerar regresión de cobertura (6.1 L1).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T15)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `e52fc33` como HEAD.

**T0.2** — Verificar que último ErrorCode é E035:
```bash
grep -E "YGG_E0[0-9][0-9]" packages/common/src/errors/codes.ts | tail -3
# esperado: ata QUOTA_STORAGE_EXCEEDED = 'YGG_E035'
```

**T0.3** — Verificar sinaturas dos 5 métodos a interceptar:
```bash
grep -nE "^  async (createEngine|removeEngine|saveBuild|loadBuild|removeBuild)\(" \
  packages/core/src/engine/TreeRegistry.ts
# esperado: 5 matches
```

**T0.4** — Verificar `save()` actual ten o patrón fire-and-forget
(DT-26):
```bash
awk '/async save\(\)/,/^  }/' packages/core/src/engine/TreeRegistry.ts | grep -c "await this\."
# esperado: 4 awaits sen capturar resultado
```

**T0.5** — Baseline previo:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --filter=@yggdrasil-forge/core --force  # 1506
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 1 ErrorCode en common

En `packages/common/src/errors/codes.ts`, despois de
`QUOTA_STORAGE_EXCEEDED = 'YGG_E035'`:

```ts
PERMISSION_DENIED = 'YGG_E036',
```

### T2 — Engadir 3 mensaxes en common

En `packages/common/src/errors/messages.ts`, despois das mensaxes de
`QUOTA_STORAGE_EXCEEDED`, engadir o bloque literal de §5.5.

### T3 — Build de common

```bash
pnpm --filter @yggdrasil-forge/common build
```

Verificar que dist/index.d.ts ten o novo membro `PERMISSION_DENIED` no
enum.

### T4 — Engadir `PermissionAction` type en TreeRegistry.ts

Engadir na sección `// ── Interfaces públicas ──` (despois de
`AggregateStats` ou nun lugar coherente; importante que estea xunto
con outros tipos públicos exportados).

### T5 — Engadir `PermissionChecker` interface

Engadir inmediatamente despois de `PermissionAction` segundo §5.3 literal.

### T6 — Actualizar TreeRegistryOptions

Engadir o campo `permissions?` ao final da interface segundo §5.4.

### T7 — Engadir campo privado

Engadir `private readonly permissions: PermissionChecker | undefined`
xunto aos campos existentes (na zona de declaración de campos da
clase). Asignar `this.permissions = options.permissions` no constructor
xunto coa asignación de quotas.

### T8 — Engadir helper privado `checkPermission`

Na sección `// ── Private helpers ──` xa existente, antes de
`quotaCheckedSet` (ou nun lugar coherente cos outros helpers), engadir
segundo §5.7 literal.

### T9 — Integrar checks en 5 métodos

Aplicar segundo §5.8.1 a §5.8.5 literal. Sempre **antes** do check de
quotas existentes. Marcar opcionalmente con comentario `// ── Check
permiso (6.5) ──` para claridade.

### T10 — Refactor save() (DT-26)

Substituír literalmente o `save()` actual polo bloque "DESPOIS" de §5.9.

**Auditoría post-T10**:
```bash
awk '/async save\(\)/,/^  }/' packages/core/src/engine/TreeRegistry.ts | grep -c "if (!.*\.ok) return"
# esperado: 4 returns early (incluíndo o do for loop)
```

### T11 — Engadir exports en engine/index.ts

```ts
export type {
  TreeRegistryOptions,
  TreeRegistryCacheConfig,
  AggregateStats,
  QuotaConfig,
  PermissionAction,    // ← NOVO
  PermissionChecker,   // ← NOVO
} from './TreeRegistry.js'
```

### T12 — Tests novos

Engadir os 2 bloques describe segundo §5.13:
1. `describe('TreeRegistry — permissions', ...)` (~15 tests).
2. `describe('TreeRegistry — save() error propagation (DT-26 fix)', ...)` (~3 tests).

Cero modificación dos describes existentes de 6.1–6.4.

**Helper recomendado** (§5.15):

```ts
function makePermissionChecker(
  decide: (action: PermissionAction, userId: string) => boolean | Promise<boolean>,
): PermissionChecker {
  return { check: decide }
}
```

Para os tests de save() error propagation, **podes crear un
`FailingStorage` mock** que devolva err en `set` para claves específicas:

```ts
class FailingStorageOnKey implements StorageAdapter {
  private readonly inner = new MemoryStorage()
  constructor(private readonly failKey: string, private readonly failCode: ErrorCode) {}
  async get(key: string) { return this.inner.get(key) }
  async set(key: string, value: unknown) {
    if (key === this.failKey) {
      return err(new YggdrasilError(this.failCode, getErrorMessage(this.failCode, 'gl')))
    }
    return this.inner.set(key, value)
  }
  async delete(key: string) { return this.inner.delete(key) }
  async list(prefix?: string) { return this.inner.list(prefix) }
  async clear() { return this.inner.clear() }
}
```

### T13 — Verificación

```bash
pnpm turbo run typecheck --force            # 21/21
pnpm turbo run test --filter=@yggdrasil-forge/core --force
pnpm turbo run test --filter=@yggdrasil-forge/common --force
pnpm --filter @yggdrasil-forge/core run test:coverage
pnpm lint && pnpm format:check
```

- ≥1524 tests core (1506 previos + ~18 novos).
- 60 common (intactos).
- 193 storage intactos.
- Cobertura: TreeRegistry.ts ≥98.29% Stmts / ≥91% Branch.
- Global core ≥97.49%.

**Se algunha rama defensiva nova non é alcanzable**, anotar con
`/* v8 ignore next */` + xustificación.

### T14 — Changesets + CHANGELOG

`.changeset/permissions-core.md`:
```
---
'@yggdrasil-forge/core': minor
---

feat(core): add PermissionChecker to TreeRegistry + fix save() error propagation (sub-phase 6.5)
```

`.changeset/permissions-common.md`:
```
---
'@yggdrasil-forge/common': patch
---

feat(common): add PERMISSION_DENIED ErrorCode E036 (sub-phase 6.5)
```

**CHANGELOG**: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
Contido:

```
### Added
- `@yggdrasil-forge/core`: interface mínima de control de permisos no
  `TreeRegistry` para multi-tenancy. Novos tipos públicos
  `PermissionAction` (union de 5 literais: 'createEngine',
  'removeEngine', 'saveBuild', 'loadBuild', 'removeBuild') e
  `PermissionChecker` interface (un só método `check(action, userId):
  boolean | Promise<boolean>`). Engadido campo opcional
  `permissions?: PermissionChecker` a `TreeRegistryOptions`.
  TreeRegistry consulta o checker antes das 5 operacións de mutación
  per-user; se devolve `false` (ou Promise<false>), a operación falla
  con `PERMISSION_DENIED` (YGG_E036). Operacións de lectura
  (`getEngine`, `listBuilds`, queries agregadas) e administrativas
  (`save`, `load`, `destroy`, `applyChangesToAll`, `importBuilds`,
  `exportAllBuilds`) **NON** consultan permissions — modelo
  enriquecido vía hooks de 8.4 PluginManager poderá estender.
- `@yggdrasil-forge/common`: ErrorCode `YGG_E036` `PERMISSION_DENIED`
  con mensaxes localizadas gl/es/en e placeholders `{action}/{userId}`.

### Fixed
- `@yggdrasil-forge/core`: `TreeRegistry.save()` agora propaga
  correctamente erros internos de `quotaCheckedSet` e `persistEngine`.
  Antes ignorábaos silenciosamente (patrón fire-and-forget preexistente
  desde 6.1; documentado como DT-26 post-6.4). Garantía actual: "first
  error wins" — se a primeira escritura falla, as posteriores non se
  executan (cero estado intermedio adicional). **Resolve DT-26**.

### Note
- Sub-fase 6.5 QUINTA E ÚLTIMA da Fase 6. **Fase 6 (TreeRegistry +
  Multi-tenancy) completa**.
- **Cero opt-in necesario para back-compat**: `permissions: undefined`
  → cero overhead, comportamento idéntico a 6.4.
- **Modelo enriquecido difírido a 8.4** (MASTER §67): PluginManager +
  HookRunner ofrecerá hooks máis ricos (`beforeCreateEngine`,
  `beforeSaveBuild`, etc.) cos que implementar ACL, RBAC, ownership
  trees, policies declarativas. A interface mínima de 6.5 é estable
  e cero break change cando se engadan hooks.
- **Orde de checks** en métodos modificados: PERMISSION primeiro,
  QUOTA despois (autenticación antes de comprobar recurso).
- **Cero modificación de packages/storage/**. Cero modificación de
  pezas de core fora de TreeRegistry.
```

### T15 — Commit + push

Commit Conventional (combinado feat+fix):

```
feat(core): add PermissionChecker + fix save() error propagation (sub-phase 6.5)

* Add PermissionAction + PermissionChecker public types.
* Add permissions? to TreeRegistryOptions (opt-in, back-compat).
* Check permissions in 5 per-user mutation methods.
* Add PERMISSION_DENIED (YGG_E036) ErrorCode.
* Fix save() fire-and-forget pattern (resolves DT-26).

Closes Phase 6 (TreeRegistry + Multi-tenancy).
```

Push directo a `origin/main` (base `e52fc33`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 6.5 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base e52fc33)
✅ PermissionAction type union (5 literais) exportado
✅ PermissionChecker interface pública exportada
✅ TreeRegistryOptions estendido con permissions? (back-compat)
✅ ErrorCode novo YGG_E036 PERMISSION_DENIED (3 locales)
✅ Helper privado checkPermission con default-open cando undefined
✅ Checks integrados en 5 métodos: createEngine, removeEngine,
   saveBuild, loadBuild, removeBuild
✅ Orde de checks: PERMISSION antes que QUOTA
✅ DT-26 RESOLTA: save() propaga erros (4 captures + returns early)
✅ CERO modificación de packages/storage/
✅ CERO modificación de outras pezas core
✅ CERO modificación de tests existentes (1506 previos intactos)
✅ T0.2 último ErrorCode E035 confirmado → engadido E036
✅ T0.3 5 métodos a interceptar confirmados
✅ T0.4 4 awaits sen check en save() confirmado → todos capturados
✅ Tests: <N> pasan en core (<delta> novos, 1506 previos intactos)
   - 3 Back-compat permissions
   - 5 Denegación por acción
   - 2 Checker async
   - 3 Operacións NON consultan
   - 1 Orde PERMISSION antes que QUOTA
   - 1 Localización
   - 3 save() error propagation (DT-26 fix)
   Common: 60 intactos | Storage: 193 intactos
✅ Cobertura:
   - TreeRegistry.ts: <X%> Stmts / <Y%> Branch / <Z%> Funcs / <W%> Lines
   - Global core: <X%> (baseline 97.49%; cero regresión)
   - v8 ignore engadidos: <listado se aplica>
✅ Typecheck: 21/21 | Lint: 0/0 | Format: 0/0
✅ Build paquete common: ok (E036 en dist/)
✅ GREP ANTI-PLACEHOLDER: <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 6.5 QUINTA E ÚLTIMA da Fase 6.
   - FASE 6 COMPLETA (TreeRegistry + Multi-tenancy).
   - Modelo enriquecido de Permissions difírido a 8.4
     PluginManager + HookRunner.
   - DT-26 RESOLTA.
✅ Changeset minor (core) + patch (common) + nova [Unreleased]
✅ git status pre-commit: 8 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA HIXIENE MASTER POST-FASE 6 (peche A.9.e + A.10.e).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 6.5. **QUINTA E ÚLTIMA sub-fase da Fase 6**.
Pecha Fase 6 con Permissions mínima + correción de DT-26. Risco
arquitectónico MEDIO-BAIXO (peza modificada pero cambios mecánicos +
modelo estable). Cero modificación de packages/storage/. Cero scope
creep. Calquera dúbida → ESCALAR.*

*Tras o peche desta sub-fase, está prevista unha hixiene MASTER
final (A.9.e + A.10.e + cierre formal de Fase 6 na táboa A.2)
similar á aplicada post-6.3 (commit f6c41b5). O director producirá
o documento de hixiene cando o autor confirme o push.*
