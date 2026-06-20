# BRIEFING — Showcase · Capa 1a (`TreeDef` do Paladín + estado inicial)

> **4º Arquitecto (Director) → Executor.**
> Primeira capa visible do showcase «O Paladín». Báncase a **árbore** (13 nodos,
> 11 capacidades do motor) como `TreeDef` **válido** (campos verificados contra o
> union real de `UnlockCondition`), con **layout `custom`** (posicións manuais =
> reproduce o mockup a 3 columnas) e un **estado inicial** que reproduce a foto
> do north-star. Faise a **árbore activa** do demo (o `rpgTreeDef` queda no
> ficheiro; o toggle multi-exemplo é unha micro-fase posterior). **Sen tema
> Paladín nin panel aínda** (eses son Capa 1b e 1c). **Human visual check.**
> Examples NON se publican → **sen changeset**.

---

## 1. Estado á entrada (verificado polo Director, HEAD `0a8900d`)

- `Cost = { resourceId: string; amount: number }`.
- `unlock(nodeId)` é **async** (`Promise<Result<UnlockResult>>`); con `maxTier`
  definido **incrementa tier** mentres `currentTier < maxTier` → estado inicial
  = `await unlock` repetido.
- `IdentityLayout` rexístrase baixo `type: 'custom'` e **copia `NodeDef.position`**
  tal cal (confírmao en T0).
- Demo (`examples/react-demo/src/`): `App.tsx`, `tree-def.ts` (exporta
  `rpgTreeDef`, `longLabels`), `theme.ts`, `ThemeLab.tsx`. `App` fai
  `new TreeEngine(rpgTreeDef, { storage })` e renderiza `<ThemeProvider><SkillTree
  engine ref selectedNodeId .../></ThemeProvider>`.
- **Campos de condición verificados** (union real):
  `node_unlocked{nodeId}`, `node_maxed{nodeId}`, `node_state{nodeId,state}`,
  `nodes_count{count,scope?}`, `tier_min{nodeId,tier}`, `stat_min{statId,amount}`,
  combinadores `{type:'all'|'any'|'none', conditions: UnlockCondition[]}`.

## 2. Modelo (resolucións de Director, xa pechadas)

1. **Fe = `StatDef`** (`initial:6` + contribucións de nodos); **Piedade =
   `Resource`** (`initial:7,max:20`); custos = `cost:[{resourceId:'piety',amount:3}]`.
2. **Nodo `smite`** (Golpe Divino) engadido na rama Clérigo (13º nodo).
3. **`nodes_count` con `scope:'warrior'`** (tag) → Veterano conta só a rama.
4. **Layout `custom`** con `position` por nodo.

## 3. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs). exactOptional,
> noUncheckedIndexedAccess, sen `any`, sen `!`.

### T0 — Preflight + GREP
HEAD `0a8900d`. Identidade git. GREP e reporta:
- `IdentityLayout` rexistrado para `type:'custom'` e que usa `NodeDef.position`.
- `SCHEMA_VERSION` de `@common` (import que usa `rpgTreeDef`).
- Forma de `TreeEngine` ctor + `engine.unlock` async + como `App.tsx`
  referencia `rpgTreeDef` (para substituír pola árbore activa sen romper o
  status panel / botóns).
- Validador dispoñible (`validateTreeDef` ou similar) para o test de T3.

### T1 — `examples/react-demo/src/tree-def-paladin.ts`
Crear o ficheiro coa árbore **exacta** (copia literal; os campos están verificados):

