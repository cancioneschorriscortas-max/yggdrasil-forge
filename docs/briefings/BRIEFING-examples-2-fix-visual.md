# BRIEFING — SUB-FASE examples-2-fix-visual de Yggdrasil Forge

> Pega este documento no chat executor.
> **REDESIGN VISUAL TOTAL da React demo**. A versión actual
> (`commit 410dcb6`) ten problemas críticos de presentación:
> labels solapados, estética minimal default cero atrae, nodos
> con texto cortado. **A demo é o conversion driver #1**; ten
> que vender.
>
> **Decisión arquitectónica clave**: aproveitar o sistema de
> Theme + CSS classes con `data-state` selectors xa exportado por
> `@yggdrasil-forge/react`. **Cero modificar @react**; só usar
> ThemeProvider + CSS overrides + labels curtos.
>
> **Pezas (4 grupos)**:
> 1. **NOVO** `src/theme.ts`: tema custom "dragonborn" (dark
>    fantasy palette).
> 2. **MODIFICADO** `src/App.tsx`: wrap con `<ThemeProvider>` +
>    layout 2-column refined + tooltip side panel.
> 3. **MODIFICADO** `src/tree-def.ts`: labels CURTOS con emojis
>    (resolve overlap).
> 4. **MODIFICADO** `src/styles.css`: total redesign con Google
>    Fonts (Cinzel + Inter), cosmic background gradients, glow
>    effects via `data-state` CSS selectors.
>
> **Decisións confirmadas polo director**:
> - **Cero asset externo**: recrear feel via CSS gradients (cero
>   imaxe Elder Scrolls subida; copyright unclear + complica
>   Stackblitz).
> - **Tema custom via `<ThemeProvider>`**: API pública de @react.
> - **CSS overrides** vía `.yf-skill-node[data-state="unlocked"]`
>   selectores (verificados empíricamente; data-state existe).
> - **Google Fonts CDN**: Cinzel (display, fantasy serif) + Inter
>   (UI). **Funcionan en Stackblitz**.
> - **Labels con emoji prefix**: ⚔ 🗡 🏹 🛡 etc. — impacto visual
>   inmediato + nomes curtos = cero overlap.
> - **4 cores cardinales sutís** no fondo (gradient ellipses):
>   azul (norte), verde (este), crimson (oeste), gold (sur) —
>   evoca o feel da inspiración Elder Scrolls.
> - **Glow effects** vía `filter: drop-shadow()` (CSS-only; cero
>   JS).
> - **Pulse animation** para nodos unlockable (CSS keyframes).
>
> **APIs verificadas empíricamente** (lección 8.6.a L1):
> - `ThemeProvider` accepta `theme: Theme` + `children`.
> - `Theme.colors` ten 10 propiedades (background opcional + 9
>   requeridas).
> - `Theme.sizes` ten 3 propiedades (todas requeridas).
> - SkillNode renderea `data-state`, `data-tier`, `data-node-id`
>   atributos (CSS-targetable).
> - SkillTree renderea `.yf-skill-tree` no SVG root.
> - SkillEdge renderea `.yf-skill-edge`.
>
> **Risco MEDIO**: redesign substancial pero scope acoutado
> (4 ficheiros do exemplo; cero tocar paquetes).
>
> **Verificación crítica T6**: `pnpm dev` + visual check no
> browser.

---

## 0. SETUP DO EXECUTOR (NON NEGOCIABLE)

**0.1** — Scripts en `/tmp/ygg-exec/`.

**0.2** — `.gitignore` intacto.

**0.3** — Tests SEMPRE con `--force`.

**0.4** — Decisións do director non se consultan.

**0.5** — ANTI-PLACEHOLDER grep literal no reporte.

**0.6** — ESCALADO: decisión non resolta → PARA.

**0.7** — TÍTULOS PRESCRITOS:
- Pushed: `═══ SUB-FASE examples-2-fix-visual — COMPLETADA E EN origin/main ═══`
- Pendente: `═══ SUB-FASE examples-2-fix-visual — PENDENTE DE PUSH POLO AUTOR (parche xerado) ═══`

**0.8** — `git am`: `git status` + `git log -1` antes de teorizar.

**0.9** — CHANGELOG (DT-12 RESOLTA): nova `[Unreleased]` formato
Keep-a-Changelog.

