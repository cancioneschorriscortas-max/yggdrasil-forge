# BRIEFING — SUB-FASE 3.5 de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-fase grande con catro pezas no mesmo paquete.** Crear sistema
> de migracións de schema (Migration interface, MigrationRegistry,
> MigrationRunner) + safety net AutoBackup + integración no
> JsonSerializer existente. Todo en `@yggdrasil-forge/core`.
> Aproximadamente 410 liñas de código + 60 tests.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **CRÍTICO TRAS 3.4**:
calquera modificación fóra dos ficheiros listados en §6 require
**ESCALAR ANTES DE APLICAR**. Iso inclúe: `tsconfig.base.json`,
calquera `tsup.config.ts`, ficheiros en `packages/common/`, schemas
existentes en core, ou calquera outra peza non listada. **Aplicar fixes
sen escalar** é violación procedural (lección 3.4 L1).

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 3.5 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 3.5 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **3.5** de Yggdrasil Forge. **Sistema de migracións
completo**. Decisión do autor: facelo nunha soa sub-fase (non partir
en 3.5.a + 3.5.b).

Catro pezas novas + ampliación dunha existente:

1. **`Migration` interface** (§5.1) — contrato segundo MASTER §22.
2. **`MigrationRegistry`** (§5.2) — almacén de migracións dispoñibles.
3. **`MigrationRunner`** (§5.3) — execución secuencial con resolución
   de path.
4. **`AutoBackup`** (§5.4) — safety net que persiste estado pre-migración
   en `StorageAdapter` inxectado.
5. **Ampliación de `JsonSerializer.deserialize`** (§5.5) — engadir
   parámetro opcional `migrationRegistry`.

---

## 2. CONTEXTO MÍNIMO

A 3.5 implementa o que MASTER §22 e §47 prometen pero que aínda non
existe:
- §22: interface `Migration` con `from`, `to`, `migrate`, `description`,
  `irreversible?`.
- §47: "Migration falla → Backup automático restaurado".

Hoxe `JsonSerializer.deserialize` rexeita schemaVersion distinto con
`SCHEMA_VERSION_UNSUPPORTED`. Tras a 3.5, se se lle pasa un
`MigrationRegistry`, intentará migrar antes de rexeitar.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `190fd98` (SessionStorage + FileSystem 3.4).
- 171 tests pasan en storage; 896 tests pasan en core; 17 en common.
- Lint 0/0, typecheck 20/20. Working tree limpo.
- **`JsonSerializer` xa existe** en
  `packages/core/src/engine/JsonSerializer.ts` (~150 liñas, ben
  documentado). Implementa `serialize` + `deserialize`. **Política
  actual**: schemaVersion distinto → `err(SCHEMA_VERSION_UNSUPPORTED)`.
- **`SCHEMA_VERSION = '1.0.0'`** constante en
  `packages/common/src/constants.ts`.
- **`schemaVersion` é campo do `TreeDef`** (verificado en
  `packages/core/src/types/tree.ts:64`).
- **ErrorCodes xa dispoñibles en common** para migracións:
  - `MIGRATION_FAILED = YGG_M001`
  - `NO_MIGRATION_PATH = YGG_M002`
  - `SCHEMA_VERSION_UNSUPPORTED = YGG_V004` (xa usado por JsonSerializer)
- **Mensaxes de erro nas tres locales (gl/es/en)** xa existen para
  estes códigos en `packages/common/src/errors/messages.ts`.
- **MASTER §22** especifica a interface `Migration` (5 campos, mínimo).
- **MASTER §47** establece a política: "Migration falla → Backup
  automático restaurado".

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear o sistema de migracións de schema en
`packages/core/src/engine/migrations/` (4 ficheiros: `Migration`,
`MigrationRegistry`, `MigrationRunner`, `AutoBackup`), ampliar
`JsonSerializer.deserialize` para aceptar un `MigrationRegistry`
opcional que se aplica antes da validación final cando `schemaVersion`
non coincide, exportar publicamente desde `core`, e cubrir con tests
completos.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Migration interface (MASTER §22 literal)

`packages/core/src/engine/migrations/Migration.ts`:

