// ── INICIO: sonda cyberware (fluxo de instalación + gates + exclusións) ──
//
// Sonda manual fora da pipeline. Execución:
//   pnpm vitest run examples/cyberware-ripperdoc/src/__verify_cyber.test.ts
//
// Cinco escenas validadas (A.6.32): instalación real co engine, con
// asertos intermedios sobre o estado (currentTier) e os gates
// (canUnlock.value.allowed). Inclúe A.6.38: usar .value.allowed, non
// só .ok, para o veredicto.

import { TreeEngine } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { cyberwareTree } from './cyberware.tree.js'
import { categoryLabel, mkLabel, nextTierCost } from './inspectorLogic.js'

describe('cyberware — fluxo de instalación', () => {
  it('escena 1: instalar neural_hub (root, gratuito)', async () => {
    const engine = new TreeEngine(cyberwareTree)
    const before = engine.getNodeState('neural_hub')?.currentTier ?? 0
    expect(before).toBe(0)
    const result = await engine.unlock('neural_hub')
    expect(result.ok, `unlock falla: ${result.ok ? '' : result.error.message}`).toBe(true)
    expect(engine.getNodeState('neural_hub')?.currentTier).toBe(1)
  })

  it('escena 2: cyberdeck require neural_hub instalado', async () => {
    const engine = new TreeEngine(cyberwareTree)
    // Sen neural_hub, cyberdeck non se pode instalar.
    const checkBefore = engine.canUnlock('cyberdeck')
    expect(checkBefore.ok && checkBefore.value.allowed).toBe(false)
    // Instalar neural_hub → cyberdeck queda accesible.
    await engine.unlock('neural_hub')
    const checkAfter = engine.canUnlock('cyberdeck')
    expect(checkAfter.ok && checkAfter.value.allowed).toBe(true)
    await engine.unlock('cyberdeck')
    expect(engine.getNodeState('cyberdeck')?.currentTier).toBe(1)
  })

  it('escena 3: ram_upgrade sobe Mk.I → Mk.II → Mk.III (multi-tier con costPerTier)', async () => {
    const engine = new TreeEngine(cyberwareTree)
    await engine.unlock('neural_hub')
    await engine.unlock('cyberdeck')
    // Mk.I
    let r = await engine.unlock('ram_upgrade')
    expect(r.ok).toBe(true)
    expect(engine.getNodeState('ram_upgrade')?.currentTier).toBe(1)
    // Mk.II
    r = await engine.unlock('ram_upgrade')
    expect(r.ok).toBe(true)
    expect(engine.getNodeState('ram_upgrade')?.currentTier).toBe(2)
    // Mk.III
    r = await engine.unlock('ram_upgrade')
    expect(r.ok).toBe(true)
    expect(engine.getNodeState('ram_upgrade')?.currentTier).toBe(3)
    // No máximo: canUnlock devolve allowed=false (state='maxed').
    const chk = engine.canUnlock('ram_upgrade')
    expect(chk.ok && chk.value.allowed).toBe(false)
  })

  it('escena 4: icebreaker bloqueado por street_cred < 35 (gate de nivel)', async () => {
    const engine = new TreeEngine(cyberwareTree)
    await engine.unlock('neural_hub')
    await engine.unlock('cyberdeck')
    // Street Cred inicial = 27 (< 35). icebreaker debe estar bloqueado
    // por resource_min mesmo tendo neural_hub + cyberdeck.
    // (O motor devolve unha reason xenérica de prerequisitos; non
    //  contén o texto "cred" literal — só asertamos allowed=false.)
    const chk = engine.canUnlock('icebreaker')
    expect(chk.ok).toBe(true)
    if (chk.ok) {
      expect(chk.value.allowed).toBe(false)
      expect(chk.value.reason).toBeDefined()
    }
  })

  it('escena 5: kerenzikov exclúe berserk (exclusión Operating System)', async () => {
    const engine = new TreeEngine(cyberwareTree)
    await engine.unlock('neural_hub')
    // kerenzikov require synaptic_accelerator (que á súa vez só require
    // neural_hub). Cadea: neural_hub → synaptic_accelerator → kerenzikov.
    await engine.unlock('synaptic_accelerator')
    // Instalar kerenzikov.
    const r = await engine.unlock('kerenzikov')
    expect(r.ok, `unlock kerenzikov falla: ${r.ok ? '' : r.error.message}`).toBe(true)
    expect(engine.getNodeState('kerenzikov')?.currentTier).toBeGreaterThan(0)
    // Agora berserk debe estar excluído (allowed=false).
    const chk = engine.canUnlock('berserk')
    expect(chk.ok).toBe(true)
    if (chk.ok) {
      expect(chk.value.allowed).toBe(false)
    }
  })
})

describe('cyberware — inspectorLogic puro', () => {
  it('nextTierCost: single-tier cyberdeck → custo de `cost`', () => {
    const node = cyberwareTree.nodes.find((n) => n.id === 'cyberdeck')
    expect(node).toBeDefined()
    if (node === undefined) return
    const cost = nextTierCost(node, 0)
    expect(cost.eurodollars).toBe(18000)
    expect(cost.components).toBe(10)
    expect(cost.capacity).toBe(3)
  })

  it('nextTierCost: multi-tier ram_upgrade → custo do índice currentTier', () => {
    const node = cyberwareTree.nodes.find((n) => n.id === 'ram_upgrade')
    expect(node).toBeDefined()
    if (node === undefined) return
    // tier 0 (próximo = Mk.I)
    let cost = nextTierCost(node, 0)
    expect(cost.eurodollars).toBe(3000)
    // tier 1 (próximo = Mk.II)
    cost = nextTierCost(node, 1)
    expect(cost.eurodollars).toBe(6000)
    // tier 2 (próximo = Mk.III)
    cost = nextTierCost(node, 2)
    expect(cost.eurodollars).toBe(12000)
  })

  it('categoryLabel: mapea grupos a etiqueta HUD', () => {
    const node = cyberwareTree.nodes.find((n) => n.id === 'cyberdeck')
    expect(node).toBeDefined()
    if (node === undefined) return
    expect(categoryLabel(node)).toBe('NEURALWARE')
  })

  it('mkLabel: roman MK.I / MK.II / MK.III / MAX', () => {
    expect(mkLabel(0, 3)).toBe('MK.I')
    expect(mkLabel(1, 3)).toBe('MK.II')
    expect(mkLabel(2, 3)).toBe('MK.III')
    expect(mkLabel(3, 3)).toBe('MAX')
  })
})
// ── FIN: sonda cyberware ──
