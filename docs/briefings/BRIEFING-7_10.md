# BRIEFING — SUB-FASE 7.10 de Yggdrasil Forge

> Pega este documento no chat executor.
> **DÉCIMA sub-fase da Fase 7.** Engade ao paquete
> `@yggdrasil-forge/react` soporte mínimo para **long press en
> touch devices**:
> 1. **`SkillNode.tsx` MODIFICADO**: engadir `'use client'` directive
>    + nova prop opcional `onLongPress?: (nodeId: string) => void`
>    + `longPressDuration?: number` (default 700ms) + handlers
>    `onPointerDown`/`onPointerUp`/`onPointerCancel`/`onPointerLeave`
>    con timer via `useRef`. **Cero modificación de aria-label,
>    handlers existentes (onClick, onKeyDown), tabIndex, role, ou
>    estrutura SVG**.
> 2. **`SkillTree.tsx` MODIFICADO**: engadir prop opcional
>    `onNodeLongPress?: (nodeId: string) => void` + pass-through a
>    SkillNode. **Cero outras modificacións**.
> 3. **Tests novos** en `SkillNode.test.tsx`: +5 sen modificar os 6
>    existentes.
>
> **Touch target 44x44px**: **xa cuberto** desde 7.2 (NODE_RADIUS=24
> → diámetro=48 ≥ 44). Cero modificación de CSS. Documentar.
>
> **Tap**: xa funciona via React synthetic events (onClick traduce
> tap automáticamente). Cero implementación específica require.
>
> **DIFERIDOS a 7.x posteriores ou Fase 9** (cero scope creep):
> - **Pinch + Pan**: MASTER liña 2218 adscrito explícitamente a
>   **Fase 9 (EditorCanvas con zoom/pan)** e MASTER liña 2277
>   prescribe `@use-gesture/react` como dep externa. Manter
>   disciplina "cero deps engadidas" da Fase 7.
> - **Double tap**: comportamento problemático nalgúns mobile
>   browsers (interfire con browser zoom); cero require específico
>   por MASTER.
> - **Bottom sheets**: require contexto modal global ou portal;
>   fora de scope.
>
> 7.11 (error boundaries), 7.12 (tests visuais) DIFERIDOS.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1 — Scripts** en `/tmp/ygg-exec/`. NUNCA na raíz.

**0.2 — .gitignore** intacto.

**0.3 — Tests SEMPRE con `--force`**.

**0.4 — Decisións do director non se consultan**.

**0.5 — ANTI-PLACEHOLDER** grep literal no reporte.

**0.6 — ESCALADO**: decisión non resolta → PARA. Lección 7.5 L1
(verificación empírica de comportamento runtime) aplicada en §2.

**0.7 — TÍTULOS PRESCRITOS**:
- Pushed: `═══ SUB-FASE 7.10 — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE 7.10 — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8 — `git am`**: `git status` + `git log -1` antes de teorizar.

**0.9 — CHANGELOG (DT-12)**: nova cabeceira `[Unreleased]` ao principio.

**0.10 — exactOptionalPropertyTypes**: spread condicional cando aplique.

**0.11 — c8 ignore**: ramas defensivas reais con xustificación.
**Mandato firme**: SkillNode.tsx mantén **100/100/100/100** tras
esta sub-fase (cobertura resolta en 7.7; cero regresión tolerada).

**0.12 — Strings multiline**: single template literal con backticks
(lección 7.6 L1).

**0.13 — GARANTÍA DE INMUTABILIDADE**:
- **SkillNode.tsx**: modifícase **só** para engadir `'use client'`,
  novo prop `onLongPress`, novo prop `longPressDuration`, useRef +
  4 pointer handlers. **Cero modificación de**: aria-label
  (`formatAriaLabel`), handleClick, handleKeyDown, tabIndex (=0),
  role ('button'), ARIA_STATE_LABELS, resolveLabel, NODE_RADIUS,
  estrutura SVG (`<g>`, `<circle>`, `<text>`).
- **SkillTree.tsx**: modifícase **só** para engadir prop
  `onNodeLongPress` + pass-through a SkillNode. **Cero modificación
  de**: outros props, useSyncExternalStore, computeLayout, render
  de edges, render de nodes (salvo o pass-through dunha nova prop
  via spread).
- **SkillNode.test.tsx**: amplíase con +5 tests. **Cero modificación
  dos 6 existentes**.
- **Cero modificación** doutro ficheiro de packages/react/ ou
  outros paquetes do monorepo.

**Tódolos 92 tests existentes deben pasar intactos**. Especial
atención a:
- 6 tests de SkillNode.test.tsx (aria-label + keyDown + resolveLabel).
- 15 tests de SkillTree.test.tsx (asercións sobre estrutura).
- 6 tests de SkillTreeStatic.test.tsx (**renderToString DEBE SEGUIR
  FUNCIONANDO** tras engadir useRef a SkillNode — confirmar en §2
  empíricamente).

**0.14 — SSR safety de SkillNode tras useRef**:
`useRef()` no servidor devolve `{ current: <initial> }` sin chamar
ningún DOM API. **renderToString funciona**. **`setTimeout` no
servidor existe** (Node.js API) pero **non se chama durante render
inicial** — só en handlers de pointer que **só se invocan no
cliente tras hidratación**. Polo tanto **SkillTreeStatic mantén
SSR-safety**. Verificable empíricamente en T0.2.

---

## 1. IDENTIFICACIÓN

Sub-fase **7.10** de Yggdrasil Forge. **DÉCIMA da Fase 7**
(React Renderer + a11y + SSR + RSC).

**Pezas (3 grupos)**:

**Grupo A — Modificación de SkillNode**:
1. **`SkillNode.tsx`**: engadir `'use client'` + props
   `onLongPress?` e `longPressDuration?` + lóxica de long press con
   useRef + 4 pointer handlers (down/up/cancel/leave).

**Grupo B — Modificación de SkillTree**:
2. **`SkillTree.tsx`**: engadir prop `onNodeLongPress?` + pass-through
   a SkillNode.

**Grupo C — Tests**:
3. **`SkillNode.test.tsx`** (MODIFICADO): +5 tests novos ao final
   sen modificar os 6 existentes.

**Cero modificación de**:
- `packages/core/`, `packages/common/`, `packages/storage/`.
- Outros 14 paquetes scaffold.
- **Calquera outro ficheiro de packages/react/src/**: SkillEdge,
  MeshOverlay, SVGRenderer, ThemeProvider,
  SkillTreeWithDefaultTheme, SkillTreeAnnouncer, SkillTreeStatic,
  serializeForClient, svg-helpers, animations,
  createDefaultLayoutRegistry, theme-types, themes/minimal,
  headless, index, server, hooks/*.
- Tests existentes (smoke, SkillTree, SkillEdge implícito,
  MeshOverlay, SVGRenderer, ThemeProvider, themes, headless, hooks,
  animations, SkillNode—só amplía, SkillTreeAnnouncer, SkillTreeStatic,
  serializeForClient, server-entry).
- `package.json` (cero deps novas), `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**CERO ErrorCodes novos.** Cero deps de npm engadidas. Cero entry
points novos.

