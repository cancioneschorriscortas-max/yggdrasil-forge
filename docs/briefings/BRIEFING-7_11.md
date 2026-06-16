# BRIEFING — SUB-FASE 7.11 de Yggdrasil Forge

> Pega este documento no chat executor.
> **DÉCIMA PRIMEIRA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react` o compoñente público
> **`SkillTreeErrorBoundary`** — class component (única forma de
> implementar error boundaries en React 19) que captura erros nos
> seus descendants e renderiza un `fallback` UI configurable.
>
> **API**:
> - `fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode)`
>   — render prop ou nodo estático.
> - `onError?: (error: Error, errorInfo: ErrorInfo) => void` —
>   callback de logging.
> - `children: ReactNode`.
>
> **'use client'** necesario (componentDidCatch require client-side
> execution). Polo tanto **NON expoñido en `/server`** entry point.
>
> **Cero modificación de calquera compoñente, módulo, hook ou test
> existente**. Compoñente novo aislado + exports en `index.ts` +
> `headless.ts`.
>
> 7.12 (tests visuais + a11y + SSR con Playwright + jest-axe)
> DIFERIDO.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.11 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.11 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: SkillTreeErrorBoundary.tsx chega a **100/100/100/100**.

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**: Cero modificación de calquera
ficheiro existente en `packages/react/src/` ou
`packages/react/__tests__/` salvo:
- `src/index.ts` (engadir 2 exports).
- `src/headless.ts` (engadir 2 exports).

**Tódolos 97 tests existentes deben pasar intactos**.

**0.14 — Tests con erros deliberados**: os tests novos lanzarán erros
intencionalmente nun helper `ThrowingComponent`. **Iso provoca que
React e jsdom impriman warnings/errores a `console.error`**. **Os
tests novos DEBEN silenciar `console.error`** con
`vi.spyOn(console, 'error').mockImplementation(() => {})` no
`beforeEach` ou no propio test. **Restaurar con `vi.restoreAllMocks()`
no `afterEach`**.

**0.15 — `'use client'` para class component**: `componentDidCatch`
e `getDerivedStateFromError` requiren client-side execution. **Cero
exposición do SkillTreeErrorBoundary en `/server` entry point**.
Compatibilidade RSC mantida indirectamente (consumidor pode envolver
SkillTree client dentro de SkillTreeErrorBoundary; ambos teñen 'use
client').

---

## 1. IDENTIFICACIÓN

Sub-fase **7.11** de Yggdrasil Forge. **DÉCIMA PRIMEIRA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (3 grupos)**:

**Grupo A — Compoñente público novo**:
1. **`SkillTreeErrorBoundary`** (NOVO): class component con
   `getDerivedStateFromError` + `componentDidCatch` + `reset()`
   method. **`'use client'`** primeira liña.

**Grupo B — Exports**:
2. **`src/index.ts`** (MODIFICADO): engadir export do compoñente +
   tipo de props.
3. **`src/headless.ts`** (MODIFICADO): igual.

**Grupo C — Tests**:
4. **`__tests__/SkillTreeErrorBoundary.test.tsx`** (NOVO): ~7 tests.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- **Calquera outro ficheiro** en `packages/react/src/` ou
  `packages/react/__tests__/` salvo os 2 modificados arriba.
- `src/server.ts` (cero exposición; require 'use client').
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos** (cero modificación de packages/common/).
Cero deps de npm engadidas.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `e4c594e`, verificada
empíricamente en clone independente)**.

### MASTER §45 (literal)

```
## 45. REACT ERROR BOUNDARIES

<SkillTreeErrorBoundary fallback={<Fallback />}>
  <SkillTree engine={engine} />
