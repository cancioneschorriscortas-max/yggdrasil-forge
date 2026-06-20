# Yggdrasil Forge — Guía de integración (cookbook)

> **Doc vivo para consumidores.** Como integrar Yggdrasil Forge nun proxecto:
> compatibilidades, e exemplos pequenos de «como fago X». Aforra tempo a quen
> clona (humano ou IA). Complementa —non substitúe— a `MASTER.md` (o *por que*
> interno das decisións) e o `RENDERER-STATE.md` (estado interno do renderer).
>
> **Mantéheno actualizado en cada sub-fase que cambie a API pública.**
> _Última actualización: tras Showcase Capa 0 (`explainUnlock` exposto)._

---

## 1. Que é, e os paquetes

Motor de **grafos de progresión** (skill trees / tech trees / árbores de
aprendizaxe). O motor (`@yggdrasil-forge/core`) é independente da UI; o render
React (`@yggdrasil-forge/react`) consómeo. Contrato entre ambos = un `TreeDef`
(JSON).

| Paquete | Para que |
|---|---|
| `@yggdrasil-forge/core` | `TreeEngine`, tipos (`TreeDef`, `NodeDef`, `EdgeDef`…), layout |
| `@yggdrasil-forge/react` | `<SkillTree>`, tema, iconos, viewport (render SVG) |
| `@yggdrasil-forge/storage` | persistencia (`MemoryStorage`, etc.) |
| `@yggdrasil-forge/importers` | importar datos externos a `TreeDef` |
| `@yggdrasil-forge/common` | `SCHEMA_VERSION` e utilidades compartidas |

## 2. Instalación e **compatibilidades** (le isto antes)

```bash
pnpm add @yggdrasil-forge/core @yggdrasil-forge/react @yggdrasil-forge/storage
```

- ⚠️ **React 19 obrigatorio.** `peerDependencies`: `react ^19`, `react-dom ^19`.
  En React 18 fallará o typecheck (o tipo `ReactNode` difire: R19 inclúe
  `bigint`). Os compoñentes con `forwardRef` (ex. `<SkillTree>`) expoñen ese
  tipo público.
- 🧩 **Unha soa versión de `@types/react`.** Nun monorepo, comproba
  `pnpm why @types/react` → debe saír **unha**. Dúas versións rompen os tipos
  de `forwardRef`/refs. Usa `catalog:` (pnpm) para fixala.
- 🔗 **No monorepo, usa `workspace:*`** para deps `@yggdrasil-forge/*` (pnpm
  resolve por symlink local; con `^x.y.z` literal tenta o rexistro, onde quizais
  a versión aínda non está publicada).
- 📦 **ESM + CJS** ambos soportados (`import`/`require`).
- 🚪 **Tres entry points** (ver §9): `.` (con tema por defecto), `./headless`
  (sen autoload de tema), `./server` (SSR).

## 3. Quickstart (mínimo copiable)

```tsx
import { TreeEngine } from '@yggdrasil-forge/core'
import type { TreeDef } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import { SkillTree, ThemeProvider, minimal } from '@yggdrasil-forge/react'
import { useState } from 'react'

const tree: TreeDef = {
  id: 'demo',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { en: 'Demo' },
  rootNodeId: 'root',
  layout: { type: 'tree', curve: 'diagonal-vertical' },
  nodes: [
    { id: 'root', type: 'root', label: { en: 'Start' } },
    {
      id: 'a',
      type: 'notable',
      label: { en: 'Skill A' },
      prerequisites: { type: 'node_unlocked', nodeId: 'root' },
    },
  ],
}

export function App(): JSX.Element {
  const [engine] = useState(() => new TreeEngine(tree, { storage: new MemoryStorage() }))
  return (
    <ThemeProvider theme={minimal}>
      <SkillTree engine={engine} />
    </ThemeProvider>
  )
}
```

## 4. Estados e interacción