---

## 2. CONTEXTO MÍNIMO — INVESTIGACIÓN DO DIRECTOR

**Auditoría do director (sobre commit `b4f35d5`, verificada
empíricamente en clone independente)**.

### MASTER §33 (literal)

```
## 33. MOBILE E TOUCH

Tap, double tap, long press, pinch, pan. Botóns 44x44px. Tooltips
como bottom sheets.
```

### Decisión arquitectónica do Director

**Análise empírica do MASTER**:
- **Liña 2050** (testing strategy): "Mobile | Playwright + device
  emulation" → DIFERIDO a 7.12 (tests visuais).
- **Liña 2218**: "**9.2** EditorCanvas con zoom/pan" → **zoom/pan
  adscrito explícitamente a Fase 9, NON Fase 7**.
- **Liña 2277**: "Touch gestures | @use-gesture/react" → dep externa
  prescrita para gestures complexos. **A Fase 7 mantén
  rigorosamente cero deps engadidas** (salvo jsdom+testing-library
  en 7.2 que son de testing infrastructure).

**Conclusión do Director**: 7.10 entrega o **mínimo viable que
non require deps externas**:
- **Tap**: xa funciona via React synthetic events (onClick).
  Cero implementación.
- **Long press**: implementable con useRef + setTimeout en JS
  puro. **ÚNICA peza activa de 7.10**.
- **Touch target 44x44px**: xa cuberto (NODE_RADIUS=24 →
  diámetro=48; verificado empíricamente).
- **Pinch + Pan**: DIFERIDO a Fase 9 (EditorCanvas con
  `@use-gesture/react`).
- **Double tap**: DIFERIDO (cero require específico; conflito con
  browser zoom).
- **Bottom sheets**: DIFERIDO (require contexto modal global).

### Estado actual de SkillNode (verificado empíricamente)

```tsx
// Imports actuais:
import { type JSX, type KeyboardEvent, type MouseEvent } from 'react'

// Constantes:
const NODE_RADIUS = 24   // diámetro 48 ≥ 44 ✓

// Props:
interface SkillNodeProps {
  readonly node: NodeDef
  readonly instance?: NodeInstance
  readonly position: Position
  readonly onClick?: (nodeId: string) => void
}

// Handlers existentes (post-7.7):
const handleClick = onClick !== undefined ? ... : undefined
const handleKeyDown = onClick !== undefined ? ... : undefined

// Render:
<g
  className="yf-skill-node"
  data-node-id={node.id}
  data-state={state}
  data-tier={tier}
  transform={...}
  {...(handleClick !== undefined && {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    tabIndex: 0,
    role: 'button',
    'aria-label': formatAriaLabel(node, state),
  })}
>
  <circle r={NODE_RADIUS} className="yf-skill-node__circle" />
  ...
</g>

// **Cero 'use client'** actualmente.
```

### Estado actual de SkillTree (verificado empíricamente)

```tsx
// SkillTreeProps:
interface SkillTreeProps {
  readonly engine: TreeEngine
  readonly locale?: string
  readonly onNodeClick?: (nodeId: string) => void
  readonly onEdgeClick?: (edgeId: string) => void
  readonly layoutRegistry?: LayoutEngineRegistry
  readonly padding?: number
}

// Pass-through pattern a SkillNode (verificado):
<SkillNode
  key={node.id}
  node={node}
  instance={...}
  position={...}
  {...(onNodeClick !== undefined && { onClick: onNodeClick })}
/>
```

**Patrón establecido**: prop opcional via spread condicional con
`!== undefined && { ... }`. **Engadir `onNodeLongPress` segue
idéntico patrón**.

### Verificación SSR-safety con useRef (lección 7.5 L1)

**Comportamento confirmado** (React + Node.js docs + práctica
estándar):
- `useRef(null)` no servidor: devolve `{ current: null }`. Cero
  throw, cero acceso DOM.