</SkillTreeErrorBoundary>
```

### Uso end-to-end no MASTER (liña 2348)

```tsx
import { SkillTree, SkillTreeErrorBoundary, ThemeProvider } from '@yggdrasil-forge/react'
// ...
return (
  <SkillTreeErrorBoundary fallback={<Fallback />}>
    <ThemeProvider theme={oberon}>
      <SkillTree engine={engine} ... />
    </ThemeProvider>
  </SkillTreeErrorBoundary>
)
```

**Confirmacións**:
- Importado desde **root entry** (`@yggdrasil-forge/react`).
- `fallback` como prop principal (ReactNode).
- Envolve calquera children (típicamente ThemeProvider+SkillTree).

**Decisión arquitectónica do Director sobre API estendida**:

A spec MASTER mostra **`fallback={<Fallback />}`** (ReactNode estático).
**O Director estende a API** con dúas adicións estándares da industria
(react-error-boundary, Next.js):

1. **`fallback` pode ser function** (render prop) que recibe `error`
   e `reset` — útil para mostrar mensaxe de erro detallada + botón
   de retry.
2. **`onError` callback opcional** — útil para logging (Sentry,
   console, etc.).

**Razón**: o exemplo MASTER cubre o caso simple; o Director engade
sin custo significativo o caso máis útil que require o ecosistema
React moderno. **Cero rotura** do exemplo MASTER (ReactNode estático
segue funcionando como caso por defecto).

### Cero class components en packages/react ata 7.11

Verificado empíricamente: `grep -rn "extends Component" packages/react/src/`
→ cero matches. **SkillTreeErrorBoundary é o primeiro class component
do paquete**.

**Implicacións**:
- React 19 segue soportando class components (deprecation potencial
  no futuro, pero estable nesta release).
- **Únicaforma de implementar error boundaries**: cero hooks-equivalent
  para `getDerivedStateFromError` + `componentDidCatch`.

### Cero ErrorCodes específicos de render

`grep -E "RENDER_|YGG_E0[0-9]+.*render" packages/common/src/errors/codes.ts`
→ cero matches. **Cero modificación de packages/common/**. O boundary
captura **calquera Error** (típo standard de JavaScript), incluído
`YggdrasilError` se algún descendant o lanza.

### React 19 + tests con erro deliberado

**Comportamento coñecido** (anotar no briefing):
- En **dev mode**, React **renderiza dúas veces** unha árbore que
  lanza erro, para mellor stack trace. Polo tanto
  `componentDidCatch` pode chamarse **dúas veces** en dev.
- **Os tests con `npm test` adoitan correr en production mode**, polo
  que **probablemente cero duplicación**. Pero **non garantido**.

**Solución conservativa**: tests con `onError` callback deben
verificar `.toHaveBeenCalledWith(...)` (que o handler foi chamado
con eses argumentos) en lugar de `.toHaveBeenCalledTimes(1)` (que
**pode fallar en dev mode**).

### Tests previos con `vi.spyOn(console, 'error')`?

Verificado empíricamente: cero tests previos teñen erros deliberados.
**Os tests novos de 7.11 son os primeiros**.

**Patrón a aplicar**:
```ts
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})
```

Isto silencia o ruído de React/jsdom que se imprime tras un erro
capturado, mantendo o output dos tests limpo.

### Estado scaffold tras 7.10

```
packages/react/src/
├── SkillNode.tsx                  ('use client' desde 7.10)
├── SkillTree.tsx
├── SkillEdge.tsx
├── MeshOverlay.tsx
├── SVGRenderer.tsx                ('use client' desde 7.4)
├── ThemeProvider.tsx              ('use client' desde 7.4)
├── SkillTreeWithDefaultTheme.tsx  ('use client' desde 7.4)
├── SkillTreeAnnouncer.tsx         ('use client' desde 7.7)
├── SkillTreeStatic.tsx
├── SkillTreeErrorBoundary.tsx     (NOVO en 7.11: 'use client')
├── serializeForClient.ts
├── svg-helpers.ts
├── animations.ts
├── createDefaultLayoutRegistry.ts
├── theme-types.ts
├── themes/minimal.ts
├── headless.ts                    (MODIFICADO: +2 exports)
├── index.ts                       (MODIFICADO: +2 exports)
├── server.ts                      (cero modif)
└── hooks/                         (cero modif)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `e4c594e` (long press 7.10).
- 1523 core + 60 common + 193 storage + 97 react = ~1873 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- 8 compoñentes públicos + 1 wrapper interno + 4 hooks + 4 módulos
  internos + 3 entry points.
