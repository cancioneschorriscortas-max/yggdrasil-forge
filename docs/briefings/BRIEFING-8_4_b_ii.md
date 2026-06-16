# BRIEFING — SUB-FASE 8.4.b.ii de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-sub-sub-fase de 8.4** (PluginManager + HookRunner).
> Tras 8.4.a (PluginManager standalone) e 8.4.b.i (HookRunner
> standalone), 8.4.b.ii **conecta as dúas pezas via PluginAPI** +
> tipa **PluginEngineHandle real** + integra **HookRunner no
> TreeEngine constructor**.
>
> **Tras esta sub-fase, plugins son funcionais**: `plugin.install()`
> é chamado con engineHandle real + PluginAPI; plugins poden
> rexistrar hooks que se executarán en 8.4.c cando TreeEngine
> chame os runners desde unlock/lock/respec.
>
> **Pezas (7 grupos)**:
> 1. Modificar `types/plugin.ts`: `PluginEngineHandle` de `unknown`
>    a interface real con **10 getters readonly**.
> 2. NOVO `PluginAPI.ts` (clase implementando PluginAPI interface).
> 3. Modificar `PluginManager.ts` (constructor + register + unregister
>    para chamar install/uninstall + cleanup hooks).
> 4. Modificar `TreeEngine.ts` (engadir hookRunner + crear engineHandle
>    + pasar 3 deps a PluginManager).
> 5. **4 ErrorCodes novos** YGG_PL003-PL006.
> 6. **Modificar PluginManager.test.ts** substancialmente (helper
>    + 8 construcións + test #8) — excepción documentada.
> 7. NOVOS tests (~25-30).
>
> **Decisións confirmadas polo director**:
> - **Rollback en install failure**: se `plugin.install()` lanza,
>   PluginManager NON almacena o plugin no Map + cleanup hooks
>   parciais que xa rexistrou + devolve `err(PLUGIN_INSTALL_FAILED)`.
> - **Best effort en uninstall failure**: `plugin.uninstall()` chámase
>   se existe; se lanza, plugin xa borrouse do Map + hookRunner
>   cleanup. Devolve `err(PLUGIN_UNINSTALL_FAILED)` pero estado é
>   consistente.
> - **PluginEngineHandle**: subset readonly de 10 getters; **cero
>   mutations**, cero acceso a snapshots/audit/subscribe/subtrees.
> - **PluginAPI.registerCondition/Layout/StorageAdapter**: lanzan
>   `YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED` con mensaxe localizada.
> - **4 ErrorCodes novos** (3 confirmados + PL006 PLUGIN_HOOK_THREW
>   para envolver erros non-YggdrasilError de handlers).
> - **Modificar PluginManager.test.ts substancialmente**: PluginManager
>   é interno en construción incremental; tests adoptan nova
>   signature do constructor.
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente o estado
> actual antes de modificar.
>
> 8.4.c, 8.5-8.8 DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte. NOTA: "TODOS"
en castelán/galego = "everything" (falso positivo coñecido).

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 8.4.b.ii — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.4.b.ii — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando
aplique (e.g., `actor` opcional en HookContext mock).

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: PluginAPI + modificacións de PluginManager +
TreeEngine engineHandle chegan a **100% nas liñas novas**. Cero
regresión na baseline post-8.4.b.i.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE PARCIAL**: cero modificación
de calquera test existente **salvo as 9 modificacións documentadas
en PluginManager.test.ts** (8 construcións + test #8). Tódolos
outros 1627 tests (1636 - 9 modificados) deben pasar inchanged.

**0.14 — Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente
estado actual + ausencia de PluginAPI.ts antes de crear.

**0.15 — Importante sobre modificación de PluginManager.test.ts**:
**Excepción documentada**. PluginManager é interno; o constructor
cambia por design (construción incremental documentada en briefings
8.4.a → 8.4.b.ii). **Cero violación da regra dura "cero modificación
de tests"** (regra protexe API pública estable, NON tests de
internos en construción).

---

## 1. IDENTIFICACIÓN

Sub-fase **8.4.b.ii** de Yggdrasil Forge. Sub-sub-sub-fase
**conexión** de PluginManager (8.4.a) + HookRunner (8.4.b.i) via
PluginAPI + integration en TreeEngine.

**Pezas (7 grupos)**:

**Grupo A — Modificar types/plugin.ts**:
1. Cambiar `export type PluginEngineHandle = unknown` a interface
   real con 10 getters readonly.

**Grupo B — NOVO PluginAPI.ts**:
2. Crear `packages/core/src/plugins/PluginAPI.ts` (interno; clase
   implementando PluginAPI interface; 3 métodos funcionais + 3
   que lanzan PLUGIN_API_NOT_IMPLEMENTED).

**Grupo C — Modificar PluginManager.ts**:
3. Constructor recibe `(engineHandle, hookRunner, eventEmitter,
   locale?)`.
4. `register()`: tras almacenar plugin no Map, crea PluginAPI +
   await install(). Capture errors → rollback (delete do Map +
   hookRunner cleanup) + err(PLUGIN_INSTALL_FAILED).
5. `unregister()`: borra do Map + hookRunner cleanup SEMPRE
   (best effort) + chama uninstall() se existe. Capture errors
   → err(PLUGIN_UNINSTALL_FAILED) pero estado consistente.

**Grupo D — Modificar TreeEngine.ts**:
6. Engadir `private readonly hookRunner: HookRunner` membro.
7. Inicializar hookRunner en constructor con `onError` callback
   que emite `pluginError` event (envolvendo erros non-YggdrasilError
   con PLUGIN_HOOK_THREW).
8. Construír `engineHandle: PluginEngineHandle` no constructor
   (10 getters bound a `this`).
9. Pasar `(engineHandle, this.hookRunner, this.events, this.locale)`
   a `new PluginManager(...)`.

**Grupo E — 4 ErrorCodes novos**:
10. `packages/common/src/errors/codes.ts`: engadir 4 entradas baixo
    o bloque `// Plugins`:
    ```ts
    PLUGIN_API_NOT_IMPLEMENTED = 'YGG_PL003',
    PLUGIN_INSTALL_FAILED = 'YGG_PL004',
    PLUGIN_UNINSTALL_FAILED = 'YGG_PL005',
    PLUGIN_HOOK_THREW = 'YGG_PL006',
    ```
11. `packages/common/src/errors/messages.ts`: 4 entradas gl/es/en.

**Grupo F — Modificar PluginManager.test.ts** (excepción documentada):
12. Engadir helper `makePluginManager(locale?)` que crea PluginManager
    con mocks dos 3 deps (engineHandle stub + HookRunner real +
    EventEmitter real).
13. Reemplazar 8 `new PluginManager(...)` por `makePluginManager(...)`.
14. Test #8: cambiar de `expect(plugin.install).not.toHaveBeenCalled()`
    a `expect(plugin.install).toHaveBeenCalledTimes(1)` +
    `expect(plugin.install).toHaveBeenCalledWith(engineHandle, anyApi)`.

**Grupo G — NOVOS tests**:
15. `packages/core/__tests__/plugins/PluginAPI.test.ts` (~12 tests).
16. `packages/core/__tests__/plugins/TreeEngine.install.test.ts`
    (~8 tests).

**Cero modificación de**:
- `packages/storage/`, `packages/react/`, outros paquetes scaffold.
- **Calquera outro ficheiro** en `packages/core/src/` fora dos
  prescritos.
- **Calquera outro test existente** (1627 tests inchanged; só os
  9 modificados de PluginManager.test.ts cambian).
- `packages/core/src/plugins/HookRunner.ts` (intacto desde 8.4.b.i).
- `packages/core/src/builds/` (ficheiros de 8.1-8.3 intactos).
- `package.json`, configs, lockfile.
- `docs/architecture/MASTER.md`.

**CERO deps de npm engadidas.**

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `0f9ab45`, verificada
empíricamente)**.