```ts
// ── INICIO: Migration interface ──
// Contrato de migración entre versións de esquema de TreeDef segundo
// MASTER §22. O parámetro é `unknown` (non `TreeDef`) porque o dato
// migrado é un TreeDef dunha versión anterior cuxa estrutura non
// coincide co schema actual; o consumidor da migración casteará
// internamente á forma que coñece.

import type { Result } from '@yggdrasil-forge/common'

/**
 * Migración entre dúas versións de schema concretas.
 *
 * - `from` e `to` son cadeas semver exactas (sen ranges).
 * - `migrate` é async e devolve Result para permitir fallos limpos.
 * - `irreversible` é informativo nesta sub-fase (cero unmigrate aínda).
 */
export interface Migration {
  /**
   * Versión do schema de orixe (semver exacto, ex: '1.0.0').
   */
  readonly from: string

  /**
   * Versión do schema de destino (semver exacto, ex: '2.0.0').
   */
  readonly to: string

  /**
   * Función que transforma datos de `from` a `to`. Acepta `unknown`
   * porque a estrutura de orixe non coincide co schema actual.
   *
   * O retorno é `Result<unknown>` (non `Result<TreeDef>`) porque pode
   * haber migracións encadeadas; só a final é validada contra o
   * schema actual.
   */
  migrate(oldData: unknown): Promise<Result<unknown>>

  /**
   * Descrición humana da migración (para logs e debugging).
   */
  readonly description: string

  /**
   * Se true, indica que esta migración non se pode reverter. Campo
   * informativo nesta sub-fase; o sistema non implementa unmigrate.
   */
  readonly irreversible?: boolean
}
// ── FIN: Migration interface ──
```

**Importante**:
- `Result` impórtase de `@yggdrasil-forge/common` (decisión 3.0).
- Cero `any`. Cero TreeDef referenciado (Migration é xenérico segundo
  spec).
- Campos `readonly` salvo función `migrate`.

### 5.2 — MigrationRegistry

`packages/core/src/engine/migrations/MigrationRegistry.ts`:

```ts
import type { Migration } from './Migration.js'

export class MigrationRegistry {
  // Map<from, Map<to, Migration>> para acceso eficiente por pares.
  private readonly migrations = new Map<string, Map<string, Migration>>()

  /**
   * Rexistra unha migración. Sobreescribe se xa existía unha co
   * mesmo (from, to). Devolve a propia instancia para permitir
   * chaining.
   */
  register(migration: Migration): this {
    let toMap = this.migrations.get(migration.from)
    if (toMap === undefined) {
      toMap = new Map()
      this.migrations.set(migration.from, toMap)
    }
    toMap.set(migration.to, migration)
    return this
  }

  /**
   * Recupera unha migración directa entre dúas versións.
   * Devolve undefined se non existe.
   */
  find(from: string, to: string): Migration | undefined {
    return this.migrations.get(from)?.get(to)
  }

  /**
   * Devolve todas as migracións cuxo `from` coincide.
   * Útil para resolución de path no Runner.
   */
  findFrom(from: string): readonly Migration[] {
    const toMap = this.migrations.get(from)
    if (toMap === undefined) return []
    return Array.from(toMap.values())
  }

  /**
   * Indica se o rexistro está baleiro (cero migracións).
   */
  isEmpty(): boolean {
    return this.migrations.size === 0
  }

  /**
   * Conta total de migracións rexistradas.
   */
  size(): number {
    let total = 0
    for (const toMap of this.migrations.values()) {
      total += toMap.size
    }
    return total
  }
}
```

**Decisións**:
- **Constructor sen parámetros**. Migracións engádense via `register`.
- **Chaining**: `register` devolve `this` (paralelo a builders comúns).
- **Cero `clear()`** método nesta sub-fase (cero caso de uso real).

### 5.3 — MigrationRunner

`packages/core/src/engine/migrations/MigrationRunner.ts`:

```ts
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'
import type { MigrationRegistry } from './MigrationRegistry.js'

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Compara dúas versións semver simples (a.b.c). Devolve negativo se
 * a < b, cero se iguais, positivo se a > b. Sen ranges, sen pre-release
 * tags. Para uso interno do Runner.
 *
 * Cero dependencia da lib `semver`: esta función soporta exactamente
 * o necesario (a.b.c) para esta sub-fase.
 */
function compareSemver(a: string, b: string): number {
  const partsA = a.split('.').map(p => Number.parseInt(p, 10))
  const partsB = b.split('.').map(p => Number.parseInt(p, 10))
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const va = partsA[i] ?? 0
    const vb = partsB[i] ?? 0
    if (Number.isNaN(va) || Number.isNaN(vb)) {
      // Versión non-numérica → fallback comparación de string lexicográfica.
      // Defensivo; non debería pasar con semver correcto.
      return a.localeCompare(b)
    }
    if (va !== vb) return va - vb
  }
  return 0
}

/**
 * Executa migracións secuencialmente para levar datos dunha versión
 * de schema a outra. Usa o MigrationRegistry como fonte de migracións.
 *
 * Algoritmo de resolución de path:
 * 1. Se `from === to` → cero migracións, devolve os datos sen tocar.
 * 2. Se existe migración directa `from → to` → aplícaa.
 * 3. Senón, busca path multi-paso: ordena migracións desde `from` por
 *    `to` ascendente (semver), elixe a primeira que avanza, recursión.
 * 4. Se en algún paso non hai migración aplicable → err(NO_MIGRATION_PATH).
 * 5. Se en algún paso a propia migración devolve err → err(MIGRATION_FAILED)
 *    propagando o erro orixinal en context.
 *
 * Cero ciclos esperados (semver é monotónico); detección defensiva
 * vía conxunto de versións visitadas.
 */
export class MigrationRunner {
  private readonly locale: Locale

  constructor(
    private readonly registry: MigrationRegistry,
    options: { readonly locale?: Locale } = {},
  ) {
    this.locale = options.locale ?? DEFAULT_LOCALE
  }

  async run(
    data: unknown,
    from: string,
    to: string,
  ): Promise<Result<unknown>> {
    if (from === to) return ok(data)

    const visited = new Set<string>([from])
    let current: unknown = data
    let currentVersion = from

    while (currentVersion !== to) {
      // 1) Tentar migración directa primeiro.
      const direct = this.registry.find(currentVersion, to)
      let next: { migration: Migration; nextVersion: string } | undefined

      if (direct !== undefined) {
        next = { migration: direct, nextVersion: to }
      } else {
        // 2) Buscar candidato que avance cara `to` (semver máis próximo).
        const candidates = this.registry
          .findFrom(currentVersion)
          .filter(m => compareSemver(m.to, to) <= 0 && !visited.has(m.to))
          .sort((a, b) => compareSemver(a.to, b.to))

        if (candidates.length === 0) {
          return err(
            new YggdrasilError(
              ErrorCode.NO_MIGRATION_PATH,
              getErrorMessage(ErrorCode.NO_MIGRATION_PATH, this.locale, {
                from: currentVersion,
                to,
              }),
              { context: { from: currentVersion, to } },
            ),
          )
        }

        // Preferir o salto MÁIS GRANDE (último candidate ordenado asc).
        // Razón: minimiza número de pasos. Se hai migración 1.0→2.0 e
        // 1.0→1.5, preferir 1.0→2.0 (chega directamente máis preto).
        const best = candidates[candidates.length - 1]
        if (best === undefined) {
          // Defensivo; non debería ser undefined tras o filtro+sort.
          return err(
            new YggdrasilError(
              ErrorCode.NO_MIGRATION_PATH,
              getErrorMessage(ErrorCode.NO_MIGRATION_PATH, this.locale, {
                from: currentVersion,
                to,
              }),
              { context: { from: currentVersion, to } },
            ),
          )
        }
        next = { migration: best, nextVersion: best.to }
      }

      // 3) Aplicar migración.
      const result = await next.migration.migrate(current)
      if (!result.ok) {
        return err(
          new YggdrasilError(
            ErrorCode.MIGRATION_FAILED,
            getErrorMessage(ErrorCode.MIGRATION_FAILED, this.locale, {
              from: currentVersion,
              to: next.nextVersion,
              originalError: result.error.message,
            }),
            {
              context: {
                from: currentVersion,
                to: next.nextVersion,
                originalError: result.error,
              },
            },
          ),
        )
      }

      current = result.value
      visited.add(next.nextVersion)
      currentVersion = next.nextVersion
    }

    return ok(current)
  }
}
```

**Decisións críticas**:
- **Greedy con salto máximo**: se hai migracións 1.0→1.5 e 1.0→2.0 e
  destino 2.0, prefire 1.0→2.0 (menos pasos).
- **Detección de ciclos defensiva** via `visited` set. Cero ciclos
  esperados con semver monotónico.
- **Mensaxes localizadas** usando getErrorMessage como o resto do
  motor.
- **Erros propagados con context completo** (versión orixinal,
  migración que fallou, erro propio do migrate).

### 5.4 — AutoBackup

`packages/core/src/engine/migrations/AutoBackup.ts`:

