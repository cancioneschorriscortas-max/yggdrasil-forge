# BRIEFING — SUB-FASE 8.4.b.i de Yggdrasil Forge

> Pega este documento no chat executor.
> **Sub-sub-sub-fase de 8.4** (PluginManager + HookRunner).
> Tras 8.4.a (PluginManager standalone), 8.4.b.i entrega **HookRunner
> standalone**: clase interna que xestiona rexistro/execución dos
> 8 hooks tipados en `Hooks` interface (beforeUnlock, afterUnlock,
> beforeLock, afterLock, beforeRespec, afterRespec,
> computeUnlockability, computeCost).
>
> **Scope estritamente acoutado**:
> - **Só HookRunner class** + tests específicos.
> - **Cero PluginAPI implementation** (DIFERIDO a 8.4.b.ii).
> - **Cero modificación de PluginManager** (DIFERIDO a 8.4.b.ii).
> - **Cero modificación de TreeEngine** (cero hooks chamados desde
>   unlock/lock/respec aínda; DIFERIDO a 8.4.c).
> - **Cero ErrorCodes novos** (HookRunner captura erros silenciosamente
>   via callback `onError` opcional; pluginError event xa existe no
>   EventMap).
>
> **Decisións confirmadas polo director**:
> - **Cero short-circuit** en runBefore*: tódolos handlers se executan;
>   `result = false` se algún devolveu false (cada plugin ten
>   oportunidade de gravar audit/log).
> - **Captura de erros** en cada handler: chama `onError(pluginId,
>   error)` se está definido; **continúa con outros handlers** (cero
>   rotura do flow).
> - **Per-plugin tracking**: `register(name, pluginId, handler)` con
>   pluginId explícito + método `unregisterAllForPlugin(pluginId)`
>   para cleanup en 8.4.b.ii cando se chame `unregisterPlugin`.
> - **For-loop secuencial** (cero `Promise.all`): handlers en orde
>   de rexistro; permite que un handler dependa do output dun anterior
>   se require (vía `ctx.metadata`).
>
> **Lección 8.3 L1 aplicada**: T0.2 verifica que `HookRunner` non
> existe no código (xa verificado polo director).
>
> 8.4.b.ii, 8.4.c, 8.5-8.8 DIFERIDOS.

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
- Pushed: `═══ SUB-FASE 8.4.b.i — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 8.4.b.i — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio.

**0.10 — exactOptionalPropertyTypes**: aplica cando require.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: HookRunner chega a **100/100/100/100**. Cero
regresión na baseline post-8.4.a.

**0.12 — Strings multiline**: single template literal (lección 7.6
L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de calquera
ficheiro existente. **Especialmente**: cero modificación de
`PluginManager.ts`, `TreeEngine.ts`, ou ningún test existente.
Tódolos 1614 core + 60 common + 193 storage + 116 react = 1983
tests existentes deben pasar intactos.

**0.14 — Cast con `as` permitidos**: o tipado dos hooks require
casts puntuais nos métodos `register` e `filterByPluginId` polas
unións de tipos `Hooks[K]`. **Cada `as` require comentario
xustificando** (lección histórica).

**0.15 — Aliñamento con investigación do director**: HookRunner
debe ter exactamente os **8 métodos públicos** prescritos en §5.4
+ `register` + `unregisterAllForPlugin`. **Cero engadir métodos
extras** (e.g., cero `hasHandlers`, cero `getHandlerCount`, etc.)
sen escalación.

---

## 1. IDENTIFICACIÓN

Sub-fase **8.4.b.i** de Yggdrasil Forge. Sub-sub-sub-fase **scope
mínimo viable**: só HookRunner standalone.

**Pezas (2 grupos)**:

**Grupo A — HookRunner (NOVO)**:
1. **`packages/core/src/plugins/HookRunner.ts`** (NOVO; interno;
   cero export público). Clase con:
   - 8 arrays internos privados (un por hook name) almacenando
     `RegisteredHandler<K>` (pluginId + handler).
   - `register<K>(name, pluginId, handler)`: engade ao array
     correspondente.
   - `unregisterAllForPlugin(pluginId)`: borra todos os handlers
     dun pluginId.
   - 3 métodos `runBefore*`: `runBeforeUnlock`, `runBeforeLock`,
     `runBeforeRespec`. Devolven `Promise<boolean>`.
   - 3 métodos `runAfter*`: `runAfterUnlock`, `runAfterLock`,
     `runAfterRespec`. Devolven `Promise<void>`.
   - 2 métodos `runCompute*`: `runComputeUnlockability` (sync,
     devolve UnlockCheck), `runComputeCost` (sync, devolve readonly
     Cost[]).

**Grupo B — Tests**:
2. **`packages/core/__tests__/plugins/HookRunner.test.ts`** (NOVO;
   ~14 tests).

**Cero modificación de**:
- `packages/core/src/plugins/PluginManager.ts` (modificarase en
  8.4.b.ii).
- `packages/core/src/engine/TreeEngine.ts` (cero hooks chamados;
  DIFERIDO a 8.4.c).
- `packages/core/src/types/plugin.ts` (Plugin types xa tipados;
  PluginEngineHandle queda como `unknown` placeholder ata 8.4.b.ii).
- Tests existentes (1614 core + outros).
- `packages/common/`, `packages/storage/`, `packages/react/`,
  outros 14 paquetes scaffold.
- `package.json`, configs, lockfile.
- `docs/architecture/MASTER.md`.

**CERO deps de npm engadidas.** Cero ErrorCodes novos. Cero entry
points novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `df7c696`, verificada
empíricamente)**.

### Hooks interface (literal, verificado en plugin.ts)

```ts
export interface Hooks {
  readonly beforeUnlock: (nodeId: string, ctx: HookContext) => boolean | Promise<boolean>
  readonly afterUnlock: (nodeId: string, ctx: HookContext) => void | Promise<void>
  readonly beforeLock: (nodeId: string, ctx: HookContext) => boolean | Promise<boolean>
  readonly afterLock: (nodeId: string, ctx: HookContext) => void | Promise<void>
  readonly beforeRespec: (nodeIds: readonly string[], ctx: HookContext) => boolean | Promise<boolean>
  readonly afterRespec: (nodeIds: readonly string[], ctx: HookContext) => void | Promise<void>
  readonly computeUnlockability: (nodeId: string, defaultResult: UnlockCheck) => UnlockCheck
  readonly computeCost: (nodeId: string, defaultCost: readonly Cost[]) => readonly Cost[]
}
```

**Decisión do director**:
- `before*` poden ser async (`Promise<boolean>`); runner usa `await`.
- `after*` poden ser async (`Promise<void>`); runner usa `await`.
- `compute*` son **sync only** (devolve directamente o tipo, cero
  Promise).

### HookContext (literal)

```ts
export interface HookContext {
  readonly locale: string
  readonly timestamp: number
  readonly actor?: string
  metadata: Record<string, unknown>
}
```

**Nota**: o HookRunner **NON constrúe** HookContext. O caller (8.4.c
TreeEngine.unlock/lock/respec) constrúeo e pásao a runBefore/runAfter.
Para 8.4.b.i, tests xerarán HookContext mock.

### EventMap.pluginError (verificado)

```ts
readonly pluginError: (pluginId: string, error: YggdrasilError) => void
```

**Decisión do director**: HookRunner **NON emite** pluginError
directamente. Recibe `onError?: (pluginId: string, error: unknown)
=> void` callback no constructor. En 8.4.b.ii, PluginManager pasará
un callback que emite pluginError no EventEmitter do TreeEngine.

**Razón**: HookRunner é standalone; cero acoplamento a EventEmitter.

### Estado scaffold tras 8.4.a

```
packages/core/src/plugins/
├── PluginManager.ts             (existente 8.4.a)
└── HookRunner.ts                (NOVO 8.4.b.i)