- Cobertura post-7.10: 94.15 / 93.22 / 87.03 / 94.9.

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir ao paquete `@yggdrasil-forge/react` o compoñente público
**`SkillTreeErrorBoundary`** — class component (require 'use client')
con `getDerivedStateFromError` + `componentDidCatch` + `reset()`
method, API con prop `fallback: ReactNode | ((error, reset) =>
ReactNode)` (render prop opcional) + `onError?: (error, errorInfo)
=> void` (logging callback opcional) + `children: ReactNode`,
exportado desde root (`/index.ts`) e `/headless` pero **NON desde
`/server`** (require client). Tests específicos novos
(`SkillTreeErrorBoundary.test.tsx` con ~7 tests) verifican render
de children sen erro, captura de erro, renderizado de fallback
estático e function, callback onError, e reset(). **Cero modificación
de calquera outro compoñente, módulo, hook ou test existente** salvo
os 2 ficheiros de exports.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS**:
- `packages/react/src/SkillTreeErrorBoundary.tsx` (~90 liñas).
- `packages/react/__tests__/SkillTreeErrorBoundary.test.tsx` (~180
  liñas; ~7 tests).
- `.changeset/error-boundary.md` (NOVO).

**MODIFICADOS**:
- `packages/react/src/index.ts` (engadir 2 export lines).
- `packages/react/src/headless.ts` (engadir 2 export lines).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**Cero modificación de** (lista completa):
- `src/server.ts` (cero exposición en RSC entry).
- Calquera outro ficheiro en `packages/react/src/` ou
  `packages/react/__tests__/`.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — `SkillTreeErrorBoundary.tsx` (FIXADO)

```tsx
'use client'

// ── INICIO: SkillTreeErrorBoundary ──
import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface SkillTreeErrorBoundaryProps {
  /**
   * Children que se renderizan dentro do boundary. Calquera erro
   * lanzado durante o render destes children será capturado.
   */
  readonly children: ReactNode

  /**
   * UI a renderizar cando un erro foi capturado. Pode ser:
   * - **ReactNode estático**: renderízase tal cual (ignora o error).
   * - **Function (render prop)**: recibe `(error, reset)` e devolve
   *   ReactNode. Permite mostrar mensaxe de erro detallada + botón
   *   de retry chamando a `reset()`.
   *
   * @example
   * ```tsx
   * <SkillTreeErrorBoundary fallback={<div>Algo fallou</div>}>...
   *
   * // Render prop:
   * <SkillTreeErrorBoundary fallback={(error, reset) => (
   *   <div>
   *     <p>Erro: {error.message}</p>
   *     <button onClick={reset}>Reintentar</button>
   *   </div>
   * )}>...
   * ```
   */
  readonly fallback:
    | ReactNode
    | ((error: Error, reset: () => void) => ReactNode)

  /**
   * Callback opcional disparado en `componentDidCatch`. Útil para
   * logging (Sentry, console, OpenTelemetry, etc.). Recibe o error
   * + ErrorInfo (con `componentStack`).
   *
   * **Nota**: en modo dev de React, este callback pode chamarse
   * varias veces para o mesmo erro (React renderiza dúas veces
   * para mellor stack trace). Os tests deben verificar
   * `.toHaveBeenCalledWith(...)` (con argumentos) en lugar de
   * `.toHaveBeenCalledTimes(1)`.
   */
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface SkillTreeErrorBoundaryState {
  readonly error: Error | null
}

/**
 * Class component que captura erros lanzados durante o render dos
 * seus descendants e renderiza un fallback UI.
 *
 * **'use client' obrigatorio**: `componentDidCatch` e
 * `getDerivedStateFromError` requiren client-side execution. **NON
 * exposto en `@yggdrasil-forge/react/server`**.
 *
 * @example
 * ```tsx
 * <SkillTreeErrorBoundary fallback={<Fallback />}>
 *   <SkillTree engine={engine} />
 * </SkillTreeErrorBoundary>
 * ```
 */
export class SkillTreeErrorBoundary extends Component<
  SkillTreeErrorBoundaryProps,
  SkillTreeErrorBoundaryState
> {
  constructor(props: SkillTreeErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
    this.reset = this.reset.bind(this)
  }

  /**
   * React lifecycle: devolve novo state cando un descendant lanza.
   * Síncrono. **Cero side effects** aquí (use componentDidCatch).
   */
  static getDerivedStateFromError(
    error: Error,
  ): SkillTreeErrorBoundaryState {
    return { error }
  }

  /**
   * React lifecycle: chamado tras render con state derivado do
   * error. **Aquí van os side effects** (logging via onError).
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError !== undefined) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Restaura o boundary ao estado normal (children visibles de
   * novo). Útil para "retry" tras un erro recuperable.
   *
   * Bound no constructor para que se pase como callback estable.
   */
  reset(): void {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error !== null) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(error, this.reset)
      }
      return fallback
    }
    return this.props.children
  }
}
// ── FIN: SkillTreeErrorBoundary ──
```

