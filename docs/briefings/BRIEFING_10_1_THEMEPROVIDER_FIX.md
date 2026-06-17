# BRIEFING — sub-fase F10.1 de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Primeira sub-fase de Renderer 2.0 (F10).** Tamaño **XS**: arranxo do
> `SkillTreeWithDefaultTheme` para que respecte un `ThemeProvider`
> ascendente en vez de pisalo sempre co tema `minimal`. Desbloquea o uso
> de temas custom sen o workaround de `/headless`. Publicable → changeset
> `@react patch` (acumúlase; **sen release**).

---

## 1. Contexto e bug (verificado polo Director)

`packages/react/src/SkillTreeWithDefaultTheme.tsx` (o que o entry point
principal exporta como `SkillTree`) envolve **incondicionalmente**:

```tsx
return (
  <ThemeProvider theme={minimal}>
    <SkillTreeCore {...props} />
  </ThemeProvider>
)
```

Resultado: se o consumidor fai
`<ThemeProvider theme={oberon}><SkillTree .../></ThemeProvider>`, o tema
`oberon` **ignórase** porque o wrapper interno o sobrescribe con `minimal`.
O propio docstring o admite. O workaround actual (importar `SkillTree`
desde `/headless`) deixa de ser necesario tras este fix.

**Sinal observable (verificado):** `SVGRenderer` chama `useTheme()` e, se
o tema non é `null`, pon no `<svg>` un `data-theme-id` + CSS vars inline
(`--yf-color-text: theme.colors.text`, etc.). Iso é o que o test mira.

## 2. Obxectivo (unha frase)

`SkillTreeWithDefaultTheme` aplica `minimal` **só** cando non hai tema
ascendente; se o consumidor xa proveu un `ThemeProvider`, respéctao.

## 3. Decisións xa tomadas (verificadas — NON discutibles)

1. Fix = consultar `useTheme()` dentro do wrapper; se devolve un tema
   (≠ null), renderizar `<SkillTreeCore>` **sen** envolver; se `null`,
   envolver con `<ThemeProvider theme={minimal}>` (comportamento actual).
2. `useTheme` xa está exportado en `ThemeProvider.js` (uso interno).
3. Test novo en ficheiro propio. Sinal = CSS var `--yf-color-text` no `<svg>`.
4. Changeset `@yggdrasil-forge/react: patch` (bug fix de comportamento).
5. **Só se toca `SkillTreeWithDefaultTheme.tsx`** + o test. `SVGRenderer`,
   `ThemeProvider`, `/headless` e o resto **non** se tocan.

## 4. Tarefas (T0–T5)

> Script Python en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert` de
> áncora). exactOptionalPropertyTypes: cero `undefined` explícito.

### T0 — Preflight
Fresh clone; HEAD == `2bf74cb`. Árbore limpa. Identidade git
(`Director (4th Architect)`).

### T1 — Fix en `SkillTreeWithDefaultTheme.tsx`
(a) Engadir `useTheme` ao import existente. Áncora:
`import { ThemeProvider } from './ThemeProvider.js'`
Substituír por:
```typescript
import { ThemeProvider, useTheme } from './ThemeProvider.js'
```

(b) Substituír o corpo da función. Áncora (bloque exacto):
```typescript
export function SkillTreeWithDefaultTheme(props: SkillTreeProps): JSX.Element {
  return (
    <ThemeProvider theme={minimal}>
      <SkillTreeCore {...props} />
    </ThemeProvider>
  )
}
```
Por:
```typescript
export function SkillTreeWithDefaultTheme(props: SkillTreeProps): JSX.Element {
  // Respecta un ThemeProvider ascendente; só aplica `minimal` se non o hai.
  const ascendantTheme = useTheme()
  if (ascendantTheme !== null) {
    return <SkillTreeCore {...props} />
  }
  return (
    <ThemeProvider theme={minimal}>
      <SkillTreeCore {...props} />
    </ThemeProvider>
  )
}
```

(c) Actualizar o docstring: substituír o parágrafo que empeza por
`Se o consumidor envolve` (o que describe o bug) por:
```
 * Se o consumidor envolve `<ThemeProvider theme={X}><SkillTree .../>
 * </ThemeProvider>`, o tema X **respéctase** (o wrapper detecta o tema
 * ascendente vía `useTheme` e non aplica `minimal`). Sen ThemeProvider
 * ascendente, aplícase `minimal` automaticamente.