**0.10 — GARANTÍA DE INMUTABILIDADE FUNCIONAL TOTAL**:
- **0 ficheiros .ts modificados en /packages/**.
- **0 tests novos**.
- **0 modificacións de tests existentes**.
- **0 ErrorCodes**.
- **0 deps externas novas** (Google Fonts vía CDN, cero npm).
- **2195 tests inchanged**.

**0.11** — Convención A.5.2: copia este briefing a
`docs/briefings/BRIEFING-examples-2-fix-visual.md`.

**0.12 — VERIFICACIÓN CRÍTICA T6 OBRIGATORIA**: `pnpm dev` arranca
+ curl pode acceder + **visual** check no browser confirma:
- Background gradient visible.
- Fontes Cinzel cargan.
- Nodos teñen styling distintivo por estado.
- Cero overlap de labels.

**0.13** — **Cero engadir asset images** (cero descargar imaxes,
cero crear `assets/` folder). Todo via CSS.

---

## 1. IDENTIFICACIÓN

Sub-fase **examples-2-fix-visual**. Total redesign visual de
`examples/react-demo/`.

**Pezas (4 grupos)**:

**Grupo A — Theme custom NOVO (1 NOVO)**:
1. `examples/react-demo/src/theme.ts`.

**Grupo B — App.tsx redesign (1 MODIFICADO)**:
2. `examples/react-demo/src/App.tsx`.

**Grupo C — Labels + styles redesign (2 MODIFICADOS)**:
3. `examples/react-demo/src/tree-def.ts`.
4. `examples/react-demo/src/styles.css`.

**Grupo D — Auto-tracking + housekeeping (3 ficheiros)**:
5. **NOVO** `docs/briefings/BRIEFING-examples-2-fix-visual.md`.
6. **NOVO** `.changeset/examples-2-fix-visual-redesign.md`.
7. **MODIFICADO** `CHANGELOG.md`.

**Total: 7 ficheiros tocados** (3 NOVOS + 4 MODIFICADOS).

**Cero modificación de**:
- Calquera ficheiro en `packages/`.
- `examples/react-demo/package.json`, `tsconfig.json`,
  `vite.config.ts`, `index.html`, `src/main.tsx`, `README.md`.
- Outros exemplos.
- Configs root.
- Tests.

---

## 2. CONTEXTO MÍNIMO

**Problema actual (verificado polo Director)**:
- Labels longos ("Combate corpo a corpo", "Combate á distancia")
  solapan vertical e horizontalmente.
- Tema `minimal` default cero atrae: cinza claro + branco.
- Cero feedback visual de estado (unlocked = azul plano).
- Cero hierarchy visual entre tipos de nodo (root vs notable vs
  keystone).

**APIs disponibles para resolver**:
- `<ThemeProvider theme={...}>` para override completo de cores.
- CSS targeting via `[data-state="unlocked"]`, `[data-tier]`,
  `[data-node-id]`.
- `filter: drop-shadow()` para glow effects.
- Google Fonts CDN para typography distintiva.

---

## 3. ESTADO Á ENTRADA

- Rama `main`, último commit `410dcb6` (examples-2).
- 2195 tests inchanged.
- 25/25 typecheck.
- **61 sub-fases consecutivas sen rollback**.

---

## 4. OBXECTIVO (unha frase)

Total redesign visual de `examples/react-demo/` para que sirva
como **conversion driver real** post-release: crear tema custom
"dragonborn" (dark fantasy palette: obsidian background + gold
nodes + cobalt/emerald/crimson cardinal accents) en `src/theme.ts`;
modificar `App.tsx` para envolver SkillTree en `<ThemeProvider>`;
**acurtar labels do tree-def** con emoji prefixes (⚔ 🗡 🏹 🛡 💥
🌪) para resolver overlap; total redesign de `styles.css` con
Google Fonts (Cinzel display + Inter UI), cosmic background con 4
radial gradients (azul/verde/crimson/gold sutís), glow effects
via `filter: drop-shadow()` apuntados a `.yf-skill-node[data-state="unlocked"]`,
pulse animation para `[data-state="unlockable"]`; cero modificación
de @react ou outros paquetes; cero asset externo (CSS-only);
verificación crítica T6 require visual check no browser. **2195
tests inchanged**.

---

## 5. DECISIÓNS DO DIRECTOR (pre-resoltas, NON consultables)

### 5.1 — Ficheiros tocados

**NOVOS (3)**:
- `examples/react-demo/src/theme.ts`.
- `docs/briefings/BRIEFING-examples-2-fix-visual.md`.
- `.changeset/examples-2-fix-visual-redesign.md`.

**MODIFICADOS (4)**:
- `examples/react-demo/src/App.tsx`.
- `examples/react-demo/src/tree-def.ts`.
- `examples/react-demo/src/styles.css`.
- `CHANGELOG.md`.

**Total: 7 ficheiros**.

### 5.2 — `examples/react-demo/src/theme.ts` (FIXADO; NOVO)

```ts
import type { Theme } from '@yggdrasil-forge/react'

/**
 * Tema custom "dragonborn" — dark fantasy palette inspirada en
 * Elder Scrolls / Path of Exile.
 *
 * - Background: transparent (delegamos ao CSS body gradient).
 * - Text: gold-cream para contraste sobre dark.
 * - Nodes locked: dark obsidian.
 * - Nodes unlockable: gold dim (con pulse animation via CSS).
 * - Nodes unlocked: rich gold (con glow via CSS drop-shadow).
 * - Edges: metallic muted.
 * - Mesh: barely-visible gold.
 */
