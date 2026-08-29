// ── INICIO: computeCost cableado — o funil da economía (17.9) ──
// O hook que estaba «declarado pero sen cablear» agora cobra de
// verdade, e por UN só punto (effectiveCost): canUnlock explica o
// custo transformado, unlock cóbrao, lock devólveo. E o test da
// fronteira documenta o contrato do refund: recomputa co estado
// ACTUAL, non co histórico.

import { describe, expect, it } from 'vitest'
import { TreeEngine } from '../src/engine/TreeEngine.js'
import type { Plugin, TreeDef } from '../src/types/index.js'

function buildTree(): TreeDef {
  return {
    id: 'tenda',
    schemaVersion: '1.0.0',
    version: '1.0.0',
    label: { gl: 'A tenda' },
    resources: [{ id: 'pd', label: { gl: 'Puntos' }, initial: 10, refundable: true }],
    nodes: [
      {
        id: 'caro',
        type: 'small',
        label: { gl: 'Caro' },
        position: { x: 0, y: 0 },
        costPerTier: [[{ resourceId: 'pd', amount: 4 }]],
      },
      {
        id: 'outro',
        type: 'small',
        label: { gl: 'Outro' },
        position: { x: 100, y: 0 },
        costPerTier: [[{ resourceId: 'pd', amount: 4 }]],
      },
    ],
    edges: [],
    layout: { type: 'custom' },
  } as TreeDef
}

/** Desconto DETERMINISTA respecto de (nodo, rango): metade, arriba. */
const descontoFixo: Plugin = {
  id: 'desconto-fixo',
  name: 'Desconto fixo',
  version: '1.0.0',
  apiVersion: '1.0.0',
  permissions: ['register_hooks'],
  install(_engine, api) {
    api.registerHook('computeCost', (_nodeId, base) =>
      base.map((c) => ({ ...c, amount: Math.ceil(c.amount / 2) })),
    )
  },
}

describe('computeCost — o camiño enteiro co desconto (17.9)', () => {
  it('explica rebaixado → cobra rebaixado → devolve rebaixado', async () => {
    const engine = new TreeEngine(buildTree(), { locale: 'gl' })
    await engine.registerPlugin(descontoFixo)

    // O funil público: a UI pregunta e recibe o custo transformado.
    expect(engine.getEffectiveCostForTier('caro', 1)).toEqual([{ resourceId: 'pd', amount: 2 }])

    // EXPLICA rebaixado: con só 1 punto, a razón de canUnlock fala do
    // custo efectivo (2), non do base (4).
    const pobre = new TreeEngine(
      { ...buildTree(), resources: [{ id: 'pd', label: { gl: 'P' }, initial: 1 }] } as TreeDef,
      { locale: 'gl' },
    )
    await pobre.registerPlugin(descontoFixo)
    const check = pobre.canUnlock('caro')
    expect(check.ok && check.value.allowed).toBe(false)
    if (check.ok) expect(JSON.stringify(check.value.reason)).toContain('2')

    // COBRA rebaixado: 10 − 2 = 8.
    const unlock = await engine.unlock('caro')
    expect(unlock.ok).toBe(true)
    expect(engine.getBudget().resources.pd).toBe(8)

    // DEVOLVE rebaixado (determinista → refund exacto): 8 + 2 = 10.
    const lock = await engine.lock('caro')
    expect(lock.ok).toBe(true)
    expect(engine.getBudget().resources.pd).toBe(10)
  })

  it('sen plugin, nada cambia: custo base intacto', async () => {
    const engine = new TreeEngine(buildTree(), { locale: 'gl' })
    expect(engine.getEffectiveCostForTier('caro', 1)).toEqual([{ resourceId: 'pd', amount: 4 }])
    await engine.unlock('caro')
    expect(engine.getBudget().resources.pd).toBe(6)
  })

  it('nodo inexistente no funil público → [] defensivo', () => {
    const engine = new TreeEngine(buildTree(), { locale: 'gl' })
    expect(engine.getEffectiveCostForTier('fantasma', 1)).toEqual([])
  })
})

describe('computeCost — a fronteira do refund (contrato pinado 17.9)', () => {
  it('hook dependente de estado: o refund usa o valor ACTUAL, non o histórico', async () => {
    // Desconto por veteranía: co primeiro desbloqueo pagas prezo
    // enteiro (4); con algún nodo xa desbloqueado, prezo simbólico (1).
    const porVeterania: Plugin = {
      id: 'veterania',
      name: 'Veteranía',
      version: '1.0.0',
      apiVersion: '1.0.0',
      permissions: ['read_state', 'register_hooks'],
      install(engine, api) {
        api.registerHook('computeCost', (_nodeId, base) => {
          let desbloqueados = 0
          for (const [, inst] of engine.getAllNodeStates()) {
            if (inst.state === 'unlocked' || inst.state === 'maxed') desbloqueados++
          }
          return desbloqueados >= 1 ? base.map((c) => ({ ...c, amount: 1 })) : base
        })
      },
    }

    const engine = new TreeEngine(buildTree(), { locale: 'gl' })
    await engine.registerPlugin(porVeterania)

    // Cobro histórico: 0 desbloqueados → prezo enteiro. 10 − 4 = 6.
    await engine.unlock('caro')
    expect(engine.getBudget().resources.pd).toBe(6)

    // Refund AO VALOR ACTUAL: agora HAI un desbloqueado ("caro"), o
    // hook di 1, e o refund devolve 1 — non os 4 cobrados. 6 + 1 = 7.
    // COMPORTAMENTO CORRECTO DECLARADO (non bug): o refund recomputa
    // co estado actual; refund histórico exacto requiriría persistir
    // o cobrado por rango — material de major (2.x).
    await engine.lock('caro')
    expect(engine.getBudget().resources.pd).toBe(7)
  })
})
// ── FIN: computeCost cableado ──