### PluginEngineHandle actual (verificado)

```ts
// packages/core/src/types/plugin.ts
export type PluginEngineHandle = unknown
```

**Decisión do director**: cambiar a interface real con 10 getters
readonly.

### PluginAPI interface (verificado)

```ts
export interface PluginAPI {
  registerHook<K extends keyof Hooks>(name: K, handler: Hooks[K]): void
  registerCondition(name: string, evaluator: ConditionEvaluator): void
  registerLayout(layout: LayoutAlgorithmPlaceholder): void
  registerStorageAdapter(adapter: StorageAdapterPlaceholder): void
  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void
  log(level: PluginLogLevel, message: string): void
}
```

**Tipos placeholder confirmados**:
- `ConditionEvaluator = (params: Readonly<Record<string, unknown>>) => boolean`.
- `StorageAdapterPlaceholder = unknown`.
- `LayoutAlgorithmPlaceholder = unknown`.

### EventEmitter API (verificado)

```ts
class EventEmitter {
  emit<K extends EventName>(event: K, ...args: Parameters<EventMap[K]>): void
}
```

**Decisión do director**: PluginAPI.emit é **proxy directo** a
EventEmitter.emit con mesma signature.

### Plugin.install signature (verificada)

```ts
interface Plugin {
  install(engine: PluginEngineHandle, api: PluginAPI): void | Promise<void>
  uninstall?(engine: PluginEngineHandle): void | Promise<void>
}
```

**Decisión do director**: `register()` chama `await plugin.install(...)`
porque pode ser async; `unregister()` chama `await plugin.uninstall(...)`
se existe.

### PluginManager actual signature (verificado)

```ts
class PluginManager {
  constructor(locale?: Locale) { ... }
  async register(plugin: Plugin): Promise<Result<void>> { ... }
  async unregister(id: string): Promise<Result<void>> { ... }
  get(id: string): Plugin | null { ... }
  list(): readonly Plugin[] { ... }
}
```

**Cambio prescrito**: constructor recibe 4 args (3 deps + locale
opcional).

### Tests existentes de PluginManager.test.ts

**8 construcións** de PluginManager directamente:
- Liñas 19, 24, 35, 43, 54, ... (verificado polo director con
  `grep -n "new PluginManager"`).
- Tódalas con signature antiga `new PluginManager()` ou
  `new PluginManager('es')`.

**1 test que verifica `not.toHaveBeenCalled`** (test #8 actual,
liña ~87):
- `expect(plugin.install).not.toHaveBeenCalled()` → require modificación.

**Outros 7 tests de PluginManager.test.ts**: pasan con `install: vi.fn()`
mock (vi.fn() ignora argumentos; devolve undefined; await undefined
funciona).

**6 tests de TreeEngine.plugins.test.ts**: usan `engine.registerPlugin(plugin)`
con `install: vi.fn()`; pasan inchanged.

### Decisión sobre TreeEngine.hookRunner inicialización

```ts
// No constructor de TreeEngine, despois de this.events = new EventEmitter():
this.hookRunner = new HookRunner({
  onError: (pluginId, error) => {
    // Envolver erros non-YggdrasilError:
    const yggError = error instanceof YggdrasilError
      ? error
      : new YggdrasilError(
          ErrorCode.PLUGIN_HOOK_THREW,
          getErrorMessage(ErrorCode.PLUGIN_HOOK_THREW, this.locale, {
            pluginId,
            message: error instanceof Error ? error.message : String(error),
          }),
        )
    this.events.emit('pluginError', pluginId, yggError)
  },
})
```

### Decisión sobre engineHandle construction

```ts
// No constructor de TreeEngine, despois de this.hookRunner:
const engineHandle: PluginEngineHandle = {
  getNodeState: (id) => this.getNodeState(id),
  getAllNodeStates: () => this.getAllNodeStates(),
  getBudget: () => this.getBudget(),
  getProgress: (id) => this.getProgress(id),
  getTreeDef: () => this.getTreeDef(),
  getLocale: () => this.getLocale(),
  getStat: (id) => this.getStat(id),
  getAllStats: () => this.getAllStats(),
  isReadOnly: () => this.isReadOnly(),
  canUnlock: (id) => this.canUnlock(id),
}
```

**Verificar empíricamente en T0.2** que tódolos 10 métodos existen
en TreeEngine.

### Estado scaffold tras 8.4.b.i

