# BRIEFING — Pase de Layout L · Reestrutura UI do exemplo (estrutura north-star)

> **Para o Executor.** Autocontido, **contexto cero**. Lée todo antes de tocar.
> Se o estado real non coincide co T0, **para e reporta ao Director**.
>
> **Director:** 5º Arquitecto · **Tipo:** UI-only (chrome) · **Esforzo:** L
> **Toca @core?** ❌ **Toca @react?** ❌ · **Só `examples/react-demo/`.**
> **Sen changeset** (é un exemplo, non un paquete publicado).
> **Sign-off visual: Agarfal.** Isto é o pase **estrutural**; o pulido fino
> de espazado/cor revísao el e itérase. Acerta a **arquitectura**, non o píxel.

---

## 0. Contexto e obxectivo

`examples/react-demo/` é a app de demostración do motor de progression-graphs
**Yggdrasil Forge**. Hoxe é unha UI de "laboratorio": cabeceira co título +
`app-body` cun grid de dúas zonas — o lenzo (`tree-frame`) e un `sidebar` que
apila á vista Status, ConditionInspector, Controls e o ThemeLab como columna
permanente. Funciona, pero todo está aberto e sen xerarquía.

**Obxectivo:** reorganizar esa MESMA información na estrutura north-star
(HUD superior + lenzo maximizado + Inspector único á dereita con pestanas +
Tema como modal). **Só reorganización de chrome.** NON se toca o render dos
nodos (segue como está), NON se tocan iconos, NON se cambia a paleta. A meta de
fondo: que a UI **demostre a potencia do motor** e que quen use o repo poida
**replicala sen erros** — polo que o código novo debe quedar **limpo e
copiable** (compoñentes pequenos e claros), porque o exemplo É parte da doc.

---

## 1. ALCANCE PECHADO — incluír / non incluír

**INCLÚE (todo mapea a unha capacidade real do motor):**
- **HUD superior**: logo + tagline · tres barras de recurso reais —
  **Puntos** (`skill-points`, /18), **Piedade** (`piety`, /20),
  **Nivel** (`level`, /10, **mantendo o control +/−**) · botóns
  **Gardar / Restaurar / Tema / ?**.
- **Lenzo maximizado** + **lenda de estados** abaixo (6 estados, cores do tema) +
  **control flotante de zoom** (Fit / Reset / % / ±).
- **Inspector único á dereita con pestanas**:
  - **Node** — identidade + detalles do nodo seleccionado (label, tipo/Keystone,
    tier, descrición, coste, estado actual).
  - **Conditions** — o `ConditionInspector` actual (requisitos + exclusións).
  - **Stats** — os `stats` declarados da árbore vía `useStat` (no Paladín:
    `faith`). Iterable: vale para calquera árbore (unha GAIA mostraría o perfil
    de competencia de F9.5 — design-wide).
- **Tema como modal** (o `ThemeLab` actual dentro dun overlay que abre "Tema").
- **"?"** → modal de axuda reutilizando o contido do panel "About" existente.

**NON INCLÚE (non temos o dato — non se inventa):**
- **XP / experiencia** (o "XP 2.450/3.000" do mockup): **non existe**. O bloque
  de Nivel é a barra `level/10`, **sen sub-texto de XP**. Nada de números falsos.
- **Aspecto dos nodos** (círculos/iconos/brillo): fóra. Render como está.
- **Cambios de paleta**: reutiliza as variables CSS e a linguaxe visual actual
  (escuro/dourado). Non reinventes cores.
- Calquera valor que non saia de `engine.budget` ou dun `stat` declarado.

---

## 2. CONVENCIÓNS

- **Preserva TODA a lóxica existente** de `App.tsx`: o `engine`, os derivados
  (`skillPoints`, `pietyPoints`, `level`, `unlockedCount`, `selectedNode`,
  `themeVals`, `regionColors`, `activeRegion`, `lastAction`, `snapshotId`,
  `builtTheme`) e **todos** os handlers (`handleSnapshot`, `handleRestore`,
  `handleFit`/`handleReset`/zoom, o +/− de nivel via `engine.grantResource`,
  `onNodeClick → setSelectedNode`). **Só cambia o JSX do layout.** É refactor de
  presentación, non de comportamento.
- Biome estrito: `noExplicitAny` = error; sen `!`; `import type` para tipos; nada
  de `delete`; dot-notation. (`pnpm lint` cobre `examples/`.)
- `exactOptionalPropertyTypes`: props opcionais vía spread condicional.
- React: compoñentes funcionais, sen `<form>`. Mantén `useSyncExternalStore` para
  o estado do engine (xa en uso). Sen browser storage novo.
- **NUNCA heredocs** para `.tsx` (corrompe genéricos): `node -e fs.writeFileSync`
  ou Python (`utf-8`, `newline='\n'`).
- Clone fresco + `HUSKY=0` en bot/CI. **Cero regresión** no resto do repo.

---

## 3. T0 — VERIFICACIÓN (grep)

