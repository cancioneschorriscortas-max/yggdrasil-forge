# BRIEFING — SUB-FASE 4.6 de Yggdrasil Forge

> Pega este documento no chat executor.
> **ÚLTIMA sub-fase da Fase 4.** Verificación formal de que core é
> SSR-safe (cumple §38 MASTER). **Cero código novo en `src/`**: a
> sub-fase é puramente aditiva (tests + docs). Inclúe **regression
> guard programático** que escanea src/ buscando usos de DOM globals.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts.** En `/tmp/ygg-exec/`. NUNCA na raíz. Rutas internas
`C:/Users/tajes/proxectos/yggdrasil-forge/...`.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con --force**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. **Tras 3.4 L1, 3.5
L2, 3.6.a L1, 4.3 L1**: calquera modificación fóra de §6 require
**ESCALAR ANTES DE APLICAR**.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 4.6 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 4.6 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao
principio. NON consolidar.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

---

## 1. IDENTIFICACIÓN

Sub-fase **4.6** de Yggdrasil Forge. **ÚLTIMA da Fase 4** (Layout
Engine). **Verificación formal de SSR-safety**, sen código novo en
src/.

**Pezas**:

1. **Smoke tests SSR** para Layout Engine (4.1-4.5).
2. **Smoke tests SSR** para pezas core "puras" (TreeEngine,
   ProgressManager, StatComputer, EffectsRunner, TimeManager,
   DependencyGraph, AuditLogger, Reconciler).
3. **Regression guard programático**: escanea `packages/core/src/`
   buscando usos de `window.`, `document.`, `navigator.`.
4. **`docs/SSR.md`**: guía documental sobre SSR-safety.

**Cero código novo en `src/`**. **Cero ErrorCodes**. **Cero
modificación de pezas existentes**.

---

## 2. CONTEXTO MÍNIMO

§38 MASTER prescribe:
```typescript
// @yggdrasil-forge/react/server (RSC-safe):
export { SkillTreeStatic, computeLayout, serializeForClient }
```

**Iso significa**: o paquete `@yggdrasil-forge/react/server` (Fase 7)
expón **`computeLayout`** como RSC-safe. **Para iso ser viable**, o
core onde vive `computeLayout` ten que ser **completamente SSR-safe**.
**A 4.6 verifica que xa o é**.

**Auditoría previa do director** (sobre commit `e31ec1f`):
- **Cero usos de `window.`, `document.`, `navigator.`** en
  `packages/core/src/` nin en `packages/common/src/`.
- **Storage adapters** usan IoC con `globalThis.localStorage` etc.
  como **default opcional**: importables en SSR sen crash; runtime
  falla só se se chama get/set sen storage inxectado.
- **Vitest config root** xa usa `environment: 'node'` por defecto;
  **todos os 1196 tests xa corren en Node puro**.

**MASTER prescribe directorio `__tests__/ssr/`** no esquema raíz; **a
4.6 implementa como `packages/core/__tests__/ssr/`** (adaptación á
estructura monorepo real).

**Esta sub-fase NON crea o paquete @yggdrasil-forge/react/server**.
Iso é Fase 7. A 4.6 só **verifica que o core poderá ser usado por ese
paquete** sen problemas SSR.

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `e31ec1f` (PathBuilder + BoundsCalculator
  + QuadTree 4.5).
- 1196 tests core + 60 common + 171 storage = ~1427 monorepo limpo.
- Lint 0/0, typecheck 20/20.
- **Auditoría SSR-safety previa**: confirmada (§2).
- **Vitest config**: `environment: 'node'` por defecto (no `vitest.config.ts`
  raíz).
- DT-9, DT-11, DT-12, DT-14, DT-15, DT-16, DT-17, DT-18 abertas, non
  bloqueantes.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Crear `packages/core/__tests__/ssr/` con 6 ficheiros de tests SSR
(smoke + funcionais) que verifiquen que as pezas críticas de core
(Layout Engine 4.1-4.5 + TreeEngine + ProgressManager + StatComputer
+ EffectsRunner + TimeManager + DependencyGraph + AuditLogger +
Reconciler) **funcionan en Node puro sen DOM**, máis un **regression
guard programático** que escanea `packages/core/src/` buscando usos
prohibidos de `window`/`document`/`navigator`, máis `docs/SSR.md`
guía documental. **Cero código novo en `src/`**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas)

