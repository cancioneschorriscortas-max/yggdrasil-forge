# BRIEFING — SUB-FASE 8.4.a de Yggdrasil Forge

> Pega este documento no chat executor.
> **PRIMEIRA das 3 sub-sub-fases de 8.4** (PluginManager + HookRunner).
> 8.4.a entrega **PluginManager standalone** (in-memory CRUD de
> plugins) + **4 APIs públicas en TreeEngine** (`registerPlugin`,
> `unregisterPlugin`, `getPlugin`, `listPlugins`).
>
> **Garantía dura**: en 8.4.a o sistema é **non funcional aínda**:
> `register()` só **ALMACENA** o plugin no `Map<id, Plugin>` (cero
> chamada a `plugin.install()`). 8.4.b modificará register() para
> chamar install() con PluginAPI real (registerHook + emit + log).
> 8.4.c conectará hooks en unlock/lock/respec/canUnlock.
>
> **Cero `plugin.install()` chamada en 8.4.a**. Documentado
> explicitamente: "install() chamarase en 8.4.b cando PluginAPI
> estea implementada". Plugins rexistrados en 8.4.a son **datos
> inactivos** ata 8.4.b.
>
> **Decisións confirmadas polo director**:
> - **PluginAPI scope mínimo** en 8.4.b: registerHook + emit + log
>   (registerCondition, registerLayout, registerStorageAdapter
>   DIFERIDOS a sub-fases futuras).
> - **Permission enforcement audit-only V1.0** (MASTER §40):
>   declarativo; enforcement strict DIFERIDO a marketplace V2.0.
> - **Prefixo de ErrorCodes novo `YGG_PL*`** (Plugins) coherente
>   con convención por categoría.
>
> **Lección 8.3 L1 aplicada con rigor**: T0.2 verifica empíricamente
> que `registerPlugin`, `unregisterPlugin`, `getPlugin`,
> `listPlugins` NON existen en TreeEngine actual (verificado polo
> director).
>
> 8.4.b, 8.4.c, 8.5-8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA. **Especial
atención** aplicando lección 8.3 L1: se descobres calquera método
en TreeEngine que xa exista co mesmo nome dos prescritos
(`registerPlugin`, `unregisterPlugin`, `getPlugin`, `listPlugins`)
**ESCALAR INMEDIATAMENTE**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.4.a — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.4.a — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando
aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: pezas novas (PluginManager + 4 APIs) chegan a
**100/100/100/100**. Cero regresión na baseline post-8.3.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de
calquera ficheiro existente fora dos prescritos en §5.1. Tódolos
1600 core + 60 common + 193 storage + 116 react = 1969 tests
existentes deben pasar intactos.

**0.14 — Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
ausencia das 4 APIs novas con grep específico antes de empezar.

**0.15 — Patrón consistente con managers existentes**: PluginManager
segue o patrón de `SnapshotManager`, `LoadoutManager` (clase con
Map<id, T> + métodos CRUD). **Verificar empíricamente** o estilo
nos managers de 8.2 antes de implementar.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.4.a** de Yggdrasil Forge. **PRIMEIRA das 3
sub-sub-fases de 8.4** (PluginManager + HookRunner).

**Pezas (5 grupos)**:

**Grupo A — ErrorCodes novos**:
1. **`packages/common/src/errors/codes.ts`** (MODIFICADO): engadir
   bloque novo `// Plugins` con 2 ErrorCodes baixo prefixo novo
   `YGG_PL*`:
   ```ts
   // Plugins
   PLUGIN_ALREADY_REGISTERED = 'YGG_PL001',
   PLUGIN_NOT_FOUND = 'YGG_PL002',
   ```
2. **`packages/common/src/errors/messages.ts`** (MODIFICADO):
   engadir 2 entradas (gl/es/en) para os ErrorCodes anteriores.

**Grupo B — PluginManager (NOVO)**:
3. **`packages/core/src/plugins/PluginManager.ts`** (NOVO; interno).
   Clase con `Map<id, Plugin>` + 4 métodos: `register(plugin)`,
   `unregister(id)`, `get(id)`, `list()`.
   - **Cero chamada a `plugin.install()`** en 8.4.a (decisión do
     director; install() conectarase en 8.4.b).
   - **Cero PluginAPI** (sub-fase 8.4.b).
   - In-memory only (cero persistencia en 8.4.a; sub-fases
     posteriores poden engadir se require).

**Grupo C — TreeEngine.4 APIs novas**:
4. **`packages/core/src/engine/TreeEngine.ts`** (MODIFICADO):
   engadir imports + 1 membro privado + inicialización en
   constructor + 4 APIs públicas.