packages/core/__tests__/plugins/
├── PluginManager.test.ts        (existente)
├── TreeEngine.plugins.test.ts   (existente)
└── HookRunner.test.ts           (NOVO 8.4.b.i)
```

### Lección 8.3 L1 aplicada

```bash
# Confirmar HookRunner non existe:
grep -E "class HookRunner|HookRunner\.ts" packages/core/src/ -rn
# Resultado verificado polo director: 0 matches. ✅ libre.
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `df7c696` (sub-fase 8.4.a — PluginManager).
- 1614 core + 60 common + 193 storage + 116 react = 1983 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 45 ErrorCodes existentes (incluído PL001-PL002).
- DT abertas: 11.
- **Cadea 41 sub-fases consecutivas sen rollback**.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/core` un **`HookRunner` class
interna standalone** en `packages/core/src/plugins/` que xestiona
rexistro + execución dos 8 hooks tipados en `Hooks` interface
(beforeUnlock, afterUnlock, beforeLock, afterLock, beforeRespec,
afterRespec, computeUnlockability, computeCost): `register(name,
pluginId, handler)` + `unregisterAllForPlugin(pluginId)` + 3 métodos
`runBefore*` async (cero short-circuit; result false se algún
devolveu false) + 3 métodos `runAfter*` async (fire-and-forget) +
2 métodos `runCompute*` sync (chain pattern); + **captura de erros**
en cada handler via callback opcional `onError(pluginId, error)`
(continúa con outros handlers); + tests específicos (~14). **Cero
modificación de PluginManager, TreeEngine, types ou ningún test
existente**. **Cero ErrorCodes novos**. **Cero PluginAPI**
(DIFERIDO a 8.4.b.ii). Establece base testable independente para
integration en 8.4.b.ii + 8.4.c.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (3)**:
- `packages/core/src/plugins/HookRunner.ts` (~180 liñas).
- `packages/core/__tests__/plugins/HookRunner.test.ts` (~250 liñas;
  ~14 tests).
- `.changeset/hook-runner-8-4-b-i.md` (NOVO).

**MODIFICADOS (1)**:
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Total: 4 ficheiros tocados** (3 NOVOS + 1 MODIFICADO).

**Cero modificación de** (lista completa):
- Calquera ficheiro en `packages/core/src/` salvo o novo HookRunner.ts.
- Calquera test existente (1614 core + 60 common + 193 storage +
  116 react).
- `packages/common/`, `packages/storage/`, `packages/react/`, outros.
- `package.json`, configs.

### 5.2 — HookRunner.ts implementación (FIXADA)

```ts
// packages/core/src/plugins/HookRunner.ts
// ── INICIO: HookRunner ──
// Xestiona rexistro + execución dos hooks tipados en `Hooks`
// interface (plugin.ts).
//
// **Sub-fase 8.4.b.i**: standalone (cero acoplamento a PluginManager
// nin TreeEngine). 8.4.b.ii conecta PluginManager.register para
// que os plugins rexistren hooks via PluginAPI. 8.4.c conecta
// TreeEngine.unlock/lock/respec/canUnlock para chamar os runners.
//
// **Patrón**:
// - 8 arrays internos privados (un por hook name).
// - `register(name, pluginId, handler)`: engade ao array correspondente.
// - `unregisterAllForPlugin(pluginId)`: borra handlers do pluginId.
// - `runBefore*` async: cero short-circuit; result=false se algún
//   handler devolveu false.
// - `runAfter*` async: fire-and-forget; capture errors.
// - `runCompute*` sync: chain pattern; cada handler recibe o
//   resultado do anterior.
//
// Erros: captura + chama `onError(pluginId, error)` se está definido;
// continúa con outros handlers (cero rotura do flow).

