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

### DebugPlugin

Logs all TreeEngine operations via hooks (useful for debugging).

```typescript
import { DebugPlugin } from '@yggdrasil-forge/plugins'

const debugPlugin = new DebugPlugin({ logLevel: 'info' })
await engine.registerPlugin(debugPlugin)

await engine.unlock('nodeA')
// Logs:
//   [plugin:yggdrasil-debug] beforeUnlock: nodeA (locale=gl)
//   [plugin:yggdrasil-debug] afterUnlock: nodeA (locale=gl)
```

**Options:**
- `enabled?: boolean` (default: `true`) — if `false`, no hooks are registered.
- `logLevel?: 'debug' | 'info' | 'warn' | 'error'` (default: `'debug'`).

**Hooks registered (when enabled):**
- `beforeUnlock`, `afterUnlock`
- `beforeLock`, `afterLock`
- `beforeRespec`, `afterRespec`
- `computeUnlockability`
- `computeCost` (registered for future use; not currently invoked)

**API:**
- `isEnabled(): boolean` — returns whether the plugin is active.
- `getLogLevel(): PluginLogLevel` — returns the configured log level.

**Note**: `before*` hooks always return `true` (DebugPlugin never cancels operations). `compute*` hooks return the default result unchanged (DebugPlugin never modifies results).

## License

MIT