**Grupo D — Re-exports en types**:
5. **Cero re-exports novos**. Plugin types xa exportados desde
   `packages/core/src/types/index.ts` (verificado: liña con
   `export type { Plugin, PluginAPI, Hooks, ... } from
   './plugin.js'`).

**Grupo E — Tests**:
6. **`packages/core/__tests__/plugins/PluginManager.test.ts`**
   (NOVO; ~8 tests).
7. **`packages/core/__tests__/plugins/TreeEngine.plugins.test.ts`**
   (NOVO; ~6 tests).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros 14 paquetes
  scaffold.
- **Calquera outro ficheiro** en `packages/core/src/` fora de
  TreeEngine.ts (+1 membro + 4 APIs).
- **Calquera test existente** (1600 core, 60 common, etc.).
- `packages/core/src/builds/` (ficheiros de 8.1, 8.2 intactos).
- `packages/core/src/types/` (Plugin types xa tipados; cero
  modificación).
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `docs/architecture/MASTER.md`.

**CERO deps de npm engadidas.** Cero entry points novos. Cero
hooks chamados. Cero PluginAPI implementada.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `357b69b`, verificada
empíricamente)**.

### Lección 8.3 L1 reaplicada con rigor

```bash
# Confirmar ausencia das 4 APIs novas en TreeEngine.ts:
for method in registerPlugin unregisterPlugin getPlugin listPlugins; do
  grep -nE "^  (async )?${method}\(" packages/core/src/engine/TreeEngine.ts
done
# Resultado verificado polo director: 0 matches en cada un.
# Confirmacion: ✅ libres para 8.4.a.

# Confirmar hooks NON chamados (8.4.c conectaraos):
for hook in beforeUnlock afterUnlock beforeLock afterLock computeUnlockability computeCost; do
  grep -cE "\\b${hook}\\b" packages/core/src/engine/TreeEngine.ts
done
# Resultado: 0 en cada un. Confirmacion: ✅ cero chamadas reais.
```

### Plugin types xa tipados (verificado)

`packages/core/src/types/plugin.ts` ten:
- `Plugin` interface.
- `PluginAPI` interface (8.4.b implementará).
- `Hooks` interface (8.4.c conectará).
- `HookContext` interface.
- `PluginPermission` union type.
- `PluginInstallResult` interface.
- `PluginEngineHandle` type (placeholder `unknown`).
- `PluginLogLevel` type.
- `ConditionEvaluator` type.

**Re-exportados** desde `packages/core/src/types/index.ts`. **Cero
modificación require** en types.

### Plugin.install signature (verificado)

```ts
interface Plugin {
  // ...
  install(engine: PluginEngineHandle, api: PluginAPI): void | Promise<void>
  uninstall?(engine: PluginEngineHandle): void | Promise<void>
}
```

**Decisión do director para 8.4.a**: **cero chamada a install()**.
Plugins rexistrados en 8.4.a son **datos inactivos** ata 8.4.b
modifique `register()` para chamar install() con PluginAPI real.

**Razón**: 8.4.a non ten PluginAPI implementada. Pasar `null` ou
`undefined` como api ao install é arriscado (plugins poden non
manexalo). Cero chamada é máis limpo.

### Convención de prefixos de ErrorCodes (lección 8.1)

Verificado en `packages/common/src/errors/codes.ts`:
- `YGG_E*` (Engine).
- `YGG_F*` (Federation).
- `YGG_C*` (Concurrency).
- `YGG_RO*` (Read-only).
- `YGG_T*` (Tenancy).
- `YGG_R*` (Reconcile).
- `YGG_L*` (Layout).
- `YGG_B*` (Builds, sub-fases 8.1-8.3).

**Para 8.4.a**: introducir novo prefixo **`YGG_PL*` (Plugins)**.
Coherente coa convención por categoría.

**Verificado empíricamente**: cero `YGG_PL` no codes.ts. ✅ libre.

### Patrón de manager (SnapshotManager / LoadoutManager de 8.2)

Verificado empíricamente:

```ts
export class SnapshotManager {
  private readonly snapshots = new Map<string, BuildSnapshot>()
  // ...

  async create(state, buildId, label?): Promise<BuildSnapshot> { ... }
  async restore(id): Promise<Result<BuildSnapshot>> { ... }
  async list(): Promise<readonly BuildSnapshot[]> { ... }
  async delete(id): Promise<Result<void>> { ... }
}
```

**Decisión do director para 8.4.a**: PluginManager segue o mesmo
patrón. **Pero**: cero require async para CRUD básico in-memory
(cero storage en 8.4.a). **Async vs sync**:

- `register(plugin)`: **async** porque en 8.4.b chamará install()
  (que pode ser async). **Mellor async desde 8.4.a** para evitar
  signature break en 8.4.b.