```ts
import {
  ErrorCode,
  type Locale,
  type Result,
  YggdrasilError,
  err,
  getErrorMessage,
  ok,
} from '@yggdrasil-forge/common'

/**
 * Interface mínima do StorageAdapter consumido por AutoBackup. Espello
 * de @yggdrasil-forge/storage StorageAdapter pero **NON importamos
 * desde storage** (cero acoplamento entre core e storage). O consumidor
 * pásanos calquera obxecto que cumpra esta forma mínima.
 *
 * (En 3.6 ou sub-fase futura considerarase mover StorageAdapter a
 * common ou a un paquete máis fundamental. Aquí evitamos a dependencia
 * de momento.)
 */
export interface BackupStorage {
  set(key: string, value: unknown): Promise<Result<void>>
  get(key: string): Promise<Result<unknown | null>>
}

const DEFAULT_LOCALE: Locale = 'gl'

/**
 * Safety net que garda backup antes de migracións.
 *
 * Política:
 * - Antes de calquera operación: garda o estado actual nun
 *   `BackupStorage` inxectado.
 * - Se a operación falla: o backup queda. Restauración é explícita
 *   (método `restore`).
 * - Se a operación éxito: o backup queda gardado tamén; o consumidor
 *   xestiona limpeza (purga manual ou política de retención).
 *
 * Clave de backup: `backup:{treeId}:{timestamp}`. O consumidor pasa
 * `treeId`; timestamp xérase internamente con `Date.now()`.
 */
export class AutoBackup {
  private readonly locale: Locale

  constructor(
    private readonly storage: BackupStorage,
    options: { readonly locale?: Locale } = {},
  ) {
    this.locale = options.locale ?? DEFAULT_LOCALE
  }

  /**
   * Garda un backup do estado actual e devolve a clave usada.
   * Útil chamar antes dunha migración.
   */
  async backup(
    treeId: string,
    data: unknown,
  ): Promise<Result<{ readonly key: string; readonly timestamp: number }>> {
    const timestamp = Date.now()
    const key = `backup:${treeId}:${timestamp}`
    const result = await this.storage.set(key, data)
    if (!result.ok) {
      return err(
        new YggdrasilError(
          ErrorCode.STORAGE_WRITE_FAILED,
          getErrorMessage(ErrorCode.STORAGE_WRITE_FAILED, this.locale, {
            key,
            reason: 'backup write failed',
            originalErrorMessage: result.error.message,
          }),
          {
            context: { key, treeId, originalError: result.error },
          },
        ),
      )
    }
    return ok({ key, timestamp })
  }

  /**
   * Recupera un backup previamente gardado.
   * Devolve err(STORAGE_READ_FAILED) se non existe ou lectura falla.
   */
  async restore(key: string): Promise<Result<unknown>> {
    const result = await this.storage.get(key)
    if (!result.ok) {
      return result
    }
    if (result.value === null) {
      return err(
        new YggdrasilError(
          ErrorCode.STORAGE_READ_FAILED,
          getErrorMessage(ErrorCode.STORAGE_READ_FAILED, this.locale, {
            key,
            reason: 'backup not found',
          }),
          { context: { key } },
        ),
      )
    }
    return ok(result.value)
  }
}
```

**Decisión clave**: `BackupStorage` interface mínima local, **NON
importa desde `@yggdrasil-forge/storage`**. Razón: cero acoplamento
core→storage. O consumidor que ten un `LocalStorageAdapter` pode
pasalo directamente (cumpre `BackupStorage` por compatibilidade
estrutural).

**Pendente para futuro** (cero acción aquí): cando se decida mover
`StorageAdapter` a common (similar á decisión 3.0 con Result), este
adapter pode usar o tipo común directamente. Anótase como
candidato a hardening futuro.

### 5.5 — Ampliación de JsonSerializer.deserialize

**Modificación EXISTENTE en `packages/core/src/engine/JsonSerializer.ts`**:

Engadir parámetro opcional `migrationRegistry?: MigrationRegistry` ao
final da sinatura. Cero ruptura de chamadores existentes.

Cambio na lóxica (despois do `JSON.parse` exitoso, antes da
validación final):

```ts
// Tras JSON.parse OK, pero antes de validateTreeDef:
//
// Se `parsed` ten `schemaVersion` != SCHEMA_VERSION e hai
// migrationRegistry, tentamos migrar. Se non hai migrationRegistry,
// segue comportamento actual (validate, que probablemente fallará con
// SCHEMA_VERSION_UNSUPPORTED se a estrutura non coincide).

let dataToValidate: unknown = parsed
if (
  migrationRegistry !== undefined &&
  isPlainRecord(parsed) &&
  typeof parsed.schemaVersion === 'string' &&
  parsed.schemaVersion !== SCHEMA_VERSION
) {
  const runner = new MigrationRunner(migrationRegistry, { locale })
  const migrated = await runner.run(
    parsed,
    parsed.schemaVersion,
    SCHEMA_VERSION,
  )
  if (!migrated.ok) {
    return migrated
  }
  dataToValidate = migrated.value
}

// Logo: validateTreeDef(dataToValidate, locale) como antes.
```

**Importante**:
- **`deserialize` pasa a ser `async`**. Cero ruptura: a sinatura
  anterior devolvía `Result<>` síncrono; agora devolve
  `Promise<Result<>>`. **Iso É unha ruptura** se hai chamadores
  existentes. T0 obriga a verificar consumidores.
- O wrapper `JsonSerializer.deserialize` segue exportado co mesmo nome.

**ALTERNATIVA se hai moitos chamadores existentes** (decidir tras T0):
- Crear función nova `deserializeAsync(json, locale, registry)` async,
  manter `deserialize(json, locale)` sync con comportamento actual.
- Iso evita ruptura; custo: dúas funcións.

**Decisión final do director** sobre se converter ou crear nova: **se
hai cero consumidores actuais de deserialize fóra dos tests**,
converter a async. **Se hai consumidores en TreeEngine ou similares**,
crear `deserializeAsync` separada.

T0 confirma cantos chamadores hai.

