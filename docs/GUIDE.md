# Yggdrasil Forge — Guía de integración (cookbook)

> **Doc vivo para consumidores.** Como integrar Yggdrasil Forge nun proxecto:
> compatibilidades, e exemplos pequenos de «como fago X». Aforra tempo a quen
> clona (humano ou IA). Complementa —non substitúe— a `MASTER.md` (o *por que*
> interno das decisións) e o `RENDERER-STATE.md` (estado interno do renderer).
>
> **Mantéheno actualizado en cada sub-fase que cambie a API pública.**
> _Última actualización: post UI polish (`origin/main` @ `483d778`) — Renderer
> sub-fase 1, regions, level system, exclusións bidireccionais (A.6.30),
> paleta distinguible e Inspector con relación de incompatibilidade._

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

> Outros paquetes opcionais (`analytics`, `cli`, `devtools`, `diff`, `exporters`,
> `heatmap`, `i18n`, `multitenancy`, `neo4j`, `plugins`, `search`, `stats`,
> `themes`, `validators`, `webhooks`) cobren casos avanzados. A maioría dos
> proxectos só precisa `core` + `react` + `storage`.

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
- 🚪 **Tres entry points** (ver §10): `.` (con tema por defecto), `./headless`
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

// Conceder ou retirar recursos en runtime (XP, nivel, ouro, mana...):
engine.grantResource('level', +1)   // sobe 1 nivel; clampea a resource.max
engine.grantResource('level', -1)   // baixa 1 nivel; clampea a 0
engine.grantResource('xp', 250)     // engade XP; emite budgetChange se cambia
// Devolve Result<{ resourceId, previous, current }>.
// Recurso descoñecido → err(UNKNOWN_RESOURCE).
// Combinado con prerequisites `resource_min`, gata nodos por valor:
//   { type: 'resource_min', resourceId: 'level', amount: 10 }
// O Inspector explica automaticamente "Necesitas 10 en level, tes 3 ✗".
//
// Importante (lección A.6.28): os prereqs son PORTAS EN UNLOCK, non
// invariantes continuos. Se desbloqueas un nodo con `resource_min(level, 10)`
// e despois baixas o nivel a 1, o nodo NON se re-bloquea automaticamente.
// O motor verifica prereqs no momento de unlock e a partir de aí o estado
// é persistente. Para "volver a bloquear" usa `lock()` ou `lockOneTier()`
// explicitamente.

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

// Incompatibilidades reais dun nodo (exclusións bidireccionais):
const conflicts = engine.getEffectiveExclusions('paladin')
// readonly string[] — devolve TODOS os nodos cuxa unlock é incompatible:
// - Os que `paladin.exclusions` declara directamente.
// - Os que declaran `paladin` no seu propio `exclusions` (relación inversa).
//
// As exclusións son SIMÉTRICAS: declarar `A.exclusions = ['B']` xa garante
// que A e B nunca coexisten, en calquera orde. Non precisas duplicar a
// declaración no TreeDef. O motor calcula a simetría automaticamente vía
// un índice inverso construído ao crear o engine (lección MASTER A.6.30).

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

### Rexións visuais (cor por columna)

Para distinguir agrupacións lóxicas da árbore (ramas, escolas, columnas)
sen tocar o motor, podes pasar `regions` a `<SkillTree>`. Cada rexión é
un grupo de nodos identificados por un **tag** no seu `NodeDef.tags`,
e píntase como un `<rect>` con tinte de fondo detrás dos edges/nodos.

```ts
import type { RegionSpec } from '@yggdrasil-forge/react'

const regions: RegionSpec[] = [
  { id: 'warrior', label: 'Guerreiro', tag: 'warrior', color: '#c1442e' },
  { id: 'paladin', label: 'Paladín',   tag: 'paladin', color: '#d4a017' },
  { id: 'cleric',  label: 'Clérigo',   tag: 'cleric',  color: '#3a7ec7' },
]

// Os nodos do TreeDef declaran os tags:
{ id: 'sword-basics', tags: ['warrior'], /* ... */ }
{ id: 'holy-light',   tags: ['cleric'],  /* ... */ }

<SkillTree engine={engine} regions={regions} />
```

- **`RegionSpec`**: `{ id, label, tag, color }`. `tag` debe coincidir cun
  valor incluído en `NodeDef.tags`.
- O bbox calcúlase automaticamente envolvendo tódolos nodos con ese tag,
  con padding configurable (default 32).