- `setTimeout`: existe no global `globalThis` tanto en browser como
  en Node.js. **Pero non se chama durante render inicial** — só en
  handlers de pointer que **só se disparan no cliente tras
  hidratación**.
- **renderToString con SkillNode con useRef + onLongPress**:
  funciona; o output HTML é o mesmo (cero diferenza observable;
  ferramentas de hidratación de React aplican os handlers no
  client).

**Polo tanto SkillTreeStatic mantén SSR-safety** mesmo que importa
SkillNode tras esta modificación. **Os 6 tests de SkillTreeStatic
(renderToString) deben seguir pasando intactos**. Verificable en
T3 verificación intermedia.

### Decisión sobre `'use client'` directive

`useRef` é unha hook que **require client-side execution real**
en React 19 RSC. Polo tanto **SkillNode debe ter `'use client'`**
tras esta modificación.

**Impactos**:
- SkillNode pasa de "compoñente puro server-safe" a "client
  component (boundary)".
- **SkillTreeStatic** (server component) sigue importando SkillNode
  → React reconoce o client boundary, renderiza HTML inicial no
  server, hidrata no client.
- **renderToString segue funcionando** (compoñentes con `'use client'`
  son hidratables; o output HTML é o mesmo).

**Decisión do Director**: aceptar `'use client'` en SkillNode como
**custo necesario** para a feature de long press. Cero alternativa
sen deps externas.

### Estado scaffold tras 7.9

```
packages/react/src/
├── SkillNode.tsx                  (MODIFICADO en 7.10: 'use client' + onLongPress)
├── SkillTree.tsx                  (MODIFICADO en 7.10: pass-through onNodeLongPress)
├── ... (todo o resto cero modif)
```

---

## 3. ESTADO Á ENTRADA (verificado polo director empíricamente)

- Rama `main`, último commit `b4f35d5` (SSR + RSC 7.9).
- 1523 core + 60 common + 193 storage + 92 react = ~1868 monorepo
  limpo.
- Typecheck 22/22, lint 0/0, format 0/0.
- 57 ErrorCodes existentes.
- DT abertas: 11.
- 8 compoñentes públicos + 1 wrapper interno + 4 hooks + 4 módulos
  internos + 3 entry points.
- Cobertura post-7.9: 93.63 / 93.39 / 86 / 94.44.
- Cobertura SkillNode.tsx: **100/100/100/100** (resolto en 7.7).

Entorno: Windows + Git Bash.

---

## 4. OBXECTIVO (unha frase)

Engadir a `SkillNode.tsx` directiva `'use client'` + props opcionais
`onLongPress?: (nodeId: string) => void` e `longPressDuration?:
number` (default 700ms) con implementación via `useRef` + setTimeout
+ 4 pointer handlers (`onPointerDown` inicia o timer; `onPointerUp`,
`onPointerCancel`, `onPointerLeave` cancélano), e propagar prop
`onNodeLongPress?` desde `SkillTree.tsx` a SkillNode via pass-through
con spread condicional (patrón onNodeClick existente), engadindo
+5 tests en `SkillNode.test.tsx` sen modificar os 6 existentes.
**Cero modificación de aria-label, handlers existentes (onClick,
onKeyDown), tabIndex, role, estrutura SVG, ou calquera outra peza
do paquete**. Tap (vía onClick automático), touch target 44x44px
(NODE_RADIUS=24, diámetro=48), tódalas as outras gestures de MASTER
§33 (double tap, pinch, pan, bottom sheets) **DIFERIDAS** a 7.x
posteriores ou Fase 9.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**MODIFICADOS**:
- `packages/react/src/SkillNode.tsx` (engadir 'use client' + props
  + useRef + 4 handlers + helper privado).
- `packages/react/src/SkillTree.tsx` (engadir prop + pass-through).
- `packages/react/__tests__/SkillNode.test.tsx` (+5 tests sen
  modificar os 6 existentes).
- `CHANGELOG.md` (nova `## [Unreleased]` ao principio).

**NOVOS**:
- `.changeset/mobile-touch.md` (NOVO).

**Cero modificación de** (lista completa):
- Calquera outro ficheiro en `packages/react/src/` (SkillEdge,
  MeshOverlay, SVGRenderer, ThemeProvider,
  SkillTreeWithDefaultTheme, SkillTreeAnnouncer, SkillTreeStatic,
  serializeForClient, svg-helpers, animations,
  createDefaultLayoutRegistry, theme-types, themes/minimal,
  headless, index, server, hooks/*).
- Tests existentes (smoke, SkillTree, MeshOverlay, SVGRenderer,
  ThemeProvider, themes, headless, hooks, animations,
  SkillTreeAnnouncer, SkillTreeStatic, serializeForClient,
  server-entry).
- `package.json` (cero deps novas), `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

### 5.2 — Modificación de `SkillNode.tsx` (FIXADA)

**Cambios exactos**:

1. **Engadir `'use client'`** na primeira liña.

2. **Engadir imports** de `useRef`:
```ts
import { type JSX, type KeyboardEvent, type MouseEvent, type PointerEvent, useRef } from 'react'
```

3. **Engadir props** ao `SkillNodeProps`:
```ts
interface SkillNodeProps {
  readonly node: NodeDef
  readonly instance?: NodeInstance
  readonly position: Position
  readonly onClick?: (nodeId: string) => void
  // NOVOS en 7.10:
  /**
   * Handler opcional que se dispara cando o usuario mantén premido
   * o nodo durante `longPressDuration` ms sen levantar o pointer.
   * Útil para mobile/touch (long press como gesture de "abrir menu
   * contextual" ou "mostrar detalles").
   */
  readonly onLongPress?: (nodeId: string) => void
  /**
   * Duración en ms para considerar un long press. Default 700.
   * Cero efecto se `onLongPress` é undefined.
   */
  readonly longPressDuration?: number
}
```

4. **Engadir constante por defecto** despois de `NODE_RADIUS`:
```ts
const DEFAULT_LONG_PRESS_MS = 700
```

5. **Dentro do compoñente, engadir useRef + handlers**:
```ts
// Tras a liña de progress (cero cambio nas existentes):
const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const cancelLongPress = (): void => {
  if (longPressTimerRef.current !== null) {
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }
}

