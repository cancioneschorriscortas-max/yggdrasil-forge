# @yggdrasil-forge/react

React renderer for Yggdrasil Forge skill trees.

Render interactive skill trees with built-in SVG components,
themes, and hooks.

## Installation

```bash
pnpm add @yggdrasil-forge/react @yggdrasil-forge/core react
```

`react@18` or newer is required as a peer dependency.

## Quick start

```tsx
import { TreeEngine } from '@yggdrasil-forge/core'
import { SkillTree } from '@yggdrasil-forge/react'

const engine = new TreeEngine(treeDef)

function App() {
  return (
    <SkillTree
      engine={engine}
      width={800}
      height={600}
    />
  )
}
```

This uses the default `minimal` theme automatically.

## Headless mode (no styles)

For full control over styling, import from the `/headless` entry:

```tsx
import { SkillTree } from '@yggdrasil-forge/react/headless'

// No theme applied; bring your own CSS or theme.
<SkillTree engine={engine} width={800} height={600} />
```

## Components

| Component | Purpose |
|-----------|---------|
| `SkillTree` | Top-level component rendering an entire tree. |
| `SkillNode` | Individual node renderer (composable). |
| `SkillEdge` | Individual edge renderer (composable). |
| `MeshOverlay` | Optional background mesh / grid overlay. |
| `SVGRenderer` | Lower-level SVG container. |
| `ThemeProvider` | Provides theme context to descendants. |

### Sizing

`SkillTree` (and the static `SkillTreeStatic`) renders an `<svg>` that
fills its container by default (`display: block; width: 100%; height: 100%`).
Give the parent element an explicit size — the SVG's `viewBox` plus the
default `preserveAspectRatio="xMidYMid meet"` will scale and center the
tree inside that box.

```tsx
<div style={{ width: 800, height: 600 }}>
  <SkillTree engine={engine} />
</div>
```

If you don't size the container you'll get the SVG's intrinsic viewBox
size (often surprisingly small).

## Hooks

Subscribe to `TreeEngine` state from React with reactive hooks:

```tsx
import {
  useSkillTree,
  useNodeState,
  useNodeSelector,
  useStat,
} from '@yggdrasil-forge/react'

function MyComponent({ engine, nodeId }) {
  const nodeState = useNodeState(engine, nodeId)
  const isUnlocked = nodeState?.unlocked ?? false

  const playerLevel = useStat(engine, 'level')

  return <div>{isUnlocked ? 'Unlocked!' : 'Locked'}</div>
}
```

| Hook | Returns |
|------|---------|
| `useSkillTree(engine)` | The full reactive tree state. |
| `useNodeState(engine, nodeId)` | State for a specific node. |
| `useNodeSelector(engine, selector)` | Filtered nodes via selector. |
| `useStat(engine, statId)` | Reactive value of a single stat. |

## Themes

The default `minimal` theme ships with the package. For more themes,
see the planned [@yggdrasil-forge/themes](../themes) package.

```tsx
import { ThemeProvider, minimal } from '@yggdrasil-forge/react'

<ThemeProvider theme={minimal}>
  <SkillTree engine={engine} />
</ThemeProvider>
```

Define a custom theme by implementing the `Theme` type:

```tsx
import type { Theme } from '@yggdrasil-forge/react'

const myTheme: Theme = {
  colors: { /* ... */ },
  sizes: { /* ... */ },
  // ...
}
```

## Labels

Node labels render at their full text by default. When a tree is dense and
labels would overlap, there are two patterns — pick the one that fits your
UI. The library gives you the mechanism; you choose the policy. Neither is
forced.

### Dense: truncate with a tooltip

Set `sizes.maxLabelChars` on your theme. Labels longer than that are cut to
`N` characters plus an ellipsis (`…`), and the node gets an SVG `<title>`
with the full text — a native tooltip on hover. The `aria-label` always
keeps the full text, so screen readers (and any detail panel you build)
lose nothing.

```tsx
import { ThemeProvider, minimal, type Theme } from '@yggdrasil-forge/react'

const dense: Theme = {
  ...minimal,
  sizes: { ...minimal.sizes, maxLabelChars: 12 },
}

<ThemeProvider theme={dense}>
  <SkillTree engine={engine} />
</ThemeProvider>
```

This mirrors how dense skill grids in games show short labels and reveal
the full name on hover. On touch devices, where there is no hover, the full
text is still in the `aria-label` and reachable through whatever detail UI
you build on `onNodeClick` or `onNodeLongPress`.

`maxLabelChars` counts UTF-16 code units, which is approximate for emoji and
wide (CJK) glyphs. Setting it to `0`, a negative number, or leaving it
undefined disables truncation (the default).

### Spacious: give labels room

Keep full labels and make space in the layout instead — increase
`nodeSpacing` / `levelSpacing` on tree layouts, or place nodes with explicit
`custom` positions. This favors legibility over density.

## Notes

- Components use SVG; no Canvas or WebGL is required.
- Hooks subscribe to `TreeEngine` events efficiently (only
  re-render on relevant state changes).
- The package is tree-shakeable; importing individual components
  avoids loading the rest.
- SSR-friendly: components render statically; hydration is
  client-only.

## Related packages

- [@yggdrasil-forge/core](../core): TreeEngine.
- [@yggdrasil-forge/common](../common): Shared types
  (`LocalizedString`, `Result`, etc.).
- [@yggdrasil-forge/themes](../themes): Planned theme collection.

## License

MIT
