# BRIEFING — sub-fase F10.3.fix-2 (Context singleton entre entry points)

> **4º Arquitecto (Director) → Executor.**
> **A causa raíz, arranxada no paquete.** `useTheme()` devolvía `null` no
> `SkillNode` porque `/index` e `/headless` empacotan **dúas instancias de
> `ThemeContext`** (cada bundle ten o seu `createContext`). `ThemeProvider`
> (de /index) escribe nun; `SkillNode` (de /headless) le doutro. Fíxase
> facendo de `ThemeContext` un **singleton cross-bundle** (`Symbol.for` en
> `globalThis`), de xeito que **calquera** mestura de entry points comparta
> un só Context. Diagnóstico orixinal: o Executor (queixos entregados 🧀).
> Aplícase **enriba do F10.3.fix local** (inline theming). Publicable →
> `@react` **minor**. **Human visual check.**

---

## 1. Causa raíz (verificada polo Director)

- `/headless` **NON** exporta `ThemeProvider` (confírmao `headless.ts`).
- `/index` exporta `ThemeProvider` **e** `SkillTree`
  (`SkillTreeWithDefaultTheme`, que respecta tema ascendente — F10.1).
- O demo mesturaba: `ThemeProvider` de /index + `SkillTree` de /headless →
  dous bundles → dous `ThemeContext` → `useTheme()===null` no `SkillNode`.
- O sistema vello (CSS vars no `<svg>`) sobrevivía porque tematizaba por
  **cascada DOM**, non por React Context; o F10.3.fix (inline via
  `useTheme`) destapou o Context roto preexistente.

## 2. Estado á entrada

Local co **F10.3.fix aplicado** (inline theming; `nodeFill`/`ringWidth` no
`Theme`). Este briefing engade o arranxo de Context + consolida o demo, e
deixa todo listo para **un push limpo** (F10.3.fix + F10.3.fix-2 xuntos).

## 3. Decisións (NON discutibles)

1. **`ThemeContext` = singleton global** via `Symbol.for`, para que aínda
   que o módulo se empacote en dous bundles, ambos resolvan a **mesma**
   instancia de Context.
2. **`/headless` re-exporta `ThemeProvider`, `ThemeProviderProps` e o tipo
   `Theme`** (DX: un consumidor headless pode tematizar sen tocar /index).
   **NON** se re-exporta `minimal` (segue sendo autoload-only de /index).
3. **Demo consolidado**: importar `ThemeProvider` **e** `SkillTree` do
   **mesmo** entry (`@yggdrasil-forge/react`). (Cinto e tirantes: aínda co
   singleton, mesturar bundles é mala práctica; o demo dá exemplo.)
4. **Sen tocar** a anatomía orbe nin o inline theming do F10.3.fix.

## 4. Tarefas (T0–T7)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional.

### T0 — Preflight
Estado co F10.3.fix aplicado. Identidade git. **GREP**: contido actual de
`ThemeProvider.ts` (onde está `createContext`) e de `headless.ts` (bloque de
exports). Reporta.

### T1 — `ThemeContext` singleton (`packages/react/src/ThemeProvider.ts`)
Substituír `export const ThemeContext = createContext<Theme | null>(null)` por
un singleton resgardado en `globalThis` (idempotente, type-safe):
```typescript
import { type Context, type JSX, type ReactNode, createContext, useContext } from 'react'
import type { Theme } from './theme-types.js'

// Singleton cross-bundle: evita instancias duplicadas de Context cando
// `/index` e `/headless` empacotan este módulo por separado.
const CONTEXT_KEY = Symbol.for('@yggdrasil-forge/react#ThemeContext')
type GlobalWithCtx = { [CONTEXT_KEY]?: Context<Theme | null> }
const store = globalThis as unknown as GlobalWithCtx

export const ThemeContext: Context<Theme | null> =
  store[CONTEXT_KEY] ?? (store[CONTEXT_KEY] = createContext<Theme | null>(null))
```
- `ThemeProvider` e `useTheme` quedan igual (xa usan `ThemeContext`).
- **GREP anti-placeholder** e cero `any` solto fóra do cast acotado.

### T2 — `/headless` re-exporta `ThemeProvider` (`packages/react/src/headless.ts`)
- Engadir:
  ```typescript
  export { ThemeProvider } from './ThemeProvider.js'
  export type { ThemeProviderProps } from './ThemeProvider.js'
  export type { Theme, ThemeColors, ThemeSizes } from './theme-types.js'
  ```
- Actualizar o comentario de cabeceira: agora **si** se re-exporta
  `ThemeProvider`/`Theme` (segue **sen** `minimal`, que é autoload-only).