**Decisións clave**:
- **Class component** (única opción para error boundaries en React 19).
- **`'use client'`** na primeira liña.
- **`override`** modifier en `componentDidCatch` e `render`
  (TypeScript strict require iso para métodos sobrescritos).
- **State sparse**: `error: Error | null` (cero outros campos).
- **`reset` bound no constructor** para referencia estable.
- **Cero side effects en `getDerivedStateFromError`** (anti-patrón
  React).
- **`onError` opcional**: spread condicional dentro de
  `componentDidCatch`.
- **`fallback` discrimination**: `typeof fallback === 'function'`
  → render prop; else → ReactNode estático.

### 5.3 — Modificación de `src/index.ts`

Engadir tras os exports existentes (despois de SkillTreeAnnouncer):

```ts
// Error boundary para SkillTree (class component; require 'use client').
export { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary.js'
export type { SkillTreeErrorBoundaryProps } from './SkillTreeErrorBoundary.js'
```

### 5.4 — Modificación de `src/headless.ts`

Engadir o mesmo bloque (mesma posición relativa):

```ts
export { SkillTreeErrorBoundary } from './SkillTreeErrorBoundary.js'
export type { SkillTreeErrorBoundaryProps } from './SkillTreeErrorBoundary.js'
```

### 5.5 — Cero modificación de `src/server.ts`