### 5.1 — Estructura de ficheiros

```
packages/core/__tests__/ssr/
├── layouts.ssr.test.ts         ← NOVO: 4.1-4.5 (LayoutEngine + 3 layouts + Path/Bounds/Quad)
├── engine.ssr.test.ts          ← NOVO: TreeEngine + ProgressManager + StatComputer
├── effects-time.ssr.test.ts    ← NOVO: EffectsRunner + TimeManager
├── graph-audit.ssr.test.ts     ← NOVO: DependencyGraph + AuditLogger + Reconciler
└── no-dom-imports.ssr.test.ts  ← NOVO: regression guard programático

docs/
└── SSR.md                       ← NOVO: guía documental
```

**Decisión**:
- **5 ficheiros de test agrupados por área lóxica** (cero un ficheiro
  por peza; cero un só ficheiro monolítico). **Equilibrio entre
  granularidade e xestión**.
- **Sufixo `.ssr.test.ts`** identifica os tests visualmente (vitest
  recolle igualmente por patron `*.test.ts`).
- **`docs/SSR.md`** no directorio raíz `docs/`, **non** dentro do
  paquete (é documentación do proxecto, non da API).

### 5.2 — Naming pattern `.ssr.test.ts`

**Decisión**: usar `.ssr.test.ts` como sufixo. **Razón**:
- Vitest config inclúe `*.{test,spec}.ts`: estes ficheiros casan e
  execútanse normalmente.
- Identificación visual clara: `grep "ssr.test"` lista todos.
- Permite no futuro filtrado se procedese (`vitest --filter "ssr"`).

**Cero novo include pattern no vitest.config**. **Cero modificación
de tsconfig**. **Cero modificación de turbo.json**.

### 5.3 — layouts.ssr.test.ts (~8 tests)

Verifica que as pezas da Fase 4 funcionan en Node:

```ts
import { describe, expect, it } from 'vitest'
import {
  LayoutEngineRegistry,
  IdentityLayout,
  RadialLayout,
  TreeLayout,
  computeLayout,
  buildPaths,
  computeBounds,
  QuadTree,
} from '../../src/index.js'
import type { TreeDef } from '../../src/index.js'

describe('SSR: Layout Engine completo en Node sen DOM', () => {
  it('importa todas as pezas sen crash', () => {
    expect(LayoutEngineRegistry).toBeDefined()
    expect(IdentityLayout).toBeDefined()
    expect(RadialLayout).toBeDefined()
    expect(TreeLayout).toBeDefined()
    expect(computeLayout).toBeDefined()
    expect(buildPaths).toBeDefined()
    expect(computeBounds).toBeDefined()
    expect(QuadTree).toBeDefined()
  })

  it('IdentityLayout: compute en Node devolve LayoutResult correcto', () => {
    const treeDef: TreeDef = createSimpleTreeDef('custom')
    const engine = new IdentityLayout()
    const result = engine.compute(treeDef)
    expect(result.ok).toBe(true)
  })

  it('RadialLayout: compute en Node devolve LayoutResult correcto', () => {
    const treeDef: TreeDef = createSimpleTreeDef('radial', { radius: 100 })
    const engine = new RadialLayout()
    const result = engine.compute(treeDef)
    expect(result.ok).toBe(true)
  })

  it('TreeLayout: Buchheim en Node devolve LayoutResult correcto', () => {
    const treeDef: TreeDef = createSimpleTreeDef('tree')
    const engine = new TreeLayout()
    const result = engine.compute(treeDef)
    expect(result.ok).toBe(true)
  })

  it('computeLayout via registry en Node', () => {
    const registry = new LayoutEngineRegistry()
      .register(new IdentityLayout())
    const treeDef = createSimpleTreeDef('custom')
    const result = computeLayout(treeDef, registry)
    expect(result.ok).toBe(true)
  })

  it('buildPaths cos 5 estilos en Node', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new IdentityLayout()
    const layoutResult = engine.compute(treeDef)
    if (!layoutResult.ok) throw new Error('layout failed')

    for (const style of ['straight', 'diagonal-vertical', 'diagonal-horizontal', 'radial', 'orthogonal'] as const) {
      const result = buildPaths(layoutResult.value, style)
      expect(result.edges.size).toBeGreaterThanOrEqual(0)
    }
  })

  it('computeBounds en Node', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new IdentityLayout()
    const layoutResult = engine.compute(treeDef)
    if (!layoutResult.ok) throw new Error('layout failed')

    const bounds = computeBounds(layoutResult.value, { padding: 10 })
    expect(bounds).toBeDefined()
    expect(typeof bounds.minX).toBe('number')
  })

  it('QuadTree en Node con range/nearest queries', () => {
    const treeDef = createSimpleTreeDef('custom')
    const engine = new IdentityLayout()
    const layoutResult = engine.compute(treeDef)
    if (!layoutResult.ok) throw new Error('layout failed')

    const quad = QuadTree.fromLayoutResult(layoutResult.value)
    expect(quad.size()).toBeGreaterThanOrEqual(0)

    const inRange = quad.queryRange({ minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 })
    expect(Array.isArray(inRange)).toBe(true)

    const nearest = quad.queryNearest({ x: 0, y: 0 })
    expect(typeof nearest === 'string' || nearest === undefined).toBe(true)
  })
})

function createSimpleTreeDef(layoutType: string, extras: Record<string, unknown> = {}): TreeDef {
  // Helper que crea unha TreeDef mínima con 3 nodos lineares.
  // Verificar forma exacta de TreeDef en T0.
  return {
    // ... contido segundo TreeDef shape verificado en T0
  } as TreeDef
}
```