const handlePointerDown =
  onLongPress !== undefined
    ? (_e: PointerEvent<SVGGElement>) => {
        cancelLongPress()
        longPressTimerRef.current = setTimeout(() => {
          onLongPress(node.id)
          longPressTimerRef.current = null
        }, longPressDuration ?? DEFAULT_LONG_PRESS_MS)
      }
    : undefined

const handlePointerEnd =
  onLongPress !== undefined ? (_e: PointerEvent<SVGGElement>) => cancelLongPress() : undefined
```

**Decisión clave**: `handlePointerEnd` é **a mesma función** para
`onPointerUp`, `onPointerCancel`, `onPointerLeave`. Cero diferenza
semántica: en todos os 3 casos, **cancelar o timer pendente** (se
o long press xa se disparou, o timer xa é null e cancelLongPress
non fai nada).

6. **Engadir handlers ao spread condicional do `<g>`**:
```tsx
<g
  className="yf-skill-node"
  // ... (cero cambio nos data-*, transform)
  {...(handleClick !== undefined && {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    tabIndex: 0,
    role: 'button',
    'aria-label': formatAriaLabel(node, state),
  })}
  {...(handlePointerDown !== undefined && {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    onPointerLeave: handlePointerEnd,
  })}
>
```

**Decisión sobre coexistencia**: o spread de pointer handlers é
**independente** do spread de click handlers. **Significa**:
- Se o consumidor pasa **só onClick**: cero pointer handlers
  aplicados (comportamento idéntico ao actual).
- Se pasa **só onLongPress**: pointer handlers aplicados, cero
  onClick.
- Se pasa **ambos**: ambos aplicados. **Pero**: o evento `onClick`
  dispárase tras `onPointerUp`. Polo tanto **un long press exitoso
  (700ms+)** dispara onLongPress; **un tap rápido** dispara
  cancelLongPress (timer cancelado antes dos 700ms) **e logo
  onClick**. Comportamento limpo.

**Cero modificación de**:
- handleClick, handleKeyDown, formatAriaLabel, resolveLabel,
  ARIA_STATE_LABELS, NODE_RADIUS.
- Estrutura SVG (`<g>`, `<circle>`, `<text>`).
- Imports actuais (só engadir `useRef` + tipos).
- Marcadores `// ── INICIO: SkillNode ──` / `// ── FIN: ──`.

### 5.3 — Modificación de `SkillTree.tsx` (FIXADA)

**Cambios exactos**:

1. **Engadir prop** a `SkillTreeProps`:
```ts
interface SkillTreeProps {
  readonly engine: TreeEngine
  readonly locale?: string
  readonly onNodeClick?: (nodeId: string) => void
  readonly onEdgeClick?: (edgeId: string) => void
  // NOVO en 7.10:
  /**
   * Handler opcional disparado tras un long press (700ms default)
   * sobre un nodo. Propágase a SkillNode internamente.
   */
  readonly onNodeLongPress?: (nodeId: string) => void
  readonly layoutRegistry?: LayoutEngineRegistry
  readonly padding?: number
}
```

2. **Engadir parameter** ao destructuring:
```ts
export function SkillTree({
  engine,
  locale,
  onNodeClick,
  onEdgeClick,
  onNodeLongPress,   // NOVO
  layoutRegistry,
  padding = 16,
}: SkillTreeProps): JSX.Element {
```

3. **Engadir pass-through** ao SkillNode (mesmo patrón que onClick):
```tsx
<SkillNode
  key={node.id}
  node={node}
  instance={...}
  position={...}
  {...(onNodeClick !== undefined && { onClick: onNodeClick })}
  {...(onNodeLongPress !== undefined && { onLongPress: onNodeLongPress })}
/>
```

**Cero outras modificacións**.

### 5.4 — Tests novos en `SkillNode.test.tsx` (FIXADOS)

Engadir 5 tests **ao final** do describe block existente (despois
do test "resolveLabel fallback final a node.id con label vacío"):