**Garantía dura**. SkillTreeErrorBoundary require client (componentDidCatch
+ getDerivedStateFromError). **NON aparece** no entry /server. Os
consumidores RSC poden:
- Importar SkillTreeErrorBoundary desde root entry (xa que ten 'use
  client', React entende o boundary).
- Aliñar SkillTreeStatic con SkillTreeErrorBoundary client envolvendo
  partes interactivas (patrón mixto válido).

### 5.6 — Tests prescritos (~7 totais)

**`SkillTreeErrorBoundary.test.tsx`** (NOVO):

Helper compoñente:
```tsx
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div data-testid="ok">OK</div>
}
```

Patrón comun nos tests:
```ts
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})
```

**Tests**:

1. **Renderiza children sen erro**: `<SkillTreeErrorBoundary
   fallback={<span>FB</span>}><ThrowingComponent shouldThrow={false} />
   </SkillTreeErrorBoundary>` → `data-testid="ok"` visible; span "FB"
   non visible.

2. **Renderiza fallback ReactNode tras erro**: `shouldThrow=true`
   → span "FB" visible; data-testid="ok" non visible.

3. **Renderiza fallback function (render prop)**:
   `fallback={(error, _reset) => <span>Erro: {error.message}</span>}`
   → span "Erro: Test error" visible.

4. **onError callback chámase con error + errorInfo**:
   `onError={mockFn}` → `mockFn.mock.calls[0][0]` é Error con message
   'Test error'; `mockFn.mock.calls[0][1]` ten `componentStack` (string).
   Usar `.toHaveBeenCalledWith(expect.any(Error),
   expect.objectContaining({ componentStack: expect.any(String) }))`.

5. **reset() restaura estado normal**: render fallback function que
   inclúa `<button onClick={reset}>retry</button>`; clic no botón
   tras erro; rerender o children (con shouldThrow=false esta vez)
   → data-testid="ok" visible de novo. **Iso require rerender** entre
   o reset e a verificación.

6. **Cero `onError` → cero throw**: render con `shouldThrow=true` e
   sen onError → fallback visible, cero excepción do boundary mesmo.

7. **SSR-safety: renderToString sen erro renderiza children**:
   `renderToString(<SkillTreeErrorBoundary fallback={...}><div>OK</div>
   </SkillTreeErrorBoundary>)` → output contén 'OK'. **Cero test
   de captura de erro en SSR** (renderToString non manexa boundaries
   da mesma forma).

**Total: ~7 tests novos**. Post-7.11 esperado: 97 + 7 = **~104 tests**.

### 5.7 — Cobertura prescrita

- **SkillTreeErrorBoundary.tsx**: **100/100/100/100** (peza ben
  testable; tódolos casos cubertos polos 7 tests).
- **Resto sen cambio respecto a 7.10**:
  - SkillNode.tsx: 100/100/100/100 (mantén).
  - SkillTree.tsx: 100/92.3/100/100 (mantén; débeda branch coverage
    liña 96 anotada).
  - SVGRenderer.tsx: 93.75/91.3 (mantén).
  - svg-helpers.ts: 92.59/83.33 (mantén).
  - SkillTreeAnnouncer.tsx: 72.72/60/50/72.72 (mantén).
  - SkillTreeWithDefaultTheme.tsx, headless.ts, server.ts: artefactos
    v8.
  - Resto: 100/100/100/100.

### 5.8 — Cero deps novas

Verificable empíricamente: cero modificación de package.json deps,
lockfile, workspace catalog. **Cero `react-error-boundary`** ou
similar engadido. **Se aparecen** → ESCALAR.

### 5.9 — Test counts esperados post-7.11

- **react**: 97 (previo) + ~7 (novos) = **~104 tests**.
- **core, common, storage**: intactos.

### 5.10 — Patrón de tests con erro deliberado

**Cada test que provoque erro** debe:
1. Silenciar console.error con `vi.spyOn(...).mockImplementation`.
2. Restaurar mocks en afterEach.
3. Verificar comportamento esperado **sen confiar en chamada exacta
   de count** (dev mode pode duplicar).

**Verificable empíricamente** se os tests pasan:
```bash
pnpm --filter @yggdrasil-forge/react test --force 2>&1 | grep -E "Tests|FAIL"
```

Se hai falla por count, ESCALAR.

### 5.11 — Cero modificación de SkillTree para envoltorio automático

**Decisión**: o boundary é un **compoñente independente** que o
consumidor envolve manualmente (patrón MASTER §45 e exemplo end-to-end
en liñas 2348-2360). **Cero envoltorio implícito en SkillTree**.

**Razóns**:
- Flexibilidade: o consumidor decide o granular do boundary (envolver
  só SkillTree, ou tamén ThemeProvider, ou toda a app).
- Cero rotura de API existente.
- Coherente con MASTER §45.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| `SkillTreeErrorBoundary` class | React class component | SkillTreeErrorBoundary.tsx | ~90 |
| Exports root | Edits | src/index.ts | +3 |
| Exports headless | Edits | src/headless.ts | +3 |
| Tests boundary | describe block | SkillTreeErrorBoundary.test.tsx | ~180 |

**Total estimado**: ~96 liñas de código + ~180 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/SkillTreeErrorBoundary.tsx` (NOVO)
- `packages/react/src/index.ts` (MODIFICADO: +3 export lines)
- `packages/react/src/headless.ts` (MODIFICADO: +3 export lines)
- `packages/react/__tests__/SkillTreeErrorBoundary.test.tsx` (NOVO)
- `.changeset/error-boundary.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 6 ficheiros tocados** (3 NOVOS + 3 MODIFICADOS).

**NON deben aparecer cambios en**:
- `src/server.ts` (cero exposición RSC).
- Calquera outro ficheiro en `packages/react/src/` ou
  `packages/react/__tests__/`.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx`. **`'use client'` primeira liña** de
SkillTreeErrorBoundary.tsx.

Class component con `override` modifier en `componentDidCatch` e
`render` (TypeScript strict).

Tests con `vi.spyOn(console, 'error').mockImplementation` para
silenciar ruído + `vi.restoreAllMocks()` no afterEach.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en SkillTreeErrorBoundary class + cada método +
cada prop.

**Marcadores**: `// ── INICIO: SkillTreeErrorBoundary ──` / `// ── FIN: ──`.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar `src/server.ts` (cero exposición RSC do boundary).
- ❌ Modificar **calquera outro ficheiro** en `packages/react/src/`
  ou `packages/react/__tests__/` salvo `index.ts` e `headless.ts`.
- ❌ Modificar SkillTree.tsx ou SkillTreeWithDefaultTheme.tsx para
  envolver automaticamente con boundary (cero envoltorio implícito).
- ❌ Engadir `react-error-boundary` ou outra dep similar.
- ❌ Usar functional component con hooks "equivalent" a error
  boundaries (cero existen en React 19; class component é a única
  forma).
- ❌ Crear ErrorCodes específicos para render (cero modificación de
  packages/common/).
- ❌ Engadir prop `resetKeys` ou similar (cero scope creep; reset()
  manual é suficiente).
- ❌ Engadir prop `isolate` ou similar (cero scope creep).
- ❌ Engadir logging por defecto (sen `onError`, cero side effect).
- ❌ Capturar erros en effects ou event handlers (error boundaries
  só capturan render-time erros; documentar **NON** require explicit
  callout pero non implementar fallback adicional).
- ❌ Engadir deps de npm.
- ❌ Usar `!` non-null assertions (TS).
- ❌ Engadir Date.now() / Math.random().
- ❌ Engadir useState ou outros hooks (cero existen en class
  components; usaremos this.state).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T7)