- Render: tinte de baixa opacidade (~0.12) detrás dos edges/nodos. Z-order:
  rexións → edges → nodos. `pointerEvents="none"` para non interferir
  con clics.
- Sen rexións (ou array baleiro) → cero render extra (cero regresión).
- Cero schema en `@core`: é unha capa de presentación sobre os tags xa
  existentes do TreeDef.

### Construtor interactivo (➕/➖ por nodo)

Para construír árbores **punto a punto** (como en Path of Exile / Diablo):

```tsx
<SkillTree
  engine={engine}
  selectedNodeId={selected ?? undefined}
  onNodeClick={(id) => setSelected(id)}
  // Badge visible "1/3" na esquina inferior dereita do nodo:
  showTierBadge
  // ➕ aparece ao lado do nodo seleccionado, sube tier+1:
  onNodeTierIncrease={(id) => void engine.unlock(id)}
  // ➖ aparece tamén, baixa tier-1 e devolve o punto:
  onNodeTierDecrease={(id) => void engine.lockOneTier(id)}
  // Hint visual de afordabilidade (sen prereqs / sen budget → ➕ disabled):
  canIncrease={(id) => engine.canUnlock(id).ok && engine.canUnlock(id).value.allowed}
/>
```

- **`showTierBadge`**: `true` forza badge en todos os nodos; `false` apágao;
  ausente = só multi-tier (`maxTier > 1`).
- **`onNodeTierIncrease` / `onNodeTierDecrease`**: callbacks puros; o
  `SkillTree` non chama ao motor (cero acoplamento). Ti cableas a `unlock` /
  `lockOneTier`.
- **`canIncrease`**: predicado opcional que disabilita ➕ visualmente cando
  devolve `false`. Default: ➕ activo sempre que `currentTier < maxTier`.
- Os botóns aparecen **só** se hai `selectedNodeId` E algún dos dous callbacks
  está presente. Renderízanse como SVG nativo dentro do viewport (móvense co
  pan/zoom). Disabled automaticamente en bordes (➖ en tier 0, ➕ en maxed).
- **Importante**: para que `lockOneTier` devolva puntos ao budget, declara
  `refundable: true` no Resource do TreeDef:
  ```ts
  resources: [{ id: 'pts', label: 'Points', initial: 18, max: 18, refundable: true }]
  ```

## 5. Localización de mensaxes do motor

**O motor é locale-agnostic na construción de reasons**. As mensaxes que
devolven `canUnlock().reason` e `explainUnlock().conditions[].reason` veñen
en `LocalizedValue` (dict `{ gl, es, en, ... }`), pero **inclúen `resourceId`
crus** entre comiñas — non labels localizados — porque o motor non sabe
que locale usa o consumidor para os labels dos recursos.

Exemplo: o motor xera `'Necesítanse 10 de "level", tes 1'` (con `"level"`
en cru). O consumidor é responsable de substituír `"level"` polo label
localizado `"Nivel"` antes de mostralo.

Patrón do demo (`examples/react-demo/src/ConditionInspector.tsx`):

```ts
function localizeResourceIds(
  reason: string,
  resources: ReadonlyArray<{ id: string; label?: LocalizedValue }>,
  locale: string,
): string {
  let out = reason
  for (const r of resources ?? []) {
    const label = resolveLocalized(r.label, locale, r.id)
    if (label === r.id) continue
    out = out.split(`"${r.id}"`).join(`"${label}"`)
  }
  return out
}

// Aplica antes de renderer:
<span>{localizeResourceIds(reasonText, treeDef.resources, locale)}</span>
```

Decisión arquitectónica: a localización **vive na capa de presentación**
(o consumidor) porque é onde se coñece o locale do usuario. Acoplar o
motor ao locale obrigaría a recompilar mensaxes en cada cambio. Esta
separación é deliberada.

## 6. Tematización

> **Movido á documentación pública (16.1).** A guía completa de theming —
> tema do renderer (`ThemeProvider`), recheos por estado, tema do documento
> (`editor.theme`), presets con nome e a costura chrome↔documento — vive en
> **https://cancioneschorriscortas-max.github.io/yggdrasil-forge/theming/**
> (fonte: `docs-site/src/content/docs/theming/index.md`).

## 7. Iconos (SVG recoloreables)

> **Movido á documentación pública (16.1).** Sets `BUILTIN`, `NORSE_ICONS` e
> `LOGIC_ICONS` (opt-in), iconas propias con `registerIcons` e fallbacks:
> **https://cancioneschorriscortas-max.github.io/yggdrasil-forge/theming/#4-iconas-svg-recoloreables**.