### 5.6 — Helper `isPlainRecord` reutilizado

`JsonSerializer.ts` xa ten `isPlainRecord` (function privada). Cero
necesidade de redefinir.

### 5.7 — Cero ErrorCodes novos

`MIGRATION_FAILED` e `NO_MIGRATION_PATH` xa existen en common.
**Cero edicións** en `packages/common/`.

### 5.8 — Exportación pública desde core

Engadir a `packages/core/src/engine/index.ts` (ou onde se centralicen
os exports do motor; verifica en T0):

```ts
export type { Migration } from './migrations/Migration.js'
export { MigrationRegistry } from './migrations/MigrationRegistry.js'
export { MigrationRunner } from './migrations/MigrationRunner.js'
export type { BackupStorage } from './migrations/AutoBackup.js'
export { AutoBackup } from './migrations/AutoBackup.js'
```

`JsonSerializer` xa está exportado.

### 5.9 — Tests funcionais

Crear catro ficheiros de test en `packages/core/__tests__/engine/migrations/`:

**`Migration.type-test.ts`** (~5 type assertions):
- Migration acepta sinatura correcta.
- Migration impide engadir campos non especificados (con
  `exactOptionalPropertyTypes`).

**`MigrationRegistry.test.ts`** (~10 tests):
1. Registry vacío: `isEmpty()` true, `size()` 0.
2. Register engade migración: `find(from, to)` recupera.
3. Register sobreescribe se xa existe.
4. `findFrom` devolve todas as migracións desde unha versión.
5. `findFrom` con `from` inexistente devolve array baleiro.
6. Chaining (`register().register()`) funciona.
7. Tests de tipos via type-test.

**`MigrationRunner.test.ts`** (~25 tests):

*Operacións básicas:*
1. `from === to` → cero migracións aplicadas, ok(data) inmediato.
2. Migración directa: `1.0.0 → 2.0.0` aplícaa.
3. Migración encadeada: `1.0.0 → 1.5.0 → 2.0.0`.
4. Migración con `from` distinto pero `to` igual: salto óptimo
   prefírese.

*Edge cases:*
5. Cero migracións dispoñibles: err(NO_MIGRATION_PATH).
6. Migración existe pero non conecta cara `to`: err(NO_MIGRATION_PATH).
7. Migración interna falla (devolve err): err(MIGRATION_FAILED)
   con originalError en context.
8. Ciclo defensivo: rexistro malicioso `1.0→2.0` e `2.0→1.0`, destino
   `3.0`: detéctase ciclo.

*Greedy:*
9. Hai `1.0→1.5` e `1.0→2.0`, destino `2.0`: usa directa `1.0→2.0`
    (cero pasos intermedios).
10. Hai `1.0→1.5` e `1.5→2.0`, destino `2.0`: encadea.

*Comparación semver:*
11. `1.0.0` < `1.0.1`.
12. `1.0.10` > `1.0.2` (comparación numérica, non lexicográfica).
13. `1.2.3` vs `1.2.3` igual.

*Locale:*
14. Erros usan locale 'gl' por defecto.
15. Erros usan locale inxectado ('es', 'en').

*Outros casos:*
16-25. Combinacións con múltiples migracións rexistradas.

**`AutoBackup.test.ts`** (~12 tests):

*Backup:*
1. `backup` con storage OK: devolve clave + timestamp.
2. `backup` con storage que falla en set: err(STORAGE_WRITE_FAILED).
3. Clave de backup ten formato `backup:{treeId}:{timestamp}`.
4. Dous backups consecutivos teñen claves distintas (timestamp).
5. Múltiples treeIds independentes.

*Restore:*
6. `restore` cunha clave existente: devolve o valor gardado.
7. `restore` con clave inexistente: err(STORAGE_READ_FAILED) con
   reason "backup not found".
8. `restore` con storage que falla en get: propaga err.

*Integration:*
9. Backup + restore round-trip preserva o dato.
10. Locale propaga a mensaxes.

*Type-test:*
11-12. BackupStorage interface cumprida por LocalStorageAdapter mock.

**`JsonSerializer.test.ts` (ampliación)** (~10 tests novos engadidos
aos existentes):
1. `deserialize` sen migrationRegistry: comportamento actual (rexeita
   schemaVersion distinto).
2. `deserialize` con migrationRegistry baleiro: rexeita igual
   (NO_MIGRATION_PATH).
3. `deserialize` con migración 1.0→SCHEMA_VERSION: migra e devolve
   TreeDef válido.
4. `deserialize` con migración encadeada.
5. `deserialize` con migración que devolve estrutura inválida: o
   validate posterior fai err(INVALID_TREE_DEF).
6. `deserialize` con JSON sen schemaVersion: cero migración; valida
   normal (e probablemente falla na validación).
7. `deserialize` con schemaVersion == SCHEMA_VERSION: cero migración
   tentada aínda con migrationRegistry.