export const dragonborn: Theme = {
  colors: {
    background: 'transparent',
    text: '#e6d5a8',
    nodeLocked: '#2a2520',
    nodeUnlockable: '#4a3f2a',
    nodeUnlocked: '#b8860b',
    nodeMaxed: '#e7a523',
    nodeInProgress: '#c07a3a',
    nodeStroke: '#daa520',
    edge: '#8c6e4b',
    mesh: 'rgba(218, 165, 32, 0.05)',
  },
  sizes: {
    strokeWidth: 2.5,
    fontSize: 14,
    fontSizeSmall: 11,
  },
}
```

### 5.3 — `examples/react-demo/src/tree-def.ts` (FIXADO; SUBSTITUÍR TOTAL)

**Cero modificar** estructura nin `prerequisites`. **Modificar
SÓ os labels** para acurtalos con emoji prefix.

```ts
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type { TreeDef } from '@yggdrasil-forge/core'

export const rpgTreeDef: TreeDef = {
  id: 'rpg-character',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: {
    en: 'RPG Character',
    es: 'Personaje RPG',
    gl: 'Personaxe RPG',
  },
  description: {
    en: 'A sample skill tree for an RPG character with melee and ranged branches.',
  },
  rootNodeId: 'combat',
  layout: { type: 'tree' },
  nodes: [
    {
      id: 'combat',
      type: 'root',
      label: { en: '⚔ Combat', es: '⚔ Combate', gl: '⚔ Combate' },
    },
    {
      id: 'melee',
      type: 'notable',
      label: { en: '🗡 Melee', es: '🗡 Cuerpo', gl: '🗡 Corpo' },
      prerequisites: { type: 'node_unlocked', nodeId: 'combat' },
    },
    {
      id: 'ranged',
      type: 'notable',
      label: { en: '🏹 Ranged', es: '🏹 Distancia', gl: '🏹 Distancia' },
      prerequisites: { type: 'node_unlocked', nodeId: 'combat' },
    },
    {
      id: 'sword-mastery',
      type: 'small',
      label: { en: '⚔ Sword', es: '⚔ Espada', gl: '⚔ Espada' },
      prerequisites: { type: 'node_unlocked', nodeId: 'melee' },
    },
    {
      id: 'shield-bash',
      type: 'small',
      label: { en: '🛡 Shield', es: '🛡 Escudo', gl: '🛡 Escudo' },
      prerequisites: { type: 'node_unlocked', nodeId: 'melee' },
    },
    {
      id: 'bow-mastery',
      type: 'small',
      label: { en: '🏹 Bow', es: '🏹 Arco', gl: '🏹 Arco' },
      prerequisites: { type: 'node_unlocked', nodeId: 'ranged' },
    },
    {
      id: 'critical-shot',
      type: 'keystone',
      label: { en: '💥 Crit', es: '💥 Crítico', gl: '💥 Crítico' },
      prerequisites: { type: 'node_unlocked', nodeId: 'bow-mastery' },
    },
    {
      id: 'whirlwind',
      type: 'keystone',
      label: { en: '🌪 Whirl', es: '🌪 Torbellino', gl: '🌪 Remuíño' },
      prerequisites: { type: 'node_unlocked', nodeId: 'sword-mastery' },
    },
  ],
  edges: [
    { id: 'e-combat-melee', source: 'combat', target: 'melee', type: 'dependency' },
    { id: 'e-combat-ranged', source: 'combat', target: 'ranged', type: 'dependency' },
    { id: 'e-melee-sword', source: 'melee', target: 'sword-mastery', type: 'dependency' },
    { id: 'e-melee-shield', source: 'melee', target: 'shield-bash', type: 'dependency' },
    { id: 'e-ranged-bow', source: 'ranged', target: 'bow-mastery', type: 'dependency' },
    { id: 'e-bow-crit', source: 'bow-mastery', target: 'critical-shot', type: 'dependency' },
    { id: 'e-sword-whirl', source: 'sword-mastery', target: 'whirlwind', type: 'dependency' },
  ],
}