## 8. Edges (xeometría = contrato de datos)

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

## 9. Viewport (pan / zoom / fit)

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

## 10. Entry points: cal usar

| Import | Cando |
|---|---|
| `@yggdrasil-forge/react` | Por defecto. `<SkillTree>` autoaplica `minimal` se non hai `ThemeProvider` ascendente. |
| `@yggdrasil-forge/react/headless` | Control total: cero autoload de tema; ti provés todo. |
| `@yggdrasil-forge/react/server` | SSR. |

> **Boa práctica:** importa todo do **mesmo** entry point nun proxecto. (O
> `ThemeContext` é un singleton cross-bundle, así que mesturar non rompe, pero
> usar un só entry evita sorpresas e bundles duplicados.)

## 11. Gotchas / compatibilidade (resumo)

- **React 19** obrigatorio (peer). React 18 → erro de tipos `ReactNode`/`bigint`.
- **Unha versión de `@types/react`** (`pnpm why @types/react`). Dúas rompen refs.
- **Monorepo**: `workspace:*` + `catalog:` para deps internas e React.
- **Iconsets temáticos = opt-in** (`registerIcons(...)`); só os builtins
  auto-cárganse.
- **SSR**: usa `./server`; o viewport mide tamaño só en cliente (effects).
- **Tematizar**: usa `ThemeProvider` (Context) + `useTheme` inline; **non**
  dependas de CSS vars nun `<style>` interno (modelo antigo, descartado).
- **Prereqs son portas, non invariantes** (lección A.6.28): unha vez que un
  nodo está unlocked, baixar un recurso por debaixo do `resource_min` que o
  gataba NON o re-bloquea automaticamente. O motor só comproba prereqs no
  momento de `unlock()`. Usa `lock()` ou `lockOneTier()` para reverter.
- **Exclusións son simétricas** (lección A.6.30): declarar `A.exclusions=['B']`
  abonda; o motor garante que A e B nunca coexisten **en calquera orde**.
  Non precisas duplicar a declaración en `B.exclusions`. Para consultar a
  unión de exclusións declaradas + inversas usa `getEffectiveExclusions(id)`.
- **Mensaxes do motor en cru**: `canUnlock().reason` e os reasons de
  `explainUnlock()` traen `resourceId`s sen localizar (ex. `"level"` en vez
  de `"Nivel"`). É deliberado — ver §5 para o patrón de localización.
- **`NodeDef.color` gana sempre** sobre `nodeFill<State>` no resolvedor de
  fill (lección A.6.17). Útil para identidade temática (ex. un Pacto Escuro
  morado en calquera tema); ten en conta que iso fai que o nodo se vexa
  igual mesmo cando está locked. Para apagar a cor en certos estados haberá
  que modular `node.color` por estado (sub-fase futura).

## 12. Estado e roadmap

Renderer 2.0 **completo a nivel funcional**:

- ✅ Átomos: node + edge + iconos + viewport (zoom/pan/fit, F10.6).
- ✅ Selección, hover e foco de teclado (F10.7).
- ✅ Tema ampliado: `background`, `surface`, `typography`, `selected`,
  fill por estado (F10.8 + Renderer sub-fase 1).
- ✅ Rexións visuais (cor por columna / tag, Capa 2).
- ✅ Construtor interactivo (➕/➖ por nodo, badges de tier).
- ✅ Sistema de nivel showcaseado no demo (recurso `level` + `grantResource` +
  gates `resource_min`).
- ✅ Exclusións simétricas (BUGFIX A.6.30 + `getEffectiveExclusions`).
- ✅ Paleta de estados distinguible no demo (gris/cián/ámbar/verde +
  reserva de cor de identidade).

Backlog principal:
- **Pulido de columnas e labels** (Briefing 4 pendente do Director).
- **Tema fantasía AAA** (mockup norte bancado polo Director).
- **`node.color` modulable por estado** (deferida en Nivel · Capa B §5).
- **Logic iconset (Capa 1A)**: 19 iconos pulidos para showcase de
  prerequisitos; ver `tools/icon-preview/` para o material listo a bancar.
- **Editor visual / Studio**: roadmap a medio prazo.

Para o estado interno detallado e o by-design do renderer, mira
`docs/architecture/RENDERER-STATE.md`. Para as leccións de arquitectura
(A.6.x), `docs/architecture/MASTER.md`.

---

*Guía de integración. Doc vivo — actualízao cando cambie a API pública. 🌳*