8-10. Casos con locale, error propagation.

### 5.10 — Cobertura

- `Migration.ts`: tipo puro, sen lóxica (só interface). Cero
  cobertura "executable".
- `MigrationRegistry.ts`: **100% Stmts/Branch/Funcs/Lines**.
- `MigrationRunner.ts`: **100% Stmts/Funcs/Lines, ≥95% Branch**
  (ramas defensivas como `candidates[candidates.length - 1] === undefined`
  poden non exercerse facilmente).
- `AutoBackup.ts`: **100% Stmts/Branch/Funcs/Lines**.
- `JsonSerializer.ts`: mantén ≥95% Branch (engadimos liñas; non debe
  baixar).
- **Global core**: non baixar de baseline (actualmente ~98%).

### 5.11 — Cero modificación de pezas non listadas

Só:
- `packages/core/src/engine/migrations/Migration.ts` (NOVO)
- `packages/core/src/engine/migrations/MigrationRegistry.ts` (NOVO)
- `packages/core/src/engine/migrations/MigrationRunner.ts` (NOVO)
- `packages/core/src/engine/migrations/AutoBackup.ts` (NOVO)
- `packages/core/src/engine/JsonSerializer.ts` (MODIFICADO: ampliación
  prescrita)
- `packages/core/src/engine/index.ts` (MODIFICADO: 5 exports novos)
- `packages/core/__tests__/engine/migrations/Migration.type-test.ts`
  (NOVO)
- `packages/core/__tests__/engine/migrations/MigrationRegistry.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/migrations/MigrationRunner.test.ts`
  (NOVO)
- `packages/core/__tests__/engine/migrations/AutoBackup.test.ts` (NOVO)
- `packages/core/__tests__/engine/JsonSerializer.test.ts` (MODIFICADO:
  +10 tests aproximadamente)

**Cero modificación** de calquera outra peza:
- Cero `packages/common/`.
- Cero `packages/storage/`.
- Cero `tsconfig.base.json` ou outros tsconfig.
- Cero `tsup.config.ts`.
- Cero schemas existentes en core (treeDefSchema, TreeDefValidator).
- Cero TreeEngine, ProgressManager, StatComputer, etc.

**Se algo aparenta requirir modificación non listada** → **ESCALA
ANTES** (lección 3.4 L1; reforzada por §0.6).

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:**
- `packages/core/src/engine/migrations/Migration.ts` — NOVO
- `packages/core/src/engine/migrations/MigrationRegistry.ts` — NOVO
- `packages/core/src/engine/migrations/MigrationRunner.ts` — NOVO
- `packages/core/src/engine/migrations/AutoBackup.ts` — NOVO
- `packages/core/src/engine/JsonSerializer.ts` — MODIFICADO
- `packages/core/src/engine/index.ts` — MODIFICADO (+5 exports)