```ts
describe('SkillNode — long press (7.10)', () => {
  it('onLongPress dispara tras 700ms de pointerDown sostido', async () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    render(
      <svg>
        <SkillNode node={...} position={{x:0,y:0}} onLongPress={onLongPress} />
      </svg>
    )
    const nodeGroup = screen.getByRole('button', ...) // ou query por data-node-id se non hai role
    // Trigger pointerDown:
    fireEvent.pointerDown(nodeGroup)
    // Avanzar timer 699ms: cero chamada aínda.
    vi.advanceTimersByTime(699)
    expect(onLongPress).not.toHaveBeenCalled()
    // Avanzar 1ms máis (total 700ms): chamada.
    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledWith('a')
    vi.useRealTimers()
  })

  it('pointerUp antes de 700ms cancela o long press', async () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    render(
      <svg>
        <SkillNode node={...} position={{x:0,y:0}} onLongPress={onLongPress} />
      </svg>
    )
    const nodeGroup = ...
    fireEvent.pointerDown(nodeGroup)
    vi.advanceTimersByTime(500)
    fireEvent.pointerUp(nodeGroup)
    // Avanzar timer ata moito despois: cero chamada.
    vi.advanceTimersByTime(1000)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('pointerCancel cancela o long press', async () => {
    // Similar a pointerUp pero co evento pointerCancel.
    ...
  })

  it('longPressDuration customizado respéctase (300ms)', async () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    render(
      <svg>
        <SkillNode node={...} position={{x:0,y:0}}
                   onLongPress={onLongPress} longPressDuration={300} />
      </svg>
    )
    const nodeGroup = ...
    fireEvent.pointerDown(nodeGroup)
    vi.advanceTimersByTime(299)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('coexistencia onLongPress + onClick: tap rápido dispara onClick (non onLongPress)', async () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    render(
      <svg>
        <SkillNode node={...} position={{x:0,y:0}}
                   onClick={onClick} onLongPress={onLongPress} />
      </svg>
    )
    const nodeGroup = ...
    fireEvent.pointerDown(nodeGroup)
    vi.advanceTimersByTime(200)
    fireEvent.pointerUp(nodeGroup)
    fireEvent.click(nodeGroup)   // tras pointerUp, simulamos click engadido por React
    vi.advanceTimersByTime(1000)
    expect(onLongPress).not.toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledWith('a')
    vi.useRealTimers()
  })
})
```

**Total: 5 tests novos**. Post-7.10 esperado: 92 + 5 = **~97 tests**.

**Cero modificación dos 6 tests existentes** de SkillNode.test.tsx.

### 5.5 — Cero cambios noutros tests existentes

**Garantía dura**:
- **SkillTreeStatic.test.tsx (6 tests)**: renderToString segue
  funcionando. SkillNode con useRef pero sen onLongPress non
  dispara timers. Tests pasan intactos.
- **SkillTree.test.tsx (15 tests)**: cero asercións sobre pointer
  handlers (xa que non existían). Cero cambio observable na estrutura
  DOM cando onNodeLongPress é undefined.

### 5.6 — Cobertura prescrita

- **SkillNode.tsx**: **100/100/100/100** (mandato firme, manter
  baseline de 7.7).
- **SkillTree.tsx**: **manter baseline post-7.9** (cero regresión
  tolerada). Sen tests novos en SkillTree.test.tsx, a única rama
  nova (pass-through onNodeLongPress condicional) ten o seu branch
  "undefined" cuberto por tódolos tests existentes. **Branch
  "definida"** podería non estar cuberta indo pola via de
  SkillTree.test.tsx; **pero** indirectamente está cuberta polos
  tests de long press en SkillNode.test.tsx... non, eses tests son
  de SkillNode directamente, non vía SkillTree. **Decisión do
  Director**: **v8 ignore** opcional na rama nova de SkillTree
  pass-through, con xustificación "/* v8 ignore next 1 -- pass-through
  trivial cuberto polos tests de SkillNode.test.tsx que exercen a
  prop onLongPress directamente */". **Pero**: o feito de que
  SkillTree.tsx xa teña outras props condicionais sin v8 ignore
  suxire que o seu coverage actual permite ese tipo de branch
  uncovered. **Verificable empíricamente**.
- **Resto sen cambio respecto a 7.9**.

### 5.7 — Helpers de tests recomendados

Reutilizar `makeMinimalTreeDef` e o patrón de render envolvendo en
`<svg>`:

```tsx
function render(ui: React.ReactElement) {
  return rtlRender(ui)
}
```

Os tests novos usan `vi.useFakeTimers()` para controlar setTimeout.
Recordar `vi.useRealTimers()` no cleanup ao final de cada test (ou
en `afterEach`).

### 5.8 — Cero deps novas

**Garantía dura**. Verificable empíricamente: cero modificación de
package.json, lockfile, workspace catalog. **Se aparecen** → ESCALAR.

### 5.9 — Test counts esperados post-7.10

- **react**: 92 (previo) + 5 (novos) = **~97 tests**.
- **core, common, storage**: intactos.

### 5.10 — Comportamento de touch target 44x44px

**Xa cuberto** desde 7.2: `NODE_RADIUS = 24` → diámetro = 48px ≥
44px (WCAG 2.5.5 Target Size AAA). **Cero modificación de CSS**.
Documentar no CHANGELOG.

### 5.11 — Anotación sobre `'use client'` en SkillNode

**`SkillNode.tsx` pasa a ter `'use client'`** como consecuencia
inevitable de useRef. Documentar no CHANGELOG.

**Confirmación SSR-safety**: SkillTreeStatic (RSC entry point)
importa SkillNode → React entende client boundary → renderToString
emite HTML idéntico (cero handlers activos no servidor; hidratan no
cliente). **Os 6 tests de SkillTreeStatic.test.tsx (renderToString)
deben seguir pasando intactos**. Verificable en T3.

---

## 6. PEZAS A IMPLEMENTAR (resumo)

| Peza | Tipo | Ficheiro | Liñas aprox |
|---|---|---|---|
| 'use client' + useRef + props + handlers | Edits | SkillNode.tsx | +35 modif |
| Pass-through onNodeLongPress | Edits | SkillTree.tsx | +5 modif |
| Tests long press | 5 it() blocks | SkillNode.test.tsx | +110 |

**Total estimado**: ~40 liñas de código + ~110 liñas de tests.

---

## 7. FICHEIROS ESPERADOS NO DIFF FINAL