```
packages/core/src/plugins/
├── PluginManager.ts             (existente 8.4.a; modificarase)
├── HookRunner.ts                (existente 8.4.b.i; INTACTO)
└── PluginAPI.ts                 (NOVO 8.4.b.ii)

packages/core/__tests__/plugins/
├── PluginManager.test.ts        (existente; modificarase substancialmente)
├── TreeEngine.plugins.test.ts   (existente; INTACTO)
├── HookRunner.test.ts           (existente 8.4.b.i; INTACTO)
├── PluginAPI.test.ts            (NOVO 8.4.b.ii)
└── TreeEngine.install.test.ts   (NOVO 8.4.b.ii)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `0f9ab45` (sub-fase 8.4.b.i — HookRunner).
- 1636 core + 60 common + 193 storage + 116 react = 2005 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 45 ErrorCodes existentes (incluído PL001-PL002).
- DT abertas: 11.
- **Cadea 42 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

**Conectar PluginManager (8.4.a) + HookRunner (8.4.b.i) via PluginAPI**:
tipar `PluginEngineHandle` real con 10 getters readonly en
`types/plugin.ts`; crear `PluginAPI.ts` clase interna (3 métodos
funcionais: registerHook proxy a HookRunner, emit proxy a
EventEmitter, log con prefixo `[plugin:id]`; 3 métodos lanzan
PLUGIN_API_NOT_IMPLEMENTED); modificar PluginManager constructor +
register + unregister (con install/uninstall chamadas + rollback
en install failure + best effort en uninstall); modificar TreeEngine
constructor (engadir hookRunner + crear engineHandle + pasar 3 deps
a PluginManager); engadir 4 ErrorCodes novos (PL003-PL006); modificar
PluginManager.test.ts substancialmente (helper + 8 construcións +
test #8) como excepción documentada; engadir ~20-30 tests novos.
**Cero modificación** de HookRunner.ts ou TreeEngine.plugins.test.ts.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (4)**:
- `packages/core/src/plugins/PluginAPI.ts` (~120 liñas).
- `packages/core/__tests__/plugins/PluginAPI.test.ts` (~180 liñas;
  ~12 tests).
- `packages/core/__tests__/plugins/TreeEngine.install.test.ts`
  (~150 liñas; ~8 tests).
- `.changeset/plugin-api-8-4-b-ii.md` (NOVO).

**MODIFICADOS (8)**:
- `packages/common/src/errors/codes.ts` (engadir 4 entradas).
- `packages/common/src/errors/messages.ts` (engadir 4 entradas
  gl/es/en).
- `packages/core/src/types/plugin.ts` (cambiar PluginEngineHandle
  de `unknown` a interface).
- `packages/core/src/plugins/PluginManager.ts` (constructor + register
  + unregister).
- `packages/core/__tests__/plugins/PluginManager.test.ts` (helper
  + 8 construcións + test #8).
- `packages/core/src/engine/TreeEngine.ts` (+hookRunner +
  engineHandle + PluginManager construction).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 12 ficheiros tocados** (4 NOVOS + 8 MODIFICADOS).

**Cero modificación de**:
- `packages/core/src/plugins/HookRunner.ts` (intacto desde 8.4.b.i).
- `packages/core/__tests__/plugins/HookRunner.test.ts` (intacto).
- `packages/core/__tests__/plugins/TreeEngine.plugins.test.ts`
  (intacto; usa `engine.registerPlugin(plugin)` con vi.fn() install
  → seguirán pasando porque install agora chámase pero vi.fn() ignora
  args).
- Outros 1620+ tests core + 60 common + 193 storage + 116 react.
- `packages/storage/`, `packages/react/`, outros 14 paquetes scaffold.
- Configs.
- MASTER.md.

### 5.2 — PluginEngineHandle interface real (FIXADO)

**Modificar** `packages/core/src/types/plugin.ts`. Cambiar:

```ts
// ANTES:
export type PluginEngineHandle = unknown
```

A:

```ts
// DESPOIS:
/**
 * Subset readonly de TreeEngine exposto aos plugins durante
 * `Plugin.install()`. Cero mutations, cero acceso a snapshots,
 * audit, subscribe, subtrees ou outros internals sensibles.
 *
 * **Sub-fase 8.4.b.ii**: 10 getters readonly. Os plugins son
 * **observers/interceptors** via hooks; cero acceso directo a
 * mutations (unlock/lock/respec quedan fora; require ir polos
 * hooks).
 */
export interface PluginEngineHandle {
  readonly getNodeState: (nodeId: string) => NodeInstance | null
  readonly getAllNodeStates: () => ReadonlyMap<string, NodeInstance>
  readonly getBudget: () => Readonly<Budget>
  readonly getProgress: (nodeId: string) => number
  readonly getTreeDef: () => Readonly<TreeDef>
  readonly getLocale: () => Locale
  readonly getStat: (statId: string) => number
  readonly getAllStats: () => Readonly<Record<string, number>>
  readonly isReadOnly: () => boolean
  readonly canUnlock: (nodeId: string) => Result<UnlockCheck>
}
```

**Imports necesarios** na cabeceira de `plugin.ts` (verificar
empíricamente cales xa están):
- `NodeInstance, Budget, TreeDef, UnlockCheck` desde tipos
  locais ou paths relativos.
- `Locale, Result` desde `@yggdrasil-forge/common`.

**T0.2 verifica**: tódolos tipos están dispoñibles. Se algún
require import novo, engadilo coherentemente.

### 5.3 — 4 ErrorCodes novos (FIXADO)

**Engadir** en `packages/common/src/errors/codes.ts` despois das
entradas existentes do bloque `// Plugins` (PL001-PL002):

```ts
  PLUGIN_API_NOT_IMPLEMENTED = 'YGG_PL003',
  PLUGIN_INSTALL_FAILED = 'YGG_PL004',
  PLUGIN_UNINSTALL_FAILED = 'YGG_PL005',
  PLUGIN_HOOK_THREW = 'YGG_PL006',
```

### 5.4 — 4 mensaxes localizadas (FIXADAS)

**Engadir** en `packages/common/src/errors/messages.ts` despois
das entradas PL001-PL002:

```ts
  [ErrorCode.PLUGIN_API_NOT_IMPLEMENTED]: {
    gl: 'Método PluginAPI non implementado: "{method}"',
    es: 'Método PluginAPI no implementado: "{method}"',
    en: 'PluginAPI method not implemented: "{method}"',
  },
  [ErrorCode.PLUGIN_INSTALL_FAILED]: {
    gl: 'Fallou a instalación do plugin "{id}": {error}',
    es: 'Falló la instalación del plugin "{id}": {error}',
    en: 'Plugin install failed for "{id}": {error}',
  },
  [ErrorCode.PLUGIN_UNINSTALL_FAILED]: {
    gl: 'Fallou a desinstalación do plugin "{id}": {error}',
    es: 'Falló la desinstalación del plugin "{id}": {error}',
    en: 'Plugin uninstall failed for "{id}": {error}',
  },
  [ErrorCode.PLUGIN_HOOK_THREW]: {
    gl: 'Hook do plugin "{pluginId}" lanzou: {message}',
    es: 'Hook del plugin "{pluginId}" lanzó: {message}',
    en: 'Plugin "{pluginId}" hook threw: {message}',
  },
```

### 5.5 — PluginAPI.ts (FIXADO)

```ts
// packages/core/src/plugins/PluginAPI.ts
// ── INICIO: PluginAPI ──
// Implementación da PluginAPI interface (plugin.ts).
//
// **Sub-fase 8.4.b.ii**:
// - 3 métodos funcionais: registerHook (proxy a HookRunner),
//   emit (proxy a EventEmitter), log (console con prefixo).
// - 3 métodos lanzan YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED:
//   registerCondition, registerLayout, registerStorageAdapter.
//   Diferido a sub-fases futuras (require modificar UnlockResolver
//   / layout registry / storage scaffold respectivamente).
//
// Cada instancia é creada por PluginManager.register() para un
// plugin específico (pluginId fixo).

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Locale } from '@yggdrasil-forge/common'
import type {
  ConditionEvaluator,
  EventMap,
  Hooks,
  LayoutAlgorithmPlaceholder,
  PluginAPI as PluginAPIInterface,
  PluginLogLevel,
  StorageAdapterPlaceholder,
} from '../types/index.js'
import type { EventEmitter } from '../engine/EventEmitter.js'
import type { HookRunner } from './HookRunner.js'

export class PluginAPI implements PluginAPIInterface {
  constructor(
    private readonly pluginId: string,
    private readonly hookRunner: HookRunner,
    private readonly eventEmitter: EventEmitter,
    private readonly locale: Locale,
  ) {}

  registerHook<K extends keyof Hooks>(name: K, handler: Hooks[K]): void {
    this.hookRunner.register(name, this.pluginId, handler)
  }

  registerCondition(_name: string, _evaluator: ConditionEvaluator): void {
    throw new YggdrasilError(
      ErrorCode.PLUGIN_API_NOT_IMPLEMENTED,
      getErrorMessage(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED, this.locale, {
        method: 'registerCondition',
      }),
    )
  }

  registerLayout(_layout: LayoutAlgorithmPlaceholder): void {
    throw new YggdrasilError(
      ErrorCode.PLUGIN_API_NOT_IMPLEMENTED,
      getErrorMessage(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED, this.locale, {
        method: 'registerLayout',
      }),
    )
  }

  registerStorageAdapter(_adapter: StorageAdapterPlaceholder): void {
    throw new YggdrasilError(
      ErrorCode.PLUGIN_API_NOT_IMPLEMENTED,
      getErrorMessage(ErrorCode.PLUGIN_API_NOT_IMPLEMENTED, this.locale, {
        method: 'registerStorageAdapter',
      }),
    )
  }

  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    this.eventEmitter.emit(event, ...args)
  }

  log(level: PluginLogLevel, message: string): void {
    const prefixed = `[plugin:${this.pluginId}] ${message}`
    switch (level) {
      case 'debug':
        console.debug(prefixed)
        return
      case 'info':
        console.info(prefixed)
        return
      case 'warn':
        console.warn(prefixed)
        return
      case 'error':
        console.error(prefixed)
        return
    }
  }
}
// ── FIN: PluginAPI ──
```