```typescript
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { TreeDef, TreeEngine } from '@yggdrasil-forge/core'

export const paladinTreeDef: TreeDef = {
  id: 'el-paladin',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: { gl: 'O Paladín', es: 'El Paladín', en: 'The Paladin' },
  description: {
    gl: 'Un guerreiro que domina a Espada e a Fe. Só quen avanza en ambos camiños alcanza o Paladín puro. Ninguén pode ser á vez Paladín e Herexe.',
    es: 'Un guerrero que domina la Espada y la Fe. Solo quien avanza en ambos caminos alcanza al Paladín puro. Nadie puede ser a la vez Paladín y Hereje.',
    en: 'A warrior who masters Sword and Faith. Only those who advance both paths reach the pure Paladin. None may be both Paladin and Heretic.',
  },
  rootNodeId: 'sword-basics',
  stats: [
    { id: 'faith', label: { gl: 'Fe', es: 'Fe', en: 'Faith' }, initial: 6, format: 'number' },
  ],
  resources: [
    { id: 'piety', label: { gl: 'Piedade', es: 'Piedad', en: 'Piety' }, initial: 7, max: 20, icon: '💧', color: '#4aa3df' },
  ],
  startingBudget: { resources: { piety: 7 } },
  layout: { type: 'custom', curve: 'diagonal-vertical' },
  nodes: [
    { id: 'sword-basics', type: 'notable', shape: 'circle', maxTier: 3,
      label: { gl: 'Esgrima Básica', es: 'Esgrima Básica', en: 'Basic Fencing' },
      icon: 'sword', tags: ['warrior'], position: { x: 80, y: 40 } },
    { id: 'shield-wall', type: 'notable', shape: 'circle', maxTier: 2,
      label: { gl: 'Muro de Escudos', es: 'Muro de Escudos', en: 'Shield Wall' },
      icon: 'shield', tags: ['warrior'], position: { x: 80, y: 190 },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-basics' } },
    { id: 'berserker-rage', type: 'notable', shape: 'circle', maxTier: 1,
      label: { gl: 'Furia Berserker', es: 'Furia Berserker', en: 'Berserker Rage' },
      icon: 'norse-axe', tags: ['warrior'], position: { x: 80, y: 340 },
      prerequisites: { type: 'node_maxed', nodeId: 'sword-basics' } },
    { id: 'war-veteran', type: 'notable', shape: 'circle', maxTier: 1,
      label: { gl: 'Veterano de Guerra', es: 'Veterano de Guerra', en: 'War Veteran' },
      icon: 'helmet', tags: ['warrior'], position: { x: 80, y: 490 },
      prerequisites: { type: 'nodes_count', count: 4, scope: 'warrior' } },
    { id: 'holy-warrior', type: 'keystone', shape: 'hexagon', maxTier: 1,
      label: { gl: 'Guerreiro Sagrado', es: 'Guerrero Sagrado', en: 'Holy Warrior' },
      icon: 'paladin-cross', position: { x: 360, y: 115 },
      prerequisites: { type: 'all', conditions: [
        { type: 'node_unlocked', nodeId: 'shield-wall' },
        { type: 'node_unlocked', nodeId: 'healing-hands' },
      ] } },
    { id: 'champion-of-light', type: 'keystone', shape: 'hexagon', maxTier: 2,
      label: { gl: 'Campeón da Luz', es: 'Campeón de la Luz', en: 'Champion of Light' },
      icon: 'radiant-sun', position: { x: 360, y: 265 },
      prerequisites: { type: 'all', conditions: [
        { type: 'tier_min', nodeId: 'sword-basics', tier: 3 },
        { type: 'node_unlocked', nodeId: 'smite' },
      ] } },
    { id: 'valor-aura', type: 'keystone', shape: 'hexagon', maxTier: 1,
      label: { gl: 'Aura de Valor', es: 'Aura de Valor', en: 'Valor Aura' },
      icon: 'aura-tree', position: { x: 360, y: 415 },
      prerequisites: { type: 'any', conditions: [
        { type: 'node_unlocked', nodeId: 'berserker-rage' },
        { type: 'node_unlocked', nodeId: 'divine-shield' },
      ] } },
    { id: 'dark-pact', type: 'keystone', shape: 'hexagon', maxTier: 1,
      label: { gl: 'Pacto Escuro', es: 'Pacto Oscuro', en: 'Dark Pact' },
      icon: 'dark-rune', color: '#7d3cff', position: { x: 360, y: 575 },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-basics' },
      exclusions: ['champion-of-light', 'holy-warrior'] },
    { id: 'holy-light', type: 'notable', shape: 'circle', maxTier: 3,
      label: { gl: 'Luz Sagrada', es: 'Luz Sagrada', en: 'Holy Light' },
      icon: 'sun', position: { x: 640, y: 40 },
      statContributions: [{ statId: 'faith', op: '+', value: 3 }] },
    { id: 'healing-hands', type: 'notable', shape: 'circle', maxTier: 2,
      label: { gl: 'Mans Sanadoras', es: 'Manos Sanadoras', en: 'Healing Hands' },
      icon: 'hands', position: { x: 640, y: 190 },
      prerequisites: { type: 'node_unlocked', nodeId: 'holy-light' },
      statContributions: [{ statId: 'faith', op: '+', value: 2 }] },
    { id: 'smite', type: 'notable', shape: 'circle', maxTier: 1,
      label: { gl: 'Golpe Divino', es: 'Golpe Divino', en: 'Smite' },
      icon: 'lightning', position: { x: 640, y: 340 },
      prerequisites: { type: 'node_unlocked', nodeId: 'holy-light' },
      statContributions: [{ statId: 'faith', op: '+', value: 1 }] },
    { id: 'divine-shield', type: 'notable', shape: 'circle', maxTier: 1,
      label: { gl: 'Escudo Divino', es: 'Escudo Divino', en: 'Divine Shield' },
      icon: 'shield-cross', position: { x: 640, y: 490 },
      prerequisites: { type: 'node_state', nodeId: 'healing-hands', state: 'in_progress' },
      cost: [{ resourceId: 'piety', amount: 3 }] },
    { id: 'divine-judgment', type: 'notable', shape: 'circle', maxTier: 1,
      label: { gl: 'Xuízo Divino', es: 'Juicio Divino', en: 'Divine Judgment' },
      icon: 'scales', position: { x: 640, y: 640 },
      prerequisites: { type: 'stat_min', statId: 'faith', amount: 10 },
      cost: [{ resourceId: 'piety', amount: 3 }] },
  ],
  edges: [
    { id: 'e1', source: 'sword-basics', target: 'shield-wall', type: 'dependency' },
    { id: 'e2', source: 'sword-basics', target: 'berserker-rage', type: 'dependency' },
    { id: 'e3', source: 'berserker-rage', target: 'war-veteran', type: 'dependency' },
    { id: 'e4', source: 'shield-wall', target: 'holy-warrior', type: 'dependency' },
    { id: 'e5', source: 'healing-hands', target: 'holy-warrior', type: 'dependency' },
    { id: 'e6', source: 'sword-basics', target: 'champion-of-light', type: 'dependency' },
    { id: 'e7', source: 'smite', target: 'champion-of-light', type: 'dependency' },
    { id: 'e8', source: 'berserker-rage', target: 'valor-aura', type: 'dependency' },
    { id: 'e9', source: 'divine-shield', target: 'valor-aura', type: 'soft_dependency' },
    { id: 'e10', source: 'sword-basics', target: 'dark-pact', type: 'dependency' },
    { id: 'e11', source: 'dark-pact', target: 'champion-of-light', type: 'exclusion', style: { routing: 'orthogonal' } },
    { id: 'e12', source: 'dark-pact', target: 'holy-warrior', type: 'exclusion', style: { routing: 'orthogonal' } },
    { id: 'e13', source: 'holy-light', target: 'healing-hands', type: 'dependency' },
    { id: 'e14', source: 'holy-light', target: 'smite', type: 'dependency' },
    { id: 'e15', source: 'healing-hands', target: 'divine-shield', type: 'dependency' },
    { id: 'e16', source: 'holy-light', target: 'divine-judgment', type: 'dependency' },
  ],
}
```