- `packages/react/src/SkillNode.tsx` (MODIFICADO)
- `packages/react/src/SkillTree.tsx` (MODIFICADO)
- `packages/react/__tests__/SkillNode.test.tsx` (MODIFICADO: +5 tests)
- `.changeset/mobile-touch.md` (NOVO)
- `CHANGELOG.md` (MODIFICADO)

**Total: 5 ficheiros tocados** (1 NOVO + 4 MODIFICADOS).

**NON deben aparecer cambios en**:
- Calquera outro ficheiro en `packages/react/src/` ou
  `packages/react/__tests__/`.
- `package.json`, `tsconfig.json`, `tsup.config.ts`,
  `vitest.config.ts`.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/core/`, `packages/common/`, `packages/storage/`, outros
  14 paquetes scaffold.

**Se algún destes aparece** → **ESCALAR**.

---

## 8. CONVENCIÓNS

JSX en `.tsx`. **`'use client'` na primeira liña de SkillNode.tsx**.

Tests con `vi.useFakeTimers()` / `vi.useRealTimers()` para timer
control determinístico.

2 espazos, comilla simple, sen `;`, trailing commas, máx 100 cols,
UTF-8 LF. TS strict, cero `any`.

**Cero non-null assertions** (`!`).

**Cero default exports**.

**JSDoc completo** en novas props `onLongPress` e `longPressDuration`.

**Marcadores**: `// ── INICIO: SkillNode ──` / `// ── FIN: ──` manteñen
idénticos.

---

## 9. QUE NON FACER

- ❌ Modificar `packages/core/`, `packages/common/`, `packages/storage/`.
- ❌ Modificar calquera ficheiro de `packages/react/src/` salvo
  `SkillNode.tsx` e `SkillTree.tsx`.
- ❌ Modificar calquera test existente fora de SkillNode.test.tsx
  (e mesmo aí, **cero modificación dos 6 tests existentes**; só
  engadir 5 novos ao final).
- ❌ Engadir `@use-gesture/react` ou calquera dep de gestures.
- ❌ Implementar pinch ou pan (DIFERIDO a Fase 9 — MASTER liña 2218).
- ❌ Implementar double tap (DIFERIDO; conflito con browser zoom).
- ❌ Implementar bottom sheets (require contexto modal global; fora
  de scope).
- ❌ Modificar NODE_RADIUS ou estrutura SVG.
- ❌ Modificar aria-label, formatAriaLabel, ARIA_STATE_LABELS,
  resolveLabel, handleClick, handleKeyDown.
- ❌ Modificar SkillTreeStatic.tsx (debe seguir importando
  SkillNode sen modificación).
- ❌ Engadir deps de npm.
- ❌ Modificar `tsup.config.ts`, `package.json`, ou outros ficheiros
  de infra.
- ❌ Usar `!` non-null assertions (TS).
- ❌ Engadir Date.now() / Math.random() (cero non-determinismo).
- ❌ Engadir useState ou outros hooks innecesarios (só useRef require).
- ❌ Engadir CSS classes novas, atributos data-* novos, ou roles
  ARIA novos.
- ❌ Cambiar o nome dos props `onLongPress` / `longPressDuration` /
  `onNodeLongPress`.
- ❌ Engadir `onTouchStart`/`onTouchEnd` (usamos PointerEvents que
  son superset; cero handlers de Touch específicos).
- ❌ Placeholders / `any` / TODO / FIXME / XXX.
- ❌ Inventar lóxica distinta da §5. Calquera dúbida → **ESCALAR**.

---

## 10. TAREFAS (T0–T8)

### T0 — Verificación previa (baseline) + lección 7.5 L1

**T0.1** — `git status` limpo. `git log -1` mostra `b4f35d5` como HEAD.

**T0.2** — **APIs e literais verificados**:

```bash
# Confirmar NODE_RADIUS=24 (touch target xa cumprido):
grep "NODE_RADIUS = " packages/react/src/SkillNode.tsx
# esperado: const NODE_RADIUS = 24

# Confirmar patrón pass-through actual en SkillTree:
grep -A 1 "onNodeClick !== undefined" packages/react/src/SkillTree.tsx
# esperado: spread condicional con { onClick: onNodeClick }

# Confirmar que SkillTreeStatic non pasa onClick a SkillNode:
grep -B 1 -A 5 "SkillNode" packages/react/src/SkillTreeStatic.tsx | head -10
# esperado: cero onClick prop pasada
```

**T0.3** — Baseline previo:
```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck --force                        # 22/22
pnpm --filter @yggdrasil-forge/react test --force       # 92 tests
```

**Calquera desvío en T0** → **ESCALAR ANTES DE T1**.

### T1 — Modificar SkillNode.tsx

Aplicar cambios §5.2 literal:
1. Engadir `'use client'` primeira liña.
2. Engadir imports useRef + tipo PointerEvent.
3. Engadir props onLongPress + longPressDuration.
4. Engadir DEFAULT_LONG_PRESS_MS.
5. Engadir useRef + cancelLongPress + handlePointerDown +
   handlePointerEnd.
6. Engadir spread condicional de pointer handlers ao `<g>`.

**Cero modificación** das pezas existentes (handleClick,
handleKeyDown, formatAriaLabel, ARIA_STATE_LABELS, resolveLabel,
NODE_RADIUS, estrutura SVG).

### T2 — Modificar SkillTree.tsx

Aplicar cambios §5.3 literal:
1. Engadir prop `onNodeLongPress?` a SkillTreeProps.
2. Engadir ao destructuring de parameters.
3. Engadir pass-through a SkillNode con spread condicional.

**Cero outras modificacións**.