**Decisións**:
- **Cero exposición pública** (interna; cero export desde
  `core/src/index.ts`).
- **Cada instancia ten pluginId fixo**: creada por PluginManager.register
  con o id do plugin que se está rexistrando.
- **registerHook delega** ao hookRunner.register pasando pluginId.
- **emit delega** ao eventEmitter (proxy directo).
- **log usa console.* con prefixo** `[plugin:id]`.
- **registerCondition/Layout/StorageAdapter lanzan throw** (cero
  return err; mais limpa para que plugins detecten inmediatamente).

### 5.6 — PluginManager.ts modificado (FIXADO)

**Cambio 1** — Imports novos:

```ts
import { EventEmitter } from '../engine/EventEmitter.js'
import { HookRunner } from './HookRunner.js'
import { PluginAPI } from './PluginAPI.js'
import type { PluginEngineHandle } from '../types/index.js'
```

**Cambio 2** — Constructor signature:

```ts
// ANTES:
constructor(locale?: Locale) {
  this.locale = locale ?? DEFAULT_LOCALE
}

// DESPOIS:
constructor(
  engineHandle: PluginEngineHandle,
  hookRunner: HookRunner,
  eventEmitter: EventEmitter,
  locale?: Locale,
) {
  this.engineHandle = engineHandle
  this.hookRunner = hookRunner
  this.eventEmitter = eventEmitter
  this.locale = locale ?? DEFAULT_LOCALE
}
```

**Membros novos privados**:

```ts
private readonly engineHandle: PluginEngineHandle
private readonly hookRunner: HookRunner
private readonly eventEmitter: EventEmitter
```

**Cambio 3** — `register()` completo:

```ts
/**
 * Rexistra un plugin no manager.
 *
 * **Sub-fase 8.4.b.ii**: chama `plugin.install(engineHandle, api)`
 * con PluginAPI real. Se install lanza, faise rollback (cero
 * almacenamento + cleanup hooks parciais).
 *
 * Errores posibles:
 * - `PLUGIN_ALREADY_REGISTERED` (`YGG_PL001`).
 * - `PLUGIN_INSTALL_FAILED` (`YGG_PL004`): install() lanzou.
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

  // Almacenar primeiro (necesario para que install() poda chamar
  // PluginAPI.registerHook que internamente usa this.pluginId):
  this.plugins.set(plugin.id, plugin)

  // Crear PluginAPI fresca para este plugin:
  const api = new PluginAPI(plugin.id, this.hookRunner, this.eventEmitter, this.locale)

  // Chamar install (sync ou async); capture errors:
  try {
    await plugin.install(this.engineHandle, api)
  } catch (e) {
    // Rollback: borrar do Map + cleanup hooks parciais que xa
    // rexistrou o plugin (se algún) antes de fallar:
    this.plugins.delete(plugin.id)
    this.hookRunner.unregisterAllForPlugin(plugin.id)
    return err(
      new YggdrasilError(
        ErrorCode.PLUGIN_INSTALL_FAILED,
        getErrorMessage(ErrorCode.PLUGIN_INSTALL_FAILED, this.locale, {
          id: plugin.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      ),
    )
  }

  return ok(undefined)
}
```

**Cambio 4** — `unregister()` completo:

```ts
/**
 * Desrexistra un plugin polo id.
 *
 * **Sub-fase 8.4.b.ii**: chama `plugin.uninstall(engineHandle)`
 * se está definido + `hookRunner.unregisterAllForPlugin(id)`
 * SEMPRE. Se uninstall lanza, plugin xa borrouse do Map (best
 * effort; estado consistente).
 *
 * Errores posibles:
 * - `PLUGIN_NOT_FOUND` (`YGG_PL002`).
 * - `PLUGIN_UNINSTALL_FAILED` (`YGG_PL005`): uninstall lanzou.
 */
async unregister(id: string): Promise<Result<void>> {
  const plugin = this.plugins.get(id)
  if (plugin === undefined) {
    return err(
      new YggdrasilError(
        ErrorCode.PLUGIN_NOT_FOUND,
        getErrorMessage(ErrorCode.PLUGIN_NOT_FOUND, this.locale, { id }),
      ),
    )
  }

  // Cleanup hooks + borrado do Map SEMPRE (best effort):
  this.hookRunner.unregisterAllForPlugin(id)
  this.plugins.delete(id)

  // Chamar uninstall se existe; capture errors:
  if (plugin.uninstall !== undefined) {
    try {
      await plugin.uninstall(this.engineHandle)
    } catch (e) {
      return err(
        new YggdrasilError(
          ErrorCode.PLUGIN_UNINSTALL_FAILED,
          getErrorMessage(ErrorCode.PLUGIN_UNINSTALL_FAILED, this.locale, {
            id,
            error: e instanceof Error ? e.message : String(e),
          }),
        ),
      )
    }
  }

  return ok(undefined)
}
```

**Cambios 5-6** — `get` e `list` **INCHANGED**.

### 5.7 — TreeEngine.ts modificacións (FIXADO)

**Cambio 1** — Imports novos:

```ts
import { HookRunner } from '../plugins/HookRunner.js'
import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
// (ErrorCode/YggdrasilError/getErrorMessage probablemente xa importados;
// verificar empíricamente en T0.2)
```

**Cambio 2** — Engadir `PluginEngineHandle` ao import de tipos:

```ts
import type {
  // ... existentes
  PluginEngineHandle,    // ← engadir
} from '../types/index.js'
```

**Cambio 3** — Engadir membro privado:

```ts
// ── INICIO: 8.4.b.ii — hookRunner ──
private readonly hookRunner: HookRunner
// ── FIN: 8.4.b.ii ──
```

**Cambio 4** — Modificar inicialización do `pluginManager` no
constructor. **Antes**:

```ts
// ── INICIO: 8.4.a ──
this.pluginManager = new PluginManager(this.locale)
// ── FIN: 8.4.a ──
```

**Despois** (substituír o bloque enteiro):