**Tests:**
- `packages/core/__tests__/engine/migrations/Migration.type-test.ts` — NOVO
- `packages/core/__tests__/engine/migrations/MigrationRegistry.test.ts` — NOVO
- `packages/core/__tests__/engine/migrations/MigrationRunner.test.ts` — NOVO
- `packages/core/__tests__/engine/migrations/AutoBackup.test.ts` — NOVO
- `packages/core/__tests__/engine/JsonSerializer.test.ts` — MODIFICADO (+10)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install`. Confirma 896 tests core `--force`.
2. **Verifica consumidores existentes de `JsonSerializer.deserialize`**:
   ```
   grep -rn "JsonSerializer\.deserialize\|deserialize(" packages/core/src
   ```
   Reporta exactamente cantos hai e onde. Iso determina se a sinatura
   pasa a `async` (cero ou poucos consumidores) ou créase
   `deserializeAsync` separada (moitos consumidores).
3. **Verifica que ErrorCode.NO_MIGRATION_PATH e MIGRATION_FAILED
   teñen mensaxes nas tres locales**:
   ```
   grep -B1 -A4 "NO_MIGRATION_PATH\|MIGRATION_FAILED" \
     packages/common/src/errors/messages.ts
   ```
   Se algunha mensaxe falta → **ESCALAR** (require engadir en common,
   non é alcance da 3.5).
4. **Verifica patrón actual de exports en
   `packages/core/src/engine/index.ts`**:
   ```
   cat packages/core/src/engine/index.ts
   ```
   Asegura que entendes onde engadir os 5 exports novos.
5. **Verifica que `SCHEMA_VERSION` está exportada de common**:
   ```
   grep "SCHEMA_VERSION" packages/common/src/index.ts
   ```

### T1 — Migration interface (5.1)

Crear `packages/core/src/engine/migrations/Migration.ts`.

Typecheck 20/20.

### T2 — MigrationRegistry (5.2)

Crear `packages/core/src/engine/migrations/MigrationRegistry.ts`.

Typecheck 20/20.

### T3 — Tests MigrationRegistry (5.9)

Crear `__tests__/engine/migrations/MigrationRegistry.test.ts` con ~10
tests. **Cobertura 100% en todo**.

### T4 — MigrationRunner (5.3)

Crear `packages/core/src/engine/migrations/MigrationRunner.ts`.

Typecheck 20/20.

### T5 — Tests MigrationRunner (5.9)

Crear `__tests__/engine/migrations/MigrationRunner.test.ts` con ~25
tests. Comparación semver + greedy + ciclo defensivo + locale.

**Cobertura**: 100% Stmts/Funcs/Lines, ≥95% Branch.

### T6 — AutoBackup (5.4)

Crear `packages/core/src/engine/migrations/AutoBackup.ts`.

Typecheck 20/20.

### T7 — Tests AutoBackup (5.9)

Crear `__tests__/engine/migrations/AutoBackup.test.ts` con ~12 tests.

**Cobertura**: 100% en todo.

### T8 — Type-test Migration (5.9)

Crear `__tests__/engine/migrations/Migration.type-test.ts` con
~5 type assertions.

### T9 — Decisión sync→async ou separar (post-T0)

**Baseado no resultado do T0.2**:
- **Caso A** (cero ou ≤2 consumidores existentes): converter
  `deserialize` a `async` directamente. Aplicar fix nos consumidores
  (engadir `await`). **Cuestión procedural**: se require modificar
  ficheiros non listados en §6 → **ESCALAR**.
- **Caso B** (>2 consumidores): crear función nova
  `deserializeAsync(json, locale, migrationRegistry)`. Manter
  `deserialize(json, locale)` síncrona sen cambios.

**T9 require decisión clara segundo T0.2**. Se hai dúbida → **ESCALAR**.

### T10 — Ampliación de JsonSerializer (5.5)

Aplicar a decisión T9. Engadir `MigrationRunner` ao import, ampliar
sinatura, engadir bloque de migración antes de `validateTreeDef`.

Typecheck 20/20.

### T11 — Tests JsonSerializer (5.9)

Engadir ~10 tests novos a
`__tests__/engine/JsonSerializer.test.ts`. **NON tocar tests
existentes** salvo se algún test verificaba un comportamento sync que
agora é async; nese caso, modificar ese test específico marcando o
cambio claramente.

### T12 — Exportar dende engine/index.ts (5.8)

Engadir os 5 exports.

### T13 — Verificación post-T12

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- Tests previos do core seguen pasando intactos (896 → 896+ novos).
- 171 tests previos de storage seguen verdes (cero ruptura).
- 17 tests common verdes.

### T14 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- MigrationRegistry 100%.
- MigrationRunner 100/≥95%/100/100.
- AutoBackup 100%.
- JsonSerializer ≥95% Branch.

### T15 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/src/engine/migrations/
pnpm test
```

**Nota sobre `unknown`**: as migracións aceptan/devolven `unknown`
como **tipo intencional** (contrato MASTER §22 e decisión 5.1). Cero
placeholder.

- Changeset **minor** para `@yggdrasil-forge/core` (engade API nova).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - Sistema de migracións de schema en
    `@yggdrasil-forge/core/engine/migrations/`:
    - `Migration` interface (segundo MASTER §22).
    - `MigrationRegistry` para rexistrar migracións.
    - `MigrationRunner` con resolución de path greedy (salto máximo)
      e detección defensiva de ciclos.
    - `AutoBackup` safety net que persiste estado pre-migración nun
      `BackupStorage` inxectado (compatible estructuralmente con
      LocalStorageAdapter / IndexedDBAdapter / etc.).
  - `JsonSerializer.deserialize` agora acepta `MigrationRegistry`
    opcional. Cando presente e `schemaVersion` non coincide, intenta
    migrar antes de validar. Comportamento sen registry sen cambios.
    [Se T9 = Caso A] **A sinatura pasa a async**.
    [Se T9 = Caso B] **Función nova `deserializeAsync` engadida;
    `deserialize` sync mantense intacta.**
  - Cero ErrorCodes novos: `MIGRATION_FAILED` e `NO_MIGRATION_PATH`
    xa existían en common.
  ```

### T16 — Commit + push

Commit Conventional:
`feat(core): add migration system with AutoBackup (sub-phase 3.5)`.
Push directo a `origin/main` (base `190fd98`). Reporta hash.

### Ficheiros esperados no diff final:

- `packages/core/src/engine/migrations/Migration.ts` (NOVO)
- `packages/core/src/engine/migrations/MigrationRegistry.ts` (NOVO)
- `packages/core/src/engine/migrations/MigrationRunner.ts` (NOVO)
- `packages/core/src/engine/migrations/AutoBackup.ts` (NOVO)
- `packages/core/src/engine/JsonSerializer.ts` (MODIFICADO)
- `packages/core/src/engine/index.ts` (MODIFICADO: +5 exports)
- `packages/core/__tests__/engine/migrations/Migration.type-test.ts` (NOVO)
- `packages/core/__tests__/engine/migrations/MigrationRegistry.test.ts` (NOVO)
- `packages/core/__tests__/engine/migrations/MigrationRunner.test.ts` (NOVO)
- `packages/core/__tests__/engine/migrations/AutoBackup.test.ts` (NOVO)
- `packages/core/__tests__/engine/JsonSerializer.test.ts` (MODIFICADO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)

**NON deben aparecer cambios en**:
- `packages/common/` (cero edición).
- `packages/storage/` (cero edición).
- `tsconfig.base.json` (cero edición; lección 3.4 L1).
- Calquera `tsup.config.ts` (cero edición; lección 3.4 L1).
- `pnpm-workspace.yaml` (cero dep nova).
- `pnpm-lock.yaml` (cero install novo).
- Outras pezas core (TreeEngine, ProgressManager, schemas, etc.).
- Outros tests existentes (salvo o JsonSerializer.test.ts).

**Se algún destes aparece no diff** → **ESCALAR DURANTE A SUB-FASE**,
non aplicar fix sen consultar.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do ficheiro). Marcadores
`// ── INICIO/FIN ──`. 2 espazos, comilla simple, sen `;`, trailing
commas, máx 100 cols, UTF-8 LF. TS strict, **cero `any`**. NON
desactives Biome.