- `unregister(id)`: **async** para coherencia (en 8.4.b podería
  chamar uninstall() async).
- `get(id)`: **sync** (devolve Plugin | null instantáneo).
- `list()`: **sync** (devolve readonly array instantáneo).

### TreeEngine constructor pattern (verificado)

```ts
private readonly snapshotManager: SnapshotManager
private readonly loadoutManager: LoadoutManager

constructor(treeDef, options) {
  // ...
  this.snapshotManager = new SnapshotManager(options?.storage)
  this.loadoutManager = new LoadoutManager(options?.storage)
}
```

**Para 8.4.a**: engadir `pluginManager` similar. Cero require
options (cero storage; cero deps).

### Estado scaffold tras 8.3 REVISED

```
packages/core/src/
├── builds/              (existentes 8.1-8.3)
├── engine/              (existentes; TreeEngine modificado)
├── plugins/             (NOVO en 8.4.a)
│   └── PluginManager.ts (NOVO 8.4.a)
├── types/               (intacto)
├── utils/               (intacto)
└── index.ts             (cero re-export novo; PluginManager interno)

packages/core/__tests__/
├── builds/              (existentes)
├── engine/              (existentes)
├── plugins/             (NOVO en 8.4.a)
│   ├── PluginManager.test.ts        (NOVO 8.4.a)
│   └── TreeEngine.plugins.test.ts   (NOVO 8.4.a)
├── ssr/                 (existentes)
└── ...
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `357b69b` (sub-fase 8.3 REVISED).
- 1600 core + 60 common + 193 storage + 116 react = 1969 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 43 ErrorCodes existentes (incluído B001-B007).
- DT abertas: 11.
- **Cadea 40 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/core` un **`PluginManager`
class interna** en `packages/core/src/plugins/` (in-memory `Map<id,
Plugin>` + 4 métodos: `register` async, `unregister` async, `get`
sync, `list` sync; **cero chamada a `plugin.install()`** en 8.4.a
— DIFERIDO a 8.4.b); + **4 APIs públicas async** en TreeEngine
(`registerPlugin`, `unregisterPlugin`, `getPlugin`, `listPlugins`)
delegando ao PluginManager; + **2 ErrorCodes novos** baixo prefixo
novo **`YGG_PL*` (Plugins)**: `PLUGIN_ALREADY_REGISTERED` (PL001)
e `PLUGIN_NOT_FOUND` (PL002) con mensaxes localizadas gl/es/en;
+ tests específicos (~14). **Plugins rexistrados son datos
inactivos** ata 8.4.b implemente PluginAPI + chame install().
**Cero modificación de pezas existentes** salvo TreeEngine
cirúrxico (+1 membro privado + 4 APIs) + 2 ficheiros de common.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (4)**:
- `packages/core/src/plugins/PluginManager.ts` (~100 liñas).
- `packages/core/__tests__/plugins/PluginManager.test.ts` (~120
  liñas; ~8 tests).
- `packages/core/__tests__/plugins/TreeEngine.plugins.test.ts`
  (~120 liñas; ~6 tests).
- `.changeset/plugin-manager-8-4-a.md` (NOVO).

**MODIFICADOS (4)**:
- `packages/common/src/errors/codes.ts` (engadir 2 entradas baixo
  prefixo novo `YGG_PL*`).
- `packages/common/src/errors/messages.ts` (engadir 2 entradas
  gl/es/en).
- `packages/core/src/engine/TreeEngine.ts` (engadir imports + 1
  membro privado + inicialización + 4 APIs).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 8 ficheiros tocados** (4 NOVOS + 4 MODIFICADOS).

**Cero modificación de**:
- Calquera outro ficheiro en `packages/core/src/` (especialmente:
  `types/plugin.ts` intacto; Plugin types xa tipados).
- Tests existentes (1600 core + outros).
- `packages/core/src/builds/` (ficheiros 8.1-8.3 intactos).
- `packages/storage/`, `packages/react/`, outros paquetes.
- Configs.
- `docs/architecture/MASTER.md`.

### 5.2 — ErrorCodes novos (FIXADOS)

**Engadir** en `packages/common/src/errors/codes.ts` **AO FINAL**
do enum, despois das entradas existentes do bloque `// Builds`
(B001-B007), creando un bloque novo:

```ts
  // Plugins (sub-fase 8.4.a)
  PLUGIN_ALREADY_REGISTERED = 'YGG_PL001',
  PLUGIN_NOT_FOUND = 'YGG_PL002',
```

### 5.3 — Mensaxes localizadas (FIXADAS)

**Engadir** en `packages/common/src/errors/messages.ts` despois das
entradas B001-B007:

```ts
  [ErrorCode.PLUGIN_ALREADY_REGISTERED]: {
    gl: 'Plugin xa rexistrado: "{id}"',
    es: 'Plugin ya registrado: "{id}"',
    en: 'Plugin already registered: "{id}"',
  },
  [ErrorCode.PLUGIN_NOT_FOUND]: {
    gl: 'Plugin non atopado: "{id}"',
    es: 'Plugin no encontrado: "{id}"',
    en: 'Plugin not found: "{id}"',
  },
```

### 5.4 — PluginManager.ts (FIXADO)

```ts
// packages/core/src/plugins/PluginManager.ts
// ── INICIO: PluginManager ──
// Manexo in-memory de plugins rexistrados nun TreeEngine.
//
// **Sub-fase 8.4.a**: implementa CRUD básico (register, unregister,
// get, list). **Cero chamada a `plugin.install()`** — diferido a
// 8.4.b cando PluginAPI estea implementada. **Cero hooks chamados**
// — diferido a 8.4.c.
//
// **Patrón**: Map<id, Plugin> interno. Async para coherencia
// con futuras chamadas a install() / uninstall() en 8.4.b.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Locale, Result } from '@yggdrasil-forge/common'
import type { Plugin } from '../types/index.js'
import { err, ok } from '../types/index.js'

const DEFAULT_LOCALE: Locale = 'gl'

export class PluginManager {
  private readonly plugins = new Map<string, Plugin>()
  private readonly locale: Locale

  constructor(locale?: Locale) {
    this.locale = locale ?? DEFAULT_LOCALE
  }

  /**
   * Rexistra un plugin no manager.
   *
   * **Sub-fase 8.4.a**: só almacena o plugin no Map. **Cero chamada
   * a `plugin.install()`** — chamarase en 8.4.b cando PluginAPI
   * estea implementada.
   *
   * Errores posibles:
   * - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`): se o id xa existe.
   */
  async register(plugin: Plugin): Promise<Result<void>> {
    if (this.plugins.has(plugin.id)) {
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_ALREADY_REGISTERED,
          getErrorMessage(ErrorCode.PLUGIN_ALREADY_REGISTERED, this.locale, {
            id: plugin.id,
          }),
        ),
      )
    }
    this.plugins.set(plugin.id, plugin)
    return ok(undefined)
  }

  /**
   * Desrexistra un plugin polo id.
   *
   * **Sub-fase 8.4.a**: só borra do Map. **Cero chamada a
   * `plugin.uninstall()`** — chamarase en 8.4.b.
   *
   * Errores posibles:
   * - `PLUGIN_NOT_FOUND` (`YGG_PL002`): se o id non existe.
   */
  async unregister(id: string): Promise<Result<void>> {
    if (!this.plugins.has(id)) {
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_NOT_FOUND,
          getErrorMessage(ErrorCode.PLUGIN_NOT_FOUND, this.locale, { id }),
        ),
      )
    }
    this.plugins.delete(id)
    return ok(undefined)
  }

  /** Devolve o plugin polo id ou null se non existe. Sync. */
  get(id: string): Plugin | null {
    return this.plugins.get(id) ?? null
  }

  /** Lista todos os plugins rexistrados (orde de inserción). Sync. */
  list(): readonly Plugin[] {
    return Array.from(this.plugins.values())
  }
}
// ── FIN: PluginManager ──
```

**Decisións nesta peza**:
- **Cero exposición pública** (interno; cero re-export desde
  core/src/index.ts).
- **`register` e `unregister` son async** para preparar 8.4.b sen
  cambio de signature.
- **`get` e `list` son sync** (cero IO; cero estado computed).
- **Cero chamada a `plugin.install()` nin `plugin.uninstall()`** en
  8.4.a (documentado en JSDoc).
- **Locale opcional**: para xerar mensaxes de erro localizadas (igual
  a SnapshotManager/LoadoutManager pattern, pero usando DEFAULT_LOCALE
  = 'gl' como en outros managers).

### 5.5 — TreeEngine modificacións (FIXADO)

**Engadir import** ao top de TreeEngine.ts (despois dos existentes):

```ts
import { PluginManager } from '../plugins/PluginManager.js'
```

**Engadir Plugin** ao import de types/index.js existente:

```ts
import type {
  // ... existentes
  Plugin,            // ← engadir
  // ... resto existentes
} from '../types/index.js'
```

**Engadir membro privado** despois dos existentes (despois de
`loadoutManager` da sub-fase 8.2; antes do constructor):

```ts
// ── INICIO: 8.4.a — manager de plugins ──
private readonly pluginManager: PluginManager
// ── FIN: 8.4.a ──
```

**Inicializar no constructor** despois das inicializacións
existentes (despois de `this.loadoutManager = new LoadoutManager(...)`):

```ts
// ── INICIO: 8.4.a ──
this.pluginManager = new PluginManager(this.locale)
// ── FIN: 8.4.a ──
```

**Engadir 4 APIs públicas** despois de `deleteLoadout` (que é da
sub-fase 8.2; é dicir, ao final da sección de Loadouts):

```ts
// ── Plugins (8.4.a) ──