import type { Cost, HookContext, Hooks, UnlockCheck } from '../types/index.js'

/**
 * Handler rexistrado co metadata do plugin que o rexistrou.
 * Usado para tracking + error reporting.
 */
interface RegisteredHandler<K extends keyof Hooks> {
  readonly pluginId: string
  readonly handler: Hooks[K]
}

/**
 * Opcións do HookRunner.
 */
export interface HookRunnerOptions {
  /**
   * Callback chamado cando un handler lanza unha excepción.
   * Recibe o pluginId que rexistrou o handler + o erro.
   *
   * Se non se define, os erros son silenciosamente ignorados (pero
   * o flow continúa con outros handlers).
   */
  readonly onError?: (pluginId: string, error: unknown) => void
}

export class HookRunner {
  // ── Arrays internos por hook name ──
  private readonly beforeUnlockHandlers: RegisteredHandler<'beforeUnlock'>[] = []
  private readonly afterUnlockHandlers: RegisteredHandler<'afterUnlock'>[] = []
  private readonly beforeLockHandlers: RegisteredHandler<'beforeLock'>[] = []
  private readonly afterLockHandlers: RegisteredHandler<'afterLock'>[] = []
  private readonly beforeRespecHandlers: RegisteredHandler<'beforeRespec'>[] = []
  private readonly afterRespecHandlers: RegisteredHandler<'afterRespec'>[] = []
  private readonly computeUnlockabilityHandlers: RegisteredHandler<'computeUnlockability'>[] = []
  private readonly computeCostHandlers: RegisteredHandler<'computeCost'>[] = []