/**
 * Long label lookup for the side panel. Used when showing details
 * of the currently selected node.
 */
export const longLabels: Record<string, string> = {
  combat: 'Combat',
  melee: 'Melee Combat',
  ranged: 'Ranged Combat',
  'sword-mastery': 'Sword Mastery',
  'shield-bash': 'Shield Bash',
  'bow-mastery': 'Bow Mastery',
  'critical-shot': 'Critical Shot',
  whirlwind: 'Whirlwind',
}
```

### 5.4 — `examples/react-demo/src/App.tsx` (FIXADO; SUBSTITUÍR TOTAL)

```tsx
import { useCallback, useEffect, useState } from 'react'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { BuildSnapshot } from '@yggdrasil-forge/core'
import { SkillTree, ThemeProvider } from '@yggdrasil-forge/react'
import { MemoryStorage } from '@yggdrasil-forge/storage'
import { dragonborn } from './theme.js'
import { longLabels, rpgTreeDef } from './tree-def.js'

export function App(): JSX.Element {
  const [engine] = useState(() => {
    const storage = new MemoryStorage()
    return new TreeEngine(rpgTreeDef, { storage })
  })

  const [unlockedCount, setUnlockedCount] = useState(0)
  const [lastAction, setLastAction] = useState<string>('')
  const [snapshotId, setSnapshotId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Subscribe to engine changes:
  useEffect(() => {
    const updateCount = (): void => {
      let count = 0
      for (const node of rpgTreeDef.nodes) {
        const state = engine.getNodeState(node.id)
        if (state?.state === 'unlocked') count += 1
      }
      setUnlockedCount(count)
    }

    updateCount()
    const unsubscribe = engine.subscribe(updateCount)
    return unsubscribe
  }, [engine])

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      setSelectedNode(nodeId)
      const state = engine.getNodeState(nodeId)

      if (state?.state === 'unlocked') {
        const result = await engine.lock(nodeId)
        if (result.ok) {
          setLastAction(`🔒 Locked: ${longLabels[nodeId] ?? nodeId}`)
        } else {
          setLastAction(`✗ Cannot lock: ${result.error.message}`)
        }
      } else {
        const result = await engine.unlock(nodeId)
        if (result.ok) {
          setLastAction(`✨ Unlocked: ${longLabels[nodeId] ?? nodeId}`)
        } else {
          setLastAction(`⛔ ${result.error.message}`)
        }
      }
    },
    [engine],
  )

  const handleSnapshot = useCallback(async () => {
    const snapshot: BuildSnapshot = await engine.snapshot('demo-checkpoint')
    setSnapshotId(snapshot.id)
    setLastAction(`📸 Snapshot saved`)
  }, [engine])

  const handleRestore = useCallback(async () => {
    if (snapshotId === null) {
      setLastAction('⛔ No snapshot to restore')
      return
    }
    const result = await engine.restoreSnapshot(snapshotId)
    if (result.ok) {
      setLastAction(`↺ Restored snapshot`)
    } else {
      setLastAction(`✗ Restore failed: ${result.error.message}`)
    }
  }, [engine, snapshotId])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Yggdrasil Forge</h1>
        <p className="app-subtitle">⚔ Forge thy character. Click skills to unlock.</p>
      </header>

      <div className="app-body">
        <div className="tree-frame">
          <div className="tree-container">
            <ThemeProvider theme={dragonborn}>
              <SkillTree engine={engine} onNodeClick={handleNodeClick} />
            </ThemeProvider>
          </div>
        </div>

        <aside className="sidebar">
          <section className="panel">
            <h2 className="panel-title">⚜ Status</h2>
            <div className="stat-row">
              <span className="stat-label">Unlocked</span>
              <span className="stat-value">
                {unlockedCount} <span className="stat-of">/ {rpgTreeDef.nodes.length}</span>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Last action</span>
              <span className="stat-value-text">{lastAction || '(none yet)'}</span>
            </div>
            {selectedNode !== null && (
              <div className="stat-row">
                <span className="stat-label">Selected</span>
                <span className="stat-value-text">
                  {longLabels[selectedNode] ?? selectedNode}
                </span>
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">⚜ Controls</h2>
            <button type="button" className="rune-button" onClick={handleSnapshot}>
              📸 Save Snapshot
            </button>
            <button
              type="button"
              className="rune-button"
              onClick={handleRestore}
              disabled={snapshotId === null}
            >
              ↺ Restore
            </button>
          </section>

          <section className="panel panel-info">
            <h2 className="panel-title">⚜ About</h2>
            <p>
              Powered by <code>@yggdrasil-forge</code> 0.1.0 — an open-source
              TypeScript skill tree engine.
            </p>
            <p>
              <a
                href="https://github.com/cancioneschorriscortas-max/yggdrasil-forge"
                target="_blank"
                rel="noopener noreferrer"
                className="rune-link"
              >
                ⚔ View on GitHub →
              </a>
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
```

### 5.5 — `examples/react-demo/src/styles.css` (FIXADO; SUBSTITUÍR TOTAL)

```css
/* Yggdrasil Forge — React Demo — dragonborn theme styles */

@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

/* ── Reset + base ───────────────────────────────────────────────── */

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e6d5a8;
  background: #0a0810;
  background-image:
    radial-gradient(ellipse at 18% 12%, rgba(40, 80, 180, 0.18) 0%, transparent 45%),
    radial-gradient(ellipse at 82% 18%, rgba(40, 140, 80, 0.15) 0%, transparent 45%),
    radial-gradient(ellipse at 22% 78%, rgba(180, 40, 60, 0.15) 0%, transparent 45%),
    radial-gradient(ellipse at 78% 72%, rgba(180, 140, 40, 0.15) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 50%, rgba(80, 60, 100, 0.12) 0%, transparent 70%),
    linear-gradient(180deg, #0a0810 0%, #14101a 50%, #0a0810 100%);
  background-attachment: fixed;
}

/* Subtle noise overlay via SVG data-URI (cero asset externo) */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.05'/></svg>");
  opacity: 0.4;
}

#root {
  position: relative;
  z-index: 1;
}

