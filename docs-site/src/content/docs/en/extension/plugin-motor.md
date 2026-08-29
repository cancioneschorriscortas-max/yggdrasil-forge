---
title: Build your engine plugin
description: Step-by-step tutorial — a real TreeEngine plugin with hooks, from empty to tested.
sidebar:
  order: 2
---

The [extension guide](../guia/) is a set of **editor** recipes. This is its **engine** sibling: we will build a real `TreeEngine` plugin, runnable and tested. The complete code lives in [`examples/plugin-foco`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/tree/main/examples/plugin-foco) — clone it and run `pnpm --filter @yggdrasil-forge-examples/plugin-foco start`.

## The rule we will build

**"Finish what you started"**: while an exercise is midway (progress between 0 and 100), you cannot start another one. A small pedagogical rule — but a real one: it covers the three patterns an engine plugin can use.

## 1. The anatomy of a plugin

A `Plugin` is an object with an identity and an `install` function:

```ts
import type { Plugin } from '@yggdrasil-forge/core'

export function createFocoPlugin(): Plugin {
  return {
    id: 'exemplo-foco',
    name: 'Foco pedagóxico',
    version: '1.0.0',
    apiVersion: '1.0.0', // Plugin API version it requires
    permissions: ['read_state', 'register_hooks'], // declarative in 1.x
    install(engine, api) {
      // engine: PluginEngineHandle — 10 READONLY getters, zero mutation
      // api: registerHook, registerCondition, emit, log…
    },
  }
}
```

The `engine` that `install` receives is **not** the full `TreeEngine`: it is a `PluginEngineHandle` with readonly reads (`getNodeState`, `getBudget`, `getProgress`, `canUnlock`…). A plugin observes and opines; it does not mutate on its own.

## 2. The three hook patterns

The same rule is implemented three times, once per hook family — and that is the central lesson:

```ts
install(engine, api) {
  // EXPLAIN (compute*): modify the result of canUnlock so the UI can
  // say WHY it's not allowed. Synchronous.
  api.registerHook('computeUnlockability', (nodeId, defaultResult) => {
    const inProgress = nodeInProgress(engine)
    if (inProgress === null || inProgress === nodeId) return defaultResult
    if (!defaultResult.allowed) return defaultResult // another reason already
    return {
      allowed: false,
      reason: { en: `Finish what you started: "${inProgress}" is midway` },
    }
  })

  // VETO (before*): returning false cancels the operation — the engine
  // returns err(OPERATION_CANCELLED_BY_HOOK). May be async.
  api.registerHook('beforeUnlock', (nodeId) => {
    const inProgress = nodeInProgress(engine)
    return inProgress === null || inProgress === nodeId
  })

  // REACT (after*): post-facto notification — logging, analytics,
  // achievements. It can no longer cancel anything.
  api.registerHook('afterUnlock', (nodeId) => {
    api.log('info', `focus: "${nodeId}" unlocked — focus freed`)
  })
}
```

**Why both sides?** `canUnlock` and `unlock` are different paths. If you only veto in `beforeUnlock`, the UI says "you can" and the click fails silently; if you only touch `computeUnlockability`, the UI says "you can't" but a direct `unlock()` goes through. A real rule implements **explanation and veto**.

## 3. The detector, using the true datum

```ts
function nodeInProgress(engine: PluginEngineHandle): string | null {
  for (const node of engine.getTreeDef().nodes) {
    const progress = engine.getProgress(node.id)
    if (progress > 0 && progress < 100) return node.id
  }
  return null
}
```

The detail that bites: "midway" is read from **`progress`**, not from `state` — the engine does not transition the stored state when you move progress ([the lifecycle of a node](../../contrato/ciclo-de-vida/) explains the two layers).

## 4. Install and use

```ts
const engine = new TreeEngine(tree, { locale: 'gl' })
await engine.registerPlugin(createFocoPlugin())

engine.setProgress('letras', 60)          // exercise midway
engine.canUnlock('numeros')               // { allowed: false, reason: … }
await engine.unlock('numeros')            // err — vetoed by the hook
engine.setProgress('letras', 100)         // finished
await engine.unlock('numeros')            // ok — focus freed
```

Note: for `setProgress`, the node declares `supportsProgress: true` and `progressSource: { type: 'manual' }`.

## 5. The test (tutorials rot too)

The example ships a [minimal test](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/blob/main/examples/plugin-foco/__tests__/focoPlugin.test.ts) with the three cases: without focus everything flows, with focus it explains AND vetoes, and finishing frees the focus. It runs on every CI: if the engine changes and breaks the tutorial, we know.

## The honest hook map (1.x)

Wired in the engine: `beforeUnlock`/`afterUnlock`, `beforeLock`/`afterLock`, `beforeRespec`/`afterRespec`, `computeUnlockability` (in `canUnlock`) and, since 17.9, `computeCost` — wired through a **single funnel** (`getEffectiveCostForTier`, also public for UIs) crossed by `canUnlock`, the `unlock` charges and the `lock`/`respec` refunds. Refund contract: it **recomputes with the current state** — a hook deterministic with respect to (node, tier) yields exact refunds; a state-dependent one yields refunds at the current value, not the historical one. A hook's errors do not crash the engine: they are captured and the flow continues with the other handlers.