**T0 verifica forma exacta de TreeDef**.

### 5.4 — engine.ssr.test.ts (~6 tests)

Verifica que TreeEngine, ProgressManager, StatComputer funcionan en
Node. **Estes son pezas pesadas que orquestan o resto**; smoke test +
1-2 verificacións funcionais.

```ts
describe('SSR: Engine core en Node sen DOM', () => {
  it('importa TreeEngine + ProgressManager + StatComputer sen crash', () => {
    // ... imports + checks
  })

  it('TreeEngine: construir + getTreeDef en Node', async () => {
    // Verificar que construír TreeEngine cunha config simple funciona.
    // (T0 verifica API exacta do constructor.)
  })

  it('ProgressManager: smoke', () => {
    // Verificar construción.
  })

  it('StatComputer: smoke', () => {
    // Verificar construción.
  })

  it('TreeEngine: unlock dunha noda simple en Node', async () => {
    // Test funcional mínimo: configura tree con 2 nodos, desbloquea o 2º.
    // Verificar que canUnlock + unlock funcionan sen DOM.
  })

  it('TreeEngine: getAuditLog devolve entries sen crash', () => {
    // ... verificar audit log
  })
})
```

**T0 verifica que TreeEngine ten construtor accesible sen DOM**.

### 5.5 — effects-time.ssr.test.ts (~4 tests)

```ts
describe('SSR: EffectsRunner + TimeManager en Node sen DOM', () => {
  it('importa EffectsRunner + TimeManager sen crash', () => { ... })
  it('EffectsRunner: run cun effects vacío en Node', () => { ... })
  it('TimeManager: usa now inxectada (cero Date.now directo no test)', () => {
    // Crea TimeManager cun now() mockeable: now = () => 1000.
    // Verifica que TimeManager non chama directamente Date.now.
  })
  it('TimeManager: smoke con expiresAt', () => { ... })
})
```

### 5.6 — graph-audit.ssr.test.ts (~4 tests)

```ts
describe('SSR: DependencyGraph + AuditLogger + Reconciler en Node sen DOM', () => {
  it('importa todas tres sen crash', () => { ... })
  it('DependencyGraph: construír + getRoots/getOutgoing en Node', () => { ... })
  it('AuditLogger: append + getAuditLog en Node (Date.now é Node-safe)', () => { ... })
  it('Reconciler: reconcile cun diff trivial en Node', () => { ... })
})
```

### 5.7 — no-dom-imports.ssr.test.ts (regression guard, ~4 tests)