/**
 * Rexistra un plugin no engine.
 *
 * **Sub-fase 8.4.a**: só almacena o plugin. **Cero chamada a
 * `plugin.install()`** ata 8.4.b implemente PluginAPI. **Cero
 * hooks chamados** ata 8.4.c.
 *
 * Errores posibles:
 * - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`): se o id xa existe.
 *
 * @example
 * const result = await engine.registerPlugin({
 *   id: 'my-plugin',
 *   name: 'My Plugin',
 *   version: '1.0.0',
 *   apiVersion: '1.0.0',
 *   install: (engine, api) => { /* setup */ },
 * })
 */
async registerPlugin(plugin: Plugin): Promise<Result<void>> {
  return this.pluginManager.register(plugin)
}

/**
 * Desrexistra un plugin polo id.
 *
 * **Sub-fase 8.4.a**: só borra do Map. **Cero chamada a
 * `plugin.uninstall()`** ata 8.4.b.
 */
async unregisterPlugin(id: string): Promise<Result<void>> {
  return this.pluginManager.unregister(id)
}

/** Devolve o plugin polo id ou null se non existe. */
getPlugin(id: string): Plugin | null {
  return this.pluginManager.get(id)
}

/** Lista todos os plugins rexistrados (orde de inserción). */
listPlugins(): readonly Plugin[] {
  return this.pluginManager.list()
}
```

**Cero modificación** doutros métodos do TreeEngine.

### 5.6 — Tests prescritos (~14 totais)

**`__tests__/plugins/PluginManager.test.ts`** (~8 tests):

1. Constructor: PluginManager creado con locale 'gl' por defecto.
2. Constructor con locale custom: 'es' resulta en mensaxes en
   español.
3. `register(plugin)` engade ao Map; subsequente `get(id)` devolve
   o plugin.
4. `register(duplicate)` devolve `err(PLUGIN_ALREADY_REGISTERED)`.
5. `unregister(id)` borra do Map; subsequente `get(id)` devolve
   null.
6. `unregister(inexistente)` devolve `err(PLUGIN_NOT_FOUND)`.
7. `list()` devolve plugins en orde de inserción (sync).
8. **Verificación crítica**: `register(plugin)` **NON chama**
   `plugin.install()` en 8.4.a (decisión do Director; install
   diferido a 8.4.b). Usar spy/mock para confirmar 0 chamadas.

**`__tests__/plugins/TreeEngine.plugins.test.ts`** (~6 tests):

9. `engine.registerPlugin(plugin)` devolve `ok` para plugin novo.
10. `engine.registerPlugin(duplicate)` devolve
    `err(PLUGIN_ALREADY_REGISTERED)`.
11. `engine.unregisterPlugin(id)` devolve `ok` para plugin
    rexistrado.
12. `engine.unregisterPlugin('inexistente')` devolve
    `err(PLUGIN_NOT_FOUND)`.
13. `engine.getPlugin(id)` devolve plugin rexistrado; null se non.
14. `engine.listPlugins()` devolve readonly array con plugins
    rexistrados.

**Total: ~14 tests novos**. Post-8.4.a esperado: 1600 → **~1614
core tests**.

**Decisión sobre fixtures**:
- Plugin mock mínimo:
  ```ts
  const makePlugin = (id: string): Plugin => ({
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '1.0.0',
    install: vi.fn(),
  })
  ```
- TreeEngine mínimo: reutilizar fixture dos tests anteriores
  (snapshot/loadout/respec).

### 5.7 — Cobertura prescrita

- **PluginManager.ts**: **100/100/100/100**.
- **TreeEngine.ts**: manter baseline; 100% nas liñas novas
  (4 APIs + inicialización).
- **packages/common**: cobertura mantida (mensaxes son data; cubertas
  polos tests que exercen as ramas err).
- **Cero regresión** noutras pezas.

### 5.8 — Cero deps novas

Verificable empíricamente.

### 5.9 — Test counts esperados post-8.4.a

- **core**: 1600 + ~14 = **~1614 tests**.
- **common, storage, react**: intactos.

### 5.10 — Verificación crítica 8.4.a — cero install() chamada

**Mandato firme**: `register()` **NON chama** `plugin.install()`
en 8.4.a.

**Razón documental**: install() require PluginAPI implementada
(8.4.b). Pasar `null` ou stub é arriscado (plugins poden non
manexalo).

**Verificación**: test #8 usa `vi.fn()` para `plugin.install` e
verifica `expect(plugin.install).not.toHaveBeenCalled()` tras
register.

**Decisión arquitectónica documentada en JSDoc** de `register()` e
`registerPlugin()`: "install() chamarase en 8.4.b cando PluginAPI
estea implementada".

### 5.11 — Sobre coordinación con 8.4.b e 8.4.c

**8.4.b** modificará:
- `PluginManager.register()`: engadir chamada a `plugin.install(engine,
  api)` con PluginAPI real.
- `PluginManager.unregister()`: engadir chamada a `plugin.uninstall(engine)`.
- Crear `PluginAPI` implementation classe.
- Crear `HookRunner` standalone.

**8.4.c** modificará:
- TreeEngine.unlock/lock/respec/canUnlock: chamar HookRunner
  before/after/compute.

**8.4.a establece a base API**; 8.4.b/c constrúen sobre ela sen
romper signatures.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| PluginManager class | clase + 4 métodos | PluginManager.ts | ~100 |
| 2 ErrorCodes | enum entries | codes.ts | +5 |
| 2 mensaxes gl/es/en | object entries | messages.ts | +12 |
| 4 APIs TreeEngine | métodos públicos | TreeEngine.ts | +60 |
| Membro pluginManager | private readonly + init | TreeEngine.ts | +5 |
| 2 ficheiros tests | describe blocks | 2 .test.ts | ~240 |

**Total estimado**: ~180 liñas de código + ~240 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (4)**:
- `packages/core/src/plugins/PluginManager.ts`
- `packages/core/__tests__/plugins/PluginManager.test.ts`
- `packages/core/__tests__/plugins/TreeEngine.plugins.test.ts`
- `.changeset/plugin-manager-8-4-a.md`

**MODIFICADOS (4)**:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 8 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`, especialmente
  `types/plugin.ts` (Plugin types xa tipados; cero modificación
  require).