```ts
// ── INICIO: 8.4.b.ii — hookRunner + engineHandle ──
this.hookRunner = new HookRunner({
  onError: (pluginId, error) => {
    const yggError =
      error instanceof YggdrasilError
        ? error
        : new YggdrasilError(
            ErrorCode.PLUGIN_HOOK_THREW,
            getErrorMessage(ErrorCode.PLUGIN_HOOK_THREW, this.locale, {
              pluginId,
              message: error instanceof Error ? error.message : String(error),
            }),
          )
    this.events.emit('pluginError', pluginId, yggError)
  },
})

const engineHandle: PluginEngineHandle = {
  getNodeState: (id) => this.getNodeState(id),
  getAllNodeStates: () => this.getAllNodeStates(),
  getBudget: () => this.getBudget(),
  getProgress: (id) => this.getProgress(id),
  getTreeDef: () => this.getTreeDef(),
  getLocale: () => this.getLocale(),
  getStat: (id) => this.getStat(id),
  getAllStats: () => this.getAllStats(),
  isReadOnly: () => this.isReadOnly(),
  canUnlock: (id) => this.canUnlock(id),
}

this.pluginManager = new PluginManager(
  engineHandle,
  this.hookRunner,
  this.events,
  this.locale,
)
// ── FIN: 8.4.b.ii ──
```

**Decisión sobre orde**: o bloque vai **despois de tódalas
inicializacións dos demais managers** (loadoutManager, snapshotManager,
etc.) e despois de `this.events = new EventEmitter()`. **Verificar
empíricamente** a posición exacta en T0.2 (probable inmediatamente
substituíndo o bloque `8.4.a` actual).

**Cero outras modificacións** do TreeEngine. As 4 APIs públicas
(registerPlugin/unregisterPlugin/getPlugin/listPlugins) son
inchanged (delegan ao pluginManager que xa funciona).

### 5.8 — PluginManager.test.ts modificacións (FIXADO — excepción
documentada)

**Cambio 1** — Imports novos no top:

```ts
import { HookRunner } from '../../src/plugins/HookRunner.js'
import { EventEmitter } from '../../src/engine/EventEmitter.js'
import type { PluginEngineHandle } from '../../src/types/index.js'
import { ok } from '../../src/types/index.js'
import type { Budget, NodeInstance, TreeDef, UnlockCheck } from '../../src/types/index.js'
import type { Result } from '@yggdrasil-forge/common'
```

(Verificar empíricamente en T0.2 que tódolos imports son válidos)

**Cambio 2** — Engadir helper despois dos imports + antes do
`describe('PluginManager')`:

```ts
const makeEngineHandle = (): PluginEngineHandle => ({
  getNodeState: () => null,
  getAllNodeStates: () => new Map<string, NodeInstance>(),
  getBudget: () => ({ resources: {} } as Budget),
  getProgress: () => 0,
  getTreeDef: () => ({
    id: 't',
    name: 'test',
    nodes: [],
    edges: [],
  } as unknown as TreeDef),
  getLocale: () => 'gl',
  getStat: () => 0,
  getAllStats: () => ({}),
  isReadOnly: () => false,
  canUnlock: () => ok({ unlockable: false, reasons: [] } as UnlockCheck) as Result<UnlockCheck>,
})

const makePluginManager = (locale?: Locale): PluginManager => {
  const engineHandle = makeEngineHandle()
  const hookRunner = new HookRunner()
  const events = new EventEmitter()
  return new PluginManager(engineHandle, hookRunner, events, locale)
}
```

**Cambio 3** — Reemplazar **TODAS** as 8 ocorrencias de
`new PluginManager(...)` por `makePluginManager(...)`:

```ts
// ANTES:
const mgr = new PluginManager()
const mgr = new PluginManager('es')

// DESPOIS:
const mgr = makePluginManager()
const mgr = makePluginManager('es')
```

**Cambio 4** — Test #8 modificación. Atopar o test:

```ts
it('register() NON chama plugin.install() en 8.4.a', async () => {
  const mgr = new PluginManager()
  const plugin = makePlugin('p1')
  await mgr.register(plugin)
  expect(plugin.install).not.toHaveBeenCalled()
})
```

**Reemplazar por**:

```ts
it('register() chama plugin.install() con engineHandle + api (8.4.b.ii)', async () => {
  const mgr = makePluginManager()
  const plugin = makePlugin('p1')
  await mgr.register(plugin)
  expect(plugin.install).toHaveBeenCalledTimes(1)
  expect(plugin.install).toHaveBeenCalledWith(
    expect.any(Object), // engineHandle (obxecto con 10 getters)
    expect.any(Object), // PluginAPI instance
  )
})
```

**Cero outras modificacións** dos 7 tests restantes (pasan porque
`install: vi.fn()` ignora args + devolve undefined).

### 5.9 — Tests novos prescritos

**`__tests__/plugins/PluginAPI.test.ts`** (~12 tests):

1. Constructor con pluginId 'p1', hookRunner, eventEmitter, 'gl'.
2. `registerHook('beforeUnlock', handler)` delega a hookRunner.register
   con pluginId='p1'.
3. `registerCondition('foo', evaluator)` lanza
   YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED.
4. `registerLayout({})` lanza YGG_PL003 con method='registerLayout'.
5. `registerStorageAdapter({})` lanza YGG_PL003 con
   method='registerStorageAdapter'.
6. `emit('unlock', nodeId, instance)` proxy a eventEmitter.emit
   con mesmos args.
7. `emit('pluginError', pluginId, err)` funciona.
8. `log('debug', 'msg')` chama console.debug con
   prefixo `[plugin:p1] msg`.
9. `log('info', 'msg')` chama console.info con prefixo.
10. `log('warn', 'msg')` chama console.warn con prefixo.
11. `log('error', 'msg')` chama console.error con prefixo.
12. Mensaxes localizadas: instancia con locale='es' lanza
    PLUGIN_API_NOT_IMPLEMENTED en español.

**`__tests__/plugins/TreeEngine.install.test.ts`** (~8 tests):

13. `engine.registerPlugin(plugin)` chama install() con engineHandle
    real + PluginAPI.
14. install async (Promise<void>) é awaited correctamente.
15. install sync (void) funciona.
16. install que lanza → registerPlugin devolve
    err(PLUGIN_INSTALL_FAILED) + plugin NON está en listPlugins().
17. install que rexistra hooks parciais antes de fallar → hooks
    son limpados (verificar via hookRunner getter test ou indirecto).
18. unregisterPlugin(id) chama uninstall(engineHandle) se está
    definido.
19. unregister sin uninstall (plugin.uninstall === undefined)
    funciona; plugin removido + cero erro.
20. uninstall que lanza → unregister devolve
    err(PLUGIN_UNINSTALL_FAILED) pero plugin xa removido do Map +
    hooks limpos.

**PluginManager.test.ts** — engadir tests adicionais opcionais (cero
require novos):
- O test #8 modificado xa cubre o caso "install é chamado".

**Total tests novos: ~20**. Post-8.4.b.ii esperado: 1636 → **~1656
core tests**.

### 5.10 — Cobertura prescrita

- **PluginAPI.ts**: **100/100/100/100**.
- **PluginManager.ts**: cobertura mantida ou superada (liñas novas
  de install/uninstall cubertas).