**O test máis importante da sub-fase**. Escanea programáticamente
`packages/core/src/` buscando usos prohibidos de DOM globals.

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Determinar a raíz src/ a partir do __dirname do propio test.
// __tests__/ssr/no-dom-imports.ssr.test.ts → ../../src/
const HERE = fileURLToPath(new URL('.', import.meta.url))
const SRC_ROOT = join(HERE, '..', '..', 'src')

// Patróns prohibidos. Cazan acceso a propiedade (window.X), cero
// strings ou comentarios que conteñan a palabra.
//
// Razón do patrón: queremos detectar `window.localStorage` ou
// `document.getElementById` pero NON `// El comentario fala de window.`
// Para ese efecto, parseamos liña por liña tratando de excluír
// liñas que comecen con `//` ou `*` (comentarios), e strings
// con comilla simple/dobre/backtick.
//
// Aceptable false-positive: cero conta en strings literais que
// conteñan a palabra. Verifícase manualmente que cero existe (auditoría
// previa do director confirmou cero usos reais).

const BANNED_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'window', regex: /\bwindow\s*\./ },
  { name: 'document', regex: /\bdocument\s*\./ },
  { name: 'navigator', regex: /\bnavigator\s*\./ },
  { name: 'localStorage (direct)', regex: /(?<!globalThis\.)\blocalStorage\s*\./ },
  { name: 'sessionStorage (direct)', regex: /(?<!globalThis\.)\bsessionStorage\s*\./ },
]

function walkTsFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      results.push(...walkTsFiles(full))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.type-test.ts')) {
      results.push(full)
    }
  }
  return results
}

function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim()
  return trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