### T3 — Demo: un só entry (`examples/react-demo/src/App.tsx`)
- `import { ThemeProvider, SkillTree } from '@yggdrasil-forge/react'`
  (eliminar a liña `.../headless`).
- `import type { Theme } from '@yggdrasil-forge/react'`.
- Confirmar que `builtTheme.colors.nodeFill = themeVals.fill` e
  `builtTheme.sizes.ringWidth = themeVals.ringWidth` (do F10.3.fix T7); o
  wrapper só conserva `background: themeVals.canvas`.

### T4 — Lección a MASTER (`docs/architecture/MASTER.md`)
Engadir entrada (no bloque de lecções/errores) — texto en galego:
> **Tematización + multi-entry-point.** Un paquete con varios entry points
> (`/index`, `/headless`) que comparten React Context **debe** garantir unha
> soa instancia de `createContext` (singleton vía `Symbol.for` en
> `globalThis`), ou cada bundle terá o seu Context e `useContext` devolverá o
> default. Síntoma: `useTheme()===null` en compoñentes dun entry distinto ao
> do `Provider`. Pode quedar **enmascarado** por tematización vía cascada DOM
> (CSS vars no SVG); aparece ao migrar a theming por Context (inline style).
> Regra: tematizar por inline style desde `useTheme()` **e** Context singleton.

### T5 — Tests
- `ThemeProvider.test`: `ThemeContext` é estable (mesma referencia en dúas
  lecturas; `Symbol.for` resolve idéntico). *(Nota: vitest comparte grafo de
  módulos, así que NON pode reproducir o bug de bundling; o test só garda a
  estabilidade do singleton — documéntao no test.)*
- Verificar que os tests de F10.3.fix (inline theming) seguen verdes co tema
  fluíndo.
- Gate completo verde (lint→format→typecheck:packages→test; conta tests).

### T6 — Changeset + tracking
- `.changeset/f10-3-fix-2-context-singleton.md`:
  ```markdown
  ---
  '@yggdrasil-forge/react': minor
  ---

  fix(react): ThemeContext cross-bundle singleton (Symbol.for) so /index + /headless share one context; re-export ThemeProvider/Theme from /headless (F10.3.fix-2)
  ```
- Copia este briefing a `docs/briefings/BRIEFING_10_3_FIX_2_CONTEXT_SINGLETON.md`.

### T7 — Commit + patch
- Commit único (asume F10.3.fix xa commiteado; este é o commit seguinte):
  ```
  fix(react): ThemeContext cross-bundle singleton + /headless theming re-exports (F10.3.fix-2)

  - ThemeProvider: ThemeContext via Symbol.for(globalThis) singleton (root cause of useTheme()=null across entry points)
  - headless: re-export ThemeProvider, ThemeProviderProps, Theme
  - demo: single entry import (ThemeProvider + SkillTree from /index)
  - MASTER: lesson on multi-entry React Context
  ```
- `git format-patch -1 HEAD` (ou `-2` se queres F10.3.fix + este nun só envío;
  **decides ti** o agrupamento ao aplicar/empuxar).

## 5. Ficheiros esperados no diff (lista pechada)
```
packages/react/src/ThemeProvider.ts                       (M)
packages/react/src/headless.ts                            (M)
packages/react/__tests__/ThemeProvider.test.tsx           (M/A)
examples/react-demo/src/App.tsx                           (M)
docs/architecture/MASTER.md                               (M)
.changeset/f10-3-fix-2-context-singleton.md               (A)
docs/briefings/BRIEFING_10_3_FIX_2_CONTEXT_SINGLETON.md   (A)
```
Outros → **reporta e adapta**, non inventes.

## 6. Que NON facer
- ❌ NON re-exportar `minimal` desde `/headless` (rompería o «cero autoload»).
- ❌ NON consolidar /index e /headless nun só entry (a separación é
  intencional; o singleton resolve sen eliminar /headless).
- ❌ NON revertir o inline theming do F10.3.fix.
- ❌ NON `any` solto (só o cast acotado de `globalThis`).

## 7. Human visual check (REGRA SAGRADA)
Agarfal abre o demo: ao cambiar cores no Theme Lab, **nodos (fill+anel),
labels e edges actualizan ao instante**. Despois tunea a paleta e decide
claro/escuro. Visual check **pendente de Agarfal**; non se pecha sen o seu OK.
> **Importante:** o *fix inmediato* (demo a un só entry) xa debería mostrar
> cor ANTES de aplicar este patch. Este patch fai o arranxo **correcto no
> paquete** para que non dependa de como importe o consumidor.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T7) · `📂 DIFF` (== §5) ·
- `🔎 GREP T0` · `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.3.fix-2. 4º Arquitecto. Un Context para gobernalos a todos. 🌳*