- **TreeEngine.ts**: baseline mantida; cobertura de hookRunner
  inicialización + engineHandle construction.
- **packages/common**: cobertura mantida (4 mensaxes novas
  exercedas).
- **Cero regresión** noutras pezas.

### 5.11 — Cero deps novas

Verificable empíricamente.

### 5.12 — Test counts esperados post-8.4.b.ii

- **core**: 1636 + ~20 = **~1656 tests**.
- **common, storage, react**: intactos.

### 5.13 — Coordinación con 8.4.c

**8.4.c modificará**:
- TreeEngine.unlock: `runBeforeUnlock(nodeId, ctx)` → se false,
  cancela; `runAfterUnlock(nodeId, ctx)` ao final;
  `runComputeUnlockability` en canUnlock.
- TreeEngine.lock: análogo a unlock.
- TreeEngine.respec: análogo (con nodeIds array).
- canUnlock: `runComputeUnlockability(nodeId, defaultResult)` antes
  de devolver.
- Probable: `runComputeCost` en algún lugar do cost calculation.

**Cero rotura de signatures previstas** en 8.4.b.ii API pública.

### 5.14 — Lección 8.3 L1 aplicada

T0.2 verifica:
```bash
# PluginAPI non existe:
ls packages/core/src/plugins/PluginAPI.ts 2>/dev/null && echo "ESCALAR" || echo "Non existe ✅"

# PluginManager constructor signature actual:
grep -A 3 "constructor(locale" packages/core/src/plugins/PluginManager.ts | head -5
# Verificar: ten signature (locale?: Locale)

# TreeEngine xa ten os 10 getters:
for getter in getNodeState getAllNodeStates getBudget getProgress getTreeDef getLocale getStat getAllStats isReadOnly canUnlock; do
  echo -n "$getter: "
  grep -cE "^  (async )?${getter}\(" packages/core/src/engine/TreeEngine.ts
done
# Esperado: tódolos ≥ 1
```

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| PluginEngineHandle interface | TS interface | types/plugin.ts | +35 |
| 4 ErrorCodes | enum entries | codes.ts | +9 |
| 4 mensaxes gl/es/en | object entries | messages.ts | +24 |
| PluginAPI class | clase + 6 métodos | PluginAPI.ts | ~120 |
| PluginManager modificacións | constructor + register + unregister | PluginManager.ts | ~+80 |
| TreeEngine modificacións | hookRunner + engineHandle + PM init | TreeEngine.ts | +50 |
| Test #8 + helper + 8 substituicións | modificacións | PluginManager.test.ts | ~+40/-15 |
| PluginAPI.test.ts | describe blocks | PluginAPI.test.ts | ~180 |
| TreeEngine.install.test.ts | describe blocks | TreeEngine.install.test.ts | ~150 |

**Total estimado**: ~300 liñas de código + ~370 liñas de tests +
~40 liñas de modificación de tests existentes.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (4)**:
- `packages/core/src/plugins/PluginAPI.ts`
- `packages/core/__tests__/plugins/PluginAPI.test.ts`
- `packages/core/__tests__/plugins/TreeEngine.install.test.ts`
- `.changeset/plugin-api-8-4-b-ii.md`

**MODIFICADOS (8)**:
- `packages/common/src/errors/codes.ts`
- `packages/common/src/errors/messages.ts`
- `packages/core/src/types/plugin.ts`
- `packages/core/src/plugins/PluginManager.ts`
- `packages/core/__tests__/plugins/PluginManager.test.ts` (excepción
  documentada)
- `packages/core/src/engine/TreeEngine.ts`
- `CHANGELOG.md`

**Total: 12 ficheiros tocados** (4 NOVOS + 8 MODIFICADOS).

**NON deben aparecer cambios en**:
- `packages/core/src/plugins/HookRunner.ts` (intacto desde 8.4.b.i).
- `packages/core/__tests__/plugins/HookRunner.test.ts`.
- `packages/core/__tests__/plugins/TreeEngine.plugins.test.ts`
  (tests usan vi.fn() install → pasan inchanged).
- Outros 1620+ tests core + 60 common + 193 storage + 116 react.
- `packages/storage/`, `packages/react/`, outros paquetes.
- Configs.
- MASTER.md.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`. Casts `as` permitidos só con xustificación
clara (en mocks de tests; cero en código de produción).

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en clases novas (PluginAPI) + métodos modificados
(register, unregister).

**Marcadores**: `// ── INICIO: <nome> ──` / `// ── FIN: <nome> ──`.

**Patrón Result**: `register` e `unregister` devolven `Result<void>`.