  private readonly onError: ((pluginId: string, error: unknown) => void) | undefined

  constructor(opts?: HookRunnerOptions) {
    this.onError = opts?.onError
  }

  /**
   * Rexistra un handler para un hook concreto. O pluginId úsase
   * para tracking + error reporting.
   */
  register<K extends keyof Hooks>(name: K, pluginId: string, handler: Hooks[K]): void {
    // Casts autorizados: TS non pode estreitar o tipo do array
    // correspondente sen runtime check; usamos switch para safety.
    switch (name) {
      case 'beforeUnlock':
        this.beforeUnlockHandlers.push({
          pluginId,
          handler: handler as Hooks['beforeUnlock'],
        })
        return
      case 'afterUnlock':
        this.afterUnlockHandlers.push({
          pluginId,
          handler: handler as Hooks['afterUnlock'],
        })
        return
      case 'beforeLock':
        this.beforeLockHandlers.push({
          pluginId,
          handler: handler as Hooks['beforeLock'],
        })
        return
      case 'afterLock':
        this.afterLockHandlers.push({
          pluginId,
          handler: handler as Hooks['afterLock'],
        })
        return
      case 'beforeRespec':
        this.beforeRespecHandlers.push({
          pluginId,
          handler: handler as Hooks['beforeRespec'],
        })
        return
      case 'afterRespec':
        this.afterRespecHandlers.push({
          pluginId,
          handler: handler as Hooks['afterRespec'],
        })
        return
      case 'computeUnlockability':
        this.computeUnlockabilityHandlers.push({
          pluginId,
          handler: handler as Hooks['computeUnlockability'],
        })
        return
      case 'computeCost':
        this.computeCostHandlers.push({
          pluginId,
          handler: handler as Hooks['computeCost'],
        })
        return
    }
  }

  /**
   * Desrexistra TODOS os handlers dun plugin (útil ao chamar
   * unregisterPlugin en 8.4.b.ii).
   */
  unregisterAllForPlugin(pluginId: string): void {
    HookRunner.filterByPluginId(this.beforeUnlockHandlers, pluginId)
    HookRunner.filterByPluginId(this.afterUnlockHandlers, pluginId)
    HookRunner.filterByPluginId(this.beforeLockHandlers, pluginId)
    HookRunner.filterByPluginId(this.afterLockHandlers, pluginId)
    HookRunner.filterByPluginId(this.beforeRespecHandlers, pluginId)
    HookRunner.filterByPluginId(this.afterRespecHandlers, pluginId)
    HookRunner.filterByPluginId(this.computeUnlockabilityHandlers, pluginId)
    HookRunner.filterByPluginId(this.computeCostHandlers, pluginId)
  }

  /** In-place filter: borra entries co pluginId especificado. */
  private static filterByPluginId<K extends keyof Hooks>(
    arr: RegisteredHandler<K>[],
    pluginId: string,
  ): void {
    let writeIdx = 0
    for (let readIdx = 0; readIdx < arr.length; readIdx++) {
      const entry = arr[readIdx]
      if (entry !== undefined && entry.pluginId !== pluginId) {
        arr[writeIdx++] = entry
      }
    }
    arr.length = writeIdx
  }

  // ── Before runners (async; cero short-circuit) ──