- Tests existentes (1600 core + outros).
- `packages/storage/`, `packages/react/`, outros paquetes.
- `package.json`, `tsconfig.json`, etc.
- `docs/architecture/MASTER.md`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`. Patrón Manager idéntico ao precedente
(SnapshotManager/LoadoutManager).

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en cada método público de TreeEngine (4 APIs
novas).

**JSDoc en PluginManager**: básico (clase interna).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Patrón Result**: `register` e `unregister` devolven `Result<void>`.
`get` e `list` devolven valores directos (cero pode fallar).

**Cero throw**: erros encerrados en Result.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/storage/`, `packages/react/`, outros
  paquetes scaffold.
- ❌ Modificar **calquera outro ficheiro** en `packages/core/src/`
  fora dos 3 prescritos en §5.1.
- ❌ Modificar `packages/core/src/types/plugin.ts` (Plugin types
  xa tipados; cero require modificación).
- ❌ Modificar tests existentes (1600 core + 60 common, etc.).
- ❌ Modificar `packages/core/src/builds/` (ficheiros de 8.1-8.3
  intactos).
- ❌ **Chamar `plugin.install()`** ou `plugin.uninstall()` (DIFERIDO
  a 8.4.b).
- ❌ Implementar `PluginAPI` class (DIFERIDO a 8.4.b).
- ❌ Implementar `HookRunner` (DIFERIDO a 8.4.b).
- ❌ Modificar `unlock`, `lock`, `respec`, `canUnlock` doutras
  formas (DIFERIDO a 8.4.c).
- ❌ Engadir `register*` adapters dynamic (cero
  `registerCondition`, `registerLayout`, `registerStorageAdapter`
  en 8.4 — DIFERIDOS a sub-fases futuras).
- ❌ Engadir validation de PluginPermissions (V2.0 marketplace).
- ❌ Engadir deps de npm.
- ❌ Exportar PluginManager publicamente (interno).
- ❌ Modificar core/src/index.ts (Plugin types xa re-exportados
  desde types/index.ts; cero require nova entrada).
- ❌ Usar `!` non-null assertions.
- ❌ Engadir Date.now() / Math.random() (cero non-determinismo).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T9)

### T0 — Verificación previa + lección 8.3 L1 aplicada con RIGOR

**T0.1** — `git status` limpo. `git log -1` mostra `357b69b` como HEAD.

**T0.2** — **CRÍTICO** — Verificacións empíricas (lección 8.3 L1):