/* ── Header ─────────────────────────────────────────────────────── */

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(218, 165, 32, 0.25);
}

.app-title {
  margin: 0 0 8px;
  font-family: 'Cinzel', serif;
  font-size: 42px;
  font-weight: 600;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #f4d878 0%, #b8860b 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 8px rgba(218, 165, 32, 0.3));
}

.app-subtitle {
  margin: 0;
  font-family: 'Cinzel', serif;
  font-size: 15px;
  letter-spacing: 0.05em;
  color: rgba(230, 213, 168, 0.7);
}

/* ── Layout ─────────────────────────────────────────────────────── */

.app-body {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
}

@media (max-width: 900px) {
  .app-body {
    grid-template-columns: 1fr;
  }
}

/* ── Tree frame (ornate border) ─────────────────────────────────── */

.tree-frame {
  position: relative;
  padding: 4px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(218, 165, 32, 0.4),
    rgba(218, 165, 32, 0.1),
    rgba(218, 165, 32, 0.4)
  );
}

.tree-container {
  background:
    radial-gradient(ellipse at center, rgba(20, 16, 30, 0.95) 0%, rgba(10, 8, 16, 1) 100%);
  border-radius: 10px;
  padding: 32px;
  min-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Corner ornaments via pseudo-elements */
.tree-container::before,
.tree-container::after {
  content: '';
  position: absolute;
  width: 32px;
  height: 32px;
  border: 2px solid rgba(218, 165, 32, 0.4);
  pointer-events: none;
}

.tree-container::before {
  top: 8px;
  left: 8px;
  border-right: none;
  border-bottom: none;
}

.tree-container::after {
  bottom: 8px;
  right: 8px;
  border-left: none;
  border-top: none;
}

.tree-container svg {
  max-width: 100%;
  height: auto;
}

/* ── SkillTree CSS overrides via data-state selectors ───────────── */

.yf-skill-node circle {
  transition: filter 0.3s ease, fill 0.3s ease;
}

.yf-skill-node text {
  font-family: 'Cinzel', serif !important;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.yf-skill-node[data-state="unlocked"] circle {
  filter: drop-shadow(0 0 12px rgba(218, 165, 32, 0.7));
}

.yf-skill-node[data-state="unlockable"] circle {
  animation: pulse-glow 2.4s ease-in-out infinite;
}

.yf-skill-node[data-state="locked"] circle {
  opacity: 0.85;
}

/* Special treatment for root + keystone tiers */
.yf-skill-node[data-tier="root"] circle {
  filter: drop-shadow(0 0 6px rgba(218, 165, 32, 0.4));
}

.yf-skill-node[data-tier="keystone"][data-state="unlocked"] circle {
  filter: drop-shadow(0 0 16px rgba(231, 165, 35, 0.9));
}

@keyframes pulse-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 4px rgba(218, 165, 32, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(218, 165, 32, 0.8));
  }
}