### T0 — Verificación previa (baseline)

**T0.1** — `git status` limpo. `git log -1` mostra `e4c594e` como HEAD.

**T0.2** — APIs verificadas:

```bash
# Confirmar cero class components previos:
grep -rn "extends Component" packages/react/src/
# esperado: cero matches

# Confirmar exports actuais en index.ts (engadiremos novos tras
# SkillTreeAnnouncer):
grep -n "SkillTreeAnnouncer" packages/react/src/index.ts
# esperado: 2 export lines

# Confirmar cero ErrorCodes de render en common:
grep -E "RENDER_" packages/common/src/errors/codes.ts
# esperado: cero matches (cero require modificar common)
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 97 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Crear SkillTreeErrorBoundary.tsx

Crear `packages/react/src/SkillTreeErrorBoundary.tsx` segundo §5.2
literal.

**Verificacións inmediatas**:
- `'use client'` primeira liña.
- `class SkillTreeErrorBoundary extends Component<...>`.
- `static getDerivedStateFromError`.
- `override componentDidCatch`.
- `reset` method bound no constructor.
- `override render`.

### T2 — Actualizar src/index.ts

Engadir 3 export lines segundo §5.3 literal.

### T3 — Actualizar src/headless.ts

Engadir 3 export lines segundo §5.4 literal.

### T4 — Verificación intermedia (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 97 tests pasando
pnpm --filter @yggdrasil-forge/react build
# Verificar que server.js sigue sen 'use client' (boundary non bundleado aí):
grep "'use client'" packages/react/dist/server.js
# esperado: cero matches
```

**Tódolos 97 tests previos deben pasar intactos**.

**Verificación adicional**: o boundary NON debe aparecer en dist/server.js
(o /server entry non o re-exporta). Verificable con:
```bash
grep "SkillTreeErrorBoundary" packages/react/dist/server.js
# esperado: cero matches
```

### T5 — Crear SkillTreeErrorBoundary.test.tsx

Implementar 7 tests segundo §5.6 literal. **Patrón**:
- `beforeEach`/`afterEach` con `vi.spyOn(console, 'error')`.
- `ThrowingComponent` helper.
- Tests 1-7 segundo prescripción.

### T6 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~104 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   SkillTreeErrorBoundary.tsx: 100/100/100/100 (mandato firme)
#   Resto: sen regresión respecto a 7.10
```

**Se SkillTreeErrorBoundary baixa de 100/100/100/100** → engadir
tests adicionais para cubrir ramas non exercidas.

### T7 — Build + Lint + Format + Grep + Changeset + commit + push

```bash
pnpm --filter @yggdrasil-forge/react build
pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/SkillTreeErrorBoundary.tsx \
  packages/react/__tests__/SkillTreeErrorBoundary.test.tsx
```

`.changeset/error-boundary.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add SkillTreeErrorBoundary component (sub-phase 7.11)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: novo compoñente público
  **`SkillTreeErrorBoundary`** — class component (única forma de
  implementar error boundaries en React 19) que captura erros
  lanzados durante o render dos seus descendants e renderiza un
  fallback UI configurable.
  - API:
    - **`children: ReactNode`** — children dentro do boundary.
    - **`fallback: ReactNode | ((error, reset) => ReactNode)`** —
      fallback UI. Pode ser ReactNode estático ou render prop que
      recibe `(error, reset)` e devolve ReactNode (patrón estándar
      industria: react-error-boundary, Next.js).
    - **`onError?: (error, errorInfo) => void`** — callback opcional
      para logging (Sentry, console, OpenTelemetry, etc.). Recibe
      o error + ErrorInfo con `componentStack`.
  - Method público `reset()` — restaura o boundary ao estado normal
    (children visibles de novo). Útil para "retry" tras un erro
    recuperable.
  - `'use client'` na primeira liña (`componentDidCatch` e
    `getDerivedStateFromError` requiren client-side execution).
  - Exportado desde root entry (`@yggdrasil-forge/react`) e desde
    `/headless`. **NON exposto en `/server`** (require client).
  - Patrón de uso (MASTER §45):
    ```tsx
    <SkillTreeErrorBoundary fallback={<Fallback />}>
      <SkillTree engine={engine} />
    </SkillTreeErrorBoundary>
    ```

