// ── INICIO: Yggdrasil Forge — exemplo Node.js básico ──
//
// Demostra a API core de Yggdrasil Forge end-to-end:
//   1. Definir un TreeDef.
//   2. Crear un TreeEngine con MemoryStorage.
//   3. Comprobar canUnlock antes de mutación.
//   4. unlock dunha cadea de skills.
//   5. Intentar unlock sen prereqs (demostra Result.err).
//   6. Snapshot do estado.
//   7. lock dun skill.
//   8. restoreSnapshot e verificación.
//
// Executar: pnpm start

import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import { TreeEngine } from '@yggdrasil-forge/core'
import type { TreeDef } from '@yggdrasil-forge/core'
import { MemoryStorage } from '@yggdrasil-forge/storage'

// ── 1. Definir un TreeDef con 3 skills ──────────────────────────

const treeDef: TreeDef = {
  id: 'sample-tree',
  schemaVersion: SCHEMA_VERSION,
  version: '1.0.0',
  label: {
    gl: 'Árbore de exemplo',
    es: 'Árbol de ejemplo',
    en: 'Sample tree',
  },
  nodes: [
    {
      id: 'skill-a',
      type: 'small',
      label: { gl: 'Habilidade A', es: 'Habilidad A', en: 'Skill A' },
    },
    {
      id: 'skill-b',
      type: 'small',
      label: { gl: 'Habilidade B', es: 'Habilidad B', en: 'Skill B' },
      prerequisites: { type: 'node_unlocked', nodeId: 'skill-a' },
    },
    {
      id: 'skill-c',
      type: 'small',
      label: { gl: 'Habilidade C', es: 'Habilidad C', en: 'Skill C' },
      prerequisites: { type: 'node_unlocked', nodeId: 'skill-b' },
    },
  ],
  edges: [
    {
      id: 'edge-ab',
      source: 'skill-a',
      target: 'skill-b',
      type: 'dependency',
    },
    {
      id: 'edge-bc',
      source: 'skill-b',
      target: 'skill-c',
      type: 'dependency',
    },
  ],
  layout: { type: 'tree' },
}

// ── 2. Crear engine con MemoryStorage ───────────────────────────

const storage = new MemoryStorage()
const engine = new TreeEngine(treeDef, { storage })

console.log('▶ TreeEngine criado co tree:', treeDef.id)
console.log('  Nodos:', treeDef.nodes.length)
console.log('  Edges:', treeDef.edges.length)
console.log()

// ── 3. Comprobar canUnlock antes da mutación ───────────────────

const canUnlockA = engine.canUnlock('skill-a')
console.log('▶ canUnlock(skill-a):', canUnlockA.ok ? 'OK' : 'erro')

// ── 4. unlock dunha cadea de skills ────────────────────────────

const unlockA = await engine.unlock('skill-a')
if (unlockA.ok) {
  console.log('▶ unlock(skill-a): OK (tier', unlockA.value.tier, ')')
} else {
  console.error('✗ unlock(skill-a) fallou:', unlockA.error.message)
  process.exit(1)
}

// ── 5. Intentar unlock cero prereqs (demostra Result.err) ──────

const unlockCFail = await engine.unlock('skill-c')
if (!unlockCFail.ok) {
  console.log(
    '▶ unlock(skill-c) bloqueado correctamente:',
    unlockCFail.error.message,
  )
}

// ── 6. unlock secuencial b, c ──────────────────────────────────

const unlockB = await engine.unlock('skill-b')
if (unlockB.ok) {
  console.log('▶ unlock(skill-b): OK')
}

const unlockC = await engine.unlock('skill-c')
if (unlockC.ok) {
  console.log('▶ unlock(skill-c): OK (cadea completa)')
}

// ── 7. Snapshot do estado ──────────────────────────────────────

const snapshot = await engine.snapshot('checkpoint')
console.log()
console.log('▶ Snapshot creado:', snapshot.id)

// ── 8. lock + restoreSnapshot + verificación ───────────────────

const lockA = await engine.lock('skill-a')
if (lockA.ok) {
  console.log('▶ lock(skill-a): OK')
}

const stateAfterLock = engine.getNodeState('skill-a')
console.log(
  '  skill-a estado tras lock:',
  stateAfterLock?.state === 'unlocked' ? 'unlocked' : 'locked',
)

const restored = await engine.restoreSnapshot(snapshot.id)
if (restored.ok) {
  console.log('▶ restoreSnapshot: OK')
}

const stateAfterRestore = engine.getNodeState('skill-a')
console.log(
  '  skill-a estado tras restore:',
  stateAfterRestore?.state === 'unlocked' ? 'unlocked ✓' : 'locked ✗',
)

console.log()
console.log('✓ Exemplo completado correctamente.')

// ── FIN: Yggdrasil Forge — exemplo Node.js básico ──