describe('SSR regression guard: cero uso de DOM globals en packages/core/src/', () => {
  it('walkTsFiles encontra ficheiros TypeScript en src/', () => {
    const files = walkTsFiles(SRC_ROOT)
    expect(files.length).toBeGreaterThan(10) // Sanity: core ten >10 ficheiros
  })

  it('cero ficheiro de src/ accede a window.* (excepto comentarios)', () => {
    const violations: string[] = []
    for (const file of walkTsFiles(SRC_ROOT)) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        if (isCommentOrEmpty(line)) return
        if (/\bwindow\s*\./.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`)
        }
      })
    }
    expect(violations).toEqual([])
  })

  it('cero ficheiro de src/ accede a document.* (excepto comentarios)', () => {
    // ... patron análogo para document
  })

  it('cero ficheiro de src/ accede a navigator.* (excepto comentarios)', () => {
    // ... patron análogo para navigator
  })
})
```

**Decisión chave**:
- **Test filtra comentarios** por liña (cero parse AST; suficiente
  para a maioría dos casos).
- **Permite `globalThis.localStorage`**: o `(?<!globalThis\.)` no
  patrón evita match. Storage NON está en core, só en storage
  package, polo que **nunca debería disparar**.
- **Lee ficheiros .ts excluindo .test.ts e .type-test.ts**: cero
  contar tests.
- **Sanity check inicial**: walkTsFiles encontra >10 ficheiros (cero
  vai por directorio incorrecto).

### 5.8 — docs/SSR.md (~80 liñas)

Guía documental sobre SSR-safety de Yggdrasil:

```markdown
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
const fakeStorage = { getItem: () => null, setItem: () => {}, ... }
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
```

**Idioma**: galego/español (estilo do proxecto). **Cero markdown
complexo** (taboas, etc.). **Cero badges**. **Práctico**.

### 5.9 — Cero modificación de pezas existentes

**Cero modificación** de:
- Calquera ficheiro en `packages/core/src/`.
- Calquera ficheiro en `packages/common/src/`.
- Calquera ficheiro en `packages/storage/src/`.
- Vitest config (root ou per-package).
- tsconfig, tsup, turbo.json, biome.json.
- Tests existentes 4.1-4.5.

**SI se crea**:
- 5 ficheiros de test en `packages/core/__tests__/ssr/`.
- 1 ficheiro `docs/SSR.md` na raíz `docs/`.

### 5.10 — Cero ErrorCodes novos

Cero modificación de common.

### 5.11 — Cobertura

**Cero impacto na cobertura existente**: a 4.6 cero engade código
novo en `src/`, polo que cero hai liñas novas a cubrir. **Os tests
SSR engaden cobertura indirectamente** ás pezas existentes (chámanas
en escenarios novos), polo que **posiblemente sube lixeiramente** a
cobertura global de core. **Cero presión**: a baseline 97.91%
mantense ou mellora.

### 5.12 — Tamaño previsto

- 5 ficheiros de test: ~250-350 liñas totais.
- `docs/SSR.md`: ~80 liñas.
- **Total**: ~330-430 liñas.

### 5.13 — Vitest config NON se modifica

**Cero engadir patrón** `*.ssr.test.ts` específico ao include. **O
patrón `*.test.ts` xa colle os ficheiros novos**. **Cero risco de 3.4
L1**.

### 5.14 — Cero turbo.json modification

`pnpm test` xa corre todos os tests do core via turbo. **Cero novo
script necesario**.

### 5.15 — Determinismo

Os tests SSR **non deben depender** de:
- `Date.now()` directo (mock se TimeManager se proba).
- `Math.random()`.
- Filesystem fora de `packages/core/src/` (regression guard limítase
  a este path).

---

## 6. UBICACIÓN E ESTRUTURA

Modificacións:

**Código:** cero (cero ficheiros en src/ tocados).

**Tests + docs:**
- `packages/core/__tests__/ssr/layouts.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/engine.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/effects-time.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/graph-audit.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/no-dom-imports.ssr.test.ts` (NOVO)
- `docs/SSR.md` (NOVO; verificar se directorio `docs/` xa existe)

---

## 7. TAREFAS (orde estrita)

### T0 — Setup + sanity + verificacións

1. `pnpm install` + `pnpm --filter @yggdrasil-forge/common build`.
   Confirma 1196 tests core + 60 common + 171 storage con `--force`.

2. **Verifica forma exacta de TreeDef + NodeDef + EdgeDef** (para os
   helpers de test):
   ```
   grep -B1 -A10 "interface TreeDef\|interface NodeDef\b\|interface EdgeDef\b" packages/core/src/types/*.ts | head -50
   ```

3. **Verifica API exacta de TreeEngine constructor**:
   ```
   grep -B1 -A8 "class TreeEngine\|constructor" packages/core/src/engine/TreeEngine.ts | head -30
   ```
   Confirma como se constrúe TreeEngine cunha config mínima.

4. **Verifica que `docs/` directorio existe**:
   ```
   ls -la docs/
   ```
   Se non existe, crear con `mkdir -p docs/`.

5. **Verifica auditoría SSR-safety**: o grep do regression guard
   debe dar **cero resultados** antes de empezar:
   ```
   grep -rn "window\.\|document\.\|navigator\." packages/core/src/ | grep -v "^[^:]*://" | head
   ```
   Espera cero. **Se hai algún**, escalar (a 4.6 non pode empezar
   se a auditoría falla).

### T1 — Helper común para tests SSR (opcional, decisión do executor)

Opcional: crear `packages/core/__tests__/ssr/_helpers.ts` cunha
función `createSimpleTreeDef(layoutType, extras?)`. **Cero
obligatorio**: pode duplicarse en cada teste se aporta lexibilidade.

**Se se crea**, cero export desde index (é privado dos tests).

### T2 — layouts.ssr.test.ts (5.3)

Crear `packages/core/__tests__/ssr/layouts.ssr.test.ts` cos ~8 tests.

Verificación: `pnpm turbo run test --filter=@yggdrasil-forge/core
--force` pasa con 1196 + 8 = 1204 tests.

### T3 — engine.ssr.test.ts (5.4)

Crear `packages/core/__tests__/ssr/engine.ssr.test.ts` cos ~6 tests.

Verificación: 1204 + 6 = 1210 tests.

### T4 — effects-time.ssr.test.ts (5.5)

Crear `packages/core/__tests__/ssr/effects-time.ssr.test.ts` cos ~4
tests.

Verificación: 1210 + 4 = 1214 tests.

### T5 — graph-audit.ssr.test.ts (5.6)

Crear `packages/core/__tests__/ssr/graph-audit.ssr.test.ts` cos ~4
tests.

Verificación: 1214 + 4 = 1218 tests.

### T6 — no-dom-imports.ssr.test.ts (5.7)

Crear `packages/core/__tests__/ssr/no-dom-imports.ssr.test.ts` cos
~4 tests. **Test máis importante da sub-fase**.

**Calquera dúbida sobre os patróns regex ou exclusión de comentarios
→ ESCALAR**. **Cero inventar**.

Verificación: 1218 + 4 = 1222 tests. **Test PASA** (cero violacións
no core, comprobado polo director en auditoría previa).

### T7 — docs/SSR.md (5.8)

Crear `docs/SSR.md` co contido de §5.8 (~80 liñas).

### T8 — Verificación post-T7

- Typecheck 20/20.
- `pnpm turbo run test --filter=@yggdrasil-forge/core --force` pasa.
- ~1222 tests pasan (1196 + 26 novos aproximadamente).
- 60 common intactos.
- 171 storage intactos.

### T9 — Cobertura

`pnpm --filter @yggdrasil-forge/core run test:coverage`. Verifica:
- Global core: ≥97.91% (baseline; **non baixa**, posiblemente sobe
  lixeiramente porque os tests SSR exercitan máis ramas das pezas
  existentes).

### T10 — Verificación + grep + commit + push

```
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
pnpm typecheck
pnpm turbo run test --force
grep -rnE "(unknown|valor-invalido|placeholder|TODO|FIXME|XXX)" \
  packages/core/__tests__/ssr/ docs/SSR.md
pnpm test
```

**Nota sobre `unknown`**: cero esperado en tests SSR.

- Changeset **patch** para `@yggdrasil-forge/core` (cero novo
  comportamento, só verificación adicional).
- CHANGELOG: **nova cabeceira `## [Unreleased]` ao principio** (DT-12).
  Contido:
  ```
  ### Added
  - SSR verification: directorio `packages/core/__tests__/ssr/` con
    5 ficheiros de tests SSR (~26 tests):
    - `layouts.ssr.test.ts`: Layout Engine completo (4.1-4.5) en
      Node sen DOM.
    - `engine.ssr.test.ts`: TreeEngine + ProgressManager +
      StatComputer.
    - `effects-time.ssr.test.ts`: EffectsRunner + TimeManager.
    - `graph-audit.ssr.test.ts`: DependencyGraph + AuditLogger +
      Reconciler.
    - `no-dom-imports.ssr.test.ts`: **regression guard
      programático** que escanea `packages/core/src/` buscando
      usos prohibidos de `window.`/`document.`/`navigator.`.
  - `docs/SSR.md`: guía documental sobre SSR-safety, con exemplos
    de uso en Next.js RSC, Astro, Node puro.

  ### Note
  - Sub-fase 4.6 **ÚLTIMA da Fase 4**. Cero código novo en `src/`.
    Verifica formalmente o cumprimento de MASTER §38 ("@yggdrasil-
    forge/react/server RSC-safe"). Core era SSR-safe por construción
    desde Fase 1; esta sub-fase engade tests explícitos e
    documentación.
  - Regression guard: o test `no-dom-imports.ssr.test.ts` corre en
    cada `pnpm test` e bloqueará calquera regresión futura que
    introduza DOM APIs en core.
  ```

### T11 — Commit + push

Commit Conventional:
`test(core): add SSR verification tests + docs (sub-phase 4.6)`.
Push directo a `origin/main` (base `e31ec1f`). Reporta hash.

### Ficheiros esperados no diff final:
- `packages/core/__tests__/ssr/layouts.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/engine.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/effects-time.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/graph-audit.ssr.test.ts` (NOVO)
- `packages/core/__tests__/ssr/no-dom-imports.ssr.test.ts` (NOVO)
- `docs/SSR.md` (NOVO)
- `.changeset/*.md` (NOVO)
- `CHANGELOG.md` (modificado)
- (opcional) `packages/core/__tests__/ssr/_helpers.ts` (NOVO se T1)

**NON deben aparecer cambios en**:
- Calquera ficheiro en `packages/core/src/`.
- Calquera ficheiro en `packages/common/`.
- Calquera ficheiro en `packages/storage/`.
- `tsconfig.base.json`, `tsup.config.ts`, `vitest.config.ts`,
  `turbo.json`, `biome.json`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Tests existentes 4.1-4.5 ou anteriores (cero modificación).

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

Comentarios **castelán/galego** (estilo do proxecto). Marcadores
`// ── INICIO/FIN ──` opcional en tests (estes son ficheiros novos
de tests; cero require markers exhaustivos). 2 espazos, comilla
simple, sen `;`, trailing commas, máx 100 cols, UTF-8 LF. TS strict,
**cero `any`**. NON desactives Biome.

**Tests SSR estilo**: imports explícitos (cero `import * as`),
descripcións claras en galego/inglés mesturadas.

**docs/SSR.md**: markdown estándar, exemplos de código en bloques
```typescript, prosa breve.

---

## 9. QUE NON FACER

- ❌ Modificar calquera ficheiro en `packages/core/src/` (5.9).
- ❌ Modificar `packages/common/` ou `packages/storage/` (5.9).
- ❌ Modificar `vitest.config.ts` (5.13).
- ❌ Modificar `tsconfig.base.json`, `tsup.config.ts`, `turbo.json`,
  ou outros globais (5.9, lección 3.4 L1).
- ❌ Engadir ErrorCodes (5.10).
- ❌ Crear paquete novo `@yggdrasil-forge/core/server` ou similar
  (decisión do director: diferido a Fase 7).
- ❌ Implementar subpath exports (DT-14 diferido).
- ❌ Engadir polyfills para DOM en core (cero necesario; pezas xa
  son SSR-safe).
- ❌ Modificar AuditLogger para que use `now()` inxectada (decisión
  do director: documentado como limitación en docs/SSR.md, pendente
  refactor futuro).
- ❌ Modificar Vitest config para crear `environment: 'jsdom'`
  test específico (innecesario; tests SSR queren `node`
  precisamente).
- ❌ Importar `happy-dom` ou `jsdom` (defeating the purpose).
- ❌ Refactorizar pezas non listadas.
- ❌ Modificar o CHANGELOG existente (DT-12).
- ❌ Placeholders / `any`.
- ❌ Inventar patróns regex no regression guard distintos de §5.7.

---

## 10. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 4.6 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base e31ec1f)
✅ 5 ficheiros de tests SSR en packages/core/__tests__/ssr/
   - layouts.ssr.test.ts: 4.1-4.5 en Node
   - engine.ssr.test.ts: TreeEngine + Progress + Stats
   - effects-time.ssr.test.ts: Effects + Time
   - graph-audit.ssr.test.ts: Graph + Audit + Reconciler
   - no-dom-imports.ssr.test.ts: REGRESSION GUARD programático
✅ docs/SSR.md: guía documental SSR-safety (~80 liñas)
✅ Cero código novo en src/ (sub-fase puramente aditiva)
✅ Cero modificación de pezas existentes
✅ Cero modificación de common/storage/tsconfig/tsup/vitest.config
✅ Cero ErrorCodes novos
✅ T0.2 TreeDef shape verificado: <forma>
✅ T0.5 auditoría grep window/document/navigator: cero resultados
   (core era xa SSR-safe; regression guard agora bloqueará
   regresións futuras)
✅ Tests: <N> pasan en core (<delta> novos)
   - <X> layouts SSR
   - <Y> engine SSR
   - <Z> effects-time SSR
   - <W> graph-audit SSR
   - <V> no-dom-imports regression guard
✅ Cobertura: <X%> (baseline 97.91%; <subiu/mantense>)
✅ Typecheck: 20/20 | Lint: 0/0
✅ GREP ANTI-PLACEHOLDER (literal): <saída>
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase ÚLTIMA da Fase 4. Cero código novo en src/.
   - Fase 4 completa: 6 sub-fases (4.1 → 4.6) pechadas.
   - AuditLogger usa Date.now() directo (documentado en docs/SSR.md
     como limitación pendente refactor; cero impacto SSR).
   - Regression guard exclúe comentarios (filtrado liña a liña).
✅ Changeset patch (core) + nova [Unreleased]
✅ git status pre-commit confirmou ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO. FASE 4 PECHADA. Pendente decisión do director:
hixiene MASTER + Fase 5 (Sub-trees + Federation).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 4.6. Última sub-fase Fase 4. Verificación formal de
SSR-safety + regression guard. Cero código novo en src/.*