**`unknown`** é tipo correcto en Migration / MigrationRunner /
AutoBackup (contrato xenérico segundo MASTER §22). Cero placeholder.

---

## 9. QUE NON FACER

- ❌ Mover Migration, MigrationRegistry ou MigrationRunner a `common`
  ou a outro paquete (5.11: están en core engine/migrations/).
- ❌ Importar `StorageAdapter` desde `@yggdrasil-forge/storage` no
  AutoBackup (5.4: `BackupStorage` interface local).
- ❌ Engadir dependencia `semver` ou similar (5.3: helper privado
  trivial).
- ❌ Implementar `unmigrate` ou reversibilidade efectiva (5.1:
  `irreversible` é só informativo nesta sub-fase).
- ❌ Auto-purga de backups antigos (5.4: consumidor xestiona).
- ❌ Modificar mensaxes de erro en common (T0.3: se faltan, escalar).
- ❌ Modificar schemas existentes en core.
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, ou calquera
  config global. **Calquera fix técnico → ESCALAR** (§0.6, lección
  3.4 L1).
- ❌ Engadir ErrorCodes (5.7).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente nin reagrupar `[Unreleased]`
  anteriores (DT-12).
- ❌ Placeholders / `any`.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 3.5 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 190fd98)
✅ Migration interface segundo MASTER §22 (5 campos)
✅ MigrationRegistry: rexistro de migracións por (from, to)
✅ MigrationRunner: aplicación secuencial con greedy de salto máximo
✅ AutoBackup: safety net sobre BackupStorage inxectado
✅ JsonSerializer.deserialize: ampliada con migrationRegistry opcional
   (T9 decisión aplicada: <Caso A async | Caso B deserializeAsync>)
✅ Cero acoplamento core→storage (BackupStorage interface local)
✅ Cero dependencia externa semver (helper compareSemver privado)
✅ Cero ErrorCodes novos (MIGRATION_FAILED, NO_MIGRATION_PATH xa
   existían)
✅ Cero modificación de outros paquetes/configs
✅ T0.2 consumidores deserialize: <N>
✅ T0.3 mensaxes locales: <confirmado nas 3>
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> tests MigrationRegistry
   - <Y> tests MigrationRunner
   - <Z> tests AutoBackup
   - <W> tests JsonSerializer ampliados
✅ Cobertura:
   - MigrationRegistry 100/100/100/100
   - MigrationRunner 100/<X%>/100/100 (≥95% branch)
   - AutoBackup 100/100/100/100
   - JsonSerializer mantén ≥95% branch
   - Global core: <X%> (baseline 98.18%; non baixou)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
   (Nota: 'unknown' en migrations/ é tipo correcto segundo MASTER §22)
🛑 DECISIÓN REQUERIDA: <ningunha | detalle>
⚠️ Limitacións documentadas:
   - `irreversible` é informativo (cero unmigrate implementado).
   - Cero auto-purga de backups (consumidor xestiona).
   - BackupStorage interface local en AutoBackup; movemento eventual
     de StorageAdapter a common é candidato a hardening futuro (cero
     acción aquí).
✅ Changeset minor (core) + nova [Unreleased] con Added
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 3.6 (Reconciler) ou outra que decida o director.
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 3.5. Sistema de migracións con safety net. Tras 3.4
L1, calquera modificación non listada → ESCALAR antes de aplicar.*