.yf-skill-edge {
  transition: stroke 0.3s ease, stroke-width 0.3s ease;
}

/* ── Sidebar panels ─────────────────────────────────────────────── */

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  position: relative;
  background:
    linear-gradient(135deg, rgba(40, 30, 20, 0.8) 0%, rgba(20, 16, 30, 0.9) 100%);
  border: 1px solid rgba(218, 165, 32, 0.3);
  border-radius: 8px;
  padding: 20px;
}

.panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(218, 165, 32, 0.06), transparent);
  pointer-events: none;
}

.panel-title {
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(218, 165, 32, 0.2);
  font-family: 'Cinzel', serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #daa520;
  text-transform: uppercase;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
}

.stat-row + .stat-row {
  border-top: 1px dashed rgba(218, 165, 32, 0.12);
}

.stat-label {
  color: rgba(230, 213, 168, 0.6);
  font-weight: 500;
  flex-shrink: 0;
}

.stat-value {
  font-family: 'Cinzel', serif;
  font-size: 18px;
  font-weight: 700;
  color: #daa520;
}

.stat-value .stat-of {
  color: rgba(230, 213, 168, 0.4);
  font-weight: 400;
  font-size: 14px;
}

.stat-value-text {
  text-align: right;
  color: #e6d5a8;
  font-size: 12px;
  line-height: 1.4;
}

/* ── Rune buttons ───────────────────────────────────────────────── */

.rune-button {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 12px 16px;
  background:
    linear-gradient(180deg, rgba(60, 45, 25, 0.9) 0%, rgba(40, 30, 18, 0.9) 100%);
  color: #e6d5a8;
  border: 1px solid rgba(218, 165, 32, 0.5);
  border-radius: 6px;
  font-family: 'Cinzel', serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(218, 165, 32, 0.15);
}

.rune-button:hover:not(:disabled) {
  background:
    linear-gradient(180deg, rgba(80, 60, 30, 0.95) 0%, rgba(55, 40, 22, 0.95) 100%);
  border-color: rgba(218, 165, 32, 0.8);
  box-shadow:
    inset 0 1px 0 rgba(218, 165, 32, 0.25),
    0 0 12px rgba(218, 165, 32, 0.2);
}

.rune-button:active:not(:disabled) {
  transform: translateY(1px);
}

.rune-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.rune-button:last-child {
  margin-bottom: 0;
}

/* ── Info panel typography ──────────────────────────────────────── */

.panel-info p {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(230, 213, 168, 0.75);
}

.panel-info p:last-child {
  margin-bottom: 0;
}

.panel-info code {
  background: rgba(218, 165, 32, 0.12);
  padding: 1px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #daa520;
}