  async runBeforeUnlock(nodeId: string, ctx: HookContext): Promise<boolean> {
    let result = true
    for (const entry of this.beforeUnlockHandlers) {
      try {
        const r = await entry.handler(nodeId, ctx)
        if (r === false) result = false
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
    return result
  }

  async runBeforeLock(nodeId: string, ctx: HookContext): Promise<boolean> {
    let result = true
    for (const entry of this.beforeLockHandlers) {
      try {
        const r = await entry.handler(nodeId, ctx)
        if (r === false) result = false
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
    return result
  }

  async runBeforeRespec(nodeIds: readonly string[], ctx: HookContext): Promise<boolean> {
    let result = true
    for (const entry of this.beforeRespecHandlers) {
      try {
        const r = await entry.handler(nodeIds, ctx)
        if (r === false) result = false
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
    return result
  }

  // ── After runners (async; fire-and-forget; capture errors) ──

  async runAfterUnlock(nodeId: string, ctx: HookContext): Promise<void> {
    for (const entry of this.afterUnlockHandlers) {
      try {
        await entry.handler(nodeId, ctx)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
  }

  async runAfterLock(nodeId: string, ctx: HookContext): Promise<void> {
    for (const entry of this.afterLockHandlers) {
      try {
        await entry.handler(nodeId, ctx)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
  }

  async runAfterRespec(nodeIds: readonly string[], ctx: HookContext): Promise<void> {
    for (const entry of this.afterRespecHandlers) {
      try {
        await entry.handler(nodeIds, ctx)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
  }

  // ── Compute runners (sync; chain pattern) ──

  runComputeUnlockability(nodeId: string, defaultResult: UnlockCheck): UnlockCheck {
    let current = defaultResult
    for (const entry of this.computeUnlockabilityHandlers) {
      try {
        current = entry.handler(nodeId, current)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
        // `current` mantén o último valor exitoso (ou defaultResult
        // se ningún handler tivo éxito aínda).
      }
    }
    return current
  }

  runComputeCost(nodeId: string, defaultCost: readonly Cost[]): readonly Cost[] {
    let current = defaultCost
    for (const entry of this.computeCostHandlers) {
      try {
        current = entry.handler(nodeId, current)
      } catch (e) {
        this.onError?.(entry.pluginId, e)
      }
    }
    return current
  }
}
// ── FIN: HookRunner ──
```

**Decisións nesta peza**:
- **Cero exposición pública** (cero export desde core/src/index.ts).
- **8 arrays separados** (cero Map<name, array>) por **claridade
  + tipado estricto** (TS coñece o tipo exacto de cada array).
- **Casts autorizados** en `register`: switch garante runtime safety;
  TypeScript non pode estreitar `Hooks[K]` ao tipo do array correspondente
  sen ergonómicos overloads.
- **Static `filterByPluginId`**: in-place mutation por eficiencia (cero
  reallocations).
- **For-loop secuencial con await**: cero `Promise.all`. Handlers en
  orde de rexistro; permite que un handler dependa do output dun
  anterior se require (vía `ctx.metadata`).
- **Compute sync**: tipo `Hooks` non permite Promise en compute hooks;
  cero await.
- **Capture errors + chama onError**: cero rotura do flow.
- **`onError` optional**: se non se define, erros son silenciosamente
  ignorados.

### 5.3 — Tests prescritos (~14 tests)

**`__tests__/plugins/HookRunner.test.ts`**:

#### Construcción + register

1. **Constructor sen opts**: `new HookRunner()` cero throw; cero
   handlers rexistrados inicialmente.
2. **Constructor con `onError`**: callback gardado correctamente.

#### Before runners

3. **runBeforeUnlock con cero handlers**: devolve `true`.
4. **runBeforeUnlock con un handler que devolve true**: devolve `true`.
5. **runBeforeUnlock con un handler que devolve false**: devolve
   `false`.
6. **runBeforeUnlock con múltiples handlers, un devolve false**:
   devolve `false`; **tódolos handlers se executan** (cero
   short-circuit; verificar con `expect(handler.mock.calls).toHaveLength(...)`).
7. **runBeforeUnlock con handler async (Promise<boolean>)**: funciona
   correctamente.
8. **runBeforeRespec con readonly string[] args**: pasa array
   correctamente.

#### After runners

9. **runAfterUnlock con múltiples handlers, todos executan en orde**:
   verificar order de execución.
10. **runAfterUnlock con handler async (Promise<void>)**: funciona.

#### Compute runners

11. **runComputeUnlockability chain pattern**: handler1 modifica
    defaultResult → handler2 recibe modificado.
12. **runComputeCost chain pattern**: análogo a unlockability.

#### Error handling

13. **runBeforeUnlock con handler que lanza**: capture + chama
    `onError(pluginId, error)`; continúa con outros handlers; result
    coherente.
14. **runComputeUnlockability con handler que lanza**: capture +
    `onError`; `current` mantén último valor exitoso.

#### Unregister all for plugin

15. **unregisterAllForPlugin borra só handlers do pluginId
    especificado**: rexistrar 3 handlers (2 de pluginA, 1 de pluginB);
    `unregisterAllForPlugin('pluginA')`; verificar que só queda 1
    handler (de pluginB).

**Total: ~14-15 tests novos**. Post-8.4.b.i esperado: 1614 → **~1628
core tests**.

**Fixtures necesarios**:
- HookContext mock: `{ locale: 'gl', timestamp: 0, metadata: {} }`.
- UnlockCheck mock: `{ allowed: true, reasons: [] }` ou similar (verificar
  shape exacto en T0.2).
- Handler mocks con `vi.fn()` para tracking.

### 5.4 — Cobertura prescrita

- **HookRunner.ts**: **100/100/100/100**.
- **Cero impacto** noutras pezas.

### 5.5 — Cero deps novas

Verificable empíricamente: cero modificación de package.json.

### 5.6 — Test counts esperados post-8.4.b.i

- **core**: 1614 + ~14 = **~1628 tests**.
- **common, storage, react**: intactos.

### 5.7 — Coordinación con 8.4.b.ii

**8.4.b.ii modificará**:
- `PluginManager.ts` para chamar `plugin.install(engineHandle, api)`
  con PluginAPI real.
- `PluginAPI.registerHook(name, handler)` → chama
  `hookRunner.register(name, this.pluginId, handler)`.
- `PluginManager.unregister` → chama `hookRunner.unregisterAllForPlugin(id)`
  + `plugin.uninstall()`.
- TreeEngine: crear HookRunner + pasar a PluginManager.

**Cero rotura de signatures** prevista (HookRunner é base estable).

### 5.8 — Lección 8.3 L1 aplicada

T0.2 verifica:
```bash
# Confirmar HookRunner non existe:
ls packages/core/src/plugins/HookRunner.ts 2>/dev/null && echo "ESCALAR" || echo "Non existe ✅"

# Confirmar PluginManager + TreeEngine intactos:
git diff origin/main -- packages/core/src/plugins/PluginManager.ts
git diff origin/main -- packages/core/src/engine/TreeEngine.ts
# Esperado: cero diff (estamos en main; cero modificación pendente).
```

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| HookRunner class | clase + 10 métodos | HookRunner.ts | ~180 |
| HookRunnerOptions | TS interface | HookRunner.ts | (incluído) |
| 1 ficheiro tests | describe blocks | HookRunner.test.ts | ~250 |

**Total estimado**: ~180 liñas de código + ~250 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (3)**:
- `packages/core/src/plugins/HookRunner.ts`
- `packages/core/__tests__/plugins/HookRunner.test.ts`
- `.changeset/hook-runner-8-4-b-i.md`

**MODIFICADOS (1)**:
- `CHANGELOG.md`

**Total: 4 ficheiros tocados**.

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/core/src/`, especialmente:
  - `plugins/PluginManager.ts` (modificarase en 8.4.b.ii).
  - `engine/TreeEngine.ts` (cero modificación; DIFERIDO).
  - `types/plugin.ts` (PluginEngineHandle queda como `unknown`;
    modificarase en 8.4.b.ii).
- Tests existentes (1614 core + 60 common + 193 storage + 116 react).
- `packages/common/`, `packages/storage/`, `packages/react/`, outros
  paquetes.
- `package.json`, configs.
- `docs/architecture/MASTER.md`.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

TS strict, cero `any`. Casts `as` permitidos só en `register` switch
(comentario xustificativo obrigatorio: "casts autorizados — switch
garante runtime safety").

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en HookRunner class + métodos públicos.

**Marcadores**: `// ── INICIO: HookRunner ──` / `// ── FIN: HookRunner ──`.

**Cero throw**: erros encerrados con try/catch + onError callback.

**Patrón Result**: cero require en HookRunner (cero erros funcionais;
só captura de erros de handlers).

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/src/plugins/PluginManager.ts`
  (DIFERIDO a 8.4.b.ii).
- ❌ Modificar `packages/core/src/engine/TreeEngine.ts` (DIFERIDO
  a 8.4.b.ii e 8.4.c).
- ❌ Modificar `packages/core/src/types/plugin.ts`
  (PluginEngineHandle modificarase en 8.4.b.ii).
- ❌ Modificar **calquera ficheiro de tests existente** (1614 core,
  60 common, etc.).
- ❌ Modificar `packages/common/`, `packages/storage/`,
  `packages/react/`, outros paquetes.
- ❌ Implementar `PluginAPI` class (DIFERIDO a 8.4.b.ii).
- ❌ Engadir chamadas a hooks desde TreeEngine.unlock/lock/respec
  (DIFERIDO a 8.4.c).
- ❌ Engadir ErrorCodes novos.
- ❌ Engadir deps de npm.
- ❌ Exportar HookRunner publicamente.
- ❌ Engadir métodos extras non prescritos (`hasHandlers`,
  `getHandlerCount`, etc.) sen escalación.
- ❌ Usar `!` non-null assertions.
- ❌ Usar `Promise.all` en runners (cero require; for-loop secuencial).
- ❌ Engadir short-circuit en runBefore* (decisión do director: cero).
- ❌ Engadir Date.now() / Math.random() (cero require).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T7)

### T0 — Verificación previa + lección 8.3 L1 aplicada

**T0.1** — `git status` limpo. `git log -1` mostra `df7c696` como HEAD.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar HookRunner non existe:
ls packages/core/src/plugins/HookRunner.ts 2>/dev/null && echo "ESCALAR: xa existe" || echo "Non existe ✅"

# Confirmar types necesarios (Hooks, HookContext, UnlockCheck, Cost)
# están re-exportados desde types/index.ts:
grep -E "Hooks|HookContext|UnlockCheck|Cost" packages/core/src/types/index.ts | head -5
# Esperado: re-exports existentes

# Confirmar EventMap.pluginError (cero require usar en 8.4.b.i pero
# necesario para 8.4.b.ii):
grep "pluginError" packages/core/src/types/events.ts | head -3
# Esperado: 1+ match
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm --filter @yggdrasil-forge/common build
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/core test --force        # 1614 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear HookRunner.ts

Aplicar §5.2 literal. Crear `packages/core/src/plugins/HookRunner.ts`
co contido prescrito.

### T2 — Verificación intermedia (typecheck)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # 1614 tests intactos
```

**Especial atención**: cero tests novos aínda; verifica que o
HookRunner.ts standalone compila + tódolos tests previos pasan
intactos.

### T3 — Crear test HookRunner.test.ts

Aplicar §5.3 literal (~14-15 tests).

### T4 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/core test --force          # ~1628 tests
pnpm --filter @yggdrasil-forge/core exec vitest run --coverage 2>&1 | \
  grep -E "HookRunner|^All files" | head -3
# Cobertura targets:
#   HookRunner.ts: 100/100/100/100
#   Global core: baseline mantida ou superada
```

### T5 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/core build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/core/src/plugins/HookRunner.ts \
  packages/core/__tests__/plugins/HookRunner.test.ts
# NOTA: "TODOS"/"TODO" castelán/galego = "everything"; filtrar.
# IMPORTANTE: "as any" debe ser cero. "as Hooks['xxx']" en switch é
# permitido (casts autorizados).
```

### T6 — Changeset + CHANGELOG

`.changeset/hook-runner-8-4-b-i.md`:
```
---
'@yggdrasil-forge/core': minor
---

feat(core): add HookRunner standalone class (sub-phase 8.4.b.i)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/core`: **`HookRunner` class interna standalone**
  en `packages/core/src/plugins/HookRunner.ts`. Xestiona rexistro
  + execución dos 8 hooks tipados en `Hooks` interface
  (beforeUnlock, afterUnlock, beforeLock, afterLock, beforeRespec,
  afterRespec, computeUnlockability, computeCost).
  - **`register(name, pluginId, handler)`**: engade handler co
    pluginId para tracking.
  - **`unregisterAllForPlugin(pluginId)`**: cleanup ao desinstalar
    plugin (usarase en 8.4.b.ii).
  - **3 métodos `runBefore*`** async: cero short-circuit; result
    false se algún handler devolveu false. Tódolos handlers se
    executan en orde de rexistro.
  - **3 métodos `runAfter*`** async: fire-and-forget; capture
    errors via `onError(pluginId, error)` callback opcional.
  - **2 métodos `runCompute*`** sync: chain pattern; cada handler
    recibe o resultado do anterior. Compute hooks son sync por
    tipo (`Hooks` interface).
  - **Captura de erros**: cada handler está envolto en try/catch;
    `onError(pluginId, error)` chamado se está definido; **continúa
    con outros handlers** (cero rotura do flow).
- `HookRunnerOptions` interface exportada (interna): `{ onError? }`.

### Note
- Sub-fase 8.4.b.i SUB-SUB-SUB-FASE de 8.4. Decomposición do
  director: 8.4.b dividida en 8.4.b.i (HookRunner standalone) +
  8.4.b.ii (PluginAPI implementation + integration con
  PluginManager + TreeEngine).
- **Cero modificación de PluginManager** (DIFERIDO a 8.4.b.ii).
- **Cero modificación de TreeEngine** (cero hooks chamados desde
  unlock/lock/respec; DIFERIDO a 8.4.c).
- **Cero PluginAPI implementation** (DIFERIDO a 8.4.b.ii).
- **Cero ErrorCodes novos** (HookRunner captura erros silenciosamente
  via callback; `pluginError` event xa existe no EventMap).
- **Cero deps de npm engadidas**.
- **Cero modificación de packages/storage/, packages/react/**, outros
  14 paquetes scaffold.
- **Cero modificación de calquera test existente** (1614 core + 60
  common + 193 storage + 116 react = 1983 tests intactos).
- **HookRunner é internal** (cero re-export desde core/src/index.ts).
- **Decisión do director sobre comportamento**:
  - Before: cero short-circuit (tódolos handlers executan; cada
    plugin grava audit/log).
  - After/Compute: capture errors + continúa.
  - For-loop secuencial (cero Promise.all): permite que un handler
    dependa do output dun anterior via `ctx.metadata`.
- **Lección 8.3 L1 aplicada**: T0.2 verifica empíricamente que
  HookRunner non existe antes de crear.
```

### T7 — Commit + push

Commit Conventional:
`feat(core): add HookRunner standalone class (sub-phase 8.4.b.i)`

Push directo a `origin/main` (base `df7c696`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 8.4.b.i — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base df7c696)
✅ HookRunner.ts NOVO en packages/core/src/plugins/
   - 8 arrays internos privados (un por hook name)
   - register(name, pluginId, handler) — switch + casts autorizados
   - unregisterAllForPlugin(pluginId) — in-place filter
   - runBeforeUnlock/Lock/Respec — async, cero short-circuit
   - runAfterUnlock/Lock/Respec — async, fire-and-forget
   - runComputeUnlockability/Cost — sync, chain pattern
   - Captura de erros via onError callback opcional
✅ HookRunnerOptions interface (interna)
✅ T0.2 verificación empírica:
   - HookRunner.ts non existe (libre)
   - Types Hooks, HookContext, UnlockCheck, Cost re-exportados
   - EventMap.pluginError existe (cero require en 8.4.b.i pero
     necesario para 8.4.b.ii)
✅ T2 verificación intermedia: 1614 tests previos pasan intactos
✅ CERO modificación de PluginManager.ts (DIFERIDO a 8.4.b.ii)
✅ CERO modificación de TreeEngine.ts (DIFERIDO a 8.4.c)
✅ CERO modificación de types/plugin.ts (PluginEngineHandle queda
   como `unknown`; modificarase en 8.4.b.ii)
✅ CERO modificación de calquera test existente (1983 totais intactos)
✅ CERO modificación de packages/storage/, packages/react/, outros
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ Tests: 1614 + ~14 = ~1628 core tests
   - 2 constructor (sen/con opts)
   - 6 before runners (cero handlers, true, false, cero short-circuit,
     async, readonly array)
   - 2 after runners (orde, async)
   - 2 compute runners (chain pattern unlockability, cost)
   - 2 error handling (before throws, compute throws)
   - 1 unregisterAllForPlugin
   Common: 60 | Storage: 193 | React: 116 (todos intactos)
✅ Cobertura:
   - HookRunner.ts: 100/100/100/100
   - Resto: sen regresión
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete core: ok
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
   - "as Hooks['xxx']" en switch (autorizado; comentario xustificativo)
   - Cero "as any"
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 8.4.b.i SUB-SUB-SUB-FASE de 8.4.
   - 42 sub-fases consecutivas sen rollback.
   - HookRunner é INTERNA (cero export público).
   - 5 sub-fases pendentes na Fase 8 (8.4.b.ii, 8.4.c, 8.5, 8.6, 8.7, 8.8).
✅ Changeset minor (core) + nova [Unreleased]
✅ git status pre-commit: 4 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 8.4.b.ii (PluginAPI implementation + integration
con PluginManager + TreeEngine).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 8.4.b.i. **HookRunner standalone**. Sub-fase
moi acoutada (4 ficheiros, ~14 tests, ~180 liñas código). Cero
modificación de pezas existentes. Risco MEDIO: clase nova en
directorio existente; tipado complexo dos hooks resolvido con switch
+ casts autorizados. Establece base testable para integration en
8.4.b.ii (modificación PluginManager) e 8.4.c (chamadas dos runners
desde TreeEngine.unlock/lock/respec). Lección 8.3 L1 aplicada con
rigor en T0.2.*
