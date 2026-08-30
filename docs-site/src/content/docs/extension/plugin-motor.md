---
title: Crea o teu plugin do motor
description: Tutorial paso a paso — un plugin real do TreeEngine con hooks, do baleiro ao test.
sidebar:
  order: 2
---

A [guía de extensión](../guia/) son receitas do **editor**. Esta é a irmá do **motor**: imos construír un plugin real do `TreeEngine`, executable e testado. O código completo vive en [`examples/plugin-foco`](https://github.com/fraga-labs/yggdrasil-forge/tree/main/examples/plugin-foco) — clónao e corre `pnpm --filter @yggdrasil-forge-examples/plugin-foco start`.

## A regra que imos construír

**«Remata o que empezaches»**: mentres un exercicio estea a medias (progreso entre 0 e 100), non se pode empezar outro. Unha regra pedagóxica pequena — pero de verdade: cobre os tres patróns que un plugin do motor pode usar.

## 1. A anatomía dun plugin

Un `Plugin` é un obxecto con identidade e unha función `install`:

```ts
import type { Plugin } from '@yggdrasil-forge/core'

export function createFocoPlugin(): Plugin {
  return {
    id: 'exemplo-foco',
    name: 'Foco pedagóxico',
    version: '1.0.0',
    apiVersion: '1.0.0', // versión da Plugin API que require
    permissions: ['read_state', 'register_hooks'], // declarativos en 1.x
    install(engine, api) {
      // engine: PluginEngineHandle — 10 getters READONLY, cero mutación
      // api: registerHook, registerCondition, emit, log…
    },
  }
}
```

O `engine` que recibe `install` **non** é o `TreeEngine` completo: é un `PluginEngineHandle` con lecturas readonly (`getNodeState`, `getBudget`, `getProgress`, `canUnlock`…). Un plugin observa e opina; non muta por libre.

## 2. Os tres patróns de hook

A mesma regra implémentase tres veces, unha por familia de hook — e esa é a lección central:

```ts
install(engine, api) {
  // EXPLICA (compute*): modifica o resultado de canUnlock para que a
  // UI poida dicir POR QUE non se pode. Síncrono.
  api.registerHook('computeUnlockability', (nodeId, defaultResult) => {
    const enCurso = nodoEnCurso(engine)
    if (enCurso === null || enCurso === nodeId) return defaultResult
    if (!defaultResult.allowed) return defaultResult // xa hai outra razón
    return {
      allowed: false,
      reason: { gl: `Remata o que empezaches: "${enCurso}" está a medias` },
    }
  })

  // VETA (before*): devolver false cancela a operación — o motor
  // devolve err(OPERATION_CANCELLED_BY_HOOK). Pode ser async.
  api.registerHook('beforeUnlock', (nodeId) => {
    const enCurso = nodoEnCurso(engine)
    return enCurso === null || enCurso === nodeId
  })

  // REACCIONA (after*): notificación post-facto — log, analítica,
  // achievements. Xa non pode cancelar nada.
  api.registerHook('afterUnlock', (nodeId) => {
    api.log('info', `foco: "${nodeId}" desbloqueado — foco libre`)
  })
}
```

**Por que os dous lados?** `canUnlock` e `unlock` son camiños distintos. Se só vetas en `beforeUnlock`, a UI di "podes" e o clic falla en silencio; se só tocas `computeUnlockability`, a UI di "non podes" pero un `unlock()` directo pasa. Unha regra de verdade implementa **explicación e veto**.

## 3. O detector, co dato de verdade

```ts
function nodoEnCurso(engine: PluginEngineHandle): string | null {
  for (const node of engine.getTreeDef().nodes) {
    const progress = engine.getProgress(node.id)
    if (progress > 0 && progress < 100) return node.id
  }
  return null
}
```

Detalle que morde: "a medias" léese de **`progress`**, non de `state` — o motor non transita o estado gardado cando moves progreso ([o ciclo de vida dun nodo](../../contrato/ciclo-de-vida/) explica as dúas capas).

## 4. Instalar e usar

```ts
const engine = new TreeEngine(tree, { locale: 'gl' })
await engine.registerPlugin(createFocoPlugin())

engine.setProgress('letras', 60)          // exercicio a medias
engine.canUnlock('numeros')               // { allowed: false, reason: … }
await engine.unlock('numeros')            // err — vetado polo hook
engine.setProgress('letras', 100)         // rematado
await engine.unlock('numeros')            // ok — foco libre
```

Nota: para `setProgress`, o nodo declara `supportsProgress: true` e `progressSource: { type: 'manual' }`.

## 5. O test (os tutoriais tamén podrecen)

O exemplo leva un [test mínimo](https://github.com/fraga-labs/yggdrasil-forge/blob/main/examples/plugin-foco/__tests__/focoPlugin.test.ts) cos tres casos: sen foco todo flúe, con foco explica E veta, e ao rematar libérase. Corre en cada CI: se o motor cambia e rompe o tutorial, sabémolo.

## O mapa honesto dos hooks (1.x)

Cableados no motor: `beforeUnlock`/`afterUnlock`, `beforeLock`/`afterLock`, `beforeRespec`/`afterRespec`, `computeUnlockability` (en `canUnlock`) e, desde 17.9, `computeCost` — cableado por un **funil único** (`getEffectiveCostForTier`, tamén público para as UIs) que atravesan `canUnlock`, os cobros de `unlock` e os refunds de `lock`/`respec`. Contrato do refund: **recomputa co estado actual** — un hook determinista respecto de (nodo, rango) dá refunds exactos; un dependente de estado dá refunds ao valor actual, non ao histórico. Os erros dun hook non tiran o motor: captúranse e o fluxo continúa cos demais handlers.