**E o helper de estado inicial** (mesmo ficheiro):

```typescript
/**
 * Reproduce a foto do mockup: desbloquea en orde (multi-tier = varios unlock).
 * Idempotente abondo para o demo; chámase unha vez tras crear o engine.
 */
export async function setupPaladinSnapshot(engine: TreeEngine): Promise<void> {
  const seq: readonly string[] = [
    'sword-basics', 'sword-basics', 'sword-basics', // → maxed 3/3
    'shield-wall', 'shield-wall',                   // → maxed 2/2
    'berserker-rage',                               // → 1/1
    'holy-light', 'holy-light',                     // → 2/3
    'healing-hands',                                // → 1/2
    'smite',                                        // → unlocked
    'holy-warrior',                                 // AND ok
    'champion-of-light',                            // → 1/2
    'valor-aura',                                   // OR ok
  ]
  for (const id of seq) {
    await engine.unlock(id)
  }
}
```

### T2 — Wiring no demo (`App.tsx`)
- Importar `{ paladinTreeDef, setupPaladinSnapshot }`.
- Facer **`paladinTreeDef` a árbore activa** do engine (substituír `rpgTreeDef`
  na creación do engine e nas referencias do status panel / botóns; **NON borrar**
  `rpgTreeDef` do ficheiro `tree-def.ts`).