**Cero throw** en `register`/`unregister` (erros encerrados en Result);
**throw permitido** en PluginAPI.registerCondition/Layout/StorageAdapter
(decisión do director: claridade > silently breaking).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/src/plugins/HookRunner.ts` (intacto).
- ❌ Modificar `packages/core/__tests__/plugins/HookRunner.test.ts`.
- ❌ Modificar `packages/core/__tests__/plugins/TreeEngine.plugins.test.ts`
  (verifica usar `engine.registerPlugin` con vi.fn() install →
  pasarán intactos porque vi.fn() ignora args).
- ❌ Modificar **outros 1620+ tests** existentes.
- ❌ Modificar `packages/core/src/builds/` (ficheiros 8.1-8.3
  intactos).
- ❌ Modificar `packages/storage/`, `packages/react/`, outros
  paquetes.
- ❌ Modificar `unlock`, `lock`, `respec`, `canUnlock` de TreeEngine
  (DIFERIDO a 8.4.c).
- ❌ Modificar `package.json`, configs, lockfile.
- ❌ Modificar MASTER.md.
- ❌ Implementar `registerCondition`/`registerLayout`/`registerStorageAdapter`
  funcionalmente (DIFERIDOS a sub-fases futuras; lanzan
  PLUGIN_API_NOT_IMPLEMENTED).
- ❌ Engadir deps de npm.
- ❌ Exportar PluginAPI publicamente.
- ❌ Engadir `unlock`/`lock`/`respec` ao PluginEngineHandle
  (decisión do director: plugins son observers/interceptors via
  hooks).
- ❌ Engadir acceso a snapshots/audit/subscribe/subtrees ao
  engineHandle.
- ❌ Usar `!` non-null assertions.
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T10)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `0f9ab45` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# PluginAPI non existe:
ls packages/core/src/plugins/PluginAPI.ts 2>/dev/null && echo "ESCALAR" || echo "✅"

# PluginManager constructor actual:
grep -A 1 "constructor(locale" packages/core/src/plugins/PluginManager.ts | head -3

# TreeEngine ten os 10 getters do engineHandle:
for getter in getNodeState getAllNodeStates getBudget getProgress getTreeDef getLocale getStat getAllStats isReadOnly canUnlock; do
  count=$(grep -cE "^  (async )?${getter}\(" packages/core/src/engine/TreeEngine.ts)
  echo "$getter: $count"
done
# Esperado: tódolos ≥ 1

# 8 construcións de PluginManager nos tests:
grep -c "new PluginManager" packages/core/__tests__/plugins/PluginManager.test.ts
# Esperado: 8

# 1 test con not.toHaveBeenCalled:
grep -c "install.*not\.toHaveBeenCalled" packages/core/__tests__/plugins/PluginManager.test.ts
# Esperado: 1

# Imports xa dispoñibles en plugin.ts (NodeInstance, Budget, TreeDef, UnlockCheck, Locale):
grep -E "NodeInstance|Budget|TreeDef|UnlockCheck|Locale" packages/core/src/types/plugin.ts | head -5
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1636 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Engadir 4 ErrorCodes + 4 mensaxes a common

Aplicar §5.3 e §5.4 literal. Verificar:
```bash
pnpm --filter @yggdrasil-forge/common build
pnpm --filter @yggdrasil-forge/common test --force      # 60 tests intactos
```

### T2 — Modificar types/plugin.ts (PluginEngineHandle real)

Aplicar §5.2 literal. **Verificar empíricamente** os imports
necesarios (NodeInstance, Budget, TreeDef, UnlockCheck, Locale,
Result) e engadilos coherentemente.

**Verificación intermedia**:
```bash
pnpm turbo run typecheck --force                          # 22/22
```

### T3 — Crear PluginAPI.ts

Aplicar §5.5 literal.

### T4 — Verificación intermedia (typecheck)

```bash
pnpm turbo run typecheck --force                          # 22/22
```

Cero tests novos aínda; só typecheck do PluginAPI standalone.

### T5 — Crear test PluginAPI.test.ts

Aplicar §5.9 §1-12 literal.

**Verificación**:
```bash
pnpm --filter @yggdrasil-forge/core test --force        # 1636 + 12 = 1648
```

### T6 — Modificar PluginManager.ts (constructor + register + unregister)

Aplicar §5.6 literal.

### T7 — Modificar PluginManager.test.ts (helper + 8 substituicións + test #8)

Aplicar §5.8 literal.

**Verificación CRÍTICA**:
```bash
pnpm --filter @yggdrasil-forge/core test --force        # 1648 tests
```

**Tódolos tests previos de PluginManager.test.ts deben pasar**
(8 substituicións + test #8 modificado).

**Especial atención**: outros tests de PluginManager NON
modificados deben pasar inchanged.

### T8 — Modificar TreeEngine.ts (hookRunner + engineHandle)

Aplicar §5.7 literal.

**Verificación CRÍTICA**:
```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1648 tests
```

**Tódolos tests de TreeEngine.plugins.test.ts deben pasar**
inchanged (verifican `engine.registerPlugin(plugin)` con vi.fn()
install).

Se algún falla → **ESCALAR**.

### T9 — Crear test TreeEngine.install.test.ts + verificación final

Aplicar §5.9 §13-20 literal.

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1656 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "PluginAPI|PluginManager|^All files" | head -5
# Cobertura targets:
#   PluginAPI.ts: 100/100/100/100
#   PluginManager.ts: baseline mantida ou superada
#   TreeEngine.ts: baseline mantida
```

### T10 — Build + Lint + Format + Grep + Changeset + commit + push

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/plugins/PluginAPI.ts \
  packages/core/src/plugins/PluginManager.ts \
  packages/core/src/types/plugin.ts \
  packages/core/src/engine/TreeEngine.ts \
  packages/core/__tests__/plugins/PluginAPI.test.ts \
  packages/core/__tests__/plugins/PluginManager.test.ts \
  packages/core/__tests__/plugins/TreeEngine.install.test.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
```

`.changeset/plugin-api-8-4-b-ii.md`:
```
---
'@yggdrasil-forge/core': minor
'@yggdrasil-forge/common': minor
---

feat(core): connect PluginManager + HookRunner via PluginAPI (sub-phase 8.4.b.ii)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/core`: **`PluginAPI` class interna** en
  `packages/core/src/plugins/` (implementación da PluginAPI
  interface). 6 métodos:
  - **`registerHook<K>(name, handler)`**: delega a
    `hookRunner.register(name, pluginId, handler)`.
  - **`emit<K>(event, ...args)`**: proxy directo a
    `eventEmitter.emit`.
  - **`log(level, message)`**: console.* con prefixo
    `[plugin:id] msg`.
  - **`registerCondition/registerLayout/registerStorageAdapter`**:
    lanzan `YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED` (DIFERIDOS a
    sub-fases futuras).
- `PluginEngineHandle`: **tipo real** en `types/plugin.ts` (antes
  era `unknown` placeholder). Interface readonly con 10 getters:
  `getNodeState`, `getAllNodeStates`, `getBudget`, `getProgress`,
  `getTreeDef`, `getLocale`, `getStat`, `getAllStats`,
  `isReadOnly`, `canUnlock`. **Cero mutations** expostas; plugins
  son observers/interceptors via hooks.
- `@yggdrasil-forge/common`: **4 ErrorCodes novos** baixo prefixo
  existente `YGG_PL*`:
  - `PLUGIN_API_NOT_IMPLEMENTED` (`YGG_PL003`).
  - `PLUGIN_INSTALL_FAILED` (`YGG_PL004`).
  - `PLUGIN_UNINSTALL_FAILED` (`YGG_PL005`).
  - `PLUGIN_HOOK_THREW` (`YGG_PL006`).
  - Mensaxes localizadas gl/es/en.

### Changed
- `PluginManager`:
  - **Constructor signature**: `(engineHandle, hookRunner,
    eventEmitter, locale?)` en lugar de `(locale?)`.
    **Excepción documentada**: PluginManager é peza interna en
    construción incremental (8.4.a → 8.4.b.ii); o constructor é
    detalle de implementación, NON API pública.
  - `register(plugin)`: agora chama `plugin.install(engineHandle,
    api)` con PluginAPI real. Se install lanza → rollback (delete
    do Map + `hookRunner.unregisterAllForPlugin(id)`) + return
    `err(PLUGIN_INSTALL_FAILED)`.
  - `unregister(id)`: chama `hookRunner.unregisterAllForPlugin(id)`
    + delete do Map SEMPRE (best effort) + `plugin.uninstall(engineHandle)`
    se existe. Se uninstall lanza → return
    `err(PLUGIN_UNINSTALL_FAILED)` pero estado é consistente.
- `TreeEngine`: constructor crea `HookRunner` interno (membro
  privado `hookRunner`) co callback `onError` que emite
  `pluginError` event no EventEmitter (envolvendo erros
  non-YggdrasilError con `PLUGIN_HOOK_THREW`). Constructor crea
  `engineHandle: PluginEngineHandle` (subset readonly con 10
  getters bound a `this`) e pásao a `new PluginManager(...)` xunto
  con hookRunner + events + locale.
- `PluginManager.test.ts`: **modificacións documentadas**:
  - Engadido helper `makePluginManager(locale?)` que cria
    PluginManager con mocks dos 3 deps (engineHandle stub,
    HookRunner real, EventEmitter real).
  - 8 ocorrencias de `new PluginManager(...)` reemplazadas por
    `makePluginManager(...)`.
  - Test #8 modificado: `expect(plugin.install).not.toHaveBeenCalled()`
    → `expect(plugin.install).toHaveBeenCalledTimes(1)` +
    `toHaveBeenCalledWith(engineHandle, api)`.

### Note
- Sub-fase 8.4.b.ii SUB-SUB-SUB-FASE de 8.4. **Conexión** de
  PluginManager (8.4.a) + HookRunner (8.4.b.i) via PluginAPI.
- **Tras 8.4.b.ii, plugins son funcionais**:
  - `plugin.install()` é chamado con engineHandle real + PluginAPI
    durante `registerPlugin`.
  - Plugins poden rexistrar hooks via `api.registerHook(...)`.
  - Hooks **NON son chamados aínda desde TreeEngine.unlock/lock/respec**;
    8.4.c implementa esa integration.
- **Excepción documentada en modificación de PluginManager.test.ts**:
  PluginManager é peza interna en construción incremental;
  constructor signature cambia por design. A regra dura "cero
  modificación de tests existentes" protexe **tests de API pública
  estable**, NON tests de **internos en construción documentada**.
- **TreeEngine.plugins.test.ts NON modificado**: tests usan
  `engine.registerPlugin(plugin)` con `install: vi.fn()` →
  pasarán intactos porque vi.fn() ignora args + devolve undefined.
- **DIFERIDOS** (sub-fases futuras): `registerCondition`,
  `registerLayout`, `registerStorageAdapter`. Plugins que tenten
  usalos durante install recibirán
  `YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED`.
- **Cero deps de npm engadidas**.
- **Cero modificación de packages/storage/, packages/react/**, outros.
- **HookRunner.ts e HookRunner.test.ts INTACTOS** desde 8.4.b.i.
- **Lección 8.3 L1 aplicada con rigor**: T0.2 verifica empíricamente
  estado actual antes de modificar.
- **Decisión do director documentada**:
  - Rollback en install failure (cero estado parcial).
  - Best effort en uninstall failure (cleanup garantido).
  - PluginEngineHandle 10 getters readonly (cero mutations).
  - registerCondition/Layout/StorageAdapter lanzan
    PLUGIN_API_NOT_IMPLEMENTED (claridade > silently breaking).
  - 4 ErrorCodes novos (cero envolver con codes inadecuados).
```