```bash
cd <repo>
git log -1 --oneline                       # esperado: cc8584c (F9.5)
ls examples/react-demo/src/                 # App.tsx, styles.css, ThemeLab.tsx, ConditionInspector.tsx, main.tsx, tree-def-paladin.ts
grep -n "export function ThemeLab\|onChange\|activeRegion" examples/react-demo/src/ThemeLab.tsx | head
grep -n "ConditionInspectorProps\|selectedNodeId" examples/react-demo/src/ConditionInspector.tsx | head
grep -n "fit()\|reset()\|zoomIn()\|getZoom()" packages/react/src/SkillTree.tsx
grep -n "export function useStat" packages/react/src/hooks/useStat.ts
grep -n "stats:\|id: 'faith'" examples/react-demo/src/tree-def-paladin.ts
```
Esperado: `ThemeLab` con props `{values,onChange,activeRegion,onActiveRegionChange,onRegionColorChange}`;
`ConditionInspector` con `{engine, selectedNodeId}`; `SkillTreeHandle` expón
`fit/reset/zoomIn/zoomOut/getZoom`; `useStat(engine, statId): number`; a árbore
declara `stats:[{id:'faith'...}]`. Se algo difire, **para**.

---

## 4. ARQUITECTURA OBXECTIVO

```
<div class="app">                      grid-rows: [HUD auto] [body 1fr]
  <TopHud/>                            ← logo+tagline | barras recurso | accións
  <div class="app-body">               grid-cols: [canvas 1fr] [inspector fixo ~360px]
    <div class="canvas-zone">          position: relative
      <SkillTree/>                      (igual ca agora, dentro do ThemeProvider)
      <StatesLegend/>                   ← franxa abaixo
      <ZoomControl/>                    ← flotante (abaixo-centro/dereita)
    <Inspector/>                        ← pestanas Node | Conditions | Stats
  <ThemeModal/>                         ← overlay, oculto ata abrir "Tema"
  <HelpModal/>                          ← overlay, oculto ata abrir "?"
```

### 4.1 Novos compoñentes (`examples/react-demo/src/`)

Esqueletos de referencia (a forma; o detalle visual cínguese á linguaxe actual).

**`TopHud.tsx`** — presentacional puro.
```tsx
interface ResourceBar { readonly id: string; readonly label: string; readonly value: number; readonly max: number; readonly icon?: string }
interface TopHudProps {
  readonly bars: readonly ResourceBar[]
  readonly level: number
  readonly onLevelChange: (delta: number) => void
  readonly onSave: () => void
  readonly onRestore: () => void
  readonly canRestore: boolean
  readonly onOpenTheme: () => void
  readonly onOpenHelp: () => void
}
// Layout: [logo+tagline]  [barras: label, valor/max, <progress fill = value/max>]  [accións]
// O bloque "Nivel" leva o +/− (onLevelChange(±1)).
```

**`ZoomControl.tsx`** — flotante sobre o lenzo.
```tsx
interface ZoomControlProps {
  readonly zoomPercent: number   // Math.round(getZoom()*100)
  readonly onFit: () => void
  readonly onReset: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
}
```

**`StatesLegend.tsx`** — lenda dos 6 estados.
```tsx
// Mapea estado → cor (dende themeVals/builtTheme) → chip + etiqueta.
// Estados: Bloqueado, Desbloqueable, En progreso, Completado, Máximo, Incompatible.
```

**`ThemeModal.tsx`** e **`HelpModal.tsx`** — overlays.
```tsx
interface ModalProps { readonly open: boolean; readonly onClose: () => void; readonly children: ReactNode }
// overlay escurecido + caixa + botón pechar (Esc/clic-fóra opcional). NON browser-storage.
// ThemeModal envolve o <ThemeLab .../> existente coas MESMAS props.
// HelpModal mostra o texto do antigo panel "About".
```

**`Inspector.tsx`** — Inspector con pestanas.
```tsx
type InspectorTab = 'node' | 'conditions' | 'stats'
interface InspectorProps {
  readonly engine: TreeEngine
  readonly treeDef: TreeDef          // paladinTreeDef
  readonly selectedNodeId: string | null
}
// Estado local de pestana. Renderiza:
//  - 'node'        → <NodeDetails treeDef selectedNodeId engine/>
//  - 'conditions'  → <ConditionInspector engine selectedNodeId/>   (EXISTENTE, reutilizado)
//  - 'stats'       → <StatsPanel engine treeDef/>
// Se selectedNodeId === null: estado baleiro tipo "Selecciona un nodo…".
```

**`NodeDetails.tsx`** — busca `treeDef.nodes.find(n => n.id === selectedNodeId)`
e mostra: label, tipo (small/keystone → badge), tier/maxTier, descrición, coste,
e o estado actual (`engine` instancia). Datos do node def + instancia; nada inventado.

**`StatsPanel.tsx`** — itera `treeDef.stats ?? []`. Os hooks non se chaman en
bucle: extrae unha fila.
```tsx
function StatRow({ engine, statId, label }: { engine: TreeEngine; statId: string; label: string }) {
  const value = useStat(engine, statId)         // re-render reactivo
  return <div className="stat-row"><span>{label}</span><span>{value}</span></div>
}
// StatsPanel: treeDef.stats.map(s => <StatRow key=s.id engine statId=s.id label=resolveLocalized(s.label)/>)
// Se non hai stats → "(esta árbore non declara stats)".
```