```tsx
// Estado dun nodo (NodeInstance | null; o estado en .state):
const state = engine.getNodeState('a')?.state
// 'locked' | 'unlockable' | 'in_progress' | 'unlocked' | 'maxed'

// Desbloquear / bloquear (devolven un resultado que podes inspeccionar):
engine.unlock('a')         // sobe currentTier en 1 (gasta o custo do tier)
engine.lock('a')           // reseta o nodo enteiro (currentTier → 0, refunde TODO)
engine.lockOneTier('a')    // decrementa currentTier en 1 (refunde só ese tier).
                           // Útil para construtores interactivos con ➕/➖.
                           // Require currentTier >= 1; senón err(INVALID_NODE_STATE).
                           // Importante: os recursos deben ter `refundable: true`
                           // no TreeDef para que os puntos volvan ao budget.

// Re-render ao cambiar o engine:
const unsub = engine.subscribe(() => { /* setState para forzar render */ })
// ...máis tarde: unsub()

// Veredicto único (¿pode desbloquearse agora?):
const check = engine.canUnlock('paladin')
// Result<{allowed: boolean, reason?: string}>

// Explicación por-condición (¿que falta para desbloquear?):
const explanation = engine.explainUnlock('paladin')
if (explanation.ok) {
  for (const cond of explanation.value.conditions) {
    console.log(cond.satisfied ? '✓' : '✗', cond)
  }
}
// Útil para tooltips, panel «Inspector de Condicións», devtools.
// Diferenzas vs `canUnlock`:
// - `canUnlock`: veredicto único + corta por estado (maxed/unlocked).
// - `explainUnlock`: lista detallada + sempre informa dos prereqs.

// Clic nun nodo (no compoñente):
<SkillTree engine={engine} onNodeClick={(id) => engine.unlock(id)} />
```

> Patrón típico: `useState`/`useReducer` no contedor + `engine.subscribe` nun
> `useEffect` que forza re-render cando cambia o estado do engine.

### Selección, hover e foco de teclado (F10.7)

`<SkillTree>` é **controlado** pola túa selección — non garda estado interno:

```tsx
const [selected, setSelected] = useState<string | null>(null)

<SkillTree
  engine={engine}
  selectedNodeId={selected ?? undefined}     // anel de selección visible
  onNodeClick={(id) => setSelected(id)}      // ti controlas que pasa ao clicar
  onNodeHover={(id) => { /* tooltip, panel lateral, ... */ }}
/>
```

- **`selectedNodeId`**: o nodo cuxo id coincida amósase con anel exterior
  themed (`theme.colors.selected`).
- **Hover**: pasa o rato e aparece unha afordancia sutil + cursor de man
  (cando o nodo é interactivo, é dicir, hai `onNodeClick`).
- **Teclado**: os nodos son `role="button"` con `tabIndex` automático cando
  son interactivos. Tab para navegar entre eles; Enter/Espazo para activar.
  Aparece un anel de foco (dashed) themed.
- **`onNodeHover`**: callback opcional `(nodeId: string | null) => void`.
  Recibe o id ao entrar, `null` ao saír. Ortogonal a `selectedNodeId` (decides
  ti se hover muta selección, abre tooltip, etc.).

## 5. Tematización

O tema aplícase por **inline style desde `useTheme()`** (alta prioridade, sen
problemas de cascada). Provéelo cun `ThemeProvider`:

```tsx
import { ThemeProvider } from '@yggdrasil-forge/react'
import type { Theme } from '@yggdrasil-forge/react'

const dark: Theme = {
  colors: {
    background: '#11131a',      // fondo do canvas SVG (F10.8; opcional)
    surface: '#1c2030',         // «tarxeta» detrás da árbore (F10.8; opcional)
    text: '#e6d5a8',
    nodeFill: '#2a2f3d',        // interior do orbe
    nodeLocked: '#5b6b86',
    nodeUnlockable: '#e0a93c',
    nodeUnlocked: '#6fcf97',
    nodeMaxed: '#f0c14b',
    nodeInProgress: '#e08a3c',
    nodeStroke: '#5b6b86',
    edge: '#46506b',
    edgeActive: '#00e0ff',      // edge "aceso" (opcional)
    icon: '#e6d5a8',            // cor dos iconos (opcional; fallback a text)
    selected: '#bb86fc',        // anel de selección/foco (opcional; fallback a nodeUnlockable)
    mesh: 'rgba(148,163,184,0.08)',
  },
  sizes: { strokeWidth: 2.5, fontSize: 14, fontSizeSmall: 11, ringWidth: 3 },
  typography: {                 // tipografía dos labels (F10.8; todo opcional)
    fontFamily: '"Cinzel", serif',
    fontWeight: 600,
    letterSpacing: '0.04em',
    // textTransform: 'uppercase',
  },
}

<ThemeProvider theme={dark}><SkillTree engine={engine} /></ThemeProvider>
```

- Campos opcionais (`background`, `surface`, `nodeFill`, `edgeActive`, `icon`,
  `selected`, `ringWidth`, `typography`) teñen fallback sensato → un tema
  mínimo só precisa `text` + as cores de estado.
- `colors.background` aplícase **inline** ao `<svg>` (vía fiable post-F10.8;
  cero CSS vars).
- `colors.surface` debuxa unha «tarxeta» de fondo cubrindo o viewBox (panel
  composible completo virá en F12).
- `typography` aplícase aos `<text>` dos labels. Lembra cargar a fonte (`@import`
  ou `<link>` do Google Fonts, etc.) antes de pasarlla ao tema.
