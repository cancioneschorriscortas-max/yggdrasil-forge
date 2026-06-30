# 03 — Guía de extensión de Yggdrasil Forge

**Para devs que queren engadir capacidades ao editor.** Asume que xa entendes a arquitectura desde a [Guía 02](./02-architecture-guide.md).

Esta guía está organizada como **receitas paso a paso**. Cada receita é independente; podes empezar pola que che interese.

---

## Receitas dispoñibles

1. [Engadir un campo escalar editable no Inspector](#1-engadir-un-campo-escalar-editable-no-inspector) — o caso máis simple
2. [Engadir un sub-editor estruturado novo](#2-engadir-un-sub-editor-estruturado-novo) — listas, árbores, mapas
3. [Engadir un soft validator novo](#3-engadir-un-soft-validator-novo) — un warning en ProblemsPanel
4. [Engadir un tipo de Effect novo](#4-engadir-un-tipo-de-effect-novo) — automaticamente disponible no Inspector
5. [Engadir un PropertyType novo (kind:'duration', 'rich-text', …)](#5-engadir-un-propertytype-novo)
6. [Engadir un Command novo](#6-engadir-un-command-novo)
7. [Engadir unha Operation nova (drag con preview)](#7-engadir-unha-operation-nova-drag-con-preview)

Para cada receita: **ficheiros a tocar + código mínimo + tests recomendados + gotchas**.

---

## 1. Engadir un campo escalar editable no Inspector

**Caso de uso**: imos engadir un campo `xp` (experiencia outorgada ao desbloquear o nodo) editable como número.

### Paso 1.1 — Engadir o campo a `NodeDef`

**Ficheiro**: `packages/core/src/types/node.ts`

```ts
export interface NodeDef {
  // ... campos existentes
  readonly xp?: number    // ★ NOVO
}
```

### Paso 1.2 — Engadir o descriptor ao registry

**Ficheiro**: `packages/editor-core/src/property/nodePropertyRegistry.ts`

```ts
export const nodePropertyRegistry: readonly PropertyDescriptor[] = [
  // ... descriptors existentes
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

**Iso é todo.** O `InspectorPanel` itera o registry; o `xp` aparecera automaticamente no grupo Lóxica como NumberWidget. O commit on blur xa está integrado. Undo/redo xa funciona.

### Paso 1.3 — Tests

**Ficheiro**: `packages/editor-core/__tests__/property.test.ts`

```ts
it('xp: descriptor produce setNodeField correcto', () => {
  const desc = nodePropertyRegistry.find(d => d.key === 'xp') as PropertyDescriptor
  expect(desc.type.kind).toBe('number')
  expect(desc.get({ ...sampleNode, xp: 50 })).toBe(50)
  const cmd = desc.set('node-1', 100 as never)
  expect(cmd.type).toBe('setNodeField')
})
```

### Gotchas
- **`exactOptionalPropertyTypes`** está activo. Se o campo é opcional (`xp?:`), o `get` devolve `number | undefined`, e o descriptor xenérico `fieldDescriptor` xa o trata.
- **Non engadas o campo só ao registry sin engadilo a `NodeDef`** — TypeScript fallaría porque `setNodeField<K extends keyof NodeDef>` non admitirá a key descoñecida.
- Se o campo precisa validación (ex.: `xp >= 0`), considera engadir un **soft validator** (ver receita 3).

---

## 2. Engadir un sub-editor estruturado novo

**Caso de uso**: imos engadir un campo `tags: string[]` editable como lista de strings simples.

### Paso 2.1 — Engadir o campo a `NodeDef`

```ts
export interface NodeDef {
  readonly tags?: readonly string[]    // ★ NOVO
}
```

### Paso 2.2 — Estender `PropertyType` para o novo `of`

**Ficheiro**: `packages/editor-core/src/property/PropertyDescriptor.ts`

```ts
export type PropertyType =
  // ...
  | {
      readonly kind: 'structured'
      readonly of: 'effects' | 'prerequisites' | 'exclusions' | 'cost'
        | 'tiers' | 'costPerTier' | 'tags'    // ★ NOVO
    }
```

### Paso 2.3 — Crear o sub-editor React

**Ficheiro novo**: `packages/editor-react/src/inspector/structured/TagsEditor.tsx`

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
        <p className="editor-inspector__hint">Sen tags.</p>
      ) : (
        <ul className="editor-inspector-struct__list">
          {list.map((tag, idx) => (
            <li key={tag} className="editor-inspector-struct__row">
              <span className="editor-inspector-struct__item-id">{tag}</span>
              <button type="button"
                      className="editor-inspector-struct__remove"
                      onClick={() => removeAt(idx)}
                      aria-label={`Quitar tag ${tag}`}>×</button>
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
          placeholder="nova tag…"
        />
        <button type="button" onClick={addTag}>+</button>
      </div>
    </div>
  )
}
```

### Paso 2.4 — Despachar dende o router

**Ficheiro**: `packages/editor-react/src/inspector/structured/StructuredEditor.tsx`

```tsx
// engadir import
import { TagsEditor } from './TagsEditor.js'

// engadir case ao switch
case 'tags':
  return (
    <TagsEditor
      value={value as readonly string[] | undefined}
      onCommit={(next) => onCommit(next)}
    />
  )
```

### Paso 2.5 — Engadir o descriptor

**Ficheiro**: `packages/editor-core/src/property/nodePropertyRegistry.ts`

```ts
fieldDescriptor({
  key: 'tags',
  label: { en: 'Tags', gl: 'Tags' },
  type: { kind: 'structured', of: 'tags' },
  group: 'identity',  // ou onde corresponda
}),
```

### Paso 2.6 — Tests

```ts
// editor-react
it('TagsEditor add → setNodeField despachado', () => {
  // ... setup engine + render
  const input = screen.getByPlaceholderText(/nova tag/i)
  fireEvent.change(input, { target: { value: 'guerreiro' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(engine.getDocument().tree.nodes[0].tags).toEqual(['guerreiro'])
})
```

### Gotchas
- **Granularidade de undo**: cada add/remove é 1 setNodeField = 1 transacción. Asegúrate de NON facer setState local nin debouncing fora dos casos onde realmente o precisa (ex.: input continuo en TextWidget).
- **`key` da `<li>`**: usa o valor único (`tag`), non o `idx`. Biome lint queixarase de `key={idx}`.
- O `StructuredEditor.tsx` ten un `default: never` no switch — TypeScript falla se o teu `of` non está cuberto. Iso é a propósito.

---

## 3. Engadir un soft validator novo

**Caso de uso**: imos engadir un validator que avisa cando un nodo `keystone` non ten `effects` definidos (regra do dominio: keystones deberían facer algo).

### Paso 3.1 — Definir o validator

**Ficheiro novo**: `packages/editor-core/src/validation/soft/keystoneWithoutEffectsValidator.ts`

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

### Paso 3.2 — Rexistralo en `createDefaultValidators`

**Ficheiro**: `packages/editor-core/src/validation/createDefaultValidators.ts`

```ts
import { keystoneWithoutEffectsValidator } from './soft/keystoneWithoutEffectsValidator.js'

export function createDefaultValidators(): readonly Validator[] {
  return [
    asymmetricExclusionValidator,
    prerequisiteCycleValidator,
    layoutOverflowValidator,
    unsupportedFeatureValidator,
    keystoneWithoutEffectsValidator,    // ★ NOVO
  ]
}
```

### Paso 3.3 — Exportar do barrel (opcional, para tests externos)

**Ficheiro**: `packages/editor-core/src/index.ts`

```ts
export { keystoneWithoutEffectsValidator } from './validation/soft/keystoneWithoutEffectsValidator.js'
```

### Paso 3.4 — Tests

**Ficheiro novo**: `packages/editor-core/__tests__/keystoneWithoutEffectsValidator.test.ts`

```ts
describe('keystoneWithoutEffectsValidator', () => {
  it('detecta keystone sin effects', () => {
    const doc = buildDoc({
      nodes: [{ id: 'k1', type: 'keystone', label: 'K', /* sin effects */ }]
    })
    const issues = keystoneWithoutEffectsValidator(doc)
    expect(issues.length).toBe(1)
    expect(issues[0].code).toBe('YGG_ED_KEYSTONE_NO_EFFECTS')
    expect(issues[0].nodeId).toBe('k1')
  })

  it('non avisa de small sin effects', () => {
    const doc = buildDoc({
      nodes: [{ id: 's1', type: 'small', label: 'S' }]
    })
    expect(keystoneWithoutEffectsValidator(doc).length).toBe(0)
  })
})
```

### Resultado
- Editar a árbore → o keystone sin effects → warning aparece no panel Problems.
- Clicar o warning → o canvas selecciona `k1`, o Inspector enche cos seus campos.
- Engadir un effect → o warning desaparece **no próximo commit** (o validator re-execútase).

### Gotchas
- **Os soft validators son funcións puras** (`(doc) => issues[]`). Non muten nada, non chamen ao engine. Só lean.
- **Performance**: execútanse en cada commit. Se o teu validator é caro (ex.: BFS profundo en todos os nodos), considera caches locais cunha key estable.
- **Severity**: usa `warning` para problemas que NON rompen a árbore. Reserva `error` para casos onde a árbore é inválida pero non queres bloquear o commit (raro; case sempre prefires un validator duro).
- **Códigos**: convención `YGG_ED_<NAME>`. Único; permite filtrar.

---

## 4. Engadir un tipo de Effect novo

**Caso de uso**: imos engadir un effect `play_sound` (reproducir un son ao desbloquear).

### Paso 4.1 — Engadir á unión `Effect`

**Ficheiro**: `packages/core/src/types/effects.ts`

```ts
export type Effect =
  // ... existentes
  | { readonly type: 'play_sound'; readonly soundId: string; readonly volume?: number }
```

### Paso 4.2 — Clasificar no manifesto

**Ficheiro**: `packages/core/src/engine/supportManifest.ts`

```ts
export const SUPPORTED_EFFECT_TYPES = [
  // ... existentes
  'play_sound',    // ★ NOVO
] as const
```

**Iso é todo no @core.** O type-test do manifesto garante que `play_sound` está clasificado; se non o engades a SUPPORTED nin UNSUPPORTED, typecheck falla.

### Paso 4.3 — Implementar o runtime

**Ficheiro**: `packages/core/src/engine/EffectsRunner.ts`

```ts
case 'play_sound': {
  // executar o son (depende do consumidor; pode ser un evento bus, etc.)
  // ...
  return { effect, applied: true }
}
```

### Paso 4.4 — Engadir o mini-formulario no editor

**Ficheiro**: `packages/editor-react/src/inspector/structured/EffectsEditor.tsx`

#### 4.4.1 — `createPlainEffect`

```ts
function createPlainEffect(type: string, ...): Effect | null {
  // ... casos existentes
  case 'play_sound':
    return { type: 'play_sound', soundId: '', volume: 1 }
  // ...
}
```

#### 4.4.2 — `EffectParams` (despachador de mini-formularios)

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

### Paso 4.5 — Tests

```ts
// editor-core: gate inclúe automáticamente
it('authorablePlainEffectTypes inclúe play_sound', () => {
  expect(authorablePlainEffectTypes()).toContain('play_sound')
})

// editor-react: selector ofrece play_sound
it('selector Engadir effect inclúe play_sound', () => {
  // ... render Inspector
  const sel = screen.getByLabelText(/Engadir effect plano/i)
  const options = Array.from(sel.options).map(o => o.value)
  expect(options).toContain('play_sound')
})
```

### Resultado
- O selector "Engadir effect" no Inspector amosa automaticamente `play_sound`.
- O mini-formulario edita `soundId` e `volume`.
- O runtime aplícao en Preview (se EffectsRunner.case está implementado).

### Gotchas
- **`composite` e `conditional`** son SUPPORTED pero `authorablePlainEffectTypes` filtraos (son aniñados). Se o teu novo effect é aniñado, filtralo igual.
- Se queres que o effect sexa UNSUPPORTED (placeholder), engádeo a `UNSUPPORTED_EFFECT_TYPES` no canto. Aparecerá no `supportManifest` como `stable: false`, e **non aparecerá no Inspector** (gate).

---

## 5. Engadir un PropertyType novo

**Caso de uso**: imos engadir un `kind: 'duration'` para editar duracións ("30s", "2m", "1h30m").

### Paso 5.1 — Estender `PropertyType`

**Ficheiro**: `packages/editor-core/src/property/PropertyDescriptor.ts`

```ts
export type PropertyType =
  // ... existentes
  | { readonly kind: 'duration'; readonly min?: number; readonly max?: number }
```

### Paso 5.2 — Crear o widget React

**Ficheiro novo**: `packages/editor-react/src/inspector/widgets/DurationWidget.tsx`

```tsx
import { type JSX, useEffect, useState } from 'react'

function formatDuration(seconds: number): string { /* "30s" | "2m" | ... */ }
function parseDuration(input: string): number | null { /* "30s" → 30 | "2m" → 120 | ... */ }

export interface DurationWidgetProps {
  readonly id: string
  readonly value: number | undefined  // segundos
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

### Paso 5.3 — Despachar no InspectorPanel

**Ficheiro**: `packages/editor-react/src/inspector/InspectorPanel.tsx`

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

### Paso 5.4 — Usar no registry

```ts
fieldDescriptor({
  key: 'cooldown',
  label: { en: 'Cooldown', gl: 'Tempo de espera' },
  type: { kind: 'duration', min: 0 },
  group: 'logic',
}),
```

### Gotchas
- **`default: never` no switch** no `renderField` falla se non engades o case. Asegúrate de probar typecheck.
- O parsing/formato de duración é convencional do dominio. Documéntao no widget para que outros consumidores (Tauri, CLI) poidan replicalo.

---

## 6. Engadir un Command novo

**Caso de uso**: `setNodeField` cobre case todo. Pero ás veces precisas un command que faga **varios cambios atómicos a un só nodo** ou que toque metadata.

Imos engadir un command `renumberNodes` que renomea ids con prefixo automático.

### Paso 6.1 — Definir o command

**Ficheiro novo**: `packages/editor-core/src/command/commands/renumberNodes.ts`

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
      // Actualizar referencias: edges, prerequisites, exclusions.
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
        // prerequisites: similar, segundo schema UnlockRule.
      }
    },
  }
}
```

### Paso 6.2 — Exportar

**Ficheiro**: `packages/editor-core/src/command/commands/index.ts`

```ts
export { renumberNodes } from './renumberNodes.js'
```

### Paso 6.3 — Usar

```ts
editorEngine.dispatch(renumberNodes('node'))
// Ou nunha transacción que combine varios commands.
```

### Gotchas
- **`mutate(draft)` é Immer**. Podes usar sintaxe imperativa, pero asigna a través de cast (`(node as { id: string }).id = newId`) porque os tipos teñen `readonly`.
- **Referential integrity**: se cambias ids, **actualiza todas as referencias** (edges from/to, exclusions, prerequisites). Senon, o `referentialIntegrityValidator` (duro) bloquea o commit. Iso é unha protección.
- Para commands xenéricos como este, considera `transaction(...)` con múltiples `setNodeField` no canto — pode ser máis fácil de undoar.

---

## 7. Engadir unha Operation nova (drag con preview)

**Caso de uso**: imos imaxinar unha `ConnectOperation` — arrastras desde un nodo para crear unha aresta cara outro.

(Esta receita require coñecemento profundo do canvas; é máis adversa.)

### Paso 7.1 — Definir a Operation

**Ficheiro novo**: `packages/editor-core/src/operation/ConnectOperation.ts`

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
  let targetNodeId: string | null = null  // hit-test no update

  return {
    update(point, modifiers) {
      currentPoint = point
      // hit-test: que nodo está debaixo do cursor?
      targetNodeId = doc.tree.nodes.find(n => /* dentro do radio */ false)?.id ?? null
    },
    preview(): OperationPreview {
      return {
        // Devolve unha "edge ghost" (formato a definir)
        edgeGhost: { from: fromNodeId, toPoint: currentPoint, hoveringTarget: targetNodeId },
      }
    },
    commit(): readonly Command[] {
      if (targetNodeId === null || targetNodeId === fromNodeId) return []
      return [addEdge({ id: `e_${Date.now()}`, from: fromNodeId, to: targetNodeId })]
    },
    cancel(): void {
      // cero estado para limpar
    },
  }
}
```

### Paso 7.2 — Engadir `edgeGhost` ao `OperationPreview`

**Ficheiro**: `packages/editor-core/src/operation/Operation.ts`

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

### Paso 7.3 — UI no canvas

**Ficheiro**: `packages/editor-react/src/canvas/EditorCanvas.tsx`

A lóxica é parecida ao drag-to-move actual. Necesitarías:
- Un xesto que comece `ConnectOperation` (ex.: shift+drag dende un nodo).
- O Overlay debuxando a edge ghost (`<line>` desde `from.position` ata `currentPoint`).
- Highlight do hovering target.

**Ficheiro**: `packages/editor-react/src/canvas/CanvasOverlay.tsx`

Renderiza o edge ghost se está presente en `OperationPreview`.

### Paso 7.4 — Tests

```ts
it('★ ConnectOperation: hovering sobre nodo dispara commit válido', () => {
  const op = createConnectOperation(doc, 'foo', { x: 0, y: 0 })
  op.update({ x: 50, y: 0 }, {})  // hovering bar
  const cmds = op.commit()
  expect(cmds.length).toBe(1)
  expect(cmds[0].type).toBe('addEdge')
})

it('ConnectOperation: hovering vacío → cero commands', () => {
  const op = createConnectOperation(doc, 'foo', { x: 0, y: 0 })
  op.update({ x: 999, y: 999 }, {})
  expect(op.commit().length).toBe(0)
})
```

### Gotchas
- **A Operation é stateful** durante a interacción. Asegúrate de que `cancel()` non deixe estado colgando.
- **A Operation NON debe tocar o engine** (debe ser pura `(doc, points) → commands`). O engine só recibe os commands no `commit`.
- Os preview shape (`nodePositions`, `edgeGhost`) son convencionais. Acordáos co Overlay React. Se a complexidade crece, considera tipos específicos.

---

## Cuestións comúns

### "Cando engado un campo, o Inspector amósao mesmo se o nodo non o ten?"
Si. O Inspector itera o registry sempre, e o `descriptor.get(node)` devolve `undefined` se o nodo non ten o campo. Os widgets manexan `undefined` como valor por defecto (input baleiro, "— sen definir —" en enums, etc.). Ao editar, créase o campo no nodo.

### "Como evito spam de undo cando edito texto?"
Os widgets de texto/número/cor xa fan **commit on blur**. Se creas un widget novo continuo (slider, etc.), segue o mesmo patrón: mantén estado local, despacha `onCommit` SÓ ao perder foco (ou con debounce).

### "Como debouncing nun widget?"
```ts
const timeoutRef = useRef<number | null>(null)
const onChange = (v: string) => {
  setLocal(v)
  if (timeoutRef.current) clearTimeout(timeoutRef.current)
  timeoutRef.current = window.setTimeout(() => onCommit(v), 300)
}
```
**Pero prefere commit on blur** se podes — é máis predictible para o usuario.

### "Como engado validación que bloquea (non só warning)?"
Crea un **validator duro** en `packages/editor-core/src/validation/hard/`. Rexístrao no `EditorEngine` constructor (ver `EditorEngine.ts`). Se o teu validator devolve issues con severity `error`, o `dispatch` devolve `Result.err` e o documento non cambia.

### "Onde poño os tests dun widget novo?"
- **Headless** (descriptors, validators): `packages/editor-core/__tests__/`.
- **UI** (widgets, paneis): `packages/editor-react/__tests__/`.

Para widgets, usa `@testing-library/react`. Patrón estándar: render → `act(() => engine.getSession().selection.replace(...))` → `fireEvent.change` / `fireEvent.blur` → verificar `engine.getDocument().tree.nodes[...]`.

### "O meu test entra en bucle infinito"
Probable causa: `useSyncExternalStore` cunha snapshot que devolve obxecto novo cada vez. Ver §"Cache estable" na [Guía 02](./02-architecture-guide.md#renderización-en-tempo-real--usesyncexternalstore).

---

## Checklist antes de PR

```
[ ] Lint + format pasa (HUSKY=0 pnpm lint:fix && pnpm format)
[ ] Typecheck pasa (HUSKY=0 pnpm turbo run typecheck --force) → 36/36
[ ] Tests pasan (HUSKY=0 pnpm turbo run test --force) → 29/29
[ ] Build pasa (HUSKY=0 pnpm turbo run build --force) → 28/28
[ ] Engadiches tests cubrindo o caso novo (mín 2-3 it() por feature)
[ ] Se tocaches @core ou @editor-core, considera changeset (`pnpm changeset`)
[ ] Doc actualizada: se tocaches algo que cambia comportamento user-facing, actualiza Guía 01;
    se cambias arquitectura, actualiza Guía 02; se cambias APIs públicas, actualiza Guía 03 (esta).
```

---

## Patróns que pagan a pena coñecer

### Pattern: type-test de cobertura
Se tes unha union de strings (`type X = 'a' | 'b' | 'c'`) e queres ter o array runtime correspondente:

```ts
const X_OPTIONS = ['a', 'b', 'c'] as const
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
const _check: Equals<(typeof X_OPTIONS)[number], X> = true
void _check
```

Se alguén engade `'d'` á union sin actualizar a tupla, typecheck falla.

### Pattern: switch exhaustivo con `never`
```ts
switch (x.kind) {
  case 'a': ...
  case 'b': ...
  default:
    const _exhaust: never = x.kind
    void _exhaust
}
```

TypeScript marca erro se `x.kind` ten un valor non cuberto.

### Pattern: cache estable para useSyncExternalStore
Ver [Guía 02 §Renderización](./02-architecture-guide.md#renderización-en-tempo-real--usesyncexternalstore).

### Pattern: command on blur
Mantén estado local; despacha `onCommit` no `onBlur`. Cancela co `Escape`. Confirma co `Enter` (`e.currentTarget.blur()`).

---

## Para entender o "porqué" detrás destes patróns
Le a [Guía 02 — Arquitectura](./02-architecture-guide.md), especialmente as seccións sobre Property Registry, gate manifesto-descriptor, e o loop conciencia-voz.

## Para usar o editor (non extendelo)
Le a [Guía 01 — Editor](./01-editor-user-guide.md).