### T3 — Verificación intermedia (CRÍTICA)

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # 92 tests pasando intactos
```

**Tódolos 92 tests previos deben pasar intactos**. Especial
atención a:
- **6 tests de SkillNode.test.tsx**: aria-label + keyDown
  (Enter/Space/Escape) + resolveLabel — TODOS pasan porque cero
  modificación da lóxica subxacente.
- **15 tests de SkillTree.test.tsx**: cero asercións sobre pointer
  handlers; cero cambio observable.
- **6 tests de SkillTreeStatic.test.tsx**: **renderToString debe
  funcionar** con SkillNode con `'use client'` + useRef. Verificar
  empíricamente.

**Se algún test existente falla** → **ESCALAR**.

### T4 — Engadir tests novos a SkillNode.test.tsx

Implementar 5 tests segundo §5.4 literal. **Cero modificación dos
6 tests previos**.

### T5 — Verificación final + cobertura

```bash
pnpm turbo run typecheck --force                          # 22/22
pnpm --filter @yggdrasil-forge/react test --force         # ~97 tests
pnpm --filter @yggdrasil-forge/react exec vitest run --coverage
# Cobertura targets:
#   SkillNode.tsx: 100/100/100/100 (mandato firme; manter baseline 7.7)
#   SkillTree.tsx: manter baseline ou aceptar 1 branch uncovered con
#                  v8 ignore xustificado (pass-through trivial)
#   Resto: sen regresión respecto a 7.9
```

**Se SkillNode baixa de 100/100/100/100** → engadir tests adicionais
para cubrir ramas non exercidas. **NON forzar coverage con v8 ignores
sin xustificación**.

### T6 — Build + Lint + Format + Grep

```bash
pnpm --filter @yggdrasil-forge/react build
# Verificar que 'use client' aparece no dist (esperado en SkillNode + os
# que xa tiñan; cero novos noutros lugares):
grep -l "'use client'" packages/react/dist/index.js packages/react/dist/headless.js
# Verificar que server.js segue sen 'use client':
grep "'use client'" packages/react/dist/server.js
# esperado: cero matches (porque SkillTreeStatic non require 'use client'
# directamente, e o tsup non bundleou SkillNode no server.js)

pnpm lint:fix && pnpm format && pnpm lint && pnpm format:check
grep -rnE "(\bplaceholder\b|valor-invalido|TODO|FIXME|XXX|: any\b|<any>|as any)" \
  packages/react/src/SkillNode.tsx \
  packages/react/src/SkillTree.tsx \
  packages/react/__tests__/SkillNode.test.tsx
```

**Atención**: tras T6 build, **dist/server.js NON debe conter
SkillNode con 'use client'**. Tsup probablemente bundleará SkillNode
**dentro de dist/server.js** (porque SkillTreeStatic o importa).
Se iso ocorre, **toda a peza bundleada incluirá 'use client'** e o
grep daría match. **Iso é problema crítico de RSC compatibility**.

**Mitigación**: verificar empíricamente en T6. **Se aparece 'use
client' en dist/server.js** → **ESCALAR**. Posible solución:
preserveDirectives en tsup config (require investigación adicional);
**ou** decidir que SkillTreeStatic non importa SkillNode senón unha
versión simplificada sen useRef. **PARA por escalación**.

### T7 — Changeset + CHANGELOG + commit + push

`.changeset/mobile-touch.md`:
```
---
'@yggdrasil-forge/react': minor
---

feat(react): add long press support for mobile/touch (sub-phase 7.10)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio. Contido:

```
### Added
- `@yggdrasil-forge/react`: soporte para **long press** en mobile/touch:
  - **`SkillNode`**: nova prop `onLongPress?: (nodeId: string) => void`
    + `longPressDuration?: number` (default 700ms). Implementación
    con `useRef` + setTimeout + 4 PointerEvent handlers
    (`onPointerDown` inicia o timer; `onPointerUp`, `onPointerCancel`,
    `onPointerLeave` cancélano).
  - **`SkillTree`**: nova prop `onNodeLongPress?: (nodeId: string) =>
    void` con pass-through a SkillNode (mesmo patrón que onNodeClick).
  - **Coexistencia onClick + onLongPress**: tap rápido (<700ms)
    dispara onClick; long press sostido (≥700ms) dispara onLongPress
    e o evento click subsiguinte non se chama (cancelado polo
    pointerUp tras o timeout).
- **Touch target 44x44px (WCAG 2.5.5 Target Size AAA)**: xa cuberto
  desde 7.2 (NODE_RADIUS=24 → diámetro=48). Cero modificación de
  CSS.

### Changed
- **`SkillNode.tsx` agora ten `'use client'`** directive (consecuencia
  de useRef). Os consumidores RSC seguen importándoo desde
  `@yggdrasil-forge/react/server` indirectamente (via SkillTreeStatic);
  o boundary client establécese correctamente e renderToString
  funciona (SSR emite HTML inicial; client hidrata cos pointer
  handlers).

### Note
- Sub-fase 7.10 DÉCIMA da Fase 7 (12 sub-fases totais).
- **DIFERIDOS** explícitamente (cero scope creep):
  - **Pinch + Pan**: MASTER liña 2218 adscrito a **Fase 9
    (EditorCanvas con zoom/pan)** + MASTER liña 2277 prescribe
    `@use-gesture/react` (dep externa). Manter disciplina "cero
    deps engadidas" da Fase 7.
  - **Double tap**: cero require específico; conflito con browser
    zoom default.
  - **Bottom sheets** (tooltips mobile): require contexto modal
    global ou portal; fora de scope.
- **Tap**: xa funciona via React synthetic events (onClick traduce
  tap automáticamente en touch devices). Cero implementación
  específica.
- **DIFERIDOS Fase 7**: 7.11 (error boundaries), 7.12 (tests visuais
  + a11y + SSR con Playwright + jest-axe).
- **Cero deps de npm engadidas**.
- **Cero ErrorCodes novos**. Cero modificación de packages/common/.
- **Cero modificación de packages/core/, packages/storage/** ou
  outros 14 paquetes scaffold.
- **Cero modificación de** SkillEdge, MeshOverlay, SVGRenderer,
  ThemeProvider, SkillTreeWithDefaultTheme, SkillTreeAnnouncer,
  SkillTreeStatic, serializeForClient, svg-helpers, animations,
  createDefaultLayoutRegistry, theme-types, themes/minimal, headless,
  index, server, hooks/*. Os 92 tests previos pasan intactos (incluídos
  os 6 de SkillTreeStatic que verifican renderToString con SkillNode
  ampliado).
```