```

### T2 — Test novo: `packages/react/__tests__/SkillTreeWithDefaultTheme.test.tsx`
```tsx
import { render } from '@testing-library/react'
import { type TreeDef, TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillTreeWithDefaultTheme } from '../src/SkillTreeWithDefaultTheme.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { minimal } from '../src/themes/minimal.js'

function makeEngine(): TreeEngine {
  const tree: TreeDef = {
    id: 't',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: 'T',
    nodes: [{ id: 'a', type: 'small', label: 'A' }],
    edges: [],
    layout: { type: 'custom' },
  }
  return new TreeEngine(tree)
}

function svgStyle(container: HTMLElement): string {
  const svg = container.querySelector('svg')
  if (svg === null) throw new Error('Esperábase un <svg>')
  return svg.getAttribute('style') ?? ''
}

describe('SkillTreeWithDefaultTheme', () => {
  it('sen ThemeProvider ascendente: aplica o tema minimal', () => {
    const { container } = render(<SkillTreeWithDefaultTheme engine={makeEngine()} />)
    expect(svgStyle(container)).toContain(minimal.colors.text)
  })

  it('con ThemeProvider ascendente: respecta o tema do consumidor', () => {
    const custom = {
      ...minimal,
      colors: { ...minimal.colors, text: '#123456' },
      sizes: minimal.sizes,
    }
    const { container } = render(
      <ThemeProvider theme={custom}>
        <SkillTreeWithDefaultTheme engine={makeEngine()} />
      </ThemeProvider>,
    )
    // O tema custom aplícase (proba de que NON o pisa minimal).
    expect(svgStyle(container)).toContain('#123456')
  })
})
```
> Se `#123456` xa estivese no palette de `minimal` (improbable), escolle
> outra cor distintiva e **escala** se hai dúbida.

### T3 — Changeset
`.changeset/f10-1-themeprovider-ascendant.md`:
```markdown
---
'@yggdrasil-forge/react': patch
---

fix(react): SkillTreeWithDefaultTheme respects an ascendant ThemeProvider instead of always overriding with the minimal theme (F10.1)
```

### T4 — Tracking
Copia este briefing a `docs/briefings/BRIEFING_10_1_THEMEPROVIDER_FIX.md`.

### T5 — Gate CI + commit
- Gate completo: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`
  → as catro verdes; conta de tests **sube** (+2). Os tests existentes de
  `ThemeProvider`/`SVGRenderer`/`headless` deben seguir **todos verdes**
  (o fix non cambia o camiño por defecto nin o headless).
- Anti-placeholder → cero.
- Un só commit:
```
fix(react): SkillTreeWithDefaultTheme respects ascendant ThemeProvider (F10.1)

- useTheme() guard: apply minimal only when no ascendant theme exists
- custom consumer themes now propagate (the /headless workaround is no longer required)
- test: ascendant theme respected vs default minimal (svg --yf-color-text signal)
- changeset @react patch; track briefing

First sub-phase of Renderer 2.0 (F10). XS.
```
- `git format-patch -1 HEAD`.

## 5. Ficheiros esperados no diff (lista pechada)
```
packages/react/src/SkillTreeWithDefaultTheme.tsx              (M)
packages/react/__tests__/SkillTreeWithDefaultTheme.test.tsx   (A)
.changeset/f10-1-themeprovider-ascendant.md                   (A)
docs/briefings/BRIEFING_10_1_THEMEPROVIDER_FIX.md             (A)
```
Calquera outro = erro → **PARA e escala**.

## 6. Que NON facer
- ❌ NON tocar `SVGRenderer`, `ThemeProvider`, `SkillTree.tsx`, `/headless`.
- ❌ NON eliminar o tema `minimal` nin o seu autoload por defecto.
- ❌ NON `undefined` explícito en props/campos opcionais.

## 7. Human visual check (regra sagrada do renderer)
F10.1 é **plumbing**: o camiño por defecto (react-demo con tema por
defecto) **non cambia visualmente**. O efecto só se nota cando o
consumidor provee un tema ascendente. Polo tanto, para esta sub-fase a
verificación visual é **N/A**; os checks visuais substanciais comezan en
F10.2 (extensións de tipos visuais) en diante. Indícao así no reporte.

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §5) ·
- `🟢 GATE CI` (lint/format:check/typecheck:packages/test; conta tests) ·
- `👁️ VISUAL` (N/A — plumbing; xustifícao) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.1. 4º Arquitecto. Arranca Renderer 2.0 polo alicerce dos temas. 🌳*
