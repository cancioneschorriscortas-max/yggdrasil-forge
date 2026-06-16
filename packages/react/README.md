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
