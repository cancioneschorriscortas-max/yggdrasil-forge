// ── INICIO: integración — ciclo de vida da árbore (1.18) ──
// Fluxo completo de punta a punta: fromJSON → getters → unlock en cadea →
// getBudget → lock → respec → toJSON → fromJSON do resultado.
// Verifica coherencia de estado en cada paso.

import { describe, expect, it } from 'vitest'
import { TreeEngine, serialize } from '../../src/engine/index.js'
import { makeChainedPrereqTreeDef, makeRichTreeDef } from './fixtures.js'

describe('integración — ciclo de vida da árbore', () => {
  it('round-trip completo: fromJSON → mutacións → toJSON → fromJSON volve a funcionar', async () => {
    // ── INICIO: arranque dende JSON ──
    const initialJson = serialize(makeRichTreeDef())
    const fromResult = TreeEngine.fromJSON(initialJson)
    expect(fromResult.ok).toBe(true)
    if (!fromResult.ok) return
    const engine = fromResult.value

    // Estado inicial: ningún nodo aínda ten instancia.
    expect(engine.getNodeState('root')).toBeNull()
    expect(engine.getBudget().resources.xp).toBe(50)
    expect(engine.getBudget().resources.sp).toBe(5)
    // ── FIN: arranque dende JSON ──

    // ── INICIO: unlocks en cadea respectando prerequisites ──
    // root non ten prerequisites nin custo.
    const rRoot = await engine.unlock('root')
    expect(rRoot.ok).toBe(true)
    expect(engine.getNodeState('root')?.state).toBe('unlocked')

    // a depende de root (cumprido); custo 5xp.
    const rA = await engine.unlock('a')
    expect(rA.ok).toBe(true)
    expect(engine.getBudget().resources.xp).toBe(45)

    // c depende de a; custo 10xp; ten exclusión con d.
    const rC = await engine.unlock('c')
    expect(rC.ok).toBe(true)
    expect(engine.getBudget().resources.xp).toBe(35)

    // Intentar d agora debe fallar por exclusión (c xa unlocked).
    const rD = await engine.unlock('d')
    expect(rD.ok).toBe(false)
    if (!rD.ok) {
      expect(rD.error.code).toBe('YGG_E005') // EXCLUSION_VIOLATION
    }
    // ── FIN: unlocks en cadea ──

    // ── INICIO: lock devolve recursos ──
    const rLockC = await engine.lock('c')
    expect(rLockC.ok).toBe(true)
    // Lock devolve 10xp (refundable=100%).
    expect(engine.getBudget().resources.xp).toBe(45)
    expect(engine.getNodeState('c')?.state).toBe('locked')
    expect(engine.getNodeState('c')?.currentTier).toBe(0)
    // ── FIN: lock devolve recursos ──

    // ── INICIO: respec total ──
    const rRespec = await engine.respec()
    expect(rRespec.ok).toBe(true)
    if (rRespec.ok) {
      // Tras respec todos os nodos deben estar locked.
      expect(engine.getNodeState('root')?.state).toBe('locked')
      expect(engine.getNodeState('a')?.state).toBe('locked')
      // Budget recuperado ao máximo: tiñamos 50, gastamos 5 (a), recuperamos 5.
      expect(engine.getBudget().resources.xp).toBe(50)
    }
    // ── FIN: respec total ──

    // ── INICIO: toJSON e segundo round-trip ──
    const exportedJson = engine.toJSON()
    expect(exportedJson).toBe(serialize(engine.getTreeDef()))
    const secondTrip = TreeEngine.fromJSON(exportedJson)
    expect(secondTrip.ok).toBe(true)
    if (secondTrip.ok) {
      // O TreeDef segue intacto (mutacións son sobre TreeState, non TreeDef).
      expect(secondTrip.value.getTreeDef().id).toBe('rich-tree')
      expect(secondTrip.value.getTreeDef().nodes.length).toBe(6)
    }
    // ── FIN: toJSON e segundo round-trip ──
  })

  it('respec parcial fai cascada dos dependentes', async () => {
    const engine = new TreeEngine(makeChainedPrereqTreeDef())

    // Desbloquear a cadea completa a → b → c → d.
    expect((await engine.unlock('a')).ok).toBe(true)
    expect((await engine.unlock('b')).ok).toBe(true)
    expect((await engine.unlock('c')).ok).toBe(true)
    expect((await engine.unlock('d')).ok).toBe(true)
    expect(engine.getBudget().resources.xp).toBe(6) // 10-4

    // Respec de 'b' debería arrastrar c e d (perden o prerequisite).
    const r = await engine.respec('b')
    expect(r.ok).toBe(true)
    if (r.ok) {
      // a queda intacto; b, c, d volven a locked.
      expect(engine.getNodeState('a')?.state).toBe('unlocked')
      expect(engine.getNodeState('b')?.state).toBe('locked')
      expect(engine.getNodeState('c')?.state).toBe('locked')
      expect(engine.getNodeState('d')?.state).toBe('locked')
      expect(r.value.nodeIds.sort()).toEqual(['b', 'c', 'd'])
      // 3 nodos a 1xp cada un devoltos.
      expect(engine.getBudget().resources.xp).toBe(9)
    }
  })

  it('respec dun nodo non desbloqueado devolve ok baleiro (no-op)', async () => {
    const engine = new TreeEngine(makeChainedPrereqTreeDef())
    const r = await engine.respec('a') // a está locked
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.nodeIds).toEqual([])
      expect(r.value.refunded).toEqual([])
    }
  })
})
// ── FIN: integración — ciclo de vida da árbore (1.18) ──
