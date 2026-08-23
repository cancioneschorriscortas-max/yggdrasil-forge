---
title: Extension guide
description: Recipes for adding fields, sub-editors, validators, effects, commands and operations to the editor.
sidebar:
  order: 1
---

**For devs who want to add capabilities to the editor.** Assumes you already understand the architecture from the [Architecture guide](../../arquitectura/guia/).

This guide is organized as **step-by-step recipes**. Each recipe is independent; start with whichever interests you.

---

## Available recipes

1. [Add an editable scalar field to the Inspector](#1-add-an-editable-scalar-field-to-the-inspector) — the simplest case
2. [Add a new structured sub-editor](#2-add-a-new-structured-sub-editor) — lists, trees, maps
3. [Add a new soft validator](#3-add-a-new-soft-validator) — a warning in the ProblemsPanel
4. [Add a new Effect type](#4-add-a-new-effect-type) — automatically available in the Inspector
5. [Add a new PropertyType (kind: 'duration', 'rich-text', …)](#5-add-a-new-propertytype)
6. [Add a new Command](#6-add-a-new-command)
7. [Add a new Operation (drag with preview)](#7-add-a-new-operation-drag-with-preview)

For every recipe: **files to touch + minimal code + recommended tests + gotchas**.

---

## 1. Add an editable scalar field to the Inspector

**Use case**: we'll add an `xp` field (experience granted when the node unlocks), editable as a number.

### Step 1.1 — Add the field to `NodeDef`

**File**: `packages/core/src/types/node.ts`

```ts
export interface NodeDef {
  // ... existing fields
  readonly xp?: number    // ★ NEW
}
```

### Step 1.2 — Add the descriptor to the registry

**File**: `packages/editor-core/src/property/nodePropertyRegistry.ts`

```ts
export const nodePropertyRegistry: readonly PropertyDescriptor[] = [
  // ... existing descriptors
  fieldDescriptor({
    key: 'xp',
    label: { en: 'XP reward', gl: 'XP outorgado' },
    type: { kind: 'number', min: 0, step: 1 },
    group: 'logic',
    describe: {
      en: 'Experience points granted on unlock.',
      gl: 'Puntos de experiencia ao desbloquear.',
    },
  }),
]
```

**That's it.** The `InspectorPanel` iterates the registry; `xp` will automatically show up in the Logic group as a NumberWidget. Commit-on-blur is already wired. Undo/redo already works.

### Step 1.3 — Tests

**File**: `packages/editor-core/__tests__/property.test.ts`

```ts
it('xp: descriptor produces the right setNodeField', () => {
  const desc = nodePropertyRegistry.find(d => d.key === 'xp') as PropertyDescriptor
  expect(desc.type.kind).toBe('number')
  expect(desc.get({ ...sampleNode, xp: 50 })).toBe(50)
  const cmd = desc.set('node-1', 100 as never)
  expect(cmd.type).toBe('setNodeField')
})
```

### Gotchas
- **`exactOptionalPropertyTypes`** is on. If the field is optional (`xp?:`), `get` returns `number | undefined`, and the generic `fieldDescriptor` already handles it.
- **Don't add the field only to the registry without adding it to `NodeDef`** — TypeScript would fail because `setNodeField<K extends keyof NodeDef>` won't accept the unknown key.
- If the field needs validation (e.g. `xp >= 0`), consider adding a **soft validator** (see recipe 3).

---

## 2. Add a new structured sub-editor

**Use case**: we'll add a `tags: string[]` field editable as a list of plain strings.

### Step 2.1 — Add the field to `NodeDef`

```ts
export interface NodeDef {
  readonly tags?: readonly string[]    // ★ NEW
}
```

### Step 2.2 — Extend `PropertyType` with the new `of`

**File**: `packages/editor-core/src/property/PropertyDescriptor.ts`

```ts
export type PropertyType =
  // ...
  | {
      readonly kind: 'structured'
      readonly of: 'effects' | 'prerequisites' | 'exclusions' | 'cost'
        | 'tiers' | 'costPerTier' | 'tags'    // ★ NEW
    }
```

### Step 2.3 — Create the React sub-editor

**New file**: `packages/editor-react/src/inspector/structured/TagsEditor.tsx`

```tsx
import { type JSX, useState } from 'react'

export interface TagsEditorProps {
  readonly value: readonly string[] | undefined
  readonly onCommit: (next: readonly string[]) => void
}

export function TagsEditor({ value, onCommit }: TagsEditorProps): JSX.Element {
  const list = value ?? []
  const [draft, setDraft] = useState('')

  const addTag = (): void => {
    if (draft === '' || list.includes(draft)) return
    onCommit([...list, draft])
    setDraft('')
  }
  const removeAt = (idx: number): void => {
    onCommit(list.filter((_, i) => i !== idx))
  }

  return (
    <div className="editor-inspector-struct">
      {list.length === 0 ? (
        <p className="editor-inspector__hint">No tags.</p>
      ) : (
        <ul className="editor-inspector-struct__list">
          {list.map((tag, idx) => (
            <li key={tag} className="editor-inspector-struct__row">
              <span className="editor-inspector-struct__item-id">{tag}</span>
              <button type="button"
                      className="editor-inspector-struct__remove"
                      onClick={() => removeAt(idx)}
                      aria-label={`Remove tag ${tag}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="editor-inspector-struct__add">
        <input
          type="text"
          className="editor-inspector-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
          placeholder="new tag…"
        />
        <button type="button" onClick={addTag}>+</button>
      </div>
    </div>
  )
}
```

### Step 2.4 — Dispatch from the router

**File**: `packages/editor-react/src/inspector/structured/StructuredEditor.tsx`

```tsx
// add the import
import { TagsEditor } from './TagsEditor.js'

// add a case to the switch
case 'tags':
  return (
    <TagsEditor
      value={value as readonly string[] | undefined}
      onCommit={(next) => onCommit(next)}
    />
  )
```

### Step 2.5 — Add the descriptor

**File**: `packages/editor-core/src/property/nodePropertyRegistry.ts`

```ts
fieldDescriptor({
  key: 'tags',
  label: { en: 'Tags', gl: 'Tags' },
  type: { kind: 'structured', of: 'tags' },
  group: 'identity',  // or wherever it belongs
}),
```

### Step 2.6 — Tests

```ts
// editor-react
it('TagsEditor add → setNodeField dispatched', () => {
  // ... set up engine + render
  const input = screen.getByPlaceholderText(/new tag/i)
  fireEvent.change(input, { target: { value: 'warrior' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(engine.getDocument().tree.nodes[0].tags).toEqual(['warrior'])
})
```

### Gotchas
- **Undo granularity**: every add/remove is 1 setNodeField = 1 transaction. Make sure NOT to do local setState or debouncing outside the cases that really need it (e.g. continuous input in TextWidget).
- **`key` on the `<li>`**: use the unique value (`tag`), not `idx`. Biome lint will complain about `key={idx}`.
- `StructuredEditor.tsx` has a `default: never` in the switch — TypeScript fails if your `of` isn't covered. That's on purpose.

---

## 3. Add a new soft validator

**Use case**: we'll add a validator that warns when a `keystone` node has no `effects` defined (domain rule: keystones should do something).

### Step 3.1 — Define the validator

**New file**: `packages/editor-core/src/validation/soft/keystoneWithoutEffectsValidator.ts`

```ts
import type { EditorDocument } from '../../EditorDocument.js'
import type { ValidationIssue } from '../Validator.js'

export function keystoneWithoutEffectsValidator(
  doc: EditorDocument
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const node of doc.tree.nodes) {
    if (node.type !== 'keystone') continue
    if (node.effects === undefined || node.effects.length === 0) {
      issues.push({
        severity: 'warning',
        code: 'YGG_ED_KEYSTONE_NO_EFFECTS',
        message: {
          en: `Keystone "${node.id}" has no effects defined. Keystones usually grant a notable boon.`,
          gl: `Keystone "${node.id}" non ten effects. Os keystones adoitan outorgar algo significativo.`,
        },
        nodeId: node.id,
      })
    }
  }
  return issues
}
```

### Step 3.2 — Register it in `createDefaultValidators`

**File**: `packages/editor-core/src/validation/createDefaultValidators.ts`

```ts
import { keystoneWithoutEffectsValidator } from './soft/keystoneWithoutEffectsValidator.js'

export function createDefaultValidators(): readonly Validator[] {
  return [
    asymmetricExclusionValidator,
    prerequisiteCycleValidator,
    layoutOverflowValidator,
    unsupportedFeatureValidator,
    keystoneWithoutEffectsValidator,    // ★ NEW
  ]
}
```

### Step 3.3 — Export from the barrel (optional, for external tests)

**File**: `packages/editor-core/src/index.ts`

```ts
export { keystoneWithoutEffectsValidator } from './validation/soft/keystoneWithoutEffectsValidator.js'
```

### Step 3.4 — Tests

**New file**: `packages/editor-core/__tests__/keystoneWithoutEffectsValidator.test.ts`

```ts
describe('keystoneWithoutEffectsValidator', () => {
  it('detects a keystone without effects', () => {
    const doc = buildDoc({
      nodes: [{ id: 'k1', type: 'keystone', label: 'K', /* no effects */ }]
    })
    const issues = keystoneWithoutEffectsValidator(doc)
    expect(issues.length).toBe(1)
    expect(issues[0].code).toBe('YGG_ED_KEYSTONE_NO_EFFECTS')
    expect(issues[0].nodeId).toBe('k1')
  })

  it('does not warn about a small node without effects', () => {
    const doc = buildDoc({
      nodes: [{ id: 's1', type: 'small', label: 'S' }]
    })
    expect(keystoneWithoutEffectsValidator(doc).length).toBe(0)
  })
})
```

### Result
- Edit the tree → the keystone without effects → the warning shows up in the Problems panel.
- Click the warning → the canvas selects `k1`, the Inspector fills with its fields.
- Add an effect → the warning disappears **on the next commit** (the validator re-runs).

### Gotchas
- **Soft validators are pure functions** (`(doc) => issues[]`). Don't mutate anything, don't call the engine. Only read.
- **Performance**: they run on every commit. If your validator is expensive (e.g. a deep BFS over every node), consider local caches with a stable key.
- **Severity**: use `warning` for problems that do NOT break the tree. Reserve `error` for cases where the tree is invalid but you don't want to block the commit (rare; you almost always prefer a hard validator).
- **Codes**: convention `YGG_ED_<NAME>`. Unique; allows filtering.

---

## 4. Add a new Effect type

**Use case**: we'll add a `play_sound` effect (play a sound on unlock).

### Step 4.1 — Add it to the `Effect` union

**File**: `packages/core/src/types/effects.ts`

```ts
export type Effect =
  // ... existing
  | { readonly type: 'play_sound'; readonly soundId: string; readonly volume?: number }
```

### Step 4.2 — Classify it in the manifest

**File**: `packages/core/src/engine/supportManifest.ts`

```ts
export const SUPPORTED_EFFECT_TYPES = [
  // ... existing
  'play_sound',    // ★ NEW
] as const
```

**That's all in @core.** The manifest's type test guarantees `play_sound` is classified; if you add it to neither SUPPORTED nor UNSUPPORTED, typecheck fails.

### Step 4.3 — Implement the runtime

**File**: `packages/core/src/engine/EffectsRunner.ts`

```ts
case 'play_sound': {
  // play the sound (up to the consumer; could be an event bus, etc.)
  // ...
  return { effect, applied: true }
}
```

### Step 4.4 — Add the mini-form in the editor

**File**: `packages/editor-react/src/inspector/structured/EffectsEditor.tsx`

#### 4.4.1 — `createPlainEffect`

```ts
function createPlainEffect(type: string, ...): Effect | null {
  // ... existing cases
  case 'play_sound':
    return { type: 'play_sound', soundId: '', volume: 1 }
  // ...
}
```

#### 4.4.2 — `EffectParams` (mini-form dispatcher)

```tsx
case 'play_sound':
  return (
    <>
      <TextCell
        value={effect.soundId}
        onCommit={(v) => onUpdate({ ...effect, soundId: v })}
        label="Sound id"
        placeholder="sfx/unlock.wav"
      />
      <NumberCell
        value={effect.volume ?? 1}
        onCommit={(v) => onUpdate({ ...effect, volume: v })}
        label="Volume"
      />
    </>
  )
```

### Step 4.5 — Tests

```ts
// editor-core: the gate includes it automatically
it('authorablePlainEffectTypes includes play_sound', () => {
  expect(authorablePlainEffectTypes()).toContain('play_sound')
})

// editor-react: the selector offers play_sound
it('the "add effect" selector includes play_sound', () => {
  // ... render Inspector
  const sel = screen.getByLabelText(/Engadir effect plano/i)
  const options = Array.from(sel.options).map(o => o.value)
  expect(options).toContain('play_sound')
})
```

### Result
- The "add effect" selector in the Inspector automatically shows `play_sound`.
- The mini-form edits `soundId` and `volume`.
- The runtime applies it in Preview (if the EffectsRunner case is implemented).

### Gotchas
- **`composite` and `conditional`** are SUPPORTED but `authorablePlainEffectTypes` filters them out (they are nested). If your new effect is nested, filter it the same way.
- If you want the effect to be UNSUPPORTED (a placeholder), add it to `UNSUPPORTED_EFFECT_TYPES` instead. It will appear in the `supportManifest` as `stable: false`, and **won't show up in the Inspector** (gate).

---

## 5. Add a new PropertyType

**Use case**: we'll add a `kind: 'duration'` to edit durations ("30s", "2m", "1h30m").

### Step 5.1 — Extend `PropertyType`

**File**: `packages/editor-core/src/property/PropertyDescriptor.ts`

```ts
export type PropertyType =
  // ... existing
  | { readonly kind: 'duration'; readonly min?: number; readonly max?: number }
```

### Step 5.2 — Create the React widget

**New file**: `packages/editor-react/src/inspector/widgets/DurationWidget.tsx`

```tsx
import { type JSX, useEffect, useState } from 'react'

function formatDuration(seconds: number): string { /* "30s" | "2m" | ... */ }
function parseDuration(input: string): number | null { /* "30s" → 30 | "2m" → 120 | ... */ }

export interface DurationWidgetProps {
  readonly id: string
  readonly value: number | undefined  // seconds
  readonly disabled?: boolean
  readonly onCommit: (next: number) => void
}

export function DurationWidget({ id, value, disabled, onCommit }: DurationWidgetProps): JSX.Element {
  const initial = value === undefined ? '' : formatDuration(value)
  const [local, setLocal] = useState(initial)
  useEffect(() => setLocal(initial), [initial])

  const commit = (): void => {
    if (local === initial) return
    const parsed = parseDuration(local)
    if (parsed === null) { setLocal(initial); return }
    onCommit(parsed)
  }

  return (
    <input id={id} type="text" className="editor-inspector-input"
           value={local} disabled={disabled ?? false}
           onChange={(e) => setLocal(e.target.value)}
           onBlur={commit}
           onKeyDown={(e) => {
             if (e.key === 'Enter') e.currentTarget.blur()
             else if (e.key === 'Escape') { setLocal(initial); e.currentTarget.blur() }
           }} />
  )
}
```

### Step 5.3 — Dispatch in the InspectorPanel

**File**: `packages/editor-react/src/inspector/InspectorPanel.tsx`

```tsx
case 'duration':
  widget = (
    <DurationWidget
      id={widgetId}
      value={value as number | undefined}
      disabled={disabled}
      onCommit={(v) => commit(d, v)}
    />
  )
  break
```

### Step 5.4 — Use it in the registry

```ts
fieldDescriptor({
  key: 'cooldown',
  label: { en: 'Cooldown', gl: 'Tempo de espera' },
  type: { kind: 'duration', min: 0 },
  group: 'logic',
}),
```

### Gotchas
- **The `default: never` in the switch** inside `renderField` fails if you don't add the case. Make sure to run typecheck.
- Duration parsing/formatting is a domain convention. Document it in the widget so other consumers (Tauri, CLI) can replicate it.

---

## 6. Add a new Command

**Use case**: `setNodeField` covers almost everything. But sometimes you need a command that makes **several atomic changes to a single node** or touches metadata.

We'll add a `renumberNodes` command that renames ids with an automatic prefix.

### Step 6.1 — Define the command

**New file**: `packages/editor-core/src/command/commands/renumberNodes.ts`

```ts
import { castDraft } from 'immer'
import type { Command } from '../Command.js'

export function renumberNodes(prefix: string): Command {
  return {
    type: 'renumberNodes',
    label: { en: 'Renumber nodes', gl: 'Renumear nodos' },
    mutate(draft) {
      const oldToNew = new Map<string, string>()
      draft.tree.nodes.forEach((node, idx) => {
        const newId = `${prefix}_${idx + 1}`
        oldToNew.set(node.id, newId)
        ;(node as { id: string }).id = newId
      })
      // Update references: edges, prerequisites, exclusions.
      for (const edge of draft.tree.edges) {
        const fromNew = oldToNew.get(edge.from)
        const toNew = oldToNew.get(edge.to)
        if (fromNew !== undefined) (edge as { from: string }).from = fromNew
        if (toNew !== undefined) (edge as { to: string }).to = toNew
      }
      for (const node of draft.tree.nodes) {
        if (node.exclusions !== undefined) {
          ;(node as { exclusions?: string[] }).exclusions =
            node.exclusions.map(id => oldToNew.get(id) ?? id)
        }
        // prerequisites: likewise, following the UnlockRule schema.
      }
    },
  }
}
```

### Step 6.2 — Export

**File**: `packages/editor-core/src/command/commands/index.ts`

```ts
export { renumberNodes } from './renumberNodes.js'
```

### Step 6.3 — Use

```ts
editorEngine.dispatch(renumberNodes('node'))
// Or inside a transaction combining several commands.
```

### Gotchas
- **`mutate(draft)` is Immer.** You can use imperative syntax, but assign through a cast (`(node as { id: string }).id = newId`) because the types are `readonly`.
- **Referential integrity**: if you change ids, **update every reference** (edge from/to, exclusions, prerequisites). Otherwise the (hard) `referentialIntegrityValidator` blocks the commit. That's a safety net.
- For generic commands like this one, consider `transaction(...)` with multiple `setNodeField` instead — it may be easier to undo.

---

## 7. Add a new Operation (drag with preview)

**Use case**: let's imagine a `ConnectOperation` — you drag from one node to create an edge towards another.

(This recipe requires deep knowledge of the canvas; it is the most demanding.)

### Step 7.1 — Define the Operation

**New file**: `packages/editor-core/src/operation/ConnectOperation.ts`

```ts
import type { EditorDocument } from '../EditorDocument.js'
import type { Position } from '@yggdrasil-forge/core'
import type { Command } from '../command/Command.js'
import { addEdge } from '../command/commands/index.js'
import type { Operation, OperationPreview } from './Operation.js'

export function createConnectOperation(
  doc: EditorDocument,
  fromNodeId: string,
  startPoint: Position,
): Operation {
  let currentPoint = startPoint
  let targetNodeId: string | null = null  // hit-test on update

  return {
    update(point, modifiers) {
      currentPoint = point
      // hit-test: which node is under the cursor?
      targetNodeId = doc.tree.nodes.find(n => /* within radius */ false)?.id ?? null
    },
    preview(): OperationPreview {
      return {
        // Returns an "edge ghost" (shape to be defined)
        edgeGhost: { from: fromNodeId, toPoint: currentPoint, hoveringTarget: targetNodeId },
      }
    },
    commit(): readonly Command[] {
      if (targetNodeId === null || targetNodeId === fromNodeId) return []
      return [addEdge({ id: `e_${Date.now()}`, from: fromNodeId, to: targetNodeId })]
    },
    cancel(): void {
      // no state to clean up
    },
  }
}
```

### Step 7.2 — Add `edgeGhost` to `OperationPreview`

**File**: `packages/editor-core/src/operation/Operation.ts`

```ts
export interface OperationPreview {
  readonly nodePositions?: ReadonlyMap<string, Position>
  readonly edgeGhost?: {
    readonly from: string
    readonly toPoint: Position
    readonly hoveringTarget: string | null
  }
}
```

### Step 7.3 — UI on the canvas

**File**: `packages/editor-react/src/canvas/EditorCanvas.tsx`

The logic resembles the current drag-to-move. You would need:
- A gesture that starts the `ConnectOperation` (e.g. shift+drag from a node).
- The Overlay drawing the edge ghost (`<line>` from `from.position` to `currentPoint`).
- A highlight on the hovering target.

**File**: `packages/editor-react/src/canvas/CanvasOverlay.tsx`

Renders the edge ghost when present in `OperationPreview`.

### Step 7.4 — Tests

```ts
it('★ ConnectOperation: hovering over a node yields a valid commit', () => {
  const op = createConnectOperation(doc, 'foo', { x: 0, y: 0 })
  op.update({ x: 50, y: 0 }, {})  // hovering bar
  const cmds = op.commit()
  expect(cmds.length).toBe(1)
  expect(cmds[0].type).toBe('addEdge')
})

it('ConnectOperation: hovering empty space → zero commands', () => {
  const op = createConnectOperation(doc, 'foo', { x: 0, y: 0 })
  op.update({ x: 999, y: 999 }, {})
  expect(op.commit().length).toBe(0)
})
```

### Gotchas
- **The Operation is stateful** during the interaction. Make sure `cancel()` leaves no dangling state.
- **The Operation must NOT touch the engine** (it should be pure `(doc, points) → commands`). The engine only receives the commands on `commit`.
- The preview shapes (`nodePositions`, `edgeGhost`) are conventions. Agree on them with the React Overlay. If complexity grows, consider specific types.

---

## Common questions

### "When I add a field, does the Inspector show it even if the node doesn't have it?"
Yes. The Inspector always iterates the registry, and `descriptor.get(node)` returns `undefined` when the node lacks the field. Widgets treat `undefined` as the default value (empty input, "— unset —" in enums, etc.). On edit, the field is created on the node.

### "How do I avoid undo spam when editing text?"
Text/number/color widgets already **commit on blur**. If you create a new continuous widget (slider, etc.), follow the same pattern: keep local state, dispatch `onCommit` ONLY on blur (or debounced).

### "How do I debounce in a widget?"
```ts
const timeoutRef = useRef<number | null>(null)
const onChange = (v: string) => {
  setLocal(v)
  if (timeoutRef.current) clearTimeout(timeoutRef.current)
  timeoutRef.current = window.setTimeout(() => onCommit(v), 300)
}
```
**But prefer commit on blur** when you can — it is more predictable for the user.

### "How do I add validation that blocks (not just a warning)?"
Create a **hard validator** in `packages/editor-core/src/validation/hard/`. Register it in the `EditorEngine` constructor (see `EditorEngine.ts`). If your validator returns issues with severity `error`, `dispatch` returns `Result.err` and the document doesn't change.

### "Where do the tests for a new widget go?"
- **Headless** (descriptors, validators): `packages/editor-core/__tests__/`.
- **UI** (widgets, panels): `packages/editor-react/__tests__/`.

For widgets, use `@testing-library/react`. Standard pattern: render → `act(() => engine.getSession().selection.replace(...))` → `fireEvent.change` / `fireEvent.blur` → check `engine.getDocument().tree.nodes[...]`.

### "My test goes into an infinite loop"
Likely cause: `useSyncExternalStore` with a snapshot that returns a new object every time. See §"Stable cache" in the [Architecture guide](../../arquitectura/guia/#-scar-stable-cache).

---

## Checklist before a PR

```
[ ] Lint + format pass (HUSKY=0 pnpm lint:fix && pnpm format)
[ ] Typecheck passes (HUSKY=0 pnpm turbo run typecheck --force)
[ ] Tests pass (HUSKY=0 pnpm turbo run test --force)
[ ] Build passes (HUSKY=0 pnpm turbo run build --force)
[ ] You added tests covering the new case (min 2–3 it() per feature)
[ ] If you touched @core or @editor-core, consider a changeset (`pnpm changeset`)
[ ] Docs updated: if you touched user-facing behaviour, update the Editor guide;
    if you changed architecture, the Architecture guide; if you changed public APIs, this guide.
```

---

## Patterns worth knowing

### Pattern: coverage type test
If you have a string union (`type X = 'a' | 'b' | 'c'`) and want the matching runtime array:

```ts
const X_OPTIONS = ['a', 'b', 'c'] as const
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
const _check: Equals<(typeof X_OPTIONS)[number], X> = true
void _check
```

If someone adds `'d'` to the union without updating the tuple, typecheck fails.

### Pattern: exhaustive switch with `never`
```ts
switch (x.kind) {
  case 'a': ...
  case 'b': ...
  default:
    const _exhaust: never = x.kind
    void _exhaust
}
```

TypeScript flags an error if `x.kind` has an uncovered value.

### Pattern: stable cache for useSyncExternalStore
See [Architecture guide §Real-time rendering](../../arquitectura/guia/#real-time-rendering--usesyncexternalstore).

### Pattern: commit on blur
Keep local state; dispatch `onCommit` in `onBlur`. Cancel with `Escape`. Confirm with `Enter` (`e.currentTarget.blur()`).

---

## To understand the "why" behind these patterns
Read the [Architecture guide](../../arquitectura/guia/), especially the sections on the Property Registry, the manifest–descriptor gate, and the conscience–voice loop.

## To use the editor (not extend it)
Read the [Editor guide](../../editor/guia/).