### Note
- Sub-fase 7.11 DÉCIMA PRIMEIRA da Fase 7 (12 sub-fases totais).
- **Primeiro class component en packages/react** (cero existían
  antes de 7.11). Implementación estándar de React 19 (cero deps
  externas como `react-error-boundary`).
- **`onError` en dev mode pode chamarse varias veces** para o mesmo
  erro (React renderiza dúas veces para mellor stack trace). Os
  tests verifican `.toHaveBeenCalledWith(...)` (con argumentos) en
  lugar de count exacto.
- **DIFERIDO**: 7.12 (tests visuais + a11y + SSR con Playwright +
  jest-axe).
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **Cero modificación de SkillTree** (cero envoltorio implícito;
  consumidor envolve manualmente segundo MASTER §45).
- **Cero modificación de calquera compoñente, módulo, hook ou test
  existente** salvo `index.ts` e `headless.ts` (engadir 2 exports
  cada un). Os 97 tests previos pasan intactos.
- **Cero exposición en `/server`** (require 'use client'). Os
  consumidores RSC poden usar SkillTreeErrorBoundary client envolvendo
  partes interactivas (patrón mixto).
```

Commit Conventional:
`feat(react): add SkillTreeErrorBoundary component (sub-phase 7.11)`

Push directo a `origin/main` (base `e4c594e`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.11 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base e4c594e)
✅ SkillTreeErrorBoundary class component novo
✅ 'use client' primeira liña; class extends Component
✅ API: fallback (ReactNode | function) + onError? + children
✅ Method reset() bound no constructor para reintentos
✅ Exportado desde index.ts + headless.ts (cero exposición /server)
✅ T0.2 verificación: cero class components previos en src/,
   exports actuais documentados, cero ErrorCodes render en common
✅ T4 verificación intermedia: 97 tests previos pasan intactos
✅ T4 verificación dist/server.js: cero 'use client', cero
   SkillTreeErrorBoundary (cero exposición RSC)
✅ CERO modificación de SkillTree, SkillNode, SkillEdge, MeshOverlay,
   SVGRenderer, ThemeProvider, SkillTreeWithDefaultTheme,
   SkillTreeAnnouncer, SkillTreeStatic, serializeForClient,
   svg-helpers, animations, createDefaultLayoutRegistry, theme-types,
   themes/minimal, hooks/*, server.ts
✅ CERO modificación de tests existentes
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ Tests: <N> pasan en react (7 novos, 97 previos intactos)
   - 7 SkillTreeErrorBoundary (children sen erro, fallback ReactNode,
     fallback function, onError callback, reset(), cero onError
     non rompe, SSR-safety renderToString sen erro)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - SkillTreeErrorBoundary.tsx: 100/100/100/100
   - Resto: sen regresión respecto a 7.10
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok (3 entry points; dist/server.js sen
   'use client' nin SkillTreeErrorBoundary)
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.11 DÉCIMA PRIMEIRA da Fase 7.
   - 1 sub-fase pendente (7.12 tests visuais + a11y + SSR).
   - Primeiro class component en packages/react.
   - SkillTreeErrorBoundary 'use client'; cero exposición /server.
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 6 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.12 (tests visuais + a11y + SSR).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.11. Décima primeira sub-fase da Fase 7. Engade
o primeiro class component do paquete (SkillTreeErrorBoundary).
Risco arquitectónico BAIXO: peza isolada con API standard industria
+ tests con erro deliberado deterministas (con console.error
silenciado). Cero modificación de calquera outra peza. Cero
exposición en /server (require 'use client' por class lifecycle).
Cero deps novas. **Tras 7.11 quedan só 7.12 para pechar a Fase 7**.*

*Lección 7.5 L1 aplicada: T0.2 verifica empíricamente ausencia de
class components previos + ErrorCodes render. T4 verificación
intermedia + grep adicional confirma RSC compatibility preservada.*
