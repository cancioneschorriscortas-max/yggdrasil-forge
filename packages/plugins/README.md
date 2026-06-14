# @yggdrasil-forge/plugins

Official plugins for Yggdrasil Forge.

## Installation

```bash
pnpm add @yggdrasil-forge/plugins
```

## Plugins included

### HistoryPlugin

Tracks unlock/lock/respec operations performed on a TreeEngine.

```typescript
import { HistoryPlugin } from '@yggdrasil-forge/plugins'

const historyPlugin = new HistoryPlugin({ maxSize: 50 })
await engine.registerPlugin(historyPlugin)

// After operations:
const history = historyPlugin.getHistory()
// Each entry: { operation, timestamp, nodeIds, locale }
```

**Options:**
- `maxSize?: number` (default: 100) — FIFO limit of stored entries.

**API:**
- `getHistory(): readonly HistoryEntry[]` — snapshot of history.
- `clearHistory(): void` — empties the history.
- `size(): number` — current number of entries.
- `getMaxSize(): number` — configured maxSize.

## License

MIT