```bash
# Confirmar que as 4 APIs novas non existen en TreeEngine:
for method in registerPlugin unregisterPlugin getPlugin listPlugins; do
  echo -n "$method: "
  result=$(grep -nE "^  (async )?${method}\(" packages/core/src/engine/TreeEngine.ts)
  if [ -z "$result" ]; then
    echo "NON EXISTE ✅"
  else
    echo "EXISTE -> $result; ESCALAR"
  fi
done
# Esperado: 4 "NON EXISTE ✅".

# Confirmar que packages/core/src/plugins/ non existe:
ls packages/core/src/plugins/ 2>/dev/null && echo "ESCALAR" || echo "Non existe ✅ (creará en T3)"

# Confirmar prefixo YGG_PL libre:
grep -c "YGG_PL" packages/common/src/errors/codes.ts
# Esperado: 0

# Confirmar Plugin types xa exportados desde types/index.ts:
grep -E "Plugin|PluginAPI|Hooks" packages/core/src/types/index.ts | head -5
# Esperado: re-exports existentes
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1600 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir ErrorCodes + mensaxes a common

Aplicar §5.2 e §5.3 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/common test --force      # 60 tests intactos
```

### T2 — Crear directorio + PluginManager.ts

Crear `packages/core/src/plugins/` + `PluginManager.ts` segundo §5.4
literal.

### T3 — Verificación intermedia (typecheck)

```bash
pnpm turbo run typecheck --force                          # 22/22
```

Cero novos tests aínda; só typecheck do PluginManager standalone.

### T4 — Crear test PluginManager.test.ts

Aplicar §5.6 §1-8 literal (~8 tests).

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/core test --force        # 1600 + 8 = 1608
```

### T5 — Modificar TreeEngine (imports + membro + init + 4 APIs)

Aplicar §5.5 literal.

### T6 — Verificación CRÍTICA (1600 tests previos pasan inchanged)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1608 tests
```

**Tódolos 1600 tests previos deben pasar intactos** (cero
modificación de pezas existentes; só engadir 1 membro + 4 APIs).
**Especial atención**: tests existentes de TreeEngine.snapshot,
TreeEngine.loadout, TreeEngine.respec deben seguir pasando.

Se algún falla → **ESCALAR**.

### T7 — Crear test TreeEngine.plugins.test.ts

Aplicar §5.6 §9-14 literal (~6 tests).

### T8 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1614 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "plugins/|^All files"
# Cobertura targets:
#   plugins/PluginManager.ts: 100/100/100/100
#   TreeEngine.ts: baseline mantida ou superada
#   Resto: sen regresión
```

### T9 — Build + Lint + Format + Grep + Changeset + commit + push

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/plugins/PluginManager.ts \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/__tests__/plugins/PluginManager.test.ts \
  packages/core/__tests__/plugins/TreeEngine.plugins.test.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

`.changeset/plugin-manager-8-4-a.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): add PluginManager + 4 plugin APIs in TreeEngine (sub-phase 8.4.a)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/core`: **`PluginManager` class interna** en
  `packages/core/src/plugins/` (in-memory `Map<id, Plugin>` con 4
  métodos: `register` async, `unregister` async, `get` sync,
  `list` sync). Cero export público (interno).
- `TreeEngine`: **4 APIs públicas novas**:
  - `registerPlugin(plugin: Plugin): Promise<Result<void>>` —
    rexistra un plugin. **NOTA**: en 8.4.a só almacena o plugin;
    `plugin.install()` chamarase en 8.4.b cando PluginAPI estea
    implementada.
  - `unregisterPlugin(id: string): Promise<Result<void>>`.
  - `getPlugin(id: string): Plugin | null` (sync).
  - `listPlugins(): readonly Plugin[]` (sync).
- `@yggdrasil-forge/common`: **2 ErrorCodes novos** baixo prefixo
  novo **`YGG_PL*` (Plugins)**:
  - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`): rexistro con id
    duplicado.
  - `PLUGIN_NOT_FOUND` (`YGG_PL002`): unregister/get de plugin
    inexistente.
  - Mensaxes localizadas gl/es/en.

### Note
- Sub-fase 8.4.a PRIMEIRA das 3 sub-sub-fases de 8.4 (PluginManager
  + HookRunner). Decomposición decidida polo director:
  - **8.4.a**: PluginManager standalone + 4 APIs (esta sub-fase).
  - **8.4.b**: HookRunner + PluginAPI implementation (registerHook
    + emit + log); register() pasa a chamar install() con
    PluginAPI real.
  - **8.4.c**: integración hooks (before/after/compute) en
    unlock/lock/respec/canUnlock do TreeEngine.
- **Cero chamada a `plugin.install()` en 8.4.a**: decisión do
  director. Razón: install() require PluginAPI implementada
  (8.4.b). Plugins rexistrados son **datos inactivos** ata 8.4.b.
- **DIFERIDOS** en 8.4 completa: `registerCondition`,
  `registerLayout`, `registerStorageAdapter` (sub-fases futuras
  específicas).
- **Permission enforcement**: V1.0 declarativo (audit-only segundo
  MASTER §40). Enforcement strict DIFERIDO a marketplace V2.0.