- Tras crear o engine, executar `setupPaladinSnapshot(engine)` **unha vez**
  (efecto async con guarda anti-doble-execución; refrescar o estado/subscrición
  para que o render mostre a foto). Manter `fitOnMount` para enquadrar.
- Conservar viewport handle, selección, ThemeLab (sen tocar; o tema Paladín é 1b).

### T3 — Test de validación (a árbore é correcta)
- En `examples/react-demo` (se hai vitest) ou onde proceda: test que
  (a) `validateTreeDef(paladinTreeDef)` pasa (ok), e
  (b) tras `setupPaladinSnapshot`, os estados son os esperados:
  `sword-basics='maxed'`, `champion-of-light='in_progress'`,
  `divine-shield='unlockable'`, `divine-judgment='unlockable'`
  (faith=12 ≥ 10), `war-veteran='locked'` (3/4 warrior),
  `dark-pact` non desbloqueable (exclusión).
- Se o demo non ten runner de tests, facer un **script de verificación**
  (`/tmp/ygg-exec/verify-paladin.mjs`) que constrúa o engine, corra o snapshot e
  imprima/asserte eses estados. Reportar a saída.
- Gate: `pnpm lint && pnpm format:check && pnpm typecheck:packages && pnpm test`.

### T4 — Docs (sen changeset)
- `docs/architecture/RENDERER-STATE.md`: engadir fila «Showcase Capa 1a —
  TreeDef do Paladín (13 nodos, 11 capacidades) baked no demo; layout custom;
  estado inicial = foto do mockup. Tema/panel = 1b/1c».
- **Sen changeset** (examples non se publican). **Sen tocar GUIDE.md** (non muda
  API pública).
- Copia este briefing a `docs/briefings/BRIEFING_SHOWCASE_1a_PALADIN_TREEDEF.md`.

### T5 — Commit + patch
- Commit único + `git format-patch -1 HEAD -o /tmp` → `present_files`.

## 4. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/tree-def-paladin.ts                  (A)
examples/react-demo/src/App.tsx                              (M)
examples/react-demo/src/__tests__/paladin.test.ts           (A, se hai vitest)
docs/architecture/RENDERER-STATE.md                          (M)
docs/briefings/BRIEFING_SHOWCASE_1a_PALADIN_TREEDEF.md       (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON tema Paladín nin panel Inspector (son 1b/1c).
- ❌ NON borrar `rpgTreeDef` (queda no ficheiro para o futuro toggle).
- ❌ NON cambiar nomes de campo do `TreeDef` (están verificados; copia literal).
- ❌ NON tocar `@core`/`@react` (só examples + docs).
- ❌ NON changeset (examples non publican).
- ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: aparecen **13 nodos en 3 columnas** (Guerreiro
esquerda / converxencia centro en hexágonos / Clérigo dereita), edges
conectados, e os **estados da foto**: Esgrima/Muro/Furia *maxed*, Luz/Mans/
Campeón *in_progress*, Escudo e Xuízo *dispoñibles*, Veterano *bloqueado*,
Pacto Escuro *bloqueado* (exclusión). As 3 iconas confirmadas (paladin-cross,
radiant-sun, aura-tree) aparecen nos hexágonos centrais. Visual check
**pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` · `🟢 GATE` + saída do test/verificación de estados ·
- `👁️ VISUAL` (PENDENTE) · `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing Showcase · Capa 1a. 4º Arquitecto. A árbore que presume de motor, en datos. 🌳*