Commit Conventional:
`feat(core): connect PluginManager + HookRunner via PluginAPI (sub-phase 8.4.b.ii)`

Push directo a `origin/main` (base `0f9ab45`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.4.b.ii — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 0f9ab45)
✅ PluginEngineHandle MODIFICADO en types/plugin.ts:
   - De `unknown` a interface real con 10 getters readonly
✅ PluginAPI.ts NOVO en packages/core/src/plugins/:
   - 3 métodos funcionais: registerHook, emit, log
   - 3 métodos lanzan PLUGIN_API_NOT_IMPLEMENTED
✅ PluginManager MODIFICADO (excepción documentada):
   - Constructor: (engineHandle, hookRunner, events, locale?)
   - register chama install con engineHandle + api real
   - Rollback completo se install lanza
   - unregister chama uninstall (best effort) + cleanup hooks
✅ TreeEngine MODIFICADO:
   - +membro hookRunner (HookRunner privado)
   - Constructor crea hookRunner con onError → emit pluginError
   - Constructor crea engineHandle (10 getters bound a this)
   - Pasa (engineHandle, hookRunner, events, locale) a PluginManager
✅ 4 ErrorCodes novos baixo prefixo YGG_PL*:
   - YGG_PL003 PLUGIN_API_NOT_IMPLEMENTED
   - YGG_PL004 PLUGIN_INSTALL_FAILED
   - YGG_PL005 PLUGIN_UNINSTALL_FAILED
   - YGG_PL006 PLUGIN_HOOK_THREW
✅ Mensaxes localizadas gl/es/en para os 4 ErrorCodes
✅ PluginManager.test.ts MODIFICADO (excepción documentada):
   - +helper makePluginManager() con mocks dos 3 deps
   - 8 ocorrencias `new PluginManager(...)` → `makePluginManager(...)`
   - Test #8: not.toHaveBeenCalled → toHaveBeenCalledTimes(1) +
     toHaveBeenCalledWith(engineHandle, api)
✅ T0.2 verificación empírica (lección 8.3 L1):
   - PluginAPI.ts non existe (libre)
   - PluginManager constructor signature antiga confirmada
   - TreeEngine ten os 10 getters (≥1 cada)
   - 8 construcións nos tests confirmadas
✅ T4 verificación intermedia: PluginAPI typecheck OK
✅ T7 verificación CRÍTICA: tests modificados pasan + outros 1620+
   tests previos intactos
✅ T8 verificación CRÍTICA: TreeEngine.plugins.test.ts pasa inchanged
   (usa vi.fn() install que ignora args)
✅ CERO modificación de HookRunner.ts (intacto desde 8.4.b.i)
✅ CERO modificación de TreeEngine.plugins.test.ts (pasa inchanged)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ Tests: 1636 + ~20 = ~1656 core tests
   - 12 PluginAPI (registerHook delega, registerCondition lanza
     PL003, registerLayout, registerStorageAdapter, emit proxy,
     log 4 levels, locale localization)
   - 8 TreeEngine.install (install async/sync/fail, rollback,
     uninstall called/missing/fails, cleanup hooks)
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - PluginAPI.ts: 100/100/100/100
   - PluginManager.ts: cobertura mantida ou superada
   - TreeEngine.ts: baseline mantida
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquetes core + common: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.4.b.ii SUB-SUB-SUB-FASE de 8.4.
   - 43 sub-fases consecutivas sen rollback.
   - PLUGINS SON AGORA FUNCIONAIS (install() chamado con engineHandle
     + PluginAPI real).
   - Hooks rexistrados NON son chamados aínda (DIFERIDO a 8.4.c).
   - 4 sub-fases pendentes na Fase 8 (8.4.c, 8.5, 8.6, 8.7, 8.8).
   - Excepción documentada na modificación de PluginManager.test.ts
     (interno en construción incremental).
✅ Changeset minor (core + common) + nova [Unreleased]
✅ git status pre-commit: 12 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.4.c (integración hooks en TreeEngine.unlock/
lock/respec/canUnlock).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.4.b.ii. **Conexión** de PluginManager + HookRunner
via PluginAPI + tipar PluginEngineHandle real + integración en
TreeEngine constructor + 4 ErrorCodes novos + excepción documentada
na modificación de PluginManager.test.ts (peza interna en construción
incremental; cero violación da regra dura). 12 ficheiros tocados
(4 NOVOS + 8 MODIFICADOS), ~20 tests novos, risco MEDIO-ALTO por
coordenación entre múltiples pezas. Lección 8.3 L1 aplicada con
rigor en T0.2. Tras esta sub-fase, plugins son funcionais (install()
chamado con engineHandle + PluginAPI real); 8.4.c conectará os
hooks rexistrados desde TreeEngine.unlock/lock/respec/canUnlock.*

*Decisións críticas documentadas:
- Rollback en install failure (cero estado parcial).
- Best effort en uninstall failure (cleanup garantido).
- PluginEngineHandle 10 getters readonly (cero mutations).
- registerCondition/Layout/StorageAdapter lanzan PLUGIN_API_NOT_IMPLEMENTED.
- PluginManager.test.ts modificación documentada como excepción.*