Commit Conventional:
`feat(react): add long press support for mobile/touch (sub-phase 7.10)`

Push directo a `origin/main` (base `b4f35d5`). Reporta hash.

---

## 11. COMO REPORTAR

**SE PUSHED EN origin/main**:
```
═══ SUB-FASE 7.10 — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base b4f35d5)
✅ SkillNode: 'use client' + onLongPress + longPressDuration +
   useRef + 4 pointer handlers (down/up/cancel/leave)
✅ SkillTree: prop onNodeLongPress + pass-through
✅ Touch target 44x44px xa cuberto (NODE_RADIUS=24, diámetro=48)
✅ Tap xa funciona via onClick (React synthetic events)
✅ T0.2 verificación: NODE_RADIUS=24, patrón pass-through
   existente, SkillTreeStatic non pasa onClick
✅ T3 verificación intermedia: 92 tests previos pasan intactos
   (especial: 6 SkillTreeStatic renderToString seguen OK)
✅ T6 verificación dist/: cero 'use client' en server.js
✅ CERO modificación de SkillEdge, MeshOverlay, SVGRenderer,
   ThemeProvider, SkillTreeWithDefaultTheme, SkillTreeAnnouncer,
   SkillTreeStatic, serializeForClient, svg-helpers, animations,
   createDefaultLayoutRegistry, theme-types, themes/minimal,
   headless, index, server, hooks/*
✅ CERO modificación de tests existentes (15 SkillTree, 6
   SkillTreeStatic, 5 serializeForClient, 3 server-entry, etc.;
   só SkillNode.test.tsx ampliado con +5 sen tocar os 6 previos)
✅ CERO modificación de packages/core/, common/, storage/
✅ CERO deps de npm engadidas
✅ CERO ErrorCodes novos
✅ Tests: <N> pasan en react (5 novos, 92 previos intactos)
   - 5 SkillNode long press (700ms timer, cancel pointer-up,
     cancel pointer-cancel, custom duration, coexistencia
     onClick + onLongPress)
   Core: 1523 | Common: 60 | Storage: 193 (todos intactos)
✅ Cobertura:
   - SkillNode.tsx: 100/100/100/100 (mantén baseline 7.7)
   - SkillTree.tsx: <X>/<Y>/<Z>/<W> (cero regresión)
   - Resto: sen cambio respecto a 7.9
✅ Typecheck: 22/22 | Lint: 0/0 | Format: 0/0
✅ Build paquete react: ok (3 entry points, dist/server.js sen
   'use client')
✅ GREP ANTI-PLACEHOLDER: cero coincidencias
🛑 DECISIÓN REQUERIDA: ningunha
⚠️ Notas:
   - Sub-fase 7.10 DÉCIMA da Fase 7.
   - 2 sub-fases pendentes (7.11 error boundaries, 7.12 tests
     visuais + a11y + SSR).
   - Pinch/Pan DIFERIDO a Fase 9 (EditorCanvas).
   - Double tap, bottom sheets DIFERIDOS (cero require MASTER
     específico; fora de scope con cero deps).
   - SkillNode pasa a ter 'use client' (consecuencia de useRef);
     SkillTreeStatic mantén SSR-safety (renderToString OK).
✅ Changeset minor (react) + nova [Unreleased]
✅ git status pre-commit: 5 ficheiros esperados (§7)
📋 Transporte: <directo|parche dende raíz>
LISTO PARA SUB-FASE 7.11 (error boundaries).
═══
```

**SE NON PUSHED**: usar formato literal "PENDENTE DE PUSH POLO AUTOR".

---

*Fin do briefing 7.10. Décima sub-fase da Fase 7. Engade long press
mínimo viable (cero deps, useRef + setTimeout) en SkillNode +
SkillTree. Risco arquitectónico MEDIO: modificación de 2 pezas
core (SkillNode + SkillTree) + cambio de 'use client' status de
SkillNode + integración con SkillTreeStatic SSR. **T3 verificación
intermedia + T6 verificación dist/server.js son críticas**. Cero
deps. Cero ErrorCodes. **Pinch + Pan + Double tap + Bottom sheets
DIFERIDOS** explícitamente (Fase 9 ou sub-fase futura específica).
Calquera dúbida → ESCALAR.*

*Lección 7.5 L1 aplicada: T0.2 verifica empíricamente NODE_RADIUS,
patrón pass-through, e ausencia de onClick en SkillTreeStatic.
Verificación adicional crítica en T6: dist/server.js sen 'use
client' (RSC compatibility preservada).*