- Para experimentar paletas en vivo, mira o **Theme Lab** do demo
  (`examples/react-demo`): sliders + presets + «copiar valores».

## 6. Iconos (SVG recoloreables)

`node.icon` é un **ID de rexistro** (con fallback a emoji/char ou URL→imaxe).

```tsx
import { registerIcons, BUILTIN_ICONS, NORSE_ICONS } from '@yggdrasil-forge/react'
import type { IconDef } from '@yggdrasil-forge/react'

// BUILTIN_ICONS auto-rexístranse. Os sets temáticos son OPT-IN:
registerIcons(NORSE_ICONS)          // antes do primeiro render

// Icona propia (recolorea co tema vía currentColor):
const myIcon: IconDef = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M4 4 L20 20 M20 4 L4 20', mode: 'stroke' }], // 'stroke' | 'fill'
}
registerIcons({ 'my-x': myIcon })

// Úsao no TreeDef:
// { id: 'a', icon: 'my-x', ... }   // ou 'norse-mjolnir', ou '⚔' (fallback)
```

- **Por que opt-in os sets temáticos:** byte-cost; o paquete base só carga os
  esenciais. Calquera set (norse, e os que veñan) expórtase como data pura.

## 7. Edges (xeometría = contrato de datos)

A **curva e o routing viaxan no `TreeDef`** (para que calquera renderer/editor
os respecten), non só na UI:

```ts
// Curva por defecto de toda a árbore:
layout: { type: 'tree', curve: 'diagonal-vertical' }
// CurveStyle: 'straight' | 'diagonal-vertical' | 'diagonal-horizontal' | 'radial' | 'orthogonal'

// Override por-edge + frecha dirixida:
edges: [
  { id: 'e1', source: 'root', target: 'a',
    style: { routing: 'orthogonal', directed: true } },
]
```

- **Estado do edge**: os edges que saen de nodos desbloqueados «acéndense»
  (`edgeActive`); o resto van apagados. Automático segundo os estados.
- `orthogonal` (ángulos rectos) é ideal para estilo tech-tree/Civilization;
  para árbores radiais de fantasía, usa `diagonal-*`/`radial`.
- Override de presentación (non recomendado salvo casos puntuais): o prop
  `<SkillTree curve="...">` gaña sobre `layout.curve`.

## 8. Viewport (pan / zoom / fit)

Pan (arrastrar) e wheel-zoom van de serie; expón un **handle imperativo** para
botóns:

```tsx
import { SkillTree } from '@yggdrasil-forge/react'
import type { SkillTreeHandle } from '@yggdrasil-forge/react'
import { useRef } from 'react'

const ref = useRef<SkillTreeHandle>(null)

<SkillTree ref={ref} engine={engine} minZoom={0.25} maxZoom={4} fitOnMount />

<button onClick={() => ref.current?.fit()}>Fit</button>
<button onClick={() => ref.current?.reset()}>Reset</button>
<button onClick={() => ref.current?.zoomIn()}>+</button>
<button onClick={() => ref.current?.zoomOut()}>−</button>
```

## 9. Entry points: cal usar

| Import | Cando |
|---|---|
| `@yggdrasil-forge/react` | Por defecto. `<SkillTree>` autoaplica `minimal` se non hai `ThemeProvider` ascendente. |
| `@yggdrasil-forge/react/headless` | Control total: cero autoload de tema; ti provés todo. |
| `@yggdrasil-forge/react/server` | SSR. |

> **Boa práctica:** importa todo do **mesmo** entry point nun proxecto. (O
> `ThemeContext` é un singleton cross-bundle, así que mesturar non rompe, pero
> usar un só entry evita sorpresas e bundles duplicados.)

## 10. Gotchas / compatibilidade (resumo)

- **React 19** obrigatorio (peer). React 18 → erro de tipos `ReactNode`/`bigint`.
- **Unha versión de `@types/react`** (`pnpm why @types/react`). Dúas rompen refs.
- **Monorepo**: `workspace:*` + `catalog:` para deps internas e React.
- **Iconsets temáticos = opt-in** (`registerIcons(...)`); só os builtins
  auto-cárganse.
- **SSR**: usa `./server`; o viewport mide tamaño só en cliente (effects).
- **Tematizar**: usa `ThemeProvider` (Context) + `useTheme` inline; **non**
  dependas de CSS vars nun `<style>` interno (modelo antigo, descartado).

## 11. Estado e roadmap

Renderer 2.0 (átomos node+edge+iconos+viewport) **funcionalmente completo**.
Para o estado detallado e o backlog (10.7 selección/hover, 10.8 tema ampliado,
tema fantasía AAA, editor visual…), mira `docs/architecture/RENDERER-STATE.md`.

---

*Guía de integración. Doc vivo — actualízao cando cambie a API pública. 🌳*
