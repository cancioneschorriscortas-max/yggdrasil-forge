# SSR (Server-Side Rendering) Compatibility

Yggdrasil Forge core (`@yggdrasil-forge/core`) é **completamente
SSR-safe**. Pode usarse en:

- React Server Components (RSC) sen `'use client'`.
- Next.js App Router server components.
- Astro server-only islands.
- Calquera entorno Node.js puro (CLI, workers, etc.).

## Que significa "SSR-safe"

Significa que **cero peza de core accede a APIs browser-only**
(`window`, `document`, `navigator`). Todas as funcións son puras ou
usan inversión de control para dependencias externas.

## Verificación automatizada

Un test regression guard
(`packages/core/__tests__/ssr/no-dom-imports.ssr.test.ts`) escanea
todo `packages/core/src/` en cada execución de tests, garantindo que
ningún cambio introduce accidentalmente APIs DOM.

## Layout Engine en SSR

```typescript
// Server component (Next.js, sen 'use client')
import {
  LayoutEngineRegistry,
  RadialLayout,
  computeLayout,
  buildPaths,
  QuadTree,
} from '@yggdrasil-forge/core'

export default function StaticTree({ treeDef }) {
  const registry = new LayoutEngineRegistry()
    .register(new RadialLayout())

  const layoutResult = computeLayout(treeDef, registry)
  if (!layoutResult.ok) return <div>Error</div>

  const enriched = buildPaths(layoutResult.value, 'radial')
  const quadtree = QuadTree.fromLayoutResult(enriched)

  // Renderiza SVG estático (cero hooks, cero state).
  return <svg>...</svg>
}
```

## TreeEngine en SSR

TreeEngine pode construírse e consultarse no server. **Para
mutacións** (unlock, lock, etc.), considere se a operación debe
executarse server-side ou cliente-side segundo o seu modelo de datos.

## Storage en SSR

Os adaptadores `@yggdrasil-forge/storage` usan **inversión de
control**: pasan `localStorage` / `indexedDB` opcionais no
constructor. **En Node puro**, debe inxectar un mock ou unha
implementación in-memory:

```typescript
// Node puro: usar MemoryStorage (cero DOM)
import { MemoryStorage } from '@yggdrasil-forge/storage'
const storage = new MemoryStorage()

// Ou inxectar un fake:
import { LocalStorageAdapter } from '@yggdrasil-forge/storage'
const fakeStorage = { getItem: () => null, setItem: () => {} }
const adapter = new LocalStorageAdapter({ storage: fakeStorage })
```

## Limitacións coñecidas

- **`@yggdrasil-forge/react`** (Fase 7, próximo): conterá `'use
  client'` para hooks reactivos. **Para uso server-only**, exporta
  `@yggdrasil-forge/react/server` con APIs sen hooks.
- **TimeManager** acepta `now: () => number` inxectable: en
  produción adoita ser `Date.now`; en SSR ou tests pode mockearse.
- **AuditLogger** chama `Date.now()` directo. Cero problema SSR
  (Date.now existe en Node) pero **non é mockeable**; pendente
  inxección no futuro.

## Próximos pasos

- Fase 7: `@yggdrasil-forge/react/server` con `SkillTreeStatic` +
  `serializeForClient` segundo §38 MASTER.