.rune-link {
  color: #daa520;
  text-decoration: none;
  font-family: 'Cinzel', serif;
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.rune-link:hover {
  color: #f4d878;
  text-shadow: 0 0 8px rgba(218, 165, 32, 0.5);
}
```

### 5.6 — Lección 8.6.a L1 aplicada

T0.2 verifica empíricamente:
- `ThemeProvider` exportado en @react/index.ts.
- `Theme` type exportado.
- `data-state` atributo presente no rendering de SkillNode.
- `[data-tier]` atributo presente.

### 5.7 — Verificación crítica T6

```bash
pnpm --filter @yggdrasil-forge-examples/react-demo dev &
DEV_PID=$!
sleep 5

# Curl básico:
curl -s http://localhost:5173 | grep -c "Yggdrasil Forge"
# Esperado: ≥1.

# Verificar que styles.css carga:
curl -s http://localhost:5173/src/styles.css 2>/dev/null | head -3
# Esperado: contén "Cinzel" ou "@import".

kill $DEV_PID 2>/dev/null
```

**ATENCIÓN HUMANA**: Agarfal debe **abrir o browser manualmente**
e verificar visualmente que:
- Background mostra gradient cosmic (cero plano).
- Título "Yggdrasil Forge" en gold con Cinzel font.
- Nodos teñen styling distintivo (cero todos iguais).
- Cero overlap de labels.
- Botóns "rune-button" teñen aspecto medieval (cero default
  browser).

Se algunha verificación visual falla → ESCALAR.

---

## 6. FICHEIROS ESPERADOS NO DIFF FINAL

**NOVOS (3)**:
- `examples/react-demo/src/theme.ts`.
- `docs/briefings/BRIEFING-examples-2-fix-visual.md`.
- `.changeset/examples-2-fix-visual-redesign.md`.

**MODIFICADOS (4)**:
- `examples/react-demo/src/App.tsx`.
- `examples/react-demo/src/tree-def.ts`.
- `examples/react-demo/src/styles.css`.
- `CHANGELOG.md`.

**Total: 7 ficheiros**.

**NON deben aparecer cambios en**:
- `examples/react-demo/package.json` (cero deps novas; Google Fonts
  via CDN).
- `examples/react-demo/tsconfig*.json`.
- `examples/react-demo/vite.config.ts`.
- `examples/react-demo/index.html`.
- `examples/react-demo/src/main.tsx`.
- `examples/react-demo/README.md` (badge Stackblitz xa presente).
- Calquera ficheiro en `packages/`.
- `pnpm-lock.yaml`.
- MASTER.md.
- Outros exemplos.

---

## 7. CONVENCIÓNS

**TypeScript**: strict mode. Cero `any`.

**CSS**: usar variables só onde sexa repetitivo. Comentarios
divisorios `/* ── Sección ───── */`.

**Fontes vía Google Fonts CDN**: cero npm dep.

**Emojis nos labels**: UTF-8 directos (cero codepoints).

---

## 8. QUE NON FACER

- ❌ Modificar **calquera ficheiro .ts** en /packages/.
- ❌ Modificar package.json do exemplo (cero deps novas).
- ❌ Engadir assets (imaxes, fontes locais, etc.).
- ❌ Modificar tsconfig, vite.config, index.html, main.tsx,
  README.md, ou os ficheiros que existen sen tocar.
- ❌ Tentar modificar `@yggdrasil-forge/react` para mellor styling
  (usar a API pública).
- ❌ Engadir routing / state management externo.
- ❌ Engadir test framework.
- ❌ Cambiar a estructura de tree-def (cero modificar
  prerequisites; só labels).
- ❌ Modificar outros exemplos.
- ❌ Inventar lóxica distinta da §5.

---

## 9. TAREFAS (T0–T7)

### T0 — Verificación previa

**T0.1** — `git status` limpo. `git log -1` mostra `410dcb6`.

**T0.2** — Verificacións empíricas:

```bash
# Confirmar ThemeProvider exportado:
grep "ThemeProvider" packages/react/src/index.ts

# Confirmar Theme type exportado:
grep "export type.*Theme" packages/react/src/index.ts

# Confirmar data-state usado:
grep "data-state" packages/react/src/SkillNode.tsx | head -2

# Confirmar tree-def actual:
head -5 examples/react-demo/src/tree-def.ts
```

### T1 — Crear `theme.ts`

Aplicar §5.2 literal.

### T2 — Modificar `tree-def.ts`

Aplicar §5.3 literal (substituír contido total).

### T3 — Modificar `App.tsx`

Aplicar §5.4 literal (substituír contido total).

### T4 — Modificar `styles.css`

Aplicar §5.5 literal (substituír contido total).

### T5 — Typecheck

```bash
pnpm --filter @yggdrasil-forge-examples/react-demo typecheck
# Esperado: cero erros.
```

### T6 — VERIFICACIÓN CRÍTICA: dev server + visual

```bash
pnpm --filter @yggdrasil-forge-examples/react-demo dev &
sleep 5
curl -s http://localhost:5173 | grep -c "Yggdrasil Forge"
```

**ATENCIÓN HUMANA**: abrir http://localhost:5173 no browser e
verificar visualmente:
1. ✓ Background cosmic gradient visible.
2. ✓ Título "Yggdrasil Forge" gold + Cinzel font.
3. ✓ Nodos con styling distintivo por estado.
4. ✓ Cero overlap de labels (emojis + nomes curtos).
5. ✓ Botóns "rune" con aspecto medieval.

Se algunha falla → **ESCALAR**.

### T7 — Auto-tracking + changeset + CHANGELOG + commit + push

Agarfal copia briefing + crea changeset:

```
.changeset/examples-2-fix-visual-redesign.md:
---
'@yggdrasil-forge/core': patch
---

docs(examples): total visual redesign of React demo with dragonborn theme + Cinzel typography + glow effects (examples-2-fix-visual)
```

**CHANGELOG**: nova `## [Unreleased]` ao principio:

```markdown
### Fixed
- **examples/react-demo**: total visual redesign para que sirva
  como conversion driver real post-release. A versión anterior
  (commit 410dcb6) tiña labels solapados + estética minimal
  default cero atrae.
  - **NOVO** tema custom `dragonborn` (dark fantasy palette: gold
    + cobalt + emerald + crimson cardinal accents).
  - **Labels acurtados** con emoji prefix (⚔ 🗡 🏹 🛡 💥 🌪 ⚜)
    para resolver overlap.
  - **App.tsx** envolvido en `<ThemeProvider theme={dragonborn}>`.
  - **styles.css** total redesign:
    - Google Fonts (Cinzel display + Inter UI; vía CDN).
    - Cosmic background con 4 radial gradients sutís.
    - Glow effects via `filter: drop-shadow()` apuntados a
      `.yf-skill-node[data-state="unlocked"]`.
    - Pulse animation para `[data-state="unlockable"]`.
    - Special treatment para `[data-tier="keystone"]`.
    - Tree frame con ornate borders.
    - Sidebar con panel-style medieval.
    - Rune buttons.
- **Cero modificación** de @yggdrasil-forge/react (só uso da API
  pública via ThemeProvider + CSS overrides via data-* selectors).

### Note
- Sub-fase **examples-2-fix-visual**. Redesign visual post-release
  recomendado polo Agarfal tras feedback honesto sobre estética.
- **0 ficheiros .ts modificados en /packages/**.
- 2195 tests pass unchanged.
- 62 sub-fases consecutivas sen rollback.
- **Cero asset externo**: tódolos efectos visuais vía CSS gradients
  + SVG data-URI noise + Google Fonts CDN. Stackblitz-compatible
  inmediatamente.
- **APIs públicas usadas**: ThemeProvider, Theme type, CSS classes
  `.yf-skill-node` + `[data-state]` + `[data-tier]`.
- **Lección capturada**: a Theme API + data-* selectors de @react
  permiten customización visual completa sen modificar o paquete.
  Patrón replicable para outros consumidores.
```

**Commit Conventional**:
`fix(examples): total visual redesign of React demo with dragonborn theme (examples-2-fix-visual)`

Push directo a `origin/main` (base `410dcb6`). Reporta hash.

---

## 10. COMO REPORTAR

```
═══ SUB-FASE examples-2-fix-visual — COMPLETADA E EN origin/main ═══
✅ Commit <hash> en origin/main (base 410dcb6)
✅ Total redesign visual de examples/react-demo/:
   - NOVO src/theme.ts (dragonborn dark fantasy palette)
   - MODIFICADO src/App.tsx (ThemeProvider + tooltip lateral)
   - MODIFICADO src/tree-def.ts (labels curtos con emojis)
   - MODIFICADO src/styles.css (Google Fonts + glow + gradients)
✅ T0.2 verificación empírica:
   - ThemeProvider + Theme type exportados confirmados
   - data-state, data-tier confirmados en SkillNode
✅ T5 typecheck: OK
✅ T6 CRÍTICA: dev server arranca + HTML carga
✅ ATENCIÓN HUMANA: visual check no browser confirmado:
   - Background cosmic gradient ✓
   - Título gold + Cinzel font ✓
   - Nodos con glow ✓
   - Cero overlap ✓
   - Rune buttons ✓
✅ CERO ficheiros .ts en /packages/ modificados
✅ CERO deps de npm engadidas (Google Fonts CDN)
✅ Tests monorepo: 2195 INCHANGED
✅ Auto-tracking BRIEFING-examples-2-fix-visual.md
✅ git status pre-commit: 7 ficheiros (3 NOVOS + 4 MODIFICADOS)
⚠️ Notas:
   - 62 sub-fases consecutivas sen rollback.
   - APIs públicas usadas (ThemeProvider + data-* selectors).
   - Cero asset externo (CSS-only + Google Fonts CDN).
   - Stackblitz funciona inmediatamente.
LISTO PARA SEGUINTE SUB-FASE.
═══
```

---

*Fin do briefing examples-2-fix-visual. Total redesign visual de
React demo. Tema custom + Google Fonts + glow effects + emoji
labels. 7 ficheiros tocados. Risco MEDIO mitigado por uso
exclusivo de APIs públicas de @react.*

*🎯 **Esta sub-fase é crítica para adopción**: convertir a demo
en algo que realmente vende Yggdrasil Forge.*