### 4.2 `App.tsx` — recablear o layout (preservando lóxica)

- Mantén intacto todo o bloque de estado/handlers/`builtTheme`.
- Engade estado local de UI: `const [themeOpen, setThemeOpen] = useState(false)` e
  `const [helpOpen, setHelpOpen] = useState(false)`.
- Substitúe o `return(...)` (cabeceira + body de dúas zonas) pola arquitectura de §4:
  - `<TopHud bars={[{id:'points',label:'Puntos',value:skillPoints,max:18}, {id:'piety',label:'Piedade',value:pietyPoints,max:20}, {id:'level',label:'Nivel',value:level,max:10}]} level={level} onLevelChange={handleLevelChange} onSave={handleSnapshot} onRestore={handleRestore} canRestore={snapshotId!==null} onOpenTheme={()=>setThemeOpen(true)} onOpenHelp={()=>setHelpOpen(true)} />`
  - `canvas-zone` co `<ThemeProvider><SkillTree .../></ThemeProvider>` **sen cambios** + `<StatesLegend/>` + `<ZoomControl zoomPercent={...} onFit={handleFit} .../>`.
  - `<Inspector engine={engine} treeDef={paladinTreeDef} selectedNodeId={selectedNode} />`.
  - `<ThemeModal open={themeOpen} onClose={()=>setThemeOpen(false)}><ThemeLab .../></ThemeModal>` (move aquí o ThemeLab coas súas props actuais).
  - `<HelpModal open={helpOpen} onClose={()=>setHelpOpen(false)}>…about…</HelpModal>`.
- `zoomPercent`: se non hai un valor reactivo, lé `treeRef.current?.getZoom()` no
  handler de zoom e gárdao en estado, ou amosa `getZoom()` ao renderizar o control.
  (Detalle menor; resólveo limpo, sen `!`.)

### 4.3 `styles.css` — reescribir o layout

- `.app`: `display:grid; grid-template-rows: auto 1fr; height:100vh`.
- `.app-body`: `display:grid; grid-template-columns: 1fr minmax(320px, 380px)`.
- `.canvas-zone`: `position:relative; overflow:hidden` (o `<SkillTree>` enche).
- HUD: fila horizontal, tres zonas (flex/space-between); barras de progreso con
  `<div class="bar"><div class="bar-fill" style=width:%/></div>`.
- Inspector: panel cunha barra de pestanas (abaixo ou arriba) + corpo scrollable.
- `ZoomControl`/`StatesLegend`: `position:absolute` dentro de `canvas-zone`.
- Modais: overlay `position:fixed; inset:0` + caixa centrada.
- **Reutiliza as variables CSS de cor/tipografía existentes.** Elimina o CSS morto
  do antigo `sidebar`/`theme-lab-column`/`panel` que xa non se use.

---

## 5. GATE

```bash
HUSKY=0
pnpm install
pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check                 # biome cobre examples/
cd examples/react-demo
pnpm typecheck                                 # tsc --noEmit, cero erros
pnpm build                                     # vite build ten que pasar
cd ../..
pnpm turbo run typecheck test --force          # cero regresión en @core/@react/etc.
```

Cobertura: o exemplo non ten suite de tests (é demo) — non se esixe cobertura
aquí. O que se esixe: **lint limpo, `tsc --noEmit` verde, `vite build` verde,
cero regresión global.**

---

## 6. ENTREGA + CHECKLIST

- Sen heredocs para `.tsx`. Un commit, mensaxe narrativa (que é o pase de layout
  L, UI-only, que preserva toda a lóxica e só reorganiza o chrome). `git format-patch -1 HEAD`.
- O Director aplica con `git am --keep-cr` en clone fresco; borra copia local do
  briefing antes.

- [ ] HUD superior con logo + 3 barras reais (Puntos/Piedade/Nivel + control +/−) + Gardar/Restaurar/Tema/?.
- [ ] Lenzo maximizado + lenda de estados + control flotante de zoom (Fit/Reset/%/±).
- [ ] Inspector dereito con pestanas Node / Conditions / Stats (Stats mostra `faith` real).
- [ ] ThemeLab dentro dun modal ("Tema"); axuda nun modal ("?").
- [ ] **Sen XP** nin ningún valor inventado; nodos sen cambiar; paleta reutilizada.
- [ ] Toda a lóxica/handlers preservados; só cambiou presentación.
- [ ] Gate verde (lint, tsc, vite build, cero regresión global).

**Tras aplicar: revisión visual de Agarfal.** Este pase fixa a estrutura; o pulido
fino (espazado, tamaños, micro-cores) decídeo el e itérase nun segundo pase.

---

*Briefing Pase Layout L · 5º Arquitecto · estrutura pre-resolta; pulido visual a sign-off de Agarfal.*