- **Cero deps de npm engadidas**.
- **Cero modificación de packages/storage/, packages/react/** ou
  outros 14 paquetes scaffold.
- **Cero modificación de calquera test existente** (1600 core +
  60 common + 193 storage + 116 react = 1969 tests intactos).
- **Cero modificación de pezas existentes en packages/core/src/**
  salvo TreeEngine.ts (+imports +1 membro +4 APIs).
- **Cero modificación de `types/plugin.ts`** (Plugin types xa
  tipados; cero require).
- **Patrón consistente con SnapshotManager/LoadoutManager** de 8.2.
- **Lección 8.3 L1 aplicada con rigor**: T0.2 verifica
  empíricamente ausencia das 4 APIs novas con grep específico
  `^  (async )?<methodName>\(`.
```

Commit Conventional:
`feat(core): add PluginManager + 4 plugin APIs in TreeEngine (sub-phase 8.4.a)`

Push directo a `origin/main` (base `357b69b`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.4.a — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 357b69b)
✅ packages/core/src/plugins/ creado (PluginManager.ts NOVO)
✅ PluginManager class: register/unregister async + get/list sync
✅ TreeEngine 4 APIs novas:
   - registerPlugin(plugin) async
   - unregisterPlugin(id) async
   - getPlugin(id) sync
   - listPlugins() sync
✅ 2 ErrorCodes novos baixo prefixo novo YGG_PL*:
   - YGG_PL001 PLUGIN_ALREADY_REGISTERED
   - YGG_PL002 PLUGIN_NOT_FOUND
✅ Mensaxes localizadas gl/es/en para os 2 ErrorCodes
✅ CERO chamada a plugin.install() en 8.4.a (DIFERIDO a 8.4.b)
✅ CERO PluginAPI implementación (DIFERIDO a 8.4.b)
✅ CERO HookRunner (DIFERIDO a 8.4.b)
✅ CERO modificación de unlock/lock/respec (DIFERIDO a 8.4.c)
✅ T0.2 verificación empírica (lección 8.3 L1):
   - registerPlugin, unregisterPlugin, getPlugin, listPlugins
     non existen en TreeEngine actual (4 "NON EXISTE ✅")
   - packages/core/src/plugins/ non existe
   - YGG_PL prefixo libre (0 matches)
   - Plugin types xa exportados desde types/index.ts
✅ T6 verificación CRÍTICA: 1600 tests previos pasan inchanged
✅ CERO modificación de pezas existentes en packages/core/src/
   salvo TreeEngine.ts (+imports +1 membro +4 APIs)
✅ CERO modificación de tests existentes (1969 totais intactos)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ CERO modificación de types/plugin.ts (xa tipado)
✅ Tests: 1600 + 14 = ~1614 core tests
   - 8 PluginManager (CRUD + duplicate + non-found + locale +
     cero install() chamada)
   - 6 TreeEngine.plugins (4 APIs + ErrorCodes)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - PluginManager.ts: 100/100/100/100
   - TreeEngine.ts: baseline mantida
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias (filtrar "TODOS")
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.4.a PRIMEIRA das 3 de 8.4.
   - 41 sub-fases consecutivas sen rollback.
   - Plugins rexistrados son DATOS INACTIVOS ata 8.4.b implemente
     PluginAPI + chame install().
   - 4 sub-fases pendentes na Fase 8 (8.4.b, 8.4.c, 8.5, 8.6, 8.7,
     8.8 — total 6 sub-fases pendentes).
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 8 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.4.b (HookRunner + PluginAPI implementation).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.4.a. **PRIMEIRA das 3 sub-sub-fases de 8.4**.
Engade PluginManager standalone (in-memory Map + CRUD) + 4 APIs
en TreeEngine + 2 ErrorCodes baixo prefixo novo YGG_PL*. **Cero
chamada a `plugin.install()`** (DIFERIDO a 8.4.b). **Cero HookRunner
nin PluginAPI implementación** (DIFERIDO a 8.4.b). **Cero modificación
de tests existentes** (1600 core inchanged). 8 ficheiros tocados
(4 NOVOS + 4 MODIFICADOS). ~14 tests novos. Risco MEDIO: peza
nova ben acoutada en novo directorio + modificación cirúrxica de
TreeEngine + 2 ficheiros de common. Lección 8.3 L1 aplicada con
rigor en T0.2. Calquera dúbida → ESCALAR.*

*Establece base para 8.4.b (modificación de PluginManager.register
para chamar install() con PluginAPI real) e 8.4.c (integración de
hooks en TreeEngine.unlock/lock/respec/canUnlock). Cero rotura de
signatures previstas; modificacións incrementais.*
